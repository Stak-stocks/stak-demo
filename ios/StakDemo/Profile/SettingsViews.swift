import PhotosUI
import SwiftUI
import UIKit
import UserNotifications

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
	/// The hub's "Edit profile" link: photo and display name.
	case editProfile
}

/// The hub's header (back circle + centered title) over a dark page.
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
					.stakLineHeight(22 * u, size: 17 * u, face: .sora)
					.foregroundStyle(StakColors.textPrimary)
					.accessibilityAddTraits(.isHeader)
			}
			.padding(.top, 8 * u)
			.padding(.bottom, 16 * u)
			content()
		}
		.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
		.background(StakColors.bg.ignoresSafeArea())
	}
}

/// A hub-style row: label, optional value, chevron, tap. With no `action` it only shows a value and doesn't react.
struct SettingsLinkRow: View {
	let label: String
	var value: String? = nil
	/// Off for a value row with nothing to open behind it (product audit, 2026-09-05).
	var chevron: Bool = true
	let action: (() -> Void)?

	var body: some View {
		if let action {
			Button(action: action) { row }
				.buttonStyle(.pressDim)
		} else {
			row.accessibilityElement(children: .combine)
		}
	}

	private var row: some View {
		let u = figmaUnit
		return HStack(spacing: 0) {
			Text(label)
				.font(StakFont.geist(13 * u, .medium))
				.foregroundStyle(StakColors.textPrimary)
				.lineLimit(1)
			// The value takes the rest of the row, right-aligned; a long one ends in an ellipsis.
			Text(value ?? "")
				.font(StakFont.geist(12 * u))
				.foregroundStyle(muted)
				.lineLimit(1)
				.truncationMode(.tail)
				.frame(maxWidth: .infinity, alignment: .trailing)
				.padding(.leading, 12 * u)
				.padding(.trailing, 8 * u)
			if chevron {
				Text("›")
					.font(StakFont.geist(14 * u))
					.foregroundStyle(muted)
					.accessibilityHidden(true)
			}
		}
		.padding(.horizontal, 14 * u)
		.frame(maxWidth: .infinity)
		.frame(minHeight: 48 * u * typeScale)
		.contentShape(Rectangle())
	}
}

private struct Caption: View {
	let text: String
	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(12 * u))
			.stakLineHeight(16 * u, size: 12 * u, face: .geist)
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
		case .editProfile: EditProfileView(onBack: onBack)
		}
	}
}

private struct NotificationSettingsView: View {
	let onBack: () -> Void
	@ObservedObject private var profile = UserProfile.shared
	/// The phone's own switch for STAK, read live - turned off in Settings after onboarding, the warning shows.
	@State private var osAllowed = true
	@Environment(\.scenePhase) private var scenePhase

