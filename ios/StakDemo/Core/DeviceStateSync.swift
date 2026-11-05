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

	private var readsPulledAt = Date.distantPast

	/// Another device's read marks, pulled in when the inbox refreshes (at most every 30s), so a notification read on
	/// one device isn't unread on the other. Sign-in alone was too rare a pull: a phone that had its own marks kept
	/// them, and its next push overwrote the other's.
	@MainActor
	func pullReads() {
		guard !Session.shared.demoAccount, Session.shared.token != nil,
			Date().timeIntervalSince(readsPulledAt) >= 30 else { return }
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

	/// The server's read marks joined with this device's. Marks only add up (the inbox trims its own to what it
	/// lists), so a union never turns a read notification unread.
	@MainActor
	private static func mergeReads(_ remote: [String]) {
		let local = StakStore.stringSet("notif.read")
		let merged = (local ?? []).union(remote)
		if merged != local ?? [] || (local == nil && !remote.isEmpty) { StakStore.set(merged, for: "notif.read") }
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
