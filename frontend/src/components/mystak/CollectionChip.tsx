import { categoryIcon } from "@/lib/categoryIcons";
import type { Group } from "@/lib/collections";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { IconTile, PRESS, f, focusRing } from "@/components/phone/phone";

export function heldCountLabel(count: number): string {
	return `${count} ${count === 1 ? "company" : "companies"}`;
}

/** One collection chip: icon tile, name + count, chevron, and a dot when one of its companies has an unopened
 *  update. Android's CollectionChip: r12, 12u padding, 34u tile; the text is allowed to overflow, not truncate. */
export function CollectionChip({ group, hasUpdate, onClick }: { group: Group; hasUpdate: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`relative flex min-w-0 flex-1 items-center text-left ${PRESS}`}
			style={{ gap: cu(10), padding: cu(12), borderRadius: cu(12), background: DISC.sheet, ...focusRing }}
		>
			<IconTile icon={categoryIcon(group.name)} />
			<div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
				<p className="whitespace-nowrap" style={{ font: f(600, 13, 16, "heading"), color: "#fff" }}>{group.name}</p>
				<p className="whitespace-nowrap" style={{ font: f(400, 11, 14), color: DISC.muted }}>{heldCountLabel(group.holdings.length)}</p>
			</div>
			<span style={{ font: f(400, 16), color: DISC.faint }} aria-hidden="true">›</span>
			{hasUpdate && (
				<>
					<span className="absolute rounded-full" style={{ right: cu(8), top: cu(8), width: cu(8), height: cu(8), background: DISC.teal }} aria-hidden="true" />
					<span className="sr-only">has updates</span>
				</>
			)}
		</button>
	);
}
