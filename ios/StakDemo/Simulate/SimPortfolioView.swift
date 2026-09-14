import SwiftUI

/// 07 · Simulate — "Final · Portfolio · paper" (CHINEDU 1:4496) with
/// the Sell NVDA? confirm (1:4698) and Position closed (73:855)
/// sheets. Ported from android/ ui/simulate/SimPortfolioScreen.kt.
/// Every metric is scaled by the 390pt artboard unit (`figmaUnit`),
/// exactly like the Android build's `u` scaling.
/// Codex audit (2026-09-04): the rows (SimPick) and the SOLD · REALIZED
/// list come from PaperPortfolio - a buy prepends a row, a sell moves it
/// down here.
struct SimPortfolioView: View {
	let onBack: () -> Void
	/// Codex parity audit (2026-09-04): every row / Sell pill opens ITS
	/// pick - the tapped ticker rides to PickDetailView(symbol:).
	let onOpenPick: (String) -> Void

	@State private var showSell = false
	@State private var showClosed = false
	// The authored chips now sort the rows (FigJam Simulate board, 2026-09-14):
	// Top gainers = biggest dollar gain first, Newest = the ledger's order (a
	// fresh buy sits at the top), Worst = smallest gain first.
	@State private var sortChip = 0
	@State private var historyChip = 0
	@ObservedObject private var portfolio = PaperPortfolio.shared

	private var sortedPositions: [PaperPortfolio.Position] {
		switch sortChip {
		case 0: return portfolio.positions.sorted { PaperPortfolio.amount($0.row.amount) > PaperPortfolio.amount($1.row.amount) }
		case 2: return portfolio.positions.sorted { PaperPortfolio.amount($0.row.amount) < PaperPortfolio.amount($1.row.amount) }
		default: return portfolio.positions
		}
	}

