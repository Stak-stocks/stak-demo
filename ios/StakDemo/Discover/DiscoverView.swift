import SwiftUI
import UIKit

/// 04 · Discover — V1 interaction model (STAK Discover V1 Product Rules, 2026-09-14): swipe right = STAK, swipe left =
/// Pass, "Learn more" opens the Quick Look. Today's personalised deck from the server (DiscoverViewModel), each stock
/// once, an undo toast after every decision, the end-of-deck receipt. A direct port of android
/// ui/discover/DiscoverScreen.kt - same layout, numbers and motion; the Quick Look is a native iOS sheet.
enum Disc {
	static let sheetBg = Color(argb: 0xFF181F30)
	static let muted = Color(argb: 0xFF819ABB)
	static let faint = Color(argb: 0xFF5C6B85)
	static let body = Color(argb: 0xFFC8D2E0)
	static let green = Color(argb: 0xFF2FD08A)
	/// Down moves on a ticket (Codex parity audit 2026-09-04) - the Simulate red.
	static let red = Color(argb: 0xFFFF5A6A)
	static let teal = Color(argb: 0xFF69B3CA)
	static let tealTint = Color(argb: 0x1A69B3CA)
	static let chipBg = Color(argb: 0xFF242B3D)
	static let divider = Color(argb: 0xFF2A3346)
	static let badgeInk = Color(argb: 0xFF9EADC7)
	static let brightInk = Color(argb: 0xFFF2F6FC)
	/// #FFFFFF @ 9% - the Save pill on BOTH Discover frames (DE-STAK 1:2048, CHINEDU 1:1759).
	static let saveChipBg = Color(argb: 0x17FFFFFF)
	static let amountBg = Color(argb: 0xFF0B1430)
	static let amountBorder = Color(argb: 0x1FFFFFFF)
	static let amountInk = Color(argb: 0xFFDCE7F7)
	static let amountSelBg = Color(argb: 0xFF0F2A38)
	static let amountSelBorder = Color(argb: 0xFF5DA8BF)
	static let amountSelInk = Color(argb: 0xFFA6E4F7)
	static let ctaBorder = StakColors.ctaBorderGradient
}

let discCtaGradient = LinearGradient(
	stops: [
		.init(color: Color(argb: 0xFFA6E4F7), location: 0.0889),
		.init(color: Color(argb: 0xFF5DA8BF), location: 0.3919),
		.init(color: Color(argb: 0xFF3C98B4), location: 0.7255),
		.init(color: Color(argb: 0xFF3C98B4), location: 1)
	],
	startPoint: .top, endPoint: .bottom
)

/// Compose's EaseOut (CubicBezier 0, 0, 0.58, 1) - every Android tween here uses it.
private func easeOut(_ seconds: Double) -> Animation { .timingCurve(0, 0, 0.58, 1, duration: seconds) }

/// A practice-buy ticket's stock values (Buy NVDA? 1:2159 / Buy AAPL? 1:3423).
struct BuySpec {
	let title: String
	let badge: String
	let name: String
	let priceLine: String
	let change: String
	let cashBefore: String
	let cashAfter: String
	let shares: String
	let symbol: String

	/// Codex audit (2026-09-04): "$122.10 today" -> 122.10 - the live ticket
	/// maths keys off the authored price line, so no second price table.
	var price: Double {
		Double(priceLine.split(separator: " ").first.map { $0.replacingOccurrences(of: "$", with: "").replacingOccurrences(of: ",", with: "") } ?? "") ?? 0
	}

	/// Codex audit (2026-09-04): this ticket at a chosen stake against the cash on hand - the shares and the cash
	/// after follow the amount, the cash before is `cash` (PaperPortfolio.shared.cash when the ticket opens).
	/// Mirrors android ui/discover/DiscoverScreen.kt.
	func withAmount(_ amount: Double, cash: Double) -> BuySpec {
		BuySpec(
			title: title, badge: badge, name: name, priceLine: priceLine, change: change,
			cashBefore: PaperPortfolio.money(cash), cashAfter: PaperPortfolio.money(cash - amount),
			shares: String(format: "%.4f", price > 0 ? amount / price : 0), symbol: symbol
		)
	}

	/// The ticket re-priced from a live quote, so the paper order fills at today's price.
	func withQuote(_ price: Double, changePct: Double) -> BuySpec {
		BuySpec(
			title: title, badge: badge, name: name,
			priceLine: PaperPortfolio.money(price) + " today",
			change: moveText(changePct),
			cashBefore: cashBefore, cashAfter: cashAfter, shares: shares, symbol: symbol
		)
	}
}

/// Codex audit (2026-09-04): the Practice buy ticket serves the FRONT card (1:1970 authors "Buy NVDA?" only because
/// NVDA leads the deck).
func buySpec(for symbol: String) -> BuySpec {
	switch symbol {
	case "AAPL": return aaplBuy
	case "GOOGL": return googlBuy
	default: return nvdaBuy
	}
}

/// Today's deck run - seen, saved, passed, bought and where the run is - kept here (not in the view's state) so it
/// survives tab hops, and persisted per deck day so a relaunch resumes today's run and tomorrow lands a fresh deck.
/// Mirrors android DeckSession (ui/discover/DiscoverScreen.kt).
final class DeckSession: ObservableObject {
	static let shared = DeckSession()
	@Published var seen = 0 { didSet { persist() } }
	@Published var saved: Set<String> = [] { didSet { persist() } }
	@Published var passed: Set<String> = [] { didSet { persist() } }
	@Published var bought = 0 { didSet { persist() } }
	/// Where the run is in the cards still on the deck - swipes move it, a save-driven removal does not.
	@Published var cursor = 0 { didSet { persist() } }

	func restart() {
		loading = true
		seen = 0; saved = []; passed = []; bought = 0; cursor = 0
		loading = false
		persist()
	}

	private var loading = false
	/// The same 9am rollover the server counts swipes under, so session and counter agree.
	private static func today() -> String { StakClock.deckDayKey() }

	/// Re-entering Discover on a later day starts the day's deck without a relaunch (audit 2026-09-07).
	func refreshDay() {
		if StakStore.string("deck.day") != Self.today() { load() }
	}

	func load() {
		loading = true
		if StakStore.string("deck.day") == Self.today() {
			seen = StakStore.int("deck.seen", default: 0)
			saved = StakStore.stringSet("deck.saved") ?? []
			passed = StakStore.stringSet("deck.passed") ?? []
			bought = StakStore.int("deck.bought", default: 0)
			cursor = StakStore.int("deck.cursor", default: 0)
		} else {
			seen = 0; saved = []; passed = []; bought = 0; cursor = 0
		}
		loading = false
	}

	private func persist() {
		guard !loading else { return }
		StakStore.set(Self.today(), for: "deck.day")
		StakStore.set(seen, for: "deck.seen")
		StakStore.set(saved, for: "deck.saved")
		StakStore.set(passed, for: "deck.passed")
		StakStore.set(bought, for: "deck.bought")
		StakStore.set(cursor, for: "deck.cursor")
	}
}

let nvdaBuy = BuySpec(
	title: "Buy NVDA?", badge: "N", name: "NVIDIA Corp", priceLine: "$122.10 today",
	change: "▲ 2.4%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.2048", symbol: "NVDA"
)
let aaplBuy = BuySpec(
	title: "Buy AAPL?", badge: "A", name: "Apple", priceLine: "$229.35 today",
	change: "▲ 1.2%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.1090", symbol: "AAPL"
)
let googlBuy = BuySpec(
	title: "Buy GOOGL?", badge: "G", name: "Alphabet", priceLine: "$178.90 today",
	change: "▲ 0.8%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.1397", symbol: "GOOGL"
)

/// What every surface says when a save is refused at MyStakHoldings.capacity (Android STAK_FULL_MESSAGE).
let stakFullMessage = "Your STAK is full — remove a stock to save another"

struct DiscoverView: View {
	// Property order IS the memberwise-init argument order (Swift); MainTabsView passes resetKey first.
	/// 1:2330: a Discover tab re-tap from the end of the deck restarts it.
	var resetKey: Int = 0
	/// Authored (1:2330): "Review saves in My STAK" - an instant swap to My STAK, raised to the shell.
	var onReviewSaves: () -> Void = {}

	@ObservedObject var discoverVM: DiscoverViewModel
	@ObservedObject private var session = DeckSession.shared
	@Environment(\.scenePhase) private var scenePhase
	@Environment(\.accessibilityReduceMotion) private var reduceMotion

	/// The pass/STAK commit distance: 110u of drag.
	private var commitPx: CGFloat { 110 * figmaUnit }
	/// The drag's slop before the card moves - Compose's touch slop, which Android subtracts the same way.
	private let dragSlop: CGFloat = 10

