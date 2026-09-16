package com.stak.demo.ui.news

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.StockDetailResponse
import com.stak.demo.data.StockRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Live quote and metrics for the stocks an authored story is about. The story
 * pages drew their stock card and Key stats from NewsArticleFeed's demo table on
 * every account, so a real reader saw Amazon at $242.18, up 2.87%, while it traded
 * at $246.81, down 0.7% (device check, 2026-09-16). Each ticker is fetched once
 * per screen; a failed fetch may be retried by the next page that asks for it.
 */
@HiltViewModel
class ArticleStockViewModel @Inject constructor(
    private val repository: StockRepository,
) : ViewModel() {
    private val _stocks = MutableStateFlow<Map<String, StockDetailResponse>>(emptyMap())
    val stocks: StateFlow<Map<String, StockDetailResponse>> = _stocks

    private val requested = mutableSetOf<String>()

    fun load(ticker: String) {
        if (!requested.add(ticker)) return
        viewModelScope.launch {
            runCatching { repository.getStock(ticker) }
                .onSuccess { _stocks.value = _stocks.value + (ticker to it) }
                .onFailure { requested.remove(ticker) }
        }
    }
}
