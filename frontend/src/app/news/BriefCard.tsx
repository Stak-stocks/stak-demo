import { Link } from "@tanstack/react-router";
import { type CSSProperties, useCallback, useEffect, useRef } from "react";
import { N } from "./assets";
import { FROM_LISTING } from "./backToListing";
import { BRIEF_INTERVAL_MS, FADE, FADE_OPACITY, shown, swipeTarget, useBriefRotation, useBriefSwipe, useRestingPointer } from "./briefRotation";
import { type BriefData, CHEVRON } from "./data";
import { HUG_WIDTH } from "./NewsCard";

/*
 * The change of brief is the rotating cards' cross-fade (briefRotation.ts FADE: the app's 300 ms dissolve, the leaving
 * brief turning invisible once it has faded; instant under reduced motion).
 */

/**
 * "Todays brief" 2:4372: 744x250, #69b3ca, radius 16, 24/26/20/26 padding. In its row it splits 744 : 360 around the
 * 40 gap (1104 of 1144); above 1440 both cards keep that exact share of the real row, the gap stays 40. Below 1024 it
 * is as wide as the column and grows with its wrapped title and dek (its Read row and dots stay below them, R9).
 *
 * A carousel of three briefs (the user's ruling of 2026-11-01, pointing at its three dots: "here every 25 seconds it
 * moving to the next news"): the frame's Dow brief, then the Fed minutes and June jobs stories, each with its title,
 * dek, source and Read › to its article. Every 25 s the next one shows (the last wraps to the first) and the active dot
 * follows: the dots keep Figma's 6 px ellipses, 6 apart, the first one's look (#0e162b) marks the brief on show and the
 * other two keep the inactive look (#0e162b at 25 %). The text cross-fades in 300 ms (FADE); the three briefs share one
 * cell, as tall as the tallest, so the card never changes height as it pages. At load it shows the frame's brief.
 * WCAG 2.2.2: the rotation holds while the pointer is on the card or a control in it has keyboard focus
 * (useBriefRotation); the dots are buttons that jump to a brief and restart the 25 s. Not a live region: a change of
 * brief is never announced. The focus ring inside the card is the card's ink (#0e162b): the canvas's #69b3ca ring
 * would vanish on the card's own #69b3ca.
 *
 * The listing's search hands the card only the briefs that match (as the mobile apps' carousel carries only its hits):
 * the dots then count them, the rotation runs among them (one never moves) and each still opens its own article. The
 * route keys the card on its briefs, so a new set of hits starts at its first one; a pointer resting on the card as
 * it remounts keeps holding it (useRestingPointer).
 *
 * The WHOLE card opens the brief on show, as both phones' card is one button (android NewsScreen.kt:290-304
 * `.clickable(onClick = onRead)`, iOS NewsView.swift:226-273 `Button(action: onRead)`; the audit's news #1, the
 * coordinator's D9): Read › stays the one link, stretched over the card (its ::after covers the card, positioned on the
 * card), and the dots are drawn after it, so they stay their own buttons on top and no button sits inside a link. On a
 * touch screen a swipe across the card turns the brief (useBriefSwipe; the phones' pager), restarting the 25 s clock, and
 * stops at the first and the last brief as the phones' pagers do (only the clock wraps); a tap opens the article. Nothing
 * changes at rest: the stretch and the touch handling paint no pixel.
 *
 * The card opens on `start` (the first brief when absent) and reports every brief it shows through `onShow`, at mount
 * too: the listing remembers the brief on show for its history entry, so stepping back from an article finds the card
 * as the person left it, as the phones' pager keeps its page (src/app/news/briefMemory.ts).
 */
