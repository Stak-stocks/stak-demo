/**
 * Exported Figma assets for the desktop app (file SGodL9Eyc2FkEejpv5ixQE).
 * Files are named by Figma's content hash and live in public/app-assets;
 * `.claude/tools/syncassets.py` copies every path referenced here from the staging folder.
 */
const base = "/app-assets";

export const A = {
	// sidebar
	logoIcon: `${base}/20739.svg`,
	logoWord: `${base}/2ba8c.svg`,
	navHide: `${base}/5d4f5.svg`,
	navShow: `${base}/1ce9c.svg`,
	settings: `${base}/43072.svg`,
	nav: {
		home: { on: `${base}/7b7af.svg`, off: `${base}/4c706.svg`, profile: `${base}/b554e.svg` },
		news: { on: `${base}/9d895.svg`, off: `${base}/78043.svg` },
		discover: { on: `${base}/e9d5c.svg`, off: `${base}/e9365.svg` },
		mystak: { on: `${base}/7c0a6.svg`, off: `${base}/a42b8.svg` },
		simulate: { on: `${base}/21ca5.svg`, off: `${base}/e8923.svg` },
	},
	// page header
	wordmarkIcon: `${base}/dc4bd.svg`,
	wordmarkText: `${base}/7f791.svg`,
	bell: `${base}/5dc1c.svg`,
	bellQuiet: `${base}/bell-quiet.svg`, // Group 1000002393 (2:438): the bell without its badge
	bellDot: `${base}/bell-dot.svg`, // Ellipse 467 (2:442): the 5.833px #FF8030 badge, shown only while something is unread
	// home
	gauge: `${base}/30c6a.svg`,
	arrowRight: `${base}/64d73.svg`,
	cautionIcon: `${base}/7527d.png`,
	deckBoxIllustration: `${base}/illus-deck-box@2x.png`,
	seePicksPill: `${base}/pill-see-picks@2x.png`,
	// loading state (10 States, 2:1991): dimmed variants of the same pieces
	settingsDim: `${base}/57a89.svg`,
	gaugeDim: `${base}/d6f2a.svg`,
	arrowRightDim: `${base}/0c06d.svg`,
	deckBoxDim: `${base}/01105.svg`,
	seePicksPillDim: `${base}/pill-see-picks-loading@2x.png`,
	// 10 States: empty-box illustration shared by My STAK empty (2:1830) and Simulate empty (2:2255)
	emptyBox: `${base}/43d31.svg`,
	// 10 States: Stock detail loading (2:2113) and Deck loading (2:2305)
	loading: {
		chartDim: `${base}/d70ff.svg`,
		bookmarkDim: `${base}/0f040.svg`,
		marker: `${base}/b764f.svg`,
		caretA: `${base}/1bc1c.svg`,
		caretB: `${base}/378fc.svg`,
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
