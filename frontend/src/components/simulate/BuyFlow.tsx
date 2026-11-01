import { useRef, useState } from "react";
import { SANDBOX_MIN_SHARES } from "@stak/shared";
import { useQuery } from "@tanstack/react-query";
import { getStockData } from "@/lib/api";
import type { PaperPortfolio } from "@/hooks/usePaperPortfolio";
import { usd } from "@/lib/simFormat";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { f } from "@/components/phone/phone";
import { Badge, MoneyField, PillChoice, SIM, SheetCheck, SheetCta, SheetScaffold, SheetSecondary } from "./simKit";

const PRESETS = [10, 25, 50, 100] as const;
const DEFAULT_AMOUNT = 25;

/** Shares as the server fills them (sandbox.ts /buy, /fill-orders): rounded DOWN to a thousandth. */
const fillShares = (amount: number, price: number) => (price > 0 ? Math.floor((amount / price) * 1000) / 1000 : 0);
const shares3 = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : "0");

/** The stock summary at the top of the ticket and the receipt. */
export function StockRow({ symbol, name, priceLine, change }: { symbol: string; name: string; priceLine: string; change: string }) {
	const down = change.startsWith("▼");
	return (
		<div className="flex items-center" style={{ gap: cu(12), borderRadius: cu(6), background: SIM.tealTint, padding: `${cu(12)} ${cu(14)}` }}>
			<Badge letter={symbol} />
			<div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
				<span style={{ font: f(500, 13, 17), color: "#fff" }}>{name}</span>
				<span style={{ font: f(400, 10, 13), color: DISC.muted }}>{priceLine}</span>
			</div>
			<span style={{ font: f(500, 12, 16), color: down ? DISC.red : DISC.green }}>{change}</span>
		</div>
	);
}

const Line = ({ label, value }: { label: string; value: string }) => (
	<div className="flex w-full items-baseline" style={{ gap: cu(6) }}>
		<span style={{ font: f(400, 12, 16), color: DISC.muted }}>{label}</span>
		<span style={{ font: f(500, 12, 16), color: DISC.ink }}>{value}</span>
	</div>
);

const Get = ({ label, shares, symbol, suffix }: { label: string; shares: string; symbol: string; suffix?: string }) => (
	<div className="flex items-baseline justify-center" style={{ gap: cu(6), paddingTop: cu(10) }}>
		<span style={{ font: f(400, 12, 16), color: DISC.muted }}>{label}</span>
		<span style={{ font: f(600, 15, 19, "heading"), color: DISC.ink }}>{shares}</span>
		<span style={{ font: f(400, 12, 16), color: DISC.muted }}>{suffix ?? `shares of ${symbol}`}</span>
	</div>
);

/**
 * Android's practice-buy ticket, morphing into its receipt. Priced from the live quote (a paper order must never
 * fill at a price STAK doesn't have), amounts from $10 to $100 or a custom figure, Market or Limit. A limit below
 * today's price rests as an open order; anything else fills at once.
 */
