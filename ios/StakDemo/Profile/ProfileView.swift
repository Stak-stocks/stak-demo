import SwiftUI
import UIKit

/// 08 · Profile — "Profile · hub" (Chinedu_Mobile 1:5665, 2026-10-07; replaces the CHINEDU
/// 171:995 hub). Fixed top bar (back circle, "Profile", the Edit link), the 72 avatar with its
/// teal ring and the name, YOUR STAK (Taste & risk profile / Paper portfolio / Leaderboard rank),
/// ACCOUNT (Notifications / Contact support / Terms of service / Privacy policy), the Log out
/// hairline and the red Delete account line. Mirrors android ui/profile/ProfileScreen.kt.
struct ProfileView: View {
	/// Observed so a photo picked / name typed on the edit page re-renders the avatar block.
	@ObservedObject private var profile = UserProfile.shared
	@ObservedObject private var portfolio = PaperPortfolio.shared
	let onBack: () -> Void
	var onLogOut: () -> Void = {}
	/// ACCOUNT rows: Notifications -> .notifications, Contact support -> .help (product audit, 2026-09-05).
	var onOpenSetting: (SettingsKind) -> Void = { _ in }
	var onEditProfile: () -> Void = {}
	var onOpenTasteRisk: () -> Void = {}
	var onOpenPortfolio: () -> Void = {}
	var onOpenLeaderboard: () -> Void = {}
	/// Delete account confirmed: the session is gone (Session.deleteAccount ran).
	var onAccountDeleted: () -> Void = {}
	@State private var confirmDelete = false

	var body: some View {
		let u = figmaUnit
		ProfilePageScaffold(title: "Profile", onBack: onBack, trailing: {
			Button(action: onEditProfile) {
				Text("Edit")
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(Prof.accent)
			}
			.buttonStyle(.pressDim)
		}) {
			ProfileContent(alignment: .center) {
				// Avatar block (1:5667): the 72 circle with its 2 teal ring, 16 under it the name.
				VStack(spacing: 16 * u) {
					ZStack {
						Circle().fill(Prof.avatarBg)
						if let data = profile.photoData, let photo = UIImage(data: data) {
							Image(uiImage: photo)
								.resizable()
								.scaledToFill()
								.frame(width: 72 * u, height: 72 * u)
								.clipShape(Circle())
						} else {
							Text(profile.greetingName.prefix(1).uppercased())
								.font(StakFont.sora(24.75 * u, .semiBold))
								.foregroundStyle(Prof.avatarInk)
						}
						Circle().strokeBorder(Prof.accent, lineWidth: 2 * u)
					}
					.frame(width: 72 * u, height: 72 * u)
					Text(profile.greetingName)
						.font(StakFont.sora(20 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
				}
				SectionLabel(text: "YOUR STAK")
				ProfileCard {
					ProfileRow(label: "Taste & risk profile", value: ProfileTaste.summary(), action: onOpenTasteRisk)
					// Live from the shared paper portfolio (product audit, 2026-09-05).
					ProfileRow(label: "Paper portfolio", value: PaperPortfolio.wholeDollars(portfolio.portfolioValue), action: onOpenPortfolio)
					ProfileRow(label: "Leaderboard rank", value: portfolio.rank.map { "#\($0) this week" } ?? "Unranked", action: onOpenLeaderboard)
				}
				SectionLabel(text: "ACCOUNT")
				ProfileCard {
					ProfileRow(label: "Notifications", icon: "IcProfBell") { onOpenSetting(.notifications) }
					ProfileRow(label: "Contact support", icon: "IcProfSupport") { onOpenSetting(.help) }
					ProfileRow(label: "Terms of service", icon: "IcProfTerms") { if let url = URL(string: termsURL) { UIApplication.shared.open(url) } }
					ProfileRow(label: "Privacy policy", icon: "IcProfPrivacy") { if let url = URL(string: privacyURL) { UIApplication.shared.open(url) } }
				}
				// Log out (1:5708): the hairline button. Its authored teal drop-shadow stack casts from a
				// fill-less shape, so Figma renders nothing under it - no glow (verified 2026-09-05).
				Button(action: onLogOut) {
					Text("Log out")
						.font(StakFont.sora(14 * u))
						.foregroundStyle(Prof.muted)
						.frame(maxWidth: .infinity)
						.frame(height: 52 * u)
						.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Prof.hairline, lineWidth: 0.36 * u))
						.contentShape(Rectangle())
				}
				.buttonStyle(.pressDim)
				// Delete account (1:5710): Geist Medium 13 red at 85%; a tap unfolds the confirmation the
				// FigJam App settings page carried (2026-09-14) - the wipe itself is unchanged.
				Button { withAnimation(.easeOut(duration: 0.2)) { confirmDelete.toggle() } } label: {
					Text("Delete account")
						.font(StakFont.geist(13 * u, .medium))
						.foregroundStyle(Prof.red)
						.opacity(0.85)
						.frame(maxWidth: .infinity)
						.contentShape(Rectangle())
				}
				.buttonStyle(.pressDim)
				if confirmDelete {
					VStack(alignment: .leading, spacing: 10 * u) {
						Text("This removes your saves, paper portfolio and settings from this phone and signs you out. It can\u{2019}t be undone.")
							.font(StakFont.geist(12 * u))
							.stakLineHeight(17 * u, size: 12 * u, face: .geist)
							.foregroundStyle(Prof.body)
						Button {
							Session.shared.deleteAccount()
							onAccountDeleted()
						} label: {
							Text("Delete my account")
								.font(StakFont.geist(13 * u, .medium))
								.foregroundStyle(Prof.red)
								.frame(maxWidth: .infinity)
								.frame(height: 44 * u)
								.background(Color(argb: 0x33E5484D), in: RoundedRectangle(cornerRadius: 6 * u))
						}
						.buttonStyle(.pressDim)
					}
					.padding(14 * u)
					.frame(maxWidth: .infinity, alignment: .leading)
					.background(Prof.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
					.transition(.opacity)
				}
			}
		}
	}
}
