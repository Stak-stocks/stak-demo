import type { BrandProfile } from "@stak/shared";
import { BrandLogo } from "@/components/BrandLogo";
import type { LiveQuote } from "@/lib/api";
import { getAnalystData } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Star, Users, BarChart3 } from "lucide-react";

// Exchange listing for every ticker in brands.ts. Defaults to "NASDAQ" for unknown/dynamic stocks.
const NYSE_TICKERS = new Set([
	// Consumer / Retail
	"NKE","DIS","WMT","TGT","HD","LOW","MCD","PG","JNJ","LMT","BA","UNH",
	"TJX","AZO","DG","BURL","HLT","RCL","LYV","CMG","YUM","F","GM",
	"SHAK","BROS","WRBY","GME","AMC","NIO","CHWY","EAT","BLMN",
	// Financials
	"JPM","GS","MS","C","BAC","WFC","BLK","AXP","COF","SCHW","BX","KKR","APO",
	"AIG","MET","PRU","AFL","ALL","CB","TRV","HIG","FIS","GPN","ICE","SPGI","MCO","MSCI",
	"IVZ","BEN","SYF","ALLY","AMP","AON","MMC","AJG","PNC","USB","TFC","EFX",
	"STT","BK","RJF","BRK.B","OMF","EVR","LNC","KEY","RF","CFG",
	// Energy
	"XOM","CVX","EOG","OXY","HAL","SLB","PSX","VLO","KMI","DVN","HES","BKR",
	// Tech / Cloud / SaaS
	"ORCL","IBM","HPQ","DELL","ACN","SAP","HUBS","NET","S","TWLO","PATH","BILL",
	"SNAP","PINS","RDDT","DASH","CRM","VEEV","CVNA","U","TOST","PLTR",
	// Healthcare
	"PFE","BMY","LLY","ABBV","MRK","MDT","SYK","BSX","CVS","CI","HUM","HIMS","RMD","NVO",
	// Industrials / Defense
	"CAT","DE","ETN","EMR","ITW","IR","RTX","NOC","LHX","GE","MMM","UNP","UPS","FDX",
	"DAL","LUV","T","VZ",
	// Utilities / REITs
	"DUK","SO","D","O","AMT","SPG","PLD","DLR",
	// Entertainment
	"MGM","LVS",
	// Staples
	"HSY","GIS","KR","STZ","CL","KMB",
	// Materials
	"NEM","FCX","ALB","APD","LIN",
	// AAPL-family / indexes
	"SPY",
	// Fintech / Payments
	"V","MA","SQ",
	// Clean energy
	"NEE",
	// Travel / Mobility
	"UBER","SHOP",
	// Consumer tech ADRs
	"TSM","NVO","TM","SONY","BABA","SE","NU",
	// EV / Space
	"JOBY","ACHR","SPCE",
	// Other
	"WEX","SAM","SOUN",
]);

const CBOE_TICKERS = new Set(["CBOE"]);
const OTC_TICKERS = new Set(["LRLCY"]);

function getExchange(ticker: string): string {
	const t = ticker.toUpperCase();
	if (NYSE_TICKERS.has(t)) return "NYSE";
	if (CBOE_TICKERS.has(t)) return "CBOE";
	if (OTC_TICKERS.has(t)) return "OTC";
	return "NASDAQ";
}

// Human-readable display names for interestCategory IDs
const CATEGORY_LABELS: Record<string, string> = {
	tech:        "Tech",
	gaming:      "Gaming",
	food:        "Consumer Brand",
	food_drink:  "Consumer Brand",
	shopping:    "Retail Brand",
	lifestyle:   "Lifestyle",
	fashion:     "Fashion",
	travel:      "Travel",
	education:   "EdTech",
	social:      "Social Media",
	automotive:  "Automotive",
	media:       "Media",
	streaming:   "Streaming",
	finance:     "Finance",
	energy:      "Clean Energy",
	health:      "Healthcare",
	fitness:     "Fitness",
	beauty:      "Beauty",
	music:       "Music",
};

// Always returns exactly 3 tags (growth, risk, margin) with fallbacks for missing data
function derivedTags(brand: BrandProfile): { label: string; key: string }[] {
	const tags: { label: string; key: string }[] = [];

	const growth = parseFloat(brand.financials?.revenueGrowth?.value ?? "");
	if (!isNaN(growth) && growth >= 25)     tags.push({ label: "High Growth",   key: "high_growth" });
	else if (!isNaN(growth) && growth >= 8) tags.push({ label: "Steady Growth", key: "steady_growth" });
	else                                    tags.push({ label: "Mature",         key: "mature" });

	const beta = parseFloat(brand.financials?.beta?.value ?? "");
	if (!isNaN(beta) && beta >= 1.4)        tags.push({ label: "High Risk",      key: "high_risk" });
	else if (!isNaN(beta) && beta >= 0.85)  tags.push({ label: "Moderate Risk",  key: "moderate_risk" });
	else                                    tags.push({ label: "Low Risk",        key: "low_risk" });

	const margin = parseFloat(brand.financials?.profitMargin?.value ?? "");
	if (!isNaN(margin) && margin >= 20)     tags.push({ label: "High Margin",    key: "high_margin" });
	else if (!isNaN(margin) && margin >= 8) tags.push({ label: "Profitable",     key: "profitable" });
	else                                    tags.push({ label: "Reinvesting",    key: "reinvesting" });

	return tags; // always exactly 3
}

