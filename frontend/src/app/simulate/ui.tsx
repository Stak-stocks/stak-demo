import { Link } from "@tanstack/react-router";
import { type CSSProperties, Fragment, type KeyboardEvent, type ReactNode, type Ref, useLayoutEffect, useRef, useState } from "react";
import { BackRing, FIGMA_BASELINE, GHOST_FILTER, GRADIENT, LIGHT_INK, MUTED_INK, StrokeRing, hairline } from "@/app/ui/Button";
import { cn } from "@/lib/utils";
import { SA } from "./assets";
import "./links.css";
import "./responsive.css";

/** Card surfaces. The alternate frames (2:970, 2:1116) use the bluer pair. */
export type Palette = { card: string; inner: string };
export const PALETTE: Palette = { card: "#181f30", inner: "#12203e" };
export const PALETTE_ALT: Palette = { card: "#0e1a36", inner: "#12203e" };

/** Figma's one visible drop shadow of the Buy pill ("Add" 2:685) and the dark Sell (2:915): offset 12.2847309, radius
 * 12.2847309 (standard deviation 6.1424), (82,170,199) at 0.04 / 0.02. */
const BUY_FILTER = "drop-shadow(0px 12.2847px 6.1424px rgba(82,170,199,0.04))";
const SELL_FILTER = "drop-shadow(0px 12.2847px 6.1424px rgba(82,170,199,0.02))";

/**
 * How the button frames of these screens answer the pointer. Figma defines no hover or pressed look for any of them
 * (plain frames: no component, no variant, no "change to" reaction; the phone wiring is instant NAVIGATE), so none
 * dims or shrinks (the Home, sidebar, Discover and Portfolio rulings); the cursor, the disabled look and the canvas's
 * keyboard focus ring (2px #69b3ca) stay.
 */
const PRESS = "cursor-pointer disabled:cursor-default disabled:opacity-60";

/**
 * Figma sizes an auto-width text box to its glyph run rounded up to a whole pixel, and centres or right-aligns that
 * box. Chrome's box is the fractional run, which moves a centred, right-aligned or following text by up to a pixel;
 * this rounds the box the same way (measured on 2:634 / 2:1311 / 2:1458: 89% of the boxes land on Figma's width).
 */
export const WHOLE = "w-[calc-size(max-content,round(up,size,1px))]";

/**
 * A text box at Figma's own width when the frame authors that string (Chrome measures some runs a pixel narrower or
 * wider than Figma, which moves a centred, right-aligned or following text), else at its run rounded up (WHOLE).
 * Figma's texts here are all left-aligned in their boxes, so the glyphs start where the box does (a button would
 * otherwise centre its label inside the box).
 */
export const box = (width: number | undefined): { className?: string; style?: CSSProperties } =>
	width === undefined ? { className: WHOLE } : { className: "shrink-0 text-left", style: { width } };

/** The frames' strings by type style → Figma's whole-pixel box width (looked up with `box(…)`). */
export type Widths = Readonly<Record<string, number>>;

export function Card({
	className,
	style,
	palette = PALETTE,
	ref,
	children,
}: {
	className?: string;
	style?: CSSProperties;
	palette?: Palette;
	/** the card's <section> (a page that measures its card's rows below 1024: Simulate home's Saved staks) */
	ref?: Ref<HTMLElement>;
	children: ReactNode;
}) {
	return (
		<section
			ref={ref}
			className={cn("flex flex-col items-start gap-[12px] overflow-clip rounded-[16px] p-[20px]", className)}
			style={{ backgroundColor: palette.card, ...style }}
		>
			{children}
		</section>
	);
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<p className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb] max-lg:max-w-full max-lg:whitespace-normal max-lg:break-words", className)}>
			{children}
		</p>
	);
}

/** A card's title, the card's heading (h2 under the page's h1), drawn exactly as the paragraph it replaced (preflight). */
export function CardTitle({ children }: { children: ReactNode }) {
	return <h2 className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc] max-lg:whitespace-normal">{children}</h2>;
}

/** The pages a breadcrumb segment can open. */
export type CrumbTo = "/simulate" | "/simulate/portfolio";
/** One breadcrumb segment: a page above this one (`to`), or the page itself (no `to`). */
export type Crumb = { label: string; to?: CrumbTo };

/** Figma's crumb separator: two spaces around the slash, as authored ("Simulate  /  Portfolio", 2:751). */
const CRUMB_SEPARATOR = "  /  ";

/** The breadcrumb's type (2:751: Geist Medium 16 / 21 #819abb, two spaces around each slash). */
const CRUMB_TEXT = "whitespace-pre font-geist text-[16px] font-medium leading-[21px] max-lg:whitespace-pre-wrap max-lg:break-words";

