package com.stak.demo.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * The catalogue's ticker for each company name and name for each ticker, so news
 * search can find a story by either: "NVDA" finds "Nvidia Stock Rises...", and
 * "Nvidia" finds a story tagged NVDA. Filled from the brands list Discover already
 * downloads, or fetched once when search needs it first.
 */
object BrandNames {
	/** Ticker -> name, e.g. "GOOGL" -> "Google". Compose state, so an open search re-runs once it fills. */
	var byTicker: Map<String, String> by mutableStateOf(emptyMap())
		private set

	/** Ticker -> the company's logo, for anywhere a company is named outside the deck. */
	var logoByTicker: Map<String, String> by mutableStateOf(emptyMap())
		private set

	fun fill(brands: List<BrandSummaryDto>) {
		if (brands.isEmpty()) return
		byTicker = brands.filter { it.ticker.isNotBlank() && it.name.isNotBlank() }
			.associate { it.ticker.uppercase() to bareName(it.name) }
		logoByTicker = brands.mapNotNull { b ->
			val logo = b.logo ?: b.domain?.let { "https://cdn.brandfetch.io/$it/w/400/h/400" }
			logo?.let { b.ticker.uppercase() to it }
		}.toMap()
	}

	suspend fun ensure(repository: StockRepository) {
		if (byTicker.isNotEmpty()) return
		runCatching { repository.getBrands() }.getOrNull()?.let { fill(it.brands) }
	}

	/**
	 * What else a search for [query] should look for: the company's name when the query
	 * is a ticker, and the tickers of companies whose name contains the query. Names match
	 * from 3 letters; tickers only as the whole query, so "on" isn't read as ON Semiconductor.
	 */
	fun expand(query: String): Set<String> {
		val q = query.trim()
		if (q.isEmpty()) return emptySet()
		val out = mutableSetOf<String>()
		byTicker[q.uppercase()]?.let { out += it }
		if (q.length >= 3) {
			byTicker.forEach { (ticker, name) -> if (name.contains(q, ignoreCase = true)) out += ticker }
		}
		return out
	}

	/** "Jack in the Box Inc" is written "Jack in the Box" in headlines. */
	private fun bareName(name: String): String =
		name.replace(Regex("\\s*\\(.*\\)"), "").replace(Regex("[,\\s]+(Inc\\.?|Corp\\.?|Corporation|Co\\.?|Company|Group|Holdings|plc|Ltd\\.?)$", RegexOption.IGNORE_CASE), "").trim()
}
