import SwiftUI

/// Palette of the CHINEDU "03 · News" frames — mirrors android/ NewsScreen.kt.
enum News {
	static let moodBg = Color(argb: 0xFF171D2C)
	static let cardBg = Color(argb: 0xFF181F30)
	static let teal = Color(argb: 0xFF69B3CA)
	static let ink = Color(argb: 0xFF0E162B)
	static let muted = Color(argb: 0xFF819ABB)
	static let faint = Color(argb: 0xFF5C6B85)
	static let chipBg = Color(argb: 0xFF242B3D)
	static let headerGray = Color(argb: 0xFFD3D3D3)
	static let body = Color(argb: 0xFFC8D2E0)
	static let green = Color(argb: 0xFF2FD08A)
	static let divider = Color(argb: 0xFF2A3346)
}

/// 03 · News — "News listing tab" (CHINEDU 1:1228), a port of android ui/news/NewsScreen.kt. The header scrolls with
/// the content: "News", today's date, STAK AI and the search glass. Then the compact Market Mood row, TODAY'S BRIEF
/// (the AI brief, or the top story), For You (news on saved stocks) and Markets. The tab bar comes from MainTabsView.
struct NewsView: View {
	let onOpenArticle: (String) -> Void
	var onOpenDailyBrief: (DailyBriefResponse) -> Void = { _ in }
	var onOpenLiveArticle: (NewsArticleDto) -> Void = { _ in }
	var onOpenAi: () -> Void = {}
	@ObservedObject var newsVM: NewsViewModel
	@ObservedObject private var session = Session.shared
	@ObservedObject private var brandNames = BrandNames.shared
	/// A news story's link, opened in the in-app Safari sheet.
	@State private var webLink: WebLink? = nil

	// Designer's call (2026-08-22): the search icon opens a search bar that word-matches the news content; the list is
	// empty when nothing matches.
	@State private var searching = false
	/// Product audit (2026-09-05): opening search focuses the field and raises the keyboard.
	@FocusState private var searchFocused: Bool
	@State private var query = ""

	private var q: String { query.trimmingCharacters(in: .whitespaces) }

	var body: some View {
		let u = figmaUnit
		let demo = session.demoAccount
		let brief = newsVM.dailyBrief
		// Waiting on the brief: only a signed-in account asks for one.
		let briefIsLoading = session.token != nil && brief == nil
		let alsoFind = brandNames.expand(q)
		// Built once per pass - its patterns are compiled here, not once per story per term.
		let matcher = LiveMatcher(query: q, alsoFind: alsoFind)
		let sourceBriefs = briefIsLoading ? [] : Self.sourceBriefs(brief: brief, news: newsVM.marketArticles, demo: demo)
		let primaryBrief = sourceBriefs.first { q.isEmpty || matchesBrief($0, alsoFind) }
		let liveForYou = newsVM.forYouArticles.filter(matcher.matches)
		let liveMarkets = newsVM.marketArticles.filter(matcher.matches)
		// The authored stories are the demo's; a real account searching for something the live feed doesn't carry
		// was shown an invented story credited to Reuters instead of "No results".
		let demoMarkets = demo && liveMarkets.isEmpty ? NewsArticleFeed.markets().filter { articleMatches($0, q) } : []

		ScrollView {
			LazyVStack(spacing: 22 * u) {
				header(u: u)
				if q.isEmpty, let mood = brief?.mood, !mood.trimmingCharacters(in: .whitespaces).isEmpty {
					MoodMiniRow(mood: mood)
				}
				if briefIsLoading { BriefLoadingCard() }
				if let primaryBrief {
					let opensBrief = primaryBrief.url == nil && !demo
					BriefCard(brief: primaryBrief, hint: opensBrief ? "Opens today's brief" : "Opens the story") {
						// A news card opens its story; only the brief's own cards (no link) open the brief page - which a
						// failed brief used to open empty. The demo's authored briefs open their authored articles.
						if let link = primaryBrief.url {
							webLink = WebLink(link)
						} else if let brief, !brief.moodExplanation.isEmpty || !brief.plainEnglish.isEmpty {
							onOpenDailyBrief(brief)
						} else if demo,
							let i = NewsBriefFeed.briefs().firstIndex(where: { $0.title == primaryBrief.title }),
							NewsArticleFeed.briefArticles.indices.contains(i) {
							onOpenArticle(NewsArticleFeed.briefArticles[i])
						}
					}
				} else if q.isEmpty && !briefIsLoading && newsVM.marketSettled && !demo {
					// Only once the news request has finished: before that an empty list is just "not here yet".
					NewsUnavailableCard(failed: newsVM.marketFailed) { Task { await newsVM.retryNow() } }
				}
				if !liveForYou.isEmpty {
					LiveNewsSection(title: "For You", articles: liveForYou, onOpen: onOpenLiveArticle)
				}
				if !liveMarkets.isEmpty {
					LiveNewsSection(title: "Markets", articles: liveMarkets, onOpen: onOpenLiveArticle)
				} else if !demoMarkets.isEmpty {
					NewsSectionView(title: "Markets", rows: demoMarkets, onOpen: onOpenArticle)
				}
				// Empty state - only when a query is active, the brief has answered, and every section came up empty.
				if !q.isEmpty && !briefIsLoading && primaryBrief == nil && liveForYou.isEmpty && liveMarkets.isEmpty && demoMarkets.isEmpty {
					NoResultsCard(query: q)
				}
			}
			.padding(.horizontal, 20 * u)
			.padding(.bottom, 24 * u)
		}
		.scrollIndicators(.hidden)
		.scrollDismissesKeyboard(.interactively)
		.background(StakColors.bg.ignoresSafeArea())
		.safariSheet($webLink)
		// The stories and the brief keep themselves current (MainTabsView); each visit re-checks For You against the
		// current saves.
		.task {
			await newsVM.start()
			await newsVM.refreshForYou()
		}
	}

