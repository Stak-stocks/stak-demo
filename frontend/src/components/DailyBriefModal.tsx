import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
	ChevronRight, TrendingUp, Cloud, Zap, Sun, Minus,
	UserRound, MessageSquare, ShieldCheck, BookOpen,
	TrendingDown, Play, Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDailyBrief, type DailyBriefDeck, type FeaturedLesson } from "@/lib/api";
import { marketSessionBucket, getEasternDateKey } from "@/lib/utils";
import { StakLogo } from "@/components/StakLogo";


const DECK_ICON_MAP: Record<string, React.ElementType> = {
	trending_up: TrendingUp,
	shield:      ShieldCheck,
	book:        BookOpen,
	zap:         Zap,
	sun:         Sun,
};

const FALLBACK_BRIEF = {
	mood: "Cautious" as const,
	session: "open" as const,
	moodExplanation: "Investors are reacting to new inflation data and interest-rate expectations.",
	plainEnglish: "Growth stocks may be more volatile today.",
	personalizedImpact: "Your feed is tech-heavy, so AI, software, and semiconductor stocks may move more sharply today.",
	decks: [
		{ id: "defensive", title: "Defensive Picks", subtitle: "Stability in uncertain times", icon: "shield", color: "purple" as const },
	] as DailyBriefDeck[],
};

type MoodCircleColor = "cyan" | "purple" | "green" | "blue" | "rose" | "yellow" | "amber" | "slate";

const MOOD_CONFIG: Record<string, { icon: React.ElementType; textColor: string; cardBorder: string; cardBg: string; circleColor: MoodCircleColor; chartStroke: string; chartPath: string }> = {
	Bullish:    { icon: TrendingUp,   textColor: "text-emerald-500 dark:text-emerald-400", cardBorder: "border-emerald-500/20", cardBg: "bg-emerald-500/[0.07]", circleColor: "green",  chartStroke: "#22c55e", chartPath: "M2 32 L8 28 L14 30 L20 24 L26 27 L32 20 L38 22 L44 17 L50 20 L56 14 L62 16 L68 11 L74 13 L80 8 L86 10 L92 6 L99 4"   },
	Bearish:    { icon: TrendingDown, textColor: "text-rose-500 dark:text-rose-400",       cardBorder: "border-rose-500/20",    cardBg: "bg-rose-500/[0.07]",    circleColor: "rose",   chartStroke: "#f43f5e", chartPath: "M2 8 L8 12 L14 9 L20 16 L26 13 L32 20 L38 17 L44 23 L50 19 L56 26 L62 23 L68 29 L74 27 L80 33 L86 30 L92 35 L99 37"  },
	Cautious:   { icon: Cloud,        textColor: "text-cyan-600 dark:text-cyan-400",        cardBorder: "border-cyan-500/20",    cardBg: "bg-cyan-500/[0.07]",    circleColor: "cyan",   chartStroke: "#06b6d4", chartPath: "M2 18 L8 16 L14 20 L20 18 L26 22 L32 20 L38 23 L44 21 L50 25 L56 23 L62 26 L68 24 L74 27 L80 26 L86 28 L92 27 L99 28" },
	Volatile:   { icon: Zap,          textColor: "text-yellow-600 dark:text-yellow-300",   cardBorder: "border-yellow-500/20",  cardBg: "bg-yellow-500/[0.07]",  circleColor: "yellow", chartStroke: "#eab308", chartPath: "M2 20 L7 8 L12 30 L17 6 L22 28 L27 10 L32 26 L37 8 L43 30 L49 6 L55 28 L61 10 L67 30 L73 8 L79 26 L85 10 L92 24 L99 14" },
	Calm:       { icon: Sun,          textColor: "text-amber-600 dark:text-amber-300",      cardBorder: "border-amber-500/20",   cardBg: "bg-amber-500/[0.07]",   circleColor: "amber",  chartStroke: "#f59e0b", chartPath: "M2 28 L10 26 L18 27 L26 24 L34 25 L42 22 L50 23 L58 20 L66 21 L74 18 L82 17 L90 14 L99 12"                         },
	Mixed:      { icon: Minus,        textColor: "dark:text-slate-300 text-slate-600",      cardBorder: "border-slate-400/18",   cardBg: "bg-slate-500/[0.05]",   circleColor: "slate",  chartStroke: "#94a3b8", chartPath: "M2 20 L8 16 L14 24 L20 18 L26 23 L32 19 L38 22 L44 17 L50 23 L56 19 L62 22 L68 18 L74 23 L80 20 L86 22 L92 19 L99 21" },
	"Risk-On":  { icon: TrendingUp,   textColor: "text-emerald-500 dark:text-emerald-400", cardBorder: "border-emerald-500/20", cardBg: "bg-emerald-500/[0.07]", circleColor: "green",  chartStroke: "#22c55e", chartPath: "M2 32 L8 28 L14 30 L20 24 L26 27 L32 20 L38 22 L44 17 L50 20 L56 14 L62 16 L68 11 L74 13 L80 8 L86 10 L92 6 L99 4"   },
	"Risk-Off": { icon: TrendingDown, textColor: "text-rose-500 dark:text-rose-400",       cardBorder: "border-rose-500/20",    cardBg: "bg-rose-500/[0.07]",    circleColor: "rose",   chartStroke: "#f43f5e", chartPath: "M2 8 L8 12 L14 9 L20 16 L26 13 L32 20 L38 17 L44 23 L50 19 L56 26 L62 23 L68 29 L74 27 L80 33 L86 30 L92 35 L99 37"  },
};

