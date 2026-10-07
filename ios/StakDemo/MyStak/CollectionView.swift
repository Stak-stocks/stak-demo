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
/// grid with the dashed Add-stock card. The demo account's chips serve the
/// authored catalog (MyStak/Collections.swift); a real account's serve its
/// own saved category, with live prices. Tapping a tile opens THAT stock's
/// saved Stock Detail.
/// Every metric is scaled by the 390pt artboard unit (`figmaUnit`),
/// exactly like the Android build's `u` scaling.
/// Ported from android/ ui/mystak/CollectionScreen.kt.
struct CollectionView: View {
	let collectionId: String
	let onBack: () -> Void
	let onOpenStock: (String) -> Void
	/// Add stock -> the Discover deck, the app's only add path (Codex audit 2026-09-04).
	var onAddStock: () -> Void = {}
	@ObservedObject var myStakVM: MyStakViewModel
	/// The top of the shell's stack: covered by a stock page, the prices stop refreshing; back on top, quotes over a
	/// minute old are re-read (Android's screen re-enters composition then).
	var isTop = true
	/// Codex audit (2026-09-04): the hero count and the grid render the
	/// held stocks, so a deck save or an Unsave updates the page live.
	@ObservedObject private var holdings = MyStakHoldings.shared
	@ObservedObject private var session = Session.shared
	@Environment(\.scenePhase) private var scenePhase

	/// The authored catalog is the demo account's. A real account's collection is one of its own saved categories
	/// (product audit, 2026-09-05), and its tiles carry live prices instead of the catalog's fixed ones.
	private var collection: StakCollection { StakCollections.collection(collectionId) }
	private var group: MyStakViewModel.Group? { session.demoAccount ? nil : myStakVM.group(collectionId) }
	private var title: String { session.demoAccount ? collection.name : group?.name ?? "Collection" }
	/// Say nothing rather than "0 companies" while the load is still in flight.
	private var pending: Bool { !session.demoAccount && group == nil && myStakVM.loading }

	/// Sort (FigJam Watchlist board, 2026-09-14): newest save first, A-Z, or the day's
	/// biggest movers; Remove = a long press on a tile, confirmed inline. Mirrors Android.
	private enum Sort: String, CaseIterable { case newest = "Newest", az = "A\u{2013}Z", movers = "Top movers" }
	@State private var sort = Sort.newest
	@State private var removing: String? = nil

