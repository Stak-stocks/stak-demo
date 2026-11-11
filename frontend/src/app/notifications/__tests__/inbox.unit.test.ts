import { describe, expect, it } from "vitest";
import type { DeckProgress } from "@/app/live/guest";
import { seedGuest } from "@/app/live/guest";
import { personaOffBook } from "@/app/live/ledger";
import { deriveNotices, hasSeenACard, type InboxContext, inboxFor, MAX_MOVE_NOTICES, moveCandidates, movesFrom, NOTICE_COPY, seedNoticesFor } from "@/app/live/notifications";
import { isShowcase } from "@/app/live/showcase";
import type { Live } from "@/app/live/store";
import { DEFAULT_SETTINGS } from "../settings";

const NOW = new Date(2026, 10, 7, 14, 30).getTime();
const TODAY = "2026-11-07";
const YESTERDAY = "2026-11-06";
const at = (h: number, day = 7) => new Date(2026, 10, day, h, 0).getTime();

/** What the inbox reads, plus the cash the app's showcase rule compares with the seed's. */
type LiveIn = Parameters<typeof inboxFor>[0] & Pick<Live, "cash" | "touched">;

/** A new account created this morning: nothing saved, held, sold or seen. */
const account = (over: Partial<LiveIn> = {}): LiveIn => ({
	signedIn: true,
	offBook: null,
	createdAt: at(9),
	cash: 10000,
	positions: [],
	sold: [],
	deck: null,
	completedDecks: 0,
	passed: [],
	lastBriefDate: null,
	saves: [],
	read: [],
	dismissed: [],
	...over,
});

/** The guest persona of the frames, untouched. */
const persona = (over: Partial<LiveIn> = {}): LiveIn => {
	const s = seedGuest();
	return { ...account(), signedIn: false, offBook: personaOffBook(), createdAt: s.createdAt, cash: s.cash, positions: s.positions, sold: s.sold, saves: s.saves, read: s.read, ...over };
};

/** The app's showcase rule (live/showcase.ts) on a test state: it reads the sign-in, the deck, the cash, holdings, sales and saves. */
const showcaseOf = (live: LiveIn) => isShowcase(live as unknown as Live);

const ctx = (over: Partial<InboxContext> = {}): InboxContext => ({ moves: [], settings: { ...DEFAULT_SETTINGS }, now: NOW, firstName: "Nedu", showcase: false, ...over });
/** The context useNotifications builds: the showcase flag from the app's rule on the same state. */
const ctxFor = (live: LiveIn, over: Partial<InboxContext> = {}) => ctx({ showcase: showcaseOf(live), ...over });
const deck = (over: Partial<DeckProgress> = {}): DeckProgress => ({ date: TODAY, theme: "ai-chips", order: [], index: 0, saved: [], passed: [], bought: [], ...over });
const ids = (list: { id: string }[]) => list.map((n) => n.id);

