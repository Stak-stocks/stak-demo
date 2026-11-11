import { type FocusEvent, Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SheetBackButton } from "@/app/discover/Button";
import { PrimaryButton } from "@/app/ui/Button";
import { money, shares4 } from "@/app/live/format";
import { checkBuy, type OrderRefusal, refusalLine } from "@/app/live/orders";
import { Sheet } from "@/app/ui/Sheet";
import { cn } from "@/lib/utils";
import { ticketCopy } from "./data";
import "./ticket.css";
import { signText } from "./tone";
import { SHEET_STILL } from "./transitions";

type Props = {
	ticker: string;
	name: string;
	initial: string;
	/** today's price (live or demo) */
	price: number;
	/** "▲ 2.4%" */
	changeShort: string;
	/** paper cash available right now */
	cash: number;
	/** vertical offset of the sheet centre from the viewport centre (Figma: +88.5 on the 1024 deck, +0.5 on the 1200 detail) */
	offsetY: number;
	scrim?: string;
	/**
	 * `example`: the centered modal of 00 References 2:6486 ("Sheet" 2:6627, 480 x 449: 12px ticket gaps, the selected
	 * chip's 1px stroke, the ✕ 2:6663 at the top right). ticket.css centres it on the content area on Figma's whole
	 * pixel over the content-area scrim, so `offsetY` and `scrimInset` do not apply to it.
	 */
	layout?: "frame" | "example";
	/** px of scrim left clear on the left (the sidebar), see Sheet */
	scrimInset?: number;
	defaultAmount?: number;
	/** the sheet appears without the dialog's own fade-in (the stock detail's wiring opens it instantly, 1:4009) */
	still?: boolean;
	/** A request from a dismissed ticket is still settling; reopening must not place it a second time. */
	pending?: boolean;
	onClose: () => void;
	/**
	 * Places the order. It answers with the reason when the store REFUSES it (orders.ts `refusalOf`: too small, more than
	 * the cash, no price): the ticket then stays up and prints that reason; anything else it resolves with (a fill, a real
	 * failure) has already replaced the ticket.
	 */
	onConfirm: (amount: number, shares: number) => void | OrderRefusal | null | undefined | Promise<void | OrderRefusal | null | undefined>;
};

const AMOUNTS = [10, 25, 50, 100] as const;

/** "✕" 2:6663 of the EXAMPLE modal: Figma's SVG export of the layer (the glyph's 11 x 11 render box, #819abb). */
const CLOSE_GLYPH = "/figma/ref-examples/x__2-6663.svg";

/** A text in Figma's auto-width box: its glyph run rounded up to a whole pixel, left-aligned (Figma "Cash available" 80 …). */
const FIT = "w-[calc-size(max-content,round(up,size,1px))] text-left";

/** "Quick amounts" (2:6643 et al.): five chips sharing the 440-wide row, 8 apart, 32 tall, radius 10. */
const CHIP_ROW = { w: 440, h: 32, gap: 8, radius: 10, count: AMOUNTS.length + 1 } as const;

/**
 * The chips' fills and INSIDE strokes, drawn as one SVG under the row. Figma lays the 81.6-wide chips at fractional x
 * (0, 89.6, 179.2, 268.8, 358.4 of the row) and anti-aliases their edges there: the selected chip's stroke at 697.6 of
 * 2:6486 spreads over two columns. Chrome paints a box's background and inset shadow on whole pixels, so every chip edge
 * landed in one column; SVG rects keep Figma's fractions (the row starts on a whole pixel). The chips stay transparent
 * buttons over it; an inline SVG redraws with the selection at once (a data-URI background would decode first).
 */
