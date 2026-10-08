import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { N } from "@/app/news/assets";
import { article } from "@/app/news/data";
import { GradientButton } from "@/app/profile/ui";

type DetailSearch = { saved?: boolean };

export const Route = createFileRoute("/_app/news_/$id")({
	validateSearch: (search: Record<string, unknown>): DetailSearch => ({
		saved: search.saved === true || search.saved === 1 || search.saved === "1" ? true : undefined,
	}),
	component: NewsDetailPage,
});

/** Figma 2:4453 "Desktop · News detail · Unsaved" and 2:4555 "Saved" (1440x2050): content column 1130 wide. */
function NewsDetailPage() {
	const { saved: savedParam } = Route.useSearch();
	const [saved, setSaved] = useState(Boolean(savedParam));
	useEffect(() => setSaved(Boolean(savedParam)), [savedParam]);
	const a = article;
	const save = () => setSaved(true);
	return (
		<div className="flex w-[1130px] flex-col items-start gap-[24px]">
			<div className="flex flex-col items-start gap-[31px]">
				<Link
					to="/news"
					aria-label="Back to News"
					className="flex size-[40px] items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
				>
					<img alt="" src={N.back} className="size-[22px]" />
				</Link>
				<p className="whitespace-pre font-geist text-[16px] font-medium leading-[21px] text-[#819abb]">{a.breadcrumb}</p>
			</div>

			<div className="flex w-full items-start justify-end gap-[30px]">
				<div className="flex items-center p-[10px]">
					<article className="flex w-[720px] flex-col items-start gap-[28px]">
						<Hero saved={saved} onSave={save} />

						<div className="flex w-full flex-col items-start gap-[18px] overflow-clip">
							<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#5bd7e4]">
								{a.category}
							</p>
							<h1 className="w-[720px] font-sora text-[30px] font-semibold leading-[38px] text-[#f2f6fc]">{a.title}</h1>
							<p className="w-[720px] font-geist text-[16px] leading-[21px] text-[#819abb]">{a.dek}</p>
							<div className="flex items-center gap-[10px] overflow-clip">
								<span className="flex size-[26px] items-center justify-center overflow-clip rounded-[13px] bg-[#242b3d]">
									<span className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] text-[#f2f6fc]">
										{a.publisherInitial}
									</span>
								</span>
								<span className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#819abb]">{a.byline}</span>
							</div>

							<div className="flex w-full flex-col items-start gap-[12px] overflow-clip rounded-[14px] bg-[#242b3d] px-[22px] py-[20px]">
								<div className="flex items-center gap-[8px] overflow-clip">
									<img alt="" src={N.sparkle} className="size-[16px]" />
									<span className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{a.gistTitle}</span>
								</div>
								{a.gist.map((line) => (
									<div key={line} className="flex h-[20px] w-full items-center gap-[10px] overflow-clip">
										<img alt="" src={N.check} className="size-[18.4px] shrink-0" />
										<span className="w-[630px] font-geist text-[13px] leading-[17px] text-[#f2f6fc]">{line}</span>
									</div>
								))}
							</div>

							{a.paragraphs1.map((p) => (
								<p key={p.slice(0, 32)} className="w-[720px] font-geist text-[15px] leading-[20px] text-[#f2f6fc]">
									{p}
								</p>
							))}

							<div className="flex h-[60px] w-[720px] items-start gap-[16px] overflow-clip">
								<div className="h-[56px] w-[3px] shrink-0 bg-[#5da8bf]" />
								<p className="w-[660px] font-sora text-[19px] font-semibold leading-[24px] text-[#a6e4f7]">{a.quote}</p>
							</div>

							<div className="flex h-[80px] w-full flex-col items-start gap-[8px] overflow-clip rounded-[12px] bg-[#181f30] px-[20px] py-[16px]">
								<p className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#5bd7e4]">{a.newToThis.title}</p>
								<p className="w-[680px] font-geist text-[13px] leading-[17px] text-[#819abb]">{a.newToThis.body}</p>
							</div>

							{a.paragraphs2.map((p) => (
								<p key={p.slice(0, 32)} className="w-[720px] font-geist text-[15px] leading-[20px] text-[#f2f6fc]">
									{p}
								</p>
							))}
						</div>

						<a href={a.sourceUrl} target="_blank" rel="noreferrer" className="flex w-[81px] items-center justify-between">
							<span className="whitespace-nowrap font-sora text-[13px] leading-[16px] text-white">{a.sourceLabel}</span>
							<img alt="" src={N.externalLink} className="size-[19px]" />
						</a>
					</article>
				</div>

				<Rail saved={saved} onSave={save} />
			</div>
		</div>
	);
}