describe("a new account's inbox (the phones' welcome, StakNotifications.kt:42-52)", () => {
	it("welcomes the person, asks for a first save and keeps the brief without 'your STAK'", () => {
		const inbox = inboxFor(account(), ctx());
		expect(ids(inbox)).toEqual(["welcome", "first-save", `brief-${TODAY}`]);
		const [welcome, firstSave, brief] = inbox;
		expect(welcome!.title).toBe("Welcome to STAK, Nedu");
		expect(welcome!.body).toBe(NOTICE_COPY.welcome.first);
		expect(firstSave!.title).toBe(NOTICE_COPY.firstSave.title);
		expect(brief!.body).toBe(NOTICE_COPY.briefNoSaves);
		// both open Discover, dated from the account's creation (today), unread
		expect(welcome!.href).toBe("/discover");
		expect(firstSave!.href).toBe("/discover");
		expect(inbox.every((n) => n.group === "today" && n.unread)).toBe(true);
	});

	it("drops 'Save a stock' at the first save, and the brief then speaks of the STAK", () => {
		const inbox = inboxFor(account({ saves: [{ ticker: "NVDA", savedAt: at(10), priceAtSave: 122.1 }] }), ctx());
		expect(ids(inbox)).toEqual(["welcome", `brief-${TODAY}`]);
		expect(inbox[1]!.body).toBe("Three stories matter for your STAK this morning.");
	});

	it("says 'Your deck is in Discover' once a card has been seen, and files the welcome under EARLIER on a later day", () => {
		const later = inboxFor(account({ createdAt: at(9, 4), passed: ["AAPL"], deck: deck({ index: 1, passed: ["AAPL"] }) }), ctx());
		const welcome = later.find((n) => n.id === "welcome")!;
		expect(welcome.body).toBe(NOTICE_COPY.welcome.seen);
		expect(welcome.group).toBe("earlier");
		expect(later.find((n) => n.id === "first-save")!.group).toBe("earlier");
	});

	it("counts a card as seen only once the deck has moved past it, as the phones' deck does (DiscoverScreen.kt:386-407)", () => {
		const welcomeOf = (live: LiveIn) => inboxFor(live, ctx()).find((n) => n.id === "welcome")!.body;
		// a Save and a Practice buy of the front card leave it in front: still the first deck
		const keptInFront = account({
			saves: [{ ticker: "NVDA", savedAt: at(10), priceAtSave: 122.1 }],
			positions: [{ ticker: "NVDA", shares: 0.2048, priceAtAdd: 122.1, addedAt: at(10) }],
			deck: deck({ index: 0, order: ["NVDA", "AAPL"], saved: ["NVDA"], bought: ["NVDA"] }),
		});
		expect(hasSeenACard(keptInFront)).toBe(false);
		expect(welcomeOf(keptInFront)).toBe(NOTICE_COPY.welcome.first);
		// the next card (an arrow past a kept card moves the pointer without a pass), a pass, a finished deck
		expect(welcomeOf({ ...keptInFront, deck: deck({ index: 1, order: ["NVDA", "AAPL"], saved: ["NVDA"], bought: ["NVDA"] }) })).toBe(NOTICE_COPY.welcome.seen);
		expect(welcomeOf(account({ deck: deck({ passed: ["NVDA"] }) }))).toBe(NOTICE_COPY.welcome.seen);
		expect(hasSeenACard(account({ deck: deck({ date: YESTERDAY, index: 12, completed: true }) }))).toBe(true);
		expect(hasSeenACard(account({ completedDecks: 1 }))).toBe(true);
		expect(hasSeenACard(account({ passed: ["AAPL"] }))).toBe(true);
	});

	it("greets without a name when there is none", () => {
		expect(inboxFor(account(), ctx({ firstName: "" }))[0]!.title).toBe("Welcome to STAK");
	});
});

describe("the daily rows follow the settings", () => {
	it("clears the brief once today's brief has been read", () => {
		expect(ids(inboxFor(account({ lastBriefDate: TODAY }), ctx()))).not.toContain(`brief-${TODAY}`);
		expect(ids(inboxFor(account({ lastBriefDate: YESTERDAY }), ctx()))).toContain(`brief-${TODAY}`);
	});

	it("drops the brief when Market news is off", () => {
		expect(ids(inboxFor(account(), ctx({ settings: { ...DEFAULT_SETTINGS, marketNews: false } })))).not.toContain(`brief-${TODAY}`);
	});

	it("reminds of today's deck until it is started, once a card has ever been seen; Daily deck off drops the deck rows", () => {
		const yesterdaysDeck = account({ completedDecks: 1, deck: deck({ date: YESTERDAY, index: 12, completed: true }) });
		expect(hasSeenACard(yesterdaysDeck)).toBe(true);
		const inbox = inboxFor(yesterdaysDeck, ctx());
		const ready = inbox.find((n) => n.id === `deck-ready-${TODAY}`)!;
		expect(ready.title).toBe(NOTICE_COPY.deckReady.title);
		expect(ready.body).toBe("12 fresh cards are waiting in Discover.");
		expect(ready.href).toBe("/discover");
		// started today: no reminder
		expect(ids(inboxFor(account({ completedDecks: 1, deck: deck({ index: 2, passed: ["AAPL"], saved: ["NVDA"] }) }), ctx()))).not.toContain(`deck-ready-${TODAY}`);
		// a brand-new account has the welcome's "first deck" line instead
		expect(ids(inboxFor(account(), ctx()))).not.toContain(`deck-ready-${TODAY}`);
		// finished today: "Deck complete", no reminder
		const done = inboxFor(account({ completedDecks: 1, deck: deck({ index: 12, completed: true }) }), ctx());
		expect(ids(done)).toContain(`deck-${TODAY}`);
		expect(ids(done)).not.toContain(`deck-ready-${TODAY}`);
		// Daily deck off: neither
		const off = ctx({ settings: { ...DEFAULT_SETTINGS, dailyDeck: false } });
		expect(ids(inboxFor(yesterdaysDeck, off))).not.toContain(`deck-ready-${TODAY}`);
		expect(ids(inboxFor(account({ completedDecks: 1, deck: deck({ index: 12, completed: true }) }), off))).not.toContain(`deck-${TODAY}`);
	});
});

