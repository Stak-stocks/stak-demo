import type { BrandProfile } from "@/data/brands";
import { getBrandLogoUrl } from "@/data/brands";
import { VibeSliders } from "@/components/VibeSliders";

interface StockCardProps {
	brand: BrandProfile;
	onLearnMore: (brand: BrandProfile) => void;
	priority?: boolean;
	isTopCard?: boolean;
}

export function StockCard({ brand, onLearnMore, priority = false, isTopCard = false }: StockCardProps) {
	return (
		<div className="relative rounded-2xl p-[2px] overflow-hidden h-full flex flex-col select-none">
			{/* Animated rotating gradient border */}
			<div
				className="absolute inset-[-50%] animate-[spin_4s_linear_infinite]"
				style={{
					background: "conic-gradient(from 0deg, #00c8ff, #7850ff, #c832c8, #ff6432, #00c8ff)",
				}}
			/>
			{/* Glow effect behind the card */}
			<div
				className="absolute inset-0 rounded-2xl"
				style={{
					boxShadow: "0 0 20px rgba(0,200,255,0.4), 0 0 40px rgba(120,80,255,0.2), 0 0 60px rgba(200,50,200,0.15)",
				}}
			/>
			<div
				className="relative overflow-hidden rounded-2xl flex-1 flex flex-col"
				style={{
					background: "linear-gradient(145deg, #1a1f2e 0%, #0f1320 100%)",
				}}
			>
			{/* Hero image */}
			<div className="relative h-36 sm:h-48 overflow-hidden">
				<img
					src={brand.heroImage}
					alt={brand.name}
					className="w-full h-full object-cover"
					loading={priority ? "eager" : "lazy"}
					decoding="async"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-[#0f1320] via-[#0f1320]/40 to-transparent" />
			</div>

			{/* Content */}
			<div className="px-4 sm:px-5 pt-4 pb-4 space-y-3 flex-1 flex flex-col">
				{/* Brand name + ticker */}
				<div className="h-[5.5rem] sm:h-24 overflow-hidden">
					<div className="flex items-center gap-2">
						<img
							src={getBrandLogoUrl(brand)}
							alt={`${brand.name} logo`}
							className="w-6 h-6 sm:w-7 sm:h-7 rounded-md object-contain shrink-0 animate-[flip-y_2s_linear_infinite]"
						/>
						<h2 className="text-xl sm:text-2xl font-bold text-white truncate">{brand.name}</h2>
						<span className="text-[10px] sm:text-xs font-mono font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
							{brand.ticker}
						</span>
					</div>
					<p className="text-zinc-400 text-xs sm:text-sm mt-1.5 line-clamp-2">{brand.bio}</p>
				</div>

				{/* Vibe sliders */}
				<div>
					<VibeSliders vibes={brand.vibes} isTopCard={isTopCard} />
				</div>

				{/* CTA button with animated rotating neon glow */}
				<div className="relative rounded-xl p-[2px] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]">
					<div
						className="absolute inset-[-50%] animate-[spin_4s_linear_infinite]"
						style={{
							background: "conic-gradient(from 0deg, #00c8ff, #7850ff, #c832c8, #ff6432, #00c8ff)",
						}}
					/>
					<div
						className="absolute inset-0 rounded-xl"
						style={{
							boxShadow: "0 0 20px rgba(0,200,255,0.5), 0 0 40px rgba(120,80,255,0.3), 0 0 60px rgba(200,50,200,0.2)",
						}}
					/>
					<button
						onClick={() => onLearnMore(brand)}
						className="relative w-full group rounded-xl px-4 py-3 text-center"
						style={{
							background: "linear-gradient(135deg, #141828 0%, #0f1320 100%)",
						}}
					>
						<div className="flex items-center justify-center gap-3">
							<span className="text-white font-bold text-base">
								Why do people care...
							</span>
							<svg className="w-7 h-7 group-hover:rotate-12 transition-transform flex-shrink-0" viewBox="0 0 24 24" fill="none" style={{ filter: "drop-shadow(0 0 6px rgba(255,215,0,0.8)) drop-shadow(0 0 12px rgba(255,215,0,0.4))" }}>
								<path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" fill="#FFD700" stroke="#FFD700" strokeWidth="0.5" />
								<path d="M19 11l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill="#FFD700" opacity="0.85" />
								<path d="M6 15l.7 2.1 2.3.7-2.3.7L6 20.6l-.7-2.1-2.3-.7 2.3-.7L6 15z" fill="#FFD700" opacity="0.65" />
							</svg>
						</div>
					</button>
				</div>
			</div>
			</div>
		</div>
	);
}
