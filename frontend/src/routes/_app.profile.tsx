import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { P } from "@/app/profile/assets";
import { profile } from "@/app/profile/data";
import { CHEVRON, RowLabel, RowValue, SectionLabel, SettingsCard, SettingsRow } from "@/app/profile/ui";
import { PageHeader } from "@/app/PageHeader";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/profile")({
	component: ProfilePage,
});

/** Figma 2:2476 "Desktop · Profile": 640px column of settings cards. */
const LOGOUT_SHADOW =
	"drop-shadow(0px 77.322px 10.839px rgba(82,170,199,0)) drop-shadow(0px 49.862px 9.756px rgba(82,170,199,0.01)) drop-shadow(0px 28.183px 8.31px rgba(82,170,199,0.05)) drop-shadow(0px 12.285px 6.142px rgba(82,170,199,0.09)) drop-shadow(0px 2.891px 3.252px rgba(82,170,199,0.1))";

const YOUR_STAK_LINKS = ["/profile/taste-risk", "/simulate/portfolio", "/simulate/leaderboard"];
const ACCOUNT_ICONS = [P.notifications, P.support, P.terms, P.privacy];
const ACCOUNT_LINKS: (string | undefined)[] = ["/home?notifications=1", undefined, undefined, undefined];

function ProfilePage() {
	const navigate = useNavigate();
	const { logout } = useAuth();
	return (
		<div className="flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={profile.title} onBell={() => navigate({ to: "/home", search: { notifications: "1" } })} />
			<div className="flex w-[640px] flex-col items-start gap-[16px]">
				<div className="flex h-[88px] w-full items-center gap-[16px] overflow-clip pl-[5px]">
					<div className="flex size-[72px] shrink-0 items-center justify-center overflow-clip rounded-[36px] border-2 border-[#66b7da] bg-[#242b3d]">
						<span className="whitespace-nowrap font-sora text-[24.75px] font-semibold leading-[31px] text-[#9eadc7]">{profile.initial}</span>
					</div>
					<div className="flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
						<span className="font-sora text-[22px] font-semibold leading-[28px] text-white">{profile.name}</span>
						<span className="font-geist text-[13px] leading-[17px] text-[#819abb]">{profile.subtitle}</span>
					</div>
					<Link
						to="/profile/edit"
						className="flex items-start overflow-clip rounded-[10px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] px-[14px] py-[9px]"
					>
						<span className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-white">{profile.edit}</span>
					</Link>
				</div>

				<SectionLabel>{profile.yourStak.label}</SectionLabel>
				<SettingsCard>
					{profile.yourStak.rows.map((row, i) => (
						<SettingsRow
							key={row.label}
							href={YOUR_STAK_LINKS[i]}
							left={<RowLabel>{row.label}</RowLabel>}
							right={<RowValue>{row.value}</RowValue>}
						/>
					))}
				</SettingsCard>

				<SectionLabel>{profile.account.label}</SectionLabel>
				<SettingsCard>
					{profile.account.rows.map((label, i) => (
						<SettingsRow
							key={label}
							href={ACCOUNT_LINKS[i]}
							left={
								<span className="flex items-center gap-[10px] overflow-clip">
									<img alt="" src={ACCOUNT_ICONS[i]} className="size-[20px]" />
									<RowLabel>{label}</RowLabel>
								</span>
							}
							right={<RowValue>{CHEVRON}</RowValue>}
						/>
					))}
				</SettingsCard>

				<button
					type="button"
					onClick={() => {
						logout?.();
						navigate({ to: "/login" });
					}}
					className="flex h-[52px] w-full items-center justify-center overflow-clip rounded-[6px] border-[0.361px] border-[rgba(52,59,79,0.33)]"
					style={{ filter: LOGOUT_SHADOW }}
				>
					<span className="whitespace-nowrap font-sora text-[14px] leading-[18px] text-[#819abb]">{profile.logOut}</span>
				</button>
				<button type="button" className="w-full text-center font-geist text-[13px] font-medium leading-[17px] text-[#e5484d] opacity-85">
					{profile.deleteAccount}
				</button>
			</div>
		</div>
	);
}
