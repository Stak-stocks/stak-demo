import SwiftUI

/// One portfolio row's strings (1:4496): badge, ticker + picked line, P&L right.
struct SimPick: Codable, Equatable {
	var badge: String
	var ticker: String
	var sub: String
	var amount: String
	var pct: String
	var up: Bool
}

/// The paper portfolio behind Simulate - one store the hero (1:3898), the Portfolio page (1:4496), Pick detail (1:4631)
/// and every practice-buy ticket read, so a buy moves cash into a position and a sell moves it back.
///
/// The demo persona is seeded from the authored numbers and kept on the phone. A real account's cash, positions, open
/// orders and trade log live on the server (the sandbox endpoints web's Simulate uses too): every change is applied here
/// at once, so the screen answers immediately, then sent in the background and reconciled with `hydrate` once it
/// resolves - a failure says so (`lastError`) and the next read puts the real numbers back. Mirrors android
/// ui/simulate/PaperPortfolio.kt.
@MainActor
final class PaperPortfolio: ObservableObject {
	static let shared = PaperPortfolio()

	/// The paper stake everyone starts on ("on $10,000 paper", 1:3898).
	nonisolated static let defaultPaperStart = 10000.0
	/// What an account that trades before setting up is called.
	nonisolated static let defaultPortfolioName = "My first portfolio"
	nonisolated static let defaultStrategy = "Balanced"
	/// The demo hero's week figures (1:3898).
	nonisolated static let weekGain = "+$186"
	nonisolated static let weekPct = "+1.9%"
	/// The authored hero (1:3924): $10,240.00, of which $8,800.00 is cash.
	private nonisolated static let authoredValue = 10240.0
	private nonisolated static let seedCash = 8800.0

	/// Portfolio setup (FigJam Simulate board, 2026-09-14: Choose balance, Name, Strategy). A NEW account picks its
	/// starting balance before its first trade; the demo persona is the authored $10,000 portfolio.
	@Published private(set) var paperStart = PaperPortfolio.defaultPaperStart
	@Published private(set) var portfolioName = ""
	@Published private(set) var strategy = ""
	@Published private(set) var setupDone = false
	/// A read of this account has landed. Until it has, nothing about the portfolio is known - least of all that it
	/// needs setting up: a failed first read once showed the setup card to a funded portfolio, and submitting it
	/// erases the account's positions and trades on the server.
	@Published private(set) var hasHydrated = false
	/// True until a real account's first read of its ledger lands - Simulate holds the hero back meanwhile, so a
	/// returning account never flashes the setup card and "$10,000 paper" first. Later reads (the 15s poll, the re-read
	/// after a trade) don't set it: the hero stays put while they run.
	@Published private(set) var loading = false
	/// A real account's background buy / sell / setup / order / cancel that failed on the server. The screen already
	/// showed it done; this is the only signal that it didn't happen (the next read corrects the numbers regardless).
	@Published private(set) var lastError: String? = nil
	/// Every buy and sell, newest first (FigJam: Trade history).
	@Published private(set) var trades: [Trade] = []
	/// Limit orders waiting for their price, newest first (FigJam: Order pending).
	@Published private(set) var openOrders: [OpenOrder] = []
	/// The authored demo account, or a real one.
	@Published private(set) var demo = true
	@Published private(set) var cash = PaperPortfolio.seedCash
	@Published private(set) var positions: [Position] = PaperPortfolio.seedPositions()
	@Published private(set) var realized: [Realized] = PaperPortfolio.seedRealized

	private var baseValue = PaperPortfolio.authoredValue
	private var baseCash = PaperPortfolio.seedCash
	/// The seeded rows' stake - the authored figure counts picks the frame never lists, so value is tracked as the
	/// authored number plus moves.
	private var baseHoldings = PaperPortfolio.seedPositions().reduce(0) { $0 + $1.stake }

	/// Every read claims the next generation; an older one finishing last is discarded rather than overwriting a newer
	/// snapshot (a buy then an immediate sell each reconcile, and their round trips can land out of order).
	private var hydrateGeneration = 0
	/// The last ledger pulled from the server and the newest trade it was current as of - kept apart from `trades`,
	/// which buy/sell edit ahead of the server, so a failed change's guessed row is never mistaken for the server's.
	private var serverTrades: [Trade] = []
	private var serverTradeCursor: Int64? = nil
	/// The read in flight - one at a time; asked again meanwhile, it reads once more when this one finishes.
	private var hydrateTask: Task<Void, Never>? = nil
	private var readAgain = false
	/// The last change sent to the server: each waits for the one before, so a buy then a quick sell arrive in order.
	private var lastChange: Task<Void, Never>? = nil
	/// Company names already read - the ledger carries only tickers, and a name doesn't change.
	private var names: [String: String] = [:]
	/// When each held stock was first bought - "This week" measures from the buy when it was this week, not from a
	/// week start the account didn't hold it at.
	@Published private(set) var pickedAt: [String: Date] = [:]

	private let repo = StockRepository.shared

	private init() {}

	// MARK: - Reads

	/// The setup card shows until a real account has set up (server-confirmed or the local default from ensureSetup).
	var needsSetup: Bool { !demo && hasHydrated && !setupDone }

	/// All-time gain = today's value over the paper start (the demo's authored $240 falls out of its $10,240).
	var allTimeGain: Double { portfolioValue - paperStart }

