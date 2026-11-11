import { beforeAll, describe, expect, it } from "vitest";
import { marketMood } from "@/app/data/home";
import { BRIEF_COMPANIES } from "@/app/live/brief";
import { companyInitial, financialsOf, loadCatalog } from "@/app/live/catalog";
import { FRAME_NOW } from "@/app/live/clock";
import { DEMO_QUOTES } from "@/app/live/demoQuotes";
import { ARTICLE_HERO, ARTICLES, articleById, bylineOf, HOME_ARTICLES, heroOf, readNextOf, STORIES } from "../articles";
import { article as apple, listingDate, newsListing } from "../data";

// the files under public/ (Vite lists them when it transforms this test; nothing is imported)
const PUBLIC_FILES = new Set(Object.keys(import.meta.glob("/public/figma/news/*")).map((p) => p.replace(/^\/public/, "")));

const listed = [newsListing.mini, ...newsListing.forYou.cards, ...newsListing.markets.cards];

describe("every story of the listing opens its own article", () => {
	it("each card, the Mini story and each brief resolve to an article titled as the listing titles them", () => {
		for (const story of [...newsListing.briefs, ...listed]) {
			const a = articleById(story.id);
			expect(a, story.id).toBeDefined();
			expect(a?.title).toBe(story.title);
		}
	});

	it("an id no story has resolves to nothing (the route answers with the 404)", () => {
		expect(articleById("no-such-story")).toBeUndefined();
		expect(articleById("")).toBeUndefined();
		expect(articleById("APPLE-FOLDABLE")).toBeUndefined();
	});

	it("the brief's three items are the Dow brief, the Fed minutes and the June jobs story, each with its article", () => {
		expect(newsListing.briefs.map((b) => b.id)).toEqual(["dow-record-chips", "fed-minutes", "june-jobs-miss"]);
		expect(newsListing.briefs.map((b) => articleById(b.id)?.title)).toEqual([
			"Dow closes at a record as chips slide",
			"Fed minutes land Wednesday",
			"June jobs miss eases Fed hike bets",
		]);
		// item 2 is the Mini story, item 3 the first Markets card: the same articles
		expect(newsListing.briefs[1]?.id).toBe(newsListing.mini.id);
		expect(newsListing.briefs[2]?.id).toBe(newsListing.markets.cards[0]?.id);
		// the brief's first item is the frame's own copy (2:4372)
		expect(newsListing.briefs[0]).toMatchObject({ kicker: "TODAY’S BRIEF", read: "Read", source: "Bloomberg · 10h" });
		expect(newsListing.briefs[0]?.dek.endsWith("eased the pressure on the...")).toBe(true);
		for (const b of newsListing.briefs) expect(b.dek.endsWith("...")).toBe(true);
	});

	it("there is one article per story, eight in all, in the listing's order", () => {
		expect(ARTICLES.map((a) => a.id)).toEqual(STORIES.map((s) => s.id));
		expect(new Set(ARTICLES.map((a) => a.id)).size).toBe(8);
	});

	it("a card names its article's company, so its tag follows the save the article makes", () => {
		for (const card of [...newsListing.forYou.cards, ...newsListing.markets.cards]) {
			expect(card.ticker, card.id).toBe(articleById(card.id)?.ticker.symbol);
		}
	});

	it("an article's category is the one its card gives the story (the Mini card's MARKETS kicker)", () => {
		expect(articleById(newsListing.mini.id)?.category.toUpperCase()).toBe(newsListing.mini.kicker);
	});
});

