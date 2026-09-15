package com.stak.demo.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.StakColors

/**
 * The account lock the permissions step promises (Codex review, PR #167
 * mirror): a signed-in user who left "Account security" on unlocks with
 * biometrics or the device credential before Home. The 00 Splash stays as
 * the backdrop; a cancelled prompt offers a tap to retry. A device with
 * nothing enrolled cannot enforce a lock and passes through.
 */
@Composable
fun BiometricGate(onUnlocked: () -> Unit) {
	val context = LocalContext.current
	val activity = context as? androidx.fragment.app.FragmentActivity
	var failed by remember { mutableStateOf(false) }
	fun prompt() {
		val act = activity
		val authenticators = androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK or
			androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
		val available = androidx.biometric.BiometricManager.from(context).canAuthenticate(authenticators)
		if (act == null || available != androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS) { onUnlocked(); return }
		val info = androidx.biometric.BiometricPrompt.PromptInfo.Builder()
			.setTitle("Unlock STAK")
			.setSubtitle("Your account is locked to you.")
			.setAllowedAuthenticators(authenticators)
			.build()
		androidx.biometric.BiometricPrompt(
			act,
			androidx.core.content.ContextCompat.getMainExecutor(context),
			object : androidx.biometric.BiometricPrompt.AuthenticationCallback() {
				override fun onAuthenticationSucceeded(result: androidx.biometric.BiometricPrompt.AuthenticationResult) { onUnlocked() }
				override fun onAuthenticationError(errorCode: Int, errString: CharSequence) { failed = true }
			},
		).authenticate(info)
	}
	LaunchedEffect(Unit) { prompt() }
	// Back never leaves the gate (Codex review, PR #166): pushed over a route by the re-lock,
	// an unhandled Back would pop LOCK and reveal the page beneath. A cancelled prompt re-arms.
	androidx.activity.compose.BackHandler { if (failed) { failed = false; prompt() } }
	Box(
		contentAlignment = Alignment.BottomCenter,
		modifier = Modifier
			.fillMaxSize()
			.background(StakColors.Bg)
			.clickable(enabled = failed, interactionSource = remember { MutableInteractionSource() }, indication = null) { failed = false; prompt() },
	) {
		SplashScreen(onContinue = {})
		if (failed) {
			Text(
				"Tap to unlock STAK",
				style = TextStyle(fontFamily = Geist, fontSize = 14.sp),
				color = StakColors.TextPrimary.copy(alpha = 0.7f),
				modifier = Modifier.padding(bottom = 80.dp),
			)
		}
	}
}
