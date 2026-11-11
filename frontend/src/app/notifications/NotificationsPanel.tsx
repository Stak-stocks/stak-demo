import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { type Notice, useNotifications } from "@/app/live/notifications";
import { cn } from "@/lib/utils";
import { NT } from "./assets";
import { notifications } from "./data";

/** The dialog's id. The bell (PageHeader) names it in `aria-controls`, which is also how the panel finds the bell. */
export const NOTIFICATIONS_PANEL_ID = "stak-notifications-panel";

/** The search parameter that opens the panel from a link: `/home?notifications=1` (2:2611) and `=empty` (2:2819). */
const LINK_PARAM = "notifications";

/** The bell, and the Profile hub's Notifications row: whatever names the panel in `aria-controls` opens and closes it. */
const OPENER = `[aria-controls="${NOTIFICATIONS_PANEL_ID}"]`;

/**
 * "Notifications panel" (Figma 2:2728, 420x541) / empty (2:2936, 420x179), anchored 48px under the wordmark row at the
 * content column's right edge (frame position 970,136).
 *
 * Neither Figma page draws a scrim or a close control: the frame is the panel over a live page, and the phone's
 * Notifications pages (1:5927 / 1:5977) leave with an instant Back. So nothing covers the page while it is open: a press
 * anywhere outside it closes it and still lands where it was aimed (a sidebar link navigates on that same click), Esc
 * closes it, and the bell toggles it (the page's handler, which holds the panel's state). A dismissed panel also takes
 * `?notifications=` out of the address, so a reload, Back or Forward does not bring it back: this component does it for
 * Esc and a press outside, the bell's handler for the bell. The rows are what actually happened (live/notifications);
 * "empty" forces the empty layout.
 *
 * One navigation per press: the router keeps a single "view transition" flag for the next load, so a second navigation
 * fired in the same moment (dropping the parameter while a link navigates) loses its `viewTransition: false` and runs the
 * app's default dissolve instead of Figma's instant swap. A press outside therefore drops the parameter only once the
 * press is over and has not navigated anywhere, and a row navigates straight to its source.
 *
 * Below 1024 (SPEC R3 / R6 / R10, the responsive run) the panel is never wider than the column, up to Figma's 420, and
 * the page decides its `seat`: "flow" (the default), in flow under the header at the column's right edge (under the
 * bell, where the frame anchors it), pushing the page down while it is open, so it covers nothing of the narrower page:
 * the frame's absolute seat (8 below the wordmark row, beside the greeting, over the Market Mood card's right side) has
 * no room beside the greeting on a phone and covers the card's heading on most tablets (R6). "float" keeps Figma's seat
 * over the page where the page has measured room for it (Home on wide tablets: home/panelSeat.ts), so the page never
 * moves and a press outside lands where it was aimed, as at 1440. In flow the panel holds up the page under the pointer,
 * so a press outside closes it only once the press's own click has run (its handlers and default action first): as at
 * 1440 the press lands where it was aimed and the panel goes. A touch tap's click is dispatched after the release, in a
 * later task, once the browser has recognised the tap (3-4 ms later in Chrome, measured 2026-10-31); closing at the
 * release could move the page up by the panel (570px at 390) before it, and the click then hit whatever had moved under
 * the finger. A release that brings no click (a long press) closes it after CLICK_WAIT. A press the browser takes over
 * (pointercancel: a pan that scrolls the page, a pinch) is no press outside: the panel stays, as a wheel or trackpad
 * scroll leaves it at 1440. The bell, Esc and the rows work exactly as at 1440.
 * On phones a row whose one-line body wraps in the narrower panel grows its card instead of being clipped. From 1024 up
 * the seat is the frame's whatever the prop says.
 */
export type PanelSeat = "float" | "flow";

/**
 * How long a press outside the in-flow panel waits, after its release, for its click before it closes the panel anyway
 * (a release that brings none, as after a long press). A tap's click follows its release by a few ms, far inside this;
 * the panel staying this long after a press that has no click is the price of never closing before one.
 */
const CLICK_WAIT = 500;

/**
 * Runs `done` once the press `pointerId` is over: after its release AND after that release's click has been dispatched
 * (seen in the capture phase, so whatever its handlers do with it; `done` waits a task, so it lands after them and the
 * click's default action), or CLICK_WAIT after a release that brings no click. A press the browser takes over
 * (pointercancel) ends the watch without `done`. Returns the function that drops the watch (the panel going first).
 */
