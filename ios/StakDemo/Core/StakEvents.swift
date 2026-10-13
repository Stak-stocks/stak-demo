import Foundation

/// The engagement log (POST /api/swipe/event): what a real account opens and asks about,
/// kept from day one so the Taste Graph can show its evidence.
/// Fire-and-forget — a failed log never touches the screen.
/// The demo account and a signed-out app log nothing.
/// Mirrors android/data/StakEvents.kt.
enum StakEvents {
    static let stockDetailOpen     = "stock_detail_open"
    static let metricExplainerOpen = "metric_explainer_open"
    static let riskCtaOpen         = "risk_cta_open"
    static let watchpointOpen      = "watchpoint_open"
    static let newsSignalOpen      = "news_signal_open"
    static let compareOpen         = "compare_open"
    static let analystOpen         = "analyst_open"
    static let updateOpen          = "update_open"
    static let tasteGraphOpen      = "taste_graph_open"
    /// params: entry (StakAiEntry), platform
    static let stakAiOpen          = "stak_ai_open"

    /// Log an engagement event. `ticker` and `params` are both optional.
    @MainActor
    static func log(_ type: String, ticker: String? = nil, brandId: String? = nil, params: [String: String]? = nil) {
        guard !StakStore.demoAccount, Session.shared.token != nil else { return }
        // The deck day ("2026-10-06", rolling over at 9am local) - the key the server counts the day under.
        let day = StakClock.deckDayKey()
        // A held stock's brand comes from the holdings when the caller only knows the ticker (Android does the same).
        let brand = brandId ?? ticker.flatMap { MyStakHoldings.shared.brandIdOf($0) }
        let encodedParams = params.map { dict in dict.mapValues { AnyCodable($0) } }
        Task.detached(priority: .background) {
            _ = try? await StockRepository.shared.recordEvent(EngagementEventRequest(
                type: type,
                brandId: brand,
                ticker: ticker,
                categories: nil,
                todayKey: day,
                params: encodedParams
            ))
        }
    }
}
