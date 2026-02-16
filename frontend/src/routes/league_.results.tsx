import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { LeagueState } from "@/data/league";
import {
	INITIAL_LEAGUE_STATE,
	getWinMessage,
	getLossMessage,
	getWeekKey,
} from "@/data/league";
import { ArrowLeft, Trophy, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/league_/results")({
	component: ResultsPage,
});

function ResultsPage() {
	const navigate = useNavigate();
	const [leagueState, setLeagueState] = useState<LeagueState>(() => {
		const saved = localStorage.getItem("league-state");
		return saved ? JSON.parse(saved) : INITIAL_LEAGUE_STATE;
	});

	const weekKey = getWeekKey();
	const starters = leagueState.currentLineup?.starters || [];

	// Simulate week results
	const userReturn = (Math.random() * 20 - 10).toFixed(2);
	const marketReturn = (Math.random() * 10 - 5).toFixed(2);
	const percentile = Math.floor(Math.random() * 100);
	const isWin = Number.parseFloat(userReturn) > Number.parseFloat(marketReturn);

	const xpGained = isWin ? 100 : 25;
	const message = isWin ? getWinMessage(percentile) : getLossMessage(percentile);

	useEffect(() => {
		// Update stats when viewing results
		const updatedState: LeagueState = {
			...leagueState,
			stats: {
				...leagueState.stats,
				xp: leagueState.stats.xp + xpGained,
				totalWeeks: leagueState.stats.totalWeeks + 1,
				totalWins: isWin
					? leagueState.stats.totalWins + 1
					: leagueState.stats.totalWins,
				currentStreak: isWin ? leagueState.stats.currentStreak + 1 : 0,
				longestStreak: Math.max(
					leagueState.stats.longestStreak,
					isWin ? leagueState.stats.currentStreak + 1 : 0,
				),
			},
			weeklyResults: {
				...leagueState.weeklyResults,
				[weekKey]: {
					userReturn: Number.parseFloat(userReturn),
					marketReturn: Number.parseFloat(marketReturn),
					percentile,
					isWin,
				},
			},
			currentLineup: {
				...leagueState.currentLineup!,
				locked: false,
			},
		}

		localStorage.setItem("league-state", JSON.stringify(updatedState));
		setLeagueState(updatedState);
	}, []);

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

				<div className="text-center space-y-8">
					<div>
						{isWin ? (
							<Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
						) : (
							<Target className="w-24 h-24 text-zinc-500 mx-auto mb-4" />
						)}
						<h1
							className={`text-5xl font-bold mb-4 ${
								isWin ? "text-yellow-500" : "text-zinc-400"
							}`}
						>
							{isWin ? "You Won!" : "Not This Week"}
						</h1>
						<p className="text-2xl text-zinc-300">{message}</p>
					</div>

					<div className="bg-[#0f1629]/50 border border-slate-700/50 rounded-xl p-8 max-w-2xl mx-auto">
						<h2 className="text-xl font-bold text-white mb-6">
							Week {weekKey} Results
						</h2>

						<div className="grid grid-cols-2 gap-8 mb-8">
							<div>
								<p className="text-zinc-500 text-sm mb-2">Your Return</p>
								<p
									className={`text-4xl font-bold ${
										Number.parseFloat(userReturn) >= 0
											? "text-green-400"
											: "text-red-400"
									}`}
								>
									{Number.parseFloat(userReturn) >= 0 ? "+" : ""}
									{userReturn}%
								</p>
							</div>
							<div>
								<p className="text-zinc-500 text-sm mb-2">Market (S&P 500)</p>
								<p
									className={`text-4xl font-bold ${
										Number.parseFloat(marketReturn) >= 0
											? "text-green-400"
											: "text-red-400"
									}`}
								>
									{Number.parseFloat(marketReturn) >= 0 ? "+" : ""}
									{marketReturn}%
								</p>
							</div>
						</div>

						<div className="border-t border-slate-700/50 pt-6">
							<p className="text-zinc-400 mb-4">Your picks:</p>
							<div className="flex flex-wrap gap-2 justify-center">
								{starters.map((brand) => (
									<div
										key={brand.id}
										className="px-3 py-1 bg-[#162036] rounded-full text-sm"
									>
										{brand.ticker}
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6 max-w-2xl mx-auto">
						<div className="flex items-center justify-center gap-4 mb-4">
							<Zap className="w-6 h-6 text-yellow-500" />
							<h3 className="text-xl font-bold text-white">Rewards Earned</h3>
						</div>
						<div className="flex items-center justify-center gap-8">
							<div>
								<p className="text-3xl font-bold text-yellow-500">
									+{xpGained} XP
								</p>
								<p className="text-sm text-zinc-500">Experience Points</p>
							</div>
							{isWin && (
								<div>
									<p className="text-3xl font-bold text-orange-500">
										{leagueState.stats.currentStreak + 1}
									</p>
									<p className="text-sm text-zinc-500">Week Streak</p>
								</div>
							)}
						</div>
					</div>

					<Button
						onClick={() => navigate({ to: "/league" })}
						className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-lg px-8 py-6 h-auto"
					>
						Back to League Home
					</Button>
				</div>
			</div>
		</div>
	)
}
