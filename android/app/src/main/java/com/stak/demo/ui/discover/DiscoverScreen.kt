package com.stak.demo.ui.discover

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.runtime.mutableLongStateOf
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.zIndex
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
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
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.stak.demo.R
import com.stak.demo.ui.components.RefreshWhileVisible
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

	/** The ticket re-priced from a live quote, so the paper order fills at today's price. */
	fun withQuote(price: Double, changePct: Double): BuySpec = copy(
		priceLine = "$" + String.format(java.util.Locale.US, "%,.2f", price) + " today",
		change = (if (changePct >= 0.0) "\u25b2 " else "\u25bc ") + String.format(java.util.Locale.US, "%.1f%%", kotlin.math.abs(changePct)),
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
	 * Session state lives here (not in screen remember state) so it
	 * survives tab hops without resetting. Persisted per day so a relaunch
	 * resumes today's run; tomorrow lands a fresh deck. V1 adds `passed`
	 * so passed companies don't recycle (rule 5). Mirrors
	 * ios/StakDemo/Discover/DiscoverView.swift.
	 */
	private val seenState = mutableIntStateOf(0)
	private val savedState = mutableStateOf(setOf<String>())
	private val passedState = mutableStateOf(setOf<String>())
	private val boughtState = mutableIntStateOf(0)
	/** Where the run is in the cards still on the deck - swipes move it, a save-driven removal does not (Codex review, PR #166). */
	private val cursorState = mutableIntStateOf(0)

	var seen: Int
		get() = seenState.intValue
		set(value) { seenState.intValue = value; persist() }
	var saved: Set<String>
		get() = savedState.value
		set(value) { savedState.value = value; persist() }
	var passed: Set<String>
		get() = passedState.value
		set(value) { passedState.value = value; persist() }
	var bought: Int
		get() = boughtState.intValue
		set(value) { boughtState.intValue = value; persist() }
	var cursor: Int
		get() = cursorState.intValue
		set(value) { cursorState.intValue = value; persist() }

	fun restart() {
		seenState.intValue = 0
		savedState.value = emptySet()
		passedState.value = emptySet()
		boughtState.intValue = 0
		cursorState.intValue = 0
		persist()
	}

	// Same 9am rollover the server counts swipes under, so session and counter agree.
	private fun today(): String = todayKey()

	/** Re-entering Discover on a later day starts the day's deck without a relaunch (audit 2026-09-07). */
	fun refreshDay() {
		if (com.stak.demo.data.StakStore.getString("deck.day") != today()) load()
	}

	fun load() {
		val store = com.stak.demo.data.StakStore
		if (store.getString("deck.day") == today()) {
			seenState.intValue = store.getInt("deck.seen", 0)
			savedState.value = store.getSet("deck.saved") ?: emptySet()
			passedState.value = store.getSet("deck.passed") ?: emptySet()
			boughtState.intValue = store.getInt("deck.bought", 0)
			cursorState.intValue = store.getInt("deck.cursor", 0)
		} else {
			seenState.intValue = 0
			savedState.value = emptySet()
			passedState.value = emptySet()
			boughtState.intValue = 0
			cursorState.intValue = 0
		}
	}

	private fun persist() {
		val store = com.stak.demo.data.StakStore
		store.putString("deck.day", today())
		store.putInt("deck.seen", seenState.intValue)
		store.putSet("deck.saved", savedState.value)
		store.putSet("deck.passed", passedState.value)
		store.putInt("deck.bought", boughtState.intValue)
		store.putInt("deck.cursor", cursorState.intValue)
	}
}

/** One deck card's designed content (art + copy at the front-card scale). */
data class DeckCard(
	val artRes: Int = 0,
	val ticker: String,
	val headline: String,
	val price: String,
	val change: String,
	val tip: String,
	val cardTop: Color,
	val artBg: Color,
	val logoUrl: String? = null,
	val brandId: String = "",
	val categories: List<String> = emptyList(),
) {
	/** "NVDA \u00b7 NVIDIA Corp" -> "NVDA" - the routing/holdings symbol. */
	val symbol: String get() = ticker.substringBefore(" \u00b7 ").trim()
}

/** Sample cards for the onboarding swipe tutorial; the live deck never falls back to them. */
internal val DECK = listOf(
	DeckCard(
		artRes = R.drawable.disc_card_nvda,
		ticker = "NVDA · NVIDIA Corp",
		headline = "Chip demand is outrunning supply, and NVIDIA sets the prices.",
		price = "$122.10", change = "▲ 2.4% today", tip = "Chip stocks swing hard. Small stakes, long views.",
		cardTop = Color(0xFF152A47), artBg = Color(0xFF142844),
	),
	DeckCard(
		artRes = R.drawable.disc_card_aapl,
		ticker = "AAPL · Apple Inc",
		headline = "Two billion devices, and every one of them keeps paying Apple.",
		price = "$229.35", change = "▲ 1.2% today", tip = "Steady giants move slower. Stable stocks often do.",
		cardTop = Color(0xFF283E5D), artBg = Color(0xFF253A59),
	),
	DeckCard(
		artRes = R.drawable.disc_card_googl,
		ticker = "GOOGL · Alphabet Inc",
		headline = "Search pays for everything, and nine billion-user products ride behind it.",
		price = "$178.90", change = "▲ 0.8% today", tip = "Ad money tracks the economy. Some quarters drift.",
		cardTop = Color(0xFF263D5D), artBg = Color(0xFF2F486E),
	),
)

