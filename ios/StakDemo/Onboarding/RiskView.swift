import SwiftUI

/// Onboarding · 05 Risk matrix — Figma node 1:569 (CHINEDU file,
/// "STEP 5 OF 6"). Shares the matrix layout with step 04; each option
/// has its own glyph (plus, eye, pause, shield-check), all stroke #819abb.
struct RiskView: View {
	let onBack: () -> Void
	let onContinue: () -> Void

	var body: some View {
		MatrixQuizView(
			stepLabel: "STEP 5 OF 6",
			headline: "A stock you’re watching drops 10% overnight.",
			subtitle: "No wrong answer. This helps STAK understand your risk style.",
			options: [
				MatrixOption(title: "Buy more after checking why", subtitle: "Comfortable with dips if the story holds", icon: "RiskPlus", iconSize: 37.9),
				MatrixOption(title: "Hold and watch it closely", subtitle: "I can handle short-term drops", icon: "RiskEye", iconSize: 37.9),
				MatrixOption(title: "Step away for now", subtitle: "Big drops make me uncomfortable", icon: "RiskPause", iconSize: 36, circleSize: 36, iconDy: 9.95),
				MatrixOption(title: "Sell some, reduce risk", subtitle: "I’d rather protect part of my money", icon: "RiskShield", iconSize: 20, circleSize: 36, iconDy: 9.95)
			],
			onBack: onBack,
			// Product audit (2026-09-05): nothing pre-selected; the answer IS the risk
			// style the reveal and Profile show.
			onContinue: { choice in
				UserProfile.shared.risk = choice
				UserProfile.shared.riskStyle = TasteModel.riskStyle(choice)
				onContinue()
			}
		)
	}
}
