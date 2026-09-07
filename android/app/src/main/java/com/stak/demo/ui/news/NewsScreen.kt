package com.stak.demo.ui.news

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.fractionalSpacedBy
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
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
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
fun NewsScreen(onOpenArticle: (String) -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
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
				.padding(horizontal = (20 * u).dp)
				.padding(top = (22 * u).dp),
		) {
			if (q.isEmpty()) MoodMiniRow()
			// Designer's call (2026-08-22): today's brief on tap leads to the
			// News info page (the Story tile stays wired per panel 1:1228).
			// Only the briefs that match ride the carousel (Codex audit
			// 2026-09-04: one hit used to show all four pages).
			val briefHits = NewsBriefFeed.briefs().withIndex().filter { matchesBrief(it.value) }
			if (briefHits.isNotEmpty()) {
				// Each brief opens ITS OWN article (user, 2026-08-25). The
				// index guard covers a served brief without a mapped article.
				BriefCarousel(
					briefs = briefHits.map { it.value },
					onRead = { page -> NewsArticleFeed.BRIEF_ARTICLES.getOrNull(briefHits[page].index)?.let(onOpenArticle) },
				)
			}
			StoryGrid(onOpenArticle = onOpenArticle, query = q)
			// The rows render from the served section feeds - STRICT stock
			// news only (user, 2026-08-25); EVERY story opens its article.
			// Each story names the stocks it relates to; the "In your STAK"
			// chip shows only when one of them is in the user's My STAK.
			val forYou = NewsArticleFeed.forYou().filter { matchesArticle(it) }
			if (forYou.isNotEmpty()) NewsSection(title = "For You", rows = forYou, onOpen = onOpenArticle)
			val markets = NewsArticleFeed.markets().filter { matchesArticle(it) }
			if (markets.isNotEmpty()) NewsSection(title = "Markets", rows = markets, onOpen = onOpenArticle)
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

/**
 * Compact Market Mood row — #171d2c r12 with the small low-volatility
 * gauge, exactly as authored (user, 2026-09-04 (CHINEDU 03 · News 1:1228): the authored look wins); Home's card keeps its own live line.
 */
@Composable
private fun MoodMiniRow() {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
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
				text = "Low volatility",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = News.Teal,
			)
		}
		Spacer(modifier = Modifier.weight(1f))
		Image(
			painter = painterResource(R.drawable.news_gauge_small),
			contentDescription = null,
			modifier = Modifier.size((40.97 * u).dp, (20.76 * u).dp),
		)
	}
}

/**
 * TODAY'S BRIEF — teal r18 feature card + pager dots. The user swipes
 * left and right through the served briefs (user, 2026-08-22); the
 * active dot follows the page. Text comes from NewsBriefFeed.
 */
@Composable
private fun BriefCarousel(briefs: List<NewsBriefFeed.Brief>, onRead: (Int) -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	// Keyed on the page count so a narrowing search never leaves the pager
	// parked past its last page.
	val pager = androidx.compose.runtime.key(briefs.size) {
		androidx.compose.foundation.pager.rememberPagerState(pageCount = { briefs.size })
	}
	Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
		androidx.compose.foundation.pager.HorizontalPager(
			state = pager,
			modifier = Modifier.fillMaxWidth(),
		) { page ->
			BriefCard(brief = briefs[page], onRead = { onRead(page) })
		}
		// Pager dots — the active page is the 16x6 teal pill, the rest
		// 6px #5c6b85 dots, 6px gaps: the authored 52x6 strip.
		Row(
			horizontalArrangement = Arrangement.spacedBy((6 * u).dp),
			verticalAlignment = Alignment.CenterVertically,
			modifier = Modifier.height((6 * u).dp),
		) {
			for (i in briefs.indices) {
				if (i == pager.currentPage) {
					Box(modifier = Modifier.size((16 * u).dp, (6 * u).dp).background(News.Teal, RoundedCornerShape((3 * u).dp)))
				} else {
					Box(modifier = Modifier.size((6 * u).dp).background(Color(0xFF5C6B85), CircleShape))
				}
			}
		}
		// Authored carousel block (1:1261) is 229 tall: 15 of slack under the dots.
		Spacer(modifier = Modifier.height((3 * u).dp))
	}
}

/** One brief card in the carousel slot. */
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

/**
 * The two 128dp story tiles. The tags are authored SLOT labels (1:1228:
 * "Markets" = the day's top stock story, "Your stocks" = the top story
 * from the user's holdings); the tile copy renders from the SERVED
 * story - the frame's copy was placeholder (user, 2026-08-25: "the
 * design by the ui is just placeholder"), and only strict stock news
 * is served.
 */
@Composable
private fun StoryGrid(onOpenArticle: (String) -> Unit, query: String = "") {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val market = NewsArticleFeed.article(NewsArticleFeed.MARKET_TILE)
	// A story about a held stock, else the authored Apple story as a plain "Trending" tile (product audit, 2026-09-05).
	val yoursHeld = NewsArticleFeed.yourStocksTile()
	val yours = yoursHeld ?: NewsArticleFeed.article(NewsArticleFeed.APPLE)
	fun visible(a: NewsArticleFeed.Article) = NewsArticleFeed.isStockNews(a) && articleMatches(a, query)
	val showMarket = visible(market)
	val showYours = visible(yours)
	if (!showMarket && !showYours) return
	Row(horizontalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.fillMaxWidth().height((128 * u).dp)) {
		if (showMarket) {
			StoryTile(
				tag = "Markets",
				// Authored Geist Regular (1:1280) - exact-design audit 2026-09-04.
				tagWeight = FontWeight.Normal,
				headline = market.headline,
				source = "${market.source} · ${market.age}",
				onClick = { onOpenArticle(market.id) },
				modifier = Modifier.weight(1f),
			)
		}
		if (showYours) {
			StoryTile(
				tag = if (yoursHeld != null) "Your stocks" else "Trending",
				// Authored Geist Light (1:1288) - exact-design audit 2026-09-04.
				tagWeight = FontWeight.Light,
				headline = yours.headline,
				source = "${yours.source} · ${yours.age}",
				onClick = { onOpenArticle(yours.id) },
				modifier = Modifier.weight(1f),
			)
		}
	}
}

@Composable
private fun StoryTile(tag: String, tagWeight: FontWeight, headline: String, source: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((8 * u).dp),
		modifier = modifier
			.height((128 * u).dp)
			.clip(RoundedCornerShape((12 * u).dp))
			.background(News.CardBg)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			)
			.padding((14 * u).dp),
	) {
		NewsTag(text = tag, letterSpacing = (0.4 * u).sp, weight = tagWeight)
		Text(
			text = headline,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Light, fontSize = (12 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		Spacer(modifier = Modifier.weight(1f))
		Text(
			text = source,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = News.Muted,
		)
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
