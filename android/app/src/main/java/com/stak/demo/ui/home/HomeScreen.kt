package com.stak.demo.ui.home

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.animation.core.animateFloat
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.requiredHeight
import androidx.compose.ui.draw.blur
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.ui.zIndex
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/** Palette of the CHINEDU "02 · Home" frames. */
private object Home {
	val CardBg = Color(0xFF171D2C)
	val TabBg = Color(0xFF060C1D)
	val Teal = Color(0xFF69B3CA)
	val CardInk = Color(0xFF0E162B)
	val PaperWhite = Color(0xFFF9F9F9)
	val NavCircle = Color(0xFF192238)
}

/**
 * 02 · Home — CHINEDU "Home first run" (1:958) and "Home Main" (1:1097).
 *
 * Both frames share the whole content stack: fixed top nav (STAK logo,
 * bell + profile circles, "Good Morning, Hamza"), the Market Mood card
 * with its clipped news-deck stack, the "Why this matters" row and the
 * teal deck banner. First run replaces the tab bar with a bottom scrim
 * and the frosted "See Todays Pick" pill; tapping it reveals Home Main
 * (prototype: Swap overlay · Instant). The tab bar itself lives in the
 * MainShell so the other tabs share it.
 */
@Composable
fun HomeScreen(firstRun: Boolean, onSeeTodaysPick: () -> Unit, onProfile: () -> Unit = {}, onBell: () -> Unit = {}, onOpenNews: () -> Unit = {}, onOpenMyStak: () -> Unit = {}, onOpenDeck: () -> Unit = {}) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	BoxWithConstraints(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		val statusPad = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
		Column(modifier = Modifier.fillMaxSize()) {
			// Dev-ready Home Main (118:1633): the top nav SCROLLS with the
			// content - the greeting block lives inside Scroll content.
			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				modifier = Modifier
					.weight(1f)
					.fillMaxWidth()
					.verticalScroll(rememberScrollState()),
			) {
				TopNav(onProfile = onProfile, onBell = onBell, modifier = Modifier.fillMaxWidth().padding(horizontal = (17 * u).dp))
				Spacer(modifier = Modifier.height((21 * u).dp))
				Column(
					horizontalAlignment = Alignment.CenterHorizontally,
					modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp),
				) {
					MarketMoodCard(onOpenNews = onOpenNews)
					Spacer(modifier = Modifier.height((10 * u).dp))
					WhyThisMattersCard(onOpenMyStak = onOpenMyStak)
					Spacer(modifier = Modifier.height((20 * u).dp))
					DeckBanner(onOpenDeck = onOpenDeck)
					// Authored scroll content (118:1634) ends exactly at the
					// banner's bottom edge - no trailing gap. First run keeps
					// room for the scrim pill.
					if (firstRun) Spacer(modifier = Modifier.height((140 * u).dp))
				}
			}
		}
		if (firstRun) {
			// The frame pins the scrim 41px above the deck banner (Tab bar
			// y629 vs banner y670) — anchor to the same content geometry:
			// banner top = status inset + 626, so the scrim starts 585 below
			// the inset and runs to the physical bottom of the screen.
			FirstRunOverlay(
				onSeeTodaysPick = onSeeTodaysPick,
				modifier = Modifier
					.align(Alignment.BottomCenter)
					.height(this@BoxWithConstraints.maxHeight - statusPad - (585 * u).dp),
			)
		}
	}
}

