import { beforeAll, describe, expect, it } from "vitest";
import { type CollectionSlug, loadCatalog } from "@/app/live/catalog";
import { PICKS_DONE } from "@/app/home/copy";
import { ALL_COLLECTIONS, groupByCollection } from "@/app/live/collections";
import type { StockChartPoint } from "@/lib/api";
import { allocationFor, RING, ringSegments, wholeShares } from "../allocation";
import { DISCOVER_CTA, deckControl, EMPTY } from "../data";
import { FIRST_SAVE_TITLE, readFor, WORDS_UP_TO } from "../insight";
import { collectionBack, FROM_OVERVIEW } from "../nav";
import { rangeFigures, showsBestWorst, type TodayFigures } from "../performance";
import { inFrameOrder, removalPlan, removeFromStak } from "../remove";

beforeAll(() => loadCatalog());

const groups = (byCollection: Partial<Record<CollectionSlug, string[]>>) =>
	({ "ai-tech": [], finance: [], "green-energy": [], "real-estate": [], healthcare: [], consumer: [], other: [], ...byCollection }) as Record<CollectionSlug, string[]>;

describe("allocationFor (mystak items 4 and 7)", () => {
	it("gives every collection with a save its own row, biggest first, Other last, coloured from COLLECTION_COLORS", () => {
		const rows = allocationFor(groups({ "ai-tech": ["NVDA"], finance: ["JPM", "V"], healthcare: ["LLY", "PFE", "MRK"], consumer: ["COST"], other: ["XOM", "BA", "CAT", "GE"] }));
		expect(rows.map((r) => r.slug)).toEqual(["healthcare", "finance", "ai-tech", "consumer", "other"]);
		expect(rows.map((r) => r.name)).toEqual(["Healthcare", "Finance", "Tech & AI", "Consumer", "Other"]);
		expect(rows.find((r) => r.slug === "healthcare")?.color).toBe("#e5a0c8");
		expect(rows.find((r) => r.slug === "consumer")?.color).toBe("#f0c36a");
		expect(rows.find((r) => r.slug === "other")?.color).toBe("#5c6b85");
	});
	it("keeps the overview's collection order on a tie", () => {
		const rows = allocationFor(groups({ consumer: ["COST"], "ai-tech": ["NVDA"], finance: ["JPM"] }));
		expect(rows.map((r) => r.slug)).toEqual(["ai-tech", "finance", "consumer"]);
	});
	it("makes each bar its share of the whole track (the frame's 132 / 314 = 42 %), not of the largest row", () => {
		const one = allocationFor(groups({ "ai-tech": ["NVDA"] }));
		expect(one).toHaveLength(1);
		expect(one[0]).toMatchObject({ share: 100, fill: 1, count: 1 });
		const four = allocationFor(groups({ "ai-tech": ["NVDA"], other: ["XOM", "BA", "CAT"] }));
		expect(four.map((r) => [r.slug, r.share, r.fill])).toEqual([
			["ai-tech", 25, 0.25],
			["other", 75, 0.75],
		]);
	});
	it("is empty with nothing saved", () => {
		expect(allocationFor(groups({}))).toEqual([]);
	});
});

