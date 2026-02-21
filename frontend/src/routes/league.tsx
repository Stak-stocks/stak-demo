import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { BrandProfile } from "@/data/brands";
import {
	INITIAL_LEAGUE_STATE,
	type LeagueState,
	getLeagueButtonState,
	getWeekKey,
} from "@/data/league";
import { Trophy, Lock, Check, X, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

// TESTING: Set to true to bypass Monday check
const TESTING_MODE = false; // Change to false for production

// Check if it's Monday in CST timezone
function isMondayCST(): boolean {
	if (TESTING_MODE) return true; // Always Monday in testing mode

	const now = new Date();
	// Convert to CST (UTC-6)
	const cstOffset = -6 * 60; // CST is UTC-6
	const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
	const cstTime = new Date(utcTime + cstOffset * 60000);
	return cstTime.getDay() === 1; // 1 = Monday
}

// Get time until next Monday in CST
function getTimeUntilMonday(): { days: number; hours: number } {
	const now = new Date();
	const cstOffset = -6 * 60;
	const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
	const cstTime = new Date(utcTime + cstOffset * 60000);

	const currentDay = cstTime.getDay();
	const daysUntilMonday = currentDay === 0 ? 1 : currentDay === 1 ? 0 : 8 - currentDay;

	if (daysUntilMonday === 0) {
		return { days: 0, hours: 0 };
	}

	const nextMonday = new Date(cstTime);
	nextMonday.setDate(cstTime.getDate() + daysUntilMonday);
	nextMonday.setHours(0, 0, 0, 0);

	const diff = nextMonday.getTime() - cstTime.getTime();
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

	return { days, hours };
}
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

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

	const [pickerOpen, setPickerOpen] = useState(false);
	const [isMonday, setIsMonday] = useState(isMondayCST);
	const [timeUntilMonday, setTimeUntilMonday] = useState(getTimeUntilMonday);

	useEffect(() => {
		localStorage.setItem("league-state", JSON.stringify(leagueState));
	}, [leagueState]);

	// Check if we need to reset for a new week
	useEffect(() => {
		const currentWeekKey = getWeekKey();
		const savedWeekKey = leagueState.currentLineup?.weekStartDate;

		// If it's a new week, reset the lineup
		if (savedWeekKey && savedWeekKey !== currentWeekKey) {
			setLeagueState((prev) => ({
				...prev,
				currentLineup: {
					starters: [],
					locked: false,
					weekStartDate: currentWeekKey,
				},
			}));
		}
	}, [leagueState.currentLineup?.weekStartDate]);

	// Update Monday check every minute
	useEffect(() => {
		const interval = setInterval(() => {
			setIsMonday(isMondayCST());
			setTimeUntilMonday(getTimeUntilMonday());

			// Also check for weekly reset
			const currentWeekKey = getWeekKey();
			const savedWeekKey = leagueState.currentLineup?.weekStartDate;
			if (savedWeekKey && savedWeekKey !== currentWeekKey) {
				setLeagueState((prev) => ({
					...prev,
					currentLineup: {
						starters: [],
						locked: false,
						weekStartDate: currentWeekKey,
					},
				}));
			}
		}, 60000);
		return () => clearInterval(interval);
	}, [leagueState.currentLineup?.weekStartDate]);

	const starters = leagueState.currentLineup?.starters || [];

	const handleAddStarter = (brand: BrandProfile) => {
		if (starters.length >= 5) return;
		if (starters.find((b) => b.id === brand.id)) return;

		const newStarters = [...starters, brand];
		setLeagueState((prev) => ({
			...prev,
			currentLineup: {
				starters: newStarters,
				locked: false,
				weekStartDate: prev.currentLineup?.weekStartDate || getWeekKey(),
			},
		}));
	};

	const handleRemoveStarter = (brandId: string) => {
		const newStarters = starters.filter((b) => b.id !== brandId);
		setLeagueState((prev) => ({
			...prev,
			currentLineup: {
				starters: newStarters,
				locked: false,
				weekStartDate: prev.currentLineup?.weekStartDate || getWeekKey(),
			},
		}));
	};

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

	const handleConfirmLineup = () => {
		if (starters.length !== 5) {
			toast.error("You need exactly 5 starters to confirm");
			return;
		}

		setLeagueState((prev) => ({
			...prev,
			currentLineup: {
				...prev.currentLineup!,
				locked: true,
				weekStartDate: getWeekKey(),
			},
		}));

		toast.success("Lineup locked in!", {
			description: "Good luck this week!",
			duration: 3000,
		});

		setPickerOpen(false);
	};

	const handlePickerOpen = () => {
		if (!isMonday) {
			toast.error("Selections only available on Mondays", {
				description: `Come back in ${timeUntilMonday.days}d ${timeUntilMonday.hours}h`,
				duration: 3000,
			});
			return;
		}
		if (isLineupLocked) {
			toast.error("Lineup already locked", {
				description: "You can change your picks next Monday",
				duration: 3000,
			});
			return;
		}
		setPickerOpen(true);
	};

	if (!leagueState.hasJoined) {
		return (
			<div className="min-h-full bg-background text-zinc-900 dark:text-white transition-colors duration-300">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
					<div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
						<Trophy className="w-24 h-24 text-yellow-500" />
						<div className="space-y-4">
							<h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
								Fantasy League
							</h1>
							<p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl">
								Pick 5 stocks each week. Compete with friends. No real money. Just
								bragging rights.
							</p>
						</div>

						<div className="bg-zinc-100 dark:bg-[#0f1629]/50 border border-zinc-200 dark:border-slate-700/50 rounded-xl p-8 max-w-md space-y-4">
							<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">How it works:</h3>
							<ul className="text-left text-zinc-500 dark:text-zinc-400 space-y-3">
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

						<p className="text-xs text-zinc-400 dark:text-zinc-600 max-w-md">
							This is a game, not investing. No real money. No trading. Just fun.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const emptySlots = 5 - starters.length;

	return (
		<div className="min-h-full bg-background text-zinc-900 dark:text-white transition-colors duration-300">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
				<header className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<Trophy className="w-8 h-8 text-yellow-500" />
						<h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
							League
						</h1>
					</div>
					<p className="text-zinc-500 dark:text-zinc-400">
						Your weekly stock picking competition
					</p>
				</header>

				<div className="space-y-8">
					{/* Selection Status Banner */}
					{isMonday && !isLineupLocked ? (
						<div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
							<div className="flex items-center gap-3">
								<Calendar className="w-6 h-6 text-green-400" />
								<div>
									<p className="text-green-600 dark:text-green-400 font-bold">It's Monday! Selections are OPEN</p>
									<p className="text-green-600/70 dark:text-green-400/70 text-sm">Pick your 5 starters and lock them in before midnight CST</p>
								</div>
							</div>
						</div>
					) : !isLineupLocked ? (
						<div className="bg-zinc-100 dark:bg-[#162036]/50 border border-zinc-300 dark:border-slate-600/50 rounded-xl p-4 mb-6">
							<div className="flex items-center gap-3">
								<Clock className="w-6 h-6 text-zinc-400" />
								<div>
									<p className="text-zinc-700 dark:text-zinc-300 font-bold">Selections closed</p>
									<p className="text-zinc-400 dark:text-zinc-500 text-sm">
										Next selection window opens in{" "}
										<span className="text-cyan-600 dark:text-cyan-400 font-bold">
											{timeUntilMonday.days}d {timeUntilMonday.hours}h
										</span>
									</p>
								</div>
							</div>
						</div>
					) : null}

					<div className="bg-zinc-50 dark:bg-[#0f1629]/50 border border-zinc-200 dark:border-slate-700/50 rounded-xl p-6">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
								This Week's Lineup
							</h2>
							{isLineupLocked && (
								<div className="flex items-center gap-2 text-green-500 text-sm">
									<Check className="w-4 h-4" />
									<span>Locked in for this week</span>
								</div>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
							{starters.map((brand) => (
								<div
									key={brand.id}
									className="relative bg-white dark:bg-[#162036]/50 border border-zinc-200 dark:border-slate-600/50 rounded-lg p-4 hover:border-green-500/50 transition-all group"
									style={{
										boxShadow: "0 0 20px rgba(34, 197, 94, 0.1)",
									}}
								>
									{!isLineupLocked && isMonday && (
										<button
											type="button"
											onClick={() => handleRemoveStarter(brand.id)}
											className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
										>
											<X className="w-4 h-4 text-white" />
										</button>
									)}
									<div className="flex items-center gap-3 mb-2">
										<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center text-lg font-bold">
											{brand.ticker.charAt(0)}
										</div>
										<div className="flex-1">
											<h3 className="font-bold text-zinc-900 dark:text-white">{brand.name}</h3>
											<span className="text-xs font-mono text-zinc-500 uppercase">
												{brand.ticker}
											</span>
										</div>
									</div>
									<p className="text-xs text-zinc-500 dark:text-zinc-400 italic line-clamp-2">
										{brand.bio}
									</p>
								</div>
							))}

							{Array.from({ length: emptySlots }).map((_, index) => (
								<button
									type="button"
									key={`empty-${index}`}
									onClick={handlePickerOpen}
									className="bg-zinc-50 dark:bg-[#162036]/30 border border-zinc-300 dark:border-slate-600/50 border-dashed rounded-lg p-4 flex items-center justify-center min-h-[100px] hover:border-yellow-500/50 hover:bg-zinc-100 dark:hover:bg-[#162036]/50 active:bg-yellow-500/20 transition-all cursor-pointer"
								>
									<p className="text-zinc-500 dark:text-zinc-600 text-sm">
										{isMonday ? "Pick your starters" : "Available Mondays only"}
									</p>
								</button>
							))}
						</div>

						{/* Confirm button when all 5 starters are selected */}
						{starters.length === 5 && !isLineupLocked && isMonday && (
							<div className="mt-6">
								<Button
									onClick={handleConfirmLineup}
									className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-6 h-auto text-lg"
								>
									<Lock className="w-5 h-5 mr-2" />
									Confirm & Lock Lineup
								</Button>
								<p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-2">
									Once confirmed, you cannot change your picks until next Monday
								</p>
							</div>
						)}

						{swipedBrands.length < 5 && starters.length === 0 && (
							<div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
								<p className="text-yellow-500 dark:text-yellow-400 text-sm text-center">
									You need at least 5 stocks in your Stak to play. Keep swiping!
								</p>
							</div>
						)}
					</div>

					<div className="bg-zinc-50 dark:bg-[#0f1629]/50 border border-zinc-200 dark:border-slate-700/50 rounded-xl p-6">
						<div className="text-center space-y-4">
							<p className="text-3xl font-bold text-zinc-900 dark:text-white">
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
							<div className="flex items-center justify-center gap-8 text-sm text-zinc-500 dark:text-zinc-400">
								<div>
									<span className="block text-2xl font-bold text-zinc-900 dark:text-white">
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

			{/* Stock Picker Sheet */}
			<Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
				<SheetContent side="bottom" className="bg-white dark:bg-[#0f1629] border-zinc-200 dark:border-slate-700/50 h-[70vh]">
					<SheetHeader className="mb-4">
						<SheetTitle className="text-zinc-900 dark:text-white text-xl">
							Pick Your Starters ({starters.length}/5)
						</SheetTitle>
					</SheetHeader>

					{swipedBrands.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-48 text-center">
							<p className="text-zinc-500 dark:text-zinc-400 mb-2">Your Stak is empty!</p>
							<p className="text-zinc-400 dark:text-zinc-500 text-sm">
								Go to Discover and swipe right on stocks you like.
							</p>
						</div>
					) : (
						<div className="space-y-3 overflow-y-auto max-h-[calc(70vh-120px)] pb-4">
							{swipedBrands.map((brand) => {
								const isSelected = starters.some((s) => s.id === brand.id);
								const canAdd = starters.length < 5;

								return (
									<button
										type="button"
										key={brand.id}
										onClick={() => {
											if (isSelected) {
												handleRemoveStarter(brand.id);
											} else if (canAdd) {
												handleAddStarter(brand);
											}
										}}
										disabled={!isSelected && !canAdd}
										className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
											isSelected
												? "border-yellow-500 bg-yellow-500/10"
												: canAdd
													? "border-zinc-300 dark:border-slate-600/50 bg-white dark:bg-[#162036]/50 hover:border-cyan-500/50"
													: "border-zinc-200 dark:border-slate-700/50 bg-zinc-50 dark:bg-[#0f1629]/50 opacity-50 cursor-not-allowed"
										}`}
									>
										<div className="flex items-center gap-4">
											<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center text-xl font-bold shrink-0">
												{brand.ticker.charAt(0)}
											</div>
											<div className="flex-1 min-w-0">
												<h3 className="font-bold text-zinc-900 dark:text-white">{brand.name}</h3>
												<span className="text-xs font-mono text-zinc-500 uppercase">
													{brand.ticker}
												</span>
											</div>
											{isSelected && (
												<div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
													<Check className="w-5 h-5 text-black" />
												</div>
											)}
										</div>
									</button>
								);
							})}
						</div>
					)}

					{starters.length === 5 && (
						<div className="absolute bottom-4 left-4 right-4">
							<Button
								onClick={handleConfirmLineup}
								className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-6 h-auto text-lg"
							>
								<Lock className="w-5 h-5 mr-2" />
								Confirm & Lock Lineup
							</Button>
							<p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-2">
								Once confirmed, you cannot change your picks until next Monday
							</p>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}
