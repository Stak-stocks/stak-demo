import SwiftUI

/// The stocks in the user's My STAK (user, 2026-08-23): a story earns the
/// "In your STAK" chip only when it relates to a stock the user actually
/// holds - Google news + Google in My STAK -> chip; otherwise none.
///
/// Codex audit (2026-09-04): this store is the single source of truth for
/// every My STAK count. The frame (1:3155) authored three numbers that never
/// agreed - chips 5/3/3/2/4/2, "Across 14 stocks", allocation 6+3+3+2+1 -
/// so the seed grew to every ticker the six authored collections list plus
/// the Overview's Best/Worst (TSLA, SNOW) = 21: the chips still read their
/// authored counts at rest and every other number derives from here.
/// Saves from the Discover deck and the article bookmark add to it; the
/// saved Stock Detail's Unsave removes. In production the backend serves
/// the holdings. Mirrors android ui/MyStakHoldings.kt.
final class MyStakHoldings: ObservableObject {
	static let shared = MyStakHoldings()

	/// The authored demo account's holdings (the frames' 5/3/3/2/4/2 counts).
	static let seed: Set<String> = [
		"NVDA", "AAPL", "MSFT", "GOOGL", "AMD",
		"JPM", "V", "GS",
		"ENPH", "NEE", "FSLR",
		"PLD", "O",
		"LLY", "UNH", "JNJ", "PFE",
		"COST", "NKE",
		"TSLA", "SNOW"
	]
	@Published private(set) var tickers: Set<String> = MyStakHoldings.seed

	/// Product audit (2026-09-05): a NEW account holds nothing until the user saves; the demo keeps the seed.
	func reset(demo: Bool) {
		// The persisted set wins over the seed (product audit, 2026-09-05).
		tickers = StakStore.stringSet("holdings") ?? (demo ? MyStakHoldings.seed : [])
		loadSavedAt()
	}

	private func persist() { StakStore.set(tickers, for: "holdings") }

	/// Every held ticker - the Overview's "Across N stocks".
	var count: Int { tickers.count }

	/// True when any of the story's related tickers is held.
	func holdsAny(_ related: [String]) -> Bool {
		related.contains { tickers.contains($0) }
	}

	/// When each stock was saved on THIS account (days since 1970) - the "Since you saved" card reads it (product audit, 2026-09-05).
	private var savedAt: [String: Int] = [:]

	private static var today: Int { Int(Date().timeIntervalSince1970 / 86400) }

	/// Days since the stock was saved on this account; nil when the save predates the record (the demo's authored saves).
	func daysSinceSaved(_ ticker: String) -> Int? { savedAt[bare(ticker)].map { MyStakHoldings.today - $0 } }

	private func loadSavedAt() {
		savedAt = [:]
		for entry in (StakStore.string("saved_at") ?? "").split(separator: ",") {
			let parts = entry.split(separator: "=", maxSplits: 1)
			if parts.count == 2, let day = Int(parts[1]) { savedAt[String(parts[0])] = day }
		}
	}

	private func persistSavedAt() {
		StakStore.set(savedAt.map { "\($0.key)=\($0.value)" }.sorted().joined(separator: ","), for: "saved_at")
	}

	func add(_ ticker: String) {
		let sym = bare(ticker)
		tickers.insert(sym)
		if savedAt[sym] == nil { savedAt[sym] = MyStakHoldings.today; persistSavedAt() }
		persist()
	}

	/// The saved Stock Detail's Unsave - the collection page and every
	/// count drop the stock together (Codex audit 2026-09-04).
	func remove(_ ticker: String) {
		tickers.remove(bare(ticker))
		savedAt[bare(ticker)] = nil
		persistSavedAt()
		persist()
	}

	/// Deck cards carry "NVDA · NVIDIA Corp" - hold the bare symbol.
	private func bare(_ ticker: String) -> String {
		ticker.components(separatedBy: " · ").first ?? ticker
	}

	private init() {}
}
