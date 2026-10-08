package com.stak.demo.ui.simulate

import com.stak.demo.data.ChartPoint
import com.stak.demo.data.StockRepository
import com.stak.demo.data.chartFractions
import java.time.Instant
import java.time.ZoneId

/**
 * The real ledger's value across a range - what your actual cash and shares were worth
 * on each trading day, priced with every held or traded symbol's own real price history
 * (the same /api/stock/{symbol}/chart every stock page reads). Never a shape invented to
 * fill the box (product decision, 2026-09-18): a day this can't be built for is left out,
 * not guessed - the demo's authored numbers carry no live price behind them, so it is
 * never called for that account.
 *
 * Built BACKWARD from the server's snapshot - today's cash and shares, then each later
 * trade undone - not forward from the starting cash: a portfolio holding stock bought
 * before the trade log existed (or whose oldest trades fell off the page) replayed
 * forward drew a line that tracked only the logged trades and disagreed with the hero.
 */
internal object PortfolioHistory {
	private var repository: StockRepository? = null
	private val marketZone = ZoneId.of("America/New_York")

	fun init(repo: StockRepository) {
		repository = repo
	}

	/** One trading day's real portfolio value. */
	internal data class Point(val epochDay: Long, val value: Double)

	/** A symbol's own real closes, one per trading day it actually has - chronological, so the day's last price wins. */
	private fun closesByDay(prices: List<ChartPoint>): Map<Long, Double> {
		val byDay = linkedMapOf<Long, Double>()
		prices.forEach { p ->
			if (p.close <= 0.0) return@forEach
			val day = runCatching { Instant.parse(p.ts).atZone(marketZone).toLocalDate().toEpochDay() }.getOrNull() ?: return@forEach
			byDay[day] = p.close
		}
		return byDay
	}

	/** [symbol]'s shares held at the end of [day]: today's count with every later trade undone. */
	private fun sharesHeldAt(day: Long, symbol: String, now: Double, trades: List<Trade>): Double =
		now - trades.filter { it.symbol == symbol && it.epochDay > day }.sumOf { if (it.isBuy) it.shares else -it.shares }

	/**
	 * The account's money that isn't in shares at the end of [day]: today's (cash plus
	 * reserved limit orders, whose fills move no cash) with every later trade's cash move undone.
	 */
	private fun cashAt(day: Long, now: Double, trades: List<Trade>): Double =
		now - trades.filter { it.epochDay > day }.sumOf { if (it.isBuy) -it.amount else it.amount }

	/**
	 * The account's real value on each trading day [range] covers - from its first logged
	 * trade when it has one - null while there's nothing to build from or a symbol's chart
	 * didn't come back. [cash] is today's cash plus the open orders' reserved stakes;
	 * [holdings] today's shares by symbol.
	 */
	suspend fun build(trades: List<Trade>, cash: Double, holdings: Map<String, Double>, range: String): List<Point>? {
		val repo = repository ?: return null
		val symbols = (holdings.keys.sorted() + trades.map { it.symbol }).distinct()
		if (symbols.isEmpty()) return null
		val closesBySymbol = symbols.mapNotNull { sym ->
			val prices = runCatching { repo.getChart(sym, range.lowercase()).prices }.getOrNull() ?: return@mapNotNull null
			closesByDay(prices).takeIf { it.isNotEmpty() }?.let { sym to it }
		}.toMap()
		// Every symbol's history, or no line: a missing one would count its shares as $0 and
		// draw a drop that never happened.
		if (closesBySymbol.size < symbols.size) return null
		// Every symbol's own real trading days in the window - a day none of them
		// traded (a market holiday) never becomes a point either.
		val firstTradeDay = trades.minOfOrNull { it.epochDay } ?: Long.MIN_VALUE
		val days = closesBySymbol.values.flatMap { it.keys }.filter { it >= firstTradeDay }.distinct().sorted()
		val points = days.mapNotNull { day ->
			var held = 0.0
			for (sym in symbols) {
				val shares = sharesHeldAt(day, sym, holdings[sym] ?: 0.0, trades)
				if (kotlin.math.abs(shares) <= 1e-6) continue
				// The latest close that symbol actually has at or before this day - it may not
				// have traded on this exact one. A day before its first close can't be priced,
				// and is left out rather than counted at $0.
				val closes = closesBySymbol[sym] ?: return@mapNotNull null
				val price = closes.keys.filter { it <= day }.maxOrNull()?.let(closes::get) ?: return@mapNotNull null
				held += shares * price
			}
			Point(day, cashAt(day, cash, trades) + held)
		}
		return points.takeIf { it.size >= 2 }
	}

	/**
	 * [points] ending on the hero's own live value: today replaces its close (or follows the
	 * last day), so the line never stops a day short of the figure printed above it.
	 */
	fun endingToday(points: List<Point>, value: Double): List<Point> {
		val last = points.lastOrNull() ?: return points
		val today = java.time.LocalDate.now(marketZone).toEpochDay()
		if (today < last.epochDay) return points
		return (if (last.epochDay == today) points.dropLast(1) else points) + Point(today, value)
	}

	/** [points]' values as the 0..1 fractions RangeChart draws. */
	fun fractions(points: List<Point>): List<Float> = chartFractions(points.map { it.value })
}
