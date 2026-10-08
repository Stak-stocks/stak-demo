import SwiftUI
import UserNotifications

/// Screens of the auth + onboarding flow — mirrors the Android
/// StakNavHost: splash → sign up (⇄ sign in) → 01 welcome →
/// 02 brand picks → 03 swipe tutorial → 04 goal → 05 risk →
/// 06 preparing deck → 07 taste reveal → 08 permissions →
/// 09 profile setup → tab shell.
enum FlowScreen: Hashable {
	case createAccount
	case signIn
	case forgotPassword
	case welcome
	case brandPicks
	case swipeTutorial
	case goal
	case risk
	case preparingDeck
	case tasteReveal
	case permissions
	case profileSetup
}

/// Figma prototype animations, mapped onto SwiftUI transitions.
/// Push Left = everything moves left (new screen in from the right);
/// Push Right = everything moves right (new screen in from the left).
enum FlowAnim {
	case pushLeft
	case pushRight
	case dissolve
	/// The arriving screen dissolves in over a leaving one that goes at once (B21 Log out, 171:995: the profile,
	/// already blanked, must never show on its way out).
	case reveal

	var transition: AnyTransition {
		switch self {
		case .pushLeft: .asymmetric(insertion: .move(edge: .trailing), removal: .move(edge: .leading))
		case .pushRight: .asymmetric(insertion: .move(edge: .leading), removal: .move(edge: .trailing))
		case .dissolve: .opacity
		case .reveal: .asymmetric(insertion: .opacity, removal: .identity)
		}
	}

	var animation: Animation {
		switch self {
		case .dissolve, .reveal: .easeOut(duration: 0.35)
		case .pushLeft, .pushRight: .easeOut(duration: 0.3)
		}
	}
}

/// What was typed on the auth pages that can sit beneath another one (Create account under Sign in, Sign in under
/// Forgot password). Only the top page is ever built, so a page's own @State would be lost on the way back - android's
/// back stack keeps it. Dropped wherever android would start that page afresh.
@MainActor
final class AuthDrafts: ObservableObject {
	struct SignUp {
		var email = ""
		var password = ""
		var confirm = ""
		var code = ""
		var showPassword = false
		var attempted = false
	}

	struct SignIn {
		var email = ""
		var password = ""
		var showPassword = false
		var attempted = false
	}

	@Published var signUp = SignUp()
	@Published var signIn = SignIn()

	func clear() {
		signUp = SignUp()
		signIn = SignIn()
	}
}

/// Root of the app: splash → auth → onboarding → the bottom-tab shell.
///
/// The flow runs in a custom stack container (not NavigationStack) so
/// each edge can play its exact Figma prototype animation. House style
/// confirmed across the splash/sign-up/sign-in/01 Welcome proto panels:
/// forward = Push Right (in from the left), back = Push Left (in from
/// the right), dissolves for auth switches — all ease out, 300ms pushes
/// / 350ms dissolves. Unconfirmed edges follow the house style until
/// their frames say otherwise.
struct RootFlowView: View {
	private enum Phase {
		case splash
		/// The account lock between the splash and Home (Codex review, PR #167).
		case locked
		case flow
		case main
	}

	@State private var phase = Phase.splash
	@State private var stack: [FlowScreen] = [.createAccount]
	@State private var anim = FlowAnim.dissolve
	/// A protected account re-locks when the app leaves the foreground (Codex
	/// review, PR #167): the gate sits OVER the tab shell, so the app-switcher
	/// snapshot shows the splash backdrop and unlocking returns to the same
	/// place. Mirrors android (LOCK pushed on ON_STOP, popped on unlock).
	@State private var relocked = false
	@Environment(\.scenePhase) private var scenePhase
	/// Shared auth ViewModel — all sign-in/up/password flows share one instance
	/// so a Google OAuth sheet from SignIn and one from CreateAccount can't race.
	@StateObject private var authVM = AuthViewModel()
	@StateObject private var drafts = AuthDrafts()
	/// The left-edge swipe back (EdgeSwipeBack): how far the top screen is dragged, and whether a swipe is still settling.
	@State private var flowDrag: CGFloat = 0
	@State private var flowSwipeLive = false
	/// An email sign-up waiting on its confirmation code - Create account shows the code entry while it is set.
	@State private var pendingConfirmation: String? = nil
	/// "Before we get started" (18+, U.S., Terms / Privacy) - over every screen while the account hasn't confirmed.
	@ObservedObject private var eligibility = EligibilityGate.shared

