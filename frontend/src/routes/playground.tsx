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
import { getStockData, trackEvent } from "@/lib/api";
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

	// ── Home screen ───────────────────────────────────────────────────────────
	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">

				{/* Header */}
				<div className="flex items-center gap-[10px] mb-[6px]">
					<StakLogo size={28} />
					<h1 className="text-[26px] font-extrabold tracking-[-0.03em]">Playground</h1>
				</div>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">
					Build your investing brain one card at a time. No real money. No pressure.
				</p>

				{/* XP bar */}
				<div className="flex items-center gap-[12px] mb-[24px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px]">
					<div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] bg-amber-500/15 text-amber-400">
						<Star size={20} />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between mb-[5px]">
							<p className="text-[12px] font-semibold text-foreground">{totalXp} XP earned</p>
							<p className="text-[11px] dark:text-slate-400 text-slate-500">{completedLessons}/{totalLessons} lessons</p>
						</div>
						<div className="h-[5px] rounded-full bg-foreground/10">
							<div
								className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
								style={{ width: `${Math.min(100, (completedLessons / totalLessons) * 100)}%` }}
							/>
						</div>
					</div>
				</div>

				{/* Continue Learning */}
				{nextLesson && (
					<div className="mb-[24px]">
						<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Continue Learning</p>
						<button
							type="button"
							onClick={() => { setActiveLessonId(nextLesson.id); setActiveView("lesson-player"); }}
							className="w-full rounded-[14px] border border-blue-500/30 bg-blue-500/[0.07] px-[16px] py-[14px] text-left active:opacity-80 transition-opacity"
						>
							<div className="flex items-center gap-[12px]">
								<span className="text-[28px]">{nextLesson.emoji}</span>
								<div className="flex-1 min-w-0">
									<p className="text-[14px] font-bold text-foreground">{nextLesson.title}</p>
									<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px]">{nextLesson.durationMin} min · {nextLesson.xp} XP</p>
								</div>
								<span className="shrink-0 text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-blue-500/15 text-blue-400">Continue</span>
							</div>
						</button>
					</div>
				)}

				{/* Daily Challenge */}
				<div className="mb-[24px]">
					<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Today's Challenge</p>
					<button
						type="button"
						onClick={() => setActiveView("daily-challenge")}
						className={`w-full rounded-[14px] border px-[16px] py-[14px] text-left active:opacity-80 transition-opacity ${challengeCompleted ? "border-emerald-500/30 bg-emerald-500/[0.07]" : "border-amber-500/30 bg-amber-500/[0.07]"}`}
					>
						<div className="flex items-center gap-[12px]">
							<div className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[10px] ${challengeCompleted ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
								<Zap size={20} />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-[13px] font-bold text-foreground line-clamp-1">{dailyChallenge.prompt}</p>
								<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px]">+{dailyChallenge.xp} XP</p>
							</div>
							{challengeCompleted
								? <span className="shrink-0 text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-emerald-500/15 text-emerald-400">Done ✓</span>
								: <ChevronRight size={16} className="shrink-0 text-amber-400" />
							}
						</div>
					</button>
				</div>

				{/* All Sections */}
				<p className="text-[11px] font-semibold uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[10px]">Explore</p>
				<div className="space-y-[10px]">
					<SectionCard
						colorKey="lessons"
						icon={<BookOpen size={22} />}
						title="Lesson Library"
						subtitle={`${totalLessons} lessons across 7 categories`}
						badge={`${completedLessons} done`}
						onClick={() => setActiveView("lessons")}
					/>
					<SectionCard
						colorKey="battles"
						icon={<Swords size={22} />}
						title="Stock Battles"
						subtitle={`${STOCK_BATTLES.length} head-to-head matchups with live data`}
						onClick={() => setActiveView("battles")}
					/>
					<SectionCard
						colorKey="earnings"
						icon={<FlaskConical size={22} />}
						title="Earnings Lab"
						subtitle={`${EARNINGS_SCENARIOS.length} earnings scenarios — learn why stocks react`}
						onClick={() => setActiveView("earnings-lab")}
					/>
					<SectionCard
						colorKey="risk"
						icon={<ShieldAlert size={22} />}
						title="Risk Lab"
						subtitle="Which stock is riskier? Learn to spot risk"
						onClick={() => setActiveView("risk-lab")}
					/>
					<SectionCard
						colorKey="mood"
						icon={<Brain size={22} />}
						title="Market Mood Simulator"
						subtitle={`${MOOD_SCENARIOS.length} macro scenarios — rates, inflation, AI & more`}
						onClick={() => setActiveView("mood-simulator")}
					/>
					<SectionCard
						colorKey="practice"
						icon={<TrendingUp size={22} />}
						title="Practice Mode"
						subtitle="Real stocks. Fake stakes. Train your instincts."
						onClick={() => setActiveView("practice")}
					/>
					<SectionCard
						colorKey="mood"
						icon={<Brain size={22} />}
						title="What Would You Do?"
						subtitle={`${WWYD_SCENARIOS.length} real-world investor decisions`}
						onClick={() => setActiveView("wwyd")}
					/>
					<SectionCard
						colorKey="lessons"
						icon={<Star size={22} />}
						title="Build Your Watchlist"
						subtitle="Guided game — pick 7 stocks to build a balanced starter portfolio"
						onClick={() => setActiveView("watchlist")}
					/>
					<SectionCard
						colorKey="sandbox"
						icon={<Wallet size={22} />}
						title="Sandbox Portfolio"
						subtitle="$10,000 in practice money. Build and track a fake portfolio."
						onClick={() => setActiveView("sandbox")}
					/>
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

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> Back
				</button>
				<h2 className="text-[22px] font-extrabold mb-[4px]">Lesson Library</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">{LESSONS.length} lessons across 7 categories</p>

				{/* Category filter pills */}
				<div className="flex gap-[8px] overflow-x-auto pb-[8px] mb-[20px] [&::-webkit-scrollbar]:hidden">
					<button
						type="button"
						onClick={() => onSelectCategory(null)}
						className={`shrink-0 text-[12px] font-semibold px-[12px] py-[5px] rounded-full border transition-colors ${!selectedCategory ? "bg-foreground text-background border-foreground" : "border-foreground/15 dark:text-slate-400 text-slate-500"}`}
					>All</button>
					{LESSON_CATEGORIES.map(cat => (
						<button
							key={cat.id}
							type="button"
							onClick={() => onSelectCategory(cat.id)}
							className={`shrink-0 text-[12px] font-semibold px-[12px] py-[5px] rounded-full border transition-colors ${selectedCategory === cat.id ? "bg-foreground text-background border-foreground" : "border-foreground/15 dark:text-slate-400 text-slate-500"}`}
						>{cat.emoji} {cat.id}</button>
					))}
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
	onBack,
	onComplete,
}: {
	lessonId: string;
	account: ReturnType<typeof useAccount>["account"];
	onBack: () => void;
	onComplete: () => void;
}) {
	const { completeLesson } = useAccount();
	const lesson = LESSONS.find(l => l.id === lessonId);
	const [cardIndex, setCardIndex] = useState(0);
	const [phase, setPhase] = useState<"cards" | "quiz" | "done">("cards");
	const [selectedOption, setSelectedOption] = useState<string | null>(null);
	const [showResult, setShowResult] = useState(false);
	const alreadyCompleted = !!(account?.lessonProgress?.[lessonId]?.completed);

	if (!lesson) return null;

	const isLastCard = cardIndex === lesson.cards.length - 1;
	const isCorrect = selectedOption === lesson.quiz.correctId;

	const handleNext = () => {
		if (isLastCard) { setPhase("quiz"); return; }
		setCardIndex(i => i + 1);
	};

	const handleAnswer = async (optionId: string) => {
		if (showResult) return;
		setSelectedOption(optionId);
		setShowResult(true);
		if (!alreadyCompleted) {
			await completeLesson(lesson.id, lesson.xp);
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
					<div className="flex-1 flex flex-col items-center justify-center text-center gap-[12px]">
						<span className="text-[64px]">🎉</span>
						<h2 className="text-[22px] font-extrabold">Lesson Complete!</h2>
						<p className="dark:text-slate-400 text-slate-500 text-[14px]">You earned <span className="text-amber-400 font-bold">+{lesson.xp} XP</span></p>
					</div>
				) : phase === "cards" ? (
					<div className="flex-1 flex flex-col">
						<div className="flex-1 rounded-[18px] border border-foreground/10 bg-surface-1 p-[24px] flex flex-col">
							<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[12px]">
								Card {cardIndex + 1} of {lesson.cards.length}
							</p>
							<h2 className="text-[20px] font-extrabold mb-[16px] leading-snug">{lesson.cards[cardIndex]!.heading}</h2>
							<p className="text-[15px] dark:text-slate-300 text-slate-600 leading-relaxed flex-1">{lesson.cards[cardIndex]!.body}</p>
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
							<div className="space-y-[10px] flex-1">
								{lesson.quiz.options.map(opt => {
									const isSelected = selectedOption === opt.id;
									const isRight = opt.id === lesson.quiz.correctId;
									let cls = "border-foreground/10 bg-surface-1";
									if (showResult) {
										if (isRight) cls = "border-emerald-500/60 bg-emerald-500/10";
										else if (isSelected) cls = "border-rose-500/60 bg-rose-500/10";
									} else if (isSelected) cls = "border-blue-500/60 bg-blue-500/10";
									return (
										<button
											key={opt.id}
											type="button"
											onClick={() => handleAnswer(opt.id)}
											className={`w-full text-left px-[16px] py-[14px] rounded-[12px] border text-[14px] font-medium transition-colors ${cls}`}
										>
											{opt.text}
											{showResult && isRight && <span className="ml-2 text-emerald-400">✓</span>}
											{showResult && isSelected && !isRight && <span className="ml-2 text-rose-400">✗</span>}
										</button>
									);
								})}
							</div>
							{showResult && (
								<div className={`mt-[16px] rounded-[12px] p-[14px] ${isCorrect ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-rose-500/10 border border-rose-500/25"}`}>
									<p className="text-[13px] font-bold mb-[4px] ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}">{isCorrect ? "Correct! 🎉" : "Not quite."}</p>
									<p className="text-[12px] dark:text-slate-300 text-slate-600">{lesson.quiz.explanation}</p>
								</div>
							)}
						</div>
						{showResult && (
							<button
								type="button"
								onClick={handleFinish}
								className="mt-[16px] w-full h-[48px] rounded-[12px] font-semibold text-[15px] text-white shadow-lg active:opacity-80"
								style={{ background: "linear-gradient(90deg,#10b981,#3b82f6)" }}
							>
								Finish · +{lesson.xp} XP
							</button>
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

				<div className="space-y-[10px] mb-[16px]">
					{challenge.options.map(opt => {
						const isSelected = selected === opt.id || (alreadyCompleted && opt.id === challenge.correctId);
						const isRight = opt.id === challenge.correctId;
						let cls = "border-foreground/10 bg-surface-1";
						if (showResult) {
							if (isRight) cls = "border-emerald-500/60 bg-emerald-500/10";
							else if (isSelected && !isRight) cls = "border-rose-500/60 bg-rose-500/10";
						}
						return (
							<button
								key={opt.id}
								type="button"
								onClick={() => handleAnswer(opt.id)}
								className={`w-full text-left px-[16px] py-[14px] rounded-[12px] border text-[14px] font-medium transition-colors ${cls}`}
							>
								{opt.text}
								{showResult && isRight && <span className="ml-2 text-emerald-400">✓</span>}
								{showResult && isSelected && !isRight && <span className="ml-2 text-rose-400">✗</span>}
							</button>
						);
					})}
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

function BattleDetail({ battleId, onBack }: { battleId: string; onBack: () => void }) {
	const battle = STOCK_BATTLES.find(b => b.id === battleId)!;
	const [selected, setSelected] = useState<"A" | "B" | null>(null);
	const { addXp } = useAccount();
	const xpAwarded = useRef(false);
	const handlePick = (side: "A" | "B") => {
		if (selected) return;
		setSelected(side);
		if (!xpAwarded.current) { xpAwarded.current = true; addXp(battle.xp).catch(() => {}); }
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
						<div className="rounded-[14px] border border-foreground/10 bg-surface-1 p-[16px]">
							<p className="text-[13px] font-bold mb-[6px]">Here's the story 📊</p>
							<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{battle.explanation}</p>
							<p className="text-[12px] text-amber-400 font-semibold mt-[10px]">+{battle.xp} XP</p>
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

	if (activeBattleId) {
		return <BattleDetail battleId={activeBattleId} onBack={() => setActiveBattleId(null)} />;
	}

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> Back
				</button>
				<h2 className="text-[22px] font-extrabold mb-[4px]">Stock Battles</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">Pick the winner. See the real numbers. {STOCK_BATTLES.length} matchups.</p>
				<div className="space-y-[10px]">
					{STOCK_BATTLES.map(b => (
						<button key={b.id} type="button" onClick={() => setActiveBattleId(b.id)}
							className="w-full flex items-center gap-[14px] rounded-[13px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px] text-left active:opacity-80">
							<div className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[10px] bg-rose-500/10 text-rose-400">
								<Swords size={18} />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-[14px] font-bold">{b.nameA} vs {b.nameB}</p>
								<p className="text-[12px] dark:text-slate-400 text-slate-500">{b.category} · {b.metricLabel}</p>
							</div>
							<ChevronRight size={16} className="shrink-0 dark:text-slate-500 text-slate-400" />
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

// ── Earnings Lab ──────────────────────────────────────────────────────────

function EarningsLabView({ onBack }: { onBack: () => void }) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(null);
	const [phase, setPhase] = useState<"question" | "outcome">("question");

	const scenario = EARNINGS_SCENARIOS.find(s => s.id === activeId);

	if (scenario) {
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<button type="button" onClick={() => { setActiveId(null); setSelected(null); setPhase("question"); }} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
						<ChevronRight size={14} className="rotate-180" /> All Scenarios
					</button>
					<div className="flex items-center gap-[10px] mb-[16px]">
						<div className="grid h-[40px] w-[40px] place-items-center rounded-[10px] bg-purple-500/10 text-purple-400">
							<FlaskConical size={18} />
						</div>
						<div>
							<p className="text-[12px] dark:text-slate-400 text-slate-500">Earnings Lab</p>
							<h2 className="text-[18px] font-extrabold">{scenario.company} ({scenario.ticker})</h2>
						</div>
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
							<div className="space-y-[10px]">
								{scenario.options.map(opt => (
									<button
										key={opt.id}
										type="button"
										onClick={() => { setSelected(opt.id); setPhase("outcome"); }}
										className="w-full text-left px-[16px] py-[14px] rounded-[12px] border border-foreground/10 bg-surface-1 text-[14px] font-medium active:opacity-80"
									>
										{opt.text}
									</button>
								))}
							</div>
						</>
					) : (
						<>
							<div className="rounded-[12px] border border-purple-500/30 bg-purple-500/[0.07] p-[14px] mb-[12px]">
								<p className="text-[12px] text-purple-400 font-semibold uppercase tracking-wide mb-[4px]">What Actually Happened</p>
								<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.outcome}</p>
							</div>
							<div className="rounded-[12px] border border-foreground/10 bg-surface-1 p-[14px]">
								<p className="text-[12px] dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wide mb-[4px]">The Lesson</p>
								<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{scenario.explanation}</p>
								<p className="text-[12px] text-amber-400 font-semibold mt-[8px]">+{scenario.xp} XP</p>
							</div>
						</>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
				<button type="button" onClick={onBack} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
					<ChevronRight size={14} className="rotate-180" /> Back
				</button>
				<h2 className="text-[22px] font-extrabold mb-[4px]">Earnings Lab</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">Learn why stocks react the way they do after earnings.</p>
				<div className="space-y-[10px]">
					{EARNINGS_SCENARIOS.map(s => (
						<button key={s.id} type="button" onClick={() => setActiveId(s.id)}
							className="w-full flex items-center gap-[14px] rounded-[13px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px] text-left active:opacity-80">
							<div className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[10px] bg-purple-500/10 text-purple-400">
								<FlaskConical size={18} />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-[14px] font-bold">{s.company} Earnings</p>
								<p className="text-[12px] dark:text-slate-400 text-slate-500 line-clamp-1">{s.context.slice(0, 60)}…</p>
							</div>
							<ChevronRight size={16} className="shrink-0 dark:text-slate-500 text-slate-400" />
						</button>
					))}
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
	const awardedRisk = useRef(new Set<number>());
	const scenario = RISK_SCENARIOS[index];

	if (!scenario) return null;

	const next = () => {
		if (index < RISK_SCENARIOS.length - 1) { setIndex(i => i + 1); setSelected(null); }
		else onBack();
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

				<div className="grid grid-cols-2 gap-[12px] mb-[16px]">
					{(["A", "B"] as const).map(side => {
						const text = side === "A" ? scenario.optionA : scenario.optionB;
						const isRiskier = side === scenario.riskierOption;
						const isSelected = selected === side;
						let cls = "border-foreground/10 bg-surface-1";
						if (selected) {
							if (isRiskier) cls = "border-rose-500/60 bg-rose-500/10";
							else cls = "border-emerald-500/60 bg-emerald-500/10";
						} else if (isSelected) cls = "border-blue-500/60 bg-blue-500/10";
						return (
							<button
								key={side}
								type="button"
								onClick={() => { if (!selected) { setSelected(side); if (!awardedRisk.current.has(index)) { awardedRisk.current.add(index); addXp(scenario!.xp).catch(() => {}); } } }}
								className={`rounded-[14px] border px-[14px] py-[16px] text-left transition-colors ${cls}`}
							>
								<p className="text-[13px] font-bold">{text}</p>
								{selected && isRiskier && <p className="text-[11px] text-rose-400 mt-[4px]">Higher Risk ⚠️</p>}
								{selected && !isRiskier && <p className="text-[11px] text-emerald-400 mt-[4px]">More Stable ✓</p>}
							</button>
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
	const awardedMood = useRef(new Set<number>());
	const scenario = MOOD_SCENARIOS[index];

	if (!scenario) return null;

	const next = () => {
		if (index < MOOD_SCENARIOS.length - 1) { setIndex(i => i + 1); setSelected(null); }
		else onBack();
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

				<div className="space-y-[10px] mb-[16px]">
					{scenario.options.map(opt => {
						const isSelected = selected === opt.id;
						const isRight = opt.id === scenario.correctId;
						let cls = "border-foreground/10 bg-surface-1";
						if (selected) {
							if (isRight) cls = "border-emerald-500/60 bg-emerald-500/10";
							else if (isSelected) cls = "border-rose-500/60 bg-rose-500/10";
						}
						return (
							<button key={opt.id} type="button" onClick={() => !selected && setSelected(opt.id)}
								className={`w-full text-left px-[16px] py-[14px] rounded-[12px] border text-[14px] font-medium transition-colors ${cls}`}>
								{opt.text}
								{selected && isRight && <span className="ml-2 text-emerald-400">✓</span>}
								{selected && isSelected && !isRight && <span className="ml-2 text-rose-400">✗</span>}
							</button>
						);
					})}
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
	const [idx, setIdx] = useState(() => Math.floor(Math.random() * PRACTICE_TICKERS.length));
	const [decision, setDecision] = useState<'save' | 'pass' | 'learn' | null>(null);
	const stock = PRACTICE_TICKERS[idx % PRACTICE_TICKERS.length]!;
	const { data: stockData, isLoading } = useQuery({ queryKey: ['stock', stock.ticker], queryFn: () => getStockData(stock.ticker), staleTime: 2 * 60 * 1000, retry: 1 });
	const next = () => { setIdx(i => (i + 1) % PRACTICE_TICKERS.length); setDecision(null); };
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
					{scenario.options.map(opt => {
						const isSelected = selected === opt.id;
						const isBestOpt = opt.id === scenario.bestId;
						let cls = 'border-foreground/10 bg-surface-1';
						if (selected) { if (isBestOpt) cls='border-emerald-500/50 bg-emerald-500/[0.08]'; else if (isSelected) cls='border-rose-500/50 bg-rose-500/[0.08]'; }
						return (<button key={opt.id} type="button" onClick={()=>handleSelect(opt.id)} className={`w-full text-left px-[14px] py-[12px] rounded-[12px] border text-[13px] font-medium transition-colors ${cls}`}>{opt.text}{selected&&isBestOpt&&<span className="ml-2 text-emerald-400 text-[11px]">Best move</span>}{selected&&isSelected&&!isBestOpt&&<span className="ml-2 text-rose-400 text-[11px]">Not quite</span>}</button>);
					})}
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
						<div className="space-y-[6px]">
							{holdings.map(h => (
								<div key={h.ticker} className="flex items-center gap-[12px] rounded-[12px] border border-foreground/10 bg-surface-1 px-[12px] py-[10px]">
									<div className="flex-1 min-w-0">
										<p className="text-[14px] font-bold">{h.ticker}</p>
										{h.currentPrice && <p className="text-[12px] dark:text-slate-400 text-slate-500">${h.currentPrice.toFixed(2)}</p>}
									</div>
									{h.pricePct !== null && (
										<p className={`text-[13px] font-bold ${h.pricePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
											{h.pricePct >= 0 ? '+' : ''}{h.pricePct.toFixed(1)}%
										</p>
									)}
									<button type="button" onClick={() => removeFromSandbox(h.ticker)} className="text-[11px] text-rose-400 hover:text-rose-300 px-[6px]">✕</button>
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