import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { type RefCallback, useCallback, useEffect, useMemo, useState } from "react";
import { colPlus, useSizeClass } from "@/app/FitCanvas";
import { companyInitial, dayLabel, normalizeTicker, type OrderRefusal, signedMoneyOrZero, signedPctOrZero, type Tone, toneOf, usePortfolio, useShowcase } from "@/app/live";
import { popBackOver, useSimulateBack } from "./back";
import { pickDetail, portfolio, type Stock, stocks } from "./data";
import { newestPicks, pickCount, pickReturn, refusalFrom, round6, rowTone, soldWords, stakeText, toneColor } from "./figures";
import { withMotion } from "./motion";
import { handOffSale, InstantBack, sheetMove, SMART } from "./PickDetail";
import { BuyFailedSheet, PortfolioSellSheet, type SaleLedger } from "./sheets";
import { stockFor } from "./SimulateHome";
import { useTradeRequest } from "./useTradeRequest";
import { Avatar, BackHeader, Eyebrow, FilterChip, GREEN, PageTitle, type Palette, RED, SmallSellButton } from "./ui";

/**
 * `modal`: the portfolio's own Sell sheet (2:1116, opened by its address: the pills open the pick page) and, when a sale
 * could not be placed, the failed-order sheet (2:1863) over it; `portion` the share of the position the sheet had chosen,
 * which Try again restores.
 */
export type PortfolioSearch = { variant?: "alt"; modal?: "sell-confirm" | "sell-failed"; symbol?: string; portion?: number };

/** 2:743 "Desktop · Portfolio" (canonical) and 2:1116 (alternate palette, header 44px higher, Sell sheet; ?variant=alt). */
const CANON: Palette = { card: "#181f30", inner: "#12203e" };
const ALT: Palette = { card: "#0e1a36", inner: "#12203e" };

/** A frame row's own colour: the frames draw a gain green and a loss red (they print no zero). */
const frameTone = (up: boolean): Tone => (up ? "up" : "down");

/**
 * The frame's own figure boxes. Figma's figures are auto-width texts, whole pixels wide and left-aligned, stacked in a
 * right-aligned column (2:772 et al.) or set against the row's right edge (2:843, 2:848), so each one starts at the
 * column's edge minus its box; Chrome's fractional boxes started several of them up to 1.3px right. The showcase
 * rows are the frame's strings, so they take the frame's boxes: [gain 2:773…, % 2:774…] and the sold amounts.
 */
const FIGURE_BOX: Record<string, readonly [number, number]> = {
	NVDA: [52, 38],
	TSLA: [49, 35],
	AMD: [46, 33],
	AAPL: [44, 32],
	JPM: [44, 32],
	MSFT: [42, 30],
};
const SOLD_BOX: Record<string, number> = { SHOP: 50, COIN: 42 };

/** A picks card narrower than this belongs to no supported window (the narrowest, at 320, is 288): usePickedLinesFit ignores it. */
const MIN_CARD = 200;

/**
 * Below 1024 a row's picked line ("Picked May 8 · $100 stake", 2:770 …) keeps the frame's one line while EVERY row's line
 * holds one line in its column; where one cannot (the stacked rows of a 320 window: "Picked Jul 1 · $100 stake" fits
 * the 124-px column, the other five lines do not), every row breaks its line after the "·", where the wrap breaks it
 * anyway ("Picked May 8 ·" / "$100 stake"), so the list keeps one rhythm (rows 89 tall, not five 89 and one 75). Measured
 * rather than fixed because a signed-in account's dates and stakes are not the frame's: the card is measured as it
 * mounts, whenever its width changes, when the web fonts finish loading and when the lines change (`strings`), the same
 * scheme as Simulate home's Saved staks rows (useSavedRowsFit). A callback ref (React 19 runs its returned cleanup): its
 * state is set during the commit, so the right arrangement is the first painted. From 1024 nothing is measured and the
 * line is the frame's one text.
 */
