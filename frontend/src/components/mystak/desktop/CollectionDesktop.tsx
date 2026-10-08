import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Layers, Plus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useCollections } from "@/hooks/useCollections";
import { useUpdates } from "@/hooks/useUpdates";
import { COLLECTION_SORTS, groupChangePct, sortHoldings, type CollectionSort, type Holding } from "@/lib/collections";
import { collectionTileArt } from "@/lib/collectionArt";
import { kindLabel } from "@/lib/updatesText";
import { heldCountLabel } from "@/components/mystak/CollectionChip";
import { CARD_ART_FALLBACK } from "@/components/discover/discoverTheme";
import { DesktopTopBar } from "@/components/desktop/DesktopTopBar";
import { DESK, Panel, PanelHeader, SkeletonBar, changeColor, deskFocus, deskPageBg, signedPctLabel } from "@/components/desktop/deskKit";
import { SavedCompaniesPanel } from "@/components/home/desktop/StakPanels";
import { CollectionTile } from "./MyStakPanels";

/** One row of other collections at desktop widths; "View all" has the rest. */
const OTHERS_SHOWN = 5;

/** "NVIDIA, AMD and 3 more" - the collection's own companies. */
function companiesLine(names: string[]): string {
	if (names.length <= 2) return names.join(" and ");
	return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

function StatTile({ label, value, sub, color = "#fff", icon: Icon }: { label: string; value: string; sub?: string; color?: string; icon?: LucideIcon }) {
	return (
		<div className="flex min-w-0 flex-col gap-1 rounded-[14px] p-4" style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }}>
			<span className="flex items-center gap-2 text-[12px]" style={{ color: DESK.muted }}>{Icon && <Icon className="h-[14px] w-[14px]" aria-hidden="true" />}{label}</span>
			<span className="truncate font-heading text-[20px] font-semibold tabular-nums" style={{ color }}>{value}</span>
			{sub && <span className="truncate text-[12px]" style={{ color: DESK.body }}>{sub}</span>}
		</div>
	);
}

/** Today's best and worst mover among the holdings that have a quote. */
function extremes(holdings: Holding[]): { best: Holding | null; worst: Holding | null } {
	const quoted = holdings.filter((h) => h.changePercent != null);
	if (quoted.length === 0) return { best: null, worst: null };
	const byMove = [...quoted].sort((a, b) => b.changePercent! - a.changePercent!);
	return { best: byMove[0]!, worst: byMove.length > 1 ? byMove[byMove.length - 1]! : null };
}

/**
 * One collection on desktop: a banner with its photo and today's move, stat tiles, every company in a sortable table
 * (open, practice-buy or remove from the row menu), and a rail with this collection's recent changes and the other
 * collections. Same data and actions as the phone page.
 */
