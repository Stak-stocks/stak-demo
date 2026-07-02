import { cacheGet, cacheSet } from "../lib/cache.js";

// SEC requires a descriptive User-Agent for all API requests
const SEC_UA = "Stak noreply@thestak.org";

// ── CIK lookup ───────────────────────────────────────────────────────────────

// Fetches the full SEC ticker→CIK map and caches it for 24 hours.
// The file has ~10k entries (~400KB); fetching once per day is fine.
async function fetchCikMap(): Promise<Record<string, string>> {
	const cacheKey = "edgar-cik-map:v1";
	const cached = await cacheGet<Record<string, string>>(cacheKey);
	if (cached) return cached;
	try {
		const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
			signal: AbortSignal.timeout(15000),
			headers: { "User-Agent": SEC_UA },
		});
		if (!res.ok) return {};
		const raw = await res.json() as Record<string, { cik_str: number; ticker: string }>;
		const map: Record<string, string> = {};
		for (const entry of Object.values(raw)) {
			map[entry.ticker.toUpperCase()] = String(entry.cik_str).padStart(10, "0");
		}
		await cacheSet(cacheKey, map, 24 * 60 * 60 * 1000);
		return map;
	} catch {
		return {};
	}
}

// ── EPS text extraction ──────────────────────────────────────────────────────

// Tries a sequence of regex patterns against a press-release HTML string.
// Returns the first numeric match, or null if none found.
// Loss cases ("$(0.15)") are returned as negative numbers.
export function extractEpsFromText(text: string): number | null {
	// Strip HTML tags so angle-bracket noise doesn't break patterns
	const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

	const patterns: RegExp[] = [
		// "diluted earnings per share was/of $X.XX"
		/diluted\s+earnings\s+per\s+(?:common\s+)?share\s+(?:was|of|were)\s+\$\s*([\d,]+\.[\d]+)/i,
		// "earnings per diluted share was/of $X.XX"
		/earnings\s+per\s+diluted\s+share\s+(?:was|of|were)\s+\$\s*([\d,]+\.[\d]+)/i,
		// "diluted EPS of/was $X.XX"
		/diluted\s+eps\s+(?:of|was|were)\s+\$\s*([\d,]+\.[\d]+)/i,
		// "net income per diluted share was/of $X.XX"
		/net\s+income\s+per\s+(?:diluted\s+)?share\s+(?:was|of|were)\s+\$\s*([\d,]+\.[\d]+)/i,
		// Broader fallback: "diluted earnings per share" then $ within 40 chars
		/diluted\s+earnings\s+per\s+share.{0,40}\$\s*([\d,]+\.[\d]+)/i,
		// Losses: "diluted loss per share of $(0.15)" — capture with negation
		/diluted\s+(?:net\s+)?loss\s+per\s+(?:diluted\s+)?share\s+(?:of|was|were)\s+\$\s*\(\s*([\d,]+\.[\d]+)\s*\)/i,
		/net\s+loss\s+per\s+(?:diluted\s+)?share\s+(?:of|was|were)\s+\$\s*\(\s*([\d,]+\.[\d]+)\s*\)/i,
	];

	// Track whether the matched pattern was a loss variant (indices 5, 6)
	const lossPatternStart = 5;

	for (let i = 0; i < patterns.length; i++) {
		const m = plain.match(patterns[i]!);
		if (m?.[1]) {
			const val = parseFloat(m[1].replace(/,/g, ""));
			if (!isNaN(val)) return i >= lossPatternStart ? -val : val;
		}
	}
	return null;
}

// ── Main EDGAR EPS lookup ────────────────────────────────────────────────────

type EdgarEpsResult = { actual: number; filingDate: string };

/**
 * Returns the diluted EPS from the most recent earnings 8-K filed within
 * 5 calendar days of `nearDate`, or null if no such filing exists yet.
 *
 * Flow: CIK lookup → submissions JSON → Item 2.02 8-K → exhibit 99.1 → regex
 * Everything is cached in Redis; a null result is cached for 5 minutes so we
 * re-check frequently on report days.
 */
