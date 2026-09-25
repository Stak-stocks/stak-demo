package com.stak.demo.ui

import java.time.LocalTime

/**
 * Time-of-day greeting in the USER'S OWN timezone (user, 2026-08-22:
 * "someone can be in Nigeria, another in Germany, another in China").
 * The device clock already runs in the user's zone, so the local hour
 * is the whole story: 05-11 morning, 12-16 afternoon, otherwise evening.
 * The authored frame shows the morning state.
 */
object Greeting {
	fun word(hour: Int): String = when (hour) {
		in 5..11 -> "Good Morning"
		in 12..16 -> "Good Afternoon"
		else -> "Good Evening"
	}

	/** The greeting for right now, in the device's local time. */
	fun now(): String = word(LocalTime.now().hour)
}