	@State private var swipeOffset: CGFloat = 0
	/// True while a finger is on the deck; drops back on its own when the system cancels the drag (a call, a sheet),
	/// which never reaches onEnded - the card then springs home instead of staying stuck off-centre.
	@GestureState private var dragActive = false
	@State private var flyingCard: DiscoverCard? = nil
	@State private var flyOffset: CGFloat = 0
	@State private var flyFade: Double = 1
	@State private var flyGen = 0
	/// The card just decided + whether it was a STAK; cleared after 3s (V1 rule 14), or by Undo or a swipe up.
	@State private var pendingUndo: (card: DiscoverCard, stak: Bool)? = nil
	@State private var undoToken = UUID()
	@State private var toastDrag: CGFloat = 0
	@State private var stakFullShown = false
	@State private var stakFullToken = UUID()
	/// The card whose Quick Look sheet is open (V1 rules 7–8).
	@State private var quickLookCard: DiscoverCard? = nil
	@State private var cardShownAt = Date()
	/// Bumped per decision - the light tap that confirms it.
	@State private var decisionTick = 0

	/// Each symbol appears once - V1 rule 5 (no recycling). Capped by what's left of today's limit, so swipes made on
	/// another device count too.
	private var remainingDeck: [DiscoverCard] {
		let left = max(0, discoverVM.dailyLimit - discoverVM.swipedToday)
		return Array(discoverVM.deck.filter { !session.saved.contains($0.symbol) && !session.passed.contains($0.symbol) }.prefix(left))
	}

	private var atEnd: Bool { remainingDeck.isEmpty || discoverVM.hasReachedLimit }

	/// The toast's exit: Compose's FastOutSlowIn over 220ms.
	private var toastExit: Animation { .timingCurve(0.4, 0, 0.2, 1, duration: 0.22) }

	private func commitDecision(_ card: DiscoverCard, isSTAK: Bool) {
		if isSTAK {
			session.saved.insert(card.symbol)
			// The card's price is the live quote, so the save is stamped with what the stock cost at this moment - the
			// only honest "since you saved".
			MyStakHoldings.shared.add(card.symbol, brandId: card.brandId, priceNow: card.priceValue)
		} else {
			session.passed.insert(card.symbol)
		}
		session.seen += 1
		withAnimation(easeOut(0.28)) { pendingUndo = (card, isSTAK) }
		undoToken = UUID()
		toastDrag = 0
		discoverVM.recordSwipe(
			brandId: card.brandId, isSTAK: isSTAK,
			timeOnCardMs: Int64(Date().timeIntervalSince(cardShownAt) * 1000), categories: card.categories
		)
		decisionTick += 1
		AccessibilityNotification.Announcement(isSTAK ? "\(card.companyName) added to your STAK" : "Passed on \(card.companyName)").post()
	}

	private func animateAndCommit(_ card: DiscoverCard, isSTAK: Bool, gestureOffset: CGFloat = 0) {
		// A double tap (or any late handler) must not commit the same card twice.
		if session.saved.contains(card.symbol) || session.passed.contains(card.symbol) { return }
		// A full Stak refuses the save before the card leaves: the server rejects a 31st stock and the sync swallows
		// the failure, so letting it fly away would show a saved card the server never kept.
		if isSTAK && MyStakHoldings.shared.isFull {
			showStakFull()
			withAnimation(easeOut(0.24)) { swipeOffset = 0 }
			return
		}
		// Travel past the screen edge by a full card width so the card genuinely leaves the frame. Reduce Motion
		// fades it where it stands instead.
		let flyDistance = UIScreen.main.bounds.width + 350 * figmaUnit
		let flyTarget = reduceMotion ? gestureOffset : (isSTAK ? flyDistance : -flyDistance)
		flyGen += 1
		let gen = flyGen
		var instant = Transaction()
		instant.disablesAnimations = true
		withTransaction(instant) {
			flyingCard = card
			flyFade = 1
			flyOffset = gestureOffset
			swipeOffset = 0
		}
		commitDecision(card, isSTAK: isSTAK)
		// Opacity holds through the travel - the tail fade only covers the last frames, once the card is already clear
		// of the edge. Fading during the slide is what made it read as vanishing in place.
		DispatchQueue.main.async {
			if reduceMotion {
				withAnimation(.easeOut(duration: 0.2)) { flyFade = 0 }
			} else {
				withAnimation(easeOut(0.12).delay(0.3)) { flyFade = 0 }
				withAnimation(easeOut(0.42)) { flyOffset = flyTarget }
			}
		}
		DispatchQueue.main.asyncAfter(deadline: .now() + 0.42) {
			if gen == flyGen { flyingCard = nil }
		}
	}

	private func showStakFull() {
		withAnimation(easeOut(0.28)) { stakFullShown = true }
		stakFullToken = UUID()
		AccessibilityNotification.Announcement(stakFullMessage).post()
	}

	private func undo(_ card: DiscoverCard, wasSTAK: Bool) {
		if wasSTAK {
			session.saved.remove(card.symbol)
			MyStakHoldings.shared.remove(card.symbol)
		} else {
			session.passed.remove(card.symbol)
		}
		session.seen = max(0, session.seen - 1)
		discoverVM.cancelPendingSwipe(card.brandId)
		withAnimation(toastExit) { pendingUndo = nil }
	}

	private func openQuickLook(_ card: DiscoverCard) {
		quickLookCard = card
		discoverVM.recordLearnMore(card)
	}

