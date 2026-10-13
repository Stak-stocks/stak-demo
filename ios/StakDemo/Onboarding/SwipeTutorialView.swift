import SwiftUI

/// One deck card's designed content (art + copy at the front-card scale) —
/// the shared Discover card grammar (template 1:1740). Mirrors DECK in
/// android/ ui/discover/DiscoverScreen.kt (private on iOS, so restated here).
private struct DeckCard {
	let art: String
	let ticker: String
	let headline: String
	let price: String
	let change: String
	let tip: String
	let cardTop: Color
	let artBg: Color
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
		tip: "Ad money tracks the economy. Some quarters drift.",
		cardTop: Color(argb: 0xFF263D5D), artBg: Color(argb: 0xFF2F486E)
	)
]

// The tutorial deck (1:344) is the Discover deck at 87.4% — the same
// authored queue slabs behind a live front card built from the shared
// Discover card template. Slab poses template-matched to the frame.
private let deckScale: CGFloat = 305.75 / 350

/// Onboarding · 03 Swipe tutorial — Figma node 1:344 (CHINEDU file, "STEP 3 OF 6").
///
/// The stacked swipe deck: the authored queue slabs (AAPL and GOOGL at their designed
/// tilts) behind a live front card from the Discover template, at the frame's 87.4%
/// scale. The gesture IS Discover's own (device report, 2026-09-19: the tutorial was
/// teaching a vertical "swipe down for next card" that Discover doesn't have at all -
/// the real deck swipes horizontally, left to pass and right to STAK, with the same
/// Pass/STAK buttons underneath): drag left or right, the card rotates and the buttons
/// fill with the same ratio Discover uses, and a commit sends the card flying off in
/// that direction while the next design in the demo queue takes the front slot.
/// Mirrors android/ ui/onboarding/SwipeTutorialScreen.kt.
struct SwipeTutorialView: View {
	let onBack: () -> Void
	let onContinue: () -> Void

	@Environment(\.accessibilityReduceMotion) private var reduceMotion
	@State private var swiped = 0
	@State private var swipeOffset: CGFloat = 0
	// Swipes must NEVER be eaten (Discover, user 2026-09-02): the deck advances the
	// moment a swipe commits, and the swiped card flies off as a non-interactive GHOST
	// above the live deck - the finger owns the new front card immediately, so any
	// cadence lands.
	@State private var flyingCard: DeckCard? = nil
	@State private var flyOffset: CGFloat = 0
	@State private var flyFade: Double = 1
	@State private var flyGen = 0
	/// Bumped on every commit - the decision haptic.
	@State private var decisionTick = 0
	private let dragSlop: CGFloat = 10

