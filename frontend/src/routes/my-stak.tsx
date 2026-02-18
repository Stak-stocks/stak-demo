import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { BrandProfile } from "@/data/brands";
import { getBrandLogoUrl } from "@/data/brands";
import { Sparkles, Search, TrendingUp, Newspaper, Activity, X } from "lucide-react";
import { SearchView } from "@/components/SearchView";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VibeSliders } from "@/components/VibeSliders";
import { TrendCarousel } from "@/components/TrendCarousel";
import { getBrandTrends } from "@/data/trends";
import { saveStak } from "@/lib/api";

export const Route = createFileRoute("/my-stak")({
	component: MyStakPage,
});

function MyStakPage() {
	const [searchOpen, setSearchOpen] = useState(false);
	const [selectedBrand, setSelectedBrand] = useState<BrandProfile | null>(null);
	const [swipedBrands, setSwipedBrands] = useState<BrandProfile[]>(() => {
		const saved = localStorage.getItem("my-stak");
		return saved ? JSON.parse(saved) : [];
	});

	// Re-sync stak from localStorage when updated elsewhere (e.g. search overlay)
	useEffect(() => {
		const handler = () => {
			const saved = localStorage.getItem("my-stak");
			setSwipedBrands(saved ? JSON.parse(saved) : []);
		};
		window.addEventListener('stak-updated', handler);
		return () => window.removeEventListener('stak-updated', handler);
	}, []);

	// Lock background scroll when overlay is open
	useEffect(() => {
		if (selectedBrand) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => { document.body.style.overflow = ""; };
	}, [selectedBrand]);

	const handleBrandClick = (brand: BrandProfile) => {
		setSelectedBrand(brand);
	};

	const handleCloseDetail = () => {
		setSelectedBrand(null);
	};

	const handleSwipeRight = (brand: BrandProfile) => {
		setSwipedBrands((prev) => {
			if (!prev.find((b) => b.id === brand.id)) {
				toast.success("Added to your Stak", {
					description: brand.name,
					duration: 2000,
				});
				const updated = [...prev, brand];
				localStorage.setItem("my-stak", JSON.stringify(updated));
				saveStak(updated.map((b) => b.id)).catch(() => {});
				return updated;
			}
			return prev;
		});
	};

	const handleRemoveFromStak = (e: React.MouseEvent, brand: BrandProfile) => {
		e.stopPropagation();
		setSwipedBrands((prev) => {
			const updated = prev.filter((b) => b.id !== brand.id);
			localStorage.setItem("my-stak", JSON.stringify(updated));
			saveStak(updated.map((b) => b.id)).catch(() => {});
			return updated;
		});
		toast.success("Removed from your Stak", {
			description: brand.name,
			duration: 2000,
		});
	};

	// Brand Detail Overlay - portaled to body to escape page-transition transform
	const brandDetailOverlay = selectedBrand && createPortal(
		<div
			className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center sm:items-center"
			onClick={handleCloseDetail}
		>
			{/* Semi-transparent overlay showing page behind */}
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

			{/* Content sheet */}
			<div
				className="relative w-full h-[85vh] sm:h-auto sm:max-w-2xl sm:mx-4 bg-[#0b1121] rounded-t-2xl sm:rounded-2xl sm:max-h-[95vh] flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Drag handle + close button for mobile */}
				<div className="flex justify-center pt-3 pb-1 sm:hidden">
					<div className="w-12 h-1.5 bg-zinc-600 rounded-full" />
				</div>
				<button
					onClick={handleCloseDetail}
					className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors z-10 sm:hidden"
					aria-label="Close"
				>
					<X className="w-5 h-5" />
				</button>

				{/* Brand header - always visible */}
				<div className="shrink-0 px-3 pt-1 pb-2 sm:px-6 sm:pt-6 sm:pb-4">
					<div className="flex items-baseline gap-3 mb-0.5 sm:mb-2">
						<h1 className="text-2xl sm:text-4xl font-bold text-white">{selectedBrand.name}</h1>
						<span className="text-sm sm:text-lg font-mono text-zinc-400 uppercase">
							{selectedBrand.ticker}
						</span>
					</div>
					<p className="text-zinc-400 text-sm sm:text-lg italic">{selectedBrand.bio}</p>
				</div>

				{/* Scrollable content */}
				<div className="flex-1 overflow-y-auto px-3 pb-[env(safe-area-inset-bottom,12px)] sm:px-6 sm:pb-6">
					<Tabs defaultValue="vibe" className="w-full">
						<TabsList className="grid w-full grid-cols-4 bg-[#0f1629] border border-slate-700/50 shrink-0">
							<TabsTrigger
								value="vibe"
								className="!text-cyan-400/60 data-[state=active]:!bg-cyan-500/20 data-[state=active]:!text-cyan-400 text-xs sm:text-sm"
							>
								✨ Vibe
							</TabsTrigger>
							<TabsTrigger
								value="trends"
								className="!text-purple-400/60 data-[state=active]:!bg-purple-500/20 data-[state=active]:!text-purple-400 text-xs sm:text-sm"
							>
								<TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
								Trends
							</TabsTrigger>
							<TabsTrigger
								value="numbers"
								className="!text-pink-400/60 data-[state=active]:!bg-pink-500/20 data-[state=active]:!text-pink-400 text-xs sm:text-sm"
							>
								<Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
								Numbers
							</TabsTrigger>
							<TabsTrigger
								value="news"
								className="!text-orange-400/60 data-[state=active]:!bg-orange-500/20 data-[state=active]:!text-orange-400 text-xs sm:text-sm"
							>
								<Newspaper className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
								News
							</TabsTrigger>
						</TabsList>

						<TabsContent value="vibe" className="mt-1 sm:mt-6 space-y-2 sm:space-y-6">
							<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-3 sm:p-6">
								<h2 className="text-base sm:text-xl font-bold text-cyan-400 mb-2 sm:mb-4">
									{selectedBrand.culturalContext.title}
								</h2>
								<div className="space-y-2 sm:space-y-6">
									{selectedBrand.culturalContext.sections.map((section, index) => (
										<div key={index}>
											<h3 className="font-semibold text-sm sm:text-lg text-pink-400 mb-1 sm:mb-2">
												{section.heading}
											</h3>
											<p className="text-zinc-300 leading-snug sm:leading-relaxed text-xs sm:text-base">
												{section.content}
											</p>
										</div>
									))}
								</div>
							</div>

							<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-3 sm:p-6">
								<h3 className="font-semibold text-sm sm:text-lg text-white mb-2 sm:mb-4">Vibe Metrics</h3>
								<VibeSliders vibes={selectedBrand.vibes} />
							</div>
						</TabsContent>

						<TabsContent value="numbers" className="mt-1 sm:mt-6">
							<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-3 sm:p-6">
								<div className="mb-2 sm:mb-6">
									<h2 className="text-xl sm:text-2xl font-bold text-pink-400 mb-2">
										The Numbers
									</h2>
									<p className="text-zinc-400 text-xs sm:text-sm">
										Financial metrics explained in plain language
									</p>
								</div>

								<div className="grid gap-4 sm:gap-6">
									{Object.entries(selectedBrand.financials).map(([key, metric]) => (
										<div
											key={key}
											className="border-l-4 border-pink-500/50 pl-3 sm:pl-4 py-2"
										>
											<div className="flex items-baseline justify-between mb-1">
												<h3 className="font-semibold text-white text-sm sm:text-base">{metric.label}</h3>
												<span className="text-xl sm:text-2xl font-bold text-pink-400">
													{metric.value}
												</span>
											</div>
											<p className="text-xs sm:text-sm text-zinc-400 mb-2">
												{metric.explanation}
											</p>
											<p className="text-xs sm:text-sm text-cyan-400 italic">
												"{metric.culturalTranslation}"
											</p>
										</div>
									))}
								</div>
							</div>
						</TabsContent>

						<TabsContent value="trends" className="mt-1 sm:mt-6">
							<TrendCarousel
								trends={getBrandTrends(selectedBrand.id)}
								ticker={selectedBrand.ticker}
							/>
						</TabsContent>

						<TabsContent value="news" className="mt-1 sm:mt-6">
							<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-4 sm:p-6">
								<div className="mb-4 sm:mb-6">
									<h2 className="text-xl sm:text-2xl font-bold text-orange-400 mb-2">
										Recent News
									</h2>
									<p className="text-zinc-400 text-xs sm:text-sm">
										Current articles about {selectedBrand.name}
									</p>
								</div>

								<div className="space-y-3 sm:space-y-4">
									{selectedBrand.news.map((article, index) => (
										<div
											key={index}
											className="border-l-4 border-zinc-700 hover:border-orange-500/50 pl-3 sm:pl-4 py-2 sm:py-3 transition-all"
										>
											<div className="flex items-start justify-between gap-2 sm:gap-4 mb-2">
												<h3 className="font-semibold text-white leading-tight text-sm sm:text-base">
													{article.headline}
												</h3>
												<span
													className={`shrink-0 px-2 py-1 text-xs font-semibold rounded ${
														article.sentiment === "Bullish"
															? "bg-green-500/20 text-green-400"
															: article.sentiment === "Bearish"
																? "bg-red-500/20 text-red-400"
																: "bg-zinc-500/20 text-zinc-400"
													}`}
												>
													{article.sentiment}
												</span>
											</div>
											<div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-500">
												<span>{article.source}</span>
												<span>•</span>
												<span>{article.timestamp}</span>
											</div>
										</div>
									))}
								</div>
							</div>
						</TabsContent>
					</Tabs>

					<div className="mt-2 sm:mt-8 p-2 sm:p-4 bg-[#0f1629]/50 border border-slate-700/50 rounded-lg">
						<p className="text-[10px] sm:text-xs text-zinc-500 text-center">
							This is cultural context, not financial advice. We're here to explain
							why brands matter, not tell you what to invest in.
						</p>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);

	if (swipedBrands.length === 0) {
		return (
			<div className="min-h-screen bg-white dark:bg-[#0b1121] text-zinc-900 dark:text-white transition-colors duration-300">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
					<div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
						<Sparkles className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
						<h2 className="text-2xl font-bold text-zinc-700 dark:text-zinc-300 mb-2">
							Your Stak is empty.
						</h2>
						<p className="text-zinc-500 dark:text-zinc-500 max-w-md">
							Swipe right on stocks you vibe with to add them here.
						</p>
					</div>
				</div>

				<SearchView
					open={searchOpen}
					onClose={() => setSearchOpen(false)}
					onSwipeRight={handleSwipeRight}
				/>

				{brandDetailOverlay}
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-white dark:bg-[#0b1121] text-zinc-900 dark:text-white transition-colors duration-300">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
				<header className="mb-8">
					<h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent mb-2">
						My Stak
					</h1>
					<p className="text-zinc-600 dark:text-zinc-400 text-sm">
						This is your saved vibe list.
					</p>
				</header>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
					{swipedBrands.map((brand) => (
						<div
							key={brand.id}
							className="group relative overflow-hidden rounded-xl bg-white dark:bg-[#0f1629]/80 border border-zinc-200 dark:border-slate-700/50 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all p-6 text-left shadow-sm hover:shadow-lg cursor-pointer"
							onClick={() => handleBrandClick(brand)}
						>
							{/* Remove button - always visible on mobile, hover on desktop */}
							<button
								onClick={(e) => handleRemoveFromStak(e, brand)}
								className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-200 dark:bg-[#162036] hover:bg-red-500 dark:hover:bg-red-500 text-zinc-500 hover:text-white transition-all sm:opacity-0 sm:group-hover:opacity-100"
								aria-label={`Remove ${brand.name} from Stak`}
							>
								<X className="w-4 h-4" />
							</button>

							<div className="flex items-start gap-4 mb-4">
								<img
									src={getBrandLogoUrl(brand)}
									alt={`${brand.name} logo`}
									className="w-12 h-12 rounded-lg object-contain bg-white/10 animate-[flip-y_2s_linear_infinite]"
								/>
								<div className="flex-1">
									<div className="flex items-baseline gap-2 mb-1">
										<h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
											{brand.name}
										</h3>
										<span className="text-xs font-mono text-zinc-500 dark:text-zinc-500 uppercase">
											{brand.ticker}
										</span>
									</div>
									<p className="text-sm text-zinc-600 dark:text-zinc-400 italic">
										{brand.bio}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
								<span>Tap to explore</span>
								<span className="text-cyan-500 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
									→
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			<SearchView
				open={searchOpen}
				onClose={() => setSearchOpen(false)}
				onSwipeRight={handleSwipeRight}
			/>

			{brandDetailOverlay}
		</div>
	);
}
