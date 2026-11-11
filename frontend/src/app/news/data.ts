import { todayLong } from "@/app/live/clock";
import { N } from "./assets";

/**
 * News listing (Figma 2:4359) and article detail (2:4453 / 2:4555) — copy verbatim. `ticker` is the story's related
 * company, the one its article's rail shows and saves; `tag` is what its pill says once the frame's showcase is over
 * (see TAGS). Every story opens its own article (src/app/news/articles.ts, keyed by `id`; the user's ruling of 2026-11-01).
 *
 * THE DATES ARE THE CLOCK'S (the hunt's NUM-07, the coordinator's N23d / N30.3b; src/app/live/clock.ts, a mirror of the
 * phones' StakClock): the listing's date line is today (`listingDate`; android ui/news/NewsScreen.kt:114
 * `StakClock.todayLong()`, iOS NewsView.swift:69), a story's age is authored as an age ("2d", "10h": it is always that
 * old, as the phones author theirs, android ui/news/NewsArticleFeed.kt:141 `age = "2d"`), and an article's byline is
 * dated from its age (src/app/news/articles.ts `bylineOf`). On the frames' own morning (clock.ts FRAME_NOW: Saturday,
 * July 4, 2026) every one of them reads exactly what Figma prints: "Saturday, July 4", "Bloomberg · Jul 2 · 3 min read".
 */
export type NewsCardData = { id: string; tag: string; title: string; source: string; thumb: string; ticker?: string };

/** One item of the Today's brief carousel ("Todays brief" 2:4372): its story's `id`, and the card's copy. */
export type BriefData = { id: string; kicker: string; title: string; dek: string; read: string; source: string };

export const CHEVRON = "›";

/**
 * The pill copy Figma draws on news stories: "In your STAK" (every desktop card, 2:4412 ...; the phone's cards too) and
 * "Markets" (the phone's "Tag" 1:1216 on its Fed minutes story tile). The frame's own state shows "In your STAK" on
 * all six cards; after the visitor's first action (the showcase rule) a story keeps it only when its company is in the
 * person's STAK, and every other story wears Figma's general news tag instead.
 */
export const TAGS = { inYourStak: "In your STAK", other: "Markets" } as const;

/**
 * The listing's date line (2:4365; the frame prints its own day, "Saturday, July 4"): today, for every visitor, the
 * showcase included (N23d), as both phones print it. `now` pins the day for a test.
 */
export const listingDate = (now?: number): string => todayLong(now);

export const newsListing = {
	title: "News",
	/**
	 * The Today's brief card pages through three briefs, one every 25 s (its three dots; the user's ruling of
	 * 2026-11-01): the Dow brief exactly as the frame draws it, then the day's other two macro stories, the frame's Mini
	 * story (the Fed minutes) and the June jobs card. Their deks are written to the Dow dek's length and end the way it
	 * does ("..."). The Mini card leaves these three to the brief (hot.ts).
	 */
	briefs: [
		{
			id: "dow-record-chips",
			kicker: "TODAY’S BRIEF",
			title: "Dow closes at a record as chips slide",
			dek: "Wall Street split into the long weekend. The Dow hit an all time high while a memory chip rout pulled the Nasdaq down, and a soft jobs report eased the pressure on the...",
			read: "Read",
			source: "Bloomberg · 10h",
		},
		{
			id: "fed-minutes",
			kicker: "TODAY’S BRIEF",
			title: "Fed minutes land Wednesday",
			dek: "The Fed publishes the minutes of its June meeting on Wednesday. Traders want to know how many officials pushed for a rate hike, and how a weak jobs report changes the...",
			read: "Read",
			source: "Reuters · 2h",
		},
		{
			id: "june-jobs-miss",
			kicker: "TODAY’S BRIEF",
			title: "June jobs miss eases Fed hike bets",
			dek: "Employers added just 48,000 jobs in June, less than half what economists expected. Unemployment rose to 4.5 percent, and traders quickly cut the odds of a July rate...",
			read: "Read",
			source: "Reuters · 2d",
		},
	] as BriefData[],
	mood: { title: "Market Mood", subtitle: "Low volatility" },
	/**
	 * "Mini · Markets" 2:4397 as the frame draws it: the Fed minutes story, the listing's second story (articles.ts
	 * STORIES). Since the user's ruling of 2026-11-11 (N62: "this section should be hottest news going on in the market"
	 * and "be making it change every 30 secs") the card shows the day's hottest stories in turn (src/app/news/hot.ts) and
	 * the Fed minutes runs in the brief alone (its item 2); this record stays the frame's copy, the voice of `miniLines`.
	 */
	mini: {
		id: "fed-minutes",
		kicker: "MARKETS",
		title: "Fed minutes land Wednesday",
		body: "The record of the Fed’s June meeting...",
		source: "Reuters · 2h",
	},
	/**
	 * The Mini card's line under each hot story's title (hot.ts): the opening words of the story's own article dek, cut
	 * where the frame cuts the Fed minutes dek ("The record of the Fed’s June meeting..." is the start of "The record of
	 * the Fed’s June meeting lands on Wednesday, ..."), so every line is the story's own words, ending "...": 41 to 48
	 * characters (the frame's 39), 200 to 258 px of the card's 324 at 1440 (the frame's 211), one line down to a 360 px
	 * phone. One per story the card can show: the listing's stories outside the brief.
	 */
	miniLines: {
		"nvidia-chip-rally": "The company that started the AI chip boom...",
		"apple-foldable": "A bigger foldable order and the widest...",
		"tesla-deliveries": "Tesla delivered more cars than Wall Street...",
		"memory-chips-soar": "Investors spent the first half selling...",
		"oil-slips-iran": "Oil fell for a second day after negotiators...",
	} as Readonly<Record<string, string>>,
	forYou: {
		title: "For You",
		cards: [
			{ id: "nvidia-chip-rally", tag: TAGS.inYourStak, ticker: "NVDA", title: "Nvidia lags the chip rally it kicked off", source: "Reuters · 2d", thumb: N.thumbs.nvidia },
			{ id: "apple-foldable", tag: TAGS.inYourStak, ticker: "AAPL", title: "Apple climbs 5% on foldable iPhone push", source: "Bloomberg · 2d", thumb: N.thumbs.apple },
			{ id: "tesla-deliveries", tag: TAGS.inYourStak, ticker: "TSLA", title: "Tesla drops 7% even after beating deliveries", source: "CNBC · 2d", thumb: N.thumbs.tesla },
		] as NewsCardData[],
	},
	markets: {
		title: "Markets",
		cards: [
			{ id: "june-jobs-miss", tag: TAGS.inYourStak, ticker: "O", title: "June jobs miss eases Fed hike bets", source: "Reuters · 2d", thumb: N.thumbs.jobs },
			{ id: "memory-chips-soar", tag: TAGS.inYourStak, ticker: "MU", title: "Memory chips soar as the AI trade rotates", source: "Bloomberg · 2d", thumb: N.thumbs.memory },
			{ id: "oil-slips-iran", tag: TAGS.inYourStak, ticker: "XOM", title: "Oil slips after positive Iran talks", source: "Reuters · 3d", thumb: N.thumbs.oil },
		] as NewsCardData[],
	},
} as const;

