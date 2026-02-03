import type { BrandProfile } from "@/data/brands";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { VibeSliders } from "@/components/VibeSliders";
import { Sparkles } from "lucide-react";

interface StockCardProps {
	brand: BrandProfile;
	onLearnMore: (brand: BrandProfile) => void;
	priority?: boolean;
}

export function StockCard({ brand, onLearnMore, priority = false }: StockCardProps) {
	return (
		<Card className="overflow-hidden bg-zinc-900/80 border-zinc-800 backdrop-blur-sm shadow-2xl hover:border-zinc-700 transition-all">
			<div className="relative h-32 sm:h-48 overflow-hidden">
				<img
					src={brand.heroImage}
					alt={brand.name}
					className="w-full h-full object-cover"
					loading={priority ? "eager" : "lazy"}
					decoding="async"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
				<div className="absolute bottom-2 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6">
					<div className="flex items-baseline gap-2 sm:gap-3 mb-1">
						<h2 className="text-2xl sm:text-3xl font-bold text-white">{brand.name}</h2>
						<span className="text-xs sm:text-sm font-mono text-zinc-400 uppercase tracking-wider">
							{brand.ticker}
						</span>
					</div>
					<p className="text-zinc-300 text-xs sm:text-sm line-clamp-2">{brand.bio}</p>
				</div>
			</div>

			<CardHeader className="py-3 sm:py-6">
				<p className="text-zinc-400 text-xs sm:text-sm italic line-clamp-2">
					{brand.personalityDescription}
				</p>
			</CardHeader>

			<CardContent className="space-y-4 sm:space-y-6 pt-0">
				<VibeSliders vibes={brand.vibes} />

				<button
					onClick={() => onLearnMore(brand)}
					className="w-full group relative overflow-hidden rounded-xl px-4 sm:px-6 py-3 sm:py-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
					style={{
						background:
							"linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
						backdropFilter: "blur(10px)",
						border: "1px solid rgba(255,255,255,0.2)",
						boxShadow:
							"0 8px 32px 0 rgba(0, 217, 255, 0.15), inset 0 1px 0 0 rgba(255,255,255,0.1)",
					}}
				>
					<div className="flex items-center justify-center gap-2">
						<Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
						<span className="text-white font-semibold text-sm sm:text-base">
							Why do people care about {brand.name}?
						</span>
					</div>
					<p className="text-xs text-zinc-400 mt-1 hidden sm:block">No money. Just context.</p>
				</button>
			</CardContent>
		</Card>
	);
}
