import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, BarChart3, CalendarDays, ChevronRight, Clock, Eye, Gauge, Newspaper, Search, Sparkles, Star, TrendingUp, type LucideIcon } from "lucide-react";
import type { StoredArticle } from "@/lib/openedArticle";
import { newsAge } from "@/lib/newsText";
import { expandQuery, matchesBrief, matchesLive } from "@/lib/newsSearch";
import { moodColor, moodScore, moodStatus } from "@/lib/marketMood";
import { useNewsFeed } from "@/hooks/useNewsFeed";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useBrandsList } from "@/hooks/useBrandsList";
import { CARD_ART_FALLBACK, cardArtUrl } from "@/components/discover/discoverTheme";
import { DESK, DeskButton, Kicker, Panel, PanelHeader, SkeletonBar, deskFocus, deskPageBg } from "@/components/desktop/deskKit";
import { AskStakAi } from "./AskStakAi";

const LIST_SHOWN = 4;
const FALLBACK_HERO = "/collections/real-estate.webp";

const typeLabel = (a: StoredArticle) => a.ticker ?? (a.type === "macro" ? "Market insight" : a.type === "sector" ? "Sector" : "Company");
const ago = (a: StoredArticle) => (a.datetime ? `${newsAge(a.datetime)} ago` : "");

/** A story's picture: its own image, else its company's card art, else a market photo. */
function Thumb({ article, className }: { article: StoredArticle; className: string }) {
	const src = article.image || (article.ticker ? cardArtUrl(article.ticker) : FALLBACK_HERO);
	return (
		<span className={`block overflow-hidden ${className}`} style={{ background: DESK.artBg }}>
			<img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = CARD_ART_FALLBACK; }} />
		</span>
	);
}

