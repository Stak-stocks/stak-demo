import { Link } from "@tanstack/react-router";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { A } from "./assets";
import { type RailLabelHandlers, useRailLabels } from "./RailLabel";
import { useIdentity } from "./profile/identity";
import "./home/ink.css";

/** Figma "Desktop Sidebar · Nav (locked)" (set 2:6692, documented copy 2:7404): 6 sections × Open (216) / Closed (72). */
export type NavKey = "home" | "news" | "discover" | "mystak" | "simulate" | "profile";

const ITEMS: { key: Exclude<NavKey, "profile">; label: string; to: string }[] = [
	{ key: "home", label: "Home", to: "/home" },
	{ key: "news", label: "News", to: "/news" },
	{ key: "discover", label: "Discover", to: "/discover" },
	{ key: "mystak", label: "My STAK", to: "/my-stak" },
	{ key: "simulate", label: "Simulate", to: "/simulate" },
];

/**
 * The prototype's two reactions (section 2:8317): Hide (I2:8319;2:6711) -> "nav closed" 2:8435 and Show (I2:8436;2:7018)
 * -> "nav open" 2:8318, both ON_CLICK · SMART_ANIMATE · EASE_OUT · 0.28 s. Figma's Ease out is cubic-bezier(0, 0, 0.58, 1)
 * (the CSS `ease-out` keyword; Tailwind's `ease-out` is a different curve). Smart Animate interpolates every layer the two
 * variants share (boxes and positions) and fades the layers only one of them shows, so every piece below keeps both states
 * in the DOM and transitions between them. `--stak-nav-dur` (AppShell) drops to 0 for reduced motion.
 *
 * Those two toggles are the rail's only reactions. The sets (2:6692 / 2:7404 and the account row 2:7362 / 2:8070) hold
 * just the 6 sections x Open / Closed and Active / Inactive x Full / Rail, with no hover, pressed or focus variant. The
 * user's ruling of 2026-11-06 ("both, and the account row too") overrides that for the rail's interactive states only
 * (nothing changes at rest): on a pointer that can hover (`pointer-fine:hover:`, i.e. (pointer: fine) and
 * (hover: hover), so a tap never leaves a stuck highlight) an inactive nav row takes the active row's white at 4 % (the
 * active row keeps its 6 %, hovered or not), the account row its #141b2c with 4 % white over it, Hide / Show 4 % white in
 * their 28 radius-6 box, easing in 160 ms (the app's .stak-press timing; none under reduced motion: --stak-rail-hover);
 * and the closed rail names its icons beside them on hover and keyboard focus (RailLabel.tsx), as the open rail's Hide.
 * No press scale; keyboard focus keeps the app's focus ring. The nav items navigate instantly, as the phone's tab bar
 * swaps (1:1129-1:1132: SWAP, no transition), and the rail they land on is drawn at once: AppShell gives --stak-nav-dur
 * its 280ms only while Hide / Show animates, and a nav row's hover is an inset shadow, not its background, so the
 * active fill still swaps at once.
 */
export const NAV_EASE = "cubic-bezier(0, 0, 0.58, 1)";
/** The reactions' 0.28 s. */
export const NAV_MS = 280;
export const navTransition = (...props: string[]) => props.map((p) => `${p} var(--stak-nav-dur, ${NAV_MS}ms) ${NAV_EASE}`).join(", ");

/**
 * The hover highlights (the ruling of 2026-11-06, see above). They ease in and out over the app's .stak-press timing
 * (160ms ease); the <aside> sets --stak-rail-hover to 0ms under reduced motion (no transition). HOVER_FADE / NAV_ROW_FADE
 * join the inline transitions of the controls (an inline `transition` would override a class's).
 * A nav row's 4 % lies over the row as an inset shadow whose spread fills the whole radius-10 box, painted where its
 * background is: nothing of it exists at rest (no box, no paint). It is not the row's background because that is the
 * active fill, which must keep swapping at once when the page changes: a transition follows the after-change style, so
 * one on the inactive rows' background would fade the old row's 6 % out (measured in Chrome: 0.027 after 40 ms). Only
 * inactive rows carry the shadow and its transition, so the active row stays 6 % hovered or not, and a row that turns
 * active drops its hover at once (its transition list no longer names box-shadow).
 */