export function CollectionDesktop({ id }: { id: string }) {
	const navigate = useNavigate();
	const { removeFromStak } = useAccount();
	const { allBrandsLoading, swipedBrands, batchQuotes, accountLoading } = useMyStakData();
	const { groups } = useCollections(swipedBrands, batchQuotes);
	const { updates } = useUpdates();
	const [sort, setSort] = useState<CollectionSort>("newest");

	const loading = allBrandsLoading || accountLoading;
	const group = groups.find((g) => g.id === id) ?? null;
	const title = group?.name ?? "Collection";
	const held = useMemo(() => sortHoldings(group?.holdings ?? [], sort), [group, sort]);
	const move = group ? groupChangePct(group.holdings) : null;
	const { best, worst } = extremes(held);
	const art = group ? collectionTileArt(group.name, group.holdings[0]?.ticker) : null;
	const tickers = useMemo(() => new Set(held.map((h) => h.ticker.toUpperCase())), [held]);
	// The same headline can arrive twice for a company (two stories about one event): list it once.
	const changes = updates
		.filter((u) => tickers.has(u.ticker.toUpperCase()))
		.filter((u, i, all) => all.findIndex((o) => o.ticker === u.ticker && o.title === u.title) === i)
		// An update row is ~1.4x a table row: about 0.7 updates per company keeps the rail level with the table (2-6 rows).
		.slice(0, Math.min(6, Math.max(2, Math.round(held.length * 0.7))));
	const others = groups.filter((g) => g.id !== id);
	const unreadTickers = useMemo(() => new Set(updates.filter((u) => !u.read).map((u) => u.ticker.toUpperCase())), [updates]);
	const brandById = useMemo(() => new Map(swipedBrands.map((b) => [b.id, b])), [swipedBrands]);

	const openStock = (ticker: string) => navigate({ to: "/stock/$symbol", params: { symbol: ticker } });
	const discover = () => navigate({ to: "/discover" });

	const sortChips = held.length > 1 && (
		<div className="flex flex-wrap items-center gap-2">
			<div className="flex gap-2" role="group" aria-label="Sort companies">
				{COLLECTION_SORTS.map(([key, label]) => {
					const on = sort === key;
					return (
						<button
							key={key}
							type="button"
							aria-pressed={on}
							onClick={() => setSort(key)}
							className={`rounded-full px-3 py-[5px] text-[12px] transition-colors ${deskFocus}`}
							style={on ? DESK.chipOn : { color: DESK.body, background: "rgba(255,255,255,0.03)", border: `1px solid ${DESK.border}` }}
						>
							{label}
						</button>
					);
				})}
			</div>
			<button type="button" onClick={discover} className={`flex items-center gap-1 rounded-full px-3 py-[5px] text-[12px] font-medium transition-colors hover:bg-white/[0.06] ${deskFocus}`} style={{ color: DESK.cyan, border: `1px dashed ${DESK.borderStrong}` }}>
				<Plus className="h-[13px] w-[13px]" aria-hidden="true" /> Add stock
			</button>
		</div>
	);

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-10 pt-5">
				<DesktopTopBar />

				<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12.5px]" style={{ color: DESK.muted }}>
					<button type="button" onClick={() => navigate({ to: "/my-stak" })} className={`rounded-md hover:text-white ${deskFocus}`}>My STAK</button>
					<ChevronRight className="h-[13px] w-[13px]" aria-hidden="true" />
					<button type="button" onClick={() => navigate({ to: "/my-stak/collections" })} className={`rounded-md hover:text-white ${deskFocus}`}>Collections</button>
					<ChevronRight className="h-[13px] w-[13px]" aria-hidden="true" />
					<span aria-current="page" className="text-white">{title}</span>
				</nav>

				{/* Banner: the collection's photo, fading into the page, with its name and today's move over it. */}
				<section className="relative overflow-hidden rounded-[18px]" style={{ border: `1px solid ${DESK.border}`, background: DESK.artBg }} aria-label={title}>
					{art && <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" onError={(e) => { e.currentTarget.src = CARD_ART_FALLBACK; }} />}
					<div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(10,16,32,0.95) 0%, rgba(10,16,32,0.75) 45%, rgba(10,16,32,0.2) 100%)" }} aria-hidden="true" />
					<div className="relative flex min-h-[168px] flex-col justify-end gap-2 p-6">
						<p className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: DESK.cyan }}><Layers className="h-[14px] w-[14px]" aria-hidden="true" /> Collection</p>
						<h1 className="font-heading text-[32px] font-semibold leading-[40px] text-white">{title}</h1>
						<p className="text-[14px]" style={{ color: DESK.body }}>
							{loading && !group ? "Loading…" : (
								<>
									{heldCountLabel(held.length)}
									{move != null && <> · <span style={{ color: changeColor(move) }}>{signedPctLabel(move)} today on average</span></>}
									{held.length > 0 && <> · {companiesLine(held.map((h) => h.name))}</>}
								</>
							)}
						</p>
					</div>
				</section>

				{held.length > 0 && (
					<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
						<StatTile label="Companies" value={String(held.length)} sub={`In your ${title} collection`} />
						<StatTile label="Average today" value={move == null ? "—" : signedPctLabel(move)} color={changeColor(move)} sub="Equal weight across them" />
						<StatTile label="Best today" icon={TrendingUp} value={best ? best.ticker : "—"} color={best ? changeColor(best.changePercent) : DESK.muted} sub={best ? `${signedPctLabel(best.changePercent)} · ${best.name}` : "No quotes yet"} />
						<StatTile label="Worst today" icon={TrendingDown} value={worst ? worst.ticker : "—"} color={worst ? changeColor(worst.changePercent) : DESK.muted} sub={worst ? `${signedPctLabel(worst.changePercent)} · ${worst.name}` : "Needs two quoted companies"} />
					</div>
				)}

				{/* Not stretched: the table is only as tall as its rows, whatever the rail beside it needs. */}
				<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
					<SavedCompaniesPanel
						holdings={held}
						brands={swipedBrands}
						loading={loading}
						title="Companies"
						icon={Layers}
						subtitle={`Everything you've saved in ${title}.`}
						limit={Infinity}
						presorted
						compact
						sinceSaved
						unreadTickers={unreadTickers}
						headerExtra={sortChips || undefined}
						emptyText={`Nothing in ${title} yet. Save companies in Discover and they're grouped here.`}
						onOpenStock={openStock}
						onPractice={(ticker) => navigate({ to: "/simulate", search: { buy: ticker } })}
						onRemove={(brandId) => { removeFromStak(brandId).catch(() => toast.error("Couldn't remove it. Try again.")); }}
						onViewAll={() => navigate({ to: "/my-stak/collections" })}
						onDiscover={discover}
					/>

					<aside className="flex flex-col gap-5" aria-label="More about this collection">
						<Panel label={`What changed in ${title}`} className="gap-3 p-4">
							<PanelHeader icon={TrendingUp} title="What changed" subtitle={changes.length ? `Recent updates at ${title} companies.` : "Nothing new here this week."} action={changes.length ? "All updates" : undefined} onAction={() => navigate({ to: "/my-stak/updates" })} />
							{loading ? (
								<SkeletonBar width="100%" height={60} />
							) : changes.length > 0 && (
								<ul className="flex flex-col">
									{changes.map((u, i) => (
										<li key={u.id} className={i > 0 ? "border-t" : ""} style={{ borderColor: DESK.border }}>
											<button type="button" onClick={() => navigate({ to: "/my-stak/updates" })} className={`flex w-full flex-col gap-[2px] rounded-md py-2 text-left transition-colors hover:bg-white/[0.03] ${deskFocus}`}>
												<span className="flex items-center gap-2 text-[11.5px]" style={{ color: DESK.muted }}>
													<span className="font-semibold text-white">{u.ticker}</span> · {kindLabel(u.kind)}
													{!u.read && <><span className="ml-auto h-[7px] w-[7px] rounded-full" style={{ background: DESK.cyan }} aria-hidden="true" /><span className="sr-only">New</span></>}
												</span>
												<span className="line-clamp-2 text-[12.5px] leading-[18px]" style={{ color: DESK.body }}>{u.title}</span>
											</button>
										</li>
									))}
								</ul>
							)}
						</Panel>

					</aside>
				</div>

				{/* The other collections as a full-width row of tiles: keep browsing, without making the rail outgrow the table. */}
				{others.length > 0 && (
					<Panel label="Your other collections" className="gap-4 p-5">
						<PanelHeader icon={Layers} title="Your other collections" badge={others.length} action="View all" onAction={() => navigate({ to: "/my-stak/collections" })} />
						<div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
							{others.slice(0, OTHERS_SHOWN).map((g) => (
								<CollectionTile
									key={g.id}
									group={g}
									brandById={brandById}
									move={groupChangePct(g.holdings)}
									hasUpdate={g.holdings.some((h) => unreadTickers.has(h.ticker.toUpperCase()))}
									onOpen={(gid) => navigate({ to: "/my-stak/collection/$id", params: { id: gid } })}
								/>
							))}
						</div>
					</Panel>
				)}
			</div>
		</div>
	);
}
