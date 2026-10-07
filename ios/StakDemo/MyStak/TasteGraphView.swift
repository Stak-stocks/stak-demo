import SwiftUI

/// Your Investing Taste — what draws the user's attention, the evidence behind it, and what STAK does with it (My STAK
/// product spec, Sept 2026, §4). Everything here is observable behavior: companies saved, cards explored, pages
/// opened. It never says the user understands or intends anything, and no figure on the page describes money.
/// Mirrors android ui/mystak/TasteGraphScreen.kt.
struct TasteGraphView: View {
	let onBack: () -> Void
	@ObservedObject var myStakVM: MyStakViewModel
	/// Back on top (from a page pushed over it), the reading is re-checked - Android's screen re-enters then.
	var isTop = true

	var body: some View {
		let u = figmaUnit
		let taste = myStakVM.taste
		VStack(spacing: 0) {
			HStack {
				AuthBackCircle(action: onBack).padding(.leading, 20 * u)
				Spacer()
			}
			.frame(maxWidth: .infinity)
			.frame(height: 56 * u)

			ScrollView {
				VStack(alignment: .leading, spacing: 16 * u) {
					VStack(alignment: .leading, spacing: 4 * u) {
						Text("Your Investing Taste")
							.font(StakFont.sora(24 * u, .semiBold))
							.stakLineHeight(30 * u, size: 24 * u, face: .sora)
							.foregroundStyle(StakColors.textPrimary)
							.accessibilityAddTraits(.isHeader)
						Text("Built from what you save and explore.")
							.font(StakFont.geist(13 * u))
							.stakLineHeight(17 * u, size: 13 * u, face: .geist)
							.foregroundStyle(Stak.muted)
					}
					// The Overview card says "paused" without saying what that means - explained here too, so it doesn't
					// send someone to a page that reads as if nothing were wrong.
					if taste?.scenario == .paused {
						Text("Quiet for a while - this is built from saves and activity from before, not today. Save or explore a company in Discover to freshen it up.")
							.font(StakFont.geist(12 * u))
							.stakLineHeight(16 * u, size: 12 * u, face: .geist)
							.foregroundStyle(Stak.muted)
					}
					if let taste, !taste.isEmpty {
						TasteCardShell(title: "What draws your attention") {
							// Tapping a theme shows the activity behind it, rather than asking the user to take the label
							// on trust.
							// By category: two ids can share a label ("semiconductor" and "semiconductor_equipment" are both
							// Chips), and a duplicate id mixes up which row is open.
							ForEach(taste.themes, id: \.category) { theme in ThemeRow(theme: theme, graph: taste) }
							if taste.learning {
								Text("Still learning your taste — these grow firmer as you save and explore more.")
									.font(StakFont.geist(12 * u))
									.stakLineHeight(16 * u, size: 12 * u, face: .geist)
									.foregroundStyle(Stak.muted)
							}
						}
						let evidence = taste.evidence
						if !evidence.isEmpty {
							TasteCardShell(title: "Why STAK thinks this") {
								VStack(alignment: .leading, spacing: 0) {
									ForEach(Array(evidence.enumerated()), id: \.offset) { i, e in
										if i > 0 {
											Stak.divider.frame(height: 1 * u).padding(.vertical, 6 * u)
										}
										HStack(alignment: .top, spacing: 10 * u) {
											// Its own category's mark - the reading is about what the user did in each
											// theme, so the theme is what should be recognizable at a glance.
											StakIconTile(icon: categoryIcon(e.theme), tint: Stak.teal, size: 28, glyph: 16, radius: 8)
											VStack(alignment: .leading, spacing: 2 * u) {
												Text(e.theme)
													.font(StakFont.geist(13 * u, .semiBold))
													.stakLineHeight(17 * u, size: 13 * u, face: .geist)
													.foregroundStyle(StakColors.textPrimary)
												Text(e.text)
													.font(StakFont.geist(12 * u))
													.stakLineHeight(16 * u, size: 12 * u, face: .geist)
													.foregroundStyle(Stak.muted)
											}
											.frame(maxWidth: .infinity, alignment: .leading)
										}
										.accessibilityElement(children: .combine)
									}
								}
							}
						}
					} else {
						TasteCardShell(title: "What draws your attention") {
							// The real gap for someone who's passed on plenty but never saved anything is that nothing
							// has stood out - not that they haven't done anything.
							Text(taste == nil
								? (myStakVM.tasteFailed ? "We couldn't load your interests. Try again later." : "Reading your activity…")
								: (taste?.totalSignals ?? 0) > 0
									? "Nothing you've saved or explored has stood out yet. Save a company you like in Discover."
									: "Still learning your taste. Save a few companies in Discover and this fills in.")
								.font(StakFont.geist(13 * u))
								.stakLineHeight(19 * u, size: 13 * u, face: .geist)
								.foregroundStyle(Stak.body)
							if taste == nil && myStakVM.tasteFailed {
								Button { myStakVM.loadTaste(force: true) } label: {
									Text("Retry ›")
										.font(StakFont.geist(12 * u, .medium))
										.stakLineHeight(16 * u, size: 12 * u, face: .geist)
										.foregroundStyle(Stak.teal)
										.frame(minHeight: 44, alignment: .leading)
										.contentShape(Rectangle())
								}
								.buttonStyle(.pressDim)
								.padding(.vertical, -14)
							}
						}
					}
					TasteCardShell(title: "How this shapes your STAK") {
						VStack(alignment: .leading, spacing: 0) {
							ShapesRow(icon: "IcTabDiscover", title: "Discover", text: "Companies related to your interests.")
							Stak.divider.frame(height: 1 * u).padding(.vertical, 10 * u)
							ShapesRow(icon: "IcTabNews", title: "Daily Brief", text: "More context on the themes you follow.")
						}
					}
					Text("Your taste evolves as you explore.")
						.font(StakFont.geist(12 * u))
						.stakLineHeight(16 * u, size: 12 * u, face: .geist)
						.foregroundStyle(Stak.faint)
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, 8 * u)
				.padding(.bottom, 32 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		.task { StakEvents.log(StakEvents.tasteGraphOpen) }
		.task(id: isTop) { if isTop { myStakVM.loadTaste() } }
	}
}

/// One theme: its name, how firmly STAK can state it, and its evidence when opened.
private struct ThemeRow: View {
	let theme: TasteGraph.Theme
	let graph: TasteGraph.Graph
	@State private var open = false

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 8 * u) {
			Button { withAnimation(.easeInOut(duration: 0.25)) { open.toggle() } } label: {
				HStack(spacing: 10 * u) {
					// Its own category's mark, tinted with the theme's color so a row and its slice of the ring match.
					StakIconTile(icon: categoryIcon(theme.label), tint: themeColor(theme.colorKey), size: 28, glyph: 16, radius: 8)
					Text(theme.label)
						.font(StakFont.geist(13 * u, .medium))
						.stakLineHeight(17 * u, size: 13 * u, face: .geist)
						.foregroundStyle(StakColors.textPrimary)
					Spacer(minLength: 0)
					StrengthChip(strength: theme.strength)
				}
				.contentShape(Rectangle())
			}
			.buttonStyle(.pressDim)
			.accessibilityElement(children: .ignore)
			.accessibilityLabel("\(theme.label), \(theme.strength.label)")
			.accessibilityValue(open ? "Expanded" : "Collapsed")
			.accessibilityAddTraits(.isButton)
			if open {
				VStack(alignment: .leading, spacing: 4 * u) {
					let evidence = graph.evidenceFor(theme)
					if evidence.isEmpty {
						Text("Not much activity here yet.")
							.font(StakFont.geist(12 * u))
							.stakLineHeight(16 * u, size: 12 * u, face: .geist)
							.foregroundStyle(Stak.muted)
					} else {
						ForEach(evidence, id: \.text) { e in
							Text(e.text)
								.font(StakFont.geist(12 * u))
								.stakLineHeight(16 * u, size: 12 * u, face: .geist)
								.foregroundStyle(Stak.body)
						}
					}
					Text((theme.share < 0.005 ? "<1" : "\(Int((theme.share * 100).rounded()))") + "% of your interest signals")
						.font(StakFont.geist(11 * u))
						.stakLineHeight(14 * u, size: 11 * u, face: .geist)
						.foregroundStyle(Stak.faint)
				}
				.padding(.leading, 20 * u)
				.frame(maxWidth: .infinity, alignment: .leading)
				.transition(.opacity.combined(with: .move(edge: .top)))
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.clipped()
	}
}

/// Strong / Moderate / Emerging - how much evidence stands behind the theme.
private struct StrengthChip: View {
	let strength: TasteGraph.Strength

	var body: some View {
		let u = figmaUnit
		let tint: Color = switch strength {
		case .strong: StakColors.accentBlue
		case .moderate: Color(argb: 0xFF3A465E)
		case .emerging: Color(argb: 0xFF2A3346)
		}
		Text(strength.label)
			.font(StakFont.geist(11 * u, .medium))
			.stakLineHeight(14 * u, size: 11 * u, face: .geist)
			.foregroundStyle(strength == .strong ? .white : Stak.body)
			.padding(.horizontal, 10 * u)
			.padding(.vertical, 3 * u)
			.background(tint, in: Capsule())
	}
}

private struct ShapesRow: View {
	let icon: String
	let title: String
	let text: String

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 12 * u) {
			// Plain icon, no tile - a box around it doubled up with the News icon's own frame.
			Image(icon)
				.renderingMode(.template)
				.resizable()
				.scaledToFit()
				.frame(width: 20 * u, height: 20 * u)
				.foregroundStyle(Stak.teal)
				.accessibilityHidden(true)
			VStack(alignment: .leading, spacing: 2 * u) {
				Text(title)
					.font(StakFont.geist(13 * u, .semiBold))
					.stakLineHeight(17 * u, size: 13 * u, face: .geist)
					.foregroundStyle(StakColors.textPrimary)
				Text(text)
					.font(StakFont.geist(12 * u))
					.stakLineHeight(16 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Stak.muted)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
		}
		.accessibilityElement(children: .combine)
	}
}

private struct TasteCardShell<Content: View>: View {
	let title: String
	@ViewBuilder let content: Content

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 12 * u) {
			Text(title)
				.font(StakFont.sora(15 * u, .semiBold))
				.stakLineHeight(19 * u, size: 15 * u, face: .sora)
				.foregroundStyle(StakColors.textPrimary)
				.accessibilityAddTraits(.isHeader)
			content
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(Stak.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}
