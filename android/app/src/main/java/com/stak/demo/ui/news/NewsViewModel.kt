package com.stak.demo.ui.news

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.DailyBriefResponse
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.NewsArticleDto
import com.stak.demo.data.Session
import com.stak.demo.data.StakClock
import com.stak.demo.data.StockRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** For You reads the newest saves, at most this many companies (the server caps the request the same). */
private const val FOR_YOU_TICKER_CAP = 10
/** Companies still being written up come back `pending`; For You asks again after this long, this many times. */
private const val FOR_YOU_PENDING_DELAY_MS = 8_000L
private const val FOR_YOU_PENDING_RETRIES = 3
/** For You's length, and how many of its stories one company may take - so one stock's busy day can't fill it. */
private const val FOR_YOU_STORY_CAP = 10
private const val FOR_YOU_PER_COMPANY_CAP = 2
/** Market news older than this reloads - it's the server's cached feed, so keeping it fresh costs next to nothing. */
private const val NEWS_MAX_AGE_MS = 15 * 60_000L
/** A failed load is tried again after this long, not on every check. */
private const val RETRY_AFTER_MS = 2 * 60_000L
/** A new brief session's re-read waits a random 0 to this long, so open apps don't all ask the server at once. */
private const val BRIEF_SPREAD_MS = 2 * 60_000L
/** Reads that came back still written for the previous session before the served brief is taken as this one's. */
private const val MAX_BRIEF_MISMATCHES = 10

