import Foundation

// A port of android ui/discover/StockDetailViewModel.kt and StockDetailCache.kt: the stock page's live data, each
// part published as it lands, kept per stock so a revisit (or a relaunch) starts from what it last showed.

/// A price to measure a save against. `atMoment`: the price at the minute of the save, not that day's close - a real
/// price, but a different moment, which the copy has to distinguish.
struct SavedReference: Equatable {
	let price: Double
	let atMoment: Bool
}

/// One "Compare and learn" row: this stock's value, then each peer's.
struct CompareValues: Codable, Equatable {
	let label: String
	let a: String
	let b: String
	let c: String
	var green = false
}

/// A news card's source line ("Reuters · 2h ago") and its sentiment pill.
struct NewsSourceTag: Codable, Equatable {
	let source: String
	let tag: String
}

/// A "Numbers that matter" verdict ("Peers 26.8x") and whether it reads as good, judged against the peer median.
struct StatVerdict: Codable, Equatable {
	let text: String
	let good: Bool
}

/// A recent analyst action: firm, rating, target.
struct AnalystRow: Codable, Equatable {
	let firm: String
	let action: String
	let target: String
}

/// The risk track's width in design units (the card's width less its padding).
private let riskTrack: Double = 289

/// Everything the page shows from the server. Optional fields are sections still arriving (or absent).
struct LiveDetail: Codable, Equatable {
	var price: String
	var change: String
	/// The company's name, so the page titles itself with the stock it's showing.
	var name: String?
	/// Where the Risk fit pill sits on its track, read from beta.
	var riskPillX: Double?
	var riskCopy: String?
	/// The two company stories: ("Reuters · 2h ago", "Bullish") with their headlines.
	var newsSources: [NewsSourceTag]?
	var newsHeadlines: [String]?
	/// "vs AMD · TSM", and the two peers the Compare table's columns belong to.
	var peersLabel: String?
	var peerA: String?
	var peerB: String?
	var compareRows: [CompareValues]?
	var statVerdicts: [StatVerdict]?
	var peRatioValue: String?
	var revenueGrowthValue: String?
	var profitMarginValue: String?
	var upside: String?
	var targetLow: String?
	var targetAvg: String?
	var targetHigh: String?
	var targetMarkerX: Double?
	var consensus: String?
	var buyCount: String?
	var holdCount: String?
	var sellCount: String?
	var buyBarW: Double?
	var actions: [AnalystRow]?
	var newsSignal: String?
	var newsClose: String?
	var earningsStr: String?

	/// This detail with any section it hasn't got yet taken from `previous` - only while the page's parts are still
	/// arriving, never for the finished page.
	func orPrevious(_ p: LiveDetail) -> LiveDetail {
		var d = self
		d.name = name ?? p.name
		d.riskPillX = riskPillX ?? p.riskPillX
		d.riskCopy = riskCopy ?? p.riskCopy
		d.newsSources = newsSources ?? p.newsSources
		d.newsHeadlines = newsHeadlines ?? p.newsHeadlines
		d.peersLabel = peersLabel ?? p.peersLabel
		d.peerA = peerA ?? p.peerA
		d.peerB = peerB ?? p.peerB
		d.compareRows = compareRows ?? p.compareRows
		d.statVerdicts = statVerdicts ?? p.statVerdicts
		d.peRatioValue = peRatioValue ?? p.peRatioValue
		d.revenueGrowthValue = revenueGrowthValue ?? p.revenueGrowthValue
		d.profitMarginValue = profitMarginValue ?? p.profitMarginValue
		d.upside = upside ?? p.upside
		d.targetLow = targetLow ?? p.targetLow
		d.targetAvg = targetAvg ?? p.targetAvg
		d.targetHigh = targetHigh ?? p.targetHigh
		d.targetMarkerX = targetMarkerX ?? p.targetMarkerX
		d.consensus = consensus ?? p.consensus
		d.buyCount = buyCount ?? p.buyCount
		d.holdCount = holdCount ?? p.holdCount
		d.sellCount = sellCount ?? p.sellCount
		d.buyBarW = buyBarW ?? p.buyBarW
		d.actions = actions ?? p.actions
		d.newsSignal = newsSignal ?? p.newsSignal
		d.newsClose = newsClose ?? p.newsClose
		d.earningsStr = earningsStr ?? p.earningsStr
		return d
	}
}

