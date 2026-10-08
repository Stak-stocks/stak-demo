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
		home: { on: `${base}/7b7af.svg`, off: `${base}/4c706.svg` },
		news: { on: `${base}/9d895.svg`, off: `${base}/78043.svg` },
		discover: { on: `${base}/e9d5c.svg`, off: `${base}/e9365.svg` },
		mystak: { on: `${base}/7c0a6.svg`, off: `${base}/a42b8.svg` },
		simulate: { on: `${base}/21ca5.svg`, off: `${base}/e8923.svg` },
	},
	// page header
	wordmarkIcon: `${base}/dc4bd.svg`,
	wordmarkText: `${base}/7f791.svg`,
	bell: `${base}/5dc1c.svg`,
	// home
	gauge: `${base}/30c6a.svg`,
	arrowRight: `${base}/64d73.svg`,
	cautionIcon: `${base}/7527d.png`,
	deckBoxIllustration: `${base}/illus-deck-box@2x.png`,
	seePicksPill: `${base}/pill-see-picks@2x.png`,
} as const;
