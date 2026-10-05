import { describe, expect, it } from "vitest";
import { singleFlight } from "../singleFlight.js";

describe("singleFlight", () => {
	it("callers arriving while the work runs share it; the next caller after it settles runs it again", async () => {
		let runs = 0;
		let finish!: (v: string) => void;
		const work = () => { runs++; return new Promise<string>((r) => { finish = r; }); };

		const a = singleFlight("k", work);
		const b = singleFlight("k", work);
		finish("done");
		expect(await Promise.all([a, b])).toEqual(["done", "done"]);
		expect(runs).toBe(1);

		const c = singleFlight("k", work);
		finish("again");
		expect(await c).toBe("again");
		expect(runs).toBe(2);
	});

	it("a failure is shared, then forgotten so the next caller retries", async () => {
		let runs = 0;
		const failing = () => { runs++; return Promise.reject(new Error("down")); };
		await expect(Promise.all([singleFlight("f", failing), singleFlight("f", failing)])).rejects.toThrow("down");
		expect(runs).toBe(1);
		await expect(singleFlight("f", failing)).rejects.toThrow("down");
		expect(runs).toBe(2);
	});

	it("different keys don't share", async () => {
		const [x, y] = await Promise.all([singleFlight("x", async () => "x"), singleFlight("y", async () => "y")]);
		expect([x, y]).toEqual(["x", "y"]);
	});
});
