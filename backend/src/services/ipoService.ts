import { getEasternDateKey } from "@stak/shared";
import { pgQuery } from "../lib/postgres.js";
import { getFinnhubKeys, FINNHUB_BASE } from "./finnhubService.js";
import { getGeminiKeys, GEMINI_MODEL, geminiUrl } from "./geminiService.js";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface FinnhubIPOEntry {
	symbol: string;
	name: string;
	date: string; // YYYY-MM-DD
	status: string; // "priced" = completed IPO
}

interface FinnhubProfile {
	name: string;
	ticker: string;
	finnhubIndustry: string;
	weburl: string;
	logo: string;
	country: string;
	marketCapitalization: number;
	description?: string;
}

interface GeneratedBrandData {
	bio: string;
	personalityDescription: string;
	vibes: { name: string; emoji: string; value: number; color: string }[];
	culturalContext: {
		title: string;
		sections: { heading: string; content: string }[];
	};
	interestCategories: string[];
}

// ── Sector → Unsplash hero image map ─────────────────────────────────────────

const SECTOR_HERO: Record<string, string> = {
	Technology: "photo-1518770660439-4636190af475",
	Healthcare: "photo-1576091160550-2173dba999ef",
	Finance: "photo-1560472354-b33ff0c44a43",
	"Financial Services": "photo-1560472354-b33ff0c44a43",
	"Consumer Cyclical": "photo-1441986300917-64674bd600d8",
	"Consumer Defensive": "photo-1556742049-0cfed4f6a45d",
	Energy: "photo-1473341304170-971dccb5ac1e",
	"Communication Services": "photo-1562577309-4932fdd64cd1",
	Industrials: "photo-1581091226825-a6a2a5aee158",
	"Basic Materials": "photo-1504328345606-18bbc8c9d7d1",
	"Real Estate": "photo-1560518883-ce09059eeffa",
	Utilities: "photo-1473341304170-971dccb5ac1e",
	Semiconductors: "photo-1518770660439-4636190af475",
	Software: "photo-1461749280684-dccba630e2f6",
	"IT Services": "photo-1461749280684-dccba630e2f6",
	Biotechnology: "photo-1576091160550-2173dba999ef",
	Pharmaceuticals: "photo-1576091160550-2173dba999ef",
	"Aerospace & Defense": "photo-1446776811953-b23d57bd21aa",
	Automobiles: "photo-1503376780353-7e6692767b70",
	Retail: "photo-1441986300917-64674bd600d8",
	Media: "photo-1562577309-4932fdd64cd1",
	Banks: "photo-1560472354-b33ff0c44a43",
	Insurance: "photo-1560472354-b33ff0c44a43",
	"Oil & Gas": "photo-1473341304170-971dccb5ac1e",
	"Internet Content & Information": "photo-1518770660439-4636190af475",
	"Internet & Direct Marketing Retail": "photo-1441986300917-64674bd600d8",
	"Electronic Technology": "photo-1518770660439-4636190af475",
	"Consumer Electronics": "photo-1518770660439-4636190af475",
	"Health Technology": "photo-1576091160550-2173dba999ef",
	"Health Services": "photo-1576091160550-2173dba999ef",
	"Retail Trade": "photo-1441986300917-64674bd600d8",
	Transportation: "photo-1503376780353-7e6692767b70",
	"Commercial Services": "photo-1581091226825-a6a2a5aee158",
	default: "photo-1535303311272-63661ad60b4b",
};

export function getHeroImage(sector: string): string {
	const id = SECTOR_HERO[sector] ?? SECTOR_HERO.default;
	return `https://images.unsplash.com/${id}?w=800&auto=format&q=80`;
}

// ── Finnhub helpers ───────────────────────────────────────────────────────────

function formatDate(date: Date): string {
	return getEasternDateKey(date);
}

async function fetchRecentIPOs(daysBack = 3): Promise<FinnhubIPOEntry[]> {
	const keys = getFinnhubKeys();
	if (keys.length === 0) throw new Error("No FINNHUB_API_KEY configured");

	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - daysBack);

	let res: Response | null = null;
	for (const key of keys) {
		const r = await fetch(
			`${FINNHUB_BASE}/calendar/ipo?from=${formatDate(from)}&to=${formatDate(to)}&token=${key}`,
			{ signal: AbortSignal.timeout(10000) },
		);
		if (r.status === 429) continue;
		res = r;
		break;
	}
	if (!res || !res.ok) throw new Error(`Finnhub IPO calendar error: ${res?.status ?? "all keys rate-limited"}`);

	const data = await res.json();
	const ipos: FinnhubIPOEntry[] = data.ipoCalendar ?? [];
	return ipos.filter((ipo) => ipo.status === "priced" && ipo.symbol);
}

