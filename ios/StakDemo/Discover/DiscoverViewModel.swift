import SwiftUI

/// One deck card's content (art + copy at the front-card scale). Android's DeckCard.
struct DiscoverCard: Equatable, Identifiable {
	/// The pre-generated art's resource name (CardArt), or nil: the basket template with the logo set into the glass.
	var art: String? = nil
	/// "NVDA · NVIDIA Corp"
	let ticker: String
	let headline: String
	var price: String
	var change: String
	var tip: String
	let cardTop: Color
	let artBg: Color
	var logoUrl: String? = nil
	var brandId: String = ""
	var categories: [String] = []

	/// The live price as a number - what a save stamps (the display string is for showing).
	var priceValue: Double? = nil

	var id: String { symbol }
	/// "NVDA · NVIDIA Corp" -> "NVDA" - the routing/holdings symbol.
	var symbol: String { (ticker.components(separatedBy: " · ").first ?? ticker).trimmingCharacters(in: .whitespaces) }
	/// "NVDA · NVIDIA Corp" -> "NVIDIA Corp", or the symbol when the card has no name.
	var companyName: String {
		let name = ticker.components(separatedBy: "· ").dropFirst().joined(separator: "· ").trimmingCharacters(in: .whitespaces)
		return name.isEmpty ? symbol : name
	}
}

/// A brand's Quick Look: the generated overview, else the profile's cultural sections.
struct QuickLookData {
	let structured: QuickLookDto?
	let sections: [CulturalSectionDto]
}

/// The Discover deck: today's personalised cards from the recommendation engine, priced live, with the day's limit,
/// counts and label; swipes are sent after the 3s undo window. Mirrors android ui/discover/DiscoverViewModel.kt.
@MainActor
final class DiscoverViewModel: ObservableObject {
	@Published private(set) var deck: [DiscoverCard] = []
	@Published private(set) var loading = true
	@Published private(set) var hasReachedLimit = false
	/// Cards per day, served by the backend from @stak/shared's DAILY_SWIPE_LIMIT.
	@Published private(set) var dailyLimit = DiscoverViewModel.fallbackDailyLimit
	/// Swipes counted against today's limit: the server's count plus swipes still in their undo window.
	@Published private(set) var swipedToday = 0
	@Published private(set) var deckLabel = DiscoverViewModel.defaultDeckLabel
	/// True when today's cards couldn't load - the screen offers Retry instead of stand-in cards.
	@Published private(set) var loadError = false
	/// Today's (saved, passed) brand counts from the server, across every device.
	@Published private(set) var todayStats: (saved: Int, passed: Int) = (0, 0)

	/// Used only when the server can't be reached; /api/me/daily-swipes serves the real value.
	static let fallbackDailyLimit = 10
	private static let missingQuoteRetries = 2
	private static let defaultDeckLabel = "TODAY'S DECK"
	private static let picksDayKey = "deck.picks.day"
	private static let picksKey = "deck.picks"
	/// Bump when the picking rules change, so a deck pinned under the old rules is re-picked.
	private static let picksVersion = 2
	private static let picksVersionKey = "deck.picks.version"
	private static let picksLabelKey = "deck.picks.label"
	private static let maxPerCategory = 3

	private let repo = StockRepository.shared
	private var pendingSwipeTasks: [String: Task<Void, Never>] = [:]
	private var quickLookCache: [String: QuickLookData] = [:]
	/// Quick Looks being fetched: a "Learn more" tap during the prefetch shares the request instead of sending another.
	private var quickLookInFlight: [String: Task<QuickLookData, Never>] = [:]
	private var tipCache: [String: String] = [:]
	/// brandId -> epoch ms of the last pass. Nil until read: PUT replaces the server list, so never write blind.
	private var passedAt: [String: Int64]? = nil
	private var quoteTask: Task<Void, Never>? = nil
	/// The deck day (StakClock.deckDayKey) the deck on screen was loaded for.
	private var loadedDay: String? = nil
	/// StakClock.lastCloseRef when the deck was last priced - a changed one means the prices predate a session boundary.
	private var quotedRef: String? = nil
	/// Out-of-hours attempts to price cards whose quote never came back; capped so one bad symbol can't poll all night.
	private var missingRetries = 0
	private var started = false
	/// Set when the 9am rollover reloads the deck: today's run resets once the new cards are in.
	private var resetSessionOnLoad = false