/** Fixed top nav — logo row with bell/profile circles + greeting (Figma 131px block). */
@Composable
private fun TopNav(onProfile: () -> Unit, onBell: () -> Unit = {}, modifier: Modifier = Modifier) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		// Scrolls with the content (118:1633); authored side inset 17.
		modifier = modifier
			.background(StakColors.Bg)
			.statusBarsPadding()
			.padding(top = (22 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().height((35 * u).dp)) {
			Image(
				painter = painterResource(R.drawable.ic_stak_logo_mark),
				contentDescription = null,
				modifier = Modifier.size((26.48 * u).dp),
			)
			Spacer(modifier = Modifier.width((4.49 * u).dp))
			Image(
				painter = painterResource(R.drawable.ic_stak_wordmark),
				contentDescription = "STAK",
				modifier = Modifier.size((78.16 * u).dp, (14.98 * u).dp),
			)
			Spacer(modifier = Modifier.weight(1f))
			// Bell + stateful unread dot (151:1207): the authored badge
			// (cx26.25 cy11.667 r2.917 #FF8030) shows while untouched
			// notifications exist and clears once they're opened and read.
			Box(
				modifier = Modifier
					.size((35 * u).dp)
					.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
					) { onBell() },
			) {
				Image(
					painter = painterResource(R.drawable.ic_nav_bell),
					contentDescription = "Notifications",
					modifier = Modifier.size((35 * u).dp),
				)
				if (com.stak.demo.data.StakNotifications.hasUnread) {
					Box(
						modifier = Modifier
							.offset(x = (23.333 * u).dp, y = (8.75 * u).dp)
							.size((5.833 * u).dp)
							.background(Color(0xFFFF8030), CircleShape),
					)
				}
			}
			Spacer(modifier = Modifier.width((4 * u).dp))
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier
					.size((35 * u).dp)
					.background(Home.NavCircle, CircleShape)
					.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
						onClick = onProfile,
					),
			) {
				// The picked photo when one exists (Codex audit 2026-09-04),
				// as on the Profile hub; else the authored glyph (118:1633).
				val photo = com.stak.demo.data.UserProfile.photoUri
				if (photo != null) {
					coil.compose.AsyncImage(
						model = photo,
						contentDescription = "Profile",
						contentScale = androidx.compose.ui.layout.ContentScale.Crop,
						modifier = Modifier.size((35 * u).dp).clip(CircleShape),
					)
				} else {
					Image(
						painter = painterResource(R.drawable.ic_nav_person),
						contentDescription = "Profile",
						// 118:1683/1684: the 24 icon box sits at circle centre
						// (+0.5, -0.5) and the glyph at (+0.49, -0.18) inside it, so
						// the glyph rests at (+0.99, -0.68), not dead centre -
						// exact-design audit 2026-09-04.
						modifier = Modifier.offset(x = (0.99 * u).dp, y = (-0.68 * u).dp).size((12.99 * u).dp, (13.64 * u).dp),
					)
				}
			}
		}
		Spacer(modifier = Modifier.height((10 * u).dp))
		// Time-of-day in the user's own timezone (device clock); re-read
		// every 30s so an open app rolls over at noon / 5pm.
		val greeting by androidx.compose.runtime.produceState(initialValue = com.stak.demo.ui.Greeting.now()) {
			while (true) {
				kotlinx.coroutines.delay(30_000)
				value = com.stak.demo.ui.Greeting.now()
			}
		}
		Text(
			text = "$greeting, ${com.stak.demo.data.UserProfile.greetingName}",
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
	}
}

