/**
 * Home below 1024 (the responsive run: SPEC.md rules R1-R11, CORE-API.md): the same Figma pieces, rearranged; nothing
 * changes at 1024 and above, since every class here is a max-* variant (`max-[820px]:` is `@media (width < 820px)` in
 * Tailwind v4, `max-sm:` is below 640). Shared by the live page (_app.home.tsx) and its loading skeleton
 * (HomeSkeleton.tsx), so both reflow the same way.
 *
 * Below 820 (phones, and tablets whose column is under 700): the Market Mood card's fan of stories is 656 wide at 1440
 * and R4 forbids shrinking its text, so the three stories stack top to bottom in the phone frame's order (1:1054:
 * story 1, 2, 3 cascading down), each at Figma's size, centred and untilted, 240 apart: a story's caption (2:458 /
 * 2:463 / 2:468, the lowest text of a card) ends 205.5, 234 and 224.3 below its top, so the next opaque card, 240
 * lower, leaves every caption clear (R1 / R9: 34 px of white under the first card's, 6 under the blue card's, where a
 * 140 pitch painted the next card over both). The third story keeps the frame's 227 to the glass band (its caption 2.75
 * above the frost, as at 1440), so the card grows to 932 and keeps the 103 band over its bottom, as the 470 card keeps
 * it at 367. The "Why this matters" | deck card row stacks (R2: reading order, which is also the phone frame's order:
 * Why, then the deck), each card filling the column (R3). From 820 up the 1440 arrangement holds in the narrower
 * column (the fan fits from a 660-wide card, the two 48.588 % cards from a 700 column).
 */

/** The Market Mood card (2:446), its header subtitle, stories (2:454 / 2:459 / 2:464) and glass band (2:469) below 820. */
export const MOOD = {
	card: "max-[820px]:h-[932px]",
	/** the subtitle wraps in the narrower header (its box is Figma's 17 at 1440) */
	subtitle: "max-[820px]:h-auto",
	story1: "max-[820px]:left-[calc(50%-120.796px)] max-[820px]:top-[122px] max-[820px]:rotate-0",
	story2: "max-[820px]:left-[calc(50%-125.533px)] max-[820px]:top-[362px]",
	story3: "max-[820px]:left-[calc(50%-120.796px)] max-[820px]:top-[602px] max-[820px]:rotate-0",
	band: "max-[820px]:top-[829px]",
	bandBottom: "max-[820px]:top-[931px]",
} as const;

/** The "Why this matters" | deck card row (2:471 | 2:480) below 820: stacked, each card the column's width. */
export const PROMO_ROW = "max-[820px]:flex-col max-[820px]:items-stretch max-[820px]:gap-[19px]";
export const PROMO_CARD = "max-[820px]:w-full";

/**
 * The Why card's content row (2:472: 341 wide, placed 171 left of the card's centre, 44 from the left of the 430 card).
 * Below 1024 a card narrower than the row (340.1 at 820, where the two cards share a 700 column) would start it a pixel
 * outside the card's left edge (-0.94): the row never starts before the edge or runs wider than the card there (its
 * 331.66 of content still fits). In a card under 358 (windows under 390): anchored 3 from the left, where the phone
 * frame places its icon (1:1088 at x 3), the text column taking what is left up to an 8 right margin, and the title
 * wrapping where even that is too narrow (a 288 card at 320). The skeleton's row (2:2058, 331.66 wide) only needs the
 * anchor. (Tailwind emits the px-valued max-[...] variants before the named max-lg / max-sm ones, widest first, so the
 * 1024 rules here stay in the px family for the 390 rules to override them.)
 */
export const WHY = {
	row: "max-[1024px]:left-[max(0px,calc(50%-171px))] max-[1024px]:max-w-full max-[390px]:left-[3px] max-[390px]:right-[8px] max-[390px]:w-auto",
	column: "max-[390px]:w-auto max-[390px]:min-w-0 max-[390px]:flex-1",
	titleBox: "max-[390px]:h-auto",
	title: "max-[390px]:whitespace-normal",
	skeletonRow: "max-[390px]:left-[3px]",
} as const;

/**
 * The deck card below 1024. The copy block "Promo copy" 2:481 is at most Figma's 160.46 wide (R3: a block with a Figma
 * width is never wider than it below 1024; the 37.316 % fraction was the ruling for the stretched card ABOVE 1440) and is
 * anchored to the card's RIGHT at Figma's margin (34.15 of 430 = 7.942 %): where the cap binds (cards wider than 430, i.e.
 * phones from 462 and every tablet) the block hugs the right edge as the frame draws it instead of floating mid-right
 * with an empty field beside it (the layout the user rejected on 2026-10-08; final-review finding of 2026-10-25); where
 * it does not bind (cards up to 430) right 7.942 % puts the block exactly where left 54.742 % did. In a 430-699 card the
 * sentence breaks exactly as at 1440, "Take your first deck to / build your taste", where a 212-227 block (568-607
 * cards) wrapped its last word alone. On the narrowest
 * phones (windows under 360: a card under 328) the Illustration 2:487 scales as one unit (R4: it holds no text) so it
 * ends clear of the copy, and the copy block takes the Go to Deck pill's width at an 8 right margin instead of its
 * 37.316 % of the card, which no longer holds the 126.5 pill. The skeleton's copy anchor is a 0 x 0 box whose children
 * (Figma's 160.46 bars) sit at x 235.39: its pill's right edge lands 8 from the card's too.
 */
export const DECK = {
	art: "max-[360px]:origin-top-left max-[360px]:scale-[0.86]",
	copy: "max-lg:max-w-[160.457px] max-lg:left-auto max-lg:right-[7.942%] max-[360px]:right-[8px] max-[360px]:w-[126.514px]",
	skeletonCopy: "max-[360px]:left-auto max-[360px]:right-[369.905px]",
} as const;
