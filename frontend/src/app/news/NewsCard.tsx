import { Link } from "@tanstack/react-router";
import { DensityImg, useCanvasSize } from "@/app/FitCanvas";
import { THUMB_SETS } from "./assets";
import { FROM_LISTING } from "./backToListing";
import type { NewsCardData } from "./data";

/**
 * A text box as wide as Figma's hug text: Figma sizes an auto-width text box to whole pixels (the "In your STAK"
 * label is 47 wide in a 63 pill, Chrome lays the same glyphs out in 46.92), so pills and "Read ›" land where the
 * frame puts them.
 */
export const HUG_WIDTH = "w-[calc-size(fit-content,round(up,size,1px))]";

// below 1024 the card is as wide as the column and grows with a headline that wraps there (R3, R9); 1024+ unchanged
const CARD = "flex h-[100px] w-full items-center gap-[14px] overflow-clip rounded-[14px] bg-[#181f30] px-[16px] py-[14px] max-lg:h-auto max-lg:min-h-[100px]";

/**
 * "News card" (Figma 2:4408 and its five siblings): 552x100 at 1440, #181f30, radius 14, 14/16 padding, 14 gap,
 * the 66px "Thumb" (its image fill, FILL mode, radius 11), the "In your STAK" pill (#242b3d, 3/8 padding, Geist
 * Medium 8 #5bd7e4), the title (Geist Medium 13, 430 of the 440 column) and the source (Geist 11 #819abb).
 *
 * Every card opens its own story's article with no transition, as the prototype wires the Apple one (phone "Story
 * tile" 1:1220 -> "News detail page unsaved" 1:1319, INSTANT); Figma's article 2:4453 is the template every story's
 * article follows (the user's ruling of 2026-11-01; src/app/news/articles.ts). Figma defines no hover or pressed look
 * for a card (a plain frame, no variants, no "change to"), so the link keeps only the cursor and the canvas's keyboard
 * focus ring.
 */
export function NewsCard({ card }: { card: NewsCardData }) {
	// past 2560 the canvas zooms (up to 3x on 8K): DensityImg then draws the source that covers the zoom (THUMB_SETS);
	// up to 2560 and below 1024 the thumb is the same <img> as approved
	const zoomed = useCanvasSize().zoom > 1;
	const body = (
		<>
			<DensityImg
				src={card.thumb}
				srcSet={zoomed ? THUMB_SETS[card.thumb] : undefined}
				width={66}
				height={66}
				decoding="async"
				className="size-[66px] shrink-0 rounded-[11px] object-cover"
			/>
			<div className="flex h-[60px] min-w-0 flex-1 flex-col items-start gap-[5px] overflow-clip max-lg:h-auto max-lg:min-h-[60px]">
				<span className="flex items-start overflow-clip rounded-[999px] bg-[#242b3d] px-[8px] py-[3px]">
					<span className={`${HUG_WIDTH} whitespace-nowrap font-geist text-[8px] font-medium leading-[10px] text-[#5bd7e4]`}>{card.tag}</span>
				</span>
				<span className="w-[calc(100%-10px)] font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{card.title}</span>
				<span className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">{card.source}</span>
			</div>
		</>
	);
	// the article entry it pushes says the listing came before it, so the article's Back steps back to the listing
	// with its search (src/app/news/backToListing.ts)
	return (
		<Link to="/news/$id" params={{ id: card.id }} state={FROM_LISTING} viewTransition={false} className={`cursor-pointer ${CARD}`}>
			{body}
		</Link>
	);
}

/**
 * "Frame 1618869219" / "Frame 1618869221": the 18px Sora heading, 15 above three cards 16 apart. One of the two
 * 552 columns of the listing's story row; below 1024 the row stacks and the section is the column (R2, R3).
 *
 * `wide`: the person's only section (src/app/news/sections.ts loneSection: no saves, so Markets holds every story, as
 * on the phones) takes the whole row at 1024 and up: the one heading, then its cards in the frame's two columns (each
 * card the frame's 552 x 100 at 1440, 16 apart, the columns 40 apart: the places of the frame's six cards), filled row
 * by row, so reading and Tab order run left to right, top to bottom. Below 1024 it is the same one column as ever.
 */
export function NewsColumn({ title, cards, wide = false }: { title: string; cards: readonly NewsCardData[]; wide?: boolean }) {
	return (
		<section data-news-section={wide ? "wide" : undefined} className="flex min-w-0 flex-1 flex-col items-start gap-[15px] max-lg:w-full max-lg:flex-none">
			<h2 className="w-full font-sora text-[18px] font-semibold leading-[23px] text-[#f2f6fc]">{title}</h2>
			<div
				className={
					wide
						? "grid w-full grid-cols-2 items-start gap-x-[40px] gap-y-[16px] max-lg:flex max-lg:flex-col max-lg:gap-[16px]"
						: "flex w-full flex-col items-start gap-[16px]"
				}
			>
				{cards.map((card) => (
					<NewsCard key={card.id} card={card} />
				))}
			</div>
		</section>
	);
}
