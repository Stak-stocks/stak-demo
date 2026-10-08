/**
 * Notifications are derived from what actually happened: practice orders filled today, a deck
 * finished, the daily brief not yet opened, saved companies moving more than 2%, positions
 * closed. The guest persona starts with the frames' five rows until it acts. Read state is local.
 */
import { useCallback, useMemo } from "react";
import { notifications as copy } from "@/app/notifications/data";
import { getLocalDateKey } from "@/lib/utils";
import { normalizeTicker } from "./catalog";
import { money, pct1, shares4 } from "./format";
import { useQuotes } from "./quotes";
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
const startOfToday = () => {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};

/** The five rows of Figma 2:2728, as the guest's starting inbox. */
function seedNotices(now: number): Omit<Notice, "unread">[] {
	const t = copy.today.items;
	const e = copy.earlier.items;
	return [
		{ id: "seed-nvda", title: t[0]!.title, body: t[0]!.body, at: now - 2 * 3_600_000, group: "today", href: "/stocks/NVDA?saved=1&from=my-stak" },
		{ id: "seed-brief", title: t[1]!.title, body: t[1]!.body, at: now - 5 * 3_600_000, group: "today", href: "/news" },
		{ id: "seed-order", title: t[2]!.title, body: t[2]!.body, at: now - 7 * 3_600_000, group: "today", href: "/simulate/picks/NVDA" },
		{ id: "seed-recap", title: e[0]!.title, body: e[0]!.body, at: now - 3 * DAY, group: "earlier", href: "/simulate" },
		{ id: "seed-deck", title: e[1]!.title, body: e[1]!.body, at: now - 4 * DAY, group: "earlier", href: "/discover/end" },
	];
}

function derive(live: Live, moves: { ticker: string; pct: number }[], now: number): Omit<Notice, "unread">[] {
	const today = getLocalDateKey();
	const dayStart = startOfToday();
	const out: Omit<Notice, "unread">[] = [];
	for (const p of live.positions) {
		if (p.addedAt >= dayStart)
			out.push({
				id: `order-${p.ticker}-${p.addedAt}`,
				title: "Practice order filled",
				body: `${shares4(p.shares)} ${p.ticker} at ${money(p.priceAtAdd ?? 0)} · paper`,
				at: p.addedAt,
				group: "today",
				href: `/simulate/picks/${p.ticker}`,
			});
	}
	for (const s of live.sold) {
		if (s.soldAt >= dayStart)
			out.push({
				id: `sold-${s.ticker}-${s.soldAt}`,
				title: "Position closed",
				body: `${shares4(s.shares)} ${s.ticker} returned ${money(s.proceeds)} to your cash · paper`,
				at: s.soldAt,
				group: "today",
				href: "/simulate/portfolio",
			});
	}
	if (live.deck?.completed && live.deck.date === today)
		out.push({ id: `deck-${today}`, title: "Deck complete", body: "You finished today’s deck. 12 of 12.", at: now - 60_000, group: "today", href: "/discover/end" });
	if (live.lastBriefDate !== today)
		out.push({ id: `brief-${today}`, title: "Your daily brief is ready", body: "Three stories matter for your STAK this morning.", at: dayStart + 6 * 3_600_000, group: "today", href: "/news" });
	for (const m of moves) {
		out.push({
			id: `move-${m.ticker}-${today}`,
			title: `${m.ticker} is ${m.pct < 0 ? "down" : "up"} ${pct1(m.pct)} today`,
			body: "One of your picks is moving. Tap to see why.",
			at: dayStart + 9.5 * 3_600_000,
			group: "today",
			href: `/stocks/${m.ticker}?saved=1&from=my-stak`,
		});
	}
	return out;
}

export function useNotifications() {
	const live = useLive();
	const saved = useMemo(() => [...live.savedTickers].slice(0, 24), [live.savedTickers]);
	const quotes = useQuotes(saved);
	const now = Date.now();

	const items = useMemo<Notice[]>(() => {
		const moves = saved
			.map((t) => ({ ticker: normalizeTicker(t), pct: quotes[normalizeTicker(t)]?.changePercent ?? 0 }))
			.filter((m) => Math.abs(m.pct) >= 2)
			.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
			.slice(0, 3);
		const derived = derive(live, moves, now);
		const untouched = !live.signedIn && live.sold.length === 2 && live.positions.length === 6 && !live.deck;
		const base = untouched ? [...derived.filter((n) => !n.id.startsWith("brief-") && !n.id.startsWith("move-")), ...seedNotices(now)] : derived;
		const dismissed = new Set(live.dismissed);
		const read = new Set(live.read);
		return base
			.filter((n) => !dismissed.has(n.id))
			.sort((a, b) => b.at - a.at)
			.map((n) => ({ ...n, unread: !read.has(n.id) }));
	}, [live, saved, quotes, now]);

	const unread = items.filter((n) => n.unread).length;
	const markAllRead = useCallback(() => live.actions.markRead(items.map((n) => n.id)), [live.actions, items]);
	const markRead = useCallback((id: string) => live.actions.markRead([id]), [live.actions]);

	return { items, today: items.filter((n) => n.group === "today"), earlier: items.filter((n) => n.group === "earlier"), unread, markAllRead, markRead };
}
