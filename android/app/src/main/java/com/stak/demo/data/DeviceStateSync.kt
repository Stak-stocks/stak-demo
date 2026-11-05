package com.stak.demo.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Carries the phone-only state that used to be lost on a new device or a reinstall -
 * the notification inbox's read ids and saved news - to and from the server (device
 * report, 2026-09-19: "what if I use it on another phone, the portfolio resets?").
 * Each of those stays local-first and instant; this just keeps a copy on the account
 * so a second phone isn't starting from nothing.
 *
 * The practice portfolio ledger no longer rides along here (2026-09-25 unification):
 * a real account's portfolio now lives entirely server-side in the sandbox tables and
 * hydrates via PaperPortfolio.refresh()/hydrate(), the same backend web's Simulate
 * uses - there's no local copy left to carry between devices. android_device_state's
 * `portfolio` column is left in place, unused, rather than dropped outright.
 */
object DeviceStateSync {
	private var repository: StockRepository? = null
	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

	fun init(repo: StockRepository) {
		repository = repo
	}

	/**
	 * Called once per real sign-in, after MyStakHoldings/StakNotifications/NewsSaves have
	 * already loaded whatever this phone has locally for the account. A brand-new phone has
	 * none of their StakStore keys yet - if the server holds this account's copy, that's
	 * exactly what's missing here, so pull it down and reload the singletons that were
	 * missing it. A phone that already has local data leaves it alone (it's what's showing)
	 * and just pushes it, so the server catches up instead of a second, older copy winning.
	 */
	fun sync() {
		val repo = repository ?: return
		if (Session.demoAccount || Session.token == null) return
		// A read that lands after a sign-out or account switch belongs to the account that left (the store's keys
		// resolve to the current one at write time).
		val account = Session.accountGeneration
		scope.launch {
			val remote = runCatching { repo.getAndroidState() }.getOrNull() ?: return@launch
			if (Session.accountGeneration != account) return@launch
			mergeReads(remote.notifRead)
			if (StakStore.getSet("news.saved") == null && remote.newsSaved.isNotEmpty()) {
				StakStore.putSet("news.saved", remote.newsSaved.toSet())
			}
			withContext(Dispatchers.Main) {
				StakNotifications.reloadReadIds()
				com.stak.demo.ui.news.NewsSaves.load()
			}
			push()
		}
	}

	@Volatile private var readsPulledAt = 0L

	/**
	 * Another device's read marks, pulled in when the inbox refreshes (at most every 30s), so a
	 * notification read on one device isn't unread on the other. Sign-in alone was too rare a pull: a
	 * phone that had its own marks kept them, and its next push overwrote the other's.
	 */
	fun pullReads() {
		val repo = repository ?: return
		if (Session.demoAccount || Session.token == null) return
		val now = System.currentTimeMillis()
		if (now - readsPulledAt < 30_000L) return
		readsPulledAt = now
		val account = Session.accountGeneration
		scope.launch {
			val remote = runCatching { repo.getAndroidState() }.getOrNull() ?: return@launch
			if (Session.accountGeneration != account) return@launch
			mergeReads(remote.notifRead)
			withContext(Dispatchers.Main) { StakNotifications.reloadReadIds() }
		}
	}

	/**
	 * The server's read marks joined with this phone's. Marks only add up (the inbox trims its own to
	 * what it lists), so a union never turns a read notification unread.
	 */
	private fun mergeReads(remote: List<String>) {
		val local = StakStore.getSet("notif.read")
		val merged: Set<String> = (local ?: emptySet<String>()) + remote
		if (merged != (local ?: emptySet<String>()) || (local == null && remote.isNotEmpty())) StakStore.putSet("notif.read", merged)
	}

	/** Fire-and-forget: whatever this phone holds right now becomes the server's copy too. */
	fun push() {
		val repo = repository ?: return
		if (Session.demoAccount || Session.token == null) return
		scope.launch {
			runCatching {
				repo.putAndroidState(
					AndroidStatePutRequest(
						notifRead = StakStore.getSet("notif.read")?.toList(),
						newsSaved = StakStore.getSet("news.saved")?.toList(),
					),
				)
			}
		}
	}
}
