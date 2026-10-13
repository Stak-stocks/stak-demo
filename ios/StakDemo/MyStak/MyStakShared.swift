import SwiftUI

/// The My STAK pages' shared palette (overview, all collections, Taste Graph, What changed). Mirrors android
/// ui/mystak/MyStakShared.kt.
enum Stak {
	static let cardBg = Color(argb: 0xFF181F30)
	static let muted = Color(argb: 0xFF819ABB)
	static let faint = Color(argb: 0xFF5C6B85)
	static let body = Color(argb: 0xFFC8D2E0)
	static let teal = Color(argb: 0xFF69B3CA)
	static let headerGray = Color(argb: 0xFFD3D3DD)
	static let divider = Color(argb: 0xFF2A3346)
}

/// One collection chip's content, whichever account it came from.
struct CollectionEntry: Identifiable {
	let id: String
	let name: String
	let count: Int
	var image: String? = nil
	var icon: String? = nil
	/// One of its companies has an update nobody has opened yet.
	var hasUpdate = false
}

/// Every collection on screen, with the dot for one whose company has an unopened update. The demo persona keeps its
/// six authored collections; a real account's are its own saved categories.
@MainActor
func collectionEntries(demo: Bool, groups: [MyStakViewModel.Group], unreadTickers: Set<String>) -> [CollectionEntry] {
	if demo {
		let held = MyStakHoldings.shared.tickers
		return StakCollections.all.map { c in
			let stocks = c.held(in: held)
			return CollectionEntry(
				id: c.id, name: c.name, count: stocks.count, image: c.image, icon: c.icon,
				hasUpdate: stocks.contains { unreadTickers.contains($0.ticker) }
			)
		}
	}
	// Its own category's icon: the glass art is drawn per family, so Chips and Big Tech - and Streaming and
	// E-commerce - arrived wearing the same picture.
	return groups.map { g in
		CollectionEntry(id: g.id, name: g.name, count: g.holdings.count, hasUpdate: g.holdings.contains { unreadTickers.contains($0.ticker) })
	}
}

/// The Taste Mix palette: one shade of blue per ranked theme, strongest lightest - shades of the app's own blue rather
/// than six hues, which read as decoration.
private let tastePalette: [Color] = [
	Color(argb: 0xFF9BD7EC), Color(argb: 0xFF69B3CA), Color(argb: 0xFF4A8FC0),
	Color(argb: 0xFF356F9F), Color(argb: 0xFF2A5476), Color(argb: 0xFF223D57),
]

func themeColor(_ colorKey: String) -> Color {
	guard colorKey.hasPrefix("t"), let i = Int(colorKey.dropFirst()), tastePalette.indices.contains(i) else { return Stak.faint }
	return tastePalette[i]
}

struct StakSectionHeader: View {
	let title: String

	var body: some View {
		Text(title)
			.font(StakFont.sora(16 * figmaUnit, .semiBold))
			.stakLineHeight(20 * figmaUnit, size: 16 * figmaUnit, face: .sora)
			.foregroundStyle(Stak.headerGray)
			.accessibilityAddTraits(.isHeader)
	}
}

/// A small marked tile - the shape every icon on the My STAK pages (and the stock page's cards) wears.
struct StakIconTile: View {
	let icon: String
	let tint: Color
	var size: CGFloat = 34
	var glyph: CGFloat = 20
	var radius: CGFloat = 10

	var body: some View {
		let u = figmaUnit
		Image(icon)
			.resizable()
			.scaledToFit()
			.frame(width: glyph * u, height: glyph * u)
			.frame(width: size * u, height: size * u)
			.background(tint.opacity(0.18), in: RoundedRectangle(cornerRadius: radius * u))
			.accessibilityHidden(true)
	}
}

/// Two-column collection chips, as the overview and the full list both draw them.
struct CollectionGrid: View {
	let entries: [CollectionEntry]
	let onOpen: (String) -> Void

	var body: some View {
		let u = figmaUnit
		let rows = stride(from: 0, to: entries.count, by: 2).map { Array(entries[$0..<min($0 + 2, entries.count)]) }
		VStack(spacing: 10 * u) {
			ForEach(rows, id: \.first!.id) { pair in
				HStack(spacing: 10 * u) {
					ForEach(pair) { c in
						CollectionChip(entry: c) { onOpen(c.id) }
					}
					// A lone chip keeps its column instead of stretching across the row.
					if pair.count == 1 { Color.clear.frame(maxWidth: .infinity, maxHeight: 0) }
				}
			}
		}
		.frame(maxWidth: .infinity)
	}
}

/// One collection chip — art/icon, name + count, chevron (#181f30 r12), and a corner dot for an unopened update.
private struct CollectionChip: View {
	let entry: CollectionEntry
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			HStack(spacing: 10 * u) {
				if let image = entry.image {
					// The demo persona keeps its authored glass art.
					Image(image)
						.resizable()
						.scaledToFill()
						.frame(width: 34 * u, height: 34 * u)
						.clipped()
				} else if let icon = entry.icon {
					Image(icon)
						.resizable()
						.frame(width: 36 * u, height: 36 * u)
				} else {
					StakIconTile(icon: categoryIcon(entry.name), tint: Stak.teal)
				}
				VStack(alignment: .leading, spacing: 2 * u) {
					// Authored: "Green Energy" (box 90) overflows its 84 column - the frame draws it past the column, so
					// it's never wrapped or clipped; enlarged, it truncates instead of drawing over the next tile.
					Text(entry.name)
						.font(StakFont.sora(13 * u, .semiBold))
						.stakLineHeight(16 * u, size: 13 * u, face: .sora)
						.foregroundStyle(StakColors.textPrimary)
						.lineLimit(1)
						.fixedSize(horizontal: typeScale <= 1, vertical: false)
					Text(heldCountLabel(entry.count))
						.font(StakFont.geist(11 * u))
						.stakLineHeight(14 * u, size: 11 * u, face: .geist)
						.foregroundStyle(Stak.muted)
						.lineLimit(1)
						.fixedSize(horizontal: typeScale <= 1, vertical: false)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				Text("›")
					.font(StakFont.geist(16 * u))
					.foregroundStyle(Stak.faint)
					.accessibilityHidden(true)
			}
			.padding(12 * u)
			.background(Stak.cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
			// A corner badge, not inline with the name - it crowded a longer one.
			.overlay(alignment: .topTrailing) {
				if entry.hasUpdate {
					Circle().fill(Stak.teal)
						.frame(width: 8 * u, height: 8 * u)
						.padding(8 * u)
				}
			}
		}
		.buttonStyle(.pressDim)
		.frame(maxWidth: .infinity)
		.accessibilityElement(children: .ignore)
		.accessibilityLabel("\(entry.name), \(heldCountLabel(entry.count))\(entry.hasUpdate ? ", new update" : "")")
		.accessibilityAddTraits(.isButton)
	}
}
