import { useCallback, useRef, useState } from "react";
import { NotificationsPanel } from "@/app/notifications/NotificationsPanel";

/**
 * The notifications panel (Figma 2:2611) opened in place over Profile, Edit profile and Taste & risk, the way Home's
 * bell opens it: the panel is drawn over the page the person is on, anchored under the bell at the column's right edge,
 * and Esc, a click outside or the bell closes it, leaving them where they were. Neither prototype wires the bell (the
 * desktop frames carry no reactions; the phone's profile frames wire only Back); the panel frame is drawn over Home,
 * whose bell opens it in place, so every bell does the same.
 *
 * The page's wrapper is `relative` and renders `panel` right after its PageHeader (Home's arrangement). `toggle` is the
 * bell's handler and the only opener: the hub's Notifications row (2:2528) is a link to the Notification settings page
 * (D10), so the panel never opens from a row any more (the opener / reveal path was removed 2026-11-08, profile review 2).
 * The panel focuses itself as it opens and returns the focus to the bell as it closes.
 *
 * Below 1024 (SPEC R3 / R6 / R9): the frame's seat (8 under the wordmark row, at the header row's right end) would lie
 * over the profile's own column wherever that column reaches under the bell, which is every compact width (the 640
 * column runs to x 736 on a tablet, the panel would start at 376 at 820 and 579 at 1023; on a phone the column is the
 * header row), and no frame draws the panel over a profile text. So the panel takes the flow seat under the header,
 * hanging from its bell as Figma 2:2611 anchors it (the panel's right edge on the bell's, which is the header row's and
 * the content column's right edge: 1390 in the frame): the seat below is the header row's full width and the panel's
 * own flow seat puts its right edge at the seat's end, at every compact width (376..796 under the bell at 761..796 at
 * 820, 579..999 under 964..999 at 1023; the whole column on phones and up to 760, where the 640 column is the header
 * row). The cards keep their 640 column below it. From 1024 up the seat is `display: contents` (no box): the panel
 * keeps the frame's absolute seat against the page's wrapper, nothing moves.
 */
export function useNotificationsPanel() {
	const [open, setOpen] = useState(false);
	const seat = useRef<HTMLDivElement>(null);

	const toggle = useCallback(() => setOpen((o) => !o), []);
	const close = useCallback(() => setOpen(false), []);

	return {
		open,
		toggle,
		panel: open ? (
			<div ref={seat} className="contents max-lg:flex max-lg:w-full max-lg:scroll-mt-[var(--stak-gutter)] max-lg:flex-col">
				<NotificationsPanel variant="list" onClose={close} />
			</div>
		) : null,
	};
}
