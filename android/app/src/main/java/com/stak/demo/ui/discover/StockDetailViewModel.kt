package com.stak.demo.ui.discover

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.AnalystAction
import com.stak.demo.data.AnalystResponse
import com.stak.demo.data.DailyMoveResponse
import com.stak.demo.data.EarningsResponse
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.CompanyNewsResponse
import com.stak.demo.data.PeerMetricsResponse
import com.stak.demo.data.StakClock
import com.stak.demo.data.StockDetailResponse
import com.stak.demo.data.StockMetrics
import com.stak.demo.data.StockRepository
import com.stak.demo.data.chartFractions
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import javax.inject.Inject
import kotlin.math.abs

/**
 * A price to measure a save against. [atMoment] is true when it is the price at
 * the minute of the save, false when it is that day's close - a real price, but a
 * different moment, which the copy has to distinguish.
 */
data class SavedReference(val price: Double, val atMoment: Boolean)

/** One "Compare and learn" row: this stock's value, then each peer's. */
data class CompareValues(val label: String, val a: String, val b: String, val c: String, val green: Boolean = false)

/** The Risk fit pill's track, in design units: the card's width less its padding. */
private const val RISK_TRACK = 289f

data class LiveDetail(
    val price: String,
    val change: String,
    /** The company's name, so the page titles itself with the stock it is showing. */
    val name: String?,
    /** Where the Risk fit pill sits on its track, read from beta. */
    val riskPillX: Float?,
    val riskCopy: String?,
    /** The two company stories: ("Reuters · 2h ago", "Bullish") with their headlines. */
    val newsSources: List<Pair<String, String>>?,
    val newsHeadlines: List<String>?,
    /** "vs AMD · TSM", and the two peers the Compare table's columns belong to. */
    val peersLabel: String?,
    val peerA: String?,
    val peerB: String?,
    val compareRows: List<CompareValues>?,
    /** Each "Numbers that matter" verdict and whether it reads as good, judged against the peer median. */
    val statVerdicts: List<Pair<String, Boolean>>?,
    val peRatioValue: String?,
    val revenueGrowthValue: String?,
    val profitMarginValue: String?,
    val upside: String?,
    val targetLow: String?,
    val targetAvg: String?,
    val targetHigh: String?,
    val targetMarkerX: Float?,
    val consensus: String?,
    val buyCount: String?,
    val holdCount: String?,
    val sellCount: String?,
    val buyBarW: Float?,
    val actions: List<Triple<String, String, String>>?,
    val newsSignal: String?,
    val newsClose: String?,
    val earningsStr: String?,
)

/**
 * This detail with any section it hasn't got yet taken from [previous] - used only
 * while a page's parts are still arriving, never for the finished page.
 */
internal fun LiveDetail.orPrevious(previous: LiveDetail): LiveDetail = copy(
    name = name ?: previous.name,
    riskPillX = riskPillX ?: previous.riskPillX,
    riskCopy = riskCopy ?: previous.riskCopy,
    newsSources = newsSources ?: previous.newsSources,
    newsHeadlines = newsHeadlines ?: previous.newsHeadlines,
    peersLabel = peersLabel ?: previous.peersLabel,
    peerA = peerA ?: previous.peerA,
    peerB = peerB ?: previous.peerB,
    compareRows = compareRows ?: previous.compareRows,
    statVerdicts = statVerdicts ?: previous.statVerdicts,
    peRatioValue = peRatioValue ?: previous.peRatioValue,
    revenueGrowthValue = revenueGrowthValue ?: previous.revenueGrowthValue,
    profitMarginValue = profitMarginValue ?: previous.profitMarginValue,
    upside = upside ?: previous.upside,
    targetLow = targetLow ?: previous.targetLow,
    targetAvg = targetAvg ?: previous.targetAvg,
    targetHigh = targetHigh ?: previous.targetHigh,
    targetMarkerX = targetMarkerX ?: previous.targetMarkerX,
    consensus = consensus ?: previous.consensus,
    buyCount = buyCount ?: previous.buyCount,
    holdCount = holdCount ?: previous.holdCount,
    sellCount = sellCount ?: previous.sellCount,
    buyBarW = buyBarW ?: previous.buyBarW,
    actions = actions ?: previous.actions,
    newsSignal = newsSignal ?: previous.newsSignal,
    newsClose = newsClose ?: previous.newsClose,
    earningsStr = earningsStr ?: previous.earningsStr,
)

