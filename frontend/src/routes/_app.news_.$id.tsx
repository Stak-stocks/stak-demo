import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type CSSProperties, Fragment, type KeyboardEvent, type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { D } from "@/app/discover/assets";
import { deckCopy } from "@/app/discover/data";
import { colPlus, DensityImg, useCanvasSize, useSizeClass } from "@/app/FitCanvas";
import { financialsOf } from "@/app/live/catalog";
import { money, type Tone } from "@/app/live/format";
import { type PriceHistoryState, usePriceHistory } from "@/app/live/history";
import { type Quote, stockDataQuery, useQuote } from "@/app/live/quotes";
import { useShowcase } from "@/app/live/showcase";
import { useLive } from "@/app/live/store";
import { NotFound } from "@/app/NotFound";
import { articleById, bylineOf, type HeroArt, heroOf, type NewsArticle, readNextOf, type StatRows } from "@/app/news/articles";
import { N } from "@/app/news/assets";
import { useBackToListing } from "@/app/news/backToListing";
import { BRIEF_STORY_IDS, useBriefRead } from "@/app/news/briefRead";
import { prefetchAllowed, useClipSource } from "@/app/news/clipSource";
import { article as template } from "@/app/news/data";
import { useHeroPlayer, watchFirstFrame } from "@/app/news/heroPlayer";
import { clipOf, type MediaFit, mediaFit, type MediaSize, type StoryClip, sourceHrefOf } from "@/app/news/media";
import { EASE_OUT, PUSH_FORWARD, SMART_MS as MORPH_MS } from "@/app/news/motion";
import { HUG_WIDTH } from "@/app/news/NewsCard";
import { usePreloadNext } from "@/app/news/preload";
import { changeToday, changeTone, railStats } from "@/app/news/rail";
import { listingHasTag } from "@/app/news/search";
import { PriceLine, TickerLine } from "@/app/news/TickerLine";
import { fundamentalsOf } from "@/app/stocks/fundamentals";
import { raisePill } from "@/app/stocks/pageToast";
import { PrimaryButton } from "@/app/ui/Button";

/** `?saved=1` / `?saved=true`: the Saved frame (2:4555) without saving anything. */
type DetailSearch = { saved?: 1 | true };

export const Route = createFileRoute("/_app/news_/$id")({
	// the value stays as the URL wrote it: rewriting ?saved=1 to ?saved=true re-navigates while the page loads
	validateSearch: (search: Record<string, unknown>): DetailSearch => ({
		saved: search.saved === 1 || search.saved === "1" ? 1 : search.saved === true || search.saved === "true" ? true : undefined,
	}),
	component: NewsDetailPage,
});

/** Figma 2:4453 / 2:4555: the frame is 2050 tall, the content column ends at 1630, so the page keeps 420 below it. */
const FRAME_BOTTOM_SPACE = 420;

/** "Frame 1618869184": the 740 article box (720 + 10 padding each side) and the 360 rail, 30 apart, split the 1130 row 740 : 360. */
const ARTICLE_SHARE = "calc((100% - 30px) * 740 / 1100)";
const RAIL_SHARE = "calc((100% - 30px) * 360 / 1100)";

/** The ticker card's company name ("Apple Inc." 2:4513): below 1024 it names the rail's first group, an aside inside the story. */
const TICKER_NAME_ID = "news-ticker-name";
/** The Key stats title (2:4519): below 1024 it names the rail's second group, the aside after the story. */
const KEY_STATS_TITLE_ID = "news-key-stats-title";

/**
 * Figma's GLASS effect on the hero toasts (2:4466, 2:4568, 2:4571: radius 0, refraction 0.15, depth 10.5, light 246°
 * at 0.5, dispersion 0.21): no frost, only the light the rim catches. CSS has no glass shader, so the rim is drawn the
 * way the frames' render shows it over this hero (measured edge by edge): a soft highlight along the top and the
 * right end, a soft shade along the left end and the bottom, and a faint 1px light on both ends.
 */
const GLASS_RIM =
	"inset 0 8px 8px -8px rgba(255,255,255,0.08), inset -9px 0 9px -9px rgba(255,255,255,0.12), inset 8px 0 8px -8px rgba(0,0,0,0.06), inset 0 -7px 7px -7px rgba(0,0,0,0.035), inset 1px 0 0 rgba(255,255,255,0.2), inset -1px 0 0 rgba(255,255,255,0.2)";

/**
 * /news/<id>: the article of one story of the News listing. The Figma article (2:4453 / 2:4555, Apple) is the template
 * (the user's ruling of 2026-11-01): every story opens its own article in exactly that layout, filled with its own
 * record (src/app/news/articles.ts). An id no story has answers with the app's 404, as the stock detail does for an
 * unknown symbol. Each article is its own page (keyed), so moving from one to the next (Read next) starts its save
 * morph, focus hand-off and preloads afresh.
 */
function NewsDetailPage() {
	const { id } = Route.useParams();
	const a = articleById(id);
	// an id no story has: the app's 404 (keyed: once per unknown id). Its tab is the root's: "STAK", which is also what
	// the root gives every /news/<id> until the article below writes its own headline (src/app/titles.ts, ruling N11c)
	if (!a) return <NotFound key={id} />;
	return <ArticlePage key={a.id} a={a} />;
}

/**
 * Figma 2:4453 "Desktop · News detail · Unsaved" and 2:4555 "Saved" (1440x2050): a 1130 column (the 1134
 * content column less 4) of the Back / breadcrumb header and a row, aligned right, of the 720 article (inside
 * 10px of padding) and the 360 rail, 30 apart. Above 1440 the article and the rail keep their 720 : 360 share, and
 * the graphics (the hero's device, the play mark, the ticker line, icons) keep their Figma size.
 *
 * Below 1024 (SPEC R2, R3, R6; the phone frames' order, "News detail page unsaved" 1:1319 / "saved" 1:1603 on page
 * 0:1): the row stacks into one column of Figma's pieces in the order the phone frames draw them: hero, title, dek,
 * byline, Add to STAK (the primary action right after the content it acts on), the ticker card, The gist, the body,
 * Source, Key stats, the divider, the chip and Read next. The DOM of that column IS that order (the sections are
 * rendered per size class, so Tab follows what the eye sees: R10's ruling); at 1024 and above the DOM is the
 * approved one. The column is the article column, so it keeps its Figma width as its maximum (720, R3: on a 1023
 * window the text measure stays the frame's) and every card fills it; the hero scales as one unit (R4) once the column
 * is narrower than its 720 and grows around the scaled device, so its two toasts (Figma's type size, pinned to the
 * hero's corners) stay on the gradient, clear of the device (narrower than 606: above and below it; R4, R9).
 * The rail's pieces stay a separate region for assistive technology as at 1440: Add to STAK and the ticker card are
 * an aside inside the story (named by the card's company name), Key stats, the divider, the chip and Read next the
 * aside after it (named by the Key stats title, so a landmark list reads "complementary, Exxon Mobil Corp." and
 * "complementary, Key stats"). Both arrangements share their parents, keyed, so crossing 1024 keeps the story's elements and the
 * focus on them (useFocusAcrossLayouts hands focus over for the rail controls that change parent).
 *
 * The story is demo copy; the rail is its related company, live (the coordinator's D9; the phones take every company's
 * own quote, android NewsArticleFeed.kt:512-522): its quote from the same source as Discover, My STAK and the stock page
 * (useQuote: a visitor's demo quote, an account's live one), its own line of the day (the FOUNDATION price history,
 * PriceLine: green up, red down, the label grey when the day's move prints zero, like the change line above it) and Key
 * stats rebased on that quote (src/app/news/rail.ts). Only the template's Apple
 * article keeps the frame's own figures and line ($308.63, +4.84%, $4.58T ...), and only for the untouched showcase
 * visitor (useShowcase, the listing's rule): after the first action it follows the quote too. The ticker card opens the
 * company's stock page as ONE link (the Discover entry while unsaved; saved, its "View <SYMBOL> in My STAK" row,
 * stretched over the whole card, opens the My STAK entry), the chip after Key stats the News search for its tag
 * (/news?q=<chip>; D1) when a listing story carries that tag, otherwise it is plain text (the ruling of 2026-11-07).
 *
 * The hero is the story's media slot, as on the phones (src/app/news/media.ts): a story with a clip shows its poster with
 * the play mark, which plays the clip in place; a story without one draws no play mark. Its Source row opens the clip's
 * own link (the story's page), otherwise the publisher's site.
 *
 * Save / Unsave (the coordinator's D14, the user: "on the news article users can save and unsve that botton should work"):
 * the hero bookmark and Add to STAK save the company for real; the page then shows the Saved frame (2:4555): the hero's
 * "Saved to My STAK" toast, the ticker card's "View <SYMBOL> in My STAK" row, no Add to STAK, plus the one toast pill the
 * desktop frames draw (2:3234, the app's toaster), since the desktop has no success sheet (ruling of 2026-10-08). Add to
 * STAK gets there with the prototype's Smart Animate (the card grows, Add to STAK dissolves where it stands, the new
 * layers fade in); the bookmark is instant. In the saved state the hero's "Saved to My STAK" toast is the Unsave control:
 * it removes the company from My STAK (the store's unsave, as the stock page's Unsave), the page returns to the unsaved
 * state at once and the deck's "Removed from My STAK" toast shows. Bookmark and toast are ONE button (aria-pressed), so
 * the keyboard stays on it as it toggles; its name says "Save <company> to My STAK" / "Unsave <company> from My STAK".
 * The `?saved=1` preview keeps Figma's saved frame at rest; its Unsave drops the preview (and a real save, with the
 * toast only then: a preview alone had nothing in My STAK to remove).
 *
 * The controls are the prototype's (the desktop frames carry no reactions, read again 2026-10-18: 0 in 170 / 179
 * nodes; the phone's News detail frames do): Back (D2: back to where the person came from, src/app/news/backToListing.ts;
 * 1:1445 / 1:1735, INSTANT), the bookmark -> saved (1:1326 -> 1:1603, INSTANT), Add to STAK -> saved (1:1337,
 * SMART_ANIMATE 0.35 ease-out), "View <SYMBOL> in My STAK" -> the saved stock detail entered from My STAK (2:5130; the
 * phone's "View in My STAK" 1:1599 -> 1:3501 is a PUSH left 0.3 ease-out, kept; the destination is the 2026-10-08
 * prototype cross-check's ruling), Source in a new tab (its "external link" icon), and the two Read next cards, the next
 * two stories of the listing, each opening its article at once like a listing card (the ruling of 2026-11-01 wires what
 * the prototype left unwired). No layer of these frames has a hover or pressed variant or a "change to" reaction, so no
 * control answers the pointer: cursor and focus ring only. The browser tab carries the story's headline; opening one of
 * the brief's stories reads today's brief (useBriefRead).
 */
