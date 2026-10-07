import SwiftUI

/// Tells the user a paper buy / sell / setup / limit order / cancel didn't go through. PaperPortfolio applies each
/// change at once and confirms it with the server in the background, so the screen has already shown it done by the
/// time this can be known; the next read puts the real numbers back and this explains why they moved. Hosted once over
/// the whole shell, since the ticket that raised it can be on any page. Mirrors android
/// ui/simulate/PaperTradeErrorBanner.kt.
struct PaperTradeErrorBanner: View {
	@ObservedObject private var portfolio = PaperPortfolio.shared

	var body: some View {
		let u = figmaUnit
		if let message = portfolio.lastError {
			Button { portfolio.dismissError() } label: {
				HStack(spacing: 0) {
					Text(message)
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Sim.red)
						.frame(maxWidth: .infinity, alignment: .leading)
						.multilineTextAlignment(.leading)
					Text("Dismiss")
						.font(StakFont.geist(11 * u, .medium))
						.foregroundStyle(Sim.muted)
				}
				.padding(.horizontal, 14 * u)
				.padding(.vertical, 12 * u)
				.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 10 * u))
			}
			.buttonStyle(.pressDim)
			.padding(.horizontal, 20 * u)
			.padding(.vertical, 8 * u)
			.transition(.opacity)
			.accessibilityLabel(message)
			.accessibilityHint("Double-tap to dismiss")
			// Spoken as it arrives, and gone after seven seconds - a new message restarts both.
			.task(id: message) {
				UIAccessibility.post(notification: .announcement, argument: message)
				do { try await Task.sleep(nanoseconds: 7_000_000_000) } catch { return }
				if portfolio.lastError == message { portfolio.dismissError() }
			}
		}
	}
}
