package com.stak.demo.ui.live

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.stak.demo.ui.StakStore
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Where the account is on the Go live path (FigJam "STAK · Go live to buy and sell", 2026-09-14). */
internal object LiveStatus {
	const val NONE = "none"
	const val REVIEW = "review"
	const val VERIFIED = "verified"
	const val REJECTED = "rejected"
	const val LIVE = "live"
}

/** The identity the user entered (KYC). The SSN is NEVER kept - it is validated on the step and dropped. */
internal data class KycProfile(
	val firstName: String = "", val lastName: String = "", val dob: String = "",
	val street: String = "", val city: String = "", val state: String = "", val zip: String = "",
	val employment: String = "",
) {
	val fullName: String get() = "$firstName $lastName".trim()
}

/** A real-money position. */
internal data class LiveHolding(val symbol: String, val badge: String, val name: String, val shares: Double, val avgPrice: Double) {
	val value: Double get() = shares * avgPrice
}

/** A live order: pending until the (demo) market fills it, then part of the holdings. */
internal data class LiveOrder(
	val id: String, val side: String, val symbol: String, val badge: String, val name: String,
	val amount: Double, val shares: Double, val price: Double, val type: String, val limit: Double?,
	val status: String, val day: String,
) {
	val isBuy: Boolean get() = side == "BUY"
}

/** A cash movement: deposits and withdrawals, processing then done. */
internal data class LiveTx(val id: String, val kind: String, val amount: Double, val method: String, val status: String, val day: String) {
	val isDeposit: Boolean get() = kind == "deposit"
}

/**
 * The real-money account behind Go live (FigJam Full Cascade copies, 2026-09-14:
 * Go live -> Identity check -> Fund account -> Real money ON -> Account home,
 * Withdraw, and the Stock Detail's "Account live?" branch). A local mock: the
 * review resolves on the phone (an applicant under 18 is rejected, so the
 * "Fix & resubmit" edge is reachable), deposits settle after a moment, orders
 * fill at the catalogue price. Persisted per account through StakStore; the
 * SSN never touches storage. Mirrors ios Live/LiveAccount.swift.
 */
internal object LiveAccount {
	var status by mutableStateOf(LiveStatus.NONE)
		private set
	var kyc by mutableStateOf(KycProfile())
		private set
	/** The verifier's note on a rejection. */
	var rejectionReason by mutableStateOf("")
		private set
	var bankName by mutableStateOf("")
		private set
	var bankLast4 by mutableStateOf("")
		private set
	var cash by mutableStateOf(0.0)
		private set
	var holdings by mutableStateOf(listOf<LiveHolding>())
		private set
	var orders by mutableStateOf(listOf<LiveOrder>())
		private set
	var transactions by mutableStateOf(listOf<LiveTx>())
		private set

	val isLive: Boolean get() = status == LiveStatus.LIVE
	val bankLinked: Boolean get() = bankLast4.isNotEmpty()
	val holdingsValue: Double get() = holdings.sumOf { it.value }
	val accountValue: Double get() = cash + holdingsValue
	/** Cash the pending buys have not spent yet. */
	val pendingBuyCash: Double get() = orders.filter { it.isBuy && it.status == "pending" }.sumOf { it.amount }

	/** The banks and cards the demo links (FigJam: Link card / bank). */
	val BANK_OPTIONS = listOf("Chase" to "4821", "Bank of America" to "0193", "Wells Fargo" to "7750", "Debit card" to "2264")

	/** Called from Session.applyAccount - the account kind's own record, or nothing. */
	fun load() {
		status = LiveStatus.NONE
		kyc = KycProfile()
		rejectionReason = ""
		bankName = ""; bankLast4 = ""
		cash = 0.0
		holdings = emptyList(); orders = emptyList(); transactions = emptyList()
		StakStore.getString("live")?.let { runCatching { restore(JSONObject(it)) } }
	}

	// ---- identity --------------------------------------------------------------------------
	/** Agreements signed: the application goes under review. `ssn` is checked here and forgotten. */
	fun submit(profile: KycProfile, ssn: String): Boolean {
		if (!ssnValid(ssn)) return false
		kyc = profile
		status = LiveStatus.REVIEW
		rejectionReason = ""
		persist()
		return true
	}

