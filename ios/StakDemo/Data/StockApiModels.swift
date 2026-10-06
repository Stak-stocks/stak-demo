import Foundation

// Swift Codable mirrors of android/data/StockApiModels.kt.
// Field names are camelCase so JSONDecoder uses the default key decoding strategy.

// MARK: – Quotes

struct BatchQuotesResponse: Decodable { let quotes: [String: BatchQuote?] }
struct BatchQuote: Decodable {
    var price: Double = 0; var change: Double = 0; var changePercent: Double = 0
}

struct TrendingResponse: Decodable { var trending: [TrendingStock] = [] }
struct TrendingStock: Decodable {
    var ticker: String = ""; var name: String = ""
    var price: Double = 0; var change: Double = 0; var changePercent: Double = 0
}

struct StockDetailResponse: Decodable {
    var quote: StockQuote?; var metrics: StockMetrics?; var name: String?
}
struct StockQuote: Decodable {
    var price: Double?; var change: Double?; var changePercent: Double?
    var marketState: String?; var high: Double?; var low: Double?; var prevClose: Double?
}
struct StockMetrics: Decodable {
    var peRatio: Double?; var revenueGrowth: String?; var profitMargin: String?
    var marketCap: String?; var beta: Double?; var dividendYield: String?
    var week52High: Double?; var week52Low: Double?
}

// MARK: – Analyst

struct AnalystResponse: Decodable { var priceTarget: AnalystPriceTarget?; var recommendation: AnalystRecommendation? }
struct AnalystPriceTarget: Decodable { var low: Double?; var avg: Double?; var high: Double? }
struct AnalystRecommendation: Decodable {
    var strongBuy: Int = 0; var buy: Int = 0; var hold: Int = 0; var sell: Int = 0; var strongSell: Int = 0
}
struct AnalystAction: Decodable { var firm: String = ""; var action: String = ""; var priceTarget: Double? }

// MARK: – Risk / Watch

struct StockRiskDto: Decodable { var label: String = ""; var level: String?; var note: String = "" }
struct StockWatchDto: Decodable { var title: String = ""; var note: String = "" }
struct RiskWatchResponse: Decodable {
    var risks: [StockRiskDto] = []; var watch: [StockWatchDto] = []; var rated: Bool = false
}

// MARK: – Daily move / earnings

struct DailyMoveResponse: Decodable { var explanation: String = ""; var direction: String = "flat" }
struct EarningsResponse: Decodable { var status: String = ""; var date: String?; var hour: String? }

// MARK: – News

struct MarketNewsResponse: Decodable { var articles: [NewsArticleDto] = [] }
struct CompanyNewsResponse: Decodable { var articles: [NewsArticleDto] = [] }
struct NewsArticleDto: Decodable, Equatable {
    var headline: String = ""; var source: String = ""; var url: String = ""
    var image: String = ""; var datetime: Int64 = 0; var summary: String = ""
    var explanation: String = ""; var whyItMatters: String = ""; var sentiment: String = "neutral"
    var type: String = "sector"; var ticker: String = ""
}

struct ForYouNewsRequest: Encodable { let tickers: [String] }
struct ForYouNewsResponse: Decodable {
    var results: [ForYouCompanyNews] = []; var pending: [String] = []
}
struct ForYouCompanyNews: Decodable { var ticker: String = ""; var articles: [NewsArticleDto] = [] }

// MARK: – Chart / portfolio chart

struct ChartPoint: Decodable { var ts: String = ""; var close: Double = 0; var session: String = "regular" }
struct ChartResponse: Decodable { var prices: [ChartPoint] = [] }
struct PortfolioChartResponse: Decodable {
    var indexed: [Double] = []; var pct: Double?; var moves: [String: Double] = [:]
}

// MARK: – Peer metrics

struct PeerMetricsResponse: Decodable {
    var ticker: String = ""; var peerTickers: [String] = []; var peerCount: Int = 0
    var pe: Double?; var revenueGrowth: Double?; var profitMargin: Double?; var beta: Double?
}

// MARK: – Me / profile

