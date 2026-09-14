import SwiftUI

/// 04 · Discover — "first run" (CHINEDU 1:1627) with its states: the
/// swipe deck (twelve cards cycling the three designed ones - the
/// authored deck look wins; user, 2026-09-04, DE-STAK 04 · Discover
/// 1:1916), the Save toast (1:1796), the Buy practice ticket (1:1970)
/// and Order filled (85:1205), and the End-of-deck receipt (1:2330).
/// Ported from android/ ui/discover/DiscoverScreen.kt.
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
	/// #FFFFFF @ 9% - the Save pill on BOTH Discover frames (DE-STAK 1:2048,
	/// CHINEDU 1:1759); the earlier 15% no longer reads anywhere (user crop,
	/// 2026-09-04).
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

	/// Codex audit (2026-09-04): this ticket at a chosen stake against the
	/// cash on hand - the shares and the cash after follow the amount, the
	/// cash before is `cash` (PaperPortfolio.shared.cash when the ticket
	/// opens; the authored seed is 8800). The authored $25 tickets
	/// round-trip byte-identically (25/122.10 -> "0.2048", 25/947.20 ->
	/// "0.0264"; $8,800.00 / $8,775.00). Review (2026-09-04): no cash
	/// default - the one caller passes it. Mirrors android
	/// ui/discover/DiscoverScreen.kt.
	func withAmount(_ amount: Double, cash: Double) -> BuySpec {
		BuySpec(
			title: title, badge: badge, name: name, priceLine: priceLine, change: change,
			cashBefore: PaperPortfolio.money(cash), cashAfter: PaperPortfolio.money(cash - amount),
			shares: String(format: "%.4f", amount / price), symbol: symbol
		)
	}
}

/// Codex audit (2026-09-04): the Practice buy ticket serves the FRONT card
/// (1:1970 authors "Buy NVDA?" only because NVDA leads the deck).
func buySpec(for symbol: String) -> BuySpec {
	switch symbol {
	case "AAPL": return aaplBuy
	case "GOOGL": return googlBuy
	default: return nvdaBuy
	}
}

/// Codex audit (2026-09-04): this run's practice-buy count for the
/// end-of-deck receipt (1:2330). The Discover ticket is hoisted into the
/// shell (MainTabsView), so the count lives outside the deck view.
/// Mirrors android ui/discover/DiscoverScreen.kt.
final class DeckSession: ObservableObject {
	static let shared = DeckSession()
	/// The whole run lives here, not in the view's @State (review,
	/// 2026-09-04): the Discover page is rebuilt on every tab hop -
	/// Confirm -> "View in My STAK" -> back to the deck - and a view-local
	/// `seen` would restart the deck while `bought` kept counting. One
	/// lifetime, one reset.
	@Published var seen = 0 { didSet { persist() } }
	@Published var saved: Set<String> = [] { didSet { persist() } }
	@Published var bought = 0 { didSet { persist() } }
	/// Where the run is in the cards still on the deck - swipes move it, a save-driven removal does not (Codex review, PR #167).
	@Published var cursor = 0 { didSet { persist() } }

	/// "Swipe today's deck again" and the tab re-tap from the end.
	func restart() {
		seen = 0
		saved = []
		bought = 0
		cursor = 0
	}

	// Persisted per day (product audit, 2026-09-05): a relaunch resumes today's
	// run, tomorrow lands a new deck. Mirrors android DeckSession.
	private var loading = false
	private static func today() -> String {
		let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; return f.string(from: Date())
	}

	/// Re-entering Discover on a later day starts the day's deck without a relaunch (audit 2026-09-07).
	func refreshDay() {
		if StakStore.string("deck.day") != Self.today() { load() }
	}

	func load() {
		loading = true
		if StakStore.string("deck.day") == Self.today() {
			seen = StakStore.int("deck.seen", default: 0)
			saved = StakStore.stringSet("deck.saved") ?? []
			bought = StakStore.int("deck.bought", default: 0)
			cursor = StakStore.int("deck.cursor", default: 0)
		} else {
			seen = 0; saved = []; bought = 0; cursor = 0
		}
		loading = false
	}

