package com.stak.demo.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
 * Auth · Forgot password (product audit, 2026-09-05: the sign-in link did
 * nothing). Built from the auth kit - the sign-in page's header, input,
 * gradient CTA - since no frame exists for it. The demo has no mail
 * backend, so a valid address flips the page into its "check your inbox"
 * state. Mirrors ios ForgotPasswordView.swift.
 */
@Composable
fun ForgotPasswordScreen(onBack: () -> Unit) {
	val u = figmaUnit()
	var email by rememberSaveable { mutableStateOf("") }
	var attempted by rememberSaveable { mutableStateOf(false) }
	var sent by rememberSaveable { mutableStateOf(false) }
	val emailError = AuthRules.emailError(email)

	Box(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		AuthWatermark()
		Artboard {
			Row(modifier = Modifier.fillMaxWidth().padding(start = (20 * u).dp, top = (10 * u).dp, bottom = (4 * u).dp)) {
				AuthBackCircle(onClick = onBack)
			}
			Column(
				verticalArrangement = Arrangement.spacedBy((14 * u).dp),
				modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = (24 * u).dp).padding(top = (14 * u).dp),
			) {
				Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
					Text(
						text = if (sent) "Check your inbox" else "Reset your password",
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = StakColors.TextPrimary,
					)
					Text(
						text = if (sent) "We sent a reset link to ${email.trim()}. It expires in 30 minutes." else "Enter the email you signed up with and we’ll send you a reset link.",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Auth.SubtitleGray,
					)
				}
				Spacer(modifier = Modifier.height((4 * u).dp))
				if (!sent) {
					AuthInput(value = email, onValueChange = { email = it }, placeholder = "Email address", keyboardType = KeyboardType.Email, error = if (attempted) emailError else null)
				} else {
					Column(
						verticalArrangement = Arrangement.spacedBy((6 * u).dp),
						modifier = Modifier.fillMaxWidth().background(Auth.InputBg, RoundedCornerShape((14 * u).dp)).padding((16 * u).dp),
					) {
						Text("Didn’t get it?", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp), color = StakColors.TextPrimary)
						Text("Check your spam folder, or go back and try another address.", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Auth.SubtitleGray)
					}
				}
			}
			Column(
				verticalArrangement = Arrangement.spacedBy((12 * u).dp),
				modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
			) {
				if (!sent) {
					AuthCta(text = "Send reset link", enabled = email.isNotBlank(), onClick = {
						attempted = true
						if (emailError == null) sent = true
					})
				} else {
					AuthCta(text = "Back to sign in", onClick = onBack)
				}
			}
		}
	}
}
