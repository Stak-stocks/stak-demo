package com.stak.demo.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.TrendingStock
import com.stak.demo.data.TrendingStocks
import com.stak.demo.ui.components.RefreshWhileVisible
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import kotlinx.coroutines.launch

private val CardBg = Color(0xFF171D2C)
private val Muted = Color(0xFF819ABB)
private val Green = Color(0xFF2FD08A)
private val Red = Color(0xFFE5484D)
private val Teal = Color(0xFF69B3CA)

/**
 * The Home dashboard's two board-only sections (FigJam Home board, 2026-09-14:
 * Dashboard -> Trending stocks, Saved peek). They sit under the authored stack
 * (mood card, why-card, deck banner) so the frame-exact part of Home is
 * untouched. Mirrors ios Home/HomeExtras.swift.
 */
@Composable
internal fun SectionKicker(text: String) {
	val u = figmaUnit()
	Text(text, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Muted, modifier = Modifier.fillMaxWidth())
}

/**
 * The day's biggest movers as a horizontal strip of tiles; a tap opens the stock.
 * Real market data for every account - this is the whole watchlist's movement,
 * not anyone's personal saves, so there's no demo/real split to make here.
 */
@Composable
internal fun TrendingStrip(onOpenStock: (String) -> Unit) {
	val u = figmaUnit()
	var trending by remember { mutableStateOf<List<TrendingStock>?>(null) }
	val scope = rememberCoroutineScope()
	// The backend's own list is cached a few minutes; re-asking more often than that
	// would only ever hand back the same ranking.
	RefreshWhileVisible(key = Unit, intervalMs = 3 * 60_000L, tickOnResume = true) {
		scope.launch { trending = TrendingStocks.fetch() }
	}
	LaunchedEffect(Unit) { if (trending == null) trending = TrendingStocks.fetch() }
	// Nothing to show while it's loading, and nothing to show if the request failed -
	// a placeholder row of blanks would claim a ranking that isn't there.
	val stocks = trending
	if (stocks.isNullOrEmpty()) return
	Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
		SectionKicker("TRENDING TODAY")
		Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
			stocks.forEach { s ->
				Column(
					verticalArrangement = Arrangement.spacedBy((6 * u).dp),
					modifier = Modifier
						.width((108 * u).dp)
						.clip(RoundedCornerShape((12 * u).dp))
						.background(CardBg)
						.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { onOpenStock(s.ticker) }
						.padding((12 * u).dp),
				) {
					Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
						Box(contentAlignment = Alignment.Center, modifier = Modifier.size((24 * u).dp).background(Color(0xFF242B3D), CircleShape)) {
							Text(s.ticker.take(1), style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (11 * u).sp), color = Color(0xFF9EADC7))
						}
						Text(s.ticker, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
					}
					Text("$" + String.format(java.util.Locale.US, "%.2f", s.price), style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = Color.White)
					Text(
						(if (s.changePercent >= 0) "▲ " else "▼ ") + String.format(java.util.Locale.US, "%.1f", kotlin.math.abs(s.changePercent)) + "% today",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
						color = if (s.changePercent >= 0) Green else Red,
					)
				}
			}
		}
	}
}

/**
 * A peek at the user's saves - up to three tickers and See all; empty accounts are
 * pointed at the deck. The rows are held by construction, so they open the saved
 * (My STAK) flavour of Stock Detail (review 2026-09-14). The company name comes from
 * the account's own saved-stock record where one exists (a real save); the demo
 * persona's seeded tickers fall back to the collection catalogue, since its saves
 * predate that record. The move is always a live quote - never the catalogue's fixed one.
 */
@Composable
internal fun SavedPeekCard(onOpenStock: (String) -> Unit, onOpenMyStak: () -> Unit, onOpenDeck: () -> Unit) {
	val u = figmaUnit()
	val held = MyStakHoldings.tickers
	val peekTickers = remember(held) { held.sorted().take(3) }
	var quotes by remember { mutableStateOf<Map<String, Pair<Double, Double>>>(emptyMap()) }
	LaunchedEffect(peekTickers) {
		quotes = peekTickers.associateWith { com.stak.demo.data.LiveQuotes.quote(it) }
			.mapNotNull { (t, q) -> q?.let { t to it } }.toMap()
	}
	Column(
		verticalArrangement = Arrangement.spacedBy((10 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((12 * u).dp)).background(CardBg).padding((14 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
			Text("IN YOUR STAK", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Muted)
			Spacer(modifier = Modifier.weight(1f))
			Text(
				if (held.isEmpty()) "Go to deck ›" else "See all ${held.size} ›",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
				color = Teal,
				modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { if (held.isEmpty()) onOpenDeck() else onOpenMyStak() },
			)
		}
		if (peekTickers.isEmpty()) {
			Text(
				"Nothing saved yet. Swipe today’s deck and your saves show up here.",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Light, fontSize = (12 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
		} else {
			peekTickers.forEach { ticker ->
				val name = MyStakHoldings.nameOf(ticker) ?: StockCatalogue.all.firstOrNull { it.ticker == ticker }?.company ?: ticker
				val quote = quotes[ticker]
				Row(
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy((10 * u).dp),
					modifier = Modifier.fillMaxWidth().clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { onOpenStock(ticker) },
				) {
					Box(contentAlignment = Alignment.Center, modifier = Modifier.size((28 * u).dp).background(Color(0xFF242B3D), CircleShape)) {
						Text(ticker.take(1), style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp), color = Color(0xFF9EADC7))
					}
					Column(modifier = Modifier.weight(1f)) {
						Text(ticker, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
						Text(name, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Muted)
					}
					Text(
						if (quote == null) "—" else (if (quote.second >= 0) "▲ " else "▼ ") + String.format(java.util.Locale.US, "%.1f", kotlin.math.abs(quote.second)) + "%",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
						color = if (quote == null) Muted else if (quote.second >= 0) Green else Red,
					)
				}
			}
		}
	}
}
