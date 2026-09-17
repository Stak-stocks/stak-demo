import SwiftUI

/// One $100 paper pick served into the authored Pick detail template
/// (1:4631) and its sell sheets (1:4698 / 73:855). Codex parity audit
/// (2026-09-04): NVDA keeps the frame's literals byte for byte; the other
/// picks derive from the shared demo table - the same thing the Discover
/// deck does when "Learn more" serves the tapped stock. Mirrors android/
/// ui/simulate/PickDetailScreen.kt.
struct PickSpec: Codable {
	let symbol: String
	let badge: String
	/// The sell row's name - NVDA's authored "NVIDIA Corp" (1:4698).
	let company: String
	let priceNow: String
	let priceThen: String
	let pickedLine: String
	/// The hero figure split at the decimal (1:4654 sets the cents at 16/20).
	let gainWhole: String
	let gainCents: String
	/// "+$24.00" - the receipt's "(+$24.00)" tail (73:855).
	let gainSigned: String
	/// "24.0%" - unsigned; the subtitle reads up/down from `up`.
	let gainPct: String
	let up: Bool
	let shares: String
	let vsMarket: String
	let ahead: Bool
	/// The sell row's day move: the ticker's shared collection-tile change
	/// (NVDA's authored "▲ 2.4%" is its AI & Tech tile; TSLA's comes from
	/// NewsArticleFeed.stockFacts, whose $291.30 matches the table).
	let dayChange: String
	let dayUp: Bool
	/// Stake value now = $100 + gain: position value, returning, proceeds
	/// and returned on the sell sheets.
	let stakeValue: String
	/// Review (2026-09-04): the cost basis - "$100" for the authored picks,
	/// the ticket's stake for a bought one ("$25" / "$25.50"); the "on a
	/// $100 paper stake" / "from your $100 stake" lines read it. Declared
	/// after the authored fields with a default - memberwise order.
	var stakeBasis: String = "$100"
	/// Review (2026-09-04): the "This week" stat (1:4673) - the authored
	/// +$3.80 for the seeded picks, +$0.00 for a fresh buy. Declared last.
	var weekGain: String = "+$3.80"
}

enum PickSpecs {
	static let all: [PickSpec] = [
		// Figma frame 1:4631 verbatim.
		PickSpec(symbol: "NVDA", badge: "N", company: "NVIDIA Corp", priceNow: "$122.10", priceThen: "$98.50", pickedLine: "Picked May 8 at $98.50", gainWhole: "+$24", gainCents: ".00", gainSigned: "+$24.00", gainPct: "24.0%", up: true, shares: "1.0152", vsMarket: "+20.8% ahead", ahead: true, dayChange: "▲ 2.4%", dayUp: true, stakeValue: "$124.00"),
		PickSpec(symbol: "TSLA", badge: "T", company: "Tesla", priceNow: "$291.30", priceThen: "$246.86", pickedLine: "Picked Jun 3 at $246.86", gainWhole: "+$18", gainCents: ".00", gainSigned: "+$18.00", gainPct: "18.0%", up: true, shares: "0.4051", vsMarket: "+14.8% ahead", ahead: true, dayChange: "▼ 7.0%", dayUp: false, stakeValue: "$118.00"),
		PickSpec(symbol: "AMD", badge: "A", company: "AMD", priceNow: "$164.30", priceThen: "$148.02", pickedLine: "Picked May 29 at $148.02", gainWhole: "+$11", gainCents: ".00", gainSigned: "+$11.00", gainPct: "11.0%", up: true, shares: "0.6756", vsMarket: "+7.8% ahead", ahead: true, dayChange: "▲ 2.1%", dayUp: true, stakeValue: "$111.00"),
		PickSpec(symbol: "AAPL", badge: "A", company: "Apple", priceNow: "$229.35", priceThen: "$216.37", pickedLine: "Picked Apr 22 at $216.37", gainWhole: "+$6", gainCents: ".00", gainSigned: "+$6.00", gainPct: "6.0%", up: true, shares: "0.4622", vsMarket: "+2.8% ahead", ahead: true, dayChange: "▲ 1.2%", dayUp: true, stakeValue: "$106.00"),
		PickSpec(symbol: "JPM", badge: "J", company: "JPMorgan", priceNow: "$245.60", priceThen: "$240.78", pickedLine: "Picked Jun 20 at $240.78", gainWhole: "+$2", gainCents: ".00", gainSigned: "+$2.00", gainPct: "2.0%", up: true, shares: "0.4153", vsMarket: "-1.2% behind", ahead: false, dayChange: "▲ 0.6%", dayUp: true, stakeValue: "$102.00"),
		PickSpec(symbol: "MSFT", badge: "M", company: "Microsoft", priceNow: "$438.20", priceThen: "$451.75", pickedLine: "Picked Jun 26 at $451.75", gainWhole: "-$3", gainCents: ".00", gainSigned: "-$3.00", gainPct: "3.0%", up: false, shares: "0.2214", vsMarket: "-6.2% behind", ahead: false, dayChange: "▼ 0.4%", dayUp: false, stakeValue: "$97.00")
	]