/** "Hero image" 720x416: raster fill, category toast, play polygon, bookmark (unsaved) or "Saved to My STAK" toast. */
function Hero({ saved, onSave }: { saved: boolean; onSave: () => void }) {
	const a = article;
	return (
		<div className="relative h-[416px] w-full overflow-clip rounded-[20px] bg-[#c4c4c4]">
			<img
				alt=""
				src={N.hero}
				className="absolute left-[calc(50%-1px)] top-[calc(50%+33.18px)] h-[542.368px] w-[814px] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
			/>
			<div
				className="absolute left-[18px] top-[350px] flex items-center overflow-clip rounded-[15.75px] bg-[rgba(36,43,61,0.25)] px-[14px]"
				style={{ paddingTop: saved ? 10 : 9.625, paddingBottom: saved ? 10 : 9.625 }}
			>
				<span className="whitespace-nowrap font-geist text-[20px] font-medium leading-[26px] text-white">{a.category}</span>
			</div>
			{saved && (
				<div className="absolute left-[469px] top-[20px] flex items-center gap-[8px] overflow-clip rounded-[15.75px] bg-[rgba(36,43,61,0.25)] px-[14px] py-[10px]">
					<img alt="" src={N.bookmarkSaved} className="size-[25.25px]" />
					<span className="whitespace-nowrap font-geist text-[20px] font-medium leading-[26px] text-white">{a.savedToast}</span>
				</div>
			)}
			<div className="absolute left-[calc(50%-1px)] top-[calc(50%+25px)] flex size-[162px] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
				<div className="flex-none rotate-90">
					<div className="relative size-[162px]">
						<div className="absolute bottom-1/4 left-[13.01%] right-[13.01%] top-[8.64%]">
							<img alt="" src={N.polygon} className="block size-full max-w-none" />
						</div>
					</div>
				</div>
			</div>
			{!saved && (
				<button type="button" aria-label="Save to My STAK" onClick={onSave} className="absolute left-[664px] top-[16px] size-[33.125px]">
					<span className="absolute inset-[0_0_-2.66%_0]">
						<img alt="" src={N.bookmark} className="block size-full max-w-none" />
					</span>
				</button>
			)}
		</div>
	);
}

function TickerHead() {
	const t = article.ticker;
	return (
		<>
			<div className="flex items-center gap-[10px] overflow-clip">
				<span className="flex size-[30px] items-center justify-center overflow-clip rounded-[15px] bg-[#242b3d]">
					<span className="whitespace-nowrap font-sora text-[14px] font-semibold leading-[18px] text-[#f2f6fc]">{t.initial}</span>
				</span>
				<span className="flex flex-col items-start gap-px overflow-clip whitespace-nowrap">
					<span className="font-geist text-[15px] font-medium leading-[20px] text-[#f2f6fc]">{t.name}</span>
					<span className="font-geist text-[12px] leading-[16px] text-[#819abb]">{t.symbol}</span>
				</span>
			</div>
			<p className="whitespace-nowrap font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{t.price}</p>
		</>
	);
}

function TickerChart() {
	return (
		<div className="relative h-[72.8px] w-[270.4px]">
			<div className="absolute inset-[-4.29%_-1.15%]">
				<img alt="" src={N.chart} className="block size-full max-w-none" />
			</div>
		</div>
	);
}

