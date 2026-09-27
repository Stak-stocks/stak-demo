import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronRight, ExternalLink, Eye, LineChart } from "lucide-react";
import type { BrandSummary } from "@stak/shared";
import type { StockUpdateDto } from "@/lib/api";
import { useUpdates } from "@/hooks/useUpdates";
import { useMyStakData } from "@/hooks/useMyStakData";
import { ageOf, groupByCompany, kindLabel, subtitleFor, updateSourceLine } from "@/lib/updatesText";
import { newsAge } from "@/lib/newsText";
import { formatPrice, sessionWord } from "@/components/discover/discoverTheme";
import { BrandLogo } from "@/components/BrandLogo";
import { DesktopTopBar } from "@/components/desktop/DesktopTopBar";
import { DESK, DeskButton, Panel, SkeletonBar, changeColor, deskFocus, deskPageBg, signedPctLabel } from "@/components/desktop/deskKit";

const ALL = "all";
const NEW = "new";
const scrollArea = "min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function Logo({ brand, company }: { brand: BrandSummary | undefined; company: string }) {
	return brand
		? <BrandLogo brand={brand} className="h-[36px] w-[36px] rounded-[9px]" alt="" />
		: <span className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[9px] font-heading text-[15px] font-semibold" style={{ background: DESK.track, color: DESK.muted }}>{company.charAt(0).toUpperCase()}</span>;
}

/** One company in the list: logo, name, kind and age, its latest headline, an unread dot and how many changes it has. */
function CompanyRow({ group, brand, selected, onSelect }: { group: StockUpdateDto[]; brand: BrandSummary | undefined; selected: boolean; onSelect: () => void }) {
	const first = group[0]!;
	const unread = group.some((u) => !u.read);
	const age = ageOf(first);
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-current={selected ? "true" : undefined}
			data-ticker={first.ticker}
			className={`flex w-full items-start gap-3 rounded-[12px] px-3 py-3 text-left transition-colors ${selected ? "" : "hover:bg-white/[0.04]"} ${deskFocus}`}
			style={selected ? { background: DESK.cyanSoft, boxShadow: `inset 0 0 0 1px ${DESK.borderStrong}` } : undefined}
		>
			<Logo brand={brand} company={first.company} />
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-2">
					<span className="truncate text-[13.5px] font-semibold text-white">{first.company}</span>
					{group.length > 1 && <span className="shrink-0 rounded-full px-[7px] text-[11px]" style={{ background: DESK.track, color: DESK.body }}>{group.length}</span>}
					{unread && <><span className="ml-auto h-[8px] w-[8px] shrink-0 rounded-full" style={{ background: DESK.cyan }} aria-hidden="true" /><span className="sr-only">Unread</span></>}
				</span>
				<span className="block text-[11.5px]" style={{ color: DESK.muted }}>{first.ticker} · {kindLabel(first.kind)}{age ? ` · ${age}` : ""}</span>
				<span className="mt-1 line-clamp-2 block text-[12.5px] leading-[18px]" style={{ color: DESK.body }}>{first.title}</span>
			</span>
		</button>
	);
}

/** The selected company's changes in full: what happened, what it means, what to watch and where it came from. */
function ChangeDetail({ change }: { change: StockUpdateDto }) {
	const meta = [kindLabel(change.kind), ageOf(change)].filter(Boolean).join(" · ");
	return (
		<article className="flex flex-col gap-3 rounded-[14px] p-5" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
			<p className="text-[11.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: DESK.cyan }}>{meta}</p>
			<h3 className="font-heading text-[20px] font-semibold leading-[27px] text-white">{change.title}</h3>
			<p className="text-[14px] leading-[22px]" style={{ color: DESK.body }}>{change.body}</p>
			{change.watch && (
				<div className="flex items-start gap-3 rounded-[10px] px-4 py-3" style={{ background: DESK.cyanSoft, border: `1px solid ${DESK.border}` }}>
					<Eye className="mt-[2px] h-[16px] w-[16px] shrink-0" style={{ color: DESK.cyan }} aria-hidden="true" />
					<div>
						<p className="text-[12px] font-semibold text-white">What to watch</p>
						<p className="text-[13px] leading-[19px]" style={{ color: DESK.body }}>{change.watch}</p>
					</div>
				</div>
			)}
			{change.sources.length > 0 && (
				<div className="flex flex-col gap-1 pt-1">
					<p className="text-[11.5px]" style={{ color: DESK.muted }}>{updateSourceLine(change)}</p>
					<ul className="flex flex-col">
						{change.sources.map((s) => (
							<li key={s.url || s.headline}>
								<a href={s.url} target="_blank" rel="noopener noreferrer" className={`group flex items-start gap-2 rounded-md py-[6px] text-[12.5px] leading-[18px] ${deskFocus}`}>
									<ExternalLink className="mt-[2px] h-[13px] w-[13px] shrink-0" style={{ color: DESK.muted }} aria-hidden="true" />
									<span className="min-w-0 flex-1 text-white group-hover:underline">{s.headline}</span>
									<span className="shrink-0" style={{ color: DESK.muted }}>{s.source}{s.datetime ? ` · ${newsAge(s.datetime)}` : ""}</span>
									<span className="sr-only">(opens in a new tab)</span>
								</a>
							</li>
						))}
					</ul>
				</div>
			)}
		</article>
	);
}

