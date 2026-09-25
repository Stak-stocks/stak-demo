package com.stak.demo.ui.news

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.fractionalSpacedBy
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.scaleIn
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Cast
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PictureInPictureAlt
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.SignalCellularAlt
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Subtitles
import androidx.compose.material.icons.outlined.PictureInPictureAlt
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.runtime.toMutableStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.text.CueGroup
import androidx.media3.exoplayer.ExoPlayer
import com.stak.demo.R
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlin.math.roundToInt
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** The CHINEDU CTA gradient (Add to STAK / View in My STAK). */
private val CtaGradient = Brush.verticalGradient(
	0.0889f to Color(0xFFA6E4F7),
	0.3919f to Color(0xFF5DA8BF),
	0.7255f to Color(0xFF3C98B4),
	1f to Color(0xFF3C98B4),
)
private val CtaBorder = Brush.verticalGradient(
	0f to Color(0xA1659EAD),
	1f to Color(0x6E16363F),
)

/**
 * Swipe direction (user, 2026-08-31, "social media vibes"): finger LEFT
 * -> NEXT story, finger RIGHT -> PREVIOUS - the standard pager convention.
 * THE ONE PLACE TO FLIP IT: set this to true. HorizontalPager's
 * reverseLayout then lays the pages out right-to-left, so page indices,
 * PAGE_ORDER, initialPage and currentPage all keep their meaning and
 * nothing else has to change.
 */
private const val REVERSE_SWIPE = false


/**
 * 03 · News — the article page in its three frames: "News detail page
 * unsaved" (1:1495), "News detail · Save success" (101:1005, the bottom
 * sheet over a scrim) and "News detail page saved" (1:1359 — hero toast,
 * View-in-My-STAK row on the stock card, Apple + Tech tags).
 *
 * Social-media paging (user, 2026-08-31: "swipe to get the previous/next
 * news"): the whole article body is ONE page of a HorizontalPager over
 * the feed's canonical order ([NewsArticleFeed.PAGE_ORDER]) and the
 * screen opens on the tapped story. The top bar stays fixed above the
 * pager; Share follows the page under the finger. Every page owns its
 * own hero player, mini window and sheets ([NewsArticlePage]); the
 * saved / save-success state is keyed per story, and the success sheet
 * itself renders at the screen root because its authored scrim
 * (101:1168) covers the top bar too - inside a page it could only dim
 * the area below the bar.
 */
@Composable
fun NewsDetailScreen(articleId: String = NewsArticleFeed.APPLE, onBack: () -> Unit, onViewInMyStak: () -> Unit = {}, onOpenArticle: (String) -> Unit = {}) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val pages = NewsArticleFeed.PAGE_ORDER
	val pagerState = androidx.compose.foundation.pager.rememberPagerState(
		initialPage = pages.indexOf(articleId).coerceAtLeast(0),
	) { pages.size }
	// The story under the finger (currentPage flips at the halfway point
	// of a drag) - the served article for the tapped story on open
	// (user, 2026-08-25); the Apple article is the authored one and
	// renders frame-exact.
	val current = NewsArticleFeed.article(pages[pagerState.currentPage])
	// Saved / save-success state is PER STORY, keyed by id, so it never
	// bleeds between pages and survives a page being disposed off-screen.
	// Product audit (2026-09-05): saves live in NewsSaves, shared and persisted.
	val savedIds = NewsSaves.ids
	var showSuccess by rememberSaveable { mutableStateOf(false) }
	// The story whose sheet is up: it stays valid through the dissolve-out,
	// and if the user swipes on while the sheet is up the save still lands
	// on the story that opened it.
	var successId by rememberSaveable { mutableStateOf<String?>(null) }
	val successArticle = successId?.let { NewsArticleFeed.article(it) } ?: current
	fun save(target: NewsArticleFeed.Article) {
		NewsSaves.add(target.id)
		target.ticker?.let { com.stak.demo.ui.MyStakHoldings.add(it) }
	}

	// The hero's fullscreen player renders here, over everything in this
	// screen (edge to edge - the activity window, not a Dialog).
	val fullscreenSlot = remember { androidx.compose.runtime.mutableStateOf<Pair<HeroPlayer, ExoPlayer>?>(null) }
	androidx.compose.runtime.CompositionLocalProvider(LocalFullscreenSlot provides fullscreenSlot) {
	Box(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Column(modifier = Modifier.fillMaxSize()) {
			// Fixed top bar — back circle + share.
			Row(
				verticalAlignment = Alignment.CenterVertically,
				modifier = Modifier
					.fillMaxWidth()
					.background(StakColors.Bg)
					.statusBarsPadding()
					.padding(start = (16 * u).dp, end = (18 * u).dp, top = (10 * u).dp, bottom = (12 * u).dp),
			) {
				AuthBackCircle(onClick = onBack)
				Spacer(modifier = Modifier.weight(1f))
				// Designer's call (2026-08-22): share creates a link that takes
				// a co-app user to the shared info - the system share sheet.
				// It shares the CURRENT page's story.
				val context = androidx.compose.ui.platform.LocalContext.current
				Image(
					painter = painterResource(R.drawable.ic_news_share),
					contentDescription = "Share",
					modifier = Modifier
						.size((24 * u).dp)
						.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = com.stak.demo.ui.theme.PressDim,
						) {
							val send = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
								type = "text/plain"
								putExtra(android.content.Intent.EXTRA_TEXT, current.shareText)
							}
							context.startActivity(android.content.Intent.createChooser(send, "Share article"))
						},
				)
			}
			// Instagram/TikTok-style paging: one story per page, snapping.
			// beyondViewportPageCount = 0 keeps only the visible page (plus
			// the neighbour the finger is revealing mid-drag) composed and
			// disposes every other page - which is what releases a swiped-
			// away story's player. The pager takes only horizontal drags;
			// each page keeps its own vertical scroll.
			androidx.compose.foundation.pager.HorizontalPager(
				state = pagerState,
				beyondViewportPageCount = 0,
				reverseLayout = REVERSE_SWIPE,
				key = { pages[it] },
				modifier = Modifier
					.weight(1f)
					.fillMaxWidth(),
			) { page ->
				val article = NewsArticleFeed.article(pages[page])
				key(article.id) {
					NewsArticlePage(
						active = pagerState.settledPage == page,
						article = article,
						saved = article.id in savedIds,
						onSave = { save(article) },
						// The save is committed on the tap (Codex review, PR #166); the sheet's paths only navigate.
						onAddToStak = { save(article); successId = article.id; showSuccess = true },
						onOpenArticle = onOpenArticle,
					)
				}
			}
		}
		// Authored (101:1005 Motion): Back -> News detail page saved,
		// DISSOLVE 300 EaseOut; View in My STAK -> My STAK Overview,
		// Push Right 300 (hoisted to the nav). Entry is authored Smart
		// Animate 350 (Codex parity audit 2026-09-04).
		AnimatedVisibility(
			visible = showSuccess,
			// Designer's call (2026-08-22): the sheet appears with a
			// SCALE-IN animation; it still dissolves out per 101:1005.
			enter = scaleIn(initialScale = 0.92f, animationSpec = tween(350, easing = EaseOut)) +
				fadeIn(tween(350, easing = EaseOut)),
			exit = fadeOut(tween(300, easing = EaseOut)),
		) {
			// System Back dismisses the sheet like the scrim does (Codex review, PR #166).
			androidx.activity.compose.BackHandler(enabled = showSuccess) { showSuccess = false }
			SaveSuccessOverlay(
				facts = NewsArticleFeed.stockFacts(successArticle.ticker ?: "AAPL"),
				onViewInMyStak = { save(successArticle); onViewInMyStak() },
				onDismiss = { showSuccess = false; save(successArticle) },
			)
		}
		fullscreenSlot.value?.let { (fsPlayer, fsExo) -> FullscreenPlayer(player = fsPlayer, exo = fsExo) }
	}
	}
}

/**
 * ONE story's page: the scrolling article (hero + body) plus everything
 * that belongs to that story's clip - its pre-buffered hero player, the
 * in-app PiP mini window, the fullscreen dialog and the "..." sheet
 * (both composed under the hero). The player is created when the page
 * is composed and released by [rememberHeroPlayer]'s DisposableEffect
 * when the page leaves composition, so swiping to a neighbour (the
 * pager disposes the page that left) stops the clip AND its mini window
 * / fullscreen together - no audio from an off-screen page. A page never
 * autoplays: it composes at rest (poster + glyph, buffering silently)
 * until its own play tap. The page content is exactly the article
 * content it always was; only the container changed.
 */
