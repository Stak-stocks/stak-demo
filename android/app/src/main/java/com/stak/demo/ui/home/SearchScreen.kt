package com.stak.demo.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.ui.focus.focusRequester
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.MyStakHoldings
import com.stak.demo.ui.mystak.CollStock
import com.stak.demo.ui.news.NewsArticleFeed
import com.stak.demo.ui.onboarding.Auth
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.profile.SettingsChip
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

private val CardBg = Color(0xFF10182B)
private val Muted = Color(0xFF819ABB)
private val Green = Color(0xFF2FD08A)
private val Red = Color(0xFFE5484D)

/** What the results show - the board's filter chips. */
private enum class SearchFilter(val label: String) { ALL("All"), STOCKS("Stocks"), NEWS("News"), SAVED("Saved") }

/**
 * Home · Search (FigJam Home board, 2026-09-14: Search -> Search bar, Filters,
 * Results). No frame exists for it, so it borrows the settings pages' language.
 * Stocks come from the catalogue, stories from the news feed; a stock row opens
 * its Stock Detail, a story its article. An empty query shows the day's movers
 * and the user's saves. Mirrors ios Home/SearchView.swift.
 */
@Composable
fun SearchScreen(onBack: () -> Unit, onOpenStock: (String) -> Unit, onOpenArticle: (String) -> Unit) {
	val u = figmaUnit()
	var query by rememberSaveable { mutableStateOf("") }
	var filter by rememberSaveable { mutableStateOf(SearchFilter.ALL) }
	val focus = remember { FocusRequester() }
	LaunchedEffect(Unit) { focus.requestFocus() }

	val held = MyStakHoldings.tickers
	val q = query.trim()
	val stocks = if (q.isEmpty()) StockCatalogue.trending() else StockCatalogue.search(q)
	val saved = (if (q.isEmpty()) StockCatalogue.all else StockCatalogue.search(q)).filter { it.ticker in held }
	val stories = if (q.isEmpty()) emptyList() else NewsArticleFeed.searchable().filter { a ->
		a.headline.contains(q, ignoreCase = true) || a.category.contains(q, ignoreCase = true) ||
			a.relatedTickers.any { it.equals(q, ignoreCase = true) } || a.source.contains(q, ignoreCase = true)
	}

	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		// Header: back circle + the search bar.
		Row(
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
			modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(start = (20 * u).dp, end = (20 * u).dp, top = (8 * u).dp, bottom = (12 * u).dp),
		) {
			AuthBackCircle(onClick = onBack)
			val style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, color = StakColors.TextPrimary)
			Row(
				verticalAlignment = Alignment.CenterVertically,
				modifier = Modifier.weight(1f).height((44 * u).dp).background(Auth.InputBg, RoundedCornerShape((14 * u).dp)).padding(horizontal = (14 * u).dp),
			) {
				SearchGlyph(size = (14 * u).dp, tint = Muted)
				Spacer(modifier = Modifier.width((8 * u).dp))
				Box(modifier = Modifier.weight(1f)) {
					if (query.isEmpty()) Text("Search stocks and news", style = style, color = Muted)
					BasicTextField(
						value = query,
						onValueChange = { query = it },
						textStyle = style,
						singleLine = true,
						cursorBrush = SolidColor(StakColors.Accent),
						keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
						modifier = Modifier.fillMaxWidth().focusRequester(focus).semantics { contentDescription = "Search" },
					)
				}
				if (query.isNotEmpty()) {
					Text(
						"✕",
						style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp),
						color = Muted,
						modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { query = "" },
					)
				}
			}
		}
		// Filters.
		Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp)) {
			SearchFilter.entries.forEach { f -> SettingsChip(label = f.label, selected = filter == f) { filter = f } }
		}
		Column(
			verticalArrangement = Arrangement.spacedBy((12 * u).dp),
			modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = (20 * u).dp).padding(top = (16 * u).dp, bottom = (26 * u).dp),
		) {
			val showStocks = filter == SearchFilter.ALL || filter == SearchFilter.STOCKS
			val showNews = filter == SearchFilter.ALL || filter == SearchFilter.NEWS
			val showSaved = filter == SearchFilter.SAVED
			if (showStocks && stocks.isNotEmpty()) {
				Kicker(if (q.isEmpty()) "TRENDING TODAY" else "STOCKS")
				ResultCard { stocks.forEach { StockRow(it, saved = it.ticker in held) { onOpenStock(it.ticker) } } }
			}
			if (showSaved) {
				Kicker("IN YOUR STAK")
				if (saved.isEmpty()) {
					EmptyLine(if (q.isEmpty()) "Nothing saved yet. Swipe the deck to start." else "None of your saves match “$q”.")
				} else {
					ResultCard { saved.forEach { StockRow(it, saved = true) { onOpenStock(it.ticker) } } }
				}
			}
			if (showNews) {
				if (stories.isNotEmpty()) {
					Kicker("NEWS")
					ResultCard { stories.forEach { StoryRow(it) { onOpenArticle(it.id) } } }
				} else if (q.isNotEmpty() && filter == SearchFilter.NEWS) {
					EmptyLine("No stories match “$q”.")
				}
			}
			if (q.isNotEmpty() && filter == SearchFilter.ALL && stocks.isEmpty() && stories.isEmpty()) {
				EmptyLine("Nothing for “$q”. Try a ticker like NVDA or a company name.")
			}
			if (q.isNotEmpty() && filter == SearchFilter.STOCKS && stocks.isEmpty()) {
				EmptyLine("No stocks match “$q”.")
			}
		}
	}
}

