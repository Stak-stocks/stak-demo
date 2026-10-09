import { DeckSkeleton } from "@/app/discover/DeckSkeleton";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { D } from "@/app/discover/assets";
import { GhostButton, PrimaryButton } from "@/app/discover/Button";
import { DeckCard } from "@/app/discover/DeckCard";
import { deckCopy, deckHeader } from "@/app/discover/data";
import { colCentre } from "@/app/FitCanvas";
import { DECK_SIZE, changeShort, companyInitial, companyName, useDeck, useLive } from "@/app/live";
import { BuyFailedSheet } from "@/app/simulate/sheets";
import { OrderFilledSheet } from "@/app/stocks/OrderFilledSheet";
import { PracticeBuySheet } from "@/app/stocks/PracticeBuySheet";
import { cn } from "@/lib/utils";

type DeckSearch = { state?: "saved" | "buy" | "filled"; i?: number; loading?: boolean };

export const Route = createFileRoute("/_app/discover")({
	validateSearch: (s: Record<string, unknown>): DeckSearch => ({
		state: s.state === "saved" || s.state === "buy" || s.state === "filled" ? s.state : undefined,
		loading: s.loading === true || s.loading === 1 || s.loading === "1" ? true : undefined,
		i: typeof s.i === "number" && s.i >= 0 && s.i < DECK_SIZE ? s.i : undefined,
	}),
	component: DiscoverPage,
});

const OUT_MS = 220;
const IN_MS = 200;

/** The decision motion, transform/opacity only, off under reduced motion (the global tokens stay in styles.css). */
const DECK_MOTION_CSS = `
@media (prefers-reduced-motion: no-preference) {
	@keyframes stak-deck-out { to { transform: translateX(-120px) rotate(-8deg); opacity: 0; } }
	@keyframes stak-deck-in { from { transform: scale(0.9); opacity: 0.6; } to { transform: scale(1); opacity: 1; } }
	.stak-deck-out { animation: stak-deck-out ${OUT_MS}ms ease-in forwards; }
	.stak-deck-in { animation: stak-deck-in ${IN_MS}ms ease-out both; }
}`;

type Phase = { kind: "idle" } | { kind: "buy" } | { kind: "failed" } | { kind: "filled"; shares: number; cash: number };

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Figma 2:2944 "Desktop · Discover deck", 2:3089 "deck · saved", 2:3239 "Deck · Practice buy confirm",
 * on today's live deck. `?i=` / `?state=saved|buy|filled` are previews for the capture harness: they
 * override what is shown without touching progress; a real action syncs the pointer and clears them.
 * Keys follow the reference frame 2:6451: ← pass · → save · ↵ practice buy.
 */
