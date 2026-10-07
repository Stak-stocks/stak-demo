import SwiftUI
import AuthenticationServices

/// Auth · Sign in — Figma node 1:879 (CHINEDU file). Same kit as Sign up:
/// "Welcome back" header, social pills, two inputs (password with
/// Show/Hide), a teal "Forgot password?" link, the 10% glass-ball
/// watermark and the sharp gradient "Sign in" CTA with the
/// "New to STAK? Create account" switch row. No back circle, as on android:
/// the left-edge swipe goes back. Navigation follows authVM.uiState (RootFlowView).
/// Mirrors android SignInScreen.kt.
struct SignInView: View {
	let onCreateAccount: () -> Void
	/// "Forgot password?" -> the reset flow (product audit, 2026-09-05).
	var onForgot: () -> Void = {}

	@EnvironmentObject private var authVM: AuthViewModel
	@StateObject private var appleCoord = AppleSignInCoordinator()

	/// What's typed here outlives the page, as android's back stack keeps it: Forgot password and back finds it.
	@EnvironmentObject private var drafts: AuthDrafts
	private var email: String { drafts.signIn.email }
	private var password: String { drafts.signIn.password }
	private var showPassword: Bool { drafts.signIn.showPassword }
	// Product audit (2026-09-05): validates on the tap - the CTA waits for both
	// fields, then the email rule speaks inline under the field.
	private var attempted: Bool { drafts.signIn.attempted }
	private var emailError: String? { AuthRules.emailError(email) }
	private var passwordError: String? { password.isEmpty ? "Enter your password" : nil }
	private var filled: Bool { !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty }
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
						VStack(alignment: .leading, spacing: 12 * u) {
							Text("Welcome back")
								.font(StakFont.sora(26 * u, .semiBold))
								.stakLineHeight(33 * u, size: 26 * u, face: .sora)
								.foregroundStyle(StakColors.textPrimary)
							Text("Your deck kept learning while you were away.")
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

						AuthInput("Email address", text: $drafts.signIn.email, keyboard: .emailAddress, contentType: .username)
							.error(attempted ? emailError : nil)
						AuthInput("Password", text: $drafts.signIn.password, hidden: !showPassword, contentType: .password) {
							ShowHideToggle(shown: $drafts.signIn.showPassword)
						}
						.error(attempted ? passwordError : nil)
						// Return on the password is Sign in, once it would be enabled.
						.submitLabel(.go)
						.onSubmit { if filled && !isLoading { submit() } }
						Button(action: onForgot) {
							Text("Forgot password?")
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(Auth.linkTeal)
						}
						.buttonStyle(.pressDim)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(.horizontal, 24 * u)
					.padding(.top, 14 * u)
				}
				.scrollDismissesKeyboard(.interactively)

				VStack(spacing: 12 * u) {
					AuthCta(text: "Sign in", enabled: filled && !isLoading, action: submit)
					AuthStatusLine(loading: isLoading, error: errorMessage)
					AuthSwitchRow(prefix: "New to STAK?", link: "Create account", action: onCreateAccount)
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	private func submit() {
		drafts.signIn.attempted = true
		if emailError == nil && passwordError == nil {
			authVM.signIn(email: email, password: password)
		}
	}
}
