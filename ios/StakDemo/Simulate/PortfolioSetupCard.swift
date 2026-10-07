import SwiftUI

/// The three starting balances the board's "Choose balance" offers.
let setupBalances: [Double] = [1_000, 10_000, 100_000]

/// One strategy the board's "Strategy" step offers - the label is the persisted value, the blurb its one-line read.
struct SetupStrategy {
	let label: String
	let blurb: String
}

let setupStrategies = [
	SetupStrategy(label: "Cautious", blurb: "Small stakes, steady names. Aim to beat a savings account."),
	SetupStrategy(label: "Balanced", blurb: "A mix of steady and growth picks. The default most people start on."),
	SetupStrategy(label: "Bold", blurb: "Bigger swings on high-growth picks. Expect bumps.")
]
private let defaultBalance = setupBalances.firstIndex(of: 10_000) ?? 1
private let defaultStrategy = setupStrategies.firstIndex { $0.label == PaperPortfolio.defaultStrategy } ?? 1
/// shared/src/sandboxConfig.ts's SANDBOX_NAME_MAX_LENGTH - the backend's own limit (kept in sync by hand).
private let setupNameMaxLength = 40

/// Portfolio setup (FigJam Simulate board, 2026-09-14: Portfolio setup -> Choose
/// balance, Name, Strategy). A NEW account sees it on Simulate home until it
/// starts practicing; the demo persona's authored $10,000 portfolio is already
/// set up. Mirrors android ui/simulate/PortfolioSetupCard.kt.
struct PortfolioSetupCard: View {
	// The half-filled form is kept on the phone too, so a relaunch or a log out / in doesn't send the picks back to the
	// defaults before "Start practicing" is tapped.
	@State private var balance = min(max(StakStore.int("setup_draft_balance", default: defaultBalance), 0), setupBalances.count - 1)
	@State private var name = StakStore.string("setup_draft_name") ?? ""
	@State private var strategy = min(max(StakStore.int("setup_draft_strategy", default: defaultStrategy), 0), setupStrategies.count - 1)

	private var strategyLine: String { setupStrategies[strategy].blurb }

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 12 * u) {
			Group {
				Text("SET UP YOUR PAPER PORTFOLIO")
					.font(StakFont.geist(11 * u, .medium))
					.stakLineHeight(14 * u, size: 11 * u, face: .geist)
					.foregroundStyle(Sim.teal)
					.accessibilityAddTraits(.isHeader)
				Text("Pick a starting balance, name it and choose how you want to play. Nothing here is real money.")
					.font(StakFont.geist(12 * u))
					.stakLineHeight(17 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Sim.body)
				Text("Starting balance")
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				HStack(spacing: 8 * u) {
					ForEach(Array(setupBalances.enumerated()), id: \.offset) { i, b in
						SettingsChip(label: PaperPortfolio.wholeDollars(b), selected: balance == i) { balance = i }
					}
				}
				Text("Portfolio name")
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				TextField("Portfolio name", text: $name, prompt: Text(PaperPortfolio.defaultPortfolioName).font(StakFont.geist(12 * u, .medium)).foregroundStyle(Sim.muted))
					.font(StakFont.geist(12 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
					.tint(Sim.teal)
					.autocorrectionDisabled()
					.onChange(of: name) { _, new in
						if new.count > setupNameMaxLength { name = String(new.prefix(setupNameMaxLength)) }
					}
					.padding(.horizontal, 12 * u)
					.padding(.vertical, 10 * u)
					.background(Sim.chipBg, in: RoundedRectangle(cornerRadius: 10 * u))
					.overlay(RoundedRectangle(cornerRadius: 10 * u).strokeBorder(Sim.track, lineWidth: 0.5 * u))
			}
			Group {
				Text("Strategy")
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				HStack(spacing: 8 * u) {
					ForEach(Array(setupStrategies.enumerated()), id: \.offset) { i, s in
						SettingsChip(label: s.label, selected: strategy == i) { strategy = i }
					}
				}
				Text(strategyLine)
					.font(StakFont.geist(11 * u))
					.stakLineHeight(15 * u, size: 11 * u, face: .geist)
					.foregroundStyle(Sim.muted)
				Button {
					let trimmed = name.trimmingCharacters(in: .whitespaces)
					let portfolioName = trimmed.isEmpty ? PaperPortfolio.defaultPortfolioName : trimmed
					PaperPortfolio.shared.setup(balance: setupBalances[balance], name: portfolioName, strategy: setupStrategies[strategy].label)
				} label: {
					Text("Start practicing")
						.font(StakFont.sora(14 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
						.frame(maxWidth: .infinity)
						.padding(.vertical, 14 * u)
						.background(Sim.darkCta, in: RoundedRectangle(cornerRadius: 6 * u))
						.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Sim.ctaBorder, lineWidth: 0.36 * u))
				}
				.buttonStyle(.pressDim)
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
		.onChange(of: balance) { _, v in StakStore.set(v, for: "setup_draft_balance") }
		.onChange(of: name) { _, v in StakStore.set(v, for: "setup_draft_name") }
		.onChange(of: strategy) { _, v in StakStore.set(v, for: "setup_draft_strategy") }
	}
}

/// The set-up portfolio's one-line badge under the hero: name · strategy · started on $X.
struct PortfolioSetupLine: View {
	@ObservedObject private var portfolio = PaperPortfolio.shared

	var body: some View {
		let u = figmaUnit
		Text("\(portfolio.portfolioName) · \(portfolio.strategy) · started on \(PaperPortfolio.wholeDollars(portfolio.paperStart))")
			.font(StakFont.geist(11 * u))
			.stakLineHeight(14 * u, size: 11 * u, face: .geist)
			.foregroundStyle(Sim.muted)
			.frame(maxWidth: .infinity, alignment: .leading)
	}
}
