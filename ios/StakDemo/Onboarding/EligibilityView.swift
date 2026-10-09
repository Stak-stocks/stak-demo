import SwiftUI

/// The screen for EligibilityGate (Core/Eligibility.swift): the STAK mark and heading, then three separate attestations
/// to tick - 18 or older, living in the United States, and agreeing to the Terms of Service and Privacy Policy (both
/// linked underneath, each opening to read) - centred in the space, and "Continue" once all three are ticked.
/// `onSignOut`: leave without answering. Mirrors android ui/onboarding/EligibilityScreen.kt.
struct EligibilityView: View {
	let onSignOut: () -> Void
	@State private var adult = false
	@State private var inUS = false
	@State private var accepted = false
	@State private var busy = false
	@State private var error: String? = nil
	/// The document open in the sheet, or nil.
	@State private var reading: LegalDocKind? = nil

	private var ready: Bool { adult && inUS && accepted && !busy }

	var body: some View {
		let u = figmaUnit
		ZStack {
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

				// The mark, heading, boxes and links centred in the space above the button. At the usual text size it
				// scrolls when it doesn't fit (a short phone, as Android); at a larger one Artboard scrolls the lot, so it
				// isn't nested in a second scroller (a GeometryReader there would measure nothing).
				if typeScale > 1 {
					top(u: u)
				} else {
					GeometryReader { space in
						ScrollView {
							top(u: u).frame(minHeight: space.size.height)
						}
						.scrollBounceBehavior(.basedOnSize)
					}
				}

				VStack(spacing: 12 * u) {
					// VoiceOver hears the failure without hunting for it.
					AuthStatusLine(loading: false, error: error)
					AuthCta(text: busy ? "Saving…" : "Continue", enabled: ready) { submit() }
				}
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		// The gate is the whole screen: VoiceOver can't wander into the app beneath it.
		.accessibilityAddTraits(.isModal)
		.sheet(item: $reading) { kind in LegalSheetView(kind: kind) }
	}

	/// The mark, the heading, the three boxes and the documents.
	private func top(u: CGFloat) -> some View {
		VStack(spacing: 0) {
			// The splash's glass ball, exported small for this size (the splash art itself is 2048px).
			Image(decorative: "StakGlassMark")
				.resizable()
				.scaledToFit()
				.frame(width: 104 * u, height: 104 * u)
			Text("Before we get started")
				.font(StakFont.sora(26 * u, .semiBold))
				.stakLineHeight(33 * u, size: 26 * u, face: .sora)
				.multilineTextAlignment(.center)
				.foregroundStyle(StakColors.textPrimary)
				.accessibilityAddTraits(.isHeader)
				.padding(.top, 18 * u)
			Text("STAK’s beta is open to adults in the United States. Please confirm the following to continue.")
				.font(StakFont.geist(max(13, 13 * u)))
				.stakLineHeight(max(18, 18 * u), size: max(13, 13 * u), face: .geist)
				.multilineTextAlignment(.center)
				.foregroundStyle(Auth.subtitleGray)
				.padding(.top, 8 * u)
			VStack(spacing: 0) {
				check(adult, "I confirm that I am 18 years of age or older.", u: u) { adult.toggle(); error = nil }
				divider(u: u)
				check(inUS, "I confirm that I currently reside in the United States.", u: u) { inUS.toggle(); error = nil }
				divider(u: u)
				check(accepted, "I agree to the Terms of Service and Privacy Policy.", u: u) { accepted.toggle(); error = nil }
			}
			.background(StakColors.surface, in: RoundedRectangle(cornerRadius: 16 * u))
			.overlay(RoundedRectangle(cornerRadius: 16 * u).strokeBorder(StakColors.cardBorder, lineWidth: 1 * u))
			.padding(.top, 24 * u)
			// The documents on their own line (as Android; a link inside a box's label would only tick the box).
			HStack(spacing: 20 * u) {
				docLink("Terms of Service", u: u) { reading = .terms }
				docLink("Privacy Policy", u: u) { reading = .privacy }
			}
			.padding(.top, 12 * u)
		}
		.frame(maxWidth: .infinity)
		.padding(.horizontal, 24 * u)
		.padding(.top, 12 * u)
		.padding(.bottom, 24 * u)
	}

	private func submit() {
		guard ready else { return }
		busy = true
		error = nil
		Task {
			if !(await EligibilityGate.shared.confirm()) { error = "Something went wrong. Try again." }
			busy = false
		}
	}

	/// One attestation: a box and its statement. The whole row toggles; VoiceOver hears one checkbox with its state.
	private func check(_ checked: Bool, _ label: String, u: CGFloat, toggle: @escaping () -> Void) -> some View {
		Button(action: toggle) {
			HStack(alignment: .top, spacing: 12 * u) {
				ZStack {
					RoundedRectangle(cornerRadius: 6 * u)
						.fill(checked ? StakColors.teal : Color.clear)
					if checked {
						Image(systemName: "checkmark")
							.font(.system(size: 12 * u, weight: .bold))
							.foregroundStyle(StakColors.bg)
					} else {
						RoundedRectangle(cornerRadius: 6 * u).strokeBorder(StakColors.muted, lineWidth: 1.5 * u)
					}
				}
				.frame(width: 22 * u, height: 22 * u)
				.padding(.top, 1 * u)
				Text(label)
					.font(StakFont.geist(max(14, 14 * u)))
					.stakLineHeight(max(20, 20 * u), size: max(14, 14 * u), face: .geist)
					.foregroundStyle(StakColors.textPrimary)
					.multilineTextAlignment(.leading)
					.frame(maxWidth: .infinity, alignment: .leading)
			}
			.padding(.horizontal, 16 * u)
			.padding(.vertical, 15 * u)
			.frame(minHeight: 54 * u)
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
		.accessibilityElement(children: .ignore)
		.accessibilityLabel(label)
		.accessibilityValue(checked ? "Checked" : "Not checked")
		.accessibilityAddTraits(.isToggle)
	}

	private func divider(u: CGFloat) -> some View {
		StakColors.divider.frame(height: 1 * u).padding(.leading, 50 * u)
	}

	/// A document to read, as a teal link.
	private func docLink(_ text: String, u: CGFloat, action: @escaping () -> Void) -> some View {
		Button(action: action) {
			Text(text)
				.font(StakFont.geist(max(13, 13 * u), .medium))
				.underline()
				.foregroundStyle(StakColors.teal)
				.frame(minHeight: 44)
		}
		.buttonStyle(.pressDim)
		.accessibilityHint("Opens the document to read")
	}
}
