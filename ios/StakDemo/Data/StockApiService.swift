import Foundation

/// Endpoint-level API client for the STAK backend.
/// Mirrors android/data/StockApiService.kt — every interface method becomes an async func here.
/// Calls are routed through NetworkModule (auth header, 401 refresh, timeouts).
final class StockApiService {
    static let shared = StockApiService()
    private let net = NetworkModule.shared
    private init() {}

    // MARK: – Stock quotes / detail

    func batchQuotes(tickers: String) async throws -> BatchQuotesResponse {
        try await net.get("api/stock/batch-quotes", query: ["tickers": tickers])
    }
    func getTrending() async throws -> TrendingResponse { try await net.get("api/stock/trending") }
    func getStock(_ symbol: String) async throws -> StockDetailResponse {
        try await net.get("api/stock/\(symbol)")
    }
    func getChart(_ symbol: String, range: String) async throws -> ChartResponse {
        try await net.get("api/stock/\(symbol)/chart", query: ["range": range])
    }
    func getPeerMetrics(_ ticker: String) async throws -> PeerMetricsResponse {
        try await net.get("api/stock/peer-metrics/\(ticker)")
    }
    func getAnalyst(_ symbol: String) async throws -> AnalystResponse {
        try await net.get("api/stock/\(symbol)/analyst")
    }
    func getAnalystActions(_ symbol: String) async throws -> [AnalystAction] {
        try await net.get("api/stock/\(symbol)/analyst-actions")
    }
    func getDailyMove(_ symbol: String, pct: Double, sentences: Int = 2) async throws -> DailyMoveResponse {
        try await net.get("api/stock/\(symbol)/daily-move",
                          query: ["pct": String(pct), "sentences": String(sentences)])
    }
    func getEarnings(_ symbol: String) async throws -> EarningsResponse {
        try await net.get("api/stock/\(symbol)/earnings")
    }
    func getRiskWatch(_ symbol: String) async throws -> RiskWatchResponse {
        try await net.get("api/stock/\(symbol)/risk-watch")
    }

    // MARK: – News

    func getMarketNews() async throws -> MarketNewsResponse { try await net.get("api/news/market") }
    func getCompanyNews(_ symbol: String) async throws -> CompanyNewsResponse {
        try await net.get("api/news/company/\(symbol)")
    }
    func getForYouNews(_ body: ForYouNewsRequest) async throws -> ForYouNewsResponse {
        try await net.post("api/news/for-you", body: body)
    }

    // MARK: – Daily brief / swipes

    func getDailyBrief() async throws -> DailyBriefResponse { try await net.get("api/daily-brief") }
    func getDailySwipes() async throws -> DailySwipesResponse { try await net.get("api/me/daily-swipes") }

    // MARK: – Brands

    func getBrands() async throws -> BrandsListResponse { try await net.get("api/brands") }
    func getBrandProfile(_ id: String) async throws -> BrandProfileDto { try await net.get("api/brands/\(id)") }
    func getBrandTip(_ id: String) async throws -> TipResponse { try await net.get("api/brands/\(id)/tip") }
    func getBrandQuickLook(_ id: String) async throws -> QuickLookResponse { try await net.get("api/brands/\(id)/quick-look") }

    // MARK: – Recommendations / swipes / events

    func getRecommendations() async throws -> RecommendationsResponse { try await net.get("api/recommendations") }
    func recordSwipe(_ body: RecordSwipeRequest) async throws -> SwipeResponse { try await net.post("api/swipe", body: body) }
    func recordEvent(_ body: EngagementEventRequest) async throws -> EventResponse { try await net.post("api/swipe/event", body: body) }
    func getPassed() async throws -> PassedResponse { try await net.get("api/me/passed") }
    func putPassed(_ body: PassedPutRequest) async throws -> PassedResponse { try await net.put("api/me/passed", body: body) }
    func getSwipes(since: String) async throws -> SwipeHistoryResponse { try await net.get("api/swipe", query: ["since": since]) }

    // MARK: – Me / profile

