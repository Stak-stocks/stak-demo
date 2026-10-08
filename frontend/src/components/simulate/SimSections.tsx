import { useEffect, useState, type ReactNode } from "react";
import { SANDBOX_DEFAULT_STARTING_BALANCE, SANDBOX_NAME_MAX_LENGTH, SANDBOX_STARTING_BALANCES, SANDBOX_STRATEGIES } from "@stak/shared";
import type { SandboxStrategyId } from "@/context/AccountContext";
import { DonutRing } from "@/components/DonutRing";
import { useFigmaUnit } from "@/components/discover/useFigmaUnit";
import type { ChartRange } from "@/lib/api";
import type { PaperPortfolio, Pick } from "@/hooks/usePaperPortfolio";
import { bucketColor, buckets, simInsight } from "@/lib/simBuckets";
import { signedPct, signedUsd, signedWhole, usd, wholeUsd } from "@/lib/simFormat";
import { usePortfolioHistory } from "@/hooks/usePaperPortfolio";
import { heldCountLabel } from "@/components/mystak/CollectionChip";
import { Sparkle } from "@/components/mystak/TasteCard";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, SettingsChip, f, focusRing, sheetCard } from "@/components/phone/phone";
import { Badge, ChartNote, DarkCta, Kicker, RangeChart, RangeChips, SIM, gradientBorder, tealShadow } from "./simKit";

const pickCountText = (n: number) => (n === 1 ? "1 pick" : `${n} picks`);

// ── Setup ────────────────────────────────────────────────────────────────────────────────────────
// The balance draft stores the AMOUNT: an index would point at a different one whenever the list changes.
const DRAFT = { balance: "setup_draft_balance_amount", name: "setup_draft_name", strategy: "setup_draft_strategy" };
const BLURB: Record<SandboxStrategyId, string> = {
	cautious: "Small stakes, steady names. Aim to beat a savings account.",
	balanced: "A mix of steady and growth picks. The default most people start on.",
	bold: "Bigger swings on high-growth picks. Expect bumps.",
};
const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* the draft just won't survive a reload */ } };

const DEFAULT_BALANCE_INDEX = SANDBOX_STARTING_BALANCES.indexOf(SANDBOX_DEFAULT_STARTING_BALANCE);
const DEFAULT_STRATEGY_INDEX = SANDBOX_STRATEGIES.findIndex((s) => s.id === "balanced");

/** Pick what you'd really invest, name it and choose how to play. A half-filled form survives a reload, like Android's draft. */

