import SwiftUI

/// The notification inbox behind the Home bell (product audit, 2026-09-05: the bell only cleared its dot and opened
/// nothing). The demo account carries its authored activity. Read state persists per account (StakStore). The orange
/// dot on the bell marks UNREAD items (designer, 2026-08-22) and clears once the inbox has been opened.
///
/// A real account's inbox is built from its own data: a big move on a saved stock (over the threshold the settings
/// page promises, only while "Price moves on your picks" is on), today's deck while cards are left ("Daily deck"), the
/// save prompt only while nothing is saved, and the welcome for the account's first week, dated from when the account
/// was created. Mirrors android data/StakNotifications.kt.
@MainActor
final class StakNotifications: ObservableObject {
	static let shared = StakNotifications()

	struct Item: Identifiable, Equatable {
		let id: String
		let title: String
		let body: String
		let time: String
	}

	private static let demo: [Item] = [
		Item(id: "nvda-up", title: "NVDA is up 4.2% today", body: "Chip demand keeps outrunning supply. Your biggest pick is leading the deck.", time: "2h"),
		Item(id: "deck-ready", title: "Your deck is ready", body: "Twelve fresh cards, tuned to your taste. Swipe when you have a minute.", time: "8h"),
		Item(id: "weekly-recap", title: "Weekly recap", body: "You’re up +1.9% this week and #47 on the board. Nice.", time: "1d"),
	]

	/// How long the welcome stays in the inbox.
	private static let welcomeFor: TimeInterval = 7 * 24 * 60 * 60
	/// Live data is re-read at most this often when Home or the inbox asks.
	private static let refreshEvery: TimeInterval = 5 * 60

	@Published private(set) var items: [Item] = []
	@Published private(set) var readIds: Set<String> = []
	private var refreshedAt = Date.distantPast
	/// Bumped by every `load` (a sign-in, sign-out or account switch): a read started for one account never lands in
	/// the next one's inbox.
	private var generation = 0
	private let repo = StockRepository.shared

	private init() {}

	var unreadCount: Int { items.filter { !readIds.contains($0.id) }.count }
	/// The Home bell's dot.
	var hasUnread: Bool { unreadCount > 0 }

	/// Restores the inbox for the current account, then refreshes it from live data.
	func load() {
		generation += 1
		// StakStore.demoAccount, never Session.shared: this runs inside Session's init.
		readIds = StakStore.stringSet("notif.read") ?? []
		refreshedAt = .distantPast
		if StakStore.demoAccount {
			items = Self.demo
			return
		}
		items = accountItems(moves: [], cardsLeft: nil)
		// After Session has finished setting up - refresh reads Session.shared.
		Task { self.refresh() }
	}

	/// Re-reads the saved stocks' moves and today's deck, at most every few minutes.
	func refresh(force: Bool = false) {
		guard !StakStore.demoAccount, Session.shared.token != nil else { return }
		guard force || Date().timeIntervalSince(refreshedAt) >= Self.refreshEvery else { return }
		refreshedAt = Date()
		let started = generation
		Task {
			let profile = UserProfile.shared
			let held = MyStakHoldings.shared.tickers.sorted()
			var moves: [(String, Double)] = []
			if profile.priceAlerts && !held.isEmpty {
				// A failed price request keeps the inbox as it was, rather than reading as "nothing moved" and dropping
				// the moves already listed.
				var quotes: [String: BatchQuote] = [:]
				for start in stride(from: 0, to: held.count, by: 50) {
					guard let res = try? await repo.batchQuotes(Array(held[start..<min(start + 50, held.count)])) else { return }
					for (ticker, q) in res.quotes { if let q { quotes[ticker] = q } }
				}
				moves = quotes.compactMap { ticker, q in
					q.price > 0 && abs(q.changePercent) >= Double(profile.priceThreshold) ? (ticker, q.changePercent) : nil
				}
			}
			// The account's exact creation time, once: the profile's month-level "joined" can't tell a week-old account
			// from a month-old one.
			if Self.createdAt() == nil, let me = try? await repo.getMe(), generation == started {
				Self.rememberCreatedAt(me.createdAt)
			}
			var cardsLeft: Int? = nil
			if profile.dailyDeck, let swipes = try? await repo.getDailySwipes() {
				// The server keeps the last swipe day's count; one from an earlier deck day means none of today's cards
				// are used yet (the rule Discover applies).
				let used = swipes.date == StakClock.deckDayKey() ? swipes.count : 0
				cardsLeft = max(0, swipes.limit - used)
			}
			guard generation == started, !StakStore.demoAccount else { return }
			let next = accountItems(moves: moves, cardsLeft: cardsLeft)
			if next != items { items = next }
		}
	}