@HiltViewModel
class StockDetailViewModel @Inject constructor(
    private val repository: StockRepository,
) : ViewModel() {
    private val _liveDetail = MutableStateFlow<LiveDetail?>(null)
    val liveDetail: StateFlow<LiveDetail?> = _liveDetail

    /** This stock's line for the selected range, as fractions of the chart's height. */
    private val _chartSeries = MutableStateFlow<List<Float>?>(null)
    val chartSeries: StateFlow<List<Float>?> = _chartSeries

    /** True when the range came back with no prices - draw nothing, don't invent a line. */
    private val _chartMissing = MutableStateFlow(false)
    val chartMissing: StateFlow<Boolean> = _chartMissing

    /**
     * The price a save from before stamping is measured against, and whether it is
     * the actual moment of the save. Recovered from that session's intraday points
     * when the save is recent enough for them; otherwise the day's close, which is
     * a real price but a different moment - and the card says so.
     */
    private val _savedReference = MutableStateFlow<SavedReference?>(null)
    val savedReference: StateFlow<SavedReference?> = _savedReference

    /**
     * Whether the look-up behind [savedReference] has finished. Null before and after
     * a failed look-up read the same, so the card said "STAK has no record of what it
     * cost" for the seconds it was still being fetched (device check, 2026-09-16).
     */
    private val _savedReferenceSettled = MutableStateFlow(false)
    val savedReferenceSettled: StateFlow<Boolean> = _savedReferenceSettled

    /** Whether this visit's page fetch has finished, whatever it brought back. */
    private val _detailSettled = MutableStateFlow(false)
    val detailSettled: StateFlow<Boolean> = _detailSettled

    /** The move across the selected range, measured from its own first close. */
    private val _chartPct = MutableStateFlow<Double?>(null)
    val chartPct: StateFlow<Double?> = _chartPct

    private var chartKey: String? = null

    /**
     * Draws the chart from this stock's own closes for [range]. The pills' labels
     * lowercase onto the endpoint's ranges ("3M" -> "3m").
     */
    fun selectRange(symbol: String, range: String) {
        val key = "$symbol:$range"
        if (chartKey == key) return
        chartKey = key
        // The previous line belongs to another stock or period, so it goes at once -
        // replaced by this one's own line when it has been drawn before.
        val cached = StockDetailCache.chart(symbol, range)
        _chartSeries.value = cached?.series
        _chartPct.value = cached?.pct
        _chartMissing.value = false
        viewModelScope.launch {
            val closes = runCatching { repository.getChart(symbol, range.lowercase()) }.getOrNull()
                ?.prices?.map { it.close }?.filter { it > 0.0 }?.takeIf { it.size >= 2 }
            // A slow reply for a range already left behind must not land.
            if (chartKey != key) return@launch
            val fractions = closes?.let(::chartFractions)
            // Measured from the range's own first close, the way the line is drawn -
            // so the colour and the shape always agree about the direction.
            val pct = closes?.let { (it.last() - it.first()) / it.first() * 100.0 }
            _chartSeries.value = fractions
            _chartPct.value = pct
            _chartMissing.value = fractions == null
            if (fractions != null && pct != null) {
                StockDetailCache.putChart(symbol, range, StockDetailCache.ChartData(fractions, pct))
            }
        }
    }

    private var fetchJob: Job? = null

    /** When the price on screen was fetched, or null while none is shown. */
    private val _priceAt = MutableStateFlow<Long?>(null)
    val priceAt: StateFlow<Long?> = _priceAt

    /** The direction the shown "why it moved" text explains, so a refresh can tell when it no longer fits. */
    private var explainedDirection: String? = null

    /** When the price refresh last wrote this page to the phone. */
    private var persistedAt = 0L

    fun fetch(symbol: String) {
        // One fetch at a time: a second call (the effect re-running) left two sets of
        // requests racing, and whichever finished last overwrote the other's page.
        fetchJob?.cancel()
        fetchJob = viewModelScope.launch {
            // Show what this stock last showed while its own data is on the way,
            // instead of a page of placeholders on every re-entry.
            StockDetailCache.detail(symbol)?.let {
                _liveDetail.value = it
                _priceAt.value = StockDetailCache.priceAt(symbol)
            }
            // Alongside the page, not ahead of it: this is one or two chart requests, and
            // awaited first it held back the quote - and so the whole page - behind them.
            _savedReferenceSettled.value = false
            launch {
                _savedReference.value =
                    if (MyStakHoldings.priceAtSave(symbol) != null) null else savedReferenceFor(symbol)
                _savedReferenceSettled.value = true
            }
            _detailSettled.value = false

            // Each part is published as it lands. The page used to wait for the quote,
            // then for the slowest of ten requests - one slow AI summary held back the
            // price, the chart's stats and everything else (device check, 2026-09-16).
            // Only the "why it moved" text needs the quote first; the rest start now.
            var stockData: StockDetailResponse? = null
            var analyst: AnalystResponse? = null
            var actions: List<AnalystAction>? = null
            var move: DailyMoveResponse? = null
            var earnings: EarningsResponse? = null
            var news: CompanyNewsResponse? = null
            var peers: PeerMetricsResponse? = null
            var peerTickers: List<String> = emptyList()
            var peerStocks: List<StockDetailResponse?> = emptyList()

            fun build(): LiveDetail? = buildDetail(
                stockData = stockData,
                analyst = analyst,
                actions = actions,
                move = move,
                earnings = earnings,
                news = news,
                peerTickers = peerTickers,
                peerStocks = peerStocks,
                peerMedians = peers,
            )
            // While parts are still out, a section they haven't filled keeps what the
            // cache showed rather than blinking back to a placeholder.
            fun publish() {
                val built = build() ?: return
                _liveDetail.value = _liveDetail.value?.let { built.orPrevious(it) } ?: built
            }

            coroutineScope {
                launch { analyst = runCatching { repository.getAnalyst(symbol) }.getOrNull(); publish() }
                launch { actions = runCatching { repository.getAnalystActions(symbol) }.getOrNull(); publish() }
                launch { earnings = runCatching { repository.getEarnings(symbol) }.getOrNull(); publish() }
                launch { news = runCatching { repository.getCompanyNews(symbol) }.getOrNull(); publish() }
                launch {
                    // The peer group names the Compare columns; each peer's own metrics
                    // fill them. peer-metrics returns medians for the group, which can't
                    // describe two separate columns, so the peers are fetched directly.
                    val group = runCatching { repository.getPeerMetrics(symbol) }.getOrNull()
                    val tickers = group?.peerTickers?.take(2).orEmpty()
                    val stocks = tickers
                        .map { t -> async { runCatching { repository.getStock(t) }.getOrNull() } }
                        .awaitAll()
                    peers = group
                    peerTickers = tickers
                    peerStocks = stocks
                    publish()
                }
                launch {
                    stockData = runCatching { repository.getStock(symbol) }.getOrNull()
                    if (stockData?.quote?.price != null) _priceAt.value = System.currentTimeMillis()
                    publish()
                    val pct = stockData?.quote?.changePercent ?: 0.0
                    move = runCatching { repository.getDailyMove(symbol, pct) }.getOrNull()
                    explainedDirection = move?.direction
                    publish()
                }
            }
            // Everything is back: the full build replaces the merged one, so a section
            // that genuinely came back empty is shown as empty rather than as cached.
            // A failed quote leaves what is already on screen alone; assigning null here
            // wiped a good page back to placeholders on a bad network.
            build()?.let { built ->
                _liveDetail.value = built
                StockDetailCache.putDetail(symbol, built)
            }
            _detailSettled.value = true
        }
    }

    /**
     * The News signal's move line. Names the session the move belongs to: this always
     * said "at yesterday's close", but mid-session the quote's move is today's, still
     * running - and before the open on a Monday the last close was Friday's. Worded by
     * the clock the web uses, not marketState, which reads CLOSED after hours whenever
     * Yahoo has no extended data and would have said "the last close" at 5pm.
     */
    private fun newsCloseLine(pct: Double): String {
        val session = StakClock.lastCloseRef()
        return if (pct >= 0.0) "▲ +${String.format(Locale.US, "%.1f", pct)}% $session"
        else "▼ ${String.format(Locale.US, "%.1f", abs(pct))}% $session"
    }

    /**
     * Today's price again for the page on screen - called every ~15s while it is
     * visible and the market is open. Only the figures a quote carries move; the rest
     * of the page stays as it was.
     */
    fun refreshQuote(symbol: String, range: String) {
        if (StakClock.lastCloseRef() != "today") return
        if (_liveDetail.value == null || fetchJob?.isActive == true) return
        viewModelScope.launch {
            val quote = runCatching { repository.getStock(symbol) }.getOrNull()?.quote ?: return@launch
            val price = quote.price?.takeIf { it > 0 } ?: return@launch
            val pct = quote.changePercent ?: return@launch
            val updated = _liveDetail.value?.copy(
                price = formatPrice(price),
                change = formatChange(pct),
                newsClose = newsCloseLine(pct),
            ) ?: return@launch
            _liveDetail.value = updated
            _priceAt.value = System.currentTimeMillis()
            // In memory every time; to the phone at most once a minute.
            val now = System.currentTimeMillis()
            val persist = now - persistedAt > 60_000
            if (persist) persistedAt = now
            StockDetailCache.putDetail(symbol, updated, persist)

            // The "why it moved" text explains one direction. If the stock has turned
            // since, it now contradicts the line above it - ask for the new one.
            val direction = if (pct > 0.15) "up" else if (pct < -0.15) "down" else "flat"
            if (explainedDirection != null && direction != explainedDirection) {
                explainedDirection = direction
                runCatching { repository.getDailyMove(symbol, pct) }.getOrNull()?.let { m ->
                    explainedDirection = m.direction
                    m.explanation.takeIf { it.isNotBlank() }?.let { text ->
                        _liveDetail.value = _liveDetail.value?.copy(newsSignal = text)
                    }
                }
            }
            // Today's line is still being drawn; the header price moving while it stood
            // still made the two disagree.
            if (range.equals("1D", ignoreCase = true)) refreshTodayLine(symbol)
        }
    }

    private suspend fun refreshTodayLine(symbol: String) {
        if (chartKey != "$symbol:1D") return
        val closes = runCatching { repository.getChart(symbol, "1d") }.getOrNull()
            ?.prices?.map { it.close }?.filter { it > 0.0 }?.takeIf { it.size >= 2 } ?: return
        if (chartKey != "$symbol:1D") return
        _chartSeries.value = chartFractions(closes)
        _chartPct.value = (closes.last() - closes.first()) / closes.first() * 100.0
        _chartMissing.value = false
    }

    private fun buildDetail(
        stockData: StockDetailResponse?,
        analyst: AnalystResponse?,
        actions: List<AnalystAction>?,
        move: DailyMoveResponse?,
        earnings: EarningsResponse?,
        news: CompanyNewsResponse? = null,
        peerTickers: List<String> = emptyList(),
        peerStocks: List<StockDetailResponse?> = emptyList(),
        peerMedians: PeerMetricsResponse? = null,
    ): LiveDetail? {
        val quote = stockData?.quote ?: return null
        val price = quote.price ?: return null
        val pct = quote.changePercent ?: 0.0

        val priceStr = formatPrice(price)
        val changeStr = formatChange(pct)

        val metrics = stockData.metrics
        val peStr = metrics?.peRatio?.let { String.format(Locale.US, "%.1f", it) }
        val revStr = metrics?.revenueGrowth
        val marginStr = metrics?.profitMargin

        val pt = analyst?.priceTarget
        val rec = analyst?.recommendation
        val upside = if (pt?.avg != null) {
            val upsidePct = ((pt.avg - price) / price) * 100.0
            val arrow = if (upsidePct >= 0.0) "↑" else "↓"
            "$arrow ${String.format(Locale.US, "%.1f", abs(upsidePct))}% upside"
        } else null
        val targetLow = pt?.low?.let { "$${ it.toInt() }" }
        val targetAvg = pt?.avg?.let { "$${ it.toInt() }" }
        val targetHigh = pt?.high?.let { "$${ it.toInt() }" }
        val targetMarkerX = if (pt?.low != null && pt.avg != null && pt.high != null && pt.high > pt.low) {
            ((pt.avg - pt.low) / (pt.high - pt.low) * 166.0).toFloat().coerceIn(0f, 166f)
        } else null

        val totalBuy = (rec?.strongBuy ?: 0) + (rec?.buy ?: 0)
        val totalHold = rec?.hold ?: 0
        val totalSell = (rec?.sell ?: 0) + (rec?.strongSell ?: 0)
        val total = totalBuy + totalHold + totalSell
        val consensus = if (total > 0) "WALL ST. CONSENSUS · $total ANALYSTS" else null
        val buyCount = if (total > 0) "● Buy $totalBuy" else null
        val holdCount = if (total > 0) "Hold $totalHold" else null
        val sellCount = if (total > 0) "Sell $totalSell" else null
        val buyBarW = if (total > 0) (totalBuy.toFloat() / total.toFloat() * 318f) else null

        val analystActions = actions?.take(5)?.map { a ->
            Triple(a.firm, a.action, a.priceTarget?.let { "$${ it.toInt() }" } ?: "—")
        }

        // No quote, no line: pct falls back to 0 above, and "+0.0%" would state a move.
        val newsClosePct = stockData?.quote?.changePercent?.let(::newsCloseLine)
        val newsSignal = move?.explanation?.takeIf { it.isNotBlank() }

        val earningsStr = buildEarningsStr(earnings)

        // The two most recent company stories, in the authored shape:
        // "Reuters · 2h ago" with the sentiment as its pill.
        val articles = news?.articles?.take(2)?.takeIf { it.isNotEmpty() }
        val newsSources = articles?.map { a ->
            val parts = listOfNotNull(
                a.source.takeIf { it.isNotBlank() },
                a.datetime.takeIf { it > 0L }?.let { StakClock.newsAge(it) + " ago" },
            )
            parts.joinToString(" · ") to a.sentiment.replaceFirstChar { it.uppercase() }
        }
        val newsHeadlines = articles?.map { it.headline }

        val peerA = peerTickers.getOrNull(0)
        val peerB = peerTickers.getOrNull(1)
        val peersLabel = if (peerTickers.isNotEmpty()) "vs " + peerTickers.joinToString(" · ") else null
        val compareRows = if (peerA != null) compareRowsFor(metrics, peerStocks) else null

        // The authored verdicts are one company's judgments ("Excellent" for a 24%
        // margin). Laid over another company's numbers they mislabel them - TSLA's
        // 3.7% margin read "Excellent" in green - so each is judged against the
        // peer group's median instead.
        val statVerdicts = peerMedians?.let { p ->
            listOf(
                // A high multiple is dearer, not better.
                verdictFor(metrics?.peRatio, p.pe, higherIsBetter = false, above = "Above peers", below = "Below peers"),
                verdictFor(percentValue(metrics?.revenueGrowth), p.revenueGrowth, higherIsBetter = true, above = "Faster", below = "Slower"),
                verdictFor(percentValue(metrics?.profitMargin), p.profitMargin, higherIsBetter = true, above = "Higher", below = "Lower"),
            )
        }

        // Beta is volatility measured against the market, so the market itself (1.0)
        // belongs at the middle of the track. That also gives the card's own 120/170
        // thresholds a real meaning - calmer than the market, and bolder than it -
        // where before they were tuned against hand-picked numbers.
        val beta = metrics?.beta
        val riskPillX = beta?.let { ((it / 2.0).coerceIn(0.0, 1.0) * RISK_TRACK).toFloat() }
        val riskCopy = beta?.let {
            when {
                it < 0.8 -> "Moves less than the market. Fits the steady side of your profile."
                it <= 1.2 -> "Moves roughly with the market, neither calm nor sharp."
                it <= 1.6 -> "Moves more than the market. Expect bigger swings than average."
                else -> "Moves far more than the market. Expect sharp swings either way."
            }
        }

        return LiveDetail(
            price = priceStr,
            change = changeStr,
            name = stockData.name,
            riskPillX = riskPillX,
            riskCopy = riskCopy,
            newsSources = newsSources,
            newsHeadlines = newsHeadlines,
            peersLabel = peersLabel,
            peerA = peerA,
            peerB = peerB,
            compareRows = compareRows,
            statVerdicts = statVerdicts,
            peRatioValue = peStr,
            revenueGrowthValue = revStr,
            profitMarginValue = marginStr,
            upside = upside,
            targetLow = targetLow,
            targetAvg = targetAvg,
            targetHigh = targetHigh,
            targetMarkerX = targetMarkerX,
            consensus = consensus,
            buyCount = buyCount,
            holdCount = holdCount,
            sellCount = sellCount,
            buyBarW = buyBarW,
            actions = analystActions,
            newsSignal = newsSignal,
            newsClose = newsClosePct,
            earningsStr = earningsStr,
        )
    }

    /**
     * What to measure a pre-stamping save against. The exact minute is preferred:
     * the server records when the save happened, and that session's intraday points
     * can still be fetched, so the price the user actually saw is recoverable. Only
     * when it isn't does this fall back to the day's close.
     */
    private suspend fun savedReferenceFor(symbol: String): SavedReference? {
        val instant = MyStakHoldings.savedInstant(symbol)
        if (instant != null) {
            val nearest = runCatching { repository.getChart(symbol, "1d") }.getOrNull()
                ?.prices
                ?.mapNotNull { p -> epochSecOf(p.ts)?.let { sec -> sec to p.close } }
                ?.filter { it.second > 0.0 }
                ?.minByOrNull { kotlin.math.abs(it.first - instant) }
            // Only when the session actually covers the save; otherwise the "nearest"
            // point could belong to a different day entirely.
            if (nearest != null && kotlin.math.abs(nearest.first - instant) <= 60 * 60) {
                return SavedReference(nearest.second, atMoment = true)
            }
        }
        val day = MyStakHoldings.savedEpochDay(symbol) ?: return null
        val date = java.time.LocalDate.ofEpochDay(day).toString()
        val close = runCatching { repository.getChart(symbol, "1y") }.getOrNull()
            ?.prices?.lastOrNull { it.ts.startsWith(date) }?.close?.takeIf { it > 0.0 }
        return close?.let { SavedReference(it, atMoment = false) }
    }

    private fun epochSecOf(ts: String): Long? =
        runCatching { java.time.Instant.parse(ts).epochSecond }.getOrNull()

    /** "11.8%" -> 11.8, so a served percentage can be compared with a peer median. */
    private fun percentValue(s: String?): Double? = s?.trim()?.removeSuffix("%")?.toDoubleOrNull()

    /** A stat against its peer median; within a tenth either way reads as in line. */
    private fun verdictFor(
        value: Double?,
        median: Double?,
        higherIsBetter: Boolean,
        above: String,
        below: String,
    ): Pair<String, Boolean> {
        if (value == null || median == null || median == 0.0) return "" to false
        val ratio = value / median
        return when {
            ratio in 0.9..1.1 -> "In line" to false
            ratio > 1.1 -> above to higherIsBetter
            else -> below to !higherIsBetter
        }
    }

    /** The four authored comparison rows, this stock against each peer. */
    private fun compareRowsFor(own: StockMetrics?, peers: List<StockDetailResponse?>): List<CompareValues> {
        val b = peers.getOrNull(0)?.metrics
        val c = peers.getOrNull(1)?.metrics
        fun pe(m: StockMetrics?) = m?.peRatio?.let { String.format(Locale.US, "%.1f", it) } ?: "—"
        // revenueGrowth arrives as "6.1%" / "-4.2%"; the row reads as a signed move.
        fun growth(m: StockMetrics?) = m?.revenueGrowth?.let { if (it.startsWith("-")) it else "+$it" } ?: "—"
        fun margin(m: StockMetrics?) = m?.profitMargin ?: "—"
        fun cap(m: StockMetrics?) = m?.marketCap ?: "—"
        return listOf(
            CompareValues("P/E ratio", pe(own), pe(b), pe(c)),
            CompareValues("Rev growth", growth(own), growth(b), growth(c), green = true),
            CompareValues("Profit margin", margin(own), margin(b), margin(c)),
            CompareValues("Market cap", cap(own), cap(b), cap(c)),
        )
    }

    private fun buildEarningsStr(earnings: EarningsResponse?): String? {
        val date = earnings?.date ?: return null
        return when (earnings.status) {
            "upcoming" -> {
                val days = try {
                    val today = LocalDate.now()
                    val earningsDate = LocalDate.parse(date)
                    (earningsDate.toEpochDay() - today.toEpochDay()).coerceAtLeast(0L).toInt()
                } catch (_: Exception) { return null }
                "Next earnings land ${StakClock.daysAhead(days)}"
            }
            "beat", "miss" -> {
                val formattedDate = try {
                    LocalDate.parse(date).format(DateTimeFormatter.ofPattern("MMM d", Locale.US))
                } catch (_: Exception) { date }
                "Earnings reported $formattedDate — ${if (earnings.status == "beat") "beat" else "missed"} estimates"
            }
            else -> null
        }
    }
}
