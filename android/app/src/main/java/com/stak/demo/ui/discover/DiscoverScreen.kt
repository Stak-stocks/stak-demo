package com.stak.demo.ui.discover

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.zIndex
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlin.math.roundToInt
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Palette of the CHINEDU "04 · Discover" frames. */
private object Disc {
	val SheetBg = Color(0xFF181F30)
	val Muted = Color(0xFF819ABB)
	val Faint = Color(0xFF5C6B85)
	val Body = Color(0xFFC8D2E0)
	val Teal = Color(0xFF69B3CA)
	val Green = Color(0xFF2FD08A)
	/** Down moves on a ticket (Codex parity audit 2026-09-04) - the Simulate red. */
	val Red = Color(0xFFFF5A6A)
	val ChipBg = Color(0xFF242B3D)
	val Divider = Color(0xFF2A3346)
	val BadgeInk = Color(0xFF9EADC7)
	val TipBg = Color(0x1A69B3CA)
	// #FFFFFF @ 9% - the Save pill on BOTH Discover frames (DE-STAK 1:2048,
	// CHINEDU 1:1759). 882ee783's "authored 15%" no longer reads anywhere
	// (user crop, 2026-09-04).
	val SaveChipBg = Color(0x17FFFFFF)
	val AmountBg = Color(0xFF0B1430)
	val AmountBorder = Color(0x1FFFFFFF)
	val AmountInk = Color(0xFFDCE7F7)
	val AmountSelBg = Color(0xFF0F2A38)
	val AmountSelBorder = Color(0xFF5DA8BF)
	val AmountSelInk = Color(0xFFA6E4F7)
	val BrightInk = Color(0xFFF2F6FC)
}

private val CtaGradient = Brush.verticalGradient(
	0.0889f to Color(0xFFA6E4F7),
	0.3919f to Color(0xFF5DA8BF),
	0.7255f to Color(0xFF3C98B4),
	1f to Color(0xFF3C98B4),
)
private val CtaBorder = androidx.compose.ui.graphics.Brush.verticalGradient(
	0f to Color(0xA1659EAD),
	1f to Color(0x6E16363F),
)

/** A practice-buy ticket's stock values (Buy NVDA? 1:2159 / Buy AAPL? 1:3423). */
internal data class BuySpec(
	val title: String,
	val badge: String,
	val name: String,
	val priceLine: String,
	val change: String,
	val cashBefore: String,
	val cashAfter: String,
	val shares: String,
	val symbol: String,
) {
	/** "$122.10 today" -> 122.10: the price the paper order fills at. */
	val price: Double get() = priceLine.substringBefore(' ').removePrefix("$").replace(",", "").toDoubleOrNull() ?: 0.0

	/**
	 * Codex audit (2026-09-04): the ticket's shares and cash-after follow the
	 * chosen amount instead of the baked $25 strings. The authored $25 tickets
	 * round-trip byte-identically (25/122.10 -> 0.2048, 25/229.35 -> 0.1090,
	 * 25/178.90 -> 0.1397, 25/28.40 -> 0.8803, 25/947.20 -> 0.0264; $8,800 - 25
	 * -> $8,775.00), so the frames (1:1970 / 85:1205 et al) still render exact.
	 * `cash` is the live paper balance the ticket opened on (Simulate audit,
	 * same day): "Cash available" before and after both follow it.
	 */
	fun withAmount(amount: Double, cash: Double): BuySpec = copy(
		shares = String.format(java.util.Locale.US, "%.4f", if (price > 0.0) amount / price else 0.0),
		cashBefore = "$" + String.format(java.util.Locale.US, "%,.2f", cash),
		cashAfter = "$" + String.format(java.util.Locale.US, "%,.2f", cash - amount),
	)
}

internal val NVDA_BUY = BuySpec("Buy NVDA?", "N", "NVIDIA Corp", "$122.10 today", "\u25b2 2.4%", "$8,800.00", "$8,775.00", "0.2048", "NVDA")
internal val AAPL_BUY = BuySpec("Buy AAPL?", "A", "Apple", "$229.35 today", "\u25b2 1.2%", "$8,800.00", "$8,775.00", "0.1090", "AAPL")
internal val GOOGL_BUY = BuySpec("Buy GOOGL?", "G", "Alphabet", "$178.90 today", "\u25b2 0.8%", "$8,800.00", "$8,775.00", "0.1397", "GOOGL")

/**
 * Codex audit (2026-09-04): the deck's Practice buy serves the FRONT card's
 * ticket (NVDA / AAPL / GOOGL into the 1:1970 template); an unknown symbol
 * falls back to the frame's NVDA. Mirrors ios/StakDemo/Discover/DiscoverView.swift.
 */
internal fun buySpecFor(symbol: String): BuySpec = listOf(NVDA_BUY, AAPL_BUY, GOOGL_BUY).firstOrNull { it.symbol == symbol } ?: NVDA_BUY

// A BuySpec is not Saveable - a raised deck ticket survives by its symbol
// and is re-served from buySpecFor on restore (like SimBuySpecSaver).
internal val DiscoverBuySpecSaver: Saver<BuySpec?, String> = Saver(
	save = { it?.symbol },
	restore = { buySpecFor(it) },
)

/**
 * Codex audit (2026-09-04): the end-of-deck "Bought" (1:2330) counts the
 * practice orders THIS deck run filled - the shell's Discover ticket
 * reports each fill here (the Simulate / Stock Detail tickets do not).
 * Reset with the deck.
 */
internal object DeckSession {
	/**
	 * The whole run lives here, not in the screen's remember state
	 * (review, 2026-09-04): the Discover page leaves composition on every
	 * tab hop - Confirm -> "View in My STAK" -> back to the deck - and a
	 * screen-local `seen` would restart the deck while `bought` kept
	 * counting. One lifetime, one reset. Persisted per day (product audit,
	 * 2026-09-05): a relaunch resumes today's run, tomorrow lands a new deck.
	 */
	private val seenState = mutableIntStateOf(0)
	private val savedState = mutableStateOf(setOf<String>())
	private val boughtState = mutableIntStateOf(0)
	/** Where the run is in the cards still on the deck - swipes move it, a save-driven removal does not (Codex review, PR #166). */
	private val cursorState = mutableIntStateOf(0)

	var seen: Int
		get() = seenState.intValue
		set(value) { seenState.intValue = value; persist() }
	var saved: Set<String>
		get() = savedState.value
		set(value) { savedState.value = value; persist() }
	var bought: Int
		get() = boughtState.intValue
		set(value) { boughtState.intValue = value; persist() }
	var cursor: Int
		get() = cursorState.intValue
		set(value) { cursorState.intValue = value; persist() }

	/** "Swipe today's deck again" and the tab re-tap from the end. */
	fun restart() {
		seenState.intValue = 0
		savedState.value = emptySet()
		boughtState.intValue = 0
		cursorState.intValue = 0
		persist()
	}

	private fun today(): String = java.time.LocalDate.now().toString()

	/** Re-entering Discover on a later day starts the day's deck without a relaunch (audit 2026-09-07). */
	fun refreshDay() {
		if (com.stak.demo.ui.StakStore.getString("deck.day") != today()) load()
	}

	/** Today's run, if one was saved; otherwise a fresh deck. */
	fun load() {
		val store = com.stak.demo.ui.StakStore
		if (store.getString("deck.day") == today()) {
			seenState.intValue = store.getInt("deck.seen", 0)
			savedState.value = store.getSet("deck.saved") ?: emptySet()
			boughtState.intValue = store.getInt("deck.bought", 0)
			cursorState.intValue = store.getInt("deck.cursor", 0)
		} else {
			seenState.intValue = 0
			savedState.value = emptySet()
			boughtState.intValue = 0
			cursorState.intValue = 0
		}
	}

