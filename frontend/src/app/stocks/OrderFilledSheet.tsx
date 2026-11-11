import type { CSSProperties } from "react";
import { money, shares4 } from "@/app/live/format";
import { SA } from "@/app/simulate/assets";
import { sheets } from "@/app/simulate/data";
import { GhostButton } from "@/app/simulate/ui";
import { PrimaryButton } from "@/app/ui/Button";
import { Sheet } from "@/app/ui/Sheet";
import { cn } from "@/lib/utils";
import { signText } from "./tone";
import { SHEET_STILL } from "./transitions";

type Props = {
	ticker: string;
	name: string;
	initial: string;
	price: number;
	/** "▲ 2.4%" */
	changeShort: string;
	/** "You now hold": the shares of the company held after the fill (the frame previews show the order's own) */
	shares: number;
	/** paper cash after the order */
	cash: number;
	onPrimary: () => void;
	/** "Keep exploring" */
	onSecondary: () => void;
	onClose: () => void;
	/** the sheet arrives inside the confirm transition (SMART_ANIMATE 350, 1:3801), so its dialog skips its own fade-in */
	still?: boolean;
	/** vertical offset of the panel's centre, so it keeps the place of the ticket it replaces (Figma keeps every confirm -> success panel in place: 2:1311 y 297 -> 2:1589 y 298) */
	offsetY?: number;
	/** the scrim of the ticket it replaces (the prototype's result sheets keep the ticket's scrim layers: 1:3764 -> 1:4216, 1:3805 -> 1:4249); the Sheet's #000 @66% when absent */
	scrim?: string;
};

/*
 * Past 2560 the app is the 2560 x 1440 layout zoomed up (CORE-API section 1). Two placements of this sheet that are right
 * at 1024-2560 do not scale evenly, so they are re-solved where the canvas is zoomed (html[data-stak-size="big"] in a window
 * taller than 1440, i.e. zoom > 1) and nowhere else: every size up to 2560, and a big window at zoom 1, is untouched.
 * - ZOOMED_ROW / ZOOMED_WORD: the shares line ("You now hold 0.1090 shares of AAPL") aligns its 12px words to the 15px
 *   figure by their baselines; zoomed, Chrome solves that baseline with the fonts' metrics rounded in device pixels, which
 *   drew the words up to 3.1 device px above 2560 x zoom. At 2560 the words' boxes sit 3px under the figure's (Sora 15/19,
 *   Geist 12/16), so zoomed that 3px is laid out explicitly (items-start + 3px, as the ticket's shares line always is) and
 *   scales with the zoom.
 * - ZOOMED_TEXT: the Sheet centres the panel with `top: T` (50% + offsetY) and a -50% translate, and Chrome draws such a
 *   panel on whole device pixels twice: it rounds the panel's top, then the translated panel. So 2560 draws it at
 *   round(round(T) - h / 2) (h = 461, Figma 2:1699's 480 x 461 sheet): at 491 where its box is at 490 (2560 x 1440), its
 *   texts with it. A zoomed window draws it at round(round(T x zoom) - zoom x h / 2) device px, up to 2 device px from
 *   that 491 x zoom (735 for 736.5 at 3840 x 2160, 980 for 982 at 5120 x 2880). Every text of the panel moves by the
 *   difference, `--stak-filled-dy` (shiftPast2560), as a layout margin (top + d, bottom - d, so no other box moves; a
 *   transform would be rounded once more), and its glyphs land where the 2560 glyphs land times the zoom, at any zoom
 *   (measured from 2880 x 1800 to 7680 x 4320). The texts' boxes move by d: judged by their ink (SPEC G2). Not on the
 *   EXAMPLE pages, whose panel ticket.css puts on a whole pixel.
 */
const ZOOMED_ROW = "[@media(height>1440px)]:[html[data-stak-size=big]_&]:items-start";
// the 3px, and (ZOOMED_TEXT, which takes the margins wherever it applies) the same 3px under its shift
const ZOOMED_WORD = "[@media(height>1440px)]:[html[data-stak-size=big]_&]:mt-[3px] [@media(height>1440px)]:[html[data-stak-size=big]_&]:[--stak-filled-lift:3px]";
const ZOOMED_TEXT =
	"[@media(height>1440px)]:[html[data-stak-size=big]_&:not([data-stak-example]_*)_:is(p,span):not(:has(*))]:[margin-block:calc(var(--stak-filled-lift,0px)_+_var(--stak-filled-dy))_calc(var(--stak-filled-dy)_*_-1)]";

