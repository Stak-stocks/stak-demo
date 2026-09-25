package com.stak.demo.data

import androidx.compose.runtime.mutableStateMapOf

/** Live price lookups for surfaces that aren't backed by a ViewModel (the shared practice-buy sheet). */
object LiveQuotes {
    private var repository: StockRepository? = null

    /** Every symbol's last-fetched (price, changePercent) - a Compose state map, so a Simulate
     * position reading it through [cached] recomposes the moment a refresh lands. */
    private val cache = mutableStateMapOf<String, Pair<Double, Double>>()

    fun init(repo: StockRepository) {
        repository = repo
    }

    /** Latest (price, changePercent) for [symbol], or null when it can't be fetched. */
    suspend fun quote(symbol: String): Pair<Double, Double>? =
        runCatching { repository?.batchQuotes(listOf(symbol))?.quotes?.get(symbol) }
            .getOrNull()
            ?.let { it.price to it.changePercent }
            ?.also { cache[symbol] = it }

    /** Whatever [refresh] (or [quote]) last fetched for [symbol] - null before the first one lands. */
    fun cached(symbol: String): Pair<Double, Double>? = cache[symbol]

    /** Refreshes every symbol in [symbols] in one batched request - a stock that doesn't come back this time keeps its last cached quote. */
    suspend fun refresh(symbols: List<String>) {
        if (symbols.isEmpty()) return
        val repo = repository ?: return
        runCatching { repo.batchQuotes(symbols) }.getOrNull()?.quotes?.forEach { (symbol, q) ->
            if (q != null) cache[symbol] = q.price to q.changePercent
        }
    }
}
