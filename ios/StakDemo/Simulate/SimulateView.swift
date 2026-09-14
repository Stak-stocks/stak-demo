import SwiftUI

/// 07 · Simulate — "Simulate home · paper" (CHINEDU 1:3898) with the
/// Buy-PLTR ticket (1:4232) and Order filled (85:895). Ported from
/// android/ ui/simulate/SimulateScreen.kt. Every metric is scaled by
/// the 390pt artboard unit (`figmaUnit`), exactly like the Android
/// build's `u` scaling.
enum Sim {
	static let cardBg = Color(argb: 0xFF181F30)
	static let muted = Color(argb: 0xFF819ABB)
	static let faint = Color(argb: 0xFF5C6B85)
	static let body = Color(argb: 0xFFC8D2E0)
	static let green = Color(argb: 0xFF2FD08A)
	static let red = Color(argb: 0xFFFF5A6A)
	static let teal = Color(argb: 0xFF69B3CA)
	static let tealTint = Color(argb: 0x1A69B3CA)
	static let chipBg = Color(argb: 0xFF242B3D)
	static let track = Color(argb: 0xFF2A3346)
	static let badgeInk = Color(argb: 0xFF9EADC7)
	static let bright = Color(argb: 0xFFF2F6FC)
	static let headerGray = Color(argb: 0xFFD3D3DD)
	static let darkCta = Color(argb: 0xFF12203E)
	static let ctaBorder = StakColors.ctaBorderGradient
}

let pltrBuy = BuySpec(
	title: "Buy PLTR?", badge: "P", name: "Palantir Technologies", priceLine: "$28.40 today",
	change: "▲ 1.1%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.8803", symbol: "PLTR"
)

/// Codex parity audit (2026-09-04): COST's Buy pill serves its own $25
/// paper ticket into the authored 1:4232 template, the way the Discover
/// deck serves the tapped stock. Mirrors android/ ui/simulate/SimulateScreen.kt.
let costBuy = BuySpec(
	title: "Buy COST?", badge: "C", name: "Costco Wholesale", priceLine: "$947.20 today",
	change: "▲ 0.7%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.0264", symbol: "COST"
)

struct SimulateView: View {
	let onOpenPortfolio: () -> Void
	/// Codex parity audit (2026-09-04): every pick tile / row passes its
	/// own ticker, so Pick detail serves the tapped pick.
	let onOpenPick: (String) -> Void
	let onOpenLeaderboard: () -> Void
	/// Authored (1:3964): "All saved staks ›" -> My STAK Overview (tab SWAP, Instant).
	var onOpenMyStak: () -> Void = {}
	/// The empty state's "Go to Discover" (a new account has nothing saved yet).
	var onOpenDiscover: () -> Void = {}
	/// When the shell hosts the ticket (1:4232: the sheet covers the tab bar),
	/// it raises it here with the tapped row's spec.
	var onPracticeBuy: ((BuySpec) -> Void)? = nil
	/// The Go live banner (FigJam Go live boards, 2026-09-14): "Setup and cash only. Trading runs in Simulate."
	var onGoLive: () -> Void = {}

	/// The locally hosted ticket's spec (nil = no ticket).
	@State private var buy: BuySpec? = nil
	/// Codex audit (2026-09-04): the paper ledger - rows, pick count and
	/// the saved rows' "In portfolio" line follow it.
	@ObservedObject private var portfolio = PaperPortfolio.shared

