import { useEffect, useRef } from "react";
import { useLive } from "@/app/live/store";
import { getLocalDateKey } from "@/lib/utils";
import { newsListing } from "./data";

/** The stories the Today's brief carries (its three items, 2:4372): opening one of their articles reads the brief too. */
export const BRIEF_STORY_IDS: ReadonlySet<string> = new Set(newsListing.briefs.map((b) => b.id));

/** Whether a date key still owes today's read (the store holds the last day the brief was read; null: never). */
export const briefUnread = (lastBriefDate: string | null, today: string): boolean => lastBriefDate !== today;

/**
 * Records today's brief as read once it has been seen (the audit's news #12, the coordinator's decision for NEWS): the
 * News listing showing the brief carousel, or one of the brief's articles opening, calls the store's existing action
 * setLastBriefDate(getLocalDateKey()). The inbox derives its "Your daily brief is ready" row from that date
 * (src/app/live/notifications.ts, the PROFILE builder's rule) and accounts keep it on their document
 * (AccountContext.updateLastBriefDate). Written once per person and day: a re-render, or an account document that has
 * not caught up yet, writes nothing more. Waits for the store to be ready, so a signed-in visit never writes the guest's.
 */
export function useBriefRead(shown: boolean) {
	const { ready, uid, lastBriefDate, actions } = useLive();
	const wrote = useRef<string | null>(null);
	useEffect(() => {
		if (!shown || !ready) return;
		const today = getLocalDateKey();
		const key = `${uid ?? "guest"}|${today}`;
		if (wrote.current === key || !briefUnread(lastBriefDate, today)) return;
		wrote.current = key;
		actions.setLastBriefDate(today);
	}, [shown, ready, uid, lastBriefDate, actions]);
}
