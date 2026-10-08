import SwiftUI

/// Simulate's palette (CHINEDU 07 · Simulate). Every metric on these pages is scaled by the 390pt artboard unit
/// (`figmaUnit`), exactly like the Android build's `u` scaling.
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

/// 07 · Simulate — the paper-money tab: the portfolio-value hero with its chart, saved staks with Buy pills, the
/// insight, the best/worst duo, how paper trading works, the portfolio rows and the allocation breakdown. Mirrors
/// android ui/simulate/SimulateScreen.kt.
struct SimulateView: View {
	let onOpenPortfolio: () -> Void
	/// Every pick tile / row passes its own ticker, so Pick detail serves the tapped pick.
	let onOpenPick: (String) -> Void
	/// Authored (1:3964): "All saved staks ›" -> My STAK Overview (tab SWAP, Instant).
	var onOpenMyStak: () -> Void = {}
	/// The empty state's "Go to Discover" (a new account has nothing saved yet).
	var onOpenDiscover: () -> Void = {}
	/// When the shell hosts the ticket (1:4232: the sheet covers the tab bar), it raises it here with the tapped row's spec.
	var onPracticeBuy: ((BuySpec) -> Void)? = nil
	/// False while a page is pushed over the tab: the prices and the ledger stop refreshing.
	var isTop = true

	/// The locally hosted ticket's spec (nil = no ticket).
	@State private var buy: BuySpec? = nil
	/// The paper ledger - rows, pick count and the saved rows' "In portfolio" line follow it.
	@ObservedObject private var portfolio = PaperPortfolio.shared
	/// A real account's held picks and saved rows mark to today's price while the page is open.
	@ObservedObject private var quotes = LiveQuotes.shared
	@ObservedObject private var holdings = MyStakHoldings.shared
	@Environment(\.scenePhase) private var scenePhase