describe("the printed shares add up to 100 (NUM-06, N23p: largest remainder)", () => {
	const sum = (xs: readonly number[]) => xs.reduce((n, x) => n + x, 0);
	/** every way to split `total` saves over exactly `parts` collections, biggest first (the rows' own order) */
	function* splits(total: number, parts: number, max = total): Generator<number[]> {
		if (parts === 1) {
			if (total >= 1 && total <= max) yield [total];
			return;
		}
		for (let first = Math.min(max, total - (parts - 1)); first >= Math.ceil(total / parts); first--) {
			for (const rest of splits(total - first, parts - 1, first)) yield [first, ...rest];
		}
	}

	it("prints the persona's nineteen saves as 26 + 21 + 16 + 16 + 11 + 10 (they read 101 rounded one by one)", () => {
		const persona = groups({ "ai-tech": ["MSFT", "AMD", "SNOW", "PLTR", "CRWD"], finance: ["JPM", "V", "BAC"], "green-energy": ["ENPH", "FSLR", "NEE"], "real-estate": ["O", "PLD"], healthcare: ["PFE", "LLY", "ABBV", "MRK"], consumer: ["COST", "TSLA"] });
		const rows = allocationFor(persona);
		expect(rows.map((r) => [r.name, r.share, r.count])).toEqual([
			["Tech & AI", 26, 5],
			["Healthcare", 21, 4],
			["Finance", 16, 3],
			["Green Energy", 16, 3],
			["Real Estate", 11, 2],
			["Consumer", 10, 2],
		]);
		expect(sum(rows.map((r) => r.share))).toBe(100);
		expect(sum([5, 4, 3, 3, 2, 2].map((c) => Math.round((c / 19) * 100)))).toBe(101); // the old rule
		// the bars and the ring keep the exact shares
		expect(rows.map((r) => r.fill)).toEqual([5 / 19, 4 / 19, 3 / 19, 3 / 19, 2 / 19, 2 / 19]);
		expect(sum(rows.map((r) => r.fill))).toBeCloseTo(1, 12);
	});

	it("sums to exactly 100 for every split of 1 to 40 saves over 1 to 7 collections, each share within a point of its own", () => {
		let checked = 0;
		let offByRounding = 0;
		for (let total = 1; total <= 40; total++) {
			for (let parts = 1; parts <= Math.min(7, total); parts++) {
				for (const counts of splits(total, parts)) {
					const shares = wholeShares(counts);
					checked++;
					if (sum(counts.map((c) => Math.round((c / total) * 100))) !== 100) offByRounding++;
					if (sum(shares) !== 100) throw new Error(`${counts} -> ${shares}: ${sum(shares)}`);
					counts.forEach((c, i) => {
						const exact = (c / total) * 100;
						if (!(Math.abs(shares[i]! - exact) < 1) || shares[i]! < 1) throw new Error(`${counts} -> ${shares}: row ${i}`);
					});
					// a bigger row never prints a smaller share than a smaller row
					for (let i = 1; i < shares.length; i++) if (shares[i - 1]! < shares[i]!) throw new Error(`${counts} -> ${shares}: order`);
				}
			}
		}
		expect(checked).toBeGreaterThan(10_000);
		expect(offByRounding).toBeGreaterThan(1_000); // what rounding each row on its own got wrong
	});

	it("through allocationFor too: any saves, any of the seven collections", () => {
		for (let total = 1; total <= 40; total++) {
			for (let parts = 1; parts <= Math.min(7, total); parts++) {
				// spread `total` saves over the first `parts` collections, unevenly
				const g = groups({});
				for (let i = 0; i < total; i++) g[ALL_COLLECTIONS[i < parts ? i : (i * i + i) % parts]!].push(`S${i}`);
				const rows = allocationFor(g);
				expect(rows).toHaveLength(parts);
				expect(sum(rows.map((r) => r.share)), `${total} saves over ${parts}`).toBe(100);
				expect(sum(rows.map((r) => r.count))).toBe(total);
			}
		}
	});

	it("breaks a tie toward the row drawn first, and never prints 0% for a collection that holds a save", () => {
		expect(wholeShares([1, 1, 1])).toEqual([34, 33, 33]);
		expect(wholeShares([1, 1, 1, 1, 1, 1, 1])).toEqual([15, 15, 14, 14, 14, 14, 14]);
		expect(wholeShares([7])).toEqual([100]);
		expect(wholeShares([])).toEqual([]);
		expect(wholeShares([0, 0])).toEqual([0, 0]);
		// one save beside hundreds: 1%, taken from the largest row when no point is left over
		expect(wholeShares([398, 1, 1])).toEqual([98, 1, 1]);
		expect(wholeShares([300, 1])).toEqual([99, 1]);
	});
});

