import Foundation

/// Fetches and publishes the Discover deck's data: the ordered list of brand IDs
/// from the recommendation engine plus the brand catalogue for quick-look data.
/// Mirrors android ui/discover/ — RecommendationsViewModel.
@MainActor
final class DiscoverViewModel: ObservableObject {
    /// Ordered brand IDs for the day's deck, from the recommendation engine.
    @Published var recommendedIds: [String] = []
    /// Full brand catalogue, keyed by id. Populated once and cached.
    @Published var brands: [String: BrandSummaryDto] = [:]
    @Published var dailySwipes: DailySwipesResponse? = nil
    @Published var loaded = false
    @Published var loadFailed = false
    /// Set true when the server says the daily swipe limit has been reached.
    @Published var hasReachedDailyLimit = false
    /// Server-supplied deck size; fallback 12 until the first SwipeResponse arrives.
    @Published var dailyLimit = 12
    /// Brand IDs the user has already passed on the server — merged into deck filtering.
    @Published var serverPassedBrandIds: Set<String> = []

    private let repo = StockRepository.shared
    /// Swipe records posted after a 3s delay so the undo window can cancel them.
    /// Mirrors Android DiscoverViewModel.pendingSwipeJobs.
    private var pendingSwipeTasks: [String: Task<Void, Never>] = [:]
    /// Quick-look cache keyed by brandId — prefetched once the deck loads so the sheet opens instantly.
    private var quickLookCache: [String: QuickLookDto] = [:]
    /// Tip cache keyed by brandId — prefetched once the deck loads.
    private var tipCache: [String: String] = [:]

    func load() async {
        guard !loaded else { return }
        loaded = true
        loadFailed = false
        async let recsTask: RecommendationsResponse? = try? repo.getRecommendations()
        async let brandsTask: BrandsListResponse? = try? repo.getBrands()
        async let swipesTask: DailySwipesResponse? = try? repo.getDailySwipes()
        async let passedTask: PassedResponse? = try? repo.getPassed()

        let recs = await recsTask
        let bl = await brandsTask
        if recs == nil && bl == nil {
            loadFailed = true
        }
        if let recs { recommendedIds = recs.brandIds }
        if let bl {
            brands = Dictionary(bl.brands.map { ($0.id, $0) }, uniquingKeysWith: { $1 })
        }
        if let sw = await swipesTask { dailySwipes = sw }
        if let passed = await passedTask {
            serverPassedBrandIds = Set(passed.entries.map { $0.id })
        }
        if !brands.isEmpty {
            prefetchQuickLooks()
            prefetchTips()
        }
    }

    func refresh() async { loaded = false; await load() }

    /// Re-fetches the brand catalogue — called every 30s to keep prices current.
    func refreshPrices() async {
        if let bl = try? await repo.getBrands() {
            brands = Dictionary(bl.brands.map { ($0.id, $0) }, uniquingKeysWith: { $1 })
        }
    }

    /// Returns the quick-look analysis for a symbol. Checks the prefetch cache first so
    /// the sheet opens instantly after the deck has loaded. Mirrors Android fetchQuickLook().
    func fetchQuickLook(symbol: String) async -> QuickLookDto? {
        guard let brand = brands.values.first(where: { $0.ticker.uppercased() == symbol.uppercased() }) else { return nil }
        if let cached = quickLookCache[brand.id] { return cached }
        let ql = try? await repo.getBrandQuickLook(brand.id).quickLook
        if let ql { quickLookCache[brand.id] = ql }
        return ql
    }

    /// Returns the cached tip for a symbol, or nil if not yet fetched.
    func tipForSymbol(_ symbol: String) -> String? {
        guard let brand = brands.values.first(where: { $0.ticker.uppercased() == symbol.uppercased() }) else { return nil }
        return tipCache[brand.id]
    }

