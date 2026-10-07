import Foundation

/// Readings drawn from the demo collection catalog and the paper ledger: Simulate's insight, the demo account's Taste
/// Graph buckets, and the tile change/percent formatting the collection pages share. Mirrors android
/// data/StakInsights.kt.
enum StakInsights {
	/// One allocation bucket: a collection (or "other") and its share of the stocks.
	struct Bucket {
		let id: String
		let name: String
		let count: Int
		let share: Double
	}

	private static let theme: [String: String] = [
		"aitech": "tech and AI", "finance": "finance", "green": "green energy",
		"realestate": "real estate", "health": "healthcare", "consumer": "consumer brands"
	]
	private static let bucketName: [String: String] = [
		"aitech": "Tech & AI", "finance": "Finance", "green": "Green Energy",
		"realestate": "Real Estate", "health": "Healthcare", "consumer": "Consumer"
	]

	/// "▲ 2.4%" -> 2.4, "▼ 0.4%" -> -0.4.
	static func changePct(_ s: CollStock) -> Double {
		let v = Double(s.change.filter { $0.isNumber || $0 == "." }) ?? 0
		return s.up ? v : -v
	}

	static func signedPct(_ pct: Double) -> String {
		(pct < 0 ? "-" : "+") + String(format: "%.1f", abs(pct)) + "%"
	}

	private static func word(_ n: Int) -> String {
		let words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]
		return n < words.count ? words[n] : String(n)
	}

	/// Allocation by collection for the given symbols; unknown symbols land in Other.
	static func buckets(_ symbols: [String]) -> [Bucket] {
		guard !symbols.isEmpty else { return [] }
		let ids = symbols.map { sym in StakCollections.all.first { $0.stocks.contains { $0.ticker == sym } }?.id ?? "other" }
		var counts: [String: Int] = [:]
		for id in ids { counts[id, default: 0] += 1 }
		return counts
			.sorted { a, b in
				if (a.key == "other") != (b.key == "other") { return b.key == "other" }
				// Ties by id: Dictionary order changes every launch.
				return a.value != b.value ? a.value > b.value : a.key < b.key
			}
			.map { Bucket(id: $0.key, name: bucketName[$0.key] ?? "Other", count: $0.value, share: Double($0.value) / Double(symbols.count)) }
	}

	/// The company names in `bucketId` among `symbols` - the demo Taste Graph's evidence.
	static func namesIn(_ bucketId: String, _ symbols: [String]) -> [String] {
		symbols.compactMap { sym in
			guard let c = StakCollections.all.first(where: { $0.stocks.contains { $0.ticker == sym } }), c.id == bucketId else { return nil }
			return c.stocks.first { $0.ticker == sym }?.company
		}
	}

	/// Simulate's INSIGHT card, read from a new account's own picks.
	@MainActor
	static func simInsight() -> String {
		let symbols = PaperPortfolio.shared.positions.map { $0.spec.symbol }
		if symbols.count == 1 { return "\(symbols[0]) is your first pick. Insights start once it has a week of moves." }
		let all = buckets(symbols)
		guard let top = all.first, top.id != "other", top.count >= 2 else {
			return "Your \(symbols.count) picks span \(all.count) industries. STAK reads a pattern once a few of them share one."
		}
		return "\(word(top.count).capitalizedFirst) of your \(symbols.count) picks are \(theme[top.id] ?? top.name) names. Your taste has a type."
	}
}

private extension String {
	var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
}
