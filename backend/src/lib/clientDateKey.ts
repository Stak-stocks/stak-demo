/**
 * Validates a client-supplied "today" date string against the server's own
 * notion of today, clamped to within 1 day either side -- wide enough to cover
 * any real timezone difference plus a frontend local-reset boundary (e.g.
 * frontend/src/lib/utils.ts's getTodayKey resets at 9am local time), narrow
 * enough that a client can't repeatedly claim a new day to reset a server-side
 * daily counter (swipe limit, streak) back to its starting state.
 *
 * `serverToday` is caller-provided (YYYY-MM-DD) rather than computed here, so
 * each caller picks the timezone appropriate to what it's protecting -- this
 * is purely the client-vs-server reconciliation, not a timezone decision.
 */
export function sanitizeClientDateKey(clientKey: unknown, serverToday: string): string {
	const candidates = [-1, 0, 1].map((offsetDays) => {
		const d = new Date(serverToday + "T00:00:00Z");
		d.setUTCDate(d.getUTCDate() + offsetDays);
		return d.toISOString().split("T")[0]!;
	});
	if (typeof clientKey === "string" && candidates.includes(clientKey)) {
		return clientKey;
	}
	return candidates[1]!; // server's actual today
}
