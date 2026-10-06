import SwiftUI
import AuthenticationServices

/// Auth · Sign in — Figma node 1:879 (CHINEDU file). Same kit as Sign up:
/// "Welcome back" header, social pills, two inputs (password with
/// Show/Hide), a teal "Forgot password?" link, the 10% glass-ball
/// watermark and the sharp gradient "Sign in" CTA with the
/// "New to STAK? Create account" switch row.
struct SignInView: View {
	let onBack: () -> Void
	/// Kept for API compatibility; navigation is now driven by authVM.uiState.
	let onSignIn: () -> Void
	let onCreateAccount: () -> Void
	/// "Forgot password?" -> the reset flow (product audit, 2026-09-05).
	var onForgot: () -> Void = {}

	@EnvironmentObject private var authVM: AuthViewModel
	@StateObject private var appleCoord = AppleSignInCoordinator()

	@State private var email = ""
	@State private var password = ""
	@State private var showPassword = false
	// Product audit (2026-09-05): validates on the tap - the CTA waits for both
	// fields, then the email rule speaks inline under the field.
	@State private var attempted = false
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
						SocialPill(text: "Continue with Apple", icon: "IcAppleLogo", action: {
							appleCoord.start(authVM: authVM)
						})
						.disabled(isLoading)

						AuthOrDivider()

						AuthInput("Email address", text: $email, keyboard: .emailAddress)
							.error(attempted ? emailError : nil)
						AuthInput("Password", text: $password, hidden: !showPassword) {
							ShowHideToggle(shown: $showPassword)
						}
						.error(attempted ? passwordError : nil)
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

				VStack(spacing: 12 * u) {
					if let msg = errorMessage {
						Text(msg)
							.font(StakFont.geist(12 * figmaUnit))
							.foregroundStyle(Color(argb: 0xFFFF5A6A))
							.frame(maxWidth: .infinity, alignment: .leading)
							.padding(.horizontal, 24 * figmaUnit)
					}
					AuthCta(text: isLoading ? "Signing in…" : "Sign in", enabled: filled && !isLoading, action: {
						attempted = true
						if emailError == nil && passwordError == nil {
							authVM.signIn(email: email, password: password)
						}
					})
					AuthSwitchRow(prefix: "New to STAK?", link: "Create account", action: onCreateAccount)
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}