function ArticlePage({ a }: { a: NewsArticle }) {
	const { saved: preview } = Route.useSearch();
	const navigate = Route.useNavigate();
	const symbol = a.ticker.symbol;
	/** the screens this page leads to (Back, View <SYMBOL> in My STAK), loaded ahead so the first click does not wait */
	usePreloadNext([{ to: "/news" }, { to: "/stocks/$symbol", params: { symbol } }]);
	const live = useLive();
	const showcase = useShowcase();
	const quote = useQuote(symbol);
	/** the frame's own rail (Apple's $308.63, +4.84%, $4.58T ... and its line): the template article, the showcase visitor */
	const authoredRail = showcase && a.id === template.id;
	const stored = live.savedTickers.has(symbol);
	const saved = Boolean(preview) || stored;
	const [busy, setBusy] = useState(false);
	const morph = useSaveMorph(saved);
	const size = useSizeClass();
	const compact = size === "phone" || size === "tablet";
	const rootRef = useRef<HTMLDivElement>(null);
	useFocusAcrossLayouts(compact, rootRef);
	const rail = useRailMorph(saved, morph, compact);
	const dayLine = usePriceHistory(symbol, "1D", { enabled: !authoredRail });
	const yearLine = usePriceHistory(symbol, "1Y", { enabled: !authoredRail });
	const liveRows = useKeyStats(symbol, a.keyStats.rows, quote, dayLine, yearLine);
	const back = useBackToListing();
	useBriefRead(BRIEF_STORY_IDS.has(a.id));
	useArticleTitle(a.title);
	// one toast at a time: a quick Save then Unsave replaces the first with the second, as the stock page does; it stands
	// where it covers no control (raisePill, N36.3a: on a phone in the pinned top bar, not over the hero's Unsave)
	const toastId = useRef<string | number | null>(null);
	const notify = (text: string, icon?: string) => {
		if (toastId.current !== null) toast.dismiss(toastId.current);
		toastId.current = raisePill(text, icon ? { icon: <img alt="" src={icon} className="size-[17px]" /> } : undefined);
	};
	const save = async (smart: boolean) => {
		if (saved || busy) return;
		setBusy(true);
		if (smart) morph.arm();
		try {
			await live.actions.save(symbol, quote?.price ?? null);
			// the frames' one toast pill (2:3234 "Saved to My STAK" with its 17px bookmark 2:3235), as the stock page raises it
			notify(a.savedToast, D.toastBookmark);
		} catch {
			morph.disarm();
			notify("Could not save right now. Try again.");
		} finally {
			setBusy(false);
		}
	};
	// D14: the saved toast unsaves: the company leaves My STAK (the stock page's own action), the page is unsaved again
	// at once (the bookmark's instant edge, mirrored) and the deck's "Removed from My STAK" toast shows (its outline
	// bookmark) when the store did remove it; the ?saved=1 preview alone only drops its query (nothing was in My STAK, so
	// no toast says it left)
	const unsave = async () => {
		if (!saved || busy) return;
		setBusy(true);
		try {
			if (stored) await live.actions.unsave(symbol);
			if (preview) await navigate({ to: ".", search: (prev) => ({ ...prev, saved: undefined }), replace: true, resetScroll: false, viewTransition: false });
			if (stored) notify(deckCopy.unsavedToast, D.bookmark);
		} catch {
			notify("Could not update My STAK. Try again.");
		} finally {
			setBusy(false);
		}
	};
	const toggleSave = () => {
		if (saved) void unsave();
		else void save(false);
	};
	// the line takes the tone of the move printed above it (rail.ts changeTone: a move that prints zero is neither up nor down)
	const line: TickerLineSource = authoredRail
		? { kind: "figma" }
		: { kind: "data", closes: dayLine.status === "ready" ? dayLine.history.closes : [], tone: changeTone(quote?.changePercent ?? dayLine.history?.changePercent ?? 0) };

	/* The pieces, Figma's layers of both frames; the two arrangements below only order them. The keys let React keep a
	   piece's element when the window crosses 1024 and the same piece sits in the other arrangement's same parent. */

	// "Frame 1618869185": the 40px Back button (#192238), 31 above the breadcrumb. It returns to where the person came from,
	// as the phones' Back does (the coordinator's D2): whenever an app page came before this article it steps back to it
	// (the listing with its search, the previous article after Read next, Home, a stock page), named "Back to News" when that
	// is the listing and "Back" otherwise; a direct landing goes to /news with the listing's last search
	// (src/app/news/backToListing.ts)
	const header = (
		<div className="flex flex-col items-start gap-[31px]">
			<Link
				to="/news"
				search={back.search}
				onClick={back.onClick}
				viewTransition={false}
				aria-label={back.label}
				data-focus-key="back"
				className="flex size-[40px] cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
			>
				<img alt="" src={N.back} width={22} height={22} className="size-[22px]" />
			</Link>
			<p className="whitespace-pre font-geist text-[16px] font-medium leading-[21px] text-[#819abb]">{a.breadcrumb}</p>
		</div>
	);
	const hero = (
		<Hero a={a} art={heroOf(a.id)} clip={clipOf(a.id)} saved={saved} busy={busy} morph={morph} compact={compact} onToggleSave={toggleSave} />
	);
	// the head of "Article column" 2:4472: kicker, title, dek, byline (dated on the clock from the story's age, as the
	// phones' StakClock.byline: the frame's "Jul 2" on the frames' own Saturday; src/app/news/articles.ts bylineOf)
	const head = (
		<Fragment key="head">
			<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#5bd7e4]">{a.category}</p>
			<h1 className="w-full font-sora text-[30px] font-semibold leading-[38px] text-[#f2f6fc]">{a.title}</h1>
			<p className="w-full font-geist text-[16px] leading-[21px] text-[#819abb]">{a.dek}</p>
			<div className="flex items-center gap-[10px] overflow-clip">
				<span className="flex size-[26px] items-center justify-center overflow-clip rounded-[13px] bg-[#242b3d]">
					<span className="whitespace-nowrap font-geist text-[10px] font-medium leading-[13px] text-[#f2f6fc]">{a.publisherInitial}</span>
				</span>
				<span className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#819abb]">{bylineOf(a)}</span>
			</div>
		</Fragment>
	);
	// "The gist" 2:4480: #242b3d, radius 14, 20/22 padding, 12 apart. A row is 20 tall, its 18.4 icon and 17px line both
	// centred in it (0.8 / 1.5 from its top). A line that wraps in a narrow column grows its row (R9) and the icon stays on
	// the line it marks: the row keeps those offsets from its top (icon 0.8, text 1.5 above and below) instead of
	// centring the icon between the wrapped lines.
	const gist = (
		<div key="gist" className="flex w-full flex-col items-start gap-[12px] overflow-clip rounded-[14px] bg-[#242b3d] px-[22px] py-[20px]">
			<div className="flex items-center gap-[8px] overflow-clip">
				<img alt="" src={N.sparkle} width={16} height={16} className="size-[16px]" />
				<span className="whitespace-nowrap font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{a.gistTitle}</span>
			</div>
			{a.gist.map((line) => (
				<div key={line} className="flex h-[20px] w-full items-center gap-[10px] overflow-clip max-lg:h-auto max-lg:min-h-[20px] max-lg:items-start">
					<img alt="" src={N.check} width={18.4} height={18.4} className="size-[18.4px] shrink-0 max-lg:mt-[0.8px]" />
					<span className="min-w-0 flex-1 font-geist text-[13px] leading-[17px] text-[#f2f6fc] max-lg:py-[1.5px]">{line}</span>
				</div>
			))}
		</div>
	);
	const paragraphs = (ps: readonly string[]) =>
		ps.map((p) => (
			<p key={p.slice(0, 32)} className="w-full font-geist text-[15px] leading-[20px] text-[#f2f6fc]">
				{p}
			</p>
		));
	const body1 = <Fragment key="body-1">{paragraphs(a.paragraphs1)}</Fragment>;
	const body2 = <Fragment key="body-2">{paragraphs(a.paragraphs2)}</Fragment>;
	// the pull quote (2:4495): a 3x56 #5da8bf bar, 16 from the 660 quote, in a 60 block (4 below the bar). In a narrow
	// column the quote wraps, the bar runs its height (56 at least) and the block keeps its 4 below the bar.
	const quoteBlock = (
		<div key="quote" className="flex h-[60px] w-full items-start gap-[16px] overflow-clip max-lg:h-auto max-lg:pb-[4px]">
			<div className="h-[56px] w-[3px] shrink-0 bg-[#5da8bf] max-lg:h-auto max-lg:min-h-[56px] max-lg:self-stretch" />
			<p className="w-[calc(100%-60px)] font-sora text-[19px] font-semibold leading-[24px] text-[#a6e4f7] max-lg:w-auto max-lg:min-w-0 max-lg:max-w-[660px] max-lg:flex-1">{a.quote}</p>
		</div>
	);
	// "New to this" 2:4498: #181f30, radius 12, 16/20 padding, 80 tall
	const newToThis = (
		<div key="new" className="flex h-[80px] w-full flex-col items-start gap-[8px] overflow-clip rounded-[12px] bg-[#181f30] px-[20px] py-[16px] max-lg:h-auto max-lg:min-h-[80px]">
			<p className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#5bd7e4]">{a.newToThis.title}</p>
			<p className="w-full font-geist text-[13px] leading-[17px] text-[#819abb]">{a.newToThis.body}</p>
		</div>
	);
	// "Frame 1618869135" 2:4503: Source (Sora 13) and the 19px external link, 81 wide. It opens the story's own page in a
	// new tab (its clip's link, as the phones' Source row does; otherwise the publisher's site: src/app/news/media.ts)
	const source = (
		<a href={sourceHrefOf(a)} target="_blank" rel="noreferrer" data-focus-key="source" className="flex w-[81px] cursor-pointer items-center justify-between">
			<span className="whitespace-nowrap font-sora text-[13px] leading-[16px] text-white">{a.sourceLabel}</span>
			<img alt="" src={N.externalLink} width={19} height={19} className="size-[19px]" />
		</a>
	);
	const tickerCard = <TickerCard key="ticker" a={a} saved={saved} preview={Boolean(preview)} quote={authoredRail ? null : quote} line={line} rail={rail} />;
	const keyStats = <KeyStats key="stats" title={a.keyStats.title} rows={authoredRail ? a.keyStats.rows : liveRows} />;
	// "Add to STAK" 2:4541 (unsaved): the canon primary button, as wide as the rail (360: its Figma width is the most it takes below 1024)
	const addToStak = (!saved || morph.running) && (
		<div key="add" ref={rail.addRef} className="w-full shrink-0 max-lg:max-w-[360px]">
			<PrimaryButton
				onClick={() => save(true)}
				tabIndex={saved ? -1 : undefined}
				aria-busy={busy}
				data-focus-key="add"
				className={busy ? "cursor-wait opacity-80" : undefined}
			>
				<img alt="" src={N.plus} width={12.6} height={12.6} className="size-[12.6px]" />
				{a.addToStak}
			</PrimaryButton>
		</div>
	);
	const divider = <div key="divider" className="h-px w-full shrink-0 bg-[#2a3346]" />;
	// the company chip (2:4656 / 2:4657, a tag in Figma): it opens the News listing searched for its tag, the stories that
	// share it (D1; the listing's search reads each story's chip as its tag, src/app/news/search.ts), instantly, but ONLY
	// when a listing story carries the tag (the coordinator's ruling of 2026-11-07, 02:30); a tag none carries (Home's two
	// stories' "Coca-Cola" and "Microsoft") would open an empty search, so it is the same pill as plain text
	const chipBox = "flex items-start overflow-clip rounded-[999px] bg-[#242b3d] px-[14px] py-[6px]";
	const chipText = <span className={`${HUG_WIDTH} whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]`}>{a.chip}</span>;
	const chip = listingHasTag(a.chip) ? (
		<Link key="chip" to="/news" search={{ q: a.chip }} viewTransition={false} aria-label={`Search News for ${a.chip}`} data-focus-key="chip" className={`${chipBox} cursor-pointer`}>
			{chipText}
		</Link>
	) : (
		<span key="chip" data-chip="text" className={chipBox}>
			{chipText}
		</span>
	);
	// "Read next" 2:4547: the two 60px cards (2:4549 / 2:4552), now the next two stories of the listing, each a link to
	// its article (their one-line titles wrap in a narrow column: R9). The block clips like the frame's except while one
	// of its cards has keyboard focus, so the focus ring shows whole.
	const readNext = (
		<div
			key="read-next"
			className="flex h-[153px] w-full flex-col items-start gap-[10px] overflow-clip whitespace-nowrap max-lg:h-auto max-lg:whitespace-normal [&:has(:focus-visible)]:overflow-visible"
		>
			<p className="font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#5bd7e4]">{a.readNext.kicker}</p>
			{readNextOf(a.id).map((story) => (
				<Link
					key={story.id}
					to="/news/$id"
					params={{ id: story.id }}
					viewTransition={false}
					data-focus-key={`next-${story.id}`}
					className="flex h-[60px] w-full shrink-0 cursor-pointer flex-col items-start gap-[5px] overflow-clip rounded-[12px] bg-[#181f30] px-[16px] py-[14px] max-lg:h-auto max-lg:min-h-[60px]"
				>
					<span className="font-geist text-[10px] leading-[13px] text-[#819abb]">{story.source}</span>
					<span className="w-full font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{story.title}</span>
				</Link>
			))}
		</div>
	);

	if (compact) {
		// one column in the phone frames' order (1:1319 / 1:1603), at most the article column's 720; the shell's 32px
		// bottom gutter ends the page. Same parents as the desktop tree below (div > div > article; the row's aside).
		return (
			<div ref={rootRef} className="stak-news flex flex-col items-start gap-[24px]" style={{ width: colPlus(-4) }}>
				{header}
				<div className="flex w-full max-w-[720px] flex-col items-start gap-[28px]">
					<div className="w-full">
						<article className="flex w-full flex-col items-start gap-[28px]">
							{hero}
							<div className="flex w-full flex-col items-start gap-[18px]">
								{head}
								<aside key="rail-top" aria-labelledby={TICKER_NAME_ID} className="flex w-full flex-col items-start gap-[18px]">
									{addToStak}
									{tickerCard}
								</aside>
								{gist}
								{body1}
								{quoteBlock}
								{newToThis}
								{body2}
							</div>
							{source}
						</article>
					</div>
					<aside aria-labelledby={KEY_STATS_TITLE_ID} className="flex w-full flex-col items-start gap-[16px]">
						{keyStats}
						{divider}
						{chip}
						{readNext}
					</aside>
				</div>
			</div>
		);
	}
	return (
		<div ref={rootRef} className="stak-news flex flex-col items-start gap-[24px]" style={{ width: colPlus(-4), paddingBottom: FRAME_BOTTOM_SPACE }}>
			{header}

			<div className="flex w-full items-start justify-end gap-[30px]">
				{/* "Frame 1618869184" 2:4461: the 740 article box and the 360 rail share the row less its 30 gap, 740 : 360 (exact
				    at 1440, the same split of the wider row above it; the gap stays 30) */}
				<div className="flex min-w-0 items-center p-[10px]" style={{ flex: `0 0 ${ARTICLE_SHARE}` }}>
					<article className="flex w-full flex-col items-start gap-[28px]">
						{hero}

						{/* "Article column" 2:4472: 18 apart */}
						<div className="flex w-full flex-col items-start gap-[18px] overflow-clip">
							{head}
							{gist}
							{body1}
							{quoteBlock}
							{newToThis}
							{body2}
						</div>

						{source}
					</article>
				</div>

				{/* "Rail" 2:4507 / 2:4612, 16 apart, clipped sideways like Figma's Rail (clipsContent: Add to STAK spans its 360
				    width, so Figma cuts the button's outside hairline and glow at the rail's sides) except while a control inside
				    has keyboard focus, so the focus ring shows whole */}
				<aside className="flex min-w-0 flex-col items-start gap-[16px] [&:not(:has(:focus-visible))]:overflow-x-clip" style={{ flex: `0 0 ${RAIL_SHARE}` }}>
					{tickerCard}
					{keyStats}
					{addToStak}
					{divider}
					{chip}
					{readNext}
				</aside>
			</div>
		</div>
	);
}