// MARK: - Chart helpers (android data/ChartSeries.kt)

/// The line's padding from the box's top and bottom, as a fraction of its height.
private let chartEdge: CGFloat = 0.08

/// Prices as fractions of the chart's height (0 = bottom), min to max, a little in from both edges; a flat series
/// sits mid-height.
func chartFractions(_ values: [Double]) -> [CGFloat] {
	guard let low = values.min(), let high = values.max() else { return [] }
	let span = high - low
	return values.map { v in
		guard span > 1e-9 else { return 0.5 }
		return min(1, max(0, chartEdge + CGFloat((v - low) / span) * (1 - 2 * chartEdge)))
	}
}

/// True once every one of `prices` is still pre-market - nothing has traded in the regular session yet. A handful of
/// tightly clustered pre-market ticks, drawn as a 1D line against yesterday's close, reads as a dramatic move that
/// hasn't happened (root-caused 2026-09-17); the page says "Not much movement yet today" instead.
func allPreMarket(_ prices: [ChartPoint]) -> Bool {
	!prices.isEmpty && prices.allSatisfy { $0.session == "pre" }
}

// MARK: - Cache (android StockDetailCache.kt)

/// What each stock's page last showed. Re-entry renders it and corrects it in place, instead of a page of
/// placeholders on every visit; details are also kept on the phone, so the first open after a relaunch starts from
/// them too.
enum StockDetailCache {
	/// How long a same-day quote still stands in for the current one.
	private static let freshFor: TimeInterval = 30 * 60
	/// Enough for a browsing session; the oldest entries fall off the end.
	private static let maxEntries = 24

	private struct Entry: Codable {
		var at: Date
		var day: String
		var detail: LiveDetail
	}

	/// A drawn line and the move across it, which decides the line's colour.
	struct ChartData {
		let series: [CGFloat]
		let pct: Double
	}

	private static var details: [String: Entry] = [:]
	private static var detailOrder: [String] = []
	private static var charts: [String: ChartData] = [:]
	private static var chartOrder: [String] = []

	/// The last detail for `symbol`. The slow-moving half - peers, metrics, analysts, news - is kept as it was. What
	/// belongs to a moment isn't: from an earlier US trading day the price, the day's move and the News signal's move
	/// line and "why it moved" all described another session, so they go; from today but older than 30 minutes, the
	/// price and move go - a quote from hours ago mustn't sit under a "today" label.
	static func detail(_ symbol: String) -> LiveDetail? {
		guard let entry = details[symbol] ?? fromDisk(symbol) else { return nil }
		if details[symbol] == nil {
			details[symbol] = entry
			detailOrder.append(symbol)
			while detailOrder.count > maxEntries { details[detailOrder.removeFirst()] = nil }
		}
		var d = entry.detail
		if entry.day != StakClock.marketDay() {
			d.price = "—"; d.change = ""; d.newsClose = nil; d.newsSignal = nil
			return d
		}
		if Date().timeIntervalSince(entry.at) >= freshFor { d.price = "—"; d.change = "" }
		return d
	}

	/// When `detail`'s price was fetched, if that price is still shown.
	static func priceAt(_ symbol: String) -> Date? {
		guard let entry = details[symbol], entry.day == StakClock.marketDay(),
			  Date().timeIntervalSince(entry.at) < freshFor else { return nil }
		return entry.at
	}

	/// Remembers `detail`, whose price was fetched at `priceAt`. `persist: false` keeps it in memory only: the price
	/// refresh runs every 15 seconds, and rewriting every cached page that often is wasted work.
	static func put(_ symbol: String, _ detail: LiveDetail, persist: Bool = true, priceAt: Date = Date()) {
		let entry = Entry(at: priceAt, day: StakClock.marketDay(), detail: detail)
		details[symbol] = entry
		detailOrder.removeAll { $0 == symbol }
		detailOrder.append(symbol)
		while detailOrder.count > maxEntries { details[detailOrder.removeFirst()] = nil }
		if persist { toDisk(symbol, entry) }
	}

	private static func fromDisk(_ symbol: String) -> Entry? {
		guard let data = StakStore.data("stockpage.\(symbol)") else { return nil }
		return try? JSONDecoder().decode(Entry.self, from: data)
	}

