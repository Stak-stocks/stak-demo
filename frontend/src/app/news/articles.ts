import { byline } from "@/app/live/clock";
import { N } from "./assets";
import { article as apple, newsListing } from "./data";

/**
 * Every story of the News listing (2:4359) opens its own article (the user's ruling of 2026-11-01: "the figma design
 * was a place holder to guide you how it should look like"). The Figma article (2:4453 unsaved / 2:4555 saved, Apple)
 * is the template: each record below has the Apple record's structure, field for field (src/app/news/data.ts
 * `article`, unchanged), filled with its own story, in the same voice and at the same lengths, so the frame's layout
 * holds without new wrapping (the gist lines one line each, the pull quote two lines, "New to this?" two lines).
 *
 * The week of the listing (Saturday, July 4): markets are shut on Friday, July 3 for the holiday (the app's own NYSE
 * calendar, shared/src/nyseHolidays.ts), so Thursday, July 2 is the week's last session and the rails' "today".
 * Demo copy for a demo app: plausible, consistent with the listing and with each other, no claim about a real person.
 */

export type StatCell = { readonly label: string; readonly value: string };
export type StatRows = readonly (readonly StatCell[])[];

/** One article: the layers of the article frames 2:4453 / 2:4555, filled with one story (the Apple record's shape). */
export type NewsArticle = {
	readonly id: string;
	readonly breadcrumb: string;
	readonly category: string;
	readonly title: string;
	readonly dek: string;
	readonly publisherInitial: string;
	/** the byline's parts (2:4584 "Bloomberg · Jul 2 · 3 min read"): who published it, how old it is ("2d", "2h"), its read time */
	readonly publisher: string;
	readonly age: string;
	readonly readTime: string;
	readonly gistTitle: string;
	readonly gist: readonly string[];
	readonly paragraphs1: readonly string[];
	readonly quote: string;
	readonly newToThis: { readonly title: string; readonly body: string };
	readonly paragraphs2: readonly string[];
	readonly sourceLabel: string;
	readonly sourceUrl: string;
	readonly savedToast: string;
	/** the related company of the rail; `price` / `change` are the showcase figures (a signed-out visitor's rail) */
	readonly ticker: {
		/**
		 * the coin's letter (the frame's "A" for AAPL): the TICKER's first letter, the app's one rule for a coin without a
		 * logo (src/app/live/catalog.ts companyInitial; N30.8r, the hunt's VIS-06): Realty Income's coin reads "O" beside O
		 */
		readonly initial: string;
		readonly name: string;
		readonly symbol: string;
		readonly price: string;
		readonly change: string;
		readonly viewInStak: string;
	};
	/** the showcase rows; signed-in accounts read the live ones (the route's useKeyStats) */
	readonly keyStats: { readonly title: string; readonly rows: StatRows };
	readonly addToStak: string;
	readonly chip: string;
	/** "Read next" 2:4547: its two cards are the next two stories of the listing (readNextOf), not a field of the record */
	readonly readNext: { readonly kicker: string };
};

/** The strings every article shares with the template frames (the Apple record). */
const TEMPLATE = {
	breadcrumb: apple.breadcrumb,
	gistTitle: apple.gistTitle,
	sourceLabel: apple.sourceLabel,
	savedToast: apple.savedToast,
	addToStak: apple.addToStak,
	readNext: { kicker: apple.readNext.kicker },
} as const;

const BLOOMBERG = "https://www.bloomberg.com";
const REUTERS = "https://www.reuters.com";
const CNBC = "https://www.cnbc.com";

/** Every story's read time, the template's (2:4584). */
const READ = apple.readTime;

/**
 * An article's byline (2:4584), dated on the clock (the hunt's NUM-07; the coordinator's N23d / N30.3b): the publisher,
 * then the day the story's age puts it on and its read time, exactly as the phones build theirs (android
 * ui/news/NewsArticleFeed.kt:142 `sourceMeta = StakClock.byline("2d", "3 min read")` after `source`; iOS
 * NewsArticleFeed.swift). A story authored two days old reads "Bloomberg · Jul 2 · 3 min read" on the frames' Saturday,
 * July 4 (clock.ts FRAME_NOW: every record prints the date it was written with) and "Bloomberg · Nov 7 · 3 min read" on
 * Monday, November 9; an age in hours is the day it was that many hours ago (clock.ts storyDay). `now` pins the moment
 * for a test.
 * A STORY HAS ONE AGE: each record's `age` is the one its card prints ("CNBC · 2d", the brief's "Bloomberg · 10h"), so a
 * card and the article it opens always name the same day. The Dow brief's card reads "Bloomberg · 10h" (the frame's
 * text, 2:4372: late on the holiday eve) and its article is dated ten hours back: "Jul 3" on the frames' 09:41 morning,
 * today's date from ten in the morning on. The phones split the two (android NewsBriefFeed.kt:28 "Bloomberg · 10h" over
 * NewsArticleFeed.kt:163 `age = "1d"`), so their card and article disagree for most of the day (the review of
 * 2026-11-09; the coordinator's ruling NW3).
 */