    func getMe() async throws -> MeResponse { try await net.get("api/me") }
    func putMe(_ body: MePutRequest) async throws -> MeResponse { try await net.put("api/me", body: body) }
    func deleteMe() async throws -> OkResponse { try await net.delete("api/me") }
    /// "Before we get started": 403 = not eligible (the server deleted the account), 400 = the date or a box.
    func confirmEligibility(_ body: EligibilityRequest) async throws -> OkResponse { try await net.post("api/me/eligibility", body: body) }
    func getTaste() async throws -> TasteResponse { try await net.get("api/me/taste") }
    func getUpdates() async throws -> UpdatesResponse { try await net.get("api/me/updates") }
    func markUpdateRead(_ id: Int64) async throws -> OkResponse { try await net.post("api/me/updates/\(id)/read", body: EmptyBody()) }
    func putPushDevice(_ body: PushDeviceRequest) async throws -> OkResponse { try await net.put("api/me/push-device", body: body) }
    func getAndroidState() async throws -> AndroidStateResponse { try await net.get("api/me/android-state") }
    func putAndroidState(_ body: AndroidStatePutRequest) async throws -> OkResponse { try await net.put("api/me/android-state", body: body) }
    func getAndroidStocks() async throws -> AndroidStocksResponse { try await net.get("api/me/android-stocks") }
    func putAndroidStocks(_ body: AndroidStocksPutRequest) async throws -> AndroidStocksResponse { try await net.put("api/me/android-stocks", body: body) }
    func patchStakPrice(brandId: String, body: StakPricePatchRequest) async throws -> OkResponse {
        try await net.patch("api/me/stak/\(brandId)/price", body: body)
    }

    // MARK: – Sandbox (paper trading)

    func sandboxSetup(_ body: SandboxSetupRequest) async throws -> SandboxSetupResponse { try await net.post("api/sandbox/setup", body: body) }
    func sandboxBuy(_ body: SandboxBuyRequest) async throws -> SandboxBuyResponse { try await net.post("api/sandbox/buy", body: body) }
    func sandboxSell(_ body: SandboxSellRequest) async throws -> SandboxSellResponse { try await net.post("api/sandbox/sell", body: body) }
    func sandboxPlaceOrder(_ body: SandboxOrderRequest) async throws -> SandboxOrderResponse { try await net.post("api/sandbox/orders", body: body) }
    func sandboxCancelOrder(_ id: Int64) async throws -> OkResponse { try await net.post("api/sandbox/orders/\(id)/cancel", body: EmptyBody()) }
    func getSandboxPortfolio() async throws -> SandboxPortfolioResponse { try await net.get("api/sandbox/portfolio") }
    func getSandboxTrades(limit: Int = 100) async throws -> SandboxTradesResponse { try await net.get("api/sandbox/trades", query: ["limit": String(limit)]) }

    // MARK: – STAK AI

    func stakAiUsage() async throws -> StakAiUsage { try await net.get("api/stak-ai/usage") }
    func stakAiConversations(before: String? = nil) async throws -> StakAiConversationsResponse {
        var q: [String: String] = [:]
        if let b = before { q["before"] = b }
        return try await net.get("api/stak-ai/conversations", query: q)
    }
    func stakAiMessages(_ id: String) async throws -> StakAiMessagesResponse { try await net.get("api/stak-ai/conversations/\(id)/messages") }
    func stakAiRename(_ id: String, body: StakAiRenameRequest) async throws -> OkResponse { try await net.patch("api/stak-ai/conversations/\(id)", body: body) }
    func stakAiDelete(_ id: String) async throws -> OkResponse { try await net.delete("api/stak-ai/conversations/\(id)") }
    func stakAiFeedback(_ id: Int64, body: StakAiFeedbackRequest) async throws -> OkResponse { try await net.post("api/stak-ai/messages/\(id)/feedback", body: body) }

    /// Server-sent event stream for STAK AI chat. Phase 4 parses the `delta`/`done`/`error` events.
    func stakAiChatStream(_ body: StakAiChatRequest) async throws -> URLSession.AsyncBytes {
        try await net.postStream("api/stak-ai/chat/stream", body: body)
    }
}

// Empty body for POST calls that carry no JSON payload.
private struct EmptyBody: Encodable {}
