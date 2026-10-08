import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SANDBOX_DEFAULT_STARTING_BALANCE } from "@stak/shared";
import { useMemo, useState } from "react";
import type { ChartRange } from "@/lib/api";
import { useAccount } from "@/context/AccountContext";
import { useMyStakData } from "@/hooks/useMyStakData";
import { usePaperPortfolio } from "@/hooks/usePaperPortfolio";
import { useIsMobile } from "@/hooks/use-mobile";
import { SimulateDesktop } from "@/components/simulate/desktop/SimulateDesktop";
import { monthDay } from "@/lib/simFormat";
import { BuyFlow } from "@/components/simulate/BuyFlow";
import { CenterLink, EmptyStateCard, SectionHeader } from "@/components/simulate/simKit";
import {
	AllocationCard, HowItWorks, InsightCard, PickDuo, PortfolioRow, PortfolioSetupCard, SavedStakRow, ScoreHero, SetupLine,
} from "@/components/simulate/SimSections";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, PhonePage, f, focusRing } from "@/components/phone/phone";

export const Route = createFileRoute("/simulate")({
	component: SimulateRoute,
	// A stock page's "Practice with ..." leaves the symbol here and the ticket opens on it.
	validateSearch: (search: Record<string, unknown>): { buy?: string } => ({
		buy: typeof search.buy === "string" && search.buy ? search.buy.toUpperCase() : undefined,
	}),
});

/** Desktop: portfolio, holdings and a trade ticket side by side (a stock page's ?buy= opens the ticket on it). */
function SimulateRoute() {
	const { buy } = Route.useSearch();
	return useIsMobile() ? <SimulatePage /> : <SimulateDesktop initialSymbol={buy} />;
}

const SAVED_SHOWN = 2;
const PICKS_SHOWN = 3;

