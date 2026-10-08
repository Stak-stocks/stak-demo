import SwiftUI

/// The screen for EligibilityGate (Core/Eligibility.swift): one sentence and one button, as most apps do it - tapping
/// "Agree and continue" confirms 18 or older, living in the United States, and agreement to the Terms of Service and
/// Privacy Policy, which the sentence links to (each opens in a sheet to read). `onSignOut`: leave without answering.
/// Mirrors android ui/onboarding/EligibilityScreen.kt.
struct EligibilityView: View {
	let onSignOut: () -> Void
	@State private var busy = false
	@State private var error: String? = nil
	/// The document open in the sheet, or nil.
	@State private var reading: LegalDocKind? = nil

	/// The sentence's links go to the in-app sheet, not the browser (see `openURL` below).
	private static let termsURL = URL(string: "stak-legal://terms")!
	private static let privacyURL = URL(string: "stak-legal://privacy")!

	/// Built once: nothing in it depends on the screen's state.
	private static let agreement: AttributedString = {
		var text = AttributedString("By tapping Agree and continue, I confirm that I am 18 years of age or older, that I currently reside in the United States, and that I agree to the ")
		var terms = AttributedString("Terms of Service")
		terms.link = Self.termsURL
		terms.swiftUI.underlineStyle = .single
		var privacy = AttributedString("Privacy Policy")
		privacy.link = Self.privacyURL
		privacy.swiftUI.underlineStyle = .single
		text += terms
		text += AttributedString(" and ")
		text += privacy
		text += AttributedString(".")
		return text
	}()

	var body: some View {
		let u = figmaUnit
		ZStack {
			AuthWatermark()
			Artboard {
				HStack {
					Button(action: onSignOut) {
						Text("Sign out")
							.font(StakFont.geist(12 * u, .medium))
							.underline()
							.foregroundStyle(StakColors.teal)
							.frame(minHeight: 32 * u)
					}
					.buttonStyle(.pressDim)
					Spacer()
				}
				.padding(.leading, 24 * u)
				.padding(.top, 10 * u)
				ScrollView {
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
					.frame(maxWidth: .infinity, alignment: .topLeading)
					.padding(.horizontal, 24 * u)
					.padding(.top, 22 * u)
				}

				VStack(spacing: 14 * u) {
					// Right above the button it describes, so what tapping it means is in view when it's tapped.
					// Never below 13pt: what someone agrees to stays easy to read on a narrow phone.
					Text(Self.agreement)
						.font(StakFont.geist(max(13, 13 * u)))
						.lineSpacing(6 * u)
						.foregroundStyle(StakColors.textPrimary)
						.tint(StakColors.teal)
						.frame(maxWidth: .infinity, alignment: .leading)
						.padding(.horizontal, 24 * u)
						.environment(\.openURL, OpenURLAction { url in
							switch url {
							case Self.termsURL: reading = .terms
							case Self.privacyURL: reading = .privacy
							default: return .discarded
							}
							return .handled
						})
						// The links are in VoiceOver's Links rotor too; these name them as actions on the sentence.
						.accessibilityAction(named: "Read the Terms of Service") { reading = .terms }
						.accessibilityAction(named: "Read the Privacy Policy") { reading = .privacy }
					// VoiceOver hears the failure without hunting for it.
					AuthStatusLine(loading: false, error: error)
					AuthCta(text: busy ? "Saving…" : "Agree and continue", enabled: !busy) { submit() }
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		// The gate is the whole screen: VoiceOver can't wander into the app beneath it.
		.accessibilityAddTraits(.isModal)
		.sheet(item: $reading) { kind in LegalSheetView(kind: kind) }
	}

	private func submit() {
		guard !busy else { return }
		busy = true
		error = nil
		Task {
			if !(await EligibilityGate.shared.confirm()) { error = "Something went wrong. Try again." }
			busy = false
		}
	}
}
