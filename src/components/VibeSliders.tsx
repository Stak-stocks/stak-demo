import type { VibeMetric } from "@/data/brands";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VibeSlidersProps {
	vibes: VibeMetric[];
}

// Vibe metric explanations (exact copy as specified)
const VIBE_EXPLANATIONS: Record<string, string> = {
	"Clout": "How big and culturally important this brand feels right now.\nIf it disappeared tomorrow, people would notice.",
	"Drama Level": "How messy or unpredictable the story around this stock is.\nMore drama = more surprises.",
	"Internet Hype": "How much the internet is talking about this brand right now.\nTrending doesn't always mean good — just loud.",
};

export function VibeSliders({ vibes }: VibeSlidersProps) {
	return (
		<div className="space-y-4">
			{vibes.map((vibe) => (
				<div key={vibe.name} className="space-y-2">
					<div className="flex items-center justify-between">
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<button
									className="text-sm font-medium text-zinc-200 flex items-center gap-2 cursor-pointer hover:text-white transition-colors active:scale-95 transition-transform touch-manipulation"
									type="button"
									aria-label={`Learn about ${vibe.name}`}
								>
									<span className="text-lg select-none">{vibe.emoji}</span>
									<span className="select-none">{vibe.name}</span>
								</button>
							</TooltipTrigger>
							<TooltipContent
								side="top"
								sideOffset={8}
								className="bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-3 max-w-xs text-sm leading-relaxed shadow-xl"
								onPointerDownOutside={(e) => e.preventDefault()}
							>
								<p className="whitespace-pre-line">
									{VIBE_EXPLANATIONS[vibe.name] || ""}
								</p>
							</TooltipContent>
						</Tooltip>
					</div>
					<Progress
						value={vibe.value}
						className="h-3 bg-zinc-800/50 border border-zinc-700/50"
						style={
							{
								"--progress-color": vibe.color,
							} as React.CSSProperties
						}
					/>
				</div>
			))}
			<p className="text-xs text-zinc-500 italic mt-4 text-center">
				Vibes are based on recent buzz, not financial advice
			</p>
		</div>
	);
}
