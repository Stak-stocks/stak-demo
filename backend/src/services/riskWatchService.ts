import { cacheGet, cacheSet } from "../lib/cache.js";
import { getCompanyNews } from "./finnhubService.js";
import { GEMINI_MODEL, geminiUrl, getGeminiKeys, withGeminiConcurrencyLimit } from "./geminiService.js";

/**
 * The stock page's Risk Snapshot and What to Watch Next (My STAK product spec, §7).
 *
 * Risks are about the COMPANY, not about whether it suits the reader - the old "Risk
 * fit / Matches you" claimed to know them. Watchpoints are the two or three things that
 * decide how the story goes from here, never a prediction and never advice.
 *
 * One ungrounded call per stock per day: the numbers and headlines are handed over, so
 * there is no search fee, and the answer is cached for 24 hours.
 */

export type RiskLevel = "Elevated" | "Moderate" | "Lower";

export type RiskWatch = {
	risks: { label: string; level: RiskLevel; note: string }[];
	watch: { title: string; note: string }[];
};

export type RiskInputs = {
	symbol: string;
	companyName: string;
	/** What STAK already knows, so the answer is grounded in figures rather than vibes. */
	peRatio?: number | null;
	peerPe?: number | null;
	revenueGrowth?: string | null;
	profitMargin?: string | null;
	beta?: number | null;
};

const TTL_MS = 24 * 60 * 60 * 1000;
const LEVELS: RiskLevel[] = ["Elevated", "Moderate", "Lower"];

function levelOf(raw: unknown): RiskLevel {
	return LEVELS.find((l) => l.toLowerCase() === String(raw).toLowerCase()) ?? "Moderate";
}

/** The facts worth handing over, written the way a person would say them. */
function factLines(input: RiskInputs): string {
	const out: string[] = [];
	if (input.peRatio != null) {
		const peer = input.peerPe != null ? ` (peers around ${input.peerPe.toFixed(1)})` : "";
		out.push(`- Price/earnings: ${input.peRatio.toFixed(1)}${peer}`);
	}
	if (input.revenueGrowth) out.push(`- Revenue growth: ${input.revenueGrowth}`);
	if (input.profitMargin) out.push(`- Profit margin: ${input.profitMargin}`);
	if (input.beta != null) {
		const swing = input.beta > 1.15 ? "moves more than the market" : input.beta < 0.85 ? "moves less than the market" : "moves roughly with the market";
		out.push(`- Volatility (beta): ${input.beta.toFixed(2)} - ${swing}`);
	}
	return out.join("\n") || "- No fundamentals available";
}

export async function getRiskWatch(input: RiskInputs): Promise<RiskWatch | null> {
	const cacheKey = `risk-watch:v1:${input.symbol}`;
	const cached = await cacheGet<RiskWatch>(cacheKey);
	if (cached) return cached;

	const keys = getGeminiKeys();
	if (keys.length === 0) return null;

	const articles = await getCompanyNews(input.symbol, 24, input.companyName).catch(() => []);
	const headlines = articles.slice(0, 5).map((a) => `- ${a.headline}`).join("\n") || "- (no recent headlines)";

	const prompt = `You are writing the "Risk snapshot" and "What to watch next" for ${input.companyName} (${input.symbol}) in a stock app for beginners.

What STAK knows about the company:
${factLines(input)}

Recent headlines:
${headlines}

Reply with JSON only:
{"risks":[{"label":"...","level":"Elevated|Moderate|Lower","note":"..."}],"watch":[{"title":"...","note":"..."}]}

risks: exactly 3, about THIS company's business - what could go wrong and why it matters. Never about the reader, their profile, or whether they should buy.
- label: 2-4 words naming the risk (e.g. "Valuation expectations", "iPhone dependence", "Price swings").
- level: Elevated, Moderate or Lower. Base it on the figures above where they apply: a P/E well above peers is Elevated valuation risk; a beta above 1.15 is Elevated price swings, below 0.85 is Lower.
- note: ONE sentence (max 18 words), plain English, no jargon, no advice, no disclaimers.

watch: exactly 2, the checkpoints that decide how this company's story goes from here.
- title: 2-4 words (e.g. "Services growth", "iPhone demand").
- note: ONE short question or sentence (max 14 words) a beginner can actually follow.

Never mention a share price, a price target, or what analysts think. Never say "investors should".`;

	for (const key of keys) {
		try {
			const res = await withGeminiConcurrencyLimit(() =>
				fetch(geminiUrl(GEMINI_MODEL, key), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.2, responseMimeType: "application/json" },
					}),
					signal: AbortSignal.timeout(12000),
				}),
			);
			if (res.status === 429) {
				console.warn(`[Gemini] risk-watch(${input.symbol}) rate limited (429) on key ...${key.slice(-4)} — trying next`);
				continue;
			}
			if (!res.ok) {
				console.warn(`[Gemini] risk-watch(${input.symbol}) got ${res.status} on key ...${key.slice(-4)} — giving up`);
				return null;
			}
			const data = await res.json();
			const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
			if (typeof raw !== "string") return null;
			const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as {
				risks?: { label?: string; level?: string; note?: string }[];
				watch?: { title?: string; note?: string }[];
			};
			const risks = (parsed.risks ?? [])
				.filter((r) => r.label && r.note)
				.slice(0, 3)
				.map((r) => ({ label: String(r.label).slice(0, 40), level: levelOf(r.level), note: String(r.note).slice(0, 140) }));
			const watch = (parsed.watch ?? [])
				.filter((w) => w.title && w.note)
				.slice(0, 3)
				.map((w) => ({ title: String(w.title).slice(0, 40), note: String(w.note).slice(0, 120) }));
			if (risks.length === 0) return null;

			const result: RiskWatch = { risks, watch };
			await cacheSet(cacheKey, result, TTL_MS);
			return result;
		} catch (e) {
			console.warn(`[Gemini] risk-watch(${input.symbol}) failed on key ...${key.slice(-4)}: ${(e as Error)?.message}`);
		}
	}
	console.warn(`[Gemini] risk-watch(${input.symbol}): all ${keys.length} keys exhausted - no snapshot`);
	return null;
}
