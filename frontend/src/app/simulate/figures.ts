/**
 * The Simulate pages' own arithmetic on the FOUNDATION modules (src/app/live: history, portfolioHistory, rank, ledger;
 * .claude/tools/make-it-real-2026-11-06/FOUNDATION-API.md): what each list shows first, which board rows each page draws,
 * a pick's week and its standing against the market. Pure functions only, so every rule is unit-tested
 * (__tests__/figures.unit.test.ts); the pages call them with the live state.
 */
import {
	accountSale,
	type Board,
	type BoardRow,
	closeAt,
	heldLots,
	type Lot,
	money,
	type OrderRefusal,
	type PaperSale,
	paperSale,
	pct1,
	positionLots,
	type PositionRow,
	type PriceHistory,
	refusalOf,
	round2,
	signedPct,
	signedPctOrZero,
	type SoldEntry,
	soldLots,
	type Tone,
	toneOf,
} from "@/app/live";

import { sheets, simulateEmpty, simulateHome } from "./data";

const DAY = 86_400_000;

/**
 * The Simulate pages' sentences about prices, true for the visitor (coordinator ruling N30.8g; the hunt's C-02: Simulate
 * told a signed-out visitor "Prices are real" while Help & support told the same visitor "Signed out, STAK shows demo
 * prices"). `prices` is the live layer's one answer (live/prices.ts usePricesOnScreen: `real` in the untouched showcase,
 * which repeats its frames, and while the quotes on screen are the market feed's). With real prices the frames' own
 * sentences stand, verbatim: "How paper trading works" (2:667), the empty state's body (2:2301), the ticket's
 * description (2:1431). With demo prices on screen each says so in the same place and style: the tip opens with the
 * live layer's own lead ("These are demo prices."), the other two name the demo price where the frame named the real one.
 */
export function priceCopy(prices: { real: boolean; lead: string }): { how: string; emptyBody: string; ticket: string } {
	if (prices.real) return { how: simulateHome.how.lines[1], emptyBody: simulateEmpty.body, ticket: sheets.addConfirm.description };
	return {
		how: `${prices.lead} Nothing is smoothed for comfort.`,
		emptyBody: simulateEmpty.body.replace("at real prices", "at demo prices"),
		ticket: "Your paper stake starts at today’s demo price and tracks its move, in either direction.",
	};
}

/** The label grey a figure at zero is drawn in on every page (coordinator rulings N23c / N28c: "flat"). */
export const FLAT = "#819abb";

/** The colour of a signed figure by its tone: the page's own green and red, the label grey at zero. */
export const toneColor = (tone: Tone, colors: { up: string; down: string }): string => (tone === "flat" ? FLAT : colors[tone]);

/**
 * The tone of a row that prints a dollar figure and its percentage in one colour (a pick's "+$24.00 +24.0%"): the
 * dollars' own tone, the percentage's when the dollars print as zero, flat when both do (zero is neutral: N23h).
 */
export function rowTone(dollars: number, pct: number): Tone {
	const t = toneOf(dollars, 2);
	return t === "flat" ? toneOf(pct, 1) : t;
}

/**
 * Newest pick first (coordinator decision D6): the first buy's date, latest first, then the ticker. Both phones put a
 * fresh buy at the top of the list and keep a top-up where it was (android ui/simulate/PaperPortfolio.kt:373
 * `positions = listOf(fresh) + positions`, 329-347; ios Simulate/PaperPortfolio.swift:302 `insert(..., at: 0)`), which is
 * this order: a top-up keeps its first buy's date.
 */
export function newestPicks<T extends { ticker: string; addedAt: number }>(positions: readonly T[]): T[] {
	return [...positions].sort((a, b) => b.addedAt - a.addedAt || a.ticker.localeCompare(b.ticker));
}

/**
 * Newest save first, then the symbol (D6; android ui/simulate/SimulateScreen.kt:325-336 "Newest save first, then by
 * symbol - a Set's order is nothing to show a user by"; ios Simulate/SimulateView.swift:220-233), leaving out the
 * companies in `exclude` (the ones already held: Saved staks lists what can still be bought).
 */