	/// Written per symbol with a most-recent-first index, so the phone keeps the same 24 as memory.
	private static func toDisk(_ symbol: String, _ entry: Entry) {
		guard let data = try? JSONEncoder().encode(entry) else { return }
		StakStore.set(data, for: "stockpage.\(symbol)")
		let previous = (StakStore.string("stockpage.index") ?? "").split(separator: ",").map(String.init)
		let index = [symbol] + previous.filter { !$0.isEmpty && $0 != symbol }
		for dropped in index.dropFirst(maxEntries) { StakStore.remove("stockpage.\(dropped)") }
		StakStore.set(index.prefix(maxEntries).joined(separator: ","), for: "stockpage.index")
	}

	/// A finished period's closes don't change, so its line is kept as drawn - except today's, still being extended.
	static func chart(_ symbol: String, _ range: String) -> ChartData? {
		range.lowercased() == "1d" ? nil : charts["\(symbol):\(range)"]
	}

	static func putChart(_ symbol: String, _ range: String, _ data: ChartData) {
		guard range.lowercased() != "1d" else { return }
		let key = "\(symbol):\(range)"
		charts[key] = data
		chartOrder.removeAll { $0 == key }
		chartOrder.append(key)
		while chartOrder.count > maxEntries { charts[chartOrder.removeFirst()] = nil }
	}
}

// MARK: - The view model

@MainActor
final class StockDetailViewModel: ObservableObject {
	@Published private(set) var liveDetail: LiveDetail? = nil
	/// What could go wrong at this company, and what decides its story; nil until it lands.
	@Published private(set) var riskWatch: RiskWatchResponse? = nil
	/// Said plainly when the look-up fails, rather than leaving the cards blank.
	@Published private(set) var riskWatchFailed = false
	/// This stock's line for the selected range, as fractions of the chart's height.
	@Published private(set) var chartSeries: [CGFloat]? = nil
	/// The range came back with no prices - draw nothing, don't invent a line.
	@Published private(set) var chartMissing = false
	/// Today's chart is all still pre-market: shown as its own honest state, not the line.
	@Published private(set) var chartNoMovementYet = false
	/// The move across the selected range, measured from its own first close.
	@Published private(set) var chartPct: Double? = nil
	/// The price a save from before stamping is measured against (see savedReference(for:)).
	@Published private(set) var savedReference: SavedReference? = nil
	/// Whether that look-up has finished: before and after a failed look-up read the same otherwise.
	@Published private(set) var savedReferenceSettled = false
	/// Whether this visit's page fetch has finished, whatever it brought back.
	@Published private(set) var detailSettled = false
	/// When the price on screen was fetched, or nil while none is shown.
	@Published private(set) var priceAt: Date? = nil
	/// The quote is still on its way - the "Updating" label follows this, not the whole page.
	@Published private(set) var quotePending = false

	private let repo = StockRepository.shared
	private var chartKey: String? = nil
	/// Yesterday's close: today is measured from it - the price above the chart and the 1D line itself.
	private var prevClose: Double? = nil
	/// Today's real chart points, so the line (or its "no movement yet" read) can be redrawn when the quote lands.
	private var todayPrices: [ChartPoint]? = nil
	/// When today's line was last refetched; the server rebuilds it every five minutes.
	private var todayChartAt = Date.distantPast
	private var fetchTask: Task<Void, Never>? = nil
	private var riskTask: Task<Void, Never>? = nil
	private var referenceTask: Task<Void, Never>? = nil
	private var chartTask: Task<Void, Never>? = nil
	private var quoteTask: Task<Void, Never>? = nil
	/// The direction the shown "why it moved" text explains, so a refresh can tell when it no longer fits.
	private var explainedDirection: String? = nil
	/// When the price refresh last wrote this page to the phone.
	private var persistedAt = Date.distantPast

	/// Leaving the page: nothing it started keeps running (or keeps the page's model alive) after it's gone.
	func stop() {
		for task in [fetchTask, riskTask, referenceTask, chartTask, quoteTask] { task?.cancel() }
	}