/**
 * "What changed" on desktop: filter chips, the companies with changes on the left (New, then Earlier) and the selected
 * company's changes in full on the right, beside its price and the way to its stock page. Opening a company marks it
 * read, as on the phone - but it stays in its section until the next visit, so the list doesn't reshuffle under you.
 */
export function UpdatesDesktop() {
	const navigate = useNavigate();
	const { updates, isLoading, isError, markCompanyRead } = useUpdates();
	const { allBrands, batchQuotes } = useMyStakData();
	const [filter, setFilter] = useState<string>(ALL);
	const [selected, setSelected] = useState<string | null>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Which companies were unread when the page opened: the sections are drawn from this, not the live read state.
	const unreadAtOpen = useRef<Set<string> | null>(null);
	if (unreadAtOpen.current === null && !isLoading) unreadAtOpen.current = new Set(updates.filter((u) => !u.read).map((u) => u.ticker));
	const wasNew = (ticker: string) => unreadAtOpen.current?.has(ticker) ?? false;

	const brandByTicker = useMemo(() => new Map(allBrands.map((b) => [b.ticker.toUpperCase(), b])), [allBrands]);
	const kinds = useMemo(() => [...new Set(updates.map((u) => u.kind))], [updates]);
	const shown = useMemo(() => updates.filter((u) => filter === ALL || (filter === NEW ? wasNew(u.ticker) : u.kind === filter)), [updates, filter]);
	const groups = useMemo(() => groupByCompany(shown), [shown]);
	const fresh = groups.filter((g) => wasNew(g[0]!.ticker));
	const earlier = groups.filter((g) => !wasNew(g[0]!.ticker));
	const ordered = [...fresh, ...earlier];

	const current = ordered.find((g) => g[0]!.ticker === selected) ?? ordered[0];
	const currentTicker = current?.[0]?.ticker ?? null;
	// Whatever is on screen in the detail pane counts as opened. Keyed on the company alone: markCompanyRead is a new
	// function each render, and it's a no-op once that company has nothing unread anyway.
	useEffect(() => { if (currentTicker) markCompanyRead(currentTicker); }, [currentTicker]);

	const select = (ticker: string) => setSelected(ticker);
	const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		const at = ordered.findIndex((g) => g[0]!.ticker === currentTicker);
		const next = ordered[Math.min(ordered.length - 1, Math.max(0, at + (e.key === "ArrowDown" ? 1 : -1)))];
		if (!next) return;
		const ticker = next[0]!.ticker;
		setSelected(ticker);
		listRef.current?.querySelector<HTMLButtonElement>(`[data-ticker="${ticker}"]`)?.focus();
	};

	const first = current?.[0];
	const brand = first ? brandByTicker.get(first.ticker.toUpperCase()) : undefined;
	const quote = first ? batchQuotes[first.ticker] : undefined;
	const chips: Array<{ id: string; label: string }> = [{ id: ALL, label: "All" }, { id: NEW, label: "New" }, ...kinds.map((k) => ({ id: k, label: kindLabel(k) }))];

	return (
		<div className="flex min-h-full flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-8 pb-6 pt-5 lg:min-h-0 lg:flex-1">
				<DesktopTopBar />

				<header className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12.5px]" style={{ color: DESK.muted }}>
							<button type="button" onClick={() => navigate({ to: "/my-stak" })} className={`rounded-md hover:text-white ${deskFocus}`}>My STAK</button>
							<ChevronRight className="h-[13px] w-[13px]" aria-hidden="true" />
							<span aria-current="page" className="text-white">What changed</span>
						</nav>
						<h1 className="mt-1 font-heading text-[28px] font-semibold leading-[36px] text-white">What changed</h1>
						<p className="text-[14px]" style={{ color: DESK.muted }}>{isLoading ? "Checking your saved companies…" : subtitleFor(updates.filter((u) => wasNew(u.ticker)))}</p>
					</div>
					{updates.length > 0 && (
						<div className="flex flex-wrap gap-2" role="group" aria-label="Show">
							{chips.map((c) => {
								const on = filter === c.id;
								return (
									<button
										key={c.id}
										type="button"
										aria-pressed={on}
										onClick={() => { setFilter(c.id); setSelected(null); }}
										className={`rounded-full px-3 py-[6px] text-[12.5px] transition-colors ${deskFocus}`}
										style={on ? DESK.chipOn : { color: DESK.body, background: "rgba(255,255,255,0.03)", border: `1px solid ${DESK.border}` }}
									>
										{c.label}
									</button>
								);
							})}
						</div>
					)}
				</header>

				<div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:[grid-template-rows:minmax(0,1fr)]">
					<Panel label="Companies with changes" className="p-2 lg:min-h-0">
						<div ref={listRef} className={`flex flex-col gap-1 ${scrollArea}`} onKeyDown={onListKey}>
							{isLoading ? (
								[0, 1, 2, 3, 4].map((i) => <SkeletonBar key={i} width="100%" height={78} className="rounded-[12px]" />)
							) : ordered.length === 0 ? (
								<p className="p-4 text-[13px]" style={{ color: DESK.muted }}>
									{isError && updates.length === 0 ? "Couldn't check your saved companies right now." : updates.length === 0 ? "Nothing new at your saved companies." : "Nothing here with this filter."}
								</p>
							) : (
								<>
									{fresh.length > 0 && <h2 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: DESK.muted }}>New</h2>}
									{fresh.map((g) => <CompanyRow key={g[0]!.ticker} group={g} brand={brandByTicker.get(g[0]!.ticker.toUpperCase())} selected={g[0]!.ticker === currentTicker} onSelect={() => select(g[0]!.ticker)} />)}
									{earlier.length > 0 && <h2 className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: DESK.muted }}>Earlier · already opened</h2>}
									{earlier.map((g) => <CompanyRow key={g[0]!.ticker} group={g} brand={brandByTicker.get(g[0]!.ticker.toUpperCase())} selected={g[0]!.ticker === currentTicker} onSelect={() => select(g[0]!.ticker)} />)}
								</>
							)}
						</div>
					</Panel>

					<Panel label="Change details" className="lg:min-h-0">
						<div className={`flex flex-col gap-4 p-5 ${scrollArea}`}>
							{isLoading ? (
								<div className="flex flex-col gap-3"><SkeletonBar width="40%" height={28} /><SkeletonBar width="100%" height={180} className="rounded-[14px]" /></div>
							) : !first ? (
								<div className="grid place-items-center gap-2 py-16 text-center">
									<Check className="h-[28px] w-[28px]" style={{ color: DESK.cyan }} aria-hidden="true" />
									<p className="text-[15px] text-white">You're up to date on your saved companies.</p>
									<p className="text-[13px]" style={{ color: DESK.muted }}>New earnings, outlook changes and analyst moves show up here.</p>
								</div>
							) : (
								<>
									<div className="flex flex-wrap items-center gap-4">
										<Logo brand={brand} company={first.company} />
										<div className="min-w-0 flex-1">
											<h2 className="font-heading text-[20px] font-semibold text-white">{first.company}</h2>
											<p className="text-[12.5px]" style={{ color: DESK.muted }}>{first.ticker} · {current!.length} {current!.length === 1 ? "change" : "changes"} this week</p>
										</div>
										{quote && (
											<div className="text-right">
												<p className="font-heading text-[20px] font-semibold text-white tabular-nums">{formatPrice(quote.price)}</p>
												<p className="text-[12.5px] font-medium" style={{ color: changeColor(quote.changePercent) }}>{signedPctLabel(quote.changePercent)} {sessionWord()}</p>
											</div>
										)}
									</div>
									<div className="flex flex-wrap gap-2">
										<DeskButton size="sm" onClick={() => navigate({ to: "/stock/$symbol", params: { symbol: first.ticker } })}>
											Open stock page <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
										</DeskButton>
										<button type="button" onClick={() => navigate({ to: "/simulate", search: { buy: first.ticker } })} className={`flex h-[36px] items-center gap-2 rounded-[10px] px-4 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.06] ${deskFocus}`} style={{ border: `1px solid ${DESK.border}` }}>
											<LineChart className="h-[14px] w-[14px]" aria-hidden="true" /> Practice buy
										</button>
									</div>
									{current!.map((change) => <ChangeDetail key={change.id} change={change} />)}
								</>
							)}
						</div>
					</Panel>
				</div>
			</div>
		</div>
	);
}
