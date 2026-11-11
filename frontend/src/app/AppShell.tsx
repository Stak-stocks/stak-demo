import { useLocation, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { A } from "./assets";
import { fillHeight, useSizeClass } from "./FitCanvas";
import { normalizeTicker } from "./live/catalog";
import { useLive } from "./live/store";
import { FigmaFile, NAV_MS, type NavKey, navTransition, Sidebar } from "./Sidebar";
import { SidebarSkeleton } from "./SidebarSkeleton";
import { type CrumbParent, previousAppPath, sectionOf } from "./stocks/origin";

const NAV_KEY = "stak.nav.open";
const flag = (v: unknown) => v === true || v === 1 || v === "1" || v === "true";
/** The slot inside <main> that ExampleTopBar renders into. */
export const EXAMPLE_TOPBAR_ID = "stak-example-topbar";
/** The compact shell's menu (the open sidebar as a modal drawer), named by the buttons that open it (aria-controls). */
export const NAV_DRAWER_ID = "stak-nav-drawer";

/**
 * The compact shell's geometry (documented in CORE-API.md). Tablet (640-1023): Figma's closed rail (72, the state of
 * 2:8435) and the content 24 after it (x 96, as 2:8435 places it), 88 from the top, 24 from the right. Phone (< 640):
 * a 64-tall top bar (the height of Figma's EXAMPLE "Top bar" 2:6313) holding the sidebar's own Show glyph and STAK logo,
 * then the content 16 from every edge.
 */
export const PHONE_TOP_BAR = 64;
export const PHONE_GUTTER = 16;
export const TABLET_GUTTER = 24;
export const TABLET_RAIL = 72;
/** The compact shell's min-height: the window's (phone), at least the closed rail's own 448 (tablet). 1024+: fillHeight. */
export const COMPACT_MIN_HEIGHT = { phone: "100svh", tablet: "max(448px, 100svh)" } as const;

function readNavOpen(): boolean {
	try {
		const v = localStorage.getItem(NAV_KEY);
		return v === null ? true : v === "1";
	} catch {
		return true;
	}
}

/**
 * The highlighted section. A stock detail belongs to Discover, except a company opened from My STAK (`myStakEntry`,
 * myStakEntryLit below): the "entry: My STAK" frames 2:4970, 2:5130 and 2:5247 draw the rail with My STAK active.
 * The 00 References EXAMPLE frames (`?variant=example`: deck 2:6451, stock detail 2:6311, buy ticket 2:6486) instance
 * the rail as Active=Home, State=Open (2:6452 / 2:6312 / 2:6487: Nav · Home filled 6%, Discover a plain row), so those
 * routes highlight Home as their frames do (the page frames win, as for Profile).
 * `openedFrom` (the hunt's VIS-07): a stock page opened from another section says so in its breadcrumb ("Simulate /
 * CRWD", "News / AAPL", "Profile / AAPL": src/app/stocks/StockDetail.tsx names the section usePageOrigin reports, and
 * Discover when there is none), and the rail lit Discover beside it. The rail now lights the section the crumb names:
 * one answer to "where am I", as a My STAK entry already gave. A page loaded by its address has no origin and keeps
 * the frames' Discover.
 */
export function activeFromPath(pathname: string, myStakEntry = false, example = false, openedFrom: NavKey | null = null): NavKey {
	if (pathname.startsWith("/news")) return "news";
	if (example && (pathname.startsWith("/discover") || pathname.startsWith("/stocks/"))) return "home";
	if (pathname.startsWith("/stocks")) return myStakEntry ? "mystak" : (openedFrom ?? "discover");
	if (pathname.startsWith("/discover")) return "discover";
	if (pathname.startsWith("/my-stak")) return "mystak";
	if (pathname.startsWith("/simulate")) return "simulate";
	if (pathname.startsWith("/profile")) return "profile";
	return "home";
}

/**
 * Whether a stock page opened from My STAK (`?from=my-stak`) lights My STAK: always, saved or not, as its crumb says
 * "My STAK / <T>" either way (review r2's low 3: a real Unsave flipped the rail to Discover beside that crumb, and every
 * Save / Unsave flipped it again). Frame 2:5402, the ticket over an UNSAVED My STAK entry, draws Discover: that look is
 * kept on the frame's own preview address only (`?ticket=1` while the company is not saved: G1 stock-mystak-ticket), as
 * N29a kept the deck ring's frame figure on its preview address. A real ticket opens without `ticket` in the address.
 * `saved`: the company is in the person's saves, or the `?saved=1` preview of the saved look.
 */
export function myStakEntryLit(search: Record<string, unknown>, saved: boolean): boolean {
	if (search.from !== "my-stak") return false;
	return saved || !flag(search.ticket);
}

/** The rail item of an app section a page was opened from (src/app/stocks/origin.ts names sections by their own page). */
const NAV_OF_SECTION: Record<CrumbParent["to"], NavKey> = {
	"/home": "home",
	"/news": "news",
	"/discover": "discover",
	"/my-stak": "mystak",
	"/simulate": "simulate",
	"/profile": "profile",
};
export const navKeyOf = (section: CrumbParent | null): NavKey | null => (section ? NAV_OF_SECTION[section.to] : null);

type HistoryList = NonNullable<Parameters<typeof previousAppPath>[1]>;
const trimSlash = (path: string) => path.replace(/\/$/, "") || "/";
const samePath = (a: string, b: string) => {
	try {
		return trimSlash(decodeURI(a)) === trimSlash(decodeURI(b));
	} catch {
		return trimSlash(a) === trimSlash(b);
	}
};

/**
 * The app section the page at `pathname` was opened from, by the stock page's own rule (src/app/stocks/origin.ts
 * previousAppPath + sectionOf, what its usePageOrigin gives the breadcrumb): the entry before this one in the browser's
 * history list when it is one of the app's pages and not a sheet over one; null otherwise.
 *
 * The shell renders a pushed page's path a moment BEFORE its entry is written to that list (the router's history
 * writes in a microtask; the shell follows the router's location at once), while the page itself mounts after it. So
 * until the router has `settled` on the page, an entry the browser still calls current that is not this path is the
 * page the person is coming from, and the same rule is asked about it; once settled this is exactly the page's own
 * reading. Measured without it: Simulate -> CRWD drew the crumb "Simulate / CRWD" beside a rail lit Discover.
 */
export function openedFromSection(
	pathname: string,
	basepath = "/",
	settled = true,
	list: HistoryList | undefined = typeof window === "undefined" ? undefined : (window as unknown as { navigation?: HistoryList }).navigation,
	origin: string = typeof window === "undefined" ? "" : window.location.origin,
): CrumbParent | null {
	let view = list;
	try {
		const current = list?.currentEntry;
		if (!settled && list && current?.url) {
			const base = basepath.replace(/\/$/, "");
			const raw = new URL(current.url).pathname;
			const path = base && raw.startsWith(base) ? raw.slice(base.length) || "/" : raw;
			// not written yet: look at the list as it will be, with the entry still called current as the one before
			if (!samePath(path, pathname)) view = { currentEntry: { url: null, index: current.index + 1 }, entries: () => list.entries() };
		}
	} catch {
		view = list;
	}
	const before = previousAppPath(basepath, view, origin);
	return before ? sectionOf(before) : null;
}

/**
 * The pages Figma draws a loading frame for (10 States: Home 2:1991, Deck 2:2305, Stock detail 2:2113). End of deck
 * 2:3422 has none, so /discover/end paints its receipt directly instead of borrowing the deck's skeleton (null: the live
 * rail and a blank column for the moment auth takes, like every other page without a loading frame). The 00 References
 * EXAMPLE layouts (?variant=example: the deck and the stock pages) have no loading frame either, so they never borrow
 * the product deck's or stock page's skeleton (or its Discover-highlighted rail).
 */
export function loadingFrameFor(pathname: string, example = false): "home" | "discover" | "stock" | null {
	if (example && (pathname.startsWith("/stocks/") || /^\/discover\/?$/.test(pathname))) return null;
	if (/^\/discover\/end\/?$/.test(pathname)) return null;
	if (pathname.startsWith("/discover")) return "discover";
	if (pathname.startsWith("/stocks/")) return "stock";
	if (pathname.startsWith("/home")) return "home";
	return null;
}

/**
 * Desktop frame (1024 and wider): sidebar (216 open / 72 closed) + content column that starts 40px (open) or 24px
 * (closed) after the sidebar, 88px from the top, with a 50px right margin — the geometry of every 1440 frame.
 * Opening and closing is the prototype's Smart Animate (Sidebar.tsx): the content column slides with the rail
 * (x 256 -> 96 in 2:8318 -> 2:8435) on the same 0.28 s Ease out, and keeps its width; only the header row widens.
 * `loading` (the session or the catalog is still on its way) draws the loading frames' skeleton rail where Figma has one.
 *
 * Below 1024 (SPEC section 2) the same pieces are rearranged, nothing new drawn: tablets keep Figma's closed rail
 * (always closed: the stored open / closed preference is a 1024+ setting) and its Show control opens the open sidebar
 * as a slide-in menu over the page; phones get a top bar (the Show glyph as the menu button, the sidebar's STAK logo)
 * opening the same menu. The menu always starts closed. Loading keeps the live rail / bar there: Figma draws its
 * skeleton rail open only.
 */
export function AppShell({ children, loading: pending = false }: { children: ReactNode; loading?: boolean }) {
	const [open, setOpen] = useState<boolean>(readNavOpen);
	const navigate = useNavigate();
	const location = useLocation();
	const pathname = location.pathname;
	const size = useSizeClass();
	const phone = size === "phone";
	const compact = phone || size === "tablet";
	// every parameter of the URL as the router parsed it (the capture overrides below are not part of any route's schema)
	const search = location.search as Record<string, unknown>;
	const forcedLoading = search.loading === 1 || search.loading === "1" || search.loading === true;
	const forced = search.nav === "closed" ? false : search.nav === "open" ? true : undefined;
	const navOpen = compact ? false : (forced ?? open);
	// an EXAMPLE layout (00 References): the deck and the stock pages; the end-of-deck receipt only carries the variant
	// back to the deck, and is the product frame 2:3422 (Discover highlighted) either way
	const example = search.variant === "example" && (pathname.startsWith("/stocks/") || /^\/discover\/?$/.test(pathname));
	// the loading frames draw the open rail; a person who keeps the rail closed keeps it while the page loads
	const skeleton = !compact && (forcedLoading || (pending && navOpen && loadingFrameFor(pathname, example) !== null));
	const railOpen = skeleton || navOpen;
	// the same "saved" the stock page reads: the person's saves, or the `?saved=1` preview of the saved look
	const live = useLive();
	const stock = /^\/stocks\/([^/]+)/.exec(pathname)?.[1];
	const myStakEntry = !!stock && myStakEntryLit(search, flag(search.saved) || live.savedTickers.has(normalizeTicker(decodeURIComponent(stock))));
	// the section the stock page's breadcrumb names: the same source (stocks/origin.ts, as its usePageOrigin reads it)
	// and the same rule as StockDetail's crumb, where a `from=my-stak` entry says My STAK whatever came before it (its
	// rail is decided by `myStakEntry` above: My STAK, Discover only on the unsaved ticket's preview address 2:5402)
	const basepath = useRouter().options.basepath ?? "/";
	const settled = useRouterState({ select: (s) => s.resolvedLocation?.state.__TSR_key === s.location.state.__TSR_key });
	// biome-ignore lint/correctness/useExhaustiveDependencies: read again when the router settles on the page (its entry is written by then)
	const origin = useMemo(() => (stock ? openedFromSection(pathname, basepath, settled) : null), [stock, pathname, basepath, settled]);
	const active = activeFromPath(pathname, myStakEntry, example, search.from === "my-stak" ? null : navKeyOf(origin));
	const current = example ? null : active;

	// a link that forces the rail (`?nav=closed` / `?nav=open`) sets it as shown, so the next page keeps the rail the
	// person was looking at instead of animating back to the stored state (a 1024+ setting: the compact rail stays closed)
	useEffect(() => {
		if (forced !== undefined && !compact) setOpen(forced);
	}, [forced, compact]);

	useEffect(() => {
		try {
			localStorage.setItem(NAV_KEY, open ? "1" : "0");
		} catch {
			/* storage unavailable */
		}
	}, [open]);

	// The Smart Animate runs only between Hide and Show (the prototype's only two reactions). Anything else that changes
	// the rail swaps it at once, as Figma swaps variants: a nav item becoming active (its 24px icon centred at x 24, the
	// 20px ones at x 26), the account row turning Active on Profile pages (children 1px in), a `?nav=` link. So the
	// transitions' duration (--stak-nav-dur, read by navTransition) is 280ms only while a toggle animates, 0 otherwise.
	const [animating, setAnimating] = useState(false);
	const settle = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(settle.current), []);

	// Hide -> "nav closed", Show -> "nav open". A `?nav=` capture override yields to the click: the parameter is dropped
	// (same page, no cross-fade, no scroll jump: resetScrollPosition false in both reactions) and the person's choice
	// is what persists.
	const toggle = useCallback(() => {
		setOpen(!navOpen);
		setAnimating(true);
		window.clearTimeout(settle.current);
		// a transition keeps its timing once started, so ending the window a little after 280ms cuts nothing short
		settle.current = window.setTimeout(() => setAnimating(false), NAV_MS + 60);
		if (forced === undefined) return;
		const { nav: _nav, ...rest } = search;
		navigate({ to: ".", search: rest as never, replace: true, resetScroll: false, viewTransition: false });
	}, [navOpen, forced, search, navigate]);

	// the compact menu: closed on every page it opens over, and whenever the window leaves the compact sizes. Leaving them
	// closes the dialog for real (NavDrawer stays mounted until its close event): focus lands on the rail's toggle.
	const [drawerOpen, setDrawerOpen] = useState(false);
	const openDrawer = useCallback(() => setDrawerOpen(true), []);
	const closeDrawer = useCallback(() => setDrawerOpen(false), []);
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new page closes the menu that led to it
	useEffect(() => {
		setDrawerOpen(false);
	}, [pathname]);

	const paddingLeft = phone ? PHONE_GUTTER : compact ? TABLET_GUTTER : railOpen ? 40 : 24;

	// 1024 and wider: at least the 1024 frame (a shorter window scrolls to the frame's bottom, the deck's buttons keep their
	// 116px below). Below 1024 nothing needs the 1024 frame: a phone is the window's height (a page that fits the window
	// does not scroll into blank space; svh: the height with the browser's toolbars shown), a tablet too, at least the
	// closed rail's own 448 (its nav ends at 324, the rule and the account row take the bottom 100).
	const minHeight = phone ? COMPACT_MIN_HEIGHT.phone : compact ? COMPACT_MIN_HEIGHT.tablet : fillHeight;
	return (
		<div
			className={cn(
				"stak-figma flex bg-[#0a1020] font-geist text-[#f2f6fc] antialiased",
				phone && "flex-col",
				animating ? "[--stak-nav-dur:280ms] motion-reduce:[--stak-nav-dur:0ms]" : "[--stak-nav-dur:0ms]",
			)}
			style={{ minHeight }}
			data-shell={compact ? size : undefined}
		>
			{phone ? (
				<PhoneTopBar expanded={drawerOpen} onMenu={openDrawer} />
			) : skeleton ? (
				<SidebarSkeleton active={activeFromPath(pathname) === "discover" ? "discover" : "home"} />
			) : (
				<Sidebar
					open={navOpen}
					active={active}
					current={current}
					onToggle={compact ? openDrawer : toggle}
					menu={compact ? { expanded: drawerOpen, controls: NAV_DRAWER_ID } : undefined}
				/>
			)}
			{/* relative: the EXAMPLE frames' 64px top bar (ExampleTopBar) is positioned against the content area */}
			<main className="relative min-w-0 flex-1">
				{/* the EXAMPLE frames' 64px top bar portals here (ExampleTopBar), above the page's own positioned wrappers */}
				<div id={EXAMPLE_TOPBAR_ID} className="pointer-events-none absolute inset-x-0 top-0 h-[64px]" />
				<div
					data-stak-content=""
					className="pr-[50px] pt-[88px] max-lg:pr-[24px] max-lg:pb-[32px] max-sm:pr-[16px] max-sm:pt-[16px]"
					style={{ paddingLeft, transition: compact ? undefined : navTransition("padding-left") }}
				>
					{children}
				</div>
			</main>
			{(compact || drawerOpen) && <NavDrawer open={drawerOpen && compact} onClose={closeDrawer} active={active} current={current} />}
		</div>
	);
}