	/// Draws the chart from this stock's own closes for `range` ("3M" -> "3m").
	func selectRange(_ symbol: String, _ range: String) {
		let key = "\(symbol):\(range)"
		guard chartKey != key else { return }
		chartKey = key
		// The previous line belongs to another stock or period, so it goes at once - replaced by this one's own line
		// when it has been drawn before.
		let cached = StockDetailCache.chart(symbol, range)
		chartSeries = cached?.series
		chartPct = cached?.pct
		chartMissing = false
		chartNoMovementYet = false
		chartTask?.cancel()
		chartTask = Task {
			let prices = (try? await repo.getChart(symbol, range: range.lowercased()))?.prices.filter { $0.close > 0 }
			let usable = (prices?.count ?? 0) >= 2 ? prices : nil
			// A slow reply for a range already left behind mustn't land.
			guard chartKey == key else { return }
			let closes = usable?.map(\.close)
			let fractions = closes.map(chartFractions)
			let today = range.uppercased() == "1D"
			if today { todayPrices = usable }
			let noMovementYet = today && usable.map(allPreMarket) == true
			// Today starts at yesterday's close, so that's the line's first point and the figure's reference; any other
			// range measures from its own first close. Not while it's all pre-market - that reference turns a few flat
			// overnight ticks into a line that looks like a real move.
			let points = today && !noMovementYet ? closes.map { (prevClose.map { [$0] } ?? []) + $0 } : closes
			let pct = points.flatMap { p -> Double? in
				guard let first = p.first, let last = p.last, first != 0 else { return nil }
				return (last - first) / first * 100
			}
			chartNoMovementYet = noMovementYet
			chartSeries = noMovementYet ? nil : (points.map(chartFractions) ?? fractions)
			chartPct = noMovementYet ? nil : pct
			chartMissing = !noMovementYet && fractions == nil
			if !noMovementYet, let fractions, let pct {
				StockDetailCache.putChart(symbol, range, .init(series: fractions, pct: pct))
			}
		}
	}

	/// Redraws today's line against yesterday's close: the chart and the quote are fetched side by side, so the line
	/// is often drawn before the close is known - and from the day's open it can run red on a day the price calls up.
	private func redrawTodayLine() {
		guard let prices = todayPrices, let prev = prevClose, chartKey?.hasSuffix(":1D") == true else { return }
		if allPreMarket(prices) {
			chartNoMovementYet = true
			chartSeries = nil
			chartPct = nil
			return
		}
		chartNoMovementYet = false
		let points = [prev] + prices.map(\.close)
		chartSeries = chartFractions(points)
		chartPct = (points[points.count - 1] - points[0]) / points[0] * 100
	}

	private enum Part {
		case analyst(AnalystResponse?)
		case actions([AnalystAction]?)
		case earnings(EarningsResponse?)
		case news(CompanyNewsResponse?)
		case peers(PeerMetricsResponse?, [String], [StockDetailResponse?])
		case stock(StockDetailResponse?)
		case move(DailyMoveResponse?)
	}

	private struct Parts {
		var stock: StockDetailResponse? = nil
		var analyst: AnalystResponse? = nil
		var actions: [AnalystAction]? = nil
		var move: DailyMoveResponse? = nil
		var earnings: EarningsResponse? = nil
		var news: CompanyNewsResponse? = nil
		var peers: PeerMetricsResponse? = nil
		var peerTickers: [String] = []
		var peerStocks: [StockDetailResponse?] = []
	}

