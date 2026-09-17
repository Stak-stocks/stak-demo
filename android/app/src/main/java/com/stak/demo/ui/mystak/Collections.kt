package com.stak.demo.ui.mystak

import com.stak.demo.R
import com.stak.demo.data.MyStakHoldings

/**
 * The My STAK collection catalogue - what every chip on the Overview
 * (1:3155) carries and what the Collection page (1:3333) serves. AI &
 * Tech is the authored frame verbatim; the other five are the shared
 * demo data both platforms use (Codex parity audit, 2026-09-04), so a
 * tapped chip opens ITS collection instead of the sample one.
 * Mirrors the iOS catalogue beside ios/StakDemo/MyStak/CollectionView.swift.
 */
internal data class CollStock(
	val badge: String, val change: String, val up: Boolean,
	val ticker: String, val company: String, val price: String,
)

/** One collection - glass art (imageRes) OR the chip's category icon (iconRes). */
internal data class StakCollection(
	val id: String,
	val name: String,
	// The authored 1:3155 chip text, kept for the record only - nothing
	// renders it since the holdings store drives every count (Codex audit
	// 2026-09-04); see held() / heldCountLabel().
	val countLabel: String,
	val blurb: String,
	val imageRes: Int? = null,
	val iconRes: Int? = null,
	/**
	 * The collection page's 60 hero (1:3357 authors AI & Tech's glass art at
	 * 60). Every collection draws its own art at that size - the four
	 * category icons are the 4x exports of their 1:3155 cat-icon frames
	 * (user, 2026-09-05: the AI & Tech hero is the look; the 36 chip icon
	 * centred in the frame was not).
	 */
	val heroRes: Int,
	val stocks: List<CollStock>,
)

/** Overview grid order (1:3155): two per row, top-left to bottom-right. */
internal val COLLECTIONS = listOf(
	StakCollection(
		id = "aitech",
		name = "AI & Tech",
		countLabel = "5 stocks",
		blurb = "Your highest-conviction growth and AI names.",
		imageRes = R.drawable.ms_coll_aitech,
		heroRes = R.drawable.ms_coll_aitech,
		stocks = listOf(
			CollStock("N", "▲ 2.4%", true, "NVDA", "NVIDIA", "$122.10"),
			CollStock("A", "▲ 1.2%", true, "AAPL", "Apple", "$229.35"),
			CollStock("M", "▼ 0.4%", false, "MSFT", "Microsoft", "$438.20"),
			CollStock("G", "▲ 0.8%", true, "GOOGL", "Alphabet", "$178.90"),
			CollStock("A", "▲ 2.1%", true, "AMD", "Adv Micro", "$164.30"),
		),
	),
	StakCollection(
		id = "finance",
		name = "Finance",
		countLabel = "3 stocks",
		blurb = "The banks and payment rails that move money.",
		imageRes = R.drawable.ms_coll_finance,
		heroRes = R.drawable.ms_coll_finance,
		stocks = listOf(
			CollStock("J", "▲ 0.6%", true, "JPM", "JPMorgan", "$245.60"),
			CollStock("V", "▲ 0.3%", true, "V", "Visa", "$352.10"),
			CollStock("G", "▼ 0.5%", false, "GS", "Goldman Sachs", "$612.40"),
		),
	),
	StakCollection(
		id = "green",
		name = "Green Energy",
		countLabel = "3 stocks",
		blurb = "Solar, the grid and the utilities going clean.",
		iconRes = R.drawable.ic_cat_green,
		heroRes = R.drawable.ms_coll_green,
		stocks = listOf(
			CollStock("E", "▲ 1.9%", true, "ENPH", "Enphase", "$78.40"),
			CollStock("N", "▲ 0.4%", true, "NEE", "NextEra", "$84.20"),
			CollStock("F", "▼ 1.1%", false, "FSLR", "First Solar", "$228.90"),
		),
	),
	StakCollection(
		id = "realestate",
		name = "Real Estate",
		countLabel = "2 stocks",
		blurb = "Your small hedge: warehouses and rent checks.",
		iconRes = R.drawable.ic_cat_realestate,
		heroRes = R.drawable.ms_coll_realestate,
		stocks = listOf(
			CollStock("P", "▲ 0.2%", true, "PLD", "Prologis", "$118.30"),
			CollStock("O", "▼ 0.3%", false, "O", "Realty Income", "$59.10"),
		),
	),
	StakCollection(
		id = "health",
		name = "Healthcare",
		countLabel = "4 stocks",
		blurb = "Drugmakers and insurers with steady demand.",
		iconRes = R.drawable.ic_cat_health,
		heroRes = R.drawable.ms_coll_health,
		stocks = listOf(
			CollStock("L", "▲ 1.4%", true, "LLY", "Eli Lilly", "$792.50"),
			CollStock("U", "▼ 0.8%", false, "UNH", "UnitedHealth", "$318.70"),
			CollStock("J", "▲ 0.5%", true, "JNJ", "Johnson & Johnson", "$162.40"),
			CollStock("P", "▼ 0.2%", false, "PFE", "Pfizer", "$25.30"),
		),
	),
	StakCollection(
		id = "consumer",
		name = "Consumer",
		countLabel = "2 stocks",
		blurb = "Brands people keep buying, in any market.",
		iconRes = R.drawable.ic_cat_consumer,
		heroRes = R.drawable.ms_coll_consumer,
		stocks = listOf(
			CollStock("C", "▲ 0.7%", true, "COST", "Costco", "$947.20"),
			CollStock("N", "▼ 1.3%", false, "NKE", "Nike", "$72.80"),
		),
	),
)

/** The served collection - an unknown id falls back to the authored AI & Tech frame. */
internal fun collection(id: String): StakCollection =
	COLLECTIONS.firstOrNull { it.id == id } ?: COLLECTIONS.first()

/**
 * The collection's stocks the user actually holds. Codex audit
 * (2026-09-04): MyStakHoldings is the single source of truth - Unsave on
 * a tile's Stock Detail drops the stock here, from the chip count and
 * from the Breakdown at once. Reads the observable set, so a composable
 * calling it recomposes when the store changes.
 * Mirrors ios/StakDemo/MyStak/Collections.swift.
 */
internal fun StakCollection.held(): List<CollStock> = stocks.filter { it.ticker in MyStakHoldings.tickers }

/**
 * "1 company" / "N companies" - the chip, the Collection hero and the counts share it.
 * Companies, not stocks: My STAK talks about the companies someone decided to care
 * about, and switching words mid-page asks a beginner to know they're the same thing.
 */
internal fun heldCountLabel(n: Int): String = if (n == 1) "1 company" else "$n companies"
