/**
 * Notifications are derived from what actually happened, as the person's notification settings allow
 * (src/app/notifications/settings.ts, Profile › Notifications): practice orders filled today, positions closed, today's
 * deck (a morning "your deck is ready" until it is started, "Deck complete" once it is done), the daily brief not yet
 * read today, saved or held companies moving at least the chosen threshold, and a new account's welcome. The untouched
 * signed-out visitor sees the frames' five rows (2:2728) while the app's showcase rule holds (live/showcase.ts, the rule
 * every other screen follows), so its first action of any kind, a save on a stock page included, switches the inbox to
 * what the person's activity raised. Read state is local.
 *
 * The phones' inbox (android ui/StakNotifications.kt, ios StakNotifications.swift) is the reference for the rows the
 * desktop frame does not draw: a new account's "Welcome to STAK, <name>" and "Save a stock to start your STAK", dated
 * from the account's creation day, the second leaving at the first save (StakNotifications.kt:42-52). Neither phone
 * derives a weekly recap (they show the frame's one for the demo only, StakNotifications.kt:30), so the web does not.
 * The morning deck row is the web's form of the Daily deck setting's own promise ("One reminder when a fresh deck lands
 * each morning", android ui/profile/SettingsScreens.kt:174, ios Profile/SettingsViews.swift:170), which neither phone
 * delivers; kept by the coordinator's ruling of 2026-11-07 03:00.
 *
 * THE TRADE ROWS COME FROM THE LEDGER'S OWN RECORDS (coordinator rulings N23r, N27c, N27aa; the hunt's NUM-04, ST-06):
 * one "Practice order filled" row per LOT bought today (ledger.ts positionLots: a top-up is its own lot, with the
 * order's own shares and price) and one row per sale, titled by what the sale itself recorded (SoldEntry.closed). A row
 * therefore never changes after later trades: before, the order row printed the current holding at its average cost, a
 * top-up of an older pick raised no row at all, and every sale of the day flipped between "Sold part of" and "Position
 * closed" with the positions held at the moment of reading.
 * The orders of a pick that is gone are read from its CLOSING sale's lots only (`closed === true`). Since the review of
 * 2026-11-09 every sale records the buys it sold (ledger.ts saleRecord, for the value history); a part sale's buys are
 * still lots of the position, so reading them too would raise each order's row twice.
 * A signed-in account's positions carry the lots this browser kept for them (store.ts, guest.ts AccountLocal), so its
 * rows are built the same way (follow-up F9).
 *
 * The brief's companies come from live/brief.ts: this module, which the bell on every page loads, imports nothing from
 * src/app/news (N32e).
 */
import { useCallback, useMemo } from "react";
import { notifications as copy } from "@/app/notifications/data";
import { type NotificationSettings, useNotificationSettings } from "@/app/notifications/settings";
import { useAccountDisplay } from "@/app/useAccountDisplay";
import { briefTickers } from "./brief";
import { normalizeTicker } from "./catalog";
import { DECK_SIZE } from "./deck";
import { money, pct1, shares4, toneOf } from "./format";
import type { Lot } from "./guest";
import { positionLots } from "./ledger";
import { useQuotes } from "./quotes";
import { isShowcase } from "./showcase";
import { type Live, useLive } from "./store";

export type Notice = {
	id: string;
	title: string;
	body: string;
	at: number;
	group: "today" | "earlier";
	href: string;
	unread: boolean;
};

const DAY = 86_400_000;
const startOfDay = (t: number) => {
	const d = new Date(t);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};
