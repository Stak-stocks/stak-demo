import SwiftUI

/// The instant withdrawal's fee - one figure for the label, the row and the confirmation.
private let instantFee = 0.015

/// The account page's modes: the home, the deposit steps and the withdrawal steps (FigJam: Fund account, Withdraw).
private enum AccountMode: String {
	case home, deposit, depositProcessing, depositDone, withdrawAmount, withdrawMethod, withdrawDone
}

/// Account home (FigJam "STAK · Go live to buy and sell": Real money ON -> Account
/// home; holdings update as orders fill) with the board's Fund account (Link,
/// Amount, Confirmation) and Withdraw (Amount, Method, Confirmation) steps. Trading
/// itself happens from Stock Detail's Buy - the page points there. Mirrors android
/// ui/live/LiveAccountScreen.kt.
struct LiveAccountView: View {
	let onBack: () -> Void
	let onFindStock: () -> Void
	let onOpenStock: (String) -> Void
	@ObservedObject private var account = LiveAccount.shared

	@State private var mode = AccountMode.home
	@State private var amount = 100.0
	@State private var custom = false
	@State private var text = ""
	@State private var txId = ""
	@State private var method = 0

	/// One exit for the pages whose settle effect their own exits would otherwise cancel
	/// (review 2026-09-14); settle is a no-op once the transaction has landed.
	private func leave() { account.settle(txId); mode = .home }

	private func back() {
		switch mode {
		case .home: onBack()
		case .withdrawMethod: mode = .withdrawAmount
		case .depositProcessing, .withdrawDone: leave()
		default: mode = .home
		}
	}

	private var title: String {
		switch mode {
		case .home: return "Your account"
		case .deposit, .depositProcessing, .depositDone: return "Add funds"
		default: return "Withdraw"
		}
	}

	var body: some View {
		LivePage(title: title, onBack: back) {
			Group {
				switch mode {
				case .home: home
				case .deposit: depositStep
				case .depositProcessing: depositProcessing
				case .depositDone: depositDone
				case .withdrawAmount: withdrawAmount
				case .withdrawMethod: withdrawMethod
				case .withdrawDone: withdrawDone
				}
			}
		}
		// The demo market fills any order still pending when the page opens (fill keeps a waiting
		// limit open), and any deposit or withdrawal left processing lands (review 2026-09-14).
		.afterDelay("fills", millis: 1500) {
			account.fillPending()
			account.settleProcessing()
		}
	}

	// MARK: - Home

	private var home: some View {
		let u = figmaUnit
		return Group {
			LiveCard {
				LiveKicker(text: "REAL MONEY", color: Live.green)
				Text(LiveAccount.usd(account.accountValue)).font(StakFont.sora(28 * u, .semiBold)).foregroundStyle(StakColors.textPrimary)
				LiveRow(label: "Cash available", value: LiveAccount.usd(account.cash))
				LiveRow(label: "In stocks", value: LiveAccount.usd(account.holdingsValue))
				if account.pendingBuyCash > 0 {
					LiveRow(label: "Reserved for pending buys", value: LiveAccount.usd(account.pendingBuyCash), valueColor: Live.amber)
				}
				HStack(spacing: 10 * u) {
					LiveSecondary(text: "Add funds") { custom = false; amount = 100; mode = .deposit }
					LiveSecondary(text: "Withdraw") { custom = false; amount = min(50, account.cash); text = ""; mode = .withdrawAmount }
				}
				.padding(.top, 6 * u)
			}
			holdingsCard
			if !account.orders.isEmpty { ordersCard }
			if !account.transactions.isEmpty { transactionsCard }
			LiveCaption(text: "Practice trading stays in Simulate. Linked: \(account.bankName) ••\(account.bankLast4).")
		}
	}