    /// Fires a learn-more engagement event when the Quick Look sheet opens.
    /// Mirrors Android DiscoverViewModel.recordLearnMore().
    func recordLearnMore(symbol: String) {
        guard !Session.shared.demoAccount,
              let brand = brands.values.first(where: { $0.ticker.uppercased() == symbol.uppercased() }) else { return }
        let req = EngagementEventRequest(
            type: "learn_more", brandId: brand.id, ticker: symbol,
            categories: brand.interestCategories.isEmpty ? nil : brand.interestCategories,
            todayKey: Self.todayKey()
        )
        Task { _ = try? await repo.recordEvent(req) }
    }

    /// Pre-warms the Quick Look cache for all brands in the catalogue so the sheet rarely waits.
    /// Called once after the deck loads. Mirrors Android prefetchQuickLooks().
    private func prefetchQuickLooks() {
        Task { [weak self] in
            guard let self else { return }
            for brand in brands.values where !brand.id.isEmpty {
                guard quickLookCache[brand.id] == nil else { continue }
                if let ql = try? await repo.getBrandQuickLook(brand.id).quickLook {
                    quickLookCache[brand.id] = ql
                }
            }
        }
    }

    /// Pre-fetches tip text for all brands so the tip row shows live copy, not the static fallback.
    private func prefetchTips() {
        Task { [weak self] in
            guard let self else { return }
            for brand in brands.values where !brand.id.isEmpty {
                guard tipCache[brand.id] == nil else { continue }
                if let tip = try? await repo.getBrandTip(brand.id).tip, !tip.isEmpty {
                    tipCache[brand.id] = tip
                }
            }
        }
    }

    func brand(_ id: String) -> BrandSummaryDto? { brands[id] }

    /// Records a swipe after a 3s delay. The delay allows the undo toast window to
    /// cancel the record before it reaches the server. Mirrors Android recordSwipe().
    func recordSwipe(symbol: String, isSTAK: Bool) {
        guard !Session.shared.demoAccount else { return }
        guard let brand = brands.values.first(where: { $0.ticker.uppercased() == symbol.uppercased() }) else { return }
        let brandId = brand.id
        let categories = brand.interestCategories
        pendingSwipeTasks[brandId]?.cancel()
        let direction = isSTAK ? "right" : "left"
        let key = Self.todayKey()
        let repo = self.repo
        pendingSwipeTasks[brandId] = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            guard !Task.isCancelled else { return }
            let req = RecordSwipeRequest(
                brandId: brandId, direction: direction, todayKey: key,
                ticker: symbol, categories: categories.isEmpty ? nil : categories
            )
            if let resp = try? await repo.recordSwipe(req) {
                if resp.limitReached {
                    await MainActor.run { [weak self] in
                        self?.hasReachedDailyLimit = true
                        if resp.dailySwipeLimit > 0 { self?.dailyLimit = resp.dailySwipeLimit }
                    }
                } else if resp.dailySwipeLimit > 0 {
                    await MainActor.run { [weak self] in
                        self?.dailyLimit = resp.dailySwipeLimit
                    }
                }
            }
            await MainActor.run { [weak self] in
                self?.pendingSwipeTasks.removeValue(forKey: brandId)
            }
        }
    }

    /// Cancels the pending swipe record so the server never sees the action (called by undo).
    func cancelPendingSwipe(brandId: String) {
        pendingSwipeTasks[brandId]?.cancel()
        pendingSwipeTasks.removeValue(forKey: brandId)
    }

    /// Records a Pass to the server's passed list. Called after each Pass swipe.
    func recordPassed(symbol: String, at timestamp: Int64) {
        guard !Session.shared.demoAccount,
              let brand = brands.values.first(where: { $0.ticker.uppercased() == symbol.uppercased() }) else { return }
        let entry = PassedEntry(id: brand.id, at: timestamp)
        serverPassedBrandIds.insert(brand.id)
        Task { _ = try? await repo.putPassed([entry]) }
    }

    private static func todayKey() -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; return f.string(from: Date())
    }
}
