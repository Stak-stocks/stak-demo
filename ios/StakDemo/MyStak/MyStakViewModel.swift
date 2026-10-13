import Foundation

/// My STAK, read from the user's own saves (product audit, 2026-09-05: the screen described a demo persona to every
/// account). Holdings and their categories come from /api/me/android-stocks; prices from live quotes. The demo account
/// keeps its authored frames; everything here serves a real one. The Overview and the pages it opens (a collection,
/// every collection, the Taste Graph, What changed) share this one instance, so opening a collection shows what's
/// already there rather than fetching it again. Mirrors android ui/mystak/MyStakViewModel.kt.
@MainActor
final class MyStakViewModel: ObservableObject {
	/// One saved stock: what it is, what it costs now, and how it's done since the save.
	struct Holding: Equatable {
		let ticker: String
		let name: String
		let groupId: String
		let groupName: String
		var price: Double? = nil
		/// Today's move, the only one a quote can tell us.
		var changePct: Double? = nil
	}

	/// A collection: the saves that share a category.
	struct Group: Identifiable, Equatable {
		let id: String
		let name: String
		let holdings: [Holding]

		/// The group's move today - its stocks', equally weighted.
		var changePct: Double? {
			let moves = holdings.compactMap(\.changePct)
			return moves.isEmpty ? nil : moves.reduce(0, +) / Double(moves.count)
		}
	}

	@Published private(set) var loading = true
	@Published private(set) var holdings: [Holding] = []
	@Published private(set) var groups: [Group] = []
	/// Cards left in today's deck, for the Discover card; nil when it couldn't be read.
	@Published private(set) var cardsLeft: Int? = nil
	/// What the account's own behavior says it gravitates toward; nil until it lands.
	@Published private(set) var taste: TasteGraph.Graph? = nil
	/// What changed at the saved companies, newest first; empty until it lands.
	@Published private(set) var updates: [StockUpdateDto] = []
	@Published private(set) var unreadUpdates = 0
	/// The request failed and there is nothing to show - said plainly, never as "nothing happened".
	@Published private(set) var tasteFailed = false
	@Published private(set) var updatesFailed = false

	private let repo = StockRepository.shared
	private let store = MyStakHoldings.shared

	/// The holdings the current state was built from, so a second screen doesn't refetch them.
	private var loadedFor: Set<String>? = nil
	/// When the last load started - its quotes' age.
	private var loadedAt = Date.distantPast
	/// When the taste and the updates were last read - every screen asks for them on open.
	private var tasteAt = Date.distantPast
	private var updatesAt = Date.distantPast
	private var quoteTask: Task<Void, Never>? = nil
	/// Bumped by every load: a slower, older load finishing after a newer one mustn't draw its stale holdings.
	private var loadGeneration = 0

	/// A save with no category the deck ranks on - it still has to show up somewhere.
	private static let other = "Other"
	/// How long a screen's quotes, a taste reading or an update list stand before a return to the screen re-reads them.
	private static let freshFor: TimeInterval = 60

	/// Loads when the saved set has changed, or its quotes are over a minute old. `loadedFor` is set when a load
	/// STARTS, so this skips one still in flight too - a second screen opening meanwhile mustn't start its own.
	func loadIfNeeded() {
		if loadedFor == store.tickers && Date().timeIntervalSince(loadedAt) < Self.freshFor { return }
		load()
	}

	func load() {
		// Claimed before anything suspends.
		loadedFor = store.tickers
		loadedAt = Date()
		// Open with what the phone already knows - the saves in local storage and the prices last seen today - instead
		// of a blank screen until the requests come back.
		if holdings.isEmpty {
			let local = store.tickers.sorted()
			if !local.isEmpty {
				render(local, Snapshot.read(), final: false)
			}
		}
		// The Discover card's count, on its own: it mustn't hold the page back.
		Task { if let left = await fetchCardsLeft() { cardsLeft = left } }

		loadGeneration += 1
		let generation = loadGeneration
		Task {
			setLoading(true)
			// Prices for what's saved on the phone, requested alongside the server's list rather than after it; a
			// stock the refresh adds is fetched after.
			let local = store.tickers.sorted()
			async let ahead = Self.fetchQuotes(local)
			// The server is the record of what's saved, and it carries each save's category, date and price.
			await store.refreshFromBackend()
			guard generation == loadGeneration else { return }
			let tickers = store.tickers.sorted()
			// Re-marked with what the refresh settled on, still before the quotes come back: a failed fetch must not loop.
			loadedFor = store.tickers
			if tickers.isEmpty {
				// The taste and updates loaded alongside this aren't touched by an account with no saves.
				setLoading(false)
				if !holdings.isEmpty { holdings = [] }
				if !groups.isEmpty { groups = [] }
				return
			}
			var quotes = await ahead
			let missing = tickers.filter { quotes[$0] == nil }
			if !missing.isEmpty {
				let more = await Self.fetchQuotes(missing)
				quotes.merge(more) { $1 }
			}
			guard generation == loadGeneration else { return }
			// Merged, not replaced: a stock whose quote failed keeps the price it had, on screen and in the snapshot.
			if !quotes.isEmpty { Snapshot.putQuotes(Snapshot.read().merging(quotes) { $1 }) }
			render(tickers, quotes, final: true, previous: holdings)
		}
	}

