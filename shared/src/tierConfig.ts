/** XP earned per activity type, per tier. Single source of truth for frontend + backend. */
export const TIER_XP = {
	1: { lesson: 15, battle: 5,  lab: 5,  label: "Beginner" },
	2: { lesson: 21, battle: 6,  lab: 6,  label: "Learner"  },
	3: { lesson: 26, battle: 7,  lab: 7,  label: "Investor" },
	4: { lesson: 34, battle: 8,  lab: 8,  label: "Analyst"  },
	5: { lesson: 45, battle: 10, lab: 10, label: "Expert"   },
} as const;

/** Total XP required to reach each tier */
export const TIER_THRESHOLDS = {
	1: 0,
	2: 500,
	3: 1500,
	4: 3500,
	5: 7500,
} as const;

export type TierNumber = 1 | 2 | 3 | 4 | 5;

export function xpToTier(totalXp: number): TierNumber {
	if (totalXp >= 7500) return 5;
	if (totalXp >= 3500) return 4;
	if (totalXp >= 1500) return 3;
	if (totalXp >= 500)  return 2;
	return 1;
}

/** Core activity types shared between frontend and backend. */
export const ACTIVITY_TYPES = ["lesson", "battle", "earnings", "risk", "mood"] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];
