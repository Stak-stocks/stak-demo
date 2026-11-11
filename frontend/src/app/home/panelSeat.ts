import { type RefObject, useLayoutEffect, useState } from "react";
import { useSizeClass } from "@/app/FitCanvas";
import type { PanelSeat } from "@/app/notifications/NotificationsPanel";

/**
 * Where the notifications panel sits below 1024 (SPEC R6: an absolute seat authored for the 1440 frame becomes normal
 * flow where it would collide). Figma seats the panel (2:2728, 420 x 541) at the column's right edge, 8 below the
 * wordmark row and beside the greeting, over the Market Mood card's right side and clear of the card's heading and
 * subtitle (2:449 / 2:450). On a phone the column (288-607) never has room beside the greeting, so the panel is in flow
 * under the header. On a tablet (a 520-903 column) it keeps Figma's seat wherever the seat clears every text beside it,
 * the greeting and the card's header, by at least the frame's own 8 (the gap it keeps from the row above): measured, not
 * a fixed width, because the greeting changes with the clock and the person's name ("Good Afternoon, Hamza" clears it
 * from about 875 wide; a longer name needs more, and a name that wraps the greeting never does). Everything measured
 * (the column's edges, the texts' ink) is the same whichever seat the panel has at the time, so the answer never chases
 * itself; it is taken again on a resize and once the fonts have loaded (a fallback font measures differently).
 *
 * `clearOf` names, inside `root`, the texts that share the panel's band at Figma's seat.
 */
export function usePanelSeat(root: RefObject<HTMLElement | null>, clearOf: string): PanelSeat {
	const size = useSizeClass();
	const [seat, setSeat] = useState<PanelSeat>("flow");
	useLayoutEffect(() => {
		if (size !== "tablet") {
			setSeat("flow");
			return;
		}
		let live = true;
		const measure = () => {
			if (live) setSeat(seatClears(root.current, clearOf) ? "float" : "flow");
		};
		measure();
		window.addEventListener("resize", measure);
		document.fonts?.ready.then(measure, () => undefined);
		return () => {
			live = false;
			window.removeEventListener("resize", measure);
		};
	}, [size, root, clearOf]);
	return seat;
}

/** "Notifications panel" 2:2728: 420 wide at the column's right edge; its top 136 is 8 under the wordmark row's 128. */
const PANEL_WIDTH = 420;
const CLEARANCE = 8;

function seatClears(root: HTMLElement | null, clearOf: string): boolean {
	if (!root) return false;
	const column = root.getBoundingClientRect();
	const panelLeft = column.right - Math.min(PANEL_WIDTH, column.width);
	const range = document.createRange();
	for (const text of root.querySelectorAll(clearOf)) {
		range.selectNodeContents(text);
		const ink = range.getBoundingClientRect();
		if (ink.width > 0 && ink.right + CLEARANCE > panelLeft) return false;
	}
	return true;
}
