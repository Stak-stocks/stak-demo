import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BrandSummary } from "@stak/shared";
import { getBrandTip, getStockData } from "@/lib/api";
import { CARD_ART_FALLBACK, CARD_PALETTE, CARD_WIDTH, DISC, cardArtUrl, cu, formatPrice, sessionWord } from "./discoverTheme";

// Tickers whose art file 404ed: a card remounting (the next card moving to the front) shouldn't ask again.
const MISSING_ART = new Set<string>();

/**
 * A card's live price and Gemini tip. Cached by react-query; `live: false` (the card flying away) only reads the cache.
 * `withQuote: false` skips the per-card price fetch (the caller supplies prices, e.g. one batch for search results);
 * `withTip: false` skips the Gemini tip, for lists that would otherwise ask for many at once.
 */
export function useCardData(brand: BrandSummary | undefined, live = true, { withQuote = true, withTip = true } = {}) {
	const { data: stock } = useQuery({
		queryKey: ["stock", brand?.ticker],
		queryFn: () => getStockData(brand!.ticker),
		enabled: !!brand && live && withQuote,
		staleTime: 2 * 60 * 1000,
		gcTime: 5 * 60 * 1000,
		retry: 0,
	});
	const { data: tip } = useQuery({
		queryKey: ["brand-tip", brand?.id],
		queryFn: () => getBrandTip(brand!.id),
		enabled: !!brand && live && withTip,
		staleTime: 24 * 60 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
		retry: 0,
	});
	return { quote: stock?.quote ?? null, tip: tip?.tip?.trim() ?? "" };
}

/** The gradient a card (and the faint cards stacked behind it) is painted with. */
export function cardBackground(paletteIndex: number): string {
	const top = CARD_PALETTE[paletteIndex % CARD_PALETTE.length][0];
	return `linear-gradient(to bottom, ${top} 0%, #0C1526 90%, rgba(12,21,38,0) 100%)`;
}

/**
 * A brand's card art, filling its (relative) container. Falls back to the basket template with the brand's mark on it;
 * a ticker whose art 404ed is remembered, so no card asks for it again. Callers key it by ticker, so a card slot that
 * moves on to another brand starts fresh.
 */
export function CardArt({ brand }: { brand: BrandSummary }) {
	const [artFailed, setArtFailed] = useState(() => MISSING_ART.has(brand.ticker));
	const [logoFailed, setLogoFailed] = useState(false);
	const logo = brand.logo ?? (brand.domain ? `https://cdn.brandfetch.io/${brand.domain}/w/400/h/400` : undefined);
	return (
		<>
			<img
				src={artFailed ? CARD_ART_FALLBACK : cardArtUrl(brand.ticker)}
				alt=""
				draggable={false}
				onError={() => { MISSING_ART.add(brand.ticker); setArtFailed(true); }}
				className="h-full w-full select-none object-cover"
			/>
			{artFailed && logo && !logoFailed && (
				<img
					src={logo}
					alt=""
					draggable={false}
					onError={() => setLogoFailed(true)}
					// Centred on the basket: Android's 100u mark at (122, 50) on the 340x229 art.
					className="absolute aspect-square w-[29.4%] -translate-x-1/2 -translate-y-1/2 select-none object-contain"
					style={{
						left: "50.6%", top: "43.7%",
						filter: "grayscale(1) brightness(1.5) drop-shadow(0 2px 3px rgba(46,125,163,0.7))",
						mixBlendMode: "screen",
						opacity: 0.9,
					}}
				/>
			)}
		</>
	);
}


/** Brand art on the deck backdrop. */
function Hero({ brand, paletteIndex }: { brand: BrandSummary; paletteIndex: number }) {
	return (
		<div
			className="relative shrink-0 overflow-hidden"
			style={{ width: cu(340), height: cu(229), borderRadius: cu(18), background: CARD_PALETTE[paletteIndex % CARD_PALETTE.length][1] }}
		>
			<CardArt key={brand.ticker} brand={brand} />
		</div>
	);
}

/** Desktop's card width, set by the Discover page on the deck column (clamped to the window and the column). */
const DESK_W = "var(--desk-card-w, 480px)";
/** A length that scales with the desktop card: `dw(0.04)` is 4% of its width (~21px on a 540px card). */
const dw = (k: number) => `calc(${DESK_W} * ${k})`;

/**
 * The desktop layout of the Discover card: the art across the top (~65% of the card), then "WMT · Walmart", the bio as
 * the headline and the price with its move - no TIP or Learn more (the Quick Look is open beside the deck). Everything
 * scales with the card's width; the card lifts a little on hover.
 */