	private func persist() {
		guard !loading else { return }
		StakStore.set(Self.today(), for: "deck.day")
		StakStore.set(seen, for: "deck.seen")
		StakStore.set(saved, for: "deck.saved")
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

/// One deck card's designed content (art + copy at the front-card scale).
private struct DeckCard {
	let art: String
	let ticker: String
	let headline: String
	let price: String
	let change: String
	let tip: String
	let cardTop: Color
	let artBg: Color

	/// "NVDA · NVIDIA Corp" -> "NVDA" - the routing/holdings symbol.
	var symbol: String { ticker.components(separatedBy: " · ").first ?? ticker }
}

private let deck: [DeckCard] = [
	DeckCard(
		art: "DiscCardNVDA", ticker: "NVDA · NVIDIA Corp",
		headline: "Chip demand is outrunning supply, and NVIDIA sets the prices.",
		price: "$122.10", change: "▲ 2.4% today",
		tip: "Chip stocks swing hard. Small stakes, long views.",
		cardTop: Color(argb: 0xFF152A47), artBg: Color(argb: 0xFF142844)
	),
	DeckCard(
		art: "DiscCardAAPL", ticker: "AAPL · Apple Inc",
		headline: "Two billion devices, and every one of them keeps paying Apple.",
		price: "$229.35", change: "▲ 1.2% today",
		tip: "Steady giants move slower. Stable stocks often do.",
		cardTop: Color(argb: 0xFF283E5D), artBg: Color(argb: 0xFF253A59)
	),
	DeckCard(
		art: "DiscCardGOOGL", ticker: "GOOGL · Alphabet Inc",
		headline: "Search pays for everything, and nine billion-user products ride behind it.",
		price: "$178.90", change: "▲ 0.8% today",
		// One authored line (1:2061, 265 wide): the peek-card/tutorial copy
		// "Ad money moves with the economy, so some quarters just drift." runs 315u.
		tip: "Ad money tracks the economy. Some quarters drift.",
		cardTop: Color(argb: 0xFF263D5D), artBg: Color(argb: 0xFF2F486E)
	)
]

/// user, 2026-09-04 (DE-STAK 04 · Discover 1:1916): the authored deck look
/// wins - a twelve-card run ("1/12") cycling the three designed cards, as
/// the frames author it.
private let deckSize = 12

struct DiscoverView: View {
	// Property order IS the memberwise-init argument order (Swift); the
	// only call site, MainTabsView, passes resetKey first - keep it first.
	/// 1:2330: a Discover tab re-tap from the end of the deck restarts it.
	var resetKey: Int = 0
	// The tapped card’s SYMBOL rides along - the detail page serves that
	// stock, not always AAPL (user, 2026-09-01).
	var onLearnMore: (String) -> Void = { _ in }
	/// Raised to the shell — the buy ticket scrims the TAB BAR too (frame
	/// 1:1970), so MainTabsView owns the overlay, mirroring Android's
	/// MainShell `discoverBuy` hoist.
	var onPracticeBuy: (BuySpec) -> Void = { _ in }
	/// Authored (1:2330): the end-of-deck receipt's cross-tab CTAs - instant
	/// SWAPs to My STAK ("Review saves") and Simulate ("Practice buy your
	/// saves"), raised to the shell.
	var onReviewSaves: () -> Void = {}
	var onPracticeBuySaves: () -> Void = {}

	/// The run's position - proxies DeckSession so a tab hop keeps the deck.
	private var seen: Int {
		get { session.seen }
		nonmutating set { session.seen = newValue }
	}
	private var cursor: Int {
		get { session.cursor }
		nonmutating set { session.cursor = newValue }
	}
	@State private var savedToast = false
	/// THIS RUN's saves (symbols) - the Save chip AND the receipt's Saved
	/// count read it; proxies DeckSession. The chip follows this run, not
	/// My STAK: 1:1916 shows Save on NVDA even though My STAK lists it
	/// (user, 2026-09-04) - 1:1627 vs 1:1796, the chip goes once the card
	/// is saved here. Private wrapped defaults stay out of the memberwise
	/// init - resetKey remains the first argument.
	private var savedCards: Set<String> {
		get { session.saved }
		nonmutating set { session.saved = newValue }
	}
	// Codex audit (2026-09-04): the shell's DISCOVER ticket reports fills here.
	@ObservedObject private var session = DeckSession.shared
	/// Observed so a save (or an Unsave in My STAK) re-reads the cards on the deck.
	@ObservedObject private var holdings = MyStakHoldings.shared
	@State private var dragOffset: CGFloat = 0
	@State private var frontOpacity: Double = 1
	// Promote progress: 0 = the authored mid-slab geometry (1:1701,
	// y 36.39 / 313.14 wide), 1 = settled in the front slot.
	@State private var promote: CGFloat = 1
	// Swipes must NEVER be eaten (user, 2026-09-02, mirrors android): the
	// deck advances the moment a swipe commits and the swiped card flies
	// off as a non-interactive GHOST above the live deck - the finger
	// owns the new front card immediately, so any cadence lands.
	@State private var flyingCard: DeckCard? = nil
	@State private var flyOffset: CGFloat = 0
	@State private var flyFade: Double = 0
	@State private var flyGen = 0

	/// The front card's index - the twelve-card run cycles the three designed
	/// cards (user, 2026-09-04, 1:1916); past the twelfth the receipt (1:2330)
	/// replaces the deck.
	/// The designed cards this account has NOT saved in the app: a save recorded on
	/// this account (MyStakHoldings.add stamps its day) takes the card off the deck
	/// until it is unsaved from My STAK; the persona's seeded holdings carry no day,
	/// so its authored deck stands (user, 2026-09-08: a card already in My STAK
	/// should not be on Discover, and Save only shows on cards not yet saved).
	private var cards: [DeckCard] {
		deck.filter { !holdings.tickers.contains($0.symbol) || holdings.daysSinceSaved($0.symbol) == nil }
	}

	/// The card at a run position over the cards still on the deck (the full design set when none are).
	private func card(at position: Int) -> DeckCard {
		let pool = cards.isEmpty ? deck : cards
		return pool[((position % pool.count) + pool.count) % pool.count]
	}


	/// The deck advances: the front card leaves and the next promotes - the swipe
	/// commit (from `committed` pt of travel) and the Save chip (from rest; user,
	/// 2026-09-08: a saved card must not stay on the deck) share it, so Save reads
	/// exactly like a swipe.
	private func advance(committed: CGFloat, saving: DeckCard? = nil) {
		let u = figmaUnit
		if seen >= deckSize - 1 {
			// The final card: the authored fly-off finishes
			// before the end-of-deck receipt lands (1:2330).
			withAnimation(.easeOut(duration: 0.28)) { dragOffset = 500 * u }
			withAnimation(.easeOut(duration: 0.3)) { frontOpacity = 0 }
			DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
				// The save lands once the card has left, so the card flying off is the one saved.
				if let saving { MyStakHoldings.shared.add(saving.symbol) }
				seen += 1
				dragOffset = 0
				frontOpacity = 1
				promote = 1
			}
		} else {
			// The frame's card shuffle (1:1627), commit-first:
			// the swiped card becomes the ghost and the deck
			// advances NOW - a second swipe grabs the next
			// card even while the ghost is still flying.
			flyingCard = saving ?? card(at: cursor)
			flyGen += 1
			let gen = flyGen
			var reset = Transaction()
			reset.disablesAnimations = true
			withTransaction(reset) {
				flyOffset = committed
				flyFade = 1
				// A saved card leaves the pool now - the next card shifts into this cursor,
				// so only a swipe moves the cursor (Codex review, PR #167: AAPL was skipped).
				if let saving { MyStakHoldings.shared.add(saving.symbol) }
				seen += 1
				if saving == nil { cursor += 1 }
				dragOffset = 0
				// The new front takes over at the mid-slab geometry
				// the finger just revealed, then promotes forward.
				promote = 0
				// A velocity flick can commit before the crossfade
				// finished - pick the alpha up from the reveal.
				frontOpacity = Double(min(1, committed / (110 * u)))
			}
			DispatchQueue.main.async {
				withAnimation(.easeOut(duration: 0.28)) { flyOffset = 500 * u }
				withAnimation(.easeOut(duration: 0.3)) { flyFade = 0 }
				withAnimation(.easeOut(duration: 0.2)) { promote = 1 }
				withAnimation(.easeOut(duration: 0.12)) { frontOpacity = 1 }
			}
			DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
				if gen == flyGen { flyingCard = nil }
			}
		}
	}

