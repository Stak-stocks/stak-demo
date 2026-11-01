import { ArrowRight, Bell, Bookmark, ChevronRight, CircleDot, FileSearch, Layers, Lightbulb, Search, TrendingUp, Users } from "lucide-react";
import type { BrandSummary } from "@stak/shared";
import type { Group } from "@/lib/collections";
import type { StockUpdateDto } from "@/lib/api";
import type { SearchEntry, StakSaveEntry } from "@/context/AccountContext";
import type { Graph } from "@/lib/tasteGraph";
import { isEmptyGraph, restShare, subtitleOf, summaryOf } from "@/lib/tasteGraph";
import { collectionTileArt } from "@/lib/collectionArt";
import { ageLabel } from "@/lib/notifications";
import { heldCountLabel } from "@/components/mystak/CollectionChip";
import { BrandLogo } from "@/components/BrandLogo";
import { CARD_ART_FALLBACK } from "@/components/discover/discoverTheme";
import { DESK, DeskButton, Panel, PanelHeader, SkeletonBar, ThemeBarRow, changeColor, deskFocus, signedPctLabel } from "@/components/desktop/deskKit";


// ── Your collections ────────────────────────────────────────────────────────────────────────────
const COLLECTIONS_SHOWN = 5;
const LOGOS_SHOWN = 4;
// auto-fit: fewer than a row's worth of collections stretch to fill it instead of leaving blank slots.
const TILE_GRID = "grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3";

/** "NVIDIA, AMD and 3 more" - the collection's own companies, so nothing about it is invented. */
function companiesLine(names: string[]): string {
	if (names.length <= 2) return names.join(" and ");
	const rest = names.length - 2;
	return `${names[0]}, ${names[1]} and ${rest} more`;
}

/**
 * A collection tile: its photo, name and size, the companies in it, their logos (+N) - and, where the page has them,
 * today's average move and a dot when one of its companies has an unread update.
 */
export function CollectionTile({ group, brandById, onOpen, move, hasUpdate = false }: {
	group: Group;
	brandById: Map<string, BrandSummary>;
	onOpen: (id: string) => void;
	move?: number | null;
	hasUpdate?: boolean;
}) {
	const art = collectionTileArt(group.name, group.holdings[0]?.ticker);
	const shown = group.holdings.slice(0, LOGOS_SHOWN);
	const more = group.holdings.length - shown.length;
	return (
		<button
			type="button"
			onClick={() => onOpen(group.id)}
			className={`group flex min-w-0 flex-col overflow-hidden rounded-[14px] text-left transition-transform hover:-translate-y-[2px] ${deskFocus}`}
			style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}
		>
			<div className="relative aspect-[16/9] w-full overflow-hidden" style={{ background: DESK.artBg }}>
				{art && <img src={art} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" onError={(e) => { e.currentTarget.src = CARD_ART_FALLBACK; }} />}
				{hasUpdate && (
					<span className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-[2px] text-[10.5px] font-semibold" style={{ background: "rgba(10,16,32,0.8)", color: DESK.cyan }}>
						<span className="h-[6px] w-[6px] rounded-full" style={{ background: DESK.cyan }} aria-hidden="true" /> New update
					</span>
				)}
			</div>
			<div className="flex flex-1 flex-col gap-1 p-3">
				<p className="truncate text-[14px] font-semibold text-white">{group.name}</p>
				<p className="text-[11.5px]" style={{ color: DESK.muted }}>
					{heldCountLabel(group.holdings.length)}
					{move != null && <> · <span style={{ color: changeColor(move) }}>{signedPctLabel(move)} today</span></>}
				</p>
				<p className="line-clamp-2 text-[12px] leading-[17px]" style={{ color: DESK.body }}>{companiesLine(group.holdings.map((h) => h.name))}</p>
				<div className="mt-auto flex items-center gap-[6px] pt-2">
					{shown.map((h) => {
						const brand = brandById.get(h.brandId);
						return brand ? <BrandLogo key={h.brandId} brand={brand} className="h-[24px] w-[24px] rounded-[6px]" alt="" /> : null;
					})}
					{more > 0 && <span className="grid h-[24px] min-w-[24px] place-items-center rounded-[6px] px-1 text-[10.5px]" style={{ background: DESK.track, color: DESK.body }}>+{more}</span>}
				</div>
			</div>
		</button>
	);
}

