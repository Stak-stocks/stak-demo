import SwiftUI
import UIKit

/// Persisted sign-in state (user, 2026-08-23): a user who already signed
/// in is not asked to sign in again - the splash goes straight to Home;
/// a first-time user is taken to create an account. Backed by
/// UserDefaults until the real auth backend lands (then this is the
/// seam that holds the token + the profile it returns). Mirrors android
/// ui/Session.kt.
@MainActor
final class Session: ObservableObject {
	static let shared = Session()

	private static let keySignedIn = "stak.signedIn"
	private static let keyName = "stak.displayName"
	private static let keyRisk = "stak.riskStyle"
	/// Legacy: earlier builds kept the photo bytes here; read once and moved
	/// to the photo file (see loadPhoto).
	private static let keyPhoto = "stak.photoData"
	private static let keyDemo = "stak.demoAccount"
	private static let keyPicks = "stak.brandPicks"
	private static let keyGoal = "stak.goalAnswer"
	private static let keyRiskAnswer = "stak.riskAnswer"
	private static let keyNotif = "stak.notificationsOn"
	private static let keyLock = "stak.accountLock"
	private static let keyPrefs = "stak.prefs"
	private static let keyJoined = "stak.joined"
	private static let keyFirstRun = "stak.firstRunPending"
	private static let keyJwt = "stak.jwt"
	private static let keyEmail = "stak.email"

	@Published private(set) var signedIn: Bool

	/// Supabase JWT access token — stored for authenticated API calls. Nil until first real sign-in.
	/// Mirrors android Session.kt token. NetworkModule reads this as a fallback before supabase-swift
	/// has refreshed its own in-memory session cache.
	private(set) var token: String? = nil

	/// The signed-in user's id (the JWT "sub" claim). Used to key per-account phone state.
	/// Mirrors android Session.kt accountId.
	private(set) var accountId: String? = nil

	/// True when this launch started already signed in - the returning-user path.
	private(set) var resumedSignedIn: Bool
	/// Which account this is (product audit, 2026-09-05; mirrors Android): Sign in = the
	/// DEMO account with the authored history, Create account = a NEW account that starts
	/// empty and earns its numbers. Persisted with the sign-in.
	@Published private(set) var demoAccount: Bool
	/// True for a FIRST-TIME user: the account was created here (Create account ->
	/// onboarding) and Home's first run (1:958) has not been completed yet. An
	/// active/returning user - Sign in (the demo persona) or any relaunch after the
	/// first run - lands on Home Main (user, 2026-09-07: "there should be a first
	/// time user and active/returning user"). Persisted, so a relaunch in the
	/// middle of the first run keeps it. Mirrors Android's Session.firstRunPending.
	@Published private(set) var firstRunPending: Bool

