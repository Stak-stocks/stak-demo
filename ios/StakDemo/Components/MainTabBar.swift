import SwiftUI

/// The five CHINEDU tabs — all built.
/// Mirrors android/ ui/components/MainTabBar.kt (MainTab).
enum MainTab: String, CaseIterable, Identifiable {
	case home = "Home"
	case news = "News"
	case discover = "Discover"
	case myStak = "My STAK"
	case simulate = "Simulate"

	var id: String { rawValue }

	/// Filled/bright glyph shown while the tab is selected.
	var activeIcon: String {
		switch self {
		case .home: return "IcTabHome"
		case .news: return "IcTabNewsActive"
		case .discover: return "TabDiscoverActive"
		case .myStak: return "IcTabMystakActive"
		case .simulate: return "TabSimulateActive"
		}
	}

	/// Muted outline glyph for the resting state.
	var inactiveIcon: String {
		switch self {
		case .home: return "IcTabHomeInactive"
		case .news: return "IcTabNews"
		case .discover: return "IcTabDiscover"
		case .myStak: return "IcTabMystak"
		case .simulate: return "IcTabSimulate"
		}
	}

}

/// CHINEDU tab bar (Home Main 1:1220 / News listing 1:1352) — 86px
/// #060c1d, five 24px icons with 12px white labels (Inter in the frame;
/// that role maps onto Geist here). The authored bar (86, compact 75)
/// INCLUDES the home-indicator zone — the tab row sits at its authored
/// top inset (18) and the system gesture area overlays the
/// bar's lower band, exactly like the frame; the shell runs the bar to
/// the physical bottom of the screen (no safe-area padding beneath it).
/// Active tabs use their filled/bright glyph; switching is the
/// prototype's "Swap overlay · Instant". Ported from android/
/// ui/components/MainTabBar.kt; supersedes the pre-CHINEDU StakTabBar.
struct MainTabBar: View {
	@Binding var selected: MainTab
	/// Fired when the already-selected tab is tapped (1:2330 authors Discover -> fresh deck).
	var onReselect: ((MainTab) -> Void)? = nil

	var body: some View {
		let u = figmaUnit
		ZStack(alignment: .top) {
			Color(argb: 0xFF060C1D)
			// Authored gaps: 28 on the 86 bar (1:1221), 30 on the compact 75 bar (1:1788).
			// Gap 30 / row 337 (+0.5 nudge) - the spec on the News, My STAK,
			// Simulate and Discover bars; the Home bars' 28/329 is overridden
			// by the one-stable-bar ruling (user, 2026-08-23).
			HStack(alignment: .top, spacing: 30 * u) {
				ForEach(MainTab.allCases) { tab in
					Button {
						if tab == selected { onReselect?(tab) } else { selected = tab }
					} label: {
						VStack(spacing: 10 * u) {
							Image(tab == selected ? tab.activeIcon : tab.inactiveIcon)
								.resizable()
								.frame(width: 24 * u, height: 24 * u)
							Text(tab.rawValue)
								// Authored label face: Inter Regular 12.
								.font(StakFont.inter(12 * u))
								.foregroundStyle(Color.white)
						}
						// Authored: only Tab - Home has a fixed width (34); the rest hug.
						.frame(width: tab == .home ? 34 * u : nil)
					}
					.buttonStyle(.pressDim)
				}
			}
			.offset(x: 0.5 * u)
			.padding(.top, 18 * u)
		}
		.frame(maxWidth: .infinity)
		.frame(height: 86 * u)
	}
}