	private fun persist() {
		val store = com.stak.demo.ui.StakStore
		store.putString("deck.day", today())
		store.putInt("deck.seen", seenState.intValue)
		store.putSet("deck.saved", savedState.value)
		store.putInt("deck.bought", boughtState.intValue)
		store.putInt("deck.cursor", cursorState.intValue)
	}
}

/** One deck card's designed content (art + copy at the front-card scale). */
internal data class DeckCard(
	val artRes: Int,
	val ticker: String,
	val headline: String,
	val price: String,
	val change: String,
	val tip: String,
	val cardTop: Color,
	val artBg: Color,
) {
	/** "NVDA \u00b7 NVIDIA Corp" -> "NVDA" - the routing/holdings symbol. */
	val symbol: String get() = ticker.substringBefore(" \u00b7 ").trim()
}

internal val DECK = listOf(
	DeckCard(
		R.drawable.disc_card_nvda, "NVDA · NVIDIA Corp",
		"Chip demand is outrunning supply, and NVIDIA sets the prices.",
		"$122.10", "▲ 2.4% today", "Chip stocks swing hard. Small stakes, long views.",
		Color(0xFF152A47), Color(0xFF142844),
	),
	DeckCard(
		R.drawable.disc_card_aapl, "AAPL · Apple Inc",
		"Two billion devices, and every one of them keeps paying Apple.",
		"$229.35", "▲ 1.2% today", "Steady giants move slower. Stable stocks often do.",
		Color(0xFF283E5D), Color(0xFF253A59),
	),
	DeckCard(
		R.drawable.disc_card_googl, "GOOGL · Alphabet Inc",
		"Search pays for everything, and nine billion-user products ride behind it.",
		// One authored line (1:2061, 265 wide): the peek-card/tutorial copy
		// "Ad money moves with the economy, so some quarters just drift." runs 315u.
		"$178.90", "▲ 0.8% today", "Ad money tracks the economy. Some quarters drift.",
		Color(0xFF263D5D), Color(0xFF2F486E),
	),
)

/**
 * A run is TWELVE cards cycling the three designed ones - the frame's
 * "1/12" ring and its 12/12 receipt (user, 2026-09-04, DE-STAK 04 ·
 * Discover 1:1916: the authored deck look wins). Every card lookup wraps
 * with `% DECK.size`. Mirrors ios/StakDemo/Discover/DiscoverView.swift.
 */
internal const val DECK_SIZE = 12

/**
 * The designed cards this account has NOT saved in the app: a save recorded on
 * this account (MyStakHoldings.add stamps its day) takes the card off the deck
 * until it is unsaved from My STAK; the persona's seeded holdings carry no day,
 * so its authored deck stands (user, 2026-09-08: a card already in My STAK
 * should not be on Discover, and Save only shows on cards not yet saved).
 */
internal fun deckCards(): List<DeckCard> {
	val held = com.stak.demo.ui.MyStakHoldings.tickers
	return DECK.filter { it.symbol !in held || com.stak.demo.ui.MyStakHoldings.daysSinceSaved(it.symbol) == null }
}

/** The card at a run position over the cards still on the deck (the full design set when none are). */
internal fun deckCardAt(position: Int): DeckCard {
	val cards = deckCards().ifEmpty { DECK }
	return cards[((position % cards.size) + cards.size) % cards.size]
}

/**
 * 04 · Discover — "first run" (CHINEDU 1:1627) with its states: the
 * swipe deck (twelve cards cycling the three designed ones), the Save chip
 * toast (1:1796), the Buy-NVDA practice sheet (1:1970) and the Order
 * filled sheet (85:1205). Swiping down advances the deck and the ring
 * counts along. Practice buy raises the ticket; confirming fills the
 * paper order.
 */