	private init() {
		let d = UserDefaults.standard
		// A @Published property can be assigned but not READ through self
		// until every stored property is initialized - both flags come
		// from the local instead.
		let wasSignedIn = d.bool(forKey: Self.keySignedIn)
		let wasDemo = d.object(forKey: Self.keyDemo) as? Bool ?? true
		signedIn = wasSignedIn
		resumedSignedIn = wasSignedIn
		demoAccount = wasDemo
		firstRunPending = d.bool(forKey: Self.keyFirstRun)
		StakStore.demoAccount = wasDemo
		UserProfile.shared.demoAccount = wasDemo
		UserProfile.shared.displayName = d.string(forKey: Self.keyName) ?? ""
		if let risk = d.string(forKey: Self.keyRisk) { UserProfile.shared.riskStyle = risk }
		UserProfile.shared.brandPicks = Set(d.stringArray(forKey: Self.keyPicks) ?? [])
		UserProfile.shared.goal = d.object(forKey: Self.keyGoal) as? Int ?? -1
		UserProfile.shared.risk = d.object(forKey: Self.keyRiskAnswer) as? Int ?? -1
		UserProfile.shared.notificationsOn = d.object(forKey: Self.keyNotif) as? Bool ?? true
		UserProfile.shared.accountLock = d.bool(forKey: Self.keyLock)
		UserProfile.shared.joined = d.string(forKey: Self.keyJoined) ?? ""
		if let prefs = d.dictionary(forKey: Self.keyPrefs) {
			let p = UserProfile.shared
			p.priceAlerts = prefs["priceAlerts"] as? Bool ?? true
			p.dailyDeck = prefs["dailyDeck"] as? Bool ?? true
			p.marketNews = prefs["marketNews"] as? Bool ?? false
			p.priceThreshold = prefs["priceThreshold"] as? Int ?? 3
			// Only Dark and Match system exist (the Light build of 2026-09-08 was withdrawn): a
			// value that build stored reads as Dark, so the Appearance page always shows a choice.
			p.appearance = (prefs["appearance"] as? String) == "system" ? "system" : "dark"
			p.linkedGoogle = prefs["linkedGoogle"] as? Bool ?? false
			p.linkedApple = prefs["linkedApple"] as? Bool ?? false
		}
		UserProfile.shared.photoData = Self.loadPhoto()
		UserProfile.shared.email = d.string(forKey: Self.keyEmail) ?? ""
		token = d.string(forKey: Self.keyJwt)
		accountId = token.flatMap(jwtSubject)
		StakStore.accountId = accountId
		// Before per-user keys every real account shared "new.": a user already signed in keeps it under their id.
		StakStore.migrateLegacy(accountId: wasSignedIn && !wasDemo ? accountId : nil)
		applyAccount()
	}

	/// Seeds (demo) or clears (new account) every user-data singleton for the current account.
	/// `triggerSync` is false during init because Session.shared isn't live yet — ProfileSync
	/// and DeviceStateSync both read Session.shared and would deadlock the dispatch_once.
	func applyAccount(triggerSync: Bool = false) {
		MyStakHoldings.shared.reset(demo: demoAccount, signedIn: token != nil)
		PaperPortfolio.shared.reset(demo: demoAccount)
		DeckSession.shared.load()
		StakNotifications.shared.load()
		NewsSaves.shared.load()
		Entitlements.shared.load()
		if triggerSync && !demoAccount {
			// Forced: the 5-minute throttle is the last account's, not this one's.
			ProfileSync.shared.sync(force: true)
			DeviceStateSync.shared.sync()
		}
	}

	/// Bumped on every sign-in and sign-out: a server read that finishes after the account it was for has left (profile
	/// sync) never lands on the next one. Mirrors android Session.accountGeneration.
	private(set) var accountGeneration = 0

	/// Sign-in CTA or account creation (09 Proceed) - remembered across launches.
	/// `demo` = the authored demo account; false = a real account (every live caller passes false).
	/// `answeredOnboarding` = the taste answers on this phone were just given for this account (Profile setup).
	/// Any other sign-in drops them - they may be a different account's, or a half-finished onboarding - and
	/// ProfileSync restores the account's own. Mirrors android Session.signIn.
	func signIn(demo: Bool, answeredOnboarding: Bool = false) {
		accountGeneration += 1
		signedIn = true
		demoAccount = demo
		StakStore.demoAccount = demo
		UserProfile.shared.demoAccount = demo
		// Only a brand-new account (just through onboarding) is a first-time user; any other sign-in is a returning one
		// (every live sign-in passes demo: false, so `!demo` alone made each one a first run).
		firstRunPending = !demo && answeredOnboarding
		// The persona's own profile, or a real account's own from the server: an onboarding started and abandoned
		// before "Already have an account? Sign in" must not leak its brand picks or risk answer into the account
		// (audit 2026-09-07).
		if demo || !answeredOnboarding { UserProfile.shared.clearTaste() }
		if demo {
			// ...nor its 08 Permissions answers or notification preferences (Codex review,
			// PR #166 mirror): "Not now" on a sign-up that was backed out of must not
			// silently switch the persona's notifications and account lock off.
			UserProfile.shared.notificationsOn = true
			UserProfile.shared.accountLock = false
			UserProfile.shared.priceAlerts = true
			UserProfile.shared.dailyDeck = true
			UserProfile.shared.marketNews = false
			UserProfile.shared.priceThreshold = 3
		}
		// Brand-new account: the server's creation month isn't known yet, and it is this one. Any other sign-in waits
		// for the month the server gives (ProfileSync).
		if !demo && answeredOnboarding && UserProfile.shared.joined.isEmpty { UserProfile.shared.joined = StakClock.monthYear() }
		persist()
		// A real account keeps its own phone state (saves, paper ledger, inbox, the deck's day) across log out / log
		// in - only Delete account wipes it.
		applyAccount(triggerSync: true)
		if !demo { PushRegistration.sync() }
	}