describe("price moves cover saved and held picks at the threshold", () => {
	const live = account({
		positions: [{ ticker: "TSLA", shares: 1, priceAtAdd: 200, addedAt: at(9, 1) }],
		saves: [
			{ ticker: "MU", savedAt: at(9, 2), priceAtSave: 100 },
			{ ticker: "NVDA", savedAt: at(9, 3), priceAtSave: 100 },
		],
	});

	it("lists every held pick and the most recent saves, knowing which are saved", () => {
		expect(moveCandidates(live)).toEqual([
			{ ticker: "TSLA", saved: false },
			{ ticker: "NVDA", saved: true },
			{ ticker: "MU", saved: true },
		]);
	});

	it("keeps the moves at or past the threshold, biggest first, at most three", () => {
		const pct: Record<string, number> = { TSLA: 3.4, NVDA: 2.4, MU: -4.2 };
		const of = (t: string) => pct[t] ?? null;
		expect(movesFrom(moveCandidates(live), of, 3).map((m) => m.ticker)).toEqual(["MU", "TSLA"]);
		expect(movesFrom(moveCandidates(live), of, 1).map((m) => m.ticker)).toEqual(["MU", "TSLA", "NVDA"]);
		expect(movesFrom(moveCandidates(live), of, 5)).toEqual([]);
		const many = Array.from({ length: 6 }, (_, i) => ({ ticker: `T${i}`, saved: true }));
		expect(movesFrom(many, () => 9, 1)).toHaveLength(MAX_MOVE_NOTICES);
	});

	it("words each move and opens the My STAK entry of a saved company, the stock page of a held one", () => {
		const moves = movesFrom(moveCandidates(live), (t) => ({ TSLA: 3.4, MU: -4.2 })[t] ?? null, 3);
		const inbox = inboxFor(live, ctx({ moves }));
		const mu = inbox.find((n) => n.id === `move-MU-${TODAY}`)!;
		const tsla = inbox.find((n) => n.id === `move-TSLA-${TODAY}`)!;
		expect(mu.title).toBe("MU is down 4.2% today");
		expect(mu.href).toBe("/stocks/MU?from=my-stak");
		expect(tsla.title).toBe("TSLA is up 3.4% today");
		expect(tsla.href).toBe("/stocks/TSLA");
		expect(ids(inboxFor(live, ctx({ moves, settings: { ...DEFAULT_SETTINGS, priceAlerts: false } })))).not.toContain(`move-MU-${TODAY}`);
	});
});

