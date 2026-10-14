import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useNotifications, useOpenNotification } from "@/hooks/useNotifications";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationsDesktop } from "@/components/profile/NotificationsDesktop";
import { SettingsCard, SettingsLinkRow, SettingsScaffold } from "@/components/profile/ProfileKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { f, darkCard } from "@/components/phone/phone";

export const Route = createFileRoute("/notifications")({
	component: NotificationsRoute,
});

/** Desktop: a filterable inbox whose items lead somewhere, beside the settings in force; the phone keeps Android's card. */
function NotificationsRoute() {
	return useIsMobile() ? <NotificationsPage /> : <NotificationsDesktop />;
}

/**
 * Android's Notifications screen: one card of rows (initial, title, body, time, an orange unread dot) and a link to
 * the settings. Opening it marks everything read, but the page remembers which rows were unread when it opened so their
 * dots stay for this visit - like Android's readBefore. Rows aren't tappable.
 */
function NotificationsPage() {
	const navigate = useNavigate();
	const { items, unread, loaded, markAllRead } = useNotifications();
	const openTarget = useOpenNotification();
	const [unreadOnOpen, setUnreadOnOpen] = useState<Set<string> | null>(null);
	// Opened is read: a tapped item's dot doesn't wait for the next visit.
	const seen = (id: string) => setUnreadOnOpen((cur) => (cur?.has(id) ? new Set([...cur].filter((x) => x !== id)) : cur));
	const markedRef = useRef(false);

	useEffect(() => {
		if (!loaded || markedRef.current) return;
		markedRef.current = true;
		setUnreadOnOpen(new Set(unread));
		markAllRead();
	}, [loaded, unread, markAllRead]);

	return (
		<SettingsScaffold title="Notifications" backTo="/" gap={14}>
			{items.length === 0 ? (
				<section style={{ display: "flex", flexDirection: "column", gap: cu(6), ...darkCard(16), padding: cu(16) }}>
					<p style={{ font: f(600, 15, undefined, "heading"), color: "#fff" }}>You’re all caught up.</p>
					<p style={{ font: f(400, 13, 19), color: DISC.muted }}>Price moves on your picks and your daily deck land here.</p>
				</section>
			) : (
				<section style={{ ...darkCard(16) }}>
					<ul>
						{items.map((item, i) => (
							<li key={item.id}>
								{i > 0 && <div style={{ height: cu(1), margin: `0 ${cu(14)}`, background: "#1A2333" }} />}
								{/* A row opens what it's about - the stock, or Discover (as the apps). */}
								<button type="button" onClick={() => { seen(item.id); openTarget(item.target); }} className="flex w-full items-center text-left transition-opacity active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2" style={{ gap: cu(12), padding: `${cu(12)} ${cu(14)}`, outlineColor: DISC.teal }}>
									<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(36), height: cu(36), background: "#1A2333", font: f(600, 14, undefined, "heading"), color: DISC.teal }} aria-hidden="true">
										{item.title.slice(0, 1).toUpperCase()}
									</span>
									{/* Spans, not div/p: a button holds phrasing content only. */}
									<span className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
										<span className="block" style={{ font: f(500, 14, 18), color: "#fff" }}>{item.title}</span>
										<span className="block" style={{ font: f(400, 12, 16), color: DISC.body }}>{item.body}</span>
										<span className="block" style={{ font: f(400, 11), color: DISC.muted }}>{item.time}</span>
									</span>
									{unreadOnOpen?.has(item.id)
										? <span className="shrink-0 rounded-full" style={{ width: cu(6), height: cu(6), background: "#FF8030" }} role="img" aria-label="Unread" />
										: <span className="shrink-0" style={{ width: cu(6), height: cu(6) }} aria-hidden="true" />}
								</button>
							</li>
						))}
					</ul>
				</section>
			)}

			<SettingsCard>
				<SettingsLinkRow label="Notification settings" onClick={() => navigate({ to: "/profile/notifications" })} />
			</SettingsCard>
		</SettingsScaffold>
	);
}
