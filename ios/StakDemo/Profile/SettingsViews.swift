import SwiftUI
import UIKit

private let cardBg = Color(argb: 0xFF10182B)
private let muted = Color(argb: 0xFF819ABB)
private let bodyInk = Color(argb: 0xFFC8D2E0)
private let teal = Color(argb: 0xFF69B3CA)

/// The settings pages behind the Profile hub's rows (product audit, 2026-09-05:
/// the rows did nothing). No frames exist for them, so they borrow the hub's
/// language - its header, #10182B r16 cards, 48-tall rows, Geist 13 labels - and
/// the permissions step's toggle card. Mirrors android SettingsScreens.kt.
enum SettingsKind: String, Hashable {
	case notifications, appearance, linked, help
	/// App settings (FigJam Profile board, 2026-09-14): dark mode, biometric login, change password, delete account.
	case app, password
}

/// The hub's header (back circle + centred title) over a dark page.
struct SettingsScaffold<Content: View>: View {
	let title: String
	let onBack: () -> Void
	@ViewBuilder let content: () -> Content

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) {
			ZStack {
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
				}
				.padding(.leading, 20 * u)
				Text(title)
					.font(StakFont.sora(17 * u, .semiBold))
					.foregroundStyle(StakColors.textPrimary)
			}
			.padding(.top, 8 * u)
			.padding(.bottom, 16 * u)
			content()
		}
		.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
		.background(StakColors.bg.ignoresSafeArea())
	}
}

/// A hub-style row: label, optional value, chevron, tap.
struct SettingsLinkRow: View {
	let label: String
	var value: String? = nil
	/// Off for a value row with nothing to open behind it (product audit, 2026-09-05).
	var chevron: Bool = true
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			HStack {
				Text(label)
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				Spacer()
				if let value {
					Text(value)
						.font(StakFont.geist(12 * u))
						.foregroundStyle(muted)
						.padding(.trailing, 8 * u)
				}
				Text(chevron ? "›" : "")
					.font(StakFont.geist(14 * u))
					.foregroundStyle(muted)
			}
			.padding(.horizontal, 14 * u)
			.frame(maxWidth: .infinity)
			.frame(height: 48 * u)
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
	}
}

private struct Caption: View {
	let text: String
	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(12 * u))
			.foregroundStyle(muted)
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.horizontal, 4 * u)
	}
}

private struct SettingsPage<Content: View>: View {
	let title: String
	let onBack: () -> Void
	@ViewBuilder let content: () -> Content

	var body: some View {
		let u = figmaUnit
		SettingsScaffold(title: title, onBack: onBack) {
			ScrollView(showsIndicators: false) {
				VStack(spacing: 12 * u) { content() }
					.padding(.horizontal, 20 * u)
					.padding(.bottom, 26 * u)
			}
		}
	}
}

struct SettingsView: View {
	let kind: SettingsKind
	let onBack: () -> Void
	/// Pushes a sibling settings page (App settings -> Appearance / Change password).
	var onOpen: (SettingsKind) -> Void = { _ in }
	/// Leaves the signed-out app on Create account.
	var onAccountDeleted: () -> Void = {}

	var body: some View {
		switch kind {
		case .notifications: NotificationSettingsView(onBack: onBack)
		case .appearance: AppearanceView(onBack: onBack)
		case .linked: LinkedAccountsView(onBack: onBack)
		case .help: HelpSupportView(onBack: onBack)
		case .app: AppSettingsView(onBack: onBack, onOpen: onOpen, onAccountDeleted: onAccountDeleted)
		case .password: ChangePasswordView(onBack: onBack)
		}
	}
}

private struct NotificationSettingsView: View {
	let onBack: () -> Void
	@ObservedObject private var profile = UserProfile.shared

