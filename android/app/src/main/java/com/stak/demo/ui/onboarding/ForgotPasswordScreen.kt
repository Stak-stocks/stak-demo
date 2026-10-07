package com.stak.demo.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/**
 * 09 · Auth recovery — "Auth · Forgot password" (Chinedu_Mobile 1:5830, 2026-10-07; replaces
 * the frameless 2026-09-05 page). The sign-in artboard: watermark, back circle, the title block,
 * the email input, the gradient "Send reset link" CTA and the "Remembered it? Sign in" row.
 * A valid address hands off to Check your email (1:5862). Mirrors ios ForgotPasswordView.swift.
 */
@Composable
fun ForgotPasswordScreen(onBack: () -> Unit, onSent: (String) -> Unit = {}, onSignIn: () -> Unit = onBack) {
	val u = figmaUnit()
	var email by rememberSaveable { mutableStateOf("") }
	var attempted by rememberSaveable { mutableStateOf(false) }
	val emailError = AuthRules.emailError(email)

	Box(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		AuthWatermark()
		Artboard {
			Row(modifier = Modifier.fillMaxWidth().padding(start = (20 * u).dp, top = (10 * u).dp, bottom = (4 * u).dp)) {
				AuthBackCircle(onClick = onBack)
			}
			// Main (1:5850): 14 under the nav row, 24 gutters, 14 between the title block and the input.
			Column(
				verticalArrangement = Arrangement.spacedBy((14 * u).dp),
				modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = (24 * u).dp).padding(top = (14 * u).dp),
			) {
				AuthRecoveryTitle(title = "Forgot your password?", subtitle = "Enter the email you signed up with and we’ll send a reset link.")
				AuthInput(value = email, onValueChange = { email = it }, placeholder = "Email address", keyboardType = KeyboardType.Email, error = if (attempted) emailError else null)
			}
			// CTA (1:5856): 8 above, 12 to the switch row, 26 below.
			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				verticalArrangement = Arrangement.spacedBy((12 * u).dp),
				modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
			) {
				AuthCta(text = "Send reset link", enabled = email.isNotBlank(), onClick = {
					attempted = true
					if (emailError == null) onSent(email.trim())
				})
				AuthSwitchRow(prefix = "Remembered it?", link = "Sign in", onClick = onSignIn)
			}
		}
	}
}

/** The recovery pages' title block (1:5851): Sora SemiBold 26 on 33, 12 gap, Geist 12 on 16 in the auth subtitle grey. */
@Composable
internal fun AuthRecoveryTitle(title: String, subtitle: String) {
	val u = figmaUnit()
	Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.fillMaxWidth()) {
		Text(
			text = title,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = StakColors.TextPrimary,
		)
		Text(
			text = subtitle,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Auth.SubtitleGray,
		)
	}
}
