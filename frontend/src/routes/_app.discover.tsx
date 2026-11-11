import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast as notify } from "sonner";
import "@/app/discover/discover.css";
import { companyCoin, D } from "@/app/discover/assets";
import { GhostButton } from "@/app/discover/Button";
import { DeckCard } from "@/app/discover/DeckCard";
import { DeckSkeleton } from "@/app/discover/DeckSkeleton";
import { ExampleDeck, exampleCardName } from "@/app/discover/ExampleDeck";
import { ProgressRing } from "@/app/discover/ProgressRing";
import { deckCopy, deckHeader } from "@/app/discover/data";
import { recordKept } from "@/app/discover/run";
import { useCardSwipe } from "@/app/discover/swipe";
import { colCentre, useSizeClass } from "@/app/FitCanvas";
import { DECK_SIZE, changeShortOrFlat, companyName, isShowcase, type OrderRefusal, refusalOf, SHOWCASE_CASH, useDeck, useLive } from "@/app/live";
import { stocks } from "@/app/simulate/data";
import { displayInitial, displayName, displayTickerLine } from "@/app/stocks/names";
import { BuyFailedSheet } from "@/app/simulate/sheets";
import { OrderFilledSheet } from "@/app/stocks/OrderFilledSheet";
import { PracticeBuySheet } from "@/app/stocks/PracticeBuySheet";
import { PUSH_FORWARD, runTransition } from "@/app/stocks/transitions";
import { PrimaryButton } from "@/app/ui/Button";
import { cn } from "@/lib/utils";

type DeckSearch = { state?: "saved" | "buy" | "filled"; i?: number; loading?: 1; variant?: "example" };

export const Route = createFileRoute("/_app/discover")({
	validateSearch: (s: Record<string, unknown>): DeckSearch => ({
		state: s.state === "saved" || s.state === "buy" || s.state === "filled" ? s.state : undefined,
		// kept as the 1 the URL carries: a `true` is written back as `?loading=true`, a second navigation on arrival that
		// cuts the first one's view transition short (an uncaught AbortError)
		loading: s.loading === true || s.loading === 1 || s.loading === "1" ? 1 : undefined,
		i: typeof s.i === "number" && s.i >= 0 && s.i < DECK_SIZE ? s.i : undefined,
		// the References frame 2:6451 (one card, ‹ › arrows, keyboard hints) as an alternative layout of the same deck
		variant: s.variant === "example" ? "example" : undefined,
	}),
	component: DiscoverPage,
});

/** `holding`: the shares of the company held after the fill, the figure "You now hold" prints (discover-stock #9). */
type Phase = { kind: "idle" } | { kind: "buy" } | { kind: "failed" } | { kind: "filled"; holding: number; cash: number };

/**
 * "Group 1000002800": the stack's box and each card's origin in it (its top-left corner before rotation, as Figma
 * places a rotated frame; each card turns about that corner), as 2:2944 / 2:3089 stack the cards. The ticket frame
 * 2:3239 redraws the group 10px narrower and 2.2373 taller (680.5033 x 460.4639: the left and front cards 5px right and
 * 2.2373 lower, the right card 5px left and 3.7627 higher, so its arrows and buttons sit 2.2373 lower too), while the
 * wiring opens and closes the ticket Instant over the deck (1:1897 -> 1:2084, 1:2311 -> 1:1741). When two frames of
 * one screen disagree, the canonical frame the flows are built on wins (ruling of 2026-10-19): the stack keeps these
 * places while a sheet is up, so nothing under the scrim moves when the ticket opens or closes; 2:3239's 5 / 2.24px
 * residual under its scrim is documented, not matched.
 */
const STACK = { w: 690.5043, h: 458.2266, left: [35.9365, 0], center: [160.8569, 1.4951], right: [343.0453, 31.1287] } as const;

/**
 * Below 1024 (SPEC R2-R4) the same three cards, rotations and z-order are laid out on the column's width by the
 * variables discover.css derives from --stak-col (--deck-g the group's box, --deck-f / -l / -r the three cards' widths,
 * --deck-xf / -xl / -xr their lefts): on a column of 690 or more the fan is exactly 2:2944's; narrower, the side cards
 * fold in behind the front card; on a phone column the front card fills the column (R3) and the side cards show as the
 * leaning edges Figma's ±5° rotation gives them, one gutter into the margins. The front card is in flow so the box
 * grows with it; the side cards keep their authored tops. The box is a one-cell grid there: the front card shares its
 * cell with an invisible measuring copy of every other card of the deck (DeckCard `ghost`), so the cell, the front
 * card and the box are as tall as the deck's tallest card at this width, and ‹ ›, Practice buy and Learn more keep
 * one place through every card change (R10), as Figma's FIXED-height card keeps them at 1440.
 */
const COMPACT = {
	box: { width: "var(--deck-g)", minHeight: STACK.h },
	left: { left: "var(--deck-xl)", top: STACK.left[1], width: "var(--deck-l)" },
	center: { marginLeft: "var(--deck-xf)", marginTop: STACK.center[1], width: "var(--deck-f)" },
	right: { left: "var(--deck-xr)", top: STACK.right[1], width: "var(--deck-r)" },
	/** the toast keeps its place over the front card: 84.61 right of the card's left edge (2:3234 over 2:3042) */
	toast: { left: "var(--deck-toast-x)" },
} as const;

