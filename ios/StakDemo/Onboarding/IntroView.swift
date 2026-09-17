import SwiftUI

/// Onboarding · 01 Welcome — Figma node 1554:8475 (CHINEDU file).
///
/// Value-prop intro after the splash: headline + subcopy, the blue box
/// spilling glass brand coins (the whole Figma group flattened into one
/// bundled render, glows included), and the sharp gradient "Get started"
/// CTA with the "Takes about a minute" caption.
struct IntroView: View {
	let onGetStarted: () -> Void

	var body: some View {
		let u = figmaUnit
		Artboard {
			VStack(alignment: .leading, spacing: 16 * u) {
				// Authored gap 12 (title box 68+62 -> subtitle 142). Sora 26 at line
				// height 31 is below the face's natural 32.76 and stakLineHeight cannot
				// shrink a line under natural, so the two-line title runs
				// 2 x 32.76 - 62 = 3.52 tall; the gap absorbs it (derived from the
				// recorded face metric - re-measure on a Mac; mirrors the Android
				// fix of 2026-09-05 where Compose's excess measured 1.8).
				VStack(alignment: .leading, spacing: 8.48 * u) {
					Text("Find stocks you actually understand.")
						.font(StakFont.sora(26 * u, .semiBold))
						.stakLineHeight(31 * u, size: 26 * u, face: .sora)
						.foregroundStyle(StakColors.textPrimary)
					// The authored two-line shape breaks after "simple," (1:179); the
					// break is explicit so a face-width drift can never pull "clear" up
					// (mirrors Android, 2026-09-05).
					Text("STAK turns brands you already know into simple,\nclear stock ideas, so you can invest with confidence.")
						.font(StakFont.geist(14 * u))
						.stakLineHeight(21 * u, size: 14 * u, face: .geist)
						.frame(width: 342 * u, alignment: .leading)
						.foregroundStyle(Auth.subtitleGray)
				}
				.frame(maxWidth: .infinity, alignment: .leading)

				// Hero — flattened Figma group (render bounds 342x488 at 1x),
				// scaled to the artboard unit so proportions hold on wide devices.
				// The hero art render sits at authored y235 (Hero frame y200 + 34.95;
				// the flattened group's first vector tops out at 235.5 in 1:179).
				// The title's natural-height excess is absorbed by the gap above, so
				// this is the authored pad (mirrors Android, 2026-09-05).
				Image("IntroHeroBox")
					.resizable()
					.scaledToFit()
					.frame(width: 342 * u, height: 488 * u)
					.padding(.top, 34.95 * u)
					.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
			}
			.padding(.horizontal, 24 * u)
			.padding(.top, 24 * u)

			VStack(spacing: 10 * u) {
				AuthCta(text: "Get started", action: onGetStarted)
				Text("Takes about a minute")
					.font(StakFont.geist(11 * u))
					.foregroundStyle(Auth.faintText)
			}
			.padding(.top, 8 * u)
			.padding(.bottom, 26 * u)
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}
