package com.stak.demo.data

/** Live price lookups for surfaces that aren't backed by a ViewModel (the shared practice-buy sheet). */
object LiveQuotes {
    private var repository: StockRepository? = null

    fun init(repo: StockRepository) {
        repository = repo
    }

    /** Latest (price, changePercent) for [symbol], or null when it can't be fetched. */
    suspend fun quote(symbol: String): Pair<Double, Double>? =
        runCatching { repository?.batchQuotes(listOf(symbol))?.quotes?.get(symbol) }
            .getOrNull()
            ?.let { it.price to it.changePercent }
}