function usePickedLinesFit(strings: string, enabled: boolean): { ref: RefCallback<HTMLElement>; oneLine: boolean } {
	const [oneLine, setOneLine] = useState(true);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `strings` is the trigger: the lines' text changed, measure again
	const ref = useCallback(
		(card: HTMLElement | null) => {
			if (!card || !enabled) return;
			// A card narrower than any supported window gives it (288 at 320) is a passing, degenerate layout, not a
			// width to answer: a full-page screenshot lays the page out in a 1 x 1 view for a moment (measured
			// 2026-11-06: the card 40 wide), and the answer from that moment could be painted. The last answer stands.
			const measure = () => {
				if (card.clientWidth >= MIN_CARD) setOneLine(pickedLinesFit(card));
			};
			measure();
			const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
			observer?.observe(card);
			document.fonts?.addEventListener("loadingdone", measure);
			return () => {
				observer?.disconnect();
				document.fonts?.removeEventListener("loadingdone", measure);
			};
		},
		[strings, enabled],
	);
	return { ref, oneLine: !enabled || oneLine };
}

let measureContext: CanvasRenderingContext2D | null | undefined;

/**
 * Whether every picked line of `card` holds one line in its column (the text column the line is set in, whatever the
 * row's arrangement): the line's one-line run in its own font against the column's width, with half a pixel to spare
 * for the browser's rounding (a line that close to its column is broken with the others rather than risked). The run is
 * the canvas's measure of the whole text, the same in either arrangement, so the answer never depends on the break.
 */
function pickedLinesFit(card: HTMLElement): boolean {
	if (measureContext === undefined) measureContext = document.createElement("canvas").getContext("2d");
	const ctx = measureContext;
	if (!ctx) return true;
	for (const line of Array.from(card.querySelectorAll<HTMLElement>("[data-picked-line]"))) {
		const column = line.parentElement;
		if (!column) continue;
		const cs = getComputedStyle(line);
		ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
		const text = line.dataset.pickedLine ?? "";
		if (ctx.measureText(text).width > column.clientWidth - 0.5) return false;
	}
	return true;
}

/** A picked line broken after its "·" ("Picked May 8 ·" / "$100 stake") when the list breaks every line (usePickedLinesFit). */
function PickedLine({ meta, split }: { meta: string; split: boolean }) {
	const at = meta.lastIndexOf(" · ");
	if (!split || at < 0) return <>{meta}</>;
	return (
		<>
			{meta.slice(0, at + 2)}
			<br />
			{meta.slice(at + 3)}
		</>
	);
}

/** `tone`: the colour of a row's signed figures (figures.ts toneColor): the frame's green and red, the label grey at zero. */
type Row = { symbol: string; initial: string; meta: string; gain: string; pct: string; tone: Tone; box?: readonly [number, number] };
type SoldRow = { key: string; symbol: string; meta: string; amount: string; tone: Tone; box?: number };
type Page = { list: Row[]; soldList: SoldRow[]; subtitle: string };
/** `exact`: the ledger's own figures the sheet previews its sale from (sheets.tsx SaleLedger; absent on the frame's own) */
type SheetFigures = { stock: Stock; shares: number; stake: number; value: number; exact?: SaleLedger };

