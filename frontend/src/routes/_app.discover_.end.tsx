import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import "@/app/discover/discover.css";
import { D } from "@/app/discover/assets";
import { BackCrumb } from "@/app/discover/BackCrumb";
import { GhostButton } from "@/app/discover/Button";
import { ProgressRing } from "@/app/discover/ProgressRing";
import { endOfDeck } from "@/app/discover/data";
import { canReplayDeck, END_WITHOUT_SAVES, savedInRun } from "@/app/discover/run";
import { colCentre, fillHeight } from "@/app/FitCanvas";
import { DECK_SIZE, useDeck, useLive } from "@/app/live";
import { usePageOrigin } from "@/app/stocks/origin";
import { PrimaryButton } from "@/app/ui/Button";
import { cn } from "@/lib/utils";

type EndSearch = { preview?: 1; variant?: "example" };

export const Route = createFileRoute("/_app/discover_/end")({
	validateSearch: (s: Record<string, unknown>): EndSearch => ({
		// kept as the 1 the URL carries: a `true` is written back as `?preview=true`, a second navigation on arrival that
		// cuts the first one's view transition short (an uncaught AbortError)
		preview: s.preview === true || s.preview === 1 || s.preview === "1" ? 1 : undefined,
		// the deck layout the person finished (the References EXAMPLE deck 2:6451): the receipt is 2:3422 either way, and
		// its way back to the deck returns to that layout
		variant: s.variant === "example" ? "example" : undefined,
	}),
	component: EndOfDeckPage,
});

/**
 * Figma 2:3422 "Desktop · End of deck": the receipt of today's deck (seen · saved · bought); `?preview=1` shows the frame's numbers.
 * It is the only state Figma draws, so only a finished deck has it: before that, Discover is the deck itself and this
 * address hands over to it (a typed URL, an older notification). Every way out is an instant hop, as the phone page
 * wires the same receipt (1:2444): "Practice buy your saves" -> Simulate (1:2489), "Review saves in My STAK" -> My STAK
 * (1:2491), "Swipe today's deck again" -> the same deck's first run (1:2493 -> 1:1741). The desktop Back has no wiring of
 * its own: it goes back to where the person came from, or to Home when there is nowhere to go back to (the finished
 * deck's own page would only open this receipt again).
 */
