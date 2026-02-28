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
		retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
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
}

// ── In-memory fallback ────────────────────────────────────────────────────────

const mem = new Map<string, { data: unknown; expiresAt: number }>();

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

	mem.set(key, { data, expiresAt: Date.now() + ttlMs });
}