function DiscoverPage() {
	const { state, i, loading } = Route.useSearch();
	const navigate = useNavigate();
	const live = useLive();
	const deck = useDeck();
	const [phase, setPhase] = useState<Phase>({ kind: "idle" });
	const [leaving, setLeaving] = useState(false);
	const [entering, setEntering] = useState(false);
	const [savedToast, setSavedToast] = useState(false);
	const busy = useRef(false);

	const n = deck.order.length;
	const previewing = i !== undefined || state !== undefined;
	const index = n === 0 ? 0 : Math.min(i ?? deck.index, n - 1);
	const centre = deck.cards[index];
	const left = n ? deck.cards[(index - 1 + n) % n] : undefined;
	const right = n ? deck.cards[(index + 1) % n] : undefined;
	const centreSaved = state === "saved" || (!!centre && centre.saved);
	const decidedBefore = deck.order.slice(0, index).filter((t) => deck.decided.has(t)).length;
	const centreDecided = !!centre && (deck.decided.has(centre.symbol) || centreSaved);
	const counter = Math.min(deck.total, Math.max(index, decidedBefore) + (centreDecided ? 1 : 0));
	const price = centre?.quote?.price ?? 0;
	const ticketUp = phase.kind === "buy" || state === "buy";
	const filledUp = phase.kind === "filled" || state === "filled";

	// a finished (or metered-out) deck lands on the receipt — never while a frame preview is shown
	useEffect(() => {
		if (loading || previewing || n === 0) return;
		if (deck.done || deck.limitReached) {
			deck.finish();
			navigate({ to: "/discover/end", replace: true });
		}
	}, [loading, previewing, n, deck.done, deck.limitReached, deck.finish, navigate]);

	const clearPreview = useCallback(() => {
		if (previewing) navigate({ to: "/discover", search: {}, replace: true });
	}, [previewing, navigate]);

	const toEnd = useCallback(() => {
		deck.finish();
		navigate({ to: "/discover/end" });
	}, [deck.finish, navigate]);

	/** Pass: the card leaves to the left, then the next one scales in. */
	const onPass = useCallback(async () => {
		if (!centre || busy.current) return;
		busy.current = true;
		setLeaving(true);
		await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : OUT_MS));
		const ok = await deck.pass(centre.symbol);
		setLeaving(false);
		busy.current = false;
		if (!ok || index + 1 >= n) {
			toEnd();
			return;
		}
		deck.go(index + 1);
		clearPreview();
		setEntering(true);
		setTimeout(() => setEntering(false), IN_MS);
	}, [centre, deck, index, n, toEnd, clearPreview]);

	/** Save keeps the card (the chip reads Saved, the toast shows); a second press takes it back out. */
	const onSave = useCallback(async () => {
		if (!centre || busy.current) return;
		if (centre.saved && state !== "saved") {
			await deck.unsave(centre.symbol);
			toast("Removed from My STAK");
			return;
		}
		if (previewing) deck.go(index);
		const ok = await deck.save(centre.symbol, price || null);
		if (!ok) {
			toEnd();
			return;
		}
		setSavedToast(true);
		setTimeout(() => setSavedToast(false), 2500);
		clearPreview();
	}, [centre, state, previewing, deck, index, price, toEnd, clearPreview]);

	const onPrevious = useCallback(() => {
		if (index === 0) return;
		if (previewing) {
			navigate({ to: "/discover", search: { i: index - 1 } });
			return;
		}
		deck.go(index - 1);
	}, [index, previewing, navigate, deck]);

	const confirmBuy = async (amount: number) => {
		if (!centre) return;
		try {
			const pos = await live.actions.buy(centre.symbol, amount, price);
			if (previewing) deck.go(index);
			deck.markBought(centre.symbol);
			setPhase({ kind: "filled", shares: pos.shares, cash: Math.round((live.cash - amount) * 100) / 100 });
			if (state === "buy") clearPreview();
			toast("Order filled");
		} catch {
			setPhase({ kind: "failed" });
			if (state === "buy") clearPreview();
		}
	};

	const keepExploring = () => {
		setPhase({ kind: "idle" });
		if (state === "filled") {
			clearPreview();
			return;
		}
		if (index + 1 >= n) toEnd();
		else {
			deck.go(index + 1);
			setEntering(true);
			setTimeout(() => setEntering(false), IN_MS);
		}
	};

	useEffect(() => {
		if (ticketUp || filledUp || phase.kind !== "idle") return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") onPass();
			else if (e.key === "ArrowRight") onSave();
			else if (e.key === "Enter" && centre) setPhase({ kind: "buy" });
			else if (e.key === "Escape") clearPreview();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [ticketUp, filledUp, phase.kind, onPass, onSave, centre, clearPreview]);

	if (loading) return <DeckSkeleton />;

	return (
		<div className="relative -mt-[30px]">
			<style>{DECK_MOTION_CSS}</style>
			<header className="flex h-[92px] w-full items-center justify-between pr-[47px]">
				<div className="flex flex-col items-start gap-[6px] overflow-clip whitespace-nowrap">
					<h1 className="font-sora text-[28px] font-semibold leading-[35px] text-[#f2f6fc]">{deckHeader.title}</h1>
					<p className="font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb]">{deck.theme.kicker}</p>
				</div>
				<div className="relative size-[52.8px] overflow-clip" role="status" aria-label={`${counter} of ${deck.total} cards`}>
					<img alt="" src={D.ring} className="absolute left-0 top-0 size-[52.8px]" />
					<p className="absolute left-[14.22px] top-[18.99px] whitespace-nowrap font-sora text-[13.2px] leading-[17px] text-white">
						{counter}/{deck.total}
					</p>
				</div>
			</header>

			<div className="mt-[46px] flex w-[806.229px] flex-col items-center gap-[64px]" style={{ marginLeft: colCentre(812) }}>
				<div className="flex w-full flex-col items-center gap-[35px]">
					<div className="relative h-[458.231px] w-[690.509px]">
						{left && (
							<div className="absolute left-0 top-0 z-[1] flex h-[439.887px] w-[368.911px] items-center justify-center">
								<DeckCard card={left} slot="left" saved={left.saved} />
							</div>
						)}
						{right && (
							<div className="absolute left-[343.05px] top-[3.76px] z-0 flex h-[423.583px] w-[347.459px] items-center justify-center">
								<DeckCard card={right} slot="right" saved={right.saved} />
							</div>
						)}
						{centre && (
							<div
								key={centre.symbol}
								className={cn("absolute left-[160.86px] top-[1.5px] z-[2]", leaving && "stak-deck-out", entering && !leaving && "stak-deck-in")}
							>
								<DeckCard card={centre} slot="center" saved={centreSaved} onSave={onSave} />
							</div>
						)}
					</div>
					<div className="flex items-center justify-center gap-[93px]">
						<button
							type="button"
							aria-label="Previous card"
							onClick={onPrevious}
							disabled={index === 0}
							className="stak-press flex size-[40px] cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
						>
							<img alt="" src={D.chevron} className="size-[22px]" />
						</button>
						<button
							type="button"
							aria-label="Pass, next card"
							onClick={onPass}
							className="stak-press flex size-[40px] rotate-180 cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
						>
							<img alt="" src={D.chevron} className="size-[22px]" />
						</button>
					</div>
				</div>
				<div className="flex w-[320px] flex-col items-center gap-[11px]">
					<PrimaryButton onClick={() => centre && setPhase({ kind: "buy" })} disabled={!centre}>
						{deckCopy.practiceBuy}
					</PrimaryButton>
					<GhostButton onClick={() => centre && navigate({ to: "/stocks/$symbol", params: { symbol: centre.symbol } })} disabled={!centre}>
						{deckCopy.learnMore}
					</GhostButton>
				</div>
			</div>

			{(state === "saved" || savedToast) && (
				<div className="absolute top-[118.01px] flex h-[44.963px] w-[161.348px] items-center justify-center" style={{ left: colCentre(812, 303.33) }} role="status">
					<div className="stak-sheet-in flex rotate-[-2.15deg] items-center gap-[9px] overflow-clip rounded-[18px] bg-[rgba(36,43,61,0.48)] px-[16px] py-[11px]">
						<img alt="" src={D.toastBookmark} className="size-[17px]" />
						<p className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-white">{deckCopy.toast}</p>
					</div>
				</div>
			)}

			{ticketUp && centre && (
				<PracticeBuySheet
					ticker={centre.symbol}
					name={companyName(centre.symbol)}
					initial={companyInitial(centre.symbol)}
					price={price}
					changeShort={centre.quote ? changeShort(centre.quote.changePercent) : centre.change.replace(" today", "")}
					cash={live.cash}
					offsetY={88.5}
					onClose={() => {
						setPhase({ kind: "idle" });
						if (state === "buy") clearPreview();
					}}
					onConfirm={confirmBuy}
				/>
			)}
			{phase.kind === "failed" && centre && (
				<BuyFailedSheet
					stock={{
						name: companyName(centre.symbol),
						nameConfirm: companyName(centre.symbol),
						price,
						pct: centre.quote ? changeShort(centre.quote.changePercent) : "",
						up: (centre.quote?.changePercent ?? 0) >= 0,
						initial: companyInitial(centre.symbol),
					}}
					onRetry={() => setPhase({ kind: "buy" })}
					onClose={() => setPhase({ kind: "idle" })}
				/>
			)}
			{filledUp && centre && (
				<OrderFilledSheet
					ticker={centre.symbol}
					name={companyName(centre.symbol)}
					initial={companyInitial(centre.symbol)}
					price={price}
					changeShort={centre.quote ? changeShort(centre.quote.changePercent) : ""}
					shares={phase.kind === "filled" ? phase.shares : price ? Math.round((25 / price) * 10000) / 10000 : 0}
					cash={phase.kind === "filled" ? phase.cash : Math.max(0, live.cash - 25)}
					onPrimary={() => navigate({ to: "/my-stak" })}
					onSecondary={keepExploring}
					onClose={() => {
						setPhase({ kind: "idle" });
						if (state === "filled") clearPreview();
					}}
				/>
			)}
		</div>
	);
}