/** Half the panel's height: 461 in Figma 2:1699, as every placement of this sheet lays it out from 1024 up. */
const HALF_HEIGHT = 230.5;

/**
 * ZOOMED_TEXT's shift in layout px: where 2560 draws the panel less where the zoomed window draws it (both above), for a
 * panel centred at T = half the window's layout height + offsetY. A CSS value, so the window's height and the zoom are
 * the browser's own at every size.
 */
const shiftPast2560 = (offsetY: number) => {
	const t = `50vh / var(--stak-zoom) + ${offsetY}px`;
	const drawn = (step: string) => `round(nearest, round(nearest, ${t}, ${step}) - ${HALF_HEIGHT}px, ${step})`;
	return `calc(${drawn("1px")} - ${drawn("1px / var(--stak-zoom)")})`;
};

/** 2:1699 "Order filled" with the order's real shares and the cash that is left — the deck and detail flows' success sheet. */
export function OrderFilledSheet({ ticker, name, initial, price, changeShort, shares, cash, onPrimary, onSecondary, onClose, still, offsetY, scrim }: Props) {
	const s = sheets.addSuccess;
	// the panel's content carries ZOOMED_TEXT's shift for this panel's centre (only read past 2560)
	const shift = { "--stak-filled-dy": shiftPast2560(offsetY ?? 0) } as CSSProperties;
	return (
		<Sheet label={s.title} onClose={onClose} offsetY={offsetY} scrim={scrim} className={cn(ZOOMED_TEXT, still && SHEET_STILL)}>
			<div className="flex w-full flex-col items-center gap-[14px]" style={shift}>
				<div className="flex w-full flex-col items-center gap-[14px]">
					<img alt="" src={SA.checkCircle} className="size-[47px]" />
					<p className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-white">{s.title}</p>
					<div className="flex w-full items-center gap-[12px] overflow-clip rounded-[6px] bg-[rgba(105,179,202,0.1)] px-[14px] py-[12px]">
						<div className="flex size-[38px] shrink-0 items-center justify-center overflow-clip rounded-[19px] bg-[#242b3d]">
							<span className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#9eadc7]">{initial}</span>
						</div>
						<div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip whitespace-nowrap max-lg:whitespace-normal">
							<p className="font-geist text-[13px] font-medium leading-[17px] text-white max-lg:max-w-full max-lg:[overflow-wrap:anywhere]">{name}</p>
							<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{money(price)} today</p>
						</div>
						<p className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px]", signText(changeShort))}>{changeShort}</p>
					</div>
				</div>
				<p className="w-full font-geist text-[12px] leading-[18px] text-[#c8d2e0]">{s.description}</p>
			</div>
			<div className="flex w-full flex-col items-start overflow-clip" style={shift}>
				<div className="flex w-full flex-col items-start gap-[24px]">
					<div className="flex items-center gap-[6px] overflow-clip whitespace-nowrap text-[12px]">
						<p className="font-geist leading-[16px] text-[#819abb]">{s.cashLabel}</p>
						<p className="font-geist font-medium leading-[16px] text-[#f2f6fc]">{money(cash)}</p>
					</div>
					<div className={cn("flex w-full items-baseline justify-center gap-[6px] overflow-clip whitespace-nowrap max-lg:flex-wrap", ZOOMED_ROW)}>
						<p className={cn("font-geist text-[12px] leading-[16px] text-[#819abb]", ZOOMED_WORD)}>{s.youHold}</p>
						<p className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{shares4(shares)}</p>
						<p className={cn("font-geist text-[12px] leading-[16px] text-[#819abb]", ZOOMED_WORD)}>{sheets.addConfirm.sharesOf(ticker)}</p>
					</div>
				</div>
			</div>
			<div className="flex w-full flex-col items-start gap-[16px]" style={shift}>
				<PrimaryButton onClick={onPrimary}>{s.primary}</PrimaryButton>
				<GhostButton onClick={onSecondary} height={52} radius={6} fontSize={14}>
					{s.secondary}
				</GhostButton>
			</div>
		</Sheet>
	);
}
