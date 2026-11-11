import { type MouseEvent, useEffect, useRef, useState } from "react";
import { colCentre } from "@/app/FitCanvas";
import { companyName } from "@/app/live/catalog";
import type { DeckCard as DeckCardData } from "@/app/live/deck";
import "@/app/stocks/ticket.css";
import { signText } from "@/app/stocks/tone";
import { PrimaryButton } from "@/app/ui/Button";
import { ExampleTopBar } from "@/app/ui/ExampleTopBar";
import { cn } from "@/lib/utils";
import { D } from "./assets";
import { deckCopy } from "./data";

/**
 * Figma 2:6451 "EXAMPLE · Desktop · Discover deck (click + keyboard)" (00 References), reachable as
 * `/discover?variant=example`: one 420-wide card, Pass / Practice buy / Learn more under it, round ‹ › arrows beside it
 * and the keyboard-hints pill at the foot of the 1024 frame. Every block is placed relative to the card, which keeps
 * the frame's own centring (card centre 828 = the content area's middle, the column's centre + 5) at any width; nothing
 * scales above 1440. The state machine is the route's (the product deck's).
 */
const CARD_W = 420;
/** "Deck card" 2:6456 at frame (618, 150): y under the shell's 88px top padding */
const CARD_TOP = 150 - 88;
/** "Deck card" 2:6456 ends at y 448 (298 tall, hugging its content); the controls below and beside it hang off that edge. */
const CARD_BOTTOM = 448;
/** "icon/bookmark" 2:6462: the 12px outline glyph of the Save chip, Figma's own export */
const ICON_SAVE = "/figma/ref-examples/icon-bookmark__2-6462.svg";
/**
 * The Saved chip's glyph: the EXAMPLE frame draws no saved state, so the chip takes the EXAMPLE set's own 12px FILLED
 * bookmark ("icon/bookmark" 2:6333, SINCE YOU SAVED on 2:6311: the same 8 x 10 path filled #d9d9d9 with the #aeaeae
 * stroke) in the same 12 x 12 slot, at its own size (the product deck's 12.7332px glyph 2:3208 would be squeezed).
 */
const ICON_SAVED = "/figma/ref-examples/icon-bookmark__2-6333.svg";
/** A text in Figma's auto-width box: its glyph run rounded up to a whole pixel, left-aligned ("TIP" 17, "Learn more" 64, "›" 5 …). */
const FIT = "w-[calc-size(max-content,round(up,size,1px))] text-left";
/** The round arrows and Pass (2:6478 / 2:6480 / 2:6472): a 1px INSIDE stroke of white at 14 % (a border inside the box). */
const STROKE = "border border-solid border-[rgba(255,255,255,0.14)]";
/**
 * Figma's clipping frames ("Frame" 2:6458, the 34px ticker row; "Frame" 2:6471, the button row) cut whatever leaves
 * them, the Practice buy glow and its 0.361 outside stroke included; the canvas's focus ring (2px #69b3ca, 2px out) of a
 * control flush with their edge would be cut too. They clip at their edge at rest and 4px out only while a control in
 * them has keyboard focus, so the resting pixels stay Figma's and the ring shows whole.
 */
const CLIP_FOCUS = "overflow-clip [&:has(:focus-visible)]:[overflow-clip-margin:4px]";
/*
 * Below 1024 (SPEC R1-R11; every class below is a `max-lg:` or `max-[872px]:` variant, so 1024 and up keep the approved
 * pixels) the frame's pieces keep their own sizes and are laid out on the column the way the product deck's compact
 * code sets its own (src/routes/_app.discover.tsx, discover.css): the frame's own arrangement wherever the column holds
 * it, a reading-order one where it does not. The card is centred on the column at the frame's own 62 under the top bar
 * (CARD_TOP), Figma's 420 wide, or the column's width where that is narrower (R3).
 * - A column of 752 or more (a tablet window of 872 or more: the column is W - 120, CORE-API section 3) holds 2:6451's
 *   arrangement around the centred card (‹ 138 left of it, ›'s right edge 166 right of it), so it stays as at 1440: ‹ ›
 *   at the card's sides, 4 above its bottom edge, and the decision row 28 under the card, 19 left of its edge, as the
 *   product deck keeps 2:2944's fan on a column of 690 or more.
 * - Narrower (phones, and tablets under 872), ‹ › leave the card's sides for a centred row 35 under it, 93 apart (the
 *   product deck's ‹ › row in "Frame 1618869215" 2:2959), and the decision row (Pass · Practice buy · Learn more, 16
 *   apart) follows 64 under that row, centred, wrapping onto a second line where its 442 do not fit (R5).
 * At every compact width the hints pill leaves the 1024 frame's foot (R6) for the flow, centred, 64 under the buttons.
 * The card still hugs its content (a wrapped headline or tip makes it taller and everything under it follows, as at
 * 1440); the 372 headline and 280 tip boxes fill a narrower card (R3), the one-line company name and kicker wrap instead
 * of running past it (R7), and no text is drawn smaller (R1). The DOM order is the visual order (R10): card, ‹ ›, the
 * decision row; where ‹ › sit beside the card it is 1440's approved order.
 */