/**
 * Back chevron + breadcrumb ("Simulate  /  Portfolio  /  NVDA", 2:751 / 2:859 / 2:927). The Back circle has no hover or
 * pressed look (Figma defines none, the PRESS ruling above); the cursor and the focus ring stay.
 *
 * Every segment above the page links to its page, Instant like Back (portfolio #13 / the coordinator's ruling: "breadcrumb
 * segments link to their pages with no visual change"); the page's own name stays text. The crumb is painted exactly as
 * before: one text, which the shared text-baseline and grayscale rules place and draw as they always did (splitting it
 * into separate elements moved the glyphs: an inline link takes the paragraph out of the baseline rule, and separate
 * pieces start on whole layout units, which flipped a glyph's sub-pixel position on "Leaderboard": measured 2026-11-07).
 * The painted line stays the header's own child, exactly where it was (wrapping it in another element changed its
 * height by a hundredth of a pixel under the laptop zoom, enough to move glyphs below it: measured at 1280 x 800). The
 * links lie over it in a transparent copy of the same line, the breadcrumb landmark, positioned on the line's own place
 * (the 40 Back circle and the 31 gap above it); the painted copy is `aria-hidden`, so assistive tech meets the crumb
 * once, links included. The same font and width, so each link covers its own word. No underline, no hover look: the
 * frames draw none; the cursor and the canvas's focus ring (around the word) mark the links. Below 1024 both copies
 * wrap alike.
 */
export function BackHeader({ crumbs, to, style }: { crumbs: readonly Crumb[]; to: string; style?: CSSProperties }) {
	return (
		<div className="relative flex flex-col items-start gap-[31px] max-lg:max-w-full" style={style}>
			<Link
				to={to}
				aria-label="Back"
				// "/simulate" is a parent of "/simulate/portfolio": only an exact match may mark this link as the current page
				activeOptions={{ exact: true }}
				className="flex size-[40px] shrink-0 cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
			>
				<img alt="" src={SA.back} className="size-[22px]" />
			</Link>
			<p aria-hidden="true" className={cn(CRUMB_TEXT, "text-[#819abb]")}>
				{crumbs.map((c) => c.label).join(CRUMB_SEPARATOR)}
			</p>
			<nav aria-label="Breadcrumb" className={cn(CRUMB_TEXT, "absolute inset-x-0 top-[71px] text-transparent")}>
				{crumbs.map((c, i) => (
					<Fragment key={c.label}>
						{i > 0 && CRUMB_SEPARATOR}
						{c.to ? (
							<Link to={c.to} viewTransition={false} activeOptions={{ exact: true }} className="cursor-pointer">
								{c.label}
							</Link>
						) : (
							<span aria-current="page">{c.label}</span>
						)}
					</Fragment>
				))}
			</nav>
		</div>
	);
}

/**
 * A page's title and the line under it (the Portfolio's and the Leaderboard's). The title is the page's h1, as Simulate
 * home's, My STAK's and News' titles are (the cards' titles are h2 under it: CardTitle; a sheet's title is an h2 too),
 * drawn exactly as the paragraph it replaced: the preflight gives a heading no size, weight or margin of its own, and
 * the shared text rules (styles.css: the Figma baseline and the grayscale group) name h1 beside p, so every glyph lands
 * where it did. The line under it stays a paragraph.
 */
export function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
	return (
		<div className="flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap max-lg:w-full max-lg:whitespace-normal">
			<h1 className="font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{title}</h1>
			<p className="font-geist text-[13px] leading-[17px] text-[#819abb]">{subtitle}</p>
		</div>
	);
}

/** Filter chip row ("Top gainers · Newest · Worst", "This week · All time"); no hover or pressed look (PRESS above). */
export function FilterChip({
	active,
	activeBg = PALETTE.card,
	children,
	onClick,
	width,
}: { active: boolean; activeBg?: string; children: ReactNode; onClick?: () => void; /** Figma's chip width (its label box is the text width rounded up) */ width?: number }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={cn(
				"flex cursor-pointer items-start overflow-clip rounded-[999px] px-[14px] py-[6px] font-geist text-[12px] font-medium leading-[16px]",
				active ? "text-[#f2f6fc]" : "text-[#819abb]",
			)}
			style={{ ...(active ? { backgroundColor: activeBg } : { boxShadow: hairline(1, "rgba(255,255,255,0.1)") }), ...(width ? { width, justifyContent: "center" } : {}) }}
		>
			<span className="whitespace-nowrap">{children}</span>
		</button>
	);
}