describe("the Figma article is the template", () => {
	it("the Apple article is the frame's own record, unchanged", () => {
		expect(articleById("apple-foldable")).toBe(apple);
	});

	it("every article has the template's structure and shared copy", () => {
		const labels = apple.keyStats.rows.map((row) => row.map((c) => c.label));
		for (const a of ARTICLES) {
			expect(Object.keys(a).filter((k) => k !== "readNext").sort(), a.id).toEqual(Object.keys(apple).filter((k) => k !== "readNext").sort());
			expect(a.breadcrumb).toBe(apple.breadcrumb);
			expect(a.gistTitle).toBe(apple.gistTitle);
			expect(a.gist).toHaveLength(3);
			expect(a.paragraphs1).toHaveLength(2);
			expect(a.paragraphs2).toHaveLength(2);
			expect(a.newToThis.title).toBe(apple.newToThis.title);
			expect(a.sourceLabel).toBe(apple.sourceLabel);
			expect(a.savedToast).toBe(apple.savedToast);
			expect(a.addToStak).toBe(apple.addToStak);
			expect(a.readNext.kicker).toBe(apple.readNext.kicker);
			expect(a.keyStats.title).toBe(apple.keyStats.title);
			expect(a.keyStats.rows.map((row) => row.map((c) => c.label))).toEqual(labels);
			// on the frames' own Saturday (July 4) every byline is dated inside the listing's week
			expect(bylineOf(a, FRAME_NOW)).toMatch(/^(Bloomberg|Reuters|CNBC) · Jul [1-4] · 3 min read$/);
			expect(a.publisher.startsWith(a.publisherInitial)).toBe(true);
			expect(a.readTime).toBe(apple.readTime);
			expect(a.ticker.viewInStak).toBe(`View ${a.ticker.symbol} in My STAK`);
			expect(a.ticker.change).toMatch(/^[+-]\d+\.\d\d% today$/);
			// the pull quote is lifted from the story, as Apple's is
			const body = [...a.paragraphs1, ...a.paragraphs2].join(" ");
			expect(body.includes(a.quote.replace(/\.$/, "")), a.id).toBe(true);
		}
	});

	it("the copy keeps Apple's lengths (within 15 %), so the frame's layout holds", () => {
		const near = (n: number, ref: number) => Math.abs(n - ref) / ref <= 0.15;
		for (const a of ARTICLES) {
			expect(near(a.dek.length, apple.dek.length), `${a.id} dek`).toBe(true);
			expect(near(a.quote.length, apple.quote.length), `${a.id} quote`).toBe(true);
			expect(near(a.newToThis.body.length, apple.newToThis.body.length), `${a.id} new to this`).toBe(true);
			a.gist.forEach((g, i) => expect(near(g.length, apple.gist[i]!.length), `${a.id} gist ${i}`).toBe(true));
			a.paragraphs1.forEach((p, i) => expect(near(p.length, apple.paragraphs1[i]!.length), `${a.id} p1 ${i}`).toBe(true));
			a.paragraphs2.forEach((p, i) => expect(near(p.length, apple.paragraphs2[i]!.length), `${a.id} p2 ${i}`).toBe(true));
		}
	});
});

describe("Read next", () => {
	it("shows the next two stories of the listing, wrapping round", () => {
		expect(readNextOf("dow-record-chips").map((s) => s.id)).toEqual(["fed-minutes", "nvidia-chip-rally"]);
		expect(readNextOf("apple-foldable").map((s) => s.id)).toEqual(["tesla-deliveries", "june-jobs-miss"]);
		expect(readNextOf("memory-chips-soar").map((s) => s.id)).toEqual(["oil-slips-iran", "dow-record-chips"]);
		expect(readNextOf("oil-slips-iran").map((s) => s.id)).toEqual(["dow-record-chips", "fed-minutes"]);
		expect(readNextOf("no-such-story")).toEqual([]);
	});

	it("draws each story as the listing does (its source line and title) and every one opens an article", () => {
		for (const a of ARTICLES) {
			for (const s of readNextOf(a.id)) {
				expect(articleById(s.id)?.title).toBe(s.title);
				expect(s.id).not.toBe(a.id);
			}
		}
		expect(readNextOf("oil-slips-iran")[0]).toEqual({ id: "dow-record-chips", title: "Dow closes at a record as chips slide", source: "Bloomberg · 10h" });
	});
});

