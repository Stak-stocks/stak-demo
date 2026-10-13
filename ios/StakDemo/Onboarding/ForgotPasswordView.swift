import SwiftUI

/// 09 · Auth recovery — "Auth · Forgot password" (Chinedu_Mobile 1:5830, 2026-10-07; replaces
/// the frameless 2026-09-05 page). The sign-in artboard: watermark, back circle, the title block,
/// the email input, the gradient "Send reset link" CTA and the "Remembered it? Sign in" row.
/// A valid address hands off to Check your email (1:5862). Mirrors android ForgotPasswordScreen.kt.
struct ForgotPasswordView: View {
	let onBack: () -> Void
	var onSent: (String) -> Void = { _ in }
	var onSignIn: () -> Void = {}
	@State private var email = ""
	@State private var attempted = false
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

				// Main (1:5850): 14 under the nav row, 24 gutters, 14 between the title block and the input.
				VStack(alignment: .leading, spacing: 14 * u) {
					AuthRecoveryTitle(title: "Forgot your password?", subtitle: "Enter the email you signed up with and we’ll send a reset link.")
					AuthInput("Email address", text: $email, keyboard: .emailAddress)
						.error(attempted ? emailError : nil)
				}
				.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
				.padding(.horizontal, 24 * u)
				.padding(.top, 14 * u)

				// CTA (1:5856): 8 above, 12 to the switch row, 26 below.
				VStack(spacing: 12 * u) {
					AuthCta(text: "Send reset link", enabled: !email.trimmingCharacters(in: .whitespaces).isEmpty, action: {
						attempted = true
						if emailError == nil { onSent(email.trimmingCharacters(in: .whitespaces)) }
					})
					AuthSwitchRow(prefix: "Remembered it?", link: "Sign in", action: onSignIn)
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}

/// The recovery pages' title block (1:5851): Sora SemiBold 26 on 33, 12 gap, Geist 12 on 16 in the auth subtitle grey.
struct AuthRecoveryTitle: View {
	let title: String
	let subtitle: String

	var body: some View {
		let u = figmaUnit
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
		.frame(maxWidth: .infinity, alignment: .leading)
	}
}
