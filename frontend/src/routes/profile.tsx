import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { toast } from "sonner";
import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { brands as allBrands, type BrandProfile } from "@/data/brands";
import { BrandLogo } from "@/components/BrandLogo";
import { INTEL_CARDS, type IntelCard } from "@/data/intelCards";
import { IntelCardModal } from "@/components/IntelCardModal";
import { getIntelCards } from "@/lib/api";
import { INTEREST_TO_BRANDS } from "@/data/onboarding";
import {
	ChevronRight,
	User,
	Shield,
	HelpCircle,
	BookOpen,
	X,
	Flame,
	Moon,
	Sun,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

/* ── Reverse map: brand ID → categories it belongs to ── */
const BRAND_TO_CATS: Record<string, string[]> = {};
for (const [cat, ids] of Object.entries(INTEREST_TO_BRANDS)) {
	for (const id of ids) {
		if (!BRAND_TO_CATS[id]) BRAND_TO_CATS[id] = [];
		BRAND_TO_CATS[id].push(cat);
	}
}

/* ── Vibe archetype based on swiped brands ── */
const VIBE_MAP: Record<string, { label: string; emoji: string; desc: string }> = {
	tech:      { label: "Tech Visionary",    emoji: "🤖", desc: "Betting big on AI & the future."  },
	gaming:    { label: "Alpha Gamer",        emoji: "🎮", desc: "Levelling up in markets too."      },
	streaming: { label: "Culture Creator",    emoji: "📺", desc: "Streaming the future of media."    },
	fashion:   { label: "Trend Setter",       emoji: "💎", desc: "Where culture meets returns."      },
	beauty:    { label: "Beauty Guru",        emoji: "✨", desc: "Investing in what looks good."     },
	finance:   { label: "Market Maven",       emoji: "📊", desc: "Always following the money trail." },
	energy:    { label: "Green Investor",     emoji: "⚡", desc: "Powering the future economy."      },
	music:     { label: "Sound Investor",     emoji: "🎵", desc: "Vibes that pay dividends."         },
	food_drink: { label: "Taste Maker",       emoji: "🍔", desc: "Investing in everyday cravings."   },
	shopping:  { label: "Savvy Shopper",      emoji: "🛍️", desc: "Commerce is always in season."    },
	travel:    { label: "Globe Trotter",      emoji: "✈️", desc: "Investing in the world around you."},
	fitness:   { label: "Wellness Investor",  emoji: "💪", desc: "Health is wealth, literally."      },
};

function computeVibes(
	stakBrands: BrandProfile[],
	interests: string[],
	categoryScores: Record<string, number>,
): Array<{ label: string; emoji: string; desc: string; pct: number }> {
	const scores: Record<string, number> = {};

	// Primary signal: weighted swipe history (right=+2, left=-1 already accumulated)
	for (const [cat, score] of Object.entries(categoryScores)) {
		if (VIBE_MAP[cat] && score > 0) scores[cat] = score;
	}

	// Commitment boost: brands currently in stak add +3 per category
	for (const brand of stakBrands) {
		const cats = BRAND_TO_CATS[brand.id] ?? brand.interestCategories ?? [];
		for (const cat of cats) {
			if (VIBE_MAP[cat]) scores[cat] = (scores[cat] ?? 0) + 3;
		}
	}

	// Fallback: use onboarding interests if no swipe data yet
	if (Object.keys(scores).length === 0) {
		for (const cat of interests) {
			if (VIBE_MAP[cat]) scores[cat] = (scores[cat] ?? 0) + 1;
		}
	}

	const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3);
	if (ranked.length === 0) return [{ ...VIBE_MAP.tech, pct: 100 }];

	const total = ranked.reduce((s, [, v]) => s + v, 0);
	return ranked.map(([cat, score]) => ({
		...VIBE_MAP[cat],
		pct: total > 0 ? Math.round((score / total) * 100) : 0,
	}));
}

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});



/* ── Floating Brand Icon (background decoration) ── */
function FloatingIcon({ src, className }: { src: string; className: string }) {
	return (
		<div className={`absolute rounded-xl overflow-hidden opacity-15 dark:opacity-30 ${className}`}>
			<img src={src} alt="" className="w-full h-full object-contain" draggable={false} />
		</div>
	);
}