function renderBold(text: string) {
	const parts = text.split(/\*\*(.+?)\*\*/g);
	return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
}

function getGreeting() {
	const h = new Date().getHours();
	if (h < 12) return "Good morning";
	if (h < 18) return "Good afternoon";
	return "Good evening";
}

function LineChartMini({ stroke, path }: { stroke: string; path: string }) {
	const gradId = `cg-${stroke.replace("#", "")}`;
	// Build a closed fill path by dropping to bottom-right then bottom-left
	const fillPath = `${path} L99 40 L2 40 Z`;
	return (
		<svg viewBox="0 0 100 40" className="h-[40px] w-full" fill="none">
			<defs>
				<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
					<stop offset="100%" stopColor={stroke} stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={fillPath} fill={`url(#${gradId})`} />
			<path d={path} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

type IconColor = "cyan" | "purple" | "green" | "blue" | "rose" | "yellow" | "amber" | "slate";

function IconCircle({ color, icon, large }: { color: IconColor; icon: React.ReactNode; large?: boolean }) {
	const cls: Record<IconColor, string> = {
		cyan:   "border-cyan-400/55    bg-cyan-500/10    text-cyan-300",
		purple: "border-violet-400/50  bg-violet-500/10  text-violet-300",
		green:  "border-emerald-400/50 bg-emerald-500/10 text-emerald-300",
		blue:   "border-blue-400/50    bg-blue-500/10    text-blue-300",
		rose:   "border-rose-400/50    bg-rose-500/10    text-rose-300",
		yellow: "border-yellow-400/50  bg-yellow-500/10  text-yellow-300",
		amber:  "border-amber-400/50   bg-amber-500/10   text-amber-300",
		slate:  "border-slate-400/40   bg-slate-500/10   text-slate-300",
	};
	return (
		<div className={`grid shrink-0 place-items-center rounded-full border ${cls[color]} ${large ? "h-[63px] w-[63px]" : "h-[54px] w-[54px]"}`}>
			{icon}
		</div>
	);
}

function InfoCard({ icon, title, text, color }: { icon: React.ReactNode; title: string; text: string; color: "purple" | "cyan" }) {
	const isPurple = color === "purple";
	return (
		<section className={`mt-[10px] rounded-[14px] border p-[14px] shadow-[0_10px_30px_rgba(0,0,0,.12)] ${isPurple ? "border-violet-400/25 bg-violet-500/[0.07]" : "border-cyan-400/25 bg-cyan-500/[0.07]"}`}>
			<div className="flex gap-[15px]">
				<IconCircle color={isPurple ? "purple" : "cyan"} icon={icon} />
				<div className="pt-[1px]">
					<p className={`text-[13px] font-semibold ${isPurple ? "text-violet-300" : "text-cyan-300"}`}>{title}</p>
					<p className="mt-[5px] max-w-[255px] text-[13px] leading-[18px] text-foreground/90">{renderBold(text)}</p>
				</div>
			</div>
		</section>
	);
}

const DECK_COLOR_CONFIG: Record<string, { border: string; bgClass: string; iconColor: IconColor; textColor: string }> = {
	green:  { border: "border-emerald-500/25", bgClass: "bg-emerald-500/[0.07]", iconColor: "green",  textColor: "text-emerald-500 dark:text-emerald-300" },
	purple: { border: "border-violet-500/25",  bgClass: "bg-violet-500/[0.07]",  iconColor: "purple", textColor: "text-violet-600 dark:text-violet-300"   },
	blue:   { border: "border-blue-500/25",    bgClass: "bg-blue-500/[0.07]",    iconColor: "blue",   textColor: "text-blue-600 dark:text-blue-300"       },
};

function ThemeCard({ deck, session = "open", nextTradingDayLabel = "tomorrow" }: { deck: DailyBriefDeck; session?: string; nextTradingDayLabel?: string }) {
	const Icon = DECK_ICON_MAP[deck.icon] ?? TrendingUp;
	const c = DECK_COLOR_CONFIG[deck.color] ?? DECK_COLOR_CONFIG.blue;
	const isForwardLooking = session === "close";
	const nextLabel = nextTradingDayLabel === "tomorrow" ? "tomorrow" : `ahead of ${nextTradingDayLabel}`;
	const focusLabel = isForwardLooking
		? `Stocks to Watch ${nextTradingDayLabel === "tomorrow" ? "for Tomorrow" : `Ahead of ${nextTradingDayLabel}`}`
		: "Today's Focus";
	const feedLine = isForwardLooking
		? `We're surfacing ${deck.title} picks in your Discover feed ahead of ${nextTradingDayLabel === "tomorrow" ? "tomorrow" : `${nextTradingDayLabel}'s`} open.`
		: `We're surfacing ${deck.title} picks in your Discover feed today.`;
	return (
		<section
			className={`mt-[10px] rounded-[14px] border ${c.border} ${c.bgClass} p-[15px] shadow-[0_10px_30px_rgba(0,0,0,.12)]`}
		>
			<div className="flex gap-[15px]">
				<IconCircle color={c.iconColor} icon={<Icon size={28} strokeWidth={1.8} />} large />
				<div className="min-w-0 flex-1 pt-[2px]">
					<p className="text-[13px] dark:text-slate-300 text-slate-600">{focusLabel}</p>
					<h3 className={`mt-[2px] text-[22px] font-bold leading-none tracking-[-0.03em] ${c.textColor}`}>{deck.title}</h3>
					<p className="mt-[9px] text-[13px] leading-[18px] text-foreground/85">
						{deck.subtitle} — {feedLine}
					</p>
				</div>
			</div>
		</section>
	);
}

const MACRO_COLORS: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
	inflation: { border: "border-orange-500/20", bg: "bg-orange-500/[0.07]", text: "text-orange-500 dark:text-orange-400", iconBg: "bg-orange-500/15" },
	jobs:      { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.07]", text: "text-emerald-500 dark:text-emerald-400", iconBg: "bg-emerald-500/15" },
	fed:       { border: "border-violet-500/20",  bg: "bg-violet-500/[0.07]",  text: "text-violet-500 dark:text-violet-400",  iconBg: "bg-violet-500/15"  },
	gdp:       { border: "border-blue-500/20",    bg: "bg-blue-500/[0.07]",    text: "text-blue-500 dark:text-blue-400",    iconBg: "bg-blue-500/15"    },
	ppi:       { border: "border-rose-500/20",    bg: "bg-rose-500/[0.07]",    text: "text-rose-500 dark:text-rose-400",    iconBg: "bg-rose-500/15"    },
	retail:    { border: "border-cyan-500/20",    bg: "bg-cyan-500/[0.07]",    text: "text-cyan-600 dark:text-cyan-400",    iconBg: "bg-cyan-500/15"    },
	pmi:       { border: "border-amber-500/20",   bg: "bg-amber-500/[0.07]",   text: "text-amber-600 dark:text-amber-400",  iconBg: "bg-amber-500/15"   },
	other:     { border: "border-amber-500/20",   bg: "bg-amber-500/[0.07]",   text: "text-amber-600 dark:text-amber-400",  iconBg: "bg-amber-500/15"   },
};

function FeaturedLessonCard({ lesson }: { lesson: FeaturedLesson }) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const isAnswered = selectedId !== null;
	const c = MACRO_COLORS[lesson.eventType] ?? MACRO_COLORS.other;

	return (
		<section className={`mt-[10px] rounded-[14px] border ${c.border} ${c.bg} p-[15px]`}>
			{/* Header */}
			<div className="flex items-start gap-[12px]">
				<div className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[12px] ${c.iconBg} text-[24px]`}>
					{lesson.emoji}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-[12px] dark:text-slate-400 text-slate-500">Market Moment</p>
					<h3 className={`text-[18px] font-bold leading-tight tracking-[-0.02em] ${c.text}`}>{lesson.title}</h3>
					<p className="mt-[3px] text-[12px] leading-[16px] dark:text-slate-300 text-slate-600">{lesson.subtitle}</p>
				</div>
			</div>

			{/* Lesson cards */}
			<div className="mt-[12px] space-y-[8px]">
				{lesson.cards.map((card) => (
					<div key={card.heading} className="rounded-[10px] dark:bg-white/[0.05] bg-black/[0.03] p-[12px]">
						<p className={`text-[12px] font-semibold ${c.text}`}>{card.heading}</p>
						<p className="mt-[4px] text-[12px] leading-[17px] text-foreground/85">{card.body}</p>
					</div>
				))}
			</div>

			{/* Quiz */}
			<div className="mt-[10px] rounded-[10px] dark:bg-white/[0.05] bg-black/[0.03] p-[12px]">
				<p className="text-[12px] font-semibold text-foreground">Quick check: {lesson.quiz.question}</p>
				<div className="mt-[8px] space-y-[6px]">
					{lesson.quiz.options.map((opt) => {
						const isCorrect = opt.id === lesson.quiz.correctId;
						const isSelected = selectedId === opt.id;
						const btnCls = [
							"w-full text-left rounded-[8px] border px-[10px] py-[8px] text-[12px] transition-colors",
							!isAnswered
								? "border-foreground/10 dark:bg-white/[0.03] bg-black/[0.02] text-foreground/80 active:bg-foreground/10"
								: isCorrect
									? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
									: isSelected
										? "border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400"
										: "border-foreground/10 opacity-40 text-foreground/60",
						].join(" ");
						return (
							<button key={opt.id} type="button" disabled={isAnswered} className={btnCls} onClick={() => setSelectedId(opt.id)}>
								<span className="font-bold uppercase mr-[6px]">{opt.id}.</span>{opt.text}
							</button>
						);
					})}
				</div>
				{isAnswered && (
					<p className="mt-[8px] text-[11px] leading-[16px] dark:text-slate-300 text-slate-600">{lesson.quiz.explanation}</p>
				)}
			</div>
		</section>
	);
}

export function DailyBriefModal({ onClose, source = "auto" }: { onClose: () => void; source?: "auto" | "mystak" }) {
	const navigate = useNavigate();
	const { appUser } = useAuth();
	const firstName = appUser?.displayName?.split(" ")[0] ?? appUser?.email?.split("@")[0] ?? "there";

	const { data: liveData, isLoading: briefLoading } = useQuery({
		queryKey: ["daily-brief", getEasternDateKey(), marketSessionBucket()],
		queryFn: getDailyBrief,
		staleTime: 30 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
		retry: 0,
	});

	const SESSION_LABELS: Record<string, string> = {
		open:   "Morning Brief",
		midday: "Midday Update",
		close:  "Market Close Recap",
	};

	const isGenerating = briefLoading && !liveData;
	const brief = liveData ?? FALLBACK_BRIEF;
	const mood = MOOD_CONFIG[brief.mood] ?? MOOD_CONFIG.Mixed;
	const dayLabel = (brief as { dayLabel?: string }).dayLabel ?? "Today's";
	const marketClosed = (brief as { marketClosed?: boolean }).marketClosed ?? false;
	const nextTradingDayLabel = (brief as { nextTradingDayLabel?: string }).nextTradingDayLabel ?? "tomorrow";
	const sessionLabel = isGenerating
		? "Daily Brief"
		: marketClosed
		? `${dayLabel} Market Close Recap`
		: (SESSION_LABELS[brief.session] ?? "Morning Brief");
	const MoodIcon = mood.icon;

	const isDismissing = useRef(false);

	useEffect(() => {
		isDismissing.current = false;
		document.body.style.overflow = "hidden";
		return () => { document.body.style.overflow = ""; };
	}, []);

	const handleStartDeck = () => { onClose(); navigate({ to: "/" }); };
	const handleBackToStak = () => { onClose(); navigate({ to: "/my-stak" }); };

	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden touch-pan-y bg-background"
			style={{ scrollbarWidth: "none" }}
		>
			<div className="flex-1 px-[15px] pt-[max(11px,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] w-full max-w-lg mx-auto text-foreground">

				{/* Header */}
				<header className="flex items-start justify-between">
					<div>
						{source === "mystak" ? (
							<button
								type="button"
								onClick={handleBackToStak}
								className="flex items-center gap-1.5 dark:text-slate-300 text-slate-600 hover:text-foreground transition-colors mb-[4px]"
							>
								<ChevronRight className="w-4 h-4 rotate-180" strokeWidth={2} />
								<span className="text-[13px] font-medium">My STAK</span>
							</button>
						) : (
							<div className="flex items-center gap-[7px]">
								<StakLogo size={22} />
								<h1 className="text-[25px] font-semibold tracking-[0.12em] leading-none text-foreground">STAK</h1>
							</div>
						)}
						<p className="mt-[23px] text-[13px] dark:text-slate-400 text-slate-500">{getGreeting()}, {firstName} 👋</p>
						<h2 className="mt-[3px] text-[31px] font-bold leading-none tracking-[-0.04em] text-foreground">{sessionLabel}</h2>
						<p className="mt-[10px] text-[11px] dark:text-slate-400 text-slate-500">Your daily market snapshot. Personalized for you.</p>
					</div>
				</header>

				{/* Generating state — shown instead of brief content when first fetching */}
				{isGenerating && (
					<div className="mt-[18px] rounded-[14px] border border-blue-500/20 bg-blue-500/[0.07] p-[18px] flex items-center gap-[14px]">
						<div className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[12px] bg-blue-500/15 text-blue-400">
							<Sparkles size={22} />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[15px] font-bold text-foreground leading-none">Generating your brief...</p>
							<p className="mt-[5px] text-[12px] dark:text-slate-400 text-slate-500">Gemini is pulling live market context.</p>
							<div className="mt-[10px] inline-flex items-center gap-[5px] rounded-full border border-blue-500/20 bg-blue-500/10 px-[10px] py-[4px]">
								<Sparkles size={10} className="text-blue-400" />
								<span className="text-[11px] font-medium text-blue-400">Powered by Gemini</span>
							</div>
						</div>
						<div className="shrink-0 h-[26px] w-[26px] rounded-full border-[2.5px] border-blue-400/30 border-t-blue-400 animate-spin" />
					</div>
				)}

				{/* Market Mood */}
				{!isGenerating && <section className={`mt-[18px] rounded-[14px] border ${mood.cardBorder} ${mood.cardBg} p-[15px] shadow-[0_10px_30px_rgba(0,0,0,.12)]`}>

					<div className="flex gap-[15px]">
						<IconCircle color={mood.circleColor} icon={<MoodIcon size={31} strokeWidth={1.8} />} large />
						<div className="min-w-0 flex-1 pt-[2px]">
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="text-[13px] dark:text-slate-300 text-slate-600">{dayLabel} Market Mood</p>
									<h3 className={`mt-[2px] text-[31px] font-bold leading-none tracking-[-0.03em] ${mood.textColor}`}>{brief.mood}</h3>
								</div>
								<div className="mt-[8px] w-[90px] opacity-80">
									<LineChartMini stroke={mood.chartStroke} path={mood.chartPath} />
								</div>
							</div>
							<p className="mt-[11px] text-[13px] leading-[18px] text-foreground/90">{brief.moodExplanation}</p>
						</div>
					</div>
				</section>}

				{!isGenerating && <>
				{/* In Plain English */}
				<InfoCard color="purple" icon={<MessageSquare size={25} strokeWidth={1.8} />} title="In plain English:" text={brief.plainEnglish} />

				{/* Why this matters */}
				<InfoCard color="cyan" icon={<UserRound size={26} strokeWidth={1.8} />} title="Why this matters to you" text={brief.personalizedImpact} />

				{/* Market Moment — only on major economic event days */}
				{(brief as { featuredLesson?: FeaturedLesson }).featuredLesson && (
					<FeaturedLessonCard lesson={(brief as { featuredLesson: FeaturedLesson }).featuredLesson} />
				)}

				{/* Today's Focus / Stocks to Watch */}
				{brief.decks && brief.decks.length > 0 && <ThemeCard deck={brief.decks[0]} session={brief.session} nextTradingDayLabel={nextTradingDayLabel} />}

				{/* CTA */}
				{source !== "mystak" && (
					<button
						type="button"
						onClick={handleStartDeck}
						className="mt-[20px] flex h-[41px] w-full items-center justify-center gap-[16px] rounded-[8px] text-[14px] font-semibold shadow-[0_12px_26px_rgba(59,130,246,.24)] active:scale-[0.98] transition-transform"
						style={{ background: "linear-gradient(90deg,#23d6dd 0%,#5f7cff 50%,#9853ee 100%)" }}
					>
						<Play size={15} fill="white" className="shrink-0" />
						Start Today's Deck
					</button>
				)}
				</>}

			</div>
		</div>,
		document.body,
	);
}
