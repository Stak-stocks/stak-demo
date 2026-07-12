import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { toast } from "sonner";
import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useBrandsList } from "@/hooks/useBrandsList";
import { TAG_SCORE_MAX } from "@/lib/constants";
import { getTodayKey, getYesterdayKey } from "@/lib/utils";
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
	TrendingUp,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { computeDisplayCategoryPercentages } from "@stak/shared";

const DISPLAY_CATEGORIES = [
	{ key: "techCurious",     label: "Tech Curious",       color: "from-blue-500 to-cyan-500",    bg: "bg-blue-500/10",    text: "text-blue-300"    },
	{ key: "consumerBrands",  label: "Consumer Brands",    color: "from-fuchsia-500 to-pink-500", bg: "bg-fuchsia-500/10", text: "text-fuchsia-300" },
	{ key: "highGrowth",      label: "High Growth",        color: "from-emerald-500 to-teal-500", bg: "bg-emerald-500/10", text: "text-emerald-300" },
	{ key: "incomeDividends", label: "Income & Dividends", color: "from-amber-500 to-yellow-400", bg: "bg-amber-500/10",   text: "text-amber-300"   },
	{ key: "speculativePlays",label: "Speculative Plays",  color: "from-orange-500 to-red-500",   bg: "bg-orange-500/10",  text: "text-orange-300"  },
] as const;

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
	const { appUser, loading, logout } = useAuth();
	const { account, updatePreferences } = useAccount();
	const { resolvedTheme, setTheme } = useTheme();
	const navigate = useNavigate();

	// Stak brands — derived from Firestore account (only the count is ever used here)
	const { data: allBrands } = useBrandsList();
	const stakBrands = useMemo(() => {
		const brandMap = new Map((allBrands ?? []).map((b) => [b.id, b]));
		return (account?.stakBrandIds ?? [])
			.map((id) => brandMap.get(id))
			.filter(Boolean);
	}, [account?.stakBrandIds, allBrands]);


	// Badge tooltip
	const [activeBadge, setActiveBadge] = useState<{ emoji: string; label: string; desc: string; progress: number; progressLabel?: string } | null>(null);

	// Streak — from backend's authoritative tracker
	// Backend now stores the user's own local-day key (getTodayKey, sent as todayKey
	// on each swipe/event) -- compare against the same local-day keys, not UTC.
	const todayKey = getTodayKey();
	const yesterdayKey = getYesterdayKey();
	const streak = (account?.lastStreakDate === todayKey || account?.lastStreakDate === yesterdayKey)
		? (account?.streakCount ?? 0) : 0;
	const totalSwipeCount = account?.totalSwipeCount ?? 0;
	const totalIntelViews = account?.totalIntelViews ?? 0;
	const earnedBackendBadges = new Set(account?.badges ?? []);

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

	// STAK Taste — derived from weighted tagScores (set by backend on every swipe)
	const tagScores = account?.tagScores ?? {};
	const displayCategories = computeDisplayCategoryPercentages(tagScores);
	const hasTagScores = Object.keys(tagScores).length > 0;

	// Badges — all badges with progress tracking
	const hasStaked = stakBrands.length >= 1;

	const allBadges = [
		// Stak-building badges (derived from current stak size)
		{ id: "first-swipe",          label: "First Move",          emoji: "✅", desc: "You've started — most people never do.",             earned: hasStaked,                                            progress: Math.min(stakBrands.length, 1),               progressLabel: `${Math.min(stakBrands.length, 1)}/1 brand`      },
		{ id: "stak-builder",         label: "Stak Builder",        emoji: "🏗️", desc: "Built a Stak of 5 or more brands.",                  earned: stakBrands.length >= 5,                               progress: Math.min(stakBrands.length / 5, 1),           progressLabel: `${stakBrands.length}/5 brands`                  },
		{ id: "full-stak",            label: "Full Stak",           emoji: "💯", desc: "Maxed out your Stak with 15 brands.",                 earned: stakBrands.length >= 15,                              progress: Math.min(stakBrands.length / 15, 1),          progressLabel: `${stakBrands.length}/15 brands`                 },
		// Swipe badges (from backend totalSwipeCount)
		{ id: "explorer",             label: "Explorer",            emoji: "🌍", desc: "Made your first swipe.",                              earned: earnedBackendBadges.has("explorer") || totalSwipeCount >= 1,  progress: Math.min(totalSwipeCount, 1),           progressLabel: `${Math.min(totalSwipeCount, 1)}/1 swipe`        },
		{ id: "curious_mind",         label: "Curious Mind",        emoji: "🧠", desc: "10 swipes in — you're getting curious.",              earned: earnedBackendBadges.has("curious_mind") || totalSwipeCount >= 10, progress: Math.min(totalSwipeCount / 10, 1),   progressLabel: `${Math.min(totalSwipeCount, 10)}/10 swipes`     },
		// Intel badge (from backend totalIntelViews)
		{ id: "pattern_recognizer",   label: "Pattern Recognizer",  emoji: "📡", desc: "Viewed 15 intel cards — you're seeing the patterns.", earned: earnedBackendBadges.has("pattern_recognizer") || totalIntelViews >= 15, progress: Math.min(totalIntelViews / 15, 1), progressLabel: `${Math.min(totalIntelViews, 15)}/15 cards`   },
		// Streak badges (from backend streakCount + earned badges array)
		{ id: "consistent_learner",   label: "Consistent Learner",  emoji: "🔥", desc: "5-day streak — your investor mindset is forming.",    earned: earnedBackendBadges.has("consistent_learner") || streak >= 5,  progress: Math.min(streak / 5, 1),               progressLabel: `${Math.min(streak, 5)}/5 days`                  },
		{ id: "market_explorer",      label: "Market Explorer",     emoji: "⚡", desc: "7-day streak — you're building real momentum.",       earned: earnedBackendBadges.has("market_explorer") || streak >= 7,    progress: Math.min(streak / 7, 1),               progressLabel: `${Math.min(streak, 7)}/7 days`                  },
		{ id: "trend_reader",         label: "Trend Reader",        emoji: "📈", desc: "14-day streak — you now see insights before others.", earned: earnedBackendBadges.has("trend_reader") || streak >= 14,      progress: Math.min(streak / 14, 1),              progressLabel: `${Math.min(streak, 14)}/14 days`                },
		{ id: "market_insider",       label: "STAK Insider",        emoji: "💎", desc: "30-day streak — you're in the top % of users.",      earned: earnedBackendBadges.has("market_insider") || streak >= 30,    progress: Math.min(streak / 30, 1),              progressLabel: `${Math.min(streak, 30)}/30 days`                },
	];
	const earnedBadges = allBadges.filter((b) => b.earned);
	const inProgressBadges = allBadges.filter((b) => !b.earned && b.progress > 0);

	// appUser covers both Firebase (user.displayName) and Supabase (from session metadata)
	const displayName = appUser?.displayName || account?.displayName || "STAK User";
	const email = appUser?.email || "";

	async function handleLogout() {
		await logout();
		toast.success("Signed out");
		navigate({ to: "/login" });
	}

	useEffect(() => {
		if (!loading && !appUser) {
			navigate({ to: "/login" });
		}
	}, [loading, appUser, navigate]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!appUser) {
		return null;
	}

	return (
		<div className="min-h-full bg-background text-foreground pb-24 relative">

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
							{appUser.photoURL ? (
								<img src={appUser.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
							) : (
								<div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-[26px] font-extrabold text-foreground">
									{displayName.charAt(0).toUpperCase()}
								</div>
							)}
						</div>
					</div>

					<h1 className="text-xl font-bold tracking-tight">{displayName}</h1>

					<span style={{ pointerEvents: "none" }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-400/30 dark:border-emerald-400/25 text-emerald-600 dark:text-emerald-300 text-xs font-medium">
						<span className="text-sm">{starsDisplay}</span> {level.label} Investor
					</span>

					<span style={{ pointerEvents: "none" }} className="text-xs dark:text-zinc-400 text-zinc-600 select-none">{email}</span>
				</div>

				{/* ════════ STATS CARDS ════════ */}
				<div className="space-y-[10px] mb-[18px]">

					{/* STAK Taste */}
					<div className="rounded-[14px] border border-violet-500/20 bg-surface-1 p-[14px]">
						<div className="flex items-center justify-between mb-[12px]">
							<div className="flex items-center gap-[8px]">
								<div className="grid h-[28px] w-[28px] place-items-center rounded-[7px] bg-violet-500/10 text-violet-400"><TrendingUp className="w-[14px] h-[14px]" /></div>
								<p className="text-[13px] font-bold">STAK Taste</p>
							</div>
							<button type="button" onClick={() => navigate({ to: "/my-stak" })} className="text-[11px] text-violet-400 font-medium">{stakBrands.length} stocks →</button>
						</div>
						{hasTagScores ? (
							<div className="space-y-[8px]">
								{DISPLAY_CATEGORIES.map(({ key, label, color, text }) => {
									const pct = displayCategories[key] ?? 0;
									return (
										<div key={key} className="flex items-center gap-[10px]">
											<span className={`text-[11px] font-medium w-[100px] shrink-0 ${text}`}>{label}</span>
											<div className="flex-1 h-[5px] rounded-full bg-foreground/10 overflow-hidden">
												<div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
											</div>
											<span className="text-[11px] dark:text-slate-400 text-slate-500 w-7 text-right shrink-0 tabular-nums">{pct}%</span>
										</div>
									);
								})}
							</div>
						) : (
							<p className="text-[12px] dark:text-slate-400 text-slate-500">Start swiping to build your taste profile.</p>
						)}
					</div>

					{/* Streak & Badges */}
					<div className="rounded-[14px] border border-orange-500/20 bg-surface-1 p-[14px]">
						<div className="flex items-center justify-between mb-[12px]">
							<div className="flex items-center gap-[8px]">
								<div className="grid h-[28px] w-[28px] place-items-center rounded-[7px] bg-orange-500/10 text-orange-400"><Flame className="w-[14px] h-[14px]" /></div>
								<p className="text-[13px] font-bold">Streak &amp; Badges</p>
							</div>
							<span className="text-[14px] font-extrabold text-orange-500 dark:text-orange-400">🔥 {streak}d</span>
						</div>
						<div className="flex items-center gap-[10px] flex-wrap">
							{earnedBadges.length === 0 && inProgressBadges.length === 0 ? (
								<p className="text-[12px] dark:text-slate-400 text-slate-500">No badges yet — keep swiping!</p>
							) : (
								<>
									{earnedBadges.map((b) => (
										<button key={b.id} type="button" onClick={() => setActiveBadge(b)} className="flex flex-col items-center gap-[4px] active:scale-90 transition-transform">
											<div className="w-[38px] h-[38px] rounded-[10px] border border-orange-400/30 bg-orange-500/10 flex items-center justify-center text-[18px]">{b.emoji}</div>
											<span className="text-[9px] dark:text-slate-400 text-slate-500 leading-tight text-center w-[42px] truncate">{b.label}</span>
										</button>
									))}
									{inProgressBadges.map((b) => (
										<button key={b.id} type="button" onClick={() => setActiveBadge(b)} className="flex flex-col items-center gap-[4px] active:scale-90 transition-transform opacity-35">
											<div className="relative w-[38px] h-[38px] rounded-[10px] border border-foreground/10 bg-foreground/[0.04] flex items-center justify-center text-[18px] grayscale">
												{b.emoji}
												<div className="absolute inset-0 rounded-[10px] overflow-hidden"><div className="absolute bottom-0 left-0 right-0 bg-orange-500/20 transition-all" style={{ height: `${b.progress * 100}%` }} /></div>
											</div>
											<span className="text-[9px] dark:text-slate-500 text-slate-400 leading-tight text-center w-[42px] truncate">{b.label}</span>
										</button>
									))}
								</>
							)}
						</div>
					</div>



				</div>

				{/* ════════ SETTINGS LIST ════════ */}
				<div className="rounded-[14px] bg-surface-1 border border-foreground/10 divide-y divide-foreground/[0.06] mb-[18px]">
					{[
						{ icon: User, label: "Personal Details", iconBg: "bg-blue-500/15", iconColor: "text-blue-400", to: "/profile/personal-details" as const },
						{ icon: Shield, label: "Security & Password", iconBg: "bg-purple-500/15", iconColor: "text-purple-400", to: "/profile/security" as const },
					].map((item) => (
						<button
							key={item.label}
							type="button"
							onClick={() => item.to && navigate({ to: item.to })}
							className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-foreground/[0.03] transition-colors first:rounded-t-xl"
						>
							<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.iconBg}`}>
								<item.icon className={`w-4 h-4 ${item.iconColor}`} />
							</div>
							<span className="flex-1 text-left text-sm font-medium">{item.label}</span>
							<ChevronRight className="w-4 h-4 text-zinc-700 dark:text-zinc-600" />
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
							onClick={() => {
							const next = resolvedTheme === "dark" ? "light" : "dark";
							setTheme(next);
							updatePreferences({ ...account?.preferences, theme: next });
						}}
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
						className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-foreground/[0.03] transition-colors last:rounded-b-xl"
					>
						<div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15">
							<HelpCircle className="w-4 h-4 text-amber-400" />
						</div>
						<span className="flex-1 text-left text-sm font-medium">Help & Support</span>
						<ChevronRight className="w-4 h-4 dark:text-zinc-300 text-zinc-700 dark:text-zinc-600" />
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

		{/* Badge info tooltip */}
		{activeBadge && createPortal(
			<div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "6rem" }}>
				<div aria-hidden="true" className="fixed inset-0" onClick={() => setActiveBadge(null)} />
				<div className="relative z-[1] bg-white dark:bg-surface-1 rounded-2xl border border-zinc-200 dark:border-orange-400/20 shadow-2xl p-5 mx-4 max-w-xs w-full text-center">
					<div className={`text-4xl mb-2 ${activeBadge.progress < 1 ? "grayscale opacity-50" : ""}`}>{activeBadge.emoji}</div>
					<p className="text-base font-bold mb-1">{activeBadge.label}</p>
					<p className="text-sm text-zinc-500 dark:dark:text-zinc-400 text-zinc-600">{activeBadge.desc}</p>
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