	var body: some View {
		let u = figmaUnit
		SettingsPage(title: "Notifications", onBack: onBack) {
			if !profile.notificationsOn {
				VStack(alignment: .leading, spacing: 8 * u) {
					Text("Notifications are off for STAK")
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
					Text("Turn them on in your phone’s settings to get price moves and your daily deck.")
						.font(StakFont.geist(13 * u))
						.foregroundStyle(bodyInk)
					Button {
						if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
					} label: {
						Text("Open phone settings ›")
							.font(StakFont.geist(13 * u, .medium))
							.foregroundStyle(teal)
					}
					.buttonStyle(.pressDim)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.padding(16 * u)
				.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			}
			PermissionCard(title: "Price moves on your picks", description: "A nudge when a saved or bought stock moves more than \(profile.priceThreshold)%.", isOn: binding(\.priceAlerts))
			// Price threshold (FigJam Profile board, 2026-09-14): how big a move earns the nudge.
			VStack(alignment: .leading, spacing: 10 * u) {
				Text("Price threshold")
					.font(StakFont.geist(14 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				Text("Only moves at least this big get a nudge.")
					.font(StakFont.geist(11 * u))
					.foregroundStyle(Auth.subtitleGray)
				HStack(spacing: 8 * u) {
					ForEach([1, 3, 5, 10], id: \.self) { pct in
						SettingsChip(label: "\(pct)%", selected: profile.priceThreshold == pct) { profile.priceThreshold = pct; Session.shared.saveProfile() }
					}
				}
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(16 * u)
			.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
			PermissionCard(title: "Daily deck", description: "One reminder when a fresh deck lands each morning.", isOn: binding(\.dailyDeck))
			PermissionCard(title: "Market news", description: "The stories behind the moves, a few times a week.", isOn: binding(\.marketNews))
			Caption(text: "You can change these any time.")
		}
	}

	private func binding(_ key: ReferenceWritableKeyPath<UserProfile, Bool>) -> Binding<Bool> {
		Binding(get: { profile[keyPath: key] }, set: { profile[keyPath: key] = $0; Session.shared.saveProfile() })
	}
}

private struct AppearanceView: View {
	let onBack: () -> Void
	@ObservedObject private var profile = UserProfile.shared

	var body: some View {
		let u = figmaUnit
		SettingsPage(title: "Appearance", onBack: onBack) {
			VStack(spacing: 0) {
				ForEach([("dark", "Dark"), ("system", "Match system")], id: \.0) { key, label in
					Button {
						profile.appearance = key
						Session.shared.saveProfile()
					} label: {
						HStack {
							Text(label)
								.font(StakFont.geist(13 * u, .medium))
								.foregroundStyle(StakColors.textPrimary)
							Spacer()
							if profile.appearance == key {
								Text("✓")
									.font(StakFont.geist(14 * u, .medium))
									.foregroundStyle(teal)
							}
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
			Caption(text: "STAK is designed for dark mode. Match system keeps it dark for now and follows your phone once a light theme ships.")
		}
	}
}

private struct LinkedAccountsView: View {
	let onBack: () -> Void
	@ObservedObject private var profile = UserProfile.shared

	var body: some View {
		let u = figmaUnit
		SettingsPage(title: "Linked accounts", onBack: onBack) {
			VStack(spacing: 0) {
				LinkedRow(name: "Google", linked: profile.linkedGoogle) { profile.linkedGoogle.toggle(); Session.shared.saveProfile() }
				LinkedRow(name: "Apple", linked: profile.linkedApple) { profile.linkedApple.toggle(); Session.shared.saveProfile() }
			}
			.padding(.vertical, 4 * u)
			.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			Caption(text: "A linked account lets you sign in with one tap. Your STAK stays the same either way.")
		}
	}
}

private struct LinkedRow: View {
	let name: String
	let linked: Bool
	let onToggle: () -> Void

	var body: some View {
		let u = figmaUnit
		HStack {
			Text(name)
				.font(StakFont.geist(13 * u, .medium))
				.foregroundStyle(StakColors.textPrimary)
			Spacer()
			Text(linked ? "Linked" : "Not linked")
				.font(StakFont.geist(12 * u))
				.foregroundStyle(linked ? teal : muted)
				.padding(.trailing, 12 * u)
			Button(action: onToggle) {
				Text(linked ? "Unlink" : "Link")
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(teal)
			}
			.buttonStyle(.pressDim)
		}
		.padding(.horizontal, 14 * u)
		.frame(height: 48 * u)
	}
}

private struct HelpSupportView: View {
	let onBack: () -> Void

	var body: some View {
		let u = figmaUnit
		let version = (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "1.0"
		SettingsPage(title: "Help & support", onBack: onBack) {
			VStack(spacing: 0) {
				FaqRow(question: "Is this real money?", answer: "No. Simulate runs on $10,000 of paper money so you can practise with zero risk. Nothing is bought or sold for real.")
				FaqRow(question: "Where do the prices come from?", answer: "STAK shows demo prices while the market feed is being wired up. Every number on screen is illustrative.")
				FaqRow(question: "Is my data private?", answer: "Your picks, saves and paper portfolio live on this phone. STAK never sells your data.")
				SettingsLinkRow(label: "Email support") {
					if let url = URL(string: "mailto:support@stak.app?subject=STAK%20support") { UIApplication.shared.open(url) }
				}
				// Contact / report and the legal links (FigJam Profile board, 2026-09-14).
				SettingsLinkRow(label: "Report a problem") {
					let body = "What happened:\n\nWhere in the app:\n\nApp version \(version)".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
					if let url = URL(string: "mailto:support@stak.app?subject=STAK%20problem%20report&body=\(body)") { UIApplication.shared.open(url) }
				}
				SettingsLinkRow(label: "Terms of service") { if let url = URL(string: termsURL) { UIApplication.shared.open(url) } }
				SettingsLinkRow(label: "Privacy policy") { if let url = URL(string: privacyURL) { UIApplication.shared.open(url) } }
				SettingsLinkRow(label: "Version", value: version, chevron: false) {}
			}
			.padding(.vertical, 4 * u)
			.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
		}
	}
}

private struct FaqRow: View {
	let question: String
	let answer: String
	@State private var open = false

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 0) {
			Button { withAnimation(.easeOut(duration: 0.2)) { open.toggle() } } label: {
				HStack {
					Text(question)
						.font(StakFont.geist(13 * u, .medium))
						.foregroundStyle(StakColors.textPrimary)
					Spacer()
					Text(open ? "⌃" : "⌄")
						.font(StakFont.geist(14 * u))
						.foregroundStyle(muted)
				}
				.padding(.horizontal, 14 * u)
				.frame(maxWidth: .infinity)
				.frame(height: 48 * u)
				.contentShape(Rectangle())
			}
			.buttonStyle(.pressDim)
			if open {
				Text(answer)
					.font(StakFont.geist(12 * u))
					.foregroundStyle(bodyInk)
					.padding(.horizontal, 14 * u)
					.padding(.bottom, 12 * u)
			}
		}
	}
}

/// The risk style picker behind the reveal's "Risk style ›" row (product audit,
/// 2026-09-05): the four 05 Risk answers, current one checked; a tap re-answers the
/// quiz and the reveal follows. Mirrors android RiskStyleSheet.
struct RiskStyleSheet: View {
	let onDismiss: () -> Void
	@ObservedObject private var profile = UserProfile.shared

	private let options: [(Int, String, String)] = [
		(TasteModel.riskBuyMore, "Buy more after checking why", "Comfortable with dips if the story holds"),
		(TasteModel.riskHold, "Hold and watch it closely", "I can handle short-term drops"),
		(TasteModel.riskStepAway, "Step away for now", "Big drops make me uncomfortable"),
		(TasteModel.riskSellSome, "Sell some, reduce risk", "I’d rather protect part of my money")
	]

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 8 * u) {
			Text("Risk style")
				.font(StakFont.sora(17 * u, .semiBold))
				.foregroundStyle(StakColors.textPrimary)
			Text("How you’d react to a 10% overnight drop. Change it any time.")
				.font(StakFont.geist(12 * u))
				.foregroundStyle(Auth.subtitleGray)
				.padding(.bottom, 6 * u)
			ForEach(options, id: \.0) { index, title, subtitle in
				let selected = profile.riskStyle == TasteModel.riskStyle(index) && (profile.risk == index || profile.risk < 0)
				Button {
					profile.risk = index
					profile.riskStyle = TasteModel.riskStyle(index)
					Session.shared.saveProfile()
					onDismiss()
				} label: {
					HStack {
						VStack(alignment: .leading, spacing: 2 * u) {
							Text(TasteModel.riskStyle(index) + " · " + title)
								.font(StakFont.geist(13 * u, .medium))
								.foregroundStyle(StakColors.textPrimary)
							Text(subtitle)
								.font(StakFont.geist(11 * u))
								.foregroundStyle(Auth.subtitleGray)
						}
						.frame(maxWidth: .infinity, alignment: .leading)
						if selected {
							Text("✓")
								.font(StakFont.geist(14 * u, .medium))
								.foregroundStyle(Auth.linkTeal)
						}
					}
					.padding(.horizontal, 14 * u)
					.padding(.vertical, 12 * u)
					.background(StakColors.bg, in: RoundedRectangle(cornerRadius: 12 * u))
					.overlay(RoundedRectangle(cornerRadius: 12 * u).strokeBorder(selected ? Color(argb: 0x8069B3CA) : Color(argb: 0x1AFFFFFF), lineWidth: 1 * u))
					.contentShape(Rectangle())
				}
				.buttonStyle(.pressDim)
			}
		}
		.padding(.horizontal, 20 * u)
		.padding(.top, 18 * u)
		.padding(.bottom, 30 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.background(Auth.inputBg.ignoresSafeArea())
		.presentationDetents([.medium, .large])
		.presentationDragIndicator(.hidden)
	}
}

/// Where the legal pages live - the landing site's routes.
private let termsURL = "https://stak.app/terms"
private let privacyURL = "https://stak.app/privacy"

/// A small selectable chip - the notification threshold, the portfolio setup's balances. Mirrors android SettingsChip.
struct SettingsChip: View {
	let label: String
	let selected: Bool
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(label)
				.font(StakFont.geist(12 * u, .medium))
				.foregroundStyle(selected ? teal : muted)
				.padding(.horizontal, 12 * u)
				.padding(.vertical, 6 * u)
				.background(selected ? Color(argb: 0x2639C5CB) : cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
				.overlay(RoundedRectangle(cornerRadius: 14 * u).strokeBorder(StakColors.accentBlue, lineWidth: selected ? 1 * u : 0))
		}
		.buttonStyle(.pressDim)
		// A radio-style choice for VoiceOver: "5%, selected" (review 2026-09-14).
		.accessibilityAddTraits(selected ? [.isSelected] : [])
	}
}

/// App settings (FigJam Profile board, 2026-09-14: Dark mode, Biometric login, Change
/// password, Delete / log out). Dark mode opens the Appearance page; Biometric login
/// is the 08 Permissions "Account security" switch, now changeable after onboarding;
/// Delete account wipes this account's state on the phone and signs out (Log out
/// stays on the hub). Mirrors android AppSettingsScreen.
private struct AppSettingsView: View {
	let onBack: () -> Void
	let onOpen: (SettingsKind) -> Void
	let onAccountDeleted: () -> Void
	@ObservedObject private var profile = UserProfile.shared
	@State private var confirmDelete = false

	var body: some View {
		let u = figmaUnit
		SettingsPage(title: "App settings", onBack: onBack) {
			VStack(spacing: 0) {
				SettingsLinkRow(label: "Dark mode", value: profile.appearance == "system" ? "Match system" : "On") { onOpen(.appearance) }
				SettingsLinkRow(label: "Change password") { onOpen(.password) }
			}
			.padding(.vertical, 4 * u)
			.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			PermissionCard(title: "Biometric login", description: "Unlock STAK with Face ID, Touch ID or your passcode whenever you come back.", isOn: Binding(get: { profile.accountLock }, set: { profile.accountLock = $0; Session.shared.saveProfile() }))
			VStack(spacing: 0) {
				SettingsLinkRow(label: "Delete account", chevron: !confirmDelete) { withAnimation(.easeOut(duration: 0.2)) { confirmDelete.toggle() } }
				if confirmDelete {
					VStack(alignment: .leading, spacing: 10 * u) {
						Text("This removes your saves, paper portfolio and settings from this phone and signs you out. It can\u{2019}t be undone.")
							.font(StakFont.geist(12 * u))
							.foregroundStyle(bodyInk)
						Button {
							Session.shared.deleteAccount()
							onAccountDeleted()
						} label: {
							Text("Delete my account")
								.font(StakFont.geist(13 * u, .medium))
								.foregroundStyle(Auth.errorRed)
								.frame(maxWidth: .infinity)
								.frame(height: 44 * u)
								.background(Color(argb: 0x33E5484D), in: RoundedRectangle(cornerRadius: 6 * u))
						}
						.buttonStyle(.pressDim)
					}
					.padding(.horizontal, 14 * u)
					.padding(.bottom, 14 * u)
				}
			}
			.padding(.vertical, 4 * u)
			.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			// Only the demo persona's state survives a log out - a created account signs back in as a new one (review 2026-09-14).
			Caption(text: Session.shared.demoAccount ? "Log out from the Profile page keeps your saves and paper portfolio for the next sign-in." : "Log out from the Profile page ends this account’s session; a new sign-up starts fresh.")
		}
	}
}

/// Change password (FigJam Profile board, 2026-09-14). The demo has no auth backend:
/// the new password must pass the sign-up rules and match its confirmation, then the
/// page flips into its "Password updated" state. Mirrors android ChangePasswordScreen.
private struct ChangePasswordView: View {
	let onBack: () -> Void
	@State private var current = ""
	@State private var next = ""
	@State private var confirm = ""
	@State private var show = false
	@State private var attempted = false
	@State private var updated = false
	private var currentError: String? { current.isEmpty ? "Enter your current password" : nil }
	private var nextError: String? { AuthRules.passwordError(next) ?? (next == current ? "Choose a password you haven\u{2019}t used" : nil) }
	private var confirmError: String? { AuthRules.confirmError(next, confirm) }

	var body: some View {
		let u = figmaUnit
		SettingsPage(title: "Change password", onBack: onBack) {
			if updated {
				VStack(alignment: .leading, spacing: 8 * u) {
					Text("Password updated")
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
					Text("Use it the next time you sign in. Sessions on other phones were signed out.")
						.font(StakFont.geist(13 * u))
						.foregroundStyle(bodyInk)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.padding(16 * u)
				.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
				AuthCta(text: "Done", action: onBack)
			} else {
				AuthInput("Current password", text: $current, hidden: !show) { ShowHideToggle(shown: $show) }
					.error(attempted ? currentError : nil)
				AuthInput("New password", text: $next, hidden: !show)
					.error(attempted ? nextError : nil)
				AuthInput("Confirm new password", text: $confirm, hidden: !show)
					.error(attempted ? confirmError : nil)
				Caption(text: "At least \(AuthRules.passwordMin) characters.")
				AuthCta(text: "Update password", enabled: !current.isEmpty && !next.isEmpty && !confirm.isEmpty, action: {
					attempted = true
					if currentError == nil && nextError == nil && confirmError == nil { updated = true }
				})
			}
		}
	}
}
