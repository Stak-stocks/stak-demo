import { Link } from "@tanstack/react-router";
import type { CSSProperties, KeyboardEvent, ReactNode, Ref } from "react";
import { GHOST_FILTER, GRADIENT, HAIRLINE_COLOR, hairline } from "@/app/ui/Button";
import { cn } from "@/lib/utils";
import { SA } from "./assets";

/** Card surfaces. The alternate frames (2:970, 2:1116) use the bluer pair. */
export type Palette = { card: string; inner: string };
export const PALETTE: Palette = { card: "#181f30", inner: "#12203e" };
export const PALETTE_ALT: Palette = { card: "#0e1a36", inner: "#12203e" };

const BUY_FILTER = "drop-shadow(0px 12.285px 6.142px rgba(82,170,199,0.04))";
const SELL_FILTER = "drop-shadow(0px 12.285px 6.142px rgba(82,170,199,0.02))";

/** Hover/pressed feedback for controls whose glow lives in an inline filter (so the shared .stak-press filter cannot apply). */
const PRESS = "cursor-pointer transition-[opacity,transform] duration-150 ease-out hover:opacity-90 active:scale-[0.985] disabled:cursor-default disabled:opacity-60 disabled:active:scale-100";

export function Card({
	className,
	style,
	palette = PALETTE,
	children,
}: { className?: string; style?: CSSProperties; palette?: Palette; children: ReactNode }) {
	return (
		<section
			className={cn("flex flex-col items-start gap-[12px] overflow-clip rounded-[16px] p-[20px]", className)}
			style={{ backgroundColor: palette.card, ...style }}
		>
			{children}
		</section>
	);
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<p className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb]", className)}>
			{children}
		</p>
	);
}

export function CardTitle({ children }: { children: ReactNode }) {
	return <p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{children}</p>;
}

/** Back chevron + breadcrumb ("Simulate  /  Portfolio", two spaces around the slash, as authored). */
export function BackHeader({ crumb, to, style }: { crumb: string; to: string; style?: CSSProperties }) {
	return (
		<div className="flex flex-col items-start gap-[31px]" style={style}>
			<Link
				to={to}
				aria-label="Back"
				className="stak-press flex size-[40px] shrink-0 cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
			>
				<img alt="" src={SA.back} className="size-[22px]" />
			</Link>
			<p className="whitespace-pre font-geist text-[16px] font-medium leading-[21px] text-[#819abb]">{crumb}</p>
		</div>
	);
}

export function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
	return (
		<div className="flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
			<p className="font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{title}</p>
			<p className="font-geist text-[13px] leading-[17px] text-[#819abb]">{subtitle}</p>
		</div>
	);
}

/** Filter chip row ("Top gainers · Newest · Worst", "This week · All time"). */
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
				"stak-press flex cursor-pointer items-start overflow-clip rounded-[999px] px-[14px] py-[6px] font-geist text-[12px] font-medium leading-[16px]",
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
}: { letter: string; size: number; radius: number; bg: string; className?: string }) {
	return (
		<div
			className={cn("flex shrink-0 items-center justify-center overflow-clip", className)}
			style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg }}
		>
			{size === 36 ? (
				<span className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{letter}</span>
			) : (
				<span className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#9eadc7]">{letter}</span>
			)}
		</div>
	);
}

/** "Back" / "Keep exploring" / "View portfolio" — bordered ghost button. */
export function GhostButton({
	children,
	onClick,
	height = 51,
	radius = 5.781,
	fontSize = 14.453,
	className,
	autoFocus,
}: {
	children: ReactNode;
	onClick?: () => void;
	height?: number;
	radius?: number;
	fontSize?: number;
	className?: string;
	/** takes the initial focus inside a Sheet (its `data-autofocus` hook), so a confirmation starts on its safe action */
	autoFocus?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			autoFocus={autoFocus}
			data-autofocus={autoFocus || undefined}
			className={cn(PRESS, "flex w-full items-center justify-center px-[14px] py-[7px]", className)}
			style={{ height, borderRadius: radius, boxShadow: hairline(0.361, "rgba(52,59,79,0.33)"), filter: GHOST_FILTER }}
		>
			<span className="whitespace-nowrap font-sora leading-[18px] text-[#819abb]" style={{ fontSize }}>
				{children}
			</span>
		</button>
	);
}