	var body: some View {
		let u = figmaUnit
		let deck = remainingDeck
		let limit = discoverVM.dailyLimit
		let swiped = discoverVM.swipedToday
		let ended = atEnd
		ZStack(alignment: .top) {
			VStack(spacing: 0) {
				let count = ended ? min(swiped, limit) : min(swiped + 1, limit)
				VStack(alignment: .leading, spacing: (ended ? 8 : 5) * u) {
					HStack(alignment: .center, spacing: 0) {
						Text("Discover")
							.font(StakFont.sora(26 * u, .semiBold))
							.stakLineHeight(33 * u, size: 26 * u, face: .sora)
							.foregroundStyle(ended ? Disc.brightInk : Color.white)
							.offset(y: ended ? -7.5 * u : 0)
							.accessibilityAddTraits(.isHeader)
						Spacer(minLength: 0)
						ZStack {
							ProgressRing(progress: CGFloat(count) / CGFloat(max(limit, 1)))
							// One line centred in the ring: no line height to set (and the count keeps its size, below).
							Text("\(count)/\(limit)")
								.font(StakFont.sora(11 * u))
								.foregroundStyle(Color.white)
						}
						.frame(width: 44 * u, height: 44 * u)
						// The count sits inside a 44 ring: it keeps its size (VoiceOver reads it in full).
						.dynamicTypeSize(.large)
						.accessibilityElement(children: .ignore)
						.accessibilityLabel(ended ? "\(count) of \(limit) cards seen today" : "Card \(count) of \(limit) today")
					}
					Text(discoverVM.deckLabel)
						.font(StakFont.geist(10 * u, .medium))
						.stakLineHeight(13 * u, size: 10 * u, face: .geist)
						.tracking((ended ? 0.8 : 0.9) * u)
						.lineLimit(1)
						.truncationMode(.tail)
						.foregroundStyle(ended ? Disc.muted : Disc.faint)
						.padding(.leading, (ended ? 0 : 2) * u)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.padding(.horizontal, 20 * u)
				.padding(.top, (ended ? 20 : 10) * u)
				Spacer().frame(height: 14 * u)

				if discoverVM.loading && discoverVM.deck.isEmpty {
					ProgressView()
						.tint(Disc.teal)
						.frame(maxWidth: .infinity, maxHeight: .infinity)
				} else if discoverVM.loadError && discoverVM.deck.isEmpty {
					DeckLoadError(onRetry: { discoverVM.retry() })
					Spacer(minLength: 0)
				} else if ended {
					EndOfDeck(
						seen: min(swiped, limit),
						total: limit,
						// Server counts cover other devices and relaunches; this session may be ahead of them.
						saved: max(session.saved.count, discoverVM.todayStats.saved),
						passed: max(session.passed.count, discoverVM.todayStats.passed),
						onReviewSaves: onReviewSaves
					)
					Spacer(minLength: 0)
				} else if let front = deck.first {
					deckArea(deck: deck, front: front, u: u)
					Spacer().frame(height: 16 * u)
					decisionButtons(front: front, u: u)
						.zIndex(2)
					Spacer().frame(height: 8 * u)
				}
			}

			// A refused save answers where the undo toast appears, beneath a live Undo, never over it: undoing the
			// last save is the one thing that frees a slot.
			if stakFullShown {
				StakFullToast(u: u)
					.padding(.top, (pendingUndo != nil ? 128 : 74) * u)
					.transition(.offset(y: -40 * u).combined(with: .opacity))
					.zIndex(4)
			}
			// Undo toast (V1 rule 14): centred under the header. Only the Undo pill reverts; swiping the toast up
			// dismisses it and keeps the decision. A removed toast keeps its last content while it animates out.
			if let shown = pendingUndo {
				undoToast(shown.card, wasSTAK: shown.stak, u: u)
					.padding(.top, 74 * u)
					.transition(.offset(y: -40 * u).combined(with: .opacity))
					.zIndex(3)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		.onAppear {
			DeckSession.shared.refreshDay()
			cardShownAt = Date()
		}
		.task { await discoverVM.load() }
		// Only a CHANGE of the key restarts a finished deck - never the re-entry itself.
		.onChange(of: resetKey) { if atEnd { DeckSession.shared.restart() } }
		.onChange(of: deck.first?.symbol) { cardShownAt = Date() }
		.onChange(of: dragActive) { _, active in
			// A drag the system cancelled never reached onEnded: put the card back.
			// Checked a turn later: a drag that ended normally has settled the offset by then.
			guard !active else { return }
			DispatchQueue.main.async {
				if !dragActive && swipeOffset != 0 { withAnimation(easeOut(0.26)) { swipeOffset = 0 } }
			}
		}
		// Undo auto-dismiss: a newer decision replaces the toast and restarts the 3s clock.
		.task(id: undoToken) {
			guard pendingUndo != nil else { return }
			try? await Task.sleep(nanoseconds: 3_000_000_000)
			guard !Task.isCancelled else { return }
			withAnimation(toastExit) { pendingUndo = nil }
		}
		.task(id: stakFullToken) {
			guard stakFullShown else { return }
			try? await Task.sleep(nanoseconds: 3_000_000_000)
			guard !Task.isCancelled else { return }
			withAnimation(toastExit) { stakFullShown = false }
		}
		// Prices move while the deck sits open: on showing, every 30s while visible, and on returning to the app - for
		// the front card and the two peeking behind it only; swiped cards and the end screen show no price (Android
		// RefreshWhileVisible). The loop stops when the tab is left.
		.task {
			while !Task.isCancelled {
				tick()
				try? await Task.sleep(nanoseconds: 30_000_000_000)
			}
		}
		.onChange(of: scenePhase) { _, phase in if phase == .active { tick() } }
		.sensoryFeedback(.impact(weight: .light), trigger: decisionTick)
		.sensoryFeedback(.warning, trigger: stakFullToken)
		// Quick Look - a native sheet: drag down to dismiss. Its body scrolls inside the one detent.
		.sheet(item: $quickLookCard) { card in
			QuickLookSheet(card: card, load: { await discoverVM.fetchQuickLook($0) })
				.presentationDetents([.fraction(0.62)])
				.presentationDragIndicator(.visible)
				.presentationContentInteraction(.scrolls)
				.presentationCornerRadius(24 * u)
				.presentationBackground(Disc.sheetBg)
		}
	}

	private func tick() {
		discoverVM.onVisibleTick(atEnd ? [] : remainingDeck.prefix(3).map(\.symbol))
	}

	// MARK: - The deck

	@ViewBuilder
	private func deckArea(deck: [DiscoverCard], front: DiscoverCard, u: CGFloat) -> some View {
		ZStack(alignment: .top) {
			// Peek card farthest back — tilts right, smallest. Equatable: a drag frame doesn't redraw the peeks.
			if deck.count > 2 {
				FrontDeckCard(card: deck[2], u: u)
					.equatable()
					.scaleEffect(0.72, anchor: .top)
					.rotationEffect(.degrees(5), anchor: .top)
					.offset(y: 4 * u)
					.allowsHitTesting(false)
					.accessibilityHidden(true)
			}
			// Peek card middle — tilts left, medium.
			if deck.count > 1 {
				FrontDeckCard(card: deck[1], u: u)
					.equatable()
					.scaleEffect(0.82, anchor: .top)
					.rotationEffect(.degrees(-3), anchor: .top)
					.offset(y: 28 * u)
					.allowsHitTesting(false)
					.accessibilityHidden(true)
			}
			// Front card - swipes horizontally, tilting up to 8° at the commit distance (none under Reduce Motion).
			FrontDeckCard(card: front, u: u, showLearnMore: true, onLearnMore: { openQuickLook(front) })
				.rotationEffect(.degrees(reduceMotion ? 0 : Double(swipeOffset / commitPx) * 8))
				.offset(x: swipeOffset, y: 54.65 * u)
				.accessibilityElement(children: .combine)
				.accessibilityHint("Swipe right to STAK, left to pass")
				.accessibilityAction(named: "STAK") { animateAndCommit(front, isSTAK: true) }
				.accessibilityAction(named: "Pass") { animateAndCommit(front, isSTAK: false) }
				.accessibilityAction(named: "Learn more") { openQuickLook(front) }
			if let ghost = flyingCard {
				FrontDeckCard(card: ghost, u: u, showLearnMore: true)
					.equatable()
					.opacity(flyFade)
					.offset(x: flyOffset, y: 54.65 * u)
					.allowsHitTesting(false)
					.accessibilityHidden(true)
			}
		}
		.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
		.padding(.horizontal, 20 * u)
		// Unclipped and above its siblings: a dragged or flying card stays WHOLE past the deck bounds - it passes over
		// the CTA zone like a real card deck.
		.zIndex(1)
		.contentShape(Rectangle())
		.gesture(
			DragGesture(minimumDistance: dragSlop)
				.updating($dragActive) { _, active, _ in active = true }
				.onChanged { value in
					let dx = value.translation.width
					// Horizontal only: a mostly-vertical drag that hasn't moved the card yet is left alone.
					if swipeOffset == 0 && abs(value.translation.height) > abs(dx) { return }
					let moved = dx > 0 ? max(0, dx - dragSlop) : min(0, dx + dragSlop)
					var instant = Transaction()
					instant.disablesAnimations = true
					withTransaction(instant) { swipeOffset = moved }
				}
				.onEnded { value in
					// Never started (a vertical drag): nothing to settle.
					guard swipeOffset != 0 else { return }
					let dx = value.translation.width
					let total = dx > 0 ? max(0, dx - dragSlop) : min(0, dx + dragSlop)
					if abs(total) > commitPx {
						animateAndCommit(front, isSTAK: total > 0, gestureOffset: total)
					} else {
						withAnimation(easeOut(0.26)) { swipeOffset = 0 }
					}
				}
		)
		// A light tick when the drag crosses the commit distance, either way - letting go now decides the card.
		.sensoryFeedback(.selection, trigger: abs(swipeOffset) > commitPx) { _, crossed in crossed }
	}

	private func decisionButtons(front: DiscoverCard, u: CGFloat) -> some View {
		let ratio = min(1, max(-1, swipeOffset / commitPx))
		let passRatio = Double(max(0, -ratio))
		let stakRatio = Double(max(0, ratio))
		let passBg = lerp(0x1C202E, 0xFFFFFF, passRatio)
		let passIcon = lerp(0xB0B8CC, 0x1C202E, passRatio)
		let stakBg = lerp(0x1C202E, 0x4FB3D9, stakRatio)
		return HStack(spacing: 48 * u) {
			// Pass — the circle fills white as the swipe goes left.
			VStack(spacing: 6 * u) {
				Button { animateAndCommit(front, isSTAK: false) } label: {
					ZStack {
						Circle().fill(passBg)
						Canvas { ctx, size in
							let s = min(size.width, size.height)
							let sw = s * 0.12, pad = s * 0.1
							var p = Path()
							p.move(to: CGPoint(x: pad, y: pad)); p.addLine(to: CGPoint(x: s - pad, y: s - pad))
							p.move(to: CGPoint(x: s - pad, y: pad)); p.addLine(to: CGPoint(x: pad, y: s - pad))
							ctx.stroke(p, with: .color(passIcon), style: StrokeStyle(lineWidth: sw, lineCap: .round))
						}
						.frame(width: 20 * u, height: 20 * u)
					}
					.frame(width: 56 * u, height: 56 * u)
				}
				.buttonStyle(.pressDim)
				.accessibilityLabel("Pass")
				Text("Pass")
					.font(StakFont.geist(12 * u))
					.foregroundStyle(Disc.muted)
					.accessibilityHidden(true)
			}
			// STAK — the circle fills blue as the swipe goes right.
			VStack(spacing: 6 * u) {
				Button { animateAndCommit(front, isSTAK: true) } label: {
					ZStack {
						Circle().fill(stakBg)
						Image("StakLogoMark")
							.resizable()
							.frame(width: 28 * u, height: 28 * u)
					}
					.frame(width: 56 * u, height: 56 * u)
				}
				.buttonStyle(.pressDim)
				.accessibilityLabel("STAK")
				Text("STAK")
					.font(StakFont.geist(12 * u))
					.foregroundStyle(Disc.muted)
					.accessibilityHidden(true)
			}
		}
		.frame(maxWidth: .infinity)
	}

	private func lerp(_ from: UInt32, _ to: UInt32, _ t: Double) -> Color {
		func ch(_ v: UInt32, _ shift: UInt32) -> Double { Double((v >> shift) & 0xFF) / 255 }
		return Color(
			red: ch(from, 16) + (ch(to, 16) - ch(from, 16)) * t,
			green: ch(from, 8) + (ch(to, 8) - ch(from, 8)) * t,
			blue: ch(from, 0) + (ch(to, 0) - ch(from, 0)) * t
		)
	}

	// MARK: - Undo toast

	private func undoToast(_ card: DiscoverCard, wasSTAK: Bool, u: CGFloat) -> some View {
		let tint = wasSTAK ? Color(argb: 0xFF4FB3D9) : Color(argb: 0xFF8A94A8)
		let dismissPx = 24 * u
		return HStack(spacing: 10 * u) {
			ZStack {
				Circle().fill(wasSTAK ? tint : Color(argb: 0xFF2A3246))
				if wasSTAK {
					Image("StakLogoMark").resizable().frame(width: 16 * u, height: 16 * u)
				} else {
					Canvas { ctx, size in
						let sw = min(size.width, size.height) * 0.2
						var p = Path()
						p.move(to: .zero); p.addLine(to: CGPoint(x: size.width, y: size.height))
						p.move(to: CGPoint(x: size.width, y: 0)); p.addLine(to: CGPoint(x: 0, y: size.height))
						ctx.stroke(p, with: .color(Color(argb: 0xFFC8D2E0)), style: StrokeStyle(lineWidth: sw, lineCap: .round))
					}
					.frame(width: 10 * u, height: 10 * u)
				}
			}
			.frame(width: 28 * u, height: 28 * u)
			.accessibilityHidden(true)
			Text(wasSTAK ? "\(card.companyName) added to your STAK" : "Passed on \(card.companyName)")
				.font(StakFont.geist(12.5 * u, .medium))
				.foregroundStyle(Color.white)
				.lineLimit(1)
				.truncationMode(.tail)
				.frame(maxWidth: 190 * u, alignment: .leading)
				.layoutPriority(1)
			Button { undo(card, wasSTAK: wasSTAK) } label: {
				Text("Undo")
					.font(StakFont.geist(12 * u, .semiBold))
					.foregroundStyle(wasSTAK ? Color(argb: 0xFF8FD8F2) : Color(argb: 0xFFC8D2E0))
					.padding(.horizontal, 14 * u)
					.padding(.vertical, 8 * u)
					.background(tint.opacity(0.18), in: Capsule())
			}
			.buttonStyle(.pressDim)
			.accessibilityLabel(wasSTAK ? "Undo save" : "Undo pass")
		}
		.padding(6 * u)
		.background(Color(argb: 0xF2121A2B), in: Capsule())
		.overlay(Capsule().strokeBorder(tint.opacity(0.45), lineWidth: 1 * u))
		// A new decision cross-fades the pill's content instead of rewriting it in place.
		.id("\(card.symbol)\(wasSTAK)")
		.offset(y: toastDrag)
		.opacity(1 - min(0.6, max(0, -toastDrag / (dismissPx * 3))))
		.gesture(
			DragGesture()
				.onChanged { toastDrag = min(0, $0.translation.height) }
				.onEnded { _ in
					if toastDrag < -dismissPx {
						withAnimation(toastExit) { pendingUndo = nil }
					} else {
						withAnimation(easeOut(0.2)) { toastDrag = 0 }
					}
				}
		)
	}
}

/// The refused-save notice, drawn to match the undo pill - it appears in the same place, and two different shapes there
/// read as two different kinds of message (Android StakFullToast).
struct StakFullToast: View {
	let u: CGFloat

	var body: some View {
		Text(stakFullMessage)
			.font(StakFont.geist(12 * u, .medium))
			.foregroundStyle(Color(argb: 0xFFD7DEEA))
			.padding(.horizontal, 16 * u)
			.padding(.vertical, 12 * u)
			.background(Color(argb: 0xF2121A2B), in: Capsule())
			.overlay(Capsule().strokeBorder(Color(argb: 0xFF8A94A8).opacity(0.45), lineWidth: 1 * u))
	}
}

/// 44u progress ring — #2a3346 track + #69b3ca arc from 12 o'clock, 4u round stroke inset 4u.
struct ProgressRing: View {
	let progress: CGFloat

	var body: some View {
		let u = figmaUnit
		ZStack {
			Circle()
				.stroke(Disc.divider, style: StrokeStyle(lineWidth: 4 * u, lineCap: .round))
			Circle()
				.trim(from: 0, to: progress)
				.stroke(Disc.teal, style: StrokeStyle(lineWidth: 4 * u, lineCap: .round))
				.rotationEffect(.degrees(-90))
		}
		.padding(4 * u)
	}
}

/// The full-size front card (350u wide). The deck's layer structure: every boundary in the frame is a brightness step
/// plus a thin dark rim, so the card reads as its own layer over the queue in every state.
private struct FrontDeckCard: View, Equatable {
	let card: DiscoverCard
	let u: CGFloat
	var showLearnMore = false
	var onLearnMore: (() -> Void)? = nil

	/// The closure is left out: peeks and the fly-out ghost have none, so they redraw only when their card changes.
	static func == (a: Self, b: Self) -> Bool {
		a.card == b.card && a.u == b.u && a.showLearnMore == b.showLearnMore && (a.onLearnMore == nil) == (b.onLearnMore == nil)
	}

	var body: some View {
		DeckCardBody(card: card, u: u, showLearnMore: showLearnMore, onLearnMore: onLearnMore)
			.frame(width: 350 * u)
			.background { CardSeam(u: u) }
	}
}

/// Concentric 1pt rounded strokes reaching 6u out from the card edge, #060b16 fading by 0.5·(1−t)² - the Kotlin
/// drawBehind loop.
private struct CardSeam: View {
	let u: CGFloat

	var body: some View {
		let reach = 6 * u
		// One Canvas, drawn past its frame: a single layer instead of a view per ring.
		Canvas { ctx, size in
			let rect = CGRect(origin: .zero, size: size)
			for i in 0..<Int(ceil(reach)) {
				let d = CGFloat(i)
				let t = d / reach
				let ring = rect.insetBy(dx: reach - d + 0.5, dy: reach - d + 0.5)
				ctx.stroke(
					Path(roundedRect: ring, cornerRadius: 22 * u + d),
					with: .color(Color(argb: 0xFF060B16).opacity(0.5 * (1 - t) * (1 - t))),
					lineWidth: 1
				)
			}
		}
		.padding(-reach)
		.allowsHitTesting(false)
	}
}

/// The card. At larger text sizes its art gives up height (229 at the default) so the grown text still fits the deck.
private struct DeckCardBody: View {
	let card: DiscoverCard
	let u: CGFloat
	var showLearnMore = false
	var onLearnMore: (() -> Void)? = nil

	var body: some View {
		// The authored card template (1:1740): art 340x229 at y4, overlay at 258 -> gap 25.
		VStack(spacing: 25 * u) {
			ZStack(alignment: .topLeading) {
				if let art = card.art, let image = CardArtImages.image(art) {
					Image(uiImage: image)
						.resizable()
						.scaledToFill()
						.frame(width: 340 * u, height: 229 * u / typeScale)
				} else {
					// No pre-generated card (a brand added since the art last ran): the same basket template, with the
					// logo lifted off its tile and set into the glass at runtime.
					if let template = CardArtImages.basketTemplate {
						Image(uiImage: template)
							.resizable()
							.scaledToFill()
							.frame(width: 340 * u, height: 229 * u / typeScale)
					}
					if let url = card.logoUrl { GlassLogo(url: url, u: u) }
				}
			}
			.frame(width: 340 * u, height: 229 * u / typeScale)
			.background(card.artBg)
			.clipShape(RoundedRectangle(cornerRadius: 18 * u))
			VStack(alignment: .leading, spacing: 19 * u) {
				VStack(alignment: .leading, spacing: 8 * u) {
					Text(card.ticker)
						.font(StakFont.geist(10 * u))
						.stakLineHeight(13 * u, size: 10 * u, face: .geist)
						.foregroundStyle(Disc.muted)
					Text(card.headline)
						.font(StakFont.geist(16 * u))
						.stakLineHeight(23 * u, size: 16 * u, face: .geist)
						.foregroundStyle(Color.white)
						// Larger text: at most 3 lines, so the card stays above Pass/STAK (the art gives way too).
						.lineLimit(typeScale > 1 ? 3 : nil)
						.fixedSize(horizontal: false, vertical: true)
					HStack(alignment: .bottom, spacing: 9 * u) {
						Text(card.price)
							.font(StakFont.sora(20 * u, .semiBold))
							.stakLineHeight(25 * u, size: 20 * u, face: .sora)
							.foregroundStyle(Color.white)
						Text(StakClock.sessionChange(card.change))
							.font(StakFont.geist(11 * u, .medium))
							.stakLineHeight(14 * u, size: 11 * u, face: .geist)
							.lineLimit(1)
							.fixedSize()
							.foregroundStyle(card.change.hasPrefix("▼") ? Disc.red : Disc.green)
							.padding(.bottom, 2 * u)
					}
				}
				if !card.tip.trimmingCharacters(in: .whitespaces).isEmpty {
					HStack(alignment: .center, spacing: 8 * u) {
						Text("TIP")
							.font(StakFont.geist(10 * u, .medium))
							.tracking(0.9 * u)
							.foregroundStyle(Disc.teal)
						Text(card.tip)
							.font(StakFont.geist(11 * u))
							.stakLineHeight(15 * u, size: 11 * u, face: .geist)
							.foregroundStyle(Disc.body)
							.lineLimit(typeScale > 1 ? 3 : nil)
							.frame(maxWidth: .infinity, alignment: .leading)
					}
					.padding(.horizontal, 12 * u)
					.padding(.vertical, 9 * u)
					.frame(maxWidth: .infinity)
					.background(Disc.tealTint, in: RoundedRectangle(cornerRadius: 10 * u))
				}
				if showLearnMore {
					// Tucks up under the tip: the column's 19u rhythm is too loose for a link.
					Button { onLearnMore?() } label: {
						HStack(spacing: 4 * u) {
							Text("Learn more")
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(Disc.teal)
							LearnMoreChevron()
								.stroke(Disc.teal, style: StrokeStyle(lineWidth: 1.5 * u, lineCap: .round, lineJoin: .round))
								.frame(width: 7 * u, height: 12 * u)
						}
						.padding(.horizontal, 10 * u)
						.padding(.vertical, 12 * u)
						.contentShape(Rectangle())
					}
					// The 44pt-tall hit area keeps the link's drawn place: the extra padding is given back to the layout.
					.padding(.vertical, -8 * u)
					.buttonStyle(.pressDim)
					.disabled(onLearnMore == nil)
					.frame(maxWidth: .infinity)
					.padding(.top, -12 * u)
				}
			}
			.padding(.horizontal, 18 * u)
			.padding(.bottom, (showLearnMore ? 10 : 16) * u)
		}
		.padding(.top, 4 * u)
		.padding(.bottom, 4 * u)
		.frame(maxWidth: .infinity)
		.background(
			LinearGradient(
				stops: [
					.init(color: card.cardTop, location: 0),
					.init(color: Color(argb: 0xFF0C1526), location: 0.9),
					.init(color: Color(argb: 0x000C1526), location: 1),
				],
				startPoint: .top, endPoint: .bottom
			)
		)
		.clipShape(RoundedRectangle(cornerRadius: 22 * u))
	}
}

/// The Learn more link's 7x12 chevron: M1 1.5 L6 6 L1 10.5 in a 12-tall box.
private struct LearnMoreChevron: Shape {
	func path(in rect: CGRect) -> Path {
		let px = rect.height / 12
		var p = Path()
		p.move(to: CGPoint(x: 1 * px, y: 1.5 * px))
		p.addLine(to: CGPoint(x: 6 * px, y: 6 * px))
		p.addLine(to: CGPoint(x: 1 * px, y: 10.5 * px))
		return p
	}
}

/// A brand logo set into the basket template's glass ball, for brands with no pre-generated card art. Positioned for
/// the 340x229 art box: the template is width-fitted and centre-cropped, which puts the ball's centre at (172u, 100u).
/// Android ui/discover/GlassLogo.kt.
private struct GlassLogo: View {
	let url: String
	let u: CGFloat
	@State private var glyph: UIImage?

	init(url: String, u: CGFloat) {
		self.url = url
		self.u = u
		// A glyph already made shows on the first frame, not after a task hop.
		_glyph = State(initialValue: GlassGlyph.cached(url))
	}

	var body: some View {
		ZStack {
			if let glyph {
				// Depth: a darker copy down-right, then the pale glass glyph over it.
				Image(uiImage: glyph)
					.resizable()
					.renderingMode(.template)
					.foregroundStyle(Color(argb: 0xFF2E7DA3))
					.opacity(0.7)
					.offset(x: 1.5 * u, y: 2.5 * u)
				Image(uiImage: glyph).resizable()
			}
			// Glass sheen back over the mark so it reads as inside the ball.
			GeometryReader { geo in
				Ellipse()
					.fill(LinearGradient(
						colors: [Color(argb: 0x40FFFFFF), .clear],
						startPoint: .topLeading,
						endPoint: UnitPoint(x: 0.7 / 0.62, y: 0.6 / 0.45)
					))
					.frame(width: geo.size.width * 0.62, height: geo.size.height * 0.45)
					.offset(x: geo.size.width * 0.08, y: geo.size.height * 0.02)
			}
		}
		.frame(width: 100 * u, height: 100 * u)
		.offset(x: 122 * u, y: 50 * u)
		.task(id: url) { if glyph == nil { glyph = await GlassGlyph.load(url) } }
	}
}

/// Lifts a logo off its opaque tile: every pixel that differs from the tile's border colour becomes the mark,
/// repainted as pale glass. The twin of Android's GlassGlyphTransformation (and tools/card-art/gen_cards.py's
/// glyph_mask, without its badge handling).
private enum GlassGlyph {
	private static let cache = NSCache<NSString, UIImage>()

	static func cached(_ url: String) -> UIImage? { cache.object(forKey: url as NSString) }

	static func load(_ url: String) async -> UIImage? {
		if let hit = cache.object(forKey: url as NSString) { return hit }
		guard let u = URL(string: url),
			  let (data, _) = try? await URLSession.shared.data(from: u),
			  let source = UIImage(data: data),
			  let glyph = transform(source) else { return nil }
		cache.setObject(glyph, forKey: url as NSString)
		return glyph
	}

	private static func transform(_ image: UIImage) -> UIImage? {
		guard let cg = image.cgImage else { return nil }
		let w = cg.width, h = cg.height
		guard w > 1, h > 1 else { return nil }
		var src = [UInt8](repeating: 0, count: w * h * 4)
		let space = CGColorSpaceCreateDeviceRGB()
		// The context writes through a pointer that is only valid inside the closure (`&src` would dangle).
		let drawn = src.withUnsafeMutableBytes { buf -> Bool in
			guard let ctx = CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
									  space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
			ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
			return true
		}
		guard drawn else { return nil }
		// Median (by brightness) of pixels sampled around the tile's edge.
		var samples: [(Int, Int, Int)] = []
		func px(_ x: Int, _ y: Int) -> (Int, Int, Int) {
			let i = (y * w + x) * 4
			return (Int(src[i]), Int(src[i + 1]), Int(src[i + 2]))
		}
		for x in stride(from: 0, to: w, by: 7) { samples.append(px(x, 0)); samples.append(px(x, h - 1)) }
		for y in stride(from: 0, to: h, by: 7) { samples.append(px(0, y)); samples.append(px(w - 1, y)) }
		samples.sort { $0.0 + $0.1 + $0.2 < $1.0 + $1.1 + $1.2 }
		let bg = samples[samples.count / 2]
		var out = [UInt8](repeating: 0, count: w * h * 4)
		for y in 0..<h {
			let t = Double(y) / Double(max(h - 1, 1))
			let r = Double(0xD0) + Double(0x80 - 0xD0) * t
			let g = Double(0xF0) + Double(0xC4 - 0xF0) * t
			let b = Double(0xFA) + Double(0xDE - 0xFA) * t
			for x in 0..<w {
				let p = px(x, y)
				let d = min(255, abs(p.0 - bg.0) + abs(p.1 - bg.1) + abs(p.2 - bg.2))
				let a = Double(min(255, max(0, (d - 45) * 255 / 95))) / 255
				let i = (y * w + x) * 4
				// Premultiplied RGBA.
				out[i] = UInt8(r * a); out[i + 1] = UInt8(g * a); out[i + 2] = UInt8(b * a); out[i + 3] = UInt8(a * 255)
			}
		}
		let made = out.withUnsafeMutableBytes { buf -> CGImage? in
			CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: space,
					  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)?.makeImage()
		}
		return made.map { UIImage(cgImage: $0) }
	}
}

/// The cards this deck actually showed - a day with fewer eligible stocks ends before the daily limit and must not
/// claim the full count; a day with none says so.
private func endOfDeckSummary(seen: Int, total: Int) -> String {
	if seen <= 0 { return "No new stocks to show today." }
	let n = min(seen, total)
	let cards = n == 1 ? "card" : "cards"
	let signals = n == 1 ? "signal" : "signals"
	return "\(countWord(n)) \(cards), \(countWord(n).lowercased()) \(signals). Your taste graph got smarter."
}

private func countWord(_ n: Int) -> String {
	let words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
				 "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"]
	return n >= 0 && n < words.count ? words[n] : "\(n)"
}

/// Discover · End of deck (CHINEDU 1:2330) — the copy follows the daily limit the server sends; the tiles report this
/// run's real Seen / Saved / Passed.
private struct EndOfDeck: View {
	let seen: Int
	let total: Int
	let saved: Int
	let passed: Int
	let onReviewSaves: () -> Void

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) {
			// Authored column (1:2330): title box 190-218 (lh28), subtitle 226-242 (lh16), stats 274, CTA 396.
			Spacer().frame(height: 34 * u)
			Text("Deck complete")
				.font(StakFont.sora(22 * u, .semiBold))
				.stakLineHeight(28 * u, size: 22 * u, face: .sora)
				.foregroundStyle(Disc.brightInk)
			Spacer().frame(height: 8 * u)
			Text(endOfDeckSummary(seen: seen, total: total))
				.font(StakFont.geist(12 * u))
				.stakLineHeight(16 * u, size: 12 * u, face: .geist)
				.foregroundStyle(Disc.muted)
			Spacer().frame(height: 32 * u)
			HStack(spacing: 10 * u) {
				statTile("Seen", "\(seen)", u)
				statTile("Saved", "\(saved)", u)
				statTile("Passed", "\(passed)", u)
			}
			Spacer().frame(height: 52 * u)
			// B4 (1:2330 Motion): Review saves -> the My STAK tab, Instant.
			Button(action: onReviewSaves) {
				Text("Review saves in My STAK")
					.font(StakFont.sora(13 * u))
					.foregroundStyle(Disc.muted)
					.frame(maxWidth: .infinity)
					.frame(height: 52 * u * typeScale)
					.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u))
					.contentShape(Rectangle())
			}
			.buttonStyle(.pressDim)
			Spacer().frame(height: 14 * u)
			// The deck day turns at 9am local: finished before it, the next one is today.
			Text(Calendar.current.component(.hour, from: Date()) < StakClock.deckDayStartHour ? "A new deck lands at 9am." : "A new deck lands tomorrow at 9am.")
				.font(StakFont.geist(10 * u))
				.stakLineHeight(13 * u, size: 10 * u, face: .geist)
				.foregroundStyle(Disc.muted)
		}
		.frame(maxWidth: .infinity)
		.padding(.horizontal, 20 * u)
	}

	private func statTile(_ label: String, _ value: String, _ u: CGFloat) -> some View {
		VStack(spacing: 4 * u) {
			Text(label)
				.font(StakFont.geist(10 * u))
				.stakLineHeight(13 * u, size: 10 * u, face: .geist)
				.foregroundStyle(Disc.muted)
			Text(value)
				.font(StakFont.sora(20 * u, .semiBold))
				.stakLineHeight(25 * u, size: 20 * u, face: .sora)
				.foregroundStyle(Disc.brightInk)
		}
		.frame(width: 110 * u - 20 * u)
		.padding(.horizontal, 10 * u)
		.padding(.vertical, 14 * u)
		.background(Disc.sheetBg, in: RoundedRectangle(cornerRadius: 12 * u))
	}
}

