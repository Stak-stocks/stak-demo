import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { FROM_LISTING } from "./backToListing";
import { FADE, shown, useRestingPointer } from "./briefRotation";
import { HOT_INTERVAL_MS, type MiniStory, useHotRotation } from "./hot";

/**
 * "Mini · Markets" 2:4397: 129 tall (it grows with its copy below 1024, where the column may be narrower than its 360).
 * It opens its story's article at once, like a news card (no hover or pressed look in Figma: cursor and focus ring).
 *
 * The day's hottest stories, one at a time (the user's ruling of 2026-11-11, N62; src/app/news/hot.ts): it opens on the
 * hottest and shows the next every 30 s, the last wrapping to the first, each with its kicker (its category), title,
 * one line and source in the frame's layers and styles. The text cross-fades in 300 ms, the brief's change (FADE;
 * instant under reduced motion); the stories share one cell, as tall as the tallest, so the card never changes height as
 * it turns (below 1024 too). The card is ONE link to the story on show. WCAG 2.2.2: the rotation holds while the pointer
 * rests on the card or it has keyboard focus (useHotRotation, the brief's hold), also for a pointer already resting on
 * it as it mounts (useRestingPointer). Not a live region: a change of story is never announced; the stories off show
 * are hidden from assistive technology, so the link's name is the story it opens.
 *
 * The listing's search hands the card only the hot stories that match (one holds still), as the brief's carousel
 * carries its hits, and keys it on the search alone (search.ts miniSearchKey): a new search starts it at the hottest
 * match, a live quote never rebuilds it.
 */
export function MiniCard({ stories }: { stories: readonly MiniStory[] }) {
	const { stories: list, index, bind } = useHotRotation(stories, HOT_INTERVAL_MS);
	const cardRef = useRef<HTMLAnchorElement>(null);
	useRestingPointer(cardRef, bind.onPointerEnter);
	const current = list[index] ?? list[0];
	if (!current) return null;
	return (
		<Link
			ref={cardRef}
			to="/news/$id"
			params={{ id: current.id }}
			state={FROM_LISTING}
			viewTransition={false}
			{...bind}
			className="flex h-[129px] w-full cursor-pointer flex-col items-start overflow-clip rounded-[12px] bg-[#181f30] px-[18px] pb-[14px] pt-[16px] max-lg:h-auto max-lg:min-h-[129px]"
		>
			{/* the stories' layers, stacked in one cell */}
			<div className="grid w-full">
				{list.map((story, i) => (
					<div
						key={story.id}
						aria-hidden={i === index ? undefined : true}
						className={`col-start-1 row-start-1 flex w-full flex-col items-start gap-[21px] ${FADE} ${shown(i === index)}`}
					>
						<div className="flex w-full flex-col items-start gap-[8px]">
							<p className="whitespace-nowrap font-geist text-[9px] font-medium leading-[12px] tracking-[0.72px] text-[#5bd7e4]">{story.kicker}</p>
							<p className="w-full font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{story.title}</p>
							<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{story.body}</p>
						</div>
						<p className="whitespace-nowrap font-geist text-[10px] leading-[13px] text-[#819abb]">{story.source}</p>
					</div>
				))}
			</div>
		</Link>
	);
}
