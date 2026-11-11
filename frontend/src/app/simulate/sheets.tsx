import "./sheets.css";
import { useParams, useSearch } from "@tanstack/react-router";
import { type FocusEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { useSizeClass } from "@/app/FitCanvas";
import { checkBuy, checkSell, normalizeTicker, type OrderRefusal, paperShares, refusalLine, useLive } from "@/app/live";
import { money, shares4, signedMoneyOrZero } from "@/app/live/format";
import { signText } from "@/app/stocks/tone";
import { Sheet } from "@/app/ui/Sheet";
import { cn } from "@/lib/utils";
import { SA } from "./assets";
import { buyFailed, cashAvailable, pickDetail, sheets, type Stock } from "./data";
import { saleLine, salePreview, stakeText, startPortion, typedForAddress } from "./figures";
import { type Motion, withMotion } from "./motion";
import { PrimaryButton } from "@/app/ui/Button";
import { AmountChip, Avatar, box, CustomChip, GhostButton, SellButton, takesFirstFocus, type Widths } from "./ui";

/**
 * Figma's text boxes for the sheets' own strings (2:1311, 2:970, 2:1589, 2:1458, 2:1730, 2:1863 and the portfolio's
 * 2:1116), by type style. Every one is left-aligned in its box, so a box at Figma's width puts the glyphs where the
 * frame does in a centred line (titles, the shares line, button labels) or after a label ("Cash available", "Position").
 */
const W = {
	/** Sora SemiBold 18 */
	title: { "Add NVDA to your portfolio?": 265, "Buy PLTR?": 93, "Order filled": 106, "Position closed": 144, "Sell NVDA?": 104, "Couldn’t place that trade": 230 },
	/** Geist Regular 12 #819abb: the ticket labels and the small words of the shares line */
	label: {
		"Cash available": 80,
		Position: 45,
		"Position value": 77,
		Proceeds: 52,
		"You get": 41,
		"You now hold": 73,
		"You get back": 72,
		Returned: 51,
		Returning: 54,
		"shares of NVDA": 87,
		"shares of PLTR": 82,
		"for 0.5076 shares": 97,
		"to your cash (+$24.00)": 125,
		"to your cash": 69,
	},
	/** Geist Medium 12 #f2f6fc: the ticket values */
	value: { "$8,800.00": 60, "$8,775.00": 57, "1.0152 shares · $124.00": 131, "$124.00": 46 },
	/** Sora SemiBold 12: the receipt's Proceeds value */
	proceeds: { "$124.00": 50 },
	/** Sora SemiBold 15: the shares line's figure */
	big: { "0.2048": 56, "0.8803": 56, "$62.00": 57, "$124.00": 63 },
	/** Geist Medium 12: the stock row's move */
	move: { "▲ 2.4%": 41, "▲ 1.1%": 35 },
	/** Sora SemiBold 15 #9eadc7: the stock row's letter */
	letter: { N: 14, P: 10 },
	/** Geist Medium 14: the primary buttons */
	primary: { "Confirm practice buy": 137, "View in My STAK": 109, "Confirm practice sell": 137, "Back to Simulate": 113, "Try again": 60 },
	/** Sora Regular 14.453 / 14: the ghost buttons */
	ghost: { Back: 36, "Not now": 63, "Keep exploring": 108, "View portfolio": 102 },
	/** Sora Regular 14: the portfolio sheet's Sell */
	sell: { Sell: 27 },
	/** Geist Medium 12: the amount / portion chips */
	chip: { "$10": 21, "$25": 23, "$50": 24, "$100": 29, Custom: 44, "25%": 25, "50%": 26, "75%": 24, All: 15, Half: 24 },
} satisfies Record<string, Widths>;

/** Figma's box for `text` in a type style, or nothing (the run's own width, rounded up). */
const fw = (style: Widths, text: string): number | undefined => style[text];

/**
 * The prototype's wiring of the sheets (Figma: desktop reactions on the success sheets, the rest from the phone
 * page): a sheet opens and closes Instant, Confirm smart-animates into the next state (350 ms ease-out), the
 * success sheet's primary button pushes left to the next page (300 ms ease-out) and its secondary one dissolves
 * (300 ms ease-out). `motion={false}` hands the callbacks over untouched (sheets driven by a parent's own state).
 */
const run = (enabled: boolean, motion: Motion, fn: () => unknown) => (enabled ? withMotion(motion, fn) : fn());

/** Scrim + centred 480 sheet ("Sheet" 2:1421 et al.) on the native dialog. The scrim colour differs per frame in the Figma. */
export function Modal({
	scrim = "rgba(0,0,0,0.66)",
	halfPixel = true,
	snap = true,
	label = "Sheet",
	appear = "fade",
	offsetY = 0,
	onClose,
	children,
}: {
	scrim?: string;
	halfPixel?: boolean;
	/** vertical offset of the panel's centre: a sheet that replaces a ticket keeps the ticket's place (Figma keeps every confirm -> result pair in place) */
	offsetY?: number;
	/**
	 * Paint the sheet on whole pixels (sheets.css). Every Figma sheet sits on a whole pixel except the alternate frame's
	 * Buy sheet (2:1079 at y 298.5), which keeps the plain centring.
	 */
	snap?: boolean;
	label?: string;
	/** `instant`: the sheet appears in one frame, as the prototype opens it (motion.css) */
	appear?: "fade" | "instant";
	onClose: () => void;
	children: ReactNode;
}) {
	const marker = useRef<HTMLSpanElement>(null);
	// Where the panel scrolls inside itself (below 1024 when it is taller than the window: a landscape phone), the browser
	// brings the sheet's first focus into view by centring it, which scrolled a receipt's start (its check and title)
	// out of view. The panel opens at its top instead and scrolls only as far as that control needs. Runs right after
	// the shared Sheet has opened and focused (its effect is a child's), before anything is painted; a panel that does not
	// scroll (every sheet from 1024 up) is left alone.
	useEffect(() => {
		const panel = marker.current?.closest<HTMLElement>("[data-sheet-panel]");
		const first = document.activeElement;
		if (!panel || panel.scrollHeight <= panel.clientHeight || !(first instanceof HTMLElement) || first === panel || !panel.contains(first)) return;
		panel.scrollTop = 0;
		first.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, []);
	return (
		<Sheet label={label} scrim={scrim} offsetY={offsetY + (halfPixel ? 0.5 : 0)} onClose={onClose}>
			{/* marks the dialog for motion.css and sheets.css (how it appears, pixel snapping, grayscale text); `hidden`, so not a flex item */}
			<span ref={marker} hidden data-sim-sheet={appear} data-sim-snap={snap || undefined} />
			{children}
		</Sheet>
	);
}

/**
 * The sheet's title: its heading (h2, one level for every sheet's title), drawn exactly as the paragraph it replaced
 * (preflight gives a heading no size, weight or margin of its own; sheets.css draws it grayscale like the other texts).
 */
function SheetTitle({ children }: { children: string }) {
	const fit = box(fw(W.title, children));
	return (
		<h2 className={cn("sim-sheet-title whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-white", fit.className)} style={fit.style}>
			{children}
		</h2>
	);
}

/** A primary button's label in Figma's box, so the centred text lands where the frame centres it. */
function Label({ children }: { children: string }) {
	const fit = box(fw(W.primary, children));
	return (
		<span className={fit.className} style={fit.style}>
			{children}
		</span>
	);
}

/** "stock" (2:1425 et al.): the company row every sheet state shares. */
function StockRow({ stock, name, gap = 11, radius = 5.78 }: { stock: Stock; name: string; gap?: number; radius?: number }) {
	const move = box(fw(W.move, stock.pct));
	return (
		<div data-morph="stock" className="sim-sheet-stock flex w-full items-center overflow-clip bg-[rgba(105,179,202,0.1)] px-[14px] py-[12px]" style={{ gap, borderRadius: radius }}>
			<Avatar letter={stock.initial} size={38} radius={19} bg="#242b3d" letterWidth={fw(W.letter, stock.initial)} />
			<div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip whitespace-nowrap">
				<p className="font-geist text-[13px] font-medium leading-[17px] text-white">{name}</p>
				<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{money(stock.price)} today</p>
			</div>
			{/* the day's move takes its colour from the figure as printed (stocks/tone.ts, one rule with the stock page's and the
			    deck's tickets, which share the failed-order sheet): Figma's green for a rise, the sheets' red for a fall, the
			    label grey for a move that prints as zero (coordinator rulings N23c / N28d: "▲ 0.0%" was drawn green) */}
			<p className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px]", move.className, signText(stock.pct))} style={move.style}>
				{stock.pct}
			</p>
		</div>
	);
}

/**
 * The sheet's description. Where the panel is narrower than Figma's 440 (below 1024: windows under 512) and the copy
 * re-wraps, it never ends on a lone word ("touched." under "Prices are refreshing. Your paper cash wasn't" at 320 /
 * 360), as the empty state's copy does (`sim-sheet-desc`, sheets.css); at Figma's 440 it wraps as Figma does.
 */
function Description({ children }: { children: ReactNode }) {
	return <p className="sim-sheet-desc w-full font-geist text-[12px] leading-[18px] text-[#c8d2e0]">{children}</p>;
}

/** "Cash available $8,800.00": a label and its value, 6 apart. `proceeds` sets the value in the receipt's Sora 12. */
function KeyValue({ label, value, proceeds }: { label: string; value: string; proceeds?: boolean }) {
	const l = box(fw(W.label, label));
	const v = box(fw(proceeds ? W.proceeds : W.value, value));
	return (
		<div className="sim-sheet-line flex items-center gap-[6px] overflow-clip whitespace-nowrap text-[12px]">
			<p className={cn("font-geist leading-[16px] text-[#819abb]", l.className)} style={l.style}>
				{label}
			</p>
			<p
				className={cn(proceeds ? "font-sora font-semibold leading-[15px]" : "font-geist font-medium leading-[16px]", "text-[#f2f6fc]", v.className)}
				style={v.style}
			>
				{value}
			</p>
		</div>
	);
}

/**
 * "Shares line" (2:1449 et al.): the small words, the figure in Sora 15, the small words, centred 6 apart on one
 * baseline (past 2560 that baseline is laid out explicitly so it scales with the zoom: `sim-big-line`, sheets.css).
 */
function BigLine({ before, big, after }: { before: string; big: string; after: string }) {
	const b = box(fw(W.label, before));
	const n = box(fw(W.big, big));
	const a = box(fw(W.label, after));
	return (
		<div className="sim-sheet-line sim-big-line flex w-full items-baseline justify-center gap-[6px] overflow-clip whitespace-nowrap">
			<p className={cn("font-geist text-[12px] leading-[16px] text-[#819abb]", b.className)} style={b.style}>
				{before}
			</p>
			<p className={cn("font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]", n.className)} style={n.style}>
				{big}
			</p>
			<p className={cn("font-geist text-[12px] leading-[16px] text-[#819abb]", a.className)} style={a.style}>
				{after}
			</p>
		</div>
	);
}

/** A ghost button with Figma's box for its label. */
function Ghost({ children, onClick, success }: { children: string; onClick: () => void; success?: boolean }) {
	return success ? (
		<GhostButton onClick={onClick} height={52} radius={6} fontSize={14} labelWidth={fw(W.ghost, children)}>
			{children}
		</GhostButton>
	) : (
		<GhostButton onClick={onClick} labelWidth={fw(W.ghost, children)}>
			{children}
		</GhostButton>
	);
}

/**
 * The sheets' primary carries Figma's glow (82,170,199 at 3% / 1%, 28 and 50 px down) as a drop-shadow filter rather
 * than the canon's box-shadow: Chrome draws those faint blurred box-shadows in coarse steps that even dip below the
 * sheet's colour inside the Back row, while the filter lands within a unit of Figma's render (sheets.css).
 */
const SHEET_PRIMARY = { "data-sim-glow": "", style: { boxShadow: "none" } } as const;

/**
 * The quick-amount row: room for a focused chip's ring, which the row would otherwise clip. Below 1024 the five 81.6
 * chips (2:1438 / 2:1546) keep their width and wrap three over two, centred on the panel, in a narrower panel, or
 * scroll sideways in the narrowest (`sim-sheet-amounts`, sheets.css).
 */
const CHIP_ROW = "sim-sheet-amounts flex w-full items-start gap-[8px] overflow-clip [overflow-clip-margin:4px]";

/**
 * The portfolio sheet's three portions (2:1238: All / Half / Custom, each FILLING a third of the 440 row, 141.3): below
 * 1024 they keep filling their row (a third of the panel's width each, never under 77 in a 320 window), as Figma's auto
 * layout sizes them, so the row needs neither wrapping nor scrolling.
 */
const PORTION_ROW = "flex w-full items-start gap-[8px] overflow-clip [overflow-clip-margin:4px]";

/**
 * Where a chip row scrolls sideways (the narrowest panels, sheets.css), a chip that takes keyboard focus comes fully
 * into view with its ring: the browser's own focus scroll leaves a chip that is mostly visible where it is, cut at the
 * scroller's edge with half its ring. "nearest" moves the row only as far as needed (its 4px scroll padding keeps the
 * ring inside). A row that does not scroll (every row from 1024 up, the wrapped rows below) is left alone.
 */
const revealChip = (e: FocusEvent<HTMLDivElement>) => {
	const row = e.currentTarget;
	if (row.scrollWidth <= row.clientWidth + 1 || !(e.target instanceof Element)) return;
	e.target.closest(".sim-sheet-amounts > *")?.scrollIntoView({ block: "nearest", inline: "nearest" });
};

/**
 * Below 1024 a sheet can hold a focusable box the approved sheets never have, and the browser's own first focus (the
 * first focusable element) would land on it instead of on a control:
 * - a five-chip row that scrolls sideways (the narrowest panels): Chrome makes a scroller focusable on its own, and
 *   opened at 320 the first focus landed on the row, an extra stop with no ring of its own. The row stays out of the Tab
 *   sequence (every chip in it is a stop already; a chip that takes focus scrolls into view, `revealChip`), and being
 *   still focusable it would take the first focus whenever no chip claims it;
 * - the panel itself where it is taller than the window and scrolls inside itself (the core Sheet rule: a landscape
 *   phone, 568 x 320 / 844 x 390), which then took the first focus on the receipts and the failed sheet.
 * So a sheet's first control carries the Sheet's `data-autofocus` hook. A ticket's is its pressed chip, at EVERY size
 * (ui.tsx takesFirstFocus: the sheet starts on its current choice, the first chip only when none is pressed); a sheet
 * without chips puts it on its primary button below 1024, the control the browser itself focuses first from 1024 up,
 * where those sheets keep their approved DOM.
 */
function useCompactSheet() {
	const size = useSizeClass();
	return size === "phone" || size === "tablet";
}

/** "Frame 1618869123": the primary + ghost pair at the bottom of every sheet state. */
function Buttons({ children }: { children: ReactNode }) {
	return (
		<div data-morph="actions" className="flex w-full flex-col items-start gap-[16px]">
			{children}
		</div>
	);
}

/**
 * The sheets' primary button: the canon with Figma's glow as a filter (SHEET_GLOW) and Figma's box for its label.
 * `autoFocus`: the sheet's first focus (the Sheet's `data-autofocus` hook; see useCompactSheet).
 */
function SheetPrimary({
	label,
	onClick,
	disabled,
	busy,
	autoFocus,
}: {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	busy?: boolean;
	autoFocus?: boolean;
}) {
	return (
		// while an order runs the button keeps its look (a second press does nothing): the prototype's morph starts from it
		<PrimaryButton
			data-sim-glow=""
			data-autofocus={autoFocus || undefined}
			style={{ boxShadow: "none" }}
			onClick={onClick}
			disabled={disabled}
			aria-busy={busy || undefined}
		>
			<Label>{label}</Label>
		</PrimaryButton>
	);
}

/** A typed percentage, or null while the field is empty. */
const typedPct = (v: string) => (v.trim() === "" ? null : Number(v) || 0);

/**
 * The "Custom" chip's field: `custom` is null while the chip shows and a string while the field does.
 * Escape in the field cancels back to the chip, which takes focus again once it is back in the DOM.
 */
function useCustomField(initial: string | null = null) {
	const [custom, setCustom] = useState<string | null>(initial);
	const chipRef = useRef<HTMLButtonElement>(null);
	const cancel = () => {
		setCustom(null);
		requestAnimationFrame(() => chipRef.current?.focus());
	};
	return { custom, setCustom, chipRef, cancel };
}

/**
 * The red line under a ticket's chips when the order on show cannot be placed: the buy and the sell sheets say it alike,
 * in the words every ticket shares (live/orders.ts refusalLine: under the minimum, more than the cash, a sale that rounds
 * to nothing, a company without a price), so Confirm is never greyed out without a reason (coordinator ruling N27i).
 */
function Reason({ children }: { children: ReactNode }) {
	return (
		<p role="alert" className="font-geist text-[11px] leading-[14px] text-[#e5484d]">
			{children}
		</p>
	);
}

/**
 * 2:1421 "Add NVDA to your portfolio?" (canonical) / 2:1079 "Buy PLTR?" (alternate frame, 12px cash gap).
 * `cash` is the paper cash the sheet shows. The order on show (the pressed chip or the typed amount) is checked by the
 * rule the store itself applies (live/orders.ts checkBuy: a price to fill at, the $1.00 minimum, the cash): while it
 * fails Confirm is disabled and the sheet says why (`refusalLine`), for a pressed chip as for a typed amount (a $25
 * chip over $15.00 of cash was greyed out in silence: the hunt's ST-12). `refusal` is the store's own refusal of the
 * order just confirmed (the ledger changed under the sheet), said the same way until the amount changes.
 * `initialAmount` opens the sheet on an amount already chosen (the address keeps it: Try again after a failed order, a
 * reload with the sheet open): its chip when it is one, else the Custom field. `onAmount` reports the choice as it
 * changes, for the page to keep in the address (ST-18: a reload silently turned a chosen $50 into $25).
 * `description`: the ticket's sentence about the price, true for the visitor (figures.ts priceCopy, N30.8g); the frame's
 * own (2:1431) without it.
 */
export function AddConfirmSheet({
	symbol,
	stock,
	alt,
	cash,
	initialAmount,
	description,
	refusal,
	motion = true,
	pending = false,
	onAmount,
	onConfirm,
	onClose,
}: {
	symbol: string;
	stock: Stock;
	alt?: boolean;
	cash?: number;
	initialAmount?: number;
	description?: string;
	refusal?: OrderRefusal | null;
	motion?: boolean;
	pending?: boolean;
	onAmount?: (amount: number) => void;
	onConfirm: (amount: number) => void | Promise<void>;
	onClose: () => void;
}) {
	const s = sheets.addConfirm;
	const start = initialAmount !== undefined && initialAmount > 0 ? initialAmount : 25;
	const startOnChip = s.amounts.includes(start);
	const [picked, setPicked] = useState<number>(startOnChip ? start : 25);
	const { custom, setCustom, chipRef, cancel: cancelCustom } = useCustomField(startOnChip ? null : String(start));
	const [busy, setBusy] = useState(false);
	const available = cash ?? cashAvailable;
	const amount = custom !== null ? Number(custom) || 0 : picked;
	const check = checkBuy(amount, available, stock.price);
	const valid = check.ok && !pending;
	// an empty Custom field has asked for nothing yet: Confirm waits, without a complaint
	const untyped = custom !== null && custom.trim() === "";
	const why: OrderRefusal | null = check.ok ? (refusal ?? null) : untyped ? null : check.reason;
	// the choice lives in the address too (`onAmount`): an empty Custom field stands for the chip it replaced
	const choose = (a: number) => {
		setCustom(null);
		setPicked(a);
		onAmount?.(a);
	};
	// A typed amount is kept in the address only while the ticket itself would take it (figures.ts typedForAddress: the
	// same check as Confirm's, to six decimals); a refused one, like an emptied field, stands for the chip it replaced
	const type = (v: string) => {
		setCustom(v);
		const n = Number(v);
		onAmount?.(typedForAddress(v.trim() === "" ? null : n, checkBuy(n, available, stock.price).ok, picked));
	};
	const cancelTyping = () => {
		cancelCustom();
		onAmount?.(picked);
	};
	const confirm = async () => {
		if (!valid || busy) return;
		setBusy(true);
		try {
			await run(motion, "smart", () => onConfirm(amount));
		} finally {
			setBusy(false);
		}
	};
	const close = () => void run(motion, "instant", onClose);
	const compact = useCompactSheet();
	// the chip on show as pressed: the frame's $25, the one the visitor picked, or the one Try again restored; none while
	// the Custom field shows a typed amount
	const pressed = custom === null ? picked : null;
	const chips = (
		<div role="group" aria-label="Quick amounts" className={CHIP_ROW} onFocus={revealChip} tabIndex={compact ? -1 : undefined}>
			{s.amounts.map((a) => (
				<AmountChip
					key={a}
					// the sheet's first focus, at every size: the pressed amount (never the row, never just the first chip); the
					// first chip when the sheet opens on a typed amount (Try again): the Custom field shows it, unfocused
					autoFocus={takesFirstFocus(s.amounts, pressed, a)}
					selected={custom === null && picked === a}
					labelWidth={fw(W.chip, `$${a}`)}
					onClick={() => choose(a)}
				>
					${a}
				</AmountChip>
			))}
			{custom === null ? (
				<AmountChip ref={chipRef} selected={false} labelWidth={fw(W.chip, s.custom)} onClick={() => setCustom("")}>
					{s.custom}
				</AmountChip>
			) : (
				<CustomChip prefix="$" value={custom} onChange={type} onCancel={cancelTyping} max={Math.floor(available)} invalid={why !== null} />
			)}
		</div>
	);
	const reason = why ? <Reason>{refusalLine(why, { ticker: symbol, side: "buy", cash: available, price: stock.price })}</Reason> : null;
	// The shares the order buys, by the ledger's own rule (ledger.ts paperShares). While the ticket says why the order
	// cannot be placed the line is not drawn, as on the stock page's ticket, which prints its reason in the shares line's
	// place (stocks/PracticeBuySheet.tsx): "The smallest practice buy is $1.00" stood over "You get 0.0000 shares of COST"
	// (follow-up S3, the ledger's review of 2026-11-09). An empty Custom field has asked for nothing yet: no reason, and
	// the line of an order of nothing.
	const line = why ? null : <BigLine before={s.youGet} big={shares4(check.ok ? paperShares(amount, stock.price) : 0)} after={s.sharesOf(symbol)} />;
	return (
		<Modal
			scrim={alt ? "rgba(11,8,8,0.86)" : "rgba(0,0,0,0.66)"}
			snap={!alt}
			label={alt ? s.titleAlt(symbol) : s.title(symbol)}
			appear={motion ? "instant" : "fade"}
			onClose={close}
		>
			<SheetTitle>{alt ? s.titleAlt(symbol) : s.title(symbol)}</SheetTitle>
			<StockRow stock={stock} name={stock.nameConfirm} />
			<Description>{description ?? s.description}</Description>
			{alt ? (
				<div data-morph="ticket" className={cn(TICKET, "gap-[12px]")}>
					<KeyValue label={s.cashLabel} value={money(available)} />
					<div className="flex w-full flex-col items-start gap-[24px]">
						{chips}
						{reason}
						{line}
					</div>
				</div>
			) : (
				<div data-morph="ticket" className={cn(TICKET, "gap-[24px]")}>
					<div className="flex w-full flex-col items-start gap-[15px]">
						<KeyValue label={s.cashLabel} value={money(available)} />
						{chips}
						{reason}
					</div>
					{line}
				</div>
			)}
			<Buttons>
				<SheetPrimary label={s.confirm} onClick={confirm} disabled={!valid} busy={busy} />
				<Ghost onClick={close}>{sheets.back}</Ghost>
			</Buttons>
		</Modal>
	);
}

/**
 * A sheet's ticket ("Practice ticket"): its own row of chips can carry a focus ring past its edge, so the ticket lets
 * 4px of it show instead of clipping it (overflow-clip-margin).
 */
const TICKET = "flex w-full flex-col items-start overflow-clip [overflow-clip-margin:4px]";

/**
 * 2:1699 "Order filled". `shares` and `cash` are the filled quantity and the cash left after it, as the confirm sheet
 * showed that cash (SimulateHome); without them the sheet estimates from the amount.
 */
export function AddSuccessSheet({
	symbol,
	stock,
	amount,
	shares,
	cash,
	motion = true,
	onPrimary,
	onClose,
}: {
	symbol: string;
	stock: Stock;
	amount: number;
	shares?: number;
	cash?: number;
	motion?: boolean;
	onPrimary: () => void;
	onClose: () => void;
}) {
	const s = sheets.addSuccess;
	const held = shares ?? (stock.price > 0 ? amount / stock.price : 0);
	const cashAfter = cash ?? cashAvailable - amount;
	// 2:1726 "View in My STAK": PUSH left 300 ms ease-out · 2:1728 "Keep exploring": DISSOLVE 300 ms ease-out
	const primary = () => void run(motion, "push", onPrimary);
	const close = () => void run(motion, "dissolve", onClose);
	const compact = useCompactSheet();
	return (
		<Modal halfPixel={false} label={s.title} appear={motion ? "instant" : "fade"} onClose={close}>
			<div className="flex w-full flex-col items-center gap-[14px]">
				<div className="flex w-full flex-col items-center gap-[14px]">
					<img alt="" src={SA.checkCircle} className="size-[47px]" />
					<SheetTitle>{s.title}</SheetTitle>
					<StockRow stock={stock} name={stock.name} gap={12} radius={6} />
				</div>
				<Description>{s.description}</Description>
			</div>
			<div data-morph="ticket" className="flex w-full flex-col items-start overflow-clip">
				<div className="flex w-full flex-col items-start gap-[24px]">
					<KeyValue label={s.cashLabel} value={money(cashAfter)} />
					<BigLine before={s.youHold} big={shares4(held)} after={sheets.addConfirm.sharesOf(symbol)} />
				</div>
			</div>
			<Buttons>
				<SheetPrimary label={s.primary} onClick={primary} autoFocus={compact} />
				<Ghost success onClick={close}>
					{s.secondary}
				</Ghost>
			</Buttons>
		</Modal>
	);
}

/** "That is more than you hold": a typed share of the position above 100%. */
const overHolding = (pct: number | null) => pct !== null && pct > 100;

/** A typed percentage as the portion of the position it stands for (0 to 1; nothing typed is nothing). */
const typedFrac = (pct: number | null) => Math.min(100, Math.max(0, pct ?? 0)) / 100;

/**
 * The sale a sell sheet has on show: whether the store would take it (live/orders.ts checkSell on the ledger's own
 * quantity and price), why not (`why`, for the sheet's red line: nothing for an empty Custom field, or for a typed share
 * above 100%, which has its own line), and what it returns for how many shares. With the ledger's figures (`exact`) that
 * is the ledger's own arithmetic (figures.ts salePreview); without them the figures on show times the portion (the
 * frame's own sum).
 */
function saleOnShow({
	held,
	worth,
	price,
	exact,
	frac,
	over,
	untyped,
	refusal,
}: {
	held: number;
	worth: number;
	price: number;
	exact?: SaleLedger;
	frac: number;
	over: boolean;
	untyped: boolean;
	refusal?: OrderRefusal | null;
}): { ok: boolean; why: OrderRefusal | null; shares: number; proceeds: number } {
	const ledger = exact ?? { shares: held, price };
	const check = checkSell(ledger.shares * frac, ledger.shares, ledger.price);
	const ok = check.ok && !over;
	const why: OrderRefusal | null = over ? null : check.ok ? (refusal ?? null) : untyped ? null : check.reason;
	if (!ok) return { ok, why, shares: 0, proceeds: 0 };
	const preview = exact ? salePreview(exact.shares, exact.price, frac, exact.account) : { shares: held * frac, proceeds: worth * frac };
	return { ok, why, shares: preview.shares, proceeds: preview.proceeds };
}


/**
 * The ledger's own figures for a sell sheet: the exact quantity held (a guest's eight decimals) and the price the sale
 * fills at. With them the sheet previews the sale by the ledger's arithmetic (figures.ts salePreview -> ledger.ts
 * paperSale), to the cent and the ten-thousandth of a share the store will book (coordinator rulings N23e / N28e).
 * Without them (the untouched showcase's frame figures: 1.0152 shares, $124.00) it multiplies what is on show, as the
 * frame does ("$62.00 for 0.5076 shares", 2:1458).
 */
export type SaleLedger = { shares: number; price: number; /** a signed-in account's own quantities (figures.ts salePreview) */ account?: boolean };

/**
 * 2:1529 "Sell NVDA?" over the pick detail. `shares` / `value` are the position on show, `exact` the ledger's own
 * figures for it (SaleLedger). The portion on show is checked by the rule the store applies (live/orders.ts checkSell):
 * a sale that rounds to nothing keeps Confirm disabled and says so (the hunt's ST-05: a 0.001% sale filed "Sold 0.0000
 * shares"). `onPortion` reports the choice as it changes, for the page to keep in the address (N29f: a reload turned a
 * chosen 75% into 50%).
 */
export function SellConfirmSheet({
	symbol,
	stock,
	shares,
	value,
	exact,
	initialPortion,
	refusal,
	motion = true,
	pending = false,
	onPortion,
	onConfirm,
	onClose,
}: {
	symbol: string;
	stock: Stock;
	shares?: number;
	value?: number;
	exact?: SaleLedger;
	/** the portion the sheet opens on (the address keeps it: Try again after a failed sale, a reload); the frame's 50% otherwise */
	initialPortion?: number;
	/** the store's own refusal of the sale just confirmed, said like the sheet's own until the portion changes */
	refusal?: OrderRefusal | null;
	motion?: boolean;
	pending?: boolean;
	onPortion?: (portion: number) => void;
	onConfirm: (portion: number) => void | Promise<void>;
	onClose: () => void;
}) {
	const s = sheets.sellConfirm;
	const [start] = useState(() => startPortion(s.portions, initialPortion, 0.5));
	const [portion, setPortion] = useState(start.chip);
	const { custom, setCustom, chipRef, cancel: cancelCustom } = useCustomField(start.custom);
	const [busy, setBusy] = useState(false);
	const held = shares ?? pickDetail.position.shares;
	const worth = value ?? pickDetail.position.value;
	const pct = custom !== null ? typedPct(custom) : null;
	const over = overHolding(pct); // 150% of a position is not a sale this sheet can make: say so, as the buy sheet does
	const frac = custom !== null ? typedFrac(pct) : portion;
	const sale = saleOnShow({ held, worth, price: stock.price, exact, frac, over, untyped: custom !== null && custom.trim() === "", refusal });
	const valid = sale.ok && !pending;
	const choose = (p: number) => {
		setCustom(null);
		setPortion(p);
		onPortion?.(p);
	};
	// A typed share is kept in the address only while the sheet itself would take it (figures.ts typedForAddress: the
	// check Confirm waits for, to six decimals: 99.999% is 0.99999, not 0.9999899999999999); a refused one (0.001% of a
	// small position, 150%), like an emptied field, stands for the chip it replaced
	const type = (v: string) => {
		setCustom(v);
		const typed = typedPct(v);
		const ok = saleOnShow({ held, worth, price: stock.price, exact, frac: typedFrac(typed), over: overHolding(typed), untyped: typed === null }).ok;
		onPortion?.(typedForAddress(typed === null ? null : typed / 100, ok, portion));
	};
	const cancelTyping = () => {
		cancelCustom();
		onPortion?.(portion);
	};
	const confirm = async () => {
		if (!valid || busy) return;
		setBusy(true);
		try {
			// phone 1:5238 "Confirm sell" -> Sell success: SMART_ANIMATE 350 ms ease-out
			await run(motion, "smart", () => onConfirm(frac));
		} finally {
			setBusy(false);
		}
	};
	// phone 1:5240 "Back" -> Pick detail: Instant
	const close = () => void run(motion, "instant", onClose);
	const compact = useCompactSheet();
	// the portion on show as pressed: the frame's 50%, the one the visitor picked, or the one Try again restored; none
	// while the Custom field shows a typed share
	const pressed = custom === null ? portion : null;
	return (
		<Modal halfPixel={false} label={s.title(symbol)} appear={motion ? "instant" : "fade"} onClose={close}>
			<SheetTitle>{s.title(symbol)}</SheetTitle>
			<StockRow stock={stock} name={stock.nameConfirm} />
			<Description>{`You hold ${shares4(held)} shares, worth ${money(worth)} today. Selling returns paper cash at today’s price.`}</Description>
			<div data-morph="ticket" className={cn(TICKET, "gap-[24px]")}>
				<div className="flex w-full flex-col items-start gap-[15px]">
					<KeyValue label={s.positionLabel} value={`${shares4(held)} shares · ${money(worth)}`} />
					<div role="group" aria-label="Sell portions" className={CHIP_ROW} onFocus={revealChip} tabIndex={compact ? -1 : undefined}>
						{s.portions.map((p, i) => (
							<AmountChip
								key={p}
								// the sheet's first focus, at every size: the pressed portion (ui.tsx takesFirstFocus)
								autoFocus={takesFirstFocus(s.portions, pressed, p)}
								selected={custom === null && portion === p}
								labelWidth={fw(W.chip, s.portionLabels[i]!)}
								onClick={() => choose(p)}
							>
								{s.portionLabels[i]}
							</AmountChip>
						))}
						{custom === null ? (
							<AmountChip ref={chipRef} selected={false} labelWidth={fw(W.chip, s.custom)} onClick={() => setCustom("")}>
								{s.custom}
							</AmountChip>
						) : (
							<CustomChip suffix="%" value={custom} onChange={type} onCancel={cancelTyping} max={100} label="Custom portion" invalid={over || sale.why !== null} />
						)}
					</div>
					{over && <Reason>That is more than you hold. Up to 100% fits.</Reason>}
					{sale.why && <Reason>{refusalLine(sale.why, { ticker: symbol, side: "sell", price: stock.price })}</Reason>}
				</div>
				{/* while the sheet says why the sale cannot be placed, its line is not drawn (saleLine), as the buy ticket's "You get" */}
				{saleLine(over, sale.why) && <BigLine before={s.youGetBack} big={money(sale.proceeds)} after={s.forShares(shares4(sale.shares))} />}
			</div>
			<Buttons>
				<SheetPrimary label={s.confirm} onClick={confirm} disabled={!valid} busy={busy} />
				<Ghost onClick={close}>{sheets.back}</Ghost>
			</Buttons>
		</Modal>
	);
}

/**
 * 2:1801 "Position closed": the sale that just happened. The frame's receipt sold the whole position; a sale that
 * leaves shares behind did not close it, so its receipt takes the buy receipt's title (2:1706 "Order filled"). The
 * page can say which it was (`closed`); otherwise the sheet reads it from the pick's route: the portion sold (no
 * portion is the frame's own receipt, the whole position) and whether any of that company is still held.
 */
export function SellSuccessSheet({
	stock,
	shares,
	stake,
	proceeds,
	pnl,
	closed,
	motion = true,
	onPrimary,
	onSecondary,
	onClose,
}: {
	stock: Stock;
	shares: number;
	stake: number;
	proceeds: number;
	pnl: number;
	closed?: boolean;
	motion?: boolean;
	onPrimary: () => void;
	onSecondary: () => void;
	onClose: () => void;
}) {
	const s = sheets.sellSuccess;
	const { symbol } = useParams({ strict: false }) as { symbol?: string };
	const { portion } = useSearch({ strict: false }) as { portion?: number };
	const live = useLive();
	const stillHeld = !!symbol && live.positions.some((p) => normalizeTicker(p.ticker) === normalizeTicker(symbol));
	const isClosed = closed ?? ((portion ?? 1) >= 1 || !stillHeld);
	const title = isClosed ? s.title : s.titlePartial;
	// 2:1825 "Back to Simulate": PUSH left 300 ms ease-out · 2:1827 "View portfolio": DISSOLVE 300 ms ease-out
	const primary = () => void run(motion, "push", onPrimary);
	const secondary = () => void run(motion, "dissolve", onSecondary);
	const close = () => void run(motion, "dissolve", onClose);
	const compact = useCompactSheet();
	return (
		<Modal label={title} appear={motion ? "instant" : "fade"} onClose={close}>
			<div className="flex w-full flex-col items-center gap-[14px]">
				<img alt="" src={SA.checkCircle} className="size-[47px]" />
				<SheetTitle>{title}</SheetTitle>
			</div>
			<StockRow stock={stock} name={stock.name} radius={6} />
			<Description>{`Sold ${shares4(shares)} shares from your ${stakeText(stake)} stake.`}</Description>
			<div data-morph="ticket" className="flex w-full flex-col items-start gap-[12px] overflow-clip whitespace-nowrap">
				<KeyValue label={s.proceeds} value={money(proceeds)} proceeds />
				<BigLine before={s.returned} big={money(proceeds)} after={s.toCash(signedMoneyOrZero(pnl))} />
			</div>
			<Buttons>
				<SheetPrimary label={s.primary} onClick={primary} autoFocus={compact} />
				<Ghost success onClick={secondary}>
					{s.secondary}
				</Ghost>
			</Buttons>
		</Modal>
	);
}

/**
 * 2:1219 "Sell NVDA?" over the portfolio (alternate frame 2:1116). `exact`, the check, the reason and `onPortion` as on
 * the pick page's sheet (SellConfirmSheet).
 */
export function PortfolioSellSheet({
	symbol,
	stock,
	shares,
	stake,
	value,
	exact,
	initialPortion,
	refusal,
	pending = false,
	onPortion,
	onConfirm,
	onClose,
}: {
	symbol: string;
	stock: Stock;
	shares?: number;
	stake?: number;
	value?: number;
	exact?: SaleLedger;
	/** the portion the sheet opens on (the address keeps it: Try again after a failed sale, a reload); the frame's All otherwise */
	initialPortion?: number;
	refusal?: OrderRefusal | null;
	pending?: boolean;
	onPortion?: (portion: number) => void;
	onConfirm: (portion: number) => void | Promise<void>;
	onClose: () => void;
}) {
	const s = sheets.portfolioSell;
	const [start] = useState(() => startPortion(s.portions, initialPortion, 1));
	const [portion, setPortion] = useState(start.chip);
	const { custom, setCustom, chipRef, cancel: cancelCustom } = useCustomField(start.custom);
	const [busy, setBusy] = useState(false);
	const held = shares ?? pickDetail.position.shares;
	const staked = stake ?? pickDetail.position.stake;
	const worth = value ?? pickDetail.position.value;
	const pct = custom !== null ? typedPct(custom) : null;
	const over = overHolding(pct);
	const frac = custom !== null ? typedFrac(pct) : portion;
	const sale = saleOnShow({ held, worth, price: stock.price, exact, frac, over, untyped: custom !== null && custom.trim() === "", refusal });
	const valid = sale.ok && !pending;
	const choose = (p: number) => {
		setCustom(null);
		setPortion(p);
		onPortion?.(p);
	};
	// A typed share is kept in the address only while the sheet itself would take it (figures.ts typedForAddress: the
	// check Confirm waits for, to six decimals: 99.999% is 0.99999, not 0.9999899999999999); a refused one (0.001% of a
	// small position, 150%), like an emptied field, stands for the chip it replaced
	const type = (v: string) => {
		setCustom(v);
		const typed = typedPct(v);
		const ok = saleOnShow({ held, worth, price: stock.price, exact, frac: typedFrac(typed), over: overHolding(typed), untyped: typed === null }).ok;
		onPortion?.(typedForAddress(typed === null ? null : typed / 100, ok, portion));
	};
	const cancelTyping = () => {
		cancelCustom();
		onPortion?.(portion);
	};
	const confirm = async () => {
		if (!valid || busy) return;
		setBusy(true);
		try {
			await onConfirm(frac);
		} finally {
			setBusy(false);
		}
	};
	// the portion on show as pressed: the frame's All, the one the visitor picked, or the one Try again restored; none
	// while the Custom field shows a typed share
	const pressed = custom === null ? portion : null;
	return (
		<Modal scrim="rgba(17,14,14,0.74)" halfPixel={false} label={s.title(symbol)} appear="instant" onClose={onClose}>
			<SheetTitle>{s.title(symbol)}</SheetTitle>
			<StockRow stock={stock} name={stock.name} />
			<Description>{`You hold ${shares4(held)} shares from your ${stakeText(staked)} stake.`}</Description>
			<div className={cn(TICKET, "gap-[12px]")}>
				<KeyValue label={s.positionLabel} value={money(worth)} />
				<div className="flex w-full flex-col items-start gap-[24px]">
					<div role="group" aria-label="Sell portions" className={PORTION_ROW}>
						{s.portions.map((p, i) => (
							<AmountChip
								key={p}
								// the sheet's first focus, at every size: the pressed portion (ui.tsx takesFirstFocus). Below 1024 a
								// panel taller than the window scrolls and would take the first focus otherwise (useCompactSheet)
								autoFocus={takesFirstFocus(s.portions, pressed, p)}
								selected={custom === null && portion === p}
								labelWidth={fw(W.chip, s.portionLabels[i]!)}
								onClick={() => choose(p)}
							>
								{s.portionLabels[i]}
							</AmountChip>
						))}
						{custom === null ? (
							<AmountChip ref={chipRef} selected={false} labelWidth={fw(W.chip, s.custom)} onClick={() => setCustom("")}>
								{s.custom}
							</AmountChip>
						) : (
							<CustomChip suffix="%" value={custom} onChange={type} onCancel={cancelTyping} max={100} label="Custom portion" invalid={over || sale.why !== null} />
						)}
					</div>
					{over && <Reason>That is more than you hold. Up to 100% fits.</Reason>}
					{sale.why && <Reason>{refusalLine(sale.why, { ticker: symbol, side: "sell", price: stock.price })}</Reason>}
					{saleLine(over, sale.why) && <BigLine before={s.returning} big={money(sale.proceeds)} after={s.toCash} />}
				</div>
			</div>
			<Buttons>
				<SellButton onClick={confirm} disabled={!valid} aria-busy={busy} labelWidth={fw(W.sell, s.sell)}>
					{s.sell}
				</SellButton>
				<Ghost onClick={onClose}>{sheets.back}</Ghost>
			</Buttons>
		</Modal>
	);
}

/**
 * 2:1972 "Couldn’t place that trade" (10 · States, over Simulate home). The phone draws it without wiring; on
 * Simulate (`motion`) it follows the confirm sheet it stands in for: Try again smart-animates back, Not now is Instant.
 */
export function BuyFailedSheet({
	stock,
	motion = false,
	still = false,
	offsetY,
	scrim,
	onRetry,
	onClose,
}: { stock: Stock; motion?: boolean; still?: boolean; offsetY?: number; scrim?: string; onRetry: () => void; onClose: () => void }) {
	const retry = () => void run(motion, "smart", onRetry);
	const close = () => void run(motion, "instant", onClose);
	const compact = useCompactSheet();
	return (
		// `scrim`: the ticket this sheet replaces may stand on its own scrim (the My STAK-entry stock tickets' #030409 layers);
		// the prototype keeps every confirm -> result pair's scrim (1:3764 -> 1:4216), so the caller hands it on. Absent =
		// the Modal's default, as before.
		<Modal label={buyFailed.title} appear={motion || still ? "instant" : "fade"} offsetY={offsetY} scrim={scrim} onClose={close}>
			<SheetTitle>{buyFailed.title}</SheetTitle>
			<p className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#e5484d]">{buyFailed.status}</p>
			<StockRow stock={stock} name={stock.nameConfirm} />
			<Description>{buyFailed.description}</Description>
			<Buttons>
				<SheetPrimary label={buyFailed.retry} onClick={retry} autoFocus={compact} />
				<Ghost onClick={close}>{buyFailed.dismiss}</Ghost>
			</Buttons>
		</Modal>
	);
}