export const bylineOf = (a: Pick<NewsArticle, "publisher" | "age" | "readTime">, now?: number): string => `${a.publisher} ${byline(a.age, a.readTime, now)}`;

/** "New to this?" 2:4498: the template's title over the story's own explainer. */
const explainer = (body: string) => ({ title: apple.newToThis.title, body });

/**
 * "Key stats" 2:4518, the template's six cells in its order and labels. The showcase figures of each company follow the
 * Apple rows' format ($4.58T, 34.2, $301.20–$309.80, 82.4M, 0.42%): market cap, P/E and dividend yield are the catalog's
 * financial snapshot (shared/src/brands, `financials`), the day range, volume and 52-week range (which the snapshot does
 * not carry) are authored around the showcase price. One exception: Nvidia's market cap, which the Apple frame's own copy
 * fixes (see `nvidia`).
 *
 * Every related company has a demo quote (src/app/live/demoQuotes.ts), so "View <SYMBOL> in My STAK" lands on a stock
 * page with a price and figures while the STAK API is down. The S&P 500 fund (SPY), the first pick for the two stories
 * about the whole market, has none: its page showed no price and no figures, so those stories relate to a company their
 * copy names instead (Goldman Sachs, Realty Income).
 */
const stats = (cap: string, pe: string, day: string, volume: string, week52: string, yieldPct: string) => {
	const [[c, p], [d, v], [w, y]] = apple.keyStats.rows;
	return {
		title: apple.keyStats.title,
		rows: [
			[
				{ label: c.label, value: cap },
				{ label: p.label, value: pe },
			],
			[
				{ label: d.label, value: day },
				{ label: v.label, value: volume },
			],
			[
				{ label: w.label, value: week52 },
				{ label: y.label, value: yieldPct },
			],
		],
	};
};

/**
 * Today's brief, item 1 ("Todays brief" 2:4372: Bloomberg · 10h, Friday night). Related: GS, Goldman Sachs, one of the
 * Dow's 30 companies and one of the banks that carried it to the record, as the story says. Its showcase figures for
 * Thursday, July 2 are the app's demo quote ($478.10, +1.2%: the gain the story reports), so its stock page agrees.
 */
const dow: NewsArticle = {
	...TEMPLATE,
	id: "dow-record-chips",
	category: "Markets",
	title: "Dow closes at a record as chips slide",
	dek: "Banks, industrials and Apple carried the Dow to a record before the long weekend, while a memory chip rout dragged the Nasdaq lower.",
	publisherInitial: "B",
	// "Bloomberg · Jul 3 · 3 min read" on the frames' Saturday morning: the age its brief card prints, "Bloomberg · 10h"
	// (2:4372), dated from its hours (clock.ts storyDay), so the card and the article name one day at any hour
	publisher: "Bloomberg",
	age: "10h",
	readTime: READ,
	gist: [
		"The Dow rose 0.9% on Thursday to close at a record high.",
		"A sell-off in memory chip stocks pulled the Nasdaq down 0.6%.",
		"A soft June jobs report eased fears of a Fed rate hike in July.",
	],
	paragraphs1: [
		"Wall Street went into the Independence Day weekend pulling in two directions. The Dow Jones Industrial Average rose 0.9 percent on Thursday to close at a record, lifted by banks, industrials and a near 5 percent jump in Apple. The Nasdaq went the other way and fell 0.6 percent, as memory chip makers gave back part of a first half rally that had made them the market’s hottest trade.",
		"The split had a simple cause. Chip stocks had run so far and so fast that traders needed only an excuse to bank some gains, and the jobs report handed them one. Employers added far fewer workers in June than expected, which in the market’s logic counts as good news, since it makes a July rate hike less likely. Money left the chip makers on Thursday for the older, steadier names that fill the Dow. Traders did not fall out of love with chip stocks; they just took a breather.",
	],
	quote: "Traders did not fall out of love with chip stocks; they just took a breather.",
	newToThis: explainer(
		"The Dow is an average of 30 big American companies, weighted by their share prices. A record close means that average has never ended a day higher, not that every stock in it rose.",
	),
	paragraphs2: [
		"The S&P 500, a broader gauge of 500 companies, edged up 0.3 percent, just shy of its own record. Under the surface the day looked like a rotation rather than a scare. Goldman Sachs gained 1.2 percent as banks rose on hopes the economy can cool without the Fed squeezing harder, while industrial and health care companies picked up the money leaving the chip makers that led the market for most of the year.",
		"Markets are closed today for the holiday. When trading resumes on Monday the focus shifts to Wednesday, when the Fed releases the minutes of its June meeting and traders learn how close officials came to raising rates, then weigh whether a weak jobs report is enough to talk them out of it.",
	],
	sourceUrl: BLOOMBERG,
	ticker: { initial: "G", name: "Goldman Sachs Group Inc.", symbol: "GS", price: "$478.10", change: "+1.20% today", viewInStak: "View GS in My STAK" },
	keyStats: stats("$145B", "12.1", "$471.85–$480.62", "2.6M", "$362.15–$486.80", "2.40%"),
	chip: "Goldman Sachs",
};

