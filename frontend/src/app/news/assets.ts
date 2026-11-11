/**
 * News section assets: Figma's own exports of the News frames (2:4359 listing, 2:4453 / 2:4555 article),
 * saved in public/figma/news as `<layer>__<node id>`. The thumbnails and the hero are the layers' original
 * image fills (byte for byte what Figma holds), drawn with the fills' FILL scale mode (object-cover).
 */
const base = "/figma/news";

export const N = {
	/** 2:4367, the 20px magnifier inside the 40px "Search" button (2:4366) */
	search: `${base}/search-frame__2-4367.svg`,
	/** 2:4385, the brief card's three page dots (three 6px ellipses, 6px apart) */
	dots: `${base}/dots-frame__2-4385.svg`,
	/**
	 * 2:4394 "Group 314", the Market Mood gauge: Figma's PNG export at 3x (202x101). Its SVG export stacks the three
	 * arcs on a full red half-ring, which bleeds pink through the grey arc's anti-aliased edges; Figma's render does not.
	 */
	gauge: `${base}/group-314__2-4394@3x.png`,
	/** 2:4458, the 22px chevron inside the 40px "Back" button (2:4457) */
	back: `${base}/back-frame__2-4458.svg`,
	/** 2:4465 "phone_centered_gradient 1", the hero's 908x605 image fill */
	hero: `${base}/phone-centered-gradient-1__2-4465.png`,
	/**
	 * Figma's own 2x / 4x exports of 2:4465 (download_assets, 2026-10-30). Figma renders the layer as its hero frame
	 * (2:4464, 720x416, clips content) shows it: the 720x416 window of the 814x542.37 layer, 48 / 30.004 in from its
	 * left / top, at 1440x832 and 2880x1664, with the frame's radius-20 corners baked over the page's #0a1020. Measured
	 * against the fill drawn at the frame's geometry: offset (0, 0), mean difference 0.9 / 1.1 levels (resampling only).
	 * The fill itself is only 908 px, so these are the only sources dense enough for 4K-8K screens (CORE-API section 8).
	 * x descriptors are relative to the window's 720 layout px.
	 */
	heroWindowSet: `${base}/phone-centered-gradient-1__2-4465@2x.png 2x, ${base}/phone-centered-gradient-1__2-4465@4x.png 4x`,
	/** 2:4469 "Polygon 1", the hero's play mark (rotated 90deg in the frame) */
	polygon: `${base}/polygon-1__2-4469.svg`,
	/** 2:4470 "icon/bookmark", the unsaved hero's outline bookmark */
	bookmark: `${base}/icon-bookmark__2-4470.svg`,
	/** 2:4572 "icon/bookmark", the filled bookmark of the saved hero's "Saved to My STAK" toast */
	bookmarkSaved: `${base}/icon-bookmark__2-4572.svg`,
	/** 2:4482 "icon/sparkle", The gist */
	sparkle: `${base}/icon-sparkle__2-4482.svg`,
	/** 2:4485 "icon/check-circle", one per gist line */
	check: `${base}/icon-check-circle__2-4485.svg`,
	/** 2:4505 "external link", next to Source */
	externalLink: `${base}/external-link__2-4505.svg`,
	/** 2:4517 "Vector", the unsaved ticker card's line */
	chart: `${base}/vector__2-4517.svg`,
	/** 2:4626 "Vector", the saved ticker card's line */
	chartSaved: `${base}/vector__2-4626.svg`,
	/** 2:4542 "Vector", the plus of Add to STAK */
	plus: `${base}/vector__2-4542.svg`,
	/** 2:4631 "Vector", the chevron of "View AAPL in My STAK" (drawn pointing down, turned -90deg) */
	chevron: `${base}/vector__2-4631.svg`,
	/** the six "Thumb" image fills of the listing's news cards */
	thumbs: {
		nvidia: `${base}/thumb__2-4409.jpg`,
		apple: `${base}/thumb__2-4416.jpg`,
		tesla: `${base}/thumb__2-4423.jpg`,
		jobs: `${base}/thumb__2-4433.jpg`,
		memory: `${base}/thumb__2-4440.jpg`,
		oil: `${base}/thumb__2-4447.png`,
	},
} as const;

/**
 * The thumbnails' sources for the big regime (DensityImg). Each JPEG fill is 160 px for a 66 px thumb: 2.42x, sharp
 * up to zoom 2.42 (5K). Past that (8K, zoom 3) Figma's own 4x export of the "Thumb" frame (264 px, its radius-11
 * corners baked over the card's #181f30, which the thumb's own 11 px clip hides) covers it. The oil fill (2:4447) is
 * 512 px: 7.76x, sharp at every zoom.
 */
export const THUMB_SETS: Readonly<Record<string, string>> = Object.fromEntries(
	(["2-4409", "2-4416", "2-4423", "2-4433", "2-4440"] as const).map((id) => [
		`${base}/thumb__${id}.jpg`,
		`${base}/thumb__${id}.jpg 2.4242x, ${base}/thumb__${id}@4x.png 4x`,
	]),
);