export function newestSaves<T extends { ticker: string; savedAt: number }>(saves: readonly T[], exclude: ReadonlySet<string> = new Set()): T[] {
	return saves.filter((s) => !exclude.has(s.ticker)).sort((a, b) => b.savedAt - a.savedAt || a.ticker.localeCompare(b.ticker));
}

/** "+$186" / "-$12": a whole-dollar move (the hero's move line, Simulate 2:648; the phones' signedWhole). */
export const wholeMove = (n: number) => `${n < 0 ? "-" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/**
 * The hero's move line (2:648 "▲ +$186 (+1.9%) this week"): one weekly figure everywhere (D4), the trailing week of the
 * account's value (useStanding().week). A fall reads ▼ (the phones' weekUp: android ui/simulate/SimulateScreen.kt:446).
 */
export function weekLine(change: number, pct: number): string {
	const tone = weekTone(change, pct);
	const arrow = tone === "flat" ? "" : tone === "down" ? "▼ " : "▲ ";
	// zero is neutral (N23h): a week that prints "$0 (0.0%)" carries no arrow and no plus sign
	const dollars = toneOf(change, 0) === "flat" ? "$0" : wholeMove(change);
	return `${arrow}${dollars} (${signedPctOrZero(pct)}) this week`;
}

/** The tone of the hero's move line: the whole dollars it prints, the percentage when they print "$0". */
export function weekTone(change: number, pct: number): Tone {
	const t = toneOf(change, 0);
	return t === "flat" ? toneOf(pct, 1) : t;
}

/** The hero's all-time line split where the rank begins, so the rank can be its own link (2:649). */
export type AllTimeLine = { lead: string; rank: string };

/**
 * "+$240.00 all time · #47 on the leaderboard" as its two parts. `rank` null (unranked: never traded) reads "Unranked",
 * the empty state's own word (2:2267).
 */
export function allTimeLine(allTime: string, rank: number | null): AllTimeLine {
	return { lead: `${allTime} all time · `, rank: rank === null ? "Unranked" : `#${rank} on the leaderboard` };
}

/** The frames' own all-time line (data.ts simulateHome.hero.allTime) split the same way. */
export function splitAllTime(line: string): AllTimeLine {
	const at = line.indexOf(" · ");
	return at < 0 ? { lead: line, rank: "" } : { lead: line.slice(0, at + 3), rank: line.slice(at + 3) };
}

/**
 * Simulate home's Leaderboard card (2:713-2:722): the three best leaders of the week with their places on the board,
 * then You's own row. When You passes a leader, the leaders below You move down a place (#1 Amara, #3 Tunde, #4 Zoe
 * with You at #2), so every place is printed once; You stays in its own highlighted row under them.
 */
export function cardRows(board: Board): BoardRow[] {
	return board.rows.filter((r) => !r.you).slice(0, 3);
}

/**
 * The Leaderboard page's list (2:938): the five leaders, then the rule and You's own row (2:965); when You beats a
 * leader, You's row (keeping its highlight) is IN the list at its place and the leaders below move down one (#5 You,
 * #6 Ivy C.), with no separate row under the rule. `apart` is You's separate row, null when You is in the list or
 * unranked (the page then draws the unranked row itself).
 */
export function pageRows(board: Board): { rows: BoardRow[]; apart: BoardRow | null } {
	return board.youInRows ? { rows: board.rows, apart: null } : { rows: board.rows, apart: board.you };
}

/** A position as the week reads it: its buys (guest top-ups carry them), else one buy of every share. */
export type WeekHolding = { shares: number; priceAtAdd: number | null; addedAt: number; price: number; lots?: Lot[] };

/**
 * Every buy of a position with its shares scaled to what is held now (a partial sale sells every buy in proportion):
 * the ledger's one accessor for a position's buys (live/ledger.ts heldLots; a position without lots is one buy of
 * everything held at its cost, or at today's price when it has none).
 */
export function buysOf(p: WeekHolding): Lot[] {
	return heldLots(p, p.price);
}

/**
 * A pick's return since it was picked, in percent, from its prices and exact shares: what the shares held are worth
 * against what they cost, buy by buy (coordinator ruling N29g). The portfolio's own `pct` divides two cent-rounded
 * dollar figures, which is right to a tenth of a point for a $100 stake and wrong for a small one: 0.0004 NVDA shares
 * bought at $98.50 and worth $0.05 read "+25.0%" where the prices say +24.0%.
 */
