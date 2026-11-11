import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { OB } from "./assets";
import { FigmaImg } from "./subpixel";
import { DensityImg } from "@/app/FitCanvas";

/** A top offset inside the 1024 band that stays pinned to the top of the window (the band is centred in taller ones). */
export const pinTop = (y: number) => `calc(${y}px - var(--stak-band, 0px))`;

type ChromeProps = {
	/** Right-hand step label, e.g. "STEP 2 OF 6" or "STEP · LAST ONE". */
	label: string;
	/** The label's x in the 1440 frame (1308, 1307 or 1281): Figma places its left edge, 60px from the right edge. */
	labelX: number;
	/** Which "STAK" wordmark export the frame draws (2:5764 on steps 2 to 5, 2:6214 on steps 7 and 8). */
	logoText: keyof typeof OB.logoText;
	/** Filled progress segments out of six; omit to hide the bar (last step). */
	progress?: number;
	onBack: () => void;
};

/**
 * The chrome every step from 02 shares (2:5753 …): the STAK mark "Group" at 60/44 (mark 26.4782 x 26.4784 at
 * 60.0001/44, wordmark 78.1629 x 14.9827 at 90.9721/49.7646, both drawn at those fractional boxes: FigmaImg), the step
 * label at top 50 (Geist Medium 11/14, 8% tracking, #819abb), the six 56x4 progress segments (gap 6, radius 2) centred
 * at top 100, and the 40px Back control at 60/96. Every one is MIN/MIN in the frames: it stays at the top of the window
 * while the 1024 band of a centred step sits lower.
 * Below 1024 (responsive.css, SPEC R11) the same pieces stay at the top in the same two rows, the window's gutter in
 * place of the frame's 60: the mark and the label on Figma's rows (44 / 50 on a tablet, 20 higher on a phone), Back
 * under the mark (52 lower, as in the frame), the progress centred on the window as in the frame, or on a phone beside
 * Back when the window has no room for it centred.
 */
export function OnboardingChrome({ label, labelX, logoText, progress, onBack }: ChromeProps) {
	return (
		<div className="onboarding-chrome contents">
			<div data-onboarding-chrome="logo" className="absolute left-0 size-0" style={{ top: pinTop(0) }}>
				<FigmaImg src={OB.logoIcon} x={60.0001} y={44} w={26.4782} h={26.4784} />
				<FigmaImg src={OB.logoText[logoText]} alt="STAK" x={90.9721} y={49.7646} w={78.1629} h={14.9827} />
			</div>
			{/* The box is placed by its own wrapper (left-anchored like Figma's box at 1440, and kept the same distance from the
			    right edge on wider windows), so the text inside is plain text that the app's baseline rule (src/styles.css)
			    puts on Figma's row at every zoom: positioned itself, the rule skips it, and on the zoomed canvas (1280x800)
			    its glyphs painted 1.3px above Figma's. */}
			<div data-onboarding-chrome="label" className="absolute" style={{ left: `calc(100% - ${1440 - labelX}px)`, top: pinTop(50) }}>
				<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb]">{label}</p>
			</div>
			{progress !== undefined && (
				<div
					data-onboarding-chrome="progress"
					role="progressbar"
					aria-label="Onboarding progress"
					aria-valuemin={0}
					aria-valuemax={6}
					aria-valuenow={progress}
					className="absolute flex items-start gap-[6px] overflow-clip"
					style={{ left: "calc(50% - 183px)", top: pinTop(100) }}
				>
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<div key={i} className={cn("h-[4px] w-[56px] rounded-[2px]", i <= progress ? "bg-[#a6e4f7]" : "bg-[rgba(255,255,255,0.14)]")} />
					))}
				</div>
			)}
			<BackControl className="onboarding-back absolute left-[60px]" style={{ top: pinTop(96) }} onClick={onBack} />
		</div>
	);
}

/**
 * "Back" 2:5749 (and "Nav · Previous" 2:6012): a 40px #192238 disc, the 22px chevron; `flipped` = "Nav · Next" 2:6015.
 * `shortcut` names the key that does the same (aria-keyshortcuts), as the product deck's controls do.
 * A plain frame in Figma (no variant, no hover or pressed look, no "change to" reaction on either page), so it carries
 * no press effect: only the pointer cursor and the canvas's keyboard focus ring (the Home, sidebar, Discover, Portfolio
 * and button rulings).
 */