/**
 * The frame's Mini story ("Mini · Markets" 2:4397: Reuters · 2h, Saturday) and the brief's item 2 (since N62 the Mini
 * card shows the hottest stories outside the brief: hot.ts). Its category is the one the listing gives the story: the
 * Mini card's kicker "MARKETS", the phone's "Markets" tag (1:1216). Related: JPM, the largest American bank: how high
 * rates stay sets what it earns on its loans, and the minutes move that expectation.
 */
const fed: NewsArticle = {
	...TEMPLATE,
	id: "fed-minutes",
	category: "Markets",
	title: "Fed minutes land Wednesday",
	dek: "The record of the Fed’s June meeting lands on Wednesday, and after a weak jobs report, traders want to know how close it came to a hike.",
	publisherInitial: "R",
	// "Reuters · Jul 4 · 3 min read" on the frames' Saturday: the Mini card's "Reuters · 2h", today
	publisher: "Reuters",
	age: "2h",
	readTime: READ,
	gist: [
		"The Fed publishes the minutes of its June meeting on Wednesday.",
		"Traders will look for how many officials argued for a rate hike.",
		"A weak June jobs report has already cut the odds of a July hike.",
	],
	paragraphs1: [
		"The Federal Reserve left interest rates alone in June, but the decision did not tell the whole story. On Wednesday afternoon the central bank publishes the minutes of that meeting, a detailed record of who argued for what, and investors have had the date circled for weeks. The question is simple: how many officials wanted to raise rates to cool prices that crept back up this spring?",
		"The answer matters more after Thursday. Employers added just 48,000 jobs in June, less than half what economists expected, and the unemployment rate rose to 4.5 percent. Futures traders cut the odds of a July hike to about one in five, from close to even a week earlier. If the minutes show a committee that was already wavering, those odds could fall further, and if they show a firm majority for a hike, they could jump right back. The vote tells you what the Fed did. The minutes tell you what it nearly did.",
	],
	quote: "The vote tells you what the Fed did. The minutes tell you what it nearly did.",
	newToThis: explainer(
		"Fed minutes are the written record of a rate meeting, released three weeks later. They show the debate behind a decision, which often hints at the next move better than the decision does.",
	),
	paragraphs2: [
		"Banks have a lot riding on the answer. Lenders like JPMorgan Chase earn more on their loans when rates are high, and the market has been counting on at least one more hike this year. A softer tone would trim that, along with what banks can charge, though it would also ease the worry that higher borrowing costs push more households and companies into missing their payments.",
		"The minutes come out at 2 p.m. Eastern on Wednesday. Expect a quick move in bond yields, then a slower one in bank stocks, as traders work out whether the Fed that held steady in June is still the Fed that meets again at the end of July, now that the jobs market has started to cool.",
	],
	sourceUrl: REUTERS,
	ticker: { initial: "J", name: "JPMorgan Chase & Co.", symbol: "JPM", price: "$210.91", change: "+0.62% today", viewInStak: "View JPM in My STAK" },
	keyStats: stats("$580B", "13.2", "$208.94–$211.58", "8.9M", "$179.20–$218.40", "2.20%"),
	chip: "JPMorgan Chase",
};

/**
 * For You, card 1 (2:4408: Reuters · 2d). Related: NVDA. Its showcase market cap is not the catalog's ($4.65T): the
 * Apple frame's own copy puts Apple ($4.58T on its rail) "about 4% from passing Nvidia" on the same Thursday, so Nvidia
 * stands at $4.76T, and its price at $195.88 (the same share count as the catalog's cap at $191.36).
 */
const nvidia: NewsArticle = {
	...TEMPLATE,
	id: "nvidia-chip-rally",
	category: "Tech & Ai",
	title: "Nvidia lags the chip rally it kicked off",
	dek: "The company that started the AI chip boom ended the first half well behind the chip index, as investors hunted for the next winner.",
	publisherInitial: "R",
	// "Reuters · Jul 2 · 3 min read" on the frames' Saturday (its card: "Reuters · 2d")
	publisher: "Reuters",
	age: "2d",
	readTime: READ,
	gist: [
		"Nvidia rose about 9% in the first half, the chip index about 31%.",
		"Investors moved money into memory makers and smaller chip names.",
		"It is still the most valuable company, but its lead has narrowed.",
	],
	paragraphs1: [
		"Nvidia spent the last two years as the stock everyone had to own. In the first half of this year it became the stock everyone already owned. Its shares rose about 9 percent through the end of June, a fine result for most companies and a quiet one for Nvidia, while the index of chip stocks it once dragged higher climbed about 31 percent, largely without it.",
		"The money did not leave the AI trade; it simply moved around inside it. Memory makers, which build the fast chips that sit beside Nvidia’s processors in every AI server, rose by as much as 70 percent. Smaller chip designers and the companies that make chip factory equipment followed close behind. The thinking is that Nvidia’s success is already in its price, while the suppliers to the same boom still have room to surprise, and traders have been happy to bet on the surprise.",
	],
	quote: "The money did not leave the AI trade; it simply moved around inside it.",
	newToThis: explainer(
		"A chip index tracks a basket of semiconductor stocks, so you can see how the industry did as a whole. When one company trails its index, most of its industry has done better than it has.",
	),
	paragraphs2: [
		"None of this means the business is slowing. Nvidia still sells most of the chips used to train large AI models, and its next results are expected to show sales growing faster than at almost any company its size. Size is the problem. At more than 4 trillion dollars in market value, every extra percent of gain needs tens of billions of new money, and that money has been finding easier homes.",
		"Nvidia reports its next results in late August. Until then the stock may keep trading like a giant that has already won, while the rally it started runs on without it, and Apple, now only a few percent behind in market value, takes aim at its crown as the most valuable company.",
	],
	sourceUrl: REUTERS,
	ticker: { initial: "N", name: "NVIDIA Corp.", symbol: "NVDA", price: "$195.88", change: "-1.42% today", viewInStak: "View NVDA in My STAK" },
	keyStats: stats("$4.76T", "49.6", "$194.31–$199.47", "168.2M", "$128.40–$212.19", "0.03%"),
	chip: "NVIDIA",
};

