/**
 * Taste & risk, read from the account. The YOUR TASTE chips (Figma 2:2793-2:2801) and the hub's "Tech curious · Growth"
 * (2:2519) come from the person's own onboarding answers through the phones' TasteModel (android
 * ui/onboarding/TasteModel.kt:12-71, ios Onboarding/TasteModel.swift:59-71; the hub reads them through
 * ui/profile/ProfileTaste.kt:13-19): each taste is the share of the brand picks (02 Brand picks) that belong to it,
 * nudged by the goal (04) and the risk answer (05). The swipe-learned tag scores (live/store.ts bumpTags, the backend's
 * learning for accounts) are blended in as they grow (SWIPE_HALF), so the deck keeps sharpening the chips the quiz set.
 * Risk style and goal come from the answers too. The guest persona's seed answers give the frames' own chips.
 */
import { computeDisplayCategoryScores, type DisplayCategoryKey } from "@stak/shared/displayCategories";
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

/**
 * The brand groups of TasteModel.kt:13-16, by the web's 02 Brand picks ids (onboarding/data.ts BRANDS: the same twelve
 * brands the phones offer).
 */
const TECH = new Set(["apple", "tesla", "spotify", "netflix", "amazon", "microsoft", "nvidia", "playstation", "coinbase", "uber"]);
const GROWTH = new Set(["tesla", "nvidia", "coinbase", "uber", "amazon", "spotify", "netflix"]);
const CONSUMER = new Set(["nike", "disney", "netflix", "spotify", "amazon", "playstation", "uber", "apple", "tesla"]);
const INCOME = new Set(["apple", "microsoft", "nike", "disney"]);

/** The four tastes, each 0..1 (TasteModel.scores order: tech / growth / consumer / income). */
export type TasteScores = { tech: number; growth: number; consumer: number; income: number };