export function BriefCard({
	briefs,
	style,
	start,
	onShow,
}: {
	briefs: readonly BriefData[];
	style?: CSSProperties;
	/** the brief to open on (its index among `briefs`) */
	start?: number;
	/** the brief on show, whenever it changes (a dot, a swipe, the clock) and as the card mounts */
	onShow?: (index: number) => void;
}) {
	const { index, go, bind } = useBriefRotation(briefs.length, BRIEF_INTERVAL_MS, start);
	useEffect(() => {
		onShow?.(index);
	}, [onShow, index]);
	// a swipe stops at the first and last brief, as the phones' pagers do (swipeTarget); the clock alone wraps
	const turn = useCallback(
		(step: 1 | -1) => {
			const next = swipeTarget(index, step, briefs.length);
			if (next !== null) go(next);
		},
		[go, index, briefs.length],
	);
	const swipe = useBriefSwipe(turn);
	const cardRef = useRef<HTMLDivElement>(null);
	useRestingPointer(cardRef, bind.onPointerEnter);
	const current = briefs[index] ?? briefs[0]!;
	// Figma's dots export draws three dots (30 x 6); fewer briefs show its first ones, one per brief (12 px apiece)
	const dotsWidth = Math.min(briefs.length, 3) * 12 - 6;
	const fewerDots = dotsWidth < 30;
	return (
		<div
			ref={cardRef}
			role="group"
			aria-roledescription="carousel"
			aria-label="Today’s brief"
			{...bind}
			{...swipe}
			className="relative isolate flex h-[250px] min-w-0 touch-pan-y touch-pinch-zoom flex-col items-start overflow-clip rounded-[16px] bg-[#69b3ca] px-[26px] pb-[20px] pt-[24px] max-lg:h-auto max-lg:min-h-[250px] max-lg:w-full"
			style={style}
		>
			<div className="flex w-full flex-col items-start gap-[12px]">
				<div className="flex w-full flex-col items-start gap-[45px]">
					<div className="flex w-full flex-col items-start gap-[12px]">
						<p className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[rgba(14,22,43,0.7)]">{current.kicker}</p>
						{/* the briefs' title and dek, stacked in one cell */}
						<div className="grid w-full">
							{briefs.map((brief, i) => (
								<div
									key={brief.id}
									aria-hidden={i === index ? undefined : true}
									className={`col-start-1 row-start-1 flex w-full flex-col items-start gap-[12px] ${FADE} ${shown(i === index)}`}
								>
									<p className="w-full font-sora text-[22px] font-semibold leading-[28px] text-[#0e162b]">{brief.title}</p>
									<p className="w-full font-geist text-[14px] leading-[18px] text-[rgba(14,22,43,0.8)]">{brief.dek}</p>
								</div>
							))}
						</div>
					</div>
					{/* "Frame" 2:4380: 667 wide (the 692 column less 25), Read › left, the source right; it clips like the frame
					    except while Read › has keyboard focus, so its ring shows whole. Read › is stretched over the whole card
					    (its ::after, absolute on the card: an ancestor's box, so neither this row's clip nor the link's own cuts it),
					    one layer up inside the card (isolate: the card's own stacking context), over the texts that follow it in
					    the document (the source line: every plain text is its own filter group, styles.css, a layer of its own) */}
					<div className="flex h-[20px] w-[calc(100%-25px)] items-center justify-between overflow-clip whitespace-nowrap [&:has(:focus-visible)]:overflow-visible">
						<Link
							to="/news/$id"
							params={{ id: current.id }}
							state={FROM_LISTING}
							viewTransition={false}
							aria-label={`${current.read}: ${current.title}`}
							className="flex cursor-pointer items-center gap-[6px] overflow-clip font-geist text-[13px] font-medium leading-[17px] text-[#0e162b] after:absolute after:inset-0 after:z-[1] after:content-[''] focus-visible:outline-[#0e162b]!"
						>
							<span className={HUG_WIDTH}>{current.read}</span>
							<span className={HUG_WIDTH}>{CHEVRON}</span>
						</Link>
						<span className="grid justify-items-end">
							{briefs.map((brief, i) => (
								<span
									key={brief.id}
									aria-hidden={i === index ? undefined : true}
									className={`${HUG_WIDTH} col-start-1 row-start-1 font-geist text-[11px] leading-[14px] text-[rgba(14,22,43,0.6)] ${FADE} ${shown(i === index)}`}
								>
									{brief.source}
								</span>
							))}
						</span>
					</div>
				</div>
				{/* "Frame" 2:4385: the three 6 px ellipses, 6 apart (30 x 6), drawn by Figma's own export of the frame: the
				    first dot's look (#0e162b) marks the brief on show, the other two the inactive look (#0e162b at 25 %). With
				    another brief on show its change is drawn over the export, fading with the text: the first dot covered in the
				    card's colour and given the inactive look, the active look over the dot of the brief on show; at load nothing
				    is drawn over it (the frame, pixel for pixel). Each dot is a button; below 1024 it answers a 12 x 24 touch
				    area (no pixel drawn; the R8 ruling of 2026-10-31), the dots' 12 px pitch tiled without overlap. */}
				{/* With fewer briefs (a search's hits) the strip is as wide as their dots and the export shows its first ones,
				    drawn at its own size from the left, the rest cut off: the first dot's look, then the inactive one. */}
				<div className="relative z-[2] flex h-[6px] w-[30px] shrink-0" style={fewerDots ? { width: dotsWidth } : undefined}>
					{fewerDots ? (
						<img alt="" src={N.dots} width={30} height={6} className="h-[6px] max-w-none object-none object-left" style={{ width: dotsWidth }} />
					) : (
						<img alt="" src={N.dots} width={30} height={6} className="h-[6px] w-[30px]" />
					)}
					{briefs.map((brief, i) => (
						<button
							key={brief.id}
							type="button"
							aria-label={`Brief ${i + 1} of ${briefs.length}`}
							aria-current={i === index ? "true" : undefined}
							onClick={() => go(i)}
							className="absolute top-0 size-[6px] cursor-pointer rounded-full focus-visible:outline-[#0e162b]! max-lg:before:absolute max-lg:before:inset-[-9px_-3px]"
							style={{ left: i * 12 }}
						>
							<svg width="6" height="6" viewBox="0 0 6 6" overflow="visible" aria-hidden="true" className={`block ${FADE_OPACITY} ${(i === 0) !== (i === index) ? "" : "opacity-0"}`}>
								{i === 0 ? (
									<>
										<circle cx="3" cy="3" r="3.5" fill="#69B3CA" />
										<circle cx="3" cy="3" r="3" fill="#0E162B" fillOpacity="0.25" />
									</>
								) : (
									<circle cx="3" cy="3" r="3" fill="#0E162B" />
								)}
							</svg>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
