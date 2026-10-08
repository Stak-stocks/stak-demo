// A small standalone ring chart for the Taste card's "Taste mix" visualization —
// no charting library needed for one ring. Each share gets an arc of
// circumference proportional to its value, drawn via stroke-dasharray/
// stroke-dashoffset, clockwise from 12 o'clock.
interface DonutRingProps {
	shares: number[];
	colors: string[];
	size?: number;
	strokeWidth?: number;
	/** Android's DonutRing leaves a 5 degree gap between arcs (none for a single arc). Default 0 keeps the old solid ring. */
	gapDegrees?: number;
	className?: string;
}

export function DonutRing({ shares, colors, size = 92, strokeWidth = 10, gapDegrees = 0, className }: DonutRingProps) {
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const center = size / 2;

	const gapDeg = shares.length > 1 ? gapDegrees : 0;
	let offsetSoFar = 0;
	const arcs = shares.map((share, i) => {
		const clamped = Math.max(0, Math.min(1, share));
		const full = clamped * circumference;
		// With gaps, each arc gives up `gapDeg` of its sweep (at least 2 degrees stay) and starts half a gap in.
		const sweepDeg = gapDeg > 0 ? Math.max(2, clamped * 360 - gapDeg) : (full / circumference) * 360;
		const dash = (sweepDeg / 360) * circumference;
		const gap = circumference - dash;
		// Rotate so each arc starts where the previous one ended, clockwise from 12 o'clock.
		const rotation = -90 + (offsetSoFar / circumference) * 360 + gapDeg / 2;
		offsetSoFar += full;
		return { dash, gap, rotation, color: colors[i] ?? "var(--mystak-faint)" };
	});

	return (
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden="true">
			{arcs.map((arc, i) => (
				<circle
					key={i}
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					stroke={arc.color}
					strokeWidth={strokeWidth}
					strokeDasharray={`${arc.dash} ${arc.gap}`}
					strokeLinecap={gapDeg > 0 || (arc.dash > 0 && arc.dash < circumference) ? "butt" : "round"}
					transform={`rotate(${arc.rotation} ${center} ${center})`}
				/>
			))}
		</svg>
	);
}