	var body: some View {
		let u = figmaUnit
		ZStack {
			VStack(spacing: 0) {
				HStack {
					VStack(alignment: .leading, spacing: 3 * u) {
						Text("Simulate")
							.font(StakFont.sora(26 * u, .semiBold))
							.foregroundStyle(Color.white)
							.frame(height: 33 * u) // 1:3916 line box (exact-design audit 2026-09-04)
						Text("Pick from your saves. Paper money does the talking.")
							.font(StakFont.geist(12 * u))
							.foregroundStyle(Sim.muted)
							.frame(height: 16 * u) // 1:3917 line box
					}
					Spacer()
					// Codex audit (2026-09-04): the clock (1:3918 "btn") opens the
					// pick history - SOLD · REALIZED lives on the portfolio page.
					Button(action: onOpenPortfolio) {
						ZStack {
							Circle().fill(Sim.cardBg)
							Image("IcSimClock")
								.resizable()
								.frame(width: 18 * u, height: 18 * u)
						}
						.frame(width: 40 * u, height: 40 * u)
					}
					.buttonStyle(.pressDim)
					.accessibilityLabel("History")
				}
				.padding(.horizontal, 20 * u)
				// 1:3914 (exact-design audit 2026-09-04): the 52-tall header sits 8 below the
				// status bar with no bottom inset - the 18 above the hero is the Main column's own.
				.padding(.top, 8 * u)

				ScrollView(showsIndicators: false) {
					VStack(spacing: 18 * u) {
						Group {
							// Portfolio setup (FigJam Simulate board, 2026-09-14): a new account
							// chooses its balance, name and strategy before its first trade.
							if portfolio.needsSetup { PortfolioSetupCard() }
							ScoreHero(onOpenLeaderboard: onOpenLeaderboard)
							if !portfolio.demo && portfolio.setupDone { PortfolioSetupLine() }
						}
						sectionHeader("Saved staks")
						let savedRows = savedStakRows()
						if savedRows.isEmpty {
							// Product audit (2026-09-05): a new account has saved nothing yet.
							EmptyStateCard(title: "Nothing saved yet", text: "Save stocks from the Discover deck and practice buy them here.", link: "Go to Discover", onLink: onOpenDiscover)
						} else {
							VStack(spacing: 10 * u) {
								ForEach(savedRows, id: \.spec.symbol) { row in
									SavedStakRow(badge: row.spec.badge, ticker: row.spec.symbol, sub: row.sub, spec: row.spec, onBuy: { practiceBuy($0) })
								}
							}
							CenterLink(text: "All saved staks", action: onOpenMyStak)
						}
						if portfolio.pickCount > 0 { InsightCard() }
						// Review (2026-09-04): the tiles follow the ledger - largest and
						// smallest dollar gain (seeded: NVDA +24.0% / "+$24 on $100",
						// MSFT -3.0% / "-$3 on $100", as authored). Hidden under two picks.
						if portfolio.pickCount >= 2, let best = portfolio.best, let worst = portfolio.worst {
							HStack(spacing: 10 * u) {
								PickDuo(kicker: "BEST PICK", pct: best.row.pct, pctColor: best.row.up ? Sim.green : Sim.red, badge: best.row.badge, ticker: best.row.ticker, sub: "\(PaperPortfolio.gainLabel(PaperPortfolio.amount(best.row.amount))) on \(best.spec.stakeBasis)", action: { onOpenPick(best.row.ticker) })
								PickDuo(kicker: "WORST PICK", pct: worst.row.pct, pctColor: worst.row.up ? Sim.green : Sim.red, badge: worst.row.badge, ticker: worst.row.ticker, sub: "\(PaperPortfolio.gainLabel(PaperPortfolio.amount(worst.row.amount))) on \(worst.spec.stakeBasis)", action: { onOpenPick(worst.row.ticker) })
							}
						}
						// Grouped: a ViewBuilder block takes ten children at most (Swift 5.9).
						Group {
							HowItWorksCard()
							GoLiveBanner(onOpen: onGoLive)
						}
						sectionHeader("Your portfolio")
						// Codex audit (2026-09-04): the ledger's first three rows - a
						// fresh buy lands at the top (1:3898 authored NVDA/TSLA/MSFT
						// from a 12-pick sample; the seeded six lead NVDA/TSLA/AMD).
						// 1:4009 plist (exact-design audit 2026-09-04): the three rows sit 10 apart, not the column's 18.
						if portfolio.pickCount == 0 {
							// Product audit (2026-09-05): a new account has no picks yet.
							EmptyStateCard(title: "No picks yet", text: "Your first practice buy lands here with its live gain.")
						} else {
						VStack(spacing: 10 * u) {
							ForEach(Array(portfolio.positions.prefix(3))) { position in
								let p = position.row
								PortfolioRow(badge: p.badge, ticker: p.ticker, sub: p.sub, amount: p.amount, pct: p.pct, up: p.up, action: { onOpenPick(p.ticker) })
							}
						}
						// Authored copy (user, 2026-09-04 (CHINEDU 07 · Simulate 423:1007): the authored look wins); the ledger still drives the rows above.
						CenterLink(text: "See all \(portfolio.pickCountText)", action: onOpenPortfolio)
						}
						// 1:4040 Points breakdown (exact-design audit 2026-09-04): the section header
						// and the Allocation card are 15 apart, not the column's 18.
						if portfolio.pickCount > 0 { VStack(spacing: 15 * u) {
							HStack {
								Text("Portfolio breakdown")
									.font(StakFont.sora(16 * u, .semiBold))
									.foregroundStyle(Sim.headerGray)
								Spacer()
								Button(action: onOpenPortfolio) {
									HStack(spacing: 5 * u) {
										Text("Portfolio")
											.font(StakFont.geist(14 * u))
											// 1:4044 (exact-design audit 2026-09-04): teal at 80% - was white.
											.foregroundStyle(Color(argb: 0xCC69B3CA))
										// 1:4045 (exact-design audit 2026-09-04): the exported 4.909x9 chevron asset, not a "›" glyph.
										Image("IcSimChevron")
											.resizable()
											.frame(width: 4.909 * u, height: 9 * u)
									}
								}
								.buttonStyle(.pressDim)
							}
							.frame(height: 21 * u) // 1:4041 header row (Sora 16 on a 1.34 line)
							SimAllocationCard()
						} }
						BoardCard(onOpenLeaderboard: onOpenLeaderboard)
					}
					.padding(.horizontal, 20 * u)
					.padding(.top, 18 * u)
					.padding(.bottom, 26 * u)
				}
			}
			if let spec = buy {
				// 85:895 authors "View portfolio" / "Done" on the Simulate add-success sheet.
				DiscoverBuyFlow(spec: spec, onClose: { buy = nil }, filledPrimary: "View portfolio", filledSecondary: "Done", ticketSecondary: "Back")
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	/// The tapped row's ticket: raised to the shell when it hosts the
	/// sheet, else shown here.
	private func practiceBuy(_ spec: BuySpec) {
		if let onPracticeBuy { onPracticeBuy(spec) } else { buy = spec }
	}

	/// Codex audit (2026-09-04): a saved stak that has been bought reads
	/// "In portfolio · 0.8803 shares" in place of the authored
	/// "not in portfolio yet" line (1:3964 template).
	private func savedSub(_ symbol: String, authored: String) -> String {
		guard let held = portfolio.pickSpec(symbol) else { return authored }
		return "In portfolio · \(held.shares) shares"
	}

	/// A "Saved staks" row: the stock's buy ticket and its sub line.
	private struct SavedStak { let spec: BuySpec; let sub: String }

	/// The demo account shows its two authored saves (PLTR / COST); a new account lists what
	/// IT saved - the saved stocks that have a buy ticket, two at a time (product audit, 2026-09-05).
	private func savedStakRows() -> [SavedStak] {
		if portfolio.demo {
			return [
				// Authored 4 and 2 days before the frame's July 4, kept as ages (product audit, 2026-09-05).
				SavedStak(spec: pltrBuy, sub: savedSub("PLTR", authored: StakClock.savedLabel(daysAgo: 4) + " · not in portfolio yet")),
				SavedStak(spec: costBuy, sub: savedSub("COST", authored: StakClock.savedLabel(daysAgo: 2) + " · not in portfolio yet"))
			]
		}
		// Every save the account made is a candidate - a Tesla or Amazon story's save
		// gets a ticket built from the catalogue quote, the way the Other collection
		// tile does - newest first, and the sub line reads the real save day (audit
		// 2026-09-07: a TSLA-only account was told nothing was saved, every row "today").
		let designed = [nvdaBuy, aaplBuy, googlBuy, pltrBuy, costBuy]
		let held = MyStakHoldings.shared
		let ordered = held.tickers.sorted { a, b in
			let da = held.daysSinceSaved(a) ?? Int.max, db = held.daysSinceSaved(b) ?? Int.max
			return da != db ? da < db : a < b
		}
		return ordered
			.map { t in designed.first { $0.symbol == t } ?? Self.catalogueTicket(t) }
			.prefix(2)
			.map { SavedStak(spec: $0, sub: savedSub($0.symbol, authored: StakClock.savedLabel(daysAgo: held.daysSinceSaved($0.symbol) ?? 0) + " · not in portfolio yet")) }
	}

	/// A $25 paper ticket for a saved stock without a designed one, priced off the catalogue quote.
	private static func catalogueTicket(_ symbol: String) -> BuySpec {
		let known = NewsArticleFeed.hasStockFacts(symbol)
		let sf = NewsArticleFeed.stockFacts(symbol)
		let price = known ? (Double(sf.price.replacingOccurrences(of: "$", with: "").replacingOccurrences(of: ",", with: "")) ?? 0) : 0
		var pct = sf.change.filter { $0.isNumber || $0 == "." }
		if pct.isEmpty { pct = "0.0" }
		return BuySpec(
			title: "Buy \(symbol)?", badge: String(symbol.prefix(1)), name: known ? sf.name : symbol,
			priceLine: known ? "\(sf.price) today" : "\u{2014} today",
			change: known ? (sf.up ? "\u{25B2} " : "\u{25BC} ") + pct + "%" : "\u{2014}",
			cashBefore: "$8,800.00", cashAfter: "$8,775.00",
			shares: price > 0 ? String(format: "%.4f", 25.0 / price) : "0", symbol: symbol
		)
	}

	private func sectionHeader(_ title: String) -> some View {
		Text(title)
			.font(StakFont.sora(16 * figmaUnit, .semiBold))
			.foregroundStyle(Sim.headerGray)
			.frame(maxWidth: .infinity, alignment: .leading)
	}
}

/// Portfolio value hero — $10,240.00, cash, weekly change, chart + pills.
/// Codex audit (2026-09-04): reads PaperPortfolio - value, cash and pick
/// count follow the ledger; the week figures are the shared constants.
private struct ScoreHero: View {
	let onOpenLeaderboard: () -> Void

	@ObservedObject private var portfolio = PaperPortfolio.shared
	/// Codex audit (2026-09-04): the live range - 3M as authored (1:3935).
	@State private var range = "3M"

	/// "$10,240.00" split at the point: the 44 figure and the 18 cents.
	private var figure: (whole: String, cents: String) {
		let value = PaperPortfolio.money(portfolio.portfolioValue)
		guard let dot = value.lastIndex(of: ".") else { return (value, "") }
		return (String(value[..<dot]), String(value[dot...]))
	}

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 11 * u) {
			Group {
				Text("PORTFOLIO VALUE")
					.font(StakFont.geist(10 * u, .medium))
					.tracking(0.9 * u)
					.foregroundStyle(Sim.faint)
				HStack(alignment: .bottom, spacing: 0) {
					Text(figure.whole)
						.font(StakFont.sora(44 * u, .semiBold))
						// 1:3924 (exact-design audit 2026-09-04): no tracking - the -0.44 was never authored.
						// Authored box (1:3924) is 55 tall — pin it so the stack sums.
						.frame(height: 55 * u)
						.foregroundStyle(Color.white)
					Text(figure.cents)
						.font(StakFont.sora(18 * u, .semiBold))
						.foregroundStyle(Sim.muted)
						// Authored (1:3923): ".00" starts 8 after the figure and its
						// box bottom sits 8 above the figure's (55 vs y24+h23). The
						// gap is the design (user, 2026-09-04 (CHINEDU 07 · Simulate 423:1007): the authored look wins).
						.padding(.leading, 8 * u)
						.padding(.bottom, 8 * u)
				}
				// The base is the account's own start ($1,000 / $100,000 after Portfolio setup; review 2026-09-14).
				Text("\(PaperPortfolio.signedMoney(portfolio.allTimeGain)) all time on \(PaperPortfolio.wholeDollars(portfolio.paperStart)) paper · \(portfolio.pickCountText)")
					.font(StakFont.geist(12 * u, .light))
					.foregroundStyle(Sim.muted)
				HStack(spacing: 6 * u) {
					Text("Cash available")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Sim.muted)
					Text(PaperPortfolio.money(portfolio.cash))
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(Sim.bright)
				}
				Text("\(portfolio.weekUp ? "▲" : "▼") \(portfolio.weekGainText) (\(portfolio.weekPctText)) this week")
					.font(StakFont.geist(12 * u, .medium))
					.foregroundStyle(Sim.green)
				// The "#47 this week" chip sits on its own row of the column.
				Button(action: onOpenLeaderboard) {
					Text(portfolio.rank.map { "#\($0) this week" } ?? "Unranked this week")
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(Sim.teal)
						.padding(.horizontal, 11 * u)
						.padding(.vertical, 6 * u)
						.background(Sim.tealTint, in: RoundedRectangle(cornerRadius: 13 * u))
				}
				.buttonStyle(.pressDim)
			}
			.padding(.horizontal, 20 * u)

			// Authored: ranks→chart gap is exactly the column's 11 (1:3935);
			// the chart bleeds outside the 20u text padding.
			// A new account's line follows its own all-time move - flat on untouched paper (product audit, 2026-09-05).
			RangeLineChart(range: range, tint: Sim.teal, authored: "SimChartLine", width: 343 * u, height: 73.56 * u, move: portfolio.demo ? nil : portfolio.allTimeGain / portfolio.paperStart * 100)
				.frame(maxWidth: .infinity)
			HStack(spacing: 37 * u) {
				ForEach(["1D", "1W", "1M", "3M", "YTD", "1Y"], id: \.self) { label in
					Button { range = label } label: {
						if label == range {
							// The authored 39x22.5 teal chrome follows the selection.
							Text(label)
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(Sim.teal)
								.frame(width: 39 * u, height: 22.5 * u)
								.background(Color(argb: 0x292C9DBC), in: RoundedRectangle(cornerRadius: 11.25 * u))
								.overlay(
									RoundedRectangle(cornerRadius: 11.25 * u)
										.strokeBorder(Color(argb: 0x662C9DBC), lineWidth: 0.75 * u)
								)
						} else {
							Text(label)
								.font(StakFont.geist(12 * u))
								.foregroundStyle(Sim.muted)
						}
					}
					.buttonStyle(.pressDim)
				}
			}
			.frame(maxWidth: .infinity)
			// Authored chart→pills gap 40; the column gap contributes 11.
			.padding(.top, 29 * u)
		}
		.padding(.vertical, 20 * u)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 18 * u))
	}
}

