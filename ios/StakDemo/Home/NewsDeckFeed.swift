import Foundation

/// Market Mood news deck data source (CHINEDU 1:1162): the day's live market news (NewsViewModel.marketArticles)
/// in the authored deck slots - poses, colours and type stay authored. Mirrors android ui/home/NewsDeckFeed.kt.
///
/// Only the demo account falls back to the authored stories. A real account was shown them until the news arrived,
/// and a short live list was topped up with them - invented headlines beside real ones. It now gets loading cards, or
/// a line saying the news didn't load.
enum NewsDeckFeed {
	/// `loading` draws the placeholder bars instead of text.
	struct Story: Equatable {
		let title: String
		let body: String
		var loading = false
	}

	// exact-design audit 2026-09-04 (1:1166 / 1:1170): the frame's " ...." and "...." truncation marks are typos -
	// normalised to the three-dot ellipsis the third card (1:1174) already uses; the story copy itself is verbatim.
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

	/// The authored deck has exactly this many slots.
	static let deckSize = 3

	private static let loadingStory = Story(title: "", body: "", loading: true)
	private static let emptyStory = Story(title: "", body: "")

	/// The deck's stories, always exactly `deckSize` long. `settled`: the news request has finished.
	static func stories(news: [NewsArticleDto], failed: Bool, settled: Bool, demo: Bool) -> [Story] {
		if !news.isEmpty {
			let mapped = news.prefix(deckSize).map { article -> Story in
				let title = article.headline.count > 65 ? trimEnd(article.headline.prefix(65)) + "\u{2026}" : article.headline
				// A summary that only restates the headline isn't a body.
				let body = NewsText.summaryBeyondHeadline(article.headline, article.summary).map {
					$0.count > 110 ? trimEnd($0.prefix(110)) + "\u{2026}" : $0
				} ?? ""
				return Story(title: title, body: body)
			}
			return padToDeck(Array(mapped), demo: demo)
		}
		if demo { return padToDeck(demoStories, demo: demo) }
		// Failed (or came back empty): the front card says so and the ones behind it stay plain.
		if failed || settled {
			return padToDeck([Story(title: "Market news isn't loading", body: "Open News to try again.")], demo: demo)
		}
		return Array(repeating: loadingStory, count: deckSize)
	}

	/// Kotlin's trimEnd(): trailing whitespace only.
	private static func trimEnd(_ text: Substring) -> String {
		String(text.reversed().drop(while: \.isWhitespace).reversed())
	}

	/// GUARD (audit 2026-09-04): the deck indexes three fixed slots, so a short feed is padded (the demo's own
	/// stories for the demo, plain cards otherwise) and a long one trimmed - it can never index past the end.
	static func padToDeck(_ served: [Story], demo: Bool) -> [Story] {
		let filler = demo ? demoStories : Array(repeating: emptyStory, count: deckSize)
		return Array((served + filler).prefix(deckSize))
	}
}
