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

    private let repo = StockRepository.shared

    func load() async {
        guard !loaded else { return }
        loaded = true
        async let recsTask: RecommendationsResponse? = try? repo.getRecommendations()
        async let brandsTask: BrandsListResponse? = try? repo.getBrands()
        async let swipesTask: DailySwipesResponse? = try? repo.getDailySwipes()

        if let recs = await recsTask { recommendedIds = recs.brandIds }
        if let bl = await brandsTask {
            brands = Dictionary(bl.brands.map { ($0.id, $0) }, uniquingKeysWith: { $1 })
        }
        if let sw = await swipesTask { dailySwipes = sw }
    }

    func refresh() async { loaded = false; await load() }

    func brand(_ id: String) -> BrandSummaryDto? { brands[id] }
}
