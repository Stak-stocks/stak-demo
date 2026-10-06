import Foundation

/// TODAY'S BRIEF card content (CHINEDU 1:1228). Mirrors android ui/news/NewsBriefFeed.kt: a real account's card is
/// built from the daily brief and the live news (NewsView); these authored briefs are the demo account's.
enum NewsBriefFeed {
	/// `url`: a news story's link - tapping its card opens the story; the brief's own cards (no link) open the brief.
	struct Brief {
		let title: String
		let body: String
		let source: String
		var url: String? = nil
	}

	static let demoBriefs = [
		// Authored page-1 copy (1:1264/1:1265), "all time high" hyphenated -
		// exact-design audit 2026-09-04.
		Brief(
			title: "Dow closes at a record as chips slide",
			body: "Wall Street split into the long weekend. The Dow hit an all-time high while a memory chip rout pulled the Nasdaq down, and a soft jobs report eased the pressure on the...",
			source: "Bloomberg · 10h"
		),
		// STRICT stock news (user, 2026-08-25): the old Fed-rates demo
		// brief was macro, not stock news - replaced with a stock story.
		Brief(
			title: "Alphabet jumps after a blowout ad quarter",
			body: "Search revenue accelerated for a third straight quarter and YouTube beat expectations, quieting the fear that AI chatbots are eating into Google's ads...",
			source: "Reuters · 6h"
		),
		Brief(
			title: "Oil slips as OPEC+ weighs a supply boost",
			body: "Crude fell for a third session after reports the group may lift output next quarter. Energy shares lagged while airlines and shippers caught a bid on cheaper fuel...",
			source: "CNBC · 4h"
		),
		Brief(
			title: "Tech earnings week: what to watch",
			body: "Five of the largest names report in four days. Traders are focused on AI spending guidance, cloud growth and whether buybacks keep pace with record cash piles...",
			source: "Bloomberg · 2h"
		),
	]

	/// The current briefs - the served set once the backend exists.
	static func briefs() -> [Brief] { demoBriefs }
}
