import Foundation

/// Every stock the six My STAK collections catalogue, by ticker. Saved Peek's only remaining use for it: a company
/// name for a save that predates the account's own saved-stock record (the demo persona's seeded tickers). Trending
/// Today and a real save's name both come from the backend now (HomeViewModel.trending, MyStakHoldings.nameOf).
/// Mirrors android ui/home/StockCatalogue.kt.
enum StockCatalogue {
	static let all: [CollStock] = {
		var seen = Set<String>()
		return StakCollections.all.flatMap(\.stocks).filter { seen.insert($0.ticker).inserted }
	}()
}