@Composable
private fun NewsArticlePage(
	active: Boolean,
	article: NewsArticleFeed.Article,
	saved: Boolean,
	onSave: () -> Unit,
	onAddToStak: () -> Unit,
	onOpenArticle: (String) -> Unit,
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	// The hero clip's player lives at page level: the in-app PiP window
	// floats over the WHOLE article (reference image 3), not just the hero.
	// Only the SETTLED page owns a player (user, 2026-09-01 "sluggish"):
	// a neighbour composed mid-drag must not prepare/buffer a second
	// ExoPlayer and fight the playing clip for network and decoder.
	val hero = rememberHeroPlayer(article.media, enabled = active)

	Box(modifier = Modifier.fillMaxSize()) {
		Column(
			horizontalAlignment = Alignment.CenterHorizontally,
			modifier = Modifier
				.fillMaxSize()
				// The page owns vertical drags; the pager only takes horizontal ones.
				.verticalScroll(rememberScrollState()),
		) {
			HeroImage(media = article.media, category = article.category, saved = saved, player = hero, onBookmark = onSave)
			Column(
				// Fractional gaps: seventeen 15u gaps rounded to 42 px each drifted
				// the tail 2.8u below the frame (StakTest, 2026-09-05).
				verticalArrangement = fractionalSpacedBy((15 * u).dp),
				modifier = Modifier
					.fillMaxWidth()
					.padding(horizontal = (20 * u).dp)
					// Authored Content pad 22/28 (1:1525). The old 26 compensated the
					// trimmed headline box; with FIGMA_LINE_BOX the cap-top lands at
					// the frame's 344 from the authored 22 (StakTest, 2026-09-04).
					.padding(top = (22 * u).dp, bottom = (28 * u).dp),
			) {
				Text(
					text = article.headline,
					// RENDER-measured: the frame draws the headline ~800 device px
					// wide (≈20sp), not the metadata's 24 — lh32 box stands.
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp, lineHeight = (32 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Text(
					text = article.subtitle,
					// 14.3: at 14 Compose pulls "in" up to line 1; the frame
					// breaks after "lineup" (authored 3-line shape, lh22).
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (14.3 * u).sp, lineHeight = (22 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = News.Muted,
					// The column's 15 alone: the headline box is the authored 64 now
					// (FIGMA_LINE_BOX), so the old +5 ink compensation is gone.
				)
				Byline(source = article.source, meta = article.sourceMeta)
				if (!saved) {
					AddToStakButton(onClick = onAddToStak)
				}
				Divider()
				// ONE template for every story (user, 2026-08-25: the Apple
				// article is the section's PLACEHOLDER - each block renders
				// per story from served data; stock blocks appear whenever
				// the story has a related ticker).
				article.ticker?.let { StockCard(saved = saved, ticker = it, facts = NewsArticleFeed.stockFacts(it)) }
				if (article.gist.isNotEmpty()) GistCard(bullets = article.gist)
				article.paragraphs.getOrNull(0)?.let { Paragraph(it, size = 15.sp, line = 24.sp) }
				article.paragraphs.getOrNull(1)?.let { Paragraph(it) }
				article.pullQuote?.let { PullQuote(it) }
				article.explainer?.let { NewToThisCard(it) }
				article.paragraphs.drop(2).forEach { Paragraph(it) }
				// The Source row opens where the story came from (user, 2026-09-08).
				SourceRow(link = article.media.sourceLinkOrNull())
				article.ticker?.let { KeyStatsCard(facts = NewsArticleFeed.stockFacts(it)) }
				Divider()
				Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
					article.tags.getOrNull(0)?.let { ArticleTag(it) }
					if (saved) {
						article.tags.getOrNull(1)?.let { ArticleTag(it) }
					}
				}
				ReadNext(currentId = article.id, onOpen = onOpenArticle)
			}
		}
		// Reference image 3: the clip popped out of the hero floats top-left
		// over the scrolling article (the OS PiP window, when the user has
		// left the app, takes over the surface instead - MainActivity's view).
		// It belongs to THIS page: it swipes away, and is released, with it.
		if (hero.pip && !NewsPip.inPip) {
			MiniPlayer(player = hero, u = u)
		}
	}
}

/** 360x208 r10 hero — phone art, Tech & AI toast, play badge, bookmark/saved chip. */
@Composable
// CONTRACT (user, 2026-08-25): this screen is the News info page TEMPLATE.
// The design authors exactly ONE article (1:1495, the Apple foldable
// story), so every authored news tap lands here in the demo. In
// production the backend serves each story's own headline, subtitle,
// body and media into this page - same slot pattern as NewsMedia.
private fun HeroImage(media: NewsMedia, category: String, saved: Boolean, player: HeroPlayer, onBookmark: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	// The hero is a media slot: poster + play glyph at rest (frame-exact),
	// the served video playing IN PLACE once tapped (user, 2026-08-23).
	// The cached ExoPlayer, its state and the in-app PiP window are the
	// screen-level HeroPlayer; `playing` = the hero is in video mode.
	val playing = player.active
	// The fallback (YouTube embed / uncached) player's pause toggle: tap the
	// running clip to pause, tap the glyph to resume (user, 2026-08-30).
	var paused by remember { mutableStateOf(false) }
	val heroCtx = LocalContext.current
	val exo = player.exo
	Box(
		modifier = Modifier
			.padding(horizontal = (15 * u).dp)
			.fillMaxWidth()
			.height((208 * u).dp)
			// Authored radius 10 (1:1517 Inspect) - the earlier 24 was wrong.
			.clip(RoundedCornerShape((10 * u).dp))
			.background(Color(0xFFC4C4C4)),
	) {
		val video = media as? NewsMedia.Video
		if (playing && video != null) {
			// A failed OR FINISHED stream returns to the poster + glyph
			// instead of stranding a frame (user, 2026-08-25/26).
			if (exo != null) {
				// Direct clip: the pre-buffered cached player with the
				// reference controller (user, 2026-08-31 video_app shots).
				if (NewsPip.inPip || player.pip) {
					// Reference image 3: while the clip floats (the in-app
					// mini player, or the OS window once the user left the
					// app) the hero holds the PiP placeholder; tapping it
					// brings the video back into the hero.
					PipPlaceholder(u = u, modifier = Modifier.matchParentSize()) { player.pip = false }
				} else if (!player.fullscreen) {
					AndroidView(
						modifier = Modifier.matchParentSize(),
						// The clip fills the hero at ITS aspect ratio, cropped
						// like the frame's hero image - a raw TextureView
						// stretched it to the 350x208 box (user, 2026-09-05).
						factory = { c -> VideoSurfaceHost(c, exo, zoom = true, cornerRadiusPx = 10 * u * c.resources.displayMetrics.density) },
						// Per-view clear (never clearVideoSurface): the mini
						// player, the OS PiP overlay or the fullscreen view may
						// already own the surface.
						onRelease = { v -> v.release() },
					)
					HeroControls(player = player, u = u, modifier = Modifier.matchParentSize())
				}
				// Fullscreen renders in the SCREEN's overlay slot (over the whole
				// activity window), not a Dialog: Compose sizes a dialog window
				// to the display minus bars and cutout, so a Dialog can never be
				// edge to edge (StakTest, 2026-09-05: 70px article strips).
				val fullscreenSlot = LocalFullscreenSlot.current
				LaunchedEffect(player.fullscreen) { fullscreenSlot.value = if (player.fullscreen) player to exo else null }
				DisposableEffect(player) { onDispose { if (fullscreenSlot.value?.first === player) fullscreenSlot.value = null } }
				if (!player.firstFrame && !NewsPip.inPip && !player.pip) {
					// Poster holds until onRenderedFirstFrame.
					val posterRes2 = video.posterRes
					if (posterRes2 != null) {
						Image(
							painter = painterResource(posterRes2),
							contentDescription = null,
							contentScale = ContentScale.Crop,
							modifier = Modifier
								.align(Alignment.Center)
								.offset(x = (-0.5 * u).dp, y = (16.59 * u).dp)
								.requiredSize((407 * u).dp, (271.18 * u).dp),
						)
					} else if (video.posterUrl != null) {
						coil.compose.AsyncImage(
							model = video.posterUrl,
							contentDescription = null,
							contentScale = ContentScale.Crop,
							modifier = Modifier.matchParentSize(),
						)
					}
				}
			} else {
				NewsVideoPlayer(
					onLoaded = { player.firstFrame = true },
					video = video,
					paused = paused,
					modifier = Modifier
						.matchParentSize()
						.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = null,
						) { paused = true },
					onDone = { player.active = false; paused = false },
				)
			}
			if (exo == null && paused) {
				Image(
					painter = painterResource(R.drawable.ic_hero_play),
					contentDescription = "Play",
					modifier = Modifier
						.align(Alignment.Center)
						// 1:1522: the polygon sits 8.64%/25% inset in its 81 box, so the rotated
						// glyph's centre is 6.63 right of the box centre - exact-design audit 2026-09-04.
						.offset(x = (6.13 * u).dp, y = (12.5 * u).dp)
						.rotate(90f)
						.size((59.92 * u).dp, (53.75 * u).dp)
						.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = null,
						) { paused = false },
				)
			}
		} else {
			val posterRes = when (media) {
				is NewsMedia.Image -> media.posterRes
				is NewsMedia.Video -> media.posterRes
			}
			// The authored image is oversized (407x271.18 in the 360x208 card,
			// top-left at -24,-15) — requiredSize so the card's constraints
			// don't shrink it back to 360x208 and letterbox the art.
			val posterUrl = when (media) {
				is NewsMedia.Image -> media.url
				is NewsMedia.Video -> media.posterUrl
			}
			if (posterRes != null) {
				Image(
					painter = painterResource(posterRes),
					contentDescription = null,
					contentScale = ContentScale.Crop,
					modifier = Modifier
						.align(Alignment.Center)
						.offset(x = (-0.5 * u).dp, y = (16.59 * u).dp)
						.requiredSize((407 * u).dp, (271.18 * u).dp),
				)
			} else if (posterUrl != null) {
				// Served poster/image: fills the authored box.
				coil.compose.AsyncImage(
					model = posterUrl,
					contentDescription = null,
					contentScale = ContentScale.Crop,
					modifier = Modifier.matchParentSize(),
				)
			}
			if (video != null) {
				Image(
					painter = painterResource(R.drawable.ic_hero_play),
					contentDescription = "Play",
					modifier = Modifier
						.align(Alignment.Center)
						// 1:1522: the polygon sits 8.64%/25% inset in its 81 box, so the rotated
						// glyph's centre is 6.63 right of the box centre - exact-design audit 2026-09-04.
						.offset(x = (6.13 * u).dp, y = (12.5 * u).dp)
						.rotate(90f)
						.size((59.92 * u).dp, (53.75 * u).dp)
						.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = null,
						) { player.start(); paused = false },
				)
			}
			// An image with an embedded link (served contract): tapping the
			// hero opens the story's own dynamic link.
			val imageLink = (media as? NewsMedia.Image)?.sourceLink
			if (imageLink != null) {
				Box(
					modifier = Modifier
						.matchParentSize()
						.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = null,
						) {
							runCatching {
								heroCtx.startActivity(
									android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(imageLink)),
								)
							}
						},
				)
			}
		}
		// The category chip is the REST state's (frame-authored); the playing
		// canvas stays clean for the controls (user, 2026-08-30 sleek bar).
		if (!(playing && video != null)) {
			Box(
				modifier = Modifier
					.align(Alignment.BottomStart)
					.padding(start = (9 * u).dp, bottom = (10 * u).dp)
					// Authored r7.875 (1:1519) - exact-design audit 2026-09-04.
					.clip(RoundedCornerShape((7.875 * u).dp))
					.background(Color(0x40242B3D))
					.padding(horizontal = (7 * u).dp, vertical = (5 * u).dp),
			) {
				Text(
					text = category,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
			}
		}
		// The bookmark/saved chip is also REST-state chrome: while playing,
		// the hero's top-right corner belongs to the player's PiP button
		// (2026-08-31: the chip sat OVER it and swallowed the tap).
		if (playing && video != null) {
			// player chrome owns the canvas
		} else if (saved) {
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((4 * u).dp),
				modifier = Modifier
					.align(Alignment.TopEnd)
					.padding(top = (8 * u).dp, end = (7 * u).dp)
					// Authored r7.875 (1:1386) - exact-design audit 2026-09-04.
					.clip(RoundedCornerShape((7.875 * u).dp))
					.background(Color(0x40242B3D))
					// Authored toast is 21 tall (1:1386): 13 text + 4/4 pads.
					.padding(horizontal = (7 * u).dp, vertical = (4 * u).dp),
			) {
				Image(
					painter = painterResource(R.drawable.ic_saved_bookmark),
					contentDescription = null,
					modifier = Modifier.size((11 * u).dp),
				)
				Text(
					text = "Saved to My STAK",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp),
					color = Color.White,
				)
			}
		} else {
			// Authored motion (1:1495): the hero bookmark -> News detail page
			// saved, Instant - a direct save that skips the success sheet.
			Image(
				painter = painterResource(R.drawable.ic_hero_bookmark),
				contentDescription = "Save",
				modifier = Modifier
					.align(Alignment.TopEnd)
					// 1:1523 sits at x 330.77 in the 360 hero: 11.44 from the right - exact-design audit 2026-09-04.
					.padding(top = (8 * u).dp, end = (11.44 * u).dp)
					.size((17.79 * u).dp, (18.27 * u).dp)
					.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
						onClick = onBookmark,
					),
			)
		}
	}
}

