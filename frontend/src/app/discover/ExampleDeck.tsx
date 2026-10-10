import { colCentre } from "@/app/FitCanvas";
import type { DeckCard as DeckCardData } from "@/app/live/deck";
import { companyName } from "@/app/live/catalog";
import { ExampleTopBar } from "@/app/ui/ExampleTopBar";
import { PrimaryButton } from "@/app/ui/Button";
import { cn } from "@/lib/utils";
import { D } from "./assets";
import { deckCopy } from "./data";

/**
 * Figma 2:6451 "EXAMPLE · Desktop · Discover deck (click + keyboard)" (00 References), reachable as
 * `/discover?variant=example`: one 420-wide card centred in the column, Pass / Practice buy / Learn more
 * under it, round ‹ › arrows beside it and the keyboard-hints pill at the foot of the 1024 frame. Every
 * block is placed relative to the card, which keeps the frame's own centring shift (card centre 828 vs
 * column centre 823) at any width; nothing scales. The state machine is the route's (the product deck's).
 */
const CARD_W = 420;
const CARD_TOP = 150 - 88; // frame y 150, under the shell's 88px top padding
const ICON_SAVE = "/app-assets/847b8.svg"; // the 12px bookmark the example's Save chip carries

type Props = {
	card: DeckCardData | undefined;
	saved: boolean;
	kicker: string;
	counter: number;
	total: number;
	leaving: boolean;
	entering: boolean;
	toast: boolean;
	onPass: () => void;
	onSave: () => void;
	onBuy: () => void;
	onLearnMore: () => void;
};

