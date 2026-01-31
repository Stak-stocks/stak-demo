import type { BrandProfile } from "./brands";

export interface LeagueLineup {
	starters: BrandProfile[];
	locked: boolean;
	weekStartDate: string;
}

export interface LeaguePerformance {
	userReturn: number;
	marketReturn: number;
	percentile: number;
	isWin: boolean;
}

export interface LeagueStats {
	xp: number;
	currentStreak: number;
	longestStreak: number;
	totalWins: number;
	totalWeeks: number;
	badges: string[];
}

export interface LeagueState {
	hasJoined: boolean;
	currentLineup: LeagueLineup | null;
	stats: LeagueStats;
	weeklyResults: Record<string, LeaguePerformance>;
}

export const INITIAL_LEAGUE_STATE: LeagueState = {
	hasJoined: false,
	currentLineup: null,
	stats: {
		xp: 0,
		currentStreak: 0,
		longestStreak: 0,
		totalWins: 0,
		totalWeeks: 0,
		badges: [],
	},
	weeklyResults: {},
};

export function getWeekKey(): string {
	const now = new Date();
	const year = now.getFullYear();
	const week = Math.ceil(
		(now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000),
	);
	return `${year}-W${week}`;
}

export function getDayOfWeek(): number {
	return new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
}

export function getLeagueButtonState(): {
	label: string;
	action: "set-lineup" | "view-performance" | "view-results";
} {
	const day = getDayOfWeek();

	if (day === 1) {
		return { label: "Set Lineup", action: "set-lineup" };
	}
	if (day === 5) {
		return { label: "View Results", action: "view-results" };
	}
	return { label: "View Performance", action: "view-performance" };
}

export function getWinMessage(percentile: number): string {
	if (percentile >= 90) {
		return "You absolutely crushed it this week! 🔥";
	}
	if (percentile >= 70) {
		return "Solid picks! You're on fire! 🚀";
	}
	if (percentile >= 50) {
		return "Not bad at all! You beat the majority! 💪";
	}
	return "You tried! Better luck next week! 😅";
}

export function getLossMessage(percentile: number): string {
	if (percentile < 20) {
		return "Oof. Maybe let the algorithm pick next time? 😬";
	}
	if (percentile < 40) {
		return "The market was not your friend this week. Next! ⏭️";
	}
	return "Close call! You almost had it! 🎯";
}
