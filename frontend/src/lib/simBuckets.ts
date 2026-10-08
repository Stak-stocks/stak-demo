// Android's StakInsights: the allocation buckets and the Simulate INSIGHT line, read from the picks the user holds.

const COLLECTIONS: Record<string, string[]> = {
	aitech: ["NVDA", "AAPL", "MSFT", "GOOGL", "AMD"],
	finance: ["JPM", "V", "GS"],
	green: ["ENPH", "NEE", "FSLR"],
	realestate: ["PLD", "O"],
	health: ["LLY", "UNH", "JNJ", "PFE"],
	consumer: ["COST", "NKE"],
};

const THEME: Record<string, string> = {
	aitech: "tech and AI", finance: "finance", green: "green energy", realestate: "real estate", health: "healthcare", consumer: "consumer brands",
};
const BUCKET_NAME: Record<string, string> = {
	aitech: "Tech & AI", finance: "Finance", green: "Green Energy", realestate: "Real Estate", health: "Healthcare", consumer: "Consumer",
};
/** The colour is keyed by the bucket's id, never by its position in the list. */
const BUCKET_COLOR: Record<string, string> = {
	aitech: "#69B3CA", finance: "#7AB3F0", green: "#2FD08A", realestate: "#9E8CE5", health: "#69B3CA", consumer: "#E8B86D", other: "#5C6B85",
};

export const bucketColor = (id: string) => BUCKET_COLOR[id] ?? BUCKET_COLOR.other;

export interface Bucket {
	id: string;
	name: string;
	count: number;
	share: number;
}

/** Allocation by collection for the given tickers; unknown tickers land in Other. "Other" last, then biggest first. */
export function buckets(tickers: string[]): Bucket[] {
	if (tickers.length === 0) return [];
	const counts = new Map<string, number>();
	for (const t of tickers) {
		const id = Object.entries(COLLECTIONS).find(([, list]) => list.includes(t.toUpperCase()))?.[0] ?? "other";
		counts.set(id, (counts.get(id) ?? 0) + 1);
	}
	return [...counts.entries()]
		.sort(([ai, an], [bi, bn]) => Number(ai === "other") - Number(bi === "other") || bn - an)
		.map(([id, count]) => ({ id, name: BUCKET_NAME[id] ?? "Other", count, share: count / tickers.length }));
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n: number) => WORDS[n] ?? String(n);

/** Simulate's INSIGHT card text. */
export function simInsight(tickers: string[]): string {
	if (tickers.length === 1) return `${tickers[0]} is your first pick. Insights start once it has a week of moves.`;
	const all = buckets(tickers);
	const top = all[0];
	if (!top || top.id === "other" || top.count < 2) {
		return `Your ${tickers.length} picks span ${all.length} industries. STAK reads a pattern once a few of them share one.`;
	}
	const w = word(top.count);
	return `${w.charAt(0).toUpperCase()}${w.slice(1)} of your ${tickers.length} picks are ${THEME[top.id]} names. Your taste has a type.`;
}