async function fetchCompanyProfile(symbol: string): Promise<FinnhubProfile> {
	const keys = getFinnhubKeys();

	for (const key of keys) {
		const res = await fetch(
			`${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${key}`,
		);
		if (res.status === 429) continue;
		if (!res.ok) throw new Error(`Finnhub profile error for ${symbol}: ${res.status}`);

		const data = await res.json();
		if (!data?.name) throw new Error(`No profile data for ${symbol}`);
		return data as FinnhubProfile;
	}

	throw new Error(`All Finnhub keys rate-limited for ${symbol}`);
}

function getLogoUrl(profile: FinnhubProfile): string {
	if (profile.logo) return profile.logo;
	try {
		const domain = profile.weburl
			.replace(/https?:\/\/(www\.)?/, "")
			.split("/")[0];
		if (domain) return `https://logo.clearbit.com/${domain}`;
	} catch {
		// ignore
	}
	return "";
}

function getDomain(profile: FinnhubProfile): string {
	try {
		return profile.weburl
			.replace(/https?:\/\/(www\.)?/, "")
			.split("/")[0];
	} catch {
		return "";
	}
}

// ── Gemini brand generation ───────────────────────────────────────────────────

async function tryGeminiKey(key: string, prompt: string): Promise<GeneratedBrandData | null> {
	for (let attempt = 0; attempt < 2; attempt++) {
		if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));

		const res = await fetch(
			geminiUrl(GEMINI_MODEL, key),
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal: AbortSignal.timeout(20000),
				body: JSON.stringify({
					contents: [{ parts: [{ text: prompt }] }],
					generationConfig: { thinkingConfig: { thinkingBudget: 0 },
						temperature: 0.4,
						responseMimeType: "application/json",
					},
				}),
			},
		);

		if (res.status === 429) continue;
		if (!res.ok) throw new Error(`Gemini error ${res.status}`);

		const data = await res.json();
		const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
		return JSON.parse(text) as GeneratedBrandData;
	}
	return null;
}

async function generateBrandData(symbol: string, profile: FinnhubProfile): Promise<GeneratedBrandData> {
	const keys = getGeminiKeys();
	if (keys.length === 0) throw new Error("No GEMINI_API_KEY configured");

	const prompt = `You are a Gen Z financial content writer for the STAK investing app.
Tone: sharp, casual, relatable — no jargon, no corporate fluff.

Company: ${profile.name} (${symbol})
Sector: ${profile.finnhubIndustry || "Unknown"}
Description: ${profile.description || "N/A"}
Country: ${profile.country || "N/A"}

Generate a JSON object with EXACTLY this structure:
{
  "bio": "<1-2 sentence Gen Z-friendly company description, max 120 chars>",
  "personalityDescription": "<2-3 sentences on this company's personality/archetype>",
  "vibes": [
    {"name":"Clout","emoji":"🏰","value":<integer 0-100>,"color":"#00d9ff"},
    {"name":"Drama Level","emoji":"🎭","value":<integer 0-100>,"color":"#ff006e"},
    {"name":"Internet Hype","emoji":"🔥","value":<integer 0-100>,"color":"#ff9500"}
  ],
  "culturalContext": {
    "title": "<catchy title about this brand's cultural position>",
    "sections": [
      {"heading":"What They Do","content":"<2-3 sentences, simple language>"},
      {"heading":"Why Gen Z Cares","content":"<2-3 sentences on cultural relevance>"},
      {"heading":"The Bigger Picture","content":"<2-3 sentences on market context>"}
    ]
  },
  "interestCategories": <JSON array using only values from: ["tech","gaming","streaming","fashion","beauty","finance","energy","music","food_drink","shopping","travel","fitness"]>
}
Return ONLY valid JSON, no markdown, no extra text.`;

	for (const key of keys) {
		const result = await tryGeminiKey(key, prompt);
		if (result !== null) return result;
	}

	throw new Error(`All Gemini keys rate-limited for ${symbol}`);
}

// ── Postgres persistence ──────────────────────────────────────────────────────

