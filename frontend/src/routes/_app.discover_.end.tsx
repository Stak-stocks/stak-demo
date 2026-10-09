import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { D } from "@/app/discover/assets";
import { BackCrumb } from "@/app/discover/BackCrumb";
import { GhostButton } from "@/app/discover/Button";
import { PrimaryButton } from "@/app/ui/Button";
import { endOfDeck } from "@/app/discover/data";
import { colCentre } from "@/app/FitCanvas";
import { DECK_SIZE, useDeck, useLive } from "@/app/live";

type EndSearch = { preview?: boolean };

export const Route = createFileRoute("/_app/discover_/end")({
	validateSearch: (s: Record<string, unknown>): EndSearch => ({
		preview: s.preview === true || s.preview === 1 || s.preview === "1" ? true : undefined,
	}),
	component: EndOfDeckPage,
});

/** Figma 2:3422 "Desktop · End of deck": the receipt of today's deck (seen · saved · bought); `?preview=1` shows the frame's numbers. */
function EndOfDeckPage() {
	const navigate = useNavigate();
	const { preview } = Route.useSearch();
	const live = useLive();
	const deck = useDeck();
	const progress = live.deck;
	const seen = preview ? DECK_SIZE : Math.min(DECK_SIZE, deck.decided.size);
	const saved = preview ? 7 : (progress?.saved.length ?? 0);
	const bought = preview ? 2 : (progress?.bought.length ?? 0);
	const receipt = [
		{ label: "Seen", value: String(seen) },
		{ label: "Saved", value: String(saved) },
		{ label: "Bought", value: String(bought) },
	];
	const body =
		preview || seen >= DECK_SIZE
			? endOfDeck.body
			: seen === 0
				? "Today’s deck is waiting. Twelve cards, twelve signals."
				: `${seen} of twelve so far. Every swipe sharpens your taste graph.`;
	return (
		<div className="relative h-[936px]">
			<BackCrumb crumb={endOfDeck.crumb} onBack={() => navigate({ to: "/discover" })} className="absolute left-[38px] top-[-44px]" />
			<div className="absolute top-[163px] flex w-[480px] flex-col items-center gap-[40px] overflow-clip" style={{ left: colCentre(480, -63) }}>
				<div className="relative size-[79.2px] overflow-clip">
					<img alt="" src={D.ringDone} className="absolute left-0 top-0 size-[79.2px]" />
					<p className="absolute left-[calc(50%-25.2px)] top-[28.48px] whitespace-nowrap font-sora text-[19.8px] leading-[25px] text-white">
						{seen}/{DECK_SIZE}
					</p>
				</div>
				<h1 className="whitespace-nowrap font-sora text-[28px] font-semibold leading-[35px] text-[#f2f6fc]">
					{preview || seen >= DECK_SIZE ? endOfDeck.title : "Deck in progress"}
				</h1>
				<p className="w-[400px] text-center font-geist text-[13px] leading-[17px] text-[#819abb]">{body}</p>
				<div className="flex items-start gap-[12px] overflow-clip whitespace-nowrap">
					{receipt.map((r) => (
						<div key={r.label} className="flex h-[60px] w-[150px] flex-col items-center gap-[2px] overflow-clip rounded-[12px] bg-[#181f30] py-[12px]">
							<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{r.label}</p>
							<p className="font-sora text-[20px] font-semibold leading-[20px] text-[#f2f6fc]">{r.value}</p>
						</div>
					))}
				</div>
				<div className="flex flex-col items-start">
					<div className="flex w-[320px] flex-col items-center gap-[11px]">
						<PrimaryButton onClick={() => navigate({ to: "/simulate" })}>{endOfDeck.primary}</PrimaryButton>
						<GhostButton onClick={() => navigate({ to: "/my-stak" })}>{endOfDeck.secondary}</GhostButton>
					</div>
				</div>
				<button
					type="button"
					onClick={() => {
						deck.restart();
						navigate({ to: "/discover" });
					}}
					className="stak-press cursor-pointer whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#819abb]"
				>
					{endOfDeck.again}
				</button>
			</div>
		</div>
	);
}