	/// Screens a swipe can go back from: every screen with an on-screen Back, and Sign in (swipe only - android's has
	/// none, its system Back does it). Create account is the root, 01 Welcome and the deck loader have no Back.
	private var canSwipeBack: Bool {
		guard stack.count > 1, let top = stack.last else { return false }
		switch top {
		case .createAccount, .welcome, .preparingDeck: return false
		default: return true
		}
	}

	/// The top screen, plus the one beneath it while a swipe back is under way.
	private var flowLayers: [FlowScreen] {
		guard let top = stack.last else { return [.createAccount] }
		return (flowDrag > 0 || flowSwipeLive) && stack.count > 1 ? Array(stack.suffix(2)) : [top]
	}

	var body: some View {
		ZStack {
			switch phase {
			case .splash:
				SplashView {
					// Prototype: dissolve, ease out, 350ms. A returning user
					// (signed in before) goes straight to Home; a first-time
					// user is taken to create an account (user, 2026-08-23).
					withAnimation(.easeOut(duration: 0.35)) {
						let locked = Session.shared.signedIn && UserProfile.shared.accountLock
						phase = Session.shared.signedIn ? (locked ? .locked : .main) : .flow
					}
				}
				.transition(.opacity)
			case .locked:
				LockGateView { withAnimation(.easeOut(duration: 0.35)) { phase = .main } }
					.transition(.opacity)
			case .main:
				ZStack {
					MainTabsView(onLogOut: {
						Task {
							// The SDK's live session goes first (android, audit 2026-09-19) - local, no network call, so a
							// fast re-signup right after can never inherit this account's session.
							await authVM.clearSession()
							pendingConfirmation = nil
							drafts.clear()
							authVM.resetState()
							// B21 (171:995): Home leaves at once and Sign in dissolves in (350), the session stack
							// cleared. Sign up sits beneath so a swipe back from Sign in still reaches it.
							anim = .reveal
							stack = [.createAccount, .signIn]
							withAnimation(FlowAnim.reveal.animation) { phase = .flow }
							// After the page has gone, so the blanked name never shows (android navigates, then signs out).
							Session.shared.signOut()
							// Best-effort: the refresh token revoked server-side too.
							authVM.revokeSessionRemotely()
						}
					}, onAccountDeleted: {
						// The account is gone (Session.deleteAccount ran): Create account, dissolved in.
						pendingConfirmation = nil
						drafts.clear()
						authVM.resetState()
						anim = .dissolve
						stack = [.createAccount]
						withAnimation(FlowAnim.dissolve.animation) { phase = .flow }
					})
					// Locked means locked for VoiceOver too: nothing beneath the gate can be reached.
					.accessibilityHidden(relocked)
					if relocked {
						LockGateView { withAnimation(.easeOut(duration: 0.35)) { relocked = false } }
							.transition(.opacity)
					}
				}
				.transition(anim.transition)
			case .flow:
				ZStack {
					ForEach(flowLayers, id: \.self) { s in
						let isTop = s == stack.last
						screen(for: s)
							.offset(x: isTop ? 0 : EdgeSwipe.underlayOffset(flowDrag, width: UIScreen.main.bounds.width))
							.allowsHitTesting(isTop)
							.accessibilityHidden(!isTop)
							.edgeSwipeBack(
								enabled: isTop && canSwipeBack,
								drag: isTop ? $flowDrag : .constant(0),
								onSettled: { flowSwipeLive = false }
							) {
								// The screen already slid away: its Back's effect, minus the motion.
								if stack.count > 1 { stack.removeLast() }
								settleAuthState()
							}
							.transition(anim.transition)
					}
				}
				.onChange(of: flowDrag) { _, drag in if drag > 0 { flowSwipeLive = true } }
				.transition(anim.transition)
			}
		}
		.overlay {
			// A new account right after it signs up, an existing one the next time the app opens; not over the splash or
			// the Face ID lock (it waits until that unlocks).
			if eligibility.required && (phase == .flow || (phase == .main && !relocked)) {
				EligibilityView(onRefused: {
					// The server has deleted the account: its session goes, and sign-up starts over (as Delete account).
					Task {
						await authVM.clearSession()
						Session.shared.signOut()
						pendingConfirmation = nil
						drafts.clear()
						authVM.resetState()
						anim = .dissolve
						stack = [.createAccount]
						withAnimation(FlowAnim.dissolve.animation) { phase = .flow }
					}
				})
				.transition(.opacity)
			}
		}
		.task { EligibilityGate.shared.check() }
		.onChange(of: scenePhase) { _, next in
			// Opening the app reads the notifications: the icon's badge (asked for when one arrives in front) clears.
			if next == .active { UNUserNotificationCenter.current().setBadgeCount(0) }
			// Leaving the active state locks a protected account at once - .inactive too
			// (Control Center, the app switcher, a system interruption), so the promise
			// "authenticate whenever you come back" holds (Codex review, PR #167). The
			// gate's own Face ID prompt also makes the scene inactive: relocked is
			// already true then, so this is a no-op until the unlock clears it.
			if next != .active, phase == .main, Session.shared.signedIn, UserProfile.shared.accountLock { relocked = true }
		}
		.onChange(of: authVM.uiState) { _, state in
			switch state {
			case .success(let onboardingComplete):
				// The auth pages share one AuthViewModel, so the routing android does per screen lives here.
				pendingConfirmation = nil
				drafts.clear()
				if onboardingComplete {
					// An account that finished onboarding (Sign in, or Google / Apple on either page) - straight to
					// Home, the auth stack cleared.
					Session.shared.signIn(demo: false)
					anim = .pushRight
					withAnimation(FlowAnim.pushRight.animation) { phase = .main }
				} else {
					// A new account, or one that never finished onboarding - through it from 01 Welcome (android:
					// intro with the stack cleared; Create account stays beneath, where 01's missing Back can't reach).
					anim = .pushRight
					withAnimation(FlowAnim.pushRight.animation) { stack = [.createAccount, .welcome] }
				}
				authVM.resetState()
			case .awaitingConfirmation(let email):
				// signUp returned no session: the email needs confirming - Create account turns into the code entry.
				pendingConfirmation = email
			default:
				break
			}
		}
		// A light confirmation when an auth step goes through, a warning buzz when it fails.
		.sensoryFeedback(trigger: authVM.uiState) { _, state in
			switch state {
			case .success, .recoveryVerified, .passwordResetComplete: .success
			case .error: .error
			default: nil
			}
		}
		.environmentObject(authVM)
		.environmentObject(drafts)
		.background(StakColors.bg.ignoresSafeArea())
	}

