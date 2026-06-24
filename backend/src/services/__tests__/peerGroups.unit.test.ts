import { describe, expect, it } from "vitest";
import { getPeerTickers, buildPeerLookupIndex, MANUAL_PEER_OVERRIDES, brands, type BrandProfile } from "@stak/shared";

function makeBrand(overrides: Partial<BrandProfile> & { ticker: string }): BrandProfile {
	return {
		id: overrides.ticker.toLowerCase(),
		name: overrides.ticker,
		bio: "",
		heroImage: "",
		personalityDescription: "",
		vibes: [],
		culturalContext: { title: "", sections: [] },
		financials: {
			peRatio: { label: "", value: "", explanation: "", culturalTranslation: "" },
			marketCap: { label: "", value: "$1B", explanation: "", culturalTranslation: "" },
			revenueGrowth: { label: "", value: "", explanation: "", culturalTranslation: "" },
			profitMargin: { label: "", value: "", explanation: "", culturalTranslation: "" },
			beta: { label: "", value: "", explanation: "", culturalTranslation: "" },
			dividendYield: { label: "", value: "", explanation: "", culturalTranslation: "" },
		},
		...overrides,
	};
}

describe("getPeerTickers", () => {
	it("returns the manual override list verbatim when one exists, ignoring allBrands", () => {
		const overrides = MANUAL_PEER_OVERRIDES["AAPL"];
		expect(overrides).toBeDefined();
		expect(getPeerTickers("AAPL", [])).toEqual(overrides);
	});

	it("is case-insensitive on the input ticker", () => {
		expect(getPeerTickers("aapl", [])).toEqual(MANUAL_PEER_OVERRIDES["AAPL"]);
	});

	it("returns an empty list for a ticker with no override and no primaryCategory entry", () => {
		expect(getPeerTickers("NOT_A_REAL_TICKER_XYZ", brands)).toEqual([]);
	});

	it("falls back to other brands sharing the same primaryCategory, ranked by closest market cap, for a ticker absent from the override map", () => {
		// CDNS (Cadence) has no manual override (confirmed: a pre-existing gap in the
		// original hand-curated peerGroups.ts, not introduced by this fallback), but
		// shares the "enterprise_software" primaryCategory with several other brands.
		expect(MANUAL_PEER_OVERRIDES["CDNS"]).toBeUndefined();
		const peers = getPeerTickers("CDNS", brands);
		expect(peers.length).toBeGreaterThan(0);
		expect(peers).not.toContain("CDNS");
	});

	it("ranks category fallback candidates by closeness to the target's market cap", () => {
		// CDNS, SNPS, and WDAY all really do share "enterprise_software" as their
		// primaryCategory (that lookup is keyed off the real STAK_WEIGHTED_STOCK_TAGS
		// data and can't be swapped per-test), but their market caps here are
		// synthetic and controlled so the ranking outcome is deterministic: SNPS is
		// set close to CDNS's cap and should rank ahead of WDAY, set far away.
		const cdns = makeBrand({ ticker: "CDNS", financials: { ...makeBrand({ ticker: "x" }).financials, marketCap: { label: "", value: "$50B", explanation: "", culturalTranslation: "" } } });
		const snpsNear = makeBrand({ ticker: "SNPS", financials: { ...makeBrand({ ticker: "x" }).financials, marketCap: { label: "", value: "$48B", explanation: "", culturalTranslation: "" } } });
		const wdayFar = makeBrand({ ticker: "WDAY", financials: { ...makeBrand({ ticker: "x" }).financials, marketCap: { label: "", value: "$5B", explanation: "", culturalTranslation: "" } } });

		const peers = getPeerTickers("CDNS", [cdns, snpsNear, wdayFar]);

		expect(peers.indexOf("SNPS")).toBeLessThan(peers.indexOf("WDAY"));
	});

	it("uses categoryOverride for a ticker that has no STAK_WEIGHTED_STOCK_TAGS entry yet (e.g. an uncommitted draft)", () => {
		// A fictional ticker not in STAK_WEIGHTED_STOCK_TAGS at all -- without
		// categoryOverride this would return [] (no category to look up), even
		// though the caller (e.g. brandGenerationService, mid-draft) already knows
		// it belongs in "enterprise_software".
		const peers = getPeerTickers("NOT_YET_COMMITTED_XYZ", brands, 5, "enterprise_software");
		expect(peers.length).toBeGreaterThan(0);
	});

	it("with a prebuilt index, returns the exact same result as scanning allBrands directly -- the O(n) optimization must not change behavior", () => {
		const index = buildPeerLookupIndex(brands);
		// Spot-check a manual-override ticker, a category-fallback ticker, and one
		// with no peers at all -- all 3 paths inside getPeerTickers.
		for (const ticker of ["AAPL", "CDNS", "LRLCY"]) {
			expect(getPeerTickers(ticker, brands, 5, undefined, index)).toEqual(getPeerTickers(ticker, brands));
		}
	});

	it("buildPeerLookupIndex groups every brand under its real primaryCategory and indexes it by uppercase ticker", () => {
		const index = buildPeerLookupIndex(brands);
		const aapl = brands.find((b) => b.ticker.toUpperCase() === "AAPL")!;
		expect(index.byTicker.get("AAPL")).toBe(aapl);
		const enterpriseSoftware = index.byCategory.get("enterprise_software") ?? [];
		expect(enterpriseSoftware.some((b) => b.ticker.toUpperCase() === "CDNS")).toBe(true);
	});
});
