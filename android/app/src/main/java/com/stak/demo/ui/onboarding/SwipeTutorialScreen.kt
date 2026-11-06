package com.stak.demo.ui.onboarding

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.pointer.pointerInput
import com.stak.demo.ui.discover.DeckCard
import androidx.compose.ui.zIndex
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.discover.DECK
import com.stak.demo.ui.discover.DeckRowTweaks
import com.stak.demo.ui.discover.FrontDeckCard
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

// The tutorial deck (1:344) is the Discover deck at 87.4% — the same
// authored queue slabs behind a live front card built from the shared
// Discover card template. Slab poses template-matched to the frame.
private const val DECK_SCALE = 305.75f / 350f

/**
 * Onboarding · 03 Swipe tutorial — Figma node 1:344 (CHINEDU file, "STEP 3 OF 6").
 *
 * The stacked swipe deck: the authored queue slabs (AAPL and GOOGL at their designed
 * tilts) behind a live front card from the Discover template, at the frame's 87.4%
 * scale. The gesture IS Discover's own (device report, 2026-09-19: the tutorial was
 * teaching a vertical "swipe down for next card" that Discover doesn't have at all -
 * the real deck swipes horizontally, left to pass and right to STAK, with the same
 * Pass/STAK buttons underneath): drag left or right, the card rotates and the buttons
 * fill with the same ratio Discover uses, and a commit sends the card flying off in
 * that direction while the next design in the demo queue takes the front slot - no
 * invented crossfade-promote transition Discover doesn't do either, just the front
 * card being whichever is next once the flown one clears.
 */
