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
