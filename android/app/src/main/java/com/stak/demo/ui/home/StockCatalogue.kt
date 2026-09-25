package com.stak.demo.ui.home

import com.stak.demo.ui.mystak.COLLECTIONS
import com.stak.demo.ui.mystak.CollStock

/**
 * Every stock the six My STAK collections catalogue, by ticker. Saved Peek's only
 * remaining use for it: a company name for a save that predates the account's own
 * saved-stock record (the demo persona's seeded tickers). Trending Today and a real
 * save's name both come from the backend now (TrendingStocks, MyStakHoldings.nameOf).
 * Mirrors ios Home/StockCatalogue.swift.
 */
internal object StockCatalogue {
	val all: List<CollStock> by lazy { COLLECTIONS.flatMap { it.stocks }.distinctBy { it.ticker } }
}
