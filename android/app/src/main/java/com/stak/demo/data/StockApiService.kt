package com.stak.demo.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface StockApiService {
    @GET("api/stock/batch-quotes")
    suspend fun batchQuotes(@Query("tickers") tickers: String): BatchQuotesResponse

    @GET("api/stock/{symbol}")
    suspend fun getStock(@Path("symbol") symbol: String): StockDetailResponse

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

    @GET("api/me")
    suspend fun getMe(): MeResponse

    @PUT("api/me")
    suspend fun putMe(@Body body: MePutRequest): MeResponse

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
