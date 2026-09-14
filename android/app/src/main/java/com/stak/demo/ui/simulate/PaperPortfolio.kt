package com.stak.demo.ui.simulate

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.stak.demo.ui.discover.BuySpec
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs

/** One portfolio row's strings (1:4496): badge, ticker + picked line, P&L right. */
internal data class SimPick(
	val badge: String, val ticker: String, val sub: String,
	val amount: String, val pct: String, val up: Boolean,
)

/** One SOLD · REALIZED row (1:4496): badge, ticker, sold line, banked gain. */
internal data class Realized(
	val badge: String, val ticker: String, val sub: String,
	val amount: String, val up: Boolean,
)

/** A held pick: its detail-page numbers plus the row the lists draw. */
internal data class Position(val spec: PickSpec, val row: SimPick) {
	/** "$124.00" -> 124.0: what selling returns to cash. */
	val stake: Double get() = parseUsd(spec.stakeValue)

	/** "+$24.00" -> 24.0, "-$3.00" -> -3.0: the row's gain in dollars (review 2026-09-04). */
	val gainDollars: Double get() {
		val unsigned = parseUsd(row.amount.removePrefix("-").removePrefix("+"))
		return if (row.amount.startsWith("-")) -unsigned else unsigned
	}

	/** The best/worst tile line (1:3898): "+$24 on $100" - gain to whole dollars over the cost basis. */
	val duoLine: String get() {
		val whole = Math.round(gainDollars)
		return (if (whole < 0) "-" else "+") + "$" + String.format(Locale.US, "%,d", abs(whole)) + " on " + spec.stakeBasis
	}
}

/** "$1,234.56" -> 1234.56 (0.0 for anything unparseable). */
private fun parseUsd(text: String): Double = text.removePrefix("$").replace(",", "").toDoubleOrNull() ?: 0.0

/**
 * One ledger event - a buy or a sell (FigJam Simulate board, 2026-09-14: Trade
 * history -> Trade log). `amount` is the cash that moved, `day` the "Sep 14" it
 * moved on, `epochDay` for ordering (0 = an authored, undated seed row).
 */
internal data class Trade(
	val side: String, val symbol: String, val badge: String,
	val amount: Double, val shares: Double, val price: Double,
	val day: String, val epochDay: Long,
) {
	val isBuy: Boolean get() = side == "BUY"
}

/** A limit order waiting for its price (FigJam: Buy order -> Market or limit; Order pending). The stake is reserved from cash until it fills or is cancelled. */
internal data class OpenOrder(
	val id: String, val symbol: String, val badge: String, val name: String,
	val amount: Double, val limit: Double, val change: String, val day: String,
)

// The six authored rows (1:4496), in the authored order; each pairs with
// its PICK_SPECS entry by symbol so no string lives twice.
private val SEED_ROWS = listOf(
	SimPick("N", "NVDA", "Picked May 8 · up 24% since", "+$24.00", "+24.0%", true),
	SimPick("T", "TSLA", "Picked Jun 3 · up 18% since", "+$18.00", "+18.0%", true),
	SimPick("A", "AMD", "Picked May 29 · up 11% since", "+$11.00", "+11.0%", true),
	SimPick("A", "AAPL", "Picked Apr 22 · up 6% since", "+$6.00", "+6.0%", true),
	SimPick("J", "JPM", "Picked Jun 20 · up 2% since", "+$2.00", "+2.0%", true),
	SimPick("M", "MSFT", "Picked Jun 26 · down 3% since", "-$3.00", "-3.0%", false),
)

/**
 * Codex audit (2026-09-04): the paper portfolio is real state, not a set of
 * literals that contradict each other. Demo-seeded from the authored
 * numbers (1:3898 hero, 1:4496 rows, 1:4631 picks); buys and sells on
 * every host move the same cash and rows the Simulate, Portfolio, Pick
 * detail and Leaderboard pages read. Mirrors
 * ios/StakDemo/Simulate/PaperPortfolio.swift.
 */
