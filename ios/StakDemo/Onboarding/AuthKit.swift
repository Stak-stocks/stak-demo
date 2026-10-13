import SwiftUI
import AuthenticationServices

// Shared pieces of the Figma "Auth ·" screens (CHINEDU file: Sign up 1:830,
// Sign in 1:879) — watermark, nav circle, social pills, inputs, the
// sharp-cornered gradient CTA and the switch link row. Mirrors the Android
// AuthKit.kt so both apps speak the same dialect; every authored metric is
// multiplied by `figmaUnit` (1 design px = figmaUnit pt).

/// Figma-artboard scale: 1 design px = `figmaUnit` pt. The CHINEDU
/// frames are fixed 390pt artboards; fixed compositions (hero renders,
/// the swipe deck) multiply by this so their proportions hold on wider
/// devices instead of shrinking relative to the screen.
var figmaUnit: CGFloat {
	UIScreen.main.bounds.width / 390
}

/// Frame-exact vertical composition (user ruling 2026-08-30, "just what's
/// on the Figma design"; mirrors android `Artboard`): every onboarding/auth
/// frame is a 390x844 artboard whose bottom-anchored CTA block is authored
/// against the frame's bottom edge (44 status bar + 800 of content, with
/// the home indicator INSIDE the authored bottom padding). SwiftUI's
/// default safe-area layout used to stretch the column to the screen and
/// stack the home-indicator inset under the authored padding, pushing the
/// CTA off its authored spot. This pins the column to the authored 800u
/// below the top safe-area edge, ignores the bottom inset (the indicator
/// overlays the authored padding, as in the frame) and leaves any surplus
/// below. Screens shorter than the artboard fall back to filling.
struct Artboard<Content: View>: View {
	@ViewBuilder let content: () -> Content

	var body: some View {
		let u = figmaUnit
		GeometryReader { proxy in
			if typeScale > 1 {
				// Larger text may not fit the artboard: it scrolls, at least a screen tall.
				ScrollView {
					VStack(spacing: 0, content: content)
						.frame(width: proxy.size.width)
						.frame(minHeight: min(800 * u, proxy.size.height), alignment: .top)
				}
				.scrollBounceBehavior(.basedOnSize)
			} else {
				VStack(spacing: 0, content: content)
					.frame(width: proxy.size.width, height: min(800 * u, proxy.size.height), alignment: .top)
			}
		}
		// The home-indicator inset only: the keyboard still lifts the CTA block above itself (a number pad has no
		// Return key - a hidden Verify would leave no way on).
		.ignoresSafeArea(.container, edges: .bottom)
	}
}

/// 10%-alpha glass ball behind the lower half of the auth screens.
struct AuthWatermark: View {
	var body: some View {
		let u = figmaUnit
		// The authored node render (1:831): the tilt AND the 10% opacity are
		// baked into the asset. Fitted pose: 364u square, center 185.6/582.2,
		// no rotation. Top-anchored so taller devices don't sink it.
		Image(decorative: "AuthWatermark")
			.resizable()
			.frame(width: 364 * u, height: 364 * u)
			.offset(x: -9.37 * u, y: 400.16 * u)
			.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
			.ignoresSafeArea()
			.allowsHitTesting(false)
	}
}

/// 40pt #192238 circle with the #AEAEAE back chevron.
struct AuthBackCircle: View {
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			ZStack {
				Circle().fill(Auth.navCircle)
				Image("BackChevron")
					.resizable()
					.frame(width: 22 * u, height: 22 * u)
			}
			.frame(width: 40 * u, height: 40 * u)
		}
		.buttonStyle(.pressDim)
		.accessibilityLabel("Back")
	}
}

/// The "STEP · …" kicker row — Geist Medium 10, 1.2 tracking, #5c6b85.
/// Scaled by the artboard unit like every sibling (was fixed - Codex
/// parity audit 2026-09-04; mirrors android OnboardingKicker).
struct OnboardingKicker: View {
	let text: String

	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(10 * u, .medium))
			.tracking(1.2 * u)
			.foregroundStyle(Auth.faintText)
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.horizontal, 20 * u)
			.padding(.top, 6 * u)
	}
}

/// Right-aligned "STEP n OF 6" label used in the nav rows. Scaled by the
/// artboard unit like android's "STEP n OF 6" (Codex parity audit 2026-09-04).
struct StepLabel: View {
	let text: String

	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(10 * u, .medium))
			.tracking(0.9 * u)
			.foregroundStyle(Auth.faintText)
	}
}

