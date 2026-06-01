import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
	ChevronRight, TrendingUp, Cloud, Zap, Sun, Minus,
	UserRound, MessageSquare, ShieldCheck, BookOpen,
	TrendingDown, Play,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDailyBrief, type DailyBriefDeck } from "@/lib/api";
import StakLogoIcon from "@/assets/stak-logo-icon.svg?react";

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const SWIPE_EDGE_PX = 24;

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

const MOOD_CONFIG: Record<string, { icon: React.ElementType; textColor: string; cardBorder: string; cardBg: string }> = {
	Bullish:  { icon: TrendingUp,   textColor: "text-emerald-500 dark:text-emerald-400", cardBorder: "border-emerald-500/20", cardBg: "bg-emerald-500/[0.07]" },
	Bearish:  { icon: TrendingDown, textColor: "text-rose-500 dark:text-rose-400",       cardBorder: "border-rose-500/20",    cardBg: "bg-rose-500/[0.07]"    },
	Cautious: { icon: Cloud,        textColor: "text-cyan-600 dark:text-cyan-400",        cardBorder: "border-cyan-500/20",    cardBg: "bg-cyan-500/[0.07]"    },
	Volatile: { icon: Zap,          textColor: "text-yellow-600 dark:text-yellow-300",   cardBorder: "border-yellow-500/20",  cardBg: "bg-yellow-500/[0.07]"  },
	Calm:     { icon: Sun,          textColor: "text-amber-600 dark:text-amber-300",      cardBorder: "border-amber-500/20",   cardBg: "bg-amber-500/[0.07]"   },
	Mixed:    { icon: Minus,        textColor: "dark:text-slate-300 text-slate-600",      cardBorder: "border-slate-400/18",   cardBg: "bg-slate-500/[0.05]"   },
};

function getGreeting() {
	const h = new Date().getHours();
	if (h < 12) return "Good morning";
	if (h < 18) return "Good afternoon";
	return "Good evening";
}

