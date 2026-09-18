package com.stak.demo.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * The notification inbox behind the Home bell (product audit, 2026-09-05:
 * the bell only cleared its dot and opened nothing). The demo account
 * carries its authored activity. Read state persists per account (StakStore).
 * Mirrors ios StakNotifications.swift.
 *
 * A real account's inbox is built from its own data (device check, 2026-09-16).
 * It used to be a fixed pair - "Welcome to STAK" and "Save a stock to start your
 * STAK", both stamped "Just now" forever, the second still shown with four stocks
 * saved. Now: a big move on a saved stock (over 3%, the threshold the settings page
 * promises, only while "Price moves on your picks" is on), today's deck while cards
 * are left ("Daily deck"), the save prompt only while nothing is saved, and the
 * welcome for the account's first week, dated from when the account was created.
 */
object StakNotifications {
	data class Item(val id: String, val title: String, val body: String, val time: String)

	private val DEMO = listOf(
		Item("nvda-up", "NVDA is up 4.2% today", "Chip demand keeps outrunning supply. Your biggest pick is leading the deck.", "2h"),
		Item("deck-ready", "Your deck is ready", "Twelve fresh cards, tuned to your taste. Swipe when you have a minute.", "8h"),
		Item("weekly-recap", "Weekly recap", "You're up +1.9% this week and #47 on the board. Nice.", "1d"),
	)

	/** How long the welcome stays in the inbox. */
	private const val WELCOME_DAYS = 7L

	/** Live data is re-read at most this often when Home or the inbox asks. */
	private const val REFRESH_MS = 5 * 60 * 1000L

	private var repository: StockRepository? = null
	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
	private var refreshedAt = 0L

	fun init(repo: StockRepository) {
		repository = repo
	}

	var items by mutableStateOf(listOf<Item>())
		private set
	var readIds by mutableStateOf(setOf<String>())
		private set

	val unreadCount: Int get() = items.count { it.id !in readIds }
	/** The Home bell's dot. */
	val hasUnread: Boolean get() = unreadCount > 0

	/** Restores the inbox for the current account, then refreshes it from live data. */
	fun load() {
		readIds = StakStore.getSet("notif.read") ?: emptySet()
		refreshedAt = 0L
		if (Session.demoAccount) {
			items = DEMO
			return
		}
		items = accountItems(moves = emptyList(), cardsLeft = null)
		refresh()
	}

	/** Re-reads saved stocks' moves and today's deck, at most every few minutes. */
	fun refresh(force: Boolean = false) {
		if (Session.demoAccount || Session.token == null) return
		val repo = repository ?: return
		val now = System.currentTimeMillis()
		if (!force && now - refreshedAt < REFRESH_MS) return
		refreshedAt = now
		scope.launch {
			val held = MyStakHoldings.tickers.toList()
			val moves = if (UserProfile.priceAlerts && held.isNotEmpty()) {
				// A failed price request keeps the inbox as it was, rather than reading as
				// "nothing moved" and dropping the moves already listed.
				val quotes = runCatching {
					held.chunked(50).flatMap { chunk -> repo.batchQuotes(chunk).quotes.entries.toList() }
				}.getOrNull() ?: return@launch
				quotes.mapNotNull { (ticker, q) ->
					q?.takeIf { it.price > 0 && kotlin.math.abs(it.changePercent) >= UserProfile.priceThreshold }?.let { ticker to it.changePercent }
				}
			} else emptyList()
			// The account's exact creation time, once: the profile's month-level "joined"
			// can't tell a week-old account from a month-old one, and falls back to the
			// current month when unknown - which welcomed a long-standing account.
			if (StakStore.getString("notif.createdAt") == null) {
				runCatching { repo.getMe() }.getOrNull()?.createdAt
					?.let { runCatching { java.time.Instant.parse(it).toEpochMilli() }.getOrNull() }
					?.let { StakStore.putString("notif.createdAt", it.toString()) }
			}
			val cardsLeft = if (UserProfile.dailyDeck) {
				// The server keeps the last swipe day's count; one from an earlier deck day
				// means none of today's cards are used yet (the rule Discover applies).
				runCatching { repo.getDailySwipes() }.getOrNull()?.let {
					val used = if (it.date == com.stak.demo.ui.discover.todayKey()) it.count else 0
					(it.limit - used).coerceAtLeast(0)
				}
			} else null
			if (Session.demoAccount) return@launch
			items = accountItems(moves, cardsLeft)
		}
	}

	private fun accountItems(moves: List<Pair<String, Double>>, cardsLeft: Int?): List<Item> {
		val out = mutableListOf<Item>()
		// Moves, largest first. The id carries the market day and direction, so a new
		// day's move is a new, unread notification.
		val day = StakClock.marketDay()
		val session = StakClock.lastCloseRef()
		moves.sortedByDescending { kotlin.math.abs(it.second) }.forEach { (ticker, pct) ->
			val up = pct >= 0
			val name = MyStakHoldings.nameOf(ticker)?.takeIf { it != ticker }
			out += Item(
				id = "move:$day:$ticker:${if (up) "up" else "down"}",
				title = "$ticker is ${if (up) "up" else "down"} ${String.format(java.util.Locale.US, "%.1f", kotlin.math.abs(pct))}% $session",
				body = (name?.let { "$it, one of your saved stocks, " } ?: "One of your saved stocks ") +
					"moved more than ${UserProfile.priceThreshold}%.",
				time = if (session == "today") "Today" else session.removePrefix("at ").replaceFirstChar { it.uppercase() },
			)
		}
		if (cardsLeft != null && cardsLeft > 0) {
			out += Item(
				id = "deck:${com.stak.demo.ui.discover.todayKey()}",
				title = "Your deck is ready",
				body = "$cardsLeft ${if (cardsLeft == 1) "card" else "cards"} left today, tuned to your taste.",
				time = "Today",
			)
		}
		if (MyStakHoldings.count == 0) {
			out += Item("first-save", "Save a stock to start your STAK", "Saved stocks power My STAK and the Simulate leaderboard.", "Today")
		}
		welcomeItem()?.let { out += it }
		return out
	}

	private fun welcomeItem(): Item? {
		val createdAt = StakStore.getString("notif.createdAt")?.toLongOrNull() ?: return null
		if (System.currentTimeMillis() - createdAt > WELCOME_DAYS * 24 * 60 * 60 * 1000) return null
		val name = UserProfile.displayName.takeIf { it.isNotBlank() }?.capitalizeWords()
		val title = if (name != null) "Welcome to STAK, $name" else "Welcome to STAK"
		return Item("welcome", title, "Your first deck is waiting in Discover. Swipe down for the next card, save what you like.", ago(createdAt))
	}

	/** "Just now", "5m ago", "3h ago", "2d ago". */
	private fun ago(atMs: Long): String {
		val age = StakClock.newsAge(atMs / 1000)
		return if (age == "0m") "Just now" else "$age ago"
	}

	/** Opening the inbox reads everything - like an activity feed. */
	fun markAllRead() {
		readIds = items.map { it.id }.toSet()
		StakStore.putSet("notif.read", readIds)
	}
}
