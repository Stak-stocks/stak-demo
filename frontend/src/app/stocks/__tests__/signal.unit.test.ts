import { beforeAll, describe, expect, it } from "vitest";
import { articleById } from "@/app/news/articles";
import { allTickers, brandByTicker, loadCatalog, primaryCategoryOf } from "@/app/live/catalog";
import { FRAME_NOW } from "@/app/live/clock";
import { AAPL_COVERAGE, PHONE_COVERAGE } from "../coverage";
import { siteStories, storiesFor } from "../news";
import {
	commentaryLine,
	EARNINGS_WINDOW,
	earningsInFor,
	earningsLineFor,
	EXPLAINER_SOURCE,
	explainerFor,
	FUND_EARNINGS,
	isExplainerCard,
	isFund,
	MAX_STORIES,
	NO_PRICE_MOVE,
	newsSignalFor,
	READINGS,
	CAPITAL_MARKETS_BANKS,
	isSteady,
	SOLAR_COMPANIES,
	signalStoriesFor,
	toneFor,
} from "../signal";

beforeAll(() => loadCatalog());

const NOV_10 = new Date(2026, 10, 10, 9, 41).getTime();
const EARNINGS = /^Next earnings land [A-Z][a-z]{2} \d{1,2}\.$/;
const TONES = ["Positive", "Neutral", "Negative"];

/** The row's story ids of a company, in order. */
const ids = (T: string) => newsSignalFor(T, "▲ +1.0% today", FRAME_NOW).articles.map((a) => a.story ?? (isExplainerCard(a) ? "explainer" : "?"));

describe("the News signal of every catalog company (ruling N39c)", () => {
	const tickers = () => allTickers();

	it("covers all 333 companies", () => {
		expect(tickers()).toHaveLength(333);
	});

	it("gives every company the two lines and at least two cards: its own stories, its explainer, then the others, four in all", () => {
		for (const T of tickers()) {
			const s = newsSignalFor(T, "▲ +1.0% today", NOV_10);
			expect(s.title).toBe("News signal");
			expect(s.lines, T).toHaveLength(2);
			for (const line of s.lines) expect(line.trim().length, T).toBeGreaterThan(0);
			// line one reads as a sentence (capitalised, a full stop)
			expect(s.lines[0], T).toMatch(/^[A-Z0-9].*[.!?]$/);
			// line two: the earnings line from the clock, or a fund's own line
			expect(s.lines[1] === FUND_EARNINGS || EARNINGS.test(s.lines[1]!), `${T}: ${s.lines[1]}`).toBe(true);
			expect(s.articles.length, T).toBeGreaterThanOrEqual(2);
			expect(s.articles, T).toHaveLength(MAX_STORIES + 1);
			// the explainer is the one card that is not a story; it stands right after the company's own stories (N42): first
			// where the company has none
			expect(s.articles.filter(isExplainerCard), T).toHaveLength(1);
			const own = signalStoriesFor(T).filter((p) => p.tier === 0).length;
			expect(s.articles.findIndex(isExplainerCard), T).toBe(own);
		}
	});

	it("opens an existing article from every story card, under the story's own publisher and age", () => {
		const sources = new Map(siteStories().map((s) => [s.id, s.source]));
		for (const T of tickers()) {
			const stories = newsSignalFor(T, "", FRAME_NOW).articles.filter((a) => !isExplainerCard(a));
			expect(stories.length, T).toBeGreaterThanOrEqual(1);
			for (const a of stories) {
				expect(a.story, T).toBeDefined();
				expect(articleById(a.story!), `${T} -> ${a.story}`).toBeDefined();
				// never an invented headline or publisher: the line and the title the site lists the story under
				expect(a.source).toBe(sources.get(a.story!));
				expect(a.text).toBe(siteStories().find((s) => s.id === a.story)!.title);
				expect(TONES).toContain(a.tone);
				expect(a.url).toBeUndefined();
			}
			// one story is never shown twice
			expect(new Set(stories.map((a) => a.story)).size).toBe(stories.length);
		}
	});

	it("labels the explainer as the site's own and fills it with the catalog's own text, verbatim", () => {
		for (const T of tickers()) {
			const card = newsSignalFor(T, "", FRAME_NOW).articles.find(isExplainerCard)!;
			const context = brandByTicker(T)!.culturalContext;
			expect(card.source).toBe(EXPLAINER_SOURCE);
			expect(card.source).toBe("STAK · Explainer");
			expect(card.tone).toBe("Neutral");
			expect(card.text).toBe(context.title);
			expect(card.story).toBeUndefined();
			expect(card.url).toBeUndefined();
			expect(card.explainer).toEqual({ symbol: T, title: context.title, sections: context.sections.map(({ heading, content }) => ({ heading, content })) });
			expect(explainerFor(T.toLowerCase())).toEqual(card.explainer);
		}
	});

	it("is deterministic: the same company gives the same signal on every call", () => {
		for (const T of tickers()) expect(newsSignalFor(T, "▼ -0.4% today", NOV_10)).toEqual(newsSignalFor(T, "▼ -0.4% today", NOV_10));
	});

	it("keeps everything but the day's move for a company without a price: its line says there is no price", () => {
		const s = newsSignalFor("SNAP", "", FRAME_NOW);
		expect(s.move).toBe(NO_PRICE_MOVE);
		expect(s.move).toBe("No price right now, so no move to show");
		expect(s.lines).toHaveLength(2);
		expect(s.articles).toHaveLength(4);
		// a priced company keeps its own move line
		expect(newsSignalFor("SNAP", "▲ +1.1% today", FRAME_NOW).move).toBe("▲ +1.1% today");
	});
});

