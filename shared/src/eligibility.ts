/** Who may use STAK during the beta (Terms §2), and the documents they accept -- single source of truth for the
 *  backend's eligibility check and web. Mirrored by hand in Android's data/Eligibility.kt and iOS's
 *  Onboarding/EligibilityView.swift; Kotlin and Swift can't import this. */
export const MIN_AGE = 18;

/** The published Terms of Service / Privacy Policy. Bumping either asks every account to accept again. */
export const TERMS_VERSION = "2026-10-07";
export const PRIVACY_VERSION = "2026-10-07";
export const TERMS_URL = "https://thestak.org/terms";
export const PRIVACY_URL = "https://thestak.org/privacy";

/** Accounts created on or after this day (US Eastern) can't use the API until they've confirmed. Older accounts are
 *  asked by the app instead, so a phone still on an older build keeps working. */
export const ELIGIBILITY_ENFORCED_FROM = "2026-10-09";

/** A refused sign-up's email can't sign up again for this long. */
export const ELIGIBILITY_BLOCK_DAYS = 30;

/**
 * Whole years old on `today` for a date of birth "YYYY-MM-DD", or null when it isn't a real past date (or is before
 * 1900). Calendar arithmetic only - no time zone enters it.
 */
export function ageOn(dob: string, today: { year: number; month: number; day: number }): number | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
	if (!m) return null;
	const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
	const check = new Date(Date.UTC(year, month - 1, day));
	if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
	if (year < 1900) return null;
	const birthdayAhead = month > today.month || (month === today.month && day > today.day);
	const age = today.year - year - (birthdayAhead ? 1 : 0);
	// A date still to come is no birth date.
	return age < 0 ? null : age;
}
