import { useQuery } from "@tanstack/react-query";
import type { BrandSummary } from "@stak/shared";
import { getTrending } from "@/lib/api";
import { DISC, cu, sessionWord } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";
import { HOME } from "./MarketMoodCard";

const Arrow = ({ size = 16 }: { size?: number }) => (
	<svg viewBox="0 0 16 16" style={{ width: cu(size), height: cu(size) }} fill="none" aria-hidden="true">
		<path d="M3.33333 8H12.6667M8 12.6667L12.6667 8L8 3.33333" stroke="#fff" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

/** "Why this matters to you": the brief's personal read, with the glass caution ball overhanging the card. */
export function WhyThisMattersCard({ body, onOpen }: { body: string; onOpen: () => void }) {
	return (
		<button
			type="button"
			onClick={onOpen}
			className={`relative block w-full text-left ${PRESS}`}
			style={{ minHeight: cu(91), borderRadius: cu(8), background: HOME.cardBg, ...focusRing }}
		>
			<img src="/app/home_caution_glass.png" alt="" draggable={false} className="pointer-events-none absolute select-none" style={{ left: cu(3), top: cu(-7), width: cu(105), height: cu(105), maxWidth: "none" }} />
			<div style={{ padding: `${cu(14)} ${cu(14)} ${cu(14)} ${cu(127)}`, display: "flex", flexDirection: "column", gap: cu(6) }}>
				<h2 style={{ font: f(400, 14, 15, "heading"), color: "#fff" }}>Why this matters to you</h2>
				<p style={{ font: f(300, 12, 17), color: "#fff" }}>{body}</p>
			</div>
		</button>
	);
}

/** The teal banner into Discover. */
export function DeckBanner({ hasSaved, onClick }: { hasSaved: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`relative block w-full overflow-hidden text-left ${PRESS}`}
			style={{ height: cu(116), borderRadius: cu(8), background: HOME.teal, ...focusRing }}
		>
			<img src="/app/home_banner_illustration.png" alt="" draggable={false} className="absolute select-none object-contain" style={{ left: cu(13), top: 0, width: cu(121.5), height: cu(116) }} />
			<div className="absolute flex flex-col" style={{ left: cu(184), top: "50%", width: cu(156), gap: cu(10), transform: `translateY(calc(-50% + ${cu(0.5)}))` }}>
				<span style={{ font: f(300, 12, 15), color: "#000" }}>
					{hasSaved ? "Your next pick is a swipe away" : "Take your first deck to build your taste"}
				</span>
				<span className="flex items-center justify-center" style={{ width: cu(123), height: cu(32), borderRadius: cu(15), background: DISC.pageBg, gap: cu(3) }}>
					<span style={{ font: f(500, 11.49, 15), color: "#fff" }}>Go to Deck</span>
					<Arrow />
				</span>
			</div>
		</button>
	);
}

/** Live top movers, in a horizontal strip. Hidden while loading, on failure and when empty (Android shows no skeleton). */
export function TrendingStrip({ onOpenStock }: { onOpenStock: (ticker: string) => void }) {
	const { data } = useQuery({
		queryKey: ["trending"],
		queryFn: getTrending,
		staleTime: 60 * 1000,
		refetchInterval: 3 * 60 * 1000,
		retry: 1,
	});
	const trending = data?.trending ?? [];
	if (trending.length === 0) return null;

	return (
		<section style={{ display: "flex", flexDirection: "column", gap: cu(10) }} aria-label="Trending today">
			<h2 style={{ font: f(500, 11, 14), color: DISC.muted }}>TRENDING TODAY</h2>
			<div className="flex overflow-x-auto" style={{ gap: cu(8), scrollbarWidth: "none" }}>
				{trending.map((stock) => {
					const up = stock.changePercent >= 0;
					return (
						<button
							key={stock.ticker}
							type="button"
							onClick={() => onOpenStock(stock.ticker)}
							className={`flex shrink-0 flex-col text-left ${PRESS}`}
							style={{ width: cu(108), borderRadius: cu(12), background: HOME.cardBg, padding: cu(12), gap: cu(6), ...focusRing }}
						>
							<span className="flex items-center" style={{ gap: cu(8) }}>
								<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(24), height: cu(24), background: DISC.avatar, font: f(600, 11, undefined, "heading"), color: DISC.badgeInk }}>
									{stock.ticker.slice(0, 1)}
								</span>
								<span style={{ font: f(500, 13), color: "#fff" }}>{stock.ticker}</span>
							</span>
							<span style={{ font: f(400, 12), color: "#fff" }}>${stock.price.toFixed(2)}</span>
							<span style={{ font: f(500, 11), color: up ? DISC.green : DISC.redDown }}>
								{up ? "▲" : "▼"} {Math.abs(stock.changePercent).toFixed(1)}% {sessionWord()}
							</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}

/** "IN YOUR STAK": up to three saved tickers (alphabetical) with their move. Always shown, even when empty. */
export function SavedPeekCard({ saved, total, quotes, onOpenStock, onSeeAll, onGoToDeck }: {
	saved: BrandSummary[];
	total: number;
	quotes: Record<string, { price: number; changePercent: number }>;
	onOpenStock: (brandId: string) => void;
	onSeeAll: () => void;
	onGoToDeck: () => void;
}) {
	const rows = [...saved].sort((a, b) => a.ticker.localeCompare(b.ticker)).slice(0, 3);
	return (
		<section style={{ display: "flex", flexDirection: "column", gap: cu(10), borderRadius: cu(12), background: HOME.cardBg, padding: cu(14) }} aria-label="In your STAK">
			<div className="flex items-center">
				<h2 style={{ font: f(500, 11, 14), color: DISC.muted }}>IN YOUR STAK</h2>
				<button
					type="button"
					onClick={total === 0 ? onGoToDeck : onSeeAll}
					className={`ml-auto ${PRESS}`}
					style={{ font: f(500, 12), color: DISC.teal, ...focusRing }}
				>
					{total === 0 ? "Go to deck ›" : `See all ${total} ›`}
				</button>
			</div>
			{total === 0 ? (
				<p style={{ font: f(300, 12, 15), color: "#fff" }}>Nothing saved yet. Swipe today’s deck and your saves show up here.</p>
			) : (
				rows.map((brand) => {
					const quote = quotes[brand.ticker];
					const up = (quote?.changePercent ?? 0) >= 0;
					return (
						<button
							key={brand.id}
							type="button"
							onClick={() => onOpenStock(brand.id)}
							className={`flex w-full items-center text-left ${PRESS}`}
							style={{ gap: cu(10), ...focusRing }}
						>
							<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(28), height: cu(28), background: DISC.avatar, font: f(600, 12, undefined, "heading"), color: DISC.badgeInk }}>
								{brand.ticker.slice(0, 1)}
							</span>
							<span className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column" }}>
								<span style={{ font: f(500, 13), color: "#fff" }}>{brand.ticker}</span>
								<span style={{ font: f(400, 11), color: DISC.muted }}>{brand.name}</span>
							</span>
							{quote ? (
								<span style={{ font: f(500, 11), color: up ? DISC.green : DISC.redDown }}>
									{up ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(1)}%
								</span>
							) : (
								<span style={{ font: f(500, 11), color: DISC.muted }}>{"—"}</span>
							)}
						</button>
					);
				})
			)}
		</section>
	);
}