	/// The hero's gain line: the demo's authored week, a real account's gain since it started (labelled all time).
	var weekUp: Bool { demo ? true : allTimeGain > -0.005 }
	var weekGainText: String { demo ? PaperPortfolio.weekGain : PaperPortfolio.signedWhole(allTimeGain) }
	/// "this week" for the demo's authored figure; a real account's line is its gain since it started.
	var gainPeriodLabel: String { demo ? "this week" : "all time" }
	var weekPctText: String { demo ? PaperPortfolio.weekPct : PaperPortfolio.signedPct(allTimeGain / paperStart * 100) }

	// The share buttons' lines (pick page, portfolio page): the return in percent, never the dollars. The demo's
	// authored numbers aren't anyone's, and an empty portfolio has nothing to tell - both share the invite.
	/// A pick's line - "just picked" while its gain still reads 0.0%.
	func pickShareText(_ spec: PickSpec) -> String {
		if demo { return inviteText }
		if spec.gainPct == "0.0%" { return "I just picked \(spec.symbol) on STAK. \(PaperPortfolio.shareTail)" }
		return "I'm paper trading \(spec.symbol) on STAK - \(spec.up ? "up" : "down") \(spec.gainPct) since I picked it. \(PaperPortfolio.shareTail)"
	}

	/// The portfolio's line - its all-time return.
	var portfolioShareText: String {
		if demo || (positions.isEmpty && realized.isEmpty) { return inviteText }
		let pct = allTimeGain / paperStart * 100
		let shown = String(format: "%.1f", abs(pct))
		let move = shown == "0.0" ? "even" : "\(pct > 0 ? "up" : "down") \(shown)%"
		return "My STAK paper portfolio is \(move) so far. \(PaperPortfolio.shareTail)"
	}

	private static let shareTail = "Practice investing with paper money: https://thestak.org"

	/// "12 picks" is authored for the demo (its rows list six); a real account counts its own.
	var pickCountLabel: Int { demo ? 12 + (positions.count - PaperPortfolio.seedRows.count) : positions.count }
	/// "1 pick" / "12 picks".
	var pickCountText: String { pickCountLabel == 1 ? "1 pick" : "\(pickCountLabel) picks" }

	/// The authored $10,240.00 plus every move since: a buy swaps cash for stake at cost and a sell swaps stake back at
	/// value. A real account's holdings are marked at today's live price, so the hero moves with the market; a reserved
	/// limit stake is still the account's money until it fills or is canceled.
	var portfolioValue: Double {
		baseValue + (cash - baseCash) + (positions.reduce(0) { $0 + $1.liveValue } - baseHoldings) + openOrders.reduce(0) { $0 + $1.amount }
	}

	var pickCount: Int { positions.count }

	/// Today's shares by symbol - where the history chart's backward replay starts.
	var heldShares: [String: Double] {
		Dictionary(positions.map { ($0.spec.symbol, Double($0.spec.shares) ?? 0) }, uniquingKeysWith: +)
	}

	/// Cash plus the open limit orders' reserved stakes - the account's money that isn't in shares.
	var uninvested: Double { cash + openOrders.reduce(0) { $0 + $1.amount } }

	func holds(_ symbol: String) -> Bool { positions.contains { $0.spec.symbol == symbol } }

	/// The pick's numbers, re-priced off today's quote for a real account - the demo's authored spec unchanged.
	func pickSpec(_ symbol: String) -> PickSpec? { positions.first { $0.spec.symbol == symbol }?.liveSpec }

	/// True when the cash on hand covers the stake - the ticket's pills and the confirm both read it.
	func canBuy(_ amount: Double) -> Bool { amount > 0 && amount <= cash }

	func dismissError() { lastError = nil }

	// MARK: - Account

	/// Seeds the authored demo history, or (real account) clears to a loading shell and reads the server.
	func reset(demo: Bool) {
		self.demo = demo
		hydrateGeneration += 1
		lastError = nil
		if demo {
			paperStart = PaperPortfolio.defaultPaperStart
			portfolioName = "Hamza\u{2019}s paper"
			strategy = "Balanced"
			setupDone = true
			hasHydrated = true
			openOrders = []
			trades = PaperPortfolio.seedTrades()
			cash = PaperPortfolio.seedCash
			positions = PaperPortfolio.seedPositions()
			realized = PaperPortfolio.seedRealized
			baseValue = PaperPortfolio.authoredValue
			baseCash = PaperPortfolio.seedCash
			baseHoldings = positions.reduce(0) { $0 + $1.stake }
			loading = false
			// The persisted demo ledger (buys, sells, cash) wins over the seed; one written in an older shape doesn't
			// decode and reseeds.
			if let data = StakStore.data("portfolio"), let saved = try? JSONDecoder().decode(Ledger.self, from: data) { restore(saved) }
			return
		}
		// A real account's ledger is the server's alone. Cash is 0 until it's read, so nothing can be bought against
		// a guessed number meanwhile; loading is set now, so the hero never renders these placeholders.
		paperStart = PaperPortfolio.defaultPaperStart
		portfolioName = ""
		strategy = ""
		setupDone = false
		hasHydrated = false
		cash = 0
		positions = []
		pickedAt = [:]
		realized = []
		trades = []
		openOrders = []
		baseValue = 0
		baseCash = 0
		baseHoldings = 0
		loading = true
		serverTrades = []
		serverTradeCursor = nil
		refresh()
	}

	/// Real accounts only - re-reads cash, positions, orders and trades from the server. Safe to call repeatedly.
	func refresh() {
		guard !demo else { return }
		Task { await hydrate() }
	}

	/// One read at a time: a call while one runs asks for one more read after it, and waits for that.
	private func hydrate() async {
		guard !demo else { return }
		if let running = hydrateTask {
			readAgain = true
			await running.value
			return
		}
		let task = Task {
			repeat {
				readAgain = false
				await hydrateOnce()
			} while readAgain && !demo
		}
		hydrateTask = task
		await task.value
		hydrateTask = nil
	}