describe("the hero", () => {
	it("is Figma's illustration for Apple and a photo from the listing for every other story", () => {
		expect(heroOf("apple-foldable")).toEqual({ kind: "illustration" });
		const thumbs = new Set(listed.filter((c) => "thumb" in c).map((c) => (c as { thumb: string }).thumb));
		for (const a of ARTICLES) {
			const art = ARTICLE_HERO[a.id];
			expect(art, a.id).toBeDefined();
			if (art?.kind !== "photo") continue;
			expect(thumbs.has(art.src), a.id).toBe(true);
			expect(PUBLIC_FILES.has(art.src), art.src).toBe(true);
		}
		// a card's article shows that card's own photo
		for (const c of [...newsListing.forYou.cards, ...newsListing.markets.cards]) {
			const art = heroOf(c.id);
			if (art.kind === "photo") expect(art.src).toBe(c.thumb);
		}
	});
});

describe("the rail's showcase figures", () => {
	beforeAll(() => loadCatalog());

	it("name a catalog company for every story", () => {
		for (const a of ARTICLES) expect(financialsOf(a.ticker.symbol), a.ticker.symbol).toBeDefined();
		expect(Object.fromEntries(ARTICLES.map((a) => [a.id, a.ticker.symbol]))).toEqual({
			"dow-record-chips": "GS",
			"fed-minutes": "JPM",
			"nvidia-chip-rally": "NVDA",
			"apple-foldable": "AAPL",
			"tesla-deliveries": "TSLA",
			"june-jobs-miss": "O",
			"memory-chips-soar": "MU",
			"oil-slips-iran": "XOM",
		});
	});

	it("name a company with a demo quote, so View <SYMBOL> in My STAK has a price and figures while the API is down", () => {
		for (const a of ARTICLES) expect(DEMO_QUOTES[a.ticker.symbol], a.ticker.symbol).toBeDefined();
	});

	it("show the app's demo quote for the two whole-market stories' companies (Goldman Sachs, Realty Income), as their stock page does", () => {
		for (const id of ["dow-record-chips", "june-jobs-miss"]) {
			const a = articleById(id)!;
			const q = DEMO_QUOTES[a.ticker.symbol]!;
			expect(a.ticker.price, id).toBe(`$${q.price.toFixed(2)}`);
			expect(a.ticker.change, id).toBe(`${q.changePercent < 0 ? "-" : "+"}${Math.abs(q.changePercent).toFixed(2)}% today`);
		}
	});

	it("name each company in one style, as the frame names Apple Inc.", () => {
		for (const a of ARTICLES) expect(a.ticker.name, a.id).toMatch(/ (Inc\.|Corp\.|& Co\.)$/);
	});

	it("take market cap, P/E and dividend yield from the catalog's snapshot, formatted like the frame's Apple rows", () => {
		const cap = (v: string) => (v.startsWith("$") ? v : `$${v}`).replace(/\s*AUM$/, "");
		const pe = (v: string) => Number(v).toFixed(1);
		const yld = (v: string) => `${Number(v.replace("%", "")).toFixed(2)}%`;
		for (const a of ARTICLES) {
			if (a === apple) continue; // the frame's own figures
			const fin = financialsOf(a.ticker.symbol)!;
			const [[c, p], , [, y]] = a.keyStats.rows as unknown as [[{ value: string }, { value: string }], unknown, [unknown, { value: string }]];
			// Nvidia's cap is the one the Apple frame's copy fixes (next test)
			if (a.ticker.symbol !== "NVDA") expect(c.value, a.id).toBe(cap(fin.marketCap.value));
			expect(p.value, a.id).toBe(pe(fin.peRatio.value));
			expect(y.value, a.id).toBe(yld(fin.dividendYield.value));
		}
	});

	it("put Apple about 4% from passing Nvidia, as the Apple frame's copy says", () => {
		const trillions = (id: string) => Number(articleById(id)!.keyStats.rows[0]![0]!.value.replace(/^\$|T$/g, ""));
		expect(apple.gist[2]).toContain("about 4% from passing Nvidia");
		const gap = trillions("nvidia-chip-rally") / trillions("apple-foldable") - 1;
		expect(gap).toBeGreaterThan(0.035);
		expect(gap).toBeLessThan(0.045);
	});

	it("keep the showcase price inside the authored day range", () => {
		const n = (v: string) => Number(v.replace(/[$,]/g, ""));
		for (const a of ARTICLES) {
			const day = a.keyStats.rows[1]![0]!.value.split("–").map(n);
			const wk = a.keyStats.rows[2]![0]!.value.split("–").map(n);
			const price = n(a.ticker.price);
			expect(price, a.id).toBeGreaterThanOrEqual(day[0]!);
			expect(price, a.id).toBeLessThanOrEqual(day[1]!);
			expect(day[1]!, a.id).toBeLessThanOrEqual(wk[1]!);
			expect(day[0]!, a.id).toBeGreaterThanOrEqual(wk[0]!);
		}
	});
});

