import SwiftUI

/// Codex audit (2026-09-04): the paper portfolio behind Simulate - ONE
/// store the hero (1:3898), the Portfolio page (1:4496), Pick detail
/// (1:4631), the board / Leaderboard You rows and every practice-buy
/// ticket read, so a buy moves cash into a position and a sell moves it
/// back. Demo-seeded from the authored numbers; in production the backend
/// serves the ledger. Mirrors android ui/simulate/PaperPortfolio.kt.

/// One Portfolio row (1:4548 template). Lives here, not in
/// SimPortfolioView.swift, so Simulate home's three rows and the Portfolio
/// page list the same table.
struct SimPick: Codable {
	let badge: String
	let ticker: String
	let sub: String
	let amount: String
	let pct: String
	let up: Bool
}

final class PaperPortfolio: ObservableObject {
	static let shared = PaperPortfolio()

	/// Authored (1:3898): "$10,000 paper", "+$240.00 all time", "Cash available $8,800.00".
	static let defaultPaperStart = 10000.0
	/// Portfolio setup (FigJam Simulate board, 2026-09-14: Choose balance, Name,
	/// Strategy). A NEW account picks its starting balance before its first trade;
	/// the demo persona is the authored $10,000 portfolio. Persisted with the
	/// ledger. Mirrors android PaperPortfolio.paperStart & co.
	@Published private(set) var paperStart = PaperPortfolio.defaultPaperStart
	@Published private(set) var portfolioName = ""
	@Published private(set) var strategy = ""
	@Published private(set) var setupDone = false
	/// Every buy and sell, newest first (FigJam: Trade history).
	@Published private(set) var trades: [Trade] = []
	/// Limit orders waiting for their price, newest first (FigJam: Order pending).
	@Published private(set) var openOrders: [OpenOrder] = []
	/// The setup card shows until the account has set up or touched its ledger - a trade, a held
	/// position (a pre-2026-09-14 ledger has positions but no trade log) or a reserved limit order
	/// (placeLimit records no trade). Review 2026-09-14: setup() must never rebase cash under a reservation.
	var needsSetup: Bool { !demo && !setupDone && untouched }
	private var untouched: Bool { trades.isEmpty && positions.isEmpty && openOrders.isEmpty }
	/// All-time gain = today's value over the paper start (the demo's authored $240 falls out of its $10,240).
	var allTimeGain: Double { portfolioValue - paperStart }
	@Published var cash: Double = 8800

	/// The authored demo account, or a fresh one (product audit, 2026-09-05; mirrors Android).
	@Published private(set) var demo = true
	private var baseValue = 10240.0
	private var baseCash = 8800.0

	/// The leaderboard rank - the demo's authored #47; a new account is unranked until it has moves.
	var rank: Int? { demo ? PaperPortfolio.weekRank : nil }
	var weekUp: Bool { demo ? true : allTimeGain >= 0 }
	var weekGainText: String { demo ? PaperPortfolio.weekGain : PaperPortfolio.signedWhole(allTimeGain) }
	var weekPctText: String { demo ? PaperPortfolio.weekPct : PaperPortfolio.signedPct(allTimeGain / paperStart * 100) }
	/// "12 picks" is authored for the demo (its rows list six); a new account counts its own.
	var pickCountLabel: Int { demo ? 12 + (positions.count - PaperPortfolio.authoredRows.count) : positions.count }

	/// "1 pick" / "12 picks" (product audit, 2026-09-05: a first buy read "1 picks").
	var pickCountText: String { pickCountLabel == 1 ? "1 pick" : "\(pickCountLabel) picks" }

