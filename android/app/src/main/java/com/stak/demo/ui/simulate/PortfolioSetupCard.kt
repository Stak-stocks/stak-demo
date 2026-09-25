package com.stak.demo.ui.simulate

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.profile.SettingsChip
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora

/** The three starting balances the board's "Choose balance" offers. */
internal val SETUP_BALANCES = listOf(1_000.0, 10_000.0, 100_000.0)

/** One strategy the board's "Strategy" step offers - the label is the persisted value, the blurb its one-line read. */
internal data class SetupStrategy(val label: String, val blurb: String)

internal val SETUP_STRATEGIES = listOf(
	SetupStrategy("Cautious", "Small stakes, steady names. Aim to beat a savings account."),
	SetupStrategy("Balanced", "A mix of steady and growth picks. The default most people start on."),
	SetupStrategy("Bold", "Bigger swings on high-growth picks. Expect bumps."),
)
private val DEFAULT_BALANCE = SETUP_BALANCES.indexOf(10_000.0)
private val DEFAULT_STRATEGY = SETUP_STRATEGIES.indexOfFirst { it.label == PaperPortfolio.DEFAULT_STRATEGY }

/**
 * Portfolio setup (FigJam Simulate board, 2026-09-14: Portfolio setup -> Choose
 * balance, Name, Strategy). A NEW account sees it on Simulate home until it
 * starts practising; the demo persona's authored $10,000 portfolio is already
 * set up. Mirrors ios Simulate/PortfolioSetupCard.swift.
 */
@Composable
internal fun PortfolioSetupCard() {
	val u = figmaUnit()
	var balance by rememberSaveable { mutableIntStateOf(DEFAULT_BALANCE) }
	var name by rememberSaveable { mutableStateOf("") }
	var strategy by rememberSaveable { mutableIntStateOf(DEFAULT_STRATEGY) }
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Sim.CardBg).padding((16 * u).dp),
	) {
		Text("SET UP YOUR PAPER PORTFOLIO", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Teal)
		Text("Pick a starting balance, name it and choose how you want to play. Nothing here is real money.", style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Body)

		Text("Starting balance", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
		Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
			SETUP_BALANCES.forEachIndexed { i, b -> SettingsChip(label = PaperPortfolio.wholeUsd(b), selected = balance == i) { balance = i } }
		}

		Text("Portfolio name", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
		val style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, color = Color.White, lineHeightStyle = FIGMA_LINE_BOX)
		BasicTextField(
			value = name,
			onValueChange = { name = it.take(24) },
			singleLine = true,
			textStyle = style,
			cursorBrush = SolidColor(Sim.Teal),
			decorationBox = { inner ->
				Box(contentAlignment = Alignment.CenterStart) {
					if (name.isEmpty()) Text(PaperPortfolio.DEFAULT_PORTFOLIO_NAME, style = style, color = Sim.Muted)
					inner()
				}
			},
			modifier = Modifier
				.fillMaxWidth()
				.clip(RoundedCornerShape((10 * u).dp))
				.background(Sim.ChipBg)
				.border((0.5 * u).dp, Sim.Track, RoundedCornerShape((10 * u).dp))
				.padding(horizontal = (12 * u).dp, vertical = (10 * u).dp),
		)

		Text("Strategy", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
		Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
			SETUP_STRATEGIES.forEachIndexed { i, s -> SettingsChip(label = s.label, selected = strategy == i) { strategy = i } }
		}
		Text(
			SETUP_STRATEGIES[strategy].blurb,
			style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Sim.Muted,
		)

		Box(
			contentAlignment = Alignment.Center,
			modifier = Modifier
				.fillMaxWidth()
				.clip(RoundedCornerShape((6 * u).dp))
				.background(Sim.DarkCta)
				.border((0.36 * u).dp, Sim.CtaBorder, RoundedCornerShape((6 * u).dp))
				.clickable {
					PaperPortfolio.setup(SETUP_BALANCES[balance], name.trim().ifEmpty { PaperPortfolio.DEFAULT_PORTFOLIO_NAME }, SETUP_STRATEGIES[strategy].label)
				}
				.padding(vertical = (14 * u).dp),
		) {
			Text("Start practising", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = Color.White)
		}
	}
}

/** The set-up portfolio's one-line badge under the hero: name · strategy · started on $X. */
@Composable
internal fun PortfolioSetupLine() {
	val u = figmaUnit()
	Text(
		"${PaperPortfolio.portfolioName} · ${PaperPortfolio.strategy} · started on ${PaperPortfolio.wholeUsd(PaperPortfolio.paperStart)}",
		style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
		color = Sim.Muted,
		modifier = Modifier.fillMaxWidth(),
	)
}