function ProfilePage() {
	const { user, loading, logout } = useAuth();
	const { account } = useAccount();
	const { resolvedTheme, setTheme } = useTheme();
	const navigate = useNavigate();

	// Stak brands — derived from Firestore account
	const stakBrands = useMemo(() => {
		const brandMap = new Map(allBrands.map((b) => [b.id, b]));
		return (account?.stakBrandIds ?? [])
			.map((id) => brandMap.get(id))
			.filter(Boolean) as BrandProfile[];
	}, [account?.stakBrandIds]);

	// Intel Library — card objects from API, read IDs from Firestore account
	const { data: intelCardsData } = useQuery({
		queryKey: ["intel-cards"],
		queryFn: getIntelCards,
		staleTime: 7 * 24 * 60 * 60 * 1000,
		gcTime: 7 * 24 * 60 * 60 * 1000,
		retry: 1,
	});
	const allIntelCards = useMemo(() => {
		const apiCards = intelCardsData?.cards ?? [];
		const merged = [...apiCards];
		for (const card of INTEL_CARDS) {
			if (!merged.find((c) => c.id === card.id)) merged.push(card);
		}
		return merged;
	}, [intelCardsData]);
	const readIds = account?.intelCardState?.readIds ?? [];
	const readCards = useMemo(
		() => allIntelCards.filter((c) => readIds.includes(c.id)),
		[allIntelCards, readIds],
	);

	const [showLibrary, setShowLibrary] = useState(false);
	const sheetDragStartY = useRef(0);
	const [sheetTranslate, setSheetTranslate] = useState(0);
	const [reviewCard, setReviewCard] = useState<IntelCard | null>(null);

	// Badge tooltip
	const [activeBadge, setActiveBadge] = useState<{ emoji: string; label: string; desc: string; progress: number; progressLabel?: string } | null>(null);

	// Streak — from Firestore account
	const streak = account?.streak?.count ?? 0;

	// Familiarity / investor level — from Firestore account
	const familiarity = account?.preferences?.familiarity ?? "new";
	const LEVEL_MAP: Record<string, { stars: number; label: string }> = {
		new:          { stars: 1, label: "Beginner" },
		little:       { stars: 2, label: "Beginner" },
		some:         { stars: 3, label: "Intermediate" },
		experienced:  { stars: 4, label: "Expert" },
	};
	const level = LEVEL_MAP[familiarity] ?? LEVEL_MAP.new;
	const starsDisplay = "⭐".repeat(level.stars);

	// Vibe check — weighted from swipe history + stak commitment; falls back to interests
	const interests = account?.preferences?.interests ?? [];
	const categoryScores = account?.categoryScores ?? {};
	const vibes = computeVibes(stakBrands, interests, categoryScores);

	// Badges — all badges with progress tracking
	const maxCategoryScore = Math.max(0, ...Object.values(categoryScores));
	const categoriesEngaged = Object.keys(categoryScores).length;
	const hasStaked = stakBrands.length >= 1;
	const hasReadIntel = readCards.length >= 1;

	const allBadges = [
		{ id: "first-swipe",        label: "First Swipe",       emoji: "✅", desc: "Added your first brand to the Stak.",         earned: hasStaked,                      progress: Math.min(stakBrands.length, 1),          progressLabel: `${Math.min(stakBrands.length, 1)}/1 brand`      },
		{ id: "stak-builder",       label: "Stak Builder",      emoji: "🏗️", desc: "Built a Stak of 5 or more brands.",           earned: stakBrands.length >= 5,         progress: Math.min(stakBrands.length / 5, 1),      progressLabel: `${stakBrands.length}/5 brands`                  },
		{ id: "full-stak",          label: "Full Stak",         emoji: "💯", desc: "Maxed out your Stak with 15 brands.",         earned: stakBrands.length >= 15,        progress: Math.min(stakBrands.length / 15, 1),     progressLabel: `${stakBrands.length}/15 brands`                 },
		{ id: "three-day-streak",   label: "3-Day Streak",      emoji: "🔥", desc: "Logged in 3 days in a row.",                  earned: streak >= 3,                    progress: Math.min(streak / 3, 1),                 progressLabel: `${streak}/3 days`                               },
		{ id: "week-warrior",       label: "Week Warrior",      emoji: "⚡", desc: "Logged in 7 days in a row. Consistent!",      earned: streak >= 7,                    progress: Math.min(streak / 7, 1),                 progressLabel: `${streak}/7 days`                               },
		{ id: "monthly-legend",     label: "Monthly Legend",    emoji: "💎", desc: "30-day streak. You're a STAK legend.",        earned: streak >= 30,                   progress: Math.min(streak / 30, 1),                progressLabel: `${streak}/30 days`                              },
		{ id: "intel-junky",        label: "Insight Seeker",    emoji: "🧠", desc: "Read 5 Intel cards — you're learning fast.", earned: readCards.length >= 5,          progress: Math.min(readCards.length / 5, 1),       progressLabel: `${readCards.length}/5 cards`                    },
		{ id: "knowledge-hoarder",  label: "All-Knowing",       emoji: "📚", desc: "Read every Intel card in the library.",       earned: readCards.length >= INTEL_CARDS.length, progress: readCards.length / Math.max(INTEL_CARDS.length, 1), progressLabel: `${readCards.length}/${INTEL_CARDS.length} cards` },
		{ id: "explorer",           label: "Explorer",          emoji: "🌍", desc: "Engaged with 3+ different market sectors.",   earned: categoriesEngaged >= 3,         progress: Math.min(categoriesEngaged / 3, 1),      progressLabel: `${categoriesEngaged}/3 sectors`                 },
		{ id: "conviction-builder", label: "Conviction Builder",emoji: "🎯", desc: "Deep focus on one sector — you know your edge.", earned: maxCategoryScore >= 20,      progress: Math.min(maxCategoryScore / 20, 1),      progressLabel: `${maxCategoryScore}/20 score`                   },
		{ id: "signal-finder",      label: "Signal Finder",     emoji: "📡", desc: "Staked brands and read intel — the full loop.", earned: hasStaked && hasReadIntel,   progress: (hasStaked ? 0.5 : 0) + (hasReadIntel ? 0.5 : 0),  progressLabel: hasStaked && hasReadIntel ? "Complete" : !hasStaked ? "Stake a brand first" : "Read an Intel card" },
	];
	const earnedBadges = allBadges.filter((b) => b.earned);
	const inProgressBadges = allBadges.filter((b) => !b.earned && b.progress > 0);

	// Toast when a new badge is unlocked
	const prevEarnedRef = useRef<Set<string>>(new Set());
	const badgeInitRef = useRef(false);
	useEffect(() => {
		if (!account) return;
		const currentEarned = new Set(earnedBadges.map((b) => b.id));
		if (!badgeInitRef.current) {
			prevEarnedRef.current = currentEarned;
			badgeInitRef.current = true;
			return;
		}
		for (const id of currentEarned) {
			if (!prevEarnedRef.current.has(id)) {
				const badge = allBadges.find((b) => b.id === id);
				if (badge) toast.success(`${badge.emoji} Badge unlocked: ${badge.label}!`);
			}
		}
		prevEarnedRef.current = currentEarned;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account]);

	const displayName = user?.displayName || "STAK User";
	const email = user?.email || "";

	async function handleLogout() {
		await logout();
		toast.success("Signed out");
		navigate({ to: "/login" });
	}

	useEffect(() => {
		if (!loading && !user) {
			navigate({ to: "/login" });
		}
	}, [loading, user, navigate]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<div className="min-h-full bg-background text-zinc-900 dark:text-white pb-24 relative">

			{/* ── Scattered floating brand icons (top area) ── */}
			<div className="absolute inset-x-0 top-0 h-[220px] pointer-events-none select-none" aria-hidden>
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/nike--600.png"               className="w-8 h-8 top-4 left-[4%] rotate-[-8deg]" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/netflix--600.png"            className="w-6 h-6 top-6 left-[22%] -rotate-3" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/tesla--600.png"              className="w-7 h-7 top-3 left-[42%] rotate-[-5deg]" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/spotify-technology--600.png" className="w-8 h-8 top-5 right-[20%] rotate-12" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/apple--600.png"              className="w-7 h-7 top-2 right-[4%] -rotate-6" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/amazon--600.png"             className="w-7 h-7 top-[55px] left-[10%] rotate-6" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/meta-platforms--600.png"     className="w-6 h-6 top-[65px] left-[30%] rotate-3" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/walt-disney--600.png"        className="w-7 h-7 top-[50px] right-[28%] -rotate-8" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/microsoft--600.png"          className="w-7 h-7 top-[60px] right-[8%] rotate-6" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/starbucks--600.png"          className="w-6 h-6 top-[110px] left-[5%] rotate-12" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/nvidia--600.png"             className="w-7 h-7 top-[105px] left-[20%] -rotate-4" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/uber--600.png"               className="w-6 h-6 top-[115px] right-[22%] rotate-8" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/alphabet--600.png"           className="w-6 h-6 top-[100px] right-[5%] -rotate-6" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/visa--600.png"               className="w-6 h-6 top-[160px] left-[8%] -rotate-5" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/paypal--600.png"             className="w-6 h-6 top-[155px] left-[25%] rotate-10" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/shopify--600.png"            className="w-6 h-6 top-[165px] right-[25%] -rotate-3" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/coinbase--600.png"           className="w-6 h-6 top-[150px] right-[6%] rotate-7" />
			</div>

			<div className="relative max-w-lg mx-auto px-4 pt-2">

				{/* ════════ PROFILE HEADER ════════ */}
				<div className="flex flex-col items-center gap-1.5 mb-5">
					<div className="relative mb-1">
						<div className="absolute -inset-2 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 blur-lg" />
						<div className="relative w-[80px] h-[80px] rounded-full ring-[3px] ring-purple-400/40 overflow-hidden bg-zinc-200 dark:bg-slate-800 shadow-xl shadow-purple-900/30">
							{user.photoURL ? (
								<img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
							) : (
								<div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-3xl font-bold text-white">
									{displayName.charAt(0).toUpperCase()}
								</div>
							)}
						</div>
					</div>

					<h1 className="text-xl font-bold tracking-tight">{displayName}</h1>

					<span style={{ pointerEvents: "none" }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-400/30 dark:border-emerald-400/25 text-emerald-600 dark:text-emerald-300 text-xs font-medium">
						<span className="text-sm">{starsDisplay}</span> {level.label} Investor
					</span>

					<span style={{ pointerEvents: "none" }} className="text-xs text-zinc-400 select-none">{email}</span>
				</div>

				{/* ════════ DASHBOARD GRID ════════ */}
				<div className="grid grid-cols-2 gap-2.5 mb-5">

					{/* Row 1 — Taste Profile */}
					<button
						type="button"
						onClick={() => navigate({ to: "/my-stak" })}
						style={{ border: "1px solid rgba(6,182,212,0.35)" }}
						className="col-span-2 rounded-xl bg-white/80 dark:bg-[#0f1729]/80 backdrop-blur p-3 flex flex-col gap-2 text-left active:scale-95 transition-all hover:brightness-105 shadow-sm dark:shadow-none"
					>
						<div className="flex items-center justify-between">
							<p className="text-xs font-bold">Taste Profile</p>
							<span className="text-[10px] text-cyan-400 font-medium">{stakBrands.length} stocks &rarr;</span>
						</div>
						{stakBrands.length > 0 ? (
							<>
								<div className="flex items-center gap-1.5 flex-wrap">
									{stakBrands.slice(0, 8).map((b) => (
										<BrandLogo key={b.id} brand={b} className="w-8 h-8 rounded-full bg-white/10 border border-white/10" />
									))}
								{stakBrands.length > 8 && <span className="text-[10px] text-zinc-400">+{stakBrands.length - 8}</span>}
								</div>
								{vibes.length > 0 && (
									<div className="flex flex-col gap-1.5 pt-1.5 border-t border-zinc-200/50 dark:border-slate-700/30">
										<p className="text-[10px] text-zinc-500 leading-relaxed">{vibes[0].desc}</p>
										<div className="flex items-center gap-1 flex-wrap">
											{vibes.slice(0, 3).map((v) => (
												<span key={v.label} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-[9px] font-semibold text-fuchsia-400">
													{v.emoji} {v.label}
												</span>
											))}
										</div>
									</div>
								)}
							</>
						) : (
							<p className="text-[10px] text-zinc-500">No brands yet — start swiping to build your stak</p>
						)}
					</button>

					{/* Row 1 — My Vibe Check (full width) */}
				<div style={{ border: "1px solid rgba(168,85,247,0.4)" }} className="col-span-2 rounded-xl bg-white/80 dark:bg-[#0f1729]/80 backdrop-blur p-3 shadow-sm dark:shadow-none">
					<div className="flex items-center gap-1.5 mb-2">
						<span className="text-sm">✨</span>
						<p className="text-[11px] font-bold">My Vibe Check</p>
					</div>
					<p className="text-base font-extrabold" style={{ color: "#d946ef" }}>{vibes[0].emoji} {vibes[0].label}</p>
					<p className="text-[10px] text-zinc-500 mt-0.5 mb-3">{vibes[0].desc}</p>
					<div className="space-y-1.5">
						{vibes.map((v) => (
							<div key={v.label} className="flex items-center gap-2">
								<span className="text-xs w-4 shrink-0">{v.emoji}</span>
								<div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700/50 overflow-hidden">
									<div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 transition-all duration-500" style={{ width: v.pct + "%" }} />
								</div>
								<span className="text-[10px] text-zinc-400 w-7 text-right shrink-0">{v.pct}%</span>
							</div>
						))}
					</div>
				</div>

					{/* Row 3 — STAK Streaks & Badges */}
					<div style={{ border: "1px solid rgba(251,146,60,0.4)" }} className="rounded-xl bg-white/80 dark:bg-[#0f1729]/80 backdrop-blur p-3 flex flex-col gap-2 min-h-[110px] shadow-sm dark:shadow-none">
						{/* header + streak inline */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-1.5">
								<Flame className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
								<p className="text-[11px] font-bold">Streaks &amp; Badges</p>
							</div>
							<span className="text-sm font-extrabold text-orange-500 dark:text-orange-400">🔥 {streak}d</span>
						</div>
						{/* badges row */}
						<div className="flex items-center gap-2 flex-wrap">
							{earnedBadges.length === 0 && inProgressBadges.length === 0 ? (
								<p className="text-[10px] text-zinc-400">No badges yet — keep swiping!</p>
							) : (
								<>
									{earnedBadges.map((b) => (
										<button
											key={b.id}
											type="button"
											onClick={() => setActiveBadge(b)}
											className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
										>
											<div className="w-8 h-8 rounded-full border bg-orange-500/10 border-orange-400/30 flex items-center justify-center text-base">
												{b.emoji}
											</div>
											<span className="text-[8px] text-zinc-400 dark:text-zinc-500 leading-tight text-center w-9 truncate">{b.label}</span>
										</button>
									))}
									{inProgressBadges.map((b) => (
										<button
											key={b.id}
											type="button"
											onClick={() => setActiveBadge(b)}
											className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform opacity-40"
										>
											<div className="relative w-8 h-8 rounded-full border border-zinc-600/40 bg-zinc-800/40 flex items-center justify-center text-base grayscale">
												{b.emoji}
												<div className="absolute inset-0 rounded-full overflow-hidden">
													<div className="absolute bottom-0 left-0 right-0 bg-orange-500/20 transition-all" style={{ height: `${b.progress * 100}%` }} />
												</div>
											</div>
											<span className="text-[8px] text-zinc-500 leading-tight text-center w-9 truncate">{b.label}</span>
										</button>
									))}
								</>
							)}
						</div>
					</div>

					{/* Row 2 — Intel Library */}
					<button
						type="button"
						onClick={() => setShowLibrary(true)}
						style={{ border: "1px solid rgba(6,182,212,0.25)" }}
						className="rounded-xl bg-white/80 dark:bg-[#0f1729]/80 backdrop-blur p-3 flex flex-col justify-between min-h-[110px] active:scale-[0.99] transition-all hover:brightness-105 shadow-sm dark:shadow-none text-left"
					>
						<div className="flex items-center gap-1.5">
							<BookOpen className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
							<p className="text-[11px] font-bold">Intel Library</p>
						</div>
						{readCards.length === 0 ? (
							<p className="text-[10px] text-zinc-400 leading-tight">Swipe 5× to unlock your first insight</p>
						) : (
							<div>
								<p className="text-2xl font-extrabold text-cyan-500 dark:text-cyan-400 leading-none">{readCards.length}</p>
								<p className="text-[10px] text-zinc-500 mt-0.5">{readCards.length === 1 ? "insight" : "insights"} unlocked</p>
							</div>
						)}
						<div className="w-full h-1 rounded-full bg-zinc-200 dark:bg-slate-700 overflow-hidden">
							<div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${(readCards.length / INTEL_CARDS.length) * 100}%` }} />
						</div>
					</button>

				</div>

				{/* ════════ SETTINGS LIST ════════ */}
				<div className="rounded-xl bg-white/80 dark:bg-[#0f1729]/80 backdrop-blur border border-zinc-200 dark:border-slate-700/30 divide-y divide-zinc-100 dark:divide-slate-700/30 mb-5 shadow-sm dark:shadow-none">
					{[
						{ icon: User, label: "Personal Details", iconBg: "bg-blue-500/15", iconColor: "text-blue-400", to: "/profile/personal-details" as const },
						{ icon: Shield, label: "Security & Password", iconBg: "bg-purple-500/15", iconColor: "text-purple-400", to: "/profile/security" as const },
					].map((item) => (
						<button
							key={item.label}
							type="button"
							onClick={() => item.to && navigate({ to: item.to })}
							className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-zinc-50 dark:hover:bg-slate-800/30 transition-colors first:rounded-t-xl"
						>
							<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.iconBg}`}>
								<item.icon className={`w-4 h-4 ${item.iconColor}`} />
							</div>
							<span className="flex-1 text-left text-sm font-medium">{item.label}</span>
							<ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
						</button>
					))}

					{/* Dark/Light mode toggle */}
					<div className="flex items-center gap-3 px-3.5 py-3">
						<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${resolvedTheme === "dark" ? "bg-indigo-500/15" : "bg-amber-500/15"}`}>
							{resolvedTheme === "dark" ? (
								<Moon className="w-4 h-4 text-indigo-400" />
							) : (
								<Sun className="w-4 h-4 text-amber-400" />
							)}
						</div>
						<span
							id="theme-toggle-label"
							className="flex-1 text-sm font-medium"
						>
							{resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}
						</span>
						<button
							type="button"
							role="switch"
							aria-checked={resolvedTheme === "dark"}
							aria-labelledby="theme-toggle-label"
							onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
							className={`relative w-11 h-6 rounded-full transition-colors ${
								resolvedTheme === "dark"
									? "bg-violet-500"
									: "bg-zinc-300"
							}`}
						>
							<span
								className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
									resolvedTheme === "dark" ? "translate-x-5" : "translate-x-0"
								}`}
							/>
						</button>
					</div>

					<button
						type="button"
						onClick={() => navigate({ to: "/profile/help-support" })}
						className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-zinc-50 dark:hover:bg-slate-800/30 transition-colors last:rounded-b-xl"
					>
						<div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15">
							<HelpCircle className="w-4 h-4 text-amber-400" />
						</div>
						<span className="flex-1 text-left text-sm font-medium">Help & Support</span>
						<ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
					</button>
				</div>

				{/* ════════ LOG OUT ════════ */}
				<button
					type="button"
					onClick={handleLogout}
					className="w-full py-2.5 text-red-500 dark:text-red-400 font-semibold text-sm hover:text-red-600 dark:hover:text-red-300 transition-colors active:scale-95"
				>
					Log Out
				</button>
			</div>

			{/* ════════ INTEL LIBRARY BOTTOM SHEET ════════ */}
			{showLibrary && createPortal(
				<div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
					<div
						aria-hidden="true"
						className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
						onClick={() => { setShowLibrary(false); setSheetTranslate(0); }}
					/>
					<div
						className="relative z-[1] bg-white dark:bg-[#0d1525] rounded-t-3xl max-h-[65vh] flex flex-col border border-zinc-200 dark:border-cyan-500/20"
						style={{ transform: `translateY(${sheetTranslate}px)`, transition: sheetTranslate === 0 ? "transform 0.3s ease" : "none" }}
						onTouchStart={(e) => { sheetDragStartY.current = e.touches[0].clientY; }}
						onTouchMove={(e) => { const dy = e.touches[0].clientY - sheetDragStartY.current; if (dy > 0) setSheetTranslate(dy); }}
						onTouchEnd={() => { if (sheetTranslate > 80) { setShowLibrary(false); setSheetTranslate(0); } else { setSheetTranslate(0); } }}
					>
						{/* Drag handle */}
						<div className="px-5 pt-4 pb-3 shrink-0 cursor-grab active:cursor-grabbing">
							<div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-slate-600 mx-auto mb-4" />
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-base font-bold">Intel Library</h3>
									<p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{readCards.length} of {INTEL_CARDS.length} concepts unlocked</p>
								</div>
								<button type="button" onClick={() => { setShowLibrary(false); setSheetTranslate(0); }} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-slate-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
									<X className="w-4 h-4" />
								</button>
							</div>
						</div>
						<div className="overflow-y-auto px-5 pb-8 space-y-2">
							{readCards.length === 0 ? (
								<div className="py-12 text-center">
									<p className="text-3xl mb-3">📚</p>
									<p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">No cards read yet</p>
									<p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Swipe 5 times on Discover to get your first Intel Card</p>
								</div>
							) : (
								readCards.map((card) => (
									<button
										key={card.id}
										type="button"
										onClick={() => { setReviewCard(card); setShowLibrary(false); setSheetTranslate(0); }}
										className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-[#0f1729] border border-zinc-200 dark:border-slate-700/30 text-left hover:border-cyan-500/30 active:scale-[0.98] transition-all"
									>
										<span className="text-2xl shrink-0">{card.emoji}</span>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-semibold truncate">{card.title}</p>
											<p className="text-[11px] text-zinc-400 dark:text-zinc-500 line-clamp-1 mt-0.5">{card.takeaway}</p>
										</div>
										<ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
									</button>
								))
							)}
						</div>
					</div>
				</div>,
				document.body,
			)}

			{/* ════════ INTEL CARD REVIEW MODAL ════════ */}
			{reviewCard && <IntelCardModal card={reviewCard} onDismiss={() => setReviewCard(null)} />}

		{/* Badge info tooltip */}
		{activeBadge && createPortal(
			<div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "6rem" }}>
				<div aria-hidden="true" className="fixed inset-0" onClick={() => setActiveBadge(null)} />
				<div className="relative z-[1] bg-white dark:bg-[#0d1525] rounded-2xl border border-zinc-200 dark:border-orange-400/20 shadow-2xl p-5 mx-4 max-w-xs w-full text-center">
					<div className={`text-4xl mb-2 ${activeBadge.progress < 1 ? "grayscale opacity-50" : ""}`}>{activeBadge.emoji}</div>
					<p className="text-base font-bold mb-1">{activeBadge.label}</p>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">{activeBadge.desc}</p>
					{activeBadge.progress < 1 && (
						<div className="mt-3">
							<div className="flex justify-between text-[10px] text-zinc-500 mb-1">
								<span>Progress</span>
								<span>{activeBadge.progressLabel}</span>
							</div>
							<div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-slate-700 overflow-hidden">
								<div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${activeBadge.progress * 100}%` }} />
							</div>
						</div>
					)}
					{activeBadge.progress >= 1 && (
						<p className="text-[11px] text-orange-400 font-semibold mt-2">✓ Earned</p>
					)}
					<button type="button" onClick={() => setActiveBadge(null)} className="mt-4 w-full py-2 rounded-xl bg-orange-500/15 text-orange-400 text-sm font-semibold hover:bg-orange-500/25 transition-colors">
						Got it
					</button>
				</div>
			</div>,
			document.body,
		)}
		</div>
	);
}
