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
	gaming:    ["rblx", "ttwo", "ea", "sony", "gme", "msft", "nvda", "amd", "app", "u", "dkng", "penn", "meta"],
	streaming: ["nflx", "dis", "para", "wbd", "roku", "spot", "googl", "snap", "meta"],
	fashion:   ["nke", "lulu", "wrby", "etsy", "tjx", "rost", "burl"],
	tech:      ["aapl", "msft", "googl", "tsla", "nvda", "meta", "amd", "duol", "app", "arm", "avgo", "rklb", "asts", "acmr", "lunr", "gsat", "soun", "intc", "qcom", "tsm", "pltr", "ionq"],
	food_drink:["sbux", "mcd", "cmg", "dpz", "wing", "shak", "bros", "cake", "txrh", "eat", "yum", "denn", "jack", "pzza", "blmn", "ko", "pep", "mnst", "celh", "sam", "fizz", "kdp", "mdlz", "hsy", "gis", "stz", "bynd", "dash"],
	travel:    ["uber", "lyft", "abnb", "mar", "hlt", "rcl", "dal", "ual", "luv", "aal", "wynn", "lvs", "mlco", "mgm", "joby", "achr"],
	fitness:   ["nke", "aapl", "pton", "lulu", "hims"],
	finance:   ["v", "ma", "sq", "hood", "sofi", "pypl", "afrm", "coin", "jpm", "axp", "schw", "brkb", "gs", "bac", "ms", "blk", "cof"],
	beauty:    ["ulta", "elf", "coty", "el", "or", "pg", "cl", "wrby", "hims"],
	music:     ["spot", "sony", "lyv", "aapl"],
	shopping:  ["amzn", "shop", "wmt", "tgt", "cost", "etsy", "ebay", "chwy", "cart", "cvna", "hd", "low", "pins", "dash"],
	energy:    ["tsla", "nee", "enph", "fslr", "plug", "xom", "cvx", "rivn", "nio", "lcid", "gm", "f", "tm", "alb"],
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