/// Saved stak row — badge, ticker + saved line, teal Buy pill (60x30).
/// The row's Buy hands over ITS ticket spec.
private struct SavedStakRow: View {
	let badge: String
	let ticker: String
	let sub: String
	let spec: BuySpec
	let onBuy: (BuySpec) -> Void

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 12 * u) {
			ZStack {
				Circle().fill(Sim.chipBg)
				Text(badge)
					.font(StakFont.sora(15 * u, .semiBold))
					.foregroundStyle(Sim.badgeInk)
			}
			.frame(width: 38 * u, height: 38 * u)
			VStack(alignment: .leading, spacing: 3 * u) {
				Text(ticker)
					.font(StakFont.sora(12 * u, .medium))
					.foregroundStyle(Color.white)
				Text(sub)
					.font(StakFont.geist(10 * u))
					.foregroundStyle(Sim.muted)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			BuyPill(text: "Buy", action: { onBuy(spec) })
		}
		.padding(.horizontal, 14 * u)
		.padding(.vertical, 11 * u)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
	}
}

/// 60x30 gradient Buy pill with the CTA hairline.
struct BuyPill: View {
	let text: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
				.font(StakFont.sora(12 * u))
				.foregroundStyle(Color.white)
				.frame(width: 60 * u, height: 30 * u)
				.background(discCtaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
				.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Sim.ctaBorder, lineWidth: 0.36 * u))
				// 1:3954 (exact-design audit 2026-09-04): the authored drop shadow - #52AAC7 at 4%, dy 12.285, blur 12.285.
				.tealShadow(dy: 12.285, blur: 12.285, alpha: 0.04)
		}
		.buttonStyle(.pressDim)
	}
}

