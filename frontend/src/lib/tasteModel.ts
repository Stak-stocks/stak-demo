// Direct TS port of Android's TasteModel.kt (android/.../ui/onboarding/TasteModel.kt) —
// turns the onboarding quiz answers (brand picks, goal, risk) into the Taste-reveal bars
// and a risk style, deterministically: each taste is the share of picks belonging to it,
// nudged by the goal/risk answers. Keep in sync with the Kotlin source; the values/
// thresholds/colors below are copied verbatim from it.
//
// One naming discrepancy from the Android source: Android's brand-picks tile is named
// "PlayStation", but this app's own brand catalog (@stak/shared) calls the same company
// "Sony Group Corp" — the group sets below key on "Sony Group Corp" to match what this
// app's Brand-picks tiles will actually render/select.
const TECH = new Set(["Apple", "Tesla", "Spotify", "Netflix", "Amazon", "Microsoft", "NVIDIA", "Sony Group Corp", "Coinbase", "Uber"]);
const GROWTH = new Set(["Tesla", "NVIDIA", "Coinbase", "Uber", "Amazon", "Spotify", "Netflix"]);
const CONSUMER = new Set(["Nike", "Disney", "Netflix", "Spotify", "Amazon", "Sony Group Corp", "Uber", "Apple", "Tesla"]);
const INCOME = new Set(["Apple", "Microsoft", "Nike", "Disney"]);

/** The 12 Brand-picks tile names, in the same order as Android's grid. */
export const BRAND_PICK_NAMES = ["Apple", "Tesla", "Nike", "Spotify", "Netflix", "Amazon", "Disney", "Microsoft", "NVIDIA", "Sony Group Corp", "Coinbase", "Uber"];

// 04 Goal options, in card order.
export const GOAL_LEARN = 0;
export const GOAL_GROW = 1;
export const GOAL_FIRST_STOCKS = 2;
export const GOAL_EXPLORE = 3;

// 05 Risk options, in card order.
export const RISK_BUY_MORE = 0;
export const RISK_HOLD = 1;
export const RISK_STEP_AWAY = 2;
export const RISK_SELL_SOME = 3;

export type Strength = "Strong" | "Medium" | "Light";

export interface TasteBar {
	label: string;
	strength: Strength;
	/** Ported 1:1 from Color(0xFF69B3CA) etc. — matches --mystak-teal/--mystak-muted/--mystak-faint. */
	strengthColor: string;
	/** Fill fraction of the bar's track, 0.2..1.0 (never fully empty, even at score 0). */
	fraction: number;
}

export function riskStyle(risk: number): string {
	switch (risk) {
		case RISK_BUY_MORE: return "Growth-Oriented";
		case RISK_HOLD: return "Balanced";
		case RISK_STEP_AWAY: return "Conservative";
		case RISK_SELL_SOME: return "Cautious";
		default: return "Growth-Oriented";
	}
}

function clamp01(n: number): number {
	return Math.max(0, Math.min(1, n));
}

/** tech / growth / consumer / income, each 0..1. */
export function scores(picks: Set<string>, goal: number, risk: number): [number, number, number, number] {
	const share = (group: Set<string>) => {
		if (picks.size === 0) return 0;
		let count = 0;
		for (const p of picks) if (group.has(p)) count++;
		return count / picks.size;
	};
	const tech = share(TECH) + (goal === GOAL_FIRST_STOCKS ? 0.1 : 0);
	const growth = share(GROWTH) + (goal === GOAL_GROW ? 0.25 : 0) + (risk === RISK_BUY_MORE ? 0.2 : 0) - (risk === RISK_SELL_SOME ? 0.2 : 0);
	const consumer = share(CONSUMER);
	const income = share(INCOME) + (risk === RISK_SELL_SOME ? 0.3 : 0) + (risk === RISK_STEP_AWAY ? 0.15 : 0) + (goal === GOAL_LEARN ? 0.1 : 0);
	return [clamp01(tech), clamp01(growth), clamp01(consumer), clamp01(income)];
}

