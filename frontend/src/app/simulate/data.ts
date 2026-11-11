/** Section 07 · Simulate (2:633) and 09 · Simulate flows (2:1256) — Figma copy, verbatim. */

export type Stock = { name: string; nameConfirm: string; price: number; pct: string; up: boolean; initial: string };

/** Prices and moves shown across the Simulate frames. */
export const stocks: Record<string, Stock> = {
	NVDA: { name: "NVIDIA Corp", nameConfirm: "NVIDIA Corp.", price: 122.1, pct: "▲ 2.4%", up: true, initial: "N" },
	PLTR: { name: "Palantir Technologies", nameConfirm: "Palantir Technologies", price: 28.4, pct: "▲ 1.1%", up: true, initial: "P" },
	COST: { name: "Costco Wholesale", nameConfirm: "Costco Wholesale", price: 918.2, pct: "▼ 0.4%", up: false, initial: "C" },
	HOOD: { name: "Robinhood Markets", nameConfirm: "Robinhood Markets", price: 41.9, pct: "▲ 2.2%", up: true, initial: "H" },
};

export const cashAvailable = 8800;

export const simulateHome = {
	title: "Simulate",
	badge: "Paper trading",
	hero: {
		eyebrow: "PORTFOLIO VALUE",
		value: "$10,240.00",
		week: "▲ +$186 (+1.9%) this week",
		allTime: "+$240.00 all time · #47 on the leaderboard",
		ranges: ["1D", "1W", "1M", "1Y"],
		activeRange: "1M",
	},
	cash: { eyebrow: "CASH AVAILABLE", value: "$8,800.00", note: "Buys come out of cash. Sells return to it." },
	how: {
		title: "How paper trading works",
		lines: [
			"Buy a stock with paper dollars. It starts that day.",
			"Prices are real. Nothing is smoothed for comfort.",
			"Sell anytime. The cash returns to your balance.",
		],
	},
	saved: {
		title: "Saved staks",
		link: "All saved staks ›",
		rows: [
			{ symbol: "PLTR", price: "$28.40", change: "▲ 1.1% today", up: true },
			{ symbol: "COST", price: "$918.20", change: "▼ 0.4% today", up: false },
			{ symbol: "HOOD", price: "$41.90", change: "▲ 2.2% today", up: true },
		],
		buy: "Buy",
	},
	leaderboard: {
		title: "Leaderboard",
		rows: [
			["#1  Amara", "+9.4%"],
			["#2  Tunde", "+7.8%"],
			["#3  Zoe", "+6.5%"],
		],
		you: ["#47  You", "+1.9%"],
		link: "Leaderboard ›",
	},
	picks: {
		title: "Your picks",
		link: "Open portfolio ›",
		rows: [
			{ symbol: "NVDA", gain: "+$24.00", pct: "+24.0%", up: true },
			{ symbol: "TSLA", gain: "+$18.00", pct: "+18.0%", up: true },
			{ symbol: "MSFT", gain: "-$3.00", pct: "-3.0%", up: false },
		],
	},
} as const;

export const portfolio = {
	/** "Simulate  /  Portfolio" (2:751): every segment above the page links to it (ui.tsx BackHeader) */
	crumbs: [{ label: "Simulate", to: "/simulate" }, { label: "Portfolio" }],
	title: "Your portfolio",
	subtitle: "12 picks · +$240.00 all time",
	chips: ["Top gainers", "Newest", "Worst"],
	picks: [
		{ symbol: "NVDA", initial: "N", meta: "Picked May 8 · $100 stake", gain: "+$24.00", pct: "+24.0%", up: true },
		{ symbol: "TSLA", initial: "T", meta: "Picked May 20 · $100 stake", gain: "+$18.00", pct: "+18.0%", up: true },
		{ symbol: "AMD", initial: "A", meta: "Picked Jun 2 · $100 stake", gain: "+$11.00", pct: "+11.0%", up: true },
		{ symbol: "AAPL", initial: "A", meta: "Picked Jun 24 · $100 stake", gain: "+$6.00", pct: "+6.0%", up: true },
		{ symbol: "JPM", initial: "J", meta: "Picked Jul 1 · $100 stake", gain: "+$2.00", pct: "+2.0%", up: true },
		{ symbol: "MSFT", initial: "M", meta: "Picked Jul 8 · $100 stake", gain: "-$3.00", pct: "-3.0%", up: false },
	],
	sell: "Sell",
	sold: {
		eyebrow: "SOLD · REALIZED",
		rows: [
			{ symbol: "SHOP", meta: "Sold May 30 · profit banked", amount: "+$12.00", up: true },
			{ symbol: "COIN", meta: "Sold Jun 15 · loss realized", amount: "-$8.00", up: false },
		],
	},
	footnote: "Sell a pick and the cash returns to your balance, gain or loss.",
} as const;

