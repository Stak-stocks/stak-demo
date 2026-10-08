/** Notifications panel copy (Figma 2:2728 panel, 2:2936 empty) — verbatim. */
export type NotificationItem = { title: string; body: string; unread?: boolean };

export const notifications = {
	title: "Notifications",
	markAllRead: "Mark all read",
	today: {
		label: "TODAY",
		items: [
			{ title: "NVDA is up 4.2% today", body: "One of your picks is moving. Tap to see why.", unread: true },
			{ title: "Your daily brief is ready", body: "Three stories matter for your STAK this morning.", unread: true },
			{ title: "Practice order filled", body: "0.2048 NVDA at $122.10 · paper" },
		] as NotificationItem[],
	},
	earlier: {
		label: "EARLIER",
		items: [
			{ title: "Weekly recap", body: "Your paper portfolio gained +1.9% last week." },
			{ title: "Deck complete", body: "You finished Friday’s deck. 12 of 12." },
		] as NotificationItem[],
	},
	empty: {
		title: "Nothing yet",
		body: "Price moves on your picks, your daily brief, and filled practice orders will show up here.",
	},
} as const;
