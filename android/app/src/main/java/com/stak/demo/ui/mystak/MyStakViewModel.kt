package com.stak.demo.ui.mystak

import android.content.Context
import android.content.ContextWrapper
import androidx.activity.ComponentActivity
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.StockRepository
import com.stak.demo.data.chartFractions
import com.stak.demo.data.equalWeightIndex
import com.stak.demo.data.indexedMovePct
import com.stak.demo.data.categoryArt
import com.stak.demo.data.categoryColorKey
import com.stak.demo.data.categoryGroupId
import com.stak.demo.data.categoryName
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * My STAK, read from the user's own saves (product audit, 2026-09-05: the
 * screen described a demo persona - six fixed collections of nineteen fixed
 * stocks with authored prices - to every account). Holdings and their
 * categories come from /api/me/android-stocks; prices from live quotes.
 *
 * The demo account keeps its authored frames (user, 2026-09-04: the authored
 * look wins); everything here serves a real one.
 */
@HiltViewModel
class MyStakViewModel @Inject constructor(
    private val repository: StockRepository,
) : ViewModel() {

    /** One saved stock: what it is, what it costs now, and how it's done since the save. */
    data class Holding(
        val ticker: String,
        val name: String,
        val groupId: String,
        val groupName: String,
        val price: Double? = null,
        /** Today's move, the only one a quote can tell us; the week needs price history. */
        val changePct: Double? = null,
        /** Against the price when it was saved - null until a save has been stamped. */
        val sinceSavedPct: Double? = null,
        val daysSinceSaved: Int? = null,
    )

    /**
     * A collection: the saves that share a category. The six authored glass
     * pieces cover the families they were drawn for, so [imageRes]/[iconRes]
     * are null for a category outside them and the chip draws its initial.
     */
    data class Group(
        val id: String,
        val name: String,
        val holdings: List<Holding>,
        val share: Float,
        val colorKey: String,
        val imageRes: Int? = null,
        val iconRes: Int? = null,
        val heroRes: Int? = null,
    ) {
        /** The group's move today - its stocks', equally weighted. */
        val changePct: Double? get() = holdings.mapNotNull { it.changePct }.takeIf { it.isNotEmpty() }?.average()
    }

    data class MyStakUi(
        val loading: Boolean = true,
        val holdings: List<Holding> = emptyList(),
        val groups: List<Group> = emptyList(),
        /** Today's move across every save, equally weighted; null when no quote came back. */
        val todayPct: Double? = null,
        val best: Holding? = null,
        val worst: Holding? = null,
        /** Cards left in today's deck, for the Discover banner; null when it couldn't be read. */
        val cardsLeft: Int? = null,
        val readHeadline: String = "",
        val readBody: String = "",
        /** The selected range's equal-weight line, as fractions of the chart's height. */
        val chartSeries: List<Float>? = null,
        /** The move across that range, equally weighted across the saved stocks. */
        val rangePct: Double? = null,
        val chartRange: String = "3M",
        /** True when the range came back with no prices - draw nothing, don't invent a line. */
        val chartMissing: Boolean = false,
    )

    private val _ui = MutableStateFlow(MyStakUi())
    val ui: StateFlow<MyStakUi> = _ui

    /** The holdings the current state was built from, so a second screen doesn't refetch them. */
    private var loadedFor: Set<String>? = null

    /**
     * Loads only when the saved set has changed since the last load. The Overview
     * and its Collection pages share one instance, so opening a collection should
     * show what's already there rather than fetch it again.
     */
    fun loadIfNeeded() {
        // loadedFor is set when a load STARTS, so this skips one still in flight too.
        // Testing !loading here instead would let the second screen fire a duplicate
        // fetch while the first was still running - the very thing this prevents.
        if (loadedFor == MyStakHoldings.tickers) return
        load()
    }

    fun load() {
        viewModelScope.launch {
            _ui.value = _ui.value.copy(loading = true)
            // The server is the record of what's saved, and it carries each save's
            // category, date and price - the local set alone can't describe a stock.
            MyStakHoldings.refreshFromBackend()
            val tickers = MyStakHoldings.tickers.toList()
            // Marked before the quotes come back: a failed fetch must not loop.
            loadedFor = MyStakHoldings.tickers
            if (tickers.isEmpty()) {
                _ui.value = MyStakUi(loading = false, cardsLeft = cardsLeft())
                return@launch
            }
            // Batched: one request per 50 symbols keeps the query string sane.
            val quotes = tickers.chunked(50).flatMap { chunk ->
                runCatching { repository.batchQuotes(chunk).quotes.entries.map { it.key to it.value } }
                    .getOrDefault(emptyList())
            }.toMap()

            val holdings = tickers.map { ticker ->
                val quote = quotes[ticker]
                val price = quote?.price?.takeIf { it > 0 }
                val saved = MyStakHoldings.priceAtSave(ticker)?.takeIf { it > 0 }
                val groupName = MyStakHoldings.categoryOf(ticker)?.let(::categoryName) ?: OTHER
                Holding(
                    ticker = ticker,
                    name = MyStakHoldings.nameOf(ticker) ?: ticker,
                    groupId = categoryGroupId(groupName),
                    groupName = groupName,
                    price = price,
                    changePct = quote?.changePercent,
                    sinceSavedPct = if (price != null && saved != null) (price - saved) / saved * 100 else null,
                    daysSinceSaved = MyStakHoldings.daysSinceSaved(ticker),
                )
            }
            val moved = holdings.mapNotNull { it.changePct }
            val ranked = holdings.filter { it.changePct != null }
            // copy(), not a fresh MyStakUi: the range's chart is fetched alongside this
            // and finishes on its own schedule, so rebuilding the state wholesale
            // wiped a line that had already arrived (device audit, 2026-09-15).
            _ui.value = _ui.value.copy(
                loading = false,
                holdings = holdings,
                groups = groupsOf(holdings),
                todayPct = moved.takeIf { it.isNotEmpty() }?.average(),
                best = if (ranked.size >= 2) ranked.maxBy { it.changePct!! } else null,
                worst = if (ranked.size >= 2) ranked.minBy { it.changePct!! } else null,
                cardsLeft = cardsLeft(),
                readHeadline = readHeadline(holdings),
                readBody = readBody(holdings),
            )
        }
    }

    /**
     * Draws the performance card for [range] from real prices. The pills' labels
     * lowercase onto the endpoint's ranges ("3M" -> "3m").
     */
    fun selectRange(range: String) {
        if (_ui.value.chartRange == range && _ui.value.chartSeries != null) return
        // Drop the old range's line immediately: it answers a different question.
        _ui.value = _ui.value.copy(chartRange = range, chartSeries = null, rangePct = null, chartMissing = false)
        viewModelScope.launch {
            val tickers = MyStakHoldings.tickers.toList()
            if (tickers.isEmpty()) return@launch
            val built = portfolioSeries(tickers, range.lowercase())
            // A slow reply for a range the user has already left must not land.
            if (_ui.value.chartRange != range) return@launch
            _ui.value = _ui.value.copy(
                chartSeries = built?.first,
                rangePct = built?.second,
                // A closed market returns no intraday points; that is missing data,
                // not a flat portfolio, and it must not fall back to a drawn shape.
                chartMissing = built == null,
            )
        }
    }

    /**
     * The saved stocks as one equal-weight line. Each stock is indexed to its own
     * first close before averaging, so a $900 share doesn't drown a $9 one, and the
     * series are aligned on their tails so every stock covers the same window.
     */
    private suspend fun portfolioSeries(tickers: List<String>, range: String): Pair<List<Float>, Double>? = coroutineScope {
        val series = tickers
            .map { t -> async { runCatching { repository.getChart(t, range) }.getOrNull() } }
            .awaitAll()
            .mapNotNull { chart ->
                chart?.prices?.map { it.close }?.filter { it > 0.0 }?.takeIf { it.size >= 2 }
            }
        val indexed = equalWeightIndex(series) ?: return@coroutineScope null
        chartFractions(indexed) to indexedMovePct(indexed)
    }

    /** The collection behind a chip - the Collection page serves this. */
    fun group(id: String): Group? = _ui.value.groups.firstOrNull { it.id == id }

    private suspend fun cardsLeft(): Int? =
        runCatching { repository.getDailySwipes() }.getOrNull()
            ?.let { (it.limit - it.count).coerceAtLeast(0) }

    /** Saves grouped by category, biggest first; ties keep the catalogue's order. */
    private fun groupsOf(holdings: List<Holding>): List<Group> =
        holdings.groupBy { it.groupId }
            .map { (id, stocks) ->
                val name = stocks.first().groupName
                val art = categoryArt(name)
                Group(
                    id = id,
                    name = name,
                    holdings = stocks,
                    share = stocks.size.toFloat() / holdings.size,
                    colorKey = categoryColorKey(name),
                    imageRes = art?.imageRes,
                    iconRes = art?.iconRes,
                    heroRes = art?.heroRes,
                )
            }
            // "Other" is the catch-all, so it sits last however big it is.
            .sortedWith(compareBy({ it.name == OTHER }, { -it.holdings.size }, { it.name }))

    private fun readHeadline(holdings: List<Holding>): String {
        val top = groupsOf(holdings).firstOrNull() ?: return "Your read starts with your first save."
        if (top.name == OTHER) return "Your STAK is still finding its shape."
        return "You lean into ${top.name}."
    }

    private fun readBody(holdings: List<Holding>): String {
        val groups = groupsOf(holdings)
        val top = groups.firstOrNull() ?: return "Save stocks from the Discover deck and STAK will read your taste from them."
        val total = holdings.size
        if (total == 1) {
            val only = holdings.first()
            return if (top.name == OTHER) {
                "${only.ticker} is your first save. Save a few more and STAK will read the pattern."
            } else {
                "${only.ticker} is your first save, a ${top.name} name. Save a few more and STAK will read the pattern."
            }
        }
        // OTHER sorts last, so it leading means nothing carries a category yet.
        if (top.name == OTHER) return "None of your $total saves carry a category yet. STAK reads your taste once they do."
        val lead = if (top.holdings.size == 1) {
            "One of your ${total.word()} picks is a ${top.name} name."
        } else {
            "${top.holdings.size.word().cap()} of your ${total.word()} picks are ${top.name} names."
        }
        val second = groups.getOrNull(1)
        val tail = if (second != null) {
            " ${second.holdings.size.word().cap()} more ${if (second.holdings.size == 1) "sits" else "sit"} in ${second.name}."
        } else {
            " Your STAK is all ${top.name} for now."
        }
        return lead + tail
    }

    private fun Int.word(): String =
        listOf("zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve")
            .getOrNull(this) ?: toString()

    private fun String.cap(): String = replaceFirstChar { it.uppercase() }

    private companion object {
        /** A save with no category the deck ranks on - it still has to show up somewhere. */
        const val OTHER = "Other"
    }
}

/**
 * The Overview and the Collection pages it opens share ONE instance, scoped to
 * the activity rather than to each nav entry. A per-entry instance starts empty
 * and re-fetches, so a tapped collection claimed "0 stocks · No quote yet" for
 * as long as the load took (device check, 2026-09-15) - a wrong answer where a
 * shared one already had the right one.
 */
@Composable
fun sharedMyStakViewModel(): MyStakViewModel {
    val activity = LocalContext.current.findComponentActivity()
    return if (activity != null) hiltViewModel(activity) else hiltViewModel()
}

private fun Context.findComponentActivity(): ComponentActivity? {
    var context: Context = this
    while (context is ContextWrapper) {
        if (context is ComponentActivity) return context
        context = context.baseContext
    }
    return null
}
