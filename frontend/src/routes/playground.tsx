import { createFileRoute } from "@tanstack/react-router";
import {
	BookOpen, Zap, Swords, FlaskConical, ShieldAlert,
	Brain, TrendingUp, Wallet, ChevronRight, Star, Lock,
} from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import {
	LESSONS, LESSON_CATEGORIES, getDailyChallenge,
	STOCK_BATTLES, EARNINGS_SCENARIOS, RISK_SCENARIOS, MOOD_SCENARIOS,
	WWYD_SCENARIOS, PRACTICE_TICKERS, WATCHLIST_SLOTS, WATCHLIST_BRANDS,
	type WatchlistSlotType,
	type Lesson, type LessonCategory,
} from "@/data/playgroundData";
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { getStockData, getDailyBrief, trackEvent } from "@/lib/api";
import { brands as allBrands } from "@/data/brands";
import { StakLogo } from "@/components/StakLogo";

export const Route = createFileRoute("/playground")({
	component: PlaygroundPage,
});

// ── Section card colours ──────────────────────────────────────────────────────

const SECTION_COLORS: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
	lessons:      { bg: "bg-blue-500/10",   border: "border-blue-500/25",   icon: "text-blue-400",   badge: "bg-blue-500/15 text-blue-400"   },
	daily:        { bg: "bg-amber-500/10",  border: "border-amber-500/25",  icon: "text-amber-400",  badge: "bg-amber-500/15 text-amber-400"  },
	battles:      { bg: "bg-rose-500/10",   border: "border-rose-500/25",   icon: "text-rose-400",   badge: "bg-rose-500/15 text-rose-400"    },
	earnings:     { bg: "bg-purple-500/10", border: "border-purple-500/25", icon: "text-purple-400", badge: "bg-purple-500/15 text-purple-400" },
	risk:         { bg: "bg-orange-500/10", border: "border-orange-500/25", icon: "text-orange-400", badge: "bg-orange-500/15 text-orange-400" },
	mood:         { bg: "bg-cyan-500/10",   border: "border-cyan-500/25",   icon: "text-cyan-400",   badge: "bg-cyan-500/15 text-cyan-400"    },
	practice:     { bg: "bg-emerald-500/10",border: "border-emerald-500/25",icon: "text-emerald-400",badge: "bg-emerald-500/15 text-emerald-400"},
	sandbox:      { bg: "bg-violet-500/10", border: "border-violet-500/25", icon: "text-violet-400", badge: "bg-violet-500/15 text-violet-400" },
};

const CATEGORY_COLORS: Record<LessonCategory, string> = {
	"Stock Basics":  "text-blue-400 bg-blue-500/10 border-blue-500/20",
	"Market Basics": "text-purple-400 bg-purple-500/10 border-purple-500/20",
	"Valuation":     "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
	"Earnings":      "text-amber-400 bg-amber-500/10 border-amber-500/20",
	"Risk":          "text-rose-400 bg-rose-500/10 border-rose-500/20",
	"Dividends":     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
	"Sectors":       "text-pink-400 bg-pink-500/10 border-pink-500/20",
};

const CATEGORY_BAR: Record<LessonCategory, string> = {
	"Stock Basics":  "from-blue-500 to-blue-400",
	"Market Basics": "from-purple-500 to-violet-400",
	"Valuation":     "from-cyan-500 to-teal-400",
	"Earnings":      "from-amber-500 to-yellow-400",
	"Risk":          "from-rose-500 to-red-400",
	"Dividends":     "from-emerald-500 to-green-400",
	"Sectors":       "from-pink-500 to-fuchsia-400",
};

// ── Section Card component ────────────────────────────────────────────────────

function SectionCard({
	colorKey, icon, title, subtitle, badge, locked = false, onClick,
}: {
	colorKey: string;
	icon: React.ReactNode;
	title: string;
	subtitle: string;
	badge?: string;
	locked?: boolean;
	onClick?: () => void;
}) {
	const c = SECTION_COLORS[colorKey] ?? SECTION_COLORS.lessons;
	return (
		<button
			type="button"
			onClick={locked ? undefined : onClick}
			className={`w-full flex items-center gap-[14px] rounded-[14px] border ${c.border} ${c.bg} px-[16px] py-[14px] text-left active:opacity-80 transition-opacity ${locked ? "opacity-40" : ""}`}
		>
			<div className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[10px] bg-background/50 ${c.icon}`}>
				{locked ? <Lock size={20} /> : icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[14px] font-bold text-foreground">{title}</p>
				<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px]">{subtitle}</p>
			</div>
			{badge && !locked && (
				<span className={`shrink-0 text-[10px] font-semibold px-[8px] py-[3px] rounded-full ${c.badge}`}>{badge}</span>
			)}
			{!locked && <ChevronRight size={16} className="shrink-0 dark:text-slate-500 text-slate-400" />}
		</button>
	);
}

// ── Shared option button ─────────────────────────────────────────────────────

type OptionState = "idle" | "selected" | "correct" | "wrong" | "correct-other";

function OptionBtn({
	letter, text, state = "idle", onClick, disabled = false,
}: {
	letter: string;
	text: string;
	state?: OptionState;
	onClick?: () => void;
	disabled?: boolean;
}) {
	const cfg: Record<OptionState, { card: string; badge: string }> = {
		idle:          { card: "border-foreground/10 bg-surface-1",             badge: "bg-foreground/[0.08] text-foreground/60" },
		selected:      { card: "border-blue-500/50 bg-blue-500/[0.07]",         badge: "bg-blue-500 text-white" },
		correct:       { card: "border-emerald-500/50 bg-emerald-500/[0.08]",   badge: "bg-emerald-500 text-white" },
		wrong:         { card: "border-rose-500/50 bg-rose-500/[0.08]",         badge: "bg-rose-500 text-white" },
		"correct-other": { card: "border-emerald-500/25 bg-emerald-500/[0.04]", badge: "bg-emerald-500/20 text-emerald-400" },
	};
	const c = cfg[state];
	const icon = state === "correct" ? "✓" : state === "wrong" ? "✗" : state === "correct-other" ? "✓" : letter;
	const popped = state === "correct" || state === "wrong";
	return (
		<button
			type="button"
			onClick={disabled ? undefined : onClick}
			className={`w-full flex items-center gap-[13px] rounded-[13px] border px-[14px] py-[13px] text-left transition-colors ${c.card} ${disabled ? "" : "active:opacity-80"}`}
		>
			<div className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-[13px] font-extrabold transition-colors ${c.badge} ${popped ? "answer-pop" : ""}`}>
				{icon}
			</div>
			<p className="text-[14px] font-medium text-foreground leading-snug">{text}</p>
		</button>
	);
}

const LETTERS = ["A", "B", "C", "D", "E"];

function optionState(
	optId: string,
	correctId: string,
	selected: string | null,
	revealed: boolean,
): OptionState {
	if (!revealed) return selected === optId ? "selected" : "idle";
	if (optId === correctId) return selected === optId ? "correct" : "correct-other";
	if (optId === selected) return "wrong";
	return "idle";
}

// ── Shared back button ───────────────────────────────────────────────────────

function BackBtn({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-[6px] text-[13px] font-medium dark:text-slate-400 text-slate-500 mb-[16px] active:opacity-70"
		>
			<ChevronRight size={15} className="rotate-180" strokeWidth={2.5} />
			{label}
		</button>
	);
}

// ── Main ─────────────────────────────────────────────────────────────────────

type ActiveView =
	| null
	| "lessons"
	| "lesson-player"
	| "daily-challenge"
	| "battles"
	| "earnings-lab"
	| "risk-lab"
	| "mood-simulator"
	| "practice"
	| "wwyd"
	| "watchlist"
	| "sandbox";