// MARK: - Practice-buy sheets (1:1970 Buy / 85:1205 Order filled)

/// Shared sheet scaffold — 45% #0a1020 scrim + r24 #181f30 sheet.
struct SheetScaffold<Content: View>: View {
	let onDismiss: () -> Void
	@ViewBuilder let content: Content

	var body: some View {
		let u = figmaUnit
		ZStack(alignment: .bottom) {
			// Authored ticket scrim rgba(0,0,0,0.6) (1:2158).
			Color(argb: 0x99000000)
				.ignoresSafeArea()
				.onTapGesture(perform: onDismiss)
			VStack(spacing: 0) {
				// Authored (1:2159): handle at y10–14, title at y32 — 18 below
				// the rect after the 10 top padding.
				RoundedRectangle(cornerRadius: 2 * u)
					.fill(Disc.divider)
					.frame(width: 40 * u, height: 4 * u)
					.padding(.bottom, 18 * u)
				content
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 10 * u)
			.padding(.bottom, 30 * u)
			.frame(maxWidth: .infinity)
			.background(Disc.sheetBg, in: UnevenRoundedRectangle(topLeadingRadius: 24 * u, topTrailingRadius: 24 * u))
			.ignoresSafeArea(edges: .bottom)
		}
	}
}

/// Stock row used by the ticket sheets — teal-tinted, badge + price + change.
struct SheetStockRow: View {
	let spec: BuySpec

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 12 * u) {
			ZStack {
				Circle().fill(Disc.chipBg)
				Text(spec.badge)
					.font(StakFont.sora(15 * u, .semiBold))
					.foregroundStyle(Disc.badgeInk)
			}
			.frame(width: 38 * u, height: 38 * u)
			VStack(alignment: .leading, spacing: 2 * u) {
				Text(spec.name)
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(Color.white)
				Text(spec.priceLine)
					.font(StakFont.geist(10 * u))
					.foregroundStyle(Disc.muted)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			Text(spec.change)
				.font(StakFont.geist(12 * u, .medium))
				.foregroundStyle(spec.change.hasPrefix("▼") ? Disc.red : Disc.green)
		}
		.padding(.horizontal, 14 * u)
		.padding(.vertical, 12 * u)
		.background(Disc.tealTint, in: RoundedRectangle(cornerRadius: 6 * u))
	}
}

