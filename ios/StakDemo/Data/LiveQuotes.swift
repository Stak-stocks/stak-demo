import Foundation

/// Live price lookups for the surfaces that aren't backed by a view model of their own - Simulate's positions, its saved
/// rows and the shared practice-buy ticket. Observable, so a position reading `cached` redraws the moment a refresh
/// lands. Mirrors android data/LiveQuotes.kt.
@MainActor
final class LiveQuotes: ObservableObject {
	static let shared = LiveQuotes()

	/// A symbol's last-fetched price and today's move, in percent.
	struct Quote: Equatable {
		let price: Double
		let changePct: Double
	}

	@Published private(set) var cache: [String: Quote] = [:]

	private init() {}

	/// The latest quote for `symbol`, or nil when it can't be fetched.
	func quote(_ symbol: String) async -> Quote? {
		// A $0 price is no price: it would value a position at nothing and fill an order for no shares.
		guard let res = try? await StockRepository.shared.batchQuotes([symbol]), let q = res.quotes[symbol] ?? nil, q.price > 0 else { return nil }
		let quote = Quote(price: q.price, changePct: q.changePercent)
		cache[symbol] = quote
		return quote
	}

	/// Whatever `refresh` (or `quote`) last fetched for `symbol` - nil before the first one lands.
	func cached(_ symbol: String) -> Quote? { cache[symbol] }

	/// Refreshes every symbol in one batched request - a stock that doesn't come back this time keeps its last quote.
	func refresh(_ symbols: [String]) async {
		guard !symbols.isEmpty, let res = try? await StockRepository.shared.batchQuotes(symbols) else { return }
		var next = cache
		for (symbol, q) in res.quotes {
			if let q, q.price > 0 { next[symbol] = Quote(price: q.price, changePct: q.changePercent) }
		}
		if next != cache { cache = next }
	}
}
