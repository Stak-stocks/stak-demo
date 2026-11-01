import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBrandsList } from "@/hooks/useBrandsList";
import { useNewsFeed } from "@/hooks/useNewsFeed";
import { useIsMobile } from "@/hooks/use-mobile";
import { expandQuery, matchesBrief, matchesLive } from "@/lib/newsSearch";
import { BriefCardView, BriefLoadingCard, BriefUnavailableCard, MoodMiniRow, NewsSection } from "@/components/news/NewsParts";
import { NewsDesktop } from "@/components/news/NewsDesktop";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { FIELD_EDGE, PRESS, PhonePage, f, focusRing, sheetCard } from "@/components/phone/phone";
import { AskAiHeaderButton } from "@/components/stakAi/open";

export const Route = createFileRoute("/feed")({
	component: FeedRoute,
});

/** Desktop: top story, For You and Markets beside mood, why it matters, topics and Ask STAK AI; the phone keeps Android's feed. */
function FeedRoute() {
	return useIsMobile() ? <FeedPage /> : <NewsDesktop />;
}

/** Android's search glass: 40u circle with a magnifier. */
function SearchGlass({ open, onClick }: { open: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={open ? "Close search" : "Search news"}
			aria-expanded={open}
			className={`grid place-items-center rounded-full ${PRESS}`}
			style={{ width: cu(40), height: cu(40), background: DISC.sheet, ...focusRing }}
		>
			<svg viewBox="0 0 20 20" style={{ width: cu(20), height: cu(20) }} fill="none" aria-hidden="true">
				<circle cx="9.16667" cy="9.16667" r="5.8333" stroke={DISC.muted} strokeWidth="1.7" />
				<path d="M16.6667 16.6667L13.75 13.75" stroke={DISC.muted} strokeWidth="1.7" strokeLinecap="round" />
			</svg>
		</button>
	);
}

function FeedPage() {
	const navigate = useNavigate();
	const { data: brands } = useBrandsList();
	const [searchOpen, setSearchOpen] = useState(false);
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const searching = query.trim().length > 0;

	useEffect(() => { if (searchOpen) inputRef.current?.focus(); }, [searchOpen]);
	function toggleSearch() {
		if (searchOpen) setQuery("");
		setSearchOpen((open) => !open);
	}

	const { market, forYou, marketArticles, briefItems, aiBrief, briefLoading, mood, openStory } = useNewsFeed();

	const terms = useMemo(() => expandQuery(query, brands ?? []), [query, brands]);
	const forYouShown = forYou.filter((a) => matchesLive(a, query, terms));
	const marketsShown = marketArticles.filter((a) => matchesLive(a, query, terms));

	const primaryBrief = briefItems.find((b) => matchesBrief(b, query, terms));
	const noResults = searching && !primaryBrief && forYouShown.length === 0 && marketsShown.length === 0;
	const newsSettled = !market.isPending;
	const showUnavailable = !searching && !briefLoading && newsSettled && !primaryBrief;

	function openBrief(item: { url?: string }) {
		if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
		else if (aiBrief) navigate({ to: "/feed/daily-brief" });
	}

	return (
		<PhonePage>
			<div style={{ display: "flex", flexDirection: "column", gap: cu(22), padding: `${cu(22)} ${cu(20)} ${cu(24)}` }}>
				<header>
					<div className="flex items-center">
						<div style={{ display: "flex", flexDirection: "column", gap: cu(4) }}>
							<h1 style={{ font: f(600, 26, 33, "heading"), color: "#fff" }}>News</h1>
							<p style={{ font: f(400, 13, 17), color: DISC.muted }}>
								{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
							</p>
						</div>
						<div className="flex-1" />
						{/* STAK AI (2026-10-01): beside search, as on Android. */}
						<AskAiHeaderButton size={40} background={DISC.sheet} />
						<div style={{ width: cu(8) }} />
						<SearchGlass open={searchOpen} onClick={toggleSearch} />
					</div>
					{searchOpen && (
						<input
							ref={inputRef}
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => { if (e.key === "Escape") toggleSearch(); }}
							placeholder="Search news"
							aria-label="Search news"
							className="w-full outline-none placeholder:text-[#819ABB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#69B3CA]"
							style={{ marginTop: cu(12), ...sheetCard(12), border: `${cu(1)} solid ${FIELD_EDGE}`, padding: `${cu(13)} ${cu(16)}`, font: f(400, 13), color: "#fff", caretColor: DISC.teal }}
						/>
					)}
				</header>

				{!searching && mood && <MoodMiniRow mood={mood} />}
				{briefLoading && <BriefLoadingCard />}
				{primaryBrief && <BriefCardView item={primaryBrief} opensPage={aiBrief} onOpen={() => openBrief(primaryBrief)} />}
				{showUnavailable && <BriefUnavailableCard newsFailed={market.isError} />}

				{forYouShown.length > 0 && <NewsSection title="For You" articles={forYouShown} onOpen={openStory} />}
				{marketsShown.length > 0 && <NewsSection title="Markets" articles={marketsShown} onOpen={openStory} />}

				{noResults && (
					<div style={{ display: "flex", flexDirection: "column", gap: cu(6), ...sheetCard(14), padding: cu(16) }}>
						<p style={{ font: f(600, 15, undefined, "heading"), color: "#fff" }}>No results for “{query.trim()}”</p>
						<p style={{ font: f(400, 13, 19), color: DISC.muted }}>Try a different keyword — ticker, topic or source.</p>
					</div>
				)}
				{/* Android's trailing empty item adds one more gap before the bottom padding. */}
				<div aria-hidden="true" />
			</div>
		</PhonePage>
	);
}
