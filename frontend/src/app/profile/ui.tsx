import { Link, useRouter } from "@tanstack/react-router";
import type { AriaAttributes, CSSProperties, ReactNode, Ref } from "react";
import { BackRing, FIGMA_BASELINE, GHOST_FILTER, MUTED_INK } from "@/app/ui/Button";
import { cn } from "@/lib/utils";

export const CHEVRON = "›";

/**
 * Figma's auto-width ("hug") text boxes are the text's advance rounded UP to a whole pixel, and auto layout places
 * those boxes: a right-aligned value ("Tech curious · Growth  ›", 148.45px of glyphs) starts on Figma's pixel (733, not
 * 733.55), a centred label sits where Figma centres its box, and a button that hugs its label (Edit profile) is
 * Figma's 96px, not 95.53.
 */
export const HUG: CSSProperties = { width: "calc-size(auto, round(up, size, 1px))" };

/**
 * Keyboard focus for a full-width row inside a clipped card (the frames define no focus state). The app's 2px #69b3ca
 * ring sits 2px OUTSIDE a control, which the card's clip cut off at both ends of the row; a row draws it 2px inside its
 * own box instead, rounded so it clears the card's 16px corners on the first and last rows. The rows draw nothing
 * else, so the radius changes no pixel at rest.
 */
export const ROW_FOCUS = "rounded-[14px] focus-visible:outline-offset-[-2px]!";

/** "Settings card" (Figma 2:2516): #10182b, r16, 4px vertical padding, 48px rows. */
export function SettingsCard({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("flex w-full flex-col items-start overflow-clip rounded-[16px] bg-[#10182b] py-[4px]", className)}>{children}</div>;
}

/** What a row that opens something in place says about it (the notifications row: the panel it controls). */
type RowPopup = Pick<AriaAttributes, "aria-haspopup" | "aria-expanded" | "aria-controls" | "aria-busy">;

/**
 * A 48px settings row (Figma "Frame" 2:2517: 14px side padding, label left, value right, clipped). A row that goes
 * somewhere is a link: internal hrefs are router links (the query read by the router's own parser), mail and web links
 * are plain anchors (external ones in a new tab). A row that acts in place is a button. A plain frame in Figma (no
 * variant, no hover or pressed state): cursor and focus ring only (SPEC section 5). Its accessible name is `name`
 * (rowName: the label and the value, the chevron not read).
 *
 * Below 1024 (SPEC R7): while the label and the value fit side by side the row is the frame's 48 (14 + the 20px icon or
 * the 18px value + 14, centred). When they do not (a long value on a narrow phone), the value takes a second line inside
 * the row instead of running into the label: 4 under it (the identity group's 4 between a text and its secondary line,
 * 2:2507) and 14 from the row's edges all round, as the frame insets it from the sides.
 */
export function SettingsRow({
	left,
	right,
	name,
	href,
	external,
	onClick,
	rowRef,
	popup,
}: {
	left: ReactNode;
	right: ReactNode;
	/** the row's accessible name, its label and value without the drawn chevron: rowName(label, value) */
	name: string;
	href?: string;
	external?: boolean;
	onClick?: () => void;
	/** the button row itself, for a panel it opened to hand focus back to */
	rowRef?: Ref<HTMLButtonElement>;
	popup?: RowPopup;
}) {
	const router = useRouter();
	// text-left: Figma's texts start at their box's left edge; a button would centre them in their rounded-up HUG box
	const cls = cn("flex h-[48px] w-full cursor-pointer items-center justify-between overflow-clip px-[14px] text-left max-lg:h-auto max-lg:min-h-[48px] max-lg:flex-wrap max-lg:gap-x-[12px] max-lg:gap-y-[4px] max-lg:py-[14px]", ROW_FOCUS);
	if (href && (external || /^(https?:|mailto:)/.test(href))) {
		return (
			<a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} aria-label={name} className={cls}>
				{left}
				{right}
			</a>
		);
	}
	if (href) {
		const [to = "/", query = ""] = href.split("?");
		return (
			<Link to={to as "/"} search={router.options.parseSearch(query ? `?${query}` : "") as never} aria-label={name} className={cls}>
				{left}
				{right}
			</Link>
		);
	}
	return (
		<button ref={rowRef} type="button" onClick={onClick} aria-label={name} className={cls} {...popup}>
			{left}
			{right}
		</button>
	);
}

/** Row label: Geist Medium 13 white. */
export function RowLabel({ children }: { children: ReactNode }) {
	return <span className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-white max-lg:max-w-full max-lg:whitespace-normal max-lg:break-words">{children}</span>;
}

/** A value's trailing chevron: Figma's two spaces and "›" after a value ("$10,240  ›"), or the "›" alone. */
const CHEVRON_TAIL = /\s*›$/;

