/** Figma assets for section 04 · Discover (hash-named; see .claude/tools/syncassets.py). */
const base = "/app-assets";

export const D = {
	ring: `${base}/5304b.svg`, // 52.8 progress ring (n/12)
	ringDone: `${base}/52163.svg`, // 79.2 completion ring (12/12)
	chevron: `${base}/f0c2a.svg`, // 22px chevron-left (Back, Nav · Previous; rotated for Next)
	bookmark: `${base}/7253a.svg`, // Save pill glyph (12.733 at 1x)
	bookmarkSaved: `${base}/8323a.svg`, // Saved pill glyph
	toastBookmark: `${base}/1b784.svg`, // 17px glyph in the "Saved to My STAK" toast
	art: {
		nvda: `${base}/illus-deck-nvda@2x.png`, // group 2:3044 export, clipped by its image frame
		aapl: `${base}/illus-deck-aapl-local@2x.png`, // image frame 2:3004 export, un-rotated
		googl: `${base}/illus-deck-googl-local@2x.png`, // image frame 2:2963 export, un-rotated
		logo: "", // catalog companies: the box + beam vectors below with the company logo in a glass coin
	},
	/** The illustration's layers (group 2:3044): the open box and the light beam; the coin is per company. */
	deckBox: `${base}/deck-box.svg`, // "Group 1000002777" 272.152 x 248.508 at (-26.51, 78.6) in the 212 x 287 art frame
	deckBeam: `${base}/deck-beam.svg`, // "Vector 7" 142.687 x 153.393 at (37.15, -5.31)
} as const;
