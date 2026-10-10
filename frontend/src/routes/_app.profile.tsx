import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { deleteUser } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { useId, useState } from "react";
import { toast } from "sonner";
import { col } from "@/app/FitCanvas";
import { wholeMoney } from "@/app/live/format";
import { localKey } from "@/app/live/guest";
import { useShowcase } from "@/app/live/showcase";
import { useLive } from "@/app/live/store";
import { PageHeader } from "@/app/PageHeader";
import { P } from "@/app/profile/assets";
import { profile } from "@/app/profile/data";
import { useProfileStats } from "@/app/profile/stats";
import { CHEVRON, RowLabel, RowValue, SectionLabel, SettingsCard, SettingsRow } from "@/app/profile/ui";
import { GhostButton } from "@/app/simulate/ui";
import { hairline } from "@/app/ui/Button";
import { Sheet } from "@/app/ui/Sheet";
import { useAccountDisplay } from "@/app/useAccountDisplay";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/_app/profile")({
	component: ProfilePage,
});

/** Figma 2:2476 "Desktop · Profile": 640px column of settings cards, every value read from the account. */
const LOGOUT_SHADOW =
	"drop-shadow(0px 77.322px 10.839px rgba(82,170,199,0)) drop-shadow(0px 49.862px 9.756px rgba(82,170,199,0.01)) drop-shadow(0px 28.183px 8.31px rgba(82,170,199,0.05)) drop-shadow(0px 12.285px 6.142px rgba(82,170,199,0.09)) drop-shadow(0px 2.891px 3.252px rgba(82,170,199,0.1))";

const ACCOUNT_ROWS = [
	{ icon: P.notifications, href: "/home?notifications=1", external: false },
	{ icon: P.support, href: "mailto:support@thestak.org", external: false },
	{ icon: P.terms, href: "https://thestak.org/terms", external: true },
	{ icon: P.privacy, href: "https://thestak.org/privacy", external: true },
];