export function Avatar({
	letter,
	size,
	radius,
	bg,
	className,
	letterWidth,
}: {
	letter: string;
	size: number;
	radius: number;
	bg: string;
	className?: string;
	/** Figma's box for the frame's letter (it is centred in the avatar) */
	letterWidth?: number;
}) {
	const fit = box(letterWidth);
	return (
		<div
			className={cn("flex shrink-0 items-center justify-center overflow-clip", className)}
			style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg }}
		>
			{size === 36 ? (
				<span className={cn("whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]", fit.className)} style={fit.style}>
					{letter}
				</span>
			) : (
				<span className={cn("whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#9eadc7]", fit.className)} style={fit.style}>
					{letter}
				</span>
			)}
		</div>
	);
}

/**
 * "Back" / "Keep exploring" / "View portfolio" — the Back-row dialect (Figma "Frame 264", read 2026-10-18: fills
 * hidden · 0.361316 OUTSIDE stroke rgb(52,59,79) at 33% · five drop shadows 0.1 / 0.09 / 0.05 / 0.01 / 0 · Sora
 * Regular #819abb in a hugging box, centred). Sheets: h51 r5.781 14.453 (2:1456), the receipts' h52 r6 14 (2:1728 /
 * 2:1827), the pick rail h51 r6 14 (2:917). The label box is Figma's whole-pixel box with the glyphs at its left edge.
 * The stroke is BackRing (the stroke's ink in the pixel rows Figma paints it in, on whole or half pixels alike; a
 * spread shadow put the bottom run a row low on a half-pixel box), inside the button so it casts the row's shadows.
 */
export function GhostButton({
	children,
	onClick,
	height = 51,
	radius = 5.781,
	fontSize = 14.453,
	className,
	autoFocus,
	labelWidth,
}: {
	children: ReactNode;
	onClick?: () => void;
	height?: number;
	radius?: number;
	fontSize?: number;
	className?: string;
	/** takes the initial focus inside a Sheet (its `data-autofocus` hook), so a confirmation starts on its safe action */
	autoFocus?: boolean;
	/** Figma's box for the label (centred in the button) */
	labelWidth?: number;
}) {
	const fit = box(labelWidth);
	return (
		<button
			type="button"
			onClick={onClick}
			autoFocus={autoFocus}
			data-autofocus={autoFocus || undefined}
			className={cn(PRESS, "relative flex w-full items-center justify-center px-[14px] py-[7px]", className)}
			style={{ height, borderRadius: radius, filter: GHOST_FILTER }}
		>
			{/* data-canon-label: the one sheet kept on a half pixel (2:1079, sheets.css) rounds a baseline twice and lifts its labels half a
			    pixel by this hook; on Figma's own baseline the Back label 2:1115 needs that lift as the canon label does */}
			<span
				data-canon-label=""
				className={cn("whitespace-nowrap text-left font-sora leading-[18px] text-[#819abb]", MUTED_INK, FIGMA_BASELINE, fit.className)}
				style={{ fontSize, ...fit.style }}
			>
				{children}
			</span>
			<BackRing radius={radius} />
		</button>
	);
}

/**
 * "Sell" — the dark canon-stroke button (pick detail rail 2:915 350x51, the portfolio sheet 2:1252 440x51; Figma
 * 2026-10-18: #12203e · r6 · the canon stroke · one drop shadow 0 12.285 / 12.285 at 2% · Sora Regular 14/20.69 white
 * in a hugging box, centred). The stroke is the canon's (StrokeRing, 51 tall) and the label is drawn at Figma's weight
 * (LIGHT_INK).
 */
export function SellButton({
	children,
	onClick,
	width,
	disabled,
	labelWidth,
	"aria-busy": ariaBusy,
}: {
	children: ReactNode;
	onClick?: () => void;
	width?: number;
	disabled?: boolean;
	/** Figma's box for the label (centred in the button) */
	labelWidth?: number;
	"aria-busy"?: boolean;
}) {
	const fit = box(labelWidth);
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-busy={ariaBusy || undefined}
			className={cn("relative flex h-[51px] items-center justify-center rounded-[6px] bg-[#12203e]", width ? "" : "w-full", PRESS)}
			style={{ width, filter: SELL_FILTER }}
		>
			<span className={cn("whitespace-nowrap text-left font-sora text-[14px] leading-[20.69px] text-white", LIGHT_INK, FIGMA_BASELINE, fit.className)} style={fit.style}>
				{children}
			</span>
			<StrokeRing height={51} />
		</button>
	);
}

