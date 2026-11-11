import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { A } from "@/app/assets";
import { col, DensityImg } from "@/app/FitCanvas";
import { HOME } from "@/app/home/assets";
import { DECK, MOOD, PROMO_CARD, PROMO_ROW, WHY } from "@/app/home/compact";
import { cardsLeft, DECK_RECAP, type DeckState, deckPromoBody, type MoodStory, moodStories, picksCaption, showsPicks, whyBody } from "@/app/home/copy";
import { isShowcase } from "@/app/live/showcase";
import { DeckIllustration } from "@/app/home/DeckIllustration";
import { hasActed, useFirstRun } from "@/app/home/firstRun";
import { HomeSkeleton } from "@/app/home/HomeSkeleton";
import "@/app/home/ink.css";
import { usePanelSeat } from "@/app/home/panelSeat";
import { GlassFile, SubpixelRect } from "@/app/home/Subpixel";
import { collectionOf } from "@/app/live/catalog";
import { usePreloadNext } from "@/app/news/preload";
import { PageHeader } from "@/app/PageHeader";
import { useAccountDisplay } from "@/app/useAccountDisplay";
import { affectedCollections, homePromos, marketMood } from "@/app/data/home";
import { NotificationsPanel } from "@/app/notifications/NotificationsPanel";
import { useProfileStats } from "@/app/profile/stats";
import { FigmaFile } from "@/app/Sidebar";
import { cn } from "@/lib/utils";

type NotificationsVariant = "list" | "empty";
/** The search without the panel's parameter (the bell closing a deep-linked panel; the panel itself does the same on Esc / a press outside). */
const withoutNotifications = ({ notifications: _dropped, ...rest }: Record<string, unknown>) => rest;
/**
 * The screen map's forms are /home?firstRun=1, ?loading=1, ?notifications=1 and ?notifications=empty; onboarding's last
 * step navigates with `firstRun: true`. Each value is kept as it came (1 stays the number 1, true stays true), so the
 * router never re-serialises the URL on load (a second navigation, which used to rewrite ?notifications=1 to
 * ?notifications=%221%22 and skip the view transition).
 */
type HomeSearch = { firstRun?: true | 1; notifications?: 1 | "empty"; loading?: true | 1 };

export const Route = createFileRoute("/_app/home")({
	validateSearch: (search: Record<string, unknown>): HomeSearch => ({
		firstRun: search.firstRun === true ? true : search.firstRun === 1 || search.firstRun === "1" ? 1 : undefined,
		loading: search.loading === true ? true : search.loading === 1 || search.loading === "1" ? 1 : undefined,
		notifications:
			search.notifications === 1 || search.notifications === "1" || search.notifications === true
				? 1
				: search.notifications === "empty"
					? "empty"
					: undefined,
	}),
	component: HomePage,
});

/**
 * Figma 2:414 "Desktop · Home · Main" and 2:532 "Desktop · Home · first run" (no picks block).
 * First run is a person's visit before they have done anything (no save, holding, sale, pass, finished deck or decision
 * today), and it ends for good at their first hop, as on the phones (home/firstRun.ts: their persisted Session flag,
 * Android StakNavHost.kt:916-930 / Session.kt, iOS MainTabsView.swift:183-195 / Session.swift): the first hop to a tab
 * page (any of Home's links, the rail, the phone menu, a notification row) ends it on this browser for this account; the
 * bell's panel and the Profile pages (the phones' Profile push) keep it. Onboarding's hand-off (`firstRun: true`, a new
 * account) lets that decide, so Back to the hand-off entry after a hop shows Home Main; `?firstRun=1` stays the capture
 * switch that always draws 2:532.
 *
 * Wiring (read 2026-10-11: the desktop frames carry no reactions; the phone page's Home Main 1:1054 / Home first run
 * 1:915 do): the Market Mood card's header opens News (1:1059 -> 1:1186) and each of its stories its own article (D12,
 * MarketMoodCard), "Why this matters" opens My STAK (1:1082 -> 1:3501), the deck card and the See Todays Pick pill open
 * the Discover deck (1:1090 / 1:987 -> 1:1741). Every one is a NAVIGATE with no transition (instant), so these links
 * skip the app's default route dissolve. Home is reached from every tab's "Tab · Home" (SWAP, instant: the sidebar)
 * and, first run, from Sign in and the last onboarding step (PUSH LEFT 0.3 s, those groups' routes). No frame draws a
 * hover or pressed state for the cards (the same ruling as the bell, the wordmark, the sidebar and Discover's buttons),
 * so they carry none; keyboard focus keeps the app's focus ring.
 *
 * Below 1024 the same pieces reflow (home/compact.ts: the stories cascade and the promo row stacks below 820, the
 * phone header keeps the bell and drops the wordmark the top bar already shows; the notifications panel keeps Figma's
 * seat beside the greeting only where it clears the greeting and the Market Mood card's heading, wide tablets, and is
 * otherwise in flow under the header: home/panelSeat.ts); everything from 1024 up is exactly the approved layout.
 */
