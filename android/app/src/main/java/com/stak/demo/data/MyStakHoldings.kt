package com.stak.demo.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

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
	private var repository: StockRepository? = null
	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

	fun init(repo: StockRepository) {
		repository = repo
	}

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

	/**
	 * What the server knows about each save: the company's name, the category
	 * the deck ranked it on, and the price when it was saved. My STAK reads
	 * this instead of the authored catalogue, so a stock outside the six
	 * demo collections still shows up with its real name and group.
	 */
	data class SavedStock(
		val ticker: String,
		val brandId: String,
		val name: String,
		val category: String?,
		val savedDay: Long?,
		/** The exact moment of the save. The day alone can only find a close. */
		val savedAtSec: Long?,
		val priceAtSave: Double?,
	)

	var details by mutableStateOf<Map<String, SavedStock>>(emptyMap())
		private set

	/** Product audit (2026-09-05): a NEW account holds nothing until the user saves; the demo account keeps the seed. */
	fun reset(demo: Boolean) {
		// Local prefs restore first — instant, no network wait.
		tickers = StakStore.getSet("holdings") ?: if (demo) SEED else emptySet()
		savedAt = StakStore.getString("saved_at")?.split(",")?.mapNotNull { e ->
			val sym = e.substringBefore("=").trim()
			val day = e.substringAfter("=", "").toLongOrNull()
			if (sym.isNotBlank() && day != null) sym to day else null
		}?.toMap() ?: emptyMap()
		details = readDetails()
		// Overlay with backend state when authenticated — silently no-ops on failure.
		if (Session.token != null) {
			scope.launch { refreshFromBackend() }
		}
	}

	/** Re-reads the saved list and what the server knows about each save. Silent on failure. */
	suspend fun refreshFromBackend() {
		if (Session.token == null) return
		val resp = runCatching { repository?.getAndroidStocks() }.getOrNull() ?: return
		tickers = resp.tickers.toSet().ifEmpty { tickers }
		if (resp.saved.isNotEmpty()) {
			details = resp.saved.filter { it.ticker.isNotBlank() }.associate { s ->
				s.ticker to SavedStock(
					ticker = s.ticker,
					brandId = s.brandId,
					name = s.name.ifBlank { s.ticker },
					category = s.category,
					savedDay = s.savedAt?.let(::epochDayOf),
					savedAtSec = s.savedAt?.let(::epochSecOf),
					priceAtSave = s.priceAtSave,
				)
			}
		}
		persist()
	}

	/** The server's timestamp as epoch seconds - the moment, not just the day. */
	private fun epochSecOf(iso: String): Long? = runCatching {
		java.time.Instant.parse(iso).epochSecond
	}.recoverCatching {
		java.time.OffsetDateTime.parse(iso).toInstant().epochSecond
	}.getOrNull()

	/** The server's timestamp as a local epoch day; null when it isn't a date we can read. */
	private fun epochDayOf(iso: String): Long? = runCatching {
		java.time.Instant.parse(iso).atZone(java.time.ZoneId.systemDefault()).toLocalDate().toEpochDay()
	}.recoverCatching {
		java.time.OffsetDateTime.parse(iso).toLocalDate().toEpochDay()
	}.getOrNull()

	private fun persist() {
		StakStore.putSet("holdings", tickers)
		StakStore.putString("saved_at", savedAt.entries.joinToString(",") { "${it.key}=${it.value}" })
		val array = org.json.JSONArray()
		details.values.forEach { d ->
			array.put(
				org.json.JSONObject().apply {
					put("t", d.ticker)
					put("b", d.brandId)
					put("n", d.name)
					d.category?.let { put("c", it) }
					d.savedDay?.let { put("d", it) }
					d.savedAtSec?.let { put("s", it) }
					d.priceAtSave?.let { put("p", it) }
				},
			)
		}
		StakStore.putString("saved_details", array.toString())
	}

	private fun readDetails(): Map<String, SavedStock> {
		val raw = StakStore.getString("saved_details") ?: return emptyMap()
		return runCatching {
			val array = org.json.JSONArray(raw)
			(0 until array.length()).mapNotNull { i ->
				val o = array.getJSONObject(i)
				val ticker = o.optString("t").takeIf { it.isNotBlank() } ?: return@mapNotNull null
				ticker to SavedStock(
					ticker = ticker,
					brandId = o.optString("b", ""),
					name = o.optString("n", ticker),
					category = if (o.has("c")) o.getString("c") else null,
					savedDay = if (o.has("d")) o.getLong("d") else null,
					savedAtSec = if (o.has("s")) o.getLong("s") else null,
					priceAtSave = if (o.has("p")) o.getDouble("p") else null,
				)
			}.toMap()
		}.getOrDefault(emptyMap())
	}

	/**
	 * Days since the stock was saved on this account; null when the save predates
	 * the record (the demo's authored saves). The server's date wins - it survives
	 * a reinstall and a second device, which the local note does not.
	 */
	fun daysSinceSaved(ticker: String): Int? {
		val sym = symbolOf(ticker)
		val day = details[sym]?.savedDay ?: savedAt[sym] ?: return null
		return (java.time.LocalDate.now().toEpochDay() - day).toInt()
	}

	/** The company's name as the catalogue has it ("NVIDIA"), or null for a save we haven't synced. */
	fun nameOf(ticker: String): String? = details[symbolOf(ticker)]?.name

	/** The brand this save points at ("tsla") - the key the brand endpoints take. */
	fun brandIdOf(ticker: String): String? = details[symbolOf(ticker)]?.brandId?.takeIf { it.isNotBlank() }

	/** The category the deck ranked this save on ("semiconductor"), or null when unsynced. */
	fun categoryOf(ticker: String): String? = details[symbolOf(ticker)]?.category

	/** What the stock cost when it was saved - the "since you saved" move measures from here. */
	fun priceAtSave(ticker: String): Double? = details[symbolOf(ticker)]?.priceAtSave

	/**
	 * The day the save was made, as an epoch day. A save from before prices were
	 * stamped has no price of its own, but its date is enough to look up what the
	 * stock actually closed at that day.
	 */
	/** The exact moment of the save, in epoch seconds, when the server has told us. */
	fun savedInstant(ticker: String): Long? = details[symbolOf(ticker)]?.savedAtSec

	fun savedEpochDay(ticker: String): Long? {
		val sym = symbolOf(ticker)
		return details[sym]?.savedDay ?: savedAt[sym]
	}

	/** How many stocks the user holds - the Overview's "Across N stocks". */
	val count: Int get() = tickers.size

	/**
	 * How many stocks a Stak holds. Mirrors STAK_CAPACITY in
	 * shared/src/stakCapacity.ts, which the backend enforces on write.
	 */
	const val CAPACITY = 30

	/** True when the Stak cannot take another stock. */
	val isFull: Boolean get() = tickers.size >= CAPACITY

	/** True when any of the story's related tickers is held. */
	fun holdsAny(related: List<String>): Boolean = related.any { it in tickers }

	/**
	 * Saves the stock. [brandId] and [priceNow] are what the Discover deck knows at
	 * the moment of the swipe; passing them stamps what the stock cost when it was
	 * saved, which is the only honest moment to record it.
	 */
	fun add(ticker: String, brandId: String? = null, priceNow: Double? = null): Boolean {
		val sym = symbolOf(ticker)
		if (sym in tickers) return true
		// The server rejects a save past CAPACITY, and syncToBackend swallows the
		// failure, so an unrefused save would leave the card looking saved while the
		// server kept a different list. Refuse it here instead.
		if (tickers.size >= CAPACITY) return false
		tickers = tickers + sym
		if (sym !in savedAt) savedAt = savedAt + (sym to java.time.LocalDate.now().toEpochDay())
		persist()
		syncToBackend(brandId, priceNow)
		return true
	}

	/** Unsave (Stock Detail from My STAK) - the same bare-symbol normalisation as add. */
	fun remove(ticker: String) {
		tickers = tickers - symbolOf(ticker)
		savedAt = savedAt - symbolOf(ticker)
		persist()
		syncToBackend()
	}

	private fun syncToBackend(brandId: String? = null, priceNow: Double? = null) {
		if (Session.token == null) return
		val snapshot = tickers.toList()
		scope.launch {
			runCatching { repository?.putAndroidStocks(snapshot) }
			// The row has to exist before its price can be stamped, so this follows
			// the PUT rather than racing it - the server only keeps the first value.
			if (!brandId.isNullOrBlank() && priceNow != null && priceNow > 0) {
				runCatching { repository?.patchStakPrice(brandId, priceNow) }
			}
		}
	}

	// Deck cards carry "NVDA · NVIDIA Corp" - hold the bare symbol.
	private fun symbolOf(ticker: String): String = ticker.substringBefore(" · ").trim()
}