/// The authored teal link (1:3964 / 1:4037 / 1:4112 - exact-design audit
/// 2026-09-04): Geist Medium 13 + "›" 14, both #69b3ca (were white / muted
/// Regular). Centred across the column unless the host lays it at its own
/// left edge (the board card's "Full leaderboard"). `centered` is declared
/// last with a default - memberwise order.
struct CenterLink: View {
	let text: String
	let action: () -> Void
	var centered: Bool = true

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			HStack(spacing: 6 * u) {
				Text(text)
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(Sim.teal)
				Text("›")
					.font(StakFont.geist(14 * u, .medium))
					.foregroundStyle(Sim.teal)
			}
			.frame(height: 18 * u)
			.frame(maxWidth: centered ? CGFloat.infinity : nil)
		}
		.buttonStyle(.pressDim)
	}
}

private struct InsightCard: View {
	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 8 * u) {
			HStack(spacing: 7 * u) {
				Image("IcGistSparkle")
					.resizable()
					.frame(width: 16 * u, height: 16 * u)
				Text("INSIGHT")
					.font(StakFont.geist(10 * u, .medium))
					.tracking(0.9 * u)
					.foregroundStyle(Sim.faint)
			}
			// The demo's authored insight; a new account reads its own picks (product audit, 2026-09-05).
			Text(PaperPortfolio.shared.demo ? "Three chip stocks drove 70% of your gains this month. Your taste has a type." : StakInsights.simInsight())
				.font(StakFont.geist(12 * u))
				.stakLineHeight(20 * u, size: 12 * u, face: .geist)
				.foregroundStyle(Sim.body)
		}
		.padding(.horizontal, 16 * u)
		.padding(.vertical, 15 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

private struct PickDuo: View {
	let kicker: String
	let pct: String
	let pctColor: Color
	let badge: String
	let ticker: String
	let sub: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			VStack(alignment: .leading, spacing: 7 * u) {
				HStack {
					Text(kicker)
						.font(StakFont.geist(10 * u, .medium))
						.tracking(0.9 * u)
						.foregroundStyle(Sim.faint)
					Spacer()
					Text(pct)
						.font(StakFont.geist(12 * u))
						.foregroundStyle(pctColor)
				}
				// 1:3977 / 1:3982 (exact-design audit 2026-09-04): the badge row carries only the
				// ticker; the "+$24 on $100" line is the card's own third row, 7 below it.
				HStack(spacing: 9 * u) {
					ZStack {
						Circle().fill(Sim.chipBg)
						Text(badge)
							.font(StakFont.sora(14 * u, .semiBold))
							.foregroundStyle(Sim.badgeInk)
					}
					.frame(width: 34 * u, height: 34 * u)
					Text(ticker)
						.font(StakFont.sora(12 * u, .medium))
						.foregroundStyle(Color.white)
				}
				Text(sub)
					.font(StakFont.geist(11 * u))
					.foregroundStyle(Sim.faint)
			}
			.padding(14 * u)
			.frame(maxWidth: .infinity, alignment: .leading)
			.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
		}
		.buttonStyle(.pressDim)
	}
}

