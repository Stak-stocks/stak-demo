import { A } from "./assets";
import { viewportHeight } from "./FitCanvas";

/** Skeleton bar (#223050) used by the loading frames of section 10. */
export function Bar({ w, h, r = 6, className }: { w: number; h: number; r?: number; className?: string }) {
	return <div className={className} style={{ width: w, height: h, borderRadius: r, backgroundColor: "#223050" }} />;
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

/** Figma "Desktop Sidebar · Nav (locked)" as drawn in the loading frames (2:1992, 2:2114, 2:2306). */
export function SidebarSkeleton({ active = "home" }: { active?: "home" | "discover" }) {
	return (
		<aside className="sticky top-0 w-[216px] shrink-0 overflow-clip bg-[#080d1a]" style={{ height: viewportHeight() }} aria-busy="true" data-nav="skeleton">
			<Bar w={74} h={14} r={7} className="absolute left-[26.96px] top-[36.89px]" />
			{ROWS[active].map((row, i) => (
				<div
					key={`${active}-${i}`}
					className="absolute left-[16px] flex h-[40px] w-[184px] items-center gap-[12px] overflow-clip rounded-[10px] px-[12px]"
					style={{ top: 92 + i * 48, backgroundColor: row.active ? "rgba(255,255,255,0.06)" : undefined }}
				>
					<Bar w={20} h={20} r={6} className="shrink-0" />
					<Bar w={row.w} h={row.h} r={row.r} className="shrink-0" />
				</div>
			))}
			<div className="absolute bottom-[27px] left-0 flex w-[216px] flex-col items-center gap-[25px]">
				<div className="h-px w-full bg-[rgba(95,100,113,0.27)]" />
				<div className="flex h-[48px] w-[184px] items-center gap-[12px] overflow-clip rounded-[10px] bg-[#141b2c] px-[12px]">
					<div className="size-[28px] shrink-0 rounded-[14px] bg-[#223050]" />
					<div className="flex min-w-px flex-1 flex-col items-start gap-px overflow-clip">
						<Bar w={34} h={8} r={4} />
						<Bar w={74} h={8} r={4} />
					</div>
					<img alt="" src={A.settingsDim} className="size-[17px] shrink-0" />
				</div>
			</div>
		</aside>
	);
}
