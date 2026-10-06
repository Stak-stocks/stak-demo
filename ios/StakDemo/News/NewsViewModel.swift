import Foundation

private let forYouTickerCap = 10
private let forYouPendingDelaySeconds: UInt64 = 8
private let forYouPendingRetries = 3
/// Market news older than this reloads - it's the server's cached feed, so keeping it fresh costs next to nothing.
private let newsMaxAge: TimeInterval = 15 * 60
/// A failed load is tried again after this long, not on every check.
private let retryAfter: TimeInterval = 2 * 60
/// A new brief session's re-read waits a random 0 to this long, so open apps don't all ask the server at once.
private let briefSpread: TimeInterval = 2 * 60
/// Reads that came back still written for the previous session before the served brief is taken as this one's.
private let maxBriefMismatches = 10

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

    private var started = false
    private var forYouInFlight = false
    private var forYouFor: Set<String>? = nil
    private var forYouAt: Date? = nil
    private var newsLoadedAt: Date? = nil
    private var newsAttemptAt: Date? = nil
    private var newsInFlight = false
    /// The StakClock.briefSessionKey of the session the shown brief was written for.
    private var briefKey: String? = nil
    private var briefFailed = false
    private var briefAttemptAt: Date? = nil
    private var briefInFlight = false
    /// The new session waiting for its re-read, and how long it waits (see briefSpread).
    private var spreadKey: String? = nil
    private var spreadUntil: Date? = nil
    /// Reads for `mismatchKey`'s session that came back written for the one before.
    private var mismatchKey: String? = nil
    private var mismatches = 0
    private let repo = StockRepository.shared

    /// The first load, once per signed-in shell - MainTabsView calls it at launch, so Home's mood card and deck and the
    /// News tab share one set of requests (Android loads in NewsViewModel's init; DailyBriefHolder shares it).
    func start() async {
        guard !started else { return }
        started = true
        // The brief is per account: without a session there's no brief to ask for (the demo keeps its authored mood).
        async let forYou: Void = fetchForYouNews()
        await run(news: true, brief: Session.shared.token != nil)
        await forYou
    }

    /// Keeps the brief and the market news current while the app is open, with no pull to refresh (Robinhood-style):
    /// MainTabsView calls this every minute and on returning to the app. The news reloads once it's 15 minutes old;
    /// the brief once per market session (StakClock.briefPhase). Anything that failed is tried again every 2 minutes.
    /// Mirrors android NewsViewModel.refreshIfStale.
    func refreshIfStale() async {
        guard started else { return }
        let now = Date()
        await run(news: isNewsDue(now), brief: isBriefDue(now))
    }

    /// The error card's Retry: what failed, now - not at the next 2-minute retry.
    func retryNow() async {
        await run(
            news: marketFailed && !newsInFlight,
            brief: briefFailed && !briefInFlight && Session.shared.token != nil
        )
    }

    /// Claims the requests before any starts - a second call in the same moment (the minute tick and the return to
    /// the app) then sees them in flight and doesn't send them again - and runs them together.
    private func run(news: Bool, brief: Bool) async {
        guard news || brief else { return }
        let now = Date()
        if news { newsInFlight = true; newsAttemptAt = now }
        if brief { briefInFlight = true; briefAttemptAt = now }
        await withTaskGroup(of: Void.self) { group in
            if news { group.addTask { await self.fetchMarketNews() } }
            if brief { group.addTask { await self.fetchDailyBrief() } }
        }
    }

    private func isNewsDue(_ now: Date) -> Bool {
        if newsInFlight { return false }
        if marketFailed { return newsAttemptAt.map { now.timeIntervalSince($0) >= retryAfter } ?? true }
        return newsLoadedAt.map { now.timeIntervalSince($0) >= newsMaxAge } ?? true
    }

    private func isBriefDue(_ now: Date) -> Bool {
        guard Session.shared.token != nil, !briefInFlight else { return false }
        if briefFailed { return briefAttemptAt.map { now.timeIntervalSince($0) >= retryAfter } ?? true }
        let key = StakClock.briefSessionKey(now: now)
        if key == briefKey { return false }
        // A read for this session already came back written for the last one: ask again every 2 minutes.
        if mismatchKey == key && mismatches > 0 {
            return briefAttemptAt.map { now.timeIntervalSince($0) >= retryAfter } ?? true
        }
        // A new session (not the first load): wait a random 0-2 minutes, so open apps don't all ask at once.
        if briefKey != nil {
            if spreadKey != key {
                spreadKey = key
                spreadUntil = now.addingTimeInterval(.random(in: 0...briefSpread))
            }
            if let until = spreadUntil, now < until { return false }
        }
        return true
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

    /// Called through run(), which has claimed it.
    private func fetchMarketNews() async {
        defer { newsInFlight = false }
        do {
            let result = try await repo.getMarketNews()
            // Assigned only on a change: every publish re-renders Home and News.
            if result.articles != marketArticles { marketArticles = result.articles }
            if marketFailed { marketFailed = false }
            newsLoadedAt = Date()
        } catch {
            if !marketFailed { marketFailed = true }
        }
        if !marketSettled { marketSettled = true }
    }

    /// Called through run(), which has claimed it.
    private func fetchDailyBrief() async {
        defer { briefInFlight = false }
        let key = StakClock.briefSessionKey()
        let phase = StakClock.briefPhase()
        guard let b = try? await repo.getDailyBrief() else {
            briefFailed = true
            // Exit the loading state with no mood ("calm" used to be reported whenever the request failed). A failed
            // re-read keeps the brief already shown - it doesn't turn it into "Mood unavailable".
            if dailyBrief == nil { dailyBrief = DailyBriefResponse(mood: "") }
            return
        }
        briefFailed = false
        if b != dailyBrief { dailyBrief = b }
        if mismatchKey != key { mismatchKey = key; mismatches = 0 }
        // Taken as this session's only once it says so (see StakClock.briefFits), or after enough tries that the
        // server's answer is simply what this session is.
        if StakClock.briefFits(phase, session: b.session, marketClosed: b.marketClosed, dayLabel: b.dayLabel)
            || mismatches >= maxBriefMismatches {
            briefKey = key
            mismatches = 0
        } else {
            mismatches += 1
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
                // Retried in the background: the load doesn't wait out the 8s gaps.
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