describe("ringSegments (mystak item 3)", () => {
	const row = (key: string, fill: number, color = "#69b3ca") => ({ key, fill, color });
	it("draws one whole ring for a single row", () => {
		const s = ringSegments([row("a", 1)]);
		expect(s).toHaveLength(1);
		expect(s[0]!.d.match(/M/g)).toHaveLength(2); // the outer and the inner circle, filled even-odd
	});
	it("draws one arc per row, in the row's colour, clockwise from 12 o'clock", () => {
		const s = ringSegments([row("a", 0.5, "#111111"), row("b", 0.25, "#222222"), row("c", 0.25, "#333333")]);
		expect(s.map((x) => [x.key, x.color])).toEqual([
			["a", "#111111"],
			["b", "#222222"],
			["c", "#333333"],
		]);
		// the first arc starts just right of 12 o'clock (x a gap's half to the right of the centre line, above the centre)
		const start = s[0]!.d.match(/^M(-?[\d.]+) (-?[\d.]+)/)!;
		expect(Number(start[1])).toBeGreaterThan(0);
		expect(Number(start[1])).toBeLessThan(RING.gap);
		expect(Number(start[2])).toBeLessThan(-RING.inner);
		// a quarter is a small arc; more than half the ring is a large one
		expect(s[1]!.d).toContain(`A${RING.outer} ${RING.outer} 0 0 1`);
		const big = ringSegments([row("a", 0.6), row("b", 0.4)]);
		expect(big[0]!.d).toContain(`A${RING.outer} ${RING.outer} 0 1 1`);
		expect(big[0]!.d).toContain(`A${RING.inner} ${RING.inner} 0 1 0`);
	});
	it("keeps a sliver drawn when its share is too thin for the frame's corners", () => {
		const s = ringSegments([row("big", 0.99), row("tiny", 0.01)]);
		expect(s).toHaveLength(2);
		for (const seg of s) {
			expect(seg.d).not.toMatch(/NaN|Infinity/);
			expect(seg.d.endsWith("Z")).toBe(true);
		}
	});
	it("skips rows with nothing in them", () => {
		expect(ringSegments([row("a", 0), row("b", 1)]).map((x) => x.key)).toEqual(["b"]);
		expect(ringSegments([])).toEqual([]);
	});
});

