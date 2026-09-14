package com.stak.demo.ui.simulate

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.profile.SettingsChip
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import java.util.Locale

/**
 * The Portfolio page's Open orders and Trade history (FigJam Simulate board,
 * 2026-09-14: Buy order -> Market or limit; Trade history -> Trade log, Filter).
 * Both borrow the SOLD · REALIZED kicker and row language (1:4605 / 1:4607).
 * Mirrors ios Simulate/TradeHistory.swift.
 */
@Composable
internal fun PortfolioKicker(text: String) {
	val u = figmaUnit()
	Box(contentAlignment = Alignment.BottomStart, modifier = Modifier.fillMaxWidth().height((17 * u).dp).padding(start = (2 * u).dp)) {
		Text(text, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, letterSpacing = (0.9 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Faint)
	}
}

/** Limit orders waiting for their price, each with Cancel (releases the reserved stake). */
@Composable
internal fun OpenOrdersSection() {
	val u = figmaUnit()
	val orders = PaperPortfolio.openOrders
	if (orders.isEmpty()) return
	PortfolioKicker("OPEN ORDERS")
	orders.forEach { o ->
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.fillMaxWidth()) {
			Box(contentAlignment = Alignment.Center, modifier = Modifier.size((36 * u).dp).background(Sim.ChipBg, CircleShape)) {
				Text(o.badge, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = Sim.BadgeInk)
			}
			Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
				Text("Buy ${o.symbol} · limit ${PaperPortfolio.usd(o.limit)}", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = Color.White)
				Text("${PaperPortfolio.usd(o.amount)} reserved · placed ${o.day} · pending", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Light, fontSize = (11 * u).sp), color = Sim.Muted)
			}
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier
					.size((64 * u).dp, (30 * u).dp)
					.clip(RoundedCornerShape((6 * u).dp))
					.border((1 * u).dp, Color(0x24FFFFFF), RoundedCornerShape((6 * u).dp))
					.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { PaperPortfolio.cancelOrder(o.id) },
			) {
				Text("Cancel", style = TextStyle(fontFamily = Sora, fontSize = (12 * u).sp), color = Sim.Muted)
			}
		}
	}
}

/** Every buy and sell, newest first, filtered by the All / Buys / Sells chips. */
@Composable
internal fun TradeHistorySection(filter: Int, onFilter: (Int) -> Unit) {
	val u = figmaUnit()
	val all = PaperPortfolio.trades
	if (all.isEmpty()) return
	PortfolioKicker("TRADE HISTORY")
	Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
		listOf("All", "Buys", "Sells").forEachIndexed { i, label -> SettingsChip(label = label, selected = filter == i) { onFilter(i) } }
	}
	val shown = when (filter) {
		1 -> all.filter { it.isBuy }
		2 -> all.filter { !it.isBuy }
		else -> all
	}
	if (shown.isEmpty()) {
		Text(if (filter == 1) "No buys yet." else "No sells yet.", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Sim.Faint)
	}
	shown.forEach { t ->
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.fillMaxWidth().alpha(0.85f)) {
			Box(contentAlignment = Alignment.Center, modifier = Modifier.size((36 * u).dp).background(Sim.ChipBg, CircleShape).alpha(0.7f)) {
				Text(t.badge, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = Sim.BadgeInk)
			}
			Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
				Text("${if (t.isBuy) "Bought" else "Sold"} ${t.symbol}", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp), color = Sim.HeaderGray)
				Text("${t.day} · ${String.format(Locale.US, "%.4f", t.shares)} sh at ${PaperPortfolio.usd(t.price)}", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Light, fontSize = (10 * u).sp), color = Sim.Faint)
			}
			Text(
				(if (t.isBuy) "-" else "+") + PaperPortfolio.usd(t.amount),
				style = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp),
				color = if (t.isBuy) Sim.HeaderGray else Sim.Green,
			)
		}
	}
}