export function pickReturn(p: WeekHolding): number {
	const cost = buysOf(p).reduce((s, b) => s + b.shares * b.price, 0);
	const pct = cost > 0 ? ((p.shares * p.price) / cost - 1) * 100 : 0;
	return Number.isFinite(pct) ? pct : 0;
}

/**
 * The price of the FIRST buy: what "Picked May 8 at" and "Price then" state (coordinator ruling N23f; both phones keep
 * the pick line and the price then of the first buy through a top-up: android ui/simulate/PaperPortfolio.kt:333-347
 * copies only shares, stake and return). A position bought once has no lots and its `priceAtAdd` is that price; after a
 * top-up `priceAtAdd` is the blended cost and the lots remember each buy.
 */
export function firstPrice(p: Pick<WeekHolding, "shares" | "priceAtAdd" | "addedAt" | "lots">): number | null {
	const first = positionLots(p).reduce((a, l) => (l.at < a.at ? l : a));
	return first.price > 0 ? first.price : p.priceAtAdd;
}

/**
 * The blended cost of a share once a pick was topped up at another price, to be NAMED an average cost (N23f); null for
 * a pick bought once, or topped up at the price it was picked at (nothing to tell apart).
 */
export function blendedCost(p: WeekHolding): number | null {
	const first = firstPrice(p);
	const buys = buysOf(p);
	if (first === null || buys.length < 2 || !(p.shares > 0)) return null;
	const avg = buys.reduce((s, b) => s + b.shares * b.price, 0) / p.shares;
	return money(avg) === money(first) ? null : avg;
}

/**
 * The market's move over a pick's own days, buy by buy: each buy is set against the market since ITS day and weighs
 * what it cost (coordinator rulings N28d / N29i). A $25 top-up made today counts as even with the market for its $25
 * and leaves the May 8 buy's +20.8% where it was; charging the whole position with the market since the first buy
 * turned "+20.8% ahead" into "+16.0%". `marketSince(at)`: the market's move, in percent, from `at` to now.
 */
export function marketOverBuys(p: WeekHolding, marketSince: (at: number) => number): number {
	let cost = 0;
	let sum = 0;
	for (const b of buysOf(p)) {
		const c = b.shares * b.price;
		cost += c;
		sum += c * marketSince(b.at);
	}
	return cost > 0 ? sum / cost : marketSince(p.addedAt);
}

/**
 * A pick's move over the trailing week (Pick detail "This week", 2:897 / 2:899): every share held since the week began
 * moved from the week's first close to today's price; a share bought during the week moved from what it cost. So a pick
 * younger than a week shows its whole gain since the pick (the phones' fresh order "+$0.00", android
 * ui/simulate/PaperPortfolio.kt:369), and an older one its shares times the change since the week's first close (the
 * FOUNDATION recipe, FOUNDATION-API.md section 1). `week` is the company's 1W history (usePriceHistory); null with a
 * share older than the week and no history to read (nothing to show).
 */
export function weekMove(p: WeekHolding, week: Pick<PriceHistory, "times" | "closes"> | null, now: number): number | null {
	const weekStart = now - 7 * DAY;
	let move = 0;
	for (const lot of buysOf(p)) {
		if (lot.at > weekStart) {
			move += lot.shares * (p.price - lot.price);
			continue;
		}
		if (!week || week.closes.length === 0) return null;
		move += lot.shares * (p.price - closeAt(week, weekStart));
	}
	return round2(move);
}

/**
 * "vs the market" (2:900 / 2:902): the pick's return since it was picked against the market's over the same days (the
 * frame's NVDA: +24.0% - 3.2% = "+20.8% ahead"; the phones' TSLA +14.8% ahead, JPM -1.2% behind, MSFT -6.2% behind,
 * android ui/simulate/PickDetailScreen.kt:85-92). A difference under a twentieth of a point is "Even with the market",
 * the phones' line for a pick made today (android ui/simulate/PaperPortfolio.kt:365).
 */