export const pickDetail = {
	symbol: "NVDA",
	/** "Simulate  /  Portfolio  /  NVDA" (2:859), the pick's own symbol last */
	crumbs: (symbol: string) => [{ label: "Simulate", to: "/simulate" }, { label: "Portfolio", to: "/simulate/portfolio" }, { label: symbol }] as const,
	eyebrow: "PICKED MAY 8 · $100 STAKE",
	subtitle: "NVDA · NVIDIA Corp",
	price: "$122.10",
	change: "▲ 2.4% today",
	hero: {
		picked: "Picked May 8 at $98.50",
		gainWhole: "+$24",
		gainCents: ".00",
		caption: "That is up 24.0% on a $100 paper stake",
		ranges: ["1D", "1W", "1M", "3M", "YTD", "1Y"],
		activeRange: "3M",
	},
	insight: {
		label: "INSIGHT",
		text: "Your stake tracks the move live. If NVDA gives back gains, the dollars follow it down.",
	},
	stats: [
		[
			{ label: "This week", value: "+$3.80", up: true },
			{ label: "vs the market", value: "+20.8% ahead", up: true },
		],
		[
			{ label: "Price then", value: "$98.50", up: false },
			{ label: "Price now", value: "$122.10", up: false },
		],
	],
	position: {
		eyebrow: "YOUR POSITION",
		line: "1.0152 shares · worth $124.00",
		sell: "Sell",
		back: "Back",
		note: "Selling returns $124.00 to your cash: the $100 stake plus the $24 gain, locked in for good.",
		shares: 1.0152,
		value: 124,
		stake: 100,
	},
} as const;

export const leaderboard = {
	/** "Simulate  /  Leaderboard" (2:927) */
	crumbs: [{ label: "Simulate", to: "/simulate" }, { label: "Leaderboard" }],
	title: "Leaderboard",
	subtitle: "Ranked by return · Trailing 7 days",
	chips: ["This week", "All time"],
	rows: [
		["#1", "Amara O.", "+9.4%"],
		["#2", "Tunde A.", "+7.8%"],
		["#3", "Zoe K.", "+6.5%"],
		["#4", "Malik R.", "+5.2%"],
		["#5", "Ivy C.", "+4.1%"],
	],
	you: ["#47", "You", "+1.9%"],
} as const;

/** Sheet copy (09 · Simulate flows, plus the Buy / Sell sheets of the alternate frames 2:970 and 2:1116). */
export const sheets = {
	back: "Back",
	addConfirm: {
		title: (symbol: string) => `Add ${symbol} to your portfolio?`,
		titleAlt: (symbol: string) => `Buy ${symbol}?`,
		description: "Your paper stake starts at today’s price and tracks the real move live, in either direction.",
		cashLabel: "Cash available",
		amounts: [10, 25, 50, 100] as readonly number[],
		custom: "Custom",
		youGet: "You get",
		sharesOf: (symbol: string) => `shares of ${symbol}`,
		confirm: "Confirm practice buy",
	},
	addSuccess: {
		title: "Order filled",
		description: "Filled instantly · paper order",
		cashLabel: "Cash available",
		youHold: "You now hold",
		primary: "View in My STAK",
		secondary: "Keep exploring",
	},
	sellConfirm: {
		title: (symbol: string) => `Sell ${symbol}?`,
		description: "You hold 1.0152 shares, worth $124.00 today. Selling returns paper cash at today’s price.",
		positionLabel: "Position",
		positionValue: "1.0152 shares · $124.00",
		portions: [0.25, 0.5, 0.75, 1] as readonly number[],
		portionLabels: ["25%", "50%", "75%", "All"],
		custom: "Custom",
		youGetBack: "You get back",
		forShares: (shares: string) => `for ${shares} shares`,
		confirm: "Confirm practice sell",
	},
	sellSuccess: {
		title: "Position closed",
		/** a sale that leaves shares held did not close the position: the receipt takes the buy receipt's title (2:1706) */
		titlePartial: "Order filled",
		description: (shares: string) => `Sold ${shares} shares from your $100 stake.`,
		proceeds: "Proceeds",
		returned: "Returned",
		toCash: (gain: string) => `to your cash (${gain})`,
		primary: "Back to Simulate",
		secondary: "View portfolio",
	},
	portfolioSell: {
		title: (symbol: string) => `Sell ${symbol}?`,
		description: "You hold 1.0152 shares from your $100 stake.",
		positionLabel: "Position value",
		positionValue: "$124.00",
		portions: [1, 0.5] as readonly number[],
		portionLabels: ["All", "Half"],
		custom: "Custom",
		returning: "Returning",
		toCash: "to your cash",
		sell: "Sell",
	},
} as const;

export function money(n: number): string {
	return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function signedMoney(n: number): string {
	return `${n < 0 ? "-" : "+"}${money(Math.abs(n))}`;
}

export function shares4(n: number): string {
	return n.toFixed(4);
}

/** 10 · States — 2:2255 "Desktop · Simulate · Empty" and 2:1972 "Practice buy · Failed" sheet (copy verbatim). */
export const simulateEmpty = {
	hero: { eyebrow: "PORTFOLIO VALUE", value: "$10,000", moves: "No moves yet", rank: "Unranked" },
	title: "No practice trades yet",
	body: "Pick a saved company and buy with paper money at real prices. Nothing here is real until you decide it is.",
	cta: "See today’s pick",
} as const;

export const buyFailed = {
	title: "Couldn’t place that trade",
	status: "Order not placed",
	description: "Prices are refreshing. Your paper cash wasn’t touched.",
	retry: "Try again",
	dismiss: "Not now",
} as const;
