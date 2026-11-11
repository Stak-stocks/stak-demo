import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import {
	type ButtonHTMLAttributes,
	type CSSProperties,
	type InputHTMLAttributes,
	type ReactNode,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";
import { fillHeight, useCanvasSize, useRasterDensity } from "@/app/FitCanvas";
import { warmCatalog } from "@/app/live/catalog";
import { FIGMA_BASELINE, LIGHT_INK } from "@/app/ui/Button";
// `stak-ink`: light text on the dark ground drawn at Figma's stroke weight (the method Home, the page header and the
// canon buttons use: the text is painted in its inverse colour and inverted back, so Chrome rasterises it with its
// dark-text table; colour, size, weight and opacity unchanged). Measured on Sign in 2026-10-18: the frames' light texts
// painted 1.08-1.39x Figma's ink without it.
import "@/app/home/ink.css";
import { AU } from "./assets";
import { DISSOLVE, PUSH_BACK, type ViewTransition } from "./motion";
import { backWithMotion } from "@/app/onboarding/motion";
import "./responsive.css";

declare module "@tanstack/history" {
	interface HistoryState {
		authPreviousPath?: string;
	}
}

/**
 * Interaction: none of the auth frames' controls has a hover or pressed look in Figma (the social buttons, Back, Show
 * and the text links are plain frames and text layers: no component, no variant, no "change to" reaction on the desktop
 * frames or their phone twins, read 2026-10-18), so none answers the pointer with a change of look (the ruling the
 * canon buttons, Home, the sidebar, Discover and Portfolio follow). Each keeps the pointer cursor and the canvas's
 * keyboard focus ring (2px #69b3ca, 2px out, styles.css).
 */
const CONTROL = "cursor-pointer";

/** The frames' text colours drawn with `stak-ink` (Home's ink.css): each names the colour Figma gives the text. */
export const AUTH_INK = {
	white: "stak-ink [--ink:#ffffff]",
	heading: "stak-ink [--ink:#f2f6fc]",
	tagline: "stak-ink [--ink:#cbcccc]",
	muted: "stak-ink [--ink:#819abb]",
	accent: "stak-ink [--ink:#a6e4f7]",
} as const;

/**
 * The auth frames clip their form (Figma's "Form" frame: the button glow stops at its 440 edges) and their foot rows.
 * A control's keyboard ring (the app's 2px #69b3ca, 2px out) would be cut there, so while one shows it the clip
 * reaches the ring's 4px further; the unfocused page keeps Figma's clip.
 */
const RING_ROOM = "has-[:focus-visible]:[overflow-clip-margin:4px]";

/** The social row's width in the frame: the 440 button. */
const SOCIAL_WIDTH = 440;

/**
 * Below 1024 the mark's half-pixel nudge is measured, not assumed. There the button is the column's width (343 on a
 * 375 phone, not 440) and the form sits wherever the window puts it (x 164.5 in a 769 window, 523.75 beside the
 * 1000-wide narrowed panel), so the row's x can end in .5, .25 or nothing at all whatever the label's parity says.
 * Chrome snaps the mark's box to the device pixel nearest the row's x, round(x · dpr) / dpr; the nudge is the
 * distance back to x, so the mark lands exactly where the row puts it at any width and screen density: 0 on a whole
 * device pixel, -0.5 on a 1x screen's half pixel (the 1440 frame's Apple mark), 0 for the same half pixel on a 2x
 * phone, which draws it exactly. Null from 1024 up, where the frame's own parity rule below stays as approved.
 */
function useMarkNudge(row: RefObject<HTMLElement | null>): number | null {
	const { compact, layoutWidth } = useCanvasSize();
	const density = useRasterDensity();
	const [nudge, setNudge] = useState<number | null>(null);
	useLayoutEffect(() => {
		const el = row.current;
		if (!compact || !el) {
			setNudge(null);
			return;
		}
		const x = el.getBoundingClientRect().left;
		// layout positions are 1/64 px: drop the float noise of the division
		const n = Math.round((x - Math.round(x * density) / density) * 64) / 64;
		setNudge(n);
	}, [compact, layoutWidth, density, row]);
	return nudge;
}

/**
 * "Social · Continue with …" (2:5679 / 2:5683): 440x48 r12 #181f30, clipping, a centred row of the 18px mark (image
 * FIT) + 10 gap + the label (Geist Medium 14 / auto, white). `labelWidth` is the label's Figma text box (142 Google,
 * 133 Apple), so the centred row lands where the frame puts it. An odd row (Apple: 18 + 10 + 133 = 161) starts on a
 * half pixel (939.5); Chrome snaps the mark's box to the whole pixel, so the mark is drawn back on the half pixel with
 * a translate, blended across two columns as Figma draws it. Below 1024 the same nudge is measured from the row's
 * rendered position (useMarkNudge). The white label is drawn with the canon's LIGHT_INK, as the primary buttons'
 * labels on the same screens are, so Chrome rasterises it at Figma's stroke weight.
 * Disabled (while a sign-in runs): the canon's 60% and default cursor.
 */
export function SocialButton({
	icon,
	labelWidth,
	children,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; labelWidth?: number }) {
	const half = labelWidth !== undefined && (SOCIAL_WIDTH - (18 + 10 + labelWidth)) % 2 !== 0;
	const row = useRef<HTMLSpanElement>(null);
	const nudge = useMarkNudge(row);
	return (
		<button
			type="button"
			{...props}
			className={cn(
				CONTROL,
				"flex h-[48px] w-full items-center justify-center overflow-clip rounded-[12px] bg-[#181f30] disabled:cursor-default disabled:opacity-60",
			)}
		>
			<span ref={row} className="flex items-center gap-[10px]">
				<img
					alt=""
					src={icon}
					className={cn("size-[18px] object-contain", nudge === null && half && "translate-x-[-0.5px]")}
					style={nudge ? { translate: `${nudge}px 0` } : undefined}
					width={18}
					height={18}
				/>
				<span
					className={cn("whitespace-nowrap text-left font-geist text-[14px] font-medium leading-[18px] text-white", LIGHT_INK)}
					style={{ width: labelWidth }}
				>
					{children}
				</span>
			</span>
		</button>
	);
}

/**
 * The "or" row: two 190x1 rules (white 10%) and the 11x14 "or" (Geist 11 #819abb), 12 apart. The 16-high row centres the
 * 1px rules on a half pixel (7.5 down, 492.5 in the frames). Chrome would snap a box there to a whole pixel, so each
 * rule sits on the whole pixel below (8 down) and a translate lifts it the half pixel: two soft rows, as Figma draws
 * them, not one hard one.
 */
export function OrDivider() {
	const rule = "mt-[8px] h-px w-[190px] shrink-0 self-start translate-y-[-0.5px] bg-[rgba(255,255,255,0.1)] max-lg:min-w-0 max-lg:w-auto max-lg:flex-1";
	return (
		<div className="flex h-[16px] w-full items-center gap-[12px] overflow-clip">
			<div className={rule} />
			<span className={cn("w-[11px] shrink-0 whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]", AUTH_INK.muted)}>or</span>
			<div className={rule} />
		</div>
	);
}

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & { right?: ReactNode; invalid?: boolean };

/**
 * The trailing control's room in the field: the "Show" text box (29) and the 12 that separate it from the text column,
 * on top of the field's 16 right padding (2:5694: padding 0 / 16, SPACE_BETWEEN, Show at 395 of 440).
 */
const TRAILING_ROOM = 16 + 12 + 29;

/**
 * The typed text and the placeholder on Figma's baseline. The placeholder's box sits on a half pixel (the field's top
 * + 15.5), and Figma puts a text's baseline a whole number of pixels below its box top (FIGMA_BASELINE in the canon):
 * a half-pixel baseline, which Chrome draws on the lower of the two rows, as it draws the canon labels. On the zoomed
 * canvas below 1440 the term keeps the placeholder on the row nearest Figma's (1280x800: 0.67 device px low without it,
 * 0.33 high with it). `--stak-dpx` is the app's layout pixel (styles.css's plain-text rule sets it on plain text only).
 */
const INPUT_BASELINE = cn("relative [--stak-dpx:calc(1px/var(--stak-zoom,1))]", FIGMA_BASELINE);

/**
 * "Input · …": 48h r12 #181f30, Geist 13 placeholder #819abb, optional trailing control; a red hairline when invalid.
 * Focus draws the app's focus ring (2px #69b3ca) on the field's own rounded box, inside it (the 440 form clips its
 * edges), instead of around the bare text line. A browser-autofilled address keeps the field's #181f30 and the typed
 * text's #f2f6fc (Chrome otherwise paints its own autofill fill over the field's inner box).
 * The trailing control ("Show") sits beside the label, not inside it: a button is a labelable element of its own, so
 * inside the label it was invalid HTML and lent the field its name ("Show password"). The field is named by its
 * placeholder, Figma's text ("Email address", "Password" …); the toggle keeps its place at the right edge.
 */
export function AuthInput({ right, className, invalid, ...props }: AuthInputProps) {
	return (
		<div className={cn("relative w-full", className)}>
			<label
				className={cn(
					"flex h-[48px] w-full items-center overflow-clip rounded-[12px] bg-[#181f30] px-[16px]",
					"has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-[#69b3ca]",
					invalid && "shadow-[inset_0_0_0_1px_#e5484d]",
				)}
				style={right ? { paddingRight: TRAILING_ROOM } : undefined}
			>
				<input
					style={{ outline: "none" }}
					aria-label={props.placeholder}
					{...props}
					aria-invalid={invalid || undefined}
					className={cn(
						"min-w-0 flex-1 bg-transparent font-geist text-[13px] leading-[17px] text-[#f2f6fc] outline-none placeholder:text-[#819abb]",
						"autofill:shadow-[inset_0_0_0_1000px_#181f30] autofill:[-webkit-text-fill-color:#f2f6fc] autofill:[caret-color:#f2f6fc]",
						INPUT_BASELINE,
					)}
				/>
			</label>
			{/* the strip the toggle sits in passes clicks through to the field; only the toggle itself takes them */}
			{right ? <div className="pointer-events-none absolute inset-y-0 right-[16px] flex items-center [&>*]:pointer-events-auto">{right}</div> : null}
		</div>
	);
}

/** The line under a field that explains what to fix (Geist 12, the product's red). */
export function FieldError({ children }: { children: ReactNode }) {
	if (!children) return null;
	return (
		<p role="alert" className="w-full font-geist text-[12px] leading-[16px] text-[#e5484d]">
			{children}
		</p>
	);
}

export function AuthRedirectError({ error, onRetry }: { error: string | null; onRetry: () => void }) {
	if (!error) return null;
	return (
		<div className="flex w-full flex-col items-start gap-[14px]">
			<FieldError>{error}</FieldError>
			<button type="button" onClick={onRetry} className={cn(CONTROL, "font-geist text-[12px] font-medium text-[#a6e4f7]")}>
				Try again
			</button>
		</div>
	);
}

/**
 * "Show" (2:5696: Geist Medium 11 / auto #a6e4f7, the frame's 29x14 text box at 395 / 17 of the 440x48 field), passed
 * to AuthInput's `right`, which places it 16 from the field's right edge, centred.
 * Its target is the 29 x 14 word at every size, as the frame draws it: a click or tap beside the word lands on the
 * field and focuses it, as at 1440 (SPEC R8: controls keep Figma's sizes and targets under 44 x 44 are reported, not
 * enlarged; R10: interactions as at 1440). `data-auth-show` is the toggle's stable hook for the review probes.
 */
export function ShowToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-label={shown ? "Hide password" : "Show password"}
			data-auth-show=""
			className={cn(CONTROL, "flex shrink-0 rounded-[4px]")}
		>
			<span className={cn("w-[29px] whitespace-nowrap text-left font-geist text-[11px] font-medium leading-[14px] text-[#a6e4f7]", AUTH_INK.accent)}>
				{shown ? "Hide" : "Show"}
			</span>
		</button>
	);
}

