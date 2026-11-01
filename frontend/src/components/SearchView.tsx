import { useState, useEffect, useCallback, useRef, useMemo, useId } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { X, Search, Clock, Trash2, Check, Plus, ArrowRight } from "lucide-react";
import type { BrandSummary } from "@stak/shared";
import { useBrandsList } from "@/hooks/useBrandsList";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { getBatchQuotes, recordEngagement } from "@/lib/api";
import { DiscoverCard } from "@/components/discover/DiscoverCard";
import { QuickLookSheet } from "@/components/discover/QuickLookSheet";
import { CARD_PALETTE, CARD_WIDTH, DISC } from "@/components/discover/discoverTheme";
import { useFigmaUnit } from "@/components/discover/useFigmaUnit";
import { DESK } from "@/components/desktop/deskKit";

const MAX_RESULTS = 20;
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#69B3CA]";

interface SearchViewProps {
	open: boolean;
	onClose: () => void;
	onSwipeRight?: (brand: BrandSummary) => void;
}

/**
 * Company search: results are Discover's own cards, TIP included (Learn more opens the same Quick Look sheet), with Add
 * to STAK and View stock under each. Prices for every result come from one batch request instead of one per card.
 * Tips are cached server-side for 30 days per company (shared by every user), so only a company nobody has viewed in
 * that time costs a Gemini call.
 */
