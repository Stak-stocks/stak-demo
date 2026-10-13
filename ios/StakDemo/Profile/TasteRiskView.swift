import SwiftUI

/// The taste chips' own surface (1:5739): rgba(26,35,51,0.55) with a 0.5 rgba(44,157,188,0.14) hairline.
private let chipBg = Color(argb: 0x8C1A2333)
private let chipBorder = Color(argb: 0x242C9DBC)
private let chipInk = Color(argb: 0xFF7FD4E8)

/// 08 · Profile — "Profile · Taste & risk" (Chinedu_Mobile 1:5732, 2026-10-07): the YOUR TASTE
/// card (chips, "Your taste graph sharpens with every swipe.", Retake the taste quiz), the RISK
/// STYLE and GOAL cards with their Change links and captions, and the closing note. Retake /
/// Change re-enter the onboarding quiz frames (QuizRetakeFlow brings 07 Taste reveal back here).
/// Mirrors android ui/profile/TasteRiskScreen.kt.
struct TasteRiskView: View {
	let onBack: () -> Void
	var onRetakeQuiz: () -> Void = {}
	var onChangeRisk: () -> Void = {}
	var onChangeGoal: () -> Void = {}
	/// Observed so a retaken quiz re-renders the chips and labels on return.
	@ObservedObject private var profile = UserProfile.shared

	var body: some View {
		let u = figmaUnit
		ProfilePageScaffold(title: "Taste & risk", onBack: onBack) {
			ProfileContent {
				SectionLabel(text: "YOUR TASTE")
				// Taste card (1:5735): 14 inset, 17 between the chips, the line and the row, 4 under the row.
				VStack(alignment: .leading, spacing: 17 * u) {
					FlowLayout(spacing: 8 * u) {
						ForEach(ProfileTaste.chips(), id: \.self) { label in
							Text(label)
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(chipInk)
								.lineLimit(1)
								.fixedSize(horizontal: true, vertical: false)
								.padding(.horizontal, 12 * u)
								.padding(.vertical, 6 * u)
								.background(chipBg, in: RoundedRectangle(cornerRadius: 14 * u))
								.overlay(RoundedRectangle(cornerRadius: 14 * u).strokeBorder(chipBorder, lineWidth: 0.5 * u))
						}
					}
					Text("Your taste graph sharpens with every swipe.")
						.font(StakFont.geist(12 * u))
						.stakLineHeight(16 * u, size: 12 * u, face: .geist)
						.foregroundStyle(Prof.body)
					ProfileRow(label: "Retake the taste quiz", horizontalPadding: 0, action: onRetakeQuiz)
				}
				.padding(.top, 14 * u)
				.padding(.horizontal, 14 * u)
				.padding(.bottom, 4 * u)
				.frame(maxWidth: .infinity, alignment: .leading)
				.background(Prof.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
				SectionLabel(text: "RISK STYLE")
				ProfileCard { ProfileRow(label: ProfileTaste.riskLabel(), value: "Change", valueColor: Prof.accent, action: onChangeRisk) }
				ProfileCaption(text: ProfileTaste.riskBlurb())
				SectionLabel(text: "GOAL")
				ProfileCard { ProfileRow(label: ProfileTaste.goalLabel(), value: "Change", valueColor: Prof.accent, action: onChangeGoal) }
				ProfileCaption(text: ProfileTaste.goalBlurb())
				ProfileCaption(text: "Changing your risk style or goal rebuilds tomorrow’s deck. Your saves and paper portfolio stay as they are.")
			}
		}
	}
}