/**
 * A text link in the frames' accent (Geist Medium 12/16 #a6e4f7): "Forgot password?", "Create account", "Sign in".
 * The words sit in their own text box (`width` = the Figma box) so they take the shared baseline rule like plain text.
 */
export function TextLink({
	to,
	search,
	viewTransition,
	width,
	className,
	children,
}: {
	to: string;
	search?: Record<string, unknown>;
	viewTransition?: ViewTransition | false;
	width?: number;
	className?: string;
	children: ReactNode;
}) {
	const pathname = useLocation({ select: (location) => location.pathname });
	return (
		<Link
			to={to}
			search={search as never}
			viewTransition={viewTransition}
			state={(previous) => ({ ...previous, authPreviousPath: pathname })}
			className={cn(CONTROL, "flex shrink-0 rounded-[4px]", className)}
		>
			<span className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#a6e4f7]", AUTH_INK.accent)} style={{ width }}>
				{children}
			</span>
		</Link>
	);
}

/**
 * "Remembered it?  Sign in": the 12px row of muted copy + accent link, 6 apart. `textWidth` / `linkWidth` are the
 * frame's text boxes, so the centred row sits where the frame puts it. A link to a sibling auth screen dissolves
 * (the prototype's Sign up <-> Sign in links); `onClick` makes it an action (Resend link).
 * The row clips like its Figma frame; while its link shows the keyboard ring (2px, 2px out) the clip reaches 4px
 * further so the ring is drawn whole.
 */