	/// `needsReference`: the My STAK entry's Since you saved reads the save's reference price; no other entry does.
	func fetch(_ symbol: String, needsReference: Bool) {
		// One fetch at a time: a second call left two sets of requests racing, the last overwriting the other.
		fetchTask?.cancel()
		riskTask?.cancel()
		referenceTask?.cancel()
		// Its own request: the snapshot is generated once a day per stock and mustn't hold the price behind it.
		riskWatch = nil
		riskWatchFailed = false
		prevClose = nil
		todayPrices = nil
		chartNoMovementYet = false
		let repo = self.repo
		riskTask = Task {
			let rw = try? await repo.getRiskWatch(symbol)
			guard !Task.isCancelled else { return }
			if let rw { riskWatch = rw } else { riskWatchFailed = true }
		}
		fetchTask = Task {
			// What this stock last showed while its own data is on the way, instead of placeholders on every re-entry.
			if let cached = StockDetailCache.detail(symbol) {
				liveDetail = cached
				priceAt = StockDetailCache.priceAt(symbol)
			}
			// Alongside the page, not ahead of it: awaited first, this held back the quote and the whole page.
			savedReferenceSettled = false
			referenceTask = Task {
				let reference = needsReference && MyStakHoldings.shared.priceAtSave(symbol) == nil ? await savedReference(for: symbol) : nil
				guard !Task.isCancelled else { return }
				savedReference = reference
				savedReferenceSettled = true
			}
			detailSettled = false

			// Each part is published as it lands: the page used to wait for the slowest of ten requests - one slow AI
			// summary held back the price and everything else. Only "why it moved" needs the quote first.
			var parts = Parts()
			@MainActor func publish() {
				guard let built = buildDetail(parts) else { return }
				liveDetail = liveDetail.map { built.orPrevious($0) } ?? built
			}
			quotePending = true
			await withTaskGroup(of: Part.self) { group in
				group.addTask { .analyst(try? await repo.getAnalyst(symbol)) }
				group.addTask { .actions(try? await repo.getAnalystActions(symbol)) }
				group.addTask { .earnings(try? await repo.getEarnings(symbol)) }
				group.addTask { .news(try? await repo.getCompanyNews(symbol)) }
				group.addTask {
					// The peer group names the Compare columns; each peer's own metrics fill them (peer-metrics returns
					// medians for the group, which can't describe two separate columns).
					let peerGroup = try? await repo.getPeerMetrics(symbol)
					let tickers = Array((peerGroup?.peerTickers ?? []).prefix(2))
					async let first = tickers.count > 0 ? try? await repo.getStock(tickers[0]) : nil
					async let second = tickers.count > 1 ? try? await repo.getStock(tickers[1]) : nil
					let stocks = Array([await first, await second].prefix(tickers.count))
					return .peers(peerGroup, tickers, stocks)
				}
				group.addTask { .stock(try? await repo.getStock(symbol)) }
				// next(), not for-await: the quote's arrival adds the "why it moved" request to this same group.
				while let part = await group.next() {
					guard !Task.isCancelled else { return }
					switch part {
					case .analyst(let a): parts.analyst = a
					case .actions(let a): parts.actions = a
					case .earnings(let e): parts.earnings = e
					case .news(let n): parts.news = n
					case .peers(let p, let tickers, let stocks):
						parts.peers = p; parts.peerTickers = tickers; parts.peerStocks = stocks
					case .stock(let s):
						parts.stock = s
						if s?.quote?.price != nil { priceAt = Date() }
						quotePending = false
						let pct = s?.quote?.changePercent ?? 0
						group.addTask { .move(try? await repo.getDailyMove(symbol, pct: pct)) }
					case .move(let m):
						parts.move = m
						explainedDirection = m?.direction
					}
					publish()
				}
			}
			guard !Task.isCancelled else { return }
			quotePending = false
			// Everything is back: the full build replaces the merged one, so a section that genuinely came back empty
			// shows as empty rather than as cached. A failed quote leaves what's on screen alone.
			if let built = buildDetail(parts) {
				liveDetail = built
				StockDetailCache.put(symbol, built, priceAt: priceAt ?? Date())
			}
			detailSettled = true
		}
	}

	/// The News signal's move line, named for the session it belongs to ("today" mid-session, "at Friday's close"
	/// before Monday's open) - the clock the web uses.
	private func newsCloseLine(_ pct: Double) -> String {
		let session = StakClock.lastCloseRef()
		return pct >= 0 ? "▲ +\(String(format: "%.1f", pct))% \(session)" : "▼ \(String(format: "%.1f", abs(pct)))% \(session)"
	}

