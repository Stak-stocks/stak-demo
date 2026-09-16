package com.stak.demo.ui.news

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.fractionalSpacedBy
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.runtime.LaunchedEffect
import androidx.activity.compose.BackHandler
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalUriHandler
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.stak.demo.data.NewsArticleDto
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/** Palette of the CHINEDU "03 · News" frames. */
internal object News {
	val MoodBg = Color(0xFF171D2C)
	val CardBg = Color(0xFF181F30)
	val Teal = Color(0xFF69B3CA)
	val Ink = Color(0xFF0E162B)
	val Muted = Color(0xFF819ABB)
	val Faint = Color(0xFF5C6B85)
	val ChipBg = Color(0xFF242B3D)
	val HeaderGray = Color(0xFFD3D3D3)
	val Body = Color(0xFFC8D2E0)
	val Green = Color(0xFF2FD08A)
	val Divider = Color(0xFF2A3346)
}

/**
 * 03 · News — "News listing tab" (CHINEDU 1:1228). Fixed header ("News",
 * date, search circle), then the scrolling stack: the compact Market
 * Mood row, the teal TODAY'S BRIEF carousel card with pager dots, the
 * two-tile story grid, and the For You / Markets card lists. The tab
 * bar comes from the MainShell.
 */
@Composable
fun NewsScreen(
	onOpenArticle: (String) -> Unit,
	onOpenLiveArticle: (com.stak.demo.data.NewsArticleDto) -> Unit = {},
	onOpenDailyBrief: () -> Unit = {},
	viewModel: NewsViewModel = hiltViewModel(),
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val liveNews by viewModel.liveNews.collectAsStateWithLifecycle()
	val dailyBrief by viewModel.dailyBrief.collectAsStateWithLifecycle()
	val forYouNews by viewModel.forYouNews.collectAsStateWithLifecycle()
	// Re-fetch For You each time the screen is entered so new holdings from
	// Discover (or direct My STAK adds) are picked up without a full restart.
	LaunchedEffect(Unit) { viewModel.refreshForYou() }
	val uriHandler = LocalUriHandler.current
	// Designer's call (2026-08-22): the search icon opens a search bar that
	// word-matches the news content; the list is empty when nothing matches.
	var searching by rememberSaveable { mutableStateOf(false) }
	var query by rememberSaveable { mutableStateOf("") }
	val q = query.trim()
	fun matches(text: String) = q.isEmpty() || text.contains(q, ignoreCase = true)
	// Search reads the whole story, not just its headline (Codex audit
	// 2026-09-04): subtitle, source, tags and ticker too.
	fun matchesArticle(a: NewsArticleFeed.Article) = articleMatches(a, q)
	fun matchesBrief(b: NewsBriefFeed.Brief) = matches(b.title) || matches(b.body) || matches(b.source)
	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Row(
			verticalAlignment = Alignment.CenterVertically,
			modifier = Modifier
				.fillMaxWidth()
				.background(StakColors.Bg)
				.statusBarsPadding()
				.padding(horizontal = (20 * u).dp)
				.padding(top = (22 * u).dp),
		) {
			Column(verticalArrangement = Arrangement.spacedBy((4 * u).dp)) {
				Text(
					text = "News",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				// Authored date line (user, 2026-09-04 (CHINEDU 03 · News 1:1228): the authored look wins).
				Text(
					// Product audit (2026-09-05): today's date, on the authored line.
					text = com.stak.demo.data.StakClock.todayLong(),
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = News.Muted,
				)
			}
			Spacer(modifier = Modifier.weight(1f))
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier
					.size((40 * u).dp)
					.background(News.CardBg, CircleShape)
					.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
					) {
						searching = !searching
						if (!searching) query = ""
					},
			) {
				Image(
					painter = painterResource(R.drawable.ic_news_search),
					contentDescription = "Search",
					modifier = Modifier.size((20 * u).dp),
				)
			}
		}
		// Product audit (2026-09-05): opening search focuses the field and raises
		// the keyboard, so the tap on the glass is enough to start typing.
		val searchFocus = remember { androidx.compose.ui.focus.FocusRequester() }
		val keyboard = androidx.compose.ui.platform.LocalSoftwareKeyboardController.current
		LaunchedEffect(searching) {
			if (searching) {
				searchFocus.requestFocus()
				keyboard?.show()
			}
		}
		BackHandler(enabled = searching) {
			searching = false
			query = ""
		}
		if (searching) {
			BasicTextField(
				value = query,
				onValueChange = { query = it },
				singleLine = true,
				textStyle = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, color = Color.White),
				cursorBrush = SolidColor(News.Teal),
				decorationBox = { inner ->
					Box(contentAlignment = Alignment.CenterStart) {
						if (query.isEmpty()) {
							Text(
								text = "Search news",
								style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp),
								color = News.Faint,
							)
						}
						inner()
					}
				},
				modifier = Modifier.focusRequester(searchFocus)
					.fillMaxWidth()
					.padding(horizontal = (20 * u).dp)
					.padding(top = (12 * u).dp)
					.clip(RoundedCornerShape((12 * u).dp))
					.background(News.CardBg)
					.padding(horizontal = (16 * u).dp, vertical = (13 * u).dp),
			)
		}
		Column(
			verticalArrangement = fractionalSpacedBy((22 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.navigationBarsPadding()
				.padding(horizontal = (20 * u).dp)
				.padding(top = (22 * u).dp, bottom = (24 * u).dp),
		) {
			// Only show MoodMiniRow when a real mood value is available
			val mood = dailyBrief?.mood
			if (q.isEmpty() && !mood.isNullOrBlank()) MoodMiniRow(mood = mood)
			// Show loading skeleton only while still waiting (null). Once resolved (even empty), stop.
			val briefIsLoading = com.stak.demo.data.Session.token != null && dailyBrief == null
			if (briefIsLoading) {
				BriefLoadingCard()
			}
			// Daily brief drives the carousel when authenticated (AI-generated, holiday/session-aware).
			// Falls back to top news articles, then hardcoded demo set.
			val sourceBriefs = if (briefIsLoading) emptyList() else run {
				val brief = dailyBrief
				if (brief != null && (brief.moodExplanation.isNotBlank() || brief.plainEnglish.isNotBlank())) {
					val aiSource = "STAK AI · ${brief.dayLabel.ifBlank { "Today's" }} Brief"
					val aiCards = buildList {
						if (brief.moodExplanation.isNotBlank() && brief.plainEnglish.isNotBlank()) {
							add(NewsBriefFeed.Brief(
								title = brief.moodExplanation,
								body = brief.plainEnglish,
								source = aiSource,
							))
						}
						if (brief.personalizedImpact.isNotBlank()) {
							add(NewsBriefFeed.Brief(
								title = "What this means for you",
								body = brief.personalizedImpact,
								source = aiSource,
							))
						}
					}
					val newsCards = liveNews.take(4 - aiCards.size).map { a ->
						NewsBriefFeed.Brief(
							title = a.headline,
							body = a.explanation.takeIf { it.isNotBlank() } ?: a.summary,
							source = "${a.source} · ${formatNewsAge(a.datetime)}",
							url = a.url.takeIf { it.isNotBlank() },
						)
					}
					(aiCards + newsCards).ifEmpty { NewsBriefFeed.briefs() }
				} else if (liveNews.isNotEmpty()) {
					liveNews.take(4).map { a ->
						NewsBriefFeed.Brief(
							title = a.headline,
							body = a.explanation.takeIf { it.isNotBlank() } ?: a.summary,
							source = "${a.source} · ${formatNewsAge(a.datetime)}",
							url = a.url.takeIf { it.isNotBlank() },
						)
					}
				} else {
					NewsBriefFeed.briefs()
				}
			}
			val primaryBrief = sourceBriefs.firstOrNull { q.isEmpty() || matchesBrief(it) }
			if (primaryBrief != null) {
				BriefCard(brief = primaryBrief, onRead = {
					if (dailyBrief != null) {
						DailyBriefHolder.current = dailyBrief
						DailyBriefHolder.news = liveNews
						onOpenDailyBrief()
					} else if (primaryBrief.url != null) {
						uriHandler.openUri(primaryBrief.url)
					}
				})
			}
			// For You: live company news for held stocks, deduplicated and recency-sorted.
			val liveForYou = forYouNews.filter { a ->
				q.isEmpty() || a.headline.contains(q, ignoreCase = true) || a.source.contains(q, ignoreCase = true)
			}
			if (liveForYou.isNotEmpty()) {
				LiveNewsSection(title = "For You", articles = liveForYou, onOpen = { url -> uriHandler.openUri(url) }, onOpenArticle = onOpenLiveArticle)
			}
			// Articles not consumed by the carousel become the Markets rows.
			// Brief card is AI-only — no news articles are consumed, so Markets gets all of liveNews.
			val liveMarkets = liveNews.filter { a ->
				q.isEmpty() || a.headline.contains(q, ignoreCase = true) || a.source.contains(q, ignoreCase = true)
			}
			if (liveMarkets.isNotEmpty()) {
				LiveNewsSection(title = "Markets", articles = liveMarkets, onOpen = { url -> uriHandler.openUri(url) }, onOpenArticle = onOpenLiveArticle)
			} else {
				val markets = NewsArticleFeed.markets().filter { matchesArticle(it) }
				if (markets.isNotEmpty()) NewsSection(title = "Markets", rows = markets, onOpen = onOpenArticle)
			}
			// Empty state — only when a query is active and every section came up empty.
			val marketsVisible = liveMarkets.isNotEmpty() || NewsArticleFeed.markets().any { matchesArticle(it) }
			if (q.isNotEmpty() && primaryBrief == null && liveForYou.isEmpty() && !marketsVisible) {
				Column(
					verticalArrangement = Arrangement.spacedBy((6 * u).dp),
					modifier = Modifier
						.fillMaxWidth()
						.clip(RoundedCornerShape((14 * u).dp))
						.background(News.CardBg)
						.padding((16 * u).dp),
				) {
					Text(
						text = "No results for “$q”",
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp),
						color = Color.White,
					)
					Text(
						text = "Try a different keyword — ticker, topic or source.",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = News.Muted,
					)
				}
			}
			Spacer(modifier = Modifier.height(0.dp))
		}
	}
}

