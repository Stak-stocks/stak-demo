import { createFileRoute } from "@tanstack/react-router";
import { useId } from "react";
import { col } from "@/app/FitCanvas";
import { PRICE_THRESHOLDS, useNotificationSettings } from "@/app/notifications/settings";
import { PageHeader } from "@/app/PageHeader";
import { SettingCard, ThresholdChips, ToggleCard } from "@/app/profile/controls";
import { notificationSettings as copy } from "@/app/profile/data";
import { useNotificationsPanel } from "@/app/profile/notifications";

export const Route = createFileRoute("/_app/profile_/notifications")({
	component: NotificationSettingsPage,
});

/**
 * Profile › Notifications: the page both phones open from the hub's Notifications row (android ui/profile/
 * SettingsScreens.kt:137-178 NotificationSettingsScreen, ios Profile/SettingsViews.swift:124-179). Figma's desktop file
 * draws no frame for it, so it is the Profile pages' own layout (Edit profile 2:2555 / Taste & risk 2:2760: the page
 * header, then the 640 column 16 apart) holding the phones' four settings in the desktop's "Permission · Notifications"
 * cards (controls.tsx), in the phones' order, and their caption. Every change is kept in this browser at once and
 * decides what the bell's inbox derives (live/notifications.ts): the move rows at the chosen threshold, the deck rows and
 * the daily brief row. The bell keeps opening the inbox in place.
 *
 * Wiring: the hub's Notifications row pushes it like Edit profile (no motion in either prototype); the browser's Back
 * and the rail's account row return to the hub, as from the other Profile pages. The root names the tab ("Notification
 * settings · STAK", titles.ts: the page is titled "Notifications" like the phones', the tab says which page it is).
 */
function NotificationSettingsPage() {
	const notifications = useNotificationsPanel();
	const [settings, update] = useNotificationSettings();
	const thresholdTitle = useId();
	const thresholdBody = useId();

	return (
		<div className="relative flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={copy.title} onBell={notifications.toggle} />
			{notifications.panel}
			<div className="flex flex-col items-start gap-[16px]" style={{ width: col(640) }}>
				<ToggleCard
					title={copy.priceMoves.title}
					body={copy.priceMoves.body(settings.priceThreshold)}
					on={settings.priceAlerts}
					onChange={(priceAlerts) => update({ priceAlerts })}
				/>
				<SettingCard title={copy.threshold.title} body={copy.threshold.body} titleId={thresholdTitle} bodyId={thresholdBody}>
					<ThresholdChips
						values={PRICE_THRESHOLDS}
						value={settings.priceThreshold}
						onChange={(priceThreshold) => update({ priceThreshold })}
						labelledBy={thresholdTitle}
						describedBy={thresholdBody}
					/>
				</SettingCard>
				<ToggleCard title={copy.dailyDeck.title} body={copy.dailyDeck.body} on={settings.dailyDeck} onChange={(dailyDeck) => update({ dailyDeck })} />
				<ToggleCard title={copy.marketNews.title} body={copy.marketNews.body} on={settings.marketNews} onChange={(marketNews) => update({ marketNews })} />
				{/* the phones' caption (Geist 12, #819ABB), in the desktop's note style (Edit profile 2:2607: Geist 12/16) */}
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:text-pretty">{copy.caption}</p>
			</div>
		</div>
	);
}
