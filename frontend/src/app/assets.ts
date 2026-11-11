/**
 * Exported Figma assets for the desktop app (file SGodL9Eyc2FkEejpv5ixQE).
 * Files are named by Figma's content hash and live in public/app-assets;
 * `.claude/tools/syncassets.py` copies every path referenced here from the staging folder.
 * The sidebar's files are Figma's own SVG export (read-only exportAsync) of each named layer of the
 * sidebar set 2:6692 (documented copy 2:7404) and live in public/figma/shell as <layer>__<node id>.svg.
 */
const base = "/app-assets";
const shell = "/figma/shell";

export const A = {
	// sidebar (Desktop Sidebar · Nav (locked) 2:6692, Sidebar · Account row 2:7362)
	/** "Group" 2:6695: the STAK mark + wordmark as one layer (87.038x21.117, exported on its 88x22 pixel canvas) */
	logo: `${shell}/group__2-6695.svg`,
	/** "Hide · stroke 28" 2:6711 (open variants) */
	navHide: `${shell}/hide-stroke-28__2-6711.svg`,
	/** "Show · stroke 28" 2:7018 (closed variants) */
	navShow: `${shell}/show-stroke-28__2-7018.svg`,
	/** account row "settings" I2:6744;2:7380 */
	settings: `${shell}/settings__I2-6744_2-7380.svg`,
	/** "Vector 87" 2:6743: the 0.5px #5F6471 @54% rule above the account row (216 wide; the closed rail clips it to 72) */
	navRule: `${shell}/vector-87__2-6743.svg`,
	/** on = the 24px filled icon of the active row, off = the 20px outline icon of the others */
	nav: {
		home: {
			on: `${shell}/home-04__2-6714.svg`,
			off: `${shell}/home-04__2-6747.svg`,
			/** Profile frames (2:2476 / 2:2555 / 2:2760) override the Home row: 24px outline #AEAEAE, no highlight */
			profile: `${shell}/home-04__I2-2477_2-6950.svg`,
		},
		news: { on: `${shell}/news__2-6752.svg`, off: `${shell}/news__2-6719.svg` },
		discover: { on: `${shell}/icon-discover__2-6813.svg`, off: `${shell}/pie-chart__2-6728.svg` },
		mystak: { on: `${shell}/icon-bookmark__2-6868.svg`, off: `${shell}/icon-bookmark__2-6733.svg` },
		simulate: { on: `${shell}/icon-simulate__2-6924.svg`, off: `${shell}/chart-01__2-6737.svg` },
	},
	// page header
	wordmarkIcon: `${base}/dc4bd.svg`,
	wordmarkText: `${base}/7f791.svg`,
	bellQuiet: `${base}/bell-quiet.svg`, // Group 1000002393 (2:438): the bell without its badge
	bellDot: `${base}/bell-dot.svg`, // Ellipse 467 (2:442): the 5.833px #FF8030 badge, shown only while something is unread
	// home
	gauge: `${base}/30c6a.svg`,
	arrowRight: `${base}/64d73.svg`,
	// loading state (10 States, 2:1991): dimmed variants of the same pieces
	/** skeleton account row "settings" 2:2017 (frame and paths at 30% each) */
	settingsDim: `${shell}/settings__2-2017.svg`,
	gaugeDim: `${base}/d6f2a.svg`,
	arrowRightDim: `${base}/0c06d.svg`,
	deckBoxDim: `${base}/01105.svg`,
	// 10 States: empty-box illustration shared by My STAK empty (2:1830) and Simulate empty (2:2255)
	emptyBox: `${base}/43d31.svg`,
	// 10 States: Deck loading (2:2305); the Stock detail loading pieces live in stocks/assets.ts (SL)
	loading: {
		ring: `${base}/da4ff.svg`,
		deckGroupA: `${base}/82b35.svg`,
		deckVectorA: `${base}/7d507.svg`,
		bookmarkA: `${base}/9acde.svg`,
		deckGroupB: `${base}/8fc70.svg`,
		bookmarkB: `${base}/0b7d2.svg`,
		deckGroupC: `${base}/bc5eb.svg`,
		deckVectorC: `${base}/32d5f.svg`,
		bookmarkC: `${base}/a09d9.svg`,
	},
} as const;
