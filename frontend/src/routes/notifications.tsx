import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
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
	const [unreadOnOpen, setUnreadOnOpen] = useState<Set<string> | null>(null);
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
								<div className="flex items-center" style={{ gap: cu(12), padding: `${cu(12)} ${cu(14)}` }}>
									<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(36), height: cu(36), background: "#1A2333", font: f(600, 14, undefined, "heading"), color: DISC.teal }} aria-hidden="true">
										{item.title.slice(0, 1).toUpperCase()}
									</span>
									<div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
										<p style={{ font: f(500, 14, 18), color: "#fff" }}>{item.title}</p>
										<p style={{ font: f(400, 12, 16), color: DISC.body }}>{item.body}</p>
										<p style={{ font: f(400, 11), color: DISC.muted }}>{item.time}</p>
									</div>
									{unreadOnOpen?.has(item.id)
										? <span className="shrink-0 rounded-full" style={{ width: cu(6), height: cu(6), background: "#FF8030" }} role="img" aria-label="Unread" />
										: <span className="shrink-0" style={{ width: cu(6), height: cu(6) }} aria-hidden="true" />}
								</div>
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
