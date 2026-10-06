import Foundation

/// Carries notification read-ids and saved news to/from the server so a second phone
/// isn't starting from nothing. Each stays local-first and instant; this just keeps a
/// copy on the account. Mirrors android/data/DeviceStateSync.kt.
final class DeviceStateSync {
	static let shared = DeviceStateSync()
	private let repo = StockRepository.shared

	private init() {}

	/// Called once per real sign-in. Pulls server state into singletons that have no
	/// local data yet; then pushes what this phone already has so the server catches up.
	@MainActor
	func sync() {
		guard !Session.shared.demoAccount, Session.shared.token != nil else { return }
		Task.detached(priority: .background) {
			guard let remote = try? await self.repo.getAndroidState() else { return }
			await MainActor.run {
				if StakStore.stringSet("notif.read") == nil, !remote.notifRead.isEmpty {
					StakStore.set(Set(remote.notifRead), for: "notif.read")
				}
				if StakStore.stringSet("news.saved") == nil, !remote.newsSaved.isEmpty {
					StakStore.set(Set(remote.newsSaved), for: "news.saved")
				}
				StakNotifications.shared.load()
				NewsSaves.shared.load()
			}
			await self.doPush()
		}
	}

	/// Fire-and-forget: whatever this phone holds right now becomes the server's copy.
	@MainActor
	func push() {
		guard !Session.shared.demoAccount, Session.shared.token != nil else { return }
		Task.detached(priority: .background) { await self.doPush() }
	}

	private func doPush() async {
		let notifRead = await MainActor.run { StakStore.stringSet("notif.read").map(Array.init) }
		let newsSaved = await MainActor.run { StakStore.stringSet("news.saved").map(Array.init) }
		_ = try? await repo.putAndroidState(AndroidStatePutRequest(
			notifRead: notifRead,
			newsSaved: newsSaved
		))
	}
}