/**
 * 04 · Discover — V1 interaction model (STAK Discover V1 Product Rules,
 * 2026-09-14): swipe right = STAK, swipe left = Pass. Card tap / "Learn
 * More" opens an inline Quick Look sheet (rules 6–8). Practice Buy
 * removed (rule 10). Each of the three demo stocks appears once — no
 * recycling (rule 5). Undo toast after every decision (rule 14). Mirrors
 * ios/StakDemo/Discover/DiscoverView.swift.
 */
@Composable
internal fun DiscoverScreen(
	resetKey: Int = 0,
	viewModel: DiscoverViewModel = hiltViewModel(),
	onPracticeBuy: (BuySpec) -> Unit = {},      // kept for nav compat; removed from V1 Discover UI
	onPracticeBuySaves: () -> Unit = {},
	onReviewSaves: () -> Unit = {},
) {
	val deck by viewModel.deck.collectAsStateWithLifecycle()
	val loading by viewModel.loading.collectAsStateWithLifecycle()
	val hasReachedLimit by viewModel.hasReachedLimit.collectAsStateWithLifecycle()
	val dailyLimit by viewModel.dailyLimit.collectAsStateWithLifecycle()
	val swipedToday by viewModel.swipedToday.collectAsStateWithLifecycle()
	val loadError by viewModel.loadError.collectAsStateWithLifecycle()
	val todayStats by viewModel.todayStats.collectAsStateWithLifecycle()
	val deckLabel by viewModel.deckLabel.collectAsStateWithLifecycle()
	var seen by DeckSession::seen
	var savedCards by DeckSession::saved
	var passedCards by DeckSession::passed

	// Each symbol appears once — V1 rule 5 (no recycling).
	// Capped by what's left of today's limit, so swipes made on another device count too.
	val remainingDeck = deck.filter { it.symbol !in savedCards && it.symbol !in passedCards }
		.take((dailyLimit - swipedToday).coerceAtLeast(0))
	val atEnd = remainingDeck.isEmpty() || hasReachedLimit
	// Prices move while the deck sits open. Every 30s, for the front card and the two
	// peeking behind it only - swiped cards and the end screen show no price.
	RefreshWhileVisible(key = Unit, intervalMs = 30_000L, tickOnResume = true) {
		viewModel.onVisibleTick(if (atEnd) emptyList() else remainingDeck.take(3).map { it.symbol })
	}

	val initialResetKey = remember { resetKey }
	LaunchedEffect(Unit) { DeckSession.refreshDay() }
	LaunchedEffect(resetKey) {
		if (resetKey != initialResetKey && atEnd) DeckSession.restart()
	}

	// Undo toast — clears automatically after 3 s (V1 rule 14); a newer swipe
	// replaces it and restarts the clock. `lastUndo` keeps the content alive
	// while the toast animates out after `pendingUndo` clears.
	var pendingUndo by remember { mutableStateOf<Pair<DeckCard, Boolean>?>(null) }
	// Shown when a save is refused because the Stak is full; clears on its own.
	val stakFullNotice = com.stak.demo.ui.components.rememberStakFullNoticeState()
	var lastUndo by remember { mutableStateOf<Pair<DeckCard, Boolean>?>(null) }
	LaunchedEffect(pendingUndo) {
		val undo = pendingUndo ?: return@LaunchedEffect
		lastUndo = undo
		delay(3000)
		pendingUndo = null
	}

	// Quick Look sheet (V1 rules 7–8).
	var quickLookCard by remember { mutableStateOf<DeckCard?>(null) }

	var flyingCard by remember { mutableStateOf<DeckCard?>(null) }
	val flyOffset = remember { Animatable(0f) }
	val flyFade = remember { Animatable(1f) }
	val swipeOffset = remember { Animatable(0f) }
	val scope = rememberCoroutineScope()
	val density = LocalDensity.current
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val screenWidthPx = with(density) { LocalConfiguration.current.screenWidthDp.dp.toPx() }

	LaunchedEffect(Unit) { DeckSession.load() }

	val frontCard = remainingDeck.firstOrNull()
	// Gesture handlers are installed once; read the live front card through this, not a captured value.
	val currentFront by androidx.compose.runtime.rememberUpdatedState(frontCard)

	var cardShownAt by remember { mutableLongStateOf(System.currentTimeMillis()) }
	LaunchedEffect(frontCard?.symbol) { cardShownAt = System.currentTimeMillis() }

	fun commitDecision(card: DeckCard, isSTAK: Boolean) {
		if (isSTAK) {
			savedCards = savedCards + card.symbol
			// The card's price is the live quote, so the save is stamped with what
			// the stock cost at this moment - the only honest "since you saved".
			com.stak.demo.data.MyStakHoldings.add(
				card.symbol,
				card.brandId,
				card.price.filter { it.isDigit() || it == '.' }.toDoubleOrNull(),
			)
		} else {
			passedCards = passedCards + card.symbol
		}
		seen += 1
		pendingUndo = card to isSTAK
		viewModel.recordSwipe(card.brandId, isSTAK, System.currentTimeMillis() - cardShownAt, card.categories)
	}

	fun animateAndCommit(card: DeckCard, isSTAK: Boolean, gestureOffsetPx: Float = 0f) {
		// A double tap (or any late handler) must not commit the same card twice.
		if (card.symbol in savedCards || card.symbol in passedCards) return
		// A full Stak refuses the save before the card leaves. The server rejects a
		// 31st stock and the sync swallows the failure, so letting it fly away would
		// have shown a saved card the server never kept.
		if (isSTAK && com.stak.demo.data.MyStakHoldings.isFull) {
			stakFullNotice.show()
			scope.launch { swipeOffset.animateTo(0f, tween(240, easing = EaseOut)) }
			return
		}
		// Travel past the screen edge by a full card width so the card genuinely
		// leaves the frame rather than stopping just outside it.
		val flyDistance = screenWidthPx + with(density) { (350 * u).dp.toPx() }
		val flyTarget = if (isSTAK) flyDistance else -flyDistance
		scope.launch {
			flyingCard = card
			flyFade.snapTo(1f)
			flyOffset.snapTo(gestureOffsetPx)
			commitDecision(card, isSTAK)
			swipeOffset.snapTo(0f)
			// Opacity holds through the travel - the tail fade only covers the last
			// frames, once the card is already clear of the edge. Fading during the
			// slide is what made it read as vanishing in place.
			launch { flyFade.animateTo(0f, tween(120, delayMillis = 300, easing = EaseOut)) }
			flyOffset.animateTo(flyTarget, tween(420, easing = EaseOut))
			flyingCard = null
		}
	}

	Box(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Column(modifier = Modifier.fillMaxSize().statusBarsPadding()) {
			val count = if (atEnd) swipedToday.coerceAtMost(dailyLimit) else (swipedToday + 1).coerceAtMost(dailyLimit)
			Column(
				verticalArrangement = Arrangement.spacedBy(((if (atEnd) 8 else 5) * u).dp),
				modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = ((if (atEnd) 20 else 10) * u).dp),
			) {
				Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
					Text(
						text = "Discover",
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = if (atEnd) Disc.BrightInk else Color.White,
						modifier = Modifier.offset(y = if (atEnd) (-7.5 * u).dp else 0.dp),
					)
					Spacer(modifier = Modifier.weight(1f))
					Box(contentAlignment = Alignment.Center, modifier = Modifier.size((44 * u).dp)) {
						ProgressRing(progress = count / dailyLimit.coerceAtLeast(1).toFloat(), u = u)
						Text(
							text = "$count/$dailyLimit",
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Color.White,
						)
					}
				}
				Text(
					text = deckLabel,
					maxLines = 1,
					overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, letterSpacing = ((if (atEnd) 0.8 else 0.9) * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = if (atEnd) Disc.Muted else Disc.Faint,
					modifier = Modifier.padding(start = ((if (atEnd) 0 else 2) * u).dp),
				)
			}
			Spacer(modifier = Modifier.height((14 * u).dp))
			if (loading && deck.isEmpty()) {
				Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
					androidx.compose.material3.CircularProgressIndicator(color = Disc.Teal)
				}
			} else if (loadError && deck.isEmpty()) {
				DeckLoadError(u = u, onRetry = viewModel::retry)
			} else if (atEnd) {
				EndOfDeck(
					seen = swipedToday.coerceAtMost(dailyLimit),
					total = dailyLimit,
					// Server counts cover other devices and relaunches; this session may be ahead of them.
					saved = maxOf(savedCards.size, todayStats.first),
					passed = maxOf(passedCards.size, todayStats.second),
					limitReached = hasReachedLimit,
					onReviewSaves = onReviewSaves,
				)
			} else if (frontCard != null) {
				Box(
					modifier = Modifier
						.padding(horizontal = (20 * u).dp)
						.fillMaxWidth()
						// Flexible deck height: takes remaining space in the column
						// so the swipe hint and buttons below are always visible.
						// The deck card content is top-anchored (offsets from top),
						// so extra or reduced height at the bottom doesn't affect
						// the authored card layout.
						.weight(1f)
						// UNCLIPPED and above its siblings: a dragged or flying
						// card stays WHOLE past the deck bounds (user, 2026-09-02
						// "i noticed a cut") - it passes over the hint/CTA zone
						// like a real card deck, fading as it goes.
						.zIndex(1f)
						.pointerInput(Unit) {
							var dragTotal = 0f
							val commitPx = with(density) { (110 * u).dp.toPx() }
							detectHorizontalDragGestures(
								onDragStart = { dragTotal = 0f },
								onDragEnd = {
									val abs = kotlin.math.abs(dragTotal)
									scope.launch {
										if (abs > commitPx) {
											currentFront?.let { animateAndCommit(it, isSTAK = dragTotal > 0, dragTotal) }
										} else {
											swipeOffset.animateTo(0f, tween(260, easing = EaseOut))
										}
									}
								},
							) { change, dragAmount ->
								change.consume()
								dragTotal += dragAmount
								scope.launch { swipeOffset.snapTo(dragTotal) }
							}
						},
				) {
					val commitPx = with(density) { (110 * u).dp.toPx() }
					val btnRatio = (swipeOffset.value / commitPx).coerceIn(-1f, 1f)
						// Peek card farthest back — tilts right, smallest
					if (remainingDeck.size > 2) {
						FrontDeckCard(
							card = remainingDeck[2],
							onSave = {},
							saved = remainingDeck[2].symbol in savedCards,
							u = u,
							showSave = false,
							modifier = Modifier
								.align(Alignment.TopCenter)
								.offset(y = (4 * u).dp)
								.graphicsLayer {
									transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0f)
									scaleX = 0.72f
									scaleY = 0.72f
									rotationZ = 5f
								},
						)
					}
					// Peek card middle — tilts left, medium
					if (remainingDeck.size > 1) {
						FrontDeckCard(
							card = remainingDeck[1],
							onSave = {},
							saved = remainingDeck[1].symbol in savedCards,
							u = u,
							showSave = false,
							modifier = Modifier
								.align(Alignment.TopCenter)
								.offset(y = (28 * u).dp)
								.graphicsLayer {
									transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0f)
									scaleX = 0.82f
									scaleY = 0.82f
									rotationZ = -3f
								},
						)
					}
					// Front card - swipes horizontally
					FrontDeckCard(
						card = frontCard,
						onSave = { animateAndCommit(frontCard, isSTAK = true) },
						saved = frontCard.symbol in savedCards,
						u = u,
						modifier = Modifier
							.align(Alignment.TopCenter)
							.offset(y = (54.65 * u).dp)
							.offset { androidx.compose.ui.unit.IntOffset(swipeOffset.value.roundToInt(), 0) }
							.graphicsLayer {
								rotationZ = (swipeOffset.value / commitPx) * 8f
							},
						showLearnMore = true,
						onLearnMore = { quickLookCard = frontCard; viewModel.recordLearnMore(frontCard) },
					)
					flyingCard?.let { ghost ->
						FrontDeckCard(
							card = ghost,
							showLearnMore = true,
							onSave = {},
							saved = ghost.symbol in savedCards,
							u = u,
							modifier = Modifier
								.align(Alignment.TopCenter)
								.offset(y = (54.65 * u).dp)
								.offset { androidx.compose.ui.unit.IntOffset(flyOffset.value.roundToInt(), 0) }
								.graphicsLayer { alpha = flyFade.value },
						)
					}
				}
				Spacer(modifier = Modifier.height((16 * u).dp))
				val commitPxBtn = with(density) { (110 * u).dp.toPx() }
				val btnRatio = (swipeOffset.value / commitPxBtn).coerceIn(-1f, 1f)
				val passRatio = (-btnRatio).coerceAtLeast(0f)
				val stakRatio = btnRatio.coerceAtLeast(0f)
				Row(horizontalArrangement = Arrangement.spacedBy((48 * u).dp), modifier = Modifier.align(Alignment.CenterHorizontally).zIndex(2f)) {
					// Pass — circle fills white as swipe goes left
					Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((6 * u).dp)) {
						val passBg = lerp(Color(0xFF1C202E), Color.White, passRatio)
						val passIconColor = lerp(Color(0xFFB0B8CC), Color(0xFF1C202E), passRatio)
						Box(
							contentAlignment = Alignment.Center,
							modifier = Modifier
								.size((56 * u).dp)
								.clip(CircleShape)
								.background(passBg)
								.clickable(
									interactionSource = remember { MutableInteractionSource() },
									indication = com.stak.demo.ui.theme.PressDim,
									onClick = { animateAndCommit(frontCard, isSTAK = false) },
								),
						) {
							Canvas(modifier = Modifier.size((20 * u).dp)) {
								val s = size.minDimension
								val sw = s * 0.12f
								val pad = s * 0.1f
								drawLine(passIconColor, Offset(pad, pad), Offset(s - pad, s - pad), strokeWidth = sw, cap = StrokeCap.Round)
								drawLine(passIconColor, Offset(s - pad, pad), Offset(pad, s - pad), strokeWidth = sw, cap = StrokeCap.Round)
							}
						}
						Text(
							text = "Pass",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
							color = Disc.Muted,
						)
					}
					// STAK — circle fills blue as swipe goes right
					Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((6 * u).dp)) {
						val stakBg = lerp(Color(0xFF1C202E), Color(0xFF4FB3D9), stakRatio)
						Box(
							contentAlignment = Alignment.Center,
							modifier = Modifier
								.size((56 * u).dp)
								.clip(CircleShape)
								.background(stakBg)
								.clickable(
									interactionSource = remember { MutableInteractionSource() },
									indication = com.stak.demo.ui.theme.PressDim,
									onClick = { animateAndCommit(frontCard, isSTAK = true) },
								),
						) {
							Image(
								painter = painterResource(R.drawable.ic_stak_logo_mark),
								contentDescription = "STAK",
								modifier = Modifier.size((28 * u).dp),
							)
						}
						Text(
							text = "STAK",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
							color = Disc.Muted,
						)
					}
				}
				Spacer(modifier = Modifier.height((8 * u).dp))
			}
		}
		// Quick Look sheet — shown when user taps the front card (V1 rules 7–8).
		quickLookCard?.let { card ->
			QuickLookSheet(
				card = card,
				loadQuickLook = { id -> viewModel.fetchQuickLook(id) },
				// The deck's current copy of the card: prices refresh while the sheet is open,
				// and a save records the price at that moment.
				onPass = {
					quickLookCard = null
					animateAndCommit(deck.firstOrNull { it.symbol == card.symbol } ?: card, isSTAK = false)
				},
				onSTAK = {
					quickLookCard = null
					animateAndCommit(deck.firstOrNull { it.symbol == card.symbol } ?: card, isSTAK = true)
				},
				onDismiss = { quickLookCard = null },
			)
		}
		// A refused save answers where the undo toast appears, so the reason lands
		// where the eye already goes after a swipe - but beneath a live Undo, never
		// over it: undoing the last save is the one thing that frees a slot.
		com.stak.demo.ui.components.StakFullToast(
			state = stakFullNotice,
			u = u,
			modifier = Modifier
				.align(Alignment.TopCenter)
				.statusBarsPadding()
				.padding(top = ((if (pendingUndo != null) 128 else 74) * u).dp)
				.zIndex(4f),
		)
		// Undo toast (V1 rule 14): centred under the header. Only the Undo pill
		// reverts; swiping the toast up dismisses it and keeps the decision.
		androidx.compose.animation.AnimatedVisibility(
			visible = pendingUndo != null,
			enter = androidx.compose.animation.slideInVertically(tween(280, easing = EaseOut)) { -it } + fadeIn(tween(200)),
			exit = androidx.compose.animation.slideOutVertically(tween(220)) { -it } + fadeOut(tween(200)),
			modifier = Modifier
				.align(Alignment.TopCenter)
				.statusBarsPadding()
				.padding(top = (74 * u).dp)
				.zIndex(3f),
		) {
			val shown = pendingUndo ?: lastUndo ?: return@AnimatedVisibility
			val dismissPx = with(density) { (24 * u).dp.toPx() }
			val toastDrag = remember { Animatable(0f) }
			val accent = if (shown.second) Color(0xFF4FB3D9) else Color(0xFF8A94A8)
			Box(
				modifier = Modifier
					.offset { androidx.compose.ui.unit.IntOffset(0, toastDrag.value.roundToInt()) }
					.graphicsLayer { alpha = 1f - (-toastDrag.value / (dismissPx * 3f)).coerceIn(0f, 0.6f) }
					.pointerInput(Unit) {
						detectVerticalDragGestures(
							onDragEnd = {
								if (toastDrag.value < -dismissPx) pendingUndo = null
								else scope.launch { toastDrag.animateTo(0f, tween(200, easing = EaseOut)) }
							},
							onDragCancel = { scope.launch { toastDrag.animateTo(0f, tween(200, easing = EaseOut)) } },
						) { change, dy ->
							change.consume()
							scope.launch { toastDrag.snapTo((toastDrag.value + dy).coerceAtMost(0f)) }
						}
					}
					.clip(RoundedCornerShape(50))
					.background(Color(0xF2121A2B))
					.border((1 * u).dp, accent.copy(alpha = 0.45f), RoundedCornerShape(50)),
			) {
				AnimatedContent(
					targetState = shown,
					contentKey = { (card, stak) -> card.symbol + stak },
					transitionSpec = {
						ContentTransform(fadeIn(tween(180)), fadeOut(tween(120)), sizeTransform = SizeTransform(clip = false))
					},
					label = "undoToast",
				) { (undoCard, wasSTAK) ->
					val tint = if (wasSTAK) Color(0xFF4FB3D9) else Color(0xFF8A94A8)
					val name = undoCard.ticker.substringAfter("· ").trim().ifBlank { undoCard.symbol }
					Row(
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.spacedBy((10 * u).dp),
						modifier = Modifier.padding((6 * u).dp),
					) {
						Box(
							contentAlignment = Alignment.Center,
							modifier = Modifier
								.size((28 * u).dp)
								.clip(CircleShape)
								.background(if (wasSTAK) tint else Color(0xFF2A3246)),
						) {
							if (wasSTAK) {
								Image(painterResource(R.drawable.ic_stak_logo_mark), null, modifier = Modifier.size((16 * u).dp))
							} else {
								Canvas(modifier = Modifier.size((10 * u).dp)) {
									val sw = size.minDimension * 0.2f
									drawLine(Color(0xFFC8D2E0), Offset(0f, 0f), Offset(size.width, size.height), strokeWidth = sw, cap = StrokeCap.Round)
									drawLine(Color(0xFFC8D2E0), Offset(size.width, 0f), Offset(0f, size.height), strokeWidth = sw, cap = StrokeCap.Round)
								}
							}
						}
						Text(
							text = if (wasSTAK) "$name added to your STAK" else "Passed on $name",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12.5 * u).sp),
							color = Color.White,
							maxLines = 1,
							overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
							modifier = Modifier.widthIn(max = (190 * u).dp),
						)
						Box(
							modifier = Modifier
								.clip(RoundedCornerShape(50))
								.background(tint.copy(alpha = 0.18f))
								.clickable(
									interactionSource = remember { MutableInteractionSource() },
									indication = com.stak.demo.ui.theme.PressDim,
								) {
									if (wasSTAK) {
										savedCards = savedCards - undoCard.symbol
										com.stak.demo.data.MyStakHoldings.remove(undoCard.symbol)
									} else {
										passedCards = passedCards - undoCard.symbol
									}
									seen = (seen - 1).coerceAtLeast(0)
									viewModel.cancelPendingSwipe(undoCard.brandId)
									pendingUndo = null
								}
								.padding(horizontal = (14 * u).dp, vertical = (8 * u).dp),
						) {
							Text(
								text = "Undo",
								style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp),
								color = if (wasSTAK) Color(0xFF8FD8F2) else Color(0xFFC8D2E0),
							)
						}
					}
				}
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
	showLearnMore: Boolean = false,
	onLearnMore: (() -> Unit)? = null,
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
		DeckCardBody(card = card, onSave = onSave, u = u, rows = rows, saved = saved, showSave = showSave, showLearnMore = showLearnMore, onLearnMore = onLearnMore)
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
private fun DeckCardBody(card: DeckCard, onSave: (() -> Unit)?, u: Float, rows: DeckRowTweaks = DeckRowTweaks(), saved: Boolean = false, showSave: Boolean = true, showLearnMore: Boolean = false, onLearnMore: (() -> Unit)? = null) {
	Column(
		horizontalAlignment = Alignment.CenterHorizontally,
		// The authored card template (1:1740, shared by all three designs):
		// art 340x229 at y4, overlay at 258 -> gap 25.
		verticalArrangement = Arrangement.spacedBy((25 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((22 * u).dp))
			.background(Brush.verticalGradient(0f to card.cardTop, 0.9f to Color(0xFF0C1526), 1f to Color(0x000C1526)))
			.padding(top = (4 * u).dp, bottom = (4 * u).dp),
	) {
		Box(
			modifier = Modifier
				.size((340 * u).dp, (229 * u).dp)
				.clip(RoundedCornerShape((18 * u).dp))
				.background(card.artBg),
		) {
			if (card.artRes != 0) {
				Image(
					painter = painterResource(card.artRes),
					contentDescription = null,
					contentScale = ContentScale.Crop,
					modifier = Modifier.size((340 * u).dp, (229 * u).dp),
				)
			} else {
				// No pre-generated card (a brand added since tools/card-art last ran):
				// the same basket template, with the logo lifted off its tile and set
				// into the glass at runtime.
				Image(
					painter = painterResource(R.drawable.disc_basket_template),
					contentDescription = null,
					contentScale = ContentScale.Crop,
					modifier = Modifier.size((340 * u).dp, (229 * u).dp),
				)
				card.logoUrl?.let { GlassLogo(url = it, u = u) }
			}
		}
		Column(
			verticalArrangement = Arrangement.spacedBy((19 * u).dp),
			modifier = Modifier.fillMaxWidth().padding(horizontal = (18 * u).dp).padding(bottom = ((if (showLearnMore) 10 else 16) * u).dp).topInset((rows.overlay * u).dp),
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
						text = com.stak.demo.data.StakClock.sessionChange(card.change),
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						maxLines = 1,
						softWrap = false,
						color = if (card.change.startsWith("▼")) Disc.Red else Disc.Green,
						modifier = Modifier.padding(bottom = (2 * u).dp),
					)
				}
			}
			if (card.tip.isNotBlank()) {
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
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Disc.Body,
						modifier = Modifier.weight(1f),
					)
				}
			}
			if (showLearnMore) {
				// Tucks up under the tip: the column's 19u rhythm is too loose for a link.
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier
						.fillMaxWidth()
						.layout { measurable, constraints ->
							val placeable = measurable.measure(constraints)
							val tuck = (12 * u).dp.roundToPx()
							layout(placeable.width, (placeable.height - tuck).coerceAtLeast(0)) { placeable.place(0, -tuck) }
						},
				) {
					Row(
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.spacedBy((4 * u).dp),
						modifier = Modifier
							.clip(RoundedCornerShape(50))
							.then(
								if (onLearnMore != null) Modifier.clickable(
									interactionSource = remember { MutableInteractionSource() },
									indication = com.stak.demo.ui.theme.PressDim,
									onClick = onLearnMore,
								) else Modifier,
							)
							.padding(horizontal = (10 * u).dp, vertical = (4 * u).dp),
					) {
						Text(
							text = "Learn more",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
							color = Disc.Teal,
						)
						Canvas(modifier = Modifier.size((7 * u).dp, (12 * u).dp)) {
							val px = size.height / 12f
							val p = Path().apply { moveTo(1f * px, 1.5f * px); lineTo(6f * px, 6f * px); lineTo(1f * px, 10.5f * px) }
							drawPath(p, Disc.Teal, style = Stroke(width = 1.5f * px, cap = StrokeCap.Round, join = StrokeJoin.Round))
						}
					}
				}
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

