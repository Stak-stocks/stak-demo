package com.stak.demo.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlinx.coroutines.launch

/** Forgot password's four steps, moving forward only - a failed later step (a wrong code,
 * a rejected new password) must never fall back to an earlier one. */
private enum class ResetStep { EMAIL, CODE, NEW_PASSWORD, DONE }

/**
 * Auth · Forgot password (product audit, 2026-09-05: the sign-in link did nothing).
 * Built from the auth kit - the sign-in page's header, input, gradient CTA - since no
 * frame exists for it. Fully in-app (2026-09-19), mirroring the Robinhood-style code
 * entry Create account uses for signup confirmation: a real code from Supabase's reset
 * email, typed here, verifies and signs in on a recovery session; the new password is
 * set on that session, then it's dropped so the user signs in fresh with it. No browser,
 * no web redirect. Mirrors ios ForgotPasswordView.swift (pre-2026-09-19 shape).
 */
@Composable
fun ForgotPasswordScreen(viewModel: AuthViewModel = hiltViewModel(), onBack: () -> Unit) {
	val u = figmaUnit()
	val scope = rememberCoroutineScope()
	var step by rememberSaveable { mutableStateOf(ResetStep.EMAIL) }
	var email by rememberSaveable { mutableStateOf("") }
	var attempted by rememberSaveable { mutableStateOf(false) }
	var sending by rememberSaveable { mutableStateOf(false) }
	var sendError by rememberSaveable { mutableStateOf<String?>(null) }
	var code by rememberSaveable { mutableStateOf("") }
	var newPassword by rememberSaveable { mutableStateOf("") }
	var confirmPassword by rememberSaveable { mutableStateOf("") }
	var showPassword by rememberSaveable { mutableStateOf(false) }
	val emailError = AuthRules.emailError(email)
	val newPasswordError = AuthRules.passwordError(newPassword)
	val confirmError = AuthRules.confirmError(newPassword, confirmPassword)

	val uiState by viewModel.uiState.collectAsStateWithLifecycle()
	val isLoading = uiState is AuthUiState.Loading

	// Only ever moves the step forward - a failed Verify or Update password (Error) is
	// rendered in place, on whichever step is already showing.
	LaunchedEffect(uiState) {
		when (uiState) {
			is AuthUiState.RecoveryVerified -> step = ResetStep.NEW_PASSWORD
			is AuthUiState.PasswordResetComplete -> step = ResetStep.DONE
			else -> {}
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
						text = when (step) {
							ResetStep.EMAIL -> "Reset your password"
							ResetStep.CODE -> "Check your email"
							ResetStep.NEW_PASSWORD -> "Set a new password"
							ResetStep.DONE -> "Password updated"
						},
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = StakColors.TextPrimary,
					)
					Text(
						text = when (step) {
							ResetStep.EMAIL -> "Enter the email you signed up with and we’ll send you a code."
							ResetStep.CODE -> "We sent a code to ${email.trim()}. Enter it below."
							ResetStep.NEW_PASSWORD -> "Choose a new password for your account."
							ResetStep.DONE -> "Sign in with your new password."
						},
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Auth.SubtitleGray,
					)
				}
				Spacer(modifier = Modifier.height((4 * u).dp))
				when (step) {
					ResetStep.EMAIL -> {
						AuthInput(value = email, onValueChange = { email = it }, placeholder = "Email address", keyboardType = KeyboardType.Email, error = if (attempted) emailError else null)
					}
					ResetStep.CODE -> {
						AuthInput(
							// Not hard-coded to any length - Supabase's OTP length is a project
							// setting (device report, 2026-09-19: 8 digits here), so the field
							// just accepts digits and lets the real Verify call be the judge.
							value = code,
							onValueChange = { code = it.filter(Char::isDigit).take(10) },
							placeholder = "Confirmation code",
							keyboardType = KeyboardType.Number,
						)
						Row(horizontalArrangement = Arrangement.spacedBy((4 * u).dp)) {
							Text(
								text = "Didn’t get it?",
								style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
								color = Auth.SubtitleGray,
							)
							Text(
								text = "Resend code",
								style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
								color = Auth.LinkTeal,
								modifier = Modifier.clickable(
									interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
									indication = com.stak.demo.ui.theme.PressDim,
									enabled = !sending && !isLoading,
								) {
									sending = true
									sendError = null
									scope.launch {
										val result = viewModel.sendPasswordReset(email.trim())
										sending = false
										if (result != null) sendError = result
									}
								},
							)
						}
						if (sending) CircularProgressIndicator(color = Auth.LinkTeal, modifier = Modifier.size((16 * u).dp))
						sendError?.let { ErrorLine(it, u) }
					}
					ResetStep.NEW_PASSWORD -> {
						AuthInput(
							value = newPassword,
							onValueChange = { newPassword = it },
							placeholder = "New password",
							keyboardType = KeyboardType.Password,
							hidden = !showPassword,
							trailing = { ShowHideToggle(shown = showPassword, onToggle = { showPassword = !showPassword }) },
							error = if (attempted) newPasswordError else null,
						)
						AuthInput(
							value = confirmPassword,
							onValueChange = { confirmPassword = it },
							placeholder = "Confirm new password",
							keyboardType = KeyboardType.Password,
							hidden = !showPassword,
							error = if (attempted) confirmError else null,
						)
					}
					ResetStep.DONE -> {
						Column(
							verticalArrangement = Arrangement.spacedBy((6 * u).dp),
							modifier = Modifier.fillMaxWidth().background(Auth.InputBg, RoundedCornerShape((14 * u).dp)).padding((16 * u).dp),
						) {
							Text("You’re all set", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp), color = StakColors.TextPrimary)
							Text("Your password was changed. Sign in below with the new one.", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Auth.SubtitleGray)
						}
					}
				}
			}
			Column(
				verticalArrangement = Arrangement.spacedBy((12 * u).dp),
				modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
			) {
				when (step) {
					ResetStep.EMAIL -> {
						AuthCta(text = "Send code", enabled = email.isNotBlank() && !sending, onClick = {
							attempted = true
							if (emailError == null && !sending) {
								sending = true
								sendError = null
								scope.launch {
									val result = viewModel.sendPasswordReset(email.trim())
									sending = false
									if (result == null) {
										attempted = false
										step = ResetStep.CODE
									} else {
										sendError = result
									}
								}
							}
						})
						if (sending) CircularProgressIndicator(color = Auth.LinkTeal, modifier = Modifier.size((24 * u).dp))
						sendError?.let { ErrorLine(it, u) }
					}
					ResetStep.CODE -> {
						AuthCta(text = "Verify", enabled = code.length >= 6 && !isLoading, onClick = {
							viewModel.verifyPasswordResetCode(email.trim(), code)
						})
						if (isLoading) CircularProgressIndicator(color = Auth.LinkTeal, modifier = Modifier.size((24 * u).dp))
						if (uiState is AuthUiState.Error) ErrorLine((uiState as AuthUiState.Error).message, u)
					}
					ResetStep.NEW_PASSWORD -> {
						AuthCta(text = "Update password", enabled = !isLoading, onClick = {
							attempted = true
							if (newPasswordError == null && confirmError == null) {
								viewModel.completePasswordReset(newPassword)
							}
						})
						if (isLoading) CircularProgressIndicator(color = Auth.LinkTeal, modifier = Modifier.size((24 * u).dp))
						if (uiState is AuthUiState.Error) ErrorLine((uiState as AuthUiState.Error).message, u)
					}
					ResetStep.DONE -> {
						AuthCta(text = "Back to sign in", onClick = onBack)
					}
				}
			}
		}
	}
}

@Composable
private fun ErrorLine(text: String, u: Float) {
	Text(
		text = text,
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, textAlign = TextAlign.Center),
		color = Auth.ErrorRed,
		modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp),
	)
}