describe("the guest persona's inbox", () => {
	it("is the frame's five rows until it acts (2:2728), each opening the page the phones open", () => {
		expect(showcaseOf(persona())).toBe(true);
		const inbox = inboxFor(persona(), ctxFor(persona(), { moves: [{ ticker: "TSLA", pct: 3.4, saved: true }] }));
		expect(ids(inbox)).toEqual(["seed-nvda", "seed-brief", "seed-order", "seed-recap", "seed-deck"]);
		expect(inbox.map((n) => n.unread)).toEqual([true, true, false, false, false]);
		expect(inbox.find((n) => n.id === "seed-nvda")!.href).toBe("/stocks/NVDA");
		expect(inbox.find((n) => n.id === "seed-order")!.href).toBe("/simulate/picks/NVDA");
		expect(inbox.find((n) => n.id === "seed-deck")!.href).toBe("/discover");
		// no welcome for the demo persona (the phones' demo account carries its authored inbox)
		expect(ids(deriveNotices(persona(), ctx()))).not.toContain("welcome");
	});

	it("follows the settings and today's read brief", () => {
		const fiveOrMore = { ...DEFAULT_SETTINGS, priceThreshold: 5 };
		expect(ids(seedNoticesFor(persona(), fiveOrMore, NOW))).not.toContain("seed-nvda");
		expect(ids(seedNoticesFor(persona(), DEFAULT_SETTINGS, NOW))).toContain("seed-nvda");
		expect(ids(seedNoticesFor(persona({ lastBriefDate: TODAY }), DEFAULT_SETTINGS, NOW))).not.toContain("seed-brief");
		expect(ids(seedNoticesFor(persona(), { ...DEFAULT_SETTINGS, dailyDeck: false }, NOW))).not.toContain("seed-deck");
		expect(ids(seedNoticesFor(persona(), { ...DEFAULT_SETTINGS, marketNews: false }, NOW))).not.toContain("seed-brief");
	});

	it("derives its own rows after the first action", () => {
		const acted = persona({ deck: deck({ index: 1, passed: ["NVDA"] }), passed: ["NVDA"] });
		expect(showcaseOf(acted)).toBe(false);
		const inbox = inboxFor(acted, ctxFor(acted));
		expect(ids(inbox).some((id) => id.startsWith("seed-"))).toBe(false);
		expect(ids(inbox)).toContain(`brief-${TODAY}`);
		expect(ids(inbox)).not.toContain("welcome");
	});

	it("keeps the frame's rows while Home builds today's deck (no decision: the showcase holds)", () => {
		const built = persona({ deck: deck({ order: ["NVDA", "AAPL", "GOOGL"] }) });
		expect(ids(inboxFor(built, ctxFor(built)))).toEqual(["seed-nvda", "seed-brief", "seed-order", "seed-recap", "seed-deck"]);
	});

	it("ends with a save made outside today's deck, as the showcase ends on every other screen (a stock page's Save of KO)", () => {
		const seed = seedGuest();
		const ko = persona({ deck: deck({ order: ["NVDA", "AAPL", "GOOGL"] }), saves: [...seed.saves, { ticker: "KO", savedAt: at(10), priceAtSave: 61.2 }] });
		expect(showcaseOf(ko)).toBe(false);
		const moves = movesFrom(moveCandidates(ko), (t) => ({ TSLA: 3.4 })[t] ?? null, DEFAULT_SETTINGS.priceThreshold);
		const inbox = inboxFor(ko, ctxFor(ko, { moves }));
		expect(ids(inbox).some((id) => id.startsWith("seed-"))).toBe(false);
		expect(ids(inbox)).toEqual([`move-TSLA-${TODAY}`, `brief-${TODAY}`]);
		expect(inbox.find((n) => n.id === `brief-${TODAY}`)!.body).toBe("Three stories matter for your STAK this morning.");
		// an unsave of one of the seed's saves ends it too
		const unsaved = persona({ saves: seed.saves.filter((s) => s.ticker !== "MSFT") });
		expect(ids(inboxFor(unsaved, ctxFor(unsaved))).some((id) => id.startsWith("seed-"))).toBe(false);
	});

	it("stays the person's own once the showcase has ended, with the seed's saves back or not (D7 refined: live.touched)", () => {
		// the store remembers the first action for good (live/showcase.ts, guest.ts `touched`): Save then Unsave leaves the
		// seed's saves in place, and the inbox follows the showcase rule, not the saves
		const touched = persona({ touched: true });
		expect(showcaseOf(touched)).toBe(false);
		const inbox = inboxFor(touched, ctxFor(touched));
		expect(ids(inbox).some((id) => id.startsWith("seed-"))).toBe(false);
		expect(ids(inbox)).toContain(`brief-${TODAY}`);
	});
});
