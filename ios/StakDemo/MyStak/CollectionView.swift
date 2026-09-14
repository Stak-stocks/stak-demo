import SwiftUI

// File-private palette — mirrors the Android CollectionScreen.kt literals verbatim.
private let cardBg = Color(argb: 0xFF181F30)
private let muted = Color(argb: 0xFF819ABB)
private let faint = Color(argb: 0xFF5C6B85)
private let green = Color(argb: 0xFF2FD08A)
private let redDown = Color(argb: 0xFFE5484D)
private let badgeInk = Color(argb: 0xFF9EADC7)

/// The stock-sized template a lone Add-stock row measures against (hidden).
private let ghostStock = CollStock(badge: "A", change: "▲ 0.0%", up: true, ticker: "AAPL", company: "Apple", price: "$0.00")

/// 06 · My STAK — "Collection · Cards A · corrected" (CHINEDU 1:3333).
/// The Collection page: hero (art, title, meta, blurb) and the stock-tile
/// grid with the dashed Add-stock card. Codex parity audit (2026-09-04):
/// the authored AI & Tech frame is the template - it serves whichever
/// collection the Overview chip carried (MyStak/Collections.swift), and
/// tapping a tile opens THAT stock's saved Stock Detail.
/// Every metric is scaled by the 390pt artboard unit (`figmaUnit`),
/// exactly like the Android build's `u` scaling.
/// Ported from android/ ui/mystak/CollectionScreen.kt.
struct CollectionView: View {
	let collection: StakCollection
	let onBack: () -> Void
	let onOpenStock: (String) -> Void
	/// Add stock -> the Discover deck, the app's only add path (Codex audit 2026-09-04).
	var onAddStock: () -> Void = {}
	/// Codex audit (2026-09-04): the hero count and the grid render the
	/// held stocks, so a deck save or an Unsave updates the page live.
	@ObservedObject private var holdings = MyStakHoldings.shared

	/// Sort (FigJam Watchlist board, 2026-09-14): newest save first, A-Z, or the day's
	/// biggest movers; Remove = a long press on a tile, confirmed inline. Mirrors Android.
	private enum Sort: String, CaseIterable { case newest = "Newest", az = "A\u{2013}Z", movers = "Top movers" }
	@State private var sort = Sort.newest
	@State private var removing: String? = nil

	private var held: [CollStock] {
		let base = collection.held(in: holdings.tickers)
		switch sort {
		case .az: return base.sorted { $0.ticker < $1.ticker }
		case .movers: return base.sorted { abs(StakInsights.changePct($0)) > abs(StakInsights.changePct($1)) }
		case .newest:
			let order = Dictionary(uniqueKeysWithValues: collection.stocks.enumerated().map { ($1.ticker, $0) })
			return base.sorted { a, b in
				let da = holdings.daysSinceSaved(a.ticker) ?? Int.max
				let db = holdings.daysSinceSaved(b.ticker) ?? Int.max
				return da != db ? da < db : (order[a.ticker] ?? 0) < (order[b.ticker] ?? 0)
			}
		}
	}

	/// One grid cell. `ghost` is an invisible stock-sized filler: it keeps a
	/// lone Add-stock tile at the authored half width and tile height.
	private enum GridCell: Identifiable {
		case stock(CollStock)
		case add
		case ghost
		var id: String {
			switch self {
			case .stock(let s): return s.ticker
			case .add: return "add"
			case .ghost: return "ghost"
			}
		}
	}