/**
 * A row's accessible name: its label and its value as they read, without the chevron, which only draws where the row
 * leads ("Taste & risk profile Tech curious · Growth", "Notifications", "Growth-oriented Change"). The name starts with
 * the visible label, so speech input finds the row by what it shows (WCAG 2.5.3).
 *
 * Why a name and not a hidden glyph: the chevron is part of its value's text, one text leaf that the shared baseline and
 * grayscale rules (styles.css) place and draw. Wrapping it in an aria-hidden span takes the value out of both rules (a
 * leaf no longer); drawing it as generated content with an empty alternative splits the run, and Chrome then places the
 * glyph a fraction of a pixel off (10-38 px of the approved 1280 x 800 / 2560 x 1440 captures, measured 2026-10-31).
 * The name changes no pixel.
 */
export function rowName(label: string, value?: string) {
	return [label, value?.replace(CHEVRON_TAIL, "")].filter(Boolean).join(" ");
}

/**
 * Right-hand value: Geist Regular 14, #819abb (or the #66b7da "Change" accent). Figma keeps two spaces before the
 * chevron ("$10,240  ›"), rendered with whitespace-pre; the box hugs like Figma's (see HUG). The row it sits in takes
 * its accessible name from rowName (the chevron is not read).
 *
 * Below 1024 the row wraps (SettingsRow, SPEC R7) and the value's own, unrounded width decides whether it shares its
 * label's line (so the rounding never pushes a value onto a second line): the box is auto there, then grows into the
 * line's free room up to the HUG width (flex-grow, capped at the rounded max-content), so a value beside its label
 * starts on Figma's whole pixel as from 1024 up ("Tech curious · Growth  ›" at 477 of the 640 column, not 477.55; it
 * needs the rounding's fraction of free room, which only a row at its exact wrap width lacks). A value on a line of its
 * own starts at that line's start, and one longer than the line wraps inside it (min-width 0). Where calc-size() is not
 * supported the cap is max-content (the important cap is dropped): the box is auto's, as before.
 */
export function RowValue({ children, accent }: { children: ReactNode; accent?: boolean }) {
	return (
		<span
			className={cn(
				"whitespace-pre font-geist text-[14px] leading-[18px] max-lg:w-auto! max-lg:min-w-0 max-lg:max-w-max max-lg:max-w-[calc-size(max-content,round(up,size,1px))]! max-lg:grow max-lg:whitespace-pre-wrap max-lg:break-words",
				accent ? "text-[#66b7da]" : "text-[#819abb]",
			)}
			style={HUG}
		>
			{children}
		</span>
	);
}

/**
 * Section label ("YOUR STAK", "ACCOUNT"...): Geist Medium 11, #819abb, the column's full width. It heads the card or
 * fields under it, so it is a heading (an h2 under the page's h1: a screen reader can move between sections); preflight
 * resets an h2's size, weight and margins and the classes set Figma's, so it draws exactly as the paragraph it was.
 */
export function SectionLabel({ children }: { children: ReactNode }) {
	return <h2 className="w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{children}</h2>;
}

/**
 * "Log out" (Figma 2:2552, read 2026-10-18): h52, r6, fills hidden, clips, the outside stroke above and five drop
 * shadows (0.1 / 0.09 / 0.05 / 0.01 / 0) cast by that stroke and the label (the frame has no visible fill, so a CSS
 * drop-shadow filter is Figma's model; a box-shadow would light the whole box). Sora Regular 14, #819abb, centred.
 * A plain frame in Figma (no variant, no hover or pressed state): it does not dim or shrink under the pointer; the
 * cursor, the disabled look and the canvas's focus ring stay.
 * The stroke (0.3613 OUTSIDE, #343b4f at 33%) is BackRing, the Back-row dialect's ring: Figma paints the line's full
 * coverage into the pixel row beside the box (its render: (15,22,38) on the top row) and Chrome loses about 40% of the
 * ink of a line thinner than a pixel, so the ring is one pixel wide carrying the same ink (0.33 x 0.3613 = 0.1192), in
 * the rows Figma paints it in; the clip keeps 1px for it.
 */
export function GhostRowButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="relative flex h-[52px] w-full shrink-0 cursor-pointer items-center justify-center overflow-clip rounded-[6px] [overflow-clip-margin:1px] disabled:cursor-default disabled:opacity-60"
			style={{ filter: GHOST_FILTER }}
		>
			{/* Figma's hugging box (2:2553 "Log out": 54 x 18 at 293 / 17) with the glyphs at its left edge, as Figma draws them */}
			<span className={cn("whitespace-nowrap text-left font-sora text-[14px] leading-[18px] text-[#819abb]", MUTED_INK, FIGMA_BASELINE)} style={HUG}>
				{children}
			</span>
			<BackRing radius={6} />
		</button>
	);
}
