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

struct UpdateSourceDto: Decodable, Equatable {
    var source: String = ""; var url: String = ""; var headline: String = ""; var datetime: Int64 = 0
}
struct StockUpdateDto: Decodable, Identifiable, Equatable {
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

    // Swift's synthesized decoding requires every key even when the property has a default; the live catalog omits
    // interestCategories on most brands (290 of 333), which failed the whole list and left Discover on "Couldn't load
    // today's deck". Missing or null fields fall back to their defaults, as Android's decoder does.
    private enum CodingKeys: String, CodingKey { case id, ticker, name, bio, heroImage, logo, domain, interestCategories }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = c.value(.id, or: ""); ticker = c.value(.ticker, or: ""); name = c.value(.name, or: "")
        bio = c.value(.bio, or: ""); heroImage = c.value(.heroImage, or: "")
        logo = c.value(.logo, or: nil); domain = c.value(.domain, or: nil)
        interestCategories = c.value(.interestCategories, or: [])
    }
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
    static func article(_ a: NewsArticleDto) -> Self {
        let summary = a.summary.isEmpty ? a.explanation : a.summary
        return .init(
            type: "article", headline: a.headline, summary: summary.isEmpty ? nil : summary,
            source: a.source.isEmpty ? nil : a.source, url: a.url.isEmpty ? nil : a.url,
            tickers: a.ticker.isEmpty ? nil : [a.ticker.uppercased()]
        )
    }
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

// MARK: – Tolerant decoding
//
// Swift's synthesized decoding throws when ANY key is missing or null, even for a property with a default, and one bad
// item fails the whole response (the brands list did: 290 of 333 brands omit interestCategories, and the Discover deck
// wouldn't load). Android's decoder falls back to the default instead. These models - the ones Home and News read,
// several of them written by an AI - decode the same way: a missing, null or mistyped field takes its default. The
// inits live in extensions so the memberwise initializers (DailyBriefResponse(mood: "")) keep working.

extension KeyedDecodingContainer {
    /// The key's value, or `fallback` when it's missing, null or the wrong type.
    func value<T: Decodable>(_ key: Key, or fallback: T) -> T {
        (try? decodeIfPresent(T.self, forKey: key)) ?? fallback
    }
}

extension BatchQuote {
    private enum CodingKeys: String, CodingKey { case price, change, changePercent }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        price = c.value(.price, or: 0); change = c.value(.change, or: 0); changePercent = c.value(.changePercent, or: 0)
    }
}

extension TrendingStock {
    private enum CodingKeys: String, CodingKey { case ticker, name, price, change, changePercent }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        ticker = c.value(.ticker, or: ""); name = c.value(.name, or: "")
        price = c.value(.price, or: 0); change = c.value(.change, or: 0); changePercent = c.value(.changePercent, or: 0)
    }
}

extension NewsArticleDto {
    private enum CodingKeys: String, CodingKey {
        case headline, source, url, image, datetime, summary, explanation, whyItMatters, sentiment, type, ticker
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        headline = c.value(.headline, or: ""); source = c.value(.source, or: ""); url = c.value(.url, or: "")
        image = c.value(.image, or: ""); datetime = c.value(.datetime, or: 0); summary = c.value(.summary, or: "")
        explanation = c.value(.explanation, or: ""); whyItMatters = c.value(.whyItMatters, or: "")
        sentiment = c.value(.sentiment, or: "neutral"); type = c.value(.type, or: "sector"); ticker = c.value(.ticker, or: "")
    }
}

extension WhatHappenedItem {
    private enum CodingKeys: String, CodingKey { case title, body }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        title = c.value(.title, or: ""); body = c.value(.body, or: "")
    }
}

extension WatchItem {
    private enum CodingKeys: String, CodingKey { case icon, label, body }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        icon = c.value(.icon, or: ""); label = c.value(.label, or: ""); body = c.value(.body, or: "")
    }
}

