// Realized gains for the SOLD - REALIZED list. The server keeps no per-sale P&L, so it is replayed
// from the trade ledger with the same weighted-average cost basis the backend's /buy applies (and
// Android's PaperPortfolio.computeRealized): a sale's banked gain is measured against what was
// actually paid for those shares.
import type { SandboxTrade } from "@/lib/api";

export interface RealizedSale {
	ticker: string;
	/** Dollars banked: (sale price - average cost) x shares sold. */
	gain: number;
	proceeds: number;
	executedAt: string;
}

/** `newestFirst` is GET /api/sandbox/trades order (exact-timestamp, newest first). Returns newest sale first. */
export function computeRealized(newestFirst: SandboxTrade[]): RealizedSale[] {
	const sharesHeld = new Map<string, number>();
	const basisPerShare = new Map<string, number>();
	const out: RealizedSale[] = [];
	// Reverse the already-ordered list rather than re-sorting by day: two same-day trades would
	// otherwise keep their newest-first order and a sale could be replayed before its own buy.
	for (const t of [...newestFirst].reverse()) {
		if (t.side === "buy") {
			const prevShares = sharesHeld.get(t.ticker) ?? 0;
			const prevBasis = basisPerShare.get(t.ticker) ?? 0;
			const total = prevShares + t.shares;
			basisPerShare.set(t.ticker, total > 0 ? (prevBasis * prevShares + t.price * t.shares) / total : t.price);
			sharesHeld.set(t.ticker, total);
		} else {
			const basis = basisPerShare.get(t.ticker) ?? t.price;
			sharesHeld.set(t.ticker, (sharesHeld.get(t.ticker) ?? 0) - t.shares);
			out.push({ ticker: t.ticker, gain: (t.price - basis) * t.shares, proceeds: t.amount, executedAt: t.executedAt });
		}
	}
	return out.reverse();
}
