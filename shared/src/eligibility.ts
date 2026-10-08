/** Who may use STAK during the beta (Terms §2: 18 or older, in the United States) and the documents they accept --
 *  single source of truth for the backend's check and web. Mirrored by hand in Android's data/Eligibility.kt and iOS's
 *  Core/Eligibility.swift; Kotlin and Swift can't import this. Users confirm it themselves ("Before we get started"):
 *  one agreement, no date of birth. */

/** The published Terms of Service / Privacy Policy. Bumping either asks every account to agree again. */
export const TERMS_VERSION = "2026-10-08";
export const PRIVACY_VERSION = "2026-10-08";
export const TERMS_URL = "https://thestak.org/terms";
export const PRIVACY_URL = "https://thestak.org/privacy";

/** Accounts created on or after this day (US Eastern) can't use the API until they've agreed. Older accounts are
 *  asked by the app instead, so a phone still on an older build keeps working. */
export const ELIGIBILITY_ENFORCED_FROM = "2026-10-09";