/** Shared sheet scaffold — scrim + r24 sheet. Tap outside or drag handle down to dismiss. */
@Composable
private fun SheetScaffold(onDismiss: () -> Unit, content: @Composable () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val density = LocalDensity.current
	val yOffset = remember { Animatable(0f) }
	val scope = rememberCoroutineScope()
	val exitPx = with(density) { LocalConfiguration.current.screenHeightDp.dp.toPx() }
	val dismissThresholdPx = with(density) { 150.dp.toPx() }
	// Slide the sheet fully off-screen before notifying, so closing reads as a
	// motion instead of a pop.
	fun closeSmoothly() {
		scope.launch {
			yOffset.animateTo(exitPx, tween(240, easing = EaseOut))
			onDismiss()
		}
	}
	Box(modifier = Modifier.fillMaxSize()) {
		Box(
			modifier = Modifier
				.fillMaxSize()
				.graphicsLayer { alpha = (1f - (yOffset.value / exitPx)).coerceIn(0f, 1f) }
				.background(Color(0x99000000))
				.clickable(
					interactionSource = remember { MutableInteractionSource() },
					indication = null,
					onClick = { closeSmoothly() },
				),
		)
		Column(
			modifier = Modifier
				.align(Alignment.BottomCenter)
				.fillMaxWidth()
				.offset { androidx.compose.ui.unit.IntOffset(0, yOffset.value.roundToInt().coerceAtLeast(0)) }
				.clip(RoundedCornerShape(topStart = (24 * u).dp, topEnd = (24 * u).dp))
				.background(Disc.SheetBg)
				.padding(horizontal = (20 * u).dp)
				.padding(top = (10 * u).dp)
				.navigationBarsPadding()
				.padding(bottom = (12 * u).dp),
		) {
			// Drag handle — tall hitbox so it's easy to grab; pill is visual only.
			// Dragging this zone down > 80dp dismisses; releasing early snaps back.
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier
					.align(Alignment.CenterHorizontally)
					.fillMaxWidth()
					.height((28 * u).dp)
					.pointerInput(Unit) {
						detectVerticalDragGestures(
							onDragEnd = {
								if (yOffset.value > dismissThresholdPx) {
									closeSmoothly()
								} else {
									scope.launch { yOffset.animateTo(0f, tween(260, easing = EaseOut)) }
								}
							},
						) { change, dragAmount ->
							change.consume()
							scope.launch { yOffset.snapTo((yOffset.value + dragAmount).coerceAtLeast(0f)) }
						}
					},
			) {
				Box(
					modifier = Modifier
						.size((40 * u).dp, (4 * u).dp)
						.background(Disc.Divider, RoundedCornerShape((2 * u).dp)),
				)
			}
			content()
		}
	}
}

