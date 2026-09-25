package com.stak.demo.ui.simulate

import com.stak.demo.data.ChartPoint
import com.stak.demo.data.StockRepository
import com.stak.demo.data.chartFractions
import java.time.Instant
import java.time.ZoneId

/**
 * The real ledger's value across a range - what your actual cash and shares were worth
 * on each trading day, built from PaperPortfolio's own trade log plus every traded
 * symbol's own real price history (the same /api/stock/{symbol}/chart every stock page
 * reads). Never a shape invented to fill the box (product decision, 2026-09-18): a day
 * this can't be built for is left out, not guessed - the demo's authored numbers carry
 * no live price behind them, so it is never called for that account.
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

	/** [symbol]'s shares actually held as of [day] - the ledger's running total up to it, not today's count. */
	private fun sharesHeldAt(day: Long, symbol: String, trades: List<Trade>): Double =
		trades.filter { it.symbol == symbol && it.epochDay <= day }.sumOf { if (it.isBuy) it.shares else -it.shares }

	/** Cash on hand as of [day] - the starting balance plus every trade's cash move up to it. */
	private fun cashAt(day: Long, trades: List<Trade>, paperStart: Double): Double =
		paperStart + trades.filter { it.epochDay <= day }.sumOf { if (it.isBuy) -it.amount else it.amount }

	/**
	 * The account's real value on each trading day [range] covers, from its first trade
	 * to today - null while there's nothing to build from yet (no trades) or every chart
	 * request for a traded symbol came back empty.
	 */
	suspend fun build(trades: List<Trade>, paperStart: Double, range: String): List<Point>? {
		val repo = repository ?: return null
		if (trades.isEmpty()) return null
		val symbols = trades.map { it.symbol }.distinct()
		val closesBySymbol = symbols.mapNotNull { sym ->
			val prices = runCatching { repo.getChart(sym, range.lowercase()).prices }.getOrNull() ?: return@mapNotNull null
			closesByDay(prices).takeIf { it.isNotEmpty() }?.let { sym to it }
		}.toMap()
		if (closesBySymbol.isEmpty()) return null
		// Every symbol's own real trading days in the window - a day none of them
		// traded (a market holiday) never becomes a point either.
		val firstTradeDay = trades.minOf { it.epochDay }
		val days = closesBySymbol.values.flatMap { it.keys }.filter { it >= firstTradeDay }.distinct().sorted()
		if (days.size < 2) return null
		return days.map { day ->
			val positionsValue = symbols.sumOf { sym ->
				val closes = closesBySymbol[sym] ?: return@sumOf 0.0
				// The latest close that symbol actually has at or before this day - it may not
				// have traded on this exact one.
				val price = closes.keys.filter { it <= day }.maxOrNull()?.let(closes::get) ?: return@sumOf 0.0
				sharesHeldAt(day, sym, trades) * price
			}
			Point(day, cashAt(day, trades, paperStart) + positionsValue)
		}
	}

	/** [points]' values as the 0..1 fractions RangeChart draws. */
	fun fractions(points: List<Point>): List<Float> = chartFractions(points.map { it.value })
}