/**
 * The phone shell's top bar: the sidebar's own pieces on one 64 row (#080d1a, the sidebar's fill), the Show glyph
 * ("Show · stroke 28" 2:7018) as the menu button at the 16 gutter and the STAK logo ("Group" 2:6695) 12 after it (the
 * nav rows' icon-to-label gap), both centred on the row's middle as the rail centres them on its header line (button
 * 33 + 14 = logo 36.4414 + 10.5586 = 47). It stays at the top of the window while the page scrolls, as the rail stays
 * beside it on wider windows (the ruling of 2026-10-30, Sidebar.tsx RailPin; styles.css keeps a scrolled-to element
 * clear of it); the logo is the mark only (no reaction in Figma), the page's own wordmark and Nav · Home lead Home.
 */
function PhoneTopBar({ expanded, onMenu }: { expanded: boolean; onMenu: () => void }) {
	// a notched phone's status bar area (index.html sets viewport-fit=cover): the bar's fill runs under it, its row below it.
	// Its own layer (z 30, the rail's): page content authored into the desktop's 88-px top band never covers the menu button,
	// and nothing of the page (the notifications panel is z 20) passes over the bar while it scrolls under it.
	return (
		<header className="sticky top-0 z-30 w-full shrink-0 bg-[#080d1a] pt-[env(safe-area-inset-top,0px)]" data-top-bar="">
			<div className="relative h-[64px]">
				<button
					type="button"
					aria-label="Show navigation"
					aria-expanded={expanded}
					aria-controls={NAV_DRAWER_ID}
					aria-haspopup="dialog"
					onClick={onMenu}
					// the rail's Show glyph takes the rail toggles' hover (the user's ruling of 2026-11-06; the coordinator's of 19:30
					// for this button): 4 % white in its 28 radius-6 box on a pointer that can hover, easing 160 ms, none under
					// reduced motion (Sidebar.tsx TOGGLE_HOVER / HOVER_FADE)
					className="absolute left-[16px] top-[18px] size-[28px] cursor-pointer rounded-[6px] pointer-fine:hover:bg-[rgba(255,255,255,0.04)] motion-reduce:[--stak-rail-hover:0ms]"
					style={{ transition: "background-color var(--stak-rail-hover, 160ms) ease" }}
				>
					<img alt="" src={A.navShow} width={28} height={28} className="absolute inset-0 size-full" />
				</button>
				<span aria-hidden="true" className="pointer-events-none absolute left-[56px] top-[21px] block h-[22px] w-[88px]">
					<FigmaFile src={A.logo} width={88} height={22} y={0.4414} className="absolute left-0 top-0" />
				</span>
			</div>
		</header>
	);
}

