package com.stak.demo.ui.discover

import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.BrandSummaryDto
import com.stak.demo.data.EngagementEventRequest
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.PassedEntry
import com.stak.demo.data.RecordSwipeRequest
import com.stak.demo.data.StakStore
import com.stak.demo.data.StockRepository
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
    /** brandId -> epoch ms of the last pass. Null until read: PUT replaces the server list, so never write blind. */
    private var passedAt: MutableMap<String, Long>? = null

    /**
     * Quick Look for any brand: the generated structured overview
     * (GET /api/brands/:id/quick-look), or the profile's cultural-context
     * sections when generation isn't available.
     */
    suspend fun fetchQuickLook(brandId: String): QuickLookData {
        quickLookCache[brandId]?.let { return it }
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

    private fun fetchDeck() {
        viewModelScope.launch {
            _loading.value = true
            _loadError.value = false
            coroutineScope {
                val dailySwipesDeferred = async { runCatching { repository.getDailySwipes() }.getOrNull() }
                val recsDeferred = async { runCatching { repository.getRecommendations() }.getOrNull() }
                val statsDeferred = async { runCatching { repository.getSwipes(swipeDayStartIso()).swipes }.getOrNull() }
                val passedDeferred = async { runCatching { repository.getPassed().entries }.getOrNull() }
                val brandsResult = runCatching { repository.getBrands() }

                val dailySwipes = dailySwipesDeferred.await()
                val limit = dailySwipes?.limit?.takeIf { it > 0 } ?: FALLBACK_DAILY_LIMIT
                val swiped = if (dailySwipes != null && dailySwipes.date == todayKey()) dailySwipes.count else 0
                _dailyLimit.value = limit
                _swipedToday.value = swiped
                if (swiped >= limit) _hasReachedLimit.value = true
                statsDeferred.await()?.let { swipes ->
                    val saved = swipes.filter { it.direction == "right" }.map { it.brandId }.toSet().size
                    val passed = swipes.filter { it.direction == "left" }.map { it.brandId }.toSet().size
                    _todayStats.value = saved to passed
                }

                brandsResult.onSuccess { res ->
                    val recs = recsDeferred.await()
                    recs?.theme?.takeIf { it.isNotBlank() }?.let { _deckLabel.value = "TODAY · ${it.uppercase()}" }
                    passedAt = passedDeferred.await()?.associate { it.id to it.at }?.toMutableMap()
                    val picks = todaysPicks(res.brands, recs?.brandIds.orEmpty(), limit, passedAt.orEmpty(), recs?.categories.orEmpty())
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
                            price = if (q != null) formatPrice(q.price) else "—",
                            change = if (q != null) formatChange(q.changePercent) else "—",
                            tip = "",
                            cardTop = colors.first,
                            artBg = colors.second,
                            categories = brand.interestCategories,
                        )
                    }
                    _deck.value = cards
                    prefetchTips(cards)
                    prefetchQuickLooks(cards)
                }.onFailure {
                    _deck.value = emptyList()
                    _loadError.value = true
                }
            }
            _loading.value = false
        }
    }

    /**
     * Today's deck: the backend's personalised ranking (the same
     * /api/recommendations order the web deck uses), minus stocks already in
     * My STAK and anything passed in the last 24h (older passes return at the
     * back, as on web), capped at the daily limit. Pinned per day so a relaunch or a
     * refreshed ranking doesn't reshuffle a deck the user is part-way through.
     */
    private fun todaysPicks(
        brands: List<BrandSummaryDto>,
        ranked: List<String>,
        limit: Int,
        passed: Map<String, Long>,
        categories: Map<String, String>,
    ): List<BrandSummaryDto> {
        val byTicker = brands.associateBy { it.ticker }
        val key = todayKey()
        if (StakStore.getString(PICKS_DAY_KEY) == key && StakStore.getInt(PICKS_VERSION_KEY, 0) == PICKS_VERSION) {
            val pinned = StakStore.getString(PICKS_KEY).orEmpty().split(",").mapNotNull { byTicker[it] }
            if (pinned.isNotEmpty()) return pinned
        }
        val rankedSet = ranked.toSet()
        val ordered = ranked.mapNotNull { byTicker[it] } + brands.filter { it.ticker !in rankedSet }
        val held = MyStakHoldings.tickers
        val dayAgo = System.currentTimeMillis() - 24 * 60 * 60 * 1000L
        val eligible = ordered.filter { it.ticker !in held && (passed[it.id] ?: 0L) <= dayAgo }
        val picks = withCategoryCap(eligible.filter { it.id !in passed } + eligible.filter { it.id in passed }, categories, limit)
        // Only a real personalised ranking is pinned. A fallback order (ranking
        // unavailable - offline, or an expired session) must not decide the whole day.
        if (ranked.isNotEmpty()) {
            StakStore.putString(PICKS_DAY_KEY, key)
            StakStore.putString(PICKS_KEY, picks.joinToString(",") { it.ticker })
            StakStore.putInt(PICKS_VERSION_KEY, PICKS_VERSION)
        }
        return picks
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
            }
        }
        pendingSwipeJobs[brandId] = job
    }

    /** Mirror a sent pass into the backend's passed list (the list web re-queues from). */
    private suspend fun recordPass(brandId: String) {
        val entries = passedAt ?: return
        entries[brandId] = System.currentTimeMillis()
        runCatching { repository.putPassed(entries.map { (id, at) -> PassedEntry(id, at) }) }
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
private const val DEFAULT_DECK_LABEL = "TODAY'S DECK"
private const val PICKS_DAY_KEY = "deck.picks.day"
private const val PICKS_KEY = "deck.picks"
/** Bump when the picking rules change, so a deck pinned under the old rules is re-picked. */
private const val PICKS_VERSION = 2
private const val PICKS_VERSION_KEY = "deck.picks.version"
private const val MAX_PER_CATEGORY = 3

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
    if (now.get(Calendar.HOUR_OF_DAY) < 9) now.add(Calendar.DATE, -1)
    return "%04d-%02d-%02d".format(
        now.get(Calendar.YEAR),
        now.get(Calendar.MONTH) + 1,
        now.get(Calendar.DAY_OF_MONTH),
    )
}

/** When today's swipe day began (9am local on [todayKey]'s date), as an ISO instant. */
private fun swipeDayStartIso(): String =
    java.time.LocalDate.parse(todayKey()).atTime(9, 0).atZone(java.time.ZoneId.systemDefault()).toInstant().toString()

internal fun formatPrice(price: Double): String =
    "$${String.format(Locale.US, "%,.2f", price)}"

internal fun formatChange(pct: Double): String {
    val arrow = if (pct >= 0.0) "▲" else "▼"
    return "$arrow ${String.format(Locale.US, "%.1f", abs(pct))}% today"
}