	private var holdingsCard: some View {
		let u = figmaUnit
		return LiveCard {
			LiveKicker(text: "HOLDINGS")
			if account.holdings.isEmpty {
				LiveBody(text: "Nothing yet. Open a stock and tap Buy - the order ticket uses this account.")
				Button(action: onFindStock) {
					Text("Find a stock ›").font(StakFont.geist(13 * u, .medium)).foregroundStyle(Live.teal)
				}
				.buttonStyle(.pressDim)
			} else {
				ForEach(account.holdings) { h in
					Button { onOpenStock(h.symbol) } label: {
						HStack(spacing: 12 * u) {
							LiveBadge(letter: h.badge)
							VStack(alignment: .leading, spacing: 0) {
								Text(h.symbol).font(StakFont.geist(13 * u, .medium)).foregroundStyle(StakColors.textPrimary)
								Text("\(LiveAccount.sharesText(h.shares)) sh · avg \(LiveAccount.usd(h.avgPrice))").font(StakFont.geist(11 * u)).foregroundStyle(Live.muted)
							}
							.frame(maxWidth: .infinity, alignment: .leading)
							Text(LiveAccount.usd(h.value)).font(StakFont.geist(13 * u, .medium)).foregroundStyle(StakColors.textPrimary)
						}
						.frame(height: 52 * u)
						.contentShape(Rectangle())
					}
					.buttonStyle(.pressDim)
				}
			}
		}
	}