export type TasteAnswers = {
	/** 02 Brand picks (preferences.onboardingSwipes) */
	picks?: readonly string[];
	/** 04 Goal id (preferences.goal): learn / grow / first / explore */
	goal?: string;
	/** 05 Risk id (preferences.familiarity): buy / hold / step / sell */
	risk?: string;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** TasteModel.scores (android TasteModel.kt:42-49): the picks' share of each group, nudged by the goal and the risk. */
export function answerScores({ picks = [], goal, risk }: TasteAnswers): TasteScores {
	const share = (group: ReadonlySet<string>) => (picks.length === 0 ? 0 : picks.filter((p) => group.has(p)).length / picks.length);
	return {
		tech: clamp01(share(TECH) + (goal === "first" ? 0.1 : 0)),
		growth: clamp01(share(GROWTH) + (goal === "grow" ? 0.25 : 0) + (risk === "buy" ? 0.2 : 0) - (risk === "sell" ? 0.2 : 0)),
		consumer: clamp01(share(CONSUMER)),
		income: clamp01(share(INCOME) + (risk === "sell" ? 0.3 : 0) + (risk === "step" ? 0.15 : 0) + (goal === "learn" ? 0.1 : 0)),
	};
}

/** The display buckets the swipe-learned scores fill, as the four tastes (Speculative Plays has no TasteModel chip). */
const BUCKET_OF: Record<keyof TasteScores, DisplayCategoryKey> = { tech: "techCurious", growth: "highGrowth", consumer: "consumerBrands", income: "incomeDividends" };

/**
 * How much learned signal weighs as much as the quiz: a save of a typical company adds about 36 to the bucket sums
 * (NVDA: 5 points x its five weighted tags), so after about three saves the deck counts as much as the answers, and
 * after ten it leads (weight = signal / (signal + SWIPE_HALF)).
 */
export const SWIPE_HALF = 108;

/** The swipe-learned tastes, each 0..1 against the person's strongest bucket, and the total signal behind them. */
export function swipeScores(tagScores: Readonly<Record<string, number>>): { scores: TasteScores; signal: number } {
	const raw = computeDisplayCategoryScores({ ...tagScores });
	const signal = (Object.keys(BUCKET_OF) as (keyof TasteScores)[]).reduce((s, k) => s + raw[BUCKET_OF[k]], 0);
	const top = Math.max(0, ...(Object.keys(BUCKET_OF) as (keyof TasteScores)[]).map((k) => raw[BUCKET_OF[k]]));
	const of = (k: keyof TasteScores) => (top > 0 ? raw[BUCKET_OF[k]] / top : 0);
	return { scores: { tech: of("tech"), growth: of("growth"), consumer: of("consumer"), income: of("income") }, signal };
}

/** The answers' tastes blended with the learned ones: the learned weight grows with the signal; with no answers it is all. */
export function blendedScores(answers: TasteAnswers, tagScores: Readonly<Record<string, number>>): TasteScores {
	const quiz = answerScores(answers);
	const { scores, signal } = swipeScores(tagScores);
	const answered = (answers.picks?.length ?? 0) > 0 || !!answers.goal || !!answers.risk;
	const w = signal <= 0 ? 0 : answered ? signal / (signal + SWIPE_HALF) : 1;
	const mix = (k: keyof TasteScores) => clamp01((1 - w) * quiz[k] + w * scores[k]);
	return { tech: mix("tech"), growth: mix("growth"), consumer: mix("consumer"), income: mix("income") };
}

/** "Just Exploring": TasteModel's chip when no taste qualifies (TasteModel.kt:70). */
export const NO_TASTE_CHIP = "Just Exploring";

/**
 * The YOUR TASTE chips, strongest first, at most three (TasteModel.chips, TasteModel.kt:60-71): Tech Curious from 0.3,
 * High Growth from 0.45, Consumer Brands from 0.3, Income Focused from 0.35, Risk Aware (0.5) for the "step away" and
 * "sell some" answers, Learning (0.4) for the "learn how investing works" goal; "Just Exploring" when none qualifies.
 * Ties keep this order (a stable sort, as Kotlin's sortedByDescending).
 */
export function tasteChips(answers: TasteAnswers, tagScores: Readonly<Record<string, number>> = {}): string[] {
	const { tech, growth, consumer, income } = blendedScores(answers, tagScores);
	const out: [number, string][] = [];
	if (tech >= 0.3) out.push([tech, "Tech Curious"]);
	if (growth >= 0.45) out.push([growth, "High Growth"]);
	if (consumer >= 0.3) out.push([consumer, "Consumer Brands"]);
	if (income >= 0.35) out.push([income, "Income Focused"]);
	if (answers.risk === "sell" || answers.risk === "step") out.push([0.5, "Risk Aware"]);
	if (answers.goal === "learn") out.push([0.4, "Learning"]);
	const chips = [...new Set(out.sort((a, b) => b[0] - a[0]).map(([, label]) => label))].slice(0, 3);
	return chips.length > 0 ? chips : [NO_TASTE_CHIP];
}

/**
 * The 07 Taste reveal's four bars for these answers (TasteModel.bars, TasteModel.kt:51-57): label, strength word
 * (Strong from 0.6, Medium from 0.3, else Light) and the fill's share of the track (0.2 + 0.8 x the taste). For the
 * reveal's owner: the web's reveal still draws the frame's bars (onboarding/data.ts TASTE_BARS).
 */
export function tasteBars(answers: TasteAnswers): { label: string; level: "Strong" | "Medium" | "Light"; fraction: number }[] {
	const s = answerScores(answers);
	const strength = (v: number) => (v >= 0.6 ? "Strong" : v >= 0.3 ? "Medium" : "Light") as "Strong" | "Medium" | "Light";
	return [
		{ label: "Tech curious", v: s.tech },
		{ label: "Growth seeking", v: s.growth },
		{ label: "Consumer brands", v: s.consumer },
		{ label: "Income & dividends", v: s.income },
	].map(({ label, v }) => ({ label, level: strength(v), fraction: 0.2 + 0.8 * v }));
}

/** "Tech Curious" -> "Tech curious": the profile row writes the chip in sentence case (Figma 2:2476); acronyms keep their caps. */
const sentenceCase = (label: string) => label.split(" ").map((w, i) => (i === 0 || w === w.toUpperCase() ? w : w.toLowerCase())).join(" ");

export function useTaste() {
	const live = useLive();
	const { onboardingSwipes, goal: goalId, familiarity } = live.preferences;
	return useMemo(() => {
		const answers: TasteAnswers = { picks: onboardingSwipes ?? [], goal: goalId, risk: familiarity };
		const chips = tasteChips(answers, live.tagScores ?? {});
		const risk = RISK_STYLES[familiarity ?? ""] ?? RISK_STYLES.buy!;
		const goal = GOALS[goalId ?? ""] ?? GOALS.grow!;
		return {
			chips,
			risk,
			goal,
			/** "Tech curious · Growth" — the profile row value (ProfileTaste.summary: the strongest chip · the risk style's lead word) */
			summary: `${sentenceCase(chips[0] ?? NO_TASTE_CHIP)} · ${risk.short}`,
		};
	}, [live.tagScores, onboardingSwipes, goalId, familiarity]);
}
