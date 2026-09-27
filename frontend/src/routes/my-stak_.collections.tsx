import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useCollections } from "@/hooks/useCollections";
import { useUpdates } from "@/hooks/useUpdates";
import { useIsMobile } from "@/hooks/use-mobile";
import { AllCollectionsDesktop } from "@/components/mystak/desktop/AllCollectionsDesktop";
import { CollectionGrid } from "@/components/mystak/CollectionGrid";
import { heldCountLabel } from "@/components/mystak/CollectionChip";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PhonePage, SubPageBar, f } from "@/components/phone/phone";

export const Route = createFileRoute("/my-stak_/collections")({
	component: CollectionsRoute,
});

/** Desktop: a sortable grid of rich tiles; the phone keeps Android's two-column chips. */
function CollectionsRoute() {
	return useIsMobile() ? <AllCollectionsPage /> : <AllCollectionsDesktop />;
}

function AllCollectionsPage() {
	const navigate = useNavigate();
	const { swipedBrands, batchQuotes } = useMyStakData();
	const { groups, holdings } = useCollections(swipedBrands, batchQuotes);
	const { updates } = useUpdates();
	const unreadTickers = useMemo(() => new Set(updates.filter((u) => !u.read).map((u) => u.ticker)), [updates]);

	return (
		<PhonePage>
			<SubPageBar title="Collections" onBack={() => navigate({ to: "/my-stak" })} />
			<div style={{ display: "flex", flexDirection: "column", gap: cu(10), padding: `${cu(8)} ${cu(20)} ${cu(32)}` }}>
				<p style={{ font: f(400, 12, 16), color: DISC.muted }}>
					{groups.length} {groups.length === 1 ? "collection" : "collections"} · {heldCountLabel(holdings.length)}
				</p>
				<CollectionGrid
					groups={groups}
					unreadTickers={unreadTickers}
					onOpen={(id) => navigate({ to: "/my-stak/collection/$id", params: { id } })}
				/>
			</div>
		</PhonePage>
	);
}
