import { type ReactNode, useRef, useState } from "react";
import { money, shares4, signedMoney } from "@/app/live/format";
import { Sheet } from "@/app/ui/Sheet";
import { cn } from "@/lib/utils";
import { SA } from "./assets";
import { buyFailed, cashAvailable, pickDetail, sheets, type Stock } from "./data";
import { AmountChip, Avatar, CustomChip, GhostButton, GradientButton, SellButton } from "./ui";

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
			<p className={cn("whitespace-nowrap font-geist text-[12px] font-medium leading-[16px]", stock.up ? "text-[#2fd08a]" : "text-[#e5484d]")}>{stock.pct}</p>
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

const clampPct = (v: string) => Math.min(100, Math.max(0, Number(v) || 0));

/**
 * The "Custom" chip's field: `custom` is null while the chip shows and a string while the field does.
 * Escape in the field cancels back to the chip, which takes focus again once it is back in the DOM.
 */
function useCustomField() {
	const [custom, setCustom] = useState<string | null>(null);
	const chipRef = useRef<HTMLButtonElement>(null);
	const cancel = () => {
		setCustom(null);
		requestAnimationFrame(() => chipRef.current?.focus());
	};
	return { custom, setCustom, chipRef, cancel };
}

/**
 * 2:1421 "Add NVDA to your portfolio?" (canonical) / 2:1079 "Buy PLTR?" (alternate frame, 12px cash gap).
 * `cash` is the live paper cash; the amount must fit in it before Confirm enables.
 */
export function AddConfirmSheet({
	symbol,
	stock,
	alt,
	cash,
	onConfirm,
	onClose,
}: { symbol: string; stock: Stock; alt?: boolean; cash?: number; onConfirm: (amount: number) => void | Promise<void>; onClose: () => void }) {
	const [picked, setPicked] = useState<number>(25);
	const { custom, setCustom, chipRef, cancel: cancelCustom } = useCustomField();
	const [busy, setBusy] = useState(false);
	const s = sheets.addConfirm;
	const available = cash ?? cashAvailable;
	const amount = custom !== null ? Number(custom) || 0 : picked;
	const valid = amount > 0 && amount <= available + 0.005 && stock.price > 0;
	const over = custom !== null && amount > available + 0.005; // a typed amount the paper cash cannot cover: say so, do not just grey out
	const confirm = async () => {
		if (!valid || busy) return;
		setBusy(true);
		try {
			await onConfirm(amount);
		} finally {
			setBusy(false);
		}
	};
	const chips = (
		<div className="flex w-full items-start gap-[8px] overflow-clip">
			{s.amounts.map((a) => (
				<AmountChip
					key={a}
					selected={custom === null && picked === a}
					onClick={() => {
						setCustom(null);
						setPicked(a);
					}}
				>
					${a}
				</AmountChip>
			))}
			{custom === null ? (
				<AmountChip ref={chipRef} selected={false} onClick={() => setCustom("")}>
					{s.custom}
				</AmountChip>
			) : (
				<CustomChip prefix="$" value={custom} onChange={setCustom} onCancel={cancelCustom} max={Math.floor(available)} />
			)}
		</div>
	);
	const reason = over ? (
		<p role="alert" className="font-geist text-[11px] leading-[14px] text-[#e5484d]">
			That is more than your paper cash. Up to {money(Math.floor(available))} fits.
		</p>
	) : null;
	const line = <BigLine before={s.youGet} big={shares4(valid ? amount / stock.price : 0)} after={s.sharesOf(symbol)} />;
	return (
		<Modal scrim={alt ? "rgba(11,8,8,0.86)" : "rgba(0,0,0,0.66)"} label={alt ? s.titleAlt(symbol) : s.title(symbol)} onClose={onClose}>
			<SheetTitle>{alt ? s.titleAlt(symbol) : s.title(symbol)}</SheetTitle>
			<StockRow stock={stock} name={stock.nameConfirm} />
			<Description>{s.description}</Description>
			{alt ? (
				<div className="flex w-full flex-col items-start gap-[12px] overflow-clip">
					<KeyValue label={s.cashLabel} value={money(available)} />
					<div className="flex w-full flex-col items-start gap-[24px]">
						{chips}
						{reason}
						{line}
					</div>
				</div>
			) : (
				<div className="flex w-full flex-col items-start gap-[24px] overflow-clip">
					<div className="flex w-full flex-col items-start gap-[15px]">
						<KeyValue label={s.cashLabel} value={money(available)} />
						{chips}
						{reason}
					</div>
					{line}
				</div>
			)}
			<Buttons>
				<GradientButton onClick={confirm} disabled={!valid || busy}>
					{s.confirm}
				</GradientButton>
				<GhostButton onClick={onClose}>{sheets.back}</GhostButton>
			</Buttons>
		</Modal>
	);
}