@Composable
internal fun DiscoverScreen(
	resetKey: Int = 0,
	// The tapped card's SYMBOL rides along - the detail page serves that
	// stock, not always AAPL (user, 2026-09-01).
	onLearnMore: (String) -> Unit = {},
	// Codex audit (2026-09-04): the CTA raises the FRONT card's ticket.
	onPracticeBuy: (BuySpec) -> Unit = {},
	// B4 (1:2330 Motion): the end-of-deck CTAs hop tabs via the shell.
	onPracticeBuySaves: () -> Unit = {},
	onReviewSaves: () -> Unit = {},
) {
	// Prototype: tapping the front card itself also opens the Stock Detail.
	// The buy ticket itself is raised by the shell (over the tab bar).
	var seen by DeckSession::seen
	var cursor by DeckSession::cursor
	// THIS deck run's saves: the end-of-deck "Saved" count AND the chip
	// state - the chip follows this run, not My STAK (1:1916 shows Save on
	// NVDA even though My STAK lists it; user, 2026-09-04).
	var savedCards by DeckSession::saved
	// 1:2330: Discover tab re-tap from the end of the deck restarts it - and
	// the run's counters with it. Only a CHANGE of the key counts: the deck is
	// re-composed every time the tab is re-entered, and a key left >0 by an
	// earlier re-tap must not restart a finished deck the user merely came
	// back to from My STAK / Simulate (prototype walk, 2026-09-05: "Review
	// saves in My STAK" -> Discover tab showed 1/12 instead of the kept end;
	// mirrors iOS's onChange(of: resetKey)).
	val initialResetKey = remember { resetKey }
	LaunchedEffect(Unit) { DeckSession.refreshDay() }
	LaunchedEffect(resetKey) {
		if (resetKey != initialResetKey && seen >= DECK_SIZE) {
			DeckSession.restart()
		}
	}
	var savedToast by remember { mutableStateOf(false) }
	// Swipes must NEVER be eaten (user, 2026-09-02 "when swiping card i
	// feel there is an error"): the deck advances the moment a swipe
	// commits, and the swiped card flies off as a non-interactive GHOST
	// above the live deck - the finger owns the new front card
	// immediately, so any cadence lands (the Instagram feel).
	var flyingCard by remember { mutableStateOf<DeckCard?>(null) }
	val flyOffset = remember { Animatable(0f) }
	val flyFade = remember { Animatable(1f) }
	val topOffset = remember { Animatable(0f) }
	// `enter` is the PROMOTE progress: 0 = the authored mid-slab geometry
	// (1:1701, y 36.39 / 313.14 wide), 1 = settled in the front slot.
	val enter = remember { Animatable(1f) }
	val frontFade = remember { Animatable(1f) }
	val scope = rememberCoroutineScope()
	val density = LocalDensity.current
	val u = com.stak.demo.ui.onboarding.figmaUnit()

	/**
	 * The deck advances: the front card leaves and the next promotes - the
	 * swipe commit (from `committed` px of travel) and the Save chip (from
	 * rest; user, 2026-09-08: a saved card must not stay on the deck) share
	 * it, so Save reads exactly like a swipe.
	 */
	val advance: suspend (Float, DeckCard?) -> Unit = { committed, saving ->
		if (seen >= DECK_SIZE - 1) {
			// The final card: the authored fly-off finishes
			// before the end-of-deck receipt lands (1:2330).
			scope.launch { topOffset.animateTo(with(density) { (500 * u).dp.toPx() }, tween(280, easing = EaseOut)) }
			frontFade.animateTo(0f, tween(300, easing = EaseOut))
			// The save lands once the card has left, so the card flying off is the one saved.
			saving?.let { com.stak.demo.ui.MyStakHoldings.add(it.symbol) }
			seen += 1
			topOffset.snapTo(0f)
			frontFade.snapTo(1f)
		} else {
			// The frame's card shuffle (1:1627), commit-first:
			// the swiped card becomes the ghost and the deck
			// advances NOW - a second swipe grabs the next
			// card even while the ghost is still flying.
			flyingCard = saving ?: deckCardAt(cursor)
			flyFade.snapTo(1f)
			flyOffset.snapTo(committed)
			// A saved card leaves the pool now - the next card shifts into this cursor,
			// so only a swipe moves the cursor (Codex review, PR #166: AAPL was skipped).
			saving?.let { com.stak.demo.ui.MyStakHoldings.add(it.symbol) }
			seen += 1
			if (saving == null) cursor += 1
			topOffset.snapTo(0f)
			// The new front takes over at the mid-slab geometry
			// the finger just revealed, then promotes forward.
			enter.snapTo(0f)
			// A velocity flick can commit before the crossfade
			// finished - pick the alpha up from the reveal.
			frontFade.snapTo((committed / with(density) { (110 * u).dp.toPx() }).coerceIn(0f, 1f))
			scope.launch { frontFade.animateTo(1f, tween(120, easing = EaseOut)) }
			scope.launch { flyOffset.animateTo(with(density) { (500 * u).dp.toPx() }, tween(280, easing = EaseOut)) }
			scope.launch { enter.animateTo(1f, tween(200, easing = EaseOut)) }
			flyFade.animateTo(0f, tween(300, easing = EaseOut))
			flyingCard = null
		}
	}

	LaunchedEffect(savedToast) {
		if (savedToast) {
			delay(2200)
			savedToast = false
		}
	}

	Box(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Column(modifier = Modifier.fillMaxSize().statusBarsPadding()) {
			// Header — Discover + progress ring, kicker below.
			// 1:2330 authors the whole header 10 lower than 1:1627 (ring y64 vs
			// 54) with an 8 kicker gap (y116) - exact-design audit 2026-09-04.
			val atEnd = seen >= DECK_SIZE || deckCards().isEmpty()
			Column(
				verticalArrangement = Arrangement.spacedBy(((if (atEnd) 8 else 5) * u).dp),
				modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = ((if (atEnd) 20 else 10) * u).dp),
			) {
				// 1:1627 centres the 33-tall title in the 44-tall ring row (measured exact);
				// the end-of-deck frame (1:2330) authors the title 7.5 higher against the ring
				// (y62 vs ring y64) in #F2F6FC (1:2354) - exact-design audit 2026-09-04.
				Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
					Text(
						text = "Discover",
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = if (atEnd) Disc.BrightInk else Color.White,
						modifier = Modifier.offset(y = if (atEnd) (-7.5 * u).dp else 0.dp),
					)
					Spacer(modifier = Modifier.weight(1f))
					// "1/12" over the twelve-card run (user, 2026-09-04: the authored deck look wins).
					val count = (seen + 1).coerceAtMost(DECK_SIZE)
					Box(contentAlignment = Alignment.Center, modifier = Modifier.size((44 * u).dp)) {
						ProgressRing(progress = count / DECK_SIZE.toFloat(), u = u)
						Text(
							text = "$count/$DECK_SIZE",
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Color.White,
						)
					}
				}
				// 1:1656 authors the kicker #5C6B85 / tracking 0.9, inset 2 (Context
				// row px-2); 1:2362 authors it #819ABB / tracking 0.8, flush at x20 -
				// exact-design audit 2026-09-04.
				Text(
					text = "TODAY · AI & CHIPS",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, letterSpacing = ((if (atEnd) 0.8 else 0.9) * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					// Measured: this tracked caps run needs no advance-rounding compensation (it ran 4 wide with it).
					color = if (atEnd) Disc.Muted else Disc.Faint,
					modifier = Modifier.padding(start = ((if (atEnd) 0 else 2) * u).dp),
				)
			}
			Spacer(modifier = Modifier.height((27 * u).dp))
			if (seen >= DECK_SIZE || deckCards().isEmpty()) {
				EndOfDeck(
					seen = seen.coerceAtMost(DECK_SIZE),
					saved = savedCards.size,
					bought = DeckSession.bought,
					onPracticeBuySaves = onPracticeBuySaves,
					// A fresh run: the deck AND its counters start over.
					onSwipeAgain = { DeckSession.restart() },
					canReplay = deckCards().isNotEmpty(),
					onReviewSaves = onReviewSaves,
				)
			} else {
			// The front card cycles the three designs across the twelve-card run.
			val frontCard = deckCardAt(cursor)
			// Deck — a fixed composition: every dimension scales by the 390dp
			// artboard unit so proportions match the frame on any device.
			Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f).fillMaxWidth()) {
				Box(
					modifier = Modifier
						.padding(horizontal = (20 * u).dp)
						.fillMaxWidth()
						.height((484.65 * u).dp)
						// UNCLIPPED and above its siblings: a dragged or flying
						// card stays WHOLE past the deck bounds (user, 2026-09-02
						// "i noticed a cut") - it passes over the hint/CTA zone
						// like a real card deck, fading as it goes.
						.zIndex(1f)
						.pointerInput(Unit) {
							// The commit decision reads a PLAIN var written in the
							// drag callback itself - never the animatable, whose
							// queued snapTo can lag the finger on starved frames.
							var dragTotal = 0f
							var maxVel = 0f
							detectVerticalDragGestures(
								onDragStart = { dragTotal = 0f; maxVel = 0f },
								onDragEnd = {
									val committed = dragTotal
									val flung = maxVel > 1.2f
									scope.launch {
										// Commit on distance OR on a fling - a fast short
										// flick advances too (the Instagram rule), and a
										// frame-starved gesture whose measured travel came
										// up short still lands (2026-09-02).
										if (committed > with(density) { (110 * u).dp.toPx() } ||
											(flung && committed > with(density) { (20 * u).dp.toPx() })
										) {
											advance(committed, null)
										} else {
											topOffset.animateTo(0f, tween(180))
										}
									}
								},
							) { change, dragAmount ->
								// Each event carries its own dt, so even a gesture the
								// starved main thread coalesced into ONE move still
								// yields a velocity (px/ms).
								val dt = (change.uptimeMillis - change.previousUptimeMillis).coerceAtLeast(1L)
								maxVel = maxOf(maxVel, dragAmount / dt)
								change.consume()
								dragTotal = (dragTotal + dragAmount).coerceAtLeast(0f)
								val target = dragTotal
								scope.launch { topOffset.snapTo(target) }
							}
						},
				) {
					// The authored deck (1:1627): the layers behind the front
					// card ARE the real next cards (1:1701 = the next card,
					// 1:1660 = the one after - confirmed in the file metadata,
					// 2026-09-02). At rest the baked exports keep the frame
					// pixel-exact - the next card's own Save pill peeking at
					// the top is authored (user, 2026-09-04, DE-STAK 04 ·
					// Discover 1:1916: the authored deck look wins); as the
					// drag exposes the mid slab it crossfades into the LIVE
					// next card at the SAME authored geometry, so the queue
					// always tells the truth.
					val commitPx = with(density) { (110 * u).dp.toPx() }
					Image(
						painter = painterResource(R.drawable.disc_peek_top),
						contentDescription = null,
						modifier = Modifier
							.align(Alignment.TopStart)
							.offset(x = (39 * u).dp, y = 0.dp)
							.size((273.66 * u).dp, (336.66 * u).dp),
					)
					Image(
						painter = painterResource(R.drawable.disc_peek_mid),
						contentDescription = null,
						modifier = Modifier
							.align(Alignment.TopStart)
							.offset(x = (18 * u).dp, y = (24 * u).dp)
							.size((313.14 * u).dp, (352.87 * u).dp)
							.graphicsLayer { alpha = 1f - (topOffset.value / commitPx).coerceIn(0f, 1f) },
					)
					if (seen < DECK_SIZE - 1) {
						val next = deckCardAt(cursor + 1)
						FrontDeckCard(
							card = next,
							onSave = {},
							saved = next.symbol in savedCards,
							u = u,
							modifier = Modifier
								.align(Alignment.TopCenter)
								.offset(y = (36.39 * u).dp)
								.graphicsLayer {
									alpha = (topOffset.value / commitPx).coerceIn(0f, 1f)
									transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0f)
									scaleX = 0.8947f
									scaleY = 0.8947f
								},
						)
					}
					// The Save chip follows THIS run: it shows until the card is
					// saved in this deck, whatever My STAK already holds (1:1916
					// shows Save on NVDA even though My STAK lists it; user,
					// 2026-09-04). Saving still lands the pick in My STAK.
					FrontDeckCard(
						card = frontCard,
						// Saving takes the card off the deck like a swipe (user, 2026-09-08).
						onSave = { savedCards = savedCards + frontCard.symbol; savedToast = true; scope.launch { advance(0f, frontCard) } },
						saved = frontCard.symbol in savedCards,
						u = u,
						modifier = Modifier
							.align(Alignment.TopCenter)
							.offset(y = (54.65 * u).dp)
							.offset { androidx.compose.ui.unit.IntOffset(0, topOffset.value.roundToInt()) }
							.graphicsLayer {
								// The promote: from the authored mid-slab geometry
								// (y 36.39, 313.14 wide) into the front slot as
								// `enter` settles - the queue visibly steps forward.
								alpha = frontFade.value
								transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0f)
								val e = enter.value
								translationY = (36.39f - 54.65f) * u * this.density * (1f - e)
								val s = 0.8947f + 0.1053f * e
								scaleX = s
								scaleY = s
							}
							.clickable(
								interactionSource = remember { MutableInteractionSource() },
								indication = com.stak.demo.ui.theme.PressDim,
								onClick = { onLearnMore(frontCard.symbol) },
							),
					)
					flyingCard?.let { ghost ->
						// The swiped-away card flying off above the live deck;
						// no handlers - input falls through to the front card.
						FrontDeckCard(
							card = ghost,
							onSave = {},
							saved = ghost.symbol in savedCards,
							u = u,
							modifier = Modifier
								.align(Alignment.TopCenter)
								.offset(y = (54.65 * u).dp)
								.offset { androidx.compose.ui.unit.IntOffset(0, flyOffset.value.roundToInt()) }
								.graphicsLayer { alpha = flyFade.value },
						)
					}
				}
				Spacer(modifier = Modifier.height((10 * u).dp))
				Column(
					horizontalAlignment = Alignment.CenterHorizontally,
					verticalArrangement = Arrangement.spacedBy((5 * u).dp),
				) {
					Column(verticalArrangement = Arrangement.spacedBy((1 * u).dp), modifier = Modifier.alpha(0.5f)) {
						GestureChevron(u)
						GestureChevron(u)
					}
					Text(
						text = "Swipe down",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Disc.Faint,
					)
				}
				Spacer(modifier = Modifier.height((19 * u).dp))
				Row(horizontalArrangement = Arrangement.spacedBy((36 * u).dp)) {
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier
							.size((120 * u).dp, (52 * u).dp)
							// Authored drop shadow (1:1783 Inspect): dy 12.28, blur
							// 12.28, #52AAC7 at 9% - the faint teal wash under the
							// button (render-verified; Learn more's is disabled).
							.drawBehind {
								val r = (6 * u).dp.toPx()
								val fw = drawContext.canvas.nativeCanvas
								val paint = android.graphics.Paint().apply { isAntiAlias = true }
								paint.color = android.graphics.Color.argb(23, 82, 170, 199)
								paint.maskFilter = android.graphics.BlurMaskFilter((12.28f * u).dp.toPx(), android.graphics.BlurMaskFilter.Blur.NORMAL)
								fw.drawRoundRect(0f, (12.28f * u).dp.toPx(), size.width, (12.28f * u).dp.toPx() + size.height, r, r, paint)
							}
							.background(CtaGradient, RoundedCornerShape((6 * u).dp))
							.border((0.36 * u).dp, CtaBorder, RoundedCornerShape((6 * u).dp))
							.clickable(
								interactionSource = remember { MutableInteractionSource() },
								indication = com.stak.demo.ui.theme.PressDim,
							) { onPracticeBuy(buySpecFor(frontCard.symbol)) },
					) {
						Text(
							text = "Practice buy",
							// 1:1784 authors lh 20.69 - exact-design audit 2026-09-04.
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp, lineHeight = (20.69 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Color.White,
						)
					}
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier
							.size((120 * u).dp, (52 * u).dp)
							.border((0.36 * u).dp, Color(0x54343B4F), RoundedCornerShape((6 * u).dp))
							.clickable(
								interactionSource = remember { MutableInteractionSource() },
								indication = com.stak.demo.ui.theme.PressDim,
								onClick = { onLearnMore(frontCard.symbol) },
							),
					) {
						Text(
							text = "Learn more",
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Disc.Muted,
						)
					}
				}
				Spacer(modifier = Modifier.height((19 * u).dp))
			}
			}
		}
		// Saved toast (frame 1:1796) - the pill sits at the authored x 111
		// (1:1965: x111 y122 w160), 4 left of the screen centre, not centred
		// (StakTest band-diff vs the 2x export, 2026-09-04: +10px right).
		if (savedToast) {
			// Toast 1:1965 authors rgba(36,43,61,0.48), r18, px16 py11, gap 9 and
			// a 17 bookmark (1:1966) - exact-design audit 2026-09-04.
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((9 * u).dp),
				modifier = Modifier
					.align(Alignment.TopStart)
					.statusBarsPadding()
					.padding(start = (111 * u).dp, top = (78 * u).dp)
					.clip(RoundedCornerShape((18 * u).dp))
					// Authored (1:1796): translucent pill - the peek slab shows through.
					.background(Disc.ChipBg.copy(alpha = 0.48f))
					.padding(horizontal = (16 * u).dp)
					.height((39 * u).dp),
			) {
				Image(painterResource(R.drawable.ic_saved_bookmark), null, modifier = Modifier.size((17 * u).dp))
				Text(
					text = "Saved to My STAK",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
					color = Color.White,
				)
			}
		}
	}
}