/** Right rail: ticker card (unsaved / saved variants), key stats, Add to STAK, divider, chip, read next. */
function Rail({ saved, onSave }: { saved: boolean; onSave: () => void }) {
	const a = article;
	return (
		<aside className="flex w-[360px] flex-col items-start gap-[16px] overflow-clip">
			{saved ? (
				<Link
					to="/stocks/$symbol"
					params={{ symbol: a.ticker.symbol }}
					search={{ saved: true, from: "my-stak" }}
					className="flex h-[296px] w-[360px] flex-col items-start overflow-clip rounded-[16px] bg-[#181f30] p-[20px]"
				>
					<div className="flex w-full flex-col items-start gap-[27px]">
						<div className="flex flex-col items-start gap-[10px]">
							<div className="flex flex-col items-start gap-[10px]">
								<div className="flex flex-col items-start gap-[10px]">
									<TickerHead />
								</div>
								<p className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#2fd08a]">{a.ticker.change}</p>
							</div>
							<TickerChart />
						</div>
						<div className="flex w-full flex-col items-start gap-[13px]">
							<div className="h-px w-full bg-[#2a3346]" />
							<span className="flex w-full items-center justify-between overflow-clip py-[2px]">
								<span className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#aeaeae]">{a.ticker.viewInStak}</span>
								<span className="flex h-[6.875px] w-[3.75px] items-center justify-center">
									<span className="block flex-none -rotate-90">
										<img alt="" src={N.chevron} className="block h-[3.75px] w-[6.875px] max-w-none" />
									</span>
								</span>
							</span>
						</div>
					</div>
				</Link>
			) : (
				<Link
					to="/stocks/$symbol"
					params={{ symbol: a.ticker.symbol }}
					className="flex w-full flex-col items-start gap-[10px] overflow-clip rounded-[16px] bg-[#181f30] p-[20px]"
				>
					<TickerHead />
					<p className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#2fd08a]">{a.ticker.change}</p>
					<TickerChart />
				</Link>
			)}

			<div className="flex w-full flex-col items-start gap-[12px] overflow-clip whitespace-nowrap rounded-[16px] bg-[#181f30] p-[20px]">
				<p className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{a.keyStats.title}</p>
				{a.keyStats.rows.map((row) => (
					<div key={row[0].label} className="flex h-[34px] w-full items-start gap-[20px] overflow-clip">
						{row.map((stat) => (
							<div key={stat.label} className="flex h-[30px] w-[150px] flex-col items-start gap-[2px] overflow-clip">
								<span className="font-geist text-[11px] leading-[14px] text-[#819abb]">{stat.label}</span>
								<span className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{stat.value}</span>
							</div>
						))}
					</div>
				))}
			</div>

			{!saved && (
				<GradientButton onClick={onSave}>
					<img alt="" src={N.plus} className="size-[12.6px]" />
					<span className="whitespace-nowrap font-geist text-[14px] font-medium leading-[20.69px] text-white">{a.addToStak}</span>
				</GradientButton>
			)}

			<div className="h-px w-full bg-[#2a3346]" />
			<span className="flex items-start overflow-clip rounded-[999px] bg-[#242b3d] px-[14px] py-[6px]">
				<span className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{a.chip}</span>
			</span>

			<div className="flex h-[153px] w-full flex-col items-start gap-[10px] overflow-clip whitespace-nowrap">
				<p className="font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#5bd7e4]">{a.readNext.kicker}</p>
				{a.readNext.items.map((item, i) => (
					<Link
						key={`${item.id}-${i}`}
						to="/news/$id"
						params={{ id: item.id }}
						className="flex h-[60px] w-full flex-col items-start gap-[5px] overflow-clip rounded-[12px] bg-[#181f30] px-[16px] py-[14px]"
					>
						<span className="font-geist text-[10px] leading-[13px] text-[#819abb]">{item.source}</span>
						<span className="w-[328px] font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{item.title}</span>
					</Link>
				))}
			</div>
		</aside>
	);
}