	/** The (demo) verifier's answer: 18 or over is verified, younger is rejected with the reason. */
	fun resolveReview() {
		if (status != LiveStatus.REVIEW) return
		val age = ageOf(kyc.dob)
		if (age != null && age >= 18) {
			status = LiveStatus.VERIFIED
		} else {
			status = LiveStatus.REJECTED
			rejectionReason = "You need to be 18 or over to open a real-money account. Check the date of birth and resubmit."
		}
		persist()
	}

	// ---- funding ---------------------------------------------------------------------------
	fun linkBank(name: String, last4: String) {
		bankName = name; bankLast4 = last4
		persist()
	}

	/** Adds a processing deposit; `settle` lands it in cash. */
	fun deposit(amount: Double): String {
		val id = newId("dep")
		transactions = listOf(LiveTx(id, "deposit", amount, "$bankName ••$bankLast4", "processing", today())) + transactions
		persist()
		return id
	}

	fun settle(txId: String) {
		val tx = transactions.firstOrNull { it.id == txId && it.status == "processing" } ?: return
		transactions = transactions.map { if (it.id == txId) it.copy(status = "done") else it }
		if (tx.isDeposit) cash += tx.amount
		persist()
	}

	/** Real money ON: cash is available and the account trades for real. */
	fun goLive() {
		if (status == LiveStatus.VERIFIED) status = LiveStatus.LIVE
		persist()
	}

	/** A withdrawal leaves cash at once and shows as processing until the bank has it. */
	fun withdraw(amount: Double, method: String): String? {
		if (amount <= 0.0 || amount > cash) return null
		val id = newId("wd")
		cash -= amount
		transactions = listOf(LiveTx(id, "withdraw", amount, method, "processing", today())) + transactions
		persist()
		return id
	}

	// ---- trading ---------------------------------------------------------------------------
	fun holding(symbol: String): LiveHolding? = holdings.firstOrNull { it.symbol == symbol }

	fun canBuy(amount: Double): Boolean = amount > 0.0 && amount <= cash

	/** Places an order; a market order (or a limit at/above the price) is pending until `fill` runs, a lower limit stays open. */
	fun place(side: String, symbol: String, badge: String, name: String, amount: Double, price: Double, type: String, limit: Double?): LiveOrder? {
		if (price <= 0.0 || amount <= 0.0) return null
		val shares = amount / price
		if (side == "BUY") {
			if (!canBuy(amount)) return null
			cash -= amount
		} else {
			val held = holding(symbol) ?: return null
			if (shares > held.shares + 1e-9) return null
		}
		val order = LiveOrder(newId("ord"), side, symbol, badge, name, amount, shares, price, type, limit, "pending", today())
		orders = listOf(order) + orders
		persist()
		return order
	}

	/** The demo market fills a pending order at its price: holdings and cash update (FigJam: Order filled -> holdings update). */
	fun fill(orderId: String) {
		val o = orders.firstOrNull { it.id == orderId && it.status == "pending" } ?: return
		if (o.type == "limit" && o.limit != null && o.isBuy && o.limit < o.price) return // still waiting for its price
		if (o.isBuy) {
			val held = holding(o.symbol)
			holdings = if (held == null) {
				holdings + LiveHolding(o.symbol, o.badge, o.name, o.shares, o.price)
			} else {
				val shares = held.shares + o.shares
				val avg = (held.shares * held.avgPrice + o.shares * o.price) / shares
				holdings.map { if (it.symbol == o.symbol) it.copy(shares = shares, avgPrice = avg) else it }
			}
		} else {
			val held = holding(o.symbol) ?: return
			val left = held.shares - o.shares
			holdings = if (left <= 1e-6) holdings.filterNot { it.symbol == o.symbol } else holdings.map { if (it.symbol == o.symbol) it.copy(shares = left) else it }
			cash += o.amount
		}
		orders = orders.map { if (it.id == orderId) it.copy(status = "filled") else it }
		persist()
	}