	/// Loads the deck once; MainTabsView keeps one view model for the whole session.
	func load() async {
		guard !started else { return }
		started = true
		await fetchDeck()
	}

	func retry() { Task { await fetchDeck() } }

	/// Quick Look for any brand: the generated structured overview (GET /api/brands/:id/quick-look), or the
	/// profile's cultural-context sections when generation isn't available.
	func fetchQuickLook(_ brandId: String) async -> QuickLookData {
		if let hit = quickLookCache[brandId] { return hit }
		if let running = quickLookInFlight[brandId] { return await running.value }
		let task = Task { await self.loadQuickLook(brandId) }
		quickLookInFlight[brandId] = task
		let data = await task.value
		quickLookInFlight[brandId] = nil
		return data
	}

	private func loadQuickLook(_ brandId: String) async -> QuickLookData {
		let structured = (try? await repo.getBrandQuickLook(brandId).quickLook).flatMap { $0.in10Seconds.isEmpty ? nil : $0 }
		let data: QuickLookData
		if let structured {
			data = QuickLookData(structured: structured, sections: [])
		} else {
			let sections = ((try? await repo.getBrandProfile(brandId))?.culturalContext.sections ?? [])
				.filter { !$0.heading.isEmpty && !$0.content.isEmpty }
			data = QuickLookData(structured: nil, sections: sections)
		}
		if data.structured != nil || !data.sections.isEmpty { quickLookCache[brandId] = data }
		return data
	}

	private func fetchDeck() async {
		loading = true
		loadError = false
		loadedDay = StakClock.deckDayKey()
		missingRetries = 0
		async let dailySwipesTask = try? repo.getDailySwipes()
		async let recsTask = try? repo.getRecommendations()
		// Worked out here, on the main actor - not inside the child task.
		let since = StakClock.deckDayStartISO()
		async let statsTask = try? repo.getSwipes(since: since)
		async let passedTask = try? repo.getPassed()
		let brandsResult: BrandsListResponse? = try? await repo.getBrands()

		let dailySwipes = await dailySwipesTask
		let limit = (dailySwipes?.limit ?? 0) > 0 ? dailySwipes!.limit : Self.fallbackDailyLimit
		let swiped = (dailySwipes != nil && dailySwipes!.date == StakClock.deckDayKey()) ? dailySwipes!.count : 0
		dailyLimit = limit
		swipedToday = swiped
		// Set both ways: a deck reloaded at the 9am rollover starts under the limit again.
		hasReachedLimit = swiped >= limit
		if let swipes = (await statsTask)?.swipes {
			let saved = Set(swipes.filter { $0.direction == "right" }.map(\.brandId)).count
			let passed = Set(swipes.filter { $0.direction == "left" }.map(\.brandId)).count
			todayStats = (saved, passed)
		}

		if let res = brandsResult {
			// News search reads the same list for ticker <-> name matching.
			BrandNames.shared.fill(res.brands)
			let recs = await recsTask
			// Nil when unread: PUT replaces the server's list, so a pass is never written over one we couldn't read.
			passedAt = (await passedTask).map { res in Dictionary(res.entries.map { ($0.id, $0.at) }, uniquingKeysWith: { $1 }) }
			let picks = todaysPicks(res.brands, ranked: recs?.brandIds ?? [], limit: limit, passed: passedAt ?? [:], categories: recs?.categories ?? [:])
			quotedRef = StakClock.lastCloseRef()
			var quotes: [String: BatchQuote] = [:]
			if !picks.isEmpty, let q = try? await repo.batchQuotes(picks.map(\.ticker)) {
				for (k, v) in q.quotes { if let v { quotes[k] = v } }
			}
			let cards = picks.enumerated().map { i, brand -> DiscoverCard in
				let q = quotes[brand.ticker]
				let colors = Self.cardColorPalette[i % Self.cardColorPalette.count]
				return DiscoverCard(
					art: cardArt[brand.ticker],
					ticker: "\(brand.ticker) · \(brand.name)",
					headline: brand.bio,
					price: q.map { formatPrice($0.price) } ?? "—",
					change: q.map { formatChange($0.changePercent) } ?? "—",
					tip: "",
					cardTop: colors.top,
					artBg: colors.art,
					logoUrl: Self.brandLogoUrl(brand),
					brandId: brand.id,
					categories: brand.interestCategories,
					priceValue: q.flatMap { $0.price > 0 ? $0.price : nil }
				)
			}
			deck = cards
			// A rollover reload resets today's run only now, with the new cards in place - resetting it first showed the
			// previous day's swiped cards again for a moment.
			if resetSessionOnLoad { DeckSession.shared.load(); resetSessionOnLoad = false }
			prefetchTips(cards)
			prefetchQuickLooks(cards)
		} else {
			deck = []
			loadError = true
		}
		loading = false
	}

