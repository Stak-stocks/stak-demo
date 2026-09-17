package com.stak.demo.ui.discover

import com.stak.demo.data.StakClock
import com.stak.demo.data.StakStore

/**
 * What each stock's detail page last showed.
 *
 * The page's ViewModel is scoped to its nav entry, so leaving the screen destroys
 * it and returning started from nothing - every field blank until the whole set
 * of requests came back (quote, analyst, actions, daily move, earnings, news,
 * peers, two peer lookups and the chart). Nothing cached them: OkHttp is built
 * without a cache, so even an unchanged response was fetched again.
 *
 * Re-entry now renders what the stock last showed and corrects it in place. Details
 * are also kept on the phone, so the first open after a restart starts from them
 * too instead of from placeholders (device check, 2026-09-16).
 */
internal object StockDetailCache {
	/** How long a same-day quote still stands in for the current one. */
	private const val FRESH_MS = 30 * 60 * 1000L

	/** Enough for a browsing session; the oldest entries fall off the end. */
	private const val MAX_ENTRIES = 24

	private data class Entry(val at: Long = 0L, val day: String = "", val detail: LiveDetail? = null)

	/** A drawn line and the move across it, which decides the line's colour. */
	internal data class ChartData(val series: List<Float>, val pct: Double)

	private val gson = com.google.gson.Gson()
	private val details = LinkedHashMap<String, Entry>()
	private val charts = LinkedHashMap<String, ChartData>()

	/**
	 * The last detail for [symbol]. The stock's slow-moving half - peers, metrics,
	 * analysts, news - is kept as it was. What belongs to a moment is not:
	 * - from an earlier US trading day, the price, the day's move, the News signal's
	 *   move line and its "why it moved" text all described another session, so they
	 *   go, and return when the refetch lands;
	 * - from today but past [FRESH_MS], the price and move go - a quote from hours ago
	 *   must not sit under a "today" label as though it were current.
	 */
	fun detail(symbol: String): LiveDetail? {
		val entry = details[symbol] ?: fromDisk(symbol)?.also { details[symbol] = it } ?: return null
		val detail = entry.detail ?: return null
		if (entry.day != StakClock.marketDay()) {
			return detail.copy(price = "—", change = "", newsClose = null, newsSignal = null)
		}
		val fresh = System.currentTimeMillis() - entry.at < FRESH_MS
		return if (fresh) detail else detail.copy(price = "—", change = "")
	}

	/**
	 * Remembers [detail]. [persist] = false keeps it in memory only: the 15-second price
	 * refresh calls this, and rewriting the whole preferences file that often - it
	 * holds every cached page - would put disk work on the main thread and make
	 * Android wait on it when the app pauses.
	 */
	fun putDetail(symbol: String, detail: LiveDetail, persist: Boolean = true) {
		val entry = Entry(System.currentTimeMillis(), StakClock.marketDay(), detail)
		details.remove(symbol)
		details[symbol] = entry
		trim(details)
		if (persist) toDisk(symbol, entry)
	}

	/**
	 * Gson fills fields by reflection and ignores Kotlin's nullability, so a saved page
	 * missing a field reads back with null in a non-null property. Anything that isn't
	 * whole is treated as not cached rather than handed to the screen.
	 */
	private fun fromDisk(symbol: String): Entry? = runCatching {
		gson.fromJson(StakStore.getString("stockpage.$symbol"), Entry::class.java)
			?.takeIf { e -> e.detail?.let { d -> (d.price as String?) != null && (d.change as String?) != null } == true }
	}.getOrNull()

	/** Written per symbol with a most-recent-first index, so the phone keeps the same [MAX_ENTRIES] as memory. */
	private fun toDisk(symbol: String, entry: Entry) {
		runCatching {
			StakStore.putString("stockpage.$symbol", gson.toJson(entry))
			val index = (listOf(symbol) + StakStore.getString("stockpage.index").orEmpty().split(",").filter { it.isNotBlank() && it != symbol })
			index.drop(MAX_ENTRIES).forEach { StakStore.remove("stockpage.$it") }
			StakStore.putString("stockpage.index", index.take(MAX_ENTRIES).joinToString(","))
		}
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