internal object PaperPortfolio {
	/** The paper stake everyone starts on ("on $10,000 paper", 1:3898). */
	const val PAPER_START = 10000.0

	/**
	 * Portfolio setup (FigJam Simulate board, 2026-09-14: Choose balance, Name,
	 * Strategy). A NEW account picks its starting balance before its first
	 * trade; the demo persona is the authored $10,000 portfolio. Persisted with
	 * the ledger.
	 */
	var paperStart by mutableDoubleStateOf(PAPER_START)
		private set
	var portfolioName by mutableStateOf("")
		private set
	var strategy by mutableStateOf("")
		private set
	var setupDone by mutableStateOf(false)
		private set

	/**
	 * The setup card shows until the account has set up or touched its ledger - a trade, a held
	 * position (a pre-2026-09-14 ledger has positions but no trade log) or a reserved limit order
	 * (placeLimit records no trade). Review 2026-09-14: setup() must never rebase cash under a reservation.
	 */
	val needsSetup: Boolean get() = !demo && !setupDone && untouched
	private val untouched: Boolean get() = trades.isEmpty() && positions.isEmpty() && openOrders.isEmpty()

	fun setup(balance: Double, name: String, strategy: String) {
		if (!needsSetup) return
		paperStart = balance
		cash = balance
		baseValue = balance
		baseCash = balance
		portfolioName = name
		this.strategy = strategy
		setupDone = true
		persist()
	}

	/** Every buy and sell, newest first (FigJam: Trade history). */
	var trades by mutableStateOf(listOf<Trade>())
		private set

	/** Limit orders waiting for their price, newest first (FigJam: Order pending). */
	var openOrders by mutableStateOf(listOf<OpenOrder>())
		private set

	// One set of week figures for the hero, the board card and the
	// Leaderboard You row - audit item 6 (they used to disagree).
	const val WEEK_RANK = 47
	const val WEEK_GAIN = "+$186"
	const val WEEK_PCT = "+1.9%"

	/** Authored "+$240.00 all time" (1:3898). */
	/** All-time gain = today's value over the paper start (the demo's authored $240 falls out of its $10,240). */
	val allTimeGain: Double get() = portfolioValue - paperStart

	/** The authored demo account, or a fresh one (product audit, 2026-09-05). */
	var demo by mutableStateOf(true)
		private set

	/** The leaderboard rank - the demo's authored #47; a new account is unranked until it has moves. */
	val weekRank: Int? get() = if (demo) WEEK_RANK else null
	val weekUp: Boolean get() = if (demo) true else allTimeGain >= 0
	val weekGainText: String get() = if (demo) WEEK_GAIN else signedWhole(allTimeGain)
	val weekPctText: String get() = if (demo) WEEK_PCT else signedPct(allTimeGain / paperStart * 100)

	/** "12 picks" is authored for the demo (its rows list six); a new account counts its own. */
	val pickCountLabel: Int get() = if (demo) 12 + (positions.size - SEED_ROWS.size) else positions.size

	/** "1 pick" / "12 picks" (product audit, 2026-09-05: a first buy read "1 picks"). */
	val pickCountText: String get() = pickCountLabel.let { if (it == 1) "1 pick" else "$it picks" }

	// The authored hero (1:3924): $10,240.00 of which $8,800.00 is cash.
	private const val AUTHORED_VALUE = 10240.0
	private const val SEED_CASH = 8800.0

	var cash by mutableDoubleStateOf(SEED_CASH)
		private set

	private var baseValue = AUTHORED_VALUE
	private var baseCash = SEED_CASH

	var positions by mutableStateOf(
		SEED_ROWS.map { row -> Position(PICK_SPECS.first { it.symbol == row.ticker }, row) },
	)
		private set

	var realized by mutableStateOf(
		listOf(
			Realized("S", "SHOP", "Sold May 30 · profit banked", "+$12.00", true),
			Realized("C", "COIN", "Sold Jun 15 · loss realized", "-$8.00", false),
		),
	)
		private set