export function CollectionsPanel({ groups, brandById, loading, failed, onRetry, onOpen, onViewAll, onDiscover }: {
	groups: Group[];
	brandById: Map<string, BrandSummary>;
	loading: boolean;
	/** Saves exist but the company list didn't load: an empty grid would pass for "nothing saved". */
	failed: boolean;
	onRetry: () => void;
	onOpen: (id: string) => void;
	onViewAll: () => void;
	onDiscover: () => void;
}) {
	return (
		<Panel label="Your collections" className="gap-4 p-5">
			<PanelHeader
				icon={Layers}
				title="Your collections"
				badge={groups.length}
				subtitle="Your saved companies, grouped by what they do."
				action={groups.length > 0 ? "View all collections" : undefined}
				onAction={onViewAll}
			/>
			{loading ? (
				<div className={TILE_GRID}>{[0, 1, 2, 3, 4].map((i) => <SkeletonBar key={i} width="100%" height={250} className="rounded-[14px]" />)}</div>
			) : failed ? (
				<div className="flex items-center gap-3 py-2 text-[13px]" style={{ color: DESK.muted }}>
					Couldn't load the company list, so your saved companies can't be shown right now.
					<button type="button" onClick={onRetry} className={`shrink-0 rounded-md font-medium ${deskFocus}`} style={{ color: DESK.cyan }}>Try again</button>
				</div>
			) : groups.length === 0 ? (
				<div className="flex flex-col items-start gap-3 py-4">
					<p className="text-[14px] text-white">Nothing saved yet.</p>
					<p className="text-[13px]" style={{ color: DESK.muted }}>Swipe right on companies in Discover and they're grouped into collections here.</p>
					<DeskButton size="sm" onClick={onDiscover} className="mt-1 self-start">Go to Discover</DeskButton>
				</div>
			) : (
				<div className={TILE_GRID}>
					{groups.slice(0, COLLECTIONS_SHOWN).map((group) => <CollectionTile key={group.id} group={group} brandById={brandById} onOpen={onOpen} />)}
				</div>
			)}
		</Panel>
	);
}

// ── Updates in your STAK ────────────────────────────────────────────────────────────────────────
const UPDATE_ROWS = 5;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function UpdatesPanel({ updates, unread, brandByTicker, loading, failed, onOpen }: {
	updates: StockUpdateDto[];
	unread: number;
	brandByTicker: Map<string, BrandSummary>;
	loading: boolean;
	failed: boolean;
	onOpen: () => void;
}) {
	// The server only sends the last 7 days (same window as the app), so every update here is from this week.
	const companiesThisWeek = new Set(updates.map((u) => u.ticker.toUpperCase())).size;
	// Unread first, then newest. Five rows keep this panel level with Investing Taste beside it.
	const rows = [...updates].sort((a, b) => Number(a.read) - Number(b.read) || Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, UPDATE_ROWS);
	const line = loading
		? "Checking your saved companies…"
		: failed && updates.length === 0
			? "Couldn't check your saved companies right now."
			: companiesThisWeek > 0
				? `${companiesThisWeek} of your saved ${companiesThisWeek === 1 ? "company" : "companies"} had notable updates this week.`
				: "Nothing new at your saved companies this week.";

	return (
		<Panel label="Updates in your STAK" className="gap-3 p-4">
			<PanelHeader icon={Bell} title="Updates in your STAK" subtitle={line} />
			{loading && <div className="flex flex-col gap-3">{[0, 1, 2, 3, 4].map((i) => <SkeletonBar key={i} width="100%" height={30} />)}</div>}
			{rows.length > 0 && (
				<ul className="flex flex-col">
					{rows.map((u, i) => {
						const brand = brandByTicker.get(u.ticker.toUpperCase());
						return (
							<li key={u.id} className={i > 0 ? "border-t" : ""} style={{ borderColor: DESK.border }}>
								<button type="button" onClick={onOpen} className={`flex w-full items-center gap-3 rounded-md py-[7px] text-left transition-colors hover:bg-white/[0.03] ${deskFocus}`}>
									{brand ? <BrandLogo brand={brand} className="h-[26px] w-[26px] rounded-[7px]" alt="" /> : <span className="h-[26px] w-[26px] rounded-[7px]" style={{ background: DESK.track }} />}
									<span className="w-[52px] shrink-0 text-[12.5px] font-semibold text-white">{u.ticker}</span>
									<span className="min-w-0 flex-1 truncate text-[12.5px]" style={{ color: DESK.body }}>{u.title}</span>
									{!u.read && <><CircleDot className="h-[12px] w-[12px] shrink-0" style={{ color: DESK.cyan }} aria-hidden="true" /><span className="sr-only">New</span></>}
									<span className="w-[46px] shrink-0 text-right text-[11.5px]" style={{ color: DESK.muted }}>{shortDate(u.occurredAt)}</span>
									<ChevronRight className="h-[15px] w-[15px] shrink-0" style={{ color: DESK.faint }} aria-hidden="true" />
								</button>
							</li>
						);
					})}
				</ul>
			)}
			{updates.length > 0 && (
				<DeskButton size="sm" onClick={onOpen} className="mt-auto self-start">
					{unread > 0 ? "See what changed" : "Read them again"} <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
				</DeskButton>
			)}
		</Panel>
	);
}

