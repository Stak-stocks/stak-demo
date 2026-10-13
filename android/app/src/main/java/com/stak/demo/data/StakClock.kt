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
	 * The US Eastern date of the session a quote's daily move belongs to: today from the
	 * 9:30 open on a weekday, else the last weekday before (holidays not known). Friday's
	 * move keeps one date through the weekend.
	 */
	fun sessionDay(now: java.time.ZonedDateTime = java.time.ZonedDateTime.now(java.time.ZoneId.of("America/New_York"))): String {
		val weekend = now.dayOfWeek == java.time.DayOfWeek.SATURDAY || now.dayOfWeek == java.time.DayOfWeek.SUNDAY
		if (!weekend && now.hour * 60 + now.minute >= 570) return now.toLocalDate().toString()
		var day = now.toLocalDate().minusDays(1)
		while (day.dayOfWeek == java.time.DayOfWeek.SATURDAY || day.dayOfWeek == java.time.DayOfWeek.SUNDAY) day = day.minusDays(1)
		return day.toString()
	}

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

	/**
	 * The daily brief's sessions, as the server divides the US Eastern day (backend routes/dailyBrief.ts
	 * getMarketStatus): before the 9:30 open, the open until noon, midday until 3:30, the last half hour, and after the
	 * 4:00 close - one a day at weekends. Approved scope (2026-10-06): the app re-reads the brief once per session,
	 * never on a timer - each read can mean a Gemini call for the account. Mirrors ios StakClock.
	 */
	enum class BriefPhase { PRE, OPEN, MIDDAY, LATE, AFTER, WEEKEND }

	fun briefPhase(now: java.time.ZonedDateTime = java.time.ZonedDateTime.now(java.time.ZoneId.of("America/New_York"))): BriefPhase {
		if (now.dayOfWeek == java.time.DayOfWeek.SATURDAY || now.dayOfWeek == java.time.DayOfWeek.SUNDAY) return BriefPhase.WEEKEND
		val minutes = now.hour * 60 + now.minute
		return when {
			minutes < 9 * 60 + 30 -> BriefPhase.PRE
			minutes < 12 * 60 -> BriefPhase.OPEN
			minutes < 15 * 60 + 30 -> BriefPhase.MIDDAY
			minutes < 16 * 60 -> BriefPhase.LATE
			else -> BriefPhase.AFTER
		}
	}

	/** "2026-10-06-open": the brief the app should be showing now. It re-reads the brief when this changes. */
	fun briefSessionKey(now: java.time.ZonedDateTime = java.time.ZonedDateTime.now(java.time.ZoneId.of("America/New_York"))): String =
		"${now.toLocalDate()}-${briefPhase(now).name.lowercase()}"

	/**
	 * Whether a served brief was written for [phase]. Just after a boundary the server can still hand back the
	 * previous session's cached brief (its cache lasts 15 minutes, its market status 10) - that one isn't taken as the
	 * new session's. A closed day (a holiday) is closed whatever the hour.
	 */
	fun briefFits(phase: BriefPhase, session: String, marketClosed: Boolean, dayLabel: String): Boolean {
		val closedDay = marketClosed && dayLabel != "Today's"
		return when (phase) {
			BriefPhase.WEEKEND -> true
			BriefPhase.PRE -> closedDay
			BriefPhase.OPEN -> (session == "open" && !marketClosed) || closedDay
			BriefPhase.MIDDAY -> (session == "midday" && !marketClosed) || closedDay
			BriefPhase.LATE -> (session == "close" && !marketClosed) || closedDay
			BriefPhase.AFTER -> marketClosed
		}
	}

	/** Whether the US market's regular session is on right now (holidays not known). */
	fun isMarketOpen(): Boolean = lastCloseRef() == "today"

	/**
	 * A "▲ 1.2% today" move named for the session it describes. From the day's open on,
	 * "today" stands (after 4pm it is still today's move). Before the open and over the
	 * weekend it names that session's weekday - "▲ 1.2% on Wednesday" - which, unlike
	 * "yesterday", reads right in any time zone. Applied when shown, so a card loaded in
	 * the afternoon doesn't still say "today" the next morning.
	 */
	fun sessionChange(change: String, now: java.time.ZonedDateTime = java.time.ZonedDateTime.now(java.time.ZoneId.of("America/New_York"))): String {
		if (!change.endsWith(" today")) return change
		val minutes = now.hour * 60 + now.minute
		val weekend = now.dayOfWeek == java.time.DayOfWeek.SATURDAY || now.dayOfWeek == java.time.DayOfWeek.SUNDAY
		if (!weekend && minutes >= 570) return change
		var day = now.toLocalDate().minusDays(1)
		while (day.dayOfWeek == java.time.DayOfWeek.SATURDAY || day.dayOfWeek == java.time.DayOfWeek.SUNDAY) day = day.minusDays(1)
		val name = day.dayOfWeek.getDisplayName(java.time.format.TextStyle.FULL, Locale.US)
		return change.removeSuffix("today") + "on $name"
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
		// A story stamped a moment ahead of this phone's clock reads as new, never "-2m".
		val ageSeconds = (System.currentTimeMillis() / 1000 - datetime).coerceAtLeast(0)
		return when {
			ageSeconds < 3600 -> "${ageSeconds / 60}m"
			ageSeconds < 86400 -> "${ageSeconds / 3600}h"
			else -> "${ageSeconds / 86400}d"
		}
	}

	/** "Just now", "5m ago", "3h ago", "2d ago" - a feed's age line, from epoch seconds. */
	fun ago(epochSeconds: Long): String {
		val age = newsAge(epochSeconds)
		return if (age == "0m" || age.startsWith("-")) "Just now" else "$age ago"
	}

	/** "September 2026" - the month an account was created. */
	fun monthYear(date: LocalDate = LocalDate.now()): String = date.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.US))
}
