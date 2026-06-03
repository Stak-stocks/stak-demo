import { createFileRoute } from "@tanstack/react-router";
import {
	BookOpen, Zap, Swords, FlaskConical, ShieldAlert,
	Brain, TrendingUp, Wallet, ChevronRight, Star, Lock,
} from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import {
	LESSONS, LESSON_CATEGORIES, getDailyChallenge, getWeeklyPack, getCurrentWeekKey,
	STOCK_BATTLES, EARNINGS_SCENARIOS, RISK_SCENARIOS, MOOD_SCENARIOS,
	PRACTICE_TICKERS, WATCHLIST_SLOTS, WATCHLIST_BRANDS,
	type WatchlistSlotType, type WeeklyActivity,
	type Lesson, type LessonCategory,
} from "@/data/playgroundData";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { getStockData, getDailyBrief, trackEvent } from "@/lib/api";
import { useWeeklyContent } from "@/hooks/useWeeklyContent";
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

// ── Floating XP indicator ────────────────────────────────────────────────────

function useXpFloat() {
	const [xpFloat, setXpFloat] = useState<{ id: number; amount: number } | null>(null);
	const idRef = useRef(0);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Clean up pending timer on unmount
	useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

	const showXp = (amount: number) => {
		if (timerRef.current) clearTimeout(timerRef.current);
		idRef.current += 1;
		setXpFloat({ id: idRef.current, amount });
		timerRef.current = setTimeout(() => setXpFloat(null), 1700);
	};

	const XPFloat = xpFloat ? (
		<div key={xpFloat.id} className="fixed left-1/2 -translate-x-1/2 z-[999] xp-float flex items-center gap-[5px] rounded-full bg-amber-500/20 border border-amber-400/40 px-[12px] py-[6px] shadow-lg shadow-amber-500/20" style={{ bottom: "calc(4rem + env(safe-area-inset-bottom) + 16px)" }}>
			<Star size={13} className="text-amber-400" fill="currentColor" />
			<span className="text-[13px] font-extrabold text-amber-400">+{xpFloat.amount} XP</span>
		</div>
	) : null;

	return { showXp, XPFloat };
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

	| "watchlist"
	| "sandbox";

const PLAYGROUND_SS_KEY = "playground-state";

function savePlaygroundState(view: ActiveView, lessonId: string | null) {
	if (view) {
		sessionStorage.setItem(PLAYGROUND_SS_KEY, JSON.stringify({ view, lessonId }));
	} else {
		sessionStorage.removeItem(PLAYGROUND_SS_KEY);
	}
}

function restorePlaygroundState(): { view: ActiveView; lessonId: string | null } {
	try {
		const raw = sessionStorage.getItem(PLAYGROUND_SS_KEY);
		if (!raw) return { view: null, lessonId: null };
		const { view, lessonId } = JSON.parse(raw);
		if (view === "lesson-player" && !lessonId) return { view: "lessons", lessonId: null };
		return { view: view ?? null, lessonId: lessonId ?? null };
	} catch {
		return { view: null, lessonId: null };
	}
}

export function PlaygroundPage() {
	const { account, completeWeeklyActivity } = useAccount();
	const restored = useMemo(restorePlaygroundState, []);
	const [activeView, setActiveView] = useState<ActiveView>(restored.view);
	// Optimistic local completions — updates instantly before Firestore onSnapshot fires
	const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set());

	// Clear sub-view state on unmount so returning to Playground (tab switch / sign-out)
	// always lands on the home page, not mid-session inside a sub-view
	useEffect(() => {
		return () => sessionStorage.removeItem(PLAYGROUND_SS_KEY);
	}, []);
	const [activeLessonId, setActiveLessonId] = useState<string | null>(restored.lessonId);
	const [activeCategory, setActiveCategory] = useState<LessonCategory | null>(null);
	const [showOnboarding, setShowOnboarding] = useState(() =>
		typeof window !== "undefined" && !localStorage.getItem("playground-onboarded")
	);

	// Scroll management: save position when entering a sub-view, restore when returning home
	const homeScrollY = useRef(0);
	const scrollEl = () => document.querySelector("[data-scroll-root]");

	const goToView = (view: ActiveView) => {
		homeScrollY.current = scrollEl()?.scrollTop ?? 0;
		setActiveView(view);
		savePlaygroundState(view, activeLessonId);
		scrollEl()?.scrollTo({ top: 0, behavior: "instant" });
	};

	const goHome = () => {
		setActiveView(null);
		savePlaygroundState(null, null);
		requestAnimationFrame(() => {
			scrollEl()?.scrollTo({ top: homeScrollY.current, behavior: "instant" });
		});
	};

	// Still reset scroll when entering onboarding
	useEffect(() => {
		if (showOnboarding) scrollEl()?.scrollTo({ top: 0, behavior: "instant" });
	}, [showOnboarding]);

	// Use local time to match dayKey (getCurrentWeekKey also uses local time)
	const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
	const dailyChallenge = useMemo(() => getDailyChallenge(todayKey), [todayKey]);

	// Weekly Pack — computed after totalXp is available (see line ~310)
	const dayKey = useMemo(() => getCurrentWeekKey(), []);

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

	// Weekly Pack (declared here so totalXp is available)
	const staticDailyPack = useMemo(() => getWeeklyPack(totalXp, dayKey), [totalXp, dayKey]);
	const { pack: dailyPack, mergedBattles, mergedEarnings, mergedRisk, mergedMood, mergedLessons } = useWeeklyContent(staticDailyPack);
	const dailyCompleted = useMemo(() => {
		const wp = account?.weeklyProgress;
		const fromFirestore = wp?.weekKey === dayKey ? new Set(wp.completedIds ?? []) : new Set<string>();
		// Merge with localCompleted so checkmarks appear instantly before Firestore propagates
		return new Set([...fromFirestore, ...localCompleted]);
	}, [account?.weeklyProgress, dayKey, localCompleted]);

	// Wrapper that also updates local state immediately for instant UI feedback
	const markActivityComplete = useCallback((wk: string, id: string, xp: number) => {
		setLocalCompleted(prev => new Set([...prev, id]));
		completeWeeklyActivity(wk, id, xp).catch(() => {});
	}, [completeWeeklyActivity]);
	// Find next incomplete lesson from today's pack for "Continue Learning"
	const nextLesson = useMemo(() => {
		const dailyLessonIds = dailyPack.activities.filter(a => a.type === "lesson").map(a => a.id);
		return mergedLessons.find(l => dailyLessonIds.includes(l.id) && !dailyCompleted.has(l.id));
	}, [dailyPack.activities, dailyCompleted]);

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
				onSelectLesson={(id) => { homeScrollY.current = scrollEl()?.scrollTop ?? 0; setActiveLessonId(id); setActiveView("lesson-player"); savePlaygroundState("lesson-player", id); scrollEl()?.scrollTo({ top: 0, behavior: "instant" }); }}
				onBack={() => { goHome(); setActiveCategory(null); }}
				dailyLessonIds={dailyPack.activities.filter(a => a.type === "lesson").map(a => a.id)}
				dayLabel={dailyPack.label}
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
				dayKey={dayKey}
				dailyCompleted={dailyCompleted}
				onWeeklyComplete={markActivityComplete}
				onBack={() => { setActiveView("lessons"); savePlaygroundState("lessons", null); scrollEl()?.scrollTo({ top: 0, behavior: "instant" }); }}
				onComplete={() => { setActiveView("lessons"); savePlaygroundState("lessons", null); scrollEl()?.scrollTo({ top: 0, behavior: "instant" }); }}
			/>
		);
	}
	if (activeView === "daily-challenge") {
		return (
			<DailyChallengeView
				challenge={dailyChallenge}
				alreadyCompleted={challengeCompleted}
				account={account}
				onBack={goHome}
			/>
		);
	}
	if (activeView === "battles") {
		return <BattlesView onBack={goHome} dayKey={dayKey} dailyCompleted={dailyCompleted} onWeeklyComplete={markActivityComplete}
			weeklyBattleIds={dailyPack.activities.filter(a => a.type === "battle").map(a => a.id)}
			dayLabel={dailyPack.label} battlesPool={mergedBattles} />;
	}
	if (activeView === "earnings-lab") {
		return <EarningsLabView onBack={goHome} dayKey={dayKey} dailyCompleted={dailyCompleted} onWeeklyComplete={markActivityComplete}
			weeklyEarningsIds={dailyPack.activities.filter(a => a.type === "earnings").map(a => a.id)}
			dayLabel={dailyPack.label} earningsPool={mergedEarnings} />;
	}
	if (activeView === "risk-lab") {
		return <RiskLabView onBack={goHome}
			weeklyRiskIds={dailyPack.activities.filter(a => a.type === "risk").map(a => a.id)}
			dayLabel={dailyPack.label} dayKey={dayKey} dailyCompleted={dailyCompleted} onWeeklyComplete={markActivityComplete}
			riskPool={mergedRisk} />;
	}
	if (activeView === "mood-simulator") {
		return <MoodSimulatorView onBack={goHome} dayKey={dayKey} dailyCompleted={dailyCompleted} onWeeklyComplete={markActivityComplete}
			weeklyMoodIds={dailyPack.activities.filter(a => a.type === "mood").map(a => a.id)}
			dayLabel={dailyPack.label} moodPool={mergedMood} />;
	}
	if (activeView === "practice") {
		return <PracticeModeView onBack={goHome} />;
	}
	if (activeView === "watchlist") {
		return <WatchlistGameView onBack={goHome} />;
	}
	if (activeView === "sandbox") {
		return <SandboxView onBack={goHome} />;
	}

	// ── Level system ─────────────────────────────────────────────────────────
	const LEVELS = [
		{ min: 0,     max: 499,   name: "Beginner",  color: "text-slate-400",  bg: "bg-slate-400/15",  bar: "from-slate-400 to-slate-500"      },
		{ min: 500,   max: 1499,  name: "Learner",   color: "text-blue-400",   bg: "bg-blue-400/15",   bar: "from-blue-400 to-blue-500"        },
		{ min: 1500,  max: 3499,  name: "Investor",  color: "text-cyan-400",   bg: "bg-cyan-400/15",   bar: "from-cyan-400 to-blue-400"        },
		{ min: 3500,  max: 7499,  name: "Analyst",   color: "text-violet-400", bg: "bg-violet-400/15", bar: "from-violet-400 to-purple-500"    },
		{ min: 7500,  max: 99999, name: "Expert",    color: "text-amber-400",  bg: "bg-amber-400/15",  bar: "from-amber-400 to-orange-500"     },
	];
	const currentLevel = [...LEVELS].reverse().find(l => totalXp >= l.min) ?? LEVELS[0]!;
	const nextLevel = LEVELS.find(l => l.min > totalXp);
	const levelPct = nextLevel
		? Math.round(((totalXp - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
		: 100;

	// Backend streak writes UTC — compare in UTC
	const todayKey2 = new Date().toISOString().split("T")[0]!;
	const yesterdayKey2 = new Date(Date.now() - 86400000).toISOString().split("T")[0]!;
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
							onClick={() => { homeScrollY.current = scrollEl()?.scrollTop ?? 0; setActiveLessonId(featuredLesson.id); setActiveView("lesson-player"); scrollEl()?.scrollTo({ top: 0, behavior: "instant" }); }}
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

				{/* Daily Challenge — hero card */}
				<div className="mb-[20px]">
					<button
						type="button"
						onClick={() => goToView("daily-challenge")}
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

				{/* Weekly Pack */}
				{/* All Sections — 2-column grid */}
				<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Explore</p>
				<div className="grid grid-cols-2 gap-[10px] mb-[10px]">
					{[
						{
							colorKey: "lessons", icon: <BookOpen size={20} />, title: "Lessons",
							subtitle: `${dailyPack.activities.filter(a => a.type === "lesson").length} today`, view: "lessons" as const,
							done: dailyCompleted ? dailyPack.activities.filter(a => a.type === "lesson" && dailyCompleted.has(a.id)).length : 0,
							total: dailyPack.activities.filter(a => a.type === "lesson").length,
						},
						{
							colorKey: "battles", icon: <Swords size={20} />, title: "Stock Battles",
							subtitle: `${dailyPack.activities.filter(a => a.type === "battle").length} today`, view: "battles" as const,
							done: dailyCompleted ? dailyPack.activities.filter(a => a.type === "battle" && dailyCompleted.has(a.id)).length : 0,
							total: dailyPack.activities.filter(a => a.type === "battle").length,
						},
						{
							colorKey: "earnings", icon: <FlaskConical size={20} />, title: "Earnings Lab",
							subtitle: `${dailyPack.activities.filter(a => a.type === "earnings").length} today`, view: "earnings-lab" as const,
							done: dailyCompleted ? dailyPack.activities.filter(a => a.type === "earnings" && dailyCompleted.has(a.id)).length : 0,
							total: dailyPack.activities.filter(a => a.type === "earnings").length,
						},
						{
							colorKey: "risk", icon: <ShieldAlert size={20} />, title: "Risk Lab",
							subtitle: `${dailyPack.activities.filter(a => a.type === "risk").length} today`, view: "risk-lab" as const,
							done: dailyCompleted ? dailyPack.activities.filter(a => a.type === "risk" && dailyCompleted.has(a.id)).length : 0,
							total: dailyPack.activities.filter(a => a.type === "risk").length,
						},
						{
							colorKey: "mood", icon: <Brain size={20} />, title: "Market Mood",
							subtitle: `${dailyPack.activities.filter(a => a.type === "mood").length} today`, view: "mood-simulator" as const,
							done: dailyCompleted ? dailyPack.activities.filter(a => a.type === "mood" && dailyCompleted.has(a.id)).length : 0,
							total: dailyPack.activities.filter(a => a.type === "mood").length,
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
								onClick={() => goToView(s.view)}
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
					<SectionCard colorKey="lessons" icon={<Star size={22} />} title="Build Your Watchlist" subtitle="Pick 7 stocks for a balanced portfolio" onClick={() => goToView("watchlist")} />
					<SectionCard colorKey="sandbox" icon={<Wallet size={22} />} title="Sandbox Portfolio" subtitle="$10,000 · real prices, real shares" onClick={() => goToView("sandbox")} />
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
	dailyLessonIds,
	dayLabel,
	lessonsPool,
	dailyCompleted,
}: {
	account: ReturnType<typeof useAccount>["account"];
	selectedCategory: LessonCategory | null;
	onSelectCategory: (c: LessonCategory | null) => void;
	onSelectLesson: (id: string) => void;
	onBack: () => void;
	dailyLessonIds: string[];
	dayLabel: string;
	lessonsPool?: typeof LESSONS;
	dailyCompleted?: Set<string>;
}) {
	const pool = lessonsPool ?? LESSONS;
	// todayDoneIds: what's been completed in TODAY's session (daily key) — used for checkmarks in today's list
	const todayDoneIds = dailyCompleted ?? new Set<string>();
	// allTimeDoneIds: all-time lesson completions — used only for the past-lessons archive
	const allTimeDoneIds = new Set(
		Object.entries(account?.lessonProgress ?? {}).filter(([, v]) => v.completed).map(([k]) => k)
	);
	// Only show today's lessons
	const thisWeekLessons = pool.filter(l => dailyLessonIds.includes(l.id));
	// Past archive: lessons not in today's pack that were completed on previous days — cap at 5 most recent
	const pastLessons = pool
		.filter(l => !dailyLessonIds.includes(l.id) && allTimeDoneIds.has(l.id))
		.slice(0, 5);
	const visibleLessons = selectedCategory
		? thisWeekLessons.filter(l => l.category === selectedCategory)
		: thisWeekLessons;

	// Category completion: all today's lessons in a category done
	const categoryComplete = (cat: LessonCategory) => {
		const inCat = thisWeekLessons.filter(l => l.category === cat);
		return inCat.length > 0 && inCat.every(l => todayDoneIds.has(l.id));
	};
	const totalCompleted = todayDoneIds.size;

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<div className="flex items-center justify-between mb-[2px]">
					<h2 className="text-[22px] font-extrabold">Today's Lessons</h2>
					<span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[8px] py-[3px] rounded-full">{dayLabel}</span>
				</div>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[14px]">{thisWeekLessons.filter(l => todayDoneIds.has(l.id) || allTimeDoneIds.has(l.id)).length}/{thisWeekLessons.length} done today</p>

				{/* Week progress bar */}
				<div className="h-[4px] rounded-full bg-foreground/10 mb-[16px]">
					<div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400 transition-all" style={{ width: `${thisWeekLessons.length > 0 ? (thisWeekLessons.filter(l => todayDoneIds.has(l.id) || allTimeDoneIds.has(l.id)).length / thisWeekLessons.length) * 100 : 0}%` }} />
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
					{visibleLessons.length === 0 && (
						<p className="text-[13px] dark:text-slate-400 text-slate-500 py-[8px] text-center">No {selectedCategory ?? ""} lessons today.</p>
					)}
					{visibleLessons.map(lesson => {
						// Done if completed today OR ever (all-time) — XP guard prevents re-earning
					const done = todayDoneIds.has(lesson.id) || allTimeDoneIds.has(lesson.id);
						const barColor = CATEGORY_BAR[lesson.category];
						return (
							<button
								key={lesson.id}
								type="button"
								onClick={() => onSelectLesson(lesson.id)}
								className={`w-full flex items-stretch rounded-[13px] border overflow-hidden text-left active:opacity-80 transition-opacity ${done ? "border-emerald-500/40 bg-surface-1" : "border-foreground/10 bg-surface-1"}`}
							>
								{/* Left accent stripe */}
								<div className={`w-[4px] shrink-0 bg-gradient-to-b ${barColor}`} />
								<div className="flex items-center gap-[14px] px-[14px] py-[12px] flex-1 min-w-0">
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
										? <span className="shrink-0 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-[8px] py-[3px] rounded-full border border-emerald-500/30">Done ✓</span>
										: <ChevronRight size={16} className="shrink-0 dark:text-slate-500 text-slate-400" />
									}
								</div>
							</button>
						);
					})}
				</div>

				{/* Past lessons — completed in previous weeks */}
				{pastLessons.length > 0 && !selectedCategory && (
					<div className="mt-[24px]">
						<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Previously Completed</p>
						<div className="space-y-[6px]">
							{pastLessons.map(lesson => (
								<button key={lesson.id} type="button" onClick={() => onSelectLesson(lesson.id)}
									className="w-full flex items-center gap-[12px] rounded-[12px] border border-foreground/[0.06] bg-foreground/[0.02] px-[14px] py-[10px] text-left active:opacity-70 opacity-60">
									<span className="text-[20px]">{lesson.emoji}</span>
									<div className="flex-1 min-w-0">
										<p className="text-[12px] font-semibold dark:text-slate-400 text-slate-500">{lesson.title}</p>
										<p className="text-[10px] dark:text-slate-500 text-slate-400">{lesson.category}</p>
									</div>
									<div className="text-[11px] text-emerald-400/60 font-bold">✓</div>
								</button>
							))}
						</div>
					</div>
				)}
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
	dayKey,
	dailyCompleted,
	onWeeklyComplete,
	onBack,
	onComplete,
	lessonsPool,
}: {
	lessonId: string;
	account: ReturnType<typeof useAccount>["account"];
	completedLessons: number;
	totalLessons: number;
	dayKey?: string;
	dailyCompleted?: Set<string>;
	onWeeklyComplete?: (wk: string, id: string, xp: number) => void;
	onBack: () => void;
	onComplete: () => void;
	lessonsPool?: typeof LESSONS;
}) {
	const { completeLesson } = useAccount();
	const { showXp, XPFloat } = useXpFloat();
	const lesson = (lessonsPool ?? LESSONS).find(l => l.id === lessonId);
	const [cardIndex, setCardIndex] = useState(0);
	const [phase, setPhase] = useState<"cards" | "quiz" | "done">("cards");
	const [selectedOption, setSelectedOption] = useState<string | null>(null);
	const [showResult, setShowResult] = useState(false);
	const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
	const swipeStartX = useRef<number | null>(null);
	const xpAwardedRef = useRef(false); // prevents double-fire before Firestore propagates
	const alreadyCompleted = !!(account?.lessonProgress?.[lessonId]?.completed);

	// Guard against generated lessons with empty/missing cards
	if (!lesson || !lesson.cards?.length) return null;

	const isLastCard = cardIndex >= lesson.cards.length - 1;
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
		const correct = optionId === lesson.quiz.correctId;
		// Only award XP + mark complete on correct answer.
		// xpAwardedRef blocks double-fire if the user taps fast before Firestore propagates.
		// Wrong answers stay incomplete so the user can try again — no XP awarded.
		if (correct && !alreadyCompleted && !xpAwardedRef.current) {
			xpAwardedRef.current = true;
			showXp(lesson.xp);
			// completeLesson is the single XP source (marks lessonProgress + increments totalXp)
			await completeLesson(lesson.id, lesson.xp);
			// Pass xp:0 — daily checkmark only, no extra XP (avoids double-counting)
			if (dayKey && dailyCompleted && !dailyCompleted.has(lesson.id) && onWeeklyComplete)
				onWeeklyComplete(dayKey, lesson.id, 0);
			// Level-up toast
			const prevXp = account?.totalXp ?? 0;
			const newXp = prevXp + lesson.xp;
			const LEVEL_THRESHOLDS = [500, 1500, 3500, 7500];
			const crossed = LEVEL_THRESHOLDS.find(t => prevXp < t && newXp >= t);
			if (crossed) {
				const levelDefs: Record<number, { name: string; emoji: string; bar: string }> = {
					500:  { name: "Learner",  emoji: "📚", bar: "from-blue-400 to-blue-500"     },
					1500: { name: "Investor", emoji: "📈", bar: "from-cyan-400 to-blue-400"     },
					3500: { name: "Analyst",  emoji: "🔬", bar: "from-violet-400 to-purple-500" },
					7500: { name: "Expert",   emoji: "🏆", bar: "from-amber-400 to-orange-500"  },
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
			{XPFloat}
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
								<h2 className="text-[21px] font-extrabold mb-[14px] leading-snug tracking-tight">{lesson.cards[cardIndex]?.heading ?? ""}</h2>
								<p className="text-[15px] dark:text-slate-300 text-slate-600 leading-relaxed flex-1">{lesson.cards[cardIndex]?.body ?? ""}</p>
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
									{isCorrect ? "Finish ✓" : "Got it — finish lesson"}
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
	const { showXp, XPFloat } = useXpFloat();
	const [selected, setSelected] = useState<string | null>(null);
	const [showResult, setShowResult] = useState(alreadyCompleted);
	const isCorrect = selected === challenge.correctId;

	const handleAnswer = async (id: string) => {
		if (showResult) return;
		setSelected(id);
		setShowResult(true);
		const correct = id === challenge.correctId;
		if (correct) showXp(challenge.xp);
		// Only award XP and count toward streak for correct answers
		if (!alreadyCompleted && correct) {
			await completeChallenge(challenge.id, challenge.xp);
			trackEvent("brand_tap").catch(() => {});
		}
	};

	return (
		<div className="min-h-full bg-background text-foreground">
			{XPFloat}
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

function BattleDetail({ battleId, onBack, onResult, battlesPool, alreadyWon }: { battleId: string; onBack: () => void; onResult?: (won: boolean) => void; battlesPool?: typeof STOCK_BATTLES; alreadyWon?: boolean }) {
	const pool = battlesPool ?? STOCK_BATTLES;
	const battle = pool.find(b => b.id === battleId)!;
	// If already won, pre-select so the reveal is shown immediately (read-only, no XP)
	const [selected, setSelected] = useState<"A" | "B" | null>(null);
	const { showXp, XPFloat } = useXpFloat();
	const xpAwarded = useRef(false);
	const handlePick = (side: "A" | "B") => {
		if (selected || alreadyWon) return;
		setSelected(side);
		// Resolve winner after a short delay; retry up to 3s if stock data hasn't loaded yet
		const resolve = (attempt: number) => {
			const winner = liveWinner;
			if (winner) {
				const won = side === winner;
				onResult?.(won);
				if (won && !xpAwarded.current) {
					xpAwarded.current = true;
					showXp(battle.xp);
				}
			} else if (attempt < 6) {
				setTimeout(() => resolve(attempt + 1), 500);
			}
			// If data never loads after 3s, silently give up — user can retry
		};
		setTimeout(() => resolve(0), 200);
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

	// When already won: auto-reveal the answer once live data resolves
	useEffect(() => {
		if (alreadyWon && liveWinner && !selected) {
			setSelected(liveWinner);
		}
	}, [alreadyWon, liveWinner, selected]);

	return (
		<div className="min-h-full bg-background text-foreground">
			{XPFloat}
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} label="All Battles" />
				{alreadyWon && (
					<div className="flex items-center gap-[8px] rounded-[10px] bg-emerald-500/10 border border-emerald-500/25 px-[12px] py-[8px] mb-[14px]">
						<span className="text-[14px]">✅</span>
						<p className="text-[12px] font-semibold text-emerald-400">Already completed — XP saved</p>
					</div>
				)}
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
							{!alreadyWon && <p className="text-[12px] text-amber-400 font-semibold mt-[10px]">+{battle.xp} XP</p>}
						</div>
						<div className="space-y-[8px]">
							<button type="button" onClick={onBack} className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80" style={{ background: "linear-gradient(90deg,#f43f5e,#e11d48)" }}>
								All Battles
							</button>
							{/* Rematch only available if you lost — winners can only view */}
							{!alreadyWon && selected && liveWinner && selected !== liveWinner && (
								<button type="button" onClick={() => { setSelected(null); xpAwarded.current = false; }} className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">
									Try Again ↺
								</button>
							)}
						</div>
					</div>
				) : (
					<p className="text-center text-[13px] dark:text-slate-400 text-slate-500 mt-[8px]">
						{alreadyWon ? "Loading result…" : "Tap a stock to make your pick"}
					</p>
				)}
			</div>
		</div>
	);
}

function BattlesView({ onBack, dayKey, dailyCompleted, onWeeklyComplete, weeklyBattleIds, dayLabel, battlesPool }: { onBack: () => void; dayKey?: string; dailyCompleted?: Set<string>; onWeeklyComplete?: (wk: string, id: string, xp: number) => void; weeklyBattleIds?: string[]; dayLabel?: string; battlesPool?: typeof STOCK_BATTLES }) {
	const pool = battlesPool ?? STOCK_BATTLES;
	const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
	// Seed local results from Firestore dailyCompleted so state survives navigation
	const [results, setResults] = useState<Record<string, "win" | "loss">>(() => {
		const seed: Record<string, "win" | "loss"> = {};
		if (dailyCompleted) {
			for (const id of dailyCompleted) seed[id] = "win";
		}
		return seed;
	});

	const wins = Object.values(results).filter(r => r === "win").length;
	const total = Object.keys(results).length;

	const handleBattleResult = (battleId: string, won: boolean) => {
		setResults(r => ({ ...r, [battleId]: won ? "win" : "loss" }));
		// completeWeeklyActivity is the single XP source — BattleDetail no longer calls addXp directly
		if (won && dayKey && dailyCompleted && !dailyCompleted.has(battleId) && onWeeklyComplete) {
			const battle = pool.find(b => b.id === battleId);
			if (battle) onWeeklyComplete(dayKey, battleId, battle.xp);
		}
	};

	if (activeBattleId) {
		return (
			<BattleDetail
				battleId={activeBattleId}
				alreadyWon={dailyCompleted?.has(activeBattleId)}
				onBack={() => setActiveBattleId(null)}
				onResult={(won) => handleBattleResult(activeBattleId, won)}
				battlesPool={pool}
			/>
		);
	}

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<h2 className="text-[22px] font-extrabold mb-[2px]">Stock Battles</h2>
				<div className="flex items-center gap-[8px] mb-[16px]">
					<p className="text-[13px] dark:text-slate-400 text-slate-500">Pick the winner. See the real numbers.</p>
					{dayLabel && <span className="text-[10px] font-bold bg-violet-500/15 text-violet-400 px-[7px] py-[2px] rounded-full">{dayLabel}</span>}
				</div>

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
					{(weeklyBattleIds ? pool.filter(b => weeklyBattleIds.includes(b.id)) : pool).map(b => {
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
								<div className="flex items-center gap-[4px] shrink-0">
									<Star size={10} className="text-amber-400" fill="currentColor" />
									<span className="text-[11px] font-bold text-amber-400">{b.xp}</span>
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

function EarningsLabView({ onBack, dayKey, dailyCompleted, onWeeklyComplete, weeklyEarningsIds, dayLabel, earningsPool }: { onBack: () => void; dayKey?: string; dailyCompleted?: Set<string>; onWeeklyComplete?: (wk: string, id: string, xp: number) => void; weeklyEarningsIds?: string[]; dayLabel?: string; earningsPool?: typeof EARNINGS_SCENARIOS }) {
	const pool = earningsPool ?? EARNINGS_SCENARIOS;
	const { showXp, XPFloat } = useXpFloat();
	const [activeId, setActiveId] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(null);
	const [phase, setPhase] = useState<"question" | "outcome">("question");
	// Seed completedIds from Firestore so it survives navigation
	const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set(dailyCompleted ?? []));
	// Re-sync if dailyCompleted arrives after mount (Firestore late hydration)
	const prevWeeklyRef = useRef(dailyCompleted);
	useEffect(() => {
		if (dailyCompleted && dailyCompleted !== prevWeeklyRef.current) {
			prevWeeklyRef.current = dailyCompleted;
			setCompletedIds(prev => {
				// Merge: add any Firestore IDs not yet in local state
				const merged = new Set(prev);
				for (const id of dailyCompleted) merged.add(id);
				return merged;
			});
		}
	}, [dailyCompleted]);
	const savedScrollY = useRef(0);

	const visibleScenarios = weeklyEarningsIds ? pool.filter(s => weeklyEarningsIds.includes(s.id)) : pool;
	const scenario = pool.find(s => s.id === activeId);
	const currentIdx = visibleScenarios.findIndex(s => s.id === activeId);
	// Next scenario: skip ones already correctly completed
	const nextScenario = visibleScenarios.slice(currentIdx + 1).find(s => !completedIds.has(s.id)) ?? visibleScenarios[currentIdx + 1];

	const scrollEl = () => document.querySelector("[data-scroll-root]");

	const openScenario = (id: string) => {
		savedScrollY.current = scrollEl()?.scrollTop ?? 0;
		setActiveId(id);
		const alreadyCorrect = completedIds.has(id);
		const resolvedCorrectId = pool.find(s => s.id === id)?.correctId ?? null;
		// Only jump to outcome if already correct AND we can resolve the correctId
		// If correctId is missing, fall back to question phase to avoid a broken state
		setSelected(alreadyCorrect && resolvedCorrectId ? resolvedCorrectId : null);
		setPhase(alreadyCorrect && resolvedCorrectId ? "outcome" : "question");
		scrollEl()?.scrollTo({ top: 0, behavior: "instant" });
	};

	const backToList = () => {
		setActiveId(null);
		setSelected(null);
		setPhase("question");
		// Restore scroll position after React re-renders the list
		requestAnimationFrame(() => {
			scrollEl()?.scrollTo({ top: savedScrollY.current, behavior: "instant" });
		});
	};

	if (scenario) {
		const alreadyDone = completedIds.has(scenario.id);
		return (
			<div className="min-h-full bg-background text-foreground">
				{XPFloat}
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
												const correct = opt.id === scenario.correctId;
												setSelected(opt.id);
												setPhase("outcome");
												if (correct) {
													// Guard with dailyCompleted (Firestore source of truth) to prevent
													// double-fire from stale completedIds closure on rapid re-tap
													const alreadyAwarded = dailyCompleted?.has(scenario.id) ?? false;
													setCompletedIds(prev => new Set([...prev, scenario.id]));
													showXp(scenario.xp);
													if (dayKey && !alreadyAwarded && onWeeklyComplete)
														onWeeklyComplete(dayKey, scenario.id, scenario.xp);
												}
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
				<div className="flex items-center gap-[8px] mb-[16px]">
					<p className="text-[13px] dark:text-slate-400 text-slate-500">Learn why stocks react after earnings.</p>
					{dayLabel && <span className="text-[10px] font-bold bg-purple-500/15 text-purple-400 px-[7px] py-[2px] rounded-full">{dayLabel}</span>}
				</div>

				{/* Progress indicator */}
				{doneCount > 0 && (
					<div className="flex items-center gap-[10px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[14px] py-[10px] mb-[16px]">
						<div className="flex-1">
							<div className="flex items-center justify-between mb-[4px]">
								<p className="text-[12px] font-semibold">{doneCount}/{visibleScenarios.length} completed</p>
								{doneCount === visibleScenarios.length && <span className="text-[11px] text-emerald-400 font-bold">All done! 🎉</span>}
							</div>
							<div className="h-[4px] rounded-full bg-foreground/10">
								<div className="h-full rounded-full bg-purple-400 transition-all" style={{ width: `${(doneCount / visibleScenarios.length) * 100}%` }} />
							</div>
						</div>
					</div>
				)}

				<div className="space-y-[8px]">
					{visibleScenarios.map(s => {
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
								<div className="flex items-center gap-[4px] shrink-0">
									<Star size={10} className="text-amber-400" fill="currentColor" />
									<span className="text-[11px] font-bold text-amber-400">{s.xp}</span>
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

function RiskLabView({ onBack, weeklyRiskIds, dayLabel, dayKey, dailyCompleted, onWeeklyComplete, riskPool }: { onBack: () => void; weeklyRiskIds?: string[]; dayLabel?: string; dayKey?: string; dailyCompleted?: Set<string>; onWeeklyComplete?: (wk: string, id: string, xp: number) => void; riskPool?: typeof RISK_SCENARIOS }) {
	const pool = riskPool ?? RISK_SCENARIOS;
	const { showXp, XPFloat } = useXpFloat();
	const [index, setIndex] = useState(0);
	const [selected, setSelected] = useState<"A" | "B" | null>(null);
	const [done, setDone] = useState(false);
	const [correct, setCorrect] = useState(0);
	// sessionCorrect tracks IDs completed in THIS session so Try Again can replay them
	const [sessionCorrect, setSessionCorrect] = useState<Set<string>>(new Set());
	const weeklyIds = weeklyRiskIds ? pool.filter(r => weeklyRiskIds.includes(r.id)) : pool;
	// Exclude already-completed scenarios EXCEPT ones just done this session (allow replay via Try Again)
	const visibleRisk = weeklyIds.filter(r => !dailyCompleted?.has(r.id) || sessionCorrect.has(r.id));
	const scenario = visibleRisk[index];

	if (done) {
		const total = visibleRisk.length;
		const pct = Math.round((correct / total) * 100);
		const tier = pct >= 80 ? { emoji: "🛡️", label: "Risk Expert", msg: "You spotted every trap. You understand what separates safe stocks from dangerous ones.", color: "text-orange-400", border: "border-orange-500/25", bg: "bg-orange-500/[0.07]" }
			: pct >= 50 ? { emoji: "⚠️", label: "Risk Aware", msg: "You caught most of them. The trickier cases are where real losses happen — review the ones you missed.", color: "text-amber-400", border: "border-amber-500/25", bg: "bg-amber-500/[0.07]" }
			: { emoji: "📚", label: "Keep Learning", msg: "Risk is one of the hardest concepts in investing. The more scenarios you see, the sharper your instincts get.", color: "text-rose-400", border: "border-rose-500/25", bg: "bg-rose-500/[0.07]" };
		return (
			<div className="min-h-full bg-background text-foreground">
			{XPFloat}
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
						<button type="button" onClick={() => { setIndex(0); setSelected(null); setDone(false); setCorrect(0); setSessionCorrect(new Set()); }} className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">Try Again</button>
					</div>
				</div>
			</div>
		);
	}

	// "All done" state — every scenario today was already correctly answered
	if (visibleRisk.length === 0 && !done) {
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<div className="rounded-[18px] border border-emerald-500/25 bg-emerald-500/[0.07] p-[24px] text-center">
						<span className="text-[48px] block mb-[10px]">✅</span>
						<h2 className="text-[22px] font-extrabold mb-[6px]">All Done Today</h2>
						<p className="text-[13px] dark:text-slate-400 text-slate-500">You got every Risk Lab scenario right. New ones unlock tomorrow.</p>
					</div>
				</div>
			</div>
		);
	}

	// Empty state — no scenarios available (0 risk items in today's pack)
	if (!scenario) {
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<h2 className="text-[22px] font-extrabold mb-[8px]">Risk Lab</h2>
					<p className="text-[14px] dark:text-slate-400 text-slate-500">No risk scenarios today. Check back tomorrow — they unlock as you level up.</p>
				</div>
			</div>
		);
	}

	const next = () => {
		const isCorrect = selected === scenario.riskierOption;
		if (isCorrect) {
			setSessionCorrect(prev => new Set([...prev, scenario.id]));
			if (dayKey && !dailyCompleted?.has(scenario.id) && onWeeklyComplete)
				onWeeklyComplete(dayKey, scenario.id, scenario.xp);
		}
		if (index < visibleRisk.length - 1) { setIndex(i => i + 1); setSelected(null); setCorrect(c => isCorrect ? c + 1 : c); }
		else { setCorrect(c => isCorrect ? c + 1 : c); setDone(true); }
	};

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<div className="flex items-center justify-between mb-[20px]">
					<div>
						<p className="text-[12px] dark:text-slate-400 text-slate-500 uppercase tracking-wide">Risk Lab {dayLabel && <span className="text-[10px] font-bold bg-orange-500/15 text-orange-400 px-[6px] py-[1px] rounded-full ml-[6px]">{dayLabel}</span>}</p>
						<h2 className="text-[18px] font-extrabold">Spot the Risk</h2>
					</div>
					<p className="text-[12px] dark:text-slate-400 text-slate-500">{index + 1} / {visibleRisk.length}</p>
				</div>

				<div className="h-[4px] rounded-full bg-foreground/10 mb-[24px]">
					<div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${((index + 1) / visibleRisk.length) * 100}%` }} />
				</div>

				<p className="text-[16px] font-bold mb-[16px]">{scenario.prompt}</p>

				<div className="space-y-[8px] mb-[16px]">
					{(["A", "B"] as const).map(side => {
						const text = side === "A" ? scenario.optionA : scenario.optionB;
						const isRiskier = side === scenario.riskierOption;
						const isUserPick = selected === side;
						let state: OptionState = "idle";
						if (selected) {
							// Riskier = wrong answer (user should pick the RISKIER option — that's correct)
							// Wait: scenario.riskierOption IS the correct answer
							if (isRiskier) state = isUserPick ? "correct" : "idle";
							else state = isUserPick ? "wrong" : "idle";
						} else if (isUserPick) state = "selected";
						return (
							<OptionBtn
								key={side}
								letter={side}
								text={text + (selected ? (isRiskier ? " — Higher Risk ⚠️" : " — More Stable ✓") : "")}
								state={state}
								onClick={() => { if (!selected) { const isCorrect = side === scenario!.riskierOption; setSelected(side); if (isCorrect) { showXp(scenario!.xp); } } }}
								disabled={!!selected}
							/>
						);
					})}
				</div>

				{selected && (
					<>
						<div className={`rounded-[12px] border p-[14px] mb-[14px] ${selected === scenario.riskierOption ? "border-emerald-500/25 bg-emerald-500/[0.07]" : "border-rose-500/25 bg-rose-500/[0.07]"}`}>
							<p className="text-[12px] font-bold mb-[4px]">{selected === scenario.riskierOption ? "Correct ✓" : "Not quite —"}</p>
							<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.explanation}</p>
							{selected === scenario.riskierOption && <p className="text-[12px] text-amber-400 font-semibold mt-[8px]">+{scenario.xp} XP</p>}
						</div>
						<button type="button" onClick={next}
							className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
							style={{ background: "linear-gradient(90deg,#f97316,#ef4444)" }}>
							{index < visibleRisk.length - 1 ? "Next →" : "Done"}
						</button>
					</>
				)}
			</div>
		</div>
	);
}

// ── Market Mood Simulator ────────────────────────────────────────────────

function MoodSimulatorView({ onBack, dayKey, dailyCompleted, onWeeklyComplete, weeklyMoodIds, dayLabel, moodPool }: { onBack: () => void; dayKey?: string; dailyCompleted?: Set<string>; onWeeklyComplete?: (wk: string, id: string, xp: number) => void; weeklyMoodIds?: string[]; dayLabel?: string; moodPool?: typeof MOOD_SCENARIOS }) {
	const pool = moodPool ?? MOOD_SCENARIOS;
	const { showXp, XPFloat } = useXpFloat();
	const [index, setIndex] = useState(0);
	const [selected, setSelected] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [correct, setCorrect] = useState(0);
	const [sessionCorrectMood, setSessionCorrectMood] = useState<Set<string>>(new Set());
	const weeklyIds = weeklyMoodIds ? pool.filter(m => weeklyMoodIds.includes(m.id)) : pool;
	const visibleMood = weeklyIds.filter(m => !dailyCompleted?.has(m.id) || sessionCorrectMood.has(m.id));
	const scenario = visibleMood[index];

	if (done) {
		const total = visibleMood.length;
		const pct = Math.round((correct / total) * 100);
		const tier = pct >= 80 ? { emoji: "🧠", label: "Macro Mind", msg: "You understand how global events ripple through markets. That's a rare edge most investors never develop.", color: "text-cyan-400", border: "border-cyan-500/25", bg: "bg-cyan-500/[0.07]" }
			: pct >= 50 ? { emoji: "📊", label: "Getting There", msg: "Solid macro awareness. The tricky ones usually involve second-order effects — practice makes these intuitive.", color: "text-blue-400", border: "border-blue-500/25", bg: "bg-blue-500/[0.07]" }
			: { emoji: "🌍", label: "Macro is Hard", msg: "Macro is genuinely complex — professional investors get it wrong constantly. Keep going through the scenarios.", color: "text-violet-400", border: "border-violet-500/25", bg: "bg-violet-500/[0.07]" };
		return (
			<div className="min-h-full bg-background text-foreground">
			{XPFloat}
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
						<button type="button" onClick={() => { setIndex(0); setSelected(null); setDone(false); setCorrect(0); setSessionCorrectMood(new Set()); }} className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">Try Again</button>
					</div>
				</div>
			</div>
		);
	}

	// All done state — all scenarios today correctly answered
	if (visibleMood.length === 0 && !done) {
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<div className="rounded-[18px] border border-emerald-500/25 bg-emerald-500/[0.07] p-[24px] text-center">
						<span className="text-[48px] block mb-[10px]">✅</span>
						<h2 className="text-[22px] font-extrabold mb-[6px]">All Done Today</h2>
						<p className="text-[13px] dark:text-slate-400 text-slate-500">You got every Market Mood scenario right. New ones unlock tomorrow.</p>
					</div>
				</div>
			</div>
		);
	}

	// Empty state — no scenarios in today's pack
	if (!scenario) {
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<h2 className="text-[22px] font-extrabold mb-[8px]">Market Mood</h2>
					<p className="text-[14px] dark:text-slate-400 text-slate-500">No scenarios today. Check back tomorrow!</p>
				</div>
			</div>
		);
	}

	const next = () => {
		const isRight = selected === scenario.correctId;
		if (isRight) {
			setSessionCorrectMood(prev => new Set([...prev, scenario.id]));
			if (dayKey && !dailyCompleted?.has(scenario.id) && onWeeklyComplete)
				onWeeklyComplete(dayKey, scenario.id, scenario.xp);
		}
		if (index < visibleMood.length - 1) { setIndex(i => i + 1); setSelected(null); setCorrect(c => isRight ? c + 1 : c); }
		else { setCorrect(c => isRight ? c + 1 : c); setDone(true); }
	};
	const isCorrect = selected === scenario.correctId;

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<BackBtn onClick={onBack} />
				<div className="flex items-center justify-between mb-[20px]">
					<div>
						<p className="text-[12px] dark:text-slate-400 text-slate-500 uppercase tracking-wide">Market Mood {dayLabel && <span className="text-[10px] font-bold bg-cyan-500/15 text-cyan-400 px-[6px] py-[1px] rounded-full ml-[6px]">{dayLabel}</span>}</p>
						<h2 className="text-[18px] font-extrabold">Simulator</h2>
					</div>
					<p className="text-[12px] dark:text-slate-400 text-slate-500">{index + 1} / {visibleMood.length}</p>
				</div>

				<div className="h-[4px] rounded-full bg-foreground/10 mb-[24px]">
					<div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${((index + 1) / visibleMood.length) * 100}%` }} />
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
							onClick={() => { if (!selected) { const isCorrect = opt.id === scenario!.correctId; setSelected(opt.id); if (isCorrect) { showXp(scenario!.xp); } } }}
							disabled={!!selected}
						/>
					))}
				</div>

				{selected && (
					<>
						<div className={`rounded-[12px] p-[14px] mb-[14px] ${isCorrect ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-amber-500/10 border border-amber-500/25"}`}>
							<p className="text-[13px] font-bold mb-[4px]">{isCorrect ? "Correct! 🎉" : "Good try."}</p>
							<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.explanation}</p>
							{isCorrect && <p className="text-[12px] text-amber-400 font-semibold mt-[8px]">+{scenario.xp} XP</p>}
						</div>
						<button type="button" onClick={next}
							className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
							style={{ background: "linear-gradient(90deg,#06b6d4,#6366f1)" }}>
							{index < visibleMood.length - 1 ? "Next →" : "Done"}
						</button>
					</>
				)}
			</div>
		</div>
	);
}

// ── Practice Mode ─────────────────────────────────────────────

// ── Practice question engine ─────────────────────────────────────────────────

interface PracticeQuestion {
	type: "pe" | "margin" | "growth" | "momentum" | "decision";
	prompt: string;
	options: { id: string; text: string }[];
	correctId: string;
	explanation: string;
}

// Sector P/E reference bands
const SECTOR_PE: Record<string, { low: number; high: number }> = {
	tech: { low: 25, high: 45 }, consumer: { low: 18, high: 28 },
	finance: { low: 10, high: 18 }, healthcare: { low: 18, high: 30 },
	energy: { low: 8, high: 16 }, default: { low: 15, high: 30 },
};
function sectorBand(ticker: string) {
	const tech = ["AAPL","MSFT","GOOGL","META","NVDA","AMD","AMZN","DDOG","CRWD","PLTR","SHOP","COIN","HOOD","RBLX","DUOL","NFLX","TSLA"];
	const finance = ["V","MA","JPM","BAC","GS"];
	const energy = ["XOM","CVX","BP"];
	const healthcare = ["JNJ","PFE","UNH","ABBV"];
	if (tech.includes(ticker)) return SECTOR_PE.tech!;
	if (finance.includes(ticker)) return SECTOR_PE.finance!;
	if (energy.includes(ticker)) return SECTOR_PE.energy!;
	if (healthcare.includes(ticker)) return SECTOR_PE.healthcare!;
	return SECTOR_PE.default!;
}

function buildQuestion(
	stock: { ticker: string; name: string; prompt: string },
	quote: { price: number; changePercent: number } | null | undefined,
	metrics: { peRatio?: number | null; revenueGrowth?: string | number | null; profitMargin?: string | number | null } | null | undefined,
	questionSlot: number,
): PracticeQuestion {
	const pe = metrics?.peRatio ?? null;
	const rawGrowth = metrics?.revenueGrowth;
	const rawMargin = metrics?.profitMargin;
	const growth = rawGrowth != null ? parseFloat(String(rawGrowth)) : null;
	const margin = rawMargin != null ? parseFloat(String(rawMargin)) : null;
	const change = quote?.changePercent ?? null;

	// Rotate question type based on slot + available data
	const available: PracticeQuestion["type"][] = ["decision"];
	if (pe != null) available.push("pe");
	if (growth != null && !isNaN(growth)) available.push("growth");
	if (margin != null && !isNaN(margin)) available.push("margin");
	if (change != null) available.push("momentum");

	const type = available[questionSlot % available.length]!;

	if (type === "pe" && pe != null) {
		const band = sectorBand(stock.ticker);
		const label = pe > band.high ? "expensive" : pe < band.low ? "cheap" : "fairly valued";
		const correctId = pe > band.high ? "a" : pe < band.low ? "c" : "b";
		return {
			type: "pe",
			prompt: `${stock.name} has a P/E ratio of ${pe}x. For its sector (typical range ${band.low}–${band.high}x), this looks:`,
			options: [
				{ id: "a", text: `Expensive — investors are paying a premium` },
				{ id: "b", text: `Fairly valued — in line with peers` },
				{ id: "c", text: `Cheap — trading at a discount to peers` },
			],
			correctId,
			explanation: `At ${pe}x earnings, ${stock.name} is ${label} relative to its sector. ${pe > band.high ? `A high P/E means the market expects strong future growth to justify the price — the stock has less room for error.` : pe < band.low ? `A low P/E can signal undervaluation, but also lower growth expectations or sector headwinds. Worth digging into why.` : `Fairly valued stocks can still outperform — execution and earnings surprises matter most from here.`}`,
		};
	}

	if (type === "growth" && growth != null && !isNaN(growth)) {
		const level = growth > 25 ? "strong" : growth > 10 ? "moderate" : "weak";
		const correctId = growth > 25 ? "a" : growth > 10 ? "b" : "c";
		return {
			type: "growth",
			prompt: `${stock.name}'s revenue grew ${growth > 0 ? "+" : ""}${growth.toFixed(1)}% year-over-year. How would you read this?`,
			options: [
				{ id: "a", text: `Strong — top-line momentum, demand is real` },
				{ id: "b", text: `Moderate — healthy, but not accelerating` },
				{ id: "c", text: `Weak — growth is stalling` },
			],
			correctId,
			explanation: `${growth.toFixed(1)}% revenue growth is ${level} by market standards. ${growth > 25 ? `High-growth companies are typically valued on future potential — this rate supports a premium multiple. Watch for margin improvement as the next signal.` : growth > 10 ? `Steady growers tend to be rewarded with stable multiples. The question is whether growth accelerates or decelerates from here.` : `Slowing growth pressures valuation multiples. Investors will want to see a catalyst for reacceleration or a pivot to profitability.`}`,
		};
	}

	if (type === "margin" && margin != null && !isNaN(margin)) {
		const level = margin > 20 ? "high" : margin > 8 ? "average" : "low";
		const correctId = margin > 20 ? "a" : margin > 8 ? "b" : "c";
		return {
			type: "margin",
			prompt: `${stock.name} has a profit margin of ${margin.toFixed(1)}%. What does this say about the business?`,
			options: [
				{ id: "a", text: `Highly profitable — strong pricing power` },
				{ id: "b", text: `Average — competitive but not dominant` },
				{ id: "c", text: `Thin margins — vulnerable to cost pressure` },
			],
			correctId,
			explanation: `A ${margin.toFixed(1)}% margin is ${level} vs the ~15% market average. ${margin > 20 ? `High margins signal real pricing power — customers pay a premium and switching costs are high. This is one of the best signs of business quality.` : margin > 8 ? `Average margins mean the business is viable but competitive. Look for whether margins are expanding or contracting as the key trend.` : `Thin margins mean most revenue goes to costs. A small revenue decline or cost spike can wipe out profits entirely — this business needs careful monitoring.`}`,
		};
	}

	if (type === "momentum" && change != null) {
		const bigMove = Math.abs(change) > 5;
		const correctId = bigMove ? (change > 0 ? "a" : "b") : "c";
		return {
			type: "momentum",
			prompt: `${stock.name} is ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}% today. What's the most likely driver of a move this ${bigMove ? "large" : "small"}?`,
			options: bigMove
				? change > 0
					? [
						{ id: "a", text: `Earnings beat or major positive news catalyst` },
						{ id: "b", text: `Sector rotation — money flowing into this area` },
						{ id: "c", text: `Short squeeze — forced buying by bears` },
					]
					: [
						{ id: "a", text: `Sector selloff — macro pressure across the board` },
						{ id: "b", text: `Earnings miss or bad news specific to this company` },
						{ id: "c", text: `Insider selling — management reducing exposure` },
					]
				: [
					{ id: "a", text: `Major news — market-moving announcement` },
					{ id: "b", text: `Technical rebound — buying near support level` },
					{ id: "c", text: `Normal daily drift — no major catalyst` },
				],
			correctId,
			explanation: bigMove
				? change > 0
					? `A ${change.toFixed(1)}% single-day gain usually means a strong earnings report, upgraded guidance, or a significant product/deal announcement. Sector rotations do cause moves, but rarely this sharp.`
					: `A ${Math.abs(change).toFixed(1)}% drop in one day usually means company-specific bad news — an earnings miss, guidance cut, or regulatory issue. Sector moves tend to be smaller and affect many stocks simultaneously.`
				: `A ${Math.abs(change).toFixed(1)}% daily move is within normal noise. Most days, stocks drift with the market without any specific catalyst — this is just regular price discovery.`,
		};
	}

	// Fallback: decision question driven by the overall signal
	const signal = pe != null && pe > 40 ? "expensive but high-growth" : pe != null && pe < 15 ? "cheap but low-growth" : "mixed";
	return {
		type: "decision",
		prompt: `Based on what you know about ${stock.name} — how would you approach it right now?`,
		options: [
			{ id: "a", text: `Research deeper — looks interesting enough to dig in` },
			{ id: "b", text: `Watch and wait — not enough conviction yet` },
			{ id: "c", text: `Pass for now — doesn't fit my criteria` },
		],
		correctId: "a",
		explanation: `${stock.prompt} ${signal === "expensive but high-growth" ? "High-growth, high-valuation stocks require understanding the long-term thesis. Researching the competitive moat and addressable market is the right first step." : signal === "cheap but low-growth" ? "Low-multiple stocks can be value traps or genuine bargains. Digging into the balance sheet and understanding why it's cheap tells you which it is." : "Any stock is worth understanding before forming a view. The goal of research isn't just to buy — it's to get comfortable enough to act with conviction or pass with confidence."}`,
	};
}

function PracticeModeView({ onBack }: { onBack: () => void }) {
	const { account, addPracticeSkillXp } = useAccount();
	const { showXp, XPFloat } = useXpFloat();

	// ── Types ────────────────────────────────────────────────────────────────────
	type RoundType = "move" | "redflag" | "sentiment" | "nextstep" | "portfoliofit";
	type MovePhase = "decision" | "reason" | "feedback";
	type OtherPhase = "question" | "feedback";

	// ── Static scenario data ─────────────────────────────────────────────────────
	// Date-based offset so the starting scenario rotates daily (same day = same starting point = consistent)
	const _todayOffset = useMemo(() => {
		const d = new Date();
		return d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate();
	}, []);

	const RED_FLAG_SCENARIOS = [
		{ scenario: "A stock is up 45% this month but revenue growth just turned negative.", question: "What's the biggest risk right now?", options: ["Valuation risk", "Strong momentum", "Low dividend yield", "High employee count"], correctIdx: 0, skill: "valuation", explanation: "When a stock rallies sharply but fundamentals weaken, valuation becomes the biggest concern. The price has run ahead of the business." },
		{ scenario: "A company has a P/E of 120x but just beat earnings estimates by 40%.", question: "What matters most for investors evaluating this?", options: ["Whether growth justifies the valuation", "The company's office location", "Yesterday's trading volume", "The CEO's social media followers"], correctIdx: 0, skill: "valuation", explanation: "A very high P/E only makes sense if growth is truly exceptional. The key question is whether future growth can justify paying such a premium." },
		{ scenario: "A tech startup has 80% YoY revenue growth but its profit margin is -45%.", question: "What should you investigate first?", options: ["Cash runway and burn rate", "Stock ticker length", "Logo design", "Number of employees"], correctIdx: 0, skill: "profitability", explanation: "Rapid revenue growth with deep losses means the company is burning cash fast. The key question is: how long can they sustain this before needing to raise capital?" },
		{ scenario: "A retailer's same-store sales fell 3% but online sales grew 25%.", question: "How would you describe this trend?", options: ["Mixed — offline shrinking, online growing", "Purely bearish", "Purely bullish", "Not meaningful"], correctIdx: 0, skill: "growth", explanation: "This is a classic retail transition story. Declining store traffic offset by digital growth — the question is whether online can grow fast enough to compensate." },
		{ scenario: "A biotech company announces it failed a Phase 3 drug trial.", question: "What typically happens to the stock?", options: ["Sharp sell-off — the drug was priced in", "Rally — failed trials attract buyers", "No reaction — trials don't matter", "Mild decline — investors expected it"], correctIdx: 0, skill: "risk", explanation: "Biotech stocks are often priced assuming the drug succeeds. A failed trial destroys that thesis immediately, causing a sharp sell-off." },
		{ scenario: "A company's gross margin just fell from 70% to 55% in one quarter.", question: "What is the most important question to ask?", options: ["Is this margin compression permanent or temporary?", "Did they change their logo?", "How many Twitter followers do they have?", "What color is their office?"], correctIdx: 0, skill: "profitability", explanation: "Gross margin compression signals pricing power is weakening or costs are rising faster than revenue. Whether it's temporary (supply chain) or structural (competition) is the critical question." },
		{ scenario: "A software company has 95% gross margins but operating margins of -60%.", question: "What does this tell you about the business?", options: ["The product is strong but expenses are very high", "The business is fundamentally broken", "Margins don't matter for software", "The stock is a guaranteed buy"], correctIdx: 0, skill: "profitability", explanation: "High gross margins mean the core product is efficient and valuable. Negative operating margins usually mean the company is spending heavily on sales/marketing/R&D — often deliberate in early growth stages." },
		{ scenario: "A stock has been in a downtrend for 6 months, but insiders just bought $10M of shares.", question: "What's the most important thing to consider?", options: ["Insiders rarely buy unless they see improving fundamentals", "Insiders always buy at the right time", "Insider buying is meaningless", "Buy immediately without further research"], correctIdx: 0, skill: "risk", explanation: "Insider buying is a positive signal — management putting personal money in suggests confidence in the business. But it's one data point, not a guarantee. Always check why the stock fell first." },
		{ scenario: "A company's revenue grew 30% last year but is guiding for 5% growth next year.", question: "What's the key risk here?", options: ["A sharp deceleration in growth", "Strong future prospects", "Dividend cut risk", "Currency risk"], correctIdx: 0, skill: "growth", explanation: "Growth deceleration is often punished severely in markets — especially for stocks priced at high multiples. The jump from 30% to 5% growth would typically cause a major valuation re-rating downward." },
		{ scenario: "A company generates $500M in operating income but has $5B in debt.", question: "What's the primary concern?", options: ["High leverage — debt could become unsustainable", "Revenue is too concentrated", "P/E ratio is too high", "The company needs to pay dividends"], correctIdx: 0, skill: "risk", explanation: "A debt/operating-income ratio of 10x is very high. If business conditions worsen, servicing that debt becomes a serious challenge. Leverage amplifies both gains and losses." },
		{ scenario: "A company reports strong Q3 earnings but the CFO resigns the same day.", question: "What should you do first?", options: ["Research why the CFO is leaving — sudden C-suite exits are a red flag", "Buy immediately on the strong earnings", "Ignore it — CFOs change jobs all the time", "Sell everything immediately"], correctIdx: 0, skill: "risk", explanation: "A sudden CFO resignation alongside earnings is a serious warning sign. CFOs have the most detailed view of the company's finances — unexpected departures often precede bad news." },
		{ scenario: "A consumer brand is gaining market share but reducing prices by 15% to do it.", question: "What's the long-term concern?", options: ["Winning market share by cutting prices often destroys margins permanently", "Price cuts are always a sign of strength", "Market share always compensates for lower prices", "Consumers will pay more later"], correctIdx: 0, skill: "profitability", explanation: "Competing on price is a dangerous strategy — it trains customers to expect low prices and makes it hard to raise them later. Durable market share should come from product quality or brand strength." },
		{ scenario: "A company beats EPS estimates every quarter for 3 years straight.", question: "What's a potential concern with this pattern?", options: ["Management may be setting expectations artificially low (sandbagging)", "Consistent beats are always a buy signal", "No concern — consistency is always good", "EPS is the only metric that matters"], correctIdx: 0, skill: "earnings", explanation: "When a company consistently beats estimates by small amounts, it sometimes means management guides conservatively on purpose. This can be fine, but it also means consensus estimates may not reflect the company's real potential." },
		{ scenario: "A company's free cash flow is positive, but net income is deeply negative.", question: "Which metric should you prioritize?", options: ["Free cash flow — it reflects actual cash the business generates", "Net income — it's the official profit number", "Neither matters for young companies", "Revenue growth only"], correctIdx: 0, skill: "profitability", explanation: "Free cash flow is often considered the most reliable indicator of business health. Net income can be distorted by accounting items like depreciation, amortization, and stock-based compensation." },
		{ scenario: "A stock's short interest just jumped from 5% to 25% of float.", question: "What does this signal?", options: ["Many professional investors are betting the stock will fall", "The stock is about to squeeze higher guaranteed", "Short sellers are always wrong", "This is normal and unimportant"], correctIdx: 0, skill: "risk", explanation: "Rising short interest means more investors are betting on a decline — often because they've identified risks the market hasn't fully priced in. It's worth understanding why before taking a position." },
	];

	const SENTIMENT_SCENARIOS = [
		{ scenario: "A company beats revenue estimates by 8% but lowers full-year guidance by 5%.", correct: "Mixed" as const, explanation: "Mixed to bearish. Investors often care more about forward guidance than past results. A guidance cut signals the company expects slower growth ahead." },
		{ scenario: "A central bank cuts interest rates by 0.5% unexpectedly.", correct: "Bullish" as const, explanation: "Bullish overall. Lower rates reduce borrowing costs, boost company valuations, and make stocks more attractive than bonds." },
		{ scenario: "A major retailer reports strong holiday sales but announces 2,000 layoffs.", correct: "Mixed" as const, explanation: "Mixed. Strong sales are positive, but layoffs signal the company is cutting costs — either to improve margins or because management expects slower growth." },
		{ scenario: "A chipmaker misses earnings by 2% but raises guidance for next quarter.", correct: "Bullish" as const, explanation: "Bullish. Forward guidance matters more than backward-looking results. A guidance raise signals management's confidence in the business trajectory." },
		{ scenario: "An airline reports record profits but fuel costs are rising 30% next year.", correct: "Mixed" as const, explanation: "Mixed to bearish. Record profits are great, but rising fuel costs (a major expense) will pressure future margins significantly." },
		{ scenario: "The government announces a 25% tariff on imported electronics.", correct: "Bearish" as const, explanation: "Bearish for electronics companies relying on imports. Tariffs raise costs, which compress margins or get passed to consumers, reducing demand." },
		{ scenario: "A major tech company announces a $50 billion share buyback program.", correct: "Bullish" as const, explanation: "Bullish. Buybacks reduce shares outstanding, boosting earnings per share. It also signals management believes the stock is undervalued." },
		{ scenario: "Inflation data comes in higher than expected for the third month in a row.", correct: "Bearish" as const, explanation: "Bearish. Persistent inflation means interest rates are likely to stay higher for longer, which pressures stock valuations — especially high-growth names." },
		{ scenario: "A pharma company wins FDA approval for a major new drug.", correct: "Bullish" as const, explanation: "Bullish. FDA approval opens the path to revenue generation for the drug. Biotech and pharma stocks often surge significantly on successful approvals." },
		{ scenario: "A social media company reports record daily users but average revenue per user declines 15%.", correct: "Mixed" as const, explanation: "Mixed. User growth is positive for long-term potential, but declining monetization means the current business isn't converting users to revenue as effectively." },
		{ scenario: "A company announces it's acquiring a competitor for a 40% premium.", correct: "Mixed" as const, explanation: "Mixed — typically bullish for the target (being bought at a premium) and uncertain for the acquirer. Markets often question whether the acquirer overpaid or can execute the integration." },
		{ scenario: "Oil prices drop 20% over two weeks due to oversupply.", correct: "Mixed" as const, explanation: "Mixed — bearish for oil producers and energy stocks, but bullish for airlines, trucking, and consumer spending. The impact depends heavily on which sector you're looking at." },
		{ scenario: "A company with $2B in annual revenue announces it will be profitable for the first time.", correct: "Bullish" as const, explanation: "Bullish. Reaching profitability is a major milestone — it proves the business model works at scale and reduces reliance on external capital." },
		{ scenario: "A streaming service loses 2 million subscribers but raises prices by 20%.", correct: "Mixed" as const, explanation: "Mixed. Losing subscribers is negative for long-term growth, but a 20% price increase on remaining subscribers could actually grow revenue. It's a bet on pricing power over volume." },
		{ scenario: "A company beats EPS by 15% but revenue only matched estimates.", correct: "Mixed" as const, explanation: "Mixed. Strong EPS beats are positive, but if they came purely from cost cuts rather than revenue growth, sustainability is questionable. Top-line growth quality matters." },
	];

	const NEXT_STEP_SCENARIOS = [
		{ scenario: "A company has 80% revenue growth but -40% profit margin.", question: "What should you investigate first?", options: ["Cash burn rate and runway", "Number of LinkedIn followers", "Whether they have a mascot", "Share count history from 1990"], correctIdx: 0, skill: "profitability", explanation: "Fast-growing companies often lose money while scaling. Understanding how much cash they burn and how long they can operate without raising more capital is critical." },
		{ scenario: "You notice a stock with a P/E of 8x while the sector average is 25x.", question: "What should you look into first?", options: ["Why the valuation is so much lower", "The company's office design", "Their marketing budget", "Whether they sponsor sports teams"], correctIdx: 0, skill: "valuation", explanation: "A very low P/E vs peers is worth investigating — it could mean a genuine value opportunity, or it could signal business problems that the market has already priced in." },
		{ scenario: "A stock you're watching just dropped 15% after reporting earnings.", question: "What's the first thing to check?", options: ["Whether guidance was cut", "The CEO's age", "Their office location", "Headcount changes from 5 years ago"], correctIdx: 0, skill: "earnings", explanation: "A big drop after earnings usually means something disappointed investors beyond just the headline number. Guidance cuts are the most common culprit — they signal the company expects things to get worse." },
		{ scenario: "A company with 30% market share just lost a major customer worth 20% of revenue.", question: "What's most important to assess?", options: ["Concentration risk and remaining client diversity", "Whether they have a famous CEO", "Their office perks", "Stock split history"], correctIdx: 0, skill: "risk", explanation: "Losing a customer worth 20% of revenue is a major concentration risk event. The first question is: how diversified is the rest of the client base, and can they replace that revenue?" },
		{ scenario: "A company grew revenue 50% last year but its stock hasn't moved.", question: "What's likely going on?", options: ["The market may have already priced in the growth", "The company has poor marketing", "Investors don't care about revenue", "The stock is definitely a buy"], correctIdx: 0, skill: "valuation", explanation: "When strong growth doesn't move the stock, the growth was likely already 'priced in' — meaning investors expected it. Future performance has to exceed expectations to drive further gains." },
		{ scenario: "Two companies have the same revenue and profit margin, but one has twice the P/E ratio.", question: "What's the most likely reason?", options: ["Investors expect higher future growth from the expensive one", "The expensive one has a better logo", "P/E ratios are random", "The cheaper one is always the better buy"], correctIdx: 0, skill: "valuation", explanation: "P/E ratios reflect expected future growth. A higher P/E means investors are paying more for each dollar of current earnings because they believe the company will grow much faster in the future." },
		{ scenario: "A stock has been trading sideways for 12 months despite strong earnings.", question: "What should you investigate?", options: ["Whether the sector is out of favor with investors", "How many employees the company has", "Their office furniture", "How often they tweet"], correctIdx: 0, skill: "news", explanation: "Stocks sometimes 'trade sideways' even with good fundamentals when their sector is broadly out of favor. Understanding macro and sector rotation helps explain why a great company might not be moving." },
		{ scenario: "A company announces a major acquisition funded entirely by new debt.", question: "What should you evaluate first?", options: ["Whether the acquisition will generate enough return to justify the debt", "The color of the acquiring company's logo", "How many employees the target has", "Whether both companies are in the same city"], correctIdx: 0, skill: "risk", explanation: "Debt-funded acquisitions add leverage to the balance sheet. The key question is whether the acquired business generates enough additional cash flow to service that new debt — and eventually pay it down." },
		{ scenario: "A company's revenue is growing 20% but its stock is down 30% this year.", question: "What might explain this?", options: ["Valuation compression — the P/E ratio contracted as rates rose", "Revenue growth is always positive for stocks", "Investors don't care about revenue", "The CFO changed"], correctIdx: 0, skill: "valuation", explanation: "In a rising interest rate environment, high-multiple stocks often see their P/E ratios compress significantly even when fundamentals are improving — because the discount rate applied to future earnings goes up." },
		{ scenario: "A company just announced record free cash flow but hasn't paid a dividend or done buybacks.", question: "What should investors ask?", options: ["What management plans to do with the cash", "Why they haven't raised prices", "Whether they have enough office space", "How big their marketing team is"], correctIdx: 0, skill: "profitability", explanation: "Strong free cash flow with no capital return program raises the question of capital allocation: is management reinvesting into the business, sitting on cash, or planning an acquisition? Each has different implications." },
		{ scenario: "A company's revenue growth is slowing from 40% to 15% over three years.", question: "What should you determine first?", options: ["Whether the slowdown is from market saturation or competition", "What industry events they sponsored", "Their office square footage", "How long the CEO has been in the role"], correctIdx: 0, skill: "growth", explanation: "Growth deceleration can be natural (market maturing) or concerning (competition taking share). The distinction matters enormously — natural deceleration often means the business is stabilizing, while competitive pressure can be a structural problem." },
	];

	const PORTFOLIO_FIT_SCENARIOS = [
		{ condition: "tech-heavy", scenario: "Your watchlist is 70% tech stocks already.", question: "Which addition would best balance your portfolio?", options: ["A consumer staples dividend stock", "Another semiconductor company", "A second cloud software name", "A startup in the same sector"], correctIdx: 0, skill: "portfolio", explanation: "When heavily concentrated in one sector, adding a company from a different sector (especially defensive/dividend) reduces correlation risk and smooths volatility." },
		{ condition: "no-defensive", scenario: "Your watchlist has no defensive or dividend stocks.", question: "What type of stock would reduce your portfolio's downside risk?", options: ["A dividend-paying consumer staples company", "Another high-growth tech name", "A speculative biotech play", "A meme stock"], correctIdx: 0, skill: "portfolio", explanation: "Defensive and dividend stocks tend to hold their value better in market downturns. Adding one creates a buffer when your growth names pull back sharply." },
	];

	// ── Scoring for Round Type A ─────────────────────────────────────────────────
	function scoreRound(decision: string, reason: string): { xp: number; skill: string; feedback: string } {
		if (decision === "Avoid For Now" && reason === "Revenue decline") return { xp: 100, skill: "growth", feedback: "Smart move. Declining revenue is a major red flag — you spotted it early." };
		if (decision === "Avoid For Now" && reason === "High valuation") return { xp: 100, skill: "valuation", feedback: "Good call. A stretched valuation with no margin for error is risky. Smart to stay cautious." };
		if (decision === "Study More" && reason === "High valuation") return { xp: 100, skill: "valuation", feedback: "Smart move. High-multiple stocks deserve more scrutiny before committing." };
		if (decision === "Study More" && reason === "Revenue decline") return { xp: 90, skill: "growth", feedback: "Good call. Wanting more context on a revenue decline before deciding is the right instinct." };
		if (decision === "Track It" && reason === "Strong revenue") return { xp: 90, skill: "growth", feedback: "Smart move. Strong revenue growth is one of the best leading indicators of a healthy business." };
		if (decision === "Track It" && reason === "Strong margins") return { xp: 90, skill: "profitability", feedback: "Good catch. High margins signal real pricing power — one of the best signs of business quality." };
		if (decision === "Compare First" && reason === "High valuation") return { xp: 90, skill: "valuation", feedback: "Smart move. Comparing against peers before paying a premium is exactly the right framework." };
		if (decision === "Compare First") return { xp: 70, skill: "peers", feedback: "Good instinct. Peer comparison is always worth doing before forming a strong view." };
		if (decision === "Track It" && reason === "High valuation") return { xp: 40, skill: "valuation", feedback: "Not bad — here's what you might be missing: tracking a high-valuation stock is fine, but be careful not to overpay. The market has already priced in a lot of optimism." };
		if (decision === "Track It" && reason === "Revenue decline") return { xp: 30, skill: "growth", feedback: "Not bad — here's what you might be missing: declining revenue is a serious warning sign. Most strong investments have growing top lines." };
		if (reason === "Not sure") return { xp: 20, skill: "awareness", feedback: "That's honest — and awareness is the first step. Keep building your instincts with each round." };
		return { xp: 60, skill: "awareness", feedback: "Good effort. Keep building pattern recognition with each round." };
	}

	// ── Stock pool ───────────────────────────────────────────────────────────────
	const pool = useMemo(() => {
		const stakIds = new Set(account?.stakBrandIds ?? []);
		const stakStocks = stakIds.size > 0
			? allBrands
				.filter(b => stakIds.has(b.id))
				.map(b => ({ ticker: b.ticker, name: b.name, prompt: b.bio ?? `${b.name} is a publicly traded company.` }))
			: [];
		const stakTickers = new Set(stakStocks.map(s => s.ticker));
		const fallback = PRACTICE_TICKERS.filter(p => !stakTickers.has(p.ticker));
		return [...stakStocks, ...fallback];
	}, [account?.stakBrandIds]);

	const [stocks] = useState(() => [...pool].sort(() => Math.random() - 0.5));
	const stockList = stocks.length > 0 ? stocks : pool;

	// ── Round sequence ───────────────────────────────────────────────────────────
	const ROUND_SEQUENCE: RoundType[] = ["move", "redflag", "sentiment", "move", "nextstep", "move", "portfoliofit", "move", "sentiment", "redflag"];
	const hasEnoughForPortfolioFit = (account?.stakBrandIds?.length ?? 0) >= 3;

	function getRoundType(sessionIdx: number): RoundType {
		const t = ROUND_SEQUENCE[sessionIdx % ROUND_SEQUENCE.length] ?? "move";
		if (t === "portfoliofit" && !hasEnoughForPortfolioFit) return "move";
		return t;
	}

	// ── Home vs. in-session ──────────────────────────────────────────────────────
	const [sessionStarted, setSessionStarted] = useState(false);

	// ── Session state ────────────────────────────────────────────────────────────
	const [sessionIdx, setSessionIdx] = useState(0);
	const [stockIdx, setStockIdx] = useState(0);
	const [showSummary, setShowSummary] = useState(false);

	// Session XP tracking
	const [sessionXp, setSessionXp] = useState(0);
	const [sessionSkillXp, setSessionSkillXp] = useState<Record<string, number>>({});
	const [correctCount, setCorrectCount] = useState(0);

	// Round Type A state
	const [movePhase, setMovePhase] = useState<MovePhase>("decision");
	const [moveDecision, setMoveDecision] = useState<string | null>(null);
	const [moveReason, setMoveReason] = useState<string | null>(null);
	const [moveFeedback, setMoveFeedback] = useState<{ xp: number; skill: string; feedback: string } | null>(null);

	// Round Types B/C/D/E state
	const [otherPhase, setOtherPhase] = useState<OtherPhase>("question");
	const [otherSelected, setOtherSelected] = useState<string | null>(null);
	const [otherCorrect, setOtherCorrect] = useState<boolean>(false);

	// Scenario indices — start at today's date offset so each day begins from a different scenario
	const [redFlagIdx, setRedFlagIdx] = useState(() => _todayOffset % 15);
	const [sentimentIdx, setSentimentIdx] = useState(() => (_todayOffset + 5) % 15);
	const [nextStepIdx, setNextStepIdx] = useState(() => (_todayOffset + 3) % 11);
	const [portfolioFitIdx, setPortfolioFitIdx] = useState(0);

	const currentRoundType = getRoundType(sessionIdx);
	const stock = stockList[stockIdx % stockList.length]!;

	const { data: stockData, isLoading } = useQuery({
		queryKey: ["stock", stock.ticker],
		queryFn: () => getStockData(stock.ticker),
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});

	const quote = stockData?.quote;
	const metrics = stockData?.metrics;

	// ── Chip generation for Round A reason step ──────────────────────────────────
	const reasonChips = useMemo(() => {
		const chips: string[] = [];
		const pe = metrics?.peRatio != null ? Number(metrics.peRatio) : null;
		const growth = metrics?.revenueGrowth != null ? String(metrics.revenueGrowth) : null;
		const margin = metrics?.profitMargin != null ? String(metrics.profitMargin) : null;
		const change = quote?.changePercent ?? 0;

		if (pe != null && pe > 35) chips.push("High valuation");
		if (pe != null && pe < 12) chips.push("Low P/E");
		if (growth != null && (growth.includes("-") || parseFloat(growth) < 0)) chips.push("Revenue decline");
		if (growth != null && !growth.includes("-") && parseFloat(growth) > 20) chips.push("Strong revenue");
		if (margin != null && (margin.includes("-") || parseFloat(margin) < 10)) chips.push("Thin margins");
		if (margin != null && !margin.includes("-") && parseFloat(margin) > 25) chips.push("Strong margins");
		if (change < -3) chips.push("Price drop today");
		if (change > 3) chips.push("Price surge today");
		chips.push("Volatility risk");
		chips.push("Not sure");

		// Deduplicate and limit to 6
		return Array.from(new Set(chips)).slice(0, 6);
	}, [metrics?.peRatio, metrics?.revenueGrowth, metrics?.profitMargin, quote?.changePercent]);

	// ── Award XP helper — ref guard prevents double-fire on rapid taps ───────────
	const xpAwardedThisRound = useRef(false);
	const awardXp = (xp: number, skill: string, isCorrectRound: boolean) => {
		if (xpAwardedThisRound.current) return; // block double-tap
		xpAwardedThisRound.current = true;
		showXp(xp);
		setSessionXp(prev => prev + xp);
		setSessionSkillXp(prev => ({ ...prev, [skill]: (prev[skill] ?? 0) + xp }));
		if (isCorrectRound) setCorrectCount(c => c + 1);
		addPracticeSkillXp(skill, xp).catch(() => {});
	};

	// ── Advance to next round ────────────────────────────────────────────────────
	const advanceRound = () => {
		const nextSession = sessionIdx + 1;
		const nextStockIdx = stockIdx + 1;

		// Show summary after going through all stocks
		if (nextStockIdx >= stockList.length) {
			setShowSummary(true);
			return;
		}

		setSessionIdx(nextSession);
		setStockIdx(nextStockIdx);

		// Reset round state
		xpAwardedThisRound.current = false; // allow XP for next round
		setMovePhase("decision");
		setMoveDecision(null);
		setMoveReason(null);
		setMoveFeedback(null);
		setOtherPhase("question");
		setOtherSelected(null);
		setOtherCorrect(false);
	};

	// ── Summary screen ────────────────────────────────────────────────────────────
	if (showSummary) {
		const total = stockList.length;
		const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
		const tier = pct >= 80
			? { emoji: "🏆", label: "Sharp Analyst", msg: "You read market signals well. Your instincts are grounded in the data.", color: "text-amber-400", border: "border-amber-500/25", bg: "bg-amber-500/[0.07]" }
			: pct >= 50
			? { emoji: "📈", label: "Getting There", msg: "Solid fundamentals awareness. Keep practicing — pattern recognition compounds over time.", color: "text-blue-400", border: "border-blue-500/25", bg: "bg-blue-500/[0.07]" }
			: { emoji: "📚", label: "Keep Practicing", msg: "Stock analysis takes time to click. Every round builds new intuition.", color: "text-violet-400", border: "border-violet-500/25", bg: "bg-violet-500/[0.07]" };

		// Top 2 skills by XP earned this session
		const topSkills = Object.entries(sessionSkillXp)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 2);

		const SKILL_LABELS: Record<string, string> = {
			valuation: "Valuation", growth: "Growth", profitability: "Profitability",
			risk: "Risk Spotting", news: "News Reading", peers: "Peer Comparison",
			earnings: "Earnings", portfolio: "Portfolio Fit", awareness: "Market Awareness",
		};

		return (
			<div className="min-h-full bg-background text-foreground">
				{XPFloat}
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<div className={`rounded-[18px] border ${tier.border} ${tier.bg} p-[24px] mb-[16px] text-center`}>
						<span className="text-[56px] block mb-[10px]">{tier.emoji}</span>
						<p className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-[4px]">Practice Session Complete</p>
						<h2 className="text-[24px] font-extrabold mb-[4px]">{tier.label}</h2>
						<p className={`text-[42px] font-extrabold ${tier.color} leading-none my-[10px]`}>
							{correctCount}<span className="text-[22px] dark:text-slate-400 text-slate-500">/{total}</span>
						</p>
						<div className="flex items-center justify-center gap-[6px] mb-[8px]">
							<Star size={14} className="text-amber-400" fill="currentColor" />
							<span className="text-[15px] font-extrabold text-amber-400">+{sessionXp} XP this session</span>
						</div>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed max-w-[280px] mx-auto">{tier.msg}</p>
					</div>

					{topSkills.length > 0 && (
						<div className="rounded-[14px] border border-foreground/10 bg-surface-1 px-[14px] py-[14px] mb-[16px]">
							<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Skills Improved</p>
							<div className="space-y-[8px]">
								{topSkills.map(([skill, xp]) => (
									<div key={skill} className="flex items-center justify-between">
										<p className="text-[13px] font-semibold">{SKILL_LABELS[skill] ?? skill}</p>
										<span className="text-[12px] font-bold text-emerald-400">+{xp} XP</span>
									</div>
								))}
							</div>
						</div>
					)}

					<div className="space-y-[8px]">
						<button type="button" onClick={onBack}
							className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
							style={{ background: "linear-gradient(90deg,#10b981,#3b82f6)" }}>
							Back to Playground
						</button>
						<button type="button" onClick={() => {
							setSessionIdx(0); setStockIdx(0); setShowSummary(false);
							setSessionXp(0); setSessionSkillXp({}); setCorrectCount(0);
							setMovePhase("decision"); setMoveDecision(null); setMoveReason(null); setMoveFeedback(null);
							setOtherPhase("question"); setOtherSelected(null); setOtherCorrect(false);
							// Restore date-seeded starting indices so replay continues from today's daily offset
						setRedFlagIdx(_todayOffset % 15); setSentimentIdx((_todayOffset + 5) % 15); setNextStepIdx((_todayOffset + 3) % 11); setPortfolioFitIdx(0);
							setSessionStarted(false);
						}}
							className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">
							Practice Again
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ── Skill progression panel data ────────────────────────────────────────────
	const SKILLS_META = [
		{ key: "valuation",    label: "Valuation",       color: "bg-cyan-500",    text: "text-cyan-400"    },
		{ key: "growth",       label: "Growth",           color: "bg-blue-500",    text: "text-blue-400"    },
		{ key: "profitability",label: "Profitability",    color: "bg-emerald-500", text: "text-emerald-400" },
		{ key: "risk",         label: "Risk Spotting",    color: "bg-rose-500",    text: "text-rose-400"    },
		{ key: "news",         label: "News Reading",     color: "bg-amber-500",   text: "text-amber-400"   },
		{ key: "peers",        label: "Peer Comparison",  color: "bg-violet-500",  text: "text-violet-400"  },
		{ key: "earnings",     label: "Earnings",         color: "bg-purple-500",  text: "text-purple-400"  },
		{ key: "portfolio",    label: "Portfolio Fit",    color: "bg-teal-500",    text: "text-teal-400"    },
		{ key: "awareness",    label: "Market Awareness", color: "bg-slate-500",   text: "text-slate-400"   },
	];
	const XP_PER_LEVEL = 100;
	const MAX_LEVEL = 5;

	// ── Home screen (shown before session starts) ────────────────────────────────
	if (!sessionStarted) {
		const practiceSkills = account?.practiceSkills ?? {};
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<div className="flex items-center justify-between mb-[2px]">
						<h2 className="text-[22px] font-extrabold">Practice Mode</h2>
						<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
							{stockList.length} stocks
						</span>
					</div>
					<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">Real data. 5 round types. Build your investor instincts.</p>

					{/* Round types preview */}
					<div className="rounded-[16px] border border-foreground/10 bg-surface-1 px-[14px] py-[14px] mb-[20px]">
						<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">What you'll practice</p>
						<div className="space-y-[8px]">
							{[
								{ label: "What's Your Move?", desc: "Evaluate a real stock and make your call", color: "text-emerald-400" },
								{ label: "Spot the Red Flag", desc: "Identify the biggest risk in a scenario", color: "text-rose-400" },
								{ label: "Bullish, Bearish, or Mixed?", desc: "Read earnings and news like an analyst", color: "text-blue-400" },
								{ label: "What Should You Check Next?", desc: "Pick the most useful next research step", color: "text-violet-400" },
								{ label: "Portfolio Fit", desc: "Balance and diversify your watchlist", color: "text-teal-400" },
							].map(r => (
								<div key={r.label} className="flex items-start gap-[10px]">
									<div className={`w-[6px] h-[6px] rounded-full mt-[6px] shrink-0 ${r.color.replace("text-", "bg-")}`} />
									<div>
										<p className="text-[13px] font-semibold">{r.label}</p>
										<p className="text-[11px] dark:text-slate-400 text-slate-500">{r.desc}</p>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Start button */}
					<button
						type="button"
						onClick={() => setSessionStarted(true)}
						className="w-full h-[52px] rounded-[14px] font-bold text-[16px] text-white active:opacity-80 mb-[28px]"
						style={{ background: "linear-gradient(90deg,#10b981,#3b82f6)" }}
					>
						Start Session · {stockList.length} rounds
					</button>

					{/* Skill progression panel */}
					<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Your Investor Skills</p>
					<div className="rounded-[16px] border border-foreground/10 bg-surface-1 px-[14px] py-[14px]">
						<div className="space-y-[12px]">
							{SKILLS_META.map(s => {
								const totalXp = practiceSkills[s.key] ?? 0;
								const level = Math.min(MAX_LEVEL, Math.floor(totalXp / XP_PER_LEVEL));
								const xpInLevel = totalXp % XP_PER_LEVEL;
								const pct = level >= MAX_LEVEL ? 100 : xpInLevel;
								return (
									<div key={s.key}>
										<div className="flex items-center justify-between mb-[4px]">
											<p className="text-[13px] font-semibold">{s.label}</p>
											<span className={`text-[11px] font-bold ${s.text}`}>
												{level >= MAX_LEVEL ? "MAX" : `Lv ${level}`}
											</span>
										</div>
										<div className="h-[5px] rounded-full bg-foreground/10">
											<div
												className={`h-full rounded-full ${s.color} transition-all duration-500`}
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// ── Header shared across all round types ─────────────────────────────────────
	const ROUND_LABELS: Record<RoundType, string> = {
		move: "What's Your Move?",
		redflag: "Spot the Red Flag",
		sentiment: "Bullish, Bearish, or Mixed?",
		nextstep: "What Should You Check Next?",
		portfoliofit: "Portfolio Fit",
	};

	const isUp = (quote?.changePercent ?? 0) >= 0;

	// ────────────────────────────────────────────────────────────────────────────
	// ROUND TYPE A: "What's Your Move?" — 3-step flow
	// ────────────────────────────────────────────────────────────────────────────
	if (currentRoundType === "move") {
		const DECISIONS = [
			"Track It",
			"Study More",
			"Compare First",
			"Avoid For Now",
		];

		// Step 1: Decision
		if (movePhase === "decision") {
			return (
				<div className="min-h-full bg-background text-foreground">
					{XPFloat}
					<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
						<BackBtn onClick={onBack} />
						<div className="flex items-center justify-between mb-[2px]">
							<h2 className="text-[20px] font-extrabold">{ROUND_LABELS.move}</h2>
							<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
								{stockIdx + 1} / {stockList.length}
							</span>
						</div>
						<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[14px]">Review the stock, then make your call.</p>

						<div className="h-[3px] rounded-full bg-foreground/10 mb-[18px]">
							<div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 transition-all duration-500"
								style={{ width: `${(stockIdx / stockList.length) * 100}%` }} />
						</div>

						{/* Stock card */}
						<div className="rounded-[16px] border border-foreground/10 bg-surface-1 p-[16px] mb-[14px]">
							<div className="flex items-center justify-between mb-[10px]">
								<div>
									<p className="text-[18px] font-extrabold">{stock.name}</p>
									<p className="text-[12px] dark:text-slate-400 text-slate-500">{stock.ticker}</p>
								</div>
								{quote ? (
									<div className="text-right">
										<p className="text-[17px] font-extrabold">${quote.price.toFixed(2)}</p>
										<p className={`text-[12px] font-semibold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
											{isUp ? "+" : ""}{quote.changePercent.toFixed(2)}% today
										</p>
									</div>
								) : isLoading ? (
									<div className="space-y-[4px]">
										<div className="h-[16px] w-[64px] rounded bg-foreground/10 animate-pulse" />
										<div className="h-[12px] w-[44px] rounded bg-foreground/10 animate-pulse" />
									</div>
								) : null}
							</div>
							{metrics && (
								<div className="grid grid-cols-3 gap-[6px] mb-[10px]">
									{[
										{ label: "P/E", value: metrics.peRatio != null ? `${metrics.peRatio}x` : "N/A" },
										{ label: "Rev. Growth", value: metrics.revenueGrowth ?? "N/A" },
										{ label: "Margin", value: metrics.profitMargin ?? "N/A" },
									].map(m => (
										<div key={m.label} className="rounded-[8px] bg-foreground/[0.04] p-[8px] text-center">
											<p className="text-[10px] dark:text-slate-500 text-slate-400">{m.label}</p>
											<p className="text-[13px] font-bold">{String(m.value)}</p>
										</div>
									))}
								</div>
							)}
							<p className="text-[12px] dark:text-slate-400 text-slate-500 leading-relaxed">{stock.prompt}</p>
						</div>

						<p className="text-[14px] font-bold mb-[10px]">What's your move?</p>
						<div className="space-y-[8px]">
							{DECISIONS.map((d) => (
								<button
									key={d}
									type="button"
									onClick={() => { setMoveDecision(d); setMovePhase("reason"); }}
									className="w-full flex items-center gap-[12px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[14px] py-[13px] text-left active:opacity-80 transition-colors"
								>
									<p className="text-[14px] font-medium flex-1">{d}</p>
									<ChevronRight size={14} className="shrink-0 dark:text-slate-500 text-slate-400" />
								</button>
							))}
						</div>
					</div>
				</div>
			);
		}

		// Step 2: Reason
		if (movePhase === "reason") {
			return (
				<div className="min-h-full bg-background text-foreground">
					{XPFloat}
					<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
						<BackBtn onClick={() => setMovePhase("decision")} label="Back" />
						<div className="flex items-center justify-between mb-[2px]">
							<h2 className="text-[20px] font-extrabold">What caught your eye?</h2>
							<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
								{stockIdx + 1} / {stockList.length}
							</span>
						</div>
						<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">You picked: <span className="font-semibold text-foreground">{moveDecision}</span></p>

						<div className="flex flex-wrap gap-[8px]">
							{reasonChips.map(chip => (
								<button
									key={chip}
									type="button"
									onClick={() => {
										setMoveReason(chip);
										const result = scoreRound(moveDecision!, chip);
										setMoveFeedback(result);
										awardXp(result.xp, result.skill, result.xp >= 80);
										setMovePhase("feedback");
									}}
									className="text-[13px] font-semibold px-[14px] py-[9px] rounded-full border border-foreground/15 bg-surface-1 dark:text-slate-300 text-slate-600 active:opacity-70 transition-opacity"
								>
									{chip}
								</button>
							))}
						</div>
					</div>
				</div>
			);
		}

		// Step 3: Feedback
		if (movePhase === "feedback" && moveFeedback) {
			const isGoodScore = moveFeedback.xp >= 80;
			return (
				<div className="min-h-full bg-background text-foreground">
					{XPFloat}
					<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
						<BackBtn onClick={onBack} label="Playground" />
						<div className="flex items-center justify-between mb-[14px]">
							<h2 className="text-[20px] font-extrabold">Round Feedback</h2>
							<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
								{stockIdx + 1} / {stockList.length}
							</span>
						</div>

						<div className={`rounded-[16px] border p-[20px] mb-[14px] ${isGoodScore ? "border-emerald-500/30 bg-emerald-500/[0.07]" : "border-amber-500/30 bg-amber-500/[0.07]"}`}>
							<div className="flex items-center gap-[10px] mb-[10px]">
								<div className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full ${isGoodScore ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
									<Star size={18} fill="currentColor" />
								</div>
								<div>
									<p className={`text-[22px] font-extrabold ${isGoodScore ? "text-emerald-400" : "text-amber-400"}`}>+{moveFeedback.xp} XP</p>
									<p className="text-[11px] capitalize dark:text-slate-400 text-slate-500">{moveFeedback.skill} skill</p>
								</div>
							</div>
							<p className="text-[14px] font-semibold leading-relaxed text-foreground">{moveFeedback.feedback}</p>
						</div>

						<div className="rounded-[14px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px] mb-[16px]">
							<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[4px]">Your call</p>
							<p className="text-[13px] font-bold">{moveDecision} · <span className="text-emerald-400">{moveReason}</span></p>
						</div>

						<button type="button" onClick={advanceRound}
							className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
							style={{ background: "linear-gradient(90deg,#10b981,#3b82f6)" }}>
							{stockIdx + 1 >= stockList.length ? "See Results" : "Next Round →"}
						</button>
					</div>
				</div>
			);
		}
	}

	// ────────────────────────────────────────────────────────────────────────────
	// ROUND TYPE B: "Spot the Red Flag" — static MC
	// Rotate options so the correct answer isn't always position 0 — uses scenario index as seed
	function rotateOptions(options: string[], correctIdx: number, seed: number) {
		const n = options.length;
		const offset = seed % n;
		const rotated = [...options.slice(offset), ...options.slice(0, offset)];
		const newCorrectIdx = (correctIdx - offset + n) % n;
		return { opts: rotated.map((text, i) => ({ id: String(i), text })), correctId: String(newCorrectIdx) };
	}

	// ────────────────────────────────────────────────────────────────────────────
	if (currentRoundType === "redflag") {
		const sc = RED_FLAG_SCENARIOS[redFlagIdx % RED_FLAG_SCENARIOS.length]!;
		const { opts, correctId } = rotateOptions(sc.options, sc.correctIdx, redFlagIdx + _todayOffset);

		if (otherPhase === "question") {
			return (
				<div className="min-h-full bg-background text-foreground">
					{XPFloat}
					<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
						<BackBtn onClick={onBack} />
						<div className="flex items-center justify-between mb-[14px]">
							<h2 className="text-[20px] font-extrabold">{ROUND_LABELS.redflag}</h2>
							<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
								{stockIdx + 1} / {stockList.length}
							</span>
						</div>
						<div className="rounded-[14px] border border-rose-500/25 bg-rose-500/[0.07] px-[14px] py-[12px] mb-[14px]">
							<p className="text-[11px] font-bold uppercase tracking-wide text-rose-400 mb-[4px]">Scenario</p>
							<p className="text-[14px] font-semibold leading-relaxed">{sc.scenario}</p>
						</div>
						<p className="text-[14px] font-bold mb-[10px]">{sc.question}</p>
						<div className="space-y-[8px]">
							{opts.map((opt, i) => (
								<OptionBtn
									key={opt.id}
									letter={LETTERS[i] ?? String(i + 1)}
									text={opt.text}
									state="idle"
									onClick={() => {
										const correct = opt.id === correctId;
										setOtherSelected(opt.id);
										setOtherCorrect(correct);
										setOtherPhase("feedback");
										const xp = correct ? 80 : 20;
										awardXp(xp, sc.skill, correct);
									}}
								/>
							))}
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className="min-h-full bg-background text-foreground">
				{XPFloat}
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} label="Playground" />
					<div className="flex items-center justify-between mb-[14px]">
						<h2 className="text-[20px] font-extrabold">{ROUND_LABELS.redflag}</h2>
						<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
							{stockIdx + 1} / {stockList.length}
						</span>
					</div>
					<div className="space-y-[8px] mb-[14px]">
						{opts.map((opt, i) => (
							<OptionBtn
								key={opt.id}
								letter={LETTERS[i] ?? String(i + 1)}
								text={opt.text}
								state={optionState(opt.id, correctId, otherSelected, true)}
								disabled
							/>
						))}
					</div>
					<div className={`rounded-[13px] border p-[14px] mb-[14px] ${otherCorrect ? "border-emerald-500/30 bg-emerald-500/[0.07]" : "border-rose-500/30 bg-rose-500/[0.07]"}`}>
						<p className={`text-[13px] font-bold mb-[4px] ${otherCorrect ? "text-emerald-400" : "text-rose-400"}`}>
							{otherCorrect ? "Good catch! ✓" : "Not bad — here's what you missed."}
						</p>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{sc.explanation}</p>
					</div>
					<button type="button"
						onClick={() => { setRedFlagIdx(i => i + 1); advanceRound(); }}
						className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
						style={{ background: "linear-gradient(90deg,#f43f5e,#3b82f6)" }}>
						{stockIdx + 1 >= stockList.length ? "See Results" : "Next Round →"}
					</button>
				</div>
			</div>
		);
	}

	// ────────────────────────────────────────────────────────────────────────────
	// ROUND TYPE C: "Bullish, Bearish, or Mixed?"
	// ────────────────────────────────────────────────────────────────────────────
	if (currentRoundType === "sentiment") {
		const sc = SENTIMENT_SCENARIOS[sentimentIdx % SENTIMENT_SCENARIOS.length]!;
		const sentimentOpts = [
			{ id: "Bullish", text: "Bullish" },
			{ id: "Bearish", text: "Bearish" },
			{ id: "Mixed", text: "Mixed" },
		];

		if (otherPhase === "question") {
			return (
				<div className="min-h-full bg-background text-foreground">
					{XPFloat}
					<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
						<BackBtn onClick={onBack} />
						<div className="flex items-center justify-between mb-[14px]">
							<h2 className="text-[20px] font-extrabold">{ROUND_LABELS.sentiment}</h2>
							<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
								{stockIdx + 1} / {stockList.length}
							</span>
						</div>
						<div className="rounded-[14px] border border-blue-500/25 bg-blue-500/[0.07] px-[14px] py-[12px] mb-[14px]">
							<p className="text-[11px] font-bold uppercase tracking-wide text-blue-400 mb-[4px]">News / Earnings</p>
							<p className="text-[14px] font-semibold leading-relaxed">{sc.scenario}</p>
						</div>
						<p className="text-[14px] font-bold mb-[10px]">How would you read this?</p>
						<div className="space-y-[8px]">
							{sentimentOpts.map((opt, i) => (
								<OptionBtn
									key={opt.id}
									letter={LETTERS[i] ?? String(i + 1)}
									text={opt.text}
									state="idle"
									onClick={() => {
										const correct = opt.id === sc.correct;
										setOtherSelected(opt.id);
										setOtherCorrect(correct);
										setOtherPhase("feedback");
										const xp = correct ? 80 : 20;
										awardXp(xp, "news", correct);
									}}
								/>
							))}
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className="min-h-full bg-background text-foreground">
				{XPFloat}
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} label="Playground" />
					<div className="flex items-center justify-between mb-[14px]">
						<h2 className="text-[20px] font-extrabold">{ROUND_LABELS.sentiment}</h2>
						<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
							{stockIdx + 1} / {stockList.length}
						</span>
					</div>
					<div className="space-y-[8px] mb-[14px]">
						{sentimentOpts.map((opt, i) => (
							<OptionBtn
								key={opt.id}
								letter={LETTERS[i] ?? String(i + 1)}
								text={opt.text}
								state={optionState(opt.id, sc.correct, otherSelected, true)}
								disabled
							/>
						))}
					</div>
					<div className={`rounded-[13px] border p-[14px] mb-[14px] ${otherCorrect ? "border-emerald-500/30 bg-emerald-500/[0.07]" : "border-amber-500/30 bg-amber-500/[0.07]"}`}>
						<p className={`text-[13px] font-bold mb-[4px] ${otherCorrect ? "text-emerald-400" : "text-amber-400"}`}>
							{otherCorrect ? "Good read! ✓" : "Not bad — here's what you missed."}
						</p>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{sc.explanation}</p>
					</div>
					<button type="button"
						onClick={() => { setSentimentIdx(i => i + 1); advanceRound(); }}
						className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
						style={{ background: "linear-gradient(90deg,#3b82f6,#6366f1)" }}>
						{stockIdx + 1 >= stockList.length ? "See Results" : "Next Round →"}
					</button>
				</div>
			</div>
		);
	}

	// ────────────────────────────────────────────────────────────────────────────
	// ROUND TYPE D: "What Should You Check Next?"
	// ────────────────────────────────────────────────────────────────────────────
	if (currentRoundType === "nextstep") {
		const sc = NEXT_STEP_SCENARIOS[nextStepIdx % NEXT_STEP_SCENARIOS.length]!;
		const { opts, correctId } = rotateOptions(sc.options, sc.correctIdx, nextStepIdx + _todayOffset);

		if (otherPhase === "question") {
			return (
				<div className="min-h-full bg-background text-foreground">
					{XPFloat}
					<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
						<BackBtn onClick={onBack} />
						<div className="flex items-center justify-between mb-[14px]">
							<h2 className="text-[20px] font-extrabold">{ROUND_LABELS.nextstep}</h2>
							<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
								{stockIdx + 1} / {stockList.length}
							</span>
						</div>
						<div className="rounded-[14px] border border-violet-500/25 bg-violet-500/[0.07] px-[14px] py-[12px] mb-[14px]">
							<p className="text-[11px] font-bold uppercase tracking-wide text-violet-400 mb-[4px]">Situation</p>
							<p className="text-[14px] font-semibold leading-relaxed">{sc.scenario}</p>
						</div>
						<p className="text-[14px] font-bold mb-[10px]">{sc.question}</p>
						<div className="space-y-[8px]">
							{opts.map((opt, i) => (
								<OptionBtn
									key={opt.id}
									letter={LETTERS[i] ?? String(i + 1)}
									text={opt.text}
									state="idle"
									onClick={() => {
										const correct = opt.id === correctId;
										setOtherSelected(opt.id);
										setOtherCorrect(correct);
										setOtherPhase("feedback");
										const xp = correct ? 80 : 20;
										awardXp(xp, sc.skill, correct);
									}}
								/>
							))}
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className="min-h-full bg-background text-foreground">
				{XPFloat}
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} label="Playground" />
					<div className="flex items-center justify-between mb-[14px]">
						<h2 className="text-[20px] font-extrabold">{ROUND_LABELS.nextstep}</h2>
						<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
							{stockIdx + 1} / {stockList.length}
						</span>
					</div>
					<div className="space-y-[8px] mb-[14px]">
						{opts.map((opt, i) => (
							<OptionBtn
								key={opt.id}
								letter={LETTERS[i] ?? String(i + 1)}
								text={opt.text}
								state={optionState(opt.id, correctId, otherSelected, true)}
								disabled
							/>
						))}
					</div>
					<div className={`rounded-[13px] border p-[14px] mb-[14px] ${otherCorrect ? "border-emerald-500/30 bg-emerald-500/[0.07]" : "border-rose-500/30 bg-rose-500/[0.07]"}`}>
						<p className={`text-[13px] font-bold mb-[4px] ${otherCorrect ? "text-emerald-400" : "text-rose-400"}`}>
							{otherCorrect ? "Smart move! ✓" : "Not bad — here's what you missed."}
						</p>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{sc.explanation}</p>
					</div>
					<button type="button"
						onClick={() => { setNextStepIdx(i => i + 1); advanceRound(); }}
						className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
						style={{ background: "linear-gradient(90deg,#8b5cf6,#3b82f6)" }}>
						{stockIdx + 1 >= stockList.length ? "See Results" : "Next Round →"}
					</button>
				</div>
			</div>
		);
	}

	// ────────────────────────────────────────────────────────────────────────────
	// ROUND TYPE E: "Portfolio Fit"
	// ────────────────────────────────────────────────────────────────────────────
	if (currentRoundType === "portfoliofit") {
		const sc = PORTFOLIO_FIT_SCENARIOS[portfolioFitIdx % PORTFOLIO_FIT_SCENARIOS.length]!;
		const { opts, correctId } = rotateOptions(sc.options, sc.correctIdx, portfolioFitIdx + _todayOffset);

		if (otherPhase === "question") {
			return (
				<div className="min-h-full bg-background text-foreground">
					{XPFloat}
					<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
						<BackBtn onClick={onBack} />
						<div className="flex items-center justify-between mb-[14px]">
							<h2 className="text-[20px] font-extrabold">{ROUND_LABELS.portfoliofit}</h2>
							<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
								{stockIdx + 1} / {stockList.length}
							</span>
						</div>
						<div className="rounded-[14px] border border-emerald-500/25 bg-emerald-500/[0.07] px-[14px] py-[12px] mb-[14px]">
							<p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400 mb-[4px]">Your Portfolio</p>
							<p className="text-[14px] font-semibold leading-relaxed">{sc.scenario}</p>
						</div>
						<p className="text-[14px] font-bold mb-[10px]">{sc.question}</p>
						<div className="space-y-[8px]">
							{opts.map((opt, i) => (
								<OptionBtn
									key={opt.id}
									letter={LETTERS[i] ?? String(i + 1)}
									text={opt.text}
									state="idle"
									onClick={() => {
										const correct = opt.id === correctId;
										setOtherSelected(opt.id);
										setOtherCorrect(correct);
										setOtherPhase("feedback");
										const xp = correct ? 80 : 20;
										awardXp(xp, sc.skill, correct);
									}}
								/>
							))}
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className="min-h-full bg-background text-foreground">
				{XPFloat}
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} label="Playground" />
					<div className="flex items-center justify-between mb-[14px]">
						<h2 className="text-[20px] font-extrabold">{ROUND_LABELS.portfoliofit}</h2>
						<span className="text-[12px] font-semibold dark:text-slate-400 text-slate-500 bg-foreground/[0.06] px-[10px] py-[4px] rounded-full">
							{stockIdx + 1} / {stockList.length}
						</span>
					</div>
					<div className="space-y-[8px] mb-[14px]">
						{opts.map((opt, i) => (
							<OptionBtn
								key={opt.id}
								letter={LETTERS[i] ?? String(i + 1)}
								text={opt.text}
								state={optionState(opt.id, correctId, otherSelected, true)}
								disabled
							/>
						))}
					</div>
					<div className={`rounded-[13px] border p-[14px] mb-[14px] ${otherCorrect ? "border-emerald-500/30 bg-emerald-500/[0.07]" : "border-amber-500/30 bg-amber-500/[0.07]"}`}>
						<p className={`text-[13px] font-bold mb-[4px] ${otherCorrect ? "text-emerald-400" : "text-amber-400"}`}>
							{otherCorrect ? "Good call! ✓" : "Not bad — here's what you missed."}
						</p>
						<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{sc.explanation}</p>
					</div>
					<button type="button"
						onClick={() => { setPortfolioFitIdx(i => i + 1); advanceRound(); }}
						className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
						style={{ background: "linear-gradient(90deg,#10b981,#6366f1)" }}>
						{stockIdx + 1 >= stockList.length ? "See Results" : "Next Round →"}
					</button>
				</div>
			</div>
		);
	}

	// Fallback (should never render)
	return null;
}

// ── What Would You Do? ────────────────────────────────────────

// ── Build Your First Watchlist ────────────────────────────────

function WatchlistGameView({ onBack }: { onBack: () => void }) {
	// ── Phase state ──────────────────────────────────────────────────────────────
	const [phase, setPhase] = useState<"goal" | "building" | "diagnosis">("goal");
	const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
	// slotPicks: index → brand id
	const [slotPicks, setSlotPicks] = useState<Record<number, string | null>>({});
	// search overlay
	const [searchSlot, setSearchSlot] = useState<number | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	// feedback from last pick
	const [lastFeedback, setLastFeedback] = useState<string | null>(null);
	// save-to-stak state
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const { account, saveToStak } = useAccount();

	// ── Goals ────────────────────────────────────────────────────────────────────
	const GOALS = [
		{ id: "balanced",    label: "Beginner Balanced",  emoji: "⚖️",  desc: "A mix of all types for a solid start" },
		{ id: "growth",      label: "High Growth",         emoji: "🚀",  desc: "Focus on fast-growing companies" },
		{ id: "stable",      label: "Safer & Stable",      emoji: "🛡️",  desc: "Defensive names that hold up in downturns" },
		{ id: "familiar",    label: "Brands I Know",        emoji: "🏠",  desc: "Companies you use and recognize" },
		{ id: "dividend",    label: "Dividend / Income",   emoji: "💵",  desc: "Stocks that pay regular cash" },
		{ id: "speculative", label: "Speculative Upside",  emoji: "🎲",  desc: "High risk, high reward plays" },
	] as const;

	// ── Goal → slot type sequence ─────────────────────────────────────────────
	type GoalSlotConfig = Record<string, WatchlistSlotType[]>;
	const GOAL_SLOTS: GoalSlotConfig = {
		balanced:    ["familiar","familiar","growth","growth","defensive","dividend","speculative"],
		growth:      ["growth","growth","growth","familiar","familiar","speculative","defensive"],
		stable:      ["defensive","defensive","dividend","dividend","familiar","familiar","growth"],
		familiar:    ["familiar","familiar","familiar","familiar","growth","defensive","dividend"],
		dividend:    ["dividend","dividend","dividend","defensive","defensive","familiar","growth"],
		speculative: ["speculative","speculative","speculative","growth","growth","familiar","defensive"],
	};

	// Build the 7 slots for the current goal, assigning label/emoji/description from WATCHLIST_SLOTS
	const goalSlotDefs = useMemo(() => {
		if (!selectedGoal) return [];
		const types = GOAL_SLOTS[selectedGoal] ?? [];
		// track usage count per type to pick alternate description for duplicates
		const usageCount: Record<string, number> = {};
		return types.map((t) => {
			const count = usageCount[t] ?? 0;
			usageCount[t] = count + 1;
			// find all WATCHLIST_SLOTS matching this type
			const matching = WATCHLIST_SLOTS.filter(s => s.type === t);
			// use second slot's description for duplicate (index count)
			const src = matching[Math.min(count, matching.length - 1)] ?? matching[0]!;
			return { type: t, label: src.label, emoji: src.emoji, description: src.description };
		});
	}, [selectedGoal]);

	const TOTAL_SLOTS = 7;
	const filledCount = Object.values(slotPicks).filter(Boolean).length;
	const allFilled = filledCount === TOTAL_SLOTS;

	// ── Pick helpers ─────────────────────────────────────────────────────────────
	const pickBrand = (slotIdx: number, brandId: string) => {
		setSlotPicks(p => ({ ...p, [slotIdx]: brandId }));
		setSearchSlot(null);
		setSearchQuery("");
		// compute feedback
		const brand = WATCHLIST_BRANDS.find(b => b.id === brandId);
		if (!brand) { setLastFeedback(null); return; }
		const newPicks = { ...slotPicks, [slotIdx]: brandId };
		const pickedBrands = Object.values(newPicks)
			.filter(Boolean)
			.map(id => WATCHLIST_BRANDS.find(b => b.id === id))
			.filter((b): b is typeof WATCHLIST_BRANDS[number] => !!b);
		const growthCount = pickedBrands.filter(b => (b.types[0] ?? null) === "growth").length;
		const specCount = pickedBrands.filter(b => (b.types[0] ?? null) === "speculative").length;
		let fb: string | null = null;
		if (growthCount >= 3) fb = "You're getting tech-heavy — consider adding a stable name.";
		else if (specCount >= 2) fb = "Careful: multiple speculative picks increase volatility.";
		else if (brand.types.includes("defensive")) fb = `Nice — ${brand.ticker} adds stability to your watchlist.`;
		else if (brand.types.includes("dividend")) fb = `${brand.ticker} pays dividends — good for income exposure.`;
		else if (brand.types.includes("speculative")) fb = `${brand.ticker} is speculative — high risk, high reward.`;
		else if (brand.types.includes("familiar")) fb = `${brand.ticker} is a familiar brand — good foundation.`;
		setLastFeedback(fb);
	};

	const clearPick = (slotIdx: number) => {
		setSlotPicks(p => ({ ...p, [slotIdx]: null }));
		setLastFeedback(null);
	};

	// Brands available for a given slot (filtered by type, excluding already picked)
	const brandsForSlot = (slotIdx: number, query: string): typeof WATCHLIST_BRANDS => {
		const slotType = goalSlotDefs[slotIdx]?.type;
		if (!slotType) return [];
		const alreadyPicked = new Set(
			Object.entries(slotPicks)
				.filter(([k, v]) => v && Number(k) !== slotIdx)
				.map(([, v]) => v as string)
		);
		return WATCHLIST_BRANDS.filter(b =>
			b.types.includes(slotType) &&
			!alreadyPicked.has(b.id) &&
			(query.trim() === "" ||
				b.ticker.toLowerCase().includes(query.toLowerCase()) ||
				b.name.toLowerCase().includes(query.toLowerCase()))
		);
	};

	// Logo helper
	const brandLogo = (brandId: string) => {
		const b = allBrands.find(ab => ab.ticker?.toLowerCase() === brandId.toLowerCase() || ab.id === brandId);
		if (b?.domain) return `https://logo.clearbit.com/${b.domain}`;
		const domainMap: Record<string, string> = {
			aapl:"apple.com", tsla:"tesla.com", nvda:"nvidia.com", sbux:"starbucks.com",
			nflx:"netflix.com", ko:"coca-cola.com", wmt:"walmart.com", jnj:"jnj.com",
			meta:"meta.com", coin:"coinbase.com", pltr:"palantir.com", msft:"microsoft.com",
			amzn:"amazon.com", rblx:"roblox.com", asts:"ast-science.com", spce:"virgingalactic.com",
			rivn:"rivian.com", cost:"costco.com", shop:"shopify.com", nke:"nike.com",
		};
		const d = domainMap[brandId];
		if (d) return `https://logo.clearbit.com/${d}`;
		return null;
	};

	// Initials fallback
	const tickerInitials = (ticker: string) => ticker.slice(0, 2).toUpperCase();

	// ── Diagnosis computation ─────────────────────────────────────────────────────
	const diagnosisData = useMemo(() => {
		if (phase !== "diagnosis") return null;
		const pickedBrands = Array.from({ length: TOTAL_SLOTS }, (_, i) => slotPicks[i])
			.map(id => WATCHLIST_BRANDS.find(b => b.id === id))
			.filter((b): b is typeof WATCHLIST_BRANDS[number] => !!b);

		const clamp = (v: number) => Math.max(0, Math.min(100, v));

		// Use first type of each brand to avoid double counting
		let growthScore = 0, stabilityScore = 0, familiarityScore = 0, speculativeRisk = 0, incomeScore = 0;
		for (const b of pickedBrands) {
			const t = b.types[0] ?? null;
			if (!t) return;
			growthScore     += t === "growth" ? 16 : t === "speculative" ? 8 : t === "familiar" ? 4 : 0;
			stabilityScore  += t === "defensive" ? 18 : t === "dividend" ? 14 : t === "familiar" ? 7 : t === "growth" ? 2 : t === "speculative" ? -8 : 0;
			familiarityScore += t === "familiar" ? 17 : t === "defensive" ? 7 : t === "dividend" ? 5 : t === "growth" ? 4 : 0;
			speculativeRisk  += t === "speculative" ? 18 : t === "growth" ? 9 : t === "familiar" ? 3 : t === "dividend" ? 1 : 0;
			incomeScore      += t === "dividend" ? 20 : t === "defensive" ? 8 : t === "familiar" ? 2 : 0;
		}
		growthScore      = clamp(growthScore);
		stabilityScore   = clamp(stabilityScore);
		familiarityScore = clamp(familiarityScore);
		speculativeRisk  = clamp(speculativeRisk);
		incomeScore      = clamp(incomeScore);

		// Personality
		const personality =
			speculativeRisk >= 65 ? { type: "Speculative Hunter", emoji: "🎲", tagline: "Drawn to big-upside stories — your watchlist may swing sharply with market news." }
			: growthScore >= 70 && stabilityScore < 50 ? { type: "Growth-Heavy Explorer", emoji: "🚀", tagline: "Strong upside exposure, but your watchlist may move sharply when markets get nervous." }
			: stabilityScore >= 65 ? { type: "Steady Builder", emoji: "🛡️", tagline: "Prefer stability — your picks should hold up well during market volatility." }
			: incomeScore >= 55 ? { type: "Income Investor", emoji: "💵", tagline: "Focused on dividend income — your portfolio generates regular cash." }
			: familiarityScore >= 65 ? { type: "Brand Builder", emoji: "🏠", tagline: "Lean toward companies you recognize — great for building confidence as an investor." }
			: { type: "Balanced Beginner", emoji: "⚖️", tagline: "Well-rounded starting watchlist with different types of exposure." };

		// Strengths
		const strengths: string[] = [];
		if (growthScore >= 60) strengths.push("Strong exposure to companies with high growth potential");
		if (stabilityScore >= 60) strengths.push("Good defensive anchors that reduce downside risk");
		if (familiarityScore >= 60) strengths.push("Mix of brands you know and understand — builds investing confidence");
		if (incomeScore >= 40) strengths.push("Dividend exposure provides regular income potential");
		const typeSet = new Set(pickedBrands.flatMap(b => b.types));
		strengths.push(`You picked ${pickedBrands.length} stocks across ${typeSet.size} different categories`);

		// Watchouts
		const watchouts: string[] = [];
		const growthPicks = pickedBrands.filter(b => b.types[0] === "growth").length;
		const specPicks   = pickedBrands.filter(b => b.types[0] === "speculative").length;
		if (growthPicks >= 3) watchouts.push("Heavy concentration in high-growth tech — may swing more in volatile markets");
		if (specPicks >= 2)   watchouts.push("Multiple speculative picks add significant volatility risk");
		if (incomeScore < 25)     watchouts.push("Limited income/dividend exposure — consider one payer for balance");
		if (stabilityScore < 35)  watchouts.push("Low stability — your watchlist may drop sharply in market downturns");
		if (familiarityScore < 30) watchouts.push("Few familiar brands — consider adding companies you know well");

		// Next best move (weakest dimension)
		const dims = [
			{ name: "growth", score: growthScore, advice: "Add a high-growth stock like NVDA or SHOP to boost upside potential." },
			{ name: "stability", score: stabilityScore, advice: "Add a defensive stock like KO, JNJ, or WMT to anchor against downturns." },
			{ name: "familiarity", score: familiarityScore, advice: "Pick a brand you use daily — like AAPL, AMZN, or NKE — to build confidence." },
			{ name: "speculative", score: speculativeRisk, advice: "Consider trimming speculative exposure for a more stable foundation." },
			{ name: "income", score: incomeScore, advice: "Add a dividend payer like KO, JNJ, or MSFT for regular income exposure." },
		];
		const weakest = dims.filter(d => d.name !== "speculative").sort((a, b) => a.score - b.score)[0];
		const nextMove = weakest?.advice ?? "Fine-tune your watchlist by reviewing your highest-risk positions.";

		// Exposure themes
		const CAT_LABEL: Record<string, string> = {
			tech:"AI & Tech", finance:"Finance", food_drink:"Consumer Brands", gaming:"Gaming",
			streaming:"Streaming", energy:"Energy", travel:"Travel", fitness:"Health & Fitness",
			fashion:"Fashion", shopping:"Retail", crypto:"Crypto",
			food:"Consumer Brands", lifestyle:"Lifestyle", social:"Social", media:"Media",
			entertainment:"Entertainment", music:"Music", education:"Education",
			automotive:"Automotive", sustainability:"Sustainability",
		};
		// Fallback type labels for brands not in allBrands (KO, WMT, JNJ, COST, PLTR, etc.)
		const TYPE_EXPOSURE: Record<string, string> = {
			growth: "High-Growth Stocks", defensive: "Defensive Stocks",
			dividend: "Dividend Income", speculative: "Speculative Plays", familiar: "Familiar Brands",
		};
		const cats = new Set<string>();
		for (const b of pickedBrands) {
			const ab = allBrands.find(a => a.ticker?.toLowerCase() === b.id || a.id === b.id);
			if (ab?.interestCategories?.length) {
				ab.interestCategories.forEach(c => {
					const label = CAT_LABEL[c];
					if (label) cats.add(label);
				});
			} else {
				// Brand not in allBrands — derive from its primary type
				const typeLabel = TYPE_EXPOSURE[b.types[0] ?? ""] ?? null;
				if (typeLabel) cats.add(typeLabel);
			}
		}

		return {
			growthScore, stabilityScore, familiarityScore, speculativeRisk, incomeScore,
			personality, strengths: strengths.slice(0, 2), watchouts: watchouts.slice(0, 2),
			nextMove, exposures: Array.from(cats), pickedBrands,
		};
	}, [phase, slotPicks]);

	// ── Phase 1: Goal selection ───────────────────────────────────────────────────
	if (phase === "goal") {
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<h2 className="text-[22px] font-extrabold mb-[4px]">Build Your Watchlist</h2>
					<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[24px]">Choose a strategy to get started.</p>
					<div className="grid grid-cols-2 gap-[10px]">
						{GOALS.map(g => (
							<button
								key={g.id}
								type="button"
								onClick={() => {
									setSelectedGoal(g.id);
									setSlotPicks({});
									setLastFeedback(null);
									setSaved(false);
									setPhase("building");
								}}
								className={`rounded-[14px] border px-[14px] py-[14px] text-left active:opacity-80 transition-colors ${selectedGoal === g.id ? "border-violet-500/40 bg-violet-500/[0.06]" : "border-foreground/10 bg-surface-1"}`}
							>
								<p className="text-[28px] mb-[6px]">{g.emoji}</p>
								<p className="text-[13px] font-bold mb-[2px]">{g.label}</p>
								<p className="text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">{g.desc}</p>
							</button>
						))}
					</div>
				</div>
			</div>
		);
	}

	// ── Phase 2: Building ─────────────────────────────────────────────────────────
	if (phase === "building") {
		const goalLabel = GOALS.find(g => g.id === selectedGoal)?.label ?? "";

		// Search overlay
		if (searchSlot !== null) {
			const slotDef = goalSlotDefs[searchSlot];
			const options = brandsForSlot(searchSlot, searchQuery);
			return (
				<div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col">
					<div className="flex items-center gap-[12px] px-[18px] pt-[20px] pb-[14px] border-b border-foreground/10">
						<button type="button" onClick={() => { setSearchSlot(null); setSearchQuery(""); }} className="text-[13px] dark:text-slate-400 text-slate-500 flex items-center gap-[4px]">
							<ChevronRight size={14} className="rotate-180" /> Back
						</button>
						<div className="flex-1">
							<p className="text-[11px] dark:text-slate-400 text-slate-500 uppercase tracking-wide">{slotDef?.emoji} {slotDef?.label}</p>
						</div>
					</div>
					<div className="px-[18px] pt-[14px] pb-[10px]">
						<input
							type="text"
							autoFocus
							placeholder="Search by name or ticker..."
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className="w-full h-[42px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[14px] text-[14px] outline-none placeholder:text-slate-500"
						/>
					</div>
					<div className="flex-1 overflow-y-auto px-[18px] pb-[32px] space-y-[8px]">
						{options.map(b => {
							const logo = brandLogo(b.id);
							return (
								<button
									key={b.id}
									type="button"
									onClick={() => pickBrand(searchSlot, b.id)}
									className="w-full flex items-center gap-[12px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px] text-left active:opacity-80"
								>
									{logo ? (
										<img src={logo} alt={b.ticker} className="w-[36px] h-[36px] rounded-[8px] object-contain shrink-0 bg-white" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
									) : (
										<div className="w-[36px] h-[36px] rounded-[8px] bg-violet-500/20 flex items-center justify-center shrink-0">
											<span className="text-[11px] font-bold text-violet-400">{tickerInitials(b.ticker)}</span>
										</div>
									)}
									<div className="flex-1 min-w-0">
										<p className="text-[14px] font-bold">{b.ticker} — {b.name}</p>
										<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px] leading-relaxed">{b.description}</p>
									</div>
									<ChevronRight size={14} className="shrink-0 dark:text-slate-500 text-slate-400" />
								</button>
							);
						})}
						{options.length === 0 && (
							<p className="text-[13px] dark:text-slate-500 text-slate-400 text-center py-[24px]">No options match. Try clearing another slot first.</p>
						)}
					</div>
				</div>
			);
		}

		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<button type="button" onClick={() => setPhase("goal")} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
						<ChevronRight size={14} className="rotate-180" /> Goals
					</button>
					<h2 className="text-[20px] font-extrabold mb-[2px]">Build Your Watchlist</h2>
					<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[4px]">{goalLabel}</p>
					<p className="text-[12px] dark:text-slate-400 text-slate-500 mb-[8px]">{filledCount}/7 slots filled</p>
					<div className="h-[4px] rounded-full bg-foreground/10 mb-[12px]">
						<div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(filledCount / TOTAL_SLOTS) * 100}%` }} />
					</div>

					{/* Feedback bar */}
					{lastFeedback && (
						<div className="rounded-[10px] border border-amber-500/25 bg-amber-500/[0.07] px-[12px] py-[9px] mb-[14px]">
							<p className="text-[12px] text-amber-400 leading-relaxed">{lastFeedback}</p>
						</div>
					)}

					<div className="space-y-[8px] mb-[20px]">
						{goalSlotDefs.map((slotDef, i) => {
							const pickedId = slotPicks[i];
							const brand = pickedId ? WATCHLIST_BRANDS.find(b => b.id === pickedId) : null;
							return (
								<div key={i} style={{ minHeight: 60 }} className="flex items-center gap-[12px] rounded-[13px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px]">
									<span className="text-[20px] shrink-0">{slotDef.emoji}</span>
									<div className="flex-1 min-w-0">
										<p className="text-[10px] uppercase tracking-wide dark:text-slate-400 text-slate-500">{slotDef.label}</p>
										{brand ? (
											<p className="text-[14px] font-bold text-foreground">{brand.ticker} — {brand.name}</p>
										) : (
											<p className="text-[13px] dark:text-slate-500 text-slate-400">Not picked yet</p>
										)}
									</div>
									{brand ? (
										<div className="flex items-center gap-[6px]">
											<button type="button" onClick={() => { setSearchSlot(i); setSearchQuery(""); }} className="text-[11px] text-violet-400 font-medium px-[8px] py-[4px] rounded-full border border-violet-500/30 bg-violet-500/[0.06]">Change</button>
											<button type="button" onClick={() => clearPick(i)} className="text-[11px] text-rose-400 font-bold">✕</button>
										</div>
									) : (
										<button type="button" onClick={() => { setSearchSlot(i); setSearchQuery(""); }} className="shrink-0 text-[12px] font-semibold px-[10px] py-[5px] rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400">Pick</button>
									)}
								</div>
							);
						})}
					</div>

					{allFilled && (
						<button
							type="button"
							onClick={() => setPhase("diagnosis")}
							className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
							style={{ background: "linear-gradient(90deg,#8b5cf6,#6366f1)" }}
						>
							See Diagnosis →
						</button>
					)}
				</div>
			</div>
		);
	}

	// ── Phase 3: Diagnosis ────────────────────────────────────────────────────────
	const d = diagnosisData;
	if (!d) return null;

	const dimBars = [
		{ label: "Growth",          score: d.growthScore,      color: "bg-blue-500"    },
		{ label: "Stability",       score: d.stabilityScore,   color: "bg-emerald-500" },
		{ label: "Familiarity",     score: d.familiarityScore, color: "bg-violet-500"  },
		{ label: "Speculative Risk",score: d.speculativeRisk,  color: "bg-rose-500"    },
		{ label: "Income",          score: d.incomeScore,      color: "bg-amber-500"   },
	];

	const handleAddToStak = async () => {
		if (saving || saved) return;
		setSaving(true);
		const existing = new Set(account?.stakBrandIds ?? []);
		const toAdd = d.pickedBrands.filter(b => !existing.has(b.id));
		for (const b of toAdd) {
			await saveToStak(b.id, null);
		}
		setSaving(false);
		setSaved(true);
	};

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<button type="button" onClick={() => setPhase("building")} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> Edit Picks
				</button>

				{/* Personality */}
				<div className="rounded-[16px] border border-violet-500/25 bg-violet-500/[0.06] px-[18px] py-[16px] mb-[14px]">
					<p className="text-[32px] mb-[6px]">{d.personality.emoji}</p>
					<p className="text-[18px] font-extrabold mb-[4px]">{d.personality.type}</p>
					<p className="text-[13px] dark:text-slate-400 text-slate-500 leading-relaxed">{d.personality.tagline}</p>
				</div>

				{/* Dimension scores */}
				<div className="rounded-[14px] border border-foreground/10 bg-surface-1 px-[14px] py-[14px] mb-[14px]">
					<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[12px]">Portfolio Dimensions</p>
					<div className="space-y-[10px]">
						{dimBars.map(dim => (
							<div key={dim.label}>
								<div className="flex items-center justify-between mb-[4px]">
									<p className="text-[12px] font-semibold">{dim.label}</p>
									<p className="text-[11px] dark:text-slate-400 text-slate-500">{dim.score}/100</p>
								</div>
								<div className="h-[6px] rounded-full bg-foreground/10">
									<div className={`h-full rounded-full ${dim.color} transition-all duration-500`} style={{ width: `${dim.score}%` }} />
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Strengths */}
				{d.strengths.length > 0 && (
					<div className="rounded-[14px] border border-emerald-500/20 bg-emerald-500/[0.05] px-[14px] py-[12px] mb-[10px]">
						<p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400 mb-[8px]">Strengths</p>
						<div className="space-y-[6px]">
							{d.strengths.map((s, i) => (
								<div key={i} className="flex items-start gap-[6px]">
									<span className="text-emerald-400 text-[12px] mt-[1px] shrink-0">✓</span>
									<p className="text-[12px] dark:text-slate-300 text-slate-600 leading-relaxed">{s}</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Watchouts */}
				{d.watchouts.length > 0 && (
					<div className="rounded-[14px] border border-amber-500/20 bg-amber-500/[0.05] px-[14px] py-[12px] mb-[10px]">
						<p className="text-[11px] font-bold uppercase tracking-wide text-amber-400 mb-[8px]">Watch Out</p>
						<div className="space-y-[6px]">
							{d.watchouts.map((w, i) => (
								<div key={i} className="flex items-start gap-[6px]">
									<span className="text-amber-400 text-[12px] mt-[1px] shrink-0">⚠</span>
									<p className="text-[12px] dark:text-slate-300 text-slate-600 leading-relaxed">{w}</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Next best move */}
				<div className="rounded-[14px] border border-blue-500/20 bg-blue-500/[0.05] px-[14px] py-[12px] mb-[14px]">
					<p className="text-[11px] font-bold uppercase tracking-wide text-blue-400 mb-[4px]">Next Best Move</p>
					<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{d.nextMove}</p>
				</div>

				{/* Exposure themes */}
				{d.exposures.length > 0 && (
					<div className="mb-[14px]">
						<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[8px]">You're exposed to</p>
						<div className="flex flex-wrap gap-[6px]">
							{d.exposures.map(cat => (
								<span key={cat} className="text-[11px] font-medium px-[10px] py-[4px] rounded-full border border-foreground/10 bg-surface-1 dark:text-slate-300 text-slate-600">{cat}</span>
							))}
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="space-y-[8px] mt-[20px]">
					<button
						type="button"
						onClick={handleAddToStak}
						disabled={saving || saved}
						className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80 disabled:opacity-60"
						style={{ background: "linear-gradient(90deg,#8b5cf6,#6366f1)" }}
					>
						{saved ? "Added to STAK ✓" : saving ? "Saving…" : "Add These to My STAK"}
					</button>
					<button
						type="button"
						onClick={() => {
							setPhase("goal");
							setSelectedGoal(null);
							setSlotPicks({});
							setLastFeedback(null);
							setSaved(false);
							setSaving(false);
							setSearchSlot(null);
							setSearchQuery("");
						}}
						className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80"
					>
						Try a Different Strategy
					</button>
				</div>
			</div>
		</div>
	);
}

// ── Sandbox Portfolio ─────────────────────────────────────────

const SANDBOX_BUDGET = 10000;
const SANDBOX_MAX_POSITIONS = 10;

// Category display config for portfolio themes
const SANDBOX_CAT_CONFIG: Record<string, { label: string; color: string; bar: string }> = {
	tech:        { label: "Tech",       color: "text-blue-400",    bar: "bg-blue-500"    },
	gaming:      { label: "Gaming",     color: "text-violet-400",  bar: "bg-violet-500"  },
	streaming:   { label: "Streaming",  color: "text-pink-400",    bar: "bg-pink-500"    },
	finance:     { label: "Finance",    color: "text-emerald-400", bar: "bg-emerald-500" },
	food_drink:  { label: "Consumer",   color: "text-amber-400",   bar: "bg-amber-500"   },
	energy:      { label: "Energy",     color: "text-orange-400",  bar: "bg-orange-500"  },
	travel:      { label: "Travel",     color: "text-cyan-400",    bar: "bg-cyan-500"    },
	fitness:     { label: "Health",     color: "text-teal-400",    bar: "bg-teal-500"    },
	fashion:     { label: "Fashion",    color: "text-rose-400",    bar: "bg-rose-500"    },
	shopping:    { label: "Retail",     color: "text-indigo-400",  bar: "bg-indigo-500"  },
};

function SandboxView({ onBack }: { onBack: () => void }) {
	const { account, addToSandbox, sellFromSandbox, initSandboxCash, resetSandbox, markSandboxMilestone } = useAccount();
	const queryClient = useQueryClient();

	// Screen state: null = portfolio list, string = stock detail ticker
	const [activeStock, setActiveStock] = useState<string | null>(null);
	// Order sheet: "buy" | "sell" | null
	const [orderAction, setOrderAction] = useState<"buy" | "sell" | null>(null);
	// Search overlay
	const [showSearch, setShowSearch] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	// Order quantity
	const [orderQty, setOrderQty] = useState<number>(1);
	const [orderMode, setOrderMode] = useState<"shares" | "amount">("shares");
	const [orderAmount, setOrderAmount] = useState<number>(100); // dollar amount mode
	// Reset confirm
	const [confirmReset, setConfirmReset] = useState(false);

	const sandbox = account?.sandboxPortfolio ?? {};
	const tickers = Object.keys(sandbox);

	// Brand lookup map
	const brandMap = useMemo(() => new Map(allBrands.map(b => [b.ticker?.toUpperCase(), b])), []);

	// Initialise cash on first open
	useEffect(() => { initSandboxCash(); }, [initSandboxCash]);

	const sandboxCash = account?.sandboxCash ?? SANDBOX_BUDGET;

	// Queries for all held tickers
	const stockQueries = tickers.map(ticker => ({
		queryKey: ["stock", ticker],
		queryFn: () => getStockData(ticker),
		staleTime: 60 * 1000,
		retry: 1,
	}));
	const results = useQueries({ queries: stockQueries });

	const holdings = tickers.map((ticker, i) => {
		const entry = sandbox[ticker]!;
		const quote = (results[i] as { data?: { quote?: { price?: number; changePercent?: number } } })?.data?.quote;
		const currentPrice = quote?.price ?? null;
		const shares = entry.shares ?? 0; // 0 = malformed legacy entry, skips P&L calculation
		const costBasis = entry.priceAtAdd != null ? entry.priceAtAdd * shares : 0;
		const currentValue = currentPrice != null ? currentPrice * shares : costBasis;
		const pricePct = entry.priceAtAdd && currentPrice
			? ((currentPrice - entry.priceAtAdd) / entry.priceAtAdd) * 100 : null;
		const priceDollar = pricePct !== null ? costBasis * (pricePct / 100) : null;
		const brand = brandMap.get(ticker.toUpperCase());
		return { ticker, entry, currentPrice, currentValue, costBasis, shares, pricePct, priceDollar, changePercent: quote?.changePercent ?? null, brand };
	});

	// Portfolio totals
	const investedTotal = holdings.reduce((sum, h) => sum + h.costBasis, 0);
	const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
	const totalDollarPnl = totalValue - investedTotal;
	const totalPct = investedTotal > 0 ? (totalDollarPnl / investedTotal) * 100 : 0;

	// Total portfolio value for milestone detection
	const totalPortfolioValue = totalValue + sandboxCash;
	useEffect(() => {
		if (tickers.length === 0) return;
		const MILESTONES = [10500, 11000, 12000, 15000, 20000];
		const celebrated = account?.sandboxMilestones ?? [];
		const crossed = MILESTONES.find(m => totalPortfolioValue >= m && !celebrated.includes(m));
		if (!crossed) return;
		markSandboxMilestone(crossed).catch(() => {});
		import("sonner").then(({ toast }) => toast.custom(() => (
			<div className="flex items-center gap-[12px] rounded-[14px] border border-emerald-500/30 bg-emerald-500/[0.1] px-[14px] py-[12px] shadow-lg">
				<span className="text-[28px] shrink-0">🚀</span>
				<div>
					<p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400 mb-[1px]">Portfolio Milestone</p>
					<p className="text-[14px] font-extrabold text-foreground">Portfolio crossed ${crossed.toLocaleString()}!</p>
					<p className="text-[11px] dark:text-slate-400 text-slate-500 mt-[1px]">Your picks are paying off 📈</p>
				</div>
			</div>
		), { duration: 5000 }));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [totalPortfolioValue, account?.sandboxMilestones]);

	// Live price query for the active stock detail screen
	const { data: activeStockData } = useQuery({
		queryKey: ["stock", activeStock ?? ""],
		queryFn: () => getStockData(activeStock!),
		staleTime: 60 * 1000,
		retry: 1,
		enabled: activeStock !== null,
	});
	const activePrice = activeStockData?.quote?.price ?? null;
	const activeTodayPct = activeStockData?.quote?.changePercent ?? null;

	// Handle add (buy) — accepts ticker, shares, price directly
	const handleAdd = async (ticker: string, shares: number, price: number | null) => {
		await addToSandbox(ticker.toUpperCase(), price, shares, undefined);
	};

	// Close order sheet helper
	const closeOrder = () => {
		setOrderAction(null);
		setOrderQty(1);
		setOrderAmount(100);
		setOrderMode("shares");
	};

	// Confirm buy — uses effectiveShares which accounts for amount mode
	const confirmBuy = async () => {
		if (!activeStock || !activePrice) return;
		const qty = orderMode === "amount"
			? Math.round((orderAmount / activePrice) * 1000) / 1000
			: orderQty;
		const cost = activePrice * qty;
		if (cost > sandboxCash || qty <= 0) return;
		await handleAdd(activeStock, qty, activePrice);
		closeOrder();
	};

	// Confirm sell
	const confirmSellOrder = async () => {
		if (!activeStock) return;
		const holding = holdings.find(h => h.ticker === activeStock);
		if (!holding) return;
		const pricePerShare = holding.currentPrice ?? (holding.costBasis > 0 ? holding.costBasis / holding.shares : 0);
		const sellShares = orderQty;
		const totalShares = holding.shares;
		const sellValue = pricePerShare * sellShares;
		await sellFromSandbox(activeStock, sellValue, pricePerShare, sellShares);
		closeOrder();
		const remainingShares = Math.round((totalShares - sellShares) * 1000) / 1000;
		if (remainingShares <= 0) {
			setActiveStock(null);
		}
		const sellPnl = sellValue - (holding.entry.priceAtAdd ?? 0) * sellShares;
		const won = sellPnl >= 0;
		import("sonner").then(({ toast }) => toast.custom(() => (
			<div className={`flex items-center gap-[12px] rounded-[14px] border px-[14px] py-[12px] shadow-lg ${won ? "border-emerald-500/30 bg-emerald-500/[0.1]" : "border-rose-500/30 bg-rose-500/[0.1]"}`}>
				<span className="text-[28px] shrink-0">{won ? "💰" : "📉"}</span>
				<div>
					<p className={`text-[11px] font-bold uppercase tracking-wide mb-[1px] ${won ? "text-emerald-400" : "text-rose-400"}`}>{won ? "Profitable Trade" : "Loss Taken"}</p>
					<p className="text-[14px] font-extrabold text-foreground">Sold {holding.brand?.name ?? activeStock}</p>
					<p className={`text-[12px] font-semibold mt-[1px] ${won ? "text-emerald-400" : "text-rose-400"}`}>{won ? "+" : ""}${sellPnl.toFixed(2)}</p>
				</div>
			</div>
		), { duration: 4000 }));
	};

	// ── Render: Order Sheet ──────────────────────────────────────────────────────
	const renderOrderSheet = () => {
		if (!orderAction || !activeStock) return null;
		const holding = holdings.find(h => h.ticker === activeStock);
		const price = activePrice ?? holding?.currentPrice ?? null;
		const sharesOwned = holding?.shares ?? 0;
		const brand = brandMap.get(activeStock.toUpperCase());
		const name = brand?.name ?? activeStock;

		// In amount mode, derive shares from dollar amount
		const sharesFromAmount = (orderMode === "amount" && price != null && price > 0)
			? Math.round((orderAmount / price) * 1000) / 1000
			: null;
		const effectiveShares = orderMode === "amount" ? (sharesFromAmount ?? 0) : orderQty;
		const cost = price != null ? price * effectiveShares : null;

		const canAffordBuy = cost != null && cost <= sandboxCash;
		const buyError = cost != null && cost > sandboxCash
			? `Not enough buying power ($${(cost - sandboxCash).toFixed(2)} short)`
			: null;

		// Fractional sell allowed — can sell up to full position
		const canSell = orderAction === "sell" && effectiveShares > 0 && effectiveShares <= sharesOwned;
		const sellProceeds = price != null ? price * effectiveShares : null;

		const isValid = orderAction === "buy"
			? (cost != null && canAffordBuy && effectiveShares > 0)
			: canSell;

		// Max buy = buying power ÷ price (supports fractions)
		const maxBuyQty = price != null && price > 0 ? Math.floor((sandboxCash / price) * 1000) / 1000 : 0;
		const step = orderQty < 1 ? 0.01 : 1;

		return (
			<>
				<div className="fixed inset-0 z-40 bg-[#0d0d0d]/70" onClick={closeOrder} />
				<div className="fixed left-0 right-0 z-50 rounded-t-[24px] bg-background border border-foreground/10 px-[20px] pt-[20px] max-w-lg mx-auto shadow-2xl" style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
					<div className="w-[40px] h-[4px] rounded-full bg-foreground/15 mx-auto mb-[18px]" />
					<div className="flex items-center justify-between mb-[18px]">
						<h3 className="text-[18px] font-extrabold">
							{orderAction === "buy" ? "Buy" : "Sell"} {activeStock}
						</h3>
						<button type="button" onClick={closeOrder}
							className="w-[32px] h-[32px] rounded-full bg-foreground/[0.07] flex items-center justify-center text-[16px] dark:text-slate-400 text-slate-500 active:opacity-70">
							✕
						</button>
					</div>

					{/* Shares / Amount toggle (buy only) */}
					{orderAction === "buy" && (
						<div className="flex rounded-[10px] border border-foreground/10 p-[3px] mb-[20px]">
							{(["shares", "amount"] as const).map(m => (
								<button key={m} type="button" onClick={() => setOrderMode(m)}
									className={`flex-1 text-[13px] font-semibold py-[7px] rounded-[8px] transition-colors ${orderMode === m ? "bg-foreground text-background" : "dark:text-slate-400 text-slate-500"}`}>
									{m === "shares" ? "Shares" : "$ Amount"}
								</button>
							))}
						</div>
					)}

					{orderMode === "shares" || orderAction === "sell" ? (
						<>
							<div className="flex items-center justify-center gap-[16px] mb-[8px]">
								<button type="button"
									onClick={() => setOrderQty(q => Math.max(0.01, Math.round((q - step) * 1000) / 1000))}
									className="w-[44px] h-[44px] rounded-full border border-foreground/15 flex items-center justify-center text-[24px] font-bold dark:text-slate-400 text-slate-500 active:opacity-70 shrink-0">
									−
								</button>
								<input
									type="number"
									inputMode="decimal"
									min={0.01}
									step={0.01}
									value={orderQty}
									onChange={e => {
										const v = parseFloat(e.target.value);
										if (!isNaN(v) && v > 0) setOrderQty(Math.round(v * 1000) / 1000);
									}}
									className="w-[120px] text-center text-[40px] font-extrabold bg-transparent text-foreground outline-none border-b-2 border-foreground/20 pb-[2px]"
								/>
								<button type="button"
									onClick={() => {
										const max = orderAction === "buy" ? maxBuyQty : sharesOwned;
										setOrderQty(q => Math.min(Math.round((q + step) * 1000) / 1000, max));
									}}
									className="w-[44px] h-[44px] rounded-full border border-foreground/15 flex items-center justify-center text-[24px] font-bold dark:text-slate-400 text-slate-500 active:opacity-70 shrink-0">
									+
								</button>
							</div>
							<p className="text-[13px] dark:text-slate-400 text-slate-500 text-center mb-[16px]">shares</p>
						</>
					) : (
						<>
							<div className="flex items-center justify-center gap-[10px] mb-[8px]">
								<span className="text-[36px] font-extrabold dark:text-slate-400 text-slate-500">$</span>
								<input
									type="number"
									inputMode="decimal"
									min={0.01}
									step={1}
									value={orderAmount}
									onChange={e => {
										const v = parseFloat(e.target.value);
										if (!isNaN(v) && v > 0) setOrderAmount(Math.round(v * 100) / 100);
									}}
									className="w-[160px] text-center text-[40px] font-extrabold bg-transparent text-foreground outline-none border-b-2 border-foreground/20 pb-[2px]"
								/>
							</div>
							{/* Quick amount buttons */}
							<div className="flex justify-center gap-[8px] mb-[16px]">
								{[25, 50, 100, 500].map(amt => (
									<button key={amt} type="button" onClick={() => setOrderAmount(Math.min(amt, sandboxCash))}
										className={`text-[12px] font-bold px-[10px] py-[5px] rounded-full border transition-colors active:opacity-70 ${orderAmount === amt ? "bg-violet-500/15 border-violet-500/40 text-violet-400" : "border-foreground/15 dark:text-slate-400 text-slate-500"}`}>
										${amt}
									</button>
								))}
							</div>
							{price != null && sharesFromAmount != null && (
								<p className="text-[12px] dark:text-slate-400 text-slate-500 text-center mb-[4px]">
									≈ {sharesFromAmount} shares at ${price.toFixed(2)}
								</p>
							)}
						</>
					)}

					{/* Sell All shortcut */}
					{orderAction === "sell" && sharesOwned > 0 && (
						<button type="button" onClick={() => setOrderQty(sharesOwned)}
							className={`mx-auto block text-[12px] font-bold px-[14px] py-[6px] rounded-full border mb-[8px] active:opacity-70 transition-all ${orderQty === sharesOwned ? "border-rose-500/40 bg-rose-500/15 text-rose-400" : "border-foreground/15 dark:text-slate-400 text-slate-500"}`}>
							Sell All ({sharesOwned} shares)
						</button>
					)}
					<div className="rounded-[14px] border border-foreground/10 bg-surface-1 px-[16px] py-[14px] mb-[16px] text-center">
						{price != null ? (
							<>
								<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[4px]">
									{orderAction === "buy"
										? orderMode === "amount"
											? `$${orderAmount.toFixed(2)} ÷ $${price.toFixed(2)}/share`
											: `${effectiveShares} shares × $${price.toFixed(2)}`
										: `${effectiveShares} shares → proceeds`}
								</p>
								<p className="text-[28px] font-extrabold">
									${orderAction === "buy" ? (cost ?? 0).toFixed(2) : (sellProceeds ?? 0).toFixed(2)}
								</p>
							</>
						) : (
							<p className="text-[14px] dark:text-slate-400 text-slate-500">Loading price…</p>
						)}
					</div>
					{orderAction === "buy" && (
						<div className="flex items-center justify-between mb-[6px]">
							<p className="text-[12px] dark:text-slate-400 text-slate-500">Buying power</p>
							<p className={`text-[13px] font-semibold ${sandboxCash < 1 ? "text-rose-400" : "text-emerald-400"}`}>
								${sandboxCash.toFixed(2)}
							</p>
						</div>
					)}
					{orderAction === "sell" && (
						<div className="flex items-center justify-between mb-[6px]">
							<p className="text-[12px] dark:text-slate-400 text-slate-500">Shares you own</p>
							<p className="text-[13px] font-semibold">{sharesOwned} shares</p>
						</div>
					)}
					{buyError && (
						<p className="text-[12px] text-rose-400 text-center mb-[10px]">{buyError}</p>
					)}
					{orderAction === "sell" && orderQty > sharesOwned && (
						<p className="text-[12px] text-rose-400 text-center mb-[10px]">
							You only own {sharesOwned} shares
						</p>
					)}
					<button
						type="button"
						disabled={!isValid}
						onClick={orderAction === "buy" ? confirmBuy : confirmSellOrder}
						className={`w-full h-[52px] rounded-[14px] font-bold text-[16px] text-white transition-opacity active:opacity-80 mt-[8px] ${
							!isValid
								? "opacity-40 cursor-not-allowed bg-foreground/20"
								: orderAction === "sell"
									? "bg-rose-500/80 border border-rose-500/40"
									: ""
						}`}
						style={isValid && orderAction === "buy" ? { background: "linear-gradient(90deg,#7c3aed,#6366f1)" } : undefined}
					>
						{orderAction === "buy"
							? orderMode === "amount"
								? `Invest $${orderAmount.toFixed(2)} in ${name}`
								: `Buy ${effectiveShares} share${effectiveShares !== 1 ? "s" : ""} · $${cost?.toFixed(2) ?? "—"}`
							: `Sell ${effectiveShares} share${effectiveShares !== 1 ? "s" : ""} · $${sellProceeds?.toFixed(2) ?? "—"}`}
					</button>
				</div>
			</>
		);
	};

	// ── Render: Stock Detail ─────────────────────────────────────────────────────
	if (activeStock !== null) {
		const holding = holdings.find(h => h.ticker === activeStock);
		const brand = brandMap.get(activeStock.toUpperCase());
		const name = brand?.name ?? activeStock;
		const logoUrl = brand?.domain ? `https://logo.clearbit.com/${brand.domain}` : null;
		const inPortfolio = !!holding;

		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[120px]">
					<BackBtn onClick={() => { setActiveStock(null); setOrderAction(null); }} label="Portfolio" />
					<div className="flex items-center gap-[14px] mb-[24px]">
						<div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-white shadow-md overflow-hidden">
							{logoUrl ? (
								<img src={logoUrl} alt="" className="w-[38px] h-[38px] object-contain"
									onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
							) : (
								<span className="text-[14px] font-bold text-slate-600">{activeStock.slice(0, 2)}</span>
							)}
						</div>
						<div>
							<p className="text-[20px] font-extrabold leading-tight">{name}</p>
							<p className="text-[13px] dark:text-slate-400 text-slate-500">{activeStock}</p>
						</div>
					</div>
					<div className="mb-[24px]">
						{activePrice != null ? (
							<>
								<p className="text-[44px] font-extrabold leading-none mb-[6px]">
									${activePrice.toFixed(2)}
								</p>
								{activeTodayPct != null && (
									<p className={`text-[16px] font-semibold ${activeTodayPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
										{activeTodayPct >= 0 ? "+" : ""}{activeTodayPct.toFixed(2)}% today
									</p>
								)}
							</>
						) : (
							<p className="text-[20px] font-bold dark:text-slate-400 text-slate-500">Loading…</p>
						)}
					</div>
					{inPortfolio && holding ? (
						<div className="rounded-[16px] border border-foreground/10 bg-surface-1 px-[18px] py-[16px] mb-[20px]">
							<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[14px] font-semibold">Your Position</p>
							<div className="grid grid-cols-2 gap-[14px]">
								<div>
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mb-[2px]">Shares</p>
									<p className="text-[18px] font-extrabold">{holding.shares}</p>
								</div>
								<div>
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mb-[2px]">Avg Price</p>
									<p className="text-[18px] font-extrabold">
										{holding.entry.priceAtAdd != null ? `$${holding.entry.priceAtAdd.toFixed(2)}` : "—"}
									</p>
								</div>
								<div>
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mb-[2px]">Current Value</p>
									<p className="text-[18px] font-extrabold">${holding.currentValue.toFixed(2)}</p>
								</div>
								<div>
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mb-[2px]">Total P&amp;L</p>
									<p className={`text-[18px] font-extrabold ${(holding.priceDollar ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
										{(holding.priceDollar ?? 0) >= 0 ? "+" : ""}${(holding.priceDollar ?? 0).toFixed(2)}
									</p>
									{holding.pricePct != null && (
										<p className={`text-[12px] font-semibold ${holding.pricePct >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
											{holding.pricePct >= 0 ? "+" : ""}{holding.pricePct.toFixed(2)}%
										</p>
									)}
								</div>
							</div>
						</div>
					) : (
						<div className="rounded-[16px] border border-dashed border-foreground/20 px-[18px] py-[14px] mb-[20px] text-center">
							<p className="text-[13px] dark:text-slate-400 text-slate-500">Not in your portfolio</p>
						</div>
					)}
				</div>
				<div className="fixed left-0 right-0 z-30 max-w-lg mx-auto px-[18px] pt-[12px] bg-background/95 backdrop-blur-sm border-t border-foreground/[0.06]" style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))", paddingBottom: "12px" }}>
					<div className={`grid gap-[10px] ${inPortfolio ? "grid-cols-2" : "grid-cols-1"}`}>
						<button
							type="button"
							disabled={tickers.length >= SANDBOX_MAX_POSITIONS && !inPortfolio}
							onClick={() => { setOrderQty(1); setOrderAction("buy"); }}
							className="h-[52px] rounded-[14px] font-bold text-[16px] text-white active:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
							style={{ background: "linear-gradient(90deg,#7c3aed,#6366f1)" }}
						>
							Buy
						</button>
						{inPortfolio && (
							<button
								type="button"
								onClick={() => { setOrderQty(1); setOrderAction("sell"); }}
								className="h-[52px] rounded-[14px] font-bold text-[16px] border border-rose-500/30 bg-rose-500/[0.07] text-rose-400 active:opacity-80 transition-opacity"
							>
								Sell
							</button>
						)}
					</div>
				</div>
				{renderOrderSheet()}
			</div>
		);
	}

	// ── Render: Portfolio List ───────────────────────────────────────────────────

	// Search overlay brand results
	const searchResults = searchQuery.trim()
		? allBrands
			.filter(b => b.ticker && (
				b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				b.ticker.toLowerCase().includes(searchQuery.toLowerCase())
			))
			.slice(0, 40)
		: allBrands.filter(b => !!b.ticker).slice(0, 40);

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[120px]">
				<BackBtn onClick={onBack} />
				<div className="mb-[6px]">
					<h2 className="text-[24px] font-extrabold">Sandbox</h2>
					<p className="text-[13px] dark:text-slate-400 text-slate-500">Practice mode</p>
				</div>
				{/* Overview card */}
				<div className="rounded-[16px] border border-violet-500/25 bg-violet-500/[0.06] px-[18px] pt-[18px] pb-[16px] mb-[20px] mt-[16px]">
					<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[4px] font-medium">Invested Value</p>
					<p className="text-[38px] font-extrabold leading-none mb-[4px]">
						${tickers.length > 0 ? totalValue.toFixed(2) : "0.00"}
					</p>
					{investedTotal > 0 && (
						<div className="flex items-center gap-[10px] mb-[14px]">
							<span className={`text-[16px] font-extrabold ${totalPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
								{totalPct >= 0 ? "+" : ""}{totalPct.toFixed(2)}%
							</span>
							<span className={`text-[13px] font-semibold ${totalDollarPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
								({totalDollarPnl >= 0 ? "+" : ""}${totalDollarPnl.toFixed(2)})
							</span>
						</div>
					)}
					{investedTotal === 0 && <div className="mb-[14px]" />}
					<div className="grid grid-cols-2 gap-[10px]">
						<div className="rounded-[12px] bg-foreground/[0.04] px-[12px] py-[10px]">
							<p className="text-[10px] dark:text-slate-500 text-slate-400 mb-[3px]">Buying Power</p>
							<p className={`text-[18px] font-extrabold ${sandboxCash < 1 ? "text-rose-400" : "text-emerald-400"}`}>
								${sandboxCash.toFixed(2)}
							</p>
						</div>
						<div className="rounded-[12px] bg-foreground/[0.04] px-[12px] py-[10px]">
							<p className="text-[10px] dark:text-slate-500 text-slate-400 mb-[3px]">Cost Basis</p>
							<p className="text-[18px] font-extrabold">${investedTotal.toFixed(2)}</p>
						</div>
					</div>
				</div>
				{/* Holdings list */}
				{tickers.length > 0 ? (
					<div className="space-y-[8px] mb-[24px]">
						{holdings.map(h => {
							const logoUrl = h.brand?.domain ? `https://logo.clearbit.com/${h.brand.domain}` : null;
							return (
								<button
									key={h.ticker}
									type="button"
									onClick={() => setActiveStock(h.ticker)}
									className="w-full flex items-center gap-[12px] rounded-[16px] border border-foreground/10 bg-surface-1 px-[14px] py-[13px] text-left active:opacity-80 transition-opacity"
								>
									<div className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full bg-white shadow-sm overflow-hidden">
										{logoUrl ? (
											<img src={logoUrl} alt="" className="w-[28px] h-[28px] object-contain"
												onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
										) : (
											<span className="text-[11px] font-bold text-slate-600">{h.ticker.slice(0, 2)}</span>
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-[14px] font-bold leading-tight truncate">{h.brand?.name ?? h.ticker}</p>
										<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px]">
											{h.ticker} · {h.shares} sh
										</p>
									</div>
									<div className="text-right shrink-0">
										<p className="text-[14px] font-extrabold">${h.currentValue.toFixed(2)}</p>
										<div className="flex flex-col items-end gap-[1px] mt-[2px]">
											{h.pricePct != null && (
												<p className={`text-[12px] font-semibold ${h.pricePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
													{h.pricePct >= 0 ? "+" : ""}{h.pricePct.toFixed(2)}%
												</p>
											)}
											{h.changePercent != null && (
												<p className={`text-[11px] ${h.changePercent >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
													{h.changePercent >= 0 ? "+" : ""}{h.changePercent.toFixed(2)}% today
												</p>
											)}
										</div>
									</div>
									<ChevronRight size={16} className="shrink-0 dark:text-slate-600 text-slate-300" />
								</button>
							);
						})}
					</div>
				) : (
					<div className="rounded-[18px] border border-dashed border-foreground/20 p-[36px] text-center mb-[20px]">
						<div className="text-[48px] mb-[14px]">📈</div>
						<p className="text-[16px] font-extrabold mb-[6px]">Start trading</p>
						<p className="text-[13px] dark:text-slate-400 text-slate-500 leading-relaxed max-w-[240px] mx-auto mb-[10px]">
							Search for a stock to get started with your $10,000 practice cash.
						</p>
						<p className="text-[12px] text-violet-400 font-semibold">Real prices · real shares · no risk</p>
					</div>
				)}
				{/* Reset */}
				{(tickers.length > 0 || sandboxCash !== SANDBOX_BUDGET) && (
					<div className="mt-[8px] pt-[16px] border-t border-foreground/[0.06]">
						{!confirmReset ? (
							<button type="button" onClick={() => setConfirmReset(true)}
								className="w-full text-[12px] dark:text-slate-500 text-slate-400 text-center active:opacity-70 py-[4px]">
								Reset portfolio to $10,000
							</button>
						) : (
							<div className="rounded-[12px] border border-rose-500/20 bg-rose-500/[0.06] px-[14px] py-[12px]">
								<p className="text-[12px] font-bold mb-[4px]">Reset to $10,000?</p>
								<p className="text-[11px] dark:text-slate-400 text-slate-500 mb-[10px]">All positions will be cleared. Cannot be undone.</p>
								<div className="flex gap-[8px]">
									<button type="button" onClick={() => setConfirmReset(false)}
										className="flex-1 text-[12px] font-semibold border border-foreground/10 rounded-[8px] py-[7px] dark:text-slate-400 text-slate-500 active:opacity-70">
										Cancel
									</button>
									<button type="button" onClick={() => { resetSandbox(); setConfirmReset(false); }}
										className="flex-1 text-[12px] font-semibold bg-rose-500/15 border border-rose-500/25 text-rose-400 rounded-[8px] py-[7px] active:opacity-70">
										Reset
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
			{/* Floating "+" button */}
			<button
				type="button"
				onClick={() => { setSearchQuery(""); setOrderAction(null); setOrderQty(1); setOrderAmount(100); setOrderMode("shares"); setShowSearch(true); }}
				className="fixed right-[20px] z-30 w-[56px] h-[56px] rounded-full shadow-xl flex items-center justify-center text-[28px] font-bold text-white active:scale-95 transition-transform"
				style={{ bottom: "calc(4rem + env(safe-area-inset-bottom) + 16px)", background: "linear-gradient(135deg,#7c3aed,#6366f1)" }}
			>
				+
			</button>
			{/* Search overlay */}
			{showSearch && (
				<div className="fixed inset-0 z-50 bg-background flex flex-col">
					<div className="px-[18px] pt-[56px] pb-[12px] border-b border-foreground/[0.06]">
						<div className="flex items-center gap-[12px]">
							<div className="flex-1 flex items-center gap-[10px] rounded-[12px] border border-foreground/15 bg-foreground/[0.04] px-[14px] py-[10px]">
								<Star size={15} className="dark:text-slate-500 text-slate-400 shrink-0" />
								<input
									type="text"
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									placeholder="Search stocks…"
									autoFocus
									className="flex-1 bg-transparent text-[15px] text-foreground placeholder:dark:text-slate-500 placeholder:text-slate-400 outline-none"
								/>
								{searchQuery && (
									<button type="button" onClick={() => setSearchQuery("")}
										className="text-[14px] dark:text-slate-500 text-slate-400 shrink-0">✕</button>
								)}
							</div>
							<button type="button" onClick={() => setShowSearch(false)}
								className="text-[14px] font-semibold dark:text-slate-400 text-slate-500 shrink-0 active:opacity-70">
								Cancel
							</button>
						</div>
					</div>
					<div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-[18px] py-[8px]">
						{searchResults.length === 0 ? (
							<p className="text-[14px] dark:text-slate-400 text-slate-500 text-center py-[40px]">No matches found</p>
						) : (
							searchResults.map(b => {
								const liveQuote = queryClient.getQueryData<{ quote?: { price?: number; changePercent?: number } }>(["stock", b.ticker?.toUpperCase()])?.quote;
								const livePrice = liveQuote?.price ?? null;
								const changePct = liveQuote?.changePercent ?? null;
								const logoSrc = b.logo ?? (b.domain ? `https://logo.clearbit.com/${b.domain}` : null);
								return (
									<button
										key={b.id}
										type="button"
										onClick={() => {
											setShowSearch(false);
											setSearchQuery("");
											setActiveStock(b.ticker!.toUpperCase());
										}}
										className="w-full flex items-center gap-[13px] py-[13px] border-b border-foreground/[0.05] last:border-b-0 text-left active:bg-foreground/[0.04] transition-colors"
									>
										<div className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full bg-white shadow-sm overflow-hidden">
											{logoSrc ? (
												<img src={logoSrc} alt={b.name}
													className="w-[28px] h-[28px] object-contain"
													onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
											) : (
												<span className="text-[11px] font-bold text-slate-600">{b.ticker?.slice(0, 2)}</span>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-[14px] font-semibold truncate">{b.name}</p>
											<p className="text-[12px] dark:text-slate-400 text-slate-500">{b.ticker}</p>
										</div>
										<div className="text-right shrink-0">
											{livePrice != null ? (
												<>
													<p className="text-[14px] font-bold">${livePrice.toFixed(2)}</p>
													{changePct != null && (
														<p className={`text-[12px] font-semibold ${changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
															{changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
														</p>
													)}
												</>
											) : (
												<p className="text-[12px] dark:text-slate-500 text-slate-400">View</p>
											)}
										</div>
									</button>
								);
							})
						)}
					</div>
				</div>
			)}
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