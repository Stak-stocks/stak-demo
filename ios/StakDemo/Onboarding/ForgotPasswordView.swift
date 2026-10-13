import SwiftUI

/// Forgot password's four steps, moving forward only - a failed later step (a wrong code, a rejected new
/// password) must never fall back to an earlier one.
private enum ResetStep { case email, code, newPassword, done }

/// Auth · Forgot password (product audit, 2026-09-05: the sign-in link did nothing).
/// Built from the auth kit - the sign-in page's header, input, gradient CTA - since no
/// frame exists for it. Fully in-app (2026-09-19), the same code entry Create account
/// uses: a real code from Supabase's reset email, typed here, verifies and signs in on
/// a recovery session; the new password is set on that session, then it's dropped so
/// the user signs in fresh with it. No browser, no web redirect. Mirrors android
/// ForgotPasswordScreen.kt.
struct ForgotPasswordView: View {
	let onBack: () -> Void

	@EnvironmentObject private var authVM: AuthViewModel

	@State private var step = ResetStep.email
	@State private var email = ""
	@State private var attempted = false
	@State private var sending = false
	@State private var sendError: String? = nil
	@State private var code = ""
	@State private var newPassword = ""
	@State private var confirmPassword = ""
	@State private var showPassword = false
	private var emailError: String? { AuthRules.emailError(email) }
	private var newPasswordError: String? { AuthRules.passwordError(newPassword) }
	private var confirmError: String? { AuthRules.confirmError(newPassword, confirmPassword) }
	private var isLoading: Bool { authVM.uiState == .loading }
	private var errorMessage: String? {
		if case .error(let msg) = authVM.uiState { return msg }
		return nil
	}
	private var trimmedEmail: String { email.trimmingCharacters(in: .whitespaces) }

	var body: some View {
		let u = figmaUnit
		ZStack {
			AuthWatermark()
			Artboard {
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
				}
				.padding(.leading, 20 * u)
				.padding(.top, 10 * u)
				.padding(.bottom, 4 * u)

				ScrollView {
				VStack(alignment: .leading, spacing: 14 * u) {
					VStack(alignment: .leading, spacing: 12 * u) {
						Text(title)
							.font(StakFont.sora(26 * u, .semiBold))
							.stakLineHeight(33 * u, size: 26 * u, face: .sora)
							.foregroundStyle(StakColors.textPrimary)
						Text(subtitle)
							.font(StakFont.geist(12 * u))
							.stakLineHeight(16 * u, size: 12 * u, face: .geist)
							.foregroundStyle(Auth.subtitleGray)
					}
					Spacer().frame(height: 4 * u)
					fields(u: u)
				}
				.frame(maxWidth: .infinity, alignment: .topLeading)
				.padding(.horizontal, 24 * u)
				.padding(.top, 14 * u)
				}
				.scrollDismissesKeyboard(.interactively)

				VStack(spacing: 12 * u) {
					actions(u: u)
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		// Only ever moves the step forward - a failed Verify or Update password (an error) shows in place, on
		// whichever step is already up.
		.onChange(of: authVM.uiState) { _, state in
			switch state {
			case .recoveryVerified: step = .newPassword
			case .passwordResetComplete: step = .done
			default: break
			}
		}
	}

	private var title: String {
		switch step {
		case .email: "Reset your password"
		case .code: "Check your email"
		case .newPassword: "Set a new password"
		case .done: "Password updated"
		}
	}

	private var subtitle: String {
		switch step {
		case .email: "Enter the email you signed up with and we’ll send you a code."
		case .code: "We sent a code to \(trimmedEmail). Enter it below."
		case .newPassword: "Choose a new password for your account."
		case .done: "Sign in with your new password."
		}
	}

	@ViewBuilder
	private func fields(u: CGFloat) -> some View {
		switch step {
		case .email:
			AuthInput("Email address", text: $email, keyboard: .emailAddress, contentType: .username)
				.error(attempted ? emailError : nil)
				.submitLabel(.send)
				.onSubmit { submitEmail() }
		case .code:
			AuthCodeInput(code: $code)
			HStack(spacing: 4 * u) {
				Text("Didn’t get it?")
					.font(StakFont.geist(11 * u))
					.stakLineHeight(15 * u, size: 11 * u, face: .geist)
					.foregroundStyle(Auth.subtitleGray)
				Button { send(advancing: false) } label: {
					Text("Resend code")
						.font(StakFont.geist(11 * u, .medium))
						.stakLineHeight(15 * u, size: 11 * u, face: .geist)
						.foregroundStyle(Auth.linkTeal)
				}
				.buttonStyle(.pressDim)
				.disabled(sending || isLoading)
			}
			AuthStatusLine(loading: sending, error: sendError, spinnerSize: 16)
		case .newPassword:
			AuthInput("New password", text: $newPassword, hidden: !showPassword, contentType: .newPassword) {
				ShowHideToggle(shown: $showPassword)
			}
			.error(attempted ? newPasswordError : nil)
			AuthInput("Confirm new password", text: $confirmPassword, hidden: !showPassword, contentType: .newPassword)
				.error(attempted ? confirmError : nil)
		case .done:
			AuthNoteCard(title: "You’re all set", message: "Your password was changed. Sign in below with the new one.")
		}
	}

	@ViewBuilder
	private func actions(u: CGFloat) -> some View {
		switch step {
		case .email:
			AuthCta(text: "Send code", enabled: !trimmedEmail.isEmpty && !sending, action: submitEmail)
			AuthStatusLine(loading: sending, error: sendError)
		case .code:
			AuthCta(text: "Verify", enabled: code.count >= AuthCodeInput.minLength && !isLoading) {
				authVM.verifyPasswordResetCode(email: trimmedEmail, code: code)
			}
			AuthStatusLine(loading: isLoading, error: errorMessage)
		case .newPassword:
			AuthCta(text: "Update password", enabled: !isLoading) {
				attempted = true
				if newPasswordError == nil && confirmError == nil {
					authVM.completePasswordReset(newPassword: newPassword)
				}
			}
			AuthStatusLine(loading: isLoading, error: errorMessage)
		case .done:
			AuthCta(text: "Back to sign in", action: onBack)
		}
	}

	/// "Send code" (or Return on the email field, once it would be enabled).
	private func submitEmail() {
		guard !trimmedEmail.isEmpty, !sending else { return }
		attempted = true
		if emailError == nil { send(advancing: true) }
	}

	/// Sends (or re-sends) the reset email; the first send moves on to the code.
	private func send(advancing: Bool) {
		sending = true
		sendError = nil
		Task {
			let result = await authVM.sendPasswordReset(email: trimmedEmail)
			sending = false
			if let result {
				sendError = result
			} else if advancing {
				attempted = false
				step = .code
			}
		}
	}
}
