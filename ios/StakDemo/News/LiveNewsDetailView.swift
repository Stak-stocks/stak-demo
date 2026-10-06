import SwiftUI

/// A live (server-fed) story's page - a port of android ui/news/LiveNewsDetailScreen.kt: the photo with the back and
/// share buttons over it, the headline, the summary and byline, Add to STAK and the stock card for a company story,
/// the gist, the story with a pull quote, its source, key stats, tags, STAK AI and READ NEXT. iOS adds a bar that
/// keeps back and share in reach once the photo has scrolled away, and opens the source in an in-app Safari sheet.
struct LiveNewsDetailView: View {
	let article: NewsArticleDto
	/// The list READ NEXT walks (the story's place in it, then the next two).
	var feed: [NewsArticleDto] = []
	let onBack: () -> Void
	var onOpenLiveArticle: (NewsArticleDto) -> Void = { _ in }
	/// STAK AI with this story as its context (nil hides the card).
	var onOpenAi: (() -> Void)? = nil

	@ObservedObject private var holdings = MyStakHoldings.shared
	@State private var quote: BatchQuote? = nil
	@State private var metrics: StockMetrics? = nil
	@State private var stakFullShownAt: Date? = nil
	@State private var webLink: WebLink? = nil
	/// How far the photo's bottom edge sits below the top of the screen - the pinned bar shows once it has passed.
	@State private var heroBottom: CGFloat = .infinity

	private var ticker: String { article.ticker }
	private var saved: Bool { holdings.tickers.contains(ticker.uppercased()) }

	/// READ NEXT: the 2 stories after this one in its list (wrapping at the end).
	private var readNext: [NewsArticleDto] {
		guard !article.url.isEmpty else { return [] }
		let stories = feed.filter { !$0.headline.isEmpty }
		guard let i = stories.firstIndex(where: { $0.url == article.url }), stories.count > 1 else { return [] }
		return (1...2).map { stories[(i + $0) % stories.count] }.filter { $0.url != article.url }
	}

	var body: some View {
		let u = figmaUnit
		GeometryReader { geo in
			let topInset = geo.safeAreaInsets.top
			ZStack(alignment: .top) {
				ScrollView {
					VStack(alignment: .leading, spacing: 0) {
						hero(u: u, topInset: topInset, width: geo.size.width)
							.background(GeometryReader { hero in
								Color.clear.preference(key: HeroBottomKey.self, value: hero.frame(in: .named("liveStory")).maxY)
							})
						content(u: u)
							.padding(.bottom, geo.safeAreaInsets.bottom)
					}
				}
				.coordinateSpace(name: "liveStory")
				.scrollIndicators(.hidden)
				.onPreferenceChange(HeroBottomKey.self) { heroBottom = $0 }
				// Back and share stay in reach once the photo (and the buttons on it) has scrolled away.
				let pinned = heroBottom < topInset + 56 * u
				pinnedBar(u: u, topInset: topInset)
					.opacity(pinned ? 1 : 0)
					.allowsHitTesting(pinned)
					.accessibilityHidden(!pinned)
					.animation(.easeOut(duration: 0.18), value: pinned)
			}
			.ignoresSafeArea(edges: [.top, .bottom])
		}
		.background(StakColors.bg.ignoresSafeArea())
		.safariSheet($webLink)
		.task(id: ticker) {
			guard !ticker.isEmpty else { return }
			async let q = try? StockRepository.shared.batchQuotes([ticker])
			async let d = try? StockRepository.shared.getStock(ticker)
			if let res = await q, let found = res.quotes[ticker] ?? nil { quote = found }
			metrics = await d?.metrics
		}
		// The STAK-full notice stays 3 seconds (Android NOTICE_MS).
		.task(id: stakFullShownAt) {
			guard stakFullShownAt != nil else { return }
			try? await Task.sleep(nanoseconds: 3_000_000_000)
			guard !Task.isCancelled else { return }
			stakFullShownAt = nil
		}
	}

	// MARK: - Hero

