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
    static func log(_ type: String, ticker: String? = nil, brandId: String? = nil, params: [String: String]? = nil) {
        guard !StakStore.demoAccount, Session.shared.token != nil else { return }
        Task.detached(priority: .background) {
            _ = try? await StockRepository.shared.recordEvent(EngagementEventRequest(
                type: type,
                brandId: brandId,
                ticker: ticker,
                categories: nil,
                todayKey: todayKey(),
                params: params
            ))
        }
    }
}

/// "20260718" — the current UTC day as an 8-digit string.
private func todayKey() -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyyMMdd"
    f.timeZone = TimeZone(identifier: "UTC")
    return f.string(from: Date())
}
