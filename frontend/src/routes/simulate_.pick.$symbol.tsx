import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { getStockChart, type ChartRange } from "@/lib/api";
import { allPreMarket } from "@/lib/chartSeries";
import { usePaperPortfolio, type Pick } from "@/hooks/usePaperPortfolio";
import { isUp, monthDay, signedUsd, signedPct, stakeLabel, usd } from "@/lib/simFormat";
import { SellFlow } from "@/components/simulate/SellFlow";
import { PickDesktop } from "@/components/simulate/desktop/PickDesktop";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMyStakData } from "@/hooks/useMyStakData";
import { Badge, ChartNote, DarkCta, EmptyStateCard, Kicker, RangeChart, RangeChips, SIM, SheetSecondary, tealShadow } from "@/components/simulate/simKit";
import { Sparkle } from "@/components/mystak/TasteCard";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { BackCircle, PhonePage, f, sheetCard } from "@/components/phone/phone";

export const Route = createFileRoute("/simulate_/pick/$symbol")({
	component: PickPage,
});

function StatBox({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
	return (
		<div className="min-w-0 flex-1" style={{ height: cu(61), ...sheetCard(14), padding: `${cu(13)} ${cu(14)}`, display: "flex", flexDirection: "column", gap: cu(4) }}>
			<span style={{ font: f(400, 10, 13), color: DISC.muted }}>{label}</span>
			<span className="truncate" style={{ font: f(400, 14, 18), color }}>{value}</span>
		</div>
	);
}

/** Android's pick detail: what a held stock has done since it was bought, its own price line, and Sell. */
function PickPage() {
	const { symbol } = Route.useParams();
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const paper = usePaperPortfolio();
	const { allBrands } = useMyStakData();
	const brand = allBrands.find((b) => b.ticker.toUpperCase() === symbol.toUpperCase());
	const [range, setRange] = useState<ChartRange>("3m");
	const [showSell, setShowSell] = useState(false);

	// The pick stays on screen behind the "Position closed" sheet even after the position has gone.
	const found = paper.picks.find((p) => p.ticker.toUpperCase() === symbol.toUpperCase());
	const pinned = useRef<Pick | undefined>(undefined);
	if (found) pinned.current = found;
	// Only the same symbol's pick: navigating to another holding's page must not show this one's numbers.
	const pick = found ?? (pinned.current?.ticker.toUpperCase() === symbol.toUpperCase() ? pinned.current : undefined);

	const { data: chart, isPending: chartLoading } = useQuery({
		queryKey: ["stock-chart", symbol.toUpperCase(), range],
		queryFn: () => getStockChart(symbol, range),
		staleTime: range === "1d" ? 5 * 60 * 1000 : 30 * 60 * 1000,
		retry: 1,
	});
	const week = useQuery({ queryKey: ["stock-chart", symbol.toUpperCase(), "1w"], queryFn: () => getStockChart(symbol, "1w"), staleTime: 30 * 60 * 1000, retry: 1 });
	const spy = useQuery({ queryKey: ["stock-chart", "SPY", "1w"], queryFn: () => getStockChart("SPY", "1w"), staleTime: 30 * 60 * 1000, retry: 1 });

	const goPortfolio = () => navigate({ to: "/simulate/portfolio" });
	const header = (
		<div className="relative flex items-center justify-between" style={{ padding: `${cu(8)} ${cu(18)}` }}>
			<BackCircle onClick={goPortfolio} label="Back to portfolio" />
			<h1 className="pointer-events-none absolute inset-x-0 text-center" style={{ font: f(600, 16, undefined, "heading"), color: "#fff" }}>{symbol.toUpperCase()}</h1>
			<span aria-hidden="true" style={{ width: cu(40), height: cu(40) }} />
		</div>
	);

	if (!pick) {
		return (
			<PhonePage>
				{header}
				<div style={{ padding: `${cu(6)} ${cu(20)}` }}>
					{paper.loading ? null : <EmptyStateCard title="Not in your portfolio" body={`You don’t hold ${symbol.toUpperCase()} right now. Buy it from Saved staks on Simulate.`} link="Go to Simulate" onLink={() => navigate({ to: "/simulate" })} />}
				</div>
			</PhonePage>
		);
	}

	const up = isUp(pick.gain);
	const [wholeGain, centsGain = "00"] = signedUsd(pick.gain).split(".");
	const closes = (chart?.prices ?? []).filter((p) => p.close > 0);
	const flatToday = range === "1d" && allPreMarket(closes);
	const values = closes.map((p) => p.close);

	// "This week" and "vs the market": this stock's last-week move, in dollars on the held shares and against SPY.
	const weekCloses = (week.data?.prices ?? []).filter((p) => p.close > 0);
	const spyCloses = (spy.data?.prices ?? []).filter((p) => p.close > 0);
	const weekGain = weekCloses.length >= 2 ? (pick.price - weekCloses[0]!.close) * pick.shares : null;
	const stockWeekPct = weekCloses.length >= 2 ? ((weekCloses[weekCloses.length - 1]!.close - weekCloses[0]!.close) / weekCloses[0]!.close) * 100 : null;
	const spyWeekPct = spyCloses.length >= 2 ? ((spyCloses[spyCloses.length - 1]!.close - spyCloses[0]!.close) / spyCloses[0]!.close) * 100 : null;
	const versus = stockWeekPct === null || spyWeekPct === null ? null : stockWeekPct - spyWeekPct;

	const sellSheet = showSell && (
		<SellFlow
			pick={pick}
			paper={paper}
			onClose={() => setShowSell(false)}
			onBackToSimulate={() => navigate({ to: "/simulate" })}
			onViewPortfolio={goPortfolio}
		/>
	);
	if (!isMobile) {
		return (
			<>
				<PickDesktop
					pick={pick}
					brand={brand}
					held={!!found}
					range={range}
					onRange={setRange}
					prices={closes}
					chartLoading={chartLoading}
					flatToday={flatToday}
					weekGain={weekGain}
					versus={versus}
					trades={paper.trades.filter((t) => t.ticker.toUpperCase() === pick.ticker.toUpperCase())}
					onSell={() => setShowSell(true)}
					onBuyMore={() => navigate({ to: "/simulate", search: { buy: pick.ticker } })}
					onStock={() => navigate({ to: "/stock/$symbol", params: { symbol: pick.ticker } })}
					onBack={() => navigate({ to: "/simulate" })}
				/>
				{sellSheet}
			</>
		);
	}
	return (
		<PhonePage>
			{header}
			<div style={{ display: "flex", flexDirection: "column", gap: cu(16), padding: `${cu(6)} ${cu(20)} ${cu(26)}` }}>
				<section className="flex flex-col" style={{ height: cu(307), ...sheetCard(16), padding: cu(18) }} aria-label={`${pick.ticker} performance`}>
					<div className="flex items-center" style={{ gap: cu(9) }}>
						<Badge letter={pick.ticker} />
						<span style={{ font: f(400, 12, 16), color: DISC.muted }}>Picked {monthDay(pick.addedAt)} at {usd(pick.costPerShare)}</span>
					</div>
					<div className="flex items-end" style={{ paddingTop: cu(11), minHeight: cu(59) }}>
						<span style={{ font: f(600, 38, 48, "heading"), color: up ? "#fff" : DISC.red }}>{wholeGain}</span>
						<span style={{ paddingLeft: cu(7), paddingBottom: cu(6), font: f(600, 16, 20, "heading"), color: DISC.muted }}>.{centsGain}</span>
					</div>
					<p style={{ paddingTop: cu(11), font: f(300, 12, 16), color: DISC.muted }}>
						That is {up ? "up" : "down"} {Math.abs(pick.gainPct).toFixed(1)}% on a {stakeLabel(pick.stake)} paper stake
					</p>
					<div className="flex justify-center" style={{ paddingTop: cu(11), marginLeft: cu(-14.5), marginRight: cu(-14.5) }}>
						{flatToday ? <ChartNote>Not much movement yet today</ChartNote>
							: values.length >= 2 ? <RangeChart values={values} height={73.5} />
							: <ChartNote>{chartLoading ? "" : "No history yet"}</ChartNote>}
					</div>
					<div style={{ paddingTop: cu(40) }}><RangeChips value={range} onChange={setRange} /></div>
				</section>

				<div style={{ display: "flex", flexDirection: "column", gap: cu(10) }}>
					<div className="flex" style={{ gap: cu(10) }}>
						{/* Muted until read; an "Even" reads green (the apps' thresholds). */}
						<StatBox label="This week" value={weekGain === null ? "—" : signedUsd(weekGain)} color={weekGain === null ? DISC.muted : isUp(weekGain) ? DISC.green : DISC.red} />
						<StatBox label="vs the market" value={versus === null ? "—" : Math.abs(versus) < 0.05 ? "Even" : signedPct(versus)} color={versus === null ? DISC.muted : versus > -0.05 ? DISC.green : DISC.red} />
					</div>
					<div className="flex" style={{ gap: cu(10) }}>
						<StatBox label="Price then" value={usd(pick.costPerShare)} />
						<StatBox label="Price now" value={usd(pick.price)} />
					</div>
				</div>

				<section style={{ display: "flex", flexDirection: "column", gap: cu(9), borderRadius: cu(14), background: SIM.tealTint, padding: `${cu(12)} ${cu(14)}` }} aria-label="Insight">
					<div className="flex items-start" style={{ gap: cu(7) }}><Sparkle size={16} /><Kicker>INSIGHT</Kicker></div>
					<p style={{ font: f(400, 12, 17), color: DISC.body }}>Your stake tracks the move live. If {pick.ticker} gives back gains, the dollars follow it down.</p>
				</section>

				{found && <DarkCta onClick={() => setShowSell(true)} shadow={tealShadow(12.285, 12.285, 0.04)}>Sell</DarkCta>}
				<SheetSecondary onClick={goPortfolio}>Back</SheetSecondary>
			</div>

			{sellSheet}
		</PhonePage>
	);
}
