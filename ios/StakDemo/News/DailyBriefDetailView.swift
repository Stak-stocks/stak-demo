import SwiftUI

/// The daily brief, opened from News's TODAY'S BRIEF card - a port of android ui/news/DailyBriefDetailScreen.kt: the
/// headline, the gist, what actually happened, why it matters to the user's STAK, what to watch next, the AI's
/// suggested question and a follow-up into STAK AI.
struct DailyBriefDetailView: View {
	let brief: DailyBriefResponse
	let onBack: () -> Void
	/// STAK AI with today's brief as its context, optionally starting from a question (nil hides the AI cards).
	var onOpenAi: ((StakAiContext?, String?) -> Void)? = nil

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) {
			HStack {
				AuthBackCircle(action: onBack)
				Spacer(minLength: 0)
			}
			.padding(.leading, 16 * u)
			.padding(.trailing, 18 * u)
			.padding(.vertical, 10 * u)

			ScrollView {
				VStack(alignment: .leading, spacing: 14 * u) {
					header(u: u)
					if !brief.plainEnglish.isEmpty {
						BriefSectionCard {
							BriefSectionHeader(label: "The gist") { DocIcon() }
							bodyText(brief.plainEnglish, u: u)
						}
					}
					// The served items, or the headline's sentences when there are none.
					let happened = brief.whatHappened.isEmpty ? Self.itemsFromMoodExplanation(brief.moodExplanation) : brief.whatHappened
					if !happened.isEmpty { WhatHappenedCard(items: happened) }
					if !brief.personalizedImpact.isEmpty { WhyMattersCard(text: brief.personalizedImpact) }
					// The served items, or the mood's defaults when there are none.
					let watch = brief.watchItems.isEmpty ? Self.defaultWatchItems(brief.mood) : brief.watchItems
					if !watch.isEmpty { WatchNextCard(items: watch) }
					if !brief.contextQuestion.isEmpty {
						ContextQuestionCard(
							question: brief.contextQuestion,
							onAsk: onOpenAi == nil ? nil : { onOpenAi?(.brief(brief), brief.contextQuestion) }
						)
					}
					// STAK AI (2026-10-01): follow-ups on today's brief, with the brief as context.
					if let onOpenAi {
						AskAiCard(
							title: "Ask a follow-up",
							subtitle: "STAK AI answers questions about today's brief in plain English.",
							onOpen: { onOpenAi(.brief(brief), nil) }
						)
					}
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, 6 * u)
				.padding(.bottom, 36 * u)
			}
			.scrollIndicators(.hidden)
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	private func header(u: CGFloat) -> some View {
		VStack(alignment: .leading, spacing: 10 * u) {
			Text("TODAY'S BRIEF")
				.font(StakFont.geist(10 * u, .semiBold))
				.tracking(1.1 * u)
				.foregroundStyle(News.teal)
			if !brief.moodExplanation.isEmpty {
				Text(brief.moodExplanation)
					.font(StakFont.sora(20 * u, .semiBold))
					.stakLineHeight(27 * u, size: 20 * u, face: .sora)
					.foregroundStyle(Color.white)
					.fixedSize(horizontal: false, vertical: true)
					.accessibilityAddTraits(.isHeader)
			}
			// "STAK AI · Friday's Brief" - what the card says.
			Text("STAK AI · " + (brief.dayLabel.isEmpty || brief.dayLabel == "Today's" ? "Today's Brief" : "\(brief.dayLabel) Brief"))
				.font(StakFont.geist(12 * u))
				.foregroundStyle(News.muted)
		}
	}

	private func bodyText(_ text: String, u: CGFloat) -> some View {
		Text(text)
			.font(StakFont.geist(13 * u))
			.stakLineHeight(20 * u, size: 13 * u, face: .geist)
			.foregroundStyle(News.body)
			.fixedSize(horizontal: false, vertical: true)
	}

	/// The headline split into up to 3 items when the backend sent none.
	static func itemsFromMoodExplanation(_ text: String) -> [WhatHappenedItem] {
		guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return [] }
		let sentences = NewsText.sentences(text).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
		if sentences.count >= 2 { return sentences.prefix(3).map { WhatHappenedItem(title: "", body: $0) } }
		return [WhatHappenedItem(title: "", body: text.trimmingCharacters(in: .whitespaces))]
	}

	/// The mood's default watch list when the backend sent none (Android's, verbatim).
	static func defaultWatchItems(_ mood: String) -> [WatchItem] {
		switch mood.lowercased() {
		case "bullish", "risk-on": return [
			WatchItem(icon: "📈", label: "Index breakouts", body: "Watch SPY and QQQ for sustained moves above resistance."),
			WatchItem(icon: "💰", label: "Growth names", body: "High-beta growth stocks tend to lead in risk-on conditions."),
			WatchItem(icon: "🔔", label: "Fed speakers", body: "Any hawkish pivot could cool the rally quickly."),
		]
		case "bearish", "risk-off": return [
			WatchItem(icon: "🛡️", label: "Defensive plays", body: "Utilities and consumer staples may outperform."),
			WatchItem(icon: "📉", label: "Support levels", body: "Key technical supports on SPY and QQQ to monitor."),
			WatchItem(icon: "💵", label: "Dollar strength", body: "Risk-off flows often boost USD and Treasury bonds."),
		]
		case "volatile": return [
			WatchItem(icon: "⚡", label: "VIX moves", body: "Elevated VIX signals uncertainty — watch for spikes above 20."),
			WatchItem(icon: "📊", label: "Earnings reactions", body: "Volatile tape amplifies post-earnings moves."),
			WatchItem(icon: "🔄", label: "Sector rotation", body: "Money rotating between sectors — follow the volume."),
		]
		case "cautious": return [
			WatchItem(icon: "👀", label: "Economic data", body: "Upcoming macro data could set market direction."),
			WatchItem(icon: "🏦", label: "Bank commentary", body: "Listen for guidance shifts from major financial institutions."),
			WatchItem(icon: "📰", label: "Headline risk", body: "Geopolitical or policy news can move markets fast."),
		]
		default: return [
			WatchItem(icon: "📊", label: "Market breadth", body: "Watch how many stocks are advancing vs declining."),
			WatchItem(icon: "🔍", label: "Sector leaders", body: "Identify which sectors are setting the pace today."),
			WatchItem(icon: "📅", label: "Upcoming catalysts", body: "Earnings reports and macro events on the calendar."),
		]
		}
	}
}

