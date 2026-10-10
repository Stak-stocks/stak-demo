import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BackButton } from "@/app/auth/ui";
import { col } from "@/app/FitCanvas";
import { COLLECTION_DESCRIPTIONS, companyInitial, companyName } from "@/app/live/catalog";
import { useCollections } from "@/app/live/collections";
import { useShowcase } from "@/app/live/showcase";
import { changeShort, money, signedPct } from "@/app/live/format";
import { type Quote, useQuotes } from "@/app/live/quotes";
import { MS } from "@/app/mystak/assets";
import { COLLECTION_ICONS, COLLECTION_PAGE, SHOWCASE } from "@/app/mystak/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/my-stak/$collection")({
	component: CollectionPage,
});

/**
 * Figma 2:4830 "Desktop · Collection · AI & Tech" (1440x1092): the collection's saves as 300-wide cards,
 * three per row, the dashed "Add stock" tile closing the last row. Prices and moves are today's quotes.
 */
function CollectionPage() {
	const { collection: slug } = Route.useParams();
	const navigate = useNavigate();
	const c = useCollections();
	const group = c.byPath(slug);
	/** the untouched demo persona sees the frame's own AI & Tech collection (2:4830, live/showcase.ts) */
	const showcase = useShowcase();
	const authored = showcase && group ? SHOWCASE.collections[group.slug] : undefined;
	const authoredQuotes = useQuotes(authored ? authored.stocks.map((s) => s.ticker) : []);
	useEffect(() => {
		if (!group) navigate({ to: "/my-stak", replace: true });
	}, [group, navigate]);
	if (!group) return null;

	const icon = COLLECTION_ICONS[group.slug];
	const tickers = authored ? authored.stocks.map((s) => s.ticker) : group.tickers;
	const names: Record<string, string> = Object.fromEntries((authored?.stocks ?? []).map((s) => [s.ticker, s.name]));
	const quoteOf = (t: string) => authoredQuotes[t] ?? c.quotes[t] ?? null;

	return (
		<div className="flex flex-col items-start gap-[37px]" style={{ width: col(932) }}>
			<div className="flex flex-col items-start gap-[31px]">
				<BackButton fallbackTo="/my-stak" className="stak-press cursor-pointer" />
				<p className="whitespace-pre font-geist text-[16px] font-medium leading-[21px] text-[#819abb]">{COLLECTION_PAGE.crumb(group.name)}</p>
			</div>
			<div className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-[49.142%] flex-col items-start gap-[17px]">
					<img alt="" src={icon.icon} className="size-[54px] rounded-[12px] object-cover" />
					<div className="flex w-full flex-col items-start gap-[10px]">
						<div className="flex w-full flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
							<h1 className="font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{group.name}</h1>
							<div className="flex items-center gap-[7px] overflow-clip text-[13px] leading-[17px]">
								<span className="font-geist text-[#819abb]">{authored ? `${authored.stocks.length} stocks` : group.countLabel}</span>
								{authored ? (
									<>
										<span className="font-geist text-[#5c6b85]">·</span>
										<span className="font-geist font-medium text-[#2fd08a]">{authored.meta}</span>
									</>
								) : group.avgChange !== null && (
									<>
										<span className="font-geist text-[#5c6b85]">·</span>
										<span className={cn("font-geist font-medium", group.avgChange < 0 ? "text-[#ff5a6a]" : "text-[#2fd08a]")}>
											{signedPct(group.avgChange)} today
										</span>
									</>
								)}
							</div>
						</div>
						<p className="w-full font-geist text-[13px] leading-[17px] text-[#c8d2e0]">{COLLECTION_DESCRIPTIONS[group.slug]}</p>
					</div>
				</div>
				{/* three 300px columns with 16px gaps (2:4830); the dashed "Add stock" tile closes the list */}
				<div className="grid w-full grid-cols-3 gap-[16px]">
					{tickers.map((ticker, i) => (
						<StockCard key={ticker} ticker={ticker} name={names[ticker]} quote={quoteOf(ticker)} first={i === 0} collection={group.slug} />
					))}
					<Link
						to="/discover"
						className="stak-press flex h-[195px] min-w-0 cursor-pointer flex-col items-center justify-center gap-[11px] overflow-clip rounded-[22.4px] border-[2.1px] border-dashed border-[#2a3346] p-[20px]"
					>
						<img alt="" src={MS.plusCircle} className="size-[33.6px]" />
						<span className="whitespace-nowrap font-geist text-[18.2px] font-medium leading-[24px] text-[#819abb]">{COLLECTION_PAGE.addStock}</span>
					</Link>
				</div>
			</div>
		</div>
	);
}

function StockCard({ ticker, name, quote, first, collection }: { ticker: string; name?: string; quote: Quote | null; first: boolean; collection: string }) {
	const up = (quote?.changePercent ?? 0) >= 0;
	return (
		<Link
			to="/stocks/$symbol"
			params={{ symbol: ticker }}
			search={{ saved: true, from: "my-stak", collection }}
			className="stak-press flex h-[195px] min-w-0 cursor-pointer flex-col items-start gap-[14px] overflow-clip rounded-[22.4px] bg-[#181f30] p-[20px]"
		>
			<span className="flex w-full items-center justify-between overflow-clip">
				<span className="flex size-[50.4px] items-center justify-center overflow-clip rounded-[25.2px] bg-[#242b3d]">
					<span className="whitespace-nowrap font-sora text-[19.6px] font-semibold leading-[25px] text-[#9eadc7]">{companyInitial(ticker)}</span>
				</span>
				{quote && (
					<span className={cn("whitespace-nowrap font-geist text-[16.8px] font-medium leading-[22px]", up ? "text-[#2fd08a]" : "text-[#e5484d]")}>
						{changeShort(quote.changePercent)}
					</span>
				)}
			</span>
			<span className="flex w-full flex-col items-start gap-[3px] overflow-clip whitespace-nowrap">
				<span className="font-sora text-[22.4px] font-semibold leading-[28px] text-white">{ticker}</span>
				<span className="w-full truncate font-geist text-[15.4px] leading-[20px] text-[#819abb]">{name ?? companyName(ticker)}</span>
			</span>
			<span className={cn("whitespace-nowrap font-sora text-[21px] leading-[26px] text-white", first ? "font-semibold" : "font-medium")}>
				{quote ? money(quote.price) : "—"}
			</span>
		</Link>
	);
}
