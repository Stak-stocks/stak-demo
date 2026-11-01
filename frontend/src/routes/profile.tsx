import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getProfile } from "@/lib/api";
import { useMyStakData } from "@/hooks/useMyStakData";
import { usePaperPortfolio } from "@/hooks/usePaperPortfolio";
import { chips } from "@/lib/tasteModel";
import { isUp, signedPct, signedUsd, usd, wholeUsd } from "@/lib/simFormat";
import { SettingsCard, SettingsLinkRow } from "@/components/profile/ProfileKit";
import { ProfileDesktop } from "@/components/profile/ProfileDesktop";
import { shareInvite } from "@/lib/invite";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAccount } from "@/context/AccountContext";
import { readNotificationPrefs } from "@/lib/notificationPrefs";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { BackCircle, PRESS, PhonePage, f, focusRing, darkCard } from "@/components/phone/phone";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

/** The Profile hub: who you are, your taste, your paper numbers, and the settings pages. */
function ProfilePage() {
	const { appUser, loading, logout } = useAuth();
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const { account } = useAccount();
	const { swipedBrands } = useMyStakData();
	const paper = usePaperPortfolio();
	const { data: me } = useQuery({ queryKey: ["profile"], queryFn: getProfile, staleTime: 5 * 60 * 1000, retry: 0 });

	useEffect(() => { if (!loading && !appUser) navigate({ to: "/login" }); }, [loading, appUser, navigate]);

	// The taste chips come from the quiz answers plus what's been saved since, strongest first.
	const tasteChips = useMemo(() => {
		const taste = me?.taste;
		if (!taste) return ["Just Exploring"];
		return chips(new Set([...taste.picks, ...swipedBrands.map((b) => b.name)]), taste.goal, taste.risk);
	}, [me?.taste, swipedBrands]);

	if (loading || !appUser) return <PhonePage><div /></PhonePage>;

	const name = appUser.displayName || "STAK User";
	const joined = me?.createdAt ? new Date(me.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";
	const up = isUp(paper.allTimeGain);
	// Loading, or not set up yet: cash reads 0 against the budget, which would show as a -100% loss.
	const paperReady = !paper.loading && !paper.needsSetup;

	if (!isMobile) {
		return (
			<ProfileDesktop
				user={appUser}
				joined={joined}
				tasteChips={tasteChips}
				paper={{ ready: paperReady, portfolioValue: paper.portfolioValue, cash: paper.cash, picks: paper.picks.length, allTimeGain: paper.allTimeGain, paperStart: paper.paperStart }}
				prefs={readNotificationPrefs(account?.preferences)}
			/>
		);
	}

	async function handleLogout() {
		await logout();
		navigate({ to: "/login" });
	}

	const stat = (value: string, label: string) => (
		<div className="flex flex-col items-center" style={{ gap: cu(4) }}>
			<span style={{ font: f(600, 16, 20, "heading"), color: DISC.ink }}>{value}</span>
			<span style={{ font: f(400, 11, 14), color: DISC.muted }}>{label}</span>
		</div>
	);
	const card = { display: "flex", flexDirection: "column", gap: cu(10), ...darkCard(16), padding: cu(14) } as const;

	return (
		<PhonePage>
			<div className="relative flex items-center" style={{ height: cu(56), paddingLeft: cu(20) }}>
				<BackCircle onClick={() => navigate({ to: "/" })} />
				<h1 className="pointer-events-none absolute inset-x-0 text-center" style={{ font: f(600, 16, 20, "heading"), color: "#fff" }}>Profile</h1>
			</div>

			<div className="flex flex-col items-stretch" style={{ gap: cu(16), padding: `${cu(16)} ${cu(20)} ${cu(40)}` }}>
				<button
					type="button"
					onClick={() => navigate({ to: "/profile/personal-details" })}
					aria-label="Edit profile"
					className={`flex flex-col items-center self-center ${PRESS}`}
					style={{ gap: cu(8), padding: `0 ${cu(12)}`, borderRadius: cu(12), ...focusRing }}
				>
					<span className="grid place-items-center overflow-hidden rounded-full" style={{ width: cu(64), height: cu(64), background: DISC.avatar, font: f(600, 22, 28, "heading"), color: DISC.badgeInk }}>
						{appUser.photoURL ? <img src={appUser.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : name.slice(0, 1).toUpperCase()}
					</span>
					<span style={{ font: f(600, 20, 25, "heading"), color: "#fff" }}>{name}</span>
					<span style={{ font: f(400, 12, 16), color: DISC.muted }}>{joined ? `Paper investor · joined ${joined}` : "Paper investor"}</span>
					<span style={{ font: f(500, 12, 16), color: "#69B3CA" }}>Edit profile</span>
				</button>

				<section style={card} aria-label="Your taste">
					<p style={{ font: f(500, 11, 14), color: DISC.muted }}>YOUR TASTE</p>
					<div className="flex flex-wrap" style={{ gap: cu(8) }}>
						{tasteChips.map((label) => (
							<span key={label} className="inline-flex items-center whitespace-nowrap" style={{ height: cu(28), borderRadius: cu(14), background: "#1A2333", border: `${cu(1)} solid ${DISC.blue}`, padding: `0 ${cu(12)}`, font: f(500, 12, 16), color: "#69B3CA" }}>{label}</span>
						))}
					</div>
					<p style={{ font: f(400, 12, 16), color: DISC.body }}>Your taste updates as you save stocks.</p>
				</section>

				<section style={card} aria-label="Paper portfolio">
					<div className="flex items-center justify-between" style={{ height: cu(40) }}>
						{stat(paperReady ? wholeUsd(paper.portfolioValue) : "—", "Portfolio")}
						{stat(paperReady ? usd(paper.cash) : "—", "Cash")}
						{stat(paperReady ? String(paper.picks.length) : "—", "Picks")}
					</div>
					{paperReady ? (
						<p style={{ font: f(500, 12, 16), color: up ? DISC.green : DISC.redDown }}>
							{/* The % with the dollars: starts now range from $500 to $10,000, and only a % compares across them. */}
							{up ? "▲" : "▼"} {signedUsd(paper.allTimeGain)} ({signedPct(paper.paperStart > 0 ? (paper.allTimeGain / paper.paperStart) * 100 : 0)}) all time on {wholeUsd(paper.paperStart)} paper
						</p>
					) : (
						<p style={{ font: f(400, 12, 16), color: DISC.muted }}>Set up your practice portfolio in Simulate to start.</p>
					)}
				</section>

				<SettingsCard>
					<SettingsLinkRow label="Notifications" onClick={() => navigate({ to: "/profile/notifications" })} />
					<SettingsLinkRow label="Appearance" onClick={() => navigate({ to: "/profile/appearance" })} />
					<SettingsLinkRow label="Sign-in" onClick={() => navigate({ to: "/profile/sign-in" })} />
					<SettingsLinkRow label="App settings" onClick={() => navigate({ to: "/profile/app-settings" })} />
					<SettingsLinkRow label="Help & support" onClick={() => navigate({ to: "/profile/help-support" })} />
					<SettingsLinkRow label="Invite a friend" onClick={shareInvite} />
				</SettingsCard>

				<button
					type="button"
					onClick={handleLogout}
					className={`w-full ${PRESS}`}
					style={{ height: cu(52), borderRadius: cu(6), border: `${cu(0.36)} solid rgba(52,59,79,0.33)`, font: f(400, 14, 18, "heading"), color: DISC.muted, ...focusRing }}
				>
					Log out
				</button>
			</div>
		</PhonePage>
	);
}
