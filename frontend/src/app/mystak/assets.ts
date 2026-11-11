/**
 * Figma's own files for 06 · My STAK (2:4667 overview, 2:1830 empty, 2:4830 collection), each named after its
 * layer and node id. The vectors are byte-for-byte Figma's exports of 2026-10-18 (download_assets of the frames /
 * the collections grid, and the asset each layer's design context surfaces: the whole-icon files of the two
 * icon instances, the donut and the empty-state box). The two raster covers are the layers' own
 * image fills, transparent around the subject, in Figma's 512 px rendition of the 2048 px uploads (164 / 325 kB
 * instead of 2.7 / 7 MB for a 53 px icon; they match the frame's render at least as closely as the originals).
 * Figma's node exports of those layers were not used: they composite the layer onto whatever lies behind it
 * (the card's #181F30, the page's #0A1020), so a cover drawn anywhere else showed a dark square.
 */
const base = "/figma/mystak";

export const MS = {
	/** 2:4905 "Frame" inside the collection's Back button (22px chevron) */
	back: `${base}/frame-back__2-4905.svg`,
	/** 2:4677 "Plus" in the Add more button */
	plus: `${base}/plus__2-4677.svg`,
	/** 2:4968 "icon/plus-circle" in the Add stock tile */
	plusCircle: `${base}/icon-plus-circle__2-4968.svg`,
	/** 2:4826 "icon/sparkle" in the Your read card */
	sparkle: `${base}/icon-sparkle__2-4826.svg`,
	/**
	 * The "Other" collection's glyph (no frame draws an Other card): the phones mark it with the saved bookmark
	 * (android res/drawable/ic_saved_bookmark.xml, a white filled bookmark; iOS the same asset), so the web uses Figma's
	 * own white filled "icon/bookmark" export (2:4572, the article's saved bookmark), the same glyph.
	 */
	otherBookmark: "/figma/news/icon-bookmark__2-4572.svg",
	/** 2:4686 "Segments", the allocation donut */
	donut: `${base}/segments__2-4686.svg`,
	/** 2:4803 "Chart line", the performance card's authored line (the 3M demo state) */
	chartLine: `${base}/chart-line__2-4803.svg`,
	/** 2:1839 "Group 1000002801", the empty state's open box */
	emptyBox: `${base}/group-1000002801__2-1839.svg`,
	/** the allocation rows' 9px "Ellipse" dots */
	dots: {
		tech: `${base}/ellipse__2-4696.svg`,
		finance: `${base}/ellipse__2-4704.svg`,
		green: `${base}/ellipse__2-4712.svg`,
		realEstate: `${base}/ellipse__2-4720.svg`,
		other: `${base}/ellipse__2-4728.svg`,
	},
	/** the collection cards' icons: two raster covers (52.748px) and four "cat-icon" glyphs (55.851px) */
	collections: {
		/** 2:4749's image fill; 2:4910 (the cover at the top of the AI & Tech page) fills with the same image */
		aiTech: `${base}/hf-20260704-115218-fill__2-4749.png`,
		/** 2:4755's image fill */
		finance: `${base}/hf-20260704-114425-fill__2-4755.png`,
		greenEnergy: `${base}/cat-icon__2-4762.svg`,
		realEstate: `${base}/cat-icon__2-4770.svg`,
		healthcare: `${base}/cat-icon__2-4779.svg`,
		consumer: `${base}/cat-icon__2-4786.svg`,
	},
} as const;
/*
 * Not referenced any more (left in place for the coordinator's cleanup): b-n__2-4923.svg, b-a__2-4932.svg,
 * b-m__2-4941.svg, b-g__2-4951.svg (the stock cards' "B" badges are text in a filled circle, drawn in code), and the
 * composited node exports hf-20260704-115218__2-4749.png, hf-20260704-115218__2-4910.png, hf-20260704-114425__2-4755.png.
 */
