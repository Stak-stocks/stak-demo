import Foundation

/// Every stock the demo can name - the union of the six My STAK collections'
/// tiles (ticker, company, quote, day move). Home's Trending strip and the
/// Search page read it (FigJam Home board, 2026-09-14: Trending stocks / Search
/// results). In production the backend serves the universe and the day's
/// movers. Mirrors android ui/home/StockCatalogue.kt.
enum StockCatalogue {
	static let all: [CollStock] = {
		var seen = Set<String>()
		return StakCollections.all.flatMap(\.stocks).filter { seen.insert($0.ticker).inserted }
	}()

	/// The day's biggest movers, either direction - the Trending strip; the collection sort reads the same rule.
	static func trending(limit: Int = 6) -> [CollStock] {
		Array(all.sorted { abs(StakInsights.changePct($0)) > abs(StakInsights.changePct($1)) }.prefix(limit))
	}
}
