/**
 * Figma assets for the auth frames (01 · Onboarding & Auth 2:5600, 09 · Auth recovery 2:1256): Figma's own exports,
 * saved under public/figma/auth/ named after the layer and its node id. Re-checked on 2026-10-18 against Figma's
 * current exports (the design-context asset URLs of 2:5601 and 2:5664): the three bitmaps are byte-identical and their
 * SHA-1s are the layers' own image hashes (glass 1aa538ff…, Google 1bc82eaf…, Apple 73a9c585…), the splash logo SVG is
 * byte-identical, and the Back chevron is today's export (the older file differed in attribute order). Nothing is
 * redrawn or retouched.
 */
const base = "/figma/auth";

export const AU = {
	/**
	 * "Glass_icon_with_tilt_2K_202607120743 2" image fill (CROP), 2048 x 2048: the splash (2:5602) and the five brand
	 * panels (2:5666 / 2:5621 / 2:1259 / 2:1568 / 2:1285) share one image hash, so one file serves all six.
	 */
	glass: `${base}/glass-icon-with-tilt__2-5602.png`,
	/** "Frame 1618869106" (2:5604), the splash logo: nine vectors (#ffffff / #efefef) exported as one SVG, 64 x 64 */
	splashLogo: `${base}/splash-logo-frame-1618869106__2-5604.svg`,
	/** "Rectangle" image fill of "Social · Continue with Google" (2:5681 / 2:5636), 40 x 40, FIT in 18 x 18 */
	google: `${base}/google-mark-rectangle__2-5681.png`,
	/** "Rectangle" image fill of "Social · Continue with Apple" (2:5685 / 2:5640), 48 x 48, FIT in 18 x 18 */
	apple: `${base}/apple-mark-rectangle__2-5685.png`,
	/**
	 * "Back" > "Frame" (2:5708; the same layer in 2:5662, 2:1281, 2:1587, 2:1309): the 22 px frame with its chevron
	 * vector, stroke #AEAEAE 1.9 CENTER, round caps and joins
	 */
	back: `${base}/back-frame__2-5708.svg`,
} as const;