/** "Sell" — dark teal-hairlined button (pick detail rail, portfolio sell sheet). */
export function SellButton({ children, onClick, width, disabled }: { children: ReactNode; onClick?: () => void; width?: number; disabled?: boolean }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(PRESS, "flex h-[51px] items-center justify-center rounded-[6px] bg-[#12203e]", width ? "" : "w-full")}
			style={{ width, boxShadow: hairline(0.361, HAIRLINE_COLOR), filter: SELL_FILTER }}
		>
			<span className="whitespace-nowrap font-sora text-[14px] leading-[20.69px] text-white">{children}</span>
		</button>
	);
}

/** 60x30 "Buy" in the Saved staks rows. */
export function SmallBuyButton({ children, onClick, "aria-label": ariaLabel }: { children: ReactNode; onClick?: () => void; "aria-label"?: string }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={ariaLabel}
			className={cn(PRESS, "flex h-[30px] w-[60px] shrink-0 items-center justify-center rounded-[5.781px] px-[10px] py-[7.226px]")}
			style={{ backgroundImage: GRADIENT, boxShadow: hairline(0.361, HAIRLINE_COLOR), filter: BUY_FILTER }}
		>
			<span className="whitespace-nowrap font-sora text-[12px] leading-[15px] text-white">{children}</span>
		</button>
	);
}

/** 60x30 "Sell" in the Picks table. */
export function SmallSellButton({ children, onClick, "aria-label": ariaLabel }: { children: ReactNode; onClick?: () => void; "aria-label"?: string }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={ariaLabel}
			className="stak-press flex h-[30px] w-[60px] shrink-0 cursor-pointer items-center justify-center rounded-[5.781px] px-[10px] py-[7.226px]"
			style={{ boxShadow: hairline(1, "rgba(255,255,255,0.14)") }}
		>
			<span className="whitespace-nowrap font-sora text-[12px] leading-[15px] text-[#819abb]">{children}</span>
		</button>
	);
}

/** Quick-amount / portion chip inside the sheets. */
export function AmountChip({
	selected,
	children,
	onClick,
	ref,
}: { selected: boolean; children: ReactNode; onClick?: () => void; ref?: Ref<HTMLButtonElement> }) {
	return (
		<button
			ref={ref}
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			className={cn(
				"stak-press flex min-w-px flex-1 cursor-pointer items-center justify-center overflow-clip rounded-[10px] py-[8px] font-geist text-[12px] font-medium leading-[16px]",
				selected ? "bg-[#0f2a38] text-[#a6e4f7]" : "bg-[#0b1430] text-[#dce7f7]",
			)}
			style={{ boxShadow: selected ? hairline(0.5, "#5da8bf") : hairline(1, "rgba(255,255,255,0.12)") }}
		>
			<span className="whitespace-nowrap">{children}</span>
		</button>
	);
}

/**
 * The "Custom" chip turned into a field: the chip's geometry with a sign and a number input. It replaces the chip
 * that had focus, so it takes focus itself; Escape hands the row back to the chips (`onCancel`) instead of closing the sheet.
 */
export function CustomChip({
	prefix,
	suffix,
	value,
	onChange,
	onCancel,
	max,
	label = "Custom amount",
}: { prefix?: string; suffix?: string; value: string; onChange: (v: string) => void; onCancel?: () => void; max?: number; label?: string }) {
	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== "Escape" || !onCancel) return;
		e.preventDefault();
		e.stopPropagation();
		onCancel();
	};
	return (
		<label
			className="flex min-w-px flex-1 items-center justify-center overflow-clip rounded-[10px] bg-[#0f2a38] py-[8px] font-geist text-[12px] font-medium leading-[16px] text-[#a6e4f7]"
			style={{ boxShadow: hairline(0.5, "#5da8bf") }}
		>
			{prefix && <span>{prefix}</span>}
			<input
				autoFocus
				type="number"
				inputMode="decimal"
				min={1}
				max={max}
				step={1}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={onKeyDown}
				aria-label={label}
				className="w-[44px] bg-transparent text-center text-[#a6e4f7] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
			/>
			{suffix && <span>{suffix}</span>}
		</label>
	);
}

export const GREEN = "#2fd08a";
export const RED = "#ff5a6a";
export const RED_ROW = "#e5484d";
