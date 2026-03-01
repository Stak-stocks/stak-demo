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
import { getIntelCards } from "@/lib/api";
import { useSwipeLimit, DAILY_SWIPE_LIMIT } from "@/hooks/useSwipeLimit";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import type { PassedEntry } from "@/context/AccountContext";
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
	const { user } = useAuth();
	const { account, updateStak, updatePassedBrands, updateDeckOrder, updateIntelState, updateStreak } = useAccount();
	const uid = user?.uid ?? "guest";
	const SWIPE_KEY = `swipes-since-intel:${uid}`;
	const INTEL_DATE_KEY = `intel-card-last-date:${uid}`;

	const [selectedBrand, setSelectedBrand] = useState<BrandProfile | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	const { hasReachedLimit, increment: incrementSwipe } = useSwipeLimit(uid, !!user);

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

	// Intel card state — persisted in Firestore via AccountContext
	const intelQueue = useRef<string[]>([]);
	const intelReadIds = useRef<string[]>([]);
	const [activeIntelCard, setActiveIntelCard] = useState<IntelCard | null>(null);
	const swipesSinceIntel = useRef(parseInt(localStorage.getItem(SWIPE_KEY) ?? "0", 10));

	// Initialise intel queue from account (Firestore) — only on allIntelCards change
	// account is guaranteed loaded here (accountLoading gated in __root.tsx)
	useEffect(() => {
		if (allIntelCards.length === 0) return;

		const intelState = account?.intelCardState;
		if (intelState?.queue?.length) {
			intelQueue.current = intelState.queue;
		} else {
			intelQueue.current = allIntelCards.map((c) => c.id).sort(() => Math.random() - 0.5);
		}
		intelReadIds.current = intelState?.readIds ?? [];

		// Mirror lastDate to localStorage for fast same-tab read in handleSwipe
		if (intelState?.lastDate) {
			localStorage.setItem(INTEL_DATE_KEY, intelState.lastDate);
		} else {
			localStorage.removeItem(INTEL_DATE_KEY);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allIntelCards]);

	// ── Stak — initialised from Firestore account ──────────────────────────────
	const [swipedBrands, setSwipedBrands] = useState<BrandProfile[]>(() => {
		const brandMap = new Map(brands.map((b) => [b.id, b]));
		return (account?.stakBrandIds ?? [])
			.map((id) => brandMap.get(id))
			.filter(Boolean) as BrandProfile[];
	});
	const [swapPickerOpen, setSwapPickerOpen] = useState(false);
	const [pendingBrand, setPendingBrand] = useState<BrandProfile | null>(null);

	// ── Passed brands — initialised from Firestore account ────────────────────
	const [passedBrandIds, setPassedBrandIds] = useState<Set<string>>(() => {
		const entries = account?.passedBrands ?? [];
		const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
		const active = entries.filter((e) => e.at > twoDaysAgo);
		return new Set(active.map((e) => e.id));
	});

	// Ref keeps the latest passed entries for use in stable callbacks
	const passedEntriesRef = useRef<PassedEntry[]>(account?.passedBrands ?? []);
	useEffect(() => {
		passedEntriesRef.current = account?.passedBrands ?? [];
	}, [account?.passedBrands]);

	// ── Deck order — reactive init so it always reads correct Firestore state ──
	// Lazy useState would capture account at mount time; if preferences arrive
	// slightly after (e.g. right after onboarding) the order would be random.
	// Using useEffect + ref lets us wait until account is definitively ready.
	const [recommendedOrder, setRecommendedOrder] = useState<BrandProfile[]>([]);
	const orderInitialized = useRef(false);

	useEffect(() => {
		// Only initialize once per component lifecycle; skip if account not yet loaded
		if (orderInitialized.current || !account) return;
		orderInitialized.current = true;

		let order: BrandProfile[];
		const deckOrder = account.deckOrder;

		if (deckOrder?.length) {
			// Restore saved order — append any brands added to the data since it was saved
			const brandMap = new Map(brands.map((b) => [b.id, b]));
			const restored = deckOrder
				.map((id) => brandMap.get(id))
				.filter(Boolean) as BrandProfile[];
			if (restored.length > 0) {
				const restoredIdSet = new Set(deckOrder);
				const newBrands = brands.filter((b) => !restoredIdSet.has(b.id));
				order = newBrands.length > 0 ? [...restored, ...shuffleArray(newBrands)] : restored;
				setRecommendedOrder(order);
				return; // already persisted — no need to re-save
			}
		}

		// Compute personalised order: onboarding swipes first, then interest tiers
		const interests: string[] = account.preferences?.interests ?? [];
		const onboardingSwipes = new Set<string>(account.preferences?.onboardingSwipes ?? []);

		if (interests.length === 0 && onboardingSwipes.size === 0) {
			order = shuffleArray(brands);
		} else {
			const interestBrandIds = new Set(
				interests.flatMap((i) => INTEREST_TO_BRANDS[i] || []),
			);
			const expandedCategories = new Set<string>();
			for (const id of interestBrandIds) {
				(BRAND_TO_CATEGORIES[id] || []).forEach((c) => expandedCategories.add(c));
			}
			const adjacentBrandIds = new Set<string>();
			for (const cat of expandedCategories) {
				(INTEREST_TO_BRANDS[cat] || []).forEach((id) => {
					if (!interestBrandIds.has(id)) adjacentBrandIds.add(id);
				});
			}
			// Exclude onboarding-swiped brands from tiers (they go first)
			const tier1 = brands.filter((b) => interestBrandIds.has(b.id) && !onboardingSwipes.has(b.id));
			const tier2 = brands.filter((b) => adjacentBrandIds.has(b.id) && !onboardingSwipes.has(b.id));
			const tier3 = brands.filter(
				(b) => !interestBrandIds.has(b.id) && !adjacentBrandIds.has(b.id) && !onboardingSwipes.has(b.id),
			);
			const shuffled1 = shuffleArray(tier1);
			const shuffled2 = shuffleArray(tier2);
			const shuffled3 = shuffleArray(tier3);
			const tiered = [
				...shuffled1.slice(0, 5),
				...shuffleArray([...shuffled1.slice(5), ...shuffled2]),
				...shuffled3,
			];
			const pinned = shuffleArray(brands.filter((b) => onboardingSwipes.has(b.id)));
			order = [...pinned, ...tiered];
		}

		setRecommendedOrder(order);
		// Persist this freshly-computed order so reloads restore the same sequence
		updateDeckOrder(order.map((b) => b.id)).catch(() => {});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account]);

	const handleSwipe = useCallback(() => {
		// Update daily streak (once per day)
		const swipeDay = new Date().toISOString().split("T")[0];
		const streakRaw = localStorage.getItem("stak-streak");
		const streakData: { date: string; count: number } = streakRaw ? JSON.parse(streakRaw) : { date: "", count: 0 };
		if (streakData.date !== swipeDay) {
			const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
			const newCount = streakData.date === yesterday ? streakData.count + 1 : 1;
			const newStreak = { date: swipeDay, count: newCount };
			localStorage.setItem("stak-streak", JSON.stringify(newStreak));
			updateStreak(newStreak).catch(() => {});
		}

		// Trigger intel card after every 5th swipe, at most once per day
		swipesSinceIntel.current += 1;
		localStorage.setItem(SWIPE_KEY, String(swipesSinceIntel.current));
		if (swipesSinceIntel.current < 5) return;
		swipesSinceIntel.current = 0;
		localStorage.setItem(SWIPE_KEY, "0");

		const today = new Date().toISOString().split("T")[0];
		const lastIntelDate = localStorage.getItem(INTEL_DATE_KEY);
		if (lastIntelDate === today) return;

		if (intelQueue.current.length === 0) {
			intelQueue.current = allIntelCards.map((c) => c.id).sort(() => Math.random() - 0.5);
		}

		const nextId = intelQueue.current.shift()!;
		if (!intelReadIds.current.includes(nextId)) {
			intelReadIds.current = [...intelReadIds.current, nextId];
		}

		localStorage.setItem(INTEL_DATE_KEY, today);
		updateIntelState({
			lastDate: today,
			queue: intelQueue.current,
			readIds: intelReadIds.current,
		}).catch(() => {});

		const card = allIntelCards.find((c) => c.id === nextId) ?? allIntelCards[0];
		setActiveIntelCard(card);
	}, [allIntelCards, SWIPE_KEY, INTEL_DATE_KEY, updateIntelState, updateStreak]);

	const handleLearnMore = (brand: BrandProfile) => {
		setSelectedBrand(brand);
		setModalOpen(true);
	};

	const handleSwipeRight = (brand: BrandProfile) => {
		if (swipedBrands.find((b) => b.id === brand.id)) return;

		if (swipedBrands.length >= STAK_CAPACITY) {
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
			const updated = [...swipedBrands, brand];
			setSwipedBrands(updated);
			updateStak(updated.map((b) => b.id)).catch(() => {});
		}
	};

	// Search adds: enforce limit cross-device via AccountContext
	const handleAddFromSearch = (brand: BrandProfile) => {
		const alreadyInStak = swipedBrands.find((b) => b.id === brand.id);
		if (!alreadyInStak && hasReachedLimit) {
			toast.error("Daily limit reached", {
				description: `You've used all ${DAILY_SWIPE_LIMIT} swipes today. Come back tomorrow!`,
				duration: 3000,
			});
			return;
		}
		if (!alreadyInStak) incrementSwipe();
		handleSwipeRight(brand);
	};

	const handleSwapStock = (brandToRemove: BrandProfile) => {
		if (!pendingBrand) return;
		const updated = [
			...swipedBrands.filter((b) => b.id !== brandToRemove.id),
			pendingBrand,
		];
		setSwipedBrands(updated);
		updateStak(updated.map((b) => b.id)).catch(() => {});
		toast.success(`Swapped ${brandToRemove.name} for ${pendingBrand.name}`, {
			duration: 2000,
		});
		setPendingBrand(null);
		setSwapPickerOpen(false);
	};

	const handleSwipeLeft = useCallback((brand: BrandProfile) => {
		setPassedBrandIds((prev) => new Set([...prev, brand.id]));
		const existing = passedEntriesRef.current;
		if (!existing.some((e) => e.id === brand.id)) {
			const updated = [...existing, { id: brand.id, at: Date.now() }];
			passedEntriesRef.current = updated;
			updatePassedBrands(updated).catch(() => {});
		}
	}, [updatePassedBrands]);

	const handleCancelSwap = () => {
		setPendingBrand(null);
		setSwapPickerOpen(false);
	};

	const handleCloseModal = () => {
		setModalOpen(false);
		setTimeout(() => setSelectedBrand(null), 200);
	};

	return (
		<div className="bg-background text-zinc-900 dark:text-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-6">
				<div className="flex flex-col items-center mb-2 sm:mb-6">
					<h1 className="text-4xl sm:text-5xl font-extrabold tracking-wider italic bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent">
						STAK
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Swipe right to vibe, left to pass</p>
				</div>

				<SwipeableCardStack
					brands={[
						...recommendedOrder,
					].filter(
						(brand) =>
							!swipedBrands.some((b) => b.id === brand.id) &&
							!passedBrandIds.has(brand.id),
					)}
					onLearnMore={handleLearnMore}
					onSwipeRight={handleSwipeRight}
					onSwipeLeft={handleSwipeLeft}
					onSwipe={handleSwipe}
					hasReachedLimit={hasReachedLimit}
					onIncrement={incrementSwipe}
				/>
			</div>

			<BrandContextModal
				brand={selectedBrand}
				open={modalOpen}
				onClose={handleCloseModal}
				onAddToStak={handleAddFromSearch}
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