// ── Investing Taste, with why ───────────────────────────────────────────────────────────────────
function Stat({ icon: Icon, value, label, sub }: { icon: typeof Bookmark; value: number; label: string; sub?: string }) {
	return (
		<div className="flex items-start gap-3">
			<Icon className="mt-[2px] h-[16px] w-[16px] shrink-0" style={{ color: DESK.cyan }} aria-hidden="true" />
			<div className="min-w-0">
				<p className="text-[13px] text-white"><span className="font-semibold">{value}</span> {label}</p>
				{sub && <p className="truncate text-[11.5px]" style={{ color: DESK.muted }}>{sub}</p>}
			</div>
		</div>
	);
}

export function TasteWhyPanel({ taste, failed, searches, onOpen, onRetry }: {
	taste: Graph | null;
	failed: boolean;
	searches: number;
	onOpen: () => void;
	onRetry: () => void;
}) {
	const themes = taste && !isEmptyGraph(taste) ? taste.themes.slice(0, 6) : [];
	const top = themes.slice(0, 2).map((t) => t.label);
	const opens = taste?.themes.reduce((sum, t) => sum + t.opens, 0) ?? 0;
	const learnMores = taste?.themes.reduce((sum, t) => sum + t.learnMores, 0) ?? 0;

	return (
		<Panel label="Investing Taste" className="gap-3 p-4">
			<PanelHeader icon={TrendingUp} title="Investing Taste" subtitle="Your top interests, from the companies you save and explore." action="View details" onAction={onOpen} />
			{!taste ? (
				failed ? (
					<div className="flex items-center gap-3 text-[12.5px]" style={{ color: DESK.muted }}>
						We couldn't load your interests.
						<button type="button" onClick={onRetry} className={`rounded-md font-medium ${deskFocus}`} style={{ color: DESK.cyan }}>Try again</button>
					</div>
				) : (
					<div className="flex flex-col gap-4">{[0, 1, 2, 3].map((i) => <SkeletonBar key={i} width="100%" height={18} />)}</div>
				)
			) : (
				<div className="grid gap-3 min-[1180px]:grid-cols-[minmax(0,1fr)_220px]">
					{themes.length === 0 ? (
						<div className="flex flex-col gap-1">
							<p className="text-[13.5px] font-semibold text-white">{summaryOf(taste)}</p>
							<p className="text-[12.5px] leading-[18px]" style={{ color: DESK.muted }}>{subtitleOf(taste)}</p>
						</div>
					) : (
						<ul className="flex flex-col justify-between gap-[6px]">
							{themes.map((theme) => <li key={theme.category}><ThemeBarRow label={theme.label} share={theme.share} /></li>)}
							{taste && restShare(taste, themes.length) > 0.01 && <li><ThemeBarRow label="Other interests" share={restShare(taste, themes.length)} other /></li>}
						</ul>
					)}
					<aside className="flex flex-col gap-2 rounded-[12px] p-3" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }} aria-label="Why we think this">
						<p className="flex items-center gap-2 text-[13px] font-semibold text-white"><Lightbulb className="h-[15px] w-[15px]" style={{ color: DESK.cyan }} aria-hidden="true" /> Why we think this</p>
						<p className="text-[11.5px] leading-[16px]" style={{ color: DESK.muted }}>We look at the companies you save, the company pages you open and what you look into.</p>
						<Stat icon={Bookmark} value={taste.totalSaves} label={taste.totalSaves === 1 ? "saved company" : "saved companies"} sub={top.length ? `Many are in ${top.join(" and ")}` : undefined} />
						<Stat icon={FileSearch} value={opens + learnMores} label="company pages & Quick Looks" sub="What you've looked into" />
						<Stat icon={Search} value={searches} label={searches === 1 ? "recent search" : "recent searches"} />
					</aside>
				</div>
			)}
		</Panel>
	);
}