/**
 * Crossing 1024 (a window resized, a tablet turned) renders the other arrangement. The two share their parents, keyed,
 * so the story, the hero with its bookmark, Back and Source keep their elements and their focus; Add to STAK, the
 * ticker card (with "View <SYMBOL> in My STAK") and the Read next cards change parent (the rail in the desktop row, the
 * asides of the column) and React mounts them anew. Keyboard focus on one of them would fall to the body (WCAG 2.4.3):
 * the render that switches arrangements notes which of the page's controls has focus (`data-focus-key`; the document
 * still shows the old arrangement then, so this needs no focus events, which a window without system focus never
 * fires), and once the new one is in place the same control takes the focus. A control that kept its element keeps
 * its focus by itself. Either way a keyboard focus (one that showed its ring) is brought into view in the new
 * arrangement (WCAG 2.4.7); nothing is pulled back or scrolled when the page had no focus.
 */
function useFocusAcrossLayouts(compact: boolean, root: RefObject<HTMLElement | null>) {
	const shown = useRef(compact);
	const handOver = useRef<{ key: string; visible: boolean } | null>(null);
	if (shown.current !== compact) {
		shown.current = compact;
		const active = typeof document === "undefined" ? null : document.activeElement;
		const key = active instanceof HTMLElement && root.current?.contains(active) ? active.dataset.focusKey : undefined;
		handOver.current = active instanceof HTMLElement && key ? { key, visible: active.matches(":focus-visible") } : null;
	}
	useLayoutEffect(() => {
		const was = handOver.current;
		handOver.current = null;
		if (!was) return;
		let focused = document.activeElement;
		if (!focused || focused === document.body) {
			const twin = root.current?.querySelector<HTMLElement>(`[data-focus-key="${was.key}"]`);
			if (!twin || twin.tabIndex < 0) return;
			twin.focus({ preventScroll: true });
			focused = twin;
		}
		if (was.visible && focused instanceof HTMLElement && root.current?.contains(focused)) revealFocus(focused);
	}, [compact, root]);
}

