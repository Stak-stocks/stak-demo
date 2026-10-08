import SwiftUI

/// One $100 paper pick served into the authored Pick detail template
/// (1:4631) and its sell sheets (1:4698 / 73:855). Codex parity audit
/// (2026-09-04): NVDA keeps the frame's literals byte for byte; the other
/// picks derive from the shared demo table - the same thing the Discover
/// deck does when "Learn more" serves the tapped stock. Mirrors android/
/// ui/simulate/PickDetailScreen.kt.
struct PickSpec: Codable, Equatable {
	let symbol: String
	let badge: String
	/// The sell row's name (1:4698) - NVDA keeps the authored "NVIDIA Corp".
	let company: String
	var priceNow: String
	let pickedLine: String
	let priceThen: String
	/// Signed dollars, e.g. "+$24.00" - the hero splits it at the point.
	var gain: String
	/// Unsigned, e.g. "24.0%" - `up` picks the up/down wording and the red.
	var gainPct: String
	var up: Bool
	var shares: String
	/// The position's value - the sell sheet's position value / proceeds.
	var stakeValue: String
	let vsMarket: String
	let ahead: Bool
	/// The day move on the sell row - the same figure the My STAK tile shows.
	var dayChange: String
	/// Cost basis label - "$100" for the six authored picks; a paper order carries its own.
	var stakeBasis: String = "$100"
	/// The This-week stat (1:4673) - authored "+$3.80"; a fresh order starts at "+$0.00".
	var weekGain: String = "+$3.80"

	var dayUp: Bool { !dayChange.hasPrefix("▼") }
	/// "+$24.00" -> "+$24" (the 48 box) and ".00" (its own 16/20 box, 1:4654); "" when there are no cents.
	var gainWhole: String { gain.components(separatedBy: ".").first ?? gain }
	var gainCents: String { String(gain.dropFirst(gainWhole.count)) }
}

enum PickSpecs {
	nonisolated static let all: [PickSpec] = [
		// Figma frame 1:4631 verbatim.
		PickSpec(symbol: "NVDA", badge: "N", company: "NVIDIA Corp", priceNow: "$122.10", pickedLine: "Picked May 8 at $98.50", priceThen: "$98.50", gain: "+$24.00", gainPct: "24.0%", up: true, shares: "1.0152", stakeValue: "$124.00", vsMarket: "+20.8% ahead", ahead: true, dayChange: "▲ 2.4%"),
		// TSLA's day move: the News feed's "Tesla drops 7%" story (-6.95% today).
		PickSpec(symbol: "TSLA", badge: "T", company: "Tesla", priceNow: "$291.30", pickedLine: "Picked Jun 3 at $246.86", priceThen: "$246.86", gain: "+$18.00", gainPct: "18.0%", up: true, shares: "0.4051", stakeValue: "$118.00", vsMarket: "+14.8% ahead", ahead: true, dayChange: "▼ 7.0%"),
		PickSpec(symbol: "AMD", badge: "A", company: "AMD", priceNow: "$164.30", pickedLine: "Picked May 29 at $148.02", priceThen: "$148.02", gain: "+$11.00", gainPct: "11.0%", up: true, shares: "0.6756", stakeValue: "$111.00", vsMarket: "+7.8% ahead", ahead: true, dayChange: "▲ 2.1%"),
		PickSpec(symbol: "AAPL", badge: "A", company: "Apple", priceNow: "$229.35", pickedLine: "Picked Apr 22 at $216.37", priceThen: "$216.37", gain: "+$6.00", gainPct: "6.0%", up: true, shares: "0.4622", stakeValue: "$106.00", vsMarket: "+2.8% ahead", ahead: true, dayChange: "▲ 1.2%"),
		PickSpec(symbol: "JPM", badge: "J", company: "JPMorgan", priceNow: "$245.60", pickedLine: "Picked Jun 20 at $240.78", priceThen: "$240.78", gain: "+$2.00", gainPct: "2.0%", up: true, shares: "0.4153", stakeValue: "$102.00", vsMarket: "-1.2% behind", ahead: false, dayChange: "▲ 0.6%"),
		PickSpec(symbol: "MSFT", badge: "M", company: "Microsoft", priceNow: "$438.20", pickedLine: "Picked Jun 26 at $451.75", priceThen: "$451.75", gain: "-$3.00", gainPct: "3.0%", up: false, shares: "0.2214", stakeValue: "$97.00", vsMarket: "-6.2% behind", ahead: false, dayChange: "▼ 0.4%"),
	]