	/// 240 tall in all, drawn up behind the status bar - only the buttons are pushed below it (Android's hero box with
	/// statusBarsPadding on its button row).
	private func hero(u: CGFloat, topInset: CGFloat, width: CGFloat) -> some View {
		Color(argb: 0xFF131926)
			.overlay {
				// An overlay takes the box's size, so a wide photo is cropped to it rather than widening the page.
				if !article.image.isEmpty, let url = URL(string: article.image) {
					AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { Color.clear }
						.accessibilityHidden(true)
				}
			}
			.overlay(alignment: .top) {
				// Top scrim: the buttons stay readable over any photo.
				LinearGradient(colors: [Color(argb: 0xCC000000), .clear], startPoint: .top, endPoint: .bottom)
					.frame(height: 100 * u)
					.allowsHitTesting(false)
			}
			.overlay(alignment: .bottom) {
				// Bottom scrim: the photo fades into the page.
				LinearGradient(colors: [.clear, StakColors.bg], startPoint: .top, endPoint: .bottom)
					.frame(height: 80 * u)
					.allowsHitTesting(false)
			}
			.overlay(alignment: .top) {
				navRow(u: u).padding(.top, topInset + 10 * u)
			}
			.overlay(alignment: .bottomLeading) {
				LiveArticleTag(text: Self.typeTag(article))
					.padding(.leading, 16 * u)
					.padding(.bottom, 14 * u)
			}
			.frame(width: width, height: 240 * u)
			.clipped()
	}

	private func navRow(u: CGFloat) -> some View {
		HStack(spacing: 0) {
			AuthBackCircle(action: onBack)
			Spacer(minLength: 0)
			if let url = URL(string: article.url), !article.url.isEmpty {
				// The link itself (Messages shows its preview), with STAK named so the person receiving it sees where it
				// came from.
				ShareLink(item: url, message: Text(article.headline.isEmpty ? "(via STAK)" : "\(article.headline) (via STAK)")) {
					ZStack {
						Circle().fill(Color(argb: 0x80192238))
						Image("IcNewsShare")
							.resizable()
							.frame(width: 20 * u, height: 20 * u)
					}
					.frame(width: 40 * u, height: 40 * u)
				}
				.buttonStyle(.pressDim)
				.accessibilityLabel("Share")
			}
		}
		.padding(.leading, 16 * u)
		.padding(.trailing, 18 * u)
	}

	private func pinnedBar(u: CGFloat, topInset: CGFloat) -> some View {
		navRow(u: u)
			.padding(.top, topInset + 6 * u)
			.padding(.bottom, 8 * u)
			.frame(maxWidth: .infinity)
			.background(StakColors.bg.opacity(0.94))
			.overlay(alignment: .bottom) { Rectangle().fill(News.divider).frame(height: 0.5) }
	}

	// MARK: - The story

