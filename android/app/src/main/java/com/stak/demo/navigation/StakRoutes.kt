package com.stak.demo.navigation

/** Route names for the whole app. Onboarding runs once, then the tabs. */
object StakRoutes {
	const val SPLASH = "splash"

	/** 01 Welcome — `via` picks the prototype push direction (forward/back). */
	const val INTRO = "onboarding/intro?via={via}"
	fun intro(via: String) = "onboarding/intro?via=$via"
	const val BRAND_PICKS = "onboarding/brand-picks"
	const val SWIPE_TUTORIAL = "onboarding/swipe-tutorial"
	const val GOAL = "onboarding/goal"
	const val RISK = "onboarding/risk"
	const val PREPARING_DECK = "onboarding/preparing-deck"
	const val TASTE_REVEAL = "onboarding/taste-reveal"
	const val SIGN_IN = "auth/sign-in"
	/** Sign up — `via` = "back" when sign-in's post-logout back circle re-opens it (B21). */
	const val CREATE_ACCOUNT = "onboarding/create-account?via={via}"
	fun createAccount(via: String) = "onboarding/create-account?via=$via"
	const val PERMISSIONS = "onboarding/permissions"
	const val PROFILE_SETUP = "onboarding/profile-setup"
	const val MAIN = "main" // bottom-tab shell (Home/News/Discover/My STAK/Simulate)
	const val NEWS_DETAIL = "news/detail/{articleId}"
	fun newsDetail(articleId: String) = "news/detail/$articleId"
	/** Live article detail (For You) — article is passed via LiveNewsHolder, no nav arg needed. */
	const val NEWS_LIVE_DETAIL = "news/live-detail"
	/** Full daily brief detail — brief is passed via DailyBriefHolder, no nav arg needed. */
	const val NEWS_DAILY_BRIEF_DETAIL = "news/daily-brief-detail"
	/** My STAK collection page - `id` is the tapped chip's catalogue id (Codex parity audit, 2026-09-04). */
	const val COLLECTION = "mystak/collection/{id}"
	fun collection(id: String) = "mystak/collection/$id"
	/** The saved-flavour Stock Detail - `symbol` is the tapped collection tile's ticker. */
	const val MYSTAK_STOCK = "mystak/stock/{symbol}"
	fun myStakStock(symbol: String) = "mystak/stock/$symbol"
	const val PROFILE = "profile"
	/** The Home bell's inbox (product audit, 2026-09-05). */
	const val NOTIFICATIONS = "notifications"
	/** The Profile hub's settings pages - `kind` is a SettingsKind. */
	const val SETTINGS = "settings/{kind}"
	fun settings(kind: String) = "settings/$kind"
	/** Sign in's "Forgot password?" */
	const val FORGOT_PASSWORD = "auth/forgot-password"
	const val SIM_PORTFOLIO = "simulate/portfolio"
	/** Pick detail - `symbol` is the tapped pick's ticker; NVDA is the authored frame (1:4631). Codex parity audit (2026-09-04). */
	const val SIM_PICK = "simulate/pick/{symbol}"
	fun simPick(symbol: String) = "simulate/pick/$symbol"
	const val LEADERBOARD = "simulate/leaderboard"

	const val STOCK_DETAIL = "stock/{symbol}"
	fun stockDetail(symbol: String) = "stock/$symbol"
	const val TRADE_TICKET = "trade/{symbol}"
	fun tradeTicket(symbol: String) = "trade/$symbol"
	const val ORDER_CONFIRMATION = "order-confirmation/{symbol}"
	fun orderConfirmation(symbol: String) = "order-confirmation/$symbol"
	const val ADD_CASH = "add-cash"
	const val SEARCH = "search"
}
