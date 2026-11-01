// Android's PaperPortfolio.lastError: a paper order that fails says why, on whatever screen the user is on.
import { useSyncExternalStore } from "react";
import { ApiError } from "@/lib/api";

const AUTO_DISMISS_MS = 7000;
const GENERIC = "That didn't go through — try again";

let current: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** The server's own reason for a refused request (4xx); anything else (a network drop, a 5xx) reads generically. */
export function paperErrorMessage(err: unknown): string {
	return err instanceof ApiError && err.status >= 400 && err.status < 500 && err.message ? err.message : GENERIC;
}

export function reportPaperError(err: unknown): void {
	current = paperErrorMessage(err);
	if (timer) clearTimeout(timer);
	timer = setTimeout(dismissPaperError, AUTO_DISMISS_MS);
	emit();
}

export function dismissPaperError(): void {
	if (timer) { clearTimeout(timer); timer = null; }
	if (current === null) return;
	current = null;
	emit();
}

export function usePaperError(): string | null {
	return useSyncExternalStore(
		(cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
		() => current,
		() => null,
	);
}