/// White social pill — radius 24, 13pt vertical padding, 18pt brand mark.
struct SocialPill: View {
	let text: String
	let icon: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			HStack(spacing: 10 * u) {
				Image(decorative: icon)
					.resizable()
					.frame(width: 18 * u, height: 18 * u)
				Text(text)
					.font(StakFont.geist(14 * u, .medium))
					.foregroundStyle(Auth.darkOnWhite)
			}
			.frame(maxWidth: .infinity)
			.padding(.vertical, 13 * u)
			.background(Color.white, in: RoundedRectangle(cornerRadius: 24 * u))
		}
		.buttonStyle(.pressDim)
	}
}

/// The 1px #2a3346 "or" divider row.
struct AuthOrDivider: View {
	var body: some View {
		let u = figmaUnit
		HStack(spacing: 10 * u) {
			Rectangle().fill(Auth.dividerLine).frame(height: 1 * u)
			Text("or")
				.font(StakFont.geist(11 * u))
				.foregroundStyle(Auth.faintText)
			Rectangle().fill(Auth.dividerLine).frame(height: 1 * u)
		}
	}
}

/// Auth input — #181f30, radius 14, 16pt padding, Geist 13, optional trailing.
struct AuthInput<Trailing: View>: View {
	let placeholder: String
	@Binding var text: String
	var keyboard: UIKeyboardType = .default
	var hidden = false
	/// What the field holds for AutoFill - a saved login, a new password, the code from Mail.
	var contentType: UITextContentType? = nil
	var trailing: Trailing
	/// Inline validation (product audit, 2026-09-05): a red hairline and a caption under the field.
	var error: String? = nil

	func error(_ message: String?) -> AuthInput {
		var copy = self
		copy.error = message
		return copy
	}

	init(
		_ placeholder: String,
		text: Binding<String>,
		keyboard: UIKeyboardType = .default,
		hidden: Bool = false,
		contentType: UITextContentType? = nil,
		@ViewBuilder trailing: () -> Trailing
	) {
		self.placeholder = placeholder
		self._text = text
		self.keyboard = keyboard
		self.hidden = hidden
		self.contentType = contentType
		self.trailing = trailing()
	}

	var body: some View {
		let u = figmaUnit
		// Field, then the caption 6 under it (android's Column) - a caption that grows with larger text pushes the
		// next field down instead of overlapping it.
		VStack(alignment: .leading, spacing: 6 * u) {
			HStack(spacing: 0) {
				Group {
					if hidden {
						SecureField("", text: $text, prompt: prompt)
					} else {
						TextField("", text: $text, prompt: prompt)
					}
				}
				.font(StakFont.geist(13 * u))
				.foregroundStyle(StakColors.textPrimary)
				.tint(StakColors.accent)
				.keyboardType(keyboard)
				.textContentType(contentType)
				.textInputAutocapitalization(.never)
				.autocorrectionDisabled()
				// The placeholder stays the field's name once something is typed (android's contentDescription),
				// and the rule it breaks is read with it.
				.accessibilityLabel(placeholder)
				.accessibilityHint(error ?? "")
				trailing
			}
			.padding(16 * u)
			.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
			.overlay(
				RoundedRectangle(cornerRadius: 14 * u)
					.strokeBorder(Auth.errorRed, lineWidth: error == nil ? 0 : 1 * u)
			)
			if let error {
				Text(error)
					.font(StakFont.geist(11 * u))
					.foregroundStyle(Auth.errorRed)
					.padding(.leading, 4 * u)
					.accessibilityHidden(true)
			}
		}
	}

	private var prompt: Text {
		Text(placeholder).font(StakFont.geist(13 * figmaUnit)).foregroundStyle(StakColors.muted)
	}
}

extension AuthInput where Trailing == EmptyView {
	init(
		_ placeholder: String,
		text: Binding<String>,
		keyboard: UIKeyboardType = .default,
		hidden: Bool = false,
		contentType: UITextContentType? = nil
	) {
		self.init(placeholder, text: text, keyboard: keyboard, hidden: hidden, contentType: contentType) { EmptyView() }
	}
}

/// The emailed confirmation code's field - sign-up confirmation and password reset. Not hard-coded to 6: Supabase's
/// OTP length is a project setting (device report, 2026-09-19: this project's is 8), so the field takes up to ten
/// digits - the paste path filtered too - and lets the real Verify call be the judge.
struct AuthCodeInput: View {
	@Binding var code: String
	/// Verify waits for at least this many digits.
	static let minLength = 6

