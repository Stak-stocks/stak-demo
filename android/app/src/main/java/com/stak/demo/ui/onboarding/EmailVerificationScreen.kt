package com.stak.demo.ui.onboarding

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import kotlinx.coroutines.delay

/**
 * Auth · Email verification (FigJam "STAK Entry Flow", 2026-09-14: Sign up
 * with email -> Email verification -> Code valid? -> Investor quiz; "No,
 * resend" loops back here). No frame exists for it, so it is built from the
 * auth kit like Forgot password. The demo has no mail backend: a complete
 * 6-digit code verifies, anything shorter is the "No" branch with its inline
 * error, and Resend re-arms a 30 s countdown. Google / Apple sign-ups skip
 * this step (the board's second Sign up edge). Mirrors ios
 * EmailVerificationView.swift.
 */
@Composable
fun EmailVerificationScreen(email: String, onBack: () -> Unit, onVerified: () -> Unit) {
	val u = figmaUnit()
	var code by rememberSaveable { mutableStateOf("") }
	var attempted by rememberSaveable { mutableStateOf(false) }
	var resent by rememberSaveable { mutableIntStateOf(0) }
	var countdown by rememberSaveable { mutableIntStateOf(RESEND_SECONDS) }
	val codeError = if (code.length == CODE_LENGTH) null else "Enter the 6-digit code from your email"

	// The resend timer restarts with every send.
	LaunchedEffect(resent) {
		while (countdown > 0) {
			delay(1000)
			countdown -= 1
		}
	}

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
						text = "Check your email",
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = StakColors.TextPrimary,
					)
					Text(
						text = "We sent a 6-digit code to ${email.trim()}. Enter it below to verify your address.",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Auth.SubtitleGray,
					)
				}
				Spacer(modifier = Modifier.height((4 * u).dp))
				AuthInput(
					value = code,
					// Digits only, six at most - the keyboard offers digits, the paste path is filtered too.
					onValueChange = { code = it.filter { c -> c.isDigit() }.take(CODE_LENGTH) },
					placeholder = "6-digit code",
					keyboardType = KeyboardType.Number,
					error = if (attempted) codeError else null,
				)
				Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = (4 * u).dp)) {
					if (countdown > 0) {
						Text(
							text = "Resend code in ${countdown}s",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
							color = StakColors.Muted,
						)
					} else {
						Text(
							text = "Resend code",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
							color = Auth.LinkTeal,
							modifier = Modifier.clickable(
								interactionSource = remember { MutableInteractionSource() },
								indication = com.stak.demo.ui.theme.PressDim,
							) {
								// "No, resend": a fresh code, the timer re-armed, the old entry cleared.
								code = ""
								attempted = false
								countdown = RESEND_SECONDS
								resent += 1
							},
						)
					}
				}
				if (resent > 0) {
					Column(
						verticalArrangement = Arrangement.spacedBy((6 * u).dp),
						modifier = Modifier.fillMaxWidth().background(Auth.InputBg, RoundedCornerShape((14 * u).dp)).padding((16 * u).dp),
					) {
						Text("New code sent", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp), color = StakColors.TextPrimary)
						Text("Check your spam folder if it isn’t in your inbox in a minute.", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Auth.SubtitleGray)
					}
				}
			}
			Column(
				verticalArrangement = Arrangement.spacedBy((12 * u).dp),
				modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
			) {
				AuthCta(text = "Verify email", enabled = code.isNotEmpty(), onClick = {
					attempted = true
					if (codeError == null) onVerified()
				})
			}
		}
	}
}

private const val CODE_LENGTH = 6
private const val RESEND_SECONDS = 30