/** For You, card 3 (2:4422: CNBC · 2d). Related: TSLA. */
const tesla: NewsArticle = {
	...TEMPLATE,
	id: "tesla-deliveries",
	category: "Autos",
	title: "Tesla drops 7% even after beating deliveries",
	dek: "Tesla delivered more cars than Wall Street expected and still lost 7 percent in a day, because investors cared how it sold them.",
	publisherInitial: "C",
	// "CNBC · Jul 2 · 3 min read" on the frames' Saturday (its card: "CNBC · 2d")
	publisher: "CNBC",
	age: "2d",
	readTime: READ,
	gist: [
		"Tesla delivered about 412,000 cars, ahead of the 395,000 expected.",
		"Price cuts and cheap financing did much of the work this quarter.",
		"The stock fell about 7% on worries about the profit on each car.",
	],
	paragraphs1: [
		"Tesla gave investors the number they asked for on Thursday and was punished for it anyway. The company said it delivered about 412,000 vehicles from April through June, ahead of the roughly 395,000 analysts had expected and up from a weak first quarter. By the close the shares were down a little over 7 percent, the stock’s worst day since the spring.",
		"The problem was how it got there. Tesla spent the quarter cutting prices, offering cheap financing in several markets and clearing older cars off its lots, and analysts read the beat as the result of a sale rather than a sign of fresh demand. Every discount comes straight out of the profit on each car, and that profit has been shrinking for two years as rivals in China and Europe crowd the market. Selling more cars is easy. Selling them for more money is the hard part.",
	],
	quote: "Selling more cars is easy. Selling them for more money is the hard part.",
	newToThis: explainer(
		"Deliveries count the cars a company handed to buyers, not what it earned on them. Profit margin is the share of each sale it keeps after costs, and investors often care about that more.",
	),
	paragraphs2: [
		"It does not help that the stock is priced for far more than cars. At around 390 times its earnings, Tesla trades less like a carmaker and more like a bet on robotaxis, robots and software that are still mostly promises. A quarter that looks like an ordinary car company running an ordinary sale reminds investors how much of the price rests on a future that has not arrived yet.",
		"Tesla reports full second quarter results later this month, when investors will see exactly what the discounts cost. Until then, the delivery beat is a reminder that in the stock market, how a company hits a number can matter more than the number itself, especially when the price assumes so much.",
	],
	sourceUrl: CNBC,
	ticker: { initial: "T", name: "Tesla Inc.", symbol: "TSLA", price: "$428.57", change: "-7.04% today", viewInStak: "View TSLA in My STAK" },
	keyStats: stats("$1.38T", "391.3", "$421.10–$452.30", "142.6M", "$214.25–$488.54", "0.00%"),
	chip: "Tesla",
};

/**
 * Markets, card 1 (2:4432: Reuters · 2d) and the brief's item 3. Related: O, Realty Income, a landlord that borrows to
 * buy its buildings and pays a large dividend, so the odds of higher rates move its shares; the story names it. Its
 * showcase figures are the app's demo quote ($55.30, +0.2%: "edged up"), so its stock page agrees.
 */