export async function getEdgarEarningsEps(
	symbol: string,
	nearDate: string,
): Promise<EdgarEpsResult | null> {
	const upper = symbol.toUpperCase();
	const cacheKey = `edgar-eps:v1:${upper}`;

	// Check cache — a cached null (stored as `false`) means we tried recently and found nothing
	const raw = await cacheGet<EdgarEpsResult | false>(cacheKey);
	if (raw !== null) {
		if (raw === false) return null;
		const daysDiff = Math.abs(
			new Date(raw.filingDate + "T12:00:00Z").getTime() -
			new Date(nearDate + "T12:00:00Z").getTime(),
		) / 86400000;
		return daysDiff <= 5 ? raw : null;
	}

	try {
		const cikMap = await fetchCikMap();
		const cik = cikMap[upper];
		if (!cik) return null;

		const subRes = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
			signal: AbortSignal.timeout(12000),
			headers: { "User-Agent": SEC_UA },
		});
		if (!subRes.ok) return null;

		const submissions = await subRes.json() as {
			filings?: {
				recent?: {
					form: string[];
					items: string[];
					filingDate: string[];
					primaryDocument: string[];
					accessionNumber: string[];
				};
			};
		};

		const recent = submissions.filings?.recent;
		if (!recent?.form?.length) return null;

		const nearMs = new Date(nearDate + "T12:00:00Z").getTime();
		const cikInt = parseInt(cik, 10);

		for (let i = 0; i < recent.form.length; i++) {
			if (recent.form[i] !== "8-K") continue;
			const items = recent.items[i] ?? "";
			if (!items.includes("2.02")) continue;

			const filingDate = recent.filingDate[i];
			if (!filingDate) continue;
			const daysDiff = Math.abs(new Date(filingDate + "T12:00:00Z").getTime() - nearMs) / 86400000;
			if (daysDiff > 5) continue;

			// Build filing base URL
			// accessionNumber: "0001398344-26-009613" → dir: "000139834426009613"
			const accRaw = recent.accessionNumber[i] ?? "";
			const accDir = accRaw.replace(/-/g, "");
			const filingBase = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accDir}`;

			// Try to find exhibit 99.1 via the filing index JSON
			let exhibitUrl: string | null = null;
			try {
				const idxRes = await fetch(`${filingBase}/${accRaw}-index.json`, {
					signal: AbortSignal.timeout(8000),
					headers: { "User-Agent": SEC_UA },
				});
				if (idxRes.ok) {
					const idx = await idxRes.json() as {
						directory?: { item?: Array<{ name: string; type: string }> };
					};
					const ex99 = idx.directory?.item?.find(
						(f) => f.type === "EX-99.1" || f.type === "EX-99.1 HTM" || /ex.?99\.1/i.test(f.name),
					);
					if (ex99?.name) exhibitUrl = `${filingBase}/${ex99.name}`;
				}
			} catch {
				// Index fetch failed — fall through to primary document
			}

			// Fall back to primary document (for companies that file ex99.1 as primary)
			exhibitUrl ??= `${filingBase}/${recent.primaryDocument[i] ?? ""}`;

			try {
				const exRes = await fetch(exhibitUrl, {
					signal: AbortSignal.timeout(12000),
					headers: { "User-Agent": SEC_UA },
				});
				if (!exRes.ok) continue;
				const text = await exRes.text();
				const eps = extractEpsFromText(text);
				if (eps !== null) {
					const result: EdgarEpsResult = { actual: eps, filingDate };
					await cacheSet(cacheKey, result, 20 * 60 * 1000);
					return result;
				}
			} catch {
				continue;
			}
		}
	} catch {
		// Any top-level failure (network, JSON parse) — treat as unavailable, don't cache
		return null;
	}

	// No matching filing found — cache the null so we don't spam SEC for 5 minutes
	await cacheSet(cacheKey, false, 5 * 60 * 1000);
	return null;
}
