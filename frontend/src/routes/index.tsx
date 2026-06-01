import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { brands, type BrandProfile } from "@/data/brands";
import { STAK_WEIGHTED_STOCK_TAGS } from "@/data/stockTags";
import { SwipeableCardStack } from "@/components/SwipeableCardStack";
import { BrandContextModal } from "@/components/BrandContextModal";
import { IntelCardModal } from "@/components/IntelCardModal";
import { INTEL_CARDS, type IntelCard } from "@/data/intelCards";
import React from "react";
import { AlertTriangle, Search, Brain, Flame, BarChart3, Coffee, Zap, Shield, MessageCircle, Gamepad2, ShoppingBag, Music } from "lucide-react";
import stakLogo from "@/assets/stak-logo-icon.svg";
import { toast } from "sonner";
import { getIntelCards, recordEngagement, trackEvent, getMarketEarnings, getDailyBrief, getRecommendationFreshness } from "@/lib/api";
import { logEvent } from "@/lib/firebase";
import { useSwipeLimit, DAILY_SWIPE_LIMIT } from "@/hooks/useSwipeLimit";
import { STAK_CAPACITY, INTEL_CARD_INTERVAL } from "@/lib/constants";
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

// Maps Daily Brief deck theme IDs → stock tags / primaryCategories that qualify for the boost
const THEME_TAG_MAP: Record<string, { tags: string[]; categories: string[] }> = {
	high_growth:  { tags: ["high_growth", "innovation", "cloud", "saas", "ai", "ai_supply_chain", "semiconductor"], categories: ["mega_cap_tech", "consumer_tech", "enterprise_software", "semiconductor", "semiconductor_equipment", "automation_ai", "database_data"] },
	consumer_tech:{ tags: ["technology", "consumer_brand", "consumer_platform", "hardware", "software", "gaming", "streaming"], categories: ["consumer_tech", "mega_cap_tech", "streaming_media", "social_media", "gaming"] },
	defensive:    { tags: ["defensive", "consumer_staples", "dividend_income", "everyday_spending", "familiar_brand", "utilities"], categories: ["consumer_staples", "utilities", "health_insurance", "insurance", "telecom"] },
	dividend:     { tags: ["dividend_income", "income", "reit"], categories: ["reit", "utilities", "telecom", "insurance"] },
	value:        { tags: ["familiar_brand", "consumer_staples", "financials", "banking"], categories: ["bank", "insurance", "retail", "consumer_staples", "industrial"] },
	quality:      { tags: ["mega_cap", "recurring_revenue", "network_effects", "high_growth", "saas"], categories: ["mega_cap_tech", "payment_network", "enterprise_software", "consumer_tech"] },
	momentum:     { tags: ["high_growth", "speculative", "meme_stock"], categories: ["meme_stock", "space_airmobility"] },
	explore:      { tags: [], categories: [] },
	diversified:  { tags: [], categories: [] },
};

interface FreshnessContext {
	earningsTickers: Set<string>;
	majorNewsTickers: Set<string>;
	unusualMovers: Set<string>;
	analystUpdatedTickers: Set<string>;
}

