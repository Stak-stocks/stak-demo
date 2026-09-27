import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BarChart3, BookmarkCheck, CheckCircle2, ExternalLink, Plus, Share2, Sparkles, Tag } from "lucide-react";
import type { BrandSummary } from "@stak/shared";
import { getStockChart, type LiveMetrics } from "@/lib/api";
import type { StoredArticle } from "@/lib/openedArticle";
import { newsAge } from "@/lib/newsText";
import { BrandLogo } from "@/components/BrandLogo";
import { CARD_ART_FALLBACK } from "@/components/discover/discoverTheme";
import { DESK, DeskButton, Panel, PanelHeader, changeColor, deskFocus, deskPageBg, signedPctLabel } from "@/components/desktop/deskKit";
import { Sparkline } from "@/components/desktop/Sparkline";

export interface ArticleDesktopProps {
	article: StoredArticle;
	subtitle: string | null;
	gist: string[];
	body: { before: string; quote: string; after: string } | null;
	date: string;
	categoryLabel: string;
	sentimentTag: string | null;
	ticker: string | undefined;
	brand: BrandSummary | undefined;
	/** Already in My STAK (or added from this page). */
	inStak: boolean;
	fullNotice: boolean;
	price: number | null;
	changePct: number | null;
	changeUsd: number | null;
	metrics: LiveMetrics | undefined;
	readNext: StoredArticle[];
	onAdd: () => void;
	onShare: () => void;
	onOpenStory: (a: StoredArticle) => void;
	onBack: () => void;
	onStock: (ticker: string) => void;
}

/**
 * A news story on desktop: a reading column (picture, headline, byline, the gist, the story with its pull-quote and
 * source) beside a rail with the company it's about (live price, Add to STAK), its key stats and what to read next.
 * Same story, actions and "Read next" as the phone page.
 */