	private func hydrateOnce() async {
		guard !demo else { return }
		hydrateGeneration += 1
		let generation = hydrateGeneration
		// A failed read leaves the last known state. Before any has landed, the page keeps loading (the poll retries)
		// rather than settle on an empty account that looks like it needs setting up.
		guard let portfolio = try? await repo.getSandboxPortfolio() else {
			if generation == hydrateGeneration && hasHydrated { loading = false }
			return
		}
		// The ledger only changes when a trade lands, and /portfolio says whether one did (its newest trade's id) - a
		// read that finds it unchanged skips the up-to-100-row pull.
		let unchanged = portfolio.tradeCursor != nil && portfolio.tradeCursor == serverTradeCursor
		var mappedTrades = serverTrades
		if !unchanged {
			// 500 like web: a ledger cut short drops the oldest buys the realized gains and the chart are replayed from.
			guard let res = try? await repo.getSandboxTrades(limit: 500) else {
				if generation == hydrateGeneration && hasHydrated { loading = false }
				return
			}
			mappedTrades = res.trades.map { t in
				Trade(
					side: t.side.uppercased(), symbol: t.ticker, badge: String(t.ticker.prefix(1)),
					amount: t.amount, shares: t.shares, price: t.price,
					day: PaperPortfolio.dayLabel(t.executedAt), epochDay: PaperPortfolio.epochDay(t.executedAt),
					costBasis: t.costBasis
				)
			}
		}
		let mappedOrders = portfolio.openOrders.map { o in
			OpenOrder(
				id: String(o.id), symbol: o.ticker, badge: String(o.ticker.prefix(1)), name: o.ticker,
				amount: o.amount, limit: o.limitPrice, change: "", day: PaperPortfolio.dayLabel(o.createdAt)
			)
		}
		// Today's prices come from one batched quote request for whatever isn't already warm; the company names from what
		// the saves already know, fetched only for a ticker never named before - not a full stock read per position on
		// every 15s poll.
		let tickers = Array(Set(portfolio.positions.map(\.ticker)))
		let missing = tickers.filter { LiveQuotes.shared.cached($0) == nil }
		if !missing.isEmpty { await LiveQuotes.shared.refresh(missing) }
		await learnNames(tickers.filter { names[$0] == nil && MyStakHoldings.shared.nameOf($0) == nil })
		guard generation == hydrateGeneration, !demo else { return }

		let mappedPositions = portfolio.positions.map { p in
			PaperPortfolio.position(from: p, name: names[p.ticker] ?? MyStakHoldings.shared.nameOf(p.ticker) ?? p.ticker, quote: LiveQuotes.shared.cached(p.ticker))
		}
		let holdings = mappedPositions.reduce(0) { $0 + $1.stake }
		let resolvedCash = portfolio.initialized ? (portfolio.cash ?? 0) : defaultSetupBalance
		let mappedRealized = PaperPortfolio.computeRealized(mappedTrades)
		serverTrades = mappedTrades
		serverTradeCursor = portfolio.tradeCursor
		// Only what changed is published - every assignment redraws each Simulate page on the stack.
		if setupDone != portfolio.initialized { setupDone = portfolio.initialized }
		if !hasHydrated { hasHydrated = true }
		if cash != resolvedCash { cash = resolvedCash }
		let start = PaperPortfolio.startingCash(portfolio)
		if paperStart != start { paperStart = start }
		if portfolioName != (portfolio.name ?? "") { portfolioName = portfolio.name ?? "" }
		let strategyText = PaperPortfolio.strategyLabel(portfolio.strategy)
		if strategy != strategyText { strategy = strategyText }
		if positions != mappedPositions { positions = mappedPositions }
		let picked = Dictionary(portfolio.positions.compactMap { p in MyStakHoldings.parse(p.addedAt).map { (p.ticker, $0) } }, uniquingKeysWith: { min($0, $1) })
		if pickedAt != picked { pickedAt = picked }
		if trades != mappedTrades { trades = mappedTrades }
		if openOrders != mappedOrders { openOrders = mappedOrders }
		if realized != mappedRealized { realized = mappedRealized }
		baseHoldings = holdings
		baseCash = resolvedCash
		baseValue = resolvedCash + holdings
		if loading { loading = false }
	}

	/// The company names for tickers never named before, read in parallel. One that can't be read reads as its ticker.
	private func learnNames(_ tickers: [String]) async {
		guard !tickers.isEmpty else { return }
		let found: [String: String] = await withTaskGroup(of: (String, String?).self) { group in
			for t in tickers {
				group.addTask { (t, (try? await StockRepository.shared.getStock(t))?.name) }
			}
			var out: [String: String] = [:]
			for await (t, name) in group { if let name, !name.isEmpty { out[t] = name } }
			return out
		}
		names.merge(found) { $1 }
	}

