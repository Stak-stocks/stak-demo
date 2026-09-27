import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bell, KeyRound, Pencil, Sparkles, Wallet } from "lucide-react";
import type { AppUser } from "@/context/AuthContext";
import type { NotificationPrefs } from "@/lib/notificationPrefs";
import { signedUsd, usd, wholeUsd } from "@/lib/simFormat";
import { DESK, Panel, PanelHeader, changeColor, deskFocus, signedPctLabel } from "@/components/desktop/deskKit";
import { SettingsDesktopShell } from "./SettingsDesktopShell";

function Stat({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
	return (
		<div className="flex min-w-0 flex-col gap-1 rounded-[12px] p-3" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
			<span className="text-[12px]" style={{ color: DESK.muted }}>{label}</span>
			<span className="truncate font-heading text-[16px] font-semibold tabular-nums" style={{ color }} title={value}>{value}</span>
		</div>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 py-[9px] text-[13px]">
			<span style={{ color: DESK.body }}>{label}</span>
			<span className="truncate font-medium text-white">{value}</span>
		</div>
	);
}

/**
 * The Profile hub on desktop: who you are, your taste, your paper numbers, and how the account signs in and notifies -
 * each with a way to change it. Same data as the phone hub; the settings pages sit in the menu beside it.
 */
export function ProfileDesktop({ user, joined, tasteChips, paper, prefs }: {
	user: AppUser;
	joined: string;
	tasteChips: string[];
	/** `ready` is false while loading or before the practice portfolio is set up: its numbers would read as a -100% loss. */
	paper: { ready: boolean; portfolioValue: number; cash: number; picks: number; allTimeGain: number; paperStart: number };
	prefs: NotificationPrefs;
}) {
	const navigate = useNavigate();
	const name = user.displayName || "STAK User";
	const returnPct = paper.paperStart > 0 ? (paper.allTimeGain / paper.paperStart) * 100 : 0;
	const linkClass = `flex items-center gap-1 self-start rounded-md text-[12.5px] font-medium transition-opacity hover:opacity-80 ${deskFocus}`;

	return (
		<SettingsDesktopShell title="Profile" subtitle="Your account, your taste and how STAK keeps in touch." wide>
			<Panel label="You" className="flex-row items-center gap-5 p-6">
				<span className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-full font-heading text-[26px] font-semibold" style={{ background: DESK.track, color: DESK.cyan }}>
					{user.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : name.slice(0, 1).toUpperCase()}
				</span>
				<div className="min-w-0 flex-1">
					<p className="font-heading text-[22px] font-semibold leading-[28px] text-white">{name}</p>
					<p className="text-[13px]" style={{ color: DESK.muted }}>{joined ? `Paper investor · joined ${joined}` : "Paper investor"}{user.email ? ` · ${user.email}` : ""}</p>
				</div>
				<button type="button" onClick={() => navigate({ to: "/profile/personal-details" })} className={`flex h-[38px] items-center gap-2 rounded-[10px] px-4 text-[13px] font-medium text-white hover:bg-white/[0.06] ${deskFocus}`} style={{ border: `1px solid ${DESK.border}` }}>
					<Pencil className="h-[14px] w-[14px]" aria-hidden="true" /> Edit profile
				</button>
			</Panel>

			<div className="grid gap-3 xl:grid-cols-2">
				<Panel label="Your taste" className="gap-3 p-5">
					<PanelHeader icon={Sparkles} title="Your taste" subtitle="Updates as you save stocks." />
					<div className="flex flex-wrap gap-2">
						{tasteChips.map((label) => (
							<span key={label} className="rounded-full px-3 py-[5px] text-[12.5px] font-medium" style={{ background: DESK.cyanSoft, color: DESK.cyan, border: `1px solid ${DESK.borderStrong}` }}>{label}</span>
						))}
					</div>
					<button type="button" onClick={() => navigate({ to: "/my-stak/taste" })} className={linkClass} style={{ color: DESK.cyan }}>
						See your Investing Taste <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
					</button>
				</Panel>

				<Panel label="Paper portfolio" className="gap-3 p-5">
					<PanelHeader icon={Wallet} title="Paper portfolio" subtitle={paper.ready ? `Practice money, started with ${wholeUsd(paper.paperStart)}.` : "Practice investing with pretend money."} />
					<div className="grid grid-cols-3 gap-2">
						<Stat label="Portfolio" value={paper.ready ? wholeUsd(paper.portfolioValue) : "—"} />
						<Stat label="Cash" value={paper.ready ? usd(paper.cash) : "—"} />
						<Stat label="Picks" value={paper.ready ? String(paper.picks) : "—"} />
					</div>
					{paper.ready
						? <p className="text-[13px] font-medium" style={{ color: changeColor(paper.allTimeGain) }}>{signedUsd(paper.allTimeGain)} all time · {signedPctLabel(returnPct)}</p>
						: <p className="text-[13px]" style={{ color: DESK.muted }}>Set up your practice portfolio in Simulate to start.</p>}
					<button type="button" onClick={() => navigate({ to: "/simulate" })} className={linkClass} style={{ color: DESK.cyan }}>
						{paper.ready ? "Open Simulate" : "Set up in Simulate"} <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
					</button>
				</Panel>

				<Panel label="Sign-in" className="gap-2 p-5">
					<PanelHeader icon={KeyRound} title="Sign-in" action="Manage" onAction={() => navigate({ to: "/profile/sign-in" })} />
					<div className="flex flex-col divide-y divide-[rgba(255,255,255,0.07)]">
						<Row label="Signed in with" value={user.provider === "google.com" ? "Google" : "Email and password"} />
						{user.email && <Row label="Email" value={user.email} />}
					</div>
				</Panel>

				<Panel label="Notifications" className="gap-2 p-5">
					<PanelHeader icon={Bell} title="Notifications" action="Edit" onAction={() => navigate({ to: "/profile/notifications" })} />
					<div className="flex flex-col divide-y divide-[rgba(255,255,255,0.07)]">
						<Row label="Price alerts" value={prefs.priceAlerts ? `On · moves of ${prefs.priceThreshold}%+` : "Off"} />
						<Row label="Daily deck reminder" value={prefs.dailyDeck ? "On" : "Off"} />
						<Row label="Market news" value={prefs.marketNews ? "On" : "Off"} />
					</div>
				</Panel>
			</div>
		</SettingsDesktopShell>
	);
}