	/// Today's prices again for what's on screen - every 30s while a collection is visible. Outside the session there
	/// is nothing new to fetch. A stock whose quote doesn't come back this time keeps the price it already shows.
	func refreshQuotes() {
		guard StakClock.lastCloseRef() == "today", quoteTask == nil else { return }
		let tickers = holdings.map(\.ticker)
		guard !tickers.isEmpty else { return }
		quoteTask = Task {
			defer { quoteTask = nil }
			let fresh = await Self.fetchQuotes(tickers)
			guard !fresh.isEmpty, holdings.map(\.ticker) == tickers else { return }
			Snapshot.putQuotes(Snapshot.read().merging(fresh) { $1 })
			render(tickers, fresh, final: true, previous: holdings)
		}
	}

	/// What changed at the saved companies. The updates are detected once a day on the server and shared; only whether
	/// they've been read is this account's.
	func loadUpdates(force: Bool = false) {
		if Session.shared.demoAccount {
			let list = DemoUpdates.list
			if list != updates { setUpdates(list) }
			if updatesFailed { updatesFailed = false }
			return
		}
		guard force || Date().timeIntervalSince(updatesAt) >= Self.freshFor else { return }
		updatesAt = Date()
		Task {
			guard let res = try? await repo.getUpdates() else {
				// "Nothing new" is a claim about the world; a failed request can't make it.
				updatesAt = .distantPast
				updatesFailed = updates.isEmpty
				return
			}
			if res.updates != updates { updates = res.updates }
			if res.unread != unreadUpdates { unreadUpdates = res.unread }
			if updatesFailed { updatesFailed = false }
			// The catalog carries each company's logo; the inbox draws them beside the names.
			if !res.updates.isEmpty { await BrandNames.shared.ensure() }
		}
	}

	/// The company's updates, all of them, as one card in the inbox - opened, so they stop counting as new. Matched the
	/// way the screens match: a lower-case symbol must mark its changes read too.
	func markCompanyRead(_ ticker: String) {
		markRead(Set(updates.filter { $0.ticker.caseInsensitiveCompare(ticker) == .orderedSame && !$0.read }.map(\.id)))
	}

	func markUpdateRead(_ id: Int64) { markRead([id]) }

	/// Marked read here at once, in one change to the list, then on the server (one request per update - the only
	/// endpoint there is).
	private func markRead(_ ids: Set<Int64>) {
		guard !ids.isEmpty else { return }
		setUpdates(updates.map { u in
			guard ids.contains(u.id) else { return u }
			var copy = u
			copy.read = true
			return copy
		})
		if Session.shared.demoAccount {
			for id in ids { DemoUpdates.markRead(id) }
			return
		}
		for id in ids { Task { _ = try? await repo.markUpdateRead(id) } }
	}

	private func setUpdates(_ list: [StockUpdateDto]) {
		updates = list
		let unread = list.filter { !$0.read }.count
		if unread != unreadUpdates { unreadUpdates = unread }
	}

	/// Only an actual change is published - each one redraws every My STAK page on the stack.
	private func setLoading(_ value: Bool) { if loading != value { loading = value } }

	/// The Taste Graph, measured by the server from this account's own saves, passes and opens. Cheap to serve (no
	/// AI), so it's re-read once it's a minute old - a save made a moment ago should show up in it.
	func loadTaste(force: Bool = false) {
		if Session.shared.demoAccount {
			let demo = TasteGraph.demo()
			if demo != taste { taste = demo }
			if tasteFailed { tasteFailed = false }
			return
		}
		guard force || Date().timeIntervalSince(tasteAt) >= Self.freshFor else { return }
		tasteAt = Date()
		Task {
			guard let dto = try? await repo.getTaste() else {
				// Said, not swallowed: an empty card would read as "you have no taste yet".
				tasteAt = .distantPast
				tasteFailed = taste == nil
				return
			}
			let graph = TasteGraph.from(dto)
			if graph != taste { taste = graph }
			if tasteFailed { tasteFailed = false }
		}
	}

