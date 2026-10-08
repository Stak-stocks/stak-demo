package com.stak.demo.ui.simulate

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.stak.demo.data.SandboxPositionDto
import com.stak.demo.data.StockRepository
import com.stak.demo.ui.discover.BuySpec
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
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

	/** "$100" -> 100.0: what the position cost, the fixed point live gain is measured from. */
	val costBasis: Double get() = parseUsd(spec.stakeBasis)

	private val sharesCount: Double get() = spec.shares.toDoubleOrNull() ?: 0.0

	/**
	 * Today's quote for this pick - null for the demo (its numbers carry no live price
	 * behind them) or before the first refresh lands for a real one.
	 */
	private val liveQuote: Pair<Double, Double>? get() = if (PaperPortfolio.demo) null else com.stak.demo.data.LiveQuotes.cached(spec.symbol)

	/** The position's real-time market value: shares at today's price, falling back to the stored stake until a quote lands. */
	val liveValue: Double get() = liveQuote?.let { it.first * sharesCount } ?: stake

	/**
	 * The row's gain in dollars - a real position's shares at today's live price, less
	 * its cost basis, so the paper stake actually "tracks the move live" the way the
	 * app's own copy promises; "+$24.00" -> 24.0 (review 2026-09-04) for the demo's
	 * seeded rows, which have no live price behind them.
	 */
	val gainDollars: Double get() {
		val quote = liveQuote
		if (quote != null) return quote.first * sharesCount - costBasis
		val unsigned = parseUsd(row.amount.removePrefix("-").removePrefix("+"))
		return if (row.amount.startsWith("-")) -unsigned else unsigned
	}

	/** [row], re-priced off today's quote for a real position - amount, percent and up/down; the demo's authored row unchanged. */
	val liveRow: SimPick get() {
		val quote = liveQuote ?: return row
		val gain = quote.first * sharesCount - costBasis
		val pct = if (costBasis > 0.0) gain / costBasis * 100.0 else 0.0
		val up = gain > -0.005
		// "Picked Sep 4 · up 40% since" moves with the amount beside it, not frozen at the last full read.
		val picked = row.sub.substringBefore(" · ")
		val sub = if (picked.startsWith("Picked")) "$picked · ${if (up) "up" else "down"} ${String.format(Locale.US, "%.0f", abs(pct))}% since" else row.sub
		return row.copy(amount = PaperPortfolio.signedUsd(gain), pct = String.format(Locale.US, "%+.1f%%", pct), up = up, sub = sub)
	}

	/** [spec], re-priced off today's quote for a real position - Price now, the gain (dollars and percent), up/down and position value; the demo's authored spec unchanged. */
	val liveSpec: PickSpec get() {
		val quote = liveQuote ?: return spec
		val gain = quote.first * sharesCount - costBasis
		val pct = if (costBasis > 0.0) abs(gain / costBasis * 100.0) else 0.0
		return spec.copy(
			priceNow = PaperPortfolio.usd(quote.first),
			gain = PaperPortfolio.signedUsd(gain),
			gainPct = String.format(Locale.US, "%.1f%%", pct),
			up = gain > -0.005,
			stakeValue = PaperPortfolio.usd(quote.first * sharesCount),
			dayChange = (if (quote.second >= 0.0) "▲ " else "▼ ") + String.format(Locale.US, "%.1f", abs(quote.second)) + "%",
		)
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
	/** A sale's average cost as the server recorded it (null on buys, older sales and the demo's ledger). */
	val costBasis: Double? = null,
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
 * every host move the same cash and rows the Simulate, Portfolio and Pick
 * detail pages read. Mirrors
 * ios/StakDemo/Simulate/PaperPortfolio.swift.
 *
 * Backend unification (2026-09-25): a real (non-demo) account's cash, positions,
 * open orders and trade log are no longer a local-only ledger - they're hydrated
 * from and mutated through the sandbox endpoints (the same backend web's Simulate uses).
 * Every mutating function keeps its existing synchronous signature and applies its
 * local optimistic update exactly as before (so every call site - DiscoverBuyFlow,
 * SellFlowHost, PortfolioSetupCard, TradeHistory's Cancel - needs no changes at all),
 * then fires the real request in the background and reconciles with [hydrate] once
 * it resolves, the same fire-and-forget pattern DeviceStateSync already uses. The
 * demo persona is untouched - it never goes near [repository].
 */
internal object PaperPortfolio {
	private var repository: StockRepository? = null
	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
	private val marketZone = ZoneId.of("America/New_York")

	fun init(repo: StockRepository) {
		repository = repo
	}

	/** The paper stake everyone starts on ("on $10,000 paper", 1:3898). */
	const val PAPER_START = 10000.0

	/**
	 * What the account started with - the gains are measured from it (web usePaperPortfolio). Every set-up portfolio
	 * has its start since the one-money-system migration; assuming $10,000 once made a $3,000 one show -$7,000. Not
	 * set up yet: the amount a first trade would start it on (never an XP-tier figure - those are retired).
	 */
	private fun startingCash(portfolio: com.stak.demo.data.SandboxPortfolioResponse): Double =
		if (portfolio.initialized) portfolio.start ?: DEFAULT_SETUP_BALANCE else DEFAULT_SETUP_BALANCE
	/** What an account that trades before setting up is called (Codex review, PR #167 mirror). */
	const val DEFAULT_PORTFOLIO_NAME = "My first portfolio"
	const val DEFAULT_STRATEGY = "Balanced"

	/**
	 * Portfolio setup (FigJam Simulate board, 2026-09-14: Choose balance, Name,
	 * Strategy). A NEW account picks its starting balance before its first
	 * trade; the demo persona is the authored $10,000 portfolio. A real account's
	 * setup is persisted server-side (free-choice, same model as web's Simulate).
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
	 * When each held stock was first bought (epoch millis) - "This week" measures from the buy when it was this week,
	 * not from a week start the account didn't hold it at.
	 */
	var pickedAt by mutableStateOf<Map<String, Long>>(emptyMap())
		private set
	/**
	 * A read of this account has landed. Until it has, nothing about the portfolio is known - least of all that it
	 * needs setting up: a failed first read once showed the setup card to a funded portfolio, and submitting it
	 * erases the account's positions and trades on the server.
	 */
	var hasHydrated by mutableStateOf(false)
		private set

	/**
	 * True until a real account's first read of its ledger lands - SimulateScreen holds the hero
	 * back meanwhile. Later reads (the 15s poll, the re-read after a trade) don't set it: the hero
	 * (and its chart cache, and a setup name being typed) stays put while they run.
	 */
	var loading by mutableStateOf(false)
		private set

	/**
	 * Set when a real account's background buy/sell/setup/limit-order/cancel request
	 * actually failed server-side - buy()/sell()/etc. already applied their optimistic
	 * local update and returned before this can be known, so this is the only signal the
	 * UI gets that what it just showed as done didn't really happen (the next hydrate()
	 * silently corrects the numbers regardless; this at least explains why they moved).
	 */
	var lastError by mutableStateOf<String?>(null)
		private set

	fun dismissError() {
		lastError = null
	}

	/**
	 * Runs a real account's background mutation, then reconciles with the server via hydrate()
	 * either way - on success clears any previous error, on failure sets [lastError] instead of
	 * failing silently. A 4xx carries the server's own reason (e.g. a limit order the live price
	 * has already crossed, which the ticket's cached quote couldn't know); anything else gets a
	 * generic retry line. True when the request succeeded.
	 */
	private suspend fun runMutation(action: suspend () -> Unit): Boolean {
		val failure = runCatching { action() }.exceptionOrNull()
		val message = failure?.let { serverReason(it) ?: "That didn't go through — try again" }
		withContext(Dispatchers.Main) { lastError = message }
		hydrate()
		return failure == null
	}

	/** The last change sent to the server: each waits for the one before, so a buy then a quick sell arrive in order. */
	private var lastChange: kotlinx.coroutines.Job? = null

	/**
	 * Sends a real account's change after any change still on its way (runMutation does the
	 * request and the reconcile); [then] hears whether it went through. A read already in flight
	 * predates the change, so it's discarded rather than landing over it.
	 */
	private fun send(action: suspend () -> Unit, then: (suspend (Boolean) -> Unit)? = null) {
		hydrateGeneration.incrementAndGet()
		val previous = lastChange
		lastChange = scope.launch {
			previous?.join()
			val ok = runMutation(action)
			then?.invoke(ok)
		}
	}

	private fun serverReason(e: Throwable): String? {
		if ((e as? retrofit2.HttpException)?.code() !in 400..499) return null
		val body = com.stak.demo.data.httpErrorBody(e) ?: return null
		return runCatching { org.json.JSONObject(body).optString("error") }.getOrNull()?.takeIf { it.isNotBlank() }
	}

	/** The setup card shows until a real account has set up (server-confirmed or the local default from ensureSetup()). */
	val needsSetup: Boolean get() = !demo && hasHydrated && !setupDone

	/**
	 * An order placed before the setup card was used records the default setup with it
	 * (Codex review, PR #167 mirror): the card never hides on an account that reads as
	 * unset, and the hero's name line has something true to say. For a real account this
	 * also tells the server, sequentially before the mutation that triggered it (buy()/
	 * placeLimit() await both in the same coroutine, so the setup always lands first).
	 */
	private fun ensureSetup(): Boolean {
		// Only for an account the server has said is new - never on a guess before its first read (a setup erases).
		if (demo || !hasHydrated || setupDone) return false
		paperStart = DEFAULT_SETUP_BALANCE
		portfolioName = DEFAULT_PORTFOLIO_NAME
		strategy = DEFAULT_STRATEGY
		setupDone = true
		return true
	}

	fun setup(balance: Double, name: String, strategy: String) {
		if (!needsSetup) return
		paperStart = balance
		cash = balance
		baseValue = balance
		baseCash = balance
		portfolioName = name
		this.strategy = strategy
		setupDone = true
		positions = emptyList()
		pickedAt = emptyMap()
		realized = emptyList()
		trades = emptyList()
		openOrders = emptyList()
		baseHoldings = 0.0
		persist()
		if (!demo) send({ repository?.sandboxSetup(balance, name, strategyToId(strategy)) })
	}

	/** Every buy and sell, newest first (FigJam: Trade history). */
	var trades by mutableStateOf(listOf<Trade>())
		private set

	/** Limit orders waiting for their price, newest first (FigJam: Order pending). */
	var openOrders by mutableStateOf(listOf<OpenOrder>())
		private set

	// One set of week figures for the hero - audit item 6 (they used to disagree
	// with the now-removed board card and leaderboard).
	const val WEEK_GAIN = "+$186"
	const val WEEK_PCT = "+1.9%"

	/** Authored "+$240.00 all time" (1:3898). */
	/** All-time gain = today's value over the paper start (the demo's authored $240 falls out of its $10,240). */
	val allTimeGain: Double get() = portfolioValue - paperStart

	/** The authored demo account, or a fresh one (product audit, 2026-09-05). */
	var demo by mutableStateOf(true)
		private set

	/** The hero's gain line: the demo's authored week, a real account's gain since it started (labelled all time). */
	val weekUp: Boolean get() = if (demo) true else allTimeGain > -0.005
	/** "this week" for the demo's authored figure; a real account's line is its gain since it started. */
	val gainPeriodLabel: String get() = if (demo) "this week" else "all time"
	val weekGainText: String get() = if (demo) WEEK_GAIN else signedWhole(allTimeGain)
	val weekPctText: String get() = if (demo) WEEK_PCT else signedPct(allTimeGain / paperStart * 100)

	// The share buttons' lines (pick page, portfolio page): the return in percent, never the dollars. The demo's
	// authored numbers aren't anyone's, and an empty portfolio has nothing to tell - both share the invite.
	/** A pick's line - "just picked" while its gain still reads 0.0%. */
	fun pickShareText(spec: PickSpec): String = when {
		demo -> com.stak.demo.ui.profile.STAK_INVITE_TEXT
		spec.gainPct == "0.0%" -> "I just picked ${spec.symbol} on STAK. $SHARE_TAIL"
		else -> "I'm paper trading ${spec.symbol} on STAK - ${if (spec.up) "up" else "down"} ${spec.gainPct} since I picked it. $SHARE_TAIL"
	}

	/** The portfolio's line - its all-time return. */
	val portfolioShareText: String
		get() {
			if (demo || (positions.isEmpty() && realized.isEmpty())) return com.stak.demo.ui.profile.STAK_INVITE_TEXT
			val pct = allTimeGain / paperStart * 100
			val shown = String.format(Locale.US, "%.1f", kotlin.math.abs(pct))
			val move = if (shown == "0.0") "even" else "${if (pct > 0) "up" else "down"} $shown%"
			return "My STAK paper portfolio is $move so far. $SHARE_TAIL"
		}

	private const val SHARE_TAIL = "Practice investing with paper money: https://thestak.org"

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

	/** Seeds the authored demo history, or (real account) clears to a loading shell and hydrates from the server. */
	fun reset(demo: Boolean) {
		this.demo = demo
		// A read still in flight for the previous account must not land in this one, nor its error show.
		hydrateGeneration.incrementAndGet()
		lastError = null
		if (demo) {
			paperStart = PAPER_START
			portfolioName = "Hamza’s paper"
			strategy = "Balanced"
			setupDone = true
			hasHydrated = true
			openOrders = emptyList()
			trades = seedTrades()
			cash = SEED_CASH
			positions = SEED_ROWS.map { row -> Position(PICK_SPECS.first { it.symbol == row.ticker }, row) }
			realized = listOf(
				Realized("S", "SHOP", "Sold May 30 · profit banked", "+$12.00", true),
				Realized("C", "COIN", "Sold Jun 15 · loss realized", "-$8.00", false),
			)
			baseValue = AUTHORED_VALUE
			baseCash = SEED_CASH
			baseHoldings = positions.sumOf { it.stake }
			// The persisted ledger (buys, sells, cash) wins over the seed - product audit
			// 2026-09-05; a demo ledger persisted before the trade log existed reseeds once
			// with its authored history; the next persist() rewrites it in the current shape.
			com.stak.demo.data.StakStore.getString("portfolio")?.let { runCatching { val o = org.json.JSONObject(it); if (o.has("trades")) restore(o) } }
			return
		}
		// Real account: the local JSON ledger is retired (2026-09-25 unification) - the
		// server is the only source of truth now. cash = 0 until hydrate() confirms either
		// way, so nothing can be bought against a stale/guessed number in the interim.
		paperStart = PAPER_START
		portfolioName = ""
		strategy = ""
		setupDone = false
		hasHydrated = false
		cash = 0.0
		positions = emptyList()
		pickedAt = emptyMap()
		realized = emptyList()
		trades = emptyList()
		openOrders = emptyList()
		baseValue = 0.0
		baseCash = 0.0
		baseHoldings = 0.0
		// Set synchronously, not left for hydrate()'s own coroutine to flip a moment later -
		// SimulateScreen gates the setup card / hero on this so neither ever renders against
		// these placeholder values in the gap before that coroutine actually starts.
		loading = true
		serverTrades = emptyList()
		serverTradeCursor = null
		refresh()
	}

	/** Real accounts only - re-pulls cash/positions/orders/trades from the server. Fire-and-forget (Compose state updates reactively once it resolves); safe to call repeatedly (e.g. on tab re-entry). */
	fun refresh() {
		if (demo || repository == null) return
		scope.launch { hydrate() }
	}

	// Rapid back-to-back mutations (e.g. buy then immediately sell) each launch their own
	// hydrate() independently, and their network round-trips can resolve out of order.
	// Every call claims the next generation; before applying, a call checks it's still the
	// latest one issued - an older hydrate that happens to finish last is discarded rather
	// than clobbering the newer snapshot a still-in-flight (or already-applied) call has.
	private val hydrateGeneration = java.util.concurrent.atomic.AtomicLong(0)

	// The last ledger pulled from the server and the newest-trade id it was current as of.
	// Kept apart from [trades] (which buy()/sell() also edit optimistically) so a failed
	// mutation's guessed row can't be mistaken for server truth when a poll reuses it.
	@Volatile private var serverTrades: List<Trade> = emptyList()
	@Volatile private var serverTradeCursor: Long? = null

	// One read at a time: a call while one runs asks for one more read after it, and waits for it.
	private val hydrateLock = kotlinx.coroutines.sync.Mutex()
	@Volatile private var readAgain = false

	private suspend fun hydrate() {
		if (demo || repository == null) return
		if (!hydrateLock.tryLock()) {
			readAgain = true
			hydrateLock.lock()
			hydrateLock.unlock()
			return
		}
		try {
			do {
				readAgain = false
				hydrateOnce()
			} while (readAgain && !demo)
		} finally {
			hydrateLock.unlock()
		}
	}

	/** Company names already read - the ledger carries only tickers, and a name doesn't change. */
	private val names = java.util.concurrent.ConcurrentHashMap<String, String>()

	private suspend fun hydrateOnce() {
		val repo = repository ?: return
		if (demo) return
		val myGeneration = hydrateGeneration.incrementAndGet()
		val fetched = runCatching {
			val portfolio = repo.getSandboxPortfolio()
			// The ledger only changes when a trade lands, and /portfolio says whether one did
			// (its newest trade's id) - so a poll that finds it unchanged skips the up-to-100-row pull.
			val unchanged = portfolio.tradeCursor != null && portfolio.tradeCursor == serverTradeCursor
			// 500 like web: a ledger cut short drops the oldest buys the realized gains and the chart are replayed from.
			val tradesResp = if (unchanged) null else repo.getSandboxTrades(500)
			portfolio to tradesResp
		}.getOrNull()
		// A failed read leaves the last known state. Before any has landed, the page keeps loading (the poll retries)
		// rather than settle on an empty account that looks like it needs setting up.
		if (fetched == null) {
			if (myGeneration == hydrateGeneration.get() && hasHydrated) withContext(Dispatchers.Main) { loading = false }
			return
		}
		val (portfolio, tradesResp) = fetched

		val mappedTrades = tradesResp?.trades?.map { t ->
			Trade(
				side = t.side.uppercase(Locale.US), symbol = t.ticker, badge = t.ticker.take(1),
				amount = t.amount, shares = t.shares, price = t.price,
				day = dayLabelOf(t.executedAt), epochDay = epochDayOf(t.executedAt),
				costBasis = t.costBasis,
			)
		} ?: serverTrades
		val mappedOrders = portfolio.openOrders.map { o ->
			OpenOrder(id = o.id.toString(), symbol = o.ticker, badge = o.ticker.take(1), name = o.ticker, amount = o.amount, limit = o.limitPrice, change = "", day = dayLabelOf(o.createdAt))
		}
		// One batched quote request for whatever isn't already warm in LiveQuotes (the same
		// cache SimulateScreen's own 15s poll keeps filled) - not a per-position /api/stock/{symbol}
		// call on every hydrate, which would needlessly re-fetch each position's unchanging
		// company name and fundamentals just to read its price.
		val missingQuotes = portfolio.positions.map { it.ticker }.distinct().filter { com.stak.demo.data.LiveQuotes.cached(it) == null }
		if (missingQuotes.isNotEmpty()) com.stak.demo.data.LiveQuotes.refresh(missingQuotes)
		// The names from what the saves already know, fetched only for a ticker never named before -
		// not a full stock read per position on every 15s poll.
		val unnamed = portfolio.positions.map { it.ticker }.distinct().filter { !names.containsKey(it) && com.stak.demo.data.MyStakHoldings.nameOf(it) == null }
		coroutineScope {
			unnamed.map { t -> async { runCatching { repo.getStock(t).name }.getOrNull()?.takeIf { it.isNotBlank() }?.let { names[t] = it } } }.awaitAll()
		}
		val mappedPositions = portfolio.positions.map { p ->
			buildPosition(p, names[p.ticker] ?: com.stak.demo.data.MyStakHoldings.nameOf(p.ticker) ?: p.ticker)
		}
		val mappedRealized = computeRealized(mappedTrades)
		val holdings = mappedPositions.sumOf { it.stake }
		val resolvedCash = if (portfolio.initialized) (portfolio.cash ?: 0.0) else DEFAULT_SETUP_BALANCE

		if (myGeneration != hydrateGeneration.get()) return

		withContext(Dispatchers.Main) {
			serverTrades = mappedTrades
			serverTradeCursor = portfolio.tradeCursor
			setupDone = portfolio.initialized
			hasHydrated = true
			cash = resolvedCash
			paperStart = startingCash(portfolio)
			portfolioName = portfolio.name ?: ""
			strategy = strategyFromId(portfolio.strategy)
			positions = mappedPositions
			pickedAt = portfolio.positions.groupBy { it.ticker }.mapValues { (_, ps) -> ps.minOf { epochMillisOf(it.addedAt) } }
			trades = mappedTrades
			openOrders = mappedOrders
			realized = mappedRealized
			baseHoldings = holdings
			baseCash = resolvedCash
			baseValue = resolvedCash + holdings
			loading = false
		}
	}

	/** A held position's display spec, from the server's ticker/shares/cost basis plus today's cached quote - valued at its cost basis until a quote lands. */
	private fun buildPosition(p: SandboxPositionDto, name: String): Position {
		val quote = com.stak.demo.data.LiveQuotes.cached(p.ticker)
		val price = quote?.first?.takeIf { it > 0.0 } ?: p.costBasis
		val badge = p.ticker.take(1)
		val stakeBasisTotal = p.costBasis * p.shares
		val currentValue = price * p.shares
		val gain = currentValue - stakeBasisTotal
		val gainPctAbs = if (stakeBasisTotal > 0.0) abs(gain / stakeBasisTotal * 100.0) else 0.0
		val dayChangePct = quote?.second ?: 0.0
		val pickedDay = dayLabelOf(p.addedAt)
		val spec = PickSpec(
			symbol = p.ticker, badge = badge, company = name,
			priceNow = usd(price),
			pickedLine = "Picked $pickedDay at ${usd(p.costBasis)}",
			priceThen = usd(p.costBasis),
			gain = signedUsd(gain),
			gainPct = String.format(Locale.US, "%.1f%%", gainPctAbs),
			up = gain > -0.005,
			shares = String.format(Locale.US, "%.4f", p.shares),
			stakeValue = usd(currentValue),
			vsMarket = "Even",
			ahead = true,
			// No quote yet: the day's move is unknown ("—"), not "▲ 0.0%".
			dayChange = if (quote == null) "—" else (if (dayChangePct >= 0.0) "▲ " else "▼ ") + String.format(Locale.US, "%.1f", abs(dayChangePct)) + "%",
			stakeBasis = stakeLabel(stakeBasisTotal),
			weekGain = "+$0.00",
		)
		val row = SimPick(
			badge = badge, ticker = p.ticker,
			sub = "Picked $pickedDay · ${if (gain > -0.005) "up" else "down"} ${String.format(Locale.US, "%.0f", gainPctAbs)}% since",
			amount = signedUsd(gain),
			pct = String.format(Locale.US, "%+.1f%%", if (gain > -0.005) gainPctAbs else -gainPctAbs),
			up = gain > -0.005,
		)
		return Position(spec, row)
	}

	/**
	 * Realized gains for the SOLD · REALIZED list, replayed from the trade ledger itself
	 * (the server doesn't store a per-sale P&L) using the same weighted-average cost
	 * basis the backend's own /buy applies, so a sale's banked gain is measured against
	 * what was actually paid for those shares, not their price at some other time.
	 *
	 * [newestFirst] must be exact-timestamp order (as GET /trades returns it) - simply
	 * reversed to get true chronological order. Re-sorting by [Trade.epochDay] instead
	 * (day granularity only) would leave two same-day trades in their newest-first input
	 * order via sortedBy's stable sort, silently processing a same-day sell before its
	 * own buy.
	 */
	private fun computeRealized(newestFirst: List<Trade>): List<Realized> {
		val chronological = newestFirst.asReversed()
		val sharesHeld = mutableMapOf<String, Double>()
		val costBasisPerShare = mutableMapOf<String, Double>()
		val out = mutableListOf<Realized>()
		for (t in chronological) {
			if (t.isBuy) {
				val prevShares = sharesHeld.getOrDefault(t.symbol, 0.0)
				val prevBasis = costBasisPerShare.getOrDefault(t.symbol, 0.0)
				val newShares = prevShares + t.shares
				costBasisPerShare[t.symbol] = if (newShares > 0.0) (prevBasis * prevShares + t.price * t.shares) / newShares else t.price
				sharesHeld[t.symbol] = newShares
			} else {
				// The server's own cost for the sale first: a position bought before the ledger (or past the page read)
				// replayed to a basis of $0 or the last logged buy, and showed a loss as a profit.
				val basis = t.costBasis ?: costBasisPerShare[t.symbol] ?: t.price
				val gain = (t.price - basis) * t.shares
				sharesHeld[t.symbol] = (sharesHeld[t.symbol] ?: 0.0) - t.shares
				// Sold out (the server lets a sale exceed the holding by a thousandth): the next buy starts a fresh basis.
				if ((sharesHeld[t.symbol] ?: 0.0) <= 1e-6) { sharesHeld[t.symbol] = 0.0; costBasisPerShare.remove(t.symbol) }
				out.add(Realized(badge = t.badge, ticker = t.symbol, sub = "Sold ${t.day} · ${if (gain > -0.005) "profit banked" else "loss realized"}", amount = signedUsd(gain), up = gain > -0.005))
			}
		}
		return out.reversed()
	}

	private fun dayLabelOf(iso: String): String =
		runCatching { Instant.parse(iso).atZone(marketZone).toLocalDate().format(DateTimeFormatter.ofPattern("MMM d", Locale.US)) }.getOrDefault("")

	private fun epochMillisOf(iso: String): Long =
		runCatching { Instant.parse(iso).toEpochMilli() }.getOrDefault(0L)

	private fun epochDayOf(iso: String): Long =
		runCatching { Instant.parse(iso).atZone(marketZone).toLocalDate().toEpochDay() }.getOrDefault(0L)

	/** "Balanced" <-> "balanced" - Android's capitalized label, the backend's lowercase id. */
	private fun strategyToId(label: String): String = label.lowercase(Locale.US)
	private fun strategyFromId(id: String?): String = id?.replaceFirstChar { it.uppercase(Locale.US) } ?: ""

	private fun seedTrades(): List<Trade> {
		val buys = SEED_ROWS.map { row ->
			val spec = PICK_SPECS.first { it.symbol == row.ticker }
			Trade("BUY", row.ticker, row.badge, parseUsd(spec.stakeBasis), spec.shares.toDoubleOrNull() ?: 0.0, parseUsd(spec.priceThen), row.sub.substringAfter("Picked ").substringBefore(" ·"), 0L)
		}
		val sells = listOf(
			Trade("SELL", "SHOP", "S", 112.0, 1.4, 80.0, "May 30", 0L),
			Trade("SELL", "COIN", "C", 92.0, 0.5, 184.0, "Jun 15", 0L),
		)
		return sells + buys
	}

	private fun recordTrade(side: String, symbol: String, badge: String, amount: Double, shares: Double, price: Double) {
		// US Eastern, as the server dates it - a local date re-keyed the history chart when the server's row replaced it.
		trades = listOf(Trade(side, symbol, badge, amount, shares, price, today(), LocalDate.now(marketZone).toEpochDay())) + trades
	}

	/** True when the cash on hand covers the stake reserved for a limit order too. */
	fun placeLimit(spec: BuySpec, amount: Double, limit: Double): Boolean {
		if (!canBuy(amount) || limit <= 0.0) return false
		val neededSetup = ensureSetup()
		cash -= amount
		openOrders = listOf(OpenOrder("${spec.symbol}-${System.currentTimeMillis()}", spec.symbol, spec.badge, spec.name, amount, limit, spec.change, today())) + openOrders
		persist()
		if (!demo) send({
			if (neededSetup) repository?.sandboxSetup(DEFAULT_SETUP_BALANCE, DEFAULT_PORTFOLIO_NAME, strategyToId(DEFAULT_STRATEGY))
			repository?.sandboxPlaceOrder(spec.symbol, amount, limit)
		})
		return true
	}

	/**
	 * Canceling an open order releases its reserved stake. An order the server hasn't numbered yet
	 * (placed a moment ago) can't be canceled there - it says so instead of releasing the stake here
	 * only to have the next read take it again.
	 */
	fun cancelOrder(id: String) {
		val order = openOrders.firstOrNull { it.id == id } ?: return
		val serverId = id.toLongOrNull()
		if (!demo && serverId == null) {
			lastError = "That order is still being placed — try again in a moment"
			return
		}
		openOrders = openOrders.filterNot { it.id == id }
		cash += order.amount
		persist()
		if (!demo && serverId != null) send({ repository?.sandboxCancelOrder(serverId) })
	}

	// ---- persistence ------------------------------------------------------------------------
	// Real accounts no longer keep a local ledger copy (2026-09-25 unification) - the server
	// is the only source of truth, hydrated via refresh()/hydrate(). The demo persona is
	// untouched: still a local StakStore-backed JSON blob, exactly as before.
	private fun persist() {
		if (!demo) {
			com.stak.demo.data.DeviceStateSync.push()
			return
		}
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
		com.stak.demo.data.StakStore.putString("portfolio", o.toString())
		com.stak.demo.data.DeviceStateSync.push()
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
			baseValue = AUTHORED_VALUE
			baseCash = SEED_CASH
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

	// The sign is the shown figure's: a gain that rounds to nothing reads "+$0", never a red "-$0" (cost rounding
	// leaves a first buy a fraction of a cent down).
	/** What a range pill covers, as the change line under a chart says it ("past 3 months"). */
	fun rangeWord(range: String): String = when (range.uppercase(Locale.US)) {
		"1D" -> "today"
		"1W" -> "this week"
		"1M" -> "past month"
		"3M" -> "past 3 months"
		"YTD" -> "this year"
		"1Y" -> "past year"
		else -> ""
	}

	/**
	 * The change line under a chart for the selected range: "▲ +$12.30 (+3.8%) past 3 months". 1D's is the last
	 * session's move before the open and at weekends - "on Friday", not "today" (StakClock.sessionChange).
	 */
	fun rangeLine(money: String, pct: Double, up: Boolean, range: String): String =
		com.stak.demo.data.StakClock.sessionChange("${if (up) "▲" else "▼"} $money (${signedPct(pct)}) ${rangeWord(range)}")

	/** "vs S&P 500": how far the stock's move was ahead of or behind SPY's, in words ("3.6% behind"). */
	fun versusWords(versus: Double): String =
		if (kotlin.math.abs(versus) < 0.05) "Even" else String.format(Locale.US, "%.1f%% %s", kotlin.math.abs(versus), if (versus > 0) "ahead" else "behind")

	fun signedWhole(amount: Double): String = (if (Math.round(amount) < 0) "-$" else "+$") + String.format(Locale.US, "%,.0f", kotlin.math.abs(amount))
	fun signedUsd(amount: Double): String = (if (Math.round(amount * 100) < 0) "-" else "+") + usd(kotlin.math.abs(amount))
	fun signedPct(pct: Double): String {
		val shown = Math.round(pct * 10) / 10.0
		return String.format(Locale.US, "%+.1f%%", if (shown == 0.0) 0.0 else shown)
	}
	fun wholeUsd(amount: Double): String = "$" + String.format(Locale.US, "%,.0f", amount)

	/**
	 * The authored $10,240.00 plus every move since: a buy swaps cash for
	 * stake at cost and a sell swaps stake back at value. The demo serves no
	 * live prices, so its seeded holdings hold at their authored stake; a
	 * real account's holdings are marked at today's live price instead
	 * (Position.liveValue), so the hero figure moves with the market.
	 */
	val portfolioValue: Double
		// A reserved limit stake is still the account's money until it fills or is cancelled (review 2026-09-14).
		get() = baseValue + (cash - baseCash) + (positions.sumOf { it.liveValue } - baseHoldings) + openOrders.sumOf { it.amount }

	val pickCount: Int get() = positions.size

	/** Today's shares by symbol - where the history chart's backward replay starts. */
	val heldShares: Map<String, Double>
		get() = positions.groupBy { it.spec.symbol }.mapValues { (_, ps) -> ps.sumOf { it.spec.shares.toDoubleOrNull() ?: 0.0 } }

	/** Cash plus the open limit orders' reserved stakes - the account's money that isn't in shares. */
	val uninvested: Double get() = cash + openOrders.sumOf { it.amount }

	fun holds(symbol: String): Boolean = positions.any { it.spec.symbol == symbol }

	/** The tapped pick's numbers, re-priced off today's quote for a real account (Position.liveSpec) - the demo's authored spec unchanged. */
	fun pickSpec(symbol: String): PickSpec? = positions.firstOrNull { it.spec.symbol == symbol }?.liveSpec

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
		val neededSetup = ensureSetup()
		// A bought stock is in your STAK (Codex review, PR #167 mirror): the receipt's
		// "View in My STAK" lands on a page that lists it, not on an empty one. A real
		// account adds it only once the server has confirmed the buy (below), so a
		// rejected order can't leave a saved stock with no position behind it.
		if (demo) com.stak.demo.data.MyStakHoldings.add(spec.symbol)
		val price = spec.price
		// A real account's buy as the server fills it: shares rounded DOWN to a thousandth, the cost those shares at
		// the price to the cent (sandbox.ts /buy) - the receipt and cash read the server's numbers, not the amount
		// typed. The demo keeps its round stakes.
		val shares = if (price > 0.0) (if (demo) amount / price else kotlin.math.floor(amount / price * 1000) / 1000) else 0.0
		val cost = if (demo) amount else Math.round(price * shares * 100) / 100.0
		cash -= cost
		recordTrade("BUY", spec.symbol, spec.badge, cost, shares, price)
		val held = positions.firstOrNull { it.spec.symbol == spec.symbol }
		if (held != null) {
			// A top-up grows the COST basis by the money put in ($100 + $25 ->
			// "$125"), not the current value; weekGain stays. Mirrors ios.
			val basis = held.spec.stakeBasis.removePrefix("$").replace(",", "").toDoubleOrNull() ?: 0.0
			val newBasis = basis + cost
			// The return is recomputed over the new basis: $24 on $100 was 24%, on
			// $200 it is 12% (Codex review, PR #166). The dollar gain itself stands.
			val gainAmt = held.spec.gain.filter { it.isDigit() || it == '.' }.toDoubleOrNull() ?: 0.0
			val pctText = String.format(Locale.US, "%.1f%%", if (newBasis > 0.0) gainAmt / newBasis * 100.0 else 0.0)
			val grown = held.copy(
				spec = held.spec.copy(
					shares = String.format(Locale.US, "%.4f", (held.spec.shares.toDoubleOrNull() ?: 0.0) + shares),
					stakeValue = usd(held.stake + cost),
					stakeBasis = stakeLabel(newBasis),
					gainPct = pctText,
				),
				row = held.row.copy(pct = (if (held.spec.up) "+" else "-") + pctText),
			)
			positions = positions.map { if (it === held) grown else it }
			persist()
		} else {
			// Its buy moment until the server's own reaches the next read.
			if (spec.symbol !in pickedAt) pickedAt = pickedAt + (spec.symbol to System.currentTimeMillis())
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
					stakeValue = usd(cost),
					// Short on purpose (device report, 2026-09-18): the stat's own label already
					// says "vs the market" - "Even with the market" wrapped inside the fixed-height
					// cell and its second line got clipped, reading as the cut-off "Even with the".
					vsMarket = "Even",
					ahead = true,
					dayChange = spec.change,
					stakeBasis = stakeLabel(cost),
					weekGain = "+$0.00",
				),
				row = SimPick(spec.badge, spec.symbol, "Picked $day · just bought", "+$0.00", "+0.0%", true),
			)
			positions = listOf(fresh) + positions
			persist()
		}
		if (!demo) send(
			{
				if (neededSetup) repository?.sandboxSetup(DEFAULT_SETUP_BALANCE, DEFAULT_PORTFOLIO_NAME, strategyToId(DEFAULT_STRATEGY))
				repository?.sandboxBuy(spec.symbol, amount)
			},
			then = { ok -> if (ok) withContext(Dispatchers.Main) { com.stak.demo.data.MyStakHoldings.add(spec.symbol) } },
		)
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
		// Live for a real account (today's quote), the authored spec for the demo -
		// what actually returns to cash and what the SOLD row banks.
		val live = held.liveSpec
		val banked = held.gainDollars >= 0.0
		val sub = "Sold ${today()} · ${if (banked) "profit banked" else "loss realized"}"
		recordTrade("SELL", symbol, held.spec.badge, held.liveValue * p, (held.spec.shares.toDoubleOrNull() ?: 0.0) * p, parseUsd(live.priceNow))
		if (p >= 0.999) {
			positions = positions.filterNot { it === held }
			pickedAt = pickedAt - symbol
			cash += held.liveValue
			realized = listOf(Realized(badge = held.spec.badge, ticker = symbol, sub = sub, amount = live.gain, up = banked)) + realized
		} else {
			// A partial sell - the Half / Custom chips (Codex review, PR #167): the sold
			// slice returns to cash and banks its share of the gain; the rest of the
			// position stays, scaled.
			val keep = 1.0 - p
			val gain = held.gainDollars
			val basis = held.costBasis
			cash += held.liveValue * p
			val rest = held.copy(
				spec = held.spec.copy(
					shares = String.format(Locale.US, "%.4f", (held.spec.shares.toDoubleOrNull() ?: 0.0) * keep),
					stakeValue = usd(held.liveValue * keep),
					stakeBasis = stakeLabel(basis * keep),
					gain = signedUsd(gain * keep),
				),
				row = held.row.copy(amount = signedUsd(gain * keep)),
			)
			positions = positions.map { if (it === held) rest else it }
			realized = listOf(Realized(badge = held.spec.badge, ticker = symbol, sub = sub, amount = signedUsd(gain * p), up = banked)) + realized
		}
		persist()
		// A sale the phone treats as the whole position (99.9% and up) goes to the server as the whole of it - otherwise
		// it keeps a sliver, and the row the phone just removed comes back on the next read.
		val serverPortion = if (p >= 0.999) 1.0 else p
		if (!demo) send({ repository?.sandboxSell(symbol, serverPortion) })
		return true
	}
}