	/// 1:2330 "Swipe today's deck again" and the tab re-tap restart the run:
	/// the deck, this run's saves and its fills all return to zero.
	private func restart() { session.restart() }

	var body: some View {
		let u = figmaUnit
		ZStack {
			VStack(spacing: 0) {
				// Header — Discover + progress ring, kicker below.
				// 1:2330 authors the whole header 10 lower than 1:1627 (ring y64 vs
				// 54) with an 8 kicker gap (y116) - exact-design audit 2026-09-04.
				let atEnd = seen >= deckSize || cards.isEmpty
				VStack(alignment: .leading, spacing: (atEnd ? 8 : 5) * u) {
					// 1:1627 centres the 33-tall title in the 44-tall ring row (measured exact);
					// the end-of-deck frame (1:2330) authors the title 7.5 higher against the
					// ring (y62 vs ring y64) in #F2F6FC (1:2354) - exact-design audit 2026-09-04.
					HStack {
						Text("Discover")
							.font(StakFont.sora(26 * u, .semiBold))
							.stakLineHeight(33 * u, size: 26 * u, face: .sora)
							.foregroundStyle(atEnd ? Disc.brightInk : Color.white)
							.offset(y: atEnd ? -7.5 * u : 0)
						Spacer()
						// The authored "1/12" counter and ring (1:1627; user, 2026-09-04).
						let count = min(seen + 1, deckSize)
						ZStack {
							ProgressRing(progress: CGFloat(count) / CGFloat(deckSize))
							Text("\(count)/\(deckSize)")
								.font(StakFont.sora(11 * u))
								.foregroundStyle(Color.white)
						}
						.frame(width: 44 * u, height: 44 * u)
					}
					// 1:1656 authors the kicker #5C6B85 / tracking 0.9, inset 2 (Context
					// row px-2); 1:2362 authors it #819ABB / tracking 0.8, flush at x20 -
					// exact-design audit 2026-09-04.
					Text("TODAY · AI & CHIPS")
						.font(StakFont.geist(10 * u, .medium))
						.tracking((atEnd ? 0.8 : 0.9) * u)
						.foregroundStyle(atEnd ? Disc.muted : Disc.faint)
						.padding(.leading, (atEnd ? 0 : 2) * u)
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, (atEnd ? 20 : 10) * u)

				Spacer().frame(height: 27 * u)

				if seen >= deckSize || cards.isEmpty {
					EndOfDeck(
						onPracticeBuySaves: onPracticeBuySaves,
						onReviewSaves: onReviewSaves,
						onSwipeAgain: { restart() },
						seen: min(seen, deckSize),
						saved: savedCards.count,
						bought: session.bought,
						canReplay: !cards.isEmpty
					)
					Spacer(minLength: 0)
				} else {
					// Deck — a fixed composition: every dimension scales by the
					// 390pt artboard unit so proportions match the frame on any
					// device. The shuffle lives inside the deck bounds — the
					// diving card must never cover the gesture/CTA zone.
					VStack(spacing: 0) {
						ZStack(alignment: .top) {
							// The authored deck (1:1627): the queued cards behind
							// are the DESIGNED ILLUSION — the exact authored
							// slabs, always (they give the illusion of a queue).
							// user, 2026-09-04 (DE-STAK 04 · Discover 1:1916): the
							// authored deck look wins - the baked exports, the next
							// card's own Save pill peeking at the top included.
							Image("DiscPeekTop")
								.resizable()
								.frame(width: 273.66 * u, height: 336.66 * u)
								.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
								.offset(x: 39 * u, y: 0)
							Image("DiscPeekMid")
								.resizable()
								.frame(width: 313.14 * u, height: 352.87 * u)
								.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
								.offset(x: 18 * u, y: 24 * u)
								.opacity(1 - min(1, max(0, dragOffset / (110 * u))))
							if seen < deckSize - 1 {
								// The design's queue is REAL cards (1:1701 = the next
								// card behind the front one - file metadata,
								// 2026-09-02): as the drag exposes the mid slab it
								// crossfades into the LIVE next card at the SAME
								// authored geometry, so the queue tells the truth.
								let next = card(at: cursor + 1)
								FrontDeckCard(card: next, onSave: {}, u: u, saved: savedCards.contains(next.symbol))
									.scaleEffect(0.8947, anchor: .top)
									.opacity(min(1, max(0, dragOffset / (110 * u))))
									.offset(y: 36.39 * u)
									.allowsHitTesting(false)
							}
							let frontCard = card(at: cursor)
							// Saving takes the card off the deck like a swipe (user, 2026-09-08).
							FrontDeckCard(card: frontCard, onSave: { savedCards.insert(frontCard.symbol); savedToast = true; advance(committed: 0, saving: frontCard) }, u: u, saved: savedCards.contains(frontCard.symbol))
								.scaleEffect(0.8947 + 0.1053 * promote, anchor: .top)
								.opacity(frontOpacity)
								.offset(y: 54.65 * u - 18.26 * u * (1 - promote) + dragOffset)
								.onTapGesture { onLearnMore(frontCard.symbol) }
							if let ghost = flyingCard {
								// The swiped-away card flying off above the live
								// deck; input falls through to the front card.
								FrontDeckCard(card: ghost, onSave: {}, u: u, saved: savedCards.contains(ghost.symbol))
									.opacity(flyFade)
									.offset(y: 54.65 * u + flyOffset)
									.allowsHitTesting(false)
							}
						}
						.frame(maxWidth: .infinity)
						.frame(height: 484.65 * u, alignment: .top)
						// Unclipped and above its siblings: a dragged or flying
						// card stays WHOLE past the deck bounds (2026-09-02).
						.zIndex(1)
						.contentShape(Rectangle())
						.gesture(
							DragGesture()
								.onChanged { value in
									dragOffset = max(0, value.translation.height)
								}
								.onEnded { value in
									let committed = max(0, value.translation.height)
									// Commit on distance OR on a fling (the predicted
									// end folds velocity in) - a fast short flick
									// advances too, the Instagram rule (2026-09-02).
									let flung = value.predictedEndTranslation.height > 110 * u && committed > 20 * u
									if committed > 110 * u || flung {
										advance(committed: committed)
									} else {
										withAnimation(.easeOut(duration: 0.18)) { dragOffset = 0 }
									}
								}
						)
						.padding(.horizontal, 20 * u)
						Spacer().frame(height: 10 * u)
						VStack(spacing: 5 * u) {
							VStack(spacing: 1 * u) {
								GestureChevron(u: u)
								GestureChevron(u: u)
							}
							.opacity(0.5)
							Text("Swipe down")
								.font(StakFont.geist(10 * u))
								.foregroundStyle(Disc.faint)
						}
						Spacer().frame(height: 19 * u)
						HStack(spacing: 36 * u) {
							// Codex audit (2026-09-04): the ticket serves the FRONT card.
							Button { onPracticeBuy(buySpec(for: card(at: cursor).symbol)) } label: {
								Text("Practice buy")
									.font(StakFont.geist(14 * u, .medium))
									.foregroundStyle(Color.white)
									.frame(width: 120 * u, height: 52 * u)
									// Authored drop shadow (1:1783 Inspect): dy 12.28, blur
									// 12.28, #52AAC7 at 9% (Learn more's is disabled).
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
							Button(action: { onLearnMore(card(at: cursor).symbol) }) {
								Text("Learn more")
									.font(StakFont.sora(12 * u))
									.foregroundStyle(Disc.muted)
									.frame(width: 120 * u, height: 52 * u)
									.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u))
							}
							.buttonStyle(.pressDim)
						}
						Spacer(minLength: 19 * u)
					}
				}
			}

			// Saved toast (frame 1:1796) - the pill sits at the authored x 111
			// (1:1965: x111 y122 w160), 4 left of the screen centre, not centred
			// (Android band-diff vs the 2x export, 2026-09-04; mirrors android).
			if savedToast {
				VStack {
					HStack(spacing: 0) {
						// Toast 1:1965 authors rgba(36,43,61,0.48), r18, px16 py11, gap 9
						// and a 17 bookmark (1:1966) - exact-design audit 2026-09-04.
						HStack(spacing: 9 * u) {
							Image("IcSavedBookmark")
								.resizable()
								.frame(width: 17 * u, height: 17 * u)
							Text("Saved to My STAK")
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(Color.white)
						}
						.padding(.horizontal, 16 * u)
						.frame(height: 39 * u)
						// Authored (1:1796): translucent pill — the peek slab shows through.
						.background(Disc.chipBg.opacity(0.48), in: RoundedRectangle(cornerRadius: 18 * u))
						Spacer(minLength: 0)
					}
					.padding(.leading, 111 * u)
					.padding(.top, 78 * u)
					Spacer()
				}
				.transition(.opacity)
				.onAppear {
					DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
						withAnimation { savedToast = false }
					}
				}
			}

		}
		.background(StakColors.bg.ignoresSafeArea())
		// Only a CHANGE of the key restarts a finished deck - never the re-entry
		// itself, so a deck the user comes back to from My STAK / Simulate keeps
		// its end state (prototype walk 2026-09-05; Android mirrors this with a
		// remembered initial key).
		.onAppear { DeckSession.shared.refreshDay() }
		.onChange(of: resetKey) { if seen >= deckSize { restart() } }
	}
}

