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
	// Not just "Tech" - reads as a third, unrelated category next to "Big Tech" on the
	// same grid (device report, 2026-09-25), when it's really the catch-all the other,
	// more specific tech categories (Chips, AI, Big Tech, Software...) fall out of.
	"default_tech" to "General Tech",
	"tech" to "General Tech",
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
	"Big Tech" -> R.drawable.ic_gist_sparkle
	"Software" -> R.drawable.ic_cat_code
	"General Tech" -> R.drawable.ic_cat_gear
	"Consumer Tech", "Ad Tech" -> R.drawable.ic_goal_grow
	"Fintech" -> R.drawable.ic_cat_fintech
	"Banks", "Payments", "Markets", "Asset Managers", "Financial Data", "Insurance",
	"Crypto", "Private Equity", "Index Funds", "Finance" -> R.drawable.ic_sim_clock
	"Clean Energy", "Utilities", "Energy", "Mining" -> R.drawable.ic_cat_green
	"EVs", "Autos" -> R.drawable.ic_cat_ev
	"Travel" -> R.drawable.ic_cat_travel
	"Logistics", "Airlines" -> R.drawable.ic_goal_explore
	"Real Estate" -> R.drawable.ic_cat_realestate
	"Pharma", "MedTech", "Biotech", "Health Insurers", "Digital Health" -> R.drawable.ic_cat_health
	"Space", "Defense" -> R.drawable.ic_goal_explore
	"Industrials" -> R.drawable.ic_risk_pause
	"Telecom" -> R.drawable.ic_cat_telecom
	"Meme Stocks" -> R.drawable.ic_cat_meme
	else -> R.drawable.ic_gist_info
}
