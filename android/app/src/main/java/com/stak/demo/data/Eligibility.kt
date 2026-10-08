package com.stak.demo.data

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
 * confirmed; under 18 it deletes the account and blocks the email for 30 days (any date it sends after that is
 * refused too). Mirrors shared/src/eligibility.ts, web components/onboarding/EligibilityGate.tsx and iOS
 * Core/Eligibility.swift.
 */
object Eligibility {
	const val TERMS_URL = "https://thestak.org/terms"
	const val PRIVACY_URL = "https://thestak.org/privacy"

	private var repository: StockRepository? = null
	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
	/** The session last asked about - a rotation or a second launch path doesn't ask again for the same one. */
	private var checkedFor: String? = null

	/** The signed-in account hasn't confirmed: the gate is up. */
	var required by mutableStateOf(false)
		private set

	fun init(repo: StockRepository) {
		repository = repo
	}

	/** From an account read (ProfileSync): the server says whether this account still has to confirm. */
	fun apply(me: MeResponse) {
		if (Session.token != null) required = me.needsEligibility
	}

	/**
	 * Asks the server - right after a sign-in or sign-up (the account isn't "signed in" to the app until onboarding
	 * ends, so this goes by the session, not Session.signedIn) and when the app opens. Once per session; a failed read
	 * is asked again next time.
	 */
	fun check() {
		val token = Session.token ?: return
		if (token == checkedFor) return
		val repo = repository ?: return
		checkedFor = token
		scope.launch {
			val me = runCatching { repo.getMe() }.getOrNull()
			withContext(Dispatchers.Main) {
				if (me == null) { if (checkedFor == token) checkedFor = null; return@withContext }
				// A different session by now (signed out, or another account): this answer isn't its.
				if (Session.token == token) required = me.needsEligibility
			}
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
				403 -> Outcome.Refused
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
		checkedFor = null
	}

	/** "MMDDYYYY" as typed -> "YYYY-MM-DD", or null until it's a whole, real date from 1900 to today (the server checks again). */
	fun isoDob(digits: String): String? {
		if (digits.length != 8) return null
		val (mm, dd, yyyy) = Triple(digits.substring(0, 2), digits.substring(2, 4), digits.substring(4))
		val date = runCatching { java.time.LocalDate.of(yyyy.toInt(), mm.toInt(), dd.toInt()) }.getOrNull() ?: return null
		return date.takeIf { it.year >= 1900 && !it.isAfter(java.time.LocalDate.now()) }?.toString()
	}
}
