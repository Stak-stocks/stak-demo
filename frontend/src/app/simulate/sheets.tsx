import { type ReactNode, useState } from "react";
import { Sheet } from "@/app/ui/Sheet";
import { cn } from "@/lib/utils";
import { SA } from "./assets";
import { buyFailed, cashAvailable, money, pickDetail, sheets, shares4, signedMoney, type Stock } from "./data";
import { AmountChip, Avatar, GhostButton, GradientButton, SellButton } from "./ui";

/** Scrim + centred 480 sheet ("Sheet" 2:1421 et al.) on the native dialog. The scrim colour differs per frame in the Figma. */
export function Modal({
	scrim = "rgba(0,0,0,0.66)",
	halfPixel = true,
	label = "Sheet",
	onClose,
	children,
}: { scrim?: string; halfPixel?: boolean; label?: string; onClose: () => void; children: ReactNode }) {
	return (
		<Sheet label={label} scrim={scrim} offsetY={halfPixel ? 0.5 : 0} onClose={onClose}>
			{children}
		</Sheet>
	);
}

function SheetTitle({ children }: { children: ReactNode }) {
	return <p className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-white">{children}</p>;
}

function StockRow({ stock, name, gap = 11, radius = 5.78 }: { stock: Stock; name: string; gap?: number; radius?: number }) {
	return (
		<div className="flex w-full items-center overflow-clip bg-[rgba(105,179,202,0.1)] px-[14px] py-[12px]" style={{ gap, borderRadius: radius }}>
			<Avatar letter={stock.initial} size={38} radius={19} bg="#242b3d" />
			<div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip whitespace-nowrap">
				<p className="font-geist text-[13px] font-medium leading-[17px] text-white">{name}</p>
				<p className="font-geist text-[10px] leading-[13px] text-[#819abb]">{money(stock.price)} today</p>
			</div>
			<p className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#2fd08a]">{stock.pct}</p>
		</div>
	);
}

function Description({ children }: { children: ReactNode }) {
	return <p className="w-full font-geist text-[12px] leading-[18px] text-[#c8d2e0]">{children}</p>;
}