function ChipShapes({ selected, selectedStroke }: { selected: number; selectedStroke: number }) {
	const { w: W, h: H, gap, radius, count } = CHIP_ROW;
	const w = (W - gap * (count - 1)) / count;
	const n4 = (v: number) => Math.round(v * 10000) / 10000;
	return (
		// below 1024 the row is narrower than 440 and the chips draw their own fill and stroke (see `chip`): hidden there
		<svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 max-lg:hidden" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
			{Array.from({ length: count }, (_, i) => {
				const x = i * (w + gap);
				const on = i === selected;
				const sw = on ? selectedStroke : 1;
				return (
					<g key={i}>
						<rect x={n4(x)} width={n4(w)} height={H} rx={radius} fill={on ? "#0f2a38" : "#0b1430"} />
						<rect
							x={n4(x + sw / 2)}
							y={sw / 2}
							width={n4(w - sw)}
							height={H - sw}
							rx={radius - sw / 2}
							fill="none"
							stroke={on ? "#5da8bf" : "#ffffff"}
							strokeOpacity={on ? 1 : 0.12}
							strokeWidth={sw}
						/>
					</g>
				);
			})}
		</svg>
	);
}

/**
 * Counts the font loads that finish while the ticket is up. The shares line is centred around a Sora figure between
 * two Geist labels; when Sora arrives after the ticket's first paint (a cold load of a ?ticket=1 address), the line
 * re-centres and the labels, each on its own layer (ticket.css), move without being redrawn: Chrome keeps their first
 * raster and they land up to a pixel off their boxes. Keying the line on this count redraws them where they settle.
 */
function useFontLoads() {
	const [loads, setLoads] = useState(0);
	useEffect(() => {
		const fonts = typeof document !== "undefined" ? document.fonts : undefined;
		if (!fonts) return;
		let live = true;
		const bump = () => live && setLoads((n) => n + 1);
		fonts.addEventListener("loadingdone", bump);
		// a load that finished between the first paint and this subscription is caught by `ready`
		fonts.ready.then(bump, () => {});
		return () => {
			live = false;
			fonts.removeEventListener("loadingdone", bump);
		};
	}, []);
	return loads;
}

/**
 * Whether the last thing the visitor did was a key press (Tab, Enter or Space on "Custom") rather than a pointer press.
 * A text field matches :focus-visible even when it is clicked, so the Custom field asks this before it draws a ring
 * (the same rule as the Simulate sheets' Custom chip, src/app/simulate/ui.tsx).
 */
let keyboardLast = false;
if (typeof document !== "undefined") {
	document.addEventListener(
		"keydown",
		(e) => {
			if (!e.metaKey && !e.ctrlKey && !e.altKey) keyboardLast = true;
		},
		true,
	);
	document.addEventListener(
		"pointerdown",
		() => {
			keyboardLast = false;
		},
		true,
	);
}

/**
 * "Custom" turned into a field: the selected chip's look with a "$" and a number input. Figma draws no field look, so
 * the input carries no outline of its own; the chip takes the canvas's focus ring (2px #69b3ca, 2px out, its r10) when
 * the focus came from the keyboard, as a button does. Enter confirms the order.
 * The field IS the fifth chip, in its place: its box is the chip's own (`chip`, no padding of its own), so from 1024 up
 * it takes the same fifth of the 440 row as the four buttons (81.6 at 358.4, where ChipShapes draws its selected
 * outline) and every label stays on its drawn chip. The "$" and the figure keep 6px inside the chip's edges as margins
 * of their own: a padding on the chip would add 12px to its 0% flex basis (it measured 91 wide, the four buttons 79,
 * their labels up to 8.1px left of their chips and the "$" outside the outline). Below 1024 the chips are 81.6 wide
 * (`flex-none`) and the "$" and the figure sit exactly where they sat with the padding.
 */
function CustomAmount({ className, value, onChange, onEnter }: { className: string; value: string; onChange: (v: string) => void; onEnter: () => void }) {
	const [ring, setRing] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	// the field takes the focus as it mounts (autoFocus), before its own focus handler can see it
	useLayoutEffect(() => {
		if (document.activeElement === input.current) setRing(keyboardLast);
	}, []);
	return (
		<label className={className} style={ring ? { outline: "2px solid #69b3ca", outlineOffset: 2 } : undefined}>
			<span className="sr-only">Custom amount in dollars</span>
			<span className="ml-[6px] text-[#819abb]">$</span>
			<input
				ref={input}
				autoFocus
				type="number"
				inputMode="decimal"
				min={1}
				step={1}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						onEnter();
					}
				}}
				onFocus={() => setRing(keyboardLast)}
				onBlur={() => setRing(false)}
				className="mr-[6px] w-full min-w-0 bg-transparent text-center font-geist text-[12px] font-medium text-[#a6e4f7] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				style={{ outline: "none" }}
			/>
		</label>
	);
}