	/// A held position's display spec, from the server's ticker / shares / cost basis plus today's quote. A position
	/// with no quote yet is valued at its cost basis rather than dropped.
	private static func position(from p: SandboxPositionDto, name: String, quote: LiveQuotes.Quote?) -> Position {
		let price = quote.map(\.price) ?? p.costBasis
		let badge = String(p.ticker.prefix(1))
		let basisTotal = p.costBasis * p.shares
		let value = price * p.shares
		let gain = value - basisTotal
		let pctAbs = basisTotal > 0 ? abs(gain / basisTotal * 100) : 0
		// No quote yet: the day's move is unknown ("—"), not "▲ 0.0%".
		let dayChange = quote.map { moveText($0.changePct) } ?? "—"
		let picked = dayLabel(p.addedAt)
		let spec = PickSpec(
			symbol: p.ticker, badge: badge, company: name,
			priceNow: money(price), pickedLine: "Picked \(picked) at \(money(p.costBasis))", priceThen: money(p.costBasis),
			gain: signedMoney(gain), gainPct: String(format: "%.1f%%", pctAbs), up: gain > -0.005,
			shares: shares(p.shares), stakeValue: money(value),
			vsMarket: "Even", ahead: true,
			dayChange: dayChange,
			stakeBasis: stakeLabel(basisTotal), weekGain: "+$0.00"
		)
		let row = SimPick(
			badge: badge, ticker: p.ticker,
			sub: "Picked \(picked) · \(gain > -0.005 ? "up" : "down") \(String(format: "%.0f", pctAbs))% since",
			amount: signedMoney(gain), pct: String(format: "%+.1f%%", gain > -0.005 ? pctAbs : -pctAbs), up: gain > -0.005
		)
		return Position(spec: spec, row: row)
	}

	/// The SOLD · REALIZED list, replayed from the trade log (the server keeps no per-sale P&L) with the same
	/// weighted-average cost basis the backend's own buy applies. `newestFirst` is in exact-time order, as /trades
	/// returns it - reversed for the replay, never re-sorted by day (that could put a same-day sell before its buy).
	private static func computeRealized(_ newestFirst: [Trade]) -> [Realized] {
		var sharesHeld: [String: Double] = [:]
		var basisPerShare: [String: Double] = [:]
		var out: [Realized] = []
		for t in newestFirst.reversed() {
			if t.isBuy {
				let prevShares = sharesHeld[t.symbol] ?? 0
				let prevBasis = basisPerShare[t.symbol] ?? 0
				let total = prevShares + t.shares
				basisPerShare[t.symbol] = total > 0 ? (prevBasis * prevShares + t.price * t.shares) / total : t.price
				sharesHeld[t.symbol] = total
			} else {
				// The server's own cost for the sale first: a position bought before the ledger (or past the page read)
				// replayed to a basis of $0 or the last logged buy, and showed a loss as a profit.
				let basis = t.costBasis ?? basisPerShare[t.symbol] ?? t.price
				let gain = (t.price - basis) * t.shares
				sharesHeld[t.symbol] = (sharesHeld[t.symbol] ?? 0) - t.shares
				// Sold out (the server lets a sale exceed the holding by a thousandth): the next buy starts a fresh basis.
				if (sharesHeld[t.symbol] ?? 0) <= 1e-6 { sharesHeld[t.symbol] = 0; basisPerShare[t.symbol] = nil }
				out.append(Realized(
					badge: t.badge, ticker: t.symbol,
					sub: "Sold \(t.day) · \(gain > -0.005 ? "profit banked" : "loss realized")",
					amount: signedMoney(gain), up: gain > -0.005
				))
			}
		}
		return out.reversed()
	}

	/// Sends a real account's change to the server after any change still on its way, then re-reads the ledger either
	/// way. A 4xx carries the server's own reason (a limit the live price has already crossed, say); anything else gets
	/// a plain retry line. `then` hears whether it went through.
	private func send(_ action: @escaping () async throws -> Void, then: ((Bool) -> Void)? = nil) {
		// A read already in flight predates this change - its ledger must not land over it.
		hydrateGeneration += 1
		let previous = lastChange
		lastChange = Task {
			await previous?.value
			var failure: Error? = nil
			do { try await action() } catch { failure = error }
			lastError = failure.map { PaperPortfolio.serverReason($0) ?? "That didn't go through \u{2014} try again" }
			await hydrate()
			then?(failure == nil)
		}
	}

	private nonisolated static func serverReason(_ error: Error) -> String? {
		guard case let .some(.http(code, body)) = error as? NetworkError, (400..<500).contains(code),
			  let data = body?.data(using: .utf8),
			  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
			  let reason = json["error"] as? String, !reason.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
		return reason
	}

	// MARK: - Changes

	/// An order placed before the setup card was used records the default setup with it: the card never hides on an
	/// account that reads as unset. For a real account the server is told first, in the same task as the change.
	private func ensureSetup() -> Bool {
		// Only for an account the server has said is new - never on a guess before its first read (a setup erases).
		guard !demo, hasHydrated, !setupDone else { return false }
		paperStart = defaultSetupBalance
		portfolioName = PaperPortfolio.defaultPortfolioName
		strategy = PaperPortfolio.defaultStrategy
		setupDone = true
		return true
	}

	func setup(balance: Double, name: String, strategy: String) {
		guard needsSetup else { return }
		paperStart = balance
		cash = balance
		baseValue = balance
		baseCash = balance
		portfolioName = name
		self.strategy = strategy
		setupDone = true
		positions = []
		pickedAt = [:]
		realized = []
		trades = []
		openOrders = []
		baseHoldings = 0
		persist()
		if !demo {
			send { _ = try await self.repo.sandboxSetup(startingBalance: balance, name: name, strategy: strategy.lowercased()) }
		}
	}

