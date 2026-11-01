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
	{ id: "insights", label: "I already invest but want better insights", color: "bg-[#69B3CA]", icon: "👤" },
	{ id: "curious", label: "Just curious", color: "bg-slate-600", icon: "💭" },
];

export const FAMILIARITY_OPTIONS: FamiliarityOption[] = [
	{ id: "new", label: "Completely new" },
	{ id: "little", label: "Know a little" },
	{ id: "some", label: "Some experience" },
	{ id: "experienced", label: "Experienced investor" },
];

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
