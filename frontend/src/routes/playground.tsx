import { createFileRoute } from "@tanstack/react-router";
import {
	BookOpen, Zap, Swords, FlaskConical, ShieldAlert,
	Brain, TrendingUp, Wallet, ChevronRight, Star, Lock,
} from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import {
	LESSONS, LESSON_CATEGORIES, getDailyChallenge,
	STOCK_BATTLES, EARNINGS_SCENARIOS, RISK_SCENARIOS, MOOD_SCENARIOS,
	type Lesson, type LessonCategory,
} from "@/data/playgroundData";
import { useState, useMemo } from "react";
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
	| "mood-simulator";

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
						locked
					/>
					<SectionCard
						colorKey="sandbox"
						icon={<Wallet size={22} />}
						title="Sandbox Portfolio"
						subtitle="$10,000 in practice money. Build and track a fake portfolio."
						locked
					/>
				</div>

				<p className="text-center text-[11px] dark:text-slate-600 text-slate-400 mt-[24px]">
					Practice Mode & Sandbox coming soon
				</p>
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
		if (!alreadyCompleted) await completeChallenge(challenge.id, challenge.xp);
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

function BattlesView({ onBack }: { onBack: () => void }) {
	const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
	const [selected, setSelected] = useState<"A" | "B" | null>(null);

	const battle = STOCK_BATTLES.find(b => b.id === activeBattleId);

	if (battle) {
		return (
			<div className="min-h-full bg-background text-foreground">
				<div className="max-w-lg mx-auto px-[18px] pt-[20px] pb-[32px]">
					<button type="button" onClick={() => { setActiveBattleId(null); setSelected(null); }} className="flex items-center gap-[6px] text-[13px] dark:text-slate-400 text-slate-500 mb-[16px]">
						<ChevronRight size={14} className="rotate-180" /> All Battles
					</button>
					<p className="text-[11px] uppercase tracking-wide dark:text-slate-400 text-slate-500 mb-[4px]">{battle.category}</p>
					<h2 className="text-[20px] font-extrabold mb-[4px]">{battle.nameA} vs {battle.nameB}</h2>
					<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">Which has the higher {battle.metricLabel}?</p>

					<div className="grid grid-cols-2 gap-[12px] mb-[20px]">
						{(["A", "B"] as const).map(side => {
							const name = side === "A" ? battle.nameA : battle.nameB;
							const ticker = side === "A" ? battle.tickerA : battle.tickerB;
							const isSelected = selected === side;
							return (
								<button
									key={side}
									type="button"
									onClick={() => !selected && setSelected(side)}
									className={`rounded-[14px] border px-[16px] py-[20px] text-center transition-colors ${isSelected ? "border-blue-500/60 bg-blue-500/10" : "border-foreground/10 bg-surface-1"}`}
								>
									<p className="text-[16px] font-extrabold text-foreground">{ticker}</p>
									<p className="text-[12px] dark:text-slate-400 text-slate-500 mt-[2px]">{name}</p>
									{selected && isSelected && <p className="text-[11px] text-blue-400 mt-[6px]">Your pick</p>}
								</button>
							);
						})}
					</div>

					{selected && (
						<div className="rounded-[14px] border border-foreground/10 bg-surface-1 p-[16px]">
							<p className="text-[13px] font-bold mb-[6px]">Here's the story 📊</p>
							<p className="text-[13px] dark:text-slate-300 text-slate-600 leading-relaxed">{battle.explanation}</p>
							<p className="text-[12px] text-amber-400 font-semibold mt-[10px]">+{battle.xp} XP</p>
						</div>
					)}

					{!selected && (
						<p className="text-center text-[13px] dark:text-slate-400 text-slate-500">Tap a stock to reveal the answer</p>
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
				<h2 className="text-[22px] font-extrabold mb-[4px]">Stock Battles</h2>
				<p className="text-[13px] dark:text-slate-400 text-slate-500 mb-[20px]">Pick the winner. Learn why. {STOCK_BATTLES.length} matchups.</p>
				<div className="space-y-[10px]">
					{STOCK_BATTLES.map(b => (
						<button
							key={b.id}
							type="button"
							onClick={() => setActiveBattleId(b.id)}
							className="w-full flex items-center gap-[14px] rounded-[13px] border border-foreground/10 bg-surface-1 px-[14px] py-[12px] text-left active:opacity-80"
						>
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
	const [index, setIndex] = useState(0);
	const [selected, setSelected] = useState<"A" | "B" | null>(null);
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
								onClick={() => !selected && setSelected(side)}
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
	const [index, setIndex] = useState(0);
	const [selected, setSelected] = useState<string | null>(null);
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
