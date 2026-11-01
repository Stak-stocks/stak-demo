import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { capitalizeWords } from "@/lib/utils";
import stakMark from "@/assets/stak-logo-icon.svg";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";
import { AskAiHeaderButton } from "@/components/stakAi/open";

/** "Good Morning" 5-11, "Good Afternoon" 12-16, otherwise "Good Evening" (Android's Greeting.kt). */
export function greetingFor(hour: number): string {
	if (hour >= 5 && hour <= 11) return "Good Morning";
	if (hour >= 12 && hour <= 16) return "Good Afternoon";
	return "Good Evening";
}

/** The greeting for the current hour (re-read every 30s so it rolls over at noon and 5pm without a reload) and
 *  the signed-in user's display name, capitalised; `name` is "" when the account has none. */
export function useGreeting(): { greeting: string; name: string } {
	const { appUser } = useAuth();
	const [hour, setHour] = useState(() => new Date().getHours());
	useEffect(() => {
		const t = setInterval(() => setHour(new Date().getHours()), 30_000);
		return () => clearInterval(t);
	}, []);
	return { greeting: greetingFor(hour), name: capitalizeWords(appUser?.displayName ?? "") };
}

/** The STAK wordmark; `width` defaults to Android's 78.16u. */
export function Wordmark({ width = cu(78.16) }: { width?: string | number }) {
	return (
		<svg viewBox="0 0 78.163 14.983" style={{ width, height: "auto" }} role="img" aria-label="STAK" fill="#fff">
			<path d="M0 2.92879C0 1.89388 0.276892 1.14716 0.830674 0.688633C1.38446 0.230108 2.33299 0.000844844 3.67708 0.000844844H11.9854C13.3295 0.000844844 14.278 0.230108 14.8318 0.688633C15.3856 1.14716 15.6625 1.89388 15.6625 2.92879V3.61012L12.3253 4.15502V2.58893H3.33641V5.92615H11.9854C13.3295 5.92615 14.278 6.15541 14.8318 6.61394C15.3856 7.07246 15.6625 7.81918 15.6625 8.85409V11.9185C15.6625 13.0171 15.3905 13.8026 14.8456 14.2749C14.3007 14.7471 13.3473 14.9828 11.9854 14.9828H3.67708C2.31523 14.9828 1.36185 14.7471 0.816949 14.2749C0.272047 13.8026 0 13.0171 0 11.9185V10.7608L3.33722 10.2159V12.2591H12.3261V8.37781H3.67708C2.31523 8.37781 1.36185 8.14209 0.816949 7.66984C0.272047 7.19759 0 6.41212 0 5.31344V2.92959V2.92879Z" />
			<path d="M30.1824 14.982H26.8451V2.58808H20.1715V0H36.856V2.58808H30.1824V14.982Z" />
			<path d="M47.9177 0L56.2261 14.982H52.6443L50.8328 11.7134H41.2715L39.46 14.982H36.1914L44.4998 0H47.9185H47.9177ZM42.6334 9.26172H49.4709L46.0521 3.09181L42.6334 9.26172Z" />
			<path d="M61.3137 14.982V0H64.651V6.11501L71.9107 0H76.4055L67.9341 7.0143L78.1629 14.982H73.0691L64.6518 8.34871V14.982H61.3145H61.3137Z" />
		</svg>
	);
}

/** Android's TopNav: mark + wordmark, the bell (with an orange dot when something is unread) and the profile
 *  circle, then the greeting. It scrolls with the page - Android has no sticky header on Home. */
