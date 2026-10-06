import SwiftUI

/// Auth · Sign up — Figma node 1:830 (CHINEDU file).
///
/// The 10%-opacity glass ball watermark sits behind the lower half; white
/// social pills carry the real Google/Apple marks; three #181f30 inputs
/// (password with a Show/Hide toggle); sharp-cornered 51pt gradient CTA
/// (#a6e4f7 → #5da8bf → #3c98b4) with white Geist Medium label.
struct CreateAccountView: View {
	let onBack: () -> Void
	let onCreateAccount: () -> Void
	let onSignIn: () -> Void
	/// The email path goes through Email verification first (FigJam entry flow, 2026-09-14); Google / Apple skip it via `onCreateAccount`.
	var onVerifyEmail: (String) -> Void = { _ in }

	@State private var email = ""
	@State private var password = ""
	@State private var confirm = ""
	@State private var showPassword = false
	// Product audit (2026-09-05): the form validates on the tap - the CTA waits for
	// all three fields, then the rules speak inline under the field.
	@State private var attempted = false
	private var emailError: String? { AuthRules.emailError(email) }
	private var passwordError: String? { AuthRules.passwordError(password) }
	private var confirmError: String? { AuthRules.confirmError(password, confirm) }
	private var filled: Bool { !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty && !confirm.isEmpty }

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

						SocialPill(text: "Continue with Google", icon: "IcGoogleG", action: { UserProfile.shared.linkedGoogle = true; onCreateAccount() })
						SocialPill(text: "Continue with Apple", icon: "IcAppleLogo", action: { UserProfile.shared.linkedApple = true; onCreateAccount() })

						AuthOrDivider()

						AuthInput("Email address", text: $email, keyboard: .emailAddress)
							.error(attempted ? emailError : nil)
						AuthInput("Password", text: $password, hidden: !showPassword) {
							ShowHideToggle(shown: $showPassword)
						}
						.error(attempted ? passwordError : nil)
						AuthInput("Confirm Password", text: $confirm, hidden: !showPassword)
							.error(attempted ? confirmError : nil)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(.horizontal, 24 * u)
					.padding(.top, 14 * u)
				}

				// CTA block — sharp-cornered gradient button, switch link, fine print.
				VStack(spacing: 12 * u) {
					AuthCta(text: "Create account", enabled: filled, action: {
						attempted = true
						if emailError == nil && passwordError == nil && confirmError == nil { onVerifyEmail(email.trimmingCharacters(in: .whitespaces)) }
					})
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
}
