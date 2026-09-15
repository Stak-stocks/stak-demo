package com.stak.demo.ui.discover

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.AnalystAction
import com.stak.demo.data.AnalystResponse
import com.stak.demo.data.DailyMoveResponse
import com.stak.demo.data.EarningsResponse
import com.stak.demo.data.StakClock
import com.stak.demo.data.StockDetailResponse
import com.stak.demo.data.StockRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import javax.inject.Inject
import kotlin.math.abs

data class LiveDetail(
    val price: String,
    val change: String,
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

                buildDetail(
                    stockData = stockData,
                    analyst = analystDef.await(),
                    actions = actionsDef.await(),
                    move = moveDef.await(),
                    earnings = earningsDef.await(),
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

        return LiveDetail(
            price = priceStr,
            change = changeStr,
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
