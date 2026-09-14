import SwiftUI

private let cardBg = Color(argb: 0xFF10182B)
private let muted = Color(argb: 0xFF819ABB)
private let bodyInk = Color(argb: 0xFFC8D2E0)
private let green = Color(argb: 0xFF2FD08A)
private let red = Color(argb: 0xFFE5484D)
private let badgeBg = Color(argb: 0xFF242B3D)
private let badgeInk = Color(argb: 0xFF9EADC7)

/// What the results show - the board's filter chips.
private enum SearchFilter: String, CaseIterable {
	case all = "All", stocks = "Stocks", news = "News", saved = "Saved"
}

/// Home · Search (FigJam Home board, 2026-09-14: Search -> Search bar, Filters,
/// Results). No frame exists for it, so it borrows the settings pages' language.
/// Stocks come from the catalogue, stories from the news feed; a stock row opens
/// its Stock Detail, a story its article. An empty query shows the day's movers
/// and the user's saves. Mirrors android Home/SearchScreen.kt.
struct SearchView: View {
	let onBack: () -> Void
	let onOpenStock: (String) -> Void
	let onOpenArticle: (String) -> Void
	/// A saved stock opens the My STAK flavour of Stock Detail (review 2026-09-14).
	var onOpenSavedStock: (String) -> Void = { _ in }

	@State private var query = ""
	@State private var filter = SearchFilter.all
	@FocusState private var focused: Bool
	/// The keyboard rises once per page life, not on every return from a result (review 2026-09-14).
	@State private var focusedOnce = false
	@ObservedObject private var holdings = MyStakHoldings.shared

