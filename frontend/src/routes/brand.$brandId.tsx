import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { brands, type BrandProfile } from "@/data/brands";
import { ChevronLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VibeSliders } from "@/components/VibeSliders";
import { TrendCarousel } from "@/components/TrendCarousel";
import { getBrandTrends } from "@/data/trends";
import { StockNewsTab } from "@/components/StockNewsTab";
import { getLiveTrends } from "@/lib/api";


export const Route = createFileRoute("/brand/$brandId")({
	component: BrandDetailPage,
});

function BrandDetailPage() {
	const { brandId } = Route.useParams();
	const navigate = useNavigate();
	const [brand, setBrand] = useState<BrandProfile | null>(null);
	const { data: liveData, isLoading: trendsLoading } = useQuery({
		queryKey: ["trends", brandId],
		queryFn: () => getLiveTrends(brandId, brand?.ticker ?? "", brand?.name ?? ""),
		enabled: !!brand,
		staleTime: 3 * 24 * 60 * 60 * 1000,
		retry: 1,
	});

	useEffect(() => {
		const foundBrand = brands.find((b) => b.id === brandId);
		setBrand(foundBrand || null);
	}, [brandId]);

	const handleClose = () => {
		navigate({ to: "/my-stak" });
	};

	if (!brand) {
		return (
			<div className="min-h-screen bg-[#0b1121] text-white flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-2xl font-bold text-zinc-300 mb-2">
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
			className="min-h-screen bg-black/80 sm:bg-[#0b1121] text-white flex flex-col justify-end sm:justify-start"
			onClick={handleClose}
			onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
		>
			<div
				role="presentation"
				className="max-w-[390px] w-full mx-auto px-2 py-4 sm:py-12 bg-[#0b1121] rounded-t-2xl sm:rounded-none max-h-[75vh] sm:max-h-none overflow-y-auto"
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
							className="absolute left-0 text-zinc-400 hover:text-white transition-colors"
						>
							<ChevronLeft className="w-6 h-6" />
						</Link>
						<h1 className="text-lg font-semibold text-white">
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
						<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-6">
							<h2 className="text-xl font-bold text-cyan-400 mb-4">
								{brand.culturalContext.title}
							</h2>
							<div className="space-y-6">
								{brand.culturalContext.sections.map((section) => (
									<div key={section.heading}>
										<h3 className="font-semibold text-lg text-pink-400 mb-2">
											{section.heading}
										</h3>
										<p className="text-zinc-300 leading-relaxed">
											{section.content}
										</p>
									</div>
								))}
							</div>
						</div>

						<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-6">
							<h3 className="font-semibold text-lg text-white mb-4">Vibe Metrics</h3>
							<VibeSliders vibes={brand.vibes} />
						</div>
					</TabsContent>

					<TabsContent value="numbers" className="mt-6">
						<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-6">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-pink-400 mb-2">
									The Numbers
								</h2>
								<p className="text-zinc-400 text-sm">
									Financial metrics explained in plain language
								</p>
							</div>

							<div className="grid gap-6">
								{Object.entries(brand.financials).map(([key, metric]) => (
									<div
										key={key}
										className="border-l-4 border-pink-500/50 pl-4 py-2"
									>
										<div className="flex items-baseline justify-between mb-1">
											<h3 className="font-semibold text-white">{metric.label}</h3>
											<span className="text-2xl font-bold text-pink-400">
												{metric.value}
											</span>
										</div>
										<p className="text-sm text-zinc-400 mb-2">
											{metric.explanation}
										</p>
										<p className="text-sm text-cyan-400 italic">
											"{metric.culturalTranslation}"
										</p>
									</div>
								))}
							</div>

							<div className="mt-6 p-4 bg-[#162036]/50 rounded-lg border border-slate-600/50">
								<p className="text-xs text-zinc-500 text-center italic">
									These are real financial metrics, not investment advice. This is
									for learning, not trading decisions.
								</p>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="trends" className="mt-6">
						<TrendCarousel
							trends={liveData?.cards?.length ? liveData.cards : getBrandTrends(brand.id)}
							ticker={brand.ticker}
						/>
					</TabsContent>

					<TabsContent value="news" className="mt-6">
						<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-6">
							<div className="mb-5">
								<h2 className="text-2xl font-bold text-orange-400 mb-1">
									Recent News
								</h2>
								<p className="text-zinc-400 text-sm">
									Latest articles about {brand.name} · simplified by AI
								</p>
							</div>
							<StockNewsTab ticker={brand.ticker} name={brand.name} />
						</div>
					</TabsContent>
				</Tabs>

					<div className="mt-8 p-4 bg-[#0f1629]/50 border border-slate-700/50 rounded-lg">
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
