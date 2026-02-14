import type { VibeMetric } from "@/data/brands";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VibeSlidersProps {
	vibes: VibeMetric[];
}

const VIBE_EXPLANATIONS: Record<string, string> = {
	"Clout": "How big and culturally important this brand feels right now.\nIf it disappeared tomorrow, people would notice.",
	"Drama Level": "How messy or unpredictable the story around this stock is.\nMore drama = more surprises.",
	"Internet Hype": "How much the internet is talking about this brand right now.\nTrending doesn't always mean good — just loud.",
};

export function VibeSliders({ vibes }: VibeSlidersProps) {
	return (
		<div className="space-y-2.5">
			{vibes.map((vibe) => (
				<div key={vibe.name} className="space-y-1">
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

					{/* Neon glow bar */}
					<div className="h-2.5 w-full rounded-full bg-zinc-800/60 overflow-hidden">
						<div
							className="h-full rounded-full transition-all duration-700 ease-out"
							style={{
								width: `${vibe.value}%`,
								backgroundColor: vibe.color,
								boxShadow: `0 0 8px ${vibe.color}80, 0 0 20px ${vibe.color}40`,
							}}
						/>
					</div>
				</div>
			))}
		</div>
	);
}
