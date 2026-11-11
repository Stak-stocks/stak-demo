/**
 * The paper ledger's anchors (coordinator decision D5, 2026-11-07: one continuous ledger).
 *
 * The untouched signed-out visitor sees the frames' figures (live/showcase.ts): $10,240.00 of portfolio value, of which
 * $8,800.00 is cash, +$240.00 all time on the $10,000 paper budget, "12 picks" of which the portfolio frame lists six
 * $100 stakes (2:743). The six listed picks are real positions of the guest persona (guest.ts seedGuest); the other six
 * are what this module calls the OFF-BOOK holding: the frames count them in the value and the pick count but never
 * list them, so the ledger carries them as one amount. With it the persona's computed ledger IS the frames' one, and
 * the first action (a deck decision, a save, a buy) changes nothing but what that action changes: a $100 buy moves
 * exactly $100 out of cash ($8,800 -> $8,700, the receipt's figure) and the value holds until prices move.
 *
 * The phones anchor their demo ledger the same way: value = the authored $10,240 + (cash - the authored $8,800) + new
 * stakes (android ui/simulate/PaperPortfolio.kt:127-135 and 286-292; ios Simulate/PaperPortfolio.swift:40-41, 241).
 *
 * Everything here is derived from the seed and the demo quotes, so the anchors stay exact if either is edited.
 *
 * The ledger's quantities (coordinator ruling N20d, 2026-11-09) are at the end of this file: eight decimals of a share
 * and a sale that returns exactly what the position was worth, so a buy and a sale at one price leave the cash where
 * it was (the user saw $8,799.99 after such a round trip).
 */
import { roundShares } from "@/lib/utils";
import { DEMO_QUOTES } from "./demoQuotes";
import { round2, round8 } from "./format";
import { type Lot, type Position, SEED_PICKS, type SoldEntry, seedGuest } from "./guest";

/** The frames' portfolio value (Simulate 2:646 "$10,240.00"). */
export const FRAMES_VALUE = 10240;
/** The guest persona's paper budget (the empty Simulate frame says $10,000; store.ts GUEST_BUDGET). */
export const PERSONA_BUDGET = 10000;
/** The frames' trailing week (Simulate 2:648 "▲ +$186 (+1.9%) this week", the board's "#47 You +1.9%"). */
export const FRAMES_WEEK_GAIN = 186;
/**
 * The persona's computed trailing week. The frames' own figures sit on a rounding edge ($186 on $10,054 = 1.85001%),
 * where one cent of share rounding after a trade flips "+1.9%" to "+1.8%"; a quarter dollar more keeps both displays
 * of the frames ("+$186" in whole dollars, "+1.9%" to one decimal: $186.25 on $10,053.75 = 1.8525%) 25 cents from
 * either edge.
 */
export const PERSONA_WEEK_GAIN = 186.25;
/** The frames' pick count (Portfolio 2:743 "12 picks · +$240.00 all time"). */
export const FRAMES_PICKS = 12;

/**
 * The frames' unlisted picks as one holding. `value` is today's worth (no quote moves it), `stake` what it cost, `since`
 * when it was bought (the middle of the listed picks' May 8 - Jul 8), `picks` how many picks it stands for.
 */
export type OffBook = {
	value: number;
	stake: number;
	since: number;
	picks: number;
	/**
	 * Dollars cut from the persona's holding (guest.ts unlistedCut: a migrated browser whose cash could not give up the
	 * seed's whole $604); absent or 0 for the persona's own holding. The value history anchors such a holding's week in
	 * proportion to its ledger, not to the holding (portfolioHistory.ts offBookValueAt).
	 */
	cut?: number;
};

let persona: OffBook | null = null;

/**
 * The persona's off-book holding: value = $10,240 - $8,800 - the listed picks at their demo quotes, stake = the $10,000
 * budget - $8,800 - the listed stakes - what the two closed picks lost or made, so a year ago the ledger was exactly
 * the $10,000 budget and today it is exactly $10,240.00.
 * With the exact seed (2026-11-09, N30.7: the six listed picks are worth the frames' $658.00 for $600.00) that is a
 * value of $782.00 and a stake of $604.00; under the four-decimal seed it was $782.01 and $603.96 (the listed picks
 * came to $657.99 for $600.04). The holding absorbs the cents, so the totals never moved.
 */
