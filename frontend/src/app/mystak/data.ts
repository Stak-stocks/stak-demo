/** My STAK copy (06 My STAK frames) — the authored strings that are not derived from the account. */
import { DECK_RECAP, PICKS_DONE } from "@/app/home/copy";
import type { CollectionSlug } from "@/app/live/catalog";
import type { AllocationRow } from "@/app/live/collections";
import { MS } from "./assets";

/**
 * Raster covers are 52.748px, category glyphs 55.851px (the frame's two sizes). "Other" (no frame draws it: the
 * seventh card the phones add while a save sits outside the six collections, android ui/mystak/Collections.kt:140-170)
 * takes the phones' saved-bookmark glyph in a category glyph's slot.
 */
export const COLLECTION_ICONS: Record<CollectionSlug, { icon: string; iconSize: 52.748 | 55.851 }> = {
	"ai-tech": { icon: MS.collections.aiTech, iconSize: 52.748 },
	finance: { icon: MS.collections.finance, iconSize: 52.748 },
	"green-energy": { icon: MS.collections.greenEnergy, iconSize: 55.851 },
	"real-estate": { icon: MS.collections.realEstate, iconSize: 55.851 },
	healthcare: { icon: MS.collections.healthcare, iconSize: 55.851 },
	consumer: { icon: MS.collections.consumer, iconSize: 55.851 },
	other: { icon: MS.otherBookmark, iconSize: 55.851 },
};

/** Allocation dots: the frame's five glyphs; the two collections it never drew get a plain circle. */
export const ALLOCATION_DOTS: Partial<Record<CollectionSlug, string>> = {
	"ai-tech": MS.dots.tech,
	finance: MS.dots.finance,
	"green-energy": MS.dots.green,
	"real-estate": MS.dots.realEstate,
	other: MS.dots.other,
};

/**
 * The attribute that names a control of the overview present in both of its trees (a collection card, a range tab,
 * Add more, the Discover CTA), so keyboard focus can follow it when the window crosses 1024 (_app.my-stak.index.tsx).
 * The controls write it out literally (`data-mystak-focus="add-more"`); this is the name the hook looks them up by.
 */
export const FOCUS_KEY = "data-mystak-focus";

/** 2:4699: the allocation bars' track is 314px wide in the frame; a bar keeps its share of the track at any width. */
export const ALLOCATION_TRACK = 314;

/**
 * The space each frame keeps below its content, so a page is as tall as its frame (taller windows add to it,
 * shorter ones scroll) and the rail's rule and account row land where the frame draws them: the content starts
 * at 88 and ends at 991.791 in 2:4667 (1096 tall) and at 820 in 2:1830 (1024). 2:4830 is 1092 tall but keeps the
 * sidebar instance at its 1096 height (rule at 996, account row at 1021, as its render shows), so the collection
 * page is 1096 tall too (content ends at 805).
 */
export const FRAME_BOTTOM = { overview: 1096 - 991.791, empty: 1024 - 820, collection: 1096 - 805 } as const;

export const OVERVIEW = {
	title: "My STAK",
	subtitle: "Your living watchlist and learning hub",
	collections: "Collections",
	breakdown: "Breakdown",
	allocation: "Allocation",
	addMore: "Add more",
} as const;

/** The performance card's range tabs (2:4804), in the frame's order; 3M is the one the frame selects (2:4808). */
export const RANGES = ["1D", "1W", "1M", "3M", "YTD", "1Y"] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = "3M";

/** How each range reads in a sentence ("Performance this week", "Best this week" in 2:4796 / 2:4815). */
const RANGE_PHRASE: Record<Range, string> = {
	"1D": "today",
	"1W": "this week",
	"1M": "this month",
	"3M": "over 3 months",
	YTD: "this year",
	"1Y": "over the past year",
};

export const PERFORMANCE = {
	eyebrow: (r: Range) => `Performance ${RANGE_PHRASE[r]}`,
	across: (n: number) => `Across ${n} ${n === 1 ? "stock" : "stocks"}`,
	bestLabel: (r: Range) => `Best ${RANGE_PHRASE[r]}`,
	worstLabel: "Worst",
	/** shown where a figure has no data behind it */
	none: "—",
	group: "Performance range",
} as const;

