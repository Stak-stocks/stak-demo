// Android's ChartSeries / PortfolioHistory reductions, so the web's lines are drawn from the same points.
import type { PricePoint } from "@/lib/ledgerChart";

const EDGE = 0.08;

/** Values as 0..1 heights with an 8% margin top and bottom; a flat series sits in the middle. */
export function chartFractions(values: number[]): number[] {
	if (values.length === 0) return [];
	const min = Math.min(...values);
	const max = Math.max(...values);
	if (max - min < 1e-9) return values.map(() => 0.5);
	return values.map((v) => Math.min(1, Math.max(0, EDGE + ((v - min) / (max - min)) * (1 - 2 * EDGE))));
}

/** The New York calendar day ("2026-09-25") a timestamp falls on. */
export const etDay = (ts: string) => new Date(ts).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

/** One close per New York trading day (the last one wins); closes at or below zero are dropped. */
export function dailyCloses(points: PricePoint[]): PricePoint[] {
	const byDay = new Map<string, PricePoint>();
	for (const p of points) {
		if (!(p.close > 0)) continue;
		const day = etDay(p.ts);
		const kept = byDay.get(day);
		if (!kept || Date.parse(p.ts) >= Date.parse(kept.ts)) byDay.set(day, p);
	}
	return [...byDay.values()].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
}

/** "1D" rows are hidden while every point is still pre-market: nothing has really moved yet. */
export function allPreMarket(points: Array<{ session?: string }>): boolean {
	return points.length > 0 && points.every((p) => p.session === "pre");
}