async function upsertStockToPostgres(
	symbol: string,
	profile: FinnhubProfile,
	brandData: GeneratedBrandData,
	ipoDate: string,
): Promise<void> {
	const id = symbol.toLowerCase();
	await pgQuery(
		`insert into stocks (ticker, id, name, domain, logo, hero_image, bio, personality_description,
			vibes, cultural_context, interest_categories, sector, country, source, ipo_date)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		on conflict (ticker) do update set
			id = excluded.id, name = excluded.name, domain = excluded.domain, logo = excluded.logo,
			hero_image = excluded.hero_image, bio = excluded.bio,
			personality_description = excluded.personality_description, vibes = excluded.vibes,
			cultural_context = excluded.cultural_context, interest_categories = excluded.interest_categories,
			sector = excluded.sector, country = excluded.country, source = excluded.source,
			ipo_date = excluded.ipo_date, updated_at = now()`,
		[
			symbol.toUpperCase(), id, profile.name, getDomain(profile), getLogoUrl(profile),
			getHeroImage(profile.finnhubIndustry), brandData.bio, brandData.personalityDescription,
			JSON.stringify(brandData.vibes), JSON.stringify(brandData.culturalContext),
			brandData.interestCategories, profile.finnhubIndustry || "Unknown", profile.country || "Unknown",
			"ipo-auto", ipoDate,
		],
	);
}

// ── Seed-status helpers (Postgres app_config) ─────────────────────────────────

type SeedStatusValue = {
	status: string; total: number; processed: number; added: number;
	skipped: number; errors: number; limit: number;
	startedAt?: string; updatedAt?: string; recentErrors?: string[];
};

async function setSeedStatus(value: SeedStatusValue): Promise<void> {
	await pgQuery(
		`insert into app_config (key, value) values ('seed-status', $1::jsonb)
		on conflict (key) do update set value = excluded.value, updated_at = now()`,
		[JSON.stringify({ ...value, updatedAt: new Date().toISOString() })],
	);
}

