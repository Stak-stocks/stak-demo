import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueries } from "@tanstack/react-query";
import { BarChart3, Bookmark, Gauge, MoreHorizontal, Plus, Star, type LucideIcon } from "lucide-react";
import type { BrandSummary } from "@stak/shared";
import { getStockChart } from "@/lib/api";
import type { Group, Holding } from "@/lib/collections";
import type { Graph } from "@/lib/tasteGraph";
import { isEmptyGraph, restShare, summaryOf, subtitleOf } from "@/lib/tasteGraph";
import { dailyCloses } from "@/lib/chartSeries";
import { signedPct, usd } from "@/lib/simFormat";
import { todaysMove, usePaperPortfolio, usePortfolioHistory } from "@/hooks/usePaperPortfolio";
import { collectionTileArt } from "@/lib/collectionArt";
import { heldCountLabel } from "@/components/mystak/CollectionChip";
import { CARD_ART_FALLBACK, sessionWord } from "@/components/discover/discoverTheme";
import { BrandLogo } from "@/components/BrandLogo";
import { Sparkline } from "@/components/desktop/Sparkline";
import { DESK, DeskButton, Panel, PanelHeader, SkeletonBar, ThemeBarRow, changeColor, deskFocus, signedPctLabel } from "@/components/desktop/deskKit";

// ── My STAK collections ─────────────────────────────────────────────────────────────────────────
const TILES = 4;
// One row, always: up to four roughly square collection tiles (4:3 photo + caption) plus the "Discover more" tile. A narrower panel drops
// the last collections (container queries on the wrapper) rather than wrapping to a second row.
const TILE_ROW = "grid auto-cols-fr grid-flow-col gap-3";
const tileFits = (i: number) => (i === 3 ? "hidden @[640px]:flex" : i === 2 ? "hidden @[480px]:flex" : "flex");

export function MyStakPanel({ groups, loading, onOpenCollection, onViewAll, onDiscover }: {
	groups: Group[];
	loading: boolean;
	onOpenCollection: (id: string) => void;
	onViewAll: () => void;
	onDiscover: () => void;
}) {
	return (
		<Panel label="My STAK" className="gap-4 p-5">
			<PanelHeader icon={Bookmark} title="My STAK" subtitle="Your saved collections and interests." action="View all" onAction={onViewAll} />
			<div className="@container">
				<div className={TILE_ROW}>
					{loading
						? [0, 1, 2, 3, 4].map((i) => <span key={i} className="block aspect-square animate-pulse rounded-[12px]" style={{ background: DESK.track }} aria-hidden="true" />)
						: groups.slice(0, TILES).map((group, i) => {
							// The collection's own photo; a collection without one ("Other") uses its first company's card art.
							const first = group.holdings[0]?.ticker;
							const art = collectionTileArt(group.name, first);
							return (
								<button
									key={group.id}
									type="button"
									onClick={() => onOpenCollection(group.id)}
									className={`group ${tileFits(i)} min-w-0 flex-col overflow-hidden rounded-[12px] text-left transition-transform hover:-translate-y-[2px] ${deskFocus}`}
									style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}
								>
									<div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: DESK.artBg }}>
										{art && (
											<img
												src={art}
												alt=""
												loading="lazy"
												className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
												onError={(e) => { e.currentTarget.src = CARD_ART_FALLBACK; }}
											/>
										)}
									</div>
									<div className="px-3 py-2">
										<p className="truncate text-[12.5px] font-semibold text-white">{group.name}</p>
										<p className="text-[11px]" style={{ color: DESK.muted }}>{heldCountLabel(group.holdings.length)}</p>
									</div>
								</button>
							);
						})}
					{!loading && (
						<button
							type="button"
							onClick={onDiscover}
							className={`flex min-h-[132px] min-w-0 flex-col items-center justify-center gap-2 rounded-[12px] px-2 text-center text-[12px] transition-colors hover:bg-white/[0.03] ${deskFocus}`}
							style={{ border: `1px dashed ${DESK.borderStrong}`, color: DESK.cyan }}
						>
							<Plus className="h-[20px] w-[20px]" aria-hidden="true" />
							{groups.length === 0 ? "Save companies in Discover to start your STAK" : "Discover more companies"}
						</button>
					)}
				</div>
			</div>
		</Panel>
	);
}