	/// The collection behind a chip - the Collection page serves this.
	func group(_ id: String) -> Group? { groups.first { $0.id == id } }

	// MARK: - Building

	/// `previous` supplies the price and move for any stock whose quote didn't come back this time, so a refresh never
	/// blanks a price it already showed - nor invents a 0.0% move for one it never had.
	private func render(_ tickers: [String], _ quotes: [String: Quote], final: Bool, previous: [Holding] = []) {
		let before = Dictionary(previous.map { ($0.ticker, $0) }, uniquingKeysWith: { $1 })
		let built = tickers.map { ticker -> Holding in
			let quote = quotes[ticker].flatMap { $0.price > 0 ? $0 : nil }
			let groupName = store.categoryOf(ticker).map(categoryName) ?? Self.other
			return Holding(
				ticker: ticker,
				name: store.nameOf(ticker) ?? ticker,
				groupId: categoryGroupId(groupName),
				groupName: groupName,
				price: quote?.price ?? before[ticker]?.price,
				changePct: quote?.changePercent ?? before[ticker]?.changePct
			)
		}
		setLoading(!final)
		if built != holdings {
			holdings = built
			groups = Self.groupsOf(built)
		}
	}

	/// Saves grouped by category, biggest first; "Other" - the catch-all - sits last however big it is.
	private static func groupsOf(_ holdings: [Holding]) -> [Group] {
		var order: [String] = []
		var byId: [String: [Holding]] = [:]
		for h in holdings {
			if byId[h.groupId] == nil { order.append(h.groupId) }
			byId[h.groupId, default: []].append(h)
		}
		return order.map { id in
			let stocks = byId[id] ?? []
			return Group(id: id, name: stocks[0].groupName, holdings: stocks)
		}
		.sorted { a, b in
			if (a.name == other) != (b.name == other) { return b.name == other }
			if a.holdings.count != b.holdings.count { return a.holdings.count > b.holdings.count }
			return a.name < b.name
		}
	}

	private func fetchCardsLeft() async -> Int? {
		guard let res = try? await repo.getDailySwipes() else { return nil }
		// The server keeps the last day the user swiped, so a count from an earlier deck day means none of today's
		// cards are used - the rule Discover and the inbox both apply.
		let used = res.date == StakClock.deckDayKey() ? res.count : 0
		return max(0, res.limit - used)
	}

	/// Batched: one request per 50 symbols keeps the query string sane.
	private static func fetchQuotes(_ tickers: [String]) async -> [String: Quote] {
		var out: [String: Quote] = [:]
		for start in stride(from: 0, to: tickers.count, by: 50) {
			let chunk = Array(tickers[start..<min(start + 50, tickers.count)])
			guard let res = try? await StockRepository.shared.batchQuotes(chunk) else { continue }
			for (ticker, quote) in res.quotes {
				if let quote { out[ticker] = Quote(price: quote.price, changePercent: quote.changePercent) }
			}
		}
		return out
	}

	/// A price and today's move - what My STAK keeps of a quote.
	struct Quote: Codable, Equatable {
		let price: Double
		let changePercent: Double
	}

	/// The prices My STAK last showed, kept on the phone so it can open with them. Only today's (US Eastern) count: a
	/// move from a previous session mustn't sit under a "today" label, so older ones are ignored rather than shown.
	private enum Snapshot {
		private struct Saved: Codable {
			var day = ""
			var quotes: [String: Quote] = [:]
		}

		private static let key = "mystak.quotes"

		/// Today's saved prices.
		static func read() -> [String: Quote] {
			guard let data = StakStore.data(key), let saved = try? JSONDecoder().decode(Saved.self, from: data),
				  saved.day == StakClock.marketDay() else { return [:] }
			return saved.quotes.filter { $0.value.price > 0 }
		}

		static func putQuotes(_ quotes: [String: Quote]) {
			guard let data = try? JSONEncoder().encode(Saved(day: StakClock.marketDay(), quotes: quotes)) else { return }
			StakStore.set(data, for: key)
		}
	}
}
