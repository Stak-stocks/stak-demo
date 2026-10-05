import { useEffect, useState } from "react";
import type { NewsArticle } from "@stak/shared";
import type { DailyBriefResponse } from "@/lib/api";
import { moodColor, moodScore, moodStatus } from "@/lib/marketMood";
import { newsAge, summaryBeyondHeadline } from "@/lib/newsText";
import type { StoredArticle } from "@/lib/openedArticle";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing, sheetCard } from "@/components/phone/phone";
import { HOME } from "@/components/home/MarketMoodCard";

const INK = "#0E162B";
const NEWS_HEADER = "#D3D3D3";

/** One Today's Brief card: an AI brief or a top news story. */
export interface BriefItem {
	title: string;
	body: string;
	source: string;
	url?: string;
}

/** Android's sourceBriefs: the AI brief (and its personal read) first, then live stories, four cards at most. */
export function sourceBriefs(brief: DailyBriefResponse | undefined, news: NewsArticle[]): BriefItem[] {
	const stories: BriefItem[] = news.map((a) => ({
		title: a.headline,
		body: a.explanation?.trim() ? a.explanation : summaryBeyondHeadline(a.headline, a.summary) ?? "",
		source: `${a.source} · ${newsAge(a.datetime)}`,
		url: a.url,
	}));
	const moodExplanation = brief?.moodExplanation?.trim() ?? "";
	const plainEnglish = brief?.plainEnglish?.trim() ?? "";
	if (moodExplanation || plainEnglish) {
		const ai: BriefItem[] = [];
		const source = `STAK AI · ${brief?.dayLabel || "Today's"} Brief`;
		if (moodExplanation && plainEnglish) ai.push({ title: moodExplanation, body: plainEnglish, source });
		const impact = brief?.personalizedImpact?.trim();
		if (impact) ai.push({ title: "What this means for you", body: impact, source });
		return [...ai, ...stories].slice(0, 4);
	}
	return stories.slice(0, 4);
}

/** The small mood gauge on the News tab: a track, an arc in the mood's colour up to its score, and a needle. */
function MiniGauge({ mood }: { mood: string }) {
	const fraction = (moodScore(mood) ?? 50) / 100;
	const r = 20.6;
	const theta = (1 - fraction) * Math.PI;
	const pt = (len: number) => `${21 + len * Math.cos(theta)} ${22 - len * Math.sin(theta)}`;
	return (
		<svg viewBox="0 0 42 22" style={{ width: cu(42), height: cu(22) }} fill="none" aria-hidden="true">
			<path d={`M0.4 22A${r} ${r} 0 0 1 41.6 22`} stroke={DISC.divider} strokeWidth="2.8" />
			{fraction > 0 && <path d={`M0.4 22A${r} ${r} 0 0 1 ${pt(r)}`} stroke={moodColor(mood)} strokeWidth="2.8" strokeLinecap="round" />}
			<line x1="21" y1="22" x2={pt(0.78 * r).split(" ")[0]} y2={pt(0.78 * r).split(" ")[1]} stroke="#fff" strokeOpacity="0.9" strokeWidth="1.3" strokeLinecap="round" />
			<circle cx="21" cy="22" r="1.5" fill="#fff" fillOpacity="0.9" />
		</svg>
	);
}

/** "Market Mood" mini row, shown when the mood is known and nothing is being searched. */
export function MoodMiniRow({ mood }: { mood: string }) {
	const status = moodStatus(mood, "settled");
	return (
		<div className="flex items-center" style={{ borderRadius: cu(12), background: HOME.cardBg, padding: `${cu(12)} ${cu(14)}` }}>
			<div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
				<p style={{ font: f(600, 13, 16, "heading"), color: "#fff" }}>Market Mood</p>
				<p style={{ font: f(400, 11, 14), color: moodColor(mood) }}>{status.lead}</p>
			</div>
			<MiniGauge mood={mood} />
		</div>
	);
}

const brief = { display: "flex", flexDirection: "column", borderRadius: cu(18), background: DISC.teal } as const;