	private var ordersCard: some View {
		let u = figmaUnit
		return LiveCard {
			LiveKicker(text: "ORDERS")
			ForEach(account.orders) { o in
				HStack(spacing: 12 * u) {
					LiveBadge(letter: o.badge)
					VStack(alignment: .leading, spacing: 0) {
						Text("\(o.isBuy ? "Buy" : "Sell") \(o.symbol) · \(LiveAccount.usd(o.amount))").font(StakFont.geist(13 * u, .medium)).foregroundStyle(StakColors.textPrimary)
						Text("\(o.day) · \(o.type == "limit" ? "limit \(LiveAccount.usd(o.limit ?? o.price))" : "market") · \(LiveAccount.sharesText(o.shares)) sh").font(StakFont.geist(11 * u)).foregroundStyle(Live.muted)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					LiveStatusPill(status: o.status)
					if o.status == "pending" {
						Button { account.cancel(o.id) } label: {
							Text("Cancel").font(StakFont.geist(12 * u, .medium)).foregroundStyle(Live.muted)
						}
						.buttonStyle(.pressDim)
					}
				}
				.frame(height: 52 * u)
			}
		}
	}

	private var transactionsCard: some View {
		let u = figmaUnit
		return LiveCard {
			LiveKicker(text: "TRANSACTIONS")
			ForEach(account.transactions) { t in
				HStack {
					VStack(alignment: .leading, spacing: 0) {
						Text(t.isDeposit ? "Deposit" : "Withdrawal").font(StakFont.geist(13 * u, .medium)).foregroundStyle(StakColors.textPrimary)
						Text("\(t.day) · \(t.method)").font(StakFont.geist(11 * u)).foregroundStyle(Live.muted)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					Text((t.isDeposit ? "+" : "-") + LiveAccount.usd(t.amount))
						.font(StakFont.geist(13 * u, .medium))
						.foregroundStyle(t.isDeposit ? Live.green : StakColors.textPrimary)
						.padding(.trailing, 10 * u)
					LiveStatusPill(status: t.status)
				}
				.frame(height: 44 * u)
			}
		}
	}

	// MARK: - Deposit

	private var amountField: some View {
		AuthInput("Amount in USD", text: $text, keyboard: .decimalPad)
			.error(mode == .withdrawAmount && amount > account.cash ? "More than your cash available" : nil)
			.onChange(of: text) { _, next in
				let clean = String(next.filter { $0.isNumber || $0 == "." }.prefix(9))
				if clean != next { text = clean }
				amount = Double(clean) ?? 0
			}
	}

	private var depositStep: some View {
		Group {
			LiveCard {
				LiveKicker(text: "AMOUNT")
				LiveTitle(text: "Add funds")
				LiveBody(text: "From \(account.bankName) ••\(account.bankLast4).")
			}
			AmountChips(presets: [50, 100, 500], selected: amount, onSelect: { amount = $0; custom = false }, customOn: custom, onCustom: { custom = true; amount = Double(text) ?? 0 })
			if custom { amountField }
			LiveRow(label: "You add", value: LiveAccount.usd(amount))
			AuthCta(text: "Confirm deposit", enabled: amount > 0, action: { txId = account.deposit(amount); mode = .depositProcessing })
		}
	}

	private var depositProcessing: some View {
		LiveCard {
			LiveKicker(text: "PROCESSING", color: Live.amber)
			LiveTitle(text: "Moving \(LiveAccount.usd(amount))")
			LiveBody(text: "Your bank is sending the money. Cash shows as available the moment it lands.")
		}
		.afterDelay(txId, millis: 2000) { account.settle(txId); mode = .depositDone }
	}

	private var depositDone: some View {
		Group {
			LiveCard {
				LiveKicker(text: "CONFIRMED", color: Live.green)
				LiveTitle(text: "\(LiveAccount.usd(amount)) added")
				LiveBody(text: "Cash available is now \(LiveAccount.usd(account.cash)).")
			}
			AuthCta(text: "Done", action: { mode = .home })
		}
	}

	// MARK: - Withdraw

	private var withdrawAmount: some View {
		Group {
			LiveCard {
				LiveKicker(text: "AMOUNT")
				LiveTitle(text: "Withdraw")
				LiveBody(text: "Up to \(LiveAccount.usd(account.cash)) of cash. Money in stocks has to be sold first.")
			}
			AmountChips(presets: [25, 50, 100].filter { $0 <= account.cash }, selected: amount, onSelect: { amount = $0; custom = false }, customOn: custom, onCustom: { custom = true; amount = Double(text) ?? 0 })
			if custom { amountField }
			LiveRow(label: "You withdraw", value: LiveAccount.usd(amount))
			AuthCta(text: "Continue", enabled: amount > 0 && amount <= account.cash, action: { mode = .withdrawMethod })
		}
	}

	private var withdrawMethod: some View {
		let u = figmaUnit
		let methods = ["Standard · \(account.bankName) ••\(account.bankLast4) · free", "Instant · debit card · \(String(format: "%.1f", instantFee * 100))% fee"]
		return Group {
			LiveCard {
				LiveKicker(text: "METHOD")
				LiveTitle(text: "Where to send it")
				LiveBody(text: "Standard transfers are free and take 1–3 business days; instant goes to your debit card in minutes for a small fee.")
			}
			HStack(spacing: 8 * u) {
				SettingsChip(label: "Standard", selected: method == 0) { method = 0 }
				SettingsChip(label: "Instant", selected: method == 1) { method = 1 }
				Spacer()
			}
			LiveCaption(text: methods[method])
			if method == 1 { LiveRow(label: "Instant fee", value: "-" + LiveAccount.usd(amount * instantFee)) }
			LiveRow(label: "You receive", value: LiveAccount.usd(method == 1 ? amount * (1 - instantFee) : amount))
			AuthCta(text: "Confirm withdrawal", action: {
				if let id = account.withdraw(amount, method: method == 1 ? "Instant · debit card" : "Standard · \(account.bankName) ••\(account.bankLast4)") {
					txId = id
					mode = .withdrawDone
				}
			})
		}
	}

	private var withdrawDone: some View {
		Group {
			LiveCard {
				LiveKicker(text: "CONFIRMED", color: Live.green)
				// Instant quotes the net figure; the gross left the account (review 2026-09-14).
				LiveTitle(text: "\(LiveAccount.usd(method == 1 ? amount * (1 - instantFee) : amount)) on its way")
				LiveBody(text: method == 1 ? "Your debit card should have it in minutes. \(LiveAccount.usd(amount)) left your account, \(LiveAccount.usd(amount * instantFee)) of it the instant fee." : "Expect it at \(account.bankName) in 1–3 business days.")
			}
			AuthCta(text: "Done", action: leave)
		}
		.afterDelay(txId, millis: 2500) { account.settle(txId) }
	}
}
