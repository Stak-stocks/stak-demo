import SwiftUI

/// The width of the window the app draws in, as android's figmaUnit reads its window's displayMetrics - not
/// UIScreen.main, which describes the device's screen rather than the app's window (on an iPad, this iPhone app runs
/// in an iPhone-sized window).
///
/// Stored, not looked up per read: figmaUnit runs in nearly every view body and through every font, so a walk over
/// the app's scenes each time added up during a swipe. The app's root refreshes it whenever its size changes.
enum AppWindow {
	private(set) static var width: CGFloat = measure()

	static func refresh() {
		let measured = measure()
		if measured > 0 { width = measured }
	}

	private static func measure() -> CGFloat {
		let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
		let scene = scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
		return scene?.keyWindow?.bounds.width ?? scene?.coordinateSpace.bounds.width ?? UIScreen.main.bounds.width
	}
}

var appWidth: CGFloat { AppWindow.width }