	/// The tapped pick's numbers: the live position first (a fresh buy has no authored entry), then the authored
	/// table; an unknown symbol falls back to the frame's NVDA.
	@MainActor
	static func pick(_ symbol: String) -> PickSpec {
		PaperPortfolio.shared.pickSpec(symbol) ?? all.first { $0.symbol == symbol } ?? all[0]
	}
}

/// 07 · Simulate — "Pick detail · paper" (CHINEDU 1:4631). The NVDA
/// position page: picked line, the +$24.00 gain hero, chart with range
/// pills, the This-week / vs-the-market duo, Price then/now, the WHY?
/// insight and the dark Sell CTA (raises the sell flow from here too).
/// Codex parity audit (2026-09-04): serves the TAPPED pick (`symbol`)
/// into the authored template; NVDA renders exactly as before.
/// Ported from android/ ui/simulate/PickDetailScreen.kt. Every metric
/// is scaled by the 390pt artboard unit (`figmaUnit`), exactly like
/// the Android build's `u` scaling.
struct PickDetailView: View {
	/// The pick this page serves - every row / Sell pill on Simulate home
	/// and Portfolio passes its own ticker (PickSpecs).
	let symbol: String
	let onBack: () -> Void
	/// Authored (73:855): the sell receipt's exits, raised to the shell -
	/// Back to Simulate (the forward push) and View portfolio (dissolve 300).
	var onSellBackToSimulate: (() -> Void)? = nil
	var onSellViewPortfolio: (() -> Void)? = nil
	/// The top of the shell's stack: covered, the price stops refreshing.
	var isTop = true

	/// The pick the sell flow is closing (nil = no sheet). Snapshotted at
	/// the Sell tap so the receipt (73:855) keeps showing the sold pick
	/// after PaperPortfolio drops it - and the numbers the user confirmed
	/// against, not a price that moved under the receipt.
	@State private var selling: PickSpec? = nil
	/// The range pills select (user, 2026-09-05); "3M" keeps the authored SimChartLine (1:4631).
	@State private var range = "3M"
	/// A real pick's own price history per range (the stock page's /chart), so switching pills doesn't re-fetch.
	@State private var charts: [String: PickChart] = [:]
	@ObservedObject private var portfolio = PaperPortfolio.shared
	/// The stock's closes over the last week, and SPY's move over it - "This week" and "vs the market" for a real
	/// pick (web's pick page); nil until read, or when a chart didn't come back.
	@State private var weekCloses: [Double]? = nil
	@State private var spyWeekPct: Double? = nil
	/// Live prices: a held pick re-prices from them as they land.
	@ObservedObject private var quotes = LiveQuotes.shared
	@Environment(\.scenePhase) private var scenePhase

	/// The ledger's live spec (a bought pick, or an authored one topped up) - authored fallback for anything not held.
	private var pick: PickSpec { selling ?? PickSpecs.pick(symbol) }

	/// A real account opening a stock it doesn't hold (a stale link, or the position just sold elsewhere) - never
	/// the demo's authored numbers in its place (web's "Not in your portfolio").
	private var notHeld: Bool { !portfolio.demo && selling == nil && portfolio.pickSpec(symbol) == nil }

	var body: some View {
		if notHeld {
			notHeldPage
		} else {
			detail
		}
	}

