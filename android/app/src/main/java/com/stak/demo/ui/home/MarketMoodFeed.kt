package com.stak.demo.ui.home

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * Market Mood data source.
 *
 * CONTRACT (designer, 2026-08-22): the mood is computed by the STAK
 * BACKEND from current economic news trends and investor bias - the
 * app only renders the served score. `angleFor(score)` maps the
 * backend's 0..100 onto the gauge's 180deg sweep (0 = trouble/red on
 * the right, 100 = good/green on the left).
 *
 * In this build phase LIVE stays false so the gauge always matches the
 * authored frame rest pose. When the backend endpoint exists,
 * point refresh() at it and flip LIVE. The CNN Fear & Greed fetch
 * below is an INTERIM reference implementation only - it stands in
 * until the STAK backend serves the real mood score.
 */
object MarketMoodFeed {
	/**
	 * The user's call (2026-08-21): the gauge shows the DESIGN DEFAULT in
	 * this build phase so it always matches the Figma. Flip this on for
	 * the production build - then the needle measures the worldwide
	 * market in current time on the user's phone.
	 */
	const val LIVE = false

	var score by mutableStateOf<Float?>(null)
		private set
	private var attempted = false

	/** Authored demo needle angle (1:1158) used until data arrives. */
	// The authored rest pose measured from the 1:1159 SVG itself (blob
	// center -> tip axis). Under angleFor() this corresponds to score
	// ~14.6 - recalibrate the mapping against the backend's scale when
	// it lands (the old 33.4 was a raster estimate with a wrong pivot).
	const val DEMO_ANGLE_DEG = 26.27f

	// The status line is backend-served with the score (designer,
	// 2026-08-22): the lead word pair and the advice change with the
	// computed mood. Authored demo copy for this phase:
	const val DEMO_STATUS_LEAD = "High volatility"
	const val DEMO_STATUS_REST = ", you should consider being cautious."

	/**
	 * The status line BOTH mood cards read - Home's and the News mood row
	 * (Codex audit 2026-09-04: News hard-coded "Low volatility" against the
	 * same needle resting in the red band). The served score's band once
	 * LIVE; the authored demo copy until then. Bands follow the gauge
	 * arcs: red (score < 33) = high, neutral = moderate, green (> 66) = low.
	 * Copy for the two non-demo bands is a stand-in until the backend
	 * serves the status line with the score (designer, 2026-08-22).
	 */
	val statusLead: String get() = score?.let { leadFor(it) } ?: DEMO_STATUS_LEAD
	val statusRest: String get() = score?.let { restFor(it) } ?: DEMO_STATUS_REST

	fun leadFor(score: Float): String = when {
		score < 33f -> "High volatility"
		score <= 66f -> "Moderate volatility"
		else -> "Low volatility"
	}

	fun restFor(score: Float): String = when {
		score < 33f -> DEMO_STATUS_REST
		score <= 66f -> ", a mixed picture - stay selective."
		else -> ", markets are calm right now."
	}

	fun angleFor(score: Float): Float = (score.coerceIn(0f, 100f) / 100f) * 180f

	suspend fun refresh() {
		if (!LIVE) return
		if (attempted && score != null) return
		attempted = true
		score = withContext(Dispatchers.IO) {
			runCatching {
				val conn = URL("https://production.dataviz.cnn.io/index/fearandgreed/graphdata")
					.openConnection() as HttpURLConnection
				conn.connectTimeout = 5000
				conn.readTimeout = 5000
				conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36")
				conn.setRequestProperty("Accept", "application/json")
				conn.setRequestProperty("Referer", "https://edition.cnn.com/markets/fear-and-greed")
				conn.inputStream.bufferedReader().use { reader ->
					JSONObject(reader.readText())
						.getJSONObject("fear_and_greed")
						.getDouble("score")
						.toFloat()
				}
			}.getOrNull()
		}
	}
}
