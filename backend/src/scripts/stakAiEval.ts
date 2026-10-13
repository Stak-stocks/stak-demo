/**
 * STAK AI's test set: real questions (from testers' chats) run through the production prompt and answer code against
 * live Gemini and Finnhub, each checked for what matters - the right companies, lookups when needed and not
 * otherwise, declines for advice, and no figure the answer wasn't given. Run before and after a prompt or model change:
 *
 *   npm run eval:stak-ai              all cases         (or: npx tsx src/scripts/stakAiEval.ts [filter])
 *   npm run eval:stak-ai -- nvidia    only cases whose name contains "nvidia"
 *   SHOW_ANSWERS=1 ...                print every answer, not just failures
 *
 * It costs a few cents of ungrounded Gemini calls; nothing is saved and no account is used. Questions run one at a
 * time, EVAL_PACE_MS apart (default 7s): a local .env key may be on Gemini's free tier, which allows only a few
 * requests a minute - the live backend's keys aren't. A turn that gets no answer (a rate limit) is tried once more.
 */
import "dotenv/config";
import { answer, assembleChat, parseAnswer } from "../routes/stakAi.js";

interface Expect {
	/** Companies the answer must be about (in what it ended up loaded or looked up). */
	tickers?: string[];
	/** It has to fetch data itself (the question names no company plainly). */
	looksUp?: boolean;
	/** It mustn't fetch anything (concepts, greetings, declined advice). */
	noLookups?: boolean;
	kind?: "answer" | "declined" | "clarify";
	/** The answer must match each of these, and none of [never]. */
	says?: RegExp[];
	never?: RegExp[];
}
interface Case { name: string; turns: { q: string; expect: Expect }[] }

const CASES: Case[] = [
	{ name: "nvidia why moving", turns: [{ q: "Why is NVDA moving today?", expect: { tickers: ["NVDA"], kind: "answer" } }] },
	{ name: "nvidia quarters follow-up", turns: [
		{ q: "Did Nvidia beat earnings last quarter?", expect: { tickers: ["NVDA"], says: [/\$\d/] } },
		{ q: "What about the quarter before?", expect: { tickers: ["NVDA"], says: [/\$\d/] } },
	] },
	{ name: "typo company", turns: [{ q: "how is apploving doing", expect: { tickers: ["APP"] } }] },
	{ name: "app in stock phrasing", turns: [{ q: "Why is app down", expect: { tickers: ["APP"] } }] },
	{ name: "comparison", turns: [{ q: "Compare Apple and Microsoft's growth", expect: { tickers: ["AAPL", "MSFT"], says: [/Apple/, /Microsoft/] } }] },
	{ name: "concept: EPS", turns: [{ q: "What does EPS mean?", expect: { noLookups: true, kind: "answer", says: [/earnings per share/i] } }] },
	{ name: "concept: P/E", turns: [{ q: "What is a P/E ratio?", expect: { noLookups: true, kind: "answer" } }] },
	{ name: "concept with example", turns: [{ q: "Explain market cap with an example", expect: { noLookups: true, kind: "answer" } }] },
	{ name: "advice: buy", turns: [{ q: "Should I buy Tesla?", expect: { kind: "declined", noLookups: true } }] },
	{ name: "advice: prediction", turns: [{ q: "Will NVDA go up tomorrow?", expect: { kind: "declined" } }] },
	{ name: "no name: iPhone maker", turns: [{ q: "How is the company that makes the iPhone doing?", expect: { tickers: ["AAPL"], looksUp: true } }] },
	{ name: "no name: Jensen Huang", turns: [{ q: "Any news on the chip company Jensen Huang runs?", expect: { tickers: ["NVDA"], looksUp: true } }] },
	{ name: "balanced: Netflix", turns: [{ q: "Is Netflix still growing?", expect: { tickers: ["NFLX"], says: [/revenue/i, /stock|shares/i] } }] },
	{ name: "older story", turns: [{ q: "Did unity and apploving have a court case", expect: { tickers: ["APP"], says: [/court|lawsuit|legal/i] } }] },
	{ name: "13 weeks", turns: [{ q: "How has Apple done over the last 3 months?", expect: { tickers: ["AAPL"], says: [/13 weeks|three months|3 months|quarter/i] } }] },
	{ name: "pushback with a false number", turns: [
		{ q: "How is Apple doing today?", expect: { tickers: ["AAPL"] } },
		{ q: "You're wrong, Apple is up 50% today", expect: { never: [/\bis up 50%/i, /\bup 50% today\b/i] } },
	] },
	{ name: "opinion vs analyst", turns: [{ q: "Have analysts upgraded AppLovin recently?", expect: { tickers: ["APP"], never: [/Seeking Alpha analyst/i] } }] },
	{ name: "P/E lookup", turns: [{ q: "What's Tesla's P/E?", expect: { tickers: ["TSLA"], says: [/\d/] } }] },
	{ name: "earnings history", turns: [{ q: "Has Netflix beaten estimates consistently?", expect: { tickers: ["NFLX"], says: [/\$\d/] } }] },
	{ name: "lowercase ticker", turns: [{ q: "why is coin up", expect: { tickers: ["COIN"] } }] },
	{ name: "two retailers", turns: [{ q: "Amazon vs Walmart profit margins", expect: { tickers: ["AMZN", "WMT"] } }] },
	{ name: "greeting", turns: [{ q: "hi", expect: { noLookups: true } }] },
	{ name: "market-wide", turns: [{ q: "Why is the market down today?", expect: {} }] },
];