/**
 * Scrolls a keyboard focus into view with room for its ring (2 px wide, 2 px out): 8 px from the window's edges (and
 * below the phone's top bar: styles.css scroll-padding). The margin is set only for this scroll, so the browser's own
 * focus scrolling (Tab) keeps the approved behaviour.
 */
function revealFocus(el: HTMLElement) {
	const margin = el.style.scrollMargin;
	el.style.scrollMargin = "8px";
	el.scrollIntoView({ block: "nearest" });
	el.style.scrollMargin = margin;
}

type Morph = {
	/** true from the Add to STAK click until the save lands (it arms the transitions on the elements that stay) */
	armed: boolean;
	/** true for the 0.35 s after an armed save landed: the leaving layers stay mounted to dissolve */
	running: boolean;
	arm: () => void;
	disarm: () => void;
};

/**
 * Smart Animate for the unsaved -> saved switch: the frame-to-frame morph the prototype plays on Add to STAK.
 * Matching layers move (the ticker card grows 229.8 -> 296, the rail below follows), new layers fade in (the
 * "Saved to My STAK" toast, the "View <SYMBOL> in My STAK" row), removed layers fade out (the bookmark, Add to STAK).
 */
function useSaveMorph(saved: boolean): Morph {
	const [armed, setArmed] = useState(false);
	const armedRef = useRef(false);
	const [running, setRunning] = useState(false);
	const was = useRef(saved);
	// before paint: the frame that first shows the saved state already starts the morph
	useLayoutEffect(() => {
		const before = was.current;
		was.current = saved;
		if (!saved || before || !armedRef.current) return;
		armedRef.current = false;
		setArmed(false);
		if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
		setRunning(true);
	}, [saved]);
	useEffect(() => {
		if (!running) return;
		const t = window.setTimeout(() => setRunning(false), MORPH_MS + 50);
		return () => window.clearTimeout(t);
	}, [running]);
	const arm = useCallback(() => {
		armedRef.current = true;
		setArmed(true);
	}, []);
	const disarm = useCallback(() => {
		armedRef.current = false;
		setArmed(false);
	}, []);
	return { armed, running, arm, disarm };
}

/** Plays a one-off Web Animation on the element while `active` (mounting with it, so new and leaving layers animate too). */
function useMorphAnimation(ref: RefObject<HTMLElement | null>, active: boolean, keyframes: Keyframe[], fill: FillMode = "both") {
	useLayoutEffect(() => {
		const el = ref.current;
		if (!active || !el || typeof el.animate !== "function") return;
		const animation = el.animate(keyframes, { duration: MORPH_MS, easing: EASE_OUT, fill });
		return () => animation.cancel();
		// the keyframes are literals of the caller; the animation runs once per activation
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active]);
}

const FADE_IN: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
const FADE_OUT: Keyframe[] = [{ opacity: 1 }, { opacity: 0 }];

/** The ticker card's height in the two frames: hugging its content unsaved (2:4508), fixed with the CTA saved (2:4613). */
const CARD_UNSAVED = 229.8;
const CARD_SAVED = 296;

type RailRefs = {
	cardRef: RefObject<HTMLDivElement | null>;
	ctaRef: RefObject<HTMLDivElement | null>;
	ctaLinkRef: RefObject<HTMLAnchorElement | null>;
	addRef: RefObject<HTMLDivElement | null>;
};

/**
 * The rail's part of the Smart Animate and its focus hand-off, on the elements of both arrangements: the ticker card
 * grows into the saved one, its CTA row fades in, and Add to STAK dissolves where it stands. In the rail (1024+) Add
 * to STAK has no match in the saved frame, so its slot closes (52 + the 16 gap) while Key stats slides down under
 * it: as the card above grows 66.2 the divider goes 526.8 -> 525 like the frames, and the button rides back up by
 * the card's growth to stay in place. Below 1024 the button sits ABOVE the card (the phone frames' order), so only
 * its own slot closes (52 + the aside's 18 gap) and nothing rides: the card rises over the button, which dissolves
 * under it (the card is the later layer there, TickerCard).
 */
function useRailMorph(saved: boolean, morph: Morph, compact: boolean): RailRefs {
	const cardRef = useRef<HTMLDivElement>(null);
	const ctaRef = useRef<HTMLDivElement>(null);
	const ctaLinkRef = useRef<HTMLAnchorElement>(null);
	const addRef = useRef<HTMLDivElement>(null);
	// the control that saved (the hero bookmark or Add to STAK) leaves the page: keyboard focus moves to the new
	// "View <SYMBOL> in My STAK" row instead of falling back to the top of the document. Below 1024 that row sits further
	// down the column, often under the window's bottom edge (390x844: y 933), so a keyboard focus (the row shows its
	// ring) is brought into view (WCAG 2.4.7 / 2.4.11); a tap or a click moves no ring and scrolls nothing, as the
	// prototype's Smart Animate. This runs on the saved layout, before the Smart Animate puts the leaving Add to STAK
	// back for its 350 ms, so the row lands where it ends up. From 1024 the row is in the rail's first screen, as
	// approved: no scroll.
	const wasSaved = useRef(saved);
	useLayoutEffect(() => {
		const before = wasSaved.current;
		wasSaved.current = saved;
		if (!saved || before || (document.activeElement && document.activeElement !== document.body)) return;
		const link = ctaLinkRef.current;
		link?.focus({ preventScroll: true });
		if (compact && link?.matches(":focus-visible")) revealFocus(link);
	}, [saved, compact]);
	useMorphAnimation(cardRef, morph.running, [{ height: `${CARD_UNSAVED}px` }, { height: `${CARD_SAVED}px` }], "backwards");
	useMorphAnimation(ctaRef, morph.running, FADE_IN);
	useMorphAnimation(
		addRef,
		morph.running,
		[
			{ height: "52px", marginBottom: "0px", opacity: 1, transform: "translateY(0px)" },
			{
				height: "0px",
				marginBottom: compact ? "-18px" : "-16px",
				opacity: 0,
				transform: compact ? "translateY(0px)" : `translateY(${CARD_UNSAVED - CARD_SAVED}px)`,
			},
		],
		"forwards",
	);
	return { cardRef, ctaRef, ctaLinkRef, addRef };
}

/**
 * The hero image layer, one box for every story: Figma's 814 x 542.37 "phone_centered_gradient 1" (2:4465) centred 1px
 * left of and 33.18 below the hero's middle (CENTER / CENTER constraints), object-cover; below 1024 every length a share
 * of the hero's width (R4, the phone frame 1:1320 draws it at half size).
 */
const IMAGE_BOX =
	"absolute left-[calc(50%-1px)] top-[calc(50%+33.18px)] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover max-lg:left-[calc(50%-0.13889%)] max-lg:top-[calc(78.47px+22.5986cqw)] max-lg:h-[75.3289cqw] max-lg:w-[113.0556%]";
/** Apple's illustration keeps its Figma size at every width; the gradient's own side columns continue it (Hero). */
const ILLUSTRATION_SIZE = "h-[542.3679px] w-[814px]";
/**
 * A story photo takes the same box at 1440 (814 x 542.37, the same place) and keeps covering the hero where the
 * illustration would be continued by its plain gradient instead: wider than 810 (from 1920 wide) the box grows with
 * the hero (4 px over it, so the 1 px shift to the left still leaves 1 px over the right edge; aspect kept), and on a
 * hero narrower than 521 (phones) it is as tall as the hero (2 px over), centred where the illustration is. A photo's
 * edge pixels are never stretched.
 */
const PHOTO_SIZE =
	"aspect-[814/542.3679] h-auto w-[max(814px,calc(100%+4px))] @max-[521px]:h-[calc(45.1972cqw+158.94px)]! @max-[521px]:w-[calc(67.8331cqw+238.5413px)]!";

