import SwiftUI

/// The screen for EligibilityGate (Core/Eligibility.swift): three boxes - 18 or older, living in the United States, and
/// the Terms / Privacy. `onSignOut`: leave without answering. Mirrors android ui/onboarding/EligibilityScreen.kt.
struct EligibilityView: View {
	let onSignOut: () -> Void
	@State private var adult = false
	@State private var inUS = false
	@State private var accepted = false
	@State private var busy = false
	@State private var error: String? = nil
	/// The document open in the sheet, or nil; and which have been agreed at their end.
	@State private var reading: LegalDocKind? = nil
	@State private var agreedTerms = false
	@State private var agreedPrivacy = false

	private var ready: Bool { adult && inUS && accepted && !busy }

	var body: some View {
		let u = figmaUnit
		ZStack {
			AuthWatermark()
			Artboard {
				HStack {
					link("Sign out", u: u, action: onSignOut)
					Spacer()
				}
				.padding(.leading, 24 * u)
				.padding(.top, 10 * u)
				ScrollView {
					VStack(alignment: .leading, spacing: 14 * u) {
						VStack(alignment: .leading, spacing: 12 * u) {
							Text("Before we get started")
								.font(StakFont.sora(26 * u, .semiBold))
								.stakLineHeight(33 * u, size: 26 * u, face: .sora)
								.foregroundStyle(StakColors.textPrimary)
								.accessibilityAddTraits(.isHeader)
							Text("STAK’s beta is open to adults in the United States.")
								.font(StakFont.geist(12 * u))
								.stakLineHeight(16 * u, size: 12 * u, face: .geist)
								.foregroundStyle(Auth.subtitleGray)
						}
						Spacer().frame(height: 4 * u)
						check(adult, "I confirm that I am 18 years of age or older.", u: u) { adult.toggle(); error = nil }
						check(inUS, "I confirm that I currently reside in the United States.", u: u) { inUS.toggle(); error = nil }
						check(accepted, "I agree to the Terms of Service and Privacy Policy.", u: u) { accepted.toggle(); error = nil }
						// The documents on their own row (as Android; a link inside the toggling label would only tick the box), each
						// in a sheet whose "I agree" - once read to the end - ticks the agreement.
						HStack(spacing: 16 * u) {
							link("Terms of Service", u: u) { reading = .terms }
							link("Privacy Policy", u: u) { reading = .privacy }
						}
						.padding(.leading, 30 * u)
					}
					.frame(maxWidth: .infinity, alignment: .topLeading)
					.padding(.horizontal, 24 * u)
					.padding(.top, 22 * u)
				}

				VStack(spacing: 12 * u) {
					if let error {
						Text(error)
							.font(StakFont.geist(11 * u))
							.foregroundStyle(Auth.errorRed)
							.frame(maxWidth: .infinity, alignment: .leading)
							.padding(.horizontal, 24 * u)
					}
					AuthCta(text: busy ? "Saving…" : "Continue", enabled: ready) { submit() }
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		// The gate is the whole screen: VoiceOver can't wander into the app beneath it.
		.accessibilityAddTraits(.isModal)
		.sheet(item: $reading) { kind in
			// The box covers both documents: agreeing to one opens the other if it hasn't been read yet, and the box ticks
			// once both have been agreed at their end (as Android).
			LegalSheetView(kind: kind, onAgree: {
				if kind == .terms { agreedTerms = true } else { agreedPrivacy = true }
				error = nil
				if agreedTerms && agreedPrivacy { accepted = true; return }
				let next: LegalDocKind = agreedTerms ? .privacy : .terms
				// After this sheet has gone.
				DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) { reading = next }
			})
		}
	}

	private func submit() {
		guard ready else { return }
		busy = true
		error = nil
		Task {
			if case .failed(let invalid) = await EligibilityGate.shared.confirm() {
				error = invalid ? "Tick all three boxes to continue." : "Something went wrong. Try again."
			}
			busy = false
		}
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
