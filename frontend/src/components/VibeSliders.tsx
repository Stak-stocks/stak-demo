import { useState, useEffect, useRef } from "react";
import type { VibeMetric } from "@/data/brands";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VibeSlidersProps {
	vibes: VibeMetric[];
	isTopCard?: boolean;
}

const VIBE_EXPLANATIONS: Record<string, string> = {
	"Clout": "How big and culturally important this brand feels right now.\nIf it disappeared tomorrow, people would notice.",
	"Drama Level": "How messy or unpredictable the story around this stock is.\nMore drama = more surprises.",
	"Internet Hype": "How much the internet is talking about this brand right now.\nTrending doesn't always mean good — just loud.",
};

export function VibeSliders({ vibes, isTopCard = false }: VibeSlidersProps) {
	const [loaded, setLoaded] = useState(false);
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const wasTopCard = useRef(false);

	useEffect(() => {
		if (isTopCard && !wasTopCard.current) {
			setLoaded(false);
			const timer = setTimeout(() => setLoaded(true), 100);
			wasTopCard.current = true;
			return () => clearTimeout(timer);
		}
		if (!isTopCard) {
			wasTopCard.current = false;
			setLoaded(false);
		}
	}, [isTopCard]);

	return (
		<div className="space-y-3">
			{vibes.map((vibe, i) => (
				<div key={vibe.name} className="space-y-1.5">
					<Tooltip delayDuration={0}>
						<TooltipTrigger asChild>
							<button
								className="text-sm font-bold text-white cursor-pointer hover:text-zinc-200 transition-colors active:scale-95 touch-manipulation"
								type="button"
								aria-label={`Learn about ${vibe.name}`}
							>
								{vibe.name}
							</button>
						</TooltipTrigger>
						<TooltipContent
							side="top"
							sideOffset={8}
							className="bg-[#0f1629] border border-slate-700/50 text-slate-100 px-4 py-3 max-w-xs text-sm leading-relaxed shadow-xl"
							onPointerDownOutside={(e) => e.preventDefault()}
						>
							<p className="whitespace-pre-line">
								{VIBE_EXPLANATIONS[vibe.name] || ""}
							</p>
						</TooltipContent>
					</Tooltip>

					{/* Neon glow bar with arrow tip */}
					<div
						className="relative cursor-pointer"
						onMouseEnter={() => setHoveredIndex(i)}
						onMouseLeave={() => setHoveredIndex(null)}
					>
						{/* Percentage badge above bar */}
						{hoveredIndex === i && (
							<div
								className="absolute -top-7 px-2 py-0.5 rounded-md text-xs font-bold text-white pointer-events-none z-10"
								style={{
									left: `${vibe.value}%`,
									transform: "translateX(-50%)",
									backgroundColor: vibe.color,
									boxShadow: `0 0 10px ${vibe.color}, 0 0 20px ${vibe.color}60`,
								}}
							>
								{vibe.value}%
							</div>
						)}

						{/* Track background */}
						<div className="h-3 w-full rounded-full bg-zinc-800/60">
							{/* Smooth rounded neon bar */}
							<div
								className="h-full rounded-full relative"
								style={{
									width: loaded ? `${vibe.value}%` : "0%",
									transition: `width ${0.8 + i * 0.2}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
									background: `linear-gradient(90deg, ${vibe.color}99 0%, ${vibe.color} 70%, #ffffffCC 100%)`,
									boxShadow: `0 0 8px ${vibe.color}, 0 0 16px ${vibe.color}80, 0 0 32px ${vibe.color}40`,
								}}
							>
								{/* Top highlight for depth */}
								<div
									className="absolute inset-0 rounded-full"
									style={{
										background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%)",
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
