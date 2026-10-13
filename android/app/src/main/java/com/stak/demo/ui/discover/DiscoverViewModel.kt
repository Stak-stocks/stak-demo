package com.stak.demo.ui.discover

import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.BrandSummaryDto
import com.stak.demo.data.EngagementEventRequest
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.PassedEntry
import com.stak.demo.data.RecordSwipeRequest
import com.stak.demo.data.StakClock
import com.stak.demo.data.StakStore
import com.stak.demo.data.StockRepository
import com.stak.demo.data.categoryName
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.Locale
import javax.inject.Inject
import kotlin.math.abs

@HiltViewModel
class DiscoverViewModel @Inject constructor(
    private val repository: StockRepository,
) : ViewModel() {
    private val _deck = MutableStateFlow<List<DeckCard>>(emptyList())
    val deck: StateFlow<List<DeckCard>> = _deck

    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading

    private val _hasReachedLimit = MutableStateFlow(false)
    val hasReachedLimit: StateFlow<Boolean> = _hasReachedLimit

    /** Cards per day, served by the backend from @stak/shared's DAILY_SWIPE_LIMIT. */
    private val _dailyLimit = MutableStateFlow(FALLBACK_DAILY_LIMIT)
    val dailyLimit: StateFlow<Int> = _dailyLimit

    /** Swipes counted against today's limit: the server's count plus swipes still in their undo window. */
    private val _swipedToday = MutableStateFlow(0)
    val swipedToday: StateFlow<Int> = _swipedToday

    private val _deckLabel = MutableStateFlow(DEFAULT_DECK_LABEL)
    val deckLabel: StateFlow<String> = _deckLabel

    /** True when today's cards couldn't load - the screen offers Retry instead of stand-in cards. */
    private val _loadError = MutableStateFlow(false)
    val loadError: StateFlow<Boolean> = _loadError

    /** Today's (saved, passed) brand counts from the server, across every device. */
    private val _todayStats = MutableStateFlow(0 to 0)
    val todayStats: StateFlow<Pair<Int, Int>> = _todayStats

    private val pendingSwipeJobs = mutableMapOf<String, Job>()
    private val quickLookCache = mutableMapOf<String, QuickLookData>()
    private val tipCache = mutableMapOf<String, String>()
    /** brandId -> its last pass and pass count, as read with the deck (null when that read failed). */
    private var passedAt: MutableMap<String, PassedEntry>? = null

    /**
     * Quick Look for any brand: the generated structured overview
     * (GET /api/brands/:id/quick-look), or the profile's cultural-context
     * sections when generation isn't available.
     */
    /** Quick looks being read: a "Learn more" tap during the prefetch shares that request (iOS's in-flight map). */
    private val quickLookInFlight = mutableMapOf<String, kotlinx.coroutines.Deferred<QuickLookData>>()

    suspend fun fetchQuickLook(brandId: String): QuickLookData {
        quickLookCache[brandId]?.let { return it }
        quickLookInFlight[brandId]?.let { return it.await() }
        val request = viewModelScope.async { readQuickLook(brandId) }
        quickLookInFlight[brandId] = request
        return try { request.await() } finally { quickLookInFlight.remove(brandId) }
    }

    private suspend fun readQuickLook(brandId: String): QuickLookData {
        val structured = runCatching {
            repository.getBrandQuickLook(brandId).quickLook?.takeIf { !it.in10Seconds.isNullOrBlank() }
        }.getOrNull()
        val data = if (structured != null) {
            QuickLookData(structured, emptyList())
        } else {
            val sections = runCatching { repository.getBrandProfile(brandId) }.getOrNull()
                ?.culturalContext?.sections.orEmpty()
                .filter { it.heading.isNotBlank() && it.content.isNotBlank() }
            QuickLookData(null, sections)
        }
        if (data.structured != null || data.sections.isNotEmpty()) quickLookCache[brandId] = data
        return data
    }

    init {
        fetchDeck()
    }

    /** [repick]: a reload into the day's shared deck - on failure the deck on screen stays, and the count never drops. */
    private fun fetchDeck(repick: Boolean = false) {
        viewModelScope.launch {
            _loading.value = true
            _loadError.value = false
            val day = todayKey()
            loadedDay = day
            missingRetries = 0
            coroutineScope {
                val dailySwipesDeferred = async { runCatching { repository.getDailySwipes() }.getOrNull() }
                val recsDeferred = async { runCatching { repository.getRecommendations() }.getOrNull() }
                val statsDeferred = async { runCatching { repository.getSwipes(swipeDayStartIso()).swipes }.getOrNull() }
                val passedDeferred = async { runCatching { repository.getPassed().entries }.getOrNull() }
                // Null when it couldn't be read; empty when no device has picked today's deck yet.
                val sharedDeferred = async { runCatching { repository.getDailyDeck(day).tickers }.getOrNull() }
                val brandsResult = runCatching { repository.getBrands() }

                val dailySwipes = dailySwipesDeferred.await()
                val limit = dailySwipes?.limit?.takeIf { it > 0 } ?: FALLBACK_DAILY_LIMIT
                val served = if (dailySwipes != null && dailySwipes.date == todayKey()) dailySwipes.count else 0
                // The server hasn't heard of swipes still in their undo window, or ones made offline.
                val swiped = if (repick) maxOf(_swipedToday.value, served + pendingSwipeJobs.size) else served
                _dailyLimit.value = limit
                _swipedToday.value = swiped
                // Set both ways: a deck reloaded at the 9am rollover starts under the limit again.
                _hasReachedLimit.value = swiped >= limit
                // Today's swipes anywhere (this phone or another): those cards are done for the day. The deck's cap
                // already counts them; leaving the cards in showed the ones swiped elsewhere again and hid the last few.
                var swipedIds = emptySet<String>()
                statsDeferred.await()?.let { swipes ->
                    swipedIds = swipes.map { it.brandId }.toSet()
                    val saved = swipes.filter { it.direction == "right" }.map { it.brandId }.toSet().size
                    val passed = swipes.filter { it.direction == "left" }.map { it.brandId }.toSet().size
                    _todayStats.value = saved to passed
                }

                brandsResult.onSuccess { res ->
                    // Shared with news search, which maps tickers and company names.
                    com.stak.demo.data.BrandNames.fill(res.brands)
                    val recs = recsDeferred.await()
                    passedAt = passedDeferred.await()?.associateBy { it.id }?.toMutableMap()
                    val picks = todaysPicks(res.brands, recs?.brandIds.orEmpty(), limit, passedAt.orEmpty(), recs?.categories.orEmpty(), sharedDeferred.await(), day)
                    quotedRef = StakClock.lastCloseRef()
                    val quotes = if (picks.isNotEmpty()) {
                        runCatching { repository.batchQuotes(picks.map { it.ticker }) }.getOrNull()?.quotes ?: emptyMap()
                    } else emptyMap()
                    val cards = picks.mapIndexed { i, brand ->
                        val q = quotes[brand.ticker]
                        val colors = CARD_COLOR_PALETTE[i % CARD_COLOR_PALETTE.size]
                        DeckCard(
                            logoUrl = brandLogoUrl(brand),
                            artRes = CARD_ART[brand.ticker] ?: 0,
                            brandId = brand.id,
                            ticker = "${brand.ticker} · ${brand.name}",
                            headline = brand.bio,
                            // A $0 quote (a halted or unknown symbol) is no price - "—", which the reprice pass retries.
                            price = if (q != null && q.price > 0) formatPrice(q.price) else "—",
                            change = if (q != null && q.price > 0) formatChange(q.changePercent) else "—",
                            tip = "",
                            cardTop = colors.first,
                            artBg = colors.second,
                            categories = brand.interestCategories,
                        )
                    }
                    _deck.value = cards.filter { it.brandId !in swipedIds }
                    if (resetSessionOnLoad) { DeckSession.load(); resetSessionOnLoad = false }
                    prefetchTips(cards)
                    prefetchQuickLooks(cards)
                }.onFailure {
                    if (!repick) {
                        _deck.value = emptyList()
                        _loadError.value = true
                    }
                }
            }
            _loading.value = false
        }
    }

    /**
     * Today's deck: the backend's personalised ranking (the same
     * /api/recommendations order the web deck uses), minus stocks already in
     * My STAK, anything passed in the last 24h (older passes return at the
     * back) and anything passed [PASS_HIDE_COUNT] times, at most [MAX_PER_CATEGORY]
     * per category, capped at the daily limit - every platform's rules.
     *
     * One deck a day across devices (web's lib/dailyDeck chooseDailyDeck): the deck
     * another device - or an earlier launch - picked ([shared], kept by the server)
     * comes first; else this phone's own pin; else one picked now and offered to the
     * server, which keeps the first one offered. A deck stands even when it's all been
     * saved since: today's picks are done, not re-picked.
     */
    private suspend fun todaysPicks(
        brands: List<BrandSummaryDto>,
        ranked: List<String>,
        limit: Int,
        passed: Map<String, PassedEntry>,
        categories: Map<String, String>,
        shared: List<String>?,
        key: String,
    ): List<BrandSummaryDto> {
        val byTicker = brands.associateBy { it.ticker }
        val pinned = StakStore.getString(PICKS_KEY).orEmpty().split(",").filter { it.isNotBlank() }.takeIf {
            it.isNotEmpty() && StakStore.getString(PICKS_DAY_KEY) == key && StakStore.getInt(PICKS_VERSION_KEY, 0) == PICKS_VERSION
        }
        // Only a real personalised ranking is shared or pinned. A fallback order (ranking
        // unavailable - offline, or an expired session) must not decide the whole day.
        val tickers = when {
            !shared.isNullOrEmpty() -> shared
            pinned == null && ranked.isEmpty() -> null
            else -> {
                val mine = pinned ?: freshPicks(brands, ranked, limit, passed, categories).map { it.ticker }
                if (shared == null) mine
                else runCatching { repository.offerDailyDeck(key, mine).tickers }.getOrNull()?.takeIf { it.isNotEmpty() } ?: mine
            }
        }
        // Shared only when the server had a say: a deck picked offline is this phone's alone until it can ask again.
        deckShared = shared != null && tickers != null
        if (tickers == null) {
            val picks = freshPicks(brands, ranked, limit, passed, categories)
            _deckLabel.value = deckLabelFor(picks, categories)
            return picks
        }
        // The label describes the whole day's deck, so it stays put as cards leave.
        val label = if (tickers == pinned) StakStore.getString(PICKS_LABEL_KEY) ?: deckLabelFor(tickers.mapNotNull { byTicker[it] }, categories)
        else deckLabelFor(tickers.mapNotNull { byTicker[it] }, categories)
        StakStore.putString(PICKS_DAY_KEY, key)
        StakStore.putString(PICKS_KEY, tickers.joinToString(","))
        StakStore.putInt(PICKS_VERSION_KEY, PICKS_VERSION)
        StakStore.putString(PICKS_LABEL_KEY, label)
        _deckLabel.value = label
        // A stock saved since the deck was picked (on any device, or from a stock page) leaves it - undoing a swipe on
        // it would have removed that earlier save (iOS's filter).
        val held = MyStakHoldings.tickers
        return tickers.mapNotNull { byTicker[it] }.filter { it.ticker !in held }
    }

    /** Today's picks from [ranked]: what [todaysPicks] shows when no deck is picked for the day yet. */
    private fun freshPicks(
        brands: List<BrandSummaryDto>,
        ranked: List<String>,
        limit: Int,
        passed: Map<String, PassedEntry>,
        categories: Map<String, String>,
    ): List<BrandSummaryDto> {
        val byTicker = brands.associateBy { it.ticker }
        val rankedSet = ranked.toSet()
        val ordered = ranked.mapNotNull { byTicker[it] } + brands.filter { it.ticker !in rankedSet }
        val held = MyStakHoldings.tickers
        val dayAgo = System.currentTimeMillis() - 24 * 60 * 60 * 1000L
        val eligible = ordered.filter { brand ->
            val pass = passed[brand.id]
            brand.ticker !in held && (pass == null || (pass.count < PASS_HIDE_COUNT && pass.at <= dayAgo))
        }
        return withCategoryCap(eligible.filter { it.id !in passed } + eligible.filter { it.id in passed }, categories, limit)
    }

    fun recordSwipe(brandId: String, isSTAK: Boolean, timeOnCardMs: Long? = null, categories: List<String> = emptyList()) {
        if (brandId.isBlank()) return
        val ticker = _deck.value.firstOrNull { it.brandId == brandId }?.symbol
        val key = todayKey()
        _swipedToday.value += 1
        val job = viewModelScope.launch {
            delay(3_000)
            val res = runCatching {
                repository.recordSwipe(
                    RecordSwipeRequest(
                        brandId = brandId,
                        direction = if (isSTAK) "right" else "left",
                        todayKey = key,
                        ticker = ticker,
                        timeOnCardMs = timeOnCardMs,
                        categories = categories.ifEmpty { null },
                    )
                )
            }.getOrNull()
            pendingSwipeJobs.remove(brandId)
            if (res != null) {
                if (res.dailySwipeLimit > 0) _dailyLimit.value = res.dailySwipeLimit
                // Re-anchor on the server's count; swipes still in their undo window stay counted.
                _swipedToday.value = res.dailySwipeCount + pendingSwipeJobs.size
                if (res.limitReached) _hasReachedLimit.value = true
                if (res.success && !isSTAK) recordPass(brandId)
                // Saving clears a stock's passes (the server drops them with the save) - so a later pass list doesn't put them back.
                if (res.success && isSTAK) passedAt?.remove(brandId)
            }
        }
        pendingSwipeJobs[brandId] = job
    }

    /** Count a sent pass in the backend's passed list (the list every platform re-queues from). */
    private suspend fun recordPass(brandId: String) {
        val counted = runCatching { repository.addPass(brandId).entry }.getOrNull()
        passedAt?.let { it[brandId] = counted ?: PassedEntry(brandId, System.currentTimeMillis(), (it[brandId]?.count ?: 0) + 1) }
    }

    fun retry() = fetchDeck()

    fun cancelPendingSwipe(brandId: String) {
        val job = pendingSwipeJobs.remove(brandId) ?: return
        job.cancel()
        _swipedToday.value = (_swipedToday.value - 1).coerceAtLeast(0)
    }

    /** Learn-more taps feed the taste profile, as on web (POST /api/swipe/event). */
    fun recordLearnMore(card: DeckCard) {
        if (card.brandId.isBlank()) return
        viewModelScope.launch {
            runCatching {
                repository.recordEvent(
                    EngagementEventRequest(
                        type = "learn_more",
                        brandId = card.brandId,
                        ticker = card.symbol,
                        categories = card.categories.ifEmpty { null },
                        todayKey = todayKey(),
                    )
                )
            }
        }
    }

    /** Warms each card's Quick Look one at a time, so "Learn more" rarely waits on generation. */
    private fun prefetchQuickLooks(cards: List<DeckCard>) {
        viewModelScope.launch {
            cards.filter { it.brandId.isNotBlank() }.forEach { fetchQuickLook(it.brandId) }
        }
    }

    private var quoteJob: Job? = null
    /** The deck day ([todayKey]) the deck on screen was loaded for. */
    private var loadedDay: String? = null
    /** Whether the deck on screen is the day's shared one; one picked while the server was out of reach isn't. */
    private var deckShared = true
    /** A shared-deck check in flight: the tick doesn't start another. */
    private var checkingShared = false
    /** A rollover reload: DeckSession resets with the new deck, not before it. */
    private var resetSessionOnLoad = false
    /** [StakClock.lastCloseRef] when the deck was last priced - a changed one means the prices predate a session boundary. */
    private var quotedRef: String? = null
    /** Out-of-hours attempts to price cards whose quote never came back; capped so one bad symbol can't poll all night. */
    private var missingRetries = 0

    /**
     * Each tick while Discover is on screen, with the symbols of the cards it shows (none
     * on the end-of-deck screen). Past the 9am rollover the next deck is loaded; otherwise
     * the visible cards are re-priced.
     */
    fun onVisibleTick(visible: List<String>, busy: Boolean = false) {
        if (_loading.value) return
        if (loadedDay != null && loadedDay != todayKey()) {
            // The day's run resets only once the new cards are in (iOS's rule) - resetting first showed the previous
            // day's swiped cards again for a moment, swipeable.
            resetSessionOnLoad = true
            fetchDeck()
            return
        }
        // Not mid-swipe: a card being dragged, flying off, open in Quick Look or inside its undo window stays put.
        if (!deckShared && !busy && pendingSwipeJobs.isEmpty()) checkSharedDeck()
        refreshQuotes(visible)
    }

    /**
     * A deck picked while the server was out of reach: once it answers - the day's shared deck, or a ranking to pick
     * one from - the deck reloads into the shared one (cards swiped today stay out). Nothing new to load, nothing
     * changes - so a phone still offline isn't reloaded every tick.
     */
    private fun checkSharedDeck() {
        if (checkingShared) return
        checkingShared = true
        viewModelScope.launch {
            try {
                val shared = runCatching { repository.getDailyDeck(todayKey()).tickers }.getOrNull() ?: return@launch
                val canPick = shared.isNotEmpty() ||
                    runCatching { repository.getRecommendations().brandIds }.getOrNull().orEmpty().isNotEmpty()
                if (!canPick || _loading.value || pendingSwipeJobs.isNotEmpty()) return@launch
                // 9am passed while asking: the rollover's reload, not a re-pick.
                if (loadedDay != todayKey()) {
                    resetSessionOnLoad = true
                    fetchDeck()
                } else {
                    fetchDeck(repick = true)
                }
            } finally {
                checkingShared = false
            }
        }
    }

    /**
     * Re-prices the visible cards so each - and the price a save records - stays current:
     * while the market is open, once after a session boundary passes, and (a couple of
     * times) for a card whose quote failed.
     */
    private fun refreshQuotes(visible: List<String>) {
        if (visible.isEmpty() || quoteJob?.isActive == true) return
        val ref = StakClock.lastCloseRef()
        val tickers = if (StakClock.isMarketOpen() || ref != quotedRef) {
            visible
        } else {
            val missing = _deck.value.filter { it.symbol in visible && it.price == "—" }.map { it.symbol }
            if (missing.isEmpty() || missingRetries >= MISSING_QUOTE_RETRIES) return
            missingRetries++
            missing
        }
        quoteJob = viewModelScope.launch {
            val quotes = runCatching { repository.batchQuotes(tickers) }.getOrNull()?.quotes ?: return@launch
            quotedRef = ref
            _deck.value = _deck.value.map { c ->
                quotes[c.symbol]?.takeIf { it.price > 0 }?.let { q -> c.copy(price = formatPrice(q.price), change = formatChange(q.changePercent)) } ?: c
            }
        }
    }

    private fun prefetchTips(cards: List<DeckCard>) {
        cards.filter { it.brandId.isNotBlank() && !tipCache.containsKey(it.brandId) }.forEach { card ->
            viewModelScope.launch {
                val tip = runCatching { repository.getBrandTip(card.brandId) }.getOrNull()?.tip ?: return@launch
                if (tip.isNotBlank()) {
                    tipCache[card.brandId] = tip
                    _deck.value = _deck.value.map { c -> if (c.brandId == card.brandId) c.copy(tip = tip) else c }
                }
            }
        }
    }
}