/**
 * "Hero image" 2:4464: 720x416, #c4c4c4, radius 20, clipping the story's image (IMAGE_BOX), the category's glass toast
 * (18, 350), the play polygon (centred, 25 down) and, unsaved, the 33px bookmark 56 from the right edge; saved, the
 * "Saved to My STAK" toast 251 from the right edge. Apple's image is Figma's illustration; every other story shows its
 * own photo in the same box (src/app/news/articles.ts ARTICLE_HERO), which covers the hero at every width.
 * Wider than 720 the illustration's own side columns (a plain vertical gradient, 177 columns wide on each side of the
 * device) continue it to the hero's edges, so the device stays the frame's size in the middle with no seam.
 * Past 2560 (canvas zoom 1.5-3) Figma's own 2x / 4x render of the illustration's 720x416 window (all Figma exports of the
 * layer: it is clipped by this frame; N.heroWindowSet) draws over the 1x fill through DensityImg, clipped 20 px in from
 * its sides where Figma baked the frame's rounded corners: the device and everything on its screen are drawn from a
 * source of at least zoom x their size; the 1x fill shows only the plain gradient columns beside the window. Up to
 * 2560 that <img> has no source and draws nothing (the approved hero, pixel for pixel); a photo has no denser source than
 * its original, so its window <img> never draws.
 * Below 1024 the hero fills its column (at most 720); narrower than 720 the image and the play mark scale down with it
 * as one unit (R4: every length a share of the hero's width, as the phone frame 1:1320 draws it at half size), while
 * the toasts and the bookmark keep Figma's size, pinned to the hero's corners (the category toast by its 20.75 / 20 from
 * the bottom, where 350 from the top puts it). Text keeps its size (R4), so the hero reflows around the illustration
 * instead of letting the toasts run into the scaled device: the device's top stays 78.47 down at every width, the
 * frame's 12.47 below the toasts' 66, and the hero grows by what that adds (78.47 x (1 - scale): 2.2 px at 700 wide, 7.9
 * at 648, none at 720). Narrower than 606 "Tech & Ai" no longer fits beside the device (from 537) and "Saved to My
 * STAK" would reach its top (from 605): there the hero also keeps 12.47 + 66 below the device, so the category toast
 * sits under it, the image centred between; the illustration's own top and bottom rows continue it to the hero's edges
 * where it no longer reaches them (below 521). Every hero has the same height rules, photo or illustration.
 *
 * The hero is the story's MEDIA SLOT, as on the phones (src/app/news/media.ts; android NewsDetailScreen.kt:396-639, iOS
 * NewsDetailView.swift:290-372): a story with a clip draws the play mark (a button, "Play video") and, where the phones
 * serve a poster for it, that poster fills the hero, over the listing photo it replaces (which stays under it while the
 * poster loads and if it fails). Apple's poster is the frame's own illustration (the phones' posterRes), unchanged. The
 * poster and the clip are drawn as the hero's shape allows (media.ts mediaFit): a hero within a tenth of the picture's
 * shape (the frame's 720 x 416 at 1440, a tablet's column) is covered, cropping a few percent as the phones' hero does;
 * a hero further off (a 390 phone's near-square column, the wide heroes from about 1580 up to 2560, which would keep
 * half the picture) shows the whole picture letterboxed, and the hero is filled behind it with the poster's own blurred,
 * dimmed copy (one fetch, the same URL) or, under Apple's clip (no served poster), black. A poster shows once its size is
 * known, so it never lands in one fit and jumps to the other.
 * The mark plays the clip IN PLACE: the browser's own player fills the hero in the same fit (its controls: play / pause,
 * the seek line, time, volume, fullscreen, picture in picture, speed, as iOS uses the native AVPlayer chrome). The hero
 * keeps its rest until the player has painted its FIRST FRAME (the phones' poster holds until the clip runs, android
 * NewsDetailScreen.kt:451-452 "Poster holds until onRenderedFirstFrame", iOS NewsDetailView.swift:306-308), and through
 * a clip's own lead-in: the two CNBC clips fade in from black, so their poster holds until the newscast is on (HeroVideo;
 * heroPlayer.ts watchFirstFrame, media.ts StoryClip.leadIn). A clip whose
 * host refuses the page's referrer must be fetched into memory before it can play: like the phones, which buffer from the
 * moment the article opens, the hero starts that fetch once its poster is in, or when the pointer or the keyboard reaches
 * the play mark, unless the browser asks to save data (src/app/news/clipSource.ts), so a press usually finds the clip
 * there. Once the clip has a source, the player is mounted HIDDEN and inert under the rest layers so the stream starts
 * (src/app/news/heroPlayer.ts): an empty player (Chrome's grey surface, its spinner and 0:00 bar) never covers the poster.
 *
 * THE WAIT, from the press to the first frame (the review of 2026-11-09): the hero is busy (aria-busy) and says so to a
 * screen reader ("Loading video", its status); the play mark breathes between dim and full (news/motion.css; under
 * reduced motion it holds the dimmed look) under the progress cursor, and is the way out: named "Cancel video", a second
 * press (not a double click's) gives the wait up, as Escape does anywhere in the hero. A clip that gets no closer to its
 * first frame for 15 s (heroPlayer STALL_MS: no further slice of a fetched clip, no metadata of a stream), or whose fetch
 * or stream fails, returns the hero to its poster and play mark by itself, as a failed stream does on the phones
 * (android NewsDetailScreen.kt:1509-1512, iOS NewsDetailView.swift:1037), and the status says it did not load. A browser
 * that refuses to start the clip outside the press (WebKit, after a fetch) gets the player at once, paused on its poster
 * with its own play button, instead of a wait for a frame that never comes.
 *
 * With the frame in, the hero belongs to the player, which takes the keyboard focus from whichever rest control had it:
 * the category toast, the play mark and the save control step aside (android 572-619, iOS 368-372). A finished or failed
 * clip returns to the poster and the play mark, rewound (the user's 2026-08-25/26 rule on both phones), and a keyboard
 * focus on the player returns to the play mark. A story without a clip draws no play mark (the phones draw the glyph
 * only for video media).
 *
 * The save control (D14) is one button that toggles: unsaved it is the 33px bookmark (2:4470) 56 from the right edge,
 * saved the "Saved to My STAK" glass toast (2:4571) 251 from it, pressed (aria-pressed), which unsaves. Figma draws the
 * bookmark in the page's ink (#0a1020) on its light illustration; over a story's own picture (a newscast poster, a photo,
 * the dimmed band beside a letterboxed one) that ink can vanish (1.5:1 on Nvidia's studio), so there the same glyph
 * carries a soft light edge (BOOKMARK_EDGE): the ink always has light next to it. Apple's hero keeps the frame's bare
 * glyph.
 */