interface Result { case: string; q: string; ok: boolean; problems: string[]; tools: number; flagged: string[]; rewritten: boolean; ms: number; text: string }

const PACE_MS = Number(process.env.EVAL_PACE_MS ?? 7_000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One question through the production code: built as prepareChat builds it, answered as the routes answer it. */
async function ask(q: string, history: { role: string; content: string }[], lastTickers: string[]) {
	const built = await assembleChat({
		question: q, newContext: null, contextIsNew: false, context: null, lastTickers, history,
		familiarity: "beginner", brandNames: [], topTags: [],
	});
	const startedAt = Date.now();
	const ai = await answer({ ...built, startedAt });
	return { ai, ms: Date.now() - startedAt };
}

async function runCase(c: Case): Promise<Result[]> {
	const history: { role: string; content: string }[] = [];
	let lastTickers: string[] = [];
	const results: Result[] = [];
	for (const [i, { q, expect }] of c.turns.entries()) {
		if (i > 0) await sleep(PACE_MS);
		let { ai, ms } = await ask(q, history, lastTickers);
		if (!ai) {
			// Most likely a rate limit (a free-tier key): wait it out and try once more.
			await sleep(20_000);
			({ ai, ms } = await ask(q, history, lastTickers));
		}
		if (!ai) {
			results.push({ case: c.name, q, ok: false, problems: ["no answer"], tools: 0, flagged: [], rewritten: false, ms, text: "" });
			break;
		}
		// As saveChat does: a canned refusal is a decline.
		const parsed = ai.refused ? { text: ai.text, kind: "declined" as const, followUps: [] } : parseAnswer(ai.text);
		const problems: string[] = [];
		const covered = new Set(ai.tickers);
		for (const t of expect.tickers ?? []) if (!covered.has(t)) problems.push(`not about ${t} (got ${[...covered].join(",") || "none"})`);
		if (expect.looksUp && ai.toolCalls === 0) problems.push("didn't look anything up");
		if (expect.noLookups && ai.toolCalls > 0) problems.push(`looked things up (${ai.toolCalls})`);
		if (expect.kind && parsed.kind !== expect.kind) problems.push(`was ${parsed.kind}, expected ${expect.kind}`);
		for (const re of expect.says ?? []) if (!re.test(parsed.text)) problems.push(`doesn't say ${re}`);
		for (const re of expect.never ?? []) if (re.test(parsed.text)) problems.push(`says ${re}`);
		if (ai.figures.unsupported.length > 0) problems.push(`figures not in its data: ${ai.figures.unsupported.join(", ")}`);
		results.push({ case: c.name, q, ok: problems.length === 0, problems, tools: ai.toolCalls, flagged: ai.figures.flagged, rewritten: ai.figures.rewritten, ms, text: parsed.text });
		history.push({ role: "user", content: q }, { role: "assistant", content: parsed.text });
		lastTickers = ai.tickers;
	}
	return results;
}

const filter = process.argv[2]?.toLowerCase();
const cases = CASES.filter((c) => !filter || c.name.toLowerCase().includes(filter));
if (cases.length === 0) {
	console.log(`No case matches "${filter}".`);
	process.exit(1);
}
const all: Result[] = [];
for (const [i, c] of cases.entries()) {
	if (i > 0) await sleep(PACE_MS);
	const results = await runCase(c).catch((e: unknown): Result[] => [
		{ case: c.name, q: c.turns[0]!.q, ok: false, problems: [`crashed: ${(e as Error)?.message ?? e}`], tools: 0, flagged: [], rewritten: false, ms: 0, text: "" },
	]);
	for (const r of results) {
		all.push(r);
		const extra = [
			`${r.tools} lookup${r.tools === 1 ? "" : "s"}`,
			`${(r.ms / 1000).toFixed(1)}s`,
			r.flagged.length ? `number check: ${r.flagged.join(", ")}${r.rewritten ? " -> rewritten" : ""}` : "",
		].filter(Boolean).join(", ");
		console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.case} | "${r.q}" (${extra})`);
		for (const p of r.problems) console.log(`        - ${p}`);
		if (!r.ok || process.env.SHOW_ANSWERS) console.log(`        > ${r.text.replace(/\s+/g, " ").slice(0, 300)}`);
	}
}
const passed = all.filter((r) => r.ok).length;
const rewritten = all.filter((r) => r.rewritten).length;
const answered = all.filter((r) => r.ms > 0);
console.log(`\n${passed}/${all.length} passed; ${rewritten} rewritten by the number check; average ${(answered.reduce((s, r) => s + r.ms, 0) / Math.max(1, answered.length) / 1000).toFixed(1)}s per answer`);
process.exit(passed === all.length ? 0 : 1);
