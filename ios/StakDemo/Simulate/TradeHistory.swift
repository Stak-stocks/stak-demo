import SwiftUI

/// The Portfolio page's kicker (SOLD · REALIZED, 1:4605). The FigJam Open orders / Trade history
/// sections that lived here were removed on 2026-10-07 (user ruling: not in the Figma - 1:4876 ends
/// at the footnote). Mirrors android ui/simulate/TradeHistory.kt.
struct PortfolioKicker: View {
	let text: String

	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(10 * u, .medium))
			.tracking(0.9 * u)
			.foregroundStyle(Sim.faint)
			.frame(height: 17 * u, alignment: .bottom)
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.leading, 2 * u)
	}
}
