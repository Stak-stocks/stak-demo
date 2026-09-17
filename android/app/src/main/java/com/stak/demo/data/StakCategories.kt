package com.stak.demo.data

import com.stak.demo.R

/**
 * The backend's primary categories, in the words the app shows. One source of
 * truth for both places a category surfaces: the Discover deck's label
 * ("TODAY · CHIPS, E-COMMERCE & MORE") and My STAK's collections, so a save
 * and the card it came from never disagree about what it is.
 *
 * Related ids share a display name on purpose - "semiconductor" and
 * "semiconductor_equipment" both read "Chips" and count as one collection.
 */
internal val CATEGORY_NAMES = mapOf(
	"enterprise_software" to "Software",
	"semiconductor" to "Chips",
	"semiconductor_equipment" to "Chips",
	"restaurant" to "Restaurants",
	"bank" to "Banks",
	"retail" to "Retail",
	"insurance" to "Insurance",
	"energy_oilgas" to "Energy",
	"ecommerce_marketplace" to "E-commerce",
	"fintech_payments" to "Fintech",
	"consumer_staples" to "Staples",
	"industrial" to "Industrials",
	"capital_markets" to "Markets",
	"asset_manager" to "Asset Managers",
	"financial_data" to "Financial Data",
	"healthcare_pharma" to "Pharma",
	"apparel_beauty" to "Fashion",
	"streaming_media" to "Streaming",
	"beverage" to "Drinks",
	"cybersecurity" to "Cybersecurity",
	"space_airmobility" to "Space",
	"social_media" to "Social Media",
	"travel_rideshare" to "Travel",
	"aerospace_defense" to "Defense",
	"medical_devices" to "MedTech",
	"reit" to "Real Estate",
	"casino_entertainment" to "Casinos",
	"gaming" to "Gaming",
	"crypto_fintech" to "Crypto",
	"payment_network" to "Payments",
	"utilities" to "Utilities",
	"metals_mining" to "Mining",
	"auto_ev" to "EVs",
	"clean_energy" to "Clean Energy",
	"health_insurance" to "Health Insurers",
	"biotech" to "Biotech",
	"transport_logistics" to "Logistics",
	"airline" to "Airlines",
	"consumer_tech" to "Consumer Tech",
	"database_data" to "Data",
	"automation_ai" to "AI",
	"private_equity" to "Private Equity",
	"auto_legacy" to "Autos",
	"telecom" to "Telecom",
	"mega_cap_tech" to "Big Tech",
	"etf_index" to "Index Funds",
	"home_retail" to "Home Retail",
	"default_tech" to "Tech",
	"tech" to "Tech",
	"adtech" to "Ad Tech",
	"meme_stock" to "Meme Stocks",
	"default_consumer" to "Consumer",
	"default_finance" to "Finance",
	"digital_health" to "Digital Health",
	"food_beverage_growth" to "Food",
)

/** "semiconductor" -> "Chips"; an id we don't name yet reads as its own words. */
internal fun categoryName(id: String): String =
	CATEGORY_NAMES[id] ?: id.split('_').joinToString(" ") { it.replaceFirstChar(Char::titlecase) }

/** A collection's route id - the display name, so "Chips" is one collection however it was tagged. */
internal fun categoryGroupId(name: String): String =
	name.lowercase().filter { it.isLetterOrDigit() }

/**
 * A collection's art. The six authored glass pieces (1:3155) cover the
 * families they were drawn for; a category outside them draws its initial
 * instead of borrowing art that says the wrong thing.
 *
 * [imageRes] is the chip's 34 crop, [iconRes] its 36 icon (the authored
 * frames use one or the other), [heroRes] the Collection page's 60 hero.
 */
internal data class CategoryArt(val imageRes: Int? = null, val iconRes: Int? = null, val heroRes: Int)

private val TECH = CategoryArt(imageRes = R.drawable.ms_coll_aitech, heroRes = R.drawable.ms_coll_aitech)
private val FINANCE = CategoryArt(imageRes = R.drawable.ms_coll_finance, heroRes = R.drawable.ms_coll_finance)
private val GREEN = CategoryArt(iconRes = R.drawable.ic_cat_green, heroRes = R.drawable.ms_coll_green)
private val REALESTATE = CategoryArt(iconRes = R.drawable.ic_cat_realestate, heroRes = R.drawable.ms_coll_realestate)
private val HEALTH = CategoryArt(iconRes = R.drawable.ic_cat_health, heroRes = R.drawable.ms_coll_health)
private val CONSUMER = CategoryArt(iconRes = R.drawable.ic_cat_consumer, heroRes = R.drawable.ms_coll_consumer)

