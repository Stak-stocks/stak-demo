package com.stak.demo.navigation

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.updateTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.navigation.navArgument
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.stak.demo.ui.components.MainTab
import com.stak.demo.ui.components.MainTabBar
import com.stak.demo.ui.discover.BuySpec
import com.stak.demo.ui.discover.DiscoverBuySpecSaver
import com.stak.demo.ui.discover.DiscoverBuyFlow
import com.stak.demo.ui.discover.DiscoverScreen
import com.stak.demo.ui.discover.StockDetailScreen
import com.stak.demo.ui.home.HomeScreen
import com.stak.demo.ui.mystak.CollectionScreen
import com.stak.demo.ui.mystak.MyStakScreen
import com.stak.demo.ui.news.NewsDetailScreen
import com.stak.demo.ui.profile.ProfileScreen
import com.stak.demo.ui.simulate.LeaderboardScreen
import com.stak.demo.ui.simulate.PickDetailScreen
import com.stak.demo.ui.simulate.SimBuySpecSaver
import com.stak.demo.ui.simulate.SimPortfolioScreen
import com.stak.demo.ui.simulate.SimulateScreen
import com.stak.demo.ui.news.NewsScreen
import com.stak.demo.ui.onboarding.CreateAccountScreen
import com.stak.demo.ui.onboarding.SplashScreen
import com.stak.demo.ui.onboarding.SignInScreen
import com.stak.demo.ui.onboarding.IntroScreen
import com.stak.demo.ui.onboarding.BrandPicksScreen
import com.stak.demo.ui.onboarding.SwipeTutorialScreen
import com.stak.demo.ui.onboarding.GoalScreen
import com.stak.demo.ui.onboarding.RiskScreen
import com.stak.demo.ui.onboarding.PermissionsScreen
import com.stak.demo.ui.onboarding.PreparingDeckScreen
import com.stak.demo.ui.onboarding.ProfileSetupScreen
import com.stak.demo.ui.onboarding.TasteRevealScreen

/**
 * Root of the app: splash → auth → onboarding → the bottom-tab shell.
 *
 * Prototype-confirmed edges (CHINEDU proto panel): splash auto-advances
 * to Auth · Sign up after 1200ms with a 350ms ease-out dissolve. The
 * post-auth ordering (create account → 01 Welcome → … → 07 Taste reveal
 * → 08 Permissions → 09 Profile setup → shell) follows the canvas order
 * pending per-frame prototype confirmation.
 */