export function personaOffBook(): OffBook {
	if (persona) return persona;
	const seed = seedGuest();
	const price = (ticker: string) => DEMO_QUOTES[ticker]?.price ?? 0;
	// the listed picks as usePortfolio values them (positionRow: each value rounded to cents, then the sum), their stakes
	// the same way (the value history rounds each position at every moment)
	const listed = round2(seed.positions.reduce((sum, p) => sum + round2(p.shares * (price(p.ticker) || (p.priceAtAdd ?? 0))), 0));
	const stakes = seed.positions.reduce((sum, p) => sum + round2(p.shares * (p.priceAtAdd ?? 0)), 0);
	const closed = seed.sold.reduce((sum, s) => sum + (s.stake - s.proceeds), 0);
	persona = {
		value: round2(FRAMES_VALUE - seed.cash - listed),
		stake: round2(PERSONA_BUDGET - seed.cash - stakes - closed),
		since: new Date(2026, 5, 12).getTime(),
		picks: FRAMES_PICKS - seed.positions.length,
	};
	return persona;
}

/**
 * The persona's off-book holding less `cut` dollars of its value, its stake in the same proportion (the same picks, a
 * smaller share of them): what a browser migrated from the old seed holds when its cash could not give up the seed's
 * whole $604 (guest.ts migrateGuest `unlistedCut`), so its cash stays at $0, never below, and its ledger totals what
 * every migrated ledger does. A cut of 0 (every other persona ledger) is personaOffBook() itself.
 * The cut may be a few cents either way (negative: the holding carries them): a browser carried over from the
 * four-decimal seed keeps its total to the cent that way (guest.ts migrateGuest, step 2).
 */
export function personaOffBookLess(cut: number): OffBook {
	const full = personaOffBook();
	if (!Number.isFinite(cut) || cut === 0) return full;
	const value = round2(Math.max(0, full.value - cut));
	return { ...full, value, stake: round2(full.stake * (value / full.value)), cut: round2(full.value - value) };
}

const frameWeeks = new Map<string, number | null>();

/**
 * THE FRAMES' WEEKLY FIGURE OF A SEEDED PICK, as that company's move over the week, in percent (coordinator ruling
 * N35b, 2026-11-09; the SIMULATE review's low 8). The one pick page the frames draw prints what the pick made this week
 * (Pick detail 2:899: NVDA "This week +$3.80"; guest.ts SEED_PICKS `week`). Past the showcase the page computes that
 * cell: the shares held all week x (today's price - the close that opens the week's line). So the close that opens the
 * company's week is the one that makes the SEEDED shares earn exactly the frame's dollars: price - week / shares, in
 * cents. NVDA: $122.10 - $3.80 / 1.01556102 = $118.36, and 1.01556102 x ($122.10 - $118.36) = $3.80; the seeded draw
 * put it at $118.45, so the first action turned the frame's "+$3.80" into "+$3.71" with no price change.
 * The price path takes this figure for the company's 1W move (history.ts demoRangeMove), where every other company
 * keeps its seeded draw: it is the company's week for every visitor and on every page, and it scales with the quote
 * like any other move. The persona's total week stays the frames' +$186.25: the off-book holding carries what the six
 * listed picks do not make (portfolioHistory.ts anchoredWeekGain), nine cents less now.
 * null for a company no frame prints a weekly figure for (every pick but NVDA today), or without a demo quote.
 */
export function framesWeekMove(ticker: string): number | null {
	const T = ticker.toUpperCase();
	const known = frameWeeks.get(T);
	if (known !== undefined) return known;
	const pick = SEED_PICKS.find((p) => p.ticker === T && p.week !== undefined);
	const price = DEMO_QUOTES[T]?.price ?? 0;
	let move: number | null = null;
	if (pick && pick.week !== undefined && price > 0) {
		// the seed's own shares (guest.ts seedPick): worth exactly the frame's dollars at the demo quote
		const shares = round8(pick.worth / price);
		const open = round2(price - pick.week / shares);
		if (shares > 0 && open > 0) move = (price / open - 1) * 100;
	}
	frameWeeks.set(T, move);
	return move;
}

