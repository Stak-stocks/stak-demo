package com.stak.demo.ui.onboarding

import android.content.Intent
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.StakColors
import kotlinx.coroutines.delay

/** Resend re-arms the same 30 s countdown as the email verification step. */
private const val RESEND_SECONDS = 30

/**
 * 09 · Auth recovery — "Auth · Check your email" (Chinedu_Mobile 1:5862, 2026-10-07): the
 * sent-link confirmation. "Open mail app" opens the phone's mail client; "Resend link" sends
 * again and counts down 30 s before it can be tapped once more (no mail backend in the demo,
 * so the reset link is stak://reset). Mirrors ios CheckEmailView.swift.
 */
@Composable
fun CheckEmailScreen(email: String, onBack: () -> Unit) {
	val u = figmaUnit()
	val context = LocalContext.current
	var countdown by rememberSaveable { mutableIntStateOf(0) }
	LaunchedEffect(countdown) {
		if (countdown > 0) {
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
			Column(modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = (24 * u).dp).padding(top = (14 * u).dp)) {
				AuthRecoveryTitle(title = "Check your email", subtitle = "We sent a reset link to $email. It expires in 15 minutes.")
			}
			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				verticalArrangement = Arrangement.spacedBy((12 * u).dp),
				modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
			) {
				AuthCta(text = "Open mail app", onClick = {
					val mail = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_EMAIL).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
					runCatching { context.startActivity(mail) }
				})
				if (countdown > 0) {
					Row(horizontalArrangement = Arrangement.spacedBy((5 * u).dp), verticalAlignment = Alignment.CenterVertically) {
						Text(text = "Didn’t get it?", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp), color = StakColors.Muted)
						Text(text = "Resend link in ${countdown}s", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = StakColors.Muted)
					}
				} else {
					AuthSwitchRow(prefix = "Didn’t get it?", link = "Resend link", onClick = { countdown = RESEND_SECONDS })
				}
			}
		}
	}
}
