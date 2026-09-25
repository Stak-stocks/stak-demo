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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.discover.DECK
import com.stak.demo.ui.discover.DeckRowTweaks
import com.stak.demo.ui.discover.FrontDeckCard
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
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

			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				modifier = Modifier.weight(1f).fillMaxWidth().padding(top = (10 * u).dp),
			) {
				val rows = DeckRowTweaks(overlay = -1.35f, headline = 0.55f, price = 0.95f, tip = 0.1f)
				val commitPx = with(density) { (110 * u2).dp.toPx() }
				Box(
					modifier = Modifier
						.size((306 * u).dp, (423.07 * u).dp)
						// UNCLIPPED and above its siblings, like Discover: a dragged
						// or flying card stays WHOLE past the deck bounds, passing
						// over the hint/CTA zone like a real card deck.
						.zIndex(1f)
						.pointerInput(Unit) {
							var dragTotal = 0f
							detectHorizontalDragGestures(
								onDragStart = { dragTotal = 0f },
								onDragEnd = {
									val abs = kotlin.math.abs(dragTotal)
									scope.launch {
										if (abs > commitPx) {
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
					// crossfade, they're just there until the front card clears.
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
					FrontDeckCard(
						card = DECK[swiped % 3],
						onSave = { advance(isSTAK = true) },
						u = u2,
						rows = rows,
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
							modifier = Modifier
								.align(Alignment.TopCenter)
								.offset(y = (47.5 * u).dp)
								.offset { IntOffset(flyOffset.value.roundToInt(), 0) }
								.graphicsLayer { alpha = flyFade.value },
						)
					}
				}
				Spacer(modifier = Modifier.size((16 * u).dp))
				// Pass/STAK — the same pair Discover has, filling colour with the same
				// drag ratio, and just as clickable without dragging at all.
				val ratio = (swipeOffset.value / commitPx).coerceIn(-1f, 1f)
				val passRatio = (-ratio).coerceAtLeast(0f)
				val stakRatio = ratio.coerceAtLeast(0f)
				Row(horizontalArrangement = Arrangement.spacedBy((48 * u2).dp), modifier = Modifier.align(Alignment.CenterHorizontally)) {
					Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((6 * u2).dp)) {
						val passBg = lerp(Color(0xFF1C202E), Color.White, passRatio)
						val passIconColor = lerp(Color(0xFFB0B8CC), Color(0xFF1C202E), passRatio)
						Box(
							contentAlignment = Alignment.Center,
							modifier = Modifier
								.size((56 * u2).dp)
								.background(passBg, CircleShape)
								.clickable(
									interactionSource = remember { MutableInteractionSource() },
									indication = com.stak.demo.ui.theme.PressDim,
									onClick = { advance(isSTAK = false) },
								),
						) {
							Canvas(modifier = Modifier.size((20 * u2).dp)) {
								val s = size.minDimension
								val sw = s * 0.12f
								val pad = s * 0.1f
								drawLine(passIconColor, Offset(pad, pad), Offset(s - pad, s - pad), strokeWidth = sw, cap = StrokeCap.Round)
								drawLine(passIconColor, Offset(s - pad, pad), Offset(pad, s - pad), strokeWidth = sw, cap = StrokeCap.Round)
							}
						}
						Text(text = "Pass", style = TextStyle(fontFamily = Geist, fontSize = (12 * u2).sp), color = Auth.SubtitleGray)
					}
					Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((6 * u2).dp)) {
						val stakBg = lerp(Color(0xFF1C202E), Color(0xFF4FB3D9), stakRatio)
						Box(
							contentAlignment = Alignment.Center,
							modifier = Modifier
								.size((56 * u2).dp)
								.background(stakBg, CircleShape)
								.clickable(
									interactionSource = remember { MutableInteractionSource() },
									indication = com.stak.demo.ui.theme.PressDim,
									onClick = { advance(isSTAK = true) },
								),
						) {
							Image(painterResource(R.drawable.ic_stak_logo_mark), "STAK", modifier = Modifier.size((28 * u2).dp))
						}
						Text(text = "STAK", style = TextStyle(fontFamily = Geist, fontSize = (12 * u2).sp), color = Auth.SubtitleGray)
					}
				}
			}
		}

		Column(
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
		) {
			AuthCta(text = "Continue", onClick = onContinue)
			AuthSecondaryButton(text = "Back", onClick = onBack)
		}
	}
}