describe("Home's Market Mood stories open their own articles (D12)", () => {
	const fear = () => articleById("fear-gauge-32")!;
	const ipo = () => articleById("openai-ipo-delayed")!;

	it("each story card names an article titled as the card titles it: two new ones and the listing's Fed minutes", () => {
		expect(marketMood.deck.map((s) => s.id)).toEqual(["fear-gauge-32", "fed-minutes", "openai-ipo-delayed"]);
		for (const story of marketMood.deck) expect(articleById(story.id), story.id).toBeDefined();
		expect(fear().title).toBe(marketMood.deck[0].title);
		expect(ipo().title).toBe(marketMood.deck[2].title);
		// the Fed notes story opens the listing's own Fed minutes article (the card's "July 8" is its Wednesday)
		expect(articleById(marketMood.deck[1].id)).toBe(ARTICLES[1]);
		expect(HOME_ARTICLES.map((a) => a.id)).toEqual(["fear-gauge-32", "openai-ipo-delayed"]);
	});

	it("stay out of the listing: its stories, its articles and its search keep their eight", () => {
		const ids = HOME_ARTICLES.map((a) => a.id);
		expect(ARTICLES).toHaveLength(8);
		expect(STORIES).toHaveLength(8);
		for (const id of ids) {
			expect(ARTICLES.some((a) => a.id === id), id).toBe(false);
			expect(STORIES.some((s) => s.id === id), id).toBe(false);
			expect([...newsListing.briefs, newsListing.mini, ...newsListing.forYou.cards, ...newsListing.markets.cards].some((s) => s.id === id), id).toBe(false);
		}
	});

	it("take their category and byline from the card (publisher, Friday July 3, 3 min read)", () => {
		expect(fear()).toMatchObject({ category: "Markets", publisher: "CNN Business", publisherInitial: "C" });
		expect(ipo()).toMatchObject({ category: "Tech & Ai", publisher: "Bloomberg", publisherInitial: "B" });
		expect(bylineOf(fear(), FRAME_NOW)).toBe("CNN Business · Jul 3 · 3 min read");
		expect(bylineOf(ipo(), FRAME_NOW)).toBe("Bloomberg · Jul 3 · 3 min read");
		marketMood.deck.forEach((story) => {
			const a = articleById(story.id)!;
			expect(a.publisher, story.id).toBe(story.source.split(" · ")[0]);
		});
		expect(fear().sourceUrl).toBe("https://www.cnn.com/business");
		expect(ipo().sourceUrl).toBe("https://www.bloomberg.com");
	});

	it("follow the template: its structure, its shared copy and Apple's lengths (within 15 %)", () => {
		const near = (n: number, ref: number) => Math.abs(n - ref) / ref <= 0.15;
		const labels = apple.keyStats.rows.map((row) => row.map((c) => c.label));
		for (const a of HOME_ARTICLES) {
			expect(Object.keys(a).filter((k) => k !== "readNext").sort(), a.id).toEqual(Object.keys(apple).filter((k) => k !== "readNext").sort());
			expect(a).toMatchObject({ breadcrumb: apple.breadcrumb, gistTitle: apple.gistTitle, sourceLabel: apple.sourceLabel, savedToast: apple.savedToast, addToStak: apple.addToStak });
			expect(a.readNext.kicker).toBe(apple.readNext.kicker);
			expect(a.newToThis.title).toBe(apple.newToThis.title);
			expect(a.keyStats.title).toBe(apple.keyStats.title);
			expect(a.keyStats.rows.map((row) => row.map((c) => c.label))).toEqual(labels);
			expect(a.gist).toHaveLength(3);
			expect(a.paragraphs1).toHaveLength(2);
			expect(a.paragraphs2).toHaveLength(2);
			expect(near(a.dek.length, apple.dek.length), `${a.id} dek`).toBe(true);
			expect(near(a.quote.length, apple.quote.length), `${a.id} quote`).toBe(true);
			expect(near(a.newToThis.body.length, apple.newToThis.body.length), `${a.id} new to this`).toBe(true);
			a.gist.forEach((g, i) => expect(near(g.length, apple.gist[i]!.length), `${a.id} gist ${i}`).toBe(true));
			a.paragraphs1.forEach((p, i) => expect(near(p.length, apple.paragraphs1[i]!.length), `${a.id} p1 ${i}`).toBe(true));
			a.paragraphs2.forEach((p, i) => expect(near(p.length, apple.paragraphs2[i]!.length), `${a.id} p2 ${i}`).toBe(true));
			// the pull quote is lifted from the story, as Apple's is
			expect([...a.paragraphs1, ...a.paragraphs2].join(" ").includes(a.quote.replace(/\.$/, "")), a.id).toBe(true);
		}
	});

	it("explain the term the story turns on in 'New to this?' (the Fear & Greed Index; an IPO)", () => {
		expect(fear().newToThis.body).toMatch(/^The Fear & Greed Index is /);
		expect(ipo().newToThis.body).toMatch(/^An IPO, or initial public offering, is /);
		// each dek carries on from its card's teaser
		expect(fear().dek).toMatch(/32, firmly in Fear/);
		expect(fear().dek).toMatch(/high-growth names/);
		expect(ipo().dek).toMatch(/most anticipated listing/);
		expect(ipo().dek).toMatch(/IPO excitement/);
	});

	it("read on into the other two Home stories, every one opening its article", () => {
		expect(readNextOf("fear-gauge-32").map((s) => s.id)).toEqual(["fed-minutes", "openai-ipo-delayed"]);
		expect(readNextOf("openai-ipo-delayed").map((s) => s.id)).toEqual(["fear-gauge-32", "fed-minutes"]);
		for (const a of HOME_ARTICLES) {
			for (const s of readNextOf(a.id)) {
				expect(articleById(s.id)?.title, s.id).toBe(s.title);
				expect(s.id).not.toBe(a.id);
				expect(s.source).toMatch(/^(CNN Business|Reuters|Bloomberg) · \d+[hd]$/);
			}
		}
		// the Fed minutes card reads as the listing names it; the listing's own articles keep the listing's Read next
		expect(readNextOf("fear-gauge-32")[0]).toEqual(STORIES.find((s) => s.id === "fed-minutes"));
		expect(readNextOf("fed-minutes").map((s) => s.id)).toEqual(["nvidia-chip-rally", "apple-foldable"]);
	});

	it("draw a borrowed listing photo as the hero, marked with the story it comes from (never generated)", () => {
		const thumbs = new Set(listed.filter((c) => "thumb" in c).map((c) => (c as { thumb: string }).thumb));
		const expected: Record<string, string> = { "fear-gauge-32": "memory-chips-soar", "openai-ipo-delayed": "nvidia-chip-rally" };
		for (const a of HOME_ARTICLES) {
			const art = heroOf(a.id);
			expect(art.kind, a.id).toBe("photo");
			if (art.kind !== "photo") continue;
			expect(art.borrowedFrom, a.id).toBe(expected[a.id]);
			expect(thumbs.has(art.src), a.id).toBe(true);
			expect(PUBLIC_FILES.has(art.src), art.src).toBe(true);
			// the very photo of the story it is borrowed from
			const own = heroOf(art.borrowedFrom!);
			expect(own.kind === "photo" && own.src, a.id).toBe(art.src);
		}
	});

	describe("their rail: a company the copy names", () => {
		beforeAll(() => loadCatalog());

		it("KO for the fear gauge (the defensive name the money moved into), MSFT for the OpenAI IPO (its largest backer)", () => {
			// the coin wears the ticker's letter ("K" beside KO; it read the name's "C": N30.8r)
			expect(fear().ticker).toMatchObject({ initial: "K", name: "Coca-Cola Co.", symbol: "KO", viewInStak: "View KO in My STAK" });
			expect(ipo().ticker).toMatchObject({ initial: "M", name: "Microsoft Corp.", symbol: "MSFT", viewInStak: "View MSFT in My STAK" });
			expect(fear().chip).toBe("Coca-Cola");
			expect(ipo().chip).toBe("Microsoft");
			for (const a of HOME_ARTICLES) {
				const body = [a.dek, ...a.gist, ...a.paragraphs1, ...a.paragraphs2].join(" ");
				expect(body.includes(a.chip), a.id).toBe(true);
			}
		});

		it("with a catalog entry and a demo quote, its showcase figures being that quote (so the stock page agrees)", () => {
			for (const a of HOME_ARTICLES) {
				expect(financialsOf(a.ticker.symbol), a.ticker.symbol).toBeDefined();
				const q = DEMO_QUOTES[a.ticker.symbol]!;
				expect(q, a.ticker.symbol).toBeDefined();
				expect(a.ticker.price, a.id).toBe(`$${q.price.toFixed(2)}`);
				expect(a.ticker.change, a.id).toBe(`${q.changePercent < 0 ? "-" : "+"}${Math.abs(q.changePercent).toFixed(2)}% today`);
			}
			expect(fear().ticker.price).toBe("$63.20");
			expect(ipo().ticker.price).toBe("$438.20");
		});

		it("market cap, P/E and dividend yield from the catalog's snapshot, the price inside the authored ranges", () => {
			const cap = (v: string) => (v.startsWith("$") ? v : `$${v}`).replace(/\s*AUM$/, "");
			const pe = (v: string) => Number(v).toFixed(1);
			const yld = (v: string) => `${Number(v.replace("%", "")).toFixed(2)}%`;
			const n = (v: string) => Number(v.replace(/[$,]/g, ""));
			for (const a of HOME_ARTICLES) {
				const fin = financialsOf(a.ticker.symbol)!;
				const [[c, p], [d], [w, y]] = a.keyStats.rows as unknown as [[{ value: string }, { value: string }], [{ value: string }], [{ value: string }, { value: string }]];
				expect(c.value, a.id).toBe(cap(fin.marketCap.value));
				expect(p.value, a.id).toBe(pe(fin.peRatio.value));
				expect(y.value, a.id).toBe(yld(fin.dividendYield.value));
				const day = d.value.split("–").map(n);
				const wk = w.value.split("–").map(n);
				const price = n(a.ticker.price);
				expect(price, a.id).toBeGreaterThanOrEqual(day[0]!);
				expect(price, a.id).toBeLessThanOrEqual(day[1]!);
				expect(day[0]!, a.id).toBeGreaterThanOrEqual(wk[0]!);
				expect(day[1]!, a.id).toBeLessThanOrEqual(wk[1]!);
			}
		});
	});
});

