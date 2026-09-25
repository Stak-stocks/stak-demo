package com.stak.demo.ui.onboarding

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlinx.coroutines.delay
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset

/**
 * Onboarding · 06 Preparing deck — Figma node 1554:8998.
 *
 * The closing loader: the box-and-coins hero (same flattened render as
 * the intro), "Building your first deck..." in Sora SemiBold 22, and a
 * live spinner with "Reading your brand picks". Auto-advances into the
 * account flow once the deck is "ready".
 */
@Composable
fun PreparingDeckScreen(onDone: () -> Unit) {
	val u = figmaUnit()
	LaunchedEffect(Unit) {
		delay(1800) // prototype: "After delay 1800ms" → 07 Taste reveal
		onDone()
	}
	// Authored rhythm (1:634, frame y minus the 44 status bar): the frame is
	// TOP-anchored — illustration ink top 245, headline box 648 h28, caption
	// row 694. The flattened hero render carries 66u of baked background
	// above its ink inside the 488u box, so the box tops out at 135.
	Box(
		modifier = Modifier
			.fillMaxSize()
			.background(StakColors.Bg)
			.systemBarsPadding()
			.padding(horizontal = (24 * u).dp),
	) {
		Image(
			painter = painterResource(R.drawable.intro_hero_box),
			contentDescription = null,
			contentScale = ContentScale.Fit,
			modifier = Modifier
				.align(Alignment.TopCenter)
				.offset(y = (135 * u).dp)
				.size((342 * u).dp, (488 * u).dp),
		)
		Text(
			text = "Building your first deck...",
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (22 * u).sp, lineHeight = (28 * u).sp, textAlign = TextAlign.Center, lineHeightStyle = FIGMA_LINE_BOX),
			color = StakColors.TextPrimary,
			modifier = Modifier
				.align(Alignment.TopCenter)
				.offset(y = (604 * u).dp)
				.fillMaxWidth(),
		)
		Row(
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.spacedBy((5 * u).dp),
			modifier = Modifier
				.align(Alignment.TopCenter)
				.offset(y = (650 * u).dp),
		) {
			Spinner()
			Text(
				text = "Reading your brand picks",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Auth.FaintText,
			)
		}
	}
}

/** 14dp rotating three-quarter arc in the caption gray. */
@Composable
private fun Spinner() {
	val u = figmaUnit()
	val transition = rememberInfiniteTransition(label = "spinner")
	val angle by transition.animateFloat(
		initialValue = 0f,
		targetValue = 360f,
		animationSpec = infiniteRepeatable(tween(900, easing = LinearEasing)),
		label = "spinnerAngle",
	)
	Canvas(modifier = Modifier.size((14 * u).dp).rotate(angle)) {
		val stroke = (2.94 * u).dp.toPx()
		drawArc(
			color = Auth.FaintText,
			// The authored ring (1:683) opens at the top-left quadrant: the arc
			// runs from 12 o'clock clockwise to 9 (exact-design audit 2026-09-04).
			startAngle = 270f,
			sweepAngle = 270f,
			useCenter = false,
			topLeft = Offset(stroke / 2f, stroke / 2f),
			size = Size(size.width - stroke, size.height - stroke),
			style = Stroke(width = stroke, cap = StrokeCap.Butt),
		)
	}
}