function Hero({
	a,
	art,
	clip,
	saved,
	busy,
	morph,
	compact,
	onToggleSave,
}: {
	a: NewsArticle;
	art: HeroArt;
	clip: StoryClip | null;
	saved: boolean;
	busy: boolean;
	morph: Morph;
	compact: boolean;
	onToggleSave: () => void;
}) {
	// past 2560 the canvas zooms: the window render draws the device sharp (DensityImg picks 2x up to zoom 2, 4x above)
	const zoomed = useCanvasSize().zoom > 1;
	const photo = art.kind === "photo" ? art : null;
	const windowSet = photo ? undefined : N.heroWindowSet;
	const side = { backgroundImage: `url(${N.hero})`, backgroundRepeat: "no-repeat", backgroundSize: "2000% 542.3679px" } as const;
	const toast: CSSProperties = { paddingTop: saved ? 10 : 9.625, paddingBottom: saved ? 10 : 9.625, boxShadow: GLASS_RIM };
	if (compact) toast.bottom = saved ? 20 : 20.75;
	const player = useHeroPlayer();
	const heroRef = player.heroRef;
	// the hero's own shape, for how the clip and its poster fill it (measured only for a story with a clip)
	const box = useBoxSize(heroRef, clip !== null);
	const [posterFailed, setPosterFailed] = useState(false);
	const [posterSize, setPosterSize] = useState<MediaSize | null>(null);
	const [clipSize, setClipSize] = useState<MediaSize | null>(null);
	const poster = clip?.poster && !posterFailed ? clip.poster : null;
	const posterRef = useRef<HTMLImageElement>(null);
	// a poster the cache already holds is complete before React attaches onLoad
	useEffect(() => {
		const img = posterRef.current;
		if (poster && img?.complete && img.naturalWidth > 0) setPosterSize({ width: img.naturalWidth, height: img.naturalHeight });
	}, [poster]);
	const { url: src, request: fetchClip, cancel: dropFetch } = useClipSource(clip, player.progress, player.fail);
	const playing = player.playing && clip !== null;
	// the player is mounted once the clip has a source (hidden, so the stream starts) and shown once it has painted a frame
	const mounted = playing && src !== null;
	const showVideo = mounted && player.ready;
	// the clip is on its way (a fetch into memory first, then the stream's first frame): the hero keeps its rest and the
	// play mark waits
	const waiting = playing && !showVideo;
	// a clip that must be fetched starts coming once the hero's poster is in (the phones buffer from the moment the
	// article opens), unless the browser asks to save data (clipSource.ts); a streamed clip asks for nothing here
	const posterSettled = !clip?.poster || posterFailed || posterSize !== null;
	useEffect(() => {
		if (posterSettled && prefetchAllowed()) fetchClip();
	}, [posterSettled, fetchClip]);
	// the wait ended without a frame (a stall, a failed fetch or stream): a fetch still under way is dropped, so the
	// next press starts afresh
	useEffect(() => {
		if (player.failed) dropFetch();
	}, [player.failed, dropFetch]);
	/** the pointer or the keyboard reaches the play mark: the clip starts coming (where the page may fetch ahead) */
	const reach = () => {
		if (prefetchAllowed()) fetchClip();
	};
	/** the play mark's press: plays; while the clip is on its way, a second press gives the wait up */
	const press = () => {
		if (!waiting) {
			fetchClip();
			player.start();
		} else if (player.cancel() && !prefetchAllowed()) dropFetch();
	};
	/** Escape anywhere in the waiting hero gives the wait up */
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key !== "Escape" || !player.cancel(true)) return;
		e.preventDefault();
		if (!prefetchAllowed()) dropFetch();
	};
	const posterFit: MediaFit = posterSize ? mediaFit(box, posterSize) : "cover";
	// the clip's own shape once its metadata is in; its poster's (the same picture) until then
	const videoFit: MediaFit = mediaFit(box, clipSize ?? posterSize ?? NO_SIZE);
	const letterboxed = showVideo ? videoFit === "contain" : poster !== null && posterSize !== null && posterFit === "contain";
	// Figma's GLASS on the toasts refracts what lies behind them (2:4466 / 2:4571: refraction 0.15, depth 10.5); over the
	// frame's plain gradient that reads as no frost (GLASS_RIM), over a served newscast frame, with its own captions behind
	// the toast, CSS has no refraction: a soft backdrop blur stands in for it, so the toast's white text stays readable
	const frost = poster ? "backdrop-blur-[12px]" : "";
	const hero = (
		<div
			ref={heroRef}
			aria-busy={waiting || undefined}
			onKeyDown={waiting ? onKeyDown : undefined}
			className="relative h-[416px] w-full overflow-clip rounded-[20px] bg-[#c4c4c4] max-lg:@container max-lg:h-auto"
		>
			{/* below 1024 the hero's height: the scaled frame's 416 plus the 78.47 x (1 - scale) that keeps the device 78.47
			    down, or (narrower than 606) the device's 325.42 / 720 of the width plus the two 78.47 bands that hold the toasts */}
			{compact && <div key="height" aria-hidden="true" className="pt-[calc(100%*337.53/720+78.47px)] @max-[606px]:pt-[calc(100%*325.42/720+156.94px)]" />}
			{!photo && <div key="side-l" aria-hidden="true" className="absolute inset-y-0 left-0" style={{ ...side, width: "max(0px, calc(50% - 407px))", backgroundPosition: "0 -30px" }} />}
			{!photo && <div key="side-r" aria-hidden="true" className="absolute inset-y-0 right-0" style={{ ...side, width: "max(0px, calc(50% - 405px))", backgroundPosition: "100% -30px" }} />}
			{compact && !photo && <div key="band-top" aria-hidden="true" className="absolute inset-x-0 top-0 hidden @max-[606px]:block" style={heroBand("0%")} />}
			{compact && !photo && <div key="band-bottom" aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden @max-[606px]:block" style={heroBand("100%")} />}
			<img
				key="image"
				alt=""
				src={photo ? photo.src : N.hero}
				width={photo ? photo.width : 908}
				height={photo ? photo.height : 605}
				fetchPriority={poster ? undefined : "high"}
				className={`${IMAGE_BOX} ${photo ? PHOTO_SIZE : ILLUSTRATION_SIZE}`}
			/>
			{/* up to 2560 it has no source and is transparent (an empty <img> draws a 1px edge): the same box at every size, so
			    the big sizes stay the 2560 layout scaled element for element */}
			{!compact && (
				<DensityImg
					key="image-window"
					srcSet={zoomed ? windowSet : undefined}
					className={`pointer-events-none absolute left-[calc(50%-360px)] top-0 h-[416px] w-[720px] max-w-none [clip-path:inset(0_20px)] ${zoomed && windowSet ? "" : "opacity-0"}`}
				/>
			)}
			{/* a letterboxed picture's surround: the poster's own blurred, dimmed copy (the same URL: one fetch), or black
			    under a clip that has no served poster (Apple's, over the illustration) */}
			{letterboxed &&
				(poster ? (
					<img
						key="backdrop"
						alt=""
						aria-hidden="true"
						src={poster}
						referrerPolicy="no-referrer"
						data-hero-backdrop="poster"
						className="absolute inset-0 size-full max-w-none scale-110 object-cover blur-[24px] brightness-[0.55]"
					/>
				) : (
					<div key="backdrop" aria-hidden="true" data-hero-backdrop="black" className="absolute inset-0 bg-black" />
				))}
			{/* the clip's served poster (no referrer: a news site's image is the story's, not a tracker), drawn once its
			    size is known, in the fit the hero's shape allows */}
			{poster && (
				<img
					key="poster"
					ref={posterRef}
					alt=""
					src={poster}
					fetchPriority="high"
					referrerPolicy="no-referrer"
					onLoad={(e) => setPosterSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
					onError={() => setPosterFailed(true)}
					data-hero-poster=""
					data-fit={posterFit}
					className={`absolute inset-0 size-full max-w-none ${posterFit === "contain" ? "object-contain" : "object-cover"} ${posterSize ? "" : "opacity-0"}`}
				/>
			)}
			{mounted && src && (
				<HeroVideo
					key="video"
					src={src}
					poster={poster}
					fit={videoFit}
					leadIn={clip?.leadIn ?? 0}
					visible={showVideo}
					title={a.title}
					videoRef={player.videoRef}
					onReady={player.markReady}
					onCloser={player.progress}
					onDone={player.stop}
					onFail={player.fail}
					onMetadata={setClipSize}
				/>
			)}
			{!showVideo && (
				<div
					key="tag"
					data-hero-tag=""
					className={`absolute left-[18px] top-[350px] flex items-center overflow-clip rounded-[15.75px] bg-[rgba(36,43,61,0.25)] px-[14px] max-lg:top-auto ${frost} ${morph.armed || morph.running ? "transition-[padding] duration-[350ms] ease-[cubic-bezier(0,0,0.58,1)]" : ""}`}
					style={toast}
				>
					<span className={`${HUG_WIDTH} whitespace-nowrap font-geist text-[20px] font-medium leading-[26px] text-white`}>{a.category}</span>
				</div>
			)}
			{!showVideo && (
				<SaveToggle
					key="save"
					company={a.ticker.name}
					text={a.savedToast}
					saved={saved}
					busy={busy}
					animate={morph.running}
					frost={frost}
					edged={photo !== null}
					onToggle={onToggleSave}
				/>
			)}
			{/* the play mark. While its clip is on the way it is the way out: its mark breathes (dimmed and still under reduced
			    motion), the button itself keeps its full focus ring, and a second press gives the wait up (press) */}
			{!showVideo && clip && (
				<button
					key="play"
					ref={player.playRef}
					type="button"
					aria-label={waiting ? "Cancel video" : "Play video"}
					aria-busy={waiting || undefined}
					data-focus-key="play"
					data-hero-play={waiting ? "waiting" : "rest"}
					onClick={press}
					// a held key presses once: its repeats would start and give up in turn
					onKeyDown={(e) => {
						if (e.repeat && (e.key === "Enter" || e.key === " ")) e.preventDefault();
					}}
					onPointerEnter={reach}
					onFocus={reach}
					className={`absolute left-[calc(50%-1px)] top-[calc(50%+25px)] flex size-[162px] -translate-x-1/2 -translate-y-1/2 items-center justify-center max-lg:left-[calc(50%-0.13889%)] max-lg:top-[calc(78.47px+21.4624cqw)] max-lg:h-[22.5cqw] max-lg:w-[22.5%] ${waiting ? "cursor-progress" : "cursor-pointer"}`}
				>
					<span className={`block flex-none rotate-90 max-lg:size-full ${waiting ? "stak-news-waiting opacity-60" : ""}`}>
						<span className="relative block size-[162px] max-lg:size-full">
							<span className="absolute bottom-1/4 left-[13.01%] right-[13.01%] top-[8.64%]">
								<img alt="" src={N.polygon} className="block size-full max-w-none" />
							</span>
						</span>
					</span>
				</button>
			)}
			{/* the bookmark leaving with Add to STAK's Smart Animate (the save control is already the saved toast) */}
			{!showVideo && saved && morph.running && <BookmarkGhost key="bookmark-ghost" edged={photo !== null} />}
		</div>
	);
	if (!clip) return hero;
	// What a screen reader hears of the wait (nothing is drawn): the press started the clip, or the clip did not come. It
	// sits beside the hero, not in it: a live region inside a busy element (aria-busy) is held back until the element
	// is no longer busy, which is exactly while this one has something to say.
	return (
		<>
			{hero}
			<span role="status" data-hero-status="" className="sr-only">
				{waiting ? "Loading video" : player.failed ? "The video did not load." : ""}
			</span>
		</>
	);
}

/** A size not yet known: mediaFit reads it as "cover", and nothing is drawn with it before it is known. */
const NO_SIZE: MediaSize = { width: 0, height: 0 };

/**
 * An element's box (CSS px), kept current through ResizeObserver (the window's resize where there is none); NO_SIZE
 * until it is measured, and while `enabled` is false (a hero without a clip has nothing to fit).
 */
function useBoxSize(ref: RefObject<HTMLElement | null>, enabled: boolean): MediaSize {
	const [size, setSize] = useState<MediaSize>(NO_SIZE);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!enabled || !el) return;
		const read = () => {
			const r = el.getBoundingClientRect();
			setSize((s) => (s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }));
		};
		read();
		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", read);
			return () => window.removeEventListener("resize", read);
		}
		const observer = new ResizeObserver(read);
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref, enabled]);
	return size;
}

/**
 * The clip playing in place: the browser's player, filling the hero in the fit its shape allows (cover, cropping a few
 * percent as the phones' VideoSurfaceHost zoom = true does, or contain over the hero's backdrop: media.ts mediaFit),
 * started at once (the play mark's press is the gesture that allows sound). It is mounted as soon as the clip has a
 * source, so the stream starts, but HIDDEN and inert (no controls, no focus, no pointer) until it has painted its first
 * frame (`visible`): until then the hero's rest layers stay over it, so Chrome's empty player (its grey surface, spinner
 * and 0:00 bar) never shows and a press in that gap lands on the busy play mark, not on the player (the phones' poster
 * holds until onRenderedFirstFrame, android NewsDetailScreen.kt:451-452, :1508). THE FIRST FRAME IS THE FIRST ONE THAT
 * SHOWS THE PICTURE (heroPlayer.ts watchFirstFrame): a frame the player presents past the clip's own lead-in
 * (requestVideoFrameCallback's media time, or the playback position at a timeupdate), not the first one it decodes. The
 * two CNBC clips (Nvidia, Apple) open on black and fade their newscast in over 0.6 s, and a player holding its first
 * frame may take a moment to start, so the hero went poster, black player, picture (the review of 2026-11-09; media.ts
 * StoryClip.leadIn, measured frame by frame); a clip that opens on its picture (the VOA and X clips) shows at its first
 * moving frame, a thirtieth of a second in. The first decoded frame (loadeddata) and the start of playback (playing) only
 * tell the hero's stall clock that the clip is getting closer (`onCloser`); the clock runs until the picture is on. Only
 * a browser that reports neither frames nor timeupdate shows the player on loadeddata. Once visible it holds the
 * keyboard focus the hero's rest control had (useHeroPlayer hands it on), so Space / the arrows / Tab reach its
 * controls; its focus ring is drawn inside it, since the hero clips anything outside.
 * A browser may refuse to start the clip because the call no longer falls inside the person's press: WebKit does for a
 * clip that had to be fetched first (the play() then runs after the fetch). No moving frame would ever be reported, so
 * the refusal itself shows the player: paused on the clip's poster with its own play button, one more press away (the
 * review of 2026-11-09, simulated in Chrome: the hero stayed busy for good). A play() cut short because the player is
 * going (AbortError) reports nothing; a source that cannot play reports its error (`onFail`).
 */
