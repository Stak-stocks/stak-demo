import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { BrandProfile } from "@/data/brands";
import { getBrandLogoUrl } from "@/data/brands";
import {
	ChevronRight,
	Pencil,
	User,
	Shield,
	HelpCircle,
	LayoutGrid,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});



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
		<div className="min-h-screen bg-[#080d1c] text-white pb-24 overflow-hidden relative">

			{/* ── Scattered floating brand icons (top area only) ── */}
			<div className="absolute inset-x-0 top-0 h-[200px] pointer-events-none select-none" aria-hidden>
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/nike--600.png"               className="w-8 h-8 top-3 left-3 rotate-[-8deg]" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/amazon--600.png"             className="w-7 h-7 top-10 left-14 rotate-6" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/netflix--600.png"            className="w-6 h-6 top-5 left-[40%] -rotate-3" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/tesla--600.png"              className="w-7 h-7 top-2 right-[30%] rotate-[-5deg]" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/spotify-technology--600.png" className="w-8 h-8 top-3 right-3 rotate-12" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/meta-platforms--600.png"     className="w-6 h-6 top-[90px] left-[26%] rotate-3" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/apple--600.png"              className="w-7 h-7 top-[85px] right-5 -rotate-12" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/starbucks--600.png"          className="w-6 h-6 top-[75px] left-2 rotate-12" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/alphabet--600.png"           className="w-6 h-6 top-[140px] left-6 -rotate-6" />
				<FloatingIcon src="https://s3-symbol-logo.tradingview.com/microsoft--600.png"          className="w-7 h-7 top-[130px] right-6 rotate-6" />
			</div>

			<div className="relative max-w-lg mx-auto px-4 pt-8">

				{/* ════════ PROFILE HEADER ════════ */}
				<div className="flex flex-col items-center gap-1.5 mb-5">
					{/* Avatar */}
					<div className="relative mb-1">
						<div className="absolute -inset-2 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 blur-lg" />
						<div className="relative w-[80px] h-[80px] rounded-full ring-[3px] ring-purple-400/40 overflow-hidden bg-slate-800 shadow-xl shadow-purple-900/30">
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

					{/* Badge */}
					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-xs font-medium">
						<span className="text-sm">🏆</span> Intermediate Investor
					</span>

					{/* Email + Edit Profile */}
					<div className="flex items-center gap-2.5 mt-0.5">
						<span className="text-xs text-zinc-400">{email}</span>
						<button
							type="button"
							className="inline-flex items-center gap-1 text-zinc-300 text-[11px] hover:text-white transition-colors"
						>
							<Pencil className="w-3 h-3" />
							Edit Profile
							<ChevronRight className="w-3 h-3 -ml-0.5" />
						</button>
					</div>
				</div>

				{/* ════════ DASHBOARD CARDS 2×2 ════════ */}
				<div className="grid grid-cols-2 gap-2.5 mb-5">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="rounded-xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 p-3 flex items-center justify-center min-h-[90px]">
							<p className="text-zinc-500 text-xs font-medium">Coming Soon</p>
						</div>
					))}
				</div>

				{/* ════════ TASTE PROFILE ════════ */}
				<div className="mb-5">
					<h2 className="text-base font-semibold mb-2">Taste Profile</h2>

					{/* Circular brand logos row */}
					<div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-hide">
						{visibleLogos.length > 0 ? (
							<>
								{visibleLogos.map((brand) => (
									<div
										key={brand.id}
										className="w-[44px] h-[44px] rounded-full bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center shrink-0 overflow-hidden"
									>
										<img src={getBrandLogoUrl(brand)} alt={brand.name} className="w-7 h-7 rounded-full object-contain" />
									</div>
								))}
								{extraCount > 0 && (
									<div className="w-[44px] h-[44px] rounded-full bg-slate-800/60 border border-slate-700/40 flex items-center justify-center shrink-0 text-xs font-semibold text-zinc-400">
										+{extraCount}
									</div>
								)}
							</>
						) : (
							<p className="text-xs text-zinc-500 italic">Swipe brands to build your taste graph</p>
						)}
					</div>

					<p className="text-[11px] text-zinc-500 mb-3">Fine-tune your taste graph to discover more stocks you like</p>

					{/* Taste Profile action bar */}
					<div className="flex items-center justify-between rounded-xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 px-3 py-2.5">
						<div className="flex items-center gap-2 text-xs text-zinc-400">
							<LayoutGrid className="w-4 h-4" />
							<span>Taste Profile</span>
						</div>
						<button
							type="button"
							onClick={() => navigate({ to: "/my-stak" })}
							className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all active:scale-95"
						>
							View &amp; Edit
						</button>
					</div>
				</div>

				{/* ════════ SETTINGS LIST ════════ */}
				<div className="rounded-xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 divide-y divide-slate-700/30 mb-5">
					{[
						{ icon: User, label: "Personal Details", iconBg: "bg-blue-500/15", iconColor: "text-blue-400" },
						{ icon: Shield, label: "Security & Password", iconBg: "bg-purple-500/15", iconColor: "text-purple-400" },
						{ icon: HelpCircle, label: "Help & Support", iconBg: "bg-amber-500/15", iconColor: "text-amber-400" },
					].map((item) => (
						<button
							key={item.label}
							type="button"
							className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-slate-800/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
						>
							<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.iconBg}`}>
								<item.icon className={`w-4 h-4 ${item.iconColor}`} />
							</div>
							<span className="flex-1 text-left text-sm font-medium">{item.label}</span>
							<ChevronRight className="w-4 h-4 text-zinc-600" />
						</button>
					))}
				</div>

				{/* ════════ LOG OUT ════════ */}
				<button
					type="button"
					onClick={handleLogout}
					className="w-full py-2.5 text-red-400 font-semibold text-sm hover:text-red-300 transition-colors active:scale-95"
				>
					Log Out
				</button>
			</div>
		</div>
	);
}
