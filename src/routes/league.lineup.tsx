import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { BrandProfile } from "@/data/brands";
import type { LeagueState } from "@/data/league";
import { INITIAL_LEAGUE_STATE, getWeekKey } from "@/data/league";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/league/lineup")({
	component: LineupBuilderPage,
});

function LineupBuilderPage() {
	const navigate = useNavigate();
	const [leagueState, setLeagueState] = useState<LeagueState>(() => {
		const saved = localStorage.getItem("league-state");
		return saved ? JSON.parse(saved) : INITIAL_LEAGUE_STATE;
	});

	const [swipedBrands, setSwipedBrands] = useState<BrandProfile[]>(() => {
		const saved = localStorage.getItem("my-stak");
		return saved ? JSON.parse(saved) : [];
	});

	const [selectedStarters, setSelectedStarters] = useState<BrandProfile[]>(
		leagueState.currentLineup?.starters || [],
	);

	// Persist state changes to localStorage
	useEffect(() => {
		const updatedState: LeagueState = {
			...leagueState,
			currentLineup: {
				starters: selectedStarters,
				locked: false,
				weekStartDate: leagueState.currentLineup?.weekStartDate || getWeekKey(),
			},
		};
		localStorage.setItem("league-state", JSON.stringify(updatedState));
	}, [selectedStarters]);

	// Debug: Log MyStak load status
	useEffect(() => {
		console.log("[League Lineup] MyStak loaded:", {
			count: swipedBrands.length,
			brands: swipedBrands.map((b) => b.ticker),
		});
	}, [swipedBrands]);

	// Add card to next available slot
	const handleAddStarter = (brand: BrandProfile) => {
		setSelectedStarters((prev) => {
			// Don't add if already selected
			if (prev.find((b) => b.id === brand.id)) {
				return prev;
			}
			// Add to next available slot (max 5)
			if (prev.length < 5) {
				return [...prev, brand];
			}
			return prev;
		});
	};

	// Remove card from slot
	const handleRemoveStarter = (index: number) => {
		setSelectedStarters((prev) => {
			return prev.filter((_, i) => i !== index);
		});
	};

	const handleLockLineup = () => {
		const newLeagueState: LeagueState = {
			...leagueState,
			currentLineup: {
				starters: selectedStarters,
				locked: true,
				weekStartDate: getWeekKey(),
			},
		};
		setLeagueState(newLeagueState);
		localStorage.setItem("league-state", JSON.stringify(newLeagueState));
		navigate({ to: "/league" });
	};

	return (
		<div className="min-h-screen bg-[#121212] text-white">
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
						Set Your Lineup
					</h1>
					<p className="text-zinc-400">
						Pick 5 stocks from your bench to compete this week
					</p>
					{/* Debug indicator for MyStak state */}
					{swipedBrands === null && (
						<div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
							⚠️ Error: MyStak failed to load. Check console for details.
						</div>
					)}
				</header>

				<div className="space-y-8">
					{/* Lineup Slots */}
					<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-bold text-white">
								Starters ({selectedStarters.length}/5)
							</h2>
							{selectedStarters.length === 5 && (
								<span className="text-green-400 text-sm">Ready to lock!</span>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{Array.from({ length: 5 }).map((_, index) => {
								const starter = selectedStarters[index];
								return (
									<button
										key={index}
										onClick={() => starter && handleRemoveStarter(index)}
										disabled={!starter}
										className={`border-2 border-dashed rounded-lg p-4 min-h-[100px] flex items-center justify-center transition-all ${
											starter
												? "border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 cursor-pointer"
												: "border-zinc-700 bg-zinc-800/30 cursor-default"
										}`}
									>
										{starter ? (
											<div className="w-full">
												<div className="flex items-center gap-3 mb-2">
													<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center text-lg font-bold">
														{starter.ticker.charAt(0)}
													</div>
													<div className="flex-1 text-left">
														<h3 className="font-bold text-white text-sm">
															{starter.name}
														</h3>
														<span className="text-xs font-mono text-zinc-500 uppercase">
															{starter.ticker}
														</span>
													</div>
												</div>
												<p className="text-xs text-zinc-500 text-center mt-2">
													Tap to remove
												</p>
											</div>
										) : (
											<p className="text-zinc-600 text-sm">Pick your starter</p>
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Choose from Your Stak */}
					<div>
						<div className="mb-4">
							<h2 className="text-2xl font-bold text-white mb-2">
								Choose from Your Stak
							</h2>
							<p className="text-sm text-zinc-500">
								These are stocks you've saved from swiping.
							</p>
						</div>

						{swipedBrands.length === 0 ? (
							<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
								<p className="text-zinc-400 mb-2">
									You haven't saved any stocks yet.
								</p>
								<p className="text-zinc-500 text-sm">
									Go to Discover to find some vibes.
								</p>
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{swipedBrands.map((brand) => {
									const isSelected = !!selectedStarters.find(
										(b) => b.id === brand.id,
									);
									return (
										<button
											key={brand.id}
											onClick={() => handleAddStarter(brand)}
											disabled={isSelected}
											className={`text-left p-6 rounded-xl border-2 transition-all ${
												isSelected
													? "border-yellow-500/50 bg-yellow-500/5 opacity-60 cursor-not-allowed"
													: "border-zinc-800 bg-zinc-900/50 hover:border-cyan-500/50 hover:bg-zinc-800/80"
											}`}
										>
											<div className="flex items-start gap-4 mb-3">
												<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center text-xl font-bold shrink-0">
													{brand.ticker.charAt(0)}
												</div>
												<div className="flex-1 min-w-0">
													<h3 className="font-bold text-white text-lg mb-1">
														{brand.name}
													</h3>
													<span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
														{brand.ticker}
													</span>
												</div>
												{isSelected && (
													<Check className="w-6 h-6 text-yellow-500 shrink-0" />
												)}
											</div>
											<p className="text-sm text-zinc-400 italic line-clamp-2">
												{brand.bio}
											</p>
										</button>
									);
								})}
							</div>
						)}
					</div>

					<div className="flex justify-center">
						<Button
							onClick={handleLockLineup}
							disabled={selectedStarters.length !== 5}
							className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-lg px-8 py-6 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Lock Lineup
						</Button>
					</div>

					<p className="text-xs text-zinc-600 text-center">
						Once locked, you can't change your picks until next Monday
					</p>
				</div>
			</div>
		</div>
	);
}
