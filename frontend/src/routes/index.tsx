import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDailyBrief, getMarketNews } from "@/lib/api";
import { marketSessionBucket, getEasternDateKey } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMyStakData } from "@/hooks/useMyStakData";
import { HomeHeader } from "@/components/home/HomeHeader";
import { MarketMoodCard } from "@/components/home/MarketMoodCard";
import { DeckBanner, SavedPeekCard, TrendingStrip, WhyThisMattersCard } from "@/components/home/HomeCards";
import { cu } from "@/components/discover/discoverTheme";
import { PhonePage } from "@/components/phone/phone";
import { DesktopHome } from "@/components/home/desktop/DesktopHome";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DailyBriefResponse } from "@/lib/api";
import type { UseQueryResult } from "@tanstack/react-query";
import type { NewsArticle } from "@stak/shared";

export const Route = createFileRoute("/")({
	component: HomePage,
});

/** Home: the user's desktop design above the mobile breakpoint, Android's Home tab below it. Both read the same brief and news. */
function HomePage() {
	const { appUser } = useAuth();
	const isMobile = useIsMobile();
	const brief = useQuery({
		queryKey: ["daily-brief", getEasternDateKey(), marketSessionBucket()],
		queryFn: getDailyBrief,
		staleTime: 30 * 60 * 1000,
		retry: 0,
		enabled: !!appUser,
	});
	const news = useQuery({ queryKey: ["market-news"], queryFn: getMarketNews, staleTime: 60 * 1000, retry: 1 });
	return isMobile ? <PhoneHome brief={brief} news={news} /> : <DesktopHome brief={brief} news={news} />;
}

/** Android's Home tab, in Android's order and spacing. The first-run overlay ("See Today's Pick") is a product
 *  decision that hasn't been made for the web, so it isn't built. */
function PhoneHome({ brief, news }: { brief: UseQueryResult<DailyBriefResponse>; news: UseQueryResult<{ articles: NewsArticle[] }> }) {
	const navigate = useNavigate();
	const { appUser } = useAuth();
	const { swipedBrands, batchQuotes } = useMyStakData();
	const openStock = (ticker: string) => navigate({ to: "/stock/$symbol", params: { symbol: ticker } });

	// Blank mood = "unavailable" once the brief has settled or failed (Android sets {mood:""} on failure).
	const briefSettled = !appUser || !brief.isPending;
	const impact = brief.data?.personalizedImpact?.trim();
	const whyBody = impact
		? impact
		: swipedBrands.length === 0
			? "Save a few stocks and STAK will show how today's news hits them."
			: !briefSettled
				? ""
				: "Today's read on your STAK isn't available.";

	return (
		<PhonePage>
			<HomeHeader />
			<div style={{ height: cu(21) }} />
			<div style={{ padding: `0 ${cu(20)} ${cu(20)}` }}>
				<MarketMoodCard
					mood={brief.data?.mood}
					briefState={briefSettled ? "settled" : "loading"}
					news={news.data?.articles}
					newsFailed={news.isError}
					onOpen={() => navigate({ to: "/feed" })}
				/>
				<div style={{ height: cu(10) }} />
				<WhyThisMattersCard body={whyBody} onOpen={() => navigate({ to: "/my-stak" })} />
				<div style={{ height: cu(20) }} />
				<DeckBanner hasSaved={swipedBrands.length > 0} onClick={() => navigate({ to: "/discover" })} />
				<div style={{ height: cu(20) }} />
				<TrendingStrip onOpenStock={openStock} />
				<div style={{ height: cu(12) }} />
				<SavedPeekCard
					saved={swipedBrands}
					total={swipedBrands.length}
					quotes={batchQuotes}
					onOpenStock={(brandId) => { const b = swipedBrands.find((x) => x.id === brandId); if (b) openStock(b.ticker); }}
					onSeeAll={() => navigate({ to: "/my-stak" })}
					onGoToDeck={() => navigate({ to: "/discover" })}
				/>
			</div>
		</PhonePage>
	);
}
