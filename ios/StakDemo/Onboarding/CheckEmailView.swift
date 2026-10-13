import SwiftUI
import UIKit

/// Resend re-arms the same 30 s countdown as the email verification step.
private let resendSeconds = 30

/// 09 · Auth recovery — "Auth · Check your email" (Chinedu_Mobile 1:5862, 2026-10-07): the
/// sent-link confirmation. "Open mail app" opens Mail; "Resend link" sends again and counts
/// down 30 s before it can be tapped once more (no mail backend in the demo, so the reset
/// link is stak://reset). Mirrors android CheckEmailScreen.kt.
struct CheckEmailView: View {
	let email: String
	let onBack: () -> Void
	@State private var countdown = 0

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

				VStack(alignment: .leading, spacing: 0) {
					AuthRecoveryTitle(title: "Check your email", subtitle: "We sent a reset link to \(email). It expires in 15 minutes.")
				}
				.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
				.padding(.horizontal, 24 * u)
				.padding(.top, 14 * u)

				VStack(spacing: 12 * u) {
					AuthCta(text: "Open mail app", action: {
						// Mail's own scheme; a phone without Mail simply ignores it (canOpenURL would need an LSApplicationQueriesSchemes entry).
						if let url = URL(string: "message://") { UIApplication.shared.open(url) }
					})
					if countdown > 0 {
						HStack(spacing: 5 * u) {
							Text("Didn’t get it?")
								.font(StakFont.geist(12 * u))
								.foregroundStyle(StakColors.muted)
							Text("Resend link in \(countdown)s")
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(StakColors.muted)
						}
					} else {
						AuthSwitchRow(prefix: "Didn’t get it?", link: "Resend link", action: { countdown = resendSeconds })
					}
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		.task(id: countdown) {
			guard countdown > 0 else { return }
			try? await Task.sleep(nanoseconds: 1_000_000_000)
			if !Task.isCancelled { countdown -= 1 }
		}
	}
}