	// The seeded rows' stake - the authored figure counts picks the frame
	// never lists, so value is tracked as the authored number plus moves.
	private var baseHoldings: Double = positions.sumOf { it.stake }

	/** Seeds the authored demo history or clears everything to $10,000 of untouched paper cash. */
	fun reset(demo: Boolean) {
		this.demo = demo
		paperStart = PAPER_START
		portfolioName = if (demo) "Hamza\u2019s paper" else ""
		strategy = if (demo) "Balanced" else ""
		setupDone = demo
		openOrders = emptyList()
		// The persona's authored history as a trade log: a buy per seeded row on its
		// picked day, a sell per realized row (undated seeds order by their rows).
		trades = if (demo) seedTrades() else emptyList()
		if (demo) {
			cash = SEED_CASH
			positions = SEED_ROWS.map { row -> Position(PICK_SPECS.first { it.symbol == row.ticker }, row) }
			realized = listOf(
				Realized("S", "SHOP", "Sold May 30 · profit banked", "+$12.00", true),
				Realized("C", "COIN", "Sold Jun 15 · loss realized", "-$8.00", false),
			)
			baseValue = AUTHORED_VALUE
			baseCash = SEED_CASH
		} else {
			cash = PAPER_START
			positions = emptyList()
			realized = emptyList()
			baseValue = PAPER_START
			baseCash = PAPER_START
		}
		baseHoldings = positions.sumOf { it.stake }
		// The persisted ledger (buys, sells, cash) wins over the seed - product
		// audit 2026-09-05; the seed baseline above is what value grows from.
		// A demo ledger persisted before the trade log existed (no "trades" key) reseeds once with its
		// authored history; the next persist() rewrites it in the current shape (review 2026-09-14).
		com.stak.demo.ui.StakStore.getString("portfolio")?.let { runCatching { val o = org.json.JSONObject(it); if (!(demo && !o.has("trades"))) restore(o) } }
	}

	private fun seedTrades(): List<Trade> {
		val buys = SEED_ROWS.map { row ->
			val spec = PICK_SPECS.first { it.symbol == row.ticker }
			Trade("BUY", row.ticker, row.badge, parseUsd(spec.stakeBasis), spec.shares.toDoubleOrNull() ?: 0.0, parseUsd(spec.priceThen), row.sub.substringAfter("Picked ").substringBefore(" \u00b7"), 0L)
		}
		val sells = listOf(
			Trade("SELL", "SHOP", "S", 112.0, 1.4, 80.0, "May 30", 0L),
			Trade("SELL", "COIN", "C", 92.0, 0.5, 184.0, "Jun 15", 0L),
		)
		return sells + buys
	}

	private fun recordTrade(side: String, symbol: String, badge: String, amount: Double, shares: Double, price: Double) {
		trades = listOf(Trade(side, symbol, badge, amount, shares, price, today(), LocalDate.now().toEpochDay())) + trades
	}

	/** True when the cash on hand covers the stake reserved for a limit order too. */
	fun placeLimit(spec: BuySpec, amount: Double, limit: Double): Boolean {
		if (!canBuy(amount) || limit <= 0.0) return false
		cash -= amount
		openOrders = listOf(OpenOrder("${spec.symbol}-${System.currentTimeMillis()}", spec.symbol, spec.badge, spec.name, amount, limit, spec.change, today())) + openOrders
		persist()
		return true
	}

	/** Cancelling an open order releases its reserved stake. */
	fun cancelOrder(id: String) {
		val order = openOrders.firstOrNull { it.id == id } ?: return
		openOrders = openOrders.filterNot { it.id == id }
		cash += order.amount
		persist()
	}