@Composable
fun SwipeTutorialScreen(onBack: () -> Unit, onContinue: () -> Unit) {
	var swiped by rememberSaveable { mutableIntStateOf(0) }
	// Swipes must NEVER be eaten (Discover, user 2026-09-02): the deck
	// advances the moment a swipe commits, and the swiped card flies off as
	// a non-interactive GHOST above the live deck - the finger owns the new
	// front card immediately, so any cadence lands.
	var flyingCard by remember { mutableStateOf<DeckCard?>(null) }
	val flyOffset = remember { Animatable(0f) }
	val flyFade = remember { Animatable(1f) }
	val swipeOffset = remember { Animatable(0f) }
	val scope = rememberCoroutineScope()
	val density = LocalDensity.current
	val u = figmaUnit()
	val u2 = u * DECK_SCALE

	fun advance(isSTAK: Boolean, gestureOffsetPx: Float = 0f) {
		val cardWidthPx = with(density) { (306 * u).dp.toPx() }
		val flyTarget = if (isSTAK) cardWidthPx * 1.6f else -cardWidthPx * 1.6f
		scope.launch {
			flyingCard = DECK[swiped % 3]
			flyFade.snapTo(1f)
			flyOffset.snapTo(gestureOffsetPx)
			swiped += 1
			swipeOffset.snapTo(0f)
			launch { flyFade.animateTo(0f, tween(120, delayMillis = 200, easing = EaseOut)) }
			flyOffset.animateTo(flyTarget, tween(380, easing = EaseOut))
			flyingCard = null
		}
	}

	// A screen too short for the deck drops the bottom Back (the header's back circle does the
	// same) to give the deck its room before scaling it. Once set it stays, so the room it frees
	// can't bring Back - and the overflow - back.
	var compact by remember { mutableStateOf(false) }

	Artboard(modifier = Modifier.background(StakColors.Bg)) {
		Row(
			verticalAlignment = Alignment.CenterVertically,
			modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (10 * u).dp, bottom = (4 * u).dp),
		) {
			AuthBackCircle(onClick = onBack)
			Spacer(modifier = Modifier.weight(1f))
			Text(
				text = "STEP 3 OF 6",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, letterSpacing = (0.9 * u).sp),
				color = Auth.FaintText,
			)
		}

		Column(
			verticalArrangement = Arrangement.spacedBy((18 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.padding(horizontal = (24 * u).dp)
				.padding(top = (14 * u).dp),
		) {
			Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
				Text(
					text = "Now try a few swipes.",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (24 * u).sp, lineHeight = (31 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = StakColors.TextPrimary,
				)
				Text(
					text = "Swipe right to STAK, left to pass.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
					color = Auth.SubtitleGray,
				)
			}

			// The room above Continue/Back and the deck + Pass/STAK's height with the card's art at
			// full size: on a short screen they ran into Continue, so the art is shortened first, as
			// Discover's is, and what's still missing is scaled (1 wherever they fit). The drag sits
			// inside the scale, so the card follows the finger (Discover instead keeps its drag outside
			// and divides the card's offset). iOS: the same in SwipeTutorialView.
			var deckRoom by remember { mutableIntStateOf(0) }
			var deckNeed by remember { mutableIntStateOf(0) }
			// The height actually laid out (with this frame's art), which the scale is worked out from.
			var laidOut by remember { mutableIntStateOf(0) }
			val unitPx = with(density) { u2.dp.toPx() }
			// How much shorter the card's art is drawn (u2): the overflow, up to 99 (229 -> 130, the
			// whole glass ball in view).
			fun shortNow() = if (deckRoom > 0 && deckNeed > 0) ((deckNeed - deckRoom) / unitPx).coerceIn(0f, 99f) else 0f
			// From the laid-out height, not from the art the next frame will have: on the first frames
			// the art is still full height, and a scale of 1 would run the deck into Continue.
			fun fitNow() = if (deckRoom > 0 && laidOut > 0) minOf(1f, deckRoom.toFloat() / laidOut) else 1f
			val short = shortNow()
			val fit = fitNow()
			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				modifier = Modifier
					.weight(1f)
					.fillMaxWidth()
					.padding(top = (10 * u).dp)
					.onSizeChanged {
						deckRoom = it.height
						if (deckNeed > it.height + 1) compact = true
					}
					.wrapContentHeight(Alignment.Top, unbounded = true)
					.onSizeChanged {
						laidOut = it.height
						// Measured with this layout's art: back to the full art's height. A pixel of
						// rounding is left alone, so it can't go back and forth.
						val need = it.height + (short * unitPx).roundToInt()
						if (abs(need - deckNeed) > 1) deckNeed = need
						if (deckRoom > 0 && need > deckRoom + 1) compact = true
					}
					// The scale is read here, at draw time, so the first frame is already scaled.
					.graphicsLayer {
						val f = fitNow()
						transformOrigin = TransformOrigin(0.5f, 0f)
						scaleX = f
						scaleY = f
					},
			) {
				val rows = DeckRowTweaks(overlay = -1.35f, headline = 0.55f, price = 0.95f, tip = 0.1f)
				// The drag is measured inside the scale; dividing by it keeps the commit at the same finger
				// travel as unscaled.
				val commitPx = with(density) { (110 * u2).dp.toPx() } / fit
				// Read when a drag ends, so a change of scale doesn't restart the detector mid-drag.
				val commitNow by rememberUpdatedState(commitPx)
				Box(
					modifier = Modifier
						.size((306 * u).dp, (423.07 * u - short * u2).dp)
						// UNCLIPPED and above its siblings, like Discover: a dragged
						// or flying card stays WHOLE past the deck bounds, passing
						// over the hint/CTA zone like a real card deck.
						.zIndex(1f)
						.pointerInput(Unit) {
							var dragTotal = 0f
							detectHorizontalDragGestures(
								onDragStart = { dragTotal = 0f },
								// A drag the system cancelled never ends: put the card back.
								onDragCancel = { scope.launch { swipeOffset.animateTo(0f, tween(260, easing = EaseOut)) } },
								onDragEnd = {
									scope.launch {
										if (abs(dragTotal) > commitNow) {
											advance(isSTAK = dragTotal > 0, dragTotal)
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
					// The authored queue slabs (1:344) - static behind the live front
					// card, same as Discover's own peek cards: they don't animate or
					// crossfade, they're just there until the front card clears. Cut off where the
					// front card (~430u2 tall) starts fading out, so one with shortened art doesn't show
					// their bottoms through it; at full art that's below them both.
					Box(modifier = Modifier.size((306 * u).dp, (47.5 * u + 0.9f * (430 - short) * u2).dp).clipToBounds()) {
						Image(
							painter = painterResource(R.drawable.tutorial_card_googl),
							contentDescription = null,
							modifier = Modifier.offset(x = (33.5 * u).dp, y = 0.dp).size((238.75 * u).dp, (290.75 * u).dp),
						)
						Image(
							painter = painterResource(R.drawable.tutorial_card_aapl),
							contentDescription = null,
							modifier = Modifier.offset(x = (15.5 * u).dp, y = (21 * u).dp).size((273.5 * u).dp, (309.5 * u).dp),
						)
					}
					FrontDeckCard(
						card = DECK[swiped % 3],
						onSave = { advance(isSTAK = true) },
						u = u2,
						rows = rows,
						artU = 229f - short,
						modifier = Modifier
							.align(Alignment.TopCenter)
							.offset(y = (47.5 * u).dp)
							.offset { IntOffset(swipeOffset.value.roundToInt(), 0) }
							.graphicsLayer { rotationZ = (swipeOffset.value / commitPx) * 8f },
					)
					flyingCard?.let { ghost ->
						// The swiped-away card flying off above the live deck;
						// no handlers - input falls through to the front card.
						FrontDeckCard(
							card = ghost,
							onSave = {},
							u = u2,
							rows = rows,
							artU = 229f - short,
							modifier = Modifier
								.align(Alignment.TopCenter)
								.offset(y = (47.5 * u).dp)
								.offset { IntOffset(flyOffset.value.roundToInt(), 0) }
								.graphicsLayer { alpha = flyFade.value },
						)
					}
				}
				Spacer(modifier = Modifier.size((16 * u).dp))
				// Pass/STAK — the same pair Discover has, filling color with the same
				// drag ratio, and just as clickable without dragging at all.
				val ratio = (swipeOffset.value / commitPx).coerceIn(-1f, 1f)
				val passRatio = (-ratio).coerceAtLeast(0f)
				val stakRatio = ratio.coerceAtLeast(0f)
				// Each circle takes the tap with its label, in a column 16u2 wider than it (the centres
				// are where 48u2 apart put them): the pair stays fingertip-sized when the deck scales
				// down. iOS: the same in DecisionButtons.
				Row(horizontalArrangement = Arrangement.spacedBy((32 * u2).dp), modifier = Modifier.align(Alignment.CenterHorizontally)) {
					Column(
						horizontalAlignment = Alignment.CenterHorizontally,
						verticalArrangement = Arrangement.spacedBy((6 * u2).dp),
						modifier = Modifier
							.width((72 * u2).dp)
							.clickable(
								interactionSource = remember { MutableInteractionSource() },
								indication = com.stak.demo.ui.theme.PressDim,
								role = Role.Button,
								onClick = { advance(isSTAK = false) },
							),
					) {
						val passBg = lerp(Color(0xFF1C202E), Color.White, passRatio)
						val passIconColor = lerp(Color(0xFFB0B8CC), Color(0xFF1C202E), passRatio)
						Box(
							contentAlignment = Alignment.Center,
							modifier = Modifier
								.size((56 * u2).dp)
								.background(passBg, CircleShape),
						) {
							Canvas(modifier = Modifier.size((20 * u2).dp)) {
								val s = size.minDimension
								val sw = s * 0.12f
								val pad = s * 0.1f
								drawLine(passIconColor, Offset(pad, pad), Offset(s - pad, s - pad), strokeWidth = sw, cap = StrokeCap.Round)
								drawLine(passIconColor, Offset(s - pad, pad), Offset(pad, s - pad), strokeWidth = sw, cap = StrokeCap.Round)
							}
						}
						Text(text = "Pass", style = TextStyle(fontFamily = Geist, fontSize = (12 * u2).sp), color = Auth.SubtitleGray, maxLines = 1, softWrap = false)
					}
					Column(
						horizontalAlignment = Alignment.CenterHorizontally,
						verticalArrangement = Arrangement.spacedBy((6 * u2).dp),
						modifier = Modifier
							.width((72 * u2).dp)
							.clickable(
								interactionSource = remember { MutableInteractionSource() },
								indication = com.stak.demo.ui.theme.PressDim,
								role = Role.Button,
								onClick = { advance(isSTAK = true) },
							),
					) {
						val stakBg = lerp(Color(0xFF1C202E), Color(0xFF4FB3D9), stakRatio)
						Box(
							contentAlignment = Alignment.Center,
							modifier = Modifier
								.size((56 * u2).dp)
								.background(stakBg, CircleShape),
						) {
							// The label below names it.
							Image(painterResource(R.drawable.ic_stak_logo_mark), null, modifier = Modifier.size((28 * u2).dp))
						}
						Text(text = "STAK", style = TextStyle(fontFamily = Geist, fontSize = (12 * u2).sp), color = Auth.SubtitleGray, maxLines = 1, softWrap = false)
					}
				}
			}
		}

		Column(
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
		) {
			AuthCta(text = "Continue", onClick = onContinue)
			if (!compact) AuthSecondaryButton(text = "Back", onClick = onBack)
		}
	}
}