const jobs: NewsArticle = {
	...TEMPLATE,
	id: "june-jobs-miss",
	category: "Economy",
	title: "June jobs miss eases Fed hike bets",
	dek: "Employers added far fewer jobs than expected in June, and traders who had braced for a rate hike decided the Fed may sit it out.",
	publisherInitial: "R",
	// "Reuters · Jul 2 · 3 min read" on the frames' Saturday (its card: "Reuters · 2d")
	publisher: "Reuters",
	age: "2d",
	readTime: READ,
	gist: [
		"Employers added 48,000 jobs in June, short of the 110,000 expected.",
		"The unemployment rate rose to 4.5% from 4.3%, its highest this year.",
		"Traders cut the odds of a July rate hike from about even to one in five.",
	],
	paragraphs1: [
		"The jobs report came a day early this month because of the holiday, and it was not the one Wall Street had braced for. Employers added 48,000 jobs in June, less than half of the 110,000 economists had expected, and the unemployment rate rose to 4.5 percent from 4.3 percent. Revisions also took 30,000 jobs off the two months before, so the slowdown is not a one off.",
		"For most people that is simply bad news. For traders it came as a relief. The Federal Reserve has spent the spring worried that prices were heating up again, and futures markets had priced close to even odds of a hike at the end of July. A cooler job market makes that much harder to justify, so within an hour of the report the odds had fallen to about one in five, and two year Treasury yields had their biggest one day drop since March, pulling mortgage rates down with them.",
	],
	quote: "For most people that is simply bad news. For traders it came as a relief.",
	newToThis: explainer(
		"The jobs report is a monthly count of how many workers American employers added. Markets watch it closely because the Fed uses it to judge whether the economy needs higher rates.",
	),
	paragraphs2: [
		"Stocks took the report in stride. The Dow closed at a record and landlords like Realty Income, which borrow to buy their buildings, edged up on the idea that borrowing costs may have peaked, while chip stocks slid as traders used the report to take profits after their run. Wages kept the worry about prices alive: average pay rose 3.6 percent from a year earlier, a little faster than in May.",
		"The Fed’s next meeting ends on July 29. Before then come the minutes of its June meeting on Wednesday and a fresh reading on inflation the week after, and either one could put a hike back on the table if prices keep running hot, whatever the jobs market is doing.",
	],
	sourceUrl: REUTERS,
	ticker: { initial: "O", name: "Realty Income Corp.", symbol: "O", price: "$55.30", change: "+0.20% today", viewInStak: "View O in My STAK" },
	keyStats: stats("$48B", "42.5", "$54.87–$55.64", "5.2M", "$50.65–$61.42", "5.50%"),
	chip: "Realty Income",
};

/**
 * Markets, card 2 (2:4439: Bloomberg · 2d, a first-half review published Thursday morning). Related: MU. Its rail shows
 * Thursday's close, the memory chip rout the Dow brief describes, a day after the half ended with memory on top.
 */
const memory: NewsArticle = {
	...TEMPLATE,
	id: "memory-chips-soar",
	category: "Tech & Ai",
	title: "Memory chips soar as the AI trade rotates",
	dek: "Investors spent the first half selling the AI giants and buying the makers of their memory, and Micron ended June up almost 70 percent.",
	publisherInitial: "B",
	// "Bloomberg · Jul 2 · 3 min read" on the frames' Saturday (its card: "Bloomberg · 2d")
	publisher: "Bloomberg",
	age: "2d",
	readTime: READ,
	gist: [
		"Memory makers led the chip index in the first half of the year.",
		"Micron rose almost 70% as AI servers soaked up memory supply.",
		"Memory prices are rising fast, and memory makers’ profits with them.",
	],
	paragraphs1: [
		"For years memory chips were the dull corner of the chip business, the part that boomed and busted with the price of a commodity. In the first half of this year they were the place to be. Micron, the largest American memory maker, rose almost 70 percent through the end of June, close to eight times the gain in Nvidia, and its rivals in South Korea posted similar runs.",
		"The reason is the AI server. Every rack of Nvidia processors needs stacks of high bandwidth memory beside it, a special chip that takes far more factory space to make than the ordinary kind. Makers have moved their capacity to build it, which has squeezed the supply of regular memory for phones and laptops and pushed prices up across the board this spring. The boring corner of the chip business has become the exciting one, and the profits are starting to show it.",
	],
	quote: "The boring corner of the chip business has become the exciting one.",
	newToThis: explainer(
		"Memory chips hold the data a device is working on. They sell almost like a commodity, so their prices swing with supply and demand, and memory makers’ profits swing even harder.",
	),
	paragraphs2: [
		"That swing is the catch. Memory has a long history of feast and famine, when makers build too much and prices collapse, and investors have not forgotten it. The stocks move fast in both directions, and the traders who chased them up can sell them just as quickly. For now, though, demand from AI data centers looks deep enough to keep the feast going a while longer.",
		"Micron reports its next results in late September, which will show whether the higher prices are holding. Until then the rotation sends a clear message: in the AI boom, the companies selling the picks and shovels are having their moment too, and for once the shovels are the hard part.",
	],
	sourceUrl: BLOOMBERG,
	ticker: { initial: "M", name: "Micron Technology Inc.", symbol: "MU", price: "$98.21", change: "-5.84% today", viewInStak: "View MU in My STAK" },
	keyStats: stats("$110B", "12.0", "$97.36–$105.12", "41.8M", "$61.54–$108.88", "0.50%"),
	chip: "Micron",
};

/**
 * Markets, card 3 (2:4446: Reuters · 3d, Wednesday morning). Related: XOM, the largest American oil company: its shares
 * follow the price of the crude it sells.
 */