function HomePage() {
	const { firstRun, notifications, loading } = Route.useSearch();
	if (loading) return <HomeSkeleton />;
	// only the capture switch (?firstRun=1, the number 1) forces the first-run frame; onboarding's `true` lets the data decide
	return <HomeLive forceFirstRun={firstRun === 1} notifications={notifications} />;
}

/** A save is "affected" when its collection is one today's Market Mood stories touch (data/home.ts `affects`). */
const isAffected = (ticker: string) => affectedCollections.has(collectionOf(ticker));

/** Where Home's links lead, loaded once the page is idle so the first click opens at once (the routes load code only). */
const NEXT_SCREENS = [{ to: "/news" }, { to: "/news/$id", params: { id: marketMood.deck[0].id } }] as const;

/** The texts that share the notifications panel's band at Figma's seat: the greeting (2:2640) and the card's header (2:449 / 2:450). */
const PANEL_CLEAR_OF = 'h1, [data-node-id="2:449"], [data-node-id="2:450"]';

function HomeLive({ forceFirstRun, notifications }: { forceFirstRun: boolean; notifications?: 1 | "empty" }) {
	const fromSearch: NotificationsVariant | null = notifications === 1 ? "list" : notifications === "empty" ? "empty" : null;
	const [panel, setPanel] = useState<NotificationsVariant | null>(fromSearch);
	// the address decides while it carries the parameter (a deep link, Back / Forward across one); the panel drops it on
	// its own dismissals (Esc, a press outside), and the bell below drops it when it closes the panel
	useEffect(() => setPanel(fromSearch), [fromSearch]);
	const navigate = useNavigate();
	// The bell is the panel's only control (2:435; no desktop reaction, the phone's Notifications pages leave with an
	// instant Back): open -> closed, closed -> the list. Closing a panel a link opened also takes `?notifications=` out
	// of the address (replace, no transition), so a reload or Back does not bring the panel back. The bell decides from
	// the state at the click, in one place: when the parameter drop ran first (a capture listener), the address sync
	// above closed the panel before this toggle saw it, and the toggle opened it again.
	const onBell = () => {
		if (!panel) {
			setPanel("list");
			return;
		}
		setPanel(null);
		if (fromSearch) navigate({ to: ".", search: (prev: Record<string, unknown>) => withoutNotifications(prev) as never, replace: true, resetScroll: false, viewTransition: false });
	};
	const { live, deck } = useProfileStats();
	// first run: the capture switch, or a person who has done nothing yet and has not hopped off Home (home/firstRun.ts)
	const acted = hasActed({
		saves: live.saves.length,
		positions: live.positions.length,
		sold: live.sold.length,
		passed: live.passed.length,
		completedDecks: live.completedDecks,
		decidedToday: deck.decided.size,
	});
	const isFirstRun = useFirstRun({ forced: forceFirstRun, acted, ready: live.ready, uid: live.uid });
	usePreloadNext(NEXT_SCREENS);
	const saves = live.saves;
	const showcase = isShowcase(live);
	const why = useMemo(() => whyBody(saves.map((s) => s.ticker), isAffected, { showcase }), [saves, showcase]);
	const deckState: DeckState = { total: deck.total, index: deck.index, decided: deck.decided.size, done: deck.done };
	const left = cardsLeft(deckState);
	// below 1024 the panel's seat: Figma's (floating beside the greeting) where it clears the greeting and the Market Mood
	// card's title and subtitle (2:449 / 2:450, the texts beside it in the frame), else in flow under the header
	const root = useRef<HTMLDivElement>(null);
	const seat = usePanelSeat(root, PANEL_CLEAR_OF);
	return (
		<div ref={root} className="relative flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={useAccountDisplay().greeting} onBell={onBell} />
			{panel && <NotificationsPanel variant={panel} seat={seat} onClose={() => setPanel(null)} />}
			<div className="flex flex-col items-center gap-[55px]" style={{ width: col(885) }}>
				<div className="flex w-full flex-col items-end gap-[19px]">
					<MarketMoodCard />
					<div className={cn("flex w-full items-end justify-between", PROMO_ROW)}>
						<WhyCard body={why} />
						<DeckPromoCard body={deckPromoBody(deckState, { completedDecks: live.completedDecks, saves: saves.length, showcase })} done={left === 0} />
					</div>
				</div>
				{/* the pill invites to today's picks: it is drawn while the deck still holds one (home/copy.ts showsPicks) */}
				{!isFirstRun && showsPicks(left) && <SeePicks remaining={left} />}
			</div>
		</div>
	);
}

