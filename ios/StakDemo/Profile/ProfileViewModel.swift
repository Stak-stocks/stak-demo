import Foundation

/// Fetches the signed-in user's profile from api/me and syncs it into
/// UserProfile.shared / Session.shared. Mirrors android ui/profile/ProfileViewModel.kt.
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var loaded = false

    private let repo = StockRepository.shared

    func load() async {
        guard !loaded else { return }
        loaded = true
        await fetchMe()
    }

    func refresh() async { loaded = false; await load() }

    private func fetchMe() async {
        guard let me = try? await repo.getMe() else { return }
        let p = UserProfile.shared
        if !me.displayName.trimmingCharacters(in: .whitespaces).isEmpty {
            p.displayName = me.displayName
        }
        if !me.email.isEmpty { p.email = me.email }
        if let taste = me.taste {
            if taste.risk >= 0 { p.risk = taste.risk }
            if !taste.riskStyle.isEmpty { p.riskStyle = taste.riskStyle }
            if taste.goal >= 0 { p.goal = taste.goal }
            if !taste.picks.isEmpty { p.brandPicks = Set(taste.picks) }
        }
        Session.shared.saveProfile()
    }
}
