import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NewsArticle } from "@/data/brands";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { getCompanyNews } from "@/lib/api";

const NEWS_PAGE_SIZE = 3;
const NEWS_MAX = 15;

function TypeBadge({ type }: Readonly<{ type: NewsArticle["type"] }>) {
	if (type === "company") {
		return (
			<span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-cyan-500/15 text-cyan-400 uppercase">
				Company
			</span>
		);
	}
	return (
		<span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-purple-500/15 text-purple-400 uppercase">
			Sector
		</span>
	);
}

function SentimentBadge({ sentiment }: Readonly<{ sentiment: NewsArticle["sentiment"] }>) {
	if (sentiment === "bullish") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
				<TrendingUp className="w-3 h-3" />
				Bullish
			</span>
		);
	}
	if (sentiment === "bearish") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
				<TrendingDown className="w-3 h-3" />
				Bearish
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/20 text-zinc-400">
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

function ArticleCard({ article, index }: Readonly<{ article: NewsArticle; index: number }>) {
	const [expanded, setExpanded] = useState(false);
	const [isClamped, setIsClamped] = useState(false);
	const textRef = useRef<HTMLParagraphElement>(null);
	const date = formatArticleDate(article.datetime);

	useEffect(() => {
		const el = textRef.current;
		if (el) setIsClamped(el.scrollHeight > el.clientHeight);
	}, []);

	return (
		<a
			key={`${article.datetime}-${index}`}
			href={article.url}
			target="_blank"
			rel="noopener noreferrer"
			className="block border-l-4 border-slate-600/50 hover:border-orange-500/50 pl-4 py-3 transition-all group"
		>
			<div className="flex items-start justify-between gap-3 mb-1.5">
				<h3 className="font-semibold text-white leading-tight text-sm group-hover:text-orange-400 transition-colors line-clamp-2">
					{article.headline}
				</h3>
				<div className="shrink-0 mt-0.5">
					<SentimentBadge sentiment={article.sentiment} />
				</div>
			</div>
			<p ref={textRef} className={`text-xs text-zinc-400 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
				{article.explanation}
			</p>
			{(isClamped || expanded) && (
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setExpanded((v) => !v);
					}}
					className="text-xs text-orange-400 hover:text-orange-300 transition-colors mt-0.5 mb-2"
				>
					{expanded ? "Show less" : "Read more"}
				</button>
			)}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-zinc-500">
					<TypeBadge type={article.type} />
					<span>{article.source}</span>
					<span>·</span>
					<span>{date}</span>
				</div>
				<div className="flex items-center gap-1 text-xs text-zinc-500 group-hover:text-orange-400 transition-colors">
					<ExternalLink className="w-3 h-3" />
				</div>
			</div>
		</a>
	);
}

export function StockNewsTab({ ticker, name }: Readonly<{ ticker: string; name: string }>) {
	const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);

	const { data, isLoading, isError } = useQuery({
		queryKey: ["company-news", ticker],
		queryFn: () => getCompanyNews(ticker, name),
		staleTime: 30 * 1000,
		gcTime: 5 * 60 * 1000,
	});

	const allArticles: NewsArticle[] = data?.articles ?? [];
	const visibleArticles = allArticles.slice(0, visibleCount);
	const canLoadMore = visibleCount < allArticles.length && visibleCount < NEWS_MAX;

	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: NEWS_PAGE_SIZE }).map((_, i) => (
					<div key={i} className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-4 animate-pulse">
						<div className="h-4 w-3/4 bg-zinc-700/50 rounded mb-3" />
						<div className="h-3 w-full bg-zinc-700/50 rounded mb-2" />
						<div className="h-3 w-1/2 bg-zinc-700/50 rounded" />
					</div>
				))}
			</div>
		);
	}

	if (isError) {
		return (
			<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-6 text-center">
				<p className="text-zinc-400 text-sm">Couldn't load news for {ticker}.</p>
			</div>
		);
	}

	if (allArticles.length === 0) {
		return (
			<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-6 text-center">
				<p className="text-zinc-400 text-sm">No recent news for {name}.</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{visibleArticles.map((article, i) => (
				<ArticleCard key={`${article.datetime}-${i}`} article={article} index={i} />
			))}

			{canLoadMore && (
				<button
					type="button"
					onClick={() => setVisibleCount((c) => Math.min(c + NEWS_PAGE_SIZE, NEWS_MAX))}
					className="w-full text-orange-400 hover:text-orange-300 text-sm font-semibold py-3 transition-colors"
				>
					Load more stories...
				</button>
			)}
		</div>
	);
}