	/// Stores the Supabase JWT for authenticated API calls. Mirrors android Session.kt setToken(). It does not sign
	/// the session in: signIn(demo:answeredOnboarding:) does that once navigation settles, so an app closed halfway
	/// through onboarding opens on Create account again, not on a Home the account never finished setting up.
	func setToken(_ jwt: String) {
		token = jwt
		accountId = jwtSubject(jwt)
		StakStore.accountId = accountId
		persist()
	}

	/// Profile edits after sign-in stay with the session.
	func saveProfile() { persist() }

	/// Home's first run is over (the pill or any tab hop, 1:958 -> 1:1097): the user is a returning user from here on.
	func completeFirstRun() {
		guard firstRunPending else { return }
		firstRunPending = false
		persist()
	}

	/// Delete account (FigJam Profile board, 2026-09-14: App settings -> Delete / log
	/// out): everything this account kept on the phone - saves, paper ledger, deck
	/// progress, inbox, live-account state - is wiped, then the session ends. The
	/// demo persona's authored history reseeds on its next sign-in. Mirrors Android.
	func deleteAccount() {
		StakStore.clearAccount(demo: demoAccount)
		signOut()
	}

	/// Log out: forget the session and the profile; next launch asks to sign in.
	func signOut() {
		// The push token is forgotten under the leaving account's keys - after the switch below it would clear the
		// demo's copy and leave this account's in place.
		PushRegistration.forget()
		accountGeneration += 1
		signedIn = false
		resumedSignedIn = false
		demoAccount = true
		firstRunPending = false
		StakStore.demoAccount = true
		StakStore.accountId = nil
		UserProfile.shared.demoAccount = true
		UserProfile.shared.displayName = ""
		UserProfile.shared.photoData = nil
		UserProfile.shared.clearTaste()
		UserProfile.shared.notificationsOn = true
		UserProfile.shared.accountLock = false
		UserProfile.shared.priceAlerts = true
		UserProfile.shared.dailyDeck = true
		UserProfile.shared.marketNews = false
		UserProfile.shared.priceThreshold = 3
		UserProfile.shared.appearance = "dark"
		UserProfile.shared.linkedGoogle = false
		UserProfile.shared.linkedApple = false
		UserProfile.shared.joined = ""
		UserProfile.shared.email = ""
		token = nil
		accountId = nil
		// No account any more: the holdings stop writing to the server (the next sign-in's applyAccount reloads them).
		MyStakHoldings.shared.reset(demo: true, signedIn: false)
		let d = UserDefaults.standard
		d.removeObject(forKey: Self.keySignedIn)
		d.removeObject(forKey: Self.keyName)
		d.removeObject(forKey: Self.keyRisk)
		d.removeObject(forKey: Self.keyPhoto)
		d.removeObject(forKey: Self.keyDemo)
		d.removeObject(forKey: Self.keyPicks)
		d.removeObject(forKey: Self.keyGoal)
		d.removeObject(forKey: Self.keyRiskAnswer)
		d.removeObject(forKey: Self.keyNotif)
		d.removeObject(forKey: Self.keyLock)
		d.removeObject(forKey: Self.keyPrefs)
		d.removeObject(forKey: Self.keyJoined)
		d.removeObject(forKey: Self.keyFirstRun)
		d.removeObject(forKey: Self.keyJwt)
		d.removeObject(forKey: Self.keyEmail)
		Self.savePhoto(nil)
	}

