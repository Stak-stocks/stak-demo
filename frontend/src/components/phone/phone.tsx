import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PHONE_MAX_WIDTH, useFigmaUnit } from "@/components/discover/useFigmaUnit";

/** A CSS `font` shorthand in figma units: `f(600, 15, 19, "heading")` = Sora SemiBold 15u/19u. */
export const f = (weight: number, size: number, lineHeight?: number, family: "body" | "heading" = "body") =>
	`${weight} ${cu(size)}${lineHeight ? `/${cu(lineHeight)}` : ""} var(--font-${family})`;

/** Android's PressDim: the pressed target fades to 70%, no ripple. */
export const PRESS = "transition-opacity active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
export const focusRing: CSSProperties = { outlineColor: DISC.teal };

/** Android's two card surfaces at a corner radius in figma units: the sheet (most cards) and the darker card. */
export const sheetCard = (radius: number): CSSProperties => ({ borderRadius: cu(radius), background: DISC.sheet });
export const darkCard = (radius: number): CSSProperties => ({ borderRadius: cu(radius), background: DISC.cardDark });

/**
 * The house primary button: Android's CTA gradient, white label, faded to half when disabled. Each Android frame's
 * version (AuthCta, SheetCta, QuizCta) passes its own height, hairline rim and glow.
 */
export function GradientCta({ children, onClick, disabled, type = "button", height = 52, rim, shadow, fontSize = 14 }: {
	children: ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	type?: "button" | "submit";
	height?: number;
	/** A gradient for the 0.36u border; none draws the fill edge to edge. */
	rim?: string;
	shadow?: string;
	fontSize?: number;
}) {
	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			className={`w-full transition-[filter,opacity] hover:brightness-105 disabled:cursor-not-allowed ${disabled ? "" : PRESS}`}
			style={{
				height: cu(height), borderRadius: cu(6),
				// DISC.cta is already a gradient: it's a background layer as is (wrapping it in linear-gradient() drew nothing).
				...(rim ? { border: `${cu(0.36)} solid transparent`, background: `${DISC.cta} padding-box, ${rim} border-box` } : { background: DISC.cta }),
				boxShadow: shadow, opacity: disabled ? 0.5 : 1, font: f(500, fontSize), color: "#fff", ...focusRing,
			}}
		>
			{children}
		</button>
	);
}

/**
 * Every Android screen is drawn for a phone; on the web it renders as a phone-width column, centred, with
 * `--u` (px per figma unit) set for the `cu()` sizes inside it. The page's own scroll container does the scrolling.
 */
export function PhonePage({ children, className = "" }: { children: ReactNode; className?: string }) {
	const unit = useFigmaUnit();
	return (
		<div className={`min-h-full overflow-x-clip bg-background text-foreground ${className}`}>
			<div className="mx-auto" style={{ maxWidth: PHONE_MAX_WIDTH, ["--u" as string]: `${unit}px` }}>{children}</div>
		</div>
	);
}

/** Android's AuthBackCircle: 40u circle, #192238, back chevron. */
export function BackCircle({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			className={`grid shrink-0 place-items-center rounded-full ${PRESS}`}
			style={{ width: cu(40), height: cu(40), background: DISC.navCircle, ...focusRing }}
		>
			<svg viewBox="0 0 22 22" style={{ width: cu(22), height: cu(22) }} fill="none" aria-hidden="true">
				<path d="M13.75 4.58333L7.33333 11L13.75 17.4167" stroke="#AEAEAE" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</button>
	);
}

/** The 56u sub-page bar: back circle on the left (20u in), an optional centred title. */
export function SubPageBar({ title, onBack, backTo }: { title?: string; onBack?: () => void; backTo?: string }) {
	const navigate = useNavigate();
	const back = onBack ?? (() => navigate({ to: (backTo ?? "/") as never }));
	return (
		<div className="relative flex items-center" style={{ height: cu(56), paddingLeft: cu(20) }}>
			<BackCircle onClick={back} />
			{title && (
				<h1 className="pointer-events-none absolute inset-x-0 text-center" style={{ font: f(600, 16, 20, "heading"), color: "#fff" }}>{title}</h1>
			)}
		</div>
	);
}

/** Android's StakIconTile: a square tile (radius 10u) tinted at 18% behind a glyph. */
export function IconTile({ icon: Icon, tint = DISC.teal, glyphColor, size = 34, glyph = 20, radius = 10 }: {
	icon: React.ComponentType<{ size?: number | string; color?: string; style?: CSSProperties }>;
	tint?: string;
	/** The glyph keeps its own colour on Android; defaults to the tint. */
	glyphColor?: string;
	size?: number;
	glyph?: number;
	radius?: number;
}) {
	return (
		<div className="grid shrink-0 place-items-center" style={{ width: cu(size), height: cu(size), borderRadius: cu(radius), background: `${tint}2E` }} aria-hidden="true">
			<Icon color={glyphColor ?? tint} style={{ width: cu(glyph), height: cu(glyph) }} />
		</div>
	);
}

/** Card recipe most screens share: radius 16u, #181F30, 16u padding. */
export const cardStyle = (gap = 12): CSSProperties => ({
	display: "flex", flexDirection: "column", gap: cu(gap), borderRadius: cu(16), background: DISC.sheet, padding: cu(16),
});

/** Android's SettingsChip: teal outline when selected, a plain dark pill otherwise. */
export function SettingsChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			className={PRESS}
			style={{
				padding: `${cu(6)} ${cu(12)}`, borderRadius: cu(14), font: f(500, 12, 16),
				background: selected ? "rgba(57,197,203,0.15)" : DISC.cardDark,
				border: selected ? `${cu(1)} solid ${DISC.blue}` : `${cu(1)} solid transparent`,
				color: selected ? DISC.teal : DISC.muted, ...focusRing,
			}}
		>
			{label}
		</button>
	);
}
