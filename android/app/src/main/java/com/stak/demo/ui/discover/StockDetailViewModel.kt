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
import dagger.hilt.android.lifecycle.HiltViewModel
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
    /** The brand's own tip, so the line under the page isn't another company's. */
    val tip: String?,
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

@HiltViewModel
class StockDetailViewModel @Inject constructor(
    private val repository: StockRepository,
) : ViewModel() {
    private val _liveDetail = MutableStateFlow<LiveDetail?>(null)
    val liveDetail: StateFlow<LiveDetail?> = _liveDetail

    fun fetch(symbol: String) {
        viewModelScope.launch {
            val stockData = runCatching { repository.getStock(symbol) }.getOrNull()
            val pct = stockData?.quote?.changePercent ?: 0.0

            coroutineScope {
                val analystDef = async { runCatching { repository.getAnalyst(symbol) }.getOrNull() }
                val actionsDef = async { runCatching { repository.getAnalystActions(symbol) }.getOrNull() }
                val moveDef = async { runCatching { repository.getDailyMove(symbol, pct) }.getOrNull() }
                val earningsDef = async { runCatching { repository.getEarnings(symbol) }.getOrNull() }
                val newsDef = async { runCatching { repository.getCompanyNews(symbol) }.getOrNull() }
                val peersDef = async { runCatching { repository.getPeerMetrics(symbol) }.getOrNull() }
                // The brand's own tip, keyed by brand id. A saved stock carries its id
                // locally; an unsaved one keeps the authored line until the stock
                // endpoint carries one too.
                val tipDef = async {
                    MyStakHoldings.brandIdOf(symbol)?.let { id -> runCatching { repository.getBrandTip(id) }.getOrNull() }
                }

                // The peer group names the Compare columns; each peer's own metrics
                // fill them. peer-metrics returns medians for the group, which can't
                // describe two separate columns, so the peers are fetched directly.
                val peers = peersDef.await()
                val peerTickers = peers?.peerTickers?.take(2).orEmpty()
                val peerStocks = peerTickers
                    .map { t -> async { runCatching { repository.getStock(t) }.getOrNull() } }
                    .awaitAll()

                buildDetail(
                    stockData = stockData,
                    analyst = analystDef.await(),
                    actions = actionsDef.await(),
                    move = moveDef.await(),
                    earnings = earningsDef.await(),
                    news = newsDef.await(),
                    peerTickers = peerTickers,
                    peerStocks = peerStocks,
                    peerMedians = peers,
                    tip = tipDef.await()?.tip?.takeIf { it.isNotBlank() },
                )
            }.also { _liveDetail.value = it }
        }
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
        tip: String? = null,
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

        val newsClosePct = if (pct >= 0.0)
            "▲ +${String.format(Locale.US, "%.1f", pct)}% at yesterday's close"
        else
            "▼ ${String.format(Locale.US, "%.1f", abs(pct))}% at yesterday's close"
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
            tip = tip,
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