/** "Sheet" 480 wide over a scrim — the practice-buy ticket (Figma 2:3385 / 2:4321 / 2:5365), priced live. */
export function PracticeBuySheet({ ticker, name, initial, price, changeShort, cash, offsetY, scrim, layout = "frame", scrimInset, defaultAmount = 25, still, pending = false, onClose, onConfirm }: Props) {
	const [amount, setAmount] = useState(defaultAmount);
	const [custom, setCustom] = useState<string | null>(null);
	// an order in flight: `placing` blocks a second confirm at once; the "Placing order…" look only shows when the
	// order is slow (an account write), so an instant one never flashes it into the confirm transition's first picture
	const placing = useRef(false);
	const [busy, setBusy] = useState(false);
	/*
	 * The cash the ticket showed when Confirm was pressed, kept until the ticket leaves. Confirm turns the ticket into
	 * Order filled in a 350 ms Smart Animate from the ticket AS CONFIRMED (1:2309 -> 1:2875): a route that places the
	 * order before the transition takes its first picture would otherwise repaint this line with the post-order balance
	 * (a third figure, e.g. "$9,379.00" between the confirmed $8,800.00 and Order filled's $8,775.00). The ticket never
	 * stays up after a confirm (it becomes Order filled or the failed sheet; "Try again" opens a fresh one), so the hold
	 * is never released.
	 */
	const [held, setHeld] = useState<number | null>(null);
	const shownCash = held ?? cash;
	const fontLoads = useFontLoads();
	const shares = price > 0 ? amount / price : 0;
	/*
	 * ONE RULE FOR WHAT AN ORDER MAY BE (live/orders.ts; coordinator rulings N27a / N27n / N30.3a, the hunt's ST-01 and
	 * ST-12b): the ticket runs the store's own check on what is typed, keeps Confirm unavailable while it fails and prints
	 * the reason in the shares line's place (`refusalLine`, the caption this ticket already printed for too little cash).
	 * Before, $0.01 of COST was accepted ("You get 0.0000 shares"), charged and left a pick that could never be sold, and
	 * a company without a price opened a ticket with a dead Confirm and no word why. `refused`: the reason the STORE gave
	 * when it turned a confirmed order down (the cash changed in another tab ...), shown until the amount changes.
	 */
	const [refused, setRefused] = useState<OrderRefusal | null>(null);
	const check = checkBuy(amount, shownCash, price);
	const refusal: OrderRefusal | null = refused ?? (check.ok ? null : check.reason);
	const short = refusal === "insufficient";
	const canBuy = refusal === null && !busy && !pending;
	const example = layout === "example";

	const confirm = async () => {
		if (!canBuy || placing.current) return;
		placing.current = true;
		setHeld(cash);
		const slow = window.setTimeout(() => setBusy(true), 400);
		try {
			const turnedDown = await onConfirm(Math.round(amount * 100) / 100, Math.round(shares * 10000) / 10000);
			if (turnedDown) {
				// the ticket stays: it shows the cash as it now is and says why the order was not placed
				setHeld(null);
				setRefused(turnedDown);
			}
		} finally {
			window.clearTimeout(slow);
			placing.current = false;
			setBusy(false);
		}
	};

	/**
	 * "Chip · $10" … "Chip · Custom" (2:3403-2:3412, 2:4142-2:4151, 2:4339-2:4348, 2:5581-2:5590, 2:6644-2:6653): plain
	 * frames with no variant, no hover or pressed state and no reaction, so a chip answers the pointer with its cursor
	 * only; the canvas's focus ring (2px #69b3ca, 2px out) shows it to the keyboard. Their fills and INSIDE strokes are
	 * drawn under the row (ChipShapes): #0b1430 with #ffffff 12% at 1px, the selected one #0f2a38 with #5da8bf at 0.5px in the
	 * product tickets and at 1px in the EXAMPLE modal (2:6646). The label is its own text box (Figma's "$10" … "Custom"
	 * text layers): the transparent span is the text leaf ticket.css lifts onto its own layer, so the label draws with
	 * grayscale edges like Figma's.
	 * Below 1024 the panel is min(480, window - 32) wide (CORE-API section 6: 358 at 390, 288 at 320), so the row is
	 * narrower than Figma's 440 and ChipShapes (a fixed 440 drawing) is hidden: each chip then draws the same fill and
	 * inside stroke on its own box, which keeps Figma's 81.6 x 32 (2:4142-2:4150: `flex-none`, never squeezed). Where the
	 * five do not fit, the row (SPEC R5 as routed on 2026-10-25: "wrap or scroll inside the panel at Figma's chip size";
	 * review round 3: no chip left alone on a line) WRAPS as three over two, 8 apart as in the row, in 333 to 511 wide
	 * windows (the panel's inner 260.8-439: 360, 390, 430; every amount in view, "Custom" included, a focused chip's
	 * ring whole inside the row's 4px clip margin); where even three do not fit (320: 248 inside, two per line would
	 * strand "Custom" on a third line) it stays one line and scrolls sideways inside the panel, R5's own rule for amount
	 * chips (the cut third chip shows there is more; focus scrolls a chip fully into view, ring included). ticket.css
	 * holds the rules (a container query on the panel's inner width); 512 and wider keep the row of five.
	 */
	const chip = (selected: boolean) =>
		cn(
			// relative: painted over the row's absolutely placed chip shapes (ChipShapes), in tree order
			"relative flex h-[32px] min-w-px flex-1 cursor-pointer items-center justify-center overflow-clip rounded-[10px] font-geist text-[12px] font-medium leading-[16px]",
			"max-lg:w-[81.6px] max-lg:flex-none",
			selected
				? cn("text-[#a6e4f7] max-lg:bg-[#0f2a38]", example ? "max-lg:shadow-[inset_0_0_0_1px_#5da8bf]" : "max-lg:shadow-[inset_0_0_0_0.5px_#5da8bf]")
				: "text-[#dce7f7] max-lg:bg-[#0b1430] max-lg:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
		);
	const selectedChip = custom !== null ? AMOUNTS.length : (AMOUNTS as readonly number[]).indexOf(amount);
	/*
	 * Where the row scrolls sideways (the narrowest panels, ticket.css), a focused chip comes fully into view with its
	 * ring: the browser's own focus scroll leaves a chip that is mostly visible where it is (Chrome scrolls only a chip
	 * that is hidden or barely shown), cut at the scroller's edge with half its ring. "nearest" moves the row only as far
	 * as needed and keeps the row's 4px scroll padding. A row that does not scroll (512 and up, three over two, every size
	 * from 1024) is left alone.
	 */
	const revealChip = (e: FocusEvent<HTMLDivElement>) => {
		const row = e.currentTarget;
		if (row.scrollWidth <= row.clientWidth + 1 || !(e.target instanceof Element)) return;
		const chip = e.target.closest("[data-stak-chip-row] > *");
		chip?.scrollIntoView({ block: "nearest", inline: "nearest" });
	};

	return (
		<Sheet label={`Buy ${ticker}?`} scrim={scrim ?? "rgba(0,0,0,0.66)"} scrimInset={scrimInset} offsetY={offsetY} onClose={onClose} className={still ? SHEET_STILL : undefined}>
			{/* marks the dialog for ticket.css (grayscale text in the top layer; the EXAMPLE modal's whole-pixel placement); hidden, so no flex item */}
			<span hidden data-stak-ticket={example ? "example" : "frame"} />
			<p className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-white">Buy {ticker}?</p>
			<div className="flex w-full items-center gap-[11px] overflow-clip rounded-[5.78px] bg-[rgba(105,179,202,0.1)] px-[14px] py-[12px]">
				<div className="flex size-[38px] shrink-0 items-center justify-center overflow-clip rounded-[19px] bg-[#242b3d]">
					<span className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#9eadc7]">{initial}</span>
				</div>
				<div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip whitespace-nowrap max-lg:whitespace-normal">
					<p className="font-geist text-[13px] font-medium leading-[17px] text-white max-lg:max-w-full max-lg:[overflow-wrap:anywhere]">{name}</p>
					<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{price > 0 ? money(price) : "—"} today</p>
				</div>
				<p className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px]", signText(changeShort))}>{changeShort}</p>
			</div>
			<p className="w-full font-geist text-[12px] leading-[18px] text-[#c8d2e0]">{ticketCopy.body}</p>
			{/* the chips' column and row clip as Figma's frames do, 4px out, so a focused chip's 2px ring at 2px offset shows whole */}
			<div className={cn("flex w-full flex-col items-start overflow-clip [overflow-clip-margin:4px]", example ? "gap-[12px]" : "gap-[24px]")}>
				{/* data-stak-chips: below 1024 the column is the size container the chip row's arrangement reads (ticket.css) */}
				<div data-stak-chips="" className={cn("flex w-full flex-col items-start", example ? "gap-[12px]" : "gap-[15px]")}>
					{/*
					 * "Cash available" 2:6640 (auto layout, 6 apart): the label is an auto-width text box Figma sizes to a whole pixel
					 * (80 for "Cash available": 2:6641, and 2:4139 / 2:4336 / 2:5578 / 2:3400 on the product tickets), so the amount
					 * starts 86 in (2:6642 at 694, 2:4140 at 586); the label takes the same rounded-up box here, left-aligned, instead
					 * of Chrome's 79.5 run.
					 */}
					<div className="flex items-center gap-[6px] overflow-clip whitespace-nowrap font-geist text-[12px] leading-[16px]">
						<span className={cn("text-[#819abb]", FIT)}>{ticketCopy.cashLabel}</span>
						<span className={cn("font-medium", short ? "text-[#e5484d]" : "text-[#f2f6fc]")}>{money(shownCash)}</span>
					</div>
					{/* below 1024 the chips that do not fit the narrower row wrap three over two (R5, see `chip`; ticket.css); the row's
					    8px gap is the gap between the lines too, and its 4px clip margin keeps a focused chip's ring whole on either
					    line. In the narrowest panels (under three chips wide) the row scrolls sideways instead (ticket.css) */}
					<div data-stak-chip-row="" onFocus={revealChip} className="relative flex w-full items-start gap-[8px] overflow-clip [overflow-clip-margin:4px] max-lg:flex-wrap">
						<ChipShapes selected={selectedChip} selectedStroke={example ? 1 : 0.5} />
						{AMOUNTS.map((a) => {
							const on = custom === null && amount === a;
							return (
								<button
									key={a}
									type="button"
									aria-pressed={on}
									// the ticket opens with its selected amount ($25, 2:3405 / 2:4341) as the focused control, so a keyboard
									// user's next Enter / Space does not switch to the first chip (Sheet.tsx focuses [data-autofocus] on open)
									data-autofocus={on ? "" : undefined}
									className={chip(on)}
									onClick={() => {
										setCustom(null);
										setAmount(a);
										setRefused(null);
									}}
								>
									<span className={cn("whitespace-nowrap", FIT)}>${a}</span>
								</button>
							);
						})}
						{custom === null ? (
							<button type="button" aria-pressed={false} className={chip(false)} onClick={() => setCustom(String(amount))}>
								<span className={cn("whitespace-nowrap", FIT)}>{ticketCopy.amounts[4]}</span>
							</button>
						) : (
							<CustomAmount
								className={chip(true)}
								value={custom}
								onChange={(v) => {
									setCustom(v);
									setAmount(Math.max(0, Number(v) || 0));
									setRefused(null);
								}}
								onEnter={confirm}
							/>
						)}
					</div>
				</div>
				{/*
				 * "Shares line" 2:6654: three auto-width text boxes centred as one row, 6 apart. Figma sizes each box to a
				 * whole pixel ("You get" 41, "0.1090" 55, "shares of AAPL" 85: 2:4153-2:4155), so the row starts at 623.5 of the
				 * product ticket; each box takes the same rounded-up width here, left-aligned, so Chrome centres the same row.
				 * The row re-centres whenever the figure changes width (a chip, a late font): its labels are keyed on the figure
				 * and on the font loads, so they repaint where they land. ticket.css puts each text of the ticket on its own
				 * layer (grayscale text), and Chrome moves such a layer without redrawing it, which left "You get" and "shares
				 * of" drawn half a pixel off their boxes after a cold load (measured on 2:4007: a fresh paint matches Figma's).
				 */}
				<div className="flex h-[19px] w-full items-start justify-center gap-[6px] overflow-clip whitespace-nowrap max-lg:h-auto max-lg:min-h-[19px] max-lg:flex-wrap">
					{refusal ? (
						// why this order cannot be placed (orders.ts refusalLine): announced when it appears
						<span role="status" className="mt-[3px] font-geist text-[12px] leading-[16px] text-[#e5484d] max-lg:text-center">
							{refusalLine(refusal, { ticker, side: "buy", cash: shownCash, price })}
						</span>
					) : (
						<Fragment key={`${shares4(shares)}:${fontLoads}`}>
							<span className={cn("mt-[3px] font-geist text-[12px] leading-[16px] text-[#819abb]", FIT)}>{ticketCopy.youGet}</span>
							<span className={cn("font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]", FIT)}>{shares4(shares)}</span>
							<span className={cn("mt-[3px] font-geist text-[12px] leading-[16px] text-[#819abb]", FIT)}>
								{ticketCopy.sharesOf} {ticker}
							</span>
						</Fragment>
					)}
				</div>
			</div>
			<div className="flex w-full flex-col items-start gap-[16px]">
				<PrimaryButton onClick={confirm} disabled={!canBuy} aria-disabled={!canBuy}>
					{busy ? "Placing order…" : ticketCopy.confirm}
				</PrimaryButton>
				<SheetBackButton onClick={onClose}>{ticketCopy.back}</SheetBackButton>
			</div>
			{/*
			 * The ✕ of 2:6663 (a text layer: Geist Medium 14 #819abb in a 13 x 18 box at 1034, 358 of the frame, 446 / 18 in the
			 * sheet): it closes the ticket like Back. Geist has no U+2715, so Figma and each browser draw a fallback font's
			 * glyph, and Chrome's sat ~0.7px higher with thinner strokes. The glyph is Figma's own export of the layer
			 * (x__2-6663.svg, its 11 x 11 render box), laid at the layer's render bounds inside the text box (+0.7141, +4.3115)
			 * by an SVG <image>, which keeps the fraction (an <img> is drawn on whole pixels). Last in the DOM so the first chip
			 * keeps the initial focus. No hover or pressed state (a plain text layer); a transparent margin makes the target
			 * 25 x 26 without moving it. In the narrower compact panel it keeps its 21 from the panel's right edge (480 - 446 - 13).
			 */}
			{example && (
				<button
					type="button"
					aria-label="Close"
					onClick={onClose}
					className="absolute left-[446px] top-[18px] h-[18px] w-[13px] cursor-pointer after:absolute after:-inset-x-[6px] after:-inset-y-[4px] after:content-[''] max-lg:left-auto max-lg:right-[21px]"
				>
					<svg aria-hidden="true" width={13} height={18} viewBox="0 0 13 18" className="block overflow-visible">
						<image href={CLOSE_GLYPH} x={0.7141} y={4.3115} width={11} height={11} />
					</svg>
				</button>
			)}
		</Sheet>
	);
}
