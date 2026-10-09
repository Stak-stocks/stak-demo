import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { STAK_WEIGHTED_STOCK_TAGS, categoryName, getBrandLogoUrl } from "@stak/shared";
import { getStockChart, getStockData, type ChartRange, recordEngagement } from "@/lib/api";
import { useAccount } from "@/context/AccountContext";
import { useBrandsList } from "@/hooks/useBrandsList";
import { usePaperPortfolio } from "@/hooks/usePaperPortfolio";
import { useUpdates } from "@/hooks/useUpdates";
import { STAK_CAPACITY } from "@/lib/constants";
import { allPreMarket } from "@/lib/chartSeries";
import { getLastCloseRef } from "@/lib/utils";
import { pricesAsOf, rangeChangeText, sinceSavedFor } from "@/lib/stockPage";
import { usd } from "@/lib/simFormat";
import { BuyFlow } from "@/components/simulate/BuyFlow";
import { ChartNote, RangeChart, RangeChips, STOCK_RANGES, SheetCheck, SheetCta, SheetScaffold, SheetSecondary } from "@/components/simulate/simKit";
import { AnalystCard, CompareCard, LessonCard, NewsSignalCard, NumbersCard, RiskAndWatch, SinceYouSavedCard } from "@/components/stock/StockModules";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { BackCircle, PhonePage, f } from "@/components/phone/phone";
import { StockDesktop } from "@/components/stock/StockDesktop";
import { useIsMobile } from "@/hooks/use-mobile";
import { AskAiCard } from "@/components/stakAi/StakAiThread";
import { stockContext, useOpenStakAi } from "@/components/stakAi/open";

export const Route = createFileRoute("/stock/$symbol")({
	component: StockDetailPage,
});

const CATEGORY_BY_TICKER = new Map(STAK_WEIGHTED_STOCK_TAGS.map((s) => [s.ticker.toUpperCase(), s.primaryCategory]));
const LIVE_REFRESH_MS = 15_000;
const SAVED_PILL_BG = "rgba(105,179,202,0.12)";

function CompanyLogo({ src, name }: { src: string | null; name: string }) {
	const [failed, setFailed] = useState(false);
	return (
		<div className="grid shrink-0 place-items-center overflow-hidden" style={{ width: cu(44), height: cu(44), borderRadius: cu(12), background: DISC.avatar }} aria-hidden="true">
			{src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} style={{ width: cu(30), height: cu(30), objectFit: "contain" }} /> : <span style={{ font: f(600, 18, undefined, "heading"), color: DISC.muted }}>{name.slice(0, 1).toUpperCase()}</span>}
		</div>
	);
}

