import { createFileRoute, Link } from "@tanstack/react-router";
import { BackButton } from "@/app/auth/ui";
import { col } from "@/app/FitCanvas";
import { MS } from "@/app/mystak/assets";
import { AI_TECH_COLLECTION, type CollectionStock, findCollection } from "@/app/mystak/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/my-stak/$collection")({
	component: CollectionPage,
});

/** Figma 2:4830 "Desktop · Collection · AI & Tech" (1440x1092). Demo: every slug shows the AI & Tech holdings. */
function CollectionPage() {
	const { collection: slug } = Route.useParams();
	const meta = findCollection(slug);
	const c = AI_TECH_COLLECTION;
	const name = meta?.name ?? c.name;
	const count = meta?.count ?? c.count;
	const icon = meta?.icon ?? c.icon;
	const stocks = c.stocks;
	return (
		<div className="flex flex-col items-start gap-[37px]" style={{ width: col(932) }}>
			<div className="flex flex-col items-start gap-[31px]">
				<BackButton fallbackTo="/my-stak" />
				<p className="whitespace-pre font-geist text-[16px] font-medium leading-[21px] text-[#819abb]">{`My STAK  /  Collections  /  ${name}`}</p>
			</div>
			<div className="flex w-full flex-col items-start gap-[30px]">
				<div className="flex w-[49.142%] flex-col items-start gap-[17px]">
					<img alt="" src={icon} className="size-[54px] rounded-[12px] object-cover" />
					<div className="flex w-full flex-col items-start gap-[10px]">
						<div className="flex w-full flex-col items-start gap-[4px] overflow-clip whitespace-nowrap">
							<h1 className="font-sora text-[26px] font-semibold leading-[33px] text-[#f2f6fc]">{name}</h1>
							<div className="flex items-center gap-[7px] overflow-clip text-[13px] leading-[17px]">
								<span className="font-geist text-[#819abb]">{count}</span>
								<span className="font-geist text-[#5c6b85]">·</span>
								<span className="font-geist font-medium text-[#2fd08a]">{c.change}</span>
							</div>
						</div>
						<p className="w-full font-geist text-[13px] leading-[17px] text-[#c8d2e0]">{c.description}</p>
					</div>
				</div>
				<div className="flex w-full flex-col items-start gap-[16px]">
					<div className="flex w-full items-center gap-[16px]">
						{stocks.slice(0, 3).map((s) => (
							<StockCard key={s.symbol} stock={s} collection={slug} />
						))}
					</div>
					<div className="flex w-full items-center gap-[16px]">
						{stocks.slice(3).map((s) => (
							<StockCard key={s.symbol} stock={s} collection={slug} />
						))}
						<Link
							to="/discover"
							className="flex h-[195px] min-w-0 flex-1 flex-col items-center justify-center gap-[11px] overflow-clip rounded-[22.4px] border-[2.1px] border-dashed border-[#2a3346] p-[20px]"
						>
							<img alt="" src={MS.plusCircle} className="size-[33.6px]" />
							<span className="whitespace-nowrap font-geist text-[18.2px] font-medium leading-[24px] text-[#819abb]">Add stock</span>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

function StockCard({ stock, collection }: { stock: CollectionStock; collection: string }) {
	return (
		<Link
			to="/stocks/$symbol"
			params={{ symbol: stock.symbol }}
			search={{ saved: true, from: "my-stak", collection }}
			className="flex h-[195px] min-w-0 flex-1 flex-col items-start gap-[14px] overflow-clip rounded-[22.4px] bg-[#181f30] p-[20px]"
		>
			<span className="flex w-full items-center justify-between overflow-clip">
				<span className="flex size-[50.4px] items-center justify-center overflow-clip rounded-[25.2px] bg-[#242b3d]">
					<span className="whitespace-nowrap font-sora text-[19.6px] font-semibold leading-[25px] text-[#9eadc7]">{stock.initial}</span>
				</span>
				<span className={cn("whitespace-nowrap font-geist text-[16.8px] font-medium leading-[22px]", stock.up ? "text-[#2fd08a]" : "text-[#e5484d]")}>
					{stock.change}
				</span>
			</span>
			<span className="flex flex-col items-start gap-[3px] overflow-clip whitespace-nowrap">
				<span className="font-sora text-[22.4px] font-semibold leading-[28px] text-white">{stock.symbol}</span>
				<span className="font-geist text-[15.4px] leading-[20px] text-[#819abb]">{stock.name}</span>
			</span>
			<span className={cn("whitespace-nowrap font-sora text-[21px] leading-[26px] text-white", stock.priceWeight === "semibold" ? "font-semibold" : "font-medium")}>
				{stock.price}
			</span>
		</Link>
	);
}