/** The local calendar day of `t` as live.lastBriefDate and the deck store it (lib/utils getLocalDateKey's "YYYY-MM-DD"). */
const dateKeyOf = (t: number) => {
	const d = new Date(t);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** At most this many "is moving" rows, the biggest moves first (the frame draws one). */
export const MAX_MOVE_NOTICES = 3;
/** The frame's seeded move row ("NVDA is up 4.2% today", 2:2737): the move its copy states. */
const SEED_MOVE_PCT = 4.2;

/** The rows the copy below adds to the frame's (the phones' wording where they have a row; see the module comment). */
export const NOTICE_COPY = {
	briefNoSaves: "Three stories to know this morning.",
	/**
	 * The brief row counts the stories of today's brief that really touch the person's saves (C-07, N30.8p): Figma's
	 * sentence for three (2:2728) and its own form for one and two; none: the neutral line above.
	 */
	briefForStak: ["One story matters for your STAK this morning.", "Two stories matter for your STAK this morning.", "Three stories matter for your STAK this morning."],
	deckReady: { title: "Your daily deck is ready", body: `${DECK_SIZE} fresh cards are waiting in Discover.` },
	welcome: {
		title: (name: string) => (name ? `Welcome to STAK, ${name}` : "Welcome to STAK"),
		first: "Your first deck is waiting in Discover. Save what you like.",
		seen: "Your deck is in Discover. Save what you like.",
	},
	// what a save really powers (C-11a, N30.8q): My STAK and Simulate's Saved staks; the leaderboard needs a trade (the
	// phones' line names the leaderboard: android ui/StakNotifications.kt:50)
	firstSave: { title: "Save a stock to start your STAK", body: "Saved stocks power My STAK and Simulate’s Saved staks." },
} as const;

/** The five rows of Figma 2:2728, as the guest's starting inbox. Each opens the page the phones open for it. */
export function seedNotices(now: number): Omit<Notice, "unread">[] {
	const t = copy.today.items;
	const e = copy.earlier.items;
	return [
		// NVDA's own page as the persona has it: one of its Simulate picks, not a My STAK save (a move row's rule below)
		{ id: "seed-nvda", title: t[0]!.title, body: t[0]!.body, at: now - 2 * 3_600_000, group: "today", href: "/stocks/NVDA" },
		{ id: "seed-brief", title: t[1]!.title, body: t[1]!.body, at: now - 5 * 3_600_000, group: "today", href: "/news" },
		// the persona's NVDA pick (android StakNavHost.kt:719-720 Target.Pick, ios MainTabsView.swift:385)
		{ id: "seed-order", title: t[2]!.title, body: t[2]!.body, at: now - 7 * 3_600_000, group: "today", href: "/simulate/picks/NVDA" },
		{ id: "seed-recap", title: e[0]!.title, body: e[0]!.body, at: now - 3 * DAY, group: "earlier", href: "/simulate" },
		// an old deck's row opens today's deck (the phones' default Target.Discover: StakNotifications.kt:23 / 31, StakNavHost.kt:723)
		{ id: "seed-deck", title: e[1]!.title, body: e[1]!.body, at: now - 4 * DAY, group: "earlier", href: "/discover" },
	];
}

/** A company moving today: its ticker, its % change, and whether My STAK holds it (the row opens that entry). */
export type Move = { ticker: string; pct: number; saved: boolean };

export type DeriveContext = {
	moves: readonly Move[];
	settings: NotificationSettings;
	now: number;
	/** the name the welcome row greets (the Home greeting's first name) */
	firstName: string;
	/**
	 * The companies today's brief is about, one per story (briefTickers(); the hook passes them). The brief row counts
	 * those the person saved. Absent (a caller that does not know the brief): the frame's sentence whenever something is
	 * saved, as before 2026-11-09.
	 */
	briefTickers?: readonly string[];
};

/** The companies of today's brief, one per story (News' Today's brief 2:4372: its three stories' own tickers; live/brief.ts). */
export { BRIEF_COMPANIES, briefTickers } from "./brief";

/**
 * The brief row's sentence: how many of the brief's stories touch the person's saves (C-07). Before, any save at all
 * read "Three stories matter for your STAK" although none of the three was about a saved company.
 */
export function briefLine(saves: readonly { ticker: string }[], brief: readonly string[] | undefined): string {
	if (saves.length === 0) return NOTICE_COPY.briefNoSaves;
	if (!brief) return NOTICE_COPY.briefForStak[2];
	const saved = new Set(saves.map((s) => normalizeTicker(s.ticker)));
	const n = Math.min(3, new Set(brief.map(normalizeTicker).filter((t) => saved.has(t))).size);
	return n === 0 ? NOTICE_COPY.briefNoSaves : NOTICE_COPY.briefForStak[n - 1]!;
}

/** What the whole inbox needs besides the derived rows' context. */
export type InboxContext = DeriveContext & {
	/**
	 * The app's showcase rule holds (live/showcase.ts isShowcase: signed out, no deck decision, the seed's cash, holdings,
	 * sales and saves): the untouched visitor of the frames, whose inbox is the frame's own.
	 */
	showcase: boolean;
};

/** Deck decisions of a deck progress: saves, passes and buys. */
const decisions = (d: Live["deck"]) => (d ? d.saved.length + d.passed.length + d.bought.length : 0);

/**
 * The guest persona of the frames (the signed-out demo whose ledger is the frames': live/ledger.ts). Everyone else, an
 * account above all, is a person of their own and gets the phones' welcome rows (StakNotifications.kt:66: the demo
 * account carries its authored inbox, "a new account gets its welcome").
 */
export const isDemoPersona = (live: Pick<Live, "signedIn" | "offBook">) => !live.signedIn && !!live.offBook;

/**
 * Whether the person has gone past a deck card, today or before. The phones count a card as seen when the deck
 * advances past it (DeckSession.seen, android ui/discover/DiscoverScreen.kt:386-407): a pass, an arrow to the next
 * card, a finished deck. A Save or a Practice buy leaves the card in front (the Save chip keeps it since the 2026-10-07
 * prototype read), so neither counts.
 */
export function hasSeenACard(live: Pick<Live, "deck" | "completedDecks" | "passed">): boolean {
	const d = live.deck;
	return live.completedDecks > 0 || live.passed.length > 0 || (!!d && (d.index > 0 || d.passed.length > 0 || !!d.completed));
}

type DeriveLive = Pick<
	Live,
	"positions" | "sold" | "deck" | "completedDecks" | "passed" | "lastBriefDate" | "saves" | "signedIn" | "offBook" | "createdAt"
>;

/** Everything the person's activity raises today (and a new account's welcome), as the settings allow. */
export function deriveNotices(live: DeriveLive, ctx: DeriveContext): Omit<Notice, "unread">[] {
	const { settings, now } = ctx;
	const today = dateKeyOf(now);
	const dayStart = startOfDay(now);
	const out: Omit<Notice, "unread">[] = [];
	// one row per order filled today: every lot of every pick held, and the lots of the picks closed since (their
	// CLOSING sale keeps them; a part sale's buys are still the position's lots), each with the order's OWN shares and price
	const order = (ticker: string, lot: Lot, held: boolean) => {
		if (!(lot.at >= dayStart)) return;
		out.push({
			id: `order-${ticker}-${lot.at}`,
			title: "Practice order filled",
			body: `${shares4(lot.bought ?? lot.shares)} ${ticker} at ${money(lot.price)} · paper`,
			at: lot.at,
			group: "today",
			// the pick's page while it is held; a pick sold since is on the Portfolio, under SOLD
			href: held ? `/simulate/picks/${ticker}` : "/simulate/portfolio",
		});
	};
	const held = new Set(live.positions.map((p) => p.ticker));
	for (const p of live.positions) for (const lot of positionLots(p)) order(p.ticker, lot, true);
	for (const s of live.sold) if (s.closed === true) for (const lot of s.lots ?? []) order(s.ticker, lot, held.has(s.ticker));
	for (const s of live.sold) {
		if (!(s.soldAt >= dayStart)) continue;
		// what the sale itself recorded; a record from before 2026-11-09 has no `closed` and is read as it was then (the
		// position is still open: a part sale)
		const closed = s.closed ?? !held.has(s.ticker);
		out.push({
			id: `sold-${s.ticker}-${s.soldAt}`,
			title: closed ? "Position closed" : `Sold part of ${s.ticker}`,
			body: `${shares4(s.shares)} ${s.ticker} returned ${money(s.proceeds)} to your cash · paper`,
			at: s.soldAt,
			group: "today",
			href: "/simulate/portfolio",
		});
	}
	const deckToday = live.deck?.date === today ? live.deck : null;
	const seen = hasSeenACard(live);
	if (settings.dailyDeck) {
		if (deckToday?.completed)
			out.push({ id: `deck-${today}`, title: "Deck complete", body: "You finished today’s deck. 12 of 12.", at: now - 60_000, group: "today", href: "/discover/end" });
		// "One reminder when a fresh deck lands each morning" (the phones' Daily deck): until today's deck is started. A
		// person who has never gone past a card has the welcome row's "first deck" line instead.
		const started = !!deckToday && (deckToday.index > 0 || decisions(deckToday) > 0 || !!deckToday.completed);
		if (seen && !started)
			out.push({ id: `deck-ready-${today}`, title: NOTICE_COPY.deckReady.title, body: NOTICE_COPY.deckReady.body, at: dayStart + 5.5 * 3_600_000, group: "today", href: "/discover" });
	}
	// the brief row goes once today's brief has been read (live.actions.setLastBriefDate, called where the brief is shown)
	if (settings.marketNews && live.lastBriefDate !== today)
		out.push({
			id: `brief-${today}`,
			title: "Your daily brief is ready",
			// "your STAK" only for the stories that touch a save (briefLine)
			body: briefLine(live.saves, ctx.briefTickers),
			at: dayStart + 6 * 3_600_000,
			group: "today",
			href: "/news",
		});
	if (settings.priceAlerts) {
		for (const m of ctx.moves) {
			if (toneOf(m.pct, 1) === "flat") continue; // zero is neutral (N23c): "is up 0.0% today" is not a move
			out.push({
				id: `move-${m.ticker}-${today}`,
				title: `${m.ticker} is ${m.pct < 0 ? "down" : "up"} ${pct1(m.pct)} today`,
				body: "One of your picks is moving. Tap to see why.",
				at: dayStart + 9.5 * 3_600_000,
				group: "today",
				// a saved company opens its My STAK entry, any other pick its stock page (android StakNavHost.kt:716-718, ios MainTabsView.swift:384)
				href: m.saved ? `/stocks/${m.ticker}?from=my-stak` : `/stocks/${m.ticker}`,
			});
		}
	}
	if (!isDemoPersona(live)) {
		// dated from the day the account was created (the phones' createdAgo), so a later day files them under EARLIER
		const created = live.createdAt ?? now;
		const group = created >= dayStart ? "today" : "earlier";
		out.push({ id: "welcome", title: NOTICE_COPY.welcome.title(ctx.firstName), body: seen ? NOTICE_COPY.welcome.seen : NOTICE_COPY.welcome.first, at: created, group, href: "/discover" });
		if (live.saves.length === 0) out.push({ id: "first-save", title: NOTICE_COPY.firstSave.title, body: NOTICE_COPY.firstSave.body, at: created - 1, group, href: "/discover" });
	}
	return out;
}

/** The frame's five rows as the settings allow them (the persona before its first action). */
export function seedNoticesFor(live: Pick<Live, "lastBriefDate">, settings: NotificationSettings, now: number): Omit<Notice, "unread">[] {
	const today = dateKeyOf(now);
	return seedNotices(now).filter((n) => {
		if (n.id === "seed-nvda") return settings.priceAlerts && SEED_MOVE_PCT >= settings.priceThreshold;
		if (n.id === "seed-brief") return settings.marketNews && live.lastBriefDate !== today;
		if (n.id === "seed-deck") return settings.dailyDeck;
		return true;
	});
}

/**
 * The companies whose moves can raise a row: every held paper pick and EVERY save, newest first (the frame's copy: "one of
 * your picks is moving"; the phones' setting promises "a saved or bought stock", SettingsScreens.kt:160, so an old save
 * counts too; movesFrom keeps the biggest MAX_MOVE_NOTICES anyway). Until 2026-11-08 only the twelve newest saves counted.
 */
export function moveCandidates(live: Pick<Live, "positions" | "saves">): { ticker: string; saved: boolean }[] {
	const saved = new Set(live.saves.map((s) => normalizeTicker(s.ticker)));
	const recent = [...live.saves].sort((a, b) => b.savedAt - a.savedAt).map((s) => normalizeTicker(s.ticker));
	const held = live.positions.map((p) => normalizeTicker(p.ticker));
	return [...new Set([...held, ...recent])].filter(Boolean).map((ticker) => ({ ticker, saved: saved.has(ticker) }));
}

/** The moves at or past the threshold, biggest first, at most MAX_MOVE_NOTICES. */
export function movesFrom(candidates: readonly { ticker: string; saved: boolean }[], pctOf: (ticker: string) => number | null, threshold: number): Move[] {
	return candidates
		.map((c) => ({ ...c, pct: pctOf(c.ticker) ?? 0 }))
		// a move that prints "0.0%" is not a move (zero is neutral, N23c): no "is up 0.0% today" row at a threshold of 0
		.filter((m) => Math.abs(m.pct) >= threshold && toneOf(m.pct, 1) !== "flat")
		.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
		.slice(0, MAX_MOVE_NOTICES);
}

/**
 * The inbox is the frame's for the demo persona while the app's showcase rule holds, the rule every other screen follows
 * (Home builds today's deck without ending it): its first action of any kind (a deck decision, a trade, a save or an
 * unsave on any page) ends it here too.
 */
const framesInbox = (live: Pick<Live, "signedIn" | "offBook">, ctx: InboxContext) => ctx.showcase && isDemoPersona(live);

/** The whole inbox (pure): the frame's rows while the showcase lasts, then what the person's activity raised, newest first. */
export function inboxFor(live: DeriveLive & Pick<Live, "read" | "dismissed">, ctx: InboxContext): Notice[] {
	const derived = deriveNotices(live, ctx);
	// the untouched visitor's inbox is the frame's: the derived rows the frame has no place for (today's brief and moves,
	// the morning deck row) give way to its own five
	const base = framesInbox(live, ctx)
		? [...derived.filter((n) => !n.id.startsWith("brief-") && !n.id.startsWith("move-") && !n.id.startsWith("deck-ready-")), ...seedNoticesFor(live, ctx.settings, ctx.now)]
		: derived;
	const dismissed = new Set(live.dismissed);
	const read = new Set(live.read);
	return base
		.filter((n) => !dismissed.has(n.id))
		.sort((a, b) => b.at - a.at)
		.map((n) => ({ ...n, unread: !read.has(n.id) }));
}

export function useNotifications() {
	const live = useLive();
	const [settings] = useNotificationSettings();
	const firstName = useAccountDisplay().first;
	const showcase = useMemo(() => isShowcase(live), [live]);
	const candidates = useMemo(() => moveCandidates(live), [live]);
	const quotes = useQuotes(useMemo(() => candidates.map((c) => c.ticker), [candidates]));
	const minute = Math.floor(Date.now() / 60_000); // the inbox re-derives at most once a minute, not on every render
	const now = minute * 60_000;

	const brief = useMemo(briefTickers, []);
	const items = useMemo<Notice[]>(() => {
		const moves = settings.priceAlerts ? movesFrom(candidates, (t) => quotes[t]?.changePercent ?? null, settings.priceThreshold) : [];
		return inboxFor(live, { moves, settings, now, firstName, showcase, briefTickers: brief });
	}, [live, candidates, quotes, settings, now, firstName, showcase, brief]); // `now` only changes with `minute`

	const unread = items.filter((n) => n.unread).length;
	const markAllRead = useCallback(() => live.actions.markRead(items.map((n) => n.id)), [live.actions, items]);
	const markRead = useCallback((id: string) => live.actions.markRead([id]), [live.actions]);

	return { items, today: items.filter((n) => n.group === "today"), earlier: items.filter((n) => n.group === "earlier"), unread, markAllRead, markRead };
}

