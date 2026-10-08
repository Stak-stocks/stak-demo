import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getMarketNews, getStockData } from "@/lib/api";
import { useAccount } from "@/context/AccountContext";
import { useBrandsList } from "@/hooks/useBrandsList";
import { STAK_CAPACITY } from "@/lib/constants";
import { readRememberedArticle, rememberArticles, type StoredArticle } from "@/lib/openedArticle";
import { summaryBeyondHeadline } from "@/lib/newsText";
import { DISC, cu, sessionWord } from "@/components/discover/discoverTheme";
import { BackCircle, PRESS, PhonePage, f, focusRing, sheetCard } from "@/components/phone/phone";
import { ArticleDesktop } from "@/components/news/ArticleDesktop";
import { useIsMobile } from "@/hooks/use-mobile";
import { AskAiCard } from "@/components/stakAi/StakAiThread";
import { articleContext, useOpenStakAi } from "@/components/stakAi/open";

export const Route = createFileRoute("/feed_/article")({
	component: ArticlePage,
	validateSearch: (search: Record<string, unknown>): { u?: string } => ({
		u: typeof search.u === "string" && search.u ? search.u : undefined,
	}),
});

const CTA_GRADIENT = DISC.cta;
const Divider = () => <div style={{ height: cu(1), background: DISC.divider }} />;

const Label = ({ children }: { children: ReactNode }) => (
	<p style={{ font: f(600, 11, 14), letterSpacing: cu(0.8), color: DISC.muted }}>{children}</p>
);

/** Bullets for "The gist": the why-it-matters text split on newlines (bullet marks stripped), else on sentences; three at most. */
export function parseGistBullets(text: string | undefined): string[] {
	const raw = (text ?? "").trim();
	if (!raw) return [];
	const lines = raw.split("\n").map((l) => l.replace(/^[\s•\-*·]+/, "").trim()).filter((l) => l.length > 10);
	if (lines.length >= 2) return lines.slice(0, 3);
	return raw.split(". ").map((s) => s.trim()).filter((s) => s.length > 10).slice(0, 3);
}

/** The body text with one sentence lifted into a pull-quote, or all of it as one paragraph. */
export function splitWithPullquote(text: string): { before: string; quote: string; after: string } | null {
	const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
	if (sentences.length < 3) return null;
	const pick = [2, 1, 3].find((i) => sentences[i] && sentences[i].length >= 40 && sentences[i].length <= 130);
	if (pick === undefined) return null;
	return {
		before: sentences.slice(0, pick).join(" "),
		quote: sentences[pick].replace(/[.!?]+$/, ""),
		after: sentences.slice(pick + 1).join(" "),
	};
}

function categoryChip(article: StoredArticle): string {
	switch (article.type) {
		case "company": return article.ticker ? `${article.ticker} · Stock` : "Stock";
		case "sector": return "Sector";
		case "macro": return "Markets";
		default: return "News";
	}
}

function Chip({ children }: { children: ReactNode }) {
	return (
		<span style={{ borderRadius: cu(12), background: "rgba(26,35,51,0.8)", border: `${cu(0.5)} solid rgba(255,255,255,0.25)`, padding: `${cu(5)} ${cu(11)}`, font: f(500, 11, 14), color: "#fff" }}>
			{children}
		</span>
	);
}

function StatCell({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex-1" style={{ padding: `${cu(8)} 0`, display: "flex", flexDirection: "column", gap: cu(3) }}>
			<span style={{ font: f(400, 11, 14), color: DISC.faint }}>{label}</span>
			<span style={{ font: f(500, 14, 18), color: "#fff" }}>{value}</span>
		</div>
	);
}

