// Faithful TS port of Android's TasteGraph.kt (android/app/src/main/java/com/stak/
// demo/data/TasteGraph.kt) — the Investing Taste card's 6-scenario logic. Kotlin's
// lazy computed properties on a data class become plain functions taking the graph,
// since TS has no equivalent idiom; behavior (thresholds, copy, evidence selection)
// is ported exactly, not reinterpreted.
//
// Every figure is a share of observed interest signals — saves, passes, Learn more
// opens, stock pages opened — and never a share of money. STAK does not know what
// anyone owns, so nothing here may read as an allocation.
import type { TasteApiResponse, TasteThemeDto } from "./api";
import { categoryName } from "@stak/shared";

/** How long since the last save before the card reads as "paused" rather than current. */
const PAUSED_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export type Strength = "strong" | "moderate" | "emerging";

export const STRENGTH_LABEL: Record<Strength, string> = {
	strong: "Strong",
	moderate: "Moderate",
	emerging: "Emerging",
};

export interface Theme {
	category: string;
	label: string;
	colorKey: string;
	share: number;
	strength: Strength;
	saves: number;
	learnMores: number;
	opens: number;
	savedNames: string[];
	/** When the newest save in this theme happened; null when it can't be read. */
	savedAtMs: number | null;
}

export type Act = "saved" | "learned" | "opened";

export interface Evidence {
	theme: string;
	text: string;
	act: Act;
}

export type Scenario = "no_signal" | "paused" | "early_signal" | "one_dominant" | "two_strong" | "broad_mix";

export interface Graph {
	themes: Theme[];
	otherShare: number;
	/** What otherShare is made of, strongest first; empty when the backend doesn't send it. */
	others: Theme[];
	totalSaves: number;
	/** Too little activity to name a lead; the card says so instead of guessing. */
	learning: boolean;
	/**
	 * Every save, swipe and open counted, whether or not any of it landed on a theme —
	 * an account that's passed on plenty but never saved or right-swiped anything has
	 * real signals but zero POSITIVE ones, so `themes` comes back empty exactly like a
	 * brand-new account's does. Kept so the copy can tell "you haven't done anything
	 * yet" from "you have, just not toward anything yet".
	 */
	totalSignals: number;
}

export function isEmptyGraph(graph: Graph): boolean {
	return graph.themes.length === 0;
}

/**
 * No new save in PAUSED_AFTER_MS — the closest reading of "gone quiet" the data
 * supports. Learn-more and page-open counts aren't timestamped individually, only
 * saves are, so a theme with no save at all can't be judged this way and just isn't
 * — it falls through to whatever scenario its theme count gives it.
 */
function isPaused(graph: Graph): boolean {
	const savedAts = graph.themes.map((t) => t.savedAtMs).filter((ms): ms is number => ms != null);
	if (savedAts.length === 0) return false;
	const newestSave = Math.max(...savedAts);
	return Date.now() - newestSave > PAUSED_AFTER_MS;
}

export function scenarioOf(graph: Graph): Scenario {
	if (graph.themes.length === 0) return "no_signal";
	if (isPaused(graph)) return "paused";
	if (graph.learning) return "early_signal";
	if (graph.themes.length === 1) return "one_dominant";
	if (graph.themes.length === 2) return "two_strong";
	return "broad_mix";
}

/**
 * True when there's real activity behind an empty `themes` — passes and swipes that
 * just never landed positively on anything — so NO_SIGNAL's copy doesn't claim "you
 * haven't done anything" to someone who has.
 */
function activeButUnfocused(graph: Graph): boolean {
	return graph.themes.length === 0 && graph.totalSignals > 0;
}

/** The one-sentence reading. Never states a lead the evidence doesn't carry. */
export function summaryOf(graph: Graph): string {
	switch (scenarioOf(graph)) {
		case "no_signal":
			return activeButUnfocused(graph) ? "Nothing's caught on yet" : "Your Taste starts here";
		case "paused":
			return "Quiet for a while";
		case "early_signal":
			return "Your Taste is taking shape";
		case "one_dominant":
			return `${graph.themes[0]!.label} stands out`;
		case "two_strong":
			return `${graph.themes[0]!.label} + ${graph.themes[1]!.label}`;
		case "broad_mix":
			return "A broad mix of interests";
	}
}

export function subtitleOf(graph: Graph): string {
	switch (scenarioOf(graph)) {
		case "no_signal":
			return activeButUnfocused(graph)
				? "Nothing you've saved or explored has stood out yet. Save a company you like in Discover."
				: "Explore and STAK companies to build your picture.";
		case "paused":
			return "Based on saves from a while back — explore or save something to freshen this up.";
		case "early_signal":
			return `${graph.themes[0]!.label} caught your attention. Keep exploring.`;
		case "one_dominant":
			return "Updated to reflect your choices.";
		case "two_strong":
			return "Based on what you STAK and explore.";
		case "broad_mix":
			return "No single theme stands out yet.";
	}
}

/** The card's link, without its trailing "›". */
export function ctaLabelOf(graph: Graph): string {
	return scenarioOf(graph) === "no_signal" ? "Explore companies" : "See your Taste";
}