	// ---- persistence ------------------------------------------------------------------------
	private fun persist() {
		val o = org.json.JSONObject()
		o.put("cash", cash)
		o.put("paperStart", paperStart)
		o.put("name", portfolioName)
		o.put("strategy", strategy)
		o.put("setupDone", setupDone)
		o.put("trades", org.json.JSONArray().also { arr ->
			trades.forEach { t -> arr.put(org.json.JSONObject().put("side", t.side).put("symbol", t.symbol).put("badge", t.badge).put("amount", t.amount).put("shares", t.shares).put("price", t.price).put("day", t.day).put("epochDay", t.epochDay)) }
		})
		o.put("orders", org.json.JSONArray().also { arr ->
			openOrders.forEach { r -> arr.put(org.json.JSONObject().put("id", r.id).put("symbol", r.symbol).put("badge", r.badge).put("name", r.name).put("amount", r.amount).put("limit", r.limit).put("change", r.change).put("day", r.day)) }
		})
		o.put("positions", org.json.JSONArray().also { arr ->
			positions.forEach { p -> arr.put(org.json.JSONObject().put("spec", specJson(p.spec)).put("row", org.json.JSONObject().put("badge", p.row.badge).put("ticker", p.row.ticker).put("sub", p.row.sub).put("amount", p.row.amount).put("pct", p.row.pct).put("up", p.row.up))) }
		})
		o.put("realized", org.json.JSONArray().also { arr ->
			realized.forEach { r -> arr.put(org.json.JSONObject().put("badge", r.badge).put("ticker", r.ticker).put("sub", r.sub).put("amount", r.amount).put("up", r.up)) }
		})
		com.stak.demo.ui.StakStore.putString("portfolio", o.toString())
	}

	private fun specJson(s: PickSpec): org.json.JSONObject = org.json.JSONObject()
		.put("symbol", s.symbol).put("badge", s.badge).put("company", s.company).put("priceNow", s.priceNow)
		.put("pickedLine", s.pickedLine).put("priceThen", s.priceThen).put("gain", s.gain).put("gainPct", s.gainPct)
		.put("up", s.up).put("shares", s.shares).put("stakeValue", s.stakeValue).put("vsMarket", s.vsMarket)
		.put("ahead", s.ahead).put("dayChange", s.dayChange).put("stakeBasis", s.stakeBasis).put("weekGain", s.weekGain)

	private fun restore(o: org.json.JSONObject) {
		val pos = o.getJSONArray("positions")
		positions = (0 until pos.length()).map { i ->
			val p = pos.getJSONObject(i); val s = p.getJSONObject("spec"); val r = p.getJSONObject("row")
			Position(
				spec = PickSpec(
					symbol = s.getString("symbol"), badge = s.getString("badge"), company = s.getString("company"), priceNow = s.getString("priceNow"),
					pickedLine = s.getString("pickedLine"), priceThen = s.getString("priceThen"), gain = s.getString("gain"), gainPct = s.getString("gainPct"),
					up = s.getBoolean("up"), shares = s.getString("shares"), stakeValue = s.getString("stakeValue"), vsMarket = s.getString("vsMarket"),
					ahead = s.getBoolean("ahead"), dayChange = s.getString("dayChange"), stakeBasis = s.getString("stakeBasis"), weekGain = s.getString("weekGain"),
				),
				row = SimPick(r.getString("badge"), r.getString("ticker"), r.getString("sub"), r.getString("amount"), r.getString("pct"), r.getBoolean("up")),
			)
		}
		val rea = o.getJSONArray("realized")
		realized = (0 until rea.length()).map { i ->
			val r = rea.getJSONObject(i)
			Realized(r.getString("badge"), r.getString("ticker"), r.getString("sub"), r.getString("amount"), r.getBoolean("up"))
		}
		cash = o.getDouble("cash")
		// Fields the FigJam Simulate work added (2026-09-14) - a ledger persisted before them keeps its defaults.
		if (o.has("paperStart")) {
			paperStart = o.getDouble("paperStart")
			baseValue = if (demo) AUTHORED_VALUE else paperStart
			baseCash = if (demo) SEED_CASH else paperStart
		}
		if (o.has("name")) portfolioName = o.getString("name")
		if (o.has("strategy")) strategy = o.getString("strategy")
		if (o.has("setupDone")) setupDone = o.getBoolean("setupDone")
		if (o.has("trades")) {
			val arr = o.getJSONArray("trades")
			trades = (0 until arr.length()).map { i ->
				val t = arr.getJSONObject(i)
				Trade(t.getString("side"), t.getString("symbol"), t.getString("badge"), t.getDouble("amount"), t.getDouble("shares"), t.getDouble("price"), t.getString("day"), t.getLong("epochDay"))
			}
		}
		if (o.has("orders")) {
			val arr = o.getJSONArray("orders")
			openOrders = (0 until arr.length()).map { i ->
				val r = arr.getJSONObject(i)
				OpenOrder(r.getString("id"), r.getString("symbol"), r.getString("badge"), r.getString("name"), r.getDouble("amount"), r.getDouble("limit"), r.getString("change"), r.getString("day"))
			}
		}
	}

