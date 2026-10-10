import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { colPlus } from "@/app/FitCanvas";
import { changeLine, changeShort, companyInitial, companyName, type Fill, money, normalizeTicker, signedMoney, signedPct, usePortfolio, useQuotes, useShowcase, wholeMoney } from "@/app/live";
import { PrimaryButton } from "@/app/ui/Button";
import { cn } from "@/lib/utils";
import { SA } from "./assets";
import { cashAvailable, simulateEmpty, simulateHome, stocks, type Stock } from "./data";
import { AddConfirmSheet, AddSuccessSheet, BuyFailedSheet } from "./sheets";
import { Avatar, Card, CardTitle, Eyebrow, GREEN, type Palette, RED, RED_ROW, SmallBuyButton } from "./ui";

export type SimulateHomeSearch = {
	variant?: "alt";
	state?: "empty";
	modal?: "add-confirm" | "add-success" | "buy-failed";
	symbol?: string;
	amount?: number;
};

/** 2:634 "Desktop · Simulate home" (canonical) and 2:970 (alternate palette / spacing, ?variant=alt). */
const CANON: Palette = { card: "#181f30", inner: "#181f30" };
const ALT: Palette = { card: "#0e1a36", inner: "#12203e" };
/** The 744 main card beside a 360 rail: its share of the row once the column gap is taken out. */
const mainWidth = (gap: number) => `calc((100% - ${gap}px) * ${(744 / 1104).toFixed(6)})`;

/** A sheet's stock line: the frames' demo names for their four tickers, the catalog's for the rest, live prices. */
export function stockFor(symbol: string, price: number, pct: number): Stock {
	const demo = stocks[symbol];
	const name = demo?.name ?? companyName(symbol);
	return { name, nameConfirm: demo?.nameConfirm ?? name, price, pct: changeShort(pct), up: pct >= 0, initial: demo?.initial ?? companyInitial(symbol) };
}

/** The range buttons' Figma widths (2:634: each label box is its text width rounded up, plus 10px a side). */
const RANGE_WIDTH: Record<string, number> = { "1D": 33, "1W": 36, "1M": 35, "1Y": 31 };

