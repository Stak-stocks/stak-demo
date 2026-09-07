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

	// One set of week figures for the hero, the board card and the
	// Leaderboard You row - audit item 6 (they used to disagree).
	const val WEEK_RANK = 47
	const val WEEK_GAIN = "+$186"
	const val WEEK_PCT = "+1.9%"

	/** Authored "+$240.00 all time" (1:3898). */
	/** All-time gain = today's value over the paper start (the demo's authored $240 falls out of its $10,240). */
	val allTimeGain: Double get() = portfolioValue - PAPER_START

	/** The authored demo account, or a fresh one (product audit, 2026-09-05). */
	var demo by mutableStateOf(true)
		private set

	/** The leaderboard rank - the demo's authored #47; a new account is unranked until it has moves. */
	val weekRank: Int? get() = if (demo) WEEK_RANK else null
	val weekUp: Boolean get() = if (demo) true else allTimeGain >= 0
	val weekGainText: String get() = if (demo) WEEK_GAIN else signedWhole(allTimeGain)
	val weekPctText: String get() = if (demo) WEEK_PCT else signedPct(allTimeGain / PAPER_START * 100)

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
		com.stak.demo.data.StakStore.getString("portfolio")?.let { runCatching { restore(org.json.JSONObject(it)) } }
	}

	// ---- persistence ------------------------------------------------------------------------
	private fun persist() {
		val o = org.json.JSONObject()
		o.put("cash", cash)
		o.put("positions", org.json.JSONArray().also { arr ->
			positions.forEach { p -> arr.put(org.json.JSONObject().put("spec", specJson(p.spec)).put("row", org.json.JSONObject().put("badge", p.row.badge).put("ticker", p.row.ticker).put("sub", p.row.sub).put("amount", p.row.amount).put("pct", p.row.pct).put("up", p.row.up))) }
		})
		o.put("realized", org.json.JSONArray().also { arr ->
			realized.forEach { r -> arr.put(org.json.JSONObject().put("badge", r.badge).put("ticker", r.ticker).put("sub", r.sub).put("amount", r.amount).put("up", r.up)) }
		})
		com.stak.demo.data.StakStore.putString("portfolio", o.toString())
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
		get() = baseValue + (cash - baseCash) + (positions.sumOf { it.stake } - baseHoldings)

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
		val held = positions.firstOrNull { it.spec.symbol == spec.symbol }
		if (held != null) {
			// A top-up grows the COST basis by the money put in ($100 + $25 ->
			// "$125"), not the current value; weekGain stays. Mirrors ios.
			val basis = held.spec.stakeBasis.removePrefix("$").replace(",", "").toDoubleOrNull() ?: 0.0
			val grown = held.copy(
				spec = held.spec.copy(
					shares = String.format(Locale.US, "%.4f", (held.spec.shares.toDoubleOrNull() ?: 0.0) + shares),
					stakeValue = usd(held.stake + amount),
					stakeBasis = stakeLabel(basis + amount),
				),
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
	fun sell(symbol: String): Boolean {
		val held = positions.firstOrNull { it.spec.symbol == symbol } ?: return false
		positions = positions.filterNot { it === held }
		cash += held.stake
		val banked = !held.spec.gain.startsWith("-")
		val sold = Realized(
			badge = held.spec.badge,
			ticker = symbol,
			sub = "Sold ${today()} · ${if (banked) "profit banked" else "loss realized"}",
			amount = held.spec.gain,
			up = banked,
		)
		realized = listOf(sold) + realized
		persist()
		return true
	}
}
