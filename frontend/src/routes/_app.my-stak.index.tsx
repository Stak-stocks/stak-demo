import { createFileRoute, Link } from "@tanstack/react-router";
import { A } from "@/app/assets";
import { PRIMARY_GRADIENT } from "@/app/auth/ui";
import { col } from "@/app/FitCanvas";
import { type AllocationRow, type CollectionGroup, countLabel, useCollections } from "@/app/live/collections";
import { useDeck } from "@/app/live/deck";
import { signedPct } from "@/app/live/format";
import { MS } from "@/app/mystak/assets";
import { ALLOCATION_DOTS, COLLECTION_ICONS, DISCOVER_CTA, EMPTY, INSIGHT_HEADING, OVERVIEW, PERFORMANCE } from "@/app/mystak/data";
import { GradientButton } from "@/app/simulate/ui";
import { cn } from "@/lib/utils";

type MyStakSearch = { state?: "empty" };

export const Route = createFileRoute("/_app/my-stak/")({
	validateSearch: (search: Record<string, unknown>): MyStakSearch => ({
		state: search.state === "empty" ? "empty" : undefined,
	}),
	component: MyStakPage,
});

const GREEN = "text-[#2fd08a]";
const RED = "text-[#ff5a6a]";

function Header() {
	return (
		<div className="flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
			<h1 className="font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{OVERVIEW.title}</h1>
			<p className="font-geist text-[13px] leading-[17px] text-[#819abb]">{OVERVIEW.subtitle}</p>
		</div>
	);
}

/** Figma 2:1830 "Desktop · My STAK · Empty" (10 States): the header, then a 640px stage with the empty-box block. */
function MyStakEmpty({ remaining }: { remaining: number }) {
	return (
		<div className="flex flex-col items-start gap-[38px]" style={{ width: col(932) }}>
			<Header />
			<div className="flex h-[640px] w-full flex-col items-center justify-center overflow-clip">
				<div className="flex flex-col items-center overflow-clip">
					<div className="relative h-[151px] w-[121.143px]">
						<img alt="" src={A.emptyBox} className="absolute left-[-5.26px] top-0 block h-[165.355px] w-[135.091px] max-w-none" />
					</div>
					<div className="h-[28px] w-[10px]" />
					<p className="whitespace-nowrap text-center font-sora text-[26px] font-semibold leading-[33px] text-white">{EMPTY.title}</p>
					<div className="size-[10px]" />
					<p className="w-[460px] text-center font-geist text-[15px] leading-[22px] text-[#819abb]">{EMPTY.body}</p>
					<div className="h-[28px] w-[10px]" />
					<Link to="/discover" className="stak-press block w-[240px] cursor-pointer rounded-[6px]">
						<GradientButton>{EMPTY.cta}</GradientButton>
					</Link>
					<div className="h-[14px] w-[10px]" />
					<p className="whitespace-nowrap text-center font-geist text-[13px] leading-[17px] text-[#819abb]">{EMPTY.caption(remaining)}</p>
				</div>
			</div>
		</div>
	);
}

/**
 * Figma 2:4667 "Desktop · My STAK Overview · synced" (1440x1096): 547px main column + 350px rail.
 * Everything on it is read from the saves: the collections and their counts, today's move across
 * them, the best and worst movers, the allocation and the "Your read" insight.
 */
