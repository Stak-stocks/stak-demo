import Foundation

/// The real ledger's value across a range - what the account's actual cash and shares were worth on each trading day,
/// built from PaperPortfolio's own trade log plus every traded symbol's real price history (the /chart every stock page
/// reads). Never a shape invented to fill the box (product decision, 2026-09-18): a day this can't be built for is left
/// out, not guessed. The demo's authored numbers carry no live price behind them, so it's never built for that account.
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

	/// `symbol`'s shares actually held as of `day` - the ledger's running total up to it, not today's count.
	private static func sharesHeld(at day: Int, _ symbol: String, _ trades: [PaperPortfolio.Trade]) -> Double {
		trades.filter { $0.symbol == symbol && $0.epochDay <= day }.reduce(0) { $0 + ($1.isBuy ? $1.shares : -$1.shares) }
	}

	/// Cash on hand as of `day` - the starting balance plus every trade's cash move up to it.
	private static func cash(at day: Int, _ trades: [PaperPortfolio.Trade], paperStart: Double) -> Double {
		paperStart + trades.filter { $0.epochDay <= day }.reduce(0) { $0 + ($1.isBuy ? -$1.amount : $1.amount) }
	}

	/// The account's real value on each trading day `range` covers, from its first trade to today - nil while there's
	/// nothing to build from (no trades) or a traded symbol's chart didn't come back.
	static func build(_ trades: [PaperPortfolio.Trade], paperStart: Double, range: String) async -> [Point]? {
		guard !trades.isEmpty else { return nil }
		var symbols: [String] = []
		for t in trades where !symbols.contains(t.symbol) { symbols.append(t.symbol) }
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
		// Every traded symbol's history, or no line: a missing one would count its shares as $0 and draw a drop that never
		// happened.
		guard closesBySymbol.count == symbols.count, let firstTradeDay = trades.map(\.epochDay).min() else { return nil }
		// Every symbol's own trading days in the window - a day none of them traded (a holiday) never becomes a point.
		let days = Set(closesBySymbol.values.flatMap(\.keys)).filter { $0 >= firstTradeDay }.sorted()
		guard days.count >= 2 else { return nil }
		return days.map { day in
			let held = symbols.reduce(0.0) { total, sym in
				guard let closes = closesBySymbol[sym],
					  // The latest close that symbol has at or before this day - it may not have traded on this one.
					  let priceDay = closes.keys.filter({ $0 <= day }).max(), let price = closes[priceDay] else { return total }
				return total + sharesHeld(at: day, sym, trades) * price
			}
			return Point(epochDay: day, value: cash(at: day, trades, paperStart: paperStart) + held)
		}
	}

	/// `points`' values as the 0...1 fractions SeriesLine draws.
	static func fractions(_ points: [Point]) -> [CGFloat] { chartFractions(points.map(\.value)) }
}