	/// The Android `chunked(2)` rows — pairs of tiles. Codex audit
	/// (2026-09-04): the Add-stock tile is ALWAYS the last cell, on a new
	/// row when the held count is even (or zero), so an emptied collection
	/// still offers "Add stock". Mirrors android ui/mystak/CollectionScreen.kt.
	private var gridRows: [[GridCell]] {
		var cells: [GridCell] = held.map { .stock($0) } + [.add]
		if cells.count % 2 == 1 { cells.append(.ghost) }
		return stride(from: 0, to: cells.count, by: 2).map { Array(cells[$0..<$0 + 2]) }
	}

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) {
			HStack {
				AuthBackCircle(action: onBack)
				Spacer()
				Text(collection.name)
					.font(StakFont.sora(16 * u, .semiBold))
					.foregroundStyle(StakColors.textPrimary)
				Spacer()
				// No designed menu yet (Codex audit 2026-09-04) - decorative until the designer draws one.
				ZStack {
					Circle().fill(cardBg)
					Image("IcMoreDots")
						.resizable()
						.frame(width: 24 * u, height: 24 * u)
				}
				.frame(width: 40 * u, height: 40 * u)
				.accessibilityHidden(true)
			}
			.padding(.leading, 16 * u)
			.padding(.trailing, 18 * u)
			.padding(.vertical, 8 * u)

			ScrollView {
				VStack(spacing: 20 * u) {
					hero
					if held.count > 1 {
						HStack(spacing: 8 * u) {
							ForEach(Sort.allCases, id: \.self) { s in
								SettingsChip(label: s.rawValue, selected: sort == s) { sort = s }
							}
							Spacer()
						}
					}
					if let ticker = removing {
						HStack(spacing: 12 * u) {
							Text("Remove \(ticker) from My STAK?")
								.font(StakFont.geist(13 * u, .medium))
								.foregroundStyle(StakColors.textPrimary)
								.frame(maxWidth: .infinity, alignment: .leading)
							Button { removing = nil } label: {
								Text("Keep").font(StakFont.geist(13 * u, .medium)).foregroundStyle(muted)
							}
							.buttonStyle(.pressDim)
							Button {
								// The same three stores Stock Detail's Unsave clears.
								DeckSession.shared.saved.remove(ticker)
								MyStakHoldings.shared.remove(ticker)
								NewsSaves.shared.removeStories(ticker: ticker)
								removing = nil
							} label: {
								Text("Remove").font(StakFont.geist(13 * u, .medium)).foregroundStyle(redDown)
							}
							.buttonStyle(.pressDim)
						}
						.padding(.horizontal, 14 * u)
						.padding(.vertical, 12 * u)
						.background(cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
					}
					grid
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, 16 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	private var hero: some View {
		let u = figmaUnit
		return VStack(alignment: .leading, spacing: 10 * u) {
			// Every collection's hero is its own 60u art, the AI & Tech treatment
			// (1:3357) - user, 2026-09-05. Mirrors android CollectionScreen.
			Image(collection.hero)
				.resizable()
				.scaledToFill()
				.frame(width: 60 * u, height: 60 * u)
				.clipped()
			Text(collection.name)
				.font(StakFont.sora(26 * u, .semiBold))
				.foregroundStyle(StakColors.textPrimary)
			HStack(spacing: 7 * u) {
				Text(heldCountLabel(held.count))
					.font(StakFont.geist(13 * u))
					.foregroundStyle(muted)
				Text("·")
					.font(StakFont.geist(13 * u))
					.foregroundStyle(faint)
				// The persona keeps the authored 1:3333 literal; a first-time user's
				// collection reads the week move of ITS held stocks, none while it is
				// empty (audit 2026-09-07: "0 stocks · +2.4% this week").
				let ownMove: Double? = Session.shared.demoAccount || held.isEmpty ? nil
					: held.reduce(0.0) { $0 + StakInsights.changePct($1) } / Double(held.count)
				if Session.shared.demoAccount || ownMove != nil {
					Text(ownMove.map { StakInsights.signedPct($0) + " this week" } ?? "+2.4% this week")
						.font(StakFont.geist(13 * u, .medium))
						.foregroundStyle((ownMove ?? 0) < 0 ? Color(argb: 0xFFE5484D) : green)
				}
			}
			Text(collection.blurb)
				.font(StakFont.geist(13 * u))
				.foregroundStyle(Color(argb: 0xFFC8D2E0))
		}
		.frame(maxWidth: .infinity, alignment: .leading)
	}

	private var grid: some View {
		let u = figmaUnit
		return VStack(spacing: 10 * u) {
			ForEach(Array(gridRows.enumerated()), id: \.offset) { _, row in
				// Authored tile rows are 139 tall (1:3333): pinned, so every row lands on
				// the frame's grid and the Add card matches (mirrors Android, 2026-09-05).
				HStack(spacing: 10 * u) {
					ForEach(row) { cell in
						switch cell {
						case .stock(let stock):
							// Authored (1:3375 template): EVERY card opens the saved
							// Stock Detail, Instant - serving the tapped ticker
							// (Codex parity audit, 2026-09-04).
							StockTile(stock: stock) {
								onOpenStock(stock.ticker)
							}
							// A long press offers Remove (FigJam Watchlist board, 2026-09-14) - the inline
							// confirm only, mirroring Android's combinedClickable(onLongClick); simultaneous
							// so the tap still reaches the Button (review 2026-09-14).
							.simultaneousGesture(LongPressGesture().onEnded { _ in removing = stock.ticker })
							// VoiceOver cannot discover a long press: the same action by name (mirrors Android's onLongClickLabel).
							.accessibilityAction(named: Text("Remove from My STAK")) { removing = stock.ticker }
						case .add:
							AddStockTile(action: onAddStock)
						case .ghost:
							// Hidden template tile - layout only, never hit or read.
							StockTile(stock: ghostStock) {}
								.hidden()
						}
					}
				}
				.frame(height: 139 * u)
			}
		}
		.frame(maxWidth: .infinity)
	}
}

private struct StockTile: View {
	let stock: CollStock
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			VStack(alignment: .leading, spacing: 10 * u) {
				HStack {
					ZStack {
						Circle().fill(Color(argb: 0xFF242B3D))
						Text(stock.badge)
							.font(StakFont.sora(14 * u, .semiBold))
							.foregroundStyle(badgeInk)
					}
					.frame(width: 36 * u, height: 36 * u)
					Spacer(minLength: 0)
					Text(stock.change)
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(stock.up ? green : redDown)
				}
				VStack(alignment: .leading, spacing: 2 * u) {
					Text(stock.ticker)
						.font(StakFont.sora(16 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
					Text(stock.company)
						.font(StakFont.geist(11 * u))
						.foregroundStyle(muted)
				}
				Text(stock.price)
					.font(StakFont.sora(15 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
			}
			.padding(14 * u)
			.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
			.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
		}
		.buttonStyle(.pressDim)
	}
}

/// Dashed 1.5u #2a3346 r16 add card — 6 on / 5 off dash pattern.
/// A plain Button (Codex audit 2026-09-04): adding = the Discover deck.
private struct AddStockTile: View {
	var action: () -> Void = {}

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			VStack(spacing: 8 * u) {
				Image("IcPlusCircle")
					.resizable()
					.frame(width: 24 * u, height: 24 * u)
				Text("Add stock")
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(muted)
			}
			.padding(14 * u)
			.frame(maxWidth: .infinity, maxHeight: .infinity)
			.overlay(
				RoundedRectangle(cornerRadius: 16 * u)
					.stroke(Color(argb: 0xFF2A3346), style: StrokeStyle(lineWidth: 1.5 * u, dash: [6 * u, 5 * u]))
			)
		}
		.buttonStyle(.pressDim)
	}
}