struct MeResponse: Decodable {
    var displayName: String = ""; var onboardingCompleted: Bool = false
    var createdAt: String = ""; var email: String = ""; var taste: TasteDto?; var plan: String = "free"
}
struct MePutRequest: Encodable {
    var displayName: String?; var onboardingCompleted: Bool?; var taste: TasteDto?
}
struct TasteDto: Codable {
    var goal: Int = -1; var risk: Int = -1; var riskStyle: String = ""; var picks: [String] = []
    var hasAnswers: Bool { goal >= 0 || risk >= 0 || !picks.isEmpty }
}

// MARK: – Updates / taste graph

struct UpdateSourceDto: Decodable {
    var source: String = ""; var url: String = ""; var headline: String = ""; var datetime: Int64 = 0
}
struct StockUpdateDto: Decodable, Identifiable {
    var id: Int64 = 0; var ticker: String = ""; var company: String = ""; var kind: String = ""
    var title: String = ""; var body: String = ""; var watch: String?
    var sources: [UpdateSourceDto] = []; var occurredAt: String = ""; var read: Bool = false
}
struct UpdatesResponse: Decodable { var updates: [StockUpdateDto] = []; var unread: Int = 0 }

struct TasteThemeDto: Decodable {
    var category: String = ""; var score: Double = 0; var share: Double = 0
    var saves: Int = 0; var learnMores: Int = 0; var opens: Int = 0; var passes: Int = 0
    var savedNames: [String] = []; var lastSavedAt: String?
}
struct TasteResponse: Decodable {
    var themes: [TasteThemeDto] = []; var otherShare: Double = 0
    var totalSaves: Int = 0; var signals: Int = 0; var learning: Bool = true
}

// MARK: – Daily brief

struct WhatHappenedItem: Decodable, Equatable { var title: String = ""; var body: String = "" }
struct WatchItem: Decodable, Equatable { var icon: String = ""; var label: String = ""; var body: String = "" }
struct DailyBriefResponse: Decodable, Equatable {
    var mood: String = ""; var session: String = ""; var dayLabel: String = ""
    var marketClosed: Bool = false; var nextTradingDayLabel: String = ""
    var moodExplanation: String = ""; var plainEnglish: String = ""
    var personalizedImpact: String = ""; var whatHappened: [WhatHappenedItem] = []
    var contextQuestion: String = ""; var watchItems: [WatchItem] = []
}

// MARK: – Brands

struct CulturalSectionDto: Decodable { var heading: String = ""; var content: String = "" }
struct CulturalContextDto: Decodable { var title: String = ""; var sections: [CulturalSectionDto] = [] }
struct BrandProfileDto: Decodable {
    var id: String = ""; var ticker: String = ""; var name: String = ""
    var bio: String = ""; var culturalContext: CulturalContextDto = .init()
}
struct BrandSummaryDto: Decodable {
    var id: String = ""; var ticker: String = ""; var name: String = ""; var bio: String = ""
    var heroImage: String = ""; var logo: String?; var domain: String?
    var interestCategories: [String] = []
}
struct BrandsListResponse: Decodable { var brands: [BrandSummaryDto] = [] }

// MARK: – Swipe / deck / recommendations

struct DailySwipesResponse: Decodable { var date: String = ""; var count: Int = 0; var limit: Int = 0 }
struct RecordSwipeRequest: Encodable {
    let brandId: String; let direction: String; let todayKey: String
    var ticker: String?; var timeOnCardMs: Int64?; var stakSize: Int?; var categories: [String]?
}
struct SwipeResponse: Decodable {
    var success: Bool = false; var limitReached: Bool = false
    var dailySwipeCount: Int = 0; var dailySwipeLimit: Int = 0
}
struct TipResponse: Decodable { var tip: String = "" }
struct RecommendationsResponse: Decodable {
    var brandIds: [String] = []; var categories: [String: String]?
}
struct EngagementEventRequest: Encodable {
    let type: String; var brandId: String?; var ticker: String?
    var categories: [String]?; var todayKey: String?; var params: [String: AnyCodable]?
}
struct EventResponse: Decodable { var success: Bool = false }
struct PassedEntry: Codable { var id: String = ""; var at: Int64 = 0 }
struct PassedResponse: Decodable { var entries: [PassedEntry] = [] }
struct PassedPutRequest: Encodable { let entries: [PassedEntry] }
struct SwipeRecord: Decodable { var brandId: String = ""; var direction: String = ""; var timestamp: String = "" }
struct SwipeHistoryResponse: Decodable { var swipes: [SwipeRecord] = [] }
struct QuickLookDto: Decodable {
    var in10Seconds: String = ""; var whyNow: String = ""; var setup: String = ""
    var theCatch: String = ""; var whatToWatch: String = ""; var keyThemes: [String] = []
    enum CodingKeys: String, CodingKey {
        case in10Seconds, whyNow, setup, theCatch = "catch", whatToWatch, keyThemes
    }
}
struct QuickLookResponse: Decodable { var quickLook: QuickLookDto? }