private struct HowItWorksCard: View {
	private let rules = [
		("1", "Buy a stock with paper dollars. It starts that day."),
		("2", "Your shares move with the real price, up or down."),
		("3", "Sell anytime and the cash returns to your balance.")
	]

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 10 * u) {
			Text("HOW PAPER TRADING WORKS")
				.font(StakFont.geist(10 * u, .medium))
				.tracking(0.9 * u)
				.foregroundStyle(Sim.faint)
			ForEach(rules, id: \.0) { n, rule in
				// 1:3995 (exact-design audit 2026-09-04): pill and line share the row's top edge.
				HStack(alignment: .top, spacing: 10 * u) {
					ZStack {
						RoundedRectangle(cornerRadius: 10 * u).fill(Sim.tealTint)
						Text(n)
							.font(StakFont.sora(11 * u, .semiBold))
							.foregroundStyle(Sim.teal)
					}
					.frame(width: 20 * u, height: 20 * u)
					Text(rule)
						.font(StakFont.geist(12 * u))
						.stakLineHeight(18 * u, size: 12 * u, face: .geist)
						.foregroundStyle(Sim.body)
				}
			}
		}
		.padding(.horizontal, 16 * u)
		.padding(.vertical, 15 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

/// One portfolio pick row (badge 40, ticker + picked line, P&L right).
struct PortfolioRow<Trailing: View>: View {
	let badge: String
	let ticker: String
	let sub: String
	let amount: String
	let pct: String
	let up: Bool
	var action: () -> Void = {}
	var trailing: Trailing
	/// 1:4539 (exact-design audit 2026-09-04): the Portfolio page's picked line is
	/// Geist Light; Simulate home's (1:4015) is Regular. Declared last with a
	/// default - memberwise order.
	var subLight: Bool = false

	init(
		badge: String, ticker: String, sub: String,
		amount: String, pct: String, up: Bool,
		action: @escaping () -> Void = {},
		@ViewBuilder trailing: () -> Trailing,
		subLight: Bool = false
	) {
		self.badge = badge
		self.ticker = ticker
		self.sub = sub
		self.amount = amount
		self.pct = pct
		self.up = up
		self.action = action
		self.trailing = trailing()
		self.subLight = subLight
	}

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			HStack(spacing: 12 * u) {
				ZStack {
					Circle().fill(Sim.chipBg)
					Text(badge)
						.font(StakFont.sora(16 * u, .semiBold))
						.foregroundStyle(Sim.badgeInk)
				}
				.frame(width: 40 * u, height: 40 * u)
				VStack(alignment: .leading, spacing: 3 * u) {
					Text(ticker)
						.font(StakFont.sora(12 * u, .medium))
						.foregroundStyle(Color.white)
					Text(sub)
						.font(StakFont.geist(10 * u, subLight ? .light : .regular))
						.foregroundStyle(Sim.muted)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				VStack(alignment: .trailing, spacing: 2 * u) {
					Text(amount)
						// 1:4017 (exact-design audit 2026-09-04): the P&L is Geist Regular, not Medium.
						.font(StakFont.geist(12 * u))
						.foregroundStyle(up ? Sim.green : Sim.red)
					Text(pct)
						.font(StakFont.geist(10 * u))
						.foregroundStyle(Sim.faint)
				}
				trailing
			}
			.padding(.horizontal, 14 * u)
			.padding(.vertical, 12 * u)
			.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
		}
		.buttonStyle(.pressDim)
	}
}

