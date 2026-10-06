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
    var failed: Bool = false
    var streaming: Bool = false
    var cutOff: Bool = false

    func withFailed(_ v: Bool) -> AiMessage { var c = self; c.failed = v; c.streaming = false; return c }
    func withFeedback(_ v: Int?) -> AiMessage { var c = self; c.feedback = v; return c }
    func withCutOff() -> AiMessage { var c = self; c.streaming = false; c.cutOff = true; return c }
    func finished(text: String, serverId: Int64?, kind: String, followUps: [String]) -> AiMessage {
        var c = self; c.text = text; c.serverId = serverId; c.kind = kind
        c.followUps = followUps; c.streaming = false; return c
    }
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

    var outOfQuestions: Bool {
        guard let u = usage, !u.unlimited else { return false }
        return u.questionsLeft <= 0
    }
    var canAsk: Bool { !sending && !loading && !outOfQuestions }

    func configure(context: StakAiContext?, question: String?, conversationId: String?) {
        guard !configured else { return }
        configured = true
        self.context = context
        if let cid = conversationId {
            open(cid)
        } else {
            Task { if let u = try? await repo.stakAiUsage() { applyUsage(u) } }
            if let q = question?.trimmingCharacters(in: .whitespaces), !q.isEmpty {
                send(q, via: "starter")
            }
        }
    }

    func consumeReturnedDraft() -> String? { defer { returnedDraft = nil }; return returnedDraft }

    func send(_ text: String, via: String = "typed") {
        let q = text.trimmingCharacters(in: .whitespaces)
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
        loading = false; messages = []; conversationId = nil; openedId = nil
        context = nil; contextSent = false
        notice = outOfQuestions ? .limitReached(resetsAt: usage?.resetsAt) : nil
    }

    func open(_ id: String) {
        openedId = id; loading = true; notice = nil
        Task {
            do {
                let r = try await repo.stakAiMessages(id)
                conversationId = id; contextSent = true
                var msgs: [AiMessage] = []
                for m in r.messages {
                    msgs.append(AiMessage(key: nextKey, fromUser: m.role == "user", text: m.content,
                                         serverId: m.role == "assistant" ? m.id : nil,
                                         feedback: m.feedback, kind: m.kind))
                    nextKey += 1
                }
                messages = msgs
                if let ctx = r.context { context = ctx }
            } catch { notice = .loadFailed }
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
                if let u = e.usage { applyUsage(u) } else {
                    Task { if let u = try? await repo.stakAiUsage() { applyUsage(u) } }
                }
                if !messages.isEmpty { messages = Array(messages.dropLast()) }
                returnedDraft = question
            default:
                markLastFailed(); notice = .failed(offline: false)
            }
            return
        } catch {
            // Network or timeout
            if gotText {
                messages = messages.map { $0.key == streamKey ? $0.withCutOff() : $0 }
            } else {
                messages = messages.filter { $0.key != streamKey }
                markLastFailed()
            }
            notice = gotText ? .slow : .failed(offline: error is URLError)
            Task { if let u = try? await repo.stakAiUsage() { applyUsage(u) } }
            return
        }

        guard let r = reply else {
            // Stream ended without a done event
            if gotText {
                messages = messages.map { $0.key == streamKey ? $0.withCutOff() : $0 }
                notice = .slow
            } else {
                messages = messages.filter { $0.key != streamKey }
                markLastFailed(); notice = .failed(offline: false)
            }
            Task { if let u = try? await repo.stakAiUsage() { applyUsage(u) } }
            return
        }

        contextSent = true; conversationId = r.conversationId
        upsertMessage(AiMessage(key: streamKey, fromUser: false, text: r.response,
                                serverId: r.messageId > 0 ? r.messageId : nil,
                                kind: r.answerKind, followUps: r.followUps))
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

    private func applyUsage(_ u: StakAiUsage) {
        usage = u
        if u.questionsLeft > 0 {
            if case .limitReached = notice { notice = nil }
            return
        }
        notice = .limitReached(resetsAt: u.resetsAt)
        if let iso = u.resetsAt, let wait = resetsInSeconds(iso) {
            Task {
                try? await Task.sleep(nanoseconds: UInt64(wait + 2) * 1_000_000_000)
                if let fresh = try? await repo.stakAiUsage() { applyUsage(fresh) }
            }
        }
    }

    private func resetsInSeconds(_ iso: String) -> UInt64? {
        guard let date = ISO8601DateFormatter().date(from: iso) else { return nil }
        let secs = date.timeIntervalSinceNow
        return secs > 0 ? UInt64(secs) : nil
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
