import SwiftUI

private let userBubble = Color(argb: 0xFF1C3A4A)
private let warnInk = Color(argb: 0xFFE5A54B)
private let teal = Color(argb: 0xFF69B3CA)
private let surface = Color(argb: 0xFF181F30)
private let surfaceAlt = Color(argb: 0xFF10182B)
private let cardBorder = Color(argb: 0xFF2A3346)
private let muted = Color(argb: 0xFF819ABB)
private let textInk = Color(argb: 0xFFC8D2E0)

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

    private var submit: () -> Void {{ if !draft.trimmingCharacters(in: .whitespaces).isEmpty && vm.canAsk { vm.send(draft); draft = "" } }}

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
        .task { vm.configure(context: context, question: question, conversationId: conversationId) }
        .onChange(of: vm.returnedDraft) { _, draft in
            if let d = vm.consumeReturnedDraft(), self.draft.isEmpty { self.draft = d }
        }
    }

    // MARK: – Header

    private func header(u: CGFloat) -> some View {
        ZStack {
            HStack(spacing: 6 * u) {
                Image(systemName: "sparkles")
                    .font(.system(size: 16 * u))
                    .foregroundStyle(teal)
                Text("STAK AI")
                    .font(StakFont.sora(17 * u, .semiBold))
                    .foregroundStyle(StakColors.textPrimary)
            }
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
        .frame(height: 56 * u * typeScale)
    }

    // MARK: – Context chip

    private func contextChip(_ ctx: StakAiContext, u: CGFloat) -> some View {
        let label: String = {
            switch ctx.type {
            case "stock": return "Asking about \(ctx.ticker ?? "")"
            case "article": return "About: \(ctx.headline ?? "")"
            default: return "About today's Daily Brief"
            }
        }()
        return HStack(spacing: 6 * u) {
            Circle().fill(teal).frame(width: 6 * u, height: 6 * u)
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
                    if vm.messages.isEmpty && !vm.loading && !vm.sending {
                        emptyState(u: u)
                    }
                    ForEach(vm.messages) { m in
                        if m.fromUser { userLine(m, u: u) }
                        else {
                            answerLine(m, isLatest: m.key == vm.messages.last(where: { !$0.fromUser })?.key, u: u)
                        }
                    }
                    if vm.loading && vm.messages.isEmpty {
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
            .onChange(of: vm.messages.count) { _, _ in proxy.scrollTo("bottom") }
            .onChange(of: vm.sending) { _, _ in proxy.scrollTo("bottom") }
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
            Text("Ask STAK AI")
                .font(StakFont.sora(20 * u, .semiBold))
                .foregroundStyle(StakColors.textPrimary)
                .padding(.top, 14 * u)
            Text("Plain-English answers about stocks, the news and investing terms.")
                .font(StakFont.geist(13 * u))
                .foregroundStyle(muted)
                .multilineTextAlignment(.center)
                .padding(.top, 6 * u)
                .padding(.horizontal, 12 * u)
            VStack(spacing: 8 * u) {
                ForEach(starterQuestions(vm.context), id: \.self) { q in
                    suggestionRow(q, enabled: vm.canAsk, u: u) { vm.send(q, via: "starter") }
                }
            }
            .padding(.top, 22 * u)
            let limitNote: String = {
                if vm.usage?.unlimited == true { return "No question limit on this account. When STAK AI can't help, it'll say so." }
                return "You get \(vm.usage?.limit ?? 5) questions every 6 hours. When STAK AI can't help or asks you something back, it doesn't count."
            }()
            Text(limitNote)
                .font(StakFont.geist(11 * u))
                .foregroundStyle(muted)
                .multilineTextAlignment(.center)
                .padding(.top, 16 * u)
                .padding(.horizontal, 8 * u)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 28 * u)
    }

    private func suggestionRow(_ text: String, enabled: Bool, u: CGFloat, onTap: @escaping () -> Void) -> some View {
        HStack {
            Text(text)
                .font(StakFont.geist(13 * u, .medium))
                .foregroundStyle(StakColors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: "arrow.right")
                .font(.system(size: 16 * u))
                .foregroundStyle(teal)
        }
        .padding(.horizontal, 14 * u)
        .padding(.vertical, 10 * u)
        .background(surface, in: RoundedRectangle(cornerRadius: 12 * u))
        .overlay(RoundedRectangle(cornerRadius: 12 * u).strokeBorder(cardBorder, lineWidth: 1 * u))
        .opacity(enabled ? 1 : 0.5)
        .contentShape(Rectangle())
        .onTapGesture(perform: enabled ? onTap : {})
    }

    // MARK: – User bubble

    private func userLine(_ m: AiMessage, u: CGFloat) -> some View {
        VStack(alignment: .trailing, spacing: 4 * u) {
            Text(m.text)
                .font(StakFont.geist(14 * u))
                .foregroundStyle(StakColors.textPrimary)
                .padding(.horizontal, 14 * u)
                .padding(.vertical, 10 * u)
                .background(userBubble, in: RoundedRectangle(cornerRadius: 16 * u, style: .continuous))
                .clipShape(
                    .rect(topLeadingRadius: 16 * u, bottomLeadingRadius: 16 * u,
                          bottomTrailingRadius: 4 * u, topTrailingRadius: 16 * u)
                )
                .opacity(m.failed ? 0.6 : 1)
            if m.failed {
                Text("No answer")
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
                Text("STAK AI")
                    .font(StakFont.sora(12 * u, .semiBold))
                    .foregroundStyle(muted)
            }
            if m.streaming {
                aiMarkdown(text: AiChatMarkdown.tidyStreaming(m.text), u: u)
                writingCaret(u: u)
            } else {
                aiMarkdown(text: m.text, u: u).opacity(m.cutOff ? 0.6 : 1)
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
                        Text(q)
                            .font(StakFont.geist(12 * u))
                            .foregroundStyle(teal)
                            .padding(.horizontal, 12 * u)
                            .padding(.vertical, 7 * u)
                            .background(
                                RoundedRectangle(cornerRadius: 16 * u)
                                    .strokeBorder(teal.opacity(0.45), lineWidth: 1 * u)
                            )
                            .onTapGesture { vm.send(q, via: "followup") }
                    }
                }
            }
        }
    }

    private func thumbButton(icon: String, selected: Bool, label: String, u: CGFloat, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16 * u))
                .foregroundStyle(selected ? teal : muted)
        }
        .buttonStyle(.pressDim)
        .frame(width: 44, height: 44)
        .accessibilityLabel(label)
    }

    // MARK: – Typing dots

    private func typingDots(u: CGFloat) -> some View {
        HStack(spacing: 5 * u) {
            ForEach(0..<3, id: \.self) { i in
                TypingDot(delay: Double(i) * 0.15)
            }
        }
        .padding(.vertical, 6 * u)
        .accessibilityLabel("STAK AI is answering")
    }

    // MARK: – Writing caret

    private func writingCaret(u: CGFloat) -> some View {
        WritingCaret(u: u)
    }

    // MARK: – Markdown

    private func aiMarkdown(text: String, u: CGFloat) -> some View {
        AiMarkdownView(text: text, u: u)
    }

    // MARK: – Notice

    private func noticeCard(_ notice: AiNotice, u: CGFloat) -> some View {
        let text: String = {
            switch notice {
            case .limitReached(let at):
                let tail = nextQuestionText(at)
                return "You've used your \(vm.usage?.limit ?? 5) questions for now. \(tail)"
            case .failed(let offline):
                return offline ? "You're offline, so that didn't send. It didn't count."
                    : "STAK AI couldn't answer just now. That one didn't count."
            case .slow:
                return "STAK AI is taking longer than usual. Check your chats in a moment before asking again."
            case .loadFailed:
                return "Couldn't open that chat."
            }
        }()
        return HStack(alignment: .center) {
            Text(text)
                .font(StakFont.geist(12 * u))
                .foregroundStyle(textInk)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 12 * u)
            VStack(spacing: 0) {
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
                .font(StakFont.geist(12 * u, .medium))
                .foregroundStyle(teal)
                .frame(minWidth: 44, minHeight: 44)
                .padding(.horizontal, 10 * u)
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
                        .onSubmit { submit() }
                        .accessibilityLabel("Ask STAK AI")
                }
                .padding(.vertical, 10 * u)
                .padding(.leading, 16 * u)
                .frame(maxWidth: .infinity)
                let ready = !draft.trimmingCharacters(in: .whitespaces).isEmpty && vm.canAsk
                Button(action: submit) {
                    ZStack {
                        Circle()
                            .fill(ready ? teal : cardBorder)
                            .frame(width: 36 * u, height: 36 * u)
                        Image(systemName: "arrow.up")
                            .font(.system(size: 16 * u, weight: .semibold))
                            .foregroundStyle(ready ? StakColors.bg : muted)
                    }
                }
                .disabled(!ready)
                .buttonStyle(.pressDim)
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
        }
        .disabled(!enabled)
        .buttonStyle(.pressDim)
        .frame(width: 44, height: 44)
        .accessibilityLabel(label)
    }
}

