package com.stak.demo.data

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
		Item("weekly-recap", "Weekly recap", "You're up +1.9% this week and #47 on the board. Nice.", "1d"),
	)

	private fun welcome(): List<Item> = listOf(
		Item("welcome", "Welcome to STAK, ${UserProfile.greetingName}", "Your first deck is waiting in Discover. Swipe down for the next card, save what you like.", "Just now"),
		Item("first-save", "Save a stock to start your STAK", "Saved stocks power My STAK and the Simulate leaderboard.", "Just now"),
	)

	var items by mutableStateOf(listOf<Item>())
		private set
	var readIds by mutableStateOf(setOf<String>())
		private set

	val unreadCount: Int get() = items.count { it.id !in readIds }
	/** The Home bell's dot. */
	val hasUnread: Boolean get() = unreadCount > 0

	/** Restores the inbox for the current account. */
	fun load() {
		items = if (Session.demoAccount) DEMO else welcome()
		readIds = StakStore.getSet("notif.read") ?: emptySet()
	}

	/** Opening the inbox reads everything - like an activity feed. */
	fun markAllRead() {
		readIds = items.map { it.id }.toSet()
		StakStore.putSet("notif.read", readIds)
	}
}
