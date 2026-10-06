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
    private var started = false
    private var forYouInFlight = false
    private var forYouFor: Set<String>? = nil
    private var forYouAt: Date? = nil
    private let repo = StockRepository.shared

    /// The first load, once per signed-in shell - MainTabsView calls it at launch, so Home's mood card and deck and the
    /// News tab share one set of requests (Android loads in NewsViewModel's init; DailyBriefHolder shares it).
    func start() async {
        guard !started else { return }
        started = true
        await load()
    }

    func load() async {
        // The brief is per account: without a session there's no brief to ask for (the demo keeps its authored mood).
        let signedIn = Session.shared.token != nil
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchMarketNews() }
            if signedIn { group.addTask { await self.fetchDailyBrief() } }
            group.addTask { await self.fetchForYouNews() }
        }
    }

    func refresh() async {
        forYouLoaded = false
        forYouFor = nil
        forYouAt = nil
        await load()
    }

    /// Home's pull to refresh: the market news and the brief, together - not For You, which Home doesn't show.
    func refreshMarket() async {
        let signedIn = Session.shared.token != nil
        async let news: Void = fetchMarketNews()
        if signedIn { await fetchDailyBrief() }
        await news
    }

    /// Re-runs For You if holdings changed or the last fetch was over a minute ago.
    func refreshForYou() async {
        // The launch load may still be on its way (News opened straight after launch): don't send it twice.
        if forYouInFlight { return }
        let held = MyStakHoldings.shared.tickers
        let sameHoldings = forYouFor == held
        let freshEnough = forYouAt.map { Date().timeIntervalSince($0) < 60 } ?? false
        if sameHoldings && freshEnough { return }
        await fetchForYouNews()
    }

    private func fetchMarketNews() async {
        do {
            let result = try await repo.getMarketNews()
            // Assigned only on a change: every publish re-renders Home and News.
            if result.articles != marketArticles { marketArticles = result.articles }
            if marketFailed { marketFailed = false }
        } catch {
            if !marketFailed { marketFailed = true }
        }
        if !marketSettled { marketSettled = true }
    }

    private func fetchDailyBrief() async {
        if let b = try? await repo.getDailyBrief() {
            if b != dailyBrief { dailyBrief = b }
        } else if dailyBrief == nil {
            // Exit the loading state with no mood ("calm" used to be reported whenever the request failed). A failed
            // refresh keeps the brief already shown - it doesn't turn it into "Mood unavailable".
            dailyBrief = DailyBriefResponse(mood: "")
        }
    }

    private func fetchForYouNews(attempt: Int = 0) async {
        let held = Array(MyStakHoldings.shared.tickers.prefix(forYouTickerCap))
        forYouFor = MyStakHoldings.shared.tickers
        guard !held.isEmpty else { forYouArticles = []; return }
        forYouInFlight = true
        defer { forYouInFlight = false }
        do {
            let result = try await repo.getForYouNews(held)
            let pending = result.pending
            let articles = result.results.flatMap { $0.articles }
            forYouArticles = articles
            forYouAt = Date()
            if !pending.isEmpty, attempt < forYouPendingRetries {
                // Retried in the background: a load or a pull to refresh doesn't wait out the 8s gaps.
                Task { [weak self] in
                    try? await Task.sleep(nanoseconds: forYouPendingDelaySeconds * 1_000_000_000)
                    await self?.fetchForYouNews(attempt: attempt + 1)
                }
            }
        } catch {
            // Keep whatever we had
        }
    }
}
