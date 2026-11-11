import { useState } from "react";
import { col, useSizeClass } from "@/app/FitCanvas";
import { type BoardPeriod, signedPctOrZero, type Tone, toneOf, useShowcase, useStanding } from "@/app/live";
import { cn } from "@/lib/utils";
import { leaderboard } from "./data";
import { popBack, useSimulateBack } from "./back";
import { pageRows, toneColor } from "./figures";
import { InstantBack } from "./PickDetail";
import { BackHeader, FilterChip, PageTitle } from "./ui";

/**
 * Figma's auto-width text boxes are whole pixels wide (the rank "#4" is 20, "+6.5%" 38); Chrome's are fractional, so a
 * name after a rank, or a figure set against the right edge, drifted up to a pixel. This rounds the box up the same way.
 */
const WHOLE_PX = "w-[calc-size(max-content,round(up,size,1px))]";

/**
 * The frame's own boxes for the frame's own strings (2:941 … 2:969), by string: the ranks (Sora SemiBold 14), whose
 * width sets where each name starts, and the figures (Geist Medium 13), which start at the row's right edge minus their
 * box. Rounding Chrome's widths up still left "+6.5%" and "+1.9%" a pixel right (Chrome sets them 36.8 and 33.8 wide,
 * Figma's boxes are 38 and 35). Any other string (another place, the All time figures) takes its run rounded up.
 */
const RANK_BOX: Readonly<Record<string, number>> = { "#1": 16, "#2": 19, "#3": 19, "#4": 20, "#5": 19, "#47": 28 };
const FIGURE_BOX: Readonly<Record<string, number>> = { "+9.4%": 37, "+7.8%": 35, "+6.5%": 38, "+5.2%": 38, "+4.1%": 34, "+1.9%": 35 };

/** A rank before the first trade: unranked, as both phones show a new account (android LeaderboardScreen.kt:128). */
const UNRANKED = "—";

/** Back: the page before (Simulate home, the Profile hub ...), else Simulate home (D2; the phones pop, StakNavHost.kt:657). */
const leaderboardBack = (prev: URL | null) => popBack(prev, "/simulate");

const GREEN = "#2fd08a";
const RED = "#ff5a6a";
/** A return's colour by its tone: the frame's green, the app's red, the label grey for a return that prints "0.0%" (N23h). */
const figureColor = (tone: Tone) => toneColor(tone, { up: GREEN, down: RED });

/** A text at its Figma box when the frame authors the string, else its run rounded up. */
const boxed = (boxes: Readonly<Record<string, number>>, text: string) =>
	boxes[text] === undefined ? { className: WHOLE_PX, style: undefined } : { className: undefined, style: { width: boxes[text] } };

/** One leader's row (2:941 …): the place, the name, the period's return. */
function LeaderRow({ rank, name, figure, tone }: { rank: string; name: string; figure: string; tone: Tone }) {
	const r = boxed(RANK_BOX, rank);
	const f = boxed(FIGURE_BOX, figure);
	return (
		<div className="sim-leader-row flex h-[44px] w-full items-center justify-between overflow-clip whitespace-nowrap">
			<div className="flex items-center gap-[14px] overflow-clip">
				<p className={cn(r.className, "font-sora text-[14px] font-semibold leading-[18px] text-[#819abb]")} style={r.style}>
					{rank}
				</p>
				<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{name}</p>
			</div>
			<p className={cn(f.className, "font-geist text-[13px] font-medium leading-[17px]")} style={{ color: figureColor(tone), ...f.style }}>
				{figure}
			</p>
		</div>
	);
}

/** You's row (2:965): the highlighted row, under the rule or, when You beats a leader, at its place in the list. */
function YouRow({ rank, label, figure, tone }: { rank: string; label: string; figure: string; tone: Tone }) {
	const r = boxed(RANK_BOX, rank);
	const f = boxed(FIGURE_BOX, figure);
	return (
		<div className="sim-leader-row flex h-[44px] w-full items-center justify-between overflow-clip rounded-[10px] bg-[rgba(93,168,191,0.07)] px-[12px] whitespace-nowrap">
			<div className="flex items-center gap-[14px] overflow-clip text-[#a6e4f7]">
				<p className={cn(r.className, "font-sora text-[14px] font-semibold leading-[18px]")} style={r.style}>
					{rank}
				</p>
				<p className="font-geist text-[13px] font-medium leading-[17px]">{label}</p>
			</div>
			<p className={cn(f.className, "font-geist text-[13px] font-medium leading-[17px]")} style={{ color: figureColor(tone), ...f.style }}>
				{figure}
			</p>
		</div>
	);
}

type Line = { key: string; you: boolean; rank: string; name: string; figure: string; tone: Tone };

