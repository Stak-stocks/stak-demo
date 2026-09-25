package com.stak.demo.ui.onboarding

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.foundation.border
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/** One taste bar — label, strength word (its own gray), fill fraction of the track. */


/**
 * Onboarding · 07 Taste reveal — Figma node 1554:9051 ("STEP 6 OF 6").
 *
 * The quiz result: teal eyebrow, "Here's what you're into." headline,
 * the #181f30 taste card with four strength bars drawn at their exact
 * Figma widths - the frame arrives already filled, so there is no
 * entry animation (Codex parity audit 2026-09-04) - the Risk style
 * chip ("Growth-Oriented" ›) and the "Let's go!" / Back CTAs.
 */
@Composable
fun TasteRevealScreen(onBack: () -> Unit, onLetsGo: () -> Unit) {
	val u = figmaUnit()
	// Product audit (2026-09-05): the Risk style row opens a picker sheet.
	var showRisk by rememberSaveable { mutableStateOf(false) }

	Artboard(modifier = Modifier.background(StakColors.Bg)) {
		Row(
			verticalAlignment = Alignment.CenterVertically,
			modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (10 * u).dp, bottom = (4 * u).dp),
		) {
			AuthBackCircle(onClick = onBack)
			Spacer(modifier = Modifier.weight(1f))
			Text(
				text = "STEP 6 OF 6",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, letterSpacing = (0.9 * u).sp),
				color = Auth.FaintText,
			)
		}

		Column(
			verticalArrangement = Arrangement.spacedBy((16 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.padding(horizontal = (24 * u).dp)
				.padding(top = (14 * u).dp),
		) {
			Text(
				text = "YOUR STARTING STAK TASTE",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, letterSpacing = (0.9 * u).sp),
				color = Auth.LinkTeal,
			)
			Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
				Text(
					text = "Here’s what you’re into.",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = StakColors.TextPrimary,
				)
				Text(
					text = "Built from your picks. It gets smarter with every swipe.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
					color = Auth.SubtitleGray,
				)
			}

			// Taste card — four strength bars.
			Column(
				verticalArrangement = Arrangement.spacedBy((14 * u).dp),
				modifier = Modifier
					.fillMaxWidth()
					.background(Auth.InputBg, RoundedCornerShape((16 * u).dp))
					.padding((16 * u).dp),
			) {
				// Product audit (2026-09-05): the bars come from the user's picks and
				// answers, not fixed copy.
				val profile = com.stak.demo.ui.UserProfile
				TasteModel.bars(profile.brandPicks, profile.goal, profile.risk).forEach { bar ->
					Column(verticalArrangement = Arrangement.spacedBy((6 * u).dp)) {
						Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
							Text(
								text = bar.label,
								style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
								color = StakColors.TextPrimary,
								modifier = Modifier.weight(1f),
							)
							Text(
								text = bar.strength,
								style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
								color = bar.strengthColor,
							)
						}
						Box(
							modifier = Modifier
								.fillMaxWidth()
								.height((5 * u).dp)
								.background(Auth.DividerLine, RoundedCornerShape((2.5 * u).dp)),
						) {
							Box(
								modifier = Modifier
									.fillMaxWidth(bar.fraction)
									.height((5 * u).dp)
									.background(Auth.LinkTeal, RoundedCornerShape((2.5 * u).dp)),
							)
						}
					}
				}
			}

			// Risk style chip.
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((10 * u).dp),
				modifier = Modifier
					.fillMaxWidth()
					.background(Auth.InputBg, RoundedCornerShape((14 * u).dp))
					.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
					) { showRisk = true }
					.padding(start = (16 * u).dp, end = (14 * u).dp, top = (13 * u).dp, bottom = (13 * u).dp),
			) {
				Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
					Text(
						text = "Risk style",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp),
						color = StakColors.Muted,
					)
					Text(
						text = com.stak.demo.ui.UserProfile.riskStyle,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp),
						color = StakColors.TextPrimary,
					)
				}
				Text(
					text = "›",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (15 * u).sp),
					color = Auth.LinkTeal,
				)
			}

			Text(
				text = "Your deck adjusts as you swipe.",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, textAlign = TextAlign.Center),
				color = Auth.FaintText,
				modifier = Modifier.fillMaxWidth(),
			)
		}

		Column(
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
		) {
			// Copy fix: 1:746 authors "Lets go!" -> "Let's go!" (exact-design audit 2026-09-04).
			AuthCta(text = "Let's go!", onClick = onLetsGo)
			AuthSecondaryButton(text = "Back", onClick = onBack)
			if (showRisk) RiskStyleSheet(onDismiss = { showRisk = false })
		}
	}
}

/**
 * The risk style picker behind the reveal's "Risk style ›" row (product
 * audit, 2026-09-05): the four 05 Risk answers, current one checked; a
 * tap re-answers the quiz and the reveal follows. Mirrors ios RiskStyleSheet.
 */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
internal fun RiskStyleSheet(onDismiss: () -> Unit) {
	val u = figmaUnit()
	androidx.compose.material3.ModalBottomSheet(
		onDismissRequest = onDismiss,
		containerColor = Auth.InputBg,
		scrimColor = Color(0x80000000),
		dragHandle = null,
		shape = RoundedCornerShape(topStart = (16 * u).dp, topEnd = (16 * u).dp),
	) {
		Column(
			verticalArrangement = Arrangement.spacedBy((8 * u).dp),
			modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (18 * u).dp, bottom = (30 * u).dp),
		) {
			Text("Risk style", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (17 * u).sp), color = StakColors.TextPrimary)
			Text("How you’d react to a 10% overnight drop. Change it any time.", style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = Auth.SubtitleGray, modifier = Modifier.padding(bottom = (6 * u).dp))
			listOf(
				TasteModel.RISK_BUY_MORE to ("Buy more after checking why" to "Comfortable with dips if the story holds"),
				TasteModel.RISK_HOLD to ("Hold and watch it closely" to "I can handle short-term drops"),
				TasteModel.RISK_STEP_AWAY to ("Step away for now" to "Big drops make me uncomfortable"),
				TasteModel.RISK_SELL_SOME to ("Sell some, reduce risk" to "I’d rather protect part of my money"),
			).forEach { (index, copy) ->
				val selected = com.stak.demo.ui.UserProfile.riskStyle == TasteModel.riskStyle(index) && (com.stak.demo.ui.UserProfile.risk == index || com.stak.demo.ui.UserProfile.risk < 0)
				Row(
					verticalAlignment = Alignment.CenterVertically,
					modifier = Modifier
						.fillMaxWidth()
						.background(StakColors.Bg, RoundedCornerShape((12 * u).dp))
						.border((1 * u).dp, if (selected) Color(0x8069B3CA) else Color(0x1AFFFFFF), RoundedCornerShape((12 * u).dp))
						.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) {
							com.stak.demo.ui.UserProfile.risk = index
							com.stak.demo.ui.UserProfile.riskStyle = TasteModel.riskStyle(index)
							com.stak.demo.ui.Session.saveProfile()
							onDismiss()
						}
						.padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
				) {
					Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
						Text(TasteModel.riskStyle(index) + " · " + copy.first, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = StakColors.TextPrimary)
						Text(copy.second, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Auth.SubtitleGray)
					}
					if (selected) Text("✓", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp), color = Auth.LinkTeal)
				}
			}
		}
	}
}
