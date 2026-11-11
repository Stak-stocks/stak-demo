/**
 * WHICH PRICES ARE ON SCREEN, and the sentence that says so (coordinator rulings N30.8g / N30.8s; the hunt's C-02):
 * Simulate told a signed-out visitor "Prices are real. Nothing is smoothed for comfort." and the deck's default tip
 * "Prices are real. ..." while Help & support told the same visitor "Signed out, STAK shows demo prices."
 *
 * ONE helper for every such sentence. The three cases are the ones Help & support states (src/app/profile/data.ts
 * helpSupport.faq.prices, the route's own rule):
 * - "signedOut": a signed-out visitor is on the demo: the companies the design prices keep the demo table's prices for
 *   the whole visit (quotes.ts useLiveFor);
 * - "live": signed in and the market feed answers: the quotes on screen are the feed's;
 * - "offline": signed in but the feed is unreachable: the demo table answers.
 * THE RULE for a sentence about prices: the frame's "Prices are real ..." stands in the untouched showcase (frames
 * verbatim, D7) and while the quotes on screen are live; with demo prices on screen (every signed-out visitor past the
 * showcase, or the feed unreachable) a demo-prices sentence takes its place, in the same spot and style. `real` is
 * that decision, `lead` the sentence a tip opens with, `sentence` the whole statement as Help & support gives it.
 */
import { useMemo } from "react";
import { helpSupport } from "@/app/profile/data";
import { useApiHealthState } from "./quotes";
import { useShowcase } from "./showcase";
import { useLive } from "./store";

export type PriceCase = "signedOut" | "live" | "offline";

export type PricesOnScreen = {
	/** which of Help & support's three cases holds */
	case: PriceCase;
	/** the quotes on screen come from the market feed */
	live: boolean;
	/** the untouched signed-out showcase: the frames' own sentences stand */
	showcase: boolean;
	/** a sentence may say "Prices are real": live quotes, or the untouched showcase repeating its frame */
	real: boolean;
	/** how a tip about prices opens: "Prices are real." / "These are demo prices." */
	lead: string;
	/** the whole statement for this visitor, the one Help & support prints */
	sentence: string;
};

/** How a sentence about the prices opens: the frames' words while they are true (or the showcase's), the demo's otherwise. */
export const PRICE_LEAD = { real: "Prices are real.", demo: "These are demo prices." } as const;

/** The prices on screen for a visitor (pure): `healthy` is the market feed's probe (useApiHealth), `showcase` the untouched persona. */
export function pricesOnScreen(o: { signedIn: boolean; healthy: boolean; showcase?: boolean }): PricesOnScreen {
	const which: PriceCase = !o.signedIn ? "signedOut" : o.healthy ? "live" : "offline";
	const live = which === "live";
	const showcase = !o.signedIn && !!o.showcase;
	const real = live || showcase;
	return { case: which, live, showcase, real, lead: real ? PRICE_LEAD.real : PRICE_LEAD.demo, sentence: helpSupport.faq.prices[which] };
}

/** The prices on screen for the person here: one hook for Simulate's tip, the deck's default tip and Help & support. */
export function usePricesOnScreen(): PricesOnScreen {
	const signedIn = useLive().signedIn;
	const healthy = useApiHealthState().healthy;
	const showcase = useShowcase();
	return useMemo(() => pricesOnScreen({ signedIn, healthy, showcase }), [signedIn, healthy, showcase]);
}
