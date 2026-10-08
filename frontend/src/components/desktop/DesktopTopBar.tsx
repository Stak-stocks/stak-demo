import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useGreeting } from "@/components/home/HomeHeader";
import { DESK, deskFocus } from "./deskKit";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const openSearch = () => window.dispatchEvent(new Event("open-search"));

/** Desktop page header: the search field (opens the search overlay, as ⌘K / Ctrl+K does anywhere - see __root.tsx),
 *  the bell and the account chip. `extra` sits just left of the bell (Discover's daily progress). */
export function DesktopTopBar({ extra }: { extra?: ReactNode }) {
	const navigate = useNavigate();
	const { appUser } = useAuth();
	const { unreadCount } = useNotifications();
	const name = useGreeting().name || "Profile";

	return (
		<header className="flex items-center gap-4">
			<button
				type="button"
				onClick={openSearch}
				className={`flex h-[40px] min-w-0 max-w-[560px] flex-1 items-center gap-3 rounded-[10px] px-4 text-left text-[13px] transition-colors hover:border-[rgba(105,179,202,0.3)] ${deskFocus}`}
				style={{ background: DESK.panel, border: `1px solid ${DESK.border}`, color: DESK.muted }}
			>
				<Search className="h-[16px] w-[16px] shrink-0" aria-hidden="true" />
				<span className="flex-1 truncate">Search for companies or tickers…</span>
				<kbd className="rounded-[5px] px-[6px] py-[1px] font-sans text-[11px]" style={{ background: DESK.track, color: DESK.muted }}>{isMac ? "⌘K" : "Ctrl K"}</kbd>
			</button>
			<div className="flex-1" />
			{extra}
			<button
				type="button"
				onClick={() => navigate({ to: "/notifications" })}
				aria-label={unreadCount > 0 ? "Notifications, unread" : "Notifications"}
				className={`relative grid h-[40px] w-[40px] place-items-center rounded-full transition-colors hover:bg-white/[0.05] ${deskFocus}`}
			>
				<Bell className="h-[19px] w-[19px]" style={{ color: DESK.body }} aria-hidden="true" />
				{unreadCount > 0 && <span className="absolute right-[9px] top-[8px] h-[8px] w-[8px] rounded-full" style={{ background: "#FF8030" }} aria-hidden="true" />}
			</button>
			<button
				type="button"
				onClick={() => navigate({ to: "/profile" })}
				className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-white/[0.05] ${deskFocus}`}
			>
				<span className="grid h-[34px] w-[34px] place-items-center overflow-hidden rounded-full text-[14px] font-semibold" style={{ background: DESK.cyan, color: DESK.bg }}>
					{appUser?.photoURL ? <img src={appUser.photoURL} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
				</span>
				<span className="text-[13.5px] font-medium text-white">{name}</span>
			</button>
		</header>
	);
}
