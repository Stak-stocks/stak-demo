import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ChartRange } from "@/lib/api";
import { chartFractions } from "@/lib/chartSeries";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PHONE_MAX_WIDTH, useFigmaUnit, useShellInset } from "@/components/discover/useFigmaUnit";
import { GradientCta, PRESS, f, focusRing, sheetCard } from "@/components/phone/phone";

export const SIM = {
	ctaBorder: "linear-gradient(to bottom, rgba(101,158,173,0.63), rgba(22,54,63,0.43))",
	darkCta: "#12203E",
	tealTint: "rgba(105,179,202,0.10)",
	amountBg: "#0B1430",
	amountInk: "#DCE7F7",
	amountSelBg: "#0F2A38",
	amountSelBorder: "#69B3CA",
	amountSelInk: "#69B3CA",
	secondaryBorder: "rgba(52,59,79,0.33)",
	hairline: "rgba(255,255,255,0.14)",
} as const;

/** Android's tealShadow: a soft teal drop shadow under a button (CSS blur ≈ 2x Compose's). */
export const tealShadow = (dy: number, blur: number, alpha: number) => `0 ${cu(dy)} ${cu(blur * 2)} rgba(105,179,202,${alpha})`;

/** A gradient hairline border around a button: paints the gradient, then the fill over its padding box. */
export function gradientBorder(fill: string, width = 0.36): CSSProperties {
	return {
		border: `${cu(width)} solid transparent`,
		// A solid colour becomes a one-colour gradient layer; a fill that is already a gradient (DISC.cta) is used as is -
		// wrapping it in linear-gradient() again is invalid CSS, which drew no fill at all.
		background: `${fill.includes("gradient(") ? fill : `linear-gradient(${fill}, ${fill})`} padding-box, ${SIM.ctaBorder} border-box`,
	};
}

export const SectionHeader = ({ children }: { children: ReactNode }) => (
	<h2 style={{ font: f(600, 16, 20, "heading"), color: DISC.headerGray }}>{children}</h2>
);

export const Kicker = ({ children }: { children: ReactNode }) => (
	<p style={{ font: f(500, 10, 13), letterSpacing: cu(0.9), color: DISC.faint }}>{children}</p>
);

/** The letter circle every stock row starts with. */
export function Badge({ letter, size = 38, fontSize = 15, alpha = 1 }: { letter: string; size?: number; fontSize?: number; alpha?: number }) {
	return (
		<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(size), height: cu(size), background: DISC.avatar, font: f(600, fontSize, undefined, "heading"), color: DISC.badgeInk, opacity: alpha }} aria-hidden="true">
			{letter.slice(0, 1).toUpperCase()}
		</span>
	);
}

export function EmptyStateCard({ title, body, link, onLink }: { title: string; body: string; link?: string; onLink?: () => void }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: cu(6), ...sheetCard(14), padding: cu(16) }}>
			<p style={{ font: f(600, 15, 19, "heading"), color: "#fff" }}>{title}</p>
			<p style={{ font: f(400, 13, 19), color: DISC.muted }}>{body}</p>
			{link && (
				<button type="button" onClick={onLink} className={`w-fit ${PRESS}`} style={{ paddingTop: cu(4), font: f(500, 13, 17), color: DISC.teal, ...focusRing }}>{link} ›</button>
			)}
		</div>
	);
}

export function CenterLink({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className={`flex w-full items-center justify-center ${PRESS}`} style={{ gap: cu(6), ...focusRing }}>
			<span style={{ font: f(500, 13, 17), color: DISC.teal }}>{label}</span>
			<span style={{ font: f(500, 14, 18), color: DISC.teal }} aria-hidden="true">›</span>
		</button>
	);
}

