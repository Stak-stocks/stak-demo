import type { ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronRight, KeyRound, LifeBuoy, LogOut, Moon, Pencil, Send, SlidersHorizontal, User, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { shareInvite } from "@/lib/invite";
import { DESK, deskFocus, deskPageBg } from "@/components/desktop/deskKit";

type Item = { to: string; label: string; icon: LucideIcon; also?: string[] };
const GROUPS: ReadonlyArray<{ title: string; items: Item[] }> = [
	{ title: "Account", items: [
		{ to: "/profile", label: "Profile", icon: User },
		{ to: "/profile/personal-details", label: "Edit profile", icon: Pencil },
		{ to: "/profile/sign-in", label: "Sign-in", icon: KeyRound, also: ["/profile/security"] },
	] },
	{ title: "Preferences", items: [
		{ to: "/profile/notifications", label: "Notifications", icon: Bell },
		{ to: "/profile/appearance", label: "Appearance", icon: Moon },
		{ to: "/profile/app-settings", label: "App settings", icon: SlidersHorizontal },
	] },
	{ title: "Support", items: [
		{ to: "/profile/help-support", label: "Help & support", icon: LifeBuoy },
	] },
];

/** Figma unit inside the content column, so the phone settings forms render at a comfortable desktop size. */
const DESK_UNIT = "1.1px";

/**
 * Settings on desktop: the app's top bar, a breadcrumb and title, then a settings menu beside the page's content.
 * Every settings route renders inside it, so the menu stays put while you move between them. `wide` gives the
 * content column room for panels (the Profile overview); forms keep a readable width.
 */
export function SettingsDesktopShell({ title, subtitle, wide, children }: { title: string; subtitle?: string; wide?: boolean; children: ReactNode }) {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { logout } = useAuth();
	const isActive = (item: Item) => pathname === item.to || !!item.also?.includes(pathname);
	const isHub = pathname === "/profile";

	async function handleLogout() {
		await logout();
		navigate({ to: "/login" });
	}

	const rowClass = `flex w-full items-center gap-3 rounded-[10px] px-3 py-[9px] text-left text-[13.5px] transition-colors ${deskFocus}`;

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-12 pt-5">
				<header>
					{!isHub && (
						<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12.5px]" style={{ color: DESK.muted }}>
							<button type="button" onClick={() => navigate({ to: "/profile" })} className={`rounded-md hover:text-white ${deskFocus}`}>Settings</button>
							<ChevronRight className="h-[13px] w-[13px]" aria-hidden="true" />
							<span aria-current="page" className="text-white">{title}</span>
						</nav>
					)}
					<h1 className="mt-1 font-heading text-[28px] font-semibold leading-[36px] text-white">{isHub ? "Settings" : title}</h1>
					{subtitle && <p className="text-[14px]" style={{ color: DESK.muted }}>{subtitle}</p>}
				</header>

				{/* Beside the content from lg; above it on narrower windows, where a side menu would squeeze the forms. */}
				<div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
					<nav aria-label="Settings" className="flex flex-col gap-4 rounded-[16px] p-3 lg:sticky lg:top-5" style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }}>
						{GROUPS.map((group) => (
							<div key={group.title} className="flex flex-col gap-[2px]">
								<p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: DESK.muted }}>{group.title}</p>
								{group.items.map((item) => {
									const on = isActive(item);
									const Icon = item.icon;
									return (
										<button key={item.to} type="button" aria-current={on ? "page" : undefined} onClick={() => navigate({ to: item.to as never })} className={`${rowClass} ${on ? "" : "hover:bg-white/[0.04]"}`} style={on ? { background: DESK.cyanSoft, color: "#fff", boxShadow: `inset 2px 0 0 ${DESK.cyan}` } : { color: DESK.body }}>
											<Icon className="h-[16px] w-[16px] shrink-0" style={{ color: on ? DESK.cyan : DESK.muted }} aria-hidden="true" />
											{item.label}
										</button>
									);
								})}
								{group.title === "Support" && (
									<button type="button" onClick={shareInvite} className={`${rowClass} hover:bg-white/[0.04]`} style={{ color: DESK.body }}>
										<Send className="h-[16px] w-[16px] shrink-0" style={{ color: DESK.muted }} aria-hidden="true" /> Invite a friend
									</button>
								)}
							</div>
						))}
						<div className="border-t pt-3" style={{ borderColor: DESK.border }}>
							<button type="button" onClick={handleLogout} className={`${rowClass} hover:bg-white/[0.04]`} style={{ color: DESK.muted }}>
								<LogOut className="h-[16px] w-[16px] shrink-0" aria-hidden="true" /> Log out
							</button>
						</div>
					</nav>

					<div className={`flex min-w-0 flex-col gap-3 ${wide ? "max-w-[980px]" : "max-w-[620px]"}`} style={{ ["--u" as string]: DESK_UNIT }}>
						{children}
					</div>
				</div>
			</div>
		</div>
	);
}
