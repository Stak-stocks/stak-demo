import { createFileRoute } from "@tanstack/react-router";
import {
	BookOpen, Zap, Swords, FlaskConical, ShieldAlert,
	Brain, TrendingUp, Wallet, ChevronRight, Star, Lock,
	DollarSign, BarChart2, LineChart,
} from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import {
	LESSON_CATEGORIES, getDailyPack, getTodayKey,
	PRACTICE_TICKERS, WATCHLIST_SLOTS, WATCHLIST_BRANDS,
	xpToTier, TIER_THRESHOLDS, SHARED_TIER_XP, SANDBOX_BUDGETS, ACTIVITY_XP_CAP,
	type TierNumber, type WatchlistSlotType, type DailyActivity,
	type Lesson, type LessonCategory,
	type BattleMatchup, type EarningsScenario, type RiskScenario, type MoodScenario,
} from "@/data/playgroundData";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { getStockData, getDailyBrief, trackEvent, generatePlaygroundQuestions, getStockChart, getFeaturedLesson, type ChartRange } from "@/lib/api";
// getTodayKey here is aliased -- @/data/playgroundData also exports a (different,
// no-9am-offset) getTodayKey already imported above for daily-content resets; this
// one is specifically the 9am-local-reset version used for streak display.
import { marketSessionBucket, getLocalDateKey, getTodayKey as getStreakTodayKey, getYesterdayKey, getEasternDateKey, roundShares } from "@/lib/utils";
import { parseFinancialValue } from "@/lib/financial";
import { getMarketDayKey } from "@stak/shared";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, ReferenceLine } from "recharts";
import { useDailyContent } from "@/hooks/useDailyContent";
import { useBrandsList } from "@/hooks/useBrandsList";
import { BrandLogo } from "@/components/BrandLogo";
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

// ── Generating skeleton ───────────────────────────────────────────────────────

function GeneratingSkeleton({ label }: { label: string }) {
	return (
		<div className="space-y-[10px] py-[4px]">
			<p className="text-[13px] dark:text-slate-400 text-slate-500 text-center mb-[12px]">Generating your {label}…</p>
			{[78, 60, 72].map((w, i) => (
				<div key={i} className="rounded-[13px] border border-foreground/10 bg-surface-1 p-[14px] animate-pulse">
					<div className="h-[13px] rounded-full bg-foreground/10 mb-[8px]" style={{ width: `${w}%` }} />
					<div className="h-[10px] rounded-full bg-foreground/8" style={{ width: `${w - 18}%` }} />
				</div>
			))}
		</div>
	);
}

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
	const opt = optId.toLowerCase();
	const correct = correctId.toLowerCase();
	const sel = selected?.toLowerCase() ?? null;
	if (!revealed) return sel === opt ? "selected" : "idle";
	if (opt === correct) return sel === opt ? "correct" : "correct-other";
	if (opt === sel) return "wrong";
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
	| "featured-today"
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