/** A list of stories (For You, Markets): picture, source label and age, headline; "View all" shows the rest. */
function StoryList({ icon, title, articles, loading, empty, onOpen, onRetry }: {
	icon: LucideIcon;
	title: string;
	articles: StoredArticle[];
	loading: boolean;
	empty: string;
	onOpen: (a: StoredArticle) => void;
	/** The list failed to load: the empty line says so and offers to try again. */
	onRetry?: () => void;
}) {
	const [all, setAll] = useState(false);
	const shown = all ? articles : articles.slice(0, LIST_SHOWN);
	return (
		<Panel label={title} className="gap-2 p-4">
			<PanelHeader icon={icon} title={title} action={articles.length > LIST_SHOWN ? (all ? "Show less" : "View all") : undefined} onAction={() => setAll((v) => !v)} />
			{loading && articles.length === 0 ? (
				<div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <SkeletonBar key={i} width="100%" height={56} />)}</div>
			) : articles.length === 0 ? (
				<p className="py-2 text-[13px]" style={{ color: DESK.muted }}>
					{empty}
					{onRetry && <> <button type="button" onClick={onRetry} className={`rounded font-medium ${deskFocus}`} style={{ color: DESK.cyan }}>Try again</button></>}
				</p>
			) : (
				<ul className="flex flex-col">
					{shown.map((a, i) => (
						<li key={a.url} className={i > 0 ? "border-t" : ""} style={{ borderColor: DESK.border }}>
							<button type="button" onClick={() => onOpen(a)} className={`flex w-full items-center gap-3 rounded-md py-2 text-left transition-colors hover:bg-white/[0.03] ${deskFocus}`}>
								<Thumb article={a} className="h-[52px] w-[84px] shrink-0 rounded-[8px]" />
								<span className="min-w-0 flex-1">
									<span className="block text-[11.5px]" style={{ color: DESK.muted }}>{typeLabel(a)}{ago(a) ? ` · ${ago(a)}` : ""}</span>
									<span className="line-clamp-2 block text-[13.5px] font-medium leading-[19px] text-white">{a.headline}</span>
								</span>
								<ChevronRight className="h-[16px] w-[16px] shrink-0" style={{ color: DESK.faint }} aria-hidden="true" />
							</button>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}

/** Market mood as a half-dial: green (bullish) on the left through grey to red on the right, the needle at its score. */
function MoodDial({ mood }: { mood: string | undefined }) {
	const score = moodScore(mood);
	const angle = score === null ? null : Math.PI * (score / 100);
	const nx = angle === null ? 0 : 50 - 34 * Math.cos(angle);
	const ny = angle === null ? 0 : 50 - 34 * Math.sin(angle);
	return (
		<svg viewBox="0 0 100 56" className="h-[64px] w-[114px] shrink-0" aria-hidden="true">
			<defs>
				<linearGradient id="news-mood" x1="0" x2="1" y1="0" y2="0">
					<stop offset="0%" stopColor="#2FD08A" /><stop offset="50%" stopColor="#D8CFCF" /><stop offset="100%" stopColor="#FF5A6A" />
				</linearGradient>
			</defs>
			<path d="M8 50 A42 42 0 0 1 92 50" fill="none" stroke="url(#news-mood)" strokeWidth="9" strokeLinecap="round" opacity={score === null ? 0.35 : 1} />
			{angle !== null && <><line x1="50" y1="50" x2={nx} y2={ny} stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /><circle cx="50" cy="50" r="3.6" fill="#fff" /></>}
		</svg>
	);
}

/**
 * News on desktop, from the user's design: the top story, For You and Markets on the left; market mood, why it matters to
 * your STAK, topics to watch and Ask STAK AI on the right. Same stories, brief and in-app article pages as the phone.
 */
export function NewsDesktop() {
	const navigate = useNavigate();
	const { brief, market, forYou, forYouLoading, forYouFailed, retryForYou, marketArticles, briefItems, aiBrief, briefLoading, mood, openStory } = useNewsFeed();
	const { swipedBrands } = useMyStakData();
	const { data: brands } = useBrandsList();
	const [query, setQuery] = useState("");
	// The rail starts level with the search box (which sits at the foot of the title block), not with the title.
	const searchRef = useRef<HTMLLabelElement>(null);
	const [railOffset, setRailOffset] = useState(0);
	useLayoutEffect(() => {
		const el = searchRef.current;
		if (!el) return;
		const header = el.parentElement;
		if (!header) return;
		// When the search wraps under the title (narrow windows) the rail is stacked anyway, so the offset only
		// applies from xl, where the two sit side by side.
		const measure = () => setRailOffset(Math.max(0, Math.round(el.getBoundingClientRect().top - header.getBoundingClientRect().top)));
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(header);
		return () => ro.disconnect();
	}, []);

	const terms = useMemo(() => expandQuery(query, brands ?? []), [query, brands]);
	const searching = query.trim().length > 0;
	const lead = briefItems.find((b) => matchesBrief(b, query, terms));
	const leadArticle = lead?.url ? [...marketArticles, ...forYou].find((a) => a.url === lead.url) : undefined;
	const heroImage = leadArticle?.image || marketArticles.find((a) => a.image)?.image || FALLBACK_HERO;
	const forYouShown = forYou.filter((a) => matchesLive(a, query, terms));
	const marketsShown = marketArticles.filter((a) => matchesLive(a, query, terms));
	const status = mood ? moodStatus(mood, "settled") : null;
	const impact = brief.data?.personalizedImpact?.trim();
	const watch = brief.data?.watchItems ?? [];
	const updatedMs = brief.data?.generatedAt ? Date.parse(brief.data.generatedAt) : market.dataUpdatedAt || null;
	// Stable between renders, so typing in search doesn't redraw the Ask STAK AI panel.
	const contextQuestion = brief.data?.contextQuestion?.trim();
	const suggestions = useMemo(() => [contextQuestion, "What does today mean for my STAK?", "Which sectors could benefit?"].filter((s): s is string => !!s).slice(0, 3), [contextQuestion]);
	const topicIcons: LucideIcon[] = [TrendingUp, BarChart3, Eye];

	function readLead() {
		if (leadArticle) openStory(leadArticle);
		else if (lead?.url) window.open(lead.url, "_blank", "noopener,noreferrer");
		else if (aiBrief) navigate({ to: "/feed/daily-brief" });
	}


	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-10 pt-5">

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
					<div className="flex min-w-0 flex-col gap-5">
						<header className="flex flex-wrap items-end justify-between gap-4">
							<div>
								<h1 className="font-heading text-[30px] font-semibold leading-[38px] text-white">News</h1>
								<p className="text-[14px]" style={{ color: DESK.muted }}>Market updates and stories curated for your STAK.</p>
								<div className="mt-2 flex flex-wrap gap-2 text-[12px]" style={{ color: DESK.body }}>
									<span className="flex items-center gap-[6px] rounded-full px-3 py-[4px]" style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }}>
										<CalendarDays className="h-[13px] w-[13px]" aria-hidden="true" />
										{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })}
									</span>
									{updatedMs ? (
										<span className="flex items-center gap-[6px] rounded-full px-3 py-[4px]" style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }}>
											<Clock className="h-[13px] w-[13px]" aria-hidden="true" /> Updated {newsAge(Math.floor(updatedMs / 1000))} ago
										</span>
									) : null}
								</div>
							</div>
							<label ref={searchRef} className="relative w-full max-w-[300px]">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2" style={{ color: DESK.muted }} aria-hidden="true" />
								<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search news" aria-label="Search news" className={`h-[38px] w-full rounded-[10px] pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-[#819ABB] ${deskFocus}`} style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }} />
							</label>
						</header>

						{/* Top story: the AI brief (or the lead story), beside a market photo. */}
						{briefLoading ? (
							<SkeletonBar width="100%" height={300} className="rounded-[16px]" />
						) : lead ? (
							<section className="grid overflow-hidden rounded-[16px] md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]" style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }} aria-label="Top story">
								<div className="flex flex-col gap-3 p-6">
									<Kicker>Top story</Kicker>
									<h2 className="line-clamp-4 font-heading text-[24px] font-semibold leading-[31px] text-white">{lead.title}</h2>
									{lead.body && <p className="line-clamp-4 text-[13.5px] leading-[21px]" style={{ color: DESK.body }}>{lead.body}</p>}
									<p className="text-[12px]" style={{ color: DESK.muted }}>{lead.source}</p>
									<DeskButton onClick={readLead} className="mt-1 self-start">
										{lead.url ? "Read full story" : "Read full brief"} <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
									</DeskButton>
								</div>
								<div className="relative hidden min-h-[240px] md:block">
									<img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.src = FALLBACK_HERO; }} />
									<div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #171D2C 0%, rgba(23,29,44,0.15) 40%, transparent 100%)" }} aria-hidden="true" />
								</div>
							</section>
						) : !searching ? (
							<Panel className="gap-2 p-6">
								<p className="text-[15px] text-white">Today's brief isn't ready yet</p>
								<p className="text-[13px]" style={{ color: DESK.muted }}>{market.isError ? "Market news isn't loading right now. Try again in a moment." : "Check back shortly for today's market read."}</p>
							</Panel>
						) : null}

						<StoryList icon={Star} title="For You" articles={forYouShown} loading={forYouLoading} empty={forYouFailed ? "Couldn't load stories about your saved companies." : searching ? "No stories about your saved companies match." : swipedBrands.length ? "No new stories about your saved companies yet." : "Save companies in Discover and their news shows up here."} onRetry={forYouFailed ? retryForYou : undefined} onOpen={openStory} />
						<StoryList icon={Newspaper} title="Markets" articles={marketsShown} loading={market.isPending} empty={searching ? "No market stories match." : "No market stories right now."} onOpen={openStory} />
					</div>

					<aside className="flex min-w-0 flex-col gap-5 xl:mt-[var(--rail-offset)]" style={{ ["--rail-offset" as string]: `${railOffset}px` }} aria-label="Today in brief">
						<Panel label="Market mood" className="gap-3 p-5">
							<PanelHeader icon={Gauge} title="Market Mood" />
							{briefLoading ? <SkeletonBar width="100%" height={64} /> : (
								<div className="flex items-center gap-4">
									<MoodDial mood={mood} />
									<div className="min-w-0">
										<p className="font-heading text-[17px] font-semibold" style={{ color: status ? moodColor(mood) : DESK.muted }}>{status ? status.lead : "Mood unavailable"}</p>
										<p className="text-[12.5px] leading-[18px]" style={{ color: DESK.body }}>{brief.data?.moodExplanation?.trim() || "Today's read on the market isn't available."}</p>
									</div>
								</div>
							)}
						</Panel>

						{(impact || swipedBrands.length > 0) && (
							<Panel label="Why this matters to your STAK" className="gap-3 p-5">
								<PanelHeader icon={Sparkles} title="Why this matters to your STAK" />
								<p className="text-[13px] leading-[20px]" style={{ color: DESK.body }}>{impact || (briefLoading ? "Reading today's news against your saves…" : "Today's read on your STAK isn't available.")}</p>
								{swipedBrands.length > 0 && (
									<div className="flex flex-wrap gap-2">
										{swipedBrands.slice(-5).reverse().map((b) => (
											<button key={b.id} type="button" onClick={() => navigate({ to: "/stock/$symbol", params: { symbol: b.ticker } })} className={`rounded-full px-3 py-[4px] text-[12px] font-medium transition-opacity hover:opacity-80 ${deskFocus}`} style={{ background: DESK.cyanSoft, color: DESK.cyan, border: `1px solid ${DESK.borderStrong}` }}>
												{b.ticker}
											</button>
										))}
									</div>
								)}
							</Panel>
						)}

						{watch.length > 0 && (
							<Panel label="Topics to watch" className="gap-2 p-5">
								<PanelHeader icon={Eye} title="Topics to watch" />
								<ul className="flex flex-col">
									{watch.slice(0, 3).map((w, i) => {
										const Icon = topicIcons[i % topicIcons.length]!;
										return (
											<li key={w.label} className={i > 0 ? "border-t" : ""} style={{ borderColor: DESK.border }}>
												<button type="button" onClick={() => navigate({ to: "/feed/daily-brief" })} className={`flex w-full items-center gap-3 rounded-md py-3 text-left transition-colors hover:bg-white/[0.03] ${deskFocus}`}>
													<span className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[8px]" style={{ background: DESK.cyanSoft }}><Icon className="h-[15px] w-[15px]" style={{ color: DESK.cyan }} aria-hidden="true" /></span>
													<span className="min-w-0 flex-1">
														<span className="block text-[13px] font-semibold text-white">{w.label}</span>
														<span className="line-clamp-2 block text-[12px] leading-[17px]" style={{ color: DESK.muted }}>{w.body}</span>
													</span>
													<ChevronRight className="h-[15px] w-[15px] shrink-0" style={{ color: DESK.faint }} aria-hidden="true" />
												</button>
											</li>
										);
									})}
								</ul>
							</Panel>
						)}

						<AskStakAi suggestions={suggestions} />
					</aside>
				</div>
			</div>
		</div>
	);
}
