package com.stak.demo.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * "Before we get started": the beta's 18+ / U.S. confirmation and the Terms / Privacy acceptance (Terms §2). While an
 * account hasn't confirmed, [required] is true and the gate covers the whole app - a new account right after it signs
 * up, an existing one the next time it opens. The age is worked out by the server, which keeps only that it was
 * confirmed; under 18 it deletes the account, and this phone can't try another date for 30 days. Mirrors
 * shared/src/eligibility.ts, web components/onboarding/EligibilityGate.tsx and iOS Onboarding/EligibilityView.swift.
 */
object Eligibility {
	const val TERMS_URL = "https://thestak.org/terms"
	const val PRIVACY_URL = "https://thestak.org/privacy"
	private const val BLOCK_MS = 30L * 24 * 60 * 60 * 1000
	private const val BLOCKED_KEY = "eligibility.blockedUntil"

	private var repository: StockRepository? = null
	/** This phone's own settings - not the account's (StakStore's keys are per account, and a refused one is gone). */
	private var device: SharedPreferences? = null
	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

	/** The signed-in account hasn't confirmed: the gate is up. */
	var required by mutableStateOf(false)
		private set

	fun init(context: Context, repo: StockRepository) {
		repository = repo
		device = context.applicationContext.getSharedPreferences("stak_device", Context.MODE_PRIVATE)
	}

	/** This phone was refused (under 18) in the last 30 days: the gate shows only the answer, no form. */
	val blockedHere: Boolean
		get() = (device?.getLong(BLOCKED_KEY, 0L) ?: 0L) > System.currentTimeMillis()

	/** From an account read (ProfileSync): the server says whether this account still has to confirm. */
	fun apply(me: MeResponse) {
		if (!Session.demoAccount) required = me.needsEligibility
	}

	/** Asks the server now - right after a sign-in or sign-up, before onboarding starts. */
	fun check() {
		if (Session.demoAccount || Session.token == null) return
		val repo = repository ?: return
		val account = Session.accountGeneration
		scope.launch {
			val me = runCatching { repo.getMe() }.getOrNull() ?: return@launch
			withContext(Dispatchers.Main) { if (Session.accountGeneration == account) apply(me) }
		}
	}

	sealed interface Outcome {
		data object Confirmed : Outcome
		/** Not eligible: the server has deleted the account. */
		data object Refused : Outcome
		/** [invalid]: the server didn't accept the date or a box; otherwise a network or server failure. */
		data class Failed(val invalid: Boolean) : Outcome
	}

	/** Sends the confirmation. [dob] is "YYYY-MM-DD". */
	suspend fun confirm(dob: String): Outcome {
		val repo = repository ?: return Outcome.Failed(invalid = false)
		return try {
			repo.confirmEligibility(dob)
			required = false
			Outcome.Confirmed
		} catch (e: retrofit2.HttpException) {
			when (e.code()) {
				403 -> {
					device?.edit()?.putLong(BLOCKED_KEY, System.currentTimeMillis() + BLOCK_MS)?.apply()
					Outcome.Refused
				}
				400 -> Outcome.Failed(invalid = true)
				else -> Outcome.Failed(invalid = false)
			}
		} catch (e: Exception) {
			Outcome.Failed(invalid = false)
		}
	}

	/** Signed out: nothing to ask until the next account says so. */
	fun reset() {
		required = false
	}

	/** "MMDDYYYY" as typed -> "YYYY-MM-DD", or null until it's a whole, real date (the server checks it again). */
	fun isoDob(digits: String): String? {
		if (digits.length != 8) return null
		val (mm, dd, yyyy) = Triple(digits.substring(0, 2), digits.substring(2, 4), digits.substring(4))
		return runCatching { java.time.LocalDate.of(yyyy.toInt(), mm.toInt(), dd.toInt()).toString() }.getOrNull()
	}
}
