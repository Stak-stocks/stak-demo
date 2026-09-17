package com.stak.demo.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * The engagement log (POST /api/swipe/event): what a real account opens and asks about,
 * kept from day one so the Taste Graph can show its evidence and later features can look
 * back. Only observable actions are recorded - never a guess at what the user understands.
 * Fire-and-forget: a failed log never touches the screen. The demo account logs nothing.
 */
object StakEvents {
	const val STOCK_DETAIL_OPEN = "stock_detail_open"
	const val METRIC_EXPLAINER_OPEN = "metric_explainer_open"
	const val RISK_CTA_OPEN = "risk_cta_open"
	const val WATCHPOINT_OPEN = "watchpoint_open"
	const val NEWS_SIGNAL_OPEN = "news_signal_open"
	const val COMPARE_OPEN = "compare_open"
	const val ANALYST_OPEN = "analyst_open"
	const val UPDATE_OPEN = "update_open"
	const val TASTE_GRAPH_OPEN = "taste_graph_open"

	private var repository: StockRepository? = null
	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

	fun init(repo: StockRepository) {
		repository = repo
	}

	fun log(type: String, ticker: String? = null, brandId: String? = null, params: Map<String, Any>? = null) {
		if (Session.demoAccount || Session.token == null) return
		val repo = repository ?: return
		scope.launch {
			runCatching {
				repo.recordEvent(
					EngagementEventRequest(
						type = type,
						ticker = ticker,
						brandId = brandId ?: ticker?.let { MyStakHoldings.brandIdOf(it) },
						params = params,
						todayKey = com.stak.demo.ui.discover.todayKey(),
					),
				)
			}
		}
	}
}
