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
	data class Item(val id: String, val title: String, val body: String, val time: String)

	private val DEMO = listOf(
		Item("nvda-up", "NVDA is up 4.2% today", "Chip demand keeps outrunning supply. Your biggest pick is leading the deck.", "2h"),
		Item("deck-ready", "Your deck is ready", "Twelve fresh cards, tuned to your taste. Swipe when you have a minute.", "8h"),
		Item("weekly-recap", "Weekly recap", "You’re up +1.9% this week and #47 on the board. Nice.", "1d"),
	)

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
		readIds = StakStore.getSet("notif.read") ?: emptySet()
	}

	/** Opening the inbox reads everything - like an activity feed. */
	fun markAllRead() {
		readIds = items.map { it.id }.toSet()
		StakStore.putSet("notif.read", readIds)
	}
}
