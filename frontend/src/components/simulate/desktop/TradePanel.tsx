import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, CheckCircle2, Info, Minus, Plus, Search } from "lucide-react";
import { SANDBOX_MIN_SHARES, type BrandSummary } from "@stak/shared";
import { getStockData } from "@/lib/api";
import { sharesLabel, usd } from "@/lib/simFormat";
import type { PaperPortfolio } from "@/hooks/usePaperPortfolio";
import { BrandLogo } from "@/components/BrandLogo";
import { DESK, DeskButton, Panel, changeColor, deskFocus, signedPctLabel } from "@/components/desktop/deskKit";

export type TradeMode = "buy" | "sell";
type OrderType = "market" | "limit";

/** Below this a buy would open an empty position (the phone ticket blocks it too). */
const MIN_SHARES = SANDBOX_MIN_SHARES;

/**
 * Desktop Simulate's trade ticket, from the user's design: Buy / Sell, a company search, its live price, order type
 * (market, or a buy-limit below the price), a quantity in shares and the estimated cost, then the result in place.
 * The rules are the phone ticket's: at least 0.001 of a share, never more than the cash on hand; limit orders are
 * buy-only and must sit below the price (at or above it is simply a market buy); selling sells a portion of a holding.
 */
export function TradePanel({ paper, brands, symbol, mode, onSymbol, onMode }: {
	paper: PaperPortfolio;
	brands: BrandSummary[];
	symbol: string | null;
	mode: TradeMode;
	onSymbol: (symbol: string | null) => void;
	onMode: (mode: TradeMode) => void;
}) {
	const [query, setQuery] = useState("");
	const [searching, setSearching] = useState(false);
	const [qtyText, setQtyText] = useState("1");
	const [orderType, setOrderType] = useState<OrderType>("market");
	const [limitText, setLimitText] = useState("");
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState<{ title: string; body: string } | null>(null);

	const brand = useMemo(() => brands.find((b) => b.ticker.toUpperCase() === symbol), [brands, symbol]);
	const held = paper.picks.find((p) => p.ticker === symbol) ?? null;
	const { data: stock } = useQuery({
		queryKey: ["stock", symbol],
		queryFn: () => getStockData(symbol!),
		enabled: !!symbol,
		staleTime: 15 * 1000,
		refetchInterval: 15 * 1000,
		retry: 1,
	});
	const quote = stock?.quote ?? null;
	const price = quote && quote.price > 0 ? quote.price : null;

	// A new company, or switching Buy/Sell, starts a fresh ticket (selling defaults to the whole holding). Keyed on the
	// company and side only: the holding's size changing after a trade mustn't reset what's typed.
	useEffect(() => {
		setDone(null);
		setLimitText("");
		setOrderType("market");
		setQtyText(mode === "sell" && held ? sharesLabel(held.shares) : "1");
	}, [symbol, mode]);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		const pool = mode === "sell" ? brands.filter((b) => paper.picks.some((p) => p.ticker === b.ticker.toUpperCase())) : brands;
		if (!q) return mode === "sell" ? pool.slice(0, 6) : [];
		return pool.filter((b) => b.ticker.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)).slice(0, 6);
	}, [query, brands, mode, paper.picks]);

	const qty = Number(qtyText);
	const parsedLimit = Number(limitText);
	const limitPrice = orderType === "limit" && price ? (parsedLimit > 0 ? parsedLimit : price) : null;
	const belowMarket = limitPrice !== null && price !== null && limitPrice < price;
	const unitPrice = belowMarket ? limitPrice! : price;
	const total = unitPrice && qty > 0 ? qty * unitPrice : 0;

	let problem: string | null = null;
	if (!symbol) problem = null;
	else if (!(qty > 0)) problem = "Enter how many shares.";
	else if (mode === "buy") {
		if (qty < MIN_SHARES) problem = `The smallest order is ${MIN_SHARES} of a share.`;
		else if (!price) problem = "Waiting for the live price…";
		else if (orderType === "limit" && limitText !== "" && !(parsedLimit > 0)) problem = "Enter a limit price above $0.";
		else if (total > paper.cash) problem = `That's more than your ${usd(paper.cash)} in simulated cash.`;
	} else if (!held) problem = `You don't hold ${symbol} in this portfolio.`;
	else if (qty > held.shares + 1e-9) problem = `You hold ${sharesLabel(held.shares)} shares.`;
	const canSubmit = !!symbol && !problem && !busy && !paper.loading && !paper.needsSetup && (mode === "sell" || !!price);

	function step(delta: number) {
		const next = Math.max(0, (qty > 0 ? qty : 0) + delta);
		setQtyText(sharesLabel(mode === "sell" && held ? Math.min(next, held.shares) : next));
	}

	async function submit() {
		if (!canSubmit || !symbol) return;
		setBusy(true);
		try {
			if (mode === "sell") {
				const portion = Math.min(1, qty / held!.shares);
				if (await paper.sell(symbol, portion)) {
					setDone({ title: portion >= 0.999 ? "Position closed" : "Position reduced", body: `Sold ${sharesLabel(qty)} ${symbol} at about ${price ? usd(price) : "the live price"} · paper order.` });
				}
			} else if (belowMarket) {
				if (await paper.placeLimit(symbol, total, limitPrice!)) {
					setDone({ title: "Limit order placed", body: `Buys ${sharesLabel(qty)} ${symbol} when it trades at ${usd(limitPrice!)} or below. ${usd(total)} of your cash is set aside for it.` });
				}
			} else {
				const had = held?.shares ?? 0;
				const r = await paper.buy(symbol, total);
				if (r) setDone({ title: "Order filled", body: `Bought ${sharesLabel(r.shares - had)} ${symbol} at ${usd(r.price)}. You now hold ${sharesLabel(r.shares)} shares.` });
			}
		} finally {
			setBusy(false);
		}
	}

	const input = `h-[40px] w-full rounded-[10px] px-3 text-[13.5px] text-white outline-none placeholder:text-[#819ABB] focus:border-[#69B3CA] ${deskFocus}`;
	const inputStyle = { background: DESK.panelRaised, border: `1px solid ${DESK.border}` };

	return (
		<Panel label="Place a simulated trade" className="gap-4 p-5">
			<h2 className="flex items-center gap-2 font-heading text-[17px] font-semibold text-white">
				<ArrowLeftRight className="h-[17px] w-[17px]" style={{ color: DESK.cyan }} aria-hidden="true" /> Place a Simulated Trade
			</h2>

			<div className="grid grid-cols-2 gap-1 rounded-[12px] p-1" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }} role="group" aria-label="Order side">
				{(["buy", "sell"] as const).map((m) => {
					const on = mode === m;
					return (
						<button key={m} type="button" aria-pressed={on} onClick={() => onMode(m)} className={`h-[36px] rounded-[9px] text-[13.5px] font-semibold capitalize transition-colors ${deskFocus}`} style={on ? { background: m === "buy" ? DESK.cta : "#C9424F", color: "#fff" } : { color: DESK.body }}>
							{m}
						</button>
					);
				})}
			</div>

			<div className="relative">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-[16px] w-[16px] -translate-y-1/2" style={{ color: DESK.muted }} aria-hidden="true" />
				<input
					value={query}
					onChange={(e) => { setQuery(e.target.value); setSearching(true); }}
					onFocus={() => setSearching(true)}
					onBlur={() => setTimeout(() => setSearching(false), 150)}
					placeholder={mode === "sell" ? "Search your holdings" : "Search a company (e.g. AAPL, NVIDIA…)"}
					aria-label="Search a company"
					className={`${input} pl-9`}
					style={inputStyle}
				/>
				{searching && results.length > 0 && (
					<ul className="absolute inset-x-0 top-[44px] z-20 overflow-hidden rounded-[10px] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.45)]" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
						{results.map((b) => (
							<li key={b.id}>
								<button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onSymbol(b.ticker.toUpperCase()); setQuery(""); setSearching(false); }} className={`flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left hover:bg-white/[0.06] ${deskFocus}`}>
									<BrandLogo brand={b} className="h-[24px] w-[24px] rounded-[6px]" alt="" />
									<span className="text-[13px] font-semibold text-white">{b.ticker}</span>
									<span className="truncate text-[12px]" style={{ color: DESK.muted }}>{b.name}</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			{symbol ? (
				<div className="flex items-center gap-3 rounded-[12px] p-3" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
					{brand ? <BrandLogo brand={brand} className="h-[36px] w-[36px] rounded-[9px]" alt="" /> : <span className="h-[36px] w-[36px] rounded-[9px]" style={{ background: DESK.track }} />}
					<div className="min-w-0 flex-1">
						<p className="truncate text-[14px] font-semibold text-white">{brand?.name ?? symbol}</p>
						<p className="text-[12px]" style={{ color: DESK.muted }}>{symbol}{held ? ` · you hold ${sharesLabel(held.shares)}` : ""}</p>
					</div>
					<div className="text-right">
						<p className="font-heading text-[15px] font-semibold tabular-nums text-white">{price ? usd(price) : "—"}</p>
						<p className="text-[12px] font-medium" style={{ color: changeColor(quote?.changePercent) }}>{signedPctLabel(quote?.changePercent)}</p>
					</div>
				</div>
			) : (
				<p className="rounded-[12px] p-3 text-[13px]" style={{ color: DESK.muted, background: DESK.panelRaised, border: `1px dashed ${DESK.border}` }}>
					Pick a company above, or tap Buy / Sell on a holding or + on a saved idea.
				</p>
			)}

			{done ? (
				<div className="flex flex-col gap-3 rounded-[12px] p-4" role="status" style={{ background: "rgba(47,208,138,0.08)", border: "1px solid rgba(47,208,138,0.3)" }}>
					<p className="flex items-center gap-2 text-[14px] font-semibold text-white"><CheckCircle2 className="h-[17px] w-[17px]" style={{ color: DESK.green }} aria-hidden="true" /> {done.title}</p>
					<p className="text-[13px] leading-[19px]" style={{ color: DESK.body }}>{done.body}</p>
					<button type="button" onClick={() => setDone(null)} className={`self-start rounded-md text-[13px] font-medium ${deskFocus}`} style={{ color: DESK.cyan }}>New trade</button>
				</div>
			) : (
				<>
					{mode === "buy" && (
						<label className="flex items-center justify-between gap-3 text-[13px]" style={{ color: DESK.body }}>
							Order type
							<select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)} className={`h-[36px] rounded-[9px] px-3 text-[13px] text-white ${deskFocus}`} style={inputStyle}>
								<option value="market">Market order</option>
								<option value="limit">Limit order</option>
							</select>
						</label>
					)}
					{mode === "buy" && orderType === "limit" && (
						<label className="flex items-center justify-between gap-3 text-[13px]" style={{ color: DESK.body }}>
							Limit price
							<span className="relative w-[150px]">
								<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px]" style={{ color: DESK.muted }}>$</span>
								<input inputMode="decimal" value={limitText} onChange={(e) => setLimitText(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={price ? price.toFixed(2) : "0.00"} aria-label="Limit price" className={`${input} pl-6 text-right`} style={inputStyle} />
							</span>
						</label>
					)}
					<div className="flex items-center justify-between gap-3 text-[13px]" style={{ color: DESK.body }}>
						<span>Quantity {mode === "sell" && held && <button type="button" onClick={() => setQtyText(sharesLabel(held.shares))} className={`ml-2 rounded-md text-[12px] font-medium ${deskFocus}`} style={{ color: DESK.cyan }}>Sell all</button>}</span>
						<div className="flex items-center gap-1">
							<button type="button" onClick={() => step(-1)} aria-label="One share fewer" className={`grid h-[36px] w-[36px] place-items-center rounded-[9px] ${deskFocus}`} style={inputStyle}><Minus className="h-[15px] w-[15px] text-white" aria-hidden="true" /></button>
							<input inputMode="decimal" value={qtyText} onChange={(e) => setQtyText(e.target.value.replace(/[^0-9.]/g, ""))} aria-label="Quantity in shares" className={`${input} h-[36px] w-[88px] text-center`} style={inputStyle} />
							<button type="button" onClick={() => step(1)} aria-label="One share more" className={`grid h-[36px] w-[36px] place-items-center rounded-[9px] ${deskFocus}`} style={inputStyle}><Plus className="h-[15px] w-[15px] text-white" aria-hidden="true" /></button>
						</div>
					</div>
					<div className="flex items-center justify-between border-t pt-3" style={{ borderColor: DESK.border }}>
						<span className="text-[13px]" style={{ color: DESK.body }}>{mode === "sell" ? "Estimated proceeds" : belowMarket ? "Set aside for the order" : "Estimated cost"}</span>
						<span className="font-heading text-[20px] font-semibold tabular-nums text-white">{mode === "sell" ? (price && qty > 0 ? usd(qty * price) : "—") : total > 0 ? usd(total) : "—"}</span>
					</div>
					<p className="flex items-start gap-2 rounded-[10px] p-3 text-[12px] leading-[17px]" style={{ background: DESK.cyanSoft, color: DESK.body }}>
						<Info className="mt-[1px] h-[14px] w-[14px] shrink-0" style={{ color: DESK.cyan }} aria-hidden="true" />
						{mode === "sell"
							? "A sell order sells at the current market price. The cash goes back into your simulated balance."
							: belowMarket
								? "A limit order waits until the stock trades at your price or lower, then buys. It's checked during market hours."
								: "A market order buys at the current market price. Your order will be filled instantly in the simulation."}
					</p>
					{problem && <p className="text-[12.5px]" style={{ color: DESK.red }} role="alert">{problem}</p>}
					{paper.needsSetup ? (
						<DeskButton size="lg" onClick={() => { void paper.setup(10_000, "My first portfolio", "balanced"); }}>
							Start with $10,000 of practice money
						</DeskButton>
					) : (
						<DeskButton size="lg" tone={mode === "buy" ? "primary" : "sell"} onClick={() => { void submit(); }} disabled={!canSubmit}>
							{busy ? "Placing…" : `${mode === "buy" ? (belowMarket ? "Place limit order" : "Buy") : "Sell"}${symbol ? ` ${symbol}` : ""} (Simulated)`}
						</DeskButton>
					)}
				</>
			)}
			<p className="text-center text-[12px]" style={{ color: DESK.muted }}>You have {usd(paper.cash)} in simulated cash</p>
		</Panel>
	);
}