// ── The ledger's quantities (coordinator ruling N20d / N21 point 5, 2026-11-09) ─────────────────────────────────────

/**
 * Half of the last digit a share quantity is shown at (format.ts shares4: four decimals). A sale asked for within this
 * of the whole holding is a sale of the whole holding: the sheets work from the figure on show.
 */
export const SHARE_SHOWN_HALF_STEP = 0.00005;

/**
 * The shares a guest's practice order buys: dollars / price to EIGHT decimals. At four (the precision until 2026-11-09)
 * the shares no longer stood for the dollars: $100 of COST at $918.20 bought 0.1089 shares, worth $99.99, so buying and
 * selling at one price lost a cent ("cash $8,799.99"). At eight the quantity times the price is the stake to a
 * thousandth of a cent for any price a share trades at, and every screen still shows four decimals (shares4).
 * The phones keep four decimals and drift the same way (android ui/simulate/PaperPortfolio.kt buy(), ios
 * Simulate/PaperPortfolio.swift): reported for both apps.
 */
export function paperShares(dollars: number, price: number): number {
	return dollars > 0 && price > 0 ? round8(dollars / price) : 0;
}

/** What a guest's sale does: the shares sold, the shares left, the cash returned. */
export type PaperSale = { shares: number; remaining: number; proceeds: number };

/**
 * A guest's sale of `asked` shares out of `held` at `price` (pure).
 * - A request for the whole holding, to the precision the screens show it at (within SHARE_SHOWN_HALF_STEP, or more
 *   than is held), sells every share held: nothing invisible is left behind, and nothing is left unsold.
 * - Anything less sells that quantity, kept to eight decimals.
 * - The cash returned is what the position's worth drops by: its value before (shares x price in cents, the figure the
 *   portfolio shows) less the value of what is left. So a full sale returns exactly the position's value (at the price
 *   it was bought at: exactly what was paid), any run of partial sales adds up to that same figure to the cent, and a
 *   sale at today's price never moves the ledger's value.
 * A holding too small to show (under SHARE_SHOWN_HALF_STEP: "0.0000 shares") is sold whole by any request.
 * A quantity that is not a number, is negative, or rounds to no share at all sells nothing.
 */
export function paperSale(held: number, asked: number, price: number): PaperSale {
	const none: PaperSale = { shares: 0, remaining: held > 0 ? held : 0, proceeds: 0 };
	if (!(held > 0) || !(price > 0) || !Number.isFinite(asked) || asked < 0) return none;
	const all = asked >= held - SHARE_SHOWN_HALF_STEP;
	const shares = all ? held : round8(asked);
	if (!(shares > 0)) return none;
	const remaining = all ? 0 : round8(held - shares);
	return { shares, remaining, proceeds: round2(round2(held * price) - round2(remaining * price)) };
}

// ── What the ledger remembers (coordinator rulings N27c, N29d, 2026-11-09) ───────────────────────────────────────────

/**
 * A position as the lot accessors read it. `lots` is READONLY here (review 3, low 5d): none of them writes to the
 * position's own array (each returns a new one), so a caller holding a readonly list passes its position straight
 * through, as the value history does (portfolioHistory.ts openLots).
 */
type Holding = Pick<Position, "shares" | "priceAtAdd" | "addedAt"> & { lots?: readonly Lot[] };

/**
 * THE ONE ACCESSOR for a position's buys: its recorded lots (each with the shares of it still held), or, for a position
 * without `lots` (a seeded pick, an account's position this browser placed no order on, a state stored before lots
 * existed), ONE lot of everything held at the average cost on the first buy's day. `fallbackPrice` prices that one lot
 * when the position has no cost basis.
 * Everything that walks buys reads this: the inbox rows (notifications.ts), the store's top-up and sale, and the value
 * history and the pick page's market comparison may (they scale by the shares held, which is `heldLots`).
 */