	// MARK: - Header

	private func header(u: CGFloat) -> some View {
		// The header scrolls with the content like Home's top nav (user, 2026-09-14: "I don't want a fixed top bar").
		VStack(spacing: 0) {
			HStack(alignment: .center, spacing: 0) {
				VStack(alignment: .leading, spacing: 4 * u) {
					Text("News")
						.font(StakFont.sora(26 * u, .semiBold))
						.stakLineHeight(33 * u, size: 26 * u, face: .sora)
						.foregroundStyle(Color.white)
						.accessibilityAddTraits(.isHeader)
					// Product audit (2026-09-05): today's date, on the authored line.
					Text(StakClock.todayLong())
						.font(StakFont.geist(13 * u))
						.stakLineHeight(17 * u, size: 13 * u, face: .geist)
						.foregroundStyle(News.muted)
				}
				Spacer(minLength: 0)
				// STAK AI (2026-10-01): beside search, as on Home beside the bell.
				AskAiHeaderButton(size: 40 * u, background: News.cardBg, action: onOpenAi)
				Spacer().frame(width: 8 * u)
				Button {
					searching.toggle()
					if searching {
						Task { await brandNames.ensure() }
					} else {
						query = ""
						searchFocused = false
					}
				} label: {
					ZStack {
						Circle().fill(News.cardBg)
						// While searching the glass becomes a close mark - the same button ends the search.
						if searching {
							Image(systemName: "xmark")
								.font(.system(size: 14 * u, weight: .semibold))
								.foregroundStyle(News.muted)
						} else {
							Image("IcNewsSearch")
								.resizable()
								.frame(width: 20 * u, height: 20 * u)
						}
					}
					.frame(width: 40 * u, height: 40 * u)
				}
				.buttonStyle(.pressDim)
				.accessibilityLabel(searching ? "Close search" : "Search")
			}
			.padding(.top, 22 * u)
			if searching {
				HStack(spacing: 8 * u) {
					TextField("", text: $query, prompt: Text("Search news").foregroundStyle(News.faint))
						.font(StakFont.geist(13 * u))
						.foregroundStyle(Color.white)
						.tint(News.teal)
						.focused($searchFocused)
						.submitLabel(.search)
						.autocorrectionDisabled()
						.textInputAutocapitalization(.never)
						.accessibilityLabel("Search news")
						// Focused once the field exists - setting it in the same update that creates it often doesn't take.
						.onAppear { searchFocused = true }
					if !query.isEmpty {
						Button { query = "" } label: {
							Image(systemName: "xmark.circle.fill")
								.font(.system(size: 15 * u))
								.foregroundStyle(News.faint)
						}
						.buttonStyle(.plain)
						.accessibilityLabel("Clear search")
					}
				}
				.padding(.horizontal, 16 * u)
				.padding(.vertical, 13 * u)
				.background(News.cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
				.padding(.top, 12 * u)
			}
		}
	}

	// MARK: - Search

	private func matches(_ text: String) -> Bool { q.isEmpty || text.range(of: q, options: .caseInsensitive) != nil }

	private func matchesBrief(_ b: NewsBriefFeed.Brief, _ alsoFind: Set<String>) -> Bool {
		matches(b.title) || matches(b.body) || matches(b.source) || alsoFind.contains { t in
			b.title.range(of: t, options: .caseInsensitive) != nil || b.body.range(of: t, options: .caseInsensitive) != nil
		}
	}

	// MARK: - The brief card's content

	/// The daily brief drives the card when signed in (AI-written, holiday- and session-aware), topped up with the top
	/// stories; without a brief, the top stories; only the demo account falls back to the authored set - for a real
	/// account those are invented stories credited to real outlets.
	private static func sourceBriefs(brief: DailyBriefResponse?, news: [NewsArticleDto], demo: Bool) -> [NewsBriefFeed.Brief] {
		func liveBody(_ a: NewsArticleDto) -> String {
			a.explanation.isEmpty ? (NewsText.summaryBeyondHeadline(a.headline, a.summary) ?? "") : a.explanation
		}
		func newsBrief(_ a: NewsArticleDto) -> NewsBriefFeed.Brief {
			NewsBriefFeed.Brief(
				title: a.headline, body: liveBody(a), source: "\(a.source) · \(StakClock.newsAge(a.datetime))",
				url: a.url.isEmpty ? nil : a.url
			)
		}
		if let brief, !brief.moodExplanation.isEmpty || !brief.plainEnglish.isEmpty {
			let aiSource = "STAK AI · \(brief.dayLabel.isEmpty ? "Today's" : brief.dayLabel) Brief"
			var aiCards: [NewsBriefFeed.Brief] = []
			if !brief.moodExplanation.isEmpty && !brief.plainEnglish.isEmpty {
				aiCards.append(NewsBriefFeed.Brief(title: brief.moodExplanation, body: brief.plainEnglish, source: aiSource))
			}
			if !brief.personalizedImpact.isEmpty {
				aiCards.append(NewsBriefFeed.Brief(title: "What this means for you", body: brief.personalizedImpact, source: aiSource))
			}
			let all = aiCards + news.prefix(max(0, 4 - aiCards.count)).map(newsBrief)
			return all.isEmpty ? (demo ? NewsBriefFeed.briefs() : []) : all
		}
		if !news.isEmpty { return news.prefix(4).map(newsBrief) }
		return demo ? NewsBriefFeed.briefs() : []
	}
}

/// Search over a live story: its text and ticker, not just the headline and source. A ticker also finds its company by
/// name and a name finds its ticker, so "NVDA" matches "Nvidia Stock Rises..." and "Google" matches a story tagged
/// GOOGL (Android NewsScreen.matchesLive). The extra terms' patterns are compiled once per query, not per story.
private struct LiveMatcher {
	let q: String
	private let tickers: Set<String>
	private let tickerPattern: NSRegularExpression?
	private let namePattern: NSRegularExpression?

