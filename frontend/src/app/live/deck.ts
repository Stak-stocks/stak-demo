/**
 * Today's deck: twelve real companies from the catalog, themed, excluding what the person already
 * saved or passed, with the three cards the frames illustrate (AAPL · NVDA · GOOGL) leading the
 * first theme. Progress persists per day; signed-in swipes count against the account's daily
 * limit the way the mobile app's do.
 */
import { DAILY_SWIPE_LIMIT } from "@stak/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { deckCards as authoredCards, deckHeader, type DeckArt, type DeckCardData } from "@/app/discover/data";
import { useAccount } from "@/context/AccountContext";
import { getLocalDateKey } from "@/lib/utils";
import { allTickers, betaOf, brandByTicker, normalizeTicker, primaryCategoryOf, tickerLine, tickersInCategories } from "./catalog";
import { changeLine, money, sentence } from "./format";
import type { DeckProgress } from "./guest";
import { hasDemoQuote, useApiHealth, useQuotes, type Quote } from "./quotes";
import { type Live, useLive } from "./store";

export const DECK_SIZE = deckHeader.total;

export type DeckTheme = { key: string; kicker: string; categories: readonly string[]; pinned?: readonly string[] };

/** Themes rotate with every finished deck; the first one is the frames' "TODAY · AI & CHIPS". */
export const DECK_THEMES: readonly DeckTheme[] = [
	{
		key: "ai-chips",
		kicker: deckHeader.kicker,
		categories: ["semiconductor", "semiconductor_equipment", "mega_cap_tech", "enterprise_software", "automation_ai", "database_data", "consumer_tech", "default_tech", "social_media"],
		pinned: ["AAPL", "NVDA", "GOOGL"],
	},
	{
		key: "brands",
		kicker: "TODAY · BRANDS YOU KNOW",
		categories: ["restaurant", "retail", "ecommerce_marketplace", "apparel_beauty", "beverage", "consumer_staples", "streaming_media", "travel_rideshare", "home_retail", "auto_ev"],
	},
	{
		key: "money",
		kicker: "TODAY · MONEY MOVERS",
		categories: ["bank", "fintech_payments", "payment_network", "capital_markets", "asset_manager", "insurance", "crypto_fintech", "financial_data"],
	},
	{
		key: "health",
		kicker: "TODAY · HEALTH & SCIENCE",
		categories: ["healthcare_pharma", "medical_devices", "biotech", "health_insurance", "digital_health"],
	},
	{
		key: "energy",
		kicker: "TODAY · ENERGY & INDUSTRY",
		categories: ["clean_energy", "utilities", "energy_oilgas", "industrial", "aerospace_defense", "space_airmobility", "transport_logistics", "metals_mining", "airline"],
	},
];

const TIPS: Record<string, string> = {
	semiconductor: "Chip stocks swing hard. Small stakes, long views.",
	semiconductor_equipment: "Chip stocks swing hard. Small stakes, long views.",
	enterprise_software: "Software sells subscriptions, so revenue arrives in steady steps.",
	database_data: "Growth names price in the future. Earnings days move them most.",
	cybersecurity: "Growth names price in the future. Earnings days move them most.",
	automation_ai: "Growth names price in the future. Earnings days move them most.",
	mega_cap_tech: "Steady giants move slower. Stable stocks often do.",
	consumer_tech: "Steady giants move slower. Stable stocks often do.",
	default_tech: "Steady giants move slower. Stable stocks often do.",
	social_media: "Ad money moves with the economy, so some quarters just drift.",
	adtech: "Ad money moves with the economy, so some quarters just drift.",
	bank: "Banks earn on rates. When rates move, so do they.",
	insurance: "Insurers earn on premiums and patience. Slow, steady names.",
	capital_markets: "Banks earn on rates. When rates move, so do they.",
	asset_manager: "Fees follow the market. Good years compound, bad years sting.",
	private_equity: "Fees follow the market. Good years compound, bad years sting.",
	financial_data: "Data sells on subscription. Steady revenue, premium price tag.",
	fintech_payments: "Payments ride consumer spending. Watch the holiday quarters.",
	payment_network: "Payments ride consumer spending. Watch the holiday quarters.",
	crypto_fintech: "Crypto names follow coin prices. Expect wide swings.",
	healthcare_pharma: "Drug pipelines decide the story. Approvals move prices fast.",
	biotech: "Drug pipelines decide the story. Approvals move prices fast.",
	medical_devices: "Devices sell through hospitals. Slow to win, hard to lose.",
	health_insurance: "Insurers earn on premiums and patience. Slow, steady names.",
	digital_health: "Growth names price in the future. Earnings days move them most.",
	clean_energy: "Energy moves with policy and commodity prices, so some quarters just drift.",
	utilities: "Utilities pay dividends and move slowly. Rates set their mood.",
	energy_oilgas: "Energy moves with oil prices, so some quarters just drift.",
	reit: "REITs pay rent as dividends. Rates set their mood.",
	restaurant: "Brands you see every day still trade on quarterly numbers.",
	retail: "Brands you see every day still trade on quarterly numbers.",
	ecommerce_marketplace: "Brands you see every day still trade on quarterly numbers.",
	consumer_staples: "Staples sell in every economy. Slow growth, steady dividends.",
	apparel_beauty: "Fashion runs on seasons. Watch the holiday quarters.",
	beverage: "Staples sell in every economy. Slow growth, steady dividends.",
	travel_rideshare: "Travel follows the economy. Summers decide the year.",
	streaming_media: "Subscribers decide the story. Growth slows, prices rise.",
	gaming: "Hits drive the numbers. One big release can change a year.",
	home_retail: "Home spending follows housing. Rates matter here too.",
	auto_ev: "High beta cuts both ways. Keep positions small.",
	auto_legacy: "Carmakers follow the cycle. Rates and demand set the pace.",
	meme_stock: "High beta cuts both ways. Keep positions small.",
	industrial: "Industrials follow the economic cycle. Orders lead, revenue follows.",
	aerospace_defense: "Defense runs on long contracts. Slow, steady, political.",
	space_airmobility: "High beta cuts both ways. Keep positions small.",
	transport_logistics: "Shipping follows trade. Volumes lead, prices follow.",
	airline: "Airlines live on fuel and demand. Expect wide swings.",
	metals_mining: "Miners follow metal prices, so some quarters just drift.",
	telecom: "Telecoms pay dividends and move slowly. Rates set their mood.",
};
const DEFAULT_TIP = "Prices are real. Small stakes make the swings easier to learn from.";

