package com.stak.demo.ui.discover

/**
 * What each stock's detail page last showed, held for the life of the process.
 *
 * The page's ViewModel is scoped to its nav entry, so leaving the screen destroys
 * it and returning started from nothing - every field blank until the whole set
 * of requests came back (quote, analyst, actions, daily move, earnings, news,
 * peers, two peer lookups and the chart). Nothing cached them: OkHttp is built
 * without a cache, so even an unchanged response was fetched again.
 *
 * Re-entry now renders what the stock last showed and corrects it in place.
 */
internal object StockDetailCache {
	/** How long a cached quote still counts as current. */
	private const val FRESH_MS = 5 * 60 * 1000L

	/** Enough for a browsing session; the oldest entries fall off the end. */
	private const val MAX_ENTRIES = 24

	private data class Entry(val at: Long, val detail: LiveDetail)

	/** A drawn line and the move across it, which decides the line's colour. */
	internal data class ChartData(val series: List<Float>, val pct: Double)

	private val details = LinkedHashMap<String, Entry>()
	private val charts = LinkedHashMap<String, ChartData>()

	/**
	 * The last detail for [symbol]. Past [FRESH_MS] the price and change are
	 * dropped: the stock's slow-moving half (peers, metrics, news, beta) is still
	 * good, but a quote from earlier must not sit under a "today" label. It
	 * returns as "—" until the refetch lands.
	 */
	fun detail(symbol: String): LiveDetail? {
		val entry = details[symbol] ?: return null
		val fresh = System.currentTimeMillis() - entry.at < FRESH_MS
		return if (fresh) entry.detail else entry.detail.copy(price = "—", change = "")
	}

	fun putDetail(symbol: String, detail: LiveDetail) {
		details.remove(symbol)
		details[symbol] = Entry(System.currentTimeMillis(), detail)
		trim(details)
	}

	/**
	 * A finished period's closes don't change, so its line is kept as drawn. Today's
	 * is the exception: 1d is still being extended while the market is open, and a
	 * cached copy would stop moving for the rest of the session.
	 */
	fun chart(symbol: String, range: String): ChartData? =
		if (isToday(range)) null else charts["$symbol:$range"]

	fun putChart(symbol: String, range: String, data: ChartData) {
		if (isToday(range)) return
		val key = "$symbol:$range"
		charts.remove(key)
		charts[key] = data
		trim(charts)
	}

	private fun isToday(range: String): Boolean = range.equals("1d", ignoreCase = true)

	private fun <V> trim(map: LinkedHashMap<String, V>) {
		while (map.size > MAX_ENTRIES) {
			val oldest = map.keys.firstOrNull() ?: break
			map.remove(oldest)
		}
	}
}
