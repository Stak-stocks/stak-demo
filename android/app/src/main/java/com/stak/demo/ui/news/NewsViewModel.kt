package com.stak.demo.ui.news

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.DailyBriefResponse
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.NewsArticleDto
import com.stak.demo.data.Session
import com.stak.demo.data.StockRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

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

    init {
        fetchNews()
        fetchForYouNews()
        if (Session.token != null) fetchDailyBrief()
    }

    /** True once the market news request has failed, so screens can say so instead of waiting. */
    private val _liveNewsFailed = MutableStateFlow(false)
    val liveNewsFailed: StateFlow<Boolean> = _liveNewsFailed

    private fun fetchNews() {
        viewModelScope.launch {
            runCatching { repository.getMarketNews() }
                .onSuccess { _liveNews.value = it.articles; _liveNewsFailed.value = false }
                .onFailure { _liveNewsFailed.value = true }
        }
    }

    private fun fetchDailyBrief() {
        viewModelScope.launch {
            runCatching { repository.getDailyBrief() }
                .onSuccess { _dailyBrief.value = it }
                // Exit the loading state with no mood: "calm" was reported as the market's
                // reading whenever the request failed.
                .onFailure { _dailyBrief.value = DailyBriefResponse(mood = "") }
        }
    }

    // Called from NewsScreen on each entry so new holdings from Discover are picked up.
    fun refreshForYou() { fetchForYouNews() }

    private fun fetchForYouNews() {
        val held = MyStakHoldings.tickers.toList()
        if (held.isEmpty()) return
        viewModelScope.launch {
            val allArticles = coroutineScope {
                held.map { ticker ->
                    async {
                        runCatching { repository.getCompanyNews(ticker) }
                            .getOrNull()?.articles.orEmpty()
                            // A company query also returns stories that are only near the
                            // company ("sector"). Stamping the queried ticker on every one
                            // labelled a Joby story as NVIDIA news, with NVIDIA's price
                            // beside it; only a story about the company carries its ticker.
                            .map { it.copy(ticker = if (it.type == "company") ticker else "") }
                    }
                }.awaitAll().flatten()
            }
            val seen = mutableSetOf<String>()
            _forYouNews.value = allArticles
                // For You is news about the user's own stocks. A company query also returns
                // stories merely near it, which led the list with ones like "Why GE Vernova
                // Stock Crushed it" for someone holding Google, Nvidia, Tesla and Meta
                // (device check, 2026-09-16); those stay in Markets, not here.
                .filter { it.ticker.isNotBlank() }
                .filter { it.url.isNotBlank() && seen.add(it.url) }
                .sortedByDescending { it.datetime }
                .take(10)
        }
    }
}