/** NVDA row used by both sheets — teal-tinted, badge + price + change. */
@Composable
private fun NvdaStockRow(spec: BuySpec = NVDA_BUY, logoUrl: String? = null) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	var logoFailed by remember(logoUrl) { mutableStateOf(false) }
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
			if (logoUrl != null && !logoFailed) {
				coil.compose.AsyncImage(
					model = logoUrl,
					contentDescription = null,
					contentScale = ContentScale.Fit,
					modifier = Modifier.size((26 * u).dp).clip(RoundedCornerShape((4 * u).dp)),
					onError = { logoFailed = true },
				)
			} else {
				Text(
					text = spec.badge,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp),
					color = Disc.BadgeInk,
				)
			}
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

/** Shown instead of the deck when today's cards couldn't load - never stand-in cards with made-up prices. */
@Composable
private fun DeckLoadError(u: Float, onRetry: () -> Unit) {
	Column(
		horizontalAlignment = Alignment.CenterHorizontally,
		verticalArrangement = Arrangement.spacedBy((10 * u).dp),
		modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (80 * u).dp),
	) {
		Text(
			text = "Couldn't load today's deck",
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp),
			color = Disc.BrightInk,
		)
		Text(
			text = "Check your connection and try again.",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
			color = Disc.Muted,
		)
		Spacer(modifier = Modifier.height((8 * u).dp))
		Box(
			contentAlignment = Alignment.Center,
			modifier = Modifier
				.size((140 * u).dp, (44 * u).dp)
				.clip(RoundedCornerShape((6 * u).dp))
				.background(CtaGradient, RoundedCornerShape((6 * u).dp))
				.clickable(
					interactionSource = remember { MutableInteractionSource() },
					indication = com.stak.demo.ui.theme.PressDim,
					onClick = onRetry,
				),
		) {
			Text(
				text = "Retry",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp),
				color = Color.White,
			)
		}
	}
}