	var body: some View {
		let u = figmaUnit
		SettingsPage(title: "Notifications", onBack: onBack) {
			if !osAllowed {
				VStack(alignment: .leading, spacing: 8 * u) {
					Text("Notifications are off for STAK")
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
					Text("Turn them on in your phone’s settings to get price moves and your daily deck.")
						.font(StakFont.geist(13 * u))
						.stakLineHeight(19 * u, size: 13 * u, face: .geist)
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
			PermissionCard(title: "Price moves on your picks", description: "A nudge when a saved stock moves \(profile.priceThreshold)% or more.", isOn: binding(\.priceAlerts))
			// Price threshold (FigJam Profile board, 2026-09-14): how big a move earns the nudge.
			VStack(alignment: .leading, spacing: 10 * u) {
				Text("Price threshold")
					.font(StakFont.geist(14 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				Text("Only moves at least this big get a nudge.")
					.font(StakFont.geist(11 * u))
					.foregroundStyle(Auth.subtitleGray)
				HStack(spacing: 8 * u) {
					ForEach(UserProfile.priceThresholds, id: \.self) { pct in
						SettingsChip(label: "\(pct)%", selected: profile.priceThreshold == pct) { profile.priceThreshold = pct; Session.shared.saveProfile(); PushRegistration.sync() }
					}
				}
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(16 * u)
			.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
			PermissionCard(title: "Daily deck", description: "One reminder when a fresh deck lands each morning.", isOn: binding(\.dailyDeck))
			PermissionCard(title: "Market news", description: "The stories behind the moves, a few times a week.", isOn: Binding(get: { profile.marketNews }, set: { profile.marketNews = $0; Session.shared.saveProfile() }))
			Caption(text: "You can change these any time.")
		}
		// Coming back from the phone's Settings re-reads it.
		.task(id: scenePhase == .active) { await readOSPermission() }
	}

	private func readOSPermission() async {
		let settings = await UNUserNotificationCenter.current().notificationSettings()
		osAllowed = settings.authorizationStatus != .denied
	}

	/// A switch turned on means notifications are wanted again: "Not now" in onboarding (or on a new phone, never
	/// asked) left them off for good while these switches read on. The phone is asked when it never has been.
	private func binding(_ key: ReferenceWritableKeyPath<UserProfile, Bool>) -> Binding<Bool> {
		Binding(get: { profile[keyPath: key] }, set: { on in
			profile[keyPath: key] = on
			if on { profile.notificationsOn = true }
			Session.shared.saveProfile()
			PushRegistration.sync()
			guard on else { return }
			Task {
				let center = UNUserNotificationCenter.current()
				if await center.notificationSettings().authorizationStatus == .notDetermined,
				   (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) == true {
					UIApplication.shared.registerForRemoteNotifications()
				}
				await readOSPermission()
			}
		})
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
									.accessibilityHidden(true)
							}
						}
						.padding(.horizontal, 14 * u)
						.frame(maxWidth: .infinity)
						.frame(height: 48 * u * typeScale)
						.contentShape(Rectangle())
					}
					.buttonStyle(.pressDim)
					.accessibilityAddTraits(profile.appearance == key ? [.isSelected] : [])
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
		let demo = Session.shared.demoAccount
		SettingsPage(title: demo ? "Linked accounts" : "Sign-in", onBack: onBack) {
			VStack(spacing: 0) {
				if demo {
					LinkedRow(name: "Google", linked: profile.linkedGoogle) { profile.linkedGoogle.toggle(); Session.shared.saveProfile() }
					LinkedRow(name: "Apple", linked: profile.linkedApple) { profile.linkedApple.toggle(); Session.shared.saveProfile() }
				} else {
					// Linking a second method isn't built, so there are no switches that would only pretend to.
					SettingsLinkRow(label: "Signed in with", value: profile.linkedGoogle ? "Google" : profile.linkedApple ? "Apple" : "Email and password", chevron: false, action: nil)
					if !profile.email.isEmpty {
						SettingsLinkRow(label: "Email", value: profile.email, chevron: false, action: nil)
					}
				}
			}
			.padding(.vertical, 4 * u)
			.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			Caption(text: demo
				? "A linked account lets you sign in with one tap. Your STAK stays the same either way."
				: "Sign in the same way next time, on this phone or a new one. Your saved stocks and taste come with you.")
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
					.frame(minHeight: 44)
					.contentShape(Rectangle())
			}
			.buttonStyle(.pressDim)
			.accessibilityLabel("\(linked ? "Unlink" : "Link") \(name)")
		}
		.padding(.horizontal, 14 * u)
		.frame(height: 48 * u * typeScale)
	}
}

private struct HelpSupportView: View {
	let onBack: () -> Void
	/// The document open in the sheet, or nil.
	@State private var reading: LegalDocKind? = nil