/** The full-size front card (350 wide) with its live Save chip. */
@Composable
internal fun FrontDeckCard(
	card: DeckCard,
	onSave: () -> Unit,
	saved: Boolean = false,
	u: Float,
	modifier: Modifier = Modifier,
	rows: DeckRowTweaks = DeckRowTweaks(),
	// Hosts may hide the chip; the deck leaves it on - the live next card
	// crossfades into the authored mid slab, whose export carries its own
	// Save pill (user, 2026-09-04: the authored deck look wins).
	showSave: Boolean = true,
) {
	Box(
		modifier = modifier
			.width((350 * u).dp)
			// The deck's layer structure: every boundary in the frame is a
			// brightness step plus a thin dark rim (the authored exports
			// carry it). NVDA's dark chrome makes its own step; light-topped
			// cards need the rim — a tight dark seam hugging the edge — so
			// the card reads as its own layer over the queue in EVERY state.
			.drawBehind {
				val corner = (22 * u).dp.toPx()
				val reach = (6 * u).dp.toPx()
				val step = 1.dp.toPx()
				var d = 0f
				while (d < reach) {
					val t = d / reach
					drawRoundRect(
						color = Color(0xFF060B16).copy(alpha = 0.5f * (1f - t) * (1f - t)),
						topLeft = Offset(-d, -d),
						size = Size(size.width + 2 * d, size.height + 2 * d),
						cornerRadius = CornerRadius(corner + d),
						style = Stroke(width = step),
					)
					d += step
				}
			},
	) {
		DeckCardBody(card = card, onSave = onSave, u = u, rows = rows, saved = saved, showSave = showSave)
	}
}

