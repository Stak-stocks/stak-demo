package com.stak.demo.ui.mystak

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.data.StakEvents
import com.stak.demo.data.TasteGraph
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/**
 * Your Investing Taste — what draws the user's attention, the evidence behind it, and
 * what STAK does with it (My STAK product spec, Sept 2026, §4).
 *
 * Everything here is observable behaviour: companies saved, cards explored, pages
 * opened. It never says the user understands or intends anything, and no figure on the
 * page describes money.
 */
@Composable
fun TasteGraphScreen(onBack: () -> Unit, viewModel: MyStakViewModel = sharedMyStakViewModel()) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val ui by viewModel.ui.collectAsState()
	val taste = ui.taste
	LaunchedEffect(Unit) {
		viewModel.loadTaste()
		StakEvents.log(StakEvents.TASTE_GRAPH_OPEN)
	}
	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Box(modifier = Modifier.fillMaxWidth().statusBarsPadding().height((56 * u).dp)) {
			AuthBackCircle(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart).padding(start = (20 * u).dp))
		}
		Column(
			verticalArrangement = Arrangement.spacedBy((16 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.navigationBarsPadding()
				.padding(horizontal = (20 * u).dp)
				.padding(top = (8 * u).dp, bottom = (32 * u).dp),
		) {
			Column(verticalArrangement = Arrangement.spacedBy((4 * u).dp)) {
				Text(
					text = "Your Investing Taste",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (24 * u).sp, lineHeight = (30 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Text(
					text = "Built from what you save and explore.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Muted,
				)
			}
			if (taste == null || taste.isEmpty) {
				TasteCardShell("What draws your attention") {
					Text(
						text = if (taste == null) "Reading your activity…" else "Still learning your taste. Save a few companies in Discover and this fills in.",
						style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Stak.Body,
					)
				}
			} else {
				TasteCardShell("What draws your attention") {
					// Tapping a theme shows the activity behind it, rather than asking the
					// user to take the label on trust.
					taste.themes.forEach { theme -> ThemeRow(theme, taste) }
					if (taste.learning) {
						Text(
							text = "Still learning your taste — these grow firmer as you save and explore more.",
							style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Stak.Muted,
						)
					}
				}
				val evidence = taste.evidence
				if (evidence.isNotEmpty()) {
					TasteCardShell("Why STAK thinks this") {
						evidence.forEach { e ->
							Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp)) {
								Text(
									text = e.text,
									style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
									color = Color.White,
								)
								Text(
									text = e.detail,
									style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
									color = Stak.Muted,
								)
							}
						}
					}
				}
			}
			TasteCardShell("What STAK does with your activity") {
				ShapesRow("Discover", "More companies like the ones you save")
				ShapesRow("Daily Brief", "More context on the themes you follow")
			}
			Text(
				text = "Your taste evolves as you explore.",
				style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Stak.Faint,
			)
		}
	}
}

/** One theme: its name, how firmly STAK can state it, and its evidence when opened. */
@Composable
private fun ThemeRow(theme: TasteGraph.Theme, graph: TasteGraph.Graph) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	var open by rememberSaveable(theme.label) { mutableStateOf(false) }
	Column(
		verticalArrangement = Arrangement.spacedBy((8 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
			) { open = !open },
	) {
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
			ThemeIcon(theme)
			Text(
				text = theme.label,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Spacer(modifier = Modifier.weight(1f))
			StrengthChip(theme.strength)
		}
		AnimatedVisibility(visible = open) {
			Column(verticalArrangement = Arrangement.spacedBy((4 * u).dp), modifier = Modifier.padding(start = (20 * u).dp)) {
				val evidence = graph.evidenceFor(theme)
				if (evidence.isEmpty()) {
					Text(
						text = "Not much activity here yet.",
						style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Stak.Muted,
					)
				} else {
					evidence.forEach { e ->
						Text(
							text = e.text,
							style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Stak.Body,
						)
					}
				}
				Text(
					text = (if (theme.share < 0.005f) "<1" else "${Math.round(theme.share * 100)}") + "% of your interest signals",
					style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Faint,
				)
			}
		}
	}
}

/**
 * The theme's mark: the collection art STAK already uses for that category, on a tile
 * tinted with the theme's own colour so a row and its slice of the ring still match. A
 * category with no art of its own keeps the plain dot.
 */
@Composable
private fun ThemeIcon(theme: TasteGraph.Theme) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val art = com.stak.demo.data.categoryArt(theme.label)
	val tint = themeColor(theme.colorKey)
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier.size((28 * u).dp).clip(RoundedCornerShape((8 * u).dp)).background(tint.copy(alpha = 0.18f)),
	) {
		val res = art?.iconRes ?: art?.imageRes
		if (res != null) {
			androidx.compose.foundation.Image(
				painter = androidx.compose.ui.res.painterResource(res),
				contentDescription = null,
				modifier = Modifier.size((20 * u).dp),
			)
		} else {
			Box(modifier = Modifier.size((10 * u).dp).clip(CircleShape).background(tint))
		}
	}
}

/** Strong / Moderate / Emerging - how much evidence stands behind the theme. */
@Composable
private fun StrengthChip(strength: TasteGraph.Strength) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val tint = when (strength) {
		TasteGraph.Strength.STRONG -> Color(0xFF2C9DBC)
		TasteGraph.Strength.MODERATE -> Color(0xFF3A465E)
		TasteGraph.Strength.EMERGING -> Color(0xFF2A3346)
	}
	Box(
		modifier = Modifier.clip(RoundedCornerShape((999 * u).dp)).background(tint).padding(horizontal = (10 * u).dp, vertical = (3 * u).dp),
	) {
		Text(
			text = strength.label,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = if (strength == TasteGraph.Strength.STRONG) Color.White else Stak.Body,
		)
	}
}

@Composable
private fun ShapesRow(title: String, body: String) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp)) {
		Text(
			text = title,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		Text(
			text = body,
			style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Stak.Muted,
		)
	}
}

@Composable
private fun TasteCardShell(title: String, content: @Composable () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Stak.CardBg).padding((16 * u).dp),
	) {
		Text(
			text = title,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		content()
	}
}