function afterPressAndClick(pointerId: number, done: () => void): () => void {
	let timer = 0;
	const off = () => {
		window.removeEventListener("pointerup", released, true);
		window.removeEventListener("pointercancel", cancelled, true);
		window.removeEventListener("click", clicked, true);
		window.clearTimeout(timer);
	};
	const released = (e: PointerEvent) => {
		if (e.pointerId !== pointerId) return;
		window.removeEventListener("pointerup", released, true);
		window.removeEventListener("pointercancel", cancelled, true);
		window.addEventListener("click", clicked, true);
		timer = window.setTimeout(() => {
			off();
			done();
		}, CLICK_WAIT);
	};
	const cancelled = (e: PointerEvent) => {
		if (e.pointerId === pointerId) off();
	};
	const clicked = () => {
		off();
		timer = window.setTimeout(done, 0);
	};
	window.addEventListener("pointerup", released, true);
	window.addEventListener("pointercancel", cancelled, true);
	return off;
}

export function NotificationsPanel({ variant, seat = "flow", onClose }: { variant: "list" | "empty"; seat?: PanelSeat; onClose: () => void }) {
	const inbox = useNotifications();
	const navigate = useNavigate();
	const panelRef = useRef<HTMLDivElement>(null);
	// Esc and the bell give the focus back to the bell; a press outside hands it to what it landed on, and a row to the
	// page it opens
	const refocusBell = useRef(true);
	// a press outside the in-flow panel that is still waiting for its click (afterPressAndClick): dropped if the panel goes first
	const pressUnderWay = useRef<(() => void) | null>(null);

	const dropLinkParam = useCallback(() => {
		if (!new URLSearchParams(window.location.search).has(LINK_PARAM)) return;
		const without = (prev: Record<string, unknown>) => {
			const { [LINK_PARAM]: _dropped, ...rest } = prev;
			return rest;
		};
		navigate({ to: ".", search: without as never, replace: true, resetScroll: false, viewTransition: false });
	}, [navigate]);

	const onKey = useEffectEvent((e: KeyboardEvent) => {
		if (e.key !== "Escape") return;
		refocusBell.current = true;
		dropLinkParam();
		onClose();
	});
	// light dismiss: nothing is prevented, so the press goes on to whatever it landed on
	const onPressOutside = useEffectEvent((e: PointerEvent) => {
		if (e.button !== 0) return;
		const target = e.target instanceof Element ? e.target : null;
		const panel = panelRef.current;
		if (!target || !panel || panel.contains(target) || target.closest(OPENER)) return;
		refocusBell.current = false;
		// after the release and its click have run: a press that navigated has left the page (and its parameter) behind
		const from = window.location.href;
		// In flow (phones, and tablets without room for the seat) the panel holds up the page under the pointer: it goes
		// once the press's own click has run, and not at all for a pan or a pinch (see PanelSeat).
		if (getComputedStyle(panel).position === "static") {
			pressUnderWay.current?.();
			pressUnderWay.current = afterPressAndClick(e.pointerId, () => {
				pressUnderWay.current = null;
				onClose();
				if (window.location.href === from) dropLinkParam();
			});
			return;
		}
		// Hanging over the page (1024 and up, and a compact "float" seat) the panel goes at the press: nothing under the
		// pointer moves.
		onClose();
		const settle = () => {
			window.removeEventListener("pointerup", settle, true);
			window.removeEventListener("pointercancel", settle, true);
			setTimeout(() => {
				if (window.location.href === from) dropLinkParam();
			}, 0);
		};
		window.addEventListener("pointerup", settle, true);
		window.addEventListener("pointercancel", settle, true);
	});
	// The opener (the bell, the Profile hub's row) is left to its own click handler: the page that holds the panel's
	// state closes it there and, on Home, drops the link parameter itself (_app.home.tsx). A parameter drop from here
	// in the click's capture phase re-rendered Home before the bell's toggle ran, which then re-opened the panel.
	useEffect(() => {
		const key = (e: KeyboardEvent) => onKey(e);
		const press = (e: PointerEvent) => onPressOutside(e);
		window.addEventListener("keydown", key);
		document.addEventListener("pointerdown", press, true);
		return () => {
			window.removeEventListener("keydown", key);
			document.removeEventListener("pointerdown", press, true);
			pressUnderWay.current?.();
			pressUnderWay.current = null;
		};
	}, []);

	// Focus moves into the dialog while it is open and back to the bell when it closes, and the bell reads as expanded
	// meanwhile. The bell belongs to PageHeader, which does not know the panel's state, so both go through the DOM; the
	// panel mounts and unmounts with its open state.
	useEffect(() => {
		const bell = document.querySelector<HTMLElement>(OPENER);
		bell?.setAttribute("aria-expanded", "true");
		panelRef.current?.focus({ preventScroll: true });
		return () => {
			bell?.setAttribute("aria-expanded", "false");
			if (refocusBell.current && bell?.isConnected) bell.focus({ preventScroll: true });
		};
	}, []);

	// A row opens where its information comes from (`href`, live/notifications: the frame's five seeded rows open the
	// pages the phones open for them, android StakNavHost.kt:709-727 / ios MainTabsView.swift:378-390: NVDA's page, the
	// NVDA pick, News, Simulate, Discover). Neither prototype wires these rows; the phone page's list rows that
	// open a detail (story tile, collection card, stock card, pick row) are all INSTANT navigates, so this one is too:
	// one navigation, straight to the source; the panel goes with the page it was drawn over. Back returns to that page
	// as it was, the panel with it when a link opened it (the phone's rows push over the inbox and Back returns to it).
	const leaveTo = (n: Notice) => {
		inbox.markRead(n.id);
		refocusBell.current = false;
		const [path, query = ""] = n.href.split("?");
		const search: Record<string, string> = {};
		for (const [k, v] of new URLSearchParams(query)) search[k] = v;
		// a source on the page the panel is over (nothing unmounts it) still closes it
		void navigate({ to: path as "/", search: search as never, viewTransition: false }).then(onClose, onClose);
	};

	const empty = variant === "empty" || inbox.items.length === 0;

	return (
		<div
			ref={panelRef}
			id={NOTIFICATIONS_PANEL_ID}
			role="dialog"
			aria-label={notifications.title}
			tabIndex={-1}
			// 1px #FFFFFF 8% stroke inside (counted in the layout: content starts at 17), radius 16, #0E162B, and Figma's drop
			// shadow (2:2728 / 2:2936 effects): DROP_SHADOW offset 0 16 · radius 40 · spread -8 · #000 45%. The stroke is an
			// inset ring under the padding (17 / 29), not a CSS border: under the laptops' scaled canvas (zoom 0.889 at 1280)
			// Chrome snaps a border to a whole device pixel, which made the panel 0.25px taller than Figma's 541 / 179; the
			// ring takes no layout and is anti-aliased at the zoomed width, as Figma rasterises its stroke.
			className={cn(
				"absolute right-0 top-[48px] z-20 flex w-[420px] flex-col items-start gap-[12px] rounded-[16px] bg-[#0e162b] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0px_16px_40px_-8px_rgba(0,0,0,0.45)] outline-none",
				empty ? "px-[17px] py-[29px]" : "p-[17px]",
				// below 1024: never wider than the column (up to Figma's 420); in flow it is a child of the page's flex column at
				// its right edge (top / right / z-index no longer apply), floating it keeps the frame's right-0 / top-48 seat
				"max-lg:w-full max-lg:max-w-[420px]",
				seat === "flow" && "max-lg:static max-lg:self-end",
			)}
		>
			{empty ? <PanelEmpty /> : <PanelList inbox={inbox} onOpen={leaveTo} />}
		</div>
	);
}