export function BuyFlow({ symbol, company, paper, onClose, onViewPortfolio, viewLabel = "View portfolio" }: {
	symbol: string;
	company: string;
	paper: PaperPortfolio;
	onClose: () => void;
	onViewPortfolio: () => void;
	/** The receipt's primary button: "View portfolio" on Simulate, "View in My STAK" from a stock page. */
	viewLabel?: string;
}) {
	const { data: stock, isError, refetch } = useQuery({
		queryKey: ["stock", symbol],
		queryFn: () => getStockData(symbol),
		staleTime: 15 * 1000,
		retry: 1,
	});
	const quote = stock?.quote ?? null;
	const price = quote && quote.price > 0 ? quote.price : null;
	const changePct = quote?.changePercent ?? null;

	// The cash figures snapshot what was on hand when the sheet opened; and so does what was already held.
	const cashAtOpen = useRef(paper.cash);
	const heldAtOpen = useRef(paper.picks.find((p) => p.ticker === symbol)?.shares ?? 0);
	const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
	const [custom, setCustom] = useState(false);
	const [customText, setCustomText] = useState("");
	const [isLimit, setIsLimit] = useState(false);
	const [limitText, setLimitText] = useState("");
	const [busy, setBusy] = useState(false);
	const [filled, setFilled] = useState<{ placedLimit: number | null; shares: number; held: number; amount: number } | null>(null);
	const cash = cashAtOpen.current;

	// A stake too small to buy even 0.001 of a share would open an empty position.
	const canBuy = (a: number) => a > 0 && a <= cash && !!price && a / price >= SANDBOX_MIN_SHARES;
	const parsedLimit = Number(limitText);
	const limitPrice = !isLimit || !price ? null : parsedLimit > 0 ? parsedLimit : price;
	const limitOk = !isLimit || limitText === "" || parsedLimit > 0;
	const belowMarket = limitPrice !== null && price !== null && limitPrice < price;
	const shares = price ? (belowMarket ? fillShares(amount, limitPrice!) : fillShares(amount, price)) : 0;

	function choosePreset(value: number) {
		if (value > cash) return; // a stake bigger than the cash on hand is quietly ignored
		setCustom(false);
		setAmount(value);
	}
	function chooseCustom() {
		setCustom(true);
		const v = Number(customText);
		setAmount(v > 0 && v <= cash ? v : 0);
	}
	function onCustomText(text: string) {
		setCustomText(text);
		const v = Number(text);
		setAmount(v > 0 && v <= cash ? v : 0);
	}

	async function confirm() {
		if (busy || !price || !canBuy(amount)) return;
		setBusy(true);
		try {
			if (belowMarket) {
				if (await paper.placeLimit(symbol, amount, limitPrice!)) setFilled({ placedLimit: limitPrice, shares: fillShares(amount, limitPrice!), held: heldAtOpen.current, amount });
			} else {
				const result = await paper.buy(symbol, amount);
				// The server answers with the whole position after the fill, not just the shares this order added.
				if (result) setFilled({ placedLimit: null, shares: result.shares - heldAtOpen.current, held: result.shares, amount });
			}
		} finally {
			setBusy(false);
		}
	}

	const priceLine = price ? `${usd(price)} today` : "— today";
	const change = changePct == null ? "—" : `${changePct >= 0 ? "▲" : "▼"} ${Math.abs(changePct).toFixed(1)}%`;
	const receipt = filled !== null;

	return (
		<SheetScaffold label={receipt ? "Order receipt" : `Buy ${company}`} onDismiss={receipt ? onClose : onClose}>
			<div key={receipt ? "receipt" : "ticket"} style={{ display: "flex", flexDirection: "column", gap: cu(14), alignItems: receipt ? "center" : "stretch", animation: "sheet-fade 350ms ease-out" }}>
				{receipt ? (
					<>
						<SheetCheck />
						<h2 style={{ font: f(600, 18, 23, "heading"), color: "#fff" }}>{filled.placedLimit !== null ? "Order placed" : "Order filled"}</h2>
						<div className="w-full"><StockRow symbol={symbol} name={company} priceLine={priceLine} change={change} /></div>
						<p className="w-full" style={{ font: f(400, 12, 18), color: DISC.body }}>
							{filled.placedLimit !== null ? `Waits for ${symbol} at ${usd(filled.placedLimit)} or below · paper order` : "Filled instantly · paper order"}
						</p>
						<Line label="Cash available" value={usd(cash - filled.amount)} />
						<Get label={filled.placedLimit !== null ? "Reserved for" : "You now hold"} shares={shares3(filled.placedLimit !== null ? filled.shares : filled.held)} symbol={symbol} />
						<div className="flex w-full flex-col" style={{ gap: cu(16) }}>
							<SheetCta onClick={onViewPortfolio}>{viewLabel}</SheetCta>
							<SheetSecondary onClick={onClose}>Done</SheetSecondary>
						</div>
					</>
				) : (
					<>
						<h2 style={{ font: f(600, 18, 23, "heading"), color: "#fff" }}>Buy {company}?</h2>
						<StockRow symbol={symbol} name={company} priceLine={priceLine} change={change} />
						{isError && !price && (
							<p role="alert" style={{ font: f(400, 12, 16), color: DISC.red }}>
								Couldn't load a price for {symbol} right now.{" "}
								<button type="button" onClick={() => { void refetch(); }} style={{ color: DISC.teal, font: f(500, 12, 16) }}>Try again</button>
							</p>
						)}
						<p style={{ font: f(400, 12, 18), color: DISC.body }}>Your paper stake starts at today’s price and tracks the real move live, in either direction.</p>

						<div style={{ display: "flex", flexDirection: "column", gap: cu(12) }}>
							<Line label="Cash available" value={usd(cash)} />
							<div className="flex" style={{ gap: cu(8) }} role="group" aria-label="Amount">
								{PRESETS.map((p) => <PillChoice key={p} label={`$${p}`} selected={!custom && amount === p} onClick={() => choosePreset(p)} />)}
								<PillChoice label="Custom" selected={custom} onClick={chooseCustom} />
							</div>
							{custom && <MoneyField prefix="$" value={customText} onChange={onCustomText} placeholder="0.00" label="Custom amount in dollars" />}
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: cu(8) }}>
							<div className="flex" style={{ gap: cu(8) }} role="group" aria-label="Order type">
								<PillChoice label="Market" selected={!isLimit} onClick={() => setIsLimit(false)} />
								<PillChoice label="Limit" selected={isLimit} onClick={() => setIsLimit(true)} />
							</div>
							{isLimit && price && (
								<>
									<MoneyField prefix="Limit $" value={limitText} onChange={setLimitText} placeholder={price.toFixed(2)} label="Limit price in dollars" />
									<p style={{ font: f(400, 11, 15), color: DISC.muted }}>
										{limitPrice! >= price ? "At or above today’s price - fills right away." : `Below today’s price - waits as an open order until ${symbol} gets there.`}
									</p>
								</>
							)}
						</div>

						<Get label="You get" shares={shares3(shares)} symbol={symbol} />

						<div style={{ display: "flex", flexDirection: "column", gap: cu(16) }}>
							<SheetCta onClick={confirm} disabled={!price || busy || !canBuy(amount) || !limitOk}>
								{belowMarket ? "Place limit order" : "Confirm practice buy"}
							</SheetCta>
							<SheetSecondary onClick={onClose}>Back</SheetSecondary>
						</div>
					</>
				)}
			</div>
		</SheetScaffold>
	);
}
