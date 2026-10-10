import { useState } from "react";
import { col } from "@/app/FitCanvas";
import { rankFor, signedPct, usePortfolio, useShowcase } from "@/app/live";
import { leaderboard } from "./data";
import { BackHeader, FilterChip, PageTitle } from "./ui";

/** 2:920 "Desktop · Leaderboard": the five demo leaders and your own row, this week (today's move) or all time. */
export function Leaderboard() {
	const [chip, setChip] = useState(0);
	const pf = usePortfolio();
	const d = leaderboard;
	/** the untouched demo persona shows the frame's own row (#47 You +1.9%) on the week view (live/showcase.ts) */
	const showcase = useShowcase() && chip === 0;
	const youPct = chip === 0 ? pf.todayPct : pf.allTimePct;
	const rank = rankFor(youPct);
	return (
		<div className="flex flex-col items-start gap-[24px]" style={{ width: col(956) }}>
			<BackHeader crumb={d.crumb} to="/simulate" />
			<div className="flex w-full flex-col items-start gap-[28px]">
				<div className="flex w-[195px] flex-col items-start gap-[22px]">
					<PageTitle title={d.title} subtitle={d.subtitle} />
					<div className="flex items-start gap-[8px] overflow-clip">
						{d.chips.map((label, i) => (
							<FilterChip key={label} width={[85, 72][i]} active={chip === i} onClick={() => setChip(i)}>
								{label}
							</FilterChip>
						))}
					</div>
				</div>
				<section className="flex w-full flex-col items-start gap-[12px] overflow-clip rounded-[16px] bg-[#181f30] px-[20px] py-[12px]">
					{d.rows.map(([position, name, pct]) => (
						<div key={position} className="flex h-[44px] w-full items-center justify-between overflow-clip whitespace-nowrap">
							<div className="flex items-center gap-[14px] overflow-clip">
								<p className="font-sora text-[14px] font-semibold leading-[18px] text-[#819abb]">{position}</p>
								<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{name}</p>
							</div>
							<p className="font-geist text-[13px] font-medium leading-[17px] text-[#2fd08a]">{pct}</p>
						</div>
					))}
					<div className="h-px w-full bg-[rgba(255,255,255,0.06)]" />
					<div className="flex h-[44px] w-full items-center justify-between overflow-clip rounded-[10px] bg-[rgba(93,168,191,0.07)] px-[12px] whitespace-nowrap">
						<div className="flex items-center gap-[14px] overflow-clip text-[#a6e4f7]">
							<p className="font-sora text-[14px] font-semibold leading-[18px]">{showcase ? d.you[0] : `#${rank}`}</p>
							<p className="font-geist text-[13px] font-medium leading-[17px]">{d.you[1]}</p>
						</div>
						<p className="font-geist text-[13px] font-medium leading-[17px]" style={{ color: showcase || youPct >= 0 ? "#2fd08a" : "#ff5a6a" }}>
							{showcase ? d.you[2] : signedPct(youPct)}
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}