describe("readFor (mystak item 6)", () => {
	it("names a first save instead of counting it", () => {
		expect(readFor(groups({ "ai-tech": ["NVDA"] }))).toEqual({
			title: "Your read starts with your first save.",
			body: "NVDA is your first save, a tech or AI name. Save a few more and STAK will read the pattern.",
		});
		expect(readFor(groups({ other: ["XOM"] }))?.body).toBe("XOM is your first save. Save a few more and STAK will read the pattern.");
	});
	it("claims no lean over one save, whatever its collection: the body says the pattern cannot be read yet (C-12)", () => {
		for (const slug of ALL_COLLECTIONS) {
			const one = readFor(groups({ [slug]: ["AAA"] }))!;
			expect(one.title, slug).toBe(FIRST_SAVE_TITLE);
			expect(one.title, slug).not.toMatch(/lean/i);
			expect(one.body, slug).toContain("Save a few more and STAK will read the pattern.");
		}
		// from two saves on there is a pattern to name
		expect(readFor(groups({ "ai-tech": ["NVDA", "AMD"] }))?.title).toBe("You lean into growth and tech.");
		expect(readFor(groups({ "ai-tech": ["NVDA"], finance: ["JPM"] }))?.title).toBe("You lean into growth and tech.");
	});
	it("uses one conjunction for the sector phrase, the frame's 'or' (C-12)", () => {
		const one = readFor(groups({ "ai-tech": ["NVDA"] }))!.body;
		const lead = readFor(groups({ "ai-tech": ["NVDA"], finance: ["JPM"], consumer: ["COST"] }))!.body;
		const many = readFor(groups({ "ai-tech": ["NVDA", "AMD"], finance: ["JPM"] }))!.body;
		expect(one).toContain("a tech or AI name");
		expect(lead).toContain("is a tech or AI name");
		expect(many).toContain("are tech or AI names");
		for (const body of [one, lead, many]) expect(body).not.toMatch(/tech and AI/);
	});
	it("writes both counts in one style: words up to twenty saves, numerals for both beyond (NUM-14)", () => {
		const some = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
		const stak = (tech: number, rest: number) => groups({ "ai-tech": some(tech, "T"), finance: some(rest, "F") });
		expect(WORDS_UP_TO).toBe(20);
		// the hunt's own pair: the persona with twenty saves, then with twenty-one (KO saved): "Six of your 21 picks"
		const twenty = groups({ "ai-tech": some(6, "T"), finance: some(3, "F"), "green-energy": some(3, "G"), "real-estate": some(2, "R"), healthcare: some(4, "H"), consumer: some(2, "C") });
		const twentyOne = { ...twenty, consumer: some(3, "C") };
		expect(readFor(twenty)?.body).toBe("Six of your twenty picks are tech or AI names. Your STAK skews high-growth, with a small hedge in real estate.");
		expect(readFor(twentyOne)?.body).toBe("6 of your 21 picks are tech or AI names. Your STAK skews high-growth, with a small hedge in real estate.");
		expect(readFor(stak(21, 4))?.body).toBe("21 of your 25 picks are tech or AI names. Your STAK skews high-growth, with a small hedge in finance.");
		// a lead of one and a whole STAK past twenty follow the same rule
		const spread = groups({ "ai-tech": ["T0"], finance: ["F0"], "green-energy": ["G0"], other: Array.from({ length: 19 }, (_, i) => `O${i}`) });
		expect(readFor(spread)?.body).toBe("19 of your 22 picks are names outside the main sectors. Your STAK skews eclectic, with a small hedge in tech.");
		const leadOfOne = groups({ "ai-tech": ["T0"], finance: ["F0"], "green-energy": ["G0"], "real-estate": ["R0"], healthcare: ["H0"], consumer: ["C0"], other: ["O0"] });
		expect(readFor(leadOfOne)?.body.startsWith("One of your seven picks is a tech or AI name.")).toBe(true);
		const many = groups({ "ai-tech": ["T0"], finance: ["F0"], "green-energy": ["G0"], "real-estate": ["R0"], healthcare: ["H0"], consumer: ["C0"], other: ["O0"] });
		for (let i = 1; i <= 3; i++) for (const slug of ALL_COLLECTIONS) many[slug].push(`${slug}${i}`);
		// seven collections of four each, 28 saves: the lead is the first collection's four
		expect(readFor(many)?.body.startsWith("4 of your 28 picks are tech or AI names.")).toBe(true);
		expect(readFor(groups({ finance: Array.from({ length: 21 }, (_, i) => `F${i}`) }))?.body).toBe("All 21 of your picks are financial names. Your STAK skews steady.");
		expect(readFor(groups({ finance: Array.from({ length: 20 }, (_, i) => `F${i}`) }))?.body).toBe("All twenty of your picks are financial names. Your STAK skews steady.");
		expect(readFor(groups({ "ai-tech": ["T0"], finance: Array.from({ length: 21 }, (_, i) => `F${i}`) }))?.body.startsWith("21 of your 22 picks are financial names.")).toBe(true);
		// never a word beside a numeral, for any STAK of 2 to 60 saves
		const WORD = /(^|[^a-z])(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|both)([^a-z]|$)/i;
		for (let total = 2; total <= 60; total++) {
			for (const lead of [1, 2, Math.ceil(total / 2), total - 1, total]) {
				if (lead < 1 || lead > total) continue;
				const first = readFor(stak(Math.max(lead, total - lead), Math.min(lead, total - lead)))!.body.split(". ")[0]!;
				const hasWord = WORD.test(first);
				const hasNumeral = /[0-9]/.test(first);
				expect(hasWord && hasNumeral, first).toBe(false);
				expect(hasWord || hasNumeral, first).toBe(true);
			}
		}
	});
	it("agrees in the singular for a lead of one", () => {
		const r = readFor(groups({ "ai-tech": ["NVDA"], finance: ["JPM"], "green-energy": ["ENPH"], "real-estate": ["O"], healthcare: ["LLY"], consumer: ["COST"], other: ["XOM"] }));
		expect(r?.body).toBe("One of your seven picks is a tech or AI name. Your STAK skews high-growth, with a small hedge in finance.");
	});
	it("says both / all when the lead is the whole STAK", () => {
		expect(readFor(groups({ other: ["XOM", "BA"] }))?.body).toBe("Both of your picks are names outside the main sectors. Your STAK skews eclectic.");
		expect(readFor(groups({ finance: ["JPM", "V", "GS"] }))?.body).toBe("All three of your picks are financial names. Your STAK skews steady.");
	});
	it("reads the persona's saves in the frame's own voice", () => {
		const r = readFor(groups({ "ai-tech": ["MSFT", "AMD", "SNOW", "PLTR", "CRWD"], finance: ["JPM", "V", "BAC"], "green-energy": ["ENPH", "FSLR", "NEE"], "real-estate": ["O", "PLD"], healthcare: ["PFE", "LLY", "ABBV", "MRK"], consumer: ["COST", "TSLA"] }));
		expect(r).toEqual({
			title: "You lean into growth and tech.",
			body: "Five of your nineteen picks are tech or AI names. Your STAK skews high-growth, with a small hedge in real estate.",
		});
	});
	it("has nothing to read with nothing saved", () => {
		expect(readFor(groups({}))).toBeNull();
	});
});