/** Search over the whole story: headline, subtitle, source, tags, ticker. */
private fun articleMatches(a: NewsArticleFeed.Article, q: String): Boolean {
	if (q.isEmpty()) return true
	fun hit(t: String) = t.contains(q, ignoreCase = true)
	return hit(a.headline) || hit(a.subtitle) || hit(a.source) || a.tags.any(::hit) || (a.ticker?.let(::hit) ?: false)
}

/** Compact Market Mood row — live mood from /api/daily-brief, Canvas-drawn gauge. */
@Composable
private fun MoodMiniRow(mood: String?) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val moodLabel = when (mood?.lowercase()) {
		"bullish" -> "Bullish momentum"
		"mixed" -> "Mixed signals"
		"cautious" -> "Cautious tone"
		"bearish" -> "Bearish pressure"
		"volatile" -> "High volatility"
		"calm" -> "Calm markets"
		"risk-on" -> "Risk-On mode"
		"risk-off" -> "Risk-Off tone"
		null -> "Loading…"
		else -> mood.replaceFirstChar { it.uppercase() }
	}
	val moodColor = when (mood?.lowercase()) {
		"bullish", "risk-on" -> News.Green
		"mixed" -> Color(0xFFDEB940)
		"cautious", "volatile" -> Color(0xFFF5A623)
		"bearish" -> Color(0xFFFF5252)
		"risk-off" -> Color(0xFFB06BE3)
		else -> News.Teal
	}
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((12 * u).dp))
			.background(News.MoodBg)
			.padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
	) {
		Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp)) {
			Text(
				text = "Market Mood",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Text(
				text = moodLabel,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = moodColor,
			)
		}
		Spacer(modifier = Modifier.weight(1f))
		MoodGauge(mood = mood, u = u)
	}
}

