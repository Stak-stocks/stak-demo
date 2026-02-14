import type { BrandProfile } from "@/data/brands";
import { getBrandLogoUrl } from "@/data/brands";
import { VibeSliders } from "@/components/VibeSliders";
import { Sparkles } from "lucide-react";

interface StockCardProps {
	brand: BrandProfile;
	onLearnMore: (brand: BrandProfile) => void;
	priority?: boolean;
}

export function StockCard({ brand, onLearnMore, priority = false }: StockCardProps) {
	return (
		<div
			className="overflow-hidden rounded-2xl"
			style={{
				background: "linear-gradient(145deg, #1a1f2e 0%, #0f1320 100%)",
				border: "1px solid rgba(0, 200, 255, 0.15)",
				boxShadow: "0 0 20px rgba(0, 200, 255, 0.08), 0 0 60px rgba(0, 200, 255, 0.04)",
			}}
		>
			{/* Hero image with brand logo */}
			<div className="relative h-36 sm:h-48 overflow-hidden">
				<img
					src={brand.heroImage}
					alt={brand.name}
					className="w-full h-full object-cover"
					loading={priority ? "eager" : "lazy"}
					decoding="async"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-[#0f1320] via-[#0f1320]/40 to-transparent" />

				{/* Floating brand logo */}
				<div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-10">
					<div
						className="w-12 h-12 rounded-xl overflow-hidden bg-[#1a1f2e] p-0.5"
						style={{
							boxShadow: "0 0 12px rgba(0, 200, 255, 0.2), 0 4px 12px rgba(0,0,0,0.4)",
							border: "1px solid rgba(0, 200, 255, 0.2)",
						}}
					>
						<img
							src={getBrandLogoUrl(brand)}
							alt={`${brand.name} logo`}
							className="w-full h-full rounded-lg object-contain"
						/>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="px-4 sm:px-5 pt-8 pb-4 space-y-3">
				{/* Brand name + ticker */}
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-xl sm:text-2xl font-bold text-white">{brand.name}</h2>
						<span className="text-[10px] sm:text-xs font-mono font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
							{brand.ticker}
						</span>
					</div>
					<p className="text-zinc-400 text-xs sm:text-sm mt-1.5 line-clamp-3">{brand.bio}</p>
				</div>

				{/* Vibe sliders */}
				<VibeSliders vibes={brand.vibes} />

				{/* CTA button with neon gradient border */}
				<div
					className="rounded-xl p-[1px] transition-all hover:scale-[1.02] active:scale-[0.98]"
					style={{
						background: "linear-gradient(135deg, rgba(0,200,255,0.6), rgba(168,85,247,0.4), rgba(255,100,50,0.6))",
						boxShadow: "0 0 12px rgba(0, 200, 255, 0.15), 0 0 12px rgba(255, 100, 50, 0.15)",
					}}
				>
					<button
						onClick={() => onLearnMore(brand)}
						className="w-full group rounded-xl px-4 py-3 text-center"
						style={{
							background: "linear-gradient(135deg, #141828 0%, #0f1320 100%)",
						}}
					>
						<div className="flex items-center justify-center gap-2">
							<span className="text-white font-semibold text-sm">
								Why do people care...
							</span>
							<Sparkles className="w-4 h-4 text-orange-400 group-hover:rotate-12 transition-transform" />
						</div>
					</button>
				</div>
			</div>
		</div>
	);
}
