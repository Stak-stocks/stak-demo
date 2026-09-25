package com.stak.demo.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Free vs STAK+, decided in one place. A screen asks whether a feature is available,
 * never which plan the account is on, so packaging can change here without touching a
 * UI flow. Mirrors backend/src/lib/entitlements.ts; the server's plan (GET /api/me)
 * is the truth, and this copy only follows it.
 */
object Entitlements {
	enum class Plan { FREE, PLUS }

	/** Features beyond the free core. Anything not listed is free. */
	enum class Feature { UPDATES_HISTORY, TASTE_EVOLUTION }

	private val PLUS_ONLY = setOf(Feature.UPDATES_HISTORY, Feature.TASTE_EVOLUTION)
	private const val KEY = "entitlements.plan"

	var plan by mutableStateOf(Plan.FREE)
		private set

	fun has(feature: Feature): Boolean = plan == Plan.PLUS || feature !in PLUS_ONLY

	/** The plan the server reported; remembered so a cold start offline keeps it. */
	fun apply(raw: String?) {
		plan = if (raw == "plus") Plan.PLUS else Plan.FREE
		StakStore.putString(KEY, plan.name)
	}

	/** This account's last known plan, at account load. */
	fun load() {
		plan = if (StakStore.getString(KEY) == Plan.PLUS.name) Plan.PLUS else Plan.FREE
	}
}
