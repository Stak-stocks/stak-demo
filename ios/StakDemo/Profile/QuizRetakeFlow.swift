import SwiftUI

/// Profile · Taste & risk (1:5732) re-enters the onboarding quiz: "Retake the taste quiz" from
/// 02 Brand picks, "Change" on the risk / goal cards from 05 / 04. The steps are the onboarding
/// frames themselves with their house pushes (mirrors android: the quiz routes under QuizRetake);
/// 07 Taste reveal's Lets go ends the retake (`onDone`) instead of going on to 08.
struct QuizRetakeFlow: View {
	enum Start { case brandPicks, goal, risk }
	let start: Start
	let onDone: () -> Void
	@State private var stack: [FlowScreen]
	@State private var anim = FlowAnim.pushRight

	init(start: Start, onDone: @escaping () -> Void) {
		self.start = start
		self.onDone = onDone
		let first: FlowScreen
		switch start {
		case .brandPicks: first = .brandPicks
		case .goal: first = .goal
		case .risk: first = .risk
		}
		self._stack = State(initialValue: [first])
	}

	var body: some View {
		ZStack {
			screen(for: stack.last ?? .brandPicks)
				.transition(anim.transition)
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	private func push(_ screen: FlowScreen, _ a: FlowAnim = .pushRight) {
		anim = a
		withAnimation(a.animation) { stack.append(screen) }
	}

	/// The first step's Back leaves the retake (the Taste & risk page is beneath).
	private func pop() {
		if stack.count > 1 {
			anim = .pushLeft
			withAnimation(FlowAnim.pushLeft.animation) { stack.removeLast() }
		} else {
			onDone()
		}
	}

	private func finish() {
		QuizRetake.active = false
		Session.shared.saveProfile()
		onDone()
	}

	@ViewBuilder
	private func screen(for screen: FlowScreen) -> some View {
		switch screen {
		case .brandPicks:
			BrandPicksView(onBack: { pop() }, onContinue: { push(.swipeTutorial) }).id(FlowScreen.brandPicks)
		case .swipeTutorial:
			SwipeTutorialView(onBack: { pop() }, onContinue: { push(.goal) }).id(FlowScreen.swipeTutorial)
		case .goal:
			GoalView(onBack: { pop() }, onContinue: { push(.risk) }).id(FlowScreen.goal)
		case .risk:
			RiskView(onBack: { pop() }, onContinue: { push(.preparingDeck) }).id(FlowScreen.risk)
		case .preparingDeck:
			PreparingDeckView {
				anim = .dissolve
				withAnimation(FlowAnim.dissolve.animation) {
					stack.removeLast()
					stack.append(.tasteReveal)
				}
			}
			.id(FlowScreen.preparingDeck)
		case .tasteReveal:
			TasteRevealView(onBack: { pop() }, onLetsGo: { finish() }).id(FlowScreen.tasteReveal)
		default:
			BrandPicksView(onBack: { pop() }, onContinue: { push(.swipeTutorial) }).id(FlowScreen.brandPicks)
		}
	}
}