/**
 * 2:3239 centres the ticket ("Sheet" 2:3385, 480 x 464 at y 368.5) at y 600.5 of the 1024 frame, 88.5 below the
 * window's centre. Every confirm -> result pair Figma draws keeps the panel's centre (2:1421 529 -> 2:1699 528.5,
 * 2:1529 546 -> 2:1801 546.5, 2:1973 529), so the deck's Order filled and failed sheets belong there too.
 */
const TICKET_OFFSET = 88.5;

/**
 * How long "Saved to My STAK" stays up at most (the frame shows it while the saved card is in front; the page lets it
 * go on this timer, and sooner when that card leaves the front or a sheet opens over it, see the toast effect).
 */
const TOAST_MS = 2500;

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Figma 2:2944 "Desktop · Discover deck", 2:3089 "deck · saved", 2:3239 "Deck · Practice buy confirm",
 * on today's live deck. `?i=` / `?state=saved|buy|filled` are previews for the capture harness: they
 * override what is shown without touching progress; a real action syncs the pointer and clears them.
 * `?variant=example` renders the reference frame 2:6451's layout (ExampleDeck) on the same state machine.
 *
 * The flows are the prototype's (the desktop frames carry no reactions; the phone page wires the same deck, 1:1741):
 * the front card and Learn more open the stock detail at once (1:1854 / 1:1899); Save turns the chip and shows the
 * toast at once (1:1873 -> 1:1910) and the card stays in front. Saved toggles back to Save at the user's request.
 * Practice buy opens the ticket at once and its Back closes it at once (1:1897, 1:2311); Confirm
 * turns the ticket into Order filled in a 350 ms ease-out Smart Animate (1:2309); "View in My STAK" pushes My STAK
 * in (300 ms ease-out, 1:3091) and "Keep exploring" dissolves back to the deck (300 ms ease-out, 1:3093). Figma wires
 * no motion for ‹ › (2:3078 / 2:3081 have no reactions, the phone deck no pass or drag), so the card changes at once.
 *
 * Keys mirror the arrows on screen, as the reference frame 2:6451 pairs its keys with its own arrows: here ← is ‹
 * (previous) and → is › (pass, next card); ↵ opens Practice buy when no control has the focus. The reference layout
 * keeps its printed keys (← pass · → save · ↵ practice buy), and its Save toggles as the product deck's does (the
 * user's ruling of 2026-10-30): Saved pressed again (the chip, ›, →) removes the save with the "Removed from My STAK"
 * toast, the card staying in front.
 */
