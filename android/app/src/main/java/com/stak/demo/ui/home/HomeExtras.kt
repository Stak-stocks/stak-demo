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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.MyStakHoldings
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora

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

/** The day's biggest movers as a horizontal strip of tiles; a tap opens the stock. */
@Composable
internal fun TrendingStrip(onOpenStock: (String) -> Unit) {
	val u = figmaUnit()
	Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
		SectionKicker("TRENDING TODAY")
		Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
			StockCatalogue.trending().forEach { s ->
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
							Text(s.badge, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (11 * u).sp), color = Color(0xFF9EADC7))
						}
						Text(s.ticker, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
					}
					Text(s.price, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = Color.White)
					Text(s.change, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = if (s.up) Green else Red)
				}
			}
		}
	}
}

/** A peek at the user's saves - up to three tickers and See all; empty accounts are pointed at the deck. */
@Composable
internal fun SavedPeekCard(onOpenStock: (String) -> Unit, onOpenMyStak: () -> Unit, onOpenDeck: () -> Unit) {
	val u = figmaUnit()
	val held = MyStakHoldings.tickers
	val peek = StockCatalogue.all.filter { it.ticker in held }.take(3)
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
		if (peek.isEmpty()) {
			Text(
				if (held.isEmpty()) "Nothing saved yet. Swipe today’s deck and your saves show up here." else "Your saves live in My STAK.",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Light, fontSize = (12 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
		} else {
			peek.forEach { s ->
				Row(
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy((10 * u).dp),
					modifier = Modifier.fillMaxWidth().clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { onOpenStock(s.ticker) },
				) {
					Box(contentAlignment = Alignment.Center, modifier = Modifier.size((28 * u).dp).background(Color(0xFF242B3D), CircleShape)) {
						Text(s.badge, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp), color = Color(0xFF9EADC7))
					}
					Column(modifier = Modifier.weight(1f)) {
						Text(s.ticker, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
						Text(s.company, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Muted)
					}
					Text(s.change, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = if (s.up) Green else Red)
				}
			}
		}
	}
}
