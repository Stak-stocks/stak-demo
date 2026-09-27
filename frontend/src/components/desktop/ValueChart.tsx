import { useId, useRef, useState, type PointerEvent } from "react";
import { chartFractions } from "@/lib/chartSeries";
import { DESK } from "./deskKit";

export interface ValuePoint { ts: string; value: number }

const W = 1000;
const H = 300;
const shortDay = (ts: string) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
const compact = (n: number) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`);

/**
 * A value-over-time chart with a soft fill, y-axis levels, a few x-axis dates, and a hover readout (date, value and the
 * change from the first point). Stretches to its box; fewer than two points draw nothing.
 */
export function ValueChart({ points, color, className = "", formatValue }: {
	points: ValuePoint[];
	color: string;
	className?: string;
	formatValue: (n: number) => string;
}) {
	const gradientId = `vc${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	const boxRef = useRef<HTMLDivElement>(null);
	const [hover, setHover] = useState<number | null>(null);
	if (points.length < 2) return null;

	const values = points.map((p) => p.value);
	const heights = chartFractions(values);
	const last = points.length - 1;
	const xy = heights.map((h, i) => [(i / last) * W, (1 - h) * H] as const);
	const line = `M${xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")}`;
	const min = Math.min(...values);
	const max = Math.max(...values);
	const xTicks = [0, Math.round(last / 3), Math.round((2 * last) / 3), last].filter((v, i, a) => a.indexOf(v) === i);

	const onMove = (e: PointerEvent<HTMLDivElement>) => {
		const box = boxRef.current?.getBoundingClientRect();
		if (!box) return;
		const f = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
		setHover(Math.round(f * last));
	};

	const h = hover === null ? null : points[hover]!;
	const hPct = h && values[0]! > 0 ? ((h.value - values[0]!) / values[0]!) * 100 : null;

	return (
		<div className={`flex gap-3 ${className}`}>
			<div className="flex min-w-0 flex-1 flex-col">
				<div ref={boxRef} className="relative min-h-0 flex-1" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
					<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
						<defs>
							<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={color} stopOpacity="0.32" />
								<stop offset="100%" stopColor={color} stopOpacity="0" />
							</linearGradient>
						</defs>
						{[0.08, 0.5, 0.92].map((f) => <line key={f} x1="0" x2={W} y1={f * H} y2={f * H} stroke={DESK.border} strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
						<path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${gradientId})`} />
						<path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
						{hover !== null && <line x1={xy[hover]![0]} x2={xy[hover]![0]} y1="0" y2={H} stroke={DESK.body} strokeOpacity="0.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
					</svg>
					{h && (
						<div
							className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-[10px] px-3 py-2 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
							style={{ left: `${Math.min(88, Math.max(12, (hover! / last) * 100))}%`, background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}
						>
							<p style={{ color: DESK.muted }}>{shortDay(h.ts)}</p>
							<p className="font-heading text-[14px] font-semibold tabular-nums text-white">{formatValue(h.value)}</p>
							{hPct != null && <p className="tabular-nums" style={{ color: hPct >= 0 ? DESK.green : DESK.red }}>{hPct >= 0 ? "+" : ""}{hPct.toFixed(1)}%</p>}
						</div>
					)}
				</div>
				<div className="relative mt-2 h-[14px] text-[11px]" style={{ color: DESK.muted }} aria-hidden="true">
					{xTicks.map((i) => (
						<span key={i} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${Math.min(96, Math.max(4, (i / last) * 100))}%` }}>{shortDay(points[i]!.ts)}</span>
					))}
				</div>
			</div>
			{/* The line keeps an 8% margin top and bottom, so these sit level with its high and low. */}
			<div className="flex flex-col justify-between pb-[22px] text-right text-[11px] tabular-nums" style={{ color: DESK.muted, paddingTop: "calc(8% - 6px)" }} aria-hidden="true">
				<span>{compact(max)}</span>
				<span>{compact((max + min) / 2)}</span>
				<span>{compact(min)}</span>
			</div>
		</div>
	);
}