	var body: some View {
		let u = figmaUnit
		ZStack {
			VStack(spacing: 0) {
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
					Text("Your portfolio")
						.font(StakFont.sora(16 * u, .semiBold))
						.foregroundStyle(Color.white)
					Spacer()
					ZStack {
						Circle().fill(Sim.cardBg)
						Image("IcNewsShare")
							.resizable()
							.frame(width: 18 * u, height: 18 * u) // 1:4517 icon/share is 18 (exact-design audit 2026-09-04)
					}
					.frame(width: 40 * u, height: 40 * u)
				}
				.padding(.horizontal, 18 * u)
				.padding(.vertical, 8 * u)

				ScrollView(showsIndicators: false) {
					VStack(alignment: .leading, spacing: 16 * u) {
						// 1:4496 hides the Portfolio-value/$10,240/cash layers — the visible
						// summary is this one centred 158x32 box.
						// 1:4519 (exact-design audit 2026-09-04): a r13 OUTLINE in #181f30 (1px, no
						// fill) with the line inset 16 - was a filled r16 pill.
						// Authored copy (user, 2026-09-04 (CHINEDU 07 · Simulate 423:1007): the authored look wins).
						Text(PaperPortfolio.shared.demo ? "12 picks · +$240.00 all time" : "\(PaperPortfolio.shared.pickCountText) · \(PaperPortfolio.signedMoney(PaperPortfolio.shared.allTimeGain)) all time")
							.font(StakFont.geist(10 * u))
							.foregroundStyle(Sim.muted)
							.padding(.horizontal, 16 * u)
							.frame(width: 158 * u, height: 32 * u, alignment: .leading)
							.overlay(RoundedRectangle(cornerRadius: 13 * u).strokeBorder(Sim.cardBg, lineWidth: 1 * u))
							.frame(maxWidth: .infinity)
						if !portfolio.demo && portfolio.positions.isEmpty && portfolio.realized.isEmpty {
							// A first-time user's history before the first practice buy (audit 2026-09-07):
							// the Simulate home's empty card instead of empty chrome.
							EmptyStateCard(title: "No picks yet", text: "Your first practice buy lands here with its live gain.")
						} else {
							HStack(spacing: 8 * u) {
								FilterChip(label: "Top gainers", selected: sortChip == 0) { sortChip = 0 }
								FilterChip(label: "Newest", selected: sortChip == 1) { sortChip = 1 }
								FilterChip(label: "Worst", selected: sortChip == 2) { sortChip = 2 }
							}
							ForEach(sortedPositions) { position in
								let p = position.row
								PortfolioRow(
									badge: p.badge, ticker: p.ticker, sub: p.sub,
									amount: p.amount, pct: p.pct, up: p.up,
									action: { onOpenPick(p.ticker) },
									// Authored (1:4548 template): every Sell pill opens
									// the Pick detail of ITS ticker, Instant - the authored
									// sell flow lives there; this page's sheets stay unwired.
									trailing: { SellPill(action: { onOpenPick(p.ticker) }) },
									// 1:4539 (exact-design audit 2026-09-04): this page's picked line is Geist Light.
									subLight: true
								)
							}
							Text("SOLD · REALIZED")
								.font(StakFont.geist(10 * u, .medium))
								.tracking(0.9 * u)
								.foregroundStyle(Sim.faint)
								// 1:4605 gk (exact-design audit 2026-09-04): the kicker sits 4 below the box top (13 in a 17), not centred.
								.frame(height: 17 * u, alignment: .bottom)
								.frame(maxWidth: .infinity, alignment: .leading)
								.padding(.leading, 2 * u)
							ForEach(portfolio.realized) { r in
								RealizedRow(badge: r.badge, ticker: r.ticker, sub: r.sub, amount: r.amount, up: r.up)
							}
							Text("Sell a pick and the cash returns to your balance, gain or loss.")
								.font(StakFont.geist(11 * u))
								.stakLineHeight(14 * u, size: 11 * u, face: .geist)
								.foregroundStyle(Sim.faint)
								// 1:4621 (exact-design audit 2026-09-04): centre-aligned, so a wrap stays centred.
								.multilineTextAlignment(.center)
								.frame(maxWidth: .infinity)
						}
						// FigJam "Order pending -> cancel": a first-move limit order has no position or
						// realized row yet, so these live outside the empty-state branch (review
						// 2026-09-14). Both self-hide when empty.
						OpenOrdersSection()
						TradeHistorySection(filter: $historyChip)
					}
					.padding(.horizontal, 20 * u)
					.padding(.top, 6 * u)
					.padding(.bottom, 26 * u) // 1:4518 pb 26 (exact-design audit 2026-09-04)
				}
			}
			if showSell {
				SimSheet(onDismiss: { showSell = false }) {
					SellConfirmSheet(
						// Unwired on this page - the authored NVDA sample.
						pick: PickSpecs.pick("NVDA"),
						onConfirm: { _ in showSell = false; showClosed = true },
						onDismiss: { showSell = false }
					)
				}
			}
			if showClosed {
				SimSheet(onDismiss: { showClosed = false }) {
					PositionClosedSheet(
						pick: PickSpecs.pick("NVDA"),
						onBackToSimulate: { showClosed = false; onBack() },
						onViewPortfolio: { showClosed = false }
					)
				}
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}

private struct FilterChip: View {
	let label: String
	let selected: Bool
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(label)
				.font(StakFont.geist(12 * u, .medium))
				.foregroundStyle(selected ? Sim.teal : Sim.muted)
				.padding(.horizontal, 12 * u)
				.padding(.vertical, 6 * u)
				// Selected chip is fill-only (1:4519) — no teal hairline.
				.background(selected ? Sim.tealTint : Sim.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
		}
		.buttonStyle(.pressDim)
	}
}

/// 60x30 outlined Sell pill (1:4543) — transparent bg under a 1px white-14%
/// hairline, Sora 12 muted (exact-design audit 2026-09-04: was Sora Medium
/// #DCE7F7 under the sheets' 0.36 #343B4F).
private struct SellPill: View {
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text("Sell")
				.font(StakFont.sora(12 * u))
				.foregroundStyle(Sim.muted)
				.frame(width: 60 * u, height: 30 * u)
				.overlay(
					RoundedRectangle(cornerRadius: 6 * u)
						.strokeBorder(Color(argb: 0x24FFFFFF), lineWidth: 1 * u)
				)
		}
		.buttonStyle(.pressDim)
	}
}

