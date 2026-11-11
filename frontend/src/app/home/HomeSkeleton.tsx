import { A } from "@/app/assets";
import { col } from "@/app/FitCanvas";
import { HOME } from "@/app/home/assets";
import { DECK, MOOD, PROMO_CARD, PROMO_ROW, WHY } from "@/app/home/compact";
import { GlassFile, SubpixelRect } from "@/app/home/Subpixel";
import { FigmaFile } from "@/app/Sidebar";
import { Bar } from "@/app/SidebarSkeleton";
import { cn } from "@/lib/utils";

/** The skeleton bars' fill (2:2023 and every "Rectangle" of the frame). */
const SKELETON = "#223050";

/**
 * Figma 2:1991 "Desktop · Home · Loading" (section 10 States): the Home layout with #223050 skeleton bars and the art
 * dimmed, built with the live page's geometry (_app.home.tsx). As in the frame, the 12px title bar stands where the 33px
 * greeting will be, so everything below starts 21px higher than on the loaded page. Every bar the frame puts on a
 * fraction of a pixel (the 2:2020 dump, 4 decimals) is a SubpixelRect: an SVG rect anti-aliased on Figma's rows and
 * columns, where a CSS box would be snapped to whole pixels. Below 1024 it reflows exactly as the live page does
 * (home/compact.ts; the phone header keeps the bell's disc and drops the logo bar, as PageHeader drops the wordmark).
 */
