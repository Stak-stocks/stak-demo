import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheGet, cacheSet } from "../cache.js";

// cache.ts uses a module-level Map — use unique keys per test to avoid cross-test contamination

describe("cache (in-memory fallback)", () => {
	beforeEach(() => {
		// Ensure REDIS_URL is not set so we always exercise the in-memory path
		delete process.env.REDIS_URL;
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns null on a cache miss", async () => {
		const result = await cacheGet("nonexistent-key-xyz");
		expect(result).toBeNull();
	});

	it("returns the stored value immediately after cacheSet", async () => {
		await cacheSet("test-basic", { hello: "world" }, 60_000);
		const result = await cacheGet<{ hello: string }>("test-basic");
		expect(result).toEqual({ hello: "world" });
	});

	it("returns null after the TTL has expired", async () => {
		await cacheSet("test-ttl", { value: 42 }, 5_000);

		// Advance time past the TTL
		vi.advanceTimersByTime(6_000);

		const result = await cacheGet("test-ttl");
		expect(result).toBeNull();
	});

	it("JSON round-trips complex objects correctly", async () => {
		const payload = {
			nested: { a: 1, b: [true, false, null] },
			str: "hello",
			num: 3.14,
		};
		await cacheSet("test-roundtrip", payload, 60_000);
		const result = await cacheGet("test-roundtrip");
		expect(result).toEqual(payload);
	});

	it("overwrites an existing entry with a new value", async () => {
		await cacheSet("test-overwrite", "first", 60_000);
		await cacheSet("test-overwrite", "second", 60_000);
		const result = await cacheGet<string>("test-overwrite");
		expect(result).toBe("second");
	});

	it("different keys are stored independently", async () => {
		await cacheSet("key-a", "valueA", 60_000);
		await cacheSet("key-b", "valueB", 60_000);
		expect(await cacheGet("key-a")).toBe("valueA");
		expect(await cacheGet("key-b")).toBe("valueB");
	});
});