export function BackControl({
	className,
	style,
	onClick,
	flipped,
	label,
	shortcut,
}: { className?: string; style?: CSSProperties; onClick: () => void; flipped?: boolean; label?: string; shortcut?: string }) {
	return (
		<button
			type="button"
			aria-label={label ?? (flipped ? "Next" : "Back")}
			aria-keyshortcuts={shortcut}
			style={style}
			onClick={onClick}
			className={cn(
				"flex size-[40px] cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#192238]",
				flipped && "rotate-180",
				className,
			)}
		>
			<img alt="" src={OB.back} className="size-[22px]" />
		</button>
	);
}

/**
 * Where focus goes when the step changes (the step's h1): the button that moved on is gone with its step, so focus
 * would fall to <body> and a screen reader would say nothing. `tabIndex -1` takes programmatic focus only (never a Tab
 * stop) and `outline-none` keeps the browser's ring off a heading that is not a control: no pixel changes.
 */
export const STEP_TITLE_FOCUS = { tabIndex: -1, "data-step-title": "" } as const;

/**
 * A step's title + subtitle block (Sora SemiBold 30/38 #f2f6fc, gap 10, Geist 14/18 #819abb), centred. Figma sizes each
 * text box to its line, in whole pixels: `titleW` / `subW` are those widths, so the block centres where Figma's does, and
 * the boxes keep Figma's 38 / 18 heights (scaled down on small screens, a rounded-up text box would push what follows).
 * Below 1024 the boxes size to their text and wrap at Figma's size in a narrower column (R1: never smaller), centred;
 * a wrapped title is balanced over its lines, and so is a subtitle on a phone.
 */
export function StepHeading({
	title,
	subtitle,
	titleW,
	subW,
	className,
	style,
}: { title: string; subtitle: string; titleW: number; subW: number; className?: string; style?: CSSProperties }) {
	return (
		<div
			className={cn("onboarding-heading flex flex-col items-center gap-[10px] overflow-clip whitespace-nowrap max-lg:max-w-full max-lg:whitespace-normal", className)}
			style={style}
		>
			<h1
				{...STEP_TITLE_FOCUS}
				className="h-[38px] font-sora text-[30px] font-semibold leading-[38px] text-[#f2f6fc] outline-none max-lg:h-auto max-lg:w-auto! max-lg:max-w-full max-lg:text-center max-lg:text-balance"
				style={{ width: titleW }}
			>
				{title}
			</h1>
			<p
				className="h-[18px] font-geist text-[14px] leading-[18px] text-[#819abb] max-lg:h-auto max-lg:w-auto! max-lg:max-w-full max-lg:text-center max-sm:text-balance"
				style={{ width: subW }}
			>
				{subtitle}
			</p>
		</div>
	);
}

/**
 * "Hero · box and crystal stocks" (2:5712 on 01 Welcome, 2:6167 on 06 Preparing deck): the 363.896 x 492.2 frame, drawn
 * by Figma's own export of that node (1x / 2x, download_assets, 2026-10-18): 13 vectors, the beam and six coin images
 * as Figma renders them. Composing the 19 layers in the browser was measured again on 2026-10-18 (scratch capture vs
 * the frame render): the same overall error, but dark seams along the box's inner flaps where Vector 64 / 65 and 60 /
 * 61 meet, which Figma's render does not have. The export covers the node's render bounds, 405.792 x 561.196 from
 * (-15.799, -25.875) (the beam above the frame, the glow of Vector 68 around the box); `at` puts that origin on the
 * whole pixel nearest Figma's: 01 Welcome's node sits at (538.552, 116.5) of the frame, 06's at (538.052, 179).
 * Below 1024 the frame is a composite that scales as one unit (SPEC R4: it holds no text): responsive.css sizes the
 * frame to the room the step gives it and draws the export at the same fractions of the frame (--hero-x / --hero-y:
 * the export's origin over the frame's width / height).
 */
const HERO_W = 363.896;
const HERO_H = 492.2;
const ratio = (v: number, of: number) => (v / of).toFixed(6);
export function HeroBox({ frame }: { frame: keyof typeof OB.hero }) {
	const art = OB.hero[frame];
	return (
		<div className="onboarding-hero relative h-[492.2px] w-[363.896px] shrink-0">
			<DensityImg
				alt=""
				src={art.x1}
				srcSet={`${art.x1} 1x, ${art.x2} 2x, ${art.x4} 4x`}
				width={406}
				height={562}
				className="pointer-events-none absolute block h-[562px] w-[406px] max-w-none"
				style={{ left: art.at[0], top: art.at[1], "--hero-x": ratio(art.at[0], HERO_W), "--hero-y": ratio(art.at[1], HERO_H) } as CSSProperties}
			/>
		</div>
	);
}
