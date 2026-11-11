import { useMemo } from "react";
import { type AllocationLineRow, RING, ringSegments } from "./allocation";

/**
 * The Breakdown card's ring for every state but the untouched showcase (which keeps Figma's own 2:4686 "Segments"
 * file): one arc per allocation row, sized by its share, in the row's colour, clockwise from 12 o'clock, a 2px gap
 * between arcs (./allocation.ts ringSegments). Drawn in the frame's 150 x 150 "Donut" box (2:4685), so it sits exactly
 * where the frame's donut sits at every size. Decorative: the rows below it say the same in words (the frame's donut
 * is an unlabelled <img alt=""> too).
 */
export function AllocationRing({ rows }: { rows: readonly Pick<AllocationLineRow, "key" | "color" | "fill">[] }) {
	const segments = useMemo(() => ringSegments(rows), [rows]);
	const half = RING.size / 2;
	return (
		<svg
			aria-hidden="true"
			data-mystak-ring=""
			className="block size-[150px] shrink-0"
			width={RING.size}
			height={RING.size}
			viewBox={`${-half} ${-half} ${RING.size} ${RING.size}`}
			fill="none"
		>
			{segments.map((s) => (
				<path key={s.key} d={s.d} fill={s.color} fillRule="evenodd" />
			))}
		</svg>
	);
}