export function PortfolioSetupCard({ onSubmit }: { onSubmit: (balance: number, name: string, strategy: SandboxStrategyId) => void }) {
	const [balanceIndex, setBalanceIndex] = useState(() => {
		const i = SANDBOX_STARTING_BALANCES.findIndex((b) => String(b) === read(DRAFT.balance));
		return i >= 0 ? i : DEFAULT_BALANCE_INDEX;
	});
	const [name, setName] = useState(() => read(DRAFT.name) ?? "");
	// No draft reads as null, and Number(null) is 0 - the first strategy, not the default.
	const [strategyIndex, setStrategyIndex] = useState(() => { const raw = read(DRAFT.strategy); const i = raw === null ? -1 : Number(raw); return SANDBOX_STRATEGIES[i] !== undefined ? i : DEFAULT_STRATEGY_INDEX; });
	useEffect(() => { write(DRAFT.balance, String(SANDBOX_STARTING_BALANCES[balanceIndex])); }, [balanceIndex]);
	useEffect(() => { write(DRAFT.name, name); }, [name]);
	useEffect(() => { write(DRAFT.strategy, String(strategyIndex)); }, [strategyIndex]);
	const strategy = SANDBOX_STRATEGIES[strategyIndex]!;

	const label = (text: string) => <p style={{ font: f(500, 13), color: "#fff" }}>{text}</p>;
	return (
		<section style={{ display: "flex", flexDirection: "column", gap: cu(12), ...sheetCard(16), padding: cu(16) }} aria-label="Set up your paper portfolio">
			<p style={{ font: f(500, 11, 14), color: DISC.teal }}>SET UP YOUR PAPER PORTFOLIO</p>
			<p style={{ font: f(400, 12, 17), color: DISC.body }}>Start with what you’d really invest, so practice feels like the real thing. Name it and choose how you want to play. Nothing here is real money.</p>
			{label("Starting balance")}
			<div className="flex" style={{ gap: cu(8) }}>
				{SANDBOX_STARTING_BALANCES.map((b, i) => <SettingsChip key={b} label={wholeUsd(b)} selected={i === balanceIndex} onClick={() => setBalanceIndex(i)} />)}
			</div>
			{label("Portfolio name")}
			<input
				value={name}
				onChange={(e) => setName(e.target.value.slice(0, SANDBOX_NAME_MAX_LENGTH))}
				placeholder="My first portfolio"
				aria-label="Portfolio name"
				className="w-full outline-none placeholder:text-[#819ABB]"
				style={{ borderRadius: cu(10), background: DISC.avatar, border: `${cu(0.5)} solid ${DISC.divider}`, padding: `${cu(10)} ${cu(12)}`, font: f(500, 12, 16), color: "#fff", caretColor: DISC.teal }}
			/>
			{label("Strategy")}
			<div className="flex" style={{ gap: cu(8) }}>
				{SANDBOX_STRATEGIES.map((s, i) => <SettingsChip key={s.id} label={s.label} selected={i === strategyIndex} onClick={() => setStrategyIndex(i)} />)}
			</div>
			<p style={{ font: f(400, 11, 15), color: DISC.muted }}>{BLURB[strategy.id]}</p>
			<DarkCta dim={false} height={49} onClick={() => onSubmit(SANDBOX_STARTING_BALANCES[balanceIndex]!, name.trim() || "My first portfolio", strategy.id)}>Start practicing</DarkCta>
		</section>
	);
}

export function SetupLine({ paper }: { paper: PaperPortfolio }) {
	const label = SANDBOX_STRATEGIES.find((s) => s.id === paper.strategy)?.label;
	// A portfolio from before setup existed has no name or strategy: just what it started with (as the apps).
	const parts = [paper.name, label].filter((p): p is string => !!p);
	return <p style={{ font: f(400, 11, 14), color: DISC.muted }}>{[...parts, `started with ${wholeUsd(paper.paperStart)}`].join(" · ")}</p>;
}

// ── Score hero ───────────────────────────────────────────────────────────────────────────────────
export function ScoreHero({ paper, range, onRange }: { paper: PaperPortfolio; range: ChartRange; onRange: (r: ChartRange) => void }) {
	const { values, loading } = usePortfolioHistory(paper.trades, paper.paperStart, range);
	const [whole, cents = "00"] = usd(paper.portfolioValue).split(".");
	const gain = paper.allTimeGain;
	const up = gain >= 0;
	const pad = { padding: `0 ${cu(20)}` };
	return (
		<section style={{ display: "flex", flexDirection: "column", gap: cu(11), ...sheetCard(18), padding: `${cu(20)} 0` }} aria-label="Portfolio value">
			<div style={pad}><Kicker>PORTFOLIO VALUE</Kicker></div>
			<div className="flex items-end" style={pad}>
				<span style={{ font: f(600, 44, 55, "heading"), color: "#fff" }}>{whole}</span>
				<span style={{ paddingLeft: cu(8), paddingBottom: cu(8), font: f(600, 18, 23, "heading"), color: DISC.muted }}>.{cents}</span>
			</div>
			<p style={{ ...pad, font: f(300, 12, 16), color: DISC.muted }}>
				{signedUsd(gain)} all time on {wholeUsd(paper.paperStart)} paper · {pickCountText(paper.picks.length)}
			</p>
			<div className="flex items-baseline" style={{ ...pad, gap: cu(6) }}>
				<span style={{ font: f(400, 12, 16), color: DISC.muted }}>Cash available</span>
				<span style={{ font: f(500, 12, 16), color: DISC.ink }}>{usd(paper.cash)}</span>
			</div>
			<p style={{ ...pad, font: f(500, 12, 16), color: up ? DISC.green : DISC.red }}>
				{up ? "▲" : "▼"} {signedWhole(gain)} ({signedPct(paper.paperStart > 0 ? (gain / paper.paperStart) * 100 : 0)}) all time
			</p>
			<div className="flex justify-center">
				{values && values.length >= 2 ? <RangeChart values={values} /> : <ChartNote>{loading ? "" : "No history yet"}</ChartNote>}
			</div>
			<div style={{ paddingTop: cu(29) }}><RangeChips value={range} onChange={onRange} /></div>
		</section>
	);
}