/** "+$186" — the hero's whole-dollar move. */
const wholeMove = (n: number) => `${n < 0 ? "-" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

export function SimulateHome({ search }: { search: SimulateHomeSearch }) {
	const navigate = useNavigate();
	const pf = usePortfolio();
	const live = pf.live;
	/** the untouched demo persona shows the frames' own figures (see live/showcase.ts) */
	const showcase = useShowcase();
	const alt = search.variant === "alt";
	const p = alt ? ALT : CANON;
	const colGap = alt ? 40 : 22;
	const setSearch = (next: SimulateHomeSearch) =>
		navigate({ to: "/simulate", search: { variant: search.variant, ...next }, replace: true });
	const symbol = normalizeTicker(search.symbol ?? (alt ? "PLTR" : "NVDA"));
	const d = simulateHome;

	// Saved staks: saved companies not yet held, the three moving most today
	const held = useMemo(() => new Set(pf.positions.map((x) => x.ticker)), [pf.positions]);
	const candidates = useMemo(() => [...live.savedTickers].filter((t) => !held.has(t)), [live.savedTickers, held]);
	const quotes = useQuotes([...candidates, symbol]);
	const savedRows = useMemo(
		() =>
			candidates
				.map((t) => ({ symbol: t, quote: quotes[t] }))
				.filter((r) => r.quote)
				.sort((a, b) => Math.abs(b.quote!.changePercent) - Math.abs(a.quote!.changePercent) || a.symbol.localeCompare(b.symbol))
				.slice(0, 3),
		[candidates, quotes],
	);
	const picks = useMemo(() => [...pf.positions].sort((a, b) => b.gain - a.gain).slice(0, 3), [pf.positions]);
	const savedList = showcase
		? d.saved.rows.map((r) => ({ symbol: r.symbol, name: stocks[r.symbol]?.name ?? companyName(r.symbol), initial: stocks[r.symbol]?.initial ?? companyInitial(r.symbol), price: r.price, change: r.change, up: r.up }))
		: savedRows.map((r) => ({
				symbol: r.symbol,
				name: stocks[r.symbol]?.name ?? companyName(r.symbol),
				initial: stocks[r.symbol]?.initial ?? companyInitial(r.symbol),
				price: money(r.quote!.price),
				change: changeLine(r.quote!.changePercent),
				up: r.quote!.changePercent >= 0,
			}));
	const pickList = showcase
		? d.picks.rows.map((r) => ({ symbol: r.symbol, gain: r.gain, pct: r.pct, up: r.up }))
		: picks.map((r) => ({ symbol: r.ticker, gain: signedMoney(r.gain), pct: signedPct(r.pct), up: r.gain >= 0 }));
	const cash = showcase ? cashAvailable : pf.cash;

	const price = (showcase ? stocks[symbol]?.price : undefined) ?? quotes[symbol]?.price ?? pf.quotes[symbol]?.price ?? stocks[symbol]?.price ?? 0;
	const pct = quotes[symbol]?.changePercent ?? pf.quotes[symbol]?.changePercent ?? 0;
	const stock = showcase && stocks[symbol] ? stocks[symbol] : stockFor(symbol, price, pct);
	const amount = search.amount ?? 25;
	// the order that actually filled: the success sheet shows its quantity, cost and cash left rather than an estimate from the typed dollars
	const [fill, setFill] = useState<Fill | null>(null);
	const filled = fill?.ticker === symbol ? fill : null;

	const confirmBuy = async (dollars: number) => {
		try {
			const result = await live.actions.buy(symbol, dollars, price);
			setFill(result);
			toast.success("Order filled");
			setSearch({ modal: "add-success", symbol, amount: result.cost });
		} catch {
			setSearch({ modal: "buy-failed", symbol, amount: dollars });
		}
	};

	if (search.state === "empty" || (live.ready && pf.positions.length === 0)) return <SimulateEmpty budget={pf.budget} />;

	return (
		<div className="flex flex-col items-start gap-[22px]" style={{ width: colPlus(alt ? 10 : -8), marginTop: alt ? 4 : 0 }}>
			<div className="flex h-[67px] flex-col items-start justify-between overflow-clip">
				<p className="whitespace-nowrap font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{d.title}</p>
				<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[12px] py-[5px]">
					<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{d.badge}</p>
				</div>
			</div>

			<div className="flex w-full flex-col items-start gap-[22px]">
				<div className="flex w-full flex-col items-start gap-[22px]">
					<div className="flex w-full items-start" style={{ gap: colGap }}>
						<PortfolioHero
							palette={p}
							value={showcase ? d.hero.value : money(pf.value)}
							today={showcase ? d.hero.week : `${pf.today < 0 ? "▼" : "▲"} ${wholeMove(pf.today)} (${signedPct(pf.todayPct)}) today`}
							todayUp={showcase || pf.today >= 0}
							allTime={showcase ? d.hero.allTime : `${signedMoney(pf.allTime)} all time · #${pf.rank} on the leaderboard`}
						/>
						<div className="flex min-w-0 flex-col items-start gap-[11px]" style={{ flex: "360 1 0" }}>
							<Card palette={p} className="w-full">
								<Eyebrow>{d.cash.eyebrow}</Eyebrow>
								<p className="whitespace-nowrap font-sora text-[24px] font-semibold leading-[30px] text-[#f2f6fc]">{money(cash)}</p>
								<p className="w-full font-geist text-[11px] leading-[14px] text-[#819abb]">{d.cash.note}</p>
							</Card>
							<Card palette={p} className="w-full">
								<CardTitle>{d.how.title}</CardTitle>
								{d.how.lines.map((line) => (
									<p key={line} className="w-full font-geist text-[11px] leading-[14px] text-[#819abb]">
										{line}
									</p>
								))}
							</Card>
						</div>
					</div>

					<div className="flex w-full items-end" style={{ gap: colGap }}>
						<Card palette={p} className="min-w-0" style={{ flex: "704 1 0" }}>
							<div className="flex h-[24px] w-full items-center justify-between overflow-clip whitespace-nowrap">
								<CardTitle>{d.saved.title}</CardTitle>
								<Link to="/my-stak" className="stak-press font-geist text-[12px] font-medium leading-[16px] text-[#819abb]">
									{d.saved.link}
								</Link>
							</div>
							{savedList.length === 0 && (
								<p className="w-full font-geist text-[11px] leading-[14px] text-[#819abb]">Save a company from today’s deck and it shows up here, ready to buy.</p>
							)}
							{savedList.map((row) => (
								<div key={row.symbol} className="flex h-[44px] w-full items-center gap-[12px] overflow-clip">
									<Avatar letter={row.initial} size={36} radius={10} bg={p.inner} />
									<Link
										to="/stocks/$symbol"
										params={{ symbol: row.symbol }}
										search={{ saved: true, from: "my-stak" }}
										className="flex min-w-px flex-1 flex-col items-start gap-px overflow-clip whitespace-nowrap"
									>
										<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{row.symbol}</p>
										<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{row.name}</p>
									</Link>
									<div className="flex flex-col items-end gap-px overflow-clip whitespace-nowrap">
										<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{row.price}</p>
										<p className="font-geist text-[11px] leading-[14px]" style={{ color: row.up ? GREEN : RED_ROW }}>
											{row.change}
										</p>
									</div>
									<SmallBuyButton aria-label={`Buy ${row.symbol}`} onClick={() => setSearch({ modal: "add-confirm", symbol: row.symbol })}>
										{d.saved.buy}
									</SmallBuyButton>
								</div>
							))}
						</Card>

						<Card palette={p} className="min-w-0" style={{ flex: "320 1 0" }}>
							<CardTitle>{d.leaderboard.title}</CardTitle>
							{d.leaderboard.rows.map(([name, pctText]) => (
								<div key={name} className="flex h-[20px] w-full items-start justify-between overflow-clip text-[12px]">
									<p className="whitespace-pre font-geist leading-[16px] text-[#f2f6fc]">{name}</p>
									<p className="whitespace-nowrap font-geist font-medium leading-[16px] text-[#2fd08a]">{pctText}</p>
								</div>
							))}
							<div className="flex h-[30px] w-full items-center justify-between overflow-clip rounded-[8px] bg-[rgba(93,168,191,0.07)] px-[10px] py-[5px] font-geist text-[12px] font-medium leading-[16px]">
								<p className="whitespace-pre text-[#a6e4f7]">{showcase ? d.leaderboard.you[0] : `#${pf.rank}  You`}</p>
								<p className="whitespace-nowrap" style={{ color: showcase || pf.allTime >= 0 ? GREEN : RED }}>
									{showcase ? d.leaderboard.you[1] : signedPct(pf.allTimePct)}
								</p>
							</div>
							<Link to="/simulate/leaderboard" className="stak-press whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#819abb]">
								{d.leaderboard.link}
							</Link>
						</Card>
					</div>
				</div>

				<Card palette={p} className="whitespace-nowrap" style={{ width: mainWidth(colGap) }}>
					<div className="flex h-[24px] w-full items-center justify-between overflow-clip">
						<CardTitle>{d.picks.title}</CardTitle>
						<Link to="/simulate/portfolio" className="stak-press font-geist text-[12px] font-medium leading-[16px] text-[#819abb]">
							{d.picks.link}
						</Link>
					</div>
					{pickList.map((row) => (
						<Link
							key={row.symbol}
							to="/simulate/picks/$symbol"
							params={{ symbol: row.symbol }}
							className="stak-press flex h-[30px] w-full cursor-pointer items-center justify-between overflow-clip"
						>
							<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{row.symbol}</p>
							<div className="flex items-start gap-[12px] overflow-clip" style={{ color: row.up ? GREEN : RED }}>
								<p className="font-geist text-[13px] font-medium leading-[17px]">{row.gain}</p>
								<p className="font-geist text-[12px] leading-[16px]">{row.pct}</p>
							</div>
						</Link>
					))}
				</Card>
			</div>

			{search.modal === "add-confirm" && (
				<AddConfirmSheet symbol={symbol} stock={stock} alt={alt} cash={cash} onConfirm={confirmBuy} onClose={() => setSearch({})} />
			)}
			{search.modal === "buy-failed" && (
				<BuyFailedSheet stock={stock} onRetry={() => setSearch({ modal: "add-confirm", symbol })} onClose={() => setSearch({})} />
			)}
			{search.modal === "add-success" && (
				<AddSuccessSheet
					symbol={symbol}
					stock={stock}
					amount={filled?.cost ?? amount}
					shares={filled?.shares ?? (price > 0 ? amount / price : 0)}
					cash={filled?.cashAfter ?? (showcase ? cashAvailable - amount : pf.cash)}
					onPrimary={() => navigate({ to: "/my-stak" })}
					onClose={() => {
						setFill(null);
						setSearch({});
					}}
				/>
			)}
		</div>
	);
}

