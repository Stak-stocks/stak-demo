export interface ActivityOption {
	id: string;
	label: string;
	emoji: string;
}

export interface FamiliarityOption {
	id: string;
	label: string;
	description: string;
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
	{ id: "gaming", label: "Gaming", emoji: "🎮" },
	{ id: "streaming", label: "Streaming", emoji: "📺" },
	{ id: "fashion", label: "Fashion", emoji: "👟" },
	{ id: "tech", label: "Tech", emoji: "💻" },
	{ id: "food", label: "Food & Drink", emoji: "☕" },
	{ id: "travel", label: "Travel", emoji: "✈️" },
	{ id: "fitness", label: "Fitness", emoji: "💪" },
	{ id: "finance", label: "Finance", emoji: "💳" },
	{ id: "beauty", label: "Beauty", emoji: "💄" },
	{ id: "music", label: "Music", emoji: "🎵" },
	{ id: "shopping", label: "Shopping", emoji: "🛍️" },
	{ id: "energy", label: "Energy", emoji: "⚡" },
];

export const MOTIVATION_OPTIONS = [
	"Learn about investing",
	"Track brands I love",
	"Compete with friends",
	"Build a portfolio",
];

export const FAMILIARITY_OPTIONS: FamiliarityOption[] = [
	{ id: "beginner", label: "Beginner", description: "I'm new to investing and want to learn" },
	{ id: "intermediate", label: "Intermediate", description: "I know the basics and have some experience" },
	{ id: "advanced", label: "Advanced", description: "I actively invest and follow the markets" },
];

// Maps activity selections to brand IDs from brands.ts
export const ACTIVITY_TO_BRANDS: Record<string, string[]> = {
	gaming: ["rblx", "nvda", "msft", "amd", "aapl"],
	streaming: ["nflx", "spot", "dis", "amzn", "googl"],
	fashion: ["nke", "ulta", "elf", "coty"],
	tech: ["aapl", "msft", "googl", "meta", "nvda", "tsla"],
	food: ["sbux", "mcd", "ko", "pep", "cost"],
	travel: ["abnb", "uber", "lyft", "ba"],
	fitness: ["nke", "aapl", "ulta"],
	finance: ["v", "ma", "sq", "hood", "sofi", "pypl", "coin"],
	beauty: ["ulta", "elf", "coty", "el", "or"],
	music: ["spot", "aapl", "amzn", "googl"],
	shopping: ["amzn", "shop", "wmt", "tgt", "cost", "hd"],
	energy: ["nee", "enph", "fslr", "xom", "cvx", "plug"],
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