	/// A filled paper order: cash moves into the position at the ticket's price. A symbol already held grows that
	/// position instead of adding a duplicate row; a new one lands at the top.
	func buy(_ spec: BuySpec, amount: Double) {
		guard canBuy(amount) else { return }
		let neededSetup = ensureSetup()
		// A bought stock is in your STAK: the receipt's "View in My STAK" lands on a page that lists it. A real account
		// adds it only once the server confirms the buy, so a rejected order can't leave a save with no position.
		if demo { MyStakHoldings.shared.add(spec.symbol) }
		let price = spec.price
		// A real account's buy as the server fills it: shares rounded DOWN to a thousandth, the cost those shares at
		// the price to the cent (sandbox.ts /buy) - the receipt and cash read the server's numbers, not the amount
		// typed. The demo keeps its round stakes.
		let newShares = price > 0 ? (demo ? amount / price : (amount / price * 1000).rounded(.down) / 1000) : 0
		let cost = demo ? amount : (price * newShares * 100).rounded() / 100
		cash -= cost
		recordTrade(side: "BUY", symbol: spec.symbol, badge: spec.badge, amount: cost, shares: newShares, price: price)
		if let i = positions.firstIndex(where: { $0.spec.symbol == spec.symbol }) {
			// A top-up grows the cost basis by the money put in ($100 + $25 -> "$125"); the return is recomputed over it
			// ($24 on $100 was 24%, on $200 it's 12%) while the dollar gain stands.
			var held = positions[i]
			let newBasis = held.costBasis + cost
			let gainAmount = abs(PaperPortfolio.amount(held.spec.gain))
			let pct = String(format: "%.1f%%", newBasis > 0 ? gainAmount / newBasis * 100 : 0)
			held.spec.shares = PaperPortfolio.shares((Double(held.spec.shares) ?? 0) + newShares)
			held.spec.stakeValue = PaperPortfolio.money(held.stake + cost)
			held.spec.stakeBasis = PaperPortfolio.stakeLabel(newBasis)
			held.spec.gainPct = pct
			held.row.pct = (held.spec.up ? "+" : "-") + pct
			positions[i] = held
		} else {
			let priceText = PaperPortfolio.money(price)
			let day = PaperPortfolio.today()
			let fresh = Position(
				spec: PickSpec(
					symbol: spec.symbol, badge: spec.badge, company: spec.name,
					priceNow: priceText, pickedLine: "Picked \(day) at \(priceText)", priceThen: priceText,
					gain: "+$0.00", gainPct: "0.0%", up: true,
					shares: PaperPortfolio.shares(newShares), stakeValue: PaperPortfolio.money(cost),
					// Short on purpose: the stat's own label already says "vs the market".
					vsMarket: "Even", ahead: true,
					dayChange: spec.change, stakeBasis: PaperPortfolio.stakeLabel(cost), weekGain: "+$0.00"
				),
				row: SimPick(badge: spec.badge, ticker: spec.symbol, sub: "Picked \(day) · just bought", amount: "+$0.00", pct: "+0.0%", up: true)
			)
			positions.insert(fresh, at: 0)
			// Its buy moment until the server's own reaches the next read.
			if pickedAt[spec.symbol] == nil { pickedAt[spec.symbol] = Date() }
		}
		persist()
		if !demo {
			send({
				if neededSetup {
					_ = try await self.repo.sandboxSetup(startingBalance: defaultSetupBalance, name: PaperPortfolio.defaultPortfolioName, strategy: PaperPortfolio.defaultStrategy.lowercased())
				}
				_ = try await self.repo.sandboxBuy(ticker: spec.symbol, amount: amount)
			}, then: { ok in if ok { MyStakHoldings.shared.add(spec.symbol) } })
		}
	}

	/// A limit order under today's price (FigJam: Market or limit; Order pending): the stake is reserved from cash until
	/// it fills or is canceled.
	@discardableResult
	func placeLimit(_ spec: BuySpec, amount: Double, limit: Double) -> Bool {
		guard canBuy(amount), limit > 0 else { return false }
		let neededSetup = ensureSetup()
		cash -= amount
		openOrders.insert(OpenOrder(
			id: "\(spec.symbol)-\(Int(Date().timeIntervalSince1970 * 1000))", symbol: spec.symbol, badge: spec.badge,
			name: spec.name, amount: amount, limit: limit, change: spec.change, day: PaperPortfolio.today()
		), at: 0)
		persist()
		if !demo {
			send {
				if neededSetup {
					_ = try await self.repo.sandboxSetup(startingBalance: defaultSetupBalance, name: PaperPortfolio.defaultPortfolioName, strategy: PaperPortfolio.defaultStrategy.lowercased())
				}
				_ = try await self.repo.sandboxPlaceOrder(ticker: spec.symbol, amount: amount, limitPrice: limit)
			}
		}
		return true
	}

	/// Canceling an open order releases its reserved stake. An order the server hasn't numbered yet (placed a moment ago)
	/// can't be canceled there - it says so instead of releasing the stake here only to have the next read take it again.
	func cancelOrder(_ id: String) {
		guard let order = openOrders.first(where: { $0.id == id }) else { return }
		let serverId = Int64(id)
		if !demo && serverId == nil {
			lastError = "That order is still being placed \u{2014} try again in a moment"
			return
		}
		openOrders.removeAll { $0.id == id }
		cash += order.amount
		persist()
		if !demo, let serverId { send { _ = try await self.repo.sandboxCancelOrder(serverId) } }
	}