/** The Market Mood card's heading: it names the card's region (the header link and the three story links). */
const MOOD_TITLE_ID = "home-market-mood";

/** The ids that name a story link by its title and describe it by its body and source line. */
const storyIds = (story: MoodStory) => ({ title: `home-story-${story.id}-title`, body: `home-story-${story.id}-body`, source: `home-story-${story.id}-source` });

/**
 * One "Deck promo" story card as its own link to its article (the coordinator's decision D12, the user's "each card takes
 * me direct to their respective news section"): /news/<id>, instant like a listing card (the article route opens it with
 * no transition, as the prototype wires the Apple story tile 1:1220 -> 1:1319). The link is the card itself, so the whole
 * card (its lower part under the glass band too: the band takes no pointer) opens it; it is named by its title and
 * described by its body and source line. Figma draws no hover or pressed look for the cards (plain frames, no variants),
 * so none: the cursor and the canvas's keyboard focus ring only. A focused card is lifted above its neighbours and the
 * glass band (focus only) so the ring shows whole around a card the fan otherwise half covers; nothing moves at rest.
 */
function StoryLink({ story, className, children }: { story: MoodStory; className: string; children: ReactNode }) {
	const ids = storyIds(story);
	return (
		<Link
			to="/news/$id"
			params={{ id: story.id }}
			viewTransition={false}
			aria-labelledby={ids.title}
			aria-describedby={`${ids.body} ${ids.source}`}
			className={cn("cursor-pointer focus-visible:z-[1]", className)}
		>
			{children}
		</Link>
	);
}

/**
 * "Market Mood card" 2:446: 885 x 470, #171D2C, radius 16, clipped. The header "Frame 1618869229" sits at 28 / 26; its
 * text column is 360 wide and the gauge "Group 314" ends 24.56 from the card's right edge (at 1440 the frame's fixed
 * 407 gap puts it exactly there; on wider screens it stays in the corner with the card instead of drifting inwards).
 * The three "Deck promo" stories are constrained CENTER / MIN: each keeps its offset from the card's centre line.
 *
 * Wiring (D12): the card is a container, no longer one link. Its header (title, subtitle, gauge) keeps the prototype's
 * Market Mood -> News (phone 1:1059 -> 1:1186, instant); each story is its own link to its article (StoryLink): the fear
 * gauge -> /news/fear-gauge-32, the Fed notes -> /news/fed-minutes, the OpenAI IPO -> /news/openai-ipo-delayed. The
 * phones send the whole card to the News tab (Android HomeScreen.kt:246-258 with StakNavHost.kt:928, iOS
 * HomeView.swift:239-306 with MainTabsView.swift:193); the user's directive gives every card its own article. The same
 * holds at the 390 cascade and in first run (2:532: the same card).
 */