/** Templated per story - the authored sample is "Bloomberg · Jul 2 · 3 min read". */
@Composable
private fun Byline(source: String, meta: String) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((8 * u).dp),
		modifier = Modifier.padding(vertical = (2 * u).dp),
	) {
		Box(
			contentAlignment = Alignment.Center,
			modifier = Modifier.size((24 * u).dp).background(News.ChipBg, CircleShape),
		) {
			Text(
				text = source.take(1),
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color(0xFF9EADC7),
			)
		}
		Row(horizontalArrangement = Arrangement.spacedBy((5 * u).dp), verticalAlignment = Alignment.CenterVertically) {
			Text(
				text = source,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Text(
				text = meta,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = News.Faint,
			)
		}
	}
}

/** 150x52 gradient CTA with the plus mark. */
@Composable
private fun AddToStakButton(onClick: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((8 * u).dp, Alignment.CenterHorizontally),
		modifier = Modifier
			.size((150 * u).dp, (52 * u).dp)
			.background(CtaGradient, RoundedCornerShape((6 * u).dp))
			.border((0.36 * u).dp, CtaBorder, RoundedCornerShape((6 * u).dp))
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			),
	) {
		Text(
			text = "Add to STAK",
			// Authored lh 20.69 (1:1535) - exact-design audit 2026-09-04.
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp, lineHeight = (20.69 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		Image(
			painter = painterResource(R.drawable.ic_plus_small),
			contentDescription = null,
			modifier = Modifier.size((14 * u).dp),
		)
	}
}

@Composable
private fun Divider() {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(modifier = Modifier.fillMaxWidth().height((1 * u).dp).background(News.Divider))
}

/**
 * The story's stock card - EVERY article renders it with its own
 * stock's served facts (user, 2026-08-25: "use the apple features...
 * replace the placeholder"). The sparkline stays the authored demo
 * asset until the backend serves chart data.
 */
@Composable
private fun StockCard(saved: Boolean, ticker: String, facts: NewsArticleFeed.StockFacts) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((13 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((16 * u).dp))
			.background(News.CardBg)
			.padding(start = (16 * u).dp, end = (16 * u).dp, top = (16 * u).dp, bottom = (14 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier.size((44 * u).dp).background(News.ChipBg, CircleShape),
			) {
				Text(
					text = facts.name.take(1),
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp, lineHeight = (23 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color(0xFF9EADC7),
				)
			}
			Spacer(modifier = Modifier.width((12 * u).dp))
			Column(verticalArrangement = Arrangement.spacedBy((3 * u).dp)) {
				Text(
					text = facts.name,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Text(
					text = ticker,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = News.Muted,
				)
			}
			Spacer(modifier = Modifier.weight(1f))
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((5 * u).dp),
				modifier = Modifier
					.clip(RoundedCornerShape((6 * u).dp))
					.background(Color(0x403E4958))
					.padding(horizontal = (10 * u).dp, vertical = (4 * u).dp),
			) {
				Text(
					text = "Daily",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (8 * u).sp, lineHeight = (10 * u).sp, letterSpacing = (0.4 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Image(
					painter = painterResource(R.drawable.ic_daily_chevron),
					contentDescription = null,
					modifier = Modifier.size((6.53 * u).dp, (3.56 * u).dp),
				)
			}
		}
		Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.fillMaxWidth()) {
			Column(verticalArrangement = Arrangement.spacedBy((3 * u).dp)) {
				Text(
					text = facts.price,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Text(
					text = facts.change,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					// The app's authored up/down pair (green here, the
					// My STAK / Simulate red for down moves).
					color = if (facts.up) News.Green else Color(0xFFFF5A6A),
				)
			}
			Spacer(modifier = Modifier.weight(1f))
			Image(
				// The chart must agree with the move (user, 2026-08-25:
				// "showing red then the graph is green") - the down variant
				// is the authored line flipped + recolored to the app red.
				painter = painterResource(if (facts.up) R.drawable.news_sparkline else R.drawable.news_sparkline_down),
				contentDescription = null,
				modifier = Modifier.size((110 * u).dp, (40 * u).dp),
			)
		}
		if (saved) {
			Box(modifier = Modifier.fillMaxWidth().height((1 * u).dp).background(News.Divider))
			// Authored CTA row carries a 2 vertical pad (1:1420) - exact-design audit 2026-09-04.
			Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = (2 * u).dp)) {
				Text(
					text = "View $ticker in My STAK",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					// 1:1359: the link reads #AEAEAE, not teal (Codex parity audit 2026-09-04).
					color = Color(0xFFAEAEAE),
				)
				Spacer(modifier = Modifier.weight(1f))
				// The rotated chevron occupies its authored 3.75x6.875 box (1:1422), so its
				// visual edge meets the card's padding - exact-design audit 2026-09-04.
				Box(contentAlignment = Alignment.Center, modifier = Modifier.size((3.75 * u).dp, (6.875 * u).dp)) {
					Image(
						painter = painterResource(R.drawable.ic_daily_chevron),
						contentDescription = null,
						modifier = Modifier.requiredSize((6.875 * u).dp, (3.75 * u).dp).rotate(-90f),
					)
				}
			}
		}
	}
}

/** "The gist" — sparkle header + three check bullets. */
@Composable
private fun GistCard(bullets: List<String>) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((14 * u).dp))
			.background(News.CardBg)
			.padding((16 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
			Image(painterResource(R.drawable.ic_gist_sparkle), null, modifier = Modifier.size((18 * u).dp))
			Text(
				text = "The gist",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
		}
		bullets.forEach { GistBullet(it) }
	}
}

@Composable
private fun GistBullet(text: String) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
		Image(painterResource(R.drawable.ic_gist_check), null, modifier = Modifier.size((16 * u).dp))
		Text(
			text = text,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Body,
			modifier = Modifier.weight(1f),
		)
	}
}

@Composable
private fun Paragraph(text: String, size: androidx.compose.ui.unit.TextUnit = 14.sp, line: androidx.compose.ui.unit.TextUnit = 23.sp) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Text(
		text = text,
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = size * u, lineHeight = line * u, lineHeightStyle = FIGMA_LINE_BOX),
		color = News.Body,
	)
}

@Composable
private fun PullQuote(text: String) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(
		horizontalArrangement = Arrangement.spacedBy((14 * u).dp),
		modifier = Modifier.fillMaxWidth().padding(start = (2 * u).dp, top = (6 * u).dp, bottom = (6 * u).dp).height(androidx.compose.foundation.layout.IntrinsicSize.Min),
	) {
		Box(
			modifier = Modifier
				.width((3 * u).dp)
				.fillMaxSize()
				.background(News.Teal, RoundedCornerShape((2 * u).dp)),
		)
		Text(
			text = text,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (26 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color(0xFFD3D3DD),
			modifier = Modifier.weight(1f),
		)
	}
}

@Composable
private fun NewToThisCard(body: String) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((9 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((14 * u).dp))
			.background(News.CardBg)
			.padding((16 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
			Image(painterResource(R.drawable.ic_gist_help), null, modifier = Modifier.size((18 * u).dp))
			Text(
				text = "New to this?",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = News.Teal,
			)
		}
		Text(
			text = body,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Body,
		)
	}
}

@Composable
private fun SourceRow(link: String? = null) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val uriHandler = androidx.compose.ui.platform.LocalUriHandler.current
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.width((81 * u).dp)
			// The row - label and the external-link glyph - opens the story's source in
			// the browser (user, 2026-09-08: "take users where the news is gotten from").
			.then(
				if (link != null) Modifier.clickable(
					interactionSource = remember { MutableInteractionSource() },
					indication = com.stak.demo.ui.theme.PressDim,
					onClickLabel = "Open the source",
					onClick = { runCatching { uriHandler.openUri(link) } },
				) else Modifier,
			),
	) {
		Text(
			text = "Source",
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp),
			color = Color.White,
		)
		Spacer(modifier = Modifier.weight(1f))
		Image(painterResource(R.drawable.ic_news_external), if (link != null) "Open the source" else null, modifier = Modifier.size((19 * u).dp))
	}
}

/** The story's own link, whichever media carries it. */
private fun NewsMedia.sourceLinkOrNull(): String? = when (this) {
	is NewsMedia.Image -> sourceLink
	is NewsMedia.Video -> sourceLink
}

