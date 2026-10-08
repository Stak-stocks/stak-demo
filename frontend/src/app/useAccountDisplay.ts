import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { account as demo } from "./data/account";

export type AccountDisplay = {
	/** Display name as entered by the user (the Figma persona "Hamza" when signed out). */
	name: string;
	/** First name, used by the greeting. */
	first: string;
	initial: string;
	/** "@first" shown on Profile, Edit profile and the leaderboard. */
	handle: string;
	email: string;
	/** Second line of the sidebar account row ("@" + email in the Figma). */
	sidebarLine: string;
	greeting: string;
	/** "July 2026" - the month the account was created. */
	since: string;
	isDemo: boolean;
};

const DEMO: AccountDisplay = {
	name: demo.name,
	first: demo.name,
	initial: demo.initial,
	handle: "@hamza",
	email: "hamza@gmail.com",
	sidebarLine: demo.handle,
	greeting: demo.greeting,
	since: "July 2026",
	isDemo: true,
};

/**
 * The signed-in account's display values for every place the Figma frames show the persona
 * (sidebar account row, Home greeting, Profile, Edit profile). With no session the Figma demo
 * persona is returned, so the screens still match the frames.
 */
export function useAccountDisplay(): AccountDisplay {
	const { user } = useAuth();
	const { account } = useAccount();
	const email = user?.email ?? "";
	const name = (account?.displayName || user?.displayName || (email ? email.split("@")[0] : "")).trim();
	if (!user || !name) return DEMO;
	const first = name.split(/\s+/)[0];
	const handle = `@${first.toLowerCase().replace(/[^a-z0-9_]/g, "") || "you"}`;
	const created = user.metadata?.creationTime ? new Date(user.metadata.creationTime) : null;
	const since =
		created && !Number.isNaN(created.getTime())
			? created.toLocaleDateString("en-US", { month: "long", year: "numeric" })
			: DEMO.since;
	return {
		name,
		first,
		initial: first.charAt(0).toUpperCase(),
		handle,
		email,
		sidebarLine: email ? `@${email}` : handle,
		greeting: `Good Morning, ${first}`,
		since,
		isDemo: false,
	};
}