private struct RealizedRow: View {
	let badge: String
	let ticker: String
	let sub: String
	let amount: String
	let up: Bool

	var body: some View {
		let u = figmaUnit
		// 1:4607 Banked (exact-design audit 2026-09-04): the whole row renders at 72%,
		// its badge at 55% inside that; ticker Sora SemiBold 12 #d3d3dd, sold line
		// Geist Light 10 #5c6b85, the banked figure Geist Regular 14 - the row used
		// to be drawn at full strength in the live rows' type.
		HStack(spacing: 12 * u) {
			ZStack {
				Circle().fill(Sim.chipBg)
				Text(badge)
					.font(StakFont.sora(14 * u, .semiBold))
					.foregroundStyle(Sim.badgeInk)
			}
			.frame(width: 36 * u, height: 36 * u)
			.opacity(0.55)
			VStack(alignment: .leading, spacing: 2 * u) {
				Text(ticker)
					.font(StakFont.sora(12 * u, .semiBold))
					.foregroundStyle(Sim.headerGray)
				Text(sub)
					.font(StakFont.geist(10 * u, .light))
					.foregroundStyle(Sim.faint)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			Text(amount)
				.font(StakFont.geist(14 * u))
				.foregroundStyle(up ? Sim.green : Sim.red)
		}
		.padding(.horizontal, 14 * u)
		.padding(.vertical, 12 * u)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
		.opacity(0.72)
	}
}

/// Shared sheet scaffold for the sell flow — scrim + r24 #181f30 sheet.
private struct SimSheet<Content: View>: View {
	let onDismiss: () -> Void
	@ViewBuilder let content: Content

	var body: some View {
		let u = figmaUnit
		ZStack(alignment: .bottom) {
			// Authored scrim: near-black at ~62%.
			Color(argb: 0x9E02050E)
				.ignoresSafeArea()
				.onTapGesture(perform: onDismiss)
			VStack(spacing: 0) {
				// Handle at y10–14, content at y32 → 18 below the rect.
				RoundedRectangle(cornerRadius: 2 * u)
					.fill(Sim.track)
					.frame(width: 40 * u, height: 4 * u)
					.padding(.bottom, 18 * u)
				content
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 10 * u)
			// Authored 30 to the screen edge — no extra home-indicator inset.
			.padding(.bottom, 30 * u)
			.frame(maxWidth: .infinity)
			.background(Sim.cardBg, in: UnevenRoundedRectangle(topLeadingRadius: 24 * u, topTrailingRadius: 24 * u))
			.ignoresSafeArea(edges: .bottom)
		}
	}
}

/// The pick's row on the sell sheets — teal-tinted, badge + price + change.
/// Authored as the NVDA row (1:4698); Codex parity audit (2026-09-04):
/// serves the tapped pick (PickSpec) into the same row.
private struct PickSellRow: View {
	let pick: PickSpec

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 11 * u) {
			ZStack {
				Circle().fill(Sim.chipBg)
				Text(pick.badge)
					.font(StakFont.sora(15 * u, .semiBold))
					.foregroundStyle(Sim.badgeInk)
			}
			.frame(width: 38 * u, height: 38 * u)
			VStack(alignment: .leading, spacing: 2 * u) {
				Text(pick.company)
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(Color.white)
				Text("\(pick.priceNow) today")
					.font(StakFont.geist(10 * u))
					.foregroundStyle(Sim.muted)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			Text(pick.dayChange)
				.font(StakFont.geist(12 * u, .medium))
				.foregroundStyle(pick.dayUp ? Sim.green : Sim.red)
		}
		.padding(.horizontal, 14 * u)
		.padding(.vertical, 12 * u)
		.background(Sim.tealTint, in: RoundedRectangle(cornerRadius: 6 * u))
	}
}