	/// Seeds the authored demo history or clears everything to $10,000 of untouched paper cash.
	func reset(demo: Bool) {
		self.demo = demo
		newStake = 0
		paperStart = PaperPortfolio.defaultPaperStart
		portfolioName = demo ? "Hamza\u{2019}s paper" : ""
		strategy = demo ? "Balanced" : ""
		setupDone = demo
		openOrders = []
		// The persona's authored history as a trade log: a buy per seeded row on its
		// picked day, a sell per realized row (undated seeds order by their rows).
		trades = demo ? PaperPortfolio.seedTrades() : []
		if demo {
			cash = 8800
			positions = PaperPortfolio.authoredRows.compactMap { row in
				PickSpecs.all.first { $0.symbol == row.ticker }.map { Position(spec: $0, row: row) }
			}
			realized = [
				Realized(badge: "S", ticker: "SHOP", sub: "Sold May 30 · profit banked", amount: "+$12.00", up: true),
				Realized(badge: "C", ticker: "COIN", sub: "Sold Jun 15 · loss realized", amount: "-$8.00", up: false)
			]
			baseValue = 10240
			baseCash = 8800
		} else {
			cash = PaperPortfolio.defaultPaperStart
			positions = []
			realized = []
			baseValue = PaperPortfolio.defaultPaperStart
			baseCash = PaperPortfolio.defaultPaperStart
		}
		// The persisted ledger (buys, sells, cash) wins over the seed - product audit
		// 2026-09-05; the seed baseline above is what value grows from.
		// A demo ledger persisted before the trade log existed reseeds once (its rows were the
		// authored seed anyway) and is rewritten in the current shape by the next persist();
		// a new account's ledger always restores (review 2026-09-14).
		if let data = StakStore.data("portfolio"), let saved = try? JSONDecoder().decode(Ledger.self, from: data), !(demo && saved.trades == nil) {
			positions = saved.positions
			realized = saved.realized
			cash = saved.cash
			newStake = saved.newStake
			// Fields the FigJam Simulate work added (2026-09-14) - a ledger persisted before them keeps its defaults.
			if let start = saved.paperStart {
				paperStart = start
				baseValue = demo ? 10240 : start
				baseCash = demo ? 8800 : start
			}
			if let name = saved.name { portfolioName = name }
			if let strategy = saved.strategy { self.strategy = strategy }
			if let done = saved.setupDone { setupDone = done }
			if let trades = saved.trades { self.trades = trades }
			if let orders = saved.orders { openOrders = orders }
		}
	}

	private struct Ledger: Codable {
		let cash: Double
		let newStake: Double
		let positions: [Position]
		let realized: [Realized]
		// Optional so an older ledger still decodes (FigJam Simulate board, 2026-09-14).
		var paperStart: Double? = nil
		var name: String? = nil
		var strategy: String? = nil
		var setupDone: Bool? = nil
		var trades: [Trade]? = nil
		var orders: [OpenOrder]? = nil
	}

	private func persist() {
		let ledger = Ledger(cash: cash, newStake: newStake, positions: positions, realized: realized, paperStart: paperStart, name: portfolioName, strategy: strategy, setupDone: setupDone, trades: trades, orders: openOrders)
		if let data = try? JSONEncoder().encode(ledger) { StakStore.set(data, for: "portfolio") }
	}

	/// Portfolio setup: only before the first trade, never for the demo persona.
	func setup(balance: Double, name: String, strategy: String) {
		guard needsSetup else { return }
		paperStart = balance
		cash = balance
		baseValue = balance
		baseCash = balance
		portfolioName = name
		self.strategy = strategy
		setupDone = true
		persist()
	}

	/// The persona's authored history as a trade log (sells first, then the seeded buys).
	private static func seedTrades() -> [Trade] {
		let buys: [Trade] = authoredRows.compactMap { row in
			guard let spec = PickSpecs.all.first(where: { $0.symbol == row.ticker }) else { return nil }
			let afterPicked = row.sub.components(separatedBy: "Picked ").last ?? row.sub
			let day = afterPicked.components(separatedBy: " \u{00B7}").first ?? afterPicked
			return Trade(side: "BUY", symbol: row.ticker, badge: row.badge, amount: amount(spec.stakeBasis), shares: Double(spec.shares) ?? 0, price: amount(spec.priceThen), day: day, epochDay: 0)
		}
		let sells = [
			Trade(side: "SELL", symbol: "SHOP", badge: "S", amount: 112.0, shares: 1.4, price: 80.0, day: "May 30", epochDay: 0),
			Trade(side: "SELL", symbol: "COIN", badge: "C", amount: 92.0, shares: 0.5, price: 184.0, day: "Jun 15", epochDay: 0)
		]
		return sells + buys
	}

