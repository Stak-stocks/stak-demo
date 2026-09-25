package com.stak.demo.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * The stocks in the user's My STAK (user, 2026-08-23): a story earns the
 * "In your STAK" chip only when it relates to a stock the user actually
 * holds - Google news + Google in My STAK -> chip; otherwise none.
 *
 * Codex audit (2026-09-04): this store is the single source of truth for
 * every My STAK number - the chip counts, "Across N stocks", the
 * Breakdown buckets and the Collection page's tiles all derive from it,
 * and Unsave drops a ticker from all of them at once. The frame (1:3155)
 * authored three different totals (chips 5/3/3/2/4/2, "Across 14 stocks",
 * "6 stocks" in the breakdown); one store cannot honour three, so the
 * seed is every ticker the six authored collections list plus the
 * Overview's Best/Worst (TSLA/SNOW) = 21, which keeps the chips reading
 * 5/3/3/2/4/2 at rest. Saves from the Discover deck and the article
 * bookmark add to it. In production the backend serves the holdings.
 * Mirrors ios/StakDemo/MyStakHoldings.swift.
 */
object MyStakHoldings {
	/** The authored demo account's holdings (the frames' 5/3/3/2/4/2 counts). */
	private val SEED = setOf(
		"NVDA", "AAPL", "MSFT", "GOOGL", "AMD", // AI & Tech
		"JPM", "V", "GS", // Finance
		"ENPH", "NEE", "FSLR", // Green Energy
		"PLD", "O", // Real Estate
		"LLY", "UNH", "JNJ", "PFE", // Healthcare
		"COST", "NKE", // Consumer
		"TSLA", "SNOW", // Overview Best/Worst - no collection lists them
	)
	var tickers by mutableStateOf(SEED)
		private set

	/** When each stock was saved on THIS account (epoch day) - the "Since you saved" card reads it (product audit, 2026-09-05). */
	private var savedAt: Map<String, Long> = emptyMap()

	/** Product audit (2026-09-05): a NEW account holds nothing until the user saves; the demo account keeps the seed. */
	fun reset(demo: Boolean) {
		// The persisted set wins over the seed (product audit, 2026-09-05).
		tickers = StakStore.getSet("holdings") ?: if (demo) SEED else emptySet()
		savedAt = StakStore.getString("saved_at")?.split(",")?.mapNotNull { e ->
			val sym = e.substringBefore("=").trim()
			val day = e.substringAfter("=", "").toLongOrNull()
			if (sym.isNotBlank() && day != null) sym to day else null
		}?.toMap() ?: emptyMap()
	}

	private fun persist() {
		StakStore.putSet("holdings", tickers)
		StakStore.putString("saved_at", savedAt.entries.joinToString(",") { "${it.key}=${it.value}" })
	}

	/** Days since the stock was saved on this account; null when the save predates the record (the demo's authored saves). */
	/** A ticker the demo persona's authored history carries (never an "Other" tile). */
	fun isSeed(ticker: String): Boolean = symbolOf(ticker) in SEED

	fun daysSinceSaved(ticker: String): Int? = savedAt[symbolOf(ticker)]?.let { (java.time.LocalDate.now().toEpochDay() - it).toInt() }

	/** How many stocks the user holds - the Overview's "Across N stocks". */
	val count: Int get() = tickers.size

	/** True when any of the story's related tickers is held. */
	fun holdsAny(related: List<String>): Boolean = related.any { it in tickers }

	fun add(ticker: String) {
		val sym = symbolOf(ticker)
		tickers = tickers + sym
		if (sym !in savedAt) savedAt = savedAt + (sym to java.time.LocalDate.now().toEpochDay())
		persist()
	}

	/** Unsave (Stock Detail from My STAK) - the same bare-symbol normalisation as add. */
	fun remove(ticker: String) {
		tickers = tickers - symbolOf(ticker)
		savedAt = savedAt - symbolOf(ticker)
		persist()
	}

	// Deck cards carry "NVDA · NVIDIA Corp" - hold the bare symbol.
	private fun symbolOf(ticker: String): String = ticker.substringBefore(" · ").trim()
}
