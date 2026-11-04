package com.stak.demo.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
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
/** Home's goal check-in this session: not answered yet, being sent, answered either way, or the send failed. */
enum class GoalCheckInStatus { Open, Sending, Kept, Switched, Failed }

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
				Eligibility.apply(me)
				StakNotifications.rememberCreatedAt(me.createdAt)
				// The account's name wins when it has one - a rename on another phone reaches this one; a blank never
				// wipes the name here.
				// ...unless this phone's edit hasn't reached the server yet: then it is the newer one, and goes up below.
				val serverName = me.displayName.trim()
				if (!StakStore.getBoolean("name.pending", false) && serverName.isNotEmpty() && serverName != UserProfile.displayName) UserProfile.displayName = serverName
				// Answers changed on this phone (Taste & risk) that haven't reached the server are the newer ones.
				// (A phone signed out and back in has none left to send: the server's answers win, and the flag goes.)
				val tastePending = StakStore.getBoolean(TASTE_PENDING, false) && currentTaste().hasAnswers
				if (!tastePending) StakStore.putBoolean(TASTE_PENDING, false)
				val taste = me.taste?.takeIf { it.hasAnswers && !tastePending }
				if (taste != null) {
					UserProfile.goal = taste.goal
					UserProfile.risk = taste.risk
					UserProfile.brandPicks = taste.picks.toSet()
					if (taste.riskStyle.isNotBlank()) UserProfile.riskStyle = taste.riskStyle
				}
				Session.saveProfile()
				currentTaste().takeIf { taste == null && it.hasAnswers }
			}
			if (upload != null && Session.accountGeneration == account) {
				runCatching { repo.putMe(taste = upload) }.onSuccess {
					withContext(Dispatchers.Main) { if (Session.accountGeneration == account && currentTaste() == upload) StakStore.putBoolean(TASTE_PENDING, false) }
				}
			}
			// A rename that didn't reach the server (offline, a save cut short) goes up now.
			val pendingName = withContext(Dispatchers.Main) {
				UserProfile.displayName.trim().takeIf { Session.accountGeneration == account && StakStore.getBoolean("name.pending", false) && it.isNotEmpty() }
			}
			if (pendingName != null) {
				runCatching { repo.putMe(displayName = pendingName) }.onSuccess {
					withContext(Dispatchers.Main) { if (Session.accountGeneration == account) StakStore.putBoolean("name.pending", false) }
				}
			}
		}
	}

	/** Where Home's goal check-in stands this session (see answerGoalCheckIn); back to Open on sign-out. */
	var goalCheckIn by mutableStateOf(GoalCheckInStatus.Open)

	private const val TASTE_PENDING = "taste.pending"
	private var tasteSend: kotlinx.coroutines.Job? = null

	/**
	 * The onboarding answers changed after onboarding (Profile -> Taste & risk): sent now, and pending until the
	 * server has them, so a sync in between doesn't put the old ones back (the next sync sends them if this fails).
	 */
	fun pushTaste() {
		if (Session.demoAccount || Session.token == null) return
		val repo = repository ?: return
		StakStore.putBoolean(TASTE_PENDING, true)
		val account = Session.accountGeneration
		val taste = currentTaste()
		// One at a time, newest last: an older send can't land after a newer one, and only a send of what the phone
		// still holds clears the flag.
		val previous = tasteSend
		tasteSend = scope.launch {
			previous?.join()
			runCatching { repo.putMe(taste = taste) }.onSuccess {
				withContext(Dispatchers.Main) { if (Session.accountGeneration == account && currentTaste() == taste) StakStore.putBoolean(TASTE_PENDING, false) }
			}
		}
	}

	/**
	 * Home's goal check-in answered. The server keeps the answer and, for "switch", moves the goal in the same
	 * statement; once it has, this phone takes the new goal too (the server already holds it, so there's nothing to
	 * send). The card says how it went - [goalCheckIn] - until the brief stops asking; a failure lets them try again.
	 */
	fun answerGoalCheckIn(switchToGrow: Boolean) {
		if (goalCheckIn == GoalCheckInStatus.Sending || Session.demoAccount || Session.token == null) return
		val repo = repository ?: return
		goalCheckIn = GoalCheckInStatus.Sending
		val account = Session.accountGeneration
		scope.launch {
			val ok = runCatching { repo.answerGoalCheckIn(if (switchToGrow) "switch" else "keep") }.isSuccess
			withContext(Dispatchers.Main) {
				if (Session.accountGeneration != account) return@withContext
				if (ok && switchToGrow) {
					UserProfile.goal = com.stak.demo.ui.onboarding.TasteModel.GOAL_GROW
					Session.saveProfile()
				}
				goalCheckIn = when {
					!ok -> GoalCheckInStatus.Failed
					switchToGrow -> GoalCheckInStatus.Switched
					else -> GoalCheckInStatus.Kept
				}
			}
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