/*
 * Every text box below carries Figma's own height (its auto line height: Sora 16 -> 20, Geist 14 -> 18, 12 -> 16,
 * 11 -> 14). The app-wide rule that rounds text boxes up to whole pixels sees 20.0001 for a 20px line under the
 * laptops' scaled-down canvas and makes it 21, which pushed the 1280 panel a pixel taller at every row.
 */
function PanelList({ inbox, onOpen }: { inbox: ReturnType<typeof useNotifications>; onOpen: (n: Notice) => void }) {
	const nothingUnread = inbox.unread === 0;
	return (
		<>
			{/* "Frame" 2:2729: the 20px header row, clipped as Figma clips it; while Mark all read has keyboard focus the clip
			    steps out 4px so its 2px ring at 2px offset shows whole (resting pixels unchanged) */}
			<div className="flex h-[20px] w-full items-center justify-between overflow-clip whitespace-nowrap [&:has(:focus-visible)]:[overflow-clip-margin:4px]">
				<span className="h-[20px] font-sora text-[16px] font-semibold leading-[20px] text-white">{notifications.title}</span>
				{/* 2:2731 Geist Medium 12 #66B7DA, its hug box 74 wide at x 312 of the 386 row (Chrome's advance is 73.3, so the
				    box keeps Figma's width and the label starts where Figma's does). Figma draws no disabled look: with nothing
				    unread it keeps its colour and says so to assistive tech, and stays focusable. */}
				<button
					type="button"
					aria-disabled={nothingUnread || undefined}
					onClick={nothingUnread ? undefined : inbox.markAllRead}
					className="h-[16px] w-[74px] cursor-pointer rounded-[4px] text-left font-geist text-[12px] font-medium leading-[16px] text-[#66b7da] aria-disabled:cursor-default"
				>
					{notifications.markAllRead}
				</button>
			</div>
			{inbox.today.length > 0 && (
				<>
					<p className="h-[14px] w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{notifications.today.label}</p>
					<Group items={inbox.today} onOpen={onOpen} />
				</>
			)}
			{inbox.earlier.length > 0 && (
				<>
					<p className="h-[14px] w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{notifications.earlier.label}</p>
					<Group items={inbox.earlier} onOpen={onOpen} />
				</>
			)}
		</>
	);
}