	private func content(u: CGFloat) -> some View {
		VStack(alignment: .leading, spacing: 16 * u) {
			Text(article.headline)
				.font(StakFont.sora(20 * u, .semiBold))
				.stakLineHeight(30 * u, size: 20 * u, face: .sora)
				.foregroundStyle(Color.white)
				.fixedSize(horizontal: false, vertical: true)
				.accessibilityAddTraits(.isHeader)
			// The summary - only when it says more than the headline above it.
			if let subtitle = NewsText.summaryBeyondHeadline(article.headline, article.summary) {
				Text(subtitle)
					.font(StakFont.geist(14 * u))
					.stakLineHeight(22 * u, size: 14 * u, face: .geist)
					.foregroundStyle(News.muted)
					.fixedSize(horizontal: false, vertical: true)
			}
			LiveByline(source: article.source, datetime: article.datetime)
			if !ticker.isEmpty && !saved {
				LiveAddToStakButton(ticker: ticker) {
					// add() refuses at capacity; marking it saved regardless showed a stock as kept that neither the
					// Stak nor the server holds.
					if MyStakHoldings.shared.add(ticker) {
						UIImpactFeedbackGenerator(style: .light).impactOccurred()
						AccessibilityNotification.Announcement("\(ticker) added to your STAK").post()
					} else {
						stakFullShownAt = Date()
						UINotificationFeedbackGenerator().notificationOccurred(.warning)
						AccessibilityNotification.Announcement(stakFullMessage).post()
					}
				}
				if stakFullShownAt != nil {
					Text(stakFullMessage)
						.font(StakFont.geist(11 * u))
						.foregroundStyle(News.muted)
				}
			}
			if !ticker.isEmpty {
				LiveStockCard(ticker: ticker, quote: quote)
			}
			LiveDivider()
			let bullets = Self.gistBullets(article.whyItMatters)
			if !bullets.isEmpty { LiveGistCard(bullets: bullets) }
			if !article.explanation.isEmpty {
				let parts = Self.splitWithPullquote(article.explanation)
				if !parts.before.isEmpty { bodyText(parts.before, u: u) }
				if !parts.quote.isEmpty { LiveBlockquote(text: parts.quote) }
				if !parts.after.isEmpty { bodyText(parts.after, u: u) }
			}
			if let link = WebLink(article.url) {
				Button { webLink = link } label: {
					HStack(spacing: 6 * u) {
						Text("Source")
							.font(StakFont.geist(13 * u, .medium))
							.stakLineHeight(18 * u, size: 13 * u, face: .geist)
							.foregroundStyle(News.muted)
						Image("IcArrowRightSmall")
							.renderingMode(.template)
							.resizable()
							.frame(width: 14 * u, height: 14 * u)
							.foregroundStyle(News.muted)
						Text(article.source)
							.font(StakFont.geist(13 * u, .medium))
							.stakLineHeight(18 * u, size: 13 * u, face: .geist)
							.foregroundStyle(News.teal)
					}
					.padding(.vertical, 4 * u)
					.contentShape(Rectangle())
				}
				.buttonStyle(.pressDim)
				.accessibilityElement(children: .ignore)
				.accessibilityLabel("Source: \(article.source)")
				.accessibilityHint("Opens the original story")
				.accessibilityAddTraits(.isButton)
			}
			if !ticker.isEmpty && (quote != nil || metrics?.peRatio != nil || metrics?.marketCap != nil) {
				LiveDivider()
				LiveKeyStats(ticker: ticker, quote: quote, metrics: metrics)
			}
			if !ticker.isEmpty || sentimentTag != nil {
				HStack(spacing: 8 * u) {
					if !ticker.isEmpty { LiveArticleTag(text: ticker) }
					if let sentimentTag { LiveArticleTag(text: sentimentTag) }
				}
			}
			// STAK AI (2026-10-01): questions about this story, with the story as context.
			if let onOpenAi {
				AskAiCard(title: "Ask STAK AI about this", subtitle: "Plain-English answers, starting from this story.", onOpen: onOpenAi)
			}
			let next = readNext
			if !next.isEmpty {
				LiveDivider()
				Text("READ NEXT")
					.font(StakFont.geist(11 * u, .semiBold))
					.stakLineHeight(14 * u, size: 11 * u, face: .geist)
					.tracking(0.8 * u)
					.foregroundStyle(News.muted)
					.accessibilityAddTraits(.isHeader)
				ForEach(Array(next.enumerated()), id: \.offset) { _, story in
					LiveReadNextRow(article: story) { onOpenLiveArticle(story) }
				}
			}
		}
		.padding(.horizontal, 20 * u)
		.padding(.bottom, 32 * u)
	}

	private var sentimentTag: String? {
		switch article.sentiment.lowercased() {
		case "positive": return "Bullish signal"
		case "negative": return "Bearish signal"
		default: return nil
		}
	}

	private func bodyText(_ text: String, u: CGFloat) -> some View {
		Text(text)
			.font(StakFont.geist(14 * u))
			.stakLineHeight(23 * u, size: 14 * u, face: .geist)
			.foregroundStyle(News.body)
			.fixedSize(horizontal: false, vertical: true)
	}

	// MARK: - Text helpers (Android's, verbatim)

	static func typeTag(_ a: NewsArticleDto) -> String {
		switch a.type.lowercased() {
		case "company": return a.ticker.isEmpty ? "Stock" : "\(a.ticker) · Stock"
		case "sector": return "Sector"
		case "macro": return "Markets"
		default: return "News"
		}
	}

