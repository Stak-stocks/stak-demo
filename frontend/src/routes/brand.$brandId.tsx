import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { brands, type BrandProfile } from "@/data/brands";
import { ChevronLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VibeSliders } from "@/components/VibeSliders";
import { TrendCarousel } from "@/components/TrendCarousel";
import { StockNewsTab } from "@/components/StockNewsTab";
import { getLiveTrends, getStockData, getVibes } from "@/lib/api";


export const Route = createFileRoute("/brand/$brandId")({
	component: BrandDetailPage,
});

function BrandDetailPage() {
	const { brandId } = Route.useParams();
	const navigate = useNavigate();

	const brand = brands.find((b) => b.id === brandId) ?? null;

	const { data: liveData, isLoading: trendsLoading, isError: trendsError } = useQuery({
		queryKey: ["trends", brandId],
		queryFn: () => getLiveTrends(brandId, brand!.ticker, brand!.name),
		enabled: !!brand,
		staleTime: 60 * 60 * 1000,
		retry: 0,
	});

	const { data: stockData, isLoading: stockLoading } = useQuery({
		queryKey: ["stock", brand?.ticker],
		queryFn: () => getStockData(brand!.ticker),
		enabled: !!brand,
		staleTime: 60 * 1000,
		refetchInterval: 60 * 1000,
		retry: 3,
		retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
	});

	const { data: vibesData } = useQuery({
		queryKey: ["vibes", brand?.ticker],
		queryFn: () => getVibes(brand!.ticker),
		enabled: !!brand,
		staleTime: 60 * 60 * 1000,
		retry: 1,
	});

	const handleClose = () => {
		navigate({ to: "/my-stak" });
	};

	if (!brand) {
		return (
			<div className="min-h-screen bg-background text-foreground flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-2xl font-bold dark:text-zinc-300 text-zinc-700 mb-2">
						Brand not found
					</h2>
					<Link
						to="/my-stak"
						className="text-cyan-400 hover:underline"
					>
						Back to My Stak
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div
			role="button"
			tabIndex={0}
			className="min-h-screen bg-black/80 sm:bg-background text-foreground flex flex-col justify-end sm:justify-start"
			onClick={handleClose}
			onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
		>
			<div
				role="presentation"
				className="max-w-[390px] w-full mx-auto px-2 py-4 sm:py-12 bg-background rounded-t-2xl sm:rounded-none max-h-[75vh] sm:max-h-none overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				{/* Drag handle indicator for mobile */}
				<div className="flex justify-center mb-4 sm:hidden">
					<div className="w-12 h-1.5 bg-zinc-600 rounded-full" />
				</div>

				<div className="px-4 sm:px-0">
					{/* Centered header */}
					<div className="relative flex items-center justify-center mb-6">
						<Link
							to="/my-stak"
							className="absolute left-0 dark:text-zinc-400 text-zinc-600 hover:text-foreground transition-colors"
						>
							<ChevronLeft className="w-6 h-6" />
						</Link>
						<h1 className="text-lg font-semibold text-foreground">
							My Stak ({brand.ticker})
						</h1>
					</div>

				<Tabs defaultValue="vibe" className="w-full">
					<TabsList className="flex w-full bg-transparent border-b border-zinc-700/50 rounded-none p-0 h-auto gap-0">
						<TabsTrigger
							value="vibe"
							className="flex-1 rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-1 text-sm text-zinc-500 data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none"
						>
							Vibes
						</TabsTrigger>
						<TabsTrigger
							value="trends"
							className="flex-1 rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-1 text-sm text-zinc-500 data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none"
						>
							Trends
						</TabsTrigger>
						<TabsTrigger
							value="numbers"
							className="flex-1 rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-1 text-sm text-zinc-500 data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none"
						>
							Numbers
						</TabsTrigger>
						<TabsTrigger
							value="news"
							className="flex-1 rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-1 text-sm text-zinc-500 data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none"
						>
							News
						</TabsTrigger>
					</TabsList>

					<TabsContent value="vibe" className="mt-6 space-y-6">
						<div className="bg-surface-1/50 border dark:border-slate-700/50 border-slate-200 rounded-xl p-6">
							<h2 className="text-xl font-bold text-cyan-400 mb-4">
								{brand.culturalContext.title}
							</h2>
							<div className="space-y-6">
								{brand.culturalContext.sections.map((section) => (
									<div key={section.heading}>
										<h3 className="font-semibold text-lg text-pink-400 mb-2">
											{section.heading}
										</h3>
										<p className="dark:text-zinc-300 text-zinc-700 leading-relaxed">
											{section.content}
										</p>
									</div>
								))}
							</div>
						</div>

						<div className="bg-surface-1/50 border dark:border-slate-700/50 border-slate-200 rounded-xl p-6">
							<h3 className="font-semibold text-lg text-foreground mb-4">Vibe Metrics</h3>
							<VibeSliders vibes={brand.vibes.map((v) => {
								if (v.name === "Internet Hype" && vibesData?.internetHype != null) return { ...v, value: vibesData.internetHype };
								if (v.name === "Drama Level" && vibesData?.dramaLevel != null) return { ...v, value: vibesData.dramaLevel };
								if (v.name === "Clout" && vibesData?.clout != null) return { ...v, value: vibesData.clout };
								return v;
							})} />
						</div>
					</TabsContent>

					<TabsContent value="numbers" className="mt-6">
						<div className="bg-surface-1/50 border dark:border-slate-700/50 border-slate-200 rounded-xl p-6">
							<div className="mb-5">
								<h2 className="text-2xl font-bold text-pink-400 mb-1">The Numbers</h2>
								<p className="dark:text-zinc-400 text-zinc-600 text-sm">Financial metrics explained in plain language</p>
							</div>

							{/* Live price hero */}
							{stockLoading ? (
								<div className="mb-6 p-4 bg-surface-2/60 rounded-xl border border-pink-500/20 animate-pulse">
									<div className="h-8 w-32 bg-zinc-700/50 rounded mb-2" />
									<div className="h-4 w-48 bg-zinc-700/50 rounded" />
								</div>
							) : stockData?.quote ? (
								<div className="mb-6 p-4 bg-surface-2/60 rounded-xl border border-pink-500/20">
									<div className="flex items-baseline justify-between">
										<span className="text-[26px] font-extrabold text-foreground">
											${stockData.quote.price.toFixed(2)}
										</span>
										<span className={`flex items-center gap-1 text-sm font-semibold ${stockData.quote.change >= 0 ? "text-green-400" : "text-red-400"}`}>
											{stockData.quote.change >= 0
												? <TrendingUp className="w-4 h-4" />
												: <TrendingDown className="w-4 h-4" />}
											{stockData.quote.change >= 0 ? "+" : ""}{stockData.quote.change.toFixed(2)} ({stockData.quote.changePercent.toFixed(2)}%)
										</span>
									</div>
									<div className="flex gap-4 mt-2 text-xs text-zinc-500">
										<span>H {stockData.quote.high.toFixed(2)}</span>
										<span>L {stockData.quote.low.toFixed(2)}</span>
										<span>Prev {stockData.quote.prevClose.toFixed(2)}</span>
										<span className="ml-auto flex items-center gap-1">
											<span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
											Live
										</span>
									</div>
								</div>
							) : null}

							{/* Metrics grid */}
							<div className="grid gap-6">
								{Object.entries(brand.financials).map(([key, metric]) => {
									const m = stockData?.metrics;
									const liveValue: string | null = m
										? key === "peRatio" ? (m.peRatio != null ? String(m.peRatio) : null)
										: key === "marketCap" ? m.marketCap
										: key === "revenueGrowth" ? m.revenueGrowth
										: key === "profitMargin" ? m.profitMargin
										: key === "beta" ? (m.beta != null ? String(m.beta) : null)
										: key === "dividendYield" ? m.dividendYield
										: null
										: null;
									const displayValue = liveValue ?? metric.value;
									return (
										<div key={key} className="border-l-4 border-pink-500/50 pl-4 py-2">
											<div className="flex items-baseline justify-between mb-1">
												<h3 className="font-semibold text-foreground">{metric.label}</h3>
												<span className="text-2xl font-bold text-pink-400">{displayValue}</span>
											</div>
											<p className="text-sm dark:text-zinc-400 text-zinc-600 mb-2">{metric.explanation}</p>
											<p className="text-sm text-cyan-400 italic">"{metric.culturalTranslation}"</p>
										</div>
									);
								})}
							</div>

							<div className="mt-6 p-4 bg-surface-2/50 rounded-lg border border-slate-600/50">
								<p className="text-xs text-zinc-500 text-center italic">
									These are real financial metrics, not investment advice. This is for learning, not trading decisions.
								</p>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="trends" className="mt-6">
						<TrendCarousel
							trends={liveData?.cards ?? []}
							ticker={brand.ticker}
							isLoading={trendsLoading && !trendsError}
						/>
					</TabsContent>

					<TabsContent value="news" className="mt-6">
						<div className="bg-surface-1/50 border dark:border-slate-700/50 border-slate-200 rounded-xl p-6">
							<div className="mb-5">
								<h2 className="text-2xl font-bold text-orange-400 mb-1">
									Recent News
								</h2>
								<p className="dark:text-zinc-400 text-zinc-600 text-sm">
									Latest articles about {brand.name}
								</p>
							</div>
							<StockNewsTab ticker={brand.ticker} name={brand.name} />
						</div>
					</TabsContent>
				</Tabs>

					<div className="mt-8 p-4 bg-surface-1/50 border dark:border-slate-700/50 border-slate-200 rounded-lg">
						<p className="text-xs text-zinc-500 text-center">
							This is cultural context, not financial advice. We're here to explain
							why brands matter, not tell you what to invest in.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