export function Portfolio({ search }: { search: PortfolioSearch }) {
	const navigate = useNavigate();
	const router = useRouter();
	const pf = usePortfolio();
	const live = pf.live;
	const alt = search.variant === "alt";
	const p = alt ? ALT : CANON;
	const [chip, setChip] = useState(0);
	// below 1024 (phones and tablets) the page reflows into the window's column (SPEC R3, R6)
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";
	// the sheet opens and closes INSTANT, like every Back / Sell edge of the prototype's Simulate screens. It is drawn
	// over the untouched list (2:1116), so opening or closing it never moves the page: the navigation keeps the scroll
	// position (`resetScroll: false`; a phone page used to jump to the top, the coordinator's note of 2026-10-31), and a
	// history step that stays on this page (the sheet's Back stepping back, the browser's own Back / Forward) keeps it too
	const pushed = useLocation({ select: (location) => location.state.simSheet === true && location.state.simSheetPath === "/simulate/portfolio" });
	const setSearch = (next: PortfolioSearch) => {
		// a swap (a failed sale, Try again) keeps the entry's pushed mark (PickDetail.tsx sheetMove): this sheet is reached by
		// its address, so Not now / Back close it in place instead of stepping back out of the page (review r2)
		const move = sheetMove(search.modal, next.modal, pushed);
		if (move.kind === "back") return router.history.back();
		return navigate({ to: "/simulate/portfolio", search: { variant: search.variant, ...next }, replace: move.replace, viewTransition: false, resetScroll: false,
			state: (prev) => ({ ...prev, simSheet: move.pushed, simSheetPath: "/simulate/portfolio" }) });
	};
	// The router answers a history step with a scroll to the top unless its `_scroll.next` flag is off: the flag a
	// navigation's `resetScroll: false` sets, read when the step's entry renders. A step has no such option, so the flag
	// is set here while the step is under way (the router renders it after this event), as SimulateHome does.
	useEffect(() => {
		const here = window.location.pathname;
		const onPop = () => {
			if (window.location.pathname === here) router._scroll.next = false;
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, [router]);
	// Back: the page before (Simulate home, the Profile hub, the inbox ...), else Simulate home (D2; the phones pop). A
	// pick page a receipt's View portfolio left right below this entry (back.ts receiptExit, named in the entry's state)
	// is stepped over, as the phones' popUpTo leaves no pick under the Portfolio
	const over = useLocation({ select: (location) => location.state.simOver });
	const back = useSimulateBack((_prev, entries) => popBackOver(entries, "/simulate", over));
	const symbol = normalizeTicker(search.symbol ?? "NVDA");
	const trade = useTradeRequest(`${live.uid ?? "guest"}:${symbol}:${search.modal ?? "page"}`);
	const d = portfolio;

	// A sale changes the list (and ends the showcase) before the receipt replaces the Sell sheet; until it opens the
	// page and the sheet keep what was on screen, so the prototype's sheet-to-receipt morph starts from it.
	const [frozen, setFrozen] = useState<{ page: Page; sheet: SheetFigures } | null>(null);
	// the store's own refusal of a sale the sheet had let through: the sheet stays and says why (N30.3a)
	const [refused, setRefused] = useState<OrderRefusal | null>(null);

	const rows = useMemo(() => {
		// "Newest": the newest pick first, the order Simulate home's Your picks shows (D6, figures.ts newestPicks)
		if (chip === 1) return newestPicks(pf.positions);
		const r = [...pf.positions];
		if (chip === 0) r.sort((a, b) => b.gain - a.gain);
		else r.sort((a, b) => a.gain - b.gain);
		return r;
	}, [pf.positions, chip]);

	/** the untouched demo persona shows the frame's own rows (live/showcase.ts); the frame's order is top gainer first and oldest first */
	const showcase = useShowcase();
	const framePicks = chip === 0 ? [...d.picks] : [...d.picks].reverse();
	const list: Row[] = showcase
		? framePicks.map((r) => ({ symbol: r.symbol, initial: r.initial, meta: r.meta, gain: r.gain, pct: r.pct, tone: frameTone(r.up), box: FIGURE_BOX[r.symbol] }))
		: rows.map((pick) => {
				// the return from the pick's prices and exact shares, never from its cent-rounded dollars (N29g: a dust
				// position read "+25.0%" where its prices say +24.0%)
				const ret = pickReturn(pick);
				return {
					symbol: pick.ticker,
					initial: stocks[pick.ticker]?.initial ?? companyInitial(pick.ticker),
					// a part-sold stake keeps its cents, the phones' cost-basis label (android ui/simulate/PaperPortfolio.kt:303-305;
					// N23i: "$34 stake" stood for $33.50 beside "+$6.04 · +18.0%")
					meta: `Picked ${dayLabel(pick.addedAt)} · ${stakeText(pick.stake)} stake`,
					// zero is neutral (N23h): "$0.00" and "0.0%" in the label grey, no plus sign
					gain: signedMoneyOrZero(pick.gain),
					pct: signedPctOrZero(ret),
					tone: rowTone(pick.gain, ret),
				};
			});
	const soldList: SoldRow[] = showcase
		? d.sold.rows.map((r) => ({ key: r.symbol, symbol: r.symbol, meta: r.meta, amount: r.amount, tone: frameTone(r.up), box: SOLD_BOX[r.symbol] }))
		: pf.sold.map((row) => ({
				key: `${row.ticker}-${row.soldAt}`,
				symbol: row.ticker,
				// a sale at what was paid banked no profit and realized no loss (figures.ts soldWords: "broke even")
				meta: `Sold ${dayLabel(row.soldAt)} · ${soldWords(row.pnl)}`,
				amount: signedMoneyOrZero(row.pnl),
				tone: toneOf(row.pnl, 2),
			}));
	// the pick count includes the frames' six unlisted picks the persona's ledger holds as one amount (live/ledger.ts), so
	// the persona keeps "12 picks" after the showcase (FOUNDATION-API.md section 4)
	const subtitle = showcase ? d.subtitle : `${pickCount(pf.positions.length, pf.offBook?.picks)} · ${signedMoneyOrZero(pf.allTime)} all time`;
	// before the first trade (nothing held, nothing ever sold) the page is the empty picks card alone, as on both phones
	// (android ui/simulate/SimPortfolioScreen.kt:134-137, ios Simulate/SimPortfolioView.swift:67-70); the sort chips show
	// only while there is something to sort
	const neverTraded = !showcase && live.ready && pf.positions.length === 0 && pf.sold.length === 0;
	const page: Page = frozen?.page ?? { list, soldList, subtitle };
	const sortable = page.list.length > 0;
	// below 1024 the picked lines keep one rhythm: all on one line, or all broken after the "·" (usePickedLinesFit)
	const picked = usePickedLinesFit(page.list.map((r) => r.meta).join("|"), compact);

	const pos = pf.positions.find((x) => x.ticker === symbol);
	const stock = showcase && stocks[symbol] ? stocks[symbol] : stockFor(symbol, pos?.price ?? pf.quotes[symbol]?.price ?? stocks[symbol]?.price ?? 0, pos?.quote?.changePercent ?? 0);
	// the showcase's NVDA sheet reads the frame's own figures (2:1116: 1.0152 shares, $100 stake, $124.00), like the pick page's
	const figSell = showcase && symbol === pickDetail.symbol;
	const sheet: SheetFigures | null =
		frozen?.sheet ??
		(pos
			? {
					stock,
					shares: figSell ? pickDetail.position.shares : pos.shares,
					stake: figSell ? pickDetail.position.stake : pos.stake,
					value: figSell ? pickDetail.position.value : pos.value,
					// the sale is previewed by the ledger's own arithmetic on the exact quantity held (N23e); the frame's own
					// figures are multiplied as the frame multiplies them
					exact: figSell ? undefined : { shares: pos.shares, price: pos.price, account: live.signedIn },
				}
			: null);

	// the Sell sheet only opens over a position actually held; a ?modal=sell-confirm for anything else is dropped (at
	// once: it is a correction, not a screen change) once the portfolio is known, but never under a sale in flight
	const stale = !!search.modal && live.ready && !pos && !frozen;
	useEffect(() => {
		if (stale) navigate({ to: "/simulate/portfolio", search: { variant: search.variant }, replace: true, viewTransition: false, resetScroll: false });
	}, [stale, search.variant, navigate]);

	const confirmSell = async (portion: number) => {
		if (!pos || !sheet) return;
		const request = trade.begin();
		if (!request) return;
		setRefused(null);
		setFrozen({ page: { list, soldList, subtitle }, sheet });
		try {
			// the sale's receipt (Sell success) is the confirmation, no toast over it: the sheet morphs into the receipt
			// like the prototype's "Confirm sell" (phone 1:5238 → 1:5242, SMART_ANIMATE 0.35 s ease-out; the shared
			// layers keep their identity under motion.css), and the receipt repeats this sheet's figures over the
			// pick page, which keeps the pre-sale position under it (handOffSale)
			// the portion's shares unrounded, as the pick page's own sheet sends them (PickDetail.tsx confirmSell: FOUNDATION v2's
			// request): the cash a partial sale returns is then the figure the receipt prints
			const sold = await live.actions.sell(symbol, pos.shares * portion, pos.price);
			if (!request.isCurrent()) return;
			await withMotion("smart", async () => {
				// the receipt prints the sale the store booked (`sold`: N23e), over the pick page as it was before the sale
				handOffSale(symbol, { fig: figSell, pos, shares: sheet.shares, stake: sheet.stake, value: sheet.value, exact: sheet.exact, sold });
				// (the address keeps the portion to six decimals, as the sheet's own address does: figures.ts typedForAddress)
				await navigate({ to: "/simulate/picks/$symbol", params: { symbol }, search: { modal: "sell-success", portion: round6(portion) }, replace: true, viewTransition: SMART });
			});
		} catch (error) {
			if (!request.isCurrent()) return;
			setFrozen(null);
			// a REFUSED sale is not a failed one: the sheet stays on its portion and says why (N27i / N30.3a)
			const reason = refusalFrom(error);
			if (reason) {
				setRefused(reason);
				return;
			}
			// the failed-order sheet takes the Sell sheet's place (2:1863: "Couldn't place that trade / Order not placed /
			// Prices are refreshing. Your paper cash wasn't touched." fits a sale word for word): Try again returns to the
			// Sell sheet on the same portion, Not now closes it. The position and cash are unchanged.
			await setSearch({ modal: "sell-failed", symbol, portion: round6(portion) });
		} finally {
			request.finish();
		}
	};

	return (
		<div className="sim-responsive flex flex-col items-start gap-[22px]" style={{ width: colPlus(10), marginTop: alt ? -44 : 0, minHeight: alt ? 1048 : 1004 }}>
			<div className="flex w-[186px] flex-col items-start gap-[24px] max-lg:w-full">
				{/* Back (phone 1:4997, INSTANT): the page the Portfolio was opened from, else Simulate home (D2, back.ts). The
				    alternate frame draws Back and its crumb 2 px right of
				    the column (2:1214 / 2:1217 at x 258, the title at 256): that offset is the approved 1024+ layout's; below 1024
				    they sit on the content gutter with the title, the chips and the cards (SPEC R3), as on the canonical page */}
				<InstantBack onBack={back}>
					<BackHeader crumbs={d.crumbs} to="/simulate" style={{ marginLeft: alt && !compact ? 2 : 0 }} />
				</InstantBack>
				<PageTitle title={d.title} subtitle={page.subtitle} />
			</div>

			<div className="flex w-full flex-col items-start gap-[16px]">
				<div className="flex w-full flex-col items-start gap-[28px]">
					{/* Figma clips the chip row (2:757); the clip lets the keyboard focus ring (2px + 2px offset) show. Below 1024 the
					    chips keep Figma's 8 apart, as the Leaderboard's row does (the three need 242, the narrowest column is 288), and
					    would wrap onto a second line, 8 apart again, if a column were ever narrower (SPEC R5) */}
					{sortable && (
						<div className="flex items-start gap-[8px] overflow-clip [overflow-clip-margin:4px] max-lg:flex-wrap">
							{d.chips.map((label, i) => (
								<FilterChip key={label} width={[93, 71, 62][i]} active={chip === i} activeBg={p.inner === p.card ? p.card : alt ? p.inner : p.card} onClick={() => setChip(i)}>
									{label}
								</FilterChip>
							))}
						</div>
					)}

					<div className="flex w-full flex-col items-start gap-[20px]">
						{/* "Picks table" (2:765): below 640 the card is a size container and its rows read its inside width (a size query
						    measures the content box: the card less its 20 + 20 padding, i.e. the rows' own width; `@max-[340px]` = rows
						    narrower than 340, windows under 412): where Figma's one-line row no longer fits (the frame's own strings
						    need 329: the 36 tile, "Picked May 20 · $100 stake", the two figures, the 60 Sell pill, 14 apart), the
						    figures move under the picked line, side by side on one baseline, and the row grows (SPEC R7); from 412-px
						    windows up (430, 600) the columns stay as drawn. 640 and up are untouched (no container there).
						    Below 1024 the picked line is never cut (R7), whatever the row's strings: where Figma's one-line row is kept
						    but a signed-in account's line is longer than its column ("Picked Dec 12 · $1,000 stake" beside "+$240.00" at
						    412-430), it wraps inside its column instead of being clipped as the desktop row clips it, still inside the
						    row's 56 (17 + 1 + 2 x 14 = 46; the row only grows past 56 if a line ever needed three); and no wrapped line
						    ends on one word (text-wrap: pretty: "Picked May 8 ·" / "$100 stake", not "…$100" / "stake"). Where one row's
						    line has to break, every row's breaks there (usePickedLinesFit), so the list keeps one rhythm. */}
						<div ref={picked.ref} className="flex w-full flex-col items-start overflow-clip rounded-[16px] px-[20px] py-[8px] max-sm:@container" style={{ backgroundColor: p.card }}>
							{page.list.length === 0 && (
								<p className="w-full py-[16px] font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:text-pretty">No open picks. Buy a saved company from Simulate and it lands here.</p>
							)}
							{page.list.map((pick, i) => (
								<div key={pick.symbol} className="contents">
									{i > 0 && <div className="h-px w-full bg-[rgba(255,255,255,0.06)]" />}
									<div className="flex h-[56px] w-full items-center gap-[14px] overflow-clip [overflow-clip-margin:4px] max-lg:h-auto max-lg:min-h-[56px] @max-[340px]:h-auto @max-[340px]:min-h-[56px] @max-[340px]:py-[10px]">
										{/* the row (avatar, ticker, picked line and figures) opens its pick:
										    prototype wires only the pills (phone 1:4902 … 1:4961), Simulate home's pick row (1:4375) opens the pick too.
										    No hover or pressed look: Figma's rows are plain frames (no variant, no reaction); the keyboard focus ring stays */}
										<Link
											to="/simulate/picks/$symbol"
											params={{ symbol: pick.symbol }}
											viewTransition={false}
											className="flex min-w-px flex-1 cursor-pointer items-center gap-[14px] overflow-clip @max-[340px]:grid @max-[340px]:grid-cols-[36px_minmax(0,1fr)] @max-[340px]:gap-x-[14px] @max-[340px]:gap-y-[6px]"
										>
											<Avatar letter={pick.initial} size={36} radius={10} bg={p.inner} className="@max-[340px]:row-span-2" />
											<div className="flex min-w-px flex-1 flex-col items-start gap-px overflow-clip whitespace-nowrap max-lg:whitespace-normal max-lg:[overflow-wrap:anywhere]">
												<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{pick.symbol}</p>
												<p data-picked-line={compact ? pick.meta : undefined} className="font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:text-pretty">
													<PickedLine meta={pick.meta} split={!picked.oneLine} />
												</p>
											</div>
											<div
												className="flex flex-col items-end gap-px overflow-clip whitespace-nowrap @max-[340px]:col-start-2 @max-[340px]:flex-row @max-[340px]:flex-wrap @max-[340px]:items-baseline @max-[340px]:gap-x-[8px]"
												style={{ color: toneColor(pick.tone, { up: GREEN, down: RED }) }}
											>
												<p className="font-geist text-[13px] font-medium leading-[17px]" style={pick.box ? { width: pick.box[0] } : undefined}>
													{pick.gain}
												</p>
												<p className="font-geist text-[11px] leading-[14px]" style={pick.box ? { width: pick.box[1] } : undefined}>
													{pick.pct}
												</p>
											</div>
										</Link>
										{/* The pill opens its pick's page, Instant, whose own Sell opens the sell sheet (2:1458), as both phones and the
										    prototype wire it (1:4876 -> 1:5003; the user's rule of 2026-10-07: the wiring decides where a control
										    goes, the frames how it looks). The sheet 2:1116 draws over this list stays reachable by its address. */}
										<SmallSellButton pick={pick.symbol} aria-label={`Sell ${pick.symbol}`}>
											{d.sell}
										</SmallSellButton>
									</div>
								</div>
							))}
						</div>

						{!neverTraded && (
						<div
							className="flex w-full flex-col items-start gap-[10px] overflow-clip rounded-[16px] px-[20px] py-[16px] whitespace-nowrap"
							style={{ backgroundColor: p.card }}
						>
							<Eyebrow>{d.sold.eyebrow}</Eyebrow>
							{page.soldList.length === 0 && <p className="font-geist text-[11px] leading-[14px] text-[#819abb]">Nothing sold yet.</p>}
							{page.soldList.map((row) => (
								// a sold pick opens its company's page (coordinator decision D1: sold rows open their stock pages), where it
								// can be read about or bought again; Instant like the rest of these screens. Same row, same pixels: the row
								// itself is the link (the phones' realized rows open nothing; the web goes further by ruling)
								<Link
									key={row.key}
									to="/stocks/$symbol"
									params={{ symbol: row.symbol }}
									viewTransition={false}
									className="sim-sold-row flex h-[24px] w-full cursor-pointer items-center justify-between overflow-clip"
								>
									<div className="flex items-center gap-[10px] overflow-clip">
										<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{row.symbol}</p>
										{/* phones only: below 640 the sold rows wrap (`sim-sold-row`); from 640 they keep Figma's one line, and
										    `text-wrap: pretty` (a shorthand that also turns wrapping on) must not change that */}
										<p className="font-geist text-[11px] leading-[14px] text-[#819abb] max-sm:text-pretty">{row.meta}</p>
									</div>
									<p className="font-geist text-[13px] font-medium leading-[17px]" style={{ color: toneColor(row.tone, { up: GREEN, down: RED }), ...(row.box ? { width: row.box } : {}) }}>
										{row.amount}
									</p>
								</Link>
							))}
						</div>
						)}
					</div>
				</div>
				{/* the footnote (2:849) wraps below 1024 and never ends on one word ("…balance, gain or" / "loss." at 360); the
				    never-traded page has nothing to sell yet and leaves it out, as the phones do */}
				{!neverTraded && <p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:text-pretty">{d.footnote}</p>}
			</div>

			{search.modal === "sell-confirm" && sheet && (
				// the prototype opens its sheets Instant (phone 1:5066 Sell → 1:5070, no transition): the sheet opens with
				// appear="instant" (sheets.tsx, motion.css), so nothing is forced from here any more
				<PortfolioSellSheet
					pending={trade.pending}
					symbol={symbol}
					stock={sheet.stock}
					shares={sheet.shares}
					stake={sheet.stake}
					value={sheet.value}
					exact={sheet.exact}
					initialPortion={search.portion}
					refusal={refused}
					// the portion chosen lives in the address, so a reload with the sheet open keeps it (N29f)
					onPortion={(portion) => {
						setRefused(null);
						if (portion !== search.portion) void setSearch({ modal: "sell-confirm", symbol: search.symbol, portion });
					}}
					onConfirm={confirmSell}
					onClose={() => {
						setRefused(null);
						return setSearch({});
					}}
				/>
			)}
			{search.modal === "sell-failed" && sheet && (
				// a sale that could not be placed (an account's write failed): Try again returns to the Sell sheet on the same
				// portion (Smart Animate, as the buy flow's retry), Not now closes it (Instant)
				<BuyFailedSheet
					motion
					stock={sheet.stock}
					onRetry={() => setSearch({ modal: "sell-confirm", symbol, portion: search.portion })}
					onClose={() => setSearch({})}
				/>
			)}
		</div>
	);
}
