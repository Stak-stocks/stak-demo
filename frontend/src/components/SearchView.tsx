import { useState, useEffect, useCallback } from "react";
import { X, Search, Clock, Trash2 } from "lucide-react";
import { brands, type BrandProfile } from "@/data/brands";
import { StockCard } from "./StockCard";
import { BrandContextModal } from "./BrandContextModal";
import { useAuth } from "@/context/AuthContext";

const RECENT_SEARCHES_PREFIX = "recent-searches";
const MAX_RECENT_SEARCHES = 5;

function getStorageKey(uid: string | undefined) {
	return uid ? `${RECENT_SEARCHES_PREFIX}-${uid}` : RECENT_SEARCHES_PREFIX;
}

function getRecentSearches(uid: string | undefined): string[] {
	try {
		const saved = localStorage.getItem(getStorageKey(uid));
		return saved ? JSON.parse(saved) : [];
	} catch {
		return [];
	}
}

function saveRecentSearch(brandName: string, uid: string | undefined) {
	const trimmed = brandName.trim();
	if (!trimmed) return;
	const key = getStorageKey(uid);
	const recent = getRecentSearches(uid).filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
	recent.unshift(trimmed);
	localStorage.setItem(key, JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES)));
}

function removeRecentSearch(brandName: string, uid: string | undefined) {
	const key = getStorageKey(uid);
	const recent = getRecentSearches(uid).filter((s) => s.toLowerCase() !== brandName.toLowerCase());
	localStorage.setItem(key, JSON.stringify(recent));
}

function clearRecentSearches(uid: string | undefined) {
	localStorage.removeItem(getStorageKey(uid));
}

interface SearchViewProps {
	open: boolean;
	onClose: () => void;
	onSwipeRight?: (brand: BrandProfile) => void;
}

export function SearchView({ open, onClose, onSwipeRight }: SearchViewProps) {
	const { user } = useAuth();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<BrandProfile[]>([]);
	const [selectedBrand, setSelectedBrand] = useState<BrandProfile | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);

	// Load recent searches when opening
	useEffect(() => {
		if (open) {
			setRecentSearches(getRecentSearches(user?.uid));
		}
	}, [open, user?.uid]);

	// Clear search when closing
	useEffect(() => {
		if (!open) {
			setQuery("");
			setResults([]);
		}
	}, [open]);

	useEffect(() => {
		if (!query.trim()) {
			setResults([]);
			return;
		}

		const searchQuery = query.toLowerCase();
		const filtered = brands.filter(
			(brand) =>
				brand.name.toLowerCase().includes(searchQuery) ||
				brand.ticker.toLowerCase().includes(searchQuery),
		);

		setResults(filtered);
	}, [query]);

	// Save clicked brand name to recent searches
	const handleLearnMore = useCallback((brand: BrandProfile) => {
		saveRecentSearch(brand.name, user?.uid);
		setRecentSearches(getRecentSearches(user?.uid));
		if (modalOpen && selectedBrand?.id === brand.id) {
			setModalOpen(false);
			setTimeout(() => setSelectedBrand(null), 200);
		} else {
			setSelectedBrand(brand);
			setModalOpen(true);
		}
	}, [user?.uid, modalOpen, selectedBrand]);

	const handleCloseModal = () => {
		setModalOpen(false);
		setTimeout(() => setSelectedBrand(null), 200);
	};

	const handleRecentClick = (search: string) => {
		setQuery(search);
	};

	const handleRemoveRecent = (search: string) => {
		removeRecentSearch(search, user?.uid);
		setRecentSearches(getRecentSearches(user?.uid));
	};

	const handleClearRecent = () => {
		clearRecentSearches(user?.uid);
		setRecentSearches([]);
	};

	if (!open) return null;

	return (
		<>
			<div className="fixed inset-0 bg-white dark:bg-[#0b1121] z-50 overflow-y-auto">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					{/* Header */}
					<div className="flex items-center gap-4 mb-8">
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
					<div className="relative mb-8">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by ticker or company name..."
							autoFocus
							className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-zinc-200 dark:border-slate-700/50 bg-white dark:bg-[#0f1629] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors"
						/>
					</div>

					{/* Results */}
					{query.trim() ? (
						results.length > 0 ? (
							<div className="space-y-6">
								<p className="text-sm text-zinc-500 dark:text-zinc-400">
									Search results — tap to explore the vibe.
								</p>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
									{results.map((brand) => (
										<div
											key={brand.id}
											onClick={() => handleLearnMore(brand)}
											className="cursor-pointer transform transition-transform hover:scale-[1.02] active:scale-[0.98] h-full"
										>
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

			<BrandContextModal
				brand={selectedBrand}
				open={modalOpen}
				onClose={handleCloseModal}
				onAddToStak={onSwipeRight}
			/>
		</>
	);
}