	fun signedWhole(amount: Double): String = (if (amount < 0) "-$" else "+$") + String.format(Locale.US, "%,.0f", kotlin.math.abs(amount))
	fun signedUsd(amount: Double): String = (if (amount < 0) "-" else "+") + usd(kotlin.math.abs(amount))
	fun signedPct(pct: Double): String = String.format(Locale.US, "%+.1f%%", pct)
	fun wholeUsd(amount: Double): String = "$" + String.format(Locale.US, "%,.0f", amount)

	/**
	 * The authored $10,240.00 plus every move since: a buy swaps cash for
	 * stake at cost and a sell swaps stake back at value, so the figure
	 * holds until prices move - the demo serves no live prices.
	 */
	val portfolioValue: Double
		// A reserved limit stake is still the account's money until it fills or is cancelled (review 2026-09-14).
		get() = baseValue + (cash - baseCash) + (positions.sumOf { it.stake } - baseHoldings) + openOrders.sumOf { it.amount }

	val pickCount: Int get() = positions.size

	fun holds(symbol: String): Boolean = positions.any { it.spec.symbol == symbol }

	fun pickSpec(symbol: String): PickSpec? = positions.firstOrNull { it.spec.symbol == symbol }?.spec

	/** "$" + Locale.US "%,.2f" - the one cash format every screen shares. */
	fun usd(amount: Double): String = "$" + String.format(Locale.US, "%,.2f", amount)

	/** The cost-basis label (review 2026-09-04): whole dollars read "$25", anything else "$25.50". */
	fun stakeLabel(amount: Double): String =
		if (amount == Math.rint(amount)) "$" + String.format(Locale.US, "%,.0f", amount) else usd(amount)

	/** Today as "Sep 4" - the picked / sold lines' date. */
	private fun today(): String = LocalDate.now().format(DateTimeFormatter.ofPattern("MMM d", Locale.US))

	/**
	 * A filled paper order: cash moves into the position at today's price.
	 * A symbol already held grows that position (shares + stake) instead
	 * of adding a duplicate row; a new one lands at the top of the list.
	 */
	/** True when the cash on hand covers the stake - the ticket's pills and the confirm both read it (Codex review, PR #166). */
	fun canBuy(amount: Double): Boolean = amount > 0.0 && amount <= cash

