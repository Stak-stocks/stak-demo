import Foundation

/// Carries notification read-ids and saved news to/from the server so a second phone
/// isn't starting from nothing. Each stays local-first and instant; this just keeps a
/// copy on the account. Mirrors android/data/DeviceStateSync.kt.
final class DeviceStateSync {
	static let shared = DeviceStateSync()
	private let repo = StockRepository.shared
	/// pullReads' throttle: Home and the inbox ask on every visit.
	private static let readsPullEvery: TimeInterval = 30
	private var readsPulledAt = Date.distantPast

	private init() {}

	/// Called once per real sign-in. Read marks are merged with the server's; saved news is
	/// pulled only into a phone with none yet. Then pushes what this phone has so the server
	/// catches up.
	@MainActor
	func sync() {
		guard !Session.shared.demoAccount, Session.shared.token != nil else { return }
		// This pull covers the inbox's own first one.
		readsPulledAt = Date()
		// A read that lands after a sign-out or account switch belongs to the account that left (the store's keys
		// resolve to the current one at write time).
		let account = Session.shared.accountGeneration
		Task.detached(priority: .background) {
			guard let remote = try? await self.repo.getAndroidState() else { return }
			let current = await MainActor.run { Session.shared.accountGeneration == account }
			guard current else { return }
			await MainActor.run {
				Self.mergeReads(remote.notifRead)
				if StakStore.stringSet("news.saved") == nil, !remote.newsSaved.isEmpty {
					StakStore.set(Set(remote.newsSaved), for: "news.saved")
				}
				StakNotifications.shared.reloadReadIds()
				NewsSaves.shared.load()
			}
			await self.doPush()
		}
	}

	/// Another device's read marks, pulled in when Home shows, the inbox opens or the app comes back (at most every
	/// readsPullEvery), so a notification read on one device isn't unread on the other. Sign-in alone was too rare a
	/// pull: a phone that had its own marks kept them, and its next push overwrote the other's.
	@MainActor
	func pullReads() {
		guard !Session.shared.demoAccount, Session.shared.token != nil,
			Date().timeIntervalSince(readsPulledAt) >= Self.readsPullEvery else { return }
		readsPulledAt = Date()
		let account = Session.shared.accountGeneration
		Task.detached(priority: .utility) {
			guard let remote = try? await self.repo.getAndroidState() else { return }
			await MainActor.run {
				guard Session.shared.accountGeneration == account else { return }
				Self.mergeReads(remote.notifRead)
				StakNotifications.shared.reloadReadIds()
			}
		}
	}

	/// The server's read marks joined with this device's. Marks are only added to (markAllRead too), so a union never
	/// turns a read notification unread.
	@MainActor
	private static func mergeReads(_ remote: [String]) {
		let local = StakStore.stringSet("notif.read") ?? []
		let merged = local.union(remote)
		if merged != local { StakStore.set(merged, for: "notif.read") }
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