/** Market Mood — 350x397 #171d2c card with the clipped news-deck stack. */
@Composable
private fun MarketMoodCard(onOpenNews: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		modifier = Modifier
			.fillMaxWidth()
			.height((397 * u).dp)
			.clip(RoundedCornerShape((8 * u).dp))
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onOpenNews,
			)
			.background(Home.CardBg),
	) {
		// Shared per-card drag offsets (px): the crisp deck takes the
		// gesture, the blurred band copy mirrors the same motion - exactly
		// what a real backdrop blur would show.
		val deckDrags = remember { List(3) { androidx.compose.animation.core.Animatable(0f) } }
		val dragScope = androidx.compose.runtime.rememberCoroutineScope()
		Box(modifier = Modifier.matchParentSize()) { NewsDeck(deckDrags, dragScope, interactive = true) }
		// The frame's bottom strip (1:1175, 30px) backdrop-blurs the stack —
		// redraw the same deck blurred, clipped to the card's last 30dp.
		Box(
			modifier = Modifier
				.align(Alignment.BottomCenter)
				.fillMaxWidth()
				.height((30 * u).dp)
				.clipToBounds(),
		) {
			// An oversized child gets centered in the 30dp band; shift it up
			// by (397-30)/2 so the stack's bottom edge lines up with the band.
			Box(
				modifier = Modifier
					.offset(y = (-183.5 * u).dp)
					.fillMaxWidth()
					.requiredHeight((397 * u).dp)
					// Render-calibrated: band diff vs the frame is minimal on the
					// 2.4-2.8u plateau (8.26 vs 9.55 at the old 4u). The strip's
					// blurred ink stays ~15% lighter than the frame's - that's the
					// app-wide glyph-coverage class, not the kernel.
					.then(
						// Modifier.blur is a documented no-op below API 31 (minSdk
						// 26) - a translucent veil approximates the frosted band
						// there (audit 2026-08-25).
						if (android.os.Build.VERSION.SDK_INT >= 31) Modifier.blur((2.6 * u).dp) else Modifier,
					),
			) {
				// Opaque ground: backdrop blur replaces everything behind the
				// strip. Without it the blurred cards' soft alpha edges let the
				// crisp deck below show through (sharp+soft union at the edges).
				Box(modifier = Modifier.matchParentSize().background(Home.CardBg))
				NewsDeck(deckDrags, dragScope, interactive = false)
				if (android.os.Build.VERSION.SDK_INT < 31) {
					Box(modifier = Modifier.matchParentSize().background(Home.CardBg.copy(alpha = 0.85f)))
				}
			}
		}
		Row(
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.Center,
			// 118:1690 centres at 50%+0.45 (row left 34, gauge at 260 in the
			// render); plain centring lands at 33.55 - exact-design audit 2026-09-04.
			modifier = Modifier.fillMaxWidth().padding(top = (25 * u).dp).offset(x = (0.45 * u).dp),
		) {
			Column(verticalArrangement = Arrangement.spacedBy((4 * u).dp), modifier = Modifier.width((180 * u).dp)) {
				Text(
					text = "Market Mood",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Medium, fontSize = (20 * u).sp, lineHeight = (25 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Text(
					// Backend-served with the mood score in production (the words
					// change with the market); authored demo copy this phase.
					text = buildAnnotatedString {
						withStyle(SpanStyle(color = Home.Teal)) { append(MarketMoodFeed.statusLead) }
						append(MarketMoodFeed.statusRest)
					},
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
			}
			Spacer(modifier = Modifier.width((46 * u).dp))
			MarketMoodGauge(u = u)
		}
	}
}

/**
 * The stacked news cards in their frame poses — front card straight, the
 * two behind rotated; offsets are from the parent card's center (350x397).
 * Story text comes from NewsDeckFeed (backend-proxied breaking news in
 * production; authored demo copy this phase). Each card can be dragged
 * up to reveal its full info and springs back to the authored rest pose
 * when the thumb leaves (user, 2026-08-22); the drag clamps where the
 * card's bottom edge fully enters the mood card.
 */
@Composable
private fun BoxScope.NewsDeck(
	drags: List<androidx.compose.animation.core.Animatable<Float, androidx.compose.animation.core.AnimationVector1D>>,
	dragScope: kotlinx.coroutines.CoroutineScope,
	interactive: Boolean,
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val stories = NewsDeckFeed.stories()
	// Per-slot authored styling; card bottoms sit at 397.4/527.2/602.7 in
	// the 397 card, so the up-drag clamps at bottom-397.
	val slots = listOf(
		DeckSlot(Home.PaperWhite, FontWeight.Light, 12f, 12f, 6.2f, 59.73f, 0f, 0.4f),
		DeckSlot(Home.Teal, FontWeight.Normal, 11.89f, 17f, 8.33f, 189.44f, -3.72f, 130.2f),
		DeckSlot(Home.PaperWhite, FontWeight.Light, 12f, 12f, -0.02f, 264.57f, -7.68f, 205.7f),
	)
	slots.forEachIndexed { i, slot ->
		val drag = drags[i]
		NewsDeckCard(
			bg = slot.bg,
			title = stories[i].title,
			body = stories[i].body,
			bodyWeight = slot.bodyWeight,
			bodySize = (slot.bodySize * u).sp,
			titleBodyGap = (slot.gap * u).dp,
			offsetX = (slot.dx * u).dp,
			offsetY = (slot.dy * u).dp,
			rotation = slot.rot,
			// A dragged card lifts above its siblings so the revealed info
			// isn't occluded; rest z-order is the authored stacking.
			modifier = Modifier
				.zIndex(if (drag.value != 0f) 1f else 0f)
				.offset { androidx.compose.ui.unit.IntOffset(0, drag.value.roundToInt()) },
		)
	}
	if (interactive) {
		// One deck-level gesture: per-card pointerInput hit-tests the
		// UNROTATED layout box (the modifier sits before the rotation), so
		// overlapping tilted cards grab wrong touches. Pick the card here
		// with a rotation-aware point-in-card test, topmost first.
		val density = androidx.compose.ui.platform.LocalDensity.current
		val uPx = with(density) { (1f * u).dp.toPx() }
		val active = remember { intArrayOf(-1) }
		Box(
			modifier = Modifier
				.matchParentSize()
				.pointerInput(uPx) {
					detectVerticalDragGestures(
						onDragStart = { pos ->
							active[0] = -1
							for (i in slots.indices.reversed()) {
								val slot = slots[i]
								val cx = size.width / 2f + slot.dx * uPx
								val cy = size.height / 2f + slot.dy * uPx + drags[i].value
								val rad = Math.toRadians(-slot.rot.toDouble())
								val dxp = pos.x - cx
								val dyp = pos.y - cy
								val lx = dxp * Math.cos(rad).toFloat() + dyp * Math.sin(rad).toFloat()
								val ly = -dxp * Math.sin(rad).toFloat() + dyp * Math.cos(rad).toFloat()
							if (Math.abs(lx) <= 236.86f * uPx / 2f && Math.abs(ly) <= 278.45f * uPx / 2f) {
									active[0] = i
									break
								}
							}
						},
						onDragEnd = {
							val i = active[0]
							if (i >= 0) dragScope.launch {
								drags[i].animateTo(0f, androidx.compose.animation.core.tween(300, easing = androidx.compose.animation.core.EaseOut))
							}
							active[0] = -1
						},
						onDragCancel = {
							val i = active[0]
							if (i >= 0) dragScope.launch {
								drags[i].animateTo(0f, androidx.compose.animation.core.tween(300, easing = androidx.compose.animation.core.EaseOut))
							}
							active[0] = -1
						},
					) { change, dy ->
						val i = active[0]
						if (i >= 0) {
							change.consume()
							val maxUpPx = slots[i].maxUpU * uPx
							dragScope.launch { drags[i].snapTo((drags[i].value + dy).coerceIn(-maxUpPx, 0f)) }
						}
					}
				},
		)
	}
}

/** One deck slot's authored styling + drag clamp (u units). */
private data class DeckSlot(
	val bg: Color,
	val bodyWeight: FontWeight,
	val bodySize: Float,
	val gap: Float,
	val dx: Float,
	val dy: Float,
	val rot: Float,
	val maxUpU: Float,
)

/** One 236.86x278.45 news card of the deck, placed by its rotated-bounds center. */
@Composable
private fun BoxScope.NewsDeckCard(
	bg: Color,
	title: String,
	body: String,
	bodyWeight: FontWeight,
	bodySize: TextUnit,
	titleBodyGap: Dp,
	offsetX: Dp,
	offsetY: Dp,
	rotation: Float,
	modifier: Modifier = Modifier,
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy(titleBodyGap),
		modifier = modifier
			.align(Alignment.Center)
			.offset(x = offsetX, y = offsetY)
			.graphicsLayer { rotationZ = rotation }
			.size((236.86 * u).dp, (278.45 * u).dp)
			.clip(RoundedCornerShape((6.79 * u).dp))
			.background(bg)
			.padding(start = (14.43 * u).dp, top = (23.77 * u).dp),
	) {
		Text(
			text = title,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Medium, fontSize = (16 * u).sp),
			color = Home.CardInk,
			modifier = Modifier.width((202.9 * u).dp),
		)
		Text(
			text = body,
			style = TextStyle(fontFamily = Geist, fontWeight = bodyWeight, fontSize = bodySize),
			color = Home.CardInk,
			modifier = Modifier.width((189.31 * u).dp),
		)
	}
}

