package com.stak.demo.ui.home

/**
 * Market Mood news deck data source (CHINEDU 1:1162).
 *
 * CONTRACT (user, 2026-08-22): the deck is proxied to REAL-TIME news -
 * "news don't stay the same, it changes everyday". The STAK BACKEND
 * propagates the day's breaking stories, the kind that makes a user
 * want to open them, and the app renders whatever is served into the
 * authored deck slots (poses, colors and typography stay authored).
 *
 * Delivery timing is per user: the backend schedules the day's deck
 * (and the mood refresh) for the user's LOCAL morning using the
 * timezone ID the app sends with the session (UserProfile.timeZoneId).
 *
 * LIVE stays false this phase so the deck always matches the frame;
 * the demo stories below are the authored copy.
 */
object NewsDeckFeed {
	/** Production switch - keep false while reviews compare build vs frame. */
	const val LIVE = false

	data class Story(val title: String, val body: String)

	// exact-design audit 2026-09-04 (1:1166 / 1:1170): the frame's " ...." and
	// "...." truncation marks are typos - normalised to the three-dot ellipsis
	// the third card (1:1174) already uses; the story copy itself is verbatim.
	val DEMO_STORIES = listOf(
		Story(
			"Wall Street's fear gauge reads 32",
			"The Fear & Greed Index is firmly in Fear territory. Money is rotating out of the...",
		),
		Story(
			"Fed meeting notes drop Wednesday",
			"Minutes from the last Fed meeting land July 8. A market this tense moves on every word...",
		),
		Story(
			"The OpenAI IPO is reportedly delayed",
			"The year's most anticipated listing just slipped. Markets riding a wave of IPO excitement...",
		),
	)

	/** The authored deck has exactly this many slots (HomeScreen.NewsDeck). */
	const val DECK_SIZE = 3

	/**
	 * The current stories - the served breaking news once the backend
	 * exists. Always exactly [DECK_SIZE] long.
	 */
	fun stories(): List<Story> = padToDeck(DEMO_STORIES)

	/**
	 * GUARD (audit 2026-09-04): the Home deck indexes three fixed, authored
	 * slots, so a served feed shorter than the deck is padded with the
	 * authored stories and a longer one trimmed - a short or empty backend
	 * response can never index past the end. Route every live feed through
	 * this before it reaches the deck.
	 */
	fun padToDeck(served: List<Story>): List<Story> = (served + DEMO_STORIES).take(DECK_SIZE)
}
