/**
 * Android's Discover, in web terms. Android lays everything out in "figma units" (1u = 1dp on a 390dp
 * phone, scaled with the screen width); here 1u = `--u`, which DiscoverScreen sets from the width of the
 * phone-shaped column the screen renders in, so every size below is copied straight from the Kotlin.
 */
import { categoryNameOf } from "@stak/shared";
import { usd } from "@/lib/simFormat";

/** `n` figma units as a CSS length. */
export const cu = (n: number) => `calc(${n} * var(--u))`;

export const DISC = {
	sheet: "#181F30",
	cardDark: "#10182B",
	headerGray: "#D3D3DD",
	blue: "#69B3CA",
	redDown: "#E5484D",
	badgeInk: "#9EADC7",
	avatar: "#242B3D",
	navCircle: "#192238",
	tabBar: "#060C1D",
	pageBg: "#0A1020",
	muted: "#819ABB",
	faint: "#5C6B85",
	body: "#C8D2E0",
	teal: "#69B3CA",
	green: "#2FD08A",
	red: "#FF5A6A",
	divider: "#2A3346",
	ink: "#F2F6FC",
	tile: "#1E2030",
	tileBorder: "#3A3A50",
	saveAccent: "#69B3CA",
	passAccent: "#8A94A8",
	buttonIdle: "#1C202E",
	passInk: "#B0B8CC",
	saveTint: "#69B3CA",
	noticeInk: "#D7DEEA",
	/** Android's StakColors.SurfaceAlt: raised inputs and chips on a card. */
	surfaceAlt: "#172037",
	/** Android's StakColors.CardBorder: hairlines on navy cards. */
	cardBorder: "#243049",
	/** Destructive text (Delete) that stays readable on dark panels (redDown is too dim at small sizes). */
	dangerText: "#FF6B6B",
	cta: "linear-gradient(to bottom, #A6E4F7 8.9%, #5DA8BF 39.2%, #3C98B4 72.6%, #3C98B4 100%)",
} as const;

/** Card gradient top colour, then the hero-art backdrop, by deck position mod 7. */
export const CARD_PALETTE: ReadonlyArray<readonly [string, string]> = [
	["#152A47", "#142844"],
	["#283E5D", "#253A59"],
	["#263D5D", "#2F486E"],
	["#1A2E4A", "#192C47"],
	["#1E3552", "#1B3050"],
	["#162840", "#15263E"],
	["#233549", "#203246"],
];

export const CARD_WIDTH = 350;
export const SWIPE_THRESHOLD = 110;
export const UNDO_MS = 3000;

export const DEFAULT_DECK_LABEL = "TODAY'S DECK";

/** "TODAY · CHIPS, E-COMMERCE & MORE": the deck's own leading categories (ties keep rank order). */
export function deckLabelFor(tickers: string[]): string {
	const names = tickers.map(categoryNameOf).filter((c): c is string => !!c);
	if (names.length === 0) return DEFAULT_DECK_LABEL;
	const counts = new Map<string, number>();
	for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
	const top = [...new Set(names)].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
	const text = top.length === 1 ? top[0] : top.length === 2 ? `${top[0]} & ${top[1]}` : `${top[0]}, ${top[1]} & more`;
	return `TODAY · ${text.toUpperCase()}`;
}

/** A card's art file: the ticker, lower-cased, with "." as "_" (BRK.B -> brk_b). */
export function cardArtUrl(ticker: string): string {
	return `/discover-art/${ticker.toLowerCase().replace(/\./g, "_")}.webp`;
}
export const CARD_ART_FALLBACK = "/discover-art/_template.webp";

/** "A new deck lands at 9am." before 9am, else "…tomorrow at 9am." */
export function nextDeckNote(now = new Date()): string {
	return now.getHours() < 9 ? "A new deck lands at 9am." : "A new deck lands tomorrow at 9am.";
}

export const formatPrice = (price: number | null | undefined) => (price == null ? "—" : usd(price));

/** "today" - but before the 9:30 ET open and on weekends the move is the last session's: "on Friday" (Android's sessionChange). */
export function sessionWord(now = new Date()): string {
	const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
	const weekend = et.getDay() === 0 || et.getDay() === 6;
	if (!weekend && et.getHours() * 60 + et.getMinutes() >= 570) return "today";
	const day = new Date(et);
	do { day.setDate(day.getDate() - 1); } while (day.getDay() === 0 || day.getDay() === 6);
	return `on ${day.toLocaleDateString("en-US", { weekday: "long" })}`;
}