export function versusMarket(pickPct: number, marketPct: number): { text: string; tone: Tone } {
	const d = pickPct - marketPct;
	// a difference that prints "0.0%" is even with the market: neither ahead nor behind (zero is neutral, N23h)
	if (!Number.isFinite(d) || toneOf(d, 1) === "flat") return { text: "Even with the market", tone: "flat" };
	// the word carries the direction: no minus sign beside "behind" (N30.8h, the hunt's C-15: "-6.2% behind" could be read
	// as ahead); the frame's positive form stays as the frame prints it ("+20.8% ahead", 2:902)
	return d > 0 ? { text: `${signedPct(d)} ahead`, tone: "up" } : { text: `${pct1(d)} behind`, tone: "down" };
}

/** A figure with no source (the pick page's dash; the My STAK cards use the same). */
export const NO_FIGURE = "—";

/**
 * The "vs the market" cell. A pick that was sold out (`closed`: its page stands under a receipt opened again, drawn from
 * the sale record) has no comparison to print: with no position the market's move read as zero, so the cell printed the
 * pick's whole return as its lead ("+24.0% ahead" under a reloaded "Position closed", where the page had read "+20.8%
 * ahead" before the sale: review of 2026-11-09). It prints the dash the week beside it prints; `tone` null draws it
 * white, as the frame draws a figure with no sign.
 */
export function marketCell(closed: boolean, pickPct: number, marketPct: number): { text: string; tone: Tone | null } {
	return closed ? { text: NO_FIGURE, tone: null } : versusMarket(pickPct, marketPct);
}

/**
 * A pick that was sold out, as its page shows it under a receipt opened again (a reload on "Position closed"): the
 * shares the closing sale sold, what they had cost and what they returned, from the sale record. Its buys are the
 * record's own (live/ledger.ts soldLots: each buy's part of the sale with its fill price and day; a record without them
 * is one buy on `addedAt` at the stake a share), so "Picked May 8 at" and "Price then" keep the FIRST buy's price for a
 * topped-up pick and the blended figure is named an average cost, as on the page of a pick still held (N23f; review of
 * 2026-11-09: the closed view took stake / shares, the blended cost, for the pick-day price).
 */
export function closedPick(sold: SoldEntry): Omit<PositionRow, "quote"> {
	const some = sold.shares > 0;
	return {
		ticker: sold.ticker,
		shares: sold.shares,
		priceAtAdd: some ? sold.stake / sold.shares : null,
		addedAt: sold.addedAt ?? sold.soldAt,
		lots: soldLots(sold),
		price: some ? sold.proceeds / sold.shares : 0,
		value: sold.proceeds,
		stake: sold.stake,
		gain: sold.pnl,
		pct: sold.stake > 0 ? (sold.pnl / sold.stake) * 100 : 0,
		today: 0,
	};
}

/**
 * A stake as the copy names it: whole dollars read "$100", anything else "$33.50", the phones' cost-basis label (android
 * ui/simulate/PaperPortfolio.kt:303-305 stakeLabel; coordinator rulings N23i / N27l). A part-sold stake keeps its cents
 * ("$34 stake" stood for $33.50 and no longer added up with its gain), and no stake reads "$0": under a dollar it is
 * its cents, under a cent it says so.
 */
export function stakeText(n: number): string {
	const cents = Math.round(Math.abs(n) * 100);
	if (cents === 0) return n !== 0 && Number.isFinite(n) ? "under $0.01" : "$0";
	return cents % 100 === 0 ? `$${(cents / 100).toLocaleString("en-US")}` : money(cents / 100);
}

/**
 * The pick hero's caption (2:878 "That is up 24.0% on a $100 paper stake"; android ui/simulate/PickDetailScreen.kt:203).
 * Zero is neutral (N23h: "That is up 0.0%" was on screen): a pick that has not moved says so, and a move too small to
 * print a tenth of a percent does not print "0.0%" beside a gain. `pct`: the pick's return (pickReturn), `gain` its
 * dollars, `stake` what it cost.
 */
export function heroCaption(pct: number, gain: number, stake: number): string {
	const on = `on a ${stakeText(stake)} paper stake`;
	const tone = toneOf(pct, 1);
	if (tone !== "flat") return `That is ${tone === "up" ? "up" : "down"} ${pct1(pct)} ${on}`;
	const dollars = toneOf(gain, 2);
	return dollars === "flat" ? `No move yet ${on}` : `That is ${dollars === "up" ? "up" : "down"} less than 0.1% ${on}`;
}