/** Android's stock page: price, a chart with range pills, what changed since you saved it, risks, news, numbers, analysts and a lesson. */
function StockDetailPage() {
	const { symbol: raw } = Route.useParams();
	const symbol = raw.toUpperCase();
	const navigate = useNavigate();
	const openStakAi = useOpenStakAi();
	const router = useRouter();
	const isMobile = useIsMobile();
	const { account, saveToStak, removeFromStak } = useAccount();
	const { data: brands } = useBrandsList();
	const paper = usePaperPortfolio();
	const { updates, markCompanyRead } = useUpdates();
	const brand = useMemo(() => (brands ?? []).find((b) => b.ticker.toUpperCase() === symbol), [brands, symbol]);
	// "Company pages opened" in Investing Taste: one event per visit to a symbol (as Android sends it).
	const openedRef = useRef<string | null>(null);
	useEffect(() => {
		if (!brands || openedRef.current === symbol) return;
		openedRef.current = symbol;
		recordEngagement("stock_detail_open", brand?.id, { ticker: symbol, categories: brand?.interestCategories }).catch(() => {});
	}, [brands, brand, symbol]);
	const name = brand?.name ?? symbol;

	const heldNow = !!brand && (account?.stakBrandIds ?? []).includes(brand.id);
	// Which CTA set applies is decided by whether it was saved when the page opened; saving here changes it for this visit.
	const fromMyStak = useRef<boolean | null>(null);
	if (fromMyStak.current === null && brands) fromMyStak.current = heldNow;
	const [savedHere, setSavedHere] = useState<boolean | null>(null);
	const saved = savedHere ?? heldNow;

	const [range, setRange] = useState<ChartRange>("1d");
	const [showSaved, setShowSaved] = useState(false);
	const [showBuy, setShowBuy] = useState(false);
	const [fullNotice, setFullNotice] = useState(false);
	useEffect(() => {
		if (!fullNotice) return;
		const t = setTimeout(() => setFullNotice(false), 3000);
		return () => clearTimeout(t);
	}, [fullNotice]);

	const stock = useQuery({
		queryKey: ["stock", symbol],
		queryFn: () => getStockData(symbol),
		staleTime: LIVE_REFRESH_MS,
		// Only the price and change move, and only while the market is open.
		refetchInterval: () => (getLastCloseRef() === "today" ? LIVE_REFRESH_MS : false),
		retry: 1,
	});
	const quote = stock.data?.quote ?? null;
	const price = quote && quote.price > 0 ? quote.price : null;

	const chart = useQuery({
		queryKey: ["stock-chart", symbol, range],
		queryFn: () => getStockChart(symbol, range),
		staleTime: range === "1d" ? 5 * 60 * 1000 : 30 * 60 * 1000,
		retry: 1,
	});
	const closes = (chart.data?.prices ?? []).filter((p) => p.close > 0);
	const flatToday = range === "1d" && allPreMarket(closes);
	// On 1D the line starts at yesterday's close.
	const values = [...(range === "1d" && quote?.prevClose ? [quote.prevClose] : []), ...closes.map((p) => p.close)];
	const chartPct = values.length >= 2 && values[0]! > 0 ? ((values[values.length - 1]! - values[0]!) / values[0]!) * 100 : null;
	const shownPct = range === "1d" ? (quote?.changePercent ?? chartPct) : chartPct;

	// The company's updates: which were unread on arrival is remembered so their dots don't flip while you read.
	const changes = useMemo(() => updates.filter((u) => u.ticker.toUpperCase() === symbol), [updates, symbol]);
	const unreadOnEntry = useRef<Set<number> | null>(null);
	if (unreadOnEntry.current === null && updates.length > 0) unreadOnEntry.current = new Set(changes.filter((c) => !c.read).map((c) => c.id));
	useEffect(() => {
		if (fromMyStak.current && changes.some((c) => !c.read)) markCompanyRead(symbol);
	}, [changes, symbol, markCompanyRead]);

	const goBack = () => (router.history.length > 1 ? router.history.back() : navigate({ to: "/my-stak" }));
	const category = CATEGORY_BY_TICKER.get(symbol);
	const entry = brand ? account?.stakSavedAt?.[brand.id] : undefined;
	const since = sinceSavedFor({ symbol, savedAt: entry?.savedAt ?? null, priceAtSave: entry?.priceAtSave ?? null, price, loading: stock.isPending });

	async function confirmSave() {
		setShowSaved(false);
		if (!brand) return;
		setSavedHere(true);
		try { await saveToStak(brand.id, price); } catch { setSavedHere(false); }
	}
	function startSave() {
		if ((account?.stakBrandIds ?? []).length >= STAK_CAPACITY) { setFullNotice(true); return; }
		setShowSaved(true);
	}
	// A paper portfolio has to be set up on Simulate before anything can be bought into it.
	function startBuy() {
		if (paper.needsSetup) navigate({ to: "/simulate" });
		else if (!paper.loading) setShowBuy(true);
	}
	async function unsave() {
		if (!brand) return;
		setSavedHere(false);
		await removeFromStak(brand.id).catch(() => setSavedHere(true));
		if (fromMyStak.current) goBack();
	}

	const held = fromMyStak.current === true;
	const changeColor = shownPct != null && shownPct < 0 ? "#FF5A6A" : DISC.green;

	// The saved sheet and the buy flow are shared by both layouts (they portal themselves over the page).
	const sheets = (
		<>
			{showSaved && (
				<SheetScaffold label="Saved to My STAK" onDismiss={confirmSave} scrim="rgba(12,19,32,0.55)">
					<div className="flex flex-col items-center" style={{ gap: cu(14), animation: "sheet-fade 350ms ease-out" }}>
						<SheetCheck />
						<h2 style={{ font: f(600, 18, undefined, "heading"), color: "#fff" }}>Saved to My STAK</h2>
						<div className="flex w-full items-center" style={{ gap: cu(11), borderRadius: cu(6), background: "rgba(105,179,202,0.10)", padding: `${cu(12)} ${cu(14)}` }}>
							<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(38), height: cu(38), background: DISC.avatar, font: f(600, 15, undefined, "heading"), color: DISC.badgeInk }}>{name.slice(0, 1).toUpperCase()}</span>
							<div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
								<span style={{ font: f(500, 13), color: "#fff" }}>{name}</span>
								<span style={{ font: f(400, 10), color: DISC.muted }}>{price != null ? `${usd(price)} today` : "— today"}</span>
							</div>
							{quote && <span style={{ font: f(500, 12), color: quote.changePercent >= 0 ? DISC.green : "#FF5A6A" }}>{quote.changePercent >= 0 ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(1)}%</span>}
						</div>
						<p className="w-full" style={{ font: f(400, 12, 18), color: DISC.body }}>Watching from today · no money committed</p>
						<div className="flex w-full flex-col" style={{ gap: cu(16) }}>
							<SheetCta onClick={async () => { await confirmSave(); navigate({ to: "/my-stak" }); }}>View in My STAK</SheetCta>
							<SheetSecondary onClick={confirmSave}>Keep exploring</SheetSecondary>
						</div>
					</div>
				</SheetScaffold>
			)}

			{showBuy && (
				<BuyFlow
					symbol={symbol}
					company={name}
					paper={paper}
					viewLabel="View in My STAK"
					onClose={() => setShowBuy(false)}
					onViewPortfolio={() => { setShowBuy(false); navigate({ to: "/my-stak" }); }}
				/>
			)}
		</>
	);

	if (!isMobile) {
		return (
			<>
				<StockDesktop
					symbol={symbol}
					name={name}
					logoSrc={brand ? getBrandLogoUrl(brand) : null}
					subtitle={category ? `${symbol} · in your ${categoryName(category)}` : symbol}
					saved={saved}
					held={held}
					canSave={!!brand}
					fullNotice={fullNotice}
					price={price}
					asOf={stock.isFetching && quote ? "Updating…" : price ? pricesAsOf() : ""}
					shownPct={shownPct}
					range={range}
					onRange={setRange}
					values={values}
					chartPct={chartPct}
					flatToday={flatToday}
					chartPending={chart.isPending}
					since={since}
					changes={changes}
					unreadOnEntry={unreadOnEntry.current ?? new Set()}
					metrics={stock.data?.metrics}
					changePct={quote?.changePercent ?? null}
					onBack={goBack}
					onSave={startSave}
					onUnsave={unsave}
					onPractice={held ? () => navigate({ to: "/simulate", search: { buy: symbol } }) : startBuy}
					onAskAi={() => openStakAi(stockContext(symbol))}
				/>
				{sheets}
			</>
		);
	}

	return (
		<PhonePage>
			<div className="relative flex items-center justify-between" style={{ padding: `${cu(8)} ${cu(18)}` }}>
				<BackCircle onClick={goBack} />
				<h1 className="pointer-events-none absolute inset-x-0 text-center" style={{ font: f(600, 16, undefined, "heading"), color: "#fff" }}>{symbol}</h1>
				<span aria-hidden="true" style={{ width: cu(40), height: cu(40) }} />
			</div>

			<div className="flex items-center" style={{ gap: cu(12), padding: `${cu(6)} ${cu(20)} 0` }}>
				<CompanyLogo src={brand ? getBrandLogoUrl(brand) : null} name={name} />
				<div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
					<p className="break-words" style={{ font: f(600, 20, undefined, "heading"), color: "#fff" }}>{name}</p>
					<p style={{ font: f(400, 11), color: DISC.muted }}>{category ? `${symbol} · in your ${categoryName(category)}` : symbol}</p>
				</div>
				{saved && (
					<span className="flex items-center" style={{ gap: cu(5), borderRadius: 999, background: SAVED_PILL_BG, padding: `${cu(5)} ${cu(10)}` }}>
						<svg viewBox="0 0 11 11" style={{ width: cu(10), height: cu(10) }} fill="#fff" aria-hidden="true"><path d="M2 1h7v9L5.5 7.6 2 10z" /></svg>
						<span style={{ font: f(500, 11), color: "#69B3CA" }}>Saved</span>
					</span>
				)}
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: cu(4), padding: `${cu(10)} ${cu(20)} ${cu(6)}` }}>
				<p className="truncate" style={{ font: f(400, 11), color: DISC.muted, minHeight: cu(14) }}>{stock.isFetching && quote ? "Updating…" : price ? pricesAsOf() : ""}</p>
				<p style={{ font: f(600, 26, undefined, "heading"), color: "#F2F6FC" }}>{price != null ? usd(price) : "—"}</p>
				{shownPct != null && <p style={{ font: f(500, 12), color: changeColor }}>{rangeChangeText(shownPct, range)}</p>}
			</div>

			<div className="flex justify-center">
				{flatToday ? <ChartNote width={345} height={76} color={DISC.muted}>Not much movement yet today</ChartNote>
					: values.length >= 2 ? <RangeChart values={values} width={345} height={76} color={(chartPct ?? 0) >= 0 ? DISC.green : "#FF5A6A"} />
					: <ChartNote width={345} height={76} color={DISC.muted}>{chart.isPending ? "" : "No price history for this range"}</ChartNote>}
			</div>
			<div style={{ paddingTop: cu(40) }}><RangeChips value={range} onChange={setRange} ranges={STOCK_RANGES} /></div>

			<div style={{ display: "flex", flexDirection: "column", gap: cu(14), padding: `${cu(12)} ${cu(20)}` }}>
				{held && <SinceYouSavedCard value={since.value} tone={since.tone} body={since.body} changes={changes} unreadOnEntry={unreadOnEntry.current ?? new Set()} />}
				<RiskAndWatch symbol={symbol} />
				<NewsSignalCard symbol={symbol} name={name} changePct={quote?.changePercent ?? null} />
				<NumbersCard symbol={symbol} metrics={stock.data?.metrics} />
				<AnalystCard symbol={symbol} name={name} price={price} />
				<CompareCard symbol={symbol} metrics={stock.data?.metrics} />
				<LessonCard symbol={symbol} />
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: cu(10), padding: `${cu(4)} ${cu(20)} ${cu(16)}` }}>
				{/* STAK AI (2026-10-01): the chat about this stock, "Why is it moving today?" first among its suggestions. */}
				<AskAiCard variant="phone" title={`Why is ${symbol} moving?`} subtitle="Ask STAK AI · plain English, today's numbers" onOpen={() => openStakAi(stockContext(symbol))} />
				{held ? (
					<>
						<SheetCta onClick={() => navigate({ to: "/simulate", search: { buy: symbol } })}>Practice with {name} · paper money</SheetCta>
						<SheetSecondary onClick={unsave} height={52}>Unsave</SheetSecondary>
					</>
				) : saved ? (
					<>
						<SheetCta onClick={startBuy}>Practice buy</SheetCta>
						<SheetSecondary onClick={unsave}>Unsave</SheetSecondary>
					</>
				) : (
					<>
						<SheetCta onClick={startSave} disabled={!brand}>Save</SheetCta>
						{fullNotice && <p role="status" className="text-center" style={{ font: f(400, 11), color: DISC.muted }}>Your STAK is full — remove a stock to save another</p>}
						<SheetSecondary onClick={startBuy}>Practice buy</SheetSecondary>
					</>
				)}
			</div>

			{sheets}
		</PhonePage>
	);
}