/** A brand's Quick Look: the generated overview, else the profile's cultural sections. */
data class QuickLookData(
    val structured: com.stak.demo.data.QuickLookDto?,
    val sections: List<com.stak.demo.data.CulturalSectionDto>,
)

/** Used only when the server can't be reached; /api/me/daily-swipes serves the real value. */
private const val FALLBACK_DAILY_LIMIT = 10
private const val MISSING_QUOTE_RETRIES = 2
/** The local hour a new deck day begins - the server counts swipes under the same rollover. */
internal const val DECK_DAY_START_HOUR = 9
private const val DEFAULT_DECK_LABEL = "TODAY'S DECK"
private const val PICKS_DAY_KEY = "deck.picks.day"
private const val PICKS_KEY = "deck.picks"
/** Bump when the picking rules change, so a deck pinned under the old rules is re-picked. */
private const val PICKS_VERSION = 3
private const val PICKS_VERSION_KEY = "deck.picks.version"
private const val PICKS_LABEL_KEY = "deck.picks.label"
private const val MAX_PER_CATEGORY = 3
/** Passed this many times, a stock stops coming back to the deck (every platform's rule; saving it clears its passes). */
internal const val PASS_HIDE_COUNT = 5

/**
 * The top [limit] brands with at most [MAX_PER_CATEGORY] per primary category, so
 * one strong interest (every chip stock) can't fill the whole deck. Capped-out
 * brands fill in, in rank order, only when other categories run out.
 */
