import { describe, expect, it } from "vitest";
import { restShare, scenarioOf, summaryOf, type Graph, type Theme } from "@/lib/tasteGraph";

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function theme(overrides: Partial<Theme> = {}): Theme {
	return {
		category: "semiconductor",
		label: "Chips",
		colorKey: "t0",
		share: 0.4,
		strength: "strong",
		saves: 3,
		learnMores: 0,
		opens: 0,
		savedNames: ["Nvidia"],
		savedAtMs: NOW - DAY,
		...overrides,
	};
}

function graph(overrides: Partial<Graph> = {}): Graph {
	return {
		themes: [],
		otherShare: 0,
		others: [],
		totalSaves: 0,
		learning: false,
		totalSignals: 0,
		...overrides,
	};
}

describe("tasteGraph scenarios", () => {
	it("no_signal: brand-new account", () => {
		const g = graph();
		expect(scenarioOf(g)).toBe("no_signal");
		expect(summaryOf(g)).toBe("Your Taste starts here");
	});

	it("no_signal: active but unfocused reads differently", () => {
		const g = graph({ totalSignals: 5 });
		expect(scenarioOf(g)).toBe("no_signal");
		expect(summaryOf(g)).toBe("Nothing's caught on yet");
	});

	it("paused: no save in the last 14 days wins over every other scenario", () => {
		const g = graph({ themes: [theme({ savedAtMs: NOW - 20 * DAY })], learning: false });
		expect(scenarioOf(g)).toBe("paused");
	});

	it("early_signal: themes exist but still in the learning window", () => {
		const g = graph({ themes: [theme()], learning: true });
		expect(scenarioOf(g)).toBe("early_signal");
	});

	it("one_dominant: exactly one theme, past learning", () => {
		const g = graph({ themes: [theme()], learning: false });
		expect(scenarioOf(g)).toBe("one_dominant");
	});

	it("two_strong: exactly two themes, past learning", () => {
		const g = graph({ themes: [theme(), theme({ category: "bank", label: "Banks" })], learning: false });
		expect(scenarioOf(g)).toBe("two_strong");
	});

	it("broad_mix: three or more themes, past learning", () => {
		const g = graph({
			themes: [theme(), theme({ category: "bank", label: "Banks" }), theme({ category: "gaming", label: "Gaming" })],
			learning: false,
		});
		expect(scenarioOf(g)).toBe("broad_mix");
	});
});

describe("restShare", () => {
	it("adds the listed interests a panel leaves out to the server's own 'other' share", () => {
		const g = graph({ themes: [theme({ share: 0.4 }), theme({ share: 0.3 }), theme({ share: 0.1 })], otherShare: 0.2 });
		expect(restShare(g, 2)).toBeCloseTo(0.3);
		expect(restShare(g, 3)).toBeCloseTo(0.2);
	});
});
