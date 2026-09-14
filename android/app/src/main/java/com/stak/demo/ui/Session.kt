package com.stak.demo.ui

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Persisted sign-in state (user, 2026-08-23): a user who already signed
 * in is not asked to sign in again - the splash goes straight to Home;
 * a first-time user is taken to create an account. Backed by
 * SharedPreferences until the real auth backend lands (then this is
 * the seam that holds the token + the profile it returns).
 */
object Session {
	private const val PREFS = "stak_session"
	private const val KEY_SIGNED_IN = "signed_in"
	private const val KEY_NAME = "display_name"
	private const val KEY_PHOTO = "photo_uri"
	private const val KEY_RISK = "risk_style"
	private const val KEY_DEMO = "demo_account"
	private const val KEY_PICKS = "brand_picks"
	private const val KEY_GOAL = "goal_answer"
	private const val KEY_RISK_ANSWER = "risk_answer"
	private const val KEY_NOTIF = "notifications_on"
	private const val KEY_LOCK = "account_lock"
	private const val KEY_PRICE_ALERTS = "pref_price_alerts"
	private const val KEY_DAILY_DECK = "pref_daily_deck"
	private const val KEY_MARKET_NEWS = "pref_market_news"
	private const val KEY_PRICE_THRESHOLD = "pref_price_threshold"
	private const val KEY_APPEARANCE = "pref_appearance"
	private const val KEY_LINKED_GOOGLE = "linked_google"
	private const val KEY_LINKED_APPLE = "linked_apple"
	private const val KEY_JOINED = "joined"
	private const val KEY_FIRST_RUN = "first_run_pending"

	private var prefs: SharedPreferences? = null

	var signedIn by mutableStateOf(false)
		private set

	/** True when this launch started already signed in - the returning-user path. */
	var resumedSignedIn = false
		private set

	/**
	 * Which account this is (product audit, 2026-09-05). Sign in = the DEMO
	 * account with the authored history (19 saved stocks, $10,240, #47);
	 * Create account = a NEW account that starts empty and earns its numbers.
	 * Persisted with the sign-in so a relaunch restores the same account.
	 */
	var demoAccount by mutableStateOf(true)
		private set

	/**
	 * True for a FIRST-TIME user: the account was created here (Create account ->
	 * onboarding) and Home's first run (1:958) has not been completed yet. An
	 * active/returning user - Sign in (the demo persona) or any relaunch after the
	 * first run - lands on Home Main (user, 2026-09-07: "there should be a first
	 * time user and active/returning user"). Persisted, so a relaunch in the middle
	 * of the first run keeps it.
	 */
	var firstRunPending by mutableStateOf(false)
		private set

	/** Load once per process; restores the profile the user set before. */
	fun init(context: Context) {
		if (prefs != null) return
		val p = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
		prefs = p
		StakStore.init(context)
		signedIn = p.getBoolean(KEY_SIGNED_IN, false)
		resumedSignedIn = signedIn
		demoAccount = p.getBoolean(KEY_DEMO, true)
		firstRunPending = p.getBoolean(KEY_FIRST_RUN, false)
		UserProfile.displayName = p.getString(KEY_NAME, "") ?: ""
		UserProfile.photoUri = p.getString(KEY_PHOTO, null)
		UserProfile.riskStyle = p.getString(KEY_RISK, UserProfile.riskStyle) ?: UserProfile.riskStyle
		UserProfile.brandPicks = p.getString(KEY_PICKS, "")?.split(",")?.filter { it.isNotBlank() }?.toSet() ?: emptySet()
		UserProfile.goal = p.getInt(KEY_GOAL, -1)
		UserProfile.risk = p.getInt(KEY_RISK_ANSWER, -1)
		UserProfile.notificationsOn = p.getBoolean(KEY_NOTIF, true)
		UserProfile.accountLock = p.getBoolean(KEY_LOCK, false)
		UserProfile.priceAlerts = p.getBoolean(KEY_PRICE_ALERTS, true)
		UserProfile.dailyDeck = p.getBoolean(KEY_DAILY_DECK, true)
		UserProfile.marketNews = p.getBoolean(KEY_MARKET_NEWS, false)
		UserProfile.priceThreshold = p.getInt(KEY_PRICE_THRESHOLD, 3)
		// Only Dark and Match system exist (the Light build of 2026-09-08 was withdrawn): a
		// value that build stored reads as Dark, so the Appearance page always shows a choice.
		UserProfile.appearance = p.getString(KEY_APPEARANCE, "dark").let { if (it == "system") "system" else "dark" }
		UserProfile.linkedGoogle = p.getBoolean(KEY_LINKED_GOOGLE, false)
		UserProfile.linkedApple = p.getBoolean(KEY_LINKED_APPLE, false)
		UserProfile.joined = p.getString(KEY_JOINED, "July 2026") ?: "July 2026"
		applyAccount()
	}

