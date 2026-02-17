import { useState, useEffect, useRef } from "react";
import type { VibeMetric } from "@/data/brands";

interface VibeSlidersProps {
	vibes: VibeMetric[];
	isTopCard?: boolean;
}

const VIBE_EXPLANATIONS: Record<string, string> = {
	"Clout": "How big and culturally important this brand feels right now. If it disappeared tomorrow, people would notice.",
	"Drama Level": "How messy or unpredictable the story around this stock is. More drama = more surprises.",
	"Internet Hype": "How much the internet is talking about this brand right now. Trending doesn't always mean good — just loud.",
};

/* Animated eye icon that tracks toward center */
function EyeIcon({ color }: { color: string }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			className="shrink-0 animate-[eye-look_3s_ease-in-out_infinite]"
			style={{ filter: `drop-shadow(0 0 4px ${color})` }}
		>
			<path
				d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
				stroke={color}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle cx="12" cy="12" r="3.5" fill={color} />
			<circle cx="13" cy="11" r="1.2" fill="white" opacity="0.9" />
		</svg>
	);
}

export function VibeSliders({ vibes, isTopCard = false }: VibeSlidersProps) {
	const [loaded, setLoaded] = useState(false);
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [openPopover, setOpenPopover] = useState<number | null>(null);
	const [tappedBar, setTappedBar] = useState<number | null>(null);
	const popoverRef = useRef<HTMLDivElement>(null);

	// Animate bars: trigger on mount and whenever isTopCard changes
	useEffect(() => {
		setLoaded(false);
		const timer = setTimeout(() => setLoaded(true), 150);
		return () => clearTimeout(timer);
	}, [isTopCard]);

	// Close popover on outside click/touch
	const containerRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (openPopover === null && tappedBar === null) return;
		const handler = (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
			// Only close if tap/click is outside the entire vibe sliders area
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpenPopover(null);
				setTappedBar(null);
			}
		};
		document.addEventListener("mousedown", handler);
		document.addEventListener("touchstart", handler);
		return () => {
			document.removeEventListener("mousedown", handler);
			document.removeEventListener("touchstart", handler);
		};
	}, [openPopover, tappedBar]);

	const glowKeyframes = vibes.map((vibe, i) =>
		`@keyframes glow-pulse-${i} {
			0%, 100% { box-shadow: 0 0 8px ${vibe.color}, 0 0 16px ${vibe.color}80, 0 0 32px ${vibe.color}40; }
			50% { box-shadow: 0 0 14px ${vibe.color}, 0 0 28px ${vibe.color}90, 0 0 48px ${vibe.color}60; }
		}`
	).join("\n");

	return (
		<>
		<style>{`
			${glowKeyframes}
			@keyframes shimmer {
				0% { transform: translateX(-100%); }
				100% { transform: translateX(100%); }
			}
			@keyframes eye-look {
				0%, 100% { transform: translateX(0); }
				30% { transform: translateX(2px); }
				60% { transform: translateX(-1px); }
			}
			@keyframes pop-in {
				0% { opacity: 0; transform: translateY(4px) scale(0.95); }
				100% { opacity: 1; transform: translateY(0) scale(1); }
			}
		`}</style>
		<div className="space-y-3" ref={containerRef}>
			{vibes.map((vibe, i) => (
				<div key={vibe.name} className="space-y-1.5">
					{/* Label with eye icon — clickable */}
					<div className="relative" ref={openPopover === i ? popoverRef : undefined}>
						<button
							className="flex items-center gap-1.5 text-sm font-bold text-white cursor-pointer hover:text-zinc-200 transition-colors active:scale-95 touch-manipulation"
							type="button"
							aria-label={`Learn about ${vibe.name}`}
							onClick={(e) => {
								e.stopPropagation();
								setOpenPopover(openPopover === i ? null : i);
								setTappedBar(null);
							}}
						>
							<EyeIcon color={vibe.color} />
							{vibe.name}
						</button>

						{/* Click popover */}
						{openPopover === i && (
							<div
								className="absolute left-0 bottom-full mb-2 z-50 w-64 sm:w-72 rounded-xl border border-slate-700/50 px-4 py-3 text-sm text-slate-100 leading-relaxed shadow-xl"
								style={{
									background: "linear-gradient(145deg, #131929 0%, #0d1222 100%)",
									boxShadow: `0 0 12px ${vibe.color}40, 0 8px 24px rgba(0,0,0,0.5)`,
									animation: "pop-in 0.2s ease-out both",
								}}
								onClick={(e) => e.stopPropagation()}
							>
								<p>{VIBE_EXPLANATIONS[vibe.name] || ""}</p>
								{/* Arrow */}
								<div
									className="absolute left-4 -bottom-1.5 w-3 h-3 rotate-45 border-r border-b border-slate-700/50"
									style={{ background: "#0d1222" }}
								/>
							</div>
						)}
					</div>

					{/* Neon glow bar */}
					<div
						className="relative cursor-pointer"
						onMouseEnter={() => setHoveredIndex(i)}
						onMouseLeave={() => setHoveredIndex(null)}
						onClick={(e) => {
							e.stopPropagation();
							// Clear hover state so toggle works on mobile
							setHoveredIndex(null);
							setTappedBar(tappedBar === i ? null : i);
							setOpenPopover(null);
						}}
					>
						{/* Percentage badge above bar */}
						{(hoveredIndex === i || tappedBar === i) && (
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
								className="h-full rounded-full relative overflow-hidden"
								style={{
									width: loaded ? `${vibe.value}%` : "0%",
									transition: `width ${0.8 + i * 0.2}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
									background: `linear-gradient(90deg, ${vibe.color}99 0%, ${vibe.color} 70%, #ffffffCC 100%)`,
									boxShadow: `0 0 8px ${vibe.color}, 0 0 16px ${vibe.color}80, 0 0 32px ${vibe.color}40`,
									animation: loaded ? `glow-pulse-${i} ${2 + i * 0.3}s ease-in-out infinite` : "none",
								}}
							>
								{/* Top highlight for depth */}
								<div
									className="absolute inset-0 rounded-full"
									style={{
										background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%)",
									}}
								/>
								{/* Shimmer sweep */}
								<div
									className="absolute inset-0 rounded-full"
									style={{
										background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)`,
										animation: loaded ? `shimmer ${2.5 + i * 0.5}s ease-in-out infinite` : "none",
										animationDelay: `${i * 0.4}s`,
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
		</>
	);
}