@Composable
private fun KeyStatsCard(facts: NewsArticleFeed.StockFacts) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((13 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((14 * u).dp))
			.background(News.CardBg)
			.padding((16 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
			Image(painterResource(R.drawable.ic_gist_info), null, modifier = Modifier.size((18 * u).dp))
			Text(
				text = "Key stats",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
		}
		StatRow("Market cap", facts.marketCap, "P/E ratio", facts.peRatio)
		StatRow("Day range", facts.dayRange, "Volume", facts.volume)
		StatRow("52-wk range", facts.week52, "Div yield", facts.divYield)
	}
}

@Composable
private fun StatRow(l1: String, v1: String, l2: String, v2: String) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(horizontalArrangement = Arrangement.spacedBy((14 * u).dp), modifier = Modifier.fillMaxWidth()) {
		StatCell(l1, v1, modifier = Modifier.width((212 * u).dp))
		StatCell(l2, v2)
	}
}

@Composable
private fun StatCell(label: String, value: String, modifier: Modifier = Modifier) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(verticalArrangement = Arrangement.spacedBy((3 * u).dp), modifier = modifier) {
		Text(
			text = label,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Faint,
		)
		Text(
			text = value,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
	}
}

/** rgba(105,179,202,0.1) r12 tag chip. */
@Composable
private fun ArticleTag(text: String) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		modifier = Modifier
			.clip(RoundedCornerShape((12 * u).dp))
			.background(Color(0x1A69B3CA))
			.padding(horizontal = (11 * u).dp, vertical = (5 * u).dp),
	) {
		Text(
			text = text,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Muted,
		)
	}
}

/**
 * READ NEXT - the authored sample repeats the Tesla row twice as its
 * placeholder; the served rows are two other stories, and each opens
 * its own article (user, 2026-08-25).
 */
@Composable
private fun ReadNext(currentId: String, onOpen: (String) -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth().padding(top = (6 * u).dp)) {
		Text(
			text = "READ NEXT",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, letterSpacing = (0.5 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Muted,
		)
		NewsArticleFeed.readNext(excluding = currentId).forEach { next ->
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
				modifier = Modifier
					.fillMaxWidth()
					.clip(RoundedCornerShape((14 * u).dp))
					.background(News.CardBg)
					.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
						onClick = { onOpen(next.id) },
					)
					.padding((12 * u).dp),
			) {
				next.thumbRes?.let { thumbRes ->
					Image(
						painter = painterResource(thumbRes),
						contentDescription = null,
						contentScale = ContentScale.Crop,
						modifier = Modifier.size((60 * u).dp).clip(RoundedCornerShape((10 * u).dp)),
					)
				}
				Column(verticalArrangement = Arrangement.spacedBy((5 * u).dp), modifier = Modifier.weight(1f)) {
					Text(
						text = "${next.source} · ${next.age}",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = News.Muted,
					)
					Text(
						text = next.headline,
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Color.White,
					)
				}
			}
		}
	}
}

/**
 * Save success — rgba(12,19,32,0.55) scrim + the r24 #181f30 bottom
 * sheet (101:1169). The stock row shows the SAVED stock's served facts
 * (user, 2026-08-25: every article = the full Apple page with the
 * story's own content; the frame's Apple row was placeholder).
 */
@Composable
private fun SaveSuccessOverlay(facts: NewsArticleFeed.StockFacts, onViewInMyStak: () -> Unit, onDismiss: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(modifier = Modifier.fillMaxSize()) {
		Box(
			modifier = Modifier
				.fillMaxSize()
				// Authored scrim rgba(12,19,32,0.55) (101:1168); it has NO
				// prototype connection - tapping it does not dismiss.
				.background(Color(0x8C0C1320)),
		)
		Column(
			horizontalAlignment = Alignment.CenterHorizontally,
			verticalArrangement = Arrangement.spacedBy((14 * u).dp),
			modifier = Modifier
				.align(Alignment.BottomCenter)
				.fillMaxWidth()
				.clip(RoundedCornerShape(topStart = (24 * u).dp, topEnd = (24 * u).dp))
				.background(News.CardBg)
				.padding(horizontal = (20 * u).dp)
				.padding(top = (10 * u).dp)
				// Authored sheet is 388 tall with a 30 bottom pad that INCLUDES
				// the home-indicator zone (101:1169) — no extra system inset.
				.padding(bottom = (30 * u).dp),
		) {
			Box(
				modifier = Modifier
					.padding(bottom = (4 * u).dp)
					.size((40 * u).dp, (4 * u).dp)
					.background(News.Divider, RoundedCornerShape((2 * u).dp)),
			)
			Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((14 * u).dp)) {
				Image(painterResource(R.drawable.ic_sheet_check), null, modifier = Modifier.size((47 * u).dp))
				Text(
					text = "Saved to My STAK",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp),
					color = Color.White,
				)
			}
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((11 * u).dp),
				modifier = Modifier
					.fillMaxWidth()
					.clip(RoundedCornerShape((6 * u).dp))
					.background(Color(0x1A69B3CA))
					.padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
			) {
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier.size((38 * u).dp).background(News.ChipBg, CircleShape),
				) {
					Text(
						text = facts.shortName.take(1),
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp),
						color = Color(0xFF9EADC7),
					)
				}
				Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
					Text(
						text = facts.shortName,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
						color = Color.White,
					)
					Text(
						text = "${facts.price} today",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp),
						color = News.Muted,
					)
				}
				Text(
					// "+4.84% today" -> "▲ 4.84%" (the sheet's authored format).
					text = "${if (facts.up) "▲" else "▼"} ${facts.change.drop(1).removeSuffix(" today")}",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
					color = if (facts.up) News.Green else Color(0xFFFF5A6A),
				)
			}
			Text(
				text = "Watching from today · no money committed",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = News.Body,
				modifier = Modifier.fillMaxWidth(),
			)
			Column(verticalArrangement = Arrangement.spacedBy((16 * u).dp), modifier = Modifier.fillMaxWidth()) {
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier
						.fillMaxWidth()
						.height((52 * u).dp)
						.background(CtaGradient, RoundedCornerShape((6 * u).dp))
						.border((0.36 * u).dp, CtaBorder, RoundedCornerShape((6 * u).dp))
						.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = com.stak.demo.ui.theme.PressDim,
							onClick = onViewInMyStak,
						),
				) {
					Text(
						text = "View in My STAK",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp),
						color = Color.White,
					)
				}
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier
						.fillMaxWidth()
						.height((52 * u).dp)
						.border((0.36 * u).dp, Color(0x54343B4F), RoundedCornerShape((6 * u).dp))
						.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = com.stak.demo.ui.theme.PressDim,
							onClick = onDismiss,
						),
				) {
					Text(
						text = "Back",
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp),
						color = News.Muted,
					)
				}
			}
		}
	}
}

/**
 * Plays the served video inside the hero box: YouTube links through the
 * embeddable player (WebView), any other link through the platform
 * VideoView. Both autoplay once the user tapped the play glyph.
 */
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
private fun NewsVideoPlayer(video: NewsMedia.Video, modifier: Modifier = Modifier, paused: Boolean = false, onDone: () -> Unit = {}, onLoaded: () -> Unit = {}) {
	val embed = video.youTubeEmbedUrl
	if (embed != null) {
		androidx.compose.ui.viewinterop.AndroidView(
			modifier = modifier,
			factory = { ctx ->
				android.webkit.WebView(ctx).apply {
					settings.javaScriptEnabled = true
					settings.mediaPlaybackRequiresUserGesture = false
					settings.domStorageEnabled = true
					webChromeClient = android.webkit.WebChromeClient()
					webViewClient = object : android.webkit.WebViewClient() {
						override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
							android.util.Log.i("NewsMedia", "embed loaded: $url")
							// The hero's poster lifts once the embed has loaded (Codex review, PR #167 mirror).
							onLoaded()
						}
						override fun onReceivedError(view: android.webkit.WebView?, request: android.webkit.WebResourceRequest?, error: android.webkit.WebResourceError?) {
							android.util.Log.w("NewsMedia", "embed error ${error?.errorCode} ${error?.description} for ${request?.url}")
						}
					}
					// YouTube's player refuses embeds with no HTTP Referer -
					// a bare loadUrl(embed) dies with "configuration error
					// 153" (user, 2026-08-25; reproduced + fix verified in
					// the browser). The iframe wrapper + base URL presents
					// an embedding origin.
					val html = """
						<!doctype html><html><head>
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}</style>
						</head><body>
						<iframe src="$embed" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
						</body></html>
					""".trimIndent()
					loadDataWithBaseURL("https://stak.app", html, "text/html", "utf-8", null)
				}
			},
			// Backing out of the article must stop playback and free the
			// JS-enabled WebView (audit 2026-08-25).
			onRelease = { web ->
				web.loadUrl("about:blank")
				web.destroy()
			},
		)
	} else {
		// ExoPlayer, not VideoView: VideoView inside Compose failed
		// silently on-device (surface never created / prepare aborted -
		// stuck gray hero, 2026-08-25). ExoPlayer owns its surface and
		// reports errors; a failed stream bounces back to the poster.
		// TextureView, not SurfaceView (2026-08-26): SurfaceView frames
		// composite OUTSIDE the app and long-running emulators stop
		// showing them (decoder ran, screen stayed black); TextureView
		// draws through the view pipeline and also respects the hero's
		// r10 corner clip, which SurfaceView punches through.
		androidx.compose.ui.viewinterop.AndroidView(
			modifier = modifier,
			factory = { ctx ->
				// Same deep-audio-buffer renderers as the cached player.
				val player = androidx.media3.exoplayer.ExoPlayer.Builder(ctx).setRenderersFactory(SmoothAudioRenderersFactory(ctx)).build().apply {
					setMediaItem(androidx.media3.common.MediaItem.fromUri(video.url))
					addListener(object : androidx.media3.common.Player.Listener {
						override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
							android.util.Log.w("NewsMedia", "direct playback error ${error.errorCodeName} for ${video.url}")
							onDone()
						}
						// A finished clip returns to the poster + glyph so
						// the hero reads as replayable, not a stuck frame
						// (user, 2026-08-26: "i cant see the play icon").
						override fun onPlaybackStateChanged(playbackState: Int) {
							if (playbackState == androidx.media3.common.Player.STATE_ENDED) onDone()
						}
					})
					// Exactly 1x (user, 2026-08-26: "put it on 1x speed" -
					// not sluggish, not fast). Clip SOURCES must also be
					// real-time footage; see NewsArticleFeed's media notes.
					playbackParameters = androidx.media3.common.PlaybackParameters(1f)
					prepare()
					playWhenReady = true
				}
				// Aspect-correct, cropped to the hero (never stretched), r10 corners.
				VideoSurfaceHost(ctx, player, zoom = true, cornerRadiusPx = 10f * ctx.resources.displayMetrics.widthPixels / 390f).also { it.tag = player }  // 10u in px (figmaUnit x density)
			},
			// Play/pause toggle: ExoPlayer.pause keeps the position, so
			// resuming continues where the clip stopped.
			update = { v -> (v.tag as? androidx.media3.exoplayer.ExoPlayer)?.playWhenReady = !paused },
			onRelease = { v -> (v.tag as? androidx.media3.exoplayer.ExoPlayer)?.release(); v.tag = null },
		)
	}
}


