import SwiftUI

/// Entry splash — Figma node 1554:11348 ("iPhone 13 & 14 - 5").
///
/// Renders the frame's exact 390x844 composition — the tilted 2K glass
/// ball (394 square rotated 48.43°, top-left 183.8/23), swoosh logo,
/// "Welcome to STAK" and the Geist Light subtitle — as one canvas
/// anchored to the TOP of the screen like the frame (taller devices
/// gain bottom background) and scaled about its top-center, so y0
/// stays at the screen top and nothing sinks on taller phones.
///
/// Auto-advances after its 1200 ms hold — no tap-to-skip; the authored
/// motion is delay-only (1:926) and the transition is owned by
/// RootFlowView.
struct SplashView: View {
	let onContinue: () -> Void

	var body: some View {
		GeometryReader { proxy in
			let scale = proxy.size.width / 390

			// The design canvas: fixed 390x844 anchored to the TOP of the
			// screen, scaled about its top-center so y0 stays at the top.
			ZStack(alignment: .top) {
				// Glass ball — 394 square rotated 48.43°, top-left (183.8, 23).
				Image("SplashGlassBall")
					.resizable()
					.frame(width: 394, height: 394)
					.rotationEffect(.degrees(48.43))
					.position(x: 183.8 + 197, y: 23 + 197)

				VStack(spacing: 10) {
					VStack(spacing: 37) {
						Image("StakLogoMark")
							.resizable()
							.frame(width: 49.43, height: 49.43)
							.accessibilityLabel("STAK")
						Text("Welcome to STAK")
							.font(StakFont.sora(29.87, .semiBold))
							.foregroundStyle(StakColors.textPrimary)
					}
					Text("The stock market finally speaks\nyour language")
						.font(StakFont.geist(16, .light))
						.multilineTextAlignment(.center)
						.foregroundStyle(StakColors.textPrimary.opacity(0.7))
				}
				.offset(x: 0.3, y: 334.49)
			}
			.frame(width: 390, height: 844)
			.scaleEffect(scale, anchor: .top)
			.position(x: proxy.size.width / 2, y: 422)
		}
		.background(StakColors.bg)
		.ignoresSafeArea()
		.task {
			// Prototype: "After delay 1200ms" → Auth · Sign up.
			try? await Task.sleep(for: .seconds(1.2))
			onContinue()
		}
	}
}
