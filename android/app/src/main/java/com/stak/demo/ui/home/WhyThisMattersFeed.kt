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

	/** Said once the brief has come back without a summary for this account. */
	const val UNAVAILABLE_BODY = "Today's read on your STAK isn't ready yet. Check back soon."

	/**
	 * The current summary — backend personalizedImpact when available. A real account
	 * no longer falls back to a line counted against the authored news articles
	 * ("None of your 4 saved stocks are in today's news"), which described stories
	 * the user never saw; it stays empty while the brief loads and says so if the
	 * brief comes back without one.
	 */
	fun body(): String {
		val brief = com.stak.demo.ui.news.DailyBriefHolder.current
		val impact = brief?.personalizedImpact
		if (!impact.isNullOrBlank()) return impact
		return when {
			com.stak.demo.data.Session.demoAccount -> if (com.stak.demo.data.MyStakHoldings.count == 0) EMPTY_BODY else DEMO_BODY
			com.stak.demo.data.MyStakHoldings.count == 0 -> EMPTY_BODY
			brief == null -> ""
			else -> UNAVAILABLE_BODY
		}
	}
}