	private func recordTrade(side: String, symbol: String, badge: String, amount: Double, shares: Double, price: Double) {
		trades.insert(Trade(side: side, symbol: symbol, badge: badge, amount: amount, shares: shares, price: price, day: PaperPortfolio.today(), epochDay: Int(Date().timeIntervalSince1970 / 86400)), at: 0)
	}

	/// A limit order under today's price (FigJam: Market or limit; Order pending): the stake is reserved from cash until it fills or is cancelled.
	@discardableResult
	func placeLimit(_ spec: BuySpec, amount: Double, limit: Double) -> Bool {
		guard canBuy(amount), limit > 0 else { return false }
		cash -= amount
		openOrders.insert(OpenOrder(id: "\(spec.symbol)-\(Int(Date().timeIntervalSince1970 * 1000))", symbol: spec.symbol, badge: spec.badge, name: spec.name, amount: amount, limit: limit, change: spec.change, day: PaperPortfolio.today()), at: 0)
		persist()
		return true
	}

	/// Cancelling an open order releases its reserved stake.
	func cancelOrder(_ id: String) {
		guard let order = openOrders.first(where: { $0.id == id }) else { return }
		openOrders.removeAll { $0.id == id }
		cash += order.amount
		persist()
	}

	static func signedWhole(_ value: Double) -> String { (value < 0 ? "-$" : "+$") + wholeDollars(abs(value)).replacingOccurrences(of: "$", with: "") }
	static func signedMoney(_ value: Double) -> String { (value < 0 ? "-" : "+") + money(abs(value)) }
	static func signedPct(_ pct: Double) -> String { String(format: "%+.1f%%", pct) }

	/// Audit item 6 - one week, quoted everywhere: the hero's "▲ +$186
	/// (+1.9%) this week" / "#47 this week" (1:3898), the board's You row
	/// and the Leaderboard's You row (1:4124). The frames author +4.2% on
	/// the two You rows against +1.9% on the hero; the hero wins.
	static let weekRank = 47
	static let weekGain = "+$186"
	static let weekPct = "+1.9%"

	/// A held pick: the detail page's spec + its Portfolio row.
	struct Position: Identifiable, Codable {
		let spec: PickSpec
		let row: SimPick
		var id: String { spec.symbol }
	}

	/// One ledger event - a buy or a sell (FigJam Simulate board, 2026-09-14: Trade
	/// history -> Trade log). `amount` is the cash that moved, `day` the "Sep 14" it
	/// moved on, `epochDay` for ordering (0 = an authored, undated seed row).
	struct Trade: Identifiable, Codable {
		let side: String
		let symbol: String
		let badge: String
		let amount: Double
		let shares: Double
		let price: Double
		let day: String
		let epochDay: Int
		/// Per-process row identity for ForEach only - never persisted (an explicit key set keeps
		/// the decoder off it, so no "immutable property will not be decoded" warning).
		let id = UUID()
		var isBuy: Bool { side == "BUY" }
		private enum CodingKeys: String, CodingKey { case side, symbol, badge, amount, shares, price, day, epochDay }
	}

	/// A limit order waiting for its price (FigJam: Buy order -> Market or limit; Order pending).
	struct OpenOrder: Identifiable, Codable {
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
	struct Realized: Identifiable, Codable {
		let badge: String
		let ticker: String
		let sub: String
		let amount: String
		let up: Bool
		/// A ticker can be sold more than once - rows carry their own identity (never persisted).
		let id = UUID()
		private enum CodingKeys: String, CodingKey { case badge, ticker, sub, amount, up }
	}

	/// The authored six rows (1:4496) in the authored order - the tickers
	/// PickSpecs.all serves to Pick detail.
	static let authoredRows: [SimPick] = [
		SimPick(badge: "N", ticker: "NVDA", sub: "Picked May 8 · up 24% since", amount: "+$24.00", pct: "+24.0%", up: true),
		SimPick(badge: "T", ticker: "TSLA", sub: "Picked Jun 3 · up 18% since", amount: "+$18.00", pct: "+18.0%", up: true),
		SimPick(badge: "A", ticker: "AMD", sub: "Picked May 29 · up 11% since", amount: "+$11.00", pct: "+11.0%", up: true),
		SimPick(badge: "A", ticker: "AAPL", sub: "Picked Apr 22 · up 6% since", amount: "+$6.00", pct: "+6.0%", up: true),
		SimPick(badge: "J", ticker: "JPM", sub: "Picked Jun 20 · up 2% since", amount: "+$2.00", pct: "+2.0%", up: true),
		SimPick(badge: "M", ticker: "MSFT", sub: "Picked Jun 26 · down 3% since", amount: "-$3.00", pct: "-3.0%", up: false)
	]