/// 44u progress ring — #2a3346 track + #69b3ca arc from 12 o'clock,
/// 4u round stroke inset 4u.
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

/// The full-size front card (350u wide) with its live Save chip.
/// The deck's layer structure: every boundary in the frame is a
/// brightness step plus a thin dark rim (the authored exports carry
/// it). NVDA's dark chrome makes its own step; light-topped cards need
/// the rim — a tight dark seam hugging the edge — so the card reads as
/// its own layer over the queue in EVERY state.
private struct FrontDeckCard: View {
	// Property order IS the memberwise-init argument order; every call site
	// goes card, onSave, u, saved[, showSave].
	let card: DeckCard
	let onSave: () -> Void
	let u: CGFloat
	var saved: Bool = false
	/// A card drawn without its Save chip. Unused since the rear stack went
	/// back to the authored exports (user, 2026-09-04, 1:1916) - every live
	/// card takes the default.
	var showSave = true

	var body: some View {
		DeckCardBody(card: card, onSave: onSave, u: u, saved: saved, showSave: showSave)
			.frame(width: 350 * u)
			.background { CardSeam(u: u) }
	}
}

/// Concentric 1pt rounded strokes reaching 6u out from the card edge,
/// #060b16 fading by 0.5·(1−t)² — mirrors the Kotlin drawBehind loop.
private struct CardSeam: View {
	let u: CGFloat

