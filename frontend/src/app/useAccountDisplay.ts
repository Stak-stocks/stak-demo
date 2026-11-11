import { useAuth } from "@/context/AuthContext";
import { account as demo } from "./data/account";
import { useShowcase } from "./live/showcase";
import { useLive } from "./live/store";

export type AccountDisplay = {
	/** Display name as entered by the person (the Figma persona "Hamza" for a fresh guest). */
	name: string;
	/** First name, used by the greeting. */
	first: string;
	initial: string;
	/** "@first" shown on Profile, Edit profile and the leaderboard. */
	handle: string;
	email: string;
	/** Second line of the sidebar account row: the person's handle; the frames' own text while the showcase is untouched. */
	sidebarLine: string;
	/** "Good Morning, Hamza" — the salutation follows the local time of day. */
	greeting: string;
	isDemo: boolean;
};

const DEMO_EMAIL = "hamza@gmail.com";

export function timeGreeting(date = new Date()): string {
	const h = date.getHours();
	if (h < 12) return "Good Morning";
	if (h < 18) return "Good Afternoon";
	return "Good Evening";
}

/** "@" + the display name's first word in lower case (letters, digits and _ only), "@you" when nothing of it is left. */
export const handleOf = (first: string): string => `@${first.toLowerCase().replace(/[^a-z0-9_]/g, "") || "you"}`;

/**
 * The rail's second line (the hunt's VIS-05, coordinator ruling N30.8): the person's handle ("@hamza", "@ada",
 * "@jane"), the same one the Profile hub and Edit profile show, and never "@" + an email address: Edit profile tells
 * the person their email is never shown, and the rail printed it on every page for every account. Only the untouched
 * showcase repeats the frame's own text (2:7369 "@hamzdris@gmail.com", Figma's slip, kept verbatim by D7): the
 * signed-out persona under its own name before its first action.
 */
export const sidebarLineOf = (o: { handle: string; showcase: boolean; demoName: boolean }): string => (o.showcase && o.demoName ? demo.handle : o.handle);

/**
 * The signed-in account's display values for every place the frames show the persona
 * (sidebar account row, Home greeting, Profile, Edit profile). A guest is the Figma persona
 * until they rename themselves; a renamed guest shows their own name everywhere too.
 * The account's month ("Paper investor since ...") has one source, the Profile hub's own line:
 * investorSince(live.createdAt) in src/app/profile/identity.ts.
 */
export function useAccountDisplay(): AccountDisplay {
	const { user } = useAuth();
	const live = useLive();
	const showcase = useShowcase();
	const email = user?.email ?? "";
	const name = (live.displayName || (email ? email.split("@")[0] : "") || demo.name).trim();
	const first = name.split(/\s+/)[0] ?? name;
	const handle = handleOf(first);
	const isDemo = !live.signedIn && name === demo.name;
	return {
		name,
		first,
		initial: first.charAt(0).toUpperCase(),
		handle,
		email: email || (live.signedIn ? "" : DEMO_EMAIL),
		sidebarLine: sidebarLineOf({ handle, showcase, demoName: isDemo }),
		greeting: `${timeGreeting()}, ${first}`,
		isDemo,
	};
}