describe("the controls that open today's deck follow its state (ST-20b, C-06)", () => {
	it("invite into the deck while a card is left", () => {
		expect(deckControl(12, DISCOVER_CTA.cta)).toEqual({ label: "Start swiping", to: "/discover", done: false });
		expect(deckControl(1, EMPTY.cta)).toEqual({ label: "Go to today’s deck", to: "/discover", done: false });
		expect(DISCOVER_CTA.body(8)).toBe("Based on your taste, 8 fresh picks are waiting in the deck.");
		expect(DISCOVER_CTA.body(1)).toBe("Based on your taste, 1 fresh pick is waiting in the deck.");
		expect(EMPTY.caption(3)).toBe("3 companies are waiting in today’s deck");
	});
	it("name and open the deck's receipt once it is done, under the site's one done sentence", () => {
		for (const label of [DISCOVER_CTA.cta, EMPTY.cta]) {
			const done = deckControl(0, label);
			expect(done).toEqual({ label: "See the recap", to: "/discover/end", done: true });
			expect(done.label).not.toMatch(/swip|today’s deck|Go to/i);
		}
		expect(DISCOVER_CTA.body(0)).toBe(PICKS_DONE);
		expect(EMPTY.caption(0)).toBe(PICKS_DONE);
		expect(DISCOVER_CTA.body(0)).toBe(EMPTY.caption(0));
	});
});

describe("best / worst and the range figures (mystak items 2 and 8)", () => {
	const day = (d: number, close: number): StockChartPoint => ({ ts: new Date(Date.UTC(2026, 6, d)).toISOString(), close });
	const today: TodayFigures = { avgChange: 2.4, best: { ticker: "NVDA", changePercent: 2.4 }, worst: { ticker: "NVDA", changePercent: 2.4 }, count: 1, live: false };
	it("hides best and worst until two saves have figures", () => {
		expect(showsBestWorst({ count: 1, best: today.best, worst: today.worst })).toBe(false);
		expect(showsBestWorst({ count: 2, best: { ticker: "A", changePercent: 1 }, worst: { ticker: "B", changePercent: -1 } })).toBe(true);
		expect(showsBestWorst({ count: 2, best: null, worst: null })).toBe(false);
	});
	it("takes 1D's figures from today's quotes and its line from the histories", () => {
		const f = rangeFigures("1D", [{ ticker: "NVDA", prices: [day(1, 100), day(2, 102.4)] }], false, today);
		expect(f).toMatchObject({ status: "ready", value: 2.4, count: 1, best: { ticker: "NVDA" } });
		expect(f.series).toHaveLength(2);
	});
	it("reads every other range from its histories, and waits while the API's closes are on their way", () => {
		const histories = [
			{ ticker: "AAA", prices: [day(1, 100), day(2, 110)] },
			{ ticker: "BBB", prices: [day(1, 100), day(2, 90)] },
		];
		const f = rangeFigures("1M", histories, false, today);
		expect(f.status).toBe("ready");
		expect(f.value).toBeCloseTo(0);
		expect([f.best?.ticker, f.worst?.ticker]).toEqual(["AAA", "BBB"]);
		expect(rangeFigures("1M", histories, true, today).status).toBe("loading");
		expect(rangeFigures("1Y", [], false, today).status).toBe("none");
	});
});