@Composable
fun StakRoot(navController: NavHostController = rememberNavController()) {
	// A2: the style the CURRENT shell pop (or styled push) plays with -
	// set by the edge that navigates, read by the route transitions
	// below, and reset to the house default once the NavHost settles.
	val shellPop = remember { mutableStateOf(PopStyle.HOUSE_BACK) }
	val pendingShellTab = remember { mutableStateOf<MainTab?>(null) }
	val visibleEntries by navController.visibleEntries.collectAsState()
	LaunchedEffect(visibleEntries) {
		// Settled = only the top entry stays visible; the one-shot style
		// falls back so system-back pops keep the house behaviour.
		if (visibleEntries.size <= 1) shellPop.value = PopStyle.HOUSE_BACK
	}
	// A4: pop the whole pushed chain back to the shell with a chosen
	// style, optionally landing on a tab (via pendingShellTab).
	fun popToShell(style: PopStyle, tab: MainTab? = null) {
		shellPop.value = style
		tab?.let { pendingShellTab.value = it }
		navController.popBackStack(StakRoutes.MAIN, false)
	}
	// A protected account re-locks when the app leaves the foreground (Codex
	// review, PR #167 mirror): ON_STOP pushes the gate over whatever was open
	// - the task-switcher snapshot shows the splash backdrop - and unlocking
	// pops back to it. Picture-in-picture never stops the activity, so a
	// floating clip keeps playing.
	@Suppress("DEPRECATION")
	val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current
	androidx.compose.runtime.DisposableEffect(lifecycleOwner) {
		val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
			if (event == androidx.lifecycle.Lifecycle.Event.ON_STOP &&
				com.stak.demo.ui.Session.signedIn && com.stak.demo.ui.UserProfile.accountLock
			) {
				val route = navController.currentBackStackEntry?.destination?.route
				if (route != null && route != StakRoutes.LOCK && route != StakRoutes.SPLASH) {
					navController.navigate(StakRoutes.LOCK) { launchSingleTop = true }
				}
			}
		}
		lifecycleOwner.lifecycle.addObserver(observer)
		onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
	}
	// The persisted session (sign-in state + profile) is restored in
	// StakApp.onCreate, before any composition - composition must not
	// mutate app state (RememberReturnType lint, audit 2026-09-04).
	NavHost(
		navController = navController,
		startDestination = StakRoutes.SPLASH,
		// Prototype house style (confirmed on the splash/sign-up/sign-in/
		// 01 Welcome frames): forward = Push Right (in from the left),
		// back = Push Left (in from the right), ease out 300ms. These are
		// the defaults; frames with their own wiring override per edge.
		enterTransition = { slideInHorizontally(tween(300, easing = EaseOut)) { -it } },
		exitTransition = { slideOutHorizontally(tween(300, easing = EaseOut)) { it } },
		popEnterTransition = { slideInHorizontally(tween(300, easing = EaseOut)) { it } },
		popExitTransition = { slideOutHorizontally(tween(300, easing = EaseOut)) { -it } },
	) {
		composable(
			StakRoutes.SPLASH,
			// Prototype: dissolve, ease out, 350ms.
			exitTransition = { fadeOut(tween(350, easing = EaseOut)) },
		) {
			SplashScreen(
				onContinue = {
					// Returning user (signed in before) goes straight to Home;
					// a first-time user is taken to create an account
					// (user, 2026-08-23).
					// A signed-in user who left "Account security" on unlocks first (Codex review, PR #167 mirror).
					val locked = com.stak.demo.ui.Session.signedIn && com.stak.demo.ui.UserProfile.accountLock
					val next = if (com.stak.demo.ui.Session.signedIn) (if (locked) StakRoutes.LOCK else StakRoutes.MAIN) else StakRoutes.createAccount(via = "dissolve")
					navController.navigate(next) {
						popUpTo(StakRoutes.SPLASH) { inclusive = true }
					}
				},
			)
		}
		composable(
			StakRoutes.LOCK,
			enterTransition = { fadeIn(tween(350, easing = EaseOut)) },
			exitTransition = { fadeOut(tween(350, easing = EaseOut)) },
		) {
			com.stak.demo.ui.onboarding.BiometricGate(onUnlocked = {
				// From the splash the gate is the whole stack - Home follows; a re-lock
				// sits over the place the user left, so unlocking pops back to it.
				if (navController.previousBackStackEntry != null) navController.popBackStack()
				else navController.navigate(StakRoutes.MAIN) { popUpTo(StakRoutes.LOCK) { inclusive = true } }
			})
		}
		composable(
			StakRoutes.INTRO,
			arguments = listOf(navArgument("via") { defaultValue = "forward" }),
			// Prototype (sign-up frame): socials/CTA arrive as Push Right
			// (in from the left), the back circle as Push Left (in from
			// the right) — both ease out, 300ms.
			enterTransition = {
				when (targetState.arguments?.getString("via")) {
					"back" -> slideInHorizontally(tween(300, easing = EaseOut)) { it }
					else -> slideInHorizontally(tween(300, easing = EaseOut)) { -it }
				}
			},
		) {
			IntroScreen(onGetStarted = { navController.navigate(StakRoutes.BRAND_PICKS) })
		}
		composable(StakRoutes.BRAND_PICKS) {
			BrandPicksScreen(
				onBack = { navController.popBackStack() },
				onContinue = { navController.navigate(StakRoutes.SWIPE_TUTORIAL) },
			)
		}
		composable(StakRoutes.SWIPE_TUTORIAL) {
			SwipeTutorialScreen(
				onBack = { navController.popBackStack() },
				onContinue = { navController.navigate(StakRoutes.GOAL) },
			)
		}
		composable(StakRoutes.GOAL) {
			GoalScreen(
				onBack = { navController.popBackStack() },
				onContinue = { navController.navigate(StakRoutes.RISK) },
			)
		}
		composable(StakRoutes.RISK) {
			RiskScreen(
				onBack = { navController.popBackStack() },
				onContinue = { navController.navigate(StakRoutes.PREPARING_DECK) },
			)
		}
		composable(
			StakRoutes.PREPARING_DECK,
			// Prototype: the loader dissolves into the taste reveal (350ms
			// ease out) after its 1800ms hold.
			exitTransition = {
				if (targetState.destination.route == StakRoutes.TASTE_REVEAL) {
					fadeOut(tween(350, easing = EaseOut))
				} else {
					null
				}
			},
		) {
			PreparingDeckScreen(
				onDone = {
					navController.navigate(StakRoutes.TASTE_REVEAL) {
						popUpTo(StakRoutes.PREPARING_DECK) { inclusive = true }
					}
				},
			)
		}
		composable(
			StakRoutes.TASTE_REVEAL,
			enterTransition = {
				if (initialState.destination.route == StakRoutes.PREPARING_DECK) {
					fadeIn(tween(350, easing = EaseOut))
				} else {
					null
				}
			},
		) {
			TasteRevealScreen(
				onBack = { navController.popBackStack() },
				onLetsGo = { navController.navigate(StakRoutes.PERMISSIONS) },
			)
		}
		composable(
			StakRoutes.CREATE_ACCOUNT,
			arguments = listOf(navArgument("via") { defaultValue = "dissolve" }),
			// Prototype: splash and the sign-in "Create account" link both
			// dissolve into sign up (350ms ease out). Once Log out (B21) has
			// left sign in alone on the stack, its back circle re-opens sign
			// up as a navigate — `via=back` plays the authored Push Left
			// (in from the right, 300ms; 1:879 Motion).
			enterTransition = {
				when {
					targetState.arguments?.getString("via") == "back" ->
						slideInHorizontally(tween(300, easing = EaseOut)) { it }
					// Splash, the sign-in "Create account" link and Delete account (FigJam
					// Profile board, 2026-09-14; via=dissolve) all arrive as the 350 dissolve.
					targetState.arguments?.getString("via") == "dissolve" ||
						initialState.destination.route == StakRoutes.SPLASH ||
						initialState.destination.route == StakRoutes.SIGN_IN ->
						fadeIn(tween(350, easing = EaseOut))
					else -> null
				}
			},
			// Prototype (sign-in frame): its back circle returns here as
			// Push Left — sign up slides in from the right (300ms).
			popEnterTransition = {
				if (initialState.destination.route == StakRoutes.SIGN_IN) {
					slideInHorizontally(tween(300, easing = EaseOut)) { it }
				} else {
					null
				}
			},
			// Prototype (sign-up frame): leaving toward 01 Welcome pushes
			// with the arriving screen; toward Sign in it dissolves.
			exitTransition = {
				val target = targetState.destination.route.orEmpty()
				when {
					target.startsWith("onboarding/intro") ->
						if (targetState.arguments?.getString("via") == "back") {
							slideOutHorizontally(tween(300, easing = EaseOut)) { -it }
						} else {
							slideOutHorizontally(tween(300, easing = EaseOut)) { it }
						}
					target == StakRoutes.SIGN_IN -> fadeOut(tween(350, easing = EaseOut))
					else -> null
				}
			},
		) {
			CreateAccountScreen(
				onBack = { navController.navigate(StakRoutes.intro(via = "back")) },
				onCreateAccount = { navController.navigate(StakRoutes.intro(via = "forward")) },
				onSignIn = { navController.navigate(StakRoutes.SIGN_IN) },
				// FigJam entry flow (2026-09-14): an email sign-up verifies the address first.
				// launchSingleTop: a fast double-tap during the 300 ms push must not stack two verification pages.
				onVerifyEmail = { email -> navController.navigate(StakRoutes.verifyEmail(email)) { launchSingleTop = true } },
			)
		}
		composable(
			StakRoutes.VERIFY_EMAIL,
			arguments = listOf(navArgument("email") { defaultValue = "" }),
		) { entry ->
			com.stak.demo.ui.onboarding.EmailVerificationScreen(
				email = entry.arguments?.getString("email").orEmpty(),
				onBack = { navController.popBackStack() },
				// "Yes" -> the investor quiz starts at 01 Welcome; the verification page
				// leaves the stack so Back from 01 lands on Create account as before.
				onVerified = {
					navController.navigate(StakRoutes.intro(via = "forward")) {
						popUpTo(StakRoutes.VERIFY_EMAIL) { inclusive = true }
					}
				},
			)
		}
		composable(StakRoutes.PERMISSIONS) {
			PermissionsScreen(
				onBack = { navController.popBackStack() },
				onContinue = { navController.navigate(StakRoutes.PROFILE_SETUP) },
			)
		}
		composable(StakRoutes.PROFILE_SETUP) {
			ProfileSetupScreen(
				onBack = { navController.popBackStack() },
				onProceed = {
					// Account created - a NEW account, empty until the user saves
					// and buys (product audit, 2026-09-05); remembered across launches.
					com.stak.demo.ui.Session.signIn(demo = false)
					navController.navigate(StakRoutes.MAIN) {
						popUpTo(0) { inclusive = true }
					}
				},
			)
		}
		composable(
			StakRoutes.SIGN_IN,
			// Prototype: the "Sign in" link dissolves over (350ms ease out).
			enterTransition = {
				when (initialState.destination.route) {
					StakRoutes.CREATE_ACCOUNT -> fadeIn(tween(350, easing = EaseOut))
					// B21 (171:995 Motion): arriving from Log out = the house
					// BACK push - sign in slides in from the right.
					StakRoutes.PROFILE -> slideInHorizontally(tween(300, easing = EaseOut)) { it }
					else -> null
				}
			},
			// Prototype (sign-in frame): socials/CTA leave toward Home as
			// Push Right (the authored target is 1:958 "Home first run"; by
			// the 2026-09-07 ruling an active user lands on Home Main - the
			// transition is the same); the "Create account" link dissolves
			// back over sign up; the post-logout back circle (via=back)
			// leaves as Push Left — the authored Back edge's other half.
			exitTransition = {
				when (targetState.destination.route) {
					StakRoutes.MAIN -> slideOutHorizontally(tween(300, easing = EaseOut)) { it }
					StakRoutes.CREATE_ACCOUNT ->
						if (targetState.arguments?.getString("via") == "back") {
							slideOutHorizontally(tween(300, easing = EaseOut)) { -it }
						} else {
							fadeOut(tween(350, easing = EaseOut))
						}
					else -> null
				}
			},
			// Prototype (sign-in frame): back circle exits as Push Left.
			popExitTransition = {
				slideOutHorizontally(tween(300, easing = EaseOut)) { -it }
			},
		) {
			SignInScreen(
				// Product audit (2026-09-05): the link opens the reset flow.
				onForgot = { navController.navigate(StakRoutes.FORGOT_PASSWORD) },
				onBack = {
					// B21 aftermath: after Log out, sign in is the whole
					// stack — a bare pop would blank the NavHost, so the
					// authored Back -> Sign up (1:879 Motion) plays as a
					// replacing navigate instead.
					if (navController.previousBackStackEntry != null) {
						navController.popBackStack()
					} else {
						navController.navigate(StakRoutes.createAccount(via = "back")) {
							popUpTo(StakRoutes.SIGN_IN) { inclusive = true }
						}
					}
				},
				onSignIn = {
					// Signed in = the demo account with its authored history
					// (product audit, 2026-09-05); remembered across launches.
					com.stak.demo.ui.Session.signIn(demo = true)
					navController.navigate(StakRoutes.MAIN) {
						popUpTo(0) { inclusive = true }
					}
				},
				onCreateAccount = {
					navController.navigate(StakRoutes.createAccount(via = "dissolve")) {
						popUpTo(StakRoutes.CREATE_ACCOUNT) { inclusive = true }
					}
				},
			)
		}
		composable(StakRoutes.FORGOT_PASSWORD) {
			com.stak.demo.ui.onboarding.ForgotPasswordScreen(onBack = { navController.popBackStack() })
		}
		composable(
			StakRoutes.MAIN,
			// Prototype (sign-in frame): Home arrives as Push Right — in
			// from the left, 300ms ease out. Authored against 1:958 "Home
			// first run"; an active user lands on Home Main (1:1097) by the
			// 2026-09-07 ruling, with the same push.
			enterTransition = {
				when (initialState.destination.route) {
					StakRoutes.SIGN_IN -> slideInHorizontally(tween(300, easing = EaseOut)) { -it }
					// Splash -> Home (returning user) has no authored edge; it completes the
					// splash's authored DISSOLVE 350 (1:926 -> 1:830) instead of pairing that
					// fade-out with the default slide-in - prototype audit 2026-09-04.
					StakRoutes.SPLASH -> fadeIn(tween(350, easing = EaseOut))
					else -> null
				}
			},
			// A3: pushing an instant-edge page must not slide the shell away
			// — except a styled push (B20: the Simulate ticket's View
			// portfolio rides the house forward push, 85:895 Motion).
			exitTransition = {
				when {
					shellPop.value == PopStyle.FORWARD_PUSH ->
						slideOutHorizontally(tween(300, easing = EaseOut)) { it }
					targetState.destination.route in INSTANT_ROUTES -> ExitTransition.None
					else -> null
				}
			},
			// A2: the shell re-enters with whatever style the leaving page
			// chose (forward push in from the LEFT / dissolve / instant);
			// unstyled pops keep the house back for PROFILE and stay still
			// for the instant pages.
			popEnterTransition = {
				popEnterFor(shellPop.value, initialState.destination.route in INSTANT_ROUTES)
			},
		) {
			MainShell(
				pendingTab = pendingShellTab,
				onOpenArticle = { id -> navController.navigate(StakRoutes.newsDetail(id)) },
				onOpenStock = { symbol -> navController.navigate(StakRoutes.stockDetail(symbol)) },
				onOpenCollection = { id -> navController.navigate(StakRoutes.collection(id)) },
				onOpenProfile = { navController.navigate(StakRoutes.PROFILE) },
				// Product audit (2026-09-05): the bell opens the inbox.
				onOpenNotifications = { navController.navigate(StakRoutes.NOTIFICATIONS) },
				onOpenSimPortfolio = { navController.navigate(StakRoutes.SIM_PORTFOLIO) },
				onOpenSimPick = { symbol -> navController.navigate(StakRoutes.simPick(symbol)) },
				onOpenLeaderboard = { navController.navigate(StakRoutes.LEADERBOARD) },
				// B20 (85:895 Motion): the ticket's View portfolio pushes the
				// portfolio with the house forward push over the leaving shell.
				onViewSimPortfolio = {
					shellPop.value = PopStyle.FORWARD_PUSH
					// B20: a fast double-tap during the 300ms push must not
					// stack a second portfolio (its Back would then miss
					// Simulate home) — single-top swallows the repeat.
					navController.navigate(StakRoutes.SIM_PORTFOLIO) {
						launchSingleTop = true
					}
				},
				// A held stock opens the saved flavour of Stock Detail (review 2026-09-14).
				onOpenSavedStock = { symbol -> navController.navigate(StakRoutes.myStakStock(symbol)) },
			)
		}
		composable(
			StakRoutes.STOCK_DETAIL,
			// Authored (1:1785 Motion): Learn more -> Stock Detail Unsaved
			// folded is INSTANT; the unauthored back mirrors it. The save-
			// success CTAs style their pop through shellPop (A2).
			enterTransition = { EnterTransition.None },
			exitTransition = { ExitTransition.None },
			popEnterTransition = { EnterTransition.None },
			popExitTransition = { popExitFor(shellPop.value, instantRoute = true) },
		) { entry ->
			StockDetailScreen(
				onBack = { navController.popBackStack() },
				symbol = entry.arguments?.getString("symbol") ?: "AAPL",
				// B5 (1:2382 Motion): Practice buy leaves the detail and
				// lands on the Simulate tab, Instant.
				onPracticeBuy = { popToShell(PopStyle.INSTANT, MainTab.Simulate) },
				// B7/B8 (92:969 Motion): View in My STAK forward-pushes to
				// the My STAK tab; Keep exploring dissolves back to the deck.
				onViewInMyStak = { popToShell(PopStyle.FORWARD_PUSH, MainTab.MySTAK) },
				onKeepExploring = { popToShell(PopStyle.DISSOLVE, MainTab.Discover) },
				// B9 (1:2579): the open state's tab bar - each tab pops Instant.
				onTab = { popToShell(PopStyle.INSTANT, it) },
			)
		}
		composable(
			StakRoutes.COLLECTION,
			// Authored (1:3155/1:3333 Motion): every My STAK hop is Instant.
			enterTransition = { EnterTransition.None },
			exitTransition = { ExitTransition.None },
			popEnterTransition = { popEnterFor(shellPop.value, instantRoute = true) },
			popExitTransition = { popExitFor(shellPop.value, instantRoute = true) },
		) { entry ->
			CollectionScreen(
				// Codex parity audit (2026-09-04): the chip's id rides the
				// route so the page serves THAT collection (aitech = frame).
				collectionId = entry.arguments?.getString("id") ?: "aitech",
				onBack = { navController.popBackStack() },
				onOpenStock = { symbol -> navController.navigate(StakRoutes.myStakStock(symbol)) },
				// Codex audit (2026-09-04): adding stocks = the Discover deck,
				// the app's only add path - the dashed tile hops there, Instant.
				onAddStock = { popToShell(PopStyle.INSTANT, MainTab.Discover) },
			)
		}
		composable(
			StakRoutes.MYSTAK_STOCK,
			// Authored (1:3375/16:1012 Motion): stock card in and Back out
			// are Instant; the buy-success CTAs style the pop via shellPop.
			enterTransition = { EnterTransition.None },
			exitTransition = { ExitTransition.None },
			popEnterTransition = { EnterTransition.None },
			popExitTransition = { popExitFor(shellPop.value, instantRoute = true) },
		) { entry ->
			StockDetailScreen(
				onBack = { navController.popBackStack() },
				// Codex parity audit (2026-09-04): the tapped tile's ticker,
				// same as the Discover deck's Learn more (STOCK_DETAIL above).
				symbol = entry.arguments?.getString("symbol") ?: "AAPL",
				fromMyStak = true,
				// B13 (71:949/71:994 Motion): View in My STAK forward-pushes
				// the Overview - the detail (and Collection) pop to the shell.
				onViewInMyStak = { popToShell(PopStyle.FORWARD_PUSH, MainTab.MySTAK) },
			)
		}
		composable(
			StakRoutes.SIM_PORTFOLIO,
			// Authored: the Simulate home links open the portfolio Instant
			// (1:4037 Motion); the add-success View portfolio arrives on the
			// house forward push (85:895) and the sell success dissolves in
			// (73:855) - both styled through shellPop.
			enterTransition = {
				when (shellPop.value) {
					PopStyle.FORWARD_PUSH -> slideInHorizontally(tween(300, easing = EaseOut)) { -it }
					PopStyle.DISSOLVE -> fadeIn(tween(300, easing = EaseOut))
					else -> EnterTransition.None
				}
			},
			exitTransition = { ExitTransition.None },
			popEnterTransition = { popEnterFor(shellPop.value, instantRoute = true) },
			popExitTransition = { popExitFor(shellPop.value, instantRoute = true) },
		) {
			SimPortfolioScreen(
				onBack = { navController.popBackStack() },
				onOpenPick = { symbol -> navController.navigate(StakRoutes.simPick(symbol)) },
			)
		}
		composable(
			StakRoutes.SIM_PICK,
			// Authored (1:3973/1:4010 Motion): pick rows open this Instant;
			// B19's View portfolio may replace it with a 300 dissolve.
			enterTransition = { EnterTransition.None },
			exitTransition = {
				if (shellPop.value == PopStyle.DISSOLVE) fadeOut(tween(300, easing = EaseOut))
				else ExitTransition.None
			},
			popEnterTransition = { EnterTransition.None },
			popExitTransition = { popExitFor(shellPop.value, instantRoute = true) },
		) { entry ->
			PickDetailScreen(
				// Codex parity audit (2026-09-04): the tapped pick's ticker,
				// same as the Discover deck's Learn more (STOCK_DETAIL above).
				symbol = entry.arguments?.getString("symbol") ?: "NVDA",
				// B17 (1:4631 Motion): both Back buttons land on the
				// Portfolio, Instant - even from Simulate home. If the
				// Portfolio is not below, replace the pick with it so its
				// own Back still returns to Simulate home.
				onBack = {
					shellPop.value = PopStyle.INSTANT
					if (navController.previousBackStackEntry?.destination?.route == StakRoutes.SIM_PORTFOLIO) {
						navController.popBackStack()
					} else {
						navController.navigate(StakRoutes.SIM_PORTFOLIO) {
							popUpTo(StakRoutes.SIM_PICK) { inclusive = true }
						}
					}
				},
				// B19 (73:855 Motion): Back to Simulate forward-pushes home.
				onBackToSimulate = { popToShell(PopStyle.FORWARD_PUSH, MainTab.Simulate) },
				// B19: View portfolio dissolves to the Portfolio - popping
				// when it is below on the stack, replacing otherwise.
				onViewPortfolio = {
					shellPop.value = PopStyle.DISSOLVE
					if (navController.previousBackStackEntry?.destination?.route == StakRoutes.SIM_PORTFOLIO) {
						navController.popBackStack()
					} else {
						navController.navigate(StakRoutes.SIM_PORTFOLIO) {
							popUpTo(StakRoutes.SIM_PICK) { inclusive = true }
						}
					}
				},
			)
		}
		composable(
			StakRoutes.LEADERBOARD,
			// Authored (1:4112/1:4124 Motion): open and Back are Instant.
			enterTransition = { EnterTransition.None },
			exitTransition = { ExitTransition.None },
			popEnterTransition = { EnterTransition.None },
			popExitTransition = { popExitFor(shellPop.value, instantRoute = true) },
		) {
			LeaderboardScreen(onBack = { navController.popBackStack() })
		}
		composable(
			StakRoutes.PROFILE,
			// B21 (171:995 Motion): Log out leaves with the house BACK push
			// - the hub slides out left while Sign in arrives from the right.
			exitTransition = {
				if (targetState.destination.route == StakRoutes.SIGN_IN) {
					slideOutHorizontally(tween(300, easing = EaseOut)) { -it }
				} else {
					null
				}
			},
		) {
			ProfileScreen(
				// launchSingleTop: two fingers on the block must not stack two edit pages (review 2026-09-07).
				onEditProfile = { navController.navigate(StakRoutes.EDIT_PROFILE) { launchSingleTop = true } },
				onBack = { navController.popBackStack() },
				// Product audit (2026-09-05): the rows open their settings pages.
				onOpenSetting = { kind -> navController.navigate(StakRoutes.settings(kind)) },
				onLogOut = {
					com.stak.demo.ui.Session.signOut()
					// B21: the session ends and the whole stack clears.
					navController.navigate(StakRoutes.SIGN_IN) {
						popUpTo(0) { inclusive = true }
					}
				},
			)
		}
		composable(StakRoutes.EDIT_PROFILE) {
			// 09 Profile setup (1:793) doubles as the hub's edit page - its own copy
			// promises "You can change this anytime in Profile." (user, 2026-09-07:
			// a photo of their choice, and editable after sign-up). House push in,
			// house back out; Save pops back to the hub, which re-reads the profile.
			// Pops only while this page is still on top: a second tap on Save during
			// the 300 ms pop must not take the hub with it (review 2026-09-07).
			val popEdit: () -> Unit = {
				if (navController.currentBackStackEntry?.destination?.route == StakRoutes.EDIT_PROFILE) navController.popBackStack()
			}
			com.stak.demo.ui.onboarding.ProfileSetupScreen(editing = true, onBack = popEdit, onProceed = popEdit)
		}
		composable(StakRoutes.NOTIFICATIONS) {
			com.stak.demo.ui.inbox.NotificationsScreen(
				onBack = { navController.popBackStack() },
				onOpenSettings = { navController.navigate(StakRoutes.settings(com.stak.demo.ui.profile.SettingsKind.NOTIFICATIONS)) },
			)
		}
		composable(StakRoutes.SETTINGS) { entry ->
			com.stak.demo.ui.profile.SettingsScreen(
				kind = entry.arguments?.getString("kind") ?: com.stak.demo.ui.profile.SettingsKind.HELP,
				onBack = { navController.popBackStack() },
				onOpen = { kind -> navController.navigate(StakRoutes.settings(kind)) },
				// Delete account (FigJam Profile board, 2026-09-14): the session is gone, the stack clears to Create account.
				onAccountDeleted = {
					navController.navigate(StakRoutes.createAccount(via = "dissolve")) { popUpTo(0) { inclusive = true } }
				},
			)
		}
		composable(
			StakRoutes.NEWS_DETAIL,
			// Authored (1:1228 Motion): Story tile -> News detail unsaved is
			// INSTANT; the article's Back -> listing is also Instant (1:1495).
			// The ONE animated exit: View in My STAK pops with the house
			// forward push 300 EaseOut (101:1005 Motion) - via shellPop, so
			// MAIN also enters from the LEFT (the push's other half).
			enterTransition = { EnterTransition.None },
			exitTransition = { ExitTransition.None },
			popEnterTransition = { popEnterFor(shellPop.value, instantRoute = true) },
			popExitTransition = { popExitFor(shellPop.value, instantRoute = true) },
		) { backStackEntry ->
			NewsDetailScreen(
				articleId = backStackEntry.arguments?.getString("articleId") ?: com.stak.demo.ui.news.NewsArticleFeed.APPLE,
				onBack = { navController.popBackStack() },
				// Pops the whole article chain to the shell - after READ
				// NEXT hops the stack can hold several articles, and a
				// single pop would strand the user on the previous story
				// (audit 2026-08-25).
				onViewInMyStak = { popToShell(PopStyle.FORWARD_PUSH, MainTab.MySTAK) },
				// READ NEXT rows push the next story's article (user, 2026-08-25).
				onOpenArticle = { id -> navController.navigate(StakRoutes.newsDetail(id)) },
			)
		}
	}
}