	/// Closing (or trimming) a position: its live value returns to cash and the sold slice joins SOLD · REALIZED at the
	/// top. False when the symbol isn't held - no host morphs to Position closed on a phantom sell.
	@discardableResult
	func sell(_ symbol: String, portion: Double = 1) -> Bool {
		guard let i = positions.firstIndex(where: { $0.spec.symbol == symbol }) else { return false }
		let p = min(max(portion, 0), 1)
		guard p > 0 else { return false }
		let held = positions[i]
		// Live for a real account (today's quote), the authored spec for the demo - what actually returns to cash.
		let live = held.liveSpec
		let value = held.liveValue
		let gain = held.gainDollars
		let banked = gain > -0.005
		let sub = "Sold \(PaperPortfolio.today()) · \(banked ? "profit banked" : "loss realized")"
		recordTrade(side: "SELL", symbol: symbol, badge: held.spec.badge, amount: value * p, shares: (Double(held.spec.shares) ?? 0) * p, price: PaperPortfolio.amount(live.priceNow))
		if p >= 0.999 {
			positions.remove(at: i)
			pickedAt[symbol] = nil
			cash += value
			realized.insert(Realized(badge: held.spec.badge, ticker: symbol, sub: sub, amount: live.gain, up: banked), at: 0)
		} else {
			// A partial sell (the Half / Custom chips): the sold slice returns to cash and banks its share of the gain;
			// the rest of the position stays, scaled.
			let keep = 1 - p
			cash += value * p
			var rest = held
			rest.spec.shares = PaperPortfolio.shares((Double(held.spec.shares) ?? 0) * keep)
			rest.spec.stakeValue = PaperPortfolio.money(value * keep)
			rest.spec.stakeBasis = PaperPortfolio.stakeLabel(held.costBasis * keep)
			rest.spec.gain = PaperPortfolio.signedMoney(gain * keep)
			rest.row.amount = PaperPortfolio.signedMoney(gain * keep)
			positions[i] = rest
			realized.insert(Realized(badge: held.spec.badge, ticker: symbol, sub: sub, amount: PaperPortfolio.signedMoney(gain * p), up: banked), at: 0)
		}
		persist()
		// A sale the phone treats as the whole position (99.9% and up) goes to the server as the whole of it - otherwise
		// it keeps a sliver, and the row the phone just removed comes back on the next read.
		let serverPortion = p >= 0.999 ? 1 : p
		if !demo { send { _ = try await self.repo.sandboxSell(ticker: symbol, portion: serverPortion) } }
		return true
	}

	private func recordTrade(side: String, symbol: String, badge: String, amount: Double, shares: Double, price: Double) {
		// US Eastern, as the server dates it - a local date re-keyed the history chart when the server's row replaced it.
		trades.insert(Trade(side: side, symbol: symbol, badge: badge, amount: amount, shares: shares, price: price, day: PaperPortfolio.today(), epochDay: MyStakHoldings.epochDay(Date(), in: TimeZone(identifier: "America/New_York") ?? .current)), at: 0)
	}

	// MARK: - The demo's ledger on the phone

	private struct Ledger: Codable {
		let cash: Double
		let paperStart: Double
		let name: String
		let strategy: String
		let setupDone: Bool
		let positions: [Position]
		let realized: [Realized]
		let trades: [Trade]
		let orders: [OpenOrder]
	}

	/// Only the demo keeps a ledger on the phone; a real account's is the server's.
	private func persist() {
		guard demo else { return }
		let ledger = Ledger(cash: cash, paperStart: paperStart, name: portfolioName, strategy: strategy, setupDone: setupDone, positions: positions, realized: realized, trades: trades, orders: openOrders)
		if let data = try? JSONEncoder().encode(ledger) { StakStore.set(data, for: "portfolio") }
	}

	private func restore(_ saved: Ledger) {
		positions = saved.positions
		realized = saved.realized
		cash = saved.cash
		paperStart = saved.paperStart
		portfolioName = saved.name
		strategy = saved.strategy
		setupDone = saved.setupDone
		trades = saved.trades
		openOrders = saved.orders
	}

	// MARK: - The authored demo history

	/// The six authored rows (1:4496), in the authored order; each pairs with its PickSpecs entry by symbol.
	nonisolated static let seedRows: [SimPick] = [
		SimPick(badge: "N", ticker: "NVDA", sub: "Picked May 8 · up 24% since", amount: "+$24.00", pct: "+24.0%", up: true),
		SimPick(badge: "T", ticker: "TSLA", sub: "Picked Jun 3 · up 18% since", amount: "+$18.00", pct: "+18.0%", up: true),
		SimPick(badge: "A", ticker: "AMD", sub: "Picked May 29 · up 11% since", amount: "+$11.00", pct: "+11.0%", up: true),
		SimPick(badge: "A", ticker: "AAPL", sub: "Picked Apr 22 · up 6% since", amount: "+$6.00", pct: "+6.0%", up: true),
		SimPick(badge: "J", ticker: "JPM", sub: "Picked Jun 20 · up 2% since", amount: "+$2.00", pct: "+2.0%", up: true),
		SimPick(badge: "M", ticker: "MSFT", sub: "Picked Jun 26 · down 3% since", amount: "-$3.00", pct: "-3.0%", up: false),
	]

	private nonisolated static func seedPositions() -> [Position] {
		seedRows.compactMap { row in PickSpecs.all.first { $0.symbol == row.ticker }.map { Position(spec: $0, row: row) } }
	}

	private nonisolated static let seedRealized = [
		Realized(badge: "S", ticker: "SHOP", sub: "Sold May 30 · profit banked", amount: "+$12.00", up: true),
		Realized(badge: "C", ticker: "COIN", sub: "Sold Jun 15 · loss realized", amount: "-$8.00", up: false),
	]

	/// The persona's authored history as a trade log (the sells, then a buy per seeded row on its picked day).
	private nonisolated static func seedTrades() -> [Trade] {
		let buys: [Trade] = seedRows.compactMap { row in
			guard let spec = PickSpecs.all.first(where: { $0.symbol == row.ticker }) else { return nil }
			let day = (row.sub.components(separatedBy: "Picked ").last ?? row.sub).components(separatedBy: " \u{00B7}").first ?? ""
			return Trade(side: "BUY", symbol: row.ticker, badge: row.badge, amount: amount(spec.stakeBasis), shares: Double(spec.shares) ?? 0, price: amount(spec.priceThen), day: day, epochDay: 0)
		}
		return [
			Trade(side: "SELL", symbol: "SHOP", badge: "S", amount: 112, shares: 1.4, price: 80, day: "May 30", epochDay: 0),
			Trade(side: "SELL", symbol: "COIN", badge: "C", amount: 92, shares: 0.5, price: 184, day: "Jun 15", epochDay: 0),
		] + buys
	}