@HiltViewModel
class NewsViewModel @Inject constructor(
    private val repository: StockRepository,
) : ViewModel() {
    private val _liveNews = MutableStateFlow<List<NewsArticleDto>>(emptyList())
    val liveNews: StateFlow<List<NewsArticleDto>> = _liveNews

    private val _dailyBrief = MutableStateFlow<DailyBriefResponse?>(null)
    val dailyBrief: StateFlow<DailyBriefResponse?> = _dailyBrief

    private val _forYouNews = MutableStateFlow<List<NewsArticleDto>>(emptyList())
    val forYouNews: StateFlow<List<NewsArticleDto>> = _forYouNews

    // Declared before init: the first fetches set them.
    private var newsLoadedAt = 0L
    private var newsAttemptAt = 0L
    private var newsInFlight = false
    /** The StakClock.briefSessionKey the shown brief was written for. */
    private var briefKey: String? = null
    private var briefFailed = false
    private var briefAttemptAt = 0L
    private var briefInFlight = false
    /** The new session waiting for its re-read, and until when (see BRIEF_SPREAD_MS). */
    private var spreadKey: String? = null
    private var spreadUntil = 0L
    /** Reads for [mismatchKey]'s session that came back written for the one before. */
    private var mismatchKey: String? = null
    private var mismatches = 0

    init {
        fetchNews()
        fetchForYouNews()
        if (Session.token != null) fetchDailyBrief()
    }

    /** True once the market news request has failed, so screens can say so instead of waiting. */
    private val _liveNewsFailed = MutableStateFlow(false)
    val liveNewsFailed: StateFlow<Boolean> = _liveNewsFailed

    /**
     * True once the market news request has finished, whatever it brought back. An empty
     * list alone can't tell "still loading" from "nothing came", and the News tab showed
     * "couldn't be loaded" in the moment before the stories arrived.
     */
    private val _liveNewsSettled = MutableStateFlow(false)
    val liveNewsSettled: StateFlow<Boolean> = _liveNewsSettled

    /**
     * Keeps the brief and the market news current while the app is open, with no pull to refresh (Robinhood-style):
     * the shell calls this every minute and on returning to the app. The news reloads once it's 15 minutes old; the
     * brief once per market session (StakClock.briefPhase). Anything that failed is tried again every 2 minutes.
     * Mirrors ios NewsViewModel.refreshIfStale.
     */
    fun refreshIfStale() {
        val now = System.currentTimeMillis()
        val newsDue = when {
            newsInFlight -> false
            _liveNewsFailed.value -> now - newsAttemptAt >= RETRY_AFTER_MS
            else -> now - newsLoadedAt >= NEWS_MAX_AGE_MS
        }
        if (newsDue) fetchNews()
        if (briefDue(now)) fetchDailyBrief()
    }

    /** The error card's Retry: what failed, now - not at the next 2-minute retry. */
    fun retryNow() {
        if (_liveNewsFailed.value && !newsInFlight) fetchNews()
        if (briefFailed && !briefInFlight && Session.token != null) fetchDailyBrief()
    }

    private fun briefDue(now: Long): Boolean {
        if (Session.token == null || briefInFlight) return false
        if (briefFailed) return now - briefAttemptAt >= RETRY_AFTER_MS
        val key = StakClock.briefSessionKey()
        if (key == briefKey) return false
        // A read for this session already came back written for the last one: ask again every 2 minutes.
        if (mismatchKey == key && mismatches > 0) return now - briefAttemptAt >= RETRY_AFTER_MS
        // A new session (not the first load): wait a random 0-2 minutes, so open apps don't all ask at once.
        if (briefKey != null) {
            if (spreadKey != key) {
                spreadKey = key
                spreadUntil = now + kotlin.random.Random.nextLong(0, BRIEF_SPREAD_MS + 1)
            }
            if (now < spreadUntil) return false
        }
        return true
    }

    /** Claims the request synchronously (on the main thread) before launching it, so a second check can't send it again. */
    private fun fetchNews() {
        newsInFlight = true
        newsAttemptAt = System.currentTimeMillis()
        viewModelScope.launch {
            runCatching { repository.getMarketNews() }
                .onSuccess {
                    _liveNews.value = it.articles
                    _liveNewsFailed.value = false
                    newsLoadedAt = System.currentTimeMillis()
                }
                .onFailure { _liveNewsFailed.value = true }
            _liveNewsSettled.value = true
            newsInFlight = false
        }
    }

    private fun fetchDailyBrief() {
        val key = StakClock.briefSessionKey()
        val phase = StakClock.briefPhase()
        briefInFlight = true
        briefAttemptAt = System.currentTimeMillis()
        viewModelScope.launch {
            runCatching { repository.getDailyBrief() }
                .onSuccess { brief ->
                    _dailyBrief.value = brief
                    briefFailed = false
                    if (mismatchKey != key) {
                        mismatchKey = key
                        mismatches = 0
                    }
                    // Taken as this session's only once it says so (see StakClock.briefFits), or after enough tries
                    // that the server's answer is simply what this session is.
                    if (StakClock.briefFits(phase, brief.session, brief.marketClosed, brief.dayLabel) || mismatches >= MAX_BRIEF_MISMATCHES) {
                        briefKey = key
                        mismatches = 0
                    } else {
                        mismatches++
                    }
                }
                .onFailure {
                    briefFailed = true
                    // Exit the loading state with no mood: "calm" was reported as the market's reading whenever the
                    // request failed. A failed re-read keeps the brief already shown.
                    if (_dailyBrief.value == null) _dailyBrief.value = DailyBriefResponse(mood = "")
                }
            briefInFlight = false
        }
    }

    /** Loads the ticker/name lookup the first time search is opened, unless Discover already has. */
    fun prepareSearch() {
        viewModelScope.launch { com.stak.demo.data.BrandNames.ensure(repository) }
    }

    /** When For You last loaded, and for which holdings. */
    private var forYouAt = 0L
    private var forYouFor: Set<String>? = null

    /**
     * Called from NewsScreen on each entry so new holdings from Discover are picked up.
     * The same holdings are reloaded at most once a minute after a successful load; a
     * change of holdings, or a load that failed, reloads at once.
     */
    fun refreshForYou() {
        val sameHoldings = forYouFor == MyStakHoldings.tickers
        if (sameHoldings && System.currentTimeMillis() - forYouAt < 60_000) return
        fetchForYouNews()
    }

    private fun fetchForYouNews(attempt: Int = 0) {
        val held = MyStakHoldings.tickers.toList()
        forYouFor = MyStakHoldings.tickers
        // Nothing held, nothing for you: stories about stocks since removed don't linger.
        if (held.isEmpty()) {
            _forYouNews.value = emptyList()
            return
        }
        viewModelScope.launch {
            // One request for up to 10 saves (the server takes 10 at most) - a daily-rotating pick when there are more.
            val response = runCatching { repository.getForYouNews(forYouCompanies(held)) }.getOrNull()
                // Failed: keep what's showing, and let the next visit try again straight away.
                ?: return@launch
            forYouAt = System.currentTimeMillis()
            val allArticles = response.results.flatMap { company ->
                // A company query also returns stories that are only near the
                // company ("sector"). Stamping the queried ticker on every one
                // labelled a Joby story as NVIDIA news, with NVIDIA's price
                // beside it; only a story about the company carries its ticker.
                company.articles.map { it.copy(ticker = if (it.type == "company") company.ticker else "") }
            }
            _forYouNews.value = forYouList(allArticles)
            // Companies the server was still writing up: ask again shortly (a few times at most).
            if (response.pending.isNotEmpty() && attempt < FOR_YOU_PENDING_RETRIES) {
                delay(FOR_YOU_PENDING_DELAY_MS)
                if (forYouFor == MyStakHoldings.tickers) fetchForYouNews(attempt + 1)
            }
        }
    }

    companion object {
        /**
         * Which saved companies For You asks about: all of them up to 10; beyond that, 10 picked by a shuffle that
         * changes once a day (US Eastern) - a different mix of the saves each day, steady within it, so a story doesn't
         * vanish between visits. The same pick as iOS (FNV-1a of "day|TICKER").
         */
        internal fun forYouCompanies(saved: List<String>, day: String = com.stak.demo.data.StakClock.marketDay()): List<String> {
            val tickers = saved.map { it.uppercase() }.sorted()
            if (tickers.size <= FOR_YOU_TICKER_CAP) return tickers
            fun rank(ticker: String): Long {
                var hash = 0x811C9DC5.toInt()
                for (byte in "$day|$ticker".toByteArray(Charsets.UTF_8)) {
                    hash = hash xor (byte.toInt() and 0xFF)
                    hash *= 16777619
                }
                return hash.toLong() and 0xFFFFFFFFL
            }
            return tickers.sortedWith(compareBy<String>({ rank(it) }, { it })).take(FOR_YOU_TICKER_CAP)
        }

        /**
         * For You's stories. For You is news about the user's own stocks: a company query also returns stories merely
         * near it, which led the list with ones like "Why GE Vernova Stock Crushed it" for someone holding Google,
         * Nvidia, Tesla and Meta (device check, 2026-09-16); those stay in Markets. Each link once, newest first, 10 at
         * most and no more than 2 from one company - topped up past that cap only when too few companies have news.
         */
        internal fun forYouList(articles: List<NewsArticleDto>): List<NewsArticleDto> {
            val seen = mutableSetOf<String>()
            val stories = articles
                .filter { it.ticker.isNotBlank() && it.url.isNotBlank() && seen.add(it.url) }
                .sortedByDescending { it.datetime }
            val perCompany = mutableMapOf<String, Int>()
            val picked = mutableListOf<NewsArticleDto>()
            val overflow = mutableListOf<NewsArticleDto>()
            for (story in stories) {
                if (picked.size == FOR_YOU_STORY_CAP) break
                if ((perCompany[story.ticker] ?: 0) < FOR_YOU_PER_COMPANY_CAP) {
                    picked += story
                    perCompany[story.ticker] = (perCompany[story.ticker] ?: 0) + 1
                } else {
                    overflow += story
                }
            }
            return (picked + overflow.take(FOR_YOU_STORY_CAP - picked.size)).sortedByDescending { it.datetime }
        }
    }
}