	/// Seeded NVDA, TSLA, AMD, AAPL, JPM, MSFT - each authored row paired
	/// with its PickSpecs entry (no second copy of either table).
	@Published var positions: [Position] = PaperPortfolio.authoredRows.compactMap { row in
		PickSpecs.all.first { $0.symbol == row.ticker }.map { Position(spec: $0, row: row) }
	}

	/// Authored SOLD · REALIZED rows (1:4496); a sell prepends to them.
	@Published var realized: [Realized] = [
		Realized(badge: "S", ticker: "SHOP", sub: "Sold May 30 · profit banked", amount: "+$12.00", up: true),
		Realized(badge: "C", ticker: "COIN", sub: "Sold Jun 15 · loss realized", amount: "-$8.00", up: false)
	]

	/// Net stake moved from cash into stock since launch, at cost. The demo
	/// has no live prices, so a buy moves cash into stock 1:1 (and a sell
	/// moves the position's value back) and the shown value stays
	/// $10,240.00 until prices move.
	private var newStake = 0.0

	/// The authored $10,240.00 (1:3898) plus whatever cash moved since. A reserved limit
	/// stake stays the account's money until it fills or is cancelled (review 2026-09-14).
	var portfolioValue: Double { baseValue + (cash - baseCash) + newStake + openOrders.reduce(0) { $0 + $1.amount } }
	var pickCount: Int { positions.count }

	func holds(_ symbol: String) -> Bool {
		positions.contains { $0.spec.symbol == symbol }
	}

	func pickSpec(_ symbol: String) -> PickSpec? {
		positions.first { $0.spec.symbol == symbol }?.spec
	}

	/// A practice buy of `amount` paper dollars at the ticket's price: cash
	/// moves into a new position at the front of the list. A symbol already
	/// held adds to its position (shares and stake grow) - no duplicate row.
	/// True when the cash on hand covers the stake - the ticket's pills and the confirm both read it (Codex review, PR #166).
	func canBuy(_ amount: Double) -> Bool { amount > 0 && amount <= cash }

	func buy(_ spec: BuySpec, amount: Double) {
		guard canBuy(amount) else { return }
		let price = spec.price
		cash -= amount
		newStake += amount
		// A zero quote never divides (mirrors PaperPortfolio.kt).
		let newShares = price > 0 ? amount / price : 0
		recordTrade(side: "BUY", symbol: spec.symbol, badge: spec.badge, amount: amount, shares: newShares, price: price)
		if let i = positions.firstIndex(where: { $0.spec.symbol == spec.symbol }) {
			let held = positions[i]
			let grown = held.spec.holding(
				shares: (Double(held.spec.shares) ?? 0) + newShares,
				stakeValue: PaperPortfolio.amount(held.spec.stakeValue) + amount,
				// Review (2026-09-04): the basis grows by the stake put in ($100 + $25 -> "$125").
				stakeBasis: PaperPortfolio.amount(held.spec.stakeBasis) + amount
			)
			// The row's return follows the recomputed gainPct (Codex review, PR #166 mirror).
			positions[i] = Position(
				spec: grown,
				row: SimPick(badge: held.row.badge, ticker: held.row.ticker, sub: held.row.sub, amount: held.row.amount, pct: (held.spec.up ? "+" : "-") + grown.gainPct, up: held.row.up)
			)
			persist()
			return
		}
		let day = PaperPortfolio.today()
		let priceText = PaperPortfolio.money(price)
		let pick = PickSpec(
			symbol: spec.symbol, badge: spec.badge, company: spec.name,
			priceNow: priceText, priceThen: priceText, pickedLine: "Picked \(day) at \(priceText)",
			gainWhole: "+$0", gainCents: ".00", gainSigned: "+$0.00", gainPct: "0.0%", up: true,
			shares: PaperPortfolio.shares(newShares), vsMarket: "Even with the market", ahead: true,
			// The ticket's day move ("▲ 1.1%") is the sell row's change.
			dayChange: spec.change, dayUp: !spec.change.hasPrefix("▼"),
			stakeValue: PaperPortfolio.money(amount),
			// Review (2026-09-04): the ticket's stake is the cost basis; no week move yet.
			stakeBasis: PaperPortfolio.stakeLabel(amount), weekGain: "+$0.00"
		)
		let row = SimPick(
			badge: spec.badge, ticker: spec.symbol, sub: "Picked \(day) · just bought",
			amount: "+$0.00", pct: "+0.0%", up: true
		)
		positions.insert(Position(spec: pick, row: row), at: 0)
		persist()
	}

