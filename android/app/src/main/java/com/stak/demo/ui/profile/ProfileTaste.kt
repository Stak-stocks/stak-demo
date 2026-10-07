package com.stak.demo.ui.profile

import com.stak.demo.ui.Session
import com.stak.demo.ui.UserProfile
import com.stak.demo.ui.onboarding.TasteModel

/**
 * What the Profile hub and the Taste & risk page say about the account (08 · Profile, 2026-10-07).
 * The demo persona reads the authored copy (1:5665 / 1:5732); a created account reads its own
 * onboarding answers through TasteModel. Mirrors ios Profile/ProfileTaste.swift.
 */
internal object ProfileTaste {
	/** The hub's YOUR STAK line: the strongest taste chip in sentence case · the risk style's lead word ("Tech curious · Growth"). */
	fun summary(): String = sentence(chips().first()) + " · " + riskLabel().substringBefore('-').substringBefore(' ')

	/** The YOUR TASTE chips - the persona's authored three, else the account's strongest tastes. */
	fun chips(): List<String> =
		if (Session.demoAccount) listOf("Tech Curious", "High Growth", "Consumer Brands")
		else TasteModel.chips(UserProfile.brandPicks, UserProfile.goal, UserProfile.risk)

	/** The RISK STYLE row: the stored style in the page's authored casing ("Growth-oriented", not 07's "Growth-Oriented"). */
	fun riskLabel(): String {
		val s = UserProfile.riskStyle
		return if (s.contains('-')) s.substringBefore('-') + "-" + s.substringAfter('-').lowercase() else s
	}

	/** The caption under the risk card - the authored line for Growth-oriented, one per other style. */
	fun riskBlurb(): String = when (riskLabel()) {
		"Balanced" -> "You hold through the dips and watch closely. Your deck mixes steady names with a few growth picks."
		"Conservative" -> "You step back when things drop. Your deck leans toward steady names and skips the wildest swings."
		"Cautious" -> "You protect what you have first. Your deck favours steady, dividend-paying names."
		else -> "You accept bigger swings for bigger upside. Your deck leans toward growth names and skips the steadiest ones."
	}

	/** The GOAL row - the persona's authored "Long-term growth"; a created account's 04 answer. */
	fun goalLabel(): String = when (UserProfile.goal) {
		TasteModel.GOAL_LEARN -> "Learn the basics"
		TasteModel.GOAL_FIRST_STOCKS -> "First stocks"
		TasteModel.GOAL_EXPLORE -> "Just exploring"
		else -> "Long-term growth"
	}

	/** The caption under the goal card - the authored line for Long-term growth, one per other goal. */
	fun goalBlurb(): String = when (UserProfile.goal) {
		TasteModel.GOAL_LEARN -> "You’re here to understand how investing works. The brief explains the why behind every move."
		TasteModel.GOAL_FIRST_STOCKS -> "You want names worth watching. Your deck leads with companies you already know."
		TasteModel.GOAL_EXPLORE -> "You’re looking around with no plan yet. Your deck stays broad until you pick a direction."
		else -> "You’re building a position over years, not weeks. The brief and your deck are tuned for that."
	}

	private fun sentence(s: String): String = s.lowercase().replaceFirstChar { it.titlecase() }
}
