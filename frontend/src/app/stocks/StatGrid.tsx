import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { StockStat } from "./data";

/** The footer while the benchmarks show: which stat hides them again (I-06). */
export const hideHint = (label: string) => `Tap ${label} again to hide the benchmarks`;

/**
 * "Stat grid" + its footer line of the Numbers-that-matter card (Figma 2:3503 / 2:6351). The frames
 * carry a hidden line, "Benchmarks: P/E sector 28.0x · peers 33.5x. …" (2:3516 / 2:6364: Geist 10
 * #819abb, a fixed 326 box that wraps), stacked between the grid and the footer it is promised by:
 * tapping a stat shows it there, above the footer. Without benchmark figures the tiles are plain, and the
 * footer is not drawn: "Tap a stat for sector and peer benchmarks" over tiles that open nothing was a promise
 * the card could not keep (the independent review r2b, low 6: Virgin Galactic, the one catalog company with no
 * sector and no peer that states a figure); the card then ends on its tiles.
 *
 * The three tiles are ONE disclosure of that one line, and say so (the hunt's I-06, coordinator ruling N27s: pressing a
 * second stat closed what the footer had just promised, "Tap a stat for sector and peer benchmarks"): each tile is a
 * button on the same panel (aria-controls, aria-expanded together), the row is a group named for what the tiles open,
 * and the line stays open while the person moves from stat to stat. Only a second press of the tile pressed last hides
 * it, and while it shows the footer names that tile ("Tap P/E ratio again to hide the benchmarks": each tile's
 * description too). At rest the row, the tiles and the footer are the frames', pixel for pixel.
 */
export function StatGrid({ stats, footer, benchmarks, inner }: { stats: StockStat[]; footer: string; benchmarks?: string; inner: string }) {
	// the label of the tile that opened the line (pressed last); null while it is hidden
	const [openBy, setOpenBy] = useState<string | null>(null);
	const id = useId();
	const hintId = useId();
	const revealed = openBy !== null && !!benchmarks && stats.some((st) => st.label === openBy);
	// the three tiles keep their row at every width (SPEC R7); on a phone narrower than 390 a label such as
	// "Revenue growth" takes a second line inside its tile instead of being cut (the card sets whitespace-nowrap). Below
	// 640 the row is a grid of three columns and three rows (label, figure, note) and every tile a subgrid of those rows,
	// so a label that wraps makes the LABEL ROW of all three tiles two lines tall and the figures stay one aligned row
	// (R7: the figures read as one row), the notes another; the tiles keep their 10 padding and 4 gaps, bottoms level as
	// Figma's 232 x 75 tiles are (2:3504 / 2:3508 / 2:3512). Where every label fits on one line (390 and up) the grid lays
	// the tiles out exactly as the flex row does; at 1024 and up the row is the approved flex row
	const tile = (st: StockStat) =>
		cn(
			"flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip rounded-[12px] p-[10px] max-sm:grid max-sm:row-span-3 max-sm:grid-rows-subgrid",
			st.outlined && "shadow-[inset_0_0_0_1px_#212d4b]",
		);
	const body = (st: StockStat) => (
		<>
			<span className="block font-geist text-[10px] leading-[13px] text-[#819abb] max-sm:whitespace-normal">{st.label}</span>
			<span className="block font-sora text-[17px] font-semibold leading-[21px] text-[#f2f6fc]">{st.value}</span>
			<span className={cn("block font-geist text-[10px] font-medium leading-[13px] max-sm:whitespace-normal", st.good ? "text-[#2fd08a]" : "text-[#819abb]")}>{st.note}</span>
		</>
	);
	return (
		<>
			<div
				role={benchmarks ? "group" : undefined}
				aria-label={benchmarks ? "Stats: each one shows the sector and peer benchmarks" : undefined}
				className="flex w-full items-start gap-[8px] overflow-clip [&:has(:focus-visible)]:[overflow-clip-margin:4px] max-lg:items-stretch max-sm:grid max-sm:grid-cols-3 max-sm:grid-rows-[auto_auto_auto] max-sm:gap-x-[8px] max-sm:gap-y-[4px]"
			>
				{stats.map((st) =>
					benchmarks ? (
						<button
							key={st.label}
							type="button"
							aria-expanded={revealed}
							aria-controls={id}
							aria-describedby={hintId}
							// another stat keeps the line open and becomes the one whose second press hides it
							onClick={() => setOpenBy((by) => (by === st.label ? null : st.label))}
							// a plain frame in Figma (no variant, no hover / pressed state, no reaction): the cursor and the canvas's
							// keyboard focus ring are its only responses
							className={cn(tile(st), "cursor-pointer text-left")}
							style={{ background: inner }}
						>
							{body(st)}
						</button>
					) : (
						<div key={st.label} className={tile(st)} style={{ background: inner }}>
							{body(st)}
						</div>
					),
				)}
			</div>
			{benchmarks && (
				// the frames' fixed 326 box; below 1024 the card's width, never wider than Figma's (R3)
				<p id={id} hidden={!revealed} className="w-[45.787%] whitespace-normal font-geist text-[10px] leading-[13px] text-[#819abb] max-lg:w-full max-lg:max-w-[326px]">
					{benchmarks}
				</p>
			)}
			{benchmarks && (
				<p id={hintId} className="font-geist text-[10px] leading-[13px] text-[#819abb] max-lg:whitespace-normal">
					{revealed && openBy ? hideHint(openBy) : footer}
				</p>
			)}
		</>
	);
}