function MarketMoodCard() {
	// the stories as authored, their dated words on today's calendar (home/copy.ts moodStories: the Fed card's "land July 8")
	const [left, mid, right] = moodStories() as [MoodStory, MoodStory, MoodStory];
	const midIds = storyIds(mid);
	return (
		<section aria-labelledby={MOOD_TITLE_ID} className={cn("relative h-[470px] w-full overflow-clip rounded-[16px] bg-[#171d2c]", MOOD.card)}>
			<Link to="/news" viewTransition={false} className="absolute left-[28px] right-[24.563px] top-[26px] flex cursor-pointer items-start justify-between">
				{/* in a card narrower than the 360 column plus the gauge (below 820) the column shrinks and the subtitle wraps */}
				<div className="flex w-[360px] flex-col items-start gap-[4px]">
					{/* Sora SemiBold 22 / Geist Regular 13, line height Auto (Figma's boxes: 28 and 17); light on dark, so drawn at
					    Figma's stroke weight (stak-ink, ink.css) */}
					<h2 id={MOOD_TITLE_ID} data-node-id="2:449" className="stak-ink h-[28px] w-full font-sora text-[22px] font-semibold leading-[28px] text-[#f2f6fc] [--ink:#f2f6fc]">
						{marketMood.title}
					</h2>
					<p data-node-id="2:450" className={cn("stak-ink h-[17px] w-full font-geist text-[13px] leading-[17px] text-[#819abb] [--ink:#819abb]", MOOD.subtitle)}>{marketMood.subtitle}</p>
				</div>
				{/* "Group 314" 2:451 (65.4371 x 33.1627): Figma's file drawn as its own vectors, so its fractional size is kept */}
				<span className="relative h-[33.163px] w-[65.437px] shrink-0">
					<FigmaFile src={A.gauge} width={65.4371} height={33.1627} className="absolute left-0 top-0" />
				</span>
			</Link>

			{/* Each story is placed by its frame origin and rotated about it, as Figma stores it (x / y / rotation), so no
			    fractional centring offset moves the rasterised card: 2:454 at 141 / 130 turned -5 (clockwise), 2:459 at
			    321 / 122, 2:464 at 507 / 140 turned +5 (anticlockwise). 141, 321 and 507 are taken from the card's centre (442.5).
			    Every story's size is a fraction of a pixel (241.592 x 284.022, 251.066 x 295.16): Chrome snaps a box's
			    painted background to whole pixels before the rotation (the turned cards came out 242 wide, their far edge
			    0.4px past Figma's, measured 2026-10-18), so each fill is an SVG rect at Figma's exact size (SubpixelRect);
			    the box itself only places and clips the copy. Below 820 the three cascade top to bottom (home/compact.ts). */}
			<StoryLink
				story={left}
				className={cn("absolute left-[calc(50%-301.5px)] top-[130px] h-[284.022px] w-[241.592px] origin-top-left rotate-5 overflow-clip rounded-[6.927px] [overflow-clip-margin:1px]", MOOD.story1)}
			>
				<SubpixelRect left={0} top={0} width={241.592} height={284.022} radius={6.927} fill="#f9f9f9" />
				<StoryCopy story={left} />
				<p id={storyIds(left).source} className="absolute left-[15.74px] top-[192.54px] whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] text-[rgba(14,22,43,0.55)]">
					{left.source}
				</p>
			</StoryLink>

			<StoryLink
				story={mid}
				className={cn("absolute left-[calc(50%-121.5px)] top-[122px] h-[295.16px] w-[251.066px] overflow-clip rounded-[7.199px] [overflow-clip-margin:1px]", MOOD.story2)}
			>
				<SubpixelRect left={0} top={0} width={251.066} height={295.16} radius={7.199} fill="#69b3ca" />
				<div className="absolute left-[15.298px] top-[25.197px] flex w-[215.071px] flex-col items-start gap-[17.998px] text-[#0e162b]">
					<p id={midIds.title} className="h-[42px] w-full font-sora text-[16.96px] font-medium leading-[21px]">
						{mid.title}
					</p>
					<p id={midIds.body} className="relative top-0 h-[48px] w-[200.673px] font-geist text-[12.598px] leading-[16px]">
						{mid.body}
					</p>
				</div>
				<p id={midIds.source} className="absolute left-[15px] top-[221px] whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] text-[rgba(14,22,43,0.55)]">
					{mid.source}
				</p>
			</StoryLink>

			<StoryLink
				story={right}
				className={cn("absolute left-[calc(50%+64.5px)] top-[140px] h-[284.022px] w-[241.592px] origin-top-left -rotate-5 overflow-clip rounded-[6.927px] [overflow-clip-margin:1px]", MOOD.story3)}
			>
				<SubpixelRect left={0} top={0} width={241.592} height={284.022} radius={6.927} fill="#f9f9f9" />
				<StoryCopy story={right} />
				<p id={storyIds(right).source} className="absolute left-[19.656px] top-[211.251px] whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] text-[rgba(14,22,43,0.55)]">
					{right.source}
				</p>
			</StoryLink>

			{/* "Frame 1618869060" 2:469: the 900 x 103 Glass band (GLASS radius 4, refraction 0.08, depth 1, light 248 / 0.8,
			    dispersion 0.17) over the bottom of the stack, constrained CENTER / MAX: its centre stays half a pixel right of
			    the card's (x -7 in the 885 card) and the card clips it (at 1440 it runs 7px past both edges; on wider screens
			    it stays 900 wide, centred under the stories, as Figma keeps it). It frosts only the card's own pixels: a 1.8px
			    backdrop blur (the frost Figma renders: 10-90% edge width 4.7px), with the light catching its top edge (+4 on
			    every channel, an additive 1px rim) and its bottom edge 1px darker (#131928 on the card). The rims are siblings
			    drawn after the band: inside it, a blend would only see the band's own (empty) layer. */}
			<div aria-hidden="true" className={cn("pointer-events-none absolute left-[calc(50%-449.5px)] top-[367px] h-[103px] w-[900px] backdrop-blur-[1.8px]", MOOD.band)} />
			<div aria-hidden="true" className={cn("pointer-events-none absolute left-[calc(50%-449.5px)] top-[367px] h-px w-[900px] bg-[#040404] mix-blend-plus-lighter", MOOD.band)} />
			<div aria-hidden="true" className={cn("pointer-events-none absolute left-[calc(50%-449.5px)] top-[469px] h-px w-[900px] bg-[#131928]", MOOD.bandBottom)} />
		</section>
	);
}