/**
 * Per-frame row-rhythm tweaks, in card-template px added ABOVE a row.
 * The tutorial frame (1:344) authors slightly looser text gaps than a
 * uniform 87.4% scale of the Discover card (1:1627) — values are
 * render-fitted against the 2x frame export. Discover uses the defaults.
 */
/** Signed vertical inset: like padding(top) but a negative value pulls the
 *  content up and shrinks the measured height by the same amount (Compose's
 *  padding rejects negatives). Used for the render-fitted deck row tweaks. */
internal fun Modifier.topInset(dp: Dp): Modifier = layout { measurable, constraints ->
	val dy = dp.roundToPx()
	val placeable = measurable.measure(constraints)
	layout(placeable.width, (placeable.height + dy).coerceAtLeast(0)) { placeable.placeRelative(0, dy) }
}

internal class DeckRowTweaks(
	val overlay: Float = 0f,
	val headline: Float = 0f,
	val price: Float = 0f,
	val tip: Float = 0f,
)

@Composable
private fun DeckCardBody(card: DeckCard, onSave: (() -> Unit)?, u: Float, rows: DeckRowTweaks = DeckRowTweaks(), saved: Boolean = false, showSave: Boolean = true) {
	Column(
		horizontalAlignment = Alignment.CenterHorizontally,
		// The authored card template (1:1740, shared by all three designs):
		// art 340x229 at y4, overlay at 258 -> gap 25.
		verticalArrangement = Arrangement.spacedBy((25 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((22 * u).dp))
			.background(Brush.verticalGradient(0f to card.cardTop, 1f to Color(0xFF0C1526)))
			.padding(top = (4 * u).dp, bottom = (4 * u).dp),
	) {
		Box(
			modifier = Modifier
				.size((340 * u).dp, (229 * u).dp)
				.clip(RoundedCornerShape((18 * u).dp))
				.background(card.artBg),
		) {
			Image(
				painter = painterResource(card.artRes),
				contentDescription = null,
				contentScale = ContentScale.Crop,
				modifier = Modifier.size((340 * u).dp, (229 * u).dp),
			)
			if (showSave && !saved) {
				// Every card draws the chip live at the template's authored spot
				// (art x264 y6); the saved deck (1:1796) has none. The NVDA art
				// is the chip-less export of 1:1910.
				SaveChip(u = u, modifier = Modifier.align(Alignment.TopEnd).padding(top = (6 * u).dp, end = (4 * u).dp))
			}
			if (onSave != null && showSave && !saved) {
				Box(
					modifier = Modifier
						.align(Alignment.TopEnd)
						.padding(top = (2 * u).dp, end = (6 * u).dp)
						.size((86 * u).dp, (38 * u).dp)
						.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = com.stak.demo.ui.theme.PressDim,
							onClick = onSave,
						),
				)
			}
		}
		Column(
			verticalArrangement = Arrangement.spacedBy((19 * u).dp),
			modifier = Modifier.fillMaxWidth().padding(horizontal = (18 * u).dp).padding(bottom = (16 * u).dp).topInset((rows.overlay * u).dp),
		) {
			Column(verticalArrangement = Arrangement.spacedBy((8 * u).dp)) {
				Text(
					text = card.ticker,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Disc.Muted,
				)
				Text(
					text = card.headline,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (16 * u).sp, lineHeight = (23 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
					modifier = Modifier.topInset((rows.headline * u).dp),
				)
				Row(
					verticalAlignment = Alignment.Bottom,
					horizontalArrangement = Arrangement.spacedBy((9 * u).dp),
					modifier = Modifier.topInset((rows.price * u).dp),
				) {
					Text(
						text = card.price,
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp, lineHeight = (25 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Color.White,
					)
					Text(
						text = card.change,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Disc.Green,
						modifier = Modifier.padding(bottom = (2 * u).dp),
					)
				}
			}
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((8 * u).dp),
				modifier = Modifier
					.topInset((rows.tip * u).dp)
					.fillMaxWidth()
					.clip(RoundedCornerShape((10 * u).dp))
					.background(Disc.TipBg)
					.padding(horizontal = (12 * u).dp, vertical = (9 * u).dp),
			) {
				Text(
					text = "TIP",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, letterSpacing = (0.9 * u).sp),
					color = Disc.Teal,
				)
				Text(
					text = card.tip,
					// Measured exception (user screenshot, 2026-09-04): the authored
					// well (1:2061) is ONE line, 265 wide - the AAPL tip fits it by
					// 11u and the advance-rounding compensation added 12u, so it
					// wrapped ("...often / do."). The tip run takes no tracking.
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Disc.Body,
					modifier = Modifier.weight(1f),
				)
			}
		}
	}
}

/** rgba(255,255,255,0.09) Save pill with the small bookmark. */
@Composable
private fun SaveChip(u: Float, modifier: Modifier = Modifier) {
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((6 * u).dp),
		modifier = modifier
			.clip(RoundedCornerShape((16 * u).dp))
			.background(Disc.SaveChipBg)
			.padding(horizontal = (13 * u).dp, vertical = (7 * u).dp),
	) {
		Text(
			text = "Save",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		// The pill's own glyph (1:2050): 12 box, 8x10 bookmark, #AEAEAE stroke 1 -
		// not the hero's dark #0A1020 export (user crop, 2026-09-04).
		Image(painterResource(R.drawable.ic_save_bookmark), null, modifier = Modifier.size((12 * u).dp))
	}
}

/**
 * 16x8 down-chevron: the authored export (1:1777) is a 2-wide #5C6B85
 * round stroke M2 1 L8 7 L14 1 - exact-design audit 2026-09-04.
 */
@Composable
private fun GestureChevron(u: Float) {
	Canvas(modifier = Modifier.size((16 * u).dp, (8 * u).dp)) {
		val px = size.width / 16f
		val p = Path().apply {
			moveTo(2f * px, 1f * px)
			lineTo(8f * px, 7f * px)
			lineTo(14f * px, 1f * px)
		}
		drawPath(p, Disc.Faint, style = Stroke(width = 2f * px, cap = StrokeCap.Round, join = StrokeJoin.Round))
	}
}

/** Shared sheet scaffold — #0a1020 scrim at 45% + r24 #181f30 sheet. */
@Composable
private fun SheetScaffold(onDismiss: () -> Unit, content: @Composable () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(modifier = Modifier.fillMaxSize()) {
		Box(
			modifier = Modifier
				.fillMaxSize()
				// Authored ticket scrim rgba(0,0,0,0.6) (1:2158).
				.background(Color(0x99000000))
				.clickable(
					interactionSource = remember { MutableInteractionSource() },
					indication = null,
					onClick = onDismiss,
				),
		)
		Column(
			modifier = Modifier
				.align(Alignment.BottomCenter)
				.fillMaxWidth()
				.clip(RoundedCornerShape(topStart = (24 * u).dp, topEnd = (24 * u).dp))
				.background(Disc.SheetBg)
				.padding(horizontal = (20 * u).dp)
				.padding(top = (10 * u).dp)
				// Authored sheets (1:2159 et al) are bottom-anchored with a 30
				// pad that INCLUDES the home-indicator zone - no extra inset.
				.padding(bottom = (30 * u).dp),
		) {
			Box(
				modifier = Modifier
					.align(Alignment.CenterHorizontally)
					// Authored (1:2159): handle at y12–16, title at y32 — so 2
					// above the rect and 16 below it after the 10 top padding.
					.padding(bottom = (18 * u).dp)
					.size((40 * u).dp, (4 * u).dp)
					.background(Disc.Divider, RoundedCornerShape((2 * u).dp)),
			)
			content()
		}
	}
}

