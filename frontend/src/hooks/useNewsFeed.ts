import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDailyBrief, getForYouNews, getMarketNews } from "@/lib/api";
import { getEasternDateKey, marketSessionBucket } from "@/lib/utils";
import { rememberArticles, type StoredArticle } from "@/lib/openedArticle";
import { sourceBriefs } from "@/components/news/NewsParts";
import { useAuth } from "@/context/AuthContext";
import { useMyStakData } from "@/hooks/useMyStakData";

const FOR_YOU_LIMIT = 10;
/** Each held stock can cost the server a news lookup (and a Gemini summary when cold), so For You reads the most recent saves. */
const FOR_YOU_TICKER_CAP = 10;

/**
 * The News page's data, shared by the phone and desktop layouts: today's AI brief (mood, why it matters, what to
 * watch), the market stories, and "For You" - the newest stories about your most recently saved stocks.
 */
export function useNewsFeed() {
	const { appUser } = useAuth();
	const navigate = useNavigate();
	const { swipedBrands } = useMyStakData();

	const brief = useQuery({
		queryKey: ["daily-brief", getEasternDateKey(), marketSessionBucket()],
		queryFn: getDailyBrief,
		staleTime: 30 * 60 * 1000,
		retry: 0,
		enabled: !!appUser,
	});
	const market = useQuery({ queryKey: ["market-news"], queryFn: getMarketNews, staleTime: 60 * 1000, retry: 1 });

	// For You: the newest stories about your most recently saved stocks, all of them in one request.
	const forYouTickers = useMemo(() => swipedBrands.slice(-FOR_YOU_TICKER_CAP).map((b) => b.ticker), [swipedBrands]);
	const forYouNews = useQuery({
		queryKey: ["for-you-news", forYouTickers.join(",")],
		queryFn: () => getForYouNews(forYouTickers),
		enabled: forYouTickers.length > 0,
		staleTime: 10 * 60 * 1000,
		retry: 0,
		// Saving another company keeps the current list up while the new one loads.
		placeholderData: keepPreviousData,
		// Companies the server was still writing up come back `pending`: ask again shortly (a few times at most).
		refetchInterval: (q) => ((q.state.data?.pending?.length ?? 0) > 0 && q.state.dataUpdateCount < 4 ? 8_000 : false),
	});
	const forYou = useMemo(() => {
		const seen = new Set<string>();
		const out: StoredArticle[] = [];
		for (const { ticker, articles } of forYouNews.data?.results ?? []) {
			for (const a of articles) {
				// Only stories about the company itself carry its ticker; ones merely near it stay in Markets.
				if (a.type !== "company" || !a.url || seen.has(a.url)) continue;
				seen.add(a.url);
				out.push({ ...a, ticker });
			}
		}
		return out.sort((a, b) => b.datetime - a.datetime).slice(0, FOR_YOU_LIMIT);
	}, [forYouNews.data]);
	const forYouLoading = forYouTickers.length > 0 && forYouNews.isPending;
	const forYouFailed = forYouNews.isError && !forYouNews.data;

	const marketArticles = useMemo<StoredArticle[]>(() => market.data?.articles ?? [], [market.data]);
	const briefItems = sourceBriefs(brief.data, marketArticles);
	const aiBrief = !!(brief.data?.moodExplanation?.trim() || brief.data?.plainEnglish?.trim());

	// The API has no single-story lookup, so the page a row opens reads the story from here.
	function openStory(article: StoredArticle) {
		rememberArticles([...forYou, ...marketArticles, article]);
		navigate({ to: "/feed/article", search: { u: article.url } });
	}

	return {
		brief,
		market,
		forYou,
		forYouLoading,
		forYouFailed,
		retryForYou: () => { void forYouNews.refetch(); },
		marketArticles,
		briefItems,
		aiBrief,
		briefLoading: !!appUser && brief.isPending,
		mood: brief.data?.mood?.trim(),
		openStory,
	};
}
