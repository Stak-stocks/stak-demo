import Foundation

/// The catalogue's ticker for each company name and name for each ticker, so news search can find a story by either:
/// "NVDA" finds "Nvidia Stock Rises...", and "Nvidia" finds a story tagged NVDA. Filled from the brands list Discover
/// already downloads, or fetched once when search needs it first. Mirrors android data/BrandNames.kt.
@MainActor
final class BrandNames: ObservableObject {
	static let shared = BrandNames()

	/// Ticker -> name, e.g. "GOOGL" -> "Google". Published, so an open search re-runs once it fills.
	@Published private(set) var byTicker: [String: String] = [:]

	func fill(_ brands: [BrandSummaryDto]) {
		guard !brands.isEmpty else { return }
		var map: [String: String] = [:]
		for b in brands where !b.ticker.isEmpty && !b.name.isEmpty { map[b.ticker.uppercased()] = Self.bareName(b.name) }
		byTicker = map
	}

	func ensure() async {
		guard byTicker.isEmpty, let res = try? await StockRepository.shared.getBrands() else { return }
		fill(res.brands)
	}

	/// What else a search for `query` should look for: the company's name when the query is a ticker, and the tickers
	/// of companies whose name contains the query. Names match from 3 letters; tickers only as the whole query, so "on"
	/// isn't read as ON Semiconductor.
	func expand(_ query: String) -> Set<String> {
		let q = query.trimmingCharacters(in: .whitespaces)
		guard !q.isEmpty else { return [] }
		var out = Set<String>()
		if let name = byTicker[q.uppercased()] { out.insert(name) }
		if q.count >= 3 {
			for (ticker, name) in byTicker where name.range(of: q, options: .caseInsensitive) != nil { out.insert(ticker) }
		}
		return out
	}

	/// "Jack in the Box Inc" is written "Jack in the Box" in headlines.
	private static func bareName(_ name: String) -> String {
		name.replacingOccurrences(of: #"\s*\(.*\)"#, with: "", options: .regularExpression)
			.replacingOccurrences(
				of: #"[,\s]+(Inc\.?|Corp\.?|Corporation|Co\.?|Company|Group|Holdings|plc|Ltd\.?)$"#,
				with: "", options: [.regularExpression, .caseInsensitive]
			)
			.trimmingCharacters(in: .whitespaces)
	}
}