/** NVDA row used by both sheets — teal-tinted, badge + price + change. */
@Composable
private fun NvdaStockRow(spec: BuySpec = NVDA_BUY) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((6 * u).dp))
			.background(Disc.TipBg)
			.padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
	) {
		Box(contentAlignment = Alignment.Center, modifier = Modifier.size((38 * u).dp).background(Disc.ChipBg, CircleShape)) {
			Text(
				text = spec.badge,
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp),
				color = Disc.BadgeInk,
			)
		}
		Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
			Text(
				text = spec.name,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Text(
				text = spec.priceLine,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.Muted,
			)
		}
		Text(
			text = spec.change,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = if (spec.change.startsWith("▼")) Disc.Red else Disc.Green,
		)
	}
}

@Composable
private fun SheetCta(text: String, onClick: () -> Unit, enabled: Boolean = true) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier
			.fillMaxWidth()
			.height((52 * u).dp)
			.drawBehind {
				val r = (6 * u).dp.toPx()
				val paint = android.graphics.Paint().apply { isAntiAlias = true }
				paint.color = android.graphics.Color.argb(23, 82, 170, 199)
				paint.maskFilter = android.graphics.BlurMaskFilter((12.28f * u).dp.toPx(), android.graphics.BlurMaskFilter.Blur.NORMAL)
				drawContext.canvas.nativeCanvas.drawRoundRect(0f, (12.28f * u).dp.toPx(), size.width, (12.28f * u).dp.toPx() + size.height, r, r, paint)
			}
			.background(CtaGradient, RoundedCornerShape((6 * u).dp))
			.border((0.36 * u).dp, CtaBorder, RoundedCornerShape((6 * u).dp))
			.alpha(if (enabled) 1f else 0.5f)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				enabled = enabled,
				onClick = onClick,
			),
	) {
		Text(
			text = text,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp),
			color = Color.White,
		)
	}
}

@Composable
private fun SheetSecondary(text: String, onClick: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier
			.fillMaxWidth()
			.height((52 * u).dp)
			// 1:2197 authors NO fill - the render's lighter band under Confirm is
			// the CTA's own glow (exact-design audit 2026-09-04); hairline only.
			.border((0.36 * u).dp, Color(0x54343B4F), RoundedCornerShape((6 * u).dp))
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			),
	) {
		Text(
			text = text,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp),
			color = Disc.Muted,
		)
	}
}

/** The authored amount pills (1:1970): $10 / $25 / $50 / $100 / Custom. */
private val AMOUNT_PILLS = listOf("$10" to 10.0, "$25" to 25.0, "$50" to 50.0, "$100" to 100.0, "Custom" to null)

/**
 * "Buy NVDA?" practice ticket content (frame 1:1970, sheet 1:2159).
 * Codex audit (2026-09-04): the pills drive `amount` through `onAmount`;
 * the host hands back `spec.withAmount(amount)` so "You get" follows.
 */
@Composable
private fun PracticeBuyContent(
	onConfirm: () -> Unit,
	onDismiss: () -> Unit,
	spec: BuySpec = NVDA_BUY,
	secondary: String = "Not yet",
	amount: Double,
	onAmount: (Double) -> Unit,
	/** Market or limit (FigJam Simulate board, 2026-09-14): a limit price under today's waits as an open order. */
	limitPrice: Double? = null,
	onLimit: (Double?) -> Unit = {},
) {
	var selected by rememberSaveable { mutableIntStateOf(listOf(10.0, 25.0, 50.0, 100.0).indexOf(amount).let { if (it >= 0) it else AMOUNT_PILLS.lastIndex }) }
	var custom by rememberSaveable { mutableStateOf("") }
	var limitText by rememberSaveable { mutableStateOf("") }
	val isLimit = limitPrice != null
	// A limit that does not parse to a positive price ("0", "1.2.3") holds Confirm (Codex review, PR #167 mirror);
	// an empty field still means today's price.
	val limitOk = !isLimit || limitText.isEmpty() || (limitText.toDoubleOrNull()?.let { it > 0.0 } == true)
	// The shares a valid below-market limit reserves - counted at the limit, not today's quote.
	val limitShares = limitPrice?.takeIf { isLimit && limitOk && it > 0.0 && it < spec.price }?.let { String.format(java.util.Locale.US, "%.4f", amount / it) }
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(verticalArrangement = Arrangement.spacedBy((14 * u).dp), modifier = Modifier.fillMaxWidth()) {
		Text(
			text = spec.title,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp, lineHeight = (23 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		NvdaStockRow(spec)
		// The authored 14 column gap alone (1:1970 / 1:4232). The old +1 / +1.5
		// ink nudges were measured under the trimmed line boxes; with
		// FIGMA_LINE_BOX they pushed the title 3.6 and the pill 3.2 above the
		// frame (StakTest vs the 2x export, 2026-09-05).
		Text(
			text = "Your paper stake starts at today’s price and tracks the real move live, in either direction.",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Disc.Body,
		)
		Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.fillMaxWidth()) {
			Row(horizontalArrangement = Arrangement.spacedBy((6 * u).dp)) {
				Text(
					text = "Cash available",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Disc.Muted,
				)
				Text(
					text = spec.cashBefore,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Disc.BrightInk,
				)
			}
			Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth()) {
				AMOUNT_PILLS.forEachIndexed { i, (label, value) ->
					val sel = i == selected
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier
							.weight(1f)
							.clip(RoundedCornerShape((10 * u).dp))
							.background(if (sel) Disc.AmountSelBg else Disc.AmountBg)
							.border(
								if (sel) (0.5 * u).dp else (1 * u).dp,
								if (sel) Disc.AmountSelBorder else Disc.AmountBorder,
								RoundedCornerShape((10 * u).dp),
							)
							.clickable(
								interactionSource = remember { MutableInteractionSource() },
								indication = com.stak.demo.ui.theme.PressDim,
							) {
								// A preset above the cash on hand is refused and does not become the
								// selection (Codex review, PR #166); Custom re-applies whatever valid
								// amount its field already holds, else the last amount stands.
								if (value != null) {
									if (value <= com.stak.demo.ui.simulate.PaperPortfolio.cash) { selected = i; onAmount(value) }
								} else {
									// Custom publishes its field's value, or NO amount (0) until a valid
									// one is typed - never the preset it replaced (Codex review, PR #166).
									selected = i
									onAmount(custom.toDoubleOrNull()?.takeIf { it > 0.0 && it <= com.stak.demo.ui.simulate.PaperPortfolio.cash } ?: 0.0)
								}
							}
							.padding(vertical = (8 * u).dp),
					) {
						Text(
							text = label,
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = if (sel) Disc.AmountSelInk else Disc.AmountInk,
						)
					}
				}
			}
			if (selected == AMOUNT_PILLS.lastIndex) {
				// Codex audit (2026-09-04): Custom opens an inline amount under
				// the row. 1:1970 authors no field, so it borrows the pill
				// chrome (AmountBg + the selected border). A value > 0 and
				// within the cash available drives the ticket; anything else
				// leaves the amount where it was.
				BasicTextField(
					value = custom,
					onValueChange = { raw ->
						val text = raw.filter { it.isDigit() || it == '.' }.take(9)
						custom = text
						onAmount(text.toDoubleOrNull()?.takeIf { it > 0.0 && it <= com.stak.demo.ui.simulate.PaperPortfolio.cash } ?: 0.0)
					},
					singleLine = true,
					keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
					textStyle = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, color = Disc.AmountInk, lineHeightStyle = FIGMA_LINE_BOX),
					cursorBrush = SolidColor(Disc.AmountSelBorder),
					decorationBox = { inner ->
						Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((4 * u).dp)) {
							Text(
								text = "$",
								style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
								color = Disc.AmountInk,
							)
							Box(contentAlignment = Alignment.CenterStart, modifier = Modifier.weight(1f)) {
								if (custom.isEmpty()) {
									Text(
										text = "0.00",
										style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
										color = Disc.Muted,
									)
								}
								inner()
							}
						}
					},
					modifier = Modifier
						.fillMaxWidth()
						.clip(RoundedCornerShape((10 * u).dp))
						.background(Disc.AmountBg)
						.border((0.5 * u).dp, Disc.AmountSelBorder, RoundedCornerShape((10 * u).dp))
						.padding(horizontal = (12 * u).dp, vertical = (8 * u).dp),
				)
			}
		}
		// Market or limit (FigJam Simulate board, 2026-09-14). 1:1970 authors a
		// market ticket only; the row borrows the pills' chrome.
		Column(verticalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth()) {
			Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth()) {
				listOf("Market" to false, "Limit" to true).forEach { (label, limit) ->
					val sel = isLimit == limit
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier
							.weight(1f)
							.clip(RoundedCornerShape((10 * u).dp))
							.background(if (sel) Disc.AmountSelBg else Disc.AmountBg)
							.border(if (sel) (0.5 * u).dp else (1 * u).dp, if (sel) Disc.AmountSelBorder else Disc.AmountBorder, RoundedCornerShape((10 * u).dp))
							.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) {
								onLimit(if (limit) (limitText.toDoubleOrNull()?.takeIf { it > 0.0 } ?: spec.price) else null)
							}
							.padding(vertical = (8 * u).dp),
					) {
						Text(label, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = if (sel) Disc.AmountSelInk else Disc.AmountInk)
					}
				}
			}
			if (isLimit) {
				BasicTextField(
					value = limitText,
					onValueChange = { raw ->
						val text = raw.filter { it.isDigit() || it == '.' }.take(9)
						limitText = text
						onLimit(text.toDoubleOrNull()?.takeIf { it > 0.0 } ?: spec.price)
					},
					singleLine = true,
					keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
					textStyle = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, color = Disc.AmountInk, lineHeightStyle = FIGMA_LINE_BOX),
					cursorBrush = SolidColor(Disc.AmountSelBorder),
					decorationBox = { inner ->
						Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((4 * u).dp)) {
							Text("Limit $", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Disc.AmountInk)
							Box(contentAlignment = Alignment.CenterStart, modifier = Modifier.weight(1f)) {
								if (limitText.isEmpty()) Text(String.format(java.util.Locale.US, "%.2f", spec.price), style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Disc.Muted)
								inner()
							}
						}
					},
					modifier = Modifier
						.fillMaxWidth()
						.clip(RoundedCornerShape((10 * u).dp))
						.background(Disc.AmountBg)
						.border((0.5 * u).dp, Disc.AmountSelBorder, RoundedCornerShape((10 * u).dp))
						.padding(horizontal = (12 * u).dp, vertical = (8 * u).dp),
				)
				Text(
					if ((limitPrice ?: 0.0) >= spec.price) "At or above today\u2019s price - fills right away." else "Below today\u2019s price - waits as an open order until ${spec.symbol} gets there.",
					style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Disc.Muted,
				)
			}
		}
		Row(
			horizontalArrangement = Arrangement.spacedBy((6 * u).dp, Alignment.CenterHorizontally),
			verticalAlignment = Alignment.Bottom,
			// Authored: chips → shares line is a 24 gap (14 + 10).
			modifier = Modifier.fillMaxWidth().padding(top = (10 * u).dp),
		) {
			Text(
				text = "You get",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.Muted,
			)
			Text(
				text = limitShares ?: spec.shares,
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.BrightInk,
			)
			Text(
				text = "shares of ${spec.symbol}",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.Muted,
			)
		}
		Column(verticalArrangement = Arrangement.spacedBy((16 * u).dp), modifier = Modifier.fillMaxWidth()) {
			// Confirm only with a stake the cash covers (Codex review, PR #166).
			SheetCta(text = if (isLimit && (limitPrice ?: 0.0) < spec.price) "Place limit order" else "Confirm practice buy", onClick = onConfirm, enabled = com.stak.demo.ui.simulate.PaperPortfolio.canBuy(amount) && limitOk)
			SheetSecondary(text = secondary, onClick = onDismiss)
		}
	}
}