@Composable
private fun MoodGauge(mood: String?, u: Float) {
	val moodColor = when (mood?.lowercase()) {
		"bullish", "risk-on" -> News.Green
		"mixed" -> Color(0xFFDEB940)
		"cautious", "volatile" -> Color(0xFFF5A623)
		"bearish" -> Color(0xFFFF5252)
		"risk-off" -> Color(0xFFB06BE3)
		else -> News.Teal
	}
	val fraction = when (mood?.lowercase()) {
		"bullish" -> 0.9f
		"risk-on" -> 0.78f
		"mixed", "calm", "volatile" -> 0.55f
		"cautious" -> 0.35f
		"risk-off" -> 0.25f
		"bearish" -> 0.1f
		else -> 0.5f
	}
	Canvas(modifier = androidx.compose.ui.Modifier.size((42 * u).dp, (22 * u).dp)) {
		val stroke = (2.8f * u).dp.toPx()
		val radius = size.height - stroke * 0.5f
		val cx = size.width / 2f
		val cy = size.height
		val arcTopLeft = androidx.compose.ui.geometry.Offset(cx - radius, cy - radius)
		val arcSize = androidx.compose.ui.geometry.Size(radius * 2, radius * 2)
		// Background arc (full upper semicircle, counter-clockwise from left to right)
		drawArc(
			color = Color(0xFF2A3346),
			startAngle = 180f,
			sweepAngle = -180f,
			useCenter = false,
			topLeft = arcTopLeft,
			size = arcSize,
			style = Stroke(width = stroke),
		)
		// Mood-coloured fill arc
		drawArc(
			color = moodColor,
			startAngle = 180f,
			sweepAngle = -(fraction * 180f),
			useCenter = false,
			topLeft = arcTopLeft,
			size = arcSize,
			style = Stroke(width = stroke, cap = StrokeCap.Round),
		)
		// Needle
		val angleRad = ((1f - fraction) * PI).toFloat()
		val needleLen = radius * 0.78f
		drawLine(
			color = Color.White.copy(alpha = 0.9f),
			start = androidx.compose.ui.geometry.Offset(cx, cy),
			end = androidx.compose.ui.geometry.Offset(
				cx + needleLen * cos(angleRad),
				cy - needleLen * sin(angleRad),
			),
			strokeWidth = (1.3f * u).dp.toPx(),
			cap = StrokeCap.Round,
		)
		drawCircle(
			color = Color.White.copy(alpha = 0.9f),
			radius = (1.5f * u).dp.toPx(),
			center = androidx.compose.ui.geometry.Offset(cx, cy),
		)
	}
}

