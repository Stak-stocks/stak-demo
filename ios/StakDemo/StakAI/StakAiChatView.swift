import SwiftUI

private let userBubble = Color(argb: 0xFF1C3A4A)
private let warnInk = Color(argb: 0xFFE5A54B)
private let teal = StakColors.teal
private let surface = StakColors.surface
private let surfaceAlt = StakColors.surfaceAlt
private let cardBorder = StakColors.cardBorder
private let muted = StakColors.muted
private let textInk = Color(argb: 0xFFC8D2E0)
/// What a question may hold - Android's input cap.
private let draftMax = 1000

// MARK: – STAK AI Chat

/// STAK AI's chat screen. Opened from the Home sparkle, a Stock page or a Daily Brief
/// via StakAiChatView's configure(context:question:conversationId:). Ports
/// android/ui/ai/StakAiChatScreen.kt.
struct StakAiChatView: View {
    let onBack: () -> Void
    let onOpenHistory: () -> Void
    var context: StakAiContext? = nil
    var question: String? = nil
    var conversationId: String? = nil

    @StateObject private var vm = StakAiViewModel()
    @State private var draft = ""
    @State private var scrollProxy: ScrollViewProxy? = nil
    /// A source's story, open in the in-app browser.
    @State private var openedSource: WebLink? = nil
    @ObservedObject private var brands = BrandNames.shared
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var submit: () -> Void {{ if !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && vm.canAsk { vm.send(draft); draft = "" } }}

    var body: some View {
        let u = figmaUnit
        VStack(spacing: 0) {
            header(u: u)
            if let ctx = vm.context { contextChip(ctx, u: u) }
            messages(u: u)
            if let notice = vm.notice { noticeCard(notice, u: u) }
            inputArea(u: u)
        }
        .background(StakColors.bg.ignoresSafeArea())
        .safariSheet($openedSource)
        .task {
            vm.configure(context: context, question: question, conversationId: conversationId)
            await brands.ensure()
        }
        // A pushed page stays mounted while covered, so this runs only when the chat is closed.
        .onDisappear { vm.cancelAll() }
        .onChange(of: vm.returnedDraft) { _, draft in
            if let d = vm.consumeReturnedDraft(), self.draft.isEmpty { self.draft = d }
        }
        // The newest answer is read once, finished - not chunk by chunk while it's written; a notice as it appears.
        .onChange(of: vm.sending) { was, now in
            guard was, !now, let last = vm.messages.last, !last.fromUser else { return }
            UIAccessibility.post(notification: .announcement, argument: last.text.replacingOccurrences(of: "**", with: ""))
        }
        .onChange(of: vm.notice) { _, notice in
            if let notice { UIAccessibility.post(notification: .announcement, argument: noticeText(notice)) }
        }
    }

    // MARK: – Header

    private func header(u: CGFloat) -> some View {
        ZStack {
            HStack(spacing: 6 * u) {
                Image(systemName: "sparkles")
                    .font(.system(size: 16 * u))
                    .foregroundStyle(teal)
                    .accessibilityHidden(true)
                Text("STAK AI")
                    .font(StakFont.sora(17 * u, .semiBold))
                    .stakLineHeight(22 * u, size: 17 * u, face: .sora)
                    .foregroundStyle(StakColors.textPrimary)
            }
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.isHeader)
            HStack {
                AuthBackCircle(action: onBack)
                    .padding(.leading, 20 * u)
                Spacer()
                HStack(spacing: 0) {
                    circleButton(icon: "clock.arrow.circlepath", label: "Your chats", action: onOpenHistory)
                    circleButton(icon: "plus", label: "New chat", enabled: !vm.sending) { vm.newChat(); draft = "" }
                }
                .padding(.trailing, 12 * u)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 8 * u)
        .padding(.bottom, 6 * u)
    }

    // MARK: – Context chip