	/// Today's deck: the backend's personalised ranking (the same /api/recommendations order the web deck uses), minus
	/// stocks already in My STAK and anything passed in the last 24h (older passes return at the back, as on web),
	/// capped at the daily limit. Pinned per day so a relaunch or a refreshed ranking doesn't reshuffle a deck the user
	/// is part-way through.
	private func todaysPicks(_ brands: [BrandSummaryDto], ranked: [String], limit: Int, passed: [String: Int64], categories: [String: String]) -> [BrandSummaryDto] {
		let byTicker = Dictionary(brands.map { ($0.ticker, $0) }, uniquingKeysWith: { a, _ in a })
		let key = StakClock.deckDayKey()
		if StakStore.string(Self.picksDayKey) == key && StakStore.int(Self.picksVersionKey, default: 0) == Self.picksVersion {
			// A stock saved since the deck was pinned (from a stock page, say) leaves it - undoing a swipe on it would
			// have removed that earlier save.
			let held = MyStakHoldings.shared.tickers
			let pinned = (StakStore.string(Self.picksKey) ?? "").split(separator: ",").compactMap { byTicker[String($0)] }
				.filter { !held.contains($0.ticker) }
			if !pinned.isEmpty {
				deckLabel = StakStore.string(Self.picksLabelKey) ?? Self.deckLabelFor(pinned, categories)
				return pinned
			}
		}
		let rankedSet = Set(ranked)
		let ordered = ranked.compactMap { byTicker[$0] } + brands.filter { !rankedSet.contains($0.ticker) }
		let held = MyStakHoldings.shared.tickers
		let dayAgo = Int64(Date().timeIntervalSince1970 * 1000) - 24 * 60 * 60 * 1000
		let eligible = ordered.filter { !held.contains($0.ticker) && (passed[$0.id] ?? 0) <= dayAgo }
		let picks = Self.withCategoryCap(eligible.filter { passed[$0.id] == nil } + eligible.filter { passed[$0.id] != nil }, categories, limit)
		let label = Self.deckLabelFor(picks, categories)
		// Only a real personalised ranking is pinned. A fallback order (ranking unavailable - offline, or an expired
		// session) must not decide the whole day.
		if !ranked.isEmpty {
			StakStore.set(key, for: Self.picksDayKey)
			StakStore.set(picks.map(\.ticker).joined(separator: ","), for: Self.picksKey)
			StakStore.set(Self.picksVersion, for: Self.picksVersionKey)
			StakStore.set(label, for: Self.picksLabelKey)
		}
		deckLabel = label
		return picks
	}

	func recordSwipe(brandId: String, isSTAK: Bool, timeOnCardMs: Int64? = nil, categories: [String] = []) {
		guard !brandId.isEmpty else { return }
		let ticker = deck.first { $0.brandId == brandId }?.symbol
		let key = StakClock.deckDayKey()
		swipedToday += 1
		guard !Session.shared.demoAccount, Session.shared.token != nil else { return }
		let repo = self.repo
		pendingSwipeTasks[brandId] = Task { [weak self] in
			try? await Task.sleep(nanoseconds: 3_000_000_000)
			guard !Task.isCancelled else { return }
			let res = try? await repo.recordSwipe(RecordSwipeRequest(
				brandId: brandId,
				direction: isSTAK ? "right" : "left",
				todayKey: key,
				ticker: ticker,
				timeOnCardMs: timeOnCardMs,
				categories: categories.isEmpty ? nil : categories
			))
			guard let self else { return }
			self.pendingSwipeTasks[brandId] = nil
			if let res {
				if res.dailySwipeLimit > 0 { self.dailyLimit = res.dailySwipeLimit }
				// Re-anchor on the server's count; swipes still in their undo window stay counted.
				self.swipedToday = res.dailySwipeCount + self.pendingSwipeTasks.count
				if res.limitReached { self.hasReachedLimit = true }
				if res.success && !isSTAK { await self.recordPass(brandId) }
			}
		}
	}