	init(query q: String, alsoFind: Set<String>) {
		self.q = q
		func isTicker(_ t: String) -> Bool { t.allSatisfy { $0.isUppercase || $0.isNumber || $0 == "." } }
		let tickerTerms = alsoFind.filter(isTicker)
		let nameTerms = alsoFind.filter { !isTicker($0) }
		tickers = Set(tickerTerms.map { $0.uppercased() })
		// A term as a whole word: not inside a longer run of letters and digits.
		func wholeWord(_ terms: Set<String>, _ options: NSRegularExpression.Options) -> NSRegularExpression? {
			guard !terms.isEmpty else { return nil }
			let alternatives = terms.map(NSRegularExpression.escapedPattern(for:)).joined(separator: "|")
			return try? NSRegularExpression(pattern: "(^|[^A-Za-z0-9])(" + alternatives + ")($|[^A-Za-z0-9])", options: options)
		}
		// A ticker counts only as written - capitalised; a name in any case.
		tickerPattern = wholeWord(tickerTerms, [])
		namePattern = wholeWord(nameTerms, [.caseInsensitive])
	}

	func matches(_ a: NewsArticleDto) -> Bool {
		if q.isEmpty { return true }
		let text = [a.headline, a.source, a.summary, a.explanation]
		if text.contains(where: { $0.range(of: q, options: .caseInsensitive) != nil }) { return true }
		if a.ticker.range(of: q, options: .caseInsensitive) != nil || tickers.contains(a.ticker.uppercased()) { return true }
		for pattern in [tickerPattern, namePattern].compactMap({ $0 }) {
			for t in text where pattern.firstMatch(in: t, range: NSRange(t.startIndex..., in: t)) != nil { return true }
		}
		return false
	}
}

/// Search over the whole story: headline, subtitle, source, tags, ticker.
private func articleMatches(_ a: NewsArticleFeed.Article, _ q: String) -> Bool {
	if q.isEmpty { return true }
	func hit(_ t: String) -> Bool { t.range(of: q, options: .caseInsensitive) != nil }
	return hit(a.headline) || hit(a.subtitle) || hit(a.source) || a.tags.contains(where: hit) || (a.ticker.map(hit) ?? false)
}

// MARK: - Market Mood row

/// Compact Market Mood row - the brief's mood, on the same tables Home reads (MarketMoodFeed), so the two can't
/// disagree about what a mood means.
private struct MoodMiniRow: View {
	let mood: String

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 0) {
			VStack(alignment: .leading, spacing: 2 * u) {
				Text("Market Mood")
					.font(StakFont.sora(13 * u, .semiBold))
					.stakLineHeight(16 * u, size: 13 * u, face: .sora)
					.foregroundStyle(Color.white)
				Text(MarketMoodFeed.leadForMood(mood))
					.font(StakFont.geist(11 * u))
					.stakLineHeight(14 * u, size: 11 * u, face: .geist)
					.foregroundStyle(MarketMoodFeed.colorFor(mood))
			}
			Spacer(minLength: 0)
			MoodGauge(mood: mood)
				.frame(width: 42 * u, height: 22 * u)
		}
		.padding(.horizontal, 14 * u)
		.padding(.vertical, 12 * u)
		.background(News.moodBg, in: RoundedRectangle(cornerRadius: 12 * u))
		.accessibilityElement(children: .combine)
	}
}