/**
 * A2 · How the top pushed page leaves back over the shell (and how the
 * page underneath re-enters). One-shot: an edge sets it, the transition
 * reads it, and StakRoot resets it once the NavHost settles.
 */
internal enum class PopStyle { HOUSE_BACK, FORWARD_PUSH, DISSOLVE, INSTANT }

// A3 · Routes whose authored entry edge is Instant - pushing or popping
// them must not move the shell (MAIN exit/popEnter = None). PROFILE is
// deliberately absent: it keeps the house push both ways (171:995).
private val INSTANT_ROUTES = setOf(
	StakRoutes.STOCK_DETAIL, StakRoutes.MYSTAK_STOCK, StakRoutes.COLLECTION,
	StakRoutes.SIM_PORTFOLIO, StakRoutes.SIM_PICK, StakRoutes.LEADERBOARD,
	StakRoutes.NEWS_DETAIL,
)

/** The pushed page's exit for a pop of the given style. */
private fun popExitFor(style: PopStyle, instantRoute: Boolean): ExitTransition = when (style) {
	// The house forward push: the page leaves to the RIGHT.
	PopStyle.FORWARD_PUSH -> slideOutHorizontally(tween(300, easing = EaseOut)) { it }
	PopStyle.DISSOLVE -> fadeOut(tween(300, easing = EaseOut))
	PopStyle.INSTANT -> ExitTransition.None
	PopStyle.HOUSE_BACK ->
		if (instantRoute) ExitTransition.None
		else slideOutHorizontally(tween(300, easing = EaseOut)) { -it }
}

