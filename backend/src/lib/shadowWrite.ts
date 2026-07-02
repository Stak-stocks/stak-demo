/**
 * Fire a Postgres write alongside an existing Firestore write during the shadow-write
 * period (migration plan, Phases 1-3: write to both stores, read only from Firestore,
 * diff offline, only flip reads once parity is proven). Never throws -- Firestore stays
 * the source of truth and the source of the actual response until a route's reads are
 * explicitly flipped over, so a Postgres-side failure here must never break the
 * user-facing request. Logs loudly instead, since a silent failure here would quietly
 * undermine the whole point of the shadow-write parity check.
 */
export async function shadowWrite(label: string, fn: () => Promise<unknown>): Promise<void> {
	try {
		await fn();
	} catch (err) {
		console.error(`[ShadowWrite:${label}] failed:`, (err as Error).message);
	}
}
