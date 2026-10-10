import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { N } from "@/app/news/assets";
import { colPlus } from "@/app/FitCanvas";
import { useApiHealth } from "@/app/live/quotes";
import { useShowcase } from "@/app/live/showcase";
import { useLive } from "@/app/live/store";
import { ARTICLE_TICKERS, CHEVRON, IN_YOUR_STAK, type NewsCardData, newsListing, SEARCH } from "@/app/news/data";
import { NewsColumn } from "@/app/news/NewsCard";
import { getMarketStatusLive } from "@/lib/api";

export const Route = createFileRoute("/_app/news")({
	component: NewsPage,
});

/**
 * Figma 2:4359 "Desktop · News listing" (1440x1120): content column 1144 wide. The stories are the
 * authored demo content; the "In your STAK" tag is only shown on stories about a saved company,
 * the Market Mood chip reads the live market status, and the search button filters both columns.
 */
function NewsPage() {
	const { brief, mood, mini, forYou, markets } = newsListing;
	const live = useLive();
	const healthy = useApiHealth();
	const status = useQuery({ queryKey: ["market-status"], queryFn: getMarketStatusLive, enabled: healthy, staleTime: 60_000, retry: 0 });
	const moodLine = status.data ? (status.data.isOpen ? "Markets open" : status.data.holiday ? `Closed · ${status.data.holiday}` : "Markets closed") : mood.subtitle;

	const [searching, setSearching] = useState(false);
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const searchBoxRef = useRef<HTMLDivElement>(null);
	const searchButtonRef = useRef<HTMLButtonElement>(null);
	/** whether the search button takes the focus once it is back: set by every close except a blur that moved focus to another control */
	const refocusButton = useRef(false);
	useEffect(() => {
		if (searching) inputRef.current?.focus();
		else if (refocusButton.current) {
			refocusButton.current = false;
			searchButtonRef.current?.focus();
		}
	}, [searching]);
	const closeSearch = (refocus = true) => {
		refocusButton.current = refocus;
		setSearching(false);
		setQuery("");
	};
	const q = query.trim().toLowerCase();

	const showcase = useShowcase();
	const tagged = (cards: readonly NewsCardData[]): NewsCardData[] =>
		cards
			.filter((card) => !q || card.title.toLowerCase().includes(q))
			.map((card) => {
				const ticker = ARTICLE_TICKERS[card.id];
				// the untouched demo persona is the frame (2:4359: every card says "In your STAK"); otherwise only stories about a saved company do
				return { ...card, tag: showcase || (ticker && live.savedTickers.has(ticker)) ? IN_YOUR_STAK : card.tag };
			});

	return (
		<div className="flex flex-col items-start gap-[24px]" style={{ width: colPlus(10) }}>
			<div className="flex h-[58px] w-full items-center justify-between">
				<div className="flex flex-col items-start gap-[6px] overflow-clip whitespace-nowrap">
					<h1 className="font-sora text-[28px] font-semibold leading-[35px] text-[#f2f6fc]">{newsListing.title}</h1>
					<p className="font-geist text-[13px] leading-[17px] text-[#819abb]">{newsListing.date}</p>
				</div>
				{searching ? (
					<div ref={searchBoxRef} className="mr-[3px] flex items-center gap-[8px]">
						<input
							ref={inputRef}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Escape") closeSearch();
							}}
							onBlur={(e) => {
								if (query.trim()) return;
								// an empty field closes on blur; focus that left for another control stays there, focus
								// heading for the × (which unmounts with the field) or nowhere comes back to the search button
								const leftForControl = e.relatedTarget instanceof HTMLElement && !searchBoxRef.current?.contains(e.relatedTarget);
								closeSearch(!leftForControl);
							}}
							aria-label={SEARCH.label}
							placeholder={SEARCH.placeholder}
							className="h-[40px] w-[260px] rounded-[20px] border-0 bg-[#181f30] px-[16px] font-geist text-[13px] leading-[17px] text-[#f2f6fc] outline-none placeholder:text-[#5c6b85]"
						/>
						<button
							type="button"
							aria-label={SEARCH.close}
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => closeSearch()}
							className="stak-press flex size-[40px] cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#181f30] font-geist text-[18px] leading-none text-[#819abb]"
						>
							×
						</button>
					</div>
				) : (
					<button
						ref={searchButtonRef}
						type="button"
						aria-label={SEARCH.label}
						onClick={() => setSearching(true)}
						className="stak-press mr-[3px] flex size-[40px] cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#181f30]"
					>
						<img alt="" src={N.search} className="size-[20px]" />
					</button>
				)}
			</div>

			<div className="flex w-full flex-col items-start gap-[50px]">
				<div className="flex w-full items-start gap-[40px]">
					{/* Today's brief */}
					<Link
						to="/news/$id"
						params={{ id: brief.id }}
						className="stak-press flex h-[250px] min-w-0 cursor-pointer flex-col items-start overflow-clip rounded-[16px] bg-[#69b3ca] px-[26px] pb-[20px] pt-[24px]"
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
								<span className="font-geist text-[11px] leading-[14px] text-[#819abb]">{moodLine}</span>
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

				<div className="flex w-full items-start gap-[40px]">
					<NewsColumn title={forYou.title} cards={tagged(forYou.cards)} emptyText={SEARCH.empty(query)} />
					<NewsColumn title={markets.title} cards={tagged(markets.cards)} emptyText={SEARCH.empty(query)} />
				</div>
			</div>
		</div>
	);
}
