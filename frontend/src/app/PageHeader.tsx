import { Link } from "@tanstack/react-router";
import { A } from "./assets";
import { useNotifications } from "./live/notifications";

/** "Wordmark row" (logo + notification bell) and the page title, as on Home / Profile / Notifications. */
export function PageHeader({ title, onBell }: { title: string; onBell?: () => void }) {
	const { unread } = useNotifications();
	return (
		<div className="flex w-full flex-col items-start gap-[18px]">
			<div className="flex h-[40px] w-full items-center justify-between overflow-clip">
				<Wordmark />
				<button
					type="button"
					aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
					onClick={onBell}
					className="stak-press relative size-[35px] shrink-0 rounded-full"
				>
					{/* the bell without its badge (Group 1000002393); the badge (Ellipse 467) only while something is unread */}
					<img alt="" src={A.bellQuiet} className="absolute inset-0 size-full" />
					{unread > 0 && (
						<img alt="" src={A.bellDot} className="absolute h-[5.833px] w-[5.833px]" style={{ left: 23.333, top: 8.75 }} />
					)}
				</button>
			</div>
			<h1 className="w-full font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{title}</h1>
		</div>
	);
}

export function Wordmark() {
	return (
		<Link to="/home" aria-label="STAK" className="stak-press relative block h-[31.774px] w-[130.965px] shrink-0 rounded-[6px]">
			<img alt="" src={A.wordmarkIcon} className="absolute left-0 top-0 size-[31.774px]" />
			<img alt="" src={A.wordmarkText} className="absolute left-[37.17px] top-[6.92px] h-[17.979px] w-[93.795px]" />
		</Link>
	);
}
