package com.stak.demo.ui.home

import com.stak.demo.ui.news.DailyBriefHolder

/**
 * Market Mood data source — derives score and status text directly from the
 * daily-brief mood string served by the backend. Since DailyBriefHolder uses
 * mutableStateOf, any composable reading these properties recomposes
 * automatically when new data arrives.
 */
object MarketMoodFeed {
    const val LIVE = true

    /** Authored demo needle angle for the pre-data / no-data state. */
    const val DEMO_ANGLE_DEG = 26.27f

    const val DEMO_STATUS_LEAD = "High volatility"
    const val DEMO_STATUS_REST = ", you should consider being cautious."

    /** Score (0–100) derived from the backend mood string; null until data arrives. */
    val score: Float?
        get() = DailyBriefHolder.current?.mood?.takeIf { it.isNotBlank() }?.let { scoreForMood(it) }

    val statusLead: String
        get() = DailyBriefHolder.current?.mood?.takeIf { it.isNotBlank() }?.let { leadForMood(it) } ?: DEMO_STATUS_LEAD

    val statusRest: String
        get() = DailyBriefHolder.current?.mood?.takeIf { it.isNotBlank() }?.let { restForMood(it) } ?: DEMO_STATUS_REST

    fun scoreForMood(mood: String): Float = when (mood.lowercase().trim()) {
        "bullish", "risk-on" -> 85f
        "calm"               -> 72f
        "mixed"              -> 50f
        "cautious"           -> 40f
        "volatile"           -> 25f
        "bearish", "risk-off" -> 12f
        else                 -> 50f
    }

    fun leadForMood(mood: String): String = when (mood.lowercase().trim()) {
        "bullish"  -> "Bullish momentum"
        "risk-on"  -> "Risk-On mode"
        "calm"     -> "Calm markets"
        "mixed"    -> "Mixed signals"
        "cautious" -> "Cautious tone"
        "volatile" -> "High volatility"
        "bearish"  -> "Bearish pressure"
        "risk-off" -> "Risk-Off tone"
        else       -> DEMO_STATUS_LEAD
    }

    fun restForMood(mood: String): String = when (mood.lowercase().trim()) {
        "bullish", "risk-on" -> ", momentum is building."
        "calm"               -> ", markets are calm right now."
        "mixed", "cautious"  -> ", a mixed picture — stay selective."
        else                 -> DEMO_STATUS_REST
    }

    /** Maps score band to gauge angle (0 = red/left, 180 = green/right). */
    fun angleFor(score: Float): Float = (score.coerceIn(0f, 100f) / 100f) * 180f

    /** No-op — score is now derived reactively from DailyBriefHolder. */
    suspend fun refresh() = Unit
}
