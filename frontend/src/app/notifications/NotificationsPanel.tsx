import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { type Notice, useNotifications } from "@/app/live/notifications";
import { NT } from "./assets";
import { notifications } from "./data";

/**
 * "Notifications panel" (Figma 2:2728, 420x541) / empty (2:2936, 420x179), anchored 48px under the
 * wordmark row at the content column's right edge (frame position 970,136). Closes on outside click / Esc.
 * The rows are what actually happened (live/notifications); "empty" forces the empty layout.
 */
export function NotificationsPanel({ variant, onClose }: { variant: "list" | "empty"; onClose: () => void }) {
	const inbox = useNotifications();
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	const empty = variant === "empty" || inbox.items.length === 0;

	return (
		<>
			<button type="button" aria-label="Close notifications" onClick={onClose} className="fixed inset-0 z-10 cursor-default" />
			<div
				role="dialog"
				aria-label={notifications.title}
				className={
					empty
						? "absolute right-0 top-[48px] z-20 flex w-[420px] flex-col items-start gap-[12px] rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#0e162b] px-[16px] py-[28px] shadow-[0px_16px_20px_0px_rgba(0,0,0,0.45)]"
						: "absolute right-0 top-[48px] z-20 flex w-[420px] flex-col items-start gap-[12px] rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#0e162b] p-[16px] shadow-[0px_16px_20px_0px_rgba(0,0,0,0.45)]"
				}
			>
				{empty ? <PanelEmpty /> : <PanelList inbox={inbox} onClose={onClose} />}
			</div>
		</>
	);
}

function PanelList({ inbox, onClose }: { inbox: ReturnType<typeof useNotifications>; onClose: () => void }) {
	return (
		<>
			<div className="flex w-full items-center justify-between overflow-clip whitespace-nowrap">
				<span className="font-sora text-[16px] font-semibold leading-[20px] text-white">{notifications.title}</span>
				<button
					type="button"
					onClick={inbox.markAllRead}
					disabled={inbox.unread === 0}
					className="stak-press rounded-[4px] font-geist text-[12px] font-medium leading-[16px] text-[#66b7da] disabled:opacity-50"
				>
					{notifications.markAllRead}
				</button>
			</div>
			{inbox.today.length > 0 && (
				<>
					<p className="w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{notifications.today.label}</p>
					<Group items={inbox.today} onOpen={inbox.markRead} onClose={onClose} />
				</>
			)}
			{inbox.earlier.length > 0 && (
				<>
					<p className="w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{notifications.earlier.label}</p>
					<Group items={inbox.earlier} onOpen={inbox.markRead} onClose={onClose} />
				</>
			)}
		</>
	);
}

/** The frame draws its two groups at 246 (three rows) and 165 (two rows); other counts size to content. */
const GROUP_HEIGHTS: Record<number, number> = { 3: 246, 2: 165 };

function Group({ items, onOpen, onClose }: { items: Notice[]; onOpen: (id: string) => void; onClose: () => void }) {
	const navigate = useNavigate();
	const open = (n: Notice) => {
		onOpen(n.id);
		onClose();
		const [path, query = ""] = n.href.split("?");
		const search: Record<string, string> = {};
		for (const [k, v] of new URLSearchParams(query)) search[k] = v;
		navigate({ to: path as "/", search: search as never });
	};
	return (
		<div className="flex w-full flex-col items-center justify-center overflow-clip rounded-[16px] bg-[#10182b] py-[4px]" style={{ height: GROUP_HEIGHTS[items.length] }}>
			<div className="flex w-full flex-col items-center justify-center gap-[10px]">
				{items.map((item) => (
					<button
						key={item.id}
						type="button"
						onClick={() => open(item)}
						className="stak-press flex w-full items-center gap-[12px] overflow-clip rounded-[14px] bg-[#181f30] p-[16px] text-left"
					>
						<div className="flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip">
							<span className="whitespace-nowrap font-geist text-[14px] font-medium leading-[18px] text-white">{item.title}</span>
							<span className="w-full font-geist text-[11px] leading-[14px] text-[#acafb1]">{item.body}</span>
						</div>
						{item.unread && <img alt="" src={NT.unreadDot} className="size-[8px] shrink-0" />}
					</button>
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