	private func push(_ screen: FlowScreen, _ a: FlowAnim) {
		// A double tap (Get started, Continue, Allow and continue's async completion) pushes once - a duplicate needed
		// two Backs and gave the swipe layers duplicate ids.
		guard stack.last != screen else { return }
		anim = a
		withAnimation(a.animation) { stack.append(screen) }
		settleAuthState()
	}

	private func pop(_ a: FlowAnim = .pushLeft) {
		anim = a
		withAnimation(a.animation) {
			if stack.count > 1 { stack.removeLast() }
		}
		settleAuthState()
	}

	/// Android gives every auth page its own AuthViewModel; here they share one, so a page change drops the last
	/// page's error (or finished reset) - the next page starts clean, as it would there. A request still running
	/// keeps its state, so its result still routes.
	private func settleAuthState() {
		if authVM.uiState != .loading { authVM.resetState() }
	}

	@ViewBuilder
	private func screen(for screen: FlowScreen) -> some View {
		switch screen {
		case .createAccount:
			// Where it goes after a sign-up or a social sign-in is decided by authVM.uiState (above).
			CreateAccountView(
				onSignIn: {
					// Sign in opens fresh each time (android navigates to a new page).
					drafts.signIn = AuthDrafts.SignIn()
					push(.signIn, .dissolve)
				},
				pendingEmail: $pendingConfirmation
			)
			.id(FlowScreen.createAccount)
		case .signIn:
			SignInView(
				// Prototype (sign-in frame): socials/CTA leave to Home as Push Right (authVM.uiState, above); the
				// "Create account" link dissolves back to a fresh sign-up page (android pops to a new one).
				onCreateAccount: {
					pendingConfirmation = nil
					drafts.signUp = AuthDrafts.SignUp()
					pop(.dissolve)
				},
				// Product audit (2026-09-05): the link opens the reset flow.
				onForgot: { push(.forgotPassword, .pushRight) }
			)
			.id(FlowScreen.signIn)
		case .forgotPassword:
			ForgotPasswordView(onBack: { pop() })
				.id(FlowScreen.forgotPassword)
		case .welcome:
			IntroView {
				// A fresh start on the quiz: android opens 02 on a new page with nothing picked. The pages after it
				// read these back, so Back through the quiz keeps each answer as android's back stack does.
				UserProfile.shared.clearTaste()
				push(.brandPicks, .pushRight)
			}
			.id(FlowScreen.welcome)
		case .brandPicks:
			BrandPicksView(
				onBack: { pop() },
				onContinue: { push(.swipeTutorial, .pushRight) }
			)
			.id(FlowScreen.brandPicks)
		case .swipeTutorial:
			SwipeTutorialView(
				onBack: { pop() },
				onContinue: { push(.goal, .pushRight) }
			)
			.id(FlowScreen.swipeTutorial)
		case .goal:
			GoalView(
				onBack: { pop() },
				onContinue: { push(.risk, .pushRight) }
			)
			.id(FlowScreen.goal)
		case .risk:
			RiskView(
				onBack: { pop() },
				onContinue: { push(.preparingDeck, .pushRight) }
			)
			.id(FlowScreen.risk)
		case .preparingDeck:
			PreparingDeckView {
				// Replace the loader so Back from the reveal skips it.
				anim = .dissolve
				withAnimation(FlowAnim.dissolve.animation) {
					stack.removeLast()
					stack.append(.tasteReveal)
				}
			}
			.id(FlowScreen.preparingDeck)
		case .tasteReveal:
			TasteRevealView(
				onBack: { pop() },
				onLetsGo: { push(.permissions, .pushRight) }
			)
			.id(FlowScreen.tasteReveal)
		case .permissions:
			PermissionsView(
				onBack: { pop() },
				onContinue: { push(.profileSetup, .pushRight) }
			)
			.id(FlowScreen.permissions)
		case .profileSetup:
			ProfileSetupView(
				onBack: { pop() },
				// Prototype: "Proceed to home" → Home first run, Push Right. The page has already saved the answers
				// to the account (awaited); the session starts with them as this account's own.
				onProceed: {
					Session.shared.signIn(demo: false, answeredOnboarding: true)
					anim = .pushRight
					withAnimation(FlowAnim.pushRight.animation) { phase = .main }
				}
			)
			.id(FlowScreen.profileSetup)
		}
	}
}
