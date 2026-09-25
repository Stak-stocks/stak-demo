package com.stak.demo.ui.home

import androidx.compose.ui.graphics.Color
import com.stak.demo.data.Session
import com.stak.demo.ui.news.DailyBriefHolder

/**
 * Market Mood data source — derives score and status text directly from the
 * daily-brief mood string served by the backend. Since DailyBriefHolder uses
 * mutableStateOf, any composable reading these properties recomposes
 * automatically when new data arrives.
 *
 * A real account never sees the authored reading as a stand-in (device check,
 * 2026-09-16): until the brief arrives the card said "High volatility, you should
 * consider being cautious" with the needle pointing at it, and a failed brief was
 * reported as "Calm markets". It now says it is still reading, or that the mood
 * isn't available, and draws no needle. The demo account keeps its authored pose.
 */
object MarketMoodFeed {
    const val LIVE = true

    /** Authored demo needle angle for the pre-data / no-data state. */
    const val DEMO_ANGLE_DEG = 26.27f

    const val DEMO_STATUS_LEAD = "High volatility"
    const val DEMO_STATUS_REST = ", you should consider being cautious."

    /** The brief's mood, or null while it hasn't arrived or came back without one. */
    private val mood: String?
        get() = DailyBriefHolder.current?.mood?.takeIf { it.isNotBlank() }

    /** True once the brief request has finished, whatever it brought back. */
    val settled: Boolean
        get() = DailyBriefHolder.current != null

    /** Score (0–100) derived from the backend mood string; null until data arrives. */
    val score: Float?
        get() = mood?.let { scoreForMood(it) }

    /** Whether the gauge has a reading to point at; the demo always shows its authored one. */
    val hasReading: Boolean
        get() = Session.demoAccount || score != null

    val statusLead: String
        get() = mood?.let { leadForMood(it) } ?: when {
            Session.demoAccount -> DEMO_STATUS_LEAD
            settled -> "Mood unavailable"
            else -> "Reading the market"
        }

    val statusRest: String
        get() = mood?.let { restForMood(it) } ?: when {
            Session.demoAccount -> DEMO_STATUS_REST
            settled -> " right now."
            else -> "\u2026"
        }

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
        // A mood the app doesn't know yet is still the served reading, not the demo's.
        else       -> mood.trim().replaceFirstChar { it.uppercase() }
    }

    fun restForMood(mood: String): String = when (mood.lowercase().trim()) {
        "bullish", "risk-on" -> ", momentum is building."
        "calm"               -> ", markets are calm right now."
        "mixed", "cautious"   -> ", a mixed picture across the market."
        "volatile"            -> ", expect bigger swings than usual."
        "bearish", "risk-off" -> ", investors are pulling back."
        else                  -> "."
    }

    /** Maps score band to gauge angle (0 = red/left, 180 = green/right). */
    fun angleFor(score: Float): Float = (score.coerceIn(0f, 100f) / 100f) * 180f

    /**
     * The needle's fraction of the arc (0 = red/left, 1 = green/right) - the same score
     * Home's gauge angle comes from, so News's gauge can't point somewhere else for the
     * same mood (device report, 2026-09-24: News plotted "volatile" at the same spot as
     * "calm" under its own hand-rolled fraction table, while Home's score-based angle put
     * them on opposite sides of the dial).
     */
    fun fractionFor(mood: String): Float = scoreForMood(mood) / 100f

    /**
     * The mood's colour - one definition for every screen that tints something by mood
     * (device report, 2026-09-24: News had this table copied into two composables in the
     * same file, and Home had no equivalent at all to check either copy against).
     */
    fun colorFor(mood: String): Color = when (mood.lowercase().trim()) {
        "bullish", "risk-on" -> Color(0xFF2FD08A)
        "mixed" -> Color(0xFFDEB940)
        "cautious", "volatile" -> Color(0xFFF5A623)
        "bearish" -> Color(0xFFFF5252)
        "risk-off" -> Color(0xFFB06BE3)
        else -> Color(0xFF69B3CA)
    }

    /** No-op — score is now derived reactively from DailyBriefHolder. */
    suspend fun refresh() = Unit
}
