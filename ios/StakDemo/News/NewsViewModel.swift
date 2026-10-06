import Foundation

private let forYouTickerCap = 10
private let forYouPendingDelaySeconds: UInt64 = 8
private let forYouPendingRetries = 3

/// Fetches and publishes all live data for the News screen:
/// market news, For You news (per holdings), and the daily brief.
/// Mirrors android ui/news/NewsViewModel.kt.
@MainActor
final class NewsViewModel: ObservableObject {
    @Published var marketArticles: [NewsArticleDto] = []
    @Published var forYouArticles: [NewsArticleDto] = []
    @Published var dailyBrief: DailyBriefResponse? = nil
    @Published var marketFailed = false
    @Published var marketSettled = false

    private var forYouLoaded = false
    private var forYouFor: Set<String>? = nil
    private var forYouAt: Date? = nil
    private let repo = StockRepository.shared

    func load() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchMarketNews() }
            group.addTask { await self.fetchDailyBrief() }
            group.addTask { await self.fetchForYouNews() }
        }
    }

    func refresh() async {
        forYouLoaded = false
        forYouFor = nil
        forYouAt = nil
        await load()
    }

    /// Re-runs For You if holdings changed or the last fetch was over a minute ago.
    func refreshForYou() async {
        let held = MyStakHoldings.shared.tickers
        let sameHoldings = forYouFor == held
        let freshEnough = forYouAt.map { Date().timeIntervalSince($0) < 60 } ?? false
        if sameHoldings && freshEnough { return }
        await fetchForYouNews()
    }

    private func fetchMarketNews() async {
        do {
            let result = try await repo.getMarketNews()
            marketArticles = result.articles
            marketFailed = false
        } catch {
            marketFailed = true
        }
        marketSettled = true
    }

    private func fetchDailyBrief() async {
        if let b = try? await repo.getDailyBrief() {
            dailyBrief = b
        } else {
            dailyBrief = DailyBriefResponse(mood: "")
        }
    }

    private func fetchForYouNews(attempt: Int = 0) async {
        let held = Array(MyStakHoldings.shared.tickers.prefix(forYouTickerCap))
        forYouFor = MyStakHoldings.shared.tickers
        guard !held.isEmpty else { forYouArticles = []; return }
        do {
            let result = try await repo.getForYouNews(held)
            let pending = result.pending
            let articles = result.results.flatMap { $0.articles }
            forYouArticles = articles
            forYouAt = Date()
            if !pending.isEmpty, attempt < forYouPendingRetries {
                try? await Task.sleep(nanoseconds: forYouPendingDelaySeconds * 1_000_000_000)
                await fetchForYouNews(attempt: attempt + 1)
            }
        } catch {
            // Keep whatever we had
        }
    }
}