/** Android's live story page: hero, headline, byline, Add to STAK, the stock, the gist, the story, its source, key stats and what to read next. */
function ArticlePage() {
	const { u } = Route.useSearch();
	const navigate = useNavigate();
	const openStakAi = useOpenStakAi();
	const isMobile = useIsMobile();
	const { account, saveToStak } = useAccount();
	const { data: brands } = useBrandsList();
	const [imageFailed, setImageFailed] = useState(false);
	const [fullNotice, setFullNotice] = useState(false);
	const [addedHere, setAddedHere] = useState(false);

	const article: StoredArticle | null = useMemo(() => (u ? readRememberedArticle(u) : null), [u]);
	// The page only exists for a story a row opened; without one (a reload, a pasted link) it goes back to News.
	useEffect(() => { if (!article) navigate({ to: "/feed", replace: true }); }, [article, navigate]);
	useEffect(() => setImageFailed(false), [article?.image]);
	useEffect(() => {
		if (!fullNotice) return;
		const t = setTimeout(() => setFullNotice(false), 3000);
		return () => clearTimeout(t);
	}, [fullNotice]);

	const ticker = article?.ticker?.trim() || undefined;
	const { data: stock } = useQuery({
		queryKey: ["stock", ticker],
		queryFn: () => getStockData(ticker!),
		enabled: !!ticker,
		staleTime: 60 * 1000,
		retry: 1,
	});
	const { data: market } = useQuery({ queryKey: ["market-news"], queryFn: getMarketNews, staleTime: 60 * 1000, retry: 1 });

	const brand = ticker ? (brands ?? []).find((b) => b.ticker.toUpperCase() === ticker.toUpperCase()) : undefined;
	const held = !!brand && (account?.stakBrandIds ?? []).includes(brand.id);

	// The two stories after this one in the Markets feed (wrapping round); none if it isn't a Markets story.
	const readNext = useMemo(() => {
		const list = market?.articles ?? [];
		const at = list.findIndex((a) => a.url === u);
		if (at < 0) return [];
		const out: StoredArticle[] = [];
		for (let step = 1; step < list.length && out.length < 2; step++) {
			const next = list[(at + step) % list.length];
			if (next.headline?.trim() && next.url !== u) out.push(next);
		}
		return out;
	}, [market, u]);

	if (!article) return <PhonePage><div /></PhonePage>;

	const quote = stock?.quote ?? null;
	const metrics = stock?.metrics;
	const price = quote && quote.price > 0 ? quote.price : null;
	const change = quote?.changePercent ?? null;
	const up = (quote?.change ?? 0) >= 0;
	const subtitle = summaryBeyondHeadline(article.headline, article.summary);
	const gist = parseGistBullets(article.whyItMatters);
	const body = article.explanation?.trim() ? splitWithPullquote(article.explanation) ?? { before: article.explanation, quote: "", after: "" } : null;
	const date = article.datetime > 0 ? new Date(article.datetime * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
	const sentimentTag = article.sentiment === "bullish" ? "Bullish signal" : article.sentiment === "bearish" ? "Bearish signal" : null;

	async function addToStak() {
		if (!brand) return;
		if ((account?.stakBrandIds ?? []).length >= STAK_CAPACITY) { setFullNotice(true); return; }
		setAddedHere(true);
		try {
			await saveToStak(brand.id, price);
		} catch {
			setAddedHere(false);
			toast.error("Couldn't add it. Try again.");
		}
	}

	async function share() {
		const url = article!.url;
		try {
			if (navigator.share) await navigator.share({ url });
			else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
		} catch { /* dismissed */ }
	}

	function openStory(next: StoredArticle) {
		rememberArticles([next]);
		navigate({ to: "/feed/article", search: { u: next.url } });
	}

	if (!isMobile) {
		return (
			<ArticleDesktop
				article={article}
				subtitle={subtitle}
				gist={gist}
				body={body}
				date={date}
				categoryLabel={categoryChip(article)}
				sentimentTag={sentimentTag}
				ticker={ticker}
				brand={brand}
				inStak={held || addedHere}
				fullNotice={fullNotice}
				price={price}
				changePct={change}
				changeUsd={quote?.change ?? null}
				metrics={metrics}
				readNext={readNext}
				onAdd={() => { void addToStak(); }}
				onShare={() => { void share(); }}
				onOpenStory={openStory}
				onBack={() => navigate({ to: "/feed" })}
				onStock={(t) => navigate({ to: "/stock/$symbol", params: { symbol: t } })}
			/>
		);
	}

	return (
		<PhonePage>
			<div className="relative" style={{ height: cu(240) }}>
				{article.image && !imageFailed ? (
					<img src={article.image} alt="" onError={() => setImageFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
				) : (
					<div className="absolute inset-0" style={{ background: "#131926" }} />
				)}
				<div className="absolute inset-x-0 top-0" style={{ height: cu(100), background: "linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0))" }} />
				<div className="absolute inset-x-0 bottom-0" style={{ height: cu(80), background: `linear-gradient(to bottom, rgba(10,16,32,0), ${DISC.pageBg})` }} />
				<div className="absolute inset-x-0 top-0 flex items-center justify-between" style={{ padding: `${cu(10)} ${cu(18)} 0 ${cu(16)}` }}>
					<BackCircle onClick={() => navigate({ to: "/feed" })} label="Back to News" />
					<button
						type="button"
						onClick={share}
						aria-label="Share"
						className={`grid place-items-center rounded-full ${PRESS}`}
						style={{ width: cu(40), height: cu(40), background: "rgba(25,34,56,0.5)", ...focusRing }}
					>
						<img src="/app/ic_news_share.png" alt="" style={{ width: cu(20), height: cu(20) }} draggable={false} />
					</button>
				</div>
				<div className="absolute" style={{ left: cu(16), bottom: cu(14) }}><Chip>{categoryChip(article)}</Chip></div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: cu(16), padding: `0 ${cu(20)} ${cu(32)}` }}>
				<h1 style={{ font: f(600, 20, 30, "heading"), color: "#fff" }}>{article.headline}</h1>
				{subtitle && <p style={{ font: f(400, 14, 22), color: DISC.muted }}>{subtitle}</p>}

				<div className="flex items-center" style={{ gap: cu(8), padding: `${cu(2)} 0` }}>
					<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(24), height: cu(24), background: DISC.avatar, font: f(600, 10, 13, "heading"), color: DISC.badgeInk }}>
						{article.source.slice(0, 1)}
					</span>
					<span style={{ font: f(500, 12, 16), color: "#fff" }}>{article.source}{date ? ` · ${date}` : ""}</span>
				</div>

				{brand && !held && !addedHere && (
					<div>
						<button
							type="button"
							onClick={addToStak}
							className={`flex items-center justify-center ${PRESS}`}
							style={{ width: cu(150), height: cu(52), borderRadius: cu(6), gap: cu(8), background: CTA_GRADIENT, border: `${cu(0.36)} solid rgba(101,158,173,0.5)`, font: f(500, 14, 21), color: DISC.pageBg, ...focusRing }}
						>
							Add to STAK
							<svg viewBox="0 0 14 14" style={{ width: cu(14), height: cu(14) }} fill="currentColor" aria-hidden="true">
								<path d="M12.25 7C12.25 7.116 12.2039 7.2273 12.1219 7.3094C12.0398 7.3914 11.9285 7.4375 11.8125 7.4375H7.4375V11.8125C7.4375 11.9285 7.3914 12.0398 7.3094 12.1219C7.2273 12.2039 7.116 12.25 7 12.25C6.884 12.25 6.7727 12.2039 6.6906 12.1219C6.6086 12.0398 6.5625 11.9285 6.5625 11.8125V7.4375H2.1875C2.0715 7.4375 1.9602 7.3914 1.8781 7.3094C1.7961 7.2273 1.75 7.116 1.75 7C1.75 6.884 1.7961 6.7727 1.8781 6.6906C1.9602 6.6086 2.0715 6.5625 2.1875 6.5625H6.5625V2.1875C6.5625 2.0715 6.6086 1.9602 6.6906 1.8781C6.7727 1.7961 6.884 1.75 7 1.75C7.116 1.75 7.2273 1.7961 7.3094 1.8781C7.3914 1.9602 7.4375 2.0715 7.4375 2.1875V6.5625H11.8125C11.9285 6.5625 12.0398 6.6086 12.1219 6.6906C12.2039 6.7727 12.25 6.884 12.25 7Z" />
							</svg>
						</button>
						{fullNotice && <p role="status" style={{ marginTop: cu(6), font: f(400, 11), color: DISC.muted }}>Your STAK is full — remove a stock to save another</p>}
					</div>
				)}

				{ticker && (
					<div style={{ display: "flex", flexDirection: "column", gap: cu(13), ...sheetCard(16), padding: `${cu(16)} ${cu(16)} ${cu(14)}` }}>
						<div className="flex items-center" style={{ gap: cu(12) }}>
							<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(44), height: cu(44), background: DISC.avatar, font: f(600, 18, 23, "heading"), color: DISC.badgeInk }}>
								{ticker.slice(0, 1)}
							</span>
							<div style={{ display: "flex", flexDirection: "column", gap: cu(3) }}>
								<span style={{ font: f(600, 15, 19, "heading"), color: "#fff" }}>{brand?.name ?? ticker}</span>
								<span style={{ font: f(400, 12, 16), color: DISC.muted }}>{ticker}</span>
							</div>
						</div>
						<div className="flex items-end">
							<div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(3) }}>
								<span style={{ font: f(600, 26, 33, "heading"), color: "#fff" }}>{price != null ? `$${price.toFixed(2)}` : "--"}</span>
								{change != null && (
									<span style={{ font: f(500, 13, 17), color: up ? DISC.green : "#FF5A6A" }}>{change >= 0 ? "+" : ""}{change.toFixed(2)}% {sessionWord()}</span>
								)}
							</div>
							{quote && <img src={up ? "/app/news_sparkline.png" : "/app/news_sparkline_down.png"} alt="" style={{ width: cu(110), height: cu(40) }} draggable={false} />}
						</div>
					</div>
				)}

				<Divider />

				{gist.length > 0 && (
					<section style={{ display: "flex", flexDirection: "column", gap: cu(12), ...sheetCard(14), padding: cu(16) }} aria-label="The gist">
						<div className="flex items-center" style={{ gap: cu(8) }}>
							<img src="/app/ic_gist_sparkle.png" alt="" style={{ width: cu(18), height: cu(18) }} draggable={false} />
							<h2 style={{ font: f(600, 14, 18, "heading"), color: "#fff" }}>The gist</h2>
						</div>
						{gist.map((b, i) => (
							<div key={i} className="flex items-start" style={{ gap: cu(10) }}>
								<img src="/app/ic_gist_check.png" alt="" style={{ width: cu(16), height: cu(16), marginTop: cu(1.5) }} draggable={false} />
								<p style={{ font: f(400, 13, 19), color: DISC.body }}>{b}</p>
							</div>
						))}
					</section>
				)}

				{body && (
					<div style={{ display: "flex", flexDirection: "column", gap: cu(16) }}>
						{body.before && <p style={{ font: f(400, 14, 23), color: DISC.body }}>{body.before}</p>}
						{body.quote && (
							<blockquote className="flex" style={{ gap: cu(12) }}>
								<span className="shrink-0 self-stretch" style={{ width: cu(3), minHeight: cu(56), borderRadius: cu(2), background: DISC.teal }} />
								<p style={{ font: f(400, 15, 24), fontStyle: "italic", color: "#fff" }}>“{body.quote}”</p>
							</blockquote>
						)}
						{body.after && <p style={{ font: f(400, 14, 23), color: DISC.body }}>{body.after}</p>}
					</div>
				)}

				{article.url && (
					<a
						href={article.url}
						target="_blank"
						rel="noopener noreferrer"
						className={`flex w-fit items-center ${PRESS}`}
						style={{ gap: cu(6), padding: `${cu(4)} 0`, borderRadius: cu(6), ...focusRing }}
					>
						<span style={{ font: f(500, 13, 18), color: DISC.muted }}>Source</span>
						<svg viewBox="0 0 16 16" style={{ width: cu(14), height: cu(14) }} fill="none" aria-hidden="true">
							<path d="M3.33333 8H12.6667M8 12.6667L12.6667 8L8 3.33333" stroke={DISC.muted} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						<span style={{ font: f(500, 13, 18), color: DISC.teal }}>{article.source}</span>
					</a>
				)}

				{ticker && (quote || metrics?.peRatio != null || metrics?.marketCap) && (
					<>
						<Divider />
						<section style={{ display: "flex", flexDirection: "column", gap: cu(4) }} aria-label="Key stats">
							<div className="flex items-center justify-between" style={{ paddingBottom: cu(4) }}>
								<Label>KEY STATS</Label>
								<span style={{ font: f(600, 11, 14), letterSpacing: cu(0.6), color: DISC.teal }}>{ticker}</span>
							</div>
							<div className="flex" style={{ gap: cu(12) }}>
								<StatCell label="Market cap" value={metrics?.marketCap ?? "--"} />
								<StatCell label="P/E ratio" value={metrics?.peRatio != null ? metrics.peRatio.toFixed(1) : "--"} />
							</div>
							<div className="flex" style={{ gap: cu(12) }}>
								<StatCell label="Day change" value={quote ? `${quote.change >= 0 ? "+" : "-"}$${Math.abs(quote.change).toFixed(2)}` : "--"} />
								<StatCell label="Day change %" value={quote ? `${quote.changePercent >= 0 ? "+" : "-"}${Math.abs(quote.changePercent).toFixed(2)}%` : "--"} />
							</div>
						</section>
					</>
				)}

				{(ticker || sentimentTag) && (
					<div className="flex flex-wrap" style={{ gap: cu(8) }}>
						{ticker && <Chip>{ticker}</Chip>}
						{sentimentTag && <Chip>{sentimentTag}</Chip>}
					</div>
				)}

				{/* STAK AI (2026-10-01): questions about this story, with the story as context. */}
				<AskAiCard variant="phone" title="Ask STAK AI about this" subtitle="Plain-English answers, starting from this story." onOpen={() => openStakAi(articleContext(article))} />

				{readNext.length > 0 && (
					<>
						<Divider />
						<section style={{ display: "flex", flexDirection: "column", gap: cu(12) }} aria-label="Read next">
							<Label>READ NEXT</Label>
							{readNext.map((a) => (
								<button
									key={a.url}
									type="button"
									onClick={() => openStory(a)}
									className={`flex w-full items-center text-left ${PRESS}`}
									style={{ gap: cu(12), ...sheetCard(12), padding: cu(12), ...focusRing }}
								>
									{a.image ? (
										<img src={a.image} alt="" loading="lazy" className="shrink-0 object-cover" style={{ width: cu(72), height: cu(54), borderRadius: cu(8) }} />
									) : (
										<div className="shrink-0" style={{ width: cu(72), height: cu(54), borderRadius: cu(8), background: DISC.avatar }} />
									)}
									<span className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(6) }}>
										<span className="line-clamp-2" style={{ font: f(500, 13, 19), color: "#fff" }}>{a.headline}</span>
										<span style={{ font: f(400, 11, 14), color: DISC.muted }}>{a.source}</span>
									</span>
								</button>
							))}
						</section>
					</>
				)}
			</div>
		</PhonePage>
	);
}
