import { createFileRoute, Link } from "@tanstack/react-router";
import { A } from "@/app/assets";
import { PRIMARY_GRADIENT } from "@/app/auth/ui";
import { GradientButton } from "@/app/simulate/ui";
import { MS } from "@/app/mystak/assets";
import { ALLOCATION, COLLECTIONS, type Collection, DISCOVER_CTA, INSIGHT, PERFORMANCE } from "@/app/mystak/data";
import { cn } from "@/lib/utils";

type MyStakSearch = { state?: "empty" };

export const Route = createFileRoute("/_app/my-stak/")({
	validateSearch: (search: Record<string, unknown>): MyStakSearch => ({
		state: search.state === "empty" ? "empty" : undefined,
	}),
	component: MyStakPage,
});

const EMPTY = {
	title: "Nothing saved yet",
	body: "Save a company from today’s deck and it lands here, sorted into a collection for you. Your STAK builds itself from what you keep.",
	cta: "Go to today’s deck",
	caption: "12 companies are waiting in today’s deck",
} as const;

/** Figma 2:1830 "Desktop · My STAK · Empty" (10 States): the header, then a 640px stage with the empty-box block. */
function MyStakEmpty() {
	return (
		<div className="flex w-[932px] flex-col items-start gap-[38px]">
			<div className="flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
				<h1 className="font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">My STAK</h1>
				<p className="font-geist text-[13px] leading-[17px] text-[#819abb]">Your living watchlist and learning hub</p>
			</div>
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
					<Link to="/discover" className="block w-[240px]">
						<GradientButton>{EMPTY.cta}</GradientButton>
					</Link>
					<div className="h-[14px] w-[10px]" />
					<p className="whitespace-nowrap text-center font-geist text-[13px] leading-[17px] text-[#819abb]">{EMPTY.caption}</p>
				</div>
			</div>
		</div>
	);
}

