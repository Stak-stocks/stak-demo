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
import androidx.compose.runtime.LaunchedEffect
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
import com.stak.demo.data.StakStore
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.profile.SettingsChip
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora

/** The starting balances - what the user would really invest (one money system, 2026-10-07). Mirrors
 *  shared/src/sandboxConfig.ts's SANDBOX_STARTING_BALANCES, which the backend validates against (kept in
 *  sync by hand). */
internal val SETUP_BALANCES = listOf(500.0, 1_000.0, 5_000.0, 10_000.0)

/** Matches shared/src/sandboxConfig.ts's SANDBOX_NAME_MAX_LENGTH - the backend's own limit
 *  (Kotlin can't import that file directly; keep this in sync with it by hand). */
private const val SETUP_NAME_MAX_LENGTH = 40

/** One strategy the board's "Strategy" step offers - the label is the persisted value, the blurb its one-line read. */
internal data class SetupStrategy(val label: String, val blurb: String)

internal val SETUP_STRATEGIES = listOf(
	SetupStrategy("Cautious", "Small stakes, steady names. Aim to beat a savings account."),
	SetupStrategy("Balanced", "A mix of steady and growth picks. The default most people start on."),
	SetupStrategy("Bold", "Bigger swings on high-growth picks. Expect bumps."),
)
/** The balance the form starts on, and a portfolio set up for the user (a trade before the form) starts with.
 *  Mirrors shared/src/sandboxConfig.ts's SANDBOX_DEFAULT_STARTING_BALANCE. */
internal const val DEFAULT_SETUP_BALANCE = 1_000.0
private val DEFAULT_BALANCE = SETUP_BALANCES.indexOf(DEFAULT_SETUP_BALANCE)
private val DEFAULT_STRATEGY = SETUP_STRATEGIES.indexOfFirst { it.label == PaperPortfolio.DEFAULT_STRATEGY }

/**
 * Portfolio setup (FigJam Simulate board, 2026-09-14: Portfolio setup -> Choose
 * balance, Name, Strategy). A NEW account sees it on Simulate home until it
 * starts practicing; the demo persona's authored $10,000 portfolio is already
 * set up. Mirrors ios Simulate/PortfolioSetupCard.swift.
 */
@Composable
internal fun PortfolioSetupCard() {
	val u = figmaUnit()
	// The half-filled form is remembered on the phone too, so a relaunch or a log out / in
	// doesn't send the picks back to the defaults before "Start practicing" is tapped.
	// The draft keeps the AMOUNT: an index would point at a different one whenever the list changes.
	var balance by rememberSaveable { mutableIntStateOf(SETUP_BALANCES.indexOf(StakStore.getInt("setup_draft_balance_amount", DEFAULT_SETUP_BALANCE.toInt()).toDouble()).takeIf { it >= 0 } ?: DEFAULT_BALANCE) }
	var name by rememberSaveable { mutableStateOf(StakStore.getString("setup_draft_name") ?: "") }
	var strategy by rememberSaveable { mutableIntStateOf(StakStore.getInt("setup_draft_strategy", DEFAULT_STRATEGY).coerceIn(SETUP_STRATEGIES.indices)) }
	LaunchedEffect(balance, name, strategy) {
		StakStore.putInt("setup_draft_balance_amount", SETUP_BALANCES[balance].toInt())
		StakStore.putString("setup_draft_name", name)
		StakStore.putInt("setup_draft_strategy", strategy)
	}
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Sim.CardBg).padding((16 * u).dp),
	) {
		Text("SET UP YOUR PAPER PORTFOLIO", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Teal)
		Text("Start with what you’d really invest, so practice feels like the real thing. Name it and choose how you want to play. Nothing here is real money.", style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Body)

		Text("Starting balance", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
		Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
			SETUP_BALANCES.forEachIndexed { i, b -> SettingsChip(label = PaperPortfolio.wholeUsd(b), selected = balance == i) { balance = i } }
		}

		Text("Portfolio name", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
		val style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, color = Color.White, lineHeightStyle = FIGMA_LINE_BOX)
		BasicTextField(
			value = name,
			onValueChange = { name = it.take(SETUP_NAME_MAX_LENGTH) },
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
			Text("Start practicing", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = Color.White)
		}
	}
}

/** The set-up portfolio's one-line badge under the hero: name · strategy · started with $X. */
@Composable
internal fun PortfolioSetupLine() {
	val u = figmaUnit()
	// A portfolio from before setup existed has no name or strategy: just what it started with.
	val parts = listOf(PaperPortfolio.portfolioName, PaperPortfolio.strategy).filter { it.isNotEmpty() }
	Text(
		(parts + "started with ${PaperPortfolio.wholeUsd(PaperPortfolio.paperStart)}").joinToString(" · "),
		style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
		color = Sim.Muted,
		modifier = Modifier.fillMaxWidth(),
	)
}
