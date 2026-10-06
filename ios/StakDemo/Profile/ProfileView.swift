import SwiftUI
import UIKit

// Palette of the Profile hub. Card surfaces here are #10182B — deliberately
// not the #181F30 onboarding card color. Mirrors android/ ProfileScreen.kt.
private let cardBg = Color(argb: 0xFF10182B)
private let bodyInk = Color(argb: 0xFFC8D2E0)
private let brightInk = Color(argb: 0xFFF2F6FC)
private let chipBg = Color(argb: 0xFF1A2333)
private let chipBorder = Color(argb: 0xFF2C9DBC)
private let chipInk = Color(argb: 0xFF7FD4E8)

private struct TasteChip {
	let label: String
	/// Authored chip width in artboard units (171:1004).
	let width: CGFloat
}

// Authored chip widths (171:1004): 97 / 94 / 125 — pinned so the
// row fills the 332 content width and the labels never wrap.
private let tasteChips = [
	TasteChip(label: "Tech Curious", width: 97),
	TasteChip(label: "High Growth", width: 94),
	TasteChip(label: "Consumer Brands", width: 125)
]

// App settings and Invite a friend join the authored four (FigJam Profile board, 2026-09-14).
private let settingsRows = ["Notifications", "Appearance", "Linked accounts", "App settings", "Help & support", "Invite a friend"]
private let inviteRow = "Invite a friend"
/// The invite line the share sheet carries (FigJam: Your profile -> Invite a friend).
private let inviteText = "Join me on STAK \u{2014} swipe stocks you actually understand and practise with paper money. https://stak.app"