/// "Sell NVDA?" confirm ticket (1:4698) — content only; its host (the
/// SellFlowHost morph or a bare SimSheet) provides scrim + sheet.
struct SellConfirmSheet: View {
	/// The pick being sold - NVDA renders the frame's literals verbatim.
	let pick: PickSpec
	let onConfirm: (Double) -> Void
	let onDismiss: () -> Void

	@State private var mode = 0
	@State private var customText = ""

	private var positionValue: Double { PaperPortfolio.amount(pick.stakeValue) }

	/// Half / Custom sell a slice of the position (Codex review, PR #167): the chips
	/// pick the portion; Custom takes a dollar amount up to the position value.
	private var portion: Double {
		switch mode {
		case 0: return 1
		case 1: return 0.5
		default:
			let raw = customText.replacingOccurrences(of: "$", with: "").replacingOccurrences(of: ",", with: "")
			guard let value = Double(raw), value > 0, positionValue > 0, value <= positionValue else { return 0 }
			return value / positionValue
		}
	}

	var body: some View {
		let u = figmaUnit
		Group {
			VStack(alignment: .leading, spacing: 14 * u) {
				Text("Sell \(pick.symbol)?")
					.font(StakFont.sora(18 * u, .semiBold))
					.foregroundStyle(Color.white)
				PickSellRow(pick: pick)
				// Review (2026-09-04): the pick's own cost basis ("$100" authored).
				Text("You hold \(pick.shares) shares from your \(pick.stakeBasis) stake.")
					.font(StakFont.geist(12 * u))
					.stakLineHeight(18 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Sim.body)
				// 1:4846 Practice ticket (exact-design audit 2026-09-04): the value line, the
				// quick amounts and the Returning line sit 12 apart inside the sheet's 14 rhythm.
				VStack(alignment: .leading, spacing: 12 * u) {
					HStack(spacing: 6 * u) {
						Text("Position value")
							.font(StakFont.geist(12 * u))
							.foregroundStyle(Sim.muted)
						Text(pick.stakeValue)
							.font(StakFont.geist(12 * u, .medium))
							.foregroundStyle(Sim.bright)
					}
					HStack(spacing: 8 * u) {
						ForEach(Array(["All", "Half", "Custom"].enumerated()), id: \.offset) { i, label in
							let sel = i == mode
							Button { mode = i } label: {
								Text(label)
									.font(StakFont.geist(12 * u, .medium))
									.foregroundStyle(sel ? Color(argb: 0xFFA6E4F7) : Color(argb: 0xFFDCE7F7))
									.frame(maxWidth: .infinity)
									.padding(.vertical, 8 * u)
									// 1:4853 (exact-design audit 2026-09-04): the sell chips are r6 - the buy ticket's r10 had been carried over.
									.background(
										sel ? Color(argb: 0xFF0F2A38) : Color(argb: 0xFF0B1430),
										in: RoundedRectangle(cornerRadius: 6 * u)
									)
									.overlay(
										RoundedRectangle(cornerRadius: 6 * u)
											.strokeBorder(
												sel ? Color(argb: 0xFF5DA8BF) : Color(argb: 0x1FFFFFFF),
												lineWidth: (sel ? 0.5 : 1) * u
											)
									)
							}
							.buttonStyle(.pressDim)
						}
					}
					if mode == 2 {
						// Custom borrows the chip chrome; a value > 0 and within the position value drives the sell.
						HStack(spacing: 4 * u) {
							Text("$")
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(Color(argb: 0xFFDCE7F7))
							TextField("0.00", text: $customText)
								.keyboardType(.decimalPad)
								.onChange(of: customText) { _, new in
									let clean = String(new.filter { $0.isNumber || $0 == "." }.prefix(9))
									if clean != new { customText = clean }
								}
								.textFieldStyle(.plain)
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(Color(argb: 0xFFDCE7F7))
						}
						.padding(.horizontal, 12 * u)
						.padding(.vertical, 8 * u)
						.background(Color(argb: 0xFF0B1430), in: RoundedRectangle(cornerRadius: 6 * u))
						.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Color(argb: 0xFF5DA8BF), lineWidth: 0.5 * u))
					}
					// 1:4861 (exact-design audit 2026-09-04): the three runs share one baseline.
					HStack(alignment: .firstTextBaseline, spacing: 6 * u) {
						Spacer()
						Text("Returning")
							.font(StakFont.geist(12 * u))
							.foregroundStyle(Sim.muted)
						Text(PaperPortfolio.money(positionValue * portion))
							.font(StakFont.sora(15 * u, .semiBold))
							.foregroundStyle(Sim.bright)
						Text("to your cash")
							.font(StakFont.geist(12 * u))
							.foregroundStyle(Sim.muted)
						Spacer()
					}
				}
				VStack(spacing: 16 * u) {
					// 1:4866 (exact-design audit 2026-09-04): #12203e, 51 tall, under the 0.361 CTA
					// hairline and the 4% teal wash; the label is Sora Regular 14 (was Geist Medium, 52, no hairline).
					Button(action: { if portion > 0 { onConfirm(portion) } }) {
						Text("Confirm sell")
							.font(StakFont.sora(14 * u))
							.foregroundStyle(Color.white)
							.frame(maxWidth: .infinity)
							.frame(height: 51 * u)
							.background(Sim.darkCta, in: RoundedRectangle(cornerRadius: 6 * u))
							.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Sim.ctaBorder, lineWidth: 0.361 * u))
							.tealShadow(dy: 12.285, blur: 12.285, alpha: 0.04)
					}
					.buttonStyle(.pressDim)
					SimSheetSecondary(text: "Back", action: onDismiss)
				}
			}
		}
	}
}

