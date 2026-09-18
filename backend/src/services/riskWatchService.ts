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
	/** `level` is null for a risk no figure can rate - the chip is left off rather than guessed. */
	risks: { label: string; level: RiskLevel | null; note: string }[];
	watch: { title: string; note: string }[];
	/** True when the levels shown were computed from this company's own figures. */
	rated: boolean;
};

/** What the model writes. The levels are laid over it at read time, from the figures. */
type WrittenRiskWatch = {
	risks: { label: string; note: string }[];
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

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
/**
 * A failed generation is remembered too, briefly: without this a company whose answer
 * keeps failing - a timeout, or wording the filter below rejects every time - spent a
 * fresh call on every single page open (review, 2026-09-17).
 */
const FAILED_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Words that mean a risk is about the share price's swings, whatever the model called it. */
const VOLATILITY_WORDS = ["price swing", "volatil", "share price", "price movement"];
const VALUATION_WORDS = ["valuation", "price-to-earnings", "price to earnings", "p/e ", "p/e", "price multiple", "earnings multiple"];

/**
 * The level for a risk STAK can actually measure: how much this share moves against the
 * market, and what it costs against its peers. Anything else gets no level - a made-up
 * rating presented as a measurement is worse than none.
 */
function ratedLevel(label: string, beta: number | null | undefined, pe: number | null | undefined, peerPe: number | null | undefined): RiskLevel | null {
	const l = label.toLowerCase();
	if (VOLATILITY_WORDS.some((w) => l.includes(w)) && beta != null) {
		return beta > 1.15 ? "Elevated" : beta < 0.85 ? "Lower" : "Moderate";
	}
	if (VALUATION_WORDS.some((w) => l.includes(w)) && pe != null && peerPe != null && peerPe > 0 && pe > 0) {
		const ratio = pe / peerPe;
		return ratio > 1.25 ? "Elevated" : ratio < 0.8 ? "Lower" : "Moderate";
	}
	return null;
}

/**
 * Advice, or anything about the reader, that the prompt forbids and a model still writes.
 * Narrow on purpose: "buy", "sell" and "hold" alone threw out ordinary business prose
 * ("could hold back growth", "buy-side demand") and left the company with no snapshot.
 */
const BANNED = /\byou\b|\byour\b|\bshould\b|\brecommend|price target|\bwe expect\b|will likely/i;

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

/** The written risks, with the levels this company's own figures support. */
function rate(written: WrittenRiskWatch, input: RiskInputs): RiskWatch {
	const risks = written.risks.map((r) => ({
		label: r.label,
		level: ratedLevel(r.label, input.beta, input.peRatio, input.peerPe),
		note: r.note,
	}));
	return { risks, watch: written.watch, rated: risks.some((r) => r.level != null) };
}

/** One generation at a time per company, so two readers don't pay for the same answer. */
const inFlight = new Map<string, Promise<RiskWatch | null>>();

export async function getRiskWatch(input: RiskInputs): Promise<RiskWatch | null> {
	// v3: only the written words are cached; the levels are laid over them on the way
	// out, so a peer median that arrives later is used without regenerating anything.
	const cacheKey = `risk-watch:v3:${input.symbol}`;
	const cached = await cacheGet<WrittenRiskWatch | { failed: true }>(cacheKey);
	if (cached) return "failed" in cached ? null : rate(cached, input);

	const keys = getGeminiKeys();
	if (keys.length === 0) return null;

	const running = inFlight.get(cacheKey);
	if (running) return running;
	const job = generate(input, cacheKey, keys).finally(() => inFlight.delete(cacheKey));
	inFlight.set(cacheKey, job);
	return job;
}

async function generate(input: RiskInputs, cacheKey: string, keys: string[]): Promise<RiskWatch | null> {

	const articles = await getCompanyNews(input.symbol, 24, input.companyName).catch(() => []);
	const headlines = articles.slice(0, 5).map((a) => `- ${a.headline}`).join("\n") || "- (no recent headlines)";

	const prompt = `You are writing the "Risk snapshot" and "What to watch next" for ${input.companyName} (${input.symbol}) in a stock app for beginners.

What STAK knows about the company:
${factLines(input)}

Recent headlines:
${headlines}

Reply with JSON only:
{"risks":[{"label":"...","note":"..."}],"watch":[{"title":"...","note":"..."}]}

risks: exactly 3, about THIS company's business - what could go wrong and why it matters. Never about the reader, their profile, or whether they should buy. Do not rate them; STAK does that from the figures.
- label: 2-4 words naming the risk (e.g. "Valuation expectations", "iPhone dependence", "Price swings").
- note: ONE sentence (max 18 words), plain English, no jargon, no advice, no disclaimers.

watch: 2 or 3, the checkpoints that decide how this company's story goes from here.
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
				await cacheSet(cacheKey, { failed: true }, FAILED_TTL_MS);
				return null;
			}
			const data = await res.json();
			const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
			if (typeof raw !== "string") return null;
			const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as {
				risks?: { label?: string; note?: string }[];
				watch?: { title?: string; note?: string }[];
			};
			// The prompt forbids advice and anything about the reader; one generation in a
			// while writes it anyway, and it would sit in the cache for a day.
			const risks = (parsed.risks ?? [])
				.filter((r) => r.label && r.note && !BANNED.test(String(r.note)))
				.slice(0, 3)
				.map((r) => ({ label: String(r.label).slice(0, 40), note: String(r.note).slice(0, 140) }));
			const watch = (parsed.watch ?? [])
				.filter((w) => w.title && w.note && !BANNED.test(String(w.note)))
				.slice(0, 3)
				.map((w) => ({ title: String(w.title).slice(0, 40), note: String(w.note).slice(0, 120) }));
			if (risks.length === 0) {
				await cacheSet(cacheKey, { failed: true }, FAILED_TTL_MS);
				return null;
			}

			const written: WrittenRiskWatch = { risks, watch };
			await cacheSet(cacheKey, written, TTL_MS);
			return rate(written, input);
		} catch (e) {
			console.warn(`[Gemini] risk-watch(${input.symbol}) failed on key ...${key.slice(-4)}: ${(e as Error)?.message}`);
		}
	}
	console.warn(`[Gemini] risk-watch(${input.symbol}): all ${keys.length} keys exhausted - no snapshot`);
	await cacheSet(cacheKey, { failed: true }, FAILED_TTL_MS);
	return null;
}
