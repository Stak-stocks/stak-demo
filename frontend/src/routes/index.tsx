import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { brands, type BrandProfile } from "@/data/brands";
import { SwipeableCardStack } from "@/components/SwipeableCardStack";
import { BrandContextModal } from "@/components/BrandContextModal";
import { SearchView } from "@/components/SearchView";
import { Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { saveStak } from "@/lib/api";
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
		saveStak(swipedBrands.map((b) => b.id)).catch(() => {});
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
		<div className="min-h-screen bg-white dark:bg-[#0b1121] text-zinc-900 dark:text-white transition-colors duration-300">
			<button
				onClick={() => setSearchOpen(true)}
				className="fixed top-4 left-4 z-50 p-2 rounded-full bg-[#0f1629]/80 hover:bg-[#162036] border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
			>
				<Search className="w-5 h-5" />
			</button>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
				<header className="text-center mb-6">
					<h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-[#7BA4F7] via-[#A78BDB] to-[#C97BB2] bg-clip-text text-transparent">
						STAK
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
						Swipe right to vibe, left to pass
					</p>
				</header>

				<SwipeableCardStack
					brands={brands.filter(
						(brand) => !swipedBrands.some((b) => b.id === brand.id)
					)}
					onLearnMore={handleLearnMore}
					onSwipeRight={handleSwipeRight}
				/>

				<footer className="mt-12 sm:mt-10 text-center text-slate-600 dark:text-slate-500 text-xs">
					<p>Not financial advice. Just vibes and context.</p>
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
				<SheetContent side="bottom" className="bg-[#0f1629] border-slate-700/50 h-[70vh]">
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
								className="w-full text-left p-4 rounded-xl border-2 border-slate-700/50 bg-[#162036]/50 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
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