extension PortfolioRow where Trailing == EmptyView {
	init(
		badge: String, ticker: String, sub: String,
		amount: String, pct: String, up: Bool,
		action: @escaping () -> Void = {}
	) {
		self.init(
			badge: badge, ticker: ticker, sub: sub,
			amount: amount, pct: pct, up: up,
			action: action, trailing: { EmptyView() }
		)
	}
}

/// Allocation — Simulate's donut + the 42/25/17/8/8 sector bars.
private struct SimAllocationCard: View {
	var body: some View {
		let u = figmaUnit
		VStack(spacing: 16 * u) {
			Text("Allocation")
				.font(StakFont.sora(15 * u, .semiBold))
				.foregroundStyle(Color.white)
			if PaperPortfolio.shared.demo {
				Image("SimDonut")
					.resizable()
					.frame(width: 150 * u, height: 150 * u)
				VStack(spacing: 12 * u) {
					SimSector(name: "Tech & AI", share: "42% · 5 stocks", color: Sim.teal, fill: 132)
					SimSector(name: "Finance", share: "25% · 3 stocks", color: Color(argb: 0xFF7AB3F0), fill: 66)
					SimSector(name: "Green Energy", share: "17% · 2 stocks", color: Sim.green, fill: 63)
					SimSector(name: "Real Estate", share: "8% · 1 stock", color: Color(argb: 0xFF9E8CE5), fill: 38)
					SimSector(name: "Other", share: "8% · 1 stock", color: Sim.faint, fill: 16)
				}
			} else {
				// A new account's ring and bars come from its own picks (product audit, 2026-09-05).
				let buckets = StakInsights.buckets(PaperPortfolio.shared.positions.map { $0.spec.symbol })
				DonutRing(shares: buckets.map { CGFloat($0.share) }, colors: buckets.map { simBucketColor($0.id) }, size: 150 * u)
				VStack(spacing: 12 * u) {
					ForEach(buckets, id: \.id) { b in
						SimSector(name: b.name, share: "\(Int((b.share * 100).rounded()))% · \(heldCountLabel(b.count))", color: simBucketColor(b.id), fill: CGFloat(314 * b.share))
					}
				}
			}
		}
		.padding(18 * u)
		.frame(maxWidth: .infinity)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

/// The authored bucket palette (1:4040), one colour per collection.
private func simBucketColor(_ id: String) -> Color {
	switch id {
	case "aitech": return Sim.teal
	case "finance": return Color(argb: 0xFF7AB3F0)
	case "green": return Sim.green
	case "realestate": return Color(argb: 0xFF9E8CE5)
	case "health": return Color(argb: 0xFF5DA8BF)
	case "consumer": return Color(argb: 0xFFE8B86D)
	default: return Sim.faint
	}
}

struct SimSector: View {
	let name: String
	let share: String
	let color: Color
	let fill: CGFloat

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 6 * u) {
			HStack {
				Circle().fill(color).frame(width: 9 * u, height: 9 * u)
				Spacer().frame(width: 8 * u)
				Text(name)
					.font(StakFont.geist(13 * u))
					.foregroundStyle(Color.white)
				Spacer()
				Text(share)
					.font(StakFont.geist(12 * u))
					.foregroundStyle(Sim.muted)
			}
			ZStack(alignment: .leading) {
				RoundedRectangle(cornerRadius: 4 * u).fill(Sim.track).frame(height: 7 * u)
				RoundedRectangle(cornerRadius: 4 * u).fill(color).frame(width: fill * u, height: 7 * u)
			}
		}
	}
}