// MARK: – Android device-state sync

/// Phone-only state carried to a new device: the practice portfolio, notification read IDs and saved news.
/// `portfolio` is PaperPortfolio's own opaque JSON blob — the server never reads its shape.
struct AndroidStateResponse: Decodable {
    var portfolio: [String: AnyCodable]?; var notifRead: [String] = []; var newsSaved: [String] = []
}
struct AndroidStatePutRequest: Encodable {
    var portfolio: [String: AnyCodable]?; var notifRead: [String]?; var newsSaved: [String]?
}
/// Type-erased JSON value used for the opaque portfolio blob.
struct AnyCodable: Codable {
    let value: Any
    init(_ value: Any) { self.value = value }
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let b = try? container.decode(Bool.self) { value = b }
        else if let i = try? container.decode(Int.self) { value = i }
        else if let d = try? container.decode(Double.self) { value = d }
        else if let s = try? container.decode(String.self) { value = s }
        else if let a = try? container.decode([AnyCodable].self) { value = a.map(\.value) }
        else if let o = try? container.decode([String: AnyCodable].self) { value = o.mapValues(\.value) }
        else { value = NSNull() }
    }
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let b as Bool: try container.encode(b)
        case let i as Int: try container.encode(i)
        case let d as Double: try container.encode(d)
        case let s as String: try container.encode(s)
        case let a as [Any]: try container.encode(a.map { AnyCodable($0) })
        case let o as [String: Any]: try container.encode(o.mapValues { AnyCodable($0) })
        default: try container.encodeNil()
        }
    }
}

struct AndroidStocksResponse: Decodable { var tickers: [String] = []; var saved: [SavedStockDto] = [] }
struct SavedStockDto: Decodable {
    var ticker: String = ""; var brandId: String = ""; var name: String = ""
    var category: String?; var savedAt: String?; var priceAtSave: Double?
}
struct AndroidStocksPutRequest: Encodable { let tickers: [String] }
struct StakPricePatchRequest: Encodable { let price: Double }
struct PushDeviceRequest: Encodable {
    let token: String; let platform: String; let timezone: String
    let priceAlerts: Bool; let dailyDeck: Bool
}
struct OkResponse: Decodable { var ok: Bool = false }

// MARK: – Sandbox (paper trading)