	// MARK: - Types

	/// A held pick: its detail-page numbers plus the row the lists draw.
	struct Position: Identifiable, Codable, Equatable {
		var spec: PickSpec
		var row: SimPick
		var id: String { spec.symbol }

		/// "$124.00" -> 124.0: what the stored position is worth.
		var stake: Double { PaperPortfolio.amount(spec.stakeValue) }
		/// "$100" -> 100.0: what it cost, the fixed point a live gain is measured from.
		var costBasis: Double { PaperPortfolio.amount(spec.stakeBasis) }
		private var sharesCount: Double { Double(spec.shares) ?? 0 }

		/// Today's quote - nil for the demo (its numbers carry no live price) or before the first refresh lands.
		@MainActor private var liveQuote: LiveQuotes.Quote? {
			PaperPortfolio.shared.demo ? nil : LiveQuotes.shared.cached(spec.symbol)
		}

		/// The position's market value: shares at today's price, the stored stake until a quote lands.
		@MainActor var liveValue: Double { liveQuote.map { $0.price * sharesCount } ?? stake }

		/// The gain in dollars - a real position's shares at today's price less its cost basis; the demo's authored row.
		@MainActor var gainDollars: Double {
			if let q = liveQuote { return q.price * sharesCount - costBasis }
			return PaperPortfolio.amount(row.amount)
		}

		/// `row`, re-priced off today's quote for a real position; the demo's authored row unchanged.
		@MainActor var liveRow: SimPick {
			guard let q = liveQuote else { return row }
			let gain = q.price * sharesCount - costBasis
			var out = row
			out.amount = PaperPortfolio.signedMoney(gain)
			out.pct = String(format: "%+.1f%%", costBasis > 0 ? gain / costBasis * 100 : 0)
			out.up = gain > -0.005
			// "Picked Sep 4 · up 40% since" moves with the amount beside it, not frozen at the last full read.
			if let picked = row.sub.components(separatedBy: " · ").first, picked.hasPrefix("Picked") {
				let pctAbs = costBasis > 0 ? abs(gain / costBasis * 100) : 0
				out.sub = "\(picked) · \(out.up ? "up" : "down") \(String(format: "%.0f", pctAbs))% since"
			}
			return out
		}

		/// `spec`, re-priced off today's quote for a real position - price now, the gain, up/down and value.
		@MainActor var liveSpec: PickSpec {
			guard let q = liveQuote else { return spec }
			let gain = q.price * sharesCount - costBasis
			var out = spec
			out.priceNow = PaperPortfolio.money(q.price)
			out.gain = PaperPortfolio.signedMoney(gain)
			out.gainPct = String(format: "%.1f%%", costBasis > 0 ? abs(gain / costBasis * 100) : 0)
			out.up = gain > -0.005
			out.stakeValue = PaperPortfolio.money(q.price * sharesCount)
			out.dayChange = moveText(q.changePct)
			return out
		}

		/// The best/worst tile line (1:3898): "+$24 on $100" - the gain to whole dollars over the cost basis.
		@MainActor var duoLine: String {
			let whole = gainDollars.rounded()
			return (whole < 0 ? "-" : "+") + PaperPortfolio.wholeDollars(abs(whole)) + " on " + spec.stakeBasis
		}
	}

	/// One ledger event - a buy or a sell (FigJam Simulate board, 2026-09-14: Trade history). `amount` is the cash that
	/// moved, `day` the "Sep 14" it moved on, `epochDay` for ordering (0 = an authored, undated seed row).
	struct Trade: Identifiable, Codable, Equatable {
		let side: String
		let symbol: String
		let badge: String
		let amount: Double
		let shares: Double
		let price: Double
		let day: String
		let epochDay: Int
		/// A sale's average cost as the server recorded it (nil on buys, older sales and the demo's ledger).
		var costBasis: Double? = nil
		/// Row identity for ForEach only - never persisted.
		var id = UUID()
		var isBuy: Bool { side == "BUY" }
		private enum CodingKeys: String, CodingKey { case side, symbol, badge, amount, shares, price, day, epochDay }
		static func == (a: Trade, b: Trade) -> Bool {
			a.side == b.side && a.symbol == b.symbol && a.amount == b.amount && a.shares == b.shares && a.price == b.price && a.day == b.day && a.epochDay == b.epochDay
		}
	}

	/// A limit order waiting for its price (FigJam: Buy order -> Market or limit; Order pending).
	struct OpenOrder: Identifiable, Codable, Equatable {
		let id: String
		let symbol: String
		let badge: String
		let name: String
		let amount: Double
		let limit: Double
		let change: String
		let day: String
	}

	/// A SOLD · REALIZED row (1:4496).
	struct Realized: Identifiable, Codable, Equatable {
		let badge: String
		let ticker: String
		let sub: String
		let amount: String
		let up: Bool
		/// A ticker can be sold more than once - rows carry their own identity (never persisted).
		var id = UUID()
		private enum CodingKeys: String, CodingKey { case badge, ticker, sub, amount, up }
		static func == (a: Realized, b: Realized) -> Bool {
			a.badge == b.badge && a.ticker == b.ticker && a.sub == b.sub && a.amount == b.amount && a.up == b.up
		}
	}

	// MARK: - Formatting