/// The row's half-dial: a track, the mood's arc from the left, and a needle at the same fraction.
private struct MoodGauge: View {
	let mood: String

	var body: some View {
		let u = figmaUnit
		let color = MarketMoodFeed.colorFor(mood)
		let fraction = MarketMoodFeed.fractionFor(mood)
		Canvas { ctx, size in
			let stroke = 2.8 * u
			let radius = size.height - stroke * 0.5
			let center = CGPoint(x: size.width / 2, y: size.height)
			var track = Path()
			track.addArc(center: center, radius: radius, startAngle: .degrees(180), endAngle: .degrees(360), clockwise: false)
			ctx.stroke(track, with: .color(Color(argb: 0xFF2A3346)), lineWidth: stroke)
			var fill = Path()
			fill.addArc(center: center, radius: radius, startAngle: .degrees(180), endAngle: .degrees(180 + fraction * 180), clockwise: false)
			ctx.stroke(fill, with: .color(color), style: StrokeStyle(lineWidth: stroke, lineCap: .round))
			let angle = (1 - fraction) * .pi
			let length = radius * 0.78
			var needle = Path()
			needle.move(to: center)
			needle.addLine(to: CGPoint(x: center.x + length * CGFloat(cos(angle)), y: center.y - length * CGFloat(sin(angle))))
			ctx.stroke(needle, with: .color(Color.white.opacity(0.9)), style: StrokeStyle(lineWidth: 1.3 * u, lineCap: .round))
			let dot = 1.5 * u
			ctx.fill(Path(ellipseIn: CGRect(x: center.x - dot, y: center.y - dot, width: dot * 2, height: dot * 2)), with: .color(Color.white.opacity(0.9)))
		}
		.accessibilityHidden(true)
	}
}

