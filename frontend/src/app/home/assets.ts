/**
 * Home's Figma files (file SGodL9Eyc2FkEejpv5ixQE, page "Web updated"), served from public/figma/home, each named after
 * its layer and node id. The PNG sets are Figma's own render of a layer at 1x / 2x / 4x (the browser picks the file that
 * matches the screen's density, so the art is drawn 1:1, as sharp as Figma's); the SVGs are Figma's export of each
 * vector layer and the coin PNGs are the original images uploaded to the Figma file.
 */
const base = "/figma/home";

type ImageSet = { src: string; srcSet: string };

const set = (name: string): ImageSet => ({
	src: `${base}/${name}.png`,
	srcSet: `${base}/${name}.png 1x, ${base}/${name}@2x.png 2x, ${base}/${name}@4x.png 4x`,
});

export const HOME = {
	/**
	 * "STAK_icon_caution_lighter_v3_bright 1" 2:474 (108 x 108 at 44 / 5 in the Why-this-matters card 2:471): Figma's
	 * export of the layer (its image fill with the layer's exposure -0.23 and contrast +0.2 applied). Identical in the
	 * first-run frame (2:592).
	 */
	cautionIcon: set("stak-icon-caution-layer-2-474"),
	/** "Illustration" 2:487 of the deck card 2:480, layer by layer (DeckIllustration.tsx). Identical in the first-run frame (2:605). */
	deck: {
		shape489: `${base}/shape-2-489.svg`,
		shape490: `${base}/shape-2-490.svg`,
		shape491: `${base}/shape-2-491.svg`,
		shape492: `${base}/shape-2-492.svg`,
		shape493: `${base}/shape-2-493.svg`,
		shape494: `${base}/shape-2-494.svg`,
		shape495: `${base}/shape-2-495.svg`,
		shape496: `${base}/shape-2-496.svg`,
		shape497: `${base}/shape-2-497.svg`,
		shape498: `${base}/shape-2-498.svg`,
		shape499: `${base}/shape-2-499.svg`,
		shape501: `${base}/shape-2-501.svg`,
		shadow514: `${base}/shadow-2-514.svg`,
		image500: `${base}/image-2-500.png`,
		image505: `${base}/image-2-505.png`,
		image508: `${base}/image-2-508.png`,
		image510: `${base}/image-2-510.png`,
		image511: `${base}/image-2-511.png`,
		image513: `${base}/image-2-513.png`,
	},
	/**
	 * "Container" 2:519: the glass of the See Todays Pick pill 2:516 (mask, frost, rim strokes, refraction), without its
	 * label. Figma renders the group over the page and clips it to the pill (136 x 51), so the file is the pill exactly as
	 * the frame draws it: its interior and rims measure what Figma's render of 2:414 measures (interior 32.6 vs 32.3 mean
	 * luminance, top rim 77 vs 75, bottom 68 vs 69), with nothing to add over it in code. This is the 4x render
	 * (download_assets at scale 4, 2026-10-18), for the SVG placement (GlassFile) that draws it on Figma's fraction of a
	 * pixel at every screen density.
	 */
	picksGlass4x: `${base}/glass-container-2-519@4x.png`,
	/** "Container" 2:2100: the same glass at 15% in Desktop · Home · Loading (2:1991), its 4x render (2026-10-18). */
	picksGlassLoading4x: `${base}/glass-container-loading-2-2100@4x.png`,
} as const;

/*
 * Files under public/figma/home that nothing references (Figma's other exports of the same layers, kept as they are its
 * faithful renders): glass-container-2-519.png and @2x, glass-container-loading-2-2100.png and @2x (the 1x / 2x renders
 * of the two glass pills, byte-identical to Figma's current 1x exports on 2026-10-18), illustration-2-487*.png,
 * illustration-in-card-2-487*.png, stak-icon-caution-2-474*.png (an earlier export of the caution art; the build serves
 * the layer export stak-icon-caution-layer-2-474*, byte-identical to Figma's current export on 2026-10-18).
 */
