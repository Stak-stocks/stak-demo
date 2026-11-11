/**
 * Figma's own exports for 01 · Onboarding (desktop frames 2:5710 to 2:6271) and the 00 References EXAMPLE card 2:6664,
 * downloaded from the layers they draw and named after that layer and its node id (public/figma/onboarding/). Every
 * file was compared byte for byte with Figma's current export on 2026-10-18 (get_design_context / download_assets of
 * each frame) and refreshed where Figma's export had changed. Where several frames draw the same layer their current
 * exports are byte-identical, so one file serves them all; the comment names the other layers.
 */
const f = "/figma/onboarding";

export const OB = {
	/** "Group" 2:5754, the STAK mark (= 2:5867, 2:6025, 2:6097, 2:6204, 2:6273). */
	logoIcon: `${f}/logo-group_2-5754.svg`,
	/** The "STAK" wordmark "Group": 2:5764 on steps 2 to 5 (= 2:5877, 2:6035, 2:6107), 2:6214 on steps 7 and 8 (= 2:6283). */
	logoText: {
		early: `${f}/logo-text-group_2-5764.svg`,
		late: `${f}/logo-text-group_2-6214.svg`,
	},
	/** "Frame" 2:5750, the 22px chevron of every Back control (= 2:5863 … 2:6308) and of Nav · Previous / Next (2:6013, 2:6016). */
	back: `${f}/back-frame_2-5750.svg`,
	/** "Frame" 2:6682: the nine-dot pager of the EXAMPLE centered card (00 References 2:6664), the fifth dot lit. */
	examplePager: `${f}/example-pager-frame_2-6682.svg`,
	/**
	 * "Hero · box and crystal stocks", exported whole by Figma at 1x and 2x: the open box, its beam and the six crystal
	 * coins as Figma renders them, over the frame's #0a1020. Each export covers the node's render bounds, 405.792 x
	 * 561.196 from (-15.799, -25.875) of the 363.896 x 492.2 frame (the beam and the box's glow run past it); `at` is
	 * that origin on the whole pixel nearest Figma's in the frame. 01 Welcome draws 2:5712, 06 Preparing deck 2:6167:
	 * the same layers at another sub-pixel offset, so their exports differ (883 pixels, by up to 9 levels) and each frame
	 * draws its own. The 4x exports (download_assets at scale 4, 2026-10-31: 1624 x 2245, the same render as the 2x within
	 * 0.5 levels) keep the art sharp on an 8K screen, where the canvas zoom is 3 (CORE-API section 8).
	 */
	hero: {
		welcome: {
			x1: `${f}/hero-box-and-crystal-stocks_2-5712@1x.png`,
			x2: `${f}/hero-box-and-crystal-stocks_2-5712@2x.png`,
			x4: `${f}/hero-box-and-crystal-stocks_2-5712@4x.png`,
			at: [-15.552, -25.5] as const,
		},
		preparing: {
			x1: `${f}/hero-box-and-crystal-stocks_2-6167@1x.png`,
			x2: `${f}/hero-box-and-crystal-stocks_2-6167@2x.png`,
			x4: `${f}/hero-box-and-crystal-stocks_2-6167@4x.png`,
			at: [-16.052, -26] as const,
		},
	},
	/** 02 Brand picks (2:5752): the logo layer inside each tile's white "B" badge. */
	brands: {
		apple: `${f}/brand-apple-rectangle_2-5784.png`,
		tesla: `${f}/brand-tesla-rectangle_2-5788.png`,
		nike: `${f}/brand-nike-frame_2-5793.svg`,
		spotify: `${f}/brand-spotify-frame_2-5801.svg`,
		/** Figma's own image: its IDAT checksum is broken, so Figma's renderer leaves the badge white; browsers draw the N. */
		netflix: `${f}/brand-netflix-rectangle_2-5807.png`,
		amazon: `${f}/brand-amazon-frame_2-5812.svg`,
		disney: `${f}/brand-disney-rectangle_2-5819.png`,
		microsoft: `${f}/brand-microsoft-rectangle_2-5824.png`,
		nvidia: `${f}/brand-nvidia-rectangle_2-5828.png`,
		playstation: `${f}/brand-playstation-rectangle_2-5832.png`,
		/** "Group" 2:5841 of the "Clip path group" 2:5838 (its clip layer 2:5839 is a rectangle the group's size: brand-coinbase-clip-mask_2-5839.svg, unused). */
		coinbase: `${f}/brand-coinbase-group_2-5841.svg`,
		/** "Group" 2:5852 of the "Clip path group" 2:5849 (its clip layer 2:5850 is a rectangle the group's size: brand-uber-clip-mask_2-5850.svg, unused). */
		uber: `${f}/brand-uber-group_2-5852.svg`,
	},
	/**
	 * 03 Swipe tutorial (2:5865). The open box "Group 1000002777": on the front card Figma's own render of it (2:5979,
	 * 1x / 2x, drawn over the image frame's #142844 and clipped by it, like the frame), on the side cards their vector
	 * exports (2:5940, 2:5899). The light beam and the Save chip's bookmark are exported per card slot (each at its
	 * slot's scale); the coins are the stock's own image (the hero's coin exports, byte-identical to 2:5915, 2:5954 and
	 * 2:5994). The front box's 4x export (2026-10-31, 1089 x 515) serves the 8K canvas zoom of 3.
	 */
	swipe: {
		frontBox: {
			x1: `${f}/swipe-box-group-1000002777_2-5979@1x.png`,
			x2: `${f}/swipe-box-group-1000002777_2-5979@2x.png`,
			x4: `${f}/swipe-box-group-1000002777_2-5979@4x.png`,
		},
		front: { beam: `${f}/swipe-front-beam-vector-7_2-5992.svg`, bookmark: `${f}/swipe-front-icon-bookmark_2-5997.svg` },
		left: { box: `${f}/swipe-left-box-group_2-5940.svg`, beam: `${f}/swipe-left-beam-vector-7_2-5953.svg`, bookmark: `${f}/swipe-left-icon-bookmark_2-5969.svg` },
		right: { box: `${f}/swipe-right-box-group_2-5899.svg`, beam: `${f}/swipe-right-beam-vector-7_2-5912.svg`, bookmark: `${f}/swipe-right-icon-bookmark_2-5930.svg` },
		/** The Saved chip's filled bookmark: "icon/bookmark" 2:3208 of the deck's saved frame (Discover deck · saved 2:3089). */
		bookmarkSaved: `${f}/saved-icon-bookmark_2-3208.svg`,
		coin: {
			nvda: `${f}/hero-6-nvidia-1_2-5738.png`,
			aapl: `${f}/hero-7-apple-1_2-5740.png`,
			googl: `${f}/hero-3-google-1_2-5732.png`,
		},
	},
	/** 04 Goal matrix (2:6023): the glyph inside each 57px disc. */
	goal: {
		learn: `${f}/goal-learn-frame_2-6057.svg`,
		grow: `${f}/goal-grow-frame_2-6066.svg`,
		first: `${f}/goal-first-frame-1618869227_2-6076.svg`,
		explore: `${f}/goal-explore-frame_2-6084.svg`,
	},
	/**
	 * 05 Risk matrix (2:6095): 2:6129 is the whole 57px disc with its plus; step and sell are the glyph group inside the
	 * #242b3d disc. "Hold" is Figma's 4x raster export of its whole disc "Frame" 2:6136 (228 x 228, byte-identical to the
	 * current export, 2026-10-18 11:00): Figma's SVG exporter keeps dropping the pupil, the second subpath of the eye
	 * vector 2:6138 (on 2026-10-10 and again now; one export at 08:00 today kept it, and was not kept in the repo),
	 * while the frame's render draws it; the raster lands 0.23 levels from the render on average against 0.74 for that SVG.
	 */
	risk: {
		buy: `${f}/risk-buy-frame_2-6129.svg`,
		hold: `${f}/risk-hold-frame_2-6136@4x.png`,
		step: `${f}/risk-step-group-1000002797_2-6145.svg`,
		sell: `${f}/risk-sell-frame_2-6154.svg`,
	},
} as const;