/**
 * 2:920 "Desktop · Leaderboard": the five demo leaders and You, on one board with Simulate home's hero and card and the
 * Profile hub (coordinator decision D4: live/rank.ts useStanding). "This week" is the frame (Ranked by return ·
 * Trailing 7 days: You's trailing-week return); "All time" re-ranks every player by all-time return (the leaders'
 * all-time figures are the board's demo ones; You's is the account's all-time result, the showcase's +2.4% = its
 * "+$240.00 all time"). The rank follows the return; when You beats a leader, You's row (keeping its highlight) takes
 * its place in the list and the leaders below move down one (#5 You, #6 Ivy C.): every place once. Before the first
 * trade You is unranked ("—"), as on both phones. The untouched showcase's week view is the frame's own rows (D7; the
 * computed week prints the same: #47 You +1.9%).
 */
export function Leaderboard() {
	const [chip, setChip] = useState(0);
	const d = leaderboard;
	const allTime = chip === 1;
	const period: BoardPeriod = allTime ? "allTime" : "week";
	const standing = useStanding();
	const back = useSimulateBack(leaderboardBack);
	/** the untouched demo persona shows the frame's own rows on the week view (live/showcase.ts) */
	const showcase = useShowcase() && !allTime;
	// "Ranked by return · Trailing 7 days" names the period; the All time chip names its own
	const subtitle = allTime ? `${d.subtitle.split(" · ")[0]} · ${d.chips[1]}` : d.subtitle;
	// below 1024 the sections take the phone frame's order (SPEC R2): "Final · Leaderboard" 1:4510 draws the You card
	// (1:4541) before the ranked rows (1:4551 …), where the desktop card ends with the You row under its rule
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";

	let list: Line[];
	let apart: Line | null;
	if (showcase) {
		list = d.rows.map(([rank, name, figure]) => ({ key: name, you: false, rank, name, figure, tone: "up" as const }));
		apart = { key: "you", you: true, rank: d.you[0], name: d.you[1], figure: d.you[2], tone: "up" };
	} else {
		const board = pageRows(standing.board(period));
		const youFigure = allTime ? standing.allTime.pct : standing.week.pct;
		// zero is neutral (N23h): a return that prints "0.0%" has no plus sign and takes the label grey ("— You +0.0%" and
		// "#142 You +0.0%" were drawn in the gain's green)
		const figure = (pct: number) => ({ figure: signedPctOrZero(pct), tone: toneOf(pct, 1) });
		list = board.rows.map((r) => ({ key: r.id, you: r.you, rank: `#${r.rank}`, name: r.you ? d.you[1] : r.name, ...figure(r.returnPct) }));
		apart = board.apart
			? { key: "you", you: true, rank: `#${board.apart.rank}`, name: d.you[1], ...figure(board.apart.returnPct) }
			: standing.ranked
				? null
				: { key: "you", you: true, rank: UNRANKED, name: d.you[1], ...figure(youFigure) };
	}
	const row = (l: Line) =>
		l.you ? <YouRow key={l.key} rank={l.rank} label={l.name} figure={l.figure} tone={l.tone} /> : <LeaderRow key={l.key} rank={l.rank} name={l.name} figure={l.figure} tone={l.tone} />;
	const rule = <div className="h-px w-full bg-[rgba(255,255,255,0.06)]" />;
	return (
		<div className="sim-responsive flex flex-col items-start gap-[24px]" style={{ width: col(956), minHeight: 1004 }}>
			{/* Back (phone 1:4526, INSTANT): the page the Leaderboard was opened from, else Simulate home (D2, back.ts) */}
			<InstantBack onBack={back}>
				<BackHeader crumbs={d.crumbs} to="/simulate" />
			</InstantBack>
			<div className="flex w-full flex-col items-start gap-[28px]">
				<div className="flex w-[195px] flex-col items-start gap-[22px] max-lg:w-full">
					<PageTitle title={d.title} subtitle={subtitle} />
					{/* Figma clips the chip row (2:933); the clip lets the keyboard focus ring (2px + 2px offset) show */}
					<div className="flex items-start gap-[8px] overflow-clip [overflow-clip-margin:4px]">
						{d.chips.map((label, i) => (
							<FilterChip key={label} width={[85, 72][i]} active={chip === i} onClick={() => setChip(i)}>
								{label}
							</FilterChip>
						))}
					</div>
				</div>
				<section className="flex w-full flex-col items-start gap-[12px] overflow-clip rounded-[16px] bg-[#181f30] px-[20px] py-[12px]">
					{/* the ranked list, the rule, then You (2:941 … 2:969); below 1024 You first, then the rule and the list: the phone
					    frame's order, in the DOM as the eye sees it (R10 ruling); from 1024 the tree is the approved one. When You is
					    in the list it is drawn there, in place, with no separate row */}
					{apart && compact ? (
						<>
							{row(apart)}
							{rule}
							{list.map(row)}
						</>
					) : (
						<>
							{list.map(row)}
							{apart && rule}
							{apart && row(apart)}
						</>
					)}
				</section>
			</div>
		</div>
	);
}
