import { STAK_WEIGHTED_STOCK_TAGS, type BrandSummary } from "@stak/shared";
import type { PassedEntry } from "@/context/AccountContext";

/**
 * Today's deck, picked by the same rules as the apps (android DiscoverViewModel.todaysPicks, iOS DiscoverViewModel):
 * the server's personalised ranking, minus what's already in My STAK, anything passed in the last day (older passes
 * come back at the end) and anything passed PASS_HIDE_COUNT times; at most MAX_PER_CATEGORY per category; capped at
 * the daily limit. Kept on the server for the day (/api/me/daily-deck), so every device shows the same deck and a
 * reload or a refreshed ranking doesn't reshuffle it part-way through; pinned here too, for when the server can't be
 * reached.
 * Categories come from the shared catalog - the same table the server's ranking sends the apps. Offline, the web ranks
 * by the account's own taste where the apps fall back to catalog order.
 */

/** Most cards from one category in a deck, so one strong interest (every chip stock) can't fill it. */
export const MAX_PER_CATEGORY = 3;
/** Passed this many times, a stock stops coming back to the deck (saving it clears its passes). */
export const PASS_HIDE_COUNT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORY_BY_TICKER = new Map(STAK_WEIGHTED_STOCK_TAGS.map((s) => [s.ticker.toUpperCase(), s.primaryCategory]));
const categoryOf = (brand: BrandSummary) => CATEGORY_BY_TICKER.get(brand.ticker?.toUpperCase() ?? "") ?? brand.ticker;

/** Whether a pass keeps the brand out of the deck now: passed within the day, or PASS_HIDE_COUNT times. */
export function passKeepsOut(entry: PassedEntry | undefined, now = Date.now()): boolean {
	if (!entry) return false;
	return (entry.count ?? 1) >= PASS_HIDE_COUNT || entry.at > now - DAY_MS;
}

/** The first `limit` brands with at most MAX_PER_CATEGORY per category; capped-out ones fill in only when the rest run out. */
export function withCategoryCap(ordered: BrandSummary[], limit: number): BrandSummary[] {
	const perCategory = new Map<string, number>();
	const picks: BrandSummary[] = [];
	const overflow: BrandSummary[] = [];
	for (const brand of ordered) {
		if (picks.length === limit) break;
		const category = categoryOf(brand);
		const count = perCategory.get(category) ?? 0;
		if (count < MAX_PER_CATEGORY) {
			picks.push(brand);
			perCategory.set(category, count + 1);
		} else {
			overflow.push(brand);
		}
	}
	return [...picks, ...overflow.slice(0, limit - picks.length)];
}

/** Every brand the deck could show today, best first: `ranked` (tickers), then the ones it doesn't rank in catalog
 *  order, minus My STAK and kept-out passes; passed-before ones (back now) after the ones never passed. */
export function eligibleInOrder(
	brands: BrandSummary[],
	ranked: string[],
	held: Set<string>,
	passed: PassedEntry[],
	now = Date.now(),
): BrandSummary[] {
	const byTicker = new Map(brands.map((b) => [b.ticker, b]));
	const rankedSet = new Set(ranked);
	const ordered = [...ranked.flatMap((t) => byTicker.get(t) ?? []), ...brands.filter((b) => !rankedSet.has(b.ticker))];
	const passById = new Map(passed.map((e) => [e.id, e]));
	const eligible = ordered.filter((b) => !held.has(b.id) && !passKeepsOut(passById.get(b.id), now));
	return [...eligible.filter((b) => !passById.has(b.id)), ...eligible.filter((b) => passById.has(b.id))];
}

/**
 * Which deck today shows (tickers), or null for an unshared one picked fresh each load (no ranking reached the device).
 * The deck another device - or an earlier visit - picked comes first; else this device's own pin; else one picked now.
 * A new deck is offered to the server, which keeps the first one offered, so two devices opening at once agree.
 */
export async function chooseDailyDeck({ shared, pinned, ranked, pick, offer }: {
	/** The server's deck for the day: [] when none yet, null when it couldn't be reached. */
	shared: string[] | null;
	pinned: string[] | null;
	/** Whether the server's ranking came back (a local fallback ranking is never shared). */
	ranked: boolean;
	pick: () => string[];
	offer: (tickers: string[]) => Promise<string[]>;
}): Promise<string[] | null> {
	if (shared?.length) return shared;
	if (!pinned && !ranked) return null;
	const mine = pinned ?? pick();
	if (!shared) return mine;
	const kept = await offer(mine).catch(() => mine);
	return kept.length > 0 ? kept : mine;
}

/** Bump when the picking rules change, so a deck pinned under the old rules is re-picked (2: tickers, as the server). */
const PIN_VERSION = 2;
const pinKey = (uid: string) => `stak.dailyDeck.${uid}`;

/** The deck pinned on this device for `day` (tickers), if there is one. */
export function readPinnedDeck(uid: string, day: string): string[] | null {
	try {
		const raw = localStorage.getItem(pinKey(uid));
		if (!raw) return null;
		const pin = JSON.parse(raw) as { day?: unknown; version?: unknown; tickers?: unknown };
		if (pin.day !== day || pin.version !== PIN_VERSION || !Array.isArray(pin.tickers)) return null;
		return pin.tickers.filter((t): t is string => typeof t === "string");
	} catch {
		return null;
	}
}

/** Pins `tickers` as this device's deck for `day` (the server's, or one picked from a real ranking - never a fallback). */
export function pinDailyDeck(uid: string, day: string, tickers: string[]): void {
	try { localStorage.setItem(pinKey(uid), JSON.stringify({ day, version: PIN_VERSION, tickers })); } catch { /* unpinned: re-picked next load */ }
}
