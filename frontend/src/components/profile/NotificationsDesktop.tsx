import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Bookmark, ChevronRight, Layers, Settings, Sparkles, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAccount } from "@/context/AccountContext";
import { readNotificationPrefs } from "@/lib/notificationPrefs";
import type { NotificationItem } from "@/lib/notifications";
import { DesktopTopBar } from "@/components/desktop/DesktopTopBar";
import { DESK, Panel, PanelHeader, SkeletonBar, deskFocus, deskPageBg } from "@/components/desktop/deskKit";

type Kind = "move" | "deck" | "account";
const FILTERS: ReadonlyArray<readonly ["all" | Kind, string]> = [["all", "All"], ["move", "Price moves"], ["deck", "Your deck"], ["account", "Account"]];

/** What an item is, from its id (Android's format: move:{day}:{ticker}:{up|down}, deck:{day}, first-save, welcome). */
function describe(item: NotificationItem): { kind: Kind; icon: LucideIcon; tint: string; ticker?: string } {
	const [prefix, , ticker, dir] = item.id.split(":");
	if (prefix === "move") return { kind: "move", icon: dir === "down" ? TrendingDown : TrendingUp, tint: dir === "down" ? DESK.red : DESK.green, ticker };
	if (prefix === "deck") return { kind: "deck", icon: Layers, tint: DESK.cyan };
	if (item.id === "first-save") return { kind: "account", icon: Bookmark, tint: DESK.cyan };
	return { kind: "account", icon: Sparkles, tint: DESK.cyan };
}

function PrefRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between py-2 text-[13px]">
			<span style={{ color: DESK.body }}>{label}</span>
			<span className="font-medium text-white">{value}</span>
		</div>
	);
}

/**
 * Notifications on desktop: the inbox (price moves on your saves, today's deck, account nudges) with filters, each
 * item leading somewhere, beside the notification settings in force. Opening it marks everything read - as on the
 * phone and Android - but items that were unread keep their dot for this visit.
 */
export function NotificationsDesktop() {
	const navigate = useNavigate();
	const { account } = useAccount();
	const { items, unread, loaded, markAllRead } = useNotifications();
	const [filter, setFilter] = useState<"all" | Kind>("all");
	const [unreadOnOpen, setUnreadOnOpen] = useState<Set<string> | null>(null);
	const markedRef = useRef(false);
	const prefs = readNotificationPrefs(account?.preferences);

	useEffect(() => {
		if (!loaded || markedRef.current) return;
		markedRef.current = true;
		setUnreadOnOpen(new Set(unread));
		markAllRead();
	}, [loaded, unread, markAllRead]);

	const described = useMemo(() => items.map((item) => ({ item, ...describe(item) })), [items]);
	const shown = described.filter((d) => filter === "all" || d.kind === filter);
	const newCount = unreadOnOpen?.size ?? 0;

	function open(d: (typeof described)[number]) {
		if (d.kind === "move" && d.ticker) navigate({ to: "/stock/$symbol", params: { symbol: d.ticker } });
		else if (d.kind === "deck" || d.item.id === "first-save") navigate({ to: "/discover" });
		else navigate({ to: "/my-stak" });
	}

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-10 pt-5">
				<DesktopTopBar />
				<header className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="font-heading text-[28px] font-semibold leading-[36px] text-white">Notifications</h1>
						<p className="text-[14px]" style={{ color: DESK.muted }}>{!loaded ? "Checking for anything new…" : newCount > 0 ? `${newCount} new since your last visit` : "You're all caught up."}</p>
					</div>
					{items.length > 0 && (
						<div className="flex flex-wrap gap-2" role="group" aria-label="Show">
							{FILTERS.map(([id, label]) => {
								const on = filter === id;
								return (
									<button key={id} type="button" aria-pressed={on} onClick={() => setFilter(id)} className={`rounded-full px-3 py-[6px] text-[12.5px] transition-colors ${deskFocus}`} style={on ? DESK.chipOn : { color: DESK.body, background: "rgba(255,255,255,0.03)", border: `1px solid ${DESK.border}` }}>
										{label}
									</button>
								);
							})}
						</div>
					)}
				</header>

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
					<Panel label="Inbox" className="p-2">
						{!loaded && items.length === 0 ? (
							<div className="flex flex-col gap-3 p-4">{[0, 1, 2].map((i) => <SkeletonBar key={i} width="100%" height={56} />)}</div>
						) : items.length === 0 ? (
							<div className="flex flex-col items-center gap-2 py-14 text-center">
								<Bell className="h-[28px] w-[28px]" style={{ color: DESK.cyan }} aria-hidden="true" />
								<p className="text-[15px] text-white">You're all caught up.</p>
								<p className="text-[13px]" style={{ color: DESK.muted }}>Price moves on your picks and your daily deck land here.</p>
							</div>
						) : shown.length === 0 ? (
							<p className="p-5 text-[13px]" style={{ color: DESK.muted }}>Nothing here with this filter.</p>
						) : (
							<ul className="flex flex-col">
								{shown.map((d, i) => {
									const Icon = d.icon;
									const isNew = unreadOnOpen?.has(d.item.id);
									return (
										<li key={d.item.id} className={i > 0 ? "border-t" : ""} style={{ borderColor: DESK.border }}>
											<button type="button" onClick={() => open(d)} className={`flex w-full items-start gap-4 rounded-[12px] px-4 py-4 text-left transition-colors hover:bg-white/[0.03] ${deskFocus}`}>
												<span className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[10px]" style={{ background: `${d.tint}1F` }}>
													<Icon className="h-[18px] w-[18px]" style={{ color: d.tint }} aria-hidden="true" />
												</span>
												<span className="min-w-0 flex-1">
													<span className="block text-[14.5px] font-semibold text-white">{d.item.title}</span>
													<span className="block text-[13px] leading-[19px]" style={{ color: DESK.body }}>{d.item.body}</span>
													<span className="mt-1 block text-[12px]" style={{ color: DESK.muted }}>{d.item.time}</span>
												</span>
												{isNew && <><span className="mt-2 h-[8px] w-[8px] shrink-0 rounded-full" style={{ background: "#FF8030" }} aria-hidden="true" /><span className="sr-only">New</span></>}
												<ChevronRight className="mt-2 h-[16px] w-[16px] shrink-0" style={{ color: DESK.faint }} aria-hidden="true" />
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</Panel>

					<Panel label="Notification settings" className="gap-2 p-5">
						<PanelHeader icon={Settings} title="Your settings" subtitle="What you get notified about." action="Edit" onAction={() => navigate({ to: "/profile/notifications" })} />
						<div className="flex flex-col divide-y divide-[rgba(255,255,255,0.07)]">
							<PrefRow label="Price alerts" value={prefs.priceAlerts ? `On · moves of ${prefs.priceThreshold}%+` : "Off"} />
							<PrefRow label="Daily deck reminder" value={prefs.dailyDeck ? "On" : "Off"} />
							<PrefRow label="Market news" value={prefs.marketNews ? "On" : "Off"} />
						</div>
					</Panel>
				</div>
			</div>
		</div>
	);
}