function HeroVideo({
	src,
	poster,
	fit,
	leadIn,
	visible,
	title,
	videoRef,
	onReady,
	onCloser,
	onDone,
	onFail,
	onMetadata,
}: {
	src: string;
	/** the clip's served poster (null: none, the hero's own picture is under the player) */
	poster: string | null;
	fit: MediaFit;
	/** the clip's own lead-in in seconds (media.ts StoryClip.leadIn; 0: it opens on its picture) */
	leadIn: number;
	/** the player has a frame: shown, with its controls and the focus */
	visible: boolean;
	title: string;
	videoRef: RefObject<HTMLVideoElement | null>;
	/** the picture is on (or the browser wants the person's own press: the player shows either way) */
	onReady: () => void;
	/** the stream got closer to its picture (its metadata, its first decoded frame, playback starting): the hero's stall clock starts again */
	onCloser: () => void;
	/** the clip ended */
	onDone: () => void;
	/** the stream failed */
	onFail: () => void;
	/** the clip's own size, from its metadata: the fit follows it from then on */
	onMetadata: (size: MediaSize) => void;
}) {
	useEffect(() => {
		const v = videoRef.current;
		if (!v) return;
		// the picture is on once the player presents a frame past the clip's lead-in (never just its first decoded frame)
		const stop = watchFirstFrame(v, onReady, leadIn);
		const started = v.play();
		if (started && typeof started.catch === "function") {
			started.catch((refusal: unknown) => {
				if ((refusal as { name?: string } | null)?.name === "AbortError") return;
				// the browser wants the person's own press: no frame will move by itself, the player shows as it is
				stop();
				onReady();
			});
		}
		return stop;
	}, [videoRef, src, leadIn, onReady]);
	return (
		<video
			ref={videoRef}
			src={src}
			poster={poster ?? undefined}
			controls={visible}
			inert={!visible}
			playsInline
			preload="auto"
			aria-label={`Video: ${title}`}
			data-hero-video=""
			data-fit={fit}
			data-visible={visible ? "true" : "false"}
			onLoadedMetadata={(e) => {
				onMetadata({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight });
				onCloser();
			}}
			onLoadedData={onCloser}
			onPlaying={onCloser}
			onEnded={onDone}
			onError={onFail}
			className={`absolute inset-0 size-full max-w-none ${fit === "contain" ? "object-contain" : "object-cover"} ${visible ? "" : "pointer-events-none opacity-0"} focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#69b3ca]`}
		/>
	);
}

/**
 * A band of the narrow hero above (y 0%) or below (y 100%) the illustration where it no longer reaches the hero's edge:
 * the image's own first / last rows (a plain gradient, the same colour across: 242,243,246 at the top, 176,178,186 at
 * the bottom) stretched over it, as the side columns continue it on a wide hero. As tall as the gap, 78.47 - 108.47 / 720
 * of the hero's width (none from 521 wide, where the image reaches the edges), plus 1 px under the image's edge: the
 * two meet on a fraction of a pixel, and without the overlap the hero's #c4c4c4 showed through that row as a grey line.
 */
const heroBand = (y: string): CSSProperties => ({
	height: "max(0px, calc(79.47px - 15.0659cqw))",
	backgroundImage: `url(${N.hero})`,
	backgroundRepeat: "no-repeat",
	backgroundSize: "113.0556cqw 10000%",
	backgroundPosition: `50% ${y}`,
});

/**
 * The hero's save control (D14), one button in two looks:
 * - unsaved, the bookmark (2:4470, 33.125 square, its stroke drawn 0.88 past the bottom): saves, instantly (1:1326 ->
 *   1:1603);
 * - saved, the "Saved to My STAK" toast (2:4571: glass #242b3d @ 25%, radius 15.75, 10/14 padding, the 25.25 filled
 *   bookmark 8 from the text), pressed: unsaves, instantly (the bookmark's edge mirrored). It fades in when Add to STAK's
 *   Smart Animate brings it.
 * Being one element, a keyboard focus stays on it as it toggles; its name says what pressing it does, its pressed state
 * what it is (as the deck's Save chip: "Unsave X from My STAK", aria-pressed). The toaster announces each change.
 */
function SaveToggle({
	company,
	text,
	saved,
	busy,
	animate,
	frost,
	edged,
	onToggle,
}: {
	company: string;
	text: string;
	saved: boolean;
	busy: boolean;
	animate: boolean;
	/** the backdrop blur the hero gives its glass over a served poster ("" over the frame's own picture) */
	frost: string;
	/** the hero shows a story's own picture, not the frame's illustration: the bookmark carries its light edge */
	edged: boolean;
	onToggle: () => void;
}) {
	const ref = useRef<HTMLButtonElement>(null);
	useMorphAnimation(ref, animate && saved, FADE_IN);
	return (
		<button
			ref={ref}
			type="button"
			aria-label={saved ? `Unsave ${company} from My STAK` : `Save ${company} to My STAK`}
			aria-pressed={saved}
			aria-busy={busy || undefined}
			data-focus-key="save"
			data-save-toggle={saved ? "saved" : "unsaved"}
			onClick={onToggle}
			// text-left: a button centres its text by default, which would move the label inside its whole-pixel hug box
			className={
				saved
					? `absolute left-[calc(100%-251px)] top-[20px] flex cursor-pointer items-center gap-[8px] overflow-clip rounded-[15.75px] bg-[rgba(36,43,61,0.25)] px-[14px] py-[10px] text-left ${frost}`
					: "absolute left-[calc(100%-56px)] top-[16px] size-[33.125px] cursor-pointer"
			}
			style={saved ? { boxShadow: GLASS_RIM } : undefined}
		>
			{saved ? (
				<>
					<img alt="" src={N.bookmarkSaved} width={25.25} height={25.25} className="size-[25.25px] shrink-0" />
					<span className={`${HUG_WIDTH} whitespace-nowrap font-geist text-[20px] font-medium leading-[26px] text-white`}>{text}</span>
				</>
			) : (
				<span className="absolute inset-[0_0_-2.66%_0]">
					<img alt="" src={N.bookmark} data-edged={edged ? "" : undefined} className="block size-full max-w-none" style={edged ? BOOKMARK_EDGED : undefined} />
				</span>
			)}
		</button>
	);
}

/**
 * The unsaved bookmark over a story's own picture. Figma draws the glyph (2:4470) in the page's ink, #0a1020, on its
 * light illustration, where it reads 15.7:1; over a dark newscast frame, a dark photo or the dimmed band beside a
 * letterboxed poster the same ink vanishes (1.5:1 on Nvidia's studio at 1440 and 390; the review of 2026-11-09, WCAG
 * 1.4.11 asks 3:1). The phones draw the same bare glyph (android NewsDetailScreen.kt:619-634) and share this.
 * So over a picture the glyph, unchanged, carries a soft light edge: its own shape as a white glow, tight against the
 * stroke and fading within about 4 px. Whatever the picture, the ink has light next to it (the edge on a dark picture,
 * the picture itself on a light one, where the edge cannot be seen and the glyph looks as the frame draws it); measured
 * on a black picture, the worst there is, the ink against the pixels beside it is 9:1 or better. A filter, so nothing is
 * drawn that Figma lacks; Apple's hero has no edge (the frame's pixels).
 */
const BOOKMARK_EDGED: CSSProperties = {
	filter: "drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff) drop-shadow(0 0 4px rgba(255,255,255,0.6))",
};

/** The unsaved bookmark's picture, dissolving where it stood while Add to STAK's Smart Animate runs (not a control). */
function BookmarkGhost({ edged }: { edged: boolean }) {
	const ref = useRef<HTMLSpanElement>(null);
	useMorphAnimation(ref, true, FADE_OUT, "forwards");
	return (
		<span ref={ref} aria-hidden="true" className="pointer-events-none absolute left-[calc(100%-56px)] top-[16px] size-[33.125px]">
			<span className="absolute inset-[0_0_-2.66%_0]">
				<img alt="" src={N.bookmark} className="block size-full max-w-none" style={edged ? BOOKMARK_EDGED : undefined} />
			</span>
		</span>
	);
}

function TickerHead({ a, quote }: { a: NewsArticle; quote: Quote | null }) {
	const t = a.ticker;
	return (
		<>
			<div className="flex items-center gap-[10px] overflow-clip">
				<span aria-hidden="true" className="flex size-[30px] items-center justify-center overflow-clip rounded-[15px] bg-[#242b3d]">
					<span className="whitespace-nowrap font-sora text-[14px] font-semibold leading-[18px] text-[#f2f6fc]">{t.initial}</span>
				</span>
				<span className="flex flex-col items-start gap-px overflow-clip whitespace-nowrap">
					<span id={TICKER_NAME_ID} className="font-geist text-[15px] font-medium leading-[20px] text-[#f2f6fc]">
						{t.name}
					</span>
					<span className="font-geist text-[12px] leading-[16px] text-[#819abb]">{t.symbol}</span>
				</span>
			</div>
			<p className="whitespace-nowrap font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{quote ? money(quote.price) : t.price}</p>
		</>
	);
}