export function FootRow({
	text,
	linkLabel,
	to,
	onClick,
	textWidth,
	linkWidth,
	viewTransition = DISSOLVE,
}: {
	text: string;
	linkLabel: string;
	to?: string;
	onClick?: () => void;
	textWidth?: number;
	linkWidth?: number;
	viewTransition?: ViewTransition | false;
}) {
	return (
		<div className={cn("flex items-start gap-[6px] overflow-clip whitespace-nowrap max-lg:max-w-full max-lg:flex-wrap max-lg:justify-center max-lg:whitespace-normal", RING_ROOM)}>
			<span className={cn("shrink-0 font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:max-w-full max-lg:whitespace-normal", AUTH_INK.muted)} style={{ width: textWidth }}>
				{text}
			</span>
			{to ? (
				<TextLink to={to} width={linkWidth} viewTransition={viewTransition}>
					{linkLabel}
				</TextLink>
			) : (
				<button type="button" onClick={onClick} className={cn(CONTROL, "flex shrink-0 rounded-[4px]")}>
					<span
						className={cn("whitespace-nowrap text-left font-geist text-[12px] font-medium leading-[16px] text-[#a6e4f7]", AUTH_INK.accent)}
						style={{ width: linkWidth }}
					>
						{linkLabel}
					</span>
				</button>
			)}
		</div>
	);
}

