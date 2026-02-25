import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { BrandProfile } from "@/data/brands";
import { getBrandLogoUrl } from "@/data/brands";
import { INTEL_CARDS, type IntelCard } from "@/data/intelCards";
import { IntelCardModal } from "@/components/IntelCardModal";
import { getIntelState } from "@/lib/api";
import { INTEREST_TO_BRANDS } from "@/data/onboarding";
import {
	ChevronRight,
	User,
	Shield,
	HelpCircle,
	BookOpen,
	X,
	Flame,
} from "lucide-react";

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

function computeVibe(stakBrands: BrandProfile[]): { label: string; emoji: string; desc: string } {
	const scores: Record<string, number> = {};
	for (const brand of stakBrands) {
		const cats = BRAND_TO_CATS[brand.id] ?? [];
		for (const cat of cats) {
			scores[cat] = (scores[cat] ?? 0) + 1;
		}
	}
	const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "tech";
	return VIBE_MAP[top] ?? VIBE_MAP.tech;
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
	const navigate = useNavigate();

	const [stakBrands, setStakBrands] = useState<BrandProfile[]>(() => {
		const saved = localStorage.getItem("my-stak");
		return saved ? JSON.parse(saved) : [];
	});

	useEffect(() => {
		const handler = () => {
			const saved = localStorage.getItem("my-stak");
			setStakBrands(saved ? JSON.parse(saved) : []);
		};
		globalThis.addEventListener("stak-updated", handler);
		return () => globalThis.removeEventListener("stak-updated", handler);
	}, []);

	// Intel Library
	const [readCards, setReadCards] = useState<IntelCard[]>([]);
	const [showLibrary, setShowLibrary] = useState(false);
	const [reviewCard, setReviewCard] = useState<IntelCard | null>(null);

	// Badge tooltip
	const [activeBadge, setActiveBadge] = useState<{ emoji: string; label: string; desc: string } | null>(null);

	useEffect(() => {
		getIntelState()
			.then(({ readIds }) => {
				setReadCards(INTEL_CARDS.filter((c) => readIds.includes(c.id)));
			})
			.catch(() => {});
	}, []);

	// Streak
	const streak = (() => {
		const raw = localStorage.getItem("stak-streak");
		return raw ? (JSON.parse(raw) as { date: string; count: number }).count : 0;
	})();

	// Vibe check — computed from actual swiped brands
	const vibe = computeVibe(stakBrands);

	// Badges — only show ones the user has earned
	const earnedBadges = [
		{ id: "first-swipe",    label: "First Swipe",      emoji: "✅", desc: "Added your first brand to the Stak.",          earned: stakBrands.length >= 1  },
		{ id: "stak-builder",   label: "Stak Builder",      emoji: "🏗️", desc: "Built a Stak of 5 or more brands.",            earned: stakBrands.length >= 5  },
		{ id: "full-stak",      label: "Full Stak",         emoji: "💯", desc: "Maxed out your Stak with 15 brands.",          earned: stakBrands.length >= 15 },
		{ id: "intel-junky",    label: "Intel Junky",       emoji: "🧠", desc: "Read 5 Intel cards — you're learning fast.",   earned: readCards.length >= 5   },
		{ id: "knowledge-hoarder", label: "All-Knowing",    emoji: "📚", desc: "Read every Intel card in the library.",        earned: readCards.length >= INTEL_CARDS.length },
		{ id: "week-warrior",   label: "Week Warrior",      emoji: "🔥", desc: "Kept a 7-day swiping streak. Consistent!",    earned: streak >= 7             },
		{ id: "monthly-legend", label: "Monthly Legend",    emoji: "💎", desc: "30-day streak. You're a STAK legend.",        earned: streak >= 30            },
	].filter((b) => b.earned);

	const displayName = user?.displayName || "STAK User";
	const email = user?.email || "";

	// Determine user level from onboarding familiarity
	let userLevel = "Beginner";
	const familiarity = (typeof window !== "undefined" ? localStorage.getItem("onboarding-familiarity") : null) || "";
	if (familiarity === "some") userLevel = "Intermediate";
	else if (familiarity === "experienced") userLevel = "Advanced";

	async function handleLogout() {
		await logout();
		toast.success("Signed out");
		navigate({ to: "/login" });
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full bg-background">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!user) {
		navigate({ to: "/login" });
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

					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-400/30 dark:border-emerald-400/25 text-emerald-600 dark:text-emerald-300 text-xs font-medium">
						<span className="text-sm">🏆</span> {userLevel} Investor
					</span>

					<span className="text-xs text-zinc-400">{email}</span>
				</div>

				{/* ════════ DASHBOARD GRID ════════ */}
				<div className="grid grid-cols-2 gap-2.5 mb-5">

					{/* Row 1 — Taste Profile */}
					<button
						type="button"
						onClick={() => navigate({ to: "/my-stak" })}
						style={{ border: "1px solid rgba(6,182,212,0.35)" }}
						className="rounded-xl bg-white/80 dark:bg-[#0f1729]/80 backdrop-blur p-3 flex flex-col justify-between min-h-[100px] text-left active:scale-95 transition-all hover:brightness-105 shadow-sm dark:shadow-none"
					>
						<p className="text-xs font-bold">Taste Profile</p>
						<div>
							{stakBrands.length > 0 ? (
								<div className="flex items-center gap-1 mt-1 mb-1">
									{stakBrands.slice(0, 3).map((b) => (
										<div key={b.id} className="w-7 h-7 rounded-full bg-white/10 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
											<img src={getBrandLogoUrl(b)} alt={b.name} className="w-5 h-5 object-contain" />
										</div>
									))}
									{stakBrands.length > 3 && <span className="text-[10px] text-zinc-400 ml-0.5">+{stakBrands.length - 3}</span>}
								</div>
							) : (
								<p className="text-[10px] text-zinc-500 mt-1 mb-1">No brands yet</p>
							)}
							<p className="text-[10px] text-zinc-500">Learn your taste &amp; discover stocks you vibe with</p>
						</div>
					</button>

					{/* Row 1 — My Vibe Check */}
					<div style={{ border: "1px solid rgba(168,85,247,0.4)" }} className="rounded-xl bg-white/80 dark:bg-[#0f1729]/80 backdrop-blur p-3 flex flex-col justify-between min-h-[100px] shadow-sm dark:shadow-none">
						<div className="flex items-center gap-1.5">
							<span className="text-sm">🤖</span>
							<p className="text-[11px] font-bold">My Vibe Check</p>
						</div>
						<div>
							<p className="text-base font-extrabold" style={{ color: "#d946ef" }}>{vibe.emoji} {vibe.label}</p>
							<p className="text-[10px] text-zinc-500 mt-0.5">{vibe.desc}</p>
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
							{earnedBadges.length === 0 ? (
								<p className="text-[10px] text-zinc-400">No badges yet — keep swiping!</p>
							) : earnedBadges.map((b) => (
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
						{ icon: HelpCircle, label: "Help & Support", iconBg: "bg-amber-500/15", iconColor: "text-amber-400", to: null },
					].map((item) => (
						<button
							key={item.label}
							type="button"
							onClick={() => item.to && navigate({ to: item.to })}
							className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-zinc-50 dark:hover:bg-slate-800/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
						>
							<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.iconBg}`}>
								<item.icon className={`w-4 h-4 ${item.iconColor}`} />
							</div>
							<span className="flex-1 text-left text-sm font-medium">{item.label}</span>
							<ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
						</button>
					))}
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
						onClick={() => setShowLibrary(false)}
					/>
					<div className="relative z-[1] bg-white dark:bg-[#0d1525] rounded-t-3xl max-h-[80vh] flex flex-col border border-zinc-200 dark:border-cyan-500/20">
						<div className="px-5 pt-4 pb-3 shrink-0">
							<div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-slate-600 mx-auto mb-4" />
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-base font-bold">Intel Library</h3>
									<p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{readCards.length} of {INTEL_CARDS.length} concepts unlocked</p>
								</div>
								<button type="button" onClick={() => setShowLibrary(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-slate-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
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
										onClick={() => { setReviewCard(card); setShowLibrary(false); }}
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
					<div className="text-4xl mb-2">{activeBadge.emoji}</div>
					<p className="text-base font-bold mb-1">{activeBadge.label}</p>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">{activeBadge.desc}</p>
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