/** Figma 2:4667 "Desktop · My STAK Overview · synced" (1440x1096): 547px main column + 350px rail. */
function MyStakPage() {
	const { state } = Route.useSearch();
	if (state === "empty") return <MyStakEmpty />;
	const rows: Collection[][] = [];
	for (let i = 0; i < COLLECTIONS.length; i += 2) rows.push(COLLECTIONS.slice(i, i + 2));
	return (
		<div className="flex w-[932px] flex-col items-start gap-[38px]">
			<div className="flex flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
				<h1 className="font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">My STAK</h1>
				<p className="font-geist text-[13px] leading-[17px] text-[#819abb]">Your living watchlist and learning hub</p>
			</div>
			<div className="flex items-start gap-[35px]">
				<div className="flex w-[547px] flex-col items-start gap-[20px]">
					<div className="flex w-full flex-col items-end gap-[20px]">
						<div className="flex w-full flex-col items-start gap-[13px]">
							<SectionHeader title="Collections" size="sm" />
							<div className="flex w-full flex-col items-start gap-[16px] overflow-clip">
								{rows.map((row) => (
									<div key={row[0].slug} className="flex w-full items-start gap-[16px] overflow-clip">
										{row.map((c) => (
											<CollectionCard key={c.slug} collection={c} />
										))}
									</div>
								))}
							</div>
						</div>
						<PortfolioSummary />
					</div>
					<div className="flex w-full flex-col items-start gap-[7px] overflow-clip rounded-[14px] bg-[#181f30] p-[16px]">
						<div className="flex items-center gap-[8px] overflow-clip">
							<img alt="" src={MS.sparkle} className="size-[24px]" />
							<span className="whitespace-nowrap font-sora text-[14px] font-semibold leading-[18px] text-white">{INSIGHT.heading}</span>
						</div>
						<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-white">{INSIGHT.title}</p>
						<p className="w-full font-geist text-[13px] leading-[19px] text-[#c8d2e0]">{INSIGHT.body}</p>
					</div>
				</div>

				<div className="mt-[33px] flex w-[350px] flex-col items-end gap-[31px]">
					<Link
						to="/discover"
						className="flex h-[52px] w-full items-center justify-center gap-[8px] rounded-[6px] border-[0.361px] border-solid border-[rgba(101,158,173,0.63)] drop-shadow-[0px_77.322px_10.839px_rgba(82,170,199,0),0px_49.862px_9.756px_rgba(82,170,199,0.01),0px_28.183px_8.31px_rgba(82,170,199,0.03)]"
						style={{ backgroundImage: PRIMARY_GRADIENT }}
					>
						<span className="whitespace-nowrap font-geist text-[14px] font-medium leading-[20.69px] text-white">Add more</span>
						<img alt="" src={MS.plus} className="size-[14px]" />
					</Link>
					<div className="flex w-full flex-col items-start gap-[14px]">
						<SectionHeader title="Breakdown" size="md" />
						<div className="flex w-full flex-col items-center gap-[16px] overflow-clip rounded-[16px] bg-[#181f30] p-[18px]">
							<p className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-white">Allocation</p>
							<img alt="" src={MS.donut} className="size-[150px]" />
							<div className="flex w-full flex-col items-start gap-[12px] overflow-clip">
								{ALLOCATION.map((s) => (
									<div key={s.name} className="flex w-full flex-col items-start gap-[6px] overflow-clip">
										<div className="flex w-full items-center justify-between overflow-clip">
											<div className="flex items-center gap-[8px] overflow-clip">
												<img alt="" src={s.dot} className="size-[9px]" />
												<span className="whitespace-nowrap font-geist text-[13px] leading-[17px] text-white">{s.name}</span>
											</div>
											<span className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#819abb]">{s.share}</span>
										</div>
										<div className="relative h-[7px] w-full overflow-clip rounded-[4px] bg-[#2a3346]">
											<div className="absolute left-0 top-0 h-[7px] rounded-[4px]" style={{ width: s.width, backgroundColor: s.color }} />
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
					<Link to="/discover" className="flex w-full flex-col items-start gap-[9px] overflow-clip rounded-[16px] bg-[#69b3ca] p-[18px]">
						<span className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.6px] text-[#0e162b]">{DISCOVER_CTA.eyebrow}</span>
						<span className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-[#0e162b]">{DISCOVER_CTA.title}</span>
						<span className="w-full font-geist text-[12px] leading-[17px] text-[#0e162b]">{DISCOVER_CTA.body}</span>
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

function CollectionCard({ collection }: { collection: Collection }) {
	return (
		<Link
			to="/my-stak/$collection"
			params={{ collection: collection.slug }}
			className="flex min-w-px flex-1 items-center gap-[16px] overflow-clip rounded-[12.467px] bg-[#181f30] p-[19px]"
		>
			<img alt="" src={collection.icon} className="shrink-0 object-cover" style={{ width: collection.iconSize, height: collection.iconSize }} />
			<span className="flex min-w-px flex-1 flex-col items-start gap-[3px] overflow-clip whitespace-nowrap">
				<span className="font-sora text-[14.026px] font-semibold leading-[18px] text-white">{collection.name}</span>
				<span className="font-geist text-[10.909px] leading-[14px] text-[#819abb]">{collection.count}</span>
			</span>
			<span className="whitespace-nowrap font-geist text-[24.823px] leading-[32px] text-[#5c6b85]">›</span>
		</Link>
	);
}

function PortfolioSummary() {
	const p = PERFORMANCE;
	return (
		<div className="flex h-[303.11px] w-full flex-col items-center justify-center gap-[12px] rounded-[12.467px] bg-[#181f30]">
			<div className="flex w-full flex-col items-start gap-[7px] pl-[18px]">
				<div className="flex items-center">
					<span className="whitespace-nowrap font-sora text-[10.606px] leading-[13px] text-[#819abb]">{p.eyebrow}</span>
				</div>
				<p className="whitespace-nowrap font-sora text-[38.889px] font-semibold leading-[49px] tracking-[-0.3889px] text-white">{p.value}</p>
				<div className="flex items-center gap-[9px] whitespace-nowrap text-[12.374px] leading-[16px]">
					<span className="font-geist font-medium text-[#2fd08a]">{p.across}</span>
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
			<div className="flex w-[525.182px] items-center justify-between overflow-clip whitespace-nowrap">
				{[p.best, p.worst].map((m) => (
					<div key={m.label} className="flex flex-col items-start gap-[3px] overflow-clip">
						<span className="font-geist text-[9.722px] leading-[13px] text-[#5c6b85]">{m.label}</span>
						<span className="flex items-center gap-[5px] overflow-clip">
							<span className="font-sora text-[11.49px] font-semibold leading-[14px] text-white">{m.ticker}</span>
							<span className={cn("font-geist text-[10.606px] font-medium leading-[14px]", m.change.startsWith("-") ? "text-[#ff5a6a]" : "text-[#2fd08a]")}>
								{m.change}
							</span>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