    private func contextChip(_ ctx: StakAiContext, u: CGFloat) -> some View {
        let label: String = {
            switch ctx.type {
            case "stock": return "Asking about \(brands.byTicker[ctx.ticker ?? ""] ?? ctx.ticker ?? "")"
            case "article": return "About: \(ctx.headline ?? "")"
            default: return "About today's Daily Brief"
            }
        }()
        return HStack(spacing: 6 * u) {
            Circle().fill(teal).frame(width: 6 * u, height: 6 * u).accessibilityHidden(true)
            Text(label)
                .font(StakFont.geist(12 * u))
                .foregroundStyle(textInk)
                .lineLimit(1)
        }
        .padding(.horizontal, 12 * u)
        .padding(.vertical, 6 * u)
        .background(surface, in: RoundedRectangle(cornerRadius: 14 * u))
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20 * u)
    }

    // MARK: – Messages

    private func messages(u: CGFloat) -> some View {
        ScrollViewReader { proxy in
            ScrollView(showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: 16 * u) {
                    if vm.messages.isEmpty && !vm.loading && !vm.sending && vm.notice != .loadFailed {
                        emptyState(u: u)
                    }
                    ForEach(vm.messages) { m in
                        if m.fromUser { userLine(m, u: u) }
                        else {
                            answerLine(m, isLatest: m.key == vm.messages.last(where: { !$0.fromUser })?.key, u: u)
                        }
                    }
                    if vm.loading {
                        Text("Loading chat…")
                            .font(StakFont.geist(13 * u))
                            .foregroundStyle(muted)
                    }
                    if vm.sending && vm.messages.last?.streaming != true {
                        typingDots(u: u)
                    }
                    Color.clear.frame(height: 1).id("bottom")
                }
                .padding(.horizontal, 20 * u)
                .padding(.top, 12 * u)
                .padding(.bottom, 16 * u)
            }
            // Asking glides to the question; words arriving, the finished answer and a past chat loading keep the end in
            // view.
            .onChange(of: vm.messages.count) { _, _ in
                if vm.sending && vm.messages.last?.fromUser == true {
                    withAnimation(.easeOut(duration: 0.25)) { proxy.scrollTo("bottom", anchor: .bottom) }
                } else {
                    proxy.scrollTo("bottom", anchor: .bottom)
                }
            }
            .onChange(of: vm.messages.last?.text.count) { _, _ in proxy.scrollTo("bottom", anchor: .bottom) }
            .onChange(of: vm.sending) { _, _ in proxy.scrollTo("bottom", anchor: .bottom) }
            .scrollDismissesKeyboard(.interactively)
        }
    }

    // MARK: – Empty state

    private func emptyState(u: CGFloat) -> some View {
        VStack(spacing: 0) {
            ZStack {
                Circle().fill(surface).frame(width: 56 * u, height: 56 * u)
                Image(systemName: "sparkles")
                    .font(.system(size: 26 * u))
                    .foregroundStyle(teal)
            }
            .accessibilityHidden(true)
            Text("Ask STAK AI")
                .font(StakFont.sora(20 * u, .semiBold))
                .foregroundStyle(StakColors.textPrimary)
                .padding(.top, 14 * u)
                .accessibilityAddTraits(.isHeader)
            Text("Plain-English answers about stocks, the news and investing terms.")
                .font(StakFont.geist(13 * u))
                .stakLineHeight(19 * u, size: 13 * u, face: .geist)
                .foregroundStyle(muted)
                .multilineTextAlignment(.center)
                .padding(.top, 6 * u)
                .padding(.horizontal, 12 * u)
            VStack(spacing: 8 * u) {
                ForEach(starterQuestions(vm.context, names: brands.byTicker), id: \.self) { q in
                    suggestionRow(q, enabled: vm.canAsk, u: u) { vm.send(q, via: "starter") }
                }
            }
            .padding(.top, 22 * u)
            let limitNote: String = {
                if vm.usage?.unlimited == true { return "No question limit on this account. When STAK AI can't help, it'll say so." }
                return "You get \(vm.usage?.limit ?? 5) questions every 6 hours. When STAK AI can't help, or asks you something back, it doesn't count."
            }()
            Text(limitNote)
                .font(StakFont.geist(11 * u))
                .stakLineHeight(16 * u, size: 11 * u, face: .geist)
                .foregroundStyle(muted)
                .multilineTextAlignment(.center)
                .padding(.top, 16 * u)
                .padding(.horizontal, 8 * u)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 28 * u)
    }

    private func suggestionRow(_ text: String, enabled: Bool, u: CGFloat, onTap: @escaping () -> Void) -> some View {
        Button(action: onTap) {
            HStack {
                Text(text)
                    .font(StakFont.geist(13 * u, .medium))
                    .foregroundStyle(StakColors.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .multilineTextAlignment(.leading)
                Image(systemName: "arrow.right")
                    .font(.system(size: 16 * u))
                    .foregroundStyle(teal)
                    .accessibilityHidden(true)
            }
            .padding(.horizontal, 14 * u)
            .padding(.vertical, 10 * u)
            .frame(minHeight: 44)
            .background(surface, in: RoundedRectangle(cornerRadius: 12 * u))
            .overlay(RoundedRectangle(cornerRadius: 12 * u).strokeBorder(cardBorder, lineWidth: 1 * u))
            .contentShape(Rectangle())
        }
        .buttonStyle(.pressDim)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.5)
    }

    // MARK: – User bubble

    private func userLine(_ m: AiMessage, u: CGFloat) -> some View {
        VStack(alignment: .trailing, spacing: 4 * u) {
            Text(m.text)
                .font(StakFont.geist(14 * u))
                .stakLineHeight(20 * u, size: 14 * u, face: .geist)
                .foregroundStyle(StakColors.textPrimary)
                .padding(.horizontal, 14 * u)
                .padding(.vertical, 10 * u)
                .background(userBubble)
                .clipShape(
                    .rect(topLeadingRadius: 16 * u, bottomLeadingRadius: 16 * u,
                          bottomTrailingRadius: 4 * u, topTrailingRadius: 16 * u)
                )
                .opacity(m.failed ? 0.6 : 1)
                .frame(maxWidth: 290 * u, alignment: .trailing)
            if m.failed {
                Text(vm.notice == .failed(offline: true) ? "Not sent" : "No answer")
                    .font(StakFont.geist(11 * u))
                    .foregroundStyle(warnInk)
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
    }

    // MARK: – Answer line

    private func answerLine(_ m: AiMessage, isLatest: Bool, u: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 8 * u) {
            HStack(spacing: 6 * u) {
                ZStack {
                    Circle().fill(surface).frame(width: 22 * u, height: 22 * u)
                    Image(systemName: "sparkles")
                        .font(.system(size: 12 * u))
                        .foregroundStyle(teal)
                }
                .accessibilityHidden(true)
                Text("STAK AI")
                    .font(StakFont.sora(12 * u, .semiBold))
                    .foregroundStyle(muted)
            }
            if m.streaming {
                // Read only as "STAK AI is answering" while it's written; the finished answer is announced once.
                VStack(alignment: .leading, spacing: 8 * u) {
                    aiMarkdown(text: AiChatMarkdown.tidyStreaming(m.text), u: u)
                    writingCaret(u: u)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("STAK AI is answering")
            } else {
                aiMarkdown(text: m.cutOff ? AiChatMarkdown.tidyStreaming(m.text) : m.text, u: u).opacity(m.cutOff ? 0.6 : 1)
            }
            if m.cutOff {
                Text("Cut off. The full answer may be in your chats.")
                    .font(StakFont.geist(11 * u))
                    .foregroundStyle(warnInk)
            }
            if m.kind != "answer" && !m.streaming {
                Text("This one didn't count toward your questions.")
                    .font(StakFont.geist(11 * u))
                    .foregroundStyle(muted)
            }
            if !m.sources.isEmpty && !m.streaming { sources(m.sources, u: u) }
            if let sid = m.serverId, m.kind == "answer", !m.streaming {
                HStack(spacing: 0) {
                    thumbButton(icon: m.feedback == 1 ? "hand.thumbsup.fill" : "hand.thumbsup",
                                selected: m.feedback == 1, label: "Helpful", u: u) { vm.rate(message: m, value: 1) }
                    thumbButton(icon: m.feedback == -1 ? "hand.thumbsdown.fill" : "hand.thumbsdown",
                                selected: m.feedback == -1, label: "Not helpful", u: u) { vm.rate(message: m, value: -1) }
                }
                .id(sid) // silence unused warning
            }
            if isLatest && vm.canAsk && !m.followUps.isEmpty {
                FlowLayout(spacing: 8 * u) {
                    ForEach(m.followUps, id: \.self) { q in
                        Button { vm.send(q, via: "followup") } label: {
                            Text(q)
                                .font(StakFont.geist(12 * u))
                                .foregroundStyle(teal)
                                .padding(.horizontal, 12 * u)
                                .padding(.vertical, 7 * u)
                                .background(
                                    RoundedRectangle(cornerRadius: 16 * u)
                                        .strokeBorder(teal.opacity(0.45), lineWidth: 1 * u)
                                )
                                .frame(minHeight: 44)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.pressDim)
                    }
                }
            }
        }
    }

    /// "Based on" - the headlines the answer was given, each opening its story in the in-app browser.
    private func sources(_ sources: [StakAiSource], u: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("BASED ON")
                .font(StakFont.geist(10 * u, .semiBold))
                .tracking(1 * u)
                .foregroundStyle(muted)
                .padding(.vertical, 4 * u)
            ForEach(Array(sources.enumerated()), id: \.offset) { _, s in
                let line = (Text(s.ticker).foregroundColor(teal).fontWeight(.semibold) + Text("  " + s.headline))
                    .font(StakFont.geist(12 * u))
                    .foregroundColor(textInk)
                    .stakLineHeight(17 * u, size: 12 * u, face: .geist)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                if let link = s.url.flatMap(WebLink.init) {
                    Button { openedSource = link } label: { line.contentShape(Rectangle()) }
                        .buttonStyle(.pressDim)
                        .accessibilityHint("Opens the story")
                } else {
                    line
                }
            }
        }
        .padding(.horizontal, 12 * u)
        .padding(.vertical, 6 * u)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(StakColors.surface, in: RoundedRectangle(cornerRadius: 12 * u))
    }

    private func thumbButton(icon: String, selected: Bool, label: String, u: CGFloat, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16 * u))
                .foregroundStyle(selected ? teal : muted)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.pressDim)
        .accessibilityLabel(label)
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }

    // MARK: – Typing dots

    private func typingDots(u: CGFloat) -> some View {
        HStack(spacing: 5 * u) {
            ForEach(0..<3, id: \.self) { i in
                TypingDot(delay: Double(i) * 0.15, still: reduceMotion)
            }
        }
        .padding(.vertical, 6 * u)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("STAK AI is answering")
    }

    // MARK: – Writing caret

    private func writingCaret(u: CGFloat) -> some View {
        WritingCaret(u: u, still: reduceMotion)
    }

    // MARK: – Markdown

    private func aiMarkdown(text: String, u: CGFloat) -> some View {
        AiMarkdownView(text: text, u: u)
    }

    // MARK: – Notice

    private func noticeText(_ notice: AiNotice) -> String {
        switch notice {
        case .limitReached(let at):
            return "You've used your \(vm.usage?.limit ?? 5) questions for now. \(nextQuestionText(at))"
        case .failed(let offline):
            return offline ? "You're offline, so that didn't send. It didn't count."
                : "STAK AI couldn't answer just now. That one didn't count."
        case .slow:
            return "STAK AI is taking longer than usual. Check your chats in a moment before asking again."
        case .loadFailed:
            return "Couldn't open that chat."
        }
    }

    private func noticeCard(_ notice: AiNotice, u: CGFloat) -> some View {
        HStack(alignment: .center, spacing: 0) {
            Text(noticeText(notice))
                .font(StakFont.geist(12 * u))
                .stakLineHeight(17 * u, size: 12 * u, face: .geist)
                .foregroundStyle(textInk)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 12 * u)
            HStack(spacing: 0) {
                switch notice {
                case .failed:
                    noticeAction("Try again", u: u, action: vm.retry)
                case .loadFailed:
                    noticeAction("Try again", u: u, action: vm.retryOpen)
                    noticeAction("New chat", u: u) { vm.newChat() }
                default: EmptyView()
                }
            }
        }
        .padding(.leading, 14 * u)
        .padding(.trailing, 4 * u)
        .background(surface, in: RoundedRectangle(cornerRadius: 12 * u))
        .padding(.horizontal, 20 * u)
    }

    private func noticeAction(_ label: String, u: CGFloat, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(StakFont.geist(12 * u, .semiBold))
                .foregroundStyle(teal)
                .padding(.horizontal, 10 * u)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.pressDim)
    }

    // MARK: – Input

    private func inputArea(u: CGFloat) -> some View {
        VStack(spacing: 6 * u) {
            let canType = !vm.outOfQuestions && !vm.loading
            HStack(alignment: .center, spacing: 0) {
                ZStack(alignment: .leading) {
                    if draft.isEmpty {
                        Text(vm.outOfQuestions ? "You're out of questions for now"
                                               : "Ask about a stock, the news or a term…")
                            .font(StakFont.geist(14 * u))
                            .foregroundStyle(muted)
                            .lineLimit(1)
                    }
                    TextField("", text: $draft, axis: .vertical)
                        .font(StakFont.geist(14 * u))
                        .foregroundStyle(StakColors.textPrimary)
                        .tint(teal)
                        .disabled(!canType)
                        .lineLimit(1...5)
                        .submitLabel(.send)
                        // A vertical field takes Return as a new line: it sends instead, as Android's Send key does.
                        .onChange(of: draft) { _, new in
                            if new.hasSuffix("\n") {
                                draft = String(new.dropLast())
                                submit()
                            } else if new.count > draftMax {
                                draft = String(new.prefix(draftMax))
                            }
                        }
                        .accessibilityLabel("Ask STAK AI")
                }
                .padding(.vertical, 10 * u)
                .padding(.leading, 16 * u)
                .frame(maxWidth: .infinity)
                let ready = !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && vm.canAsk
                Button(action: submit) {
                    ZStack {
                        Circle()
                            .fill(ready ? teal : cardBorder)
                            .frame(width: 36 * u, height: 36 * u)
                        Image(systemName: "arrow.up")
                            .font(.system(size: 16 * u, weight: .semibold))
                            .foregroundStyle(ready ? StakColors.bg : muted)
                    }
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
                }
                .disabled(!ready)
                .buttonStyle(.pressDim)
                .accessibilityLabel("Send")
                .padding(.trailing, 2 * u)
                .padding(.vertical, 2 * u)
            }
            .background(surfaceAlt, in: RoundedRectangle(cornerRadius: 22 * u))
            .overlay(RoundedRectangle(cornerRadius: 22 * u).strokeBorder(cardBorder, lineWidth: 1 * u))
            HStack {
                Text("Educational, not financial advice.")
                    .font(StakFont.geist(11 * u))
                    .foregroundStyle(muted)
                Spacer()
                if let u_ = vm.usage, !u_.unlimited {
                    let left = u_.questionsLeft
                    Text("\(left) of \(u_.limit) questions left")
                        .font(StakFont.geist(11 * u))
                        .foregroundStyle(left <= 1 ? warnInk : muted)
                }
            }
        }
        .padding(.horizontal, 20 * u)
        .padding(.top, 8 * u)
        .padding(.bottom, 6 * u)
        .safeAreaPadding(.bottom)
    }

    private func circleButton(icon: String, label: String, enabled: Bool = true, action: @escaping () -> Void) -> some View {
        let u = figmaUnit
        return Button(action: action) {
            ZStack {
                Circle().fill(surface).frame(width: 36 * u, height: 36 * u)
                Image(systemName: icon)
                    .font(.system(size: 16 * u))
                    .foregroundStyle(StakColors.textPrimary)
            }
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
        }
        .disabled(!enabled)
        .buttonStyle(.pressDim)
        .accessibilityLabel(label)
    }
}