/** "Why this matters to you" — 350x91 card with the glass caution ball art. */
@Composable
private fun WhyThisMattersCard(onOpenMyStak: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		modifier = Modifier
			.fillMaxWidth()
			.heightIn(min = (91 * u).dp)
			// Shaped background, no clip needed — the visible ball never
			// reaches the card edges, only transparent padding overhangs.
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onOpenMyStak,
			)
			.background(Home.CardBg, RoundedCornerShape((8 * u).dp)),
	) {
		// Authored (1:1043/1:1044): the 105x105 image box sits at (3, -7) with
		// the source mapped 1:1 (no crop) - the ball itself stays inside the
		// card; only the box's transparent padding overhangs. unbounded, or the
		// card's 91 height clamps the box and Fit shrinks the ball to 87%.
		Image(
			painter = painterResource(R.drawable.home_caution_glass),
			contentDescription = null,
			modifier = Modifier
				.offset(x = (3 * u).dp, y = (-7 * u).dp)
				.wrapContentSize(align = Alignment.TopStart, unbounded = true)
				.size((105 * u).dp),
		)
		Column(
			verticalArrangement = Arrangement.spacedBy((6 * u).dp),
			modifier = Modifier.align(Alignment.CenterStart).padding(start = (127 * u).dp),
		) {
			Text(
				text = "Why this matters to you",
				// Authored (1:1040): Sora Regular 14 / lh15.
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Text(
				// Backend-served summary of why today's news matters to THIS
				// user (holdings + risk profile); authored demo copy this phase.
				text = WhyThisMattersFeed.body(),
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Light, fontSize = (12 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
				modifier = Modifier.width((198 * u).dp),
			)
		}
	}
}

/** Teal deck banner — 350x116 with the box-and-coins art and Go to Deck chip. */
@Composable
private fun DeckBanner(onOpenDeck: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		modifier = Modifier
			.fillMaxWidth()
			.height((116 * u).dp)
			.clip(RoundedCornerShape((8 * u).dp))
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onOpenDeck,
			)
			.background(Home.Teal),
	) {
		// The illustration zone of the frame (box + coins + shadow), cropped
		// from the banner render so its pose is exact; the teal it carries is
		// the same banner fill it sits on.
		Image(
			painter = painterResource(R.drawable.home_banner_illustration),
			contentDescription = null,
			contentScale = ContentScale.Fit,
			// The 1:1191 node's in-banner slice (121.5x116 at x13), baked
			// from the 2x frame render.
			modifier = Modifier.align(Alignment.TopStart).offset(x = (13 * u).dp).size((121.5 * u).dp, (116 * u).dp),
		)
		Column(
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier
				.align(Alignment.CenterStart)
				.padding(start = (184 * u).dp)
				.offset(y = (0.5 * u).dp)
				.width((156 * u).dp),
		) {
			Text(
				text = if (com.stak.demo.data.MyStakHoldings.tickers.isNotEmpty()) "Your next pick is a swipe away" else "Take your first deck to build your taste",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Light, fontSize = (12 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.Black,
			)
			// No clickable of its own: the authored connection is on the whole
				// banner (1:1184), whose tap target includes this chip.
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier
						.size((123 * u).dp, (32 * u).dp)
						.background(StakColors.Bg, RoundedCornerShape((15 * u).dp)),
				) {
				Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((3 * u).dp)) {
					Text(
						text = "Go to Deck",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11.49 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Color.White,
					)
					Image(
						painter = painterResource(R.drawable.ic_arrow_right_small),
						contentDescription = null,
						modifier = Modifier.size((16 * u).dp),
					)
				}
			}
		}
	}
}