	// The sign is the shown figure's: a gain that rounds to nothing reads "+$0", never a red "-$0" (cost rounding
	// leaves a first buy a fraction of a cent down).
	/// What a range pill covers, as the change line under a chart says it ("past 3 months").
	nonisolated static func rangeWord(_ range: String) -> String {
		switch range.uppercased() {
		case "1D": return "today"
		case "1W": return "this week"
		case "1M": return "past month"
		case "3M": return "past 3 months"
		case "YTD": return "this year"
		case "1Y": return "past year"
		default: return ""
		}
	}

	/// The change line under a chart for the selected range: "▲ +$12.30 (+3.8%) past 3 months". 1D's is the last
	/// session's move before the open and at weekends - "on Friday", not "today" (StakClock.sessionChange).
	nonisolated static func rangeLine(_ money: String, pct: Double, up: Bool, range: String) -> String {
		StakClock.sessionChange("\(up ? "▲" : "▼") \(money) (\(signedPct(pct))) \(rangeWord(range))")
	}

	/// A change line as VoiceOver should say it - "Up", "Down", not the triangles.
	nonisolated static func spokenMove(_ text: String) -> String {
		text.replacingOccurrences(of: "▲", with: "Up").replacingOccurrences(of: "▼", with: "Down")
	}

	/// "vs S&P 500": how far the stock's move was ahead of or behind SPY's, in words ("3.6% behind").
	nonisolated static func versusWords(_ versus: Double) -> String {
		abs(versus) < 0.05 ? "Even" : String(format: "%.1f%% %@", abs(versus), versus > 0 ? "ahead" : "behind")
	}

	nonisolated static func signedWhole(_ value: Double) -> String { (value.rounded() < 0 ? "-$" : "+$") + wholeDollars(abs(value)).dropFirst() }
	nonisolated static func signedMoney(_ value: Double) -> String { ((value * 100).rounded() < 0 ? "-" : "+") + money(abs(value)) }
	nonisolated static func signedPct(_ pct: Double) -> String {
		let shown = (pct * 10).rounded() / 10
		return String(format: "%+.1f%%", shown == 0 ? 0 : shown)
	}

	/// A stake as its label - whole dollars "$25", otherwise "$25.50".
	nonisolated static func stakeLabel(_ amount: Double) -> String { amount == amount.rounded() ? wholeDollars(amount) : money(amount) }

	nonisolated static func wholeDollars(_ value: Double) -> String {
		"$" + (wholeFormatter.string(from: NSNumber(value: value)) ?? String(format: "%.0f", value))
	}

	/// "$1,234.56" - every cash figure formats through here (en_US_POSIX, two places, grouped, half up - Java's %,.2f).
	nonisolated static func money(_ value: Double) -> String {
		"$" + (moneyFormatter.string(from: NSNumber(value: value)) ?? String(format: "%.2f", value))
	}

	/// "$1,234.56" -> 1234.56.
	nonisolated static func amount(_ money: String) -> Double {
		Double(money.replacingOccurrences(of: "$", with: "").replacingOccurrences(of: ",", with: "").replacingOccurrences(of: "+", with: "")) ?? 0
	}

	/// Shares to four places - the tickets' "0.8803".
	nonisolated static func shares(_ value: Double) -> String { String(format: "%.4f", value) }

	/// What the account started with - the gains are measured from it (web usePaperPortfolio). Every set-up portfolio
	/// has its start since the one-money-system migration; assuming $10,000 once made a $3,000 one show -$7,000.
	nonisolated static func startingCash(_ portfolio: SandboxPortfolioResponse) -> Double {
		// Not set up yet: the amount a first trade would start it on (never an XP-tier figure - those are retired).
		portfolio.initialized ? (portfolio.start ?? defaultSetupBalance) : defaultSetupBalance
	}

	/// Today as "Sep 4" - the picked / sold lines' date.
	nonisolated static func today() -> String { localDayFormatter.string(from: Date()) }

	/// A server timestamp's US Eastern day, "Sep 4".
	nonisolated static func dayLabel(_ iso: String) -> String { MyStakHoldings.parse(iso).map { easternDayFormatter.string(from: $0) } ?? "" }

	/// A server timestamp's US Eastern day as days since 1970.
	nonisolated static func epochDay(_ iso: String) -> Int {
		guard let date = MyStakHoldings.parse(iso) else { return 0 }
		return MyStakHoldings.epochDay(date, in: TimeZone(identifier: "America/New_York") ?? .current)
	}

	/// "balanced" -> "Balanced": the backend's id, the label the app shows.
	private nonisolated static func strategyLabel(_ id: String?) -> String {
		guard let id, !id.isEmpty else { return "" }
		return id.prefix(1).uppercased() + id.dropFirst()
	}

	private nonisolated static let wholeFormatter: NumberFormatter = {
		let f = NumberFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.numberStyle = .decimal
		f.usesGroupingSeparator = true
		f.minimumFractionDigits = 0
		f.maximumFractionDigits = 0
		f.roundingMode = .halfUp
		return f
	}()

	private nonisolated static let moneyFormatter: NumberFormatter = {
		let f = NumberFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.numberStyle = .decimal
		f.usesGroupingSeparator = true
		f.minimumFractionDigits = 2
		f.maximumFractionDigits = 2
		f.roundingMode = .halfUp
		return f
	}()

	private nonisolated static let localDayFormatter: DateFormatter = {
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.dateFormat = "MMM d"
		return f
	}()

	private nonisolated static let easternDayFormatter: DateFormatter = {
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.timeZone = TimeZone(identifier: "America/New_York")
		f.dateFormat = "MMM d"
		return f
	}()
}
