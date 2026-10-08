import SwiftUI

private let cardBg = Color(argb: 0xFF171D2C)
private let muted = Color(argb: 0xFF819ABB)
private let green = Color(argb: 0xFF2FD08A)
private let red = Color(argb: 0xFFE5484D)
private let teal = Color(argb: 0xFF69B3CA)
private let badgeBg = Color(argb: 0xFF242B3D)
private let badgeInk = Color(argb: 0xFF9EADC7)

/// The Home dashboard's two board-only sections (FigJam Home board, 2026-09-14: Dashboard -> Trending stocks, Saved
/// peek). They sit under the authored stack (mood card, why-card, deck banner) so the frame-exact part of Home is
/// untouched. Mirrors android ui/home/HomeExtras.kt.
struct SectionKicker: View {
	let text: String
	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(11 * u, .medium))
			.stakLineHeight(14 * u, size: 11 * u, face: .geist)
			.foregroundStyle(muted)
			.frame(maxWidth: .infinity, alignment: .leading)
	}
}

/// "▲ 1.2%" - one decimal, as Android's "%.1f". Shared by Home, the collection tiles, Simulate and the tickets.
func moveText(_ changePercent: Double) -> String {
	(changePercent >= 0 ? "▲ " : "▼ ") + String(format: "%.1f", abs(changePercent)) + "%"
}

/// "up 1.2 percent" - what VoiceOver reads instead of the triangle.
private func spokenMove(_ changePercent: Double) -> String {
	"\(changePercent >= 0 ? "up" : "down") \(String(format: "%.1f", abs(changePercent))) percent"
}

/// The day's biggest movers as a horizontal strip of tiles; a tap opens the stock. Real market data for every
/// account - the whole watchlist's movement, not anyone's saves. Renders nothing while loading or if the request
/// failed.
struct TrendingStrip: View {
	let stocks: [TrendingStock]?
	let onOpenStock: (String) -> Void

	var body: some View {
		let u = figmaUnit
		if let stocks, !stocks.isEmpty {
			VStack(alignment: .leading, spacing: 10 * u) {
				SectionKicker(text: "TRENDING TODAY")
				ScrollView(.horizontal, showsIndicators: false) {
					HStack(spacing: 8 * u) {
						ForEach(stocks, id: \.ticker) { s in
							Button { onOpenStock(s.ticker) } label: {
								VStack(alignment: .leading, spacing: 6 * u) {
									HStack(spacing: 8 * u) {
										ZStack {
											Circle().fill(badgeBg)
											Text(String(s.ticker.prefix(1)))
												.font(StakFont.sora(11 * u, .semiBold))
												.foregroundStyle(badgeInk)
										}
										.frame(width: 24 * u * typeScale, height: 24 * u * typeScale)
										Text(s.ticker)
											.font(StakFont.geist(13 * u, .medium))
											.foregroundStyle(Color.white)
									}
									Text("$" + String(format: "%.2f", s.price))
										.font(StakFont.geist(12 * u))
										.foregroundStyle(Color.white)
									// Before the open or at a weekend the move is the last session's: "on Friday", not "today".
									Text(StakClock.sessionChange(formatChange(s.changePercent)))
										.font(StakFont.geist(11 * u, .medium))
										.foregroundStyle(s.changePercent >= 0 ? green : red)
								}
								.frame(width: 108 * u - 24 * u, alignment: .leading)
								.padding(12 * u)
								.background(cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
							}
							.buttonStyle(.pressDim)
							.accessibilityLabel("\(s.ticker), \(s.name), $\(String(format: "%.2f", s.price)), \(spokenMove(s.changePercent)) today")
						}
					}
				}
			}
		}
	}
}

/// A peek at the user's saves - up to three tickers and See all; empty accounts are pointed at the deck. The rows are
/// held by construction, so they open the saved (My STAK) flavour of Stock Detail. The company name comes from the
/// account's own saved-stock record where one exists; the demo persona's seeded tickers fall back to the collection
/// catalogue. The move is always a live quote - never the catalogue's fixed one.
struct SavedPeekCard: View {
	let onOpenStock: (String) -> Void
	let onOpenMyStak: () -> Void
	let onOpenDeck: () -> Void
	@ObservedObject var homeVM: HomeViewModel
	@ObservedObject private var holdings = MyStakHoldings.shared

	var body: some View {
		let u = figmaUnit
		let held = holdings.tickers
		let peek = Array(held.sorted().prefix(3))
		VStack(alignment: .leading, spacing: 10 * u) {
			HStack {
				Text("IN YOUR STAK")
					.font(StakFont.geist(11 * u, .medium))
					.stakLineHeight(14 * u, size: 11 * u, face: .geist)
					.foregroundStyle(muted)
				Spacer()
				Button { if held.isEmpty { onOpenDeck() } else { onOpenMyStak() } } label: {
					Text(held.isEmpty ? "Go to deck ›" : "See all \(held.count) ›")
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(teal)
				}
				.buttonStyle(.pressDim)
			}
			if peek.isEmpty {
				Text("Nothing saved yet. Swipe today’s deck and your saves show up here.")
					.font(StakFont.geist(12 * u, .light))
					.stakLineHeight(15 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Color.white)
					.fixedSize(horizontal: false, vertical: true)
			} else {
				ForEach(peek, id: \.self) { ticker in
					let name = holdings.nameOf(ticker) ?? StockCatalogue.all.first { $0.ticker == ticker }?.company ?? ticker
					let move = homeVM.savedMoves[ticker]
					Button { onOpenStock(ticker) } label: {
						HStack(spacing: 10 * u) {
							ZStack {
								Circle().fill(badgeBg)
								Text(String(ticker.prefix(1)))
									.font(StakFont.sora(12 * u, .semiBold))
									.foregroundStyle(badgeInk)
							}
							.frame(width: 28 * u * typeScale, height: 28 * u * typeScale)
							VStack(alignment: .leading, spacing: 0) {
								Text(ticker)
									.font(StakFont.geist(13 * u, .medium))
									.foregroundStyle(Color.white)
								Text(name)
									.font(StakFont.geist(11 * u))
									.foregroundStyle(muted)
							}
							.frame(maxWidth: .infinity, alignment: .leading)
							Text(move.map(moveText) ?? "—")
								.font(StakFont.geist(11 * u, .medium))
								.foregroundStyle(move.map { $0 >= 0 ? green : red } ?? muted)
						}
						.contentShape(Rectangle())
					}
					.buttonStyle(.pressDim)
					.accessibilityLabel("\(ticker), \(name)\(move.map { ", " + spokenMove($0) } ?? "")")
				}
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(14 * u)
		.background(cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
		.task(id: peek) { await homeVM.refreshSavedMoves(peek) }
	}
}
