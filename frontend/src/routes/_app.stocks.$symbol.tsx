import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useLive } from "@/app/live";
import { NotFound } from "@/app/NotFound";
import { BuyFailedSheet } from "@/app/simulate/sheets";
import { useStockDetail } from "@/app/stocks/live";
import { OrderFilledSheet } from "@/app/stocks/OrderFilledSheet";
import { PracticeBuySheet } from "@/app/stocks/PracticeBuySheet";
import { StockDetail } from "@/app/stocks/StockDetail";
import { StockDetailSkeleton } from "@/app/stocks/StockDetailSkeleton";

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

type Phase = { kind: "idle" } | { kind: "buy" } | { kind: "failed" } | { kind: "filled"; shares: number; cash: number };

/**
 * Figma "Desktop · Stock detail" for any catalog ticker. Previews for the capture harness:
 * ?saved=1 (SINCE YOU SAVED, Unsave), ?open=1 (analyst view unfolded), ?ticket=1 (the ticket over
 * the dimmed page), ?from=my-stak (flowing header, "My STAK / AAPL"), ?sheet=1 (darker scrim),
 * ?filled=1 (the order-filled sheet), ?loading=1 (the skeleton). Real actions write the live state
 * and clear the preview they replace.
 */
function StockPage() {
	const { symbol } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate();
	const live = useLive();
	const detail = useStockDetail(symbol, { previewSaved: !!search.saved });
	const [phase, setPhase] = useState<Phase>({ kind: "idle" });
	const [open, setOpen] = useState<boolean | null>(null);

	if (search.loading || (detail.loading && !search.ticket)) return <StockDetailSkeleton />;
	if (!detail.known) return <NotFound />;

	const { data: stock, quote } = detail;
	const from = search.from ?? "discover";
	const price = quote?.price ?? 0;
	const update = (patch: StockSearch) => navigate({ to: "/stocks/$symbol", params: { symbol }, search: { ...search, ...patch }, replace: true });
	const ticketUp = phase.kind === "buy" || !!search.ticket || !!search.sheet;
	const analystOpen = open ?? !!search.open;

	const toggleSaved = async () => {
		if (detail.saved && !search.saved) {
			await live.actions.unsave(stock.symbol);
			toast("Removed from My STAK");
		} else if (!detail.saved) {
			await live.actions.save(stock.symbol, price || null);
			toast("Saved to My STAK");
		} else {
			// the preview said "saved" but the person has not saved it: make it real
			await live.actions.save(stock.symbol, price || null);
			toast("Saved to My STAK");
		}
		if (search.saved) update({ saved: undefined });
	};

	const confirmBuy = async (amount: number) => {
		try {
			const pos = await live.actions.buy(stock.symbol, amount, price);
			setPhase({ kind: "filled", shares: pos.shares, cash: Math.round((live.cash - amount) * 100) / 100 });
			if (search.ticket || search.sheet) update({ ticket: undefined, sheet: undefined });
			toast("Order filled");
		} catch {
			setPhase({ kind: "failed" });
			if (search.ticket || search.sheet) update({ ticket: undefined, sheet: undefined });
		}
	};

	const closeTicket = () => {
		setPhase({ kind: "idle" });
		if (search.ticket || search.sheet) update({ ticket: undefined, sheet: undefined });
	};

	return (
		<>
			<StockDetail
				stock={stock}
				saved={detail.saved}
				open={analystOpen}
				dim={phase.kind === "buy" || !!search.ticket}
				from={from}
				onBack={() => {
					if (from !== "my-stak") navigate({ to: "/discover" });
					else if (search.collection) navigate({ to: "/my-stak/$collection", params: { collection: search.collection } });
					else navigate({ to: "/my-stak" });
				}}
				onToggleSaved={() => void toggleSaved()}
				onToggleOpen={() => setOpen(!analystOpen)}
				onPracticeBuy={() => setPhase({ kind: "buy" })}
			/>
			{ticketUp && (
				<PracticeBuySheet
					ticker={stock.symbol}
					name={stock.name}
					initial={stock.initial}
					price={price}
					changeShort={stock.changeShort}
					cash={live.cash}
					offsetY={0.5}
					scrim={search.sheet ? "rgba(3,4,9,0.83)" : undefined}
					onClose={closeTicket}
					onConfirm={confirmBuy}
				/>
			)}
			{phase.kind === "failed" && (
				<BuyFailedSheet
					stock={{ name: stock.name, nameConfirm: stock.name, price, pct: stock.changeShort, up: !stock.changeShort.startsWith("▼"), initial: stock.initial }}
					onRetry={() => setPhase({ kind: "buy" })}
					onClose={() => setPhase({ kind: "idle" })}
				/>
			)}
			{(phase.kind === "filled" || search.filled) && (
				<OrderFilledSheet
					ticker={stock.symbol}
					name={stock.name}
					initial={stock.initial}
					price={price}
					changeShort={stock.changeShort}
					shares={phase.kind === "filled" ? phase.shares : price ? Math.round((25 / price) * 10000) / 10000 : 0}
					cash={phase.kind === "filled" ? phase.cash : Math.max(0, live.cash - 25)}
					onPrimary={() => navigate({ to: "/my-stak" })}
					onSecondary={() => {
						setPhase({ kind: "idle" });
						if (search.filled) update({ filled: undefined });
					}}
					onClose={() => {
						setPhase({ kind: "idle" });
						if (search.filled) update({ filled: undefined });
					}}
				/>
			)}
		</>
	);
}