export function positionLots(p: Holding, fallbackPrice = 0): Lot[] {
	const lots = (p.lots ?? []).filter((l) => l.shares > 0 && l.price > 0 && Number.isFinite(l.at));
	return lots.length > 0 ? lots : [{ shares: p.shares, price: p.priceAtAdd ?? fallbackPrice, at: p.addedAt }];
}

/** A lot kept for the order that opened a position is dated a moment before the account stamps it: the margin for it. */
const SAME_POSITION_MS = 10 * 60_000;

/**
 * A signed-in account's lots as this browser kept them (guest.ts AccountLocal.lots), when they are still the buys of
 * the position the account holds; undefined otherwise, and the position then reads as one lot (positionLots).
 * The account's ledger is shared with the phones, so a position can be closed and bought again where this browser does
 * not see it: its first buy's day (`addedAt`, the account's own figure) is then a new one, and the lots kept here belong
 * to the earlier position. Lots kept for THIS position hold its first buy: a lot dated `addedAt` itself (a holding first
 * met here at a top-up or a part sale: that one lot is made of the account's own figures) or a moment before it (a
 * position opened here: the order's own clock, then the account's write). The rule looks for that lot, not for the
 * oldest one, so a phone whose clock runs ahead of this browser's cannot make a fresh top-up look stale.
 */
export function keptLots(kept: unknown, addedAt: number): Lot[] | undefined {
	if (!Array.isArray(kept)) return undefined;
	const lots = (kept as (Lot | null | undefined)[]).filter((l): l is Lot => !!l && l.shares > 0 && l.price > 0 && Number.isFinite(l.at));
	if (lots.length === 0) return undefined;
	return lots.some((l) => Math.abs(l.at - addedAt) <= SAME_POSITION_MS) ? lots : undefined;
}

/**
 * The same buys with their shares scaled to exactly what is held now. The store keeps lots in step with the holding (a
 * part sale sells every lot in proportion), so this only corrects the last decimals, or a state an older build stored
 * whose lots still carry what was bought.
 */
export function heldLots(p: Holding, fallbackPrice = 0): Lot[] {
	const lots = positionLots(p, fallbackPrice);
	const total = lots.reduce((s, l) => s + l.shares, 0);
	return total > 0 && total !== p.shares ? lots.map((l) => ({ ...l, shares: (l.shares * p.shares) / total })) : lots;
}

/** What `shares` of a position cost, to the cent: shares x its average cost (portfolio.ts positionRow's `stake`). */
export const costOf = (shares: number, basis: number | null | undefined, fallbackPrice = 0): number => round2(shares * (basis ?? fallbackPrice));

/**
 * The average cost after buying `shares` more at `price`: what everything held cost, over everything held. NOT rounded
 * to cents (N30.7: dollars are exact, per-share figures follow): shares x this figure is the dollars paid, to the cent,
 * where a two-decimal average drifted by cents on a holding of many shares.
 */
export function averageCost(p: Pick<Position, "shares" | "priceAtAdd">, shares: number, price: number): number {
	const total = p.shares + shares;
	return total > 0 ? ((p.priceAtAdd ?? price) * p.shares + price * shares) / total : price;
}

/** A position's lots after a part sale left `remaining` of its `held` shares: every lot sold in proportion, its order's own quantity kept. */
export function lotsAfterSale(p: Holding, remaining: number, fallbackPrice = 0): Lot[] {
	const held = p.shares;
	return positionLots(p, fallbackPrice).map((l) => ({ ...l, shares: held > 0 ? round8((l.shares * remaining) / held) : 0, bought: l.bought ?? l.shares }));
}

/**
 * THE BUYS A SALE SOLD (review of 2026-11-09, follow-up F1): one entry per buy the sale took shares from, `shares` the
 * part of that buy sold in THIS sale, with that buy's own fill `price` and time `at`, and `bought`, the order's own
 * quantity. A sale sells every lot in proportion (the store keeps the lots that stay in the same proportion:
 * lotsAfterSale), so the parts are the lots' shares x (shares sold / shares held), kept to eight decimals and adding up
 * to exactly the shares sold (the largest part takes the eighth-decimal residue). A buy whose part rounds to no share
 * gave nothing to this sale and is not listed. A position without recorded lots sold from its one lot.
 */