	var body: some View {
		let u = figmaUnit
		let savedRows = savedStakRows()
		ZStack {
			VStack(spacing: 0) {
				ScrollView(showsIndicators: false) {
					VStack(spacing: 18 * u) {
						Group {
							// The header scrolls with the content like Home's top nav (user, 2026-09-14:
							// "I don't want a fixed top bar"); the 18 item gap is the old top inset.
							HStack {
								VStack(alignment: .leading, spacing: 3 * u) {
									Text("Simulate")
										.font(StakFont.sora(26 * u, .semiBold))
										.foregroundStyle(Color.white)
										.frame(minHeight: 33 * u * typeScale) // 1:3916 line box (exact-design audit 2026-09-04)
										.accessibilityAddTraits(.isHeader)
									Text("Pick from your saves. Paper money does the talking.")
										.font(StakFont.geist(12 * u))
										.foregroundStyle(Sim.muted)
										.frame(minHeight: 16 * u * typeScale) // 1:3917 line box
								}
								Spacer()
								// The clock (1:3918 "btn") is the pick history - SOLD · REALIZED lives on the portfolio page.
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
							// 1:3914 (exact-design audit 2026-09-04): the 52-tall header sits 8 below the
							// status bar with no bottom inset - the 18 above the hero is the Main column's own.
							.padding(.top, 8 * u)
							// A real account's first read briefly leaves cash and setup at their placeholders - held back,
							// so a returning account never flashes the setup card and "$10,000 paper" first.
							if !portfolio.demo && portfolio.loading {
								ProgressView()
									.tint(Sim.teal)
									.frame(maxWidth: .infinity)
									.frame(height: 160 * u)
							} else {
								// Portfolio setup (FigJam Simulate board, 2026-09-14): a new account chooses its
								// balance, name and strategy before its first trade.
								// No hero before setup: there is no portfolio yet to put a value or a gain on.
								if portfolio.needsSetup { PortfolioSetupCard() } else { ScoreHero() }
								if !portfolio.demo && portfolio.setupDone { PortfolioSetupLine() }
							}
						}
						sectionHeader("Saved staks")
						if savedRows.isEmpty {
							// A new account has saved nothing yet.
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
						// Best / worst come from the ledger (largest and smallest dollar gain, live for a real account);
						// with fewer than two positions there's nothing to compare.
						let gains = Dictionary(portfolio.positions.map { ($0.id, $0.gainDollars) }, uniquingKeysWith: { a, _ in a })
						// A tie (two fresh buys, no quotes yet) has no best or worst - it would name one stock both ways.
						if portfolio.positions.count >= 2,
						   let best = portfolio.positions.max(by: { (gains[$0.id] ?? 0) < (gains[$1.id] ?? 0) }),
						   let worst = portfolio.positions.min(by: { (gains[$0.id] ?? 0) < (gains[$1.id] ?? 0) }),
						   (gains[best.id] ?? 0) != (gains[worst.id] ?? 0) {
							let bestRow = best.liveRow
							let worstRow = worst.liveRow
							HStack(spacing: 10 * u) {
								PickDuo(kicker: "BEST PICK", pct: bestRow.pct, pctColor: bestRow.up ? Sim.green : Sim.red, badge: bestRow.badge, ticker: bestRow.ticker, sub: best.duoLine, action: { onOpenPick(bestRow.ticker) })
								PickDuo(kicker: "WORST PICK", pct: worstRow.pct, pctColor: worstRow.up ? Sim.green : Sim.red, badge: worstRow.badge, ticker: worstRow.ticker, sub: worst.duoLine, action: { onOpenPick(worstRow.ticker) })
							}
						}
						HowItWorksCard()
						sectionHeader("Your portfolio")
						// The first three held positions - a fresh buy lands at the top.
						// 1:4009 plist (exact-design audit 2026-09-04): the three rows sit 10 apart, not the column's 18.
						if portfolio.pickCount == 0 {
							// A new account has no picks yet.
							EmptyStateCard(title: "No picks yet", text: "Your first practice buy lands here with its live gain.")
						} else {
							VStack(spacing: 10 * u) {
								ForEach(Array(portfolio.positions.prefix(3))) { position in
									let p = position.liveRow
									PortfolioRow(badge: p.badge, ticker: p.ticker, sub: p.sub, amount: p.amount, pct: p.pct, up: p.up, action: { onOpenPick(p.ticker) })
								}
							}
							CenterLink(text: "See all \(portfolio.pickCountText)", action: onOpenPortfolio)
						}
						// 1:4040 Points breakdown (exact-design audit 2026-09-04): the section header
						// and the Allocation card are 15 apart, not the column's 18.
						if portfolio.pickCount > 0 {
							VStack(spacing: 15 * u) {
								HStack {
									Text("Portfolio breakdown")
										.font(StakFont.sora(16 * u, .semiBold))
										.foregroundStyle(Sim.headerGray)
										.accessibilityAddTraits(.isHeader)
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
												.accessibilityHidden(true)
										}
									}
									.buttonStyle(.pressDim)
								}
								.frame(minHeight: 21 * u * typeScale) // 1:4041 header row (Sora 16 on a 1.34 line)
								SimAllocationCard()
							}
						}
					}
					.padding(.horizontal, 20 * u)
					.padding(.bottom, 26 * u)
				}
			}
			if let spec = buy {
				// 85:895 authors "View portfolio" / "Done" on the Simulate add-success sheet.
				DiscoverBuyFlow(spec: spec, onClose: { buy = nil }, filledPrimary: "View portfolio", filledSecondary: "Done", ticketSecondary: "Back")
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		// The prices of what's held and saved, and the ledger itself (a limit order filled by the server's scheduled job
		// shows up without a relaunch) - every 15s while the tab is in front, and at once on coming back to it.
		.task(id: "\(quoteSymbols(savedRows).joined(separator: ",")):\(isTop):\(scenePhase == .active):\(portfolio.demo)") {
			guard !portfolio.demo, isTop, scenePhase == .active else { return }
			let symbols = quoteSymbols(savedRows)
			while true {
				await quotes.refresh(symbols)
				do { try await Task.sleep(nanoseconds: livePriceInterval) } catch { return }
			}
		}
		.task(id: "\(isTop):\(scenePhase == .active):\(portfolio.demo)") {
			guard !portfolio.demo, isTop, scenePhase == .active else { return }
			while true {
				portfolio.refresh()
				do { try await Task.sleep(nanoseconds: livePriceInterval) } catch { return }
			}
		}
		// A company handed over by a stock page's Practice buy - opened on today's price, or not at all: a paper order
		// must never fill at a price STAK doesn't have. Taken only once the price is in hand, so a failed look-up leaves
		// the request for the next visit instead of dropping it.
		.task(id: isTop) {
			guard isTop, let pending = PendingSimBuy.peek(), let q = await quotes.quote(pending.symbol) else { return }
			PendingSimBuy.take()
			practiceBuy(BuySpec(
				title: "Buy \(pending.company)?", badge: String(pending.company.prefix(1)).uppercased(), name: pending.company,
				priceLine: "$0.00 today", change: "", cashBefore: "$0.00", cashAfter: "$0.00", shares: "0", symbol: pending.symbol
			).withQuote(q.price, changePct: q.changePct))
		}
	}

	/// What's held and what the saved rows offer - the symbols whose prices this page shows.
	private func quoteSymbols(_ savedRows: [SavedStak]) -> [String] {
		var seen = Set<String>()
		return (portfolio.positions.map(\.spec.symbol) + savedRows.map(\.spec.symbol)).filter { seen.insert($0).inserted }
	}

	/// The tapped row's ticket: raised to the shell when it hosts the sheet, else shown here.
	private func practiceBuy(_ spec: BuySpec) {
		if let onPracticeBuy { onPracticeBuy(spec) } else { buy = spec }
	}

	/// A saved stak that has been bought reads "In portfolio · 0.8803 shares" in place of the "not in portfolio yet"
	/// line (1:3964 template).
	private func savedSub(_ symbol: String, authored: String) -> String {
		guard let held = portfolio.pickSpec(symbol) else { return authored }
		return "In portfolio · \(held.shares) shares"
	}

	/// A "Saved staks" row: the stock's buy ticket and its sub line.
	private struct SavedStak { let spec: BuySpec; let sub: String }

	/// The demo account shows its two authored saves (PLTR / COST); a real account lists what IT saved, newest first,
	/// two at a time, each with its real save day.
	private func savedStakRows() -> [SavedStak] {
		if portfolio.demo {
			return [
				// Authored 4 and 2 days before the frame's July 4, kept as ages.
				SavedStak(spec: pltrBuy, sub: savedSub("PLTR", authored: StakClock.savedLabel(daysAgo: 4) + " · not in portfolio yet")),
				SavedStak(spec: costBuy, sub: savedSub("COST", authored: StakClock.savedLabel(daysAgo: 2) + " · not in portfolio yet"))
			]
		}
		let designed = [nvdaBuy, aaplBuy, googlBuy, pltrBuy, costBuy]
		let ordered = holdings.tickers.sorted { a, b in
			let da = holdings.daysSinceSaved(a) ?? Int.max, db = holdings.daysSinceSaved(b) ?? Int.max
			return da != db ? da < db : a < b
		}
		return ordered
			.map { t in designed.first { $0.symbol == t } ?? catalogTicket(t) }
			.prefix(2)
			.map { SavedStak(spec: $0, sub: savedSub($0.symbol, authored: StakClock.savedLabel(daysAgo: holdings.daysSinceSaved($0.symbol) ?? 0) + " · not in portfolio yet")) }
	}

	/// A $25 paper ticket for a saved stock without a designed one, priced off today's live quote - the same feed every
	/// other real-account price reads. Nothing to show yet reads as a dash, never an invented number.
	private func catalogTicket(_ symbol: String) -> BuySpec {
		let name = holdings.nameOf(symbol) ?? (NewsArticleFeed.hasStockFacts(symbol) ? NewsArticleFeed.stockFacts(symbol).name : symbol)
		let blank = BuySpec(
			title: "Buy \(symbol)?", badge: String(symbol.prefix(1)), name: name,
			priceLine: "\u{2014} today", change: "\u{2014}",
			cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0", symbol: symbol
		)
		guard let quote = quotes.cached(symbol) else { return blank }
		return blank.withQuote(quote.price, changePct: quote.changePct).withAmount(25, cash: 8800)
	}

	private func sectionHeader(_ title: String) -> some View {
		Text(title)
			.font(StakFont.sora(16 * figmaUnit, .semiBold))
			.foregroundStyle(Sim.headerGray)
			.frame(maxWidth: .infinity, alignment: .leading)
			.accessibilityAddTraits(.isHeader)
	}
}

/// Portfolio value hero — $10,240.00, cash, weekly change, chart + pills.
private struct ScoreHero: View {
	@ObservedObject private var portfolio = PaperPortfolio.shared
	/// The live range - 3M as authored (1:3935).
	@State private var range = "3M"
	/// A real account's ledger value per range - kept while no trade lands, so switching pills doesn't re-fetch.
	@State private var history: [String: [PortfolioHistory.Point]] = [:]

	/// The change over the selected range - the line under the value follows the pills: 1D is today's move on what's
	/// held; a range the account began inside counts from the money it started with; otherwise from the range's first
	/// value to today's. Nil for the demo (authored figures) or before it's read: the all-time line shows meanwhile.
	private var rangeMove: (up: Bool, text: String)? {
		guard !portfolio.demo else { return nil }
		let value = portfolio.portfolioValue
		let change: Double, base: Double
		if range == "1D" {
			guard let move = portfolio.todayMove else { return nil }
			change = move; base = value - move
		} else if let firstTrade = portfolio.trades.map(\.epochDay).min(), firstTrade >= PaperPortfolio.rangeStartDay(range) {
			change = portfolio.allTimeGain; base = portfolio.paperStart
		} else {
			guard let first = history[range]?.first?.value else { return nil }
			change = value - first; base = first
		}
		guard base > 0 else { return nil }
		// Signed by the whole-dollar figure shown (as Android's and web's Math.round).
		let up = change >= -0.5
		return (up, PaperPortfolio.rangeLine(PaperPortfolio.signedWhole(change), pct: change / base * 100, up: up, range: range))
	}
	@State private var historyKey = ""

	/// "$10,240.00" split at the point: the 44 figure and the 18 cents.
	private func splitFigure(_ value: String) -> (whole: String, cents: String) {
		guard let dot = value.lastIndex(of: ".") else { return (value, "") }
		return (String(value[..<dot]), String(value[dot...]))
	}

	var body: some View {
		let u = figmaUnit
		let valueText = PaperPortfolio.money(portfolio.portfolioValue)
		let figure = splitFigure(valueText)
		VStack(alignment: .leading, spacing: 11 * u) {
			Group {
				Text("PORTFOLIO VALUE")
					.font(StakFont.geist(10 * u, .medium))
					.tracking(0.9 * u)
					.foregroundStyle(Sim.faint)
					// The figure below says "Portfolio value" with its number.
					.accessibilityHidden(true)
				HStack(alignment: .bottom, spacing: 0) {
					Text(figure.whole)
						.font(StakFont.sora(44 * u, .semiBold))
						// 1:3924 (exact-design audit 2026-09-04): no tracking - the -0.44 was never authored.
						// Authored box (1:3924) is 55 tall — pin it so the stack sums.
						.frame(height: 55 * u * typeScale)
						.foregroundStyle(Color.white)
					Text(figure.cents)
						.font(StakFont.sora(18 * u, .semiBold))
						.foregroundStyle(Sim.muted)
						// Authored (1:3923): ".00" starts 8 after the figure and its box bottom sits 8 above the figure's.
						.padding(.leading, 8 * u)
						.padding(.bottom, 8 * u)
				}
				.accessibilityElement(children: .ignore)
				.accessibilityLabel("Portfolio value, \(valueText)")
				// The base is the account's own start (what the user picked at Portfolio setup).
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
				.accessibilityElement(children: .combine)
				if let move = rangeMove {
					Text(move.text)
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(move.up ? Sim.green : Sim.red)
						.accessibilityLabel(PaperPortfolio.spokenMove(move.text))
				} else {
					Text("\(portfolio.weekUp ? "▲" : "▼") \(portfolio.weekGainText) (\(portfolio.weekPctText)) \(portfolio.gainPeriodLabel)")
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(portfolio.weekUp ? Sim.green : Sim.red)
						.accessibilityLabel("\(portfolio.weekUp ? "Up" : "Down") \(portfolio.weekGainText), \(portfolio.weekPctText), \(portfolio.gainPeriodLabel)")
				}
			}
			.padding(.horizontal, 20 * u)

			chart(u)
				.frame(width: 343 * u, height: 73.56 * u)
				.frame(maxWidth: .infinity)
			RangePills(selected: $range, tint: Sim.teal, muted: Sim.muted)
				.frame(maxWidth: .infinity)
				// Authored chart→pills gap 40; the column gap contributes 11.
				.padding(.top, 29 * u)
		}
		.padding(.vertical, 20 * u)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 18 * u))
		// A real account's line is its ledger's own value over the range - rebuilt when a trade lands (a buy or sell
		// changes what every past day held), cached per range otherwise.
		.task(id: "\(range):\(ledgerKey):\(portfolio.demo)") {
			guard !portfolio.demo else { return }
			if historyKey != ledgerKey {
				history = [:]
				historyKey = ledgerKey
			}
			// The range this task was started for - read again after the wait, a quick pill switch would file this
			// range's line under the next one.
			let forRange = range
			guard history[forRange] == nil else { return }
			let built = await PortfolioHistory.build(portfolio.trades, cash: portfolio.uninvested, holdings: portfolio.heldShares, range: forRange)
			guard !Task.isCancelled, let built else { return }
			history[forRange] = built
		}
	}

