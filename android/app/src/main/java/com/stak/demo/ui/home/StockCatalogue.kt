package com.stak.demo.ui.home

import com.stak.demo.ui.mystak.COLLECTIONS
import com.stak.demo.ui.mystak.CollStock

/**
 * Every stock the demo can name - the union of the six My STAK collections'
 * tiles (ticker, company, quote, day move). Home's Trending strip and Saved
 * peek read it (FigJam Home board, 2026-09-14: Trending stocks / Saved peek). In production the backend serves the universe and the
 * day's movers. Mirrors ios Home/StockCatalogue.swift.
 */
internal object StockCatalogue {
	val all: List<CollStock> by lazy { COLLECTIONS.flatMap { it.stocks }.distinctBy { it.ticker } }

	/** The day's biggest movers, either direction - the Trending strip; the collection sort reads the same rule. */
	fun trending(limit: Int = 6): List<CollStock> = all.sortedByDescending { kotlin.math.abs(com.stak.demo.ui.StakInsights.changePct(it)) }.take(limit)
}
