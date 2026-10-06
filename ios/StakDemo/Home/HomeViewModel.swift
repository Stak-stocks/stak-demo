import Foundation

// Maps a live TrendingStock into the CollStock tile shape used by TrendingStrip.
extension CollStock {
    init(from s: TrendingStock) {
        let up = s.changePercent >= 0
        self.init(
            badge: String(s.ticker.prefix(1)),
            change: String(format: "%@%.2f%%", up ? "▲ " : "▼ ", abs(s.changePercent)),
            up: up,
            ticker: s.ticker,
            company: s.name,
            price: String(format: "$%.2f", s.price)
        )
    }
}

/// Fetches and publishes all live data for the Home screen:
/// the daily brief (mood gauge + deck headlines), trending stocks,
/// and the why-this-matters personalised impact line.
/// Mirrors android ui/home/ — DailyBriefHolder + MarketMoodFeed + NewsDeckFeed + StockCatalogue.
@MainActor
final class HomeViewModel: ObservableObject {
    @Published var deckStories: [NewsDeckFeed.Story] = NewsDeckFeed.demoStories
    @Published var moodLead: String = MarketMoodFeed.demoStatusLead
    @Published var moodRest: String = MarketMoodFeed.demoStatusRest
    @Published var moodAngle: Double = MarketMoodFeed.demoAngleDeg
    @Published var trending: [CollStock] = []
    @Published var brief: DailyBriefResponse? = nil
    @Published var personalizedImpact: String = WhyThisMattersFeed.demoBody

    private var loaded = false
    private let repo = StockRepository.shared

    func fetch() async {
        guard !loaded else { return }
        loaded = true
        async let b: DailyBriefResponse? = try? repo.getDailyBrief()
        async let t: TrendingResponse? = try? repo.getTrending()
        async let n: MarketNewsResponse? = try? repo.getMarketNews()

        if let brief = await b {
            self.brief = brief
            applyMood(brief)
            if !brief.personalizedImpact.isEmpty { personalizedImpact = brief.personalizedImpact }
        }
        if let tr = await t, !tr.trending.isEmpty {
            trending = tr.trending.prefix(6).map { CollStock(from: $0) }
        }
        if let news = await n, !news.articles.isEmpty {
            let stories = news.articles.prefix(NewsDeckFeed.deckSize).map {
                NewsDeckFeed.Story(title: $0.headline,
                                   body: $0.summary.isEmpty ? $0.explanation : $0.summary)
            }
            deckStories = NewsDeckFeed.padToDeck(Array(stories))
        }
    }

    func refresh() async { loaded = false; await fetch() }

    private func applyMood(_ b: DailyBriefResponse) {
        let m = b.mood.lowercased()
        let score: Double
        if m.contains("extreme greed") || m.contains("very bull") { score = 90 }
        else if m.contains("greed") || m.contains("bull") { score = 72 }
        else if m.contains("neutral") || m.contains("mixed") { score = 50 }
        else if m.contains("fear") || m.contains("bear") { score = 28 }
        else if m.contains("extreme fear") || m.contains("panic") { score = 10 }
        else { score = 50 }
        moodAngle = MarketMoodFeed.angleFor(score: score)
        moodLead = MarketMoodFeed.leadFor(score: score)
        moodRest = MarketMoodFeed.restFor(score: score)
    }
}
