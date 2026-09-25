/**
 * Shared cache layer.
 *
 * Uses Redis when REDIS_URL is set (production), falls back to an in-process
 * Map when it isn't (local dev, no behaviour change).
 *
 * All functions are async so callers work identically against both backends.
 */

import Redis from "ioredis";

// ── Redis client (optional) ───────────────────────────────────────────────────

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
	redis = new Redis(process.env.REDIS_URL, {
		enableOfflineQueue: false,
		// Keeps trying: returning null here told ioredis to stop reconnecting for good, so
		// one blip left the instance on its in-memory fallback for the rest of its life -
		// and every per-day cache became per-instance without saying so.
		retryStrategy: (times) => Math.min(times * 200, 5000),
		connectTimeout: 5000,
		lazyConnect: true,
	});

	redis.connect().catch((err: Error) => {
		console.warn("[Cache] Redis connection failed — falling back to memory:", err.message);
		redis = null;
	});

	redis.on("error", (err: Error) => {
		// Suppress repeated ECONNREFUSED noise; ioredis will retry per strategy above
		if ((err as NodeJS.ErrnoException).code !== "ECONNREFUSED") {
			console.warn("[Cache] Redis error:", err.message);
		}
	});

	redis.on("connect", () => console.log("[Cache] Redis connected"));

	// A closed client is not a usable one; dropping it makes the fallback deliberate
	// rather than a dead object throwing on every call.
	redis.on("end", () => {
		console.warn("[Cache] Redis connection ended - using memory until it returns");
	});
}

// ── In-memory fallback ────────────────────────────────────────────────────────

const mem = new Map<string, { data: unknown; expiresAt: number }>();
/** The fallback never evicted, so an instance running on it grew without limit. */
const MEM_MAX_ENTRIES = 2000;

function memSet(key: string, data: unknown, expiresAt: number): void {
	if (mem.size >= MEM_MAX_ENTRIES) {
		const now = Date.now();
		for (const [k, v] of mem) if (v.expiresAt <= now) mem.delete(k);
		// Still full of live entries: the oldest inserted goes, as a Map keeps its order.
		if (mem.size >= MEM_MAX_ENTRIES) {
			const oldest = mem.keys().next().value;
			if (oldest !== undefined) mem.delete(oldest);
		}
	}
	mem.set(key, { data, expiresAt });
}

// ── Public API ────────────────────────────────────────────────────────────────

const PREFIX = "stak:";

/**
 * Retrieve a cached value.
 * Returns null on miss, expired entry, or any error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
	if (redis) {
		try {
			const raw = await redis.get(PREFIX + key);
			if (raw == null) return null;
			return JSON.parse(raw) as T;
		} catch {
			// Redis error — fall through to memory
		}
	}

	const entry = mem.get(key);
	if (entry && entry.expiresAt > Date.now()) return entry.data as T;
	return null;
}

/**
 * Store a value with a TTL in milliseconds.
 * Silently no-ops on error so callers never have to catch.
 */
export async function cacheSet(key: string, data: unknown, ttlMs: number): Promise<void> {
	if (redis) {
		try {
			await redis.setex(PREFIX + key, Math.ceil(ttlMs / 1000), JSON.stringify(data));
			return;
		} catch {
			// Redis error — fall through to memory
		}
	}

	memSet(key, data, Date.now() + ttlMs);
}

export async function cacheDelete(key: string): Promise<void> {
	if (redis) {
		try {
			await redis.del(PREFIX + key);
			return;
		} catch {
			// Redis error — fall through to memory
		}
	}
	mem.delete(key);
}
