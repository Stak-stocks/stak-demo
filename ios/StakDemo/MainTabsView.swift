import SwiftUI

/// A page pushed over the tab shell.
private enum PushedPage: Identifiable, Equatable {
	case newsDetail(article: String)
	case stockDetail(fromMyStak: Bool, symbol: String)
	/// Codex parity audit (2026-09-04): carries the tapped chip's
	/// collection id (MyStak/Collections.swift).
	case collection(id: String)
	case profile
	/// 09 Profile setup as the hub's edit page (user, 2026-09-07).
	case editProfile
	case notifications
	/// Home · Search (FigJam Home board, 2026-09-14).
	case search
	/// Go live (FigJam Go live boards, 2026-09-14): the identity + funding walk, and the real-money account home.
	case goLive
	case liveAccount
	case settings(SettingsKind)
	case simPortfolio
	/// Codex parity audit (2026-09-04): carries the tapped pick's ticker
	/// (Simulate/PickDetailView.swift PickSpecs).
	case simPick(symbol: String)
	case leaderboard

	var id: String {
		switch self {
		case .newsDetail(let article): return "newsDetail-\(article)"
		case .stockDetail(let fromMyStak, let symbol): return "stockDetail-\(fromMyStak)-\(symbol)"
		case .collection(let id): return "collection-\(id)"
		case .profile: return "profile"
		case .editProfile: return "editProfile"
		case .notifications: return "notifications"
		case .search: return "search"
		case .goLive: return "goLive"
		case .liveAccount: return "liveAccount"
		case .settings(let kind): return "settings-\(kind.rawValue)"
		case .simPortfolio: return "simPortfolio"
		case .simPick(let symbol): return "simPick-\(symbol)"
		case .leaderboard: return "leaderboard"
		}
	}
}

/// The prototype's transition vocabulary for shell navigation: forwardPush
/// = the authored "PUSH LEFT 300 ease-out" (FlowAnim.pushRight — in from
/// the leading edge, out to the trailing); houseBack = the authored "PUSH
/// RIGHT 300 ease-out" (FlowAnim.pushLeft — in from the trailing edge, out
/// to the leading); dissolve = the authored 300ms cross-fade; instant = no
/// animation at all.
private enum NavStyle {
	case houseBack
	case forwardPush
	case dissolve
	case instant

	var transition: AnyTransition {
		switch self {
		case .houseBack: FlowAnim.pushLeft.transition
		case .forwardPush: FlowAnim.pushRight.transition
		case .dissolve: .opacity
		case .instant: .identity
		}
	}

	/// Pushes ride the house 300 ease-out; the shell's dissolves are the
	/// authored 300 (not the auth flow's 350).
	var animation: Animation {
		switch self {
		case .dissolve: .easeOut(duration: 0.3)
		default: FlowAnim.pushRight.animation
		}
	}

	/// While a page covers it, the content below parks one screen toward
	/// the edge it must re-enter from when this style pops: the trailing
	/// side for the house back push, the leading side for a forward push,
	/// in place for dissolves and instant cuts.
	func parkedShift(_ width: CGFloat) -> CGFloat {
		switch self {
		case .houseBack: width
		case .forwardPush: -width
		case .dissolve, .instant: 0
		}
	}
}

/// The bottom-tab shell — mirrors android/ MainShell (StakNavHost.kt).
/// The bar hides while Home is in its first-run state (the scrim + pill
/// own the bottom). Tab switches are the prototype's "Swap overlay ·
/// Instant" unless an authored PUSH LEFT edge lands on a tab — then the
/// whole tab page, bar and hoisted ticket included, plays the forward
/// push. Pushed pages keep the house Push Right entry; every pop picks
/// its authored style (house back, forward push, dissolve or instant),
/// and cross-tab edges retarget `tab` before the pop reveals the shell.
struct MainTabsView: View {
	var onLogOut: () -> Void = {}
	/// Delete account (FigJam Profile board, 2026-09-14): the session is gone, the app returns to Create account.
	var onAccountDeleted: () -> Void = {}
	@State private var tab = MainTab.home
	// First run (1:958) is for a FIRST-TIME user only: the account was created
	// here and the run has not been completed yet. An active/returning user -
	// Sign in, or any relaunch after the first run - lands on Home Main
	// (user, 2026-09-07). Completion persists in Session.
	@State private var homeFirstRun = Session.shared.firstRunPending
	@State private var pushed: [PushedEntry] = []