// ── Rows ─────────────────────────────────────────────────────────────────────────────────────────
export function SavedStakRow({ ticker, sub, onBuy }: { ticker: string; sub: string; onBuy: () => void }) {
	return (
		<div className="flex items-center" style={{ gap: cu(12), ...sheetCard(12), padding: `${cu(11)} ${cu(14)}` }}>
			<Badge letter={ticker} />
			<div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(3) }}>
				<span style={{ font: f(500, 12, undefined, "heading"), color: "#fff" }}>{ticker}</span>
				<span style={{ font: f(400, 10), color: DISC.muted }}>{sub}</span>
			</div>
			<button
				type="button"
				onClick={onBuy}
				aria-label={`Buy ${ticker}`}
				className={PRESS}
				style={{ width: cu(60), height: cu(30), borderRadius: cu(6), ...gradientBorder(DISC.cta), boxShadow: tealShadow(12.285, 12.285, 0.04), font: f(400, 12, undefined, "heading"), color: "#fff", ...focusRing }}
			>
				Buy
			</button>
		</div>
	);
}

export function InsightCard({ tickers }: { tickers: string[] }) {
	return (
		<section style={{ display: "flex", flexDirection: "column", gap: cu(8), ...sheetCard(16), padding: `${cu(15)} ${cu(16)}` }} aria-label="Insight">
			<div className="flex items-center" style={{ gap: cu(7) }}><Sparkle size={16} /><Kicker>INSIGHT</Kicker></div>
			<p style={{ font: f(400, 12, 20), color: DISC.body }}>{simInsight(tickers)}</p>
		</section>
	);
}

export function PickDuo({ best, worst, onOpen }: { best: Pick; worst: Pick; onOpen: (ticker: string) => void }) {
	const card = (kicker: string, pick: Pick) => {
		const up = pick.gainPct >= 0;
		const rounded = Math.round(pick.gain);
		return (
			<button
				type="button"
				onClick={() => onOpen(pick.ticker)}
				className={`min-w-0 flex-1 text-left ${PRESS}`}
				style={{ display: "flex", flexDirection: "column", gap: cu(7), ...sheetCard(16), padding: cu(14), ...focusRing }}
			>
				<div className="flex items-center justify-between">
					<Kicker>{kicker}</Kicker>
					<span style={{ font: f(400, 12, 16), color: up ? DISC.green : DISC.red }}>{signedPct(pick.gainPct)}</span>
				</div>
				<div className="flex items-center" style={{ gap: cu(9) }}>
					<Badge letter={pick.ticker} size={34} fontSize={14} />
					<span style={{ font: f(500, 12, 15, "heading"), color: "#fff" }}>{pick.ticker}</span>
				</div>
				<span style={{ font: f(400, 11, 14), color: DISC.faint }}>
					{rounded < 0 ? "-" : "+"}${Math.abs(rounded).toLocaleString("en-US")} on {wholeUsd(pick.stake)}
				</span>
			</button>
		);
	};
	return <div className="flex" style={{ gap: cu(10) }}>{card("BEST PICK", best)}{card("WORST PICK", worst)}</div>;
}

