import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Bell, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/playground")({
	component: PlaygroundPage,
});

const LEARN_ITEMS = [
	{ title: "What is a Stock?", subtitle: "The basics explained simply", time: "2 min" },
	{ title: "How P/E Ratio Works", subtitle: "Is a stock cheap or expensive?", time: "3 min" },
	{ title: "Why Interest Rates Affect Stocks", subtitle: "The Fed and your portfolio", time: "4 min" },
	{ title: "Growth vs Defensive Stocks", subtitle: "Different tools for different times", time: "3 min" },
	{ title: "Reading Earnings Reports", subtitle: "What the numbers actually mean", time: "5 min" },
];

const ACTIVITY_ITEMS = [
	{ label: "Nvidia is up 4.1% today", time: "2h ago", type: "price" },
	{ label: "Apple earnings in 3 days", time: "5h ago", type: "event" },
	{ label: "2 analyst updates on stocks you saved", time: "1d ago", type: "analyst" },
];

function PlaygroundPage() {
	return (
		<div className="min-h-full bg-background text-zinc-900 dark:text-white">
			<div className="max-w-2xl mx-auto px-4 pt-8 pb-12 space-y-10">

				{/* Header */}
				<div>
					<h1 className="text-3xl font-extrabold text-foreground mb-1">Playground</h1>
					<p className="dark:text-zinc-400 text-zinc-600 text-sm">Learn investing and stay on top of your activity.</p>
				</div>

				{/* Learn section */}
				<section>
					<div className="flex items-center gap-2 mb-4">
						<BookOpen className="w-5 h-5 text-pink-400" />
						<h2 className="text-lg font-bold text-foreground">Learn</h2>
					</div>
					<div className="space-y-3">
						{LEARN_ITEMS.map((item) => (
							<button
								key={item.title}
								type="button"
								className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-1/80 border dark:border-slate-700/50 border-slate-200 hover:border-pink-500/40 transition-all text-left"
							>
								<div>
									<p className="font-semibold text-foreground text-sm">{item.title}</p>
									<p className="dark:text-zinc-400 text-zinc-600 text-xs mt-0.5">{item.subtitle}</p>
								</div>
								<div className="flex items-center gap-2 shrink-0 ml-4">
									<span className="text-xs text-pink-400 font-medium">{item.time}</span>
									<ChevronRight className="w-4 h-4 text-zinc-500" />
								</div>
							</button>
						))}
					</div>
				</section>

				{/* Activity section */}
				<section>
					<div className="flex items-center gap-2 mb-4">
						<Bell className="w-5 h-5 text-violet-400" />
						<h2 className="text-lg font-bold text-foreground">Activity</h2>
					</div>
					<div className="space-y-3">
						{ACTIVITY_ITEMS.map((item) => (
							<div
								key={item.label}
								className="flex items-center justify-between p-4 rounded-xl bg-surface-1/80 border dark:border-slate-700/50 border-slate-200"
							>
								<p className="text-sm dark:text-zinc-200 text-zinc-700">{item.label}</p>
								<span className="text-xs text-zinc-500 shrink-0 ml-4">{item.time}</span>
							</div>
						))}
					</div>
				</section>

			</div>
		</div>
	);
}
