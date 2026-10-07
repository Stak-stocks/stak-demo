package com.stak.demo.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.stak.demo.ui.theme.StakColors

/**
 * 09 · Auth recovery — "Auth · Set a new password" (Chinedu_Mobile 1:5892, 2026-10-07), opened
 * by the reset mail's link (stak://reset). Two password inputs (the frame authors no Show
 * toggle), the sign-up rules inline, "Save new password" and "Changed your mind? Sign in".
 * The demo has no auth backend: a password that passes the rules is accepted on the spot.
 * Mirrors ios SetPasswordView.swift.
 */
@Composable
fun SetPasswordScreen(onBack: () -> Unit, onSaved: () -> Unit, onSignIn: () -> Unit) {
	val u = figmaUnit()
	var password by rememberSaveable { mutableStateOf("") }
	var confirm by rememberSaveable { mutableStateOf("") }
	var attempted by rememberSaveable { mutableStateOf(false) }
	val passwordError = AuthRules.passwordError(password) ?: if (password.none { it.isDigit() }) "Add at least one number" else null
	val confirmError = AuthRules.confirmError(password, confirm)

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
				AuthRecoveryTitle(title = "Set a new password", subtitle = "At least 8 characters, with a number. You’ll stay signed in on this phone.")
				AuthInput(value = password, onValueChange = { password = it }, placeholder = "New password", keyboardType = KeyboardType.Password, hidden = true, error = if (attempted) passwordError else null)
				AuthInput(value = confirm, onValueChange = { confirm = it }, placeholder = "Confirm new password", keyboardType = KeyboardType.Password, hidden = true, error = if (attempted) confirmError else null)
			}
			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				verticalArrangement = Arrangement.spacedBy((12 * u).dp),
				modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
			) {
				AuthCta(text = "Save new password", enabled = password.isNotEmpty() && confirm.isNotEmpty(), onClick = {
					attempted = true
					if (passwordError == null && confirmError == null) onSaved()
				})
				AuthSwitchRow(prefix = "Changed your mind?", link = "Sign in", onClick = onSignIn)
			}
		}
	}
}