	private var notHeldPage: some View {
		let u = figmaUnit
		return VStack(alignment: .leading, spacing: 0) {
			HStack {
				AuthBackCircle(action: onBack)
				Spacer()
				Text(symbol)
					.font(StakFont.sora(16 * u, .semiBold))
					.foregroundStyle(Color.white)
					.accessibilityAddTraits(.isHeader)
				Spacer()
				Color.clear.frame(width: 40 * u, height: 40 * u)
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 10 * u)
			if portfolio.loading {
				ProgressView().tint(Sim.teal).frame(maxWidth: .infinity).padding(.top, 40 * u)
			} else {
				VStack(alignment: .leading, spacing: 6 * u) {
					Text("Not in your portfolio")
						.font(StakFont.geist(14 * u, .medium))
						.foregroundStyle(StakColors.textPrimary)
					Text("You don’t hold \(symbol) right now. Buy it from Saved staks on Simulate.")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Sim.muted)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.padding(16 * u)
				.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
				.padding(.horizontal, 20 * u)
				.padding(.top, 16 * u)
			}
			Spacer(minLength: 0)
		}
		.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
		.background(StakColors.bg.ignoresSafeArea())
		// Opened before the portfolio has ever loaded (a failed first read): this page asks again rather than spin -
		// only Simulate polls.
		.task(id: portfolio.hasHydrated) {
			guard !portfolio.hasHydrated else { return }
			while !Task.isCancelled && !portfolio.hasHydrated {
				portfolio.refresh()
				do { try await Task.sleep(nanoseconds: livePriceInterval) } catch { return }
			}
		}
	}

