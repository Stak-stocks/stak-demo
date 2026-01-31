import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { BrandProfile } from "@/data/brands";
import { ArrowLeft, Sparkles, Search } from "lucide-react";
import { SearchView } from "@/components/SearchView";
import { toast } from "sonner";

export const Route = createFileRoute("/my-stak")({
	component: MyStakPage,
});

function MyStakPage() {
	const navigate = useNavigate();
	const [searchOpen, setSearchOpen] = useState(false);
	const [swipedBrands, setSwipedBrands] = useState<BrandProfile[]>(() => {
		const saved = localStorage.getItem("my-stak");
		return saved ? JSON.parse(saved) : [];
	});

	const handleBrandClick = (brand: BrandProfile) => {
		navigate({
			to: "/brand/$brandId",
			params: { brandId: brand.id },
		});
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
				return updated;
			}
			return prev;
		});
	};

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
						<button
							key={brand.id}
							onClick={() => handleBrandClick(brand)}
							className="group relative overflow-hidden rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all p-6 text-left shadow-sm hover:shadow-lg"
						>
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
						</button>
					))}
				</div>
			</div>

			<SearchView
				open={searchOpen}
				onClose={() => setSearchOpen(false)}
				onSwipeRight={handleSwipeRight}
			/>
		</div>
	);
}
