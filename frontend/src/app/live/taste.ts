/**
 * Taste & risk, read from the account: the taste chips are the top display buckets of the
 * person's tag scores (the same five buckets the mobile profile uses), risk style and goal come
 * from the onboarding answers. The frames' strings are the fallback for an empty profile.
 */
import { computeDisplayCategoryPercentages, DISPLAY_CATEGORY_LABELS, type DisplayCategoryKey } from "@stak/shared";
import { useMemo } from "react";
import { tasteRisk } from "@/app/profile/data";
import { useLive } from "./store";

export type RiskStyle = { value: string; short: string; description: string };
export type Goal = { value: string; description: string };

/** Keyed by the Step 05 risk-matrix option ids (onboarding/data.ts). */
export const RISK_STYLES: Record<string, RiskStyle> = {
	buy: { value: "Growth-oriented", short: "Growth", description: tasteRisk.risk.description },
	hold: {
		value: "Balanced",
		short: "Balanced",
		description: "You hold through swings and watch them closely. Your deck mixes growth names with steadier ones.",
	},
	step: {
		value: "Cautious",
		short: "Cautious",
		description: "Big drops make you step back. Your deck leans toward steadier names and skips the wildest ones.",
	},
	sell: {
		value: "Protective",
		short: "Protective",
		description: "You would rather protect part of your money. Your deck favours stable names and income.",
	},
};

/** Keyed by the Step 04 goal-matrix option ids. */
export const GOALS: Record<string, Goal> = {
	grow: { value: "Long-term growth", description: tasteRisk.goal.description },
	learn: { value: "Learning the ropes", description: "You are here to understand how investing works first. The brief and your deck explain more and push less." },
	first: { value: "First stocks", description: "You want to know what to watch. Your deck surfaces well-known names and what moves them." },
	explore: { value: "Just exploring", description: "No plan yet, and that is fine. Your deck stays broad until your taste shows." },
};

const BUCKET_ORDER: DisplayCategoryKey[] = ["techCurious", "highGrowth", "consumerBrands", "incomeDividends", "speculativePlays"];

export function useTaste() {
	const live = useLive();
	return useMemo(() => {
		const pct = computeDisplayCategoryPercentages(live.tagScores ?? {});
		const ranked = BUCKET_ORDER.filter((k) => (pct[k] ?? 0) > 0).sort((a, b) => (pct[b] ?? 0) - (pct[a] ?? 0));
		const chips = ranked.length > 0 ? ranked.slice(0, 3).map((k) => DISPLAY_CATEGORY_LABELS[k]) : [...tasteRisk.taste.chips];
		const risk = RISK_STYLES[live.preferences.familiarity ?? ""] ?? RISK_STYLES.buy!;
		const goal = GOALS[live.preferences.goal ?? ""] ?? GOALS.grow!;
		return {
			chips,
			risk,
			goal,
			/** "Tech curious · Growth" — the profile row value */
			summary: `${chips[0] ?? "Tech Curious"} · ${risk.short}`,
			percentages: pct,
		};
	}, [live.tagScores, live.preferences.familiarity, live.preferences.goal]);
}