/**
 * "Frame 1618869059" of a white story card (2:455 / 2:465): 206.95 wide at 14.72 / 24.25, the title (Sora Medium 16.32,
 * 2 lines of 21) 12.24 above the body (Geist Light 12.24, 3 lines of 16, 193.1 wide), both #0E162B.
 */
function StoryCopy({ story }: { story: MoodStory }) {
	const ids = storyIds(story);
	return (
		<div className="absolute left-[14.721px] top-[24.246px] flex w-[206.955px] flex-col items-start gap-[12.24px] text-[#0e162b]">
			<p id={ids.title} className="h-[42px] w-full font-sora text-[16.32px] font-medium leading-[21px]">
				{story.title}
			</p>
			<p id={ids.body} className="h-[48px] w-[193.1px] font-geist text-[12.24px] font-light leading-[16px]">
				{story.body}
			</p>
		</div>
	);
}

/**
 * "Deck promo" 2:471, the Why-this-matters card: 430 x 119, #171D2C, radius 8.2286, clipped. Its content row
 * "Frame 1618869278" 2:472 (341 x 108, auto layout, 20 apart, centred) is constrained CENTER / CENTER at 44 / 5, half a
 * pixel left of and above the true centre; it is placed by those offsets from the centre (a -50% translate of 341 would
 * move the rasterised art half a pixel off Figma's column). In the row: "Frame 1618869067" 2:473 (108) holding the
 * caution art 2:474, then "Frame 1618869061" 2:475 (203.66 x 53.17 at 128 / 27.41, auto layout, 6.17 apart): the title
 * "Promo copy" 2:476 (its "Promo text" 2:477: Sora Regular 14.4, line 15.43, box 172 x 16) above the body "Promo copy"
 * 2:478 (its "Promo text" 2:479: Geist Light 12.34, line 15.43, 203.66 x 31), both white. The body is the person's own
 * reading (home/copy.ts whyBody): Figma's "...houses 80% of stocks from affected industries." for the showcase persona,
 * the phones' quiet-day line when no save is in an affected industry (it may run to a third line: the column stays
 * centred in the 108 row).
 */
