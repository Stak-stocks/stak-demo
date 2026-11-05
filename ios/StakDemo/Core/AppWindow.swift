import SwiftUI

/// The width the app draws in, as android's figmaUnit reads its window's displayMetrics - not UIScreen.main, which
/// describes the device's screen rather than the app's window.
///
/// On an iPad this iPhone app gets a window only ~1.4x as tall as it is wide (an iPhone's is 1.8x-2.2x), too short
/// for screens drawn to the 390x844 frame: Discover's card ran under its buttons and pushed the tab bar off screen.
/// There the app draws in an iPhone-shaped column in the middle (PhoneColumn), and this is that column's width.
///
/// Stored, not looked up per read: figmaUnit runs in nearly every view body and through every font, so a walk over
/// the app's scenes each time added up during a swipe. The app's root refreshes it whenever its size changes.
enum AppWindow {
	private(set) static var width: CGFloat = columnWidth(for: measure())

	static func refresh() {
		let width = columnWidth(for: measure())
		if width > 0 { self.width = width }
	}

	/// The window's width, or on a window too short for the frame (portrait, under 1.7x as tall as wide - the
	/// iPhone SE is 1.78x), the width of a column with the frame's 390:844 shape.
	static func columnWidth(for window: CGSize) -> CGFloat {
		guard window.width > 0, window.height > window.width, window.height / window.width < 1.7 else { return window.width }
		return (window.height * 390 / 844).rounded(.down)
	}

	private static func measure() -> CGSize {
		let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
		let scene = scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
		return scene?.keyWindow?.bounds.size ?? scene?.coordinateSpace.bounds.size ?? UIScreen.main.bounds.size
	}
}

var appWidth: CGFloat { AppWindow.width }

/// The app in its column: the whole window on an iPhone, an iPhone-shaped column centred on the page colour on an
/// iPad (see AppWindow). Clipped, so a page sliding in from the side doesn't show beside the column.
struct PhoneColumn<Content: View>: View {
	@ViewBuilder let content: Content

	var body: some View {
		GeometryReader { geo in
			let window = CGSize(
				width: geo.size.width + geo.safeAreaInsets.leading + geo.safeAreaInsets.trailing,
				height: geo.size.height + geo.safeAreaInsets.top + geo.safeAreaInsets.bottom
			)
			let column = AppWindow.columnWidth(for: window)
			let columned = column < window.width
			content
				.frame(width: columned ? column : nil)
				.frame(maxWidth: .infinity, maxHeight: .infinity)
				.clipShape(SidesClip(active: columned))
				// figmaUnit and the page widths follow the column: read once per change, not per view.
				.onAppear { AppWindow.refresh() }
				.onChange(of: window) { _, _ in AppWindow.refresh() }
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}

/// Clips the column's sides only: above and below, the status bar's and the tab bar's backgrounds run on to the
/// window's edges (ignoring the safe area), and must not be cut. Clips nothing when there is no column.
private struct SidesClip: Shape {
	let active: Bool

	func path(in rect: CGRect) -> Path {
		Path(active ? rect.insetBy(dx: 0, dy: -10_000) : rect.insetBy(dx: -10_000, dy: -10_000))
	}
}