function PlaygroundPage() {
	const { account, accountLoading, completeDailyActivity, completeEarningsScenario, completeBattle, completeRiskScenario, completeMoodScenario, markPlaygroundOnboarded } = useAccount();
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
	// Onboarding flag lives in Firestore — shows correctly on every device / new account
	const [showOnboarding, setShowOnboarding] = useState(false);
	useEffect(() => {
		if (account !== null && !accountLoading) {
			setShowOnboarding(!account?.playgroundOnboarded);
		}
	}, [account?.playgroundOnboarded, accountLoading]);

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

	const todayKey = getTodayKey();

	// Weekly Pack — computed after totalXp is available (see line ~310)
	// Use daily key for completion tracking so each day brings fresh scenarios
	const dayKey = todayKey;

	// Daily Brief data (for mood context in the home view)
	const { data: briefData } = useQuery({
		queryKey: ["daily-brief", getEasternDateKey(), marketSessionBucket()],
		queryFn: getDailyBrief,
		staleTime: 30 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
		retry: 0,
	});

	const totalXp = account?.totalXp ?? 0;
	const completedLessons = Object.values(account?.lessonProgress ?? {}).filter(p => p.completed).length;

	// All-time completed IDs — used for section card done counts
	const allTimeCompletedIds = useMemo(() => {
		const ids = new Set<string>(account?.allTimeCompletedActivityIds ?? []);
		for (const [id, p] of Object.entries(account?.lessonProgress ?? {})) if (p.completed) ids.add(id);
		for (const [id, p] of Object.entries(account?.earningsProgress ?? {})) if (p.completed) ids.add(id);
		for (const [id, p] of Object.entries(account?.battlesProgress ?? {})) if (p.completed) ids.add(id);
		for (const [id, p] of Object.entries(account?.riskProgress ?? {})) if (p.completed) ids.add(id);
		for (const [id, p] of Object.entries(account?.moodProgress ?? {})) if (p.completed) ids.add(id);
		return ids;
	}, [account?.allTimeCompletedActivityIds, account?.lessonProgress, account?.earningsProgress, account?.battlesProgress, account?.riskProgress, account?.moodProgress]);

	// Shell pack — just tier/dayKey; Gemini fills content via useDailyContent
	const shellPack = useMemo(() => getDailyPack(totalXp, dayKey), [totalXp, dayKey]);
	const { pack: dailyPack, mergedBattles, mergedEarnings, mergedRisk, mergedMood, mergedLessons, isGenerating } = useDailyContent(shellPack, account?.uid ?? "", dayKey);
	const totalLessons = mergedLessons.length;
	const dailyCompleted = useMemo(() => {
		const wp = account?.dailyProgress;
		const fromFirestore = wp?.dayKey === dayKey ? new Set(wp.completedIds ?? []) : new Set<string>();
		// Merge with localCompleted so checkmarks appear instantly before Firestore propagates
		return new Set([...fromFirestore, ...localCompleted]);
	}, [account?.dailyProgress, dayKey, localCompleted]);

	// Wrapper that also updates local state immediately for instant UI feedback
	const markActivityComplete = useCallback((wk: string, id: string, xp: number, type?: string) => {
		setLocalCompleted(prev => new Set([...prev, id]));
		completeDailyActivity(wk, id, xp, type).catch(() => {});
		// Fire streak update — any playground completion counts toward daily streak
		trackEvent("playground_activity", { activityId: id }).catch(() => {});
	}, [completeDailyActivity]);
	// Standalone market lesson — Gemini Search finds the biggest event of the past 2 days
	const { data: featuredLessonData } = useQuery({
		queryKey: ["market-lesson", getMarketDayKey()],
		queryFn: getFeaturedLesson,
		staleTime: 12 * 60 * 60 * 1000,
		gcTime: 13 * 60 * 60 * 1000,
		retry: 0,
	});
	const featuredTodayMeta = useMemo(() => {
		const ml = featuredLessonData?.lesson;
		if (!ml) return null;
		return { eventType: ml.eventType, angle: ml.angle ?? ml.title };
	}, [featuredLessonData?.lesson]);

	const featuredTodayLesson = useMemo(() => {
		const ml = featuredLessonData?.lesson;
		if (!ml) return null;
		return {
			// Keyed by the CT-anchored market day (matching how the content itself is
			// fetched, see the featuredLessonData query above), not the local-time
			// `dayKey` -- lessonProgress is a permanent, id-keyed map with no
			// day-reset logic, so a local-time id would drift out of sync with the
			// content for any viewer outside Central time. West of CT, the content
			// refreshes before local 9am while the id wouldn't, colliding with
			// yesterday's completed id and showing a brand-new lesson as already
			// done. East of CT, the id would flip before the content does, making an
			// already-completed lesson look incomplete again and double-award XP.
			id: `featured-today-${getMarketDayKey()}`,
			title: ml.title,
			subtitle: ml.subtitle,
			category: "Market Basics" as LessonCategory,
			durationMin: 3,
			xp: 25,
			emoji: ml.emoji,
			cards: ml.cards,
			quiz: ml.quiz,
		};
	}, [featuredLessonData?.lesson]);

	// Onboarding gate
	if (showOnboarding) {
		return (
			<PlaygroundOnboarding
				onDone={(startView) => {
					markPlaygroundOnboarded();
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
				lessonsPool={mergedLessons}
				dailyCompleted={dailyCompleted}
				isGenerating={isGenerating}
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
				onDailyComplete={markActivityComplete}
				lessonsPool={mergedLessons}
				onBack={() => { setActiveView("lessons"); savePlaygroundState("lessons", null); scrollEl()?.scrollTo({ top: 0, behavior: "instant" }); }}
				onComplete={() => { setActiveView("lessons"); savePlaygroundState("lessons", null); scrollEl()?.scrollTo({ top: 0, behavior: "instant" }); }}
			/>
		);
	}
	if (activeView === "featured-today" && featuredTodayLesson) {
		return (
			<LessonPlayer
				lessonId={featuredTodayLesson.id}
				account={account}
				completedLessons={completedLessons}
				totalLessons={totalLessons}
				lessonsPool={[featuredTodayLesson]}
				onBack={goHome}
				onComplete={goHome}
			/>
		);
	}
	if (activeView === "battles") {
		return <BattlesView onBack={goHome} dayKey={dayKey} dailyCompleted={dailyCompleted} onDailyComplete={markActivityComplete}
			dailyBattleIds={dailyPack.activities.filter(a => a.type === "battle").map(a => a.id)}
			dayLabel={dailyPack.label} battlesPool={mergedBattles}
			onBattleWon={completeBattle} isGenerating={isGenerating} />;
	}
	if (activeView === "earnings-lab") {
		return <EarningsLabView onBack={goHome} dayKey={dayKey} dailyCompleted={dailyCompleted} onDailyComplete={markActivityComplete}
			dailyEarningsIds={dailyPack.activities.filter(a => a.type === "earnings").map(a => a.id)}
			dayLabel={dailyPack.label} earningsPool={mergedEarnings}
			onEarningsScenarioCorrect={completeEarningsScenario} isGenerating={isGenerating} />;
	}
	if (activeView === "risk-lab") {
		return <RiskLabView onBack={goHome}
			dailyRiskIds={dailyPack.activities.filter(a => a.type === "risk").map(a => a.id)}
			dayLabel={dailyPack.label} dayKey={dayKey} dailyCompleted={dailyCompleted} onDailyComplete={markActivityComplete}
			riskPool={mergedRisk} onRiskCorrect={completeRiskScenario} isGenerating={isGenerating} />;
	}
	if (activeView === "mood-simulator") {
		return <MoodSimulatorView onBack={goHome} dayKey={dayKey} dailyCompleted={dailyCompleted} onDailyComplete={markActivityComplete}
			dailyMoodIds={dailyPack.activities.filter(a => a.type === "mood").map(a => a.id)}
			dayLabel={dailyPack.label} moodPool={mergedMood} onMoodCorrect={completeMoodScenario} isGenerating={isGenerating} />;
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
	const LEVEL_STYLES: Record<TierNumber, { color: string; bg: string; bar: string }> = {
		1: { color: "text-slate-400",  bg: "bg-slate-400/15",  bar: "from-slate-400 to-slate-500"   },
		2: { color: "text-blue-400",   bg: "bg-blue-400/15",   bar: "from-blue-400 to-blue-500"     },
		3: { color: "text-cyan-400",   bg: "bg-cyan-400/15",   bar: "from-cyan-400 to-blue-400"     },
		4: { color: "text-violet-400", bg: "bg-violet-400/15", bar: "from-violet-400 to-purple-500" },
		5: { color: "text-amber-400",  bg: "bg-amber-400/15",  bar: "from-amber-400 to-orange-500"  },
	};
	const LEVELS = ([1, 2, 3, 4, 5] as const).map(t => ({
		min: TIER_THRESHOLDS[t],
		max: t < 5 ? TIER_THRESHOLDS[(t + 1) as TierNumber] - 1 : 99999,
		name: SHARED_TIER_XP[t].label,
		...LEVEL_STYLES[t],
	}));
	const currentLevel = [...LEVELS].reverse().find(l => totalXp >= l.min) ?? LEVELS[0]!;
	const nextLevel = LEVELS.find(l => l.min > totalXp);
	const levelPct = nextLevel
		? Math.round(((totalXp - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
		: 100;

	// Backend now stores the user's own local-day key (getTodayKey, sent as todayKey
	// on each swipe/event) -- compare against the same local-day keys, not UTC.
	const todayKey2 = getStreakTodayKey();
	const yesterdayKey2 = getYesterdayKey();
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

				{/* Market Moment (trading days) / Featured Today (weekends & holidays) — Gemini powered */}
				{featuredTodayLesson && (() => {
					// isMarketDay: this lesson is about a specific real market event (vs a general
					// concept lesson) — drives styling. isTradingDay: today is an actual trading
					// day — separate signal, because isMarketDay is also false on an ordinary
					// weekday when nothing significant was found and we fell back to teaching a
					// concept instead; using isMarketDay alone for the "Weekend Prep" copy used to
					// show that on any plain Tuesday with no major news.
					const isMarketDay = featuredLessonData?.isMarketDay !== false;
					const isTradingDay = featuredLessonData?.isTradingDay !== false;
					const accent = isMarketDay ? "violet" : "amber";
					const borderCls = isMarketDay ? "border-violet-500/30" : "border-amber-500/30";
					const bgCls = isMarketDay ? "bg-violet-500/[0.07]" : "bg-amber-500/[0.07]";
					const textCls = isMarketDay ? "text-violet-400" : "text-amber-400";
					const iconBgCls = isMarketDay ? "bg-violet-500/15 text-violet-400" : "bg-amber-500/15 text-amber-400";
					// Compare the viewer's own local calendar date (not a fixed timezone) against
					// the CT-anchored day this lesson was generated for. Using the viewer's own
					// date — rather than a fixed "before 9am CT" check — means someone on, say,
					// Pacific time doesn't see "Yesterday's" two hours before their own midnight
					// just because Chicago's calendar already flipped.
					const isStaleWindow = isMarketDay && getLocalDateKey() !== getMarketDayKey();
					const label = isMarketDay
						? (isStaleWindow ? "Market Moment · Yesterday's Big Release" : "Market Moment · Today's Big Release")
						: isTradingDay ? "Featured Today · Quick Concept" : "Featured Today · Weekend Prep";
					const meta = account?.lessonProgress?.[featuredTodayLesson.id]?.completed
						? "Completed ✓"
						: isMarketDay
							? (isStaleWindow ? "3 min · +25 XP · Major event yesterday" : "3 min · +25 XP · Major event today")
							: isTradingDay ? "3 min · +25 XP · Today's quick concept" : "3 min · +25 XP · Prep for the week ahead";
					return (
						<div className="mb-[20px]">
							<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">{label}</p>
							<button
								type="button"
								onClick={() => { homeScrollY.current = scrollEl()?.scrollTop ?? 0; setActiveView("featured-today"); scrollEl()?.scrollTo({ top: 0, behavior: "instant" }); }}
								className={`w-full rounded-[14px] border ${borderCls} ${bgCls} px-[16px] py-[14px] text-left active:opacity-80 transition-opacity`}
							>
								<div className="flex items-center gap-[12px]">
									<span className="text-[30px]">{featuredTodayLesson.emoji}</span>
									<div className="flex-1 min-w-0">
										<p className="text-[14px] font-bold text-foreground">{featuredTodayLesson.title}</p>
										<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px]">{featuredTodayLesson.subtitle}</p>
										<p className={`text-[11px] ${textCls} mt-[3px]`}>{meta}</p>
									</div>
									<div className={`shrink-0 grid h-[34px] w-[34px] place-items-center rounded-full ${iconBgCls}`}>
										<ChevronRight size={16} />
									</div>
								</div>
							</button>
						</div>
					);
				})()}

				{/* Weekly Pack */}
				{/* All Sections — 2-column grid */}
				<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Explore</p>
				<div className="grid grid-cols-2 gap-[10px] mb-[10px]">
					{[
						{
							colorKey: "lessons", icon: <BookOpen size={20} />, title: "Lessons",
							subtitle: `${dailyPack.activities.filter(a => a.type === "lesson").length} today`, view: "lessons" as const,
							done: dailyPack.activities.filter(a => a.type === "lesson" && (dailyCompleted?.has(a.id) || allTimeCompletedIds.has(a.id))).length,
							total: dailyPack.activities.filter(a => a.type === "lesson").length,
							loading: isGenerating && dailyPack.activities.filter(a => a.type === "lesson").length === 0,
						},
						{
							colorKey: "battles", icon: <Swords size={20} />, title: "Stock Battles",
							subtitle: `${dailyPack.activities.filter(a => a.type === "battle").length} today`, view: "battles" as const,
							done: dailyCompleted ? dailyPack.activities.filter(a => a.type === "battle" && dailyCompleted.has(a.id)).length : 0,
							total: dailyPack.activities.filter(a => a.type === "battle").length,
							loading: isGenerating && dailyPack.activities.filter(a => a.type === "battle").length === 0,
						},
						{
							colorKey: "earnings", icon: <FlaskConical size={20} />, title: "Earnings Lab",
							subtitle: `${dailyPack.activities.filter(a => a.type === "earnings").length} today`, view: "earnings-lab" as const,
							done: dailyCompleted ? dailyPack.activities.filter(a => a.type === "earnings" && dailyCompleted.has(a.id)).length : 0,
							total: dailyPack.activities.filter(a => a.type === "earnings").length,
							loading: isGenerating && dailyPack.activities.filter(a => a.type === "earnings").length === 0,
						},
						{
							colorKey: "risk", icon: <ShieldAlert size={20} />, title: "Risk Lab",
							subtitle: `${dailyPack.activities.filter(a => a.type === "risk").length} today`, view: "risk-lab" as const,
							done: dailyCompleted ? dailyPack.activities.filter(a => a.type === "risk" && dailyCompleted.has(a.id)).length : 0,
							total: dailyPack.activities.filter(a => a.type === "risk").length,
							loading: isGenerating && dailyPack.activities.filter(a => a.type === "risk").length === 0,
						},
						{
							colorKey: "mood", icon: <Brain size={20} />, title: "Market Mood",
							subtitle: `${dailyPack.activities.filter(a => a.type === "mood").length} today`, view: "mood-simulator" as const,
							done: dailyCompleted ? dailyPack.activities.filter(a => a.type === "mood" && dailyCompleted.has(a.id)).length : 0,
							total: dailyPack.activities.filter(a => a.type === "mood").length,
							loading: isGenerating && dailyPack.activities.filter(a => a.type === "mood").length === 0,
						},
						{
							colorKey: "practice", icon: <TrendingUp size={20} />, title: "Skill Drills",
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
								{allDone && <div className="absolute inset-0 bg-emerald-500/[0.06] pointer-events-none" />}
								<div className="flex items-start justify-between mb-[10px]">
									<div className={`grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-background/60 ${c.icon}`}>
										{s.icon}
									</div>
									{allDone && <span className="text-[10px] font-bold text-emerald-400">✓</span>}
								</div>
								<p className="text-[13px] font-bold text-foreground leading-none mb-[4px]">{s.title}</p>
								{s.loading ? (
									<>
										<div className="h-[10px] w-[70%] rounded-full bg-foreground/10 animate-pulse mb-[8px]" />
										<div className="h-[3px] rounded-full bg-foreground/10 overflow-hidden">
											<div className={`h-full w-full rounded-full animate-pulse ${c.icon.replace("text-", "bg-").split(" ")[0]} opacity-40`} />
										</div>
									</>
								) : (
									<>
										<p className="text-[11px] dark:text-slate-400 text-slate-500 mb-[8px]">{s.subtitle}</p>
										{pct !== null && (
											<div className="h-[3px] rounded-full bg-foreground/10">
												<div className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-400" : c.icon.replace("text-", "bg-").split(" ")[0]}`} style={{ width: `${pct}%` }} />
											</div>
										)}
									</>
								)}
							</button>
						);
					})}
				</div>
				<div className="space-y-[10px]">
					<SectionCard colorKey="lessons" icon={<Star size={22} />} title="Build Your Watchlist" subtitle="Pick 7 stocks for a balanced portfolio" onClick={() => goToView("watchlist")} />
					<SectionCard colorKey="sandbox" icon={<Wallet size={22} />} title="Sandbox Portfolio" subtitle={`$${sandboxBudgetForXp(totalXp).toLocaleString()} budget · real prices, real shares`} onClick={() => goToView("sandbox")} />
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
	isGenerating,
}: {
	account: ReturnType<typeof useAccount>["account"];
	selectedCategory: LessonCategory | null;
	onSelectCategory: (c: LessonCategory | null) => void;
	onSelectLesson: (id: string) => void;
	onBack: () => void;
	dailyLessonIds: string[];
	dayLabel: string;
	lessonsPool?: Lesson[];
	dailyCompleted?: Set<string>;
	isGenerating?: boolean;
}) {
	const pool = lessonsPool ?? [];
	// todayDoneIds: what's been completed in TODAY's session (daily key) — used for checkmarks in today's list
	const todayDoneIds = dailyCompleted ?? new Set<string>();
	// allTimeDoneIds: all-time lesson completions — used only for the past-lessons archive
	const allTimeDoneIds = new Set(
		Object.entries(account?.lessonProgress ?? {}).filter(([, v]) => v.completed).map(([k]) => k)
	);
	// Only show today's lessons
	const thisWeekLessons = pool.filter(l => dailyLessonIds.includes(l.id));
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
						isGenerating
							? <GeneratingSkeleton label="lessons" />
							: <p className="text-[13px] dark:text-slate-400 text-slate-500 py-[8px] text-center">No {selectedCategory ?? ""} lessons today.</p>
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
											<span className="text-[10px] dark:text-slate-500 text-slate-400">{lesson.durationMin} min</span>
											<span className="text-[10px] font-bold text-amber-400">+{lesson.xp} XP</span>
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
	onDailyComplete,
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
	onDailyComplete?: (wk: string, id: string, xp: number, type?: string) => void;
	onBack: () => void;
	onComplete: () => void;
	lessonsPool?: Lesson[];
}) {
	const { completeLesson } = useAccount();
	const { showXp, XPFloat } = useXpFloat();
	const lesson = (lessonsPool ?? []).find(l => l.id === lessonId);
	const [cardIndex, setCardIndex] = useState(0);
	const [phase, setPhase] = useState<"cards" | "quiz" | "done">("cards");
	const [selectedOption, setSelectedOption] = useState<string | null>(null);
	const [showResult, setShowResult] = useState(false);
	const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
	const swipeStartX = useRef<number | null>(null);
	const xpAwardedRef = useRef(false); // prevents double-fire before Firestore propagates
	// Snapshot at mount time — by the time the done screen renders, Firestore has already
	// propagated the completion back, making the live value always true.
	const wasAlreadyCompletedRef = useRef(!!(account?.lessonProgress?.[lessonId]?.completed));
	const alreadyCompleted = wasAlreadyCompletedRef.current;

	// Guard against generated lessons with empty/missing cards
	if (!lesson || !lesson.cards?.length) return null;

	const isLastCard = cardIndex >= lesson.cards.length - 1;
	const isCorrect = selectedOption?.toLowerCase() === lesson.quiz.correctId?.toLowerCase();

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
		const correct = optionId.toLowerCase() === lesson.quiz.correctId?.toLowerCase();
		// Only award XP + mark complete on correct answer.
		// xpAwardedRef blocks double-fire if the user taps fast before Firestore propagates.
		// Wrong answers stay incomplete so the user can try again — no XP awarded.
		if (correct && !alreadyCompleted && !xpAwardedRef.current) {
			xpAwardedRef.current = true;
			showXp(lesson.xp);
			// completeLesson is the single XP source (marks lessonProgress + increments totalXp)
			await completeLesson(lesson.id, lesson.xp);
			// Pass xp:0 — daily checkmark only, no extra XP (avoids double-counting)
			if (dayKey && dailyCompleted && !dailyCompleted.has(lesson.id) && onDailyComplete)
				onDailyComplete(dayKey, lesson.id, 0, "lesson");
			// Level-up toast
			const prevXp = account?.totalXp ?? 0;
			const newXp = prevXp + lesson.xp;
			const LEVEL_UP_UI: Record<2|3|4|5, { emoji: string; bar: string }> = {
				2: { emoji: "📚", bar: "from-blue-400 to-blue-500"     },
				3: { emoji: "📈", bar: "from-cyan-400 to-blue-400"     },
				4: { emoji: "🔬", bar: "from-violet-400 to-purple-500" },
				5: { emoji: "🏆", bar: "from-amber-400 to-orange-500"  },
			};
			const crossedTier = ([2, 3, 4, 5] as const).find(t => prevXp < TIER_THRESHOLDS[t] && newXp >= TIER_THRESHOLDS[t]);
			if (crossedTier) {
				const lv = { name: SHARED_TIER_XP[crossedTier].label, ...LEVEL_UP_UI[crossedTier] };
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
		if (isCorrect) {
			setPhase("done");
			setTimeout(onComplete, 1200);
		} else {
			onComplete();
		}
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

// ── Stock Battles ─────────────────────────────────────────────────────────

function BattleDetail({ battleId, onBack, onResult, battlesPool, alreadyWon }: { battleId: string; onBack: () => void; onResult?: (won: boolean) => void; battlesPool?: BattleMatchup[]; alreadyWon?: boolean }) {
	const pool = battlesPool ?? [];
	const battle = pool.find(b => b.id === battleId)!;
	// If already won, pre-select so the reveal is shown immediately (read-only, no XP)
	const [selected, setSelected] = useState<"A" | "B" | null>(null);
	const { showXp, XPFloat } = useXpFloat();
	const xpAwarded = useRef(false);
	const liveWinnerRef = useRef<"A" | "B" | null>(null);
	const handlePick = (side: "A" | "B") => {
		if (selected || alreadyWon) return;
		setSelected(side);
		// Resolve winner after a short delay; retry up to 3s if stock data hasn't loaded yet.
		// Read from ref so retries always see the latest value even if data arrived after click.
		const resolve = (attempt: number) => {
			const winner = liveWinnerRef.current;
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

	const numA = parseFinancialValue(valA);
	const numB = parseFinancialValue(valB);
	const liveWinner: "A" | "B" | null = numA != null && numB != null
		? (battle.higherWins ? (numA >= numB ? "A" : "B") : (numA <= numB ? "A" : "B"))
		: null;
	liveWinnerRef.current = liveWinner;

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

function BattlesView({ onBack, dayKey, dailyCompleted, onDailyComplete, dailyBattleIds, dayLabel, battlesPool, onBattleWon, isGenerating }: { onBack: () => void; dayKey?: string; dailyCompleted?: Set<string>; onDailyComplete?: (wk: string, id: string, xp: number, type?: string) => void; dailyBattleIds?: string[]; dayLabel?: string; battlesPool?: BattleMatchup[]; onBattleWon?: (id: string, xp: number) => void; isGenerating?: boolean }) {
	const pool = battlesPool ?? [];
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
		if (won) {
			const battle = pool.find(b => b.id === battleId);
			const xp = battle?.xp ?? 0;
			// onBattleWon is the single XP source — it writes to activity_progress.xp_earned.
			// onDailyComplete gets xp:0 (checkmark only) to avoid double-counting.
			if (dayKey && dailyCompleted && !dailyCompleted.has(battleId) && onDailyComplete)
				onDailyComplete(dayKey, battleId, 0, "battle");
			onBattleWon?.(battleId, xp);
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


				<div className="space-y-[8px]">
					{isGenerating && pool.length === 0 && <GeneratingSkeleton label="battles" />}
					{(dailyBattleIds ? pool.filter(b => dailyBattleIds.includes(b.id)) : pool).map(b => {
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

function EarningsLabView({ onBack, dayKey, dailyCompleted, onDailyComplete, dailyEarningsIds, dayLabel, earningsPool, onEarningsScenarioCorrect, isGenerating }: { onBack: () => void; dayKey?: string; dailyCompleted?: Set<string>; onDailyComplete?: (wk: string, id: string, xp: number, type?: string) => void; dailyEarningsIds?: string[]; dayLabel?: string; earningsPool?: EarningsScenario[]; onEarningsScenarioCorrect?: (id: string, xp: number) => void; isGenerating?: boolean }) {
	const pool = earningsPool ?? [];
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
	const sessionAnswers = useRef<Map<string, string>>(new Map());
	const [openSections, setOpenSections] = useState<Set<string>>(new Set());
	const toggleSection = (key: string) => setOpenSections(prev => {
		const next = new Set(prev);
		if (next.has(key)) next.delete(key); else next.add(key);
		return next;
	});
	useEffect(() => {
		if (phase === "outcome") setOpenSections(new Set(["why"]));
		else setOpenSections(new Set());
	}, [phase]);

	const visibleScenarios = dailyEarningsIds ? pool.filter(s => dailyEarningsIds.includes(s.id)) : pool;
	const scenario = pool.find(s => s.id === activeId);
	const currentIdx = visibleScenarios.findIndex(s => s.id === activeId);
	// Next scenario: skip ones already attempted
	const nextScenario = visibleScenarios.slice(currentIdx + 1).find(s => !completedIds.has(s.id)) ?? visibleScenarios[currentIdx + 1];

	const scrollEl = () => document.querySelector("[data-scroll-root]");

	const openScenario = (id: string) => {
		savedScrollY.current = scrollEl()?.scrollTop ?? 0;
		setActiveId(id);
		const alreadyCompleted = completedIds.has(id);
		const resolvedCorrectId = pool.find(s => s.id === id)?.correctId ?? null;
		// Restore with the actual answer the user picked this session (if available),
		// otherwise fall back to correctId so the reveal still shows correctly
		const sessionAnswer = sessionAnswers.current.get(id);
		setSelected(alreadyCompleted && resolvedCorrectId ? (sessionAnswer ?? resolvedCorrectId) : null);
		setPhase(alreadyCompleted && resolvedCorrectId ? "outcome" : "question");
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
		const isCorrect = selected !== null && selected.toLowerCase() === scenario.correctId.toLowerCase();
		const hasSessionAnswer = sessionAnswers.current.has(scenario.id);

		const calcBeatMiss = (actual: string | undefined, estimate: string): { pct: number; label: string } | null => {
			const a = parseFinancialValue(actual);
			const e = parseFinancialValue(estimate);
			if (a == null || e == null || e === 0) return null;
			const pct = ((a - e) / Math.abs(e)) * 100;
			const sign = pct >= 0 ? "+" : "";
			return { pct, label: `${pct >= 0 ? "Beat" : "Miss"} ${sign}${pct.toFixed(1)}%` };
		};
		const revBeatMiss = calcBeatMiss(scenario.revenueActual, scenario.revenueExpected);
		const epsBeatMiss = calcBeatMiss(scenario.epsActual, scenario.epsExpected);

		const moveNeg = scenario.stockMove ? scenario.stockMove.startsWith("-") : false;
		const movePos = scenario.stockMove ? (scenario.stockMove.startsWith("+") || /^\d/.test(scenario.stockMove)) : false;

		return (
			<div className="min-h-full bg-background text-foreground">
				{XPFloat}
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">

					{/* Header */}
					<div className="flex items-center justify-between mb-[16px]">
						<button type="button" onClick={backToList} className="flex items-center gap-[6px] text-[13px] font-medium dark:text-slate-400 text-slate-500 active:opacity-70">
							<ChevronRight size={15} className="rotate-180" strokeWidth={2.5} />
							Back
						</button>
						<p className="text-[13px] font-bold text-foreground">Earnings Lab</p>
						{alreadyDone
							? <span className="text-[12px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-[10px] py-[4px] rounded-full">Done ✓</span>
							: <span className="text-[12px] font-semibold text-amber-400">+{scenario.xp} XP</span>
						}
					</div>

					{/* Company */}
					<div className="flex items-center gap-[10px] mb-[16px]">
						<div className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[9px] bg-purple-500/10">
							<FlaskConical size={16} className="text-purple-400" />
						</div>
						<h2 className="text-[18px] font-extrabold leading-snug">{scenario.company} <span className="font-normal dark:text-slate-400 text-slate-500">({scenario.ticker})</span></h2>
					</div>

					{/* Earnings report card */}
					<div className="rounded-[14px] border border-foreground/10 overflow-hidden mb-[16px]">
						<div className="h-[3px] bg-gradient-to-r from-purple-500 to-violet-500" />
						<div className="px-[14px] py-[10px] border-b border-foreground/[0.07] flex items-center justify-between">
							<div className="flex items-center gap-[6px]">
								<FlaskConical size={11} className="text-purple-400 shrink-0" />
								<p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">The earnings report</p>
							</div>
							<span className="text-[11px] font-semibold dark:text-slate-500 text-slate-400 bg-foreground/[0.05] px-[7px] py-[2px] rounded-full">{scenario.ticker}</span>
						</div>
						<div className="p-[14px]">
							<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed mb-[12px]">
								{scenario.context}{scenario.forwardGuidance ? ` ${scenario.forwardGuidance}` : ""}
							</p>

							{/* 3 metric tiles */}
							<div className="grid grid-cols-3 gap-[8px]">
								{/* Revenue */}
								<div className="rounded-[10px] border border-foreground/[0.07] bg-foreground/[0.03] p-[10px]">
									<div className="flex items-center gap-[4px] mb-[5px]">
										<DollarSign size={10} className="dark:text-slate-500 text-slate-400 shrink-0" />
										<p className="text-[9px] font-semibold uppercase tracking-wide dark:text-slate-500 text-slate-400">Revenue</p>
									</div>
									<p className="text-[14px] font-extrabold leading-none mb-[2px]">{scenario.revenueActual ?? scenario.revenueExpected}</p>
									<p className="text-[9px] dark:text-slate-500 text-slate-400 mb-[4px]">est. {scenario.revenueExpected}</p>
									{revBeatMiss && (
										<p className={`text-[9px] font-bold ${revBeatMiss.pct >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>{revBeatMiss.label}</p>
									)}
								</div>

								{/* EPS */}
								<div className="rounded-[10px] border border-foreground/[0.07] bg-foreground/[0.03] p-[10px]">
									<div className="flex items-center gap-[4px] mb-[5px]">
										<LineChart size={10} className="dark:text-slate-500 text-slate-400 shrink-0" />
										<p className="text-[9px] font-semibold uppercase tracking-wide dark:text-slate-500 text-slate-400">EPS</p>
									</div>
									<p className="text-[14px] font-extrabold leading-none mb-[2px]">{scenario.epsActual ?? scenario.epsExpected}</p>
									<p className="text-[9px] dark:text-slate-500 text-slate-400 mb-[4px]">est. {scenario.epsExpected}</p>
									{epsBeatMiss && (
										<p className={`text-[9px] font-bold ${epsBeatMiss.pct >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>{epsBeatMiss.label}</p>
									)}
								</div>

								{/* Stock reaction / setup */}
								<div className="rounded-[10px] border border-foreground/[0.07] bg-foreground/[0.03] p-[10px]">
									<div className="flex items-center gap-[4px] mb-[5px]">
										<BarChart2 size={10} className="dark:text-slate-500 text-slate-400 shrink-0" />
										<p className="text-[9px] font-semibold uppercase tracking-wide dark:text-slate-500 text-slate-400">Stock setup</p>
									</div>
									<p className="text-[13px] font-extrabold leading-none mb-[2px] text-foreground">{scenario.stockContext}</p>
									{scenario.peRatio && <p className="text-[9px] dark:text-slate-500 text-slate-400 mb-[2px]">P/E ratio: {scenario.peRatio}</p>}
									{scenario.stockSetupLabel && <p className="text-[9px] font-semibold dark:text-slate-400 text-slate-500 leading-snug">{scenario.stockSetupLabel}</p>}
								</div>
							</div>
						</div>
					</div>

					{/* Question */}
					<div className="flex items-start gap-[10px] mb-[12px]">
						<div className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-purple-500/10 mt-[1px]">
							<span className="text-[13px]">🎯</span>
						</div>
						<p className="text-[15px] font-bold leading-snug">{scenario.question}</p>
					</div>

					{/* Options */}
					<div className="space-y-[8px] mb-[16px]">
						{scenario.options.map((opt, i) => (
							<OptionBtn
								key={opt.id}
								letter={LETTERS[i] ?? String(i + 1)}
								text={opt.text}
								state={phase === "question"
									? (selected === opt.id ? "selected" : "idle")
									: optionState(opt.id, scenario.correctId, selected, true)
								}
								onClick={phase === "question" ? () => {
									if (!selected) {
										const correct = opt.id === scenario.correctId;
										sessionAnswers.current.set(scenario.id, opt.id);
										setSelected(opt.id);
										setPhase("outcome");
										const alreadyAttempted = dailyCompleted?.has(scenario.id) ?? completedIds.has(scenario.id);
										setCompletedIds(prev => new Set([...prev, scenario.id]));
										if (correct) {
											showXp(scenario.xp);
											// onEarningsScenarioCorrect is the XP source — writes xp_earned to activity_progress.
											// onDailyComplete gets xp:0 (checkmark only) to avoid double-counting.
											onEarningsScenarioCorrect?.(scenario.id, scenario.xp);
										}
										if (dayKey && !alreadyAttempted && onDailyComplete)
											onDailyComplete(dayKey, scenario.id, 0, "earnings");
									}
								} : undefined}
								disabled={phase === "outcome"}
							/>
						))}
					</div>

					{/* Post-answer sections */}
					{phase === "outcome" && (
						<div className="space-y-[8px]">

							{/* What actually happened — always visible */}
							<div className="rounded-[12px] border border-foreground/10 p-[14px]">
								<div className="flex items-center gap-[7px] mb-[10px]">
									<TrendingUp size={13} className="text-purple-400 shrink-0" />
									<p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">What actually happened</p>
								</div>
								<div className="flex items-start gap-[12px]">
									{scenario.stockMove && (
										<div className={`shrink-0 w-[52px] h-[52px] rounded-[11px] flex items-center justify-center border ${moveNeg ? "border-rose-500/25 bg-rose-500/[0.07]" : movePos ? "border-emerald-500/25 bg-emerald-500/[0.07]" : "border-foreground/10 bg-foreground/[0.03]"}`}>
											<p className={`text-[15px] font-extrabold ${moveNeg ? "text-rose-500 dark:text-rose-400" : movePos ? "text-emerald-500 dark:text-emerald-400" : "text-foreground"}`}>{scenario.stockMove}</p>
										</div>
									)}
									<div className="flex-1 min-w-0">
										<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.outcome}</p>
										{hasSessionAnswer && (
											<p className={`text-[12px] font-bold mt-[6px] ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
												{isCorrect ? "You got it right! ✓" : "You got it wrong."}
											</p>
										)}
									</div>
								</div>
							</div>

							{/* Why this happened — collapsible, starts open */}
							<div className="rounded-[12px] border border-foreground/10 overflow-hidden">
								<button type="button" onClick={() => toggleSection("why")} className="w-full flex items-center gap-[10px] px-[14px] py-[13px] text-left active:opacity-70">
									<span className="text-[15px] shrink-0">💡</span>
									<p className="flex-1 text-[13px] font-semibold text-foreground">Why this happened</p>
									<ChevronRight size={14} className={`dark:text-slate-500 text-slate-400 transition-transform duration-200 ${openSections.has("why") ? "rotate-90" : ""}`} />
								</button>
								{openSections.has("why") && (
									<div className="px-[14px] pb-[14px] border-t border-foreground/[0.07]">
										<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed pt-[10px]">{scenario.explanation}</p>
									</div>
								)}
							</div>

							{/* The lesson — collapsible, starts closed */}
							{scenario.keyTakeaway && (
								<div className="rounded-[12px] border border-foreground/10 overflow-hidden">
									<button type="button" onClick={() => toggleSection("lesson")} className="w-full flex items-center gap-[10px] px-[14px] py-[13px] text-left active:opacity-70">
										<span className="text-[15px] shrink-0">📖</span>
										<p className="flex-1 text-[13px] font-semibold text-foreground">The lesson</p>
										<ChevronRight size={14} className={`dark:text-slate-500 text-slate-400 transition-transform duration-200 ${openSections.has("lesson") ? "rotate-90" : ""}`} />
									</button>
									{openSections.has("lesson") && (
										<div className="px-[14px] pb-[14px] border-t border-foreground/[0.07]">
											<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed pt-[10px] font-medium">{scenario.keyTakeaway}</p>
										</div>
									)}
								</div>
							)}

							{/* What to watch next time — collapsible, starts closed */}
							{scenario.watchNextTime && (
								<div className="rounded-[12px] border border-foreground/10 overflow-hidden">
									<button type="button" onClick={() => toggleSection("watch")} className="w-full flex items-center gap-[10px] px-[14px] py-[13px] text-left active:opacity-70">
										<span className="text-[15px] shrink-0">👁</span>
										<p className="flex-1 text-[13px] font-semibold text-foreground">What to watch next time</p>
										<ChevronRight size={14} className={`dark:text-slate-500 text-slate-400 transition-transform duration-200 ${openSections.has("watch") ? "rotate-90" : ""}`} />
									</button>
									{openSections.has("watch") && (
										<div className="px-[14px] pb-[14px] border-t border-foreground/[0.07]">
											<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed pt-[10px]">{scenario.watchNextTime}</p>
										</div>
									)}
								</div>
							)}

							{/* Bottom navigation */}
							<div className="flex gap-[10px] pt-[4px]">
								<button type="button" onClick={backToList}
									className="flex-1 h-[44px] rounded-[12px] font-medium text-[13px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">
									All Scenarios
								</button>
								{nextScenario && (
									<button type="button" onClick={() => openScenario(nextScenario.id)}
										className="flex-1 h-[44px] rounded-[12px] font-semibold text-[14px] text-white active:opacity-80 flex items-center justify-center gap-[5px]"
										style={{ background: "linear-gradient(90deg,#8b5cf6,#6366f1)" }}>
										Next Scenario <ChevronRight size={15} />
									</button>
								)}
							</div>
						</div>
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


				<div className="space-y-[8px]">
					{isGenerating && visibleScenarios.length === 0 && <GeneratingSkeleton label="earnings scenarios" />}
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

function RiskLabView({ onBack, dailyRiskIds, dayLabel, dayKey, dailyCompleted, onDailyComplete, riskPool, onRiskCorrect, isGenerating }: { onBack: () => void; dailyRiskIds?: string[]; dayLabel?: string; dayKey?: string; dailyCompleted?: Set<string>; onDailyComplete?: (wk: string, id: string, xp: number, type?: string) => void; riskPool?: RiskScenario[]; onRiskCorrect?: (id: string, xp: number) => void; isGenerating?: boolean }) {
	const pool = riskPool ?? [];
	const { showXp, XPFloat } = useXpFloat();
	const [index, setIndex] = useState(0);
	const [selected, setSelected] = useState<"A" | "B" | null>(null);
	const [done, setDone] = useState(false);
	const dailyIds = dailyRiskIds ? pool.filter(r => dailyRiskIds.includes(r.id)) : pool;
	// Seed from already-completed so re-entry after a retry shows the full cumulative score.
	const [correct, setCorrect] = useState(() => dailyIds.filter(r => dailyCompleted?.has(r.id)).length);
	// sessionCorrect tracks IDs completed correctly THIS session so Try Again can replay them
	const [sessionCorrect, setSessionCorrect] = useState<Set<string>>(new Set());
	// Exclude already-completed (correct) scenarios EXCEPT ones just done correctly this session.
	// Wrong answers are intentionally NOT flushed — users can retry them on re-entry.
	const visibleRisk = dailyIds.filter(r => !dailyCompleted?.has(r.id) || sessionCorrect.has(r.id));
	const scenario = visibleRisk[index];

	if (done) {
		// Use dailyIds.length (full pack size) not visibleRisk.length — after flushing wrong
		// answers visibleRisk shrinks, which would show "1/1" instead of the correct "1/2".
		const total = dailyIds.length;
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
					</div>
				</div>
			</div>
		);
	}

	// "All done" state — show review of completed scenarios
	if (visibleRisk.length === 0 && !done) {
		const completedRisk = dailyIds.filter(r => dailyCompleted?.has(r.id));
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<div className="rounded-[16px] border border-emerald-500/25 bg-emerald-500/[0.07] p-[18px] text-center mb-[20px]">
						<span className="text-[40px] block mb-[8px]">✅</span>
						<h2 className="text-[20px] font-extrabold mb-[4px]">All Done Today</h2>
						<p className="text-[12px] dark:text-slate-400 text-slate-500">New scenarios unlock tomorrow.</p>
					</div>
					{completedRisk.length > 0 && (
						<>
							<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Review Today's Answers</p>
							<div className="space-y-[10px]">
								{completedRisk.map(r => (
									<div key={r.id} className="rounded-[14px] border border-foreground/10 bg-surface-1 p-[14px]">
										<p className="text-[13px] font-semibold mb-[8px]">{r.prompt}</p>
										<div className="space-y-[6px] mb-[10px]">
											{(["A", "B"] as const).map(side => {
												const text = side === "A" ? r.optionA : r.optionB;
												const isCorrect = side === r.riskierOption;
												return (
													<div key={side} className={`flex items-center gap-[8px] rounded-[10px] border px-[10px] py-[8px] text-[12px] ${isCorrect ? "border-orange-500/30 bg-orange-500/[0.07] text-orange-400 font-semibold" : "border-foreground/[0.06] dark:text-slate-400 text-slate-500"}`}>
														<span className={`text-[10px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center shrink-0 ${isCorrect ? "bg-orange-500/20" : "bg-foreground/[0.06]"}`}>{side}</span>
														{text}{isCorrect ? " ⚠️ Higher Risk" : " ✓ More Stable"}
													</div>
												);
											})}
										</div>
										<p className="text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">{r.explanation}</p>
									</div>
								))}
							</div>
						</>
					)}
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
					{isGenerating
						? <GeneratingSkeleton label="risk scenarios" />
						: <p className="text-[14px] dark:text-slate-400 text-slate-500">No risk scenarios today. Check back tomorrow — they unlock as you level up.</p>}
				</div>
			</div>
		);
	}

	const next = () => {
		const isCorrect = selected === scenario.riskierOption;
		if (isCorrect) {
			setSessionCorrect(prev => new Set([...prev, scenario.id]));
			// onRiskCorrect is the XP source; onDailyComplete gets xp:0 (checkmark only).
			if (dayKey && !dailyCompleted?.has(scenario.id) && onDailyComplete)
				onDailyComplete(dayKey, scenario.id, 0, "risk");
			onRiskCorrect?.(scenario.id, scenario.xp);
		}
		// Wrong answers are NOT marked complete — user can re-enter and retry them.
		// The pack is now stable for the day so retrying won't cause a "new set" to appear.
		if (index < visibleRisk.length - 1) {
			setIndex(i => i + 1); setSelected(null); setCorrect(c => isCorrect ? c + 1 : c);
		} else {
			setCorrect(c => isCorrect ? c + 1 : c);
			setDone(true);
		}
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

function MoodSimulatorView({ onBack, dayKey, dailyCompleted, onDailyComplete, dailyMoodIds, dayLabel, moodPool, onMoodCorrect, isGenerating }: { onBack: () => void; dayKey?: string; dailyCompleted?: Set<string>; onDailyComplete?: (wk: string, id: string, xp: number, type?: string) => void; dailyMoodIds?: string[]; dayLabel?: string; moodPool?: MoodScenario[]; onMoodCorrect?: (id: string, xp: number) => void; isGenerating?: boolean }) {
	const pool = moodPool ?? [];
	const { showXp, XPFloat } = useXpFloat();
	const [index, setIndex] = useState(0);
	const [selected, setSelected] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const dailyIdsMood = dailyMoodIds ? pool.filter(m => dailyMoodIds.includes(m.id)) : pool;
	// Seed from already-completed so re-entry after a retry shows the full cumulative score.
	const [correct, setCorrect] = useState(() => dailyIdsMood.filter(m => dailyCompleted?.has(m.id)).length);
	const [sessionCorrectMood, setSessionCorrectMood] = useState<Set<string>>(new Set());
	const visibleMood = dailyIdsMood.filter(m => !dailyCompleted?.has(m.id) || sessionCorrectMood.has(m.id));
	const scenario = visibleMood[index];

	if (done) {
		// Use dailyIdsMood.length (full pack size) not visibleMood.length — same reason as Risk Lab.
		const total = dailyIdsMood.length;
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
					</div>
				</div>
			</div>
		);
	}

	// All done state — all scenarios today correctly answered
	if (visibleMood.length === 0 && !done) {
		const completedMood = dailyIdsMood.filter(m => dailyCompleted?.has(m.id));
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<div className="rounded-[16px] border border-emerald-500/25 bg-emerald-500/[0.07] p-[18px] text-center mb-[20px]">
						<span className="text-[40px] block mb-[8px]">✅</span>
						<h2 className="text-[20px] font-extrabold mb-[4px]">All Done Today</h2>
						<p className="text-[12px] dark:text-slate-400 text-slate-500">New scenarios unlock tomorrow.</p>
					</div>
					{completedMood.length > 0 && (
						<>
							<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Review Today's Answers</p>
							<div className="space-y-[10px]">
								{completedMood.map(m => (
									<div key={m.id} className="rounded-[14px] border border-foreground/10 bg-surface-1 p-[14px]">
										<p className="text-[12px] font-bold text-cyan-400 mb-[4px]">{m.event}</p>
										<p className="text-[13px] font-semibold mb-[8px]">{m.question}</p>
										<div className="space-y-[5px] mb-[10px]">
											{m.options.map((opt, i) => {
												const isCorrect = opt.id === m.correctId;
												return (
													<div key={opt.id} className={`flex items-center gap-[8px] rounded-[10px] border px-[10px] py-[7px] text-[12px] ${isCorrect ? "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-400 font-semibold" : "border-foreground/[0.06] dark:text-slate-400 text-slate-500"}`}>
														<span className={`text-[10px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center shrink-0 ${isCorrect ? "bg-emerald-500/20" : "bg-foreground/[0.06]"}`}>{LETTERS[i] ?? String(i + 1)}</span>
														{opt.text}{isCorrect ? " ✓" : ""}
													</div>
												);
											})}
										</div>
										<p className="text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">{m.explanation}</p>
									</div>
								))}
							</div>
						</>
					)}
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
					{isGenerating
						? <GeneratingSkeleton label="mood scenarios" />
						: <p className="text-[14px] dark:text-slate-400 text-slate-500">No scenarios today. Check back tomorrow!</p>}
				</div>
			</div>
		);
	}

	const next = () => {
		const isRight = selected === scenario.correctId;
		if (isRight) {
			setSessionCorrectMood(prev => new Set([...prev, scenario.id]));
			// onMoodCorrect is the XP source; onDailyComplete gets xp:0 (checkmark only).
			if (dayKey && !dailyCompleted?.has(scenario.id) && onDailyComplete)
				onDailyComplete(dayKey, scenario.id, 0, "mood");
			onMoodCorrect?.(scenario.id, scenario.xp);
		}
		// Wrong answers are NOT marked complete — user can re-enter and retry them.
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
	const { data: allBrandsList } = useBrandsList();
	const allBrands = useMemo(() => allBrandsList ?? [], [allBrandsList]);

	// ── Types ────────────────────────────────────────────────────────────────────
	type RoundType = "sentiment" | "nextstep";
	type OtherPhase = "question" | "feedback";

	// ── Static scenario data ─────────────────────────────────────────────────────
	// Date-based offset so the starting scenario rotates daily
	const _todayOffset = useMemo(() => {
		const d = new Date();
		return d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate();
	}, []);

	// ── Spot the Signal — per-archetype question definitions ─────────────────────
	const STOCK_ARCHETYPES: Record<string, "quality_compounder" | "high_growth" | "speculative" | "defensive" | "familiar"> = {
		// Quality Compounders
		AMZN: "quality_compounder", MSFT: "quality_compounder", AAPL: "quality_compounder",
		COST: "quality_compounder", GOOGL: "quality_compounder",
		// High-Growth
		NVDA: "high_growth", PLTR: "high_growth", SHOP: "high_growth",
		DDOG: "high_growth", CRWD: "high_growth", DUOL: "high_growth", AMD: "high_growth",
		// Speculative
		COIN: "speculative", ASTS: "speculative", HOOD: "speculative", RBLX: "speculative",
		TSLA: "speculative", RIVN: "speculative",
		// Defensive
		KO: "defensive", WMT: "defensive", JNJ: "defensive",
		// Familiar
		META: "familiar", NFLX: "familiar", SBUX: "familiar", NKE: "familiar",
		SPOT: "high_growth", DIS: "familiar", UBER: "familiar",
	};

	interface SignalQuestion {
		question: string;
		correctChip: string;
		wrongChip: string;
		distractors: string[];
		correctFeedback: string;
		wrongFeedback: string;
		skill: string;
	}

	// All correctChip values reference metrics VISIBLE on the card (P/E, Rev Growth, Margin, Today %)
	// so users can always derive the answer from the displayed data
	const SIGNAL_QUESTIONS: Record<string, SignalQuestion> = {
		quality_compounder: {
			question: "Which metric shown here matters most for a company like this?",
			correctChip: "Revenue growth",
			wrongChip: "Today's price move",
			distractors: ["Stock ticker symbol", "Company name length"],
			correctFeedback: "Right. Revenue growth tells you whether the business is expanding. One red day in the price doesn't change the underlying business quality at all.",
			wrongFeedback: "Not quite. A one-day price move is noise. For quality businesses, the revenue growth trend is far more meaningful for understanding long-term value.",
			skill: "growth",
		},
		high_growth: {
			question: "What is the most telling signal on this card?",
			correctChip: "Revenue growth",
			wrongChip: "Today's price move",
			distractors: ["Company name", "Number of shares"],
			correctFeedback: "Correct. High-growth companies live or die by their revenue growth rate — it tells you if the business is still accelerating or starting to slow down.",
			wrongFeedback: "Not quite. Daily price moves are just noise. For a high-growth stock, the revenue growth rate is what drives the valuation and investor expectations.",
			skill: "growth",
		},
		speculative: {
			question: "Which of these is the most important signal for a speculative stock?",
			correctChip: "Today's price move",
			wrongChip: "Profit margin",
			distractors: ["Company headquarters", "Years since IPO"],
			correctFeedback: "Right. Speculative stocks can swing sharply on sentiment. A large price move today often signals a catalyst — earnings, news, or macro shift — that you need to investigate.",
			wrongFeedback: "Not quite. Many speculative companies run at a loss intentionally. The price move is more immediately relevant — it signals whether something significant just happened.",
			skill: "risk",
		},
		defensive: {
			question: "For a defensive stock, which metric shown here matters most?",
			correctChip: "Profit margin",
			wrongChip: "Today's price move",
			distractors: ["Ticker symbol", "Listing exchange"],
			correctFeedback: "Right. Defensive stocks are held for stability and reliable earnings. A consistent profit margin signals the company can weather tough economic conditions.",
			wrongFeedback: "Not quite. Defensive stocks are valued for stability, not price momentum. Their margins tell you how resilient the business is when conditions get difficult.",
			skill: "profitability",
		},
		familiar: {
			question: "What should you check first on this familiar brand's card?",
			correctChip: "Revenue growth",
			wrongChip: "Today's price move",
			distractors: ["Brand name spelling", "Stock exchange listed on"],
			correctFeedback: "Exactly. Brand recognition is not the same as a good investment. Revenue growth tells you if the business behind the brand is actually getting bigger.",
			wrongFeedback: "Not quite. One-day moves are noise. The revenue growth rate tells you if this familiar brand is still expanding — that's what drives long-term returns.",
			skill: "growth",
		},
	};

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
		// Extended pool — 15 more to reduce repetition
		{ scenario: "The Federal Reserve signals it will keep rates higher for longer.", correct: "Bearish" as const, explanation: "Bearish for growth stocks. Higher rates for longer increases the discount rate applied to future earnings, making high-multiple stocks less attractive relative to bonds." },
		{ scenario: "A software company reports 40% revenue growth with expanding margins.", correct: "Bullish" as const, explanation: "Bullish. Accelerating growth with improving margins is the best combination — it means the company is scaling efficiently while also growing its top line." },
		{ scenario: "A company's CEO suddenly resigns with no explanation.", correct: "Bearish" as const, explanation: "Bearish. Unexpected C-suite departures are a red flag — the departing executive may know something negative, and uncertainty about leadership direction spooks investors." },
		{ scenario: "A retailer beats same-store sales but inventory is rising faster than sales.", correct: "Mixed" as const, explanation: "Mixed. Strong current sales are good, but rising inventory suggests the company may be building up unsold goods — which can force future discounting and hurt margins." },
		{ scenario: "The unemployment rate drops to a 50-year low.", correct: "Mixed" as const, explanation: "Mixed. Low unemployment signals a strong economy (bullish for consumer spending) but also raises fears of wage inflation and higher rates (bearish for valuations)." },
		{ scenario: "A company announces it will split its stock 10-for-1.", correct: "Bullish" as const, explanation: "Slightly bullish sentiment, but economically neutral. Stock splits don't change company value but often attract retail investors and signal management confidence." },
		{ scenario: "A tech company's cloud revenue growth slows from 35% to 18% year-over-year.", correct: "Bearish" as const, explanation: "Bearish. Cloud growth deceleration signals market saturation or competition gaining share. For cloud-first companies, this is often the most watched metric." },
		{ scenario: "A consumer brand reports strong US sales but significant weakness in China.", correct: "Mixed" as const, explanation: "Mixed. Strong domestic results are good, but China weakness matters — it's one of the largest consumer markets globally, and many brands rely on it for growth." },
		{ scenario: "A bank reports record profits but credit card delinquencies are rising.", correct: "Mixed" as const, explanation: "Mixed. Current profits look good, but rising delinquencies are a leading indicator of future loan losses. The trend is more important than today's headline profit." },
		{ scenario: "GDP growth comes in at 3.2%, well above the expected 1.8%.", correct: "Bullish" as const, explanation: "Bullish overall. Stronger-than-expected economic growth signals healthy consumer spending and business activity — generally good for corporate earnings." },
		{ scenario: "A biotech stock surges 40% after a competitor's drug trial fails.", correct: "Bullish" as const, explanation: "Bullish for the surviving competitor. A rival's failure removes competitive pressure, potentially increasing the surviving company's market share and pricing power." },
		{ scenario: "A car company reports record EV deliveries but gross margins on EVs are -5%.", correct: "Mixed" as const, explanation: "Mixed. Strong delivery growth shows demand, but selling at a loss means the more they sell, the more they lose until they achieve scale. Profitability path matters." },
		{ scenario: "The 10-year Treasury yield jumps from 4.2% to 4.8% in two weeks.", correct: "Bearish" as const, explanation: "Bearish. A sharp rise in the risk-free rate makes bonds more attractive versus stocks, raises borrowing costs for companies, and compresses equity valuations — especially growth stocks." },
		{ scenario: "A company raises its dividend by 15% for the fifth year in a row.", correct: "Bullish" as const, explanation: "Bullish. Consistent dividend growth signals management's confidence in future earnings and cash flow. It's a strong quality signal for income-focused investors." },
		{ scenario: "A company beats earnings but the CFO sells $10M of stock the next day.", correct: "Mixed" as const, explanation: "Mixed. The earnings beat is positive, but significant insider selling right after can signal the CFO believes the stock is fairly valued or has personal reasons to sell — worth watching." },
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
		// Extended pool — 10 more to reduce repetition
		{ scenario: "A consumer company's gross margin drops from 65% to 52% in one year.", question: "What's the most important thing to understand?", options: ["Whether input cost inflation is temporary or structural", "Their social media engagement rate", "Whether the CEO has changed", "How many stores they have opened"], correctIdx: 0, skill: "profitability", explanation: "A sudden margin drop can come from temporary factors (commodity prices, supply chain) or structural ones (competition forcing price cuts). The distinction determines whether to buy the dip or exit." },
		{ scenario: "A company has $5B in cash but its stock hasn't moved in 3 years.", question: "What should you investigate first?", options: ["What management plans to do with the cash — buybacks, dividends, or acquisitions", "Why the stock has low social media mentions", "Whether the company hosts a podcast", "How many patents they own"], correctIdx: 0, skill: "valuation", explanation: "A large cash position is only valuable if management deploys it well. Sitting on cash earning low returns while the stock stagnates suggests poor capital allocation — or management waiting for something. You need to know which." },
		{ scenario: "A cloud software company just lost its second-largest customer.", question: "What metric should you check next?", options: ["Net Revenue Retention (NRR) — how much revenue from existing customers grows year over year", "How many new offices they opened", "Whether they changed their logo", "Their number of job postings"], correctIdx: 0, skill: "growth", explanation: "NRR tells you whether existing customers are spending more or less over time. A high NRR (above 120%) means existing customers expand, offsetting any churn — this is the most important health metric for SaaS companies." },
		{ scenario: "An EV company just achieved its first quarter of positive gross margin.", question: "What should you evaluate next?", options: ["Whether they can sustain and expand that margin at scale", "Their factory décor", "What colors they offer their cars in", "Their headquarters location"], correctIdx: 0, skill: "profitability", explanation: "Reaching gross margin profitability is a milestone, but the key question is durability. Can they maintain margins as they scale, or did they just cut corners this quarter? Look at unit economics over multiple quarters." },
		{ scenario: "A retailer reports flat same-store sales but strong e-commerce growth of 35%.", question: "What should you model out?", options: ["Whether e-commerce can eventually offset the declining physical stores", "Their store window displays", "How many employees work in HR", "Their return policy details"], correctIdx: 0, skill: "growth", explanation: "Channel shift is a common retail story. The key question is the economics: e-commerce margins are often different (sometimes worse) than physical retail. You need to understand if the digital growth is actually profitable." },
		{ scenario: "A company has high revenue growth but its 'Days Sales Outstanding' (DSO) is rising.", question: "What does rising DSO indicate?", options: ["Customers are taking longer to pay — which can signal collections problems or channel stuffing", "The company is growing too fast", "Employees are leaving", "Margins are improving"], correctIdx: 0, skill: "risk", explanation: "Rising DSO means the company is booking revenue but not collecting cash as quickly. This can be a sign of aggressive revenue recognition, channel stuffing, or customers in financial difficulty — a quality-of-earnings red flag." },
		{ scenario: "A company's operating leverage is high — fixed costs are 70% of total costs.", question: "What does this mean for investors?", options: ["Revenue growth flows directly to profit — but revenue declines also hurt profit disproportionately", "The company is very stable regardless of revenue", "Fixed costs are always good for margins", "Operating leverage doesn't affect stock performance"], correctIdx: 0, skill: "profitability", explanation: "High operating leverage amplifies outcomes in both directions. When revenue grows, profit grows faster (great). When revenue falls, profit falls faster (dangerous). Understanding this explains why some stocks are very volatile around earnings." },
		{ scenario: "A fintech company reports strong user growth but declining average revenue per user (ARPU).", question: "What should you investigate?", options: ["Whether new users are lower-value or whether the company is offering discounts to grow", "Their app store rating", "How many engineers they employ", "Whether their logo has changed recently"], correctIdx: 0, skill: "growth", explanation: "Declining ARPU despite user growth often means the company is acquiring cheaper, less engaged users — or pricing down to attract volume. Growth quality matters as much as growth rate." },
		{ scenario: "An industrial company reports strong revenue but working capital is increasing as a percentage of sales.", question: "What should you check?", options: ["Whether cash conversion is deteriorating — meaning growth is consuming more cash than it generates", "Their number of warehouse locations", "How many patents they filed", "Their LinkedIn followers"], correctIdx: 0, skill: "profitability", explanation: "Rising working capital as a percentage of revenue means the company needs more cash tied up in inventory and receivables to generate each dollar of sales. This can signal inefficiency or over-production, and will eventually pressure free cash flow." },
		{ scenario: "A subscription business reports strong subscriber growth but increasing churn rate.", question: "What metric most directly measures the impact?", options: ["Customer Lifetime Value (LTV) vs Customer Acquisition Cost (CAC)", "Their website design", "How many support tickets they get", "Whether they offer annual or monthly plans"], correctIdx: 0, skill: "risk", explanation: "The LTV/CAC ratio tells you whether acquiring new customers actually creates value. High churn destroys LTV — if it costs more to acquire a customer than you earn from them before they leave, growth destroys value rather than creating it." },
	];

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
	}, [account?.stakBrandIds, allBrands]);

	// Shuffled once and then held stable so questions don't reorder mid-session --
	// but must wait for the catalog to actually resolve first. Locking in
	// immediately (lazy useState) would permanently capture the generic
	// PRACTICE_TICKERS fallback for the whole session if allBrands was still
	// loading at mount, even for a user with a real Stak.
	const [stocks, setStocks] = useState<typeof pool>([]);
	const stocksInitialized = useRef(false);
	useEffect(() => {
		if (stocksInitialized.current || allBrandsList === undefined) return;
		stocksInitialized.current = true;
		setStocks([...pool].sort(() => Math.random() - 0.5));
	}, [allBrandsList, pool]);
	const stockList = stocks.length > 0 ? stocks : pool;

	// ── Round sequence ───────────────────────────────────────────────────────────
	const ROUND_SEQUENCE: RoundType[] = ["sentiment", "nextstep", "sentiment", "nextstep", "sentiment", "nextstep"];

	function getRoundType(idx: number): RoundType {
		return ROUND_SEQUENCE[idx % ROUND_SEQUENCE.length] ?? "sentiment";
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

	// Round state (shared for sentiment / nextstep)
	const [otherPhase, setOtherPhase] = useState<OtherPhase>("question");
	const [otherSelected, setOtherSelected] = useState<string | null>(null);
	const [otherCorrect, setOtherCorrect] = useState<boolean>(false);


	// Use weekly key for Skill Drills — large pool so weekly Gemini refresh is sufficient
	const _drillDayKey = useMemo(() => getTodayKey(), []);

	// uid-scoped localStorage keys so two users on the same device don't share state.
	// account?.uid may be undefined on mount (still loading), so keys are computed each render
	// and the initial localStorage read is deferred to a useEffect that fires once uid resolves.
	const _drillUid = account?.uid ?? "";
	const DAILY_DRILL_XP_CAP = ACTIVITY_XP_CAP;
	const _drillXpLsKey = _drillUid ? `stak:drill:xp:${_drillUid}:${_drillDayKey}` : null;
	const _drillIdxLsKey = _drillUid ? `stak:drill:idx:${_drillUid}:${_drillDayKey}` : null;
	// Start at 0 / date-offset defaults; useEffect below loads real values once uid is ready
	const [drillXpToday, setDrillXpToday] = useState(0);

	// Freeze tier once account loads — prevents mid-session refetch if user earns XP,
	// but also ensures we don't lock in tier 1 on cold load before account is available.
	const [_drillTier, _setDrillTier] = useState<number | null>(null);
	const _drillTierFrozen = useRef(false);
	useEffect(() => {
		if (_drillTierFrozen.current || !account) return;
		_drillTierFrozen.current = true;
		const xp = account.totalXp ?? 0;
		_setDrillTier(xpToTier(xp));
	}, [account]);

	// Fetch generated drill scenarios daily (cached 24h) to supplement static pools.
	// Disabled until _drillTier is set — ensures tier is correct even on cold page load.
	const { data: genSentimentData } = useQuery({
		queryKey: ["playground-gen", _drillUid, _drillDayKey, _drillTier, "drill_sentiment"],
		queryFn: () => generatePlaygroundQuestions(_drillDayKey, _drillTier!, "drill_sentiment", 5),
		staleTime: 24 * 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000, retry: 1,
		enabled: _drillTier !== null,
	});
	const { data: genNextStepData } = useQuery({
		queryKey: ["playground-gen", _drillUid, _drillDayKey, _drillTier, "drill_nextstep"],
		queryFn: () => generatePlaygroundQuestions(_drillDayKey, _drillTier!, "drill_nextstep", 5),
		staleTime: 24 * 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000, retry: 1,
		enabled: _drillTier !== null,
	});

	// Deterministic per-user-per-day shuffle — same order within a day (resumable),
	// different order each day so the user sees different scenarios.
	function seededShuffle<T>(arr: T[], seed: string): T[] {
		let h = seed.split("").reduce((acc, c) => (Math.imul(31, acc) + c.charCodeAt(0)) | 0, 0x9e3779b9);
		const next = () => { h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) | 0; return (h >>> 0) / 0x100000000; };
		const out = [...arr];
		for (let i = out.length - 1; i > 0; i--) {
			const j = Math.floor(next() * (i + 1));
			[out[i], out[j]] = [out[j]!, out[i]!];
		}
		return out;
	}
	const _drillShuffleSeed = `${_drillUid}:${_drillDayKey}`;

	// Merge static + generated pools (dedup by scenario text), then shuffle for today
	const allSentimentScenarios = useMemo(() => {
		const VALID_SENTIMENTS = ["Bullish","Bearish","Mixed"];
		const extras = Array.isArray(genSentimentData) ? genSentimentData
			.map(r => {
				if (!r || typeof r !== "object") return null;
				const rec = r as Record<string,unknown>;
				if (typeof rec.scenario !== "string") return null;
				// Normalize case — Gemini may return "bullish" instead of "Bullish"
				const raw = String(rec.correct ?? "");
				const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
				if (!VALID_SENTIMENTS.includes(normalized)) return null;
				return { scenario: rec.scenario, correct: normalized as "Bullish"|"Bearish"|"Mixed", explanation: String(rec.explanation ?? "") };
			})
			.filter((r): r is { scenario: string; correct: "Bullish"|"Bearish"|"Mixed"; explanation: string } => r !== null)
		: [];
		const seen = new Set(SENTIMENT_SCENARIOS.map(s => s.scenario.slice(0,30)));
		const merged = [...SENTIMENT_SCENARIOS, ...extras.filter(e => !seen.has(e.scenario.slice(0,30)))];
		return seededShuffle(merged, _drillShuffleSeed + ":sent");
	}, [genSentimentData, _drillShuffleSeed]);

	const allNextStepScenarios = useMemo(() => {
		const extras = Array.isArray(genNextStepData) ? genNextStepData.filter(
			(r): r is { scenario: string; question: string; options: string[]; correctIdx: number; skill: string; explanation: string } =>
				!!r && typeof r === "object" &&
				typeof (r as Record<string,unknown>).scenario === "string" &&
				Array.isArray((r as Record<string,unknown>).options)
		) : [];
		const seen = new Set(NEXT_STEP_SCENARIOS.map(s => s.scenario.slice(0,30)));
		const merged = [...NEXT_STEP_SCENARIOS, ...extras.filter(e => !seen.has(e.scenario.slice(0,30)))];
		return seededShuffle(merged, _drillShuffleSeed + ":next");
	}, [genNextStepData]);

	// Scenario indices — default to date-offset; useEffect loads persisted position once uid ready
	const [sentimentIdx, setSentimentIdx] = useState(0);
	const [nextStepIdx, setNextStepIdx] = useState(0);

	// Load persisted drill state from localStorage once uid resolves (avoids stale "anon" reads)
	const drillStateLoadedRef = useRef(false);
	useEffect(() => {
		if (!_drillUid || drillStateLoadedRef.current) return;
		drillStateLoadedRef.current = true;
		try {
			const xp = Number(localStorage.getItem(`stak:drill:xp:${_drillUid}:${_drillDayKey}`) ?? 0);
			if (xp > 0) setDrillXpToday(xp);
		} catch {}
		try {
			const saved = JSON.parse(localStorage.getItem(`stak:drill:idx:${_drillUid}:${_drillDayKey}`) ?? "null");
			if (saved && typeof saved.sentiment === "number") setSentimentIdx(saved.sentiment);
			if (saved && typeof saved.nextStep === "number") setNextStepIdx(saved.nextStep);
			if (saved && typeof saved.round === "number" && saved.round > 0) {
				setStockIdx(saved.round);
				setSessionIdx(saved.round);
				setSessionStarted(true);
			}
			if (saved?.done === true) {
				setShowSummary(true);
				setSessionStarted(true);
			}
		} catch {}
	}, [_drillUid, _drillDayKey]);

	const currentRoundType = getRoundType(sessionIdx);
	// Guard against empty pool — PRACTICE_TICKERS is non-empty so this only fires in dev
	const stock = stockList.length > 0 ? stockList[stockIdx % stockList.length]! : { ticker: "SPY", name: "S&P 500", prompt: "" };

	const { data: stockData, isLoading } = useQuery({
		queryKey: ["stock", stock.ticker],
		queryFn: () => getStockData(stock.ticker),
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});

	const quote = stockData?.quote;
	const metrics = stockData?.metrics;

	// ── Award XP helper — ref guard prevents double-fire on rapid taps ───────────
	const xpAwardedThisRound = useRef(false);
	const drillXpTodayRef = useRef(drillXpToday);
	drillXpTodayRef.current = drillXpToday;
	const awardXp = (xp: number, skill: string, isCorrectRound: boolean) => {
		if (xpAwardedThisRound.current) return; // block double-tap
		if (drillXpTodayRef.current >= DAILY_DRILL_XP_CAP) {
			// Daily cap hit — still count the answer but award no XP
			if (isCorrectRound) setCorrectCount(c => c + 1);
			xpAwardedThisRound.current = true;
			return;
		}
		xpAwardedThisRound.current = true;
		const remaining = DAILY_DRILL_XP_CAP - drillXpTodayRef.current;
		const actualXp = Math.min(xp, remaining);
		setDrillXpToday(prev => {
			const next = prev + actualXp;
			if (_drillXpLsKey) try { localStorage.setItem(_drillXpLsKey, String(next)); } catch {}
			return next;
		});
		showXp(actualXp);
		setSessionXp(prev => prev + actualXp);
		setSessionSkillXp(prev => ({ ...prev, [skill]: (prev[skill] ?? 0) + actualXp }));
		if (isCorrectRound) setCorrectCount(c => c + 1);
		addPracticeSkillXp(skill, actualXp).then(serverXp => {
			const diff = actualXp - serverXp;
			if (diff > 0) {
				setDrillXpToday(prev => Math.max(0, prev - diff));
				setSessionXp(prev => Math.max(0, prev - diff));
				setSessionSkillXp(prev => ({ ...prev, [skill]: Math.max(0, (prev[skill] ?? 0) - diff) }));
				if (_drillXpLsKey) try { localStorage.setItem(_drillXpLsKey, String(Math.max(0, drillXpTodayRef.current - diff))); } catch {}
			}
		}).catch(() => {});
	};

	// ── Advance to next round ────────────────────────────────────────────────────
	const advanceRound = (nextSentimentIdx?: number, nextNextStepIdx?: number) => {
		const nextSession = sessionIdx + 1;
		const nextStockIdx = stockIdx + 1;

		// Show summary after going through all stocks — mark done in localStorage
		if (nextStockIdx >= stockList.length) {
			setShowSummary(true);
			if (_drillIdxLsKey) try {
				const saved = JSON.parse(localStorage.getItem(_drillIdxLsKey) ?? "{}");
				localStorage.setItem(_drillIdxLsKey, JSON.stringify({ ...saved, done: true }));
			} catch {}
			return;
		}

		setSessionIdx(nextSession);
		setStockIdx(nextStockIdx);

		// Persist round so user can resume if they close the app
		if (_drillIdxLsKey) try {
			const saved = JSON.parse(localStorage.getItem(_drillIdxLsKey) ?? "{}");
			const update: Record<string, unknown> = { ...saved, round: nextStockIdx };
			if (nextSentimentIdx !== undefined) update.sentiment = nextSentimentIdx;
			if (nextNextStepIdx !== undefined) update.nextStep = nextNextStepIdx;
			localStorage.setItem(_drillIdxLsKey, JSON.stringify(update));
		} catch {}

		// Reset round state
		xpAwardedThisRound.current = false;
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
						<p className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-[4px]">Skill Drills Complete</p>
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
							// Advance indices so "Practice Again" shows the next set of scenarios
							const newSentIdx = sentimentIdx + 1;
							const newNsIdx = nextStepIdx + 1;
							setSentimentIdx(newSentIdx);
							setNextStepIdx(newNsIdx);
							if (_drillIdxLsKey) try { localStorage.setItem(_drillIdxLsKey, JSON.stringify({ sentiment: newSentIdx, nextStep: newNsIdx, round: 0 })); } catch {}
							xpAwardedThisRound.current = false;
							setSessionIdx(0); setStockIdx(0); setShowSummary(false);
							setSessionXp(0); setSessionSkillXp({}); setCorrectCount(0);
							setOtherPhase("question"); setOtherSelected(null); setOtherCorrect(false);
							setSessionStarted(true);
						}}
							className="w-full h-[44px] rounded-[12px] font-medium text-[14px] border border-foreground/10 dark:text-slate-400 text-slate-500 active:opacity-80">
							Practice Again
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ── Home screen (shown before session starts) ────────────────────────────────
	if (!sessionStarted) {
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<BackBtn onClick={onBack} />
					<h2 className="text-[22px] font-extrabold mb-[4px]">Skill Drills</h2>
					<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[24px]">Quick questions to sharpen your investing instincts</p>

					<button
						type="button"
						onClick={() => setSessionStarted(true)}
						className="w-full h-[52px] rounded-[14px] font-bold text-[16px] text-white active:opacity-80"
						style={{ background: "linear-gradient(90deg,#10b981,#3b82f6)" }}
					>
						Start Drills →
					</button>
				</div>
			</div>
		);
	}

	// ── Header shared across all round types ─────────────────────────────────────
	const ROUND_LABELS: Record<RoundType, string> = {
		sentiment: "Bullish, Bearish, or Mixed?",
		nextstep: "What Should You Check Next?",
	};

	const isUp = (quote?.changePercent ?? 0) >= 0;

	// ────────────────────────────────────────────────────────────────────────────
	// Helper: rotateOptions — used by sentiment/nextstep rounds
	// Rotate options so the correct answer isn't always position 0
	function rotateOptions(options: string[], correctIdx: number, seed: number) {
		const n = options.length;
		const offset = seed % n;
		const rotated = [...options.slice(offset), ...options.slice(0, offset)];
		const newCorrectIdx = (correctIdx - offset + n) % n;
		return { opts: rotated.map((text, i) => ({ id: String(i), text })), correctId: String(newCorrectIdx) };
	}

	// ────────────────────────────────────────────────────────────────────────────
	// ────────────────────────────────────────────────────────────────────────────
	// ROUND TYPE 1: "Spot the Signal"
	// ────────────────────────────────────────────────────────────────────────────
	// ────────────────────────────────────────────────────────────────────────────
	// ROUND TYPE 1: "Bullish, Bearish, or Mixed?"
	// ────────────────────────────────────────────────────────────────────────────
	if (currentRoundType === "sentiment") {
		const sc = allSentimentScenarios[sentimentIdx % allSentimentScenarios.length]!;
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
										const xp = correct ? 3 : 1;
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
						onClick={() => {
							const next = sentimentIdx + 1;
							setSentimentIdx(next);
							advanceRound(next, undefined);
						}}
						className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
						style={{ background: "linear-gradient(90deg,#3b82f6,#6366f1)" }}>
						{stockIdx + 1 >= stockList.length ? "See Results" : "Next Round →"}
					</button>
				</div>
			</div>
		);
	}

	// ────────────────────────────────────────────────────────────────────────────
	// ROUND TYPE 3: "What Should You Check Next?"
	// ────────────────────────────────────────────────────────────────────────────
	if (currentRoundType === "nextstep") {
		const sc = allNextStepScenarios[nextStepIdx % allNextStepScenarios.length]!;
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
										const xp = correct ? 3 : 1;
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
						onClick={() => {
							const next = nextStepIdx + 1;
							setNextStepIdx(next);
							advanceRound(undefined, next);
						}}
						className="w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white active:opacity-80"
						style={{ background: "linear-gradient(90deg,#8b5cf6,#3b82f6)" }}>
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
	const { data: allBrandsList } = useBrandsList();
	const allBrands = useMemo(() => allBrandsList ?? [], [allBrandsList]);
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
	}, [phase, slotPicks, allBrands]);

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

// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
	if (prices.length < 2) return null;
	const min = Math.min(...prices);
	const max = Math.max(...prices);
	const range = max - min || 1;
	const W = 60, H = 26;
	const pts = prices
		.map((p, i) => `${(i / (prices.length - 1)) * W},${H - ((p - min) / range) * H}`)
		.join(" ");
	const color = positive ? "#34d399" : "#f87171";
	return (
		<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible shrink-0">
			<polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

// ── Sandbox Portfolio ─────────────────────────────────────────

const sandboxBudgetForXp = (xp: number) => SANDBOX_BUDGETS[xpToTier(xp)];
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
	const { data: allBrandsList } = useBrandsList();
	const allBrands = useMemo(() => allBrandsList ?? [], [allBrandsList]);

	// Screen state: null = portfolio list, string = stock detail ticker
	const [activeStock, setActiveStock] = useState<string | null>(null);
	// Order sheet: "buy" | "sell" | null
	const [orderAction, setOrderAction] = useState<"buy" | "sell" | null>(null);
	// Search overlay
	const [showSearch, setShowSearch] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	// Order quantity
	const [orderQty, setOrderQty] = useState<number>(0);
	const [orderQtyStr, setOrderQtyStr] = useState<string>(""); // raw input text — keeps "0." alive while typing decimals
	const [orderMode, setOrderMode] = useState<"shares" | "amount">("shares");
	const [orderAmount, setOrderAmount] = useState<number>(0); // 0 shows greyed placeholder
	// Reset confirm
	const [confirmReset, setConfirmReset] = useState(false);

	const sandbox = account?.sandboxPortfolio ?? {};
	const tickers = Object.keys(sandbox);

	// Brand lookup map
	const brandMap = useMemo(() => new Map(allBrands.map(b => [b.ticker?.toUpperCase(), b])), [allBrands]);

	// Initialise cash on first open
	useEffect(() => { initSandboxCash(); }, [initSandboxCash]);

	const sandboxTotalXp = account?.totalXp ?? 0;
	const sandboxCash = account?.sandboxCash ?? sandboxBudgetForXp(sandboxTotalXp);

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

	// Sparkline data for each holding (1-month, batched)
	const sparklineResults = useQueries({
		queries: tickers.map(ticker => ({
			queryKey: ["stock-chart", ticker, "1m"],
			queryFn: () => getStockChart(ticker, "1m"),
			staleTime: 4 * 60 * 60 * 1000,
			retry: 1,
		})),
	});
	const sparklineMap = useMemo(() => {
		const map = new Map<string, number[]>();
		tickers.forEach((ticker, i) => {
			const pts = (sparklineResults[i]?.data?.prices ?? []).map(p => p.close);
			if (pts.length > 1) map.set(ticker, pts);
		});
		return map;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tickers, sparklineResults.length, sparklineResults.filter(r => r.isSuccess).length]);

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
	const activeTodayChange = activeStockData?.quote?.change ?? null;

	const [chartRange, setChartRange] = useState<ChartRange>("1d");
	const { data: chartData, isLoading: chartLoading } = useQuery({
		queryKey: ["stock-chart", activeStock ?? "", chartRange],
		queryFn: () => getStockChart(activeStock!, chartRange),
		staleTime: 4 * 60 * 60 * 1000,
		retry: 1,
		enabled: activeStock !== null,
	});

	// Handle add (buy) — accepts ticker, shares, price directly
	// Portfolio-level chart
	const [portfolioChartRange, setPortfolioChartRange] = useState<ChartRange>("1d");

	// The portfolio "started" when the earliest holding was added. After a reset holdings are empty,
	// so startMs returns Date.now() and any historical data is filtered out automatically.
	const portfolioStartMs = useMemo(
		() => holdings.length > 0 ? Math.min(...holdings.map(h => h.entry.addedAt)) : Date.now(),
		[holdings],
	);

	const portfolioChartQueries = useQueries({
		queries: tickers.map(ticker => ({
			queryKey: ["stock-chart", ticker, portfolioChartRange],
			queryFn: () => getStockChart(ticker, portfolioChartRange),
			staleTime: 4 * 60 * 60 * 1000,
			retry: 1,
			enabled: investedTotal > 0,
		})),
	});
	const portfolioChartLoading = portfolioChartQueries.some(q => q.isLoading);

	const portfolioChartData = useMemo(() => {
		const now = new Date().toISOString();

		// No investments → single flat point (triggers "buy first stock" state)
		if (investedTotal <= 0) return [{ ts: now, value: totalPortfolioValue }];

		const tickerPts = tickers.map((t, i) => ({ ticker: t, points: portfolioChartQueries[i]?.data?.prices ?? [] }));
		const base = tickerPts.reduce((best, t) => t.points.length > best.points.length ? t : best, { ticker: "", points: [] as { ts: string; close: number }[] });

		if (base.points.length === 0) return [{ ts: now, value: totalPortfolioValue }];

		// Cost-basis total = what the portfolio was worth at first purchase (flat before that)
		const flatStartVal = Math.round((sandboxCash + investedTotal) * 100) / 100;

		const mapped = base.points.map(point => {
			const pointMs = new Date(point.ts).getTime();
			if (pointMs < portfolioStartMs) return { ts: point.ts, value: flatStartVal };
			let value = sandboxCash;
			tickers.forEach((ticker, i) => {
				const h = holdings.find(h => h.ticker === ticker);
				if (!h) return;
				const pts = tickerPts[i]!.points;
				let price: number | null = null;
				for (let j = pts.length - 1; j >= 0; j--) {
					if (pts[j]!.ts <= point.ts) { price = pts[j]!.close; break; }
				}
				value += h.shares * (price ?? h.entry.priceAtAdd ?? h.currentPrice ?? 0);
			});
			return { ts: point.ts, value: Math.round(value * 100) / 100 };
		});
		// Always append the live portfolio value so the chart ends at the current price,
		// not at the last closed bar (which can be hours old for 1W/1M ranges).
		mapped.push({ ts: now, value: Math.round(totalPortfolioValue * 100) / 100 });
		return mapped;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tickers, sandboxCash, investedTotal, totalPortfolioValue, portfolioChartRange, portfolioChartLoading, portfolioStartMs]);

	const handleAdd = async (ticker: string, shares: number, _price: number | null) => {
		await addToSandbox(ticker.toUpperCase(), shares);
	};

	// Close order sheet helper
	const closeOrder = () => {
		setOrderAction(null);
		setOrderQty(0);
		setOrderQtyStr("");
		setOrderAmount(0);
		setOrderMode("shares");
	};

	// Confirm buy — uses effectiveShares which accounts for amount mode
	const confirmBuy = async () => {
		if (!activeStock || !activePrice) return;
		const qty = orderMode === "amount"
			? roundShares(orderAmount / activePrice)
			: orderQty;
		const cost = activePrice * qty;
		if (cost > sandboxCash || qty <= 0) return;
		try {
			await handleAdd(activeStock, qty, activePrice);
			closeOrder();
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Order failed";
			import("sonner").then(({ toast }) => toast.error(msg));
		}
	};

	// Confirm sell
	const confirmSellOrder = async () => {
		if (!activeStock) return;
		const holding = holdings.find(h => h.ticker === activeStock);
		if (!holding) return;
		const totalShares = holding.shares;
		const sellShares = orderQty;
		let result: { sellValue: number; price: number; sharesToSell: number; remaining: number };
		try {
			result = await sellFromSandbox(activeStock, sellShares);
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Sell failed";
			import("sonner").then(({ toast }) => toast.error(msg));
			return;
		}
		closeOrder();
		const remainingShares = roundShares(totalShares - sellShares);
		if (remainingShares <= 0) {
			setActiveStock(null);
		}
		const sellValue = result.sellValue;
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
			? roundShares(orderAmount / price)
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
							<div className="flex items-center justify-center mb-[8px]">
								<input
									type="text"
									inputMode="decimal"
									autoFocus
									placeholder="0"
									value={orderQtyStr}
									onChange={e => {
										const raw = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
										setOrderQtyStr(raw);
										if (raw === "" || raw === ".") { setOrderQty(0); return; }
										const v = parseFloat(raw);
										if (!isNaN(v)) setOrderQty(roundShares(v));
									}}
									className="w-[160px] text-center text-[40px] font-extrabold bg-transparent text-foreground outline-none border-b-2 border-foreground/15 pb-[2px] placeholder:text-foreground/25"
								/>
							</div>
							<p className="text-[13px] dark:text-slate-400 text-slate-500 text-center mb-[16px]">shares</p>
						</>
					) : (
						<>
							<div className="flex items-center justify-center gap-[10px] mb-[8px]">
								<span className={`text-[36px] font-extrabold ${orderAmount > 0 ? "dark:text-slate-400 text-slate-400" : "text-foreground/25"}`}>$</span>
								<input
									type="text"
									inputMode="decimal"
									autoFocus
									placeholder="0"
									value={orderAmount > 0 ? String(orderAmount) : ""}
									onChange={e => {
										// Allow clearing — only digits and one decimal point
										const raw = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
										if (raw === "" || raw === ".") { setOrderAmount(0); return; }
										const v = parseFloat(raw);
										if (!isNaN(v)) setOrderAmount(Math.round(v * 100) / 100);
									}}
									className="w-[160px] text-center text-[40px] font-extrabold bg-transparent text-foreground outline-none border-b-2 border-foreground/15 pb-[2px] placeholder:text-foreground/25"
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
		const inPortfolio = !!holding;

		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[120px]">
					<BackBtn onClick={() => { setActiveStock(null); setOrderAction(null); }} label="Portfolio" />
					<div className="flex items-center gap-[14px] mb-[24px]">
						{brand ? (
							<BrandLogo brand={brand} className="w-[52px] h-[52px] rounded-full" />
						) : (
							<div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-white shadow-md overflow-hidden">
								<img src={`https://financialmodelingprep.com/image-stock/${activeStock}.png`} alt="" className="w-[38px] h-[38px] object-contain"
									onError={e => {
										const img = e.target as HTMLImageElement;
										img.style.display = "none";
										(img.parentElement as HTMLElement).innerHTML = `<span class="text-[14px] font-bold text-slate-600">${activeStock.slice(0, 2)}</span>`;
									}} />
							</div>
						)}
						<div>
							<p className="text-[20px] font-extrabold leading-tight">{name}</p>
							<p className="text-[13px] dark:text-slate-400 text-slate-500">{activeStock}</p>
						</div>
					</div>
					<div className="mb-[20px]">
						{activePrice != null ? (
							<>
								<p className="text-[44px] font-extrabold leading-none mb-[4px]">
									${activePrice.toFixed(2)}
								</p>
								{chartRange === "1d" ? (
									<>
										{activeTodayPct != null && (
											<p className={`text-[15px] font-semibold ${activeTodayPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
												{activeTodayPct >= 0 ? "▲" : "▼"} {activeTodayChange != null ? `$${Math.abs(activeTodayChange).toFixed(2)} (` : ""}{activeTodayPct >= 0 ? "+" : ""}{activeTodayPct.toFixed(2)}%{activeTodayChange != null ? ")" : ""} today
											</p>
										)}
										{(() => {
											const q = activeStockData?.quote;
											const ms = q?.marketState;
											const ep = q?.extendedPrice;
											const ec = q?.extendedChange;
											const ecp = q?.extendedChangePercent;
											if (!ep || (!ec && ec !== 0)) return null;
											const label = ms === "PRE" || ms === "PREPRE" ? "Pre-market" : "After-hours";
											const up = ec >= 0;
											return (
												<p className={`text-[13px] font-semibold mt-[2px] ${up ? "text-emerald-400/80" : "text-rose-400/80"}`}>
													{up ? "▲" : "▼"} ${Math.abs(ec).toFixed(2)} ({ecp != null ? `${(ecp * 100).toFixed(2)}%` : ""}) {label}
												</p>
											);
										})()}
									</>
								) : (() => {
									const prices = chartData?.prices ?? [];
									const first = prices[0]?.close;
									const last = prices[prices.length - 1]?.close;
									if (!first || !last) return null;
									const rd = last - first;
									const rp = ((last - first) / first) * 100;
									const RLABELS: Record<ChartRange, string> = { "1d": "Today", "1w": "Past week", "1m": "Past month", "3m": "Past 3 months", "ytd": "Year to date", "1y": "Past year" };
									return (
										<p className={`text-[15px] font-semibold ${rp >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
											{rp >= 0 ? "▲" : "▼"} ${Math.abs(rd).toFixed(2)} ({rp >= 0 ? "+" : ""}{rp.toFixed(2)}%) <span className="text-[13px] font-normal dark:text-slate-400 text-slate-500">{RLABELS[chartRange]}</span>
										</p>
									);
								})()}
							</>
						) : (
							<p className="text-[20px] font-bold dark:text-slate-400 text-slate-500">Loading…</p>
						)}
					</div>

					{/* Price chart */}
					{(() => {
						const prices = chartData?.prices ?? [];
						const isUp = prices.length >= 2 && prices[prices.length - 1]!.close >= prices[0]!.close;
						const color = isUp ? "#34d399" : "#f87171";

						const RANGE_LABELS: Record<ChartRange, string> = { "1d": "Today", "1w": "Past week", "1m": "Past month", "3m": "Past 3 months", "ytd": "Year to date", "1y": "Past year" };

						const fmtLabel = (ts: string) => {
							const d = new Date(ts);
							if (chartRange === "1d") {
								const s = prices.find(p => p.ts === ts)?.session;
								const sfx = s === "pre" ? " · Pre-market" : s === "post" ? " · After-hours" : "";
								return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) + sfx;
							}
							if (chartRange === "1w") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
							return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
						};

						// Session boundary reference lines (still useful on 1d/1w even without color difference)
						const sessionBoundaries: string[] = [];
						if (chartRange === "1d" || chartRange === "1w") {
							for (let i = 1; i < prices.length; i++) {
								const prev = prices[i - 1]!.session ?? "regular";
								const curr = prices[i]!.session ?? "regular";
								if (prev !== curr) sessionBoundaries.push(prices[i]!.ts);
							}
						}

						const RANGES: ChartRange[] = ["1d", "1w", "1m", "3m", "ytd", "1y"];

						return (
							<div className="mb-[20px]">
								{chartLoading ? (
									<div className="h-[140px] rounded-[14px] bg-surface-1 animate-pulse" />
								) : prices.length > 1 ? (
									<div className="rounded-[14px] overflow-hidden bg-surface-1 px-[2px] pt-[10px] pb-[2px]">
										<ResponsiveContainer width="100%" height={130}>
											<AreaChart data={prices} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
												<defs>
													<linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor={color} stopOpacity={0.2} />
														<stop offset="95%" stopColor={color} stopOpacity={0} />
													</linearGradient>
												</defs>
												<YAxis domain={["auto", "auto"]} hide />
												<Tooltip
													contentStyle={{ background: "var(--surface-2,#1e293b)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, padding: "6px 10px" }}
													labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 2 }}
													formatter={(v: number) => [`$${v.toFixed(2)}`, ""]}
													labelFormatter={(_, payload) => payload?.[0]?.payload?.ts ? fmtLabel(payload[0].payload.ts) : ""}
												/>
												{sessionBoundaries.map(ts => (
													<ReferenceLine key={ts} x={ts} stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" strokeWidth={1} />
												))}
												<Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#chartFill)" dot={false} activeDot={{ r: 4, fill: color }} />
											</AreaChart>
										</ResponsiveContainer>
									</div>
								) : (
									<div className="h-[130px] flex items-center justify-center rounded-[14px] bg-surface-1">
										<p className="text-[12px] dark:text-slate-500 text-slate-400">No chart data</p>
									</div>
								)}
								{/* Range selector */}
								<div className="flex justify-between mt-[10px] px-[2px]">
									{RANGES.map(r => (
										<button
											key={r}
											type="button"
											onClick={() => setChartRange(r)}
											className={`flex-1 py-[5px] text-[11px] font-bold rounded-full transition-colors ${chartRange === r ? "bg-violet-500/20 text-violet-400" : "dark:text-slate-500 text-slate-400"}`}
										>
											{r.toUpperCase()}
										</button>
									))}
								</div>
							</div>
						);
					})()}
					{inPortfolio && holding ? (
						<div className="rounded-[16px] border border-foreground/10 bg-surface-1 px-[18px] py-[16px] mb-[20px]">
							<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[14px] font-semibold">Your Position</p>
							<div className="grid grid-cols-2 gap-[14px]">
								<div>
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mb-[2px]">Shares</p>
									<p className="text-[18px] font-extrabold">{holding.shares}</p>
								</div>
								<div>
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mb-[2px]">Avg cost</p>
									<p className="text-[18px] font-extrabold">
										{holding.entry.priceAtAdd != null ? `$${holding.entry.priceAtAdd.toFixed(2)}` : "—"}
									</p>
								</div>
								<div>
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mb-[2px]">Market value</p>
									<p className="text-[18px] font-extrabold">${holding.currentValue.toFixed(2)}</p>
								</div>
								<div>
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mb-[2px]">Portfolio diversity</p>
									<p className="text-[18px] font-extrabold">
										{totalPortfolioValue > 0 ? `${((holding.currentValue / totalPortfolioValue) * 100).toFixed(1)}%` : "—"}
									</p>
								</div>
								<div>
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mb-[2px]">Total return</p>
									{(() => {
										const d = holding.priceDollar ?? 0;
										const p = holding.pricePct;
										const up = d >= 0;
										return (
											<p className={`text-[15px] font-extrabold ${up ? "text-emerald-400" : "text-rose-400"}`}>
												{up ? "+" : "-"}${Math.abs(d).toFixed(2)}{p != null ? ` (${up ? "+" : ""}${p.toFixed(2)}%)` : ""}
											</p>
										);
									})()}
								</div>
								<div>
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mb-[2px]">Today's return</p>
									{(() => {
										// Robinhood style: always (current price - previous close) × shares
										const d = activeTodayChange != null ? holding.shares * activeTodayChange : null;
										const p = activeTodayPct;
										if (d == null) return <p className="text-[15px] font-extrabold dark:text-slate-400 text-slate-500">—</p>;
										const up = d >= 0;
										return (
											<p className={`text-[15px] font-extrabold ${up ? "text-emerald-400" : "text-rose-400"}`}>
												{up ? "+" : "-"}${Math.abs(d).toFixed(2)}{p != null ? ` (${up ? "+" : ""}${p.toFixed(2)}%)` : ""}
											</p>
										);
									})()}
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
							onClick={() => { setOrderQty(0); setOrderAction("buy"); }}
							className="h-[52px] rounded-[14px] font-bold text-[16px] text-white active:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
							style={{ background: "linear-gradient(90deg,#7c3aed,#6366f1)" }}
						>
							Buy
						</button>
						{inPortfolio && (
							<button
								type="button"
								onClick={() => { setOrderQty(0); setOrderAction("sell"); }}
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
				{/* Portfolio overview + chart */}
				{(() => {
					const firstVal = portfolioChartData[0]?.value;
					const lastVal = portfolioChartData[portfolioChartData.length - 1]?.value;
					const chartPct = firstVal && lastVal ? ((lastVal - firstVal) / firstVal) * 100 : null;
					const chartDollar = firstVal && lastVal ? lastVal - firstVal : null;
					// Color based on range performance (like Robinhood), not all-time P&L
					const chartColor = (chartDollar ?? totalDollarPnl) >= 0 ? "#34d399" : "#f87171";
					const PRANGES: ChartRange[] = ["1d", "1w", "1m", "3m", "ytd", "1y"];
					const fmtLabel = (ts: string) => {
						const d = new Date(ts);
						if (portfolioChartRange === "1d") return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
						if (portfolioChartRange === "1w") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
						return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
					};
					return (
						<div className="mt-[16px] mb-[20px]">
							<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[2px] font-medium">Portfolio Value</p>
							<p className="text-[38px] font-extrabold leading-none mb-[2px]">
								${totalPortfolioValue.toFixed(2)}
							</p>
							{(() => {
								const PLABELS: Record<ChartRange, string> = { "1d": "Today", "1w": "Past week", "1m": "Past month", "3m": "Past 3 months", "ytd": "Year to date", "1y": "Past year" };
								if (investedTotal <= 0) return <p className="text-[14px] font-semibold mb-[10px] text-emerald-400">$0.00 (0.00%) <span className="dark:text-slate-400 text-slate-500 font-normal">{PLABELS[portfolioChartRange]}</span></p>;
								if (chartPct == null || chartDollar == null) return <div className="mb-[10px]" />;
								return (
									<p className={`text-[14px] font-semibold mb-[10px] ${chartPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
										{chartPct >= 0 ? "▲" : "▼"} ${Math.abs(chartDollar).toFixed(2)} ({chartPct >= 0 ? "+" : ""}{chartPct.toFixed(2)}%) <span className="dark:text-slate-400 text-slate-500 font-normal">{PLABELS[portfolioChartRange]}</span>
									</p>
								);
							})()}
							{/* Chart — always shown, flat line when no holdings */}
							{portfolioChartLoading && investedTotal > 0 ? (
								<div className="h-[150px] rounded-[14px] bg-surface-1 animate-pulse mb-[6px]" />
							) : portfolioChartData.length > 1 ? (
								<div className="rounded-[14px] overflow-hidden bg-surface-1 px-[2px] pt-[10px] pb-[2px] mb-[4px]">
									<ResponsiveContainer width="100%" height={140}>
										<AreaChart data={portfolioChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
											<defs>
												<linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
													<stop offset="95%" stopColor={chartColor} stopOpacity={0} />
												</linearGradient>
											</defs>
											<YAxis domain={["auto", "auto"]} hide />
											<Tooltip
												contentStyle={{ background: "var(--surface-2,#1e293b)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, padding: "6px 10px" }}
												labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 2 }}
												formatter={(v: number) => [`$${v.toFixed(2)}`, "Portfolio"]}
												labelFormatter={(_, payload) => payload?.[0]?.payload?.ts ? fmtLabel(payload[0].payload.ts) : ""}
											/>
											<Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="url(#portfolioFill)" dot={false} activeDot={{ r: 4, fill: chartColor }} />
										</AreaChart>
									</ResponsiveContainer>
								</div>
							) : (
								/* Flat line — no investments yet or just reset */
								<div className="h-[80px] flex flex-col items-center justify-center rounded-[14px] bg-surface-1 mb-[4px]">
									<div className="w-full h-[2px] bg-emerald-400/40 mx-[16px]" style={{ width: "calc(100% - 32px)" }} />
									<p className="text-[11px] dark:text-slate-500 text-slate-400 mt-[10px]">
										{investedTotal <= 0 ? "Buy your first stock to see your chart" : "Not enough data for this range yet"}
									</p>
								</div>
							)}
							<div className="flex justify-between px-[2px] mb-[16px]">
								{PRANGES.map(r => (
									<button key={r} type="button" onClick={() => setPortfolioChartRange(r)}
										className={`flex-1 py-[5px] text-[11px] font-bold rounded-full transition-colors ${portfolioChartRange === r ? "bg-violet-500/20 text-violet-400" : "dark:text-slate-500 text-slate-400"}`}>
										{r.toUpperCase()}
									</button>
								))}
							</div>
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
					);
				})()}
				{/* Holdings list */}
				{tickers.length > 0 ? (
					<div className="space-y-[8px] mb-[24px]">
						{holdings.map(h => {
							return (
								<button
									key={h.ticker}
									type="button"
									onClick={() => { setActiveStock(h.ticker); setChartRange("1d"); }}
									className="w-full flex items-center gap-[12px] rounded-[16px] border border-foreground/10 bg-surface-1 px-[14px] py-[13px] text-left active:opacity-80 transition-opacity"
								>
									{h.brand ? (
										<BrandLogo brand={h.brand} className="w-[40px] h-[40px] rounded-full" />
									) : (
										<div className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full bg-white shadow-sm overflow-hidden">
											<img src={`https://financialmodelingprep.com/image-stock/${h.ticker}.png`} alt="" className="w-[28px] h-[28px] object-contain"
												onError={e => {
													const img = e.target as HTMLImageElement;
													img.style.display = "none";
													(img.parentElement as HTMLElement).innerHTML = `<span class="text-[11px] font-bold text-slate-600">${h.ticker.slice(0, 2)}</span>`;
												}} />
										</div>
									)}
									<div className="flex-1 min-w-0">
										<p className="text-[14px] font-bold leading-tight truncate">{h.brand?.name ?? h.ticker}</p>
										<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px]">
											{h.ticker} · {h.shares} sh
										</p>
									</div>
							{(() => { const pts = sparklineMap.get(h.ticker); return pts ? <Sparkline prices={pts} positive={(h.pricePct ?? 0) >= 0} /> : null; })()}
									<div className="text-right shrink-0">
										<p className="text-[14px] font-extrabold">${h.currentValue.toFixed(2)}</p>
										{h.pricePct != null && (
											<p className={`text-[12px] font-semibold mt-[2px] ${h.pricePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
												{h.pricePct >= 0 ? "+" : ""}{h.pricePct.toFixed(2)}%
											</p>
										)}
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
							Search for a stock to get started with your ${sandboxBudgetForXp(sandboxTotalXp).toLocaleString()} practice cash.
						</p>
						<p className="text-[12px] text-violet-400 font-semibold">Real prices · real shares · no risk</p>
					</div>
				)}
				{/* Reset */}
				{(tickers.length > 0 || sandboxCash !== sandboxBudgetForXp(sandboxTotalXp)) && (
					<div className="mt-[8px] pt-[16px] border-t border-foreground/[0.06]">
						{!confirmReset ? (
							<button type="button" onClick={() => setConfirmReset(true)}
								className="w-full text-[12px] dark:text-slate-500 text-slate-400 text-center active:opacity-70 py-[4px]">
								Reset portfolio to ${sandboxBudgetForXp(sandboxTotalXp).toLocaleString()}
							</button>
						) : (
							<div className="rounded-[12px] border border-rose-500/20 bg-rose-500/[0.06] px-[14px] py-[12px]">
								<p className="text-[12px] font-bold mb-[4px]">Reset to ${sandboxBudgetForXp(sandboxTotalXp).toLocaleString()}?</p>
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
				onClick={() => { setSearchQuery(""); setOrderAction(null); setOrderQty(0); setOrderAmount(0); setOrderMode("shares"); setShowSearch(true); }}
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
								return (
									<button
										key={b.id}
										type="button"
										onClick={() => {
											setShowSearch(false);
											setSearchQuery("");
											setActiveStock(b.ticker!.toUpperCase()); setChartRange("1d");
										}}
										className="w-full flex items-center gap-[13px] py-[13px] border-b border-foreground/[0.05] last:border-b-0 text-left active:bg-foreground/[0.04] transition-colors"
									>
										<BrandLogo brand={b} className="w-[40px] h-[40px] rounded-full" />
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