/**
 * Disk-cached, pre-buffered hero clips (user, 2026-08-30: "the speed
 * should look like watching a movie"): a clip streams through a 200MB
 * LRU cache so a replay starts instantly, playback may begin once 300ms
 * is buffered, and players are prepared before the play tap.
 */
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
private object NewsVideoCache {
	private var cache: androidx.media3.datasource.cache.SimpleCache? = null

	/**
	 * The disk cache, or null when its storage cannot be set up (no space,
	 * a corrupt or locked index, a folder another instance holds): the
	 * story still plays, straight from the network (audit 2026-09-04).
	 */
	@Synchronized
	private fun cache(ctx: android.content.Context): androidx.media3.datasource.cache.SimpleCache? =
		cache ?: runCatching {
			androidx.media3.datasource.cache.SimpleCache(
				java.io.File(ctx.applicationContext.cacheDir, "news_video"),
				androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor(200L * 1024 * 1024),
				androidx.media3.database.StandaloneDatabaseProvider(ctx.applicationContext),
			)
		}.onFailure { android.util.Log.w("NewsVideoCache", "video cache unavailable - playing uncached", it) }
			.getOrNull()?.also { cache = it }

	fun preparedPlayer(ctx: android.content.Context, url: String): androidx.media3.exoplayer.ExoPlayer {
		val upstream = androidx.media3.datasource.DefaultDataSource.Factory(ctx)
		val dataSources: androidx.media3.datasource.DataSource.Factory = cache(ctx)?.let { disk ->
			androidx.media3.datasource.cache.CacheDataSource.Factory()
				.setCache(disk)
				.setUpstreamDataSourceFactory(upstream)
				.setFlags(androidx.media3.datasource.cache.CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
		} ?: upstream
		return androidx.media3.exoplayer.ExoPlayer.Builder(ctx)
			.setMediaSourceFactory(androidx.media3.exoplayer.source.DefaultMediaSourceFactory(dataSources))
			// Netflix-smooth, not stall-cycling (user, 2026-09-05 "cracking
			// and breaking"): keep 30-120s ahead, start once 2s is in hand
			// and resume a stall only with 4s (the old 600ms/1.5s starts
			// stuttered on a bursty link). The start still feels instant -
			// the player buffers from the moment the article opens, and a
			// cached replay is local. Time thresholds win over byte sizes.
			.setLoadControl(
				androidx.media3.exoplayer.DefaultLoadControl.Builder()
					.setBufferDurationsMs(30000, 120000, 2000, 4000)
					.setPrioritizeTimeOverSizeThresholds(true)
					.build(),
			)
			// Deep AudioTrack buffer against crackling on slow audio paths
			// (user, 2026-09-05 Pixel emulator) + decoder fallback.
			.setRenderersFactory(SmoothAudioRenderersFactory(ctx))
			.build().apply {
				// Audible by default: media usage + audio focus (user,
				// 2026-08-30 "no audio?").
				setAudioAttributes(
					androidx.media3.common.AudioAttributes.Builder()
						.setUsage(androidx.media3.common.C.USAGE_MEDIA)
						.setContentType(androidx.media3.common.C.AUDIO_CONTENT_TYPE_MOVIE)
						.build(),
					true,
				)
				volume = 1f
				setMediaItem(androidx.media3.common.MediaItem.fromUri(url))
				// Exactly 1x (user, 2026-08-26).
				playbackParameters = androidx.media3.common.PlaybackParameters(1f)
				prepare()
				playWhenReady = false
			}
	}
}


/** STAK's accent: the reference's red progress line/thumb in the app's teal. */
private val PlayerTeal = Color(0xFF69B3CA)
/** The "..." sheet's icon / secondary-value gray (reference image 2). */
private val SheetGray = Color(0xFF9AA3B5)

/**
 * The hero clip's shared player: ONE cached, pre-buffered, audible
 * ExoPlayer (NewsVideoCache) that the inline hero, the fullscreen dialog,
 * the "..." sheet and the floating in-app PiP window all render and
 * drive. Hoisted to the article PAGE (one per swiped story) because the
 * mini player floats over the whole article (reference image 3), not
 * just the hero.
 */
private class HeroPlayer(val exo: ExoPlayer?) {
	/** Video mode (from the play-glyph tap until the clip ends / errors / is closed) vs the rest poster. */
	var active by mutableStateOf(false)
	/** The poster holds until the first real frame renders - never a gray box. */
	var firstFrame by mutableStateOf(false)
	/** The clip floats in the in-app mini player. */
	var pip by mutableStateOf(false)
	var fullscreen by mutableStateOf(false)
	/** Set by exitFullscreen(): the fullscreen player turns the phone back to portrait, THEN drops. */
	var leavingFullscreen by mutableStateOf(false)
	var playWhenReady by mutableStateOf(exo?.playWhenReady == true)
	var buffering by mutableStateOf(false)
	var muted by mutableStateOf(exo?.volume == 0f)
	var rate by mutableStateOf(exo?.playbackParameters?.speed ?: 1f)
	var position by mutableStateOf(0L)
	var duration by mutableStateOf(0L)
	var buffered by mutableStateOf(0L)
	/** The media's text tracks (the demo MP4s carry none; production HLS may). */
	var textTracks by mutableStateOf<List<Tracks.Group>>(emptyList())
	var captions by mutableStateOf(false)
	/** The subtitle currently on screen. */
	var cue by mutableStateOf<String?>(null)

	fun start() {
		active = true; pip = false; fullscreen = false; leavingFullscreen = false
		exo?.playWhenReady = true
	}

	/** The fullscreen glyph / back: restores portrait first, then leaves (FullscreenPlayer runs the sequence). */
	fun exitFullscreen() {
		if (fullscreen) leavingFullscreen = true else fullscreen = false
	}

	/** Back to the rest state: poster + glyph, rewound so the next tap starts instantly from the top. */
	fun stop() {
		active = false; pip = false; fullscreen = false; leavingFullscreen = false; firstFrame = false; cue = null
		exo?.playWhenReady = false
		exo?.seekTo(0)
	}

	fun togglePlay() {
		exo?.let { it.playWhenReady = !it.playWhenReady }
	}

	fun skip(deltaMs: Long) {
		val p = exo ?: return
		val target = p.currentPosition + deltaMs
		p.seekTo(if (p.duration > 0) target.coerceIn(0L, p.duration) else target.coerceAtLeast(0L))
		position = p.currentPosition.coerceAtLeast(0L)
	}

	fun seekTo(ms: Long) {
		exo?.seekTo(ms)
		position = ms
	}

	fun applyRate(r: Float) {
		rate = r
		exo?.playbackParameters = PlaybackParameters(r)
	}

	fun mute(m: Boolean) {
		muted = m
		exo?.volume = if (m) 0f else 1f
	}

	/** Enables/disables the text renderer; `track` picks a specific text track. */
	fun showCaptions(on: Boolean, track: Tracks.Group? = null) {
		val p = exo ?: return
		val params = p.trackSelectionParameters.buildUpon()
			.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, !on)
		if (track != null) params.setOverrideForType(TrackSelectionOverride(track.mediaTrackGroup, 0))
		p.trackSelectionParameters = params.build()
		captions = on
		if (!on) cue = null
	}
}

/**
 * Creates the article's hero player (cinema-fast: buffering from the
 * moment the article opens, disk-cached, audible, exactly 1x) and mirrors
 * the ExoPlayer's events into the shared state. Released when the
 * article PAGE leaves composition - Back, or the story swiped off-screen
 * (the pager disposes it) - so an off-screen page can never keep playing.
 */
