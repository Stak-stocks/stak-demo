import SwiftUI

/// The notification inbox behind the Home bell (product audit, 2026-09-05: the
/// bell only cleared its dot and opened nothing). The demo account carries its
/// authored activity; a new account gets its welcome. Read state persists per
/// account (StakStore). The orange dot on the bell marks UNREAD items
/// (designer, 2026-08-22) and clears once the inbox has been opened.
/// Mirrors android StakNotifications.kt.
final class StakNotifications: ObservableObject {
	static let shared = StakNotifications()

	struct Item: Identifiable {
		let id: String
		let title: String
		let body: String
		let time: String
		/// `today` groups the row under TODAY (else EARLIER) on the Notifications page (1:5927).
		var today: Bool = true
	}

	// The persona's inbox as authored (Chinedu_Mobile 1:5927, 2026-10-07).
	private static let demo: [Item] = [
		Item(id: "nvda-up", title: "NVDA is up 4.2% today", body: "One of your picks is moving. Tap to see why.", time: "2h"),
		Item(id: "brief-ready", title: "Your daily brief is ready", body: "Three stories matter for your STAK this morning.", time: "8h"),
		Item(id: "order-filled", title: "Practice order filled", body: "0.2048 NVDA at $122.10 · paper", time: "9h"),
		Item(id: "weekly-recap", title: "Weekly recap", body: "Your paper portfolio gained +1.9% last week.", time: "1d", today: false),
		Item(id: "deck-complete", title: "Deck complete", body: "You finished Friday’s deck. 12 of 12.", time: "3d", today: false)
	]
	/// 1:5927 authors the two newest rows unread and the rest read - the persona's inbox before its first open.
	private static let demoRead: Set<String> = ["order-filled", "weekly-recap", "deck-complete"]

	/// A first-time user's inbox, and how it ages: the welcome is stamped with the
	/// account's creation day and "Save a stock" leaves once the first save exists,
	/// so an active new account on a later day is not greeted as brand new
	/// (audit 2026-09-07). Mirrors android.
	private static func welcome() -> [Item] {
		let age = createdAgo()
		let welcome = Item(
			id: "welcome", title: "Welcome to STAK, \(UserProfile.shared.greetingName)",
			body: DeckSession.shared.seen > 0 ? "Your deck is in Discover. Swipe down for the next card, save what you like."
				: "Your first deck is waiting in Discover. Swipe down for the next card, save what you like.",
			time: age
		)
		if MyStakHoldings.shared.count > 0 { return [welcome] }
		return [welcome, Item(id: "first-save", title: "Save a stock to start your STAK", body: "Saved stocks power My STAK and the Simulate leaderboard.", time: age)]
	}

	/// "Just now" on the creation day, then "1d", "6d", "2w" like the persona's authored rows.
	private static func createdAgo() -> String {
		guard let created = StakStore.string("created_day").flatMap(Int.init) else { return "Just now" }
		let days = Int(Date().timeIntervalSince1970 / 86400) - created
		if days <= 0 { return "Just now" }
		if days < 7 { return "\(days)d" }
		return "\(days / 7)w"
	}

	/// Derived from the account's live state, so a first save updates the inbox at once.
	var items: [Item] { StakStore.demoAccount ? Self.demo : Self.welcome() }
	@Published private(set) var readIds: Set<String> = []

	var unreadCount: Int { items.filter { !readIds.contains($0.id) }.count }
	/// The Home bell's dot.
	var hasUnread: Bool { unreadCount > 0 }

	/// Restores the inbox for the current account.
	func load() {
		// StakStore.demoAccount, never Session.shared: this runs inside Session's init (Codex review, PR #167).
		readIds = StakStore.stringSet("notif.read") ?? (StakStore.demoAccount ? Self.demoRead : [])
	}

	/// Opening the inbox reads everything - like an activity feed.
	func markAllRead() {
		readIds = Set(items.map(\.id))
		StakStore.set(readIds, for: "notif.read")
	}

	private init() {}
}
