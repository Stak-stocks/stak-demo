import { A } from "./assets";
import { FigmaFile, NavRule, RailPin } from "./Sidebar";

const SKELETON = "#223050";

/** Skeleton bar (#223050) used by the loading frames of section 10. */
export function Bar({ w, h, r = 6, className }: { w: number; h: number; r?: number; className?: string }) {
	return <div className={className} style={{ width: w, height: h, borderRadius: r, backgroundColor: SKELETON }} />;
}

/**
 * A skeleton bar Figma places off the pixel grid (the 9px label bars at y 15.5 of their 40px rows, the logo bar at
 * 26.9618 / 36.887, the account bars at 15.5 / 24.5). Figma paints such a bar's edges over the two pixel rows it
 * straddles at partial coverage (the News bar: rows 155 and 164 at half strength, 156-163 solid); a CSS box is snapped
 * to whole pixels and lands half a pixel lower, crisp. The same rounded rectangle as an SVG rect, in a whole-pixel box
 * with the fraction moved inside it, is anti-aliased over Figma's rows. x / y are the bar's position in its parent.
 */
function SubpixelBar({ x, y, w, h, r }: { x: number; y: number; w: number; h: number; r: number }) {
	const left = Math.floor(x);
	const top = Math.floor(y);
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			width={Math.ceil(x + w) - left}
			height={Math.ceil(y + h) - top}
			className="pointer-events-none absolute block"
			style={{ left, top }}
		>
			<rect x={x - left} y={y - top} width={w} height={h} rx={r} fill={SKELETON} />
		</svg>
	);
}

type Row = { w: number; h: number; r: number; active?: boolean };

/** Nav rows as drawn per frame: Home active (2:1991) or Discover active (2:2113, 2:2305). */
const ROWS: Record<"home" | "discover", Row[]> = {
	home: [
		{ w: 32, h: 12, r: 6, active: true },
		{ w: 25, h: 9, r: 4.5 },
		{ w: 38, h: 9, r: 4.5 },
		{ w: 39, h: 9, r: 4.5 },
		{ w: 39, h: 9, r: 4.5 },
	],
	discover: [
		{ w: 26, h: 9, r: 4.5 },
		{ w: 25, h: 9, r: 4.5 },
		{ w: 49, h: 12, r: 6, active: true },
		{ w: 39, h: 9, r: 4.5 },
		{ w: 39, h: 9, r: 4.5 },
	],
};

/**
 * Figma "Desktop Sidebar · Nav (locked)" as drawn in the loading frames (2:1992, 2:2114, 2:2306): the rows are Figma's
 * auto layout (184x40, padding 12, gap 12, items centred), placed at the positions it computes: the 20px icon bar at
 * (12, 10), the label bar at x 44 and y (40 - h) / 2 (14 for the 12px active bar, 15.5 for the 9px ones). Like the live
 * rail it runs the page's full height and its pieces stay in the window while the page scrolls (RailPin, the ruling of
 * 2026-10-30), the bottom group on the window's bottom.
 */
export function SidebarSkeleton({ active = "home" }: { active?: "home" | "discover" }) {
	return (
		<aside className="relative z-30 w-[216px] shrink-0 self-stretch overflow-clip bg-[#080d1a]" aria-busy="true" data-nav="skeleton">
			<RailPin>
				{/* "Rectangle" 2:1993 / 2:2130 / 2:2322: 74x14, radius 7, at (26.9618, 36.887) */}
				<SubpixelBar x={26.9617919921875} y={36.88700866699219} w={74} h={14} r={7} />
				{ROWS[active].map((row, i) => (
					<div
						key={`${active}-${i}`}
						className="absolute left-[16px] h-[40px] w-[184px] overflow-clip rounded-[10px]"
						style={{ top: 92 + i * 48, backgroundColor: row.active ? "rgba(255,255,255,0.06)" : undefined }}
					>
						<Bar w={20} h={20} r={6} className="absolute left-[12px] top-[10px]" />
						<SubpixelBar x={44} y={(40 - row.h) / 2} w={row.w} h={row.h} r={row.r} />
					</div>
				))}
				{/* "Frame 1618869266" (constraint MAX): "Vector 87" 2:2010 at 1024 - 100, drawn like the live rail's, and the
				    skeleton account row 25 below it: 184x48 #141B2C radius 10, padding 12, gap 12, items centred */}
				<NavRule />
				<div className="absolute bottom-[27px] left-[16px] h-[48px] w-[184px] overflow-clip rounded-[10px] bg-[#141b2c]">
					{/* "Frame" 2:2012: the 28px #223050 circle at (12, 10) */}
					<div className="absolute left-[12px] top-[10px] size-[28px] rounded-[14px] bg-[#223050]" />
					{/* "Frame" 2:2014 (91x17 at 52, 15.5; gap 1): 34x8 and 74x8 bars, radius 4 */}
					<SubpixelBar x={52} y={15.5} w={34} h={8} r={4} />
					<SubpixelBar x={52} y={24.5} w={74} h={8} r={4} />
					{/* "settings" 2:2017 (frame and paths at 30% each) at (155, 15.5): Figma's file at its sub-pixel row */}
					<FigmaFile src={A.settingsDim} width={17} height={17} y={0.5} className="absolute left-[155px] top-[15px]" />
				</div>
			</RailPin>
		</aside>
	);
}
