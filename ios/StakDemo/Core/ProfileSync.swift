import Foundation

/// Keeps a real account's profile the same on every phone: the month it joined comes
/// from the server's creation time, and the onboarding answers (taste chips, risk style)
/// are stored with the account instead of only on this phone.
/// Mirrors android/data/ProfileSync.kt.
final class ProfileSync {
	static let shared = ProfileSync()
	private let repo = StockRepository.shared
	private var syncedAt: Date? = nil
	private let interval: TimeInterval = 5 * 60

	private init() {}

	/// Reads the account from the server. Called after sign-in and when Profile opens.
	/// The demo account has nothing to sync.
	@MainActor
	func sync(force: Bool = false) {
		guard !Session.shared.demoAccount, Session.shared.token != nil else { return }
		if !force, let last = syncedAt, Date().timeIntervalSince(last) < interval { return }
		syncedAt = Date()
		Task.detached(priority: .background) {
			guard let me = try? await self.repo.getMe() else {
				await MainActor.run { self.syncedAt = nil }
				return
			}
			await MainActor.run {
				guard !Session.shared.demoAccount else { return }
				if let joined = Self.joinedMonth(me.createdAt) { UserProfile.shared.joined = joined }
				UserProfile.shared.email = me.email
				Entitlements.shared.apply(raw: me.plan)
				if let createdAt = ISO8601DateFormatter().date(from: me.createdAt) {
					StakStore.set(String(Int(createdAt.timeIntervalSince1970 / 86400)), for: "notif.createdAt")
				}
				if UserProfile.shared.displayName.trimmingCharacters(in: .whitespaces).isEmpty,
				   !me.displayName.trimmingCharacters(in: .whitespaces).isEmpty {
					UserProfile.shared.displayName = me.displayName
				}
				if let taste = me.taste, taste.goal >= 0 || taste.risk >= 0 || !taste.picks.isEmpty {
					UserProfile.shared.goal = taste.goal
					UserProfile.shared.risk = taste.risk
					UserProfile.shared.brandPicks = Set(taste.picks)
					if !taste.riskStyle.trimmingCharacters(in: .whitespaces).isEmpty {
						UserProfile.shared.riskStyle = taste.riskStyle
					}
				}
				Session.shared.saveProfile()
			}
		}
	}

	/// "September 2026" from an ISO8601 creation timestamp, in this phone's time zone.
	static func joinedMonth(_ createdAt: String) -> String? {
		guard !createdAt.isEmpty else { return nil }
		let iso = ISO8601DateFormatter()
		iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
		let date = iso.date(from: createdAt) ?? ISO8601DateFormatter().date(from: createdAt)
		guard let d = date else { return nil }
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.dateFormat = "MMMM yyyy"
		return f.string(from: d)
	}
}