/**
 * 60x30 "Buy" in the Saved staks rows (Figma "Add" 2:685 …, read 2026-10-18: the canon fill and stroke on a 30px pill ·
 * r5.781 · one drop shadow 0 12.285 / 12.285 at 4% · Sora Regular 12 white, its 23 x 15 box at 18.5 / 7.5).
 */
export function SmallBuyButton({
	children,
	onClick,
	"aria-label": ariaLabel,
	labelWidth,
}: {
	children: ReactNode;
	onClick?: () => void;
	"aria-label"?: string;
	/** Figma's box for the label (2:686 "Buy" is 23 wide, at x 18.5 of the 60 pill) */
	labelWidth?: number;
}) {
	const fit = box(labelWidth);
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={ariaLabel}
			className={cn("relative flex h-[30px] w-[60px] shrink-0 items-center justify-center rounded-[5.781px] px-[10px] py-[7.226px]", PRESS)}
			style={{ backgroundImage: GRADIENT, filter: BUY_FILTER }}
		>
			<span className={cn("whitespace-nowrap text-left font-sora text-[12px] leading-[15px] text-white", LIGHT_INK, FIGMA_BASELINE, fit.className)} style={fit.style}>
				{children}
			</span>
			<StrokeRing height={30} radius={5.781} />
		</button>
	);
}

/**
 * 60x30 "Sell" in the Picks table (Figma 2:775 … 2:835 and 2:1138 … 2:1198, read 2026-10-18: no fill · 1px INSIDE
 * stroke white at 14% · r5.781 · padding 7.226 / 10 · Sora Regular 12 #819abb, its 23 x 15 box at 18.5 / 7.5,
 * left-aligned). `labelWidth` gives the label Figma's box when the caller knows it, else the run rounded up (Chrome's
 * "Sell" is 22.48 wide: 23, Figma's box); the glyphs start at the box's left edge as Figma's do (a button would centre
 * them inside it), at 18.5 / 7.5 of the pill. Drawn at Figma's stroke weight (MUTED_INK).
 *
 * `pick`: the pill is a link to that pick's page instead of a button, as both phones and the prototype wire the
 * portfolio's pills (phone 1:4876 -> 1:5003, six edges; android ui/simulate/SimPortfolioScreen.kt:158-163, ios
 * Simulate/SimPortfolioView.swift:82-87; the user's rule of 2026-10-07: the wiring decides where a control goes, the
 * frames how it looks): Instant, and the pick page's own Sell opens the sell sheet (2:1458). Same box, same pixels.
 */
export function SmallSellButton({
	children,
	onClick,
	pick,
	"aria-label": ariaLabel,
	labelWidth,
}: {
	children: ReactNode;
	onClick?: () => void;
	pick?: string;
	"aria-label"?: string;
	/** Figma's box for the label (2:776 "Sell" is 23 wide, at x 18.5 of the 60 pill) */
	labelWidth?: number;
}) {
	const fit = box(labelWidth);
	const className = cn("flex h-[30px] w-[60px] shrink-0 items-center justify-center rounded-[5.781px] px-[10px] py-[7.226px]", PRESS);
	const style = { boxShadow: hairline(1, "rgba(255,255,255,0.14)") };
	const label = (
		<span className={cn("whitespace-nowrap text-left font-sora text-[12px] leading-[15px] text-[#819abb]", MUTED_INK, FIGMA_BASELINE, fit.className)} style={fit.style}>
			{children}
		</span>
	);
	return pick ? (
		<Link to="/simulate/picks/$symbol" params={{ symbol: pick }} viewTransition={false} aria-label={ariaLabel} className={className} style={style}>
			{label}
		</Link>
	) : (
		<button type="button" onClick={onClick} aria-label={ariaLabel} className={className} style={style}>
			{label}
		</button>
	);
}

/**
 * Which chip of a ticket's row takes the sheet's first focus (AmountChip's `autoFocus`), at every size: the pressed one,
 * so a sheet opened from the keyboard, or by Try again on the amount / portion it restores, starts on its current
 * choice and the next Enter or Space confirms that choice instead of switching to another (the browser's own first
 * focus is the row's FIRST chip, "$10" while the frame's "$25" is pressed: review r2; the stock page's ticket already
 * starts on its pressed chip, stocks/PracticeBuySheet.tsx). The first chip only when none is pressed: the Custom field
 * is showing a typed figure, which stays unfocused as before. `pressed` is the pressed chip's value, or null while the
 * Custom field shows. Opened by a click, no ring is drawn: a focus moved by script after a pointer press takes none,
 * as the first chip took none.
 */
