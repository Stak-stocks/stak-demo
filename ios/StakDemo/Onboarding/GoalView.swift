import SwiftUI

/// Onboarding · 04 Goal · matrix — Figma node 1:498 (CHINEDU file,
/// "STEP 4 OF 6"). Uses the shared 2x2 matrix quiz layout.
struct GoalView: View {
	let onBack: () -> Void
	let onContinue: () -> Void

	var body: some View {
		MatrixQuizView(
			stepLabel: "STEP 4 OF 6",
			headline: "What brings you here?",
			subtitle: "Pick one. You can change it any time.",
			options: [
				MatrixOption(title: "Learn how investing works", subtitle: "Start from the basics, no shame", icon: "GoalLearn"),
				MatrixOption(title: "Grow my money long-term", subtitle: "Slow and steady wealth", icon: "GoalGrow"),
				MatrixOption(title: "Find my first stocks", subtitle: "I want to understand what to watch", icon: "GoalSearch", iconSize: 26.49, iconDy: 9),
				MatrixOption(title: "Just exploring", subtitle: "Curious, no plan yet", icon: "GoalExplore", iconDy: 9)
			],
			onBack: onBack,
			// Product audit (2026-09-05): nothing pre-selected; the answer shapes the
			// taste reveal and the Profile chips.
			onContinue: { choice in UserProfile.shared.goal = choice; onContinue() }
		)
	}
}