export function HowItWorks() {
	const steps = ["Buy a stock with paper dollars. It starts that day.", "Your shares move with the real price, up or down.", "Sell anytime and the cash returns to your balance."];
	return (
		<section style={{ display: "flex", flexDirection: "column", gap: cu(10), ...sheetCard(16), padding: `${cu(15)} ${cu(16)}` }} aria-label="How paper trading works">
			<Kicker>HOW PAPER TRADING WORKS</Kicker>
			{steps.map((text, i) => (
				<div key={i} className="flex items-start" style={{ gap: cu(10) }}>
					<span className="grid shrink-0 place-items-center" style={{ width: cu(20), height: cu(20), borderRadius: cu(10), background: SIM.tealTint, font: f(600, 11, undefined, "heading"), color: DISC.teal }}>{i + 1}</span>
					<span style={{ font: f(400, 12, 18), color: DISC.body }}>{text}</span>
				</div>
			))}
		</section>
	);
}

/** One held pick: badge, ticker, "Picked Sep 4 · up 12% since", live gain. */
export function PortfolioRow({ pick, onOpen, trailing, subLight }: { pick: Pick; onOpen: () => void; trailing?: ReactNode; subLight?: boolean }) {
	const up = pick.gain >= 0;
	const sub = `Picked ${new Date(pick.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })} · ${up ? "up" : "down"} ${Math.abs(pick.gainPct).toFixed(0)}% since`;
	return (
		<div className="flex items-center" style={{ gap: cu(12), ...sheetCard(12), padding: `${cu(12)} ${cu(14)}` }}>
			<button type="button" onClick={onOpen} className={`flex min-w-0 flex-1 items-center text-left ${PRESS}`} style={{ gap: cu(12), ...focusRing }} aria-label={`${pick.ticker}, ${signedUsd(pick.gain)}`}>
				<Badge letter={pick.ticker} size={40} fontSize={16} />
				<span className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(3) }}>
					<span style={{ font: f(500, 12, 15, "heading"), color: "#fff" }}>{pick.ticker}</span>
					<span style={{ font: f(subLight ? 300 : 400, 10, 13), color: DISC.muted }}>{sub}</span>
				</span>
				<span className="text-right" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
					<span style={{ font: f(400, 12, 16), color: up ? DISC.green : DISC.red }}>{signedUsd(pick.gain)}</span>
					<span style={{ font: f(400, 10, 13), color: DISC.faint }}>{signedPct(pick.gainPct)}</span>
				</span>
			</button>
			{trailing}
		</div>
	);
}

/** Allocation by collection: a 150u donut (28u stroke, 5 degree gaps) over the bucket list with bars. */
export function AllocationCard({ tickers }: { tickers: string[] }) {
	const unit = useFigmaUnit();
	const all = buckets(tickers);
	return (
		<section style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: cu(16), ...sheetCard(16), padding: cu(18) }} aria-label="Allocation">
			<h3 style={{ font: f(600, 15, undefined, "heading"), color: "#fff" }}>Allocation</h3>
			<DonutRing shares={all.map((b) => b.share)} colors={all.map((b) => bucketColor(b.id))} size={150 * unit} strokeWidth={28 * unit} gapDegrees={5} />
			<div className="w-full" style={{ display: "flex", flexDirection: "column", gap: cu(12) }}>
				{all.map((b) => (
					<div key={b.id} style={{ display: "flex", flexDirection: "column", gap: cu(6) }}>
						<div className="flex items-center">
							<span className="rounded-full" style={{ width: cu(9), height: cu(9), background: bucketColor(b.id), marginRight: cu(8) }} aria-hidden="true" />
							<span style={{ font: f(400, 13), color: "#fff" }}>{b.name}</span>
							<span className="flex-1" />
							<span style={{ font: f(400, 12), color: DISC.muted }}>{Math.round(b.share * 100)}% · {heldCountLabel(b.count)}</span>
						</div>
						<div style={{ height: cu(7), borderRadius: cu(4), background: DISC.divider }}>
							<div style={{ width: `${b.share * 100}%`, height: "100%", borderRadius: cu(4), background: bucketColor(b.id) }} />
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