/** The teal Today's Brief card. The whole card is the tap target; the full text shows (no clamp). */
export function BriefCardView({ item, onOpen, opensPage }: { item: BriefItem; onOpen: () => void; opensPage: boolean }) {
	const tappable = !!item.url || opensPage;
	const Wrapper = tappable ? "button" : "div";
	return (
		<Wrapper
			{...(tappable ? { type: "button" as const, onClick: onOpen } : {})}
			className={`w-full text-left ${tappable ? PRESS : ""}`}
			style={{ ...brief, gap: cu(9), padding: `${cu(18)} ${cu(18)} ${cu(16)}`, ...focusRing }}
		>
			<span style={{ font: f(500, 10, 13), letterSpacing: cu(0.6), color: INK }}>TODAY’S BRIEF</span>
			<span style={{ font: f(600, 19, 25, "heading"), color: INK }}>{item.title}</span>
			{item.body && <span style={{ font: f(400, 12, 17), color: INK }}>{item.body}</span>}
			<span className="flex items-center" style={{ height: cu(21), paddingTop: cu(4) }}>
				<span style={{ font: f(400, 11, 14), color: INK, opacity: 0.6 }}>{item.source}</span>
				<span className="flex-1" />
				{tappable && (
					<span className="flex items-center" style={{ gap: cu(4), color: INK }}>
						<span style={{ font: f(500, 12) }}>Read</span>
						<span style={{ font: f(500, 13) }} aria-hidden="true">›</span>
					</span>
				)}
			</span>
		</Wrapper>
	);
}

/** Pulsing bars where the brief will be. */
export function BriefLoadingCard() {
	return (
		<div style={{ ...brief, gap: cu(12), padding: `${cu(18)} ${cu(18)} ${cu(22)}` }} aria-busy="true" aria-label="Loading today's brief">
			<span style={{ font: f(500, 10, 13), letterSpacing: cu(0.6), color: INK }}>TODAY’S BRIEF</span>
			{[[78, 14], [95, 10], [60, 10]].map(([w, h], i) => (
				<div key={i} className="bar-pulse-brief" style={{ width: `${w}%`, height: cu(h), borderRadius: cu(4), background: INK, animation: "bar-pulse-brief 800ms cubic-bezier(0.4,0,0.2,1) infinite alternate" }} />
			))}
		</div>
	);
}

export function BriefUnavailableCard({ newsFailed }: { newsFailed: boolean }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: cu(6), ...sheetCard(18), padding: cu(18) }}>
			<p style={{ font: f(600, 15, undefined, "heading"), color: "#fff" }}>{newsFailed ? "Market news isn't loading" : "Today's brief isn't available"}</p>
			<p style={{ font: f(400, 13, 19), color: DISC.muted }}>{newsFailed ? "Leave News and come back to try again." : "There's no market news to show right now."}</p>
		</div>
	);
}

/** One story row: thumbnail (only when there is an image), "source · age" and the headline. */
export function NewsRow({ article, onOpen }: { article: StoredArticle; onOpen: (article: StoredArticle) => void }) {
	const [imageFailed, setImageFailed] = useState(false);
	useEffect(() => setImageFailed(false), [article.image]);
	return (
		<button
			type="button"
			onClick={() => onOpen(article)}
			className={`flex w-full items-center text-left ${PRESS}`}
			style={{ gap: cu(12), ...sheetCard(14), padding: cu(12), ...focusRing }}
		>
			{article.image && !imageFailed && (
				<img src={article.image} alt="" loading="lazy" onError={() => setImageFailed(true)} className="shrink-0 object-cover" style={{ width: cu(60), height: cu(60), borderRadius: cu(10) }} />
			)}
			<span className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(5) }}>
				<span className="flex items-center" style={{ height: cu(16), font: f(400, 11, 14), color: DISC.muted }}>{article.source} · {newsAge(article.datetime)}</span>
				<span style={{ font: f(300, 12, 19, "heading"), color: "#fff" }}>{article.headline}</span>
			</span>
		</button>
	);
}

export function NewsSection({ title, articles, onOpen }: { title: string; articles: StoredArticle[]; onOpen: (a: StoredArticle) => void }) {
	return (
		<section style={{ display: "flex", flexDirection: "column", gap: cu(10) }} aria-label={title}>
			<h2 style={{ paddingBottom: cu(2), font: f(600, 16, 20, "heading"), color: NEWS_HEADER }}>{title}</h2>
			{articles.map((a) => <NewsRow key={a.url} article={a} onOpen={onOpen} />)}
		</section>
	);
}
