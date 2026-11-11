import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { D } from "@/app/discover/assets";
import { demoQuote, isShowcase, normalizeTicker, type OrderRefusal, refusalOf, SHOWCASE_CASH, useLive } from "@/app/live";
import { removeFromStak } from "@/app/mystak/remove";
import { NotFound } from "@/app/NotFound";
import { BuyFailedSheet } from "@/app/simulate/sheets";
import { useTradeRequest } from "@/app/simulate/useTradeRequest";
import { useAnalystOpen, useCompareOpen } from "@/app/stocks/analystOpen";
import type { StockDetailData } from "@/app/stocks/data";
import { useDeckAwareSave } from "@/app/stocks/deckSave";
import { ExampleDetail } from "@/app/stocks/ExampleDetail";
import { useStockDetail } from "@/app/stocks/live";
import { OrderFilledSheet } from "@/app/stocks/OrderFilledSheet";
import { usePageOrigin } from "@/app/stocks/origin";
import { usePageToast } from "@/app/stocks/pageToast";
import { PracticeBuySheet } from "@/app/stocks/PracticeBuySheet";
import { StockDetail } from "@/app/stocks/StockDetail";
import { StockDetailSkeleton } from "@/app/stocks/StockDetailSkeleton";
import { PUSH_FORWARD, runTransition } from "@/app/stocks/transitions";

type StockSearch = {
	saved?: 1;
	open?: 1;
	ticket?: 1;
	sheet?: 1;
	from?: "discover" | "my-stak";
	/** slug of the My STAK collection the detail was opened from (Back returns there) */
	collection?: string;
	/** the practice-buy ticket was confirmed: "Order filled" sheet */
	filled?: 1;
	loading?: 1;
	/** `example`: the two-column layout of 00 References 2:6311 (and its centered ticket 2:6486 with ?ticket=1) */
	variant?: "example";
};

// the number 1, not true: the router writes it back as ?ticket=1 (a boolean became ?ticket=true and a second navigation)
const flag = (v: unknown) => (v === true || v === 1 || v === "1" || v === "true" ? (1 as const) : undefined);

/** 2:4007 / 2:4161: the ticket over a Discover entry dims the page with #000 @66% ("Frame 1618869194"). */
const TICKET_SCRIM = "rgba(0,0,0,0.66)";
/** 2:5402: the ticket opened from an unsaved My STAK entry stacks two scrims, #000 @66% and #030409 @55% (about 85%). */
const MY_STAK_TICKET_SCRIM = "linear-gradient(rgba(3,4,9,0.55), rgba(3,4,9,0.55)), rgba(0,0,0,0.66)";
/** 2:5247: the sheet over a saved My STAK entry (2:5130) is one #030409 @83% scrim ("Frame 1618869273") over undimmed cards. */
const MY_STAK_SHEET_SCRIM = "rgba(3,4,9,0.83)";

export const Route = createFileRoute("/_app/stocks/$symbol")({
	validateSearch: (s: Record<string, unknown>): StockSearch => ({
		saved: flag(s.saved),
		open: flag(s.open),
		ticket: flag(s.ticket),
		sheet: flag(s.sheet),
		from: s.from === "my-stak" ? "my-stak" : undefined,
		collection: typeof s.collection === "string" && s.collection ? s.collection : undefined,
		filled: flag(s.filled),
		loading: flag(s.loading),
		variant: s.variant === "example" ? "example" : undefined,
	}),
	component: StockPage,
});

/** "Scrim" 2:6626 of the EXAMPLE modal: #02050e at 66 %, over the content area only (src/app/stocks/ticket.css places it). */
const EXAMPLE_SCRIM = "rgba(2,5,14,0.66)";

/** `holding`: the shares of the company held after the fill, the figure "You now hold" prints (discover-stock #9). */
type Phase = { kind: "idle" } | { kind: "buy" } | { kind: "failed" } | { kind: "filled"; holding: number; cash: number };

/**
 * Figma "Desktop · Stock detail" for any catalog ticker. Previews for the capture harness:
 * ?saved=1 (SINCE YOU SAVED, Unsave), ?open=1 (analyst view unfolded), ?ticket=1 (the ticket over
 * the dimmed page), ?from=my-stak (flowing header, "My STAK / AAPL"), ?sheet=1 (darker scrim),
 * ?filled=1 (the order-filled sheet), ?loading=1 (the skeleton). Real actions write the live state
 * and clear the preview they replace.
 */