	private var detail: some View {
		let u = figmaUnit
		// Worked out once per render - it re-prices off the live quote.
		let pick = pick
		return ZStack {
			VStack(spacing: 0) {
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
					Text(pick.symbol)
						.font(StakFont.sora(16 * u, .semiBold))
						.foregroundStyle(Color.white)
						.accessibilityAddTraits(.isHeader)
					Spacer()
					ZStack {
						Circle().fill(Sim.cardBg)
						Image("IcNewsShare")
							.resizable()
							.frame(width: 18 * u, height: 18 * u) // 1:4652 icon/share is 18 (exact-design audit 2026-09-04)
					}
					.frame(width: 40 * u, height: 40 * u)
					// Drawn, not wired - Android's carries no action either.
					.accessibilityHidden(true)
				}
				.padding(.horizontal, 18 * u)
				.padding(.vertical, 8 * u)

				ScrollView(showsIndicators: false) {
					VStack(alignment: .leading, spacing: 16 * u) {
						// Authored hero card (1:4654): 350x307 r16 with 18 padding - avatar row,
						// +$24 in a 48-tall box with the .00 at 16/20, subtitle, the 343x73.5 chart
						// line bleeding 14.5 past the padding, range tabs 40 below the line.
						VStack(alignment: .leading, spacing: 0) {
							HStack(spacing: 9 * u) {
								ZStack {
									Circle().fill(Sim.chipBg)
									Text(pick.badge)
										.font(StakFont.sora(15 * u, .semiBold))
										.foregroundStyle(Sim.badgeInk)
								}
								.frame(width: 38 * u, height: 38 * u)
								Text(pick.pickedLine)
									.font(StakFont.geist(12 * u))
									.foregroundStyle(Sim.muted)
							}
							HStack(alignment: .bottom, spacing: 0) {
								// A losing pick's figure takes the authored red (the
								// frame's +$24 is white); the cents stay muted.
								Text(pick.gainWhole)
									.font(StakFont.sora(38 * u, .semiBold))
									// 1:4660 (exact-design audit 2026-09-04): no tracking - the -0.38 was never authored.
									.foregroundStyle(pick.up ? Color.white : Sim.red)
								Text(pick.gainCents)
									.font(StakFont.sora(16 * u, .semiBold))
									.foregroundStyle(Sim.muted)
									.padding(.leading, 7 * u)
									.padding(.bottom, 6 * u)
							}
							.frame(height: 48 * u * typeScale, alignment: .bottom)
							.padding(.top, 11 * u)
							.accessibilityElement(children: .ignore)
							.accessibilityLabel("Gain, \(pick.gain)")
							// Review (2026-09-04): the pick's own cost basis ("$100" authored).
							Text("That is \(pick.up ? "up" : "down") \(pick.gainPct) on a \(pick.stakeBasis) paper stake")
								// 1:4662 (exact-design audit 2026-09-04): Geist Light, like the hero's all-time line.
								.font(StakFont.geist(12 * u, .light))
								.foregroundStyle(Sim.muted)
								.frame(height: 16 * u * typeScale) // Authored line box is 16 — pin it so the card sums to 271
								.padding(.top, 11 * u)
							// Compose `requiredSize`: the line measures as the 314-wide content
							// row but draws its full 343x73.5, bleeding 14.5 past each side.
							Color.clear
								.frame(maxWidth: .infinity)
								.frame(height: 73.5 * u)
								.overlay(chart(u))
								.padding(.top, 11 * u)
							RangePills(selected: $range, tint: Sim.teal, muted: Sim.muted)
							.frame(maxWidth: .infinity)
							.padding(.top, 40 * u)
						}
						.padding(18 * u)
						.frame(maxWidth: .infinity, alignment: .leading)
						// A floor, not a pin: enlarged text grows the card instead of being clipped.
						.frame(minHeight: 307 * u * typeScale, alignment: .top)
						// 1:4654 (exact-design audit 2026-09-04): the hero is r16 - the r24 was never authored.
						.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
						.clipShape(RoundedRectangle(cornerRadius: 16 * u))
						// Stats (1:4673): two 61-tall rows, 10 apart, 170-wide cells.
						VStack(alignment: .leading, spacing: 10 * u) {
							HStack(spacing: 10 * u) {
								// The demo's authored figures; a real pick's own week - the dollars on the held shares since the
								// week's first close, and its move against SPY's (both were fixed at "+$0.00" / "Even").
								let week = weekStats(pick)
								StatBox(label: "This week", value: week.gain, valueColor: week.gainColor)
								StatBox(label: "vs the market", value: week.versus, valueColor: week.versusColor)
							}
							HStack(spacing: 10 * u) {
								// 1:4684 / 1:4687 (exact-design audit 2026-09-04): the prices are plain white, not #f2f6fc.
								StatBox(label: "Price then", value: pick.priceThen, valueColor: Color.white)
								StatBox(label: "Price now", value: pick.priceNow, valueColor: Color.white)
							}
						}
						// WHY / insight card — teal-tinted like the deck tips.
						VStack(alignment: .leading, spacing: 9 * u) {
							// 1:4689 (exact-design audit 2026-09-04): sparkle and kicker share the row's top edge.
							HStack(alignment: .top, spacing: 7 * u) {
								Image("IcGistSparkle")
									.resizable()
									.frame(width: 16 * u, height: 16 * u)
									.accessibilityHidden(true)
								Text("INSIGHT")
									.font(StakFont.geist(10 * u, .medium))
									.tracking(0.9 * u)
									.foregroundStyle(Sim.faint)
							}
							// Same authored sentence for a losing pick - only the symbol swaps.
							Text("Your stake tracks the move live. If \(pick.symbol) gives back gains, the dollars follow it down.")
								.font(StakFont.geist(12 * u))
								.stakLineHeight(17 * u, size: 12 * u, face: .geist)
								.foregroundStyle(Sim.body)
						}
						// Live note (1:4688): 83 tall, x14, kicker row at 12, body at 37.
						.padding(.horizontal, 14 * u)
						.padding(.vertical, 12 * u)
						.frame(maxWidth: .infinity, alignment: .leading)
						// 1:4688 (exact-design audit 2026-09-04): the live note is r14.
						.background(Sim.tealTint, in: RoundedRectangle(cornerRadius: 14 * u))
						// Review (2026-09-04): no Sell for a pick the ledger no longer
						// holds (sold, or an authored fallback) - no phantom sell.
						if portfolio.holds(symbol) {
							Button { selling = pick } label: {
								Text("Sell")
									// 1:4695 (exact-design audit 2026-09-04): Sora Regular 14 - was Geist Medium.
									.font(StakFont.sora(14 * u))
									.foregroundStyle(Color.white)
									.frame(maxWidth: .infinity)
									.frame(height: 51 * u * typeScale)
									.background(Sim.darkCta, in: RoundedRectangle(cornerRadius: 6 * u))
									// 1:4694 (exact-design audit 2026-09-04): the 0.361 CTA hairline and the 4% teal wash under #12203e.
									.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Sim.ctaBorder, lineWidth: 0.361 * u))
									.tealShadow(dy: 12.285, blur: 12.285, alpha: 0.04)
							}
							.buttonStyle(.pressDim)
						}
						Button(action: onBack) {
							Text("Back")
								.font(StakFont.sora(14 * u))
								.foregroundStyle(Sim.muted)
								.frame(maxWidth: .infinity)
								.frame(height: 52 * u * typeScale)
								.overlay(
									RoundedRectangle(cornerRadius: 6 * u)
										.strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u)
								)
						}
						.buttonStyle(.pressDim)
					}
					.padding(.horizontal, 20 * u)
					.padding(.top, 6 * u)
					.padding(.bottom, 26 * u) // 1:4653 pb 26 (exact-design audit 2026-09-04)
				}
			}
			if let sellingPick = selling {
				// The sell flow sells THIS pick (same authored template).
				SellFlowHost(
					pick: sellingPick,
					// Authored (1:4698): the confirm's Back -> Pick detail, Instant.
					onClose: { selling = nil },
					onBackToSimulate: { if let onSellBackToSimulate { onSellBackToSimulate() } else { selling = nil; onBack() } },
					onViewPortfolio: { if let onSellViewPortfolio { onSellViewPortfolio() } else { selling = nil; onBack() } }
				)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		// A real pick marks to today's price while the page is in front - paused while the sell sheet is up.
		.task(id: "\(symbol):\(isTop):\(scenePhase == .active):\(portfolio.demo)") {
			guard !portfolio.demo, isTop, scenePhase == .active else { return }
			while true {
				if selling == nil { await quotes.refresh([symbol]) }
				do { try await Task.sleep(nanoseconds: livePriceInterval) } catch { return }
			}
		}
		.task(id: "\(symbol):week:\(portfolio.demo)") {
			guard !portfolio.demo else { return }
			async let stock = try? StockRepository.shared.getChart(symbol, range: "1w")
			async let market = try? StockRepository.shared.getChart("SPY", range: "1w")
			let closes = (await stock)?.prices.map(\.close).filter { $0 > 0 } ?? []
			let spy = (await market)?.prices.map(\.close).filter { $0 > 0 } ?? []
			guard !Task.isCancelled else { return }
			weekCloses = closes.count >= 2 ? closes : nil
			if spy.count >= 2, let first = spy.first, let last = spy.last { spyWeekPct = (last - first) / first * 100 }
		}
		.task(id: "\(symbol):\(range):\(portfolio.demo)") {
			// The range this task was started for - read again after the wait, a quick pill switch would file this
			// range's line under the next one.
			let forRange = range
			guard !portfolio.demo, charts[forRange] == nil else { return }
			guard let state = await PickChart.load(symbol, range: forRange), !Task.isCancelled else { return }
			charts[forRange] = state
		}
	}

	/// "This week" and "vs the market" as shown: the demo's authored values, a real pick's from its week of closes
	/// ("—", muted, until they're read).
	private func weekStats(_ pick: PickSpec) -> (gain: String, gainColor: Color, versus: String, versusColor: Color) {
		if portfolio.demo { return (pick.weekGain, Sim.green, pick.vsMarket, pick.ahead ? Sim.green : Sim.red) }
		let price = PaperPortfolio.amount(pick.priceNow)
		let shares = Double(pick.shares) ?? 0
		var gainText = "—", gainColor = Sim.muted, versusText = "—", versusColor = Sim.muted
		if let closes = weekCloses, let first = closes.first, let last = closes.last, first > 0 {
			let gain = (price - first) * shares
			gainText = PaperPortfolio.signedMoney(gain)
			gainColor = gain > -0.005 ? Sim.green : Sim.red
			if let spy = spyWeekPct {
				let versus = (last - first) / first * 100 - spy
				versusText = abs(versus) < 0.05 ? "Even" : PaperPortfolio.signedPct(versus)
				versusColor = versus > -0.05 ? Sim.green : Sim.red
			}
		}
		return (gainText, gainColor, versusText, versusColor)
	}

	/// The demo keeps its authored line - it has no live price behind its numbers. A real pick draws its own stock's
	/// price history, never a shape scaled from its gain (which isn't a price history and would read as one).
	@ViewBuilder
	private func chart(_ u: CGFloat) -> some View {
		if portfolio.demo {
			RangeLineChart(range: range, tint: Sim.teal, authored: "SimChartLine", width: 343 * u, height: 73.5 * u)
		} else {
			ZStack {
				switch charts[range] {
				case .line(let closes):
					SeriesLine(series: chartFractions(closes), tint: Sim.teal)
				case .noMovementYet:
					Text("Not much movement yet today").font(StakFont.geist(11 * u)).foregroundStyle(Sim.faint)
				case nil:
					Text("No history yet").font(StakFont.geist(11 * u)).foregroundStyle(Sim.faint)
				}
			}
			.frame(width: 343 * u, height: 73.5 * u)
		}
	}
}