/** " today" / " this week" / " this month" for a save recent enough to be worth saying. */
function recencyOf(savedAtMs: number | null): string {
	if (savedAtMs == null) return "";
	const days = (Date.now() - savedAtMs) / (24 * 60 * 60 * 1000);
	if (days < 0) return "";
	if (days < 1) return " today";
	if (days < 7) return " this week";
	if (days < 31) return " this month";
	return "";
}

/**
 * The activity behind a theme, strongest evidence first. Plain facts, not
 * second-person narration ("You saved...") — paired with the theme name shown
 * once as its own heading, not repeated in every line.
 */
export function evidenceForTheme(theme: Theme): Evidence[] {
	const out: Evidence[] = [];
	const whenSaved = recencyOf(theme.savedAtMs);
	if (theme.savedNames.length === 1) {
		out.push({ theme: theme.label, text: `Saved ${theme.savedNames[0]}${whenSaved}.`, act: "saved" });
	} else if (theme.savedNames.length >= 2) {
		out.push({ theme: theme.label, text: `Saved ${theme.savedNames.slice(0, 2).join(" and ")}${whenSaved}.`, act: "saved" });
	} else if (theme.saves > 0) {
		out.push({ theme: theme.label, text: `Saved ${theme.saves} ${theme.saves === 1 ? "company" : "companies"}${whenSaved}.`, act: "saved" });
	}
	if (theme.learnMores > 0) {
		out.push({ theme: theme.label, text: `Opened Learn more on ${theme.learnMores} ${theme.learnMores === 1 ? "company card" : "company cards"}.`, act: "learned" });
	}
	if (theme.opens > 0) {
		out.push({ theme: theme.label, text: `Visited company pages ${theme.opens} ${theme.opens === 1 ? "time" : "times"}.`, act: "opened" });
	}
	return out;
}

/**
 * One line per theme for "Why STAK thinks this" — a single busy theme must not fill
 * the whole card. Each theme offers a kind of evidence not already shown (a save,
 * then a Learn more, then a page opened), capped at 4 lines total.
 */
export function allEvidence(graph: Graph): Evidence[] {
	const shown = new Set<Act>();
	const out: Evidence[] = [];
	for (const theme of graph.themes) {
		if (out.length >= 4) break;
		const options = evidenceForTheme(theme);
		const pick = options.find((e) => !shown.has(e.act)) ?? options[0];
		if (!pick) continue;
		out.push(pick);
		shown.add(pick.act);
	}
	return out;
}

/**
 * How firmly a theme can be stated. A big share of very little activity is not a
 * strong reading, so the evidence behind it has to be there too.
 */
function strengthOf(share: number, saves: number, explorations: number, learning: boolean): Strength {
	// While there is too little activity to name a lead at all, nothing can be Strong —
	// a Strong chip beside "Still learning your taste" contradicts it.
	if (learning) return share >= 0.25 ? "moderate" : "emerging";
	if (share >= 0.25 && (saves >= 2 || saves + explorations >= 3)) return "strong";
	if (share >= 0.12 && saves + explorations >= 1) return "moderate";
	return "emerging";
}

// One shade of blue per ranked theme, strongest lightest — shades of one
// colour rather than six hues, so the ring/tiles read as data, not
// decoration. Ported from Android's MyStakShared.kt TASTE_PALETTE.
const TASTE_PALETTE = ["#9BD7EC", "#69B3CA", "#4A8FC0", "#356F9F", "#2A5476", "#223D57"];

/** A theme's ranked-position color (its colorKey, "t0".."t5") for the ring and evidence tiles. */
export function themeColor(colorKey: string): string {
	const index = Number(colorKey.replace(/^t/, ""));
	return TASTE_PALETTE[index] ?? "var(--mystak-faint)";
}

/** The server's measurement, named and rated for the screen. */
export function fromTasteResponse(dto: TasteApiResponse): Graph {
	const toTheme = (t: TasteThemeDto, colorKey: string): Theme => ({
		category: t.category,
		label: categoryName(t.category),
		colorKey,
		share: t.share,
		strength: strengthOf(t.share, t.saves, t.learnMores + t.opens, dto.learning),
		saves: t.saves,
		learnMores: t.learnMores,
		opens: t.opens,
		savedNames: t.savedNames,
		savedAtMs: t.lastSavedAt ? Date.parse(t.lastSavedAt) : null,
	});
	return {
		// Ranked position, not the category family — the ring's slices need to be
		// told apart from each other, and several categories share one family.
		themes: dto.themes.map((t, i) => toTheme(t, `t${i}`)),
		otherShare: dto.otherShare,
		// The rest share the ring's grey "other" slice.
		others: (dto.otherThemes ?? []).map((t) => toTheme(t, "other")),
		totalSaves: dto.totalSaves,
		learning: dto.learning,
		totalSignals: dto.signals,
	};
}

/** The share of interest signals outside the first `shown` interests (the smaller ones the server sums, plus any listed
 *  interests a panel leaves out), so a shortened list still adds up to 100%. */
export function restShare(graph: Graph, shown: number): number {
	return graph.otherShare + graph.themes.slice(shown).reduce((sum, t) => sum + t.share, 0);
}
