import { brandsChunk01 } from "./chunk-01";
import { brandsChunk02 } from "./chunk-02";
import { brandsChunk03 } from "./chunk-03";
import { brandsChunk04 } from "./chunk-04";
import type { BrandProfile } from "./types";

export * from "./types";
export * from "./logoHelpers";

// Split into ~100-brand chunks instead of one file, purely for diff/review/IDE
// ergonomics as this list grows toward 2000 entries -- same single source of
// truth, just chunked. peerTickers is baked in statically per entry (resolved
// once, from the original hand-maintained peerGroups.ts, at migration time)
// rather than recomputed on every load -- new entries get a value the same
// way once the generation tool (a later phase) lands.
export const brands: BrandProfile[] = [
	...brandsChunk01,
	...brandsChunk02,
	...brandsChunk03,
	...brandsChunk04,
];
