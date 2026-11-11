/**
 * What a practice order may be: ONE rule for the store and for every ticket and sheet (coordinator, 2026-11-09:
 * BUILD-PLAN N27a / N27i / N27n / N30; the hunt's ST-01, ST-05, ST-12, ST-13).
 *
 * Before it, $0.01 of COST bought "0.0000 shares", charged the cent and left a pick that could never be sold; a 0.001%
 * sale filed a 0-share row under SOLD; an amount over the cash, or under any sensible minimum, ended in the false
 * "Prices are refreshing" failure. Now an order of nothing is refused BEFORE it is placed, with a reason, and the ticket
 * says that reason in its own caption (`refusalLine`).
 *
 * - The store (store.ts buy / sell) checks with `checkBuy` / `checkSell` and throws `OrderRefused`.
 * - A ticket runs the same check on what is typed, disables Confirm while it fails, and prints `refusalLine`.
 * The phones accept any amount above zero up to the cash (android ui/simulate/PaperPortfolio.kt canBuy); the floor is a
 * web ruling: their four-decimal shares hide the same dust.
 */
import { money, round2 } from "./format";
import { paperSale, paperShares, SHARE_SHOWN_HALF_STEP } from "./ledger";

/** The smallest practice buy, in dollars (the tickets' chips start at $10). */
export const MIN_BUY = 1;

export type OrderRefusal = "no-price" | "too-small" | "insufficient" | "nothing-held";
export type OrderCheck = { ok: true } | { ok: false; reason: OrderRefusal };

const OK: OrderCheck = { ok: true };
const no = (reason: OrderRefusal): OrderCheck => ({ ok: false, reason });

/** A price an order can fill at: a finite number above zero (a company the demo has no quote for has none). */
export const hasPrice = (price: number | null | undefined): price is number => typeof price === "number" && Number.isFinite(price) && price > 0;

/**
 * The smallest buy of a share at `price`: MIN_BUY, or more when a dollar of it would still print "0.0000 shares" (a
 * share priced in the tens of thousands).
 */
export const minBuy = (price: number): number => Math.max(MIN_BUY, Math.ceil(SHARE_SHOWN_HALF_STEP * price * 100) / 100);

/** May `dollars` of paper cash be spent on a share at `price` by an account holding `cash`? */
export function checkBuy(dollars: number, cash: number, price: number | null | undefined): OrderCheck {
	if (!hasPrice(price)) return no("no-price");
	const amount = round2(dollars);
	if (!Number.isFinite(amount) || amount < minBuy(price)) return no("too-small");
	if (amount > cash + 0.005) return no("insufficient");
	if (!(paperShares(amount, price) >= SHARE_SHOWN_HALF_STEP)) return no("too-small");
	return OK;
}

/**
 * May `asked` shares be sold out of `held` at `price`? Closing the whole holding is always allowed, dust included (a
 * holding worth less than a cent must still be closable); a PART sale has to be something the ledger can show: at least
 * 0.0001 shares and at least a cent.
 */
export function checkSell(asked: number, held: number, price: number | null | undefined): OrderCheck {
	if (!(held > 0)) return no("nothing-held");
	if (!hasPrice(price)) return no("no-price");
	const sale = paperSale(held, asked, price);
	if (!(sale.shares > 0)) return no("too-small");
	if (sale.remaining > 0 && (sale.shares < SHARE_SHOWN_HALF_STEP || sale.proceeds < 0.01)) return no("too-small");
	return OK;
}

/** The store's refusal: `reason` says why, and `message` is the same word (older callers compare the message). */
export class OrderRefused extends Error {
	readonly reason: OrderRefusal;
	constructor(reason: OrderRefusal) {
		super(reason);
		this.name = "OrderRefused";
		this.reason = reason;
	}
}

/** The reason an order was refused for, or null when the error is something else (a network failure, a stale price). */
export const refusalOf = (error: unknown): OrderRefusal | null => (error instanceof OrderRefused ? error.reason : null);

/**
 * The sentence a ticket prints under its amount when the order cannot be placed, in the caption style of the stock
 * ticket's "Only $0.00 of paper cash left" (no full stop). `cash` for "insufficient", `price` for the exact minimum.
 */
export function refusalLine(reason: OrderRefusal, o: { ticker: string; side: "buy" | "sell"; cash?: number; price?: number | null }): string {
	switch (reason) {
		case "no-price":
			return `${o.ticker} has no price right now, so it cannot be ${o.side === "buy" ? "bought" : "sold"}`;
		case "too-small":
			return o.side === "buy" ? `The smallest practice buy is ${money(hasPrice(o.price) ? minBuy(o.price) : MIN_BUY)}` : "That sale rounds to nothing";
		case "insufficient":
			return `Only ${money(Math.max(0, o.cash ?? 0))} of paper cash left`;
		case "nothing-held":
			return `You hold no ${o.ticker} to sell`;
	}
}