export function HomeHeader() {
	const navigate = useNavigate();
	const { appUser } = useAuth();
	const { unreadCount } = useNotifications();
	const { greeting, name } = useGreeting();

	return (
		<header style={{ padding: `${cu(22)} ${cu(17)} 0` }}>
			<div className="flex items-center" style={{ height: cu(35) }}>
				<img src={stakMark} alt="" style={{ width: cu(26.48), height: cu(26.48) }} draggable={false} />
				<div style={{ width: cu(4.49) }} />
				<Wordmark />
				<div className="flex-1" />
				{/* STAK AI (2026-10-01): its own way in, beside the bell - as on Android. */}
				<AskAiHeaderButton size={35} background={DISC.navCircle} />
				<div style={{ width: cu(4) }} />
				<button
					type="button"
					onClick={() => navigate({ to: "/notifications" })}
					aria-label={unreadCount > 0 ? "Notifications, unread" : "Notifications"}
					className={`relative ${PRESS}`}
					style={{ width: cu(35), height: cu(35), ...focusRing }}
				>
					<svg viewBox="0 0 35 35" style={{ width: "100%", height: "100%" }} fill="none" aria-hidden="true">
						<circle cx="17.5" cy="17.5" r="17.5" fill={DISC.navCircle} />
						<path d="M19.524 21.5492V22.0553C19.524 22.5921 19.3107 23.1069 18.9311 23.4865C18.5516 23.8661 18.0367 24.0793 17.4999 24.0793C16.9631 24.0793 16.4483 23.8661 16.0687 23.4865C15.6891 23.1069 15.4758 22.5921 15.4758 22.0553V21.5492M22.9295 20.5192C22.1173 19.5252 21.5439 19.0191 21.5439 16.2787C21.5439 13.7692 20.2625 12.8751 19.2077 12.4409C19.0676 12.3833 18.9357 12.2511 18.893 12.1072C18.708 11.4775 18.1894 10.9228 17.4999 10.9228C16.8105 10.9228 16.2915 11.4779 16.1083 12.1079C16.0657 12.2533 15.9338 12.3833 15.7937 12.4409C14.7377 12.8757 13.4574 13.7667 13.4574 16.2787C13.4559 19.0191 12.8825 19.5252 12.0703 20.5192C11.7338 20.9309 12.0286 21.5492 12.6171 21.5492H22.3858C22.9712 21.5492 23.2641 20.929 22.9295 20.5192Z" stroke="#AEAEAE" strokeWidth="1.01204" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					{unreadCount > 0 && (
						<span className="absolute rounded-full" style={{ left: cu(23.333), top: cu(8.75), width: cu(5.833), height: cu(5.833), background: "#FF8030" }} aria-hidden="true" />
					)}
				</button>
				<div style={{ width: cu(4) }} />
				<button
					type="button"
					onClick={() => navigate({ to: "/profile" })}
					aria-label="Profile"
					className={`grid place-items-center overflow-hidden rounded-full ${PRESS}`}
					style={{ width: cu(35), height: cu(35), background: DISC.navCircle, ...focusRing }}
				>
					{appUser?.photoURL ? (
						<img src={appUser.photoURL} alt="" className="h-full w-full object-cover" />
					) : (
						<svg viewBox="0 0 12.9886 13.6365" style={{ width: cu(12.99), height: cu(13.64), transform: `translate(${cu(0.99)}, ${cu(-0.68)})` }} fill="none" aria-hidden="true">
							<circle cx="6.1406" cy="3.0071" r="2.5775" stroke="#AEAEAE" strokeWidth="0.859164" />
							<path d="M6.49414 8.3234C8.22296 8.3234 9.75951 8.64301 10.8418 9.13492C11.9774 9.6511 12.3984 10.2434 12.3984 10.6847C12.3983 11.126 11.9772 11.7184 10.8418 12.2345C9.75952 12.7264 8.22288 13.0461 6.49414 13.0461C4.76534 13.046 3.22875 12.7264 2.14648 12.2345C1.01106 11.7184 0.590948 11.126 0.59082 10.6847C0.59082 10.2435 1.01094 9.65109 2.14648 9.13492C3.22875 8.64298 4.76529 8.32342 6.49414 8.3234Z" stroke="#AEAEAE" strokeWidth="1.18078" />
						</svg>
					)}
				</button>
			</div>
			<h1 style={{ marginTop: cu(10), font: f(600, 16, 20, "heading"), color: "#fff" }}>{greeting}, {name || "there"}</h1>
		</header>
	);
}
