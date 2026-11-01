import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import {
	ArrowRight, Banknote, Ellipsis, Car, Code2, Cpu, HeartPulse, Landmark, ShoppingBag, Sparkles, Tv, UtensilsCrossed, Zap, type LucideIcon,
} from "lucide-react";

/**
 * The desktop design's palette: the app's navy ground with Android's teal-blue accents and hairline-bordered
 * panels. Mobile keeps Android's DISC tokens; these are only used above the useIsMobile() breakpoint.
 */
export const DESK = {
	bg: "#0A1020",
	panel: "#171D2C",
	panelRaised: "#1E2536",
	border: "rgba(255,255,255,0.07)",
	borderStrong: "rgba(105,179,202,0.22)",
	cyan: "#69B3CA",
	cyanSoft: "rgba(105,179,202,0.12)",
	text: "#FFFFFF",
	body: "#C4D0E2",
	muted: "#819ABB",
	/** Decorative only (chevrons, hairlines): too dim for text on a panel. */
	faint: "#56698A",
	green: "#2FD08A",
	red: "#FF5A6A",
	track: "#262E40",
	/** Primary buttons: a flat, deep teal with white text (4.6:1, readable at button sizes). The full Android gradient's
	 *  light top read as a glow on large desktop buttons; the phone keeps the gradient. Use `DeskButton`. */
	cta: "#2E7F98",
	ctaText: "#FFFFFF",
	/** Progress / share bars. */
	bar: "#69B3CA",
	/** A selected filter chip: Android's tinted chip with the teal hairline (not a solid fill). */
	chipOn: { color: "#69B3CA", background: "rgba(105,179,202,0.15)", border: "1px solid #69B3CA" },
	/** Behind artwork while it loads. */
	artBg: "#1E2536",
} as const;

/** A desktop page's ground: the design's plain navy (#0A1020), no tinted glow. */
export const deskPageBg = () => DESK.bg;

export const deskFocus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#69B3CA]";

export const panelStyle: CSSProperties = {
	background: DESK.panel,
	border: `1px solid ${DESK.border}`,
	borderRadius: 16,
};

/** A bordered dashboard panel. */
export function Panel({ children, className = "", style, label }: { children: ReactNode; className?: string; style?: CSSProperties; label?: string }) {
	return (
		<section aria-label={label} className={`flex min-w-0 flex-col ${className}`} style={{ ...panelStyle, ...style }}>
			{children}
		</section>
	);
}

/** Panel title row: a cyan icon, the title (with an optional count badge) and subtitle, and an optional "View all →". */
export function PanelHeader({ icon: Icon, title, subtitle, action, onAction, badge }: {
	icon: LucideIcon;
	title: string;
	subtitle?: string;
	action?: string;
	onAction?: () => void;
	badge?: number;
}) {
	return (
		<div className="flex items-start gap-3">
			<Icon className="mt-[3px] h-[18px] w-[18px] shrink-0" style={{ color: DESK.cyan }} strokeWidth={2} aria-hidden="true" />
			<div className="min-w-0 flex-1">
				<h2 className="flex items-center gap-2 font-heading text-[16px] font-semibold leading-[22px] text-white">
					{title}
					{badge !== undefined && badge > 0 && (
						<span className="rounded-full px-2 py-[1px] text-[12px] font-medium" style={{ background: DESK.panelRaised, color: DESK.body, border: `1px solid ${DESK.border}` }}>{badge}</span>
					)}
				</h2>
				{subtitle && <p className="text-[12.5px] leading-[18px]" style={{ color: DESK.muted }}>{subtitle}</p>}
			</div>
			{action && onAction && (
				<button type="button" onClick={onAction} className={`flex shrink-0 items-center gap-1 rounded-md text-[12.5px] font-medium transition-opacity hover:opacity-80 ${deskFocus}`} style={{ color: DESK.cyan }}>
					{action} <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
				</button>
			)}
		</div>
	);
}

