package com.stak.demo.ui.onboarding

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/** One 2x2 matrix option — icon in a #242b3d circle, Geist title/subtitle.
 * Icon glyphs keep their native Figma frame size (21.06 for the goal set,
 * up to the full 37.9 circle for the risk plus/eye). */
internal data class MatrixOption(
	val title: String,
	val subtitle: String,
	val iconRes: Int,
	val iconSize: Dp = 21.06.dp,
	val circleSize: Dp = 37.9.dp,
	// Authored icon-frame y within the card content (row 2 icons sit lower).
	val iconDy: Float = 0f,
)

/**
 * Shared single-select 2x2 matrix quiz screen — the layout of Figma
 * "Onboarding · 04 Goal · matrix" (1554:8828) and "05 Risk matrix"
 * (1554:8913): step label, Sora 24/31 headline, Geist 12 subtitle,
 * #181f30 cards (163.2x155.8, r16.85) with the hairline #69b3ca
 * selected border, and Continue/Back CTAs (Continue gates on a pick).
 */
@Composable
internal fun MatrixQuizScreen(
	stepLabel: String,
	headline: String,
	subtitle: String,
	options: List<MatrixOption>,
	onBack: () -> Unit,
	/** Continue reports the chosen card's index. */
	onContinue: (Int) -> Unit,
	// The frames arrive with one card already selected (04 Goal 1554:8828,
	// 05 Risk 1554:8913); the caller names it (Codex parity audit
	// 2026-09-04). -1 = start unselected.
	initialSelection: Int = -1,
) {
	val u = figmaUnit()
	var selected by rememberSaveable { mutableIntStateOf(initialSelection) }

	Artboard(modifier = Modifier.background(StakColors.Bg)) {
		Row(
			verticalAlignment = Alignment.CenterVertically,
			modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (10 * u).dp, bottom = (4 * u).dp),
		) {
			AuthBackCircle(onClick = onBack)
			Spacer(modifier = Modifier.weight(1f))
			Text(
				text = stepLabel,
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
			Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
				Text(
					text = headline,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (24 * u).sp, lineHeight = (31 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = StakColors.TextPrimary,
				)
				Text(
					text = subtitle,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Auth.SubtitleGray,
				)
			}

			Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.padding(top = (4 * u).dp)) {
				options.chunked(2).forEachIndexed { rowIndex, row ->
					Row(horizontalArrangement = Arrangement.spacedBy((13 * u).dp)) {
						row.forEachIndexed { colIndex, option ->
							val index = rowIndex * 2 + colIndex
							MatrixCard(
								option = option,
								selected = selected == index,
								onClick = { selected = index },
							)
						}
					}
				}
			}
		}

		Column(
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
		) {
			AuthCta(text = "Continue", enabled = selected >= 0, onClick = { if (selected >= 0) onContinue(selected) })
			AuthSecondaryButton(text = "Back", onClick = onBack)
		}
	}
}

@Composable
private fun MatrixCard(option: MatrixOption, selected: Boolean, onClick: () -> Unit) {
	val u = figmaUnit()
	val shape = RoundedCornerShape((16.85 * u).dp)
	Column(
		// Authored interior (1:597): content top-anchored at 15.27; the icon
		// at its per-option dy; the text block 21 below the icon. Never
		// vertically centered - row 2 reads lower by design.
		modifier = Modifier
			.size((163.18 * u).dp, (155.81 * u).dp)
			.background(Auth.InputBg, shape)
			.then(if (selected) Modifier.border((0.53 * u).dp, Auth.LinkTeal, shape) else Modifier)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			)
			.padding(horizontal = (14.74 * u).dp, vertical = (15.27 * u).dp),
	) {
		Spacer(modifier = Modifier.height((option.iconDy * u).dp))
		Box(
			modifier = Modifier.size(option.circleSize * u).background(Color(0xFF242B3D), CircleShape),
			contentAlignment = Alignment.Center,
		) {
			Image(
				painter = painterResource(option.iconRes),
				contentDescription = null,
				modifier = Modifier.size(option.iconSize * u),
			)
		}
		Spacer(modifier = Modifier.height((21 * u).dp))
		Column(verticalArrangement = Arrangement.spacedBy((5 * u).dp)) {
			Text(
				text = option.title,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16.85 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = StakColors.TextPrimary,
				modifier = Modifier.width((142.13 * u).dp),
			)
			Text(
				text = option.subtitle,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp, lineHeight = (13.69 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Auth.FaintText,
				modifier = Modifier.width((121.07 * u).dp),
			)
		}
	}
}
