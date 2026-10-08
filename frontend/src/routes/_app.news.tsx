import { createFileRoute, Link } from "@tanstack/react-router";
import { N } from "@/app/news/assets";
import { colPlus } from "@/app/FitCanvas";
import { CHEVRON, newsListing } from "@/app/news/data";
import { NewsColumn } from "@/app/news/NewsCard";

export const Route = createFileRoute("/_app/news")({
	component: NewsPage,
});

/** Figma 2:4359 "Desktop · News listing" (1440x1120): content column 1144 wide. */
function NewsPage() {
	const { brief, mood, mini, forYou, markets } = newsListing;
	return (
		<div className="flex flex-col items-start gap-[24px]" style={{ width: colPlus(10) }}>
			<div className="flex h-[58px] w-full items-center justify-between">
				<div className="flex flex-col items-start gap-[6px] overflow-clip whitespace-nowrap">
					<h1 className="font-sora text-[28px] font-semibold leading-[35px] text-[#f2f6fc]">{newsListing.title}</h1>
					<p className="font-geist text-[13px] leading-[17px] text-[#819abb]">{newsListing.date}</p>
				</div>
				<button
					type="button"
					aria-label="Search"
					className="mr-[3px] flex size-[40px] items-center justify-center overflow-clip rounded-[20px] bg-[#181f30]"
				>
					<img alt="" src={N.search} className="size-[20px]" />
				</button>
			</div>

			<div className="flex w-full flex-col items-start gap-[50px]">
				<div className="flex w-full items-start gap-[40px]">
					{/* Today's brief */}
					<Link
						to="/news/$id"
						params={{ id: brief.id }}
						className="flex h-[250px] min-w-0 flex-col items-start overflow-clip rounded-[16px] bg-[#69b3ca] px-[26px] pb-[20px] pt-[24px]"
						style={{ flex: "692 1 0" }}
					>
						<div className="flex w-full flex-col items-start gap-[12px]">
							<div className="flex w-full flex-col items-start gap-[45px]">
								<div className="flex w-full flex-col items-start gap-[12px]">
									<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[rgba(14,22,43,0.7)]">
										{brief.kicker}
									</p>
									<div className="flex w-full flex-col items-start gap-[12px]">
										<p className="w-full font-sora text-[22px] font-semibold leading-[28px] text-[#0e162b]">{brief.title}</p>
										<p className="w-full font-geist text-[14px] leading-[18px] text-[rgba(14,22,43,0.8)]">{brief.dek}</p>
									</div>
								</div>
								<div className="flex h-[20px] w-[calc(100%-25px)] items-center justify-between overflow-clip whitespace-nowrap">
									<span className="flex items-center gap-[6px] overflow-clip font-geist text-[13px] font-medium leading-[17px] text-[#0e162b]">
										<span>{brief.read}</span>
										<span>{CHEVRON}</span>
									</span>
									<span className="font-geist text-[11px] leading-[14px] text-[rgba(14,22,43,0.6)]">{brief.source}</span>
								</div>
							</div>
							<img alt="" src={N.dots} className="h-[6px] w-[30px]" />
						</div>
					</Link>

					<div className="flex min-w-0 flex-col items-start gap-[22px]" style={{ flex: "360 1 0" }}>
						{/* Market Mood chip */}
						<div className="relative flex h-[95px] w-full items-center overflow-clip rounded-[12px] bg-[#181f30] px-[16px] py-[10px]">
							<div className="flex flex-col items-start gap-[2px] overflow-clip whitespace-nowrap">
								<span className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{mood.title}</span>
								<span className="font-geist text-[11px] leading-[14px] text-[#819abb]">{mood.subtitle}</span>
							</div>
							<img alt="" src={N.gaugeLow} className="absolute right-[17.969px] top-[30.692px] h-[33.615px] w-[67.031px]" />
						</div>
						{/* Mini markets */}
						<div className="flex h-[129px] w-full flex-col items-start overflow-clip rounded-[12px] bg-[#181f30] px-[18px] pb-[14px] pt-[16px]">
							<div className="flex w-full flex-col items-start gap-[21px]">
								<div className="flex w-full flex-col items-start gap-[8px]">
									<p className="whitespace-nowrap font-geist text-[9px] font-medium leading-[12px] tracking-[0.72px] text-[#5bd7e4]">{mini.kicker}</p>
									<p className="w-full font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{mini.title}</p>
									<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{mini.body}</p>
								</div>
								<p className="whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]">{mini.source}</p>
							</div>
						</div>
					</div>
				</div>

				<div className="flex w-full items-center gap-[40px]">
					<NewsColumn title={forYou.title} cards={forYou.cards} />
					<NewsColumn title={markets.title} cards={markets.cards} />
				</div>
			</div>
		</div>
	);
}