const oil: NewsArticle = {
	...TEMPLATE,
	id: "oil-slips-iran",
	category: "Energy",
	title: "Oil slips after positive Iran talks",
	dek: "Oil fell for a second day after negotiators called talks on Iran’s nuclear program constructive, raising hopes of more Iranian crude.",
	publisherInitial: "R",
	// "Reuters · Jul 1 · 3 min read" on the frames' Saturday (its card: "Reuters · 3d")
	publisher: "Reuters",
	age: "3d",
	readTime: READ,
	gist: [
		"Brent crude fell about 2% to near 67 dollars, its second drop in a row.",
		"Talks on Iran’s nuclear program ended with a plan to meet again.",
		"A deal could ease sanctions and add Iranian oil to world supply.",
	],
	paragraphs1: [
		"Oil fell for a second straight day on Wednesday after talks between American and Iranian negotiators ended with both sides calling them constructive and agreeing to meet again later this month. Brent crude, the global benchmark, slipped about 2 percent to around 67 dollars a barrel, and American crude fell by a similar amount to its lowest level in five weeks.",
		"Traders are not betting on a deal yet, but they are betting on less risk. For months the oil price has carried a premium for the chance of a wider conflict in the Middle East, one that could choke shipments through the Strait of Hormuz, a narrow channel that carries about a fifth of the world’s oil. Every hopeful headline from the talks takes a little of that premium out of the price, and Tuesday brought several of them, along with a plan for officials to meet again in two weeks.",
	],
	quote: "Traders are not betting on a deal yet, but they are betting on less risk.",
	newToThis: explainer(
		"A risk premium is the extra price traders pay for something that might get scarce. When talks make a supply shock less likely, that extra comes out of the price before anything changes.",
	),
	paragraphs2: [
		"A deal would not flood the market overnight. Iran already sells oil, mostly to China, and lifting sanctions would take months. But it could add a million barrels a day or more over time, at a moment when producers outside the Middle East are already pumping close to record amounts and demand is growing more slowly than it did a year ago, which leaves the market with little need for more.",
		"Cheaper oil is good news for drivers and for the Fed, which counts fuel in its inflation figures. It is less good news for oil companies like Exxon Mobil, whose shares tend to follow the price of the crude they sell, and which have trailed the wider market this year.",
	],
	sourceUrl: REUTERS,
	ticker: { initial: "X", name: "Exxon Mobil Corp.", symbol: "XOM", price: "$97.67", change: "-0.71% today", viewInStak: "View XOM in My STAK" },
	keyStats: stats("$420B", "10.0", "$97.21–$98.90", "14.3M", "$94.85–$123.75", "3.50%"),
	chip: "Exxon Mobil",
};

/**
 * Home's Market Mood stories (2:454 / 2:459 / 2:464; the coordinator's decision D12, from the user's "each card takes me
 * direct to their respective news section"): each story card opens its own article. The Fed notes story is the
 * listing's Fed minutes; the fear gauge and the OpenAI IPO are written here, on the same template, and stay OUT of the
 * listing (ARTICLES, STORIES, the listing's cards and its search keep their eight): Home is the page that opens them.
 * Each title is its card's own title (Figma's straight apostrophe kept), each byline its card's publisher, dated Friday,
 * July 3 (the holiday, the day after the week's last session), and each rail a company the copy names, with a catalog
 * entry and a demo quote: their showcase figures ARE those quotes (KO $63.20, +0.2%; MSFT $438.20, -0.4%), so the rail
 * and the stock page agree.
 */

/**
 * Home story 1 ("Deck promo" 2:454: "CNN Business · Markets"; first run 2:572): the Fear & Greed reading the Market Mood
 * card leads with, after Thursday's close. Related: KO, Coca-Cola, the defensive name the money moved into.
 */
const fearGauge: NewsArticle = {
	...TEMPLATE,
	id: "fear-gauge-32",
	category: "Markets",
	title: "Wall Street's fear gauge reads 32",
	dek: "CNN’s Fear & Greed Index ended the week at 32, firmly in Fear, as money rotated out of high-growth names and into steady, defensive ones.",
	publisherInitial: "C",
	// "CNN Business · Jul 3 · 3 min read" on the frames' Saturday (HOME_STORIES: "CNN Business · 1d")
	publisher: "CNN Business",
	age: "1d",
	readTime: READ,
	gist: [
		"The Fear & Greed Index fell to 32, from a neutral 51 a week ago.",
		"Investors sold chip, solar and electric car stocks for safer names.",
		"Steady names like Coca-Cola edged up as the Nasdaq slid on Thursday.",
	],
	paragraphs1: [
		"Wall Street’s favorite mood ring turned gloomy this week. CNN’s Fear & Greed Index, which rolls seven market signals into one score from 0 to 100, ended Thursday’s session at 32, firmly in Fear territory and down from a neutral 51 a week earlier. The reading came on the same day the Dow closed at a record, which tells you how lopsided the market has become.",
		"The record hid a quieter retreat. Investors spent the week selling the high-growth names that led the first half: memory chip makers, solar companies and Tesla, which lost 7 percent in a day. More stocks fell than rose on most days, traders paid up for options that protect against a drop, and money moved into companies people keep buying in any economy, from Coca-Cola to the big utilities. A market can close at a record high and still be nervous underneath it.",
	],
	quote: "A market can close at a record high and still be nervous underneath it.",
	newToThis: explainer(
		"The Fear & Greed Index is CNN’s daily score of investor mood, built from seven signals such as volatility and demand for safe assets. Below 50 means fear is winning; above it, greed.",
	),
	paragraphs2: [
		"Coca-Cola is the classic shelter. People buy soda in good times and bad, the company has raised its dividend every year for more than six decades, and its shares tend to swing less than the market does. They edged up 0.2 percent on Thursday while the chip makers slid, the kind of quiet gain that shows up when investors care more about keeping their money than about making it fast.",
		"Readings this low have often come before rebounds, since sellers tend to be worn out by then, but the index is a mood ring, not a forecast. The next test arrives on Wednesday, when the Fed’s June minutes show how close officials came to raising rates.",
	],
	sourceUrl: "https://www.cnn.com/business",
	ticker: { initial: "K", name: "Coca-Cola Co.", symbol: "KO", price: "$63.20", change: "+0.20% today", viewInStak: "View KO in My STAK" },
	keyStats: stats("$285B", "26.0", "$62.84–$63.41", "15.2M", "$58.93–$73.53", "3.00%"),
	chip: "Coca-Cola",
};