	/// Mirror a sent pass into the backend's passed list (the list web re-queues from).
	private func recordPass(_ brandId: String) async {
		guard var entries = passedAt else { return }
		entries[brandId] = Int64(Date().timeIntervalSince1970 * 1000)
		passedAt = entries
		_ = try? await repo.putPassed(entries.map { PassedEntry(id: $0.key, at: $0.value) })
	}

	func cancelPendingSwipe(_ brandId: String) {
		if let task = pendingSwipeTasks.removeValue(forKey: brandId) {
			task.cancel()
			swipedToday = max(0, swipedToday - 1)
		} else if Session.shared.demoAccount || Session.shared.token == nil {
			// The demo account's swipes never had a request waiting; its count is local only.
			swipedToday = max(0, swipedToday - 1)
		}
		// Otherwise the swipe already reached the server, whose count stands (Android returns early the same way).
	}

	/// Learn-more taps feed the taste profile, as on web (POST /api/swipe/event).
	func recordLearnMore(_ card: DiscoverCard) {
		guard !card.brandId.isEmpty, !Session.shared.demoAccount, Session.shared.token != nil else { return }
		let req = EngagementEventRequest(
			type: "learn_more", brandId: card.brandId, ticker: card.symbol,
			categories: card.categories.isEmpty ? nil : card.categories, todayKey: StakClock.deckDayKey()
		)
		let repo = self.repo
		Task { _ = try? await repo.recordEvent(req) }
	}

	/// Warms each card's Quick Look one at a time, so "Learn more" rarely waits on generation.
	private func prefetchQuickLooks(_ cards: [DiscoverCard]) {
		Task { [weak self] in
			for card in cards where !card.brandId.isEmpty {
				guard let self else { return }
				_ = await self.fetchQuickLook(card.brandId)
			}
		}
	}

	/// Each tick while Discover is on screen, with the symbols of the cards it shows (none on the end-of-deck screen).
	/// Past the 9am rollover the next deck is loaded; otherwise the visible cards are re-priced.
	func onVisibleTick(_ visible: [String]) {
		if loading { return }
		if let loadedDay, loadedDay != StakClock.deckDayKey() {
			resetSessionOnLoad = true
			Task { await fetchDeck() }
			return
		}
		refreshQuotes(visible)
	}

	/// Re-prices the visible cards so each - and the price a save records - stays current: while the market is open,
	/// once after a session boundary passes, and (a couple of times) for a card whose quote failed.
	private func refreshQuotes(_ visible: [String]) {
		if visible.isEmpty || quoteTask != nil { return }
		let ref = StakClock.lastCloseRef()
		let tickers: [String]
		if StakClock.isMarketOpen() || ref != quotedRef {
			tickers = visible
		} else {
			let missing = deck.filter { visible.contains($0.symbol) && $0.price == "—" }.map(\.symbol)
			if missing.isEmpty || missingRetries >= Self.missingQuoteRetries { return }
			missingRetries += 1
			tickers = missing
		}
		let repo = self.repo
		quoteTask = Task { [weak self] in
			defer { self?.quoteTask = nil }
			guard let res = try? await repo.batchQuotes(tickers), let self else { return }
			self.quotedRef = ref
			let repriced = self.deck.map { c -> DiscoverCard in
				guard let q = res.quotes[c.symbol] ?? nil, q.price > 0 else { return c }
				var copy = c
				copy.price = formatPrice(q.price)
				copy.change = formatChange(q.changePercent)
				copy.priceValue = q.price
				return copy
			}
			if repriced != self.deck { self.deck = repriced }
		}
	}