/**
 * First-run bottom treatment — scrim fading to bg over its first 98.7px
 * (43.68% of the frame's 226px overlay) + the frosted "See Todays Pick"
 * pill 105px below the overlay's top edge (1:958: overlay y629, pill y734).
 */
@Composable
private fun FirstRunOverlay(onSeeTodaysPick: () -> Unit, modifier: Modifier = Modifier) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(modifier = modifier.fillMaxWidth()) {
		// The scrim swallows every touch (product audit, 2026-09-05: an upward
		// drag that started on the dimmed deck banner beneath it opened the
		// deck and ended the first run). The pill below is a child, so it
		// still receives its own taps.
		Column(
			modifier = Modifier
				.matchParentSize()
				.pointerInput(Unit) {
					awaitEachGesture {
						do {
							val event = awaitPointerEvent()
							event.changes.forEach { it.consume() }
						} while (event.changes.any { it.pressed })
					}
				},
		) {
			Box(
				modifier = Modifier
					.fillMaxWidth()
					.height((98.7 * u).dp)
					.background(Brush.verticalGradient(0f to Color(0x000A1020), 1f to StakColors.Bg)),
			)
			Box(modifier = Modifier.fillMaxWidth().weight(1f).background(StakColors.Bg))
		}
		// Anchored to the content geometry like the scrim above it: the
		// overlay starts 41 above the deck banner, the pill 105 below that. On
		// the 844 frame this equals "70 above the screen edge"; on a taller
		// screen the pill stays with the banner it belongs to instead of
		// drifting down with the bottom edge (StakTest, 2026-09-05: it sat 5.8
		// low against the 2x export of 1:958).
		Box(
			contentAlignment = Alignment.Center,
			modifier = Modifier
				.align(Alignment.TopCenter)
				.padding(top = (105 * u).dp)
				.size((136 * u).dp, (51 * u).dp)
				.clip(RoundedCornerShape(50))
				// The authored pill (1:1081) is a Figma glass stack - a 1% white
				// fill over backdrop blurs plus three blurred gradient strokes
				// (LINEAR_DODGE/MULTIPLY, 0.94 inside). Matched to its RENDER in
				// the 2x export of 1:958 (2026-09-05): fill = bg + (11,12,15), a
				// cool-tinted 8% wash; the rim glows only on the two caps (left
				// 0.57, right 0.49 white, the cap is 19% of the width) and holds
				// 0.21 along the straight top and bottom runs - a flat 40% rim read
				// 122 everywhere vs the frame's 77-154.
				.background(Color(0x15C8D7FF))
				.border(
					(0.94 * u).dp,
					Brush.horizontalGradient(0f to Color(0x91FFFFFF), 0.19f to Color(0x36FFFFFF), 0.81f to Color(0x36FFFFFF), 1f to Color(0x7DFFFFFF)),
					RoundedCornerShape(50),
				)
				.clickable(
					interactionSource = remember { MutableInteractionSource() },
					indication = com.stak.demo.ui.theme.PressDim,
					onClick = onSeeTodaysPick,
				),
		) {
			Text(
				// user, 2026-09-04: grammar fixed, frame typo not copied.
				text = "See Today’s Pick",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
				color = Color.White,
				// 1:1083/1:1093: the label box sits at pill centre +0.5 with a
				// 7.524/5.643 top/bottom padding split, so its cap box rests 1.44
				// below centre (render: caps at 128-136 in the 105-156 pill) -
				// exact-design audit 2026-09-04.
				modifier = Modifier.offset(y = (1.44 * u).dp),
			)
		}
	}
}

