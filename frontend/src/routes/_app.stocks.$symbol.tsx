import { StockDetailSkeleton } from "@/app/stocks/StockDetailSkeleton";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { stockDetails } from "@/app/stocks/data";
import { AddSuccessSheet } from "@/app/simulate/sheets";
import { PracticeBuySheet } from "@/app/stocks/PracticeBuySheet";
import { StockDetail } from "@/app/stocks/StockDetail";

type StockSearch = {
	saved?: boolean;
	open?: boolean;
	ticket?: boolean;
	sheet?: boolean;
	from?: "discover" | "my-stak";
	/** slug of the My STAK collection the detail was opened from (Back returns there) */
	collection?: string;
	/** the practice-buy ticket was confirmed: "Order filled" sheet */
	filled?: boolean;
	loading?: boolean;
};

const flag = (v: unknown) => (v === true || v === 1 || v === "1" || v === "true" ? true : undefined);

export const Route = createFileRoute("/_app/stocks/$symbol")({
	validateSearch: (s: Record<string, unknown>): StockSearch => ({
		saved: flag(s.saved),
		open: flag(s.open),
		ticket: flag(s.ticket),
		sheet: flag(s.sheet),
		from: s.from === "my-stak" ? "my-stak" : undefined,
		collection: typeof s.collection === "string" && s.collection ? s.collection : undefined,
		filled: flag(s.filled),
		loading: flag(s.loading),
	}),
	component: StockPage,
});

/**
 * Figma "Desktop · Stock detail" states: ?saved=1 (SINCE YOU SAVED, Unsave), ?open=1 (analyst view
 * unfolded), ?ticket=1 (practice-buy ticket over the dimmed page), ?from=my-stak (My STAK entry:
 * flowing header, "My STAK / AAPL"), ?sheet=1 (the My STAK sheet variant with its darker scrim).
 * Demo data exists for AAPL; other symbols fall back to it.
 */
function StockPage() {
	const { symbol } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate();
	if (search.loading) return <StockDetailSkeleton />;
	const key = symbol.toUpperCase() as keyof typeof stockDetails;
	const stock = stockDetails[key] ?? stockDetails.AAPL;
	const from = search.from ?? "discover";
	const update = (patch: StockSearch) =>
		navigate({ to: "/stocks/$symbol", params: { symbol }, search: { ...search, ...patch } });
	const ticketUp = !!search.ticket || !!search.sheet;

	return (
		<>
			<StockDetail
				stock={stock}
				saved={!!search.saved}
				open={!!search.open}
				dim={!!search.ticket}
				from={from}
				onBack={() => {
					if (from !== "my-stak") navigate({ to: "/discover" });
					else if (search.collection) navigate({ to: "/my-stak/$collection", params: { collection: search.collection } });
					else navigate({ to: "/my-stak" });
				}}
				onToggleSaved={() => update({ saved: search.saved ? undefined : true })}
				onToggleOpen={() => update({ open: search.open ? undefined : true })}
				onPracticeBuy={() => update({ ticket: true })}
			/>
			{ticketUp && (
				<PracticeBuySheet
					symbol={stock.symbol}
					name={stock.name}
					initial={stock.initial}
					price={stock.price}
					changeShort={stock.changeShort}
					shares={stock.shares}
					offsetY={0.5}
					scrim={search.sheet ? "rgba(3,4,9,0.83)" : undefined}
					onClose={() => update({ ticket: undefined, sheet: undefined })}
					onConfirm={() => update({ ticket: undefined, sheet: undefined, filled: true })}
				/>
			)}
			{search.filled && (
				<AddSuccessSheet
					symbol={stock.symbol}
					stock={{
						name: stock.name,
						nameConfirm: stock.name,
						price: Number(String(stock.price).replace(/[^0-9.]/g, "")),
						pct: stock.changeShort,
						up: !String(stock.changeShort).includes("\u25bc"),
						initial: stock.initial,
					}}
					amount={25}
					onPrimary={() => navigate({ to: "/my-stak" })}
					onClose={() => update({ filled: undefined })}
				/>
			)}
		</>
	);
}
