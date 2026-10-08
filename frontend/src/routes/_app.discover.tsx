import { DeckSkeleton } from "@/app/discover/DeckSkeleton";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { D } from "@/app/discover/assets";
import { GhostButton, PrimaryButton } from "@/app/discover/Button";
import { DeckCard } from "@/app/discover/DeckCard";
import { deckCards, deckCopy, deckHeader } from "@/app/discover/data";
import { deckTicket } from "@/app/stocks/data";
import { PracticeBuySheet } from "@/app/stocks/PracticeBuySheet";

type DeckSearch = { state?: "saved" | "buy"; i?: number; loading?: boolean };

export const Route = createFileRoute("/_app/discover")({
	validateSearch: (s: Record<string, unknown>): DeckSearch => ({
		state: s.state === "saved" || s.state === "buy" ? s.state : undefined,
		loading: s.loading === true || s.loading === 1 || s.loading === "1" ? true : undefined,
		i: typeof s.i === "number" && s.i >= 0 && s.i < deckHeader.total ? s.i : undefined,
	}),
	component: DiscoverPage,
});

/** Today's deck: twelve cards cycling the three Figma demo cards (AAPL · NVDA · GOOGL). */
const deck = Array.from({ length: deckHeader.total }, (_, k) => deckCards[k % deckCards.length]);

/**
 * Figma 2:2944 "Desktop · Discover deck", 2:3089 "deck · saved" (?state=saved),
 * 2:3239 "Deck · Practice buy confirm" (?state=buy). Keys follow the reference frame 2:6451:
 * ← pass · → save · ↵ practice buy.
 */
function DiscoverPage() {
	const { state, i, loading } = Route.useSearch();
	const navigate = useNavigate();
	const index = i ?? 1;
	const saved = state === "saved";
	if (loading) return <DeckSkeleton />;
	const buying = state === "buy";
	const centre = deck[index];
	const left = deck[(index - 1 + deck.length) % deck.length];
	const right = deck[(index + 1) % deck.length];
	const counter = index + (saved ? 1 : 0);

	const set = useCallback((next: DeckSearch) => navigate({ to: "/discover", search: next }), [navigate]);
	const go = useCallback(
		(k: number) => {
			if (k >= deck.length) {
				navigate({ to: "/discover/end" });
				return;
			}
			set({ i: Math.max(0, k) });
		},
		[navigate, set],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") go(index + 1);
			else if (e.key === "ArrowRight") set({ i: index, state: "saved" });
			else if (e.key === "Enter") set({ i: index, state: "buy" });
			else if (e.key === "Escape") set({ i: index });
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [go, index, set]);

	return (
		<div className="relative -mt-[30px]">
			<header className="flex h-[92px] w-[1087px] items-center justify-between">
				<div className="flex flex-col items-start gap-[6px] overflow-clip whitespace-nowrap">
					<h1 className="font-sora text-[28px] font-semibold leading-[35px] text-[#f2f6fc]">{deckHeader.title}</h1>
					<p className="font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb]">{deckHeader.kicker}</p>
				</div>
				<div className="relative size-[52.8px] overflow-clip" aria-label={`${counter} of ${deckHeader.total}`}>
					<img alt="" src={D.ring} className="absolute left-0 top-0 size-[52.8px]" />
					<p className="absolute left-[14.22px] top-[18.99px] whitespace-nowrap font-sora text-[13.2px] leading-[17px] text-white">
						{counter}/{deckHeader.total}
					</p>
				</div>
			</header>

			<div className="ml-[161px] mt-[46px] flex w-[806.229px] flex-col items-center gap-[64px]">
				<div className="flex w-full flex-col items-center gap-[35px]">
					<div className="relative h-[458.231px] w-[690.509px]">
						<div className="absolute left-0 top-0 z-[1] flex h-[439.887px] w-[368.911px] items-center justify-center">
							<DeckCard card={left} slot="left" />
						</div>
						<div className="absolute left-[343.05px] top-[3.76px] z-0 flex h-[423.583px] w-[347.459px] items-center justify-center">
							<DeckCard card={right} slot="right" />
						</div>
						<div className="absolute left-[160.86px] top-[1.5px] z-[2]">
							<DeckCard card={centre} slot="center" saved={saved} onSave={() => set({ i: index, state: saved ? undefined : "saved" })} />
						</div>
					</div>
					<div className="flex items-center justify-center gap-[93px]">
						<button
							type="button"
							aria-label="Previous card"
							onClick={() => go(index - 1)}
							className="flex size-[40px] items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
						>
							<img alt="" src={D.chevron} className="size-[22px]" />
						</button>
						<button
							type="button"
							aria-label="Next card"
							onClick={() => go(index + 1)}
							className="flex size-[40px] rotate-180 items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
						>
							<img alt="" src={D.chevron} className="size-[22px]" />
						</button>
					</div>
				</div>
				<div className="flex w-[320px] flex-col items-center gap-[11px]">
					<PrimaryButton onClick={() => set({ i: index, state: "buy" })}>{deckCopy.practiceBuy}</PrimaryButton>
					<GhostButton onClick={() => navigate({ to: "/stocks/$symbol", params: { symbol: centre.symbol } })}>
						{deckCopy.learnMore}
					</GhostButton>
				</div>
			</div>

			{saved && (
				<div className="absolute left-[464.33px] top-[118.01px] flex h-[44.963px] w-[161.348px] items-center justify-center" role="status">
					<div className="flex rotate-[-2.15deg] items-center gap-[9px] overflow-clip rounded-[18px] bg-[rgba(36,43,61,0.48)] px-[16px] py-[11px]">
						<img alt="" src={D.toastBookmark} className="size-[17px]" />
						<p className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-white">{deckCopy.toast}</p>
					</div>
				</div>
			)}

			{buying && (
				<PracticeBuySheet
					symbol={deckTicket.symbol}
					name={deckTicket.name}
					initial={deckTicket.initial}
					price={deckTicket.price}
					changeShort={deckTicket.changeShort}
					shares={deckTicket.shares}
					offsetY={88.5}
					onClose={() => set({ i: index })}
					onConfirm={() => go(index + 1)}
				/>
			)}
		</div>
	);
}
