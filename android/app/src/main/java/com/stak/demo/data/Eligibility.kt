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
 * "Before we get started": three boxes - 18 or older, living in the United States, and the Terms / Privacy (Terms
 * §2); no date of birth. While an account hasn't confirmed them, [required] is true and the gate covers the whole app -
 * a new account right after it signs up, an existing one the next time it opens. The server keeps that each was
 * confirmed, when, and which versions of the documents. Mirrors shared/src/eligibility.ts, web
 * components/onboarding/EligibilityGate.tsx and iOS Core/Eligibility.swift.
 */
object Eligibility {
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
		/** [invalid]: the server didn't get all three boxes; otherwise a network or server failure. */
		data class Failed(val invalid: Boolean) : Outcome
	}

	/** Sends the three confirmations. */
	suspend fun confirm(): Outcome {
		val repo = repository ?: return Outcome.Failed(invalid = false)
		return try {
			repo.confirmEligibility()
			required = false
			Outcome.Confirmed
		} catch (e: retrofit2.HttpException) {
			Outcome.Failed(invalid = e.code() == 400)
		} catch (e: Exception) {
			Outcome.Failed(invalid = false)
		}
	}

	/** Signed out: nothing to ask until the next account says so. */
	fun reset() {
		required = false
		checkedFor = null
	}

}