/** Android's RangeChart: one plain 2u teal line, no fill, no axes, no tooltip. */
export function RangeChart({ values, width = 343, height = 73.56, color = DISC.teal }: { values: number[]; width?: number; height?: number; color?: string }) {
	const fractions = chartFractions(values);
	const last = Math.max(1, fractions.length - 1);
	const points = fractions.map((fr, i) => `${(width * i) / last},${height * (1 - fr)}`).join(" ");
	return (
		<svg viewBox={`0 0 ${width} ${height}`} style={{ width: cu(width), height: cu(height), overflow: "visible" }} fill="none" role="img" aria-label="Value over time">
			<polyline points={points} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export const ChartNote = ({ children, width = 343, height = 73.56, color = DISC.faint }: { children: ReactNode; width?: number; height?: number; color?: string }) => (
	<div className="grid place-items-center" style={{ width: cu(width), height: cu(height), font: f(400, 11), color }}>{children}</div>
);

const RANGES: ReadonlyArray<readonly [ChartRange, string]> = [["1d", "1D"], ["1w", "1W"], ["1m", "1M"], ["3m", "3M"], ["ytd", "YTD"], ["1y", "1Y"]];

/** The 1D 1W 1M 3M YTD 1Y row: the selected range sits in a small teal-tinted pill, the rest are plain text. */
export function RangeChips({ value, onChange }: { value: ChartRange; onChange: (r: ChartRange) => void }) {
	return (
		<div className="flex items-center justify-center" style={{ gap: cu(37) }} role="group" aria-label="Chart range">
			{RANGES.map(([key, label]) => {
				const selected = key === value;
				return (
					<button
						key={key}
						type="button"
						onClick={() => onChange(key)}
						aria-pressed={selected}
						className={`grid place-items-center ${PRESS}`}
						style={selected
							? { width: cu(39), height: cu(22.5), borderRadius: cu(11.25), background: "rgba(105,179,202,0.16)", border: `${cu(0.75)} solid rgba(105,179,202,0.4)`, font: f(500, 12, 16), color: DISC.teal, ...focusRing }
							: { font: f(400, 12, 16), color: DISC.muted, ...focusRing }}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
}

/** Full-width primary button (gradient) - "Confirm practice buy", "View portfolio". Disabled buttons fade to half. */
export function SheetCta({ children, onClick, disabled, height = 52, shadow = tealShadow(12.28, 12.28, 0.09) }: {
	children: ReactNode;
	onClick: () => void;
	disabled?: boolean;
	height?: number;
	shadow?: string;
}) {
	return <GradientCta onClick={onClick} disabled={disabled} height={height} rim={SIM.ctaBorder} shadow={shadow}>{children}</GradientCta>;
}

/** The dark navy button (Sell, Confirm sell, Start practicing). */
export function DarkCta({ children, onClick, height = 51, shadow, dim = true }: { children: ReactNode; onClick: () => void; height?: number; shadow?: string; dim?: boolean }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full ${dim ? PRESS : ""}`}
			style={{ height: cu(height), borderRadius: cu(6), ...gradientBorder(SIM.darkCta, 0.361), boxShadow: shadow, font: f(400, 14, 20.69, "heading"), color: "#fff", ...focusRing }}
		>
			{children}
		</button>
	);
}

/** The outlined button under it ("Back", "Done"). */
export function SheetSecondary({ children, onClick, height = 52 }: { children: ReactNode; onClick: () => void; height?: number }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full ${PRESS}`}
			style={{ height: cu(height), borderRadius: cu(6), border: `${cu(0.36)} solid ${SIM.secondaryBorder}`, font: f(400, 14, undefined, "heading"), color: DISC.muted, ...focusRing }}
		>
			{children}
		</button>
	);
}

/** Preset / chip button used by the amount pills and the All/Half/Custom chips. */
export function PillChoice({ label, selected, onClick, radius = 10, disabled }: { label: string; selected: boolean; onClick: () => void; radius?: number; disabled?: boolean }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			disabled={disabled}
			className={`flex-1 ${PRESS}`}
			style={{
				padding: `${cu(8)} 0`, borderRadius: cu(radius), font: f(500, 12, 16),
				background: selected ? SIM.amountSelBg : SIM.amountBg,
				border: selected ? `${cu(0.5)} solid ${SIM.amountSelBorder}` : `${cu(1)} solid rgba(255,255,255,0.12)`,
				color: selected ? SIM.amountSelInk : SIM.amountInk, ...focusRing,
			}}
		>
			{label}
		</button>
	);
}

/** "$ 0.00" style entry used by Custom amounts and Limit prices. */
export function MoneyField({ prefix, value, onChange, placeholder, label, radius = 10 }: {
	prefix: string;
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	label: string;
	radius?: number;
}) {
	return (
		<label className="flex items-center" style={{ gap: cu(4), borderRadius: cu(radius), background: SIM.amountBg, border: `${cu(0.5)} solid ${SIM.amountSelBorder}`, padding: `${cu(8)} ${cu(12)}` }}>
			<span style={{ font: f(500, 12, 16), color: SIM.amountInk }}>{prefix}</span>
			<input
				inputMode="decimal"
				value={value}
				aria-label={label}
				placeholder={placeholder}
				maxLength={9}
				onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, "").slice(0, 9))}
				className="w-full min-w-0 bg-transparent outline-none placeholder:text-[#819ABB]"
				style={{ font: f(500, 12, 16), color: "#fff", caretColor: SIM.amountSelBorder }}
			/>
		</label>
	);
}

/**
 * Android's SheetScaffold: a bottom sheet over a 60% scrim. Tap the scrim or drag the handle down 150 to close;
 * a shorter drag snaps back. Renders in the phone-width column, centred on wider screens.
 */
export function SheetScaffold({ children, onDismiss, label, scrim = "rgba(0,0,0,0.6)", draggable = true }: {
	children: ReactNode;
	onDismiss: () => void;
	label: string;
	scrim?: string;
	draggable?: boolean;
}) {
	const unit = useFigmaUnit();
	const inset = useShellInset();
	const [entered, setEntered] = useState(false);
	const [dragY, setDragY] = useState(0);
	const dragStart = useRef<number | null>(null);
	const sheetRef = useRef<HTMLDivElement>(null);
	const onDismissRef = useRef(onDismiss);
	useEffect(() => { onDismissRef.current = onDismiss; });

	useEffect(() => {
		const opener = document.activeElement as HTMLElement | null;
		const raf = requestAnimationFrame(() => setEntered(true));
		sheetRef.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") { onDismissRef.current(); return; }
			if (e.key !== "Tab" || !sheetRef.current) return;
			const focusable = sheetRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input, [tabindex]:not([tabindex='-1'])");
			if (focusable.length === 0) { e.preventDefault(); return; }
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement;
			if (e.shiftKey && (active === first || active === sheetRef.current)) { e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
		};
		window.addEventListener("keydown", onKey);
		return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); opener?.focus?.(); };
	}, []);

	const dragging = dragStart.current !== null;
	return createPortal(
		<div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ ["--u" as string]: `${unit}px`, paddingLeft: inset }}>
			<div
				className="absolute inset-0 transition-opacity duration-200"
				style={{ background: scrim, opacity: entered ? Math.max(0, 1 - dragY / (400 * unit)) : 0 }}
				onClick={() => onDismissRef.current()}
				aria-hidden="true"
			/>
			<div
				ref={sheetRef}
				role="dialog"
				aria-modal="true"
				aria-label={label}
				tabIndex={-1}
				className="relative w-full outline-none"
				style={{
					maxWidth: PHONE_MAX_WIDTH, background: DISC.sheet, borderTopLeftRadius: cu(24), borderTopRightRadius: cu(24),
					padding: `${cu(10)} ${cu(20)} ${cu(12)}`, maxHeight: "92vh", overflowY: "auto",
					transform: `translateY(${entered ? dragY : 700}px)`, transition: dragging ? "none" : "transform 260ms ease-out",
				}}
			>
				<div
					className={`flex items-center justify-center ${draggable ? "cursor-grab touch-none" : ""}`}
					style={{ height: cu(28) }}
					onPointerDown={draggable ? (e) => { dragStart.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); } : undefined}
					onPointerMove={draggable ? (e) => { if (dragStart.current !== null) setDragY(Math.max(0, e.clientY - dragStart.current)); } : undefined}
					onPointerUp={draggable ? () => {
						const dragged = dragY;
						dragStart.current = null;
						if (dragged > 150) onDismissRef.current(); else setDragY(0);
					} : undefined}
					onPointerCancel={draggable ? () => { dragStart.current = null; setDragY(0); } : undefined}
				>
					<div style={{ width: cu(40), height: cu(4), borderRadius: cu(2), background: DISC.divider }} />
				</div>
				{children}
			</div>
		</div>,
		document.body,
	);
}

/** Android's check icon on the order/sell receipts. */
export function SheetCheck() {
	return (
		<svg viewBox="0 0 47 47" style={{ width: cu(47), height: cu(47) }} fill="none" aria-hidden="true">
			<circle cx="23.5" cy="23.5" r="21" stroke="#4A9FB8" strokeWidth="3" />
			<path d="M14 24.5 L20.8 31.3 L33.5 17.5" stroke="#4A9FB8" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
