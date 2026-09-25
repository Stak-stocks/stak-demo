package com.stak.demo.ui.onboarding

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.stak.demo.R

/**
 * Onboarding · 05 Risk matrix — Figma node 1:569 (CHINEDU file,
 * "STEP 5 OF 6"). Shares the matrix layout with step 04; each option
 * has its own glyph (plus, eye, pause, shield-check), all stroke #819abb.
 */
@Composable
fun RiskScreen(onBack: () -> Unit, onContinue: () -> Unit) {
	MatrixQuizScreen(
		stepLabel = "STEP 5 OF 6",
		headline = "A stock you’re watching drops 10% overnight.",
		subtitle = "No wrong answer. This helps STAK understand your risk style.",
		options = listOf(
			MatrixOption("Buy more after checking why", "Comfortable with dips if the story holds", R.drawable.ic_risk_plus, iconSize = 37.9.dp),
			MatrixOption("Hold and watch it closely", "I can handle short-term drops", R.drawable.ic_risk_eye, iconSize = 37.9.dp),
			MatrixOption("Step away for now", "Big drops make me uncomfortable", R.drawable.ic_risk_pause, iconSize = 36.dp, circleSize = 36.dp, iconDy = 9.95f),
			MatrixOption("Sell some, reduce risk", "I’d rather protect part of my money", R.drawable.ic_risk_shield, iconSize = 20.dp, circleSize = 36.dp, iconDy = 9.95f),
		),
		onBack = onBack,
		// Product audit (2026-09-05): nothing pre-selected; the answer IS the
		// risk style the reveal and Profile show.
		onContinue = { choice ->
			com.stak.demo.ui.UserProfile.risk = choice
			com.stak.demo.ui.UserProfile.riskStyle = TasteModel.riskStyle(choice)
			onContinue()
		},
	)
}