/** One brief card — teal r18 feature card. Tapping it (or the "Read ›" link) calls [onRead]. */
@Composable
private fun BriefCard(brief: NewsBriefFeed.Brief, onRead: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((9 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((18 * u).dp))
			.background(News.Teal)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onRead,
			)
			.padding(start = (18 * u).dp, end = (18 * u).dp, top = (18 * u).dp, bottom = (16 * u).dp),
	) {
		Text(
			text = "TODAY\u2019S BRIEF",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, letterSpacing = (0.6 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Ink,
		)
		Text(
			text = brief.title,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (19 * u).sp, lineHeight = (25 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Ink,
		)
		Text(
			text = brief.body,
			// Authored Geist Regular 12 / lh17 (1:1265; the earlier 12.2 wrap
			// tweak assumed 13) - exact-design audit 2026-09-04.
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Ink,
		)
		Row(
			verticalAlignment = Alignment.CenterVertically,
			// Authored hf row is 21 tall with a 4 top pad (1:1266) - exact-design audit 2026-09-04.
			modifier = Modifier.fillMaxWidth().height((21 * u).dp).padding(top = (4 * u).dp),
		) {
			Text(
				text = brief.source,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = News.Ink.copy(alpha = 0.6f),
			)
			Spacer(modifier = Modifier.weight(1f))
			Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((4 * u).dp)) {
				Text(
					text = "Read",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
					color = News.Ink,
				)
				Text(
					text = "\u203a",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
					color = News.Ink,
				)
			}
		}
	}
}


/** Same blue card as BriefCard but with three pulsing placeholder bars while the brief loads. */
@Composable
private fun BriefLoadingCard() {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val transition = rememberInfiniteTransition(label = "brief-loading")
	val alpha by transition.animateFloat(
		initialValue = 0.25f,
		targetValue = 0.55f,
		animationSpec = infiniteRepeatable(animation = tween(800), repeatMode = RepeatMode.Reverse),
		label = "brief-shimmer",
	)
	val shimmer = News.Ink.copy(alpha = alpha)
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((18 * u).dp))
			.background(News.Teal)
			.padding(start = (18 * u).dp, end = (18 * u).dp, top = (18 * u).dp, bottom = (22 * u).dp),
	) {
		Text(
			text = "TODAY’S BRIEF",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, letterSpacing = (0.6 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Ink,
		)
		Box(modifier = Modifier.fillMaxWidth(0.78f).height((14 * u).dp).clip(RoundedCornerShape((4 * u).dp)).background(shimmer))
		Box(modifier = Modifier.fillMaxWidth(0.95f).height((10 * u).dp).clip(RoundedCornerShape((4 * u).dp)).background(shimmer))
		Box(modifier = Modifier.fillMaxWidth(0.60f).height((10 * u).dp).clip(RoundedCornerShape((4 * u).dp)).background(shimmer))
	}
}

/**
 * #242b3d r5 chip — Geist 8 #819abb. Medium for the row chips (1:1302);
 * the tile tags are authored Regular / Light (1:1280 / 1:1288) -
 * exact-design audit 2026-09-04.
 */
