package com.stak.demo.ui.live

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
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

private object Stage {
	const val TICKET = "ticket"
	const val REVIEW = "review"
	const val PENDING = "pending"
	const val FILLED = "filled"
	const val OPEN = "open"
}

/**
 * The live order ticket (FigJam "STAK · Go live to buy and sell": Stock Detail ·
 * Buy -> Account live? -> Order ticket (buy / sell) -> Order review -> Order
 * pending -> Order filled -> holdings update). A sheet over Stock Detail; the
 * demo market fills a market order after a moment, a limit under today's price
 * stays open on the account page. Mirrors ios Live/LiveOrderFlow.swift.
 */
@Composable
internal fun LiveOrderFlow(symbol: String, badge: String, name: String, price: Double, change: String, onClose: () -> Unit, onViewAccount: () -> Unit) {
	val u = figmaUnit()
	var stage by rememberSaveable { mutableStateOf(Stage.TICKET) }
	var side by rememberSaveable { mutableStateOf("BUY") }
	var amount by rememberSaveable { mutableStateOf(25.0) }
	var custom by rememberSaveable { mutableStateOf(false) }
	var text by rememberSaveable { mutableStateOf("") }
	var limitOn by rememberSaveable { mutableStateOf(false) }
	var limitText by rememberSaveable { mutableStateOf("") }
	var orderId by rememberSaveable { mutableStateOf("") }
	val held = LiveAccount.holding(symbol)
	// What a sell may still take: the holding minus shares already promised to pending sells (review 2026-09-14).
	val available = LiveAccount.availableShares(symbol)
	val heldValue = available * price
	val limit = if (limitOn) (limitText.toDoubleOrNull()?.takeIf { it > 0.0 } ?: price) else null
	val shares = if (price > 0.0) amount / price else 0.0
	val valid = amount > 0.0 && if (side == "BUY") LiveAccount.canBuy(amount) else amount <= heldValue + 0.005
	// A buy limit under today's price or a sell limit over it waits on the account instead of filling.
	val waits = limitOn && (if (side == "BUY") (limit ?: price) < price else (limit ?: price) > price)

	// Back mirrors the scrim: while the market is filling, the sheet stays (review 2026-09-14).
	androidx.activity.compose.BackHandler {
		when (stage) {
			Stage.REVIEW -> stage = Stage.TICKET
			Stage.PENDING -> Unit
			else -> onClose()
		}
	}
	LiveSheet(onDismiss = { if (stage != Stage.PENDING) onClose() }) {
		when (stage) {
			Stage.TICKET -> {
				Text(if (side == "BUY") "Buy $symbol" else "Sell $symbol", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp), color = Color.White)
				StockLine(badge, symbol, name, price, change)
				LiveKicker("REAL MONEY ORDER", color = Live.Green)
				if (held != null) {
					Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
						SettingsChip(label = "Buy", selected = side == "BUY") { side = "BUY"; amount = 25.0; custom = false }
						SettingsChip(label = "Sell", selected = side == "SELL") { side = "SELL"; amount = minOf(25.0, heldValue); custom = false }
					}
					LiveCaption(if (available < held.shares - 1e-9) "You hold ${LiveAccount.sharesText(held.shares)} sh; ${LiveAccount.sharesText(available)} sh (${LiveAccount.usd(heldValue)}) are free to sell." else "You hold ${LiveAccount.sharesText(held.shares)} sh worth ${LiveAccount.usd(heldValue)}.")
				}
				LiveRow("Cash available", LiveAccount.usd(LiveAccount.cash))
				val presets = if (side == "BUY") listOf(10.0, 25.0, 50.0, 100.0) else listOf(heldValue / 2, heldValue).map { Math.round(it * 100) / 100.0 }.distinct()
				AmountChips(presets = presets, selected = amount, onSelect = { amount = it; custom = false }, customOn = custom, onCustom = { custom = true; amount = text.toDoubleOrNull() ?: 0.0 })
				if (custom) AuthInput(value = text, onValueChange = { text = it.filter { c -> c.isDigit() || c == '.' }.take(9); amount = text.toDoubleOrNull() ?: 0.0 }, placeholder = "Amount in USD", keyboardType = KeyboardType.Decimal, error = if (!valid && amount > 0.0) (if (side == "BUY") "More than your cash available" else "More than you hold") else null)
				Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
					SettingsChip(label = "Market", selected = !limitOn) { limitOn = false }
					SettingsChip(label = "Limit", selected = limitOn) { limitOn = true }
				}
				if (limitOn) {
					AuthInput(value = limitText, onValueChange = { limitText = it.filter { c -> c.isDigit() || c == '.' }.take(9) }, placeholder = "Limit price (today ${LiveAccount.usd(price)})", keyboardType = KeyboardType.Decimal)
					LiveCaption(if (!waits) "Fills right away at today’s price - your limit is already met." else if (side == "BUY") "Below today’s price: the order waits on your account until $symbol gets there." else "Above today’s price: the order waits on your account until $symbol gets there.")
				}
				LiveRow("You ${if (side == "BUY") "get" else "sell"}", "${LiveAccount.sharesText(shares)} sh")
				AuthCta(text = "Review order", enabled = valid, onClick = { stage = Stage.REVIEW })
				LiveSecondary("Not now", onClick = onClose)
			}
			Stage.REVIEW -> {
				Text("Review your order", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp), color = Color.White)
				StockLine(badge, symbol, name, price, change)
				LiveRow("Side", if (side == "BUY") "Buy" else "Sell")
				LiveRow("Type", if (limitOn) "Limit at ${LiveAccount.usd(limit ?: price)}" else "Market")
				LiveRow("Amount", LiveAccount.usd(amount))
				LiveRow("Estimated shares", LiveAccount.sharesText(shares))
				LiveRow(if (side == "BUY") "Cash after" else "Cash after sale", LiveAccount.usd(if (side == "BUY") LiveAccount.cash - amount else LiveAccount.cash + amount))
				LiveCaption("Real money. Prices move; a market order fills at the next available price. Not investment advice.")
				AuthCta(text = "Place order", onClick = {
					val o = LiveAccount.place(side, symbol, badge, name, amount, price, if (limitOn) "limit" else "market", limit)
					if (o != null) {
						orderId = o.id
						stage = if (waits) Stage.OPEN else Stage.PENDING
					}
				})
				LiveSecondary("Back", onClick = { stage = Stage.TICKET })
			}
			Stage.PENDING -> {
				// The demo market fills after a moment (FigJam: Order pending -> Order filled).
				AfterDelay(key = orderId, millis = 2000) { LiveAccount.fill(orderId); stage = Stage.FILLED }
				Text("Order pending", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp), color = Color.White)
				StockLine(badge, symbol, name, price, change)
				LiveStatusPill("pending")
				LiveBody("Sent to the market. This usually fills in seconds during trading hours.")
			}
			Stage.OPEN -> {
				Text("Order placed", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp), color = Color.White)
				StockLine(badge, symbol, name, price, change)
				LiveStatusPill("pending")
				LiveBody(if (side == "BUY") "Waits for $symbol at ${LiveAccount.usd(limit ?: price)} or below. ${LiveAccount.usd(amount)} is reserved; cancel any time from your account." else "Waits for $symbol at ${LiveAccount.usd(limit ?: price)} or above. ${LiveAccount.sharesText(shares)} sh are set aside; cancel any time from your account.")
				AuthCta(text = "View account", onClick = onViewAccount)
				LiveSecondary("Done", onClick = onClose)
			}
			else -> {
				val nowHeld = LiveAccount.holding(symbol)
				Text("Order filled", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp), color = Color.White)
				StockLine(badge, symbol, name, price, change)
				LiveStatusPill("filled")
				LiveRow("Filled at", LiveAccount.usd(price))
				LiveRow("You now hold", if (nowHeld == null) "0 sh" else "${LiveAccount.sharesText(nowHeld.shares)} sh")
				LiveRow("Cash available", LiveAccount.usd(LiveAccount.cash))
				AuthCta(text = "View account", onClick = onViewAccount)
				LiveSecondary("Done", onClick = onClose)
			}
		}
	}
}

@Composable
private fun StockLine(badge: String, symbol: String, name: String, price: Double, change: String) {
	val u = figmaUnit()
	Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.fillMaxWidth().padding(vertical = (2 * u).dp)) {
		LiveBadge(badge, size = 36f)
		Column(modifier = Modifier.weight(1f)) {
			Text(symbol, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = Color.White)
			Text(name, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Live.Muted)
		}
		Column(horizontalAlignment = Alignment.End) {
			Text(LiveAccount.usd(price), style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
			Text(change, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = if (change.startsWith("▼")) Live.Red else Live.Green)
		}
	}
}
