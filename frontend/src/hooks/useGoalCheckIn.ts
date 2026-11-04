import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { answerGoalCheckIn, type DailyBriefResponse, type GoalCheckIn } from "@/lib/api";

/** Home's goal check-in this visit: not answered yet, being sent, answered either way, or the send failed. */
export type GoalCheckInStatus = "open" | "sending" | "kept" | "switched" | "failed";

/** The check-in card's words for where it stands; the same in the apps (goalCheckInCopy / GoalCheckInCopy). */
export function goalCheckInCopy(checkIn: GoalCheckIn, status: GoalCheckInStatus) {
	const change = "You can change this any time in Profile, then Taste & risk.";
	if (status === "switched") {
		return { title: "Goal updated", body: "Your goal is now Grow my money long-term. STAK AI and your brief will focus on the long-term picture.", footnote: change, asking: false };
	}
	if (status === "kept") {
		return { title: "Got it", body: "STAK AI and your brief will keep explaining the basics.", footnote: change, asking: false };
	}
	const did = `You've been learning with STAK for ${checkIn.count} month${checkIn.count === 1 ? "" : "s"}.`;
	return {
		title: "Ready to go beyond the basics?",
		body: `${did} Switching changes your goal to Grow my money long-term, so STAK AI and your brief focus on the long-term picture instead of the basics.`,
		footnote: status === "failed" ? "Couldn't save that. Check your connection and try again." : status === "sending" ? "Saving…" : change,
		asking: true,
	};
}

/**
 * Answering Home's goal check-in (the apps' ProfileSync.answerGoalCheckIn): the server keeps the answer and, for
 * "switch", moves the goal. The card then says how it went for the rest of this visit; the cached brief stops carrying
 * the question, so it doesn't come back, and a switch re-reads the account's answers and taste. A failure lets them
 * try again. `checkIn` is the brief's, or once answered the one that was answered.
 */
export function useGoalCheckIn(current: GoalCheckIn | null | undefined) {
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<GoalCheckInStatus>("open");
	const [answered, setAnswered] = useState<GoalCheckIn | null>(null);

	async function answer(switchToGrow: boolean) {
		if (status === "sending" || !current) return;
		setStatus("sending");
		try {
			await answerGoalCheckIn(switchToGrow ? "switch" : "keep");
			setAnswered(current);
			setStatus(switchToGrow ? "switched" : "kept");
			queryClient.setQueriesData<DailyBriefResponse>({ queryKey: ["daily-brief"] }, (d) => (d ? { ...d, goalCheckIn: null } : d));
			if (switchToGrow) {
				void queryClient.invalidateQueries({ queryKey: ["profile"] });
				void queryClient.invalidateQueries({ queryKey: ["taste"] });
			}
		} catch {
			setStatus("failed");
		}
	}

	return { checkIn: answered ?? current ?? null, status, answer };
}