/** The change line's colour by tone: the frame's green (2:4625), the app's red, and the label grey of a figure that prints zero (N28c). */
const CHANGE_COLOR: Readonly<Record<Tone, string>> = { up: "text-[#2fd08a]", down: "text-[#ff5a6a]", flat: "text-[#819abb]" };

/**
 * Today's move in the template's "+4.84% today": green up, red down, and neutral when it prints zero ("0.00% today", no
 * sign, the label grey: zero is neutral, the coordinator's N23c / N28c / N30.3c; src/app/news/rail.ts changeToday /
 * changeTone, the tone read at the two decimals printed). A record's own showcase figure (the frame's "+4.84% today" on
 * the untouched showcase's Apple card) is printed verbatim and coloured by its own sign.
 */
function ChangeLine({ a, quote }: { a: NewsArticle; quote: Quote | null }) {
	const tone: Tone = quote ? changeTone(quote.changePercent) : a.ticker.change.trimStart().startsWith("-") ? "down" : "up";
	return (
		<p data-change={tone} className={`whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] ${CHANGE_COLOR[tone]}`}>
			{quote ? changeToday(quote.changePercent) : a.ticker.change}
		</p>
	);
}

/**
 * Key stats (src/app/news/rail.ts railStats). Market cap and P/E are the company's ONE figure, the stock pages' own
 * (src/app/stocks/fundamentals.ts fundamentalsOf, the accessor every card reads: the coordinator's N23j / N23o, the
 * hunt's NUM-05), so the article and the stock page its ticker card opens agree. The rest comes from the quote's own
 * sources: the API's yield and ranges only when the quote itself is a live one (a visitor's demo-priced company never
 * mixes a live range with a demo price), otherwise the catalog's yield and the FOUNDATION history's day and year for
 * the ranges (both end at the quote: never a range the price sits outside); the volume stays the record's (the API
 * sends none).
 */
function useKeyStats(symbol: string, authored: StatRows, quote: Quote | null, day: PriceHistoryState, year: PriceHistoryState): StatRows {
	const liveQuote = quote?.live === true;
	const data = useQuery(stockDataQuery(symbol, liveQuote)); // the same request the rail's live quote already made
	const m = liveQuote ? data.data?.metrics : undefined;
	const q = liveQuote ? data.data?.quote : undefined;
	return railStats(authored, {
		fundamentals: fundamentalsOf(symbol),
		api: liveQuote
			? { marketCap: m?.marketCap, peRatio: m?.peRatio, dividendYield: m?.dividendYield, week52Low: m?.week52Low, week52High: m?.week52High, dayLow: q?.low, dayHigh: q?.high }
			: null,
		catalog: financialsOf(symbol) ?? null,
		day: day.status === "ready" ? day.history : null,
		year: year.status === "ready" ? year.history : null,
	});
}

/** The ticker card's line: Figma's own (the showcase's Apple card) or the company's closes of the day, in the tone of the day's move. */
type TickerLineSource = { kind: "figma" } | { kind: "data"; closes: readonly number[]; tone: Tone };

/** The article's browser tab: "<headline> · News · STAK", set once the root's own path title has run (effects run child first). */
function useArticleTitle(title: string) {
	useEffect(() => {
		const t = window.setTimeout(() => {
			document.title = `${title} · News · STAK`;
		}, 0);
		return () => window.clearTimeout(t);
	}, [title]);
}

/**
 * "Ticker card" 2:4508 / 2:4613: one element in both states (the Smart Animate grows it): unsaved it hugs to 229.8;
 * saved it is 296 with the divider and "View <SYMBOL> in My STAK" 27 below the line. The head, price, change and line
 * sit at the same places in both cards, so one card grows into the other. The saved card's CTA row (2:4629, 320x21) opens
 * the saved stock detail entered from My STAK (2:5130, `from=my-stak`; `saved=1` travels only when the page itself is the
 * `?saved=1` preview, a real save is in the store already) with the 300 ms push to the left of the phone's "View in My
 * STAK" (1:1599).
 * The whole card opens the company's stock page (the audit's news #7, D1), as ONE link in either state, so a keyboard or
 * a screen reader meets the destination once (the review of 2026-11-07): unsaved, the company head, price, change and
 * line are the link, stretched over the card (its ::after on the positioned card) to the Discover entry
 * (/stocks/<SYMBOL>, where Save and Practice buy live, instantly); saved, the head, price and line are plain content
 * (read as text) and the CTA row's link is the one stretched over the card, to the My STAK entry. The phones leave their
 * stock card inert (android NewsDetailScreen.kt:718-822, iOS NewsDetailView.swift:517-601): a web call of the audit,
 * decided by D1.
 * Below 1024 the card sits under Add to STAK, a layer it covers in the phone frames (Stock card 1:1342 is drawn after
 * Add to STAK 1:1337): positioned, it paints over the button (a stacking context of its own: the canon's glow filter)
 * while the Smart Animate closes the button's slot, so the rising card covers the dissolving button as Figma's does.
 * From 1024 the card is above the button in the rail and the frames' order there (2:4541 over Key stats 2:4518) stays:
 * the button and Key stats never overlap the card, and the Smart Animate's moving button is its own later layer.
 */
function TickerCard({
	a,
	saved,
	preview,
	quote,
	line,
	rail,
}: {
	a: NewsArticle;
	saved: boolean;
	preview: boolean;
	quote: Quote | null;
	line: TickerLineSource;
	rail: RailRefs;
}) {
	const symbol = a.ticker.symbol;
	const body = (
		<>
			<TickerHead a={a} quote={quote} />
			<ChangeLine a={a} quote={quote} />
			{line.kind === "figma" ? <TickerLine src={saved ? N.chartSaved : N.chart} /> : <PriceLine closes={line.closes} tone={line.tone} />}
		</>
	);
	// the one link's ::after covers the card (positioned on it): the head's link unsaved, the CTA row's link saved
	const stretched = "after:absolute after:inset-0 after:content-['']";
	return (
		<div
			ref={rail.cardRef}
			className="relative flex w-full shrink-0 flex-col items-start overflow-clip rounded-[16px] bg-[#181f30] p-[20px]"
			style={saved ? { height: CARD_SAVED } : undefined}
		>
			{saved ? (
				<div key="stock" className="flex w-full flex-col items-start gap-[10px]">
					{body}
				</div>
			) : (
				<Link
					key="stock"
					to="/stocks/$symbol"
					params={{ symbol }}
					viewTransition={false}
					data-focus-key="stock"
					className={`flex w-full cursor-pointer flex-col items-start gap-[10px] ${stretched}`}
				>
					{body}
				</Link>
			)}
			{saved && (
				<div ref={rail.ctaRef} className="mt-[27px] flex w-full flex-col items-start gap-[13px]">
					<div className="h-px w-full shrink-0 bg-[#2a3346]" />
					{/* "CTA" 2:4629: the text left, the chevron (2:4631, drawn pointing down, turned -90deg) at the right end;
					    stretched over the whole card (the row's box is not positioned, so its ::after lands on the card) */}
					<Link
						ref={rail.ctaLinkRef}
						to="/stocks/$symbol"
						params={{ symbol: a.ticker.symbol }}
						search={{ from: "my-stak", saved: preview ? 1 : undefined }}
						viewTransition={PUSH_FORWARD}
						data-focus-key="view"
						className={`flex w-full cursor-pointer items-center justify-between overflow-clip py-[2px] ${stretched}`}
					>
						<span className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#aeaeae]">{a.ticker.viewInStak}</span>
						<span className="flex h-[6.875px] w-[3.75px] shrink-0 items-center justify-center">
							<span className="block flex-none -rotate-90">
								<img alt="" src={N.chevron} width={6.875} height={3.75} className="block h-[3.75px] w-[6.875px] max-w-none" />
							</span>
						</span>
					</Link>
				</div>
			)}
		</div>
	);
}

/**
 * "Key stats" 2:4518: three rows 34 tall, two 150 cells 20 apart (each cell 30 tall: label 14, 2, value 17). Below
 * 1024 the cells keep their two columns while they fit and otherwise take a second line inside the row (R7), so no
 * figure is ever cut; a row stays at least Figma's 34 (the card 197 tall, as the frame).
 */
function KeyStats({ title, rows }: { title: string; rows: StatRows }) {
	return (
		<div className="flex w-full flex-col items-start gap-[12px] overflow-clip whitespace-nowrap rounded-[16px] bg-[#181f30] p-[20px]">
			<p id={KEY_STATS_TITLE_ID} className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">
				{title}
			</p>
			{rows.map((row) => (
				<div key={row[0]!.label} className="flex h-[34px] w-full items-start gap-[20px] overflow-clip max-lg:h-auto max-lg:min-h-[34px] max-lg:flex-wrap max-lg:gap-y-[12px]">
					{row.map((stat) => (
						// Figma clips the 33px cell content at 30; its glyphs end above that line, so the cell does not clip
						// (Chrome's zoomed text below 1440 would otherwise lose the value's bottom pixel row)
						<div key={stat.label} className="flex h-[30px] min-w-0 flex-1 flex-col items-start gap-[2px] max-lg:min-w-[112px]">
							<span className="font-geist text-[11px] leading-[14px] text-[#819abb]">{stat.label}</span>
							<span className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{stat.value}</span>
						</div>
					))}
				</div>
			))}
		</div>
	);
}