type TagDef = { label: string; key: string };

function getTagClass(key: string): string {
	if (["high_risk", "moderate_risk", "low_risk"].includes(key))
		return "border-amber-400/80 bg-amber-500/10 text-amber-300";
	if (["high_growth", "steady_growth", "mature", "gaming", "streaming", "music", "energy"].includes(key))
		return "border-purple-400/80 bg-purple-500/15 dark:text-purple-200 text-purple-700";
	return "border-blue-400/80 bg-blue-500/10 text-blue-200";
}

function TagPill({ tag, s }: { tag: TagDef; s: number }) {
	const cls = getTagClass(tag.key);
	const isRisk = ["high_risk", "moderate_risk", "low_risk"].includes(tag.key);
	return (
		<div
			className={`flex items-center justify-center rounded-full border ${cls}`}
			style={{
				gap: Math.round(6 * s),
				paddingLeft: Math.round(10 * s),
				paddingRight: Math.round(10 * s),
				paddingTop: Math.round(5 * s),
				paddingBottom: Math.round(5 * s),
				fontSize: Math.round(12 * s),
				lineHeight: `${Math.round(12 * s)}px`,
			}}
		>
			{isRisk && <BarChart3 size={Math.round(11 * s)} />}
			{tag.label}
		</div>
	);
}

const UP_PATH   = "M0 35 L8 36 L15 24 L25 29 L36 17 L47 23 L60 12 L70 20 L81 16 L91 22 L101 11 L110 4";
const DOWN_PATH = "M0 5 L8 8 L15 14 L25 10 L36 19 L47 16 L60 25 L70 21 L81 29 L91 26 L101 36 L110 40";

function MiniChart({ positive = true, id, s }: { positive?: boolean; id: string; s: number }) {
	const color = positive ? "#32e38a" : "#ef4444";
	const linePath = positive ? UP_PATH : DOWN_PATH;
	const fillPath = positive
		? `${UP_PATH} L110 45 L0 45Z`
		: `${DOWN_PATH} L110 45 L0 45Z`;
	const gradId = `mc-${id}`;
	return (
		<svg
			viewBox="0 0 110 45"
			style={{ height: Math.round(42 * s), width: Math.round(102 * s) }}
			fill="none"
		>
			<path
				d={linePath}
				stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
			/>
			<path
				d={fillPath}
				fill={`url(#${gradId})`} opacity="0.34"
			/>
			<defs>
				<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="45">
					<stop stopColor={color} />
					<stop offset="1" stopColor={color} stopOpacity="0" />
				</linearGradient>
			</defs>
		</svg>
	);
}

interface StockCardProps {
	brand: BrandProfile;
	quote?: LiveQuote | null;
	isTopCard?: boolean;
	scale?: number;
	isPopular?: boolean;
}