/// 05 · Profile — "Profile · hub" (CHINEDU 171:995), reached from the
/// Home nav circle (prototype: Push Right 300ms). Avatar block, the
/// YOUR TASTE chips, the paper stats card, the settings list and the
/// Log out hairline button.
/// Every metric is scaled by the 390pt artboard unit (`figmaUnit`),
/// exactly like the Android build's `u` scaling.
/// Ports android/ ui/profile/ProfileScreen.kt.
struct ProfileView: View {
	/// Observed (like HomeView's TopNav) so a photo picked / name typed in
	/// 09 Profile setup re-renders the avatar block.
	@ObservedObject private var profile = UserProfile.shared
	let onBack: () -> Void
	var onLogOut: () -> Void = {}
	/// The rows open their settings pages (product audit, 2026-09-05).
	var onOpenSetting: (SettingsKind) -> Void = { _ in }
	/// The avatar and the name open the edit page (user, 2026-09-07).
	var onEditProfile: () -> Void = {}
	/// The paper stats card reads the live ledger (product audit, 2026-09-05).
	@ObservedObject private var portfolio = PaperPortfolio.shared

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) {
			// Centered top bar — the back circle overlays the true-centered title.
			ZStack {
				Text("Profile")
					.font(StakFont.sora(16 * u, .semiBold))
					.foregroundStyle(StakColors.textPrimary)
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
				}
				.padding(.leading, 20 * u)
			}
			.frame(maxWidth: .infinity)
			.frame(height: 56 * u)

			ScrollView {
				VStack(spacing: 16 * u) {
					// Avatar block. The avatar and the name open the edit page - 09 Profile
					// setup's own promise, "You can change this anytime in Profile."
					// (user, 2026-09-07: a photo of their choice, editable after sign-up).
					VStack(spacing: 8 * u) {
						Button(action: onEditProfile) {
							VStack(spacing: 8 * u) {
							ZStack {
								Circle().fill(Color(argb: 0xFF242B3D))
								// The picked photo when one exists; else the live initial of
								// the display name - "H" for the demo persona Hamza, so the
								// authored 171:995 frame is unchanged (Codex parity audit
								// 2026-09-04; mirrors android ProfileScreen.kt).
								if let data = profile.photoData, let photo = UIImage(data: data) {
									Image(uiImage: photo)
										.resizable()
										.scaledToFill()
										.frame(width: 64 * u, height: 64 * u)
										.clipShape(Circle())
								} else {
									Text(profile.greetingName.prefix(1).uppercased())
										.font(StakFont.sora(22 * u, .semiBold))
										.foregroundStyle(Color(argb: 0xFF9EADC7))
								}
							}
							.frame(width: 64 * u, height: 64 * u)
							Text(profile.greetingName)
								.font(StakFont.sora(20 * u, .semiBold))
								.foregroundStyle(StakColors.textPrimary)
							Text("Paper investor · joined \(profile.joined)")
								.font(StakFont.geist(12 * u))
								.foregroundStyle(StakColors.muted)
							}
						}
						.buttonStyle(.pressDim)
						// VoiceOver keeps the name; the action is the hint (review 2026-09-07).
						.accessibilityLabel(profile.greetingName)
						.accessibilityHint("Edit profile")
					}

					// YOUR TASTE card.
					VStack(alignment: .leading, spacing: 10 * u) {
						Text("YOUR TASTE")
							.font(StakFont.geist(11 * u, .medium))
							.foregroundStyle(StakColors.muted)
						// A new account's chips hug their labels and may not fit one row - they wrap.
						FlowLayout(spacing: 8 * u) {
							// The demo account keeps the authored chips at their pinned widths; a new
							// account's chips come from its onboarding answers and hug their labels
							// (product audit, 2026-09-05).
							let chips: [TasteChip] = Session.shared.demoAccount ? tasteChips : TasteModel.chips(profile.brandPicks, goal: profile.goal, risk: profile.risk).map { TasteChip(label: $0, width: 0) }
							ForEach(chips, id: \.label) { chip in
								Text(chip.label)
									.font(StakFont.geist(12 * u, .medium))
									.foregroundStyle(chipInk)
									.lineLimit(1)
									.fixedSize(horizontal: true, vertical: false)
									.frame(width: chip.width > 0 ? chip.width * u : nil, height: 28 * u)
									.padding(.horizontal, chip.width > 0 ? 0 : 12 * u)
									.background(chipBg, in: RoundedRectangle(cornerRadius: 14 * u))
									.overlay(
										RoundedRectangle(cornerRadius: 14 * u)
											.strokeBorder(chipBorder, lineWidth: 1 * u)
									)
							}
						}
						Text("Your taste graph sharpens with every swipe.")
							.font(StakFont.geist(12 * u))
							.stakLineHeight(16 * u, size: 12 * u, face: .geist)
							.foregroundStyle(bodyInk)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(14 * u)
					.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))

					// Paper stats card.
					VStack(alignment: .leading, spacing: 10 * u) {
						HStack {
							// Live from the shared paper portfolio (product audit, 2026-09-05).
							ProfileStat(value: PaperPortfolio.wholeDollars(portfolio.portfolioValue), label: "Portfolio")
							Spacer()
							ProfileStat(value: PaperPortfolio.money(portfolio.cash), label: "Cash")
							Spacer()
							ProfileStat(value: String(portfolio.pickCountLabel), label: "Picks")
						}
						.frame(maxWidth: .infinity)
						// Stat columns sit at the top of the 40u row (171:1013 items-start), not centred - exact-design audit 2026-09-04.
						.frame(height: 40 * u, alignment: .top)
						Text("\(portfolio.allTimeGain >= 0 ? "▲" : "▼") \(PaperPortfolio.signedMoney(portfolio.allTimeGain)) all time on \(PaperPortfolio.wholeDollars(portfolio.paperStart)) paper")
							.font(StakFont.geist(12 * u, .medium))
							.foregroundStyle(portfolio.allTimeGain >= 0 ? StakColors.positive : Color(argb: 0xFFE5484D))
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(14 * u)
					.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))

					// Settings card.
					VStack(spacing: 0) {
						ForEach(settingsRows, id: \.self) { label in
							Button {
								if label == inviteRow { share(inviteText) } else { onOpenSetting(SettingsKind(row: label)) }
							} label: {
								HStack {
									Text(label)
										.font(StakFont.geist(13 * u, .medium))
										.foregroundStyle(StakColors.textPrimary)
									Spacer()
									Text("›")
										.font(StakFont.geist(14 * u))
										.foregroundStyle(StakColors.muted)
								}
								.padding(.horizontal, 14 * u)
								.frame(maxWidth: .infinity)
								.frame(height: 48 * u)
								.contentShape(Rectangle())
							}
							.buttonStyle(.pressDim)
						}
					}
					.padding(.vertical, 4 * u)
					.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))

					// Log out — hairline r6 button, same 0.36u rgba(52,59,79,0.33)
					// stroke as AuthSecondaryButton (which brings its own 20pt
					// h-padding, so it is rebuilt inline here).
					Button {
						onLogOut()
					} label: {
						Text("Log out")
							.font(StakFont.sora(14 * u))
							.foregroundStyle(StakColors.muted)
							.frame(maxWidth: .infinity)
							.frame(height: 52 * u)
							.overlay(
								RoundedRectangle(cornerRadius: 6 * u)
									.strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u)
							)
							.contentShape(Rectangle())
					}
					.buttonStyle(.pressDim)
					// 171:1037 authors the auth CTAs' teal drop-shadow stack, but the button
					// has NO fill and Figma casts shadows from the rendered alpha - the 0.36
					// hairline at 33% renders nothing (the 2x export is pure #0A1020 under the
					// button). No glow (mirrors Android, 2026-09-05).
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, 16 * u)
				.padding(.bottom, 40 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}

/// The system share sheet over the key window (the hub is not inside a NavigationStack, so ShareLink has no host bar).
private func share(_ text: String) {
	let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
	guard let root = scene?.keyWindow?.rootViewController else { return }
	var top = root
	while let presented = top.presentedViewController { top = presented }
	let sheet = UIActivityViewController(activityItems: [text], applicationActivities: nil)
	sheet.popoverPresentationController?.sourceView = top.view
	top.present(sheet, animated: true)
}

/// One stat column — Sora SemiBold 16 value over a Geist 11 muted label.
private struct ProfileStat: View {
	let value: String
	let label: String

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 4 * u) {
			Text(value)
				.font(StakFont.sora(16 * u, .semiBold))
				.foregroundStyle(brightInk)
			Text(label)
				.font(StakFont.geist(11 * u))
				.foregroundStyle(StakColors.muted)
		}
	}
}

extension SettingsKind {
	/// The Profile hub's row label -> its page.
	init(row: String) {
		switch row {
		case "Notifications": self = .notifications
		case "Appearance": self = .appearance
		case "Linked accounts": self = .linked
		case "App settings": self = .app
		default: self = .help
		}
	}
}