/**
 * What a sale returns, as the position card says it (2:919 "the $100 stake plus the $24 gain"): the stake and the gain
 * as printed add up to the value beside them (N23i: "$38 stake plus the $6 gain" stood beside $43.49), a loss is
 * subtracted, and a pick that has not moved has neither (zero is neutral).
 */
export function stakeAndGain(stake: number, gain: number): string {
	const tone = toneOf(gain, 2);
	if (tone === "flat") return `the ${stakeText(stake)} stake back, with no gain or loss`;
	return tone === "up"
		? `the ${stakeText(stake)} stake plus the ${stakeText(gain)} gain, locked in for good`
		: `the ${stakeText(stake)} stake minus the ${stakeText(gain)} loss, locked in for good`;
}

/**
 * What a sell sheet's portion will do, by the ledger's own arithmetic (live/ledger.ts paperSale, the function the
 * store's sale runs: coordinator rulings N23e / N28e). The sheets multiplied the position's value by the portion,
 * which is not what the ledger credits: half of the persona's TSLA read "$59.01 for 0.2374 shares" and returned $59.02
 * for 0.2375. `held` is the exact quantity held (a guest's eight decimals), `frac` the portion (0 to 1).
 * `account`: a signed-in account's sale is booked in the account's own quantities (the quantity to four decimals, never
 * more than is held, and the cash that quantity is worth at the price): live/ledger.ts accountSale, the one sum the
 * store's sell runs for an account (follow-up F2: the preview no longer mirrors it by hand).
 */
export function salePreview(held: number, price: number, frac: number, account = false): PaperSale {
	return account ? accountSale(held, held * frac, price) : paperSale(held, held * frac, price);
}

/** The words of a SOLD · REALIZED row (2:841 "profit banked" / "loss realized"); a sale at what was paid is neither. */
export function soldWords(pnl: number): string {
	const tone = toneOf(pnl, 2);
	return tone === "flat" ? "broke even" : tone === "up" ? "profit banked" : "loss realized";
}

/**
 * Why the store refused an order, or null when the error is a real failure to fill (a network error, a write that did
 * not land): only that ends on the failed-order sheet's "Prices are refreshing" (N30.3a). `refusalOf` reads the store's
 * typed refusal; the words the store threw before it (store.ts: "insufficient", "invalid", "no position") are read the
 * same way, so a refusal is never taken for a failure.
 */
export function refusalFrom(error: unknown): OrderRefusal | null {
	const typed = refusalOf(error);
	if (typed) return typed;
	const word = error instanceof Error ? error.message : "";
	if (word === "insufficient" || word === "too-small" || word === "no-price" || word === "nothing-held") return word;
	if (word === "invalid") return "too-small";
	if (word === "no position") return "nothing-held";
	return null;
}

/**
 * The Portfolio's pick count (2:743 "12 picks"): the listed positions plus the frames' six unlisted picks the guest
 * persona's ledger holds as one amount (live/ledger.ts personaOffBook; FOUNDATION-API.md section 4), so the persona keeps
 * reading "12 picks" after the showcase. "1 pick" for one (android ui/simulate/PaperPortfolio.kt:124-125).
 */
export function pickCount(listed: number, offBookPicks: number | null | undefined): string {
	const n = listed + (offBookPicks ?? 0);
	return n === 1 ? "1 pick" : `${n} picks`;
}

/**
 * The line of an empty Saved staks card, true for the person reading it (N30.8i; the hunt's C-11b: a guest whose one save
 * was the pick they had just bought read "Save a company ... and it shows up here"). The card lists saved companies that
 * can still be bought: `saves` is how many companies are saved at all, `notHeld` how many of them are not held yet (the
 * card is empty although some are when none of those has a price to buy at). With nothing saved it is the card's own
 * invitation (the phones' empty card: android ui/simulate/SimulateScreen.kt:206-213 "Nothing saved yet").
 * `deckDone`: today's deck is finished, so the line does not send its reader into it (review of 2026-11-09, follow-up
 * S2; N30.8l names "no control that invites into a finished deck"): it invites a save without naming the deck, and the
 * card prints the site's one sentence for a finished deck where its link to Discover stood (SimulateHome.tsx).
 */
