package com.stak.demo.ui.onboarding

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.stak.demo.R
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/**
 * Onboarding · Create account — Figma node 1554:9126 ("Auth · Sign up").
 *
 * The 10%-opacity glass ball watermark sits behind the lower half; white
 * social pills carry the real Google/Apple marks; three #181f30 inputs
 * (password with a Show/Hide toggle); sharp-cornered 51dp gradient CTA
 * (#a6e4f7 → #5da8bf → #3c98b4) with white Geist Medium label.
 */
@Composable
fun CreateAccountScreen(
	viewModel: AuthViewModel = hiltViewModel(),
	onCreateAccount: () -> Unit,
	onSignIn: () -> Unit,
	/** Google sign-in for a user who already completed onboarding — skip straight to main. */
	onAlreadySignedIn: () -> Unit = onCreateAccount,
) {
	val u = figmaUnit()
	val context = LocalContext.current
	var email by rememberSaveable { mutableStateOf("") }
	var password by rememberSaveable { mutableStateOf("") }
	var confirm by rememberSaveable { mutableStateOf("") }
	var showPassword by rememberSaveable { mutableStateOf(false) }
	// Product audit (2026-09-05): the form validates on the tap - the CTA waits
	// for all three fields, then the rules speak inline under the field.
	var attempted by rememberSaveable { mutableStateOf(false) }
	val emailError = AuthRules.emailError(email)
	val passwordError = AuthRules.passwordError(password)
	val confirmError = AuthRules.confirmError(password, confirm)
	val filled = email.isNotBlank() && password.isNotEmpty() && confirm.isNotEmpty()

	val uiState by viewModel.uiState.collectAsStateWithLifecycle()

	// Navigate once Supabase auth succeeds. Google sign-in for a returning user
	// goes straight to main; new accounts and email sign-up always go to onboarding.
	LaunchedEffect(uiState) {
		if (uiState is AuthUiState.Success) {
			val success = uiState as AuthUiState.Success
			if (success.onboardingComplete) onAlreadySignedIn() else onCreateAccount()
			viewModel.resetState()
		}
	}

	Box(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		AuthWatermark()

		Artboard {
			Column(
				verticalArrangement = Arrangement.spacedBy((14 * u).dp),
				modifier = Modifier
					.weight(1f)
					.fillMaxWidth()
					.verticalScroll(rememberScrollState())
					.padding(horizontal = (24 * u).dp)
					.padding(top = (14 * u).dp),
			) {
				Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
					Text(
						text = "Create your account",
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = StakColors.TextPrimary,
					)
					Text(
						text = "Enter your details below to continue",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Auth.SubtitleGray,
					)
				}
				Spacer(modifier = Modifier.height((4 * u).dp))

				SocialPill(text = "Continue with Google", iconRes = R.drawable.ic_google_g, onClick = { viewModel.signInWithGoogle(context) })

				AuthOrDivider()

				AuthInput(value = email, onValueChange = { email = it }, placeholder = "Email address", keyboardType = KeyboardType.Email, error = if (attempted) emailError else null)
				AuthInput(
					value = password,
					onValueChange = { password = it },
					placeholder = "Password",
					keyboardType = KeyboardType.Password,
					hidden = !showPassword,
					trailing = { ShowHideToggle(shown = showPassword, onToggle = { showPassword = !showPassword }) },
					error = if (attempted) passwordError else null,
				)
				AuthInput(
					value = confirm,
					onValueChange = { confirm = it },
					placeholder = "Confirm Password",
					keyboardType = KeyboardType.Password,
					hidden = !showPassword,
					error = if (attempted) confirmError else null,
				)
			}

			// CTA block — sharp-cornered gradient button, switch link, fine print.
			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				verticalArrangement = Arrangement.spacedBy((12 * u).dp),
				modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
			) {
				val isLoading = uiState is AuthUiState.Loading
				AuthCta(text = "Create account", enabled = filled && !isLoading, onClick = {
					attempted = true
					if (emailError == null && passwordError == null && confirmError == null) {
						viewModel.createAccount(email, password)
					}
				})
				if (isLoading) {
					CircularProgressIndicator(color = Auth.LinkTeal, modifier = Modifier.size((24 * u).dp))
				}
				if (uiState is AuthUiState.Error) {
					Text(
						text = (uiState as AuthUiState.Error).message,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, textAlign = TextAlign.Center),
						color = Auth.ErrorRed,
						modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp),
					)
				}
				AuthSwitchRow(prefix = "Already have an account?", link = "Sign in", onClick = onSignIn)
				Text(
					text = "By continuing you agree to the Terms and Privacy Policy.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp, textAlign = TextAlign.Center),
					color = Auth.FaintText,
					modifier = Modifier.fillMaxWidth().padding(horizontal = (24 * u).dp),
				)
			}
		}
	}
}
