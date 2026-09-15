package com.stak.demo.data

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
	private const val UI_PREFS = "stak_ui"
	private const val KEY_HOME_MAIN_DATE = "home_main_date"
	private const val KEY_SIGNED_IN = "signed_in"
	private const val KEY_NAME = "display_name"
	private const val KEY_PHOTO = "photo_uri"
	private const val KEY_RISK = "risk_style"
	private const val KEY_DEMO = "demo_account"
	private const val KEY_PICKS = "brand_picks"
	private const val KEY_GOAL = "goal_answer"
	private const val KEY_RISK_ANSWER = "risk_answer"
	private const val KEY_JWT = "jwt_token"
	private const val KEY_NOTIF = "notifications_on"
	private const val KEY_PRICE_ALERTS = "pref_price_alerts"
	private const val KEY_DAILY_DECK = "pref_daily_deck"
	private const val KEY_MARKET_NEWS = "pref_market_news"
	private const val KEY_APPEARANCE = "pref_appearance"
	private const val KEY_LINKED_GOOGLE = "linked_google"
	private const val KEY_LINKED_APPLE = "linked_apple"
	private const val KEY_JOINED = "joined"

	private var prefs: SharedPreferences? = null
	private var appContext: Context? = null

	var signedIn by mutableStateOf(false)
		private set

	/** Supabase JWT access token — stored for authenticated API calls. Null until first real sign-in. */
	var token: String? = null
		private set

	/** True when this launch started already signed in - the returning-user path. */
	var resumedSignedIn = false
		private set

	/** True if the Home First-Run overlay was already dismissed today (date stored in stak_ui
	 *  prefs, survives sign-out so sign-in/out within the same day skips the overlay). */
	var homeMainSeenToday = false
		private set

	/**
	 * Which account this is (product audit, 2026-09-05). Sign in = the DEMO
	 * account with the authored history (19 saved stocks, $10,240, #47);
	 * Create account = a NEW account that starts empty and earns its numbers.
	 * Persisted with the sign-in so a relaunch restores the same account.
	 */
	var demoAccount by mutableStateOf(true)
		private set

	/** Load once per process; restores the profile the user set before. */
	fun init(context: Context) {
		if (prefs != null) return
		val p = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
		prefs = p
		appContext = context.applicationContext
		StakStore.init(context)
		signedIn = p.getBoolean(KEY_SIGNED_IN, false)
		resumedSignedIn = signedIn
		demoAccount = p.getBoolean(KEY_DEMO, true)
		UserProfile.displayName = p.getString(KEY_NAME, "") ?: ""
		UserProfile.photoUri = p.getString(KEY_PHOTO, null)
		UserProfile.riskStyle = p.getString(KEY_RISK, UserProfile.riskStyle) ?: UserProfile.riskStyle
		UserProfile.brandPicks = p.getString(KEY_PICKS, "")?.split(",")?.filter { it.isNotBlank() }?.toSet() ?: emptySet()
		UserProfile.goal = p.getInt(KEY_GOAL, -1)
		UserProfile.risk = p.getInt(KEY_RISK_ANSWER, -1)
		UserProfile.notificationsOn = p.getBoolean(KEY_NOTIF, true)
		UserProfile.priceAlerts = p.getBoolean(KEY_PRICE_ALERTS, true)
		UserProfile.dailyDeck = p.getBoolean(KEY_DAILY_DECK, true)
		UserProfile.marketNews = p.getBoolean(KEY_MARKET_NEWS, false)
		UserProfile.appearance = p.getString(KEY_APPEARANCE, "dark") ?: "dark"
		UserProfile.linkedGoogle = p.getBoolean(KEY_LINKED_GOOGLE, false)
		UserProfile.linkedApple = p.getBoolean(KEY_LINKED_APPLE, false)
		UserProfile.joined = p.getString(KEY_JOINED, "July 2026") ?: "July 2026"
		token = p.getString(KEY_JWT, null)
		val today = java.time.LocalDate.now().toString()
		homeMainSeenToday = context.applicationContext
			.getSharedPreferences(UI_PREFS, Context.MODE_PRIVATE)
			.getString(KEY_HOME_MAIN_DATE, null) == today
		applyAccount()
	}

	/** Sign-in CTA or account creation (09 Proceed) - remembered across launches. */
	/** `demo` = the authored demo account (Sign in); false = a fresh account (Create account). */
	fun signIn(demo: Boolean) {
		signedIn = true
		demoAccount = demo
		if (demo) {
			UserProfile.joined = "July 2026"
		} else if (UserProfile.joined.isBlank()) {
			// Brand-new account (backend date not yet available); use current month.
			// Returning users have joined already set from MeResponse.createdAt in AuthViewModel.
			UserProfile.joined = StakClock.monthYear()
		}
		persist()
		// A brand-new account starts from nothing; the demo account keeps
		// whatever it did last time it was signed in.
		if (!demo) StakStore.clearAccount(demo = false)
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

	/** Stores the Supabase JWT for authenticated API calls. */
	fun setToken(jwt: String) {
		token = jwt
		persist()
	}

	/** Profile edits after sign-in (name/photo) stay with the session. */
	fun saveProfile() = persist()

	/** Called when the user dismisses the Home First-Run overlay. Records today's date so
	 *  further sign-ins on the same day skip the overlay; it reappears the next day. */
	fun markHomeMainSeen() {
		homeMainSeenToday = true
		val today = java.time.LocalDate.now().toString()
		appContext?.getSharedPreferences(UI_PREFS, Context.MODE_PRIVATE)
			?.edit()?.putString(KEY_HOME_MAIN_DATE, today)?.apply()
	}

	/** Log out: forget the session and the profile; next launch asks to sign in. */
	fun signOut() {
		signedIn = false
		resumedSignedIn = false
		demoAccount = true
		UserProfile.displayName = ""
		UserProfile.photoUri = null
		UserProfile.riskStyle = "Growth-Oriented"
		UserProfile.brandPicks = emptySet()
		UserProfile.goal = -1
		UserProfile.risk = -1
		UserProfile.notificationsOn = true
		UserProfile.priceAlerts = true
		UserProfile.dailyDeck = true
		UserProfile.marketNews = false
		UserProfile.appearance = "dark"
		UserProfile.linkedGoogle = false
		UserProfile.linkedApple = false
		UserProfile.joined = "July 2026"
		token = null
		prefs?.edit()?.clear()?.apply()
		// Clear the Supabase SDK's persisted session so it cannot auto-refresh
		// a stale token after logout. Server-side revocation happens separately
		// via AuthViewModel.signOut() which is best-effort (fire-and-forget).
		appContext?.getSharedPreferences("supabase_auth", Context.MODE_PRIVATE)
			?.edit()?.clear()?.apply()
		// Clear singleton data caches so the next user never sees a previous user's content
		com.stak.demo.ui.news.DailyBriefHolder.current = null
		com.stak.demo.ui.news.DailyBriefHolder.news = emptyList()
		// Do NOT call applyAccount() here — that would reload the demo persona ("Hamza")
		// and flash it on ProfileScreen before navigation completes. Demo state loads
		// on the next signIn() call instead.
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
			?.putBoolean(KEY_PRICE_ALERTS, UserProfile.priceAlerts)
			?.putBoolean(KEY_DAILY_DECK, UserProfile.dailyDeck)
			?.putBoolean(KEY_MARKET_NEWS, UserProfile.marketNews)
			?.putString(KEY_APPEARANCE, UserProfile.appearance)
			?.putBoolean(KEY_LINKED_GOOGLE, UserProfile.linkedGoogle)
			?.putBoolean(KEY_LINKED_APPLE, UserProfile.linkedApple)
			?.putString(KEY_JOINED, UserProfile.joined)
			?.putString(KEY_JWT, token)
			?.apply()
	}
}