// MARK: - Cards

private let iconInk = Color(argb: 0xFF8B9AB8)

private struct BriefSectionCard<Content: View>: View {
	@ViewBuilder let content: Content

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 12 * u) { content }
			.padding(18 * u)
			.frame(maxWidth: .infinity, alignment: .leading)
			.background(News.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

private struct BriefSectionHeader<Icon: View>: View {
	let label: String
	@ViewBuilder let icon: Icon

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 9 * u) {
			IconBox { icon }
			Text(label)
				.font(StakFont.sora(14 * u, .semiBold))
				.stakLineHeight(18 * u, size: 14 * u, face: .sora)
				.foregroundStyle(Color.white)
				.accessibilityAddTraits(.isHeader)
		}
	}
}

private struct IconBox<Content: View>: View {
	@ViewBuilder let content: Content

	var body: some View {
		let u = figmaUnit
		ZStack { content }
			.frame(width: 28 * u, height: 28 * u)
			.background(Color(argb: 0xFF1A2235), in: RoundedRectangle(cornerRadius: 8 * u))
			.accessibilityHidden(true)
	}
}

private struct WhatHappenedCard: View {
	let items: [WhatHappenedItem]

	var body: some View {
		let u = figmaUnit
		BriefSectionCard {
			BriefSectionHeader(label: "What actually happened") { BarChartIcon() }
			VStack(alignment: .leading, spacing: 12 * u) {
				ForEach(Array(items.prefix(3).enumerated()), id: \.offset) { i, item in
					HStack(alignment: .top, spacing: 12 * u) {
						Text("\(i + 1)")
							.font(StakFont.geist(12 * u, .bold))
							.foregroundStyle(News.teal)
							.frame(width: 26 * u, height: 26 * u)
							.background(News.teal.opacity(0.15), in: Circle())
							.accessibilityHidden(true)
						VStack(alignment: .leading, spacing: 3 * u) {
							if !item.title.isEmpty {
								Text(item.title)
									.font(StakFont.sora(13 * u, .semiBold))
									.stakLineHeight(18 * u, size: 13 * u, face: .sora)
									.foregroundStyle(Color.white)
									.fixedSize(horizontal: false, vertical: true)
							}
							Text(item.body)
								.font(StakFont.geist(12 * u))
								.stakLineHeight(18 * u, size: 12 * u, face: .geist)
								.foregroundStyle(News.body)
								.fixedSize(horizontal: false, vertical: true)
						}
						.frame(maxWidth: .infinity, alignment: .leading)
					}
					.accessibilityElement(children: .combine)
				}
			}
		}
	}
}

