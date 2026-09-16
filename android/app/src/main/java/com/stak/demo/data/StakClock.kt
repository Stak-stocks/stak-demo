package com.stak.demo.data

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * The dates the demo shows, on the real calendar (product audit, 2026-09-05:
 * the app was frozen on "Saturday, July 4" while the greeting used the live
 * clock). Story and save dates are relative ages, so they stay fresh.
 * Mirrors ios StakClock.swift.
 */
object StakClock {
	private val monthDay = DateTimeFormatter.ofPattern("MMM d", Locale.US)

	/** "Saturday, July 4" for today. */
	fun todayLong(): String = LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, MMMM d", Locale.US))

	/** "Jul 2" for N days ago. */
	fun monthDay(daysAgo: Int): String = LocalDate.now().minusDays(daysAgo.toLong()).format(monthDay)

	/** "· Jul 2 · 3 min read" from a story's age ("2d", "5h") and its read time. */
	fun byline(age: String, read: String): String {
		val days = if (age.endsWith("d")) age.dropLast(1).toIntOrNull() ?: 0 else 0
		return "· ${monthDay(days)} · $read"
	}

	/** "Oct 29" for N days ahead - the stock pages' next-earnings line (product audit, 2026-09-05: "Q2 earnings land Aug 27" had passed). */
	fun daysAhead(days: Int): String = monthDay(-days)

	/** "Saved Jul 2" / "Saved today". */
	fun savedLabel(daysAgo: Int): String = if (daysAgo == 0) "Saved today" else "Saved ${monthDay(daysAgo)}"

	/**
	 * "13h" - a story's age in the largest unit that still reads small. Shared by
	 * the news list and the stock pages so one story can't be two ages at once.
	 */
	fun newsAge(datetime: Long): String {
		val ageSeconds = System.currentTimeMillis() / 1000 - datetime
		return when {
			ageSeconds < 3600 -> "${ageSeconds / 60}m"
			ageSeconds < 86400 -> "${ageSeconds / 3600}h"
			else -> "${ageSeconds / 86400}d"
		}
	}

	/** "September 2026" for the month a new account was created. */
	fun monthYear(): String = LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.US))
}