/** The frame draws its two groups at 246 (three rows) and 165 (two rows); other counts size to content. */
const GROUP_HEIGHTS: Record<number, number> = { 3: 246, 2: 165 };

/**
 * "Settings card" 2:2733 / 2:2750 (#10182B, radius 16, 4px vertical padding, rows centred 10 apart) of "Permission ·
 * Notifications" rows (#181F30, radius 14, padding 16, gap 12). Figma gives the rows no hover or pressed variant, so a
 * row answers the pointer with the cursor only. The card clips its content as Figma's does; the rows span its full
 * width, so while one has keyboard focus the clip steps out 4px and the 2px ring at 2px offset shows whole on every
 * side (resting pixels unchanged).
 */
function Group({ items, onOpen }: { items: Notice[]; onOpen: (n: Notice) => void }) {
	return (
		<div
			className={cn(
				"flex w-full flex-col items-center justify-center overflow-clip rounded-[16px] bg-[#10182b] py-[4px] [&:has(:focus-visible)]:[overflow-clip-margin:4px]",
				// phones: the frame's height is a minimum, so a row whose body wraps in the narrower panel (288 at 320) grows the
				// card instead of being clipped
				"max-sm:h-auto!",
				items.length === 3 ? "max-sm:min-h-[246px]" : items.length === 2 ? "max-sm:min-h-[165px]" : undefined,
			)}
			style={{ height: GROUP_HEIGHTS[items.length] }}
		>
			<div className="flex w-full flex-col items-center justify-center gap-[10px]">
				{items.map((item) => (
					<button
						key={item.id}
						type="button"
						onClick={() => onOpen(item)}
						className="flex w-full cursor-pointer items-center gap-[12px] overflow-clip rounded-[14px] bg-[#181f30] p-[16px] text-left"
					>
						{/* the dot below is decorative; this is the unread state a screen reader gets */}
						{item.unread && <span className="sr-only">Unread</span>}
						<div className="flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip">
							<span className="h-[18px] whitespace-nowrap font-geist text-[14px] font-medium leading-[18px] text-white">{item.title}</span>
							{/* one line in the frame; a longer body of the person's own wraps (h-auto: lines of 14, no rounding) */}
							<span className="h-auto w-full font-geist text-[11px] leading-[14px] text-[#acafb1] max-sm:text-pretty">{item.body}</span>
						</div>
						{/* "Ellipse" 2:2739: Figma's 8px #66B7DA dot */}
						{item.unread && <img alt="" src={NT.unreadDot} width={8} height={8} className="size-[8px] shrink-0" />}
					</button>
				))}
			</div>
		</div>
	);
}

function PanelEmpty() {
	return (
		<>
			<div className="flex h-[20px] w-full items-center justify-between overflow-clip">
				<span className="h-[20px] whitespace-nowrap font-sora text-[16px] font-semibold leading-[20px] text-white">{notifications.title}</span>
			</div>
			{/* "Frame" 2:2939: Figma's empty 10x8 spacer */}
			<div className="h-[8px] w-[10px]" />
			<div className="flex w-full flex-col items-center justify-center gap-[12px] text-center">
				<p className="h-[25px] w-full font-sora text-[20px] font-semibold leading-[25px] text-white">{notifications.empty.title}</p>
				<p className="h-[32px] w-[242px] font-geist text-[12px] leading-[16px] text-[#819abb]">{notifications.empty.body}</p>
			</div>
		</>
	);
}
