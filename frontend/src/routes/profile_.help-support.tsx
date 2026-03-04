import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronDown, MessageSquare, Lock } from "lucide-react";
import { useState, useRef } from "react";

export const Route = createFileRoute("/profile_/help-support")({
	component: HelpSupportPage,
});

const FAQS = [
	{
		q: "Why can I only swipe 20 times a day?",
		a: "The daily limit keeps the experience focused — quality over quantity. It resets every day at 9 AM so you get a fresh deck each morning.",
	},
	{
		q: "What is My Stak?",
		a: "My Stak is your personal collection of brands and stocks you're interested in. Swipe right on any brand in Discover to add it. You can view and manage it from the My Stak tab.",
	},
	{
		q: "What are Intel cards and how do I unlock them?",
		a: "Intel cards are short, jargon-free lessons about investing and markets. Your first one unlocks after 5 swipes — more cards unlock as you keep swiping.",
	},
	{
		q: "How is my Vibe Check calculated?",
		a: "Your Vibe Check is based on the brands in your Stak. We look at the categories of brands you've added (tech, fashion, energy, etc.) and surface the one you lean towards most.",
	},
	{
		q: "Is Stak financial advice?",
		a: "No. Stak is an educational app designed to help you discover stocks through brands you already know. Nothing on this platform is financial advice. Always do your own research before investing.",
	},
	{
		q: "How do I change my password?",
		a: "If you signed in with Google, your password is managed by Google. Otherwise you can update it here:",
		action: "security" as const,
	},
];

function FaqItem({ q, a, action }: Readonly<{ q: string; a: string; action?: "security" }>) {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();

	return (
		<div className="border-b border-zinc-100 dark:border-slate-700/30 last:border-0">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
			>
				<span className="text-sm font-medium text-zinc-900 dark:text-white">{q}</span>
				<ChevronDown
					className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
				/>
			</button>
			{open && (
				<div className="px-4 pb-4">
					<p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{a}</p>
					{action === "security" && (
						<button
							type="button"
							onClick={() => navigate({ to: "/profile/security" })}
							className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
						>
							<Lock className="w-3.5 h-3.5" />
							Go to Security & Password
						</button>
					)}
				</div>
			)}
		</div>
	);
}

function HelpSupportPage() {
	const navigate = useNavigate();
	const touchStartX = useRef(0);
	const touchStartY = useRef(0);

	return (
		<div
			className="min-h-screen bg-background text-zinc-900 dark:text-white pb-24"
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
			<div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur border-b border-zinc-200 dark:border-slate-800/40">
				<button
					type="button"
					onClick={() => navigate({ to: "/profile" })}
					className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
				>
					<ChevronLeft className="w-5 h-5" />
					Back
				</button>
				<h1 className="text-sm font-semibold">Help & Support</h1>
				<div className="w-12" />
			</div>

			<div className="max-w-lg mx-auto px-4 pt-8">

				{/* Intro */}
				<div className="flex flex-col items-center text-center mb-8">
					<div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-3">
						<span className="text-3xl">🛟</span>
					</div>
					<h2 className="text-lg font-bold mb-1">How can we help?</h2>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						Check the FAQs below or send us a message and we'll get you sorted.
					</p>
				</div>

				{/* FAQ */}
				<p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">
					Frequently Asked Questions
				</p>
				<div className="rounded-xl bg-white/80 dark:bg-[#0f1729]/80 backdrop-blur border border-zinc-200 dark:border-slate-700/30 mb-6 shadow-sm dark:shadow-none">
					{FAQS.map((item) => (
						<FaqItem key={item.q} q={item.q} a={item.a} action={item.action} />
					))}
				</div>

				{/* Contact */}
				<p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">
					Still need help?
				</p>
				<div className="rounded-xl bg-white/80 dark:bg-[#0f1729]/80 backdrop-blur border border-zinc-200 dark:border-slate-700/30 shadow-sm dark:shadow-none">
					<div className="px-4 py-4">
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
							Hit a snag or found a bug? Drop us the details and our team will get back to you.
						</p>
						<p className="text-xs text-zinc-400 dark:text-zinc-600 mb-4">
							We typically reply within 24–48 hours.
						</p>
						<a
							href="https://forms.gle/6v8mDfyN1DHFsK5M6"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all text-white font-semibold text-sm"
						>
							<MessageSquare className="w-4 h-4" />
							Contact Us
						</a>
					</div>
				</div>

			</div>
		</div>
	);
}
