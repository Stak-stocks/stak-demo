import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { type CSSProperties, type ReactNode, type RefCallback, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { colPlus, DensityImg, useSizeClass } from "@/app/FitCanvas";
import { cardsLeft, PICKS_DONE } from "@/app/home/copy";
import {
	changeLineOrFlat,
	changeShortOrFlat,
	companyInitial,
	companyName,
	type Fill,
	hasDemoQuote,
	hasPrice,
	money,
	normalizeTicker,
	type OrderRefusal,
	signedMoneyOrZero,
	signedPctOrZero,
	type Tone,
	toneOf,
	useApiHealthState,
	usePortfolio,
	usePortfolioValueHistory,
	usePricesOnScreen,
	useQuotes,
	useShowcase,
	useStanding,
	wholeMoney,
} from "@/app/live";
import { PrimaryButton } from "@/app/ui/Button";
import { cn, getLocalDateKey } from "@/lib/utils";
import { SA } from "./assets";
import { cashAvailable, simulateEmpty, simulateHome, stocks, type Stock } from "./data";
import {
	type AllTimeLine,
	allTimeLine,
	cardRows,
	deckStateOf,
	newestPicks,
	newestSaves,
	pickReturn,
	priceCopy,
	refusalFrom,
	round6,
	rowTone,
	savedEmptyLine,
	splitAllTime,
	toneColor,
	weekLine,
	weekTone,
} from "./figures";
import { replacesLeftReceipt, tabReceipts } from "./back";
import { type ChartLine, DEFAULT_RANGE, lineFor, RANGES, type Range } from "./history";
import { withMotion } from "./motion";
import { AddConfirmSheet, AddSuccessSheet, BuyFailedSheet } from "./sheets";
import { Avatar, box, Card, CardTitle, Eyebrow, GREEN, type Palette, RED, RED_ROW, SmallBuyButton, type Widths } from "./ui";
import { useTradeRequest } from "./useTradeRequest";

export type SimulateHomeSearch = {
	variant?: "alt";
	state?: "empty";
	modal?: "add-confirm" | "add-success" | "buy-failed";
	symbol?: string;
	amount?: number;
};

/** A sheet this page opened as its own history entry carries this mark, so closing it can step back to the page. */
declare module "@tanstack/history" {
	interface HistoryState {
		simSheet?: boolean;
		simSheetPath?: string;
	}
}

/** 2:634 "Desktop · Simulate home" (canonical) and 2:970 (alternate palette / spacing, ?variant=alt). */
const CANON: Palette = { card: "#181f30", inner: "#181f30" };
const ALT: Palette = { card: "#0e1a36", inner: "#12203e" };

/**
 * The frames' two columns: 744 cards on the left (Portfolio hero, Saved staks, Your picks) and 360 on the right (Cash,
 * How paper trading works, Leaderboard), `gap` apart (22 canonical, 40 alternate). Wider than 1440 the row grows with
 * the window; every left card takes the same 744 / 1104 share of it, so the three line up at any width, and the right
 * column fills the rest up to the frame's right margin.
 */
const leftWidth = (gap: number) => `calc((100% - ${gap}px) * 744 / 1104)`;

/**
 * Figma's text boxes for the frames' own figures (2:634, 2:970 and their sheet frames), by type style (ui.tsx `box`):
 * the saved rows' figures and the picks' pairs are right-aligned, the letters centred, so a box a pixel off moves them.
 */
const HW = {
	/** Geist Medium 13: the saved rows' prices, the picks' gains */
	figure: { "$28.40": 45, "$918.20": 50, "$41.90": 42, "+$24.00": 52, "+$18.00": 49, "-$3.00": 42 },
	/** Geist Regular 11: the saved rows' moves */
	move: { "▲ 1.1% today": 63, "▼ 0.4% today": 68, "▲ 2.2% today": 69 },
	/** Geist Medium 12: the leaderboard's returns */
	ret: { "+9.4%": 34, "+7.8%": 32, "+6.5%": 35, "+1.9%": 32 },
	/** Geist Regular 12: the picks' returns */
	pct: { "+24.0%": 41, "+18.0%": 39, "-3.0%": 33 },
	/** Geist Medium 13: the saved rows' letters, centred in their 36 tiles */
	letter: { P: 9, C: 10, H: 10 },
	/** Geist Medium 12: the cards' right-hand links */
	link: { "All saved staks ›": 92, "Open portfolio ›": 88 },
	/** Geist Medium 12: the hero's move line (2:648) */
	today: { "▲ +$186 (+1.9%) this week": 147 },
} satisfies Record<string, Widths>;

/**
 * A sheet's stock line for a computed state: the company's ONE display name (live/catalog.ts companyName, the name its
 * stock page and its My STAK card carry) on the ticket and on the receipt alike (N30.8k, the hunt's C-10: the frames'
 * "NVIDIA Corp." on the Sell sheet and "NVIDIA Corp" on the receipt that follows it are two frames' strings, kept only
 * where a frame is on show: the untouched showcase passes data.ts `stocks` itself), today's price, and the day's move
 * printed flat when it is zero (zero is neutral, N28d: the sheets colour it by the figure as printed).
 */
export function stockFor(symbol: string, price: number, pct: number): Stock {
	const name = companyName(symbol);
	return { name, nameConfirm: name, price, pct: changeShortOrFlat(pct), up: pct >= 0, initial: stocks[symbol]?.initial ?? companyInitial(symbol) };
}

/** The range buttons' Figma widths (2:634: each label box is its text width rounded up, plus 10px a side). */
const RANGE_WIDTH: Record<Range, number> = { "1D": 33, "1W": 36, "1M": 35, "1Y": 31 };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The order that just filled, and the cash the receipt shows after it. */
type Receipt = { fill: Fill; cash: number };

/** `tone`: the colour of a row's signed figures (figures.ts toneColor): the frames' green and red, the label grey at zero. */
type SavedRow = { symbol: string; name: string; initial: string; price: string; change: string; tone: Tone };
type PickRow = { symbol: string; gain: string; pct: string; tone: Tone };
/** A row of the Leaderboard card: "#1  Amara" and "+9.4%" (2:714 ...). */
type BoardLine = { label: string; pct: string; tone: Tone };

/** A frame row's own colour: the frames draw a rise green and a fall red (they print no zero). */
const frameTone = (up: boolean): Tone => (up ? "up" : "down");

/** Everything the page and its sheets draw from the account, so a receipt can keep what its sheet confirmed. */
type View = {
	showcase: boolean;
	value: string;
	/** the hero's move line (2:648): the account's trailing week, one figure everywhere (D4) */
	today: string;
	todayTone: Tone;
	/** the hero's all-time line (2:649), its rank a link to the Leaderboard */
	allTime: AllTimeLine;
	cash: number;
	savedList: SavedRow[];
	pickList: PickRow[];
	/** the Leaderboard card's three leaders (2:714-2:719) */
	board: BoardLine[];
	youLabel: string;
	you: string;
	youTone: Tone;
	stock: Stock;
	price: number;
	/** the never-traded page (2:2255) and the value its hero prints: kept under a first order's receipt like the rest */
	empty: boolean;
	emptyValue: number;
	/** the line of an empty Saved staks card (figures.ts savedEmptyLine) */
	savedEmpty: string;
	/** today's deck is finished: the empty Saved staks card offers no way into it (the never-traded stage's own rule) */
	deckDone: boolean;
	/** the page's sentences about prices, true for the visitor (figures.ts priceCopy, N30.8g) */
	copy: ReturnType<typeof priceCopy>;
};

export function SimulateHome({ search: address }: { search: SimulateHomeSearch }) {
	const navigate = useNavigate();
	const router = useRouter();
	// The receipt's own address, kept while "View in My STAK" turns the receipt's entry into the page under it (see
	// viewInMyStak): the receipt and the page stay on screen exactly as they were until My STAK takes over
	const [leaving, setLeaving] = useState<SimulateHomeSearch | null>(null);
	const search = leaving ?? address;
	const pf = usePortfolio();
	const live = pf.live;
	/** the untouched demo persona shows the frames' own figures (see live/showcase.ts) */
	const showcase = useShowcase();
	const alt = search.variant === "alt";
	const p = alt ? ALT : CANON;
	const colGap = alt ? 40 : 22;
	// below 1024 the page is ONE column in the phone frame's section order (see the return below)
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";

	// The prototype NAVIGATEs to a sheet (phone 1:4319 Buy -> 1:4609 Add confirm), so a sheet opened here is its own
	// history entry: the browser's Back closes it onto the page. Its next states (filled, failed, try again) replace
	// that entry, and closing steps back to the page it opened from (or, opened from a link, replaces it with the page).
	// A sheet is drawn over the untouched page (2:1311 et al.), so none of these moves the page: they keep the scroll
	// position (`resetScroll: false`, as the app's other same-page changes do), and the history steps between the page
	// and its sheets keep it too (below).
	const pushed = useLocation({ select: (l) => l.state.simSheet === true && l.state.simSheetPath === "/simulate" });
	// This history entry's own key (the router's, kept in the entry's state through a reload), read only while the router's
	// location is still this page on the same sheet: during a navigation away the location moves on before the page's own
	// address does (PickDetail.tsx explains the guard). back.ts lists a buy receipt's entry by it once the app has left it.
	const entryNow = useLocation({
		select: (l) => (l.pathname.replace(/\/$/, "") === "/simulate" && (l.search as SimulateHomeSearch).modal === address.modal ? (l.state.__TSR_key ?? l.state.key ?? null) : false),
	});
	const [settledKey, setSettledKey] = useState<string | undefined>(undefined);
	const entryKey = entryNow === false ? settledKey : (entryNow ?? undefined);
	if (entryKey !== settledKey) setSettledKey(entryKey);
	// The buy receipt the app has already LEFT (coordinator ruling N36.3b; the SIMULATE polish round's open issue 2): Keep
	// exploring steps back from a ticket opened by a Buy pill, which leaves the receipt's entry ahead in the tab's history,
	// and the browser's Forward drew "Order filled" again for an order placed long before. Such an entry gives its place to
	// the page, at once (back.ts replacesLeftReceipt: the list the pick page keeps for its sale receipts), whichever history
	// step lands on it (the browser's Back too, after another link left the receipt). A reload on the receipt still shows
	// it. While "View in My STAK" turns the receipt's entry into the page (`leaving`) the receipt stays on screen as before.
	const leftReceipt = replacesLeftReceipt({ receipt: address.modal === "add-success" && !leaving, left: tabReceipts().wasLeft(entryKey) });
	const receiptEntry = address.modal === "add-success" && !leaving && !leftReceipt ? entryKey : undefined;
	useEffect(() => {
		if (!receiptEntry) return;
		tabReceipts().shown(receiptEntry);
		return () => tabReceipts().left(receiptEntry);
	}, [receiptEntry]);
	useEffect(() => {
		if (leftReceipt) void navigate({ to: "/simulate", search: { variant: address.variant }, replace: true, resetScroll: false, viewTransition: false });
	}, [leftReceipt, address.variant, navigate]);
	// the control the open sheet was opened from, by name (focusName), and its place among the Saved staks Buy pills
	// (-1: not one of them): see the focus effect below
	const sheetOpener = useRef<string | null>(null);
	const sheetOpenerRow = useRef(-1);
	const openSheet = (next: SimulateHomeSearch) => {
		sheetOpener.current = pageControlName(document.activeElement);
		sheetOpenerRow.current = savedPills().indexOf(document.activeElement as HTMLElement);
		return navigate({
			to: "/simulate",
			search: { variant: search.variant, ...next },
			resetScroll: false,
			state: (prev) => ({ ...prev, simSheet: true, simSheetPath: "/simulate" }),
		});
	};
	const swapSheet = (next: SimulateHomeSearch) =>
		navigate({ to: "/simulate", search: { variant: search.variant, ...next }, replace: true, resetScroll: false, state: (prev) => ({ ...prev, simSheet: pushed }) });
	const closeSheet = () =>
		pushed ? router.history.back() : navigate({ to: "/simulate", search: { variant: search.variant }, replace: true, resetScroll: false });
	// "View in My STAK" (2:1726): leaving through the receipt takes its place in the history, so Back from My STAK returns
	// to Simulate and never to the receipt. A ticket opened from a Buy pill is its own entry above the page: My STAK
	// replaces it. A ticket opened by its ADDRESS (a pasted link, a reload of one) has no page entry below it: its entry
	// first becomes the page (no sheet), then My STAK is a new entry above (review of 2026-11-09: a plain push left the
	// receipt's address below, and Back reopened "Order filled" for an order placed long before). The first step is not
	// the exit's transition: it is Instant (src/main.tsx reads <html data-stak-motion> when the entry is replaced, as for
	// back.ts useReceiptExit's step) and the receipt stays on screen through it (`leaving`), so the prototype's one
	// push-left still starts from the receipt. The two history writes are awaited apart: written in one tick the
	// router's history would fold them into a single push.
	const viewInMyStak = async () => {
		if (pushed) return navigate({ to: "/my-stak", replace: true });
		const root = document.documentElement;
		const motion = root.dataset.stakMotion;
		setLeaving(address);
		root.dataset.stakMotion = "instant";
		try {
			await navigate({ to: "/simulate", search: { variant: address.variant }, replace: true, resetScroll: false, viewTransition: false });
		} finally {
			if (motion) root.dataset.stakMotion = motion;
			else delete root.dataset.stakMotion;
		}
		return navigate({ to: "/my-stak" }).finally(() => setLeaving(null));
	};
	// The store's own refusal of an order the ticket had let through (the ledger changed under it: another tab spent the
	// cash): the ticket stays and says why (live/orders.ts refusalLine), never the failed-order sheet (N30.3a)
	const [refused, setRefused] = useState<OrderRefusal | null>(null);
	// The amount chosen on the ticket lives in the address, as Try again's does, so a reload with the ticket open keeps
	// it (coordinator ruling N27j; the hunt's ST-18: a reload silently turned a chosen $50 into the default $25 and
	// Confirm bought $25). The entry is replaced, Instant, and keeps its pushed mark, like every other swap of the sheet.
	const noteAmount = (amount: number) => {
		setRefused(null);
		if (search.modal !== "add-confirm" || amount === search.amount) return;
		void navigate({
			to: "/simulate",
			search: { variant: search.variant, modal: "add-confirm", symbol: search.symbol, amount },
			replace: true,
			resetScroll: false,
			viewTransition: false,
			state: (prev) => ({ ...prev, simSheet: pushed }),
		});
	};
	// A step through the history that stays on this page (the sheet's Back / Not now / Keep exploring step back, and the
	// browser's own Back and Forward between the page and a sheet) keeps the page where it was scrolled as well. The
	// router answers a history step with a scroll to the top unless its `_scroll.next` flag is off: the flag a
	// navigation's `resetScroll: false` sets, read when the step's entry renders. A history step has no such option, so
	// the flag is set here, while the step is under way (the router renders it after this event).
	useEffect(() => {
		const here = window.location.pathname;
		const onPop = () => {
			if (window.location.pathname === here) router._scroll.next = false;
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, [router]);
	// Focus goes back to the control the sheet was opened from. The shared Sheet refocuses that element as it closes when
	// it is still in the page; when the window crossed 1024 while the sheet was open (a turned tablet), the arrangement
	// switch replaced it with its twin in the other arrangement, and the twin takes the focus instead of <body>. This runs
	// after the Sheet's own cleanup (React runs a commit's unmount cleanups before its effects), so it leaves alone a
	// focus the Sheet gave back. A Buy pill whose company was just bought is gone with its row (the company is held now,
	// so it leaves Saved staks): focus then goes to the pill now in that row's place, the last one when the list got
	// shorter, or the card's "All saved staks ›" when no saved company is left (savedStandIn), so a keyboard or
	// screen-reader user carries on where they were working instead of starting again at the top of the page (WCAG 2.4.3).
	useEffect(() => {
		if (search.modal) return;
		const name = sheetOpener.current;
		const row = sheetOpenerRow.current;
		sheetOpener.current = null;
		sheetOpenerRow.current = -1;
		const active = document.activeElement;
		if (name === null || (active && active !== document.body)) return;
		(findControl(name) ?? (row >= 0 ? savedStandIn(row) : undefined))?.focus();
	}, [search.modal]);
	// the browser's own Back closes a sheet Instant, as the sheet's Back does (unless a sheet button already chose a motion)
	useEffect(() => {
		if (!search.modal) return;
		const onPop = () => {
			if (!document.documentElement.dataset.stakMotion) void withMotion("instant", () => undefined);
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, [search.modal]);

	const symbol = normalizeTicker(search.symbol ?? (alt ? "PLTR" : "NVDA"));
	const trade = useTradeRequest(`${symbol}:${search.modal ?? "page"}`);
	const d = simulateHome;
	const [range, setRange] = useState<Range>(DEFAULT_RANGE);
	// Every range draws the account's own value line (D3: the FOUNDATION's value history, the API's closes when it
	// answers, the demo series otherwise); the untouched showcase keeps Figma's line on the frame's 1M (2:651, D7)
	const valueHistory = usePortfolioValueHistory(range, { enabled: !(showcase && range === DEFAULT_RANGE) });
	// One weekly figure and one rank everywhere (D4): the hero's move line, its rank, the Leaderboard card's You row and
	// the Leaderboard page read the same standing
	const standing = useStanding();

	// Saved staks: saved companies not yet held, the newest save first (D6; the phones' order, figures.ts newestSaves),
	// so a company saved moments ago (the deck's "Practice buy your saves") leads with its Buy pill
	const held = useMemo(() => new Set(pf.positions.map((x) => x.ticker)), [pf.positions]);
	const candidates = useMemo(() => newestSaves(live.saves, held).map((s) => s.ticker), [live.saves, held]);
	const quotes = useQuotes([...candidates, symbol]);
	const savedRows = useMemo(
		() =>
			candidates
				.map((t) => ({ symbol: t, quote: quotes[t] }))
				.filter((r) => r.quote)
				.slice(0, 3),
		[candidates, quotes],
	);
	// Your picks: the newest pick first (D6; a fresh buy lands at the top, as on both phones), three of them
	const picks = useMemo(() => newestPicks(pf.positions).slice(0, 3), [pf.positions]);
	const savedList: SavedRow[] = showcase
		? d.saved.rows.map((r) => ({ symbol: r.symbol, name: stocks[r.symbol]?.name ?? companyName(r.symbol), initial: stocks[r.symbol]?.initial ?? companyInitial(r.symbol), price: r.price, change: r.change, tone: frameTone(r.up) }))
		: savedRows.map((r) => ({
				symbol: r.symbol,
				// the company's one display name (N30.8k); the frames' own names stay with the frames' rows above
				name: companyName(r.symbol),
				initial: stocks[r.symbol]?.initial ?? companyInitial(r.symbol),
				price: money(r.quote!.price),
				// zero is neutral (N23h): a day that prints "0.0%" has no arrow and takes the label grey
				change: changeLineOrFlat(r.quote!.changePercent),
				tone: toneOf(r.quote!.changePercent, 1),
			}));
	const pickList: PickRow[] = showcase
		? d.picks.rows.map((r) => ({ symbol: r.symbol, gain: r.gain, pct: r.pct, tone: frameTone(r.up) }))
		: picks.map((r) => {
				// the return from the pick's prices and exact shares, never from its cent-rounded dollars (N29g)
				const ret = pickReturn(r);
				return { symbol: r.ticker, gain: signedMoneyOrZero(r.gain), pct: signedPctOrZero(ret), tone: rowTone(r.gain, ret) };
			});
	const cash = showcase ? cashAvailable : pf.cash;

	const price = (showcase ? stocks[symbol]?.price : undefined) ?? quotes[symbol]?.price ?? pf.quotes[symbol]?.price ?? stocks[symbol]?.price ?? 0;
	const pct = quotes[symbol]?.changePercent ?? pf.quotes[symbol]?.changePercent ?? 0;
	const stock = showcase && stocks[symbol] ? stocks[symbol] : stockFor(symbol, price, pct);
	const amount = search.amount ?? 25;
	// the order that actually filled: the receipt shows its quantity and cost, and the cash the confirm sheet showed
	// less that cost (2:1311 $8,800.00 -> 2:1589 $8,775.00), so the receipt never contradicts the sheet it confirms
	const [receipt, setReceipt] = useState<Receipt | null>(null);
	const filled = receipt?.fill.ticker === symbol ? receipt : null;

	const week = standing.week;
	// which prices are on screen (live/prices.ts): the frames' "Prices are real ..." sentences stand in the untouched
	// showcase and with live quotes; with demo prices on screen the page says so (N30.8g)
	const prices = usePricesOnScreen();
	// The never-traded state (2:2255) is for an account with nothing held AND nothing ever sold: one that sold out keeps
	// its own value, all-time result and rank, and the page with its Saved staks Buy pills (the phones' empty hero reads
	// the live value too: android ui/simulate/SimulateScreen.kt:193-203, 398; ios Simulate/SimulateView.swift:100-109).
	const neverTraded = live.ready && pf.positions.length === 0 && pf.sold.length === 0;
	// today's deck, read from what the person's ledger stores of it (no deck is built from here): once it is finished
	// neither the never-traded page nor the empty Saved staks card offers a way into it (N30.8l; follow-up S2)
	const deckToday = deckStateOf(live.deck, getLocalDateKey());
	const deckDone = deckToday !== null && cardsLeft(deckToday) === 0;
	const current: View = {
		showcase,
		value: showcase ? d.hero.value : money(pf.value),
		// zero is neutral on every computed figure of the page (coordinator ruling N23h: no "▲ +$0", no green "+0.0%")
		today: showcase ? d.hero.week : weekLine(week.change, week.pct),
		todayTone: showcase ? "up" : weekTone(week.change, week.pct),
		allTime: showcase ? splitAllTime(d.hero.allTime) : allTimeLine(signedMoneyOrZero(pf.allTime), week.rank),
		cash,
		savedList,
		pickList,
		// the week's three best leaders with their places on the board: they move down a place for every one You passes
		board: showcase
			? d.leaderboard.rows.map(([label, pct]) => ({ label, pct, tone: "up" as const }))
			: cardRows(standing.board("week")).map((r) => ({ label: `#${r.rank}  ${r.short}`, pct: signedPctOrZero(r.returnPct), tone: toneOf(r.returnPct, 1) })),
		youLabel: showcase ? d.leaderboard.you[0] : `${week.rank === null ? "—" : `#${week.rank}`}  You`,
		you: showcase ? d.leaderboard.you[1] : signedPctOrZero(week.pct),
		youTone: showcase ? "up" : toneOf(week.pct, 1),
		stock,
		price,
		empty: neverTraded,
		emptyValue: pf.value,
		savedEmpty: savedEmptyLine(live.saves.length, candidates.length, deckDone),
		deckDone,
		copy: priceCopy(prices),
	};
	// The page as it was when Confirm was pressed stays under the confirm sheet until its result replaces it, under the
	// receipt, and under a failure and its retry: 2:1311 -> 2:1589 (and 2:1863) morph over the untouched page. The trade
	// ends the showcase and moves the ledger at once, and the router takes the smart animate's old image only after that
	// render (in the same frame, once the order's own work is done), so the confirm sheet and the page under it keep
	// `frozen` from the press on: the sheet-to-receipt morph starts from the sheet and the page as they were when Confirm
	// was pressed. The page moves on to the account's figures as soon as the sheet is closed (`frozen` itself is dropped
	// by the effect, after that render).
	const [frozen, setFrozen] = useState<View | null>(null);
	useEffect(() => {
		if (!search.modal) setFrozen(null);
	}, [search.modal]);
	const view = search.modal && frozen ? frozen : current;
	// below 1024: whether the Saved staks rows keep Figma's one line, re-measured when their strings change
	const savedFit = useSavedRowsFit(view.savedList.map((r) => `${r.symbol} ${r.name} ${r.price} ${r.change}`).join("|"));

	const confirmBuy = async (dollars: number) => {
		const request = trade.begin();
		if (!request) return;
		const shown = current;
		setFrozen(shown);
		try {
			const result = await live.actions.buy(symbol, dollars, shown.price);
			if (!request.isCurrent()) return;
			setReceipt({ fill: result, cash: round2(shown.cash - result.cost) });
			await swapSheet({ modal: "add-success", symbol, amount: result.cost });
		} catch (error) {
			if (!request.isCurrent()) return;
			// A REFUSED order (live/orders.ts: under the minimum, more than the cash, no price) is not a failed one: nothing
			// was refreshing, and Try again could never work (the hunt's ST-13). The ticket stays on the amount and says why,
			// in the words it uses for its own check; "Couldn't place that trade · Prices are refreshing" (2:1863) is for a
			// real failure to fill only (coordinator rulings N27i / N30.3a)
			const reason = refusalFrom(error);
			if (reason) {
				setFrozen(null);
				setRefused(reason);
			} else await swapSheet({ modal: "buy-failed", symbol, amount: round6(dollars) });
		} finally {
			request.finish();
		}
	};

	// A ticket needs a price to fill at. A company without one (no demo quote while the STAK API is down: 256 of the
	// catalog's companies) gets NO ticket (N30.8j, the hunt's VIS-02: "/simulate?modal=add-confirm&symbol=SNAP" drew
	// "$0.00 today ▲ 0.0%" in green over "0.0000 shares" and a dead Confirm): the sheet is not drawn without a price, and
	// once no price can come (the health probe has answered and the API is down, or the frames price the company
	// themselves) the address drops the sheet, at once, like the Portfolio's stale sell sheet.
	const health = useApiHealthState();
	const unpriced = search.modal === "add-confirm" && !hasPrice(view.price);
	const dropTicket = unpriced && live.ready && health.settled && (!health.healthy || hasDemoQuote(symbol));
	useEffect(() => {
		if (dropTicket) void navigate({ to: "/simulate", search: { variant: search.variant }, replace: true, resetScroll: false, viewTransition: false });
	}, [dropTicket, search.variant, navigate]);

	// The ?state=empty preview is the frame itself (2:2255): the $10,000 budget and the invitation alone.
	if (search.state === "empty") return <SimulateEmpty value={pf.budget} />;

	const youBox = box(HW.ret[view.you as keyof typeof HW.ret]);

	// The page's cards. From 1024 up they sit in the frames' two columns, element for element as approved; below 1024
	// the same cards (compact variants of their rows only where a row must reflow) are ONE column (see the return).
	const hero = (
		<PortfolioHero
			palette={p}
			width={compact ? "100%" : leftWidth(colGap)}
			compact={compact}
			value={view.value}
			today={view.today}
			todayTone={view.todayTone}
			allTime={view.allTime}
			range={range}
			onRange={setRange}
			line={view.showcase && range === DEFAULT_RANGE ? { kind: "figma" } : lineFor(valueHistory)}
			// what the line shows, for assistive tech: the range's move of the account's value
			summary={view.showcase && range === DEFAULT_RANGE ? undefined : `${signedMoneyOrZero(valueHistory.change)} (${signedPctOrZero(valueHistory.changePercent)})`}
		/>
	);
	const cashCard = (
		<Card palette={p} className="w-full">
			<Eyebrow>{d.cash.eyebrow}</Eyebrow>
			<p className="whitespace-nowrap font-sora text-[24px] font-semibold leading-[30px] text-[#f2f6fc]">{money(view.cash)}</p>
			<p className="w-full font-geist text-[11px] leading-[14px] text-[#819abb]">{d.cash.note}</p>
		</Card>
	);
	const howCard = (
		<Card palette={p} className="w-full">
			<CardTitle>{d.how.title}</CardTitle>
			{d.how.lines.map((line, i) => (
				// the second line is the one about prices (2:667 "Prices are real. Nothing is smoothed for comfort."): true for
				// the visitor (view.copy.how)
				<p key={line} className="w-full font-geist text-[11px] leading-[14px] text-[#819abb]">
					{i === 1 ? view.copy.how : line}
				</p>
			))}
		</Card>
	);
	const savedCard = (
		// below 1024 the card measures its rows (useSavedRowsFit): Figma's one line while every row holds it, else every
		// row puts its figures on a second line under the company (`sim-saved-stacked`, responsive.css)
		<Card
			palette={p}
			ref={compact ? savedFit.ref : undefined}
			className={compact ? cn("w-full", !savedFit.oneLine && "sim-saved-stacked") : "shrink-0"}
			style={compact ? undefined : { width: leftWidth(colGap) }}
		>
			{/* the header clips like Figma's, except while its link has keyboard focus (the link sits on the row's right edge,
			    so the clip would cut its focus ring there); below 1024 the row does not clip (responsive.css) */}
			<div className="sim-wrap flex h-[24px] w-full items-center justify-between overflow-clip whitespace-nowrap [&:has(>a:focus-visible)]:[overflow-clip-margin:4px]">
				<CardTitle>{d.saved.title}</CardTitle>
				{/* phone 1:4329 "All saved staks" -> My STAK overview, Instant */}
				<CardLink to="/my-stak">{d.saved.link}</CardLink>
			</div>
			{view.savedList.length === 0 && (
				// no saved company left to buy: the way to the deck the line names (the phones' empty Saved staks card carries
				// "Go to Discover ›": android ui/simulate/SimulateScreen.kt:206-213, ios Simulate/SimulateView.swift:113-115), in
				// this card's own link style, Instant like the empty state's "See today’s pick"
				// The line is true for the person reading it (N30.8i, the hunt's C-11b: a guest whose one save was the pick just
				// bought read "Save a company ... and it shows up here"): figures.ts savedEmptyLine
				// Beside a finished deck the card sends nobody into it (follow-up S2, the review of 2026-11-09; N30.8l): the line
				// names no deck and the site's one sentence for that state (home/copy.ts PICKS_DONE) stands where the link was,
				// in the line's own style, as the never-traded stage prints it where its button was
				<>
					<p className="w-full font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:text-pretty">{view.savedEmpty}</p>
					{view.deckDone ? (
						<p className="w-full font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:text-pretty">{PICKS_DONE}</p>
					) : (
						<CardLink to="/discover">Go to Discover ›</CardLink>
					)}
				</>
			)}
			{view.savedList.map((row) => {
				const priceBox = box(HW.figure[row.price as keyof typeof HW.figure]);
				const moveBox = box(HW.move[row.change as keyof typeof HW.move]);
				return (
					// phone 1:4283: the row's Buy pill (1:4319) opens the ticket. The company block (the tile, the symbol and name,
					// the price and move) opens the company's own page in its true state (coordinator decision D1: every row that
					// stands for an item opens it; /stocks/<T>, whose Back returns here): the name column is the link and its ::after
					// stretches over the block (links.css). The row clips like Figma's (cutting the pill's outside stroke at x 980)
					// except while the link or the pill has keyboard focus, so the focus ring shows whole. Below 1024 the row is at
					// least the frame's 44 and grows when the card puts its figures on a second line (useSavedRowsFit), or for a live
					// company name too long even for that line, which wraps under itself (never cut).
					<div
						key={row.symbol}
						className={
							compact
								? "sim-saved-row relative flex min-h-[44px] w-full items-center gap-[12px] overflow-clip [&:has(>:focus-visible)]:[overflow-clip-margin:4px]"
								: "sim-saved-row relative flex h-[44px] w-full items-center gap-[12px] overflow-clip [&:has(>:focus-visible)]:[overflow-clip-margin:4px]"
						}
					>
						<Avatar letter={row.initial} size={36} radius={10} bg={p.inner} letterWidth={HW.letter[row.initial as keyof typeof HW.letter]} />
						<Link
							to="/stocks/$symbol"
							params={{ symbol: row.symbol }}
							viewTransition={false}
							className={cn(
								"sim-row-link",
								compact
									? "flex min-w-px flex-1 flex-col items-start gap-px overflow-clip [overflow-wrap:break-word]"
									: "flex min-w-px flex-1 flex-col items-start gap-px overflow-clip whitespace-nowrap",
							)}
							// the stretched area ends where the 60 Buy pill and its 12 gap begin
							style={{ "--sim-row-link-end": "72px" } as CSSProperties}
						>
							<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{row.symbol}</p>
							<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{row.name}</p>
						</Link>
						<div className="flex flex-col items-end gap-px overflow-clip whitespace-nowrap">
							<p className={cn("font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]", priceBox.className)} style={priceBox.style}>
								{row.price}
							</p>
							<p className={cn("font-geist text-[11px] leading-[14px]", moveBox.className)} style={{ color: toneColor(row.tone, { up: GREEN, down: RED_ROW }), ...moveBox.style }}>
								{row.change}
							</p>
						</div>
						{/* phone 1:4319 "Buy" -> Add confirm, Instant */}
						<SmallBuyButton
							aria-label={`Buy ${row.symbol}`}
							labelWidth={23}
							onClick={() => void withMotion("instant", () => openSheet({ modal: "add-confirm", symbol: row.symbol }))}
						>
							{d.saved.buy}
						</SmallBuyButton>
					</div>
				);
			})}
		</Card>
	);
	const leaderCard = (
		<Card palette={p} className={compact ? "w-full" : "min-w-0 flex-1"}>
			<CardTitle>{d.leaderboard.title}</CardTitle>
			{/* the week's three best leaders with their places (one board, D4: live/rank.ts), "#1  Amara" ... as the frame
			    prints them; a leader You has passed shows its new place */}
			{view.board.map(({ label, pct: pctText, tone }) => {
				const ret = box(HW.ret[pctText as keyof typeof HW.ret]);
				return (
					<div key={label} className="flex h-[20px] w-full items-start justify-between overflow-clip text-[12px]">
						<p className="whitespace-pre font-geist leading-[16px] text-[#f2f6fc]">{label}</p>
						<p className={cn("whitespace-nowrap font-geist font-medium leading-[16px]", ret.className)} style={{ color: toneColor(tone, { up: GREEN, down: RED }), ...ret.style }}>
							{pctText}
						</p>
					</div>
				);
			})}
			<div className="flex h-[30px] w-full items-center justify-between overflow-clip rounded-[8px] bg-[rgba(93,168,191,0.07)] px-[10px] py-[5px] font-geist text-[12px] font-medium leading-[16px]">
				<p className="whitespace-pre text-[#a6e4f7]">{view.youLabel}</p>
				<p className={cn("whitespace-nowrap", youBox.className)} style={{ color: toneColor(view.youTone, { up: GREEN, down: RED }), ...youBox.style }}>
					{view.you}
				</p>
			</div>
			{/* phone 1:4477 "Full leaderboard" -> Leaderboard, Instant. `stak-press` only keeps this text link out of the shared
			    text-baseline rule, where the approved pixels have it; its hover / press response is off (motion.css). Below
			    1024 an invisible touch area makes it 44 tall (`sim-hit-foot`, responsive.css) */}
			<Link
				to="/simulate/leaderboard"
				viewTransition={false}
				className="stak-press sim-hit-foot whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#819abb]"
			>
				{d.leaderboard.link}
			</Link>
		</Card>
	);
	const picksCard = (
		<Card palette={p} className={compact ? "w-full whitespace-nowrap" : "sim-fill whitespace-nowrap"} style={compact ? undefined : { width: leftWidth(colGap) }}>
			{/* as Saved staks' header: whole focus ring for its link */}
			<div className="sim-wrap flex h-[24px] w-full items-center justify-between overflow-clip [&:has(>a:focus-visible)]:[overflow-clip-margin:4px]">
				<CardTitle>{d.picks.title}</CardTitle>
				{/* phone 1:4402 "See all 12 picks" -> Portfolio, Instant */}
				<CardLink to="/simulate/portfolio">{d.picks.link}</CardLink>
			</div>
			{view.pickList.length === 0 && (
				// an account that sold every pick (the never-traded one sees the empty state instead): the card says so in
				// the Saved staks card's own empty-line style, in the Portfolio's words (the phones: "No picks yet",
				// android ui/simulate/SimulateScreen.kt:239-241); "Open portfolio ›" still leads to the sold picks
				<p className="w-full whitespace-normal font-geist text-[11px] leading-[14px] text-[#819abb]">No open picks. Buy a saved company and it lands here.</p>
			)}
			{view.pickList.map((row) => {
				const gain = box(HW.figure[row.gain as keyof typeof HW.figure]);
				const ret = box(HW.pct[row.pct as keyof typeof HW.pct]);
				return (
					// phone 1:4375 "Pick" row -> Pick detail, Instant. Figma draws no hover or pressed state for the row (no
					// variant, no "change to" reaction): it keeps its look under the pointer and while pressed
					<Link
						key={row.symbol}
						to="/simulate/picks/$symbol"
						params={{ symbol: row.symbol }}
						viewTransition={false}
						className="flex h-[30px] w-full cursor-pointer items-center justify-between overflow-clip"
					>
						<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{row.symbol}</p>
						<div className="flex items-start gap-[12px] overflow-clip" style={{ color: toneColor(row.tone, { up: GREEN, down: RED }) }}>
							<p className={cn("font-geist text-[13px] font-medium leading-[17px]", gain.className)} style={gain.style}>
								{row.gain}
							</p>
							<p className={cn("font-geist text-[12px] leading-[16px]", ret.className)} style={ret.style}>
								{row.pct}
							</p>
						</div>
					</Link>
				);
			})}
		</Card>
	);

	// The page's sheets: the ticket, its receipt and the failed-order sheet. The never-traded page draws them too (its
	// Saved staks card opens the same ticket), so they are one layer both arrangements render after their cards.
	const sheetLayer = (
		<>
			{search.modal === "add-confirm" && !unpriced && (
				<AddConfirmSheet
					symbol={symbol}
					stock={view.stock}
					alt={alt}
					cash={view.cash}
					initialAmount={search.amount}
					description={view.copy.ticket}
					refusal={refused}
					pending={trade.pending}
					onAmount={noteAmount}
					onConfirm={confirmBuy}
					onClose={() => {
						setRefused(null);
						return closeSheet();
					}}
				/>
			)}
			{search.modal === "buy-failed" && (
				// Try again re-opens the order the visitor had chosen (the amount stays in the address)
				<BuyFailedSheet motion stock={view.stock} onRetry={() => swapSheet({ modal: "add-confirm", symbol, amount: search.amount })} onClose={closeSheet} />
			)}
			{search.modal === "add-success" && !leftReceipt && (
				<AddSuccessSheet
					symbol={symbol}
					stock={view.stock}
					amount={filled?.fill.cost ?? amount}
					// "You now hold": the whole holding after the fill (the shares held before plus this order), as both phones
					// print it (live Fill.holding; android ui/discover/DiscoverScreen.kt:1556-1559). The receipt opened from the
					// address alone (the 2:1589 capture) shows the frame's estimate of the order.
					shares={filled?.fill.holding ?? (view.price > 0 ? amount / view.price : 0)}
					cash={filled?.cash ?? (view.showcase ? cashAvailable - amount : view.cash)}
					// leaving through the receipt takes its place in the history: Back from My STAK returns to Simulate
					onPrimary={viewInMyStak}
					onClose={() => {
						setReceipt(null);
						closeSheet();
					}}
				/>
			)}
		</>
	);

	// The never-traded page (2:2255): the hero and the invitation, as the frame and both phones draw it (android
	// ui/simulate/SimulateScreen.kt:192-203 `noTrades`). A person who has SAVED companies also gets the Saved staks card
	// with its Buy pills under the invitation (coordinator ruling N27k, replacing N7b; the hunt's ST-21): the page's own
	// copy says "Pick a saved company and buy", and the saved company was offered nowhere on Simulate until a first trade
	// was made somewhere else. With no saves the invitation stands alone, as the frame draws it. The page under a first
	// order's ticket and receipt stays this one until the sheet closes (`view` is the page as it was at Confirm).
	if (view.empty) {
		return (
			<SimulateEmpty value={view.emptyValue} body={view.copy.emptyBody} done={deckDone} saved={view.savedList.length > 0 ? savedCard : null} compact={compact}>
				{sheetLayer}
			</SimulateEmpty>
		);
	}

	/*
	 * Below 1024 (SPEC R2 / R3; CORE-API: a 744 : 360 row stacks) the two columns become ONE column of the same six cards,
	 * each the column's width, 22 apart (the frames' row gap), in the SECTION ORDER of the phone frame of this screen
	 * (page "mobile updated" 1:4283 "Simulate home · paper", read 2026-10-31; its visuals are not used): the portfolio
	 * hero (whose cash line is the Cash card here, so Cash follows it), Saved staks with their Buy pills, How it works,
	 * the picks ("Your portfolio" there), then the board. The cards are RENDERED in that order (`useSizeClass`), so the
	 * DOM, the reading order and the Tab sequence are the order the eye sees (the R10 ruling of 2026-10-25: never a CSS
	 * `order`); the focus order inside each card is the desktop's, and a control that has keyboard focus when the window
	 * crosses 1024 keeps it (FocusKeeper). The page root and the sheets after it are the same elements in both
	 * arrangements, so an open sheet stays open (and keeps its state) across the reflow. From 1024 up the tree is the
	 * approved two-column one, element for element.
	 */
	return (
		<div className="sim-responsive flex flex-col items-start gap-[22px]" style={{ width: colPlus(alt ? 10 : -8), marginTop: alt ? 4 : 0, minHeight: alt ? 965 : 969 }}>
			<PageHead />

			{compact ? (
				<FocusKeeper key="compact">
					<div className="flex w-full flex-col gap-[22px]">
						{hero}
						{cashCard}
						{savedCard}
						{howCard}
						{picksCard}
						{leaderCard}
					</div>
				</FocusKeeper>
			) : (
				<FocusKeeper key="desktop">
					<div className="flex w-full flex-col items-start gap-[22px]">
						<div className="flex w-full flex-col items-start gap-[22px]">
							<div className="sim-columns flex w-full items-start" style={{ gap: colGap }}>
								{hero}
								<div className="flex min-w-0 flex-1 flex-col items-start gap-[11px]">
									{cashCard}
									{howCard}
								</div>
							</div>

							{/* the frame bottom-aligns this row (2:672 ends with 2:709 at y 701, the Leaderboard card 7 px lower at the
							    top). A Saved staks card shorter than the frame's three rows (two saves left, one, none: the empty line
							    and "Go to Discover ›") is top-aligned with the Leaderboard card instead, so it does not sit stranded at
							    the bottom of the row under a gap; the frames' three-row card keeps the approved alignment */}
							<div className={cn("sim-columns flex w-full", view.savedList.length >= 3 ? "items-end" : "items-start")} style={{ gap: colGap }}>
								{savedCard}
								{leaderCard}
							</div>
						</div>

						{picksCard}
					</div>
				</FocusKeeper>
			)}

			{sheetLayer}
		</div>
	);
}

/**
 * A control across the two arrangements: its tag and its accessible name ("Buy PLTR", "Open portfolio ›", "1M", a pick
 * row's text), each unique on the page.
 */
const focusName = (el: Element) => `${el.tagName}|${el.getAttribute("aria-label") ?? el.textContent ?? ""}`;

/** The page control (not one inside a sheet) with that name in the arrangement on screen. */
const findControl = (name: string) =>
	Array.from(document.querySelectorAll<HTMLElement>(".sim-responsive a, .sim-responsive button")).find((el) => !el.closest("dialog") && focusName(el) === name);

/** The name of `el` when it is a control of the page itself (what a sheet opened from it hands the focus back to). */
const pageControlName = (el: Element | null) => (el && el !== document.body && el.closest(".sim-responsive") && !el.closest("dialog") ? focusName(el) : null);

/** The Saved staks rows' Buy pills in the arrangement on screen, top to bottom. */
const savedPills = () => Array.from(document.querySelectorAll<HTMLElement>(".sim-responsive .sim-saved-row > button")).filter((el) => !el.closest("dialog"));

/**
 * The control that stands in for a Saved staks Buy pill that has left the list (its company was just bought): the
 * pill now in its row's place (the next saved company), the last pill when the list got shorter, or the card's own
 * "All saved staks ›" when no saved company is left.
 */
const savedStandIn = (row: number): HTMLElement | undefined => {
	const pills = savedPills();
	return pills[Math.min(row, pills.length - 1)] ?? findControl(`A|${simulateHome.saved.link}`);
};

/** The control that had keyboard focus in the arrangement being replaced, noted while that tree is still in the page. */
let pendingFocus: string | null = null;

/**
 * Keyboard focus survives the switch between the page's two arrangements. The compact column and the desktop columns
 * are different subtrees (the R10 ruling: below 1024 the DOM follows the visual order), so crossing 1024 (a rotation, a
 * resize) mounts new cards in place of the old ones and focus would fall to <body>. Each tree sits in a keeper of its
 * own (keyed "compact" / "desktop"): React runs the leaving keeper's cleanup BEFORE it removes that tree's DOM, so the
 * focused control is still the active element there and its name is noted; the arriving keeper's effect runs once the
 * new tree is in the page and focuses the control with the same name. Focus inside an open sheet is left alone (the
 * sheet is the same element in both arrangements); nothing moves when something else has focus by then; a note nobody
 * claims in the same commit (the page was left) is dropped. Renders no element of its own.
 */
function FocusKeeper({ children }: { children: ReactNode }) {
	useLayoutEffect(() => {
		const name = pendingFocus;
		pendingFocus = null;
		const active = document.activeElement;
		if (name !== null && (!active || active === document.body)) findControl(name)?.focus();
		return () => {
			const leaving = document.activeElement;
			if (!leaving || !leaving.closest(".sim-responsive") || leaving.closest("dialog")) return;
			pendingFocus = focusName(leaving);
			queueMicrotask(() => {
				pendingFocus = null;
			});
		};
	}, []);
	return children;
}

/**
 * Below 1024 (SPEC R7: keep the columns when they fit, otherwise the secondary figures go on a second line inside the
 * row) the Saved staks rows keep Figma's one line (2:683 ...: the 36 tile, the symbol over the company, the price over
 * the move, the 60 Buy pill, 12 apart, each at its own width) while it holds in EVERY row; otherwise every row puts its
 * figures on a second line under the company (`sim-saved-stacked`, responsive.css). So the list keeps one rhythm at any
 * width and no company name is broken beside one-line figures. Each row's figures are a column of its own, so for the
 * frame's own strings the widest row is PLTR's: 36 + "Palantir Technologies" 107.2 + "▲ 1.1% today" 63 + 60 + 3 x 12 =
 * 302.2 inside the card, i.e. Figma's line from 375-wide windows up (measured: 374 stacks, 375 holds the line with every
 * name whole). It is measured rather than fixed because a signed-in account's live names and prices are not the frame's.
 * A callback ref (React 19 runs its returned cleanup): the card is measured as it mounts, whenever its width changes,
 * when the web fonts finish loading, and again when the rows' strings change (`strings`). Measuring reads the current
 * arrangement only (no re-layout): a text broken over lines cannot hold one line in any arrangement, and an unbroken
 * text's run is its width in both. Its state is set during the commit, so the right arrangement is the first painted.
 */
function useSavedRowsFit(strings: string): { ref: RefCallback<HTMLElement>; oneLine: boolean } {
	const [oneLine, setOneLine] = useState(true);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `strings` is the trigger: the rows' text changed, measure again
	const ref = useCallback(
		(card: HTMLElement | null) => {
			if (!card) return;
			const measure = () => setOneLine(savedRowsFit(card));
			measure();
			const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
			observer?.observe(card);
			document.fonts?.addEventListener("loadingdone", measure);
			return () => {
				observer?.disconnect();
				document.fonts?.removeEventListener("loadingdone", measure);
			};
		},
		[strings],
	);
	return { ref, oneLine };
}

/** Whether every Saved staks row of `card` holds Figma's one line: tile, the wider of its two names, the wider of its
 * two figures, the pill and the row's three gaps, with half a pixel to spare for the browser's own rounding. */
function savedRowsFit(card: HTMLElement): boolean {
	const width = (el: Element) => el.getBoundingClientRect().width;
	for (const row of Array.from(card.querySelectorAll<HTMLElement>(":scope > .sim-saved-row"))) {
		const [tile, names, figures, pill] = Array.from(row.children);
		if (!tile || !names || !figures || !pill) continue;
		const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;
		const need = width(tile) + Math.max(0, ...Array.from(names.children, runWidth)) + Math.max(0, ...Array.from(figures.children, width)) + width(pill) + 3 * gap;
		if (need > width(row) - 0.5) return false;
	}
	return true;
}

/** The width of a text's run, or Infinity when the text is broken over more than one line. */
function runWidth(el: Element): number {
	const range = document.createRange();
	range.selectNodeContents(el);
	const boxes = Array.from(range.getClientRects());
	if (boxes.length === 0) return 0;
	const first = boxes[0]!;
	if (boxes.some((b) => Math.abs(b.top - first.top) > first.height / 2)) return Number.POSITIVE_INFINITY;
	return Math.max(...boxes.map((b) => b.right)) - Math.min(...boxes.map((b) => b.left));
}

/**
 * "All saved staks ›" / "Open portfolio ›": a card's right-hand link at Figma's box, Instant like the prototype's.
 * `stak-press` only keeps this text link out of the shared text-baseline rule (styles.css), where the approved pixels
 * have it; its hover / press response is switched off on the Simulate pages (motion.css): Figma draws no such state.
 * Below 1024 an invisible touch area makes it 44 tall (`sim-hit-head`, responsive.css).
 */
function CardLink({ to, children }: { to: "/my-stak" | "/simulate/portfolio" | "/discover"; children: string }) {
	const fit = box(HW.link[children as keyof typeof HW.link]);
	return (
		<Link
			to={to}
			viewTransition={false}
			className={cn("stak-press sim-hit-head font-geist text-[12px] font-medium leading-[16px] text-[#819abb]", fit.className)}
			style={fit.style}
		>
			{children}
		</Link>
	);
}

/**
 * "Simulate" + the "Paper trading" pill (2:637; the label's box is 71 wide, so the pill is 95). The title is the page's
 * heading (h1, as the other pages' titles are), drawn exactly as the text it was: preflight gives a heading no size,
 * weight or margin of its own, and the shared text rules treat it as the paragraph it replaces.
 */
function PageHead() {
	const d = simulateHome;
	return (
		<div className="flex h-[67px] flex-col items-start justify-between overflow-clip">
			<h1 className="whitespace-nowrap font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{d.title}</h1>
			<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[12px] py-[5px]">
				<p className="w-[71px] whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{d.badge}</p>
			</div>
		</div>
	);
}

function PortfolioHero({
	palette,
	width,
	compact,
	value,
	today,
	todayTone,
	allTime,
	range,
	onRange,
	line,
	summary,
}: {
	palette: Palette;
	width: string;
	/** below 1024: the move line and the all-time line wrap onto two lines where the column cannot hold both */
	compact?: boolean;
	value: string;
	today: string;
	todayTone: Tone;
	allTime: AllTimeLine;
	range: Range;
	onRange: (r: Range) => void;
	line: ChartLine;
	/** the range's move of the value, read out with the chart */
	summary?: string;
}) {
	const d = simulateHome.hero;
	// the frame's line sits in a 147-wide box (2:648), which puts the all-time text at x 161
	const todayBox = box(HW.today[today as keyof typeof HW.today]);
	return (
		<Card palette={palette} className="sim-fill shrink-0" style={{ width }}>
			<Eyebrow>{d.eyebrow}</Eyebrow>
			<p className="whitespace-nowrap font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{value}</p>
			{/* below 1024: Figma's 14 between the two texts on one line; wrapped, the second line sits a card gap (12) under the
			    first, and a live all-time line too long for the column wraps itself instead of being cut. The row lets a focus
			    ring show past its clip (the rank link) */}
			<div
				className={
					compact
						? "flex flex-wrap items-center gap-x-[14px] gap-y-[12px] overflow-clip whitespace-nowrap text-[12px] leading-[16px] [&:has(a:focus-visible)]:[overflow-clip-margin:4px]"
						: "sim-wrap flex items-center gap-[14px] overflow-clip whitespace-nowrap text-[12px] leading-[16px] [&:has(a:focus-visible)]:[overflow-clip-margin:4px]"
				}
			>
				<p className={cn("font-geist font-medium", todayBox.className)} style={{ color: toneColor(todayTone, { up: GREEN, down: RED }), ...todayBox.style }}>
					{today}
				</p>
				{/* "+$240.00 all time · #47 on the leaderboard" (2:649): the rank opens the Leaderboard, Instant, in the line's
				    own muted look, as "Leaderboard ›" does (the phones' rank chip opens it: android ui/simulate/SimulateScreen.kt
				    :457-475, ios Simulate/SimulateView.swift:320-330). The line is painted exactly as before, one text the shared
				    baseline and grayscale rules draw as they always did; the link lies over its rank in a transparent copy of the
				    line (the painted one `aria-hidden`), the same way the breadcrumbs carry theirs (ui.tsx BackHeader: measured
				    pixel-identical at 1440 x 1024 and 1024 x 768, 2026-11-07) */}
				<div className="relative">
					<p aria-hidden="true" className={compact ? "font-geist whitespace-normal text-[#819abb]" : "font-geist text-[#819abb]"}>
						{`${allTime.lead}${allTime.rank}`}
					</p>
					<p className={cn("absolute inset-0 font-geist text-transparent", compact && "whitespace-normal")}>
						{allTime.lead}
						<Link to="/simulate/leaderboard" viewTransition={false} className="cursor-pointer">
							{allTime.rank}
						</Link>
					</p>
				</div>
			</div>
			<MiniChart inner={palette.inner} line={line} range={range} onRange={onRange} summary={summary} />
		</Card>
	);
}

/**
 * "Mini chart" (2:650): a 704x120 panel, the line in a 672x70 box at (10, 27), the range buttons 178px from its right
 * edge at y 86. The selected range has the panel's colour behind a #f2f6fc label; the others are #819abb. Each button
 * hugs its label with 10px a side (2:653: the label box starts at x 10), so the label sits at the left padding.
 */
function MiniChart({
	inner,
	line,
	range,
	onRange,
	summary,
}: {
	inner: string;
	line: ChartLine;
	range: Range;
	onRange: (r: Range) => void;
	summary?: string;
}) {
	// while a range's history loads, the line that was on screen stays, so the chart never blinks empty
	const shown = useRef<ChartLine>(line);
	if (line.kind !== "pending") shown.current = line;
	const draw = line.kind === "pending" ? shown.current : line;
	const label = line.kind === "pending" ? `Loading the ${range} chart` : `Portfolio value, ${range}${summary ? `: ${summary}` : ""}`;
	return (
		<div className="relative h-[120px] w-full overflow-clip rounded-[12px]" style={{ backgroundColor: inner }}>
			<div role="img" aria-label={label} className="absolute inset-0">
				{draw.kind === "figma" && (
					// "Vector" 672x70 at (10,27); the export is 672.38x72.489 and sits 1.81% above / 1.75% below its box
					<div className="absolute left-[10px] top-[27px] h-[70px] w-[calc(100%-32px)]">
						<div className="absolute" style={{ inset: "-1.81% 0 -1.75% 0" }}>
							<img alt="" src={SA.miniChart} className="block size-full max-w-none" />
						</div>
					</div>
				)}
				{draw.kind === "series" && <SeriesLine values={draw.values} />}
				{draw.kind === "flat" && <FlatBaseline />}
			</div>
			<RangeButtons active={range} inner={inner} onSelect={onRange} />
		</div>
	);
}

/**
 * The line box of the account's history: Figma's 672-wide box from y 27 (2:651), down to y 82. Figma's box is 70 tall
 * (to y 97), but the range buttons sit inside it from y 86 (2:653 ...), and Figma's own line passes above them; a line
 * of any shape (one that ends low, or runs flat along its bottom) is kept clear of them the same way, 4 px above the
 * buttons, so no label is drawn over the line and no part of the line hides behind a label.
 */
const SERIES_H = 55;

/** The account's history drawn with the Figma line's stroke (#5DA8BF, 2.5), clear of the range buttons (SERIES_H). */
function SeriesLine({ values }: { values: number[] }) {
	const min = Math.min(...values);
	const max = Math.max(...values);
	const last = values.length - 1;
	const points = values.map((v, i) => `${((i / last) * 672).toFixed(2)},${(SERIES_H - ((v - min) / (max - min)) * SERIES_H).toFixed(2)}`).join(" ");
	return (
		<svg
			aria-hidden
			className="absolute left-[10px] top-[27px] w-[calc(100%-32px)] overflow-visible"
			style={{ height: SERIES_H }}
			viewBox={`0 0 672 ${SERIES_H}`}
			preserveAspectRatio="none"
		>
			<polyline points={points} fill="none" stroke="#5DA8BF" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
		</svg>
	);
}

/** 2:2269 "flat baseline": 672x1 at (10, 77), rgba(129,154,187,0.35) — the frames' chart with no moves to draw. */
function FlatBaseline() {
	return <div className="absolute left-[10px] top-[77px] h-px w-[calc(100%-32px)] bg-[rgba(129,154,187,0.35)]" />;
}

function RangeButtons({ active, inner, onSelect }: { active: Range; inner: string; onSelect: (r: Range) => void }) {
	return (
		<div role="group" aria-label="Chart range" className="absolute left-[calc(100%-178px)] top-[86px] flex items-start gap-[8px]">
			{RANGES.map((r) => {
				const on = r === active;
				return (
					<button
						key={r}
						type="button"
						aria-pressed={on}
						onClick={() => onSelect(r)}
						// no hover or pressed look (Figma defines none): the selected one is the panel's colour behind a light label.
						// Below 1024 an invisible touch area makes each 44 tall (`sim-hit-tab`, responsive.css)
						className="sim-hit-tab flex cursor-pointer items-start overflow-clip rounded-[8px] px-[10px] py-[4px]"
						style={{ width: RANGE_WIDTH[r], ...(on ? { backgroundColor: inner } : {}) }}
					>
						<span className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", on ? "text-[#f2f6fc]" : "text-[#819abb]")}>{r}</span>
					</button>
				);
			})}
		</div>
	);
}

/**
 * 2:2255 "Desktop · Simulate · Empty" (10 · States): hero with a flat baseline, then the empty stage. `value` is the
 * account's paper value in whole dollars (the frame's $10,000 budget for the preview; a never-traded account's own cash).
 * `saved`: the Saved staks card of a never-traded person who has saves, under the invitation at the page's own 22 (N27k;
 * the frame draws the state with no saves: nothing there). `done`: today's deck is finished, so the stage offers no way
 * into it: Home's own sentence for that state stands where the button was (N30.8l: one sentence for "today's deck is
 * done", home/copy.ts PICKS_DONE, and no live "See today's pick" beside a finished deck). `body`: the invitation's
 * sentence, true for the visitor about the prices (figures.ts priceCopy; the frame's own without it). `children`: the
 * page's sheets.
 */
function SimulateEmpty({
	value,
	body,
	saved,
	done,
	compact,
	children,
}: {
	value: number;
	body?: string;
	saved?: ReactNode;
	done?: boolean;
	compact?: boolean;
	children?: ReactNode;
}) {
	const e = simulateEmpty;
	const [range, setRange] = useState<Range>(DEFAULT_RANGE);
	return (
		<div className="sim-responsive flex flex-col items-start gap-[22px]" style={{ width: colPlus(-8) }}>
			<PageHead />
			<Card className="sim-fill shrink-0" style={{ width: leftWidth(22) }}>
				<Eyebrow>{e.hero.eyebrow}</Eyebrow>
				<p className="whitespace-nowrap font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{wholeMoney(value)}</p>
				<div className="flex items-center gap-[14px] overflow-clip whitespace-nowrap text-[12px] leading-[16px] text-[#819abb]">
					{/* 2:2266 is a 77-wide box: "Unranked" starts at x 91 */}
					<p className="w-[77px] font-geist font-medium">{e.hero.moves}</p>
					<p className="font-geist">{e.hero.rank}</p>
				</div>
				{/* no holdings, no moves: every range draws the flat baseline */}
				<MiniChart inner="#181f30" line={{ kind: "flat" }} range={range} onRange={setRange} />
			</Card>
			{/* the stage and its column clip like the frame's, but leave 4px for the button's focus ring */}
			<div className="sim-fill flex flex-col items-center justify-center overflow-clip pt-[56px] [overflow-clip-margin:4px]" style={{ width: leftWidth(22) }}>
				<div className="sim-empty-copy flex flex-col items-center overflow-clip [overflow-clip-margin:4px]">
					<div className="relative h-[151px] w-[121.143px]">
						{/* Figma's render of 2:2283 (its render bounds start 5.26 left of the frame; the 1x render is 136 x 166). Past
						    2560 DensityImg draws the render that covers the zoom x the screen's density: 2x to 5K, 4x on 8K */}
						<DensityImg
							alt=""
							src={SA.emptyBox}
							srcSet={`${SA.emptyBox} 1x, ${SA.emptyBox2x} 2x, ${SA.emptyBox4x} 4x`}
							width={136}
							height={166}
							className="absolute left-[-5.262px] top-0 block h-[166px] w-[136px] max-w-none"
						/>
					</div>
					<div className="h-[28px] w-[10px]" />
					{/* 2:2299 is 297 wide, centred at x 81.5 of the 460 column; the stage's heading (h2, under the page's h1) */}
					<h2 className="w-[297px] shrink-0 whitespace-nowrap text-center font-sora text-[26px] font-semibold leading-[33px] text-white">{e.title}</h2>
					<div className="size-[10px]" />
					<p className="w-[460px] text-center font-geist text-[15px] leading-[22px] text-[#819abb]">{body ?? e.body}</p>
					<div className="h-[28px] w-[10px]" />
					{/* "See today's pick" (2:2303): no prototype wiring on either page; the label names today's deck (/discover), and
					    the move is Instant like every other Simulate link (Home's "See Todays Pick", phone 1:987 -> 1:1741, is Instant).
					    The link is the control: it takes the button's radius so its focus ring follows the button's corners. */}
					{done ? (
						// the deck is finished: no button into it; the line takes the body's own style, a step smaller
						<p className="text-center font-geist text-[13px] leading-[18px] text-[#819abb] max-lg:text-pretty">{PICKS_DONE}</p>
					) : (
						<Link to="/discover" viewTransition={false} className="block w-[240px] rounded-[6px]">
							<PrimaryButton as="span">
								<span className="w-[109px] shrink-0 text-left">{e.cta}</span>
							</PrimaryButton>
						</Link>
					)}
				</div>
			</div>
			{/* the saved companies, ready to buy (N27k): the regular page's own card, at the hero's width from 1024 (its
			    Buy pills open the same ticket); below 1024 it fills the column like every card there */}
			{saved && <div className={compact ? "flex w-full flex-col" : "flex w-full flex-col items-start"}>{saved}</div>}
			{children}
		</div>
	);
}
