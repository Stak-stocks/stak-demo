import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { BrandProfile } from "@/data/brands";
import { getBrandLogoUrl } from "@/data/brands";
import {
	ChevronRight,
	Pencil,
	DollarSign,
	Star,
	PieChart,
	Newspaper,
	User,
	Shield,
	HelpCircle,
	LayoutGrid,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

/* ── Donut Chart (SVG) ── */
function DonutChart({ value, size = 80, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
	const r = (size - strokeWidth) / 2;
	const C = 2 * Math.PI * r;
	const offset = C - (value / 100) * C;
	return (
		<svg width={size} height={size} className="-rotate-90">
			<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
			<circle
				cx={size / 2} cy={size / 2} r={r} fill="none"
				stroke="url(#donutGrad)" strokeWidth={strokeWidth}
				strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
			/>
			<defs>
				<linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#06b6d4" />
					<stop offset="100%" stopColor="#22d3ee" />
				</linearGradient>
			</defs>
		</svg>
	);
}

/* ── Floating Brand Icon (background decoration) ── */
function FloatingIcon({ src, className }: { src: string; className: string }) {
	return (
		<div className={`absolute rounded-xl overflow-hidden opacity-30 ${className}`}>
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
		window.addEventListener("stak-updated", handler);
		return () => window.removeEventListener("stak-updated", handler);
	}, []);

	const displayName = user?.displayName || "STAK User";
	const email = user?.email || "";
	const visibleLogos = stakBrands.slice(0, 6);
	const extraCount = Math.max(0, stakBrands.length - 6);

	async function handleLogout() {
		await logout();
		toast.success("Signed out");
		navigate({ to: "/login" });
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#0b1121]">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!user) {
		navigate({ to: "/login" });
		return null;
	}

	return (
		<div className="min-h-screen bg-[#080d1c] text-white pb-28 overflow-hidden relative">

			{/* ── Scattered floating brand icons ── */}
			<div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
				{/* Row 1 — top */}
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/nike--600.png"               className="w-10 h-10 top-4 left-3 rotate-[-8deg]" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/amazon--600.png"             className="w-9 h-9 top-14 left-12 rotate-6" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/netflix--600.png"            className="w-8 h-8 top-6 left-[38%] -rotate-3" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/tesla--600.png"              className="w-9 h-9 top-2 right-[32%] rotate-[-5deg]" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/spotify-technology--600.png" className="w-10 h-10 top-3 right-4 rotate-12" />

				{/* Row 2 — mid */}
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/meta-platforms--600.png"     className="w-8 h-8 top-[110px] left-[28%] rotate-3" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/apple--600.png"              className="w-8 h-8 top-[105px] right-6 -rotate-12" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/starbucks--600.png"          className="w-7 h-7 top-28 left-2 rotate-12" />

				{/* Row 3 — below avatar area */}
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/alphabet--600.png"           className="w-8 h-8 top-[260px] left-5 -rotate-6" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/microsoft--600.png"          className="w-9 h-9 top-[240px] right-8 rotate-6" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/walt-disney--600.png"        className="w-7 h-7 top-[280px] left-[22%] rotate-[-10deg]" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/nvidia--600.png"             className="w-8 h-8 top-[270px] right-[20%] rotate-4" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/uber--600.png"               className="w-7 h-7 top-[310px] left-[50%] -rotate-8" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/coinbase--600.png"           className="w-7 h-7 top-[340px] right-4 rotate-[-6deg]" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/airbnb--600.png"             className="w-6 h-6 top-[360px] left-8 rotate-10" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/adobe--600.png"              className="w-8 h-8 top-[400px] right-[30%] -rotate-5" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/shopify--600.png"            className="w-7 h-7 top-[430px] left-[35%] rotate-8" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/robinhood--600.png"          className="w-7 h-7 top-[460px] right-10 rotate-[-4deg]" />
			</div>

			<div className="relative max-w-lg mx-auto px-5 pt-14">

				{/* ════════ PROFILE HEADER ════════ */}
				<div className="flex flex-col items-center gap-2.5 mb-8">
					{/* Avatar with glow ring */}
					<div className="relative mb-1">
						<div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-slate-600/40 to-slate-800/20 blur-md" />
						<div className="relative w-[100px] h-[100px] rounded-full ring-[3px] ring-slate-600/50 overflow-hidden bg-slate-800 shadow-xl shadow-black/40">
							{user.photoURL ? (
								<img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
							) : (
								<div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400">
									{displayName.charAt(0).toUpperCase()}
								</div>
							)}
						</div>
					</div>

					<h1 className="text-[26px] font-bold tracking-tight">{displayName}</h1>

					{/* Badge — green tint matching the design */}
					<span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-sm font-medium">
						<span className="text-base">🏆</span> Intermediate Investor
					</span>

					{/* Email + Edit Profile */}
					<div className="flex items-center gap-3 mt-0.5">
						<span className="text-sm text-zinc-400">{email}</span>
						<button
							type="button"
							className="inline-flex items-center gap-1 text-zinc-300 text-xs hover:text-white transition-colors"
						>
							<Pencil className="w-3 h-3" />
							Edit Profile
							<ChevronRight className="w-3 h-3 -ml-0.5" />
						</button>
					</div>
				</div>

				{/* ════════ DASHBOARD CARDS 2×2 ════════ */}
				<div className="grid grid-cols-2 gap-3 mb-6">

					{/* ─ Dividend Income ─ */}
					<div className="rounded-2xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 p-4">
						<div className="flex items-center gap-2 mb-3">
							<div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
								<DollarSign className="w-4 h-4 text-green-400" />
							</div>
							<span className="text-[13px] font-medium text-zinc-300">Dividend Income</span>
						</div>
						<p className="text-[28px] font-bold leading-none mb-1">$234</p>
						<p className="text-xs">
							<span className="text-green-400 font-medium">+9%</span>
							<span className="text-zinc-500 ml-1">This Month</span>
						</p>
						{/* Sparkline */}
						<svg className="mt-3 w-full h-8" viewBox="0 0 120 30" fill="none">
							<path d="M0 25 Q10 22,20 20 T40 18 T60 12 T80 15 T100 8 T120 5" stroke="rgba(34,197,94,0.6)" strokeWidth="1.5" fill="none" />
							<path d="M0 25 Q10 22,20 20 T40 18 T60 12 T80 15 T100 8 T120 5 V30 H0Z" fill="url(#sg)" />
							<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(34,197,94,0.18)" /><stop offset="100%" stopColor="rgba(34,197,94,0)" /></linearGradient></defs>
						</svg>
					</div>

					{/* ─ Analyst Ratings ─ */}
					<div className="rounded-2xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 p-4">
						<div className="flex items-center gap-2 mb-3">
							<div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
								<Star className="w-4 h-4 text-amber-400" />
							</div>
							<span className="text-[13px] font-medium text-zinc-300">Analyst Ratings</span>
						</div>
						<div className="flex items-center gap-3">
							<div className="relative shrink-0">
								<DonutChart value={72} size={70} strokeWidth={7} />
								<span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold">72%</span>
							</div>
							<div className="text-xs space-y-1.5 min-w-0">
								<p className="leading-tight">
									<span className="font-semibold text-white">72%</span>{" "}
									<span className="text-zinc-400 text-[11px]">Buy Ratings</span>
								</p>
								<p className="leading-tight">
									<span className="text-cyan-400 font-semibold">18%</span>{" "}
									<span className="text-zinc-500 text-[11px]">| Hold</span>
								</p>
								<p className="leading-tight">
									<span className="text-amber-400 font-semibold">10%</span>{" "}
									<span className="text-zinc-500 text-[11px]">| Sell</span>
								</p>
							</div>
						</div>
					</div>

					{/* ─ Portfolio Allocation ─ */}
					<div className="rounded-2xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 p-4">
						<div className="flex items-center gap-2 mb-3">
							<div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
								<PieChart className="w-4 h-4 text-blue-400" />
							</div>
							<span className="text-[13px] font-medium text-zinc-300">Portfolio Allocation</span>
						</div>
						<div className="space-y-2.5 text-xs">
							{[
								{ label: "Tech", left: "45%", bar: 75, color: "bg-orange-500", right: "2%" },
								{ label: "Consumer", left: "", bar: 55, color: "bg-cyan-500", right: "30%" },
								{ label: "AI", left: "15%", bar: 35, color: "bg-blue-500", right: "10%" },
								{ label: "Other", left: "10%", bar: 20, color: "bg-slate-500", right: "" },
							].map((row) => (
								<div key={row.label} className="flex items-center gap-1.5">
									<span className="text-zinc-300 w-[70px] shrink-0 font-medium">{row.label}</span>
									<span className="text-zinc-400 w-7 text-right text-[11px]">{row.left}</span>
									<div className="flex-1 h-[6px] rounded-full bg-slate-700/60 overflow-hidden">
										<div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.bar}%` }} />
									</div>
									<span className="text-zinc-500 w-7 text-right text-[11px]">{row.right}</span>
								</div>
							))}
						</div>
					</div>

					{/* ─ Market News ─ */}
					<div className="rounded-2xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 p-4 flex flex-col">
						<div className="flex items-center gap-2 mb-3">
							<div className="w-7 h-7 rounded-full bg-slate-600/30 flex items-center justify-center">
								<Newspaper className="w-4 h-4 text-slate-300" />
							</div>
							<span className="text-[13px] font-medium text-zinc-300">Market News</span>
						</div>
						<p className="font-semibold text-sm leading-snug mb-1.5">Apple Hits All-Time High</p>
						<p className="text-zinc-500 text-xs leading-relaxed line-clamp-3 flex-1">
							AAPL stock surges 5% as they report record earnings...
						</p>
						<button
							type="button"
							onClick={() => navigate({ to: "/feed" })}
							className="mt-3 text-xs text-zinc-400 inline-flex items-center gap-0.5 hover:text-zinc-300 transition-colors"
						>
							View Details <ChevronRight className="w-3 h-3" />
						</button>
					</div>
				</div>

				{/* ════════ TASTE PROFILE ════════ */}
				<div className="mb-6">
					<h2 className="text-lg font-semibold mb-3">Taste Profile</h2>

					{/* Circular brand logos row */}
					<div className="flex items-center gap-2.5 mb-3 overflow-x-auto scrollbar-hide">
						{visibleLogos.length > 0 ? (
							<>
								{visibleLogos.map((brand) => (
									<div
										key={brand.id}
										className="w-[52px] h-[52px] rounded-full bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center shrink-0 overflow-hidden"
									>
										<img src={getBrandLogoUrl(brand)} alt={brand.name} className="w-8 h-8 rounded-full object-contain" />
									</div>
								))}
								{extraCount > 0 && (
									<div className="w-[52px] h-[52px] rounded-full bg-slate-800/60 border border-slate-700/40 flex items-center justify-center shrink-0 text-sm font-semibold text-zinc-400">
										+{extraCount}
									</div>
								)}
							</>
						) : (
							<p className="text-sm text-zinc-500 italic">Swipe brands to build your taste graph</p>
						)}
					</div>

					<p className="text-xs text-zinc-500 mb-4">Fine-tune your taste graph to discover more stocks you like</p>

					{/* Taste Profile action bar */}
					<div className="flex items-center justify-between rounded-xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 px-4 py-3">
						<div className="flex items-center gap-2 text-sm text-zinc-400">
							<LayoutGrid className="w-4 h-4" />
							<span>Taste Profile</span>
						</div>
						<button
							type="button"
							onClick={() => navigate({ to: "/my-stak" })}
							className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all active:scale-95"
						>
							View &amp; Edit
						</button>
					</div>
				</div>

				{/* ════════ SETTINGS LIST ════════ */}
				<div className="rounded-2xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 divide-y divide-slate-700/30 mb-8">
					{[
						{ icon: User, label: "Personal Details", iconBg: "bg-blue-500/15", iconColor: "text-blue-400" },
						{ icon: Shield, label: "Security & Password", iconBg: "bg-purple-500/15", iconColor: "text-purple-400" },
						{ icon: HelpCircle, label: "Help & Support", iconBg: "bg-amber-500/15", iconColor: "text-amber-400" },
					].map((item) => (
						<button
							key={item.label}
							type="button"
							className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-800/30 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
						>
							<div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.iconBg}`}>
								<item.icon className={`w-[18px] h-[18px] ${item.iconColor}`} />
							</div>
							<span className="flex-1 text-left text-[15px] font-medium">{item.label}</span>
							<ChevronRight className="w-4 h-4 text-zinc-600" />
						</button>
					))}
				</div>

				{/* ════════ LOG OUT ════════ */}
				<button
					type="button"
					onClick={handleLogout}
					className="w-full py-3 text-red-400 font-semibold text-[15px] hover:text-red-300 transition-colors active:scale-95"
				>
					Log Out
				</button>
			</div>
		</div>
	);
}