/**
 * Home story 3 ("Deck promo" 2:464: "Bloomberg · Tech IPOs"; first run 2:582): the listing that slipped, reported late on
 * Thursday. Related: MSFT, OpenAI's largest backer (already in the showcase persona's saves and positions).
 */
const openAiIpo: NewsArticle = {
	...TEMPLATE,
	id: "openai-ipo-delayed",
	category: "Tech & Ai",
	title: "The OpenAI IPO is reportedly delayed",
	dek: "The year’s most anticipated listing has slipped to next year, people familiar with the plans say, cooling a market riding a wave of IPO excitement.",
	publisherInitial: "B",
	// "Bloomberg · Jul 3 · 3 min read" on the frames' Saturday (HOME_STORIES: "Bloomberg · 1d")
	publisher: "Bloomberg",
	age: "1d",
	readTime: READ,
	gist: [
		"OpenAI has pushed its stock market debut back to 2027, reports say.",
		"The delay follows a year of record AI spending and a choppy market.",
		"Investors get their first chance to react when markets reopen Monday.",
	],
	paragraphs1: [
		"OpenAI is in no hurry to go public after all. The maker of ChatGPT has pushed back plans for a stock market listing that bankers had penciled in for this fall, according to people familiar with the matter, and is now aiming for 2027 at the earliest. The listing would have been the largest technology debut in years, and the news landed late on Thursday, after the market had closed for the long weekend.",
		"The company does not need the money yet. OpenAI raised tens of billions of dollars from private investors over the past year, enough to keep building data centers without answering to public shareholders every quarter. A listing would bring a fresh pile of cash, but also the scrutiny that comes with it, and a choppy summer for growth stocks has made that trade look less attractive. Waiting costs OpenAI little; listing in a bad week could cost it billions.",
	],
	quote: "Waiting costs OpenAI little; listing in a bad week could cost it billions.",
	newToThis: explainer(
		"An IPO, or initial public offering, is when a private company first sells its shares on a stock exchange. It raises money from new investors and lets early backers sell their stakes.",
	),
	paragraphs2: [
		"For Microsoft, the delay changes little in the short run. It is OpenAI’s largest backer, and much of OpenAI’s work runs on its Azure cloud, so it earns either way. But a listing would have put a public price on that stake, which analysts value at well over 100 billion dollars, and investors who bought Microsoft partly as a way into OpenAI will have to wait longer to see it. The shares slipped 0.4 percent on Thursday.",
		"The wider IPO market is busy all the same, with a line of fintech and AI companies planning to list before the end of the summer. When trading resumes on Monday, bankers will watch whether the delay cools that appetite or simply leaves more room for everyone else.",
	],
	sourceUrl: BLOOMBERG,
	ticker: { initial: "M", name: "Microsoft Corp.", symbol: "MSFT", price: "$438.20", change: "-0.40% today", viewInStak: "View MSFT in My STAK" },
	keyStats: stats("$3.1T", "35.0", "$436.11–$441.92", "18.7M", "$344.79–$468.35", "0.80%"),
	chip: "Microsoft",
};

/** The articles in the listing's order (the brief, the Mini story, For You, Markets). Apple's is the template record. */
export const ARTICLES: readonly NewsArticle[] = [dow, fed, nvidia, apple, tesla, jobs, memory, oil];

/** The articles only Home opens (its Market Mood stories 1 and 3), in the card's order; never part of the listing. */
export const HOME_ARTICLES: readonly NewsArticle[] = [fearGauge, openAiIpo];

const BY_ID: ReadonlyMap<string, NewsArticle> = new Map([...ARTICLES, ...HOME_ARTICLES].map((a) => [a.id, a]));

/** The article of a story id; undefined for an id no story has (the route then answers with the app's 404). */
export const articleById = (id: string): NewsArticle | undefined => BY_ID.get(id);

/** A story as the listing shows it: what a Read next card draws (2:4549 / 2:4552: its source line and its title). */
export type StoryRef = { readonly id: string; readonly title: string; readonly source: string };

