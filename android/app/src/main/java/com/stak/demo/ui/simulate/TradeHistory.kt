package com.stak.demo.ui.simulate

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist

/**
 * The Portfolio page's kicker (SOLD · REALIZED, 1:4605). The FigJam Open orders / Trade history
 * sections that lived here were removed on 2026-10-07 (user ruling: not in the Figma - 1:4876 ends
 * at the footnote). Mirrors ios Simulate/TradeHistory.swift.
 */
/** 1:4605 gk (exact-design audit 2026-09-04): the kicker sits 4 below the box top (13 in a 17), not centred - the one source for SOLD · REALIZED. */
@Composable
internal fun PortfolioKicker(text: String) {
	val u = figmaUnit()
	Box(contentAlignment = Alignment.BottomStart, modifier = Modifier.fillMaxWidth().height((17 * u).dp).padding(start = (2 * u).dp)) {
		Text(text, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, letterSpacing = (0.9 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Faint)
	}
}
