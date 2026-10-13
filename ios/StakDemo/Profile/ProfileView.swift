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

/// The invite line the share sheet carries (FigJam: Your profile -> Invite a friend) - also what Simulate's share
/// buttons send when there are no real numbers to share.
let inviteText = "Join me on STAK \u{2014} swipe stocks you actually understand and practice with paper money. https://thestak.org"

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
	@ObservedObject private var session = Session.shared
	@ObservedObject private var holdings = MyStakHoldings.shared

	/// App settings and Invite a friend join the authored four (FigJam Profile board, 2026-09-14); a real account's
	/// third row is how it signs in.
	private var settingsRows: [(String, SettingsKind?)] {
		[
			("Notifications", .notifications),
			("Appearance", .appearance),
			(session.demoAccount ? "Linked accounts" : "Sign-in", .linked),
			("App settings", .app),
			("Help & support", .help),
			("Invite a friend", nil),
		]
	}

	var body: some View {
		// Nothing once signed out - no demo "Hamza" flashing through the exit transition.
		if session.signedIn { hub } else { StakColors.bg.ignoresSafeArea() }
	}

	private var hub: some View {
		let u = figmaUnit
		let demo = session.demoAccount
		let joined = demo ? UserProfile.demoJoined : profile.joined
		return VStack(spacing: 0) {
			// Centered top bar — the back circle overlays the true-centered title.
			ZStack {
				Text("Profile")
					.font(StakFont.sora(16 * u, .semiBold))
					.foregroundStyle(StakColors.textPrimary)
					.accessibilityAddTraits(.isHeader)
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
				}
				.padding(.leading, 20 * u)
			}
			.frame(maxWidth: .infinity)
			.frame(height: 56 * u * typeScale)

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
									// The account's own name only - greetingName is "there" for a nameless account, which read "T"
									// (android shows no initial then).
									Text(profile.demoAccount ? String(profile.greetingName.prefix(1)) : String(profile.displayName.trimmingCharacters(in: .whitespaces).prefix(1)).uppercased())
										.font(StakFont.sora(22 * u, .semiBold))
										.foregroundStyle(Color(argb: 0xFF9EADC7))
								}
							}
							.frame(width: 64 * u, height: 64 * u)
							Text(profile.greetingName)
								.font(StakFont.sora(20 * u, .semiBold))
								.foregroundStyle(StakColors.textPrimary)
							Text(joined.isEmpty ? "Paper investor" : "Paper investor · joined \(joined)")
								.font(StakFont.geist(12 * u))
								.foregroundStyle(StakColors.muted)
							}
						}
						.padding(.horizontal, 12 * u)
						.clipShape(RoundedRectangle(cornerRadius: 12 * u))
						.buttonStyle(.pressDim)
						// VoiceOver keeps the name and joined line; the action is the hint (review 2026-09-07).
						.accessibilityLabel("\(profile.greetingName). \(joined.isEmpty ? "Paper investor" : "Paper investor, joined \(joined)")")
						.accessibilityHint("Edit profile")
						Button { onOpenSetting(.editProfile) } label: {
							Text("Edit profile")
								.font(StakFont.geist(12 * u, .medium))
								.stakLineHeight(16 * u, size: 12 * u, face: .geist)
								.foregroundStyle(chipInk)
						}
						.buttonStyle(.pressDim)
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
							// The onboarding picks plus the stocks saved since that belong to a taste, so the chips follow
							// what the user keeps from the deck.
							let saved = holdings.tickers.compactMap { holdings.nameOf($0) }.filter(TasteModel.isTasteBrand)
							let chips: [TasteChip] = demo ? tasteChips : TasteModel.chips(profile.brandPicks.union(saved), goal: profile.goal, risk: profile.risk).map { TasteChip(label: $0, width: 0) }
							ForEach(chips, id: \.label) { chip in
								Text(chip.label)
									.font(StakFont.geist(12 * u, .medium))
									.foregroundStyle(chipInk)
									.lineLimit(1)
									.fixedSize(horizontal: true, vertical: false)
									.frame(width: chip.width > 0 ? chip.width * u * typeScale : nil, height: 28 * u * typeScale)
									.padding(.horizontal, chip.width > 0 ? 0 : 12 * u)
									.background(chipBg, in: RoundedRectangle(cornerRadius: 14 * u))
									.overlay(
										RoundedRectangle(cornerRadius: 14 * u)
											.strokeBorder(chipBorder, lineWidth: 1 * u)
									)
							}
						}
						Text(demo ? "Your taste graph sharpens with every swipe." : "Your taste updates as you save stocks.")
							.font(StakFont.geist(12 * u))
							.stakLineHeight(16 * u, size: 12 * u, face: .geist)
							.foregroundStyle(bodyInk)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(14 * u)
					.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))

					// Paper stats card.
					VStack(alignment: .leading, spacing: 10 * u) {
						// Loading, or not set up yet: no portfolio to show (web's profile does the same).
						let ready = portfolio.demo || (!portfolio.loading && !portfolio.needsSetup)
						HStack {
							// Live from the shared paper portfolio (product audit, 2026-09-05).
							ProfileStat(value: ready ? PaperPortfolio.wholeDollars(portfolio.portfolioValue) : "—", label: "Portfolio")
							Spacer()
							ProfileStat(value: ready ? PaperPortfolio.money(portfolio.cash) : "—", label: "Cash")
							Spacer()
							ProfileStat(value: ready ? String(portfolio.pickCountLabel) : "—", label: "Picks")
						}
						.frame(maxWidth: .infinity)
						// Stat columns sit at the top of the 40u row (171:1013 items-start), not centred - exact-design audit 2026-09-04.
						.frame(height: 40 * u * typeScale, alignment: .top)
						if ready {
							// The % with the dollars: starts range from $500 to $10,000, and only a % compares across them.
							let pct = portfolio.paperStart > 0 ? portfolio.allTimeGain / portfolio.paperStart * 100 : 0
							Text("\(portfolio.allTimeGain > -0.005 ? "▲" : "▼") \(PaperPortfolio.signedMoney(portfolio.allTimeGain)) (\(PaperPortfolio.signedPct(pct))) all time on \(PaperPortfolio.wholeDollars(portfolio.paperStart)) paper")
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(portfolio.allTimeGain > -0.005 ? StakColors.positive : Color(argb: 0xFFE5484D))
						} else {
							Text("Set up your practice portfolio in Simulate to start.")
								.font(StakFont.geist(12 * u))
								.foregroundStyle(StakColors.muted)
						}
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(14 * u)
					.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))

					// Settings card.
					VStack(spacing: 0) {
						ForEach(settingsRows, id: \.0) { label, kind in
							Button {
								if let kind { onOpenSetting(kind) } else { share(inviteText) }
							} label: {
								HStack {
									Text(label)
										.font(StakFont.geist(13 * u, .medium))
										.foregroundStyle(StakColors.textPrimary)
									Spacer()
									Text("›")
										.font(StakFont.geist(14 * u))
										.foregroundStyle(StakColors.muted)
										.accessibilityHidden(true)
								}
								.padding(.horizontal, 14 * u)
								.frame(maxWidth: .infinity)
								.frame(height: 48 * u * typeScale)
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
							.frame(height: 52 * u * typeScale)
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
		// The joined month, sign-in email and taste answers as the server has them.
		.task { ProfileSync.shared.sync() }
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