/**
 * The listing's stories in reading order: the Today's brief (its first item, the Dow), the frame's Mini story (the Fed
 * minutes), then For You and Markets top to bottom. The brief's items 2 and 3 are the Fed minutes and the June jobs card,
 * so they are not repeated. (Since N62 the Mini card shows the hottest of these stories outside the brief in turn,
 * src/app/news/hot.ts; this reading order, and so Read next, is unchanged.)
 */
export const STORIES: readonly StoryRef[] = [newsListing.briefs[0]!, newsListing.mini, ...newsListing.forYou.cards, ...newsListing.markets.cards].map(
	({ id, title, source }) => ({ id, title, source }),
);

/**
 * Home's three Market Mood stories as a Read next card draws them, in the card's order: the fear gauge, the Fed minutes
 * (the listing's own story, named as the listing names it) and the OpenAI IPO. The two Home-only stories are dated as the
 * listing dates its cards (published Friday, July 3: "1d" on Saturday's listing).
 */
const HOME_STORIES: readonly StoryRef[] = [
	{ id: fearGauge.id, title: fearGauge.title, source: "CNN Business · 1d" },
	STORIES.find((s) => s.id === "fed-minutes")!,
	{ id: openAiIpo.id, title: openAiIpo.title, source: "Bloomberg · 1d" },
];

/**
 * "Read next": the two stories after this one in the listing's order, wrapping round to the top. A Home-only article
 * (HOME_ARTICLES) reads on into the other two Home stories, the next two in the card's order, wrapping round.
 */
export function readNextOf(id: string): readonly StoryRef[] {
	const list = HOME_ARTICLES.some((a) => a.id === id) ? HOME_STORIES : STORIES;
	const i = list.findIndex((s) => s.id === id);
	if (i < 0) return [];
	return [list[(i + 1) % list.length]!, list[(i + 2) % list.length]!];
}

/**
 * What a hero draws (2:4464, 720x416, radius 20). Apple's is Figma's hero illustration (2:4465, the device on its plain
 * gradient). Every other story shows its own photo: the image fill of its card's "Thumb" on the listing (2:4359), its
 * original file as Figma holds it (download_assets of 2:4359 on 2026-11-06: byte for byte the files the listing already
 * draws, so the hero is in the cache when the article opens). Figma has no image for the brief and the Mini story; they
 * borrow the photo of their closest story (`borrowedFrom`) until the user supplies their own.
 *
 * THE PHOTOS ARE SMALL AT THE SOURCE (the hunt's VIS-01, re-checked on 2026-11-09 for the coordinator's N30): each fill
 * was fetched again from Figma (get_design_context of 2:4409, 2:4416, 2:4423, 2:4433, 2:4440, 2:4447, read-only) and is
 * byte for byte the file shipped here: five 160 x 160 JPEGs of 5 to 7 KB and one 512 x 512 PNG (oil). The phones ship the
 * same five files (android res/drawable-nodpi/news_thumb_*.jpg, the same SHA-1s). No larger original exists, so a hero
 * without a served poster (media.ts) draws its 160 px photo across 814 px and is soft; nothing is upscaled or generated
 * to hide that: sharper heroes need larger photos from the user.
 */
export type HeroArt =
	| { readonly kind: "illustration" }
	| { readonly kind: "photo"; readonly src: string; readonly width: number; readonly height: number; readonly node: string; readonly borrowedFrom?: string };

const photo = (src: string, size: number, node: string, borrowedFrom?: string): HeroArt => ({ kind: "photo", src, width: size, height: size, node, borrowedFrom });

export const ARTICLE_HERO: Readonly<Record<string, HeroArt>> = {
	// the memory chip rout the brief's dek names ("as chips slide")
	"dow-record-chips": photo(N.thumbs.memory, 160, "2:4440", "memory-chips-soar"),
	// Washington, the Washington Monument in the frame: the Fed's city, and the jobs story that sets up the minutes
	"fed-minutes": photo(N.thumbs.jobs, 160, "2:4433", "june-jobs-miss"),
	"nvidia-chip-rally": photo(N.thumbs.nvidia, 160, "2:4409"),
	"apple-foldable": { kind: "illustration" },
	"tesla-deliveries": photo(N.thumbs.tesla, 160, "2:4423"),
	"june-jobs-miss": photo(N.thumbs.jobs, 160, "2:4433"),
	"memory-chips-soar": photo(N.thumbs.memory, 160, "2:4440"),
	"oil-slips-iran": photo(N.thumbs.oil, 512, "2:4447"),
	// Home's two stories have no image in Figma either: the fear gauge borrows the memory chip photo (the rout that led the
	// week's rotation out of high-growth names, as the Dow brief does), the OpenAI IPO the Nvidia story's AI hardware
	"fear-gauge-32": photo(N.thumbs.memory, 160, "2:4440", "memory-chips-soar"),
	"openai-ipo-delayed": photo(N.thumbs.nvidia, 160, "2:4409", "nvidia-chip-rally"),
};

export const heroOf = (id: string): HeroArt => ARTICLE_HERO[id] ?? { kind: "illustration" };
