import { useNavigate, useRouter } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { A } from "./assets";
import "./home/ink.css";
import { useNotifications } from "./live/notifications";
import { NOTIFICATIONS_PANEL_ID } from "./notifications/NotificationsPanel";
import { FigmaFile } from "./Sidebar";

/**
 * "Frame 1618869230" 2:417: the "Wordmark row" 2:418 (1134 x 40, auto layout space-between, centred: the logo group and
 * the bell) 18 above the page title (Sora SemiBold 26 #F2F6FC, line 33), as on Home / Profile / Notifications. The row
 * draws nothing of its own and nothing in it overflows (the logo sits at y 4.11, the bell at 2.5), so it is not clipped:
 * a clip would cut the focus ring of the bell and the wordmark (2px outside the 35px bell in a 40px row).
 *
 * Phones (below 640, SPEC R2): the shell's top bar already shows the STAK mark (CORE-API section 5), so the row keeps
 * the bell alone, at its right end, and the title follows as before; one mark on a phone screen, on Home and the three
 * Profile pages alike. From 640 up the row is the frame's.
 */
export function PageHeader({ title, onBell }: { title: string; onBell?: () => void }) {
	const { unread } = useNotifications();
	return (
		<div className="flex w-full flex-col items-start gap-[18px]">
			<div className="flex h-[40px] w-full items-center justify-between max-sm:justify-end">
				<Wordmark className="max-sm:hidden" />
				{/* aria-expanded is kept current by NotificationsPanel through the DOM while it is mounted (the header does not hold the panel's state) */}
				{/* "Frame 1618869050" 2:435: Figma defines no hover or pressed state for the bell (coordinator ruling 10:05), so it
				    carries no press styling; it stays a button that opens the notifications panel */}
				<button
					type="button"
					aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
					aria-haspopup="dialog"
					aria-controls={NOTIFICATIONS_PANEL_ID}
					aria-expanded={false}
					onClick={onBell}
					className="relative size-[35px] shrink-0 cursor-pointer rounded-full"
				>
					{/* the bell without its badge (Group 1000002393 2:438: the #192238 disc and the #AEAEAE outline); the badge
					    (Ellipse 467 2:442, 5.833 #FF8030 at 23.333 / 8.75) only while something is unread. The 40px row centres the
					    35px bell, so it starts half a pixel down (y 2.5): Figma's files are drawn as their own vectors from the whole
					    pixel above, offset by that half pixel. */}
					<FigmaFile src={A.bellQuiet} width={35} height={35} y={0.5} className="absolute left-0 top-[-0.5px]" />
					{unread > 0 && <FigmaFile src={A.bellDot} width={5.8333} height={5.8333} x={0.3333} y={0.25} className="absolute left-[23px] top-[8.5px]" />}
				</button>
			</div>
			{/* light on the page's dark ground: stak-ink (home/ink.css) draws it at Figma's stroke weight */}
			<h1 className="stak-ink w-full font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc] [--ink:#f2f6fc]">{title}</h1>
		</div>
	);
}

/**
 * "Group" 2:419 (130.96 x 31.77 at y 4.11): the mark 2:420 and the wordmark 2:430. It carries no reaction and no hover or
 * pressed state in Figma: a plain link to /home. It is a plain anchor rather than the router's Link so that on /home
 * only the sidebar's Nav · Home announces itself as the current page (Link would add a second aria-current="page");
 * a plain left click navigates through the router with no view transition, modified clicks keep the browser's own
 * behaviour (new tab, window, download).
 */
export function Wordmark({ className }: { className?: string } = {}) {
	const navigate = useNavigate();
	const router = useRouter();
	const href = router.buildLocation({ to: "/home" }).href;
	const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		void navigate({ to: "/home", viewTransition: false });
	};
	return (
		<a href={href} onClick={onClick} aria-label="STAK" className={cn("relative block h-[31.774px] w-[130.965px] shrink-0 rounded-[6px]", className)}>
			<img alt="" src={A.wordmarkIcon} className="absolute left-0 top-0 size-[31.774px]" />
			<img alt="" src={A.wordmarkText} className="absolute left-[37.17px] top-[6.92px] h-[17.979px] w-[93.795px]" />
		</a>
	);
}
