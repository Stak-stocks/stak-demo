import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { generatePlaygroundQuestions } from "@/lib/api";
import type { WeeklyPack, WeeklyActivity } from "@/data/playgroundData";
import type {
	BattleMatchup,
	EarningsScenario,
	RiskScenario,
	MoodScenario,
} from "@/data/playgroundData";
import {
	STOCK_BATTLES,
	EARNINGS_SCENARIOS,
	RISK_SCENARIOS,
	MOOD_SCENARIOS,
} from "@/data/playgroundData";

type GenerableType = "battle" | "earnings" | "risk" | "mood";
const GENERABLE_TYPES: GenerableType[] = ["battle", "earnings", "risk", "mood"];

const GEN_STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — fresh each week

export function useWeeklyContent(staticPack: WeeklyPack) {
	const { weekKey, tier } = staticPack;

	// Count how many of each type is in the static pack
	const staticCounts = useMemo(() => {
		const counts: Record<GenerableType, number> = { battle: 0, earnings: 0, risk: 0, mood: 0 };
		for (const a of staticPack.activities) {
			if (a.type in counts) counts[a.type as GenerableType]++;
		}
		return counts;
	}, [staticPack.activities]);

	// Always generate for all 4 types — results are cached 7 days so it's one request per type per week
	const queries = useQueries({
		queries: GENERABLE_TYPES.map(type => ({
			queryKey: ["playground-gen", weekKey, tier, type],
			queryFn: () => generatePlaygroundQuestions(weekKey, tier, type, staticCounts[type] || 3),
			staleTime: GEN_STALE_MS,
			gcTime: GEN_STALE_MS,
			retry: 1,
		})),
	});

	// Extract stable data references to avoid recomputing on every render
	const battleData = queries[0]?.data;
	const earningsData = queries[1]?.data;
	const riskData = queries[2]?.data;
	const moodData = queries[3]?.data;

	// Inject validated generated items into augmented arrays
	const augmented = useMemo(() => {
		const extraBattles: BattleMatchup[] = [];
		const extraEarnings: EarningsScenario[] = [];
		const extraRisk: RiskScenario[] = [];
		const extraMood: MoodScenario[] = [];

		// Track generated IDs per type to prevent Gemini duplicates within a batch
		const seenBattle = new Set(STOCK_BATTLES.map(b => b.id));
		const seenEarnings = new Set(EARNINGS_SCENARIOS.map(s => s.id));
		const seenRisk = new Set(RISK_SCENARIOS.map(s => s.id));
		const seenMood = new Set(MOOD_SCENARIOS.map(s => s.id));

		if (Array.isArray(battleData)) {
			for (const item of battleData) {
				if (!item || typeof item !== "object") continue;
				const r = item as Record<string, unknown>;
				if (typeof r.id !== "string" || seenBattle.has(r.id)) continue;
				if (typeof r.tickerA !== "string" || typeof r.nameA !== "string") continue;
				if (typeof r.tickerB !== "string" || typeof r.nameB !== "string") continue;
				seenBattle.add(r.id);
				// Map metricLabel to a known metric key for live data lookups
				const metricLabel = String(r.metricLabel ?? "").toLowerCase();
				const metric: BattleMatchup["metric"] =
					metricLabel.includes("margin") ? "profitMargin"
					: metricLabel.includes("p/e") || metricLabel.includes("pe ratio") ? "peRatio"
					: metricLabel.includes("market cap") ? "marketCap"
					: "revenueGrowth";
				extraBattles.push({
					id: r.id, tickerA: r.tickerA, nameA: r.nameA,
					tickerB: r.tickerB, nameB: r.nameB,
					category: String(r.category ?? "Market"),
					metricLabel: String(r.metricLabel ?? "Metric"),
					metric,
					higherWins: Boolean(r.higherWins ?? true),
					explanation: String(r.explanation ?? ""),
					xp: Number(r.xp ?? 25),
				});
			}
		}

		if (Array.isArray(earningsData)) {
			for (const item of earningsData) {
				if (!item || typeof item !== "object") continue;
				const r = item as Record<string, unknown>;
				if (typeof r.id !== "string" || seenEarnings.has(r.id)) continue;
				if (typeof r.company !== "string" || typeof r.ticker !== "string") continue;
				seenEarnings.add(r.id);
				const opts = Array.isArray(r.options) ? r.options : [];
				extraEarnings.push({
					id: r.id, company: r.company, ticker: r.ticker,
					context: String(r.context ?? ""),
					revenueExpected: String(r.revenueExpected ?? "N/A"),
					epsExpected: String(r.epsExpected ?? "N/A"),
					stockContext: String(r.stockContext ?? ""),
					question: String(r.question ?? "What do you predict?"),
					options: opts.map((o: Record<string, unknown>) => ({ id: String(o.id ?? "a"), text: String(o.text ?? "") })),
					correctId: String(r.correctId ?? "a"),
					outcome: String(r.outcome ?? ""),
					explanation: String(r.explanation ?? ""),
					xp: Number(r.xp ?? 30),
				});
			}
		}

		if (Array.isArray(riskData)) {
			for (const item of riskData) {
				if (!item || typeof item !== "object") continue;
				const r = item as Record<string, unknown>;
				if (typeof r.id !== "string" || seenRisk.has(r.id)) continue;
				if (typeof r.optionA !== "string" || typeof r.optionB !== "string") continue;
				seenRisk.add(r.id);
				extraRisk.push({
					id: r.id, prompt: String(r.prompt ?? "Which is riskier?"),
					optionA: r.optionA, optionB: r.optionB,
					riskierOption: r.riskierOption === "A" ? "A" : "B",
					explanation: String(r.explanation ?? ""),
					xp: Number(r.xp ?? 15),
				});
			}
		}

		if (Array.isArray(moodData)) {
			for (const item of moodData) {
				if (!item || typeof item !== "object") continue;
				const r = item as Record<string, unknown>;
				if (typeof r.id !== "string" || seenMood.has(r.id)) continue;
				if (typeof r.event !== "string") continue;
				seenMood.add(r.id);
				const opts = Array.isArray(r.options) ? r.options : [];
				extraMood.push({
					id: r.id, event: r.event,
					question: String(r.question ?? "How would markets react?"),
					options: opts.map((o: Record<string, unknown>) => ({ id: String(o.id ?? "a"), text: String(o.text ?? "") })),
					correctId: String(r.correctId ?? "a"),
					explanation: String(r.explanation ?? ""),
					xp: Number(r.xp ?? 20),
				});
			}
		}

		return { extraBattles, extraEarnings, extraRisk, extraMood };
	}, [battleData, earningsData, riskData, moodData]);

	// Build augmented pack that merges static + generated IDs, with recalculated totalXp
	const augmentedPack = useMemo((): WeeklyPack => {
		const { extraBattles, extraEarnings, extraRisk, extraMood } = augmented;
		const newActivities: WeeklyActivity[] = [...staticPack.activities];
		const existingIds = new Set(newActivities.map(a => a.id));

		for (const b of extraBattles) {
			if (!existingIds.has(b.id)) {
				newActivities.push({ id: b.id, type: "battle", title: `${b.nameA} vs ${b.nameB}`, subtitle: b.category, emoji: "⚔️", xp: b.xp });
				existingIds.add(b.id);
			}
		}
		for (const s of extraEarnings) {
			if (!existingIds.has(s.id)) {
				newActivities.push({ id: s.id, type: "earnings", title: `${s.company} Earnings`, subtitle: "Earnings Lab", emoji: "📋", xp: s.xp });
				existingIds.add(s.id);
			}
		}
		for (const r of extraRisk) {
			if (!existingIds.has(r.id)) {
				newActivities.push({ id: r.id, type: "risk", title: r.prompt, subtitle: "Risk Lab", emoji: "⚠️", xp: r.xp });
				existingIds.add(r.id);
			}
		}
		for (const m of extraMood) {
			if (!existingIds.has(m.id)) {
				newActivities.push({ id: m.id, type: "mood", title: m.event.slice(0, 40), subtitle: "Market Mood", emoji: "🌍", xp: m.xp });
				existingIds.add(m.id);
			}
		}

		// Recalculate totalXp to include generated activities (Bug 4 fix)
		const totalXp = newActivities.reduce((sum, a) => sum + a.xp, 0);
		return { ...staticPack, activities: newActivities, totalXp };
	}, [staticPack, augmented]);

	const mergedBattles = useMemo(() => [...STOCK_BATTLES, ...augmented.extraBattles], [augmented.extraBattles]);
	const mergedEarnings = useMemo(() => [...EARNINGS_SCENARIOS, ...augmented.extraEarnings], [augmented.extraEarnings]);
	const mergedRisk = useMemo(() => [...RISK_SCENARIOS, ...augmented.extraRisk], [augmented.extraRisk]);
	const mergedMood = useMemo(() => [...MOOD_SCENARIOS, ...augmented.extraMood], [augmented.extraMood]);

	const isGenerating = queries.some(q => q.isLoading);

	return { pack: augmentedPack, mergedBattles, mergedEarnings, mergedRisk, mergedMood, isGenerating };
}