@Composable
private fun rememberHeroPlayer(media: NewsMedia, enabled: Boolean = true): HeroPlayer {
	val video = media as? NewsMedia.Video
	val directUrl = if (video != null && video.youTubeEmbedUrl == null) video.url else null
	val ctx = LocalContext.current
	// Keyed on `enabled` too: the page settling creates (and pre-buffers)
	// the player; swiping away recreates an empty holder, and the old
	// player is released by this DisposableEffect's key change.
	val player = remember(directUrl, enabled) {
		// Belt and braces over the cache fallback: a player stack that cannot
		// be built leaves the hero on its poster + glyph instead of crashing
		// the article (audit 2026-09-04).
		HeroPlayer(
			if (enabled && directUrl != null) {
				runCatching { NewsVideoCache.preparedPlayer(ctx, directUrl) }
					.onFailure { android.util.Log.w("NewsVideoCache", "hero player unavailable", it) }
					.getOrNull()
			} else null,
		)
	}
	val exo = player.exo
	DisposableEffect(player) {
		if (exo == null) return@DisposableEffect onDispose { }
		// Subtitles start OFF (reference sheet: "Subtitles · Off"); the CC
		// glyph / the Audio & Subtitles page turn them on.
		exo.trackSelectionParameters = exo.trackSelectionParameters.buildUpon()
			.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
			.build()
		val listener = object : Player.Listener {
			override fun onRenderedFirstFrame() { player.firstFrame = true }
			override fun onPlayerError(error: PlaybackException) {
				android.util.Log.w("NewsMedia", "direct playback error " + error.errorCodeName + " for " + directUrl)
				player.active = false; player.pip = false; player.fullscreen = false; player.firstFrame = false
			}
			override fun onPlaybackStateChanged(playbackState: Int) {
				player.buffering = playbackState == Player.STATE_BUFFERING
				// A finished clip returns to the poster + glyph so the hero
				// reads as replayable (user, 2026-08-26).
				if (playbackState == Player.STATE_ENDED) player.stop()
			}
			override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) { player.playWhenReady = playWhenReady }
			override fun onTracksChanged(tracks: Tracks) {
				player.textTracks = tracks.groups.filter { it.type == C.TRACK_TYPE_TEXT }
				player.captions = player.textTracks.any { it.isSelected }
			}
			override fun onCues(cueGroup: CueGroup) {
				player.cue = cueGroup.cues
					.mapNotNull { it.text?.toString()?.trim() }
					.filter { it.isNotEmpty() }
					.joinToString("\n")
					.ifEmpty { null }
			}
		}
		exo.addListener(listener)
		onDispose {
			exo.removeListener(listener)
			exo.release()
		}
	}
	// The ACTIVE hero player registers for the OS PiP window (leaving the
	// app while the clip plays - MainActivity's remote controls + render,
	// and its onPause pauses it). Keyed on `active`, not on composition:
	// with the pager a neighbouring page (at rest, pre-buffering) is
	// composed mid-drag and must neither hijack the playing story's slot
	// nor, when the drag settles back and it is disposed, clear it.
	DisposableEffect(player, player.active) {
		if (exo == null || !player.active) return@DisposableEffect onDispose { }
		NewsPip.player = exo
		onDispose { if (NewsPip.player === exo) NewsPip.player = null }
	}
	// The clock behind the time label, seek bar and mini progress line.
	LaunchedEffect(player, player.active) {
		if (exo == null) return@LaunchedEffect
		while (player.active) {
			player.position = exo.currentPosition.coerceAtLeast(0L)
			player.duration = if (exo.duration > 0) exo.duration else 0L
			player.buffered = exo.bufferedPosition.coerceAtLeast(0L)
			delay(250)
		}
	}
	return player
}

/**
 * CastEntryPoint - the Cast glyph's target (reference image 1, top-right
 * row). Google Cast is out of scope for this pass, so the glyph reports
 * "no devices found" instead of shipping a dead button. Dropping the SDK
 * in later: add play-services-cast-framework + a CastOptionsProvider,
 * then have [open] show the MediaRouteChooserDialog for the app's
 * receiver id and return null once the chooser is up.
 */
private object CastEntryPoint {
	/** Returns the notice to surface, or null when a route chooser was shown. */
	fun open(@Suppress("UNUSED_PARAMETER") context: android.content.Context): String? = "Cast: no devices found"
}

/** Zero-padded "mm:ss" like the reference's "02:57 / 05:49". */
private fun clock(ms: Long): String {
	val t = ms.coerceAtLeast(0L) / 1000
	return "%02d:%02d".format(t / 60, t % 60)
}

/** A transient toast-style label inside the player (Cast / no-subtitles). */
private class PlayerNotice(val text: String, val top: Boolean)

/**
 * The reference player (user, 2026-08-31, Downloads/video_app shots -
 * "this is the way i wanted the video to be"): tap the video to
 * show/hide the chrome (auto-hide 3s while playing) over a 35% scrim;
 * TOP-RIGHT mute · PiP · Cast (AirPlay is iOS-only); CENTER replay-10 /
 * play-pause / forward-10; BOTTOM-LEFT "02:57 / 05:49"; BOTTOM-RIGHT
 * captions · fullscreen · "..."; BOTTOM EDGE the teal seek line with its
 * always-there thumb; yellow subtitles ride just above the line. The
 * "..." opens the reference's dark sheet (Audio & Subtitles / Playback
 * Rates / Quality).
 */
@Composable
private fun HeroControls(
	player: HeroPlayer,
	u: Float,
	modifier: Modifier = Modifier,
	fullscreen: Boolean = false,
) {
	val ctx = LocalContext.current
	var visible by remember { mutableStateOf(true) }
	var scrubbing by remember { mutableStateOf(false) }
	var scrubTo by remember { mutableStateOf(0f) }
	var sheet by remember { mutableStateOf<PlayerSheet?>(null) }
	var notice by remember { mutableStateOf<PlayerNotice?>(null) }
	// Auto-hide 3s after the last interaction while playing.
	var interactedAt by remember { mutableStateOf(0L) }
	fun poke() { interactedAt = android.os.SystemClock.elapsedRealtime() }
	val playing = player.playWhenReady
	LaunchedEffect(visible, playing, interactedAt, sheet) {
		if (visible && playing && sheet == null) { delay(3000); visible = false }
	}
	LaunchedEffect(notice) {
		if (notice != null) { delay(1500); notice = null }
	}
	val duration = player.duration
	val shownPosition = if (scrubbing) scrubTo.toLong() else player.position
	val fraction = if (duration > 0) ((if (scrubbing) scrubTo else player.position.toFloat()) / duration.toFloat()).coerceIn(0f, 1f) else 0f
	val bufferedFraction = if (duration > 0) (player.buffered.toFloat() / duration.toFloat()).coerceIn(0f, 1f) else 0f
	Box(
		modifier = modifier.clickable(
			interactionSource = remember { MutableInteractionSource() },
			indication = null,
		) { visible = !visible; poke() },
	) {
		// Subtitles are content, not chrome: they ride just above the line
		// whether or not the controls are up.
		player.cue?.let { cue ->
			CueText(
				text = cue,
				u = u,
				modifier = Modifier
					.align(Alignment.BottomCenter)
					.padding(start = (16 * u).dp, end = (16 * u).dp, bottom = (16 * u).dp),
			)
		}
		if (!visible && player.buffering) {
			CircularProgressIndicator(
				color = Color.White,
				strokeWidth = (2.5f * u).dp,
				modifier = Modifier.align(Alignment.Center).size((32 * u).dp),
			)
		}
		if (visible) {
			// The reference dims the frame behind the white chrome.
			Box(modifier = Modifier.matchParentSize().background(Color(0x59000000)))
			// TOP-RIGHT: mute · picture in picture · cast.
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((16 * u).dp),
				modifier = Modifier.align(Alignment.TopEnd).padding(top = (12 * u).dp, end = (12 * u).dp),
			) {
				ControlGlyph(
					icon = if (player.muted) Icons.AutoMirrored.Filled.VolumeOff else Icons.AutoMirrored.Filled.VolumeUp,
					size = 20f, u = u, description = if (player.muted) "Unmute" else "Mute",
				) { player.mute(!player.muted); poke() }
				ControlGlyph(icon = Icons.Filled.PictureInPictureAlt, size = 20f, u = u, description = "Play in picture in picture") {
					player.fullscreen = false; player.pip = true
				}
				ControlGlyph(icon = Icons.Filled.Cast, size = 20f, u = u, description = "Cast") {
					CastEntryPoint.open(ctx)?.let { notice = PlayerNotice(it, top = true) }
					poke()
				}
			}
			// CENTER: replay-10 / play-pause / forward-10 (the spinner takes
			// the middle slot while buffering).
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((34 * u).dp),
				modifier = Modifier.align(Alignment.Center),
			) {
				ControlGlyph(icon = Icons.Filled.Replay10, size = 30f, u = u, description = "Back 10 seconds") { player.skip(-10_000L); poke() }
				Box(contentAlignment = Alignment.Center, modifier = Modifier.size((44 * u).dp)) {
					if (player.buffering) {
						CircularProgressIndicator(
							color = Color.White,
							strokeWidth = (2.5f * u).dp,
							modifier = Modifier.size((34 * u).dp),
						)
					} else {
						ControlGlyph(
							icon = if (playing) Icons.Filled.Pause else Icons.Filled.PlayArrow,
							size = 44f, u = u, description = if (playing) "Pause" else "Play",
						) { player.togglePlay(); poke() }
					}
				}
				ControlGlyph(icon = Icons.Filled.Forward10, size = 30f, u = u, description = "Forward 10 seconds") { player.skip(10_000L); poke() }
			}
			// BOTTOM ROW: time on the left, captions · fullscreen · "..." on the right.
			Row(
				verticalAlignment = Alignment.CenterVertically,
				modifier = Modifier
					.align(Alignment.BottomStart)
					.fillMaxWidth()
					.padding(start = (12 * u).dp, end = (12 * u).dp, bottom = ((if (player.cue != null) 40 else 22) * u).dp),
			) {
				Text(
					text = clock(shownPosition) + " / " + clock(duration),
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (16 * u).sp),
					color = Color(0xF2FFFFFF),
				)
				Spacer(modifier = Modifier.weight(1f))
				ControlGlyph(
					icon = Icons.Filled.ClosedCaption, size = 20f, u = u, description = "Subtitles",
					tint = if (player.captions) Color.White else Color(0xB3FFFFFF),
				) {
					if (player.textTracks.isEmpty()) notice = PlayerNotice("No subtitles for this clip", top = false)
					else player.showCaptions(!player.captions)
					poke()
				}
				Spacer(modifier = Modifier.width((18 * u).dp))
				ControlGlyph(
					icon = if (fullscreen) Icons.Filled.FullscreenExit else Icons.Filled.Fullscreen,
					size = 20f, u = u, description = if (fullscreen) "Exit fullscreen" else "Fullscreen",
				) { if (fullscreen) player.exitFullscreen() else player.fullscreen = true }
				Spacer(modifier = Modifier.width((18 * u).dp))
				ControlGlyph(icon = Icons.Filled.MoreHoriz, size = 22f, u = u, description = "More options") {
					sheet = PlayerSheet.Menu; poke()
				}
			}
			// BOTTOM EDGE: the seek line.
			SleekScrubber(
				fraction = fraction,
				buffered = bufferedFraction,
				scrubbing = scrubbing,
				u = u,
				onScrub = { f ->
					scrubbing = true
					// Read the live duration at the touch, never a snapshot (a
					// first-touch capture would pin an unknown 0 duration).
					val d = player.duration.toFloat()
					scrubTo = (f * d).coerceIn(0f, d)
					poke()
				},
				onCommit = {
					player.seekTo(scrubTo.toLong()); scrubbing = false
				},
				modifier = Modifier
					.align(Alignment.BottomCenter)
					.fillMaxWidth()
					.padding(horizontal = (8 * u).dp),
			)
		}
		notice?.let { n ->
			NoticePill(
				text = n.text,
				u = u,
				modifier = if (n.top) Modifier.align(Alignment.TopEnd).padding(top = (40 * u).dp, end = (12 * u).dp)
				else Modifier.align(Alignment.BottomEnd).padding(bottom = (50 * u).dp, end = (12 * u).dp),
			)
		}
	}
	sheet?.let { page ->
		PlayerSheetHost(
			player = player,
			page = page,
			u = u,
			onPage = { sheet = it },
			onDismiss = { sheet = null; visible = true; poke() },
		)
	}
}