// ── Recent activity ─────────────────────────────────────────────────────────────────────────────
interface ActivityItem { key: string; at: number; icon: typeof Bookmark; title: string; sub: string; ticker?: string }

/** The newest saves and searches, merged by time - the activity the account actually records. */
export function buildActivity(
	saves: Record<string, StakSaveEntry> | undefined,
	searches: SearchEntry[] | undefined,
	brandById: Map<string, BrandSummary>,
	collectionOf: (ticker: string) => string,
): ActivityItem[] {
	const items: ActivityItem[] = [];
	for (const [brandId, entry] of Object.entries(saves ?? {})) {
		const brand = brandById.get(brandId);
		if (!brand || !entry.savedAt) continue;
		items.push({ key: `save-${brandId}`, at: entry.savedAt, icon: Bookmark, title: `Added ${brand.name} to ${collectionOf(brand.ticker)}`, sub: `My STAK · ${brand.ticker}`, ticker: brand.ticker });
	}
	for (const s of searches ?? []) {
		if (!s.at) continue;
		items.push({ key: `search-${s.query}-${s.at}`, at: s.at, icon: Search, title: `Searched for "${s.query}"`, sub: "Search" });
	}
	return items.sort((a, b) => b.at - a.at).slice(0, 6);
}

export function ActivityPanel({ items, loading, onOpenStock }: { items: ActivityItem[]; loading: boolean; onOpenStock: (ticker: string) => void }) {
	const now = Date.now();
	return (
		<Panel label="Recent activity" className="gap-2 p-4">
			<PanelHeader icon={Users} title="Recent activity" subtitle="Your latest saves and searches." />
			{loading ? (
				<div className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <SkeletonBar key={i} width="100%" height={30} />)}</div>
			) : items.length === 0 ? (
				<p className="text-[13px]" style={{ color: DESK.muted }}>Nothing yet. Your saves and searches show up here.</p>
			) : (
				<ul className="flex flex-col">
					{items.map((item, i) => {
						const Icon = item.icon;
						const body = (
							<>
								<span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px]" style={{ background: DESK.cyanSoft }}>
									<Icon className="h-[14px] w-[14px]" style={{ color: DESK.cyan }} aria-hidden="true" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-[12.5px] text-white">{item.title}</span>
									<span className="block truncate text-[11px]" style={{ color: DESK.muted }}>{item.sub}</span>
								</span>
								<span className="shrink-0 text-[11px]" style={{ color: DESK.muted }}>{ageLabel(now - item.at)}</span>
							</>
						);
						return (
							<li key={item.key} className={i > 0 ? "border-t" : ""} style={{ borderColor: DESK.border }}>
								{item.ticker ? (
									<button type="button" onClick={() => onOpenStock(item.ticker!)} className={`flex w-full items-center gap-3 rounded-md py-[6px] text-left transition-colors hover:bg-white/[0.03] ${deskFocus}`}>{body}</button>
								) : (
									<div className="flex items-center gap-3 py-[6px]">{body}</div>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</Panel>
	);
}
