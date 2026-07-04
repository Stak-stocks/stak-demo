import { describe, expect, it } from "vitest";
import { sanitizeClientDateKey } from "../clientDateKey.js";

describe("sanitizeClientDateKey", () => {
	const serverToday = "2026-06-24";

	it("returns the client key when it matches server today exactly", () => {
		expect(sanitizeClientDateKey("2026-06-24", serverToday)).toBe("2026-06-24");
	});

	it("trusts yesterday -- covers ET users whose local day hasn't rolled yet", () => {
		expect(sanitizeClientDateKey("2026-06-23", serverToday)).toBe("2026-06-23");
	});

	it("trusts tomorrow -- symmetric ±1 window covers users in UTC+ timezones whose local day is ahead", () => {
		expect(sanitizeClientDateKey("2026-06-25", serverToday)).toBe("2026-06-25");
	});

	it("clamps a wildly future date to server today", () => {
		expect(sanitizeClientDateKey("2099-01-01", serverToday)).toBe(serverToday);
	});

	it("clamps a wildly past date to server today", () => {
		expect(sanitizeClientDateKey("2020-01-01", serverToday)).toBe(serverToday);
	});

	it("falls back to server today when client key is missing", () => {
		expect(sanitizeClientDateKey(undefined, serverToday)).toBe(serverToday);
	});

	it("falls back to server today when client key is not a string", () => {
		expect(sanitizeClientDateKey(42, serverToday)).toBe(serverToday);
	});

	it("falls back to server today when client key is an empty string", () => {
		expect(sanitizeClientDateKey("", serverToday)).toBe(serverToday);
	});
});
