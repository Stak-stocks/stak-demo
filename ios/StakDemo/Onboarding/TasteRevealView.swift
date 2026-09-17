import SwiftUI

/// Onboarding · 07 Taste reveal — Figma node 1554:9051 (CHINEDU file, "STEP 6 OF 6").
///
/// The quiz result: teal eyebrow, "Here's what you're into." headline,
/// the #181f30 taste card with four strength bars at their exact Figma
/// widths (the frame arrives already filled - no entry animation; Codex
/// parity audit 2026-09-04), the Risk style chip ("Growth-Oriented" ›)
/// and the "Let's go!" / Back CTAs.
struct TasteRevealView: View {
	let onBack: () -> Void
	let onLetsGo: () -> Void
	@ObservedObject private var profile = UserProfile.shared
	// Product audit (2026-09-05): the Risk style row opens a picker sheet.
	@State private var showRisk = false

	var body: some View {
		let u = figmaUnit
		Artboard {
			HStack {
				AuthBackCircle(action: onBack)
				Spacer()
				StepLabel(text: "STEP 6 OF 6")
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 10 * u)
			.padding(.bottom, 4 * u)

			ScrollView {
				VStack(alignment: .leading, spacing: 16 * u) {
					Text("YOUR STARTING STAK TASTE")
						.font(StakFont.geist(10 * u, .medium))
						.tracking(0.9 * u)
						.foregroundStyle(Auth.linkTeal)
					VStack(alignment: .leading, spacing: 12 * u) {
						Text("Here’s what you’re into.")
							.font(StakFont.sora(26 * u, .semiBold))
							.stakLineHeight(33 * u, size: 26 * u, face: .sora)
							.foregroundStyle(StakColors.textPrimary)
						Text("Built from your picks. It gets smarter with every swipe.")
							.font(StakFont.geist(12 * u))
							.foregroundStyle(Auth.subtitleGray)
					}

					// Taste card — four strength bars.
					VStack(spacing: 14 * u) {
						// Product audit (2026-09-05): the bars come from the user's picks and answers.
						ForEach(TasteModel.bars(profile.brandPicks, goal: profile.goal, risk: profile.risk)) { bar in
							VStack(spacing: 6 * u) {
								HStack {
									Text(bar.label)
										.font(StakFont.geist(12 * u))
										.frame(height: 16 * u)
										.foregroundStyle(StakColors.textPrimary)
									Spacer()
									Text(bar.strength)
										.font(StakFont.geist(10 * u, .medium))
										.frame(height: 16 * u)
										.foregroundStyle(bar.strengthColor)
								}
								GeometryReader { proxy in
									ZStack(alignment: .leading) {
										RoundedRectangle(cornerRadius: 2.5 * u).fill(Auth.dividerLine)
										RoundedRectangle(cornerRadius: 2.5 * u)
											.fill(Auth.linkTeal)
											.frame(width: proxy.size.width * bar.fraction)
									}
								}
								.frame(height: 5 * u)
							}
						}
					}
					.padding(16 * u)
					.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 16 * u))

					// Risk style chip.
					HStack(spacing: 10 * u) {
						VStack(alignment: .leading, spacing: 2 * u) {
							Text("Risk style")
								.font(StakFont.geist(11 * u))
								.foregroundStyle(StakColors.muted)
							Text(profile.riskStyle)
								.font(StakFont.geist(14 * u, .medium))
								.foregroundStyle(StakColors.textPrimary)
						}
						.frame(maxWidth: .infinity, alignment: .leading)
						Text("›")
							.font(StakFont.geist(15 * u, .medium))
							.foregroundStyle(Auth.linkTeal)
					}
					.padding(.leading, 16 * u)
					.padding(.trailing, 14 * u)
					.padding(.vertical, 13 * u)
					.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
					.contentShape(Rectangle())
					.onTapGesture { showRisk = true }
					.sheet(isPresented: $showRisk) { RiskStyleSheet(onDismiss: { showRisk = false }) }

					Text("Your deck adjusts as you swipe.")
						.font(StakFont.geist(11 * u))
						.foregroundStyle(Auth.faintText)
						.frame(maxWidth: .infinity)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.padding(.horizontal, 24 * u)
				.padding(.top, 14 * u)
			}

			VStack(spacing: 10 * u) {
				// Copy fix: 1:746 authors "Lets go!" -> "Let's go!" (exact-design audit 2026-09-04).
				AuthCta(text: "Let's go!", action: onLetsGo)
				AuthSecondaryButton(text: "Back", action: onBack)
			}
			.padding(.top, 8 * u)
			.padding(.bottom, 26 * u)
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}
