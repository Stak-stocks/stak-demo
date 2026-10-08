// Browser push notifications (Web Push). The service worker (public/sw.js) shows them; this file
// subscribes the browser and tells the backend where to send. The backend keeps a subscription as a
// push_devices row (platform "web", token = the subscription's endpoint URL), next to Android's.
import { deletePushDevice, getWebPushKey, putPushDevice } from "@/lib/api";
import type { NotificationPrefs } from "@/lib/notificationPrefs";

export type EnableResult = "enabled" | "denied" | "unsupported" | "unavailable" | "failed";

/** The notification settings a browser's push registration carries. */
export type PushPrefs = Pick<NotificationPrefs, "priceAlerts" | "dailyDeck" | "priceThreshold">;

export function webPushSupported(): boolean {
	return typeof window !== "undefined"
		&& "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
	const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(padded);
	const out = new Uint8Array(new ArrayBuffer(raw.length));
	for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
	return out;
}

async function serviceWorker(): Promise<ServiceWorkerRegistration> {
	await navigator.serviceWorker.register("/sw.js");
	return navigator.serviceWorker.ready;
}

/** This browser's existing subscription, if it has one (does not prompt or register anything new). */
export async function currentSubscription(): Promise<PushSubscription | null> {
	if (!webPushSupported()) return null;
	const reg = await navigator.serviceWorker.getRegistration("/sw.js");
	return (await reg?.pushManager.getSubscription()) ?? null;
}

async function register(sub: PushSubscription, prefs: PushPrefs): Promise<void> {
	const json = sub.toJSON();
	const keys = json.keys;
	if (!json.endpoint || !keys?.p256dh || !keys?.auth) throw new Error("incomplete push subscription");
	await putPushDevice({
		token: json.endpoint,
		platform: "web",
		webKeys: { p256dh: keys.p256dh, auth: keys.auth },
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		priceAlerts: prefs.priceAlerts,
		dailyDeck: prefs.dailyDeck,
		priceThreshold: prefs.priceThreshold,
	});
}

/** Asks permission (if not yet decided), subscribes this browser, and registers it with the backend. */
export async function enableWebPush(prefs: PushPrefs): Promise<EnableResult> {
	if (!webPushSupported()) return "unsupported";
	try {
		const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
		if (permission !== "granted") return "denied";

		let publicKey: string;
		try {
			publicKey = (await getWebPushKey()).publicKey;
		} catch {
			return "unavailable"; // the server has no VAPID keys configured
		}
		const reg = await serviceWorker();
		const sub = (await reg.pushManager.getSubscription())
			?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
		await register(sub, prefs);
		return "enabled";
	} catch {
		return "failed";
	}
}

/** Re-sends the alert switches for an existing subscription (a no-op when this browser isn't subscribed). */
export async function syncWebPushPrefs(prefs: PushPrefs): Promise<void> {
	const sub = await currentSubscription();
	if (sub) await register(sub, prefs);
}

let loadSynced = false;
/**
 * Once per page load, after the account is read: this browser's registration catches up with the account's settings
 * (changed in another browser, or saved before the server kept the threshold) - the apps do the same at launch.
 */
export function syncWebPushPrefsOnLoad(prefs: PushPrefs): void {
	if (loadSynced || !webPushSupported()) return;
	loadSynced = true;
	void syncWebPushPrefs(prefs).catch(() => {});
}

/** Unsubscribes this browser and tells the backend to stop sending to it. Safe to call when not subscribed. */
export async function disableWebPush(): Promise<void> {
	const sub = await currentSubscription();
	if (!sub) return;
	const endpoint = sub.endpoint;
	await deletePushDevice(endpoint).catch(() => {});
	await sub.unsubscribe().catch(() => {});
}