export const INSIGHT_HEADING = "Your read";

/**
 * What a control that opens today's deck reads and where it leads, by the deck's state (the hunt's ST-20b and C-06,
 * coordinator rulings N27w and N30.8l: "Start swiping ›" and "Go to today’s deck" stood beside "Today’s deck is done"):
 * its own label and the deck while a card is left; once the deck is done, the deck's receipt under the site's one label
 * for it (src/app/home/copy.ts DECK_RECAP, as Home's deck card). `remaining` is home/copy.ts cardsLeft: 0 once the deck
 * is done, also when a replayed deck ended on cards saved before.
 */
export const deckControl = (remaining: number, label: string): { label: string; to: "/discover" | typeof DECK_RECAP.to; done: boolean } =>
	remaining <= 0 ? { label: DECK_RECAP.label, to: DECK_RECAP.to, done: true } : { label, to: "/discover", done: false };

export const DISCOVER_CTA = {
	eyebrow: "DISCOVER",
	title: "More like your STAK",
	/** the site's one sentence for a finished deck (home/copy.ts PICKS_DONE), else the cards still waiting */
	body: (remaining: number) => (remaining <= 0 ? PICKS_DONE : `Based on your taste, ${remaining} fresh ${remaining === 1 ? "pick is" : "picks are"} waiting in the deck.`),
	cta: "Start swiping",
} as const;

export const EMPTY = {
	title: "Nothing saved yet",
	body: "Save a company from today’s deck and it lands here, sorted into a collection for you. Your STAK builds itself from what you keep.",
	cta: "Go to today’s deck",
	caption: (remaining: number) => (remaining <= 0 ? PICKS_DONE : `${remaining} ${remaining === 1 ? "company is" : "companies are"} waiting in today’s deck`),
} as const;

/** 2:4907's segments and its "  /  " separator (two spaces each side, as the text layer spells it). */
const CRUMB = (name: string) => ["My STAK", "Collections", name];
const CRUMB_SEP = "  /  ";
/** a segment whose spaces are no-break spaces, so a wrap never splits it */
const whole = (segment: string) => segment.replaceAll(" ", " ");

export const COLLECTION_PAGE = {
	crumb: (name: string) => CRUMB(name).join(CRUMB_SEP),
	/**
	 * The same crumb for a column it may wrap in (below 1024): the spaces INSIDE each segment are no-break spaces, so a
	 * wrap falls after a separator and never splits "My STAK" or a name ("Green Energy" stays whole at 320). Read aloud
	 * and drawn exactly as the crumb above.
	 */
	crumbWhole: (name: string) => CRUMB(name).map(whole).join(CRUMB_SEP),
	/**
	 * The crumb as its parts (mystak audit item 10): "My STAK" and "Collections" are links to the overview (where the
	 * collections are), the collection's own name stays plain text; the separators are text between them, so the line
	 * spells and draws exactly 2:4907. `wrap`: the no-break form above (below 1024).
	 */
	crumbParts: (name: string, wrap: boolean) => {
		const [stak, collections, own] = CRUMB(name).map((s) => (wrap ? whole(s) : s));
		return { stak: stak!, collections: collections!, own: own!, sep: CRUMB_SEP };
	},
	/** the crumb's landmark name */
	crumbLabel: "Breadcrumb",
	addStock: "Add stock",
	/** Back's name: where it goes (the overview, its natural parent), or plain "Back" when it steps back elsewhere (D2) */
	back: "Back to My STAK",
	backElsewhere: "Back",
} as const;

/**
 * Remove (mystak audit item 9): the phones' inline confirm row (android ui/mystak/CollectionScreen.kt:158-184, iOS
 * MyStak/CollectionView.swift:92-116: "Remove NVDA from My STAK?" · Keep · Remove), opened by a long press on a stock
 * card or, without one, by the card's named action (the phones' onLongClickLabel / accessibilityAction "Remove from My
 * STAK"): on the web the Delete key on a focused card, which its description announces.
 */
