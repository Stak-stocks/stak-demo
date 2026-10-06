import SwiftUI

private let cardBg = Color(argb: 0xFF171D2C)
private let muted = Color(argb: 0xFF819ABB)
private let green = Color(argb: 0xFF2FD08A)
private let red = Color(argb: 0xFFE5484D)
private let teal = Color(argb: 0xFF69B3CA)
private let badgeBg = Color(argb: 0xFF242B3D)
private let badgeInk = Color(argb: 0xFF9EADC7)

/// The Home dashboard's two board-only sections (FigJam Home board, 2026-09-14:
/// Dashboard -> Trending stocks, Saved peek). They sit under the authored stack
/// (mood card, why-card, deck banner) so the frame-exact part of Home is
/// untouched. Mirrors android ui/home/HomeExtras.kt.
struct SectionKicker: View {
	let text: String
	var body: some View {
		Text(text)
			.font(StakFont.geist(11 * figmaUnit, .medium))
			.foregroundStyle(muted)
			.frame(maxWidth: .infinity, alignment: .leading)
	}
}

/// The day's biggest movers as a horizontal strip of tiles; a tap opens the stock.
struct TrendingStrip: View {
	let onOpenStock: (String) -> Void

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 10 * u) {
			SectionKicker(text: "TRENDING TODAY")
			ScrollView(.horizontal, showsIndicators: false) {
				HStack(spacing: 8 * u) {
					ForEach(StockCatalogue.trending()) { s in
						Button { onOpenStock(s.ticker) } label: {
							VStack(alignment: .leading, spacing: 6 * u) {
								HStack(spacing: 8 * u) {
									ZStack {
										Circle().fill(badgeBg)
										Text(s.badge)
											.font(StakFont.sora(11 * u, .semiBold))
											.foregroundStyle(badgeInk)
									}
									.frame(width: 24 * u, height: 24 * u)
									Text(s.ticker)
										.font(StakFont.geist(13 * u, .medium))
										.foregroundStyle(StakColors.textPrimary)
								}
								Text(s.price)
									.font(StakFont.geist(12 * u))
									.foregroundStyle(StakColors.textPrimary)
								Text(s.change)
									.font(StakFont.geist(11 * u, .medium))
									.foregroundStyle(s.up ? green : red)
							}
							.frame(width: 108 * u - 24 * u, alignment: .leading)
							.padding(12 * u)
							.background(cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
						}
						.buttonStyle(.pressDim)
					}
				}
			}
		}
	}
}

/// A peek at the user's saves - up to three tickers and See all; empty accounts are pointed at the deck.
struct SavedPeekCard: View {
	let onOpenStock: (String) -> Void
	let onOpenMyStak: () -> Void
	let onOpenDeck: () -> Void
	@ObservedObject private var holdings = MyStakHoldings.shared

	var body: some View {
		let u = figmaUnit
		let held = holdings.tickers
		let peek = Array(StockCatalogue.all.filter { held.contains($0.ticker) }.prefix(3))
		VStack(alignment: .leading, spacing: 10 * u) {
			HStack {
				Text("IN YOUR STAK")
					.font(StakFont.geist(11 * u, .medium))
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
				Text(held.isEmpty ? "Nothing saved yet. Swipe today’s deck and your saves show up here." : "Your saves live in My STAK.")
					.font(StakFont.geist(12 * u, .light))
					.foregroundStyle(StakColors.textPrimary)
			} else {
				ForEach(peek) { s in
					Button { onOpenStock(s.ticker) } label: {
						HStack(spacing: 10 * u) {
							ZStack {
								Circle().fill(badgeBg)
								Text(s.badge)
									.font(StakFont.sora(12 * u, .semiBold))
									.foregroundStyle(badgeInk)
							}
							.frame(width: 28 * u, height: 28 * u)
							VStack(alignment: .leading, spacing: 0) {
								Text(s.ticker)
									.font(StakFont.geist(13 * u, .medium))
									.foregroundStyle(StakColors.textPrimary)
								Text(s.company)
									.font(StakFont.geist(11 * u))
									.foregroundStyle(muted)
							}
							.frame(maxWidth: .infinity, alignment: .leading)
							Text(s.change)
								.font(StakFont.geist(11 * u, .medium))
								.foregroundStyle(s.up ? green : red)
						}
						.contentShape(Rectangle())
					}
					.buttonStyle(.pressDim)
				}
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(14 * u)
		.background(cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
	}
}
