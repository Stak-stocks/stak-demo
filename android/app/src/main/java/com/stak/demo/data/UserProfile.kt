package com.stak.demo.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * What the user calls themself — set on Onboarding 09 Profile setup and
 * read wherever the app addresses them. Falls back to the design's demo
 * persona when no name was set (e.g. the sign-in path).
 */
object UserProfile {
	var displayName by mutableStateOf("")
	var photoUri by mutableStateOf<String?>(null)

	/**
	 * The user's risk profile - the "Risk style" the taste graph derives
	 * from the onboarding answers (05 Risk et al). Feeds the
	 * why-this-matters summary; the backend computes/refines it in
	 * production. Authored demo default until then.
	 */
	var riskStyle by mutableStateOf("Growth-Oriented")
	// The onboarding answers (product audit, 2026-09-05): they shape the taste
	// reveal, the risk style and the Profile chips instead of going nowhere.
	var brandPicks by mutableStateOf(setOf<String>())
	/** 04 Goal card index, -1 until answered (TasteModel.GOAL_*). */
	var goal by mutableStateOf(-1)
	/** 05 Risk card index, -1 until answered (TasteModel.RISK_*). */
	var risk by mutableStateOf(-1)
	/** 08 Permissions: the user's answer, and the OS grant when it was asked (product audit, 2026-09-05). */
	var notificationsOn by mutableStateOf(true)
	// The settings pages behind the Profile hub (product audit, 2026-09-05).
	var priceAlerts by mutableStateOf(true)
	var dailyDeck by mutableStateOf(true)
	var marketNews by mutableStateOf(false)
	var appearance by mutableStateOf("dark")
	var linkedGoogle by mutableStateOf(false)
	var linkedApple by mutableStateOf(false)
	/** The month the account was created ("September 2026"); the demo's authored "July 2026". */
	var joined by mutableStateOf("July 2026")

	/** The name as the app addresses the user - always capitalized. */
	val greetingName: String
		get() = when {
			displayName.isNotBlank() -> displayName.capitalizeWords()
			Session.demoAccount -> "Hamza"
			else -> "there"
		}

	/**
	 * BACKEND CONTRACT (user, 2026-08-22): the app sends the device's IANA
	 * timezone ID (e.g. "Africa/Lagos", "Europe/Berlin", "Asia/Shanghai")
	 * with the session/profile so the backend can schedule per-user
	 * LOCAL-time deliveries - the day's breaking deck and mood at the
	 * user's morning, notification timing, daily resets. The device clock
	 * is the source of truth (auto time zone from the network); nothing is
	 * inferred from IP or location. Read live so travel is reflected.
	 */
	val timeZoneId: String
		get() = java.time.ZoneId.systemDefault().id
}

/**
 * "fish" -> "Fish", "mary ann" -> "Mary Ann": the first letter of every
 * word uppercased, the rest left as typed (user, 2026-08-22: names typed
 * in lower case must still read capitalized everywhere).
 */
fun String.capitalizeWords(): String =
	// Consecutive spaces produce empty segments - dropped, so typed spacing never trips this (Copilot review, PR #166).
	split(" ").filter { it.isNotEmpty() }.joinToString(" ") { w -> w.replaceFirstChar { c -> c.titlecase() } }