export function PlaygroundPage() {
	const { account } = useAccount();
	const [activeView, setActiveView] = useState<ActiveView>(null);
	const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
	const [activeCategory, setActiveCategory] = useState<LessonCategory | null>(null);
	const [showOnboarding, setShowOnboarding] = useState(() =>
		typeof window !== "undefined" && !localStorage.getItem("playground-onboarded")
	);

	// Reset scroll to top whenever the active view changes
	useEffect(() => {
		document.querySelector("[data-scroll-root]")?.scrollTo({ top: 0, behavior: "instant" });
	}, [activeView, showOnboarding]);

	const todayKey = new Date().toISOString().split("T")[0];
	const dailyChallenge = useMemo(() => getDailyChallenge(todayKey), [todayKey]);

	// Daily Brief → Featured Lesson mapping
	const { data: briefData } = useQuery({
		queryKey: ["daily-brief"],
		queryFn: getDailyBrief,
		staleTime: 30 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
		retry: 0,
	});
	const featuredLesson = useMemo(() => {
		if (!briefData) return null;
		const mood = briefData.mood;
		const deckId = briefData.decks?.[0]?.id ?? "";
		// Map mood/deck to a relevant lesson
		const MOOD_LESSON_MAP: Record<string, string> = {
			Bearish:  "what-is-a-bull-bear-market",
			Volatile: "what-is-beta",
			Bullish:  "what-is-revenue-growth",
			Cautious: "why-rates-matter",
			Calm:     "what-is-a-dividend",
			Mixed:    "what-is-a-sector",
		};
		const DECK_LESSON_MAP: Record<string, string> = {
			defensive: "what-is-risk",
			"high-growth": "what-is-revenue-growth",
			earnings: "what-are-earnings",
			rates: "why-rates-matter",
			dividends: "what-is-a-dividend",
			tech: "tech-sector-deep-dive",
		};
		const lessonId = DECK_LESSON_MAP[deckId] ?? MOOD_LESSON_MAP[mood] ?? null;
		if (!lessonId) return null;
		return LESSONS.find(l => l.id === lessonId) ?? null;
	}, [briefData]);
	const challengeCompleted = account?.dailyChallengeState?.date === todayKey &&
		(account.dailyChallengeState.completedIds ?? []).includes(dailyChallenge.id);

	const totalXp = account?.totalXp ?? 0;
	const completedLessons = Object.values(account?.lessonProgress ?? {}).filter(p => p.completed).length;
	const totalLessons = LESSONS.length;

	// Find next incomplete lesson for "Continue Learning"
	const nextLesson = useMemo(() => {
		const completed = new Set(
			Object.entries(account?.lessonProgress ?? {})
				.filter(([, v]) => v.completed)
				.map(([k]) => k)
		);
		return LESSONS.find(l => !completed.has(l.id));
	}, [account?.lessonProgress]);

	// Onboarding gate
	if (showOnboarding) {
		return (
			<PlaygroundOnboarding
				onDone={(startView) => {
					localStorage.setItem("playground-onboarded", "1");
					setShowOnboarding(false);
					if (startView) setActiveView(startView);
				}}
			/>
		);
	}

	// Sub-view routing
	if (activeView === "lessons") {
		return (
			<LessonLibrary
				account={account}
				selectedCategory={activeCategory}
				onSelectCategory={setActiveCategory}
				onSelectLesson={(id) => { setActiveLessonId(id); setActiveView("lesson-player"); }}
				onBack={() => { setActiveView(null); setActiveCategory(null); }}
			/>
		);
	}
	if (activeView === "lesson-player" && activeLessonId) {
		return (
			<LessonPlayer
				lessonId={activeLessonId}
				account={account}
				completedLessons={completedLessons}
				totalLessons={totalLessons}
				onBack={() => setActiveView("lessons")}
				onComplete={() => setActiveView("lessons")}
			/>
		);
	}
	if (activeView === "daily-challenge") {
		return (
			<DailyChallengeView
				challenge={dailyChallenge}
				alreadyCompleted={challengeCompleted}
				account={account}
				onBack={() => setActiveView(null)}
			/>
		);
	}
	if (activeView === "battles") {
		return <BattlesView onBack={() => setActiveView(null)} />;
	}
	if (activeView === "earnings-lab") {
		return <EarningsLabView onBack={() => setActiveView(null)} />;
	}
	if (activeView === "risk-lab") {
		return <RiskLabView onBack={() => setActiveView(null)} />;
	}
	if (activeView === "mood-simulator") {
		return <MoodSimulatorView onBack={() => setActiveView(null)} />;
	}
	if (activeView === "practice") {
		return <PracticeModeView onBack={() => setActiveView(null)} />;
	}
	if (activeView === "wwyd") {
		return <WWYDView onBack={() => setActiveView(null)} />;
	}
	if (activeView === "watchlist") {
		return <WatchlistGameView onBack={() => setActiveView(null)} />;
	}
	if (activeView === "sandbox") {
		return <SandboxView onBack={() => setActiveView(null)} />;
	}

	// ── Level system ─────────────────────────────────────────────────────────
	const LEVELS = [
		{ min: 0,    max: 99,   name: "Beginner",  color: "text-slate-400",  bg: "bg-slate-400/15",  bar: "from-slate-400 to-slate-500"      },
		{ min: 100,  max: 299,  name: "Learner",   color: "text-blue-400",   bg: "bg-blue-400/15",   bar: "from-blue-400 to-blue-500"        },
		{ min: 300,  max: 599,  name: "Investor",  color: "text-cyan-400",   bg: "bg-cyan-400/15",   bar: "from-cyan-400 to-blue-400"        },
		{ min: 600,  max: 999,  name: "Analyst",   color: "text-violet-400", bg: "bg-violet-400/15", bar: "from-violet-400 to-purple-500"    },
		{ min: 1000, max: 9999, name: "Expert",    color: "text-amber-400",  bg: "bg-amber-400/15",  bar: "from-amber-400 to-orange-500"     },
	];
	const currentLevel = [...LEVELS].reverse().find(l => totalXp >= l.min) ?? LEVELS[0]!;
	const nextLevel = LEVELS.find(l => l.min > totalXp);
	const levelPct = nextLevel
		? Math.round(((totalXp - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
		: 100;

	const todayKey2 = new Date().toISOString().split("T")[0];
	const yesterdayKey2 = new Date(Date.now() - 86400000).toISOString().split("T")[0];
	const streakCount = (account?.lastStreakDate === todayKey2 || account?.lastStreakDate === yesterdayKey2)
		? (account?.streakCount ?? 0) : 0;

	// ── Home screen ───────────────────────────────────────────────────────────
	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">

				{/* Header */}
				<div className="flex items-center justify-between mb-[4px]">
					<div className="flex items-center gap-[10px]">
						<StakLogo size={26} />
						<h1 className="text-[24px] font-extrabold tracking-[-0.03em]">Playground</h1>
					</div>
					{streakCount > 0 && (
						<div className="flex items-center gap-[5px] rounded-full bg-orange-500/10 border border-orange-500/25 px-[10px] py-[5px]">
							<span className="text-[14px]">🔥</span>
							<span className="text-[12px] font-bold text-orange-400">{streakCount} day streak</span>
						</div>
					)}
				</div>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">
					No real money. No pressure. Just practice.
				</p>

				{/* Level + XP card */}
				<div className={`rounded-[18px] border border-foreground/10 bg-surface-1 overflow-hidden mb-[20px]`}>
					{/* Top accent bar */}
					<div className={`h-[4px] bg-gradient-to-r ${currentLevel.bar}`} />
					<div className="px-[16px] pt-[14px] pb-[16px]">
						<div className="flex items-center gap-[14px] mb-[14px]">
							<div className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[13px] ${currentLevel.bg} text-[28px]`}>
								{currentLevel.name === "Beginner" ? "🌱" : currentLevel.name === "Learner" ? "📚" : currentLevel.name === "Investor" ? "📈" : currentLevel.name === "Analyst" ? "🔬" : "🏆"}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between">
									<p className={`text-[18px] font-extrabold tracking-tight ${currentLevel.color}`}>{currentLevel.name}</p>
									<p className="text-[14px] font-extrabold text-foreground">{totalXp} <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500">XP</span></p>
								</div>
								<p className="text-[11px] dark:text-slate-400 text-slate-500 mt-[1px]">
									{nextLevel ? `${nextLevel.min - totalXp} XP to unlock ${nextLevel.name}` : "Max level reached 🏆"}
								</p>
								{/* XP progress bar inline */}
								<div className="h-[5px] rounded-full bg-foreground/10 mt-[7px]">
									<div className={`h-full rounded-full bg-gradient-to-r ${currentLevel.bar} transition-all duration-500`} style={{ width: `${levelPct}%` }} />
								</div>
							</div>
						</div>
						{/* Stats row */}
						<div className="grid grid-cols-3 gap-[8px]">
							{[
								{ label: "Lessons", value: `${completedLessons}/${totalLessons}`, pct: completedLessons / totalLessons, color: "bg-blue-400" },
								{ label: "Streak", value: streakCount > 0 ? `${streakCount}d 🔥` : "—", pct: Math.min(1, streakCount / 30), color: "bg-orange-400" },
								{ label: "Badges", value: `${(account?.badges ?? []).length}`, pct: Math.min(1, (account?.badges ?? []).length / 10), color: "bg-violet-400" },
							].map(s => (
								<div key={s.label} className="rounded-[10px] bg-foreground/[0.04] px-[10px] py-[9px]">
									<p className="text-[10px] dark:text-slate-500 text-slate-400 mb-[2px]">{s.label}</p>
									<p className="text-[15px] font-extrabold leading-none">{s.value}</p>
									<div className="h-[3px] rounded-full bg-foreground/10 mt-[6px]">
										<div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${s.pct * 100}%` }} />
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Featured Lesson from Daily Brief */}
				{featuredLesson && !account?.lessonProgress?.[featuredLesson.id]?.completed && featuredLesson.id !== nextLesson?.id && (
					<div className="mb-[20px]">
						<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">
							Featured Today · {briefData?.mood} Market
						</p>
						<button
							type="button"
							onClick={() => { setActiveLessonId(featuredLesson.id); setActiveView("lesson-player"); }}
							className="w-full rounded-[14px] border border-amber-500/30 bg-amber-500/[0.07] px-[16px] py-[14px] text-left active:opacity-80 transition-opacity"
						>
							<div className="flex items-center gap-[12px]">
								<span className="text-[30px]">{featuredLesson.emoji}</span>
								<div className="flex-1 min-w-0">
									<p className="text-[14px] font-bold text-foreground">{featuredLesson.title}</p>
									<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px]">{featuredLesson.subtitle}</p>
									<p className="text-[11px] text-amber-400 mt-[3px]">{featuredLesson.durationMin} min · +{featuredLesson.xp} XP · Relevant to today's market</p>
								</div>
								<div className="shrink-0 grid h-[34px] w-[34px] place-items-center rounded-full bg-amber-500/15 text-amber-400">
									<ChevronRight size={16} />
								</div>
							</div>
						</button>
					</div>
				)}

				{/* Continue Learning */}
				{nextLesson && (
					<div className="mb-[20px]">
						<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Continue Learning</p>
						<button
							type="button"
							onClick={() => { setActiveLessonId(nextLesson.id); setActiveView("lesson-player"); }}
							className="w-full rounded-[14px] border border-blue-500/30 bg-blue-500/[0.07] px-[16px] py-[14px] text-left active:opacity-80 transition-opacity"
						>
							<div className="flex items-center gap-[12px]">
								<span className="text-[30px]">{nextLesson.emoji}</span>
								<div className="flex-1 min-w-0">
									<p className="text-[14px] font-bold text-foreground">{nextLesson.title}</p>
									<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px]">{nextLesson.subtitle}</p>
									<p className="text-[11px] text-blue-400 mt-[3px]">{nextLesson.durationMin} min · +{nextLesson.xp} XP</p>
								</div>
								<div className="shrink-0 grid h-[34px] w-[34px] place-items-center rounded-full bg-blue-500/15 text-blue-400">
									<ChevronRight size={16} />
								</div>
							</div>
						</button>
					</div>
				)}

				{/* Daily Challenge — hero card */}
				<div className="mb-[20px]">
					<button
						type="button"
						onClick={() => setActiveView("daily-challenge")}
						className={`w-full rounded-[18px] border overflow-hidden text-left active:opacity-80 transition-opacity ${challengeCompleted ? "border-emerald-500/30" : "border-amber-500/30"}`}
					>
						{/* Gradient header strip */}
						<div className={`px-[18px] py-[14px] ${challengeCompleted ? "bg-gradient-to-br from-emerald-500/15 to-teal-500/10" : "bg-gradient-to-br from-amber-500/15 to-orange-500/10"}`}>
							<div className="flex items-center justify-between mb-[8px]">
								<div className="flex items-center gap-[6px]">
									<span className="text-[18px]">{challengeCompleted ? "✅" : "⚡"}</span>
									<p className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-300 text-slate-600">Daily Challenge</p>
								</div>
								{challengeCompleted
									? <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-[8px] py-[2px] rounded-full border border-emerald-500/25">Done ✓</span>
									: <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 px-[8px] py-[2px] rounded-full border border-amber-500/25">+{dailyChallenge.xp} XP</span>
								}
							</div>
							<p className="text-[15px] font-bold text-foreground leading-snug">{dailyChallenge.prompt}</p>
						</div>
						{/* Footer strip */}
						{!challengeCompleted && (
							<div className={`flex items-center justify-between px-[18px] py-[10px] bg-surface-1`}>
								<p className="text-[12px] dark:text-slate-400 text-slate-500">Answer to earn {dailyChallenge.xp} XP</p>
								<div className="flex items-center gap-[4px] text-amber-400">
									<p className="text-[12px] font-semibold">Start</p>
									<ChevronRight size={14} />
								</div>
							</div>
						)}
					</button>
				</div>

				{/* All Sections — 2-column grid */}
				<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Explore</p>
				<div className="grid grid-cols-2 gap-[10px] mb-[10px]">
					{[
						{
							colorKey: "lessons", icon: <BookOpen size={20} />, title: "Lessons",
							subtitle: `${totalLessons} lessons`, view: "lessons" as const,
							done: completedLessons, total: totalLessons,
						},
						{
							colorKey: "battles", icon: <Swords size={20} />, title: "Stock Battles",
							subtitle: `${STOCK_BATTLES.length} matchups`, view: "battles" as const,
							done: null, total: null,
						},
						{
							colorKey: "earnings", icon: <FlaskConical size={20} />, title: "Earnings Lab",
							subtitle: `${EARNINGS_SCENARIOS.length} scenarios`, view: "earnings-lab" as const,
							done: null, total: EARNINGS_SCENARIOS.length,
						},
						{
							colorKey: "risk", icon: <ShieldAlert size={20} />, title: "Risk Lab",
							subtitle: `${RISK_SCENARIOS.length} comparisons`, view: "risk-lab" as const,
							done: null, total: null,
						},
						{
							colorKey: "mood", icon: <Brain size={20} />, title: "Market Mood",
							subtitle: `${MOOD_SCENARIOS.length} simulations`, view: "mood-simulator" as const,
							done: null, total: null,
						},
						{
							colorKey: "practice", icon: <TrendingUp size={20} />, title: "Practice",
							subtitle: `${PRACTICE_TICKERS.length} stocks`, view: "practice" as const,
							done: null, total: null,
						},
					].map(s => {
						const c = SECTION_COLORS[s.colorKey] ?? SECTION_COLORS.lessons;
						const pct = s.done != null && s.total ? (s.done / s.total) * 100 : null;
						const allDone = pct === 100;
						return (
							<button
								key={s.title}
								type="button"
								onClick={() => setActiveView(s.view)}
								className={`rounded-[14px] border ${c.border} ${c.bg} px-[14px] py-[14px] text-left active:opacity-80 transition-opacity relative overflow-hidden`}
							>
								{/* Completion shimmer overlay */}
								{allDone && <div className="absolute inset-0 bg-emerald-500/[0.06] pointer-events-none" />}
								<div className="flex items-start justify-between mb-[10px]">
									<div className={`grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-background/60 ${c.icon}`}>
										{s.icon}
									</div>
									{allDone && <span className="text-[10px] font-bold text-emerald-400">✓</span>}
								</div>
								<p className="text-[13px] font-bold text-foreground leading-none mb-[4px]">{s.title}</p>
								<p className="text-[11px] dark:text-slate-400 text-slate-500 mb-[8px]">{s.subtitle}</p>
								{/* Progress bar */}
								{pct !== null && (
									<div className="h-[3px] rounded-full bg-foreground/10">
										<div className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-400" : c.icon.replace("text-", "bg-").split(" ")[0]}`} style={{ width: `${pct}%` }} />
									</div>
								)}
							</button>
						);
					})}
				</div>
				<div className="space-y-[10px]">
					<SectionCard colorKey="lessons" icon={<Star size={22} />} title="Build Your Watchlist" subtitle="Pick 7 stocks for a balanced portfolio" onClick={() => setActiveView("watchlist")} />
					<SectionCard colorKey="sandbox" icon={<Wallet size={22} />} title="Sandbox Portfolio" subtitle="$10,000 practice portfolio" onClick={() => setActiveView("sandbox")} />
				</div>

			</div>
		</div>
	);
}

// ── Lesson Library ─────────────────────────────────────────────────────────