function DesktopLayout({ brand, paletteIndex, quote }: { brand: BrandSummary; paletteIndex: number; quote: { price: number; changePercent: number } | null }) {
	const change = quote?.changePercent;
	const up = (change ?? 0) >= 0;
	const headline = brand.bio ? brand.bio.charAt(0).toUpperCase() + brand.bio.slice(1) : "";
	return (
		<div
			className="flex flex-col overflow-hidden transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.015] hover:shadow-[0_22px_48px_rgba(3,8,20,0.65)]"
			style={{
				width: DESK_W,
				borderRadius: dw(0.045),
				padding: dw(0.012),
				background: cardBackground(paletteIndex),
				border: "1px solid rgba(120,170,220,0.16)",
				boxShadow: "0 14px 34px rgba(3,8,20,0.5)",
			}}
		>
			<div className="relative w-full overflow-hidden" style={{ height: dw(0.52), borderRadius: dw(0.036), background: CARD_PALETTE[paletteIndex % CARD_PALETTE.length][1] }}>
				<CardArt key={brand.ticker} brand={brand} />
			</div>
			<div className="flex flex-col" style={{ padding: `${dw(0.028)} ${dw(0.035)} ${dw(0.035)}`, gap: dw(0.012) }}>
				<p style={{ font: `400 ${dw(0.024)}/1.3 var(--font-body)`, color: DISC.muted }}>{brand.ticker} · {brand.name}</p>
				<p className="line-clamp-2" style={{ font: `600 ${dw(0.04)}/1.25 var(--font-heading)`, color: "#fff" }}>{headline}</p>
				<div className="flex items-baseline" style={{ gap: dw(0.02), marginTop: dw(0.012) }}>
					<span style={{ font: `600 ${dw(0.05)}/1.2 var(--font-heading)`, color: "#fff" }}>{formatPrice(quote?.price)}</span>
					{change != null && (
						<span style={{ font: `500 ${dw(0.028)}/1.2 var(--font-body)`, color: up ? DISC.green : DISC.red }}>
							{up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% {sessionWord()}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

/** Android's Discover card: art, "NVDA · NVIDIA Corp", the bio line, price + change, a TIP, Learn more. */
export function DiscoverCard({ brand, paletteIndex, onLearnMore, live = true, quote: suppliedQuote, showTip = true, variant = "phone" }: {
	brand: BrandSummary;
	paletteIndex: number;
	onLearnMore?: (brand: BrandSummary) => void;
	live?: boolean;
	/** A price the caller already has (null = none yet); leave undefined for the card to fetch its own. */
	quote?: { price: number; changePercent: number } | null;
	/** Off where many cards show at once, so a list doesn't fan out one Gemini call per card. */
	showTip?: boolean;
	/** Android's card, or its desktop layout (Discover on a wide screen). */
	variant?: "phone" | "desktop";
}) {
	const desktop = variant === "desktop";
	const own = useCardData(brand, live, { withQuote: suppliedQuote === undefined, withTip: showTip && !desktop });
	const quote = suppliedQuote === undefined ? own.quote : suppliedQuote;
	const tip = showTip ? own.tip : "";
	if (desktop) return <DesktopLayout brand={brand} paletteIndex={paletteIndex} quote={quote} />;
	const change = quote?.changePercent;
	const up = (change ?? 0) >= 0;

	return (
		<div
			className="flex flex-col items-center"
			style={{
				width: cu(CARD_WIDTH),
				borderRadius: cu(22),
				paddingTop: cu(4),
				paddingBottom: cu(4),
				gap: cu(25),
				background: cardBackground(paletteIndex),
				boxShadow: `0 0 ${cu(6)} rgba(6,11,22,0.5)`,
			}}
		>
			<Hero brand={brand} paletteIndex={paletteIndex} />

			<div className="flex w-full flex-col" style={{ paddingLeft: cu(18), paddingRight: cu(18), paddingBottom: cu(onLearnMore ? 10 : 16), gap: cu(19) }}>
				<div>
					<p style={{ font: `400 ${cu(10)}/${cu(13)} var(--font-body)`, color: DISC.muted }}>
						{brand.ticker} · {brand.name}
					</p>
					<p style={{ marginTop: cu(8), font: `400 ${cu(16)}/${cu(23)} var(--font-body)`, color: "#fff" }}>
						{brand.bio}
					</p>
				</div>

				<div className="flex items-end" style={{ gap: cu(9) }}>
					<span style={{ font: `600 ${cu(20)}/${cu(25)} var(--font-heading)`, color: "#fff" }}>{formatPrice(quote?.price)}</span>
					{change != null && (
						<span style={{ font: `500 ${cu(11)}/${cu(14)} var(--font-body)`, color: up ? DISC.green : DISC.red, paddingBottom: cu(2) }}>
							{up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% {sessionWord()}
						</span>
					)}
				</div>

				{tip && (
					<div
						className="flex items-center"
						style={{ background: "rgba(105,179,202,0.10)", borderRadius: cu(10), padding: `${cu(9)} ${cu(12)}`, gap: cu(8) }}
					>
						<span style={{ font: `500 ${cu(10)}/${cu(15)} var(--font-body)`, letterSpacing: cu(0.9), color: DISC.teal }}>TIP</span>
						<span style={{ font: `400 ${cu(11)}/${cu(15)} var(--font-body)`, color: DISC.body }}>{tip}</span>
					</div>
				)}

				{onLearnMore && (
					<button
						type="button"
						onClick={() => onLearnMore(brand)}
						// The card is dragged by pointer; keep this tap from starting a drag.
						onPointerDown={(e) => e.stopPropagation()}
						className="flex items-center justify-center self-center transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
						style={{ marginTop: cu(-12), gap: cu(4), padding: `${cu(4)} ${cu(10)}`, borderRadius: 999, color: DISC.teal, outlineColor: DISC.teal, font: `500 ${cu(12)}/${cu(16)} var(--font-body)` }}
						aria-label={`Learn more about ${brand.name}`}
					>
						Learn more
						<svg style={{ width: cu(7), height: cu(12) }} viewBox="0 0 7 12" fill="none" aria-hidden="true">
							<path d="M1,1.5 L6,6 L1,10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				)}
			</div>
		</div>
	);
}