	/// One live entry on the pushed stack. Identity is PER PUSH (a fresh
	/// uid), not per page - an article chain can legally revisit a story
	/// (A -> B -> A via READ NEXT), and ForEach needs distinct ids for
	/// the twins, mirroring Android's per-push back-stack entries
	/// (audit 2026-08-25).
	private struct PushedEntry: Identifiable, Equatable {
		let id = UUID()
		let page: PushedPage
	}
	/// Hoisted Discover buy ticket — the sheet's scrim covers the tab bar
	/// (frame 1:1970), so the shell owns it, mirroring Android MainShell.
	/// Codex audit (2026-09-04): carries the FRONT card's spec.
	@State private var discoverBuy: BuySpec? = nil
	/// 1:4232 / 85:895: the Simulate ticket also covers the tab bar. It
	/// carries the tapped row's spec (PLTR or COST) the way discoverBuy does.
	@State private var simulateBuy: BuySpec? = nil
	/// 1:2330: Discover tab re-tap -> the deck restarts (from its end state).
	@State private var discoverResetKey = 0

	/// One-shot style flags: how the next tab swap / pushed-stack change
	/// moves. Committed immediately before the mutation they steer.
	@State private var tabStyle = NavStyle.instant
	@State private var navStyle = NavStyle.forwardPush
	/// Where covered content parks — see NavStyle.parkedShift.
	@State private var parkedShift: CGFloat = UIScreen.main.bounds.width

	private var pageWidth: CGFloat { UIScreen.main.bounds.width }