// ── Recommendation scoring ────────────────────────────────────────────────────
// finalScore = tasteMatchScore + freshnessBoost + dailyBriefThemeBoost + diversityAdjustment
// clamped to [0, 1]
function computeRecommendationScore(
	brand: BrandProfile,
	tagScores: Record<string, number>,
	freshness: FreshnessContext,
	recentlyShownCats: string[],
	todayThemes: string[],
): number {
	const stock = TICKER_TAG_MAP.get(brand.ticker?.toUpperCase() ?? "");
	const ticker = brand.ticker?.toUpperCase() ?? "";

	// 1. tasteMatchScore (0–1): weighted sum of user's tag scores for this stock's learning tags
	const weightedSum = stock
		? stock.learningTags.reduce((sum, lt) => sum + (tagScores[lt.tag] ?? 0) * lt.weight, 0)
		: 0;
	const tasteMatchScore = Math.min(1, weightedSum / 10);

	// 2. freshnessBoost (0–0.20): boost stocks with imminent activity
	const earningsBoost    = freshness.earningsTickers.has(ticker)       ? 0.08 : 0;
	const newsBoost        = freshness.majorNewsTickers.has(ticker)      ? 0.06 : 0;
	const unusualMoveBoost = freshness.unusualMovers.has(ticker)         ? 0.06 : 0;
	const analystBoost     = freshness.analystUpdatedTickers.has(ticker) ? 0.04 : 0;
	const freshnessBoost = Math.min(0.20, earningsBoost + newsBoost + unusualMoveBoost + analystBoost);

	// 3. dailyBriefThemeBoost: +0.03 per Daily Brief theme the stock matches (max 0.12)
	const stockTags = new Set(stock?.learningTags.map((lt) => lt.tag) ?? []);
	const stockCat = stock?.primaryCategory ?? "";
	const themeMatchCount = todayThemes.reduce((sum, themeId) => {
		const mapping = THEME_TAG_MAP[themeId];
		if (!mapping) return sum;
		return sum + (mapping.tags.some((t) => stockTags.has(t)) || mapping.categories.includes(stockCat) ? 1 : 0);
	}, 0);
	const dailyBriefThemeBoost = Math.min(0.12, themeMatchCount * 0.03);

	// 4. diversityAdjustment: penalise if same primaryCategory appears 3+ times in last 5 shown
	const primaryCat = stockCat;
	const catCountInRecent = recentlyShownCats.slice(0, 5).filter((c) => c === primaryCat).length;
	const diversityAdjustment = primaryCat && catCountInRecent >= 3 ? -0.10 : 0;

	return Math.max(0, Math.min(1, tasteMatchScore + freshnessBoost + dailyBriefThemeBoost + diversityAdjustment));
}

export const Route = createFileRoute("/")({
	component: App,
});


