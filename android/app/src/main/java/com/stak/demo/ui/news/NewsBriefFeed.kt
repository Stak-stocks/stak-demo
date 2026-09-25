package com.stak.demo.ui.news

/**
 * TODAY'S BRIEF carousel data source (CHINEDU 1:1228).
 *
 * Same contract as the Home deck (user, 2026-08-22): the briefs are
 * proxied to REAL-TIME news - the STAK BACKEND serves the day's briefs
 * and the app pages through whatever is served (the authored teal card
 * is the slot). The user swipes left and right between them; the dots
 * track the page.
 *
 * LIVE stays false this phase. Page 1 is the authored copy so the rest
 * state matches the frame; pages 2-4 are demo placeholders standing in
 * for served briefs.
 */
object NewsBriefFeed {
	/** Production switch - keep false while reviews compare build vs frame. */
	const val LIVE = false

	data class Brief(val title: String, val body: String, val source: String)

	val DEMO_BRIEFS = listOf(
		// Authored page-1 copy (1:1264/1:1265), "all time high" hyphenated -
		// exact-design audit 2026-09-04.
		Brief(
			"Dow closes at a record as chips slide",
			"Wall Street split into the long weekend. The Dow hit an all-time high while a memory chip rout pulled the Nasdaq down, and a soft jobs report eased the pressure on the...",
			"Bloomberg · 10h",
		),
		// STRICT stock news (user, 2026-08-25): the old Fed-rates demo
		// brief was macro, not stock news - replaced with a stock story.
		Brief(
			"Alphabet jumps after a blowout ad quarter",
			"Search revenue accelerated for a third straight quarter and YouTube beat expectations, quieting the fear that AI chatbots are eating into Google's ads...",
			"Reuters · 6h",
		),
		Brief(
			"Oil slips as OPEC+ weighs a supply boost",
			"Crude fell for a third session after reports the group may lift output next quarter. Energy shares lagged while airlines and shippers caught a bid on cheaper fuel...",
			"CNBC · 4h",
		),
		Brief(
			"Tech earnings week: what to watch",
			"Five of the largest names report in four days. Traders are focused on AI spending guidance, cloud growth and whether buybacks keep pace with record cash piles...",
			"Bloomberg · 2h",
		),
	)

	/** The current briefs - the served set once the backend exists. */
	fun briefs(): List<Brief> = DEMO_BRIEFS
}
