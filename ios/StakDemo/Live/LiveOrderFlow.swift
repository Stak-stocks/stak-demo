import SwiftUI

private enum OrderStage: String {
	case ticket, review, pending, filled, open
}

/// The live order ticket (FigJam "STAK · Go live to buy and sell": Stock Detail ·
/// Buy -> Account live? -> Order ticket (buy / sell) -> Order review -> Order
/// pending -> Order filled -> holdings update). A sheet over Stock Detail; the demo
/// market fills a market order after a moment, a limit under today's price stays
/// open on the account page. Mirrors android ui/live/LiveOrderFlow.kt.
struct LiveOrderFlow: View {
	let symbol: String
	let badge: String
	let name: String
	let price: Double
	let change: String
	let onClose: () -> Void
	let onViewAccount: () -> Void
	@ObservedObject private var account = LiveAccount.shared

	@State private var stage = OrderStage.ticket
	@State private var side = "BUY"
	@State private var amount = 25.0
	@State private var custom = false
	@State private var text = ""
	@State private var limitOn = false
	@State private var limitText = ""
	@State private var orderId = ""

	private var held: LiveHolding? { account.holding(symbol) }
	/// What can still be sold - the holding minus its pending sells (review 2026-09-14).
	private var heldValue: Double { account.availableShares(symbol) * price }
	private var limit: Double? { limitOn ? ((Double(limitText).flatMap { $0 > 0 ? $0 : nil }) ?? price) : nil }
	private var shares: Double { price > 0 ? amount / price : 0 }
	private var valid: Bool { amount > 0 && (side == "BUY" ? account.canBuy(amount) : amount <= heldValue + 0.005) }
	/// A buy limit under today's price or a sell limit over it waits as an open order.
	private var waits: Bool { limitOn && (side == "BUY" ? (limit ?? price) < price : (limit ?? price) > price) }

	var body: some View {
		LiveSheet(onDismiss: { if stage != .pending { onClose() } }) {
			Group {
				switch stage {
				case .ticket: ticket
				case .review: review
				case .pending: pending
				case .open: open
				case .filled: filled
				}
			}
		}
	}

	private func heading(_ text: String) -> some View {
		Text(text).font(StakFont.sora(18 * figmaUnit, .semiBold)).foregroundStyle(StakColors.textPrimary)
	}

	// MARK: - Stages

	private var ticket: some View {
		let u = figmaUnit
		let presets: [Double] = side == "BUY" ? [10, 25, 50, 100] : Array(Set([heldValue / 2, heldValue].map { ($0 * 100).rounded() / 100 })).sorted()
		return Group {
			heading(side == "BUY" ? "Buy \(symbol)" : "Sell \(symbol)")
			StockLine(badge: badge, symbol: symbol, name: name, price: price, change: change)
			LiveKicker(text: "REAL MONEY ORDER", color: Live.green)
			if let held {
				HStack(spacing: 8 * u) {
					SettingsChip(label: "Buy", selected: side == "BUY") { side = "BUY"; amount = 25; custom = false }
					SettingsChip(label: "Sell", selected: side == "SELL") { side = "SELL"; amount = min(25, heldValue); custom = false }
					Spacer()
				}
				LiveCaption(text: account.availableShares(symbol) < held.shares - 1e-9 ? "You hold \(LiveAccount.sharesText(held.shares)) sh; \(LiveAccount.sharesText(account.availableShares(symbol))) sh (\(LiveAccount.usd(heldValue))) are free to sell." : "You hold \(LiveAccount.sharesText(held.shares)) sh worth \(LiveAccount.usd(heldValue)).")
			}
			// Grouped: a ViewBuilder container takes ten children at most.
			Group {
				LiveRow(label: "Cash available", value: LiveAccount.usd(account.cash))
				AmountChips(presets: presets, selected: amount, onSelect: { amount = $0; custom = false }, customOn: custom, onCustom: { custom = true })
				if custom {
					AuthInput("Amount in USD", text: $text, keyboard: .decimalPad)
						.error(!valid && amount > 0 ? (side == "BUY" ? "More than your cash available" : "More than you hold") : nil)
						.onChange(of: text) { _, next in
							let clean = String(next.filter { $0.isNumber || $0 == "." }.prefix(9))
							if clean != next { text = clean }
							amount = Double(clean) ?? 0
						}
				}
			}
			orderType
			LiveRow(label: side == "BUY" ? "You get" : "You sell", value: "\(LiveAccount.sharesText(shares)) sh")
			AuthCta(text: "Review order", enabled: valid, action: { stage = .review })
			LiveSecondary(text: "Not now", action: onClose)
		}
	}

