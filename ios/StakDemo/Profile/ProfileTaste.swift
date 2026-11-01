import SwiftUI

// The taste chips' surface (Profile 171:1004), on Profile and Taste & risk.
let tasteChipBg = Color(argb: 0xFF1A2333)
let tasteChipBorder = Color(argb: 0xFF2C9DBC)
let tasteChipInk = Color(argb: 0xFF7FD4E8)

/// The onboarding quiz screens are showing as a retake from Taste & risk: they say so instead of reading as a first
/// run (step labels, "Updating your taste...", Save). Mirrors android QuizRetake.mode != null.
private struct QuizRetakeKey: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
	var quizRetake: Bool {
		get { self[QuizRetakeKey.self] }
		set { self[QuizRetakeKey.self] = newValue }
	}
}

/// What Profile and its Taste & risk page say about the account's onboarding answers (Chinedu_Mobile 1:5732,
/// 2026-10-07, adapted to the live answers). Mirrors android ui/profile/ProfileTaste.kt.
@MainActor
enum ProfileTaste {
	/// The taste chips: the demo persona's authored three, else the onboarding picks plus the stocks saved since that
	/// belong to a taste, so the chips follow what the user keeps from the deck. (Profile draws the demo's three at
	/// their authored widths.)
	static func chips() -> [String] {
		if Session.shared.demoAccount { return ["Tech Curious", "High Growth", "Consumer Brands"] }
		let holdings = MyStakHoldings.shared
		let saved = holdings.tickers.compactMap { holdings.nameOf($0) }.filter(TasteModel.isTasteBrand)
		let p = UserProfile.shared
		return TasteModel.chips(p.brandPicks.union(saved), goal: p.goal, risk: p.risk)
	}

	/// The risk style as the quiz named it ("Growth-Oriented"), or nil before the risk question was answered.
	static func riskLabel() -> String? {
		let risk = UserProfile.shared.risk
		return risk < 0 ? nil : TasteModel.riskStyle(risk)
	}

	/// One line on what the risk answer said.
	static func riskBlurb() -> String {
		switch UserProfile.shared.risk {
		case TasteModel.riskHold: return "You hold through a drop and watch it closely."
		case TasteModel.riskStepAway: return "Big drops make you uncomfortable, so you step back."
		case TasteModel.riskSellSome: return "You'd rather protect part of your money than ride out a drop."
		case TasteModel.riskBuyMore: return "You're comfortable with dips when the story holds."
		default: return "Answer one question about a falling stock."
		}
	}

	/// The goal as the quiz worded it, or nil before the goal question was answered.
	static func goalLabel() -> String? {
		switch UserProfile.shared.goal {
		case TasteModel.goalLearn: return "Learn how investing works"
		case TasteModel.goalGrow: return "Grow my money long-term"
		case TasteModel.goalFirstStocks: return "Find my first stocks"
		case TasteModel.goalExplore: return "Just exploring"
		default: return nil
		}
	}
}

/// Taste & risk's way back into the onboarding quiz (Chinedu_Mobile 1:5732): "Retake the taste quiz" from Brand
/// picks (skipping the swipe tutorial - they've swiped before), "Change" on the goal or risk card for just that
/// question. The steps are the onboarding screens themselves, each writing its answer as it continues; the last one
/// saves the answers, sends them to the server and comes back (`onDone`). Left any other way (Back on the first step,
/// a swipe back), the answers as they were go back. Mirrors android QuizRetake.
struct QuizRetakeFlow: View {
	enum Start: String, Equatable { case all, goal, risk }
	let start: Start
	let onDone: () -> Void
	@State private var stack: [FlowScreen]
	@State private var anim = FlowAnim.pushRight
	/// The answers when the retake opened, put back unless it finishes.
	@State private var before: TasteDto? = nil
	@State private var done = false

	init(start: Start, onDone: @escaping () -> Void) {
		self.start = start
		self.onDone = onDone
		switch start {
		case .all: _stack = State(initialValue: [.brandPicks])
		case .goal: _stack = State(initialValue: [.goal])
		case .risk: _stack = State(initialValue: [.risk])
		}
	}

	var body: some View {
		ZStack {
			screen(for: stack.last ?? .brandPicks)
				.transition(anim.transition)
		}
		.background(StakColors.bg.ignoresSafeArea())
		.environment(\.quizRetake, true)
		.onAppear { if before == nil { before = ProfileSync.currentTaste() } }
		.onDisappear {
			guard !done, let before else { return }
			let p = UserProfile.shared
			p.goal = before.goal
			p.risk = before.risk
			p.riskStyle = before.riskStyle
			p.brandPicks = Set(before.picks)
			Session.shared.saveProfile()
		}
	}

	private func push(_ screen: FlowScreen) {
		anim = .pushRight
		withAnimation(FlowAnim.pushRight.animation) { stack.append(screen) }
	}

	/// The first step's Back leaves the retake (the Taste & risk page is beneath).
	private func pop() {
		guard stack.count > 1 else { onDone(); return }
		anim = .pushLeft
		withAnimation(FlowAnim.pushLeft.animation) { _ = stack.removeLast() }
	}

	/// Once: a second tap on the last step mustn't pop the page beneath too.
	private func finish() {
		guard !done else { return }
		done = true
		Session.shared.saveProfile()
		ProfileSync.shared.pushTaste()
		onDone()
	}

	@ViewBuilder
	private func screen(for screen: FlowScreen) -> some View {
		switch screen {
		case .goal:
			GoalView(onBack: { pop() }, onContinue: { start == .goal ? finish() : push(.risk) }).id(FlowScreen.goal)
		case .risk:
			RiskView(onBack: { pop() }, onContinue: { start == .risk ? finish() : push(.preparingDeck) }).id(FlowScreen.risk)
		case .preparingDeck:
			PreparingDeckView {
				anim = .dissolve
				withAnimation(FlowAnim.dissolve.animation) {
					_ = stack.removeLast()
					stack.append(.tasteReveal)
				}
			}
			.id(FlowScreen.preparingDeck)
		case .tasteReveal:
			TasteRevealView(onBack: { pop() }, onLetsGo: { finish() }).id(FlowScreen.tasteReveal)
		default:
			BrandPicksView(onBack: { pop() }, onContinue: { push(.goal) }).id(FlowScreen.brandPicks)
		}
	}
}
