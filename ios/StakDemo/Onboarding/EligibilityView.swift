import SwiftUI

/// The screen for EligibilityGate (Core/Eligibility.swift): date of birth, U.S. residence and the Terms / Privacy. The
/// wording doesn't name the cutoff until someone's under it. `onRefused`: the server has deleted the account - start
/// over. `onSignOut`: leave without answering. Mirrors android ui/onboarding/EligibilityScreen.kt.
struct EligibilityView: View {
	let onRefused: () -> Void
	let onSignOut: () -> Void
	@State private var digits = ""
	@State private var inUS = false
	@State private var accepted = false
	@State private var busy = false
	@State private var error: String? = nil
	@State private var refused = false
	@Environment(\.openURL) private var openURL

	private var dob: String? { EligibilityGate.isoDob(digits) }
	private var dobError: String? { digits.count == 8 && dob == nil ? "Enter a valid date" : nil }
	private var ready: Bool { dob != nil && inUS && accepted && !busy }

	var body: some View {
		let u = figmaUnit
		ZStack {
			AuthWatermark()
			Artboard {
				if !refused {
					HStack {
						link("Sign out", u: u, action: onSignOut)
						Spacer()
					}
					.padding(.leading, 24 * u)
					.padding(.top, 10 * u)
				}
				ScrollView {
					VStack(alignment: .leading, spacing: 14 * u) {
						if refused {
							title("We can’t open STAK for you yet", u: u)
							subtitle("STAK is currently available only to users 18 and older.", u: u)
						} else {
							VStack(alignment: .leading, spacing: 12 * u) {
								title("Before we get started", u: u)
								subtitle("A couple of quick details first.", u: u)
							}
							Spacer().frame(height: 4 * u)
							Text("Date of birth")
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(StakColors.muted)
								.accessibilityHidden(true)
							AuthInput("MM/DD/YYYY", text: Binding(
								get: { EligibilityGate.formatDob(digits) },
								set: { digits = String($0.filter(\.isNumber).prefix(8)); error = nil }
							), keyboard: .numberPad, contentType: .birthdate)
							.error(dobError)
							.accessibilityLabel("Date of birth")
							check(inUS, "I confirm that I currently live in the United States.", u: u) { inUS.toggle() }
							check(accepted, "I agree to the Terms of Service and Privacy Policy.", u: u) { accepted.toggle() }
							// The documents on their own row (as Android): a link inside the toggling label would only tick the box.
							HStack(spacing: 16 * u) {
								link("Terms of Service", u: u) { openURL(EligibilityGate.termsURL) }
								link("Privacy Policy", u: u) { openURL(EligibilityGate.privacyURL) }
							}
							.padding(.leading, 30 * u)
						}
					}
					.frame(maxWidth: .infinity, alignment: .topLeading)
					.padding(.horizontal, 24 * u)
					.padding(.top, 22 * u)
				}
				.scrollDismissesKeyboard(.interactively)

				VStack(spacing: 12 * u) {
					if let error {
						Text(error)
							.font(StakFont.geist(11 * u))
							.foregroundStyle(Auth.errorRed)
							.frame(maxWidth: .infinity, alignment: .leading)
							.padding(.horizontal, 24 * u)
					}
					if refused {
						AuthCta(text: "OK", action: onRefused)
					} else {
						AuthCta(text: busy ? "Checking…" : "Continue", enabled: ready) { submit() }
					}
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		// The gate is the whole screen: VoiceOver can't wander into the app beneath it.
		.accessibilityAddTraits(.isModal)
	}

	private func submit() {
		guard ready, let dob else { return }
		busy = true
		error = nil
		Task {
			switch await EligibilityGate.shared.confirm(dob: dob) {
			case .confirmed: break
			case .refused: refused = true
			case .failed(let invalid): error = invalid ? "Check your date of birth and both boxes." : "Something went wrong. Try again."
			}
			busy = false
		}
	}

	private func title(_ text: String, u: CGFloat) -> some View {
		Text(text)
			.font(StakFont.sora(26 * u, .semiBold))
			.stakLineHeight(33 * u, size: 26 * u, face: .sora)
			.foregroundStyle(StakColors.textPrimary)
			.accessibilityAddTraits(.isHeader)
	}

	private func subtitle(_ text: String, u: CGFloat) -> some View {
		Text(text)
			.font(StakFont.geist(12 * u))
			.stakLineHeight(16 * u, size: 12 * u, face: .geist)
			.foregroundStyle(Auth.subtitleGray)
	}

	/// A checkbox row - the whole row toggles, and VoiceOver hears one checkbox with its label and state.
	private func check(_ checked: Bool, _ label: String, u: CGFloat, toggle: @escaping () -> Void) -> some View {
		Button(action: toggle) {
			HStack(alignment: .top, spacing: 10 * u) {
				ZStack {
					RoundedRectangle(cornerRadius: 5 * u)
						.fill(checked ? StakColors.teal : Color.clear)
					if checked {
						Image(systemName: "checkmark")
							.font(.system(size: 11 * u, weight: .bold))
							.foregroundStyle(StakColors.bg)
					} else {
						RoundedRectangle(cornerRadius: 5 * u).strokeBorder(StakColors.muted, lineWidth: 1.5 * u)
					}
				}
				.frame(width: 20 * u, height: 20 * u)
				.padding(.top, 1 * u)
				Text(label)
					.font(StakFont.geist(13 * u))
					.foregroundStyle(StakColors.textPrimary)
					.multilineTextAlignment(.leading)
					.frame(maxWidth: .infinity, alignment: .leading)
			}
		}
		.buttonStyle(.pressDim)
		.accessibilityElement(children: .ignore)
		.accessibilityLabel(label)
		.accessibilityValue(checked ? "Checked" : "Not checked")
		.accessibilityAddTraits(.isToggle)
	}

	private func link(_ text: String, u: CGFloat, action: @escaping () -> Void) -> some View {
		Button(action: action) {
			Text(text)
				.font(StakFont.geist(12 * u, .medium))
				.underline()
				.foregroundStyle(StakColors.teal)
				.frame(minHeight: 32 * u)
		}
		.buttonStyle(.pressDim)
	}
}
