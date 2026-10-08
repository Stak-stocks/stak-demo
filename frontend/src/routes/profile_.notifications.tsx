import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";
import { updateProfile } from "@/lib/api";
import { PRICE_THRESHOLDS } from "@stak/shared";
import { readNotificationPrefs, type NotificationPrefs } from "@/lib/notificationPrefs";
import { currentSubscription, disableWebPush, enableWebPush, syncWebPushPrefs, webPushSupported } from "@/lib/webPush";
import { Caption, NoticeCard, PermissionCard, SettingsScaffold } from "@/components/profile/ProfileKit";
import { cu } from "@/components/discover/discoverTheme";
import { SettingsChip, f, sheetCard } from "@/components/phone/phone";

export const Route = createFileRoute("/profile_/notifications")({
	component: NotificationSettingsPage,
});

/** Android's Notifications settings: what to be nudged about, and how big a price move counts. Choices save to the
 *  account as they change and steer the inbox; "Browser notifications" subscribes this browser to real push alerts. */
function NotificationSettingsPage() {
	const { account } = useAccount();
	const [prefs, setPrefs] = useState<NotificationPrefs>(readNotificationPrefs(account?.preferences));
	const blocked = typeof Notification !== "undefined" && Notification.permission === "denied";
	const pushSupported = webPushSupported();
	const [browserOn, setBrowserOn] = useState(false);
	const [browserBusy, setBrowserBusy] = useState(false);

	useEffect(() => {
		if (!pushSupported) return;
		currentSubscription().then((sub) => setBrowserOn(!!sub && Notification.permission === "granted")).catch(() => {});
	}, [pushSupported]);

	async function toggleBrowser(on: boolean) {
		setBrowserBusy(true);
		try {
			if (!on) { await disableWebPush(); setBrowserOn(false); return; }
			const result = await enableWebPush({ priceAlerts: prefs.priceAlerts, dailyDeck: prefs.dailyDeck, priceThreshold: prefs.priceThreshold });
			setBrowserOn(result === "enabled");
			if (result === "denied") toast.error("Notifications are blocked for STAK in this browser. Allow them in the site settings first.");
			else if (result === "unavailable") toast.error("Browser notifications aren't available right now. Try again later.");
			else if (result === "unsupported") toast.error("This browser doesn't support notifications.");
			else if (result === "failed") toast.error("Couldn't turn notifications on. Try again.");
			else toast.success("Browser notifications are on");
		} finally {
			setBrowserBusy(false);
		}
	}

	async function change(next: NotificationPrefs) {
		const previous = prefs;
		setPrefs(next);
		try {
			// The whole preferences object goes back so no other key (Android's saved stocks, taste) is lost.
			await updateProfile({ preferences: { ...(account?.preferences ?? {}), web_notifications: next } });
			await syncWebPushPrefs({ priceAlerts: next.priceAlerts, dailyDeck: next.dailyDeck, priceThreshold: next.priceThreshold }).catch(() => {});
		} catch {
			setPrefs(previous);
			toast.error("Couldn't save that. Try again.");
		}
	}

	return (
		<SettingsScaffold title="Notifications">
			{blocked && <NoticeCard title="Notifications are off for STAK" body="Turn them on in your browser’s site settings to get price moves and your daily deck." />}
			{pushSupported && (
				<PermissionCard title="Browser notifications" sub="Get the alerts below on this device, even when STAK isn't open." checked={browserOn} disabled={browserBusy || blocked} onChange={toggleBrowser} />
			)}
			<PermissionCard
				title="Price moves on your picks"
				sub={`A nudge when a saved stock moves ${prefs.priceThreshold}% or more.`}
				checked={prefs.priceAlerts}
				onChange={(v) => change({ ...prefs, priceAlerts: v })}
			/>
			<div style={{ display: "flex", flexDirection: "column", gap: cu(10), ...sheetCard(14), padding: cu(16) }}>
				<span style={{ font: f(500, 14), color: "#fff" }}>Price threshold</span>
				<span style={{ font: f(400, 11), color: "#ACAFB1" }}>Only moves at least this big get a nudge.</span>
				<div className="flex" style={{ gap: cu(8) }} role="radiogroup" aria-label="Price threshold">
					{PRICE_THRESHOLDS.map((pct) => (
						<SettingsChip key={pct} label={`${pct}%`} selected={prefs.priceThreshold === pct} onClick={() => change({ ...prefs, priceThreshold: pct })} />
					))}
				</div>
			</div>
			<PermissionCard title="Daily deck" sub="One reminder when a fresh deck lands each morning." checked={prefs.dailyDeck} onChange={(v) => change({ ...prefs, dailyDeck: v })} />
			<PermissionCard title="Market news" sub="The stories behind the moves, a few times a week." checked={prefs.marketNews} onChange={(v) => change({ ...prefs, marketNews: v })} />
			<Caption>You can change these any time.</Caption>
		</SettingsScaffold>
	);
}