/** "Order filled" sheet content (frame 85:1205, sheet 85:1394). */
@Composable
private fun OrderFilledContent(onPrimary: () -> Unit, onSecondary: () -> Unit, spec: BuySpec = NVDA_BUY, primary: String = "View in My STAK", secondary: String = "Keep exploring", pendingLimit: Double? = null) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		horizontalAlignment = Alignment.CenterHorizontally,
		verticalArrangement = Arrangement.spacedBy((14 * u).dp),
		modifier = Modifier.fillMaxWidth(),
	) {
		Image(painterResource(R.drawable.ic_sheet_check), null, modifier = Modifier.size((47 * u).dp))
		Text(
			// A limit order under today's price is placed, not filled (FigJam: Order pending).
			text = if (pendingLimit != null) "Order placed" else "Order filled",
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp, lineHeight = (23 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		NvdaStockRow(spec)
		// Authored status line (85:1407): Geist 12 / lh 18, left-aligned, 14 below
		// the stock row - exact-design audit 2026-09-04 (was 14).
		Text(
			text = if (pendingLimit != null) "Waits for ${spec.symbol} at ${com.stak.demo.ui.simulate.PaperPortfolio.usd(pendingLimit)} or below · paper order" else "Filled instantly · paper order",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Disc.Body,
			modifier = Modifier.fillMaxWidth(),
		)
		Row(horizontalArrangement = Arrangement.spacedBy((6 * u).dp), modifier = Modifier.fillMaxWidth()) {
			Text(
				text = "Cash available",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.Muted,
			)
			Text(
				text = spec.cashAfter,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.BrightInk,
			)
		}
		Row(
			horizontalArrangement = Arrangement.spacedBy((6 * u).dp, Alignment.CenterHorizontally),
			verticalAlignment = Alignment.Bottom,
			// Authored ticket (85:1408): Cash row 0-16, Shares line at 40 -> a 24 gap.
			modifier = Modifier.fillMaxWidth().padding(top = (10 * u).dp),
		) {
			Text(
				text = if (pendingLimit != null) "Reserved for" else "You now hold",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.Muted,
			)
			Text(
				text = spec.shares,
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.BrightInk,
			)
			Text(
				text = "shares of ${spec.symbol}",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.Muted,
			)
		}
		Column(verticalArrangement = Arrangement.spacedBy((16 * u).dp), modifier = Modifier.fillMaxWidth()) {
			SheetCta(text = primary, onClick = onPrimary)
			SheetSecondary(text = secondary, onClick = onSecondary)
		}
	}
}

/** 44dp progress ring — #2a3346 track + #69b3ca arc from 12 o'clock. */
@Composable
private fun ProgressRing(progress: Float, u: Float) {
	Canvas(modifier = Modifier.size((44 * u).dp)) {
		val stroke = (4 * u).dp.toPx()
		val inset = (4 * u).dp.toPx()
		val arcSize = androidx.compose.ui.geometry.Size(size.width - inset * 2f, size.height - inset * 2f)
		drawArc(
			color = Color(0xFF2A3346),
			startAngle = 0f, sweepAngle = 360f, useCenter = false,
			topLeft = Offset(inset, inset), size = arcSize,
			style = Stroke(width = stroke, cap = StrokeCap.Round),
		)
		drawArc(
			color = Disc.Teal,
			startAngle = -90f, sweepAngle = 360f * progress, useCenter = false,
			topLeft = Offset(inset, inset), size = arcSize,
			style = Stroke(width = stroke, cap = StrokeCap.Round),
		)
	}
}

/**
 * Discover · End of deck (CHINEDU 1:2330) — receipt stats + CTAs. The
 * authored copy stands ("Twelve cards, twelve signals" over the 12/12 run);
 * the tiles report THIS run's real Seen / Saved / Bought (user, 2026-09-04,
 * DE-STAK 04 · Discover 1:1916: the authored deck look wins).
 */
@Composable
private fun EndOfDeck(seen: Int, saved: Int, bought: Int, onPracticeBuySaves: () -> Unit, onSwipeAgain: () -> Unit, onReviewSaves: () -> Unit, canReplay: Boolean = true) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		horizontalAlignment = Alignment.CenterHorizontally,
		modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp),
	) {
		// Authored column (1:2330): title box 190-218 (lh28), subtitle 226-242
		// (lh16), stats 274, CTA 396, review 457, footnote ~523.5, swipe 577.
		Spacer(modifier = Modifier.height((34 * u).dp))
		Text(
			text = "Deck complete",
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (22 * u).sp, lineHeight = (28 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Disc.BrightInk,
		)
		Spacer(modifier = Modifier.height((8 * u).dp))
		Text(
			text = "Twelve cards, twelve signals. Your taste graph got smarter.",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Disc.Muted,
		)
		Spacer(modifier = Modifier.height((32 * u).dp))
		Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp)) {
			listOf("Seen" to "$seen", "Saved" to "$saved", "Bought" to "$bought").forEach { (label, value) ->
				Column(
					horizontalAlignment = Alignment.CenterHorizontally,
					verticalArrangement = Arrangement.spacedBy((4 * u).dp),
					modifier = Modifier
						.width((110 * u).dp)
						.clip(RoundedCornerShape((12 * u).dp))
						.background(Disc.SheetBg)
						.padding(horizontal = (10 * u).dp, vertical = (14 * u).dp),
				) {
					Text(
						text = label,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Disc.Muted,
					)
					Text(
						text = value,
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp, lineHeight = (25 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Disc.BrightInk,
					)
				}
			}
		}
		Spacer(modifier = Modifier.height((52 * u).dp))
		SheetCta(text = "Practice buy your saves", onClick = onPracticeBuySaves)
		Spacer(modifier = Modifier.height((9 * u).dp))
		Box(
			contentAlignment = Alignment.Center,
			modifier = Modifier
				.fillMaxWidth()
				.height((52 * u).dp)
				.border((0.36 * u).dp, Color(0x54343B4F), RoundedCornerShape((6 * u).dp))
				.clickable(
					interactionSource = remember { MutableInteractionSource() },
					indication = com.stak.demo.ui.theme.PressDim,
					// B4 (1:2330 Motion): Review saves -> the My STAK tab, Instant.
					onClick = onReviewSaves,
				),
		) {
			Text(
				text = "Review saves in My STAK",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp),
				color = Disc.Muted,
			)
		}
		Spacer(modifier = Modifier.height((14 * u).dp))
		Text(
			text = "A new deck lands tomorrow with your morning brief.",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Disc.Muted,
		)
		Spacer(modifier = Modifier.height((40.5 * u).dp))
		// No replay when every card is saved: the run would only show the receipt again (Codex review, PR #166).
		if (canReplay) {
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier
					.fillMaxWidth()
					.height((32 * u).dp)
					.clip(RoundedCornerShape((14 * u).dp))
					.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
						onClick = onSwipeAgain,
					),
			) {
				Text(
					text = "Swipe today’s deck again",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp),
					color = Disc.Muted,
				)
			}
		}
	}
}

