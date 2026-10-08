import { useEffect } from "react";
import { NT } from "./assets";
import { type NotificationItem, notifications } from "./data";

/**
 * "Notifications panel" (Figma 2:2728, 420x541) / empty (2:2936, 420x179), anchored 48px under the
 * wordmark row at the content column's right edge (frame position 970,136). Closes on outside click / Esc.
 */
export function NotificationsPanel({ variant, onClose }: { variant: "list" | "empty"; onClose: () => void }) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<>
			<button type="button" aria-label="Close notifications" onClick={onClose} className="fixed inset-0 z-10 cursor-default" />
			<div
				role="dialog"
				aria-label={notifications.title}
				className={
					variant === "list"
						? "absolute right-0 top-[48px] z-20 flex w-[420px] flex-col items-start gap-[12px] rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#0e162b] p-[16px] shadow-[0px_16px_20px_0px_rgba(0,0,0,0.45)]"
						: "absolute right-0 top-[48px] z-20 flex w-[420px] flex-col items-start gap-[12px] rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#0e162b] px-[16px] py-[28px] shadow-[0px_16px_20px_0px_rgba(0,0,0,0.45)]"
				}
			>
				{variant === "list" ? <PanelList /> : <PanelEmpty />}
			</div>
		</>
	);
}

function PanelList() {
	return (
		<>
			<div className="flex w-full items-center justify-between overflow-clip whitespace-nowrap">
				<span className="font-sora text-[16px] font-semibold leading-[20px] text-white">{notifications.title}</span>
				<button type="button" className="font-geist text-[12px] font-medium leading-[16px] text-[#66b7da]">
					{notifications.markAllRead}
				</button>
			</div>
			<p className="w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{notifications.today.label}</p>
			<Group items={notifications.today.items} height={246} />
			<p className="w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{notifications.earlier.label}</p>
			<Group items={notifications.earlier.items} height={165} />
		</>
	);
}

function Group({ items, height }: { items: readonly NotificationItem[]; height: number }) {
	return (
		<div className="flex w-full flex-col items-center justify-center overflow-clip rounded-[16px] bg-[#10182b] py-[4px]" style={{ height }}>
			<div className="flex w-full flex-col items-center justify-center gap-[10px]">
				{items.map((item) => (
					<div key={item.title} className="flex w-full items-center gap-[12px] overflow-clip rounded-[14px] bg-[#181f30] p-[16px]">
						<div className="flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip">
							<span className="whitespace-nowrap font-geist text-[14px] font-medium leading-[18px] text-white">{item.title}</span>
							<span className="w-full font-geist text-[11px] leading-[14px] text-[#acafb1]">{item.body}</span>
						</div>
						{item.unread && <img alt="" src={NT.unreadDot} className="size-[8px] shrink-0" />}
					</div>
				))}
			</div>
		</div>
	);
}

function PanelEmpty() {
	return (
		<>
			<div className="flex w-full items-center justify-between overflow-clip">
				<span className="whitespace-nowrap font-sora text-[16px] font-semibold leading-[20px] text-white">{notifications.title}</span>
			</div>
			<div className="h-[8px] w-[10px]" />
			<div className="flex w-full flex-col items-center justify-center gap-[12px] text-center">
				<p className="w-full font-sora text-[20px] font-semibold leading-[25px] text-white">{notifications.empty.title}</p>
				<p className="w-[242px] font-geist text-[12px] leading-[16px] text-[#819abb]">{notifications.empty.body}</p>
			</div>
		</>
	);
}