describe("the cards: own stories, then the closest stories, then the market-wide ones (N39c)", () => {
	it("leads with the company's own story, the way the site lists it", () => {
		for (const s of siteStories()) expect(ids(s.ticker)[0]).toBe(s.id);
		expect(newsSignalFor("MU", "", FRAME_NOW).articles[0]).toEqual({ source: "Bloomberg · 2d", tone: "Positive", text: "Memory chips soar as the AI trade rotates", story: "memory-chips-soar" });
	});

	it("follows with a story whose copy names the company, then its industry's, then its sector's", () => {
		// "Tesla, which lost 7 percent in a day" (the fear gauge), after Tesla's own story
		expect(ids("TSLA")).toEqual(["tesla-deliveries", "explainer", "fear-gauge-32", "dow-record-chips"]);
		// "a near 5 percent jump in Apple" (the Dow record) and "Apple ... takes aim at its crown" (Nvidia's)
		expect(ids("AAPL")).toEqual(["apple-foldable", "explainer", "dow-record-chips", "nvidia-chip-rally"]);
		// a chip maker: the two chip stories (their companies share its industry), then the AI & Tech sector's
		expect(ids("AMD")).toEqual(["explainer", "nvidia-chip-rally", "memory-chips-soar", "apple-foldable"]);
		// an AI & Tech company with no story of its industry: the sector's chip and AI stories
		expect(ids("PLTR")).toEqual(["explainer", "nvidia-chip-rally", "apple-foldable", "memory-chips-soar"]);
		// Alphabet shares Microsoft's industry (mega-cap tech): the OpenAI story first
		expect(ids("GOOGL")[1]).toBe("openai-ipo-delayed");
		// a bank: the Fed minutes (JPMorgan's industry), then the Dow record (the finance sector's)
		expect(ids("BAC")).toEqual(["explainer", "fed-minutes", "dow-record-chips", "june-jobs-miss"]);
		// a REIT: the jobs report (Realty Income's industry)
		expect(ids("PLD")[1]).toBe("june-jobs-miss");
		// the oil story for energy and Green Energy; the fear gauge reports how solar moved
		expect(ids("CVX")[1]).toBe("oil-slips-iran");
		expect(ids("ENPH")).toEqual(["explainer", "oil-slips-iran", "fear-gauge-32", "dow-record-chips"]);
		// Tesla's story for the other carmakers
		expect(ids("RIVN")[1]).toBe("tesla-deliveries");
		expect(ids("F")[1]).toBe("tesla-deliveries");
		// the S&P 500 fund: the Dow story's S&P 500 sentence names its index
		expect(ids("SPY")).toEqual(["explainer", "dow-record-chips", "fed-minutes", "june-jobs-miss"]);
	});

	it("gives a company no story names, of no sector a story covers, the market-wide stories", () => {
		for (const T of ["EAT", "BRK.B", "SPCE", "LRLCY", "DAL"]) expect(ids(T)).toEqual(["explainer", "dow-record-chips", "fed-minutes", "june-jobs-miss"]);
		expect(signalStoriesFor("EAT").map((p) => p.tier)).toEqual([5, 5, 5]);
	});

	it("never shows another sector's story (the chip stories stay off a restaurant's page, the oil story off a bank's)", () => {
		for (const T of allTickers()) {
			for (const p of signalStoriesFor(T)) {
				if (["Tech & Ai", "Autos", "Energy"].includes(p.story.category)) expect(p.tier, `${T} ${p.story.id}`).toBeLessThanOrEqual(4);
			}
		}
		expect(ids("EAT")).not.toContain("nvidia-chip-rally");
		expect(ids("BAC")).not.toContain("oil-slips-iran");
	});
});

