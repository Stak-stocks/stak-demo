import Foundation

/// Syncs the server-side saved-stocks list into MyStakHoldings.shared and
/// fetches the taste graph and unread-update count for the My STAK screen.
/// Mirrors android ui/mystak/ — MyStakViewModel.
@MainActor
final class MyStakViewModel: ObservableObject {
    @Published var taste: TasteResponse? = nil
    @Published var unreadCount: Int = 0
    @Published var loaded = false

    private let repo = StockRepository.shared

    func load() async {
        guard !loaded else { return }
        loaded = true
        async let stocksTask: AndroidStocksResponse? = try? repo.getAndroidStocks()
        async let tasteTask: TasteResponse? = try? repo.getTaste()
        async let updatesTask: UpdatesResponse? = try? repo.getUpdates()

        if let s = await stocksTask {
            // Merge server tickers into local holdings (non-destructive).
            for ticker in s.tickers { MyStakHoldings.shared.add(ticker) }
        }
        if let t = await tasteTask { taste = t }
        if let u = await updatesTask { unreadCount = u.unread }
    }

    func refresh() async { loaded = false; await load() }
}