extension DailyBriefResponse {
    private enum CodingKeys: String, CodingKey {
        case mood, session, dayLabel, marketClosed, nextTradingDayLabel, moodExplanation, plainEnglish
        case personalizedImpact, whatHappened, contextQuestion, watchItems
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        mood = c.value(.mood, or: ""); session = c.value(.session, or: ""); dayLabel = c.value(.dayLabel, or: "")
        marketClosed = c.value(.marketClosed, or: false); nextTradingDayLabel = c.value(.nextTradingDayLabel, or: "")
        moodExplanation = c.value(.moodExplanation, or: ""); plainEnglish = c.value(.plainEnglish, or: "")
        personalizedImpact = c.value(.personalizedImpact, or: "")
        whatHappened = c.value(.whatHappened, or: []); contextQuestion = c.value(.contextQuestion, or: "")
        watchItems = c.value(.watchItems, or: [])
    }
}

// The wrappers too: a missing or null top-level list is an empty list, not a failed response.

extension BatchQuotesResponse {
    private enum CodingKeys: String, CodingKey { case quotes }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        quotes = c.value(.quotes, or: [:])
    }
}

extension TrendingResponse {
    private enum CodingKeys: String, CodingKey { case trending }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        trending = c.value(.trending, or: [])
    }
}

extension MarketNewsResponse {
    private enum CodingKeys: String, CodingKey { case articles }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        articles = c.value(.articles, or: [])
    }
}

extension CompanyNewsResponse {
    private enum CodingKeys: String, CodingKey { case articles }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        articles = c.value(.articles, or: [])
    }
}

extension ForYouNewsResponse {
    private enum CodingKeys: String, CodingKey { case results, pending }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        results = c.value(.results, or: []); pending = c.value(.pending, or: [])
    }
}

extension ForYouCompanyNews {
    private enum CodingKeys: String, CodingKey { case ticker, articles }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        ticker = c.value(.ticker, or: ""); articles = c.value(.articles, or: [])
    }
}

// The stock page's and My STAK updates' responses decode the same tolerant way (see above): a missing, null or
// mistyped field takes its default instead of failing the whole response - one odd analyst row blanked the card.

extension StockDetailResponse {
    private enum CodingKeys: String, CodingKey { case quote, metrics, name }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        quote = c.value(.quote, or: nil)
        metrics = c.value(.metrics, or: nil)
        name = c.value(.name, or: nil)
    }
}

extension StockQuote {
    private enum CodingKeys: String, CodingKey { case price, change, changePercent, marketState, high, low, prevClose }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        price = c.value(.price, or: nil)
        change = c.value(.change, or: nil)
        changePercent = c.value(.changePercent, or: nil)
        marketState = c.value(.marketState, or: nil)
        high = c.value(.high, or: nil)
        low = c.value(.low, or: nil)
        prevClose = c.value(.prevClose, or: nil)
    }
}

extension StockMetrics {
    private enum CodingKeys: String, CodingKey { case peRatio, revenueGrowth, profitMargin, marketCap, beta, dividendYield, week52High, week52Low }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        peRatio = c.value(.peRatio, or: nil)
        revenueGrowth = c.value(.revenueGrowth, or: nil)
        profitMargin = c.value(.profitMargin, or: nil)
        marketCap = c.value(.marketCap, or: nil)
        beta = c.value(.beta, or: nil)
        dividendYield = c.value(.dividendYield, or: nil)
        week52High = c.value(.week52High, or: nil)
        week52Low = c.value(.week52Low, or: nil)
    }
}

extension AnalystResponse {
    private enum CodingKeys: String, CodingKey { case priceTarget, recommendation }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        priceTarget = c.value(.priceTarget, or: nil)
        recommendation = c.value(.recommendation, or: nil)
    }
}

extension AnalystPriceTarget {
    private enum CodingKeys: String, CodingKey { case low, avg, high }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        low = c.value(.low, or: nil)
        avg = c.value(.avg, or: nil)
        high = c.value(.high, or: nil)
    }
}

