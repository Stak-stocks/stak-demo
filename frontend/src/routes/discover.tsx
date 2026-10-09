import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { recordEngagement, getQuickLook, getSortedRecommendations, getDailyDeck, offerDailyDeck } from "@/lib/api";
import { useSwipeLimit, DAILY_SWIPE_LIMIT, getTodayKey } from "@/hooks/useSwipeLimit";
import { STAK_CAPACITY } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import type { PassedEntry } from "@/context/AccountContext";
import { chooseDailyDeck, eligibleInOrder, passKeepsOut, pinDailyDeck, readPinnedDeck, withCategoryCap, PASS_HIDE_COUNT } from "@/lib/dailyDeck";

const TICKER_TAG_MAP = new Map(
	STAK_WEIGHTED_STOCK_TAGS.map((s) => [s.ticker.toUpperCase(), s]),
);

/** No signals beyond the account's own taste: what an offline deck is ranked by. */
const NO_FRESHNESS: RecommendationFreshness = { earningsTickers: new Set(), majorNewsTickers: new Set(), unusualMovers: new Set(), analystUpdatedTickers: new Set() };

/** The catalog ranked by the account's taste alone (the shared formula the server uses) - the deck when the server's
 *  ranking can't be reached. Tickers, best first. */
function rankLocally(brands: BrandSummary[], tagScores: Record<string, number>): string[] {
	return brands
		.map((b) => {
			const ticker = b.ticker?.toUpperCase() ?? "";
			return { ticker: b.ticker, score: computeRecScore(ticker, TICKER_TAG_MAP.get(ticker), tagScores, NO_FRESHNESS, []).finalScore };
		})
		.sort((a, b) => b.score - a.score)
		.map((x) => x.ticker);
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
	const { account, saveToStak, removeFromStak, removePassedBrand, updatePassedBrands } = useAccount();
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
		// Hidden for a day after a pass; for good after PASS_HIDE_COUNT of them.
		const now = Date.now();
		setPassedBrandIds(new Set((account.passedBrands ?? []).filter((e) => passKeepsOut(e, now)).map((e) => e.id)));
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
		const tempPasses = passedEntriesRef.current.filter(e => (e.count ?? 1) < PASS_HIDE_COUNT);
		if (tempPasses.length === 0) return;
		const now = Date.now();
		const nextExpiry = Math.min(...tempPasses.map(e => e.at + 24 * 60 * 60 * 1000));
		const delay = nextExpiry - now;
		const removeExpired = () => {
			const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
			setPassedBrandIds(prev => {
				const toRemove = passedEntriesRef.current.filter(
					e => (e.count ?? 1) < PASS_HIDE_COUNT && e.at <= oneDayAgo && prev.has(e.id),
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

	// ── Today's deck — the apps' rules (lib/dailyDeck) ───────────────────
	// Waits for the account and the catalog (useEffect, not lazy useState: either can arrive after mount). The server's
	// ranking picks the deck from the first swipe; it's pinned for the day, so a reload doesn't reshuffle it.
	const [recommendedOrder, setRecommendedOrder] = useState<BrandSummary[]>([]);
	// The rest of today's ranking, best first: what a desktop category chip brings in when the picks hold none of it.
	const [rankedPool, setRankedPool] = useState<BrandSummary[]>([]);
	// Set once today's picks are in - an empty deck (everything saved or passed) is a finished deck, not a loading one.
	const [deckPicked, setDeckPicked] = useState(false);
	// The deck day (9am rollover) - kept current while the page stays open, so a new day picks a new deck.
	const [deckDay, setDeckDay] = useState(getTodayKey);
	useEffect(() => {
		const check = () => setDeckDay(getTodayKey());
		const timer = setInterval(check, 60_000);
		document.addEventListener("visibilitychange", check);
		return () => { clearInterval(timer); document.removeEventListener("visibilitychange", check); };
	}, []);
	// Who and which day the deck was picked for: another account, or a new day, picks again.
	const pickedFor = useRef("");
	const swipedBrandsRef = useRef(swipedBrands);
	useEffect(() => { swipedBrandsRef.current = swipedBrands; }, [swipedBrands]);
	const passedBrandIdsRef = useRef(passedBrandIds);
	useEffect(() => { passedBrandIdsRef.current = passedBrandIds; }, [passedBrandIds]);

	useEffect(() => {
		const key = `${uid}:${deckDay}`;
		if (pickedFor.current === key || !account || allBrands.length === 0) return;
		// Picked once per account and day: the account refreshing (a save, a pass) must not re-pick the deck under the user.
		pickedFor.current = key;
		setDeckPicked(false);
		const held = new Set(account.stakBrandIds ?? []);
		const passed = account.passedBrands ?? [];
		const tagScores = account.tagScores ?? {};
		const byTicker = new Map(allBrands.map((b) => [b.ticker, b]));
		// A stock saved since the deck was picked (on any device, or from a stock page) leaves it.
		const brandsOf = (tickers: string[]) => tickers.flatMap((t) => byTicker.get(t) ?? []).filter((b) => !held.has(b.id));
		(async () => {
			const [shared, recs] = await Promise.all([
				getDailyDeck(deckDay).then((d) => d.tickers, () => null),
				getSortedRecommendations().then((d) => d.brandIds ?? [], () => []),
			]);
			// Offline or signed out: the account's own taste, ranked here - not shared, so the next load can do better.
			const eligible = eligibleInOrder(allBrands, recs.length > 0 ? recs : rankLocally(allBrands, tagScores), held, passed);
			// A deck stands even when it's all been saved since: today's picks are done, not re-picked.
			const tickers = await chooseDailyDeck({
				shared,
				pinned: readPinnedDeck(uid, deckDay),
				ranked: recs.length > 0,
				pick: () => withCategoryCap(eligible, DAILY_SWIPE_LIMIT).map((b) => b.ticker),
				offer: (mine) => offerDailyDeck(deckDay, mine).then((d) => d.tickers),
			});
			if (pickedFor.current !== key) return;
			if (tickers) pinDailyDeck(uid, deckDay, tickers);
			setRecommendedOrder(tickers ? brandsOf(tickers) : withCategoryCap(eligible, DAILY_SWIPE_LIMIT));
			setRankedPool(eligible);
			setDeckPicked(true);
		})();
	}, [account, allBrands, uid, deckDay]);

	const handleLearnMore = useCallback((brand: BrandSummary) => {
		setQuickLookBrand(brand);
		recordEngagement("learn_more", brand.id, { ticker: brand.ticker, categories: brand.interestCategories }).catch(() => {});
	}, []);

	// Each card's server writes run one after another: STAK -> Undo -> STAK again, sent all at once, could otherwise land
	// as add, add, remove and leave a card that looks saved but isn't. Same for a pass and its undo.
	const brandOps = useRef(new Map<string, Promise<unknown>>());
	const inOrder = <T,>(brandId: string, op: () => Promise<T>): Promise<T> => {
		const run = (brandOps.current.get(brandId) ?? Promise.resolve()).catch(() => {}).then(op);
		brandOps.current.set(brandId, run);
		run.catch(() => {}).then(() => { if (brandOps.current.get(brandId) === run) brandOps.current.delete(brandId); });
		return run;
	};

	// An undone card returns to the front of the deck.
	const backToFront = (brand: BrandSummary) => setRecommendedOrder((cur) => [brand, ...cur.filter((b) => b.id !== brand.id)]);

	/** Android's STAK: adds the card to My STAK now ("full" when there's no room). Returns how to take it back.
	 *  Reads and updates the refs as well as state, so two decisions before the next render both count. */
	const handleSave = (brand: BrandSummary): "full" | Undo => {
		if (swipedBrandsRef.current.length >= STAK_CAPACITY) return "full";
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
		const quoted = queryClient.getQueryData<{ quote: { price: number } | null }>(["stock", brand.ticker])?.quote?.price;
		// A $0 quote is no price - the save records none rather than measure "since you saved" from $0 (the apps).
		const cachedPrice = quoted !== undefined && quoted > 0 ? quoted : null;
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
	const deckBrands = useMemo(() => withFocus(
		filteredBrands,
		focus,
		focus ? rankedPool.filter((b) => !swipedBrands.some((s) => s.id === b.id) && !passedBrandIds.has(b.id)) : [],
	), [filteredBrands, focus, rankedPool, swipedBrands, passedBrandIds]);

	// A card's tint comes from where it sits in the day's order, so it stays the same as cards leave the deck.
	const paletteIndexById = useMemo(() => new Map(recommendedOrder.map((b, i) => [b.id, i])), [recommendedOrder]);
	// Pinned on first sight: an undone card moves to the front of the order, which would recolour it.
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

	const deckLoading = !deckPicked && !hasReachedLimit;
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
				className="text-[#0A1020] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
