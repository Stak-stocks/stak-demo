package com.stak.demo.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Carries the phone-only state that used to be lost on a new device or a reinstall -
 * the practice portfolio ledger, the notification inbox's read ids, and saved news -
 * to and from the server (device report, 2026-09-19: "what if I use it on another
 * phone, the portfolio resets?"). Each of those stays local-first and instant; this
 * just keeps a copy on the account so a second phone isn't starting from nothing.
 */
object DeviceStateSync {
	private var repository: StockRepository? = null
	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

	fun init(repo: StockRepository) {
		repository = repo
	}

	/**
	 * Called once per real sign-in, after MyStakHoldings/PaperPortfolio/StakNotifications/
	 * NewsSaves have already loaded whatever this phone has locally for the account. A
	 * brand-new phone has none of their StakStore keys yet - if the server holds this
	 * account's copy, that's exactly what's missing here, so pull it down and reload the
	 * singletons that were missing it. A phone that already has local data leaves it alone
	 * (it's what's showing) and just pushes it, so the server catches up instead of a
	 * second, older copy winning.
	 */
	fun sync() {
		val repo = repository ?: return
		if (Session.demoAccount || Session.token == null) return
		scope.launch {
			val remote = runCatching { repo.getAndroidState() }.getOrNull() ?: return@launch
			var pulledPortfolio = false
			if (StakStore.getString("portfolio") == null && remote.portfolio != null) {
				StakStore.putString("portfolio", remote.portfolio.toString())
				pulledPortfolio = true
			}
			if (StakStore.getSet("notif.read") == null && remote.notifRead.isNotEmpty()) {
				StakStore.putSet("notif.read", remote.notifRead.toSet())
			}
			if (StakStore.getSet("news.saved") == null && remote.newsSaved.isNotEmpty()) {
				StakStore.putSet("news.saved", remote.newsSaved.toSet())
			}
			withContext(Dispatchers.Main) {
				if (pulledPortfolio) com.stak.demo.ui.simulate.PaperPortfolio.reset(demo = false)
				StakNotifications.load()
				com.stak.demo.ui.news.NewsSaves.load()
			}
			push()
		}
	}

	/** Fire-and-forget: whatever this phone holds right now becomes the server's copy too. */
	fun push() {
		val repo = repository ?: return
		if (Session.demoAccount || Session.token == null) return
		scope.launch {
			runCatching {
				repo.putAndroidState(
					AndroidStatePutRequest(
						portfolio = StakStore.getString("portfolio")?.let { json ->
							runCatching { com.google.gson.JsonParser.parseString(json).asJsonObject }.getOrNull()
						},
						notifRead = StakStore.getSet("notif.read")?.toList(),
						newsSaved = StakStore.getSet("news.saved")?.toList(),
					),
				)
			}
		}
	}
}