struct SandboxSetupRequest: Encodable { let startingBalance: Double; let name: String; let strategy: String }
struct SandboxSetupResponse: Decodable { var ok: Bool = false; var cash: Double = 0; var name: String = ""; var strategy: String = "" }
struct SandboxBuyRequest: Encodable { let ticker: String; var shares: Double?; var thesis: String?; var amount: Double? }
struct SandboxBuyResponse: Decodable {
    var price: Double = 0; var shares: Double = 0; var costBasis: Double = 0; var cost: Double = 0; var remainingCash: Double = 0
}
struct SandboxSellRequest: Encodable { let ticker: String; var shares: Double?; var portion: Double? }
struct SandboxSellResponse: Decodable {
    var price: Double = 0; var sharesToSell: Double = 0; var sellValue: Double = 0; var remaining: Double = 0
}
struct SandboxOrderRequest: Encodable { let ticker: String; let amount: Double; let limitPrice: Double }
struct SandboxOrderResponse: Decodable {
    var id: Int64 = 0; var ticker: String = ""; var amount: Double = 0; var limitPrice: Double = 0
    var status: String = "open"; var createdAt: String = ""; var remainingCash: Double = 0
}
struct SandboxPositionDto: Decodable {
    var ticker: String = ""; var shares: Double = 0; var costBasis: Double = 0; var addedAt: String = ""; var thesis: String?
}
struct SandboxOpenOrderDto: Decodable {
    var id: Int64 = 0; var ticker: String = ""; var amount: Double = 0; var limitPrice: Double = 0; var createdAt: String = ""
}
struct SandboxPortfolioResponse: Decodable {
    var initialized: Bool = false; var cash: Double?; var tier: Int?; var milestones: [Int] = []
    var name: String?; var strategy: String?; var start: Double?; var cashSource: String = "tier"
    var tradeCursor: Int64?; var positions: [SandboxPositionDto] = []; var openOrders: [SandboxOpenOrderDto] = []
}
struct SandboxTradeDto: Decodable {
    var id: Int64 = 0; var ticker: String = ""; var side: String = ""; var shares: Double = 0
    var price: Double = 0; var amount: Double = 0; var source: String = "market"; var executedAt: String = ""
}
struct SandboxTradesResponse: Decodable { var trades: [SandboxTradeDto] = [] }

// MARK: – STAK AI (Phase 4 wires the streaming; structs are here so StockApiService compiles)

struct StakAiContext: Codable, Equatable {
    let type: String
    var ticker: String?; var headline: String?; var summary: String?
    var source: String?; var url: String?; var tickers: [String]?
    var title: String?; var points: [String]?

    static func stock(_ ticker: String) -> Self { .init(type: "stock", ticker: ticker.uppercased()) }
    static func brief(_ b: DailyBriefResponse) -> Self {
        let pts = ([b.plainEnglish, b.personalizedImpact] + b.whatHappened.map { "\($0.title): \($0.body)" })
            .map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        return .init(type: "brief", title: b.dayLabel.isEmpty ? nil : b.dayLabel, points: Array(pts.prefix(8)))
    }
}

struct StakAiChatRequest: Encodable {
    let message: String; var conversationId: String?; var context: StakAiContext?; var via: String?
}
struct StakAiUsage: Decodable {
    var used: Int = 0; var limit: Int = 5; var unlimited: Bool = false
    var remaining: Int = -1; var resetsAt: String? = nil
    var questionsLeft: Int { unlimited ? Int.max : (remaining >= 0 ? remaining : max(0, limit - used)) }
}
struct StakAiSource: Decodable { var ticker: String = ""; var headline: String = ""; var url: String? }
struct StakAiConversationDto: Decodable, Identifiable {
    var id: String = ""; var title: String = ""; var updatedAt: String = ""
    var contextType: String?; var contextLabel: String?; var preview: String?
}
struct StakAiConversationsResponse: Decodable { var conversations: [StakAiConversationDto] = []; var nextBefore: String? }
struct StakAiMessageDto: Decodable {
    var id: Int64 = 0; var role: String = ""; var content: String = ""; var createdAt: String = ""
    var via: String?; var feedback: Int?; var kind: String = "answer"
}
struct StakAiMessagesResponse: Decodable { var title: String = ""; var messages: [StakAiMessageDto] = []; var context: StakAiContext? }
struct StakAiRenameRequest: Encodable { let title: String }
struct StakAiFeedbackRequest: Encodable { let value: Int? }
struct StakAiChatReply: Decodable {
    var messageId: Int64 = 0; var conversationId: String = ""; var response: String = ""
    var title: String?; var usage: StakAiUsage?
    var followUps: [String] = []; var answerKind: String = "answer"
}
struct StakAiError: Decodable { var error: String?; var code: String?; var usage: StakAiUsage? }
final class StakAiStreamError: Error { let code: String; let usage: StakAiUsage?; init(_ code: String, usage: StakAiUsage? = nil) { self.code = code; self.usage = usage } }
