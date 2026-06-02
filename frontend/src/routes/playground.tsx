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
import { useState, useMemo, useRef } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { getStockData, getDailyBrief, trackEvent } from "@/lib/api";
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
				<div className={`rounded-[16px] border border-foreground/10 bg-surface-1 px-[16px] py-[14px] mb-[20px]`}>
					<div className="flex items-center gap-[12px] mb-[12px]">
						<div className={`grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[11px] ${currentLevel.bg} ${currentLevel.color} text-[20px] font-extrabold`}>
							{currentLevel.name === "Beginner" ? "🌱" : currentLevel.name === "Learner" ? "📚" : currentLevel.name === "Investor" ? "📈" : currentLevel.name === "Analyst" ? "🔬" : "🏆"}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center justify-between mb-[1px]">
								<p className={`text-[15px] font-extrabold ${currentLevel.color}`}>{currentLevel.name}</p>
								<p className="text-[12px] font-bold text-foreground">{totalXp} XP</p>
							</div>
							<p className="text-[11px] dark:text-slate-400 text-slate-500">
								{nextLevel ? `${nextLevel.min - totalXp} XP to ${nextLevel.name}` : "Max level reached 🏆"}
							</p>
						</div>
					</div>
					{/* XP progress bar */}
					<div className="h-[6px] rounded-full bg-foreground/10">
						<div
							className={`h-full rounded-full bg-gradient-to-r ${currentLevel.bar} transition-all duration-500`}
							style={{ width: `${levelPct}%` }}
						/>
					</div>
					{/* Stats row */}
					<div className="grid grid-cols-3 gap-[8px] mt-[12px]">
						{[
							{ label: "Lessons", value: `${completedLessons}/${totalLessons}` },
							{ label: "Streak", value: streakCount > 0 ? `${streakCount}d 🔥` : "—" },
							{ label: "Badges", value: `${(account?.badges ?? []).length}` },
						].map(s => (
							<div key={s.label} className="rounded-[8px] bg-foreground/[0.04] px-[8px] py-[7px] text-center">
								<p className="text-[11px] dark:text-slate-500 text-slate-400">{s.label}</p>
								<p className="text-[13px] font-bold">{s.value}</p>
							</div>
						))}
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

				{/* Daily Challenge */}
				<div className="mb-[20px]">
					<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Today's Challenge</p>
					<button
						type="button"
						onClick={() => setActiveView("daily-challenge")}
						className={`w-full rounded-[14px] border px-[16px] py-[15px] text-left active:opacity-80 transition-opacity ${challengeCompleted ? "border-emerald-500/30 bg-emerald-500/[0.07]" : "border-amber-500/30 bg-amber-500/[0.08]"}`}
					>
						<div className="flex items-center gap-[12px]">
							<div className={`grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[11px] text-[22px] ${challengeCompleted ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
								{challengeCompleted ? "✅" : "⚡"}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-[6px] mb-[2px]">
									<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500">Daily Challenge</p>
									{challengeCompleted && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-[6px] py-[1px] rounded-full">Done ✓</span>}
								</div>
								<p className="text-[13px] font-bold text-foreground line-clamp-2 leading-snug">{dailyChallenge.prompt}</p>
								<p className="text-[11px] text-amber-400 font-semibold mt-[3px]">+{dailyChallenge.xp} XP</p>
							</div>
							{!challengeCompleted && <ChevronRight size={16} className="shrink-0 text-amber-400" />}
						</div>
					</button>
				</div>

				{/* All Sections — 2-column grid for compact feel */}
				<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Explore</p>
				<div className="grid grid-cols-2 gap-[10px] mb-[10px]">
					{[
						{ colorKey: "lessons",  icon: <BookOpen size={20} />,    title: "Lessons",       subtitle: `${completedLessons}/${totalLessons} done`,                  view: "lessons" as const },
						{ colorKey: "battles",  icon: <Swords size={20} />,      title: "Stock Battles", subtitle: `${STOCK_BATTLES.length} matchups`,                          view: "battles" as const },
						{ colorKey: "earnings", icon: <FlaskConical size={20} />,title: "Earnings Lab",  subtitle: `${EARNINGS_SCENARIOS.length} scenarios`,                    view: "earnings-lab" as const },
						{ colorKey: "risk",     icon: <ShieldAlert size={20} />, title: "Risk Lab",      subtitle: `${RISK_SCENARIOS.length} comparisons`,                      view: "risk-lab" as const },
						{ colorKey: "mood",     icon: <Brain size={20} />,       title: "Market Mood",   subtitle: `${MOOD_SCENARIOS.length} simulations`,                      view: "mood-simulator" as const },
						{ colorKey: "practice", icon: <TrendingUp size={20} />,  title: "Practice",      subtitle: `${PRACTICE_TICKERS.length} stocks`,                         view: "practice" as const },
					].map(s => {
						const c = SECTION_COLORS[s.colorKey] ?? SECTION_COLORS.lessons;
						return (
							<button
								key={s.title}
								type="button"
								onClick={() => setActiveView(s.view)}
								className={`rounded-[14px] border ${c.border} ${c.bg} px-[14px] py-[14px] text-left active:opacity-80 transition-opacity`}
							>
								<div className={`grid h-[38px] w-[38px] place-items-center rounded-[9px] bg-background/50 mb-[10px] ${c.icon}`}>
									{s.icon}
								</div>
								<p className="text-[13px] font-bold text-foreground leading-none mb-[4px]">{s.title}</p>
								<p className="text-[11px] dark:text-slate-400 text-slate-500">{s.subtitle}</p>
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
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> Back
				</button>
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
						return (
							<button
								key={lesson.id}
								type="button"
								onClick={() => onSelectLesson(lesson.id)}
								className="w-full flex items-center gap-[14px] rounded-[13px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px] text-left active:opacity-80 transition-opacity"
							>
								<span className="text-[26px] shrink-0">{lesson.emoji}</span>
								<div className="flex-1 min-w-0">
									<p className="text-[13px] font-bold text-foreground">{lesson.title}</p>
									<p className="text-[11px] dark:text-slate-400 text-slate-500 mt-[2px]">{lesson.subtitle}</p>
									<div className="flex items-center gap-[8px] mt-[5px]">
										<span className={`text-[10px] font-semibold px-[6px] py-[2px] rounded-full border ${CATEGORY_COLORS[lesson.category]}`}>{lesson.category}</span>
										<span className="text-[10px] dark:text-slate-500 text-slate-400">{lesson.durationMin} min · {lesson.xp} XP</span>
									</div>
								</div>
								{done
									? <span className="shrink-0 text-[12px] text-emerald-400 font-bold">✓</span>
									: <ChevronRight size={16} className="shrink-0 dark:text-slate-500 text-slate-400" />
								}
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
				const levelNames: Record<number, string> = { 100: "Learner 📚", 300: "Investor 📈", 600: "Analyst 🔬", 1000: "Expert 🏆" };
				import("sonner").then(({ toast }) => toast.success(`Level up! You're now a ${levelNames[crossed]}`, { duration: 4000 }));
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
					<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500">
						<ChevronRight size={14} className="rotate-180" /> Back
					</button>
					<span className="text-[12px] dark:text-slate-400 text-slate-500">{lesson.emoji} {lesson.category}</span>
				</div>

				{/* Progress bar */}
				<div className="h-[4px] rounded-full bg-foreground/10 mb-[24px]">
					<div className="h-full rounded-full bg-blue-400 transition-all duration-300" style={{ width: `${progressPct}%` }} />
				</div>

				{phase === "done" ? (
					<div className="flex-1 flex flex-col items-center justify-center text-center gap-[10px]">
						<span className="text-[72px] answer-pop" style={{display:"block"}}>🎉</span>
						<h2 className="text-[24px] font-extrabold mt-[4px]">Lesson Complete!</h2>
						<div className="flex items-center gap-[8px] rounded-full bg-amber-500/15 border border-amber-500/25 px-[16px] py-[8px]">
							<Star size={16} className="text-amber-400" />
							<span className="text-[14px] font-bold text-amber-400">+{lesson.xp} XP earned</span>
						</div>
						{alreadyCompleted && <p className="text-[12px] dark:text-slate-400 text-slate-500">(You already had this one — no double XP)</p>}
						<p className="text-[13px] dark:text-slate-400 text-slate-500 mt-[4px]">
							{completedLessons + (alreadyCompleted ? 0 : 1)}/{totalLessons} lessons done
						</p>
					</div>
				) : phase === "cards" ? (
					<div className="flex-1 flex flex-col"
						onPointerDown={e => handleSwipeStart(e.clientX)}
						onPointerUp={e => handleSwipeEnd(e.clientX)}
					>
						<div
							className={`flex-1 rounded-[18px] border border-foreground/10 bg-surface-1 p-[24px] flex flex-col overflow-hidden transition-all duration-180 ${slideDir === "left" ? "opacity-0 -translate-x-4" : "opacity-100 translate-x-0"}`}
							style={{ transform: slideDir === "left" ? "translateX(-16px)" : "translateX(0)", opacity: slideDir === "left" ? 0 : 1, transition: "transform 0.18s ease, opacity 0.18s ease" }}
						>
							{/* Dot indicators */}
							<div className="flex items-center gap-[6px] mb-[16px]">
								{lesson.cards.map((_, i) => (
									<div key={i} className={`h-[5px] rounded-full transition-all duration-200 ${i === cardIndex ? "bg-blue-400 w-[20px]" : i < cardIndex ? "bg-blue-400/40 w-[5px]" : "bg-foreground/15 w-[5px]"}`} />
								))}
								<div className="ml-auto text-[11px] dark:text-slate-400 text-slate-500">{cardIndex + 1}/{lesson.cards.length}</div>
							</div>
							<h2 className="text-[20px] font-extrabold mb-[14px] leading-snug">{lesson.cards[cardIndex]!.heading}</h2>
							<p className="text-[15px] dark:text-slate-300 text-slate-600 leading-relaxed flex-1">{lesson.cards[cardIndex]!.body}</p>
							<p className="text-[11px] dark:text-slate-500 text-slate-400 mt-[16px] text-center">Swipe left or tap Next →</p>
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
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> Back
				</button>
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
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> All Battles
				</button>
				<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[4px]">{battle.category}</p>
				<h2 className="text-[20px] font-extrabold mb-[2px]">{battle.nameA} vs {battle.nameB}</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">
					Which has the {battle.higherWins ? "higher" : "lower"} {battle.metricLabel}?
				</p>

				<div className="grid grid-cols-2 gap-[12px] mb-[20px]">
					{(["A", "B"] as const).map(side => {
						const name = side === "A" ? battle.nameA : battle.nameB;
						const ticker = side === "A" ? battle.tickerA : battle.tickerB;
						const val = side === "A" ? valA : valB;
						const isSelected = selected === side;
						const isWinner = selected && liveWinner === side;
						let cls = "border-foreground/10 bg-surface-1";
						if (selected) {
							if (isWinner) cls = "border-emerald-500/50 bg-emerald-500/[0.08]";
							else cls = "border-foreground/10 bg-surface-1 opacity-60";
						} else if (isSelected) cls = "border-blue-500/60 bg-blue-500/10";
						return (
							<button key={side} type="button" onClick={() => handlePick(side)}
								className={`rounded-[14px] border px-[16px] py-[18px] text-center transition-all ${cls}`}>
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
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> Back
				</button>
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
					<button type="button" onClick={backToList} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
						<ChevronRight size={14} className="rotate-180" /> All Scenarios
					</button>
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

					<div className="rounded-[14px] border border-foreground/10 bg-surface-1 p-[16px] mb-[16px] space-y-[8px]">
						<p className="text-[13px] dark:text-slate-300 text-slate-600">{scenario.context}</p>
						<div className="grid grid-cols-3 gap-[8px] pt-[4px]">
							<div className="rounded-[8px] bg-foreground/[0.04] p-[8px] text-center">
								<p className="text-[10px] dark:text-slate-500 text-slate-400">Revenue Est.</p>
								<p className="text-[13px] font-bold">{scenario.revenueExpected}</p>
							</div>
							<div className="rounded-[8px] bg-foreground/[0.04] p-[8px] text-center">
								<p className="text-[10px] dark:text-slate-500 text-slate-400">EPS Est.</p>
								<p className="text-[13px] font-bold">{scenario.epsExpected}</p>
							</div>
							<div className="rounded-[8px] bg-foreground/[0.04] p-[8px] text-center">
								<p className="text-[10px] dark:text-slate-500 text-slate-400">Stock</p>
								<p className="text-[12px] font-bold">{scenario.stockContext}</p>
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
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> Back
				</button>
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
		return (
			<div className="min-h-full bg-background text-foreground flex flex-col items-center justify-center px-[18px]">
				<div className="max-w-lg w-full text-center space-y-[16px]">
					<span className="text-[64px]">{pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚"}</span>
					<h2 className="text-[24px] font-extrabold">Risk Lab Complete!</h2>
					<div className="rounded-[16px] border border-foreground/10 bg-surface-1 p-[20px]">
						<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[6px]">Your Score</p>
						<p className="text-[42px] font-extrabold text-foreground">{correct}<span className="text-[24px] dark:text-slate-400 text-slate-500">/{total}</span></p>
						<p className={`text-[14px] font-semibold mt-[4px] ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400"}`}>
							{pct >= 80 ? "Excellent risk awareness!" : pct >= 50 ? "Good start — keep practising" : "Keep learning — risk is tricky"}
						</p>
					</div>
					<button type="button" onClick={onBack} className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80" style={{ background: "linear-gradient(90deg,#f97316,#ef4444)" }}>
						Back to Playground
					</button>
					<button type="button" onClick={() => { setIndex(0); setSelected(null); setDone(false); setCorrect(0); awardedRisk.current.clear(); }} className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">
						Try Again
					</button>
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
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> Back
				</button>
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
		return (
			<div className="min-h-full bg-background text-foreground flex flex-col items-center justify-center px-[18px]">
				<div className="max-w-lg w-full text-center space-y-[16px]">
					<span className="text-[64px]">{pct >= 80 ? "🧠" : pct >= 50 ? "📈" : "📚"}</span>
					<h2 className="text-[24px] font-extrabold">Market Mood Complete!</h2>
					<div className="rounded-[16px] border border-foreground/10 bg-surface-1 p-[20px]">
						<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[6px]">Your Score</p>
						<p className="text-[42px] font-extrabold text-foreground">{correct}<span className="text-[24px] dark:text-slate-400 text-slate-500">/{total}</span></p>
						<p className={`text-[14px] font-semibold mt-[4px] ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400"}`}>
							{pct >= 80 ? "You read the market well!" : pct >= 50 ? "Solid macro awareness" : "Macro is complex — keep going"}
						</p>
					</div>
					<button type="button" onClick={onBack} className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80" style={{ background: "linear-gradient(90deg,#06b6d4,#6366f1)" }}>
						Back to Playground
					</button>
					<button type="button" onClick={() => { setIndex(0); setSelected(null); setDone(false); setCorrect(0); awardedMood.current.clear(); }} className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">
						Try Again
					</button>
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
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> Back
				</button>
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
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]"><ChevronRight size={14} className="rotate-180" /> Back</button>
				<h2 className="text-[22px] font-extrabold mb-[2px]">Practice Mode</h2>
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
					<p className="text-[14px] font-bold text-center mb-[14px]">What is your move?</p>
					<div className="grid grid-cols-3 gap-[10px]">
						{(['save','pass','learn'] as const).map(d => {
							const cfg={save:{label:'Save it',cls:'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400'},pass:{label:'Pass',cls:'border-rose-500/40 bg-rose-500/[0.08] text-rose-400'},learn:{label:'Learn More',cls:'border-blue-500/40 bg-blue-500/[0.08] text-blue-400'}}[d];
							return <button key={d} type="button" onClick={()=>setDecision(d)} className={`rounded-[12px] border py-[14px] text-[13px] font-bold active:opacity-80 ${cfg.cls}`}>{cfg.label}</button>;
						})}
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
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]"><ChevronRight size={14} className="rotate-180" /> Back</button>
				<div className="flex items-center justify-between mb-[20px]">
					<div><p className="text-[12px] dark:text-slate-400 text-slate-500 uppercase tracking-wide">Decision Training</p><h2 className="text-[18px] font-extrabold">What Would You Do?</h2></div>
					<p className="text-[12px] dark:text-slate-400 text-slate-500">{idx + 1}/{WWYD_SCENARIOS.length}</p>
				</div>
				<div className="h-[4px] rounded-full bg-foreground/10 mb-[24px]"><div className="h-full rounded-full bg-purple-400 transition-all" style={{width:`${((idx+1)/WWYD_SCENARIOS.length)*100}%`}} /></div>
				<div className="rounded-[14px] border border-foreground/10 bg-surface-1 p-[16px] mb-[16px]"><p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[6px] font-medium">Scenario</p><p className="text-[15px] font-bold leading-snug">{scenario.scenario}</p></div>
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
					<div className={`rounded-[12px] p-[14px] mb-[14px] ${isBest?'bg-emerald-500/10 border border-emerald-500/25':'bg-amber-500/10 border border-amber-500/25'}`}>
						<p className="text-[13px] font-bold mb-[4px]">{isBest?'Great thinking!':'Better approach:'}</p>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.explanation}</p>
						<p className="text-[12px] text-amber-400 font-semibold mt-[8px]">+{scenario.xp} XP</p>
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
					<div className="rounded-[16px] border border-foreground/10 bg-surface-1 p-[18px] mb-[16px] text-center">
						<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[4px]">Portfolio Grade</p>
						<p className={`text-[52px] font-extrabold ${grade.startsWith('A') ? 'text-emerald-400' : grade.startsWith('B') ? 'text-blue-400' : 'text-amber-400'}`}>{grade}</p>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 mt-[6px] leading-relaxed">{feedback}</p>
					</div>
					<div className="grid grid-cols-3 gap-[8px] mb-[16px]">
						{[{label:'Speculative',pct:specPct,color:'text-rose-400'},{label:'Growth',pct:growthPct,color:'text-blue-400'},{label:'Defensive',pct:defensivePct,color:'text-emerald-400'}].map(s => (
							<div key={s.label} className="rounded-[10px] border border-foreground/10 bg-surface-1 p-[10px] text-center">
								<p className="text-[10px] dark:text-slate-500 text-slate-400">{s.label}</p>
								<p className={`text-[20px] font-extrabold ${s.color}`}>{s.pct}%</p>
							</div>
						))}
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
					<button type="button" onClick={() => setActiveSlot(null)} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]"><ChevronRight size={14} className="rotate-180" /> Back</button>
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
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]"><ChevronRight size={14} className="rotate-180" /> Back</button>
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

const SANDBOX_BUDGET = 10000;
const SANDBOX_TICKERS = ["AAPL","TSLA","NVDA","META","NFLX","MSFT","AMZN","GOOGL","SBUX","COIN","PLTR","SHOP","RBLX","NKE","KO","WMT","JNJ","AMD","DDOG","PANW"];

function SandboxView({ onBack }: { onBack: () => void }) {
	const { account, addToSandbox, removeFromSandbox } = useAccount();
	const queryClient = useQueryClient();
	const sandbox = account?.sandboxPortfolio ?? {};
	const tickers = Object.keys(sandbox);

	const stockQueries = tickers.map(ticker => ({
		queryKey: ['stock', ticker],
		queryFn: () => getStockData(ticker),
		staleTime: 60 * 1000,
		retry: 1,
	}));
	const results = useQueries({ queries: stockQueries });

	const [adding, setAdding] = useState(false);
	const [searchTicker, setSearchTicker] = useState('');

	const holdings = tickers.map((ticker, i) => {
		const entry = sandbox[ticker]!;
		const quote = (results[i] as { data?: { quote?: { price?: number; changePercent?: number } } })?.data?.quote;
		const currentPrice = quote?.price ?? null;
		const pricePct = entry.priceAtAdd && currentPrice
			? ((currentPrice - entry.priceAtAdd) / entry.priceAtAdd) * 100 : null;
		return { ticker, entry, currentPrice, pricePct, changePercent: quote?.changePercent ?? null };
	});

	const allocation = SANDBOX_BUDGET / Math.max(tickers.length, 1);
	const totalValue = holdings.reduce((sum, h) => {
		if (!h.currentPrice || !h.entry.priceAtAdd) return sum + allocation;
		return sum + allocation * (h.currentPrice / h.entry.priceAtAdd);
	}, 0);
	const totalPnl = totalValue - Math.min(tickers.length, 1) * SANDBOX_BUDGET / Math.max(tickers.length, 1) * tickers.length;
	const totalPct = tickers.length > 0 ? ((totalValue - SANDBOX_BUDGET) / SANDBOX_BUDGET) * 100 : 0;

	const topWinner = holdings.filter(h => h.pricePct !== null).sort((a, b) => (b.pricePct ?? 0) - (a.pricePct ?? 0))[0];
	const topLoser = holdings.filter(h => h.pricePct !== null).sort((a, b) => (a.pricePct ?? 0) - (b.pricePct ?? 0))[0];

	const handleAdd = async (ticker: string) => {
		// Try cache first, then live fetch — price must be captured at add time for P&L
		const cached = queryClient.getQueryData<{ quote: { price: number } | null }>(["stock", ticker.toUpperCase()]);
		let price: number | null = cached?.quote?.price ?? null;
		if (!price) {
			try { price = (await getStockData(ticker.toUpperCase()))?.quote?.price ?? null; } catch { /* ignore */ }
		}
		await addToSandbox(ticker.toUpperCase(), price);
		setAdding(false);
		setSearchTicker('');
	};

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]"><ChevronRight size={14} className="rotate-180" /> Back</button>
				<h2 className="text-[22px] font-extrabold mb-[2px]">Sandbox Portfolio</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">Practice money only. No real trades.</p>

				{/* Portfolio overview */}
				<div className="rounded-[16px] border border-violet-500/25 bg-violet-500/[0.07] p-[18px] mb-[20px]">
					<div className="flex items-end justify-between mb-[12px]">
						<div>
							<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500">Portfolio Value</p>
							<p className="text-[28px] font-extrabold">${tickers.length > 0 ? totalValue.toFixed(0) : SANDBOX_BUDGET.toLocaleString()}</p>
						</div>
						{tickers.length > 0 && (
							<p className={`text-[15px] font-bold ${totalPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
								{totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}%
							</p>
						)}
					</div>
					<p className="text-[12px] dark:text-slate-400 text-slate-500">Started with $10,000 · {tickers.length} positions</p>
					{tickers.length > 0 && (
						<div className="grid grid-cols-2 gap-[8px] mt-[12px]">
							{topWinner && (<div className="rounded-[8px] bg-foreground/[0.04] p-[8px]"><p className="text-[10px] text-emerald-400 font-semibold">Top Winner</p><p className="text-[13px] font-bold">{topWinner.ticker} {topWinner.pricePct != null ? `+${topWinner.pricePct.toFixed(1)}%` : ''}</p></div>)}
							{topLoser && topLoser.ticker !== topWinner?.ticker && (<div className="rounded-[8px] bg-foreground/[0.04] p-[8px]"><p className="text-[10px] text-rose-400 font-semibold">Top Loser</p><p className="text-[13px] font-bold">{topLoser.ticker} {topLoser.pricePct != null ? `${topLoser.pricePct.toFixed(1)}%` : ''}</p></div>)}
						</div>
					)}
				</div>

				{/* Holdings */}
				{tickers.length > 0 && (
					<div className="mb-[16px]">
						<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Holdings · ${allocation.toFixed(0)} per position</p>

						{/* P&L bar chart */}
						{holdings.some(h => h.pricePct !== null) && (
							<div className="rounded-[12px] border border-foreground/10 bg-surface-1 px-[12px] py-[10px] mb-[8px]">
								<p className="text-[10px] dark:text-slate-500 text-slate-400 mb-[8px] uppercase tracking-wide">P&L Since Added</p>
								<div className="space-y-[6px]">
									{holdings.filter(h => h.pricePct !== null).sort((a, b) => (b.pricePct ?? 0) - (a.pricePct ?? 0)).map(h => {
										const pct = h.pricePct ?? 0;
										const maxAbs = Math.max(...holdings.filter(x => x.pricePct !== null).map(x => Math.abs(x.pricePct ?? 0)), 1);
										const barWidth = Math.min(100, (Math.abs(pct) / maxAbs) * 100);
										return (
											<div key={h.ticker} className="flex items-center gap-[8px]">
												<p className="text-[11px] font-bold w-[36px] shrink-0">{h.ticker}</p>
												<div className="flex-1 h-[6px] rounded-full bg-foreground/10 overflow-hidden">
													<div
														className={`h-full rounded-full ${pct >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
														style={{ width: `${barWidth}%` }}
													/>
												</div>
												<p className={`text-[11px] font-bold w-[44px] text-right shrink-0 ${pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
													{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
												</p>
											</div>
										);
									})}
								</div>
							</div>
						)}

						<div className="space-y-[6px]">
							{holdings.map(h => (
								<div key={h.ticker} className="flex items-center gap-[12px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[12px] py-[10px]">
									<div className="flex-1 min-w-0">
										<p className="text-[14px] font-bold">{h.ticker}</p>
										{h.currentPrice && <p className="text-[12px] dark:text-slate-400 text-slate-500">${h.currentPrice.toFixed(2)}{h.entry.priceAtAdd ? ` · cost $${h.entry.priceAtAdd.toFixed(2)}` : ""}</p>}
									</div>
									{h.pricePct !== null ? (
										<p className={`text-[13px] font-bold ${h.pricePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
											{h.pricePct >= 0 ? '+' : ''}{h.pricePct.toFixed(1)}%
										</p>
									) : <p className="text-[11px] dark:text-slate-500 text-slate-400">Loading…</p>}
									<button type="button" onClick={() => removeFromSandbox(h.ticker)} className="text-[11px] text-rose-400 px-[6px]">✕</button>
								</div>
							))}
						</div>
					</div>
				)}

				{tickers.length === 0 && (
					<div className="rounded-[14px] border border-dashed border-foreground/20 p-[24px] text-center mb-[16px]">
						<p className="text-[28px] mb-[8px]">💼</p>
						<p className="text-[14px] font-bold mb-[4px]">Your sandbox is empty</p>
						<p className="text-[13px] dark:text-slate-400 text-slate-500">Add stocks below to start your practice portfolio.</p>
					</div>
				)}

				{/* Add stock */}
				{adding ? (
					<div className="rounded-[14px] border border-foreground/10 bg-surface-1 p-[14px]">
						<p className="text-[13px] font-bold mb-[10px]">Pick a stock to add</p>
						<div className="grid grid-cols-4 gap-[6px] mb-[10px]">
							{SANDBOX_TICKERS.filter(t => !tickers.includes(t)).slice(0, 12).map(t => (
								<button key={t} type="button" onClick={() => handleAdd(t)}
									className="rounded-[8px] border border-foreground/10 bg-foreground/[0.04] py-[8px] text-[12px] font-bold active:opacity-70">
									{t}
								</button>
							))}
						</div>
						<button type="button" onClick={() => setAdding(false)} className="text-[12px] dark:text-slate-400 text-slate-500 w-full text-center">Cancel</button>
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