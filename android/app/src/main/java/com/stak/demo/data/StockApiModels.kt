package com.stak.demo.data

import com.google.gson.annotations.SerializedName

data class BatchQuotesResponse(val quotes: Map<String, BatchQuote?>)
data class BatchQuote(val price: Double = 0.0, val change: Double = 0.0, val changePercent: Double = 0.0)

/** Today's biggest movers over the deck's watch universe - Home's Trending strip. */
data class TrendingResponse(val trending: List<TrendingStock> = emptyList())
data class TrendingStock(
    val ticker: String = "",
    val name: String = "",
    val price: Double = 0.0,
    val change: Double = 0.0,
    val changePercent: Double = 0.0,
)

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
    /** Yesterday's close - where today's move, and today's line, are measured from. */
    val prevClose: Double? = null,
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

/**
 * One company risk: what it is, why it matters, and how big - but only where a figure
 * backs the size. `level` is null for a risk nothing measurable rates.
 */
data class StockRiskDto(val label: String = "", val level: String? = null, val note: String = "")

/** One checkpoint that decides how the company's story goes from here. */
data class StockWatchDto(val title: String = "", val note: String = "")

data class RiskWatchResponse(
    val risks: List<StockRiskDto> = emptyList(),
    val watch: List<StockWatchDto> = emptyList(),
    /** Whether any level shown was computed from the company's own figures. */
    val rated: Boolean = false,
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
    /** The "Price threshold" setting (1 / 3 / 5 / 10%) - the server alerts this phone at it. */
    val priceThreshold: Int,
)
data class OkResponse(val ok: Boolean = false)

/** The phone-only state carried to a new device: the practice portfolio, notification
 * read ids and saved news. `portfolio` is PaperPortfolio's own opaque JSON blob - the
 * server never reads its shape, just stores and returns it. */
data class AndroidStateResponse(
    val portfolio: com.google.gson.JsonObject? = null,
    val notifRead: List<String> = emptyList(),
    val newsSaved: List<String> = emptyList(),
)
/** Only the fields being updated need to be set - a null field is left out of the
 * request body (default Gson behaviour) and the server leaves that column alone. */
data class AndroidStatePutRequest(
    val portfolio: com.google.gson.JsonObject? = null,
    val notifRead: List<String>? = null,
    val newsSaved: List<String>? = null,
)

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

/** POST api/news/for-you: every saved company's news in one request (the same cached entries as api/news/company). */
data class ForYouNewsRequest(val tickers: List<String>)
/** `pending`: companies the server was still writing up when it answered - ask again shortly for them. */
data class ForYouNewsResponse(val results: List<ForYouCompanyNews> = emptyList(), val pending: List<String> = emptyList())
data class ForYouCompanyNews(val ticker: String = "", val articles: List<NewsArticleDto> = emptyList())

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
    /** The account hasn't confirmed 18+, U.S. and the current Terms / Privacy yet (Eligibility). */
    val needsEligibility: Boolean = false,
)

/** GET /api/legal/:doc - the Terms or Privacy Policy for the in-app sheet (LegalDocs). */
data class LegalDocResponse(
    val title: String = "",
    val effective: String = "",
    val notice: String = "",
    val version: String = "",
    val sections: List<LegalSectionDto> = emptyList(),
)

data class LegalSectionDto(val heading: String = "", val sub: String? = null, val blocks: List<LegalBlockDto> = emptyList())

/** A paragraph ([text]) or a bulleted list ([list]). */
data class LegalBlockDto(val text: String? = null, val list: List<String>? = null)

/** POST /api/me/eligibility - "Before we get started": all three confirmations. */
data class EligibilityRequest(val ageConfirmed: Boolean = true, val inUS: Boolean = true, val acceptTerms: Boolean = true)

/** One headline behind an update. */
data class UpdateSourceDto(
    val source: String = "",
    val url: String = "",
    val headline: String = "",
    val datetime: Long = 0L,
)

