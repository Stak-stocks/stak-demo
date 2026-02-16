import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { brands, type BrandProfile } from "@/data/brands";
import { SwipeableCardStack } from "@/components/SwipeableCardStack";
import { BrandContextModal } from "@/components/BrandContextModal";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { saveStak } from "@/lib/api";
import { INTEREST_TO_BRANDS } from "@/data/onboarding";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

const STAK_CAPACITY = 15;

// Reverse mapping: brand ID → interest categories it belongs to
const BRAND_TO_CATEGORIES: Record<string, string[]> = {};
for (const [category, brandIds] of Object.entries(INTEREST_TO_BRANDS)) {
	for (const id of brandIds) {
		if (!BRAND_TO_CATEGORIES[id]) BRAND_TO_CATEGORIES[id] = [];
		BRAND_TO_CATEGORIES[id].push(category);
	}
}

function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	const [selectedBrand, setSelectedBrand] = useState<BrandProfile | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	const [swipedBrands, setSwipedBrands] = useState<BrandProfile[]>(() => {
		const saved = localStorage.getItem("my-stak");
		return saved ? JSON.parse(saved) : [];
	});
	const [swapPickerOpen, setSwapPickerOpen] = useState(false);
	const [pendingBrand, setPendingBrand] = useState<BrandProfile | null>(null);

	// Compute stable recommended brand order once on mount
	// Tier 1: First 5 from user's onboarding interests
	// Tier 2: Related brands (share categories with interest brands)
	// Tier 3: Everything else (random discovery)
	const [recommendedOrder] = useState<BrandProfile[]>(() => {
		const interests: string[] = JSON.parse(
			localStorage.getItem("user-interests") || "[]",
		);

		// No interests saved — just shuffle everything
		if (interests.length === 0) return shuffleArray(brands);

		// Tier 1: Direct interest matches
		const interestBrandIds = new Set(
			interests.flatMap((i) => INTEREST_TO_BRANDS[i] || []),
		);

		// Find expanded categories (all categories that interest brands belong to)
		const expandedCategories = new Set<string>();
		for (const id of interestBrandIds) {
			(BRAND_TO_CATEGORIES[id] || []).forEach((c) => expandedCategories.add(c));
		}

		// Tier 2: Brands in adjacent categories but not direct interest matches
		const adjacentBrandIds = new Set<string>();
		for (const cat of expandedCategories) {
			(INTEREST_TO_BRANDS[cat] || []).forEach((id) => {
				if (!interestBrandIds.has(id)) adjacentBrandIds.add(id);
			});
		}

		const tier1 = brands.filter((b) => interestBrandIds.has(b.id));
		const tier2 = brands.filter((b) => adjacentBrandIds.has(b.id));
		const tier3 = brands.filter(
			(b) => !interestBrandIds.has(b.id) && !adjacentBrandIds.has(b.id),
		);

		const shuffled1 = shuffleArray(tier1);
		const shuffled2 = shuffleArray(tier2);
		const shuffled3 = shuffleArray(tier3);

		return [
			...shuffled1.slice(0, 5),
			...shuffleArray([...shuffled1.slice(5), ...shuffled2]),
			...shuffled3,
		];
	});

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
		<div className="bg-white dark:bg-[#0b1121] text-zinc-900 dark:text-white transition-colors duration-300">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
				<div className="flex flex-col items-center mb-6">
					<h1 className="text-4xl sm:text-5xl font-extrabold tracking-wider italic bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent">
						STAK
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Swipe right to vibe, left to pass</p>
				</div>

				<SwipeableCardStack
					brands={recommendedOrder.filter(
						(brand) => !swipedBrands.some((b) => b.id === brand.id),
					)}
					onLearnMore={handleLearnMore}
					onSwipeRight={handleSwipeRight}
				/>
			</div>

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