// ── Investing Taste ─────────────────────────────────────────────────────────────────────────────
export function TastePanel({ taste, failed, onOpen, onRetry }: { taste: Graph | null; failed: boolean; onOpen: () => void; onRetry: () => void }) {
	const themes = taste && !isEmptyGraph(taste) ? taste.themes.slice(0, 4) : [];
	return (
		<Panel label="Investing Taste" className="gap-4 p-5">
			<PanelHeader icon={Gauge} title="Investing Taste" subtitle="Your top interests based on your activity." action="See all" onAction={onOpen} />
			{!taste ? (
				failed ? (
					<div className="flex items-center gap-3 text-[12.5px]" style={{ color: DESK.muted }}>
						We couldn't load your interests.
						<button type="button" onClick={onRetry} className={`rounded-md font-medium ${deskFocus}`} style={{ color: DESK.cyan }}>Try again</button>
					</div>
				) : (
					<div className="flex flex-col gap-4">{[0, 1, 2, 3].map((i) => <SkeletonBar key={i} width="100%" height={18} />)}</div>
				)
			) : themes.length === 0 ? (
				<div className="flex flex-col gap-1">
					<p className="text-[13.5px] font-semibold text-white">{summaryOf(taste)}</p>
					<p className="text-[12.5px] leading-[18px]" style={{ color: DESK.muted }}>{subtitleOf(taste)}</p>
				</div>
			) : (
				// Rows are plain: the header's "See all" is the one way in, not a tab stop per interest.
				<ul className="flex flex-1 flex-col justify-between gap-2">
					{themes.map((theme) => <li key={theme.category}><ThemeBarRow label={theme.label} share={theme.share} /></li>)}
					{/* Everything past the top four, so the rows add up to 100% like the full Taste page. */}
					{taste && restShare(taste, themes.length) > 0.01 && <li><ThemeBarRow label="Other interests" share={restShare(taste, themes.length)} other /></li>}
				</ul>
			)}
		</Panel>
	);
}

// ── Saved companies table ───────────────────────────────────────────────────────────────────────
const ROWS = 5;

