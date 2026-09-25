package com.stak.demo.ui.onboarding

import androidx.compose.ui.graphics.Color

/**
 * The onboarding answers, turned into the taste reveal, the risk style
 * and the Profile chips (product audit, 2026-09-05: the reveal used to be
 * fixed copy and the quiz answers went nowhere). Deterministic and tiny:
 * each taste is the share of the user's brand picks that belong to it,
 * nudged by the goal and the risk answer. Mirrors ios TasteModel.swift.
 */
internal object TasteModel {
	private val TECH = setOf("Apple", "Tesla", "Spotify", "Netflix", "Amazon", "Microsoft", "NVIDIA", "PlayStation", "Coinbase", "Uber")
	private val GROWTH = setOf("Tesla", "NVIDIA", "Coinbase", "Uber", "Amazon", "Spotify", "Netflix")
	private val CONSUMER = setOf("Nike", "Disney", "Netflix", "Spotify", "Amazon", "PlayStation", "Uber", "Apple", "Tesla")
	private val INCOME = setOf("Apple", "Microsoft", "Nike", "Disney")

	// 04 Goal options, in card order.
	const val GOAL_LEARN = 0
	const val GOAL_GROW = 1
	const val GOAL_FIRST_STOCKS = 2
	const val GOAL_EXPLORE = 3

	// 05 Risk options, in card order.
	const val RISK_BUY_MORE = 0
	const val RISK_HOLD = 1
	const val RISK_STEP_AWAY = 2
	const val RISK_SELL_SOME = 3

	/** One reveal bar: label, strength word, its colour, fill fraction of the track. */
	data class TasteBar(val label: String, val strength: String, val strengthColor: Color, val fraction: Float)

	fun riskStyle(risk: Int): String = when (risk) {
		RISK_BUY_MORE -> "Growth-Oriented"
		RISK_HOLD -> "Balanced"
		RISK_STEP_AWAY -> "Conservative"
		RISK_SELL_SOME -> "Cautious"
		else -> "Growth-Oriented"
	}

	/** tech / growth / consumer / income, each 0..1. */
	fun scores(picks: Set<String>, goal: Int, risk: Int): List<Float> {
		fun share(group: Set<String>): Float = if (picks.isEmpty()) 0f else picks.count { it in group }.toFloat() / picks.size
		val tech = share(TECH) + (if (goal == GOAL_FIRST_STOCKS) 0.1f else 0f)
		val growth = share(GROWTH) + (if (goal == GOAL_GROW) 0.25f else 0f) + (if (risk == RISK_BUY_MORE) 0.2f else 0f) - (if (risk == RISK_SELL_SOME) 0.2f else 0f)
		val consumer = share(CONSUMER)
		val income = share(INCOME) + (if (risk == RISK_SELL_SOME) 0.3f else 0f) + (if (risk == RISK_STEP_AWAY) 0.15f else 0f) + (if (goal == GOAL_LEARN) 0.1f else 0f)
		return listOf(tech, growth, consumer, income).map { it.coerceIn(0f, 1f) }
	}

	fun bars(picks: Set<String>, goal: Int, risk: Int): List<TasteBar> {
		val labels = listOf("Tech curious", "Growth seeking", "Consumer brands", "Income & dividends")
		return labels.zip(scores(picks, goal, risk)).map { (label, s) ->
			val strength = strengthOf(s)
			TasteBar(label, strength, colorOf(strength), 0.2f + 0.8f * s)
		}
	}

	/** The Profile's YOUR TASTE chips, strongest first, at most three. */
	fun chips(picks: Set<String>, goal: Int, risk: Int): List<String> {
		val (tech, growth, consumer, income) = scores(picks, goal, risk)
		val out = mutableListOf<Pair<Float, String>>()
		if (tech >= 0.3f) out += tech to "Tech Curious"
		if (growth >= 0.45f) out += growth to "High Growth"
		if (consumer >= 0.3f) out += consumer to "Consumer Brands"
		if (income >= 0.35f) out += income to "Income Focused"
		if (risk == RISK_SELL_SOME || risk == RISK_STEP_AWAY) out += 0.5f to "Risk Aware"
		if (goal == GOAL_LEARN) out += 0.4f to "Learning"
		val chips = out.sortedByDescending { it.first }.map { it.second }.distinct().take(3)
		return chips.ifEmpty { listOf("Just Exploring") }
	}

	private fun strengthOf(s: Float): String = when {
		s >= 0.6f -> "Strong"
		s >= 0.3f -> "Medium"
		else -> "Light"
	}

	// The authored strength colours (1:687): teal / muted / faint.
	private fun colorOf(strength: String): Color = when (strength) {
		"Strong" -> Color(0xFF69B3CA)
		"Medium" -> Color(0xFF819ABB)
		else -> Color(0xFF5C6B85)
	}
}
