import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type BrandSummary, STAK_WEIGHTED_STOCK_TAGS, computeRecommendationScore as computeRecScore, type RecommendationFreshness } from "@stak/shared";
import { useBrandsList } from "@/hooks/useBrandsList";
import { SwipeableCardStack } from "@/components/SwipeableCardStack";
import { BrandContextModal } from "@/components/BrandContextModal";
import React from "react";
import { AlertTriangle, Search, Brain, Flame, BarChart3, Coffee, Zap, Shield, MessageCircle, Gamepad2, ShoppingBag, Music } from "lucide-react";
import stakLogo from "@/assets/stak-logo-icon.svg";
import stakLogoColor from "@/assets/stak-logo-color.svg";
import { toast } from "sonner";
import { recordEngagement, trackEvent, getMarketEarnings, getDailyBrief, getRecommendationFreshness, getSortedRecommendations } from "@/lib/api";
import { marketSessionBucket, getTodayKey, getYesterdayKey, getEasternDateKey } from "@/lib/utils";
import { useSwipeLimit, DAILY_SWIPE_LIMIT } from "@/hooks/useSwipeLimit";
import { STAK_CAPACITY } from "@/lib/constants";
import type { StreakUpdate } from "@/components/SwipeableCardStack";
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

// ── Category display config ────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: "blue" | "purple" | "yellow" }> = {
	tech:       { label: "Tech Curious",      icon: <Brain size={11} />,        color: "blue"   },
	gaming:     { label: "Gaming",             icon: <Gamepad2 size={11} />,     color: "purple" },
	streaming:  { label: "Streaming",          icon: <MessageCircle size={11} />,color: "purple" },
	fashion:    { label: "Fashion",            icon: <ShoppingBag size={11} />,  color: "blue"   },
	food_drink: { label: "Consumer Brands",    icon: <Coffee size={11} />,       color: "purple" },
	travel:     { label: "Travel & Leisure",   icon: <Zap size={11} />,          color: "blue"   },
	fitness:    { label: "Fitness & Health",   icon: <Shield size={11} />,       color: "yellow" },
	finance:    { label: "Finance Savvy",      icon: <BarChart3 size={11} />,    color: "blue"   },
	beauty:     { label: "Beauty & Wellness",  icon: <Shield size={11} />,       color: "yellow" },
	music:      { label: "Music & Media",      icon: <Music size={11} />,        color: "purple" },
	shopping:   { label: "Retail & Shopping",  icon: <ShoppingBag size={11} />,  color: "blue"   },
	energy:     { label: "Clean Energy",       icon: <Zap size={11} />,          color: "purple" },
};



// Reverse mapping: brand ID → interest categories it belongs to
const BRAND_TO_CATEGORIES: Record<string, string[]> = {};
for (const [category, brandIds] of Object.entries(INTEREST_TO_BRANDS)) {
	for (const id of brandIds) {
		if (!BRAND_TO_CATEGORIES[id]) BRAND_TO_CATEGORIES[id] = [];
		BRAND_TO_CATEGORIES[id].push(category);
	}
}

const TICKER_TAG_MAP = new Map(
	STAK_WEIGHTED_STOCK_TAGS.map((s) => [s.ticker.toUpperCase(), s]),
);

function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// Recommendation-scoring formula itself lives in @stak/shared so the live Discover
// deck (here) and the backend's /api/recommendations/debug endpoint can't drift apart.
function computeRecommendationScore(
	brand: BrandSummary,
	tagScores: Record<string, number>,
	freshness: RecommendationFreshness,
	recentlyShownCats: string[],
	todayThemes: string[],
): number {
	const ticker = brand.ticker?.toUpperCase() ?? "";
	const stock = TICKER_TAG_MAP.get(ticker);
	return computeRecScore(ticker, stock, tagScores, freshness, todayThemes, recentlyShownCats).finalScore;
}

export const Route = createFileRoute("/")({
	component: App,
});