struct SheetCta: View {
	let text: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
				.font(StakFont.geist(14 * u, .medium))
				.foregroundStyle(Color.white)
				.frame(maxWidth: .infinity)
				.frame(height: 52 * u * typeScale)
				// Authored drop shadow (85:1394 Inspect): dy 12.28, blur 12.28,
				// #52AAC7 at 9% — the same glow the deck's Practice buy carries.
				.background {
					RoundedRectangle(cornerRadius: 6 * u)
						.fill(Color(argb: 0xFF52AAC7))
						.opacity(0.09)
						.blur(radius: 12.28 * u)
						.offset(y: 12.28 * u)
				}
				.background(discCtaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
				.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Disc.ctaBorder, lineWidth: 0.36 * u))
		}
		.buttonStyle(.pressDim)
	}
}

struct SheetSecondary: View {
	let text: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
				.font(StakFont.sora(14 * u))
				.foregroundStyle(Disc.muted)
				.frame(maxWidth: .infinity)
				.frame(height: 52 * u * typeScale)
				// 1:2197 authors NO fill - the render's lighter band under Confirm is
				// the CTA's own glow (exact-design audit 2026-09-04); hairline only.
				.contentShape(Rectangle())
				.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u))
		}
		.buttonStyle(.pressDim)
	}
}

