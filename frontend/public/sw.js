// STAK service worker - Web Push only (no offline caching, no fetch handling). It shows the
// notifications the server sends (price moves on saved stocks, the daily deck) and opens the app on tap.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
	let payload = {};
	try {
		payload = event.data ? event.data.json() : {};
	} catch {
		payload = { title: "STAK", body: event.data ? event.data.text() : "" };
	}
	const title = payload.title || "STAK";
	const data = payload.data || {};
	event.waitUntil(
		self.registration.showNotification(title, {
			body: payload.body || "",
			icon: "/web-app-manifest-192x192.png",
			badge: "/favicon-96x96.png",
			// One notification per stock/day rather than a pile: a newer one for the same tag replaces it.
			tag: data.ticker ? `move-${data.ticker}` : data.kind || "stak",
			data,
		}),
	);
});

// Where a tap goes: a saved stock's move -> My STAK, the deck reminder -> Discover, anything else -> Home.
function targetFor(data) {
	if (data && data.kind === "move") return "/my-stak";
	if (data && data.kind === "deck") return "/discover";
	return "/";
}

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = new URL(targetFor(event.notification.data), self.location.origin).href;
	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
			for (const w of windows) {
				if (new URL(w.url).origin === self.location.origin && "focus" in w) {
					w.navigate(url).catch(() => {});
					return w.focus();
				}
			}
			return self.clients.openWindow(url);
		}),
	);
});