private struct WhyMattersCard: View {
	let text: String
	@ObservedObject private var holdings = MyStakHoldings.shared

	var body: some View {
		let u = figmaUnit
		// In the order they were saved (Android's list order), the first five.
		let tickers = Array(holdings.tickers.sorted {
			(holdings.savedInstant($0) ?? .max, $0) < (holdings.savedInstant($1) ?? .max, $1)
		}.prefix(5))
		BriefSectionCard {
			BriefSectionHeader(label: "Why this matters to your STAK") { StarIcon() }
			Text(text)
				.font(StakFont.geist(13 * u))
				.stakLineHeight(20 * u, size: 13 * u, face: .geist)
				.foregroundStyle(News.body)
				.fixedSize(horizontal: false, vertical: true)
			if !tickers.isEmpty {
				// One colour for every chip: a colour per ticker, picked only by its position, looked like it meant
				// something (performance, category) when it was just decoration (user, 2026-09-18).
				FlowLayout(spacing: 8 * u) {
					ForEach(tickers, id: \.self) { ticker in
						Text(ticker)
							.font(StakFont.geist(12 * u, .semiBold))
							.foregroundStyle(News.teal)
							.padding(.horizontal, 11 * u)
							.padding(.vertical, 6 * u)
							.background(News.teal.opacity(0.12), in: RoundedRectangle(cornerRadius: 20 * u))
							.overlay(RoundedRectangle(cornerRadius: 20 * u).strokeBorder(News.teal.opacity(0.35), lineWidth: 0.5))
					}
				}
				.padding(.top, 2 * u)
			}
		}
	}
}

private struct WatchNextCard: View {
	let items: [WatchItem]

	var body: some View {
		let u = figmaUnit
		BriefSectionCard {
			BriefSectionHeader(label: "What to watch next") {
				Image("IcRiskEye").renderingMode(.template).resizable().frame(width: 15 * u, height: 15 * u).foregroundStyle(iconInk)
			}
			// One stack, not loose children: the card's own 12 gap sits between every child it's given.
			VStack(alignment: .leading, spacing: 0) {
				ForEach(Array(items.prefix(3).enumerated()), id: \.offset) { i, item in
					if i > 0 {
						Rectangle().fill(News.divider).frame(height: 1 * u).padding(.vertical, 6 * u)
					}
					HStack(spacing: 12 * u) {
						// Plain icon, no tile - in the app's own line-icon language, not the emoji the item arrives with.
						Image(Self.icon(for: item)).resizable().frame(width: 26 * u, height: 26 * u).accessibilityHidden(true)
						VStack(alignment: .leading, spacing: 2 * u) {
							Text(item.label)
								.font(StakFont.sora(13 * u, .semiBold))
								.stakLineHeight(17 * u, size: 13 * u, face: .sora)
								.foregroundStyle(Color.white)
							Text(item.body)
								.font(StakFont.geist(12 * u))
								.stakLineHeight(18 * u, size: 12 * u, face: .geist)
								.foregroundStyle(News.muted)
								.fixedSize(horizontal: false, vertical: true)
						}
						.frame(maxWidth: .infinity, alignment: .leading)
					}
					.accessibilityElement(children: .combine)
				}
			}
		}
	}

