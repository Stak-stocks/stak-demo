import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { BrandProfile } from "@/data/brands";
import {
	INITIAL_LEAGUE_STATE,
	type LeagueState,
	getLeagueButtonState,
	getWeekKey,
} from "@/data/league";
import { Trophy, Lock, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/league")({
	component: LeagueHomePage,
});

function LeagueHomePage() {
	const navigate = useNavigate();
	const [leagueState, setLeagueState] = useState<LeagueState>(() => {
		const saved = localStorage.getItem("league-state");
		return saved ? JSON.parse(saved) : INITIAL_LEAGUE_STATE;
	});

	const [swipedBrands, setSwipedBrands] = useState<BrandProfile[]>(() => {
		const saved = localStorage.getItem("my-stak");
		return saved ? JSON.parse(saved) : [];
	});

	useEffect(() => {
		localStorage.setItem("league-state", JSON.stringify(leagueState));
	}, [leagueState]);

	const buttonState = getLeagueButtonState();
	const currentWeek = getWeekKey();
	const isLineupLocked =
		leagueState.currentLineup?.locked &&
		leagueState.currentLineup?.weekStartDate === currentWeek;

	const handleButtonClick = () => {
		if (buttonState.action === "set-lineup") {
			navigate({ to: "/league/lineup" });
		} else if (buttonState.action === "view-results") {
			navigate({ to: "/league/results" });
		} else {
			navigate({ to: "/league/performance" });
		}
	};

	const handleJoinLeague = () => {
		setLeagueState((prev) => ({ ...prev, hasJoined: true }));
	};

	if (!leagueState.hasJoined) {
		return (
			<div className="min-h-screen bg-[#121212] text-white">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
					<div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
						<Trophy className="w-24 h-24 text-yellow-500" />
						<div className="space-y-4">
							<h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
								Fantasy League
							</h1>
							<p className="text-xl text-zinc-400 max-w-2xl">
								Pick 5 stocks each week. Compete with friends. No real money. Just
								bragging rights.
							</p>
						</div>

						<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 max-w-md space-y-4">
							<h3 className="text-lg font-semibold text-white">How it works:</h3>
							<ul className="text-left text-zinc-400 space-y-3">
								<li className="flex gap-3">
									<span className="text-yellow-500">1.</span>
									<span>Every Monday, pick 5 stocks from your Stak</span>
								</li>
								<li className="flex gap-3">
									<span className="text-yellow-500">2.</span>
									<span>See how they perform vs the market all week</span>
								</li>
								<li className="flex gap-3">
									<span className="text-yellow-500">3.</span>
									<span>Friday reveals if you won or lost</span>
								</li>
								<li className="flex gap-3">
									<span className="text-yellow-500">4.</span>
									<span>Earn XP, build streaks, unlock badges</span>
								</li>
							</ul>
						</div>

						<Button
							onClick={handleJoinLeague}
							className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-lg px-8 py-6 h-auto"
						>
							<Trophy className="w-5 h-5 mr-2" />
							Join League
						</Button>

						<p className="text-xs text-zinc-600 max-w-md">
							This is a game, not investing. No real money. No trading. Just fun.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const starters = leagueState.currentLineup?.starters || [];
	const emptySlots = 5 - starters.length;

	return (
		<div className="min-h-screen bg-[#121212] text-white">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
				<header className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<Trophy className="w-8 h-8 text-yellow-500" />
						<h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
							League
						</h1>
					</div>
					<p className="text-zinc-400">
						Your weekly stock picking competition
					</p>
				</header>

				<div className="space-y-8">
					<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-2xl font-bold text-white">
								This Week's Lineup
							</h2>
							{isLineupLocked && (
								<div className="flex items-center gap-2 text-yellow-500 text-sm">
									<Lock className="w-4 h-4" />
									<span>Locked until next Monday</span>
								</div>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
							{starters.map((brand, index) => (
								<div
									key={brand.id}
									className="relative bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-green-500/50 transition-all"
									style={{
										boxShadow: "0 0 20px rgba(34, 197, 94, 0.1)",
									}}
								>
									<div className="flex items-center gap-3 mb-2">
										<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center text-lg font-bold">
											{brand.ticker.charAt(0)}
										</div>
										<div className="flex-1">
											<h3 className="font-bold text-white">{brand.name}</h3>
											<span className="text-xs font-mono text-zinc-500 uppercase">
												{brand.ticker}
											</span>
										</div>
									</div>
									<p className="text-xs text-zinc-400 italic line-clamp-2">
										{brand.bio}
									</p>
								</div>
							))}

							{Array.from({ length: emptySlots }).map((_, index) => (
								<button
									type="button"
									key={`empty-${index}`}
									onClick={() => navigate({ to: "/league/lineup" })}
									onTouchEnd={(e) => {
										e.preventDefault();
										navigate({ to: "/league/lineup" });
									}}
									className="bg-zinc-800/30 border border-zinc-700 border-dashed rounded-lg p-4 flex items-center justify-center min-h-[100px] hover:border-yellow-500/50 hover:bg-zinc-800/50 active:bg-yellow-500/20 active:border-yellow-500 transition-all cursor-pointer"
								>
									<p className="text-zinc-600 text-sm pointer-events-none">Pick your starters</p>
								</button>
							))}
						</div>

						{swipedBrands.length < 5 && starters.length === 0 && (
							<div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
								<p className="text-yellow-400 text-sm text-center">
									You need at least 5 stocks in your Stak to play. Keep swiping!
								</p>
							</div>
						)}
					</div>

					<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
						<div className="text-center space-y-4">
							<p className="text-3xl font-bold text-white">
								You're beating{" "}
								<span className="text-yellow-500">
									{leagueState.stats.totalWins > 0
										? Math.round(
												(leagueState.stats.totalWins /
													leagueState.stats.totalWeeks) *
													100,
											)
										: 50}
									%
								</span>{" "}
								of players
							</p>
							<div className="flex items-center justify-center gap-8 text-sm text-zinc-400">
								<div>
									<span className="block text-2xl font-bold text-white">
										{leagueState.stats.xp}
									</span>
									<span>XP</span>
								</div>
								<div>
									<span className="block text-2xl font-bold text-orange-500">
										{leagueState.stats.currentStreak}
									</span>
									<span>Week Streak</span>
								</div>
								<div>
									<span className="block text-2xl font-bold text-yellow-500">
										{leagueState.stats.totalWins}
									</span>
									<span>Wins</span>
								</div>
							</div>
						</div>
					</div>

					<div className="flex justify-center">
						<Button
							onClick={handleButtonClick}
							disabled={swipedBrands.length < 5 && starters.length === 0}
							className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-lg px-8 py-6 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{buttonState.label}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