function WhyCard({ body }: { body: string }) {
	return (
		<Link to="/my-stak" viewTransition={false} className={cn("relative block h-[119px] w-[48.588%] cursor-pointer overflow-clip rounded-[8.229px] bg-[#171d2c]", PROMO_CARD)}>
			<div data-node-id="2:472" className={cn("absolute left-[calc(50%-171px)] top-[calc(50%-54.5px)] flex h-[108px] w-[341px] items-center gap-[20px]", WHY.row)}>
				<div data-node-id="2:473" className="relative size-[108px] shrink-0">
					{/* "STAK_icon_caution_lighter_v3_bright 1" 2:474: Figma's export of the layer (its image fill at 0.5 scale with the
					    layer's exposure -0.23 / contrast +0.2 applied; the 1x and 2x files re-verified byte-identical 2026-10-11).
					    DensityImg (CORE-API section 8): the same <img> up to 2560; past it the 2x / 4x export that covers the canvas
					    zoom, so the art stays sharp on 4K / 5K / 8K screens (the browser alone picks by devicePixelRatio and drew
					    the 108 file at 162 on a 4K screen). */}
					<DensityImg {...HOME.cautionIcon} className="absolute left-0 top-0 size-[108px]" width={108} height={108} />
				</div>
				<div data-node-id="2:475" className={cn("flex w-[203.657px] flex-col items-start gap-[6.171px]", WHY.column)}>
					{/* Figma paints the title's baseline on row 13 of its 16px box (12.61 rounded); Chrome's lands on row 12, so the
					    text starts a pixel lower in its box (padding, so the box and the column keep Figma's heights). Both texts
					    are white on the dark card: stak-ink (ink.css) draws them at Figma's stroke weight. */}
					<div data-node-id="2:476" className={cn("flex h-[16px] w-full flex-col items-start pt-[1px]", WHY.titleBox)}>
						<p className={cn("stak-ink whitespace-nowrap font-sora text-[14.4px] font-normal leading-[15.429px] text-white [--ink:#ffffff]", WHY.title)}>{homePromos.why.title}</p>
					</div>
					<div data-node-id="2:478" className="flex min-h-[31px] w-full flex-col items-start">
						{/* Geist Light 12.34 on Figma's 15.43 line, two lines in a 31px box. Figma rounds each line's baseline to a whole
						    row, 12 and 28 below the box top (763.6 and 779.6 on the page: a 16-row pitch); Chrome's 15.43 line boxes put
						    the second baseline 15 rows under the first, a row above Figma's. A 16px line keeps both baselines on Figma's
						    rows (measured against the render 2026-10-18); the -1px margin keeps the box at Figma's 31 so the column and
						    the title stay where they are. */}
						<p className="stak-ink -mb-px w-full font-geist text-[12.343px] font-light leading-[16px] text-white [--ink:#ffffff]">{body}</p>
					</div>
				</div>
			</div>
		</Link>
	);
}

/**
 * "Deck promo" 2:480, the deck card: 430 x 119, #69B3CA, radius 8.2286, clipped. In the frame the "Illustration" 2:487
 * starts 35.86 from the left (8.34% of the card) and "Promo copy" 2:481 (160.46 wide, MIN / CENTER) 235.39 from it
 * (54.742%, 37.316% wide), 34.15 from the right. The card stretches with the column above 1440, and the approved rule
 * applies inside it as everywhere (coordinator ruling 14:55, 2026-10-11): the art and the copy keep those fractions of
 * the real card width, so the copy moves right with the card and the right margin grows in proportion (7.94% of the
 * card: 67.9px at 2560, 106.4px at 3840) instead of a fixed 235px from the left, which left the right half empty, the
 * layout the user rejected on the 32-inch screen. The art itself and the button keep their size (nothing scales above
 * 1440); the text re-flows in the wider column. At 1440 nothing changes. Layer order as in Figma: "Promo copy" 2:481
 * below, "Illustration" 2:487 above (DeckIllustration.tsx). Its line follows the person's decks (home/copy.ts
 * deckPromoBody): Figma's "Take your first deck to build your taste" for the untouched showcase (2:414) and for a person
 * with no finished deck and nothing saved, then today's cards left, then the done line. Once today's deck is `done` the
 * pill stops inviting into it (C-06, N30.8l): same place, same style, its label and the card's target become the
 * deck's receipt (home/copy.ts DECK_RECAP); the label then hugs its own words instead of the frame's 62 box.
 */
