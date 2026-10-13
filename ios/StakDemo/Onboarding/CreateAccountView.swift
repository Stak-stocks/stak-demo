import SwiftUI
import AuthenticationServices

/// Auth · Sign up — Figma node 1:830 (CHINEDU file).
///
/// The 10%-opacity glass ball watermark sits behind the lower half; white
/// social pills carry the real Google/Apple marks; three #181f30 inputs
/// (password with a Show/Hide toggle); sharp-cornered 51pt gradient CTA
/// (#a6e4f7 → #5da8bf → #3c98b4) with white Geist Medium label.
///
/// An email sign-up that Supabase holds for confirmation turns this same page into
/// "Check your email" with the code entry (Robinhood-style, 2026-09-19): the
/// confirmation email carries the code alongside its link, so the account verifies
/// right here - no browser, no redirect. Mirrors android CreateAccountScreen.kt.
struct CreateAccountView: View {
	let onSignIn: () -> Void
	/// The address waiting on its confirmation code. Owned by RootFlowView: sticky once set - a failed Resend must
	/// not fall back to the full form, and going to Sign in and back keeps it, as android's back stack does.
	@Binding var pendingEmail: String?

	@EnvironmentObject private var authVM: AuthViewModel
	@StateObject private var appleCoord = AppleSignInCoordinator()

	/// What's typed here outlives the page, as android's back stack keeps it: Sign in and back finds it still there.
	@EnvironmentObject private var drafts: AuthDrafts
	private var email: String { drafts.signUp.email }
	private var password: String { drafts.signUp.password }
	private var confirm: String { drafts.signUp.confirm }
	private var showPassword: Bool { drafts.signUp.showPassword }
	private var code: String { drafts.signUp.code }
	// Product audit (2026-09-05): the form validates on the tap - the CTA waits for
	// all three fields, then the rules speak inline under the field.
	private var attempted: Bool { drafts.signUp.attempted }
	private var emailError: String? { AuthRules.emailError(email) }
	private var passwordError: String? { AuthRules.passwordError(password) }
	private var confirmError: String? { AuthRules.confirmError(password, confirm) }
	private var filled: Bool { !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty && !confirm.isEmpty }
	private var isLoading: Bool { authVM.uiState == .loading }
	private var errorMessage: String? {
		if case .error(let msg) = authVM.uiState { return msg }
		return nil
	}

	var body: some View {
		let u = figmaUnit
		ZStack {
			AuthWatermark()

			Artboard {
				ScrollView {
					VStack(alignment: .leading, spacing: 14 * u) {
						if let awaiting = pendingEmail {
							awaitingContent(awaiting, u: u)
						} else {
							formContent(u: u)
						}
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(.horizontal, 24 * u)
					.padding(.top, 14 * u)
				}
				.scrollDismissesKeyboard(.interactively)

				// CTA block — sharp-cornered gradient button, switch link, fine print.
				VStack(spacing: 12 * u) {
					if let awaiting = pendingEmail {
						AuthCta(text: "Verify", enabled: code.count >= AuthCodeInput.minLength && !isLoading) {
							authVM.verifyEmailCode(email: awaiting, code: code)
						}
					} else {
						AuthCta(text: "Create account", enabled: filled && !isLoading, action: submit)
					}
					AuthStatusLine(loading: isLoading, error: errorMessage)
					// Kept visible even while awaiting (2026-09-19): the code entry has no other way out of the screen.
					AuthSwitchRow(prefix: "Already have an account?", link: "Sign in", action: onSignIn)
					Text("By continuing you agree to the Terms and Privacy Policy.")
						.font(StakFont.geist(10 * u))
						.multilineTextAlignment(.center)
						.foregroundStyle(Auth.faintText)
						.frame(maxWidth: .infinity)
						.padding(.horizontal, 24 * u)
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	@ViewBuilder
	private func formContent(u: CGFloat) -> some View {
		VStack(alignment: .leading, spacing: 12 * u) {
			Text("Create your account")
				.font(StakFont.sora(26 * u, .semiBold))
				.stakLineHeight(33 * u, size: 26 * u, face: .sora)
				.foregroundStyle(StakColors.textPrimary)
			Text("Enter your details below to continue")
				.font(StakFont.geist(12 * u))
				.stakLineHeight(16 * u, size: 12 * u, face: .geist)
				.foregroundStyle(Auth.subtitleGray)
		}
		Spacer().frame(height: 4 * u)

		SocialPill(text: "Continue with Google", icon: "IcGoogleG", action: { authVM.signInWithGoogle() })
			.disabled(isLoading)
		// Sign in with Apple: the iPhone's own (App Store Guideline 4.8) - Android has Google only.
		SocialPill(text: "Continue with Apple", icon: "IcAppleLogo", action: { appleCoord.start(authVM: authVM) })
			.disabled(isLoading)

		AuthOrDivider()

		AuthInput("Email address", text: $drafts.signUp.email, keyboard: .emailAddress, contentType: .username)
			.error(attempted ? emailError : nil)
		AuthInput("Password", text: $drafts.signUp.password, hidden: !showPassword, contentType: .newPassword) {
			ShowHideToggle(shown: $drafts.signUp.showPassword)
		}
		.error(attempted ? passwordError : nil)
		AuthInput("Confirm Password", text: $drafts.signUp.confirm, hidden: !showPassword, contentType: .newPassword)
			.error(attempted ? confirmError : nil)
			// Return on the last field is the CTA, once it would be enabled.
			.submitLabel(.join)
			.onSubmit { if filled && !isLoading { submit() } }
	}

	private func submit() {
		drafts.signUp.attempted = true
		if emailError == nil && passwordError == nil && confirmError == nil {
			authVM.createAccount(email: email, password: password)
		}
	}

	@ViewBuilder
	private func awaitingContent(_ awaiting: String, u: CGFloat) -> some View {
		VStack(alignment: .leading, spacing: 12 * u) {
			Text("Check your email")
				.font(StakFont.sora(26 * u, .semiBold))
				.stakLineHeight(33 * u, size: 26 * u, face: .sora)
				.foregroundStyle(StakColors.textPrimary)
			Text("We sent a confirmation code to \(awaiting). Enter it below to confirm your account.")
				.font(StakFont.geist(12 * u))
				.stakLineHeight(16 * u, size: 12 * u, face: .geist)
				.foregroundStyle(Auth.subtitleGray)
		}
		Spacer().frame(height: 4 * u)
		AuthCodeInput(code: $drafts.signUp.code)
		AuthNoteCard(title: "Didn’t get it?", message: "Check your spam folder, or") {
			Button { authVM.resendConfirmation(email: awaiting) } label: {
				Text("Resend confirmation email")
					.font(StakFont.geist(12 * u, .medium))
					.foregroundStyle(Auth.linkTeal)
			}
			.buttonStyle(.pressDim)
			.disabled(isLoading)
		}
	}
}
