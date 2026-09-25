package com.stak.demo.ui.home

/**
 * "Why this matters to you" data source (CHINEDU 1:1176).
 *
 * CONTRACT (user, 2026-08-23): the card is a SUMMARY of why the day's
 * market news matters to THIS user - computed by the STAK BACKEND from
 * (a) the current market news, (b) the stocks the user holds
 * (MyStakHoldings - the same holdings that gate the "In your STAK"
 * chip), and (c) the user's risk profile (UserProfile.riskStyle, from
 * the onboarding answers). The app renders the served summary in the
 * authored card; the title stays authored.
 *
 * LIVE stays false this phase; the demo body is the authored copy so
 * the rest state matches the frame.
 */
object WhyThisMattersFeed {
	/** Production switch - keep false while reviews compare build vs frame. */
	const val LIVE = false

	// user, 2026-09-04: grammar fixed, frame typo not copied.
	const val DEMO_BODY = "Your STAK collections house 80% of stocks from affected industries."

	/** A new account with nothing saved yet (product audit, 2026-09-05). */
	const val EMPTY_BODY = "Save a few stocks and STAK will show how today's news hits them."

	/** The current summary - the served personalized copy once the backend exists. */
	fun body(): String = when {
		com.stak.demo.ui.MyStakHoldings.count == 0 -> EMPTY_BODY
		com.stak.demo.ui.Session.demoAccount -> DEMO_BODY
		// A new account's saves against today's stories (product audit, 2026-09-05).
		else -> com.stak.demo.ui.StakInsights.whyThisMattersBody(com.stak.demo.ui.news.NewsArticleFeed.relatedTickers())
	}
}
