import SwiftUI

@main
struct StakDemoApp: App {
	// Answers the per-moment orientation mask (portrait, landscape only in the article player's fullscreen).
	@UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

	var body: some Scene {
		WindowGroup {
			RootFlowView()
				// The STAK app is dark-only by design; ignore the system light theme.
				.preferredColorScheme(.dark)
		}
	}
}