	var body: some View {
		let u = figmaUnit
		let held = holdings.tickers
		let q = query.trimmingCharacters(in: .whitespaces)
		let stocks = q.isEmpty ? StockCatalogue.trending() : StockCatalogue.search(q)
		let saved = (q.isEmpty ? StockCatalogue.all : StockCatalogue.search(q)).filter { held.contains($0.ticker) }
		let stories: [NewsArticleFeed.Article] = q.isEmpty ? [] : NewsArticleFeed.searchable().filter { a in
			a.headline.localizedCaseInsensitiveContains(q) || a.category.localizedCaseInsensitiveContains(q) ||
				a.relatedTickers.contains { $0.caseInsensitiveCompare(q) == .orderedSame } || a.source.localizedCaseInsensitiveContains(q)
		}
		let showStocks = filter == .all || filter == .stocks
		let showNews = filter == .all || filter == .news
		let showSaved = filter == .saved

		VStack(spacing: 0) {
			// Header: back circle + the search bar.
			HStack(spacing: 12 * u) {
				AuthBackCircle(action: onBack)
				HStack(spacing: 8 * u) {
					SearchGlyph(size: 14 * u, tint: muted)
					TextField("", text: $query, prompt: Text("Search stocks and news").font(StakFont.geist(13 * u)).foregroundStyle(muted))
						.font(StakFont.geist(13 * u))
						.foregroundStyle(StakColors.textPrimary)
						.tint(StakColors.accent)
						.textInputAutocapitalization(.never)
						.autocorrectionDisabled()
						.submitLabel(.search)
						.focused($focused)
						.accessibilityLabel("Search")
					if !query.isEmpty {
						Button { query = "" } label: {
							Text("✕").font(StakFont.geist(13 * u)).foregroundStyle(muted)
						}
						.buttonStyle(.pressDim)
						.accessibilityLabel("Clear search")
					}
				}
				.padding(.horizontal, 14 * u)
				.frame(maxWidth: .infinity)
				.frame(height: 44 * u)
				.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 8 * u)
			.padding(.bottom, 12 * u)
			// Filters.
			HStack(spacing: 8 * u) {
				ForEach(SearchFilter.allCases, id: \.self) { f in
					SettingsChip(label: f.rawValue, selected: filter == f) { filter = f }
				}
				Spacer()
			}
			.padding(.horizontal, 20 * u)
			ScrollView(showsIndicators: false) {
				VStack(alignment: .leading, spacing: 12 * u) {
					if showStocks && !stocks.isEmpty {
						SectionKicker(text: q.isEmpty ? "TRENDING TODAY" : "STOCKS")
						ResultCard { ForEach(stocks) { s in StockRow(stock: s, saved: held.contains(s.ticker)) { (held.contains(s.ticker) ? onOpenSavedStock : onOpenStock)(s.ticker) } } }
					}
					if showSaved {
						SectionKicker(text: "IN YOUR STAK")
						if saved.isEmpty {
							EmptyLine(text: q.isEmpty ? "Nothing saved yet. Swipe the deck to start." : "None of your saves match “\(q)”.")
						} else {
							ResultCard { ForEach(saved) { s in StockRow(stock: s, saved: true) { onOpenSavedStock(s.ticker) } } }
						}
					}
					if showNews {
						if !stories.isEmpty {
							SectionKicker(text: "NEWS")
							ResultCard { ForEach(stories, id: \.id) { a in StoryRow(article: a) { onOpenArticle(a.id) } } }
						} else if !q.isEmpty && filter == .news {
							EmptyLine(text: "No stories match “\(q)”.")
						} else if filter == .news {
							EmptyLine(text: "Type to search stories.")
						}
					}
					if !q.isEmpty && filter == .all && stocks.isEmpty && stories.isEmpty {
						EmptyLine(text: "Nothing for “\(q)”. Try a ticker like NVDA or a company name.")
					}
					if !q.isEmpty && filter == .stocks && stocks.isEmpty {
						EmptyLine(text: "No stocks match “\(q)”.")
					}
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, 16 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
		.background(StakColors.bg.ignoresSafeArea())
		.onAppear { if !focusedOnce { focusedOnce = true; focused = true } }
	}
}

private struct EmptyLine: View {
	let text: String
	var body: some View {
		Text(text).font(StakFont.geist(12 * figmaUnit)).foregroundStyle(bodyInk)
	}
}

private struct ResultCard<Content: View>: View {
	@ViewBuilder let content: () -> Content
	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) { content() }
			.padding(.vertical, 4 * u)
			.frame(maxWidth: .infinity)
			.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

/// A stock result: badge circle, ticker + company, quote + day move, and the saved tick.
struct StockRow: View {
	let stock: CollStock
	let saved: Bool
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			HStack(spacing: 12 * u) {
				ZStack {
					Circle().fill(badgeBg)
					Text(stock.badge).font(StakFont.sora(13 * u, .semiBold)).foregroundStyle(badgeInk)
				}
				.frame(width: 32 * u, height: 32 * u)
				VStack(alignment: .leading, spacing: 2 * u) {
					HStack(spacing: 6 * u) {
						Text(stock.ticker).font(StakFont.geist(13 * u, .medium)).foregroundStyle(StakColors.textPrimary)
						if saved {
							Text("In your STAK").font(StakFont.geist(10 * u, .medium)).foregroundStyle(Color(argb: 0xFF7FD4E8))
						}
					}
					Text(stock.company).font(StakFont.geist(11 * u)).foregroundStyle(muted)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				VStack(alignment: .trailing, spacing: 2 * u) {
					Text(stock.price).font(StakFont.geist(13 * u, .medium)).foregroundStyle(StakColors.textPrimary)
					Text(stock.change).font(StakFont.geist(11 * u, .medium)).foregroundStyle(stock.up ? green : red)
				}
			}
			.padding(.horizontal, 14 * u)
			.frame(maxWidth: .infinity)
			.frame(height: 56 * u)
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
	}
}

private struct StoryRow: View {
	let article: NewsArticleFeed.Article
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			VStack(alignment: .leading, spacing: 4 * u) {
				Text("\(article.source) · \(article.age) · \(article.category)").font(StakFont.geist(11 * u)).foregroundStyle(muted)
				Text(article.headline).font(StakFont.geist(13 * u, .medium)).foregroundStyle(StakColors.textPrimary).multilineTextAlignment(.leading)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.horizontal, 14 * u)
			.padding(.vertical, 10 * u)
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
	}
}