	var body: some View {
		let u = figmaUnit
		let version = (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "1.0"
		SettingsPage(title: "Help & support", onBack: onBack) {
			VStack(spacing: 0) {
				FaqRow(question: "Is this real money?", answer: "No. In Simulate you practice with pretend money, starting with what you’d really invest. Nothing is bought or sold for real.")
				if Session.shared.demoAccount {
					FaqRow(question: "Where do the prices come from?", answer: "The demo account shows sample prices so you can look around. Create an account to see live market prices.")
					FaqRow(question: "Is my data private?", answer: "STAK never sells your data.")
				} else {
					FaqRow(question: "Where do the prices come from?", answer: "Real prices from the US stock market. They update on their own while the market is open (9:30am to 4pm ET, weekdays). When it's closed, you see the last closing price.")
					FaqRow(question: "Is my data private?", answer: "Your saved stocks, taste answers and paper portfolio are stored with your STAK account, so they follow you to a new phone. STAK never sells your data.")
				}
				SettingsLinkRow(label: "Email support") {
					if let url = URL(string: "mailto:support@thestak.org?subject=STAK%20support") { UIApplication.shared.open(url) }
				}
				// Contact / report and the legal links (FigJam Profile board, 2026-09-14).
				SettingsLinkRow(label: "Report a problem") {
					let body = "What happened:\n\nWhere in the app:\n\nApp version \(version)".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
					if let url = URL(string: "mailto:support@thestak.org?subject=STAK%20problem%20report&body=\(body)") { UIApplication.shared.open(url) }
				}
				// In the app's own sheet, not the browser (the web shows the same text at /terms and /privacy).
				SettingsLinkRow(label: "Terms of service") { reading = .terms }
				SettingsLinkRow(label: "Privacy policy") { reading = .privacy }
				SettingsLinkRow(label: "Version", value: version, chevron: false, action: nil)
			}
			.padding(.vertical, 4 * u)
			.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
		}
		.sheet(item: $reading) { kind in LegalSheetView(kind: kind) }
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
						.accessibilityHidden(true)
				}
				.padding(.horizontal, 14 * u)
				.frame(maxWidth: .infinity)
				.frame(height: 48 * u * typeScale)
				.contentShape(Rectangle())
			}
			.buttonStyle(.pressDim)
			.accessibilityValue(open ? "Expanded" : "Collapsed")
			if open {
				Text(answer)
					.font(StakFont.geist(12 * u))
					.stakLineHeight(17 * u, size: 12 * u, face: .geist)
					.foregroundStyle(bodyInk)
					.frame(maxWidth: .infinity, alignment: .leading)
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
				// Only an answer actually given is ticked: riskStyle defaults to "Growth-Oriented" answered or not, so
				// matching on it ticked that row for everyone who skipped (android RiskStyleSheet).
				let selected = profile.risk == index
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
	@StateObject private var authVM = AuthViewModel()
	@State private var confirmDelete = false
	@State private var deleting = false
	@State private var deleteError: String? = nil
	/// Typed, so a stray tap can't delete an account.
	@State private var typedDelete = ""
	private var deleteConfirmed: Bool { typedDelete.trimmingCharacters(in: .whitespaces).uppercased() == "DELETE" }

	/// The demo persona has nothing on the server to delete; a real account is wiped from the phone and signed out
	/// only once the server confirms - a failed request leaves it exactly as it was.
	private func runDelete() {
		guard deleteConfirmed, !deleting else { return }
		if Session.shared.demoAccount {
			Session.shared.deleteAccount()
			onAccountDeleted()
			return
		}
		deleting = true
		deleteError = nil
		Task {
			let error = await authVM.deleteAccount()
			deleting = false
			if let error {
				deleteError = error
				return
			}
			// Drops the SDK's live session for the deleted account, so nothing signed into right after inherits it.
			await authVM.clearSession()
			Session.shared.deleteAccount()
			onAccountDeleted()
		}
	}

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
				SettingsLinkRow(label: "Delete account", chevron: !confirmDelete) {
					withAnimation(.easeOut(duration: 0.2)) { confirmDelete.toggle() }
					typedDelete = ""
				}
				if confirmDelete {
					VStack(alignment: .leading, spacing: 10 * u) {
						Text("This deletes your STAK account - your saves, paper portfolio and settings - and signs you out. It can\u{2019}t be undone.")
							.font(StakFont.geist(12 * u))
							.stakLineHeight(17 * u, size: 12 * u, face: .geist)
							.foregroundStyle(bodyInk)
						Text("Type DELETE to confirm")
							.font(StakFont.geist(12 * u, .medium))
							.foregroundStyle(bodyInk)
						TextField("", text: $typedDelete)
							.font(StakFont.geist(14 * u, .medium))
							.foregroundStyle(StakColors.textPrimary)
							.tint(StakColors.accent)
							.textInputAutocapitalization(.characters)
							.autocorrectionDisabled()
							.submitLabel(.done)
							.onSubmit(runDelete)
							.onChange(of: typedDelete) { _, new in if new.count > 12 { typedDelete = String(new.prefix(12)) } }
							.padding(.horizontal, 12 * u)
							.padding(.vertical, 13 * u)
							.background(StakColors.surfaceAlt, in: RoundedRectangle(cornerRadius: 6 * u))
							.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(StakColors.cardBorder, lineWidth: 1 * u))
							.accessibilityLabel("Type DELETE to confirm")
						Text(deleteConfirmed ? "Delete my account is ready." : "The button unlocks once DELETE is typed.")
							.font(StakFont.geist(11 * u))
							.foregroundStyle(StakColors.muted)
						if let err = deleteError {
							Text(err)
								.font(StakFont.geist(12 * u))
								.foregroundStyle(Auth.errorRed)
						}
						Button(action: runDelete) {
							Text(deleting ? "Deleting\u{2026}" : "Delete my account")
								.font(StakFont.geist(13 * u, .medium))
								.foregroundStyle(Auth.errorRed)
								.frame(maxWidth: .infinity)
								.frame(minHeight: 44 * u * typeScale)
								.background(Color(argb: 0x33E5484D), in: RoundedRectangle(cornerRadius: 6 * u))
						}
						.buttonStyle(.pressDim)
						.disabled(!deleteConfirmed || deleting)
						.opacity(deleteConfirmed && !deleting ? 1 : 0.5)
					}
					.padding(.horizontal, 14 * u)
					.padding(.bottom, 14 * u)
				}
			}
			.padding(.vertical, 4 * u)
			.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			// Only the demo persona's state survives a log out - a created account signs back in as a new one (review 2026-09-14).
			Caption(text: Session.shared.demoAccount ? "Log out from the Profile page keeps your saves and paper portfolio for the next sign-in." : "Log out from the Profile page ends this session; your saves and paper portfolio are kept with your account for the next sign-in.")
		}
	}
}

