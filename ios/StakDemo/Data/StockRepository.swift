import Foundation

/// Thin wrapper over StockApiService — one entry point for every caller in the app.
/// Mirrors android/data/StockRepository.kt one-to-one; each call delegates to the same
/// endpoint. ViewModels and stores import StockRepository, never StockApiService directly.
final class StockRepository {
    static let shared = StockRepository()
    private let api = StockApiService.shared
    private init() {}

    // MARK: – Quotes / stock detail

    func batchQuotes(_ tickers: [String]) async throws -> BatchQuotesResponse {
        try await api.batchQuotes(tickers: tickers.joined(separator: ","))
    }
    func getTrending() async throws -> TrendingResponse { try await api.getTrending() }
    func getStock(_ symbol: String) async throws -> StockDetailResponse { try await api.getStock(symbol) }
    func getChart(_ symbol: String, range: String) async throws -> ChartResponse { try await api.getChart(symbol, range: range) }
    func getPeerMetrics(_ ticker: String) async throws -> PeerMetricsResponse { try await api.getPeerMetrics(ticker) }
    func getAnalyst(_ symbol: String) async throws -> AnalystResponse { try await api.getAnalyst(symbol) }
    func getAnalystActions(_ symbol: String) async throws -> [AnalystAction] { try await api.getAnalystActions(symbol) }
    func getDailyMove(_ symbol: String, pct: Double) async throws -> DailyMoveResponse { try await api.getDailyMove(symbol, pct: pct) }
    func getEarnings(_ symbol: String) async throws -> EarningsResponse { try await api.getEarnings(symbol) }
    func getRiskWatch(_ symbol: String) async throws -> RiskWatchResponse { try await api.getRiskWatch(symbol) }

    // MARK: – News

    func getMarketNews() async throws -> MarketNewsResponse { try await api.getMarketNews() }
    func getCompanyNews(_ symbol: String) async throws -> CompanyNewsResponse { try await api.getCompanyNews(symbol) }
    func getForYouNews(_ tickers: [String]) async throws -> ForYouNewsResponse { try await api.getForYouNews(ForYouNewsRequest(tickers: tickers)) }

    // MARK: – Daily brief / swipes

    func getDailyBrief() async throws -> DailyBriefResponse { try await api.getDailyBrief() }
    func getDailySwipes() async throws -> DailySwipesResponse { try await api.getDailySwipes() }

    // MARK: – Brands

    func getBrands() async throws -> BrandsListResponse { try await api.getBrands() }
    func getBrandProfile(_ id: String) async throws -> BrandProfileDto { try await api.getBrandProfile(id) }
    func getBrandTip(_ id: String) async throws -> TipResponse { try await api.getBrandTip(id) }
    func getBrandQuickLook(_ id: String) async throws -> QuickLookResponse { try await api.getBrandQuickLook(id) }

    // MARK: – Recommendations / swipes / events

    func getRecommendations() async throws -> RecommendationsResponse { try await api.getRecommendations() }
    func recordSwipe(_ req: RecordSwipeRequest) async throws -> SwipeResponse { try await api.recordSwipe(req) }
    func recordEvent(_ req: EngagementEventRequest) async throws -> EventResponse { try await api.recordEvent(req) }
    func getPassed() async throws -> PassedResponse { try await api.getPassed() }
    func putPassed(_ entries: [PassedEntry]) async throws -> PassedResponse { try await api.putPassed(PassedPutRequest(entries: entries)) }
    func getSwipes(since: String) async throws -> SwipeHistoryResponse { try await api.getSwipes(since: since) }

    // MARK: – Me / profile

    func getMe() async throws -> MeResponse { try await api.getMe() }
    func putMe(displayName: String? = nil, onboardingCompleted: Bool? = nil, taste: TasteDto? = nil) async throws -> MeResponse {
        try await api.putMe(MePutRequest(displayName: displayName, onboardingCompleted: onboardingCompleted, taste: taste))
    }
    func deleteMe() async throws -> OkResponse { try await api.deleteMe() }
    func confirmEligibility() async throws -> OkResponse { try await api.confirmEligibility(EligibilityRequest()) }
    func getTaste() async throws -> TasteResponse { try await api.getTaste() }
    func getUpdates() async throws -> UpdatesResponse { try await api.getUpdates() }
    func markUpdateRead(_ id: Int64) async throws -> OkResponse { try await api.markUpdateRead(id) }
    func putPushDevice(_ body: PushDeviceRequest) async throws -> OkResponse { try await api.putPushDevice(body) }
    func getAndroidState() async throws -> AndroidStateResponse { try await api.getAndroidState() }
    func putAndroidState(_ body: AndroidStatePutRequest) async throws -> OkResponse { try await api.putAndroidState(body) }
    func getAndroidStocks() async throws -> AndroidStocksResponse { try await api.getAndroidStocks() }
    func putAndroidStocks(_ tickers: [String]) async throws -> AndroidStocksResponse { try await api.putAndroidStocks(AndroidStocksPutRequest(tickers: tickers)) }
    func patchStakPrice(brandId: String, price: Double) async throws -> OkResponse { try await api.patchStakPrice(brandId: brandId, body: StakPricePatchRequest(price: price)) }

    // MARK: – Sandbox

    func sandboxSetup(startingBalance: Double, name: String, strategy: String) async throws -> SandboxSetupResponse {
        try await api.sandboxSetup(SandboxSetupRequest(startingBalance: startingBalance, name: name, strategy: strategy))
    }
    func sandboxBuy(ticker: String, amount: Double) async throws -> SandboxBuyResponse {
        try await api.sandboxBuy(SandboxBuyRequest(ticker: ticker, amount: amount))
    }
    func sandboxSell(ticker: String, portion: Double) async throws -> SandboxSellResponse {
        try await api.sandboxSell(SandboxSellRequest(ticker: ticker, portion: portion))
    }
    func sandboxPlaceOrder(ticker: String, amount: Double, limitPrice: Double) async throws -> SandboxOrderResponse {
        try await api.sandboxPlaceOrder(SandboxOrderRequest(ticker: ticker, amount: amount, limitPrice: limitPrice))
    }
    func sandboxCancelOrder(_ id: Int64) async throws -> OkResponse { try await api.sandboxCancelOrder(id) }
    func getSandboxPortfolio() async throws -> SandboxPortfolioResponse { try await api.getSandboxPortfolio() }
    func getSandboxTrades(limit: Int = 100) async throws -> SandboxTradesResponse { try await api.getSandboxTrades(limit: limit) }

    // MARK: – STAK AI

    func stakAiUsage() async throws -> StakAiUsage { try await api.stakAiUsage() }
    func stakAiConversations(before: String? = nil) async throws -> StakAiConversationsResponse { try await api.stakAiConversations(before: before) }
    func stakAiMessages(_ id: String) async throws -> StakAiMessagesResponse { try await api.stakAiMessages(id) }
    func stakAiRename(_ id: String, title: String) async throws -> OkResponse { try await api.stakAiRename(id, body: StakAiRenameRequest(title: title)) }
    func stakAiDelete(_ id: String) async throws -> OkResponse { try await api.stakAiDelete(id) }
    func stakAiFeedback(messageId: Int64, value: Int?) async throws -> OkResponse { try await api.stakAiFeedback(messageId, body: StakAiFeedbackRequest(value: value)) }
    func stakAiChatStream(_ body: StakAiChatRequest) async throws -> URLSession.AsyncBytes { try await api.stakAiChatStream(body) }
}