@Composable
internal fun NewsTag(text: String, letterSpacing: androidx.compose.ui.unit.TextUnit = 0.sp, weight: FontWeight = FontWeight.Medium) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		modifier = Modifier
			.clip(RoundedCornerShape((5 * u).dp))
			.background(News.ChipBg)
			.padding(horizontal = (7 * u).dp, vertical = (3 * u).dp),
	) {
		Text(
			text = text,
			style = TextStyle(fontFamily = Geist, fontWeight = weight, fontSize = (8 * u).sp, lineHeight = (10 * u).sp, letterSpacing = letterSpacing, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Muted,
		)
	}
}

/** Live market news rows — same card style as NewsSection, tap opens article URL in browser. */
@Composable
private fun LiveNewsSection(
	title: String,
	articles: List<NewsArticleDto>,
	onOpen: (String) -> Unit,
	onOpenArticle: ((NewsArticleDto) -> Unit)? = null,
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(verticalArrangement = com.stak.demo.ui.theme.fractionalSpacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
		Text(
			text = title,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.HeaderGray,
			modifier = Modifier.padding(bottom = (2 * u).dp),
		)
		articles.forEach { article ->
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
						onClick = { if (onOpenArticle != null) onOpenArticle(article) else onOpen(article.url) },
					)
					.padding((12 * u).dp),
			) {
				if (article.image.isNotBlank()) {
					coil.compose.AsyncImage(
						model = article.image,
						contentDescription = null,
						contentScale = ContentScale.Crop,
						modifier = Modifier.size((60 * u).dp).clip(RoundedCornerShape((10 * u).dp)),
					)
				}
				Column(verticalArrangement = Arrangement.spacedBy((5 * u).dp), modifier = Modifier.weight(1f)) {
					Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().height((16 * u).dp)) {
						Text(
							text = "${article.source} · ${formatNewsAge(article.datetime)}",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = News.Muted,
						)
					}
					Text(
						text = article.headline,
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Light, fontSize = (12 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Color.White,
					)
				}
			}
		}
	}
}

private fun formatNewsAge(datetime: Long): String = com.stak.demo.data.StakClock.newsAge(datetime)

/** "For You" / "Markets" — Sora 16 #d3d3d3 header + 60dp-thumb cards. */
@Composable
private fun NewsSection(
	title: String,
	rows: List<NewsArticleFeed.Article>,
	onOpen: (String) -> Unit,
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(verticalArrangement = fractionalSpacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
		Text(
			text = title,
			// Authored header: the 20-tall Sora 16 box + a 2 bottom pad (1:1293) - exact-design audit 2026-09-04.
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.HeaderGray,
			modifier = Modifier.padding(bottom = (2 * u).dp),
		)
		rows.forEach { row ->
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
						onClick = { onOpen(row.id) },
					)
					.padding((12 * u).dp),
			) {
				// Every row carries art (user, 2026-09-02 "there are no
				// pictures"): the bundled thumb when one was served, else
				// the story’s own media poster stands in.
				val m = row.media
				val thumbRes = row.thumbRes
					?: (m as? NewsMedia.Video)?.posterRes
					?: (m as? NewsMedia.Image)?.posterRes
				val thumbUrl = (m as? NewsMedia.Video)?.posterUrl ?: (m as? NewsMedia.Image)?.url
				val thumbMod = Modifier.size((60 * u).dp).clip(RoundedCornerShape((10 * u).dp))
				if (thumbRes != null) {
					Image(
						painter = painterResource(thumbRes),
						contentDescription = null,
						contentScale = ContentScale.Crop,
						modifier = thumbMod,
					)
				} else if (thumbUrl != null) {
					coil.compose.AsyncImage(
						model = thumbUrl,
						contentDescription = null,
						contentScale = ContentScale.Crop,
						modifier = thumbMod,
					)
				}
				Column(verticalArrangement = Arrangement.spacedBy((5 * u).dp), modifier = Modifier.weight(1f)) {
					// Authored meta row is 16 tall (1:1298, the chip's height) whether
					// or not the chip shows, so the card holds 84 - exact-design audit 2026-09-04.
					Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().height((16 * u).dp)) {
						Text(
							text = "${row.source} · ${row.age}",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = News.Muted,
						)
						Spacer(modifier = Modifier.weight(1f))
						// Only for stocks the user holds (user, 2026-08-23).
						if (com.stak.demo.data.MyStakHoldings.holdsAny(row.relatedTickers)) NewsTag(text = "In your STAK")
					}
					Text(
						text = row.headline,
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Light, fontSize = (12 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Color.White,
					)
				}
			}
		}
	}
}
