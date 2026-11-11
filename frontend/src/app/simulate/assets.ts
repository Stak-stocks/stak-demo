/**
 * Section 07 · Simulate + 09 flows + 10 States: Figma's own exports. The app-assets files (named by content hash, see
 * .claude/tools/syncassets.py) were re-checked against fresh exports on 2026-10-10 / 2026-10-11 and are byte-identical.
 *
 * The empty state's open box (2:2283) is Figma's PNG render of the layer at 1x, 2x and 4x: its SVG export draws faint
 * seams between the box's abutting faces in Chrome (each path anti-aliased on its own) that Figma's render does not have
 * (measured over the illustration: mean error 1.15 for the SVG, 0.47 for the render). The 4x render (download_assets
 * at scale 4, 2026-10-31: 541 x 662, the 1x render's bounds x 4; downscaled it matches the 1x / 2x files within 1.8 /
 * 0.6 per channel) keeps the box sharp past 2560 up to zoom 4 (8K: zoom 3), drawn through DensityImg.
 */
const base = "/app-assets";
const figma = "/figma/simulate";

export const SA = {
	miniChart: `${base}/15b8f.svg`, // 2:651 Portfolio hero "Vector" 672.38x72.489 (same file for 2:986, 2:1880 …)
	back: `${base}/f0c2a.svg`, // 2:1465 22px chevron
	checkCircle: `${base}/25543.svg`, // 2:1704 / 2:1805 "CheckCircle" 47
	/** 2:2283 "Group 1000002801": its render bounds are 135.09 x 165.35 from x -5.26 of the 121.14 frame; 136 x 166 at 1x */
	emptyBox: `${figma}/group-1000002801__2-2283.png`,
	emptyBox2x: `${figma}/group-1000002801__2-2283@2x.png`,
	emptyBox4x: `${figma}/group-1000002801__2-2283@4x.png`,
} as const;
