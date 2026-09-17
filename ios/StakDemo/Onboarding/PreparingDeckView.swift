import SwiftUI

/// Onboarding · 06 Preparing deck — Figma node 1554:8998 (CHINEDU file).
///
/// The closing loader: the box-and-coins hero (same flattened render as
/// the intro), "Building your first deck..." in Sora SemiBold 22, and a
/// live spinner with "Reading your brand picks". Auto-advances into the
/// account flow once the deck is "ready".
struct PreparingDeckView: View {
	let onDone: () -> Void

	var body: some View {
		let u = figmaUnit
		// Authored rhythm (1:634, frame y minus the 44 status bar): the frame is
		// TOP-anchored — illustration ink top 245, headline box 648 h28, caption
		// row 694. The flattened hero render carries 66u of baked background
		// above its ink inside the 488u box, so the box tops out at 135.
		// Mirrors android (PreparingDeckScreen).
		ZStack(alignment: .top) {
			Image("IntroHeroBox")
				.resizable()
				.scaledToFit()
				.frame(width: 342 * u, height: 488 * u)
				.offset(y: 135 * u)
			Text("Building your first deck...")
				.font(StakFont.sora(22 * u, .semiBold))
				.stakLineHeight(28 * u, size: 22 * u, face: .sora)
				.multilineTextAlignment(.center)
				.foregroundStyle(StakColors.textPrimary)
				.frame(maxWidth: .infinity)
				.offset(y: 604 * u)
			HStack(spacing: 5 * u) {
				Spinner()
				Text("Reading your brand picks")
					.font(StakFont.geist(12 * u))
					.stakLineHeight(15 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Auth.faintText)
			}
			.offset(y: 650 * u)
		}
		.padding(.horizontal, 24 * u)
		.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
		.background(StakColors.bg.ignoresSafeArea())
		.task {
			// Prototype: "After delay 1800ms" → 07 Taste reveal (dissolve).
			try? await Task.sleep(for: .seconds(1.8))
			onDone()
		}
	}
}

/// 14pt rotating three-quarter arc in the caption gray.
private struct Spinner: View {
	@State private var spinning = false

	var body: some View {
		let u = figmaUnit
		Circle()
			.trim(from: 0, to: 0.75)
			.stroke(Auth.faintText, style: StrokeStyle(lineWidth: 2.94 * u, lineCap: .butt))
			.frame(width: 14 * u, height: 14 * u)
			// The authored ring (1:683) opens at the top-left quadrant: the arc
			// runs from 12 o'clock clockwise to 9 (exact-design audit 2026-09-04).
			.rotationEffect(.degrees(-90))
			.rotationEffect(.degrees(spinning ? 360 : 0))
			.animation(.linear(duration: 0.9).repeatForever(autoreverses: false), value: spinning)
			.onAppear { spinning = true }
	}
}