	/// Closes the position: its stake value returns to cash and the pick
	/// joins SOLD · REALIZED, dated today. Review (2026-09-04): false when
	/// the symbol is not held - no phantom sell; the hosts only morph to
	/// "Position closed" on true.
	@discardableResult
	func sell(_ symbol: String, portion: Double = 1) -> Bool {
		guard let i = positions.firstIndex(where: { $0.spec.symbol == symbol }) else { return false }
		let p = min(max(portion, 0), 1)
		guard p > 0 else { return false }
		let held = positions[i]
		let spec = held.spec
		let stake = PaperPortfolio.amount(spec.stakeValue)
		recordTrade(side: "SELL", symbol: symbol, badge: spec.badge, amount: stake * p, shares: (Double(spec.shares) ?? 0) * p, price: PaperPortfolio.amount(spec.priceNow))
		let sub = "Sold \(PaperPortfolio.today()) · \(spec.up ? "profit banked" : "loss realized")"
		if p >= 0.999 {
			positions.remove(at: i)
			cash += stake
			newStake -= stake
			realized.insert(Realized(badge: spec.badge, ticker: symbol, sub: sub, amount: spec.gainSigned, up: spec.up), at: 0)
		} else {
			// A partial sell - the Half / Custom chips (Codex review, PR #167): the sold
			// slice returns to cash and banks its share of the gain; the rest of the
			// position stays, scaled.
			let keep = 1 - p
			let gain = PaperPortfolio.amount(spec.gainSigned)
			cash += stake * p
			newStake -= stake * p
			positions[i] = Position(spec: spec.scaled(keep), row: SimPick(badge: held.row.badge, ticker: held.row.ticker, sub: held.row.sub, amount: PaperPortfolio.signedMoney(gain * keep), pct: held.row.pct, up: held.row.up))
			realized.insert(Realized(badge: spec.badge, ticker: symbol, sub: sub, amount: PaperPortfolio.signedMoney(gain * p), up: spec.up), at: 0)
		}
		persist()
		return true
	}

	/// Review (2026-09-04): the BEST PICK / WORST PICK tiles (1:3898) -
	/// the largest and smallest dollar gain across the ledger (the row
	/// amount, "+$24.00"). Seeded: NVDA +$24 / MSFT -$3, as authored.
	var best: Position? {
		positions.max { PaperPortfolio.amount($0.row.amount) < PaperPortfolio.amount($1.row.amount) }
	}
	var worst: Position? {
		positions.min { PaperPortfolio.amount($0.row.amount) < PaperPortfolio.amount($1.row.amount) }
	}

	/// Review (2026-09-04): a stake as its label - whole dollars "$25"
	/// (grouped, no decimals), otherwise "$25.50".
	static func stakeLabel(_ amount: Double) -> String {
		amount == amount.rounded() ? wholeDollars(amount) : money(amount)
	}

	/// Review (2026-09-04): a gain to whole dollars with its sign - the
	/// tiles' "+$24" / "-$3".
	static func gainLabel(_ gain: Double) -> String {
		(gain < 0 ? "-" : "+") + wholeDollars(abs(gain).rounded())
	}

	static func wholeDollars(_ value: Double) -> String {
		"$" + (wholeFormatter.string(from: NSNumber(value: value)) ?? String(format: "%.0f", value))
	}

