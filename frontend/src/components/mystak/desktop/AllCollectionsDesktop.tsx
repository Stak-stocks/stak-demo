import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useCollections } from "@/hooks/useCollections";
import { useUpdates } from "@/hooks/useUpdates";
import { groupChangePct, type Group } from "@/lib/collections";
import { heldCountLabel } from "@/components/mystak/CollectionChip";
import { DesktopTopBar } from "@/components/desktop/DesktopTopBar";
import { DESK, DeskButton, SkeletonBar, deskFocus, deskPageBg } from "@/components/desktop/deskKit";
import { CollectionTile } from "./MyStakPanels";

type Order = "size" | "az" | "today";
const ORDERS: ReadonlyArray<readonly [Order, string]> = [["size", "Most companies"], ["az", "A–Z"], ["today", "Best today"]];

/** "Most companies" is the phone's own order (groupHoldings: biggest first, "Other" last). */
function ordered(groups: Group[], order: Order): Group[] {
	if (order === "az") return [...groups].sort((a, b) => a.name.localeCompare(b.name));
	if (order === "today") return [...groups].sort((a, b) => (groupChangePct(b.holdings) ?? -Infinity) - (groupChangePct(a.holdings) ?? -Infinity));
	return groups;
}

/** Every collection on desktop: a sortable grid of the same tiles as the My STAK overview, with today's move and new-update badges. */
export function AllCollectionsDesktop() {
	const navigate = useNavigate();
	const { swipedBrands, batchQuotes, allBrandsLoading, accountLoading } = useMyStakData();
	const { groups, holdings } = useCollections(swipedBrands, batchQuotes);
	const { updates } = useUpdates();
	const [order, setOrder] = useState<Order>("size");

	const loading = allBrandsLoading || accountLoading;
	const brandById = useMemo(() => new Map(swipedBrands.map((b) => [b.id, b])), [swipedBrands]);
	const unread = useMemo(() => new Set(updates.filter((u) => !u.read).map((u) => u.ticker.toUpperCase())), [updates]);
	const shown = useMemo(() => ordered(groups, order), [groups, order]);

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-10 pt-5">
				<DesktopTopBar />

				<header className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12.5px]" style={{ color: DESK.muted }}>
							<button type="button" onClick={() => navigate({ to: "/my-stak" })} className={`rounded-md hover:text-white ${deskFocus}`}>My STAK</button>
							<ChevronRight className="h-[13px] w-[13px]" aria-hidden="true" />
							<span aria-current="page" className="text-white">Collections</span>
						</nav>
						<h1 className="mt-1 font-heading text-[28px] font-semibold leading-[36px] text-white">Your collections</h1>
						<p className="text-[14px]" style={{ color: DESK.muted }}>
							{loading ? "Loading…" : `${groups.length} ${groups.length === 1 ? "collection" : "collections"} · ${heldCountLabel(holdings.length)}, grouped by what they do.`}
						</p>
					</div>
					{groups.length > 1 && (
						<div className="flex flex-wrap gap-2" role="group" aria-label="Sort collections">
							{ORDERS.map(([key, label]) => {
								const on = order === key;
								return (
									<button
										key={key}
										type="button"
										aria-pressed={on}
										onClick={() => setOrder(key)}
										className={`rounded-full px-3 py-[6px] text-[12.5px] transition-colors ${deskFocus}`}
										style={on ? DESK.chipOn : { color: DESK.body, background: "rgba(255,255,255,0.03)", border: `1px solid ${DESK.border}` }}
									>
										{label}
									</button>
								);
							})}
						</div>
					)}
				</header>

				{loading ? (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">{[0, 1, 2, 3, 4, 5].map((i) => <SkeletonBar key={i} width="100%" height={280} className="rounded-[14px]" />)}</div>
				) : groups.length === 0 ? (
					<div className="flex flex-col items-start gap-3 rounded-[16px] p-6" style={{ background: DESK.panel, border: `1px solid ${DESK.border}` }}>
						<p className="text-[15px] text-white">No collections yet.</p>
						<p className="text-[13px]" style={{ color: DESK.muted }}>Save companies in Discover and they're grouped into collections here.</p>
						<DeskButton size="sm" onClick={() => navigate({ to: "/discover" })}>Go to Discover</DeskButton>
					</div>
				) : (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
						{shown.map((g) => (
							<CollectionTile
								key={g.id}
								group={g}
								brandById={brandById}
								move={groupChangePct(g.holdings)}
								hasUpdate={g.holdings.some((h) => unread.has(h.ticker.toUpperCase()))}
								onOpen={(id) => navigate({ to: "/my-stak/collection/$id", params: { id } })}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
