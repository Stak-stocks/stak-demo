import Foundation

/// The backend's primary categories, in the words the app shows. One source of truth for both places a category
/// surfaces: the Discover deck's label ("TODAY · CHIPS, E-COMMERCE & MORE") and My STAK's collections, so a save and
/// the card it came from never disagree about what it is. Related ids share a display name on purpose -
/// "semiconductor" and "semiconductor_equipment" both read "Chips" and count as one collection.
/// Mirrors android data/StakCategories.kt.
let categoryNames: [String: String] = [
	"enterprise_software": "Software",
	"semiconductor": "Chips",
	"semiconductor_equipment": "Chips",
	"restaurant": "Restaurants",
	"bank": "Banks",
	"retail": "Retail",
	"insurance": "Insurance",
	"energy_oilgas": "Energy",
	"ecommerce_marketplace": "E-commerce",
	"fintech_payments": "Fintech",
	"consumer_staples": "Staples",
	"industrial": "Industrials",
	"capital_markets": "Markets",
	"asset_manager": "Asset Managers",
	"financial_data": "Financial Data",
	"healthcare_pharma": "Pharma",
	"apparel_beauty": "Fashion",
	"streaming_media": "Streaming",
	"beverage": "Drinks",
	"cybersecurity": "Cybersecurity",
	"space_airmobility": "Space",
	"social_media": "Social Media",
	"travel_rideshare": "Travel",
	"aerospace_defense": "Defense",
	"medical_devices": "MedTech",
	"reit": "Real Estate",
	"casino_entertainment": "Casinos",
	"gaming": "Gaming",
	"crypto_fintech": "Crypto",
	"payment_network": "Payments",
	"utilities": "Utilities",
	"metals_mining": "Mining",
	"auto_ev": "EVs",
	"clean_energy": "Clean Energy",
	"health_insurance": "Health Insurers",
	"biotech": "Biotech",
	"transport_logistics": "Logistics",
	"airline": "Airlines",
	"consumer_tech": "Consumer Tech",
	"database_data": "Data",
	"automation_ai": "AI",
	"private_equity": "Private Equity",
	"auto_legacy": "Autos",
	"telecom": "Telecom",
	"mega_cap_tech": "Big Tech",
	"etf_index": "Index Funds",
	"home_retail": "Home Retail",
	"default_tech": "General Tech",
	"tech": "General Tech",
	"adtech": "Ad Tech",
	"meme_stock": "Meme Stocks",
	"default_consumer": "Consumer",
	"default_finance": "Finance",
	"digital_health": "Digital Health",
	"food_beverage_growth": "Food",
]

/// "semiconductor" -> "Chips"; an id we don't name yet reads as its own words.
func categoryName(_ id: String) -> String {
	categoryNames[id] ?? id.split(separator: "_").map { $0.prefix(1).uppercased() + $0.dropFirst() }.joined(separator: " ")
}

/// A collection's route id - the display name, so "Chips" is one collection however it was tagged.
func categoryGroupId(_ name: String) -> String { String(name.lowercased().filter { $0.isLetter || $0.isNumber }) }

/// A category's own mark (Taste Graph rows, a real account's collection chips and hero), from the icons the app
/// already ships. The collection art groups whole families under one picture (every tech category drew the same
/// sparkle), which left four rows looking identical; these tell them apart.
func categoryIcon(_ name: String) -> String {
	switch name {
	case "Streaming": return "IcCatStreaming"
	case "Social Media": return "IcCatSocial"
	case "Gaming", "Casinos": return "IcTabDiscover"
	case "E-commerce", "Retail", "Home Retail", "Staples", "Fashion", "Food", "Drinks", "Restaurants", "Consumer": return "IcCatConsumer"
	case "Chips", "Data", "AI": return "IcCatChips"
	case "Cybersecurity": return "IcRiskShield"
	case "Big Tech": return "IcGistSparkle"
	case "Software": return "IcCatCode"
	case "General Tech": return "IcCatGear"
	case "Consumer Tech", "Ad Tech": return "IcGoalGrow"
	case "Fintech": return "IcCatFintech"
	case "Banks", "Payments", "Markets", "Asset Managers", "Financial Data", "Insurance",
		 "Crypto", "Private Equity", "Index Funds", "Finance": return "IcSimClock"
	case "Clean Energy", "Utilities", "Energy", "Mining": return "IcCatGreen"
	case "EVs", "Autos": return "IcCatEv"
	case "Travel": return "IcCatTravel"
	case "Logistics", "Airlines": return "IcGoalExplore"
	case "Real Estate": return "IcCatRealEstate"
	case "Pharma", "MedTech", "Biotech", "Health Insurers", "Digital Health": return "IcCatHealth"
	case "Space", "Defense": return "IcGoalExplore"
	case "Industrials": return "IcRiskPause"
	case "Telecom": return "IcCatTelecom"
	case "Meme Stocks": return "IcCatMeme"
	default: return "IcGistInfo"
	}
}
