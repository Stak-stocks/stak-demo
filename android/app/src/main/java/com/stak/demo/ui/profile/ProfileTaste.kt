package com.stak.demo.ui.profile

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.Session
import com.stak.demo.data.StakStore
import com.stak.demo.data.UserProfile
import com.stak.demo.ui.onboarding.TasteModel

// The taste chips' surface (Profile 171:1004), on Profile and Taste & risk.
internal val TasteChipBg = Color(0xFF1A2333)
internal val TasteChipBorder = Color(0xFF2C9DBC)
internal val TasteChipInk = Color(0xFF7FD4E8)

/**
 * What Profile and its Taste & risk page say about the account's onboarding answers (Chinedu_Mobile 1:5732,
 * 2026-10-07, adapted to the live answers). Mirrors ios ProfileTaste.
 */
object ProfileTaste {
	/**
	 * The taste chips: the demo persona's authored three, else the onboarding picks plus the stocks saved since that
	 * belong to a taste, so the chips follow what the user keeps from the deck.
	 */
	fun chips(): List<String> {
		if (Session.demoAccount) return listOf("Tech Curious", "High Growth", "Consumer Brands")
		val saved = MyStakHoldings.tickers.mapNotNull { MyStakHoldings.nameOf(it) }.filter { TasteModel.isTasteBrand(it) }
		return TasteModel.chips(UserProfile.brandPicks + saved, UserProfile.goal, UserProfile.risk)
	}

	/** The risk style as the quiz named it ("Growth-Oriented"), or null before the risk question was answered. */
	fun riskLabel(): String? = if (UserProfile.risk < 0) null else TasteModel.riskStyle(UserProfile.risk)

	/** One line on what the risk answer said. */
	fun riskBlurb(): String = when (UserProfile.risk) {
		TasteModel.RISK_HOLD -> "You hold through a drop and watch it closely."
		TasteModel.RISK_STEP_AWAY -> "You'd rather step back when a stock drops hard."
		TasteModel.RISK_SELL_SOME -> "You'd rather protect part of your money than ride out a drop."
		TasteModel.RISK_BUY_MORE -> "You're comfortable with dips when the story holds."
		else -> "Answer one question about a falling stock."
	}

	/** The goal as the quiz worded it, or null before the goal question was answered. */
	fun goalLabel(): String? = when (UserProfile.goal) {
		TasteModel.GOAL_LEARN -> "Learn how investing works"
		TasteModel.GOAL_GROW -> "Grow my money long-term"
		TasteModel.GOAL_FIRST_STOCKS -> "Find my first stocks"
		TasteModel.GOAL_EXPLORE -> "Just exploring"
		else -> null
	}
}

/**
 * Taste & risk's way back into the onboarding quiz: which part is being redone, so the quiz screens finish back on
 * the page instead of going on through onboarding (and read as a retake, not a first run). Null outside a retake.
 * Kept on disk, so a retake the system cut short (the app's process ended) still finishes back on the page.
 */
object QuizRetake {
	enum class Mode { ALL, GOAL, RISK }

	private const val KEY = "quiz.retake"
	private var current by mutableStateOf<Mode?>(StakStore.getString(KEY)?.let { runCatching { Mode.valueOf(it) }.getOrNull() })
	val mode: Mode? get() = current

	/** The answers as they were when the retake started - each quiz step writes its own as it continues. */
	private var before: com.stak.demo.data.TasteDto? = null

	fun start(mode: Mode) {
		before = com.stak.demo.data.ProfileSync.currentTaste()
		set(mode)
	}

	/** Done, the answers saved (or a new onboarding starting, which a stale retake must not steer). */
	fun finished() {
		before = null
		set(null)
	}

	/** Taste & risk is showing again with a retake still open: it was left unfinished, so its answers go back. */
	fun abandon() {
		if (current == null) return
		before?.let {
			UserProfile.goal = it.goal
			UserProfile.risk = it.risk
			UserProfile.riskStyle = it.riskStyle
			UserProfile.brandPicks = it.picks.toSet()
			Session.saveProfile()
		}
		finished()
	}

	private fun set(mode: Mode?) {
		current = mode
		if (mode == null) StakStore.remove(KEY) else StakStore.putString(KEY, mode.name)
	}
}
