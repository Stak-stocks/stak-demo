import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { brands, type BrandProfile } from "@/data/brands";
import { SwipeableCardStack } from "@/components/SwipeableCardStack";
import { BrandContextModal } from "@/components/BrandContextModal";
import { IntelCardModal } from "@/components/IntelCardModal";
import { INTEL_CARDS, type IntelCard } from "@/data/intelCards";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { saveStak, savePassedBrands, getIntelCards, getIntelState, saveIntelState } from "@/lib/api";
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

	// Fetch AI-generated intel cards (falls back to hardcoded set)
	const { data: intelCardsData } = useQuery({
		queryKey: ["intel-cards"],
		queryFn: getIntelCards,
		staleTime: 7 * 24 * 60 * 60 * 1000,
		gcTime: 7 * 24 * 60 * 60 * 1000,
		retry: 1,
	});
	const allIntelCards: IntelCard[] = useMemo(
		() => intelCardsData?.cards ?? INTEL_CARDS,
		[intelCardsData],
	);

	// Shuffled queue — persisted in localStorage so no card repeats until all seen
	const intelQueue = useRef<string[]>([]);
	const intelReadIds = useRef<string[]>([]);
	const [activeIntelCard, setActiveIntelCard] = useState<IntelCard | null>(null);
	const swipesSinceIntel = useRef(0);

	// Load or initialise the queue from localStorage
	useEffect(() => {
		if (allIntelCards.length === 0) return;
		const saved = localStorage.getItem("intel-card-queue");
		const remaining: string[] = saved ? JSON.parse(saved) : [];
		// If queue is empty (first time or fully exhausted), build a new shuffled one
		if (remaining.length === 0) {
			intelQueue.current = allIntelCards.map((c) => c.id).sort(() => Math.random() - 0.5);
		} else {
			intelQueue.current = remaining;
		}
	}, [allIntelCards]);

	// Seed local state from Firestore on mount so queue stays in sync across devices
	useEffect(() => {
		getIntelState()
			.then(({ lastDate, queue, readIds }) => {
				if (lastDate) {
					localStorage.setItem("intel-card-last-date", lastDate);
				} else {
					// New or re-created account — clear any stale state left from a previous account
					localStorage.removeItem("intel-card-last-date");
					localStorage.removeItem("intel-card-queue");
					intelQueue.current = INTEL_CARDS.map((c) => c.id).sort(() => Math.random() - 0.5);
				}
				if (queue.length > 0) {
					localStorage.setItem("intel-card-queue", JSON.stringify(queue));
					intelQueue.current = queue;
				}
				intelReadIds.current = readIds ?? [];
			})
			.catch(() => {}); // Not authenticated or offline — local state persists
	}, []);

	const [swipedBrands, setSwipedBrands] = useState<BrandProfile[]>(() => {
		const saved = localStorage.getItem("my-stak");
		return saved ? JSON.parse(saved) : [];
	});
	const [swapPickerOpen, setSwapPickerOpen] = useState(false);
	const [pendingBrand, setPendingBrand] = useState<BrandProfile | null>(null);

	// Track left-swiped (passed) brands so they don't reappear on navigation
	// Passed brands expire after 2 days so users get another chance
	const [passedBrandIds, setPassedBrandIds] = useState<Set<string>>(() => {
		const saved = localStorage.getItem("passed-brands");
		if (!saved) return new Set();
		const entries: { id: string; at: number }[] = JSON.parse(saved);
		const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
		const active = entries.filter((e) => e.at > twoDaysAgo);
		if (active.length !== entries.length) {
			localStorage.setItem("passed-brands", JSON.stringify(active));
		}
		return new Set(active.map((e) => e.id));
	});

	// Compute stable recommended brand order once per session
	// Persisted in sessionStorage so tab navigation doesn't reshuffle
	const [recommendedOrder] = useState<BrandProfile[]>(() => {
		// Check sessionStorage for a previously computed order
		const cached = sessionStorage.getItem("stak-deck-order");
		if (cached) {
			try {
				const ids: string[] = JSON.parse(cached);
				const brandMap = new Map(brands.map((b) => [b.id, b]));
				const restored = ids.map((id) => brandMap.get(id)).filter(Boolean) as BrandProfile[];
				if (restored.length === brands.length) return restored;
			} catch { /* fall through to recompute */ }
		}

		const interests: string[] = JSON.parse(
			localStorage.getItem("user-interests") || "[]",
		);

		let order: BrandProfile[];

		// No interests saved — just shuffle everything
		if (interests.length === 0) {
			order = shuffleArray(brands);
		} else {
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

			order = [
				...shuffled1.slice(0, 5),
				...shuffleArray([...shuffled1.slice(5), ...shuffled2]),
				...shuffled3,
			];
		}

		// Cache the order for this session
		sessionStorage.setItem("stak-deck-order", JSON.stringify(order.map((b) => b.id)));
		return order;
	});

	useEffect(() => {
		localStorage.setItem("my-stak", JSON.stringify(swipedBrands));
		saveStak(swipedBrands.map((b) => b.id)).catch(() => {});
		globalThis.dispatchEvent(new CustomEvent('stak-updated'));
	}, [swipedBrands]);

	const handleSwipe = useCallback(() => {
		// Trigger after every 5th swipe, but at most once per day
		swipesSinceIntel.current += 1;
		if (swipesSinceIntel.current < 5) return;
		swipesSinceIntel.current = 0;

		const today = new Date().toISOString().split("T")[0];
		if (localStorage.getItem("intel-card-last-date") === today) return;
		localStorage.setItem("intel-card-last-date", today);

		// If queue exhausted, reshuffle all cards into a new random order
		if (intelQueue.current.length === 0) {
			intelQueue.current = allIntelCards.map((c) => c.id).sort(() => Math.random() - 0.5);
		}

		const nextId = intelQueue.current.shift()!;
		localStorage.setItem("intel-card-queue", JSON.stringify(intelQueue.current));

		// Track as read for the Intel Library on the profile page
		if (!intelReadIds.current.includes(nextId)) {
			intelReadIds.current = [...intelReadIds.current, nextId];
		}

		// Persist to Firestore so other devices stay in sync
		saveIntelState(today, intelQueue.current, intelReadIds.current).catch(() => {});

		const card = allIntelCards.find((c) => c.id === nextId) ?? allIntelCards[0];
		setActiveIntelCard(card);
	}, [allIntelCards]);

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

	const handleSwipeLeft = (brand: BrandProfile) => {
		setPassedBrandIds((prev) => {
			const next = new Set(prev);
			next.add(brand.id);
			// Persist with timestamps for 2-day expiry
			const saved = localStorage.getItem("passed-brands");
			const entries: { id: string; at: number }[] = saved ? JSON.parse(saved) : [];
			if (!entries.some((e) => e.id === brand.id)) {
				entries.push({ id: brand.id, at: Date.now() });
			}
			localStorage.setItem("passed-brands", JSON.stringify(entries));
			// Sync to backend for cross-device persistence
			savePassedBrands(entries).catch(() => {});
			return next;
		});
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
		<div className="bg-background text-zinc-900 dark:text-white transition-colors duration-300">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-6">
				<div className="flex flex-col items-center mb-2 sm:mb-6">
					<h1 className="text-4xl sm:text-5xl font-extrabold tracking-wider italic bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent">
						STAK
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Swipe right to vibe, left to pass</p>
				</div>

				<SwipeableCardStack
					brands={recommendedOrder.filter(
						(brand) =>
							!swipedBrands.some((b) => b.id === brand.id) &&
							!passedBrandIds.has(brand.id),
					)}
					onLearnMore={handleLearnMore}
					onSwipeRight={handleSwipeRight}
					onSwipeLeft={handleSwipeLeft}
					onSwipe={handleSwipe}
				/>
			</div>

			<BrandContextModal
				brand={selectedBrand}
				open={modalOpen}
				onClose={handleCloseModal}
				onAddToStak={handleSwipeRight}
			/>

			{activeIntelCard && (
				<IntelCardModal
					card={activeIntelCard}
					onDismiss={() => setActiveIntelCard(null)}
				/>
			)}

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
