package com.stak.demo.ui.mystak

import android.content.Context
import android.content.ContextWrapper
import androidx.activity.ComponentActivity
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.BatchQuote
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.StakStore
import com.stak.demo.data.StockRepository
import com.stak.demo.data.chartFractions
import com.stak.demo.data.indexedMovePct
import com.stak.demo.data.categoryArt
import com.stak.demo.data.categoryColorKey
import com.stak.demo.data.categoryGroupId
import com.stak.demo.data.categoryName
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
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
        /** Each saved stock's move across the selected range, for Best and Worst. */
        val rangeMoves: Map<String, Double> = emptyMap(),
        /** True when the range came back with no prices - draw nothing, don't invent a line. */
        val chartMissing: Boolean = false,
    )

    private val _ui = MutableStateFlow(MyStakUi())
    val ui: StateFlow<MyStakUi> = _ui

    /** The holdings the current state was built from, so a second screen doesn't refetch them. */
    private var loadedFor: Set<String>? = null

    /** When the last load started - its quotes' age. */
    private var loadedAtMs = 0L

    /**
     * The holdings the drawn line was built from. Without it the chart was keyed
     * to the range alone, so unsaving a stock left the old percentage under a
     * freshly-counted "Across N stocks" - the headline described one set of
     * stocks and the label beside it another (device audit, 2026-09-16).
     */
    private var chartFor: Set<String>? = null
    private var chartJob: Job? = null

    /**
     * Loads when the saved set has changed, or its quotes are over a minute old. The
     * Overview and its Collection pages share one instance, so opening a collection
     * straight away shows what's already there rather than fetching it again.
     */
    fun loadIfNeeded() {
        // loadedFor is set when a load STARTS, so this skips one still in flight too.
        // Testing !loading here instead would let the second screen fire a duplicate
        // fetch while the first was still running - the very thing this prevents.
        //
        // But the same holdings are not the same prices. Keyed on the set alone, the
        // quotes were fetched once and kept all session: a collection read "-0.1%
        // today" from launch while its only stock, opened fresh, read -0.7% (device
        // report, 2026-09-16). Past a minute, coming back to the screen reloads them.
        val fresh = System.currentTimeMillis() - loadedAtMs < QUOTE_FRESH_MS
        if (loadedFor == MyStakHoldings.tickers && fresh) return
        load()
    }

    fun load() {
        // Claimed before anything suspends. These were only set after the refresh
        // below returned, so a second screen opening meanwhile saw no load under way
        // and started its own.
        loadedFor = MyStakHoldings.tickers
        loadedAtMs = System.currentTimeMillis()
        // Open with what the phone already knows - the saves in local storage and the
        // prices last seen today - instead of a blank screen until three requests had
        // come back one after another (device check, 2026-09-16: 2-5s on first open).
        if (_ui.value.holdings.isEmpty()) {
            val local = MyStakHoldings.tickers.toList()
            if (local.isNotEmpty()) render(local, MyStakSnapshot.quotes(), final = false)
        }
        // The Discover banner's count, on its own: it used to hold the whole page back.
        viewModelScope.launch { cardsLeft()?.let { _ui.value = _ui.value.copy(cardsLeft = it) } }
        viewModelScope.launch {
            _ui.value = _ui.value.copy(loading = true)
            // Prices for what's saved on the phone, requested alongside the server's
            // list rather than after it; a stock the refresh adds is fetched after.
            val localTickers = MyStakHoldings.tickers.toList()
            val quotesAhead = async { fetchQuotes(localTickers) }
            // The server is the record of what's saved, and it carries each save's
            // category, date and price - the local set alone can't describe a stock.
            MyStakHoldings.refreshFromBackend()
            val tickers = MyStakHoldings.tickers.toList()
            // Re-marked with what the refresh settled on, still before the quotes come
            // back: a failed fetch must not loop.
            loadedFor = MyStakHoldings.tickers
            if (tickers.isEmpty()) {
                quotesAhead.cancel()
                _ui.value = MyStakUi(loading = false, cardsLeft = _ui.value.cardsLeft)
                return@launch
            }
            var quotes = quotesAhead.await()
            val missing = tickers.filter { it !in quotes }
            if (missing.isNotEmpty()) quotes = quotes + fetchQuotes(missing)
            if (quotes.isNotEmpty()) MyStakSnapshot.putQuotes(quotes)
            render(tickers, quotes, final = true)
            // refreshFromBackend above can change what's saved. The line is keyed to
            // the set it was drawn from, so redraw it rather than leave a percentage
            // describing stocks the labels no longer count.
            if (chartFor != MyStakHoldings.tickers) selectRange(_ui.value.chartRange)
        }
    }

    /** Batched: one request per 50 symbols keeps the query string sane. */
    private suspend fun fetchQuotes(tickers: List<String>): Map<String, BatchQuote> =
        tickers.chunked(50).flatMap { chunk ->
            runCatching { repository.batchQuotes(chunk).quotes.entries.mapNotNull { e -> e.value?.let { e.key to it } } }
                .getOrDefault(emptyList())
        }.toMap()

    private fun render(tickers: List<String>, quotes: Map<String, BatchQuote>, final: Boolean) {
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
                changePct = quote?.takeIf { price != null }?.changePercent,
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
            loading = !final,
            holdings = holdings,
            groups = groupsOf(holdings),
            todayPct = moved.takeIf { it.isNotEmpty() }?.average(),
            best = if (ranked.size >= 2) ranked.maxBy { it.changePct!! } else null,
            worst = if (ranked.size >= 2) ranked.minBy { it.changePct!! } else null,
            readHeadline = readHeadline(holdings),
            readBody = readBody(holdings),
        )
    }

    /**
     * Draws the performance card for [range] from real prices. The pills' labels
     * lowercase onto the endpoint's ranges ("3M" -> "3m").
     */
    fun selectRange(range: String) {
        val forTickers = MyStakHoldings.tickers
        // Already drawn for this range AND these holdings, or already on its way.
        if (_ui.value.chartRange == range && chartFor == forTickers &&
            (_ui.value.chartSeries != null || chartJob?.isActive == true)
        ) return
        // Drop the old range's line immediately: it answers a different question. What
        // replaces it at once is this range's own line as last drawn today for these
        // same holdings, if there is one - corrected in place when the fetch lands.
        val seeded = MyStakSnapshot.line(range, forTickers)
        _ui.value = _ui.value.copy(
            chartRange = range,
            chartSeries = seeded?.series,
            rangePct = seeded?.pct,
            rangeMoves = seeded?.moves.orEmpty(),
            chartMissing = false,
        )
        chartFor = forTickers
        chartJob?.cancel()
        chartJob = viewModelScope.launch {
            val tickers = forTickers.toList()
            if (tickers.isEmpty()) return@launch
            val built = portfolioSeries(tickers, range.lowercase())
            // A slow reply for a range - or a set of holdings - the user has
            // already left must not land on top of the current one.
            if (_ui.value.chartRange != range || chartFor != forTickers) return@launch
            // A failed refresh keeps today's line rather than replacing it with "no data".
            if (built == null && seeded != null) return@launch
            if (built != null) MyStakSnapshot.putLine(range, forTickers, built.series, built.pct, built.moves)
            _ui.value = _ui.value.copy(
                chartSeries = built?.series,
                rangePct = built?.pct,
                rangeMoves = built?.moves.orEmpty(),
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
    private suspend fun portfolioSeries(tickers: List<String>, range: String): RangeData? {
        // One request for the whole Stak. Combining it here meant a chart call per
        // saved stock on every range change - up to a full Stak of them per tap.
        // A cancelled request must stop here, not read as "no data": runCatching also
        // swallows the cancellation, so a superseded job ran on and briefly flagged the
        // range as missing while its replacement was still loading.
        val resp = try {
            repository.getPortfolioChart(tickers, range)
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
        val indexed = resp?.indexed?.takeIf { it.size >= 2 } ?: return null
        return RangeData(
            series = chartFractions(indexed),
            pct = resp.pct ?: indexedMovePct(indexed),
            moves = resp.moves,
        )
    }

    /** A range's line, the move across it, and each stock's own move within it. */
    private data class RangeData(val series: List<Float>, val pct: Double, val moves: Map<String, Double>)

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

    /**
     * The prices and lines My STAK last showed, kept on the phone so it can open with
     * them. Only today's (US Eastern) count: a move from a previous session must not
     * sit under a "today" label, so older ones are ignored rather than shown.
     */
    private object MyStakSnapshot {
        private val gson = com.google.gson.Gson()
        private data class Quotes(val day: String = "", val quotes: Map<String, BatchQuote> = emptyMap())
        private data class Line(
            val day: String = "",
            val tickers: List<String> = emptyList(),
            val series: List<Float> = emptyList(),
            val pct: Double = 0.0,
            val moves: Map<String, Double> = emptyMap(),
        )
        data class Seed(val series: List<Float>, val pct: Double, val moves: Map<String, Double>)

        private fun marketDay(): String =
            java.time.ZonedDateTime.now(java.time.ZoneId.of("America/New_York")).toLocalDate().toString()

        fun quotes(): Map<String, BatchQuote> =
            runCatching { gson.fromJson(StakStore.getString("mystak.quotes"), Quotes::class.java) }.getOrNull()
                ?.takeIf { it.day == marketDay() }?.quotes.orEmpty()

        fun putQuotes(quotes: Map<String, BatchQuote>) =
            StakStore.putString("mystak.quotes", gson.toJson(Quotes(marketDay(), quotes)))

        fun line(range: String, tickers: Set<String>): Seed? =
            runCatching { gson.fromJson(StakStore.getString("mystak.line.$range"), Line::class.java) }.getOrNull()
                ?.takeIf { it.day == marketDay() && it.tickers.toSet() == tickers && it.series.size >= 2 }
                ?.let { Seed(it.series, it.pct, it.moves) }

        fun putLine(range: String, tickers: Set<String>, series: List<Float>, pct: Double, moves: Map<String, Double>) =
            StakStore.putString("mystak.line.$range", gson.toJson(Line(marketDay(), tickers.sorted(), series, pct, moves)))
    }

    private companion object {
        /** A save with no category the deck ranks on - it still has to show up somewhere. */
        const val OTHER = "Other"

        /** How long a screen's quotes count as current before a return to it reloads them. */
        const val QUOTE_FRESH_MS = 60_000L
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
