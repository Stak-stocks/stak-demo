import SwiftUI
import LocalAuthentication

/// The account lock the permissions step promises (Codex review, PR #167): a
/// signed-in user who left "Account security" on unlocks with Face ID, Touch ID
/// or the passcode before Home. The 00 Splash stays as the backdrop; a
/// cancelled prompt offers a tap to retry. A device with nothing enrolled cannot
/// enforce a lock and passes through. Mirrors android BiometricGate.
struct LockGateView: View {
	let onUnlocked: () -> Void

	@State private var failed = false

	var body: some View {
		ZStack(alignment: .bottom) {
			SplashView(onContinue: {})
			if failed {
				Text("Tap to unlock STAK")
					.font(StakFont.geist(14))
					.foregroundStyle(StakColors.textPrimary.opacity(0.7))
					.padding(.bottom, 80)
			}
		}
		.contentShape(Rectangle())
		.onTapGesture { if failed { failed = false; prompt() } }
		.task { prompt() }
	}

	private func prompt() {
		let context = LAContext()
		var error: NSError?
		guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else { onUnlocked(); return }
		context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock STAK") { ok, _ in
			DispatchQueue.main.async { if ok { onUnlocked() } else { failed = true } }
		}
	}
}
