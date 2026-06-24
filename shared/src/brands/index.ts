import { brandsChunk01 } from "./chunk-01";
import { brandsChunk02 } from "./chunk-02";
import { brandsChunk03 } from "./chunk-03";
import { brandsChunk04 } from "./chunk-04";
import type { BrandProfile } from "./types";
import { getPeerTickers, buildPeerLookupIndex } from "../peerGroups";

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

// Without the prebuilt index, computing peerTickers here would be O(n^2)
// (getPeerTickers scans all of rawBrands once per brand) -- negligible at
// today's 333 entries but grows quadratically toward the stated ~2000-entry
// target, so build the category/ticker index once (O(n)) instead.
const peerLookupIndex = buildPeerLookupIndex(rawBrands);

export const brands: BrandProfile[] = rawBrands.map((b) => ({
	...b,
	peerTickers: getPeerTickers(b.ticker, rawBrands, 5, undefined, peerLookupIndex),
}));