	fun buy(spec: BuySpec, amount: Double) {
		if (!canBuy(amount)) return
		val price = spec.price
		val shares = if (price > 0.0) amount / price else 0.0
		cash -= amount
		recordTrade("BUY", spec.symbol, spec.badge, amount, shares, price)
		val held = positions.firstOrNull { it.spec.symbol == spec.symbol }
		if (held != null) {
			// A top-up grows the COST basis by the money put in ($100 + $25 ->
			// "$125"), not the current value; weekGain stays. Mirrors ios.
			val basis = held.spec.stakeBasis.removePrefix("$").replace(",", "").toDoubleOrNull() ?: 0.0
			val newBasis = basis + amount
			// The return is recomputed over the new basis: $24 on $100 was 24%, on
			// $200 it is 12% (Codex review, PR #166). The dollar gain itself stands.
			val gainAmt = held.spec.gain.filter { it.isDigit() || it == '.' }.toDoubleOrNull() ?: 0.0
			val pctText = String.format(Locale.US, "%.1f%%", if (newBasis > 0.0) gainAmt / newBasis * 100.0 else 0.0)
			val grown = held.copy(
				spec = held.spec.copy(
					shares = String.format(Locale.US, "%.4f", (held.spec.shares.toDoubleOrNull() ?: 0.0) + shares),
					stakeValue = usd(held.stake + amount),
					stakeBasis = stakeLabel(newBasis),
					gainPct = pctText,
				),
				row = held.row.copy(pct = (if (held.spec.up) "+" else "-") + pctText),
			)
			positions = positions.map { if (it === held) grown else it }
			persist()
			return
		}
		val priceText = usd(price)
		val day = today()
		val fresh = Position(
			spec = PickSpec(
				symbol = spec.symbol,
				badge = spec.badge,
				company = spec.name,
				priceNow = priceText,
				pickedLine = "Picked $day at $priceText",
				priceThen = priceText,
				gain = "+$0.00",
				gainPct = "0.0%",
				up = true,
				shares = String.format(Locale.US, "%.4f", shares),
				stakeValue = usd(amount),
				vsMarket = "Even with the market",
				ahead = true,
				dayChange = spec.change,
				stakeBasis = stakeLabel(amount),
				weekGain = "+$0.00",
			),
			row = SimPick(spec.badge, spec.symbol, "Picked $day · just bought", "+$0.00", "+0.0%", true),
		)
		positions = listOf(fresh) + positions
		persist()
	}

	/**
	 * Closing a position: its value returns to cash and it joins SOLD ·
	 * REALIZED at the top. False when the symbol is not held (review
	 * 2026-09-04) - hosts never morph to Position closed on a phantom sell.
	 */
	fun sell(symbol: String, portion: Double = 1.0): Boolean {
		val held = positions.firstOrNull { it.spec.symbol == symbol } ?: return false
		val p = portion.coerceIn(0.0, 1.0)
		if (p <= 0.0) return false
		val banked = !held.spec.gain.startsWith("-")
		val sub = "Sold ${today()} · ${if (banked) "profit banked" else "loss realized"}"
		recordTrade("SELL", symbol, held.spec.badge, held.stake * p, (held.spec.shares.toDoubleOrNull() ?: 0.0) * p, parseUsd(held.spec.priceNow))
		if (p >= 0.999) {
			positions = positions.filterNot { it === held }
			cash += held.stake
			realized = listOf(Realized(badge = held.spec.badge, ticker = symbol, sub = sub, amount = held.spec.gain, up = banked)) + realized
		} else {
			// A partial sell - the Half / Custom chips (Codex review, PR #167): the sold
			// slice returns to cash and banks its share of the gain; the rest of the
			// position stays, scaled.
			val keep = 1.0 - p
			val gain = held.gainDollars
			val basis = held.spec.stakeBasis.removePrefix("$").replace(",", "").toDoubleOrNull() ?: 0.0
			cash += held.stake * p
			val rest = held.copy(
				spec = held.spec.copy(
					shares = String.format(Locale.US, "%.4f", (held.spec.shares.toDoubleOrNull() ?: 0.0) * keep),
					stakeValue = usd(held.stake * keep),
					stakeBasis = stakeLabel(basis * keep),
					gain = signedUsd(gain * keep),
				),
				row = held.row.copy(amount = signedUsd(gain * keep)),
			)
			positions = positions.map { if (it === held) rest else it }
			realized = listOf(Realized(badge = held.spec.badge, ticker = symbol, sub = sub, amount = signedUsd(gain * p), up = banked)) + realized
		}
		persist()
		return true
	}
}