/// Change password (FigJam Profile board, 2026-09-14). Supabase updates the password on the active session, so
/// there's no current password to check - the web app's security page asks only for the new one, and this mirrors
/// it. A Google- or Apple-linked account has no STAK password to change. Mirrors android ChangePasswordScreen.
private struct ChangePasswordView: View {
	let onBack: () -> Void
	@StateObject private var authVM = AuthViewModel()
	@ObservedObject private var profile = UserProfile.shared
	@State private var next = ""
	@State private var confirm = ""
	@State private var show = false
	@State private var attempted = false
	@State private var saving = false
	@State private var updated = false
	@State private var serverError: String? = nil
	private var nextError: String? { AuthRules.passwordError(next) }
	private var confirmError: String? { AuthRules.confirmError(next, confirm) }

	var body: some View {
		let u = figmaUnit
		SettingsPage(title: "Change password", onBack: onBack) {
			if profile.linkedGoogle || profile.linkedApple {
				let provider = profile.linkedGoogle ? "Google" : "Apple"
				VStack(alignment: .leading, spacing: 8 * u) {
					Text("Password managed by \(provider)")
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
					Text("Your sign-in is handled by \(provider). To change your password, visit your \(provider) account settings.")
						.font(StakFont.geist(13 * u))
						.stakLineHeight(19 * u, size: 13 * u, face: .geist)
						.foregroundStyle(bodyInk)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.padding(16 * u)
				.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			} else if updated {
				VStack(alignment: .leading, spacing: 8 * u) {
					Text("Password updated")
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
					Text("Use it the next time you sign in.")
						.font(StakFont.geist(13 * u))
						.stakLineHeight(19 * u, size: 13 * u, face: .geist)
						.foregroundStyle(bodyInk)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.padding(16 * u)
				.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
				AuthCta(text: "Done", action: onBack)
			} else {
				AuthInput("New password", text: $next, hidden: !show) { ShowHideToggle(shown: $show) }
					.error(attempted ? nextError : nil)
					.onChange(of: next) { _, _ in serverError = nil }
				AuthInput("Confirm new password", text: $confirm, hidden: !show)
					.error(attempted ? confirmError : nil)
					.onChange(of: confirm) { _, _ in serverError = nil }
				Caption(text: "At least \(AuthRules.passwordMin) characters.")
				if let err = serverError {
					Text(err)
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Auth.errorRed)
						.frame(maxWidth: .infinity, alignment: .leading)
				}
				AuthCta(text: saving ? "Updating\u{2026}" : "Update password", enabled: !next.isEmpty && !confirm.isEmpty && !saving, action: {
					attempted = true
					serverError = nil
					guard nextError == nil && confirmError == nil else { return }
					saving = true
					Task {
						let err = await authVM.changePassword(newPassword: next)
						saving = false
						if let err { serverError = err } else { updated = true }
					}
				})
			}
		}
	}
}


/// Edit profile (android EditProfileScreen): change the photo and the display name, then save - the name goes to the
/// server too, the photo stays on the phone.
private struct EditProfileView: View {
	let onBack: () -> Void
	@StateObject private var authVM = AuthViewModel()
	@State private var name = UserProfile.shared.displayName
	@State private var photoData = UserProfile.shared.photoData
	@State private var photo: UIImage? = UserProfile.shared.photoData.flatMap(UIImage.init(data:))
	@State private var pickedItem: PhotosPickerItem? = nil
	@State private var loadGen = 0
	@State private var saving = false
	/// A picked photo still being shrunk: Save waits for it, or the old photo would be stored.
	@State private var loadingPhoto = false
	/// The save in flight - cancelled if the page is left first, so it never pops the page beneath (the Profile hub).
	@State private var saveTask: Task<Void, Never>? = nil

