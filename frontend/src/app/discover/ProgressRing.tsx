/** "Ring" 2:2951 at 1x: a 52.8 frame, the track circle r 21.6 with a 4.8 stroke. */
const SIZE = 52.8;
const R = 21.6;
const STROKE = 4.8;
const TRACK = "#2A3346";
const ARC = "#69B3CA";

type Props = {
	/** 1 on the deck (2:2951, 52.8), 1.5 on the receipt (the "Completion ring" 2:3425 is the same ring at 79.2, 7.2 stroke) */
	scale: 1 | 1.5;
	/** the arc's share of the ring: `value` of `total` */
	value: number;
	total: number;
	/** Figma's own export of this exact state, when the file draws it (the deck's 1/12, the receipt's 12/12) */
	file?: string;
};

/**
 * The progress ring's art (the label is the caller's). Figma draws two states of it: the deck's 1/12 (2:2952, the
 * #2A3346 track and a 30° #69B3CA round-capped arc from the top) and the receipt's 12/12 (2:3426, the full arc), and
 * those render as Figma's exports. Every other count is progress Figma has no frame for, so it is plotted with the
 * same geometry, colours and caps, the arc at value / total of the circle from the top, clockwise.
 */
export function ProgressRing({ scale, value, total, file }: Props) {
	const s = SIZE * scale;
	if (file) return <img alt="" src={file} className="absolute left-0 top-0 block max-w-none" style={{ width: s, height: s }} />;
	const c = s / 2;
	const r = R * scale;
	const length = 2 * Math.PI * r;
	const share = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
	return (
		<svg aria-hidden="true" viewBox={`0 0 ${s} ${s}`} fill="none" className="absolute left-0 top-0 block" style={{ width: s, height: s }}>
			<circle cx={c} cy={c} r={r} stroke={TRACK} strokeWidth={STROKE * scale} />
			{share > 0 && (
				<circle
					cx={c}
					cy={c}
					r={r}
					stroke={ARC}
					strokeWidth={STROKE * scale}
					strokeLinecap="round"
					strokeDasharray={`${share * length} ${length}`}
					transform={`rotate(-90 ${c} ${c})`}
				/>
			)}
		</svg>
	);
}