/** One white control glyph; its own box is the tap target. */
@Composable
private fun ControlGlyph(
	icon: ImageVector,
	size: Float,
	u: Float,
	description: String,
	tint: Color = Color.White,
	modifier: Modifier = Modifier,
	onTap: () -> Unit,
) {
	Icon(
		imageVector = icon,
		contentDescription = description,
		tint = tint,
		modifier = modifier
			.size((size * u).dp)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
			) { onTap() },
	)
}

/** The reference's yellow subtitle on a translucent backdrop. */
@Composable
private fun CueText(text: String, u: Float, modifier: Modifier = Modifier) {
	Text(
		text = text,
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
		color = Color(0xFFFFE14D),
		textAlign = TextAlign.Center,
		modifier = modifier
			.background(Color(0x99000000), RoundedCornerShape((3 * u).dp))
			.padding(horizontal = (6 * u).dp, vertical = (2 * u).dp),
	)
}

@Composable
private fun NoticePill(text: String, u: Float, modifier: Modifier = Modifier) {
	Box(
		modifier = modifier
			.clip(RoundedCornerShape((6 * u).dp))
			.background(Color(0xE6161B27))
			.padding(horizontal = (10 * u).dp, vertical = (6 * u).dp),
	) {
		Text(
			text = text,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
			color = Color.White,
		)
	}
}

/**
 * The reference's bottom-edge line: 2u track (white 30%), the buffered
 * range ahead of the played part (white 45%), teal played part and a
 * 7u round teal thumb that is ALWAYS there (9u while dragging).
 * Tap / drag seeks.
 */
@Composable
private fun SleekScrubber(
	fraction: Float,
	buffered: Float,
	scrubbing: Boolean,
	u: Float,
	onScrub: (Float) -> Unit,
	onCommit: () -> Unit,
	modifier: Modifier = Modifier,
) {
	// The gesture coroutines bind their handlers at the FIRST touch, so
	// route through rememberUpdatedState to always call the current lambdas.
	val scrub by rememberUpdatedState(onScrub)
	val commit by rememberUpdatedState(onCommit)
	Canvas(
		modifier = modifier
			.height((20 * u).dp)
			.pointerInput(Unit) {
				detectHorizontalDragGestures(
					onDragStart = { o -> scrub((o.x / size.width).coerceIn(0f, 1f)) },
					onHorizontalDrag = { change, _ -> change.consume(); scrub((change.position.x / size.width).coerceIn(0f, 1f)) },
					onDragEnd = { commit() },
					onDragCancel = { commit() },
				)
			}
			.pointerInput(Unit) {
				detectTapGestures { o ->
					scrub((o.x / size.width).coerceIn(0f, 1f)); commit()
				}
			},
	) {
		val y = size.height / 2f
		val trackH = (2 * u).dp.toPx()
		val r = CornerRadius(trackH / 2f)
		drawRoundRect(
			color = Color(0x4DFFFFFF),
			topLeft = Offset(0f, y - trackH / 2f),
			size = Size(size.width, trackH),
			cornerRadius = r,
		)
		if (buffered > fraction) {
			drawRoundRect(
				color = Color(0x73FFFFFF),
				topLeft = Offset(0f, y - trackH / 2f),
				size = Size(size.width * buffered, trackH),
				cornerRadius = r,
			)
		}
		drawRoundRect(
			color = PlayerTeal,
			topLeft = Offset(0f, y - trackH / 2f),
			size = Size(size.width * fraction, trackH),
			cornerRadius = r,
		)
		drawCircle(
			color = PlayerTeal,
			radius = ((if (scrubbing) 9f else 7f) / 2f * u).dp.toPx(),
			center = Offset(size.width * fraction, y),
		)
	}
}

/** Reference image 3: the hero while its clip floats in picture in picture. */
@Composable
private fun PipPlaceholder(u: Float, modifier: Modifier = Modifier, onTap: () -> Unit) {
	Box(
		contentAlignment = Alignment.Center,
		modifier = modifier
			.background(Color(0xFF0E1424))
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
			) { onTap() },
	) {
		Column(
			horizontalAlignment = Alignment.CenterHorizontally,
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
		) {
			Icon(
				imageVector = Icons.Outlined.PictureInPictureAlt,
				contentDescription = null,
				tint = Color(0x8CFFFFFF),
				modifier = Modifier.size((48 * u).dp),
			)
			Text(
				text = "This video is playing in picture in picture.",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
				color = Color(0xB3FFFFFF),
			)
		}
	}
}

/**
 * The in-app picture-in-picture window (reference image 3): the SAME
 * ExoPlayer rendered into a 150x84 floating box anchored top-left under
 * the fixed top bar (Back / Share stay reachable), draggable, over the
 * scrolling article. Close (x) stops
 * the clip and returns the hero to its poster; the PiP glyph puts the
 * video back into the hero. Composed at the article PAGE's root Box.
 */
@Composable
private fun MiniPlayer(player: HeroPlayer, u: Float) {
	val exo = player.exo ?: return
	val shape = RoundedCornerShape((10 * u).dp)
	val w = (150 * u).dp
	val h = (84 * u).dp
	val inset = (12 * u).dp
	// The page starts right under the fixed top bar (status bar + 10 pad +
	// 40 back circle + 12 pad), so anchoring at the page's top edge keeps
	// the window below Back / Share exactly where it sat when the layer
	// was screen-level and status-bar padded with a 62 top.
	val top = 0.dp
	// A constraints-only layer: no pointer input of its own, so the article
	// beneath keeps scrolling; it just tells the window how far it may go.
	BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
		val density = LocalDensity.current
		val maxDx = with(density) { (maxWidth - w - inset * 2).toPx() }.coerceAtLeast(0f)
		val maxDy = with(density) { (maxHeight - h - top - inset).toPx() }.coerceAtLeast(0f)
		var drag by remember { mutableStateOf(Offset.Zero) }
		var chrome by remember { mutableStateOf(true) }
		var pokedAt by remember { mutableStateOf(0L) }
		fun poke() { pokedAt = android.os.SystemClock.elapsedRealtime() }
		LaunchedEffect(chrome, player.playWhenReady, pokedAt) {
			if (chrome && player.playWhenReady) { delay(3000); chrome = false }
		}
		val fraction = if (player.duration > 0) (player.position.toFloat() / player.duration.toFloat()).coerceIn(0f, 1f) else 0f
		Box(
			modifier = Modifier
				.padding(start = inset, top = top)
				.offset { IntOffset(drag.x.roundToInt(), drag.y.roundToInt()) }
				.size(w, h)
				.shadow((10 * u).dp, shape)
				.clip(shape)
				.background(Color.Black)
				.pointerInput(maxDx, maxDy) {
					detectDragGestures { change, delta ->
						change.consume()
						drag = Offset(
							(drag.x + delta.x).coerceIn(0f, maxDx),
							(drag.y + delta.y).coerceIn(0f, maxDy),
						)
					}
				}
				.clickable(
					interactionSource = remember { MutableInteractionSource() },
					indication = null,
				) { chrome = !chrome; poke() },
		) {
			// The surface moves here: this view claims the player, the hero's
			// (now gone) view clears itself per-view, so the order is safe.
			AndroidView(
				modifier = Modifier.matchParentSize(),
				factory = { c -> VideoSurfaceHost(c, exo, zoom = true, cornerRadiusPx = 10 * u * c.resources.displayMetrics.density) },
				onRelease = { v -> v.release() },
			)
			if (chrome) {
				Box(modifier = Modifier.matchParentSize().background(Color(0x40000000)))
				MiniGlyph(
					icon = Icons.Filled.Close, size = 16f, u = u, description = "Close",
					modifier = Modifier.align(Alignment.TopStart).padding((5 * u).dp),
				) { player.stop() }
				MiniGlyph(
					icon = Icons.Filled.PictureInPictureAlt, size = 16f, u = u, description = "Back to the article",
					modifier = Modifier.align(Alignment.TopEnd).padding((5 * u).dp),
				) { player.pip = false }
				Row(
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy((14 * u).dp),
					modifier = Modifier.align(Alignment.Center),
				) {
					MiniGlyph(icon = Icons.Filled.Replay10, size = 18f, u = u, description = "Back 10 seconds") { player.skip(-10_000L); poke() }
					MiniGlyph(
						icon = if (player.playWhenReady) Icons.Filled.Pause else Icons.Filled.PlayArrow,
						size = 18f, u = u, description = if (player.playWhenReady) "Pause" else "Play",
					) { player.togglePlay(); poke() }
					MiniGlyph(icon = Icons.Filled.Forward10, size = 18f, u = u, description = "Forward 10 seconds") { player.skip(10_000L); poke() }
				}
			}
			// The mini progress line along the bottom edge.
			Box(
				modifier = Modifier
					.align(Alignment.BottomStart)
					.fillMaxWidth()
					.height((1.5f * u).dp)
					.background(Color(0x4DFFFFFF)),
			) {
				Box(modifier = Modifier.fillMaxWidth(fraction).fillMaxHeight().background(PlayerTeal))
			}
		}
	}
}