/// "Buy …?" practice ticket (frame 1:1970, sheet 1:2159) — content only;
/// DiscoverBuyFlow hosts the ONE scaffold both ticket and receipt share.
/// The authored pills' stakes (1:1970); index 4 is Custom.
private let practicePillAmounts: [Double] = [10, 25, 50, 100]

struct PracticeBuySheet: View {
	let spec: BuySpec
	let onConfirm: () -> Void
	let onDismiss: () -> Void
	/// 1:1970 authors "Not yet"; the Simulate ticket (1:4232) authors "Back".
	var secondary: String = "Not yet"
	/// Codex audit (2026-09-04): the chosen stake. DiscoverBuyFlow owns it
	/// (the receipt reads the same figures) and hands `spec` back already
	/// AT this amount. Declared last - memberwise order; the call site
	/// passes them last.
	var amount: Double = 25
	var onAmount: (Double) -> Void = { _ in }
	/// Market or limit (FigJam Simulate board, 2026-09-14): a limit price under
	/// today's waits as an open order. Declared last - memberwise order.
	var limitPrice: Double? = nil
	var onLimit: (Double?) -> Void = { _ in }

	@State private var selected = 1   // the authored $25 pill (1:1970); DiscoverBuyFlow opens at 25
	@State private var customText = ""
	@State private var limitText = ""
	private var isLimit: Bool { limitPrice != nil }
	/// A limit that does not parse to a positive price ("0", "1.2.3") holds Confirm (Codex review, PR #167); an empty field still means today's price.
	private var limitOk: Bool { !isLimit || limitText.isEmpty || (Double(limitText).map { $0 > 0 } ?? false) }
	/// The shares a valid below-market limit reserves - counted at the limit, not today's quote.
	private var limitShares: String? {
		guard isLimit, limitOk, let l = limitPrice, l > 0, l < spec.price else { return nil }
		return PaperPortfolio.shares(amount / l)
	}

	/// A pill selects its stake; Custom re-applies whatever valid amount
	/// its field already holds (else the last pill value stands).
	private func pick(_ i: Int) {
		// A preset above the cash on hand is refused and does not become the selection
		// (Codex review, PR #166); Custom re-applies whatever valid amount its field holds.
		if i < practicePillAmounts.count {
			let value = practicePillAmounts[i]
			if value <= PaperPortfolio.shared.cash { selected = i; onAmount(value) }
		} else {
			selected = i
			applyCustom()
		}
	}

	/// Codex audit (2026-09-04): a typed stake counts once it parses to > 0
	/// and <= the cash available (PaperPortfolio; $8,800 seeded); anything
	/// else leaves the last pill value standing.
	private func applyCustom() {
		let raw = customText
			.replacingOccurrences(of: "$", with: "")
			.replacingOccurrences(of: ",", with: "")
			.trimmingCharacters(in: .whitespaces)
		// Custom publishes its field's value, or NO amount (0) until a valid one is
		// typed - never the preset it replaced (Codex review, PR #167).
		if let value = Double(raw), value > 0, value <= PaperPortfolio.shared.cash { onAmount(value) } else { onAmount(0) }
	}