/** The revealed page's enter for a pop of the given style. */
private fun popEnterFor(style: PopStyle, instantRoute: Boolean): EnterTransition = when (style) {
	// The house forward push's other half: in from the LEFT.
	PopStyle.FORWARD_PUSH -> slideInHorizontally(tween(300, easing = EaseOut)) { -it }
	PopStyle.DISSOLVE -> fadeIn(tween(300, easing = EaseOut))
	PopStyle.INSTANT -> EnterTransition.None
	PopStyle.HOUSE_BACK ->
		if (instantRoute) EnterTransition.None
		else slideInHorizontally(tween(300, easing = EaseOut)) { it }
}

/** A1 · How a tab switch moves: the prototype's Instant SWAP, or the house forward push. */
private enum class TabPushStyle { INSTANT, FORWARD_PUSH }

/**
 * The bottom-tab shell — all five tabs are built; the bar hides while
 * Home is in its first-run state (the scrim + pill own the bottom).
 * Tab switches are the prototype's "Swap overlay · Instant", except the
 * authored forward-push hops (A1/B2: ADD SUCCESS "View in My STAK",
 * 85:1205) which slide the whole page - tab bar and hoisted ticket
 * included - out to the right while the target tab arrives from the left.
 */
@Composable
private fun MainShell(
	pendingTab: MutableState<MainTab?>,
	onOpenArticle: (String) -> Unit,
	onOpenStock: (String) -> Unit,
	onOpenCollection: (String) -> Unit,
	onOpenProfile: () -> Unit,
	onOpenNotifications: () -> Unit,
	onOpenSimPortfolio: () -> Unit,
	// Codex parity audit (2026-09-04): the tapped pick's ticker.
	onOpenSimPick: (String) -> Unit,
	onOpenLeaderboard: () -> Unit,
	onViewSimPortfolio: () -> Unit,
	/** A held stock's saved-flavour Stock Detail (review 2026-09-14). */
	onOpenSavedStock: (String) -> Unit = onOpenStock,
) {
	var tab by rememberSaveable { mutableStateOf(MainTab.Home) }
	// A1: one-shot switch style - read by the AnimatedContent spec and
	// reset once the push settles, so plain SWAP taps stay instant.
	var tabPushStyle by remember { mutableStateOf(TabPushStyle.INSTANT) }
	// 1:2330 / 1:1796: tapping the Discover tab while on Discover is authored
	// back to the fresh deck (1:1627); the deck itself resets only from the
	// end-of-deck state (the mid-deck frame authors no self-tap).
	var discoverResetKey by remember { mutableStateOf(0) }
	fun switchTab(target: MainTab, style: TabPushStyle = TabPushStyle.INSTANT) {
		tabPushStyle = style
		tab = target
	}
	// Product audit (2026-09-05): system back on a non-Home tab goes Home first
	// (Instagram's convention); only Home's back leaves the app.
	androidx.activity.compose.BackHandler(enabled = tab != MainTab.Home) { switchTab(MainTab.Home) }
	LaunchedEffect(pendingTab.value) {
		pendingTab.value?.let { switchTab(it); pendingTab.value = null }
	}
	// First run (1:958) is for a FIRST-TIME user only: the account was created
	// here and the run has not been completed yet. An active/returning user -
	// Sign in, or any relaunch after the first run - lands on Home Main
	// (user, 2026-09-07). Completion persists in Session.
	var homeFirstRun by rememberSaveable { mutableStateOf(com.stak.demo.ui.Session.firstRunPending) }
	fun endFirstRun() {
		homeFirstRun = false
		com.stak.demo.ui.Session.completeFirstRun()
	}
	// Codex audit (2026-09-04): the Discover ticket serves the FRONT card's
	// stock (NVDA / AAPL / GOOGL into the 1:1970 template) - the raised spec
	// IS the open flag; null = no ticket.
	var discoverBuySpec by rememberSaveable(stateSaver = DiscoverBuySpecSaver) { mutableStateOf<BuySpec?>(null) }
	// The last served stock outlives the close so a sheet riding out with
	// the page (B2) keeps it instead of snapping back to the frame's NVDA.
	var discoverBuyShown by remember { mutableStateOf(com.stak.demo.ui.discover.NVDA_BUY) }
	var simulateBuy by rememberSaveable { mutableStateOf(false) }
	// Codex parity audit (2026-09-04): the Simulate ticket serves the TAPPED
	// saved stak (PLTR_BUY / COST_BUY into the 1:4232 template). Held past
	// the close so a sheet riding out with the page (B20) keeps its stock.
	var simulateBuySpec by rememberSaveable(stateSaver = SimBuySpecSaver) { mutableStateOf<BuySpec?>(null) }
	// Key each raise of a buy overlay: a `filled` state saved while a ticket rides
	// out with the leaving page must never be restored into a fresh ticket.
	var discoverBuyGen by rememberSaveable { mutableStateOf(0) }
	var simulateBuyGen by rememberSaveable { mutableStateOf(0) }
	// B3/B20: a ticket dismissed by "Keep exploring"/"Done" fades out 300
	// instead of vanishing - the flag picks the AnimatedVisibility exit.
	var discoverBuyDissolve by remember { mutableStateOf(false) }
	var simulateBuyDissolve by remember { mutableStateOf(false) }
	// B2/B20: a ticket that rides OUT with its leaving page - kept
	// composed through the push, dropped once the page is gone.
	var discoverBuyLeaving by remember { mutableStateOf(false) }
	var simulateBuyLeaving by remember { mutableStateOf(false) }
	val tabTransition = updateTransition(targetState = tab, label = "tabSwitch")
	LaunchedEffect(tabTransition.currentState, tabTransition.targetState) {
		if (tabTransition.currentState == tabTransition.targetState) {
			tabPushStyle = TabPushStyle.INSTANT
			discoverBuyLeaving = false
			simulateBuyLeaving = false
		}
	}
	tabTransition.AnimatedContent(
		modifier = Modifier.fillMaxSize(),
		transitionSpec = {
			if (tabPushStyle == TabPushStyle.FORWARD_PUSH) {
				// The house forward push: target in from the LEFT, the
				// leaving page out to the RIGHT - 300 ease out.
				ContentTransform(
					slideInHorizontally(tween(300, easing = EaseOut)) { -it },
					slideOutHorizontally(tween(300, easing = EaseOut)) { it },
				)
			} else {
				// The prototype's "Swap overlay · Instant".
				ContentTransform(EnterTransition.None, ExitTransition.None)
			}
		},
	) { page ->
		Box(modifier = Modifier.fillMaxSize()) {
			Column(modifier = Modifier.fillMaxSize()) {
				Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
					when (page) {
						MainTab.Home -> HomeScreen(
							firstRun = homeFirstRun,
							// Authored (1:958/1:1097 Motion): the pill and the deck
							// banner jump to the Discover deck ("first run" frame),
							// the mood card to News, the why-card to My STAK - all
							// Instant. First run ends on ANY tab hop, not only the
							// pick: every tab bar's Home tab is authored to Home
							// Main (1:1354 -> 1:1097), so 1:958 Market Mood -> News
							// -> Home must land on Main, never back on the scrim
							// (prototype walk, 2026-09-05). Only the avatar's
							// Profile push (1:1003, BACK) returns to first run.
							onSeeTodaysPick = { endFirstRun(); switchTab(MainTab.Discover) },
							onProfile = onOpenProfile,
							onBell = onOpenNotifications,
							onOpenNews = { endFirstRun(); switchTab(MainTab.News) },
							onOpenMyStak = { endFirstRun(); switchTab(MainTab.MySTAK) },
							onOpenDeck = { endFirstRun(); switchTab(MainTab.Discover) },
							// The board-only sections: a stock opens its detail.
							onOpenStock = onOpenStock,
							onOpenSavedStock = onOpenSavedStock,
						)
						MainTab.News -> NewsScreen(onOpenArticle = onOpenArticle)
						MainTab.Discover -> DiscoverScreen(
							resetKey = discoverResetKey,
							onLearnMore = onOpenStock,
							onPracticeBuy = { spec -> discoverBuyGen++; discoverBuyDissolve = false; discoverBuyShown = spec; discoverBuySpec = spec },
							// B4 (1:2330 Motion): the end-of-deck CTAs are
							// instant tab hops to Simulate / My STAK.
							onPracticeBuySaves = { switchTab(MainTab.Simulate) },
							onReviewSaves = { switchTab(MainTab.MySTAK) },
						)
						MainTab.Simulate -> SimulateScreen(
							onPracticeBuy = { spec -> simulateBuySpec = spec; simulateBuyGen++; simulateBuyDissolve = false; simulateBuy = true },
							onOpenPortfolio = onOpenSimPortfolio,
							onOpenPick = onOpenSimPick,
							onOpenLeaderboard = onOpenLeaderboard,
							// B14 (1:3964 Motion): All saved staks -> My STAK tab.
							onOpenMyStak = { switchTab(MainTab.MySTAK) },
							onOpenDiscover = { switchTab(MainTab.Discover) },
						)
						MainTab.MySTAK -> MyStakScreen(
							onOpenCollection = onOpenCollection,
							onStartSwiping = { switchTab(MainTab.Discover) },
						)
					}
				}
				if (!(page == MainTab.Home && homeFirstRun)) {
					// One stable bar on every tab (user, 2026-08-23: only the
					// tabs should change when switching) - the Discover frame's
					// compact 75 bar is a recorded standing deviation.
					MainTabBar(selected = page, onSelect = { if (it == MainTab.Discover && page == MainTab.Discover) discoverResetKey++ else switchTab(it) })
				}
			}
			// Practice-buy flow overlays the whole shell — in frame 1:1970 the
			// ticket's scrim covers the tab bar and the sheet meets the screen
			// bottom, so it cannot live inside the tab content area. It rides
			// with its own page so a forward push carries it out too (B2).
			if (page == MainTab.Discover) {
				AnimatedVisibility(
					visible = discoverBuySpec != null || discoverBuyLeaving,
					enter = EnterTransition.None,
					exit = if (discoverBuyDissolve) fadeOut(tween(300, easing = EaseOut)) else ExitTransition.None,
				) {
					androidx.compose.runtime.key(discoverBuyGen) {
					DiscoverBuyFlow(
						onClose = { discoverBuySpec = null },
						// A closed ticket (null) still riding out with the page
						// (B2) keeps the stock it served.
						spec = discoverBuySpec ?: discoverBuyShown,
						// Codex audit (2026-09-04): only the DECK's fills count
						// into the end-of-deck "Bought" (1:2330).
						onFilled = { com.stak.demo.ui.discover.DeckSession.bought += 1 },
						// B2 (85:1205 Motion): View in My STAK = forward-push tab
						// switch; the deck + sheet slide out right together.
						onFilledPrimary = {
							discoverBuySpec = null
							discoverBuyLeaving = true
							switchTab(MainTab.MySTAK, TabPushStyle.FORWARD_PUSH)
						},
						// B3: Keep exploring dissolves the overlay over the deck.
						onFilledSecondary = { discoverBuyDissolve = true; discoverBuySpec = null },
					)
					}
				}
			}
			// 1:4232 / 85:895: the Simulate ticket also covers the tab bar.
			if (page == MainTab.Simulate) {
				AnimatedVisibility(
					visible = simulateBuy || simulateBuyLeaving,
					enter = EnterTransition.None,
					exit = if (simulateBuyDissolve) fadeOut(tween(300, easing = EaseOut)) else ExitTransition.None,
				) {
					androidx.compose.runtime.key(simulateBuyGen) {
					DiscoverBuyFlow(
						onClose = { simulateBuy = false },
						spec = simulateBuySpec ?: com.stak.demo.ui.simulate.PLTR_BUY,
						filledPrimary = "View portfolio",
						filledSecondary = "Done",
						ticketSecondary = "Back",
						// B20 (85:895 Motion): View portfolio = the house forward
						// push; the ticket rides out with the leaving Simulate
						// page (cleared for good once MAIN is disposed).
						onFilledPrimary = {
							simulateBuy = false
							simulateBuyLeaving = true
							onViewSimPortfolio()
						},
						// B20: Done fades the overlay out over 300ms.
						onFilledSecondary = { simulateBuyDissolve = true; simulateBuy = false },
					)
					}
				}
			}
		}
	}
}