type Props = {
	card: DeckCardData | undefined;
	/** the company's name as the route prints it in this flow (the card's own, or the one display name past the showcase: N30.8f) */
	name?: string;
	saved: boolean;
	kicker: string;
	counter: number;
	total: number;
	/** the route's toast: "Saved to My STAK" or, when Saved is pressed again, "Removed from My STAK" */
	toast: "saved" | "unsaved" | null;
	/** a sheet (the ticket, Order filled, the failed buy) is over the deck: the card's toast leaves with its frame */
	sheetUp: boolean;
	onPass: () => void;
	onSave: () => void;
	onBuy: () => void;
	onLearnMore: () => void;
};

/**
 * "NVIDIA Corp" (2:6464): the company part of the card's ticker line ("NVDA · NVIDIA Corp"), the catalog name otherwise.
 * The route names the card's ticket and its result sheets with it too, so one flow keeps one name.
 */
export const exampleCardName = (card: DeckCardData) => card.ticker.split(" · ").slice(1).join(" · ") || companyName(card.symbol);
const nameOf = exampleCardName;

/**
 * "Saved to My STAK" belongs to the saved-card frame (phone 1:1873 / 1:2042 -> 1:1910, the toast 2:3234 drawn over
 * the card that was just saved): it shows over the card it was raised for and leaves with that frame, when another card
 * comes to the front (Pass, ‹, ←) or a sheet opens over the deck (↵, Practice buy: 1:2084 draws no toast). The route
 * raises it for 2.5 s; this tracks which card it belongs to: the card in front when it rose, a card that turns saved
 * while it is up, and a card whose Saved chip (or ›, →) is pressed again.
 */
function useCardToast(raised: boolean, symbol: string | undefined, saved: boolean, sheetUp: boolean) {
	const [owner, setOwner] = useState<string | null>(raised && !sheetUp ? (symbol ?? null) : null);
	const [prev, setPrev] = useState({ raised, symbol, saved, sheetUp });
	if (prev.raised !== raised || prev.symbol !== symbol || prev.saved !== saved || prev.sheetUp !== sheetUp) {
		let next = owner;
		// the frame is left: a new card in front, a sheet over the deck, or the route let the toast go
		if (prev.symbol !== symbol || (sheetUp && !prev.sheetUp) || !raised) next = null;
		// the toast rises over the card in front, or the card in front was just saved while it is up
		if (raised && !sheetUp && symbol && (!prev.raised || (saved && !prev.saved && prev.symbol === symbol))) next = symbol;
		setPrev({ raised, symbol, saved, sheetUp });
		if (next !== owner) setOwner(next);
	}
	// "Saved" pressed again (the chip, ›, →) removes the save, and the toast (now "Removed from My STAK") rises over this card
	const claim = () => {
		if (symbol && saved && !sheetUp) setOwner(symbol);
	};
	return { up: raised && !sheetUp && !!symbol && owner === symbol, claim };
}

/**
 * 2:6451 carries no reactions and no motion (read 2026-10-18: 95 layers, 0 reactions, no keyframes), so its controls
 * follow the product deck's wiring for the same layers (phone 1:1741): the card and Learn more open the stock detail at
 * once (1:1854 / 1:1899), Save turns the chip and shows the toast at once, the card staying in front (1:1873 -> 1:1910;
 * Saved pressed again removes the save with the product deck's "Removed from My STAK" toast, the user's ruling of
 * 2026-10-30), Practice buy opens the ticket at once (1:1897). Pass, ‹ and ← pass the
 * card (no wiring: the next card comes in at once); › and → are the Save chip's twins, as the hints pill prints
 * (← Pass · → Save · ↵ Practice buy): they save the card in front, or remove the save of a saved one with the same
 * "Removed from My STAK" toast. Every control is a plain frame in Figma: no hover or pressed look, the cursor and the
 * canvas's focus ring only.
 */
