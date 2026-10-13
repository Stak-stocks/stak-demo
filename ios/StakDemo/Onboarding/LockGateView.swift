import SwiftUI
import LocalAuthentication

/// The account lock the permissions step promises (Codex review, PR #167): a
/// signed-in user who left "Account security" on unlocks with Face ID, Touch ID
/// or the passcode before Home. The 00 Splash stays as the backdrop; a
/// cancelled prompt offers a tap to retry. A device with nothing enrolled cannot
/// enforce a lock and passes through. Mirrors android BiometricGate.
struct LockGateView: View {
	let onUnlocked: () -> Void

	@Environment(\.scenePhase) private var scenePhase
	@State private var failed = false
	/// One system prompt at a time - its own sheet turns the scene inactive and back.
	@State private var prompting = false
	/// The app went to the background since the last prompt: coming back asks again (android: a second RESUMED).
	@State private var wasBackgrounded = false
	/// The scene is in front - kept as state, since the prompt's completion runs outside the view's update.
	@State private var isActive = false

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
		.onTapGesture { if failed { prompt() } }
		.accessibilityElement(children: .combine)
		.accessibilityLabel(failed ? "Tap to unlock STAK" : "STAK is locked")
		.accessibilityAddTraits(failed ? .isButton : [])
		.accessibilityAction { if failed { prompt() } }
		// The re-lock shows this gate the moment the app leaves the foreground, while it is still off screen - a
		// prompt asked for then shows nothing (android device report, 2026-09-18). Ask once the app is actually in
		// front, and again each time it comes back from the background.
		.onAppear {
			isActive = scenePhase == .active
			if isActive { prompt() }
		}
		.onChange(of: scenePhase) { _, phase in
			isActive = phase == .active
			switch phase {
			case .background: wasBackgrounded = true
			case .active:
				if wasBackgrounded || (!failed && !prompting) { prompt() }
			default: break
			}
		}
	}

	private func prompt() {
		guard !prompting else { return }
		// Cleared only once a prompt really starts: a background return that met a prompt still closing asks again
		// when that one's cancel lands (below).
		wasBackgrounded = false
		failed = false
		let context = LAContext()
		var error: NSError?
		guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else { onUnlocked(); return }
		prompting = true
		context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock STAK") { ok, _ in
			DispatchQueue.main.async {
				prompting = false
				if ok {
					onUnlocked()
				} else if wasBackgrounded && isActive {
					prompt()
				} else {
					failed = true
				}
			}
		}
	}
}