/** What changed at a saved company: the change itself, its context, and the headlines behind it. */
data class StockUpdateDto(
    val id: Long = 0L,
    val ticker: String = "",
    val company: String = "",
    /** earnings / guidance / analyst / business. */
    val kind: String = "",
    val title: String = "",
    val body: String = "",
    val watch: String? = null,
    val sources: List<UpdateSourceDto> = emptyList(),
    val occurredAt: String = "",
    val read: Boolean = false,
)
data class UpdatesResponse(
    val updates: List<StockUpdateDto> = emptyList(),
    val unread: Int = 0,
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
    /** When the newest save in this theme happened, so the evidence can say "this week". */
    val lastSavedAt: String? = null,
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
/** A passed brand: when it was last passed, and how many times (five keeps it out of the deck). */
data class PassedEntry(val id: String = "", val at: Long = 0L, val count: Int = 1)
data class PassedResponse(val entries: List<PassedEntry> = emptyList())
data class PassedAddResponse(val entry: PassedEntry? = null)
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

// ── Sandbox (paper trading) — shared backend with web's Simulate, unified 2026-09-25 ────

data class SandboxSetupRequest(val startingBalance: Double, val name: String, val strategy: String)
data class SandboxSetupResponse(val ok: Boolean = false, val cash: Double = 0.0, val name: String = "", val strategy: String = "")

/** Either [shares] or [amount] (dollars) — Android always sends amount. */
data class SandboxBuyRequest(val ticker: String, val shares: Double? = null, val thesis: String? = null, val amount: Double? = null)
data class SandboxBuyResponse(val price: Double = 0.0, val shares: Double = 0.0, val costBasis: Double = 0.0, val cost: Double = 0.0, val remainingCash: Double = 0.0)

/** Either [shares] or [portion] (0..1) — Android always sends portion. */
data class SandboxSellRequest(val ticker: String, val shares: Double? = null, val portion: Double? = null)
data class SandboxSellResponse(val price: Double = 0.0, val sharesToSell: Double = 0.0, val sellValue: Double = 0.0, val remaining: Double = 0.0)

data class SandboxOrderRequest(val ticker: String, val amount: Double, val limitPrice: Double)
data class SandboxOrderResponse(
    val id: Long = 0L, val ticker: String = "", val amount: Double = 0.0, val limitPrice: Double = 0.0,
    val status: String = "open", val createdAt: String = "", val remainingCash: Double = 0.0,
)

data class SandboxPositionDto(val ticker: String = "", val shares: Double = 0.0, val costBasis: Double = 0.0, val addedAt: String = "", val thesis: String? = null)
data class SandboxOpenOrderDto(val id: Long = 0L, val ticker: String = "", val amount: Double = 0.0, val limitPrice: Double = 0.0, val createdAt: String = "")
data class SandboxPortfolioResponse(
    val initialized: Boolean = false,
    val cash: Double? = null,
    val tier: Int? = null,
    val milestones: List<Int> = emptyList(),
    val name: String? = null,
    val strategy: String? = null,
    val start: Double? = null,
    val cashSource: String = "tier",
    /** The newest trade's id - unchanged since the last poll means the ledger is too, so GET /trades can be skipped. Null before any trade. */
    val tradeCursor: Long? = null,
    val positions: List<SandboxPositionDto> = emptyList(),
    val openOrders: List<SandboxOpenOrderDto> = emptyList(),
)

data class SandboxTradeDto(
    val id: Long = 0L, val ticker: String = "", val side: String = "", val shares: Double = 0.0,
    val price: Double = 0.0, val amount: Double = 0.0, val source: String = "market", val executedAt: String = "",
    /** A sale's average cost when it sold (null on buys and older sales) - its realized gain needs no buy in the ledger. */
    val costBasis: Double? = null,
)
data class SandboxTradesResponse(val trades: List<SandboxTradeDto> = emptyList())
data class QuickLookResponse(val quickLook: QuickLookDto? = null)