// MARK: - Brief cards

/// One brief card - teal r18 feature card. Tapping it (or its "Read ›") calls `onRead`.
private struct BriefCard: View {
	let brief: NewsBriefFeed.Brief
	/// What VoiceOver says a tap does - a news story or today's brief.
	let hint: String
	let onRead: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: onRead) {
			VStack(alignment: .leading, spacing: 9 * u) {
				Text("TODAY\u{2019}S BRIEF")
					.font(StakFont.geist(10 * u, .medium))
					.stakLineHeight(13 * u, size: 10 * u, face: .geist)
					.tracking(0.6 * u)
					.foregroundStyle(News.ink)
				Text(brief.title)
					.font(StakFont.sora(19 * u, .semiBold))
					.stakLineHeight(25 * u, size: 19 * u, face: .sora)
					.foregroundStyle(News.ink)
					.fixedSize(horizontal: false, vertical: true)
				// Authored Geist Regular 12 / lh17 (1:1265) - exact-design audit 2026-09-04.
				Text(brief.body)
					.font(StakFont.geist(12 * u))
					.stakLineHeight(17 * u, size: 12 * u, face: .geist)
					.foregroundStyle(News.ink)
					.fixedSize(horizontal: false, vertical: true)
				// Authored footer row is 21 tall with a 4 top pad (1:1266) - exact-design audit 2026-09-04.
				HStack(spacing: 0) {
					Text(brief.source)
						.font(StakFont.geist(11 * u))
						.stakLineHeight(14 * u, size: 11 * u, face: .geist)
						.foregroundStyle(News.ink.opacity(0.6))
						.lineLimit(1)
					Spacer(minLength: 8 * u)
					HStack(spacing: 4 * u) {
						Text("Read").font(StakFont.geist(12 * u, .medium))
						Text("\u{203A}").font(StakFont.geist(13 * u, .medium)).accessibilityHidden(true)
					}
					.foregroundStyle(News.ink)
				}
				.padding(.top, 4 * u)
				.frame(height: 21 * u * typeScale)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.horizontal, 18 * u)
			.padding(.top, 18 * u)
			.padding(.bottom, 16 * u)
			.background(News.teal, in: RoundedRectangle(cornerRadius: 18 * u))
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
		.accessibilityElement(children: .combine)
		.accessibilityHint(hint)
	}
}

/// The teal brief card with three pulsing bars while the brief loads.
private struct BriefLoadingCard: View {
	@State private var pulse = false
	@Environment(\.accessibilityReduceMotion) private var reduceMotion