	fun cancel(orderId: String) {
		val o = orders.firstOrNull { it.id == orderId && it.status == "pending" } ?: return
		if (o.isBuy) cash += o.amount
		orders = orders.map { if (it.id == orderId) it.copy(status = "cancelled") else it }
		persist()
	}

	// ---- helpers ---------------------------------------------------------------------------
	fun ssnValid(ssn: String): Boolean = ssn.filter { it.isDigit() }.length == 9

	/** Age from "YYYY-MM-DD"; null when the date does not parse. */
	fun ageOf(dob: String): Int? = runCatching {
		val d = LocalDate.parse(dob.trim())
		java.time.Period.between(d, LocalDate.now()).years
	}.getOrNull()

	fun usd(amount: Double): String = "$" + String.format(Locale.US, "%,.2f", amount)
	fun sharesText(shares: Double): String = String.format(Locale.US, "%.4f", shares)

	private fun today(): String = LocalDate.now().format(DateTimeFormatter.ofPattern("MMM d", Locale.US))
	private fun newId(prefix: String): String = "$prefix-${System.currentTimeMillis()}-${(orders.size + transactions.size)}"

	// ---- persistence -----------------------------------------------------------------------
	private fun persist() {
		val o = JSONObject()
		o.put("status", status)
		o.put("kyc", JSONObject().put("first", kyc.firstName).put("last", kyc.lastName).put("dob", kyc.dob).put("street", kyc.street).put("city", kyc.city).put("state", kyc.state).put("zip", kyc.zip).put("employment", kyc.employment))
		o.put("reason", rejectionReason)
		o.put("bankName", bankName).put("bankLast4", bankLast4)
		o.put("cash", cash)
		o.put("holdings", JSONArray().also { a -> holdings.forEach { h -> a.put(JSONObject().put("symbol", h.symbol).put("badge", h.badge).put("name", h.name).put("shares", h.shares).put("avg", h.avgPrice)) } })
		o.put("orders", JSONArray().also { a -> orders.forEach { r -> a.put(JSONObject().put("id", r.id).put("side", r.side).put("symbol", r.symbol).put("badge", r.badge).put("name", r.name).put("amount", r.amount).put("shares", r.shares).put("price", r.price).put("type", r.type).put("limit", r.limit ?: JSONObject.NULL).put("status", r.status).put("day", r.day)) } })
		o.put("tx", JSONArray().also { a -> transactions.forEach { t -> a.put(JSONObject().put("id", t.id).put("kind", t.kind).put("amount", t.amount).put("method", t.method).put("status", t.status).put("day", t.day)) } })
		StakStore.putString("live", o.toString())
	}

	private fun restore(o: JSONObject) {
		status = o.optString("status", LiveStatus.NONE)
		o.optJSONObject("kyc")?.let { k ->
			kyc = KycProfile(k.optString("first"), k.optString("last"), k.optString("dob"), k.optString("street"), k.optString("city"), k.optString("state"), k.optString("zip"), k.optString("employment"))
		}
		rejectionReason = o.optString("reason")
		bankName = o.optString("bankName"); bankLast4 = o.optString("bankLast4")
		cash = o.optDouble("cash", 0.0)
		holdings = o.optJSONArray("holdings")?.let { a -> (0 until a.length()).map { i -> val h = a.getJSONObject(i); LiveHolding(h.getString("symbol"), h.getString("badge"), h.getString("name"), h.getDouble("shares"), h.getDouble("avg")) } } ?: emptyList()
		orders = o.optJSONArray("orders")?.let { a -> (0 until a.length()).map { i -> val r = a.getJSONObject(i); LiveOrder(r.getString("id"), r.getString("side"), r.getString("symbol"), r.getString("badge"), r.getString("name"), r.getDouble("amount"), r.getDouble("shares"), r.getDouble("price"), r.getString("type"), if (r.isNull("limit")) null else r.getDouble("limit"), r.getString("status"), r.getString("day")) } } ?: emptyList()
		transactions = o.optJSONArray("tx")?.let { a -> (0 until a.length()).map { i -> val t = a.getJSONObject(i); LiveTx(t.getString("id"), t.getString("kind"), t.getDouble("amount"), t.getString("method"), t.getString("status"), t.getString("day")) } } ?: emptyList()
	}
}
