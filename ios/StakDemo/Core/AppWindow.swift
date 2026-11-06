import SwiftUI

/// The width the app draws in, as android's figmaUnit reads its window's displayMetrics - not UIScreen.main, which
/// describes the device's screen rather than the app's window.
///
/// On an iPad this iPhone app gets a window only ~1.4x as tall as it is wide (an iPhone's is 1.8x-2.2x), too short
/// for screens drawn to the 390x844 frame: Discover's card ran under its buttons and pushed the tab bar off screen.
/// There the app draws in an iPhone-shaped column in the middle (PhoneColumn), and this is that column's width.
///
/// Stored, not looked up per read: figmaUnit runs in nearly every view body and through every font, so a walk over
/// the app's scenes each time added up during a swipe. PhoneColumn sets it from the window it measures.
enum AppWindow {
	private(set) static var width: CGFloat = columnWidth(for: measure())

	/// The column's width for this window, from PhoneColumn's own measurement - one source for the column's frame
	/// and figmaUnit.
	static func update(window: CGSize) {
		let column = columnWidth(for: window)
		if column > 0 { width = column }
	}

	/// The window's width, or on a window too short for the frame (portrait, under 1.7x as tall as wide - the
	/// iPhone SE is 1.78x), the width of a column with the frame's 390:844 shape.
	static func columnWidth(for window: CGSize) -> CGFloat {
		guard window.width > 0, window.height > window.width, window.height / window.width < 1.7 else { return window.width }
		return (window.height * 390 / 844).rounded(.down)
	}

	/// The first value, before PhoneColumn has measured: the key window, or the scene before there is one.
	static func measure() -> CGSize {
		let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
		let scene = scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
		return scene?.keyWindow?.bounds.size ?? scene?.coordinateSpace.bounds.size ?? UIScreen.main.bounds.size
	}
}

var appWidth: CGFloat { AppWindow.width }

extension View {
	/// A sheet's content at the column's width, centred: on an iPad a sheet spans the whole window and can't be
	/// narrowed, so its own background fills the margins. The whole width on an iPhone.
	func inAppColumn() -> some View {
		frame(maxWidth: appWidth).frame(maxWidth: .infinity)
	}
}

/// What the column follows beyond the window's shape. Not android's AppColumn.fullBleed (the news video's fullscreen,
/// which widens the column itself): android's pre-splash view can draw a column, so it has no launch bleed.
@Observable
final class AppColumn {
	static let shared = AppColumn()

	/// The splash at launch, drawn across the whole window as the launch screen is (LaunchScreen.storyboard can't draw
	/// a column), so the hand-off doesn't jump: the margin panels are hidden meanwhile. Cleared once the splash has
	/// faded out.
	var launchBleed = true

	/// The window's width at launch, for the splash.
	let launchWidth = AppWindow.measure().width
}

/// The app in its column: the whole window on an iPhone; on an iPad, an iPhone-shaped column centred between two
/// panels of the page colour (see AppWindow). The panels are solid and take touches: pages parked beside the column
/// (a tab's shell, a page under a pushed one) would otherwise show in the margins and answer taps there. They're
/// hidden (still taking touches) during the launch splash - AppColumn.launchBleed.
struct PhoneColumn<Content: View>: View {
	@ViewBuilder let content: Content
	@State private var window = AppWindow.measure()

	var body: some View {
		let column = AppWindow.columnWidth(for: window)
		let margin = max(0, (window.width - column) / 2)
		let bleed = AppColumn.shared.launchBleed
		content
			.frame(width: margin > 0 ? column : nil)
			.frame(maxWidth: .infinity, maxHeight: .infinity)
			.overlay {
				HStack(spacing: 0) {
					StakColors.bg.frame(width: margin)
					Spacer(minLength: 0)
					StakColors.bg.frame(width: margin)
				}
				.ignoresSafeArea()
				.opacity(margin > 0 && !bleed ? 1 : 0)
				.allowsHitTesting(margin > 0)
			}
			.background(StakColors.bg.ignoresSafeArea())
			// The whole window, safe areas and keyboard included, so a keyboard opening doesn't change it.
			.background(
				GeometryReader { geo in
					Color.clear
						.onAppear { set(geo.size) }
						.onChange(of: geo.size) { _, size in set(size) }
				}
				.ignoresSafeArea()
			)
	}

	private func set(_ size: CGSize) {
		guard size != window, size.width > 0 else { return }
		// figmaUnit first, so the redraw this state change causes already reads the new width.
		AppWindow.update(window: size)
		window = size
	}
}
