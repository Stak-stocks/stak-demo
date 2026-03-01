import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Clock, Trash2 } from "lucide-react";
import { brands, type BrandProfile } from "@/data/brands";

const MAX_RESULTS = 20;

const searchIndex = brands.map((b) => ({
	brand: b,
	nameLower: b.name.toLowerCase(),
	tickerLower: b.ticker.toLowerCase(),
}));
import { StockCard } from "./StockCard";
import { BrandContextModal } from "./BrandContextModal";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";

interface SearchViewProps {
	open: boolean;
	onClose: () => void;
	onSwipeRight?: (brand: BrandProfile) => void;
}

export function SearchView({ open, onClose, onSwipeRight }: SearchViewProps) {
	const { user } = useAuth();
	const { account, addSearchHistory, removeSearchHistoryEntry, clearSearchHistory } = useAccount();
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [results, setResults] = useState<BrandProfile[]>([]);
	const [selectedBrand, setSelectedBrand] = useState<BrandProfile | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	// Recent searches from Firestore (account-based, cross-device)
	const recentSearches = (account?.searchHistory ?? []).map((e) => e.query);

	// Prevent pull-to-refresh / overscroll on the page behind the search overlay
	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overscrollBehavior;
		document.body.style.overscrollBehavior = 'none';
		document.documentElement.style.overscrollBehavior = 'none';
		return () => {
			document.body.style.overscrollBehavior = prev;
			document.documentElement.style.overscrollBehavior = '';
		};
	}, [open]);

	// On iOS, blur the input whenever a touch begins *outside* the input.
	useEffect(() => {
		if (!open) return;
		const handler = (e: TouchEvent) => {
			if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
				inputRef.current.blur();
			}
		};
		document.addEventListener('touchstart', handler, { passive: true });
		return () => document.removeEventListener('touchstart', handler);
	}, [open]);

	// Clear search when closing
	useEffect(() => {
		if (!open) {
			setQuery("");
			setDebouncedQuery("");
			setResults([]);
		}
	}, [open]);

	// Debounce query so heavy StockCard re-renders don't fire on every keystroke
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query), 200);
		return () => clearTimeout(timer);
	}, [query]);

	useEffect(() => {
		if (!debouncedQuery.trim()) {
			setResults([]);
			return;
		}

		const q = debouncedQuery.toLowerCase();
		const filtered = searchIndex
			.filter(({ nameLower, tickerLower }) => nameLower.includes(q) || tickerLower.includes(q))
			.map(({ brand }) => brand)
			.slice(0, MAX_RESULTS);

		setResults(filtered);
	}, [debouncedQuery]);

	// Save clicked brand name to search history (Firestore via AccountContext)
	const handleLearnMore = useCallback((brand: BrandProfile) => {
		if (user) {
			addSearchHistory(brand.name).catch(() => {});
		}
		if (modalOpen && selectedBrand?.id === brand.id) {
			setModalOpen(false);
			setTimeout(() => setSelectedBrand(null), 200);
		} else {
			setSelectedBrand(brand);
			setModalOpen(true);
		}
	}, [user, addSearchHistory, modalOpen, selectedBrand]);

	const handleCloseModal = () => {
		setModalOpen(false);
		setTimeout(() => setSelectedBrand(null), 200);
	};

	const handleRecentClick = (search: string) => {
		setQuery(search);
	};

	const handleRemoveRecent = (search: string) => {
		removeSearchHistoryEntry(search).catch(() => {});
	};

	const handleClearRecent = () => {
		clearSearchHistory().catch(() => {});
	};

	if (!open) return null;

	return (
		<>
			<div
				className="fixed inset-0 bg-white dark:bg-[#0b1121] z-50 flex flex-col"
				style={{
					transform: 'translate3d(0,0,0)',
					WebkitTransform: 'translate3d(0,0,0)',
					overscrollBehavior: 'none',
					WebkitOverflowScrolling: 'auto',
				} as React.CSSProperties}
			>
				{/* Sticky header + search — never scrolls */}
				<div
					className="shrink-0 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4"
					style={{ touchAction: 'pan-x' }}
				>
					{/* Header */}
					<div className="flex items-center gap-4 mb-6">
						<button
							onClick={onClose}
							className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#162036] transition-colors"
						>
							<X className="w-6 h-6 text-zinc-900 dark:text-white" />
						</button>
						<h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
							Search Stocks
						</h2>
					</div>

					{/* Search Input */}
					<div className="relative overflow-hidden rounded-xl">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500 z-10" />
						<input
							ref={inputRef}
							type="search"
							inputMode="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by ticker or company name..."
							autoComplete="off"
							autoCorrect="off"
							spellCheck={false}
							className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-zinc-200 dark:border-slate-700/50 bg-white dark:bg-[#0f1629] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors"
							onBlur={() => {/* allow natural blur */}}
						/>
					</div>
				</div>

				{/* Scrollable results area — blur input on scroll so caret hides */}
				<div
					className="flex-1 overflow-y-auto"
					style={{ overscrollBehavior: 'none' } as React.CSSProperties}
					onTouchMove={() => inputRef.current?.blur()}
					onScroll={() => inputRef.current?.blur()}
				>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

					{/* Results */}
					{query.trim() ? (
						results.length > 0 ? (
							<div className="space-y-6">
								<p className="text-sm text-zinc-500 dark:text-zinc-400">
									Search results — tap to explore the vibe.
								</p>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
									{results.map((brand) => (
										<div key={brand.id} className="h-full">
											<StockCard brand={brand} onLearnMore={handleLearnMore} />
										</div>
									))}
								</div>
							</div>
						) : (
							<div className="text-center py-12">
								<p className="text-zinc-500 dark:text-zinc-400">
									No results found for "{query}"
								</p>
								<p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
									Try searching for a different ticker or company name
								</p>
							</div>
						)
					) : (
						<div>
							{recentSearches.length > 0 ? (
								<div>
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
											Recent Searches
										</h3>
										<button
											type="button"
											onClick={handleClearRecent}
											className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
										>
											<Trash2 className="w-3.5 h-3.5" />
											Clear
										</button>
									</div>
									<div className="space-y-1">
										{recentSearches.map((search) => (
											<div
												key={search}
												className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-[#162036] transition-colors group"
											>
												<button
													type="button"
													onClick={() => handleRecentClick(search)}
													className="flex items-center gap-3 flex-1 min-w-0 text-left"
												>
													<Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
													<span className="text-zinc-700 dark:text-zinc-300 text-sm truncate group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
														{search}
													</span>
												</button>
												<button
													type="button"
													onClick={() => handleRemoveRecent(search)}
													className="p-1.5 rounded-full text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-slate-700/50 transition-colors shrink-0"
													aria-label={`Remove ${search}`}
												>
													<X className="w-4 h-4" />
												</button>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="text-center py-12">
									<Search className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
									<p className="text-zinc-500 dark:text-zinc-400">
										Start typing to search stocks
									</p>
									<p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
										Search by ticker (e.g., AAPL) or company name
									</p>
								</div>
							)}
						</div>
					)}
				</div>
				</div>
			</div>

			<BrandContextModal
				brand={selectedBrand}
				open={modalOpen}
				onClose={handleCloseModal}
				onAddToStak={onSwipeRight}
			/>
		</>
	);
}