/** The row's "⋯" actions: a disclosure that takes focus when it opens and gives it back when it closes. */
function RowMenu({ company, onOpen, onPractice, onRemove }: { company: string; onOpen: () => void; onPractice: () => void; onRemove: () => void }) {
	const [open, setOpen] = useState(false);
	// Removing takes a second click ("Yes, remove"), so one stray click can't delete a save.
	const [confirmRemove, setConfirmRemove] = useState(false);
	useEffect(() => { if (!open) setConfirmRemove(false); }, [open]);
	const ref = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (!open) return;
		ref.current?.querySelector<HTMLButtonElement>("[data-menu-item]")?.focus();
		const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [open]);
	const dismiss = () => { setOpen(false); trigger.current?.focus(); };
	const item = `block w-full rounded-[6px] px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none`;
	const pick = (fn: () => void) => () => { setOpen(false); fn(); };
	return (
		<div
			ref={ref}
			className="relative"
			onKeyDown={(e) => {
				if (!open) return;
				if (e.key === "Escape") { e.preventDefault(); dismiss(); return; }
				if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
				e.preventDefault();
				const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>("[data-menu-item]") ?? [])];
				const at = items.indexOf(document.activeElement as HTMLButtonElement);
				items[(at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
			}}
			// Tabbing out of the open list closes it.
			onBlur={(e) => { if (open && !ref.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
		>
			<button ref={trigger} type="button" onClick={() => setOpen((o) => !o)} aria-label={`More actions for ${company}`} aria-expanded={open} className={`grid h-[28px] w-[28px] place-items-center rounded-md transition-colors hover:bg-white/[0.06] ${deskFocus}`}>
				<MoreHorizontal className="h-[16px] w-[16px]" style={{ color: DESK.muted }} aria-hidden="true" />
			</button>
			{open && (
				<div className="absolute right-0 top-[32px] z-20 w-[170px] rounded-[10px] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.45)]" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
					<button data-menu-item type="button" className={item} style={{ color: "#fff" }} onClick={pick(onOpen)}>View details</button>
					<button data-menu-item type="button" className={item} style={{ color: "#fff" }} onClick={pick(onPractice)}>Practice buy</button>
					{confirmRemove
						? <button data-menu-item type="button" autoFocus className={item} style={{ color: DESK.red, fontWeight: 600 }} onClick={pick(onRemove)}>Yes, remove {company}</button>
						: <button data-menu-item type="button" className={item} style={{ color: DESK.red }} onClick={() => setConfirmRemove(true)}>Remove from STAK</button>}
				</div>
			)}
		</div>
	);
}

const savedDate = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** The move since the company was saved ("▲ 12.4%", "since Sep 12"); a dash without a saved price or a quote. */
function SinceSaved({ holding }: { holding: Holding }) {
	const { price, priceAtSave, savedAt } = holding;
	if (price == null || priceAtSave == null || priceAtSave <= 0) return <span className="text-[12px]" style={{ color: DESK.muted }}>—</span>;
	const pct = ((price - priceAtSave) / priceAtSave) * 100;
	return (
		<span className="flex flex-col">
			<span className="text-[12.5px] font-medium tabular-nums" style={{ color: changeColor(pct) }}>{signedPctLabel(pct)}</span>
			{savedAt != null && <span className="text-[11px]" style={{ color: DESK.muted }}>since {savedDate(savedAt)}</span>}
		</span>
	);
}

export function SavedCompaniesPanel({
	holdings, brands, loading, onOpenStock, onPractice, onRemove, onViewAll, onDiscover,
	showCollection = false, subtitle = "The companies you're following.", compact = false,
	title = "Saved Companies", icon = Star, limit = ROWS, presorted = false, headerExtra, emptyText,
	fill = false, sinceSaved = false, unreadTickers,
}: {
	holdings: Holding[];
	brands: BrandSummary[];
	loading: boolean;
	onOpenStock: (ticker: string) => void;
	onPractice: (ticker: string) => void;
	onRemove: (brandId: string) => void;
	onViewAll: () => void;
	onDiscover: () => void;
	/** My STAK adds each company's collection as a chip column. */
	showCollection?: boolean;
	subtitle?: string;
	/** Tighter padding and rows (My STAK); Home keeps its spacing, which lines up with the Practice panel. */
	compact?: boolean;
	title?: string;
	icon?: LucideIcon;
	/** How many rows (a collection page shows them all). */
	limit?: number;
	/** Keep the caller's order (e.g. a collection's sort chips) instead of newest first. */
	presorted?: boolean;
	/** Extra controls on the title row, in place of "View all" (a collection page's sort chips and Add stock). */
	headerExtra?: ReactNode;
	emptyText?: string;
	/** Stretch the rows to the panel's height (Home, where the panel matches the Practice panel beside it). */
	fill?: boolean;
	/** Show each company's move since it was saved instead of the 1-day line (a collection page). */
	sinceSaved?: boolean;
	/** Companies with an unread "What changed" update get a dot by their name. */
	unreadTickers?: Set<string>;
}) {
	// Most recently saved first, unless the caller already ordered them.
	const rows = (presorted ? holdings : [...holdings].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))).slice(0, limit);
	const charts = useQueries({
		queries: rows.map((h) => ({
			queryKey: ["stock-chart", h.ticker, "1d"],
			queryFn: () => getStockChart(h.ticker, "1d"),
			staleTime: 5 * 60 * 1000,
			retry: 1,
			// Only the 1D column draws these.
			enabled: !sinceSaved,
		})),
	});
	const brandById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
	const head = "pb-2 text-left text-[11px] font-medium";
	// Which day the change column is: "Today" in a session, else the last trading day's name ("Friday").
	const session = sessionWord();
	const dayHead = session === "today" ? "Today" : session.replace(/^on /, "");

	return (
		<Panel label="Saved companies" className={compact ? "gap-2 p-4" : "gap-3 p-5"}>
			{headerExtra ? (
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0 flex-1"><PanelHeader icon={icon} title={title} subtitle={subtitle} /></div>
					{headerExtra}
				</div>
			) : (
				<PanelHeader icon={icon} title={title} subtitle={subtitle} action="View all" onAction={onViewAll} />
			)}
			{loading ? (
				<div className="flex flex-col gap-3 pt-2">{[0, 1, 2, 3, 4].map((i) => <SkeletonBar key={i} width="100%" height={30} />)}</div>
			) : rows.length === 0 ? (
				<div className="flex flex-col items-start gap-2 py-4">
					<p className="text-[13px]" style={{ color: DESK.body }}>{emptyText ?? "Nothing saved yet. Swipe today's deck and your saves show up here."}</p>
					<button type="button" onClick={onDiscover} className={`rounded-md text-[13px] font-medium ${deskFocus}`} style={{ color: DESK.cyan }}>Go to Discover →</button>
				</div>
			) : (
				// Fills the panel's height (the row matches Practice); any spare height spreads evenly across the rows.
				<div className={fill ? "flex-1" : undefined}>
					<table className={`${fill ? "h-full " : ""}w-full table-fixed border-collapse`}>
						<thead>
							<tr style={{ color: DESK.muted }}>
								<th className={`${head} ${showCollection ? "w-[31%]" : "w-[40%]"}`}>Company</th>
								<th className={`${head} ${showCollection ? "w-[14%]" : "w-[18%]"}`}>Price</th>
								<th className={`${head} ${showCollection ? "w-[13%]" : "w-[16%]"}`}>{dayHead}</th>
								<th className={`${head} ${showCollection ? "w-[15%]" : "w-[18%]"}`}>{sinceSaved ? "Since you saved" : "1D"}</th>
								{showCollection && <th className={`${head} w-[19%]`}>Collection</th>}
								<th className={`${head} w-[8%]`}><span className="sr-only">Actions</span></th>
							</tr>
						</thead>
						<tbody>
							{rows.map((h, i) => {
								const brand = brandById.get(h.brandId);
								const chart = charts[i];
								const line = (chart?.data?.prices ?? []).map((p) => p.close).filter((c) => c > 0);
								const color = changeColor(h.changePercent);
								return (
									<tr key={h.brandId} className="border-t" style={{ borderColor: DESK.border }}>
										<td className={compact ? "py-[6px]" : "py-[9px]"}>
											<button type="button" onClick={() => onOpenStock(h.ticker)} className={`flex w-full min-w-0 items-center gap-3 rounded-md text-left ${deskFocus}`}>
												{brand ? <BrandLogo brand={brand} className="h-[26px] w-[26px] rounded-[7px]" alt="" /> : <span className="h-[26px] w-[26px] rounded-[7px]" style={{ background: DESK.track }} />}
												<span className="truncate text-[13px] font-medium text-white">{h.name}</span>
												<span className="shrink-0 text-[11px]" style={{ color: DESK.muted }}>{h.ticker}</span>
												{unreadTickers?.has(h.ticker.toUpperCase()) && (
													<><span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: DESK.cyan }} title="New update" aria-hidden="true" /><span className="sr-only">Has a new update</span></>
												)}
											</button>
										</td>
										<td className="text-[13px] tabular-nums text-white">{h.price !== null ? usd(h.price) : "—"}</td>
										<td className="text-[12.5px] font-medium tabular-nums" style={{ color }}>{signedPctLabel(h.changePercent)}</td>
										<td className="pr-3">
											{sinceSaved ? <SinceSaved holding={h} /> : chart?.isPending ? (
												<SkeletonBar width="100%" height={18} />
											) : line.length >= 2 ? (
												<Sparkline values={line} color={color} fill={false} className="h-[22px] w-full" />
											) : (
												<span className="text-[12px]" style={{ color: DESK.muted }}>—</span>
											)}
										</td>
										{showCollection && (
											<td className="pr-2">
												<span title={h.groupName} className="inline-block max-w-full truncate rounded-full px-[10px] py-[3px] text-[11.5px]" style={{ color: DESK.body, background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>{h.groupName}</span>
											</td>
										)}
										<td className="text-right">
											<RowMenu company={h.name} onOpen={() => onOpenStock(h.ticker)} onPractice={() => onPractice(h.ticker)} onRemove={() => onRemove(h.brandId)} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</Panel>
	);
}

// ── Practice / Simulate ─────────────────────────────────────────────────────────────────────────
const weekday = (ts: string) => new Date(ts).toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" });
const compactUsd = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0));

function Stat({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
	return (
		<div className="flex min-w-0 flex-col gap-[2px]">
			<span className="truncate text-[11px]" style={{ color: DESK.muted }}>{label}</span>
			<span className="truncate text-[13px] font-semibold tabular-nums" style={{ color }}>{value}</span>
		</div>
	);
}

/** The paper portfolio at a glance. It owns usePaperPortfolio so its 15s price refresh only re-renders this panel. */
export function PracticePanel({ onOpen }: { onOpen: () => void }) {
	const paper = usePaperPortfolio();
	const { points: ledger, loading: historyLoading } = usePortfolioHistory(paper.trades, paper.paperStart, "1w");
	// Tickers close at slightly different times, so a day can carry two ledger points; keep the last per day.
	const points = dailyCloses((ledger ?? []).map((p) => ({ ts: p.ts, close: p.value })));
	const values = points.map((p) => p.close);
	const hasWeek = values.length >= 2;
	const weekPct = hasWeek && values[0]! > 0 ? ((values[values.length - 1]! - values[0]!) / values[0]!) * 100 : null;
	const totalPct = paper.paperStart > 0 ? (paper.allTimeGain / paper.paperStart) * 100 : 0;
	// Today's move in dollars: what each holding gained since yesterday's close, or since it was bought if that was today.
	const todayPct = todaysMove(paper).pct;
	const best = paper.picks.length > 0 ? paper.picks.reduce((a, b) => (b.gainPct > a.gainPct ? b : a)) : null;
	const min = hasWeek ? Math.min(...values) : 0;
	const max = hasWeek ? Math.max(...values) : 0;
	const headline = weekPct !== null ? { pct: weekPct, label: "this week" } : { pct: totalPct, label: "all time" };

	return (
		<Panel label="Practice / Simulate" className="gap-4 p-5">
			<PanelHeader icon={BarChart3} title="Practice / Simulate" subtitle="Build your skills with a paper portfolio." action="Open simulator" onAction={onOpen} />
			{paper.loading ? (
				<div className="flex flex-col gap-3"><SkeletonBar width={140} height={28} /><SkeletonBar width="100%" height={120} /></div>
			) : paper.needsSetup ? (
				<div className="flex flex-col items-start gap-3 py-2">
					<p className="text-[13px] leading-[19px]" style={{ color: DESK.body }}>Practice with a pretend balance. Pick a starting amount and a strategy, then buy and sell real companies at live prices.</p>
					<DeskButton size="sm" onClick={onOpen}>Set up your portfolio</DeskButton>
				</div>
			) : (
				<>
					{/* The chart takes whatever height the row leaves (at least 64px), so this panel and Saved Companies end level. */}
					<div className="flex flex-1 flex-col rounded-[12px] p-4" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
						<p className="text-[11.5px]" style={{ color: DESK.muted }}>{paper.name || "Paper Portfolio"} (simulated) · cash {usd(paper.cash)}</p>
						<p className="font-heading text-[28px] font-semibold leading-[36px] text-white tabular-nums">{usd(paper.portfolioValue)}</p>
						<p className="text-[12.5px] font-medium" style={{ color: changeColor(headline.pct) }}>{signedPctLabel(headline.pct)} <span style={{ color: DESK.muted }}>{headline.label}</span></p>
						<div className="mt-3 flex min-h-[64px] flex-1 gap-2">
							<div className="flex min-w-0 flex-1 flex-col">
								{hasWeek ? (
									<div className="relative min-h-0 flex-1">
										<Sparkline values={values} color={DESK.green} className="absolute inset-0 h-full w-full" strokeWidth={2} />
									</div>
								) : (
									<div className="grid flex-1 place-items-center text-[12px]" style={{ color: DESK.muted }}>{historyLoading ? "" : "Make a trade to start your chart"}</div>
								)}
								{hasWeek && (
									<div className="mt-1 flex justify-between text-[10.5px] leading-[14px]" style={{ color: DESK.muted }}>
										{points.map((p) => <span key={p.ts}>{weekday(p.ts)}</span>)}
									</div>
								)}
							</div>
							{hasWeek && (
								// Level with the chart area (not the weekday row under it); the line keeps an 8% margin top and bottom.
								<div className="flex flex-col justify-between pb-[21px] pt-[3px] text-right text-[10.5px] leading-[12px] tabular-nums" style={{ color: DESK.muted }} aria-hidden="true">
									<span>{compactUsd(max)}</span>
									<span>{compactUsd((max + min) / 2)}</span>
									<span>{compactUsd(min)}</span>
								</div>
							)}
						</div>
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-3 min-[1440px]:grid-cols-4">
						<Stat label="Total Return" value={signedPct(totalPct)} color={changeColor(totalPct)} />
						<Stat label="Today's Change" value={signedPct(todayPct)} color={changeColor(todayPct)} />
						<Stat label="Best Performer" value={best ? `${best.ticker} ${signedPct(best.gainPct)}` : "—"} color={best ? changeColor(best.gainPct) : DESK.muted} />
						<Stat label="Total Positions" value={String(paper.picks.length)} />
					</div>
				</>
			)}
		</Panel>
	);
}