	var body: some View {
		AuthInput("Confirmation code", text: $code, keyboard: .numberPad, contentType: .oneTimeCode)
			.onChange(of: code) { _, next in
				let digits = String(next.filter(\.isNumber).prefix(10))
				if digits != next { code = digits }
			}
	}
}

/// The #181f30 r14 note card - a title, a line under it and anything that follows (a link).
struct AuthNoteCard<Extra: View>: View {
	let title: String
	let message: String
	@ViewBuilder var extra: () -> Extra

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 6 * u) {
			Text(title)
				.font(StakFont.geist(14 * u, .medium))
				.foregroundStyle(StakColors.textPrimary)
			Text(message)
				.font(StakFont.geist(11 * u))
				.stakLineHeight(15 * u, size: 11 * u, face: .geist)
				.foregroundStyle(Auth.subtitleGray)
			extra()
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
	}
}

extension AuthNoteCard where Extra == EmptyView {
	init(title: String, message: String) {
		self.init(title: title, message: message) { EmptyView() }
	}
}

/// The teal Show/Hide toggle used inside password inputs.
struct ShowHideToggle: View {
	@Binding var shown: Bool

	var body: some View {
		Button { shown.toggle() } label: {
			Text(shown ? "Hide" : "Show")
				.font(StakFont.geist(11 * figmaUnit, .medium))
				.foregroundStyle(Auth.linkTeal)
		}
		.buttonStyle(.pressDim)
		.accessibilityLabel(shown ? "Hide password" : "Show password")
	}
}

/// Sharp-cornered 52pt CTA — 3-stop a6e4f7/5da8bf/3c98b4 gradient, white Geist Medium 14 (CHINEDU 1:873).
struct AuthCta: View {
	let text: String
	/// A gated step (no picks / no answer / no name) shows the CTA at half strength
	/// and swallows the tap (product audit, 2026-09-05). Declared before `action` so
	/// trailing-closure callers keep working.
	var enabled: Bool = true
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
				.font(StakFont.geist(14 * u, .medium))
				.foregroundStyle(StakColors.bg) // navy on the teal gradient: white read 1.4-3.3:1 (WCAG AA)
				.frame(maxWidth: .infinity)
				.frame(height: 52 * u * typeScale)
				.background(
					LinearGradient(
						stops: [
							.init(color: Color(argb: 0xFFA6E4F7), location: 0.0889),
							.init(color: Color(argb: 0xFF5DA8BF), location: 0.3919),
							.init(color: Color(argb: 0xFF3C98B4), location: 0.7255),
							.init(color: Color(argb: 0xFF3C98B4), location: 1)
						],
						startPoint: .top,
						endPoint: .bottom
					),
					in: RoundedRectangle(cornerRadius: 6 * u)
				)
				.overlay(
					RoundedRectangle(cornerRadius: 6 * u)
						.strokeBorder(StakColors.ctaBorderGradient, lineWidth: 0.36 * u)
				)
		}
		.buttonStyle(.pressDim)
		// Authored glow (1:873): teal drop shadows cast downward — the
		// soft wash behind the rows under the button.
		.background(
			ZStack {
				RoundedRectangle(cornerRadius: 6 * u)
					.fill(Color(argb: 0xFF52AAC7).opacity(0.03))
					.blur(radius: 8.31 * u)
					.offset(y: 28.18 * u)
				RoundedRectangle(cornerRadius: 6 * u)
					.fill(Color(argb: 0xFF52AAC7).opacity(0.01))
					.blur(radius: 9.76 * u)
					.offset(y: 49.86 * u)
			}
			.allowsHitTesting(false)
		)
		.padding(.horizontal, 20 * u)
		// The whole button - glow, fill and label - dims while gated.
		.disabled(!enabled)
		.opacity(enabled ? 1 : 0.5)
	}
}

/// Secondary flow button — h52, r6, rgba(52,59,79,0.33) hairline, Sora 14 muted (CHINEDU 1:791).
struct AuthSecondaryButton: View {
	let text: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
				.font(StakFont.sora(14 * u))
				.foregroundStyle(StakColors.muted)
				.frame(maxWidth: .infinity)
				.frame(height: 52 * u * typeScale)
				.overlay(
					RoundedRectangle(cornerRadius: 6 * u)
						.strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u)
				)
				.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
		.padding(.horizontal, 20 * u)
	}
}