function strengthOf(s: number): Strength {
	if (s >= 0.6) return "Strong";
	if (s >= 0.3) return "Medium";
	return "Light";
}

function colorOf(strength: Strength): string {
	switch (strength) {
		case "Strong": return "#69B3CA";
		case "Medium": return "#819ABB";
		default: return "#5C6B85";
	}
}

export function bars(picks: Set<string>, goal: number, risk: number): TasteBar[] {
	const labels = ["Tech curious", "Growth seeking", "Consumer brands", "Income & dividends"];
	const allScores = scores(picks, goal, risk);
	return labels.map((label, i) => {
		const s = allScores[i]!;
		const strength = strengthOf(s);
		return { label, strength, strengthColor: colorOf(strength), fraction: 0.2 + 0.8 * s };
	});
}

/** The Profile's "YOUR TASTE" chips, strongest first, at most three. */
export function chips(picks: Set<string>, goal: number, risk: number): string[] {
	const [tech, growth, consumer, income] = scores(picks, goal, risk);
	const out: [number, string][] = [];
	if (tech >= 0.3) out.push([tech, "Tech Curious"]);
	if (growth >= 0.45) out.push([growth, "High Growth"]);
	if (consumer >= 0.3) out.push([consumer, "Consumer Brands"]);
	if (income >= 0.35) out.push([income, "Income Focused"]);
	if (risk === RISK_SELL_SOME || risk === RISK_STEP_AWAY) out.push([0.5, "Risk Aware"]);
	if (goal === GOAL_LEARN) out.push([0.4, "Learning"]);
	out.sort((a, b) => b[0] - a[0]);
	const result = [...new Set(out.map(([, label]) => label))].slice(0, 3);
	return result.length > 0 ? result : ["Just Exploring"];
}

/**
 * Profile's taste chips: the quiz picks plus the saved companies that belong to a taste, strongest first ("Just
 * Exploring" before the quiz was answered). Worked out as the apps' ProfileTaste.chips: other saves would only dilute
 * the shares, and the server's picks use the apps' names.
 */
export function profileTasteChips(taste: { picks: string[]; goal: number; risk: number } | null | undefined, savedNames: string[]): string[] {
	if (!taste) return ["Just Exploring"];
	const saved = savedNames.filter(isTasteBrand);
	return chips(new Set([...fromSharedPickNames(taste.picks), ...saved]), taste.goal, taste.risk);
}

/** Whether a brand name counts toward any taste (Android's TasteModel.isTasteBrand). */
export function isTasteBrand(name: string): boolean {
	return TECH.has(name) || GROWTH.has(name) || CONSUMER.has(name) || INCOME.has(name);
}

/** The server's pick names (the apps' spelling) as this catalog writes them - toSharedPickNames the other way. */
export function fromSharedPickNames(picks: string[]): string[] {
	return picks.map((name) => (name === "PlayStation" ? "Sony Group Corp" : name));
}

/** The goal as the quiz worded it, or null before it was answered. */
export function goalLabel(goal: number): string | null {
	switch (goal) {
		case GOAL_LEARN: return "Learn how investing works";
		case GOAL_GROW: return "Grow my money long-term";
		case GOAL_FIRST_STOCKS: return "Find my first stocks";
		case GOAL_EXPLORE: return "Just exploring";
		default: return null;
	}
}

/** One line on what the risk answer said. */
export function riskBlurb(risk: number): string {
	switch (risk) {
		case RISK_HOLD: return "You hold through a drop and watch it closely.";
		case RISK_STEP_AWAY: return "You'd rather step back when a stock drops hard.";
		case RISK_SELL_SOME: return "You'd rather protect part of your money than ride out a drop.";
		case RISK_BUY_MORE: return "You're comfortable with dips when the story holds.";
		default: return "Answer one question about a falling stock.";
	}
}

/** The pick names as Android's TasteModel.kt keys them - it calls Sony "PlayStation", the web catalog "Sony Group Corp". Saved taste is read by both apps, so persist Android's spelling. */
export function toSharedPickNames(picks: string[]): string[] {
	return picks.map((name) => (name === "Sony Group Corp" ? "PlayStation" : name));
}
