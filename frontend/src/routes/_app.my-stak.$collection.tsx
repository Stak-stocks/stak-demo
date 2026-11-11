import { createFileRoute, Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { type MouseEvent, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { D } from "@/app/discover/assets";
import { col, useSizeClass } from "@/app/FitCanvas";
import { COLLECTION_DESCRIPTIONS, companyInitial, companyName } from "@/app/live/catalog";
import { useCollections } from "@/app/live/collections";
import { changeShort, money, pct1, signedPct } from "@/app/live/format";
import { usePriceHistories } from "@/app/live/history";
import { type Quote, useQuotes } from "@/app/live/quotes";
import { useShowcase } from "@/app/live/showcase";
import { useLive } from "@/app/live/store";
import { MS } from "@/app/mystak/assets";
import { COLLECTION_ICONS, COLLECTION_PAGE, FRAME_BOTTOM, REMOVE, SHOWCASE } from "@/app/mystak/data";
import { DashedOutline } from "@/app/mystak/DashedOutline";
import { collectionBack } from "@/app/mystak/nav";
import { figuresFromSeries } from "@/app/mystak/performance";
import { inFrameOrder, removeFromStak } from "@/app/mystak/remove";
import { useLongPress } from "@/app/mystak/useLongPress";
import { previousAppPath } from "@/app/stocks/origin";
import { raisePill } from "@/app/stocks/pageToast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/my-stak/$collection")({
	component: CollectionPage,
});

/**
 * Figma 2:4830 "Desktop · Collection · AI & Tech" (1440x1092): the collection's saves as 300-wide cards,
 * three per row, the dashed "Add stock" tile closing the last row. Prices and moves are today's quotes.
 * Every collection takes this template (the frame draws AI & Tech): its own cover or glyph, name, count, the week's move
 * across its saves (the frame's "+2.4% this week", read from the shared price history), description, cards.
 *
 * Every card is a stock the person holds (mystak audit item 5; the phones' tiles are the held stocks, android
 * ui/mystak/Collections.kt:180 `held()`, iOS MyStak/CollectionView.swift:38). The untouched showcase is the frame's own
 * page (D7): its AI & Tech lists the frame's NVIDIA, Apple, Microsoft, Alphabet and AMD (SHOWCASE.collections); the
 * first edit of that page makes it what the person was looking at (./app/mystak/remove.ts), and the signed-out
 * persona keeps the frame's order and names for those stocks afterwards, so nothing on the page jumps.
 *
 * Remove (mystak audit item 9; android ui/mystak/CollectionScreen.kt:83-86, 158-184, 237-238; iOS
 * CollectionView.swift:33-36, 92-116, 181-186): a long press on a card (finger, pen or mouse), or the Delete key on a
 * focused card (the phones' named accessibility action "Remove from My STAK"), shows the inline confirm row
 * "Remove NVDA from My STAK?" · Keep · Remove between the hero and the grid. Remove is the stock page's Unsave (the
 * same live action, the deck's saved mark cleared with it, the same "Removed from My STAK" toast); Keep, Escape or a
 * second press elsewhere leaves everything as it was. Focus moves into the row (Keep) and comes back to the card
 * (Keep) or to the card that takes the removed one's place (Remove).
 *
 * Back (2:4904; D2): steps back through the history to the overview that opened the page, or to another of the app's
 * pages before it, as the phones pop their stack; a direct landing, or a stock page before it (the stock's own Back
 * brought the person here), goes on to the overview, the page's natural parent (./app/mystak/nav.ts collectionBack).
 *
 * Below 1024 (SPEC R3 / R7): the hero block (49.142 % of the frame's column) fills the column up to its 458, the crumb
 * may wrap instead of running past the window (between its segments, never inside a name), and the card grid keeps
 * the frame's three columns while three fit, then two, then one: a column is never narrower than the card's top row
 * needs (STOCK_CARD_MIN), so the move stays on the badge's row as 2:4921 draws it; the frame's bottom padding goes (the
 * shell's own 32 gutter ends the page there, CORE-API section 4). The phone frame of this screen (page "mobile updated"
 * 1:3680) keeps the desktop's order: hero, then the grid with the Add card last; the confirm row sits between them as
 * on the phones.
 */
function CollectionPage() {
	const { collection: slug } = Route.useParams();
	const navigate = useNavigate();
	const router = useRouter();
	const fromOverview = useLocation({ select: (l) => l.state.mystakFromOverview === true });
	// the entry before this one, read once per page (it does not change while the page shows)
	const basepath = router.options.basepath ?? "/";
	const previous = useMemo(() => (slug ? previousAppPath(basepath) : null), [basepath, slug]);
	const backTo = collectionBack(fromOverview, previous);
	const live = useLive();
	const c = useCollections();
	const group = c.byPath(slug);
	/** the untouched demo persona sees the frame's own AI & Tech collection (2:4830, live/showcase.ts) */
	const showcase = useShowcase();
	const frame = group ? SHOWCASE.collections[group.slug] : undefined;
	const authored = showcase ? frame : undefined;
	// the signed-out persona keeps the frame's order and names for the frame's stocks after the showcase too
	const persona = !live.signedIn && !!frame;
	const tickers = useMemo(
		() => (authored ? authored.stocks.map((s) => s.ticker) : group ? (persona ? inFrameOrder(group.tickers, group.slug) : group.tickers) : []),
		[authored, group, persona],
	);
	const authoredQuotes = useQuotes(authored ? tickers : []);
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";
	const week = useCollectionWeek(authored ? [] : tickers);
	const [removing, setRemoving] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const gridRef = useRef<HTMLDivElement>(null);
	// where focus goes once the confirm row closes: back to its card (Keep) or to the card in its place (Remove)
	const refocus = useRef<{ ticker: string; index: number } | null>(null);
	const hintId = useId();
	useEffect(() => {
		if (!group) navigate({ to: "/my-stak", replace: true });
	}, [group, navigate]);
	// a stock that left the collection some other way takes its confirm row with it
	if (removing && !tickers.includes(removing)) setRemoving(null);
	useLayoutEffect(() => {
		const next = refocus.current;
		if (!next || removing) return;
		refocus.current = null;
		const cards = Array.from(gridRef.current?.querySelectorAll<HTMLElement>("[data-mystak-card]") ?? []);
		const same = cards.find((el) => el.dataset.mystakCard === next.ticker);
		const target = same ?? cards[Math.min(next.index, cards.length - 1)] ?? gridRef.current?.querySelector<HTMLElement>("[data-mystak-add]");
		target?.focus();
	});
	if (!group) return null;

	// 2:4910: the collection's own cover (the card's image fill, transparent around the subject) at 54px, radius 12,
	// straight on the page; Figma draws AI & Tech's, every other collection shows its card icon the same way
	const icon = COLLECTION_ICONS[group.slug].icon;
	const named = showcase || persona ? frame : undefined;
	const names: Record<string, string> = Object.fromEntries((named?.stocks ?? []).map((s) => [s.ticker, s.name]));
	const changeWidths: Record<string, number> = Object.fromEntries((named?.stocks ?? []).map((s) => [s.ticker, s.changeWidth]));
	const quoteOf = (t: string) => authoredQuotes[t] ?? c.quotes[t] ?? null;
	const crumb = COLLECTION_PAGE.crumbParts(group.name, compact);

	const back = (e: MouseEvent<HTMLAnchorElement>) => {
		// D2: the overview that opened this page (or another app page) is the entry before: step back to it (no new entry).
		// Otherwise the link goes to the overview itself; a modified click keeps the link's own way (a new tab ...)
		if (!backTo.step || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		router.history.back();
	};
	const askRemove = (ticker: string) => {
		if (pending) return;
		setRemoving(ticker);
	};
	const keep = () => {
		if (!removing) return;
		refocus.current = { ticker: removing, index: tickers.indexOf(removing) };
		setRemoving(null);
	};
	const remove = () => {
		const T = removing;
		if (!T || pending) return;
		setPending(true);
		// set before the write: a guest's lands at once and the row closes with the card (the check above), and focus then
		// goes to the card that took the removed one's place (or the one before it, or Add stock)
		refocus.current = { ticker: "", index: tickers.indexOf(T) };
		removeFromStak(live, T, { showcase, collection: group.slug, priceOf: (t) => quoteOf(t)?.price ?? null }).then(
			() => {
				setPending(false);
				setRemoving(null);
				// the pill keeps clear of the page's controls, as every transient pill (BUILD-PLAN N36.3a; stocks/pageToast.ts raisePill)
				raisePill(REMOVE.toast, { icon: <img alt="" src={D.bookmark} className="size-[17px]" /> });
			},
			() => {
				setPending(false);
				raisePill(REMOVE.failed);
			},
		);
	};

	return (
		<div className="flex flex-col items-start gap-[37px] max-lg:pb-0!" style={{ width: col(932), paddingBottom: FRAME_BOTTOM.collection }}>
			<div className="relative flex flex-col items-start gap-[31px]">
				{/* "Back" (2:4904): the phone prototype sends it to the overview at once (1:3697 -> 1:3501, instant); D2 steps back
				    to the overview that opened the page or another app page before it, never to a stock page whose own Back led
				    here (collectionBack). Figma defines no hover or pressed look for it (no variant, no "change to"),
				    so none is drawn. Active only on the overview itself, so it never claims aria-current="page" here (the rail's
				    My STAK row is the current page) */}
				<Link
					to="/my-stak"
					activeOptions={{ exact: true }}
					viewTransition={false}
					onClick={back}
					aria-label={backTo.toOverview ? COLLECTION_PAGE.back : COLLECTION_PAGE.backElsewhere}
					className="flex size-[40px] cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
				>
					<img alt="" src={MS.back} className="size-[22px]" width={22} height={22} />
				</Link>
				{/* 2:4907, one text line as Figma draws it: "My STAK" and "Collections" lead to the overview (mystak audit item 10,
				    "no visual change"), the collection's own name is the current page. The line itself stays the single text
				    element it was, where it was (a line split into elements places each piece on the layout's 1/64 px grid and
				    redraws a glyph or two a sub-pixel off; a wrapper around it moved the zoomed page below by 1/64 px at
				    1280): the crumb that is read, focused and clicked lies over it in the same type, its text transparent,
				    at the line's own place (Back's 40 and the column's 31 gap above it), so each link covers its own words and
				    shows the shared focus ring around them. Below 1024 both wrap the same way: same text, same width (2 px of slack:
				    the pieces' widths, each on the 1/64 grid, add up a hair wider than the single line) */}
				<p aria-hidden="true" className="whitespace-pre font-geist text-[16px] font-medium leading-[21px] text-[#819abb] max-lg:whitespace-pre-wrap">
					{compact ? COLLECTION_PAGE.crumbWhole(group.name) : COLLECTION_PAGE.crumb(group.name)}
				</p>
				<nav
					aria-label={COLLECTION_PAGE.crumbLabel}
					className="absolute left-0 top-[71px] w-max max-w-[calc(100%+2px)] whitespace-pre font-geist text-[16px] font-medium leading-[21px] text-transparent max-lg:whitespace-pre-wrap"
				>
					<Link to="/my-stak" activeOptions={{ exact: true }} viewTransition={false} className="cursor-pointer">
						{crumb.stak}
					</Link>
					<span>{crumb.sep}</span>
					<Link to="/my-stak" activeOptions={{ exact: true }} viewTransition={false} className="cursor-pointer">
						{crumb.collections}
					</Link>
					<span>{crumb.sep}</span>
					<span aria-current="page">{crumb.own}</span>
				</nav>
			</div>
			<div className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-[49.142%] flex-col items-start gap-[17px] max-lg:w-full max-lg:max-w-[458px]">
					<img alt="" src={icon} className="size-[54px] rounded-[12px] object-cover" />
					<div className="flex w-full flex-col items-start gap-[10px]">
						<div className="flex w-full flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
							<h1 className="font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{group.name}</h1>
							<div className="flex items-center gap-[7px] overflow-clip text-[13px] leading-[17px]">
								<span className="font-geist text-[#819abb]" style={authored ? { width: authored.metaWidths[0] } : undefined}>
									{authored ? `${authored.stocks.length} stocks` : group.countLabel}
								</span>
								{authored ? (
									<>
										<span className="font-geist text-[#5c6b85]" style={{ width: authored.metaWidths[1] }}>
											·
										</span>
										<span className="font-geist font-medium text-[#2fd08a]">{authored.meta}</span>
									</>
								) : (
									week !== null && (
										<>
											<span className="font-geist text-[#5c6b85]">·</span>
											<span className={cn("font-geist font-medium", week < 0 ? "text-[#ff5a6a]" : "text-[#2fd08a]")}>{signedPct(week)} this week</span>
										</>
									)
								)}
							</div>
						</div>
						<p className="w-full font-geist text-[13px] leading-[17px] text-[#c8d2e0]">{COLLECTION_DESCRIPTIONS[group.slug]}</p>
					</div>
				</div>
				{removing && <RemoveConfirm ticker={removing} pending={pending} onKeep={keep} onRemove={remove} />}
				{/* three 300px columns with 16px gaps (2:4830); the dashed "Add stock" tile closes the list. Below 1024 the
				    columns are as many as fit at STOCK_CARD_MIN (156.4) or more, three at most: two from a 361 window,
				    three from 534 (every tablet) */}
				<div
					ref={gridRef}
					className="grid w-full grid-cols-3 gap-[16px] max-lg:[grid-template-columns:repeat(auto-fill,minmax(min(100%,max(156.4px,calc(33.333%_-_10.667px))),1fr))]"
				>
					{tickers.map((ticker, i) => (
						<StockCard
							key={ticker}
							ticker={ticker}
							name={names[ticker]}
							changeWidth={changeWidths[ticker]}
							quote={quoteOf(ticker)}
							first={i === 0}
							collection={group.slug}
							hintId={hintId}
							onRemove={() => askRemove(ticker)}
						/>
					))}
					<AddStockTile />
				</div>
				{/* the cards' description: how to reach Remove without a long press (read after each card's own name). Hidden:
				    a description source only (aria-describedby reads hidden text), never a stray line of its own in browse mode */}
				<p id={hintId} hidden>
					{REMOVE.hint}
				</p>
			</div>
		</div>
	);
}

/**
 * The collection's move this week (2:4917 "+2.4% this week" for the frame's own page): the equal-weight average of its
 * saves' one-week moves, from the one shared price history (D3: the STAK API's closes when it answers, otherwise the
 * demo series that ends at each company's quote). Null with nothing to measure (an emptied collection).
 */
function useCollectionWeek(tickers: readonly string[]): number | null {
	const hs = usePriceHistories(tickers, "1W", { enabled: tickers.length > 0 });
	return useMemo(() => {
		if (hs.status === "loading") return null;
		return figuresFromSeries(Object.values(hs.bySymbol).map((h) => ({ ticker: h.symbol, prices: h.points }))).value;
	}, [hs]);
}

/**
 * The phones' inline confirm row (CollectionScreen.kt:158-184: a #181F30 row, r12, 14 / 12 padding, Geist Medium 13 —
 * the question in white, Keep in #819ABB, Remove in the page's down red), drawn in the desktop frame's card style: the
 * collection's #181F30 fill, the overview's 14 radius ("Your read", 2:4824), 20 / 16 padding, Geist Medium 14; the two
 * answers are 32 tall and 8 apart (SPEC R8: under 44, reported, never closer than 8). A group named by its question;
 * focus starts on Keep (the safe answer) and Escape keeps.
 * Remove's red is the desktop frames' text red #FF5A6A (My STAK's "Worst -0.5%", 2:4823; the portfolio's losses): 5.42:1
 * on the row's #181F30, AA for its 14 px label. The phones' RedDown #E5484D (the collection card's "▼ 0.4%", 2:4943)
 * reads 4.20:1 there, under AA (review 1).
 */
function RemoveConfirm({ ticker, pending, onKeep, onRemove }: { ticker: string; pending: boolean; onKeep: () => void; onRemove: () => void }) {
	const questionId = useId();
	const keepRef = useRef<HTMLButtonElement>(null);
	// focus moves to the safe answer (and brings the row into view when the card was far below it)
	useLayoutEffect(() => {
		keepRef.current?.focus();
	}, [ticker]);
	return (
		// biome-ignore lint/a11y/useSemanticElements: an inline confirm row, not a form field group (a fieldset would need a legend)
		<div
			role="group"
			aria-labelledby={questionId}
			data-mystak-confirm={ticker}
			onKeyDown={(e) => {
				if (e.key !== "Escape") return;
				e.preventDefault();
				onKeep();
			}}
			className="flex w-full items-center gap-[12px] rounded-[14px] bg-[#181f30] px-[20px] py-[16px] max-sm:flex-wrap max-sm:gap-y-[6px]"
		>
			<p id={questionId} className="min-w-px flex-1 font-geist text-[14px] font-medium leading-[18px] text-white">
				{REMOVE.question(ticker)}
			</p>
			<span className="flex items-center gap-[8px] max-sm:ml-auto">
				<button
					ref={keepRef}
					type="button"
					disabled={pending}
					onClick={onKeep}
					className="cursor-pointer rounded-[8px] px-[10px] py-[7px] font-geist text-[14px] font-medium leading-[18px] text-[#819abb] disabled:cursor-not-allowed disabled:opacity-60"
				>
					{REMOVE.keep}
				</button>
				<button
					type="button"
					disabled={pending}
					onClick={onRemove}
					className="cursor-pointer rounded-[8px] px-[10px] py-[7px] font-geist text-[14px] font-medium leading-[18px] text-[#ff5a6a] disabled:cursor-not-allowed disabled:opacity-60"
				>
					{REMOVE.remove}
				</button>
			</span>
		</div>
	);
}

/**
 * "Stock card" (2:4921 …): the phone prototype opens the saved stock's detail at once (1:3723 -> 1:3846, instant), as a
 * My STAK entry (My STAK stays highlighted, its Back returns here: phone 1:4029 -> 1:3680). No hover or pressed look:
 * Figma defines none for the card. A long press (or Delete while it has focus) asks to remove it (`onRemove`): its
 * description (`hintId`) says so; the browser's own long-press menu and text selection give way on it (nothing drawn).
 *
 * Below 1024:
 * - STOCK_CARD_MIN = 156.4, the narrowest card whose top row ("tr": the badge left, the move right) keeps both on one
 *   line: 20 + 20 padding, the 50.4 badge, 8 of air and the widest move box of the frame (GOOGL's 58, 2:4953; the
 *   live one-digit moves measure 57.9 at most). The grid never makes a column narrower (the class above). A move of
 *   two digits ("▲ 12.3%") still has R7's second line (the row wraps under the badge) where a column is that tight.
 * - Height: Figma's card is a fixed 195 frame whose content (176) runs into its 20 bottom padding, and the 1440 card's
 *   by 1.39 (the badge's 50.39 and the price's whole-pixel 27 box). Here the card grows with its content (a move on a
 *   second line) instead of letting it overflow, so the bottom padding gives up those same 1.39: the card is 195 until
 *   its content grows, then exactly that much taller, and its row's cards and the Add tile stretch with it.
 * - The company name is ONE line at every width, as the frame draws it (nowrap, 2:4928), a longer one ending in an
 *   ellipsis: the prices of a row share a baseline (the hunt's VIS-08, ruling N30.8o).
 */
function StockCard({
	ticker,
	name,
	changeWidth,
	quote,
	first,
	collection,
	hintId,
	onRemove,
}: {
	ticker: string;
	name?: string;
	changeWidth?: number;
	quote: Quote | null;
	first: boolean;
	collection: string;
	hintId: string;
	onRemove: () => void;
}) {
	const up = (quote?.changePercent ?? 0) >= 0;
	const press = useLongPress(onRemove);
	// The link's name is read in the frame's order, ticker, company, move, price, with the move spoken ("up 2.4%") from a
	// hidden span: the DOM draws the move first, so screen readers announced "black up-pointing triangle 2.4 percent NVDA"
	// (mystak review 2). aria-labelledby replaces the content name; nothing changes on screen.
	const nameId = useId();
	return (
		<Link
			to="/stocks/$symbol"
			params={{ symbol: ticker }}
			search={{ saved: 1, from: "my-stak", collection }}
			viewTransition={false}
			data-mystak-card={ticker}
			aria-describedby={hintId}
			aria-labelledby={quote ? `${nameId}-t ${nameId}-n ${nameId}-m ${nameId}-p` : `${nameId}-t ${nameId}-n ${nameId}-p`}
			aria-keyshortcuts="Delete"
			{...press}
			className="flex h-[195px] min-w-0 cursor-pointer select-none flex-col items-start gap-[14px] overflow-clip rounded-[22.4px] bg-[#181f30] p-[20px] [-webkit-touch-callout:none] max-lg:h-auto max-lg:min-h-[195px] max-lg:pb-[18.61px]"
		>
			<span className="flex w-full items-center justify-between overflow-clip max-lg:flex-wrap max-lg:gap-[8px]">
				<LetterBadge ticker={ticker} />
				{quote && (
					<>
						<span
							className={cn("whitespace-nowrap font-geist text-[16.8px] font-medium leading-[22px]", up ? "text-[#2fd08a]" : "text-[#e5484d]")}
							style={changeWidth ? { width: changeWidth } : undefined}
						>
							{changeShort(quote.changePercent)}
						</span>
						<span id={`${nameId}-m`} hidden>
							{up ? "up" : "down"} {pct1(quote.changePercent)}
						</span>
					</>
				)}
			</span>
			<span className="flex w-full flex-col items-start gap-[3px] overflow-clip whitespace-nowrap">
				<span id={`${nameId}-t`} className="font-sora text-[22.4px] font-semibold leading-[28px] text-white">{ticker}</span>
				{/* one line at every width, a longer name ending in an ellipsis: the frame's own nowrap (2:4928). Below 1024 it
				    wrapped instead ("Brinker International (Chili's)" on three lines of a phone card), so the prices of one row
				    stood on different baselines and the rows came out 234 / 214 / 194 tall (the hunt's VIS-08, ruling N30.8o).
				    The link's name still reads the whole company name (aria-labelledby takes the text, not what fits) */}
				<span id={`${nameId}-n`} className="w-full truncate font-geist text-[15.4px] leading-[20px] text-[#819abb]">{name ?? companyName(ticker)}</span>
			</span>
			{/* 2:4929 is Sora SemiBold in a 26px box, the other prices (2:4938 …) Sora Medium in 26.6px boxes */}
			<span id={`${nameId}-p`} className={cn("whitespace-nowrap font-sora text-[21px] text-white", first ? "font-semibold leading-[26px]" : "font-medium leading-[26.6px]")}>
				{quote ? money(quote.price) : "—"}
			</span>
		</Link>
	);
}

/**
 * "B" (2:4923 …): the company's initial in a 50.4px circle, a text layer in a filled frame, so it is code with the
 * frame's values: circle #242B3D radius 25.2, Sora SemiBold 19.6 #9EADC7 centred by auto layout (the "N" text box
 * 17 x 25 sits at 16.7 / 12.7 inside the badge). The frame's letters (N, A, M, G, A) are the catalog's company
 * initials. Decorative: the ticker and the company name follow it.
 */
function LetterBadge({ ticker }: { ticker: string }) {
	return (
		<span aria-hidden="true" className="flex size-[50.4px] shrink-0 items-center justify-center overflow-clip rounded-[25.2px] bg-[#242b3d]">
			<span className="whitespace-nowrap font-sora text-[19.6px] font-semibold leading-[25px] text-[#9eadc7]">{companyInitial(ticker)}</span>
		</span>
	);
}

/**
 * "Add card" (2:4967): a 2.1px INSIDE stroke #2A3346, dash pattern 8.4 / 7 (read from the layer), around a
 * radius-22.4 tile, laid out like Figma lays it (DashedOutline); its icon and label are centred with an 11px gap.
 * No prototype wiring on either page; the label names the deck, where stocks are saved (/discover), reached at
 * once like every page-to-page edge of the prototype. No hover or pressed look: Figma defines none.
 * Below 1024 it is as tall as the row it closes (195 at least, as at 1440, where both are 195): a stock card beside it
 * that grows (a two-digit move on a second line) takes the tile with it, so the row's bottom edges line up; the outline
 * redraws to it.
 */
function AddStockTile() {
	return (
		<Link
			to="/discover"
			viewTransition={false}
			data-mystak-add=""
			className="relative flex h-[195px] min-w-0 cursor-pointer flex-col items-center justify-center gap-[11px] overflow-clip rounded-[22.4px] p-[20px] max-lg:h-auto max-lg:min-h-[195px]"
		>
			<DashedOutline />
			<img alt="" src={MS.plusCircle} className="size-[33.6px]" />
			<span className="whitespace-nowrap font-geist text-[18.2px] font-medium leading-[24px] text-[#819abb]">{COLLECTION_PAGE.addStock}</span>
		</Link>
	);
}
