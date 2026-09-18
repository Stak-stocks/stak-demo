package com.stak.demo.data

/** Today's biggest movers for Home's Trending strip - not backed by a ViewModel, like LiveQuotes. */
object TrendingStocks {
    private var repository: StockRepository? = null

    fun init(repo: StockRepository) {
        repository = repo
    }

    /** The current top movers, or empty when the request fails. */
    suspend fun fetch(): List<TrendingStock> =
        runCatching { repository?.getTrending()?.trending }.getOrNull().orEmpty()
}