/**
 * The compact menu: Figma's open sidebar (216, every piece of it: logo, Hide, the nav, the rule, the account row) over
 * the sheets' scrim (rgba(0,0,0,.66)), sliding in from the left on the sidebar's own Smart Animate timing (280 ms,
 * cubic-bezier(0, 0, 0.58, 1); styles.css .stak-drawer, instant under reduced motion). A native modal <dialog>: the page
 * behind is inert and focus stays inside it, Esc / a click on the scrim / Hide / following any link close it, and focus
 * returns to the button that opened it. Its height is the window's (at least 448: the nav ends at 324, the bottom group
 * is 100 tall), scrolling inside itself on a shorter window.
 */
function NavDrawer({ open, onClose, active, current }: { open: boolean; onClose: () => void; active: NavKey; current: NavKey | null }) {
	const ref = useRef<HTMLDialogElement>(null);
	const opener = useRef<HTMLElement | null>(null);
	const close = useRef(onClose);
	close.current = onClose;

	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		if (open && !d.open) {
			// the control that had focus when the menu opened (a Chrome mouse click focuses the button). A tap on Safari /
			// iOS, a VoiceOver activation or a programmatic click opens it with nothing focused (activeElement = body): that is
			// NO opener, so the close falls back to the shell's live toggle below instead of "focusing" the body, a no-op
			// that left Esc / Hide / a followed link with focus nowhere (review round 2, WCAG 2.4.3).
			const active = document.activeElement;
			opener.current = active instanceof HTMLElement && active !== document.body && active !== document.documentElement ? active : null;
			try {
				d.showModal();
			} catch {
				d.setAttribute("open", "");
			}
		} else if (!open && d.open) {
			// a route change, or the window growing past 1023 (AppShell keeps this dialog mounted until it has closed)
			d.close();
		} else if (!open) {
			// nothing to close (it never opened): let AppShell drop a menu state that has no dialog behind it
			close.current();
		}
	}, [open]);

	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		// Esc (the dialog's own cancel -> close), Hide, the scrim and the links all end in "close": the state follows it,
		// and focus goes back to the opener (the browser restores it too; React may have re-rendered it meanwhile). When
		// there was no opener (nothing had focus when the menu opened) or it is gone or inert (the phone bar's button after
		// a resize to a tablet; the tablet rail's Show once the window is 1024+ and the rail opens), focus goes to the
		// shell's own nav toggle (the phone bar's menu button, or the rail's live Show / Hide) instead of dropping to the
		// page's body.
		const onNativeClose = () => {
			close.current();
			const back = opener.current;
			opener.current = null;
			const active = document.activeElement;
			if (active && active !== document.body && !d.contains(active)) return;
			const target =
				back?.isConnected && !back.closest("[inert]")
					? back
					: d.closest(".stak-figma")?.querySelector<HTMLElement>(":scope > aside button:not([inert]), :scope > header button");
			target?.focus({ preventScroll: true });
		};
		d.addEventListener("close", onNativeClose);
		return () => d.removeEventListener("close", onNativeClose);
	}, []);

	const onClick = (e: MouseEvent<HTMLDialogElement>) => {
		// the dialog's own box outside the panel is the scrim; a followed link closes the menu too
		if (e.target === e.currentTarget || (e.target instanceof Element && e.target.closest("a[href]"))) ref.current?.close();
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Esc closes the dialog natively; the click handler serves the scrim
		<dialog ref={ref} id={NAV_DRAWER_ID} aria-label="Navigation" className="stak-drawer" onClick={onClick}>
			<div className="stak-drawer-panel">
				<Sidebar open active={active} current={current} onToggle={() => ref.current?.close()} pinned={false} />
			</div>
		</dialog>
	);
}
