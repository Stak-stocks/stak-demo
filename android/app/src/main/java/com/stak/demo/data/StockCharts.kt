package com.stak.demo.data

/**
 * Real per-symbol price history for a surface that isn't backed by a ViewModel (Simulate's
 * Pick detail) - the same /api/stock/{symbol}/chart every stock page reads, so a held
 * pick's chart is that stock's own real history, not a shape scaled from its gain.
 */
object StockCharts {
    private var repository: StockRepository? = null

    fun init(repo: StockRepository) {
        repository = repo
    }

    /** [symbol]'s real points for [range] ("1d".."1y"), oldest first - or null when the request fails. */
    suspend fun points(symbol: String, range: String): List<ChartPoint>? =
        runCatching { repository?.getChart(symbol, range)?.prices?.filter { it.close > 0.0 } }
            .getOrNull()
}
