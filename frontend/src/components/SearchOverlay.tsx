import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock } from "lucide-react";
import { brands, getBrandLogoUrl, type BrandProfile } from "@/data/brands";

const RECENT_KEY = "search-recent";
const MAX_RECENT = 5;

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
	const [recentIds, setRecentIds] = useState<string[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) {
			setQuery("");
			setRecentIds(getRecentIds());
			setTimeout(() => inputRef.current?.focus(), 100);
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

	const recentBrands = recentIds
		.map((id) => brands.find((b) => b.id === id))
		.filter(Boolean) as BrandProfile[];

	const filtered = query.trim()
		? brands.filter(
				(b) =>
					b.name.toLowerCase().includes(query.toLowerCase()) ||
					b.ticker.toLowerCase().includes(query.toLowerCase()),
			)
		: [];

	const showRecent = !query.trim() && recentBrands.length > 0;
	const showPopular = !query.trim();

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-white/95 dark:bg-[#0b1121]/98 backdrop-blur-xl">
			{/* Search header */}
			<div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-slate-800/60">
				<Search className="w-5 h-5 text-slate-400 shrink-0" />
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search stocks..."
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
				{query.trim() && (
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

function BrandRow({ brand, onSelect }: { brand: BrandProfile; onSelect: (b: BrandProfile) => void }) {
	return (
		<button
			type="button"
			onClick={() => onSelect(brand)}
			className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
		>
			<img
				src={getBrandLogoUrl(brand)}
				alt={brand.name}
				className="w-9 h-9 rounded-lg object-contain bg-[#1a1f2e] p-1"
			/>
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
}
