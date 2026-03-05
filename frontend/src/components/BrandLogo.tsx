import { type BrandProfile, getBrandLogoUrl, getBrandFallbackLogoUrl, getBrandUltimateFallbackUrl } from "@/data/brands";

interface BrandLogoProps {
	brand: BrandProfile;
	className?: string; // sizing, rounding, bg, animation — applied to the outer div
	alt?: string;
}

/**
 * Renders a brand logo with parallel fallback loading.
 * Both primary and fallback images load simultaneously — no blank gap when primary fails.
 */
export function BrandLogo({ brand, className = "w-9 h-9 rounded-lg", alt }: BrandLogoProps) {
	return (
		<div className={`relative overflow-hidden shrink-0 ${className}`}>
			{/* Fallback loads in parallel behind primary */}
			<img
				src={getBrandFallbackLogoUrl(brand)}
				alt=""
				aria-hidden="true"
				className="absolute inset-0 w-full h-full object-contain"
				onError={(e) => { (e.target as HTMLImageElement).src = getBrandUltimateFallbackUrl(brand); }}
			/>
			{/* Primary on top — hides itself on error, revealing fallback */}
			<img
				src={getBrandLogoUrl(brand)}
				alt={alt ?? brand.name}
				className="absolute inset-0 w-full h-full object-contain"
				onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
			/>
		</div>
	);
}
