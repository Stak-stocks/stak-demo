import { useId } from "react";
import { chartFractions } from "@/lib/chartSeries";

/**
 * A line with a soft fill under it, stretched to its box. `values` are drawn left to right; fewer than two
 * points draw nothing (the caller shows its own note).
 */
export function Sparkline({ values, color, className = "", fill = true, strokeWidth = 1.6 }: {
	values: number[];
	color: string;
	className?: string;
	fill?: boolean;
	strokeWidth?: number;
}) {
	// useId's colons aren't valid inside url(#...).
	const gradientId = `spark${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	if (values.length < 2) return null;
	const heights = chartFractions(values);
	const last = heights.length - 1;
	const points = heights.map((h, i) => `${((i / last) * 100).toFixed(2)},${((1 - h) * 40).toFixed(2)}`);
	const line = `M${points.join(" L")}`;
	return (
		<svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className} aria-hidden="true">
			{fill && (
				<>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={color} stopOpacity="0.28" />
							<stop offset="100%" stopColor={color} stopOpacity="0" />
						</linearGradient>
					</defs>
					<path d={`${line} L100,40 L0,40 Z`} fill={`url(#${gradientId})`} />
				</>
			)}
			<path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
		</svg>
	);
}