/**
 * The cards this deck actually showed - a day with fewer eligible stocks ends before
 * the daily limit and must not claim the full count; a day with none says so.
 */
private fun endOfDeckSummary(seen: Int, total: Int): String {
	if (seen <= 0) return "No new stocks to show today."
	val n = seen.coerceAtMost(total)
	val cards = if (n == 1) "card" else "cards"
	val signals = if (n == 1) "signal" else "signals"
	return "${countWord(n)} $cards, ${countWord(n).lowercase()} $signals. Your taste graph got smarter."
}

private fun countWord(n: Int): String = listOf(
	"Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
	"Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
).getOrElse(n) { "$n" }

/**
 * Discover · End of deck (CHINEDU 1:2330) — receipt stats + CTAs. The
 * card count in the copy follows the daily limit the server sends;
 * the tiles report THIS run's real Seen / Saved / Bought (user, 2026-09-04,
 * DE-STAK 04 · Discover 1:1916: the authored deck look wins).
 */
@Composable
private fun EndOfDeck(seen: Int, total: Int, saved: Int, passed: Int, limitReached: Boolean, onReviewSaves: () -> Unit) {
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
			text = endOfDeckSummary(seen, total),
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Disc.Muted,
		)
		Spacer(modifier = Modifier.height((32 * u).dp))
		Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp)) {
			listOf("Seen" to "$seen", "Saved" to "$saved", "Passed" to "$passed").forEach { (label, value) ->
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
			// The deck day turns at DECK_DAY_START_HOUR local (todayKey): finished before it, the next one is today.
			text = if (java.time.LocalTime.now().hour < DECK_DAY_START_HOUR) "A new deck lands at 9am." else "A new deck lands tomorrow at 9am.",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Disc.Muted,
		)
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
	// Tickets carry sample prices; re-price from the live quote so the order fills at today's price.
	var quoted by remember(spec.symbol) { mutableStateOf(spec) }
	LaunchedEffect(spec.symbol) {
		com.stak.demo.data.LiveQuotes.quote(spec.symbol)?.let { (price, change) -> if (!filled) quoted = spec.withQuote(price, change) }
	}
	val live = quoted.withAmount(amount, cashBefore)
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
							if (limit != null && limit < quoted.price) {
								// Below today's price: an open order, no fill yet (FigJam: Order pending).
								if (com.stak.demo.ui.simulate.PaperPortfolio.placeLimit(quoted, amount, limit)) { placedLimit = limit; filled = true }
							} else {
								filled = true; com.stak.demo.ui.simulate.PaperPortfolio.buy(quoted, amount); onFilled()
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

/**
 * Inline Quick Look sheet — V1 rules 7–8. Tapping the front card opens this;
 * Pass / STAK CTAs commit the decision without navigating away.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun QuickLookSheet(
	card: DeckCard,
	onPass: () -> Unit,
	onSTAK: () -> Unit,
	onDismiss: () -> Unit,
	loadQuickLook: suspend (String) -> QuickLookData,
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	var data by remember(card.brandId) { mutableStateOf<QuickLookData?>(null) }
	LaunchedEffect(card.brandId) {
		if (card.brandId.isNotBlank()) data = loadQuickLook(card.brandId)
	}
	val companyName = card.ticker.substringAfter("· ").trim().ifBlank { card.symbol }
	val ticker = card.symbol
	val maxHeightDp = (LocalConfiguration.current.screenHeightDp * 0.50f).dp
	SheetScaffold(onDismiss = onDismiss) {
		Column(
			modifier = Modifier
				.fillMaxWidth()
				.heightIn(max = maxHeightDp)
				.verticalScroll(rememberScrollState()),
		) {
			// "Quick Look" label (drag handle above handles dismiss)
			Text(
				text = "Quick Look",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, letterSpacing = (0.4f * u).sp),
				color = Disc.Muted,
				modifier = Modifier.padding(bottom = (8 * u).dp),
			)
			// Title: "CompanyName (TICKER)"
			Text(
				text = "$companyName ($ticker)",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp, lineHeight = (24 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.BrightInk,
				modifier = Modifier.padding(bottom = (2 * u).dp),
			)
			// Subtitle
			Text(
				text = "A 30-second overview to help you decide.",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.Muted,
				modifier = Modifier.padding(bottom = (10 * u).dp),
			)
			val ql = data?.structured
			if (ql != null) {
				QuickLookIconRow(iconRes = R.drawable.ic_goal_learn, label = "$companyName in 10 seconds", body = ql.in10Seconds, u = u)
				Spacer(Modifier.height((8 * u).dp))
				QuickLookIconRow(iconRes = R.drawable.ic_goal_grow, label = "Why now", body = ql.whyNow, u = u)
				Spacer(Modifier.height((8 * u).dp))
				Row(
					modifier = Modifier.fillMaxWidth(),
					horizontalArrangement = Arrangement.spacedBy((10 * u).dp),
				) {
					Column(modifier = Modifier.weight(1f)) {
						QuickLookIconRow(iconRes = R.drawable.ic_risk_plus, label = "The setup", body = ql.setup, u = u)
					}
					Column(modifier = Modifier.weight(1f)) {
						QuickLookIconRow(iconRes = R.drawable.ic_risk_shield, label = "The catch", body = ql.theCatch, u = u, tile = Color(0x33FF5A6A))
					}
				}
				Spacer(Modifier.height((8 * u).dp))
				QuickLookIconRow(iconRes = R.drawable.ic_risk_eye, label = "What to watch", body = ql.whatToWatch, u = u)
				KeyThemes(themes = ql.keyThemes, u = u)
			} else if (!data?.sections.isNullOrEmpty()) {
				val icons = listOf(R.drawable.ic_goal_learn, R.drawable.ic_goal_grow, R.drawable.ic_risk_plus, R.drawable.ic_risk_shield, R.drawable.ic_risk_eye)
				data?.sections.orEmpty().forEachIndexed { i, section ->
					if (i > 0) Spacer(Modifier.height((8 * u).dp))
					QuickLookIconRow(iconRes = icons[i % icons.size], label = section.heading, body = section.content, u = u)
				}
				KeyThemes(themes = card.categories.map { c -> c.split('_').joinToString(" & ") { it.replaceFirstChar(Char::titlecase) } }, u = u)
			} else if (data == null && card.brandId.isNotBlank()) {
				// First open of a brand each day waits on generation - usually a few seconds.
				Text(
					text = "Putting together today\u2019s overview\u2026",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
					color = Disc.Muted,
				)
			} else if (card.headline.isNotBlank()) {
				QuickLookIconRow(iconRes = R.drawable.ic_goal_learn, label = "About", body = card.headline, u = u)
			}
			Spacer(Modifier.height((8 * u).dp))
		}
	}
}

/** Key-theme chips under the Quick Look; renders nothing for an empty list. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun KeyThemes(themes: List<String>, u: Float) {
	if (themes.isEmpty()) return
	Spacer(Modifier.height((10 * u).dp))
	Text(
		text = "KEY THEMES",
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, letterSpacing = (0.8f * u).sp),
		color = Disc.Teal,
		modifier = Modifier.padding(bottom = (5 * u).dp),
	)
	FlowRow(
		horizontalArrangement = Arrangement.spacedBy((6 * u).dp),
		verticalArrangement = Arrangement.spacedBy((6 * u).dp),
		modifier = Modifier.fillMaxWidth(),
	) {
		themes.forEach { theme ->
			Box(
				modifier = Modifier
					.clip(RoundedCornerShape(50))
					.background(Color(0xFF1E2030))
					.border(1.dp, Color(0xFF3A3A50), RoundedCornerShape(50))
					.padding(horizontal = (9 * u).dp, vertical = (4 * u).dp),
			) {
				Text(
					text = theme,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp),
					color = Disc.Body,
				)
			}
		}
	}
}

@Composable
private fun QuickLookIconRow(iconRes: Int, label: String, body: String, u: Float, tile: Color = Color(0xFF1E2030)) {
	Row(
		horizontalArrangement = Arrangement.spacedBy((10 * u).dp),
		modifier = Modifier.fillMaxWidth(),
	) {
		Box(
			modifier = Modifier
				.size((28 * u).dp)
				.clip(RoundedCornerShape((6 * u).dp))
				.background(tile),
			contentAlignment = Alignment.Center,
		) {
			Image(
				painter = painterResource(iconRes),
				contentDescription = null,
				modifier = Modifier.size((14 * u).dp),
			)
		}
		Column(verticalArrangement = Arrangement.spacedBy((3 * u).dp)) {
			Text(
				text = label,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.BrightInk,
			)
			Text(
				text = body,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Disc.Body,
			)
		}
	}
}
