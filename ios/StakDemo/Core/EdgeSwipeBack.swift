import SwiftUI

/// iOS's swipe from the left edge to go back, for the app's custom page stacks (MainTabsView, RootFlowView). They are
/// not NavigationStacks - each edge plays its authored Android motion - so they don't get the system gesture for free.
///
/// The page follows the finger; the page beneath slides in from a third of a screen to the left, as in UIKit. Let go
/// past half the width, or flick fast enough to carry it past 60%, and the page finishes leaving and `onBack` removes
/// it (with animations off - the slide already happened). Anything less settles back.
enum EdgeSwipe {
	/// Where the page beneath sits while the top page is dragged `drag` points: a third of a screen left at rest,
	/// home when the top page has fully left.
	static func underlayOffset(_ drag: CGFloat, width: CGFloat) -> CGFloat {
		-(width - min(drag, width)) * 0.3
	}
}

private struct EdgeSwipeBackModifier: ViewModifier {
	let enabled: Bool
	@Binding var drag: CGFloat
	let onBack: () -> Void
	/// Called once the swipe is fully over - the page gone, or settled back - so the stack can park the page beneath.
	let onSettled: () -> Void
	/// The strip along the leading edge that starts the gesture - the width UIKit's edge recogniser uses.
	private let edgeWidth: CGFloat = 20

	func body(content: Content) -> some View {
		let width = UIScreen.main.bounds.width
		content
			// VoiceOver's two-finger scrub - the same back, for anyone not dragging.
			.accessibilityAction(.escape) { if enabled { onBack() } }
			// The leading edge's shadow over the page beneath, fading as the page leaves - a gradient strip, not
			// .shadow, which would render the whole page offscreen every frame.
			.background(alignment: .leading) {
				if drag > 0 {
					LinearGradient(colors: [.clear, .black.opacity(0.3)], startPoint: .leading, endPoint: .trailing)
						.frame(width: 14)
						.offset(x: -14)
						.opacity(Double(1 - drag / width))
						.allowsHitTesting(false)
				}
			}
			.offset(x: drag)
			.overlay(alignment: .leading) {
				if enabled {
					Color.clear
						.frame(width: edgeWidth)
						.frame(maxHeight: .infinity)
						.contentShape(Rectangle())
						.gesture(
							DragGesture(minimumDistance: 8, coordinateSpace: .global)
								.onChanged { value in
									withTransaction(Self.instant) { drag = max(0, value.translation.width) }
								}
								.onEnded { value in
									let finishes = value.translation.width > width / 2
										|| value.predictedEndTranslation.width > width * 0.6
									if finishes {
										withAnimation(.easeOut(duration: 0.22)) {
											drag = width
										} completion: {
											withTransaction(Self.instant) {
												onBack()
												drag = 0
												onSettled()
											}
										}
									} else {
										withAnimation(.easeOut(duration: 0.22)) {
											drag = 0
										} completion: {
											withTransaction(Self.instant) { onSettled() }
										}
									}
								}
						)
						.accessibilityHidden(true)
				}
			}
	}

	private static var instant: Transaction {
		var t = Transaction()
		t.disablesAnimations = true
		return t
	}
}

extension View {
	/// Lets the left-edge swipe close this page (see EdgeSwipeBackModifier). `drag` is shared with the stack, which
	/// moves the page beneath by `EdgeSwipe.underlayOffset` from the moment `drag` leaves 0 until `onSettled`.
	func edgeSwipeBack(enabled: Bool, drag: Binding<CGFloat>, onSettled: @escaping () -> Void = {}, onBack: @escaping () -> Void) -> some View {
		modifier(EdgeSwipeBackModifier(enabled: enabled, drag: drag, onBack: onBack, onSettled: onSettled))
	}
}
