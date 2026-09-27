import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type BrandSummary, STAK_WEIGHTED_STOCK_TAGS, computeRecommendationScore as computeRecScore, type RecommendationFreshness } from "@stak/shared";
import { useBrandsList } from "@/hooks/useBrandsList";
import { DiscoverDeck, type DeckCardProps, type Undo } from "@/components/discover/DiscoverDeck";
import { DiscoverCard } from "@/components/discover/DiscoverCard";
import { DesktopDiscoverTitle, DiscoverProgress } from "@/components/discover/DesktopDiscoverHeader";
import { FocusChips, QuickLookPanel, QuickLookTitle } from "@/components/discover/QuickLookPanel";
import { DesktopTopBar } from "@/components/desktop/DesktopTopBar";
import { DESK, Panel, deskPageBg } from "@/components/desktop/deskKit";
import { useIsMobile } from "@/hooks/use-mobile";
import { withFocus } from "@/lib/discoverFocus";
import { DiscoverHeader } from "@/components/discover/DiscoverHeader";
import { QuickLookSheet } from "@/components/discover/QuickLookSheet";
import { DEFAULT_DECK_LABEL, DISC, cu } from "@/components/discover/discoverTheme";
import { PHONE_MAX_WIDTH, useFigmaUnit } from "@/components/discover/useFigmaUnit";
import { toast } from "sonner";
import { recordEngagement, getMarketEarnings, getDailyBrief, getQuickLook, getRecommendationFreshness, getSortedRecommendations } from "@/lib/api";
import { marketSessionBucket, getEasternDateKey } from "@/lib/utils";
import { useSwipeLimit, DAILY_SWIPE_LIMIT } from "@/hooks/useSwipeLimit";
import { STAK_CAPACITY } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import type { PassedEntry } from "@/context/AccountContext";
import { INTEREST_TO_BRANDS } from "@/data/onboarding";

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

export const Route = createFileRoute("/discover")({
	component: App,
});

/** Desktop card width: ~430px on a small laptop up to 550px on a large desktop (36% of the window), then limited by the
 *  column and - so the page never scrolls - the window's height. */
const CARD_MIN_W = 430;
const CARD_MAX_W = 550;
const CARD_VW = 0.36;
/** Pass / STAK on desktop, in pixels. */
const DESK_BUTTON_PX = 86;
/** The deck's fixed-height parts on desktop (headroom 10 + peeks 44 + gap to the buttons 22), in pixels. */
const DECK_FIXED_PX = 76;
const FIT_MIN_WIDTH = 1024;
/** How long a desktop card must stay in front (Quick Look open beside it) to count as a Quick Look read. */
const READ_AFTER_MS = 8000;

/** Desktop's deck card: the Discover card's desktop layout. No Learn more - the Quick Look is open beside the deck. */
const DesktopDeckCard = memo(function DesktopDeckCard({ brand, paletteIndex, live }: DeckCardProps) {
	return <DiscoverCard brand={brand} paletteIndex={paletteIndex} live={live} variant="desktop" />;
});


