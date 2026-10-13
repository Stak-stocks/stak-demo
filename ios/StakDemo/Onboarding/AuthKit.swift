import SwiftUI

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
			VStack(spacing: 0, content: content)
				.frame(width: proxy.size.width, height: min(800 * u, proxy.size.height), alignment: .top)
		}
		.ignoresSafeArea(edges: .bottom)
	}
}

/// 10%-alpha glass ball behind the lower half of the auth screens.
struct AuthWatermark: View {
	var body: some View {
		let u = figmaUnit
		// The authored node render (1:831): the tilt AND the 10% opacity are
		// baked into the asset. Fitted pose: 364u square, center 185.6/582.2,
		// no rotation. Top-anchored so taller devices don't sink it.
		Image("AuthWatermark")
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
/// artboard unit like the inline twins in BrandPicksView / MatrixQuizView
/// and android's "STEP 6 OF 6" (Codex parity audit 2026-09-04).
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
				Image(icon)
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
		@ViewBuilder trailing: () -> Trailing
	) {
		self.placeholder = placeholder
		self._text = text
		self.keyboard = keyboard
		self.hidden = hidden
		self.trailing = trailing()
	}

	var body: some View {
		let u = figmaUnit
		HStack {
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
			.textInputAutocapitalization(.never)
			.autocorrectionDisabled()
			trailing
		}
		.padding(16 * u)
		.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
		.overlay(
			RoundedRectangle(cornerRadius: 14 * u)
				.strokeBorder(Auth.errorRed, lineWidth: error == nil ? 0 : 1 * u)
		)
		.overlay(alignment: .bottomLeading) {
			if let error {
				Text(error)
					.font(StakFont.geist(11 * u))
					.foregroundStyle(Auth.errorRed)
					.padding(.leading, 4 * u)
					.offset(y: 6 * u + 14 * u)
			}
		}
		.padding(.bottom, error == nil ? 0 : 6 * u + 14 * u)
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
		hidden: Bool = false
	) {
		self.init(placeholder, text: text, keyboard: keyboard, hidden: hidden) { EmptyView() }
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
				.foregroundStyle(StakColors.textPrimary)
				.frame(maxWidth: .infinity)
				.frame(height: 52 * u)
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
				.frame(height: 52 * u)
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

extension Auth {
	/// Inline validation red (the app's negative tone).
	static let errorRed = Color(argb: 0xFFE5484D)
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
