import Foundation

/// What a NEW account's screens say about its own stocks (product audit,
/// 2026-09-05: with a single save, My STAK read "Six of your fourteen
/// picks", a +4.9% week, TSLA/SNOW as best and worst and a five-bucket
/// allocation - the demo persona's frames). The demo account keeps its
/// authored copy and art (user, 2026-09-04: the authored look wins);
/// everything here is read from MyStakHoldings, the collection catalogue
/// and the paper ledger. Mirrors android ui/StakInsights.kt.
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

	/// The collections the user holds stocks in, biggest first - the Other collection (uncatalogued saves) included (Codex review, PR #167).
	static func heldGroups() -> [(StakCollection, [CollStock])] {
		let holdings = MyStakHoldings.shared.tickers
		var groups = StakCollections.all.map { ($0, $0.held(in: holdings)) }
		if let other = StakCollections.other(holdings: holdings) { groups.append((other, other.stocks)) }
		return groups
			.filter { !$0.1.isEmpty }
			.sorted { $0.1.count > $1.1.count }
	}

	/// "tech and AI names" for a catalogued group; "stocks you found yourself" for the Other collection.
	private static func themeNames(_ id: String) -> String { theme[id].map { "\($0) names" } ?? "stocks you found yourself" }

	static func heldStocks() -> [CollStock] { heldGroups().flatMap { $0.1 } }

	/// "▲ 2.4%" -> 2.4, "▼ 0.4%" -> -0.4.
	static func changePct(_ s: CollStock) -> Double {
		let v = Double(s.change.filter { $0.isNumber || $0 == "." }) ?? 0
		return s.up ? v : -v
	}

	/// The week's move across the held stocks - their average change.
	static func weekChangePct() -> Double {
		let held = heldStocks()
		return held.isEmpty ? 0 : held.map(changePct).reduce(0, +) / Double(held.count)
	}

	static func signedPct(_ pct: Double) -> String {
		(pct < 0 ? "-" : "+") + String(format: "%.1f", abs(pct)) + "%"
	}

	/// Best and worst held stock this week - only meaningful with two or more.
	static func bestWorst() -> (CollStock, CollStock)? {
		let held = heldStocks()
		guard held.count >= 2,
			let best = held.max(by: { changePct($0) < changePct($1) }),
			let worst = held.min(by: { changePct($0) < changePct($1) }) else { return nil }
		return (best, worst)
	}

	/// "You lean into tech and AI."
	static func readHeadline() -> String {
		guard let top = heldGroups().first else {
			return MyStakHoldings.shared.count > 0 ? "Your saves sit outside the six collections." : "Your read starts with your first save."
		}
		return "You lean into \(theme[top.0.id] ?? "stocks you found yourself")."
	}

	static func readBody() -> String {
		let groups = heldGroups()
		let total = groups.reduce(0) { $0 + $1.1.count }
		guard let top = groups.first else {
			return MyStakHoldings.shared.count > 0 ? "Save a stock from one of the collections and STAK will read your taste from it."
				: "Save stocks from the Discover deck and STAK will read your taste from them."
		}
		let themeName = theme[top.0.id]
		if total == 1 {
			return "\(top.1[0].ticker) is your first save\(themeName.map { ", a \($0) name" } ?? ""). Save a few more and STAK will read the pattern."
		}
		let lead = "\(word(top.1.count).capitalizedFirst) of your \(word(total)) picks are \(themeNames(top.0.id))."
		if groups.count > 1 {
			let second = groups[1]
			return lead + " \(word(second.1.count).capitalizedFirst) more \(second.1.count == 1 ? "sits" : "sit") \(theme[second.0.id].map { "in \($0)" } ?? "outside the six collections")."
		}
		return lead + " Your STAK is all \(themeName ?? "your own finds") for now."
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
				return a.value > b.value
			}
			.map { Bucket(id: $0.key, name: bucketName[$0.key] ?? "Other", count: $0.value, share: Double($0.value) / Double(symbols.count)) }
	}

	/// Home "Why this matters": how many held stocks today's stories touch.
	static func whyThisMattersBody(newsTickers: Set<String>) -> String {
		let held = MyStakHoldings.shared.tickers
		let hit = held.filter { newsTickers.contains($0) }.count
		let n = held.count
		if n == 1, hit == 1 { return "\(held.first!) sits in an industry today's news hits." }
		if n == 1 { return "\(held.first!) is quiet in today's news - nothing hits it yet." }
		if hit == 0 { return "None of your \(n) saved stocks are in today's news - a quiet day for your STAK." }
		if hit == n { return "All \(n) of your saved stocks sit in industries today's news hits." }
		return "\(hit) of your \(n) saved stocks sit in industries today's news hits."
	}

	/// Simulate's INSIGHT card, read from a new account's own picks.
	static func simInsight() -> String {
		let symbols = PaperPortfolio.shared.positions.map { $0.spec.symbol }
		if symbols.count == 1 { return "\(symbols[0]) is your first pick. Insights start once it has a week of moves." }
		let all = buckets(symbols)
		guard let top = all.first, top.id != "other", top.count >= 2 else {
			return "Your \(symbols.count) picks span \(all.count) industries. STAK reads a pattern once a few of them share one."
		}
		return "\(word(top.count).capitalizedFirst) of your \(symbols.count) picks are \(theme[top.id] ?? top.name) names. Your taste has a type."
	}

	/// A demo line reshaped to a real move: flat at 0%, the full authored swing at +/-5%, mirrored when negative.
	static func scaled(_ series: [CGFloat], _ pct: Double) -> [CGFloat] {
		let amp = CGFloat(min(1, abs(pct) / 5))
		let sign: CGFloat = pct < 0 ? -1 : 1
		return series.map { 0.5 + ($0 - 0.5) * amp * sign }
	}
}

private extension String {
	var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
}