	private var orderType: some View {
		let u = figmaUnit
		return Group {
			HStack(spacing: 8 * u) {
				SettingsChip(label: "Market", selected: !limitOn) { limitOn = false }
				SettingsChip(label: "Limit", selected: limitOn) { limitOn = true }
				Spacer()
			}
			if limitOn {
				AuthInput("Limit price (today \(LiveAccount.usd(price)))", text: $limitText, keyboard: .decimalPad)
					.onChange(of: limitText) { _, next in
						let clean = String(next.filter { $0.isNumber || $0 == "." }.prefix(9))
						if clean != next { limitText = clean }
					}
				LiveCaption(text: !waits ? "Fills right away at today’s price - your limit is already met." : (side == "BUY" ? "Below today’s price: the order waits on your account until \(symbol) gets there." : "Above today’s price: the order waits on your account until \(symbol) gets there."))
			}
		}
	}

	private var review: some View {
		Group {
			heading("Review your order")
			StockLine(badge: badge, symbol: symbol, name: name, price: price, change: change)
			LiveRow(label: "Side", value: side == "BUY" ? "Buy" : "Sell")
			LiveRow(label: "Type", value: limitOn ? "Limit at \(LiveAccount.usd(limit ?? price))" : "Market")
			LiveRow(label: "Amount", value: LiveAccount.usd(amount))
			LiveRow(label: "Estimated shares", value: LiveAccount.sharesText(shares))
			LiveRow(label: side == "BUY" ? "Cash after" : "Cash after sale", value: LiveAccount.usd(side == "BUY" ? account.cash - amount : account.cash + amount))
			LiveCaption(text: "Real money. Prices move; a market order fills at the next available price. Not investment advice.")
			AuthCta(text: "Place order", action: {
				if let o = account.place(side: side, symbol: symbol, badge: badge, name: name, amount: amount, price: price, type: limitOn ? "limit" : "market", limit: limit) {
					orderId = o.id
					stage = waits ? .open : .pending
				}
			})
			LiveSecondary(text: "Back", action: { stage = .ticket })
		}
	}

	private var pending: some View {
		Group {
			heading("Order pending")
			StockLine(badge: badge, symbol: symbol, name: name, price: price, change: change)
			LiveStatusPill(status: "pending")
			LiveBody(text: "Sent to the market. This usually fills in seconds during trading hours.")
		}
		// The demo market fills after a moment (FigJam: Order pending -> Order filled).
		.afterDelay(orderId, millis: 2000) { account.fill(orderId); stage = .filled }
	}

	private var open: some View {
		Group {
			heading("Order placed")
			StockLine(badge: badge, symbol: symbol, name: name, price: price, change: change)
			LiveStatusPill(status: "pending")
			LiveBody(text: side == "BUY" ? "Waits for \(symbol) at \(LiveAccount.usd(limit ?? price)) or below. \(LiveAccount.usd(amount)) is reserved; cancel any time from your account." : "Waits for \(symbol) at \(LiveAccount.usd(limit ?? price)) or above. \(LiveAccount.sharesText(shares)) sh are set aside; cancel any time from your account.")
			AuthCta(text: "View account", action: onViewAccount)
			LiveSecondary(text: "Done", action: onClose)
		}
	}

	private var filled: some View {
		let nowHeld = account.holding(symbol)
		return Group {
			heading("Order filled")
			StockLine(badge: badge, symbol: symbol, name: name, price: price, change: change)
			LiveStatusPill(status: "filled")
			LiveRow(label: "Filled at", value: LiveAccount.usd(price))
			LiveRow(label: "You now hold", value: nowHeld.map { "\(LiveAccount.sharesText($0.shares)) sh" } ?? "0 sh")
			LiveRow(label: "Cash available", value: LiveAccount.usd(account.cash))
			AuthCta(text: "View account", action: onViewAccount)
			LiveSecondary(text: "Done", action: onClose)
		}
	}
}

private struct StockLine: View {
	let badge: String
	let symbol: String
	let name: String
	let price: Double
	let change: String

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 12 * u) {
			LiveBadge(letter: badge, size: 36)
			VStack(alignment: .leading, spacing: 0) {
				Text(symbol).font(StakFont.sora(14 * u, .semiBold)).foregroundStyle(StakColors.textPrimary)
				Text(name).font(StakFont.geist(11 * u)).foregroundStyle(Live.muted)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			VStack(alignment: .trailing, spacing: 0) {
				Text(LiveAccount.usd(price)).font(StakFont.geist(13 * u, .medium)).foregroundStyle(StakColors.textPrimary)
				Text(change).font(StakFont.geist(11 * u)).foregroundStyle(change.hasPrefix("▼") ? Live.red : Live.green)
			}
		}
		.padding(.vertical, 2 * u)
	}
}