function DiscoverPage() {
	const { state, i, loading, variant } = Route.useSearch();
	const example = variant === "example";
	const keep = useMemo(() => (variant ? { variant } : {}), [variant]); // previews clear back to the same layout
	const navigate = useNavigate();
	const live = useLive();
	const deck = useDeck();
	// phone / tablet: the stack is laid out on the column (COMPACT); from 1024 up the frame's own places (STACK)
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";
	const [phase, setPhase] = useState<Phase>({ kind: "idle" });
	// Reuse the frame's toast pill for both save and unsave confirmations requested by the user.
	// `toastCard` remembers which card it rose over so it leaves with that card.
	const [toast, setToast] = useState<"saved" | "unsaved" | null>(null);
	const toastMessage = toast === "unsaved" ? deckCopy.unsavedToast : deckCopy.toast;
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const toastCard = useRef<string | null>(null);
	const busy = useRef(false);
	const buying = useRef(false);
	const [buyPending, setBuyPending] = useState(false);
	const ticket = useRef(0);
	const openTicket = useCallback(() => {
		ticket.current++;
		setPhase({ kind: "buy" });
	}, []);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			ticket.current++;
			if (toastTimer.current) clearTimeout(toastTimer.current);
		};
	}, []);
	const showToast = useCallback((symbol: string, saved = true) => {
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastCard.current = symbol;
		setToast(saved ? "saved" : "unsaved");
		toastTimer.current = setTimeout(() => mounted.current && setToast(null), TOAST_MS);
	}, []);
	const dismissToast = useCallback(() => {
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastTimer.current = null;
		setToast(null);
	}, []);

	const n = deck.order.length;
	// the cards bought from today's deck (Order filled -> Keep exploring leaves each one in front, see keepExploring)
	const bought = useMemo(() => new Set(live.deck?.date === deck.date ? live.deck.bought : []), [live.deck, deck.date]);
	const previewing = i !== undefined || state !== undefined;
	const index = n === 0 ? 0 : Math.min(i ?? deck.index, n - 1);
	const centre = deck.cards[index];
	// the frames' stack: the left card (85%, nearly full size) is the next one, the right card (65%, smaller) the one after
	const left = deck.cards[index + 1];
	const right = deck.cards[index + 2];
	// the coins of the next three cards behind the stack, fetched and decoded ahead: a card that comes into the stack then
	// shows its coin at once (CompanyLogo shows the glass and the mark together once both can be painted), not frames after
	const ahead = deck.cards
		.slice(index + 3, index + 6)
		.map((card) => card.symbol)
		.join(",");
	useEffect(() => {
		for (const ticker of ahead ? ahead.split(",") : []) {
			const coin = companyCoin(ticker, companyName(ticker));
			const files = coin?.kind === "figma" ? [coin.src] : coin ? [coin.glass, coin.mark] : [];
			for (const src of files) {
				if (!src) continue;
				const img = new Image();
				img.src = src;
				img.decode?.().catch(() => undefined);
			}
		}
	}, [ahead]);
	/*
	 * The deck as the ticket showed it, held from Confirm until the result sheet closes: the order is the card's deck
	 * decision and a buy saves the company (D5, FOUNDATION-API section 4), which would turn the front card's chip to Saved
	 * under the scrim, while the prototype draws the same deck under the ticket and its result (1:2084 -> 1:2875). The
	 * ring's number does not move with a buy (N29a, below). "Keep exploring" then dissolves into the deck as it now is.
	 */
	const [held, setHeld] = useState<{ saved: boolean } | null>(null);
	const centreSaved = held?.saved ?? (state === "saved" || (!!centre && centre.saved));
	/*
	 * THE RING NAMES THE CARD IN FRONT (coordinator ruling N29a, replacing N27t; the hunt's I-01 and CH-04): its number is
	 * index + 1, like its arc and like both phones (android ui/discover/DiscoverScreen.kt:453 `count = seen + 1`, :595: the
	 * Save chip leaves `seen` alone; ios Discover/DiscoverView.swift:368 and :442), in every real state: Save leaves it,
	 * Pass moves it on, Previous brings it back. Before, the number counted decisions (a saved first card read 2/12 with
	 * NVDA still in front, and after Pass then Previous the first card read 2/12 over a 1/12 arc). Only the desktop frame
	 * 2:3089 "deck · saved" reads 2/12 over the first card: that frame's own figure stays on its own preview address
	 * (?state=saved), nowhere else.
	 */
	const position = Math.min(deck.total, index + 1);
	const counter = Math.min(deck.total, position + (state === "saved" ? 1 : 0));
	const price = centre?.quote?.price ?? 0;
	const ticketUp = phase.kind === "buy" || state === "buy";
	const filledUp = phase.kind === "filled" || state === "filled";
	const sheetUp = ticketUp || filledUp || phase.kind === "failed";
	// the untouched visitor's ticket shows the frames' paper cash (2:3401 "$8,800.00"); anyone else sees their own
	const showcase = isShowcase(live);
	const ticketCash = showcase ? SHOWCASE_CASH : live.cash;
	/*
	 * One display name per company (N30.8f, the hunt's C-10: NVIDIA was "NVIDIA Corp" on the card, "NVIDIA Corp." in its
	 * ticket and "NVIDIA" on its stock page). While the deck is the design itself (the untouched showcase, a frame
	 * preview) the sheets keep the frames' own strings (the ticket 2:3239 "NVIDIA Corp.", Order filled 2:1711 "NVIDIA
	 * Corp"); after that the card's ticker line, the ticket, the receipt and the failed sheet all print the name the stock
	 * page prints (src/app/stocks/names.ts). The choice is made once per visit to the deck (when the live state is first
	 * ready), so the first action does not rename the card under the person's eye ("NVIDIA Corp" turning into "NVIDIA" at
	 * the press of Save): the deck they opened keeps its names until they leave it.
	 */
	const namesAtOpen = useRef<boolean | null>(null);
	if (namesAtOpen.current === null && live.ready) namesAtOpen.current = showcase || previewing;
	const frameNames = namesAtOpen.current ?? (showcase || previewing);
	// the frames' own string where a frame draws that sheet (NVDA's), else the name the card itself wears ("Apple Inc"),
	// so a card and its ticket never part ways inside the showcase either
	type NamedCard = Parameters<typeof exampleCardName>[0];
	const ticketName = (card: NamedCard) => (frameNames ? (stocks[card.symbol]?.nameConfirm ?? exampleCardName(card)) : displayName(card.symbol));
	const receiptName = (card: NamedCard) => (frameNames ? (stocks[card.symbol]?.name ?? exampleCardName(card)) : displayName(card.symbol));
	const cardLine = (card: { symbol: string; ticker: string }) => (frameNames ? card.ticker : displayTickerLine(card.symbol));

	// Both confirmations leave when another card comes to the front or a sheet opens, as the saved toast does.
	const centreSymbol = centre?.symbol ?? null;
	useEffect(() => {
		if (toast && (sheetUp || centreSymbol !== toastCard.current)) dismissToast();
	}, [toast, sheetUp, centreSymbol, dismissToast]);

	// toEnd() already navigates: the effect below must not send a second navigation in the same tick
	const ending = useRef(false);
	// a finished (or metered-out) deck has its receipt instead of cards; never while a frame preview is shown
	const finished = !loading && !previewing && n > 0 && (deck.done || deck.limitReached);

	useEffect(() => {
		if (!finished || ending.current) return;
		deck.finish();
		navigate({ to: "/discover/end", search: keep, replace: true, viewTransition: false });
	}, [finished, deck.finish, navigate, keep]);

	// the previews are the same page in another state: dropping one is not a screen change (no cross-fade)
	const clearPreview = useCallback(() => {
		if (previewing) navigate({ to: "/discover", search: keep, replace: true, viewTransition: false });
	}, [previewing, navigate, keep]);

	// the receipt takes the deck's place in the history: a finished deck's /discover only ever opens the receipt again,
	// so Back (the page's and the browser's) goes on to where the person came from. It carries the layout (`keep`), so
	// "Swipe today's deck again" returns to the deck the person was using (1:2493 -> 1:1741).
	const toEnd = useCallback(() => {
		ending.current = true;
		deck.finish();
		navigate({ to: "/discover/end", search: keep, replace: true, viewTransition: false });
	}, [deck.finish, navigate, keep]);

	/**
	 * A card the person moves past while it shows Saved (kept from an earlier run of today's deck, saved on its stock page
	 * or an article, or bought there) counts as this run's save, as its chip says: the phones count every card a run keeps
	 * and add one card seen per swipe (android ui/discover/DiscoverScreen.kt:385-421, ios DiscoverView.swift:301, 322), so
	 * the receipt's Seen and Saved count it (discover-stock #7). Recorded in the run's progress (live.actions.setDeck,
	 * src/app/discover/run.ts); the deck's own pass leaves a kept card's save alone and only moves the pointer.
	 */
	const keepCard = useCallback((T: string) => live.actions.setDeck((prev) => recordKept(prev, T, deck.date, deck.theme.key)), [live.actions, deck.date, deck.theme.key]);

	/** Pass ("Nav · Next" 2:3081): the next card comes to the front at once. */
	const onPass = useCallback(async () => {
		if (!centre || busy.current) return;
		busy.current = true;
		const last = index + 1 >= n;
		// passing the last card finishes the deck inside deck.pass: this handler routes to the receipt, not the effect
		if (last) ending.current = true;
		try {
			// a card bought from this deck is kept, like a saved one: › only moves past it (no pass is recorded)
			const ok = bought.has(centre.symbol) ? true : await deck.pass(centre.symbol);
			if (!mounted.current) return; // the person left meanwhile: nothing to route
			if (ok && centre.saved && !bought.has(centre.symbol)) keepCard(centre.symbol);
			if (!ok || last) {
				toEnd();
				return;
			}
			deck.go(index + 1);
			clearPreview();
		} finally {
			busy.current = false;
		}
	}, [centre, bought, deck, index, n, toEnd, clearPreview, keepCard]);

	/**
	 * Save ("Save" 2:3061): the card stays in front, the chip reads Saved and the toast shows (1:1873 -> 1:1910).
	 * The user requested a toggle: Saved removes the save and returns to Save without advancing the card.
	 */
	const onSave = useCallback(async () => {
		if (!centre || busy.current) return;
		busy.current = true; // a held → or a double-click meters one swipe, not several
		try {
			if (previewing) deck.go(index);
			if (centreSaved) {
				if (centre.saved) await deck.unsave(centre.symbol);
				if (!mounted.current) return;
				showToast(centre.symbol, false);
				clearPreview();
				return;
			}
			const ok = await deck.save(centre.symbol, price || null);
			if (!mounted.current) return;
			if (!ok) {
				toEnd();
				return;
			}
			showToast(centre.symbol);
			clearPreview();
		} catch {
			if (mounted.current) notify("Could not update My STAK. Try again.");
		} finally {
			busy.current = false;
		}
	}, [centre, centreSaved, previewing, deck, index, price, toEnd, clearPreview, showToast]);

	/** "Learn more" and a click on the front card both open its stock detail, instantly (phone wiring 1:1899 and 1:1854 -> 1:2496). */
	const openCentre = useCallback(() => {
		if (centre) navigate({ to: "/stocks/$symbol", params: { symbol: centre.symbol }, viewTransition: false });
	}, [centre, navigate]);

	/** Previous ("Nav · Previous" 2:3078): the card before comes back to the front at once. */
	const onPrevious = useCallback(() => {
		if (index === 0) return;
		if (previewing) {
			navigate({ to: "/discover", search: { ...keep, i: index - 1 }, viewTransition: false });
			return;
		}
		deck.go(index - 1);
	}, [index, previewing, navigate, deck, keep]);

	// the front card's box: on a touch screen a sideways swipe passes the card (to the left, as ›) or brings the one before
	// back (to the right, as ‹), as the phones' deck moves on with a drag (discover-stock #15; src/app/discover/swipe.ts)
	const frontBox = useRef<HTMLDivElement>(null);
	const swipe = useCardSwipe(frontBox, () => void onPass(), onPrevious);

	/**
	 * Confirm practice buy: the order is placed first (the ticket shows "Placing order…" meanwhile), then the ticket
	 * turns into Order filled, or into the failed sheet, inside the prototype's SMART_ANIMATE 350 ms ease-out (1:2309 ->
	 * 1:2875). The filled sheet is the confirmation (no second toast over it). Its cash continues the ticket the person
	 * confirmed: on the frames' figures that is $8,800.00 less the order (1:2875 / 2:1720 read $8,775.00 after $25).
	 */
	const confirmBuy = async (amount: number): Promise<OrderRefusal | undefined> => {
		if (!centre || buying.current) return;
		buying.current = true;
		setBuyPending(true);
		const request = ticket.current;
		const fromShowcase = showcase; // read before the order turns the visitor's numbers into their own
		setHeld((h) => h ?? { saved: centreSaved });
		let next: Phase;
		try {
			const fill = await live.actions.buy(centre.symbol, amount, price);
			if (previewing) deck.go(index);
			deck.markBought(centre.symbol);
			// "You now hold" is ALWAYS the whole holding after a real fill (the shares held before plus this order), as both
			// phones print it (android ui/discover/DiscoverScreen.kt:1556-1559, ios DiscoverView.swift:1267; discover-stock #9),
			// the showcase's first buy included (the hunt's ST-03, HIGH; rulings N27o and N29c: the persona already holds NVDA,
			// and "You now hold 0.4095 shares" stood over a ledger of 1.4247). The frame's own 0.2048 (2:1724) is printed only by
			// the frame's preview address (?state=filled). The cash keeps continuing the ticket the person confirmed ($8,775.00)
			next = { kind: "filled", holding: fill.holding, cash: fromShowcase ? cents(SHOWCASE_CASH - fill.cost) : fill.cashAfter };
		} catch (error) {
			// an order the store REFUSES (too small, more than the cash, no price: orders.ts) is not a failed fill: the ticket
			// stays up and says why (N30.3a); the failed sheet is only for a real failure
			const refusal = refusalOf(error);
			if (refusal) {
				if (mounted.current) setHeld(null);
				return refusal;
			}
			next = { kind: "failed" };
		} finally {
			buying.current = false;
			if (mounted.current) setBuyPending(false);
		}
		if (!mounted.current || ticket.current !== request) return;
		runTransition("smart", () => {
			if (!mounted.current || ticket.current !== request) return;
			setPhase(next);
			if (state === "buy") clearPreview();
		});
	};

	/**
	 * "Keep exploring": the sheet dissolves back to the deck as it was (300 ms ease-out, 1:3093 -> 1:1741: the same card
	 * in front, as the Android deck keeps it too). The buy is that card's decision, and the ring still names the card in
	 * front: a buy leaves the number where it is, like Save and like a Save made on the card's own page (ruling N29a: the
	 * ring is index + 1, as both phones draw it, android DiscoverScreen.kt:453 and :595; only Pass and Previous move it;
	 * the frame's "2/12" over a kept card, 2:3089, shows on the frame's own preview address alone). The person moves on
	 * with › or Save. Esc and a click on the scrim leave the same way.
	 */
	const keepExploring = () => {
		runTransition("dissolve", () => {
			setPhase({ kind: "idle" });
			setHeld(null);
		});
		if (state === "filled") clearPreview();
	};

	// how the focused control got the focus: a button the mouse pressed keeps it, but Enter is still the page's ↵ (the
	// hints pill's "Practice buy"), not a second press of that Pass / ‹ / › / Save; Tab hands Enter back to the control
	const pointerFocus = useRef(false);
	useEffect(() => {
		const onPointer = () => {
			pointerFocus.current = true;
		};
		const onTab = (e: KeyboardEvent) => {
			if (e.key === "Tab") pointerFocus.current = false;
		};
		window.addEventListener("pointerdown", onPointer, true);
		window.addEventListener("keydown", onTab, true);
		return () => {
			window.removeEventListener("pointerdown", onPointer, true);
			window.removeEventListener("keydown", onTab, true);
		};
	}, []);

	useEffect(() => {
		if (sheetUp) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return; // Alt+← is the browser's Back
			if (e.key === "ArrowLeft") {
				// the reference layout keeps its printed keys: ← Pass · → Save (2:6482)
				if (example) onPass();
				else onPrevious();
			} else if (e.key === "ArrowRight") {
				if (example) onSave();
				else onPass();
			} else if (e.key === "Enter") {
				const t = e.target instanceof HTMLElement ? e.target : null;
				const control = t && t !== document.body ? t.closest("button, a, input, select, textarea, [tabindex]") : null;
				// the focused control owns Enter when the keyboard took the person there; a button or link the mouse pressed does not
				if (control && !(pointerFocus.current && control.matches("button, a"))) return;
				// ↵ opens the ticket and nothing more (both layouts): the opening key must not go on to press the ticket's
				// first chip, which takes the focus as the sheet opens
				if (centre) e.preventDefault();
				if (centre) openTicket();
			} else if (e.key === "Escape") clearPreview();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [sheetUp, example, onPass, onPrevious, onSave, centre, clearPreview, openTicket]);

	// the 00 References EXAMPLE layout (2:6451) has no loading frame of its own: it paints nothing until the deck is ready
	// rather than the product deck's skeleton (2:2305: three-card stack, button shells), which would jump to another layout
	if (loading || !deck.ready) return example ? null : <DeckSkeleton />;
	// arriving on a finished deck (the rail's Discover, a reload, Back from the receipt): the effect above opens the
	// receipt; the cards it no longer has are not painted on the way
	if (finished && !ending.current) return null;

	const sheets = (
		<>
			{ticketUp && centre && (
				<PracticeBuySheet
					ticker={centre.symbol}
					name={ticketName(centre)}
					initial={displayInitial(centre.symbol)}
					price={price}
					changeShort={centre.quote ? changeShortOrFlat(centre.quote.changePercent) : centre.change.replace(" today", "")}
					cash={ticketCash}
					offsetY={TICKET_OFFSET}
					// Practice buy opens the ticket at once (1:1897 -> 1:2084)
					still
					pending={buyPending}
					// Back (and Esc, the scrim) closes it at once (1:2311 -> 1:1741)
					onClose={() => {
						ticket.current++;
						setPhase({ kind: "idle" });
						setHeld(null);
						if (state === "buy") clearPreview();
					}}
					onConfirm={confirmBuy}
				/>
			)}
			{phase.kind === "failed" && centre && (
				<BuyFailedSheet
					stock={{
						name: ticketName(centre),
						nameConfirm: ticketName(centre),
						price,
						pct: centre.quote ? changeShortOrFlat(centre.quote.changePercent) : "",
						up: (centre.quote?.changePercent ?? 0) >= 0,
						initial: displayInitial(centre.symbol),
					}}
					// it replaces the ticket inside Confirm's 350 ms Smart Animate (confirmBuy) and keeps the ticket's centre, as Figma
					// keeps every confirm -> result panel in place; its dialog's own fade-in is switched off in discover.css
					offsetY={TICKET_OFFSET}
					// "Try again" smart-animates the ticket back (the reverse of the confirm); "Not now" closes at once (sheets close Instant)
					onRetry={() => runTransition("smart", openTicket)}
					onClose={() => {
						setPhase({ kind: "idle" });
						setHeld(null);
					}}
				/>
			)}
			{filledUp && centre && (
				<OrderFilledSheet
					ticker={centre.symbol}
					// the success sheet names the company without the ticket's period (2:1711 / 1:2875 "NVIDIA Corp")
					name={receiptName(centre)}
					initial={displayInitial(centre.symbol)}
					price={price}
					changeShort={centre.quote ? changeShortOrFlat(centre.quote.changePercent) : ""}
					shares={phase.kind === "filled" ? phase.holding : price ? Math.round((25 / price) * 10000) / 10000 : 0}
					cash={phase.kind === "filled" ? phase.cash : Math.max(0, cents(ticketCash - 25))}
					// it arrives inside the confirm's 350 ms Smart Animate, so its dialog skips its own fade-in
					still
					// "View in My STAK" pushes My STAK in from the right (PUSH left, 300 ms, ease-out, 1:3091)
					onPrimary={() => navigate({ to: "/my-stak", viewTransition: PUSH_FORWARD })}
					onSecondary={keepExploring}
					onClose={keepExploring}
					// the panel keeps the ticket's place (centre 600.5 of 1024): Figma keeps every confirm -> result pair in
					// place (2:1311 Sheet y 297 -> 2:1589 y 298), so the 350 ms morph is a cross-fade, not a jump
					offsetY={TICKET_OFFSET}
				/>
			)}
		</>
	);

	if (example) {
		/*
		 * The 00 References set's own ticket: Practice buy opens the EXAMPLE modal 2:6486 ("Buy ticket (centered modal)":
		 * the 480 x 449 sheet on the content area's middle over the content-area scrim, the ✕ at its top right), at once,
		 * as the deck's wiring opens its ticket (1:1897 -> 1:2084); Back, ✕, Esc and the scrim close it at once (1:2311).
		 * Confirm turns it into Order filled (or the failed sheet) in the 350 ms ease-out Smart Animate (1:2309), and those
		 * keep the ticket's place and scrim ([data-stak-example] in src/app/stocks/ticket.css); "View in My STAK" pushes
		 * My STAK in (1:3091), "Keep exploring" dissolves back to the deck (1:3093). The order flow is the product deck's.
		 */
		// the EXAMPLE sheets name the company as the card the person pressed Practice buy on does ("NVIDIA Corp" 2:6464;
		// "Apple Inc" on AAPL's card, as the EXAMPLE ticket 2:6635 prints it), so one flow keeps one name from the card to
		// the ticket and Order filled (Figma's own deck success sheet reads "NVIDIA Corp" too, 2:1711)
		const exampleName = centre ? (frameNames ? exampleCardName(centre) : displayName(centre.symbol)) : "";
		const exampleSheets = (
			<>
				{ticketUp && centre && (
					<PracticeBuySheet
						ticker={centre.symbol}
						name={exampleName}
						initial={displayInitial(centre.symbol)}
						price={price}
						changeShort={centre.quote ? changeShortOrFlat(centre.quote.changePercent) : centre.change.replace(" today", "")}
						cash={ticketCash}
						offsetY={0}
						scrim="rgba(2,5,14,0.66)"
						layout="example"
						still
						pending={buyPending}
						onClose={() => {
							ticket.current++;
							setPhase({ kind: "idle" });
							setHeld(null);
							if (state === "buy") clearPreview();
						}}
						onConfirm={confirmBuy}
					/>
				)}
				{phase.kind === "failed" && centre && (
					<BuyFailedSheet
						stock={{
							name: exampleName,
							nameConfirm: exampleName,
							price,
							pct: centre.quote ? changeShortOrFlat(centre.quote.changePercent) : "",
							up: (centre.quote?.changePercent ?? 0) >= 0,
							initial: displayInitial(centre.symbol),
						}}
						onRetry={() => runTransition("smart", openTicket)}
						onClose={() => {
							setPhase({ kind: "idle" });
							setHeld(null);
						}}
					/>
				)}
				{filledUp && centre && (
					<OrderFilledSheet
						ticker={centre.symbol}
						name={exampleName}
						initial={displayInitial(centre.symbol)}
						price={price}
						changeShort={centre.quote ? changeShortOrFlat(centre.quote.changePercent) : ""}
						shares={phase.kind === "filled" ? phase.holding : price ? Math.round((25 / price) * 10000) / 10000 : 0}
						cash={phase.kind === "filled" ? phase.cash : Math.max(0, cents(ticketCash - 25))}
						still
						onPrimary={() => navigate({ to: "/my-stak", viewTransition: PUSH_FORWARD })}
						onSecondary={keepExploring}
						onClose={keepExploring}
					/>
				)}
			</>
		);
		return (
			// data-stak-example: the sheets open as the EXAMPLE modal (ticket.css); .stak-deck: their controls answer no hover or
			// press, as on the product deck (discover.css)
			<div className="stak-deck relative" data-stak-example="">
				<div role="status" aria-live="polite" className="sr-only">
					{toast ? toastMessage : ""}
				</div>
				<ExampleDeck
					card={centre}
					name={exampleName}
					saved={centreSaved}
					kicker={deck.theme.kicker}
					counter={counter}
					total={deck.total}
					toast={state === "saved" ? "saved" : toast}
					// the toast belongs to the saved card's frame (1:1910): a sheet over the deck ends it (ExampleDeck)
					sheetUp={sheetUp}
					onPass={onPass}
					// the product deck's toggle (the user's ruling of 2026-10-30): Saved pressed again removes the save
					onSave={onSave}
					onBuy={() => centre && openTicket()}
					// the card and Learn more open the stock detail at once (1:1854 / 1:1899), in the example layout
					onLearnMore={() => centre && navigate({ to: "/stocks/$symbol", params: { symbol: centre.symbol }, search: { variant: "example" }, viewTransition: false })}
				/>
				{exampleSheets}
			</div>
		);
	}

	return (
		// .stak-deck scopes discover.css: the deck's sheets (the ticket, Order filled, the failed order) answer no hover or
		// press, and the failed sheet skips its dialog's own fade, as every control of 2:3239 is a plain frame (no variants, no reactions).
		// The header sits 30 above the content's top (y 58 of the 1440 frame); under the phone top bar it keeps the
		// 2:2944 header's own 18.5 above its title (y 82 under the bar) instead of running into the bar (R6).
		<div className="stak-deck stak-deck-geo relative -mt-[30px] max-sm:-mt-[16px]">
			{/* always mounted, so a save is announced when the text arrives (the visual toast below is decorative) */}
			<div role="status" aria-live="polite" className="sr-only">
				{toast ? toastMessage : ""}
			</div>
			{/* the ring ends 47 before the column's edge on the frame; a compact column ends at its gutter (R3) */}
			<header className="flex h-[92px] w-full items-center justify-between pr-[47px] max-lg:pr-0">
				<div className="flex flex-col items-start gap-[6px] overflow-clip whitespace-nowrap">
					<h1 className="font-sora text-[28px] font-semibold leading-[35px] text-[#f2f6fc]">{deckHeader.title}</h1>
					<p className="font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb]">{deck.theme.kicker}</p>
				</div>
				<div className="relative size-[52.8px] overflow-clip" role="status" aria-label={`${counter} of ${deck.total} cards`}>
					{/* "Ring" 2:2951: Figma's export where the frames draw it (the 1/12 arc of 2:2944 / 2:3089 / 2:3239) */}
					<ProgressRing scale={1} value={position} total={deck.total} file={position === 1 ? D.ring : undefined} />
					{/*
					 * 2:2958 "1/12" / 2:3103 "2/12": Sora 13.2, left-aligned at x 14.2158 and growing to the right. A two-figure
					 * count would run 2px into the stroke there (Figma draws none), so 10/12 to 12/12 sit on the ring's centre.
					 */}
					<p
						className={cn(
							"absolute top-[18.9879px] whitespace-nowrap font-sora text-[13.2px] leading-[17px] text-white",
							counter < 10 ? "left-[14.2158px]" : "left-1/2 -translate-x-1/2",
						)}
					>
						{counter}/{deck.total}
					</p>
				</div>
			</header>

			{/*
			 * The column ("Frame 1618869215" 2:2959) at (417, 196). 2:3089 draws its copy 0.4243 right and 0.4219 higher;
			 * Chrome snaps text baselines and box edges to whole pixels, so that nudge only moves anti-aliasing away from
			 * Figma's render (saved frame 0.183% -> 0.213% of pixels off), and the saved state keeps this geometry.
			 */}
			{/* the column is Figma's 806 at most and fills a narrower one (R3); below 1024 the shell closes the page 32 under the buttons (no padding of the page's own) */}
			<div className="mt-[46px] flex w-[806.229px] flex-col items-center gap-[64px] max-lg:w-full max-lg:max-w-[806.229px]" style={{ marginLeft: colCentre(812) }}>
				<div className="flex w-full flex-col items-center gap-[35px]">
					<div className={compact ? "relative grid" : "relative"} style={compact ? COMPACT.box : { width: STACK.w, height: STACK.h }}>
						{left && (
							<div key={left.symbol} className="absolute z-[1]" style={compact ? COMPACT.left : { left: STACK.left[0], top: STACK.left[1] }}>
								<DeckCard card={left} slot="left" saved={left.saved} fluid={compact} tickerLine={cardLine(left)} />
							</div>
						)}
						{right && (
							<div key={right.symbol} className="absolute z-0" style={compact ? COMPACT.right : { left: STACK.right[0], top: STACK.right[1] }}>
								<DeckCard card={right} slot="right" saved={right.saved} fluid={compact} tickerLine={cardLine(right)} />
							</div>
						)}
						{/* the measuring copies: every other card of the deck in the front card's cell, invisible (out of the accessibility tree, no hit test) */}
						{compact &&
							deck.cards.map(
								(card) =>
									card !== centre && (
										<div key={`${card.symbol}-ghost`} className="invisible col-start-1 row-start-1" style={COMPACT.center} aria-hidden="true">
											<DeckCard card={card} slot="center" fluid ghost tickerLine={cardLine(card)} />
										</div>
									),
							)}
						{centre && (
							// a finger's sideways swipe on the front card passes it (pan-y: vertical drags still scroll the page)
							<div
								key={centre.symbol}
								ref={frontBox}
								className={compact ? "relative z-[2] col-start-1 row-start-1 touch-pan-y" : "absolute z-[2] touch-pan-y"}
								style={compact ? COMPACT.center : { left: STACK.center[0], top: STACK.center[1] }}
								{...swipe}
							>
								<DeckCard card={centre} slot="center" saved={centreSaved} onSave={onSave} onOpen={openCentre} fluid={compact} tickerLine={cardLine(centre)} />
							</div>
						)}
					</div>
					<div className="flex items-center justify-center gap-[93px]">
						<button
							type="button"
							aria-label="Previous card"
							aria-keyshortcuts="ArrowLeft"
							onClick={onPrevious}
							// 2:2944 opens the deck with both arrows at full strength: the first card's ‹ is announced as disabled, not dimmed.
							// 2:3078 / 2:3081 are plain frames with no hover or pressed state (and no reaction), so the arrows draw none
							aria-disabled={index === 0 || undefined}
							// the first card's ‹ has nothing to go back to: it keeps the frame's pixels (above) but not the pointer cursor
							// that promises a press (the hunt's I-05, coordinator ruling N27r)
							className={cn("flex size-[40px] items-center justify-center overflow-clip rounded-[20px] bg-[#192238]", index === 0 ? "cursor-default" : "cursor-pointer")}
						>
							<img alt="" src={D.chevron} className="size-[22px]" />
						</button>
						<button
							type="button"
							aria-label="Pass, next card"
							aria-keyshortcuts="ArrowRight"
							onClick={onPass}
							className="flex size-[40px] rotate-180 cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
						>
							<img alt="" src={D.chevron} className="size-[22px]" />
						</button>
					</div>
				</div>
				<div className="flex w-[320px] flex-col items-center gap-[11px] max-lg:w-full max-lg:max-w-[320px]">
					{/* 2:3085 / 2:3087: plain frames with no hover or pressed state (the canon draws none) */}
					<PrimaryButton onClick={() => centre && openTicket()} disabled={!centre} aria-keyshortcuts="Enter">
						{deckCopy.practiceBuy}
					</PrimaryButton>
					<GhostButton onClick={openCentre} disabled={!centre}>
						{deckCopy.learnMore}
					</GhostButton>
				</div>
			</div>

			{/*
			 * 2:3234 "Toast": over the front card (z above its z-2), its rotated box at y 170 like the frame. Figma turns
			 * it 2.1456° counter-clockwise and gives it a GLASS effect (radius 0, refraction 0.15, depth 12, light 246° at
			 * 0.5, dispersion 0.21): no frost, only the light it catches, drawn here as Figma's render reads (probed on
			 * 2:3089 against the flat fill): a bright rim on each rounded end, a faint one along the top edge, the body a
			 * touch lighter towards the top and the right end, darker at the left end. The refraction of the card's edge
			 * through the pill has no CSS equivalent and is left out. It appears at once, as the phone's Save edge
			 * (1:1873 -> 1:1910) is instant, and it is never painted under a sheet (2:3239 / 1:2084 draw no toast; the
			 * saved preview keeps it for the frame it stands for, and the toast effect above ends a raised one).
			 */}
			{(state === "saved" || toast) && !sheetUp && (
				<div
					className="absolute top-[112.01px] z-[3] flex h-[44.963px] w-[161.348px] items-center justify-center"
					style={compact ? COMPACT.toast : { left: colCentre(812, 303.33) }}
					aria-hidden="true"
				>
					<div
						data-deck-toast=""
						className="flex shrink-0 rotate-[-2.1456deg] items-center gap-[9px] overflow-clip rounded-[18px] px-[16px] py-[11px]"
						style={{
							background:
								"linear-gradient(180deg, rgba(255,255,255,0.005) 0%, rgba(255,255,255,0) 55%), linear-gradient(90deg, rgba(0,0,0,0.09) 0%, rgba(0,0,0,0) 6%, rgba(255,255,255,0) 90%, rgba(255,255,255,0.008) 100%), rgba(36,43,61,0.48)",
							boxShadow: "inset 1px 0 0 rgba(255,255,255,0.17), inset -1px 0 0 rgba(255,255,255,0.11), inset 0 1px 0 rgba(255,255,255,0.012)",
						}}
					>
						<img alt="" src={toast === "unsaved" ? D.bookmark : D.toastBookmark} className="size-[17px] shrink-0" />
						<p className="w-[calc-size(fit-content,round(up,size,1px))] whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-white">{toastMessage}</p>
					</div>
				</div>
			)}

			{sheets}
		</div>
	);
}
