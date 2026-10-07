import Foundation

/// One line in the chat (user bubble or AI answer).
struct AiMessage: Identifiable {
    let id = UUID()
    let key: Int64
    let fromUser: Bool
    var text: String
    var serverId: Int64? = nil
    var feedback: Int? = nil
    var kind: String = "answer"
    var followUps: [String] = []
    /// The headlines the answer was given - shown as "Based on", each opening its story.
    var sources: [StakAiSource] = []
    var failed: Bool = false
    var streaming: Bool = false
    var cutOff: Bool = false

    func withFailed(_ v: Bool) -> AiMessage { var c = self; c.failed = v; c.streaming = false; return c }
    func withFeedback(_ v: Int?) -> AiMessage { var c = self; c.feedback = v; return c }
    func withCutOff() -> AiMessage { var c = self; c.streaming = false; c.cutOff = true; return c }

}

enum AiNotice: Equatable {
    case limitReached(resetsAt: String?)
    case failed(offline: Bool)
    case slow
    case loadFailed
}

private struct DeltaEvent: Decodable { var text: String = "" }

@MainActor
final class StakAiViewModel: ObservableObject {
    @Published var messages: [AiMessage] = []
    @Published var usage: StakAiUsage? = nil
    @Published var sending = false
    @Published var loading = false
    @Published var notice: AiNotice? = nil
    @Published var context: StakAiContext? = nil
    @Published var returnedDraft: String? = nil

    private let repo = StockRepository.shared
    private var conversationId: String? = nil
    private var openedId: String? = nil
    private var contextSent = false
    private var nextKey: Int64 = 0
    private var configured = false
    private let decoder = JSONDecoder()
    /// The past conversation loading, and the wait for the count to free up - each replaced, never stacked.
    private var openTask: Task<Void, Never>? = nil
    private var usageWait: Task<Void, Never>? = nil
    private var recheck: Task<Void, Never>? = nil
    /// Bumped by every reply: a count read started before one can't overwrite the newer count the reply carries.
    private var usageVersion = 0
    /// After a slow answer, the count is read again once the server has surely finished.
    private static let recheckAfter: UInt64 = 60_000_000_000

    var outOfQuestions: Bool {
        guard let u = usage, !u.unlimited else { return false }
        return u.questionsLeft <= 0
    }
    var canAsk: Bool { !sending && !loading && !outOfQuestions }

    /// Nothing the chat started outlives it - Android's viewModelScope.
    deinit {
        openTask?.cancel()
        usageWait?.cancel()
        recheck?.cancel()
    }

    func configure(context: StakAiContext?, question: String?, conversationId: String?) {
        guard !configured else { return }
        configured = true
        self.context = context
        // A fresh open (not a past chat reopened from history) counts toward the usage stats, by where it came from.
        if conversationId == nil {
            let entry = switch context?.type {
            case nil: "header"
            case "stock": "stock"
            case "article": "article"
            default: "brief"
            }
            StakEvents.log(StakEvents.stakAiOpen, params: ["entry": entry, "platform": "ios"])
        }
        refreshUsage()
        if let cid = conversationId {
            open(cid)
        } else if let q = question?.trimmingCharacters(in: .whitespacesAndNewlines), !q.isEmpty {
            send(q)
        }
    }

    func consumeReturnedDraft() -> String? { defer { returnedDraft = nil }; return returnedDraft }

    func send(_ text: String, via: String = "typed") {
        let q = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty, !sending, !loading else { return }
        messages = messages.filter { !$0.failed } + [AiMessage(key: nextKey, fromUser: true, text: q)]
        nextKey += 1
        notice = nil
        sending = true
        Task { await ask(q, allowRestart: true, via: via); sending = false }
    }

    func retry() { messages.last(where: { $0.failed }).map { send($0.text, via: "retry") } }

    func rate(message: AiMessage, value: Int) {
        guard let sid = message.serverId else { return }
        let next: Int? = message.feedback == value ? nil : value
        setFeedback(key: message.key, value: next)
        Task {
            let fb: Int? = next.map { $0 > 0 ? 1 : -1 }
            do { _ = try await repo.stakAiFeedback(messageId: sid, value: fb) }
            catch { setFeedback(key: message.key, value: message.feedback) }
        }
    }