export const REMOVE = {
	/** "My STAK" stays on one line when the question wraps (a phone's row) */
	question: (ticker: string) => `Remove ${ticker} from My STAK?`,
	keep: "Keep",
	remove: "Remove",
	/** the named action (the phones' onLongClickLabel) */
	action: "Remove from My STAK",
	/** the stock cards' description: how to reach Remove without a long press */
	hint: "Press Delete to remove it from My STAK, or touch and hold the card.",
	/** the stock page's Unsave toast (the same action) */
	toast: "Removed from My STAK",
	failed: "Could not update My STAK. Try again.",
} as const;

/**
 * The frames' own figures for the untouched demo persona (live/showcase.ts): 2:4667 My STAK overview and
 * 2:4830 the AI & Tech collection, verbatim, even where they disagree with each other (the cards count 19
 * saves, the allocation and "Your read" count fourteen or fifteen).
 */
export const SHOWCASE = {
	/** the performance card as 2:4793 draws it, with its 3M tab selected */
	performance: {
		range: "3M" as Range,
		eyebrow: "Performance this week",
		value: "+4.9%",
		across: "Across 14 stocks",
		/** the frame's text boxes (2:4817 / 2:4818, 2:4822 / 2:4823): "Worst" hangs off the right edge by them */
		best: { label: "Best this week", ticker: "TSLA", change: "+3.4%", widths: [30, 30] as [number, number] },
		worst: { label: "Worst", ticker: "SNOW", change: "-0.5%", widths: [40, 30] as [number, number] },
	},
	/** the frame's boxes for the right-aligned allocation labels (2:4698 …), so they end where Figma ends them */
	allocationLabelWidths: { "ai-tech": 82, finance: 79, "green-energy": 82, "real-estate": 79, other: 66 } as Record<string, number>,
	/** bar widths are the frame's: 132px for the largest share, the rest by their rounded percentage */
	allocation: [
		{ key: "ai-tech", slug: "ai-tech", name: "Tech & AI", count: 6, share: 42, width: 132, color: "#69b3ca" },
		{ key: "finance", slug: "finance", name: "Finance", count: 3, share: 21, width: 66, color: "#7ab3f0" },
		{ key: "green-energy", slug: "green-energy", name: "Green Energy", count: 3, share: 20, width: 63, color: "#2fd08a" },
		{ key: "real-estate", slug: "real-estate", name: "Real Estate", count: 2, share: 12, width: 38, color: "#9e8ce5" },
		{ key: "other", slug: "other", name: "Other", count: 1, share: 5, width: 16, color: "#5c6b85" },
	] as AllocationRow[],
	insight: {
		title: "You lean into growth and tech.",
		body: "Six of your fourteen picks are tech or AI names. Your STAK skews high-growth, with a small hedge in real estate.",
	},
	discoverBody: "Based on your taste, 8 fresh picks are waiting in the deck.",
	collections: {
		"ai-tech": {
			meta: "+2.4% this week",
			/** the frame's boxes for "5 stocks" and "·" (2:4915 / 2:4916), so the move lands at 2:4917's x */
			metaWidths: [51, 3],
			/** changeWidth: the frame's box for the right-aligned move (2:4925 …), so it ends where Figma ends it */
			stocks: [
				{ ticker: "NVDA", name: "NVIDIA", changeWidth: 57 },
				{ ticker: "AAPL", name: "Apple", changeWidth: 54 },
				{ ticker: "MSFT", name: "Microsoft", changeWidth: 57 },
				{ ticker: "GOOGL", name: "Alphabet", changeWidth: 58 },
				{ ticker: "AMD", name: "Adv Micro", changeWidth: 52 },
			],
		},
	} as Partial<Record<CollectionSlug, { meta: string; metaWidths: [number, number]; stocks: { ticker: string; name: string; changeWidth: number }[] }>>,
};