function MyStakPage() {
	const { state } = Route.useSearch();
	const c = useCollections();
	const deck = useDeck();
	const remaining = Math.max(0, deck.total - deck.decided.size);
	if (state === "empty" || c.total === 0) return <MyStakEmpty remaining={remaining} />;
	const rows: CollectionGroup[][] = [];
	for (let i = 0; i < c.visible.length; i += 2) rows.push(c.visible.slice(i, i + 2));
	return (
		<div className="flex flex-col items-start gap-[38px]" style={{ width: col(932) }}>
			<Header />
			<div className="flex w-full items-start gap-[35px]">
				<div className="flex min-w-0 flex-col items-start gap-[20px]" style={{ flex: "547 1 0" }}>
					<div className="flex w-full flex-col items-end gap-[20px]">
						<div className="flex w-full flex-col items-start gap-[13px]">
							<SectionHeader title={OVERVIEW.collections} size="sm" />
							<div className="flex w-full flex-col items-start gap-[16px] overflow-clip">
								{rows.map((row) => (
									<div key={row[0]!.slug} className="flex w-full items-start gap-[16px] overflow-clip">
										{row.map((g) => (
											<CollectionCard key={g.slug} group={g} />
										))}
										{row.length === 1 && <div className="min-w-px flex-1" aria-hidden="true" />}
									</div>
								))}
							</div>
						</div>
						<PerformanceCard total={c.total} avgChange={c.avgChange} best={c.best} worst={c.worst} />
					</div>
					{c.insight && (
						<div className="flex w-full flex-col items-start gap-[7px] overflow-clip rounded-[14px] bg-[#181f30] p-[16px]">
							<div className="flex items-center gap-[8px] overflow-clip">
								<img alt="" src={MS.sparkle} className="size-[24px]" />
								<span className="whitespace-nowrap font-sora text-[14px] font-semibold leading-[18px] text-white">{INSIGHT_HEADING}</span>
							</div>
							<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-white">{c.insight.title}</p>
							<p className="w-full font-geist text-[13px] leading-[19px] text-[#c8d2e0]">{c.insight.body}</p>
						</div>
					)}
				</div>

				<div className="mt-[33px] flex min-w-0 flex-col items-end gap-[31px]" style={{ flex: "350 1 0" }}>
					<Link
						to="/discover"
						className="stak-press flex h-[52px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[6px] border-[0.361px] border-solid border-[rgba(101,158,173,0.63)] drop-shadow-[0px_77.322px_10.839px_rgba(82,170,199,0),0px_49.862px_9.756px_rgba(82,170,199,0.01),0px_28.183px_8.31px_rgba(82,170,199,0.03)]"
						style={{ backgroundImage: PRIMARY_GRADIENT }}
					>
						<span className="whitespace-nowrap font-geist text-[14px] font-medium leading-[20.69px] text-white">{OVERVIEW.addMore}</span>
						<img alt="" src={MS.plus} className="size-[14px]" />
					</Link>
					<div className="flex w-full flex-col items-start gap-[14px]">
						<SectionHeader title={OVERVIEW.breakdown} size="md" />
						<div className="flex w-full flex-col items-center gap-[16px] overflow-clip rounded-[16px] bg-[#181f30] p-[18px]">
							<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-white">{OVERVIEW.allocation}</p>
							<img alt="" src={MS.donut} className="size-[150px]" />
							<div className="flex w-full flex-col items-start gap-[12px] overflow-clip">
								{c.allocation.map((row) => (
									<AllocationLine key={row.key} row={row} />
								))}
							</div>
						</div>
					</div>
					<Link
						to="/discover"
						className="stak-press flex w-full cursor-pointer flex-col items-start gap-[9px] overflow-clip rounded-[16px] bg-[#69b3ca] p-[18px]"
					>
						<span className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.6px] text-[#0e162b]">{DISCOVER_CTA.eyebrow}</span>
						<span className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-[#0e162b]">{DISCOVER_CTA.title}</span>
						<span className="w-full font-geist text-[12px] leading-[17px] text-[#0e162b]">{DISCOVER_CTA.body(remaining)}</span>
						<span className="flex items-center gap-[4px] overflow-clip whitespace-nowrap pt-[4px] font-geist font-medium">
							<span className="text-[13px] leading-[17px] text-[rgba(10,16,32,0.72)]">{DISCOVER_CTA.cta}</span>
							<span className="text-[14px] leading-[18px] text-[#0e162b]">›</span>
						</span>
					</Link>
				</div>
			</div>
		</div>
	);
}

function SectionHeader({ title, size }: { title: string; size: "sm" | "md" }) {
	return (
		<div className="flex w-full items-center justify-between overflow-clip">
			<h2 className={cn("whitespace-nowrap font-sora font-semibold text-[#d3d3dd]", size === "sm" ? "text-[14.584px] leading-[18px]" : "text-[16px] leading-[20px]")}>
				{title}
			</h2>
			<div className={cn("w-0", size === "sm" ? "h-[18.23px]" : "h-[20px]")} />
		</div>
	);
}

function CollectionCard({ group }: { group: CollectionGroup }) {
	const icon = COLLECTION_ICONS[group.slug];
	return (
		<Link
			to="/my-stak/$collection"
			params={{ collection: group.slug }}
			className="stak-press flex min-w-px flex-1 cursor-pointer items-center gap-[16px] overflow-clip rounded-[12.467px] bg-[#181f30] p-[19px]"
		>
			<img alt="" src={icon.icon} className="shrink-0 object-cover" style={{ width: icon.iconSize, height: icon.iconSize }} loading="lazy" />
			<span className="flex min-w-px flex-1 flex-col items-start gap-[3px] overflow-clip whitespace-nowrap">
				<span className="font-sora text-[14.026px] font-semibold leading-[18px] text-white">{group.name}</span>
				<span className="font-geist text-[10.909px] leading-[14px] text-[#819abb]">{group.countLabel}</span>
			</span>
			<span className="whitespace-nowrap font-geist text-[24.823px] leading-[32px] text-[#5c6b85]">›</span>
		</Link>
	);
}

function AllocationLine({ row }: { row: AllocationRow }) {
	const dot = ALLOCATION_DOTS[row.slug];
	return (
		<div className="flex w-full flex-col items-start gap-[6px] overflow-clip">
			<div className="flex w-full items-center justify-between overflow-clip">
				<div className="flex items-center gap-[8px] overflow-clip">
					{dot ? <img alt="" src={dot} className="size-[9px]" /> : <span className="size-[9px] rounded-full" style={{ backgroundColor: row.color }} />}
					<span className="whitespace-nowrap font-geist text-[13px] leading-[17px] text-white">{row.name}</span>
				</div>
				<span className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#819abb]">
					{row.share}% · {countLabel(row.count)}
				</span>
			</div>
			<div className="relative h-[7px] w-full overflow-clip rounded-[4px] bg-[#2a3346]">
				<div className="absolute left-0 top-0 h-[7px] rounded-[4px] transition-[width] duration-300" style={{ width: row.width, backgroundColor: row.color }} />
			</div>
		</div>
	);
}

type Mover = { ticker: string; changePercent: number } | null;

/** "Performance" card: today's equal-weight move across the saves, the best and worst movers; the chart line stays authored (no history yet). */
function PerformanceCard({ total, avgChange, best, worst }: { total: number; avgChange: number | null; best: Mover; worst: Mover }) {
	const p = PERFORMANCE;
	return (
		<div className="flex h-[303.11px] w-full flex-col items-center justify-center gap-[12px] rounded-[12.467px] bg-[#181f30]">
			<div className="flex w-full flex-col items-start gap-[7px] pl-[18px]">
				<div className="flex items-center">
					<span className="whitespace-nowrap font-sora text-[10.606px] leading-[13px] text-[#819abb]">{p.eyebrow}</span>
				</div>
				<p className="whitespace-nowrap font-sora text-[38.889px] font-semibold leading-[49px] tracking-[-0.3889px] text-white">
					{avgChange === null ? "—" : signedPct(avgChange)}
				</p>
				<div className="flex items-center gap-[9px] whitespace-nowrap text-[12.374px] leading-[16px]">
					<span className={cn("font-geist font-medium", avgChange !== null && avgChange < 0 ? RED : GREEN)}>{p.across(total)}</span>
					<span className="font-sora text-[#819abb]">.</span>
					<span className="font-geist text-[#819abb]">{p.period}</span>
				</div>
			</div>
			<div className="flex w-full flex-col items-center gap-[35px]">
				<div className="relative h-[65.453px] w-full">
					<div className="absolute inset-[-1.35%_-0.16%]">
						<img alt="" src={MS.chartLine} className="block size-full max-w-none" />
					</div>
				</div>
				<div className="flex w-full items-center justify-center gap-[63px]">
					{p.ranges.map((r) =>
						r === p.activeRange ? (
							<span
								key={r}
								className="flex h-[19.886px] w-[34.47px] items-center justify-center rounded-[9.943px] border-[0.663px] border-solid border-[rgba(44,157,188,0.4)] bg-[rgba(44,157,188,0.16)]"
							>
								<span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] whitespace-nowrap text-center font-geist text-[10.606px] font-medium text-[#69b3ca]">
									{r}
								</span>
							</span>
						) : (
							<span key={r} className="whitespace-nowrap text-center font-geist text-[10.606px] leading-[14px] text-[#819abb]">
								{r}
							</span>
						),
					)}
				</div>
			</div>
			<div className="h-[0.884px] w-full bg-[#2a3346]" />
			<div className="flex w-[calc(100%-21.818px)] items-center justify-between overflow-clip whitespace-nowrap">
				{[
					{ label: p.bestLabel, mover: best },
					{ label: p.worstLabel, mover: worst },
				].map(({ label, mover }) => (
					<div key={label} className="flex flex-col items-start gap-[3px] overflow-clip">
						<span className="font-geist text-[9.722px] leading-[13px] text-[#5c6b85]">{label}</span>
						<span className="flex items-center gap-[5px] overflow-clip">
							<span className="font-sora text-[11.49px] font-semibold leading-[14px] text-white">{mover?.ticker ?? "—"}</span>
							{mover && (
								<span className={cn("font-geist text-[10.606px] font-medium leading-[14px]", mover.changePercent < 0 ? RED : GREEN)}>
									{signedPct(mover.changePercent)}
								</span>
							)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