	/// The ledger's identity: its size, its newest trade and what's held now (the replay starts from today's shares,
	/// which a read can change with no trade logged) - the count alone stops moving once /trades' page is full.
	private var ledgerKey: String {
		let t = portfolio.trades.first
		let held = portfolio.heldShares.sorted { $0.key < $1.key }.map { "\($0.key):\($0.value)" }.joined(separator: ",")
		return "\(portfolio.trades.count)-\(t?.side ?? "")-\(t?.symbol ?? "")-\(t?.amount ?? 0)-\(t?.epochDay ?? 0)-\(held)"
	}

	/// The demo keeps its authored line - it has no live price behind its numbers. A real account's line is its own
	/// cash and shares priced with each traded stock's real history, never a shape invented to fill the box.
	@ViewBuilder
	private func chart(_ u: CGFloat) -> some View {
		if portfolio.demo {
			RangeLineChart(range: range, tint: Sim.teal, authored: "SimChartLine", width: 343 * u, height: 73.56 * u)
		} else if let points = history[range], points.count >= 2 {
			SeriesLine(series: PortfolioHistory.fractions(PortfolioHistory.endingToday(points, value: portfolio.portfolioValue)), tint: Sim.teal)
				.accessibilityHidden(true)
		} else {
			Text("No history yet")
				.font(StakFont.geist(11 * u))
				.foregroundStyle(Sim.faint)
		}
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
				.accessibilityLabel("Buy \(ticker)")
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
				.lineLimit(1)
				.minimumScaleFactor(0.7)
				.frame(width: 60 * u, height: 30 * u * typeScale)
				.background(discCtaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
				.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Sim.ctaBorder, lineWidth: 0.36 * u))
				// 1:3954 (exact-design audit 2026-09-04): the authored drop shadow - #52AAC7 at 4%, dy 12.285, blur 12.285.
				.tealShadow(dy: 12.285, blur: 12.285, alpha: 0.04)
		}
		.buttonStyle(.pressDim)
	}
}

/// The authored teal link (1:3964 / 1:4037 - exact-design audit 2026-09-04): Geist Medium 13 + "›" 14, both #69b3ca,
/// centered across the column.
struct CenterLink: View {
	let text: String
	let action: () -> Void

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
			.frame(minHeight: 18 * u * typeScale)
			.frame(maxWidth: .infinity)
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
					.accessibilityHidden(true)
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
					.accessibilityHidden(true)
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

/// The authored bucket palette (1:4040), one color per collection.
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
			HStack(spacing: 0) {
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