	var body: some View {
		let u = figmaUnit
		Group {
			VStack(alignment: .leading, spacing: 14 * u) {
				Text(spec.title)
					.font(StakFont.sora(18 * u, .semiBold))
					.foregroundStyle(Color.white)
				SheetStockRow(spec: spec)
				// The authored 14 column gap alone (1:1970 / 1:4232): the old +1 / +1.5
				// ink nudges predate the full line boxes (mirrors Android, 2026-09-05).
				Text("Your paper stake starts at today’s price and tracks the real move live, in either direction.")
					.font(StakFont.geist(12 * u))
					.stakLineHeight(18 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Disc.body)
				VStack(alignment: .leading, spacing: 12 * u) {
					HStack(spacing: 6 * u) {
						Text("Cash available")
							.font(StakFont.geist(12 * u))
							.foregroundStyle(Disc.muted)
						Text(spec.cashBefore)
							.font(StakFont.geist(12 * u, .medium))
							.foregroundStyle(Disc.brightInk)
					}
					HStack(spacing: 8 * u) {
						ForEach(Array(["$10", "$25", "$50", "$100", "Custom"].enumerated()), id: \.offset) { i, label in
							let sel = i == selected
							Button { pick(i) } label: {
								Text(label)
									.font(StakFont.geist(12 * u, .medium))
									.foregroundStyle(sel ? Disc.amountSelInk : Disc.amountInk)
									.frame(maxWidth: .infinity)
									.padding(.vertical, 8 * u)
									.background(sel ? Disc.amountSelBg : Disc.amountBg, in: RoundedRectangle(cornerRadius: 10 * u))
									.overlay(
										RoundedRectangle(cornerRadius: 10 * u)
											.strokeBorder(sel ? Disc.amountSelBorder : Disc.amountBorder, lineWidth: sel ? 0.5 * u : 1 * u)
									)
							}
							.buttonStyle(.pressDim)
						}
					}
					if selected == 4 {
						// Codex audit (2026-09-04): Custom opens an inline amount
						// field directly under the pills (1:1970 authors the pill
						// only - its visuals stay as authored). Field chrome = the
						// pill palette: amountBg fill, amountSelBorder rim.
						HStack(spacing: 4 * u) {
							Text("$")
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(Disc.amountInk)
							TextField("0.00", text: $customText)
								.keyboardType(.decimalPad)
								// Digits and one point, nine characters at most (mirrors android).
								.onChange(of: customText) { _, new in
									let clean = String(new.filter { $0.isNumber || $0 == "." }.prefix(9))
									if clean != new { customText = clean }
								}
								.textFieldStyle(.plain)
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(Disc.amountInk)
						}
						.padding(.horizontal, 12 * u)
						.padding(.vertical, 8 * u)
						.background(Disc.amountBg, in: RoundedRectangle(cornerRadius: 10 * u))
						.overlay(RoundedRectangle(cornerRadius: 10 * u).strokeBorder(Disc.amountSelBorder, lineWidth: 0.5 * u))
						.onChange(of: customText) { applyCustom() }
					}
				}
				// Market or limit (FigJam Simulate board, 2026-09-14). 1:1970 authors a
				// market ticket only; the row borrows the pills' chrome.
				VStack(alignment: .leading, spacing: 8 * u) {
					HStack(spacing: 8 * u) {
						ForEach([("Market", false), ("Limit", true)], id: \.0) { label, limit in
							let sel = isLimit == limit
							Button { onLimit(limit ? (Double(limitText).flatMap { $0 > 0 ? $0 : nil } ?? spec.price) : nil) } label: {
								Text(label)
									.font(StakFont.geist(12 * u, .medium))
									.foregroundStyle(sel ? Disc.amountSelInk : Disc.amountInk)
									.frame(maxWidth: .infinity)
									.padding(.vertical, 8 * u)
									.background(sel ? Disc.amountSelBg : Disc.amountBg, in: RoundedRectangle(cornerRadius: 10 * u))
									.overlay(
										RoundedRectangle(cornerRadius: 10 * u)
											.strokeBorder(sel ? Disc.amountSelBorder : Disc.amountBorder, lineWidth: sel ? 0.5 * u : 1 * u)
									)
							}
							.buttonStyle(.pressDim)
						}
					}
					if isLimit {
						HStack(spacing: 4 * u) {
							Text("Limit $")
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(Disc.amountInk)
							TextField(String(format: "%.2f", spec.price), text: $limitText)
								.keyboardType(.decimalPad)
								// Digits and one point, nine characters at most; empty means today's price.
								.onChange(of: limitText) { _, new in
									let clean = String(new.filter { $0.isNumber || $0 == "." }.prefix(9))
									if clean != new { limitText = clean; return }
									onLimit(Double(clean).flatMap { $0 > 0 ? $0 : nil } ?? spec.price)
								}
								.textFieldStyle(.plain)
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(Disc.amountInk)
						}
						.padding(.horizontal, 12 * u)
						.padding(.vertical, 8 * u)
						.background(Disc.amountBg, in: RoundedRectangle(cornerRadius: 10 * u))
						.overlay(RoundedRectangle(cornerRadius: 10 * u).strokeBorder(Disc.amountSelBorder, lineWidth: 0.5 * u))
						Text((limitPrice ?? 0) >= spec.price ? "At or above today\u{2019}s price - fills right away." : "Below today\u{2019}s price - waits as an open order until \(spec.symbol) gets there.")
							.font(StakFont.geist(11 * u))
							.foregroundStyle(Disc.muted)
					}
				}
				// Authored: chips → shares line is a 24 gap (14 + 10).
				HStack(alignment: .bottom, spacing: 6 * u) {
					Text("You get")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Disc.muted)
					Text(limitShares ?? spec.shares)
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(Disc.brightInk)
					Text("shares of \(spec.symbol)")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Disc.muted)
				}
				.frame(maxWidth: .infinity)
				.padding(.top, 10 * u)
				VStack(spacing: 16 * u) {
					// Confirm only with a stake the cash covers (Codex review, PR #167).
					SheetCta(text: isLimit && (limitPrice ?? 0) < spec.price ? "Place limit order" : "Confirm practice buy", action: onConfirm)
						.disabled(!PaperPortfolio.shared.canBuy(amount) || !limitOk)
						.opacity(PaperPortfolio.shared.canBuy(amount) && limitOk ? 1 : 0.5)
					SheetSecondary(text: secondary, action: onDismiss)
				}
			}
		}
	}
}

/// "Order filled" receipt (frame 85:1205, sheet 85:1394) — content only;
/// DiscoverBuyFlow hosts the ONE scaffold both ticket and receipt share.
struct OrderFilledSheet: View {
	let spec: BuySpec
	let onDismiss: () -> Void
	var primary: String = "View in My STAK"
	var secondary: String = "Keep exploring"
	/// Authored per-CTA exits (85:1205); nil falls back to onDismiss.
	var onPrimary: (() -> Void)? = nil
	var onSecondary: (() -> Void)? = nil
	/// A limit order under today's price is placed, not filled (FigJam: Order pending). Declared last - memberwise order.
	var pendingLimit: Double? = nil

	var body: some View {
		let u = figmaUnit
		Group {
			VStack(spacing: 14 * u) {
				Image("IcSheetCheck")
					.resizable()
					.frame(width: 47 * u, height: 47 * u)
				Text(pendingLimit != nil ? "Order placed" : "Order filled")
					.font(StakFont.sora(18 * u, .semiBold))
					.foregroundStyle(Color.white)
				SheetStockRow(spec: spec)
				// Authored status line (85:1407): Geist 12 / lh 18, left-aligned, 14 below
				// the stock row - exact-design audit 2026-09-04 (was 14).
				Text(pendingLimit.map { "Waits for \(spec.symbol) at \(PaperPortfolio.money($0)) or below · paper order" } ?? "Filled instantly · paper order")
					.font(StakFont.geist(12 * u))
					.stakLineHeight(18 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Disc.body)
					.frame(maxWidth: .infinity, alignment: .leading)
				HStack(spacing: 6 * u) {
					Text("Cash available")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Disc.muted)
					Text(spec.cashAfter)
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(Disc.brightInk)
					Spacer()
				}
				HStack(alignment: .bottom, spacing: 6 * u) {
					Text(pendingLimit != nil ? "Reserved for" : "You now hold")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Disc.muted)
					Text(spec.shares)
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(Disc.brightInk)
					Text("shares of \(spec.symbol)")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Disc.muted)
				}
				.frame(maxWidth: .infinity)
				// Authored ticket (85:1408): Cash row 0-16, Shares line at 40 -> a 24 gap.
				.padding(.top, 10 * u)
				VStack(spacing: 16 * u) {
					SheetCta(text: primary, action: onPrimary ?? onDismiss)
					SheetSecondary(text: secondary, action: onSecondary ?? onDismiss)
				}
			}
		}
	}
}

/// Buy → Order-filled flow, reused by the Stock Detail page. Authored
/// SMART_ANIMATE 350 (ticket 1:1970 -> receipt 85:1205; the same component
/// backs 1:3423 -> 71:949 and 1:4232 -> 85:895): ONE sheet stays put while
/// its content cross-fades and its height eases to the receipt's.
struct DiscoverBuyFlow: View {
	let spec: BuySpec
	let onClose: () -> Void
	var filledPrimary: String = "View in My STAK"
	var filledSecondary: String = "Keep exploring"
	var ticketSecondary: String = "Not yet"
	/// Authored per-CTA exits; nil falls back to onClose.
	var onFilledPrimary: (() -> Void)? = nil
	var onFilledSecondary: (() -> Void)? = nil
	var onTicketSecondary: (() -> Void)? = nil
	/// Codex audit (2026-09-04): fired exactly once when the order fills -
	/// the shell's DISCOVER flow counts it for the receipt (1:2330).
	/// Declared last - memberwise order; MainTabsView passes it last.
	var onFilled: () -> Void = {}

	@State private var filled = false
	/// Codex audit (2026-09-04): the chosen stake - both sheets read the
	/// ticket AT this amount, so "You get", the cash after and "You now
	/// hold" agree (1:1970 / 85:1205).
	@State private var amount: Double = 25
	/// Market or limit (FigJam Simulate board, 2026-09-14): a limit under today's
	/// price is placed as an open order and the receipt says so.
	@State private var limitPrice: Double? = nil
	@State private var placedLimit: Double? = nil
	/// Codex audit (2026-09-04): the cash on hand when the ticket opened -
	/// read once, so the receipt's cash after (85:1205) holds still after
	/// the buy lands in PaperPortfolio.
	@State private var cashAtOpen: Double = PaperPortfolio.shared.cash
	/// The ticket re-priced from today's live quote (tickets carry sample prices), so the order fills at today's price.
	@State private var quoted: BuySpec? = nil