function PortfolioHero({
	palette,
	value,
	today,
	todayUp,
	allTime,
}: { palette: Palette; value: string; today: string; todayUp: boolean; allTime: string }) {
	const d = simulateHome.hero;
	return (
		<Card palette={palette} className="min-w-0" style={{ flex: "704 1 0" }}>
			<Eyebrow>{d.eyebrow}</Eyebrow>
			<p className="whitespace-nowrap font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{value}</p>
			<div className="flex items-center gap-[14px] overflow-clip whitespace-nowrap text-[12px] leading-[16px]">
				<p className="font-geist font-medium" style={{ color: todayUp ? GREEN : RED }}>
					{today}
				</p>
				<p className="font-geist text-[#819abb]">{allTime}</p>
			</div>
			<div className="relative h-[120px] w-full overflow-clip rounded-[12px]" style={{ backgroundColor: palette.inner }}>
				{/* "Vector" 672x70 at (10,27); the export is 672.38x72.489 and sits 1.81% above / 1.75% below its box */}
				<div className="absolute left-[10px] top-[27px] h-[70px] w-[calc(100%-32px)]">
					<div className="absolute" style={{ inset: "-1.81% 0 -1.75% 0" }}>
						<img alt="" src={SA.miniChart} className="block size-full max-w-none" />
					</div>
				</div>
				<div className="absolute left-[calc(100%-178px)] top-[86px] flex items-start gap-[8px] overflow-clip">
					{d.ranges.map((r) => {
						const active = r === d.activeRange;
						return (
							<button
								key={r}
								type="button"
								className="stak-press flex cursor-pointer items-start justify-center overflow-clip rounded-[8px] px-[10px] py-[4px]"
								style={{ width: RANGE_WIDTH[r], ...(active ? { backgroundColor: palette.inner } : {}) }}
							>
								<span
									className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", active ? "text-[#f2f6fc]" : "text-[#819abb]")}
								>
									{r}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</Card>
	);
}

/** 2:2255 "Desktop · Simulate · Empty" (10 · States): hero with a flat baseline, then the empty stage. */
function SimulateEmpty({ budget }: { budget: number }) {
	const d = simulateHome;
	const e = simulateEmpty;
	return (
		<div className="flex flex-col items-start gap-[22px]" style={{ width: colPlus(-8) }}>
			<div className="flex h-[67px] flex-col items-start justify-between overflow-clip">
				<p className="whitespace-nowrap font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{d.title}</p>
				<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[12px] py-[5px]">
					<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{d.badge}</p>
				</div>
			</div>
			<Card style={{ width: mainWidth(22) }}>
				<Eyebrow>{e.hero.eyebrow}</Eyebrow>
				<p className="whitespace-nowrap font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{wholeMoney(budget)}</p>
				<div className="flex items-center gap-[14px] overflow-clip whitespace-nowrap text-[12px] leading-[16px] text-[#819abb]">
					<p className="font-geist font-medium">{e.hero.moves}</p>
					<p className="font-geist">{e.hero.rank}</p>
				</div>
				<div className="relative h-[120px] w-full overflow-clip rounded-[12px] bg-[#181f30]">
					<div className="absolute left-[10px] top-[77px] h-px w-[calc(100%-32px)] bg-[rgba(129,154,187,0.35)]" />
					<div className="absolute left-[calc(100%-178px)] top-[86px] flex items-start gap-[8px] overflow-clip">
						{d.hero.ranges.map((r) => {
							const active = r === d.hero.activeRange;
							return (
								<button
									key={r}
									type="button"
									className={cn("stak-press flex cursor-pointer items-start justify-center overflow-clip rounded-[8px] px-[10px] py-[4px]", active && "bg-[#181f30]")}
									style={{ width: RANGE_WIDTH[r] }}
								>
									<span
										className={cn("whitespace-nowrap font-geist text-[11px] font-medium leading-[14px]", active ? "text-[#f2f6fc]" : "text-[#819abb]")}
									>
										{r}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</Card>
			<div className="flex flex-col items-center justify-center overflow-clip pt-[56px]" style={{ width: mainWidth(22) }}>
				<div className="flex flex-col items-center overflow-clip">
					<div className="relative h-[151px] w-[121.143px]">
						<img alt="" src={SA.emptyBox} className="absolute left-[-5.26px] top-0 block h-[165.355px] w-[135.091px] max-w-none" />
					</div>
					<div className="h-[28px] w-[10px]" />
					<p className="whitespace-nowrap text-center font-sora text-[26px] font-semibold leading-[33px] text-white">{e.title}</p>
					<div className="size-[10px]" />
					<p className="w-[460px] text-center font-geist text-[15px] leading-[22px] text-[#819abb]">{e.body}</p>
					<div className="h-[28px] w-[10px]" />
					<Link to="/discover" className="block w-[240px]">
						<PrimaryButton as="span">{e.cta}</PrimaryButton>
					</Link>
				</div>
			</div>
		</div>
	);
}