export function savedEmptyLine(saves: number, notHeld: number, deckDone = false): string {
	const invite = deckDone ? "Save a company and it shows up here, ready to buy." : "Save a company from today’s deck and it shows up here, ready to buy.";
	if (!(saves > 0)) return invite;
	if (!(notHeld > 0)) return `${saves === 1 ? "The company you saved is" : "Every company you saved is"} already one of your picks. ${invite.replace("Save a company", "Save another")}`;
	return notHeld === 1 ? "Your saved company has no price right now, so it cannot be bought here yet." : "None of your saved companies has a price right now, so none can be bought here yet.";
}

/**
 * Today's deck as the person's ledger stores it, in the shape Home reads (home/copy.ts DeckState, for cardsLeft); null
 * when no deck was opened today. It reads what is stored and builds nothing: a page that only needs to know whether
 * today's deck is finished must not create one (live/deck.ts useDeck persists the deck it builds).
 */
export function deckStateOf(
	progress: { date: string; order: readonly string[]; index: number; saved: readonly string[]; passed: readonly string[]; bought: readonly string[] } | null | undefined,
	dateKey: string,
): { total: number; index: number; decided: number; done: boolean } | null {
	if (!progress || progress.date !== dateKey || progress.order.length === 0) return null;
	const index = Math.min(progress.index, progress.order.length);
	const decided = new Set([...progress.saved, ...progress.passed, ...progress.bought]).size;
	return { total: progress.order.length, index, decided, done: index >= progress.order.length };
}

/** Six decimals: the precision a typed amount or portion is kept at in the address (typedForAddress). */
export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * What a ticket's Custom field reports for the address (the choice lives there through a reload: N27j / N29f). Only an
 * order the ticket itself would take is written (`ok`: the sheet's own check on what was typed), to six decimals; for
 * anything else the address keeps `fallback`, the chip the field replaced, as it does for an emptied field (review of
 * 2026-11-09: a refused 0.001% sale left "?portion=0.00001", which a reload showed as a Custom field holding "0", and
 * 99.999% left the float "?portion=0.9999899999999999").
 */
export function typedForAddress(typed: number | null, ok: boolean, fallback: number): number {
	return ok && typed !== null && Number.isFinite(typed) && typed > 0 ? round6(typed) : fallback;
}

/**
 * A sell sheet opened on a portion already chosen (Try again after a failed sale returns to the sheet "with the same
 * portion"; a reload): its chip when it is one of the sheet's, else the Custom field holding it as a percentage; with
 * none (or an unusable one), the sheet's own default chip. The percentage keeps the four decimals the address's six
 * stand for (typedForAddress), so every portion a sheet wrote comes back as the share that was typed: two decimals
 * turned a typed 0.004% into "0".
 */
export function startPortion(portions: readonly number[], initial: number | undefined, fallback: number): { chip: number; custom: string | null } {
	if (initial === undefined || !Number.isFinite(initial) || !(initial > 0)) return { chip: fallback, custom: null };
	if (portions.includes(initial)) return { chip: initial, custom: null };
	return { chip: fallback, custom: String(Math.round(Math.min(1, initial) * 1e6) / 1e4) };
}

/**
 * Whether a sell sheet draws its sale line ("You get back $X for N shares" on the pick page, "Returning $X to your cash"
 * on the Portfolio). While the sheet says why the sale cannot be placed (a share above 100%, a sale that rounds to
 * nothing, the store's own refusal) the line is not drawn, in both sheets and at every size: they printed "You get back
 * $0.00 for 0.0000 shares" / "Returning $0.00 to your cash" under "That sale rounds to nothing" (the SIMULATE polish
 * round's open issue; coordinator ruling N36.3c), where the buy ticket prints its reason alone (sheets.tsx
 * AddConfirmSheet `line`, follow-up S3). An empty Custom field has asked for nothing yet: no reason, so the line of a
 * sale of nothing stays, as the buy ticket's "You get 0.0000 shares" does.
 */
export const saleLine = (over: boolean, why: OrderRefusal | null): boolean => !over && why === null;