describe("the dates are the clock's (the hunt's NUM-07; N23d, N30.3b: the phones' StakClock)", () => {
	const at = (y: number, m: number, d: number, h = 9, min = 41) => new Date(y, m - 1, d, h, min).getTime();
	const MONDAY = at(2026, 11, 9);
	const all = [...ARTICLES, ...HOME_ARTICLES];

	it("the listing's date line is today: the frame's own string on the frame's day", () => {
		expect(listingDate(FRAME_NOW)).toBe("Saturday, July 4");
		expect(listingDate(MONDAY)).toBe("Monday, November 9");
		expect(listingDate(at(2026, 12, 31, 23, 30))).toBe("Thursday, December 31");
		expect(listingDate(at(2027, 1, 1, 0, 5))).toBe("Friday, January 1");
		// no literal date is left on the listing's record
		expect("date" in newsListing).toBe(false);
	});

	it("on the frames' Saturday every byline is the string its record was written with (Apple's is Figma's 2:4584)", () => {
		expect(bylineOf(apple, FRAME_NOW)).toBe("Bloomberg · Jul 2 · 3 min read");
		expect(Object.fromEntries(all.map((a) => [a.id, bylineOf(a, FRAME_NOW)]))).toEqual({
			"dow-record-chips": "Bloomberg · Jul 3 · 3 min read",
			"fed-minutes": "Reuters · Jul 4 · 3 min read",
			"nvidia-chip-rally": "Reuters · Jul 2 · 3 min read",
			"apple-foldable": "Bloomberg · Jul 2 · 3 min read",
			"tesla-deliveries": "CNBC · Jul 2 · 3 min read",
			"june-jobs-miss": "Reuters · Jul 2 · 3 min read",
			"memory-chips-soar": "Bloomberg · Jul 2 · 3 min read",
			"oil-slips-iran": "Reuters · Jul 1 · 3 min read",
			"fear-gauge-32": "CNN Business · Jul 3 · 3 min read",
			"openai-ipo-delayed": "Bloomberg · Jul 3 · 3 min read",
		});
	});

	it("on any other day a byline is dated from the story's age: two days old is the day before yesterday", () => {
		expect(bylineOf(apple, MONDAY)).toBe("Bloomberg · Nov 7 · 3 min read");
		expect(bylineOf(articleById("fed-minutes")!, MONDAY)).toBe("Reuters · Nov 9 · 3 min read"); // "2h": today
		expect(bylineOf(articleById("dow-record-chips")!, MONDAY)).toBe("Bloomberg · Nov 8 · 3 min read"); // "10h" at 09:41: last night
		expect(bylineOf(articleById("oil-slips-iran")!, MONDAY)).toBe("Reuters · Nov 6 · 3 min read");
		// across a month's and a year's end, late in the evening too
		expect(bylineOf(apple, at(2026, 12, 1, 23, 55))).toBe("Bloomberg · Nov 29 · 3 min read");
		expect(bylineOf(apple, at(2027, 1, 1, 0, 5))).toBe("Bloomberg · Dec 30 · 3 min read");
		// the default is the real clock: never a frozen July date outside July
		const today = new Date();
		if (today.getMonth() !== 6) expect(bylineOf(apple)).not.toContain("Jul");
	});

	it("a story has ONE age: the card's source line and its article's byline are dated from the same one", () => {
		// every card that opens an article: the three briefs, the Mini story, the six cards, and each Read next card
		for (const story of [...newsListing.briefs, ...listed, ...STORIES]) {
			const a = articleById(story.id)!;
			expect(story.source, story.id).toBe(`${a.publisher} · ${a.age}`);
		}
		for (const a of all) expect(a.age, a.id).toMatch(/^\d+[hd]$/);
		// Home's two stories as Read next draws them
		const homeCards = [...readNextOf("fear-gauge-32"), ...readNextOf("openai-ipo-delayed")];
		for (const a of HOME_ARTICLES) expect(homeCards.find((s) => s.id === a.id)?.source, a.id).toBe(`${a.publisher} · ${a.age}`);
		// the Dow brief's card keeps the frame's "Bloomberg · 10h" (2:4372) and its article carries that very age
		expect(newsListing.briefs[0]!.source).toBe("Bloomberg · 10h");
		expect(articleById("dow-record-chips")).toMatchObject({ publisher: "Bloomberg", age: "10h" });
	});

	it("the Dow brief's '10h' and its article name the same day at any hour (the review of 2026-11-09; the phones date the article a day back)", () => {
		const dow = articleById("dow-record-chips")!;
		// the frames' 09:41 morning: ten hours back is Friday night, the frame's "Jul 3"
		expect(new Date(FRAME_NOW - 10 * 3_600_000).getDate()).toBe(3);
		expect(bylineOf(dow, FRAME_NOW)).toBe("Bloomberg · Jul 3 · 3 min read");
		// Monday, November 9: before ten the story is last night's, from ten on it is today's (it read "Nov 8" all day)
		expect(bylineOf(dow, at(2026, 11, 9, 0, 20))).toBe("Bloomberg · Nov 8 · 3 min read");
		expect(bylineOf(dow, at(2026, 11, 9, 9, 59))).toBe("Bloomberg · Nov 8 · 3 min read");
		expect(bylineOf(dow, at(2026, 11, 9, 10, 0))).toBe("Bloomberg · Nov 9 · 3 min read");
		expect(bylineOf(dow, at(2026, 11, 9, 18, 12))).toBe("Bloomberg · Nov 9 · 3 min read");
		expect(bylineOf(dow, at(2026, 11, 9, 23, 59))).toBe("Bloomberg · Nov 9 · 3 min read");
		// across a month's and a year's end
		expect(bylineOf(dow, at(2026, 12, 1, 9, 41))).toBe("Bloomberg · Nov 30 · 3 min read");
		expect(bylineOf(dow, at(2027, 1, 1, 0, 5))).toBe("Bloomberg · Dec 31 · 3 min read");
		// at every hour of a day the article's date is the day the card's "10h" points back to
		for (let h = 0; h < 24; h++) {
			const now = at(2026, 11, 9, h, 30);
			const then = new Date(now - 10 * 3_600_000);
			const day = then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
			expect(bylineOf(dow, now), `${h}:30`).toBe(`Bloomberg · ${day} · 3 min read`);
		}
		// the Mini story's "2h" follows the same rule: just after midnight it is still yesterday's
		expect(bylineOf(articleById("fed-minutes")!, at(2026, 11, 9, 0, 20))).toBe("Reuters · Nov 8 · 3 min read");
		expect(bylineOf(articleById("fed-minutes")!, at(2026, 11, 9, 2, 0))).toBe("Reuters · Nov 9 · 3 min read");
	});
});