/**
 * Buy → Order-filled flow, reused by the Stock Detail page. Confirming
 * morphs the ticket into the success sheet IN PLACE - the authored
 * SMART_ANIMATE 350 ease-out (1:1970 -> 85:1205): content cross-fades
 * while the sheet height animates, nothing clipped (B1).
 */
@Composable
internal fun DiscoverBuyFlow(
	onClose: () -> Unit,
	spec: BuySpec = NVDA_BUY,
	filledPrimary: String = "View in My STAK",
	filledSecondary: String = "Keep exploring",
	ticketSecondary: String = "Not yet",
	// Hosts route the success CTAs to their authored edges (B2/B3/B13/
	// B20); left alone they fall back to a plain close.
	onFilledPrimary: () -> Unit = onClose,
	onFilledSecondary: () -> Unit = onClose,
	// Codex audit (2026-09-04): fired exactly once when Confirm fills the
	// paper order - the shell's Discover ticket counts it into
	// DeckSession.bought; the Simulate / Stock Detail tickets leave it alone.
	onFilled: () -> Unit = {},
) {
	var filled by rememberSaveable { mutableStateOf(false) }
	// Codex audit (2026-09-04): the chosen stake - the authored $25 by
	// default; both sheets read spec.withAmount(amount), so "You get",
	// "Cash available" after and "You now hold" follow the pills.
	var amount by rememberSaveable { mutableDoubleStateOf(25.0) }
	// Market or limit (FigJam Simulate board, 2026-09-14): a limit under today's
	// price is placed as an open order and the receipt says so.
	var limitPrice by rememberSaveable { mutableStateOf<Double?>(null) }
	var placedLimit by rememberSaveable { mutableStateOf<Double?>(null) }
	// Codex audit (2026-09-04, Simulate): "Cash available" is the live paper
	// cash, snapshotted as the ticket opens - Confirm moves the cash into
	// the position, so the receipt's after must stay "before - amount".
	val cashBefore by rememberSaveable { mutableDoubleStateOf(com.stak.demo.ui.simulate.PaperPortfolio.cash) }
	val live = spec.withAmount(amount, cashBefore)
	// The scrim tap is unauthored - it keeps the per-state plain dismiss.
	SheetScaffold(onDismiss = { if (filled) onFilledSecondary() else onClose() }) {
		AnimatedContent(
			targetState = filled,
			transitionSpec = {
				ContentTransform(
					fadeIn(tween(350, easing = EaseOut)),
					fadeOut(tween(350, easing = EaseOut)),
					sizeTransform = SizeTransform(clip = false) { _, _ -> tween(350, easing = EaseOut) },
				)
			},
			contentAlignment = Alignment.BottomCenter,
			label = "buyMorph",
		) { isFilled ->
			if (!isFilled) {
				PracticeBuyContent(
					// Every host's Confirm (Discover, Simulate, Stock Detail) fills
					// the order into the shared paper portfolio, then tells the host.
					// The order is checked again at confirm (Codex review, PR #166) - nothing fills past the cash on hand.
					onConfirm = {
						if (!filled && com.stak.demo.ui.simulate.PaperPortfolio.canBuy(amount)) {
							val limit = limitPrice
							if (limit != null && limit < spec.price) {
								// Below today's price: an open order, no fill yet (FigJam: Order pending).
								if (com.stak.demo.ui.simulate.PaperPortfolio.placeLimit(spec, amount, limit)) { placedLimit = limit; filled = true }
							} else {
								filled = true; com.stak.demo.ui.simulate.PaperPortfolio.buy(spec, amount); onFilled()
							}
						}
					},
					onDismiss = onClose,
					spec = live,
					secondary = ticketSecondary,
					amount = amount,
					onAmount = { amount = it },
					limitPrice = limitPrice,
					onLimit = { limitPrice = it },
				)
			} else {
				// Review 2026-09-04: "You now hold" is the whole holding after the
				// fill - a top-up shows the summed shares, not just this order's.
				// A placed limit reserves cash, not a holding: "Reserved for" shows what the stake buys AT the limit (review 2026-09-14).
				val placed = placedLimit
				val receiptShares = if (placed != null) String.format(java.util.Locale.US, "%.4f", amount / placed) else (com.stak.demo.ui.simulate.PaperPortfolio.pickSpec(spec.symbol)?.shares ?: live.shares)
				OrderFilledContent(onPrimary = onFilledPrimary, onSecondary = onFilledSecondary, spec = live.copy(shares = receiptShares), primary = filledPrimary, secondary = filledSecondary, pendingLimit = placedLimit)
			}
		}
	}
}