	/// The explanation split around a pull quote: sentence 3, 2 or 4 (in that order of preference) when it runs
	/// 40-130 characters; no quote for a story of fewer than 3 sentences.
	static func splitWithPullquote(_ text: String) -> (before: String, quote: String, after: String) {
		let sentences = NewsText.sentences(text).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
		guard sentences.count >= 3 else { return (text, "", "") }
		guard let pick = [2, 1, 3].filter({ $0 < sentences.count }).first(where: { (40...130).contains(sentences[$0].count) }) else {
			return (text, "", "")
		}
		let quote = String(sentences[pick].reversed().drop(while: { ".!?".contains($0) }).reversed())
		return (
			sentences[..<pick].joined(separator: " "),
			quote,
			sentences[(pick + 1)...].joined(separator: " ")
		)
	}

	/// The AI's whyItMatters as up to 3 gist bullets: its lines when there are several, else its sentences.
	static func gistBullets(_ text: String) -> [String] {
		guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return [] }
		// Any line break, \r\n included (a single Character in Swift, so splitting on "\n" alone missed it).
		let byLine = text.split(omittingEmptySubsequences: false, whereSeparator: \.isNewline)
			.map { line -> String in
				let t = line.trimmingCharacters(in: .whitespaces)
				return String(t.drop(while: { "•-*·".contains($0) })).trimmingCharacters(in: .whitespaces)
			}
			.filter { $0.count > 10 }
		if byLine.count >= 2 { return Array(byLine.prefix(3)) }
		return Array(text.components(separatedBy: ". ").map { $0.trimmingCharacters(in: .whitespaces) }.filter { $0.count > 10 }.prefix(3))
	}
}

private struct HeroBottomKey: PreferenceKey {
	static var defaultValue: CGFloat = .infinity
	static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

// MARK: - Pieces

private struct LiveByline: View {
	let source: String
	let datetime: Int64

	private static let dayFormatter: DateFormatter = {
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.dateFormat = "MMM d"
		return f
	}()

	var body: some View {
		let u = figmaUnit
		let date = datetime > 0 ? Self.dayFormatter.string(from: Date(timeIntervalSince1970: TimeInterval(datetime))) : ""
		HStack(spacing: 8 * u) {
			ZStack {
				Circle().fill(News.chipBg)
				Text(String(source.prefix(1)))
					.font(StakFont.sora(10 * u, .semiBold))
					.stakLineHeight(13 * u, size: 10 * u, face: .sora)
					.foregroundStyle(Color(argb: 0xFF9EADC7))
			}
			.frame(width: 24 * u, height: 24 * u)
			.accessibilityHidden(true)
			Text(date.isEmpty ? source : "\(source) · \(date)")
				.font(StakFont.geist(12 * u, .medium))
				.stakLineHeight(16 * u, size: 12 * u, face: .geist)
				.foregroundStyle(Color.white)
		}
		.padding(.vertical, 2 * u)
	}
}

private struct LiveAddToStakButton: View {
	let ticker: String
	let onTap: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: onTap) {
			HStack(spacing: 8 * u) {
				Text("Add to STAK")
					.font(StakFont.geist(14 * u, .medium))
					.stakLineHeight(20.69 * u, size: 14 * u, face: .geist)
					.foregroundStyle(Color.white)
				Image("IcPlusSmall")
					.resizable()
					.frame(width: 14 * u, height: 14 * u)
			}
			.frame(width: 150 * u, height: 52 * u)
			.background(discCtaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
			.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(StakColors.ctaBorderGradient, lineWidth: 0.36 * u))
		}
		.buttonStyle(.pressDim)
		.accessibilityLabel("Add \(ticker) to STAK")
	}
}

private struct LiveDivider: View {
	var body: some View {
		Rectangle().fill(News.divider).frame(height: 1 * figmaUnit).accessibilityHidden(true)
	}
}

private struct LiveStockCard: View {
	let ticker: String
	let quote: BatchQuote?
	@ObservedObject private var brandNames = BrandNames.shared

