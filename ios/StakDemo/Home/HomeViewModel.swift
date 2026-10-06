import Foundation

/// Home's own data: the day's trending stocks and the Saved peek's live moves. The brief (mood, why-it-matters) and
/// the market news (the mood card's deck) are NewsViewModel's - one load shared with the News tab, as Android's
/// DailyBriefHolder is.
@MainActor
final class HomeViewModel: ObservableObject {
	/// Nil until the first answer; empty when the request failed or came back empty - either way the strip hides,
	/// since a placeholder row of blanks would claim a ranking that isn't there. Mirrors android TrendingStrip.
	@Published private(set) var trending: [TrendingStock]? = nil
	/// The Saved peek's day moves (percent), by ticker - a live quote, never the catalogue's fixed one.
	@Published private(set) var savedMoves: [String: Double] = [:]

	private var trendingAt: Date? = nil
	private var savedMovesFor: [String] = []
	private var savedMovesAt: Date? = nil
	private let repo = StockRepository.shared

	/// Skipped within 3 minutes of the last answer: Home's view is rebuilt on every visit to the tab, and the backend
	/// caches its ranking that long anyway.
	func refreshTrending() async {
		if let at = trendingAt, Date().timeIntervalSince(at) < 180 { return }
		do {
			trending = try await repo.getTrending().trending
			trendingAt = Date()
		} catch {
			// Leaving Home cancels the request - not a failure, and it mustn't hide a strip that loaded.
			if Task.isCancelled || (error as? URLError)?.code == .cancelled || error is CancellationError { return }
			trending = []
		}
	}

	/// The peek's tickers' moves, at most once a minute for the same tickers.
	func refreshSavedMoves(_ tickers: [String]) async {
		guard !tickers.isEmpty else { return }
		if tickers == savedMovesFor, let at = savedMovesAt, Date().timeIntervalSince(at) < 60 { return }
		guard let res = try? await repo.batchQuotes(tickers) else { return }
		var moves: [String: Double] = [:]
		for (ticker, quote) in res.quotes { if let quote { moves[ticker] = quote.changePercent } }
		savedMoves = moves
		savedMovesFor = tickers
		savedMovesAt = Date()
	}
}
