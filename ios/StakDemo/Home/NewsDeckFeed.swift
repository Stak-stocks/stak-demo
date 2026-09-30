import Foundation

/// Market Mood news deck data source (CHINEDU 1:1162). Mirrors android
/// ui/home/NewsDeckFeed.kt.
///
/// CONTRACT (user, 2026-08-22): the deck is proxied to REAL-TIME news -
/// "news don't stay the same, it changes everyday". The STAK BACKEND
/// propagates the day's breaking stories, the kind that makes a user
/// want to open them, and the app renders whatever is served into the
/// authored deck slots (poses, colors and typography stay authored).
///
/// Delivery timing is per user: the backend schedules the day's deck
/// (and the mood refresh) for the user's LOCAL morning using the
/// timezone ID the app sends with the session (UserProfile.timeZoneId).
///
/// `live` stays false this phase so the deck always matches the frame;
/// the demo stories below are the authored copy.
enum NewsDeckFeed {
	/// Production switch - keep false while reviews compare build vs frame.
	static let live = false

	struct Story {
		let title: String
		let body: String
	}

	// exact-design audit 2026-09-04 (1:1166 / 1:1170): the frame's " ...." and
	// "...." truncation marks are typos - normalised to the three-dot ellipsis
	// the third card (1:1174) already uses; the story copy itself is verbatim.
	static let demoStories = [
		Story(
			title: "Wall Street's fear gauge reads 32",
			body: "The Fear & Greed Index is firmly in Fear territory. Money is rotating out of the..."
		),
		Story(
			title: "Fed meeting notes drop Wednesday",
			body: "Minutes from the last Fed meeting land July 8. A market this tense moves on every word..."
		),
		Story(
			title: "The OpenAI IPO is reportedly delayed",
			body: "The year's most anticipated listing just slipped. Markets riding a wave of IPO excitement..."
		),
	]

	/// The authored deck has exactly this many slots (HomeView's deckCards).
	static let deckSize = 3

	/// The current stories - the served breaking news once the backend
	/// exists. Always exactly `deckSize` long.
	static func stories() -> [Story] { padToDeck(demoStories) }

	/// GUARD (audit 2026-09-04): the Home deck indexes three fixed, authored
	/// slots, so a served feed shorter than the deck is padded with the
	/// authored stories and a longer one trimmed - a short or empty backend
	/// response can never index past the end. Route every live feed through
	/// this before it reaches the deck. Mirrors android NewsDeckFeed.padToDeck.
	static func padToDeck(_ served: [Story]) -> [Story] {
		Array((served + demoStories).prefix(deckSize))
	}
}
