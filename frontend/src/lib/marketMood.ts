// Android's MarketMoodFeed: the words, the gauge score and the colour for a daily-brief mood.

export interface MoodStatus {
	/** Teal lead-in, e.g. "Bullish momentum". */
	lead: string;
	/** White remainder, e.g. ", momentum is building.". */
	rest: string;
}

const STATUS: Record<string, MoodStatus> = {
	bullish: { lead: "Bullish momentum", rest: ", momentum is building." },
	"risk-on": { lead: "Risk-On mode", rest: ", momentum is building." },
	calm: { lead: "Calm markets", rest: ", markets are calm right now." },
	mixed: { lead: "Mixed signals", rest: ", a mixed picture across the market." },
	cautious: { lead: "Cautious tone", rest: ", a mixed picture across the market." },
	volatile: { lead: "High volatility", rest: ", expect bigger swings than usual." },
	bearish: { lead: "Bearish pressure", rest: ", investors are pulling back." },
	"risk-off": { lead: "Risk-Off tone", rest: ", investors are pulling back." },
};

const SCORE: Record<string, number> = {
	bullish: 85, "risk-on": 85, calm: 72, mixed: 50, cautious: 40, volatile: 25, bearish: 12, "risk-off": 12,
};

const norm = (mood: string | undefined) => (mood ?? "").trim().toLowerCase();

/** The card's status line. `state`: the brief hasn't arrived ("loading"), or it settled (with a mood or without). */
export function moodStatus(mood: string | undefined, state: "loading" | "settled"): MoodStatus {
	const key = norm(mood);
	if (state === "loading") return { lead: "Reading the market", rest: "…" };
	if (!key) return { lead: "Mood unavailable", rest: " right now." };
	return STATUS[key] ?? { lead: key.charAt(0).toUpperCase() + key.slice(1), rest: "." };
}

/** 0-100 gauge score; unknown moods read as a middling 50. Null when there is no mood at all. */
export function moodScore(mood: string | undefined): number | null {
	const key = norm(mood);
	if (!key) return null;
	return SCORE[key] ?? 50;
}

/** The News tab's mini gauge colour for a mood. */
export function moodColor(mood: string | undefined): string {
	switch (norm(mood)) {
		case "bullish": case "risk-on": return "#2FD08A";
		case "mixed": return "#DEB940";
		case "cautious": case "volatile": return "#F5A623";
		case "bearish": return "#FF5252";
		case "risk-off": return "#B06BE3";
		default: return "#69B3CA";
	}
}
