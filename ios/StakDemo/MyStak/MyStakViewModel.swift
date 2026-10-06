import Foundation

/// Syncs the server-side saved-stocks list into MyStakHoldings.shared and
/// fetches the taste graph and unread-update count for the My STAK screen.
/// Mirrors android ui/mystak/ — MyStakViewModel.
@MainActor
final class MyStakViewModel: ObservableObject {
    @Published var taste: TasteResponse? = nil
    @Published var tasteFailed = false
    @Published var updates: [StockUpdateDto] = []
    @Published var unreadCount: Int = 0
    @Published var updatesFailed = false
    @Published var loaded = false

    private let repo = StockRepository.shared

    func load() async {
        guard !loaded else { return }
        loaded = true
        if Session.shared.demoAccount {
            updates = DemoUpdates.all; unreadCount = DemoUpdates.unread
            return
        }
        async let stocksTask: Void = MyStakHoldings.shared.refreshFromBackend()
        async let tasteTask: TasteResponse? = try? repo.getTaste()
        async let updatesTask: UpdatesResponse? = try? repo.getUpdates()

        // The holdings store reads the server's list itself (names, categories, save prices) - adding each ticker
        // here would have written the list straight back with a PUT per stock.
        await stocksTask
        if let t = await tasteTask { taste = t } else { tasteFailed = true }
        if let u = await updatesTask { updates = u.updates; unreadCount = u.unread } else { updatesFailed = true }
    }

    func refresh() async { loaded = false; await load() }

    func loadTaste(force: Bool = false) async {
        if !force, taste != nil { return }
        if let t = try? await repo.getTaste() { taste = t; tasteFailed = false } else { tasteFailed = true }
    }

    func loadUpdates() async {
        if Session.shared.demoAccount {
            updates = DemoUpdates.all; unreadCount = DemoUpdates.unread; updatesFailed = false; return
        }
        if let u = try? await repo.getUpdates() { updates = u.updates; unreadCount = u.unread; updatesFailed = false } else { updatesFailed = true }
    }

    func markCompanyRead(_ ticker: String) {
        let unreadIds = updates.filter { $0.ticker.lowercased() == ticker.lowercased() && !$0.read }.map { $0.id }
        guard !unreadIds.isEmpty else { return }
        updates = updates.map { u in
            guard u.ticker.lowercased() == ticker.lowercased() else { return u }
            var copy = u; copy.read = true; return copy
        }
        unreadCount = updates.filter { !$0.read }.count
        for id in unreadIds { Task { _ = try? await repo.markUpdateRead(id) } }
    }
}