export function ExampleDeck({ card, saved, kicker, counter, total, leaving, entering, toast, onPass, onSave, onBuy, onLearnMore }: Props) {
	const falling = !!card && card.change.startsWith("▼");
	return (
		<div className="relative" style={{ minHeight: 1024 - 88 }}>
			<ExampleTopBar crumb={"Discover  ·  Today’s deck"} right={`${counter} / ${total}`} />
			{/* the bar is decoration; progress is announced here, as the product deck's counter is */}
			<p role="status" className="sr-only">{`${counter} of ${total} cards`}</p>
			<div className="absolute" style={{ left: colCentre(CARD_W, 5), top: CARD_TOP, width: CARD_W }}>
				{card && (
					<article
						key={card.symbol}
						aria-label={`${card.symbol}: ${card.headline}`}
						className={cn(
							"flex w-full flex-col items-start gap-[12px] overflow-clip rounded-[20px] bg-[#0e1a36] p-[24px]",
							leaving && "stak-deck-out",
							entering && !leaving && "stak-deck-in",
						)}
					>
						<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb]">{kicker}</p>
						<div className="flex h-[34px] w-full items-center justify-between overflow-clip">
							<p className="whitespace-nowrap font-sora text-[24px] font-semibold leading-[30px] text-[#f2f6fc]">{card.symbol}</p>
							<button
								type="button"
								onClick={onSave}
								aria-pressed={saved}
								aria-label={saved ? `${card.symbol} saved to My STAK` : `Save ${card.symbol} to My STAK`}
								aria-keyshortcuts="ArrowRight"
								className="stak-press flex shrink-0 cursor-pointer items-center justify-center gap-[6px] overflow-clip rounded-[16px] bg-[rgba(255,255,255,0.09)] px-[13px] py-[7px]"
							>
								<span className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-white">{saved ? deckCopy.saved : deckCopy.save}</span>
								<img alt="" src={saved ? D.bookmarkSaved : ICON_SAVE} className="size-[12px]" />
							</button>
						</div>
						<p className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#819abb]">{companyName(card.symbol)}</p>
						<p className="whitespace-nowrap font-sora text-[32px] font-semibold leading-[40px] text-[#f2f6fc]">{card.price}</p>
						<p className={cn("whitespace-nowrap font-geist text-[13px] font-medium leading-[17px]", falling ? "text-[#e5484d]" : "text-[#2fd08a]")}>{card.change}</p>
						<p className="line-clamp-2 w-[372px] font-geist text-[13px] leading-[17px] text-[#f2f6fc]">{card.headline}</p>
						<div className="flex h-[40px] w-full items-baseline gap-[8px] overflow-clip rounded-[10px] bg-[#12203e] px-[12px] py-[10px]">
							<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#5bd7e4]">TIP</p>
							<p className="w-[280px] truncate font-geist text-[11px] leading-[14px] text-[#819abb]">{card.tip}</p>
						</div>
					</article>
				)}

				{/* ‹ › sit beside the card (frame x 480 / 1160, y 400) and mirror the ← → keys */}
				<button
					type="button"
					aria-label="Pass, next card"
					aria-keyshortcuts="ArrowLeft"
					onClick={onPass}
					disabled={!card}
					className="stak-press absolute flex size-[44px] cursor-pointer items-center justify-center overflow-clip rounded-[22px] border border-[rgba(255,255,255,0.14)]"
					style={{ left: 480 - 618, top: 400 - 150 }}
				>
					<span className="whitespace-nowrap font-sora text-[13px] leading-normal text-[#819abb]">‹</span>
				</button>
				<button
					type="button"
					aria-label={card ? `Save ${card.symbol} to My STAK` : "Save to My STAK"}
					aria-pressed={saved}
					aria-keyshortcuts="ArrowRight"
					onClick={onSave}
					disabled={!card}
					className="stak-press absolute flex size-[44px] cursor-pointer items-center justify-center overflow-clip rounded-[22px] border border-[rgba(255,255,255,0.14)]"
					style={{ left: 1160 - 618, top: 400 - 150 }}
				>
					<span className="whitespace-nowrap font-sora text-[13px] leading-normal text-[#819abb]">›</span>
				</button>

				{/* the decision row (frame 599,476 · 442 wide): Pass · Practice buy · Learn more */}
				<div className="absolute flex items-center gap-[16px] overflow-clip" style={{ left: 599 - 618, top: 476 - 150 }}>
					<button
						type="button"
						aria-label="Pass"
						aria-keyshortcuts="ArrowLeft"
						onClick={onPass}
						disabled={!card}
						className="stak-press flex h-[44px] w-[120px] shrink-0 cursor-pointer items-center justify-center overflow-clip rounded-[14px] border border-[rgba(255,255,255,0.14)]"
					>
						<span className="whitespace-nowrap font-sora text-[13px] leading-normal text-[#819abb]">Pass</span>
					</button>
					<PrimaryButton width={190} aria-keyshortcuts="Enter" onClick={onBuy} disabled={!card}>
						{deckCopy.practiceBuy}
					</PrimaryButton>
					<button
						type="button"
						onClick={onLearnMore}
						disabled={!card}
						className="stak-press flex h-[40px] w-[100px] shrink-0 cursor-pointer items-center justify-center overflow-clip rounded-[14px]"
					>
						<span className="whitespace-nowrap font-geist text-[12px] font-medium leading-normal text-[#819abb]">{deckCopy.learnMore}</span>
					</button>
				</div>

				{/* "Keyboard hints" (frame 701.5,920): decorative, the shortcuts are on the controls' aria-keyshortcuts */}
				<div
					aria-hidden="true"
					className="absolute flex items-center gap-[24px] overflow-clip whitespace-pre rounded-[999px] bg-[#12203e] px-[18px] py-[10px] font-geist text-[12px] leading-[16px] text-[#819abb]"
					style={{ left: 701.5 - 618, top: 920 - 150 }}
				>
					<p>{"←  Pass"}</p>
					<p>{"→  Save"}</p>
					<p>{"↵  Practice buy"}</p>
				</div>

				{/* the product's "Saved to My STAK" toast, over the card's top edge (the example authors no toast of its own) */}
				{toast && (
					<div className="absolute flex h-[44.963px] w-[161.348px] items-center justify-center" style={{ left: (CARD_W - 161.348) / 2, top: -22 }} aria-hidden="true">
						<div className="stak-sheet-in flex rotate-[-2.15deg] items-center gap-[9px] overflow-clip rounded-[18px] bg-[rgba(36,43,61,0.48)] px-[16px] py-[11px]">
							<img alt="" src={D.toastBookmark} className="size-[17px]" />
							<p className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-white">{deckCopy.toast}</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
