import { describe, expect, it, vi } from "vitest";
import { shadowWrite } from "../shadowWrite.js";

describe("shadowWrite", () => {
	it("runs the function and resolves normally on success", async () => {
		const fn = vi.fn().mockResolvedValue(undefined);
		await expect(shadowWrite("test", fn)).resolves.toBeUndefined();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("never throws when the wrapped function rejects", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("boom"));
		await expect(shadowWrite("test", fn)).resolves.toBeUndefined();
	});

	it("never throws when the wrapped function throws synchronously", async () => {
		const fn = vi.fn(() => {
			throw new Error("sync boom");
		});
		await expect(shadowWrite("test", fn)).resolves.toBeUndefined();
	});

	it("logs the failure with the given label", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await shadowWrite("my-route", vi.fn().mockRejectedValue(new Error("specific failure")));
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("my-route"),
			expect.stringContaining("specific failure"),
		);
		consoleSpy.mockRestore();
	});
});