export const takesFirstFocus = <T,>(chips: readonly T[], pressed: T | null, chip: T): boolean =>
	chip === (pressed !== null && chips.includes(pressed) ? pressed : chips[0]);

/** Quick-amount / portion chip inside the sheets; no hover or pressed look (Figma defines none: PRESS above). */
export function AmountChip({
	selected,
	children,
	onClick,
	ref,
	labelWidth,
	autoFocus,
}: {
	selected: boolean;
	children: ReactNode;
	onClick?: () => void;
	ref?: Ref<HTMLButtonElement>;
	/** Figma's box for the label (centred in the chip: 2:1440 "$10" is 21 wide at x 30.3 of the 81.6 chip) */
	labelWidth?: number;
	/** the sheet's first focus (the Sheet's `data-autofocus` hook) */
	autoFocus?: boolean;
}) {
	const fit = box(labelWidth);
	return (
		<button
			ref={ref}
			type="button"
			onClick={onClick}
			data-autofocus={autoFocus || undefined}
			aria-pressed={selected}
			className={cn(
				"flex min-w-px flex-1 cursor-pointer items-center justify-center overflow-clip rounded-[10px] py-[8px] font-geist text-[12px] font-medium leading-[16px]",
				selected ? "bg-[#0f2a38] text-[#a6e4f7]" : "bg-[#0b1430] text-[#dce7f7]",
			)}
			style={{ boxShadow: selected ? hairline(0.5, "#5da8bf") : hairline(1, "rgba(255,255,255,0.12)") }}
		>
			<span className={cn("whitespace-nowrap", fit.className)} style={fit.style}>
				{children}
			</span>
		</button>
	);
}

/**
 * Whether the last thing the visitor did was a key press (Tab, Enter on a chip …) rather than a pointer press. A text
 * field matches :focus-visible even when it is clicked, so the Custom chip asks this before it draws a focus ring.
 */
let keyboardLast = false;
if (typeof document !== "undefined") {
	document.addEventListener("keydown", (e) => {
		if (!e.metaKey && !e.ctrlKey && !e.altKey) keyboardLast = true;
	}, true);
	document.addEventListener("pointerdown", () => {
		keyboardLast = false;
	}, true);
}

/**
 * The "Custom" chip turned into a field: the chip's geometry (Figma's selected chip: #0f2a38, 0.5 #5da8bf inside
 * stroke, r10) with a sign and a number input. It replaces the chip that had focus, so it takes focus itself; Escape
 * hands the row back to the chips (`onCancel`) instead of closing the sheet. Figma draws no field look: the input
 * carries no ring of its own, and the chip takes the app's focus ring (2px #69b3ca, 2px out, the chip's radius) only
 * when the focus came from the keyboard, as a button does.
 */
export function CustomChip({
	prefix,
	suffix,
	value,
	onChange,
	onCancel,
	max,
	label = "Custom amount",
	invalid,
}: {
	prefix?: string;
	suffix?: string;
	value: string;
	onChange: (v: string) => void;
	onCancel?: () => void;
	max?: number;
	label?: string;
	/** the typed value cannot be used (the sheet says why in its alert) */
	invalid?: boolean;
}) {
	const [ring, setRing] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	// the field takes the focus as it mounts (autoFocus), before any focus handler of ours can see it
	useLayoutEffect(() => {
		if (document.activeElement === input.current) setRing(keyboardLast);
	}, []);
	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== "Escape" || !onCancel) return;
		e.preventDefault();
		e.stopPropagation();
		onCancel();
	};
	return (
		<label
			className="flex min-w-px flex-1 items-center justify-center overflow-clip rounded-[10px] bg-[#0f2a38] py-[8px] font-geist text-[12px] font-medium leading-[16px] text-[#a6e4f7]"
			style={{ boxShadow: hairline(0.5, "#5da8bf"), ...(ring ? { outline: "2px solid #69b3ca", outlineOffset: 2 } : {}) }}
		>
			{prefix && <span>{prefix}</span>}
			<input
				ref={input}
				autoFocus
				type="number"
				inputMode="decimal"
				min={1}
				max={max}
				step={1}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={onKeyDown}
				onFocus={() => setRing(keyboardLast)}
				onBlur={() => setRing(false)}
				aria-label={label}
				aria-invalid={invalid || undefined}
				className="w-[44px] bg-transparent text-center text-[#a6e4f7] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				style={{ outline: "none" }}
			/>
			{suffix && <span>{suffix}</span>}
		</label>
	);
}

export const GREEN = "#2fd08a";
export const RED = "#ff5a6a";
export const RED_ROW = "#e5484d";
