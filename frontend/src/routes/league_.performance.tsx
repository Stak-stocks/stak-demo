import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { LeagueState } from "@/data/league";
import { INITIAL_LEAGUE_STATE } from "@/data/league";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/league_/performance")({
	component: PerformancePage,
});

function PerformancePage() {
	const navigate = useNavigate();
	const [leagueState] = useState<LeagueState>(() => {
		const saved = localStorage.getItem("league-state");
		return saved ? JSON.parse(saved) : INITIAL_LEAGUE_STATE;
	});

	const starters = leagueState.currentLineup?.starters || [];

	// Simulated performance data
	const getRandomPerformance = () => {
		return (Math.random() * 20 - 10).toFixed(2);
	}

	return (
		<div className="min-h-screen bg-[#0b1121] text-white">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
				<button
					onClick={() => navigate({ to: "/league" })}
					className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
				>
					<ArrowLeft className="w-5 h-5" />
					<span>Back to League</span>
				</button>

				<header className="mb-8">
					<h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
						This Week's Performance
					</h1>
					<p className="text-zinc-400">
						Track how your picks are doing vs the market
					</p>
				</header>

				<div className="space-y-6">
					<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-6">
						<h2 className="text-xl font-bold text-white mb-6">Your Lineup</h2>

						{starters.length === 0 ? (
							<div className="text-center py-12 text-zinc-500">
								<p>No lineup set for this week</p>
							</div>
						) : (
							<div className="space-y-4">
								{starters.map((brand) => {
									const performance = getRandomPerformance();
									const isPositive = Number.parseFloat(performance) >= 0;

									return (
										<div
											key={brand.id}
											className={`p-4 rounded-lg border ${
												isPositive
													? "border-green-500/30 bg-green-500/5"
													: "border-red-500/30 bg-red-500/5"
											}`}
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center text-lg font-bold">
														{brand.ticker.charAt(0)}
													</div>
													<div>
														<h3 className="font-bold text-white">
															{brand.name}
														</h3>
														<span className="text-xs font-mono text-zinc-500 uppercase">
															{brand.ticker}
														</span>
													</div>
												</div>
												<div className="flex items-center gap-2">
													{isPositive ? (
														<TrendingUp className="w-5 h-5 text-green-400" />
													) : (
														<TrendingDown className="w-5 h-5 text-red-400" />
													)}
													<span
														className={`text-xl font-bold ${
															isPositive ? "text-green-400" : "text-red-400"
														}`}
													>
														{isPositive ? "+" : ""}
														{performance}%
													</span>
												</div>
											</div>
										</div>
									)
								})}
							</div>
						)}
					</div>

					<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-6">
						<p className="text-center text-zinc-500 text-sm italic">
							Results finalize on Friday. Keep checking back!
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