	var body: some View {
		let u = figmaUnit
		let price = quote.map { $0.price > 0 ? "$" + String(format: "%.2f", $0.price) : "--" } ?? "--"
		let pct = quote.map { ($0.changePercent >= 0 ? "+" : "") + String(format: "%.2f", $0.changePercent) + "% today" } ?? ""
		let up = (quote?.changePercent ?? 0) >= 0
		VStack(alignment: .leading, spacing: 13 * u) {
			HStack(spacing: 12 * u) {
				ZStack {
					Circle().fill(News.chipBg)
					Text(String(ticker.prefix(1)))
						.font(StakFont.sora(18 * u, .semiBold))
						.stakLineHeight(23 * u, size: 18 * u, face: .sora)
						.foregroundStyle(Color(argb: 0xFF9EADC7))
				}
				.frame(width: 44 * u, height: 44 * u)
				.accessibilityHidden(true)
				VStack(alignment: .leading, spacing: 3 * u) {
					Text(ticker)
						.font(StakFont.sora(15 * u, .semiBold))
						.stakLineHeight(19 * u, size: 15 * u, face: .sora)
						.foregroundStyle(Color.white)
					// The company's name (Android repeats the ticker here); the ticker until the names have loaded.
					Text(brandNames.byTicker[ticker.uppercased()] ?? ticker)
						.font(StakFont.geist(12 * u))
						.stakLineHeight(16 * u, size: 12 * u, face: .geist)
						.foregroundStyle(News.muted)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
			}
			HStack(alignment: .bottom, spacing: 0) {
				VStack(alignment: .leading, spacing: 3 * u) {
					Text(price)
						.font(StakFont.sora(26 * u, .semiBold))
						.stakLineHeight(33 * u, size: 26 * u, face: .sora)
						.foregroundStyle(Color.white)
					if !pct.isEmpty {
						Text(pct)
							.font(StakFont.geist(13 * u, .medium))
							.stakLineHeight(17 * u, size: 13 * u, face: .geist)
							.foregroundStyle(up ? News.green : Color(argb: 0xFFFF5A6A))
					}
				}
				Spacer(minLength: 0)
				if quote != nil {
					Image(up ? "NewsSparkline" : "NewsSparklineDown")
						.resizable()
						.frame(width: 110 * u, height: 40 * u)
						.accessibilityHidden(true)
				}
			}
		}
		.padding(.horizontal, 16 * u)
		.padding(.top, 16 * u)
		.padding(.bottom, 14 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.background(News.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
		.accessibilityElement(children: .combine)
	}
}

private struct LiveGistCard: View {
	let bullets: [String]

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 12 * u) {
			HStack(spacing: 8 * u) {
				Image("IcGistSparkle").resizable().frame(width: 18 * u, height: 18 * u).accessibilityHidden(true)
				Text("The gist")
					.font(StakFont.sora(14 * u, .semiBold))
					.stakLineHeight(18 * u, size: 14 * u, face: .sora)
					.foregroundStyle(Color.white)
			}
			ForEach(Array(bullets.enumerated()), id: \.offset) { _, bullet in
				HStack(alignment: .top, spacing: 10 * u) {
					Image("IcGistCheck").resizable().frame(width: 16 * u, height: 16 * u).accessibilityHidden(true)
					Text(bullet)
						.font(StakFont.geist(13 * u))
						.stakLineHeight(19 * u, size: 13 * u, face: .geist)
						.foregroundStyle(News.body)
						.fixedSize(horizontal: false, vertical: true)
						.frame(maxWidth: .infinity, alignment: .leading)
				}
			}
		}
		.padding(16 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.background(News.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
	}
}

private struct LiveBlockquote: View {
	let text: String

	var body: some View {
		let u = figmaUnit
		HStack(alignment: .top, spacing: 12 * u) {
			// At least 56 tall (Android's bar), and as tall as a longer quote.
			RoundedRectangle(cornerRadius: 2 * u).fill(News.teal).frame(width: 3 * u).frame(minHeight: 56 * u, maxHeight: .infinity)
			Text("\u{201C}\(text)\u{201D}")
				.font(StakFont.geist(15 * u))
				.italic()
				.stakLineHeight(24 * u, size: 15 * u, face: .geist)
				.foregroundStyle(Color.white)
				.fixedSize(horizontal: false, vertical: true)
				.frame(maxWidth: .infinity, alignment: .leading)
		}
		.fixedSize(horizontal: false, vertical: true)
	}
}

private struct LiveKeyStats: View {
	let ticker: String
	let quote: BatchQuote?
	let metrics: StockMetrics?

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 4 * u) {
			HStack {
				Text("Key stats")
					.font(StakFont.geist(11 * u, .semiBold))
					.stakLineHeight(14 * u, size: 11 * u, face: .geist)
					.tracking(0.8 * u)
					.foregroundStyle(News.muted)
					.accessibilityAddTraits(.isHeader)
				Spacer()
				Text(ticker)
					.font(StakFont.geist(11 * u, .semiBold))
					.stakLineHeight(14 * u, size: 11 * u, face: .geist)
					.tracking(0.6 * u)
					.foregroundStyle(News.teal)
			}
			Spacer().frame(height: 4 * u)
			HStack(spacing: 0) {
				StatCell(label: "Market cap", value: metrics?.marketCap ?? "--")
				StatCell(label: "P/E ratio", value: metrics?.peRatio.map { String(format: "%.1f", $0) } ?? "--")
			}
			HStack(spacing: 0) {
				// "-$1.23", not "$-1.23".
				StatCell(label: "Day change", value: quote.map { ($0.change >= 0 ? "+$" : "-$") + String(format: "%.2f", abs($0.change)) } ?? "--")
				StatCell(label: "Day change %", value: quote.map { ($0.changePercent >= 0 ? "+" : "") + String(format: "%.2f", $0.changePercent) + "%" } ?? "--")
			}
		}
	}
}

private struct StatCell: View {
	let label: String
	let value: String

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 3 * u) {
			Text(label)
				.font(StakFont.geist(11 * u))
				.stakLineHeight(14 * u, size: 11 * u, face: .geist)
				.foregroundStyle(News.faint)
			Text(value)
				.font(StakFont.geist(14 * u, .medium))
				.stakLineHeight(18 * u, size: 14 * u, face: .geist)
				.foregroundStyle(Color.white)
		}
		.padding(.vertical, 8 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.accessibilityElement(children: .combine)
	}
}

