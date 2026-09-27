import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getCompanyNews, getDailyBrief, getMarketNews } from "@/lib/api";
import { getEasternDateKey, marketSessionBucket } from "@/lib/utils";
import { rememberArticles, type StoredArticle } from "@/lib/openedArticle";
import { sourceBriefs } from "@/components/news/NewsParts";
import { useAuth } from "@/context/AuthContext";
import { useMyStakData } from "@/hooks/useMyStakData";

const FOR_YOU_LIMIT = 10;
/** Each held stock costs the server a news lookup (and a Gemini summary when cold), so For You reads the most recent saves. */
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

	// For You: the newest stories about your most recently saved stocks, one request per stock.
	const forYouBrands = useMemo(() => swipedBrands.slice(-FOR_YOU_TICKER_CAP), [swipedBrands]);
	const companyNews = useQueries({
		queries: forYouBrands.map((b) => ({
			queryKey: ["company-news", b.ticker],
			queryFn: () => getCompanyNews(b.ticker),
			staleTime: 10 * 60 * 1000,
			retry: 0,
		})),
	});
	const companyVersion = companyNews.map((q) => q.dataUpdatedAt).join(",");
	const forYou = useMemo(() => {
		const seen = new Set<string>();
		const out: StoredArticle[] = [];
		companyNews.forEach((q, i) => {
			const ticker = forYouBrands[i]?.ticker;
			for (const a of q.data?.articles ?? []) {
				if (a.type !== "company" || !a.url || seen.has(a.url)) continue;
				seen.add(a.url);
				out.push({ ...a, ticker });
			}
		});
		return out.sort((a, b) => b.datetime - a.datetime).slice(0, FOR_YOU_LIMIT);
		// Keyed on when each company's news last arrived: useQueries hands back a new array every render.
	}, [forYouBrands, companyVersion]);
	const forYouLoading = companyNews.some((q) => q.isPending);

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
		marketArticles,
		briefItems,
		aiBrief,
		briefLoading: !!appUser && brief.isPending,
		mood: brief.data?.mood?.trim(),
		openStory,
	};
}