describe("the tone pill: one rule (N39c)", () => {
	const story = (id: string) => siteStories().find((s) => s.id === id)!;

	it("is the story's own tone on its own company", () => {
		for (const s of siteStories()) expect(toneFor(s, s.ticker)).toBe(storiesFor(s.ticker)[0]!.tone);
		expect(toneFor(story("tesla-deliveries"), "TSLA")).toBe("Negative");
	});

	it("is what the copy reports for a company it names", () => {
		expect(toneFor(story("fear-gauge-32"), "TSLA")).toBe("Negative");
		expect(toneFor(story("dow-record-chips"), "AAPL")).toBe("Positive");
		expect(toneFor(story("dow-record-chips"), "SPY")).toBe("Positive");
		expect(toneFor(story("dow-record-chips"), "QQQ")).toBe("Negative");
		expect(toneFor(story("apple-foldable"), "NVDA")).toBe("Neutral");
	});

	it("is what the copy reports for the company's industry, otherwise Neutral", () => {
		// "the index of chip stocks ... climbed about 31 percent"; "a sell-off tearing through chip stocks"
		expect(toneFor(story("nvidia-chip-rally"), "AMD")).toBe("Positive");
		expect(toneFor(story("apple-foldable"), "AMD")).toBe("Negative");
		// "oil companies like Exxon Mobil, whose shares tend to follow the price of the crude they sell"
		expect(toneFor(story("oil-slips-iran"), "CVX")).toBe("Negative");
		// "from Coca-Cola to the big utilities"; "health care companies picked up the money"
		expect(toneFor(story("fear-gauge-32"), "PEP")).toBe("Positive");
		expect(toneFor(story("dow-record-chips"), "LLY")).toBe("Positive");
		// the Fed minutes are a preview; a restaurant is in no industry the Dow story reports
		expect(toneFor(story("fed-minutes"), "BAC")).toBe("Neutral");
		expect(toneFor(story("dow-record-chips"), "EAT")).toBe("Neutral");
	});

	it("reads a group the copy describes, never the whole industry beyond it (the every-stock data review)", () => {
		const fear = story("fear-gauge-32");
		// "solar companies": the catalog's solar makers only; NextEra is a utility (the "big utilities" money moved INTO)
		// and Plug Power makes hydrogen fuel cells: the copy reports no move of theirs
		for (const T of ["ENPH", "FSLR"]) expect([T, toneFor(fear, T)]).toEqual([T, "Negative"]);
		for (const T of ["NEE", "PLUG"]) expect([T, toneFor(fear, T)]).toEqual([T, "Neutral"]);
		// the gist: "Investors sold chip, solar and electric car stocks for safer names." (every electric carmaker)
		expect(articleById("fear-gauge-32")!.gist).toContain("Investors sold chip, solar and electric car stocks for safer names.");
		for (const T of ["RIVN", "LCID", "NIO"]) expect([T, toneFor(fear, T)]).toEqual([T, "Negative"]);
		// the shelter's steady names ("shares tend to swing less than the market does": a beta under 1), not Boston Beer
		// (1.3) or Beyond Meat (2.5)
		for (const T of ["PEP", "KDP", "STZ", "PG", "CL", "DUK", "SO"]) expect([T, toneFor(fear, T)]).toEqual([T, "Positive"]);
		for (const T of ["SAM", "BYND"]) expect([T, toneFor(fear, T)]).toEqual([T, "Neutral"]);
		// "Goldman Sachs gained 1.2 percent as banks rose": the investment banks, not the exchanges
		const dow = story("dow-record-chips");
		for (const T of ["MS", "EVR", "RJF"]) expect([T, toneFor(dow, T)]).toEqual([T, "Positive"]);
		for (const T of ["CME", "ICE", "NDAQ", "CBOE"]) expect([T, toneFor(dow, T)]).toEqual([T, "Neutral"]);
		// Nvidia is reported both ways in the memory story ("selling the AI giants"; an eighth of Micron's gain): Neutral
		expect(toneFor(story("memory-chips-soar"), "NVDA")).toBe("Neutral");
		// the groups name catalog companies of the industries they narrow
		for (const T of SOLAR_COMPANIES) expect([T, primaryCategoryOf(T)]).toEqual([T, "clean_energy"]);
		for (const T of CAPITAL_MARKETS_BANKS) expect([T, primaryCategoryOf(T)]).toEqual([T, "capital_markets"]);
		expect([isSteady("KO"), isSteady("SAM"), isSteady("NOSUCH")]).toEqual([true, false, false]);
		// the rows: NextEra and Plug Power take the market-wide stories after their sector's, the fear gauge no longer first
		expect(ids("NEE")).toEqual(["explainer", "oil-slips-iran", "dow-record-chips", "fed-minutes"]);
		expect(ids("PLUG")).toEqual(["explainer", "oil-slips-iran", "dow-record-chips", "fed-minutes"]);
	});

	it("reads every company it names from the catalog, and every story it reads from the site", () => {
		const known = new Set(siteStories().map((s) => s.id));
		for (const [id, reading] of Object.entries(READINGS)) {
			expect(known.has(id), id).toBe(true);
			for (const T of Object.keys(reading.named ?? {})) expect(brandByTicker(T), `${id} names ${T}`).toBeDefined();
		}
	});
});

