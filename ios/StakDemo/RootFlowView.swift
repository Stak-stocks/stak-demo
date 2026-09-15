import SwiftUI

/// Screens of the auth + onboarding flow — mirrors the Android
/// StakNavHost: splash → sign up (⇄ sign in) → 01 welcome →
/// 02 brand picks → 03 swipe tutorial → 04 goal → 05 risk →
/// 06 preparing deck → 07 taste reveal → 08 permissions →
/// 09 profile setup → tab shell.
enum FlowScreen: Hashable {
	case createAccount
	case signIn
	case forgotPassword
	/// Email verification between an email sign-up and 01 Welcome (FigJam entry flow, 2026-09-14).
	case verifyEmail(email: String)
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

	var transition: AnyTransition {
		switch self {
		case .pushLeft: .asymmetric(insertion: .move(edge: .trailing), removal: .move(edge: .leading))
		case .pushRight: .asymmetric(insertion: .move(edge: .leading), removal: .move(edge: .trailing))
		case .dissolve: .opacity
		}
	}

	var animation: Animation {
		switch self {
		case .dissolve: .easeOut(duration: 0.35)
		case .pushLeft, .pushRight: .easeOut(duration: 0.3)
		}
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
						// Authored (171:995): Log out -> Sign in, the authored
						// PUSH RIGHT 300 = the house back push (FlowAnim.pushLeft),
						// with the session stack cleared. Sign up sits beneath so
						// Sign in's authored Back edge (-> Sign up) still works.
						Session.shared.signOut()
						anim = .pushLeft
						stack = [.createAccount, .signIn]
						withAnimation(FlowAnim.pushLeft.animation) { phase = .flow }
					}, onAccountDeleted: {
						// The account is gone (Session.deleteAccount ran): Create account, dissolved in.
						anim = .dissolve
						stack = [.createAccount]
						withAnimation(FlowAnim.dissolve.animation) { phase = .flow }
					})
					if relocked {
						LockGateView { withAnimation(.easeOut(duration: 0.35)) { relocked = false } }
							.transition(.opacity)
					}
				}
				.transition(anim.transition)
			case .flow:
				ZStack {
					screen(for: stack.last ?? .createAccount)
						.transition(anim.transition)
				}
				.transition(anim.transition)
			}
		}
		.onChange(of: scenePhase) { _, next in
			// Leaving the active state locks a protected account at once - .inactive too
			// (Control Center, the app switcher, a system interruption), so the promise
			// "authenticate whenever you come back" holds (Codex review, PR #167). The
			// gate's own Face ID prompt also makes the scene inactive: relocked is
			// already true then, so this is a no-op until the unlock clears it.
			if next != .active, phase == .main, Session.shared.signedIn, UserProfile.shared.accountLock { relocked = true }
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	private func push(_ screen: FlowScreen, _ a: FlowAnim) {
		anim = a
		withAnimation(a.animation) { stack.append(screen) }
	}

	private func pop(_ a: FlowAnim = .pushLeft) {
		anim = a
		withAnimation(a.animation) {
			if stack.count > 1 { stack.removeLast() }
		}
	}

	@ViewBuilder
	private func screen(for screen: FlowScreen) -> some View {
		switch screen {
		case .createAccount:
			CreateAccountView(
				onBack: { push(.welcome, .pushLeft) },
				onCreateAccount: { push(.welcome, .pushRight) },
				onSignIn: { push(.signIn, .dissolve) },
				// FigJam entry flow (2026-09-14): an email sign-up verifies the address first.
				onVerifyEmail: { email in push(.verifyEmail(email: email), .pushRight) }
			)
			.id(FlowScreen.createAccount)
		case .verifyEmail(let email):
			EmailVerificationView(
				email: email,
				onBack: { pop() },
				// "Yes" -> the investor quiz starts at 01 Welcome; the verification page
				// leaves the stack so Back from 01 lands on Create account as before.
				onVerified: {
					anim = .pushRight
					withAnimation(FlowAnim.pushRight.animation) {
						stack.removeLast()
						stack.append(.welcome)
					}
				}
			)
			.id(screen)
		case .signIn:
			SignInView(
				// Prototype (sign-in frame): back circle returns to sign up
				// as Push Left; socials/CTA leave to Home first run as Push
				// Right; the "Create account" link dissolves back.
				onBack: { pop(.pushLeft) },
				onSignIn: {
					// Signed in = the demo account with its authored history
					// (product audit, 2026-09-05); remembered across launches.
					Session.shared.signIn(demo: true)
					anim = .pushRight
					withAnimation(FlowAnim.pushRight.animation) { phase = .main }
				},
				onCreateAccount: { pop(.dissolve) },
				// Product audit (2026-09-05): the link opens the reset flow.
				onForgot: { push(.forgotPassword, .pushRight) }
			)
			.id(FlowScreen.signIn)
		case .forgotPassword:
			ForgotPasswordView(onBack: { pop() })
				.id(FlowScreen.forgotPassword)
		case .welcome:
			IntroView { push(.brandPicks, .pushRight) }
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
				// Prototype: "Proceed to home" → Home first run, Push Right.
				onProceed: {
					// Account created = a NEW account, empty until the user saves
					// and buys (product audit, 2026-09-05); remembered across launches.
					Session.shared.signIn(demo: false)
					anim = .pushRight
					withAnimation(FlowAnim.pushRight.animation) { phase = .main }
				}
			)
			.id(FlowScreen.profileSetup)
		}
	}
}