describe("removal (mystak items 5 and 9)", () => {
	const persona = ["MSFT", "AMD", "SNOW", "PLTR", "CRWD", "JPM", "V", "BAC", "ENPH", "FSLR", "NEE", "O", "PLD", "PFE", "LLY", "ABBV", "MRK", "COST", "TSLA"];
	it("is the plain unsave of a held stock outside the showcase", () => {
		expect(removalPlan("nvda", ["NVDA", "JPM"], { showcase: false, collection: "ai-tech" })).toEqual({ save: [], unsave: ["NVDA"] });
		expect(removalPlan("JPM", ["NVDA", "JPM"], { showcase: true, collection: "finance" })).toEqual({ save: [], unsave: ["JPM"] });
		expect(removalPlan("ZZZ", ["NVDA"], { showcase: false })).toEqual({ save: [], unsave: [] });
	});
	it("makes the showcase's AI & Tech page what the person saw, less the stock removed", () => {
		const plan = removalPlan("NVDA", persona, { showcase: true, collection: "ai-tech" });
		expect(plan.save).toEqual(["AAPL", "GOOGL"]);
		expect(plan.unsave.sort()).toEqual(["CRWD", "PLTR", "SNOW"]);
		const after = [...persona.filter((t) => !plan.unsave.includes(t)), ...plan.save];
		expect(inFrameOrder(groupByCollection(after)["ai-tech"], "ai-tech")).toEqual(["AAPL", "MSFT", "GOOGL", "AMD"]);
		// removing one the persona really holds (MSFT) leaves the frame's other four
		const msft = removalPlan("MSFT", persona, { showcase: true, collection: "ai-tech" });
		expect(msft.save).toEqual(["NVDA", "AAPL", "GOOGL"]);
		expect(msft.unsave.sort()).toEqual(["CRWD", "MSFT", "PLTR", "SNOW"]);
	});
	it("orders a collection by the frame's list first, then the rest in save order", () => {
		expect(inFrameOrder(["CRWD", "AMD", "NVDA"], "ai-tech")).toEqual(["NVDA", "AMD", "CRWD"]);
		expect(inFrameOrder(["JPM", "V"], "finance")).toEqual(["JPM", "V"]);
	});
	it("writes the plan through the live actions and clears the deck's saved mark", async () => {
		const calls: string[] = [];
		let deck = { date: "d", theme: "t", order: ["NVDA"], index: 1, saved: ["NVDA", "JPM"], passed: [], bought: [] };
		const live = {
			saves: [{ ticker: "NVDA", savedAt: 0, priceAtSave: null }],
			deck,
			actions: {
				save: async (t: string) => void calls.push(`save ${t}`),
				unsave: async (t: string) => void calls.push(`unsave ${t}`),
				setDeck: (fn: unknown) => {
					deck = (fn as (p: typeof deck) => typeof deck)(deck);
					calls.push("deck");
				},
			},
		} as unknown as Parameters<typeof removeFromStak>[0];
		await removeFromStak(live, "NVDA", { showcase: false, collection: "ai-tech" });
		expect(calls).toEqual(["unsave NVDA", "deck"]);
		expect(deck.saved).toEqual(["JPM"]);
	});
});

describe("collectionBack (D2: the collection page's Back, review 1's loop)", () => {
	it("steps back to the overview that opened the page, whatever the browser can tell about the entry before", () => {
		expect(collectionBack(true, null)).toEqual({ step: true, toOverview: true });
		expect(collectionBack(true, "/my-stak")).toEqual({ step: true, toOverview: true });
		expect(FROM_OVERVIEW).toEqual({ mystakFromOverview: true });
	});
	it("steps back to another of the app's pages before it, named plain Back, and to the overview by its name", () => {
		expect(collectionBack(false, "/home")).toEqual({ step: true, toOverview: false });
		expect(collectionBack(false, "/news/fed-minutes")).toEqual({ step: true, toOverview: false });
		expect(collectionBack(false, "/my-stak")).toEqual({ step: true, toOverview: true });
		expect(collectionBack(false, "/my-stak/")).toEqual({ step: true, toOverview: true });
	});
	it("never steps back to a stock page (only the stock's own Back pushes a collection, so stepping back would loop): on to the overview", () => {
		expect(collectionBack(false, "/stocks/JPM")).toEqual({ step: false, toOverview: true });
		expect(collectionBack(false, "/stocks")).toEqual({ step: false, toOverview: true });
	});
	it("goes to the overview, the natural parent, with nothing before it, a page outside the shell, or a browser that cannot tell", () => {
		expect(collectionBack(false, null)).toEqual({ step: false, toOverview: true });
		expect(collectionBack(false, "/login")).toEqual({ step: false, toOverview: true });
		expect(collectionBack(false, "/onboarding")).toEqual({ step: false, toOverview: true });
		expect(collectionBack(false, "/")).toEqual({ step: false, toOverview: true });
	});
});
