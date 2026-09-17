import { pgQuery } from "../lib/postgres.js";

/**
 * Sends push notifications through Firebase Cloud Messaging's HTTP v1 API.
 *
 * On Cloud Run the service's own identity signs the request: the access token comes
 * from the metadata server, and the service account's Editor role carries FCM's send
 * permission - no key file or secret. Off Cloud Run (local dev) there is no metadata
 * server, so sends are skipped with a log line rather than failing the caller.
 */
const FCM_PROJECT = process.env.FIREBASE_PROJECT_ID ?? "stak-c21a3";
const METADATA_TOKEN_URL =
	"http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string | null> {
	if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.value;
	try {
		const res = await fetch(METADATA_TOKEN_URL, {
			headers: { "Metadata-Flavor": "Google" },
			signal: AbortSignal.timeout(3000),
		});
		if (!res.ok) return null;
		const data = await res.json() as { access_token?: string; expires_in?: number };
		if (!data.access_token) return null;
		cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 300) * 1000 };
		return cachedToken.value;
	} catch {
		return null;
	}
}

export type PushResult = "sent" | "unregistered" | "failed";

/**
 * One notification to one device. [data] rides along for the app to route the tap
 * (e.g. { kind: "move", ticker: "NVDA" }). A token FCM reports as no longer valid is
 * deleted, so an uninstalled app stops being sent to.
 */
export async function sendPush(
	token: string,
	title: string,
	body: string,
	data: Record<string, string> = {},
): Promise<PushResult> {
	const bearer = await accessToken();
	if (!bearer) {
		console.warn("[push] no access token (not on Cloud Run?) - skipping send");
		return "failed";
	}
	try {
		const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT}/messages:send`, {
			method: "POST",
			headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
			body: JSON.stringify({
				message: {
					token,
					notification: { title, body },
					data,
					android: { priority: "high", notification: { channel_id: "stak_alerts" } },
				},
			}),
			signal: AbortSignal.timeout(8000),
		});
		if (res.ok) return "sent";
		const err = await res.text().catch(() => "");
		if (res.status === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT.*token/i.test(err)) {
			await pgQuery(`delete from push_devices where token = $1`, [token]).catch(() => {});
			return "unregistered";
		}
		console.warn(`[push] send failed ${res.status}: ${err.slice(0, 200)}`);
		return "failed";
	} catch (e) {
		console.warn(`[push] send error: ${(e as Error)?.message}`);
		return "failed";
	}
}
