import { pgQuery } from "./postgres.js";

/**
 * Free vs STAK+, decided in one place. A screen asks whether a feature is available,
 * never which plan the account is on, so packaging can change here without touching
 * any route or UI flow. Android mirrors this in data/Entitlements.kt.
 */
export type Plan = "free" | "plus";

/**
 * Features that go beyond the free core. Anything not listed is free. Limits that
 * aren't decided yet (the free "Adjust my interests" allowance) are added when they are.
 */
export type Feature =
	| "updates_history"
	| "taste_evolution";

const PLUS_ONLY: ReadonlySet<Feature> = new Set<Feature>(["updates_history", "taste_evolution"]);

export function planOf(raw: unknown): Plan {
	return raw === "plus" ? "plus" : "free";
}

export function hasFeature(plan: Plan, feature: Feature): boolean {
	return plan === "plus" || !PLUS_ONLY.has(feature);
}

/** The account's plan; an unknown account is free. */
export async function getPlan(uid: string): Promise<Plan> {
	const r = await pgQuery<{ plan: string | null }>(`select plan from users where uid = $1`, [uid]);
	return planOf(r.rows[0]?.plan);
}
