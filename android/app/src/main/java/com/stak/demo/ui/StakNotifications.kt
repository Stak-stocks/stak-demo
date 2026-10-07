package com.stak.demo.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * The notification inbox behind the Home bell (product audit, 2026-09-05:
 * the bell only cleared its dot and opened nothing). The demo account
 * carries its authored activity; a new account gets its welcome. Read
 * state persists per account (StakStore). Mirrors ios StakNotifications.swift.
 */
object StakNotifications {
	/** `today` groups the row under TODAY (else EARLIER) on the Notifications page (1:5927). */
	/** Where a tapped row goes (user, 2026-10-07: a row "should take the user where the information is coming from"). */
	sealed class Target {
		data class Stock(val symbol: String) : Target()
		data class Pick(val symbol: String) : Target()
		object Discover : Target()
		object News : Target()
		object Simulate : Target()
	}
	data class Item(val id: String, val title: String, val body: String, val time: String, val today: Boolean = true, val target: Target = Target.Discover)

	// The persona's inbox as authored (Chinedu_Mobile 1:5927, 2026-10-07).
	private val DEMO = listOf(
		Item("nvda-up", "NVDA is up 4.2% today", "One of your picks is moving. Tap to see why.", "2h", target = Target.Stock("NVDA")),
		Item("brief-ready", "Your daily brief is ready", "Three stories matter for your STAK this morning.", "8h", target = Target.News),
		Item("order-filled", "Practice order filled", "0.2048 NVDA at $122.10 · paper", "9h", target = Target.Pick("NVDA")),
		Item("weekly-recap", "Weekly recap", "Your paper portfolio gained +1.9% last week.", "1d", today = false, target = Target.Simulate),
		Item("deck-complete", "Deck complete", "You finished Friday’s deck. 12 of 12.", "3d", today = false),
	)
	/** 1:5927 authors the two newest rows unread and the rest read - the persona's inbox before its first open. */
	private val DEMO_READ = setOf("order-filled", "weekly-recap", "deck-complete")

	/**
	 * A first-time user's inbox, and how it ages: the welcome is stamped with the
	 * account's creation day and "Save a stock" leaves once the first save exists,
	 * so an active new account on a later day is not greeted as brand new
	 * (audit 2026-09-07).
	 */
	private fun welcome(): List<Item> {
		val age = createdAgo()
		val welcome = Item(
			"welcome", "Welcome to STAK, ${UserProfile.greetingName}",
			if (com.stak.demo.ui.discover.DeckSession.seen > 0) "Your deck is in Discover. Swipe down for the next card, save what you like."
			else "Your first deck is waiting in Discover. Swipe down for the next card, save what you like.",
			age,
		)
		if (MyStakHoldings.count > 0) return listOf(welcome)
		return listOf(welcome, Item("first-save", "Save a stock to start your STAK", "Saved stocks power My STAK and the Simulate leaderboard.", age))
	}

	/** "Just now" on the creation day, then "1d", "6d", "2w" like the persona's authored rows. */
	private fun createdAgo(): String {
		val created = StakStore.getString("created_day")?.toLongOrNull() ?: return "Just now"
		val days = (java.time.LocalDate.now().toEpochDay() - created).toInt()
		return when {
			days <= 0 -> "Just now"
			days < 7 -> "${days}d"
			else -> "${days / 7}w"
		}
	}

	/** Derived from the account's live state, so a first save updates the inbox at once. */
	val items: List<Item> get() = if (Session.demoAccount) DEMO else welcome()
	var readIds by mutableStateOf(setOf<String>())
		private set

	val unreadCount: Int get() = items.count { it.id !in readIds }
	/** The Home bell's dot. */
	val hasUnread: Boolean get() = unreadCount > 0

	/** Restores the inbox for the current account. */
	fun load() {
		readIds = StakStore.getSet("notif.read") ?: (if (Session.demoAccount) DEMO_READ else emptySet())
	}

	/** Opening the inbox reads everything - like an activity feed. */
	fun markAllRead() {
		readIds = items.map { it.id }.toSet()
		StakStore.putSet("notif.read", readIds)
	}
}