function ProfilePage() {
	const me = useAccountDisplay();
	const stats = useProfileStats();
	const live = useLive();
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const deleteTitleId = useId();
	const deleteBodyId = useId();

	const showcase = useShowcase();
	const yourStak = [
		{ label: profile.yourStak.rows[0].label, value: `${stats.taste.summary}  ${CHEVRON}`, href: "/profile/taste-risk" },
		// the untouched demo persona shows the frame's figure (live/showcase.ts)
		{ label: profile.yourStak.rows[1].label, value: showcase ? profile.yourStak.rows[1].value : `${wholeMoney(stats.value)}  ${CHEVRON}`, href: "/simulate/portfolio" },
		{ label: profile.yourStak.rows[2].label, value: `#${stats.rank} this week  ${CHEVRON}`, href: "/simulate/leaderboard" },
	];

	async function handleLogout() {
		if (user) await logout().catch(() => {});
		else live.actions.resetGuest();
		toast.success("Logged out");
		navigate({ to: "/login" });
	}

	async function confirmDeletion() {
		setDeleting(true);
		try {
			if (user) {
				// the person's data goes with the account: the user document (saves, paper portfolio, taste, XP) and this browser's local store
				await deleteDoc(doc(db, "users", user.uid));
				try {
					localStorage.removeItem(localKey(user.uid));
				} catch {
					/* storage unavailable */
				}
				await deleteUser(user);
				toast.success("Account deleted");
			} else {
				live.actions.resetGuest();
				toast.success("Demo profile reset");
			}
			navigate({ to: "/signup" });
		} catch (error) {
			const code = (error as { code?: string }).code ?? "";
			if (code.includes("requires-recent-login")) {
				toast.error("Sign in again, then delete your account");
				await logout().catch(() => {});
				navigate({ to: "/login" });
			} else {
				toast.error("Could not delete the account. Try again.");
			}
		} finally {
			setDeleting(false);
			setConfirmDelete(false);
		}
	}

	return (
		<div className="flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={profile.title} onBell={() => navigate({ to: "/home", search: { notifications: "1" } })} />
			<div className="flex flex-col items-start gap-[16px]" style={{ width: col(640) }}>
				<div className="flex h-[88px] w-full items-center gap-[16px] overflow-clip pl-[5px]">
					<div className="flex size-[72px] shrink-0 items-center justify-center overflow-clip rounded-[36px] border-2 border-[#66b7da] bg-[#242b3d]">
						<span className="whitespace-nowrap font-sora text-[24.75px] font-semibold leading-[31px] text-[#9eadc7]">{me.initial}</span>
					</div>
					<div className="flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
						<span className="font-sora text-[22px] font-semibold leading-[28px] text-white">{me.name}</span>
						<span className="font-geist text-[13px] leading-[17px] text-[#819abb]">{`${me.handle} · Paper investor since ${me.since}`}</span>
					</div>
					<Link
						to="/profile/edit"
						className="stak-press flex cursor-pointer items-start overflow-clip rounded-[10px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] px-[14px] py-[9px]"
					>
						<span className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-white">{profile.edit}</span>
					</Link>
				</div>

				<SectionLabel>{profile.yourStak.label}</SectionLabel>
				<SettingsCard>
					{yourStak.map((row) => (
						<SettingsRow key={row.label} href={row.href} left={<RowLabel>{row.label}</RowLabel>} right={<RowValue>{row.value}</RowValue>} />
					))}
				</SettingsCard>

				<SectionLabel>{profile.account.label}</SectionLabel>
				<SettingsCard>
					{profile.account.rows.map((label, i) => (
						<SettingsRow
							key={label}
							href={ACCOUNT_ROWS[i]?.href}
							external={ACCOUNT_ROWS[i]?.external}
							left={
								<span className="flex items-center gap-[10px] overflow-clip">
									<img alt="" src={ACCOUNT_ROWS[i]?.icon} className="size-[20px]" width={20} height={20} />
									<RowLabel>{label}</RowLabel>
								</span>
							}
							right={<RowValue>{CHEVRON}</RowValue>}
						/>
					))}
				</SettingsCard>

				<button
					type="button"
					onClick={handleLogout}
					className="stak-press flex h-[52px] w-full cursor-pointer items-center justify-center overflow-clip rounded-[6px] border-[0.361px] border-[rgba(52,59,79,0.33)]"
					style={{ filter: LOGOUT_SHADOW }}
				>
					<span className="whitespace-nowrap font-sora text-[14px] leading-[18px] text-[#819abb]">{profile.logOut}</span>
				</button>
				<button
					type="button"
					onClick={() => setConfirmDelete(true)}
					className="stak-press w-full cursor-pointer rounded-[4px] text-center font-geist text-[13px] font-medium leading-[17px] text-[#e5484d] opacity-85"
				>
					{profile.deleteAccount}
				</button>
			</div>

			{confirmDelete && (
				<Sheet label="Delete your account?" role="alertdialog" labelledBy={deleteTitleId} describedBy={deleteBodyId} onClose={() => setConfirmDelete(false)}>
					<p id={deleteTitleId} className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-white">
						Delete your account?
					</p>
					<p id={deleteBodyId} className="w-full font-geist text-[12px] leading-[18px] text-[#c8d2e0]">
						{user
							? "This removes your saves, your paper portfolio and your taste profile for good. There is no undo."
							: "This resets the demo profile: saves, paper trades and taste go back to the start."}
					</p>
					<div className="flex w-full flex-col items-start gap-[16px]">
						<button
							type="button"
							onClick={confirmDeletion}
							disabled={deleting}
							className="stak-press flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[6px] bg-[rgba(229,72,77,0.12)]"
							style={{ boxShadow: hairline(0.5, "rgba(229,72,77,0.6)") }}
						>
							<span className="whitespace-nowrap font-sora text-[14px] leading-[18px] text-[#e5484d]">{deleting ? "Deleting…" : profile.deleteAccount}</span>
						</button>
						{/* the safe action takes the initial focus, so a repeated Enter cannot delete */}
						<GhostButton onClick={() => setConfirmDelete(false)} height={52} radius={6} fontSize={14} autoFocus>
							Back
						</GhostButton>
					</div>
				</Sheet>
			)}
		</div>
	);
}
