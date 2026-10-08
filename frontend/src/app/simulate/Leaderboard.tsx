import { useState } from "react";
import { col } from "@/app/FitCanvas";
import { leaderboard } from "./data";
import { BackHeader, FilterChip, PageTitle } from "./ui";

/** 2:920 "Desktop · Leaderboard". */
export function Leaderboard() {
	const [chip, setChip] = useState(0);
	const d = leaderboard;
	return (
		<div className="flex flex-col items-start gap-[24px]" style={{ width: col(956) }}>
			<BackHeader crumb={d.crumb} to="/simulate" />
			<div className="flex w-full flex-col items-start gap-[28px]">
				<div className="flex w-[195px] flex-col items-start gap-[22px]">
					<PageTitle title={d.title} subtitle={d.subtitle} />
					<div className="flex items-start gap-[8px] overflow-clip">
						{d.chips.map((label, i) => (
							<FilterChip key={label} active={chip === i} onClick={() => setChip(i)}>
								{label}
							</FilterChip>
						))}
					</div>
				</div>
				<section className="flex w-full flex-col items-start gap-[12px] overflow-clip rounded-[16px] bg-[#181f30] px-[20px] py-[12px]">
					{d.rows.map(([rank, name, pct]) => (
						<div key={rank} className="flex h-[44px] w-full items-center justify-between overflow-clip whitespace-nowrap">
							<div className="flex items-center gap-[14px] overflow-clip">
								<p className="font-sora text-[14px] font-semibold leading-[18px] text-[#819abb]">{rank}</p>
								<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{name}</p>
							</div>
							<p className="font-geist text-[13px] font-medium leading-[17px] text-[#2fd08a]">{pct}</p>
						</div>
					))}
					<div className="h-px w-full bg-[rgba(255,255,255,0.06)]" />
					<div className="flex h-[44px] w-full items-center justify-between overflow-clip rounded-[10px] bg-[rgba(93,168,191,0.07)] px-[12px] whitespace-nowrap">
						<div className="flex items-center gap-[14px] overflow-clip text-[#a6e4f7]">
							<p className="font-sora text-[14px] font-semibold leading-[18px]">{d.you[0]}</p>
							<p className="font-geist text-[13px] font-medium leading-[17px]">{d.you[1]}</p>
						</div>
						<p className="font-geist text-[13px] font-medium leading-[17px] text-[#2fd08a]">{d.you[2]}</p>
					</div>
				</section>
			</div>
		</div>
	);
}
