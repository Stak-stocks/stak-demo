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
		// A response for an account that has since signed out must not land on the next one.
		let account = Session.shared.accountGeneration
		Task.detached(priority: .background) {
			guard let me = try? await self.repo.getMe() else {
				await MainActor.run { self.syncedAt = nil }
				return
			}
			let upload: TasteDto? = await MainActor.run {
				guard !Session.shared.demoAccount, Session.shared.accountGeneration == account else { return nil }
				if let joined = Self.joinedMonth(me.createdAt) { UserProfile.shared.joined = joined }
				UserProfile.shared.email = me.email
				Entitlements.shared.apply(raw: me.plan)
				EligibilityGate.shared.apply(me)
				StakNotifications.rememberCreatedAt(me.createdAt)
				// The account's name wins when it has one - a rename on another phone reaches this one; a blank never
				// wipes the name here.
				// ...unless this phone's edit hasn't reached the server yet: then it is the newer one, and goes up below.
				let serverName = me.displayName.trimmingCharacters(in: .whitespaces)
				if !StakStore.bool("name.pending", default: false), !serverName.isEmpty, serverName != UserProfile.shared.displayName {
					UserProfile.shared.displayName = serverName
				}
				// Answers changed on this phone (Taste & risk) that haven't reached the server are the newer ones.
				// (A phone signed out and back in has none left to send: the server's answers win, and the flag goes.)
				let tastePending = StakStore.bool(Self.tastePending, default: false) && Self.currentTaste().hasAnswers
				if !tastePending { StakStore.set(false, for: Self.tastePending) }
				if let taste = me.taste, taste.hasAnswers, !tastePending {
					UserProfile.shared.goal = taste.goal
					UserProfile.shared.risk = taste.risk
					UserProfile.shared.brandPicks = Set(taste.picks)
					if !taste.riskStyle.trimmingCharacters(in: .whitespaces).isEmpty {
						UserProfile.shared.riskStyle = taste.riskStyle
					}
				}
				Session.shared.saveProfile()
				// The server has no answers but this phone does (answered before taste was synced), or this phone's are
				// newer: they go up.
				let local = Self.currentTaste()
				return ((me.taste?.hasAnswers ?? false) && !tastePending) || !local.hasAnswers ? nil : local
			}
			if let upload, await MainActor.run(body: { Session.shared.accountGeneration == account }),
			   (try? await self.repo.putMe(taste: upload)) != nil {
				await MainActor.run {
					if Session.shared.accountGeneration == account, Self.same(Self.currentTaste(), upload) { StakStore.set(false, for: Self.tastePending) }
				}
			}
			// A rename that didn't reach the server (offline, a save cut short) goes up now.
			let pendingName: String? = await MainActor.run {
				guard Session.shared.accountGeneration == account, StakStore.bool("name.pending", default: false) else { return nil }
				return UserProfile.shared.displayName.trimmingCharacters(in: .whitespaces)
			}
			if let pendingName, !pendingName.isEmpty, (try? await self.repo.putMe(displayName: pendingName)) != nil {
				await MainActor.run { if Session.shared.accountGeneration == account { StakStore.set(false, for: "name.pending") } }
			}
		}
	}

	private static let tastePending = "taste.pending"
	/// The last taste send: each waits for the one before, so an older one can't land after a newer one.
	private var tasteSend: Task<Void, Never>? = nil

	private static func same(_ a: TasteDto, _ b: TasteDto) -> Bool {
		a.goal == b.goal && a.risk == b.risk && a.riskStyle == b.riskStyle && Set(a.picks) == Set(b.picks)
	}

	/// The onboarding answers changed after onboarding (Profile -> Taste & risk): sent now, and pending until the
	/// server has them, so a sync in between doesn't put the old ones back (the next sync sends them if this fails).
	@MainActor
	func pushTaste() {
		guard !Session.shared.demoAccount, Session.shared.token != nil else { return }
		StakStore.set(true, for: Self.tastePending)
		let account = Session.shared.accountGeneration
		let taste = Self.currentTaste()
		let previous = tasteSend
		tasteSend = Task.detached(priority: .utility) {
			await previous?.value
			guard (try? await self.repo.putMe(taste: taste)) != nil else { return }
			// Only a send of what the phone still holds clears the flag.
			await MainActor.run {
				if Session.shared.accountGeneration == account, Self.same(Self.currentTaste(), taste) { StakStore.set(false, for: Self.tastePending) }
			}
		}
	}

	/// The onboarding answers as the server stores them.
	@MainActor
	static func currentTaste() -> TasteDto {
		let p = UserProfile.shared
		return TasteDto(goal: p.goal, risk: p.risk, riskStyle: p.riskStyle, picks: Array(p.brandPicks))
	}

	/// "September 2026" from an ISO8601 creation timestamp, in this phone's time zone.
	static func joinedMonth(_ createdAt: String) -> String? {
		guard !createdAt.isEmpty else { return nil }
		// A full timestamp, or failing that its date alone ("2026-09-14").
		guard let d = MyStakHoldings.parse(createdAt) ?? dayFormatter.date(from: String(createdAt.prefix(10))) else { return nil }
		return StakClock.monthYear(d)
	}

	private static let dayFormatter: DateFormatter = {
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.dateFormat = "yyyy-MM-dd"
		return f
	}()
}