export function ArticleDesktop(p: ArticleDesktopProps) {
	const { article } = p;
	const [imageFailed, setImageFailed] = useState(false);
	const { data: chart } = useQuery({
		queryKey: ["stock-chart", p.ticker, "1d"],
		queryFn: () => getStockChart(p.ticker!, "1d"),
		enabled: !!p.ticker,
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});
	const line = (chart?.prices ?? []).map((c) => c.close).filter((c) => c > 0);

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-12 pt-5">
				<button type="button" onClick={p.onBack} className={`flex items-center gap-1 self-start rounded-md text-[12.5px] hover:text-white ${deskFocus}`} style={{ color: DESK.muted }}>
					<ArrowLeft className="h-[14px] w-[14px]" aria-hidden="true" /> News
				</button>

				<div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
					<article className="mx-auto flex w-full min-w-0 max-w-[780px] flex-col gap-5">
						<div className="relative h-[340px] overflow-hidden rounded-[18px]" style={{ background: DESK.artBg, border: `1px solid ${DESK.border}` }}>
							{article.image && !imageFailed && <img src={article.image} alt="" onError={() => setImageFailed(true)} className="absolute inset-0 h-full w-full object-cover" />}
							<span className="absolute bottom-4 left-4 rounded-full px-3 py-[5px] text-[12px] font-medium text-white" style={{ background: "rgba(10,16,32,0.8)", border: "1px solid rgba(255,255,255,0.2)" }}>{p.categoryLabel}</span>
						</div>

						<h1 className="font-heading text-[32px] font-semibold leading-[42px] text-white">{article.headline}</h1>
						{p.subtitle && <p className="text-[16px] leading-[25px]" style={{ color: DESK.muted }}>{p.subtitle}</p>}

						<div className="flex flex-wrap items-center gap-3 border-y py-3" style={{ borderColor: DESK.border }}>
							<span className="grid h-[30px] w-[30px] place-items-center rounded-full font-heading text-[13px] font-semibold" style={{ background: DESK.track, color: DESK.body }}>{article.source.charAt(0)}</span>
							<span className="flex-1 text-[13.5px] text-white">{article.source}{p.date ? <span style={{ color: DESK.muted }}> · {p.date}</span> : null}</span>
							<button type="button" onClick={p.onShare} className={`flex items-center gap-2 rounded-[10px] px-3 py-[6px] text-[13px] text-white transition-colors hover:bg-white/[0.06] ${deskFocus}`} style={{ border: `1px solid ${DESK.border}` }}>
								<Share2 className="h-[14px] w-[14px]" aria-hidden="true" /> Share
							</button>
						</div>

						{p.gist.length > 0 && (
							<section className="flex flex-col gap-3 rounded-[16px] p-5" style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }} aria-label="The gist">
								<h2 className="flex items-center gap-2 font-heading text-[16px] font-semibold text-white"><Sparkles className="h-[16px] w-[16px]" style={{ color: DESK.cyan }} aria-hidden="true" /> The gist</h2>
								{p.gist.map((g, i) => (
									<p key={i} className="flex items-start gap-3 text-[14.5px] leading-[22px]" style={{ color: DESK.body }}>
										<CheckCircle2 className="mt-[3px] h-[16px] w-[16px] shrink-0" style={{ color: DESK.cyan }} aria-hidden="true" />{g}
									</p>
								))}
							</section>
						)}

						{p.body && (
							<div className="flex flex-col gap-5 text-[16px] leading-[27px]" style={{ color: DESK.body }}>
								{p.body.before && <p>{p.body.before}</p>}
								{p.body.quote && (
									<blockquote className="border-l-[3px] pl-5 font-heading text-[19px] italic leading-[29px] text-white" style={{ borderColor: DESK.cyan }}>“{p.body.quote}”</blockquote>
								)}
								{p.body.after && <p>{p.body.after}</p>}
							</div>
						)}

						{article.url && (
							<a href={article.url} target="_blank" rel="noopener noreferrer" className={`flex w-fit items-center gap-2 rounded-md text-[13.5px] ${deskFocus}`} style={{ color: DESK.muted }}>
								Read the original at <span className="font-medium" style={{ color: DESK.cyan }}>{article.source}</span>
								<ExternalLink className="h-[14px] w-[14px]" style={{ color: DESK.cyan }} aria-hidden="true" />
								<span className="sr-only">(opens in a new tab)</span>
							</a>
						)}
					</article>

					<aside className="flex min-w-0 flex-col gap-5" aria-label="More on this story">
						{p.ticker && (
							<Panel label={`About ${p.brand?.name ?? p.ticker}`} className="gap-4 p-5">
								<div className="flex items-center gap-3">
									{p.brand ? <BrandLogo brand={p.brand} className="h-[40px] w-[40px] rounded-[10px]" alt="" /> : <span className="grid h-[40px] w-[40px] place-items-center rounded-[10px] font-heading font-semibold" style={{ background: DESK.track, color: DESK.body }}>{p.ticker.charAt(0)}</span>}
									<div className="min-w-0 flex-1">
										<p className="truncate text-[15px] font-semibold text-white">{p.brand?.name ?? p.ticker}</p>
										<p className="text-[12px]" style={{ color: DESK.muted }}>{p.ticker}</p>
									</div>
								</div>
								<div className="flex items-end justify-between gap-3">
									<div>
										<p className="font-heading text-[26px] font-semibold tabular-nums text-white">{p.price != null ? `$${p.price.toFixed(2)}` : "—"}</p>
										{p.changePct != null && <p className="text-[13px] font-medium" style={{ color: changeColor(p.changePct) }}>{signedPctLabel(p.changePct, 2)} today</p>}
									</div>
									{line.length >= 2 && <Sparkline values={line} color={changeColor(p.changePct)} className="h-[44px] w-[120px]" />}
								</div>
								<div className="flex flex-wrap gap-2">
									{p.brand && !p.inStak && (
										<DeskButton size="sm" onClick={p.onAdd}>
											<Plus className="h-[15px] w-[15px]" aria-hidden="true" /> Add to STAK
										</DeskButton>
									)}
									{p.inStak && <span className="flex h-[38px] items-center gap-2 rounded-[10px] px-3 text-[13px] font-medium" style={{ background: DESK.cyanSoft, color: DESK.cyan }}><BookmarkCheck className="h-[15px] w-[15px]" aria-hidden="true" /> In your STAK</span>}
									<button type="button" onClick={() => p.onStock(p.ticker!)} className={`flex h-[38px] items-center gap-2 rounded-[10px] px-4 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.06] ${deskFocus}`} style={{ border: `1px solid ${DESK.border}` }}>
										Stock page <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
									</button>
								</div>
								{p.fullNotice && <p role="status" className="text-[12px]" style={{ color: DESK.muted }}>Your STAK is full — remove a stock to save another</p>}
							</Panel>
						)}

						{p.ticker && (p.price != null || p.metrics?.peRatio != null || p.metrics?.marketCap) && (
							<Panel label="Key stats" className="gap-3 p-5">
								<PanelHeader icon={BarChart3} title="Key stats" />
								<dl className="grid grid-cols-2 gap-x-4 gap-y-3">
									{[
										["Market cap", p.metrics?.marketCap ?? "—"],
										["P/E ratio", p.metrics?.peRatio != null ? p.metrics.peRatio.toFixed(1) : "—"],
										["Day change", p.changeUsd != null ? `${p.changeUsd >= 0 ? "+" : "-"}$${Math.abs(p.changeUsd).toFixed(2)}` : "—"],
										["Day change %", p.changePct != null ? `${p.changePct >= 0 ? "+" : "-"}${Math.abs(p.changePct).toFixed(2)}%` : "—"],
									].map(([label, value]) => (
										<div key={label}>
											<dt className="text-[12px]" style={{ color: DESK.muted }}>{label}</dt>
											<dd className="text-[15px] font-medium tabular-nums text-white">{value}</dd>
										</div>
									))}
								</dl>
							</Panel>
						)}

						{(p.ticker || p.sentimentTag) && (
							<div className="flex flex-wrap items-center gap-2">
								<Tag className="h-[14px] w-[14px]" style={{ color: DESK.muted }} aria-hidden="true" />
								{p.ticker && <span className="rounded-full px-3 py-[4px] text-[12px] text-white" style={{ border: `1px solid ${DESK.border}` }}>{p.ticker}</span>}
								{p.sentimentTag && <span className="rounded-full px-3 py-[4px] text-[12px] text-white" style={{ border: `1px solid ${DESK.border}` }}>{p.sentimentTag}</span>}
							</div>
						)}

						{p.readNext.length > 0 && (
							<Panel label="Read next" className="gap-2 p-4">
								<p className="px-1 text-[11.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: DESK.muted }}>Read next</p>
								{p.readNext.map((a) => (
									<button key={a.url} type="button" onClick={() => p.onOpenStory(a)} className={`flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition-colors hover:bg-white/[0.04] ${deskFocus}`}>
										<span className="h-[56px] w-[80px] shrink-0 overflow-hidden rounded-[8px]" style={{ background: DESK.artBg }}>
											{a.image && <img src={a.image} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = CARD_ART_FALLBACK; }} />}
										</span>
										<span className="min-w-0 flex-1">
											<span className="line-clamp-2 block text-[13px] font-medium leading-[18px] text-white">{a.headline}</span>
											<span className="block text-[11.5px]" style={{ color: DESK.muted }}>{a.source}{a.datetime ? ` · ${newsAge(a.datetime)} ago` : ""}</span>
										</span>
									</button>
								))}
							</Panel>
						)}
					</aside>
				</div>
			</div>
		</div>
	);
}
