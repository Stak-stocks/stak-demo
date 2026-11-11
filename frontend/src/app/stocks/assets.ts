/**
 * Figma assets of the Stock detail frames (2:3457 … 2:4161, 2:4970 … 2:5402) and their loading frame (2:2113).
 * Every file is Figma's own export of the named layer, compared byte for byte with the MCP's export of that layer on
 * 2026-10-18 (download_assets, then cmp). Figma's serialiser does not keep one attribute order between two exports of
 * the same layer (the saved bookmark 2:3912 came back once as 3ec1a.svg byte for byte and once with its stroke
 * attributes reordered), so a copy that differs from a fresh export in attribute order only is still Figma's export of
 * that drawing. The files under /figma/stock are the exports downloaded for these frames, named after their layers;
 * the /app-assets files are reused where the export of 2026-10-18 is identical to them.
 */
const base = "/app-assets";
const own = "/figma/stock";

export const S = {
	/** "Vector" 2:3462 (and 2:3578 / 2:3737 / 2:3896 / 2:4012 / 2:4166 / 2:4981 / 2:5141 / 2:5258 / 2:5407): the performance line, 692 × 124.49 */
	chart: `${own}/vector__2-3462.svg`,
	/** "icon/bookmark" 2:3479: the 12px outline of "NOT SAVED YET" */
	bookmark: `${own}/icon-bookmark__2-3479.svg`,
	/** "icon/bookmark" 2:3912 (2:3753 / 2:4028 / 2:4997 / 2:5157 / 2:5274): the 12px filled glyph of "SINCE YOU SAVED" (export of 2026-10-18 20:00, identical to /app-assets/3ec1a.svg) */
	bookmarkSaved: `${own}/icon-bookmark-saved__2-3912.svg`,
	/** "Marker" 2:3496: the risk track's 14px marker (identical export) */
	marker: `${base}/b764f.svg`,
	/**
	 * "Ellipse" 2:3677 (2:3836 / 2:4265 / 2:5080 / 2:5506): the analyst price-target marker. Figma's export of the layer
	 * (through its "Range track" 2:3675, 2026-10-18) is this file: the same disc as the risk Marker, under its own id.
	 */
	rangeMarker: `${own}/ellipse__2-3677.svg`,
	/** "CaretDown" 2:3559 / 2:3566: the 20px caret of the folded analyst card and of the compare teaser (identical export) */
	caret: `${base}/a87c6.svg`,
} as const;

/** 2:2113 "Desktop · Stock detail · Loading": the dimmed pieces of the skeleton. */
export const SL = {
	/** "Vector" 2:2145: the performance line at 15% (export of 2026-10-18 20:00, identical to /app-assets/d70ff.svg) */
	chartDim: `${own}/vector__2-2145.svg`,
	/** "icon/bookmark" 2:2162: the outline at 15% (export of 2026-10-18 20:00, identical to /app-assets/0f040.svg) */
	bookmarkDim: `${own}/icon-bookmark__2-2162.svg`,
	/** "Marker" 2:2179 */
	marker: `${base}/b764f.svg`,
	/** "CaretDown" 2:2241: the analyst card's caret, #819abb at 15% */
	caretA: `${base}/1bc1c.svg`,
	/** "CaretDown" 2:2248: the compare teaser's caret, #223050 at 15% */
	caretB: `${base}/378fc.svg`,
} as const;