/// THIS WEEK'S BOARD mini-leaderboard.
private struct BoardCard: View {
	let onOpenLeaderboard: () -> Void
	@ObservedObject private var portfolio = PaperPortfolio.shared

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 10 * u) {
			HStack {
				Text("THIS WEEK’S BOARD")
					.font(StakFont.geist(10 * u, .medium))
					.tracking(0.9 * u)
					.foregroundStyle(Sim.faint)
				Spacer()
				Text("Trailing 7 days")
					.font(StakFont.geist(10 * u))
					.foregroundStyle(Sim.faint)
			}
			boardRow(rank: "1", name: "Maya A.", pct: "+9.4%", you: false)
			boardRow(rank: "2", name: "Jide O.", pct: "+8.8%", you: false)
			// Audit item 6: the You row quotes the hero's week (1:3898 authored +4.2% here, +1.9% above).
			// Authored board figures (1:4111 +4.2%; user, 2026-09-04 (CHINEDU 07 · Simulate 423:1007): the authored look wins).
			boardRow(rank: portfolio.rank.map(String.init) ?? "—", name: "You", pct: portfolio.demo ? "+4.2%" : portfolio.weekPctText, you: true)
			// 1:4112 (exact-design audit 2026-09-04): the frame lays this link at the card's
			// left edge (x16, hug width), not centred like the column links.
			CenterLink(text: "Full leaderboard", action: onOpenLeaderboard, centered: false)
		}
		.padding(16 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}

	private func boardRow(rank: String, name: String, pct: String, you: Bool) -> some View {
		let u = figmaUnit
		return HStack(spacing: 10 * u) {
			Text(rank)
				.font(StakFont.sora(12 * u, .semiBold))
				.foregroundStyle(you ? Sim.teal : Sim.faint)
				// 1:4101 (exact-design audit 2026-09-04): the rank sits in a 22-wide box so the names line up.
				.frame(width: 22 * u, alignment: .leading)
			Text(name)
				.font(StakFont.geist(13 * u, you ? .semiBold : .medium))
				.foregroundStyle(Color.white)
				.frame(maxWidth: .infinity, alignment: .leading)
			Text(pct)
				.font(StakFont.sora((you ? 13 : 12) * u, .semiBold))
				.foregroundStyle(you ? Sim.teal : Sim.headerGray)
		}
		.padding(.horizontal, 10 * u)
		.padding(.vertical, 7 * u)
		.background(you ? Sim.tealTint : Color.clear, in: RoundedRectangle(cornerRadius: 10 * u))
	}
}

