import Foundation

/// Fetches updates from the backend and exposes them as StakNotifications
/// items (the same observable store the NotificationsView already observes).
/// Mirrors android ui/inbox/InboxViewModel.kt.
@MainActor
final class InboxViewModel: ObservableObject {
    @Published var unreadCount: Int = 0
    @Published var loaded = false

    private let repo = StockRepository.shared

    func load() async {
        guard !loaded else { return }
        loaded = true
        await fetchUpdates()
    }

    func refresh() async { loaded = false; await load() }

    func markRead(_ id: Int64) async {
        _ = try? await repo.markUpdateRead(id)
    }

    private func fetchUpdates() async {
        guard let result = try? await repo.getUpdates() else { return }
        unreadCount = result.unread
        // Merge into the StakNotifications store that NotificationsView observes.
        let items: [StakNotifications.Item] = result.updates.map { u in
            StakNotifications.Item(
                id: String(u.id),
                title: u.title,
                body: u.body,
                time: relativeTime(iso: u.occurredAt)
            )
        }
        StakNotifications.shared.mergeFromApi(items)
    }

    private func relativeTime(iso: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: iso) else { return "" }
        let secs = Int(Date().timeIntervalSince(date))
        if secs < 60 { return "Just now" }
        if secs < 3600 { return "\(secs / 60)m" }
        if secs < 86400 { return "\(secs / 3600)h" }
        let days = secs / 86400
        if days < 7 { return "\(days)d" }
        return "\(days / 7)w"
    }
}