	/// Today's price again for the page on screen - every 15 seconds while it's showing and the market is open. Only
	/// the figures a quote carries move; the rest of the page stays as it was.
	func refreshQuote(_ symbol: String, range: String) {
		guard StakClock.lastCloseRef() == "today", liveDetail != nil, detailSettled, quoteTask == nil else { return }
		quoteTask = Task {
			defer { quoteTask = nil }
			guard let quote = (try? await repo.getStock(symbol))?.quote, let price = quote.price, price > 0 else { return }
			if let close = quote.prevClose, close > 0 { prevClose = close }
			guard let pct = quote.changePercent, var updated = liveDetail, !Task.isCancelled else { return }
			updated.price = formatPrice(price)
			updated.change = formatChange(pct)
			updated.newsClose = newsCloseLine(pct)
			liveDetail = updated
			priceAt = Date()
			// In memory every time; to the phone at most once a minute.
			let persist = Date().timeIntervalSince(persistedAt) > 60
			if persist { persistedAt = Date() }
			StockDetailCache.put(symbol, updated, persist: persist)

			// The "why it moved" text explains one direction: if the stock has turned since, ask for the new one.
			let direction = pct > 0.15 ? "up" : (pct < -0.15 ? "down" : "flat")
			if explainedDirection != nil && direction != explainedDirection {
				explainedDirection = direction
				if let move = try? await repo.getDailyMove(symbol, pct: pct) {
					explainedDirection = move.direction
					if !move.explanation.isEmpty { liveDetail?.newsSignal = move.explanation }
				}
			}
			// The line follows the new price without another request; the chart itself is refetched every few minutes.
			redrawTodayLine()
			if range.uppercased() == "1D" && Date().timeIntervalSince(todayChartAt) > 5 * 60 {
				todayChartAt = Date()
				await refreshTodayLine(symbol)
			}
		}
	}

	private func refreshTodayLine(_ symbol: String) async {
		let key = "\(symbol):1D"
		guard chartKey == key,
			  let prices = (try? await repo.getChart(symbol, range: "1d"))?.prices.filter({ $0.close > 0 }), prices.count >= 2,
			  chartKey == key else { return }
		todayPrices = prices
		chartMissing = false
		if allPreMarket(prices) {
			chartNoMovementYet = true
			chartSeries = nil
			chartPct = nil
			return
		}
		chartNoMovementYet = false
		let points = (prevClose.map { [$0] } ?? []) + prices.map(\.close)
		chartSeries = chartFractions(points)
		chartPct = (points[points.count - 1] - points[0]) / points[0] * 100
	}

	// MARK: - Building the page