private val ART_BY_NAME: Map<String, CategoryArt> = mapOf(
	"Software" to TECH, "Chips" to TECH, "Cybersecurity" to TECH, "Data" to TECH,
	"AI" to TECH, "Big Tech" to TECH, "Consumer Tech" to TECH, "Tech" to TECH,
	"Ad Tech" to TECH, "Social Media" to TECH, "Gaming" to TECH,
	"Banks" to FINANCE, "Fintech" to FINANCE, "Markets" to FINANCE, "Asset Managers" to FINANCE,
	"Financial Data" to FINANCE, "Payments" to FINANCE, "Insurance" to FINANCE, "Crypto" to FINANCE,
	"Private Equity" to FINANCE, "Index Funds" to FINANCE, "Finance" to FINANCE,
	"Clean Energy" to GREEN, "Utilities" to GREEN, "EVs" to GREEN,
	"Real Estate" to REALESTATE,
	"Pharma" to HEALTH, "MedTech" to HEALTH, "Biotech" to HEALTH,
	"Health Insurers" to HEALTH, "Digital Health" to HEALTH,
	"Retail" to CONSUMER, "Restaurants" to CONSUMER, "Staples" to CONSUMER, "Fashion" to CONSUMER,
	"Drinks" to CONSUMER, "E-commerce" to CONSUMER, "Streaming" to CONSUMER, "Travel" to CONSUMER,
	"Casinos" to CONSUMER, "Home Retail" to CONSUMER, "Food" to CONSUMER, "Consumer" to CONSUMER,
)

/**
 * A category's own mark for the Taste Graph, from the icons the app already ships. The
 * collection art groups whole families under one picture (every tech category drew the
 * same sparkle), which left four rows looking identical; these tell them apart.
 */
internal fun categoryIcon(name: String): Int = when (name) {
	"Streaming" -> R.drawable.ic_cat_streaming
	"Social Media" -> R.drawable.ic_cat_social
	"Gaming", "Casinos" -> R.drawable.ic_tab_discover
	"E-commerce", "Retail", "Home Retail", "Staples", "Fashion", "Food", "Drinks", "Restaurants", "Consumer" -> R.drawable.ic_cat_consumer
	"Chips", "Data", "AI" -> R.drawable.ic_cat_chips
	"Cybersecurity" -> R.drawable.ic_risk_shield
	"Big Tech", "Software", "Tech" -> R.drawable.ic_gist_sparkle
	"Consumer Tech", "Ad Tech" -> R.drawable.ic_goal_grow
	"Banks", "Fintech", "Payments", "Markets", "Asset Managers", "Financial Data", "Insurance",
	"Crypto", "Private Equity", "Index Funds", "Finance" -> R.drawable.ic_sim_clock
	"Clean Energy", "Utilities", "Energy", "Mining" -> R.drawable.ic_cat_green
	"EVs", "Autos" -> R.drawable.ic_cat_ev
	"Logistics", "Airlines", "Travel" -> R.drawable.ic_goal_explore
	"Real Estate" -> R.drawable.ic_cat_realestate
	"Pharma", "MedTech", "Biotech", "Health Insurers", "Digital Health" -> R.drawable.ic_cat_health
	"Space", "Defense" -> R.drawable.ic_goal_explore
	"Industrials" -> R.drawable.ic_risk_pause
	else -> R.drawable.ic_gist_info
}

/** The collection's art, or null when no authored piece fits - the chip draws its initial. */
internal fun categoryArt(name: String): CategoryArt? = ART_BY_NAME[name]

/** The allocation palette, by art family, so the ring and the chips agree. */
internal fun categoryColorKey(name: String): String = when (ART_BY_NAME[name]) {
	TECH -> "aitech"
	FINANCE -> "finance"
	GREEN -> "green"
	REALESTATE -> "realestate"
	HEALTH -> "health"
	CONSUMER -> "consumer"
	else -> "other"
}