function LineChartMini() {
	return (
		<svg viewBox="0 0 100 40" className="h-[40px] w-full" fill="none">
			<path d="M2 28 L9 27 L15 21 L22 27 L30 12 L38 22 L46 14 L54 25 L62 12 L70 15 L78 9 L86 7 L94 2 L99 4" stroke="#4de6df" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

type IconColor = "cyan" | "purple" | "green" | "blue";

function IconCircle({ color, icon, large }: { color: IconColor; icon: React.ReactNode; large?: boolean }) {
	const cls: Record<IconColor, string> = {
		cyan:   "border-cyan-400/55   bg-cyan-500/10   text-cyan-300",
		purple: "border-violet-400/50 bg-violet-500/10 text-violet-300",
		green:  "border-emerald-400/50 bg-emerald-500/10 text-emerald-300",
		blue:   "border-blue-400/50   bg-blue-500/10   text-blue-300",
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
					<p className="mt-[5px] max-w-[255px] text-[13px] leading-[18px] text-foreground/90">{text}</p>
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

function ThemeCard({ deck }: { deck: DailyBriefDeck }) {
	const Icon = DECK_ICON_MAP[deck.icon] ?? TrendingUp;
	const c = DECK_COLOR_CONFIG[deck.color] ?? DECK_COLOR_CONFIG.blue;
	return (
		<section
			className={`mt-[10px] rounded-[14px] border ${c.border} ${c.bgClass} p-[15px] shadow-[0_10px_30px_rgba(0,0,0,.12)]`}
		>
			<div className="flex gap-[15px]">
				<IconCircle color={c.iconColor} icon={<Icon size={28} strokeWidth={1.8} />} large />
				<div className="min-w-0 flex-1 pt-[2px]">
					<p className="text-[13px] dark:text-slate-300 text-slate-600">Today's Focus</p>
					<h3 className={`mt-[2px] text-[22px] font-bold leading-none tracking-[-0.03em] ${c.textColor}`}>{deck.title}</h3>
					<p className="mt-[9px] text-[13px] leading-[18px] text-foreground/85">
						{deck.subtitle} — We're surfacing {deck.title} picks in your Discover feed today.
					</p>
				</div>
			</div>
		</section>
	);
}

export function DailyBriefModal({ onClose, source = "auto" }: { onClose: () => void; source?: "auto" | "mystak" }) {
	const navigate = useNavigate();
	const { user } = useAuth();
	const firstName = user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

	const { data: liveData } = useQuery({
		queryKey: ["daily-brief"],
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

	const brief = liveData ?? FALLBACK_BRIEF;
	const mood = MOOD_CONFIG[brief.mood] ?? MOOD_CONFIG.Mixed;
	const sessionLabel = SESSION_LABELS[brief.session] ?? "Morning Brief";
	const MoodIcon = mood.icon;

	// Swipe-right to dismiss
	const swipeStartX = useRef<number | null>(null);
	const [swipeX, setSwipeX] = useState(0);
	const isDismissing = useRef(false);

	const handlePointerDown = (e: React.PointerEvent) => {
		if (!IS_IOS || e.clientX > SWIPE_EDGE_PX) return;
		swipeStartX.current = e.clientX;
	};
	const handlePointerMove = (e: React.PointerEvent) => {
		if (swipeStartX.current === null) return;
		setSwipeX(Math.max(0, e.clientX - swipeStartX.current));
	};
	const handlePointerUp = () => {
		if (isDismissing.current) return;
		if (swipeX > 100) { isDismissing.current = true; onClose(); }
		swipeStartX.current = null;
		setSwipeX(0);
	};

	useEffect(() => {
		document.body.style.overflow = "hidden";
		return () => { document.body.style.overflow = ""; };
	}, []);

	const handleStartDeck = () => { onClose(); navigate({ to: "/" }); };
	const handleBackToStak = () => { onClose(); navigate({ to: "/my-stak" }); };

	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden touch-pan-y bg-background"
			style={{
				scrollbarWidth: "none",
				transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined,
				opacity: swipeX > 0 ? Math.max(0.5, 1 - swipeX / 300) : 1,
				transition: swipeX === 0 ? "transform 0.25s ease, opacity 0.25s ease" : "none",
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
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
								<StakLogoIcon className="w-[22px] h-[22px]" />
								<h1 className="text-[25px] font-semibold tracking-[0.12em] leading-none text-foreground">STAK</h1>
							</div>
						)}
						<p className="mt-[23px] text-[13px] dark:text-slate-400 text-slate-500">{getGreeting()}, {firstName} 👋</p>
						<h2 className="mt-[3px] text-[31px] font-bold leading-none tracking-[-0.04em] text-foreground">{sessionLabel}</h2>
						<p className="mt-[10px] text-[11px] dark:text-slate-400 text-slate-500">Your daily market snapshot. Personalized for you.</p>
					</div>
				</header>

				{/* Market Mood */}
				<section className={`mt-[18px] rounded-[14px] border ${mood.cardBorder} ${mood.cardBg} p-[15px] shadow-[0_10px_30px_rgba(0,0,0,.12)]`}>
					<div className="flex gap-[15px]">
						<IconCircle color="cyan" icon={<MoodIcon size={31} strokeWidth={1.8} />} large />
						<div className="min-w-0 flex-1 pt-[2px]">
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="text-[13px] dark:text-slate-300 text-slate-600">Today's Market Mood</p>
									<h3 className={`mt-[2px] text-[31px] font-bold leading-none tracking-[-0.03em] ${mood.textColor}`}>{brief.mood}</h3>
								</div>
								<div className="mt-[8px] w-[90px] opacity-80">
									<LineChartMini />
								</div>
							</div>
							<p className="mt-[11px] text-[13px] leading-[18px] text-foreground/90">{brief.moodExplanation}</p>
						</div>
					</div>
				</section>

				{/* In Plain English */}
				<InfoCard color="purple" icon={<MessageSquare size={25} strokeWidth={1.8} />} title="In plain English:" text={brief.plainEnglish} />

				{/* Why this matters */}
				<InfoCard color="cyan" icon={<UserRound size={26} strokeWidth={1.8} />} title="Why this matters to you" text={brief.personalizedImpact} />

				{/* Today's Focus */}
				{brief.decks && brief.decks.length > 0 && <ThemeCard deck={brief.decks[0]} />}

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

			</div>
		</div>,
		document.body,
	);
}