function tipFor(ticker: string): string {
	const beta = betaOf(ticker);
	if (beta !== null && beta >= 1.6) return "High beta cuts both ways. Keep positions small.";
	return TIPS[primaryCategoryOf(ticker)] ?? DEFAULT_TIP;
}

const hash = (s: string) => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
};

/** Deterministic shuffle (mulberry32) so a day's deck is the same on every reload. */
function shuffle<T>(arr: readonly T[], seed: string): T[] {
	let a = hash(seed) || 1;
	const rand = () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const out = [...arr];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
}

/** The ordered tickers of a deck for a theme, skipping what is excluded; demo mode keeps to priced names. */
export function buildDeckOrder(theme: DeckTheme, exclude: ReadonlySet<string>, seedKey: string, demoOnly: boolean): string[] {
	const ok = (t: string) => !exclude.has(t) && (!demoOnly || hasDemoQuote(t));
	const pinned = (theme.pinned ?? []).filter(ok);
	const pool = tickersInCategories(theme.categories).filter((t) => ok(t) && !pinned.includes(t));
	const order = [...pinned, ...shuffle(pool, seedKey).slice(0, Math.max(0, DECK_SIZE - pinned.length))];
	if (order.length < DECK_SIZE) {
		const extra = shuffle(
			allTickers().filter((t) => ok(t) && !order.includes(t)),
			`${seedKey}:extra`,
		).slice(0, DECK_SIZE - order.length);
		order.push(...extra);
	}
	return order;
}

export type DeckCard = DeckCardData & { quote: Quote | null; saved: boolean; held: boolean };

/** Card copy: the frames' authored lines for their three companies, the catalog's voice for the rest. */
export function cardFor(ticker: string, quote: Quote | null, live?: Pick<Live, "savedTickers" | "positions">): DeckCard {
	const T = normalizeTicker(ticker);
	const authored = authoredCards.find((c) => c.symbol === T);
	const price = quote ? money(quote.price) : (authored?.price ?? "—");
	const change = quote ? changeLine(quote.changePercent) : (authored?.change ?? "");
	const base: DeckCardData = authored
		? { ...authored, price, change }
		: {
				symbol: T,
				ticker: tickerLine(T),
				headline: sentence(brandByTicker(T)?.personalityDescription || brandByTicker(T)?.bio || T),
				price,
				change,
				tip: tipFor(T),
				art: "logo" as DeckArt,
			};
	return { ...base, quote, saved: live?.savedTickers.has(T) ?? false, held: live?.positions.some((p) => p.ticker === T) ?? false };
}

export type Deck = {
	theme: DeckTheme;
	date: string;
	order: string[];
	cards: DeckCard[];
	/** the card the pointer is on (0-based) */
	index: number;
	current: DeckCard | undefined;
	/** "n" of "n/12": cards decided so far (the current one counts once it is saved) */
	counter: number;
	total: number;
	decided: Set<string>;
	done: boolean;
	limitReached: boolean;
	swipeLimit: number;
	go: (index: number) => void;
	pass: (ticker: string) => Promise<boolean>;
	save: (ticker: string, price?: number | null) => Promise<boolean>;
	unsave: (ticker: string) => Promise<void>;
	markBought: (ticker: string) => void;
	finish: () => void;
	restart: () => void;
};

