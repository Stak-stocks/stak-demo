export interface InterestOption {
	id: string;
	label: string;
	emoji: string;
}

export interface FamiliarityOption {
	id: string;
	label: string;
}

export const INTEREST_OPTIONS: InterestOption[] = [
	{ id: "gaming", label: "Gaming", emoji: "🎮" },
	{ id: "streaming", label: "Streaming", emoji: "📺" },
	{ id: "fashion", label: "Fashion", emoji: "👗" },
	{ id: "tech", label: "Tech", emoji: "💻" },
	{ id: "food_drink", label: "Food & Drink", emoji: "🍔" },
	{ id: "travel", label: "Travel", emoji: "✈️" },
	{ id: "fitness", label: "Fitness", emoji: "💪" },
	{ id: "finance", label: "Finance", emoji: "💳" },
	{ id: "beauty", label: "Beauty", emoji: "💄" },
	{ id: "music", label: "Music", emoji: "🎵" },
	{ id: "shopping", label: "Shopping", emoji: "🛍️" },
	{ id: "energy", label: "Energy", emoji: "⚡" },
];

export const MOTIVATION_OPTIONS = [
	{ id: "learn", label: "I want to learn about stocks", color: "bg-red-500", icon: "👤" },
	{ id: "invest", label: "I want to start investing", color: "bg-green-500", icon: "👤" },
	{ id: "insights", label: "I already invest but want better insights", color: "bg-teal-500", icon: "👤" },
	{ id: "curious", label: "Just curious", color: "bg-slate-600", icon: "💭" },
];

export const FAMILIARITY_OPTIONS: FamiliarityOption[] = [
	{ id: "new", label: "Completely new" },
	{ id: "little", label: "Know a little" },
	{ id: "some", label: "Some experience" },
	{ id: "experienced", label: "Experienced investor" },
];

// Maps interest selections to brand IDs from brands.ts
export const INTEREST_TO_BRANDS: Record<string, string[]> = {
	gaming: ["rblx", "msft", "nflx", "aapl", "meta", "amd"],
	streaming: ["nflx", "dis", "spot", "googl", "meta"],
	fashion: ["nke", "ulta", "elf", "coty", "or", "tgt"],
	tech: ["aapl", "msft", "googl", "tsla", "nvda", "meta", "amd"],
	food_drink: ["sbux", "ko", "pep", "cost", "mcd", "wmt"],
	travel: ["uber", "lyft", "amzn", "abnb"],
	fitness: ["nke", "aapl", "ulta"],
	finance: ["v", "ma", "sq", "hood", "sofi", "pypl", "afrm"],
	beauty: ["ulta", "elf", "coty", "el", "or", "pg"],
	music: ["spot", "aapl", "googl"],
	shopping: ["amzn", "shop", "wmt", "tgt", "cost"],
	energy: ["tsla", "nee", "enph", "fslr", "xom", "cvx"],
};

// Curated popular brands for the swipe step
export const ONBOARDING_SWIPE_BRAND_IDS = [
	"tsla",
	"aapl",
	"nke",
	"spot",
	"nflx",
	"sbux",
	"amzn",
	"dis",
];