function EndOfDeckPage() {
	const navigate = useNavigate();
	const router = useRouter();
	// Back steps back only onto one of the app's own pages (D2; the hunt's I-04: never onto the landing page or Sign in)
	const { canGoBack } = usePageOrigin();
	const { preview, variant } = Route.useSearch();
	const live = useLive();
	const deck = useDeck({ quotes: false }); // the receipt reads progress only
	// "Swipe today's deck again" clears the deck on its way out: that is a departure, not an unfinished deck to redirect
	const leaving = useRef(false);
	const finished = deck.ready && deck.done;
	const layout = variant ? { variant } : {};

	useEffect(() => {
		if (preview || leaving.current || !deck.ready || deck.done) return;
		navigate({ to: "/discover", search: variant ? { variant } : {}, replace: true, viewTransition: false });
	}, [preview, variant, deck.ready, deck.done, navigate]);

	if (!preview && !finished) return null;

	const progress = live.deck;
	// Seen: every card the run went through (a pass, a save, a buy, or a card it kept: the deck route records a card that
	// shows Saved as the person moves past it as the run's save, discover-stock #7); Saved: the run's saves, kept cards
	// included, as the phones count them (android ui/discover/DiscoverScreen.kt:385-421, 1384-1481)
	const seen = preview ? DECK_SIZE : Math.min(DECK_SIZE, deck.decided.size);
	// Saved agrees with the cards and with My STAK (the hunt's ST-19, coordinator ruling N27p): a card bought in the deck is
	// saved too (a buy saves the company, D5) and wore the Saved chip, so it counts here, once, beside Bought
	const saved = preview ? 7 : savedInRun(progress, live.savedTickers);
	const bought = preview ? 2 : (progress?.bought.length ?? 0);
	// with nothing saved anywhere the two buttons do not point at saves that do not exist (the hunt's C-05, ruling N30.8b)
	const noSaves = !preview && live.savedTickers.size === 0;
	// "Swipe today's deck again" replays the same twelve cards: with every one of them already in My STAK there is nothing
	// left to decide, and the phones hide it then (android DiscoverScreen.kt:1459-1460 `canReplay`, ios DiscoverView.swift:823)
	const canReplay = preview || canReplayDeck(deck.order, live.savedTickers);
	// a deck the daily swipe limit closed early is finished with fewer than twelve decisions; its ring shows that share
	const whole = seen >= DECK_SIZE;
	const receipt = [
		{ label: "Seen", value: String(seen) },
		{ label: "Saved", value: String(saved) },
		{ label: "Bought", value: String(bought) },
	];
	return (
		// the page is the frame (1024 tall, the window's height when taller) under the shell's 88px top padding. Below 1024
		// (SPEC R6, CORE-API section 4) the 1024 band gives way: the page is as tall as the receipt, nothing scrolls into
		// blank space. On a tablet Back keeps Figma's place in the 88-px top band and the receipt is centred in the window
		// as Figma's CENTER constraint and the 1024+ rule place it (the root's own top padding, discover.css: a child
		// margin would collapse through this root and carry Back down with it); on a phone the frame's absolute places
		// give way to the reading order: Back at the top, the receipt column under it (the phone frame 1:2444 orders it
		// the same way: title, ring, receipt, buttons, link).
		<div className="stak-deck-end relative max-lg:h-auto!" style={{ height: `calc(${fillHeight} - 88px)` }}>
			<BackCrumb
				crumb={endOfDeck.crumb}
				onBack={() => {
					// 2:3453 carries no reaction and the phone receipt has no Back: it leaves to where the person came from. When the
					// receipt was the visit's first page (a reload, a typed address, a notification), the finished deck's own
					// page would only open this receipt again, so Back goes to Home, where the deck is entered from (2:414's deck card).
					if (canGoBack) router.history.back();
					else navigate({ to: "/home", viewTransition: false });
				}}
				// 2:3453 at y 44 of the frame, 38 into the column: the desktop's 88-px top band. The phone top bar covers that band,
				// so on a phone the crumb is in flow at the column's left (R6)
				className="absolute left-[38px] top-[-44px] max-sm:static"
			/>
			{/*
			 * 2:3424 "Receipt column" is constrained CENTER / CENTER: its centre stays 40px right of the frame's and 0.1px
			 * below it, so a taller window keeps it in the middle (top 251 of 1024 = 163 under the padding). Below 1024 it is
			 * in flow, as wide as the column at most and centred in it (R3: a block centred in the frame stays centred): on
			 * a tablet under the root's own top padding (the window centring, discover.css), on a phone one receipt gap
			 * under the crumb. The column clips like Figma's frame; its last control ("Swipe today's deck again") ends on the
			 * clip's bottom edge, which cut the bottom of its keyboard ring (4.3 px, measured at 390, 820 and 1440: the core
			 * pass's finding, coordinator note N11b), so the clip widens 6 px only while that button has keyboard focus, as
			 * Simulate's rows do; the resting pixels are unchanged.
			 */}
			<div
				data-receipt=""
				className="absolute top-[calc(50%-305px)] flex w-[480px] flex-col items-center gap-[40px] overflow-clip max-lg:static max-lg:mx-auto max-lg:w-full max-lg:max-w-[480px] max-sm:mt-[40px] [&:has(>button:focus-visible)]:[overflow-clip-margin:6px]"
				style={{ left: colCentre(480, -63) }}
			>
				<div className="relative size-[79.2px] overflow-clip" role="img" aria-label={`${seen} of ${DECK_SIZE} cards`}>
					{/* "Completion ring" 2:3425: the full ring is Figma's export of 2:3426 */}
					<ProgressRing scale={1.5} value={seen} total={DECK_SIZE} file={whole ? D.ringDone : undefined} />
					{/* 2:3431 "12/12": Sora 19.8, left-aligned at x 14.3996; a shorter count sits on the ring's centre */}
					<p
						aria-hidden="true"
						className={cn(
							"absolute top-[28.4818px] whitespace-nowrap font-sora text-[19.8px] leading-[25px] text-white",
							whole ? "left-[14.3996px]" : "left-1/2 -translate-x-1/2",
						)}
					>
						{seen}/{DECK_SIZE}
					</p>
				</div>
				<h1 className="whitespace-nowrap font-sora text-[28px] font-semibold leading-[35px] text-[#f2f6fc]">{endOfDeck.title}</h1>
				{/* 2:3433: Figma sets this line LEFT-aligned in its 400px box (x 560), not centred */}
				<p className="w-[400px] text-left font-geist text-[13px] leading-[17px] text-[#819abb] max-lg:w-full max-lg:max-w-[400px]">{endOfDeck.body}</p>
				{/* 2:3434 ... 2:3443: three 150-wide tiles 12 apart (474); on a narrower column they share its width (R3 / R7) */}
				<div className="flex items-start gap-[12px] overflow-clip whitespace-nowrap max-lg:w-full max-lg:max-w-[474px]">
					{receipt.map((r) => (
						<div key={r.label} className="flex h-[60px] w-[150px] flex-col items-center gap-[2px] overflow-clip rounded-[12px] bg-[#181f30] py-[12px] max-lg:w-auto max-lg:flex-1">
							<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{r.label}</p>
							<p className="font-sora text-[20px] font-semibold leading-[25px] text-[#f2f6fc]">{r.value}</p>
						</div>
					))}
				</div>
				<div className="flex flex-col items-start max-lg:w-full max-lg:items-center">
					<div className="flex w-[320px] flex-col items-center gap-[11px] max-lg:w-full max-lg:max-w-[320px]">
						{/* 2:3446 / 2:3448 / 2:3451 are plain frames and texts with no hover or pressed state (the canon draws none) */}
						<PrimaryButton onClick={() => navigate({ to: "/simulate", viewTransition: false })}>
							{noSaves ? END_WITHOUT_SAVES.primary : endOfDeck.primary}
						</PrimaryButton>
						<GhostButton onClick={() => navigate({ to: "/my-stak", viewTransition: false })}>{noSaves ? END_WITHOUT_SAVES.secondary : endOfDeck.secondary}</GhostButton>
					</div>
				</div>
				{canReplay && (
					<button
						type="button"
						onClick={() => {
							leaving.current = true;
							// 1:2493 -> 1:1741 "first run", instant: the SAME deck again from its first card (NVDA in front, 1/12, the same
							// kicker). deck.restart() replays today's twelve cards in their order and theme with the run's decisions
							// cleared. The receipt's history entry is replaced: the fresh deck's Back goes on to where the person came
							// from, not to a receipt of a deck that is no longer finished.
							deck.restart();
							navigate({ to: "/discover", search: layout, replace: true, viewTransition: false });
						}}
						className="cursor-pointer whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#819abb]"
					>
						{endOfDeck.again}
					</button>
				)}
			</div>
		</div>
	);
}
