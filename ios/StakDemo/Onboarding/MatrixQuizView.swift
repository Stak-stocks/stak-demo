import SwiftUI

/// One 2x2 matrix option — icon in a #242b3d circle, Geist title/subtitle.
/// Icon glyphs keep their native Figma frame size (21.06 for the goal set,
/// up to the full 37.9 circle for the risk plus/eye).
struct MatrixOption {
	let title: String
	let subtitle: String
	let icon: String
	var iconSize: CGFloat = 21.06
	var circleSize: CGFloat = 37.9
	/// Authored icon-frame y within the card content (row 2 icons sit lower).
	var iconDy: CGFloat = 0
}

/// Shared single-select 2x2 matrix quiz screen — the layout of Figma
/// "Onboarding · 04 Goal · matrix" (1554:8828) and "05 Risk matrix"
/// (1554:8913): step label, Sora 24/31 headline, Geist 12 subtitle,
/// #181f30 cards (163.2x155.8, r16.85) with the hairline #69b3ca
/// selected border, and Continue/Back CTAs (Continue gates on a pick).
struct MatrixQuizView: View {
	let stepLabel: String
	let headline: String
	let subtitle: String
	let options: [MatrixOption]
	let onBack: () -> Void
	/// Continue reports the chosen card's index.
	let onContinue: (Int) -> Void
	/// The frames arrive with one card already selected (04 Goal 1554:8828,
	/// 05 Risk 1554:8913); the caller names it (Codex parity audit
	/// 2026-09-04). -1 = start unselected. Declared last: memberwise-init
	/// argument order is declaration order, and callers pass it last.
	var initialSelection: Int = -1

	/// The user's own tap, once made; until then the authored selection shows.
	@State private var chosen: Int? = nil
	private var selected: Int { chosen ?? initialSelection }

	var body: some View {
		let u = figmaUnit
		Artboard {
			HStack {
				AuthBackCircle(action: onBack)
				Spacer()
				Text(stepLabel)
					.font(StakFont.geist(10 * u, .medium))
					.tracking(0.9 * u)
					.foregroundStyle(Auth.faintText)
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 10 * u)
			.padding(.bottom, 4 * u)

			ScrollView {
				VStack(alignment: .leading, spacing: 16 * u) {
					VStack(alignment: .leading, spacing: 12 * u) {
						Text(headline)
							.font(StakFont.sora(24 * u, .semiBold))
							.stakLineHeight(31 * u, size: 24 * u, face: .sora)
							.foregroundStyle(StakColors.textPrimary)
						Text(subtitle)
							.font(StakFont.geist(12 * u))
							.stakLineHeight(16 * u, size: 12 * u, face: .geist)
							.foregroundStyle(Auth.subtitleGray)
					}

					VStack(alignment: .leading, spacing: 12 * u) {
						ForEach(0..<2) { row in
							HStack(spacing: 13 * u) {
								ForEach(0..<2) { col in
									let index = row * 2 + col
									MatrixCard(option: options[index], selected: selected == index) {
										chosen = index
									}
								}
							}
						}
					}
					.padding(.top, 4 * u)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.padding(.horizontal, 24 * u)
				.padding(.top, 14 * u)
			}

			VStack(spacing: 10 * u) {
				AuthCta(text: "Continue", enabled: selected >= 0) {
					if selected >= 0 { onContinue(selected) }
				}
				AuthSecondaryButton(text: "Back", action: onBack)
			}
			.padding(.top, 8 * u)
			.padding(.bottom, 26 * u)
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}

private struct MatrixCard: View {
	let option: MatrixOption
	let selected: Bool
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		// Authored interior (1:597): content top-anchored at 15.27; the icon
		// at its per-option dy; the text block 21 below the icon. Never
		// vertically centered — row 2 reads lower by design.
		Button(action: action) {
			VStack(alignment: .leading, spacing: 0) {
				Spacer().frame(height: option.iconDy * u)
				ZStack {
					Circle().fill(Color(argb: 0xFF242B3D))
					Image(option.icon)
						.resizable()
						.frame(width: option.iconSize * u, height: option.iconSize * u)
				}
				.frame(width: option.circleSize * u, height: option.circleSize * u)
				Spacer().frame(height: 21 * u)
				VStack(alignment: .leading, spacing: 5 * u) {
					Text(option.title)
						.font(StakFont.geist(12 * u, .medium))
						.stakLineHeight(16.85 * u, size: 12 * u, face: .geist)
						.foregroundStyle(StakColors.textPrimary)
						.frame(width: 142.13 * u, alignment: .leading)
					Text(option.subtitle)
						.font(StakFont.geist(10 * u))
						.stakLineHeight(13.69 * u, size: 10 * u, face: .geist)
						.foregroundStyle(Auth.faintText)
						.frame(width: 121.07 * u, alignment: .leading)
				}
			}
			.padding(.horizontal, 14.74 * u)
			.padding(.vertical, 15.27 * u)
			.frame(width: 163.18 * u, height: 155.81 * u, alignment: .topLeading)
			.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 16.85 * u))
			.overlay {
				if selected {
					RoundedRectangle(cornerRadius: 16.85 * u)
						.strokeBorder(Auth.linkTeal, lineWidth: 0.53 * u)
				}
			}
		}
		.buttonStyle(.pressDim)
	}
}
