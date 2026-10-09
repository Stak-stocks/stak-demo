import { useAuth } from "@/context/AuthContext";
import { account as demo } from "./data/account";
import { monthYear } from "./live/format";
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
	/** Second line of the sidebar account row ("@" + email in the Figma). */
	sidebarLine: string;
	/** "Good Morning, Hamza" — the salutation follows the local time of day. */
	greeting: string;
	/** "July 2026" - the month the account was created. */
	since: string;
	isDemo: boolean;
};

const DEMO_SINCE = "July 2026";
const DEMO_EMAIL = "hamza@gmail.com";

export function timeGreeting(date = new Date()): string {
	const h = date.getHours();
	if (h < 12) return "Good Morning";
	if (h < 18) return "Good Afternoon";
	return "Good Evening";
}

/**
 * The signed-in account's display values for every place the frames show the persona
 * (sidebar account row, Home greeting, Profile, Edit profile). A guest is the Figma persona
 * until they rename themselves; a renamed guest shows their own name everywhere too.
 */
export function useAccountDisplay(): AccountDisplay {
	const { user } = useAuth();
	const live = useLive();
	const email = user?.email ?? "";
	const name = (live.displayName || (email ? email.split("@")[0] : "") || demo.name).trim();
	const first = name.split(/\s+/)[0] ?? name;
	const handle = `@${first.toLowerCase().replace(/[^a-z0-9_]/g, "") || "you"}`;
	const isDemo = !live.signedIn && name === demo.name;
	return {
		name,
		first,
		initial: first.charAt(0).toUpperCase(),
		handle,
		email: email || (live.signedIn ? "" : DEMO_EMAIL),
		sidebarLine: email ? `@${email}` : isDemo ? demo.handle : handle,
		greeting: `${timeGreeting()}, ${first}`,
		since: live.createdAt ? monthYear(live.createdAt) : DEMO_SINCE,
		isDemo,
	};
}