	var body: some View {
		ZStack {
			tabShell
				// While a page covers it the shell waits one screen toward
				// the active pop style's entry side, so a house back pop
				// reveals it sliding in from the trailing edge exactly like
				// the authored PUSH RIGHT (a forward-push pop from leading).
				.offset(x: pushed.isEmpty ? 0 : parkedShift)
				.id(tab)
				.transition(tabStyle.transition)

			ForEach(pushed) { entry in
				// isTop: a READ NEXT push covers the previous article without
				// unmounting it (the parked page carries the pop transitions),
				// so the covered page is told explicitly - it releases its hero
				// player instead of playing on under the new article.
				pageView(entry.page, isTop: entry.id == pushed.last?.id)
					.offset(x: entry.id == pushed.last?.id ? 0 : parkedShift)
					.id(entry.id)
					.transition(navStyle.transition)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	/// One tab page — content, the stable bar and any hoisted ticket. The
	/// whole container carries .id(tab) so a forward-push tab switch slides
	/// page + bar + ticket out as one, while SWAP taps stay instant.
	private var tabShell: some View {
		ZStack {
			VStack(spacing: 0) {
				Group {
					switch tab {
					case .home:
						HomeView(
							firstRun: homeFirstRun,
							// Authored (1:958/1:1097 Motion): the pill and the deck
							// banner jump to the Discover deck ("first run" frame),
							// the mood card to News, the why-card to My STAK — all
							// Instant; first-run ends once the pick is seen.
							// First run ends on ANY tab hop, not only the pick: every tab
							// bar's Home tab is authored to Home Main (1:1354 -> 1:1097), so
							// 1:958 Market Mood -> News -> Home lands on Main, never back on
							// the scrim (prototype walk, 2026-09-05; mirrors Android). Only
							// the avatar's Profile push (1:1003, BACK) returns to first run.
							onSeeTodaysPick: { endFirstRun(); switchTab(.discover) },
							onProfile: { push(.profile) },
							// Product audit (2026-09-05): the bell opens the inbox.
							onBell: { push(.notifications) },
							onOpenNews: { endFirstRun(); switchTab(.news) },
							onOpenMyStak: { endFirstRun(); switchTab(.myStak) },
							onOpenDeck: { endFirstRun(); switchTab(.discover) },
							// The board-only sections: a stock opens its detail, the circle opens Search.
							onOpenStock: { symbol in pushInstant(.stockDetail(fromMyStak: false, symbol: symbol)) },
							onOpenSavedStock: { symbol in pushInstant(.stockDetail(fromMyStak: true, symbol: symbol)) },
							onSearch: { push(.search) },
							onGoLive: { openGoLive() }
						)
					case .news:
						// Authored (1:1228): Story tile -> News detail unsaved, Instant.
						NewsView(onOpenArticle: { id in pushInstant(.newsDetail(article: id)) })
					case .discover:
						DiscoverView(
							resetKey: discoverResetKey,
							// Authored (1:1785): Learn more -> Stock Detail folded, Instant.
							onLearnMore: { symbol in pushInstant(.stockDetail(fromMyStak: false, symbol: symbol)) },
							onPracticeBuy: { discoverBuy = $0 },
							// Authored (1:2330): the receipt's cross-tab CTAs are
							// instant SWAPs to My STAK / Simulate.
							onReviewSaves: { switchTab(.myStak) },
							onPracticeBuySaves: { switchTab(.simulate) }
						)
					case .myStak:
						MyStakView(
							// Authored (1:3180 template): every collection card ->
							// Collection, Instant - serving the tapped collection.
							onOpenCollection: { id in pushInstant(.collection(id: id)) },
							onStartSwiping: { switchTab(.discover) }
						)
					case .simulate:
						SimulateView(
							// Authored (1:3898): every listed edge is Instant.
							onOpenPortfolio: { pushInstant(.simPortfolio) },
							// Every pick tile / row opens ITS pick (Codex parity audit, 2026-09-04).
							onOpenPick: { symbol in pushInstant(.simPick(symbol: symbol)) },
							onOpenLeaderboard: { pushInstant(.leaderboard) },
							// Authored (1:3964): All saved staks -> the My STAK tab.
							onOpenMyStak: { switchTab(.myStak) },
							onOpenDiscover: { switchTab(.discover) },
							onPracticeBuy: { simulateBuy = $0 },
							onGoLive: { openGoLive() }
						)
					}
				}
				.frame(maxWidth: .infinity, maxHeight: .infinity)
				if !(tab == .home && homeFirstRun) {
					// authored height includes the home-indicator zone, so the
					// shell lets it run to the physical bottom of the screen.
					// One stable bar on every tab (user, 2026-08-23): only the
					// active tab changes.
					MainTabBar(selected: Binding(get: { tab }, set: { switchTab($0) }), onReselect: { if $0 == .discover { discoverResetKey += 1 } })
				}
			}
			.ignoresSafeArea(edges: .bottom)

			// Hoisted tickets — their scrims cover the tab bar, and living
			// inside the tab page they ride any forward-push tab switch out
			// with it.
			if tab == .discover, let spec = discoverBuy {
				DiscoverBuyFlow(
					spec: spec,
					onClose: { discoverBuy = nil },
					// Authored (85:1205): View in My STAK -> Overview, PUSH
					// LEFT 300 — deck + sheet leave together as the tab
					// switches; Keep exploring -> deck, DISSOLVE 300.
					onFilledPrimary: { switchTab(.myStak, .forwardPush) { discoverBuy = nil } },
					onFilledSecondary: { withAnimation(.easeOut(duration: 0.3)) { discoverBuy = nil } },
					// Codex audit (2026-09-04): the receipt's Bought count (1:2330)
					// - the ticket lives here, so the shell reports the fill. Last
					// argument: onFilled is DiscoverBuyFlow's last stored property.
					onFilled: { DeckSession.shared.bought += 1 }
				)
				.transition(.opacity)
			}
			if tab == .simulate, let spec = simulateBuy {
				DiscoverBuyFlow(
					spec: spec,
					onClose: { simulateBuy = nil },
					filledPrimary: "View portfolio",
					filledSecondary: "Done",
					ticketSecondary: "Back",
					// Authored (85:895): View portfolio -> Portfolio, PUSH LEFT
					// 300, the ticket leaving with the Simulate page beneath
					// it; Done -> home, DISSOLVE 300.
					onFilledPrimary: { push(.simPortfolio) { simulateBuy = nil } },
					onFilledSecondary: { withAnimation(.easeOut(duration: 0.3)) { simulateBuy = nil } }
				)
				.transition(.opacity)
			}
		}
	}

	@ViewBuilder
	private func pageView(_ page: PushedPage, isTop: Bool) -> some View {
		switch page {
		case .newsDetail(let article):
			// The article's back motion is not authored - it mirrors the
			// instant entry.
			NewsDetailView(
				articleId: article,
				onBack: { pop(.instant) },
				// Authored (101:1005): View in My STAK -> My STAK Overview,
				// PUSH LEFT 300 - the article chain leaves trailing while the
				// shell, already retargeted to My STAK, enters from leading.
				onViewInMyStak: { pop(.forwardPush, all: true, landing: .myStak) },
				// READ NEXT rows push the next story's article (user, 2026-08-25).
				// allowRepeat: after a swipe the page's READ NEXT can list the
				// story this entry was opened for (pager, 2026-08-31).
				onOpenArticle: { id in pushInstant(.newsDetail(article: id), allowRepeat: true) },
				// Only the top of the pushed stack owns a live hero player.
				isTop: isTop
			)
		case .stockDetail(let fromMyStak, let symbol):
			StockDetailView(
				// The My STAK entry's authored Back -> Collection is Instant
				// (16:1012); the Discover entry's back is unauthored and
				// keeps its instant pop.
				onBack: { pop(.instant) },
				fromMyStak: fromMyStak,
				symbol: symbol,
				// Authored (92:969 / 71:949): success "View in My STAK" ->
				// Overview, PUSH LEFT 300.
				onViewInMyStak: { pop(.forwardPush, all: true, landing: .myStak) },
				// Authored (92:969): "Keep exploring" -> deck, DISSOLVE 300.
				onKeepExploring: { pop(.dissolve, all: true, landing: .discover) },
				// Authored (1:2382): the Discover entry's Practice buy lands
				// on the Simulate tab, Instant.
				onPracticeBuyToSimulate: { pop(.instant, all: true, landing: .simulate) },
				// Authored (1:2579): the open state's tab bar SWAPs - pop the
				// detail instantly and land on the tapped tab.
				onTab: { pop(.instant, all: true, landing: $0) },
				// A filled live order's "View account" (FigJam Go live boards, 2026-09-14).
				onViewLiveAccount: { push(.liveAccount) }
			)
		case .collection(let id):
			CollectionView(
				// Unknown ids serve the authored AI & Tech sample.
				collection: StakCollections.collection(id),
				// Authored (1:3333): Back -> Overview Instant; every stock
				// card -> the saved Stock Detail of ITS ticker, Instant
				// (Codex parity audit, 2026-09-04).
				onBack: { pop(.instant) },
				onOpenStock: { ticker in pushInstant(.stockDetail(fromMyStak: true, symbol: ticker)) },
				// Codex audit (2026-09-04): Add stock -> the Discover deck,
				// Instant - swiping the deck is the app's only add path, so
				// the tile hops there like the open state's tab-bar SWAPs.
				onAddStock: { pop(.instant, all: true, landing: .discover) }
			)
		case .profile:
			// Authored (171:995): Back = BACK action - the house back pop.
			ProfileView(onBack: { pop() }, onLogOut: onLogOut, onOpenSetting: { kind in push(.settings(kind)) }, onEditProfile: {
				// Two fingers on the block must not stack two edit pages (review 2026-09-07).
				if pushed.last?.page != .editProfile { push(.editProfile) }
			}, onGoLive: { openGoLive() })
		case .goLive:
			// Go live (FigJam Go live boards, 2026-09-14): resumes at the account's step.
			GoLiveFlow(onBack: { pop() }, onOpenAccount: {
				// The walk is over: the account home takes its place on the stack with the house
				// forward push - mirrors Android's navigate(LIVE_ACCOUNT) { popUpTo(GO_LIVE) { inclusive = true } }.
				// Guarded so a second tap during the slide cannot swap a page that is no longer on top.
				guard pushed.last?.page == .goLive else { return }
				navStyle = .forwardPush
				parkedShift = pageWidth
				withAnimation(FlowAnim.pushRight.animation) { pushed[pushed.count - 1] = PushedEntry(page: .liveAccount) }
			})
		case .liveAccount:
			LiveAccountView(
				onBack: { pop() },
				// "Find a stock" lands on the Discover deck.
				onFindStock: { pop(.instant, all: true, landing: .discover) },
				onOpenStock: { symbol in pushInstant(.stockDetail(fromMyStak: false, symbol: symbol)) }
			)
		case .editProfile:
			// House push in, house back out; Save pops back to the hub, which
			// observes UserProfile and re-renders the avatar block. Pops only while
			// this page is still on top: a second tap on Save during the pop must
			// not take the hub with it.
			ProfileSetupView(onBack: { if pushed.last?.page == .editProfile { pop() } }, onProceed: { if pushed.last?.page == .editProfile { pop() } }, editing: true)
		case .notifications:
			NotificationsView(onBack: { pop() }, onOpenSettings: { push(.settings(.notifications)) })
		case .search:
			// Home · Search (FigJam Home board, 2026-09-14): stocks open their detail, stories their article.
			SearchView(
				onBack: { pop() },
				onOpenStock: { symbol in pushInstant(.stockDetail(fromMyStak: false, symbol: symbol)) },
				onOpenArticle: { id in pushInstant(.newsDetail(article: id)) },
				onOpenSavedStock: { symbol in pushInstant(.stockDetail(fromMyStak: true, symbol: symbol)) }
			)
		case .settings(let kind):
			SettingsView(kind: kind, onBack: { pop() }, onOpen: { push(.settings($0)) }, onAccountDeleted: onAccountDeleted)
		case .simPortfolio:
			SimPortfolioView(
				// Authored (1:4496): Back -> Simulate home, Instant; rows and
				// Sell pills open the Pick detail of THEIR ticker, Instant.
				onBack: { pop(.instant) },
				onOpenPick: { symbol in pushInstant(.simPick(symbol: symbol)) }
			)
		case .simPick(let symbol):
			PickDetailView(
				symbol: symbol,
				// Authored (1:4631): both Backs land on Portfolio, Instant,
				// however the pick was opened.
				onBack: { backToPortfolio() },
				// Authored (73:855): Back to Simulate -> home, PUSH LEFT 300;
				// View portfolio -> Portfolio, DISSOLVE 300.
				onSellBackToSimulate: { pop(.forwardPush, all: true, landing: .simulate) },
				onSellViewPortfolio: { dissolveToPortfolio() }
			)
		case .leaderboard:
			// Authored (1:4124): Back -> Simulate home, Instant.
			LeaderboardView(onBack: { pop(.instant) })
		}
	}

	/// SWAP taps stay instant; an authored PUSH LEFT edge that lands on a
	/// tab passes .forwardPush and the whole tab page slides out trailing
	/// while the target enters from leading, 300 ease-out. `also` runs in
	/// the same transaction (e.g. dismissing a hoisted ticket with it).
	/// Home's first run ends (the pill or any tab hop): the user is a returning user from here on.
	private func endFirstRun() {
		homeFirstRun = false
		Session.shared.completeFirstRun()
	}

	private func switchTab(_ target: MainTab, _ style: NavStyle = .instant, also: () -> Void = {}) {
		tabStyle = style
		if style == .instant {
			tab = target
			also()
		} else {
			withAnimation(style.animation) {
				tab = target
				also()
			}
		}
	}

	/// The house forward push. `also` runs inside the same animation (e.g.
	/// the Simulate ticket leaving with the page it scrims, 85:895).
	private func push(_ page: PushedPage, also: () -> Void = {}) {
		// Double-tap during the 300ms slide would stack the same page
		// twice (audit 2026-08-25).
		guard pushed.last?.page.id != page.id else { return }
		navStyle = .forwardPush
		parkedShift = pageWidth
		withAnimation(FlowAnim.pushRight.animation) {
			pushed.append(PushedEntry(page: page))
			also()
		}
	}

	/// Appends with no animation - the prototype's "Instant".
	/// `allowRepeat`: the article pager can legally push the very story it
	/// was opened for - a swiped-to page's READ NEXT lists it; instant pushes
	/// cover the row before a second tap can land, so the double-tap guard
	/// is not needed there.
	private func pushInstant(_ page: PushedPage, allowRepeat: Bool = false) {
		guard allowRepeat || pushed.last?.page.id != page.id else { return }
		parkedShift = pageWidth
		pushed.append(PushedEntry(page: page))
	}

	/// Every pop chooses its authored style. The style flag, the parking
	/// side and any tab retarget are committed one frame ahead - hidden
	/// under the opaque top page - so the outgoing page leaves on the
	/// style's exit edge while the revealed content enters from the
	/// opposite one. `all` clears the whole chain: pages sandwiched between
	/// the top and the shell go silently in that hidden frame, and only the
	/// top plays the pop transition.
	private func pop(_ style: NavStyle = .houseBack, all: Bool = false, landing: MainTab? = nil) {
		guard !pushed.isEmpty else { return }
		if let landing {
			tabStyle = .instant
			tab = landing
		}
		if style == .instant {
			if all { pushed.removeAll() } else { pushed.removeLast() }
			return
		}
		if all, pushed.count > 1 { pushed.removeFirst(pushed.count - 1) }
		navStyle = style
		parkedShift = style.parkedShift(pageWidth)
		DispatchQueue.main.async {
			withAnimation(style.animation) {
				if !pushed.isEmpty { pushed.removeLast() }
			}
		}
	}

	/// Live = the account home, otherwise the Go live walk (FigJam Go live boards, 2026-09-14).
	private func openGoLive() {
		push(LiveAccount.shared.isLive ? .liveAccount : .goLive)
	}

	/// Pick detail's Backs always land on Portfolio (1:4631): pop when it
	/// sits directly below, else swap the pick for Portfolio - Instant
	/// either way - so Portfolio's own Back still returns to Simulate home.
	private func backToPortfolio() {
		if case .simPortfolio? = pushed.dropLast().last?.page {
			pop(.instant)
		} else if !pushed.isEmpty {
			pushed[pushed.count - 1] = PushedEntry(page: .simPortfolio)
		}
	}

	/// Sell success "View portfolio" (73:855): dissolve-pop to the
	/// Portfolio below, or cross-fade the pick into Portfolio when the
	/// pick was opened straight from Simulate home - 300 ease-out.
	private func dissolveToPortfolio() {
		if case .simPortfolio? = pushed.dropLast().last?.page {
			pop(.dissolve)
		} else {
			navStyle = .dissolve
			parkedShift = 0
			DispatchQueue.main.async {
				withAnimation(NavStyle.dissolve.animation) {
					if !pushed.isEmpty {
						pushed[pushed.count - 1] = PushedEntry(page: .simPortfolio)
					}
				}
			}
		}
	}
}
