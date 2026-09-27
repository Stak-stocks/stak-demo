package com.stak.demo.ui.simulate

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.Geist
import kotlinx.coroutines.delay

/**
 * Tells the user a paper buy / sell / setup / limit order / cancel didn't go through.
 * PaperPortfolio applies each change locally first and confirms with the server in the
 * background, so the screen has already shown it as done by the time this can be known;
 * the next hydrate() puts the real numbers back and this explains why they moved.
 * Hosted once at the app root so it shows over whichever screen raised the ticket.
 */
@Composable
internal fun PaperTradeErrorBanner(modifier: Modifier = Modifier) {
	val message = PaperPortfolio.lastError ?: return
	val u = figmaUnit()
	LaunchedEffect(message) {
		delay(7_000)
		PaperPortfolio.dismissError()
	}
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.SpaceBetween,
		modifier = modifier
			.statusBarsPadding()
			.padding(horizontal = (20 * u).dp, vertical = (8 * u).dp)
			.fillMaxWidth()
			.clip(RoundedCornerShape((10 * u).dp))
			.background(Sim.CardBg)
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { PaperPortfolio.dismissError() }
			.padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
	) {
		Text(message, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = Sim.Red, modifier = Modifier.weight(1f))
		Text("Dismiss", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = Sim.Muted)
	}
}