// MARK: – Typing dot

private struct TypingDot: View {
    let delay: Double
    @State private var alpha: Double = 0.25

    var body: some View {
        let u = figmaUnit
        Circle()
            .fill(teal)
            .frame(width: 7 * u, height: 7 * u)
            .opacity(alpha)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true).delay(delay)) {
                    alpha = 1
                }
            }
    }
}

// MARK: – Writing caret

private struct WritingCaret: View {
    let u: CGFloat
    @State private var opacity: Double = 1

    var body: some View {
        RoundedRectangle(cornerRadius: 2 * u)
            .fill(teal)
            .frame(width: 8 * u, height: 16 * u)
            .opacity(opacity)
            .onAppear {
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
        let blocks = AiChatMarkdown.parse(text)
        VStack(alignment: .leading, spacing: 8 * u) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, b in
                switch b {
                case .paragraph(let s):
                    Text(s)
                        .font(StakFont.geist(14 * u))
                        .foregroundStyle(textInk)
                        .frame(maxWidth: .infinity, alignment: .leading)
                case .bullets(let items):
                    VStack(alignment: .leading, spacing: 4 * u) {
                        ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                            HStack(alignment: .top, spacing: 8 * u) {
                                Text("•")
                                    .font(StakFont.geist(14 * u))
                                    .foregroundStyle(teal)
                                Text(item)
                                    .font(StakFont.geist(14 * u))
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

    static func parse(_ text: String) -> [Block] {
        var out: [Block] = []
        let paragraphs = text.components(separatedBy: "\n\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        for para in paragraphs {
            var paraLines: [String] = []
            var bulletLines: [String] = []
            func flushPara() { if !paraLines.isEmpty { out.append(.paragraph(boldSpans(paraLines.joined(separator: " ")))); paraLines.removeAll() } }
            func flushBullets() { if !bulletLines.isEmpty { out.append(.bullets(bulletLines.map { boldSpans($0) })); bulletLines.removeAll() } }
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

    static func boldSpans(_ line: String) -> AttributedString {
        var result = AttributedString()
        var rest = line
        while !rest.isEmpty {
            guard let start = rest.range(of: "**"), let end = rest.range(of: "**", range: rest.index(start.upperBound, offsetBy: 0)..<rest.endIndex) else {
                result.append(AttributedString(rest)); break
            }
            result.append(AttributedString(String(rest[..<start.lowerBound])))
            var bold = AttributedString(String(rest[start.upperBound..<end.lowerBound]))
            bold.swiftUI.font = StakFont.geist(14, .medium)
            bold.swiftUI.foregroundColor = Color.white
            result.append(bold)
            rest = String(rest[end.upperBound...])
        }
        return result
    }
}

// MARK: – Helpers

private func starterQuestions(_ ctx: StakAiContext?) -> [String] {
    switch ctx?.type {
    case "stock":
        let t = ctx?.ticker ?? ""
        return ["Why is \(t) moving today?", "How does \(t) make money?", "What do \(t)'s numbers say?"]
    case "article":
        return ["What does this mean for me?", "Explain this in simple terms", "Which companies does this affect?"]
    case "brief":
        return ["Explain today's market simply", "Why does this matter to me?", "What's worth keeping an eye on?"]
    default:
        return ["Why is Nvidia moving today?", "What is a P/E ratio?", "How do earnings move a stock?"]
    }
}

private func nextQuestionText(_ resetsAt: String?) -> String {
    guard let iso = resetsAt, let date = ISO8601DateFormatter().date(from: iso) else { return "Check back in a few hours." }
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
						.foregroundStyle(StakColors.linkTeal)
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
					.foregroundStyle(StakColors.linkTeal)
					.frame(width: 18 * u, height: 18 * u)
			}
			.padding(.horizontal, 14 * u)
			.padding(.vertical, 12 * u)
			.background(StakColors.surface, in: RoundedRectangle(cornerRadius: 14 * u))
			.overlay(RoundedRectangle(cornerRadius: 14 * u).strokeBorder(StakColors.linkTeal.opacity(0.35), lineWidth: 1 * u))
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
					.foregroundStyle(StakColors.linkTeal)
			}
			.frame(width: size, height: size)
		}
		.buttonStyle(.pressDim)
		.accessibilityLabel("Ask STAK AI")
	}
}