/// h52 secondary button used inside the sell sheets — the app's 0.36
/// hairline only (1:4868 / 73:1025, exact-design audit 2026-09-04: the 4%
/// white fill was never authored).
private struct SimSheetSecondary: View {
	let text: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
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
}

/// "Position closed" receipt (73:855) — content only; its host (the
/// SellFlowHost morph or a bare SimSheet) provides scrim + sheet.
struct PositionClosedSheet: View {
	/// The pick just sold - NVDA renders the frame's literals verbatim.
	let pick: PickSpec
	/// False after a partial sell - the receipt reads "Position reduced" (PR #167). Declared before the closures with a default - memberwise order.
	var full: Bool = true
	let onBackToSimulate: () -> Void
	let onViewPortfolio: () -> Void

	var body: some View {
		let u = figmaUnit
		Group {
			VStack(spacing: 14 * u) {
				Image("IcSheetCheck")
					.resizable()
					.frame(width: 47 * u, height: 47 * u)
				Text(full ? "Position closed" : "Position reduced")
					.font(StakFont.sora(18 * u, .semiBold))
					.foregroundStyle(Color.white)
				PickSellRow(pick: pick)
				Text("Sold \(pick.shares) shares from your \(pick.stakeBasis) stake.")
					.font(StakFont.geist(12 * u))
					.stakLineHeight(18 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Sim.body)
					.frame(maxWidth: .infinity, alignment: .leading)
				// 73:1003 Practice ticket (exact-design audit 2026-09-04): Proceeds and the Returned line sit 12 apart.
				VStack(alignment: .leading, spacing: 12 * u) {
					HStack(spacing: 6 * u) {
						Text("Proceeds")
							.font(StakFont.geist(12 * u))
							.foregroundStyle(Sim.muted)
						Text(pick.stakeValue)
							// 73:1006 (exact-design audit 2026-09-04): the proceeds figure is Sora SemiBold 12 - was Geist Medium.
							.font(StakFont.sora(12 * u, .semiBold))
							.foregroundStyle(Sim.bright)
						Spacer()
					}
					// 73:1018 centres the Returned line on one baseline (Proceeds above stays left-aligned).
					HStack(alignment: .firstTextBaseline, spacing: 6 * u) {
						Spacer()
						Text("Returned")
							.font(StakFont.geist(12 * u))
							.foregroundStyle(Sim.muted)
						Text(pick.stakeValue)
							.font(StakFont.sora(15 * u, .semiBold))
							.foregroundStyle(Sim.bright)
						Text("to your cash (\(pick.gainSigned))")
							.font(StakFont.geist(12 * u))
							.foregroundStyle(Sim.muted)
						Spacer()
					}
				}
				VStack(spacing: 16 * u) {
					Button(action: onBackToSimulate) {
						Text("Back to Simulate")
							.font(StakFont.geist(14 * u, .medium))
							.foregroundStyle(Color.white)
							.frame(maxWidth: .infinity)
							.frame(height: 52 * u)
							.background(discCtaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
							.overlay(
								RoundedRectangle(cornerRadius: 6 * u)
									.strokeBorder(Sim.ctaBorder, lineWidth: 0.361 * u)
							)
							// 73:1023 (exact-design audit 2026-09-04): the authored shadow stack is the 1% (dy
							// 49.86, blur 19.51) and 3% (dy 28.18, blur 16.62) teal layers - not the deck CTA's 9% at 12.28.
							.tealShadow(dy: 28.183, blur: 16.62, alpha: 0.03)
							.tealShadow(dy: 49.862, blur: 19.512, alpha: 0.01)
					}
					.buttonStyle(.pressDim)
					SimSheetSecondary(text: "View portfolio", action: onViewPortfolio)
				}
			}
		}
	}
}

/// Sell → Position-closed flow, reused by the pick detail. Authored
/// SMART_ANIMATE 350 (1:4698 -> 73:855): ONE sheet stays put while the
/// confirm cross-fades into the receipt and the height eases along.
struct SellFlowHost: View {
	/// The pick this flow sells (PickDetailView's tapped symbol).
	let pick: PickSpec
	let onClose: () -> Void
	/// Authored exits for the receipt CTAs (73:855); nil falls back to onClose.
	var onBackToSimulate: (() -> Void)? = nil
	var onViewPortfolio: (() -> Void)? = nil

	@State private var closed = false
	/// The slice that was sold - the receipt shows it (PR #167).
	@State private var soldPortion = 1.0

	var body: some View {
		SimSheet(onDismiss: {
			if closed { (onViewPortfolio ?? onClose)() } else { onClose() }
		}) {
			ZStack(alignment: .top) {
				if !closed {
					// Codex audit (2026-09-04): the confirm closes the position in
					// PaperPortfolio exactly once - here, where the receipt appears.
					// Review (2026-09-04): the receipt only follows a real sell.
					SellConfirmSheet(pick: pick, onConfirm: { portion in guard !closed else { return }; if PaperPortfolio.shared.sell(pick.symbol, portion: portion) { soldPortion = portion; closed = true } }, onDismiss: onClose)
						.transition(.opacity)
				} else {
					PositionClosedSheet(
						pick: pick.scaled(soldPortion),
						full: soldPortion >= 0.999,
						onBackToSimulate: onBackToSimulate ?? onClose,
						onViewPortfolio: onViewPortfolio ?? onClose
					)
					.transition(.opacity)
				}
			}
			.animation(.easeOut(duration: 0.35), value: closed)
		}
	}
}
