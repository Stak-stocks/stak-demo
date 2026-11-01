export interface IntelCard {
	id: string;
	title: string;
	emoji: string;
	explanation: string;
	takeaway: string;
}

/** Fallback cards used when the backend Gemini endpoint is unavailable. */
export const INTEL_CARDS: IntelCard[] = [
	{
		id: "pe-ratio",
		title: "What is a P/E Ratio?",
		emoji: "🔢",
		explanation:
			"The Price-to-Earnings ratio tells you how much investors pay for every $1 of profit a company makes. A P/E of 30 means investors pay $30 for each $1 of earnings — basically, how expensive the stock is relative to what the company actually earns.",
		takeaway:
			"High P/E = investors expect big future growth. Low P/E = either a bargain or a company in trouble. Always ask why before buying.",
	},
	{
		id: "share-dilution",
		title: "What is Share Dilution?",
		emoji: "🍕",
		explanation:
			"Think of a company as a pizza. When they issue more shares to raise money, they're cutting the pizza into thinner slices. You still own a slice, but your slice just got smaller and your percent of ownership went down.",
		takeaway:
			"Companies dilute shares to raise cash for growth, but existing investors hate it because their shares are worth less of the total pie.",
	},
	{
		id: "market-cap",
		title: "What is Market Cap?",
		emoji: "🏢",
		explanation:
			"Market cap = share price × total shares outstanding. It's what the market thinks the entire company is worth right now. Apple at $3 trillion means investors collectively value the whole company at $3 trillion.",
		takeaway:
			"Market cap tells you size, not how profitable or cheap a stock is. A $10 stock can be worth more than a $1,000 stock if it has way more shares.",
	},
	{
		id: "dividend",
		title: "What is a Dividend?",
		emoji: "💸",
		explanation:
			"Some companies share profits directly with shareholders as cash payments. If you own 100 shares and the dividend is $2 per share, you get $200 — just for holding the stock, like earning rent from a property.",
		takeaway:
			"Dividends are passive income. Mature companies like Coca-Cola pay them. High-growth companies like Tesla usually don't — they reinvest profits instead.",
	},
	{
		id: "bull-bear",
		title: "Bull vs. Bear Market",
		emoji: "🐂",
		explanation:
			"A bull market is when prices rise and investors are optimistic — like a bull charging upward. A bear market is a 20%+ drop from recent highs, with fear and pessimism taking over. Both are completely normal parts of the market cycle.",
		takeaway:
			"Bear markets are scary but temporary — every single one in history has recovered. The biggest mistake is panic-selling at the bottom.",
	},
	{
		id: "eps",
		title: "What is EPS?",
		emoji: "📈",
		explanation:
			"Earnings Per Share (EPS) = net profit ÷ total shares. If a company earns $1B with 500M shares, EPS is $2. It shows how much profit belongs to each share you own — the bigger the better.",
		takeaway:
			"Stocks usually jump when EPS beats expectations and drop when it misses. Watch the quarterly earnings dates — they move prices fast.",
	},
	{
		id: "short-selling",
		title: "What is Short Selling?",
		emoji: "📉",
		explanation:
			"Short sellers borrow shares, sell them now, then try to buy them back cheaper later. If a stock falls from $100 to $60, they pocket $40. But if it rises to $150, they lose $50 — losses can be unlimited.",
		takeaway:
			"Shorting is how investors bet against companies. Heavy short interest means pros think a stock is overvalued — but it can also trigger a short squeeze.",
	},
	{
		id: "dca",
		title: "What is Dollar-Cost Averaging?",
		emoji: "🗓️",
		explanation:
			"Instead of investing $1,200 all at once, you invest $100 every month. When prices are low you automatically buy more shares; when high, fewer. Over time your average cost per share smooths out.",
		takeaway:
			"DCA removes the pressure of timing the market. You don't need to pick the perfect moment — just stay consistent and let compounding do the work.",
	},
	{
		id: "beta",
		title: "What is Beta?",
		emoji: "⚡",
		explanation:
			"Beta measures how volatile a stock is compared to the overall market. Beta of 1 = moves with the market. Beta of 2 = twice as wild. Beta of 0.5 = half as volatile. Think of it as a turbulence rating.",
		takeaway:
			"High beta = high risk, high reward. Low beta = steadier ride. If big swings make you nervous, stick to stocks with beta under 1.",
	},
	{
		id: "ipo",
		title: "What is an IPO?",
		emoji: "🚀",
		explanation:
			"An Initial Public Offering is when a private company first sells shares to the public. It's how companies raise money from everyday investors — and how early employees and VCs cash out their stakes.",
		takeaway:
			"IPO hype is real but risky. Many IPOs pop on day one then crash hard. Wait for the lockup period (90-180 days) to expire before jumping in.",
	},
	{
		id: "stock-split",
		title: "What is a Stock Split?",
		emoji: "✂️",
		explanation:
			"If a stock is $1,000 per share, a 10-for-1 split gives you 10 shares at $100 each. Total value stays the same — it's like breaking a $100 bill into ten $10 bills. More affordable price, same company.",
		takeaway:
			"Splits don't change a company's value, but lower prices attract more buyers. Stocks often trend upward after splits due to increased accessibility.",
	},
	{
		id: "revenue-profit",
		title: "Revenue vs. Profit",
		emoji: "🧾",
		explanation:
			"Revenue is all money coming in — total sales. Profit is what's left after all expenses. A company can have $10B in revenue but still lose money if costs are $11B. Revenue is vanity; profit is sanity.",
		takeaway:
			"Don't confuse a big company with a profitable one. Always check the profit margin. Negative margins mean the company is burning through cash.",
	},
	{
		id: "etf",
		title: "What is an ETF?",
		emoji: "🧺",
		explanation:
			"An ETF (Exchange-Traded Fund) bundles many stocks into one. Buying SPY gives you a tiny slice of the 500 biggest US companies at once — one purchase, instant diversification, like buying a sampler platter instead of one dish.",
		takeaway:
			"ETFs are the go-to for beginners because they spread risk automatically. Instead of picking winners, you own a slice of the whole game.",
	},
	{
		id: "52-week",
		title: "What is the 52-Week High/Low?",
		emoji: "📅",
		explanation:
			"The 52-week high is the highest price a stock hit in the past year; the low is the cheapest. These levels act as psychological anchors — traders watch them closely because other traders watch them closely.",
		takeaway:
			"Context matters more than the number. A stock near its low could be a bargain or a falling knife. Ask why it's cheap before buying.",
	},
	{
		id: "correction",
		title: "What is a Market Correction?",
		emoji: "🎢",
		explanation:
			"A correction is a 10-20% drop from a recent market peak. It happens on average once a year and is completely normal — think of it as the market catching its breath after running too fast.",
		takeaway:
			"Corrections feel terrifying but have always been followed by recovery. Investors who keep buying through corrections tend to come out well ahead.",
	},
	{
		id: "compound-interest",
		title: "What is Compound Interest?",
		emoji: "❄️",
		explanation:
			"Compounding means your returns earn returns. $1,000 at 10% becomes $1,100. Next year that $1,100 earns 10% — $1,210. You didn't add money, but you earned $110 instead of $100. It snowballs over time.",
		takeaway:
			"Time is your biggest asset. Starting at 22 vs 32 can mean hundreds of thousands more at retirement — even if you invest the exact same amount.",
	},
	{
		id: "options",
		title: "What are Options?",
		emoji: "🎯",
		explanation:
			"A call option gives you the right to buy a stock at a set price before a deadline. A put option gives you the right to sell. Think of a call like a reservation — you lock in today's price even if it rises later.",
		takeaway:
			"Options can multiply gains but also expire worthless. They're powerful tools but not for beginners — understand the basics of stocks first.",
	},
	{
		id: "free-cash-flow",
		title: "What is Free Cash Flow?",
		emoji: "🌊",
		explanation:
			"Free cash flow is the actual cash a company generates after paying for operations and capital expenses. Unlike earnings, it's hard to fake. Think of it as the money left in your wallet after all bills are paid.",
		takeaway:
			"Strong free cash flow = a company can buy back shares, pay dividends, or invest in growth without needing to borrow. It's one of the most honest financial metrics.",
	},
	{
		id: "debt-equity",
		title: "What is the Debt-to-Equity Ratio?",
		emoji: "⚖️",
		explanation:
			"D/E ratio = total debt ÷ shareholders' equity. It shows how much a company finances itself with debt vs its own money. A ratio of 2 means for every $1 of equity, there's $2 of debt.",
		takeaway:
			"Some debt is fine for growth, but too much is dangerous — especially when interest rates rise. Compare D/E within the same industry, not across sectors.",
	},
	{
		id: "inflation-stocks",
		title: "How Does Inflation Affect Stocks?",
		emoji: "🔥",
		explanation:
			"Inflation erodes purchasing power — $100 buys less next year than today. For stocks, moderate inflation is fine, but high inflation forces the Fed to raise interest rates, which makes borrowing expensive and future profits worth less.",
		takeaway:
			"During high inflation, companies that can raise prices easily (strong brands, commodities) hold up best. Growth stocks with profits far in the future get hit hardest.",
	},
	{
		id: "interest-rates",
		title: "How Do Interest Rates Affect Stocks?",
		emoji: "🏦",
		explanation:
			"When interest rates rise, bonds become more attractive (free money with less risk), so investors move out of stocks. Higher rates also increase borrowing costs for companies, squeezing profits. Lower rates do the opposite.",
		takeaway:
			"Watch the Fed. Rate hike announcements often drop the market short-term. But historically, stocks still outperform bonds over the long run.",
	},
	{
		id: "index-funds",
		title: "What is an Index Fund?",
		emoji: "🗂️",
		explanation:
			"An index fund tracks a market index like the S&P 500, automatically holding all 500 companies in proportion to their size. No stock-picking, no manager guessing — just the whole market at ultra-low cost.",
		takeaway:
			"Most professional fund managers fail to beat index funds over 10+ years. For long-term investors, a simple index fund strategy beats the majority of active strategies.",
	},
	{
		id: "diversification",
		title: "What is Diversification?",
		emoji: "🥗",
		explanation:
			"Diversification means spreading your money across different stocks, sectors, and asset types so one bad bet doesn't wipe you out. It's the investment version of not putting all your eggs in one basket.",
		takeaway:
			"Diversification doesn't maximize returns — it manages risk. Owning 20 uncorrelated stocks dramatically reduces the damage of any single company crashing.",
	},
	{
		id: "margin-trading",
		title: "What is Margin Trading?",
		emoji: "⚠️",
		explanation:
			"Margin means borrowing money from your broker to buy more stock than you could with your own cash. If you have $5,000 and use 2x margin, you can buy $10,000 of stock. Gains are doubled — but so are losses.",
		takeaway:
			"Margin can wipe you out faster than you think. If your position drops enough, you get a margin call — forced to sell at the worst possible time. Beginners should avoid it.",
	},
	{
		id: "share-buyback",
		title: "What is a Share Buyback?",
		emoji: "♻️",
		explanation:
			"When a company buys back its own shares, it reduces the total number in circulation. With fewer shares, each remaining share represents a bigger slice of the company — like pizza getting redistributed to fewer people.",
		takeaway:
			"Buybacks signal management thinks the stock is undervalued and reward remaining shareholders. Apple has returned hundreds of billions this way.",
	},
	{
		id: "growth-value",
		title: "Growth vs. Value Investing",
		emoji: "🌱",
		explanation:
			"Growth investing means buying companies expected to grow fast (like AI or biotech) — high P/E, betting on the future. Value investing means buying companies that appear cheap relative to their fundamentals — more like thrift shopping.",
		takeaway:
			"Neither style wins every year. Growth thrives in low interest rate environments; value tends to outperform during high rates. The best portfolios often blend both.",
	},
	{
		id: "yield-curve",
		title: "What is the Yield Curve?",
		emoji: "📊",
		explanation:
			"The yield curve shows interest rates on government bonds of different maturities. Normally, longer bonds pay more (more uncertainty = more compensation). When short-term rates exceed long-term rates, the curve 'inverts' — historically a recession warning sign.",
		takeaway:
			"An inverted yield curve has preceded every US recession in the past 50 years. It doesn't mean crash immediately, but it means be cautious in the 12-18 months ahead.",
	},
	{
		id: "liquidity",
		title: "What is Liquidity?",
		emoji: "💧",
		explanation:
			"Liquidity is how quickly and easily you can buy or sell something without moving the price. Apple stock is highly liquid — you can sell millions of dollars instantly. A rare piece of art is illiquid — finding a buyer could take months.",
		takeaway:
			"Illiquid investments can trap your money when you need it most. Always factor in how easily you can exit before investing in real estate, private companies, or small-cap stocks.",
	},
	{
		id: "day-trading",
		title: "Day Trading vs. Long-Term Investing",
		emoji: "⏱️",
		explanation:
			"Day traders buy and sell stocks within hours, trying to profit from tiny price moves. Long-term investors buy and hold for years, letting business fundamentals do the work. Day trading requires extreme skill, speed, and emotional discipline.",
		takeaway:
			"Studies show 70-80% of day traders lose money. The majority of long-term investors in diversified portfolios make money over 10+ year periods. Time in the market beats timing the market.",
	},
	{
		id: "blue-chip",
		title: "What are Blue-Chip Stocks?",
		emoji: "💎",
		explanation:
			"Blue-chip stocks are shares in large, stable, well-established companies with long track records — think Apple, Microsoft, Johnson & Johnson. The name comes from poker, where blue chips have the highest value.",
		takeaway:
			"Blue chips are the backbone of most long-term portfolios. They're not flashy but they're reliable — they've survived recessions, crashes, and decades of market cycles.",
	},
];
