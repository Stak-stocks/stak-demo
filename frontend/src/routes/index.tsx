import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDailyBrief, getMarketNews } from "@/lib/api";
import { marketSessionBucket, getEasternDateKey } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMyStakData } from "@/hooks/useMyStakData";
import { HomeHeader } from "@/components/home/HomeHeader";
import { MarketMoodCard } from "@/components/home/MarketMoodCard";
import { DeckBanner, SavedPeekCard, TrendingStrip, WhyThisMattersCard } from "@/components/home/HomeCards";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, PhonePage, f, focusRing } from "@/components/phone/phone";
import { PHONE_MAX_WIDTH } from "@/components/discover/useFigmaUnit";
import { completeFirstRun, useFirstRunPending } from "@/lib/firstRun";
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

/** Android's Home tab, in Android's order and spacing. A brand-new account's first visit swaps the tab bar for a scrim
 *  and a "See Today's Pick" pill (Android's first run); the pill, or opening News, My STAK or the deck, ends it. */
function PhoneHome({ brief, news }: { brief: UseQueryResult<DailyBriefResponse>; news: UseQueryResult<{ articles: NewsArticle[] }> }) {
	const navigate = useNavigate();
	const { appUser } = useAuth();
	const { swipedBrands, batchQuotes } = useMyStakData();
	const openStock = (ticker: string) => navigate({ to: "/stock/$symbol", params: { symbol: ticker } });
	const firstRun = useFirstRunPending(appUser?.uid);
	// Leaving for another tab ends the first run, like Android's tab hops.
	const toTab = (to: "/feed" | "/my-stak" | "/discover") => { completeFirstRun(appUser?.uid); navigate({ to }); };

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
					onOpen={() => toTab("/feed")}
				/>
				<div style={{ height: cu(10) }} />
				<WhyThisMattersCard body={whyBody} onOpen={() => toTab("/my-stak")} />
				<div style={{ height: cu(20) }} />
				<DeckBanner hasSaved={swipedBrands.length > 0} onClick={() => toTab("/discover")} />
				<div style={{ height: cu(20) }} />
				<TrendingStrip onOpenStock={openStock} />
				<div style={{ height: cu(12) }} />
				<SavedPeekCard
					saved={swipedBrands}
					total={swipedBrands.length}
					quotes={batchQuotes}
					onOpenStock={(brandId) => { const b = swipedBrands.find((x) => x.id === brandId); if (b) openStock(b.ticker); }}
					onSeeAll={() => toTab("/my-stak")}
					onGoToDeck={() => toTab("/discover")}
				/>
				{/* First run keeps room for the scrim pill. */}
				{firstRun && <div style={{ height: cu(140) }} />}
			</div>
			{firstRun && <FirstRunOverlay onSeeTodaysPick={() => toTab("/discover")} />}
		</PhonePage>
	);
}

/**
 * Android's first-run bottom (HomeScreen.FirstRunOverlay): a scrim fading to the page colour over its first 98.7u, then
 * solid, with the frosted "See Today's Pick" pill 105u below its top edge - 70u above the bottom, in place of the tab
 * bar. The scrim takes every tap (a drag on the dimmed deck banner mustn't open the deck); only the pill answers.
 */
function FirstRunOverlay({ onSeeTodaysPick }: { onSeeTodaysPick: () => void }) {
	return (
		<div className="fixed inset-x-0 bottom-0 z-40 mx-auto" style={{ maxWidth: PHONE_MAX_WIDTH, height: `calc(${cu(226)} + env(safe-area-inset-bottom))` }}>
			<div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(10,16,32,0) 0, ${DISC.pageBg} ${cu(98.7)}, ${DISC.pageBg} 100%)` }} />
			<button
				type="button"
				onClick={onSeeTodaysPick}
				className={`absolute left-1/2 -translate-x-1/2 rounded-full ${PRESS}`}
				style={{
					top: cu(105), width: cu(136), height: cu(51),
					background: "rgba(200,215,255,0.08)",
					border: `${cu(0.94)} solid transparent`,
					// The glass rim: brighter on the two caps, faint along the straight runs (Android's gradient border).
					backgroundImage: "linear-gradient(rgba(200,215,255,0.08), rgba(200,215,255,0.08)), linear-gradient(to right, rgba(255,255,255,0.57), rgba(255,255,255,0.21) 19%, rgba(255,255,255,0.21) 81%, rgba(255,255,255,0.49))",
					backgroundOrigin: "border-box",
					backgroundClip: "padding-box, border-box",
					font: f(500, 12), color: "#fff",
					...focusRing,
				}}
			>
				See Today’s Pick
			</button>
		</div>
	);
}
