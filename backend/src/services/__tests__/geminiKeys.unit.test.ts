import { afterEach, describe, expect, it } from "vitest";
import { getGeminiKeys } from "../geminiService.js";

const NAMES = ["GEMINI_DEV_API_KEY", "GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"] as const;
const saved = Object.fromEntries(NAMES.map((n) => [n, process.env[n]]));

describe("getGeminiKeys", () => {
	afterEach(() => {
		for (const n of NAMES) {
			if (saved[n] === undefined) delete process.env[n];
			else process.env[n] = saved[n];
		}
	});

	it("uses the live keys in order, skipping unset ones", () => {
		delete process.env.GEMINI_DEV_API_KEY;
		process.env.GEMINI_API_KEY = "live-1";
		delete process.env.GEMINI_API_KEY_2;
		process.env.GEMINI_API_KEY_3 = "live-3";
		expect(getGeminiKeys()).toEqual(["live-1", "live-3"]);
	});

	it("a development machine's own key, when set, is the only one used", () => {
		process.env.GEMINI_DEV_API_KEY = " dev-key ";
		process.env.GEMINI_API_KEY = "live-1";
		expect(getGeminiKeys()).toEqual(["dev-key"]);
	});
});
