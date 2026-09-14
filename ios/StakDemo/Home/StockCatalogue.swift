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

	/// Ticker or company match, case-insensitive, for the Search page.
	static func search(_ query: String) -> [CollStock] {
		let q = query.trimmingCharacters(in: .whitespaces)
		if q.isEmpty { return [] }
		return all
			.filter { $0.ticker.localizedCaseInsensitiveContains(q) || $0.company.localizedCaseInsensitiveContains(q) }
			.sorted { a, b in
				let ap = a.ticker.lowercased().hasPrefix(q.lowercased()) ? 0 : 1
				let bp = b.ticker.lowercased().hasPrefix(q.lowercased()) ? 0 : 1
				return ap < bp
			}
	}
}
