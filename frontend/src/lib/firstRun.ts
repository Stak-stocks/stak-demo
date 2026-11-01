import { useSyncExternalStore } from "react";

/**
 * Home's first run, like Android's Session.firstRunPending: a brand-new account lands on Home with the tab bar
 * swapped for a scrim and a "See Today's Pick" pill. It's set when onboarding finishes and cleared by the pill or by
 * leaving Home for another tab; a returning user (sign-in, a later visit) never sees it. Kept per account in this
 * browser - storage can be unavailable (private windows), in which case there's simply no first run.
 */
const key = (uid: string) => `stak.firstRun.${uid}`;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const subscribe = (onChange: () => void) => {
	listeners.add(onChange);
	return () => { listeners.delete(onChange); };
};

function read(uid: string): boolean {
	try { return localStorage.getItem(key(uid)) === "1"; } catch { return false; }
}

export function startFirstRun(uid: string) {
	try { localStorage.setItem(key(uid), "1"); } catch { /* no storage: no first run */ }
	notify();
}

export function completeFirstRun(uid: string | undefined) {
	if (!uid || !read(uid)) return;
	try { localStorage.removeItem(key(uid)); } catch { /* best-effort */ }
	notify();
}

/** Whether this account's first run is still pending; re-renders when it starts or ends. */
export function useFirstRunPending(uid: string | undefined): boolean {
	return useSyncExternalStore(
		subscribe,
		() => (uid ? read(uid) : false),
		() => false,
	);
}
