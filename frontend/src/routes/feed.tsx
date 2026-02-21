import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import { getMarketNews, searchNews } from "@/lib/api";
import type { NewsArticle } from "@/data/brands";
import { ExternalLink, TrendingUp, TrendingDown, Minus, X } from "lucide-react";

export const Route = createFileRoute("/feed")({
	component: FeedPage,
});

const PAGE_SIZE = 5;
const MAX_ARTICLES = 30;

function SentimentBadge({ sentiment }: Readonly<{ sentiment: NewsArticle["sentiment"] }>) {
	if (sentiment === "bullish") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
				<TrendingUp className="w-3 h-3" />
				Bullish
			</span>
		);
	}
	if (sentiment === "bearish") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
				<TrendingDown className="w-3 h-3" />
				Bearish
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-400">
			<Minus className="w-3 h-3" />
			Neutral
		</span>
	);
}

function formatArticleDate(datetime: number): string {
	const now = Date.now();
	const ms = datetime * 1000;
	const diffMs = now - ms;
	const diffMins = Math.floor(diffMs / 60000);
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.floor(diffMs / 3600000);
	if (diffHours < 24) return `${diffHours}h ago`;
	return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NewsCard({ article }: Readonly<{ article: NewsArticle }>) {
	const date = formatArticleDate(article.datetime);

	return (
		<a
			href={article.url}
			target="_blank"
			rel="noopener noreferrer"
			className="block bg-white dark:bg-[#0f1629]/50 border border-zinc-200 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm dark:shadow-none hover:border-orange-400/50 dark:hover:border-orange-500/40 transition-all group"
		>
			{article.image && (
				<div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-zinc-100 dark:bg-slate-800">
					<img
						src={article.image}
						alt={article.headline}
						className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
						onError={(e) => {
							(e.target as HTMLImageElement).parentElement!.style.display = "none";
						}}
					/>
				</div>
			)}

			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
						<span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-blue-500/15 text-blue-400 uppercase">
						Macro
					</span>
				<span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
						{article.source}
					</span>
					<span className="text-xs text-zinc-400 dark:text-zinc-500">{date}</span>
				</div>
				<SentimentBadge sentiment={article.sentiment} />
			</div>

			<h3 className="font-bold text-zinc-900 dark:text-white text-base leading-snug mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
				{article.headline}
			</h3>

			<p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
				{article.explanation}
			</p>

			<div className="mt-3 pt-3 border-t border-zinc-100 dark:border-slate-700/50">
				<p className="text-xs text-zinc-500 dark:text-zinc-400">
					<span className="font-semibold text-orange-600 dark:text-orange-400">Why it matters: </span>
					{article.whyItMatters}
				</p>
			</div>

			<div className="flex items-center gap-1 mt-3 text-xs text-zinc-400 dark:text-zinc-500 group-hover:text-orange-500 transition-colors">
				<ExternalLink className="w-3 h-3" />
				Read full article
			</div>
		</a>
	);
}

function SkeletonCard() {
	return (
		<div className="bg-white dark:bg-[#0f1629]/50 border border-zinc-200 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm dark:shadow-none">
			<div className="w-full h-40 rounded-xl bg-zinc-200 dark:bg-zinc-700/50 mb-4 animate-pulse" />
			<div className="flex items-center justify-between mb-3">
				<div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700/50 rounded animate-pulse" />
				<div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700/50 rounded-full animate-pulse" />
			</div>
			<div className="h-5 w-full bg-zinc-200 dark:bg-zinc-700/50 rounded animate-pulse mb-2" />
			<div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-700/50 rounded animate-pulse mb-4" />
			<div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700/50 rounded animate-pulse mb-1" />
			<div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-700/50 rounded animate-pulse" />
		</div>
	);
}

function FeedPage() {
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const [inputValue, setInputValue] = useState("");
	const [activeQuery, setActiveQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const isSearching = activeQuery.length >= 2;

	// Market feed query — no caching so each refresh gets fresh articles
	const { data, isLoading, isError } = useQuery({
		queryKey: ["market-news"],
		queryFn: () => getMarketNews(),
		staleTime: 0,
		gcTime: 0,
		retry: 2,
		retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
		refetchOnWindowFocus: true,
		refetchOnMount: "always",
	});

	// Search query — only fires when activeQuery is set
	const { data: searchData, isLoading: searchLoading, isError: searchError } = useQuery({
		queryKey: ["news-search", activeQuery],
		queryFn: () => searchNews(activeQuery),
		enabled: isSearching,
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});

	const allArticles: NewsArticle[] = useMemo(() => {
		return [...(data?.articles ?? [])].sort((a, b) => b.datetime - a.datetime);
	}, [data]);
	const visibleArticles = allArticles.slice(0, visibleCount);
	const canLoadMore = visibleCount < allArticles.length && visibleCount < MAX_ARTICLES;

	function handleSearch(e: React.FormEvent) {
		e.preventDefault();
		const q = inputValue.trim();
		if (q.length >= 2) {
			setActiveQuery(q);
			setVisibleCount(PAGE_SIZE);
		}
	}

	function clearSearch() {
		setInputValue("");
		setActiveQuery("");
		setVisibleCount(PAGE_SIZE);
		inputRef.current?.focus();
	}

	return (
		<div className="min-h-full bg-background transition-colors duration-300">
			<div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
				{/* Header */}
				<div className="mb-4">
					<h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Market News</h1>
					<p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
						Simplified for you by AI · last 7 days
					</p>
				</div>

				{/* Search bar */}
				<form onSubmit={handleSearch} className="mb-6">
					<div className="relative flex items-center">
						<input
							ref={inputRef}
							type="text"
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							placeholder="Search news — try 'Tesla', 'AI', 'interest rates'..."
							className="w-full pl-4 pr-20 py-2.5 rounded-xl border border-zinc-300 dark:border-slate-600 bg-white dark:bg-[#0f1629]/70 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
						/>
						<div className="absolute right-2 flex items-center gap-1">
							{activeQuery && (
								<button
									type="button"
									onClick={clearSearch}
									className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
									aria-label="Clear search"
								>
									<X className="w-4 h-4" />
								</button>
							)}
							<button
								type="submit"
								disabled={inputValue.trim().length < 2}
								className="px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
							>
								Search
							</button>
						</div>
					</div>
				</form>

				{/* ── SEARCH RESULTS ── */}
				{isSearching && (
					<>
						<div className="mb-4 flex items-center justify-between">
							<p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
								Results for <span className="text-orange-500">"{activeQuery}"</span>
							</p>
							<button
								type="button"
								onClick={clearSearch}
								className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline transition-colors"
							>
								Back to feed
							</button>
						</div>

						{searchLoading && (
							<div className="space-y-4">
								{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
							</div>
						)}

						{searchError && !searchLoading && (
							<div className="flex flex-col items-center justify-center py-16 text-center">
								<div className="text-4xl mb-3">😕</div>
								<p className="text-zinc-500 dark:text-zinc-400 text-sm">
									Couldn't fetch results. Try again.
								</p>
							</div>
						)}

						{!searchLoading && !searchError && (
							<>
								{(searchData?.articles ?? []).length === 0 ? (
									<div className="flex flex-col items-center justify-center py-16 text-center">
										<div className="text-4xl mb-3">🔍</div>
										<p className="text-zinc-600 dark:text-zinc-300 font-medium mb-1">No results found</p>
										<p className="text-zinc-400 dark:text-zinc-500 text-sm">
											Try a different keyword or stock ticker.
										</p>
									</div>
								) : (
									<div className="space-y-4">
										{(searchData?.articles ?? []).map((article, i) => (
											<NewsCard key={`${article.datetime}-${i}`} article={article} />
										))}
									</div>
								)}
							</>
						)}
					</>
				)}

				{/* ── MARKET FEED ── */}
				{!isSearching && (
					<>
						{isLoading && (
							<div className="space-y-4">
								{Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
							</div>
						)}

						{isError && !isLoading && (
							<div className="flex flex-col items-center justify-center py-20 text-center">
								<div className="text-5xl mb-4">📰</div>
								<h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
									Couldn't load news
								</h3>
								<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs">
									Something went wrong fetching the latest market news. Refresh the page to try again.
								</p>
							</div>
						)}

						{!isLoading && !isError && (
							<>
								{allArticles.length === 0 ? (
									<div className="text-center py-20">
										<div className="text-5xl mb-4">🗞️</div>
										<p className="text-zinc-500 dark:text-zinc-400">No news available right now.</p>
									</div>
								) : (
									<div className="space-y-4">
										{visibleArticles.map((article, i) => (
											<NewsCard key={`${article.datetime}-${i}`} article={article} />
										))}
									</div>
								)}

								{canLoadMore && (
									<div className="mt-6 text-center">
										<button
											type="button"
											onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, MAX_ARTICLES))}
											className="px-6 py-2.5 rounded-xl border border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
										>
											Load more stories...
										</button>
									</div>
								)}

								{allArticles.length > 0 && (
									<p className="text-xs text-zinc-400 dark:text-zinc-600 text-center mt-8">
										News summarized by AI · Not financial advice
									</p>
								)}
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
}