function LessonLibrary({
	account,
	selectedCategory,
	onSelectCategory,
	onSelectLesson,
	onBack,
}: {
	account: ReturnType<typeof useAccount>["account"];
	selectedCategory: LessonCategory | null;
	onSelectCategory: (c: LessonCategory | null) => void;
	onSelectLesson: (id: string) => void;
	onBack: () => void;
}) {
	const completedIds = new Set(
		Object.entries(account?.lessonProgress ?? {}).filter(([, v]) => v.completed).map(([k]) => k)
	);
	const visibleLessons = selectedCategory ? LESSONS.filter(l => l.category === selectedCategory) : LESSONS;

	// Category completion: all lessons in a category done
	const categoryComplete = (cat: LessonCategory) => {
		const inCat = LESSONS.filter(l => l.category === cat);
		return inCat.length > 0 && inCat.every(l => completedIds.has(l.id));
	};
	const totalCompleted = completedIds.size;

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<h2 className="text-[22px] font-extrabold mb-[2px]">Lesson Library</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[14px]">{totalCompleted}/{LESSONS.length} completed</p>

				{/* Overall progress bar */}
				<div className="h-[4px] rounded-full bg-foreground/10 mb-[16px]">
					<div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400 transition-all" style={{ width: `${(totalCompleted / LESSONS.length) * 100}%` }} />
				</div>

				{/* Category filter pills with completion badges */}
				<div className="flex gap-[8px] overflow-x-auto pb-[8px] mb-[20px] [&::-webkit-scrollbar]:hidden">
					<button
						type="button"
						onClick={() => onSelectCategory(null)}
						className={`shrink-0 text-[12px] font-semibold px-[12px] py-[5px] rounded-full border transition-colors ${!selectedCategory ? "bg-foreground text-background border-foreground" : "border-foreground/15 dark:text-slate-400 text-slate-500"}`}
					>All</button>
					{LESSON_CATEGORIES.map(cat => {
						const done = categoryComplete(cat.id);
						return (
							<button
								key={cat.id}
								type="button"
								onClick={() => onSelectCategory(cat.id)}
								className={`shrink-0 text-[12px] font-semibold px-[12px] py-[5px] rounded-full border transition-colors flex items-center gap-[4px] ${selectedCategory === cat.id ? "bg-foreground text-background border-foreground" : done ? "border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-500 dark:text-emerald-400" : "border-foreground/15 dark:text-slate-400 text-slate-500"}`}
							>
								{cat.emoji} {cat.id} {done && <span className="text-[10px]">✓</span>}
							</button>
						);
					})}
				</div>

				{/* Lessons */}
				<div className="space-y-[8px]">
					{visibleLessons.map(lesson => {
						const done = completedIds.has(lesson.id);
						const barColor = CATEGORY_BAR[lesson.category];
						return (
							<button
								key={lesson.id}
								type="button"
								onClick={() => onSelectLesson(lesson.id)}
								className="w-full flex items-stretch rounded-[13px] border border-foreground/10 bg-surface-1 overflow-hidden text-left active:opacity-80 transition-opacity"
							>
								{/* Left accent stripe */}
								<div className={`w-[4px] shrink-0 bg-gradient-to-b ${barColor} ${done ? "opacity-40" : ""}`} />
								<div className="flex items-center gap-[14px] px-[14px] py-[12px] flex-1 min-w-0">
									<span className={`text-[26px] shrink-0 ${done ? "opacity-50" : ""}`}>{lesson.emoji}</span>
									<div className="flex-1 min-w-0">
										<p className={`text-[13px] font-bold ${done ? "dark:text-slate-400 text-slate-500" : "text-foreground"}`}>{lesson.title}</p>
										<p className="text-[11px] dark:text-slate-400 text-slate-500 mt-[2px]">{lesson.subtitle}</p>
										<div className="flex items-center gap-[8px] mt-[5px]">
											<span className={`text-[10px] font-semibold px-[6px] py-[2px] rounded-full border ${CATEGORY_COLORS[lesson.category]}`}>{lesson.category}</span>
											<span className="text-[10px] dark:text-slate-500 text-slate-400">{lesson.durationMin} min · {lesson.xp} XP</span>
										</div>
									</div>
									{done
										? <div className="shrink-0 grid h-[22px] w-[22px] place-items-center rounded-full bg-emerald-500/15 text-emerald-400 text-[12px] font-bold">✓</div>
										: <ChevronRight size={16} className="shrink-0 dark:text-slate-500 text-slate-400" />
									}
								</div>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

// ── Lesson Player ─────────────────────────────────────────────────────────

function LessonPlayer({
	lessonId,
	account,
	completedLessons,
	totalLessons,
	onBack,
	onComplete,
}: {
	lessonId: string;
	account: ReturnType<typeof useAccount>["account"];
	completedLessons: number;
	totalLessons: number;
	onBack: () => void;
	onComplete: () => void;
}) {
	const { completeLesson } = useAccount();
	const lesson = LESSONS.find(l => l.id === lessonId);
	const [cardIndex, setCardIndex] = useState(0);
	const [phase, setPhase] = useState<"cards" | "quiz" | "done">("cards");
	const [selectedOption, setSelectedOption] = useState<string | null>(null);
	const [showResult, setShowResult] = useState(false);
	const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
	const swipeStartX = useRef<number | null>(null);
	const alreadyCompleted = !!(account?.lessonProgress?.[lessonId]?.completed);

	if (!lesson) return null;

	const isLastCard = cardIndex === lesson.cards.length - 1;
	const isCorrect = selectedOption === lesson.quiz.correctId;

	const goNext = () => {
		setSlideDir("left");
		setTimeout(() => { setSlideDir(null); if (isLastCard) { setPhase("quiz"); } else { setCardIndex(i => i + 1); } }, 180);
	};

	const handleNext = goNext;

	const handleSwipeStart = (clientX: number) => { swipeStartX.current = clientX; };
	const handleSwipeEnd = (clientX: number) => {
		if (swipeStartX.current === null || phase !== "cards") return;
		const delta = swipeStartX.current - clientX;
		swipeStartX.current = null;
		if (delta > 50) goNext();
	};

	const handleAnswer = async (optionId: string) => {
		if (showResult) return;
		setSelectedOption(optionId);
		setShowResult(true);
		if (!alreadyCompleted) {
			await completeLesson(lesson.id, lesson.xp);
			// Level-up check — show toast if XP crosses a level boundary
			const prevXp = account?.totalXp ?? 0;
			const newXp = prevXp + lesson.xp;
			const LEVEL_THRESHOLDS = [100, 300, 600, 1000];
			const crossed = LEVEL_THRESHOLDS.find(t => prevXp < t && newXp >= t);
			if (crossed) {
				const levelDefs: Record<number, { name: string; emoji: string; bar: string }> = {
					100:  { name: "Learner",  emoji: "📚", bar: "from-blue-400 to-blue-500"     },
					300:  { name: "Investor", emoji: "📈", bar: "from-cyan-400 to-blue-400"     },
					600:  { name: "Analyst",  emoji: "🔬", bar: "from-violet-400 to-purple-500" },
					1000: { name: "Expert",   emoji: "🏆", bar: "from-amber-400 to-orange-500"  },
				};
				const lv = levelDefs[crossed]!;
				import("sonner").then(({ toast }) => toast.custom(() => (
					<div className="flex items-center gap-[12px] rounded-[14px] border border-violet-500/30 bg-violet-500/[0.1] px-[14px] py-[12px] shadow-lg overflow-hidden relative">
						<div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${lv.bar}`} />
						<span className="text-[28px] shrink-0">{lv.emoji}</span>
						<div>
							<p className="text-[11px] font-semibold uppercase tracking-wide text-violet-400 mb-[1px]">Level Up!</p>
							<p className="text-[14px] font-extrabold text-foreground">You're now a {lv.name}</p>
							<p className="text-[11px] dark:text-slate-400 text-slate-500 mt-[1px]">New challenges unlocked in Playground</p>
						</div>
					</div>
				), { duration: 5000 }));
			}
		}
	};

	const handleFinish = () => {
		setPhase("done");
		setTimeout(onComplete, 1200);
	};

	const progressPct = phase === "cards"
		? ((cardIndex + 1) / (lesson.cards.length + 1)) * 100
		: phase === "quiz" ? 90 : 100;

	return (
		<div className="min-h-full bg-background text-foreground flex flex-col">
			<div className="max-w-lg mx-auto w-full px-[18px] pt-[20px] pb-[32px] flex flex-col flex-1">
				{/* Nav */}
				<div className="flex items-center justify-between mb-[16px]">
					<BackBtn onClick={onBack} />
					<span className="text-[12px] dark:text-slate-400 text-slate-500">{lesson.emoji} {lesson.category}</span>
				</div>

				{/* Progress bar */}
				<div className="h-[4px] rounded-full bg-foreground/10 mb-[24px]">
					<div className="h-full rounded-full bg-blue-400 transition-all duration-300" style={{ width: `${progressPct}%` }} />
				</div>

				{phase === "done" ? (
					<div className="flex-1 flex flex-col items-center justify-center text-center gap-[10px] relative overflow-hidden">
						{/* CSS confetti pieces */}
						{[
							{ color: "bg-amber-400",   left: "20%", delay: "0s"    },
							{ color: "bg-blue-400",    left: "35%", delay: "0.1s"  },
							{ color: "bg-emerald-400", left: "50%", delay: "0.05s" },
							{ color: "bg-rose-400",    left: "65%", delay: "0.15s" },
							{ color: "bg-violet-400",  left: "80%", delay: "0.08s" },
							{ color: "bg-cyan-400",    left: "10%", delay: "0.12s" },
							{ color: "bg-pink-400",    left: "90%", delay: "0.2s"  },
						].map((c, i) => (
							<div key={i} className={`confetti-piece ${c.color}`} style={{ left: c.left, animationDelay: c.delay, top: "10%" }} />
						))}
						<span className="text-[80px] answer-pop" style={{display:"block"}}>🎉</span>
						<h2 className="text-[26px] font-extrabold tracking-tight">Lesson Complete!</h2>
						<div className={`rounded-[14px] border px-[20px] py-[12px] ${alreadyCompleted ? "border-foreground/10 bg-surface-1" : "border-amber-500/25 bg-amber-500/[0.1]"}`}>
							{alreadyCompleted ? (
								<p className="text-[13px] dark:text-slate-400 text-slate-500">Already completed — no double XP</p>
							) : (
								<div className="flex items-center gap-[10px]">
									<Star size={18} className="text-amber-400" />
									<span className="text-[16px] font-extrabold text-amber-400">+{lesson.xp} XP earned</span>
								</div>
							)}
						</div>
						<div className="flex items-center gap-[6px] dark:text-slate-400 text-slate-500">
							<div className="h-[5px] w-[80px] rounded-full bg-foreground/10 overflow-hidden">
								<div className="h-full rounded-full bg-blue-400" style={{ width: `${((completedLessons + (alreadyCompleted ? 0 : 1)) / totalLessons) * 100}%` }} />
							</div>
							<span className="text-[12px]">{completedLessons + (alreadyCompleted ? 0 : 1)}/{totalLessons}</span>
						</div>
					</div>
				) : phase === "cards" ? (
					<div className="flex-1 flex flex-col"
						onPointerDown={e => handleSwipeStart(e.clientX)}
						onPointerUp={e => handleSwipeEnd(e.clientX)}
					>
						<div
							className={`flex-1 rounded-[18px] border border-foreground/10 bg-surface-1 flex flex-col overflow-hidden transition-all duration-180 ${slideDir === "left" ? "opacity-0 -translate-x-4" : "opacity-100 translate-x-0"}`}
							style={{ transform: slideDir === "left" ? "translateX(-16px)" : "translateX(0)", opacity: slideDir === "left" ? 0 : 1, transition: "transform 0.18s ease, opacity 0.18s ease" }}
						>
							{/* Category accent bar */}
							<div className={`h-[5px] bg-gradient-to-r ${CATEGORY_BAR[lesson.category]} shrink-0`} />
							<div className="p-[24px] flex flex-col flex-1">
								{/* Dot indicators + counter */}
								<div className="flex items-center gap-[6px] mb-[18px]">
									{lesson.cards.map((_, i) => (
										<div key={i} className={`h-[4px] rounded-full transition-all duration-200 ${i === cardIndex ? "w-[18px]" : "w-[4px]"} ${i === cardIndex ? "bg-blue-400" : i < cardIndex ? "bg-blue-400/40" : "bg-foreground/15"}`} />
									))}
									<div className="ml-auto text-[11px] dark:text-slate-400 text-slate-500 font-medium">{cardIndex + 1} / {lesson.cards.length}</div>
								</div>
								<h2 className="text-[21px] font-extrabold mb-[14px] leading-snug tracking-tight">{lesson.cards[cardIndex]!.heading}</h2>
								<p className="text-[15px] dark:text-slate-300 text-slate-600 leading-relaxed flex-1">{lesson.cards[cardIndex]!.body}</p>
							</div>
						</div>
						<button
							type="button"
							onClick={handleNext}
							className="mt-[16px] w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white shadow-lg active:opacity-80"
							style={{ background: "linear-gradient(90deg,#3b82f6,#6366f1)" }}
						>
							{isLastCard ? "Take the Quiz →" : "Next →"}
						</button>
					</div>
				) : (
					<div className="flex-1 flex flex-col">
						<div className="flex-1 flex flex-col">
							<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[12px]">Quick Quiz</p>
							<h2 className="text-[18px] font-extrabold mb-[20px] leading-snug">{lesson.quiz.question}</h2>
							<div className="space-y-[8px] flex-1">
								{lesson.quiz.options.map((opt, i) => (
									<OptionBtn
										key={opt.id}
										letter={LETTERS[i] ?? String(i + 1)}
										text={opt.text}
										state={optionState(opt.id, lesson.quiz.correctId, selectedOption, showResult)}
										onClick={() => handleAnswer(opt.id)}
										disabled={showResult}
									/>
								))}
							</div>
							{showResult && (
								<div className={`mt-[16px] rounded-[12px] p-[14px] ${isCorrect ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-rose-500/10 border border-rose-500/25"}`}>
									<p className={`text-[13px] font-bold mb-[4px] ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>{isCorrect ? "Correct! 🎉" : "Not quite — but now you know."}</p>
									<p className="text-[12px] dark:text-slate-300 text-slate-600">{lesson.quiz.explanation}</p>
								</div>
							)}
						</div>
						{showResult && (
							<div className="mt-[16px] space-y-[8px]">
								<button
									type="button"
									onClick={handleFinish}
									className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white shadow-lg active:opacity-80"
									style={{ background: isCorrect ? "linear-gradient(90deg,#10b981,#3b82f6)" : "linear-gradient(90deg,#3b82f6,#6366f1)" }}
								>
									{isCorrect ? `Finish · +${lesson.xp} XP 🎉` : "Got it — finish lesson"}
								</button>
								{!isCorrect && (
									<button
										type="button"
										onClick={() => { setSelectedOption(null); setShowResult(false); }}
										className="w-full h-[40px] rounded-[12px] font-medium text-[13px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80"
									>
										Try again
									</button>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

// ── Daily Challenge View ───────────────────────────────────────────────────

function DailyChallengeView({
	challenge,
	alreadyCompleted,
	account,
	onBack,
}: {
	challenge: ReturnType<typeof getDailyChallenge>;
	alreadyCompleted: boolean;
	account: ReturnType<typeof useAccount>["account"];
	onBack: () => void;
}) {
	const { completeChallenge } = useAccount();
	const [selected, setSelected] = useState<string | null>(null);
	const [showResult, setShowResult] = useState(alreadyCompleted);
	const isCorrect = selected === challenge.correctId;

	const handleAnswer = async (id: string) => {
		if (showResult) return;
		setSelected(id);
		setShowResult(true);
		if (!alreadyCompleted) {
			await completeChallenge(challenge.id, challenge.xp);
			// Counts as qualifying activity for streak (same as brand_tap)
			trackEvent("brand_tap").catch(() => {});
		}
	};

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<div className="flex items-center gap-[10px] mb-[20px]">
					<div className="grid h-[40px] w-[40px] place-items-center rounded-[10px] bg-amber-500/15 text-amber-400">
						<Zap size={20} />
					</div>
					<div>
						<p className="text-[12px] dark:text-slate-400 text-slate-500 uppercase tracking-wide">Daily Challenge</p>
						<h2 className="text-[18px] font-extrabold leading-tight">Today's Question</h2>
					</div>
				</div>

				<div className="rounded-[16px] border border-foreground/10 bg-surface-1 p-[20px] mb-[16px]">
					<p className="text-[16px] font-bold text-foreground leading-snug">{challenge.prompt}</p>
					<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[6px]">+{challenge.xp} XP on completion</p>
				</div>

				<div className="space-y-[8px] mb-[16px]">
					{challenge.options.map((opt, i) => (
						<OptionBtn
							key={opt.id}
							letter={LETTERS[i] ?? String(i + 1)}
							text={opt.text}
							state={optionState(opt.id, challenge.correctId, selected, showResult)}
							onClick={() => handleAnswer(opt.id)}
							disabled={showResult}
						/>
					))}
				</div>

				{showResult && (
					<div className={`rounded-[12px] p-[14px] ${(isCorrect || alreadyCompleted) ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-amber-500/10 border border-amber-500/25"}`}>
						<p className="text-[13px] font-bold mb-[4px]">{alreadyCompleted ? "Already completed ✓" : isCorrect ? "Correct! 🎉" : "Not quite."}</p>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{challenge.explanation}</p>
						{!alreadyCompleted && <p className="text-[12px] text-amber-400 font-semibold mt-[8px]">+{challenge.xp} XP earned!</p>}
					</div>
				)}
			</div>
		</div>
	);
}

// ── Stock Battles ─────────────────────────────────────────────────────────

function BattleDetail({ battleId, onBack, onResult }: { battleId: string; onBack: () => void; onResult?: (won: boolean) => void }) {
	const battle = STOCK_BATTLES.find(b => b.id === battleId)!;
	const [selected, setSelected] = useState<"A" | "B" | null>(null);
	const { addXp } = useAccount();
	const xpAwarded = useRef(false);
	const handlePick = (side: "A" | "B") => {
		if (selected) return;
		setSelected(side);
		if (!xpAwarded.current) { xpAwarded.current = true; addXp(battle.xp).catch(() => {}); }
		// Report win/loss once live data is available; if not available, skip
		setTimeout(() => {
			if (liveWinner) onResult?.(side === liveWinner);
		}, 50);
	};

	const { data: dataA } = useQuery({
		queryKey: ["stock", battle.tickerA],
		queryFn: () => getStockData(battle.tickerA),
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});
	const { data: dataB } = useQuery({
		queryKey: ["stock", battle.tickerB],
		queryFn: () => getStockData(battle.tickerB),
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});

	// Extract the relevant metric value for each side
	function getMetricValue(data: typeof dataA): string | null {
		if (!data?.metrics) return null;
		const m = data.metrics;
		if (battle.metric === "revenueGrowth") return m.revenueGrowth;
		if (battle.metric === "profitMargin") return m.profitMargin;
		if (battle.metric === "peRatio") return m.peRatio != null ? `${m.peRatio}x` : null;
		if (battle.metric === "marketCap") return m.marketCap;
		return null;
	}

	const valA = getMetricValue(dataA);
	const valB = getMetricValue(dataB);

	// Determine live winner (parse numeric value from string like "23.4%" or "45.2x")
	function parseMetricNum(v: string | null): number | null {
		if (!v) return null;
		const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
		return isNaN(n) ? null : n;
	}
	const numA = parseMetricNum(valA);
	const numB = parseMetricNum(valB);
	const liveWinner: "A" | "B" | null = numA != null && numB != null
		? (battle.higherWins ? (numA >= numB ? "A" : "B") : (numA <= numB ? "A" : "B"))
		: null;

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} label="All Battles" />
				<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[4px]">{battle.category}</p>
				<h2 className="text-[20px] font-extrabold mb-[2px]">{battle.nameA} vs {battle.nameB}</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">
					Which has the {battle.higherWins ? "higher" : "lower"} {battle.metricLabel}?
				</p>

				<div className="relative grid grid-cols-2 gap-[12px] mb-[20px]">
					{/* VS badge — centred between cards */}
					<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 grid h-[28px] w-[28px] place-items-center rounded-full bg-background border border-foreground/15 text-[11px] font-extrabold dark:text-slate-400 text-slate-500">
						VS
					</div>
					{(["A", "B"] as const).map(side => {
						const name = side === "A" ? battle.nameA : battle.nameB;
						const ticker = side === "A" ? battle.tickerA : battle.tickerB;
						const val = side === "A" ? valA : valB;
						const isSelected = selected === side;
						const isWinner = selected && liveWinner === side;
						let cls = "border-foreground/10 bg-surface-1";
						if (selected) {
							if (isWinner) cls = "border-emerald-500/50 bg-emerald-500/[0.08]";
							else cls = "border-foreground/10 bg-surface-1 opacity-50";
						} else if (isSelected) cls = "border-blue-500/60 bg-blue-500/10";
						return (
							<button key={side} type="button" onClick={() => handlePick(side)}
								className={`rounded-[14px] border px-[16px] py-[18px] text-center transition-all relative ${cls}`}>
								{/* Crown on winner */}
								{isWinner && <span className="absolute -top-[14px] left-1/2 -translate-x-1/2 text-[20px]">👑</span>}
								<p className="text-[15px] font-extrabold text-foreground">{ticker}</p>
								<p className="text-[11px] dark:text-slate-400 text-slate-500 mt-[2px]">{name}</p>
								{selected && val ? (
									<p className={`text-[18px] font-extrabold mt-[8px] ${isWinner ? "text-emerald-400" : "dark:text-slate-300 text-slate-600"}`}>{val}</p>
								) : !selected && val ? (
									<p className="text-[14px] font-bold text-foreground/50 mt-[8px]">?</p>
								) : null}
								{selected && isWinner && <p className="text-[10px] text-emerald-400 font-semibold mt-[4px]">Winner ✓</p>}
								{isSelected && !selected && <p className="text-[11px] text-blue-400 mt-[4px]">My pick</p>}
							</button>
						);
					})}
				</div>

				{selected ? (
					<div className="space-y-[10px]">
						{/* Score reveal */}
						{valA && valB && (
							<div className="rounded-[12px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px]">
								<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[8px]">Live {battle.metricLabel}</p>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-[12px] dark:text-slate-400 text-slate-500">{battle.nameA}</p>
										<p className={`text-[20px] font-extrabold ${liveWinner === "A" ? "text-emerald-400" : "text-foreground"}`}>{valA}</p>
									</div>
									<p className="text-[18px] font-bold dark:text-slate-500 text-slate-400">vs</p>
									<div className="text-right">
										<p className="text-[12px] dark:text-slate-400 text-slate-500">{battle.nameB}</p>
										<p className={`text-[20px] font-extrabold ${liveWinner === "B" ? "text-emerald-400" : "text-foreground"}`}>{valB}</p>
									</div>
								</div>
							</div>
						)}
						<div className="rounded-[14px] border border-foreground/10 bg-surface-1 p-[16px] mb-[12px]">
							<p className="text-[13px] font-bold mb-[6px]">Here's the story 📊</p>
							<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{battle.explanation}</p>
							<p className="text-[12px] text-amber-400 font-semibold mt-[10px]">+{battle.xp} XP</p>
						</div>
						<div className="space-y-[8px]">
							<button type="button" onClick={onBack} className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80" style={{ background: "linear-gradient(90deg,#f43f5e,#e11d48)" }}>
								All Battles
							</button>
							<button type="button" onClick={() => { setSelected(null); xpAwarded.current = false; }} className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">
								Rematch ↺
							</button>
						</div>
					</div>
				) : (
					<p className="text-center text-[13px] dark:text-slate-400 text-slate-500 mt-[8px]">Tap a stock to make your pick</p>
				)}
			</div>
		</div>
	);
}

function BattlesView({ onBack }: { onBack: () => void }) {
	const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
	const [results, setResults] = useState<Record<string, "win" | "loss">>({});

	const wins = Object.values(results).filter(r => r === "win").length;
	const total = Object.keys(results).length;

	const handleBattleResult = (battleId: string, won: boolean) => {
		setResults(r => ({ ...r, [battleId]: won ? "win" : "loss" }));
	};

	if (activeBattleId) {
		return (
			<BattleDetail
				battleId={activeBattleId}
				onBack={() => setActiveBattleId(null)}
				onResult={(won) => handleBattleResult(activeBattleId, won)}
			/>
		);
	}

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<h2 className="text-[22px] font-extrabold mb-[2px]">Stock Battles</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">Pick the winner. See the real numbers.</p>

				{/* Win rate banner */}
				{total > 0 && (
					<div className="flex items-center gap-[10px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[14px] py-[10px] mb-[16px]">
						<div className="grid h-[36px] w-[36px] place-items-center rounded-[9px] bg-rose-500/10 text-rose-400">
							<Swords size={18} />
						</div>
						<div className="flex-1">
							<p className="text-[12px] font-bold">Your Record: {wins}W – {total - wins}L</p>
							<div className="h-[4px] rounded-full bg-foreground/10 mt-[4px]">
								<div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(wins / total) * 100}%` }} />
							</div>
						</div>
						<p className={`text-[14px] font-extrabold ${wins / total >= 0.5 ? "text-emerald-400" : "text-rose-400"}`}>
							{Math.round((wins / total) * 100)}%
						</p>
					</div>
				)}

				<div className="space-y-[8px]">
					{STOCK_BATTLES.map(b => {
						const result = results[b.id];
						return (
							<button key={b.id} type="button" onClick={() => setActiveBattleId(b.id)}
								className={`w-full flex items-center gap-[14px] rounded-[13px] border px-[14px] py-[12px] text-left active:opacity-80 ${result ? (result === "win" ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-rose-500/25 bg-rose-500/[0.04]") : "border-foreground/10 bg-surface-1"}`}>
								<div className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] ${result ? (result === "win" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400") : "bg-rose-500/10 text-rose-400"}`}>
									{result ? (result === "win" ? "✓" : "✗") : <Swords size={17} />}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-[14px] font-bold">{b.nameA} vs {b.nameB}</p>
									<p className="text-[12px] dark:text-slate-400 text-slate-500">{b.category} · {b.metricLabel}</p>
								</div>
								<ChevronRight size={16} className="shrink-0 dark:text-slate-500 text-slate-400" />
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

// ── Earnings Lab ──────────────────────────────────────────────────────────

function EarningsLabView({ onBack }: { onBack: () => void }) {
	const { addXp } = useAccount();
	const [activeId, setActiveId] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(null);
	const [phase, setPhase] = useState<"question" | "outcome">("question");
	const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
	const xpAwarded = useRef(false);

	const scenario = EARNINGS_SCENARIOS.find(s => s.id === activeId);
	const currentIdx = EARNINGS_SCENARIOS.findIndex(s => s.id === activeId);
	const nextScenario = EARNINGS_SCENARIOS[currentIdx + 1];

	const openScenario = (id: string) => {
		setActiveId(id);
		setSelected(null);
		setPhase("question");
		xpAwarded.current = false;
	};

	const backToList = () => {
		setActiveId(null);
		setSelected(null);
		setPhase("question");
	};

	if (scenario) {
		const alreadyDone = completedIds.has(scenario.id);
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={backToList} label="All Scenarios" />
					<div className="flex items-center gap-[10px] mb-[16px]">
						<div className="grid h-[40px] w-[40px] place-items-center rounded-[10px] bg-purple-500/10 text-purple-400">
							<FlaskConical size={18} />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[12px] dark:text-slate-400 text-slate-500">Earnings Lab</p>
							<h2 className="text-[18px] font-extrabold">{scenario.company} ({scenario.ticker})</h2>
						</div>
						{alreadyDone && <span className="shrink-0 text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-emerald-500/15 text-emerald-400">Done ✓</span>}
					</div>

					{/* Analyst card — pre-question context */}
					<div className="rounded-[14px] border border-purple-500/20 overflow-hidden mb-[16px]">
						{/* Header strip */}
						<div className="bg-purple-500/[0.08] px-[14px] py-[10px] border-b border-purple-500/15 flex items-center justify-between">
							<p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Pre-Earnings Brief</p>
							<p className="text-[11px] dark:text-slate-400 text-slate-500">{scenario.ticker}</p>
						</div>
						<div className="p-[14px] bg-surface-1">
							<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed mb-[12px]">{scenario.context}</p>
							{/* Analyst estimates row */}
							<div className="grid grid-cols-3 gap-[8px]">
								<div className="rounded-[10px] border border-foreground/[0.07] bg-foreground/[0.03] p-[10px] text-center">
									<p className="text-[9px] font-semibold uppercase tracking-wide dark:text-slate-500 text-slate-400 mb-[3px]">Revenue Est.</p>
									<p className="text-[14px] font-extrabold">{scenario.revenueExpected}</p>
								</div>
								<div className="rounded-[10px] border border-foreground/[0.07] bg-foreground/[0.03] p-[10px] text-center">
									<p className="text-[9px] font-semibold uppercase tracking-wide dark:text-slate-500 text-slate-400 mb-[3px]">EPS Est.</p>
									<p className="text-[14px] font-extrabold">{scenario.epsExpected}</p>
								</div>
								<div className={`rounded-[10px] border p-[10px] text-center ${scenario.stockContext.includes("Down") || scenario.stockContext.includes("down") ? "border-rose-500/20 bg-rose-500/[0.05]" : scenario.stockContext.includes("Up") || scenario.stockContext.includes("up") || scenario.stockContext.includes("near") ? "border-emerald-500/20 bg-emerald-500/[0.05]" : "border-foreground/[0.07] bg-foreground/[0.03]"}`}>
									<p className="text-[9px] font-semibold uppercase tracking-wide dark:text-slate-500 text-slate-400 mb-[3px]">Stock</p>
									<p className={`text-[11px] font-bold leading-tight ${scenario.stockContext.includes("Down") || scenario.stockContext.includes("down") ? "text-rose-400" : scenario.stockContext.includes("Up") || scenario.stockContext.includes("up") ? "text-emerald-400" : "text-foreground"}`}>{scenario.stockContext}</p>
								</div>
							</div>
						</div>
					</div>

					{phase === "question" ? (
						<>
							<p className="text-[15px] font-bold mb-[12px]">{scenario.question}</p>
							<div className="space-y-[8px]">
								{scenario.options.map((opt, i) => (
									<OptionBtn
										key={opt.id}
										letter={LETTERS[i] ?? String(i + 1)}
										text={opt.text}
										state={selected === opt.id ? "selected" : "idle"}
										onClick={() => {
											if (!selected) {
												setSelected(opt.id);
												setPhase("outcome");
												setCompletedIds(prev => new Set([...prev, scenario.id]));
												if (!xpAwarded.current) { xpAwarded.current = true; addXp(scenario.xp).catch(() => {}); }
											}
										}}
									/>
								))}
							</div>
						</>
					) : (
						<>
							{/* Show options with correct/wrong revealed */}
							<p className="text-[15px] font-bold mb-[10px]">{scenario.question}</p>
							<div className="space-y-[8px] mb-[14px]">
								{scenario.options.map((opt, i) => (
									<OptionBtn
										key={opt.id}
										letter={LETTERS[i] ?? String(i + 1)}
										text={opt.text}
										state={optionState(opt.id, scenario.correctId, selected, true)}
										disabled
									/>
								))}
							</div>

							<div className="rounded-[12px] border border-purple-500/30 bg-purple-500/[0.07] p-[14px] mb-[12px]">
								<p className="text-[12px] text-purple-400 font-semibold uppercase tracking-wide mb-[4px]">What Actually Happened</p>
								<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.outcome}</p>
							</div>
							<div className="rounded-[12px] border border-foreground/10 bg-surface-1 p-[14px] mb-[14px]">
								<p className="text-[12px] dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wide mb-[4px]">The Lesson</p>
								<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.explanation}</p>
								{!alreadyDone && <p className="text-[12px] text-amber-400 font-semibold mt-[8px]">+{scenario.xp} XP</p>}
							</div>
							{/* Navigation buttons */}
							<div className="space-y-[8px]">
								{nextScenario && (
									<button type="button" onClick={() => openScenario(nextScenario.id)}
										className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
										style={{ background: "linear-gradient(90deg,#8b5cf6,#6366f1)" }}>
										Next: {nextScenario.company} →
									</button>
								)}
								<button type="button" onClick={backToList}
									className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">
									All Scenarios
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		);
	}

	const doneCount = completedIds.size;

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<h2 className="text-[22px] font-extrabold mb-[2px]">Earnings Lab</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">Learn why stocks react the way they do after earnings.</p>

				{/* Progress indicator */}
				{doneCount > 0 && (
					<div className="flex items-center gap-[10px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[14px] py-[10px] mb-[16px]">
						<div className="flex-1">
							<div className="flex items-center justify-between mb-[4px]">
								<p className="text-[12px] font-semibold">{doneCount}/{EARNINGS_SCENARIOS.length} completed</p>
								{doneCount === EARNINGS_SCENARIOS.length && <span className="text-[11px] text-emerald-400 font-bold">All done! 🎉</span>}
							</div>
							<div className="h-[4px] rounded-full bg-foreground/10">
								<div className="h-full rounded-full bg-purple-400 transition-all" style={{ width: `${(doneCount / EARNINGS_SCENARIOS.length) * 100}%` }} />
							</div>
						</div>
					</div>
				)}

				<div className="space-y-[8px]">
					{EARNINGS_SCENARIOS.map(s => {
						const done = completedIds.has(s.id);
						return (
							<button key={s.id} type="button" onClick={() => openScenario(s.id)}
								className={`w-full flex items-center gap-[14px] rounded-[13px] border px-[14px] py-[12px] text-left active:opacity-80 ${done ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-foreground/10 bg-surface-1"}`}>
								<div className={`grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[10px] ${done ? "bg-emerald-500/15 text-emerald-400" : "bg-purple-500/10 text-purple-400"}`}>
									{done ? <span className="text-[18px] font-bold">✓</span> : <FlaskConical size={18} />}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-[14px] font-bold">{s.company} Earnings</p>
									<p className="text-[12px] dark:text-slate-400 text-slate-500 line-clamp-1">{s.context.slice(0, 60)}…</p>
								</div>
								<ChevronRight size={16} className="shrink-0 dark:text-slate-500 text-slate-400" />
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

// ── Risk Lab ─────────────────────────────────────────────────────────────

function RiskLabView({ onBack }: { onBack: () => void }) {
	const { addXp } = useAccount();
	const [index, setIndex] = useState(0);
	const [selected, setSelected] = useState<"A" | "B" | null>(null);
	const [done, setDone] = useState(false);
	const [correct, setCorrect] = useState(0);
	const awardedRisk = useRef(new Set<number>());
	const scenario = RISK_SCENARIOS[index];

	if (!scenario) return null;

	if (done) {
		const total = RISK_SCENARIOS.length;
		const pct = Math.round((correct / total) * 100);
		const tier = pct >= 80 ? { emoji: "🛡️", label: "Risk Expert", msg: "You spotted every trap. You understand what separates safe stocks from dangerous ones.", color: "text-orange-400", border: "border-orange-500/25", bg: "bg-orange-500/[0.07]" }
			: pct >= 50 ? { emoji: "⚠️", label: "Risk Aware", msg: "You caught most of them. The trickier cases are where real losses happen — review the ones you missed.", color: "text-amber-400", border: "border-amber-500/25", bg: "bg-amber-500/[0.07]" }
			: { emoji: "📚", label: "Keep Learning", msg: "Risk is one of the hardest concepts in investing. The more scenarios you see, the sharper your instincts get.", color: "text-rose-400", border: "border-rose-500/25", bg: "bg-rose-500/[0.07]" };
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<div className={`rounded-[18px] border ${tier.border} ${tier.bg} p-[24px] mb-[16px] text-center`}>
						<span className="text-[56px] block mb-[10px]">{tier.emoji}</span>
						<p className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-[4px]">Risk Lab</p>
						<h2 className="text-[26px] font-extrabold mb-[4px]">{tier.label}</h2>
						<p className={`text-[42px] font-extrabold ${tier.color} leading-none my-[12px]`}>{correct}<span className="text-[22px] dark:text-slate-400 text-slate-500">/{total}</span></p>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed max-w-[280px] mx-auto">{tier.msg}</p>
					</div>
					<div className="space-y-[8px]">
						<button type="button" onClick={onBack} className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80" style={{ background: "linear-gradient(90deg,#f97316,#ef4444)" }}>Back to Playground</button>
						<button type="button" onClick={() => { setIndex(0); setSelected(null); setDone(false); setCorrect(0); awardedRisk.current.clear(); }} className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">Try Again</button>
					</div>
				</div>
			</div>
		);
	}

	const next = () => {
		const isCorrect = selected !== scenario.riskierOption;
		if (index < RISK_SCENARIOS.length - 1) { setIndex(i => i + 1); setSelected(null); setCorrect(c => isCorrect ? c + 1 : c); }
		else { setCorrect(c => isCorrect ? c + 1 : c); setDone(true); }
	};

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<div className="flex items-center justify-between mb-[20px]">
					<div>
						<p className="text-[12px] dark:text-slate-400 text-slate-500 uppercase tracking-wide">Risk Lab</p>
						<h2 className="text-[18px] font-extrabold">Spot the Risk</h2>
					</div>
					<p className="text-[12px] dark:text-slate-400 text-slate-500">{index + 1} / {RISK_SCENARIOS.length}</p>
				</div>

				<div className="h-[4px] rounded-full bg-foreground/10 mb-[24px]">
					<div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${((index + 1) / RISK_SCENARIOS.length) * 100}%` }} />
				</div>

				<p className="text-[16px] font-bold mb-[16px]">{scenario.prompt}</p>

				<div className="space-y-[8px] mb-[16px]">
					{(["A", "B"] as const).map(side => {
						const text = side === "A" ? scenario.optionA : scenario.optionB;
						const isRiskier = side === scenario.riskierOption;
						let state: OptionState = "idle";
						if (selected) state = isRiskier ? "wrong" : "correct";
						else if (selected === side) state = "selected";
						return (
							<OptionBtn
								key={side}
								letter={side}
								text={text + (selected ? (isRiskier ? " — Higher Risk ⚠️" : " — More Stable ✓") : "")}
								state={state}
								onClick={() => { if (!selected) { setSelected(side); if (!awardedRisk.current.has(index)) { awardedRisk.current.add(index); addXp(scenario!.xp).catch(() => {}); } } }}
								disabled={!!selected}
							/>
						);
					})}
				</div>

				{selected && (
					<>
						<div className="rounded-[12px] border border-orange-500/25 bg-orange-500/[0.07] p-[14px] mb-[14px]">
							<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.explanation}</p>
							<p className="text-[12px] text-amber-400 font-semibold mt-[8px]">+{scenario.xp} XP</p>
						</div>
						<button type="button" onClick={next}
							className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
							style={{ background: "linear-gradient(90deg,#f97316,#ef4444)" }}>
							{index < RISK_SCENARIOS.length - 1 ? "Next →" : "Done"}
						</button>
					</>
				)}
			</div>
		</div>
	);
}

// ── Market Mood Simulator ────────────────────────────────────────────────

function MoodSimulatorView({ onBack }: { onBack: () => void }) {
	const { addXp } = useAccount();
	const [index, setIndex] = useState(0);
	const [selected, setSelected] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [correct, setCorrect] = useState(0);
	const awardedMood = useRef(new Set<number>());
	const scenario = MOOD_SCENARIOS[index];

	if (!scenario) return null;

	if (done) {
		const total = MOOD_SCENARIOS.length;
		const pct = Math.round((correct / total) * 100);
		const tier = pct >= 80 ? { emoji: "🧠", label: "Macro Mind", msg: "You understand how global events ripple through markets. That's a rare edge most investors never develop.", color: "text-cyan-400", border: "border-cyan-500/25", bg: "bg-cyan-500/[0.07]" }
			: pct >= 50 ? { emoji: "📊", label: "Getting There", msg: "Solid macro awareness. The tricky ones usually involve second-order effects — practice makes these intuitive.", color: "text-blue-400", border: "border-blue-500/25", bg: "bg-blue-500/[0.07]" }
			: { emoji: "🌍", label: "Macro is Hard", msg: "Macro is genuinely complex — professional investors get it wrong constantly. Keep going through the scenarios.", color: "text-violet-400", border: "border-violet-500/25", bg: "bg-violet-500/[0.07]" };
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<div className={`rounded-[18px] border ${tier.border} ${tier.bg} p-[24px] mb-[16px] text-center`}>
						<span className="text-[56px] block mb-[10px]">{tier.emoji}</span>
						<p className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-[4px]">Market Mood</p>
						<h2 className="text-[26px] font-extrabold mb-[4px]">{tier.label}</h2>
						<p className={`text-[42px] font-extrabold ${tier.color} leading-none my-[12px]`}>{correct}<span className="text-[22px] dark:text-slate-400 text-slate-500">/{total}</span></p>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed max-w-[280px] mx-auto">{tier.msg}</p>
					</div>
					<div className="space-y-[8px]">
						<button type="button" onClick={onBack} className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80" style={{ background: "linear-gradient(90deg,#06b6d4,#6366f1)" }}>Back to Playground</button>
						<button type="button" onClick={() => { setIndex(0); setSelected(null); setDone(false); setCorrect(0); awardedMood.current.clear(); }} className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">Try Again</button>
					</div>
				</div>
			</div>
		);
	}

	const next = () => {
		const isRight = selected === scenario.correctId;
		if (index < MOOD_SCENARIOS.length - 1) { setIndex(i => i + 1); setSelected(null); setCorrect(c => isRight ? c + 1 : c); }
		else { setCorrect(c => isRight ? c + 1 : c); setDone(true); }
	};
	const isCorrect = selected === scenario.correctId;

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<div className="flex items-center justify-between mb-[20px]">
					<div>
						<p className="text-[12px] dark:text-slate-400 text-slate-500 uppercase tracking-wide">Market Mood</p>
						<h2 className="text-[18px] font-extrabold">Simulator</h2>
					</div>
					<p className="text-[12px] dark:text-slate-400 text-slate-500">{index + 1} / {MOOD_SCENARIOS.length}</p>
				</div>

				<div className="h-[4px] rounded-full bg-foreground/10 mb-[24px]">
					<div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${((index + 1) / MOOD_SCENARIOS.length) * 100}%` }} />
				</div>

				<div className="rounded-[14px] border border-cyan-500/25 bg-cyan-500/[0.07] px-[16px] py-[14px] mb-[16px]">
					<p className="text-[18px] font-bold">{scenario.event}</p>
				</div>

				<p className="text-[15px] font-bold mb-[12px]">{scenario.question}</p>

				<div className="space-y-[8px] mb-[16px]">
					{scenario.options.map((opt, i) => (
						<OptionBtn
							key={opt.id}
							letter={LETTERS[i] ?? String(i + 1)}
							text={opt.text}
							state={optionState(opt.id, scenario.correctId, selected, !!selected)}
							onClick={() => { if (!selected) { setSelected(opt.id); if (!awardedMood.current.has(index)) { awardedMood.current.add(index); addXp(scenario!.xp).catch(() => {}); } } }}
							disabled={!!selected}
						/>
					))}
				</div>

				{selected && (
					<>
						<div className={`rounded-[12px] p-[14px] mb-[14px] ${isCorrect ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-amber-500/10 border border-amber-500/25"}`}>
							<p className="text-[13px] font-bold mb-[4px]">{isCorrect ? "Correct! 🎉" : "Good try."}</p>
							<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.explanation}</p>
							<p className="text-[12px] text-amber-400 font-semibold mt-[8px]">+{scenario.xp} XP</p>
						</div>
						<button type="button" onClick={next}
							className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
							style={{ background: "linear-gradient(90deg,#06b6d4,#6366f1)" }}>
							{index < MOOD_SCENARIOS.length - 1 ? "Next →" : "Done"}
						</button>
					</>
				)}
			</div>
		</div>
	);
}

// ── Practice Mode ─────────────────────────────────────────────

function PracticeModeView({ onBack }: { onBack: () => void }) {
	const [shuffled] = useState(() => [...PRACTICE_TICKERS].sort(() => Math.random() - 0.5));
	const [idx, setIdx] = useState(0);
	const [decision, setDecision] = useState<'save' | 'pass' | 'learn' | null>(null);
	const stock = shuffled[idx % shuffled.length]!;
	const { data: stockData, isLoading } = useQuery({ queryKey: ['stock', stock.ticker], queryFn: () => getStockData(stock.ticker), staleTime: 2 * 60 * 1000, retry: 1 });
	const next = () => { setIdx(i => (i + 1) % shuffled.length); setDecision(null); };
	const quote = stockData?.quote;
	const metrics = stockData?.metrics;
	const isUp = (quote?.changePercent ?? 0) >= 0;

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<div className="flex items-center justify-between mb-[2px]">
					<h2 className="text-[22px] font-extrabold">Practice Mode</h2>
					<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">{(idx % shuffled.length) + 1} / {shuffled.length}</span>
				</div>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">Real stock. Fake stakes. What would you do?</p>
				<div className="rounded-[16px] border border-foreground/10 bg-surface-1 p-[18px] mb-[20px]">
					<div className="flex items-center justify-between mb-[14px]">
						<div><p className="text-[22px] font-extrabold">{stock.name}</p><p className="text-[12px] dark:text-slate-400 text-slate-500">{stock.ticker}</p></div>
						{quote ? (<div className="text-right"><p className="text-[20px] font-extrabold">${quote.price.toFixed(2)}</p><p className={`text-[13px] font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>{isUp ? '+' : ''}{quote.changePercent.toFixed(2)}% today</p></div>) : isLoading ? (<div className="space-y-[4px]"><div className="h-[20px] w-[80px] rounded bg-foreground/10 animate-pulse" /><div className="h-[13px] w-[60px] rounded bg-foreground/10 animate-pulse" /></div>) : null}
					</div>
					{metrics && (<div className="grid grid-cols-3 gap-[8px] mb-[14px]">{[{label:'P/E',value:metrics.peRatio!=null?`${metrics.peRatio}x`:'N/A'},{label:'Rev. Growth',value:metrics.revenueGrowth??'N/A'},{label:'Margin',value:metrics.profitMargin??'N/A'}].map(m=>(<div key={m.label} className="rounded-[8px] bg-foreground/[0.04] p-[8px] text-center"><p className="text-[10px] dark:text-slate-500 text-slate-400">{m.label}</p><p className="text-[13px] font-bold">{m.value}</p></div>))}</div>)}
					<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed italic">"{stock.prompt}"</p>
				</div>
				{!decision ? (<>
					<p className="text-[13px] font-semibold text-center dark:text-slate-400 text-slate-500 mb-[12px] uppercase tracking-wide">What's your move?</p>
					<div className="space-y-[10px]">
						{([
							{ d: 'save' as const,  emoji: "✅", label: "Save it",    sub: "Add to watchlist for tracking",   cls: "border-emerald-500/35 bg-emerald-500/[0.07] text-emerald-400" },
							{ d: 'learn' as const, emoji: "🔍", label: "Learn More", sub: "Read analysis before deciding",   cls: "border-blue-500/35 bg-blue-500/[0.07] text-blue-400" },
							{ d: 'pass' as const,  emoji: "⏩", label: "Pass",       sub: "Not for me right now",            cls: "border-foreground/15 bg-foreground/[0.03] dark:text-slate-400 text-slate-500" },
						]).map(({ d, emoji, label, sub, cls }) => (
							<button key={d} type="button" onClick={() => setDecision(d)}
								className={`w-full flex items-center gap-[14px] rounded-[14px] border px-[16px] py-[14px] text-left active:opacity-80 transition-opacity ${cls}`}>
								<span className="text-[24px] shrink-0">{emoji}</span>
								<div>
									<p className="text-[14px] font-bold">{label}</p>
									<p className="text-[11px] opacity-70 mt-[1px]">{sub}</p>
								</div>
							</button>
						))}
					</div>
				</>) : (<>
					<div className={`rounded-[14px] border p-[14px] mb-[14px] ${decision==='save'?'border-emerald-500/30 bg-emerald-500/[0.07]':decision==='pass'?'border-rose-500/30 bg-rose-500/[0.07]':'border-blue-500/30 bg-blue-500/[0.07]'}`}>
						<p className="text-[13px] font-bold mb-[6px]">{decision==='save'?'Good instinct.':decision==='pass'?'Smart discipline.':'Great approach.'}</p>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{decision === 'save' ? `Good instinct adding ${stock.name}. ${stock.prompt}` : decision === 'pass' ? `Passing on ${stock.name} is valid. ${stock.prompt} Patience is a skill.` : `Smart — learning more first. ${stock.prompt} Understanding the thesis gives you conviction.`}</p>
					</div>
					<button type="button" onClick={next} className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80" style={{background:'linear-gradient(90deg,#10b981,#3b82f6)'}}>Next Stock</button>
				</>)}
			</div>
		</div>
	);
}

// ── What Would You Do? ────────────────────────────────────────

function WWYDView({ onBack }: { onBack: () => void }) {
	const { addXp } = useAccount();
	const [idx, setIdx] = useState(0);
	const [selected, setSelected] = useState<string | null>(null);
	const awardedWwyd = useRef(new Set<number>());
	const scenario = WWYD_SCENARIOS[idx];
	if (!scenario) return null;
	const isBest = selected === scenario.bestId;
	const next = () => { if (idx < WWYD_SCENARIOS.length - 1) { setIdx(i => i + 1); setSelected(null); } else onBack(); };
	const handleSelect = (id: string) => { if (selected) return; setSelected(id); if (!awardedWwyd.current.has(idx)) { awardedWwyd.current.add(idx); addXp(scenario.xp).catch(() => {}); } };
	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<div className="flex items-center justify-between mb-[20px]">
					<div><p className="text-[12px] dark:text-slate-400 text-slate-500 uppercase tracking-wide">Decision Training</p><h2 className="text-[18px] font-extrabold">What Would You Do?</h2></div>
					<p className="text-[12px] dark:text-slate-400 text-slate-500">{idx + 1}/{WWYD_SCENARIOS.length}</p>
				</div>
				<div className="h-[4px] rounded-full bg-foreground/10 mb-[24px]"><div className="h-full rounded-full bg-purple-400 transition-all" style={{width:`${((idx+1)/WWYD_SCENARIOS.length)*100}%`}} /></div>
				<div className="rounded-[14px] border border-violet-500/20 bg-surface-1 overflow-hidden mb-[16px] flex">
					<div className="w-[4px] shrink-0 bg-gradient-to-b from-violet-500 to-purple-400" />
					<div className="p-[16px]">
						<div className="flex items-center gap-[6px] mb-[8px]">
							<span className="text-[14px]">📋</span>
							<p className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Scenario</p>
						</div>
						<p className="text-[15px] font-bold leading-snug">{scenario.scenario}</p>
					</div>
				</div>
				<div className="space-y-[8px] mb-[16px]">
					{scenario.options.map((opt, i) => (
						<OptionBtn
							key={opt.id}
							letter={LETTERS[i] ?? String(i + 1)}
							text={opt.text}
							state={optionState(opt.id, scenario.bestId, selected, !!selected)}
							onClick={() => handleSelect(opt.id)}
							disabled={!!selected}
						/>
					))}
				</div>
				{selected && (<>
					{/* Why each option was right or wrong */}
					<div className="space-y-[6px] mb-[12px]">
						{scenario.options.map(opt => {
							const isBestOpt = opt.id === scenario.bestId;
							const isUserPick = opt.id === selected;
							const wrongNote = scenario.wrongNotes?.[opt.id];
							if (isBestOpt) return (
								<div key={opt.id} className="rounded-[10px] border border-emerald-500/30 bg-emerald-500/[0.07] px-[12px] py-[10px]">
									<p className="text-[12px] font-bold text-emerald-400 mb-[2px]">✓ Best move{isUserPick ? " — your pick" : ""}</p>
									<p className="text-[12px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.explanation}</p>
								</div>
							);
							if (wrongNote) return (
								<div key={opt.id} className={`rounded-[10px] border px-[12px] py-[10px] ${isUserPick ? "border-rose-500/30 bg-rose-500/[0.07]" : "border-foreground/[0.06] bg-foreground/[0.02]"}`}>
									<p className={`text-[12px] font-bold mb-[2px] ${isUserPick ? "text-rose-400" : "dark:text-slate-400 text-slate-500"}`}>{isUserPick ? "✗ Your pick" : `Option ${opt.id.toUpperCase()}`}</p>
									<p className="text-[12px] dark:text-slate-400 text-slate-500 leading-relaxed">{wrongNote}</p>
								</div>
							);
							return null;
						})}
					</div>
					<div className="flex items-center justify-between mb-[12px]">
						<p className="text-[12px] text-amber-400 font-semibold">+{scenario.xp} XP</p>
					</div>
					<button type="button" onClick={next} className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80" style={{background:'linear-gradient(90deg,#8b5cf6,#6366f1)'}}>{idx<WWYD_SCENARIOS.length-1?'Next Scenario':'Done'}</button>
				</>)}
			</div>
		</div>
	);
}
// ── Build Your First Watchlist ────────────────────────────────

function WatchlistGameView({ onBack }: { onBack: () => void }) {
	const [picks, setPicks] = useState<Record<number, string | null>>(() => Object.fromEntries(WATCHLIST_SLOTS.map((_, i) => [i, null])));
	const [activeSlot, setActiveSlot] = useState<number | null>(null);
	const [showResult, setShowResult] = useState(false);

	const totalSlots = WATCHLIST_SLOTS.length;
	const filled = Object.values(picks).filter(Boolean).length;
	const allFilled = filled === totalSlots;

	const getPicksForSlot = (slotIdx: number) => {
		const slot = WATCHLIST_SLOTS[slotIdx]!;
		const alreadyPicked = new Set(Object.values(picks).filter(Boolean) as string[]);
		return WATCHLIST_BRANDS.filter(b => b.types.some(t => slot.type === t) && !alreadyPicked.has(b.id));
	};

	const pick = (slotIdx: number, brandId: string) => {
		setPicks(p => ({ ...p, [slotIdx]: brandId }));
		setActiveSlot(null);
	};

	const clear = (slotIdx: number) => setPicks(p => ({ ...p, [slotIdx]: null }));

	// Grade the watchlist
	const gradeWatchlist = () => {
		const pickedBrands = Object.values(picks).filter(Boolean).map(id => WATCHLIST_BRANDS.find(b => b.id === id)!).filter(Boolean);
		// Count unique brands per primary type (first type = primary) to avoid double-counting multi-typed brands
		const primaryTypes = pickedBrands.map(b => b.types[0]!);
		const specCount = primaryTypes.filter(t => t === "speculative").length;
		const growthCount = primaryTypes.filter(t => t === "growth").length;
		const defCount = primaryTypes.filter(t => t === "defensive" || t === "dividend").length;
		const hasDefensive = pickedBrands.some(b => b.types.includes("defensive"));
		const hasDividend = pickedBrands.some(b => b.types.includes("dividend"));
		const specPct = Math.round((specCount / totalSlots) * 100);
		const growthPct = Math.round((growthCount / totalSlots) * 100);
		const defensivePct = Math.round((defCount / totalSlots) * 100);
		let grade = "B";
		let feedback = "";
		if (hasDefensive && hasDividend && specPct <= 29) { grade = "A"; feedback = "Solid balance. You have defensive anchors, dividend income, and controlled speculative exposure."; }
		else if (specPct >= 57) { grade = "C"; feedback = "Very speculative. You are heavy on high-risk names. Consider adding a defensive or dividend stock for balance."; }
		else if (!hasDefensive) { grade = "B-"; feedback = "Good start but no defensive anchor. Adding a stable stock like Costco or J&J would reduce your downside risk."; }
		else { grade = "B"; feedback = "Decent portfolio. A mix of growth and stability. You could tighten the risk profile with more dividend exposure."; }
		return { grade, feedback, specPct, growthPct, defensivePct };
	};

	if (showResult) {
		const { grade, feedback, specPct, growthPct, defensivePct } = gradeWatchlist();
		const pickedBrands = Object.values(picks).filter(Boolean).map(id => WATCHLIST_BRANDS.find(b => b.id === id)!).filter(Boolean);
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<button type="button" onClick={() => setShowResult(false)} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]"><ChevronRight size={14} className="rotate-180" /> Edit Picks</button>
					<h2 className="text-[22px] font-extrabold mb-[2px]">Your Watchlist</h2>
					<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">Here is how your picks look.</p>
					<div className={`rounded-[18px] border overflow-hidden mb-[16px] ${grade.startsWith('A') ? 'border-emerald-500/25' : grade.startsWith('B') ? 'border-blue-500/20' : 'border-amber-500/25'}`}>
						{/* Grade header */}
						<div className={`p-[18px] text-center ${grade.startsWith('A') ? 'bg-emerald-500/[0.08]' : grade.startsWith('B') ? 'bg-blue-500/[0.07]' : 'bg-amber-500/[0.08]'}`}>
							<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[4px]">Portfolio Grade</p>
							<p className={`text-[58px] font-extrabold leading-none ${grade.startsWith('A') ? 'text-emerald-400' : grade.startsWith('B') ? 'text-blue-400' : 'text-amber-400'}`}>{grade}</p>
							<p className="text-[13px] dark:text-slate-300 text-slate-600 mt-[8px] leading-relaxed max-w-[280px] mx-auto">{feedback}</p>
						</div>
						{/* Portfolio mix bar */}
						<div className="p-[14px] bg-surface-1">
							<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Portfolio Mix</p>
							{/* Stacked bar */}
							<div className="flex h-[10px] rounded-full overflow-hidden gap-[2px] mb-[10px]">
								{growthPct > 0 && <div className="bg-blue-500 rounded-l-full" style={{width:`${growthPct}%`}} />}
								{defensivePct > 0 && <div className={`bg-emerald-500 ${growthPct === 0 ? 'rounded-l-full' : ''} ${specPct === 0 ? 'rounded-r-full' : ''}`} style={{width:`${defensivePct}%`}} />}
								{specPct > 0 && <div className="bg-rose-500 rounded-r-full" style={{width:`${specPct}%`}} />}
								{(100 - growthPct - defensivePct - specPct) > 0 && <div className="bg-foreground/20 rounded-r-full flex-1" />}
							</div>
							<div className="flex justify-between text-[11px]">
								{[{label:'Growth',pct:growthPct,dot:'bg-blue-500'},{label:'Defensive',pct:defensivePct,dot:'bg-emerald-500'},{label:'Speculative',pct:specPct,dot:'bg-rose-500'}].map(s => (
									<div key={s.label} className="flex items-center gap-[5px]">
										<div className={`w-[6px] h-[6px] rounded-full ${s.dot}`} />
										<span className="font-semibold dark:text-slate-300 text-slate-600">{s.label} {s.pct}%</span>
									</div>
								))}
							</div>
						</div>
					</div>
					<div className="space-y-[6px]">
						{pickedBrands.map(b => (
							<div key={b.id} className="flex items-center gap-[12px] rounded-[10px] border border-foreground/10 bg-surface-1 px-[12px] py-[10px]">
								<p className="text-[13px] font-bold min-w-[48px]">{b.ticker}</p>
								<div className="flex-1 min-w-0"><p className="text-[12px] dark:text-slate-300 text-slate-600 truncate">{b.name}</p></div>
								<div className="flex gap-[4px]">{b.types.slice(0,2).map(t => (<span key={t} className="text-[10px] px-[6px] py-[2px] rounded-full bg-foreground/[0.06] dark:text-slate-400 text-slate-500">{t}</span>))}</div>
							</div>
						))}
					</div>
					<button type="button" onClick={onBack} className="mt-[20px] w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80" style={{background:'linear-gradient(90deg,#3b82f6,#6366f1)'}}>Done</button>
				</div>
			</div>
		);
	}

	if (activeSlot !== null) {
		const slot = WATCHLIST_SLOTS[activeSlot]!;
		const options = getPicksForSlot(activeSlot);
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={() => setActiveSlot(null)} />
					<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[4px]">Pick a {slot.label}</p>
					<h2 className="text-[20px] font-extrabold mb-[2px]">{slot.emoji} {slot.label}</h2>
					<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">{slot.description}</p>
					<div className="space-y-[8px]">
						{options.map(b => (
							<button key={b.id} type="button" onClick={() => pick(activeSlot, b.id)}
								className="w-full flex items-center gap-[12px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px] text-left active:opacity-80">
								<div className="flex-1 min-w-0">
									<p className="text-[14px] font-bold">{b.ticker} — {b.name}</p>
									<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px]">{b.description}</p>
								</div>
								<ChevronRight size={14} className="shrink-0 dark:text-slate-500 text-slate-400" />
							</button>
						))}
						{options.length === 0 && <p className="text-[13px] dark:text-slate-500 text-slate-400 text-center py-[20px]">All options already picked. Clear another slot first.</p>}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<h2 className="text-[22px] font-extrabold mb-[2px]">Build Your Watchlist</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[6px]">Fill all 7 slots to build a balanced beginner portfolio.</p>
				<p className="text-[12px] dark:text-slate-400 text-slate-500 mb-[20px]">{filled}/{totalSlots} slots filled</p>
				<div className="h-[4px] rounded-full bg-foreground/10 mb-[20px]"><div className="h-full rounded-full bg-blue-400 transition-all" style={{width:`${(filled/totalSlots)*100}%`}} /></div>
				<div className="space-y-[8px] mb-[20px]">
					{WATCHLIST_SLOTS.map((slot, i) => {
						const pickedId = picks[i];
						const brand = pickedId ? WATCHLIST_BRANDS.find(b => b.id === pickedId) : null;
						return (
							<div key={i} className="flex items-center gap-[12px] rounded-[13px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px]">
								<span className="text-[22px] shrink-0">{slot.emoji}</span>
								<div className="flex-1 min-w-0">
									<p className="text-[12px] dark:text-slate-400 text-slate-500 uppercase tracking-wide text-[10px]">{slot.label}</p>
									{brand ? (
										<p className="text-[14px] font-bold text-foreground">{brand.ticker} — {brand.name}</p>
									) : (
										<p className="text-[13px] dark:text-slate-500 text-slate-400">Not picked yet</p>
									)}
								</div>
								{brand ? (
									<div className="flex items-center gap-[6px]">
										<button type="button" onClick={() => setActiveSlot(i)} className="text-[11px] text-blue-400 font-medium px-[8px] py-[4px] rounded-full border border-blue-500/30 bg-blue-500/[0.06]">Change</button>
										<button type="button" onClick={() => clear(i)} className="text-[11px] text-rose-400">✕</button>
									</div>
								) : (
									<button type="button" onClick={() => setActiveSlot(i)} className="shrink-0 text-[12px] font-semibold px-[10px] py-[5px] rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">Pick</button>
								)}
							</div>
						);
					})}
				</div>
				{allFilled && (
					<button type="button" onClick={() => setShowResult(true)} className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80" style={{background:'linear-gradient(90deg,#3b82f6,#6366f1)'}}>Grade My Watchlist →</button>
				)}
			</div>
		</div>
	);
}
// ── Sandbox Portfolio ─────────────────────────────────────────

// Each position gets a fixed $1,000 allocation (up to 10 positions = $10K)
const SANDBOX_BUDGET = 10000;
const SANDBOX_PER_POSITION = 1000;

function SandboxView({ onBack }: { onBack: () => void }) {
	const { account, addToSandbox, removeFromSandbox } = useAccount();
	const queryClient = useQueryClient();
	const sandbox = account?.sandboxPortfolio ?? {};
	const tickers = Object.keys(sandbox);
	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState<"pnl" | "today" | "recent">("recent");
	const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

	// Brand lookup map
	const brandMap = useMemo(() => new Map(allBrands.map(b => [b.ticker?.toUpperCase(), b])), []);

	const stockQueries = tickers.map(ticker => ({
		queryKey: ['stock', ticker],
		queryFn: () => getStockData(ticker),
		staleTime: 60 * 1000,
		retry: 1,
	}));
	const results = useQueries({ queries: stockQueries });

	const [adding, setAdding] = useState(false);

	const holdings = tickers.map((ticker, i) => {
		const entry = sandbox[ticker]!;
		const quote = (results[i] as { data?: { quote?: { price?: number; changePercent?: number } } })?.data?.quote;
		const currentPrice = quote?.price ?? null;
		const pricePct = entry.priceAtAdd && currentPrice
			? ((currentPrice - entry.priceAtAdd) / entry.priceAtAdd) * 100 : null;
		const priceDollar = pricePct !== null ? (SANDBOX_PER_POSITION * pricePct) / 100 : null;
		const brand = brandMap.get(ticker.toUpperCase());
		return { ticker, entry, currentPrice, pricePct, priceDollar, changePercent: quote?.changePercent ?? null, brand };
	});

	const sortedHoldings = [...holdings].sort((a, b) => {
		if (sortBy === "pnl") return (b.pricePct ?? -999) - (a.pricePct ?? -999);
		if (sortBy === "today") return (b.changePercent ?? -999) - (a.changePercent ?? -999);
		return b.entry.addedAt - a.entry.addedAt; // recent first
	});

	// Total value: each position is worth SANDBOX_PER_POSITION adjusted by P&L
	const investedTotal = tickers.length * SANDBOX_PER_POSITION;
	const totalValue = holdings.reduce((sum, h) => {
		if (!h.currentPrice || !h.entry.priceAtAdd) return sum + SANDBOX_PER_POSITION;
		return sum + SANDBOX_PER_POSITION * (h.currentPrice / h.entry.priceAtAdd);
	}, 0);
	const totalDollarPnl = totalValue - investedTotal;
	const totalPct = investedTotal > 0 ? (totalDollarPnl / investedTotal) * 100 : 0;

	const topWinner = holdings.filter(h => h.pricePct !== null).sort((a, b) => (b.pricePct ?? 0) - (a.pricePct ?? 0))[0];
	const topLoser = holdings.filter(h => h.pricePct !== null).sort((a, b) => (a.pricePct ?? 0) - (b.pricePct ?? 0))[0];

	const handleAdd = async (ticker: string) => {
		const cached = queryClient.getQueryData<{ quote: { price: number } | null }>(["stock", ticker.toUpperCase()]);
		let price: number | null = cached?.quote?.price ?? null;
		if (!price) {
			try { price = (await getStockData(ticker.toUpperCase()))?.quote?.price ?? null; } catch { /* ignore */ }
		}
		await addToSandbox(ticker.toUpperCase(), price);
		setAdding(false);
	};

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<h2 className="text-[22px] font-extrabold mb-[2px]">Sandbox Portfolio</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">Practice money only. No real trades. $1,000 per position.</p>

				{/* Portfolio overview */}
				<div className="rounded-[18px] border border-violet-500/25 overflow-hidden mb-[20px]">
					<div className="bg-violet-500/[0.08] px-[18px] pt-[16px] pb-[14px]">
						<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[4px]">Portfolio Value</p>
						<div className="flex items-end justify-between">
							<p className="text-[32px] font-extrabold leading-none">
								${tickers.length > 0 ? totalValue.toFixed(0) : "—"}
							</p>
							{tickers.length > 0 && (
								<div className="text-right">
									<p className={`text-[16px] font-extrabold ${totalPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
										{totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}%
									</p>
									<p className={`text-[12px] font-semibold ${totalDollarPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
										{totalDollarPnl >= 0 ? '+' : ''}${totalDollarPnl.toFixed(0)}
									</p>
								</div>
							)}
						</div>
					</div>
					{tickers.length > 0 && (
						<div className="bg-surface-1 px-[18px] py-[12px]">
							<div className="flex items-center justify-between text-[12px]">
								<span className="dark:text-slate-400 text-slate-500">{tickers.length} positions · ${investedTotal.toLocaleString()} invested</span>
								<div className="flex items-center gap-[10px]">
									{topWinner && <span className="text-emerald-400 font-semibold">{topWinner.ticker} +{topWinner.pricePct?.toFixed(1)}%</span>}
									{topLoser && topLoser.ticker !== topWinner?.ticker && <span className="text-rose-400 font-semibold">{topLoser.ticker} {topLoser.pricePct?.toFixed(1)}%</span>}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Holdings */}
				{tickers.length > 0 && (
					<div className="mb-[16px]">
						{/* Sort controls */}
						<div className="flex items-center justify-between mb-[10px]">
							<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500">Holdings</p>
							<div className="flex gap-[6px]">
								{(["recent","pnl","today"] as const).map(s => (
									<button key={s} type="button" onClick={() => setSortBy(s)}
										className={`text-[10px] font-semibold px-[8px] py-[3px] rounded-full border transition-colors ${sortBy === s ? "bg-foreground text-background border-foreground" : "border-foreground/15 dark:text-slate-400 text-slate-500"}`}>
										{s === "recent" ? "Recent" : s === "pnl" ? "Best P&L" : "Today"}
									</button>
								))}
							</div>
						</div>

						{/* P&L bar chart */}
						{holdings.some(h => h.pricePct !== null) && (
							<div className="rounded-[12px] border border-foreground/10 bg-surface-1 px-[12px] py-[10px] mb-[10px]">
								<p className="text-[10px] dark:text-slate-500 text-slate-400 mb-[8px] uppercase tracking-wide font-semibold">P&L Since Added</p>
								<div className="space-y-[6px]">
									{[...holdings].filter(h => h.pricePct !== null).sort((a, b) => (b.pricePct ?? 0) - (a.pricePct ?? 0)).map(h => {
										const pct = h.pricePct ?? 0;
										const maxAbs = Math.max(...holdings.filter(x => x.pricePct !== null).map(x => Math.abs(x.pricePct ?? 0)), 1);
										const barWidth = Math.min(100, (Math.abs(pct) / maxAbs) * 100);
										return (
											<div key={h.ticker} className="flex items-center gap-[8px]">
												<p className="text-[11px] font-bold w-[40px] shrink-0">{h.ticker}</p>
												<div className="flex-1 h-[5px] rounded-full bg-foreground/10 overflow-hidden">
													<div className={`h-full rounded-full ${pct >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${barWidth}%` }} />
												</div>
												<p className={`text-[11px] font-bold w-[48px] text-right shrink-0 ${pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
													{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
												</p>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* Holdings list */}
						<div className="space-y-[6px]">
							{sortedHoldings.map(h => {
								const logoUrl = h.brand?.domain ? `https://logo.clearbit.com/${h.brand.domain}` : null;
								return (
									<div key={h.ticker}>
										<div className="flex items-center gap-[12px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[12px] py-[10px]">
											{/* Logo */}
											<div className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-full bg-white shadow-sm overflow-hidden">
												{logoUrl ? (
													<img src={logoUrl} alt="" className="w-[26px] h-[26px] object-contain"
														onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
												) : (
													<span className="text-[10px] font-bold text-slate-600">{h.ticker.slice(0,2)}</span>
												)}
											</div>
											{/* Name + price */}
											<div className="flex-1 min-w-0">
												<p className="text-[13px] font-bold leading-none">{h.brand?.name ?? h.ticker}</p>
												<p className="text-[11px] dark:text-slate-400 text-slate-500 mt-[2px]">
													{h.currentPrice ? `$${h.currentPrice.toFixed(2)}` : h.ticker}
													{h.entry.priceAtAdd ? ` · cost $${h.entry.priceAtAdd.toFixed(2)}` : ""}
												</p>
											</div>
											{/* P&L + today */}
											<div className="text-right shrink-0">
												{h.pricePct !== null ? (
													<>
														<p className={`text-[13px] font-bold ${h.pricePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
															{h.pricePct >= 0 ? '+' : ''}{h.pricePct.toFixed(1)}%
														</p>
														{h.changePercent !== null && (
															<p className={`text-[10px] ${h.changePercent >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
																{h.changePercent >= 0 ? '▲' : '▼'} {Math.abs(h.changePercent).toFixed(2)}% today
															</p>
														)}
													</>
												) : <p className="text-[11px] dark:text-slate-500 text-slate-400">Loading…</p>}
											</div>
											{/* Remove */}
											<button type="button" onClick={() => setConfirmRemove(h.ticker)}
												className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-foreground/[0.06] dark:text-slate-400 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 transition-colors text-[12px]">
												✕
											</button>
										</div>
										{/* Confirm remove inline */}
										{confirmRemove === h.ticker && (
											<div className="flex items-center justify-between bg-rose-500/[0.08] border border-rose-500/20 rounded-[10px] px-[12px] py-[9px] mt-[4px]">
												<p className="text-[12px] font-medium dark:text-slate-300 text-slate-600">Remove {h.brand?.name ?? h.ticker}?</p>
												<div className="flex gap-[8px]">
													<button type="button" onClick={() => setConfirmRemove(null)} className="text-[11px] dark:text-slate-400 text-slate-500 px-[8px] py-[3px]">Keep</button>
													<button type="button" onClick={() => { removeFromSandbox(h.ticker); setConfirmRemove(null); }}
														className="text-[11px] font-semibold text-rose-400 bg-rose-500/15 px-[10px] py-[3px] rounded-full">Remove</button>
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}

				{tickers.length === 0 && (
					<div className="rounded-[18px] border border-dashed border-foreground/20 p-[32px] text-center mb-[16px]">
						<div className="text-[48px] mb-[12px]">📈</div>
						<p className="text-[16px] font-extrabold mb-[6px]">Build your practice portfolio</p>
						<p className="text-[13px] dark:text-slate-400 text-slate-500 leading-relaxed max-w-[240px] mx-auto">
							Add any stock from the app and track how your picks would have performed — no real money needed.
						</p>
						<p className="text-[12px] text-violet-400 font-semibold mt-[10px]">$1,000 per position · up to 10 positions</p>
					</div>
				)}

				{/* Add stock */}
				{adding ? (
					<div className="rounded-[14px] border border-foreground/10 bg-surface-1 overflow-hidden">
						{/* Search header */}
						<div className="flex items-center gap-[10px] px-[14px] py-[12px] border-b border-foreground/[0.06]">
							<input
								type="text"
								value={search}
								onChange={e => setSearch(e.target.value)}
								placeholder="Search stocks…"
								autoFocus
								className="flex-1 bg-transparent text-[14px] text-foreground placeholder:dark:text-slate-500 placeholder:text-slate-400 outline-none"
							/>
							<button type="button" onClick={() => { setAdding(false); setSearch(""); }} className="text-[12px] dark:text-slate-400 text-slate-500 shrink-0">Cancel</button>
						</div>
						{/* Brand list */}
						<div className="max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
							{(() => {
								const q = search.toLowerCase().trim();
								const available = allBrands
									.filter(b => b.ticker && !tickers.includes(b.ticker.toUpperCase()))
									.filter(b => !q || b.name.toLowerCase().includes(q) || b.ticker.toLowerCase().includes(q))
									.slice(0, 40);
								if (available.length === 0) return (
									<p className="text-[13px] dark:text-slate-400 text-slate-500 text-center py-[20px]">No matches found</p>
								);
								return available.map(b => (
									<button
										key={b.id}
										type="button"
										onClick={() => { handleAdd(b.ticker); setSearch(""); }}
										className="w-full flex items-center gap-[12px] px-[14px] py-[11px] border-b border-foreground/[0.04] last:border-b-0 text-left active:bg-foreground/[0.04] transition-colors"
									>
										<div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-white shadow-sm overflow-hidden">
											{b.logo || b.domain ? (
												<img
													src={b.logo ?? `https://logo.clearbit.com/${b.domain}`}
													alt={b.name}
													className="w-[24px] h-[24px] object-contain"
													onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
												/>
											) : (
												<span className="text-[11px] font-bold dark:text-slate-600 text-slate-500">{b.ticker.slice(0, 2)}</span>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-[13px] font-semibold text-foreground">{b.name}</p>
											<p className="text-[11px] dark:text-slate-400 text-slate-500">{b.ticker}</p>
										</div>
									</button>
								));
							})()}
						</div>
					</div>
				) : (
					<button type="button" onClick={() => setAdding(true)}
						className="w-full h-[44px] rounded-[12px] border border-violet-500/30 bg-violet-500/[0.07] text-violet-400 font-semibold text-[14px] active:opacity-80">
						+ Add Stock
					</button>
				)}
			</div>
		</div>
	);
}
// ── Playground Onboarding ─────────────────────────────────────────────────────

const ONBOARDING_SLIDES = [
	{
		emoji: "🧠",
		title: "Welcome to Playground",
		body: "This is your practice space. No real money, no pressure — just a better way to understand stocks before you invest.",
		accent: "from-violet-500/20 to-blue-500/20",
		border: "border-violet-500/30",
	},
	{
		emoji: "📚",
		title: "Learn & Practice",
		body: "Work through bite-sized lessons, daily challenges, and real-world scenarios. Each section is designed to build a different skill — from reading earnings to spotting risk.",
		accent: "from-blue-500/20 to-cyan-500/20",
		border: "border-blue-500/30",
	},
	{
		emoji: "⚡",
		title: "Earn XP & Level Up",
		body: "Every lesson, challenge, battle, and lab earns you XP. Progress from Beginner → Learner → Investor → Analyst → Expert. Your level shows on your profile.",
		accent: "from-amber-500/20 to-orange-500/20",
		border: "border-amber-500/30",
	},
	{
		emoji: "🚀",
		title: "Where do you want to start?",
		body: "Pick what sounds most interesting. You can explore everything — this just gets you started.",
		accent: "from-emerald-500/20 to-teal-500/20",
		border: "border-emerald-500/30",
		isPicker: true,
	},
];

const START_OPTIONS: { label: string; emoji: string; view: ActiveView; desc: string }[] = [
	{ label: "Lessons",         emoji: "📖", view: "lessons",         desc: "Start with the basics" },
	{ label: "Daily Challenge", emoji: "⚡", view: "daily-challenge", desc: "Quick 1-question warm-up" },
	{ label: "Stock Battles",   emoji: "⚔️", view: "battles",         desc: "Pick the winning stock" },
	{ label: "Just browse",     emoji: "🗺️", view: null,              desc: "See everything first" },
];

function PlaygroundOnboarding({ onDone }: { onDone: (startView: ActiveView | null) => void }) {
	const [slide, setSlide] = useState(0);
	const isLast = slide === ONBOARDING_SLIDES.length - 1;
	const current = ONBOARDING_SLIDES[slide]!;

	return (
		<div className="min-h-full bg-background text-foreground flex flex-col">
			<div className="max-w-lg mx-auto w-full px-[18px] pt-[20px] pb-[32px] flex flex-col flex-1">

				{/* Progress dots */}
				<div className="flex items-center justify-center gap-[8px] mb-[32px] mt-[8px]">
					{ONBOARDING_SLIDES.map((_, i) => (
						<div key={i} className={`rounded-full transition-all duration-200 ${i === slide ? "w-[24px] h-[6px] bg-foreground" : i < slide ? "w-[6px] h-[6px] bg-foreground/40" : "w-[6px] h-[6px] bg-foreground/15"}`} />
					))}
				</div>

				{/* Slide card */}
				<div className={`flex-1 rounded-[20px] border ${current.border} bg-gradient-to-br ${current.accent} p-[28px] flex flex-col`}>
					<div className="flex-1 flex flex-col items-center justify-center text-center">
						<span className="text-[72px] mb-[20px] block">{current.emoji}</span>
						<h2 className="text-[24px] font-extrabold mb-[12px] leading-tight">{current.title}</h2>
						<p className="text-[15px] dark:text-slate-300 text-slate-600 leading-relaxed max-w-[320px]">{current.body}</p>
					</div>

					{/* Picker on last slide */}
					{current.isPicker && (
						<div className="grid grid-cols-2 gap-[10px] mt-[24px]">
							{START_OPTIONS.map(opt => (
								<button
									key={opt.label}
									type="button"
									onClick={() => onDone(opt.view)}
									className="rounded-[14px] border border-foreground/10 bg-background/60 px-[14px] py-[14px] text-left active:opacity-80 transition-opacity"
								>
									<span className="text-[24px] block mb-[6px]">{opt.emoji}</span>
									<p className="text-[13px] font-bold text-foreground">{opt.label}</p>
									<p className="text-[11px] dark:text-slate-400 text-slate-500 mt-[2px]">{opt.desc}</p>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Navigation */}
				{!isLast && (
					<div className="flex items-center justify-between mt-[20px]">
						<button type="button" onClick={() => onDone(null)} className="text-[13px] dark:text-slate-400 text-slate-500">
							Skip
						</button>
						<button
							type="button"
							onClick={() => setSlide(s => s + 1)}
							className="h-[48px] px-[28px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
							style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }}
						>
							Next →
						</button>
					</div>
				)}

				{isLast && (
					<button type="button" onClick={() => onDone(null)} className="mt-[16px] text-center text-[13px] dark:text-slate-400 text-slate-500 w-full">
						Skip — I'll pick later
					</button>
				)}
			</div>
		</div>
	);
}