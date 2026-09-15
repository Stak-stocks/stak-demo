package com.stak.demo.data

data class BatchQuotesResponse(val quotes: Map<String, BatchQuote?>)
data class BatchQuote(val price: Double = 0.0, val change: Double = 0.0, val changePercent: Double = 0.0)

data class StockDetailResponse(val quote: StockQuote?, val metrics: StockMetrics?)
data class StockQuote(
    val price: Double? = null,
    val change: Double? = null,
    val changePercent: Double? = null,
)
data class StockMetrics(
    val peRatio: Double? = null,
    val revenueGrowth: String? = null,
    val profitMargin: String? = null,
    val marketCap: String? = null,
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

data class AndroidStocksResponse(val tickers: List<String> = emptyList())
data class AndroidStocksPutRequest(val tickers: List<String>)

data class MePutRequest(
    val displayName: String? = null,
    val onboardingCompleted: Boolean? = null,
)

data class CompanyNewsResponse(val articles: List<NewsArticleDto> = emptyList())

data class MeResponse(
    val displayName: String = "",
    val onboardingCompleted: Boolean = false,
    val createdAt: String = "",
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
data class RecommendationsResponse(val brandIds: List<String> = emptyList(), val theme: String? = null)
data class EngagementEventRequest(
    val type: String,
    val brandId: String? = null,
    val ticker: String? = null,
    val categories: List<String>? = null,
    val todayKey: String? = null,
)
data class EventResponse(val success: Boolean = false)
data class PassedEntry(val id: String = "", val at: Long = 0L)
data class PassedResponse(val entries: List<PassedEntry> = emptyList())
data class PassedPutRequest(val entries: List<PassedEntry>)
data class SwipeRecord(val brandId: String = "", val direction: String = "", val timestamp: String = "")
data class SwipeHistoryResponse(val swipes: List<SwipeRecord> = emptyList())
