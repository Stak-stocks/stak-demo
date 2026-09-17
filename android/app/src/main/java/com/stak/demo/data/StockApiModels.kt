package com.stak.demo.data

import com.google.gson.annotations.SerializedName

data class BatchQuotesResponse(val quotes: Map<String, BatchQuote?>)
data class BatchQuote(val price: Double = 0.0, val change: Double = 0.0, val changePercent: Double = 0.0)

data class StockDetailResponse(
    val quote: StockQuote? = null,
    val metrics: StockMetrics? = null,
    /** The company's name, so the page can title itself with the stock it's showing. */
    val name: String? = null,
)
data class StockQuote(
    val price: Double? = null,
    val change: Double? = null,
    val changePercent: Double? = null,
    /** PRE, REGULAR, POST, POSTPOST, PREPRE or CLOSED - which session [changePercent] describes. */
    val marketState: String? = null,
    /** The session's range so far. */
    val high: Double? = null,
    val low: Double? = null,
)
data class StockMetrics(
    val peRatio: Double? = null,
    val revenueGrowth: String? = null,
    val profitMargin: String? = null,
    val marketCap: String? = null,
    /** Volatility against the market - the Risk fit card's only real source. */
    val beta: Double? = null,
    val dividendYield: String? = null,
    val week52High: Double? = null,
    val week52Low: Double? = null,
)

data class AnalystResponse(val priceTarget: AnalystPriceTarget?, val recommendation: AnalystRecommendation?)
data class AnalystPriceTarget(val low: Double? = null, val avg: Double? = null, val high: Double? = null)
data class AnalystRecommendation(
    val strongBuy: Int = 0,
    val buy: Int = 0,
    val hold: Int = 0,
    val sell: Int = 0,
    val strongSell: Int = 0,
)

data class AnalystAction(val firm: String, val action: String, val priceTarget: Double?)

data class DailyMoveResponse(val explanation: String = "", val direction: String = "flat")

data class EarningsResponse(val status: String, val date: String? = null, val hour: String? = null)

data class MarketNewsResponse(val articles: List<NewsArticleDto> = emptyList())
data class NewsArticleDto(
    val headline: String = "",
    val source: String = "",
    val url: String = "",
    val image: String = "",
    val datetime: Long = 0L,
    val summary: String = "",
    val explanation: String = "",
    val whyItMatters: String = "",
    val sentiment: String = "neutral",
    val type: String = "sector",
    val ticker: String = "",  // tagged client-side for company news
)

data class AndroidStocksResponse(
    val tickers: List<String> = emptyList(),
    /** What each save is, per the server: name, ranked category, save date and the price then. */
    val saved: List<SavedStockDto> = emptyList(),
)
data class SavedStockDto(
    val ticker: String = "",
    val brandId: String = "",
    val name: String = "",
    val category: String? = null,
    val savedAt: String? = null,
    val priceAtSave: Double? = null,
)
data class AndroidStocksPutRequest(val tickers: List<String>)
data class StakPricePatchRequest(val price: Double)
data class PushDeviceRequest(
    val token: String,
    val platform: String,
    val timezone: String,
    val priceAlerts: Boolean,
    val dailyDeck: Boolean,
)
data class OkResponse(val ok: Boolean = false)

data class MePutRequest(
    val displayName: String? = null,
    val onboardingCompleted: Boolean? = null,
    val taste: TasteDto? = null,
)

/** The onboarding answers, stored with the account (TasteModel.GOAL_* / RISK_*; picks are brand names). */
data class TasteDto(
    val goal: Int = -1,
    val risk: Int = -1,
    val riskStyle: String = "",
    val picks: List<String> = emptyList(),
) {
    val hasAnswers: Boolean get() = goal >= 0 || risk >= 0 || picks.isNotEmpty()
}

data class CompanyNewsResponse(val articles: List<NewsArticleDto> = emptyList())

/**
 * A stock's peer group and that group's median fundamentals. The medians
 * describe the group as a whole - per-peer numbers come from fetching each
 * peer's own metrics.
 */
/** One close on a price chart; `session` marks pre/regular/post for intraday ranges. */
data class ChartPoint(val ts: String = "", val close: Double = 0.0, val session: String = "regular")
data class ChartResponse(val prices: List<ChartPoint> = emptyList())

/**
 * A set of holdings as one equal-weight line, combined server-side. `indexed`
 * starts at 1.0; `moves` is each stock's own move across the range.
 */
data class PortfolioChartResponse(
    val indexed: List<Double> = emptyList(),
    val pct: Double? = null,
    val moves: Map<String, Double> = emptyMap(),
)

