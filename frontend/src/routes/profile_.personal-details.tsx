import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { updateProfile as firebaseUpdateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getProfile, updateProfile as apiUpdateProfile } from "@/lib/api";
import { ChevronLeft, Pencil, Check, X, Mail, Phone, Calendar, Shield } from "lucide-react";

export const Route = createFileRoute("/profile_/personal-details")({
	component: PersonalDetailsPage,
});

function PersonalDetailsPage() {
	const { user } = useAuth();
	const navigate = useNavigate();

	// Display name editing
	const [editingName, setEditingName] = useState(false);
	const [nameValue, setNameValue] = useState(user?.displayName ?? "");
	const [savingName, setSavingName] = useState(false);

	// Phone editing
	const [phone, setPhone] = useState("");
	const [editingPhone, setEditingPhone] = useState(false);
	const [phoneValue, setPhoneValue] = useState("");
	const [savingPhone, setSavingPhone] = useState(false);

	// Load phone from backend profile
	useEffect(() => {
		getProfile()
			.then((profile) => {
				const p = profile.phone ?? user?.phoneNumber ?? "";
				setPhone(p);
				setPhoneValue(p);
			})
			.catch(() => {});
	}, [user?.phoneNumber]);

	// Swipe right to go back
	const touchStartX = useRef(0);
	const touchStartY = useRef(0);

	if (!user) {
		navigate({ to: "/login" });
		return null;
	}

	const displayName = user.displayName || "STAK User";
	const provider = user?.providerData[0]?.providerId;
	const isGoogle = provider === "google.com";
	const memberSince = user.metadata.creationTime
		? new Date(user.metadata.creationTime).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
		: "—";

	async function saveName() {
		if (!auth.currentUser || !nameValue.trim()) return;
		setSavingName(true);
		try {
			await firebaseUpdateProfile(auth.currentUser, { displayName: nameValue.trim() });
			await apiUpdateProfile({ displayName: nameValue.trim() });
			toast.success("Name updated");
			setEditingName(false);
		} catch {
			toast.error("Failed to update name");
		} finally {
			setSavingName(false);
		}
	}

	async function savePhone() {
		setSavingPhone(true);
		try {
			await apiUpdateProfile({ phone: phoneValue.trim() });
			setPhone(phoneValue.trim());
			toast.success("Phone number saved");
			setEditingPhone(false);
		} catch {
			toast.error("Failed to save phone number");
		} finally {
			setSavingPhone(false);
		}
	}

	return (
		<div
			className="min-h-screen bg-[#080d1c] text-white pb-24"
			onTouchStart={(e) => {
				touchStartX.current = e.touches[0].clientX;
				touchStartY.current = e.touches[0].clientY;
			}}
			onTouchEnd={(e) => {
				const dx = e.changedTouches[0].clientX - touchStartX.current;
				const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
				if (dx > 60 && dy < 50) navigate({ to: "/profile" });
			}}
		>
			{/* Header */}
			<div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#080d1c]/95 backdrop-blur border-b border-slate-800/40">
				<button
					type="button"
					onClick={() => navigate({ to: "/profile" })}
					className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
				>
					<ChevronLeft className="w-5 h-5" />
					Back
				</button>
				<h1 className="text-sm font-semibold">Personal Details</h1>
				<div className="w-12" />
			</div>

			<div className="max-w-lg mx-auto px-4 pt-8">
				{/* Avatar */}
				<div className="flex flex-col items-center mb-8">
					<div className="relative mb-3">
						<div className="absolute -inset-2 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 blur-lg" />
						<div className="relative w-20 h-20 rounded-full ring-[3px] ring-purple-400/40 overflow-hidden bg-slate-800 shadow-xl shadow-purple-900/30">
							{user.photoURL ? (
								<img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
							) : (
								<div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-3xl font-bold text-white">
									{displayName.charAt(0).toUpperCase()}
								</div>
							)}
						</div>
					</div>
					<p className="text-lg font-bold">{user.displayName || "STAK User"}</p>
					<span className="text-xs text-zinc-500 mt-0.5">{user.email}</span>
				</div>

				{/* Account Info */}
				<p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Account Info</p>
				<div className="rounded-xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 divide-y divide-slate-700/30 mb-5">

					{/* Display Name */}
					<div className="flex items-center gap-3 px-4 py-3.5">
						<div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
							<span className="text-sm">🪪</span>
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Display Name</p>
							{editingName ? (
								<input
									type="text"
									value={nameValue}
									onChange={(e) => setNameValue(e.target.value)}
									onKeyDown={(e) => { if (e.key === "Enter") { saveName(); } else if (e.key === "Escape") { setNameValue(user.displayName ?? ""); setEditingName(false); } }}
									className="w-full bg-transparent text-sm text-white outline-none border-b border-cyan-500/50 pb-0.5 focus:border-cyan-400"
									autoFocus
									maxLength={50}
								/>
							) : (
								<p className="text-sm font-medium text-white truncate">{user.displayName || "Not set"}</p>
							)}
						</div>
						{editingName ? (
							<div className="flex items-center gap-1.5 shrink-0">
								<button type="button" onClick={saveName} disabled={savingName} className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/30 transition-colors">
									<Check className="w-3.5 h-3.5" />
								</button>
								<button type="button" onClick={() => { setNameValue(user.displayName ?? ""); setEditingName(false); }} className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center text-zinc-400 hover:bg-slate-700 transition-colors">
									<X className="w-3.5 h-3.5" />
								</button>
							</div>
						) : (
							<button type="button" onClick={() => { setNameValue(user.displayName ?? ""); setEditingName(true); }} className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center text-zinc-400 hover:bg-slate-700 transition-colors shrink-0">
								<Pencil className="w-3 h-3" />
							</button>
						)}
					</div>

					{/* Email */}
					<div className="flex items-center gap-3 px-4 py-3.5">
						<div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
							<Mail className="w-4 h-4 text-emerald-400" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Email</p>
							<p className="text-sm font-medium text-white truncate">{user.email}</p>
						</div>
						{user.emailVerified && (
							<span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">Verified</span>
						)}
					</div>

					{/* Phone */}
					<div className="flex items-center gap-3 px-4 py-3.5">
						<div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
							<Phone className="w-4 h-4 text-violet-400" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Phone</p>
							{editingPhone ? (
								<input
									type="tel"
									value={phoneValue}
									onChange={(e) => setPhoneValue(e.target.value)}
									onKeyDown={(e) => { if (e.key === "Enter") savePhone(); if (e.key === "Escape") { setPhoneValue(phone); setEditingPhone(false); } }}
									placeholder="+1 (555) 000-0000"
									className="w-full bg-transparent text-sm text-white outline-none border-b border-cyan-500/50 pb-0.5 focus:border-cyan-400 placeholder:text-zinc-600"
									autoFocus
									maxLength={20}
								/>
							) : (
								<p className="text-sm font-medium text-white truncate">{phone || "Not set"}</p>
							)}
						</div>
						{editingPhone ? (
							<div className="flex items-center gap-1.5 shrink-0">
								<button type="button" onClick={savePhone} disabled={savingPhone} className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/30 transition-colors">
									<Check className="w-3.5 h-3.5" />
								</button>
								<button type="button" onClick={() => { setPhoneValue(phone); setEditingPhone(false); }} className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center text-zinc-400 hover:bg-slate-700 transition-colors">
									<X className="w-3.5 h-3.5" />
								</button>
							</div>
						) : (
							<button type="button" onClick={() => { setPhoneValue(phone); setEditingPhone(true); }} className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center text-zinc-400 hover:bg-slate-700 transition-colors shrink-0">
								<Pencil className="w-3 h-3" />
							</button>
						)}
					</div>
				</div>

				{/* Account Details */}
				<p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Account Details</p>
				<div className="rounded-xl bg-[#0f1729]/80 backdrop-blur border border-slate-700/30 divide-y divide-slate-700/30 mb-5">

					{/* Sign-in method */}
					<div className="flex items-center gap-3 px-4 py-3.5">
						<div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
							<Shield className="w-4 h-4 text-amber-400" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Sign-in Method</p>
							<p className="text-sm font-medium text-white">
								{isGoogle ? "Google" : "Email & Password"}
							</p>
						</div>
						<span className={["text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border", isGoogle ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"].join(" ")}>
							{isGoogle ? "Google" : "Email"}
						</span>
					</div>

					{/* Member Since */}
					<div className="flex items-center gap-3 px-4 py-3.5">
						<div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center shrink-0">
							<Calendar className="w-4 h-4 text-pink-400" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Member Since</p>
							<p className="text-sm font-medium text-white">{memberSince}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
