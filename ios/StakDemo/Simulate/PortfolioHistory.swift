import Foundation

/// The real ledger's value across a range - what the account's actual cash and shares were worth on each trading day,
/// priced with every held or traded symbol's real price history (the /chart every stock page reads). Never a shape
/// invented to fill the box (product decision, 2026-09-18): a day this can't be built for is left out, not guessed.
/// The demo's authored numbers carry no live price behind them, so it's never built for that account.
///
/// Built BACKWARD from the server's snapshot - today's cash and shares, then each later trade undone - not forward
/// from the starting cash: a portfolio holding stock bought before the trade log existed (or whose oldest trades
/// fell off the page) replayed forward drew a line that tracked only the logged trades and disagreed with the hero.
/// Mirrors android ui/simulate/PortfolioHistory.kt.
enum PortfolioHistory {
	/// One trading day's real portfolio value.
	struct Point: Equatable {
		let epochDay: Int
		let value: Double
	}

	/// A symbol's own closes, one per trading day it actually has - chronological, so the day's last price wins.
	private static func closesByDay(_ prices: [ChartPoint]) -> [Int: Double] {
		var byDay: [Int: Double] = [:]
		for p in prices where p.close > 0 {
			let day = PaperPortfolio.epochDay(p.ts)
			if day > 0 { byDay[day] = p.close }
		}
		return byDay
	}

	/// `symbol`'s shares held at the end of `day`: today's count with every later trade undone.
	private static func sharesHeld(at day: Int, _ symbol: String, now: Double, _ trades: [PaperPortfolio.Trade]) -> Double {
		now - trades.filter { $0.symbol == symbol && $0.epochDay > day }.reduce(0) { $0 + ($1.isBuy ? $1.shares : -$1.shares) }
	}

	/// The account's money that isn't in shares at the end of `day`: today's (cash plus reserved limit orders, whose
	/// fills move no cash) with every later trade's cash move undone.
	private static func cash(at day: Int, now: Double, _ trades: [PaperPortfolio.Trade]) -> Double {
		now - trades.filter { $0.epochDay > day }.reduce(0) { $0 + ($1.isBuy ? -$1.amount : $1.amount) }
	}

	/// The account's real value on each trading day `range` covers - from its first logged trade when it has one -
	/// nil while there's nothing to build from or a symbol's chart didn't come back.
	/// - Parameters:
	///   - cash: today's cash plus the open limit orders' reserved stakes.
	///   - holdings: today's shares by symbol.
	static func build(_ trades: [PaperPortfolio.Trade], cash cashNow: Double, holdings: [String: Double], range: String) async -> [Point]? {
		var symbols: [String] = holdings.keys.sorted()
		for t in trades where !symbols.contains(t.symbol) { symbols.append(t.symbol) }
		guard !symbols.isEmpty else { return nil }
		let closesBySymbol: [String: [Int: Double]] = await withTaskGroup(of: (String, [Int: Double]?).self) { group in
			for sym in symbols {
				group.addTask {
					guard let prices = (try? await StockRepository.shared.getChart(sym, range: range.lowercased()))?.prices else { return (sym, nil) }
					let closes = closesByDay(prices)
					return (sym, closes.isEmpty ? nil : closes)
				}
			}
			var out: [String: [Int: Double]] = [:]
			for await (sym, closes) in group { if let closes { out[sym] = closes } }
			return out
		}
		// Every symbol's history, or no line: a missing one would count its shares as $0 and draw a drop that never
		// happened.
		guard closesBySymbol.count == symbols.count else { return nil }
		// Every symbol's own trading days in the window - a day none of them traded (a holiday) never becomes a point.
		let firstTradeDay = trades.map(\.epochDay).min() ?? Int.min
		let days = Set(closesBySymbol.values.flatMap(\.keys)).filter { $0 >= firstTradeDay }.sorted()
		let points: [Point] = days.compactMap { day in
			var held = 0.0
			for sym in symbols {
				let shares = sharesHeld(at: day, sym, now: holdings[sym] ?? 0, trades)
				guard abs(shares) > 1e-6 else { continue }
				// The latest close that symbol has at or before this day - it may not have traded on this one. A day
				// before its first close can't be priced, and is left out rather than counted at $0.
				guard let closes = closesBySymbol[sym], let priceDay = closes.keys.filter({ $0 <= day }).max(),
					  let price = closes[priceDay] else { return nil }
				held += shares * price
			}
			return Point(epochDay: day, value: cash(at: day, now: cashNow, trades) + held)
		}
		return points.count >= 2 ? points : nil
	}

	/// `points` ending on the hero's own live value: today replaces its close (or follows the last day), so the line
	/// never stops a day short of the figure printed above it.
	static func endingToday(_ points: [Point], value: Double) -> [Point] {
		guard let last = points.last else { return points }
		let today = MyStakHoldings.epochDay(Date(), in: TimeZone(identifier: "America/New_York") ?? .current)
		guard today >= last.epochDay else { return points }
		return (last.epochDay == today ? Array(points.dropLast()) : points) + [Point(epochDay: today, value: value)]
	}

	/// `points`' values as the 0...1 fractions SeriesLine draws.
	static func fractions(_ points: [Point]) -> [CGFloat] { chartFractions(points.map(\.value)) }
}