	var body: some View {
		let ticket = quoted ?? spec
		let live = ticket.withAmount(amount, cash: cashAtOpen)
		SheetScaffold(onDismiss: { if filled { (onFilledSecondary ?? onClose)() } else { onClose() } }) {
			ZStack(alignment: .top) {
				if !filled {
					// Codex audit (2026-09-04): every host (Discover, Simulate, Stock
					// Detail) fills through here, so the paper buy lands once, before
					// the host's onFilled.
					PracticeBuySheet(
						spec: live,
						// The order is checked again at confirm - nothing fills past the cash on hand.
						onConfirm: {
							guard !filled, ticket.price > 0, PaperPortfolio.shared.canBuy(amount) else { return }
							if let limit = limitPrice, limit < ticket.price {
								// Below today's price: an open order, no fill yet (FigJam: Order pending).
								if PaperPortfolio.shared.placeLimit(ticket, amount: amount, limit: limit) { placedLimit = limit; filled = true }
							} else {
								filled = true
								PaperPortfolio.shared.buy(ticket, amount: amount)
								onFilled()
							}
						},
						onDismiss: onTicketSecondary ?? onClose, secondary: ticketSecondary, amount: amount, onAmount: { amount = $0 },
						limitPrice: limitPrice, onLimit: { limitPrice = $0 }
					)
						.transition(.opacity)
				} else {
					// Review (2026-09-04): "You now hold" is the FULL holding after the
					// buy - a top-up shows the position's shares, not the ticket's.
					// A pending limit (review 2026-09-14) reserves `amount` of cash: "Reserved for" shows
					// what the stake buys AT the limit, not today's price or the existing holding.
					let held = placedLimit.map { PaperPortfolio.shares(amount / $0) } ?? (PaperPortfolio.shared.pickSpec(spec.symbol)?.shares ?? live.shares)
					OrderFilledSheet(
						spec: BuySpec(
							title: live.title, badge: live.badge, name: live.name, priceLine: live.priceLine, change: live.change,
							cashBefore: live.cashBefore, cashAfter: live.cashAfter, shares: held, symbol: live.symbol
						),
						onDismiss: onClose, primary: filledPrimary, secondary: filledSecondary, onPrimary: onFilledPrimary, onSecondary: onFilledSecondary,
						pendingLimit: placedLimit
					)
					.transition(.opacity)
				}
			}
			.animation(.easeOut(duration: 0.35), value: filled)
		}
		.task(id: spec.symbol) {
			guard let q = await LiveQuotes.shared.quote(spec.symbol), !filled else { return }
			quoted = spec.withQuote(q.price, changePct: q.changePct)
		}
	}
}

// MARK: – DeckLoadError

/// Shown when the initial deck load fails (mirrors Android DeckLoadError composable).
/// Shown instead of the deck when today's cards couldn't load - never stand-in cards with made-up prices.
private struct DeckLoadError: View {
	let onRetry: () -> Void

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 10 * u) {
			Text("Couldn't load today's deck")
				.font(StakFont.sora(18 * u, .semiBold))
				.foregroundStyle(Disc.brightInk)
			Text("Check your connection and try again.")
				.font(StakFont.geist(12 * u))
				.foregroundStyle(Disc.muted)
			Spacer().frame(height: 8 * u)
			Button(action: onRetry) {
				Text("Retry")
					.font(StakFont.geist(14 * u, .medium))
					.foregroundStyle(Color.white)
					.frame(width: 140 * u * typeScale, height: 44 * u * typeScale)
					.background(discCtaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
			}
			.buttonStyle(.pressDim)
		}
		.frame(maxWidth: .infinity)
		.padding(.horizontal, 20 * u)
		.padding(.top, 80 * u)
	}
}

// MARK: – Quick Look

/// The Quick Look sheet (V1 rules 7–8), opened by "Learn more": the company, a one-line summary, why investors are
/// watching, its strength, its main risk, what to watch next and its key themes. Presented as a native iOS sheet (drag
/// down to dismiss); the content is Android's QuickLookSheet.
private struct QuickLookSheet: View {
	let card: DiscoverCard
	let load: (String) async -> QuickLookData
	@State private var data: QuickLookData? = nil

	var body: some View {
		let u = figmaUnit
		ScrollView(showsIndicators: false) {
			VStack(alignment: .leading, spacing: 0) {
				Text("Quick Look")
					.font(StakFont.geist(11 * u, .medium))
					.tracking(0.4 * u)
					.foregroundStyle(Disc.muted)
					.padding(.bottom, 10 * u)
				// Title row: "Apple" in bright ink, "AAPL" beside it in teal.
				HStack(alignment: .bottom, spacing: 6 * u) {
					Text(card.companyName)
						.font(StakFont.sora(22 * u, .bold))
						.stakLineHeight(27 * u, size: 22 * u, face: .sora)
						.foregroundStyle(Disc.brightInk)
					Text(card.symbol)
						.font(StakFont.geist(14 * u, .medium))
						.stakLineHeight(20 * u, size: 14 * u, face: .geist)
						.foregroundStyle(Disc.teal)
						.padding(.bottom, 1 * u)
				}
				let ql = data?.structured
				// The one-line business summary under the title.
				let summary = nonBlank(ql?.in10Seconds) ?? nonBlank(data?.sections.first?.content) ?? nonBlank(card.headline)
				if let summary {
					Text(summary)
						.font(StakFont.geist(13 * u))
						.stakLineHeight(18 * u, size: 13 * u, face: .geist)
						.foregroundStyle(Disc.body)
						.fixedSize(horizontal: false, vertical: true)
						.padding(.top, 4 * u)
						.padding(.bottom, 16 * u)
				} else {
					Spacer().frame(height: 12 * u)
				}
				if let ql {
					QuickLookIconRow(icon: "IcQlTrending", label: "Why investors are watching", body: ql.whyNow, u: u)
					Spacer().frame(height: 14 * u)
					QuickLookIconRow(icon: "IcQlLayers", label: "Business strength", body: ql.setup, u: u)
					Spacer().frame(height: 14 * u)
					QuickLookIconRow(icon: "IcRiskShield", label: "Main risk", body: ql.theCatch, u: u)
					Spacer().frame(height: 14 * u)
					QuickLookIconRow(icon: "IcQlCalendar", label: "Watch next", body: ql.whatToWatch, u: u)
					KeyThemes(themes: ql.keyThemes, u: u)
				} else if let sections = data?.sections, !sections.isEmpty {
					let icons = ["IcQlTrending", "IcQlLayers", "IcRiskShield", "IcQlCalendar", "IcRiskEye"]
					ForEach(Array(sections.dropFirst().enumerated()), id: \.offset) { i, section in
						if i > 0 { Spacer().frame(height: 14 * u) }
						QuickLookIconRow(icon: icons[i % icons.count], label: section.heading, body: section.content, u: u)
					}
					KeyThemes(themes: card.categories.map { c in
						c.split(separator: "_").map { $0.prefix(1).uppercased() + $0.dropFirst() }.joined(separator: " & ")
					}, u: u)
				} else if data == nil && !card.brandId.isEmpty {
					// The first open of a brand each day waits on generation - usually a few seconds.
					Text("Putting together today\u{2019}s overview\u{2026}")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Disc.muted)
				}
				Spacer().frame(height: 8 * u)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.horizontal, 20 * u)
			.padding(.top, 34 * u)
			.padding(.bottom, 12 * u)
		}
		.task(id: card.brandId) {
			if !card.brandId.isEmpty { data = await load(card.brandId) }
		}
	}

	private func nonBlank(_ s: String?) -> String? {
		guard let s, !s.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
		return s
	}
}

/// Key-theme chips under the Quick Look; renders nothing for an empty list.
private struct KeyThemes: View {
	let themes: [String]
	let u: CGFloat

	var body: some View {
		if !themes.isEmpty {
			FlowLayout(spacing: 6 * u) {
				ForEach(themes, id: \.self) { theme in
					Text(theme)
						.font(StakFont.geist(10 * u))
						.foregroundStyle(Disc.body)
						.padding(.horizontal, 9 * u)
						.padding(.vertical, 4 * u)
						.background(Color(argb: 0xFF1E2030), in: Capsule())
						.overlay(Capsule().strokeBorder(Color(argb: 0xFF3A3A50), lineWidth: 1))
				}
			}
			.padding(.top, 16 * u)
		}
	}
}

private struct QuickLookIconRow: View {
	let icon: String
	let label: String
	let body_: String
	let u: CGFloat

	init(icon: String, label: String, body: String, u: CGFloat) {
		self.icon = icon
		self.label = label
		self.body_ = body
		self.u = u
	}

	var body: some View {
		HStack(alignment: .top, spacing: 10 * u) {
			Image(icon)
				.resizable()
				.frame(width: 14 * u, height: 14 * u)
				.frame(width: 28 * u, height: 28 * u)
				.background(Color(argb: 0xFF1E2030), in: RoundedRectangle(cornerRadius: 6 * u))
			VStack(alignment: .leading, spacing: 3 * u) {
				Text(label)
					.font(StakFont.geist(12 * u, .semiBold))
					.stakLineHeight(16 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Disc.brightInk)
				Text(body_)
					.font(StakFont.geist(12 * u))
					.stakLineHeight(17 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Disc.body)
					.fixedSize(horizontal: false, vertical: true)
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
	}
}