async function getSeedStatusValue(): Promise<SeedStatusValue | null> {
	const result = await pgQuery<{ value: SeedStatusValue }>(`select value from app_config where key = 'seed-status'`);
	return result.rows[0]?.value ?? null;
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface SyncResult {
	added: string[];
	skipped: string[];
	errors: string[];
}

export async function syncNewIPOs(daysBack = 3): Promise<SyncResult> {
	const result: SyncResult = { added: [], skipped: [], errors: [] };

	let ipos: FinnhubIPOEntry[];
	try {
		ipos = await fetchRecentIPOs(daysBack);
		console.log(`[IPO Sync] Found ${ipos.length} priced IPO(s) in last ${daysBack} days`);
	} catch (e) {
		console.error("[IPO Sync] Failed to fetch IPO calendar:", e);
		return result;
	}

	for (const ipo of ipos) {
		const symbol = ipo.symbol.trim().toUpperCase();
		if (!symbol) continue;

		const existing = await pgQuery<{ ticker: string }>(
			`select ticker from stocks where ticker = $1`,
			[symbol],
		);
		if (existing.rows.length > 0) {
			result.skipped.push(symbol);
			console.log(`[IPO Sync] Skipping ${symbol} — already in Postgres`);
			continue;
		}

		try {
			console.log(`[IPO Sync] Processing ${symbol} (${ipo.name})...`);
			const profile = await fetchCompanyProfile(symbol);

			const MIN_MARKET_CAP = 100;
			if (!profile.logo && !profile.weburl) {
				result.skipped.push(symbol);
				console.log(`[IPO Sync] Skipping ${symbol} — no logo or web presence`);
				continue;
			}
			if (profile.marketCapitalization > 0 && profile.marketCapitalization < MIN_MARKET_CAP) {
				result.skipped.push(symbol);
				console.log(`[IPO Sync] Skipping ${symbol} — market cap too low ($${profile.marketCapitalization}M)`);
				continue;
			}

			const brandData = await generateBrandData(symbol, profile);
			await upsertStockToPostgres(symbol, profile, brandData, ipo.date);
			result.added.push(symbol);
			console.log(`[IPO Sync] ✅ Added ${symbol}`);
		} catch (e) {
			result.errors.push(symbol);
			console.error(`[IPO Sync] ❌ Error processing ${symbol}:`, e);
		}
	}

	return result;
}

// ── All-stocks seeding ────────────────────────────────────────────────────────

interface FinnhubSymbol {
	symbol: string;
	description: string;
	type: string;
}

const POPULAR_TICKERS: string[] = [
	"AAPL", "MSFT", "GOOGL", "GOOG", "META", "NVDA", "TSLA", "AMZN",
	"AMD", "INTC", "QCOM", "AVGO", "TXN", "MU", "AMAT", "LRCX", "KLAC",
	"MRVL", "CSCO", "ORCL", "IBM", "HPQ", "DELL", "STX", "WDC", "PSTG",
	"CRM", "ADBE", "NOW", "SNOW", "PLTR", "DDOG", "NET", "CRWD", "OKTA",
	"ZS", "PANW", "MDB", "TWLO", "VEEV", "HUBS", "ZM", "BILL", "GTLB",
	"ESTC", "CFLT", "APPN", "DOCN", "FSLY", "TTEC", "RNG", "FROG",
	"NFLX", "SPOT", "RBLX", "SNAP", "PINS", "LYFT", "UBER", "ABNB",
	"BKNG", "EXPE", "TRIP", "YELP", "ETSY", "EBAY", "AMZN", "DASH",
	"SHOP", "W", "BIGC", "CART",
	"PYPL", "SQ", "COIN", "HOOD", "SOFI", "AFRM", "UPST", "LC",
	"V", "MA", "AXP", "FIS", "FISV", "GPN", "WEX", "OPEN",
	"MSTR", "MARA", "RIOT", "HUT", "BITF",
	"ATVI", "EA", "TTWO", "NTES", "SE", "DKNG", "PENN", "MGM", "WYNN",
	"LVS", "CZR", "VICI", "GLPI",
	"RIVN", "LCID", "NIO", "LI", "XPEV", "FSR", "GOEV",
	"NEE", "ENPH", "FSLR", "PLUG", "BE", "BLDP", "SPWR", "NOVA",
	"SEDG", "RUN", "STEM", "ARRY", "SHLS",
	"F", "GM", "TM", "HMC", "STLA", "RACE",
	"DIS", "PARA", "WBD", "FOXA", "FOX", "CMCSA", "CHTR", "NFLX",
	"LYV", "IMAX", "AMC", "CNK",
	"WMT", "COST", "TGT", "HD", "LOW", "BBY", "GME", "DG", "DLTR",
	"FIVE", "OLLI", "BIG", "JWN", "M", "KSS", "GAP", "ANF", "AEO",
	"MCD", "SBUX", "CMG", "YUM", "QSR", "WEN", "SHAK", "DNUT",
	"KO", "PEP", "MNST", "CELH", "FIZZ", "COKE", "SAM", "TAP",
	"STZ", "BUD", "DEO",
	"NKE", "LULU", "UAA", "UA", "PVH", "VFC", "RL", "TPR", "CPRI",
	"HBI", "CROX", "DECK", "SKX", "ONON", "BIRK",
	"ULTA", "ELF", "COTY", "EL", "REV", "USFD", "KVUE",
	"JNJ", "PFE", "MRNA", "BNTX", "ABBV", "MRK", "LLY", "BMY",
	"AMGN", "GILD", "REGN", "BIIB", "VRTX", "DXCM", "ISRG",
	"MDT", "ABT", "TMO", "DHR", "BDX", "BSX", "SYK", "ZBH",
	"CVS", "WBA", "MCK", "CAH", "ABC", "TDOC", "HIMS", "ACCD",
	"ILMN", "PACB", "BEAM", "CRSP", "EDIT", "NTLA", "FATE",
	"JPM", "BAC", "WFC", "GS", "MS", "C", "USB", "PNC", "TFC",
	"BLK", "BX", "KKR", "APO", "CG", "SCHW", "IBKR", "NDAQ",
	"ICE", "CME", "CBOE", "MSCI", "SPGI", "MCO", "FDS",
	"BRK.B", "AIG", "MET", "PRU", "AFL", "UNH", "HUM", "CI", "ELV",
	"CVS", "HIG", "TRV", "ALL", "PGR",
	"AMT", "PLD", "CCI", "EQIX", "SPG", "AVB", "O", "WELL",
	"PSA", "EXR", "DLR", "ARE", "MAA",
	"XOM", "CVX", "COP", "EOG", "PXD", "DVN", "MPC", "PSX",
	"VLO", "SLB", "HAL", "BKR", "OXY", "HES",
	"CAT", "DE", "MMM", "HON", "GE", "ETN", "ITW", "PH",
	"ROK", "EMR", "AME", "ROP", "IR", "XYL", "GNRC",
	"BA", "RTX", "LMT", "GD", "NOC", "HII", "TDG", "HWM", "AXON",
	"PG", "CL", "KMB", "CHD", "MDLZ", "HSY", "GIS", "K",
	"CPB", "SJM", "MKC", "HRL", "TSN", "KHC",
	"MAR", "HLT", "H", "IHG", "CCL", "RCL", "NCLH",
	"LUV", "AAL", "DAL", "UAL", "ALK", "JBLU",
	"BABA", "JD", "PDD", "BIDU", "BILI", "IQ",
	"ASML", "TSM", "SMCI", "ONTO", "FORM", "UCTT",
	"T", "VZ", "TMUS", "LUMN", "DISH", "SIRI", "WMG",
	"GME", "AMC", "BB", "NOK", "BBBY",
	"BRKR", "ZG", "OPEN", "LMND", "ROOT", "METC", "ARM", "RDDT",
];

function getPopularSymbols(): FinnhubSymbol[] {
	return [...new Set(POPULAR_TICKERS)].map((ticker) => ({
		symbol: ticker,
		description: ticker,
		type: "Common Stock",
	}));
}

async function fetchAllUSSymbols(): Promise<FinnhubSymbol[]> {
	const keys = getFinnhubKeys();
	if (keys.length === 0) throw new Error("No FINNHUB_API_KEY configured");

	const res = await fetch(
		`${FINNHUB_BASE}/stock/symbol?exchange=US&token=${keys[0]}`,
	);
	if (!res.ok) throw new Error(`Finnhub symbols error: ${res.status}`);

	const data: FinnhubSymbol[] = await res.json();
	return data.filter(
		(s) => s.type === "Common Stock" && s.symbol && !s.symbol.includes("."),
	);
}

export async function seedAllStocks(limit = 1000, usePopularOnly = true): Promise<void> {
	const now = new Date().toISOString();
	await setSeedStatus({ status: "running", total: 0, processed: 0, added: 0, skipped: 0, errors: 0, limit, startedAt: now, recentErrors: [] });

	let symbols: FinnhubSymbol[];
	if (usePopularOnly) {
		symbols = getPopularSymbols().slice(0, limit);
		console.log(`[Seed] Using popular tickers list (${symbols.length} stocks)`);
	} else {
		try {
			symbols = (await fetchAllUSSymbols()).slice(0, limit);
		} catch (e) {
			console.error("[Seed] Failed to fetch symbol list:", e);
			await setSeedStatus({ status: "error", total: 0, processed: 0, added: 0, skipped: 0, errors: 0, limit });
			return;
		}
	}

	await setSeedStatus({ status: "running", total: symbols.length, processed: 0, added: 0, skipped: 0, errors: 0, limit, startedAt: now });
	console.log(`[Seed] Starting: ${symbols.length} stocks (limit=${limit})`);

	const BATCH_SIZE = 3;
	const BATCH_DELAY_MS = 1500;
	const recentErrors: string[] = [];
	let processed = 0, added = 0, skipped = 0, errors = 0;

	for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
		const currentStatus = await getSeedStatusValue();
		if (currentStatus?.status === "cancelled") {
			console.log("[Seed] Cancelled by user.");
			return;
		}

		const batch = symbols.slice(i, i + BATCH_SIZE);

		await Promise.all(
			batch.map(async (sym) => {
				const ticker = sym.symbol.toUpperCase();
				processed++;

				const existing = await pgQuery<{ ticker: string }>(
					`select ticker from stocks where ticker = $1`,
					[ticker],
				);
				if (existing.rows.length > 0) {
					skipped++;
					return;
				}

				try {
					const profile = await fetchCompanyProfile(ticker);
					const brandData = await generateBrandData(ticker, profile);
					await upsertStockToPostgres(ticker, profile, brandData, "");
					added++;
				} catch (e) {
					errors++;
					const msg = `${ticker}: ${String(e).slice(0, 100)}`;
					recentErrors.push(msg);
					if (recentErrors.length > 10) recentErrors.shift();
				}
			}),
		);

		await setSeedStatus({ status: "running", total: symbols.length, processed, added, skipped, errors, limit, startedAt: now, recentErrors });

		if (processed > 0 && processed % 50 < BATCH_SIZE) {
			console.log(`[Seed] Progress: ${processed}/${symbols.length} (added=${added}, skip=${skipped}, err=${errors})`);
		}

		if (i + BATCH_SIZE < symbols.length) {
			await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
		}
	}

	await setSeedStatus({ status: "completed", total: symbols.length, processed, added, skipped, errors, limit, startedAt: now });
	console.log(`[Seed] Complete: added=${added}, skipped=${skipped}, errors=${errors}`);
}

export async function getSeedStatus() {
	const value = await getSeedStatusValue();
	return value ?? { status: "idle" };
}

export async function cancelSeedJob(): Promise<void> {
	const current = await getSeedStatusValue();
	if (current) {
		await setSeedStatus({ ...current, status: "cancelled" });
	}
}
