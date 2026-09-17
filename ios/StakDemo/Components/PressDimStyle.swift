import SwiftUI

/// The app's press feedback (product audit, 2026-09-05: every button was
/// `.plain`, so nothing acknowledged a touch). While pressed the whole target
/// draws at 70% - a quiet dim like Instagram's and Spotify's. Mirrors android
/// PressDim.
struct PressDimStyle: ButtonStyle {
	func makeBody(configuration: Configuration) -> some View {
		configuration.label
			.opacity(configuration.isPressed ? 0.7 : 1)
			.animation(.easeOut(duration: 0.08), value: configuration.isPressed)
	}
}

extension ButtonStyle where Self == PressDimStyle {
	static var pressDim: PressDimStyle { PressDimStyle() }
}