/// "Already have an account? Sign in" / "New to STAK? Create account" row.
struct AuthSwitchRow: View {
	let prefix: String
	let link: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 5 * u) {
			Text(prefix)
				.font(StakFont.geist(12 * u))
				.foregroundStyle(StakColors.muted)
			Button(action: action) {
				Text(link)
					.font(StakFont.geist(12 * u, .medium))
					.foregroundStyle(Auth.linkTeal)
			}
			.buttonStyle(.pressDim)
		}
	}
}

/// Under an auth CTA: the spinner while a request runs, else the last error in red - android's
/// CircularProgressIndicator + error Text pair, shared by every auth page.
struct AuthStatusLine: View {
	let loading: Bool
	let error: String?
	/// The spinner's size - 24 under a CTA, 16 under an inline link.
	var spinnerSize: CGFloat = 24

	var body: some View {
		let u = figmaUnit
		if loading {
			ProgressView()
				.progressViewStyle(.circular)
				.tint(Auth.linkTeal)
				.frame(width: spinnerSize * u, height: spinnerSize * u)
				.accessibilityLabel("Loading")
		}
		if let error {
			Text(error)
				.font(StakFont.geist(11 * u))
				.multilineTextAlignment(.center)
				.foregroundStyle(Auth.errorRed)
				.frame(maxWidth: .infinity)
				.padding(.horizontal, 20 * u)
				// VoiceOver hears each failure without hunting for it (a new message is a new view).
				.id(error)
				.onAppear { UIAccessibility.post(notification: .announcement, argument: error) }
		}
	}
}

extension Auth {
	/// Inline validation red (the app's negative tone).
	static let errorRed = Color(argb: 0xFFE5484D)
}

/// Drives the native Sign in with Apple sheet and forwards the result to AuthViewModel.
/// Stored as @StateObject in both SignInView and CreateAccountView so it survives
/// the async presentation.
@MainActor
final class AppleSignInCoordinator: NSObject, ObservableObject,
    ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {

    private var nonce: String?
    private weak var authVM: AuthViewModel?
    /// The Apple sheet is up: a second tap on the pill must not stack another request.
    private var inFlight = false

    func start(authVM: AuthViewModel) {
        guard !inFlight else { return }
        inFlight = true
        self.authVM = authVM
        let rawNonce = AuthViewModel.randomNonce()
        nonce = rawNonce
        let req = ASAuthorizationAppleIDProvider().createRequest()
        req.requestedScopes = [.fullName, .email]
        req.nonce = AuthViewModel.sha256(rawNonce)
        let ctrl = ASAuthorizationController(authorizationRequests: [req])
        ctrl.delegate = self
        ctrl.presentationContextProvider = self
        ctrl.performRequests()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        inFlight = false
        guard
            let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = cred.identityToken,
            let idToken = String(data: tokenData, encoding: .utf8),
            let n = nonce
        else {
            authVM?.appleSignInFailed(nil)
            return
        }
        let name = cred.fullName.flatMap { PersonNameComponentsFormatter.localizedString(from: $0, style: .default) }
        authVM?.signInWithApple(idToken: idToken, nonce: n, fullName: name)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        inFlight = false
        // Backing out of the sheet is not an error (Google's cancel is handled the same way); anything else says so.
        if (error as? ASAuthorizationError)?.code == .canceled { return }
        authVM?.appleSignInFailed(error)
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}

/// The sign-up / sign-in field rules (product audit, 2026-09-05). Mirrors android AuthRules.
enum AuthRules {
	static let passwordMin = 8

	static func emailError(_ email: String) -> String? {
		let trimmed = email.trimmingCharacters(in: .whitespaces)
		if trimmed.isEmpty { return "Enter your email address" }
		let ok = trimmed.range(of: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$", options: .regularExpression) != nil
		return ok ? nil : "That doesn’t look like an email address"
	}

	static func passwordError(_ password: String) -> String? {
		if password.isEmpty { return "Enter your password" }
		if password.count < passwordMin { return "Use at least \(passwordMin) characters" }
		return nil
	}

	static func confirmError(_ password: String, _ confirm: String) -> String? {
		if confirm.isEmpty { return "Confirm your password" }
		if confirm != password { return "Passwords don’t match" }
		return nil
	}
}
