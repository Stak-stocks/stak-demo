import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { ACTIVITY_TYPES } from "@stak/shared";
import type { ActivityType } from "@stak/shared";
import { generatePlaygroundQuestions } from "@/lib/api";
import type { DailyPack, DailyActivity, Lesson, LessonCategory } from "@/data/playgroundData";
import type { BattleMatchup, EarningsScenario, RiskScenario, MoodScenario } from "@/data/playgroundData";
import { TIER_COUNTS } from "@/data/playgroundData";

const VALID_CATEGORIES = new Set<LessonCategory>([
	"Stock Basics", "Market Basics", "Valuation", "Earnings", "Risk", "Dividends", "Sectors",
]);

const GEN_STALE_MS = 24 * 60 * 60 * 1000;

// Request a couple extra so validation failures don't leave us short
const GEN_COUNT_BUFFER = 2;

export function useDailyContent(shellPack: DailyPack, uid: string, dayKey: string) {
	const { tier } = shellPack;
	const counts = TIER_COUNTS[tier] ?? TIER_COUNTS[1]!;

	const queries = useQueries({
		queries: ACTIVITY_TYPES.map(type => ({
			queryKey: ["playground-gen", uid, dayKey, tier, type],
			queryFn: async () => {
				// localStorage cache — same content across page refreshes within the day
				const lsKey = `stak:gen:v5:${uid}:${dayKey}:${tier}:${type}`;
				try {
					const hit = localStorage.getItem(lsKey);
					if (hit) return JSON.parse(hit) as unknown[];
				} catch { /* ignore */ }
				const countKey = type === "lesson" ? "lessons" : type === "battle" ? "battles" : type;
				const count = Math.min((counts[countKey as keyof typeof counts] ?? 3) + GEN_COUNT_BUFFER, 10);
				const result = await generatePlaygroundQuestions(dayKey, tier, type, count);
				try { localStorage.setItem(lsKey, JSON.stringify(result)); } catch { /* ignore */ }
				return result;
			},
			staleTime: GEN_STALE_MS,
			gcTime: GEN_STALE_MS,
			enabled: !!uid,
			retry: 1,
		})),
	});

	// ACTIVITY_TYPES order: ["lesson", "battle", "earnings", "risk", "mood"]
	const lessonData = queries[0]?.data;
	const battleData = queries[1]?.data;
	const earningsData = queries[2]?.data;
	const riskData = queries[3]?.data;
	const moodData = queries[4]?.data;

	// Validate and collect generated items — Gemini is the sole source
	const generated = useMemo(() => {
		const battles: BattleMatchup[] = [];
		const earnings: EarningsScenario[] = [];
		const risk: RiskScenario[] = [];
		const mood: MoodScenario[] = [];
		const lessons: Lesson[] = [];

		const seenBattle = new Set<string>();
		const seenEarnings = new Set<string>();
		const seenLesson = new Set<string>();
		const seenRisk = new Set<string>();
		const seenMood = new Set<string>();

		if (Array.isArray(battleData)) {
			for (const item of battleData) {
				if (!item || typeof item !== "object") continue;
				const r = item as Record<string, unknown>;
				if (typeof r.id !== "string" || seenBattle.has(r.id)) continue;
				if (typeof r.tickerA !== "string" || typeof r.nameA !== "string") continue;
				if (typeof r.tickerB !== "string" || typeof r.nameB !== "string") continue;
				seenBattle.add(r.id);
				const metricLabel = String(r.metricLabel ?? "").toLowerCase();
				const metric: BattleMatchup["metric"] =
					metricLabel.includes("margin") ? "profitMargin"
					: metricLabel.includes("p/e") || metricLabel.includes("pe ratio") ? "peRatio"
					: metricLabel.includes("market cap") ? "marketCap"
					: "revenueGrowth";
				battles.push({
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
				earnings.push({
					id: r.id, company: r.company, ticker: r.ticker,
					context: String(r.context ?? ""),
					revenueExpected: String(r.revenueExpected ?? "N/A"),
					epsExpected: String(r.epsExpected ?? "N/A"),
					...(typeof r.revenueActual === "string" && r.revenueActual ? { revenueActual: r.revenueActual } : {}),
					...(typeof r.epsActual === "string" && r.epsActual ? { epsActual: r.epsActual } : {}),
					stockContext: String(r.stockContext ?? ""),
					question: String(r.question ?? "What do you predict?"),
					options: opts.map((o: Record<string, unknown>) => ({ id: String(o.id ?? "a"), text: String(o.text ?? "") })),
					correctId: String(r.correctId ?? "a"),
					outcome: String(r.outcome ?? ""),
					explanation: String(r.explanation ?? ""),
					xp: Number(r.xp ?? 30),
					...(typeof r.forwardGuidance === "string" && r.forwardGuidance ? { forwardGuidance: r.forwardGuidance } : {}),
					...(typeof r.stockMove === "string" && r.stockMove ? { stockMove: r.stockMove } : {}),
					...(typeof r.keyTakeaway === "string" && r.keyTakeaway ? { keyTakeaway: r.keyTakeaway } : {}),
					...(typeof r.peRatio === "string" && r.peRatio ? { peRatio: r.peRatio } : {}),
					...(typeof r.stockSetupLabel === "string" && r.stockSetupLabel ? { stockSetupLabel: r.stockSetupLabel } : {}),
					...(typeof r.watchNextTime === "string" && r.watchNextTime ? { watchNextTime: r.watchNextTime } : {}),
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
				risk.push({
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
				mood.push({
					id: r.id, event: r.event,
					question: String(r.question ?? "How would markets react?"),
					options: opts.map((o: Record<string, unknown>) => ({ id: String(o.id ?? "a"), text: String(o.text ?? "") })),
					correctId: String(r.correctId ?? "a"),
					explanation: String(r.explanation ?? ""),
					xp: Number(r.xp ?? 20),
				});
			}
		}

		if (Array.isArray(lessonData)) {
			for (const item of lessonData) {
				if (!item || typeof item !== "object") continue;
				const r = item as Record<string, unknown>;
				if (typeof r.id !== "string" || seenLesson.has(r.id)) continue;
				if (typeof r.title !== "string" || typeof r.category !== "string") continue;
				if (!VALID_CATEGORIES.has(r.category as LessonCategory)) continue;
				const cards = Array.isArray(r.cards) ? r.cards.filter(
					(c: unknown) => c && typeof c === "object" &&
						typeof (c as Record<string, unknown>).heading === "string" &&
						(c as Record<string, unknown>).heading !== "" &&
						typeof (c as Record<string, unknown>).body === "string" &&
						(c as Record<string, unknown>).body !== ""
				) : [];
				if (cards.length < 1) continue;
				const quiz = r.quiz as Record<string, unknown> | undefined;
				if (!quiz || typeof quiz.question !== "string" || !Array.isArray(quiz.options)) continue;
				const opts = quiz.options.filter(
					(o: unknown) => o && typeof o === "object" &&
						typeof (o as Record<string, unknown>).id === "string" &&
						typeof (o as Record<string, unknown>).text === "string"
				);
				if (opts.length < 2) continue;
				const optIds = new Set(opts.map((o: Record<string, unknown>) => o.id as string));
				if (!optIds.has(String(quiz.correctId ?? ""))) continue;
				seenLesson.add(r.id);
				lessons.push({
					id: r.id, title: r.title,
					subtitle: String(r.subtitle ?? ""),
					category: r.category as LessonCategory,
					emoji: String(r.emoji ?? "📚"),
					durationMin: Number(r.durationMin ?? 3),
					xp: Number(r.xp ?? 15),
					cards: cards.map((c: Record<string, unknown>) => ({ heading: String(c.heading), body: String(c.body) })),
					quiz: {
						question: String(quiz.question),
						options: opts.map((o: Record<string, unknown>) => ({ id: String(o.id), text: String(o.text) })),
						correctId: String(quiz.correctId),
						explanation: String(quiz.explanation ?? ""),
					},
				});
			}
		}

		return { battles, earnings, risk, mood, lessons };
	}, [battleData, earningsData, riskData, moodData, lessonData]);

	// Build the pack entirely from Gemini content
	const pack = useMemo((): DailyPack => {
		const { battles, earnings, risk, mood, lessons } = generated;
		const activities: DailyActivity[] = [
			...battles.slice(0, counts.battles).map(b => ({
				id: b.id, type: "battle" as ActivityType,
				title: `${b.nameA} vs ${b.nameB}`, subtitle: b.category, emoji: "⚔️", xp: b.xp,
			})),
			...earnings.slice(0, counts.earnings).map(s => ({
				id: s.id, type: "earnings" as ActivityType,
				title: `${s.company} Earnings`, subtitle: "Earnings Lab", emoji: "📋", xp: s.xp,
			})),
			...risk.slice(0, counts.risk).map(s => ({
				id: s.id, type: "risk" as ActivityType,
				title: `${s.optionA.split(" ")[0]} vs ${s.optionB.split(" ")[0]}`, subtitle: "Risk Lab", emoji: "⚠️", xp: s.xp,
			})),
			...mood.slice(0, counts.mood).map(s => ({
				id: s.id, type: "mood" as ActivityType,
				title: s.event.replace(/^[^\w]*/, "").slice(0, 35), subtitle: "Market Mood", emoji: "🌍", xp: s.xp,
			})),
			...lessons.slice(0, counts.lessons).map(l => ({
				id: l.id, type: "lesson" as ActivityType,
				title: l.title, subtitle: l.category, emoji: l.emoji, xp: l.xp,
			})),
		];

		const totalXp = activities.reduce((sum, a) => sum + a.xp, 0);
		return { ...shellPack, activities, totalXp };
	}, [shellPack, generated, counts, tier]);

	const isGenerating = queries.some(q => q.isLoading);

	return {
		pack,
		mergedBattles: generated.battles,
		mergedEarnings: generated.earnings,
		mergedRisk: generated.risk,
		mergedMood: generated.mood,
		mergedLessons: generated.lessons,
		isGenerating,
	};
}
