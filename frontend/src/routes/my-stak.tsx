import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { BrandProfile } from "@/data/brands";
import { ArrowLeft, Sparkles, Search, TrendingUp, Newspaper, X } from "lucide-react";
import { SearchView } from "@/components/SearchView";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VibeSliders } from "@/components/VibeSliders";
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

	// Brand Detail Overlay - reusable across both states
	const brandDetailOverlay = selectedBrand && (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center"
			onClick={handleCloseDetail}
		>
			{/* Semi-transparent overlay showing page behind */}
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

			{/* Content sheet */}
			<div
				className="relative w-full sm:max-w-2xl sm:mx-4 bg-[#121212] rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Drag handle indicator for mobile */}
				<div className="flex justify-center pt-4 pb-2 sm:hidden">
					<div className="w-12 h-1.5 bg-zinc-600 rounded-full" />
				</div>

				<div className="px-6 pb-6 pt-2 sm:pt-6">
					<div className="mb-6">
						<div className="flex items-baseline gap-3 mb-2">
							<h1 className="text-3xl sm:text-4xl font-bold text-white">{selectedBrand.name}</h1>
							<span className="text-base sm:text-lg font-mono text-zinc-400 uppercase">
								{selectedBrand.ticker}
							</span>
						</div>
						<p className="text-zinc-400 text-base sm:text-lg italic">{selectedBrand.bio}</p>
					</div>

					<Tabs defaultValue="vibe" className="w-full">
						<TabsList className="grid w-full grid-cols-3 bg-zinc-900 border border-zinc-800">
							<TabsTrigger
								value="vibe"
								className="text-zinc-200 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs sm:text-sm"
							>
								✨ Vibe
							</TabsTrigger>
							<TabsTrigger
								value="numbers"
								className="text-zinc-200 data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400 text-xs sm:text-sm"
							>
								<TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
								Numbers
							</TabsTrigger>
							<TabsTrigger
								value="news"
								className="text-zinc-200 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 text-xs sm:text-sm"
							>
								<Newspaper className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
								News
							</TabsTrigger>
						</TabsList>

						<TabsContent value="vibe" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
							<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6">
								<h2 className="text-lg sm:text-xl font-bold text-cyan-400 mb-3 sm:mb-4">
									{selectedBrand.culturalContext.title}
								</h2>
								<div className="space-y-4 sm:space-y-6">
									{selectedBrand.culturalContext.sections.map((section, index) => (
										<div key={index}>
											<h3 className="font-semibold text-base sm:text-lg text-pink-400 mb-2">
												{section.heading}
											</h3>
											<p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
												{section.content}
											</p>
										</div>
									))}
								</div>
							</div>

							<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6">
								<h3 className="font-semibold text-base sm:text-lg text-white mb-3 sm:mb-4">Vibe Metrics</h3>
								<VibeSliders vibes={selectedBrand.vibes} />
							</div>
						</TabsContent>

						<TabsContent value="numbers" className="mt-4 sm:mt-6">
							<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6">
								<div className="mb-4 sm:mb-6">
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

						<TabsContent value="news" className="mt-4 sm:mt-6">
							<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6">
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

					<div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
						<p className="text-xs text-zinc-500 text-center">
							This is cultural context, not financial advice. We're here to explain
							why brands matter, not tell you what to invest in.
						</p>
					</div>
				</div>
			</div>
		</div>
	);

	if (swipedBrands.length === 0) {
		return (
			<div className="min-h-screen bg-white dark:bg-[#121212] text-zinc-900 dark:text-white transition-colors duration-300">
				<button
					onClick={() => setSearchOpen(true)}
					className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-lg"
				>
					<Search className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
				</button>

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-8"
					>
						<ArrowLeft className="w-5 h-5" />
						<span>Back to Discovery</span>
					</Link>

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
		<div className="min-h-screen bg-white dark:bg-[#121212] text-zinc-900 dark:text-white transition-colors duration-300">
			<button
				onClick={() => setSearchOpen(true)}
				className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-lg"
			>
				<Search className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
			</button>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-8"
				>
					<ArrowLeft className="w-5 h-5" />
					<span>Back to Discovery</span>
				</Link>

				<header className="mb-8">
					<h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent mb-2">
						My Stak
					</h1>
					<p className="text-zinc-600 dark:text-zinc-400 text-sm">
						This is your saved vibe list.
					</p>
				</header>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{swipedBrands.map((brand) => (
						<div
							key={brand.id}
							className="group relative overflow-hidden rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all p-6 text-left shadow-sm hover:shadow-lg cursor-pointer"
							onClick={() => handleBrandClick(brand)}
						>
							{/* Remove button - always visible on mobile, hover on desktop */}
							<button
								onClick={(e) => handleRemoveFromStak(e, brand)}
								className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-red-500 dark:hover:bg-red-500 text-zinc-500 hover:text-white transition-all sm:opacity-0 sm:group-hover:opacity-100"
								aria-label={`Remove ${brand.name} from Stak`}
							>
								<X className="w-4 h-4" />
							</button>

							<div className="flex items-start gap-4 mb-4">
								<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center text-2xl font-bold text-zinc-900 dark:text-white">
									{brand.ticker.charAt(0)}
								</div>
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