	/// A watch item's topic, keyword-matched against its own text (the AI copy is open-ended); the eye by default.
	static func icon(for item: WatchItem) -> String {
		let text = "\(item.label) \(item.body)".lowercased()
		func any(_ words: [String]) -> Bool { words.contains { text.contains($0) } }
		if any(["fed", "central bank", "powell", "hawkish", "dovish", "speaker", "rate decision"]) { return "IcQlBank" }
		if any(["oil", "crude", "opec", "barrel"]) { return "IcQlBarrel" }
		if any(["bond", "yield", "treasury", "rate"]) { return "IcQlPercent" }
		if any(["vix", "volatil"]) { return "IcQlPulse" }
		if any(["dollar", "currency", "usd"]) { return "IcQlDollar" }
		if any(["tech", "chip", "semiconductor", "software"]) { return "IcQlChip" }
		if any(["material", "sector", "rotation", "industrial"]) { return "IcQlLayers" }
		if any(["sentiment", "market", "index", "breakout", "momentum", "support"]) { return "IcQlTrending" }
		if any(["defensive", "safety", "utilit", "staple", "shield"]) { return "IcRiskShield" }
		if any(["growth", "grow", "high-beta"]) { return "GoalGrow" }
		if any(["earnings", "report", "reaction"]) { return "GoalLearn" }
		return "IcRiskEye"
	}
}

/// The AI's suggested question. Tapping it asks STAK AI that question about today's brief.
private struct ContextQuestionCard: View {
	let question: String
	let onAsk: (() -> Void)?

	var body: some View {
		let u = figmaUnit
		Button { onAsk?() } label: {
			HStack(spacing: 12 * u) {
				VStack(alignment: .leading, spacing: 8 * u) {
					BriefSectionHeader(label: "Ask STAK AI") {
						Image("StakLogoMark").renderingMode(.template).resizable().frame(width: 14 * u, height: 14 * u).foregroundStyle(News.teal)
					}
					Text(question)
						.font(StakFont.geist(13 * u))
						.stakLineHeight(20 * u, size: 13 * u, face: .geist)
						.foregroundStyle(News.body)
						.fixedSize(horizontal: false, vertical: true)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				Image("IcArrowRightSmall").renderingMode(.template).resizable().frame(width: 16 * u, height: 16 * u).foregroundStyle(News.muted)
			}
			.padding(18 * u)
			.background(News.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
		.disabled(onAsk == nil)
		.accessibilityElement(children: .combine)
		.accessibilityHint("Asks STAK AI this question. Uses one of your questions.")
	}
}

// MARK: - Header icons

/// Three lines, the last short.
private struct DocIcon: View {
	var body: some View {
		let u = figmaUnit
		Canvas { ctx, size in
			for i in 0..<3 {
				let y = CGFloat(i) * (size.height / 2.5)
				let w = i == 2 ? size.width * 0.6 : size.width
				ctx.fill(Path(roundedRect: CGRect(x: 0, y: y, width: w, height: size.height * 0.14), cornerRadius: 1), with: .color(iconInk))
			}
		}
		.frame(width: 14 * u, height: 12 * u)
	}
}

/// Three rising bars.
private struct BarChartIcon: View {
	var body: some View {
		let u = figmaUnit
		Canvas { ctx, size in
			let barW = size.width * 0.24
			let gap = size.width * 0.12
			for (i, h) in [CGFloat(0.45), 0.7, 1.0].enumerated() {
				let barH = size.height * h
				let rect = CGRect(x: CGFloat(i) * (barW + gap), y: size.height - barH, width: barW, height: barH)
				ctx.fill(Path(roundedRect: rect, cornerRadius: 1), with: .color(iconInk))
			}
		}
		.frame(width: 14 * u, height: 12 * u)
	}
}

/// A five-point star.
private struct StarIcon: View {
	var body: some View {
		let u = figmaUnit
		Canvas { ctx, size in
			let cx = size.width / 2, cy = size.height / 2
			let outer = size.width / 2, inner = outer * 0.42
			var path = Path()
			for i in 0..<10 {
				let angle = Double.pi / 5 * Double(i) - Double.pi / 2
				let r = i % 2 == 0 ? outer : inner
				let p = CGPoint(x: cx + r * CGFloat(cos(angle)), y: cy + r * CGFloat(sin(angle)))
				if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
			}
			path.closeSubpath()
			ctx.fill(path, with: .color(iconInk))
		}
		.frame(width: 13 * u, height: 13 * u)
	}
}