describe("the ticker card's coin wears the ticker's first letter (N30.8r, the hunt's VIS-06: one rule for every coin)", () => {
	const all = [...ARTICLES, ...HOME_ARTICLES];

	it("every record's coin letter is its symbol's first letter, the shared rule of the catalog (companyInitial)", () => {
		for (const a of all) {
			expect(a.ticker.initial, a.id).toBe(a.ticker.symbol.charAt(0));
			expect(a.ticker.initial, a.id).toBe(companyInitial(a.ticker.symbol));
			expect(a.ticker.initial, a.id).toMatch(/^[A-Z]$/);
		}
	});

	it("where the ticker and the name start differently the coin follows the ticker: O, XOM, KO (they read R, E, C)", () => {
		expect(Object.fromEntries(all.map((a) => [a.ticker.symbol, a.ticker.initial]))).toEqual({
			GS: "G",
			JPM: "J",
			NVDA: "N",
			AAPL: "A",
			TSLA: "T",
			O: "O",
			MU: "M",
			XOM: "X",
			KO: "K",
			MSFT: "M",
		});
		// the frame's own card is untouched: Apple's coin is the frame's "A"
		expect(apple.ticker.initial).toBe("A");
	});
});

describe("the daily brief's companies (the inbox counts the stories that touch the person's saves)", () => {
	it("the live layer's list is the listing's three briefs and each story's own company", () => {
		// src/app/live/brief.ts keeps this list so the live layer imports nothing from News (N32e): a change of the brief's
		// stories or of a story's company must fail here, in News, as well as in the live layer's own test
		expect(BRIEF_COMPANIES).toEqual(newsListing.briefs.map((b) => ({ story: b.id, ticker: articleById(b.id)!.ticker.symbol })));
	});
});
