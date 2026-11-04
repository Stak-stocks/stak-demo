import { useEffect, useRef } from "react";
import type { GoalCheckIn } from "@/lib/api";
import { goalCheckInCopy, useGoalCheckIn } from "@/hooks/useGoalCheckIn";
import { DESK, DeskButton, deskFocus, panelStyle } from "@/components/desktop/deskKit";

/**
 * Desktop Home's goal check-in: the phone's GoalCheckInCard as one strip above the brief, the same words and
 * behaviour - answered, it says how it went (read out, focus on its heading as the buttons go).
 */
export function GoalCheckInStrip({ current }: { current: GoalCheckIn | null | undefined }) {
	const { checkIn, status, answer } = useGoalCheckIn(current);
	const heading = useRef<HTMLHeadingElement>(null);
	const copy = checkIn ? goalCheckInCopy(checkIn, status) : null;
	useEffect(() => { if (copy && !copy.asking) heading.current?.focus(); }, [copy?.asking]);
	if (!copy) return null;
	const sending = status === "sending";
	return (
		<section aria-labelledby="goal-check-in-desk" className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4" style={panelStyle}>
			<div className="min-w-[280px] flex-1" aria-live="polite">
				<h2 id="goal-check-in-desk" ref={heading} tabIndex={-1} className="text-[15px] font-semibold text-white outline-none">{copy.title}</h2>
				<p className="text-[13px]" style={{ color: DESK.body }}>{copy.body}</p>
				<p className="text-[12px]" style={{ color: DESK.muted }}>{copy.footnote}</p>
			</div>
			{copy.asking && (
				<div className="flex items-center gap-4">
					<DeskButton disabled={sending} onClick={() => void answer(true)}>Switch to long-term</DeskButton>
					<button type="button" disabled={sending} onClick={() => void answer(false)} className={`min-h-[44px] text-[13px] font-semibold disabled:opacity-40 ${deskFocus}`} style={{ color: DESK.cyan }}>Keep the basics</button>
				</div>
			)}
		</section>
	);
}