function DeckPromoCard({ body, done }: { body: string; done: boolean }) {
	return (
		<Link to={done ? DECK_RECAP.to : "/discover"} viewTransition={false} className={cn("relative block h-[119px] w-[48.588%] cursor-pointer overflow-clip rounded-[8.229px] bg-[#69b3ca]", PROMO_CARD)}>
			{/* "Promo copy" 2:481 (MIN / CENTER): 235.39 from the left (54.742% of the card), 160.46 wide (37.316%), its centre
			    0.67 below the card's (a column centred in 1.34-119); the text (Geist Light 12.34, line 15.43, black) 10.29 above
			    the button. On the narrowest phones (under 360) the block is the pill's width at an 8 right margin (compact.ts). */}
			<div data-node-id="2:481" className={cn("absolute bottom-0 left-[54.742%] top-[1.343px] flex w-[37.316%] flex-col items-start justify-center gap-[10.286px]", DECK.copy)}>
				<p className="w-full font-geist text-[12.343px] font-light leading-[15.429px] text-black">{body}</p>
				{/* "Go to Deck button" 2:483: 126.5143 x 32.9143, #0A1020, radius 15.4286, auto layout centred, 3.0857 apart, 4.7279
				    padding top and bottom; the label 2:484 (Geist Medium 11.82, Figma's box 62 x 15, left-aligned in it, white on the
				    dark pill: stak-ink) and arrow-right 2:485 (16.4571 at 87.5714 / 8.2286). The pill sits on a fraction of a pixel
				    (946.3906 / 761.357 on the page at 1440) and Figma anti-aliases its edges there, where Chrome snaps a background
				    to whole pixels: the fill is an SVG rect on Figma's fraction (SubpixelRect) and the arrow is Figma's file drawn
				    from the whole pixel above its position (1033.962 / 769.586). */}
				<span data-node-id="2:483" className="relative flex h-[32.914px] w-[126.514px] shrink-0 items-center justify-center gap-[3.086px] py-[4.728px]">
					<SubpixelRect left={0} top={0} width={126.5143} height={32.9143} radius={15.4286} fill="#0a1020" shift={{ x: 0.3906, y: 0.357 }} />
					<span
						data-node-id="2:484"
						className={cn("stak-ink relative h-[15px] whitespace-nowrap text-left font-geist text-[11.82px] font-medium leading-[15px] text-white [--ink:#ffffff]", !done && "w-[62px]")}
					>
						{done ? DECK_RECAP.label : homePromos.deck.cta}
					</span>
					<span data-node-id="2:485" className="relative size-[16.457px] shrink-0">
						<FigmaFile src={A.arrowRight} width={16.4571} height={16.4571} x={0.962} y={0.586} className="absolute" style={{ left: -0.962, top: -0.586 }} />
					</span>
				</span>
			</div>
			{/* the Illustration's layers are placed by their authored x (35.86 and on); this anchor moves the group's left edge
			    to 8.34% of the card (35.86 at 1440, 71.3 at 2560, 111.8 at 3840) without scaling the art (only the narrowest
			    phones, under 360, scale it as one unit: SPEC R4, compact.ts) */}
			<div aria-hidden="true" className={cn("absolute left-[calc(8.34%-35.862px)] top-0 h-0 w-0", DECK.art)}>
				<DeckIllustration />
			</div>
		</Link>
	);
}