function StockPage() {
	const { symbol } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate();
	const router = useRouter();
	const live = useLive();
	// a Save on a deck card's own page is that card's deck decision (discover-stock #5)
	const store = useDeckAwareSave();
	// where the page was opened from: Back returns there (D2, discover-stock #11)
	const origin = usePageOrigin();
	// a frame preview of the URL shows the frames' own copy on the design's ticker (discover-stock #8). ?saved=1 is a
	// preview only while the company is not saved: My STAK's cards link a real save with it, and a real save reads as one
	const framePreview = !!(search.open || search.ticket || search.sheet || search.filled || (search.saved && !live.savedTickers.has(normalizeTicker(symbol))));
	const detail = useStockDetail(symbol, { previewSaved: !!search.saved, preview: framePreview });
	const [phase, setPhase] = useState<Phase>({ kind: "idle" });
	// the Analyst view's open state, kept per history entry: Back, Forward and a reload draw it as it was left there, before
	// the router puts the window back (the phones' rememberSaveable; src/app/stocks/analystOpen.ts)
	const [open, setOpen] = useAnalystOpen(symbol);
	// Compare and learn's, kept the same way (the phones' rememberSaveable, android StockDetailScreen.kt:784)
	const [compareOpen, setCompareOpen] = useCompareOpen(symbol);
	const compare = { open: compareOpen, onToggle: () => setCompareOpen(!compareOpen) };
	// the look Save / Unsave just switched to, held while the store and the URL catch up (a signed-in save answers
	// asynchronously), so the Smart Animate below has its new state at once; dropped as soon as they agree
	const [savedLook, setSavedLook] = useState<boolean | null>(null);
	if (savedLook !== null && savedLook === detail.saved) setSavedLook(null);
	const saved = savedLook ?? detail.saved;
	/*
	 * The page as the ticket showed it, held from Confirm until the result sheet closes: a buy saves the company (D5,
	 * FOUNDATION-API section 4), which would turn the page under the scrim into its saved look (and, on the design's AAPL,
	 * into its catalog figures) while the receipt is up, but the prototype's confirm -> result pairs draw the same page
	 * under both (1:3764 -> 1:4216, 1:3805 -> 1:4249). "Keep exploring" then dissolves into the page as it now is.
	 */
	const [frozen, setFrozen] = useState<{ stock: StockDetailData; saved: boolean } | null>(null);
	const pageSaved = frozen?.saved ?? saved;
	// the Save / Unsave toast: Figma draws one toast at a time (2:3234), so the next one replaces it, and it leaves with
	// the page it rose on (Back, a link, another stock), as the deck's toast leaves with its card (N17c)
	const pageToast = usePageToast(normalizeTicker(symbol));
	// the preview sheets of the URL (?ticket / ?sheet / ?filled) the person has closed: they stay down while the URL
	// catches up, and the next preview shows again once the URL has dropped them
	const flags = (search.ticket ? "t" : "") + (search.sheet ? "s" : "") + (search.filled ? "f" : "");
	const [dismissed, setDismissed] = useState("");
	if (dismissed && !flags) setDismissed("");
	const preview = dismissed === flags ? "" : flags;
	const trade = useTradeRequest(`${live.uid ?? "guest"}:${symbol}:${phase.kind}:${flags}`);
	const saving = useRef(false);

	// the 00 References EXAMPLE layout (2:6311 / 2:6486) has no loading frame of its own: while the page is not ready it
	// paints nothing rather than the product detail's skeleton (2:2113), which would jump to a different layout
	if (search.loading || (detail.loading && !search.ticket)) return search.variant === "example" ? null : <StockDetailSkeleton />;
	if (!detail.known) return <NotFound />;

	const { data: stock, quote } = detail;
	const from = search.from ?? "discover";
	const price = quote?.price ?? 0;
	// clearing a preview flag from the URL: the page has already changed (inside its own transition), so no route dissolve
	const update = (patch: StockSearch) =>
		navigate({ to: "/stocks/$symbol", params: { symbol }, search: { ...search, ...patch }, replace: true, viewTransition: false });
	const ticketUp = phase.kind === "buy" || preview.includes("t") || preview.includes("s");
	const filledUp = phase.kind === "filled" || preview.includes("f");
	const failedUp = phase.kind === "failed";
	/*
	 * The page under the scrim stays as the ticket had it while the sheet that replaces the ticket is up (Order filled,
	 * or the failed one): the prototype's confirm -> result pairs (1:3764 -> 1:4216 folded, 1:3805 -> 1:4249 open) draw
	 * the same base image and the same scrim layers (#0c1320 @55%, #0a1020 @80%) on both sides, and Confirm's Smart
	 * Animate (1:3801 / 1:3842, 350 ms ease-out) morphs only the panel. So the dim tone and the entry's scrim hold from
	 * the ticket to the result, and lift together with the result sheet.
	 */
	const sheetUp = ticketUp || filledUp || failedUp;
	const analystOpen = open ?? !!search.open;
	const example = search.variant === "example";
	// which frame the open ticket follows: the sheet over a saved My STAK entry (2:5247), the ticket over an
	// unsaved My STAK entry (2:5402), or the ticket over a Discover entry (2:4007 / 2:4161)
	const sheetLook = preview.includes("s") || (from === "my-stak" && pageSaved);
	const tone = sheetUp && !sheetLook ? "dim" : "base";
	const scrim = sheetLook ? MY_STAK_SHEET_SCRIM : from === "my-stak" ? MY_STAK_TICKET_SCRIM : TICKET_SCRIM;
	// the panel's centre: +0.5 below the 1200 frame's middle in 2:4007 / 2:4161 / 2:5247 (y 368.5), on it in 2:5402 (y 368)
	const ticketOffset = from === "my-stak" && !sheetLook ? 0 : 0.5;

	/**
	 * Save / Unsave (the CTA card): the button does what it says. The page turns into the other state inside the
	 * prototype's SMART_ANIMATE 350 ms, ease-out (Save 1:2659 / 1:2840; Unsave mirrors it), then the store follows:
	 * a save the person has not made yet is saved, a real save is removed, and the `?saved=1` preview look (the
	 * frames' state, which the person never saved) is simply dropped.
	 *
	 * A company in today's deck is a deck card: its Save and Unsave are that card's deck decision (useDeckAwareSave,
	 * discover-stock #5), as both phones record a detail page's Save into the run.
	 */
	const toggleSaved = () => {
		if (saving.current) return;
		saving.current = true;
		const next = !saved;
		const T = normalizeTicker(stock.symbol);
		const stored = live.savedTickers.has(T);
		// an Unsave on a stock opened from a My STAK collection while the showcase is untouched is that collection's first edit
		// (mystak #5, src/app/mystak/remove.ts): the frame's list becomes the person's own, less this stock, and Back shows it gone
		const fromFrameCollection = !next && from === "my-stak" && !!search.collection && isShowcase(live);
		const act = () =>
			fromFrameCollection
				? removeFromStak(live, T, { showcase: true, collection: search.collection, priceOf: (t) => demoQuote(t)?.price ?? null })
				: next && !stored
					? store.save(T, price || null)
					: !next && stored
						? store.unsave(T)
						: Promise.resolve();
		// the confirmation belongs to this page: a write that answers after the person has left confirms nothing elsewhere
		const ticket = pageToast.ticket();
		// the store is written inside the transition's update (a guest's save lands at once), so the old state is
		// captured before it and the new one after; a slower account write is covered by `savedLook` meanwhile
		runTransition("save", () => {
			setSavedLook(next);
			act().then(
				() => {
					saving.current = false;
					pageToast.confirm(ticket, next ? "Saved to My STAK" : "Removed from My STAK", <img alt="" src={next ? D.toastBookmark : D.bookmark} className="size-[17px]" />);
				},
				() => {
					saving.current = false;
					runTransition("save", () => setSavedLook(null));
					pageToast.fail(ticket, "Could not update My STAK. Try again.");
				},
			);
			if (!next && search.saved) return update({ saved: undefined });
		});
	};

	/**
	 * Confirm practice buy: the ticket turns into the Order filled sheet the way the prototype's Confirm does
	 * (1:3801 / 1:3842: SMART_ANIMATE 350 ms, ease-out). Wait for the order before starting the transition so a slow
	 * account write does not freeze the captured page; the ticket then morphs into the actual result.
	 * The filled sheet is the confirmation: no second toast over it.
	 */
	const confirmBuy = async (amount: number): Promise<OrderRefusal | undefined> => {
		const request = trade.begin();
		if (!request) return;
		const fromShowcase = isShowcase(live);
		setFrozen((f) => f ?? { stock, saved });
		let next: Phase;
		try {
			try {
				const fill = await live.actions.buy(stock.symbol, amount, price);
				// "You now hold" is ALWAYS the whole holding after a real fill (the shares held before plus this order), as both
				// phones print it (android ui/discover/DiscoverScreen.kt:1556-1559, ios DiscoverView.swift:1267; discover-stock
				// #9). The showcase's first buy too (the hunt's ST-03, HIGH; rulings N27o and N29c): the persona already holds
				// NVDA, and "You now hold 0.4095 shares" stood over a ledger of 1.4247. The frame's own 0.2048 (2:1724) is
				// printed only by the frame's preview address (?filled=1, below). The cash keeps continuing the ticket confirmed
				next = { kind: "filled", holding: fill.holding, cash: fromShowcase ? Math.round((SHOWCASE_CASH - fill.cost) * 100) / 100 : fill.cashAfter };
			} catch (error) {
				// an order the store REFUSES (too small, more than the cash, no price: orders.ts) is not a failed fill: the
				// ticket stays up and says why (N30.3a); "Prices are refreshing" is only for a real failure
				const refusal = refusalOf(error);
				if (refusal) {
					setFrozen(null);
					return refusal;
				}
				next = { kind: "failed" };
			}
			if (!request.isCurrent()) return;
			runTransition("smart", () => {
				if (!request.isCurrent()) return;
				setPhase(next);
				setDismissed(flags);
				if (search.ticket || search.sheet) return update({ ticket: undefined, sheet: undefined });
			});
		} finally { request.finish(); }
	};
	// the ticket's Back (and Esc, a click on the scrim): DISSOLVE 300 ms, ease-out, back to the page as it was
	// (1:3803 -> 1:3846 folded, 1:3844 -> 1:4035 open)
	const closeTicket = () => {
		runTransition("dissolve", () => {
			setPhase({ kind: "idle" });
			setDismissed(flags);
			setFrozen(null);
			if (search.ticket || search.sheet) return update({ ticket: undefined, sheet: undefined });
		});
	};

	// Order filled's "Keep exploring" (and Esc, the scrim): DISSOLVE 300 ms, ease-out, back to the page, folded: both
	// success sheets lead to the folded page (1:4247 and 1:4280 -> 1:3846)
	const closeFilled = () => {
		runTransition("dissolve", () => {
			setPhase({ kind: "idle" });
			setDismissed(flags);
			setOpen(false);
			setFrozen(null);
			if (search.filled || search.open) return update({ filled: undefined, open: undefined });
		});
	};
	const pageStock = frozen?.stock ?? stock;

	const page = (
		<>
			{example ? (
				// the EXAMPLE layout follows the product's wiring for the same layers: Practice buy opens the ticket at once
				// (1:4009 / 1:4190), Save / Unsave morph the page (SMART_ANIMATE 350 ms, 1:2659)
				<ExampleDetail stock={pageStock} saved={pageSaved} onToggleSaved={toggleSaved} onPracticeBuy={() => setPhase({ kind: "buy" })} compare={compare} />
			) : (
				<StockDetail
					stock={pageStock}
					saved={pageSaved}
					open={analystOpen}
					tone={tone}
					from={from}
					origin={origin.section}
					onBack={() => {
						// Back returns to where the person came from (D2): a step back through the history when the entry before
						// this page is one of the app's own (the deck, a collection, Home's notifications, an article ...: the
						// phones pop their back stack, StakNavHost.kt:528-529, 570-571); browser Back / Forward are instant
						// (src/main.tsx). With nowhere to go back to, the entry's natural parent, an instant hop as the wiring
						// draws it: the My STAK entry's collection (1:4029) or My STAK, the deck for the Discover entry (1:1854 /
						// 1:1899 -> 1:2496)
						if (origin.canGoBack) router.history.back();
						else if (from !== "my-stak") navigate({ to: "/discover", viewTransition: false });
						else if (search.collection) navigate({ to: "/my-stak/$collection", params: { collection: search.collection }, viewTransition: false });
						else navigate({ to: "/my-stak", viewTransition: false });
					}}
					onToggleSaved={toggleSaved}
					onToggleOpen={() => setOpen(!analystOpen)}
					compare={compare}
					// Practice buy opens the ticket at once, no transition (1:4009 / 1:4190)
					onPracticeBuy={() => setPhase({ kind: "buy" })}
				/>
			)}
			{ticketUp && (
				<PracticeBuySheet
					pending={trade.pending}
					ticker={stock.symbol}
					name={stock.name}
					initial={stock.initial}
					price={price}
					changeShort={stock.changeShort}
					cash={isShowcase(live) ? SHOWCASE_CASH : live.cash}
					// the EXAMPLE modal (2:6486) sits on the content area's middle at Figma's whole pixel (ticket.css)
					offsetY={example ? 0 : ticketOffset}
					scrim={example ? EXAMPLE_SCRIM : scrim}
					layout={example ? "example" : undefined}
					// both layouts open the ticket at once, as the wiring does (1:4009 / 1:4190)
					still
					onClose={closeTicket}
					onConfirm={confirmBuy}
				/>
			)}
			{failedUp && (
				<BuyFailedSheet
					still
					stock={{ name: stock.name, nameConfirm: stock.name, price, pct: stock.changeShort, up: !stock.changeShort.startsWith("▼"), initial: stock.initial }}
					// it replaces the ticket inside Confirm's 350 ms Smart Animate and keeps the ticket's centre, as Figma keeps
					// every confirm -> result panel in place (2:1311 y 297 -> 2:1589 y 298); the EXAMPLE modal is placed by ticket.css.
					// It keeps the ticket's `scrim` too (the My STAK entries' #030409 layers): the prototype keeps every confirm ->
					// result pair's scrim (1:3764 -> 1:4216, 1:3805 -> 1:4249); the EXAMPLE modal's scrim comes from ticket.css.
					offsetY={example ? 0 : ticketOffset}
					scrim={example ? undefined : scrim}
					onRetry={() => setPhase({ kind: "buy" })}
					onClose={() => {
						setPhase({ kind: "idle" });
						setFrozen(null);
					}}
				/>
			)}
			{filledUp && (
				<OrderFilledSheet
					ticker={stock.symbol}
					name={stock.name}
					initial={stock.initial}
					price={price}
					changeShort={stock.changeShort}
					// the ?filled=1 preview keeps the frame's order (2:1724: the $25 order's shares)
					shares={phase.kind === "filled" ? phase.holding : price ? Math.round((25 / price) * 10000) / 10000 : 0}
					cash={phase.kind === "filled" ? phase.cash : Math.max(0, (isShowcase(live) ? SHOWCASE_CASH : live.cash) - 25)}
					// the panel keeps the ticket's centre (+0.5 / 0 below the window's middle, as the frames place the ticket): Figma
					// keeps every confirm -> result pair in place (2:1311 y 297 -> 2:1589 y 298), so the 350 ms morph is a cross-fade
					offsetY={example ? 0 : ticketOffset}
					// and the ticket's scrim (one #030409 @83% layer over the saved My STAK entry, #000 @66% + #030409 @55% over the
					// unsaved one, #000 @66% over a Discover entry): the result sheets of the prototype keep the ticket's scrim
					// layers (1:4216 / 1:4249); the EXAMPLE page's dialogs take their scrim from ticket.css
					scrim={example ? undefined : scrim}
					still
					// "View in My STAK": the prototype pushes My STAK in from the right (PUSH left, 300 ms, ease-out)
					onPrimary={() => navigate({ to: "/my-stak", viewTransition: PUSH_FORWARD })}
					onSecondary={closeFilled}
					onClose={closeFilled}
				/>
			)}
		</>
	);
	// the EXAMPLE layout's sheets (the ticket, and the Order filled / failed sheets that replace it in place) open as its
	// centred modal 2:6486 draws them: over the content area, on its middle (src/app/stocks/ticket.css)
	return example ? <div data-stak-example="">{page}</div> : page;
}
