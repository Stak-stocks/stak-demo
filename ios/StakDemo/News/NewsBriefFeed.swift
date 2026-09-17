import Foundation

/// TODAY'S BRIEF carousel data source (CHINEDU 1:1228). Mirrors android
/// ui/news/NewsBriefFeed.kt.
///
/// Same contract as the Home deck (user, 2026-08-22): the briefs are
/// proxied to REAL-TIME news - the STAK BACKEND serves the day's briefs
/// and the app pages through whatever is served (the authored teal card
/// is the slot). The user swipes left and right between them; the dots
/// track the page.
///
/// `live` stays false this phase. Page 1 is the authored copy so the rest
/// state matches the frame; pages 2-4 are demo placeholders standing in
/// for served briefs.
enum NewsBriefFeed {
	/// Production switch - keep false while reviews compare build vs frame.
	static let live = false

	struct Brief: Identifiable {
		let id: Int
		let title: String
		let body: String
		let source: String
	}

	static let demoBriefs = [
		// Authored page-1 copy (1:1264/1:1265), "all time high" hyphenated -
		// exact-design audit 2026-09-04.
		Brief(
			id: 0,
			title: "Dow closes at a record as chips slide",
			body: "Wall Street split into the long weekend. The Dow hit an all-time high while a memory chip rout pulled the Nasdaq down, and a soft jobs report eased the pressure on the...",
			source: "Bloomberg · 10h"
		),
		// STRICT stock news (user, 2026-08-25): the old Fed-rates demo
		// brief was macro, not stock news - replaced with a stock story.
		Brief(
			id: 1,
			title: "Alphabet jumps after a blowout ad quarter",
			body: "Search revenue accelerated for a third straight quarter and YouTube beat expectations, quieting the fear that AI chatbots are eating into Google's ads...",
			source: "Reuters · 6h"
		),
		Brief(
			id: 2,
			title: "Oil slips as OPEC+ weighs a supply boost",
			body: "Crude fell for a third session after reports the group may lift output next quarter. Energy shares lagged while airlines and shippers caught a bid on cheaper fuel...",
			source: "CNBC · 4h"
		),
		Brief(
			id: 3,
			title: "Tech earnings week: what to watch",
			body: "Five of the largest names report in four days. Traders are focused on AI spending guidance, cloud growth and whether buybacks keep pace with record cash piles...",
			source: "Bloomberg · 2h"
		),
	]

	/// The current briefs - the served set once the backend exists.
	static func briefs() -> [Brief] { demoBriefs }
}
