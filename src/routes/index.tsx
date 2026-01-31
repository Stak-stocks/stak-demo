import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { brands, type BrandProfile } from "@/data/brands";
import { SwipeableCardStack } from "@/components/SwipeableCardStack";
import { BrandContextModal } from "@/components/BrandContextModal";
import { SearchView } from "@/components/SearchView";
import { Sparkles, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	const [selectedBrand, setSelectedBrand] = useState<BrandProfile | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [swipedBrands, setSwipedBrands] = useState<BrandProfile[]>(() => {
		const saved = localStorage.getItem("my-stak");
		return saved ? JSON.parse(saved) : [];
	});

	useEffect(() => {
		localStorage.setItem("my-stak", JSON.stringify(swipedBrands));
	}, [swipedBrands]);

	const handleLearnMore = (brand: BrandProfile) => {
		setSelectedBrand(brand);
		setModalOpen(true);
	};

	const handleSwipeRight = (brand: BrandProfile) => {
		setSwipedBrands((prev) => {
			if (!prev.find((b) => b.id === brand.id)) {
				toast.success("Added to your Stak", {
					description: brand.name,
					duration: 2000,
				});
				return [...prev, brand];
			}
			return prev;
		});
	};

	const handleCloseModal = () => {
		setModalOpen(false);
		setTimeout(() => setSelectedBrand(null), 200);
	};

	return (
		<div className="min-h-screen bg-white dark:bg-[#121212] text-zinc-900 dark:text-white transition-colors duration-300">
			<button
				onClick={() => setSearchOpen(true)}
				className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-lg"
			>
				<Search className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
			</button>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
				<header className="text-center mb-8 space-y-4">
					<div className="flex items-center justify-center gap-3 mb-4">
						<Sparkles className="w-8 h-8 text-cyan-400" />
						<h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-pink-500 to-orange-500 bg-clip-text text-transparent">
							STAK
						</h1>
						<Sparkles className="w-8 h-8 text-pink-500" />
					</div>
					<p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
						Brands as personalities, not portfolios. Zero financial advice, all the
						cultural context.
					</p>
					<p className="text-sm text-zinc-500 dark:text-zinc-500 italic">
						Swipe right to vibe, left to pass. Tap to learn more.
					</p>
				</header>

				<SwipeableCardStack
					brands={brands}
					onLearnMore={handleLearnMore}
					onSwipeRight={handleSwipeRight}
				/>

				<footer className="mt-12 text-center text-zinc-500 dark:text-zinc-500 text-sm space-y-2">
					<p>
						This is a social discovery app about brand culture, not a financial
						platform.
					</p>
					<p className="text-xs">
						No investment advice. No money stuff. Just vibes and context.
					</p>
				</footer>
			</div>

			<SearchView
				open={searchOpen}
				onClose={() => setSearchOpen(false)}
				onSwipeRight={handleSwipeRight}
			/>

			<BrandContextModal
				brand={selectedBrand}
				open={modalOpen}
				onClose={handleCloseModal}
				onAddToStak={handleSwipeRight}
			/>
		</div>
	);
}
