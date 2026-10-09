import SwiftUI

/// The screen for EligibilityGate (Core/Eligibility.swift), as most apps do it: the STAK mark, a card spelling out
/// what's being confirmed - 18 or older, living in the United States, and the Terms of Service and Privacy Policy
/// (those two rows open the document to read) - then one sentence and "Agree and continue", which confirms all of it.
/// `onSignOut`: leave without answering. Mirrors android ui/onboarding/EligibilityScreen.kt.
struct EligibilityView: View {
	let onSignOut: () -> Void
	@State private var busy = false
	@State private var error: String? = nil
	/// The document open in the sheet, or nil.
	@State private var reading: LegalDocKind? = nil

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

				// The mark, heading and card at the top, the sentence at the foot (right above the button it describes, so
				// what tapping it means is in view when it's tapped). The top scrolls when it doesn't fit (a short phone, as
				// Android); Artboard scrolls the lot at a large text size.
				ScrollView {
				VStack(spacing: 0) {
					// The splash's glass ball, exported small for this size (the splash art itself is 2048px).
					Image(decorative: "StakGlassMark")
						.resizable()
						.scaledToFit()
						.frame(width: 88 * u, height: 88 * u)
					Text("Before we get started")
						.font(StakFont.sora(26 * u, .semiBold))
						.stakLineHeight(33 * u, size: 26 * u, face: .sora)
						.multilineTextAlignment(.center)
						.foregroundStyle(StakColors.textPrimary)
						.accessibilityAddTraits(.isHeader)
						.padding(.top, 18 * u)
					Text("STAK’s beta is open to adults in the United States.")
						.font(StakFont.geist(max(13, 13 * u)))
						.stakLineHeight(max(18, 18 * u), size: max(13, 13 * u), face: .geist)
						.multilineTextAlignment(.center)
						.foregroundStyle(Auth.subtitleGray)
						.padding(.top, 8 * u)
					VStack(spacing: 0) {
						row("birthday.cake", "I’m 18 or older", u: u)
						divider(u: u)
						row("mappin.and.ellipse", "I live in the United States", u: u)
						divider(u: u)
						row("doc.text", "Terms of Service", u: u) { reading = .terms }
						divider(u: u)
						row("lock", "Privacy Policy", u: u) { reading = .privacy }
					}
					.background(StakColors.surface, in: RoundedRectangle(cornerRadius: 16 * u))
					.overlay(RoundedRectangle(cornerRadius: 16 * u).strokeBorder(StakColors.cardBorder, lineWidth: 1 * u))
					.padding(.top, 24 * u)
				}
				.frame(maxWidth: .infinity)
				.padding(.horizontal, 24 * u)
				.padding(.top, 12 * u)
				.padding(.bottom, 24 * u)
				}
				.scrollBounceBehavior(.basedOnSize)

				VStack(spacing: 14 * u) {
					// Never below 13pt: what someone agrees to stays easy to read on a narrow phone.
					Text("By tapping Agree and continue, I confirm that I’m 18 or older and live in the United States, and I agree to the Terms of Service and Privacy Policy.")
						.font(StakFont.geist(max(13, 13 * u)))
						.lineSpacing(6 * u)
						.foregroundStyle(StakColors.body)
						.frame(maxWidth: .infinity, alignment: .leading)
						.padding(.horizontal, 24 * u)
					// VoiceOver hears the failure without hunting for it.
					AuthStatusLine(loading: false, error: error)
					AuthCta(text: busy ? "Saving…" : "Agree and continue", enabled: !busy) { submit() }
				}
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

	/// One line of the card: a teal icon and what's being confirmed; with `open`, a button that opens the document (teal
	/// words and a chevron, so it reads as a link and the plain statements don't read as controls).
	@ViewBuilder
	private func row(_ symbol: String, _ label: String, u: CGFloat, open: (() -> Void)? = nil) -> some View {
		let content = HStack(spacing: 12 * u) {
			Image(systemName: symbol)
				.font(.system(size: 15 * u, weight: .semibold))
				.foregroundStyle(StakColors.teal)
				.frame(width: 32 * u, height: 32 * u)
				.background(StakColors.teal.opacity(0.14), in: Circle())
				.accessibilityHidden(true)
			Text(label)
				.font(StakFont.geist(max(14, 14 * u), .medium))
				.foregroundStyle(open == nil ? StakColors.textPrimary : StakColors.teal)
				.frame(maxWidth: .infinity, alignment: .leading)
			if open != nil {
				Image(systemName: "chevron.right")
					.font(.system(size: 13 * u, weight: .semibold))
					.foregroundStyle(StakColors.muted)
					.accessibilityHidden(true)
			}
		}
		.padding(.horizontal, 16 * u)
		.padding(.vertical, 10 * u)
		.frame(minHeight: 54 * u)
		.contentShape(Rectangle())

		if let open {
			Button(action: open) { content }
				.buttonStyle(.pressDim)
				.accessibilityHint("Opens the document to read")
		} else {
			content.accessibilityElement(children: .combine)
		}
	}

	private func divider(u: CGFloat) -> some View {
		StakColors.divider.frame(height: 1 * u).padding(.leading, 60 * u)
	}
}