const HOVER_FADE = "background-color var(--stak-rail-hover, 160ms) ease";
const NAV_ROW_FADE = "box-shadow var(--stak-rail-hover, 160ms) ease";
const NAV_ROW_HOVER = "pointer-fine:hover:[box-shadow:inset_0_0_0_100px_rgba(255,255,255,0.04)]";
/** #141b2c with 4 % white over it (= #1d2434 on whole 8-bit channels); the Active row's inset ring stays on top. */
const ACCOUNT_HOVER = "pointer-fine:hover:bg-[color-mix(in_srgb,#141b2c_96%,#fff)]";
const TOGGLE_HOVER = "pointer-fine:hover:bg-[rgba(255,255,255,0.04)]";

const OPEN_W = 216;
const CLOSED_W = 72;

/**
 * The rail's own height: the nav ends at 324 and the bottom group (the rule and the account row) takes the bottom 100, so
 * below 448 the account row would sit on the nav (the compact shell and the drawer use the same floor).
 */
export const RAIL_MIN = 448;

/**
 * The rail stays where it is while the page scrolls (the user's ruling of 2026-10-30, from a UX review: "It should be
 * fixed, there's no need to allow it to be scrolled if there's not much data there"). Figma draws the rail as an
 * ordinary layer of every frame (numberOfFixedChildren 0), as tall as the frame (1024 on Home, 2050 on a News detail)
 * with its bottom group on the frame's bottom, so it used to scroll away with the page; now the <aside> still runs the
 * page's full height (its fill continues down the column), while this box, the window's height, sticks to the top of the
 * window: the logo, the toggle and the nav stay at Figma's top offsets and the rule and the account row stay 100 / 75 above
 * the WINDOW's bottom. The rail never scrolls; only a window shorter than its own 448 (a landscape phone's tablet rail)
 * lets it scroll inside itself, without a scrollbar, so the account row is never drawn over the nav. The drawer
 * (AppShell NavDrawer) is already a fixed layer over the page: its rail is not pinned (`pinned` false).
 */
const PIN_HEIGHT = "calc(100dvh / var(--stak-zoom, 1))";

export function RailPin({ pinned = true, children }: { pinned?: boolean; children: ReactNode }) {
	return (
		<div
			data-rail-pin={pinned ? "" : undefined}
			className={pinned ? "no-scrollbar sticky top-0 overflow-y-auto overflow-x-hidden bg-[#080d1a]" : "h-full"}
			style={pinned ? { height: PIN_HEIGHT } : undefined}
		>
			<div className="relative h-full" style={{ minHeight: RAIL_MIN }}>
				{children}
			</div>
		</div>
	);
}

/** Figma's exported SVG files as text, fetched once per file: FigmaFile draws them inline, as vectors. */
const fileMarkup = new Map<string, string>();
const fileLoads = new Map<string, Promise<string>>();

