/**
 * Runs `work` once per key at a time: callers that arrive while it's running share its promise instead of starting
 * their own. For cold cache misses that cost a Gemini or news-API call - ten people opening the same stock's tip in
 * the same second make one generation, not ten. Per instance (Cloud Run may run several); the shared cache
 * covers the rest. The key is released when the work settles, so a failure is retried by the next caller.
 */
const inFlight = new Map<string, Promise<unknown>>();

export function singleFlight<T>(key: string, work: () => Promise<T>): Promise<T> {
	const running = inFlight.get(key) as Promise<T> | undefined;
	if (running) return running;
	const p = work().finally(() => inFlight.delete(key));
	inFlight.set(key, p);
	return p;
}