private fun withCategoryCap(ordered: List<BrandSummaryDto>, categories: Map<String, String>, limit: Int): List<BrandSummaryDto> {
    val perCategory = mutableMapOf<String, Int>()
    val picks = mutableListOf<BrandSummaryDto>()
    val overflow = mutableListOf<BrandSummaryDto>()
    for (brand in ordered) {
        if (picks.size == limit) break
        val category = categories[brand.ticker] ?: brand.ticker
        val count = perCategory[category] ?: 0
        if (count < MAX_PER_CATEGORY) {
            picks += brand
            perCategory[category] = count + 1
        } else {
            overflow += brand
        }
    }
    return picks + overflow.take(limit - picks.size)
}

/**
 * "TODAY · CHIPS, E-COMMERCE & MORE": the deck's own leading categories, so the
 * label always describes the cards under it. Ties keep rank order.
 */
private fun deckLabelFor(picks: List<BrandSummaryDto>, categories: Map<String, String>): String {
    val names = picks.mapNotNull { categories[it.ticker]?.let(::categoryName) }
    if (names.isEmpty()) return DEFAULT_DECK_LABEL
    val counts = names.groupingBy { it }.eachCount()
    val top = names.distinct().sortedByDescending { counts.getValue(it) }
    val text = when (top.size) {
        1 -> top[0]
        2 -> "${top[0]} & ${top[1]}"
        else -> "${top[0]}, ${top[1]} & more"
    }
    return "TODAY · ${text.uppercase()}"
}

