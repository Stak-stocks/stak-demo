package com.stak.demo.ui.home

import com.stak.demo.ui.mystak.COLLECTIONS
import com.stak.demo.ui.mystak.CollStock

/**
 * Every stock the demo can name - the union of the six My STAK collections'
 * tiles (ticker, company, quote, day move). Home's Trending strip and the
 * Search page read it (FigJam Home board, 2026-09-14: Trending stocks /
 * Search results). In production the backend serves the universe and the
 * day's movers. Mirrors ios Home/StockCatalogue.swift.
 */
internal object StockCatalogue {
	val all: List<CollStock> by lazy { COLLECTIONS.flatMap { it.stocks }.distinctBy { it.ticker } }

	fun find(ticker: String): CollStock? = all.firstOrNull { it.ticker == ticker }

	/** "▲ 2.4%" -> 2.4, "▼ 0.4%" -> -0.4. */
	fun movePct(stock: CollStock): Double {
		val n = stock.change.filter { it.isDigit() || it == '.' }.toDoubleOrNull() ?: 0.0
		return if (stock.up) n else -n
	}

	/** The day's biggest movers, either direction - the Trending strip. */
	fun trending(limit: Int = 6): List<CollStock> = all.sortedByDescending { kotlin.math.abs(movePct(it)) }.take(limit)

	/** Ticker or company match, case-insensitive, for the Search page. */
	fun search(query: String): List<CollStock> {
		val q = query.trim()
		if (q.isEmpty()) return emptyList()
		return all.filter { it.ticker.contains(q, ignoreCase = true) || it.company.contains(q, ignoreCase = true) }
			.sortedBy { if (it.ticker.startsWith(q, ignoreCase = true)) 0 else 1 }
	}
}