	private func persist() {
		let d = UserDefaults.standard
		d.set(signedIn, forKey: Self.keySignedIn)
		d.set(demoAccount, forKey: Self.keyDemo)
		d.set(UserProfile.shared.displayName, forKey: Self.keyName)
		d.set(UserProfile.shared.riskStyle, forKey: Self.keyRisk)
		d.set(Array(UserProfile.shared.brandPicks).sorted(), forKey: Self.keyPicks)
		d.set(UserProfile.shared.goal, forKey: Self.keyGoal)
		d.set(UserProfile.shared.risk, forKey: Self.keyRiskAnswer)
		d.set(UserProfile.shared.notificationsOn, forKey: Self.keyNotif)
		d.set(UserProfile.shared.accountLock, forKey: Self.keyLock)
		d.set(UserProfile.shared.joined, forKey: Self.keyJoined)
		d.set(UserProfile.shared.email, forKey: Self.keyEmail)
		d.set(firstRunPending, forKey: Self.keyFirstRun)
		if let jwt = token { d.set(jwt, forKey: Self.keyJwt) } else { d.removeObject(forKey: Self.keyJwt) }
		let p = UserProfile.shared
		d.set(["priceAlerts": p.priceAlerts, "dailyDeck": p.dailyDeck, "marketNews": p.marketNews, "priceThreshold": p.priceThreshold, "appearance": p.appearance, "linkedGoogle": p.linkedGoogle, "linkedApple": p.linkedApple] as [String: Any], forKey: Self.keyPrefs)
		Self.savePhoto(UserProfile.shared.photoData)
	}

	// MARK: - JWT helpers

	/// Decodes the JWT payload and returns the "sub" claim. Mirrors android Session.kt jwtSubject().
	private func jwtSubject(_ jwt: String) -> String? {
		guard let payload = jwt.split(separator: ".").dropFirst().first else { return nil }
		var base64 = String(payload)
			.replacingOccurrences(of: "-", with: "+")
			.replacingOccurrences(of: "_", with: "/")
		let rem = base64.count % 4
		if rem > 0 { base64 += String(repeating: "=", count: 4 - rem) }
		guard let data = Data(base64Encoded: base64),
			  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
			  let sub = json["sub"] as? String, !sub.isEmpty
		else { return nil }
		return sub
	}

	// MARK: - Profile photo file

	/// The (downsampled, tens-of-KB) profile photo lives as a FILE in
	/// Application Support, not as a UserDefaults blob (audit 2026-09-04):
	/// defaults are for small values - a multi-MB blob there is flagged at
	/// 4 MB and re-read on every launch. Mirrors android's URI-backed
	/// UserProfile.photoUri.
	private static let photoFileName = "stak_profile_photo.jpg"

	private static var photoFileURL: URL? {
		guard let dir = try? FileManager.default.url(
			for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
		) else { return nil }
		return dir.appendingPathComponent(photoFileName)
	}

	private static func loadPhoto() -> Data? {
		if let url = photoFileURL, let data = try? Data(contentsOf: url) { return data }
		// A blob an earlier build kept in defaults moves to the file once -
		// shrunk the way the picker now shrinks a pick, since that blob may
		// be a full-size original.
		let d = UserDefaults.standard
		guard let legacy = d.data(forKey: keyPhoto) else { return nil }
		d.removeObject(forKey: keyPhoto)
		let data = UIImage(data: legacy)?
			.preparingThumbnail(of: CGSize(width: 512, height: 512))?
			.jpegData(compressionQuality: 0.85) ?? legacy
		savePhoto(data)
		return data
	}

	private static func savePhoto(_ data: Data?) {
		guard let url = photoFileURL else { return }
		if let data {
			try? data.write(to: url, options: .atomic)
		} else {
			try? FileManager.default.removeItem(at: url)
		}
	}
}
