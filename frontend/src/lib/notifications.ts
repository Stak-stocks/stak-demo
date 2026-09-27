// The notification inbox, built on-device exactly like Android's StakNotifications.kt: nothing is
// stored server-side except which item ids were read (GET/PUT /api/me/android-state), so a read
// on either app is a read on both. Item ids must match Android's format for that to hold.

export interface NotificationItem {
	id: string;
	title: string;
	body: string;
	time: string;
}

export type CloseRef = "today" | "close" | "yesterday" | "Friday";

/** Where a price move sits in the session - Android's "today / at today's close / ..." wording. */
function sessionPhrase(ref: CloseRef): { title: string; time: string } {
	switch (ref) {
		case "close": return { title: "at today's close", time: "Today's close" };
		case "yesterday": return { title: "at yesterday's close", time: "Yesterday's close" };
		case "Friday": return { title: "at Friday's close", time: "Friday's close" };
		default: return { title: "today", time: "Today" };
	}
}

/** "Just now" / "5m ago" / "3h ago" / "2d ago" for an elapsed time in ms (the Welcome item's age, My STAK's activity). */
export function ageLabel(ms: number): string {
	const mins = Math.floor(ms / 60000);
	if (mins < 1) return "Just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

export const PRICE_MOVE_THRESHOLD_PCT = 3;
const WELCOME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface BuildInput {
	/** Saved stocks with today's move (changePercent), from the same batch-quotes feed My STAK uses. */
	held: Array<{ ticker: string; name?: string; changePercent: number | null }>;
	closeRef: CloseRef;
	/** Eastern-time market day, e.g. "2026-09-26" - so a move is unread again each new day. */
	marketDay: string;
	deckCardsLeft: number;
	deckDay: string;
	/** ISO account creation time, if known. */
	createdAt?: string;
	firstName?: string;
	now?: number;
	threshold?: number;
	/** Notification settings (default on) - off hides that kind of item, like Android's prefs. */
	priceAlerts?: boolean;
	dailyDeck?: boolean;
}

/** Same order as Android: price moves (biggest first), daily deck, first-save prompt, welcome. */
export function buildNotifications(input: BuildInput): NotificationItem[] {
	const { held, closeRef, marketDay, deckCardsLeft, deckDay, createdAt, firstName } = input;
	const threshold = input.threshold ?? PRICE_MOVE_THRESHOLD_PCT;
	const now = input.now ?? Date.now();
	const items: NotificationItem[] = [];

	const phrase = sessionPhrase(closeRef);
	const moves = (input.priceAlerts === false ? [] : held)
		.filter((h) => h.changePercent != null && Math.abs(h.changePercent) >= threshold)
		.sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!));
	for (const m of moves) {
		const up = m.changePercent! >= 0;
		const pct = Math.abs(m.changePercent!).toFixed(1);
		items.push({
			id: `move:${marketDay}:${m.ticker}:${up ? "up" : "down"}`,
			title: `${m.ticker} is ${up ? "up" : "down"} ${pct}% ${phrase.title}`,
			body: m.name
				? `${m.name}, one of your saved stocks, moved more than ${threshold}%.`
				: `One of your saved stocks moved more than ${threshold}%.`,
			time: phrase.time,
		});
	}

	if (deckCardsLeft > 0 && input.dailyDeck !== false) {
		items.push({
			id: `deck:${deckDay}`,
			title: "Your deck is ready",
			body: `${deckCardsLeft} ${deckCardsLeft === 1 ? "card" : "cards"} left today, tuned to your taste.`,
			time: "Today",
		});
	}

	if (held.length === 0) {
		items.push({
			id: "first-save",
			title: "Save a stock to start your STAK",
			body: "Saved stocks power My STAK and the Simulate leaderboard.",
			time: "Today",
		});
	}

	if (createdAt) {
		const age = now - new Date(createdAt).getTime();
		if (Number.isFinite(age) && age >= 0 && age < WELCOME_WINDOW_MS) {
			items.push({
				id: "welcome",
				title: firstName ? `Welcome to STAK, ${firstName}` : "Welcome to STAK",
				body: "Your first deck is waiting in Discover. Swipe down for the next card, save what you like.",
				time: ageLabel(age),
			});
		}
	}

	return items;
}

/** Ids not yet marked read - drives the bell dot and the unread dots on rows. */
export function unreadIds(items: NotificationItem[], read: ReadonlySet<string>): string[] {
	return items.filter((i) => !read.has(i.id)).map((i) => i.id);
}