/** 2:1699 "Order filled". `shares` and `cash` are the filled quantity and the cash left; without them the sheet estimates from the amount. */
export function AddSuccessSheet({
	symbol,
	stock,
	amount,
	shares,
	cash,
	onPrimary,
	onClose,
}: { symbol: string; stock: Stock; amount: number; shares?: number; cash?: number; onPrimary: () => void; onClose: () => void }) {
	const s = sheets.addSuccess;
	const held = shares ?? (stock.price > 0 ? amount / stock.price : 0);
	const cashAfter = cash ?? cashAvailable - amount;
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
					<KeyValue label={s.cashLabel} value={money(cashAfter)} />
					<BigLine before={s.youHold} big={shares4(held)} after={sheets.addConfirm.sharesOf(symbol)} />
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

/** 2:1529 "Sell NVDA?" over the pick detail. `shares` / `value` are the live position. */
export function SellConfirmSheet({
	symbol,
	stock,
	shares,
	value,
	onConfirm,
	onClose,
}: { symbol: string; stock: Stock; shares?: number; value?: number; onConfirm: (portion: number) => void | Promise<void>; onClose: () => void }) {
	const [portion, setPortion] = useState(0.5);
	const { custom, setCustom, chipRef, cancel: cancelCustom } = useCustomField();
	const [busy, setBusy] = useState(false);
	const s = sheets.sellConfirm;
	const held = shares ?? pickDetail.position.shares;
	const worth = value ?? pickDetail.position.value;
	const frac = custom !== null ? clampPct(custom) / 100 : portion;
	const valid = frac > 0 && held > 0;
	const confirm = async () => {
		if (!valid || busy) return;
		setBusy(true);
		try {
			await onConfirm(frac);
		} finally {
			setBusy(false);
		}
	};
	return (
		<Modal halfPixel={false} label={s.title(symbol)} onClose={onClose}>
			<SheetTitle>{s.title(symbol)}</SheetTitle>
			<StockRow stock={stock} name={stock.nameConfirm} />
			<Description>{`You hold ${shares4(held)} shares, worth ${money(worth)} today. Selling returns paper cash at today’s price.`}</Description>
			<div className="flex w-full flex-col items-start gap-[24px] overflow-clip">
				<div className="flex w-full flex-col items-start gap-[15px]">
					<KeyValue label={s.positionLabel} value={`${shares4(held)} shares · ${money(worth)}`} />
					<div className="flex w-full items-start gap-[8px] overflow-clip">
						{s.portions.map((p, i) => (
							<AmountChip
								key={p}
								selected={custom === null && portion === p}
								onClick={() => {
									setCustom(null);
									setPortion(p);
								}}
							>
								{s.portionLabels[i]}
							</AmountChip>
						))}
						{custom === null ? (
							<AmountChip ref={chipRef} selected={false} onClick={() => setCustom("")}>
								{s.custom}
							</AmountChip>
						) : (
							<CustomChip suffix="%" value={custom} onChange={setCustom} onCancel={cancelCustom} max={100} label="Custom portion" />
						)}
					</div>
				</div>
				<BigLine before={s.youGetBack} big={money(worth * frac)} after={s.forShares(shares4(held * frac))} />
			</div>
			<Buttons>
				<GradientButton onClick={confirm} disabled={!valid || busy}>
					{s.confirm}
				</GradientButton>
				<GhostButton onClick={onClose}>{sheets.back}</GhostButton>
			</Buttons>
		</Modal>
	);
}

/** 2:1801 "Position closed" — the sale that just happened. */
export function SellSuccessSheet({
	stock,
	shares,
	stake,
	proceeds,
	pnl,
	onPrimary,
	onSecondary,
	onClose,
}: {
	stock: Stock;
	shares: number;
	stake: number;
	proceeds: number;
	pnl: number;
	onPrimary: () => void;
	onSecondary: () => void;
	onClose: () => void;
}) {
	const s = sheets.sellSuccess;
	return (
		<Modal label={s.title} onClose={onClose}>
			<div className="flex w-full flex-col items-center gap-[14px]">
				<img alt="" src={SA.checkCircle} className="size-[47px]" />
				<SheetTitle>{s.title}</SheetTitle>
			</div>
			<StockRow stock={stock} name={stock.name} radius={6} />
			<Description>{`Sold ${shares4(shares)} shares from your $${Math.round(stake).toLocaleString("en-US")} stake.`}</Description>
			<div className="flex w-full flex-col items-start gap-[12px] overflow-clip whitespace-nowrap">
				<KeyValue label={s.proceeds} value={money(proceeds)} valueClass="font-sora text-[12px] font-semibold leading-[15px]" />
				<BigLine before={s.returned} big={money(proceeds)} after={s.toCash(signedMoney(pnl))} />
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
	shares,
	stake,
	value,
	onConfirm,
	onClose,
}: {
	symbol: string;
	stock: Stock;
	shares?: number;
	stake?: number;
	value?: number;
	onConfirm: (portion: number) => void | Promise<void>;
	onClose: () => void;
}) {
	const [portion, setPortion] = useState(1);
	const { custom, setCustom, chipRef, cancel: cancelCustom } = useCustomField();
	const [busy, setBusy] = useState(false);
	const s = sheets.portfolioSell;
	const held = shares ?? pickDetail.position.shares;
	const staked = stake ?? pickDetail.position.stake;
	const worth = value ?? pickDetail.position.value;
	const frac = custom !== null ? clampPct(custom) / 100 : portion;
	const valid = frac > 0 && held > 0;
	const confirm = async () => {
		if (!valid || busy) return;
		setBusy(true);
		try {
			await onConfirm(frac);
		} finally {
			setBusy(false);
		}
	};
	return (
		<Modal scrim="rgba(17,14,14,0.74)" halfPixel={false} label={s.title(symbol)} onClose={onClose}>
			<SheetTitle>{s.title(symbol)}</SheetTitle>
			<StockRow stock={stock} name={stock.name} />
			<Description>{`You hold ${shares4(held)} shares from your $${Math.round(staked).toLocaleString("en-US")} stake.`}</Description>
			<div className="flex w-full flex-col items-start gap-[12px] overflow-clip">
				<KeyValue label={s.positionLabel} value={money(worth)} />
				<div className="flex w-full flex-col items-start gap-[24px]">
					<div className="flex w-full items-start gap-[8px] overflow-clip">
						{s.portions.map((p, i) => (
							<AmountChip
								key={p}
								selected={custom === null && portion === p}
								onClick={() => {
									setCustom(null);
									setPortion(p);
								}}
							>
								{s.portionLabels[i]}
							</AmountChip>
						))}
						{custom === null ? (
							<AmountChip ref={chipRef} selected={false} onClick={() => setCustom("")}>
								{s.custom}
							</AmountChip>
						) : (
							<CustomChip suffix="%" value={custom} onChange={setCustom} onCancel={cancelCustom} max={100} label="Custom portion" />
						)}
					</div>
					<BigLine before={s.returning} big={money(worth * frac)} after={s.toCash} />
				</div>
			</div>
			<Buttons>
				<SellButton onClick={confirm} disabled={!valid || busy}>
					{s.sell}
				</SellButton>
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