function App() {
	const { user } = useAuth();
	const { account, updateStak, updatePassedBrands, updateDeckOrder, updateIntelState, updateStreak } = useAccount();
	const uid = user?.uid ?? "guest";

	const [selectedBrand, setSelectedBrand] = useState<BrandProfile | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	const { count: swipeCount, hasReachedLimit, increment: incrementSwipe } = useSwipeLimit(uid, !!user);

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

	// Daily Brief themes for dailyBriefThemeBoost — shares TanStack Query cache with DailyBriefModal
	const { data: dailyBriefData } = useQuery({
		queryKey: ["daily-brief"],
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

	// Intel card state — persisted in Firestore via AccountContext
	const intelQueue = useRef<string[]>([]);
	const intelReadIds = useRef<string[]>([]);
	const [activeIntelCard, setActiveIntelCard] = useState<IntelCard | null>(null);
	const swipesSinceIntel = useRef(Number(sessionStorage.getItem("swipesSinceIntel") ?? 0) || 0);
	const lastIntelDateRef = useRef<string | null>(null);
	const streakRef = useRef<{ date: string; count: number }>(account?.streak ?? { date: "", count: 0 });

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

		lastIntelDateRef.current = intelState?.lastDate ?? null;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allIntelCards]);

	// Keep streakRef in sync with Firestore and update streak on login/app open
	useEffect(() => {
		if (!account) return;
		if (account.streak) streakRef.current = account.streak;

		const today = new Date().toISOString().split("T")[0];
		const streakData = streakRef.current;
		if (streakData.date !== today) {
			const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
			const newCount = streakData.date === yesterday ? streakData.count + 1 : 1;
			const newStreak = { date: today, count: newCount };
			streakRef.current = newStreak;
			updateStreak(newStreak).catch((e) => console.error("Failed to save streak:", e));
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account?.streak]);

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

	// Refs used inside re-sort effects to avoid stale closures
	const freshnessRef = useRef<FreshnessContext>({
		earningsTickers: earningsTickerSet,
		majorNewsTickers: new Set(),
		unusualMovers: new Set(),
		analystUpdatedTickers: new Set(),
	});
	useEffect(() => {
		freshnessRef.current = { earningsTickers: earningsTickerSet, majorNewsTickers, unusualMovers: unusualMoverSet, analystUpdatedTickers };
	}, [earningsTickerSet, majorNewsTickers, unusualMoverSet, analystUpdatedTickers]);
	const recentlyShownCatsRef = useRef<string[]>([]); // last 5 primaryCategories shown (for diversity)
	const recommendedOrderRef = useRef<BrandProfile[]>([]);
	useEffect(() => { recommendedOrderRef.current = recommendedOrder; }, [recommendedOrder]);
	const swipedBrandsRef = useRef(swipedBrands);
	useEffect(() => { swipedBrandsRef.current = swipedBrands; }, [swipedBrands]);
	const passedBrandIdsRef = useRef(passedBrandIds);
	useEffect(() => { passedBrandIdsRef.current = passedBrandIds; }, [passedBrandIds]);
	const todayThemesRef = useRef(todayThemes);
	useEffect(() => { todayThemesRef.current = todayThemes; }, [todayThemes]);

	useEffect(() => {
		if (orderInitialized.current || !account) return;
		orderInitialized.current = true;

		const totalSwipes = account.totalSwipeCount ?? 0;
		const deckOrder = account.deckOrder;
		let order: BrandProfile[];

		// ── Phase A: Users with 20+ swipes → always use live recommendation score ──
		if (totalSwipes >= 20) {
			// Clear any stale saved order — we always recompute for returning users
			if (deckOrder?.length) {
				updateDeckOrder([]).catch(() => {});
			}
			const tagScores = account.tagScores ?? {};
			order = [...brands]
				.map((b) => ({
					brand: b,
					score: computeRecommendationScore(b, tagScores, freshnessRef.current, [], todayThemesRef.current),
				}))
				.sort((a, b) => b.score - a.score)
				.map(({ brand }) => brand);
			setRecommendedOrder(order);
			return; // don't persist — will always recompute on load
		}

		// ── Phase B: New users (<20 swipes) → restore or build fixed onboarding deck ──
		if (deckOrder?.length) {
			const brandMap = new Map(brands.map((b) => [b.id, b]));
			const restored = deckOrder.map((id) => brandMap.get(id)).filter(Boolean) as BrandProfile[];
			if (restored.length > 0) {
				const restoredIdSet = new Set(deckOrder);
				const newBrands = brands.filter((b) => !restoredIdSet.has(b.id));
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
			order = shuffleArray(brands);
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
			const tier0 = shuffleArray(brands.filter((b) => onboardingSwipes.has(b.id)));
			const tier1 = shuffleArray(brands.filter((b) => !onboardingSwipes.has(b.id) && interestBrandIds.has(b.id)));
			const tier2 = shuffleArray(brands.filter((b) => !onboardingSwipes.has(b.id) && !interestBrandIds.has(b.id) && adjacentBrandIds.has(b.id)));
			const tier3 = shuffleArray(brands.filter((b) => !onboardingSwipes.has(b.id) && !interestBrandIds.has(b.id) && !adjacentBrandIds.has(b.id)));
			order = [...tier0, ...tier1, ...tier2, ...tier3];
		}

		setRecommendedOrder(order);
		updateDeckOrder(order.map((b) => b.id)).catch((e) => console.error("Failed to save deck order:", e));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account]);

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
		const sortedRest = brands
			.filter((b) => !lockedIds.has(b.id))
			.map((b) => ({
				brand: b,
				score: computeRecommendationScore(
					b, tagScores, freshnessRef.current, recentlyShownCatsRef.current, todayThemes,
				),
			}))
			.sort((a, b) => b.score - a.score)
			.map(({ brand }) => brand);

		setRecommendedOrder([...lockedInOrder, ...sortedRest]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account?.tagScores, todayThemes]);

	const handleSwipe = useCallback(() => {
		// Trigger intel card after every Nth swipe, at most once per day
		swipesSinceIntel.current += 1;
		sessionStorage.setItem("swipesSinceIntel", String(swipesSinceIntel.current));
		if (swipesSinceIntel.current < INTEL_CARD_INTERVAL) return;
		swipesSinceIntel.current = 0;
		sessionStorage.setItem("swipesSinceIntel", "0");

		const today = new Date().toISOString().split("T")[0];
		if (lastIntelDateRef.current === today) return;

		if (intelQueue.current.length === 0) {
			intelQueue.current = allIntelCards.map((c) => c.id).sort(() => Math.random() - 0.5);
		}

		const nextId = intelQueue.current.shift()!;
		if (!intelReadIds.current.includes(nextId)) {
			intelReadIds.current = [...intelReadIds.current, nextId];
		}

		lastIntelDateRef.current = today;
		updateIntelState({
			lastDate: today,
			queue: intelQueue.current,
			readIds: intelReadIds.current,
		}).catch((e) => console.error("Failed to save intel state:", e));

		const card = allIntelCards.find((c) => c.id === nextId) ?? allIntelCards[0];
		setActiveIntelCard(card);
		logEvent("intel_card_view", { card_id: nextId });
		trackEvent("intel_card_view", { card_id: nextId }).catch(() => {});
	}, [allIntelCards, updateIntelState]);

	const handleLearnMore = (brand: BrandProfile) => {
		setSelectedBrand(brand);
		setModalOpen(true);
		logEvent("learn_more", { brand_id: brand.id, brand_name: brand.name, ticker: brand.ticker });
		recordEngagement("learn_more", brand.id, { ticker: brand.ticker, categories: brand.interestCategories }).catch(() => {});
	};

	const handleSwipeRight = (brand: BrandProfile) => {
		if (swipedBrands.find((b) => b.id === brand.id)) return;
		logEvent("swipe_right", { brand_id: brand.id, brand_name: brand.name, ticker: brand.ticker });
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
			toast.success("Added to your Stak", {
				description: brand.name,
				duration: 2000,
			});
			const updated = [...swipedBrands, brand];
			setSwipedBrands(updated);
			updateStak(updated.map((b) => b.id)).catch((e) => {
			console.error("Failed to save stak:", e);
			toast.error("Failed to save", { description: "Changes may not persist", duration: 3000 });
		});
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
		updateStak(updated.map((b) => b.id)).catch((e) => {
		console.error("Failed to save stak:", e);
		toast.error("Failed to save", { description: "Changes may not persist", duration: 3000 });
	});

		toast.success(`Swapped ${brandToRemove.name} for ${pendingBrand.name}`, {
			duration: 2000,
		});
		setPendingBrand(null);
		setSwapPickerOpen(false);
	};

	const handleSwipeLeft = useCallback((brand: BrandProfile) => {
		logEvent("swipe_left", { brand_id: brand.id, brand_name: brand.name, ticker: brand.ticker });
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
		if (result.newBadges.length > 0) {
			result.newBadges.forEach((badge) => {
				toast.success(`Badge unlocked: ${badge.name}`, {
					description: badge.description,
					duration: 4000,
				});
			});
		}
		if (result.bonusSwipesAdded > 0) {
			toast.success(`+${result.bonusSwipesAdded} bonus swipes unlocked!`, {
				description: `You now have ${DAILY_SWIPE_LIMIT + (account?.bonusSwipes ?? 0)} swipes per day.`,
				duration: 4000,
			});
		}
		// Streak count is shown live in the top-bar flame counter — no toast needed
	}, [account?.bonusSwipes]);

	const todayKey = new Date().toISOString().split("T")[0];
	const streakCount = account?.streak?.date === todayKey ? (account.streak.count ?? 0) : 0;

	return (
		<div className="bg-background text-zinc-900 dark:text-white">
			{/* Top bar */}
			<div className="relative flex items-center justify-center px-[18px] pt-5 pb-2">
				{/* Centered logo + name */}
				<div className="flex items-center gap-[8px]">
					<img src={stakLogo} alt="STAK" className="h-[28px] w-[28px]" />
					<h1 className="text-[22px] font-semibold tracking-[0.13em] text-[#e8f0ff]">STAK</h1>
				</div>
				{/* Right side actions */}
				<div className="absolute right-[18px] flex items-center gap-2">
					{/* Streak */}
					<div className="flex h-[25px] items-center gap-1 rounded-full bg-white/[0.055] px-2 text-[11px] ring-1 ring-white/10">
						<Flame className="w-[13px] h-[13px] text-orange-400" />
						<span className="text-foreground font-medium">{streakCount > 0 ? streakCount : "—"}</span>
					</div>
					{/* Avatar */}
					<button
						type="button"
						onClick={() => {
							window.dispatchEvent(new Event("open-search"));
							logEvent("search_open");
							trackEvent("search_open").catch(() => {});
						}}
						aria-label="Search"
						className="relative grid h-[30px] w-[30px] place-items-center rounded-full bg-slate-700/80 ring-1 ring-white/20 dark:text-slate-300 text-slate-600 hover:text-foreground transition-colors"
					>
						<Search className="w-[17px] h-[17px]" />
					</button>
				</div>
			</div>


			<div className="max-w-7xl mx-auto px-[18px] pt-8 pb-2 sm:pb-4">
				<div className="relative flex flex-col items-center">
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
					stakSize={account?.stakBrandIds?.length ?? 0}
					loading={recommendedOrder.length === 0 && !hasReachedLimit}
				onStreakUpdate={handleStreakUpdate}
				/>

			</div>

			<BrandContextModal
				brand={selectedBrand}
				open={modalOpen}
				onClose={handleCloseModal}
			/>

			{activeIntelCard && (
				<IntelCardModal
					card={activeIntelCard}
					onDismiss={() => setActiveIntelCard(null)}
				/>
			)}

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