export function SearchView({ open, onClose, onSwipeRight }: SearchViewProps) {
	const navigate = useNavigate();
	const { appUser } = useAuth();
	const { account, addSearchHistory, removeSearchHistoryEntry, clearSearchHistory } = useAccount();
	const { data: allBrands } = useBrandsList();
	const isMobile = useIsMobile();
	const phoneUnit = useFigmaUnit();
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [quickLook, setQuickLook] = useState<BrandSummary | null>(null);

	// Pre-built search index -- recomputed only when the catalog itself changes
	// (effectively once per session, since useBrandsList has a 24h staleTime),
	// not on every keystroke.
	const searchIndex = useMemo(
		() => (allBrands ?? []).map((b) => ({
			brand: b,
			nameLower: b.name.toLowerCase(),
			tickerLower: b.ticker.toLowerCase(),
		})),
		[allBrands],
	);

	const recentSearches = (account?.searchHistory ?? []).map((e) => e.query);
	const stakIds = useMemo(() => new Set(account?.stakBrandIds ?? []), [account?.stakBrandIds]);

	// Clear search when closing; auto-focus when opening
	useEffect(() => {
		if (!open) {
			setQuery("");
			setDebouncedQuery("");
			setQuickLook(null);
		} else {
			const t = setTimeout(() => inputRef.current?.focus(), 120);
			return () => clearTimeout(t);
		}
	}, [open]);

	// Debounce so the result cards (and their one price request) don't churn on every keystroke.
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query), 200);
		return () => clearTimeout(timer);
	}, [query]);

	const results = useMemo(() => {
		const q = debouncedQuery.trim().toLowerCase();
		if (!q) return [];
		return searchIndex
			.filter(({ nameLower, tickerLower }) => nameLower.includes(q) || tickerLower.includes(q))
			.map(({ brand }) => brand)
			.slice(0, MAX_RESULTS);
	}, [debouncedQuery, searchIndex]);

	const tickers = useMemo(() => results.map((b) => b.ticker), [results]);
	const { data: quoteData } = useQuery({
		queryKey: ["batch-quotes", tickers],
		queryFn: () => getBatchQuotes(tickers),
		enabled: open && tickers.length > 0,
		staleTime: 60 * 1000,
		retry: 1,
	});
	const quotes = quoteData?.quotes ?? {};

	const remember = useCallback((brand: BrandSummary) => {
		if (appUser) addSearchHistory(brand.name).catch(() => {});
	}, [appUser, addSearchHistory]);

	const openQuickLook = useCallback((brand: BrandSummary) => {
		remember(brand);
		setQuickLook(brand);
		recordEngagement("learn_more", brand.id, { ticker: brand.ticker, categories: brand.interestCategories }).catch(() => {});
	}, [remember]);

	// A modal over the page: focus goes back to whatever opened it (the top bar's search) when it closes.
	const dialogRef = useRef<HTMLDivElement>(null);
	const titleId = useId();
	useEffect(() => {
		if (!open) return;
		const opener = document.activeElement as HTMLElement | null;
		return () => { opener?.focus?.(); };
	}, [open]);
	// Tab stays inside (the page behind is covered); from anywhere outside it comes back in.
	const trapTab = (e: React.KeyboardEvent) => {
		if (e.key !== "Tab" || quickLook || !dialogRef.current) return;
		const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex='-1'])");
		if (focusable.length === 0) return;
		const first = focusable[0]!, last = focusable[focusable.length - 1]!;
		const active = document.activeElement;
		if (!dialogRef.current.contains(active)) { e.preventDefault(); first.focus(); }
		else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
		else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
	};

	// Esc closes the Quick Look sheet first (it handles its own Esc), then the search.
	useEffect(() => {
		if (!open || quickLook) return;
		const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, quickLook, onClose]);

	if (!open) return null;

	const searching = query.trim().length > 0;

	return (
		<>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				onKeyDown={trapTab}
				className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:left-[220px] md:bottom-0 z-50 flex flex-col"
				// Cards are drawn in figma units: the phone's own scale on mobile, 1:1 (a 350px card) on desktop.
				style={{ background: DISC.pageBg, ["--u" as string]: `${isMobile ? phoneUnit : 1}px` }}
			>
				{/* Sticky header + search — never scrolls */}
				<div className="mx-auto w-full max-w-6xl shrink-0 px-4 pb-4 pt-6 sm:px-6 lg:px-8">
					<div className="mb-5 flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className={`grid h-[36px] w-[36px] place-items-center rounded-full transition-opacity hover:opacity-80 ${focusRing}`}
							style={{ background: DISC.navCircle }}
							aria-label="Close search"
							title="Cancel"
						>
							<X className="h-[18px] w-[18px]" style={{ color: "#AEAEAE" }} />
						</button>
						<h2 id={titleId} className="font-heading text-[20px] font-semibold text-white">Search Stocks</h2>
					</div>

					<div className="relative">
						<Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2" style={{ color: DISC.muted }} aria-hidden="true" />
						<input
							ref={inputRef}
							type="search"
							inputMode="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by ticker or company name..."
							aria-label="Search by ticker or company name"
							autoComplete="off"
							autoCorrect="off"
							spellCheck={false}
							className="h-[48px] w-full rounded-[12px] border border-[#64789A] pl-11 pr-4 text-[14px] text-white outline-none transition-colors placeholder:text-[#819ABB] focus-visible:border-[#69B3CA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#69B3CA]"
							style={{ background: DISC.sheet }}
						/>
					</div>
				</div>

				{/* Scrollable results area */}
				<div className="flex-1 overflow-y-auto">
					<div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
						{searching ? (
							results.length > 0 ? (
								<>
									<p role="status" className="mb-4 text-[13px]" style={{ color: DISC.muted }}>
										{results.length === MAX_RESULTS ? `Top ${MAX_RESULTS} matches` : `${results.length} ${results.length === 1 ? "match" : "matches"}`} — Learn more for a quick look.
									</p>
									<div className="grid justify-center gap-6" style={{ gridTemplateColumns: `repeat(auto-fill, calc(${CARD_WIDTH} * var(--u)))` }}>
										{results.map((brand, i) => {
											const saved = stakIds.has(brand.id);
											const quote = quotes[brand.ticker] ?? null;
											return (
												<div key={brand.id} className="flex flex-col gap-3">
													<DiscoverCard brand={brand} paletteIndex={i % CARD_PALETTE.length} quote={quote} onLearnMore={openQuickLook} />
													<div className="flex gap-2">
														<button
															type="button"
															disabled={saved || !onSwipeRight}
															onClick={() => { remember(brand); onSwipeRight?.(brand); }}
															className={`flex h-[40px] flex-1 items-center justify-center gap-[6px] rounded-[12px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-default disabled:hover:opacity-100 ${focusRing}`}
															style={saved
																? { background: "rgba(47,208,138,0.12)", color: DISC.green }
																: { background: DESK.cta, color: DESK.ctaText }}
														>
															{saved ? <><Check className="h-[15px] w-[15px]" aria-hidden="true" /> In your STAK</> : <><Plus className="h-[15px] w-[15px]" aria-hidden="true" /> Add to STAK</>}
														</button>
														<button
															type="button"
															onClick={() => { remember(brand); navigate({ to: "/stock/$symbol", params: { symbol: brand.ticker } }); }}
															className={`flex h-[40px] flex-1 items-center justify-center gap-[6px] rounded-[12px] text-[13px] font-medium text-white transition-colors hover:bg-white/[0.06] ${focusRing}`}
															style={{ border: "1px solid rgba(120,170,220,0.22)" }}
														>
															View stock <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
														</button>
													</div>
												</div>
											);
										})}
									</div>
								</>
							) : (
								<div className="py-12 text-center">
									<p className="text-[14px] text-white">No results found for "{query}"</p>
									<p className="mt-2 text-[13px]" style={{ color: DISC.muted }}>Try a different ticker or company name</p>
								</div>
							)
						) : recentSearches.length > 0 ? (
							<div className="max-w-[560px]">
								<div className="mb-3 flex items-center justify-between">
									<h3 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: DISC.muted }}>Recent searches</h3>
									<button
										type="button"
										onClick={() => clearSearchHistory().catch(() => {})}
										className={`flex items-center gap-1 rounded-md text-[12px] transition-colors hover:text-[#FF5A6A] ${focusRing}`}
										style={{ color: DISC.muted }}
									>
										<Trash2 className="h-[14px] w-[14px]" aria-hidden="true" /> Clear
									</button>
								</div>
								<ul className="flex flex-col gap-1">
									{recentSearches.map((search) => (
										<li key={search} className="group flex items-center gap-3 rounded-[10px] px-3 py-[10px] transition-colors hover:bg-white/[0.04]">
											<button type="button" onClick={() => setQuery(search)} className={`flex min-w-0 flex-1 items-center gap-3 rounded-md text-left ${focusRing}`}>
												<Clock className="h-[15px] w-[15px] shrink-0" style={{ color: DISC.muted }} aria-hidden="true" />
												<span className="truncate text-[14px] text-white">{search}</span>
											</button>
											<button
												type="button"
												onClick={() => removeSearchHistoryEntry(search).catch(() => {})}
												className={`grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full transition-colors hover:bg-white/[0.08] ${focusRing}`}
												aria-label={`Remove ${search}`}
											>
												<X className="h-[15px] w-[15px]" style={{ color: DISC.muted }} />
											</button>
										</li>
									))}
								</ul>
							</div>
						) : (
							<div className="py-12 text-center">
								<Search className="mx-auto mb-4 h-[44px] w-[44px]" style={{ color: DISC.faint }} aria-hidden="true" />
								<p className="text-[14px] text-white">Start typing to search stocks</p>
								<p className="mt-2 text-[13px]" style={{ color: DISC.muted }}>Search by ticker (e.g., AAPL) or company name</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{quickLook && <QuickLookSheet brand={quickLook} onClose={() => setQuickLook(null)} />}
		</>
	);
}
