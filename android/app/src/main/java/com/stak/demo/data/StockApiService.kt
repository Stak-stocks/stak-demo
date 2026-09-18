package com.stak.demo.data

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface StockApiService {
    @GET("api/stock/batch-quotes")
    suspend fun batchQuotes(@Query("tickers") tickers: String): BatchQuotesResponse

    /** Today's biggest movers, either direction - Home's Trending strip. */
    @GET("api/stock/trending")
    suspend fun getTrending(): TrendingResponse

    @GET("api/stock/{symbol}")
    suspend fun getStock(@Path("symbol") symbol: String): StockDetailResponse

    /** One line for many holdings, so a range change isn't a request per stock. */
    @GET("api/stock/portfolio-chart")
    suspend fun getPortfolioChart(
        @Query("tickers") tickers: String,
        @Query("range") range: String,
    ): PortfolioChartResponse

    /** Ranges: 1d, 1w, 1m, 3m, ytd, 1y - the pills' labels, lowercased. */
    @GET("api/stock/{symbol}/chart")
    suspend fun getChart(@Path("symbol") symbol: String, @Query("range") range: String): ChartResponse

    /** Two segments, so it can't be swallowed by the single-segment /api/stock/{symbol}. */
    @GET("api/stock/peer-metrics/{ticker}")
    suspend fun getPeerMetrics(@Path("ticker") ticker: String): PeerMetricsResponse

    @GET("api/stock/{symbol}/analyst")
    suspend fun getAnalyst(@Path("symbol") symbol: String): AnalystResponse

    @GET("api/stock/{symbol}/analyst-actions")
    suspend fun getAnalystActions(@Path("symbol") symbol: String): List<AnalystAction>

    @GET("api/stock/{symbol}/daily-move")
    suspend fun getDailyMove(
        @Path("symbol") symbol: String,
        @Query("pct") pct: Double,
        @Query("sentences") sentences: Int,
    ): DailyMoveResponse

    @GET("api/stock/{symbol}/earnings")
    suspend fun getEarnings(@Path("symbol") symbol: String): EarningsResponse

    @GET("api/news/market")
    suspend fun getMarketNews(): MarketNewsResponse

    @GET("api/me/android-stocks")
    suspend fun getAndroidStocks(): AndroidStocksResponse

    @PUT("api/me/android-stocks")
    suspend fun putAndroidStocks(@Body body: AndroidStocksPutRequest): AndroidStocksResponse

    /** Stamps what a stock cost when it was saved; the server keeps the first value only. */
    @PATCH("api/me/stak/{brandId}/price")
    suspend fun patchStakPrice(@Path("brandId") brandId: String, @Body body: StakPricePatchRequest): OkResponse

    /** Registers this install for push notifications, with its alert settings and time zone. */
    @PUT("api/me/push-device")
    suspend fun putPushDevice(@Body body: PushDeviceRequest): OkResponse

    /** What changed at the user's saved companies, newest first. */
    @GET("api/me/updates")
    suspend fun getUpdates(): UpdatesResponse

    /** Opened, so it stops counting as new. */
    @POST("api/me/updates/{id}/read")
    suspend fun markUpdateRead(@Path("id") id: Long): OkResponse

    /** The Taste Graph: themes ranked by the user's own behaviour. */
    /** The stock page's Risk snapshot and What to watch next. */
    @GET("api/stock/{symbol}/risk-watch")
    suspend fun getRiskWatch(@Path("symbol") symbol: String): RiskWatchResponse

    @GET("api/me/taste")
    suspend fun getTaste(): TasteResponse

    @GET("api/me")
    suspend fun getMe(): MeResponse

    @PUT("api/me")
    suspend fun putMe(@Body body: MePutRequest): MeResponse

    /** App settings -> Delete account: removes every saved row and the Supabase auth record. */
    @DELETE("api/me")
    suspend fun deleteMe(): OkResponse

    @GET("api/news/company/{symbol}")
    suspend fun getCompanyNews(@Path("symbol") symbol: String): CompanyNewsResponse

    @GET("api/daily-brief")
    suspend fun getDailyBrief(): DailyBriefResponse

    @GET("api/me/daily-swipes")
    suspend fun getDailySwipes(): DailySwipesResponse

    @GET("api/brands")
    suspend fun getBrands(): BrandsListResponse

    @GET("api/brands/{id}")
    suspend fun getBrandProfile(@Path("id") id: String): BrandProfileDto

    @GET("api/brands/{id}/tip")
    suspend fun getBrandTip(@Path("id") id: String): TipResponse

    @POST("api/swipe")
    suspend fun recordSwipe(@Body body: RecordSwipeRequest): SwipeResponse

    @GET("api/recommendations")
    suspend fun getRecommendations(): RecommendationsResponse

    @POST("api/swipe/event")
    suspend fun recordEvent(@Body body: EngagementEventRequest): EventResponse

    @GET("api/me/passed")
    suspend fun getPassed(): PassedResponse

    @PUT("api/me/passed")
    suspend fun putPassed(@Body body: PassedPutRequest): PassedResponse

    @GET("api/swipe")
    suspend fun getSwipes(@Query("since") since: String): SwipeHistoryResponse

    @GET("api/brands/{id}/quick-look")
    suspend fun getBrandQuickLook(@Path("id") id: String): QuickLookResponse
}
