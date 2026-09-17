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

	private val clockTime = DateTimeFormatter.ofPattern("h:mm a", Locale.US)

	/**
	 * What a price fetched at [fetchedAtMs] stands for. While the market is open it is
	 * that moment's price: "as of 2:31 PM" in the phone's time. Once the session has
	 * closed, a price fetched at 8:39 PM is still the 4:00 PM close, so it says which
	 * close it is - worded like the News signal ("at today's close", "at Friday's close").
	 */
	fun pricesAsOf(fetchedAtMs: Long): String {
		val ref = lastCloseRef()
		return if (ref == "today") {
			"as of " + java.time.Instant.ofEpochMilli(fetchedAtMs).atZone(java.time.ZoneId.systemDefault()).format(clockTime)
		} else {
			ref
		}
	}

	/** Today's date in US Eastern time ("2026-09-16") - the market's own day, for dating saved prices. */
	fun marketDay(): String =
		java.time.ZonedDateTime.now(java.time.ZoneId.of("America/New_York")).toLocalDate().toString()

	/**
	 * Which session a quote's daily move belongs to, in US Eastern time: "today"
	 * while the market is open, "at today's close" after 4pm, "at yesterday's close"
	 * before a weekday open, and "at Friday's close" before Monday's open and over the
	 * weekend. Mirrors the web's getLastCloseRef (frontend/src/lib/utils.ts), so one
	 * move is described the same way on both. Like the web, it doesn't know holidays.
	 */
	fun lastCloseRef(now: java.time.ZonedDateTime = java.time.ZonedDateTime.now(java.time.ZoneId.of("America/New_York"))): String {
		val day = now.dayOfWeek
		if (day == java.time.DayOfWeek.SATURDAY || day == java.time.DayOfWeek.SUNDAY) return "at Friday's close"
		val minutes = now.hour * 60 + now.minute
		return when {
			minutes < 570 -> if (day == java.time.DayOfWeek.MONDAY) "at Friday's close" else "at yesterday's close"
			minutes < 960 -> "today"
			else -> "at today's close"
		}
	}

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

	/** "September 2026" - the month an account was created. */
	fun monthYear(date: LocalDate = LocalDate.now()): String = date.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.US))
}
