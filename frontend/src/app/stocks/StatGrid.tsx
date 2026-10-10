import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { StockStat } from "./data";

/**
 * "Stat grid" + its footer line of the Numbers-that-matter card (Figma 2:3503 / 2:6351). The frames
 * carry a hidden second line, "Benchmarks: P/E sector 28.0x · peers 33.5x. …" (2:3516 / 2:6364),
 * that the footer promises: tapping a stat shows it in place of the footer, tapping again hides it.
 * Without benchmark figures the tiles are plain and the footer stays.
 */
export function StatGrid({ stats, footer, benchmarks, inner }: { stats: StockStat[]; footer: string; benchmarks?: string; inner: string }) {
	const [open, setOpen] = useState(false);
	const id = useId();
	const revealed = open && !!benchmarks;
	const tile = (st: StockStat) =>
		cn("flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip rounded-[12px] p-[10px]", st.outlined && "shadow-[inset_0_0_0_1px_#212d4b]");
	const body = (st: StockStat) => (
		<>
			<span className="block font-geist text-[10px] leading-[13px] text-[#819abb]">{st.label}</span>
			<span className="block font-sora text-[17px] font-semibold leading-[21px] text-[#f2f6fc]">{st.value}</span>
			<span className={cn("block font-geist text-[10px] font-medium leading-[13px]", st.good ? "text-[#2fd08a]" : "text-[#819abb]")}>{st.note}</span>
		</>
	);
	return (
		<>
			<div className="flex w-full items-start gap-[8px] overflow-clip">
				{stats.map((st) =>
					benchmarks ? (
						<button
							key={st.label}
							type="button"
							aria-expanded={revealed}
							aria-controls={id}
							onClick={() => setOpen((o) => !o)}
							className={cn(tile(st), "stak-press cursor-pointer text-left")}
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
			<p hidden={revealed} className="font-geist text-[10px] leading-[13px] text-[#819abb]">
				{footer}
			</p>
			{benchmarks && (
				<p id={id} hidden={!revealed} className="w-[45.787%] whitespace-normal font-geist text-[10px] leading-[13px] text-[#819abb]">
					{benchmarks}
				</p>
			)}
		</>
	);
}