private struct LiveReadNextRow: View {
	let article: NewsArticleDto
	let onOpen: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: onOpen) {
			HStack(spacing: 12 * u) {
				Group {
					if !article.image.isEmpty, let url = URL(string: article.image) {
						AsyncImage(url: url) { img in img.resizable().scaledToFill() } placeholder: { News.chipBg }
					} else {
						News.chipBg
					}
				}
				.frame(width: 72 * u, height: 54 * u)
				.clipShape(RoundedRectangle(cornerRadius: 8 * u))
				.accessibilityHidden(true)
				VStack(alignment: .leading, spacing: 6 * u) {
					Text(article.headline)
						.font(StakFont.geist(13 * u, .medium))
						.stakLineHeight(19 * u, size: 13 * u, face: .geist)
						.foregroundStyle(Color.white)
						.lineLimit(2)
					Text(article.source)
						.font(StakFont.geist(11 * u))
						.stakLineHeight(14 * u, size: 11 * u, face: .geist)
						.foregroundStyle(News.muted)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
			}
			.padding(12 * u)
			.background(News.cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
		.accessibilityElement(children: .combine)
	}
}

/// A story's tag chip: frosted dark capsule, hairline rim.
private struct LiveArticleTag: View {
	let text: String

	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(11 * u, .medium))
			.stakLineHeight(14 * u, size: 11 * u, face: .geist)
			.foregroundStyle(Color.white)
			.padding(.horizontal, 11 * u)
			.padding(.vertical, 5 * u)
			.background(Color(argb: 0xCC1A2333), in: RoundedRectangle(cornerRadius: 12 * u))
			.overlay(RoundedRectangle(cornerRadius: 12 * u).strokeBorder(Color(argb: 0x40FFFFFF), lineWidth: 0.5 * u))
	}
}