function loadFile(src: string): Promise<string> {
	let load = fileLoads.get(src);
	if (!load) {
		load = fetch(src)
			.then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${src}`))))
			.then((text) => {
				fileMarkup.set(src, text);
				return text;
			});
		fileLoads.set(src, load);
		// a failed load is tried again on the next mount; the <image> fallback stays meanwhile
		load.catch(() => fileLoads.delete(src));
	}
	return load;
}

function useFileMarkup(src: string): string | undefined {
	const [text, setText] = useState(() => fileMarkup.get(src));
	useEffect(() => {
		const cached = fileMarkup.get(src);
		if (cached) {
			setText(cached);
			return;
		}
		let alive = true;
		loadFile(src).then(
			(t) => alive && setText(t),
			() => {},
		);
		return () => {
			alive = false;
		};
	}, [src]);
	return text;
}

/**
 * Figma scopes the ids of an exported file (paint0_linear_0_75, filter0_f_0_80, mask0_…, clip0_…) to that file; inlined, every
 * file shares the page's one id space and a second file's `url(#paint0_linear_0_75)` would resolve to the first one in the
 * DOM. Each inlined file's ids are prefixed with its file name, and every reference to them (url(#…) in attributes and
 * <style> text, href / xlink:href) follows.
 */
function namespaceIds(root: Element, prefix: string): void {
	const rename = new Map<string, string>();
	for (const el of root.querySelectorAll("[id]")) {
		const id = el.getAttribute("id");
		if (id) rename.set(id, `${prefix}-${id}`);
	}
	if (rename.size === 0) return;
	const urls = (value: string) => value.replace(/url\(\s*(['"]?)#([^'")\s]+)\1\s*\)/g, (m, _q: string, id: string) => (rename.has(id) ? `url(#${rename.get(id)})` : m));
	for (const el of [root, ...root.querySelectorAll("*")]) {
		for (const attr of Array.from(el.attributes)) {
			const v = attr.value;
			if (attr.name === "id") {
				const to = rename.get(v);
				if (to) el.setAttribute("id", to);
			} else if ((attr.name === "href" || attr.name === "xlink:href") && v.startsWith("#")) {
				const to = rename.get(v.slice(1));
				if (to) el.setAttribute(attr.name, `#${to}`);
			} else if (v.includes("url(")) {
				const nv = urls(v);
				if (nv !== v) el.setAttribute(attr.name, nv);
			}
		}
	}
	for (const style of root.querySelectorAll("style")) if (style.textContent) style.textContent = urls(style.textContent);
}

/** The file's own markup with its root sized to the whole-pixel box and the layer's sub-pixel offset moved into the viewBox. */
function placeFile(src: string, text: string, x: number, y: number, width: number, height: number, boxW: number, boxH: number): string | null {
	const root = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
	if (root.nodeName !== "svg") return null;
	namespaceIds(root, src.replace(/^.*\//, "").replace(/\.svg$/i, "").replace(/[^A-Za-z0-9_-]/g, "_"));
	const vb = (root.getAttribute("viewBox") ?? `0 0 ${width} ${height}`).split(/[\s,]+/).map(Number);
	if (vb.length !== 4 || vb.some((v) => !Number.isFinite(v))) return null;
	const [vx, vy, vw, vh] = vb as [number, number, number, number];
	const sx = vw / width;
	const sy = vh / height;
	root.setAttribute("width", String(boxW));
	root.setAttribute("height", String(boxH));
	root.setAttribute("viewBox", `${vx - x * sx} ${vy - y * sy} ${boxW * sx} ${boxH * sy}`);
	root.setAttribute("preserveAspectRatio", "none");
	root.setAttribute("aria-hidden", "true");
	root.setAttribute("focusable", "false");
	root.setAttribute("style", "display:block;overflow:visible");
	return new XMLSerializer().serializeToString(root);
}

/**
 * Figma's own file, drawn where Figma draws it to the sub-pixel. An <img> is snapped to whole pixels, so a layer Figma
 * places at y .441 or .75 (the logo, the rule, the settings icon) lands up to half a pixel off; an SVG <image> keeps the
 * offset but Chrome rasterises the file first and resamples it (the 0.5px rule then lands on one row at a third of its
 * ink). The file's own markup drawn inline, its viewBox shifted by the layer's offset, paints exactly the vectors Figma
 * paints at Figma's position (the rule splits over the same two pixel rows at a quarter coverage each). The <image>
 * draws the same file until the markup has loaded. Nothing is redrawn: the markup is the downloaded file.
 */
export function FigmaFile({
	src,
	width,
	height,
	x = 0,
	y = 0,
	className,
	style,
}: { src: string; width: number; height: number; x?: number; y?: number; className?: string; style?: CSSProperties }) {
	const boxW = Math.ceil(x + width);
	const boxH = Math.ceil(y + height);
	const text = useFileMarkup(src);
	const markup = useMemo(() => (text ? placeFile(src, text, x, y, width, height, boxW, boxH) : null), [src, text, x, y, width, height, boxW, boxH]);
	if (markup)
		return (
			<span
				aria-hidden="true"
				className={cn("pointer-events-none block", className)}
				style={{ width: boxW, height: boxH, ...style }}
				// the markup is Figma's exported file, served from /public (no user input)
				dangerouslySetInnerHTML={{ __html: markup }}
			/>
		);
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			width={boxW}
			height={boxH}
			className={cn("pointer-events-none overflow-visible", className)}
			style={style}
		>
			<image href={src} x={x} y={y} width={width} height={height} />
		</svg>
	);
}

/**
 * `active` decides the highlight; `current` the item announced as the current page (aria-current). They differ only on
 * the stock EXAMPLE routes, whose frames instance the rail as Active=Home while the person is on a stock
 * stock page: there no item claims to be the current page (null).
 * `menu`: below 1024 the closed rail's Show opens the open sidebar as a modal menu (AppShell NavDrawer) instead of
 * widening the rail; the button then says whether that menu is open and which dialog it controls.
 * `pinned` (RailPin): the rail stays in the window while the page scrolls; false inside the drawer, itself fixed.
 */
type Props = {
	open: boolean;
	active: NavKey;
	current?: NavKey | null;
	onToggle: () => void;
	menu?: { expanded: boolean; controls: string };
	pinned?: boolean;
};

export function Sidebar({ open, active, current = active, onToggle, menu, pinned = true }: Props) {
	const hideRef = useRef<HTMLButtonElement>(null);
	const showRef = useRef<HTMLButtonElement>(null);
	const focusFollows = useRef(false);
	// the toggle that was used goes inert with its state; keyboard focus moves to the one that takes its place
	useEffect(() => {
		if (!focusFollows.current) return;
		focusFollows.current = false;
		(open ? hideRef : showRef).current?.focus({ preventScroll: true });
	}, [open]);
	const toggle = () => {
		focusFollows.current = document.activeElement === hideRef.current || document.activeElement === showRef.current;
		onToggle();
	};

	// The labels (RailLabel.tsx, the ruling of 2026-11-06): the closed rail names every icon (not while its menu covers it),
	// the account row by the name the open row shows; the open rail names its icon-only Hide. Null: no label in this state.
	const railRef = useRef<HTMLElement>(null);
	const account = useIdentity();
	const closed = !open && !menu?.expanded;
	const labels = useRailLabels(railRef, {
		hide: open ? "Hide navigation" : null,
		show: closed ? "Show navigation" : null,
		...Object.fromEntries(ITEMS.map((item) => [item.key, closed ? item.label : null])),
		account: closed ? account.name : null,
	});

	// The <aside> runs the page's full height (AppShell's row: at least the 1024 frame and the window), its fill down the
	// whole column; its pieces sit in RailPin, the window's height, which stays put while the page scrolls (the ruling of
	// 2026-10-30): the rule and the account row stay 100 / 75 px above the window's bottom. z-30 paints the
	// rail after the page: Chrome gives the pinned box its own compositing layer, and a page layer painted after it would
	// be assumed to overlap it and composited too, its text losing the subpixel antialiasing it has today (the
	// leaderboard's rows changed on every glyph); painted before it, the page stays in the root layer, as before.
	// The label (only while one shows) sits beside the <aside>, outside its clip and RailPin's.
	return (
		<>
			<aside
				ref={railRef}
				className="relative z-30 shrink-0 self-stretch overflow-clip bg-[#080d1a] motion-reduce:[--stak-rail-hover:0ms]"
				style={{ width: open ? OPEN_W : CLOSED_W, transition: navTransition("width") }}
				data-nav={open ? "open" : "closed"}
			>
				<RailPin pinned={pinned}>
					{/* "Frame 1618869277" (28,33 open / 22,33 closed). Its "Group" 2:6695 (the logo, 87.038x21.117 at y 36.4414) is hidden
					    in the closed variants: it slides with the frame and fades. It carries no reaction on either Figma page, so it is
					    the mark only, not a link (Nav · Home and the page's wordmark lead Home). */}
					<span
						aria-hidden="true"
						className="pointer-events-none absolute top-[36px] block h-[22px] w-[88px]"
						style={{ left: open ? 28 : 22, opacity: open ? 1 : 0, transition: navTransition("left", "opacity") }}
					>
						<FigmaFile src={A.logo} width={88} height={22} y={0.4414} className="absolute left-0 top-0" />
					</span>
					{/* "Hide · stroke 28" exists only in the open variants (161.038,33); it fades out with its frame (-6px) */}
					<button
						ref={hideRef}
						type="button"
						aria-label="Hide navigation"
						aria-expanded={true}
						inert={!open}
						onClick={toggle}
						{...labels.props("hide")}
						className={cn("absolute top-[33px] size-[28px] cursor-pointer rounded-[6px]", TOGGLE_HOVER, !open && "pointer-events-none")}
						style={{ left: open ? 161.038 : 155.038, opacity: open ? 1 : 0, transition: `${navTransition("left", "opacity")}, ${HOVER_FADE}` }}
					>
						<img alt="" src={A.navHide} width={28} height={28} className="absolute inset-0 size-full" />
					</button>
					{/* "Show · stroke 28" exists only in the closed variants (22,33); it fades in with its frame (28 -> 22) */}
					<button
						ref={showRef}
						type="button"
						aria-label="Show navigation"
						aria-expanded={menu ? menu.expanded : false}
						aria-controls={menu?.controls}
						aria-haspopup={menu ? "dialog" : undefined}
						inert={open}
						onClick={toggle}
						{...labels.props("show")}
						className={cn("absolute top-[33px] size-[28px] cursor-pointer rounded-[6px]", TOGGLE_HOVER, open && "pointer-events-none")}
						style={{ left: open ? 28 : 22, opacity: open ? 0 : 1, transition: `${navTransition("left", "opacity")}, ${HOVER_FADE}` }}
					>
						<img alt="" src={A.navShow} width={28} height={28} className="absolute inset-0 size-full" />
					</button>

					<nav aria-label="Main">
						{ITEMS.map((item, i) => (
							<NavItem
								key={item.key}
								item={item}
								top={92 + i * 48}
								open={open}
								active={active}
								current={current}
								label={labels.props(item.key)}
							/>
						))}
					</nav>

					{/* "Frame 1618869266" sits on the frame's bottom (constraint MAX): "Vector 87" at 1024 - 100 and the account row
					    25 below it; here on the bottom of the window-tall RailPin. Figma paints the 0.5px rule over two pixel rows
					    (923.75-924.25); its file drawn half a pixel down spreads over the same two rows (as an <img> it would fill one).
					    The closed rail clips the 216 line to 72. */}
					<NavRule />
					<AccountRow open={open} active={active === "profile"} label={labels.props("account")} />
				</RailPin>
			</aside>
			{labels.layer}
		</>
	);
}

/**
 * "Nav · <section>": 184x40 (open, padding 12) / 40x40 (closed, padding 8, centred), radius 10, 6% white when active.
 * The active row draws its 24px filled icon and a Geist SemiBold 16 #D9D9D9 label; the others a 20px outline icon and
 * Geist Medium 13 #AEAEAE. The label keeps its x (12 + icon + 12) and fades; the icon slides to the rail's centre.
 * Hovered by a fine pointer, an inactive row takes 4 % white over itself (NAV_ROW_HOVER, an inset shadow; the ruling of
 * 2026-11-06); `label` carries the closed rail's name label (RailLabel.tsx).
 */
function NavItem({
	item,
	top,
	open,
	active,
	current,
	label,
}: { item: (typeof ITEMS)[number]; top: number; open: boolean; active: NavKey; current: NavKey | null; label: RailLabelHandlers }) {
	const isActive = item.key === active;
	// Profile frames (2:2476, 2:2555, 2:2760) override the Home row: no fill, a 24px outline icon, Geist SemiBold 13 #AEAEAE
	const onProfile = active === "profile" && item.key === "home";
	const size = isActive || onProfile ? 24 : 20;
	const icon = isActive ? A.nav[item.key].on : onProfile ? A.nav.home.profile : A.nav[item.key].off;
	return (
		<Link
			to={item.to}
			viewTransition={false}
			// the highlight (and its aria-current) is the rail's own rule; TanStack adds aria-current="page" to any link its
			// matcher finds active (path prefix + partial search), which on a stock EXAMPLE page (Home highlighted)
			// could announce another item too. Exact matching keeps its automatic state to the one URL where it
			// always coincides with the highlight.
			activeOptions={{ exact: true }}
			aria-current={item.key === current ? "page" : undefined}
			{...label}
			className={cn(
				"absolute left-[16px] block h-[40px] cursor-pointer overflow-clip rounded-[10px]",
				isActive ? "bg-[rgba(255,255,255,0.06)]" : NAV_ROW_HOVER,
			)}
			style={{ top, width: open ? 184 : 40, transition: isActive ? navTransition("width") : `${navTransition("width")}, ${NAV_ROW_FADE}` }}
		>
			<img
				alt=""
				src={icon}
				width={size}
				height={size}
				className="absolute"
				style={{ left: open ? 12 : (40 - size) / 2, top: (40 - size) / 2, width: size, height: size, transition: navTransition("left") }}
			/>
			<span
				className="absolute inset-y-0 left-0 flex w-[184px] items-center"
				style={{ paddingLeft: 12 + size + 12, opacity: open ? 1 : 0, transition: navTransition("opacity") }}
			>
				<span
					className={cn(
						"stak-ink whitespace-nowrap font-geist",
						isActive
							? "text-[16px] font-semibold leading-[21px] text-[#d9d9d9] [--ink:#d9d9d9]"
							: onProfile
								? "text-[13px] font-semibold leading-[17px] text-[#aeaeae] [--ink:#aeaeae]"
								: "text-[13px] font-medium leading-[17px] text-[#aeaeae] [--ink:#aeaeae]",
					)}
				>
					{item.label}
				</span>
			</span>
		</Link>
	);
}

/**
 * "Sidebar · Account row" (set 2:7362, documented copy 2:8070): Full 184x48 (padding 12, gap 12) / Rail 40x48
 * (padding 6, centred), #141B2C, radius 10. Active (Profile pages) adds a 1px #242F4B stroke inside that Figma counts in
 * the layout: the Full row's children sit 1px further right. The name column hugs Figma's 92px (long names truncate
 * inside it); the Rail variant hides the column and the settings icon, so they fade while the avatar slides to the
 * rail's centre. Its accessible name starts with the visible name ("Hamza, Profile"), so a speech user who says the
 * name they see reaches it (WCAG 2.5.3). Hovered by a fine pointer its fill takes 4 % white (ACCOUNT_HOVER, the ruling of
 * 2026-11-06) under the Active ring; on the closed rail `label` shows that visible name beside it (RailLabel.tsx).
 * The photo and the handle the person chose (Edit profile, onboarding's Add a photo: profile/identity.ts) replace the
 * initial and the "@" line, as both phones show them wherever the avatar and the handle are; with neither, the row
 * shows the initial and the person's own handle ("@hamza"), and the frames' "@" line (2:7369, an email address) only
 * while the showcase is untouched (useAccountDisplay.ts sidebarLineOf; the hunt's VIS-05).
 */
function AccountRow({ open, active, label }: { open: boolean; active: boolean; label: RailLabelHandlers }) {
	const account = useIdentity();
	const inset = active ? 1 : 0;
	return (
		<Link
			to="/profile"
			viewTransition={false}
			aria-label={`${account.name}, Profile`}
			aria-current={active ? "page" : undefined}
			{...label}
			className={cn(
				"absolute bottom-[27px] left-[16px] block h-[48px] cursor-pointer overflow-clip rounded-[10px] bg-[#141b2c]",
				ACCOUNT_HOVER,
				active && "shadow-[inset_0_0_0_1px_#242f4b]",
			)}
			style={{ width: open ? 184 : 40, transition: `${navTransition("width")}, ${HOVER_FADE}` }}
		>
			{/* the 0.778px #242F4B stroke sits OUTSIDE the 28px circle in Figma: a ring, not a border. The "H" text box hugs its
			    glyph rounded up to a whole pixel (8x12 for "H"), and the circle's auto layout centres that box (x 10, y 8) with the
			    glyph left-aligned in it: the box takes the same rounded width here, so the glyph starts where Figma's does. */}
			<span
				className="absolute top-[10px] flex size-[28px] items-center justify-center rounded-[14px] bg-[#242b3d] shadow-[0_0_0_0.778px_#242f4b]"
				style={{ left: open ? 12 + inset : 6, transition: navTransition("left") }}
			>
				{account.photo ? (
					<img alt="" src={account.photo} width={28} height={28} draggable={false} className="size-full rounded-[14px] object-cover" />
				) : (
					<span
						className="whitespace-nowrap font-sora text-[9.625px] font-semibold leading-[12px] text-[#9eadc7]"
						style={{ width: "calc-size(max-content, round(up, size, 1px))" }}
					>
						{account.initial}
					</span>
				)}
			</span>
			<span
				className="absolute top-[9.5px] flex w-[92px] flex-col items-start gap-px overflow-clip whitespace-nowrap"
				style={{ left: 52 + inset, opacity: open ? 1 : 0, transition: navTransition("opacity") }}
			>
				<span className="stak-ink max-w-full truncate font-geist text-[13px] font-semibold leading-[17px] text-[#d9d9d9] [--ink:#d9d9d9]">{account.name}</span>
				<span className="stak-ink max-w-full truncate font-geist text-[8.5px] leading-[11px] text-[#819abb] [--ink:#819abb]">{account.sidebarLine}</span>
			</span>
			{/* "settings" 17x17 at x 156, y 15.5. The Rail variants keep this layer and the name column hidden (2:8108 / 2:8098,
			    visible false), and Smart Animate pairs only visible layers, so both dissolve where they stand while the row
			    narrows over them (the row clips). */}
			<FigmaFile
				src={A.settings}
				width={17}
				height={17}
				y={0.5}
				className="absolute top-[15px]"
				style={{ left: 156 + inset, opacity: open ? 1 : 0, transition: navTransition("opacity") }}
			/>
		</Link>
	);
}

/**
 * "Vector 87" (2:6743 / skeleton 2:2010), shared with the loading frames' rail: a 0.5px stroke centred on y 924 (1024 - 100),
 * render bounds 923.75-924.25. Its exported file is a 216x1 canvas with the line's centre at 0.25, so the canvas starts at
 * 923.75: 0.75 into a two-pixel box at 923. The closed rail (72) clips the 216 line, as Figma's 72-wide variant draws it.
 */
export function NavRule() {
	return <FigmaFile src={A.navRule} width={216} height={1} y={0.75} className="absolute bottom-[99px] left-0" />;
}