data class PeerMetricsResponse(
    val ticker: String = "",
    val peerTickers: List<String> = emptyList(),
    val peerCount: Int = 0,
    val pe: Double? = null,
    val revenueGrowth: Double? = null,
    val profitMargin: Double? = null,
    val beta: Double? = null,
)

data class MeResponse(
    val displayName: String = "",
    val onboardingCompleted: Boolean = false,
    val createdAt: String = "",
    val email: String = "",
    val taste: TasteDto? = null,
    /** "free" or "plus" - read only through Entitlements. */
    val plan: String = "free",
)

/**
 * The Taste Graph as the server measured it: what the user's own saves, passes, Learn
 * more opens and stock-page opens say they gravitate toward. Shares are interest
 * signals - never money.
 */
data class TasteThemeDto(
    /** The backend's category id; the app names it (StakCategories.categoryName). */
    val category: String = "",
    val score: Double = 0.0,
    val share: Double = 0.0,
    val saves: Int = 0,
    val learnMores: Int = 0,
    val opens: Int = 0,
    val passes: Int = 0,
    val savedNames: List<String> = emptyList(),
)
data class TasteResponse(
    val themes: List<TasteThemeDto> = emptyList(),
    val otherShare: Double = 0.0,
    val totalSaves: Int = 0,
    val signals: Int = 0,
    /** Too little activity to name a lead yet. */
    val learning: Boolean = true,
)

data class WhatHappenedItem(val title: String = "", val body: String = "")
data class WatchItem(val icon: String = "", val label: String = "", val body: String = "")

data class DailyBriefResponse(
    val mood: String = "",
    val session: String = "",
    val dayLabel: String = "",
    val marketClosed: Boolean = false,
    val nextTradingDayLabel: String = "",
    val moodExplanation: String = "",
    val plainEnglish: String = "",
    val personalizedImpact: String = "",
    val whatHappened: List<WhatHappenedItem> = emptyList(),
    val contextQuestion: String = "",
    val watchItems: List<WatchItem> = emptyList(),
)

data class CulturalSectionDto(val heading: String = "", val content: String = "")
data class CulturalContextDto(val title: String = "", val sections: List<CulturalSectionDto> = emptyList())
data class BrandProfileDto(
    val id: String = "",
    val ticker: String = "",
    val name: String = "",
    val bio: String = "",
    val culturalContext: CulturalContextDto = CulturalContextDto(),
)

data class BrandSummaryDto(
    val id: String = "",
    val ticker: String = "",
    val name: String = "",
    val bio: String = "",
    val heroImage: String = "",
    val logo: String? = null,
    val domain: String? = null,
    val interestCategories: List<String> = emptyList(),
)
data class BrandsListResponse(val brands: List<BrandSummaryDto> = emptyList())

data class DailySwipesResponse(val date: String = "", val count: Int = 0, val limit: Int = 0)

data class RecordSwipeRequest(
    val brandId: String,
    val direction: String,
    val todayKey: String,
    val ticker: String? = null,
    val timeOnCardMs: Long? = null,
    val stakSize: Int? = null,
    val categories: List<String>? = null,
)
data class SwipeResponse(
    val success: Boolean = false,
    val limitReached: Boolean = false,
    val dailySwipeCount: Int = 0,
    val dailySwipeLimit: Int = 0,
)
data class TipResponse(val tip: String = "")
data class RecommendationsResponse(
    val brandIds: List<String> = emptyList(),
    val categories: Map<String, String>? = null,
)
data class EngagementEventRequest(
    val type: String,
    val brandId: String? = null,
    val ticker: String? = null,
    val categories: List<String>? = null,
    val todayKey: String? = null,
    /** Event details (e.g. where a stock page was opened from). */
    val params: Map<String, Any>? = null,
)
data class EventResponse(val success: Boolean = false)
data class PassedEntry(val id: String = "", val at: Long = 0L)
data class PassedResponse(val entries: List<PassedEntry> = emptyList())
data class PassedPutRequest(val entries: List<PassedEntry>)
data class SwipeRecord(val brandId: String = "", val direction: String = "", val timestamp: String = "")
data class SwipeHistoryResponse(val swipes: List<SwipeRecord> = emptyList())
data class QuickLookDto(
    val in10Seconds: String = "",
    val whyNow: String = "",
    val setup: String = "",
    @SerializedName("catch") val theCatch: String = "",
    val whatToWatch: String = "",
    val keyThemes: List<String> = emptyList(),
)
data class QuickLookResponse(val quickLook: QuickLookDto? = null)
