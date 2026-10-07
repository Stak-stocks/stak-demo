import SwiftUI

/// 09 · Auth recovery — "Auth · Set a new password" (Chinedu_Mobile 1:5892, 2026-10-07), opened
/// by the reset mail's link (stak://reset). Two password inputs (the frame authors no Show
/// toggle), the sign-up rules inline, "Save new password" and "Changed your mind? Sign in".
/// The demo has no auth backend: a password that passes the rules is accepted on the spot.
/// Mirrors android SetPasswordScreen.kt.
struct SetPasswordView: View {
	let onBack: () -> Void
	let onSaved: () -> Void
	let onSignIn: () -> Void
	@State private var password = ""
	@State private var confirm = ""
	@State private var attempted = false
	private var passwordError: String? {
		AuthRules.passwordError(password) ?? (password.contains(where: \.isNumber) ? nil : "Add at least one number")
	}
	private var confirmError: String? { AuthRules.confirmError(password, confirm) }

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
					AuthRecoveryTitle(title: "Set a new password", subtitle: "At least 8 characters, with a number. You’ll stay signed in on this phone.")
					AuthInput("New password", text: $password, hidden: true)
						.error(attempted ? passwordError : nil)
					AuthInput("Confirm new password", text: $confirm, hidden: true)
						.error(attempted ? confirmError : nil)
				}
				.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
				.padding(.horizontal, 24 * u)
				.padding(.top, 14 * u)

				VStack(spacing: 12 * u) {
					AuthCta(text: "Save new password", enabled: !password.isEmpty && !confirm.isEmpty, action: {
						attempted = true
						if passwordError == nil && confirmError == nil { onSaved() }
					})
					AuthSwitchRow(prefix: "Changed your mind?", link: "Sign in", action: onSignIn)
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}