export function ExampleDeck({ card, name, saved, kicker, counter, total, toast, sheetUp, onPass, onSave, onBuy, onLearnMore }: Props) {
	// the product card's names (DeckCard): Save toggles, so a saved card's chip removes the save
	const saveLabel = card ? (saved ? `Unsave ${card.symbol} from My STAK` : `Save ${card.symbol} to My STAK`) : "Save to My STAK";
	const cardToast = useCardToast(toast !== null, card?.symbol, saved, sheetUp);
	const claim = useRef(cardToast.claim);
	claim.current = cardToast.claim;
	const save = () => {
		claim.current();
		onSave();
	};
	// → is the route's key (the hints pill's "→ Save"); on a saved card it removes the save (the route's toggle), and the
	// "Removed from My STAK" toast rises over this card, as for the chip and ›
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight" && !e.defaultPrevented && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) claim.current();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		// below 1024 the page is as tall as its content (the shell ends it 32 under the last piece): no 1024 band
		<div className="relative max-lg:min-h-0!" style={{ minHeight: 1024 - 88 }}>
			{/* the crumb is the page's title for assistive tech (h1), as the product deck's "Discover" is */}
			<ExampleTopBar heading crumb={"Discover  ·  Today’s deck"} right={`${counter} / ${total}`} />
			{/* the bar's "1 / 12" is decoration; progress is announced here, as the product deck's counter is */}
			<p role="status" className="sr-only">{`${counter} of ${total} cards`}</p>
			{/* below 1024 in flow on the column, 62 (CARD_TOP) under the content's top as at 1440: the card's 420, centred, where
			    the column holds the frame's arrangement (a window of 872 or more); the column's width under 872 */}
			<div className="absolute max-lg:static max-lg:mx-auto max-lg:mt-[62px] max-[872px]:w-full!" style={{ left: colCentre(CARD_W, 5), top: CARD_TOP, width: CARD_W }}>
				{/*
				 * The card hugs its content (2:6456: vertical auto layout, HUG): a live headline or tip that wraps makes it taller
				 * than the frame's 298. What Figma hangs off its bottom edge keeps its distance to that edge: the arrows end 4px
				 * above it (frame y 400 + 44 = 444 of 448) and the button row starts 28px below it (y 476), so nothing is eaten.
				 * From 872 to 1023 that holds as at 1440. Under 872 it is the column's width at most 420, centred, and a wrapping
				 * row: the card takes the first line, ‹ › the second (93 apart, centred), the toast stays over the card's top edge.
				 */}
				<div className="relative max-[872px]:mx-auto max-[872px]:flex max-[872px]:max-w-[420px] max-[872px]:flex-wrap max-[872px]:justify-center max-[872px]:gap-x-[93px]">
					{card && (
						<article
							key={card.symbol}
							aria-label={`${card.symbol}: ${card.headline}`}
							// the card opens its stock detail (phone 1:1854); pointer only: Learn more is the keyboard path to the same page
							onClick={onLearnMore}
							className="flex w-full cursor-pointer flex-col items-start gap-[12px] overflow-clip rounded-[20px] bg-[#0e1a36] p-[24px]"
						>
							<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb] max-lg:whitespace-normal">{kicker}</p>
							{/* "Frame" 2:6458: the ticker and the Save chip, spaced out on a 34px row */}
							<div className={cn("flex h-[34px] w-full items-center justify-between", CLIP_FOCUS)}>
								{/* "NVDA" 2:6459: the card's title (h2 for assistive tech, drawn as the text layer) */}
								<h2 className="whitespace-nowrap font-sora text-[24px] font-semibold leading-[30px] text-[#f2f6fc]">{card.symbol}</h2>
								{/* "Save" 2:6460: #ffffff 9 %, r16, 13 x 7 padding, the label and the 12px glyph 6 apart */}
								<button
									type="button"
									onClick={(e: MouseEvent) => {
										e.stopPropagation(); // the chip's own reaction wins over the card's
										save();
									}}
									aria-label={saveLabel}
									aria-pressed={saved}
									aria-keyshortcuts="ArrowRight"
									className="flex shrink-0 cursor-pointer items-center justify-center gap-[6px] overflow-clip rounded-[16px] bg-[rgba(255,255,255,0.09)] px-[13px] py-[7px]"
								>
									<span className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-white", FIT)}>{saved ? deckCopy.saved : deckCopy.save}</span>
									<img alt="" src={saved ? ICON_SAVED : ICON_SAVE} className="size-[12px] shrink-0" />
								</button>
							</div>
							<p className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:whitespace-normal">{name || nameOf(card)}</p>
							<p className="whitespace-nowrap font-sora text-[32px] font-semibold leading-[40px] text-[#f2f6fc]">{card.price}</p>
							<p className={cn("whitespace-nowrap font-geist text-[13px] font-medium leading-[17px]", signText(card.change))}>{card.change}</p>
							{/* 2:6467: a fixed 372 box that wraps (the card hugs it); a narrower card's width below 1024 */}
							<p className="w-[372px] font-geist text-[13px] leading-[17px] text-[#f2f6fc] max-lg:w-full max-lg:max-w-[372px]">{card.headline}</p>
							{/*
							 * "Frame" 2:6468: #12203e, r10, 12 x 10 padding, TIP and the tip 8 apart on one baseline, 40 tall. The tip text
							 * (2:6470) is a fixed 280 box that wraps; a two-line tip keeps the frame's 10px padding below it (the box grows
							 * to 48 and the card with it) instead of running into the frame's bottom edge. Below 1024 the tip box takes
							 * what the frame leaves after TIP, 280 at most.
							 */}
							<div className="flex min-h-[40px] w-full items-baseline gap-[8px] overflow-clip rounded-[10px] bg-[#12203e] px-[12px] py-[10px]">
								<p className={cn("shrink-0 whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#5bd7e4]", FIT)}>TIP</p>
								<p className="w-[280px] shrink-0 font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:w-auto max-lg:min-w-0 max-lg:max-w-[280px] max-lg:flex-1">{card.tip}</p>
							</div>
						</article>
					)}

					{/* "‹" 2:6478 and "›" 2:6480: 44px rounds beside the card (frame x 480 / 1160, y 400: 4px above its bottom edge), the keys' click twins;
					    beside it from 872 to 1023 too, under 872 in their row under the card, 35 below it (the product deck's ‹ › row) */}
					<button
						type="button"
						aria-label="Pass, next card"
						aria-keyshortcuts="ArrowLeft"
						onClick={onPass}
						disabled={!card}
						className={cn("absolute flex size-[44px] cursor-pointer items-center justify-center overflow-clip rounded-[22px] disabled:cursor-default max-[872px]:static max-[872px]:mt-[35px]", STROKE)}
						style={card ? { left: 480 - 618, bottom: CARD_BOTTOM - 444 } : { left: 480 - 618, top: 400 - 150 }}
					>
						<span className={cn("whitespace-nowrap font-sora text-[13px] leading-[16px] text-[#819abb]", FIT)}>‹</span>
					</button>
					<button
						type="button"
						aria-label={saveLabel}
						aria-keyshortcuts="ArrowRight"
						onClick={save}
						disabled={!card}
						className={cn("absolute flex size-[44px] cursor-pointer items-center justify-center overflow-clip rounded-[22px] disabled:cursor-default max-[872px]:static max-[872px]:mt-[35px]", STROKE)}
						style={card ? { left: 1160 - 618, bottom: CARD_BOTTOM - 444 } : { left: 1160 - 618, top: 400 - 150 }}
					>
						<span className={cn("whitespace-nowrap font-sora text-[13px] leading-[16px] text-[#819abb]", FIT)}>›</span>
					</button>

					{/*
					 * The product deck's "Saved to My STAK" toast (2:3234; the EXAMPLE frame draws no saved state of its own), set
					 * against the card as 2:3089 sets it against its front card: centred on it, the pill's middle 4.6px above the
					 * card's top edge. Its look is 2:3234's: #242b3d 48 %, r18, 16 x 11 padding, Geist Medium 12 white, turned
					 * 2.1456° counter-clockwise, and the GLASS effect drawn as Figma's render reads (the product deck's rims and
					 * washes). It appears at once, as the Save edge is instant (1:1873 -> 1:1910), and leaves with its card.
					 */}
					{cardToast.up && (
						// centred on the card at any card width (below 1024 the card is the column's width, 420 at most)
						<div
							className="absolute flex h-[44.963px] w-[161.348px] items-center justify-center max-lg:left-[calc(50%-80.674px)]!"
							style={{ left: (CARD_W - 161.348) / 2, top: -27.08 }}
							aria-hidden="true"
						>
							<div
								className="flex shrink-0 rotate-[-2.1456deg] items-center gap-[9px] overflow-clip rounded-[18px] px-[16px] py-[11px]"
								style={{
									background:
										"linear-gradient(180deg, rgba(255,255,255,0.005) 0%, rgba(255,255,255,0) 55%), linear-gradient(90deg, rgba(0,0,0,0.09) 0%, rgba(0,0,0,0) 6%, rgba(255,255,255,0) 90%, rgba(255,255,255,0.008) 100%), rgba(36,43,61,0.48)",
									boxShadow: "inset 1px 0 0 rgba(255,255,255,0.17), inset -1px 0 0 rgba(255,255,255,0.11), inset 0 1px 0 rgba(255,255,255,0.012)",
								}}
							>
								<img alt="" src={toast === "unsaved" ? D.bookmark : D.toastBookmark} className="size-[17px] shrink-0" />
								<p className="w-[calc-size(fit-content,round(up,size,1px))] whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-white">
									{toast === "unsaved" ? deckCopy.unsavedToast : deckCopy.toast}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* "Frame" 2:6471 (frame 599, 476 · 442 wide): Pass · Practice buy · Learn more, 16 apart, centred on one line, 28 below the card;
				    the same from 872 to 1023; under 872 centred on the column 64 under the ‹ › row, wrapping where the 442 do not fit (R5) */}
				<div
					className={cn(
						"mt-[28px] flex w-max items-center gap-[16px] max-[872px]:mx-auto! max-[872px]:mt-[64px] max-[872px]:w-fit max-[872px]:max-w-full max-[872px]:flex-wrap max-[872px]:justify-center",
						CLIP_FOCUS,
					)}
					style={{ marginLeft: 599 - 618 }}
				>
					{/* "Pass" 2:6472: 120 x 44, r14, Sora 13 #819abb */}
					<button
						type="button"
						aria-label="Pass"
						aria-keyshortcuts="ArrowLeft"
						onClick={onPass}
						disabled={!card}
						className={cn("flex h-[44px] w-[120px] shrink-0 cursor-pointer items-center justify-center overflow-clip rounded-[14px] disabled:cursor-default", STROKE)}
					>
						<span className={cn("whitespace-nowrap font-sora text-[13px] leading-[16px] text-[#819abb]", FIT)}>Pass</span>
					</button>
					{/* "Practice buy" 2:6474: the canon, 190 x 52 */}
					<PrimaryButton width={190} aria-keyshortcuts="Enter" onClick={onBuy} disabled={!card}>
						{deckCopy.practiceBuy}
					</PrimaryButton>
					{/* "Learn more" 2:6476: 100 x 40, r14, no fill or stroke, Geist Medium 12 #819abb */}
					<button
						type="button"
						onClick={onLearnMore}
						disabled={!card}
						className="flex h-[40px] w-[100px] shrink-0 cursor-pointer items-center justify-center overflow-clip rounded-[14px] disabled:cursor-default"
					>
						<span className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#819abb]", FIT)}>{deckCopy.learnMore}</span>
					</button>
				</div>

				{/* "Keyboard hints" 2:6482 (frame 701.5, 920): #12203e pill, 18 x 10 padding, 24 apart; decorative, the shortcuts
				    are on the controls' aria-keyshortcuts. It keeps Figma's y (MIN constraint), whatever the card's height; below
				    1024 it is in flow, centred, 64 under the buttons (R6: the 1024 frame's foot is no place on a phone). */}
				<div
					aria-hidden="true"
					className="absolute flex items-center gap-[24px] overflow-clip whitespace-pre rounded-[999px] bg-[#12203e] px-[18px] py-[10px] font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:static max-lg:mx-auto max-lg:mt-[64px] max-lg:w-fit"
					style={{ left: 701.5 - 618, top: 920 - 150 }}
				>
					<p className={FIT}>{"←  Pass"}</p>
					<p className={FIT}>{"→  Save"}</p>
					<p className={FIT}>{"↵  Practice buy"}</p>
				</div>
			</div>
		</div>
	);
}