	var body: some View {
		let reach = 6 * u
		ZStack {
			ForEach(0..<Int(ceil(reach)), id: \.self) { i in
				let d = CGFloat(i)
				let t = d / reach
				RoundedRectangle(cornerRadius: 22 * u + d)
					.stroke(Color(argb: 0xFF060B16).opacity(0.5 * (1 - t) * (1 - t)), lineWidth: 1)
					.padding(-d)
			}
		}
	}
}

private struct DeckCardBody: View {
	let card: DeckCard
	let onSave: (() -> Void)?
	let u: CGFloat
	var saved: Bool = false
	/// False draws no chip and no hidden Save hit-target. Declared last;
	/// callers pass it last.
	var showSave = true

	var body: some View {
		// The authored card template (1:1740, shared by all three designs):
		// art 340x229 at y4, overlay at 258 -> gap 25.
		VStack(spacing: 25 * u) {
			ZStack(alignment: .topTrailing) {
				Image(card.art)
					.resizable()
					.scaledToFill()
					.frame(width: 340 * u, height: 229 * u)
					.background(card.artBg)
					.clipShape(RoundedRectangle(cornerRadius: 18 * u))
				if showSave && !saved {
					// Every card draws the chip live at the template's authored
					// spot (art x264 y6); the saved deck (1:1796) has none. The
					// NVDA art is the chip-less export of 1:1910.
					SaveChip(u: u)
						.padding(.top, 6 * u)
						.padding(.trailing, 4 * u)
				}
				if let onSave, showSave, !saved {
					Button(action: onSave) {
						Color.clear.frame(width: 86 * u, height: 38 * u)
					}
					.buttonStyle(.pressDim)
					.padding(.top, 2 * u)
					.padding(.trailing, 6 * u)
				}
			}
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
					HStack(alignment: .bottom, spacing: 9 * u) {
						Text(card.price)
							.font(StakFont.sora(20 * u, .semiBold))
							.stakLineHeight(25 * u, size: 20 * u, face: .sora)
							.foregroundStyle(Color.white)
						Text(card.change)
							.font(StakFont.geist(11 * u, .medium))
							.stakLineHeight(14 * u, size: 11 * u, face: .geist)
							.foregroundStyle(Disc.green)
							.padding(.bottom, 2 * u)
					}
				}
				HStack(alignment: .center, spacing: 8 * u) {
					Text("TIP")
						.font(StakFont.geist(10 * u, .medium))
						.tracking(0.9 * u)
						.foregroundStyle(Disc.teal)
					Text(card.tip)
						.font(StakFont.geist(11 * u))
						.stakLineHeight(15 * u, size: 11 * u, face: .geist)
						.foregroundStyle(Disc.body)
						.frame(maxWidth: .infinity, alignment: .leading)
				}
				.padding(.horizontal, 12 * u)
				.padding(.vertical, 9 * u)
				.background(Disc.tealTint, in: RoundedRectangle(cornerRadius: 10 * u))
			}
			.padding(.horizontal, 18 * u)
			.padding(.bottom, 16 * u)
		}
		.padding(.top, 4 * u)
		.padding(.bottom, 4 * u)
		.frame(maxWidth: .infinity)
		.background(
			LinearGradient(colors: [card.cardTop, Color(argb: 0xFF0C1526)], startPoint: .top, endPoint: .bottom),
			in: RoundedRectangle(cornerRadius: 22 * u)
		)
	}
}