/**
 * 40px round back control (#192238) with the 22px chevron, history-based: the My STAK collection page uses it
 * (Back returns to where the person came from, else `fallbackTo`).
 */
export function BackButton({
	className,
	style,
	fallbackTo = "/splash",
}: { className?: string; style?: CSSProperties; fallbackTo?: string }) {
	const navigate = useNavigate();
	return (
		<button
			type="button"
			aria-label="Back"
			style={style}
			onClick={() => {
				if (window.history.length > 1) window.history.back();
				else navigate({ to: fallbackTo });
			}}
			className={cn(CONTROL, "flex size-[40px] items-center justify-center overflow-clip rounded-[20px] bg-[#192238]", className)}
		>
			<img alt="" src={AU.back} className="size-[22px]" width={22} height={22} />
		</button>
	);
}

/**
 * The auth frames' "Back" (2:5707: 627/63, 40x40 r20 #192238, clipping, the 22px chevron frame centred): it goes where
 * the prototype wires it, with the prototype's PUSH RIGHT 0.3 s, whatever page the person came from.
 */
export function AuthBackButton({ to, search, className, onBack, viewTransition = PUSH_BACK }: { to: string; search?: Record<string, unknown>; className?: string; onBack?: () => void; viewTransition?: ViewTransition | false }) {
	const navigate = useNavigate();
	const router = useRouter();
	return (
		<button
			type="button"
			aria-label="Back"
			// below 1024 responsive.css stands it over the form column's left edge, keeping Figma's 63 from the top
			data-auth-back=""
			onClick={() => {
				if (onBack) onBack();
				else if (router.history.canGoBack() && router.history.location.state.authPreviousPath === to) {
					if (viewTransition) backWithMotion(router, viewTransition);
					else router.history.back();
				} else navigate({ to, search: search as never, viewTransition, replace: true });
			}}
			className={cn(CONTROL, "flex size-[40px] items-center justify-center overflow-clip rounded-[20px] bg-[#192238]", className)}
		>
			<img alt="" src={AU.back} className="size-[22px]" width={22} height={22} />
		</button>
	);
}

