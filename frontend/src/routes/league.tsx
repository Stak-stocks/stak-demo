import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Swords, Medal, Crown } from "lucide-react";

export const Route = createFileRoute("/league")({
	component: LeaguePage,
});

function LeaguePage() {
	return (
		<div className="min-h-full bg-background text-zinc-900 dark:text-white flex flex-col items-center justify-center px-6 pb-24 relative overflow-hidden">

			{/* Background glow */}
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-yellow-400/10 blur-3xl" />
				<div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl" />
			</div>

			{/* Floating icons */}
			<div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
				<Medal   className="absolute top-[12%] left-[8%]  w-6 h-6 text-yellow-400/20 rotate-[-12deg]" />
				<Crown   className="absolute top-[10%] right-[10%] w-7 h-7 text-amber-400/20 rotate-[10deg]" />
				<Swords  className="absolute top-[22%] left-[18%] w-5 h-5 text-yellow-300/15 rotate-[8deg]" />
				<Trophy  className="absolute top-[18%] right-[22%] w-6 h-6 text-yellow-400/20 rotate-[-6deg]" />
				<Medal   className="absolute bottom-[28%] right-[8%]  w-5 h-5 text-amber-400/15 rotate-[14deg]" />
				<Crown   className="absolute bottom-[32%] left-[6%]  w-6 h-6 text-yellow-300/15 rotate-[-8deg]" />
			</div>

			{/* Main content */}
			<div className="relative text-center max-w-sm">
				{/* Trophy icon */}
				<div className="relative mx-auto w-24 h-24 mb-6">
					<div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-yellow-400/30 to-amber-500/20 blur-xl" />
					<div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-amber-600/15 border border-yellow-400/25 flex items-center justify-center shadow-2xl">
						<Trophy className="w-12 h-12 text-yellow-400" />
					</div>
				</div>

				{/* Badge */}
				<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-400/30 text-yellow-500 dark:text-yellow-400 text-xs font-bold tracking-wider uppercase mb-4">
					🚧 Coming Soon
				</span>

				<h1 className="text-4xl font-extrabold tracking-tight mb-3">
					<span className="bg-gradient-to-b from-yellow-300 to-amber-500 bg-clip-text text-transparent">
						League
					</span>
				</h1>

				<p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-8">
					Compete with other investors, climb the leaderboard, and prove your Stak is the best in the game.
				</p>

				{/* Teaser features */}
				<div className="space-y-3 text-left">
					{[
						{ icon: "🏆", label: "Weekly Competitions",  desc: "New matchups every Monday"         },
						{ icon: "📊", label: "Live Leaderboard",     desc: "See how your Stak ranks in real time" },
						{ icon: "🥇", label: "Badges & Rewards",     desc: "Earn exclusive investor titles"   },
					].map((f) => (
						<div key={f.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/60 dark:bg-[#0f1729]/60 backdrop-blur border border-zinc-200/60 dark:border-yellow-400/10">
							<span className="text-xl shrink-0">{f.icon}</span>
							<div>
								<p className="text-sm font-semibold">{f.label}</p>
								<p className="text-[11px] text-zinc-500 dark:text-zinc-400">{f.desc}</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