function App() {
	const { appUser } = useAuth();
	const { account, updateStak, saveToStak, updatePassedBrands, updateDeckOrder } = useAccount();
	const queryClient = useQueryClient();
	const uid = appUser?.uid ?? "guest";

	const { data: allBrandsList } = useBrandsList();
	const allBrands = useMemo(() => allBrandsList ?? [], [allBrandsList]);

	const [selectedBrand, setSelectedBrand] = useState<BrandSummary | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	const { count: swipeCount, hasReachedLimit, increment: incrementSwipe, bumpOptimistic, reportSwipeResult } = useSwipeLimit(uid, !!appUser);

	// Daily Brief themes for dailyBriefThemeBoost — shares TanStack Query cache with DailyBriefModal
	const { data: dailyBriefData } = useQuery({
		queryKey: ["daily-brief", getEasternDateKey(), marketSessionBucket()],
		queryFn: getDailyBrief,
		staleTime: 30 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
		retry: 0,
	});
	const todayThemes = useMemo(
		() => dailyBriefData?.decks.map((d) => d.id) ?? [],
		[dailyBriefData],
	);

	// Earnings calendar for freshnessBoost — tickers with upcoming earnings in the next ~7 days
	const { data: earningsWeekData } = useQuery({
		queryKey: ["earnings-week-recommend"],
		queryFn: () => getMarketEarnings("week"),
		staleTime: 60 * 60 * 1000,
		gcTime: 2 * 60 * 60 * 1000,
		retry: 0,
	});
	const earningsTickerSet = useMemo(() => {
		const set = new Set<string>();
		for (const entry of earningsWeekData?.entries ?? []) {
			if (entry.status === "upcoming") set.add(entry.symbol.toUpperCase());
		}
		return set;
	}, [earningsWeekData]);

	// Freshness signals: major news (48h), unusual movers (≥3%), analyst updates (7d)
	const { data: freshnessData } = useQuery({
		queryKey: ["recommendation-freshness"],
		queryFn: getRecommendationFreshness,
		staleTime: 30 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
		retry: 0,
	});
	const majorNewsTickers = useMemo(
		() => new Set<string>((freshnessData?.majorNewsLast48h ?? []).map((t) => t.toUpperCase())),
		[freshnessData],
	);
	const unusualMoverSet = useMemo(
		() => new Set<string>((freshnessData?.unusualMovers ?? []).map((t) => t.toUpperCase())),
		[freshnessData],
	);
	const analystUpdatedTickers = useMemo(
		() => new Set<string>((freshnessData?.analystUpdatesLast7d ?? []).map((t) => t.toUpperCase())),
		[freshnessData],
	);

	// ── Stak — initialised from Firestore account ──────────────────────────────
	// Must use useEffect (not lazy useState) so we wait for both account (Firestore)
	// and the brand catalog (useBrandsList, a real network fetch with no local-cache
	// guarantee) to be ready -- same race condition fix as recommendedOrder below.
	const [swipedBrands, setSwipedBrands] = useState<BrandSummary[]>([]);
	const swipedBrandsInitialized = useRef(false);
	useEffect(() => {
		if (swipedBrandsInitialized.current || !account || allBrands.length === 0) return;
		swipedBrandsInitialized.current = true;
		const brandMap = new Map(allBrands.map((b) => [b.id, b]));
		setSwipedBrands(
			(account.stakBrandIds ?? [])
				.map((id) => brandMap.get(id))
				.filter(Boolean) as BrandSummary[],
		);
	}, [account, allBrands]);
	const [swapPickerOpen, setSwapPickerOpen] = useState(false);
	const [pendingBrand, setPendingBrand] = useState<BrandSummary | null>(null);

	// ── Passed brands — initialised from Firestore account ────────────────────
	// Must use useEffect (not lazy useState) so we wait for account to load from
	// Firestore — same race condition fix as recommendedOrder below.
	const [passedBrandIds, setPassedBrandIds] = useState<Set<string>>(new Set());
	const passedInitialized = useRef(false);
	useEffect(() => {
		if (passedInitialized.current || !account) return;
		passedInitialized.current = true;
		const entries = account.passedBrands ?? [];
		const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
		// Permanently hide after 5 left-swipes; otherwise hide for 1 day
		const active = entries.filter((e) => (e.count ?? 0) >= 5 || e.at > oneDayAgo);
		setPassedBrandIds(new Set(active.map((e) => e.id)));
	}, [account]);

	// Ref keeps the latest passed entries for use in stable callbacks.
	// Only syncs from account on first load — after that, local swipe actions
	// own the ref so server round-trips can't overwrite optimistic updates.
	const passedEntriesRef = useRef<PassedEntry[]>(account?.passedBrands ?? []);
	const passedEntriesInitRef = useRef(false);
	useEffect(() => {
		if (passedEntriesInitRef.current) return;
		if (account?.passedBrands) {
			passedEntriesInitRef.current = true;
			passedEntriesRef.current = account.passedBrands;
		}
	}, [account?.passedBrands]);

	// Mid-session pass expiry: when a 1-day pass window closes, requeue the
	// brand to the bottom of the deck without waiting for a route remount.
	useEffect(() => {
		if (!passedInitialized.current) return;
		const tempPasses = passedEntriesRef.current.filter(e => (e.count ?? 0) < 5);
		if (tempPasses.length === 0) return;
		const now = Date.now();
		const nextExpiry = Math.min(...tempPasses.map(e => e.at + 24 * 60 * 60 * 1000));
		const delay = nextExpiry - now;
		const removeExpired = () => {
			const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
			setPassedBrandIds(prev => {
				const next = new Set(prev);
				for (const e of passedEntriesRef.current) {
					if ((e.count ?? 0) < 5 && e.at <= oneDayAgo) next.delete(e.id);
				}
				return next;
			});
		};
		if (delay <= 0) { removeExpired(); return; }
		const timer = setTimeout(removeExpired, delay);
		return () => clearTimeout(timer);
	}, [passedBrandIds]);

	// ── Deck order — reactive init so it always reads correct Firestore state ──
	// Lazy useState would capture account at mount time; if preferences arrive
	// slightly after (e.g. right after onboarding) the order would be random.
	// Using useEffect + ref lets us wait until account (and the brand catalog) are
	// definitively ready.
	const [recommendedOrder, setRecommendedOrder] = useState<BrandSummary[]>([]);
	const orderInitialized = useRef(false);

	// Refs used inside re-sort effects to avoid stale closures
	const freshnessRef = useRef<RecommendationFreshness>({
		earningsTickers: earningsTickerSet,
		majorNewsTickers: new Set(),
		unusualMovers: new Set(),
		analystUpdatedTickers: new Set(),
	});
	useEffect(() => {
		freshnessRef.current = { earningsTickers: earningsTickerSet, majorNewsTickers, unusualMovers: unusualMoverSet, analystUpdatedTickers };
	}, [earningsTickerSet, majorNewsTickers, unusualMoverSet, analystUpdatedTickers]);
	const recentlyShownCatsRef = useRef<string[]>([]); // last 5 primaryCategories shown (for diversity)
	const recommendedOrderRef = useRef<BrandSummary[]>([]);
	useEffect(() => { recommendedOrderRef.current = recommendedOrder; }, [recommendedOrder]);
	const swipedBrandsRef = useRef(swipedBrands);
	useEffect(() => { swipedBrandsRef.current = swipedBrands; }, [swipedBrands]);
	const passedBrandIdsRef = useRef(passedBrandIds);
	useEffect(() => { passedBrandIdsRef.current = passedBrandIds; }, [passedBrandIds]);
	const todayThemesRef = useRef(todayThemes);
	useEffect(() => { todayThemesRef.current = todayThemes; }, [todayThemes]);

	useEffect(() => {
		if (orderInitialized.current || !account || allBrands.length === 0) return;
		orderInitialized.current = true;

		const totalSwipes = account.totalSwipeCount ?? 0;
		const deckOrder = account.deckOrder;
		let order: BrandSummary[];

		// ── Phase A: Users with 20+ swipes → server-sorted recommendations ──
		if (totalSwipes >= 20) {
			if (deckOrder?.length) {
				updateDeckOrder([]).catch(() => {});
			}

			// Re-queued brands (expired passes, count < 5) always go to the bottom.
			// Without this they jump near the top because tagScores still reflect past
			// engagement with their categories (e.g. a brand just removed from Stak).
			const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
			const requeuedIds = new Set(
				(account.passedBrands ?? [])
					.filter((e) => (e.count ?? 0) < 5 && e.at <= oneDayAgo)
					.map((e) => e.id),
			);
			const pushToBottom = (arr: BrandSummary[]) => [
				...arr.filter((b) => !requeuedIds.has(b.id)),
				...arr.filter((b) => requeuedIds.has(b.id)),
			];

			// Set synchronous client-side order immediately so deck isn't blank while
			// the server call resolves (~200ms cold, ~10ms when 5-min cache is warm).
			const tagScores = account.tagScores ?? {};
			order = pushToBottom(
				[...allBrands]
					.map((b) => ({
						brand: b,
						score: computeRecommendationScore(b, tagScores, freshnessRef.current, [], todayThemesRef.current),
					}))
					.sort((a, b) => b.score - a.score)
					.map(({ brand }) => brand),
			);
			setRecommendedOrder(order);
			// Then refine with server-computed order (personalised + freshness signals
			// computed from live market data, cached per uid for 5 min).
			const tickerMap = new Map(allBrands.map((b) => [b.ticker, b]));
			getSortedRecommendations()
				.then((data) => {
					const sorted = (data.brandIds ?? []).map((t) => tickerMap.get(t)).filter(Boolean) as BrandSummary[];
					const sortedSet = new Set(data.brandIds ?? []);
					const missing = allBrands.filter((b) => !sortedSet.has(b.ticker));
					setRecommendedOrder(pushToBottom([...sorted, ...missing]));
				})
				.catch(() => {}); // initial client-side order already set — keep it on error
			return; // don't persist — will always recompute on load
		}

		// ── Phase B: New users (<20 swipes) → restore or build fixed onboarding deck ──
		if (deckOrder?.length) {
			const brandMap = new Map(allBrands.map((b) => [b.id, b]));
			const restored = deckOrder.map((id) => brandMap.get(id)).filter(Boolean) as BrandSummary[];
			if (restored.length > 0) {
				const restoredIdSet = new Set(deckOrder);
				const newBrands = allBrands.filter((b) => !restoredIdSet.has(b.id));
				order = newBrands.length > 0 ? [...restored, ...shuffleArray(newBrands)] : restored;

				// Re-queued (expired passed) cards go to the bottom
				const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
				const requeuedIds = new Set(
					(account.passedBrands ?? [])
						.filter((e) => (e.count ?? 0) < 5 && e.at <= oneDayAgo)
						.map((e) => e.id),
				);
				if (requeuedIds.size > 0) {
					order = [
						...order.filter((b) => !requeuedIds.has(b.id)),
						...shuffleArray(order.filter((b) => requeuedIds.has(b.id))),
					];
				}
				setRecommendedOrder(order);
				return;
			}
		}

		// First-ever session: build onboarding deck shuffled within interest tiers
		const interests: string[] = account.preferences?.interests ?? [];
		const onboardingSwipes = new Set<string>(account.preferences?.onboardingSwipes ?? []);

		if (interests.length === 0 && onboardingSwipes.size === 0) {
			order = shuffleArray(allBrands);
		} else {
			const interestBrandIds = new Set(interests.flatMap((i) => INTEREST_TO_BRANDS[i] || []));
			const expandedCats = new Set<string>();
			for (const id of interestBrandIds) {
				(BRAND_TO_CATEGORIES[id] || []).forEach((c) => expandedCats.add(c));
			}
			const adjacentBrandIds = new Set<string>();
			for (const cat of expandedCats) {
				(INTEREST_TO_BRANDS[cat] || []).forEach((id) => {
					if (!interestBrandIds.has(id)) adjacentBrandIds.add(id);
				});
			}

			// Shuffle independently within each tier — no behavioural scoring yet
			const tier0 = shuffleArray(allBrands.filter((b) => onboardingSwipes.has(b.id)));
			const tier1 = shuffleArray(allBrands.filter((b) => !onboardingSwipes.has(b.id) && interestBrandIds.has(b.id)));
			const tier2 = shuffleArray(allBrands.filter((b) => !onboardingSwipes.has(b.id) && !interestBrandIds.has(b.id) && adjacentBrandIds.has(b.id)));
			const tier3 = shuffleArray(allBrands.filter((b) => !onboardingSwipes.has(b.id) && !interestBrandIds.has(b.id) && !adjacentBrandIds.has(b.id)));
			order = [...tier0, ...tier1, ...tier2, ...tier3];
		}

		setRecommendedOrder(order);
		updateDeckOrder(order.map((b) => b.id)).catch((e) => console.error("Failed to save deck order:", e));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account, allBrands]);

	// When the daily swipe limit is hit, clear deckOrder so the next session
	// recomputes a fresh scored deck rather than restoring today's exhausted order.
	const limitClearedRef = useRef(false);
	useEffect(() => {
		if (!limitClearedRef.current && swipeCount >= DAILY_SWIPE_LIMIT) {
			limitClearedRef.current = true;
			updateDeckOrder([]).catch((e) => console.error("Failed to save deck order:", e));
		}
	}, [swipeCount, updateDeckOrder]);

	// Live re-sort: fires after every tagScores update for users with 20+ swipes.
	// Keeps the first 3 brands in the current filtered view locked (they're visible on screen)
	// and re-scores + re-sorts every other brand so the deck always reflects the latest taste.
	useEffect(() => {
		if (!account || !orderInitialized.current) return;
		if ((account.totalSwipeCount ?? 0) < 20) return;
		if (recommendedOrderRef.current.length === 0) return;

		const tagScores = account.tagScores ?? {};

		// Identify the 3 brands currently visible (top of the filtered deck)
		const swipedIds = new Set(swipedBrandsRef.current.map((b) => b.id));
		const filtered = recommendedOrderRef.current.filter(
			(b) => !swipedIds.has(b.id) && !passedBrandIdsRef.current.has(b.id),
		);
		const lockedIds = new Set(
			[filtered[0]?.id, filtered[1]?.id, filtered[2]?.id].filter(Boolean),
		);
		const lockedInOrder = [filtered[0], filtered[1], filtered[2]].filter(Boolean);

		// Score and sort all remaining brands (including ones not yet in recommendedOrder)
		const scored = allBrands
			.filter((b) => !lockedIds.has(b.id))
			.map((b) => ({
				brand: b,
				score: computeRecommendationScore(
					b, tagScores, freshnessRef.current, recentlyShownCatsRef.current, todayThemes,
				),
			}))
			.sort((a, b) => b.score - a.score)
			.map(({ brand }) => brand);

		// Re-queued brands (expired passes, count < 5) go to the bottom, same as Phase B.
		// Without this, they'd jump near the top because users have high tag-score affinity
		// for categories they previously engaged with.
		const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
		const requeuedIds = new Set(
			passedEntriesRef.current
				.filter((e) => (e.count ?? 0) < 5 && e.at <= oneDayAgo)
				.map((e) => e.id),
		);
		const normalRest = scored.filter((b) => !requeuedIds.has(b.id));
		const requeuedRest = scored.filter((b) => requeuedIds.has(b.id));

		setRecommendedOrder([...lockedInOrder, ...normalRest, ...requeuedRest]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account?.tagScores, todayThemes]);

	const handleSwipe = useCallback(() => {
		// no-op — intel card interruptions removed
	}, []);

	const handleLearnMore = (brand: BrandSummary) => {
		setSelectedBrand(brand);
		setModalOpen(true);
		recordEngagement("learn_more", brand.id, { ticker: brand.ticker, categories: brand.interestCategories }).catch(() => {});
	};

	const handleSwipeRight = (brand: BrandSummary) => {
		if (swipedBrands.find((b) => b.id === brand.id)) return;
		const cat = TICKER_TAG_MAP.get(brand.ticker?.toUpperCase() ?? "")?.primaryCategory;
		if (cat) recentlyShownCatsRef.current = [cat, ...recentlyShownCatsRef.current].slice(0, 5);

		if (swipedBrands.length >= STAK_CAPACITY) {
			setPendingBrand(brand);
			setSwapPickerOpen(true);
			toast.info("Your Stak is full!", {
				description: "Pick a stock to swap out",
				duration: 2000,
			});
		} else {
			const updated = [...swipedBrands, brand];
			setSwipedBrands(updated);
			// Saving a brand resets its pass history so future removals don't inherit
			// stale pass counts from before the user actively chose to save it.
			if (passedBrandIds.has(brand.id) || passedEntriesRef.current.some((e) => e.id === brand.id)) {
				setPassedBrandIds((prev) => { const s = new Set(prev); s.delete(brand.id); return s; });
				const clearedEntries = passedEntriesRef.current.filter((e) => e.id !== brand.id);
				passedEntriesRef.current = clearedEntries;
				updatePassedBrands(clearedEntries).catch(() => {});
			}
			const cachedPrice = queryClient.getQueryData<{ quote: { price: number } | null }>(["stock", brand.ticker])?.quote?.price ?? null;
			saveToStak(brand.id, cachedPrice).catch((e) => {
				console.error("Failed to save stak:", e);
				toast.error("Failed to save", { description: "Changes may not persist", duration: 3000 });
			});
		}
	};

	// Search adds: enforce limit cross-device via AccountContext
	const handleAddFromSearch = (brand: BrandSummary) => {
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

	const handleSwapStock = (brandToRemove: BrandSummary) => {
		if (!pendingBrand) return;
		const updated = [
			...swipedBrands.filter((b) => b.id !== brandToRemove.id),
			pendingBrand,
		];
		setSwipedBrands(updated);
		// Hide the swapped-out brand immediately and re-queue it to the bottom (1-day pass).
		// Refresh timestamp only — don't increment count toward the 5-pass permanent-hide threshold.
		setPassedBrandIds((prev) => new Set([...prev, brandToRemove.id]));
		const existingEntries = passedEntriesRef.current;
		const prevEntry = existingEntries.find((e) => e.id === brandToRemove.id);
		const updatedPassed = prevEntry
			? existingEntries.map((e) => e.id === brandToRemove.id ? { ...e, at: Date.now() } : e)
			: [...existingEntries, { id: brandToRemove.id, at: Date.now(), count: 0 }];
		// Also clear the incoming brand's pass history — saving it resets the slate.
		const afterClear = updatedPassed.filter((e) => e.id !== pendingBrand.id);
		passedEntriesRef.current = afterClear;
		setPassedBrandIds((prev) => { const s = new Set(prev); s.delete(pendingBrand.id); return s; });
		updatePassedBrands(afterClear).catch(() => {});
		const cachedSwapPrice = queryClient.getQueryData<{ quote: { price: number } | null }>(["stock", pendingBrand.ticker])?.quote?.price ?? null;
		updateStak(updated.map((b) => b.id)).catch((e) => {
			console.error("Failed to save stak:", e);
			toast.error("Failed to save", { description: "Changes may not persist", duration: 3000 });
		});
		saveToStak(pendingBrand.id, cachedSwapPrice).catch(() => {});

		// Invalidate brief — swap changes which brands are personalized
		queryClient.invalidateQueries({ queryKey: ["daily-brief"] });
		toast.success(`Swapped ${brandToRemove.name} for ${pendingBrand.name}`, {
			duration: 2000,
		});
		setPendingBrand(null);
		setSwapPickerOpen(false);
	};

	const handleSwipeLeft = useCallback((brand: BrandSummary) => {
		const cat = TICKER_TAG_MAP.get(brand.ticker?.toUpperCase() ?? "")?.primaryCategory;
		if (cat) recentlyShownCatsRef.current = [cat, ...recentlyShownCatsRef.current].slice(0, 5);

		setPassedBrandIds((prev) => new Set([...prev, brand.id]));
		const existing = passedEntriesRef.current;
		const prev = existing.find((e) => e.id === brand.id);
		const newCount = (prev?.count ?? 0) + 1;
		const updated = prev
			? existing.map((e) => e.id === brand.id ? { ...e, at: Date.now(), count: newCount } : e)
			: [...existing, { id: brand.id, at: Date.now(), count: 1 }];
		passedEntriesRef.current = updated;
		updatePassedBrands(updated).catch((e) => console.error("Failed to save passed brands:", e));
	}, [updatePassedBrands]);

	const handleCancelSwap = useCallback(() => {
		setPendingBrand(null);
		setSwapPickerOpen(false);
	}, []);

	const handleSheetOpenChange = useCallback(
		(open: boolean) => {
			if (!open) handleCancelSwap();
		},
		[handleCancelSwap],
	);

	const handleCloseModal = () => {
		setModalOpen(false);
		setTimeout(() => setSelectedBrand(null), 200);
	};

	const handleStreakUpdate = useCallback((result: StreakUpdate) => {
		// Streak milestone — rich visual toast
		if (result.streak >= 2 && result.newBadges.length === 0) {
			const milestoneMsg = result.streak === 7 ? "One week! 🎉" : result.streak === 14 ? "Two weeks! 💪" : result.streak === 30 ? "One month! 🏆" : null;
			toast.custom(() => (
				<div className="flex items-center gap-[12px] rounded-[14px] border border-orange-500/30 bg-orange-500/[0.1] px-[14px] py-[12px] shadow-lg">
					<span className="text-[28px] shrink-0">🔥</span>
					<div className="min-w-0">
						<p className="text-[14px] font-extrabold text-orange-400">{result.streak}-Day Streak{milestoneMsg ? ` · ${milestoneMsg}` : "!"}</p>
						<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[1px]">Keep it going — come back tomorrow</p>
					</div>
				</div>
			), { duration: 3000 });
		}

		// Badge toasts — show the badge emoji prominently
		result.newBadges.forEach((badge) => {
			toast.custom(() => (
				<div className="flex items-center gap-[12px] rounded-[14px] border border-amber-500/30 bg-amber-500/[0.1] px-[14px] py-[12px] shadow-lg">
					<div className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[11px] bg-amber-500/20 text-[22px]">🏅</div>
					<div className="min-w-0">
						<p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400 mb-[1px]">Badge Unlocked</p>
						<p className="text-[14px] font-extrabold text-foreground">{badge.name}</p>
						<p className="text-[11px] dark:text-slate-400 text-slate-500 mt-[1px] leading-snug">{badge.description}</p>
					</div>
				</div>
			), { duration: 5000 });
		});

		// Bonus swipe toast -- suppressed while streak bonus swipes are temporarily
		// disabled (see useSwipeLimit.ts/swipeLimitService.ts): account.bonusSwipes
		// still accumulates and result.bonusSwipesAdded still fires (badges above
		// still show), but this toast's "daily limit is now X" claim would be wrong
		// since that bonus no longer actually raises the limit. Re-enable by
		// restoring this block once bonus swipes are turned back on.
	}, [account?.bonusSwipes]);

	// Backend streak now stores the user's own local-day key (getTodayKey, sent as
	// todayKey on each swipe/event) -- compare against the same local-day keys, not UTC.
	const todayKey = getTodayKey();
	const yesterdayKey = getYesterdayKey();
	// Show streak if active today OR yesterday (still within grace window — swipe today to extend)
	const streakCount = (account?.lastStreakDate === todayKey || account?.lastStreakDate === yesterdayKey)
		? (account?.streakCount ?? 0) : 0;

	return (
		<div className="bg-background text-foreground">
			{/* Top bar */}
			<div className="relative flex items-center justify-center px-[18px] pt-5 pb-2">
				{/* Centered logo + name */}
				<div className="flex items-center gap-[8px]">
					<img src={stakLogo} alt="STAK" className="h-[28px] w-[28px] hidden dark:block" />
					<img src={stakLogoColor} alt="STAK" className="h-[28px] w-[28px] block dark:hidden" />
					<h1 className="text-[22px] font-semibold tracking-[0.13em] text-foreground">STAK</h1>
				</div>
				{/* Left side: search */}
				<div className="absolute left-[18px]">
					<button
						type="button"
						onClick={() => {
							window.dispatchEvent(new Event("open-search"));
								trackEvent("search_open").catch(() => {});
						}}
						aria-label="Search"
						className="relative grid h-[30px] w-[30px] place-items-center rounded-full bg-slate-200 dark:bg-slate-700/80 ring-1 ring-slate-300 dark:ring-white/20 text-slate-700 dark:text-slate-300 hover:text-foreground transition-colors"
					>
						<Search className="w-[17px] h-[17px]" />
					</button>
				</div>
				{/* Right side: streak */}
				<div className="absolute right-[18px]">
					<div className={`flex h-[28px] items-center gap-[5px] rounded-full px-[10px] text-[12px] font-bold ring-1 ${streakCount > 0 ? "bg-orange-500/10 ring-orange-400/30 text-orange-500 dark:text-orange-400" : "bg-foreground/[0.06] ring-foreground/10 text-foreground/50"}`}>
						<Flame className={`w-[13px] h-[13px] ${streakCount > 0 ? "text-orange-400" : "text-foreground/30"}`} />
						<span>{streakCount > 0 ? streakCount : "—"}</span>
					</div>
				</div>
			</div>


			<div className="max-w-7xl mx-auto px-[18px] pt-8 pb-2 sm:pb-4">
				<div className="relative flex flex-col items-center">
				{(() => {
					const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
					const todayMs = todayStart.getTime();
					const todayPassed = (account?.passedBrands ?? []).filter(e => e.at > todayMs).length;
					// Was `todaySwipes - todayPassed`, which silently counted skips (upward
					// swipe -- onSkip just increments the swipe count, no save/pass outcome)
					// as "Saved" since they're neither a tracked save nor a tracked pass.
					// Count genuine saves directly instead.
					const todaySaved = Object.values(account?.stakSavedAt ?? {}).filter(e => e.savedAt > todayMs).length;
					// Skips have no per-action persisted record (unlike saves/passes above) --
					// only their contribution to the swipe-limit count is tracked. Recover the
					// count as the remainder: total swipes minus the two categories that ARE
					// tracked directly.
					const todayDateKey = `${todayStart.getFullYear()}-${String(todayStart.getMonth()+1).padStart(2,"0")}-${String(todayStart.getDate()).padStart(2,"0")}`;
					const todaySwipes = account?.dailySwipeState?.date === todayDateKey ? (account.dailySwipeState.count ?? 0) : 0;
					const todaySkipped = Math.max(0, todaySwipes - todayPassed - todaySaved);
					return (
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
							onIncrement={bumpOptimistic}
							onSwipeRecorded={reportSwipeResult}
							onSkip={incrementSwipe}
							stakSize={account?.stakBrandIds?.length ?? 0}
							loading={recommendedOrder.length === 0 && !hasReachedLimit}
							onStreakUpdate={handleStreakUpdate}
							initialSavedCount={todaySaved}
							initialPassedCount={todayPassed}
							initialSkippedCount={todaySkipped}
						/>
					);
				})()}

			</div>

			<BrandContextModal
				brand={selectedBrand}
				open={modalOpen}
				onClose={handleCloseModal}
			/>

			{/* Swap Picker Sheet - shown when Stak is full */}
			<Sheet open={swapPickerOpen} onOpenChange={handleSheetOpenChange}>
				<SheetContent side="bottom" className="bg-surface-1 dark:border-slate-700/50 border-slate-200 h-[70vh]">
					<SheetHeader className="mb-4">
						<SheetTitle className="text-foreground text-xl flex items-center gap-2">
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

					<p className="dark:text-zinc-400 text-zinc-600 text-sm mb-4">
						Tap a stock below to remove it and add {pendingBrand?.name}:
					</p>

					<div className="space-y-3 overflow-y-auto max-h-[calc(70vh-200px)] pb-4">
						{swipedBrands.map((brand) => (
							<button
								type="button"
								key={brand.id}
								onClick={() => handleSwapStock(brand)}
								className="w-full text-left p-4 rounded-xl border-2 dark:border-slate-700/50 border-slate-200 bg-surface-2/50 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
							>
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center text-xl font-bold shrink-0">
										{brand.ticker.charAt(0)}
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="font-bold text-foreground">{brand.name}</h3>
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
	</div>
	);
}