    func newChat() {
        guard !sending else { return }
        openTask?.cancel()
        loading = false; messages = []; conversationId = nil; openedId = nil
        context = nil; contextSent = false
        notice = outOfQuestions ? .limitReached(resetsAt: usage?.resetsAt) : nil
    }

    func open(_ id: String) {
        openTask?.cancel()
        openedId = id; loading = true; notice = nil
        openTask = Task {
            do {
                let r = try await repo.stakAiMessages(id)
                guard !Task.isCancelled else { return }
                conversationId = id; contextSent = true
                var msgs: [AiMessage] = []
                for m in r.messages {
                    msgs.append(AiMessage(key: nextKey, fromUser: m.role == "user", text: m.content,
                                         serverId: m.role == "assistant" ? m.id : nil,
                                         feedback: m.feedback, kind: m.kind))
                    nextKey += 1
                }
                messages = msgs
                context = r.context
            } catch {
                guard !Task.isCancelled else { return }
                notice = .loadFailed
            }
            loading = false
        }
    }

    func retryOpen() { openedId.map { open($0) } }

    // MARK: – Stream

    private func ask(_ question: String, allowRestart: Bool, via: String) async {
        let streamKey = nextKey; nextKey += 1
        var soFar = ""; var gotText = false; var reply: StakAiChatReply? = nil

        do {
            let body = StakAiChatRequest(message: question, conversationId: conversationId,
                                          context: contextSent ? nil : context, via: via)
            let bytes = try await repo.stakAiChatStream(body)
            var currentEvent: String? = nil
            for try await line in bytes.lines {
                if line.hasPrefix("event:") {
                    currentEvent = String(line.dropFirst(6)).trimmingCharacters(in: .whitespaces)
                } else if line.hasPrefix("data:") {
                    let raw = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
                    guard let data = raw.data(using: .utf8) else { continue }
                    switch currentEvent {
                    case "delta":
                        if let d = try? decoder.decode(DeltaEvent.self, from: data) {
                            soFar += d.text; gotText = true
                            upsertMessage(AiMessage(key: streamKey, fromUser: false, text: soFar, streaming: true))
                        }
                    case "done":
                        reply = try? decoder.decode(StakAiChatReply.self, from: data)
                    case "error":
                        if let err = try? decoder.decode(StakAiError.self, from: data) {
                            throw StakAiStreamError(err.code ?? "ai_unavailable", usage: err.usage)
                        }
                    default: break
                    }
                } else if line.isEmpty { currentEvent = nil }
            }
        } catch let e as StakAiStreamError {
            messages = messages.filter { $0.key != streamKey }
            switch e.code {
            case "not_found" where allowRestart && conversationId != nil:
                conversationId = nil; contextSent = false
                await ask(question, allowRestart: false, via: via)
            case "limit_reached":
                usageVersion += 1
                if let u = e.usage ?? usage { applyUsage(u) }
                if !messages.isEmpty { messages = Array(messages.dropLast()) }
                returnedDraft = question
            default:
                markLastFailed(); notice = .failed(offline: false)
            }
            return
        } catch {
            // Too slow, or the connection dropped after words arrived: the server may well have finished, saved and
            // counted it - read the count now, and again once it surely has. (A failure the server reported part-way
            // is a StakAiStreamError, above: that one really didn't count.)
            let timedOut = (error as? URLError)?.code == .timedOut
            let mayHaveCounted = timedOut || gotText
            if gotText {
                messages = messages.map { $0.key == streamKey ? $0.withCutOff() : $0 }
            } else {
                messages = messages.filter { $0.key != streamKey }
                markLastFailed()
            }
            if mayHaveCounted {
                notice = .slow
                recheckUsageLater()
            } else {
                notice = .failed(offline: error is URLError)
            }
            refreshUsage()
            return
        }

        guard let r = reply else {
            // Stream ended without a done event
            if gotText {
                messages = messages.map { $0.key == streamKey ? $0.withCutOff() : $0 }
                notice = .slow
                recheckUsageLater()
            } else {
                messages = messages.filter { $0.key != streamKey }
                markLastFailed(); notice = .failed(offline: false)
            }
            refreshUsage()
            return
        }

        contextSent = true; conversationId = r.conversationId
        usageVersion += 1
        upsertMessage(AiMessage(key: streamKey, fromUser: false, text: r.response,
                                serverId: r.messageId > 0 ? r.messageId : nil,
                                kind: r.answerKind, followUps: r.followUps, sources: r.sources ?? []))
        if let u = r.usage { applyUsage(u) }
    }

