import SwiftUI

/// 11 · States — the empty blocks of My STAK · Empty (1:6004) and Simulate · Empty (1:6571),
/// 2026-10-07: a Sora SemiBold 20 title, the muted 12 line of a fixed width, and the "Go to Deck"
/// pill (1:6007) with its arrow, 10 apart. Mirrors android ui/components/EmptyStates.kt.
struct EmptyStateBlock: View {
	let title: String
	let body_: String
	let bodyWidth: CGFloat
	let link: String
	let onLink: () -> Void

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 10 * u) {
			Text(title)
				.font(StakFont.sora(20 * u, .semiBold))
				.foregroundStyle(StakColors.textPrimary)
				.multilineTextAlignment(.center)
			Text(body_)
				.font(StakFont.geist(12 * u))
				.stakLineHeight(16 * u, size: 12 * u, face: .geist)
				.foregroundStyle(Color(argb: 0xFF819ABB))
				.multilineTextAlignment(.center)
				.frame(width: bodyWidth * u)
			DeckPill(text: link, action: onLink)
		}
	}
}

/// The "Go to Deck ->" pill (1:6007): #0A1020 on a 0.5 rgba(31,41,68,0.64) hairline, r15, 12/8 padding, Geist Medium 11.491 + the 16 arrow.
struct DeckPill: View {
	let text: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			HStack(spacing: 3 * u) {
				Text(text)
					.font(StakFont.geist(11.491 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				Image("IcArrowRightSmall")
					.resizable()
					.frame(width: 16 * u, height: 16 * u)
			}
			.padding(.horizontal, 12 * u)
			.padding(.vertical, 8 * u)
			.background(StakColors.bg, in: RoundedRectangle(cornerRadius: 15 * u))
			.overlay(RoundedRectangle(cornerRadius: 15 * u).strokeBorder(Color(argb: 0xA31F2944), lineWidth: 0.5 * u))
		}
		.buttonStyle(.pressDim)
	}
}
