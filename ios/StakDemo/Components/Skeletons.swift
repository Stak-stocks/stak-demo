import SwiftUI

/// 11 · States — the loading frames (Chinedu_Mobile 1:6057 Home · Loading, 1:6189 Deck · Loading,
/// 1:6360 Stock detail · Loading, 2026-10-07). Each is the authored frame itself, baked from its 2x
/// export with the status bar cropped off (Sk* imagesets, drawn at the screen's width = the
/// artboard unit) and the tab bar split out so it anchors to the screen bottom like the live bar.
///
/// WHEN THEY SHOW (demo rule, the file authors no loading motion): the first time a page is
/// opened in a process it warms up behind its skeleton for `warmupSeconds` - Home and the deck
/// behind the whole-screen frames (tab bar included), a stock page behind the content frame
/// under its real top bar. Nothing is fetched in this build, so the window is the signal.
/// Mirrors android ui/components/Skeletons.kt.
enum Warmup {
	static let home = "home"
	static let deck = "deck"
	static let stock = "stock"
	static let warmupSeconds: Double = 0.7
	private static var done: Set<String> = []

	static func pending(_ key: String) -> Bool { !done.contains(key) }
	static func finish(_ key: String) { done.insert(key) }
}

/// Covers its parent with `skeleton` until the page's warm-up window closes; nothing once it has.
struct WarmupOverlay<Skeleton: View>: View {
	let key: String
	@ViewBuilder let skeleton: () -> Skeleton
	@State private var show: Bool

	init(_ key: String, @ViewBuilder skeleton: @escaping () -> Skeleton) {
		self.key = key
		self.skeleton = skeleton
		self._show = State(initialValue: Warmup.pending(key))
	}

	var body: some View {
		if show {
			ZStack {
				StakColors.bg.ignoresSafeArea()
				skeleton()
			}
			.task {
				try? await Task.sleep(nanoseconds: UInt64(Warmup.warmupSeconds * 1_000_000_000))
				Warmup.finish(key)
				show = false
			}
		}
	}
}

/// Home · Loading (1:6057): the greeting, mood deck, why-card and banner placeholders over the skeleton tab bar.
struct HomeLoadingSkeleton: View {
	var body: some View { BakedSkeleton(content: "SkHome", tabBar: "SkHomeTabbar") }
}

/// Deck · Loading (1:6189): the Discover header, ring, queue slabs, gesture hint and CTA ghosts over the skeleton tab bar.
struct DeckLoadingSkeleton: View {
	var body: some View { BakedSkeleton(content: "SkDeck", tabBar: "SkDeckTabbar") }
}

/// Stock detail · Loading (1:6360): everything under the real top bar - price hero, chart, modules, CTAs.
struct StockDetailLoadingSkeleton: View {
	var body: some View { BakedSkeleton(content: "SkStock", tabBar: nil, statusBar: false) }
}

private struct BakedSkeleton: View {
	let content: String
	let tabBar: String?
	var statusBar: Bool = true

	var body: some View {
		GeometryReader { proxy in
			VStack(spacing: 0) {
				Image(content)
					.resizable()
					.aspectRatio(contentMode: .fit)
					.frame(width: proxy.size.width)
					.frame(maxHeight: .infinity, alignment: .top)
					.clipped()
				if let tabBar {
					Image(tabBar)
						.resizable()
						.aspectRatio(contentMode: .fit)
						.frame(width: proxy.size.width)
						.background(Color(argb: 0xFF060C1D))
				}
			}
			.frame(width: proxy.size.width, height: proxy.size.height, alignment: .top)
		}
		.ignoresSafeArea(edges: statusBar ? .bottom : [.top, .bottom])
		.background(Color(argb: 0xFF060C1D).ignoresSafeArea(edges: .bottom))
	}
}