	/// The tiles in the chosen order - worked out once per render (it's read by the hero, the chips and the grid).
	private func sortedHeld() -> [CollStock] {
		let base = session.demoAccount ? collection.held(in: holdings.tickers) : (group?.holdings ?? []).map(holdingTile)
		switch sort {
		case .az: return base.sorted { $0.ticker < $1.ticker }
		case .movers:
			let moves = Dictionary(base.map { ($0.ticker, abs(StakInsights.changePct($0))) }, uniquingKeysWith: { a, _ in a })
			return base.sorted { a, b in
				let ma = moves[a.ticker] ?? 0, mb = moves[b.ticker] ?? 0
				return ma != mb ? ma > mb : a.ticker < b.ticker
			}
		case .newest:
			// The demo's ties keep the catalog's order; a real account's, the holdings' (A-Z).
			let order = session.demoAccount ? Dictionary(collection.stocks.enumerated().map { ($1.ticker, $0) }, uniquingKeysWith: { a, _ in a }) : [:]
			let days = Dictionary(base.map { ($0.ticker, holdings.daysSinceSaved($0.ticker) ?? Int.max) }, uniquingKeysWith: { a, _ in a })
			return base.sorted { a, b in
				let da = days[a.ticker] ?? Int.max, db = days[b.ticker] ?? Int.max
				if da != db { return da < db }
				let oa = order[a.ticker] ?? -1, ob = order[b.ticker] ?? -1
				return oa != ob ? oa < ob : a.ticker < b.ticker
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
	private func gridRows(_ held: [CollStock]) -> [[GridCell]] {
		var cells: [GridCell] = held.map { .stock($0) } + [.add]
		if cells.count % 2 == 1 { cells.append(.ghost) }
		return stride(from: 0, to: cells.count, by: 2).map { Array(cells[$0..<$0 + 2]) }
	}

	var body: some View {
		let u = figmaUnit
		let held = sortedHeld()
		VStack(spacing: 0) {
			HStack {
				AuthBackCircle(action: onBack)
				Spacer()
				Text(title)
					.font(StakFont.sora(16 * u, .semiBold))
					.foregroundStyle(StakColors.textPrimary)
					.lineLimit(1)
				Spacer()
				// The menu behind the dots was never designed, so they were a drawing users could tap to no effect.
				// Removed until there is a menu; the spacer keeps the title centered.
				Color.clear.frame(width: 40 * u, height: 40 * u)
			}
			.padding(.leading, 16 * u)
			.padding(.trailing, 18 * u)
			.padding(.vertical, 8 * u)

			ScrollView {
				VStack(spacing: 20 * u) {
					hero(held)
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
									.frame(minHeight: 44).contentShape(Rectangle())
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
									.frame(minHeight: 44).contentShape(Rectangle())
							}
							.buttonStyle(.pressDim)
						}
						// No vertical padding: the 44pt Keep / Remove targets give the row its height.
						.padding(.horizontal, 14 * u)
						.background(cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
					}
					grid(held)
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, 16 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		.task(id: CollectionLoadKey(tickers: holdings.tickers, demo: session.demoAccount, isTop: isTop)) {
			if !session.demoAccount && isTop { myStakVM.loadIfNeeded() }
		}
		// Prices keep moving while this is in front, not only when it's opened. Every 30s rather than the stock page's
		// 15: a whole Stak is up to 30 quotes a refresh.
		.task(id: "\(isTop):\(scenePhase == .active):\(session.demoAccount)") {
			guard !session.demoAccount, isTop, scenePhase == .active else { return }
			while true {
				do { try await Task.sleep(nanoseconds: 30_000_000_000) } catch { return }
				myStakVM.refreshQuotes()
			}
		}
	}

	private func hero(_ held: [CollStock]) -> some View {
		let u = figmaUnit
		return VStack(alignment: .leading, spacing: 10 * u) {
			// The demo persona's six collections keep their authored 60 glass art (1:3357). A real account's collection
			// wears its own category icon - the same one the Overview chip shows, so the two pages never disagree about
			// what a category looks like.
			if session.demoAccount {
				Image(collection.hero)
					.resizable()
					.scaledToFill()
					.frame(width: 60 * u, height: 60 * u)
					.clipped()
					.accessibilityHidden(true)
			} else {
				StakIconTile(icon: categoryIcon(title), tint: Stak.teal, size: 60, glyph: 32)
			}
			Text(title)
				.font(StakFont.sora(26 * u, .semiBold))
				.foregroundStyle(StakColors.textPrimary)
				.accessibilityAddTraits(.isHeader)
			HStack(spacing: 7 * u) {
				Text(pending ? "—" : heldCountLabel(held.count))
					.font(StakFont.geist(13 * u))
					.foregroundStyle(muted)
				Text("·")
					.font(StakFont.geist(13 * u))
					.foregroundStyle(faint)
					.accessibilityHidden(true)
				// The demo keeps the authored literal (the weekly move isn't in its data); a real collection shows its
				// own stocks' move today.
				let move = group?.changePct
				Text(session.demoAccount ? "+2.4% this week"
					: pending ? "Loading…"
					: move.map { StakInsights.signedPct($0) + " today" } ?? "No quote yet")
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(session.demoAccount || (move ?? 0) >= 0 ? green : redDown)
			}
			Text(session.demoAccount ? collection.blurb : (group == nil && myStakVM.loading) ? "" : "The \(title) names you've saved.")
				.font(StakFont.geist(13 * u))
				.foregroundStyle(Color(argb: 0xFFC8D2E0))
		}
		.frame(maxWidth: .infinity, alignment: .leading)
	}

	private func grid(_ held: [CollStock]) -> some View {
		let u = figmaUnit
		return VStack(spacing: 10 * u) {
			ForEach(Array(gridRows(held).enumerated()), id: \.offset) { _, row in
				// Rows pinned at 144 (the authored tile is 139, and with every line box pinned its content measures exactly
				// that, leaving the price's descent to be shaved off) - mirrors Android.
				HStack(spacing: 10 * u) {
					ForEach(row) { cell in
						switch cell {
						case .stock(let stock):
							// Authored (1:3375 template): EVERY card opens the saved
							// Stock Detail, Instant - serving the tapped ticker
							// (Codex parity audit, 2026-09-04).
							// A tap opens the stock; a long press offers Remove (FigJam Watchlist board, 2026-09-14) and
							// nothing else - Android's combinedClickable swallows the tap after a long press.
							StockTile(stock: stock, onTap: { onOpenStock(stock.ticker) }, onLongPress: { removing = stock.ticker })
						case .add:
							AddStockTile(action: onAddStock)
						case .ghost:
							// Hidden template tile - layout only, never hit or read.
							StockTile(stock: ghostStock, onTap: {}, onLongPress: {})
								.hidden()
						}
					}
				}
				.frame(height: 144 * u * typeScale)
			}
		}
		.frame(maxWidth: .infinity)
	}
}

/// The tap and long-press handlers (not a Button: a Button fires on release however long it was held, so a long press
/// would open the stock too). Dimmed while pressed, like `.pressDim`.
private struct StockTile: View {
	let stock: CollStock
	let onTap: () -> Void
	let onLongPress: () -> Void
	@State private var pressed = false

	var body: some View {
		let u = figmaUnit
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
					.stakLineHeight(20 * u, size: 16 * u, face: .sora)
					.foregroundStyle(StakColors.textPrimary)
				Text(stock.company)
					.font(StakFont.geist(11 * u))
					.stakLineHeight(14 * u, size: 11 * u, face: .geist)
					.foregroundStyle(muted)
			}
			// Pinned line box: the tile's height is fixed, and the default box clipped the digits' descent.
			Text(stock.price)
				.font(StakFont.sora(15 * u, .medium))
				.stakLineHeight(19 * u, size: 15 * u, face: .sora)
				.foregroundStyle(StakColors.textPrimary)
		}
		.padding(14 * u)
		.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
		.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
		.contentShape(RoundedRectangle(cornerRadius: 16 * u))
		.opacity(pressed ? 0.6 : 1)
		.onTapGesture(perform: onTap)
		.onLongPressGesture(minimumDuration: 0.5, perform: onLongPress) { pressing in
			withAnimation(.easeOut(duration: 0.12)) { pressed = pressing }
		}
		.accessibilityElement(children: .ignore)
		.accessibilityLabel(spokenTile)
		.accessibilityAddTraits(.isButton)
		.accessibilityAction(.default, onTap)
		// VoiceOver can't discover a long press: the same action by name (Android's onLongClickLabel).
		.accessibilityAction(named: Text("Remove from My STAK"), onLongPress)
	}

	/// "AAPL, Apple, $189.20, up 1.2% today".
	private var spokenTile: String {
		let move: String = stock.change == "—" ? "no quote yet"
			: (stock.up ? "up " : "down ") + stock.change.filter { $0.isNumber || $0 == "." || $0 == "%" } + " today"
		return "\(stock.ticker), \(stock.company), \(stock.price == "—" ? "price loading" : stock.price), \(move)"
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

/// A saved stock in the authored tile's shape (1:3333) - same badge, change, price and company line, with the account's
/// own numbers. A stock with no quote back yet reads "—" rather than a made-up price.
private func holdingTile(_ h: MyStakViewModel.Holding) -> CollStock {
	let pct = h.changePct
	return CollStock(
		badge: String(h.ticker.prefix(1)),
		change: pct.map(moveText) ?? "—",
		up: (pct ?? 0) >= 0,
		ticker: h.ticker,
		company: h.name,
		price: h.price.map(formatPrice) ?? "—"
	)
}

/// What the load task watches: the saved set, the account, and whether the page is back on top.
private struct CollectionLoadKey: Equatable {
	let tickers: Set<String>
	let demo: Bool
	let isTop: Bool
}
