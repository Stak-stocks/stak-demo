/** Profile hub (2:2476), Edit profile (2:2555), Taste & risk (2:2760) — copy verbatim, including the two spaces before each chevron. */
export const profile = {
	title: "Profile",
	initial: "H",
	name: "Hamza",
	subtitle: "@hamza · Paper investor since July 2026",
	edit: "Edit profile",
	yourStak: {
		label: "YOUR STAK",
		rows: [
			{ label: "Taste & risk profile", value: "Tech curious · Growth  ›" },
			{ label: "Paper portfolio", value: "$10,240  ›" },
			{ label: "Leaderboard rank", value: "#47 this week  ›" },
		],
	},
	account: {
		label: "ACCOUNT",
		rows: ["Notifications", "Contact support", "Terms of service", "Privacy policy"],
	},
	logOut: "Log out",
	deleteAccount: "Delete account",
} as const;

export const editProfile = {
	title: "Edit profile",
	initial: "H",
	avatarHint: "Tap the avatar to change your photo",
	fields: [
		{ label: "DISPLAY NAME", value: "Hamza" },
		{ label: "HANDLE", value: "@hamza" },
		{ label: "EMAIL", value: "hamza@gmail.com" },
	],
	security: { label: "SECURITY", row: { label: "Reset password", value: "Email me a link  ›" } },
	note: "Your handle shows on the Simulate leaderboard. Your email never does.",
	save: "Save changes",
} as const;

/** The two pages behind the hub's ACCOUNT rows (the phones' SettingsKind NOTIFICATIONS / HELP). */
export const NOTIFICATION_SETTINGS_PATH = "/profile/notifications";
export const HELP_PATH = "/profile/help";

/** The support address the hub's Contact support row always mailed (the web's domain; the phones write support@stak.app). */
export const SUPPORT_EMAIL = "support@thestak.org";

/**
 * The product's version, as both phones print it on Help & support's Version row (android app/build.gradle.kts:41
 * versionName "1.0", ios Info.plist CFBundleShortVersionString): the website ships no version of its own.
 */
export const APP_VERSION = "1.0";

/**
 * Notifications (android ui/profile/SettingsScreens.kt:137-178 NotificationSettingsScreen, ios Profile/SettingsViews.swift
 * :124-179), copy verbatim. The phones' "Notifications are off for STAK" card is about the phone's own permission, which
 * the web has no equivalent of, so it is not drawn.
 */
export const notificationSettings = {
	title: "Notifications",
	priceMoves: {
		title: "Price moves on your picks",
		body: (threshold: number) => `A nudge when a saved or bought stock moves more than ${threshold}%.`,
	},
	threshold: { title: "Price threshold", body: "Only moves at least this big get a nudge." },
	dailyDeck: { title: "Daily deck", body: "One reminder when a fresh deck lands each morning." },
	marketNews: { title: "Market news", body: "The stories behind the moves, a few times a week." },
	caption: "You can change these any time.",
} as const;

/**
 * Help & support (android ui/profile/SettingsScreens.kt:180-230 HelpSupportScreen / FaqRow, ios Profile/SettingsViews.swift
 * :181-243): the phones' rows and questions; the answers say what the website does (the paper budget is the account's
 * own, prices are demo or the market feed's, data lives in the account or this browser).
 */
export const helpSupport = {
	title: "Help & support",
	faq: {
		money: {
			question: "Is this real money?",
			answer: (budget: string) => `No. Simulate runs on ${budget} of paper money so you can practice with zero risk. Nothing is bought or sold for real.`,
		},
		prices: {
			question: "Where do the prices come from?",
			signedOut: "Signed out, STAK shows demo prices. Every number on screen is illustrative.",
			live: "Signed in, prices come from STAK’s market feed. Every number on screen is illustrative.",
			offline: "STAK’s market feed is unreachable right now, so it shows demo prices. Every number on screen is illustrative.",
		},
		data: {
			question: "Is my data private?",
			signedOut: "Your picks, saves and paper portfolio live in this browser. STAK never sells your data.",
			signedIn: "Your saves, paper portfolio and taste live in your STAK account; this browser keeps your settings and photo. STAK never sells your data.",
		},
	},
	email: { label: "Email support", subject: "STAK support" },
	report: { label: "Report a problem", subject: "STAK problem report", body: (version: string) => `What happened:\n\nWhere in the app:\n\nApp version ${version} (web)` },
	terms: { label: "Terms of service", href: "https://thestak.org/terms" },
	privacy: { label: "Privacy policy", href: "https://thestak.org/privacy" },
	version: "Version",
} as const;

/** A mailto: link with its subject (and body), encoded as mail clients read them. */
export function mailto(address: string, subject: string, body?: string): string {
	const q = [`subject=${encodeURIComponent(subject)}`, ...(body ? [`body=${encodeURIComponent(body)}`] : [])].join("&");
	return `mailto:${address}?${q}`;
}

export const tasteRisk = {
	title: "Taste & risk",
	taste: {
		label: "YOUR TASTE",
		chips: ["Tech Curious", "High Growth", "Consumer Brands"],
		caption: "Your taste graph sharpens with every swipe.",
		retake: "Retake the taste quiz",
	},
	risk: {
		label: "RISK STYLE",
		value: "Growth-oriented",
		change: "Change  ›",
		description: "You accept bigger swings for bigger upside. Your deck leans toward growth names and skips the steadiest ones.",
	},
	goal: {
		label: "GOAL",
		value: "Long-term growth",
		change: "Change  ›",
		description: "You’re building a position over years, not weeks. The brief and your deck are tuned for that.",
	},
	footnote: "Changing your risk style or goal rebuilds tomorrow’s deck. Your saves and paper portfolio stay as they are.",
} as const;