	private static let wholeFormatter: NumberFormatter = {
		let f = NumberFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.numberStyle = .decimal
		f.usesGroupingSeparator = true
		f.minimumFractionDigits = 0
		f.maximumFractionDigits = 0
		f.roundingMode = .halfUp
		return f
	}()

	/// "$1,234.56" - every cash figure formats through here: "$" +
	/// en_US_POSIX, two decimals, grouping, half-up (Java's %,.2f rounds
	/// half up: android parity).
	static func money(_ value: Double) -> String {
		"$" + (moneyFormatter.string(from: NSNumber(value: value)) ?? String(format: "%.2f", value))
	}

	private static let moneyFormatter: NumberFormatter = {
		let f = NumberFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.numberStyle = .decimal
		f.usesGroupingSeparator = true
		f.minimumFractionDigits = 2
		f.maximumFractionDigits = 2
		f.roundingMode = .halfUp
		return f
	}()

	/// "$1,234.56" -> 1234.56: a PickSpec's stake value read back.
	static func amount(_ money: String) -> Double {
		Double(
			money.replacingOccurrences(of: "$", with: "")
				.replacingOccurrences(of: ",", with: "")
				.replacingOccurrences(of: "+", with: "")
		) ?? 0
	}

	/// Shares to four places - the tickets' "0.8803".
	static func shares(_ value: Double) -> String {
		String(format: "%.4f", value)
	}

	/// "Sep 4" - the picked / sold date (en_US_POSIX "MMM d").
	static func today() -> String {
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.dateFormat = "MMM d"
		return f.string(from: Date())
	}

	private init() {}
}

extension PickSpec {
	/// The same pick holding more: a top-up buy adds shares and stake at
	/// cost; the authored gain lines (and the week move) stand until
	/// prices move. Review (2026-09-04): the basis follows the stake.
	fileprivate func holding(shares: Double, stakeValue: Double, stakeBasis: Double) -> PickSpec {
		// The return is recomputed over the new basis: $24 on $100 was 24%, on $200
		// it is 12% (Codex review, PR #166 mirror). The dollar gain itself stands.
		let gain = abs(PaperPortfolio.amount(gainSigned))
		let pct = stakeBasis > 0 ? gain / stakeBasis * 100 : 0
		return PickSpec(
			symbol: symbol, badge: badge, company: company, priceNow: priceNow, priceThen: priceThen,
			pickedLine: pickedLine, gainWhole: gainWhole, gainCents: gainCents, gainSigned: gainSigned,
			gainPct: String(format: "%.1f%%", pct), up: up, shares: PaperPortfolio.shares(shares), vsMarket: vsMarket, ahead: ahead,
			dayChange: dayChange, dayUp: dayUp, stakeValue: PaperPortfolio.money(stakeValue),
			stakeBasis: PaperPortfolio.stakeLabel(stakeBasis), weekGain: weekGain
		)
	}

	/// The spec for a slice of a position (partial sells, PR #167): shares, value,
	/// basis and gain scaled; the hero split follows the scaled gain.
	func scaled(_ portion: Double) -> PickSpec {
		if portion >= 0.999 { return self }
		let gain = PaperPortfolio.amount(gainSigned) * portion
		let signed = PaperPortfolio.signedMoney(gain)
		let parts = signed.split(separator: ".", maxSplits: 1)
		return PickSpec(
			symbol: symbol, badge: badge, company: company, priceNow: priceNow, priceThen: priceThen,
			pickedLine: pickedLine, gainWhole: String(parts[0]), gainCents: parts.count > 1 ? "." + parts[1] : ".00", gainSigned: signed,
			gainPct: gainPct, up: up, shares: PaperPortfolio.shares((Double(shares) ?? 0) * portion), vsMarket: vsMarket, ahead: ahead,
			dayChange: dayChange, dayUp: dayUp, stakeValue: PaperPortfolio.money(PaperPortfolio.amount(stakeValue) * portion),
			stakeBasis: PaperPortfolio.stakeLabel(PaperPortfolio.amount(stakeBasis) * portion), weekGain: weekGain
		)
	}
}
