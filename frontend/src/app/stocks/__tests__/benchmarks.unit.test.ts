import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "@/app/live/catalog";
import { benchmarksFor } from "../live";

describe("benchmarksFor", () => {
	beforeAll(() => loadCatalog());

	it("derives the sector and peer line the stat footer promises from the catalog", () => {
		const line = benchmarksFor("AAPL");
		expect(line).toMatch(/^Benchmarks: P\/E sector [\d.]+x · peers [\d.]+x\. Growth sector -?[\d.]+% · peers -?[\d.]+%\. Margin sector -?[\d.]+% · peers -?[\d.]+%\.$/);
	});

	it("has nothing for a ticker outside the catalog", () => {
		expect(benchmarksFor("ZZZZ")).toBeUndefined();
	});
});
