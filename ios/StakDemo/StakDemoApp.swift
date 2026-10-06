import SwiftUI

@main
struct StakDemoApp: App {
	// Answers the per-moment orientation mask (portrait, landscape only in the article player's fullscreen).
	@UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

	var body: some Scene {
		WindowGroup {
			TextSizeRoot {
				RootFlowView()
			}
			// The STAK app is dark-only by design; ignore the system light theme.
			.preferredColorScheme(.dark)
			// Larger text grows the app up to Accessibility 2 (about Android's 200% ceiling); the hand-tuned layouts
			// aren't built for the 3x of the largest sizes. `textScale` reads the same ceiling.
			.dynamicTypeSize(...DynamicTypeSize.accessibility2)
		}
	}
}

/// Rebuilds the app when the Text Size setting changes, so every box sized by `textScale` picks up the new size (the
/// fonts follow on their own; the boxes around them are plain numbers).
private struct TextSizeRoot<Content: View>: View {
	@ViewBuilder let content: Content
	@Environment(\.dynamicTypeSize) private var dynamicTypeSize

	var body: some View {
		// Re-read before the rebuild below, so the rebuilt views size their boxes at the new setting.
		let _ = TextScale.refresh()
		content.id(dynamicTypeSize)
	}
}