extension AnalystRecommendation {
    private enum CodingKeys: String, CodingKey { case strongBuy, buy, hold, sell, strongSell }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        strongBuy = c.value(.strongBuy, or: 0)
        buy = c.value(.buy, or: 0)
        hold = c.value(.hold, or: 0)
        sell = c.value(.sell, or: 0)
        strongSell = c.value(.strongSell, or: 0)
    }
}

extension AnalystAction {
    private enum CodingKeys: String, CodingKey { case firm, action, priceTarget }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        firm = c.value(.firm, or: "")
        action = c.value(.action, or: "")
        priceTarget = c.value(.priceTarget, or: nil)
    }
}

extension StockRiskDto {
    private enum CodingKeys: String, CodingKey { case label, level, note }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        label = c.value(.label, or: "")
        level = c.value(.level, or: nil)
        note = c.value(.note, or: "")
    }
}

extension StockWatchDto {
    private enum CodingKeys: String, CodingKey { case title, note }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        title = c.value(.title, or: "")
        note = c.value(.note, or: "")
    }
}

extension RiskWatchResponse {
    private enum CodingKeys: String, CodingKey { case risks, watch, rated }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        risks = c.value(.risks, or: [])
        watch = c.value(.watch, or: [])
        rated = c.value(.rated, or: false)
    }
}

extension DailyMoveResponse {
    private enum CodingKeys: String, CodingKey { case explanation, direction }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        explanation = c.value(.explanation, or: "")
        direction = c.value(.direction, or: "flat")
    }
}

extension EarningsResponse {
    private enum CodingKeys: String, CodingKey { case status, date, hour }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        status = c.value(.status, or: "")
        date = c.value(.date, or: nil)
        hour = c.value(.hour, or: nil)
    }
}

extension PeerMetricsResponse {
    private enum CodingKeys: String, CodingKey { case ticker, peerTickers, peerCount, pe, revenueGrowth, profitMargin, beta }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        ticker = c.value(.ticker, or: "")
        peerTickers = c.value(.peerTickers, or: [])
        peerCount = c.value(.peerCount, or: 0)
        pe = c.value(.pe, or: nil)
        revenueGrowth = c.value(.revenueGrowth, or: nil)
        profitMargin = c.value(.profitMargin, or: nil)
        beta = c.value(.beta, or: nil)
    }
}

extension ChartPoint {
    private enum CodingKeys: String, CodingKey { case ts, close, session }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        ts = c.value(.ts, or: "")
        close = c.value(.close, or: 0)
        session = c.value(.session, or: "regular")
    }
}

extension ChartResponse {
    private enum CodingKeys: String, CodingKey { case prices }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        prices = c.value(.prices, or: [])
    }
}

extension UpdateSourceDto {
    private enum CodingKeys: String, CodingKey { case source, url, headline, datetime }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        source = c.value(.source, or: "")
        url = c.value(.url, or: "")
        headline = c.value(.headline, or: "")
        datetime = c.value(.datetime, or: 0)
    }
}

extension StockUpdateDto {
    private enum CodingKeys: String, CodingKey { case id, ticker, company, kind, title, body, watch, sources, occurredAt, read }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = c.value(.id, or: 0)
        ticker = c.value(.ticker, or: "")
        company = c.value(.company, or: "")
        kind = c.value(.kind, or: "")
        title = c.value(.title, or: "")
        body = c.value(.body, or: "")
        watch = c.value(.watch, or: nil)
        sources = c.value(.sources, or: [])
        occurredAt = c.value(.occurredAt, or: "")
        read = c.value(.read, or: false)
    }
}

extension UpdatesResponse {
    private enum CodingKeys: String, CodingKey { case updates, unread }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        updates = c.value(.updates, or: [])
        unread = c.value(.unread, or: 0)
    }
}
