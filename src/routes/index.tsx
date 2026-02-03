import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { brands, type BrandProfile } from "@/data/brands";
import { SwipeableCardStack } from "@/components/SwipeableCardStack";
import { BrandContextModal } from "@/components/BrandContextModal";
import { SearchView } from "@/components/SearchView";
import { Sparkles, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

const STAK_CAPACITY = 15;

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
	const [swapPickerOpen, setSwapPickerOpen] = useState(false);
	const [pendingBrand, setPendingBrand] = useState<BrandProfile | null>(null);

	useEffect(() => {
		localStorage.setItem("my-stak", JSON.stringify(swipedBrands));
	}, [swipedBrands]);

	const handleLearnMore = (brand: BrandProfile) => {
		setSelectedBrand(brand);
		setModalOpen(true);
	};

	const handleSwipeRight = (brand: BrandProfile) => {
		// Check if already in stak before showing toast (avoid duplicate toasts from StrictMode)
		const alreadyInStak = swipedBrands.find((b) => b.id === brand.id);
		if (!alreadyInStak) {
			// Check if at capacity
			if (swipedBrands.length >= STAK_CAPACITY) {
				// Store the pending brand and open swap picker
				setPendingBrand(brand);
				setSwapPickerOpen(true);
				toast.info("Your Stak is full!", {
					description: "Pick a stock to swap out",
					duration: 2000,
				});
			} else {
				toast.success("Added to your Stak", {
					description: brand.name,
					duration: 2000,
				});
				setSwipedBrands((prev) => [...prev, brand]);
			}
		}
	};

	const handleSwapStock = (brandToRemove: BrandProfile) => {
		if (!pendingBrand) return;

		setSwipedBrands((prev) => {
			const filtered = prev.filter((b) => b.id !== brandToRemove.id);
			return [...filtered, pendingBrand];
		});

		toast.success(`Swapped ${brandToRemove.name} for ${pendingBrand.name}`, {
			duration: 2000,
		});

		setPendingBrand(null);
		setSwapPickerOpen(false);
	};

	const handleCancelSwap = () => {
		setPendingBrand(null);
		setSwapPickerOpen(false);
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
						Swipe the market to your taste
					</p>
					<p className="text-sm text-zinc-500 dark:text-zinc-500 italic">
						Swipe right to vibe, left to pass. Tap to learn more.
					</p>
				</header>

				<SwipeableCardStack
					brands={brands.filter(
						(brand) => !swipedBrands.some((b) => b.id === brand.id)
					)}
					onLearnMore={handleLearnMore}
					onSwipeRight={handleSwipeRight}
				/>

				<footer className="mt-16 sm:mt-12 text-center text-zinc-500 dark:text-zinc-500 text-sm space-y-2">
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

			{/* Swap Picker Sheet - shown when Stak is full */}
			<Sheet open={swapPickerOpen} onOpenChange={(open) => !open && handleCancelSwap()}>
				<SheetContent side="bottom" className="bg-zinc-900 border-zinc-800 h-[70vh]">
					<SheetHeader className="mb-4">
						<SheetTitle className="text-white text-xl flex items-center gap-2">
							<AlertTriangle className="w-5 h-5 text-orange-500" />
							Stak Full - Pick One to Swap
						</SheetTitle>
					</SheetHeader>

					{pendingBrand && (
						<div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
							<p className="text-green-400 text-sm">
								Adding: <span className="font-bold">{pendingBrand.name}</span> ({pendingBrand.ticker})
							</p>
						</div>
					)}

					<p className="text-zinc-400 text-sm mb-4">
						Tap a stock below to remove it and add {pendingBrand?.name}:
					</p>

					<div className="space-y-3 overflow-y-auto max-h-[calc(70vh-200px)] pb-4">
						{swipedBrands.map((brand) => (
							<button
								type="button"
								key={brand.id}
								onClick={() => handleSwapStock(brand)}
								className="w-full text-left p-4 rounded-xl border-2 border-zinc-700 bg-zinc-800/50 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
							>
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center text-xl font-bold shrink-0">
										{brand.ticker.charAt(0)}
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="font-bold text-white">{brand.name}</h3>
										<span className="text-xs font-mono text-zinc-500 uppercase">
											{brand.ticker}
										</span>
									</div>
									<span className="text-red-400 text-sm">Tap to swap</span>
								</div>
							</button>
						))}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
