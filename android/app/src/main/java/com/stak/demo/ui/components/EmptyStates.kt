package com.stak.demo.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/**
 * 11 · States — the empty blocks of My STAK · Empty (1:6004) and Simulate · Empty (1:6571),
 * 2026-10-07: a Sora SemiBold 20 title, the muted 12 line of a fixed width, and the "Go to Deck"
 * pill (1:6007) with its arrow, 10 apart. Mirrors ios Components/EmptyStates.swift.
 */
@Composable
fun EmptyStateBlock(title: String, body: String, bodyWidth: Float, link: String, onLink: () -> Unit) {
	val u = figmaUnit()
	Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((10 * u).dp)) {
		Text(
			text = title,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp, lineHeight = (25 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
			textAlign = TextAlign.Center,
		)
		Text(
			text = body,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color(0xFF819ABB),
			textAlign = TextAlign.Center,
			modifier = Modifier.width((bodyWidth * u).dp),
		)
		DeckPill(text = link, onClick = onLink)
	}
}

/** The "Go to Deck ->" pill (1:6007): #0A1020 on a 0.5 rgba(31,41,68,0.64) hairline, r15, 12/8 padding, Geist Medium 11.491 + the 16 arrow. */
@Composable
fun DeckPill(text: String, onClick: () -> Unit) {
	val u = figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((3 * u).dp),
		modifier = Modifier
			.clip(RoundedCornerShape((15 * u).dp))
			.background(StakColors.Bg)
			.border((0.5 * u).dp, Color(0xA31F2944), RoundedCornerShape((15 * u).dp))
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick)
			.padding(horizontal = (12 * u).dp, vertical = (8 * u).dp),
	) {
		Text(
			text = text,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11.491 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		Image(painter = painterResource(R.drawable.ic_arrow_right_small), contentDescription = null, modifier = Modifier.size((16 * u).dp))
	}
}
