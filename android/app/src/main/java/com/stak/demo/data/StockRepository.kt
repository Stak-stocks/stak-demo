package com.stak.demo.data

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StockRepository @Inject constructor(private val api: StockApiService) {
    suspend fun batchQuotes(tickers: List<String>): BatchQuotesResponse =
        api.batchQuotes(tickers.joinToString(","))

    suspend fun getStock(symbol: String): StockDetailResponse = api.getStock(symbol)
    suspend fun getAnalyst(symbol: String): AnalystResponse = api.getAnalyst(symbol)
    suspend fun getPeerMetrics(ticker: String): PeerMetricsResponse = api.getPeerMetrics(ticker)
    suspend fun getChart(symbol: String, range: String): ChartResponse = api.getChart(symbol, range)
    suspend fun getPortfolioChart(tickers: List<String>, range: String): PortfolioChartResponse =
        api.getPortfolioChart(tickers.joinToString(","), range)
    suspend fun getAnalystActions(symbol: String): List<AnalystAction> = api.getAnalystActions(symbol)
    suspend fun getDailyMove(symbol: String, pct: Double): DailyMoveResponse =
        api.getDailyMove(symbol, pct, sentences = 2)
    suspend fun getEarnings(symbol: String): EarningsResponse = api.getEarnings(symbol)
    suspend fun getMarketNews(): MarketNewsResponse = api.getMarketNews()
    suspend fun getAndroidStocks(): AndroidStocksResponse = api.getAndroidStocks()
    suspend fun putAndroidStocks(tickers: List<String>): AndroidStocksResponse =
        api.putAndroidStocks(AndroidStocksPutRequest(tickers))
    suspend fun patchStakPrice(brandId: String, price: Double): OkResponse =
        api.patchStakPrice(brandId, StakPricePatchRequest(price))
    suspend fun getMe(): MeResponse = api.getMe()
    suspend fun putPushDevice(body: PushDeviceRequest): OkResponse = api.putPushDevice(body)
    suspend fun putMe(displayName: String? = null, onboardingCompleted: Boolean? = null): MeResponse =
        api.putMe(MePutRequest(displayName = displayName, onboardingCompleted = onboardingCompleted))
    suspend fun getCompanyNews(symbol: String): CompanyNewsResponse = api.getCompanyNews(symbol)
    suspend fun getDailyBrief(): DailyBriefResponse = api.getDailyBrief()
    suspend fun getDailySwipes(): DailySwipesResponse = api.getDailySwipes()
    suspend fun getBrands(): BrandsListResponse = api.getBrands()
    suspend fun getBrandProfile(id: String): BrandProfileDto = api.getBrandProfile(id)
    suspend fun getBrandTip(id: String): TipResponse = api.getBrandTip(id)
    suspend fun recordSwipe(req: RecordSwipeRequest): SwipeResponse = api.recordSwipe(req)
    suspend fun getRecommendations(): RecommendationsResponse = api.getRecommendations()
    suspend fun recordEvent(req: EngagementEventRequest): EventResponse = api.recordEvent(req)
    suspend fun getPassed(): PassedResponse = api.getPassed()
    suspend fun putPassed(entries: List<PassedEntry>): PassedResponse = api.putPassed(PassedPutRequest(entries))
    suspend fun getSwipes(since: String): SwipeHistoryResponse = api.getSwipes(since)
    suspend fun getBrandQuickLook(id: String): QuickLookResponse = api.getBrandQuickLook(id)
}