	/// Unknown symbols serve the authored NVDA sample (all[0]).
	static func pick(_ symbol: String) -> PickSpec {
		all.first { $0.symbol == symbol } ?? all[0]
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

	/// The pick the sell flow is closing (nil = no sheet). Snapshotted at
	/// the Sell tap so the receipt (73:855) keeps showing the sold pick
	/// after PaperPortfolio drops it.
	@State private var selling: PickSpec? = nil
	/// The range pills select (user, 2026-09-05); "3M" keeps the authored SimChartLine (1:4631).
	@State private var range = "3M"
	@ObservedObject private var portfolio = PaperPortfolio.shared

	/// Codex audit (2026-09-04): the ledger's live spec (a bought pick, or
	/// an authored one topped up) - authored fallback for anything not held.
	private var pick: PickSpec { selling ?? portfolio.pickSpec(symbol) ?? PickSpecs.pick(symbol) }

	var body: some View {
		let u = figmaUnit
		ZStack {
			VStack(spacing: 0) {
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
					Text(pick.symbol)
						.font(StakFont.sora(16 * u, .semiBold))
						.foregroundStyle(Color.white)
					Spacer()
					ZStack {
						Circle().fill(Sim.cardBg)
						Image("IcNewsShare")
							.resizable()
							.frame(width: 18 * u, height: 18 * u) // 1:4652 icon/share is 18 (exact-design audit 2026-09-04)
					}
					.frame(width: 40 * u, height: 40 * u)
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
							.frame(height: 48 * u, alignment: .bottom)
							.padding(.top, 11 * u)
							// Review (2026-09-04): the pick's own cost basis ("$100" authored).
							Text("That is \(pick.up ? "up" : "down") \(pick.gainPct) on a \(pick.stakeBasis) paper stake")
								// 1:4662 (exact-design audit 2026-09-04): Geist Light, like the hero's all-time line.
								.font(StakFont.geist(12 * u, .light))
								.foregroundStyle(Sim.muted)
								.frame(height: 16 * u) // Authored line box is 16 — pin it so the card sums to 271
								.padding(.top, 11 * u)
							// Compose `requiredSize`: the line measures as the 314-wide content
							// row but draws its full 343x73.5, bleeding 14.5 past each side.
							Color.clear
								.frame(maxWidth: .infinity)
								.frame(height: 73.5 * u)
								.overlay(
									RangeLineChart(range: range, tint: Sim.teal, authored: "SimChartLine", width: 343 * u, height: 73.5 * u, move: PaperPortfolio.shared.demo ? nil : (Double(pick.gainPct.filter { $0.isNumber || $0 == "." }) ?? 0) * (pick.up ? 1 : -1))
								)
								.padding(.top, 11 * u)
							RangePills(selected: $range, tint: Sim.teal, muted: Sim.muted)
							.frame(maxWidth: .infinity)
							.padding(.top, 40 * u)
						}
						.padding(18 * u)
						.frame(maxWidth: .infinity, alignment: .leading)
						.frame(height: 307 * u, alignment: .top)
						// 1:4654 (exact-design audit 2026-09-04): the hero is r16 - the r24 was never authored.
						.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
						.clipShape(RoundedRectangle(cornerRadius: 16 * u))
						// Stats (1:4673): two 61-tall rows, 10 apart, 170-wide cells.
						VStack(alignment: .leading, spacing: 10 * u) {
							HStack(spacing: 10 * u) {
								// Review (2026-09-04): the pick's week move - the authored
								// +$3.80 for the seeded picks, +$0.00 for a fresh buy.
								StatBox(label: "This week", value: pick.weekGain, valueColor: Sim.green)
								StatBox(label: "vs the market", value: pick.vsMarket, valueColor: pick.ahead ? Sim.green : Sim.red)
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
									.frame(height: 51 * u)
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
								.frame(height: 52 * u)
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
				.frame(height: 13 * u) // Authored 10/13 line box — pin so the cell sums to 35
			Text(value)
				.font(StakFont.geist(14 * u))
				.foregroundStyle(valueColor)
				.frame(height: 18 * u) // Authored 14/18 line box
		}
		.padding(.horizontal, 14 * u)
		.padding(.vertical, 13 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.frame(height: 61 * u, alignment: .top)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
	}
}