	var body: some View {
		let u = figmaUnit
		let shimmer = News.ink.opacity(pulse ? 0.55 : 0.25)
		VStack(alignment: .leading, spacing: 12 * u) {
			Text("TODAY\u{2019}S BRIEF")
				.font(StakFont.geist(10 * u, .medium))
				.stakLineHeight(13 * u, size: 10 * u, face: .geist)
				.tracking(0.6 * u)
				.foregroundStyle(News.ink)
			GeometryReader { geo in
				VStack(alignment: .leading, spacing: 12 * u) {
					RoundedRectangle(cornerRadius: 4 * u).fill(shimmer).frame(width: geo.size.width * 0.78, height: 14 * u)
					RoundedRectangle(cornerRadius: 4 * u).fill(shimmer).frame(width: geo.size.width * 0.95, height: 10 * u)
					RoundedRectangle(cornerRadius: 4 * u).fill(shimmer).frame(width: geo.size.width * 0.60, height: 10 * u)
				}
			}
			.frame(height: (14 + 10 + 10 + 24) * u)
		}
		.padding(.horizontal, 18 * u)
		.padding(.top, 18 * u)
		.padding(.bottom, 22 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.background(News.teal, in: RoundedRectangle(cornerRadius: 18 * u))
		.accessibilityElement(children: .ignore)
		.accessibilityLabel("Loading today's brief")
		.onAppear {
			guard !reduceMotion else { return }
			// Android's tween(800) - FastOutSlowIn - reversing.
			withAnimation(.timingCurve(0.4, 0, 0.2, 1, duration: 0.8).repeatForever(autoreverses: true)) { pulse = true }
		}
	}
}

/// Where the brief card sits when a real account has no brief and no live news to fill it: says so, rather than
/// showing the demo's authored briefs as today's. `failed` tells a request that failed from one that came back with
/// nothing; the news otherwise retries itself every 2 minutes, and Retry asks now.
private struct NewsUnavailableCard: View {
	let failed: Bool
	let onRetry: () -> Void

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 6 * u) {
			Text(failed ? "Market news isn't loading" : "Today's brief isn't available")
				.font(StakFont.sora(15 * u, .semiBold))
				.foregroundStyle(Color.white)
			Text(failed ? "We'll keep trying, or tap Retry." : "There's no market news to show right now.")
				.font(StakFont.geist(13 * u))
				.stakLineHeight(19 * u, size: 13 * u, face: .geist)
				.foregroundStyle(News.muted)
			if failed {
				Button(action: onRetry) {
					Text("Retry")
						.font(StakFont.geist(13 * u, .medium))
						.foregroundStyle(News.teal)
						.padding(.vertical, 6 * u)
						.contentShape(Rectangle())
				}
				.buttonStyle(.pressDim)
				.padding(.top, 4 * u)
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(18 * u)
		.background(News.cardBg, in: RoundedRectangle(cornerRadius: 18 * u))
	}
}

private struct NoResultsCard: View {
	let query: String

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 6 * u) {
			Text("No results for \u{201C}\(query)\u{201D}")
				.font(StakFont.sora(15 * u, .semiBold))
				.foregroundStyle(Color.white)
			Text("Try a different keyword \u{2014} ticker, topic or source.")
				.font(StakFont.geist(13 * u))
				.stakLineHeight(19 * u, size: 13 * u, face: .geist)
				.foregroundStyle(News.muted)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(News.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
	}
}

// MARK: - Story rows

/// #242b3d r5 chip — Geist 8 #819abb. Medium for the row chips (1:1302); the tile tags are authored Regular / Light
/// (1:1280 / 1:1288) - exact-design audit 2026-09-04.
struct NewsTag: View {
	let text: String
	var tracking: CGFloat = 0
	var weight: StakFont.Weight = .medium

	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(8 * u, weight))
			.stakLineHeight(10 * u, size: 8 * u, face: .geist)
			.tracking(tracking)
			.foregroundStyle(News.muted)
			.padding(.horizontal, 7 * u)
			.padding(.vertical, 3 * u)
			.background(News.chipBg, in: RoundedRectangle(cornerRadius: 5 * u))
	}
}

