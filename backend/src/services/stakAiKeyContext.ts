/**
 * STAK AI's key context: the facts about a company that matter for nearly any question on it, worked out in code and
 * added to its live data line as KEY CONTEXT (see fetchLiveStockContext in routes/stakAi.ts). Its own module so it
 * stays pure: no database, catalog or network - its tests load instantly.
 */

/** What keyContext reads: a company's price, its 52-week range, its past year, and its latest growth. */
export interface KeyContextInput {
	price: number;
	week52Low?: number | null;
	week52High?: number | null;
	yearReturn?: number | null;
	revenueGrowthQuarterYoy?: number | null;
	epsGrowthQuarterYoy?: number | null;
}

/**
 * The facts about a company that matter for nearly any question on it, worked out here rather than left for the model
 * to notice: in the test set it mentioned Nike's 49% fall one run and left out Roblox's 62% the next, under the same
 * instructions. Said as plain facts, never as signals: "close to the lowest it's been in a year", not "near its low".
 * (Today's move isn't one: outside regular hours the quote's change is the last session's, and the prompt already
 * says a move under about 1% is normal noise.)
 */
export function keyContext(c: KeyContextInput): string[] {
	const out: string[] = [];
	const pct = (v: number) => `${Math.abs(v).toFixed(1)}%`;
	const year = c.yearReturn;
	// Big years only: a move that size colours any answer about the company.
	if (year != null && year <= -20) out.push(`the stock is down ${pct(year)} over the past year`);
	else if (year != null && year >= 50) out.push(`the stock is up ${pct(year)} over the past year`);
	// Where the price sits in its year's range - only when the range is wide enough to mean anything (15%+), and only
	// in its bottom or top quarter. The range is as of the last close; a live price past it is a new low or high.
	const { week52Low: low, week52High: high, price } = c;
	if (low != null && high != null && low > 0 && high / low >= 1.15) {
		const position = (price - low) / (high - low);
		if (price < low) out.push("the price is below its lowest of the past year");
		else if (price > high) out.push("the price is above its highest of the past year");
		else if (position <= 0.25 && price <= low * 1.05) out.push("the price is close to the lowest it's been in the past year");
		else if (position >= 0.75 && price >= high * 0.95) out.push("the price is close to the highest it's been in the past year");
	}
	// The business and the stock pointing different ways - the pairing a beginner most needs spelled out. Growth is
	// revenue's (EPS only when there's no revenue figure: buybacks can lift EPS while sales shrink).
	const revenue = c.revenueGrowthQuarterYoy;
	const grew = revenue != null ? revenue > 5 : c.epsGrowthQuarterYoy != null && c.epsGrowthQuarterYoy > 5;
	if (year != null && year <= -20 && grew) out.push(`${revenue != null ? "revenue" : "earnings per share"} grew in the latest quarter while the stock fell over the past year`);
	// A smaller rise (30%+) counts here than above: what matters is that it ran opposite to revenue.
	if (year != null && year >= 30 && revenue != null && revenue < 0) out.push("the stock rose over the past year while revenue shrank in the latest quarter");
	return out;
}