function lotsSold(pos: Holding, sale: PaperSale, fallbackPrice = 0): Lot[] {
	if (!(sale.shares > 0)) return [];
	const lots = positionLots(pos, fallbackPrice);
	const total = lots.reduce((s, l) => s + l.shares, 0);
	if (!(total > 0)) return [];
	const parts = lots.map((l) => round8((l.shares * sale.shares) / total));
	const residue = round8(sale.shares - parts.reduce((s, x) => s + x, 0));
	if (residue !== 0) {
		const largest = parts.reduce((best, x, i) => (x > parts[best]! ? i : best), 0);
		parts[largest] = round8(parts[largest]! + residue);
	}
	return lots.map((l, i) => ({ shares: parts[i]!, price: l.price, at: l.at, bought: l.bought ?? l.shares })).filter((l) => l.shares > 0);
}

/**
 * THE SALE RECORD, as its own arithmetic (N29d): `stake` is what the shares sold had cost (the position's cost before
 * less the cost of what is left, each to the cent as the portfolio shows it, so a run of part sales adds up to the whole
 * stake exactly as their proceeds add up to the whole value), and `pnl` = proceeds - stake. So the SOLD row, the receipt
 * that prints the record, the cash and the inbox state one gain (before: pnl was rounded apart from the other two, and
 * JPM's receipt read +$1.99 beside a SOLD row of +$2.00). It also records what happened (N27c): `closed`, the fill
 * `price`, and, ON EVERY SALE, part or closing, the buys it sold (`lots`: lotsSold above; read them through soldLots).
 * Until the review of 2026-11-09 only a closing sale kept its buys, so the value history took everything a sale sold as
 * bought on the first buy's day: a pick topped up today and sold today counted today's shares as held all week, and the
 * week read +$392 and #7 where it had been +$186 and #47 (follow-up F1).
 */
export function saleRecord(pos: Position, sale: PaperSale, price: number, soldAt: number): SoldEntry {
	const closed = !(sale.remaining > 0);
	const stake = round2(costOf(pos.shares, pos.priceAtAdd, price) - (closed ? 0 : costOf(sale.remaining, pos.priceAtAdd, price)));
	return {
		ticker: pos.ticker,
		shares: sale.shares,
		proceeds: sale.proceeds,
		pnl: round2(sale.proceeds - stake),
		stake,
		soldAt,
		addedAt: pos.addedAt,
		closed,
		price,
		lots: lotsSold(pos, sale, price),
	};
}

/**
 * THE ONE ACCESSOR for the buys a sale sold: the record's own lots (every sale since 2026-11-09 keeps them: each buy's
 * part of the sale, its fill price, its time), or, for a record without them (the seed's SHOP and COIN, a part sale
 * stored earlier that day, anything older), ONE lot: everything the sale sold, bought on `addedAt` at the stake a
 * share. A record that does not know its buy day either (stored before 2026-11-07) reads as bought at time 0: held
 * since before any range. The value history values each lot from its own day (portfolioHistory.ts); the inbox reads the
 * lots of CLOSING sales only (notifications.ts), since a part sale's buys are still lots of the position.
 */
export function soldLots(x: Pick<SoldEntry, "shares" | "stake" | "addedAt" | "lots">): Lot[] {
	const lots = (x.lots ?? []).filter((l) => l.shares > 0 && l.price > 0 && Number.isFinite(l.at));
	if (lots.length > 0) return lots;
	return x.shares > 0 ? [{ shares: x.shares, price: x.stake / x.shares, at: x.addedAt ?? 0 }] : [];
}