	var body: some View {
		let u = figmaUnit
		SettingsPage(title: "Edit profile", onBack: onBack) {
			VStack(spacing: 10 * u) {
				PhotosPicker(selection: $pickedItem, matching: .images) {
					ZStack {
						Circle().fill(Color(argb: 0xFF242B3D))
						if let image = photo {
							Image(uiImage: image)
								.resizable()
								.scaledToFill()
								.frame(width: 96 * u, height: 96 * u)
								.clipShape(Circle())
						} else {
							Text(name.prefix(1).uppercased())
								.font(StakFont.sora(36 * u, .semiBold))
								.foregroundStyle(Color(argb: 0xFF9EADC7))
						}
					}
					.frame(width: 96 * u, height: 96 * u)
					.overlay(Circle().strokeBorder(teal, lineWidth: 2 * u))
				}
				.buttonStyle(.pressDim)
				.accessibilityLabel("Profile photo")
				.accessibilityHint("Change photo")
				PhotosPicker(selection: $pickedItem, matching: .images) {
					Text("Change photo")
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(teal)
				}
				.buttonStyle(.pressDim)
			}
			.frame(maxWidth: .infinity)
			.padding(.vertical, 8 * u)
			.onChange(of: pickedItem) { _, item in
				guard let item else { return }
				loadGen += 1
				let gen = loadGen
				loadingPhoto = true
				Task {
					defer { if gen == loadGen { loadingPhoto = false } }
					// Only a 512px thumbnail survives the pick (ImageIO downsample, off the main thread) - the same path
					// as 09 Profile setup.
					guard let data = try? await item.loadTransferable(type: Data.self),
						  let thumb = await UIImage(data: data)?.byPreparingThumbnail(ofSize: CGSize(width: 512, height: 512)),
						  let jpeg = thumb.jpegData(compressionQuality: 0.85), gen == loadGen else { return }
					photo = thumb
					photoData = jpeg
				}
			}

			Text("DISPLAY NAME")
				.font(StakFont.geist(10 * u, .medium))
				.tracking(1.2 * u)
				.foregroundStyle(muted)
				.frame(maxWidth: .infinity, alignment: .leading)

			HStack(spacing: 0) {
				TextField("Display name", text: $name, prompt: Text("Your name").foregroundStyle(StakColors.muted))
					.font(StakFont.geist(14 * u))
					.foregroundStyle(StakColors.textPrimary)
					.tint(StakColors.accent)
					.textInputAutocapitalization(.words)
					.onChange(of: name) { _, new in if new.count > nameMax { name = String(new.prefix(nameMax)) } }
				Text("\(name.count) / \(nameMax)")
					.font(StakFont.geist(11 * u))
					.foregroundStyle(muted)
			}
			.padding(16 * u)
			.background(Color(argb: 0xFF181F30), in: RoundedRectangle(cornerRadius: 14 * u))

			AuthCta(text: saving ? "Saving\u{2026}" : "Save changes", enabled: !name.trimmingCharacters(in: .whitespaces).isEmpty && !saving && !loadingPhoto, action: {
				saving = true
				UserProfile.shared.displayName = name.trimmingCharacters(in: .whitespaces).capitalizedWords
				UserProfile.shared.photoData = photoData
				Session.shared.saveProfile()
				saveTask = Task {
					await authVM.updateProfile()
					guard !Task.isCancelled else { return }
					onBack()
				}
			})
		}
		.onDisappear { saveTask?.cancel(); saveTask = nil; saving = false }
	}
}