export const article = {
	id: "apple-foldable",
	breadcrumb: "News  /  Article",
	category: "Tech & Ai",
	title: "Apple climbs 5% on foldable iPhone push",
	dek: "A bigger foldable order and the widest iPhone lineup in years sent Apple toward a record, and to within touching distance of Nvidia’s crown.",
	publisherInitial: "B",
	// the byline (2:4584 "Bloomberg · Jul 2 · 3 min read") in its parts: the date is the story's age on the clock
	// (articles.ts bylineOf), "Jul 2" on the frame's Saturday, July 4
	publisher: "Bloomberg",
	age: "2d",
	readTime: "3 min read",
	gistTitle: "The gist",
	gist: [
		"Apple rose about 5% on plans for its widest iPhone lineup yet.",
		"It raised foldable orders to 10 million units, a show of confidence.",
		"The stock sits about 4% from passing Nvidia as the most valuable company.",
	],
	paragraphs1: [
		"Apple had one of its best days in months on Thursday, climbing almost 5 percent after word got out that the company is planning its widest iPhone lineup in years. Nikkei Asia reported that Apple has asked suppliers to prepare at least five new models, and to lift output of its first foldable to around 10 million units, well above the seven to eight million it had penciled in.",
		"That last number is the tell. Companies do not quietly double down on a product they expect to flop, and the foldable, which the rumor mill has taken to calling the iPhone Ultra, is now expected to land between late 2026 and the first half of 2027. Traders read the order size as confidence and bought accordingly. Apple gained about 182 billion dollars in market value on the day, nearly enough on its own to paper over a sell-off tearing through chip stocks.",
	],
	quote: "Companies do not quietly double down on a product they expect to flop.",
	newToThis: {
		title: "New to this?",
		body: "A foldable phone opens out into a small tablet. For Apple it means a pricier device to sell, and a way to win back buyers who drifted to Samsung, which has offered foldables for years.",
	},
	paragraphs2: [
		"The rally leaves Apple roughly 4 percent shy of retaking the title of most valuable company in the world from Nvidia, a crown the two have passed back and forth all year. It also lets the stock shake off a rough June, when a rare mid-cycle price increase on Macs and iPads, blamed on climbing memory costs, sent shares lower and rattled investors who had grown used to Apple holding the line.",
		"The real verdict comes on July 30, when Apple reports fiscal third quarter results. Wall Street is penciling in revenue of around 108 billion dollars, but the number everyone will hunt for is any early read on how the new lineup, and its price tags, are actually selling.",
	],
	sourceLabel: "Source",
	sourceUrl: "https://www.bloomberg.com",
	savedToast: "Saved to My STAK",
	ticker: {
		initial: "A",
		name: "Apple Inc.",
		symbol: "AAPL",
		price: "$308.63",
		change: "+4.84% today",
		viewInStak: "View AAPL in My STAK",
	},
	keyStats: {
		title: "Key stats",
		rows: [
			[
				{ label: "Market cap", value: "$4.58T" },
				{ label: "P/E ratio", value: "34.2" },
			],
			[
				{ label: "Day range", value: "$301.20–$309.80" },
				{ label: "Volume", value: "82.4M" },
			],
			[
				{ label: "52-wk range", value: "$201.50–$317.40" },
				{ label: "Div yield", value: "0.42%" },
			],
		],
	},
	addToStak: "Add to STAK",
	chip: "Apple",
	/** two cards (2:4549 / 2:4552) the prototype leaves unwired: Figma draws no article for them */
	readNext: {
		kicker: "READ NEXT",
		items: [
			{ source: "CNBC · 2d", title: "Tesla drops 7% even after beating deliveries" },
			{ source: "CNBC · 2d", title: "Tesla drops 7% even after beating deliveries" },
		],
	},
} as const;