/** A kicker label: small caps-style text in cyan. `as="h2"` when it is the panel's only title. */
export function Kicker({ children, icon: Icon, as: Tag = "p" }: { children: ReactNode; icon?: LucideIcon; as?: "p" | "h2" }) {
	return (
		<Tag className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: DESK.cyan }}>
			{Icon && <Icon className="h-[14px] w-[14px]" aria-hidden="true" />}
			{children}
		</Tag>
	);
}

/** A pulsing placeholder bar. */
export function SkeletonBar({ width, height = 12, className = "" }: { width: number | string; height?: number; className?: string }) {
	return <span className={`block animate-pulse rounded ${className}`} style={{ width, height, background: DESK.track }} aria-hidden="true" />;
}

export const changeColor = (pct: number | null | undefined) => (pct == null ? DESK.muted : pct >= 0 ? DESK.green : DESK.red);

/** "▲ 1.2%" / "▼ 0.4%" like the rest of the app; an em dash without a value. */
export function signedPctLabel(pct: number | null | undefined, digits = 1): string {
	if (pct == null || !Number.isFinite(pct)) return "—";
	return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(digits)}%`;
}

// Interest labels are display names from several taxonomies (taste themes, collection names), so the icon is
// matched on the words rather than a category id.
const THEME_ICONS: Array<[RegExp, LucideIcon]> = [
	[/chip|semi/i, Cpu],
	[/software|cloud|\bai\b|internet|tech/i, Code2],
	[/bank|fintech|market|asset|financ|insur/i, Landmark],
	[/energy|oil|utilit/i, Zap],
	[/retail|commerce|fashion|staple|apparel/i, ShoppingBag],
	[/pharma|health|bio|medic/i, HeartPulse],
	[/stream|media|gaming|entertain/i, Tv],
	[/restaurant|food|beverage/i, UtensilsCrossed],
	[/auto|\bev\b|car/i, Car],
	[/payment|crypto/i, Banknote],
];

export const themeIcon = (label: string): LucideIcon => THEME_ICONS.find(([re]) => re.test(label))?.[1] ?? Sparkles;

/** One interest as a labelled bar: its icon, name, share of your activity and the percentage. `other` is the "Other interests" row: everything the list doesn't show, dimmer. */
export function ThemeBarRow({ label, share, other }: { label: string; share: number; other?: boolean }) {
	const Icon = other ? Ellipsis : themeIcon(label);
	return (
		<div className="flex w-full items-center gap-3">
			<span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[8px]" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
				<Icon className="h-[14px] w-[14px]" style={{ color: other ? DESK.muted : DESK.cyan }} aria-hidden="true" />
			</span>
			<span className="w-[38%] truncate text-[12.5px]" style={{ color: other ? DESK.body : "#fff" }}>{label}</span>
			<span className="h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: DESK.track }} aria-hidden="true">
				<span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: other ? DESK.faint : DESK.bar }} />
			</span>
			<span className="w-[36px] text-right text-[12px] tabular-nums" style={{ color: DESK.body }}>{Math.round(share * 100)}%</span>
		</div>
	);
}

const BUTTON_SIZES = {
	sm: "h-[36px] rounded-[10px] px-4 text-[13px]",
	md: "h-[40px] rounded-[10px] px-5 text-[13.5px]",
	lg: "h-[44px] rounded-[12px] px-5 text-[14px]",
} as const;
const BUTTON_TONES = { primary: { background: DESK.cta, color: DESK.ctaText }, sell: { background: "#C9424F", color: "#fff" } } as const;

/** The desktop's primary button: flat teal (or red for a sell), white text, one hover and disabled look everywhere. */
export function DeskButton({ size = "md", tone = "primary", className = "", style, type = "button", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
	size?: keyof typeof BUTTON_SIZES;
	tone?: keyof typeof BUTTON_TONES;
}) {
	return (
		<button
			type={type}
			{...rest}
			className={`inline-flex shrink-0 items-center justify-center gap-2 font-semibold transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100 ${BUTTON_SIZES[size]} ${deskFocus} ${className}`}
			style={{ ...BUTTON_TONES[tone], ...style }}
		>
			{children}
		</button>
	);
}
