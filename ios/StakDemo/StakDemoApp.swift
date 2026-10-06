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

/// Keeps `textScale` on the Text Size setting. The fonts follow the setting on their own; the boxes around them read
/// `textScale`, which is Observable, so the views that use it redraw in place when it changes.
private struct TextSizeRoot<Content: View>: View {
	@ViewBuilder let content: Content
	@Environment(\.dynamicTypeSize) private var dynamicTypeSize

	var body: some View {
		content
			.onAppear { TextScale.shared.update(dynamicTypeSize) }
			.onChange(of: dynamicTypeSize) { _, size in TextScale.shared.update(size) }
	}
}
