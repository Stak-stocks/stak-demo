package com.stak.demo.data

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Keeps a real account's profile the same on every phone: the month it joined comes
 * from the server's creation time, and the onboarding answers (taste chips, risk style)
 * are stored with the account instead of only on this phone.
 */
object ProfileSync {
	private var repository: StockRepository? = null
	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
	private var syncedAt = 0L
	private const val SYNC_MS = 5 * 60 * 1000L

	fun init(repo: StockRepository) {
		repository = repo
	}

	/**
	 * Reads the account from the server. Its saved taste replaces this phone's; when the
	 * server has none but this phone does (answered before taste was synced), this phone's
	 * is uploaded. Called after sign-in (Session.applyAccount) and when Profile opens - not
	 * at process start, which a push can trigger without the app being opened, and GET
	 * /api/me records a visit. The demo account has nothing to sync.
	 */
	fun sync(force: Boolean = false) {
		if (Session.demoAccount || Session.token == null) return
		val repo = repository ?: return
		val now = System.currentTimeMillis()
		if (!force && now - syncedAt < SYNC_MS) return
		syncedAt = now
		// A response for an account that has since signed out must not land on the next one.
		val account = Session.accountGeneration
		scope.launch {
			val me = runCatching { repo.getMe() }.getOrNull()
			if (me == null) {
				syncedAt = 0L
				return@launch
			}
			val upload = withContext(Dispatchers.Main) {
				if (Session.demoAccount || Session.accountGeneration != account) return@withContext null
				joinedMonth(me.createdAt)?.let { UserProfile.joined = it }
				UserProfile.email = me.email
				Entitlements.apply(me.plan)
				runCatching { Instant.parse(me.createdAt).toEpochMilli() }.getOrNull()
					?.let { StakStore.putString("notif.createdAt", it.toString()) }
				if (UserProfile.displayName.isBlank() && me.displayName.isNotBlank()) UserProfile.displayName = me.displayName
				val taste = me.taste?.takeIf { it.hasAnswers }
				if (taste != null) {
					UserProfile.goal = taste.goal
					UserProfile.risk = taste.risk
					UserProfile.brandPicks = taste.picks.toSet()
					if (taste.riskStyle.isNotBlank()) UserProfile.riskStyle = taste.riskStyle
				}
				Session.saveProfile()
				currentTaste().takeIf { taste == null && it.hasAnswers }
			}
			if (upload != null && Session.accountGeneration == account) runCatching { repo.putMe(taste = upload) }
		}
	}

	/** The onboarding answers as the server stores them. */
	fun currentTaste(): TasteDto = TasteDto(
		goal = UserProfile.goal,
		risk = UserProfile.risk,
		riskStyle = UserProfile.riskStyle,
		picks = UserProfile.brandPicks.toList(),
	)

	/** "September 2026" from the server's creation timestamp, in this phone's time zone. */
	fun joinedMonth(createdAt: String): String? {
		if (createdAt.isBlank()) return null
		val date = runCatching { Instant.parse(createdAt).atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull()
			?: runCatching { LocalDate.parse(createdAt.take(10)) }.getOrNull()
			?: return null
		return StakClock.monthYear(date)
	}
}