	private func accountItems(moves: [(String, Double)], cardsLeft: Int?) -> [Item] {
		var out: [Item] = []
		// Moves, largest first. The id carries the market day and direction, so a new day's move is a new, unread
		// notification.
		let day = StakClock.marketDay()
		let session = StakClock.lastCloseRef()
		let threshold = UserProfile.shared.priceThreshold
		for (ticker, pct) in moves.sorted(by: { abs($0.1) > abs($1.1) }) {
			let up = pct >= 0
			let name = MyStakHoldings.shared.nameOf(ticker).flatMap { $0 == ticker ? nil : $0 }
			let when = session.hasPrefix("at ") ? String(session.dropFirst(3)) : session
			out.append(Item(
				id: "move:\(day):\(ticker):\(up ? "up" : "down")",
				title: "\(ticker) is \(up ? "up" : "down") \(String(format: "%.1f", abs(pct)))% \(session)",
				body: (name.map { "\($0), one of your saved stocks, " } ?? "One of your saved stocks ") + "moved more than \(threshold)%.",
				time: session == "today" ? "Today" : when.prefix(1).uppercased() + when.dropFirst()
			))
		}
		if let cardsLeft, cardsLeft > 0 {
			out.append(Item(
				id: "deck:\(StakClock.deckDayKey())",
				title: "Your deck is ready",
				body: "\(cardsLeft) \(cardsLeft == 1 ? "card" : "cards") left today, tuned to your taste.",
				time: "Today"
			))
		}
		if MyStakHoldings.shared.count == 0 {
			out.append(Item(id: "first-save", title: "Save a stock to start your STAK", body: "Saved stocks power My STAK and Simulate.", time: "Today"))
		}
		if let welcome = welcomeItem() { out.append(welcome) }
		return out
	}

	/// When the account was created, as the inbox keeps it (epoch milliseconds). A value from an older build that kept
	/// a day count reads as unknown, so it's fetched again.
	static func createdAt() -> Date? {
		guard let ms = StakStore.string("notif.createdAt").flatMap(Int64.init), ms > 100_000_000_000 else { return nil }
		return Date(timeIntervalSince1970: Double(ms) / 1000)
	}

	/// Keeps the account's creation time from the server's timestamp - profile sync and the inbox's own read both
	/// write it through here.
	static func rememberCreatedAt(_ iso: String) {
		guard let created = MyStakHoldings.parse(iso) else { return }
		StakStore.set(String(Int64(created.timeIntervalSince1970 * 1000)), for: "notif.createdAt")
	}

	private func welcomeItem() -> Item? {
		guard let created = Self.createdAt() else { return nil }
		let ms = Int64(created.timeIntervalSince1970 * 1000)
		guard Date().timeIntervalSince(created) <= Self.welcomeFor else { return nil }
		let name = UserProfile.shared.displayName.trimmingCharacters(in: .whitespaces)
		return Item(
			id: "welcome",
			title: name.isEmpty ? "Welcome to STAK" : "Welcome to STAK, \(name.capitalizedWords)",
			body: "Your first deck is waiting in Discover. Swipe right to STAK, left to pass.",
			time: StakClock.ago(ms / 1000)
		)
	}

	/// Opening the inbox reads everything - like an activity feed. Nothing new to read, nothing written.
	func markAllRead() {
		let next = Set(items.map(\.id))
		guard next != readIds else { return }
		readIds = next
		StakStore.set(readIds, for: "notif.read")
		DeviceStateSync.shared.push()
	}

	/// The read marks another phone had - pulled by DeviceStateSync. The items themselves aren't rebuilt.
	func reloadReadIds() {
		let stored = StakStore.stringSet("notif.read") ?? []
		if stored != readIds { readIds = stored }
	}
}
