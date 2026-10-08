// The portfolio's real value over time, replayed from the trade ledger - Android's
// PortfolioHistory.build, on the web's finer timeline: at each price point, cash is the starting
// balance plus every trade's cash move so far, and each traded stock is valued at its latest close
// at or before that moment. Includes positions since sold (the holdings-only estimate can't see them).
import type { SandboxTrade } from "@/lib/api";

export interface PricePoint { ts: string; close: number }
export interface ChartValuePoint { ts: string; value: number; pnl: number }

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * `series` maps each traded ticker to its price history for the visible range. Returns null when
 * there's nothing honest to draw (no trades, or fewer than two priced moments after the first trade),
 * so the caller can fall back rather than show an invented line.
 */
export function buildLedgerSeries(
	trades: SandboxTrade[],
	startBalance: number,
	series: Record<string, PricePoint[]>,
	/**
	 * Today's snapshot - cash (with open orders' reserved stakes) and shares by ticker. Given, the replay opens from it
	 * with every logged trade undone (as the apps do): a portfolio holding stock bought before the trade ledger, or
	 * whose oldest trades fell off the page read, replayed forward from the start drew a line that tracked only the
	 * logged trades and disagreed with the value above it.
	 */
	now?: { cash: number; shares: Record<string, number>; value?: number },
): ChartValuePoint[] | null {
	const heldNow = Object.values(now?.shares ?? {}).some((q) => q > 1e-9);
	if (trades.length === 0 && !heldNow) return null;
	const ordered = [...trades]
		.map((t) => ({ ...t, ms: Date.parse(t.executedAt) }))
		.sort((a, b) => a.ms - b.ms || a.id - b.id);
	const firstTradeMs = ordered[0]?.ms ?? -Infinity;

	const priced = Object.fromEntries(
		Object.entries(series).map(([ticker, pts]) => [
			ticker,
			pts.map((p) => ({ ms: Date.parse(p.ts), close: p.close })).filter((p) => p.close > 0 && Number.isFinite(p.ms)).sort((a, b) => a.ms - b.ms),
		]),
	);
	const timeline = [...new Set(Object.values(priced).flatMap((pts) => pts.map((p) => p.ms)))]
		.filter((ms) => ms >= firstTradeMs)
		.sort((a, b) => a - b);
	if (timeline.length < 2) return null;

	let cash = startBalance;
	const shares = new Map<string, number>();
	if (now) {
		// The opening state: today's, with every logged trade's cash and shares taken back out.
		cash = now.cash - ordered.reduce((sum, t) => sum + (t.side === "buy" ? -t.amount : t.amount), 0);
		for (const [ticker, qty] of Object.entries(now.shares)) shares.set(ticker, qty);
		for (const t of ordered) shares.set(t.ticker, (shares.get(t.ticker) ?? 0) - (t.side === "buy" ? t.shares : -t.shares));
	}
	const lastTradePrice = new Map<string, number>();
	const cursor = new Map<string, number>();
	let tradeIdx = 0;
	const out: ChartValuePoint[] = [];

	for (const ms of timeline) {
		while (tradeIdx < ordered.length && ordered[tradeIdx]!.ms <= ms) {
			const t = ordered[tradeIdx++]!;
			cash += t.side === "buy" ? -t.amount : t.amount;
			shares.set(t.ticker, (shares.get(t.ticker) ?? 0) + (t.side === "buy" ? t.shares : -t.shares));
			lastTradePrice.set(t.ticker, t.price);
		}
		let holdings = 0;
		let unpriced = false;
		for (const [ticker, qty] of shares) {
			if (qty <= 1e-9) continue;
			const pts = priced[ticker] ?? [];
			let i = cursor.get(ticker) ?? -1;
			while (i + 1 < pts.length && pts[i + 1]!.ms <= ms) i++;
			cursor.set(ticker, i);
			// Before a stock's first bar in the window, its own last fill is the honest price. A holding with neither
			// (bought before the ledger) can't be priced here: the moment is left out, never counted at $0 (the apps).
			const price = i >= 0 ? pts[i]!.close : lastTradePrice.get(ticker);
			if (price === undefined) { unpriced = true; break; }
			holdings += qty * price;
		}
		if (unpriced) continue;
		const value = round2(cash + holdings);
		out.push({ ts: new Date(ms).toISOString(), value, pnl: round2(value - startBalance) });
	}
	// The line ends on the live value printed above it (the apps' endingToday).
	if (now?.value !== undefined && out.length > 0) {
		const value = round2(now.value);
		out.push({ ts: new Date().toISOString(), value, pnl: round2(value - startBalance) });
	}
	return out.length >= 2 ? out : null;
}