private fun brandLogoUrl(brand: BrandSummaryDto): String? =
    brand.logo ?: brand.domain?.let { "https://cdn.brandfetch.io/$it/w/400/h/400" }

private val CARD_COLOR_PALETTE = listOf(
    Color(0xFF152A47) to Color(0xFF142844),
    Color(0xFF283E5D) to Color(0xFF253A59),
    Color(0xFF263D5D) to Color(0xFF2F486E),
    Color(0xFF1A2E4A) to Color(0xFF192C47),
    Color(0xFF1E3552) to Color(0xFF1B3050),
    Color(0xFF162840) to Color(0xFF15263E),
    Color(0xFF233549) to Color(0xFF203246),
)

/** The swipe day: rolls over at 9am local, matching the key the server counts swipes under. */
internal fun todayKey(): String {
    val now = Calendar.getInstance()
    if (now.get(Calendar.HOUR_OF_DAY) < DECK_DAY_START_HOUR) now.add(Calendar.DATE, -1)
    // Western digits whatever the phone's language: the server reads this key (and an Arabic or Persian locale's digits
    // wouldn't match the other devices').
    return String.format(Locale.US, "%04d-%02d-%02d",
        now.get(Calendar.YEAR),
        now.get(Calendar.MONTH) + 1,
        now.get(Calendar.DAY_OF_MONTH),
    )
}

/** When today's swipe day began (9am local on [todayKey]'s date), as an ISO instant. */
private fun swipeDayStartIso(): String =
    java.time.LocalDate.parse(todayKey()).atTime(DECK_DAY_START_HOUR, 0).atZone(java.time.ZoneId.systemDefault()).toInstant().toString()

internal fun formatPrice(price: Double): String =
    "$${String.format(Locale.US, "%,.2f", price)}"

internal fun formatChange(pct: Double): String {
    val arrow = if (pct >= 0.0) "▲" else "▼"
    return "$arrow ${String.format(Locale.US, "%.1f", abs(pct))}% today"
}

