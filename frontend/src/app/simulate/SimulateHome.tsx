import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SA } from "./assets";
import { cashAvailable, simulateEmpty, simulateHome, stocks } from "./data";
import { AddConfirmSheet, AddSuccessSheet, BuyFailedSheet } from "./sheets";
import { Avatar, Card, CardTitle, Eyebrow, GradientButton, GREEN, type Palette, RED, RED_ROW, SmallBuyButton } from "./ui";

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

export function SimulateHome({ search }: { search: SimulateHomeSearch }) {
	const navigate = useNavigate();
	const alt = search.variant === "alt";
	const p = alt ? ALT : CANON;
	const colGap = alt ? 40 : 22;
	const setSearch = (next: SimulateHomeSearch) =>
		navigate({ to: "/simulate", search: { variant: search.variant, ...next }, replace: true });
	const symbol = search.symbol ?? (alt ? "PLTR" : "NVDA");
	const stock = stocks[symbol] ?? stocks.NVDA;
	const d = simulateHome;

	if (search.state === "empty") return <SimulateEmpty />;

	return (
		<div className="flex flex-col items-start gap-[22px]" style={{ width: alt ? 1144 : 1126, marginTop: alt ? 4 : 0 }}>
			<div className="flex h-[67px] flex-col items-start justify-between overflow-clip">
				<p className="whitespace-nowrap font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{d.title}</p>
				<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[12px] py-[5px]">
					<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{d.badge}</p>
				</div>
			</div>

			<div className="flex w-full flex-col items-start gap-[22px]">
				<div className={cn("flex flex-col items-start gap-[22px]", alt && "w-full")}>
					<div className={cn("flex items-start", alt && "w-full")} style={{ gap: colGap }}>
						<PortfolioHero palette={p} />
						<div className="flex w-[360px] flex-col items-start gap-[11px]">
							<Card palette={p} className="w-full">
								<Eyebrow>{d.cash.eyebrow}</Eyebrow>
								<p className="whitespace-nowrap font-sora text-[24px] font-semibold leading-[30px] text-[#f2f6fc]">{d.cash.value}</p>
								<p className="w-[320px] font-geist text-[11px] leading-[14px] text-[#819abb]">{d.cash.note}</p>
							</Card>
							<Card palette={p} className="w-full">
								<CardTitle>{d.how.title}</CardTitle>
								{d.how.lines.map((line) => (
									<p key={line} className="w-[320px] font-geist text-[11px] leading-[14px] text-[#819abb]">
										{line}
									</p>
								))}
							</Card>
						</div>
					</div>

					<div className="flex w-full items-end" style={{ gap: colGap }}>
						<Card palette={p} className="w-[744px]">
							<div className="flex h-[24px] w-full items-center justify-between overflow-clip whitespace-nowrap">
								<CardTitle>{d.saved.title}</CardTitle>
								<Link to="/my-stak" className="font-geist text-[12px] font-medium leading-[16px] text-[#819abb]">
									{d.saved.link}
								</Link>
							</div>
							{d.saved.rows.map((row) => {
								const s = stocks[row.symbol];
								return (
									<div key={row.symbol} className="flex h-[44px] w-full items-center gap-[12px] overflow-clip">
										<Avatar letter={s.initial} size={36} radius={10} bg={p.inner} />
										<div className="flex min-w-px flex-1 flex-col items-start gap-px overflow-clip whitespace-nowrap">
											<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{row.symbol}</p>
											<p className="font-geist text-[11px] leading-[14px] text-[#819abb]">{s.name}</p>
										</div>
										<div className="flex flex-col items-end gap-px overflow-clip whitespace-nowrap">
											<p className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{row.price}</p>
											<p className="font-geist text-[11px] leading-[14px]" style={{ color: row.up ? GREEN : RED_ROW }}>
												{row.change}
											</p>
										</div>
										<SmallBuyButton onClick={() => setSearch({ modal: "add-confirm", symbol: row.symbol })}>{d.saved.buy}</SmallBuyButton>
									</div>
								);
							})}
						</Card>

						<Card palette={p} className="w-[360px]">
							<CardTitle>{d.leaderboard.title}</CardTitle>
							{d.leaderboard.rows.map(([name, pct]) => (
								<div key={name} className="flex h-[20px] w-full items-start justify-between overflow-clip text-[12px]">
									<p className="whitespace-pre font-geist leading-[16px] text-[#f2f6fc]">{name}</p>
									<p className="whitespace-nowrap font-geist font-medium leading-[16px] text-[#2fd08a]">{pct}</p>
								</div>
							))}
							<div className="flex h-[30px] w-full items-center justify-between overflow-clip rounded-[8px] bg-[rgba(93,168,191,0.07)] px-[10px] py-[5px] font-geist text-[12px] font-medium leading-[16px]">
								<p className="whitespace-pre text-[#a6e4f7]">{d.leaderboard.you[0]}</p>
								<p className="whitespace-nowrap text-[#2fd08a]">{d.leaderboard.you[1]}</p>
							</div>
							<Link to="/simulate/leaderboard" className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#819abb]">
								{d.leaderboard.link}
							</Link>
						</Card>
					</div>
				</div>

				<Card palette={p} className="w-[744px] whitespace-nowrap">
					<div className="flex h-[24px] w-full items-center justify-between overflow-clip">
						<CardTitle>{d.picks.title}</CardTitle>
						<Link to="/simulate/portfolio" className="font-geist text-[12px] font-medium leading-[16px] text-[#819abb]">
							{d.picks.link}
						</Link>
					</div>
					{d.picks.rows.map((row) => (
						<Link
							key={row.symbol}
							to="/simulate/picks/$symbol"
							params={{ symbol: row.symbol }}
							className="flex h-[30px] w-full items-center justify-between overflow-clip"
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
				<AddConfirmSheet
					symbol={symbol}
					stock={stock}
					alt={alt}
					onConfirm={(amount) => setSearch({ modal: "add-success", symbol, amount })}
					onClose={() => setSearch({})}
				/>
			)}
			{search.modal === "buy-failed" && (
				<BuyFailedSheet stock={stock} onRetry={() => setSearch({ modal: "add-confirm", symbol })} onClose={() => setSearch({})} />
			)}
			{search.modal === "add-success" && (
				<AddSuccessSheet
					symbol={symbol}
					stock={stock}
					amount={search.amount ?? 25}
					onPrimary={() => navigate({ to: "/my-stak" })}
					onClose={() => setSearch({})}
				/>
			)}
		</div>
	);
}

function PortfolioHero({ palette }: { palette: Palette }) {
	const d = simulateHome.hero;
	return (
		<Card palette={palette} className="w-[744px]">
			<Eyebrow>{d.eyebrow}</Eyebrow>
			<p className="whitespace-nowrap font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{d.value}</p>
			<div className="flex items-center gap-[14px] overflow-clip whitespace-nowrap text-[12px] leading-[16px]">
				<p className="font-geist font-medium text-[#2fd08a]">{d.week}</p>
				<p className="font-geist text-[#819abb]">{d.allTime}</p>
			</div>
			<div className="relative h-[120px] w-full overflow-clip rounded-[12px]" style={{ backgroundColor: palette.inner }}>
				{/* "Vector" 672x70 at (10,27); the export is 672.38x72.489 and sits 1.81% above / 1.75% below its box */}
				<div className="absolute left-[10px] top-[27px] h-[70px] w-[672px]">
					<div className="absolute" style={{ inset: "-1.81% 0 -1.75% 0" }}>
						<img alt="" src={SA.miniChart} className="block size-full max-w-none" />
					</div>
				</div>
				<div className="absolute left-[526px] top-[86px] flex items-start gap-[8px] overflow-clip">
					{d.ranges.map((r) => {
						const active = r === d.activeRange;
						return (
							<button
								key={r}
								type="button"
								className="flex items-start overflow-clip rounded-[8px] px-[10px] py-[4px]"
								style={active ? { backgroundColor: palette.inner } : undefined}
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

export const simulateCash = cashAvailable;

/** 2:2255 "Desktop · Simulate · Empty" (10 · States): hero with a flat baseline, then the empty stage. */
function SimulateEmpty() {
	const d = simulateHome;
	const e = simulateEmpty;
	return (
		<div className="flex w-[1126px] flex-col items-start gap-[22px]">
			<div className="flex h-[67px] flex-col items-start justify-between overflow-clip">
				<p className="whitespace-nowrap font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{d.title}</p>
				<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[12px] py-[5px]">
					<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{d.badge}</p>
				</div>
			</div>
			<Card className="w-[744px]">
				<Eyebrow>{e.hero.eyebrow}</Eyebrow>
				<p className="whitespace-nowrap font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">{e.hero.value}</p>
				<div className="flex items-center gap-[14px] overflow-clip whitespace-nowrap text-[12px] leading-[16px] text-[#819abb]">
					<p className="font-geist font-medium">{e.hero.moves}</p>
					<p className="font-geist">{e.hero.rank}</p>
				</div>
				<div className="relative h-[120px] w-full overflow-clip rounded-[12px] bg-[#181f30]">
					<div className="absolute left-[10px] top-[77px] h-px w-[672px] bg-[rgba(129,154,187,0.35)]" />
					<div className="absolute left-[526px] top-[86px] flex items-start gap-[8px] overflow-clip">
						{d.hero.ranges.map((r) => {
							const active = r === d.hero.activeRange;
							return (
								<button
									key={r}
									type="button"
									className={cn("flex items-start overflow-clip rounded-[8px] px-[10px] py-[4px]", active && "bg-[#181f30]")}
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
			<div className="flex w-[744px] flex-col items-center justify-center overflow-clip pt-[56px]">
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
						<GradientButton>{e.cta}</GradientButton>
					</Link>
				</div>
			</div>
		</div>
	);
}
