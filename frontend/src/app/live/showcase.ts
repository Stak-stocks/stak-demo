/**
 * The showcase rule (user, 2026-10-10: "match exactly what's on the Figma design").
 *
 * A signed-out visitor who has not acted yet is looking at the design itself, so every screen shows the
 * frames' own figures, verbatim, even where the frames' digits do not add up (the portfolio header says
 * 12 picks and +$240 all time over six listed picks). The first trade, save, unsave or deck decision
 * switches every screen to honest, computed numbers, and signed-in accounts always see their own.
 */
import { useMemo } from "react";
import { seedGuest } from "./guest";
import { type Live, useLive } from "./store";

let seedSignature: string | null = null;
const signature = (s: Pick<Live, "cash" | "positions" | "sold" | "saves">) =>
	[
		s.cash.toFixed(2),
		s.positions.map((p) => `${p.ticker}:${p.shares}`).join(","),
		s.sold.map((x) => `${x.ticker}:${x.proceeds}`).join(","),
		s.saves.map((x) => x.ticker).sort().join(","),
	].join("|");

/** True for the untouched guest persona: same holdings, sales, cash and saves as the seed, no deck decision today. */
export function isShowcase(live: Live): boolean {
	if (live.signedIn) return false;
	const decided = live.deck ? live.deck.saved.length + live.deck.passed.length + live.deck.bought.length : 0;
	if (decided > 0) return false;
	seedSignature ??= signature(seedGuest());
	return signature(live) === seedSignature;
}

export function useShowcase(): boolean {
	const live = useLive();
	return useMemo(() => isShowcase(live), [live]);
}