function ClockIcon() {
	return (
		<svg viewBox="0 0 18 18" style={{ width: cu(18), height: cu(18) }} fill="none" aria-hidden="true">
			<circle cx="9" cy="9" r="7" stroke="#C8D2E0" strokeWidth="1.4" />
			<path d="M9 5v4.2l2.8 1.6" stroke="#C8D2E0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

/** Android's Simulate tab: a paper portfolio built from the stocks you saved, priced live. */
function SimulatePage() {
	const navigate = useNavigate();
	const { buy } = Route.useSearch();
	const { account } = useAccount();
	const { allBrands, swipedBrands } = useMyStakData();
	const paper = usePaperPortfolio();
	const [range, setRange] = useState<ChartRange>("3m");
	const [buying, setBuying] = useState<{ symbol: string; company: string } | null>(null);

	// Newest saves first; the ticket for a saved stock opens on its live price.
	const saved = useMemo(() => {
		const savedAt = (id: string) => account?.stakSavedAt?.[id]?.savedAt ?? 0;
		return [...swipedBrands].sort((a, b) => savedAt(b.id) - savedAt(a.id) || a.ticker.localeCompare(b.ticker));
	}, [swipedBrands, account?.stakSavedAt]);

	const savedSub = (ticker: string, id: string) => {
		const held = paper.picks.find((p) => p.ticker === ticker);
		if (held) return `In portfolio · ${held.shares.toFixed(4)} shares`;
		const at = account?.stakSavedAt?.[id]?.savedAt;
		const today = at ? monthDay(at) === monthDay(Date.now()) : false;
		return `Saved ${today || !at ? "today" : monthDay(at)} · not in portfolio yet`;
	};

	// The deep link from a stock page opens the ticket once (and drops the parameter so Back doesn't reopen it).
	const linked = buy ? allBrands.find((b) => b.ticker.toUpperCase() === buy) : undefined;
	// The ticket needs the account loaded (its cash and holdings are read once) and a paper portfolio to buy into.
	const ticketReady = !paper.loading && !paper.needsSetup;
	const ticket = ticketReady ? (buying ?? (linked ? { symbol: linked.ticker, company: linked.name } : null)) : null;
	// Like Android, a buy before setup applies the default portfolio ($1,000, Balanced) first, then opens the ticket.
	async function startBuy(symbol: string, company: string) {
		if (paper.loading) return;
		if (paper.needsSetup && !(await paper.setup(SANDBOX_DEFAULT_STARTING_BALANCE, "My first portfolio", "balanced"))) return;
		setBuying({ symbol, company });
	}
	function closeTicket() {
		setBuying(null);
		if (buy) navigate({ to: "/simulate", search: {}, replace: true });
	}

	const best = paper.picks.length >= 2 ? paper.picks.reduce((a, b) => (b.gain > a.gain ? b : a)) : null;
	const worst = paper.picks.length >= 2 ? paper.picks.reduce((a, b) => (b.gain < a.gain ? b : a)) : null;
	const newest = useMemo(() => [...paper.picks].sort((a, b) => b.addedAt - a.addedAt), [paper.picks]);
	const openPick = (ticker: string) => navigate({ to: "/simulate/pick/$symbol", params: { symbol: ticker } });

	return (
		<PhonePage>
			<div style={{ display: "flex", flexDirection: "column", gap: cu(18), padding: `${cu(8)} ${cu(20)} ${cu(26)}` }}>
				<header className="flex items-center" style={{ minHeight: cu(52) }}>
					<div style={{ display: "flex", flexDirection: "column", gap: cu(3) }}>
						<h1 style={{ font: f(600, 26, 33, "heading"), color: "#fff" }}>Simulate</h1>
						<p style={{ font: f(400, 12, 16), color: DISC.muted }}>Pick from your saves. Paper money does the talking.</p>
					</div>
					<div className="flex-1" />
					<button
						type="button"
						onClick={() => navigate({ to: "/simulate/portfolio" })}
						aria-label="History"
						className={`grid shrink-0 place-items-center rounded-full ${PRESS}`}
						style={{ width: cu(40), height: cu(40), background: DISC.sheet, ...focusRing }}
					>
						<ClockIcon />
					</button>
				</header>

				{paper.loading ? (
					<div className="grid place-items-center" style={{ height: cu(160) }} role="status" aria-label="Loading your paper portfolio">
						<div className="animate-spin rounded-full" style={{ width: cu(40), height: cu(40), border: `${cu(4)} solid ${DISC.teal}33`, borderTopColor: DISC.teal }} />
					</div>
				) : (
					<>
						{paper.needsSetup && <PortfolioSetupCard onSubmit={(balance, name, strategy) => { void paper.setup(balance, name, strategy); }} />}
						{/* No hero before setup: there is no portfolio yet to put a value or a gain on. */}
						{!paper.needsSetup && <ScoreHero paper={paper} range={range} onRange={setRange} />}
						{!paper.needsSetup && <SetupLine paper={paper} />}
					</>
				)}

				<SectionHeader>Saved staks</SectionHeader>
				{saved.length === 0 ? (
					<EmptyStateCard title="Nothing saved yet" body="Save stocks from the Discover deck and practice buy them here." link="Go to Discover" onLink={() => navigate({ to: "/discover" })} />
				) : (
					<>
						<div style={{ display: "flex", flexDirection: "column", gap: cu(10) }}>
							{saved.slice(0, SAVED_SHOWN).map((b) => (
								<SavedStakRow key={b.id} ticker={b.ticker} sub={savedSub(b.ticker, b.id)} onBuy={() => { void startBuy(b.ticker, b.name); }} />
							))}
						</div>
						<CenterLink label="All saved staks" onClick={() => navigate({ to: "/my-stak" })} />
					</>
				)}

				{paper.picks.length > 0 && <InsightCard tickers={newest.map((p) => p.ticker)} />}
				{/* A tie (two fresh buys, no quotes yet) has no best or worst - it would name one stock both ways. */}
				{best && worst && best.gain !== worst.gain && <PickDuo best={best} worst={worst} onOpen={openPick} />}
				<HowItWorks />

				<SectionHeader>Your portfolio</SectionHeader>
				{paper.picks.length === 0 ? (
					<EmptyStateCard title="No picks yet" body="Your first practice buy lands here with its live gain." />
				) : (
					<>
						<div style={{ display: "flex", flexDirection: "column", gap: cu(10) }}>
							{newest.slice(0, PICKS_SHOWN).map((p) => <PortfolioRow key={p.ticker} pick={p} onOpen={() => openPick(p.ticker)} />)}
						</div>
						<CenterLink label={`See all ${paper.picks.length === 1 ? "1 pick" : `${paper.picks.length} picks`}`} onClick={() => navigate({ to: "/simulate/portfolio" })} />
					</>
				)}

				{paper.picks.length > 0 && (
					<>
						<div className="flex items-center justify-between">
							<h2 style={{ font: f(600, 16, 21.44, "heading"), color: DISC.headerGray }}>Portfolio breakdown</h2>
							<button type="button" onClick={() => navigate({ to: "/simulate/portfolio" })} className={`flex items-center ${PRESS}`} style={{ gap: cu(5), font: f(400, 14, 18.76), color: "rgba(105,179,202,0.8)", ...focusRing }}>
								Portfolio
								<svg viewBox="0 0 4.90939 9" style={{ width: cu(4.909), height: cu(9) }} fill="rgba(105,179,202,0.8)" aria-hidden="true"><path d="M0.4 0.1L4.8 4.5L0.4 8.9" stroke="rgba(105,179,202,0.8)" strokeWidth="0.9" strokeLinecap="round" fill="none" /></svg>
							</button>
						</div>
						<AllocationCard tickers={paper.picks.map((p) => p.ticker)} />
					</>
				)}
			</div>

			{ticket && (
				<BuyFlow
					key={ticket.symbol}
					symbol={ticket.symbol}
					company={ticket.company}
					paper={paper}
					onClose={closeTicket}
					onViewPortfolio={() => { closeTicket(); navigate({ to: "/simulate/portfolio" }); }}
				/>
			)}
		</PhonePage>
	);
}