/// The authored teal drop shadow under the CTAs (#52AAC7) - `dy` / `blur`
/// in artboard units, `alpha` 0..1 - laid behind the r6 box the way the
/// Discover deck CTA does it (exact-design audit 2026-09-04). Chain it
/// after the fill so the wash sits under it.
extension View {
	func tealShadow(dy: CGFloat, blur: CGFloat, alpha: Double, radius: CGFloat = 6) -> some View {
		let u = figmaUnit
		return background {
			RoundedRectangle(cornerRadius: radius * u)
				.fill(Color(argb: 0xFF52AAC7))
				.opacity(alpha)
				.blur(radius: blur * u)
				.offset(y: dy * u)
		}
	}
}

/// The card an empty section shows a new account (cardBg r14, Sora title, Geist body, optional teal link) -
/// mirrors Android's EmptyStateCard (product audit, 2026-09-05).
struct EmptyStateCard: View {
	let title: String
	let text: String
	var link: String? = nil
	var onLink: () -> Void = {}

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 6 * u) {
			Text(title)
				.font(StakFont.sora(15 * u, .semiBold))
				.foregroundStyle(StakColors.textPrimary)
			Text(text)
				.font(StakFont.geist(13 * u))
				.stakLineHeight(19 * u, size: 13 * u, face: .geist)
				.foregroundStyle(Sim.muted)
			if let link {
				Button(action: onLink) {
					Text("\(link) ›")
						.font(StakFont.geist(13 * u, .medium))
						.foregroundStyle(Sim.teal)
				}
				.buttonStyle(.pressDim)
				.padding(.top, 4 * u)
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
	}
}