describe("the two lines (N39c)", () => {
	it("starts with the own story's first point where the company has a story", () => {
		for (const s of siteStories()) expect(newsSignalFor(s.ticker, "", FRAME_NOW).lines[0]).toBe(s.gist[0]);
	});

	it("starts with the catalog's commentary otherwise: its revenue growth's own words, capitalised, with a full stop", () => {
		expect(newsSignalFor("PLTR", "", FRAME_NOW).lines[0]).toBe("Accelerating from commercial AI adoption.");
		expect(newsSignalFor("EAT", "", FRAME_NOW).lines[0]).toBe("One of the strongest growth rates in casual dining.");
		expect(newsSignalFor("SPY", "", FRAME_NOW).lines[0]).toBe("Tracks index, not a company.");
		for (const T of allTickers()) {
			if (storiesFor(T).length) continue;
			const own = brandByTicker(T)!.financials.revenueGrowth.culturalTranslation.trim();
			expect(commentaryLine(T)!.toLowerCase().startsWith(own.slice(0, -1).toLowerCase()), T).toBe(true);
		}
	});

	it("dates the earnings line from the clock: the phones' own day for their nineteen, one fixed day for every other company", () => {
		for (const [T, c] of [...Object.entries(PHONE_COVERAGE), ["AAPL", AAPL_COVERAGE] as const]) expect(earningsInFor(T)).toBe(c.earningsIn);
		expect(earningsLineFor("AAPL", FRAME_NOW)).toBe("Next earnings land Jul 30.");
		expect(earningsLineFor("NVDA", FRAME_NOW)).toBe("Next earnings land Aug 27.");
		for (const T of allTickers()) {
			if (T === "AAPL" || PHONE_COVERAGE[T] || isFund(T)) continue;
			const days = earningsInFor(T)!;
			expect(days, T).toBeGreaterThanOrEqual(EARNINGS_WINDOW.first);
			expect(days, T).toBeLessThanOrEqual(EARNINGS_WINDOW.last);
			expect(earningsInFor(T.toLowerCase())).toBe(days);
		}
		// the date moves with the clock, the distance stays
		const pltr = earningsInFor("PLTR")!;
		expect(earningsLineFor("PLTR", FRAME_NOW)).toBe(`Next earnings land ${new Date(2026, 6, 4 + pltr, 12).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`);
	});

	it("says an index fund has no earnings of its own", () => {
		expect([isFund("SPY"), isFund("QQQ"), isFund("AAPL")]).toEqual([true, true, false]);
		expect(earningsInFor("SPY")).toBeNull();
		expect(earningsLineFor("QQQ", FRAME_NOW)).toBe(FUND_EARNINGS);
	});
});