/// What Pick detail's chart has for a range: a real line, or "nothing much yet" - the regular session hasn't opened,
/// so a 1D line would read as a move that hasn't happened.
enum PickChart: Equatable {
	case line([Double])
	case noMovementYet

	/// The stock's own closes for `range`; nil while there's nothing to show (a failed request, or under two points).
	static func load(_ symbol: String, range: String) async -> PickChart? {
		guard let prices = (try? await StockRepository.shared.getChart(symbol, range: range.lowercased()))?.prices.filter({ $0.close > 0 }),
			  prices.count >= 2 else { return nil }
		if range == "1D" && allPreMarket(prices) { return .noMovementYet }
		return .line(prices.map(\.close))
	}
}

private struct StatBox: View {
	let label: String
	let value: String
	let valueColor: Color

	var body: some View {
		let u = figmaUnit
		// 1:4675 cell (exact-design audit 2026-09-04): r14, label Geist 10 #819abb, value
		// Geist Regular 14 - was r12 / #5c6b85 / Sora SemiBold 15.
		VStack(alignment: .leading, spacing: 4 * u) {
			Text(label)
				.font(StakFont.geist(10 * u))
				.foregroundStyle(Sim.muted)
				.frame(height: 13 * u * typeScale) // Authored 10/13 line box — pin so the cell sums to 35
			// One line: a value too wide wrapped and had its second line clipped ("Even with the").
			Text(value)
				.font(StakFont.geist(14 * u))
				.foregroundStyle(valueColor)
				.lineLimit(1)
				.truncationMode(.tail)
				.frame(height: 18 * u * typeScale) // Authored 14/18 line box
		}
		.padding(.horizontal, 14 * u)
		.padding(.vertical, 13 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.frame(minHeight: 61 * u * typeScale, alignment: .top)
		.accessibilityElement(children: .combine)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
	}
}