    private func upsertMessage(_ msg: AiMessage) {
        if let i = messages.firstIndex(where: { $0.key == msg.key }) { messages[i] = msg }
        else { messages.append(msg) }
    }

    private func markLastFailed() {
        guard !messages.isEmpty else { return }
        let i = messages.index(before: messages.endIndex)
        messages[i] = messages[i].withFailed(true)
    }

    private func setFeedback(key: Int64, value: Int?) {
        messages = messages.map { $0.key == key ? $0.withFeedback(value) : $0 }
    }

    /// Reads the count; one that a newer reply has already overtaken is dropped.
    private func refreshUsage() {
        let version = usageVersion
        Task { [weak self] in
            guard let u = try? await StockRepository.shared.stakAiUsage(), let self, version == self.usageVersion else { return }
            self.applyUsage(u)
        }
    }

    private func recheckUsageLater() {
        recheck?.cancel()
        recheck = Task { [weak self] in
            do { try await Task.sleep(nanoseconds: Self.recheckAfter) } catch { return }
            self?.refreshUsage()
        }
    }

    /// Takes a new count. Out of questions: say when the next frees up, and check again at that moment, so the box
    /// unlocks on its own instead of waiting for the person to leave and come back.
    private func applyUsage(_ u: StakAiUsage) {
        usage = u
        usageWait?.cancel()
        if u.questionsLeft > 0 {
            if case .limitReached = notice { notice = nil }
            return
        }
        notice = .limitReached(resetsAt: u.resetsAt)
        guard let iso = u.resetsAt, let date = MyStakHoldings.parse(iso) else { return }
        let wait = max(0, date.timeIntervalSinceNow) + 2
        usageWait = Task { [weak self] in
            do { try await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000)) } catch { return }
            self?.refreshUsage()
        }
    }
}

// MARK: – History ViewModel

@MainActor
final class StakAiHistoryViewModel: ObservableObject {
    @Published var conversations: [StakAiConversationDto] = []
    @Published var loading = true
    @Published var failed = false
    var nextBefore: String? = nil
    var hasMore: Bool { nextBefore != nil }

    private let repo = StockRepository.shared

    func load(more: Bool = false) {
        loading = true; failed = false
        Task {
            do {
                let r = try await repo.stakAiConversations(before: more ? nextBefore : nil)
                conversations = more ? conversations + r.conversations : r.conversations
                nextBefore = r.nextBefore
            } catch { failed = true }
            loading = false
        }
    }

    func rename(_ c: StakAiConversationDto, title: String) {
        let t = String(title.trimmingCharacters(in: .whitespaces).prefix(80))
        guard !t.isEmpty, t != c.title else { return }
        replace(c.id) { $0.title = t }
        Task {
            do { _ = try await repo.stakAiRename(c.id, title: t) }
            catch { replace(c.id) { $0.title = c.title } }
        }
    }

    func delete(_ c: StakAiConversationDto) {
        let before = conversations
        conversations = conversations.filter { $0.id != c.id }
        Task {
            do { _ = try await repo.stakAiDelete(c.id) }
            catch { conversations = before }
        }
    }

    private func replace(_ id: String, with f: (inout StakAiConversationDto) -> Void) {
        conversations = conversations.map { c in
            guard c.id == id else { return c }
            var copy = c; f(&copy); return copy
        }
    }
}
