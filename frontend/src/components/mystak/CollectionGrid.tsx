import type { Group } from "@/lib/collections";
import { cu } from "@/components/discover/discoverTheme";
import { CollectionChip } from "./CollectionChip";

/** Android's CollectionGrid: always 2 columns, 10u apart; a lone last chip keeps its half-width slot. */
export function CollectionGrid({ groups, unreadTickers, onOpen }: {
	groups: Group[];
	unreadTickers: Set<string>;
	onOpen: (groupId: string) => void;
}) {
	const rows: Group[][] = [];
	for (let i = 0; i < groups.length; i += 2) rows.push(groups.slice(i, i + 2));
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: cu(10) }}>
			{rows.map((row) => (
				<div key={row[0].id} className="flex" style={{ gap: cu(10) }}>
					{row.map((group) => (
						<CollectionChip
							key={group.id}
							group={group}
							hasUpdate={group.holdings.some((h) => unreadTickers.has(h.ticker))}
							onClick={() => onOpen(group.id)}
						/>
					))}
					{row.length === 1 && <div className="flex-1" aria-hidden="true" />}
				</div>
			))}
		</div>
	);
}
