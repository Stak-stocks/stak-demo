package com.stak.demo.ui.live

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.AuthCta
import com.stak.demo.ui.onboarding.AuthInput
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.profile.SettingsChip
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora

/** The instant withdrawal's fee - one figure for the label, the row and the confirmation. */
private const val INSTANT_FEE = 0.015

/** The account page's modes: the home, the deposit steps and the withdrawal steps (FigJam: Fund account, Withdraw). */
private object Mode {
	const val HOME = "home"
	const val DEPOSIT = "deposit"
	const val DEPOSIT_PROCESSING = "deposit_processing"
	const val DEPOSIT_DONE = "deposit_done"
	const val WITHDRAW_AMOUNT = "withdraw_amount"
	const val WITHDRAW_METHOD = "withdraw_method"
	const val WITHDRAW_DONE = "withdraw_done"
}

/**
 * Account home (FigJam "STAK · Go live to buy and sell": Real money ON -> Account
 * home; holdings update as orders fill) with the board's Fund account (Link,
 * Amount, Confirmation) and Withdraw (Amount, Method, Confirmation) steps.
 * Trading itself happens from Stock Detail's Buy - the page points there.
 * Mirrors ios Live/LiveAccountView.swift.
 */
@Composable
internal fun LiveAccountScreen(onBack: () -> Unit, onFindStock: () -> Unit, onOpenStock: (String) -> Unit) {
	val u = figmaUnit()
	var mode by rememberSaveable { mutableStateOf(Mode.HOME) }
	var amount by rememberSaveable { mutableStateOf(100.0) }
	var custom by rememberSaveable { mutableStateOf(false) }
	var text by rememberSaveable { mutableStateOf("") }
	var txId by rememberSaveable { mutableStateOf("") }
	var method by rememberSaveable { mutableStateOf(0) }

	// The demo market catches up when the page opens: every pending order gets its fill chance
	// (waiting limits stay open) and anything left processing by an interrupted page lands (review 2026-09-14).
	AfterDelay(key = "fills", millis = 1500) {
		LiveAccount.fillPending()
		LiveAccount.settleProcessing()
	}

	// Leaving a page that owns a settle timer lands the transaction now - the wait is cosmetic.
	val leave: () -> Unit = { LiveAccount.settle(txId); mode = Mode.HOME }
	val back: () -> Unit = {
		when (mode) {
			Mode.HOME -> onBack()
			Mode.WITHDRAW_METHOD -> mode = Mode.WITHDRAW_AMOUNT
			Mode.DEPOSIT_PROCESSING, Mode.WITHDRAW_DONE -> leave()
			else -> mode = Mode.HOME
		}
	}
	androidx.activity.compose.BackHandler(onBack = back)
	val title = when (mode) {
		Mode.HOME -> "Your account"
		Mode.DEPOSIT, Mode.DEPOSIT_PROCESSING, Mode.DEPOSIT_DONE -> "Add funds"
		else -> "Withdraw"
	}
	LivePage(title = title, onBack = back) {
		when (mode) {
			Mode.HOME -> {
				LiveCard {
					LiveKicker("REAL MONEY", color = Live.Green)
					Text(LiveAccount.usd(LiveAccount.accountValue), style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (28 * u).sp), color = Color.White)
					LiveRow("Cash available", LiveAccount.usd(LiveAccount.cash))
					LiveRow("In stocks", LiveAccount.usd(LiveAccount.holdingsValue))
					if (LiveAccount.pendingBuyCash > 0.0) LiveRow("Reserved for pending buys", LiveAccount.usd(LiveAccount.pendingBuyCash), Live.Amber)
					Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth().padding(top = (6 * u).dp)) {
						Column(modifier = Modifier.weight(1f)) { LiveSecondary("Add funds") { custom = false; amount = 100.0; text = ""; mode = Mode.DEPOSIT } }
						Column(modifier = Modifier.weight(1f)) { LiveSecondary("Withdraw") { custom = false; amount = minOf(50.0, LiveAccount.cash); text = ""; mode = Mode.WITHDRAW_AMOUNT } }
					}
				}
				LiveCard {
					LiveKicker("HOLDINGS")
					if (LiveAccount.holdings.isEmpty()) {
						LiveBody("Nothing yet. Open a stock and tap Buy - the order ticket uses this account.")
						Text(
							"Find a stock ›",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
							color = Live.Teal,
							modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onFindStock),
						)
					} else {
						LiveAccount.holdings.forEach { h ->
							Row(
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
								modifier = Modifier.fillMaxWidth().height((52 * u).dp).clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { onOpenStock(h.symbol) },
							) {
								LiveBadge(h.badge)
								Column(modifier = Modifier.weight(1f)) {
									Text(h.symbol, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
									Text("${LiveAccount.sharesText(h.shares)} sh · avg ${LiveAccount.usd(h.avgPrice)}", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Live.Muted)
								}
								Text(LiveAccount.usd(h.value), style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
							}
						}
					}
				}
				if (LiveAccount.orders.isNotEmpty()) {
					LiveCard {
						LiveKicker("ORDERS")
						LiveAccount.orders.forEach { o ->
							Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.fillMaxWidth().height((52 * u).dp)) {
								LiveBadge(o.badge)
								Column(modifier = Modifier.weight(1f)) {
									Text("${if (o.isBuy) "Buy" else "Sell"} ${o.symbol} · ${LiveAccount.usd(o.amount)}", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
									Text("${o.day} · ${if (o.type == "limit") "limit ${LiveAccount.usd(o.limit ?: o.price)}" else "market"} · ${LiveAccount.sharesText(o.shares)} sh", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Live.Muted)
								}
								LiveStatusPill(o.status)
								if (o.status == "pending") {
									Text(
										"Cancel",
										style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
										color = Live.Muted,
										modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { LiveAccount.cancel(o.id) },
									)
								}
							}
						}
					}
				}
				if (LiveAccount.transactions.isNotEmpty()) {
					LiveCard {
						LiveKicker("TRANSACTIONS")
						LiveAccount.transactions.forEach { t ->
							Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().height((44 * u).dp)) {
								Column(modifier = Modifier.weight(1f)) {
									Text(if (t.isDeposit) "Deposit" else "Withdrawal", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
									Text("${t.day} · ${t.method}", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Live.Muted)
								}
								Text((if (t.isDeposit) "+" else "-") + LiveAccount.usd(t.amount), style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = if (t.isDeposit) Live.Green else Color.White, modifier = Modifier.padding(end = (10 * u).dp))
								LiveStatusPill(t.status)
							}
						}
					}
				}
				LiveCaption("Practice trading stays in Simulate. Linked: ${LiveAccount.bankName} ••${LiveAccount.bankLast4}.")
			}
			Mode.DEPOSIT -> {
				LiveCard {
					LiveKicker("AMOUNT")
					LiveTitle("Add funds")
					LiveBody("From ${LiveAccount.bankName} ••${LiveAccount.bankLast4}.")
				}
				AmountChips(presets = listOf(50.0, 100.0, 500.0), selected = amount, onSelect = { amount = it; custom = false }, customOn = custom, onCustom = { custom = true; amount = text.toDoubleOrNull() ?: 0.0 })
				if (custom) AuthInput(value = text, onValueChange = { text = it.filter { c -> c.isDigit() || c == '.' }.take(9); amount = text.toDoubleOrNull() ?: 0.0 }, placeholder = "Amount in USD", keyboardType = KeyboardType.Decimal)
				LiveRow("You add", LiveAccount.usd(amount))
				AuthCta(text = "Confirm deposit", enabled = amount > 0.0, onClick = { txId = LiveAccount.deposit(amount); mode = Mode.DEPOSIT_PROCESSING })
			}
			Mode.DEPOSIT_PROCESSING -> {
				AfterDelay(key = txId, millis = 2000) { LiveAccount.settle(txId); mode = Mode.DEPOSIT_DONE }
				LiveCard {
					LiveKicker("PROCESSING", color = Live.Amber)
					LiveTitle("Moving ${LiveAccount.usd(amount)}")
					LiveBody("Your bank is sending the money. Cash shows as available the moment it lands.")
				}
			}
			Mode.DEPOSIT_DONE -> {
				LiveCard {
					LiveKicker("CONFIRMED", color = Live.Green)
					LiveTitle("${LiveAccount.usd(amount)} added")
					LiveBody("Cash available is now ${LiveAccount.usd(LiveAccount.cash)}.")
				}
				AuthCta(text = "Done", onClick = { mode = Mode.HOME })
			}
			Mode.WITHDRAW_AMOUNT -> {
				LiveCard {
					LiveKicker("AMOUNT")
					LiveTitle("Withdraw")
					LiveBody("Up to ${LiveAccount.usd(LiveAccount.cash)} of cash. Money in stocks has to be sold first.")
				}
				AmountChips(presets = listOf(25.0, 50.0, 100.0).filter { it <= LiveAccount.cash }, selected = amount, onSelect = { amount = it; custom = false }, customOn = custom, onCustom = { custom = true; amount = text.toDoubleOrNull() ?: 0.0 })
				if (custom) AuthInput(value = text, onValueChange = { text = it.filter { c -> c.isDigit() || c == '.' }.take(9); amount = text.toDoubleOrNull() ?: 0.0 }, placeholder = "Amount in USD", keyboardType = KeyboardType.Decimal, error = if (amount > LiveAccount.cash) "More than your cash available" else null)
				LiveRow("You withdraw", LiveAccount.usd(amount))
				AuthCta(text = "Continue", enabled = amount > 0.0 && amount <= LiveAccount.cash, onClick = { mode = Mode.WITHDRAW_METHOD })
			}
			Mode.WITHDRAW_METHOD -> {
				LiveCard {
					LiveKicker("METHOD")
					LiveTitle("Where to send it")
					LiveBody("Standard transfers are free and take 1–3 business days; instant goes to your debit card in minutes for a small fee.")
				}
				val methods = listOf("Standard · ${LiveAccount.bankName} ••${LiveAccount.bankLast4} · free", "Instant · debit card · ${String.format(java.util.Locale.US, "%.1f", INSTANT_FEE * 100)}% fee")
				Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth()) {
					SettingsChip(label = "Standard", selected = method == 0) { method = 0 }
					SettingsChip(label = "Instant", selected = method == 1) { method = 1 }
				}
				LiveCaption(methods[method])
				if (method == 1) LiveRow("Instant fee", "-" + LiveAccount.usd(amount * INSTANT_FEE))
				LiveRow("You receive", LiveAccount.usd(if (method == 1) amount * (1 - INSTANT_FEE) else amount))
				AuthCta(text = "Confirm withdrawal", onClick = {
					val id = LiveAccount.withdraw(amount, if (method == 1) "Instant · debit card" else "Standard · ${LiveAccount.bankName} ••${LiveAccount.bankLast4}")
					if (id != null) { txId = id; mode = Mode.WITHDRAW_DONE }
				})
			}
			else -> {
				AfterDelay(key = txId, millis = 2500) { LiveAccount.settle(txId) }
				val net = if (method == 1) amount * (1 - INSTANT_FEE) else amount
				LiveCard {
					LiveKicker("CONFIRMED", color = Live.Green)
					LiveTitle("${LiveAccount.usd(net)} on its way")
					LiveBody(if (method == 1) "Your debit card should have it in minutes. ${LiveAccount.usd(amount)} left your account, ${LiveAccount.usd(amount * INSTANT_FEE)} of it the instant fee." else "Expect it at ${LiveAccount.bankName} in 1–3 business days.")
				}
				AuthCta(text = "Done", onClick = leave)
			}
		}
	}
}