	var body: some View {
		let u = figmaUnit
		let u2 = u * deckScale
		let commitPx = 110 * u2
		Artboard {
			HStack {
				AuthBackCircle(action: onBack)
				Spacer()
				StepLabel(text: "STEP 3 OF 6")
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 10 * u)
			.padding(.bottom, 4 * u)

			VStack(alignment: .leading, spacing: 18 * u) {
				VStack(alignment: .leading, spacing: 12 * u) {
					Text("Now try a few swipes.")
						.font(StakFont.sora(24 * u, .semiBold))
						.stakLineHeight(31 * u, size: 24 * u, face: .sora)
						.foregroundStyle(StakColors.textPrimary)
					Text("Swipe right to STAK, left to pass.")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Auth.subtitleGray)
				}
				.frame(maxWidth: .infinity, alignment: .leading)

				VStack(spacing: 0) {
					ZStack(alignment: .topLeading) {
						// The authored queue slabs (1:344) - static behind the live front card, same as
						// Discover's own peek cards: they don't animate or crossfade, they're just there
						// until the front card clears.
						Image(decorative: "TutorialCardGOOGL")
							.resizable()
							.frame(width: 238.75 * u, height: 290.75 * u)
							.offset(x: 33.5 * u, y: 0)
						Image(decorative: "TutorialCardAAPL")
							.resizable()
							.frame(width: 273.5 * u, height: 309.5 * u)
							.offset(x: 15.5 * u, y: 21 * u)
						FrontDeckCard(card: deck[swiped % 3], u: u2)
							.rotationEffect(.degrees(reduceMotion ? 0 : Double(swipeOffset / commitPx) * 8))
							.offset(x: swipeOffset)
							.frame(maxWidth: .infinity, alignment: .top)
							.offset(y: 47.5 * u)
							.accessibilityElement(children: .combine)
							.accessibilityHint("Swipe right to STAK, left to pass")
							.accessibilityAction(named: "STAK") { advance(isSTAK: true) }
							.accessibilityAction(named: "Pass") { advance(isSTAK: false) }
						if let ghost = flyingCard {
							// The swiped-away card flying off above the live deck; input falls
							// through to the front card.
							FrontDeckCard(card: ghost, u: u2)
								.offset(x: flyOffset)
								.opacity(flyFade)
								.frame(maxWidth: .infinity, alignment: .top)
								.offset(y: 47.5 * u)
								.allowsHitTesting(false)
								.accessibilityHidden(true)
						}
					}
					.frame(width: 306 * u, height: 423.07 * u, alignment: .topLeading)
					// Unclipped and above its siblings, like Discover: a dragged or flying card
					// stays WHOLE past the deck bounds, passing over the CTA zone like a real deck.
					.zIndex(1)
					.contentShape(Rectangle())
					.gesture(
						DragGesture(minimumDistance: dragSlop)
							.onChanged { value in
								let dx = value.translation.width
								// Horizontal only: a mostly-vertical drag that hasn't moved the card yet is left alone.
								if swipeOffset == 0 && abs(value.translation.height) > abs(dx) { return }
								var instant = Transaction()
								instant.disablesAnimations = true
								withTransaction(instant) { swipeOffset = dx > 0 ? max(0, dx - dragSlop) : min(0, dx + dragSlop) }
							}
							.onEnded { _ in
								guard swipeOffset != 0 else { return }
								if abs(swipeOffset) > commitPx {
									advance(isSTAK: swipeOffset > 0, gestureOffset: swipeOffset)
								} else {
									withAnimation(easeOut(0.26)) { swipeOffset = 0 }
								}
							}
					)
					// A light tick when the drag crosses the commit distance, either way (Discover's).
					.sensoryFeedback(.selection, trigger: abs(swipeOffset) > commitPx) { _, crossed in crossed }
					.sensoryFeedback(.impact(weight: .light), trigger: decisionTick)

					Spacer().frame(height: 16 * u)
					// Pass/STAK — the same pair Discover has, filling color with the same drag ratio.
					DecisionButtons(
						ratio: min(1, max(-1, swipeOffset / commitPx)),
						labelColor: Auth.subtitleGray,
						u: u2,
						onPass: { advance(isSTAK: false) },
						onStak: { advance(isSTAK: true) }
					)
					Spacer(minLength: 0)
				}
				.frame(maxWidth: .infinity)
				.padding(.top, 10 * u)
			}
			.padding(.horizontal, 24 * u)
			.padding(.top, 14 * u)
			.frame(maxHeight: .infinity, alignment: .top)

			VStack(spacing: 10 * u) {
				AuthCta(text: "Continue", action: onContinue)
				AuthSecondaryButton(text: "Back", action: onBack)
			}
			.padding(.top, 8 * u)
			.padding(.bottom, 26 * u)
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	/// The commit: the front card becomes the flying ghost and the next design takes the front slot at once.
	private func advance(isSTAK: Bool, gestureOffset: CGFloat = 0) {
		let flyDistance = 306 * figmaUnit * 1.6
		let flyTarget = reduceMotion ? gestureOffset : (isSTAK ? flyDistance : -flyDistance)
		flyGen += 1
		let gen = flyGen
		var instant = Transaction()
		instant.disablesAnimations = true
		withTransaction(instant) {
			flyingCard = deck[swiped % 3]
			flyFade = 1
			flyOffset = gestureOffset
			swiped += 1
			swipeOffset = 0
		}
		decisionTick += 1
		DispatchQueue.main.async {
			if reduceMotion {
				withAnimation(.easeOut(duration: 0.2)) { flyFade = 0 }
			} else {
				withAnimation(easeOut(0.12).delay(0.2)) { flyFade = 0 }
				withAnimation(easeOut(0.38)) { flyOffset = flyTarget }
			}
		}
		DispatchQueue.main.asyncAfter(deadline: .now() + 0.38) {
			if gen == flyGen { flyingCard = nil }
		}
	}
}

/// The full-size front card (350-wide template). The deck's layer structure: every
/// boundary in the frame is a brightness step plus a thin dark rim (the authored
/// exports carry it). NVDA's dark chrome makes its own step; light-topped cards need
/// the rim — a tight dark seam hugging the edge — so the card reads as its own layer
/// over the queue in EVERY state. Mirrors FrontDeckCard in android/
/// ui/discover/DiscoverScreen.kt at the passed unit.
private struct FrontDeckCard: View {
	let card: DeckCard
	let u: CGFloat

	var body: some View {
		DeckCardBody(card: card, u: u)
			.background {
				// Concentric 1pt strokes fading out over a 6u reach.
				let reach = 6 * u
				ForEach(Array(stride(from: CGFloat(0), to: reach, by: 1)), id: \.self) { d in
					let t = d / reach
					RoundedRectangle(cornerRadius: 22 * u + d)
						.stroke(Color(argb: 0xFF060B16).opacity(0.5 * (1 - t) * (1 - t)), lineWidth: 1)
						.padding(-d)
				}
			}
	}
}

/// The authored card template (1:1740, shared by all three designs):
/// art 340x229 at y4, overlay at 258 -> gap 25 — every literal at the
/// passed unit so the tutorial renders it at the frame's 87.4% scale.
private struct DeckCardBody: View {
	let card: DeckCard
	let u: CGFloat

	var body: some View {
		VStack(spacing: 25 * u) {
			Image(decorative: card.art)
				.resizable()
				.scaledToFill()
				.frame(width: 340 * u, height: 229 * u)
				.clipped()
				.background(card.artBg)
				.clipShape(RoundedRectangle(cornerRadius: 18 * u))
			// This frame's card authors looser text gaps than a uniform 87.4% scale of the
			// Discover card (1:1627) — the row insets are render-fitted against the 2x export
			// of 1:344 (android DeckRowTweaks(-1.35, 0.55, 0.95, 0.1)).
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
						.padding(.top, 0.55 * u)
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
					.padding(.top, 0.95 * u)
				}
				HStack(spacing: 8 * u) {
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
				.padding(.top, 0.1 * u)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.horizontal, 18 * u)
			.padding(.bottom, 16 * u)
			.padding(.top, -1.35 * u)
		}
		.padding(.top, 4 * u)
		.padding(.bottom, 4 * u)
		.frame(width: 350 * u)
		.background(
			LinearGradient(
				stops: [
					.init(color: card.cardTop, location: 0),
					.init(color: Color(argb: 0xFF0C1526), location: 0.9),
					.init(color: Color(argb: 0x000C1526), location: 1)
				],
				startPoint: .top,
				endPoint: .bottom
			),
			in: RoundedRectangle(cornerRadius: 22 * u)
		)
	}
}