	private func buildDetail(_ parts: Parts) -> LiveDetail? {
		// A $0 quote is no price: the page keeps "—" rather than show $0.00 and divide by it for the upside.
		guard let quote = parts.stock?.quote, let price = quote.price, price > 0 else { return nil }
		let pct = quote.changePercent ?? 0
		// Yesterday's close as the server reports it - deriving it as price - change was wrong whenever the price came
		// from an extended session and the change described the regular one.
		if let close = quote.prevClose, close > 0 { prevClose = close }
		redrawTodayLine()

		let metrics = parts.stock?.metrics
		let pt = parts.analyst?.priceTarget
		let rec = parts.analyst?.recommendation
		let upside: String? = pt?.avg.map { avg in
			let upsidePct = (avg - price) / price * 100
			return upsidePct >= 0
				? "↑ \(String(format: "%.1f", upsidePct))% upside"
				: "↓ \(String(format: "%.1f", abs(upsidePct)))% downside"
		}
		var targetMarkerX: Double? = nil
		if let low = pt?.low, let avg = pt?.avg, let high = pt?.high, high > low {
			targetMarkerX = min(166, max(0, (avg - low) / (high - low) * 166))
		}
		let totalBuy = (rec?.strongBuy ?? 0) + (rec?.buy ?? 0)
		let totalHold = rec?.hold ?? 0
		let totalSell = (rec?.sell ?? 0) + (rec?.strongSell ?? 0)
		let total = totalBuy + totalHold + totalSell

		let firstTwo = Array((parts.news?.articles ?? []).prefix(2))
		let articles: [NewsArticleDto]? = firstTwo.isEmpty ? nil : firstTwo
		let newsSources = articles?.map { a -> NewsSourceTag in
			let pieces = [a.source.isEmpty ? nil : a.source, a.datetime > 0 ? StakClock.newsAge(a.datetime) + " ago" : nil]
			return NewsSourceTag(source: pieces.compactMap { $0 }.joined(separator: " · "), tag: a.sentiment.prefix(1).uppercased() + a.sentiment.dropFirst())
		}

		let peerA = parts.peerTickers.first
		let peerB = parts.peerTickers.count > 1 ? parts.peerTickers[1] : nil
		// What the peer group actually is ("Peers 26.8x"), so the reader can compare for themselves; the colour still
		// carries the direction, judged against the same median.
		let statVerdicts: [StatVerdict]? = parts.peers.map { p in [
			peerLine(metrics?.peRatio, p.pe, higherIsBetter: nil) { "Peers \(Self.format1($0))x" },
			peerLine(Self.percentValue(metrics?.revenueGrowth), p.revenueGrowth, higherIsBetter: true) { "Peers \(Self.format1($0))%" },
			peerLine(Self.percentValue(metrics?.profitMargin), p.profitMargin, higherIsBetter: true) { "Peers \(Self.format1($0))%" },
		] }
		// Beta is volatility against the market, so the market (1.0) sits mid-track.
		let beta = metrics?.beta
		let riskCopy: String? = beta.map { b in
			if b < 0.8 { return "Moves less than the market. Fits the steady side of your profile." }
			if b <= 1.2 { return "Moves roughly with the market, neither calm nor sharp." }
			if b <= 1.6 { return "Moves more than the market. Expect bigger swings than average." }
			return "Moves far more than the market. Expect sharp swings either way."
		}

		return LiveDetail(
			price: formatPrice(price),
			change: formatChange(pct),
			name: parts.stock?.name,
			riskPillX: beta.map { min(1, max(0, $0 / 2)) * riskTrack },
			riskCopy: riskCopy,
			newsSources: newsSources,
			newsHeadlines: articles?.map(\.headline),
			peersLabel: parts.peerTickers.isEmpty ? nil : "vs " + parts.peerTickers.joined(separator: " · "),
			peerA: peerA,
			peerB: peerB,
			compareRows: peerA == nil ? nil : compareRows(metrics, parts.peerStocks),
			statVerdicts: statVerdicts,
			peRatioValue: metrics?.peRatio.map { String(format: "%.1f", $0) },
			revenueGrowthValue: metrics?.revenueGrowth,
			profitMarginValue: metrics?.profitMargin,
			upside: upside,
			targetLow: pt?.low.map { "$\(Int($0))" },
			targetAvg: pt?.avg.map { "$\(Int($0))" },
			targetHigh: pt?.high.map { "$\(Int($0))" },
			targetMarkerX: targetMarkerX,
			consensus: total > 0 ? "WALL ST. CONSENSUS · \(total) ANALYSTS" : nil,
			buyCount: total > 0 ? "● Buy \(totalBuy)" : nil,
			holdCount: total > 0 ? "Hold \(totalHold)" : nil,
			sellCount: total > 0 ? "Sell \(totalSell)" : nil,
			buyBarW: total > 0 ? Double(totalBuy) / Double(total) * 318 : nil,
			actions: parts.actions.map { $0.prefix(5).map { AnalystRow(firm: $0.firm, action: $0.action, target: $0.priceTarget.map { "$\(Int($0))" } ?? "—") } },
			newsSignal: parts.move.flatMap { $0.explanation.isEmpty ? nil : $0.explanation },
			// No quote, no line: "+0.0%" would state a move.
			newsClose: quote.changePercent.map(newsCloseLine),
			earningsStr: Self.earningsLine(parts.earnings)
		)
	}

	/// What to measure a save from before price-stamping against. The exact minute is preferred - that session's
	/// intraday points can still be fetched - and only otherwise the day's close.
	private func savedReference(for symbol: String) async -> SavedReference? {
		if let instant = MyStakHoldings.shared.savedInstant(symbol) {
			let points = (try? await repo.getChart(symbol, range: "1d"))?.prices ?? []
			let nearest = points.compactMap { p -> (Int64, Double)? in
				guard p.close > 0, let sec = Self.epochSeconds(p.ts) else { return nil }
				return (sec, p.close)
			}.min { abs($0.0 - instant) < abs($1.0 - instant) }
			// Only when the session actually covers the save; otherwise the "nearest" point is another day's.
			if let nearest, abs(nearest.0 - instant) <= 60 * 60 { return SavedReference(price: nearest.1, atMoment: true) }
		}
		guard let day = MyStakHoldings.shared.savedEpochDay(symbol) else { return nil }
		let date = Self.dayFormatter.string(from: Date(timeIntervalSince1970: TimeInterval(day) * 86_400))
		let close = (try? await repo.getChart(symbol, range: "1y"))?.prices.last { $0.ts.hasPrefix(date) }?.close
		return close.flatMap { $0 > 0 ? SavedReference(price: $0, atMoment: false) : nil }
	}

