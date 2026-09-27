import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { BackCircle, PRESS, PhonePage, f, focusRing } from "@/components/phone/phone";
import { useIsMobile } from "@/hooks/use-mobile";
import { SettingsDesktopShell } from "./SettingsDesktopShell";

/** Android's SettingsScaffold: a back circle and a centred 17u title, then a scrolling body (20u sides). */
export function SettingsScaffold({ title, backTo = "/profile", gap = 12, children }: { title: string; backTo?: string; gap?: number; children: ReactNode }) {
	const navigate = useNavigate();
	// Desktop: the same page body inside the settings menu layout (no back circle; the menu and breadcrumb do that).
	if (!useIsMobile()) {
		return <SettingsDesktopShell title={title}><div style={{ display: "flex", flexDirection: "column", gap: cu(gap) }}>{children}</div></SettingsDesktopShell>;
	}
	return (
		<PhonePage>
			<div className="relative flex items-center" style={{ padding: `${cu(8)} ${cu(20)} ${cu(16)}` }}>
				<BackCircle onClick={() => navigate({ to: backTo as never })} />
				<h1 className="pointer-events-none absolute inset-x-0 text-center" style={{ font: f(600, 17, 22, "heading"), color: "#fff" }}>{title}</h1>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: cu(gap), padding: `0 ${cu(20)} ${cu(26)}` }}>{children}</div>
		</PhonePage>
	);
}

/** The dark rounded card settings rows live in. */
export function SettingsCard({ children, padding = "4u 0" }: { children: ReactNode; padding?: string }) {
	const [v, h] = padding.replace(/u/g, "").split(" ").map(Number);
	return <section style={{ borderRadius: cu(16), background: DISC.cardDark, padding: `${cu(v)} ${cu(h ?? 0)}` }}>{children}</section>;
}

/** A 48u row: label on the left; a chevron, a value, or nothing on the right. Not a button unless it has an action. */
export function SettingsLinkRow({ label, onClick, value, chevron = true, tone }: { label: string; onClick?: () => void; value?: string; chevron?: boolean; tone?: string }) {
	const inner = (
		<>
			<span style={{ font: f(500, 13, 17), color: tone ?? "#fff" }}>{label}</span>
			<span className="min-w-0 flex-1" />
			{value && <span className="truncate" style={{ paddingLeft: cu(12), paddingRight: cu(chevron ? 8 : 0), font: f(400, 12), color: DISC.muted }}>{value}</span>}
			{chevron && onClick && <span style={{ font: f(400, 14, 18), color: DISC.muted }} aria-hidden="true">›</span>}
		</>
	);
	const style = { height: cu(48), padding: `0 ${cu(14)}` };
	return onClick ? (
		<button type="button" onClick={onClick} className={`flex w-full items-center text-left ${PRESS}`} style={{ ...style, ...focusRing }}>{inner}</button>
	) : (
		<div className="flex w-full items-center" style={style}>{inner}</div>
	);
}

/** Android's StakToggle: a 42x24 track with an 18u thumb. */
export function StakToggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className="relative shrink-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
			style={{ width: cu(42), height: cu(24), borderRadius: cu(12), background: checked ? DISC.blue : DISC.avatar, opacity: disabled ? 0.5 : 1, outlineColor: DISC.teal }}
		>
			<span className="absolute rounded-full bg-white transition-all duration-200" style={{ top: cu(3), left: cu(checked ? 21 : 3), width: cu(18), height: cu(18) }} />
		</button>
	);
}

/** Android's PermissionCard: a title and description with a toggle. */
export function PermissionCard({ title, sub, checked, onChange, disabled }: { title: string; sub: string; checked: boolean; onChange: (on: boolean) => void; disabled?: boolean }) {
	return (
		<div className="flex items-center" style={{ gap: cu(12), borderRadius: cu(14), background: DISC.sheet, padding: cu(16) }}>
			<div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(4) }}>
				<span style={{ font: f(500, 14), color: "#fff" }}>{title}</span>
				<span style={{ font: f(400, 11), color: "#ACAFB1" }}>{sub}</span>
			</div>
			<StakToggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
		</div>
	);
}

export const Caption = ({ children }: { children: ReactNode }) => (
	<p style={{ padding: `0 ${cu(4)}`, font: f(400, 12, 16), color: DISC.muted }}>{children}</p>
);

/** A titled explanation card ("Password managed by Google", "Notifications are off for STAK"). */
export function NoticeCard({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: cu(8), borderRadius: cu(16), background: DISC.cardDark, padding: cu(16) }}>
			<p style={{ font: f(600, 15, undefined, "heading"), color: "#fff" }}>{title}</p>
			<p style={{ font: f(400, 13, 19), color: DISC.body }}>{body}</p>
			{children}
		</div>
	);
}