/// Live stories - For You (saved stocks' company news) and Markets. A tap opens the story's page.
private struct LiveNewsSection: View {
	let title: String
	let articles: [NewsArticleDto]
	let onOpen: (NewsArticleDto) -> Void

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 10 * u) {
			Text(title)
				.font(StakFont.sora(16 * u, .semiBold))
				.stakLineHeight(20 * u, size: 16 * u, face: .sora)
				.foregroundStyle(News.headerGray)
				.padding(.bottom, 2 * u)
				.accessibilityAddTraits(.isHeader)
			// Keyed by the story (its link, else its headline) - by position, a refreshed feed reloaded every thumbnail.
			ForEach(Array(articles.enumerated()), id: \.element.rowId) { _, article in
				Button { onOpen(article) } label: {
					HStack(spacing: 12 * u) {
						if !article.image.isEmpty {
							AsyncImage(url: URL(string: article.image)) { img in
								img.resizable().scaledToFill()
							} placeholder: {
								News.chipBg
							}
							.frame(width: 60 * u, height: 60 * u)
							.clipShape(RoundedRectangle(cornerRadius: 10 * u))
							.accessibilityHidden(true)
						}
						VStack(alignment: .leading, spacing: 5 * u) {
							Text("\(article.source) · \(StakClock.newsAge(article.datetime))")
								.font(StakFont.geist(11 * u))
								.stakLineHeight(14 * u, size: 11 * u, face: .geist)
								.foregroundStyle(News.muted)
								.frame(height: 16 * u * typeScale)
							Text(article.headline)
								.font(StakFont.sora(12 * u, .light))
								.stakLineHeight(19 * u, size: 12 * u, face: .sora)
								.foregroundStyle(Color.white)
								.fixedSize(horizontal: false, vertical: true)
								.frame(maxWidth: .infinity, alignment: .leading)
						}
					}
					.padding(12 * u)
					.background(News.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
					.contentShape(Rectangle())
				}
				.buttonStyle(.pressDim)
				.accessibilityElement(children: .combine)
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
	}
}

/// The demo account's authored Markets rows ("For You" / "Markets" — Sora 16 #d3d3d3 header + 60-unit-thumb cards).
/// Each opens its authored article.
private struct NewsSectionView: View {
	@ObservedObject var holdings = MyStakHoldings.shared
	let title: String
	let rows: [NewsArticleFeed.Article]
	let onOpen: (String) -> Void

	private func rowPosterAsset(_ row: NewsArticleFeed.Article) -> String? {
		switch row.media {
		case .image(let posterAsset, _, _): return posterAsset
		case .video(_, let posterAsset, _, _): return posterAsset
		}
	}

	private func rowPosterUrl(_ row: NewsArticleFeed.Article) -> String? {
		switch row.media {
		case .image(_, let url, _): return url
		case .video(_, _, let posterUrl, _): return posterUrl
		}
	}

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 10 * u) {
			Text(title)
				.font(StakFont.sora(16 * u, .semiBold))
				.stakLineHeight(20 * u, size: 16 * u, face: .sora)
				.foregroundStyle(News.headerGray)
				// Authored header: the 20-tall Sora 16 box + a 2 bottom pad (1:1293) - exact-design audit 2026-09-04.
				.padding(.bottom, 2 * u)
			ForEach(rows, id: \.id) { row in
				Button {
					onOpen(row.id)
				} label: {
					HStack(spacing: 12 * u) {
						// Every row carries art (user, 2026-09-02): the bundled thumb when served, else the story's poster.
						if let thumb = row.thumb ?? rowPosterAsset(row) {
							Image(thumb)
								.resizable()
								.scaledToFill()
								.frame(width: 60 * u, height: 60 * u)
								.clipShape(RoundedRectangle(cornerRadius: 10 * u))
						} else if let urlString = rowPosterUrl(row), let url = URL(string: urlString) {
							AsyncImage(url: url) { img in
								img.resizable().scaledToFill()
							} placeholder: {
								News.cardBg
							}
							.frame(width: 60 * u, height: 60 * u)
							.clipShape(RoundedRectangle(cornerRadius: 10 * u))
						}
						VStack(alignment: .leading, spacing: 5 * u) {
							HStack {
								Text("\(row.source) · \(row.age)")
									.font(StakFont.geist(11 * u))
									.stakLineHeight(14 * u, size: 11 * u, face: .geist)
									.foregroundStyle(News.muted)
								Spacer()
								// Only for stocks the user holds (user, 2026-08-23).
								if holdings.holdsAny(row.relatedTickers) {
									NewsTag(text: "In your STAK")
								}
							}
							// Authored meta row is 16 tall (1:1298, the chip's height) whether or not the chip shows -
							// exact-design audit 2026-09-04.
							.frame(height: 16 * u * typeScale)
							// Authored (1:1295): Sora Light 12 in the 19 line box.
							Text(row.headline)
								.font(StakFont.sora(12 * u, .light))
								.stakLineHeight(19 * u, size: 12 * u, face: .sora)
								.foregroundStyle(Color.white)
								.fixedSize(horizontal: false, vertical: true)
								.frame(maxWidth: .infinity, alignment: .leading)
						}
					}
					.padding(12 * u)
					// 84 tall at rest (60 thumb + 12 padding each side); a longer headline grows it, as on Android.
					.frame(minHeight: 84 * u)
					.background(News.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
				}
				.buttonStyle(.pressDim)
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
	}
}

private extension NewsArticleDto {
	/// A list identity for a story: its link, or its headline when it has none.
	var rowId: String { url.isEmpty ? headline : url }
}