/**
 * The Market Mood gauge, drawn from the AUTHORED SVG primitives of
 * 1:1159 (Group 314): ring center (28.4509, 28.4509), centerline
 * r24.8946, stroke 7.1127 in the 56.9018x28.8371 canvas; three
 * 60-degree segments (green 0x61A57F 180..120, neutral 0xD8CFCF
 * 120..60, red 0xDE4E71 60..0); the needle is the exact authored
 * path - tip (48.8472, 16.37), base (28.0396, 28.2577) /
 * (26.7526, 25.6491) - with the pivot blob at (27.8686, 26.7203)
 * r1.5806. Rest = the authored pose verbatim (axis 26.27deg from the
 * blob); live values rotate the needle group about the blob center.
 */
@Composable
internal fun MarketMoodGauge(u: Float) {
	// Shared with the News mood row (Codex audit 2026-09-04), which passes a
	// scaled unit so the compact 40.97x20.76 gauge is this same drawing.
	// Starts at the design's default pose; moves to the live worldwide
	// reading once it arrives (user's call, 2026-08-21).
	val sweep = androidx.compose.runtime.remember { androidx.compose.animation.core.Animatable(MarketMoodFeed.DEMO_ANGLE_DEG) }
	androidx.compose.runtime.LaunchedEffect(Unit) { MarketMoodFeed.refresh() }
	val live = MarketMoodFeed.score
	val moodAngleDeg = if (live != null) MarketMoodFeed.angleFor(live) else MarketMoodFeed.DEMO_ANGLE_DEG
	androidx.compose.runtime.LaunchedEffect(moodAngleDeg) {
		sweep.animateTo(moodAngleDeg, androidx.compose.animation.core.tween(900, easing = androidx.compose.animation.core.EaseOut))
	}
	val idle = androidx.compose.animation.core.rememberInfiniteTransition(label = "gaugeIdle")
	val wobble by idle.animateFloat(
		initialValue = -0.8f,
		targetValue = 0.8f,
		animationSpec = androidx.compose.animation.core.infiniteRepeatable<Float>(
			animation = androidx.compose.animation.core.tween(2400, easing = androidx.compose.animation.core.EaseInOutSine),
			repeatMode = androidx.compose.animation.core.RepeatMode.Reverse,
		),
		label = "gaugeWobble",
	)
	androidx.compose.foundation.Canvas(modifier = Modifier.size((56.9018 * u).dp, (28.8371 * u).dp)) {
		val k = size.width / 56.9018f          // canvas px per authored unit
		val cx = 28.4509f * k
		val cy = 28.4509f * k
		val rc = 24.8946f * k
		val stroke = 7.1127f * k
		val rect = androidx.compose.ui.geometry.Rect(cx - rc, cy - rc, cx + rc, cy + rc)
		for ((start, color) in listOf(
			180f to Color(0xFF61A57F),
			240f to Color(0xFFD8CFCF),
			300f to Color(0xFFDE4E71),
		)) {
			drawArc(
				color = color,
				startAngle = start,
				sweepAngle = 60f,
				useCenter = false,
				topLeft = rect.topLeft,
				size = rect.size,
				style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke),
			)
		}
		// Needle - the exact authored path, rotated about the authored
		// pivot blob when the value departs the rest pose.
		val pivot = androidx.compose.ui.geometry.Offset(27.8686f * k, 26.7203f * k)
		val needle = androidx.compose.ui.graphics.Path().apply {
			moveTo(48.8472f * k, 16.37f * k)
			lineTo(28.0396f * k, 28.2577f * k)
			lineTo(26.7526f * k, 25.6491f * k)
			close()
		}
		val rotationCw = AUTHORED_AXIS_DEG - (sweep.value + wobble)
		withTransform({ rotate(rotationCw, pivot) }) {
			drawPath(needle, Color.White)
			drawCircle(color = Color.White, radius = 1.5806f * k, center = pivot)
		}
	}
}

/** Authored needle axis (blob center -> tip) in math degrees. */
private const val AUTHORED_AXIS_DEG = 26.27f