/// rgba(255,255,255,0.15) Save pill with the small bookmark — 72x30 at
/// the template's authored spot.
private struct SaveChip: View {
	let u: CGFloat

	var body: some View {
		HStack(spacing: 6 * u) {
			Text("Save")
				.font(StakFont.geist(12 * u, .medium))
				.foregroundStyle(Color.white)
			// The pill's own glyph (1:2050): 12 box, 8x10 bookmark, #AEAEAE stroke 1 -
			// not the hero's dark #0A1020 export (user crop, 2026-09-04).
			Image("IcSaveBookmark")
				.resizable()
				.frame(width: 12 * u, height: 12 * u)
		}
		.padding(.horizontal, 13 * u)
		.padding(.vertical, 7 * u)
		.background(Disc.saveChipBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

/// 16x8 down-chevron: the authored export (1:1777) is a 2-wide #5C6B85
/// round stroke M2 1 L8 7 L14 1 - exact-design audit 2026-09-04.
private struct GestureChevron: View {
	let u: CGFloat

	var body: some View {
		ChevronShape()
			.stroke(Disc.faint, style: StrokeStyle(lineWidth: 2 * u, lineCap: .round, lineJoin: .round))
			.frame(width: 16 * u, height: 8 * u)
	}
}

private struct ChevronShape: Shape {
	func path(in rect: CGRect) -> Path {
		let px = rect.width / 16
		var p = Path()
		p.move(to: CGPoint(x: 2 * px, y: 1 * px))
		p.addLine(to: CGPoint(x: 8 * px, y: 7 * px))
		p.addLine(to: CGPoint(x: 14 * px, y: 1 * px))
		return p
	}
}

/// Discover · End of deck (CHINEDU 1:2330) — receipt stats + CTAs.
private struct EndOfDeck: View {
	let onPracticeBuySaves: () -> Void
	let onReviewSaves: () -> Void
	let onSwipeAgain: () -> Void
	// Codex audit (2026-09-04): this run's real counts - 1:2330 authored
	// 12 / 7 / 2 as sample figures. Declared after the closures (memberwise
	// order); DiscoverView passes them last.
	var seen = 0
	var saved = 0
	var bought = 0
	/// No replay when every card is saved (Codex review, PR #167).
	var canReplay = true

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) {
			// Authored column (1:2330): title 190, stats 274, CTA 396, swipe 577.
			Spacer().frame(height: 34 * u)
			Text("Deck complete")
				.font(StakFont.sora(22 * u, .semiBold))
				.foregroundStyle(Disc.brightInk)
			Spacer().frame(height: 8 * u)
			// Authored copy (1:2330) - the twelve-card run reads it literally
			// (user, 2026-09-04, 1:1916).
			Text("Twelve cards, twelve signals. Your taste graph got smarter.")
				.font(StakFont.geist(12 * u))
				.foregroundStyle(Disc.muted)
			Spacer().frame(height: 32 * u)
			HStack(spacing: 10 * u) {
				statTile("Seen", "\(seen)", u)
				statTile("Saved", "\(saved)", u)
				statTile("Bought", "\(bought)", u)
			}
			Spacer().frame(height: 52 * u)
			SheetCta(text: "Practice buy your saves", action: onPracticeBuySaves)
			Spacer().frame(height: 9 * u)
			// Grouped: a ViewBuilder block takes ten children at most (Swift 5.9).
			Group {
				// Authored (1:2330): Review saves -> My STAK Overview, Instant.
				Button(action: onReviewSaves) {
					Text("Review saves in My STAK")
						.font(StakFont.sora(13 * u))
						.foregroundStyle(Disc.muted)
						.frame(maxWidth: .infinity)
						.frame(height: 52 * u)
						.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u))
				}
				.buttonStyle(.pressDim)
				Spacer().frame(height: 14 * u)
				Text("A new deck lands tomorrow with your morning brief.")
					.font(StakFont.geist(10 * u))
					.foregroundStyle(Disc.muted)
				Spacer().frame(height: 40.5 * u)
				if canReplay {
					Button(action: onSwipeAgain) {
						Text("Swipe today’s deck again")
							.font(StakFont.sora(13 * u))
							.foregroundStyle(Disc.muted)
							.frame(maxWidth: .infinity)
							.frame(height: 32 * u)
					}
					.buttonStyle(.pressDim)
				}
			}
		}
		.padding(.horizontal, 20 * u)
	}

	private func statTile(_ label: String, _ value: String, _ u: CGFloat) -> some View {
		VStack(spacing: 4 * u) {
			Text(label)
				.font(StakFont.geist(10 * u))
				.foregroundStyle(Disc.muted)
			Text(value)
				.font(StakFont.sora(20 * u, .semiBold))
				.foregroundStyle(Disc.brightInk)
		}
		.frame(width: 110 * u)
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
				.frame(height: 52 * u)
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
				.frame(height: 52 * u)
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
					Text(spec.shares)
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
						.disabled(!PaperPortfolio.shared.canBuy(amount))
						.opacity(PaperPortfolio.shared.canBuy(amount) ? 1 : 0.5)
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

	var body: some View {
		let live = spec.withAmount(amount, cash: cashAtOpen)
		SheetScaffold(onDismiss: onClose) {
			ZStack(alignment: .top) {
				if !filled {
					// Codex audit (2026-09-04): every host (Discover, Simulate, Stock
					// Detail) fills through here, so the paper buy lands once, before
					// the host's onFilled.
					PracticeBuySheet(
						spec: live,
						onConfirm: {
							guard !filled, PaperPortfolio.shared.canBuy(amount) else { return }
							if let limit = limitPrice, limit < spec.price {
								// Below today's price: an open order, no fill yet (FigJam: Order pending).
								if PaperPortfolio.shared.placeLimit(spec, amount: amount, limit: limit) { placedLimit = limit; filled = true }
							} else {
								PaperPortfolio.shared.buy(spec, amount: amount); filled = true; onFilled()
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
	}
}
