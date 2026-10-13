import SwiftUI

/// Auth · Email verification (FigJam "STAK Entry Flow", 2026-09-14: Sign up with
/// email -> Email verification -> Code valid? -> Investor quiz; "No, resend" loops
/// back here). No frame exists for it, so it is built from the auth kit like
/// Forgot password. The demo has no mail backend: a complete 6-digit code
/// verifies, anything shorter is the "No" branch with its inline error, and
/// Resend re-arms a 30 s countdown. Google / Apple sign-ups skip this step (the
/// board's second Sign up edge). Mirrors android EmailVerificationScreen.kt.
struct EmailVerificationView: View {
	let email: String
	let onBack: () -> Void
	let onVerified: () -> Void

	private static let codeLength = 6
	private static let resendSeconds = 30

	@State private var code = ""
	@State private var attempted = false
	@State private var resent = 0
	@State private var countdown = EmailVerificationView.resendSeconds
	private let ticker = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
	private var codeError: String? { code.count == Self.codeLength ? nil : "Enter the 6-digit code from your email" }

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
						Text("Check your email")
							.font(StakFont.sora(26 * u, .semiBold))
							.stakLineHeight(33 * u, size: 26 * u, face: .sora)
							.foregroundStyle(StakColors.textPrimary)
						Text("We sent a 6-digit code to \(email.trimmingCharacters(in: .whitespaces)). Enter it below to verify your address.")
							.font(StakFont.geist(12 * u))
							.stakLineHeight(16 * u, size: 12 * u, face: .geist)
							.foregroundStyle(Auth.subtitleGray)
					}
					Spacer().frame(height: 4 * u)
					AuthInput("6-digit code", text: $code, keyboard: .numberPad)
						.error(attempted ? codeError : nil)
						// Digits only, six at most - the paste path is filtered too.
						.onChange(of: code) { _, next in
							let digits = String(next.filter(\.isNumber).prefix(Self.codeLength))
							if digits != next { code = digits }
						}
					HStack {
						if countdown > 0 {
							Text("Resend code in \(countdown)s")
								.font(StakFont.geist(12 * u))
								.foregroundStyle(StakColors.muted)
						} else {
							Button {
								// "No, resend": a fresh code, the timer re-armed, the old entry cleared.
								code = ""
								attempted = false
								countdown = Self.resendSeconds
								resent += 1
							} label: {
								Text("Resend code")
									.font(StakFont.geist(12 * u, .medium))
									.foregroundStyle(Auth.linkTeal)
							}
							.buttonStyle(.pressDim)
						}
					}
					.padding(.leading, 4 * u)
					if resent > 0 {
						VStack(alignment: .leading, spacing: 6 * u) {
							Text("New code sent")
								.font(StakFont.geist(14 * u, .medium))
								.foregroundStyle(StakColors.textPrimary)
							Text("Check your spam folder if it isn’t in your inbox in a minute.")
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
					AuthCta(text: "Verify email", enabled: !code.isEmpty, action: {
						attempted = true
						if codeError == nil { onVerified() }
					})
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		// The resend timer counts down a second at a time.
		.onReceive(ticker) { _ in
			if countdown > 0 { countdown -= 1 }
		}
	}
}