	/// Every card's tip, fetched together and applied in one change (one redraw of the deck, not one per card).
	private func prefetchTips(_ cards: [DiscoverCard]) {
		let ids = cards.map(\.brandId).filter { !$0.isEmpty && tipCache[$0] == nil }
		guard !ids.isEmpty else { return }
		let repo = self.repo
		Task { [weak self] in
			let tips = await withTaskGroup(of: (String, String?).self) { group -> [String: String] in
				for id in ids { group.addTask { (id, try? await repo.getBrandTip(id).tip) } }
				var found: [String: String] = [:]
				for await (id, tip) in group { if let tip, !tip.isEmpty { found[id] = tip } }
				return found
			}
			guard let self, !tips.isEmpty else { return }
			for (id, tip) in tips { self.tipCache[id] = tip }
			self.deck = self.deck.map { c in
				guard let tip = tips[c.brandId] else { return c }
				var copy = c
				copy.tip = tip
				return copy
			}
		}
	}

	// MARK: - Picking

	/// The top `limit` brands with at most `maxPerCategory` per primary category, so one strong interest (every chip
	/// stock) can't fill the whole deck. Capped-out brands fill in, in rank order, only when other categories run out.
	private static func withCategoryCap(_ ordered: [BrandSummaryDto], _ categories: [String: String], _ limit: Int) -> [BrandSummaryDto] {
		var perCategory: [String: Int] = [:]
		var picks: [BrandSummaryDto] = []
		var overflow: [BrandSummaryDto] = []
		for brand in ordered {
			if picks.count == limit { break }
			let category = categories[brand.ticker] ?? brand.ticker
			let count = perCategory[category] ?? 0
			if count < maxPerCategory {
				picks.append(brand)
				perCategory[category] = count + 1
			} else {
				overflow.append(brand)
			}
		}
		return picks + overflow.prefix(max(0, limit - picks.count))
	}

	/// "TODAY · CHIPS, E-COMMERCE & MORE": the deck's own leading categories, so the label always describes the cards
	/// under it. Ties keep rank order.
	private static func deckLabelFor(_ picks: [BrandSummaryDto], _ categories: [String: String]) -> String {
		let names = picks.compactMap { categories[$0.ticker].map(categoryName) }
		if names.isEmpty { return defaultDeckLabel }
		var counts: [String: Int] = [:]
		for n in names { counts[n, default: 0] += 1 }
		var distinct: [String] = []
		for n in names where !distinct.contains(n) { distinct.append(n) }
		// Stable sort: equal counts keep their first-seen (rank) order, like Kotlin's sortedByDescending.
		let top = distinct.enumerated().sorted { a, b in
			let ca = counts[a.element]!, cb = counts[b.element]!
			return ca != cb ? ca > cb : a.offset < b.offset
		}.map(\.element)
		let text: String
		switch top.count {
		case 1: text = top[0]
		case 2: text = "\(top[0]) & \(top[1])"
		default: text = "\(top[0]), \(top[1]) & more"
		}
		return "TODAY · \(text.uppercased())"
	}

	private static func brandLogoUrl(_ brand: BrandSummaryDto) -> String? {
		brand.logo ?? brand.domain.map { "https://cdn.brandfetch.io/\($0)/w/400/h/400" }
	}

	private static let cardColorPalette: [(top: Color, art: Color)] = [
		(Color(argb: 0xFF152A47), Color(argb: 0xFF142844)),
		(Color(argb: 0xFF283E5D), Color(argb: 0xFF253A59)),
		(Color(argb: 0xFF263D5D), Color(argb: 0xFF2F486E)),
		(Color(argb: 0xFF1A2E4A), Color(argb: 0xFF192C47)),
		(Color(argb: 0xFF1E3552), Color(argb: 0xFF1B3050)),
		(Color(argb: 0xFF162840), Color(argb: 0xFF15263E)),
		(Color(argb: 0xFF233549), Color(argb: 0xFF203246)),
	]
}

private let priceFormatter: NumberFormatter = {
	let f = NumberFormatter()
	f.locale = Locale(identifier: "en_US_POSIX")
	f.numberStyle = .decimal
	f.usesGroupingSeparator = true
	f.groupingSeparator = ","
	f.decimalSeparator = "."
	f.minimumFractionDigits = 2
	f.maximumFractionDigits = 2
	return f
}()

/// "$1,234.50" (Android's "%,.2f").
func formatPrice(_ price: Double) -> String {
	"$" + (priceFormatter.string(from: NSNumber(value: price)) ?? String(format: "%.2f", price))
}

/// "▲ 1.2% today"
func formatChange(_ pct: Double) -> String {
	"\(pct >= 0 ? "▲" : "▼") \(String(format: "%.1f", abs(pct)))% today"
}