export function HomeSkeleton() {
	return (
		<div className="flex w-full flex-col items-start gap-[29px]" aria-busy="true">
			{/* "Frame 1618869230" 2:2021 (1134 x 70, gap 18): the "Wordmark row" 2:2022 (40 tall, space-between, centred) holds
			    the logo bar 2:2023 (111 x 14, radius 7, at y 13) and the bell's disc 2:2025 (35, #223050, radius 17.5; the bell
			    group 2:2026 inside it is hidden), then the 360 x 12 title bar 2:2032 at y 58 (never wider than the column) */}
			<div className="flex w-full flex-col items-start gap-[18px]">
				<div className="flex h-[40px] w-full items-center justify-between max-sm:justify-end">
					<Bar w={111} h={14} r={7} className="shrink-0 max-sm:hidden" />
					{/* the 40px row centres the 35px disc on y 2.5 (90.5 on the page): a circle drawn over the two rows it straddles,
					    as the live bell is */}
					<span className="relative size-[35px] shrink-0">
						<SubpixelRect left={0} top={0} width={35} height={35} radius={17.5} fill={SKELETON} shift={{ y: 0.5 }} />
					</span>
				</div>
				<Bar w={360} h={12} className="max-w-full" />
			</div>

			<div className="flex flex-col items-center gap-[55px]" style={{ width: col(885) }}>
				<div className="flex w-full flex-col items-end gap-[19px]">
					<section className={cn("relative h-[470px] w-full overflow-clip rounded-[16px] bg-[#171d2c]", MOOD.card)}>
						{/* "Frame 1618869229" 2:2036 at 28 / 26 (gap 407): the 360-wide column 2:2037 with its bars 2:2038 (259.2 x 12)
						    and 2:2039 (259.2 x 9.35 at y 16: fractional width and height, so their right and bottom edges are
						    anti-aliased), and "Group 314" 2:2040 at 15% in the right corner (its vectors at 15% too: Figma's file,
						    drawn as its own vectors) */}
						<div className="absolute left-[28px] right-[24.563px] top-[26px] flex items-start justify-between">
							<div className="relative h-[25.35px] w-[360px]">
								<SubpixelRect left={0} top={0} width={259.2} height={12} radius={6} fill={SKELETON} className="max-lg:hidden" />
								<SubpixelRect left={0} top={16} width={259.2} height={9.35} radius={6} fill={SKELETON} className="max-lg:hidden" />
								{/* below 1024 the column shrinks with the card, as the live header's does (its subtitle wraps there), and
								    the bars stop at the column's right edge, before the gauge, instead of running under it (a 358 card at
								    390 left the column 240 wide): the same two bars as CSS boxes no wider than the column */}
								<div className="absolute inset-0 hidden flex-col gap-[4px] max-lg:flex">
									<Bar w={259.2} h={12} className="max-w-full shrink-0" />
									<Bar w={259.2} h={9.35} className="max-w-full shrink-0" />
								</div>
							</div>
							<span className="relative h-[33.163px] w-[65.437px] shrink-0">
								<FigmaFile src={A.gaugeDim} width={65.4371} height={33.1627} className="absolute left-0 top-0" />
							</span>
						</div>

						{/* the three stories, placed by their frame origins and rotated about them like the live cards, their fills SVG
						    rects at Figma's fractional sizes (a CSS background is snapped to whole pixels before the rotation, which
						    put the turned cards' far edge 0.4px past Figma's); the bars of the two turned cards are rasterised through
						    the rotation anyway, the straight middle card's bars (2:2049 / 2:2050 at 15.2979 / 25.1967 and 55.1943)
						    sit on Figma's fraction */}
						<div className={cn("absolute left-[calc(50%-301.5px)] top-[130px] h-[284.022px] w-[241.592px] origin-top-left rotate-5 overflow-clip rounded-[6.927px] [overflow-clip-margin:1px]", MOOD.story1)}>
							<SubpixelRect left={0} top={0} width={241.592} height={284.022} radius={6.927} fill="#f9f9f9" />
							<div className="absolute left-[14.721px] top-[24.246px] flex w-[206.955px] flex-col items-start gap-[12.24px]">
								<Bar w={149.008} h={12} />
								<Bar w={139.032} h={12} />
							</div>
						</div>
						<div className={cn("absolute left-[calc(50%-121.5px)] top-[122px] h-[295.16px] w-[251.066px] overflow-clip rounded-[7.199px] [overflow-clip-margin:1px]", MOOD.story2)}>
							<SubpixelRect left={0} top={0} width={251.066} height={295.16} radius={7.199} fill="#69b3ca" />
							<SubpixelRect left={15.2979} top={25.1967} width={154.851} height={12} radius={6} fill={SKELETON} />
							<SubpixelRect left={15.2979} top={55.1943} width={144.4844} height={12} radius={6} fill={SKELETON} />
						</div>
						<div className={cn("absolute left-[calc(50%+64.5px)] top-[140px] h-[284.022px] w-[241.592px] origin-top-left -rotate-5 overflow-clip rounded-[6.927px] [overflow-clip-margin:1px]", MOOD.story3)}>
							<SubpixelRect left={0} top={0} width={241.592} height={284.022} radius={6.927} fill="#f9f9f9" />
							<div className="absolute left-[14.721px] top-[24.246px] flex w-[206.955px] flex-col items-start gap-[12.24px]">
								<Bar w={149.008} h={12} />
								<Bar w={139.032} h={12} />
							</div>
						</div>

						{/* "Frame 1618869060" 2:2055: the same 900 x 103 Glass band as the live card (CENTER / MAX, half a pixel right of
						    the card's centre; frost, light rim on top, dark rim below), clipped by the card */}
						<div aria-hidden="true" className={cn("pointer-events-none absolute left-[calc(50%-449.5px)] top-[367px] h-[103px] w-[900px] backdrop-blur-[1.8px]", MOOD.band)} />
						<div aria-hidden="true" className={cn("pointer-events-none absolute left-[calc(50%-449.5px)] top-[367px] h-px w-[900px] bg-[#040404] mix-blend-plus-lighter", MOOD.band)} />
						<div aria-hidden="true" className={cn("pointer-events-none absolute left-[calc(50%-449.5px)] top-[469px] h-px w-[900px] bg-[#131928]", MOOD.bandBottom)} />
					</section>

					<div className={cn("flex w-full items-end justify-between", PROMO_ROW)}>
						<div className={cn("relative h-[119px] w-[48.588%] overflow-clip rounded-[8.229px] bg-[#171d2c]", PROMO_CARD)}>
							{/* "Frame 1618869276" 2:2058 (CENTER / CENTER, 331.6572 x 100 at 49 / 10, gap 15): the 113 x 100 #1B2640 disc
							    2:2059, then the column 2:2060 at 128 / 36.5143 with its bars 2:2062 (123.84 x 8.8) and 2:2064
							    (146.6331 x 12, 6.1714 below), both on a fraction of a row */}
							<div className={cn("absolute left-[calc(50%-166px)] top-[calc(50%-49.5px)] h-[100px] w-[331.657px]", WHY.skeletonRow)}>
								<div className="absolute left-0 top-0 h-[100px] w-[113px] rounded-[500px] bg-[#1b2640]" />
								<SubpixelRect left={128} top={36.5143} width={123.84} height={8.8} radius={6} fill={SKELETON} />
								<SubpixelRect left={128} top={51.4857} width={146.6331} height={12} radius={6} fill={SKELETON} />
							</div>
						</div>
						<div className={cn("relative h-[119px] w-[48.588%] overflow-clip rounded-[8.229px] bg-[#69b3ca]", PROMO_CARD)}>
							{/* "Box" 2:2073 (fills #1B2640, strokes #223050; the Coins 2:2084 are hidden): Figma's file, its render bounds
							    from 35.3872 / 23.4717, drawn as its own vectors on that sub-pixel. As on the live card, the "Illustration"
							    2:2072 keeps its authored 35.86 as a fraction of the card (8.34%) when the card stretches. */}
							<div aria-hidden="true" className={cn("absolute left-[calc(8.34%-35.862px)] top-0 h-0 w-0", DECK.art)}>
								<FigmaFile src={A.deckBoxDim} width={138.065} height={114.323} x={0.3872} y={0.4717} className="absolute left-[35px] top-[23px]" />
							</div>
							{/* "Promo copy" 2:2066 (MIN / CENTER: 160.4571 x 55.2 at 235.3906 / 32.5715, its centre 0.67 below the card's;
							    235.39 from the left = 54.742% of the card, as on the live card): the bar 2:2067 (115.5291 x 12), the
							    "Go to Deck button" 2:2068 (126.5143 x 32.9143, #0A1020, radius 15.4286, 10.2857 below) with its bar
							    2:2069 (44.64 x 8.25 at 31.1657 / 12.3321) and the arrow 2:2070 (16.4571 at 78.8914 / 8.2286, its icon at
							    15%). Every one sits on a fraction of a pixel; this anchor puts the card's authored x on 54.742% so each
							    is placed by its authored coordinates (whole pixels at 1440). */}
							<div aria-hidden="true" className={cn("absolute left-[calc(54.742%-235.3906px)] top-0 h-0 w-0", DECK.skeletonCopy)}>
								<SubpixelRect left={235.3906} top={32.5715} width={115.5291} height={12} radius={6} fill={SKELETON} />
								<SubpixelRect left={235.3906} top={54.8572} width={126.5143} height={32.9143} radius={15.4286} fill="#0a1020" />
								<SubpixelRect left={266.5563} top={67.1893} width={44.64} height={8.25} radius={6} fill={SKELETON} />
								<span className="absolute left-[314px] top-[63px]">
									<FigmaFile src={A.arrowRightDim} width={16.4571} height={16.4571} x={0.282} y={0.0858} className="absolute left-0 top-0" />
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* "Frame 1618869171" 2:2096 (270 wide at 307.5 of the column: x 563.5 on the page, gap 23): the pill "Container"
				    2:2097 (136 x 51 at 67) and the 194.4 x 9.35 caption bar 2:2112 (centred: 37.8 from the block's left) */}
				<div className="flex w-[270px] flex-col items-center gap-[23px]">
					{/* "Container" 2:2097: the pill's glass at 15% (2:2100, Figma's render, 0.159 right of the pill, placed on that
					    fraction as the live pill is, without a clip) with the label bar 2:2111 (66.24 x 8 at 34.5393 / 22.9404 of the
					    pill, which itself starts on x .5) */}
					<div className="relative h-[51px] w-[136px] shrink-0 rounded-[163.643px]">
						<GlassFile node="2:2100" src={HOME.picksGlassLoading4x} />
						<SubpixelRect left={34.5393} top={22.9404} width={66.24} height={8} radius={6} fill={SKELETON} shift={{ x: 0.5 }} />
					</div>
					<span className="relative h-[9.35px] w-[194.4px] shrink-0">
						<SubpixelRect left={0} top={0} width={194.4} height={9.35} radius={6} fill={SKELETON} shift={{ x: 0.3 }} />
					</span>
				</div>
			</div>
		</div>
	);
}