	private static let dayFormatter: DateFormatter = {
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.timeZone = TimeZone(identifier: "UTC")
		f.dateFormat = "yyyy-MM-dd"
		return f
	}()

	private static let isoFull: ISO8601DateFormatter = {
		let f = ISO8601DateFormatter()
		f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
		return f
	}()
	private static let isoPlain = ISO8601DateFormatter()

	private static func epochSeconds(_ ts: String) -> Int64? {
		(isoPlain.date(from: ts) ?? isoFull.date(from: ts)).map { Int64($0.timeIntervalSince1970) }
	}

	/// "11.8%" -> 11.8, so a served percentage can be compared with a peer median.
	private static func percentValue(_ s: String?) -> Double? {
		s.flatMap { Double($0.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "%", with: "")) }
	}

	private static func format1(_ v: Double) -> String { String(format: "%.1f", v) }

	/// The peer group's own figure. Growth and margin carry the good colour when this company is clearly on the
	/// better side; a P/E never does - cheaper than peers is as often trouble as a bargain. Compared by difference,
	/// not ratio: a ratio flips sign when either number is negative, which painted a loss-maker green.
	private func peerLine(_ value: Double?, _ median: Double?, higherIsBetter: Bool?, _ label: (Double) -> String) -> StatVerdict {
		guard let median else { return StatVerdict(text: "", good: false) }
		let text = label(median)
		guard let value, let higherIsBetter else { return StatVerdict(text: text, good: false) }
		// A tenth of the peer figure, but never less than a point: a 0.2% median made a 0.1-point gap look decisive.
		let margin = max(abs(median) * 0.1, 1.0)
		return StatVerdict(text: text, good: higherIsBetter ? value - median > margin : median - value > margin)
	}

	/// The four authored comparison rows, this stock against each peer.
	private func compareRows(_ own: StockMetrics?, _ peers: [StockDetailResponse?]) -> [CompareValues] {
		let b = peers.first.flatMap { $0?.metrics }
		let c = peers.count > 1 ? peers[1]?.metrics : nil
		func pe(_ m: StockMetrics?) -> String { m?.peRatio.map { String(format: "%.1f", $0) } ?? "—" }
		// revenueGrowth arrives as "6.1%" / "-4.2%"; the row reads as a signed move.
		func growth(_ m: StockMetrics?) -> String { m?.revenueGrowth.map { $0.hasPrefix("-") ? $0 : "+" + $0 } ?? "—" }
		func margin(_ m: StockMetrics?) -> String { m?.profitMargin ?? "—" }
		func cap(_ m: StockMetrics?) -> String { m?.marketCap ?? "—" }
		return [
			CompareValues(label: "P/E ratio", a: pe(own), b: pe(b), c: pe(c)),
			CompareValues(label: "Rev growth", a: growth(own), b: growth(b), c: growth(c), green: true),
			CompareValues(label: "Profit margin", a: margin(own), b: margin(b), c: margin(c)),
			CompareValues(label: "Market cap", a: cap(own), b: cap(b), c: cap(c)),
		]
	}

	private static let monthDay: DateFormatter = {
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.dateFormat = "MMM d"
		return f
	}()

	private static let isoDay: DateFormatter = {
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.calendar = Calendar(identifier: .gregorian)
		f.dateFormat = "yyyy-MM-dd"
		return f
	}()

	private static func earningsLine(_ earnings: EarningsResponse?) -> String? {
		guard let raw = earnings?.date else { return nil }
		let date = isoDay.date(from: raw)
		switch earnings?.status {
		case "upcoming":
			guard let date else { return nil }
			let cal = Calendar.current
			let days = max(0, cal.dateComponents([.day], from: cal.startOfDay(for: Date()), to: cal.startOfDay(for: date)).day ?? 0)
			return "Next earnings land \(StakClock.daysAhead(days))"
		case "beat", "miss":
			return "Earnings reported \(date.map(monthDay.string) ?? raw) — \(earnings?.status == "beat" ? "beat" : "missed") estimates"
		default:
			return nil
		}
	}
}