/**
 * A signed-in account's sale of `asked` shares out of `held` at `price` (pure; follow-up F2: the store's own sum, so
 * the sell sheet's preview need not mirror it by hand). The account's ledger is the phones' (Firestore, three-decimal
 * quantities), so it is NOT the guest's paperSale.
 * AN ACCOUNT SELLS EXACTLY WHAT ITS DOCUMENT DROPS (coordinator ruling N41b, 2026-11-10; round 6's review, lows 2 and
 * 3). The document (src/context/AccountContext.tsx sellFromSandbox) keeps `roundShares(held - qty)` of a holding, three
 * decimals, and drops the position when that is no share; `held` is the document's own quantity (store.ts reads the
 * account's positions from it). So the sale is the document's own drop:
 * - `remaining` = roundShares(held - asked), what the document keeps (0: it drops the position, and the sale CLOSES it:
 *   saleRecord records it closed, the store ends the lots this browser kept for it, follow-up SW5);
 * - `shares` = held - remaining, what the document lets go (passed to sellFromSandbox, whose own sum then keeps exactly
 *   `remaining`): asked 0.0513 of 0.205 sells 0.051 and keeps 0.154; 0.0687 of 0.069 sells the whole 0.069 (the
 *   0.0003 the document would drop unpaid is sold with it);
 * - `proceeds` = what the position's worth drops by at the price, the guest's own rule (paperSale): its value before
 *   (held x price, in cents) less the value of what is kept. A sale at the price paid books $0.00 (saleRecord's stake
 *   is the same drop at the cost a share), the cash the document credits is the record's proceeds, and the record keeps
 *   what the document keeps: the three agree.
 * A sale the document would NOT shrink (roundShares(held - asked) is the whole holding: 0.0004 of 0.001, a quarter of
 * 0.002) sells nothing, and the store refuses it with OrderRefused("too-small"): until N41b it was accepted and credited
 * its proceeds while the holding stayed, so it could be repeated without end. A sale of nothing (nothing held, no price,
 * nothing asked) sells nothing.
 * A PART SALE WORTH LESS THAN A CENT sells nothing too (coordinator ruling N44c, 2026-11-10; round 7's review, low 2):
 * where the document keeps shares and the worth drop is under $0.01, the sale is the none sale and the store refuses it
 * with OrderRefused("too-small"), as orders.ts checkSell refuses a guest's part sale that would file "$0.00" (the sheets'
 * pre-check judges the guest's quantities, so an account's could pass it: 0.0015 of 0.021 AMC at $4.85 is 0.0015 shares
 * for $0.01 to a guest, while the document drops 0.001 and keeps 0.02, worth the same $0.10: it was recorded as "0.0010
 * AMC returned $0.00"). Only the quotes under $10 meet it at the document's 0.001 (AMC, SOFI), and holdings the phones
 * stored at four decimals. Closing the whole holding stays allowed whatever it is worth (orders.ts: dust included), and
 * Simulate's sell sheet (figures.ts salePreview) previews the none sale: nothing.
 * Until N41b the quantity was `asked` to four decimals: a sale at the price paid booked the document's rounding as cents
 * of gain or loss (0.069 CRWD, half sold at $362.10: +$0.18), and a sale leaving under 0.0005 shares let the document
 * drop the rest unpaid (0.0687 of 0.069: -$0.10). Until N38c `remaining` was round8(held - shares).
 * The guest's rule (paperSale) is unchanged: its ledger keeps eight decimals, and 0.0003 left stays a holding it can show
 * and sell.
 */
export function accountSale(held: number, asked: number, price: number): PaperSale {
	const none: PaperSale = { shares: 0, remaining: held > 0 ? held : 0, proceeds: 0 };
	if (!(held > 0) || !(price > 0) || !Number.isFinite(price) || !Number.isFinite(asked) || !(asked > 0)) return none;
	// the document's own sum on the same figures: what it keeps of the holding (never more than it holds)...
	const left = Math.max(0, roundShares(held - Math.min(asked, held)));
	// ...and what it lets go, which is what is sold
	const shares = round8(held - left);
	if (!(shares > 0)) return none;
	const proceeds = round2(round2(held * price) - round2(left * price));
	// a PART sale worth less than a cent is no sale either (N44c), as checkSell refuses a guest's: the store refuses it
	if (left > 0 && proceeds < 0.01) return none;
	return { shares, remaining: left, proceeds };
}
