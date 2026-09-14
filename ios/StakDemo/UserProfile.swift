import SwiftUI

/// Session-scoped user identity captured in Onboarding · 09 Profile setup
/// (Figma node 1:793). Mirrors android ui/UserProfile.kt: the display name
/// feeds the Home greeting and the Profile hub; "Hamza" is the design's
/// demo persona shown until the user sets a name.
final class UserProfile: ObservableObject {
	static let shared = UserProfile()

	@Published var displayName: String = ""
	@Published var photoData: Data? = nil

	/// The user's risk profile - the "Risk style" the taste graph derives
	/// from the onboarding answers (05 Risk et al). Feeds the
	/// why-this-matters summary; the backend computes/refines it in
	/// production. Authored demo default until then.
	@Published var riskStyle: String = "Growth-Oriented"
	// The onboarding answers (product audit, 2026-09-05): they shape the taste reveal,
	// the risk style and the Profile chips instead of going nowhere.
	@Published var brandPicks: Set<String> = []
	/// 04 Goal card index, -1 until answered (TasteModel.goal*).
	@Published var goal: Int = -1
	/// 05 Risk card index, -1 until answered (TasteModel.risk*).
	@Published var risk: Int = -1
	/// 08 Permissions: the user's answer, and the OS grant when it was asked (product audit, 2026-09-05).
	@Published var notificationsOn: Bool = true
	/// 08 Permissions "Account security": a signed-in user unlocks with Face ID / Touch ID / the passcode before Home (Codex review, PR #167).
	@Published var accountLock: Bool = false
	// The settings pages behind the Profile hub (product audit, 2026-09-05).
	@Published var priceAlerts: Bool = true
	@Published var dailyDeck: Bool = true
	@Published var marketNews: Bool = false
	/// Price-alert threshold in percent (FigJam Profile board, 2026-09-14: "Price threshold"); the authored copy's 3 by default.
	@Published var priceThreshold: Int = 3
	@Published var appearance: String = "dark"
	@Published var linkedGoogle: Bool = false
	@Published var linkedApple: Bool = false
	/// The month the account was created ("September 2026"); the demo's authored "July 2026".
	@Published var joined: String = "July 2026"

	/// The name as the app addresses the user - always capitalized.
	var greetingName: String {
		let name = displayName.trimmingCharacters(in: .whitespaces)
		return (name.isEmpty ? "Hamza" : name).capitalizedWords
	}

	/// BACKEND CONTRACT (user, 2026-08-22): the app sends the device's IANA
	/// timezone ID (e.g. "Africa/Lagos", "Europe/Berlin", "Asia/Shanghai")
	/// with the session/profile so the backend can schedule per-user
	/// LOCAL-time deliveries - the day's breaking deck and mood at the
	/// user's morning, notification timing, daily resets. The device clock
	/// is the source of truth (auto time zone from the network); nothing is
	/// inferred from IP or location. Read live so travel is reflected.
	var timeZoneId: String { TimeZone.current.identifier }

	private init() {}
}

extension String {
	/// "fish" -> "Fish", "mary ann" -> "Mary Ann": the first letter of every
	/// word uppercased, the rest left as typed (user, 2026-08-22: names
	/// typed in lower case must still read capitalized everywhere).
	var capitalizedWords: String {
		// Consecutive spaces produce empty segments - dropped, so typed spacing never trips this (mirrors Android, PR #166).
		split(separator: " ", omittingEmptySubsequences: true)
			.map { w -> String in
				guard let first = w.first else { return String(w) }
				return first.uppercased() + w.dropFirst()
			}
			.joined(separator: " ")
	}
}