/** The mini player's glyphs sit on the reference's small dark pucks. */
@Composable
private fun MiniGlyph(
	icon: ImageVector,
	size: Float,
	u: Float,
	description: String,
	modifier: Modifier = Modifier,
	onTap: () -> Unit,
) {
	Box(
		contentAlignment = Alignment.Center,
		modifier = modifier
			.size(((size + 10f) * u).dp)
			.background(Color(0x73000000), CircleShape)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
			) { onTap() },
	) {
		Icon(
			imageVector = icon,
			contentDescription = description,
			tint = Color.White,
			modifier = Modifier.size((size * u).dp),
		)
	}
}

/** The "..." sheet's pages (reference image 2). */
private enum class PlayerSheet { Menu, AudioSubs, Rates, Quality }

private fun rateLabel(r: Float): String =
	if (r == 1f) "Normal" else if (r == r.toInt().toFloat()) "${r.toInt()}x" else "${r}x"

private fun trackLabel(group: Tracks.Group, index: Int): String {
	val format = group.getTrackFormat(0)
	return format.label
		?: format.language?.let { java.util.Locale.forLanguageTag(it).displayLanguage }
		?: "Track ${index + 1}"
}

/**
 * Fullscreen = a Netflix-style player (user, 2026-09-05 screenshot: the
 * old raw TextureView stretched the 16:9 clip over the portrait screen):
 * the system bars hide and the clip sits letterboxed on black at its own
 * aspect ratio, the same chrome over it. The phone is NOT turned (user,
 * 2026-09-05 screenshot #2: "the landscape should happen when the user
 * tilts their phone horizontal; when they are vertical it should be" the
 * upright letterboxed player): fullscreen opens the way the phone is held
 * and follows the sensor from there - tilt sideways for landscape, back
 * upright for portrait. It is an OVERLAY in the activity window
 * (LocalFullscreenSlot) - a Dialog window is sized to the display minus
 * bars and cutout and left article strips. The controls keep their
 * portrait size - the artboard unit comes from the SHORT side, not the
 * width. Leaving from landscape restores portrait FIRST and drops the
 * overlay once the turn has played, so the article underneath never shows
 * in landscape (its 390-wide artboard scaling is portrait-only); leaving
 * from portrait drops it at once.
 */
@Composable
private fun FullscreenPlayer(player: HeroPlayer, exo: ExoPlayer) {
	val activity = LocalContext.current.findActivity()
	val cfg = LocalConfiguration.current
	val u = minOf(cfg.screenWidthDp, cfg.screenHeightDp) / 390f
	DisposableEffect(Unit) {
		// Follow the phone (all four ways) while fullscreen is up - like a
		// video app, the rotate lock does not pin the player.
		activity?.requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
		// Every exit path (glyph, back, PiP glyph, clip end) lands back in portrait.
		onDispose { activity?.requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT }
	}
	val landscape = cfg.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE
	LaunchedEffect(player.leavingFullscreen) {
		if (player.leavingFullscreen) {
			activity?.requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
			// Only a landscape exit has a turn to wait out.
			if (landscape) delay(350)
			player.fullscreen = false
			player.leavingFullscreen = false
		}
	}
	androidx.activity.compose.BackHandler { player.exitFullscreen() }
	val view = LocalView.current
	DisposableEffect(view) {
		// Immersive: the activity window hides status + navigation bars; a
		// swipe shows them transiently, like a video app. The activity is
		// already edge to edge, so this overlay spans the whole display.
		val controller = activity?.window?.let { androidx.core.view.WindowInsetsControllerCompat(it, view) }
		controller?.systemBarsBehavior = androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
		controller?.hide(androidx.core.view.WindowInsetsCompat.Type.systemBars())
		onDispose { controller?.show(androidx.core.view.WindowInsetsCompat.Type.systemBars()) }
	}
	Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
		AndroidView(
			modifier = Modifier.matchParentSize(),
			// Letterboxed at the video's aspect ratio (fit), never cropped or stretched.
			factory = { c -> VideoSurfaceHost(c, exo, zoom = false) },
			onRelease = { v -> v.release() },
		)
		HeroControls(player = player, u = u, fullscreen = true, modifier = Modifier.matchParentSize())
	}
}

/** The screen-level slot the hero publishes its fullscreen player into (see FullscreenPlayer). */
private val LocalFullscreenSlot = androidx.compose.runtime.compositionLocalOf<androidx.compose.runtime.MutableState<Pair<HeroPlayer, ExoPlayer>?>> {
	error("NewsDetailScreen provides the fullscreen slot")
}

private fun android.content.Context.findActivity(): android.app.Activity? = when (this) {
	is android.app.Activity -> this
	is android.content.ContextWrapper -> baseContext.findActivity()
	else -> null
}

/**
 * The reference's dark player sheet (image 2): Audio & Subtitles /
 * Playback Rates · Normal / Quality · Default, each drilling into its
 * page. A material3 modal sheet - its own window, so it overlays the
 * whole screen from the inline hero and sits above the fullscreen
 * player's dialog (the later window).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PlayerSheetHost(
	player: HeroPlayer,
	page: PlayerSheet,
	u: Float,
	onPage: (PlayerSheet) -> Unit,
	onDismiss: () -> Unit,
) {
	val state = rememberModalBottomSheetState(skipPartiallyExpanded = true)
	val scope = rememberCoroutineScope()
	// Slide the sheet away, then clear it.
	fun close() {
		scope.launch { state.hide() }.invokeOnCompletion { onDismiss() }
	}
	ModalBottomSheet(
		onDismissRequest = onDismiss,
		sheetState = state,
		shape = RoundedCornerShape(topStart = (16 * u).dp, topEnd = (16 * u).dp),
		containerColor = Color(0xFF1B2030),
		scrimColor = Color(0x80000000),
		dragHandle = null,
	) {
		Column(
			modifier = Modifier
				.fillMaxWidth()
				.padding(top = (8 * u).dp, bottom = (16 * u).dp)
				.navigationBarsPadding(),
		) {
			when (page) {
				PlayerSheet.Menu -> {
					SheetRow(u = u, label = "Audio & Subtitles", icon = Icons.Filled.Subtitles) { onPage(PlayerSheet.AudioSubs) }
					SheetDivider(u)
					SheetRow(u = u, label = "Playback Rates", icon = Icons.Filled.Speed, value = rateLabel(player.rate)) { onPage(PlayerSheet.Rates) }
					SheetDivider(u)
					SheetRow(u = u, label = "Quality", icon = Icons.Filled.SignalCellularAlt, value = "Default") { onPage(PlayerSheet.Quality) }
				}
				PlayerSheet.AudioSubs -> {
					SheetHeader(title = "Audio & Subtitles", u = u) { onPage(PlayerSheet.Menu) }
					// The demo MP4s carry a single audio track and no text
					// tracks; production media lists its real tracks here.
					SheetRow(u = u, label = "Audio: Original", checked = true) { close() }
					SheetDivider(u)
					SheetRow(u = u, label = "Subtitles: Off", checked = !player.captions) { player.showCaptions(false); close() }
					player.textTracks.forEachIndexed { i, group ->
						SheetDivider(u)
						SheetRow(u = u, label = "Subtitles: " + trackLabel(group, i), checked = player.captions && group.isSelected) {
							player.showCaptions(true, group); close()
						}
					}
				}
				PlayerSheet.Rates -> {
					SheetHeader(title = "Playback Rates", u = u) { onPage(PlayerSheet.Menu) }
					listOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f).forEachIndexed { i, r ->
						if (i > 0) SheetDivider(u)
						SheetRow(u = u, label = rateLabel(r), checked = r == player.rate) { player.applyRate(r); close() }
					}
				}
				PlayerSheet.Quality -> {
					SheetHeader(title = "Quality", u = u) { onPage(PlayerSheet.Menu) }
					// Progressive MP4s have no rendition ladder - one honest
					// option; production HLS serves its ladder into these rows.
					SheetRow(u = u, label = "Default", checked = true) { close() }
				}
			}
		}
	}
}

/** Reference image 2: 56-tall row, 22 gray icon, 16 label, " · value" in gray, teal check when selected. */
@Composable
private fun SheetRow(
	u: Float,
	label: String,
	icon: ImageVector? = null,
	value: String? = null,
	checked: Boolean? = null,
	onClick: () -> Unit,
) {
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.fillMaxWidth()
			.height((56 * u).dp)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
			) { onClick() }
			.padding(horizontal = (20 * u).dp),
	) {
		if (icon != null) {
			Icon(
				imageVector = icon,
				contentDescription = null,
				tint = SheetGray,
				modifier = Modifier.size((22 * u).dp),
			)
			Spacer(modifier = Modifier.width((18 * u).dp))
		}
		Text(
			text = label,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (16 * u).sp),
			color = Color(0xE6FFFFFF),
		)
		if (value != null) {
			Text(
				text = " · $value",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (16 * u).sp),
				color = SheetGray,
			)
		}
		Spacer(modifier = Modifier.weight(1f))
		if (checked == true) {
			Icon(
				imageVector = Icons.Filled.Check,
				contentDescription = "Selected",
				tint = PlayerTeal,
				modifier = Modifier.size((18 * u).dp),
			)
		}
	}
}

/** A sub-sheet's title row; tapping it steps back to the menu. */
@Composable
private fun SheetHeader(title: String, u: Float, onBack: () -> Unit) {
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.fillMaxWidth()
			.height((44 * u).dp)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
			) { onBack() }
			.padding(horizontal = (20 * u).dp),
	) {
		Icon(
			imageVector = Icons.AutoMirrored.Filled.ArrowBack,
			contentDescription = "Back",
			tint = SheetGray,
			modifier = Modifier.size((18 * u).dp),
		)
		Spacer(modifier = Modifier.width((18 * u).dp))
		Text(
			text = title,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, letterSpacing = (0.3f * u).sp),
			color = SheetGray,
		)
	}
	SheetDivider(u)
}

@Composable
private fun SheetDivider(u: Float) {
	Box(
		modifier = Modifier
			.fillMaxWidth()
			.padding(start = (20 * u).dp)
			.height(0.5.dp)
			.background(Color(0x14FFFFFF)),
	)
}