// ── Validation and error copy shared by the auth forms ────────────────────────────────────────

export const PASSWORD_MIN = 8;

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

/** The rule the reset frame states: "At least 8 characters, with a number." */
export function passwordProblem(p: string): string | null {
	if (p.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
	if (!/\d/.test(p)) return "Add at least one number";
	return null;
}

/** Firebase error codes in plain words; the fallback is the form's own sentence. */
export function authErrorMessage(error: unknown, fallback: string): string {
	const code = ((error as { code?: string })?.code ?? (error instanceof Error ? error.message : "")) as string;
	if (code.includes("invalid-credential") || code.includes("user-not-found") || code.includes("wrong-password")) return "Wrong email or password";
	if (code.includes("email-already-in-use")) return "That email is already registered";
	if (code.includes("invalid-email")) return "That email address does not look right";
	if (code.includes("weak-password")) return `Use at least ${PASSWORD_MIN} characters`;
	if (code.includes("too-many-requests")) return "Too many attempts. Try again in a few minutes";
	if (code.includes("network-request-failed")) return "No connection. Check your network and try again";
	if (code.includes("user-disabled")) return "This account has been disabled";
	if (code.includes("expired-action-code") || code.includes("invalid-action-code")) return "This link has expired. Request a new one";
	return fallback;
}

/** The frames' "Brand panel": FIXED 600 wide, pinned LEFT / TOP (2:5665, 2:5620, 2:1258, 2:1567, 2:1284). */
const PANEL = 600;

/**
 * Where the brand panel is drawn: from 951 (responsive.css shows it narrowed at 951-1023; from 1024 it is the frame's
 * 600). Below 951 it gives way (display: none), and an <img> under display: none is still downloaded, so the panel's
 * 2048 px glass (2.7 MB) is only mounted where the panel shows: phones and portrait tablets never fetch it for
 * nothing. `min-width` is the same window width as the CSS's range (951px <= width).
 */
const PANEL_MEDIA = "(min-width: 951px)";
const panelShows = () => typeof window === "undefined" || typeof window.matchMedia !== "function" || window.matchMedia(PANEL_MEDIA).matches;
function subscribePanel(onChange: () => void) {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
	const media = window.matchMedia(PANEL_MEDIA);
	media.addEventListener("change", onChange);
	return () => media.removeEventListener("change", onChange);
}

/**
 * Two-panel auth frame (1440x1024): the "Brand panel" 600 wide (#060c1d) with the tilted glass icon bleeding off its
 * top-left corner and the tagline (82 / vertically centred), Back at 627/63, and the 440-wide form column at 790
 * (10px padding) whose top is the frame's own value.
 * Bigger windows: the brand panel keeps its fixed 600 width at the left edge (sizeH FIXED, LEFT, like the sidebar) and
 * runs the full height; inside it each layer keeps its Figma constraint: the glass is CENTER/CENTER (same place across,
 * still bleeding off the left edge; it keeps its offset from the panel's centre, so it stays just above the tagline) and
 * the tagline LEFT 82 / CENTER. The form area is the rest of the window: Back stays 27 right of the panel at the top,
 * and the form stays centred in the area (where the frame centres it) inside the frame's 1024 band, centred
 * vertically. Laptops (1024-1439): FitCanvas scales the 1440 frame down. Below 1024 (phones, tablets) responsive.css
 * reflows it: the form fills the column (440 at most) and keeps the frame's vertical constraint (its authored top in
 * the 1024 band, the band centred in the window: `--auth-form-top`), or follows Back where the window is too short, so
 * a validation message pushes only what is below it, as at 1440; Back keeps its 63 from the top over the form column's
 * left edge; the brand panel narrows beside the form where its tagline still fits on one line (951-1023) and gives way
 * below that. The panel's layers sit in `data-auth-panel-pin`: from 1024 a box as big as the panel (the frame's
 * constraints, unchanged); at 951-1023 a window-tall box stuck to the window's top, so the glass and the tagline keep
 * their CENTER constraints on the window and stay still across the screens, their dissolves and a validation message,
 * as the 1024-tall frames keep them, instead of re-centring on each page's own height.
 * The root is its own compositing layer (`will-change: transform`): Chrome on Windows draws text in the page's opaque
 * root layer with coloured sub-pixel (LCD) edges, heavier than Figma's grayscale text; in this layer all of it is
 * grayscale, as Figma draws it.
 */
export function AuthLayout({
	formTop,
	backTo,
	backSearch,
	backTransition,
	onBack,
	children,
}: {
	formTop: number;
	backTo: string;
	backSearch?: Record<string, unknown>;
	backTransition?: ViewTransition | false;
	onBack?: () => void;
	children: ReactNode;
}) {
	// the app's catalog chunk starts downloading while the person signs in, so /home is ready when they land
	useEffect(warmCatalog, []);
	const panelShown = useSyncExternalStore(subscribePanel, panelShows, () => true);
	const BAND = "var(--stak-band, 0px)";
	return (
		<div data-auth-layout="" className="stak-figma relative w-full overflow-clip bg-[#0a1020] font-geist antialiased will-change-transform" style={{ minHeight: fillHeight }}>
			<aside data-auth-panel="" className="absolute inset-y-0 left-0 overflow-clip bg-[#060c1d] max-lg:hidden" style={{ width: PANEL }}>
				{/* the box the layers' constraints refer to: the whole panel from 1024 (the frame's), the window at 951-1023
				    (responsive.css: sticky, window-tall) */}
				<div data-auth-panel-pin="" className="absolute inset-0">
					{/* 2:5666 "Glass_icon_with_tilt_2K…": 702.892 square, 40%, rotated -48.4343° in Figma (counter-clockwise, so CSS
					    turns it 48.4343° clockwise); its 992.254 box (-305 / -391 in the panel) is centred 108.873 left of and
					    406.873 above the panel's centre (CENTER/CENTER). The image's CROP offset (0.55% / 0.49%) is a translate, not
					    left/top, so Chrome does not snap it to whole pixels before rotating (that put the glass 0.7px off). Chrome
					    samples this 2048 px image, drawn 702.892 wide and rotated, a quarter pixel down-right of where Figma's
					    renderer does: the (-0.25px, -0.25px) transform lines the two up (measured 2026-10-18 against Figma's render
					    of 2:5664 over the panel's top 600x460: mean difference 0.86 -> 0.57, pixels off by more than 8 levels
					    6583 -> 1306; the other offsets tried, ±0.125-0.5px either way, all measured worse). Mounted only where the
					    panel is drawn (PANEL_MEDIA). */}
					<div className="absolute left-[calc(50%-108.873px)] top-[calc(50%-406.873px)] flex size-[992.254px] -translate-x-1/2 -translate-y-1/2 items-center justify-center [transform:translate(-0.25px,-0.25px)]">
						<div className="flex-none rotate-[48.4343deg]">
							<div className="relative size-[702.892px] opacity-40">
								<div className="pointer-events-none absolute inset-0 overflow-hidden">
									{panelShown ? (
										<img
											alt=""
											src={AU.glass}
											className="absolute left-0 top-0 size-full max-w-none translate-x-[0.55%] translate-y-[0.49%]"
											fetchPriority="high"
										/>
									) : null}
								</div>
							</div>
						</div>
					</div>
					{/* 2:5667 "Frame" (LEFT 82 / CENTER, gap 12): its 74 high stack is centred half a pixel low (y 475.5 of 1024), so
					    both text boxes start on a half pixel and Figma draws both baselines on half pixels (505.5, 544.5: a text's
					    baseline is a whole number of pixels below its box). Each line takes the canon's baseline term
					    (FIGMA_BASELINE): both land on the lower of their two rows, 39 apart as in Figma, instead of the
					    nearest-row rounding that put the first a half pixel low and the second a half pixel high. */}
					<div className="absolute left-[82px] top-[calc(50%+0.5px)] flex -translate-y-1/2 flex-col items-start gap-[12px] overflow-clip whitespace-nowrap">
						<p className={cn("font-geist text-[30px] font-medium leading-[39px] text-white", AUTH_INK.white, FIGMA_BASELINE)}>
							Before you buy it, STAK it.
						</p>
						<p className={cn("font-geist text-[18px] leading-[23px] text-[#cbcccc]", AUTH_INK.tagline, FIGMA_BASELINE)}>
							Discover stocks you actually vibe with.
						</p>
					</div>
				</div>
			</aside>
			<div data-auth-area="" className="absolute inset-y-0 right-0" style={{ left: PANEL }}>
				{/* first in the DOM, as it is first on screen (the Tab order follows); z-1 keeps it above the form band */}
				<AuthBackButton className="absolute left-[27px] top-[63px] z-[1]" to={backTo} search={backSearch} onBack={onBack} viewTransition={backTransition} />
				{/* `--auth-form-top` is read below 1024 only (responsive.css: the form's place in the reflowed page) */}
				<div data-auth-band="" className="absolute left-0 h-[1024px] w-full" style={{ top: BAND, "--auth-form-top": `${formTop}px` } as CSSProperties}>
					<div data-auth-form="" className="absolute left-1/2 flex -translate-x-1/2 items-center p-[10px]" style={{ top: formTop }}>
						<div className={cn("flex w-[440px] flex-col items-center justify-center gap-[26px] overflow-clip", RING_ROOM)}>{children}</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * The heading block: Sora SemiBold 28/35 #f2f6fc over Geist 13/17 #819abb, 6 apart, on one line like the frames.
 * `wrap` is for a subtitle that carries the person's own text (Check your email names their address): it stays on
 * one line while it fits the 440 column, as in the frame, and wraps instead of being cut off when the address is long.
 * Below 1024 the column can be narrower than a line (phones; the 442-wide reset subtitle at 440): both wrap at Figma's
 * size, the title into balanced lines and the subtitle without a lone last word.
 */
export function AuthHeading({ title, subtitle, wrap = false }: { title: string; subtitle: string; wrap?: boolean }) {
	return (
		<div className={cn("flex flex-col items-start gap-[6px] overflow-clip whitespace-nowrap max-lg:w-full max-lg:whitespace-normal max-lg:[overflow-wrap:anywhere]", wrap && "max-w-full")}>
			<h1 className={cn("font-sora text-[28px] font-semibold leading-[35px] text-[#f2f6fc] max-lg:text-balance", AUTH_INK.heading)}>{title}</h1>
			<p className={cn("font-geist text-[13px] leading-[17px] text-[#819abb] max-lg:text-pretty", AUTH_INK.muted, wrap && "whitespace-normal [overflow-wrap:anywhere]")}>
				{subtitle}
			</p>
		</div>
	);
}
