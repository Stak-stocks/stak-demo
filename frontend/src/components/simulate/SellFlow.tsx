import { useState } from "react";
import type { PaperPortfolio, Pick } from "@/hooks/usePaperPortfolio";
import { signedUsd, stakeLabel, usd } from "@/lib/simFormat";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { f } from "@/components/phone/phone";
import { Badge, DarkCta, MoneyField, PillChoice, SIM, SheetCheck, SheetCta, SheetScaffold, SheetSecondary, tealShadow } from "./simKit";

type Portion = "all" | "half" | "custom";

/** The held stock at the top of the sell sheet and its receipt. */
function PickSellRow({ pick }: { pick: Pick }) {
	const change = pick.dayChange == null ? "—" : `${pick.dayChange >= 0 ? "▲" : "▼"} ${Math.abs(pick.dayChange).toFixed(1)}%`;
	return (
		<div className="flex items-center" style={{ gap: cu(11), borderRadius: cu(6), background: SIM.tealTint, padding: `${cu(12)} ${cu(14)}` }}>
			<Badge letter={pick.ticker} />
			<div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
				<span style={{ font: f(500, 13), color: "#fff" }}>{pick.name}</span>
				<span style={{ font: f(400, 10), color: DISC.muted }}>{usd(pick.price)} today</span>
			</div>
			<span style={{ font: f(500, 12), color: change.startsWith("▼") ? DISC.red : DISC.green }}>{change}</span>
		</div>
	);
}

/**
 * Android's sell sheet: All / Half / Custom dollars, what comes back to cash, then "Position closed" (or "reduced")
 * in the same sheet. The server sells the fraction; the receipt is drawn from what was on screen when confirmed.
 */
export function SellFlow({ pick, paper, onClose, onBackToSimulate, onViewPortfolio }: {
	pick: Pick;
	paper: PaperPortfolio;
	onClose: () => void;
	onBackToSimulate: () => void;
	onViewPortfolio: () => void;
}) {
	const [portionKind, setPortionKind] = useState<Portion>("all");
	const [customText, setCustomText] = useState("");
	const [busy, setBusy] = useState(false);
	const [closed, setClosed] = useState<{ pick: Pick; portion: number } | null>(null);

	const positionValue = pick.value;
	const customAmount = Number(customText);
	const portion = portionKind === "all" ? 1 : portionKind === "half" ? 0.5 : customAmount > 0 && positionValue > 0 && customAmount <= positionValue ? customAmount / positionValue : 0;

	async function confirm() {
		if (busy || portion <= 0) return; // nothing to sell yet: Android just ignores the tap
		setBusy(true);
		try {
			// 99.9% and up is the whole position - otherwise the server keeps a sliver (the apps send 1 too).
			if (await paper.sell(pick.ticker, portion >= 0.999 ? 1 : portion)) setClosed({ pick, portion });
		} finally {
			setBusy(false);
		}
	}

	const receipt = closed !== null;
	const slice = closed?.portion ?? 1;
	const soldValue = (closed?.pick.value ?? 0) * slice;
	const gain = (closed?.pick.gain ?? 0) * slice;

	return (
		<SheetScaffold label={receipt ? "Position closed" : `Sell ${pick.ticker}`} onDismiss={receipt ? onViewPortfolio : onClose} scrim="rgba(2,5,14,0.62)" draggable={false}>
			<div key={receipt ? "closed" : "confirm"} style={{ display: "flex", flexDirection: "column", gap: cu(14), alignItems: receipt ? "center" : "stretch", animation: "sheet-fade 350ms ease-out" }}>
				{receipt ? (
					<>
						<SheetCheck />
						<h2 style={{ font: f(600, 18, undefined, "heading"), color: "#fff" }}>{closed.portion < 0.999 ? "Position reduced" : "Position closed"}</h2>
						<div className="w-full"><PickSellRow pick={closed.pick} /></div>
						<p className="w-full" style={{ font: f(400, 12, 18), color: DISC.body }}>
							Sold {(closed.pick.shares * slice).toFixed(4)} shares from your {stakeLabel(closed.pick.stake * slice)} stake.
						</p>
						<div className="flex w-full flex-col" style={{ gap: cu(12) }}>
							<div className="flex items-baseline" style={{ gap: cu(6) }}>
								<span style={{ font: f(400, 12, 16), color: DISC.muted }}>Proceeds</span>
								<span style={{ font: f(600, 12, 15, "heading"), color: DISC.ink }}>{usd(soldValue)}</span>
							</div>
							<div className="flex items-baseline justify-center" style={{ gap: cu(6) }}>
								<span style={{ font: f(400, 12, 16), color: DISC.muted }}>Returned</span>
								<span style={{ font: f(600, 15, 19, "heading"), color: DISC.ink }}>{usd(soldValue)}</span>
								<span style={{ font: f(400, 12, 16), color: DISC.muted }}>to your cash ({signedUsd(gain)})</span>
							</div>
						</div>
						<div className="flex w-full flex-col" style={{ gap: cu(16) }}>
							<SheetCta onClick={onBackToSimulate} shadow={`${tealShadow(49.862, 19.512, 0.01)}, ${tealShadow(28.183, 16.62, 0.03)}`}>Back to Simulate</SheetCta>
							<SheetSecondary onClick={onViewPortfolio}>View portfolio</SheetSecondary>
						</div>
					</>
				) : (
					<>
						<h2 style={{ font: f(600, 18, undefined, "heading"), color: "#fff" }}>Sell {pick.ticker}?</h2>
						<PickSellRow pick={pick} />
						<p style={{ font: f(400, 12, 18), color: DISC.body }}>You hold {pick.shares.toFixed(4)} shares from your {stakeLabel(pick.stake)} stake.</p>
						<div style={{ display: "flex", flexDirection: "column", gap: cu(12) }}>
							<div className="flex items-baseline" style={{ gap: cu(6) }}>
								<span style={{ font: f(400, 12, 16), color: DISC.muted }}>Position value</span>
								<span style={{ font: f(500, 12, 16), color: DISC.ink }}>{usd(positionValue)}</span>
							</div>
							<div className="flex" style={{ gap: cu(8) }} role="group" aria-label="How much to sell">
								<PillChoice label="All" radius={6} selected={portionKind === "all"} onClick={() => setPortionKind("all")} />
								<PillChoice label="Half" radius={6} selected={portionKind === "half"} onClick={() => setPortionKind("half")} />
								<PillChoice label="Custom" radius={6} selected={portionKind === "custom"} onClick={() => setPortionKind("custom")} />
							</div>
							{portionKind === "custom" && <MoneyField prefix="$" value={customText} onChange={setCustomText} placeholder="0.00" label="Dollars to sell" radius={6} />}
							<div className="flex items-baseline justify-center" style={{ gap: cu(6) }}>
								<span style={{ font: f(400, 12, 16), color: DISC.muted }}>Returning</span>
								<span style={{ font: f(600, 15, 19, "heading"), color: DISC.ink }}>{usd(positionValue * portion)}</span>
								<span style={{ font: f(400, 12, 16), color: DISC.muted }}>to your cash</span>
							</div>
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: cu(16) }}>
							<DarkCta onClick={confirm} shadow={tealShadow(12.285, 12.285, 0.04)}>Confirm sell</DarkCta>
							<SheetSecondary onClick={onClose}>Back</SheetSecondary>
						</div>
					</>
				)}
			</div>
		</SheetScaffold>
	);
}
