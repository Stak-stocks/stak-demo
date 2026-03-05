import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, memo } from "react";
import { Search, X, Clock } from "lucide-react";
import { brands, type BrandProfile } from "@/data/brands";
import { BrandLogo } from "@/components/BrandLogo";

const RECENT_KEY = "search-recent";
const MAX_RECENT = 5;
const MAX_RESULTS = 20;

// Pre-built search index — computed once at module load, not on every keystroke
const searchIndex = brands.map((b) => ({
	brand: b,
	nameLower: b.name.toLowerCase(),
	tickerLower: b.ticker.toLowerCase(),
}));

function getRecentIds(): string[] {
	try {
		return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
	} catch {
		return [];
	}
}

function saveRecent(brandId: string) {
	const ids = getRecentIds().filter((id) => id !== brandId);
	ids.unshift(brandId);
	localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
}

interface SearchOverlayProps {
	open: boolean;
	onClose: () => void;
	onSelectBrand: (brand: BrandProfile) => void;
}

export function SearchOverlay({ open, onClose, onSelectBrand }: SearchOverlayProps) {
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [recentIds, setRecentIds] = useState<string[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) {
			setQuery("");
			setRecentIds(getRecentIds());
		}
	}, [open]);

	// Close on Escape
	useEffect(() => {
		if (!open) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [open, onClose]);

	const handleSelect = useCallback(
		(brand: BrandProfile) => {
			saveRecent(brand.id);
			onSelectBrand(brand);
			onClose();
		},
		[onSelectBrand, onClose],
	);

	const recentBrands = useMemo(
		() =>
			recentIds
				.map((id) => brands.find((b) => b.id === id))
				.filter(Boolean) as BrandProfile[],
		[recentIds],
	);

	const filtered = useMemo(() => {
		const q = deferredQuery.trim().toLowerCase();
		if (!q) return [];
		return searchIndex
			.filter(({ nameLower, tickerLower }) => nameLower.includes(q) || tickerLower.includes(q))
			.map(({ brand }) => brand)
			.slice(0, MAX_RESULTS);
	}, [deferredQuery]);

	const showRecent = !deferredQuery.trim() && recentBrands.length > 0;
	const showPopular = !deferredQuery.trim();

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0b1121]">
			{/* Search header */}
			<div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-slate-800/60">
				<Search className="w-5 h-5 text-slate-400 shrink-0" />
				<input
					ref={inputRef}
					type="search"
					inputMode="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search stocks..."
					autoFocus
					autoComplete="off"
					autoCorrect="off"
					spellCheck={false}
					className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-slate-500"
				/>
				<button
					type="button"
					onClick={onClose}
					className="p-1.5 rounded-full text-slate-400 hover:text-white transition-colors"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Results */}
			<div className="flex-1 overflow-y-auto px-4 py-3">
				{/* Recent searches */}
				{showRecent && (
					<div className="mb-4">
						<div className="flex items-center gap-2 px-3 mb-2">
							<Clock className="w-3.5 h-3.5 text-slate-500" />
							<span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recent</span>
						</div>
						<div className="space-y-1">
							{recentBrands.map((brand) => (
								<BrandRow key={brand.id} brand={brand} onSelect={handleSelect} />
							))}
						</div>
					</div>
				)}

				{/* Popular / default stocks */}
				{showPopular && (
					<div>
						<div className="px-3 mb-2">
							<span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Popular</span>
						</div>
						<div className="space-y-1">
							{brands.slice(0, 5).map((brand) => (
								<BrandRow key={brand.id} brand={brand} onSelect={handleSelect} />
							))}
						</div>
					</div>
				)}

				{/* Search results */}
				{deferredQuery.trim() && (
					filtered.length === 0 ? (
						<p className="text-center text-slate-500 mt-8">No stocks found</p>
					) : (
						<div className="space-y-1">
							{filtered.map((brand) => (
								<BrandRow key={brand.id} brand={brand} onSelect={handleSelect} />
							))}
						</div>
					)
				)}
			</div>
		</div>
	);
}

const BrandRow = memo(function BrandRow({ brand, onSelect }: { brand: BrandProfile; onSelect: (b: BrandProfile) => void }) {
	return (
		<button
			type="button"
			onClick={() => onSelect(brand)}
			className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
		>
			<BrandLogo brand={brand} className="w-9 h-9 rounded-lg" />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="font-semibold text-white text-sm">{brand.name}</span>
					<span className="text-[10px] font-mono font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-1.5 py-0.5 rounded uppercase">
						{brand.ticker}
					</span>
				</div>
				<p className="text-xs text-slate-500 truncate mt-0.5">{brand.bio}</p>
			</div>
		</button>
	);
});