	/** Sign-in CTA or account creation (09 Proceed) - remembered across launches. */
	/** `demo` = the authored demo account (Sign in); false = a fresh account (Create account). */
	fun signIn(demo: Boolean) {
		signedIn = true
		demoAccount = demo
		// Only a brand-new account is a first-time user; Sign in is an active user.
		firstRunPending = !demo
		if (demo) {
			// The persona's own profile: an onboarding started and abandoned before
			// "Already have an account? Sign in" must not leak its brand picks or
			// risk answer into the active user's account (audit 2026-09-07).
			UserProfile.riskStyle = "Growth-Oriented"
			UserProfile.brandPicks = emptySet()
			UserProfile.goal = -1
			UserProfile.risk = -1
		}
		// The demo persona joined in July; a new account joins now (product audit, 2026-09-05).
		UserProfile.joined = if (demo) "July 2026" else StakClock.monthYear()
		persist()
		// A brand-new account starts from nothing; the demo account keeps
		// whatever it did last time it was signed in.
		if (!demo) {
			StakStore.clearAccount(demo = false)
			// The day the account was created: the inbox ages its welcome from it.
			StakStore.putString("created_day", java.time.LocalDate.now().toEpochDay().toString())
		}
		applyAccount()
	}

	/** Seeds (demo) or clears (new account) every user-data singleton for the current account. */
	fun applyAccount() {
		MyStakHoldings.reset(demo = demoAccount)
		com.stak.demo.ui.simulate.PaperPortfolio.reset(demo = demoAccount)
		com.stak.demo.ui.discover.DeckSession.load()
		StakNotifications.load()
		com.stak.demo.ui.news.NewsSaves.load()
	}

	/** Profile edits after sign-in (name/photo) stay with the session. */
	fun saveProfile() = persist()

	/** Home's first run is over (the pill or any tab hop, 1:958 -> 1:1097): the user is a returning user from here on. */
	fun completeFirstRun() {
		if (!firstRunPending) return
		firstRunPending = false
		persist()
	}

	/**
	 * Delete account (FigJam Profile board, 2026-09-14: App settings -> Delete / log
	 * out): everything this account kept on the phone - saves, paper ledger, deck
	 * progress, inbox, live-account state - is wiped, then the session ends. The
	 * demo persona's authored history reseeds on its next sign-in.
	 */
	fun deleteAccount() {
		StakStore.clearAccount(demo = demoAccount)
		signOut()
	}

	/** Log out: forget the session and the profile; next launch asks to sign in. */
	fun signOut() {
		signedIn = false
		resumedSignedIn = false
		demoAccount = true
		firstRunPending = false
		UserProfile.displayName = ""
		UserProfile.photoUri = null
		UserProfile.riskStyle = "Growth-Oriented"
		UserProfile.brandPicks = emptySet()
		UserProfile.goal = -1
		UserProfile.risk = -1
		UserProfile.notificationsOn = true
		UserProfile.accountLock = false
		UserProfile.priceAlerts = true
		UserProfile.dailyDeck = true
		UserProfile.marketNews = false
		UserProfile.priceThreshold = 3
		UserProfile.appearance = "dark"
		UserProfile.linkedGoogle = false
		UserProfile.linkedApple = false
		UserProfile.joined = "July 2026"
		prefs?.edit()?.clear()?.apply()
		applyAccount()
	}

	private fun persist() {
		prefs?.edit()
			?.putBoolean(KEY_SIGNED_IN, signedIn)
			?.putBoolean(KEY_DEMO, demoAccount)
			?.putString(KEY_NAME, UserProfile.displayName)
			?.putString(KEY_PHOTO, UserProfile.photoUri)
			?.putString(KEY_RISK, UserProfile.riskStyle)
			?.putString(KEY_PICKS, UserProfile.brandPicks.joinToString(","))
			?.putInt(KEY_GOAL, UserProfile.goal)
			?.putInt(KEY_RISK_ANSWER, UserProfile.risk)
			?.putBoolean(KEY_NOTIF, UserProfile.notificationsOn)
			?.putBoolean(KEY_LOCK, UserProfile.accountLock)
			?.putBoolean(KEY_PRICE_ALERTS, UserProfile.priceAlerts)
			?.putBoolean(KEY_DAILY_DECK, UserProfile.dailyDeck)
			?.putBoolean(KEY_MARKET_NEWS, UserProfile.marketNews)
			?.putInt(KEY_PRICE_THRESHOLD, UserProfile.priceThreshold)
			?.putString(KEY_APPEARANCE, UserProfile.appearance)
			?.putBoolean(KEY_LINKED_GOOGLE, UserProfile.linkedGoogle)
			?.putBoolean(KEY_LINKED_APPLE, UserProfile.linkedApple)
			?.putString(KEY_JOINED, UserProfile.joined)
			?.putBoolean(KEY_FIRST_RUN, firstRunPending)
			?.apply()
	}
}
