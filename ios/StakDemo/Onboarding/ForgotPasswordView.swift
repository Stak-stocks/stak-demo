import SwiftUI

/// Auth · Forgot password (product audit, 2026-09-05: the sign-in link did
/// nothing). Built from the auth kit - the sign-in page's header, input, gradient
/// CTA - since no frame exists for it. The demo has no mail backend, so a valid
/// address flips the page into its "check your inbox" state. Mirrors android
/// ForgotPasswordScreen.kt.
struct ForgotPasswordView: View {
	let onBack: () -> Void
	@State private var email = ""
	@State private var attempted = false
	@State private var sent = false
	private var emailError: String? { AuthRules.emailError(email) }

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

				VStack(alignment: .leading, spacing: 14 * u) {
					VStack(alignment: .leading, spacing: 12 * u) {
						Text(sent ? "Check your inbox" : "Reset your password")
							.font(StakFont.sora(26 * u, .semiBold))
							.stakLineHeight(33 * u, size: 26 * u, face: .sora)
							.foregroundStyle(StakColors.textPrimary)
						Text(sent ? "We sent a reset link to \(email.trimmingCharacters(in: .whitespaces)). It expires in 30 minutes." : "Enter the email you signed up with and we’ll send you a reset link.")
							.font(StakFont.geist(12 * u))
							.stakLineHeight(16 * u, size: 12 * u, face: .geist)
							.foregroundStyle(Auth.subtitleGray)
					}
					Spacer().frame(height: 4 * u)
					if !sent {
						AuthInput("Email address", text: $email, keyboard: .emailAddress)
							.error(attempted ? emailError : nil)
					} else {
						VStack(alignment: .leading, spacing: 6 * u) {
							Text("Didn’t get it?")
								.font(StakFont.geist(14 * u, .medium))
								.foregroundStyle(StakColors.textPrimary)
							Text("Check your spam folder, or go back and try another address.")
								.font(StakFont.geist(11 * u))
								.foregroundStyle(Auth.subtitleGray)
						}
						.frame(maxWidth: .infinity, alignment: .leading)
						.padding(16 * u)
						.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
					}
				}
				.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
				.padding(.horizontal, 24 * u)
				.padding(.top, 14 * u)

				VStack(spacing: 12 * u) {
					if !sent {
						AuthCta(text: "Send reset link", enabled: !email.trimmingCharacters(in: .whitespaces).isEmpty, action: {
							attempted = true
							if emailError == nil { sent = true }
						})
					} else {
						AuthCta(text: "Back to sign in", action: onBack)
					}
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}
