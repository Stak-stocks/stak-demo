import SwiftUI

/// The Portfolio page's Open orders and Trade history (FigJam Simulate board,
/// 2026-09-14: Buy order -> Market or limit; Trade history -> Trade log, Filter).
/// Both borrow the SOLD · REALIZED kicker and row language (1:4605 / 1:4607).
/// Mirrors android ui/simulate/TradeHistory.kt.
struct PortfolioKicker: View {
	let text: String

	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(10 * u, .medium))
			.tracking(0.9 * u)
			.foregroundStyle(Sim.faint)
			.frame(height: 17 * u, alignment: .bottom)
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.leading, 2 * u)
	}
}

/// Limit orders waiting for their price, each with Cancel (releases the reserved stake).
struct OpenOrdersSection: View {
	@ObservedObject private var portfolio = PaperPortfolio.shared

	var body: some View {
		let u = figmaUnit
		if !portfolio.openOrders.isEmpty {
			PortfolioKicker(text: "OPEN ORDERS")
			ForEach(portfolio.openOrders) { o in
				HStack(spacing: 12 * u) {
					ZStack {
						Circle().fill(Sim.chipBg)
						Text(o.badge)
							.font(StakFont.sora(14 * u, .semiBold))
							.foregroundStyle(Sim.badgeInk)
					}
					.frame(width: 36 * u, height: 36 * u)
					VStack(alignment: .leading, spacing: 2 * u) {
						Text("Buy \(o.symbol) · limit \(PaperPortfolio.money(o.limit))")
							.font(StakFont.sora(14 * u, .semiBold))
							.foregroundStyle(StakColors.textPrimary)
						Text("\(PaperPortfolio.money(o.amount)) reserved · placed \(o.day) · pending")
							.font(StakFont.geist(11 * u, .light))
							.foregroundStyle(Sim.muted)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					Button { portfolio.cancelOrder(o.id) } label: {
						Text("Cancel")
							.font(StakFont.sora(12 * u))
							.foregroundStyle(Sim.muted)
							.frame(width: 64 * u, height: 30 * u)
							.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Color(argb: 0x24FFFFFF), lineWidth: 1 * u))
					}
					.buttonStyle(.pressDim)
				}
			}
		}
	}
}

/// Every buy and sell, newest first, filtered by the All / Buys / Sells chips.
struct TradeHistorySection: View {
	@Binding var filter: Int
	@ObservedObject private var portfolio = PaperPortfolio.shared

	private var shown: [PaperPortfolio.Trade] {
		switch filter {
		case 1: return portfolio.trades.filter(\.isBuy)
		case 2: return portfolio.trades.filter { !$0.isBuy }
		default: return portfolio.trades
		}
	}

	var body: some View {
		let u = figmaUnit
		if !portfolio.trades.isEmpty {
			PortfolioKicker(text: "TRADE HISTORY")
			HStack(spacing: 8 * u) {
				ForEach(Array(["All", "Buys", "Sells"].enumerated()), id: \.offset) { i, label in
					SettingsChip(label: label, selected: filter == i) { filter = i }
				}
				Spacer()
			}
			if shown.isEmpty {
				Text(filter == 1 ? "No buys yet." : "No sells yet.")
					.font(StakFont.geist(11 * u))
					.foregroundStyle(Sim.faint)
			}
			ForEach(shown) { t in
				HStack(spacing: 12 * u) {
					ZStack {
						Circle().fill(Sim.chipBg)
						Text(t.badge)
							.font(StakFont.sora(14 * u, .semiBold))
							.foregroundStyle(Sim.badgeInk)
					}
					.frame(width: 36 * u, height: 36 * u)
					.opacity(0.7)
					VStack(alignment: .leading, spacing: 2 * u) {
						Text("\(t.isBuy ? "Bought" : "Sold") \(t.symbol)")
							.font(StakFont.sora(12 * u, .semiBold))
							.foregroundStyle(Sim.headerGray)
						Text("\(t.day) · \(PaperPortfolio.shares(t.shares)) sh at \(PaperPortfolio.money(t.price))")
							.font(StakFont.geist(10 * u, .light))
							.foregroundStyle(Sim.faint)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					Text((t.isBuy ? "-" : "+") + PaperPortfolio.money(t.amount))
						.font(StakFont.geist(14 * u))
						.foregroundStyle(t.isBuy ? Sim.headerGray : Sim.green)
				}
				.opacity(0.85)
			}
		}
	}
}
