import { type BrandProfile, getBrandLogoUrl, getBrandFallbackLogoUrl, getBrandUltimateFallbackUrl } from "@/data/brands";

interface BrandLogoProps {
	brand: BrandProfile;
	className?: string; // sizing, rounding, bg, animation — applied to the outer div
	alt?: string;
}

/**
 * Renders a brand logo with no-gap fallback.
 * Fallback preloads in parallel but stays invisible — only shown if primary fails.
 */
export function BrandLogo({ brand, className = "w-9 h-9 rounded-lg", alt }: BrandLogoProps) {
	return (
		<div className={`relative overflow-hidden shrink-0 ${className}`}>
			{/* Chip background — dark so white-icon logos (TradingView) and white-bg logos (EODHD) both look clean */}
			<div className="absolute inset-0 bg-white dark:bg-zinc-800" />
			{/* Fallback preloads silently — made visible only when primary errors */}
			<img
				src={getBrandFallbackLogoUrl(brand)}
				alt=""
				aria-hidden="true"
				className="absolute inset-0 w-full h-full object-contain opacity-0"
				onError={(e) => { (e.target as HTMLImageElement).src = getBrandUltimateFallbackUrl(brand); }}
			/>
			{/* Primary sits on top — on error, hides itself and reveals the fallback */}
			<img
				src={getBrandLogoUrl(brand)}
				alt={alt ?? brand.name}
				className="absolute inset-0 w-full h-full object-contain"
				onError={(e) => {
					const primary = e.target as HTMLImageElement;
					primary.style.display = "none";
					const fallback = primary.previousElementSibling as HTMLImageElement;
					if (fallback) fallback.style.opacity = "1";
				}}
			/>
		</div>
	);
}