function KeyValue({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
	return (
		<div className="flex items-center gap-[6px] overflow-clip whitespace-nowrap text-[12px]">
			<p className="font-geist leading-[16px] text-[#819abb]">{label}</p>
			<p className={cn("font-geist font-medium leading-[16px] text-[#f2f6fc]", valueClass)}>{value}</p>
		</div>
	);
}

function BigLine({ before, big, after }: { before: string; big: string; after: string }) {
	return (
		<div className="flex w-full items-baseline justify-center gap-[6px] overflow-clip whitespace-nowrap">
			<p className="font-geist text-[12px] leading-[16px] text-[#819abb]">{before}</p>
			<p className="font-sora text-[15px] font-semibold leading-[19px] text-[#f2f6fc]">{big}</p>
			<p className="font-geist text-[12px] leading-[16px] text-[#819abb]">{after}</p>
		</div>
	);
}

function Buttons({ children }: { children: ReactNode }) {
	return <div className="flex w-full flex-col items-start gap-[16px]">{children}</div>;
}

/** 2:1421 "Add NVDA to your portfolio?" (canonical) / 2:1079 "Buy PLTR?" (alternate frame, 12px cash gap). */
export function AddConfirmSheet({
	symbol,
	stock,
	alt,
	onConfirm,
	onClose,
}: { symbol: string; stock: Stock; alt?: boolean; onConfirm: (amount: number) => void; onClose: () => void }) {
	const [amount, setAmount] = useState(25);
	const s = sheets.addConfirm;
	const chips = (
		<div className="flex w-full items-start gap-[8px] overflow-clip">
			{s.amounts.map((a) => (
				<AmountChip key={a} selected={amount === a} onClick={() => setAmount(a)}>
					${a}
				</AmountChip>
			))}
			<AmountChip selected={false}>{s.custom}</AmountChip>
		</div>
	);
	const line = <BigLine before={s.youGet} big={shares4(amount / stock.price)} after={s.sharesOf(symbol)} />;
	return (
		<Modal scrim={alt ? "rgba(11,8,8,0.86)" : "rgba(0,0,0,0.66)"} label={alt ? s.titleAlt(symbol) : s.title(symbol)} onClose={onClose}>
			<SheetTitle>{alt ? s.titleAlt(symbol) : s.title(symbol)}</SheetTitle>
			<StockRow stock={stock} name={stock.nameConfirm} />
			<Description>{s.description}</Description>
			{alt ? (
				<div className="flex w-full flex-col items-start gap-[12px] overflow-clip">
					<KeyValue label={s.cashLabel} value={money(cashAvailable)} />
					<div className="flex w-full flex-col items-start gap-[24px]">
						{chips}
						{line}
					</div>
				</div>
			) : (
				<div className="flex w-full flex-col items-start gap-[24px] overflow-clip">
					<div className="flex w-full flex-col items-start gap-[15px]">
						<KeyValue label={s.cashLabel} value={money(cashAvailable)} />
						{chips}
					</div>
					{line}
				</div>
			)}
			<Buttons>
				<GradientButton onClick={() => onConfirm(amount)}>{s.confirm}</GradientButton>
				<GhostButton onClick={onClose}>{sheets.back}</GhostButton>
			</Buttons>
		</Modal>
	);
}

/** 2:1699 "Order filled". */
export function AddSuccessSheet({
	symbol,
	stock,
	amount,
	onPrimary,
	onClose,
}: { symbol: string; stock: Stock; amount: number; onPrimary: () => void; onClose: () => void }) {
	const s = sheets.addSuccess;
	return (
		<Modal halfPixel={false} label={s.title} onClose={onClose}>
			<div className="flex w-full flex-col items-center gap-[14px]">
				<div className="flex w-full flex-col items-center gap-[14px]">
					<img alt="" src={SA.checkCircle} className="size-[47px]" />
					<SheetTitle>{s.title}</SheetTitle>
					<StockRow stock={stock} name={stock.name} gap={12} radius={6} />
				</div>
				<Description>{s.description}</Description>
			</div>
			<div className="flex w-full flex-col items-start overflow-clip">
				<div className="flex w-full flex-col items-start gap-[24px]">
					<KeyValue label={s.cashLabel} value={money(cashAvailable - amount)} />
					<BigLine before={s.youHold} big={shares4(amount / stock.price)} after={sheets.addConfirm.sharesOf(symbol)} />
				</div>
			</div>
			<Buttons>
				<GradientButton onClick={onPrimary}>{s.primary}</GradientButton>
				<GhostButton onClick={onClose} height={52} radius={6} fontSize={14}>
					{s.secondary}
				</GhostButton>
			</Buttons>
		</Modal>
	);
}

/** 2:1529 "Sell NVDA?" over the pick detail. */
export function SellConfirmSheet({
	symbol,
	stock,
	onConfirm,
	onClose,
}: { symbol: string; stock: Stock; onConfirm: (portion: number) => void; onClose: () => void }) {
	const [portion, setPortion] = useState(0.5);
	const s = sheets.sellConfirm;
	const pos = pickDetail.position;
	return (
		<Modal halfPixel={false} label={s.title(symbol)} onClose={onClose}>
			<SheetTitle>{s.title(symbol)}</SheetTitle>
			<StockRow stock={stock} name={stock.nameConfirm} />
			<Description>{s.description}</Description>
			<div className="flex w-full flex-col items-start gap-[24px] overflow-clip">
				<div className="flex w-full flex-col items-start gap-[15px]">
					<KeyValue label={s.positionLabel} value={s.positionValue} />
					<div className="flex w-full items-start gap-[8px] overflow-clip">
						{s.portions.map((p, i) => (
							<AmountChip key={p} selected={portion === p} onClick={() => setPortion(p)}>
								{s.portionLabels[i]}
							</AmountChip>
						))}
						<AmountChip selected={false}>{s.custom}</AmountChip>
					</div>
				</div>
				<BigLine before={s.youGetBack} big={money(pos.value * portion)} after={s.forShares(shares4(pos.shares * portion))} />
			</div>
			<Buttons>
				<GradientButton onClick={() => onConfirm(portion)}>{s.confirm}</GradientButton>
				<GhostButton onClick={onClose}>{sheets.back}</GhostButton>
			</Buttons>
		</Modal>
	);
}

/** 2:1801 "Position closed". */
export function SellSuccessSheet({
	stock,
	portion,
	onPrimary,
	onSecondary,
	onClose,
}: { stock: Stock; portion: number; onPrimary: () => void; onSecondary: () => void; onClose: () => void }) {
	const s = sheets.sellSuccess;
	const pos = pickDetail.position;
	const proceeds = pos.value * portion;
	const gain = (pos.value - pos.stake) * portion;
	return (
		<Modal label={s.title} onClose={onClose}>
			<div className="flex w-full flex-col items-center gap-[14px]">
				<img alt="" src={SA.checkCircle} className="size-[47px]" />
				<SheetTitle>{s.title}</SheetTitle>
			</div>
			<StockRow stock={stock} name={stock.name} radius={6} />
			<Description>{s.description(shares4(pos.shares * portion))}</Description>
			<div className="flex w-full flex-col items-start gap-[12px] overflow-clip whitespace-nowrap">
				<KeyValue label={s.proceeds} value={money(proceeds)} valueClass="font-sora text-[12px] font-semibold leading-[15px]" />
				<BigLine before={s.returned} big={money(proceeds)} after={s.toCash(signedMoney(gain))} />
			</div>
			<Buttons>
				<GradientButton onClick={onPrimary}>{s.primary}</GradientButton>
				<GhostButton onClick={onSecondary} height={52} radius={6} fontSize={14}>
					{s.secondary}
				</GhostButton>
			</Buttons>
		</Modal>
	);
}

/** 2:1219 "Sell NVDA?" over the portfolio (alternate frame 2:1116). */
export function PortfolioSellSheet({
	symbol,
	stock,
	onConfirm,
	onClose,
}: { symbol: string; stock: Stock; onConfirm: (portion: number) => void; onClose: () => void }) {
	const [portion, setPortion] = useState(1);
	const s = sheets.portfolioSell;
	const pos = pickDetail.position;
	return (
		<Modal scrim="rgba(17,14,14,0.74)" halfPixel={false} label={s.title(symbol)} onClose={onClose}>
			<SheetTitle>{s.title(symbol)}</SheetTitle>
			<StockRow stock={stock} name={stock.name} />
			<Description>{s.description}</Description>
			<div className="flex w-full flex-col items-start gap-[12px] overflow-clip">
				<KeyValue label={s.positionLabel} value={s.positionValue} />
				<div className="flex w-full flex-col items-start gap-[24px]">
					<div className="flex w-full items-start gap-[8px] overflow-clip">
						{s.portions.map((p, i) => (
							<AmountChip key={p} selected={portion === p} onClick={() => setPortion(p)}>
								{s.portionLabels[i]}
							</AmountChip>
						))}
						<AmountChip selected={false}>{s.custom}</AmountChip>
					</div>
					<BigLine before={s.returning} big={money(pos.value * portion)} after={s.toCash} />
				</div>
			</div>
			<Buttons>
				<SellButton onClick={() => onConfirm(portion)}>{s.sell}</SellButton>
				<GhostButton onClick={onClose}>{sheets.back}</GhostButton>
			</Buttons>
		</Modal>
	);
}

/** 2:1972 "Couldn’t place that trade" (10 · States, over Simulate home). */
export function BuyFailedSheet({
	stock,
	onRetry,
	onClose,
}: { stock: Stock; onRetry: () => void; onClose: () => void }) {
	return (
		<Modal label={buyFailed.title} onClose={onClose}>
			<SheetTitle>{buyFailed.title}</SheetTitle>
			<p className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#e5484d]">{buyFailed.status}</p>
			<StockRow stock={stock} name={stock.nameConfirm} />
			<Description>{buyFailed.description}</Description>
			<Buttons>
				<GradientButton onClick={onRetry}>{buyFailed.retry}</GradientButton>
				<GhostButton onClick={onClose}>{buyFailed.dismiss}</GhostButton>
			</Buttons>
		</Modal>
	);
}