export function StockCard({ brand, quote, isTopCard = false, scale = 1, isPopular = false }: Readonly<StockCardProps>) {
	const { data: analystData } = useQuery({
		queryKey: ["analyst", brand.ticker],
		queryFn: () => getAnalystData(brand.ticker),
		staleTime: 3 * 24 * 60 * 60 * 1000,
		gcTime:    4 * 24 * 60 * 60 * 1000,
		retry: 0,
	});
	const analystRating = (() => {
		const r = analystData?.recommendation;
		if (!r) return null;
		const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell;
		if (total === 0) return null;
		return Math.round(((5 * r.strongBuy + 4 * r.buy + 3 * r.hold + 2 * r.sell + r.strongSell) / total) * 10) / 10;
	})();
	const sp = (n: number) => Math.round(n * scale);
	const priceUp = quote ? quote.changePercent >= 0 : true;

	// Always 4 tags: 1 category + 3 derived (each derived always produces a value)
	const categoryTag: TagDef[] = (brand.interestCategories ?? [])
		.slice(0, 1)
		.map(id => ({ label: CATEGORY_LABELS[id] ?? id.replace(/_/g, " "), key: id }));
	const derived = derivedTags(brand);
	const fallbackCategoryTag: TagDef = (() => {
		const raw = brand.financials?.marketCap?.value ?? "";
		if (raw.includes("T") || parseFloat(raw) > 200) return { label: "Mega Cap",  key: "mega_cap"  };
		if (parseFloat(raw) > 10)                        return { label: "Large Cap", key: "large_cap" };
		if (parseFloat(raw) > 2)                         return { label: "Mid Cap",   key: "mid_cap"   };
		return                                                  { label: "Small Cap", key: "small_cap" };
	})();
	const tags: TagDef[] = categoryTag.length > 0
		? [...categoryTag, ...derived]
		: [fallbackCategoryTag, ...derived];

	return (
		<div className="relative w-full h-full rounded-[22px] overflow-hidden border border-black/20 dark:border-white/25 bg-surface-1 shadow-[0_30px_80px_rgba(0,0,0,.75)] select-none">

			{/* Full-bleed hero background */}
			<div className="absolute inset-0">
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{
						backgroundImage: `url('${brand.heroImage}')`,
						filter: "brightness(0.62) blur(0.3px)",
					}}
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black" />
				<div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-b from-transparent via-black/85 to-black" />
			</div>

			{/* Top-left brand logo box */}
			<div className="absolute left-[20px] top-[20px] z-20 grid h-[56px] w-[56px] place-items-center rounded-[10px] bg-white shadow-[0_10px_25px_rgba(0,0,0,.35)]">
				<BrandLogo brand={brand} className="w-[42px] h-[42px] rounded-[6px]" />
			</div>

			{/* Top-right analyst rating pill — only shown when data is available */}
			{analystRating != null && (
				<div className="absolute right-[16px] top-[18px] z-20 flex items-center gap-[5px] rounded-full bg-black/45 px-[11px] py-[7px] text-[13px] text-white backdrop-blur-md border border-white/20">
					<Star size={12} fill="white" className="text-white/80" />
					<span className="font-semibold">{analystRating.toFixed(1)}</span>
				</div>
			)}

			{/* Content — top% keeps proportional; all internal spacing scales with card size */}
			{/* Text is always white — it sits on top of the dark gradient overlay regardless of mode */}
			<div
				className="absolute inset-x-0 bottom-0 z-20 flex flex-col px-[22px]"
				style={{ top: "38%", paddingBottom: sp(22) }}
			>
				<h1
					className="font-bold leading-none tracking-[-0.03em] text-white"
					style={{ fontSize: sp(26) }}
				>{brand.name}</h1>
				<p
					className="text-white/75 tracking-wide"
					style={{ marginTop: sp(7), fontSize: sp(13) }}
				>{brand.ticker} · {getExchange(brand.ticker)}</p>

				{/* Price + chart */}
				<div className="flex items-start justify-between" style={{ marginTop: sp(14) }}>
					{isTopCard ? (
						<div>
							{quote ? (
								<>
									<div className="flex items-center" style={{ gap: sp(11) }}>
										<p className="font-bold leading-none tracking-[-0.03em] text-white" style={{ fontSize: sp(24) }}>
											${quote.price.toFixed(2)}
										</p>
										<p className={`font-semibold ${priceUp ? "text-emerald-400" : "text-red-400"}`} style={{ fontSize: sp(15) }}>
											{priceUp ? "+" : ""}{quote.changePercent.toFixed(1)}%
										</p>
									</div>
								</>
							) : quote === undefined ? (
								<>
									<div className="flex items-center gap-3">
										<div className="h-6 w-20 bg-white/20 rounded animate-pulse" />
										<div className="h-4 w-12 bg-white/20 rounded animate-pulse" />
									</div>
									<div className="h-3 w-14 bg-white/20 rounded animate-pulse mt-2" />
								</>
							) : null}
						</div>
					) : <div />}
					<div style={{ marginTop: sp(22) }}>
						<MiniChart positive={priceUp} id={brand.ticker} s={scale} />
					</div>
				</div>

				{/* Tag pills */}
				{tags.length > 0 && (
					<div
						className="grid grid-cols-2"
						style={{ marginTop: sp(15), gap: sp(7) }}
					>
						{tags.map(tag => <TagPill key={tag.key} tag={tag} s={scale} />)}
					</div>
				)}

				{/* Bio */}
				<p
					className="text-white/70 line-clamp-2 shrink-0"
					style={{ marginTop: sp(10), fontSize: sp(13), lineHeight: `${sp(19)}px` }}
				>{brand.bio}</p>

				{/* Bottom saved bar — only shown when 50+ users have this brand saved */}
				<div className="mt-auto" style={{ paddingTop: sp(14) }}>
					{isPopular ? (
						<div
							className="flex items-center justify-between rounded-[10px] border border-white/10 bg-black/10 backdrop-blur-sm"
							style={{ height: sp(38), paddingLeft: sp(13), paddingRight: sp(4) }}
						>
							<div className="flex items-center text-white/60" style={{ gap: sp(8), fontSize: sp(12) }}>
								<Users size={sp(14)} />
								<span>Popular among investors</span>
							</div>
						</div>
					) : (
						<div style={{ height: sp(38) }} />
					)}
				</div>
			</div>
		</div>
	);
}