/**
 * "Frame 1618869171" 2:515: the See Todays Pick glass pill over the caption, centred under the cards, 23 apart.
 * The pill "Container" 2:516 (136 x 51 at x 630.5, radius 163.64, white 1% with a 0.94 inside gradient stroke) holds
 * "Rounded Background" 2:517 and the frame 2:518 (both 0.159 further right, at x 630.66), and 2:518 holds the glass group
 * 2:519 (136 x 78 at y -13: alpha mask, frost, blurred MULTIPLY / LINEAR DODGE rim strokes, GLASS refraction) and, above
 * it, the label frame "Icon and Label" 2:528 (125 x 78 at 5, black 10%, radius 43.26) with "Search Glyph" 2:530.
 *
 * The glass is Figma's own export of 2:519 (the render of the group in place, with the page behind it and clipped to the
 * pill): its interior and rims measure what Figma's render of the frame measures (2026-10-18: interior 32.6 vs 32.3 mean
 * luminance, top rim 77 vs 75, bottom rim 68 vs 69), so nothing is painted over it in code; the 10% black of 2:528 drawn
 * above it darkened the pill 11% below Figma's render. No CSS clip is used over it either: a rounded clip on the
 * half-pixel pill box cut the rim's last column off. The file is placed as an SVG image on Figma's fraction of a pixel
 * (0.66 at 1440: the pill's .5 plus the 0.159 of 2:518): its box starts on the whole pixel below the pill's left edge
 * and the image sits 0.659 into it, so the bright rim is rasterised over two columns at each end, as Figma spreads it
 * (x 630 / 631 and 765 / 766 at 1440), where an <img> is snapped to one column at full strength. The 4x render keeps it
 * sharp at every screen density.
 *
 * "Search Glyph" 2:530 (Geist Medium 12, line 20.69, cap-height trimmed, centred, its 92px box at 21.66): Figma's
 * render of the frame paints its baseline 31.75 below the pill's top (902.75 on the page: row 902 carries 75% of the
 * letters' bottoms) and its cap tops 0.2 into row 894, a third of a pixel below the cap-height box 893.44-902.44 the
 * Inspect panel gives. Chrome paints a baseline on a whole row: in a 20.69 line it puts Geist 12's baseline 14 below
 * the line's top (ascent 12 after a 2px half-leading), so the line starts at 18 and the baseline sits on 903 (0.25
 * below Figma's; one row up, where the Inspect value put it, the letters sat 0.75 above Figma's, measured 2026-10-18).
 *
 * Past 2560 (the big regime, CORE-API section 1) the canvas zoom z multiplies every length and Chrome rounds the zoomed
 * font's ascent (12.06 z), descent (3.54 z) and the line's half-leading in device pixels, which painted this label 1-2
 * device px under 2560 x z (+1.47 at 3840x2160, where G2's bound for text is 1.25). PICK_LABEL_TOP re-solves the
 * label's `top` there the way the shared text rule (styles.css) does for plain text: the device pixel nearest Figma's
 * baseline (902.75 x z) minus the row Chrome paints (the label's top 889 z, the floored half-leading, the rounded
 * ascent), back in layout px. --stak-zoom-up is 1 up to 2560, where the expression is exactly 18px (the approved row).
 */
const Z = "var(--stak-zoom-up, 1)";
const PICK_LABEL_TOP = `calc(18px + (round(nearest, 902.75px * ${Z}, 1px) - (889px * ${Z} + round(down, (20.69px * ${Z} - round(nearest, 12.06px * ${Z}, 1px) - round(nearest, 3.54px * ${Z}, 1px)) / 2 + 0.01px, 1px) + round(nearest, 12.06px * ${Z}, 1px))) / ${Z})`;

function SeePicks({ remaining }: { remaining: number }) {
	// Figma's "You have about 12 stock picks waiting for you" with the deck's own count (home/copy.ts picksCaption). The
	// frame's sentence fills its 270 box left-aligned (268.86 wide, so it sits centred under the pill: 0.57 off); any other
	// caption (the last card's, 217 wide; the done line, two lines) centres under the pill the same way, balanced
	const caption = picksCaption(remaining);
	const framesOwn = caption === homePromos.picks.caption;
	return (
		<div data-node-id="2:515" className="flex w-[270px] flex-col items-center gap-[23px]">
			<Link to="/discover" viewTransition={false} data-node-id="2:516" className="relative block h-[51px] w-[136px] shrink-0 cursor-pointer rounded-[163.643px]">
				<GlassFile node="2:519" src={HOME.picksGlass4x} />
				<span
					data-node-id="2:530"
					className="stak-ink absolute left-[21.659px] h-[20.69px] w-[92px] whitespace-nowrap text-center font-geist text-[12px] font-medium leading-[20.69px] text-white [--ink:#ffffff]"
					style={{ top: PICK_LABEL_TOP }}
				>
					{homePromos.picks.cta}
				</span>
			</Link>
			<p data-node-id="2:531" className={cn("stak-ink w-full font-geist text-[13px] leading-[17px] text-[#819abb] [--ink:#819abb]", !framesOwn && "text-center text-balance")}>
				{caption}
			</p>
		</div>
	);
}
