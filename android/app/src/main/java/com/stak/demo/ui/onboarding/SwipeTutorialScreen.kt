package com.stak.demo.ui.onboarding

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectVerticalDragGestures
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import com.stak.demo.ui.discover.DeckCard
import androidx.compose.ui.zIndex
import androidx.compose.ui.graphics.TransformOrigin
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

/** The authored mid slab (1:344, 273.5 wide) over the front card (305.75): the queue's next-card geometry. */
private const val MID_SCALE = 273.5f / 305.75f

/**
 * Onboarding · 03 Swipe tutorial — Figma node 1:344 (CHINEDU file, "STEP 3 OF 6").
 *
 * The stacked swipe deck: the authored queue slabs (AAPL and GOOGL at
 * their designed tilts) behind a live front card from the Discover
 * template at the frame's 87.4% scale. Swiping down reshuffles: the
 * front card flies off to the back of the queue and the next design
 * takes the front row, cycling in order. Chevrons + "Swipe down" hint
 * under the stack, Continue/Back below.
 *
 * The swipe IS the Discover deck's swipe (user, 2026-09-07: the practice
 * swipe must be Discover's swipe down, nothing else): commit-first ghost
 * fly-off, fling commit, the mid slab crossfading into the live next card
 * as the drag reveals it, the new front promoting from the slab geometry;
 * a dragged or flying card stays whole past the deck bounds. Same numbers
 * as DiscoverScreen at this deck's 87.4% unit.
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
	val topOffset = remember { Animatable(0f) }
	// `enter` is the PROMOTE progress: 0 = the authored mid-slab geometry
	// (y 21 / 273.5 wide), 1 = settled in the front slot.
	val enter = remember { Animatable(1f) }
	val frontFade = remember { Animatable(1f) }
	val scope = rememberCoroutineScope()
	val density = LocalDensity.current
	val u = figmaUnit()
	val u2 = u * DECK_SCALE

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
					text = "Swipe down for the next card. Save what you like.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
					color = Auth.SubtitleGray,
				)
			}

			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				modifier = Modifier.weight(1f).fillMaxWidth().padding(top = (10 * u).dp),
			) {
				// The deck — the authored queue slabs stay put while the live
				// front card cycles. User's motion (2026-08-21): swipe down
				// reshuffles the front card to the back and the next takes the
				// front row in an organized sequence — the Discover grammar.
				// The card rows: this frame's card authors looser text gaps than a
				// uniform 87.4% scale of the Discover card (1:1627) — render-fitted
				// against the 2x export of 1:344 (re-fitted 2026-09-05 on StakTest
				// after FIGMA_LINE_BOX: the old (0.85, 0.85, 1.65, 0.4) left every
				// card row 2.2-3.2 low).
				val rows = DeckRowTweaks(overlay = -1.35f, headline = 0.55f, price = 0.95f, tip = 0.1f)
				Box(
					modifier = Modifier
						.size((306 * u).dp, (423.07 * u).dp)
						// UNCLIPPED and above its siblings, like Discover: a dragged
						// or flying card stays WHOLE past the deck bounds, passing
						// over the hint/CTA zone like a real card deck.
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
										val commitPx = with(density) { (110 * u2).dp.toPx() }
										// Commit on distance OR on a fling - a fast short
										// flick advances too (the Instagram rule).
										if (committed > commitPx || (flung && committed > with(density) { (20 * u2).dp.toPx() })) {
											// The frame's card shuffle, commit-first: the swiped
											// card becomes the ghost and the deck advances NOW -
											// a second swipe grabs the next card even while the
											// ghost is still flying.
											flyingCard = DECK[swiped % 3]
											flyFade.snapTo(1f)
											flyOffset.snapTo(committed)
											swiped += 1
											topOffset.snapTo(0f)
											// The new front takes over at the mid-slab geometry
											// the finger just revealed, then promotes forward.
											enter.snapTo(0f)
											// A velocity flick can commit before the crossfade
											// finished - pick the alpha up from the reveal.
											frontFade.snapTo((committed / commitPx).coerceIn(0f, 1f))
											launch { frontFade.animateTo(1f, tween(120, easing = EaseOut)) }
											launch { flyOffset.animateTo(with(density) { (500 * u2).dp.toPx() }, tween(280, easing = EaseOut)) }
											launch { enter.animateTo(1f, tween(200, easing = EaseOut)) }
											flyFade.animateTo(0f, tween(300, easing = EaseOut))
											flyingCard = null
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
					val commitPx = with(density) { (110 * u2).dp.toPx() }
					Image(
						painter = painterResource(R.drawable.tutorial_card_googl),
						contentDescription = null,
						modifier = Modifier.offset(x = (33.5 * u).dp, y = 0.dp).size((238.75 * u).dp, (290.75 * u).dp),
					)
					// As the drag exposes the mid slab it crossfades into the LIVE
					// next card at the SAME authored geometry (Discover's rule), so
					// the queue always tells the truth.
					Image(
						painter = painterResource(R.drawable.tutorial_card_aapl),
						contentDescription = null,
						modifier = Modifier
							.offset(x = (15.5 * u).dp, y = (21 * u).dp)
							.size((273.5 * u).dp, (309.5 * u).dp)
							.graphicsLayer { alpha = 1f - (topOffset.value / commitPx).coerceIn(0f, 1f) },
					)
					FrontDeckCard(
						card = DECK[(swiped + 1) % 3],
						onSave = {},
						u = u2,
						rows = rows,
						modifier = Modifier
							.align(Alignment.TopCenter)
							.offset(y = (21 * u).dp)
							.graphicsLayer {
								alpha = (topOffset.value / commitPx).coerceIn(0f, 1f)
								transformOrigin = TransformOrigin(0.5f, 0f)
								scaleX = MID_SCALE
								scaleY = MID_SCALE
							},
					)
					FrontDeckCard(
						card = DECK[swiped % 3],
						onSave = {},
						u = u2,
						rows = rows,
						modifier = Modifier
							.align(Alignment.TopCenter)
							.offset(y = (47.5 * u).dp)
							.offset { IntOffset(0, topOffset.value.roundToInt()) }
							.graphicsLayer {
								// The promote: from the authored mid-slab geometry
								// (y 21, 273.5 wide) into the front slot as `enter`
								// settles - the queue visibly steps forward.
								alpha = frontFade.value
								transformOrigin = TransformOrigin(0.5f, 0f)
								val e = enter.value
								translationY = (21f - 47.5f) * u * this.density * (1f - e)
								val s = MID_SCALE + (1f - MID_SCALE) * e
								scaleX = s
								scaleY = s
							},
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
								.offset { IntOffset(0, flyOffset.value.roundToInt()) }
								.graphicsLayer { alpha = flyFade.value },
						)
					}
				}
				Spacer(modifier = Modifier.size((9 * u).dp))
				// Gesture hint — twin chevrons at 50% + "Swipe down".
				Column(
					horizontalAlignment = Alignment.CenterHorizontally,
					verticalArrangement = Arrangement.spacedBy((4 * u).dp),
				) {
					Column(
						verticalArrangement = Arrangement.spacedBy((1 * u).dp),
						modifier = Modifier.alpha(0.5f),
					) {
						ChevronDown(u)
						ChevronDown(u)
					}
					Text(
						text = "Swipe down",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (8.73 * u).sp),
						color = Auth.FaintText,
					)
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

/**
 * The authored 13.97x6.98 down-chevron (1:487 / 1:489): the exported
 * vector - stroke #5C6B85 at 1.75, round caps, the glyph inset inside
 * its frame. Was a hand-drawn corner-to-corner #819ABB 1.6 stroke
 * (exact-design audit 2026-09-04).
 */
@Composable
private fun ChevronDown(u: Float) {
	Image(
		painter = painterResource(R.drawable.ic_swipe_chevron),
		contentDescription = null,
		modifier = Modifier.size((13.97 * u).dp, (6.98 * u).dp),
	)
}