@Composable
private fun Kicker(text: String) {
	val u = figmaUnit()
	Text(text, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Muted)
}

@Composable
private fun EmptyLine(text: String) {
	val u = figmaUnit()
	Text(text, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color(0xFFC8D2E0))
}

@Composable
private fun ResultCard(content: @Composable () -> Unit) {
	val u = figmaUnit()
	Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding(vertical = (4 * u).dp)) { content() }
}

/** A stock result: badge circle, ticker + company, quote + day move, and the saved tick. */
@Composable
internal fun StockRow(stock: CollStock, saved: Boolean, onClick: () -> Unit) {
	val u = figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.height((56 * u).dp)
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick)
			.padding(horizontal = (14 * u).dp),
	) {
		Box(contentAlignment = Alignment.Center, modifier = Modifier.size((32 * u).dp).background(Color(0xFF242B3D), CircleShape)) {
			Text(stock.badge, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp), color = Color(0xFF9EADC7))
		}
		Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
			Row(horizontalArrangement = Arrangement.spacedBy((6 * u).dp), verticalAlignment = Alignment.CenterVertically) {
				Text(stock.ticker, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
				if (saved) Text("In your STAK", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp), color = Color(0xFF7FD4E8))
			}
			Text(stock.company, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Muted)
		}
		Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy((2 * u).dp)) {
			Text(stock.price, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
			Text(stock.change, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = if (stock.up) Green else Red)
		}
	}
}

@Composable
private fun StoryRow(a: NewsArticleFeed.Article, onClick: () -> Unit) {
	val u = figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((4 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick)
			.padding(horizontal = (14 * u).dp, vertical = (10 * u).dp),
	) {
		Text("${a.source} · ${a.age} · ${a.category}", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Muted)
		Text(a.headline, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color.White)
	}
}

/** A magnifier drawn from a ring and a handle - no authored glyph exists. */
@Composable
internal fun SearchGlyph(size: androidx.compose.ui.unit.Dp, tint: Color) {
	androidx.compose.foundation.Canvas(modifier = Modifier.size(size)) {
		val s = this.size.minDimension
		val stroke = s * 0.12f
		val r = s * 0.32f
		drawCircle(color = tint, radius = r, center = androidx.compose.ui.geometry.Offset(s * 0.42f, s * 0.42f), style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke))
		drawLine(
			color = tint,
			start = androidx.compose.ui.geometry.Offset(s * 0.66f, s * 0.66f),
			end = androidx.compose.ui.geometry.Offset(s * 0.92f, s * 0.92f),
			strokeWidth = stroke,
			cap = androidx.compose.ui.graphics.StrokeCap.Round,
		)
	}
}