// MARK: – Typing dot

private struct TypingDot: View {
    let delay: Double
    var still = false
    @State private var alpha: Double = 0.25

    var body: some View {
        let u = figmaUnit
        Circle()
            .fill(teal)
            .frame(width: 7 * u, height: 7 * u)
            .opacity(still ? 0.7 : alpha)
            .onAppear {
                guard !still else { return }
                withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true).delay(delay)) {
                    alpha = 1
                }
            }
    }
}

// MARK: – Writing caret

private struct WritingCaret: View {
    let u: CGFloat
    var still = false
    @State private var opacity: Double = 1

    var body: some View {
        RoundedRectangle(cornerRadius: 2 * u)
            .fill(teal)
            .frame(width: 8 * u, height: 16 * u)
            .opacity(still ? 1 : opacity)
            .onAppear {
                guard !still else { return }
                withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                    opacity = 0.3
                }
            }
    }
}

// MARK: – Markdown

private struct AiMarkdownView: View {
    let text: String
    let u: CGFloat

    var body: some View {
        let blocks = AiChatMarkdown.parse(text, u: u)
        VStack(alignment: .leading, spacing: 8 * u) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, b in
                switch b {
                case .paragraph(let s):
                    Text(s)
                        .font(StakFont.geist(14 * u))
                        .stakLineHeight(21 * u, size: 14 * u, face: .geist)
                        .foregroundStyle(textInk)
                        .frame(maxWidth: .infinity, alignment: .leading)
                case .bullets(let items):
                    VStack(alignment: .leading, spacing: 4 * u) {
                        ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                            HStack(alignment: .top, spacing: 8 * u) {
                                Text("•")
                                    .font(StakFont.geist(14 * u))
                                    .stakLineHeight(21 * u, size: 14 * u, face: .geist)
                                    .foregroundStyle(teal)
                                    .accessibilityHidden(true)
                                Text(item)
                                    .font(StakFont.geist(14 * u))
                                    .stakLineHeight(21 * u, size: 14 * u, face: .geist)
                                    .foregroundStyle(textInk)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: – Markdown parser (mirrors android AiMarkdown helpers)

enum AiChatMarkdown {
    enum Block {
        case paragraph(AttributedString)
        case bullets([AttributedString])
    }

    static func parse(_ text: String, u: CGFloat) -> [Block] {
        var out: [Block] = []
        // A blank line - even one holding spaces - separates paragraphs (Android's "\n\s*\n").
        let paragraphs = text.replacingOccurrences(of: #"\n\s*\n"#, with: "\u{0}", options: .regularExpression)
            .components(separatedBy: "\u{0}").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        for para in paragraphs {
            var paraLines: [String] = []
            var bulletLines: [String] = []
            func flushPara() { if !paraLines.isEmpty { out.append(.paragraph(boldSpans(paraLines.joined(separator: " "), u: u))); paraLines.removeAll() } }
            func flushBullets() { if !bulletLines.isEmpty { out.append(.bullets(bulletLines.map { boldSpans($0, u: u) })); bulletLines.removeAll() } }
            for line in para.components(separatedBy: "\n").map({ $0.trimmingCharacters(in: .whitespaces) }).filter({ !$0.isEmpty }) {
                if line.hasPrefix("- ") || line.hasPrefix("* ") || line.hasPrefix("• ") {
                    flushPara(); bulletLines.append(String(line.dropFirst(2)).trimmingCharacters(in: .whitespaces))
                } else { flushBullets(); paraLines.append(line) }
            }
            flushPara(); flushBullets()
        }
        return out
    }

    static func tidyStreaming(_ text: String) -> String {
        var t = text
        // Drop a dangling bullet marker at the end
        if let r = t.range(of: #"\n[ \t]*[-*•]?[ \t]*$"#, options: .regularExpression) { t.removeSubrange(r) }
        // Drop an unclosed bold marker
        let marks = t.components(separatedBy: "**").count - 1
        if marks % 2 == 1, let r = t.range(of: "**", options: .backwards) { t.removeSubrange(r) }
        if t.hasSuffix("*") && !t.hasSuffix("**") { t.removeLast() }
        return t
    }

    /// "**this**" -> SemiBold white; the rest stays as is.
    static func boldSpans(_ line: String, u: CGFloat) -> AttributedString {
        var result = AttributedString()
        var rest = line
        while !rest.isEmpty {
            guard let start = rest.range(of: "**"), let end = rest.range(of: "**", range: rest.index(start.upperBound, offsetBy: 0)..<rest.endIndex) else {
                result.append(AttributedString(rest)); break
            }
            result.append(AttributedString(String(rest[..<start.lowerBound])))
            var bold = AttributedString(String(rest[start.upperBound..<end.lowerBound]))
            bold.swiftUI.font = StakFont.geist(14 * u, .semiBold)
            bold.swiftUI.foregroundColor = Color.white
            result.append(bold)
            rest = String(rest[end.upperBound...])
        }
        return result
    }
}

// MARK: – Helpers

/// Questions to start with, matched to where the chat was opened from; a stock's are asked by its company name.
private func starterQuestions(_ ctx: StakAiContext?, names: [String: String]) -> [String] {
    switch ctx?.type {
    case "stock":
        let t = ctx?.ticker ?? ""
        let name = names[t] ?? t
        return ["Why is \(t) moving today?", "How does \(name) make money?", "What do \(t)'s numbers say?"]
    case "article":
        return ["What does this mean for me?", "Explain this in simple terms", "Which companies does this affect?"]
    case "brief":
        return ["Explain today's market simply", "Why does this matter to me?", "What's worth keeping an eye on?"]
    default:
        return ["Why is Nvidia moving today?", "What is a P/E ratio?", "How do earnings move a stock?"]
    }
}

/// "Your next one is at 3:40 PM." (or "tomorrow at …") from the window's reset time.
private func nextQuestionText(_ resetsAt: String?) -> String {
    guard let iso = resetsAt, let date = MyStakHoldings.parse(iso) else { return "Check back in a few hours." }
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = Calendar.current.isDateInToday(date) ? "'Your next one is at' h:mm a'.'": "'Your next one is tomorrow at' h:mm a'.'"
    return f.string(from: date)
}

/// The way into STAK AI from a page (a live article, a stock, the Daily Brief): a card saying what you can ask, which
/// opens the chat with that page as its context. Mirrors android AskAiCard (ui/ai/StakAiChatScreen.kt).
struct AskAiCard: View {
	let title: String
	let subtitle: String
	let onOpen: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: onOpen) {
			HStack(spacing: 12 * u) {
				ZStack {
					Circle().fill(StakColors.surfaceAlt)
					Image(systemName: "sparkles")
						.resizable()
						.scaledToFit()
						.frame(width: 17 * u, height: 17 * u)
						.foregroundStyle(StakColors.teal)
				}
				.frame(width: 34 * u, height: 34 * u)
				VStack(alignment: .leading, spacing: 2 * u) {
					Text(title)
						.font(StakFont.sora(14 * u, .semiBold))
						.foregroundStyle(Color.white)
					Text(subtitle)
						.font(StakFont.geist(12 * u))
						.stakLineHeight(16 * u, size: 12 * u, face: .geist)
						.foregroundStyle(StakColors.muted)
						.fixedSize(horizontal: false, vertical: true)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				// Android's rounded ArrowForward in an 18 box: a light, small arrow.
				Image(systemName: "arrow.forward")
					.font(.system(size: 12 * u, weight: .regular))
					.foregroundStyle(StakColors.teal)
					.frame(width: 18 * u, height: 18 * u)
			}
			.padding(.horizontal, 14 * u)
			.padding(.vertical, 12 * u)
			.background(StakColors.surface, in: RoundedRectangle(cornerRadius: 14 * u))
			.overlay(RoundedRectangle(cornerRadius: 14 * u).strokeBorder(StakColors.teal.opacity(0.35), lineWidth: 1 * u))
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
	}
}

/// STAK AI's way in from a tab's header - Home beside the bell, News beside search. Android's AskAiHeaderButton: the
/// sparkle at half the circle, in teal.
struct AskAiHeaderButton: View {
	let size: CGFloat
	let background: Color
	let action: () -> Void

	var body: some View {
		Button(action: action) {
			ZStack {
				Circle().fill(background)
				Image(systemName: "sparkles")
					.resizable()
					.scaledToFit()
					.frame(width: size * 0.5, height: size * 0.5)
					.foregroundStyle(StakColors.teal)
			}
			.frame(width: size, height: size)
		}
		.buttonStyle(.pressDim)
		.accessibilityLabel("Ask STAK AI")
	}
}