function App() {
	const { appUser } = useAuth();
	const { account, saveToStak, removeFromStak, removePassedBrand, updatePassedBrands, updateDeckOrder } = useAccount();
	const queryClient = useQueryClient();
	const uid = appUser?.uid ?? "guest";

	const { data: allBrandsList, isError: brandsError, refetch: refetchBrands } = useBrandsList();
	const allBrands = useMemo(() => allBrandsList ?? [], [allBrandsList]);

	const navigate = useNavigate();
	const unit = useFigmaUnit();
	const isMobile = useIsMobile();
	const [quickLookBrand, setQuickLookBrand] = useState<BrandSummary | null>(null);
	// Desktop only: the category picked under "Not sure?", and the card in front (for the Quick Look beside the deck).
	const [focus, setFocus] = useState<string | null>(null);
	const focusRef = useRef(focus);
	focusRef.current = focus;
	const [frontBrand, setFrontBrand] = useState<BrandSummary | null>(null);
	const [progress, setProgress] = useState<number | null>(null);
	// Desktop: the card's width follows the window (430-550px), then shrinks to fit the column and - measured, since bio
	// lengths vary - the window's height, so the page never scrolls. Everything else in the deck scales with it (1u =
	// width / 400; the buttons stay 86px).
	const deckColRef = useRef<HTMLDivElement>(null);
	const deckBodyRef = useRef<HTMLDivElement>(null);
	const [deckSize, setDeckSize] = useState({ w: CARD_MIN_W, u: CARD_MIN_W / 400 });
	const deckSizeRef = useRef(deckSize);
	deckSizeRef.current = deckSize;
	useLayoutEffect(() => {
		const col = deckColRef.current;
		const body = deckBodyRef.current;
		if (!col || !body) return;
		const fit = () => {
			const prev = deckSizeRef.current;
			let w = Math.min(Math.max(CARD_MIN_W, window.innerWidth * CARD_VW), CARD_MAX_W, col.clientWidth - 8);
			if (window.innerWidth >= FIT_MIN_WIDTH) {
				// The card (and the button labels) grow with the width; the rest is fixed.
				const fixed = DECK_FIXED_PX + DESK_BUTTON_PX;
				const perWidth = (body.scrollHeight - fixed) / prev.w;
				if (perWidth > 0) w = Math.min(w, (col.clientHeight - fixed) / perWidth);
			}
			w = Math.round(Math.max(280, w));
			if (Math.abs(w - prev.w) > 1) setDeckSize({ w, u: w / 400 });
		};
		fit();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(fit);
		observer.observe(col);
		observer.observe(body);
		window.addEventListener("resize", fit);
		return () => { observer.disconnect(); window.removeEventListener("resize", fit); };
	}, [isMobile]);
	const deckUnit = deckSize.u;
	const onProgress = useCallback((count: number) => setProgress(count), []);
	// The card behind the front one is almost always next: warm its Quick Look (cached for everyone for 24h) once the
	// front card has had a moment, so the panel isn't a skeleton after each swipe - but a fast run of swipes isn't.
	const prefetchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(prefetchTimer.current), []);
	// The desktop Quick Look is always open, so a card only counts as "read" (Investing Taste's learn_more) once it has
	// stayed in front for READ_AFTER_MS - a quick swipe past isn't reading it.
	const readTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(readTimer.current), []);
	const onFrontChange = useCallback((front: BrandSummary | null, next: BrandSummary | null) => {
		setFrontBrand(front);
		clearTimeout(readTimer.current);
		if (front) {
			readTimer.current = setTimeout(() => {
				recordEngagement("learn_more", front.id, { ticker: front.ticker, categories: front.interestCategories }).catch(() => {});
			}, READ_AFTER_MS);
		}
		clearTimeout(prefetchTimer.current);
		if (!next) return;
		prefetchTimer.current = setTimeout(() => {
			queryClient.prefetchQuery({ queryKey: ["quick-look", next.id], queryFn: () => getQuickLook(next.id), staleTime: 24 * 60 * 60 * 1000 }).catch(() => {});
		}, 1200);
	}, [queryClient]);

	const { count: swipeCount, hasReachedLimit, bumpOptimistic, reportSwipeResult } = useSwipeLimit(uid, !!appUser);

	// Daily Brief themes for dailyBriefThemeBoost — shares the ["daily-brief"] query with Home and News
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

	// ── Stak — initialised from the account ──────────────────────────────
	// Must use useEffect (not lazy useState) so we wait for both account
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

	// ── Passed brands — initialised from the account ────────────────────
	// Must use useEffect (not lazy useState) so we wait for account to load from
	// the server — same race condition fix as recommendedOrder below.
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
				const toRemove = passedEntriesRef.current.filter(
					e => (e.count ?? 0) < 5 && e.at <= oneDayAgo && prev.has(e.id),
				);
				if (toRemove.length === 0) return prev; // bail out — nothing to remove, keep same reference
				const next = new Set(prev);
				for (const e of toRemove) next.delete(e.id);
				return next;
			});
		};
		if (delay <= 0) { removeExpired(); return; }
		const timer = setTimeout(removeExpired, delay);
		return () => clearTimeout(timer);
	}, [passedBrandIds]);

	// ── Deck order — reactive init so it always reads correct account state ──
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
		// The on-screen cards follow the desktop category chip when one is picked, so lock those.
		const filtered = withFocus(recommendedOrderRef.current.filter(
			(b) => !swipedIds.has(b.id) && !passedBrandIdsRef.current.has(b.id),
		), focusRef.current);
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
	}, [account?.tagScores, todayThemes]);

	const handleLearnMore = useCallback((brand: BrandSummary) => {
		setQuickLookBrand(brand);
		recordEngagement("learn_more", brand.id, { ticker: brand.ticker, categories: brand.interestCategories }).catch(() => {});
	}, []);

	const rememberCategory = (brand: BrandSummary) => {
		const cat = TICKER_TAG_MAP.get(brand.ticker?.toUpperCase() ?? "")?.primaryCategory;
		if (cat) recentlyShownCatsRef.current = [cat, ...recentlyShownCatsRef.current].slice(0, 5);
	};

	// Each card's server writes run one after another: STAK -> Undo -> STAK again, sent all at once, could otherwise land
	// as add, add, remove and leave a card that looks saved but isn't. Same for a pass and its undo.
	const brandOps = useRef(new Map<string, Promise<unknown>>());
	const inOrder = <T,>(brandId: string, op: () => Promise<T>): Promise<T> => {
		const run = (brandOps.current.get(brandId) ?? Promise.resolve()).catch(() => {}).then(op);
		brandOps.current.set(brandId, run);
		run.catch(() => {}).then(() => { if (brandOps.current.get(brandId) === run) brandOps.current.delete(brandId); });
		return run;
	};

	// An undone card returns to the front even if the live re-sort moved it while its decision was pending.
	const backToFront = (brand: BrandSummary) => setRecommendedOrder((cur) => [brand, ...cur.filter((b) => b.id !== brand.id)]);

	/** Android's STAK: adds the card to My STAK now ("full" when there's no room). Returns how to take it back.
	 *  Reads and updates the refs as well as state, so two decisions before the next render both count. */
	const handleSave = (brand: BrandSummary): "full" | Undo => {
		if (swipedBrandsRef.current.length >= STAK_CAPACITY) return "full";
		rememberCategory(brand);
		const wasPassed = passedBrandIdsRef.current.has(brand.id);
		const passedBefore = passedEntriesRef.current.find((e) => e.id === brand.id);
		swipedBrandsRef.current = [...swipedBrandsRef.current, brand];
		setSwipedBrands((cur) => [...cur, brand]);
		// Saving a brand resets its pass history so future removals don't inherit
		// stale pass counts from before the user actively chose to save it.
		if (wasPassed || passedBefore) {
			passedBrandIdsRef.current = new Set([...passedBrandIdsRef.current].filter((id) => id !== brand.id));
			setPassedBrandIds((prev) => { const s = new Set(prev); s.delete(brand.id); return s; });
			passedEntriesRef.current = passedEntriesRef.current.filter((e) => e.id !== brand.id);
			inOrder(brand.id, () => removePassedBrand(brand.id)).catch(() => {});
		}
		const cachedPrice = queryClient.getQueryData<{ quote: { price: number } | null }>(["stock", brand.ticker])?.quote?.price ?? null;
		inOrder(brand.id, () => saveToStak(brand.id, cachedPrice)).catch((e) => {
			console.error("Failed to save stak:", e);
			toast.error("Failed to save", { description: "Changes may not persist", duration: 3000 });
		});
		return () => {
			// Only this card comes out; anything decided since stays as it is.
			backToFront(brand);
			swipedBrandsRef.current = swipedBrandsRef.current.filter((b) => b.id !== brand.id);
			setSwipedBrands((cur) => cur.filter((b) => b.id !== brand.id));
			inOrder(brand.id, () => removeFromStak(brand.id)).catch(() => toast.error("Couldn't undo that. Try again."));
			if (wasPassed) {
				passedBrandIdsRef.current = new Set([...passedBrandIdsRef.current, brand.id]);
				setPassedBrandIds((cur) => new Set([...cur, brand.id]));
			}
			if (passedBefore) {
				passedEntriesRef.current = [...passedEntriesRef.current.filter((e) => e.id !== brand.id), passedBefore];
				inOrder(brand.id, () => updatePassedBrands([passedBefore])).catch(() => {});
			}
		};
	};

	/** Android's Pass: hides the card for a day (five passes hide it for good). Returns how to take it back. */
	const handlePass = (brand: BrandSummary): Undo => {
		rememberCategory(brand);
		const wasPassed = passedBrandIdsRef.current.has(brand.id);
		const prev = passedEntriesRef.current.find((e) => e.id === brand.id);
		const next: PassedEntry = { id: brand.id, at: Date.now(), count: (prev?.count ?? 0) + 1 };
		passedBrandIdsRef.current = new Set([...passedBrandIdsRef.current, brand.id]);
		setPassedBrandIds((cur) => new Set([...cur, brand.id]));
		passedEntriesRef.current = prev ? passedEntriesRef.current.map((e) => e.id === brand.id ? { ...e, ...next } : e) : [...passedEntriesRef.current, next];
		inOrder(brand.id, () => updatePassedBrands([next])).catch((e) => console.error("Failed to save passed brands:", e));
		return () => {
			// Only this card comes back; passes made since stay passed.
			backToFront(brand);
			if (!wasPassed) {
				passedBrandIdsRef.current = new Set([...passedBrandIdsRef.current].filter((id) => id !== brand.id));
				setPassedBrandIds((cur) => { const s = new Set(cur); s.delete(brand.id); return s; });
			}
			passedEntriesRef.current = prev ? passedEntriesRef.current.map((e) => e.id === brand.id ? prev : e) : passedEntriesRef.current.filter((e) => e.id !== brand.id);
			// A first-ever pass leaves a row behind that an upsert can't clear.
			inOrder(brand.id, () => (prev ? updatePassedBrands([prev]) : removePassedBrand(brand.id))).catch(() => {});
		};
	};

	// Stable brands array for the deck — prevents it recreating on every unrelated render.
	const filteredBrands = useMemo(
		() => recommendedOrder.filter(
			(brand) =>
				!swipedBrands.some((b) => b.id === brand.id) &&
				!passedBrandIds.has(brand.id),
		),
		[recommendedOrder, swipedBrands, passedBrandIds],
	);
	const deckBrands = useMemo(() => withFocus(filteredBrands, focus), [filteredBrands, focus]);

	// A card's tint comes from where it sits in the day's order, so it stays the same as cards leave the deck.
	const paletteIndexById = useMemo(() => new Map(recommendedOrder.map((b, i) => [b.id, i])), [recommendedOrder]);
	// Pinned on first sight: the live re-sort moves the visible cards to the front of the order, which would recolour them.
	const palettePin = useRef(new Map<string, number>());
	const paletteOf = useCallback((brand: BrandSummary) => {
		let index = palettePin.current.get(brand.id);
		if (index === undefined) {
			index = paletteIndexById.get(brand.id) ?? 0;
			palettePin.current.set(brand.id, index);
		}
		return index;
	}, [paletteIndexById]);
	const closeQuickLook = useCallback(() => setQuickLookBrand(null), []);

	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);
	const todayMs = todayStart.getTime();
	const todayPassed = (account?.passedBrands ?? []).filter(e => e.at > todayMs).length;
	const todaySaved = Object.values(account?.stakSavedAt ?? {}).filter(e => e.savedAt > todayMs).length;

	const deckLoading = recommendedOrder.length === 0 && !hasReachedLimit;
	const loadFailed = brandsError && allBrands.length === 0;
	const headerCount = Math.min(swipeCount + 1, DAILY_SWIPE_LIMIT);

	const deckProps = {
		brands: deckBrands,
		paletteOf,
		limit: DAILY_SWIPE_LIMIT,
		swipeCount,
		stakSize: account?.stakBrandIds?.length ?? 0,
		initialSaved: todaySaved,
		initialPassed: todayPassed,
		onSave: handleSave,
		onPass: handlePass,
		onLearnMore: handleLearnMore,
		onReview: () => navigate({ to: "/my-stak" }),
		bumpOptimistic,
		reportSwipeResult,
	};
	const failed = (
		<div className="flex flex-col items-center text-center" style={{ paddingTop: cu(80), gap: cu(10) }} role="alert">
			<h2 style={{ font: `600 ${cu(18)} var(--font-heading)`, color: DISC.ink }}>Couldn't load today's deck</h2>
			<p style={{ font: `400 ${cu(12)} var(--font-body)`, color: DISC.muted }}>Check your connection and try again.</p>
			<button
				type="button"
				onClick={() => { refetchBrands(); }}
				className="text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
				style={{ marginTop: cu(18), width: cu(140), height: cu(44), borderRadius: cu(6), background: DISC.cta, font: `500 ${cu(14)} var(--font-body)`, outlineColor: DISC.teal }}
			>
				Retry
			</button>
		</div>
	);
	const loading = (
		<div className="grid place-items-center" style={{ paddingTop: cu(140) }} role="status" aria-label="Loading today's deck">
			<div className="animate-spin rounded-full" style={{ width: cu(40), height: cu(40), border: `${cu(3)} solid ${DISC.teal}33`, borderTopColor: DISC.teal }} />
		</div>
	);

	// Desktop, from the user's design: the deck (desktop card, our stack slant and peeks, Pass / STAK) beside an open
	// Quick Look for the card in front, and category chips that pull a category to the front of today's deck.
	// Desktop, from the user's design: the whole screen fits the window (from 1024px wide) - the deck (Android's card,
	// our stack slant and peeks, Pass / STAK) scaled to its column, beside an open Quick Look that scrolls on its own,
	// and category chips that pull a category to the front of today's deck.
	if (!isMobile) {
		const count = progress ?? headerCount;
		return (
			<div
				className="flex min-h-full flex-col overflow-x-clip lg:h-dvh lg:min-h-0 lg:overflow-hidden"
				style={{ background: deskPageBg() }}
			>
				<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-8 pb-6 pt-5 lg:min-h-0 lg:flex-1" style={{ ["--u" as string]: `${deckUnit}px` }}>
					<DesktopTopBar extra={<DiscoverProgress count={count} limit={DAILY_SWIPE_LIMIT} />} />
					{/* The deck takes ~70% of the width; the Quick Look a clamped 300-360px. */}
					<div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_clamp(300px,25vw,360px)] lg:[grid-template-rows:minmax(0,1fr)]">
						{/* The title heads the deck column only, so the Quick Look column starts level with it. */}
						<div className="flex min-h-0 min-w-0 flex-col gap-[26px]">
							<DesktopDiscoverTitle />
							{/* Measured for the card's scale. Pass / STAK get a hairline ring here: their idle fill barely shows on this page. */}
							<div
								ref={deckColRef}
								className="flex min-h-0 min-w-0 flex-col justify-center text-white lg:flex-1 lg:overflow-hidden [&_[data-deck-button]]:shadow-[inset_0_0_0_1px_rgba(120,170,220,0.32)]"
								style={{ ["--desk-card-w" as string]: `${deckSize.w}px` }}
							>
								{/* Centred in the deck column, clear of the title (26px here + the deck's 10px headroom). */}
								<div ref={deckBodyRef} className="mx-auto w-full" style={{ maxWidth: Math.max(deckSize.w + 40, 400 * deckUnit) }}>
									{loadFailed ? failed : deckLoading ? loading : (
										<DiscoverDeck {...deckProps} Card={DesktopDeckCard} stack="desktop" unit={deckUnit} onProgress={onProgress} buttonSize={DESK_BUTTON_PX / deckUnit} onFrontChange={onFrontChange} />
									)}
								</div>
							</div>
						</div>
						<aside className="flex min-h-0 min-w-0 flex-col gap-4" aria-label="Quick look">
							<Panel className="gap-4 p-5 lg:min-h-0 lg:flex-1">
								<QuickLookTitle />
								{/* The only part of the screen that scrolls (wheel / trackpad / keys; no scrollbar drawn). */}
								<div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
									{loadFailed ? (
										<p className="text-[13px]" style={{ color: DESK.muted }}>Insights appear here once today's deck loads.</p>
									) : deckLoading ? (
										<p className="text-[13px]" style={{ color: DESK.muted }}>Loading today's picks…</p>
									) : frontBrand ? (
										<QuickLookPanel brand={frontBrand} onOpenStock={(ticker) => navigate({ to: "/stock/$symbol", params: { symbol: ticker } })} />
									) : (
										<p className="text-[13px]" style={{ color: DESK.muted }}>You've seen today's picks. New ones arrive tomorrow.</p>
									)}
								</div>
							</Panel>
							<FocusChips focus={focus} onFocus={setFocus} />
						</aside>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="overflow-x-clip bg-background pb-6 text-foreground">
			<div className="mx-auto" style={{ maxWidth: PHONE_MAX_WIDTH, ["--u" as string]: `${unit}px` }}>
				{loadFailed ? (
					<>
						<DiscoverHeader count={headerCount} limit={DAILY_SWIPE_LIMIT} label={DEFAULT_DECK_LABEL} />
						{failed}
					</>
				) : deckLoading ? (
					<>
						<DiscoverHeader count={headerCount} limit={DAILY_SWIPE_LIMIT} label={DEFAULT_DECK_LABEL} />
						{loading}
					</>
				) : (
					<DiscoverDeck {...deckProps} />
				)}
			</div>

			{quickLookBrand && <QuickLookSheet brand={quickLookBrand} onClose={closeQuickLook} />}
		</div>
	);
}