export function useDeck(): Deck {
	const live = useLive();
	const acct = useAccount();
	const healthy = useApiHealth();
	const date = getLocalDateKey();
	const theme = DECK_THEMES[live.completedDecks % DECK_THEMES.length]!;
	const progress = live.deck && live.deck.date === date && live.deck.theme === theme.key ? live.deck : null;
	const [limitReached, setLimitReached] = useState(false);

	const order = useMemo(() => {
		if (progress) return progress.order;
		const exclude = new Set<string>([...live.savedTickers, ...live.passed]);
		return buildDeckOrder(theme, exclude, `${date}:${theme.key}:${live.uid ?? "guest"}`, !healthy);
		// the order is frozen once persisted; saves made mid-deck must not reshuffle it
	}, [progress, theme, date, live.uid, healthy, live.savedTickers, live.passed]);

	// persist a freshly built deck once, so reloads and later saves keep the same twelve cards
	useEffect(() => {
		if (progress || !live.ready) return;
		live.actions.setDeck({ date, theme: theme.key, order, index: 0, saved: [], passed: [], bought: [] });
	}, [progress, live.ready, live.actions, date, theme.key, order]);

	const quotes = useQuotes(order);
	const cards = useMemo(() => order.map((t) => cardFor(t, quotes[t] ?? null, live)), [order, quotes, live]);
	const index = Math.min(progress?.index ?? 0, order.length);
	const decided = useMemo(
		() => new Set<string>([...(progress?.saved ?? []), ...(progress?.passed ?? []), ...(progress?.bought ?? [])]),
		[progress],
	);
	const current = cards[index];
	const counter = Math.max(index, decided.size - (current && decided.has(current.symbol) ? 1 : 0)) + (current && decided.has(current.symbol) ? 1 : 0);

	const patch = useCallback(
		(fn: (p: DeckProgress) => Partial<DeckProgress>) =>
			live.actions.setDeck((prev) => {
				const base: DeckProgress = prev && prev.date === date && prev.theme === theme.key ? prev : { date, theme: theme.key, order, index: 0, saved: [], passed: [], bought: [] };
				return { ...base, ...fn(base) };
			}),
		[live.actions, date, theme.key, order],
	);

	/** Signed-in swipes are metered by the server (20 a day); the guest persona is not. */
	const meter = useCallback(async () => {
		if (!live.signedIn) return true;
		try {
			const r = await acct.incrementSwipeCount();
			if (!r.accepted) {
				setLimitReached(true);
				return false;
			}
		} catch {
			/* offline API: let the swipe through, the server will catch up */
		}
		return true;
	}, [live.signedIn, acct]);

	const pass = useCallback(
		async (ticker: string) => {
			const T = normalizeTicker(ticker);
			if (!(await meter())) return false;
			patch((p) => ({ passed: [...new Set([...p.passed, T])], index: Math.max(p.index, p.order.indexOf(T) + 1) }));
			live.actions.pass(T).catch(() => {});
			return true;
		},
		[meter, patch, live.actions],
	);

	const save = useCallback(
		async (ticker: string, price: number | null = null) => {
			const T = normalizeTicker(ticker);
			if (!(await meter())) return false;
			patch((p) => ({ saved: [...new Set([...p.saved, T])], passed: p.passed.filter((x) => x !== T) }));
			live.actions.save(T, price).catch(() => {});
			return true;
		},
		[meter, patch, live.actions],
	);

	const unsave = useCallback(
		async (ticker: string) => {
			const T = normalizeTicker(ticker);
			patch((p) => ({ saved: p.saved.filter((x) => x !== T) }));
			await live.actions.unsave(T).catch(() => {});
		},
		[patch, live.actions],
	);

	const markBought = useCallback((ticker: string) => patch((p) => ({ bought: [...new Set([...p.bought, normalizeTicker(ticker)])] })), [patch]);
	const go = useCallback((i: number) => patch((p) => ({ index: Math.max(0, Math.min(p.order.length, i)) })), [patch]);
	const finish = useCallback(() => {
		if (progress?.completed) return;
		patch((p) => ({ index: p.order.length, completed: true }));
		live.actions.completeDeck();
	}, [patch, progress?.completed, live.actions]);
	const restart = useCallback(() => live.actions.setDeck(null), [live.actions]);

	return {
		theme,
		date,
		order,
		cards,
		index,
		current,
		counter,
		total: DECK_SIZE,
		decided,
		done: index >= order.length && order.length > 0,
		limitReached,
		swipeLimit: DAILY_SWIPE_LIMIT,
		go,
		pass,
		save,
		unsave,
		markBought,
		finish,
		restart,
	};
}
