import { brandsChunk01 } from "./chunk-01";
import { brandsChunk02 } from "./chunk-02";
import { brandsChunk03 } from "./chunk-03";
import { brandsChunk04 } from "./chunk-04";
import type { BrandProfile } from "./types";
import { getPeerTickers } from "../peerGroups";

export * from "./types";
export * from "./logoHelpers";

// Split into ~100-brand chunks instead of one file, purely for diff/review/IDE
// ergonomics as this list grows toward 2000 entries -- same single source of
// truth, just chunked. Chunk entries don't carry peerTickers -- it's a derived
// field (manual override or primaryCategory + market-cap fallback, see
// getPeerTickers in peerGroups.ts), computed once here rather than stored
// per-entry, so it can't silently drift from the override map.
const rawBrands: BrandProfile[] = [
	...brandsChunk01,
	...brandsChunk02,
	...brandsChunk03,
	...brandsChunk04,
];

export const brands: BrandProfile[] = rawBrands.map((b) => ({
	...b,
	peerTickers: getPeerTickers(b.ticker, rawBrands),
}));
