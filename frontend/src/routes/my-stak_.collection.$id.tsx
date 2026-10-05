import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useIsMobile } from "@/hooks/use-mobile";
import { CollectionDesktop } from "@/components/mystak/desktop/CollectionDesktop";
import { useCollections } from "@/hooks/useCollections";
import { useAccount } from "@/context/AccountContext";
import { categoryIcon } from "@/lib/categoryIcons";
import { COLLECTION_SORTS as SORTS, groupChangePct, sortHoldings, type CollectionSort as SortKey, type Holding } from "@/lib/collections";
import { signedPct, usd } from "@/lib/simFormat";
import { heldCountLabel } from "@/components/mystak/CollectionChip";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { IconTile, PRESS, PhonePage, BackCircle, f, focusRing, sheetCard } from "@/components/phone/phone";

export const Route = createFileRoute("/my-stak_/collection/$id")({
	component: CollectionRoute,
});

/** Desktop: banner, stats, the full table and a rail; the phone keeps Android's tile grid. */
function CollectionRoute() {
	const { id } = Route.useParams();
	return useIsMobile() ? <CollectionDetailPage /> : <CollectionDesktop id={id} />;
}

const LONG_PRESS_MS = 500;

/** Tap opens the stock; a long press (or right-click, or Delete) asks to remove it - Android has no visible Remove button. */
function StockTile({ holding, onOpen, onRemove }: { holding: Holding; onOpen: () => void; onRemove: () => void }) {
	const up = (holding.changePercent ?? 0) >= 0;
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const longPressed = useRef(false);
	const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

	return (
		<button
			type="button"
			aria-label={`${holding.name}. Press and hold, or press Delete, to remove from My STAK.`}
			className={`flex min-w-0 flex-1 select-none flex-col text-left ${PRESS}`}
			style={{ height: cu(144), gap: cu(10), padding: cu(14), ...sheetCard(16), touchAction: "manipulation", ...focusRing }}
			onPointerDown={() => {
				longPressed.current = false;
				cancel();
				timer.current = setTimeout(() => { longPressed.current = true; onRemove(); }, LONG_PRESS_MS);
			}}
			onPointerUp={cancel}
			onPointerLeave={cancel}
			onPointerCancel={cancel}
			onContextMenu={(e) => { e.preventDefault(); onRemove(); }}
			onKeyDown={(e) => { if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); onRemove(); } }}
			onClick={() => { if (!longPressed.current) onOpen(); }}
		>
			<div className="flex items-center">
				<div className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(36), height: cu(36), background: DISC.avatar, font: f(600, 14, undefined, "heading"), color: DISC.badgeInk }}>
					{holding.ticker.slice(0, 1)}
				</div>
				<span className="ml-auto" style={{ font: f(500, 12), color: up ? DISC.green : DISC.redDown }}>
					{holding.changePercent != null ? `${up ? "▲" : "▼"} ${Math.abs(holding.changePercent).toFixed(1)}%` : "—"}
				</span>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
				<p style={{ font: f(600, 16, 20, "heading"), color: "#fff" }}>{holding.ticker}</p>
				<p style={{ font: f(400, 11, 14), color: DISC.muted }}>{holding.name}</p>
			</div>
			<p style={{ font: f(500, 15, 19, "heading"), color: "#fff" }}>{holding.price != null ? usd(holding.price) : "—"}</p>
		</button>
	);
}

function AddStockTile({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`relative flex min-w-0 flex-1 flex-col items-center justify-center ${PRESS}`}
			style={{ height: cu(144), gap: cu(8), padding: cu(14), ...focusRing }}
		>
			<svg className="absolute inset-0 h-full w-full" aria-hidden="true">
				<rect x="0.75" y="0.75" width="calc(100% - 1.5px)" height="calc(100% - 1.5px)" rx="16" fill="none" stroke={DISC.divider} strokeWidth="1.5" strokeDasharray="6 5" />
			</svg>
			<Plus style={{ width: cu(24), height: cu(24) }} color={DISC.muted} aria-hidden="true" />
			<span style={{ font: f(500, 13), color: DISC.muted }}>Add stock</span>
		</button>
	);
}

function CollectionDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { removeFromStak } = useAccount();
	const { allBrandsLoading, swipedBrands, batchQuotes, accountLoading } = useMyStakData();
	const { groups } = useCollections(swipedBrands, batchQuotes);

	const group = groups.find((g) => g.id === id) ?? null;
	const loading = allBrandsLoading || accountLoading;
	const [sort, setSort] = useState<SortKey>("newest");
	const [removing, setRemoving] = useState<string | null>(null);

	const held = useMemo(() => sortHoldings(group?.holdings ?? [], sort), [group, sort]);
	const move = group ? groupChangePct(group.holdings) : null;
	const title = group?.name ?? "Collection";
	const quotesPending = held.length > 0 && Object.keys(batchQuotes).length === 0;

	const openStock = useCallback((ticker: string) => navigate({ to: "/stock/$symbol", params: { symbol: ticker } }), [navigate]);

	function confirmRemove(ticker: string) {
		const holding = held.find((h) => h.ticker === ticker);
		setRemoving(null);
		if (holding) removeFromStak(holding.brandId).catch(() => {});
	}

	// The grid is holdings plus one trailing "Add stock" tile, in rows of two (a lone last cell keeps its half-width slot).
	const cells: Array<Holding | null> = [...held, null];
	const rows: Array<Array<Holding | null>> = [];
	for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2));

	return (
		<PhonePage>
			<div className="flex items-center" style={{ padding: `${cu(8)} ${cu(18)} ${cu(8)} ${cu(16)}` }}>
				<BackCircle onClick={() => navigate({ to: "/my-stak" })} />
				<h1 className="flex-1 text-center" style={{ font: f(600, 16, undefined, "heading"), color: "#fff" }}>{title}</h1>
				<div style={{ width: cu(40) }} aria-hidden="true" />
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: cu(20), padding: `${cu(16)} ${cu(20)} ${cu(26)}` }}>
				<div style={{ display: "flex", flexDirection: "column", gap: cu(10) }}>
					<IconTile icon={categoryIcon(title)} size={60} glyph={32} />
					<p style={{ font: f(600, 26, undefined, "heading"), color: "#fff" }}>{title}</p>
					<div className="flex items-center" style={{ gap: cu(7) }}>
						<span style={{ font: f(400, 13), color: DISC.muted }}>{!group && loading ? "—" : heldCountLabel(held.length)}</span>
						<span style={{ font: f(400, 13), color: DISC.faint }}>·</span>
						<span style={{ font: f(500, 13), color: (move ?? 0) >= 0 ? DISC.green : DISC.redDown }}>
							{quotesPending ? "Loading…" : move == null ? "No quote yet" : `${signedPct(move)} today`}
						</span>
					</div>
					<p style={{ font: f(400, 13), color: DISC.body }}>{loading ? "" : `The ${title} names you've saved.`}</p>
				</div>

				{held.length > 1 && (
					<div className="flex" style={{ gap: cu(8) }} role="group" aria-label="Sort holdings">
						{SORTS.map(([key, label]) => {
							const selected = sort === key;
							return (
								<button
									key={key}
									type="button"
									onClick={() => setSort(key)}
									aria-pressed={selected}
									className={PRESS}
									style={{
										padding: `${cu(6)} ${cu(12)}`, borderRadius: cu(14), font: f(500, 12, 16),
										background: selected ? "rgba(57,197,203,0.15)" : DISC.cardDark,
										border: selected ? `${cu(1)} solid ${DISC.blue}` : `${cu(1)} solid transparent`,
										color: selected ? DISC.teal : DISC.muted, ...focusRing,
									}}
								>
									{label}
								</button>
							);
						})}
					</div>
				)}

				{removing && (
					<div role="alertdialog" aria-label={`Remove ${removing} from My STAK?`} className="flex items-center" style={{ gap: cu(12), ...sheetCard(12), padding: `${cu(12)} ${cu(14)}` }}>
						<span className="flex-1" style={{ font: f(500, 13), color: "#fff" }}>Remove {removing} from My STAK?</span>
						<button type="button" onClick={() => setRemoving(null)} className={PRESS} style={{ font: f(500, 13), color: DISC.muted, ...focusRing }}>Keep</button>
						<button type="button" onClick={() => confirmRemove(removing)} className={PRESS} style={{ font: f(500, 13), color: DISC.redDown, ...focusRing }}>Remove</button>
					</div>
				)}

				<div style={{ display: "flex", flexDirection: "column", gap: cu(10) }}>
					{rows.map((row) => (
						<div key={row[0]?.ticker ?? "add"} className="flex" style={{ gap: cu(10) }}>
							{row.map((cell) => cell
								? <StockTile key={cell.ticker} holding={cell} onOpen={() => openStock(cell.ticker)} onRemove={() => setRemoving(cell.ticker)} />
								: <AddStockTile key="add" onClick={() => navigate({ to: "/discover" })} />)}
							{row.length === 1 && <div className="flex-1" aria-hidden="true" />}
						</div>
					))}
				</div>
			</div>

		</PhonePage>
	);
}
