// ── STAK Playground static content ──────────────────────────────────────────
// Lessons, daily challenges, stock battles, earnings lab, risk lab, market mood

// ── Types ────────────────────────────────────────────────────────────────────

export type LessonCategory =
	| "Stock Basics"
	| "Market Basics"
	| "Valuation"
	| "Earnings"
	| "Risk"
	| "Dividends"
	| "Sectors";

export interface LessonCard {
	heading: string;
	body: string;
}

export interface QuizOption {
	id: string;
	text: string;
}

export interface LessonQuiz {
	question: string;
	options: QuizOption[];
	correctId: string;
	explanation: string;
}

export interface Lesson {
	id: string;
	title: string;
	subtitle: string;
	category: LessonCategory;
	durationMin: number;
	xp: number;
	emoji: string;
	cards: LessonCard[];
	quiz: LessonQuiz;
}

export type ChallengeType = "comparison" | "scenario" | "lesson";

export interface DailyChallenge {
	id: string;
	type: ChallengeType;
	prompt: string;
	options: QuizOption[];
	correctId: string;
	explanation: string;
	xp: number;
}

export interface BattleMatchup {
	id: string;
	tickerA: string;
	nameA: string;
	tickerB: string;
	nameB: string;
	category: string;
	metric?: "revenueGrowth" | "profitMargin" | "peRatio" | "marketCap";
	metricLabel: string;
	higherWins: boolean;
	explanation: string;
	xp: number;
}

export interface EarningsScenario {
	id: string;
	company: string;
	ticker: string;
	context: string;
	revenueExpected: string;
	epsExpected: string;
	stockContext: string;
	question: string;
	options: QuizOption[];
	correctId: string;
	outcome: string;
	explanation: string;
	xp: number;
}

export interface RiskScenario {
	id: string;
	prompt: string;
	optionA: string;
	optionB: string;
	riskierOption: "A" | "B";
	explanation: string;
	xp: number;
}

export interface MoodScenario {
	id: string;
	event: string;
	question: string;
	options: QuizOption[];
	correctId: string;
	explanation: string;
	xp: number;
}

// ── Lessons ───────────────────────────────────────────────────────────────────

export const LESSONS: Lesson[] = [
	// ── Stock Basics ──
	{
		id: "what-is-a-stock",
		title: "What Is a Stock?",
		subtitle: "Own a piece of a real company",
		category: "Stock Basics",
		durationMin: 2,
		xp: 20,
		emoji: "📈",
		cards: [
			{
				heading: "A stock is ownership",
				body: "When a company sells shares, it's selling tiny pieces of itself. Buy one share of Apple and you literally own a small slice of one of the biggest companies on Earth.",
			},
			{
				heading: "Why companies sell shares",
				body: "Companies sell stock to raise money — to hire people, build products, or expand. In return, shareholders get to own part of the upside if the company grows.",
			},
			{
				heading: "How you make money",
				body: "Two ways: the stock price goes up (capital gain) or the company pays you a dividend (a cash payout). Many growth stocks only offer the first.",
			},
			{
				heading: "Risk is real",
				body: "If the company does badly, your shares lose value. Unlike a savings account, there's no guarantee. That's why you research before you invest.",
			},
		],
		quiz: {
			question: "Why do companies sell stock to the public?",
			options: [
				{ id: "a", text: "To raise money for growth" },
				{ id: "b", text: "To pay off government taxes" },
				{ id: "c", text: "To give employees free gifts" },
			],
			correctId: "a",
			explanation: "Companies sell shares to raise capital — money they can use to hire, build, and expand without taking on debt.",
		},
	},
	{
		id: "what-is-market-cap",
		title: "What Is Market Cap?",
		subtitle: "The total value of a company",
		category: "Stock Basics",
		durationMin: 2,
		xp: 20,
		emoji: "🏢",
		cards: [
			{
				heading: "Market cap = price × shares",
				body: "Market capitalisation is just the stock price multiplied by how many shares exist. If a stock is $100 and there are 1 billion shares, market cap is $100 billion.",
			},
			{
				heading: "Size categories",
				body: "Large-cap (over $10B) are established companies like Apple or Microsoft. Mid-cap ($2B–$10B) are growing businesses. Small-cap (under $2B) are smaller, riskier, but sometimes faster-growing.",
			},
			{
				heading: "It changes every second",
				body: "Because the stock price moves constantly, market cap changes all day. Apple has been above $3 trillion — that's more than the entire GDP of many countries.",
			},
			{
				heading: "Why it matters",
				body: "Market cap tells you the size of a company, not just its price. A $5 stock isn't necessarily 'cheap' if the company has billions of shares outstanding.",
			},
		],
		quiz: {
			question: "A company has 500 million shares and a stock price of $20. What is its market cap?",
			options: [
				{ id: "a", text: "$1 billion" },
				{ id: "b", text: "$10 billion" },
				{ id: "c", text: "$20 million" },
			],
			correctId: "a",
			explanation: "500 million × $20 = $10 billion. Wait — actually $10B. 500M × $20 = $10,000M = $10B. The answer is $10 billion.",
		},
	},
	{
		id: "what-is-a-ticker",
		title: "What Is a Ticker Symbol?",
		subtitle: "The shorthand for every stock",
		category: "Stock Basics",
		durationMin: 2,
		xp: 15,
		emoji: "🔤",
		cards: [
			{
				heading: "Every public company has a code",
				body: "A ticker symbol is the short abbreviation used to identify a stock. Apple is AAPL, Tesla is TSLA, Netflix is NFLX. These codes are used on exchanges to trade shares.",
			},
			{
				heading: "Where they trade",
				body: "US stocks trade on exchanges like NYSE (New York Stock Exchange) or NASDAQ. Each exchange has different rules, but both let you buy and sell shares.",
			},
			{
				heading: "More than US stocks",
				body: "Companies around the world are publicly traded too — Toyota (TM), Samsung (SSNLF), Alibaba (BABA). Some trade as ADRs on US exchanges so Americans can easily invest.",
			},
		],
		quiz: {
			question: "What is a ticker symbol?",
			options: [
				{ id: "a", text: "A short code that identifies a public company's stock" },
				{ id: "b", text: "The price of a stock at market close" },
				{ id: "c", text: "A government ID for private companies" },
			],
			correctId: "a",
			explanation: "Ticker symbols are standardised short codes used to identify stocks on exchanges — like AAPL for Apple or TSLA for Tesla.",
		},
	},

	// ── Market Basics ──
	{
		id: "why-rates-matter",
		title: "Why Interest Rates Matter",
		subtitle: "The Fed and your portfolio",
		category: "Market Basics",
		durationMin: 3,
		xp: 25,
		emoji: "🏦",
		cards: [
			{
				heading: "The Fed controls borrowing costs",
				body: "The Federal Reserve sets the base interest rate in the US. When they raise it, borrowing becomes more expensive everywhere — mortgages, car loans, business loans.",
			},
			{
				heading: "Growth stocks feel it most",
				body: "High-growth companies often borrow money and promise profits in the future. When rates rise, future profits are worth less today — so investors pay less for them now. Growth stocks tend to fall.",
			},
			{
				heading: "Defensive stocks are more resilient",
				body: "Utilities, consumer staples, and dividend-paying companies tend to hold up better. Their earnings are stable and predictable, so rising rates hurt them less.",
			},
			{
				heading: "Rate cuts are rocket fuel",
				body: "When rates drop, borrowing is cheap, companies invest more, consumers spend more, and growth stocks often rally hard. 2020–2021 was a textbook example.",
			},
		],
		quiz: {
			question: "When interest rates rise, which type of stock tends to feel the most pressure?",
			options: [
				{ id: "a", text: "High-growth tech stocks" },
				{ id: "b", text: "Utility companies" },
				{ id: "c", text: "Consumer staples like food companies" },
			],
			correctId: "a",
			explanation: "High-growth stocks derive most of their value from future profits. When rates rise, those future profits are discounted more heavily — making the stock worth less today.",
		},
	},
	{
		id: "what-is-a-bull-bear-market",
		title: "Bull vs Bear Markets",
		subtitle: "What they mean and why it matters",
		category: "Market Basics",
		durationMin: 2,
		xp: 20,
		emoji: "🐂",
		cards: [
			{
				heading: "Bull market = prices going up",
				body: "A bull market is when stocks are broadly rising — usually defined as a 20% gain from a recent low. Bull markets can last years and are driven by economic growth, low rates, and investor optimism.",
			},
			{
				heading: "Bear market = prices going down",
				body: "A bear market is a 20% drop from recent highs, usually over weeks or months. They're triggered by recessions, rising rates, geopolitical events, or a loss of investor confidence.",
			},
			{
				heading: "Corrections are normal",
				body: "A correction is a 10–20% drop. They happen regularly — roughly once a year on average — and don't always lead to a full bear market. Most long-term investors ignore them.",
			},
			{
				heading: "Long-term outlook matters most",
				body: "The S&P 500 has recovered from every bear market in history and gone on to new highs. For investors with a 5–10 year horizon, bear markets are opportunities more than threats.",
			},
		],
		quiz: {
			question: "What defines a bear market?",
			options: [
				{ id: "a", text: "A 20% drop from recent highs" },
				{ id: "b", text: "Any single day the market falls" },
				{ id: "c", text: "When trading is suspended by regulators" },
			],
			correctId: "a",
			explanation: "A bear market is officially defined as a decline of 20% or more from a recent peak, sustained over a period of time.",
		},
	},
	{
		id: "how-market-hours-work",
		title: "How Market Hours Work",
		subtitle: "When and how stocks trade",
		category: "Market Basics",
		durationMin: 2,
		xp: 15,
		emoji: "🕐",
		cards: [
			{
				heading: "Regular hours: 9:30am–4pm ET",
				body: "US stock markets open at 9:30am Eastern Time and close at 4pm. Most trading happens in this window. Volume is highest in the first and last 30 minutes.",
			},
			{
				heading: "Pre-market and after-hours",
				body: "You can trade outside regular hours, but spreads are wider and volume is thin. Big moves often happen after earnings are released at 4pm or before 9:30am.",
			},
			{
				heading: "Why earnings timing matters",
				body: "Companies often report earnings 'after the close' (AMC) or 'before the open' (BMO). Stocks can gap up or down dramatically at the next open based on the results.",
			},
		],
		quiz: {
			question: "What does 'AMC' mean in the context of earnings?",
			options: [
				{ id: "a", text: "After Market Close" },
				{ id: "b", text: "Annual Meeting of Creditors" },
				{ id: "c", text: "A theatre company" },
			],
			correctId: "a",
			explanation: "AMC stands for 'After Market Close' — meaning the company releases earnings after 4pm ET. The market's reaction plays out at the next trading open.",
		},
	},

	// ── Valuation ──
	{
		id: "what-is-pe-ratio",
		title: "What Is P/E Ratio?",
		subtitle: "Is a stock cheap or expensive?",
		category: "Valuation",
		durationMin: 3,
		xp: 25,
		emoji: "🔢",
		cards: [
			{
				heading: "P/E = price ÷ earnings per share",
				body: "The Price-to-Earnings ratio tells you how much investors pay for every $1 of profit. If a stock is $50 and earns $2 per share, the P/E is 25. Investors are paying $25 for each dollar of profit.",
			},
			{
				heading: "High P/E means high expectations",
				body: "A P/E of 50+ suggests investors expect massive growth ahead. They're willing to pay a premium for future profits. This is common with AI, biotech, and fast-growing tech companies.",
			},
			{
				heading: "Low P/E can mean value — or trouble",
				body: "A P/E of 10 might mean the stock is cheap relative to earnings, or that the business is struggling and growth is expected to be slow. Context matters.",
			},
			{
				heading: "Compare within the same sector",
				body: "A P/E of 30 is cheap for a software company but expensive for a bank. Always compare a stock's P/E to its industry peers, not to the whole market.",
			},
		],
		quiz: {
			question: "A stock with a very high P/E ratio most likely means investors expect...",
			options: [
				{ id: "a", text: "Strong future growth" },
				{ id: "b", text: "The company has no customers" },
				{ id: "c", text: "The stock market is closed" },
			],
			correctId: "a",
			explanation: "A high P/E means investors are paying a premium, typically because they expect earnings to grow significantly in the future.",
		},
	},
	{
		id: "what-is-revenue-growth",
		title: "What Is Revenue Growth?",
		subtitle: "Is the business actually growing?",
		category: "Valuation",
		durationMin: 2,
		xp: 20,
		emoji: "📊",
		cards: [
			{
				heading: "Revenue = total sales",
				body: "Revenue is the total money a company brings in before any costs. If Netflix had $9B in revenue last quarter, that's everything subscribers paid — before expenses, taxes, or profits.",
			},
			{
				heading: "Revenue growth = how fast sales are rising",
				body: "Year-over-year (YoY) revenue growth compares this quarter to the same quarter last year. 20% YoY growth means sales are 20% higher than they were 12 months ago.",
			},
			{
				heading: "Growth vs profitability",
				body: "High revenue growth doesn't always mean profits. Many fast-growing companies spend more than they earn to capture market share. Amazon did this for years before becoming extremely profitable.",
			},
			{
				heading: "Decelerating growth can hurt",
				body: "If a company grew 40% last year but only 15% this year, that slowdown can tank the stock — even if revenue is still growing. Markets price in expectations.",
			},
		],
		quiz: {
			question: "A company had $100M revenue last year and $130M this year. What is its revenue growth rate?",
			options: [
				{ id: "a", text: "30%" },
				{ id: "b", text: "13%" },
				{ id: "c", text: "130%" },
			],
			correctId: "a",
			explanation: "($130M - $100M) / $100M = 30% growth. Revenue grew by $30M on a $100M base — that's 30% year-over-year.",
		},
	},
	{
		id: "what-makes-stock-expensive",
		title: "What Makes a Stock Expensive?",
		subtitle: "Price alone tells you nothing",
		category: "Valuation",
		durationMin: 3,
		xp: 25,
		emoji: "💰",
		cards: [
			{
				heading: "Price per share means nothing alone",
				body: "A $5 stock isn't cheap and a $3,000 stock isn't expensive. What matters is what you're getting for the price. Berkshire Hathaway was $500,000 per share — but still reasonably valued for what it owned.",
			},
			{
				heading: "Valuation is price vs value",
				body: "Expensive means you're paying a lot relative to the company's earnings, sales, or assets. Cheap means you're paying little. The P/E ratio, P/S (price-to-sales), and P/B (price-to-book) all measure this.",
			},
			{
				heading: "Growth stocks deserve higher valuations",
				body: "A company growing revenue at 50% per year should trade at a higher multiple than one growing at 5%. You're paying for future growth, not just current earnings.",
			},
			{
				heading: "'Expensive' can still go up",
				body: "A stock trading at 60x earnings can keep rising if the company keeps executing. Amazon looked 'expensive' at a P/E of 100 for years — and went up 10x anyway.",
			},
		],
		quiz: {
			question: "You're comparing two stocks: one at $10 with a P/E of 5, another at $500 with a P/E of 20. Which is cheaper?",
			options: [
				{ id: "a", text: "The $10 stock — it has a lower P/E" },
				{ id: "b", text: "The $500 stock — it's worth more" },
				{ id: "c", text: "They're the same price" },
			],
			correctId: "a",
			explanation: "The $10 stock with a P/E of 5 is cheaper on a valuation basis. You're paying $5 for every $1 of earnings vs $20 for the other stock. Share price alone tells you nothing.",
		},
	},

	// ── Earnings ──
	{
		id: "what-are-earnings",
		title: "What Are Earnings?",
		subtitle: "The quarterly report card",
		category: "Earnings",
		durationMin: 3,
		xp: 25,
		emoji: "📋",
		cards: [
			{
				heading: "Every public company reports 4x a year",
				body: "Public companies must release quarterly earnings reports — their financial scorecard. These show revenue, profits, and guidance for the next quarter.",
			},
			{
				heading: "EPS = earnings per share",
				body: "EPS tells you how much profit the company made per share. If a company earned $1B and has 500M shares, EPS = $2.00. Analysts estimate this number before the report drops.",
			},
			{
				heading: "Beat vs miss",
				body: "If actual EPS is higher than analysts expected — that's a beat. If lower — that's a miss. Beats tend to push stocks up; misses tend to push them down.",
			},
			{
				heading: "Guidance matters more than the result",
				body: "What a company says about next quarter often matters more than what just happened. Strong current earnings with weak future guidance can still send a stock down hard.",
			},
		],
		quiz: {
			question: "What does it mean when a company 'beats earnings'?",
			options: [
				{ id: "a", text: "Actual profit was higher than analysts expected" },
				{ id: "b", text: "The stock price went up on earnings day" },
				{ id: "c", text: "Revenue was higher than last year" },
			],
			correctId: "a",
			explanation: "Beating earnings means the company's actual EPS (earnings per share) came in above what Wall Street analysts had forecast.",
		},
	},
	{
		id: "why-stocks-fall-after-good-earnings",
		title: "Why Stocks Fall After Good Earnings",
		subtitle: "The paradox every investor needs to understand",
		category: "Earnings",
		durationMin: 3,
		xp: 30,
		emoji: "🤯",
		cards: [
			{
				heading: "Markets price in expectations",
				body: "By the time earnings are released, the market has already priced in what it expects. If a company 'beats' but everyone already expected a beat, there's no upside surprise.",
			},
			{
				heading: "Guidance is the key variable",
				body: "A company can beat last quarter but lower their guidance for next quarter. Investors care about the future, not the past. Lower guidance = sell-off, even with great results.",
			},
			{
				heading: "'Sell the news' is real",
				body: "Traders often buy ahead of expected good earnings and sell when the news actually hits — locking in their gain. This drives prices down right after the announcement.",
			},
			{
				heading: "Margins and growth rate matter",
				body: "If revenue beat but margins (profit as % of revenue) came in lower, the market might punish the stock. Quality of earnings matters, not just the headline number.",
			},
		],
		quiz: {
			question: "A company beats EPS by 20% but its stock falls 10%. What's the most likely reason?",
			options: [
				{ id: "a", text: "The company lowered future guidance" },
				{ id: "b", text: "The stock market was closed that day" },
				{ id: "c", text: "Earnings beats always cause stocks to fall" },
			],
			correctId: "a",
			explanation: "The most common reason a stock falls despite a strong beat is disappointing guidance — the company warned investors that future results will be weaker than expected.",
		},
	},
	{
		id: "how-to-read-earnings",
		title: "How to Read an Earnings Report",
		subtitle: "The 5 numbers that actually matter",
		category: "Earnings",
		durationMin: 4,
		xp: 30,
		emoji: "🔍",
		cards: [
			{
				heading: "1. Revenue",
				body: "Top line: total sales. Is it growing? By how much YoY? Did it beat expectations? Accelerating revenue growth is usually a very bullish signal.",
			},
			{
				heading: "2. EPS (earnings per share)",
				body: "Bottom line: profit per share. GAAP EPS is the official number; non-GAAP (adjusted) strips out one-time items. Analysts usually focus on non-GAAP. Beat = good, miss = bad.",
			},
			{
				heading: "3. Gross margin",
				body: "Revenue minus cost of goods sold, as a percentage. Higher and expanding margins = more efficient. Shrinking margins = cost pressure or pricing power issues.",
			},
			{
				heading: "4. Guidance",
				body: "Management's outlook for next quarter. This single number often moves the stock more than any actual result. Raised guidance = bullish. Lowered guidance = typically very bearish.",
			},
			{
				heading: "5. Operating metrics",
				body: "For tech companies: MAUs, subscribers, DAUs. For banks: net interest margin. These sector-specific metrics often tell you more than GAAP numbers alone.",
			},
		],
		quiz: {
			question: "Which of these typically has the most impact on a stock's reaction after earnings?",
			options: [
				{ id: "a", text: "Forward guidance for next quarter" },
				{ id: "b", text: "The stock's price on earnings day" },
				{ id: "c", text: "Whether the CEO sounds excited on the call" },
			],
			correctId: "a",
			explanation: "Forward guidance is what the market cares most about. A company can beat past results but still sell off hard if management guides lower for the quarter ahead.",
		},
	},

	// ── Risk ──
	{
		id: "what-is-risk",
		title: "What Is Investment Risk?",
		subtitle: "Not all risk is the same",
		category: "Risk",
		durationMin: 3,
		xp: 25,
		emoji: "⚠️",
		cards: [
			{
				heading: "Risk = uncertainty of returns",
				body: "In investing, risk is the chance that your investment loses value — temporarily or permanently. Every investment has some risk; even 'safe' assets like bonds can lose value.",
			},
			{
				heading: "Volatility vs permanent loss",
				body: "A stock dropping 20% temporarily is different from a company going bankrupt. Volatility is normal; permanent capital loss is what you really want to avoid.",
			},
			{
				heading: "Higher risk, higher potential reward",
				body: "A speculative biotech startup might 10x or go to zero. A consumer staples stock like Procter & Gamble probably won't do either. Risk and reward are always connected.",
			},
			{
				heading: "Diversification reduces risk",
				body: "Owning stocks across different sectors means one bad company doesn't wipe you out. If you own 20 stocks and one falls 50%, it only affects 5% of your portfolio.",
			},
		],
		quiz: {
			question: "What is the best description of investment risk?",
			options: [
				{ id: "a", text: "The uncertainty that your investment might lose value" },
				{ id: "b", text: "Guaranteed losses when markets fall" },
				{ id: "c", text: "The fee you pay to a broker to invest" },
			],
			correctId: "a",
			explanation: "Risk in investing means uncertainty — the possibility that the actual outcome differs from what you expected, potentially including a loss of value.",
		},
	},
	{
		id: "what-is-beta",
		title: "What Is Beta?",
		subtitle: "How much does a stock swing?",
		category: "Risk",
		durationMin: 2,
		xp: 20,
		emoji: "📉",
		cards: [
			{
				heading: "Beta measures volatility vs the market",
				body: "Beta compares a stock's price swings to the overall market (usually the S&P 500). The S&P 500 has a beta of 1.0 by definition.",
			},
			{
				heading: "Beta > 1 = more volatile",
				body: "A beta of 2.0 means the stock typically moves twice as much as the market. If S&P 500 rises 5%, this stock might rise 10%. But if S&P falls 5%, this stock might fall 10%.",
			},
			{
				heading: "Beta < 1 = more stable",
				body: "A beta of 0.5 means the stock moves half as much. Utility companies and consumer staples tend to have low betas — they're less exciting but steadier.",
			},
			{
				heading: "High beta = high risk + high potential",
				body: "Speculative stocks like small-cap space companies or unprofitable tech often have betas of 2–4. Great in bull markets. Painful in bear markets.",
			},
		],
		quiz: {
			question: "A stock has a beta of 3. If the market falls 10%, what would you typically expect?",
			options: [
				{ id: "a", text: "The stock falls roughly 30%" },
				{ id: "b", text: "The stock rises 10%" },
				{ id: "c", text: "Nothing — beta doesn't affect price" },
			],
			correctId: "a",
			explanation: "With a beta of 3, the stock moves approximately 3× the market. A 10% market decline would typically cause roughly a 30% drop in this stock.",
		},
	},

	// ── Dividends ──
	{
		id: "what-is-a-dividend",
		title: "What Is a Dividend?",
		subtitle: "Getting paid just for owning a stock",
		category: "Dividends",
		durationMin: 2,
		xp: 20,
		emoji: "💵",
		cards: [
			{
				heading: "A dividend is a cash payment to shareholders",
				body: "Some companies share a portion of their profits directly with investors every quarter. If Coca-Cola pays $0.46 per share quarterly, and you own 100 shares, you get $46 every 3 months.",
			},
			{
				heading: "Dividend yield = annual payout ÷ stock price",
				body: "If a stock pays $2 per year in dividends and costs $40, the dividend yield is 5%. That's like earning 5% interest just for holding the stock.",
			},
			{
				heading: "Not all companies pay dividends",
				body: "Growth companies like Amazon and Tesla typically reinvest all profits back into the business. Mature companies with steady cash flow — like banks, telecoms, and utilities — are the typical dividend payers.",
			},
			{
				heading: "Dividends can be cut",
				body: "If a company's profits fall, it might reduce or eliminate its dividend. A sudden dividend cut is usually a red flag — the stock often falls sharply when it happens.",
			},
		],
		quiz: {
			question: "A stock costs $100 and pays $4 in annual dividends. What is the dividend yield?",
			options: [
				{ id: "a", text: "4%" },
				{ id: "b", text: "40%" },
				{ id: "c", text: "0.04%" },
			],
			correctId: "a",
			explanation: "$4 ÷ $100 = 4%. That's the annual return you'd earn from dividends alone, before any change in the stock price.",
		},
	},
	{
		id: "why-dividend-stocks-drop-rates-rise",
		title: "Why Dividend Stocks Drop When Rates Rise",
		subtitle: "The yield competition effect",
		category: "Dividends",
		durationMin: 3,
		xp: 25,
		emoji: "🔗",
		cards: [
			{
				heading: "Investors compare yields",
				body: "When the Fed raises rates, US Treasury bonds start offering 5% risk-free. Why hold a utility stock for a 3% dividend when you can earn 5% with zero risk?",
			},
			{
				heading: "Capital flows out of dividends",
				body: "Investors sell dividend stocks and move to bonds. This selling pressure drives dividend stock prices down — even if the underlying business is perfectly fine.",
			},
			{
				heading: "The reverse is also true",
				body: "When rates fall, bonds offer less. A 4% dividend stock suddenly looks attractive vs a 1% Treasury. Money flows back in, pushing dividend stock prices up.",
			},
			{
				heading: "Quality matters during rate rises",
				body: "Dividend companies with growing dividends and strong cash flows hold up better than those with stretched, stagnant payouts. Dividend growth is more important than just high yield.",
			},
		],
		quiz: {
			question: "Why do dividend stocks often fall when interest rates rise?",
			options: [
				{ id: "a", text: "Treasury bonds offer higher risk-free yields, making dividends less attractive" },
				{ id: "b", text: "Companies are forced to cut dividends by law" },
				{ id: "c", text: "Rising rates always cause recessions" },
			],
			correctId: "a",
			explanation: "When risk-free government bonds offer competitive yields, investors have less reason to own dividend stocks. The selling pressure pushes dividend stock prices lower.",
		},
	},

	// ── Sectors ──
	{
		id: "what-is-a-sector",
		title: "What Is a Market Sector?",
		subtitle: "How the market is organised",
		category: "Sectors",
		durationMin: 2,
		xp: 20,
		emoji: "🗂️",
		cards: [
			{
				heading: "11 sectors, one market",
				body: "The US stock market is divided into 11 sectors: Technology, Healthcare, Financials, Consumer Discretionary, Consumer Staples, Energy, Utilities, Real Estate, Materials, Industrials, and Communication Services.",
			},
			{
				heading: "Why sectors matter",
				body: "Different sectors perform well at different times. Tech booms in low-rate environments. Energy does well when oil prices rise. Understanding sectors helps you see the full picture.",
			},
			{
				heading: "Sector concentration is a risk",
				body: "If your whole portfolio is in tech stocks, a tech selloff hits you hard. Spreading across sectors reduces correlation risk — they don't all move the same way at the same time.",
			},
			{
				heading: "Cyclical vs defensive sectors",
				body: "Cyclical sectors (tech, consumer discretionary) do well when the economy grows but fall hard in recessions. Defensive sectors (utilities, consumer staples, healthcare) hold up better in downturns.",
			},
		],
		quiz: {
			question: "Which type of sector generally holds up better during a recession?",
			options: [
				{ id: "a", text: "Defensive sectors like utilities and consumer staples" },
				{ id: "b", text: "High-growth tech and consumer discretionary" },
				{ id: "c", text: "Energy and materials" },
			],
			correctId: "a",
			explanation: "Defensive sectors sell essential goods and services people still need during hard times — food, electricity, healthcare. Their earnings are more stable regardless of economic conditions.",
		},
	},
	{
		id: "tech-sector-deep-dive",
		title: "The Tech Sector",
		subtitle: "The biggest and most discussed sector",
		category: "Sectors",
		durationMin: 3,
		xp: 25,
		emoji: "💻",
		cards: [
			{
				heading: "Tech is the largest US sector",
				body: "Technology makes up roughly 30% of the S&P 500. It includes software companies (Microsoft, Salesforce), semiconductors (NVIDIA, AMD), hardware (Apple), and internet platforms (Meta, Alphabet).",
			},
			{
				heading: "Why tech grows fast",
				body: "Software has near-zero marginal cost — once built, you can sell it to a million customers for almost the same cost as selling it to one. This creates explosive profit potential.",
			},
			{
				heading: "High valuations require execution",
				body: "Tech companies often trade at high P/E multiples because investors expect years of fast growth. Any slowdown or miss punishes the stock severely — the higher you fly, the harder you fall.",
			},
			{
				heading: "Rate sensitivity",
				body: "Tech is one of the most rate-sensitive sectors because so much of its value is tied to future earnings. When rates rise, tech often sells off faster than other sectors.",
			},
		],
		quiz: {
			question: "Why does the tech sector tend to fall harder than others when interest rates rise?",
			options: [
				{ id: "a", text: "Tech companies rely heavily on future earnings, which are worth less when rates rise" },
				{ id: "b", text: "Tech companies borrow more money than other sectors" },
				{ id: "c", text: "The Fed specifically targets tech companies" },
			],
			correctId: "a",
			explanation: "Tech valuations depend heavily on future profit projections. Rising rates increase the 'discount rate' applied to those future profits, making them worth less today — and reducing valuation multiples.",
		},
	},
];

// ── Daily Challenge Pool ───────────────────────────────────────────────────────

export const DAILY_CHALLENGES: DailyChallenge[] = [
	{
		id: "dc-pe-vs-growth",
		type: "comparison",
		prompt: "Which stock type typically has a higher P/E ratio?",
		options: [
			{ id: "a", text: "A fast-growing software company" },
			{ id: "b", text: "A mature bank with slow growth" },
		],
		correctId: "a",
		explanation: "Fast-growing companies trade at higher P/E multiples because investors are paying for future growth potential, not just today's earnings.",
		xp: 15,
	},
	{
		id: "dc-costco-walmart-margin",
		type: "comparison",
		prompt: "Which company typically has the higher profit margin?",
		options: [
			{ id: "a", text: "Costco" },
			{ id: "b", text: "A software-as-a-service company" },
		],
		correctId: "b",
		explanation: "SaaS companies can have margins of 60–80%+ because software costs almost nothing to distribute. Costco intentionally runs on razor-thin margins (~2-3%) to offer low prices.",
		xp: 15,
	},
	{
		id: "dc-earnings-guidance",
		type: "scenario",
		prompt: "A company beats EPS by 15% but lowers guidance for next quarter. What likely happens to the stock?",
		options: [
			{ id: "a", text: "It rallies — a 15% beat is huge" },
			{ id: "b", text: "It falls — guidance matters more than past results" },
		],
		correctId: "b",
		explanation: "Markets are forward-looking. Lowered guidance signals weaker future earnings, which investors care about more than a past beat.",
		xp: 20,
	},
	{
		id: "dc-rates-growth",
		type: "scenario",
		prompt: "The Fed raises interest rates by 0.5%. Which sector would you expect to feel the most pressure?",
		options: [
			{ id: "a", text: "High-growth tech stocks" },
			{ id: "b", text: "Utility companies" },
		],
		correctId: "a",
		explanation: "Growth stocks are most sensitive to rate hikes because their value depends on discounted future profits. Rising rates reduce the present value of those future earnings.",
		xp: 20,
	},
	{
		id: "dc-dividend-cut",
		type: "scenario",
		prompt: "A company announces it's cutting its dividend by 50%. What typically happens to the stock?",
		options: [
			{ id: "a", text: "The stock rises — the company is saving money" },
			{ id: "b", text: "The stock falls — it signals financial stress" },
		],
		correctId: "b",
		explanation: "A dividend cut is usually a red flag signaling that the company's cash flow is under pressure. Income investors often sell immediately, pushing the stock lower.",
		xp: 15,
	},
	{
		id: "dc-beta-market-down",
		type: "comparison",
		prompt: "The market falls 5%. Which stock would you expect to fall more?",
		options: [
			{ id: "a", text: "A utility stock with beta of 0.4" },
			{ id: "b", text: "A speculative tech stock with beta of 2.5" },
		],
		correctId: "b",
		explanation: "Beta of 2.5 means the stock moves roughly 2.5× the market. A 5% market drop would imply about a 12.5% drop for the high-beta stock.",
		xp: 15,
	},
	{
		id: "dc-revenue-growth-matters",
		type: "scenario",
		prompt: "A company is growing revenue at 40% per year but is losing money. Is this necessarily bad?",
		options: [
			{ id: "a", text: "Yes — a company must always be profitable" },
			{ id: "b", text: "Not necessarily — many great companies invest heavily early at the cost of profits" },
		],
		correctId: "b",
		explanation: "Amazon lost money for years while building its infrastructure. Investing in growth at the expense of near-term profit is a common and often successful strategy for hyper-growth companies.",
		xp: 20,
	},
	{
		id: "dc-bear-market-opportunity",
		type: "scenario",
		prompt: "The market enters a bear market (down 20%+). What should a long-term investor consider?",
		options: [
			{ id: "a", text: "Sell everything to stop the bleeding" },
			{ id: "b", text: "See it as an opportunity to buy quality companies at lower prices" },
		],
		correctId: "b",
		explanation: "The S&P 500 has recovered from every bear market in history and gone on to new highs. Long-term investors who bought during bear markets were often rewarded handsomely.",
		xp: 20,
	},
	{
		id: "dc-pe-comparison",
		type: "comparison",
		prompt: "Which company is 'cheaper' on a valuation basis?",
		options: [
			{ id: "a", text: "Stock at $500/share with P/E of 15" },
			{ id: "b", text: "Stock at $10/share with P/E of 80" },
		],
		correctId: "a",
		explanation: "Share price is irrelevant to valuation. The $500 stock with P/E 15 is much cheaper — you're paying $15 for every $1 of earnings vs $80 for the $10 stock.",
		xp: 15,
	},
	{
		id: "dc-market-cap",
		type: "comparison",
		prompt: "Which tells you more about a company's true size?",
		options: [
			{ id: "a", text: "Its stock price" },
			{ id: "b", text: "Its market capitalisation" },
		],
		correctId: "b",
		explanation: "Market cap (price × shares) tells you the total value the market assigns to the company. A $1 stock can represent a company worth billions if it has billions of shares.",
		xp: 10,
	},
	{
		id: "dc-earnings-beat-fall",
		type: "scenario",
		prompt: "Nike reports earnings: revenue up 8%, EPS beats by $0.10, but management warns next quarter will be 'challenging'. What likely happens?",
		options: [
			{ id: "a", text: "Stock rallies on the beat" },
			{ id: "b", text: "Stock falls on the weak guidance" },
		],
		correctId: "b",
		explanation: "Guidance is the most forward-looking signal. 'Challenging' next quarter tells investors earnings may disappoint — that uncertainty gets priced in immediately.",
		xp: 20,
	},
	{
		id: "dc-sector-recession",
		type: "comparison",
		prompt: "Which stock would you expect to perform better during a recession?",
		options: [
			{ id: "a", text: "Procter & Gamble (consumer staples)" },
			{ id: "b", text: "Roblox (gaming / consumer discretionary)" },
		],
		correctId: "a",
		explanation: "People still buy soap and detergent in a recession. Consumer staples are defensive — their demand is stable regardless of economic conditions. Discretionary spending (gaming, luxury) tends to fall.",
		xp: 15,
	},
	{
		id: "dc-guidance-vs-beat",
		type: "scenario",
		prompt: "A company beats EPS by 20% but cuts its revenue outlook for next quarter by 10%. What matters more to the stock price?",
		options: [
			{ id: "a", text: "The 20% EPS beat — strong results are what count" },
			{ id: "b", text: "The 10% guidance cut — investors are forward-looking" },
		],
		correctId: "b",
		explanation: "Markets price in the future, not the past. A strong past result with weak forward guidance signals the good times are fading. The stock will almost certainly fall on the guidance cut, despite the beat.",
		xp: 20,
	},
	{
		id: "dc-saas-vs-bank-pe",
		type: "comparison",
		prompt: "Which company would you expect to have a higher P/E ratio?",
		options: [
			{ id: "a", text: "A fast-growing SaaS company with 40% revenue growth" },
			{ id: "b", text: "A regional bank growing revenue at 5% per year" },
		],
		correctId: "a",
		explanation: "Investors pay a premium for fast growth. A SaaS company growing 40% annually could have a P/E of 40-80x because the future earnings potential is massive. A slow-growth bank might trade at 8-12x earnings.",
		xp: 15,
	},
	{
		id: "dc-short-squeeze",
		type: "scenario",
		prompt: "A heavily shorted stock (40% of float is short) suddenly announces a major partnership. What might amplify the stock's initial move upward?",
		options: [
			{ id: "a", text: "Short sellers are forced to buy shares to cover their losses" },
			{ id: "b", text: "The company issues new shares to raise cash" },
		],
		correctId: "a",
		explanation: "This is called a short squeeze. When a heavily shorted stock rises sharply, short sellers rush to buy shares to close their positions and limit losses — which pushes the price even higher. GameStop in 2021 is the most famous example.",
		xp: 25,
	},
	{
		id: "dc-free-cash-flow",
		type: "scenario",
		prompt: "Two companies both report $1B in net income. Company A has $1.5B in free cash flow. Company B has $300M. Which is more financially healthy?",
		options: [
			{ id: "a", text: "Company A — more cash is generated than profit shows" },
			{ id: "b", text: "Company B — lower cash means less spending" },
		],
		correctId: "a",
		explanation: "Free cash flow (FCF) is often considered a better measure of financial health than net income. Company A generates 1.5x its reported profit in actual cash — meaning its earnings are high quality. Company B converts only 30% of profits to cash, suggesting heavy capital spending or accounting adjustments.",
		xp: 25,
	},
	{
		id: "dc-market-cap-price",
		type: "comparison",
		prompt: "Stock A trades at $5 per share. Stock B trades at $500 per share. Which stock is 'cheaper'?",
		options: [
			{ id: "a", text: "Stock A — it costs $5, which is much less" },
			{ id: "b", text: "Can't tell — need to know market cap and earnings first" },
		],
		correctId: "b",
		explanation: "Share price alone tells you nothing about value. A $5 stock with billions of shares outstanding could be worth far more than a $500 stock with few shares. What matters is market cap (total value) and valuation multiples like P/E — not the price per share.",
		xp: 20,
	},
];

// ── Stock Battles ─────────────────────────────────────────────────────────────

export const STOCK_BATTLES: BattleMatchup[] = [
	{
		id: "nvda-vs-amd",
		tickerA: "NVDA",
		nameA: "NVIDIA",
		tickerB: "AMD",
		nameB: "AMD",
		category: "Semiconductors",
		metric: "revenueGrowth",
		metricLabel: "Revenue Growth",
		higherWins: true,
		explanation: "NVIDIA's H100 and H200 GPUs became the must-have hardware for training AI models — every major cloud provider (AWS, Azure, Google) scrambled to buy them. That scarcity created explosive revenue growth. AMD makes competitive AI chips (MI300X) and is gaining share, but NVIDIA's CUDA software ecosystem creates a switching cost: most AI developers have built workflows on CUDA for over a decade and don't want to relearn. That lock-in gives NVIDIA pricing power AMD can't easily match.",
		xp: 5,
	},
	{
		id: "sbux-vs-cmg",
		tickerA: "SBUX",
		nameA: "Starbucks",
		tickerB: "CMG",
		nameB: "Chipotle",
		category: "Restaurants",
		metric: "profitMargin",
		metricLabel: "Profit Margin",
		higherWins: true,
		explanation: "Chipotle's menu has just 5 proteins and 7 toppings — every store runs the same simple assembly line, so training is fast and waste is low. Starbucks has thousands of drink combinations, expensive espresso machines, barista training, and a mobile ordering system that creates backlogs during peak hours. Those backlogs slow service, frustrate customers, and raise labour costs. Starbucks also operated too many low-profit locations and relied on price increases to mask slowing foot traffic — a strategy that has limits.",
		xp: 5,
	},
	{
		id: "coin-vs-hood",
		tickerA: "COIN",
		nameA: "Coinbase",
		tickerB: "HOOD",
		nameB: "Robinhood",
		category: "Fintech",
		metric: "revenueGrowth",
		metricLabel: "Revenue Growth",
		higherWins: true,
		explanation: "Coinbase earns transaction fees every time someone buys or sells crypto. When Bitcoin rallies and retail traders flood in, Coinbase's revenue explodes. But in a crypto winter (like 2022), trading volumes collapse and so does revenue. Robinhood earns money through payment for order flow (PFOF) on stock trades and is actively diversifying into crypto, retirement accounts, and credit cards. That diversification makes Robinhood's revenue more stable but means it grows slower than Coinbase does in a crypto bull market.",
		xp: 5,
	},
	{
		id: "msft-vs-googl",
		tickerA: "MSFT",
		nameA: "Microsoft",
		tickerB: "GOOGL",
		nameB: "Alphabet",
		category: "Big Tech",
		metric: "profitMargin",
		metricLabel: "Profit Margin",
		higherWins: true,
		explanation: "Microsoft sells Office 365 and Azure cloud services on recurring subscriptions — once a company is on Microsoft's tools, switching is painful, so customers stay for years and margins stay high. Alphabet earns ~80% of revenue from advertising, which is highly profitable but more vulnerable to economic slowdowns (advertisers cut budgets in recessions) and to competition from TikTok and Amazon eating into ad share. Microsoft's subscription model is simply more predictable and defensible.",
		xp: 5,
	},
	{
		id: "tsla-vs-rivn",
		tickerA: "TSLA",
		nameA: "Tesla",
		tickerB: "RIVN",
		nameB: "Rivian",
		category: "EVs",
		metric: "profitMargin",
		metricLabel: "Profit Margin",
		higherWins: true,
		explanation: "Tesla built its own factories, battery technology, and software — after years of losses, it figured out how to manufacture EVs profitably. Rivian is earlier on that same journey: it sells R1T trucks and R1S SUVs plus Amazon delivery vans, but each vehicle still costs more to build than it sells for. The challenge is that scaling a car factory is brutally expensive — tooling, supply chains, and quality control all take years to optimise. Rivian is improving but hasn't cracked the unit economics yet.",
		xp: 5,
	},
	{
		id: "cost-vs-wmt",
		tickerA: "COST",
		nameA: "Costco",
		tickerB: "WMT",
		nameB: "Walmart",
		category: "Retail",
		metric: "peRatio",
		metricLabel: "P/E Ratio",
		higherWins: false,
		explanation: "Costco's P/E is much higher than Walmart's because of its membership model — customers pay $65/year just to shop there, which gives Costco guaranteed, predictable revenue before selling a single product. That loyalty also means Costco can sell goods at razor-thin margins (sometimes at cost) and still profit from the membership fees. Walmart competes on low prices without that guaranteed income, making it more vulnerable to Amazon. Investors pay a premium for Costco's predictability and its almost cult-like customer loyalty.",
		xp: 5,
	},
	{
		id: "crm-vs-now",
		tickerA: "CRM",
		nameA: "Salesforce",
		tickerB: "NOW",
		nameB: "ServiceNow",
		category: "Enterprise SaaS",
		metric: "revenueGrowth",
		metricLabel: "Revenue Growth",
		higherWins: true,
		explanation: "ServiceNow sells software that automates IT workflows inside large companies — think 'help desk tickets, software deployments, and IT approvals, but automated.' That market is still massively underpenetrated and ServiceNow has been adding AI features that drive expansions within existing customers. Salesforce invented the CRM (customer relationship management) category but that market is now mature and crowded — Microsoft, HubSpot, and others compete hard. Salesforce has to spend heavily on sales and acquisition to keep growing.",
		xp: 5,
	},
	{
		id: "meta-vs-snap",
		tickerA: "META",
		nameA: "Meta",
		tickerB: "SNAP",
		nameB: "Snap",
		category: "Social Media",
		metric: "profitMargin",
		metricLabel: "Profit Margin",
		higherWins: true,
		explanation: "Meta owns Facebook, Instagram, and WhatsApp — 3 billion daily users across platforms that advertisers pay premium rates to reach. Meta has also invested heavily in AI-powered ad targeting that delivers measurable results for businesses. Snap's problem is its audience: mostly younger users who advertisers pay less to reach, on a platform where brand advertising is harder to measure. Snap has tried augmented reality features and a paid subscription but can't escape the fundamental mismatch between its user base and what advertisers want to buy.",
		xp: 5,
	},
];

// ── Earnings Lab Scenarios ─────────────────────────────────────────────────────

export const EARNINGS_SCENARIOS: EarningsScenario[] = [
	{
		id: "el-nike",
		company: "Nike",
		ticker: "NKE",
		context: "Nike is the world's largest sportswear company. The stock has fallen 15% over the past 3 months on concerns about slowing demand in China and North America.",
		revenueExpected: "$12.4B",
		epsExpected: "$0.76",
		stockContext: "Down 15% in the last 3 months",
		question: "What outcome would most likely cause the stock to rally after earnings?",
		options: [
			{ id: "a", text: "Revenue beats and management raises full-year guidance" },
			{ id: "b", text: "Revenue beats but management warns of 'near-term headwinds'" },
			{ id: "c", text: "Revenue misses but management says it's 'just temporary'" },
		],
		correctId: "a",
		outcome: "Nike beat on revenue but missed margins and lowered guidance. The stock fell 6% the next day — investors cared more about the weaker future outlook than the past beat.",
		explanation: "When a beaten-down stock reports earnings, investors need both a present beat AND a positive forward outlook to rally. A beat with weak guidance still signals continued trouble ahead.",
		xp: 7,
	},
	{
		id: "el-netflix",
		company: "Netflix",
		ticker: "NFLX",
		context: "Netflix introduced password sharing crackdowns and an ad-supported tier. The stock has been rising ahead of earnings on expectations of subscriber growth.",
		revenueExpected: "$9.8B",
		epsExpected: "$4.93",
		stockContext: "Up 30% in the last 2 months",
		question: "The stock is up 30% into earnings. Even if Netflix beats, what might limit the upside?",
		options: [
			{ id: "a", text: "The good news is already priced in — a 'sell the news' reaction" },
			{ id: "b", text: "Netflix is a bad company" },
			{ id: "c", text: "Strong earnings always cause stocks to fall" },
		],
		correctId: "a",
		outcome: "Netflix beat on subscribers and EPS, but the stock barely moved. Much of the upside had already been priced in by traders who bought the run-up.",
		explanation: "When a stock rises sharply ahead of earnings, investors have already 'bought the rumor.' Even a solid beat may produce little additional upside — or the stock can actually fall on the news.",
		xp: 7,
	},
	{
		id: "el-meta",
		company: "Meta",
		ticker: "META",
		context: "Meta is spending $50B+ annually on AI and metaverse infrastructure. Revenue is growing, but investors are worried about whether the spending will ever pay off.",
		revenueExpected: "$38B",
		epsExpected: "$5.22",
		stockContext: "Up 8% this month",
		question: "Meta beats revenue and EPS, and raises guidance. But also announces $10B MORE in AI spending. What likely happens?",
		options: [
			{ id: "a", text: "Stock rallies — beats and raised guidance" },
			{ id: "b", text: "Stock falls — extra spending concerns investors" },
			{ id: "c", text: "Mixed reaction depending on how the spending is explained" },
		],
		correctId: "c",
		outcome: "Meta stock was volatile — initially falling on the spending news, then rallying as management explained the AI ROI story convincingly on the earnings call.",
		explanation: "Context matters. Increased spending can be bullish if it's building durable competitive advantages, or bearish if it seems wasteful. How management frames it often determines the reaction.",
		xp: 7,
	},
	{
		id: "el-amd",
		company: "AMD",
		ticker: "AMD",
		context: "AMD has been gaining market share from Intel in CPUs and competing with NVIDIA in AI chips. The stock has a P/E of 180x on AI growth expectations.",
		revenueExpected: "$7.2B",
		epsExpected: "$1.18",
		stockContext: "P/E of 180x on AI expectations",
		question: "AMD beats revenue and EPS but says data center AI chip growth is slightly slower than expected. What likely happens?",
		options: [
			{ id: "a", text: "Stock rallies on the beat" },
			{ id: "b", text: "Stock sells off — the AI growth story is the whole reason for the 180x P/E" },
			{ id: "c", text: "No reaction — beats are always positive" },
		],
		correctId: "b",
		outcome: "AMD fell sharply despite beating on headline numbers. At 180x earnings, investors needed a blockbuster AI report. Even a slight miss on the core AI thesis was punished severely.",
		explanation: "When a stock trades at an extreme valuation, it needs to perfectly execute on the story that justifies the premium. Any doubt about the thesis — even small — can cause large selloffs.",
		xp: 7,
	},
	{
		id: "el-microsoft",
		company: "Microsoft",
		ticker: "MSFT",
		context: "Microsoft has been aggressively investing in AI through its partnership with OpenAI and integrating Copilot into Office, Azure, and Teams. Azure cloud is growing fast.",
		revenueExpected: "$61.0B",
		epsExpected: "$2.82",
		stockContext: "Near all-time highs, P/E ~33x",
		question: "Microsoft beats EPS by $0.08 and Azure growth comes in at 33% vs 31% expected. What likely happens?",
		options: [
			{ id: "a", text: "Stock rallies — both metrics beat expectations" },
			{ id: "b", text: "Stock falls — the beat wasn't big enough at this valuation" },
			{ id: "c", text: "Stock is flat — beats are already priced in at 33x earnings" },
		],
		correctId: "a",
		outcome: "Microsoft rallied ~4% after hours. Both EPS and Azure growth beat estimates, and management raised forward guidance. At a premium valuation, investors needed confirmation the AI investment is paying off — and they got it.",
		explanation: "Even at a high valuation, a genuine beat with raised guidance can drive meaningful moves. The key was Azure acceleration — the number investors were most focused on — coming in above expectations.",
		xp: 7,
	},
	{
		id: "el-snap",
		company: "Snap",
		ticker: "SNAP",
		context: "Snap has struggled to grow revenue as advertisers shifted budgets to Meta and TikTok. The stock has fallen 80%+ from its all-time highs.",
		revenueExpected: "$1.1B",
		epsExpected: "-$0.05",
		stockContext: "Down 80% from ATH, very low expectations",
		question: "Snap beats revenue by $30M and reports daily active users slightly above estimates. What likely happens?",
		options: [
			{ id: "a", text: "Stock surges — any beat on a low-expectation stock is rewarded" },
			{ id: "b", text: "Stock falls — no amount of beats can save Snap" },
			{ id: "c", text: "Depends entirely on whether management guides higher for next quarter" },
		],
		correctId: "c",
		outcome: "Snap spiked on the beat but quickly faded when management guided revenue lower than expected for the next quarter. The initial rally reversed within hours.",
		explanation: "Low-expectation stocks can rally sharply on beats, but the sustainability depends on guidance. A revenue beat with soft forward guidance signals the problem isn't fixed — just delayed. The 'relief rally' quickly became a sell.",
		xp: 7,
	},
	{
		id: "el-costco",
		company: "Costco",
		ticker: "COST",
		context: "Costco is a warehouse retailer with a membership model. It trades at a P/E of ~50x — expensive for a retailer — because investors love its predictable membership revenue and loyal customer base.",
		revenueExpected: "$58B",
		epsExpected: "$3.65",
		stockContext: "P/E of ~50x — expensive for retail",
		question: "Costco reports in-line results — revenue and EPS exactly match expectations. Membership renewal rates stay at 93%. What likely happens?",
		options: [
			{ id: "a", text: "Stock rallies — Costco always goes up" },
			{ id: "b", text: "Stock falls — an in-line result disappoints at a 50x P/E" },
			{ id: "c", text: "Stock is roughly flat — meeting expectations is OK" },
		],
		correctId: "c",
		outcome: "Costco stock moved less than 1% after the report. Meeting expectations at a premium valuation is acceptable but not exciting. The market needed an upside surprise to push it higher.",
		explanation: "At a 50x P/E, investors are paying a premium for above-average execution. Meeting estimates keeps existing shareholders happy but doesn't attract new buyers. Flat is actually a good outcome for a richly-valued stock that didn't disappoint.",
		xp: 7,
	},
];

// ── Risk Lab Scenarios ────────────────────────────────────────────────────────

export const RISK_SCENARIOS: RiskScenario[] = [
	{
		id: "rl-coke-vs-asts",
		prompt: "Which stock feels riskier to own?",
		optionA: "Coca-Cola (KO)",
		optionB: "AST SpaceMobile (ASTS)",
		riskierOption: "B",
		explanation: "ASTS is a pre-revenue satellite internet company whose future depends on successful deployment, technology execution, and regulatory approval. Coca-Cola has sold drinks for 130 years, generates billions in profit, and pays a growing dividend. The risk levels are not comparable.",
		xp: 5,
	},
	{
		id: "rl-apple-vs-spce",
		prompt: "Which stock carries more risk of permanent capital loss?",
		optionA: "Apple (AAPL)",
		optionB: "Virgin Galactic (SPCE)",
		riskierOption: "B",
		explanation: "Apple generates $100B+ in annual profit, has $60B in cash, and sells products 2 billion people use daily. Virgin Galactic is a pre-revenue space tourism company that has been burning cash for years and is building its next-generation spaceship. The risk of permanent loss is dramatically higher with SPCE.",
		xp: 5,
	},
	{
		id: "rl-jnj-vs-mrna",
		prompt: "Which is the riskier investment?",
		optionA: "Johnson & Johnson (JNJ)",
		optionB: "Moderna (MRNA)",
		riskierOption: "B",
		explanation: "J&J is a 130-year-old healthcare conglomerate with diversified revenue across pharmaceuticals, medical devices, and consumer products. Moderna built a single product (COVID vaccine) that drove most of its revenue. As COVID demand fell, revenue crashed. Single-product biotech companies carry far more risk.",
		xp: 5,
	},
	{
		id: "rl-tsla-vs-f",
		prompt: "Which EV-related stock carries more risk?",
		optionA: "Rivian (RIVN)",
		optionB: "Ford (F)",
		riskierOption: "A",
		explanation: "Ford is a 120-year-old automaker with billions in revenue, a profitable ICE business funding its EV transition, and a dividend. Rivian is an EV startup still scaling production, burning cash, and yet to prove it can manufacture at scale profitably. The risk profiles are completely different.",
		xp: 5,
	},
	{
		id: "rl-utility-vs-crypto",
		prompt: "Which investment is more volatile?",
		optionA: "Duke Energy (DUK) — a regulated utility",
		optionB: "Coinbase (COIN) — a crypto exchange",
		riskierOption: "B",
		explanation: "Duke Energy earns regulated returns on power transmission — its earnings are predictable and its dividend is stable. Coinbase's revenue is directly tied to crypto trading volumes, which can fall 80%+ in a bear market. During crypto winters, Coinbase's revenue collapses.",
		xp: 5,
	},
	{
		id: "rl-microsoft-vs-ai-startup",
		prompt: "Which is the higher-risk investment?",
		optionA: "Microsoft (MSFT)",
		optionB: "A newly-listed AI startup with no revenue",
		riskierOption: "B",
		explanation: "Microsoft has $200B+ in revenue, 40%+ profit margins, Azure cloud growing fast, and a decades-long track record. An AI startup with no revenue is entirely dependent on future execution, fund-raising, and market conditions — any of which can fail. Most startups don't survive.",
		xp: 5,
	},
];

// ── Market Mood Simulator ────────────────────────────────────────────────────

export const MOOD_SCENARIOS: MoodScenario[] = [
	{
		id: "mm-rates-rise",
		event: "📈 The Fed raises interest rates by 0.75%",
		question: "Which type of stocks typically feels the most pressure?",
		options: [
			{ id: "a", text: "High-growth tech stocks" },
			{ id: "b", text: "Utility companies" },
			{ id: "c", text: "Consumer staples like food companies" },
		],
		correctId: "a",
		explanation: "High-growth tech stocks rely on future earnings projections. Rising rates increase the discount rate applied to those future profits, making them worth less today. Utilities and staples are more stable because their current earnings are more predictable.",
		xp: 5,
	},
	{
		id: "mm-inflation-hot",
		event: "🔥 Inflation comes in at 6% — higher than expected",
		question: "What does persistently high inflation typically mean for stocks?",
		options: [
			{ id: "a", text: "Stocks always rally — inflation means growth" },
			{ id: "b", text: "It pressures stocks because the Fed will likely raise rates more" },
			{ id: "c", text: "Only energy stocks are affected" },
		],
		correctId: "b",
		explanation: "High inflation forces the Fed to raise rates aggressively to cool the economy. Higher rates slow economic growth and compress stock valuations — especially for growth and tech stocks.",
		xp: 5,
	},
	{
		id: "mm-fed-cuts",
		event: "✂️ The Fed cuts interest rates by 0.5%",
		question: "Which type of stocks typically benefits most from rate cuts?",
		options: [
			{ id: "a", text: "High-growth and tech stocks" },
			{ id: "b", text: "Bank stocks" },
			{ id: "c", text: "Oil and gas companies" },
		],
		correctId: "a",
		explanation: "Rate cuts reduce the discount rate applied to future profits, making growth stock valuations expand. Cheap money also encourages borrowing and spending, which benefits high-growth businesses. Banks actually earn less on loans when rates fall.",
		xp: 5,
	},
	{
		id: "mm-oil-spike",
		event: "🛢️ Oil prices surge 40% due to geopolitical tensions",
		question: "Which sector directly benefits from a spike in oil prices?",
		options: [
			{ id: "a", text: "Energy companies (XOM, CVX, OXY)" },
			{ id: "b", text: "Airlines and shipping companies" },
			{ id: "c", text: "Consumer technology companies" },
		],
		correctId: "a",
		explanation: "Energy companies sell oil and gas — higher prices mean more revenue and profit for them. Airlines and shipping are hurt by higher fuel costs. Tech is mostly unaffected directly, though broader inflation concerns can weigh on all stocks.",
		xp: 5,
	},
	{
		id: "mm-ai-rally",
		event: "🤖 A major AI breakthrough is announced — models are 10x more capable",
		question: "Which stocks would likely benefit most?",
		options: [
			{ id: "a", text: "AI chip makers and cloud providers (NVDA, MSFT, GOOGL)" },
			{ id: "b", text: "Traditional media companies and newspapers" },
			{ id: "c", text: "Grocery chains and discount retailers" },
		],
		correctId: "a",
		explanation: "AI advancements require massive computing power — more chips, more data centers, more cloud infrastructure. Companies like NVIDIA (GPUs), Microsoft (Azure AI), and Alphabet (Google Cloud) are direct beneficiaries of AI adoption curves.",
		xp: 5,
	},
	{
		id: "mm-consumer-weak",
		event: "📉 Consumer spending falls 3% — the biggest drop in 2 years",
		question: "Which sector is most directly hurt by weak consumer spending?",
		options: [
			{ id: "a", text: "Consumer discretionary (restaurants, retail, travel)" },
			{ id: "b", text: "Healthcare companies" },
			{ id: "c", text: "Defence contractors" },
		],
		correctId: "a",
		explanation: "Consumer discretionary companies sell non-essential goods and services — restaurants, fashion, travel, luxury. When consumers pull back, these companies see revenue fall immediately. Healthcare and defence spending is less dependent on consumer sentiment.",
		xp: 5,
	},
	{
		id: "mm-bitcoin-jumps",
		event: "₿ Bitcoin jumps 50% in a month",
		question: "Which stock would likely rally along with Bitcoin?",
		options: [
			{ id: "a", text: "Coinbase (COIN)" },
			{ id: "b", text: "Goldman Sachs (GS)" },
			{ id: "c", text: "Walmart (WMT)" },
		],
		correctId: "a",
		explanation: "Coinbase's revenue is directly tied to crypto trading volumes and prices. When Bitcoin rallies, retail and institutional traders flood back into crypto markets — driving higher transaction fees for Coinbase. Goldman and Walmart have minimal direct crypto exposure.",
		xp: 5,
	},
	{
		id: "mm-recession-feared",
		event: "😰 GDP contracts for 2 consecutive quarters — recession fears spike",
		question: "Which portfolio would hold up best in a recession?",
		options: [
			{ id: "a", text: "Heavy on consumer discretionary and speculative growth" },
			{ id: "b", text: "Diversified with utilities, healthcare, and consumer staples" },
			{ id: "c", text: "100% in cryptocurrency" },
		],
		correctId: "b",
		explanation: "In recessions, people still pay electricity bills, buy medicine, and purchase basic groceries. Defensive sectors (utilities, healthcare, staples) see more stable earnings. Discretionary spending, speculative assets, and crypto tend to fall hardest when economic fear rises.",
		xp: 5,
	},
];

// ── What Would You Do? Scenarios ────────────────────────────────────────────

export interface WWYDScenario {
	id: string;
	scenario: string;
	options: QuizOption[];
	bestId: string;
	explanation: string;
	wrongNotes?: Record<string, string>; // optionId → brief dismissal of why it's not ideal
	xp: number;
}

export const WWYD_SCENARIOS: WWYDScenario[] = [
	{
		id: "wwyd-down-after-earnings",
		scenario: "A stock in your watchlist drops 12% after earnings. Revenue beat but guidance was cut. What do you do first?",
		options: [
			{ id: "a", text: "Panic and remove it immediately" },
			{ id: "b", text: "Read why guidance was cut before deciding" },
			{ id: "c", text: "Buy more — it's cheaper now" },
			{ id: "d", text: "Ignore it entirely" },
		],
		bestId: "b",
		wrongNotes: {
			a: "Panic-selling locks in a loss before you understand if the thesis is broken. Many great investors add on weakness — but only after reading the situation.",
			c: "Buying more without understanding the guidance cut is risky. A 12% drop on cut guidance can become 30% if the problems are structural.",
			d: "Ignoring a -12% move with cut guidance means you're flying blind. You don't need to act, but you should understand what happened.",
		},
		explanation: "The right first move is to understand why guidance was cut. Was it a one-time issue, macro headwinds, or a structural problem? Context determines whether you should hold, sell, or buy more.",
		xp: 25,
	},
	{
		id: "wwyd-up-30",
		scenario: "A stock you saved is up 30% in 3 weeks after a product announcement. What do you do?",
		options: [
			{ id: "a", text: "Sell everything — lock in the gain" },
			{ id: "b", text: "Buy more — momentum is strong" },
			{ id: "c", text: "Re-evaluate: has the thesis changed or is it just hype?" },
			{ id: "d", text: "Nothing — just watch it go higher" },
		],
		bestId: "c",
		wrongNotes: {
			a: "Selling immediately after a 30% run ignores whether the move is justified. If the thesis is intact, you may be selling a winner too early.",
			b: "Adding more purely on momentum without checking valuation is speculation, not investing. What if the product announcement was already priced in?",
			d: "Doing nothing at all means not engaging with the question of whether the new price still makes sense. Watching without thinking is passive risk.",
		},
		explanation: "A sharp 30% move warrants re-evaluation. Is the product announcement fundamentally worth 30% more? If the thesis is intact, hold or add. If it looks stretched on hype, trimming is rational.",
		xp: 25,
	},
	{
		id: "wwyd-beat-fell",
		scenario: "A company beats both EPS and revenue by 10%+ but the stock falls 8% after-hours. What's your reaction?",
		options: [
			{ id: "a", text: "The market is wrong — buy the dip immediately" },
			{ id: "b", text: "Something is wrong — dig into the earnings call for clues" },
			{ id: "c", text: "Sell — if a beat causes a drop, the stock is broken" },
			{ id: "d", text: "Wait until tomorrow and see what happens" },
		],
		bestId: "b",
		wrongNotes: {
			a: "The market isn't often wrong collectively — a 8% drop on a beat usually means there's bad news buried in the report. Don't assume, investigate.",
			c: "A stock falling on a beat doesn't mean it's broken — it often means guidance was soft or investors expected even more. Selling without context is reactive.",
			d: "Waiting blindly without reading the report means you'll wake up without context. The earnings call transcript is usually available within hours.",
		},
		explanation: "A drop despite a beat usually signals weak guidance, margin compression, or a worrying metric. Read the earnings call transcript before making any move.",
		xp: 25,
	},
	{
		id: "wwyd-high-growth-no-profit",
		scenario: "You're considering adding a stock growing revenue at 60% YoY but losing money. What matters most?",
		options: [
			{ id: "a", text: "Revenue growth alone — losses don't matter for growth stocks" },
			{ id: "b", text: "The path to profitability — are losses shrinking as revenue grows?" },
			{ id: "c", text: "The current stock price — if it's cheap, buy it" },
			{ id: "d", text: "Avoid all unprofitable companies" },
		],
		bestId: "b",
		wrongNotes: {
			a: "Revenue growth matters enormously, but losses do matter. Companies that grow revenue without improving margins eventually run out of cash or dilute shareholders.",
			c: "A 'cheap' share price tells you nothing. $2 can be very expensive if the company is burning cash with no path to profit.",
			d: "Many of the best investments — Amazon, Uber, Spotify — were unprofitable for years. The question isn't profitability now, it's whether the path is clear.",
		},
		explanation: "Revenue growth is great, but look for improving gross margins and operating leverage — signs that scale will eventually produce profits.",
		xp: 25,
	},
	{
		id: "wwyd-analyst-upgrade",
		scenario: "An analyst from Goldman Sachs upgrades a stock you own with a $50 higher price target. What do you do?",
		options: [
			{ id: "a", text: "Buy more immediately — Goldman is never wrong" },
			{ id: "b", text: "Understand why they upgraded before acting" },
			{ id: "c", text: "Sell — the upgrade is already priced in" },
			{ id: "d", text: "Ignore analyst opinions entirely" },
		],
		bestId: "b",
		wrongNotes: {
			a: "Goldman is not infallible — analysts have been spectacularly wrong. More importantly, the upgrade may already be priced in by the time you act.",
			c: "Sometimes upgrades are already priced in, sometimes not. You can't know without understanding what changed in the thesis.",
			d: "Analyst research can be valuable signal, especially when a high-conviction firm changes direction. Ignoring it entirely means missing useful data.",
		},
		explanation: "The key question is why they upgraded. If the reason aligns with your own thesis, it's reinforcing. If it's vague, be more sceptical.",
		xp: 20,
	},
	{
		id: "wwyd-dividend-cut",
		scenario: "A dividend stock you follow cuts its dividend by 40%. The stock is down 15% today. What's your first move?",
		options: [
			{ id: "a", text: "Buy immediately — 15% discount is a gift" },
			{ id: "b", text: "Investigate why the dividend was cut before deciding" },
			{ id: "c", text: "Sell — dividend cuts always mean the company is doomed" },
			{ id: "d", text: "Hold without doing anything" },
		],
		bestId: "b",
		wrongNotes: {
			a: "A 15% drop on a dividend cut can become 40% if the cut signals deeper financial trouble. Discounts only matter if the underlying business is sound.",
			c: "Not always. Some cuts are strategic — a company might cut dividends to fund an acquisition or invest in growth. Context is everything.",
			d: "Holding without understanding is passive risk. You don't need to sell, but you should know why the cut happened before deciding to stay.",
		},
		explanation: "A dividend cut is a serious signal, but context is everything. Understand whether it signals financial stress or a strategic pivot before deciding.",
		xp: 20,
	},
	{
		id: "wwyd-entire-sector-selling",
		scenario: "The entire tech sector is down 15% this week due to a Fed rate hike. A stock you've been watching is now at a 52-week low. What do you do?",
		options: [
			{ id: "a", text: "Buy it — sector dips are always opportunities" },
			{ id: "b", text: "Check if the business fundamentals changed or if it's just rate fear" },
			{ id: "c", text: "Avoid tech entirely until rates stabilise" },
			{ id: "d", text: "Wait for the bottom before buying" },
		],
		bestId: "b",
		wrongNotes: {
			a: "Sector dips are not always opportunities — some stocks fall because the business is deteriorating, not just because of macro. Check fundamentals first.",
			c: "Avoiding an entire sector based on macro timing is hard to get right. Quality tech companies often recover faster than you expect when rates stabilise.",
			d: "Waiting for 'the bottom' is nearly impossible to time. By the time the bottom is confirmed, the easy gains have usually already happened.",
		},
		explanation: "Sector-wide selloffs create opportunities — but only if the business is still healthy. Check: is the company still growing? Rate-driven dips in solid companies have historically been good entry points.",
		xp: 25,
	},
];

// ── Practice Mode tickers ─────────────────────────────────────────────────────
// A curated selection of well-known brands for practice scenarios

export const PRACTICE_TICKERS = [
	{ ticker: "AAPL",  name: "Apple",           prompt: "High-margin hardware and software company with massive buybacks. Premium brand with strong loyalty." },
	{ ticker: "TSLA",  name: "Tesla",            prompt: "EV pioneer with high growth, high valuation, and volatile earnings. Elon Musk drives both the brand and the swings." },
	{ ticker: "NVDA",  name: "NVIDIA",           prompt: "AI chip leader seeing unprecedented demand. Revenue and margins have exploded. Valuation is stretched by historical standards." },
	{ ticker: "META",  name: "Meta",             prompt: "Ad-revenue giant with strong AI infrastructure. Trades at a reasonable multiple for its growth rate." },
	{ ticker: "NFLX",  name: "Netflix",          prompt: "Streaming leader with improving margins from ad-tier and password sharing crackdown. Subscriber growth stabilising." },
	{ ticker: "COIN",  name: "Coinbase",         prompt: "Crypto exchange with revenue highly tied to market cycle. Volatile but the largest regulated US crypto platform." },
	{ ticker: "PLTR",  name: "Palantir",         prompt: "AI data platform for government and enterprise. Revenue growing but expensive — P/E is very high." },
	{ ticker: "SHOP",  name: "Shopify",          prompt: "E-commerce infrastructure for SMBs. Strong revenue growth but profitability has been inconsistent." },
	{ ticker: "SBUX",  name: "Starbucks",        prompt: "Global coffee brand facing operational challenges. High dividend yield but growth has slowed." },
	{ ticker: "RBLX",  name: "Roblox",           prompt: "Gaming platform for young users. Revenue growing, but profitability distant and competition intense." },
	{ ticker: "MSFT",  name: "Microsoft",        prompt: "Cloud, AI, Office, and Xbox. One of the most diversified mega-cap tech companies with a growing dividend." },
	{ ticker: "AMZN",  name: "Amazon",           prompt: "E-commerce and AWS cloud in one. AWS is the profit engine; retail is the customer flywheel." },
	{ ticker: "GOOGL", name: "Alphabet",         prompt: "Search, YouTube, and Google Cloud. Advertising is 80% of revenue — rate-sensitive to ad market cycles." },
	{ ticker: "DDOG",  name: "Datadog",          prompt: "Cloud monitoring and observability platform. High growth, improving profitability, beloved by DevOps teams." },
	{ ticker: "CRWD",  name: "CrowdStrike",      prompt: "AI-powered cybersecurity platform. Subscription model with high retention and rapid growth." },
	{ ticker: "DUOL",  name: "Duolingo",         prompt: "Language-learning app with strong DAU growth and subscription revenue. High P/E on future profitability hopes." },
	{ ticker: "HOOD",  name: "Robinhood",        prompt: "Commission-free trading app diversifying into crypto, retirement, and credit. Revenue tied to trading activity." },
	{ ticker: "ASTS",  name: "AST SpaceMobile",  prompt: "Pre-revenue satellite broadband startup. Massive upside if execution succeeds; high risk of dilution and failure." },
	{ ticker: "AMD",   name: "AMD",              prompt: "Semiconductor company gaining share from Intel in CPUs and competing with NVIDIA in AI chips. Strong execution." },
	{ ticker: "NKE",   name: "Nike",             prompt: "Global sportswear leader facing brand challenges. Dividend payer undergoing operational restructuring." },
];

// ── Build Your First Watchlist game ──────────────────────────────────────────

export type WatchlistSlotType = "familiar" | "growth" | "defensive" | "dividend" | "speculative";

export interface WatchlistSlot {
	type: WatchlistSlotType;
	label: string;
	description: string;
	emoji: string;
	examples: string[];
}

export const WATCHLIST_SLOTS: WatchlistSlot[] = [
	{ type: "familiar",   label: "Familiar Brand",    emoji: "🏠", description: "A company you use or know well in real life.", examples: ["Apple","Nike","Starbucks","Netflix","Disney"] },
	{ type: "familiar",   label: "Familiar Brand",    emoji: "🏠", description: "Another brand you know and trust.", examples: ["Amazon","Spotify","Roblox","McDonald's","Tesla"] },
	{ type: "growth",     label: "Growth Stock",      emoji: "🚀", description: "A company growing revenue fast — high risk, high potential.", examples: ["NVIDIA","Palantir","Shopify","Datadog","Duolingo"] },
	{ type: "growth",     label: "Growth Stock",      emoji: "🚀", description: "Another high-growth opportunity.", examples: ["CrowdStrike","Cloudflare","Coinbase","SoundHound","Roblox"] },
	{ type: "defensive",  label: "Defensive Stock",   emoji: "🛡️", description: "Stable company that holds up in downturns.", examples: ["Procter & Gamble","Johnson & Johnson","Walmart","Costco","Coca-Cola"] },
	{ type: "dividend",   label: "Dividend Stock",    emoji: "💵", description: "Pays regular cash to shareholders.", examples:["Coca-Cola","JPMorgan","Microsoft","Apple","Verizon"] },
	{ type: "speculative",label: "Speculative Play",  emoji: "🎲", description: "High risk, high potential — moon or bust.", examples: ["Virgin Galactic","AST SpaceMobile","Rivian","Joby Aviation","SoundHound"] },
];

export interface WatchlistBrand {
	id: string;
	ticker: string;
	name: string;
	types: WatchlistSlotType[];
	description: string;
}

export const WATCHLIST_BRANDS: WatchlistBrand[] = [
	{ id: "aapl",  ticker: "AAPL",  name: "Apple",         types: ["familiar","dividend"],    description: "Consumer tech giant with high margins, loyal users, and a growing services business." },
	{ id: "tsla",  ticker: "TSLA",  name: "Tesla",         types: ["familiar","growth","speculative"], description: "EV and energy leader. High growth, high valuation, volatile." },
	{ id: "nvda",  ticker: "NVDA",  name: "NVIDIA",        types: ["growth"],                 description: "AI chip leader with explosive revenue growth driven by data center demand." },
	{ id: "sbux",  ticker: "SBUX",  name: "Starbucks",     types: ["familiar","dividend"],    description: "Global coffee chain. Steady dividend but facing growth challenges." },
	{ id: "nflx",  ticker: "NFLX",  name: "Netflix",       types: ["familiar","growth"],      description: "Streaming leader improving margins with ads and password sharing crackdown." },
	{ id: "ko",    ticker: "KO",    name: "Coca-Cola",     types: ["defensive","dividend"],   description: "130-year-old beverages giant. Stable earnings, growing dividend, recession-resistant." },
	{ id: "wmt",   ticker: "WMT",   name: "Walmart",       types: ["defensive","dividend"],   description: "Retail giant with stable revenue, growing e-commerce, and reliable dividend." },
	{ id: "jnj",   ticker: "JNJ",   name: "Johnson & Johnson", types: ["defensive","dividend"], description: "Healthcare conglomerate. Decades of dividend growth. Defensive holding." },
	{ id: "meta",  ticker: "META",  name: "Meta",          types: ["growth","familiar"],      description: "Social media and AI infrastructure. Strong profit margins and growing revenue." },
	{ id: "coin",  ticker: "COIN",  name: "Coinbase",      types: ["speculative","growth"],   description: "Crypto exchange with revenue tied directly to crypto market cycles." },
	{ id: "pltr",  ticker: "PLTR",  name: "Palantir",      types: ["speculative","growth"],   description: "AI data platform for government and enterprise. Growing fast, expensive valuation." },
	{ id: "msft",  ticker: "MSFT",  name: "Microsoft",     types: ["growth","dividend","defensive"], description: "Cloud, AI, Office, and Xbox. Diversified tech giant with growing dividend." },
	{ id: "amzn",  ticker: "AMZN",  name: "Amazon",        types: ["familiar","growth"],      description: "E-commerce and AWS cloud. Two dominant businesses under one roof." },
	{ id: "rblx",  ticker: "RBLX",  name: "Roblox",        types: ["familiar","speculative"], description: "Gaming platform for Gen Z. High growth but profitability is distant." },
	{ id: "asts",  ticker: "ASTS",  name: "AST SpaceMobile", types: ["speculative"],          description: "Satellite broadband startup. Pre-revenue, high risk, massive potential." },
	{ id: "spce",  ticker: "SPCE",  name: "Virgin Galactic",  types: ["speculative"],         description: "Space tourism company rebuilding with Delta-class ships. Volatile and risky." },
	{ id: "rivn",  ticker: "RIVN",  name: "Rivian",        types: ["speculative","growth"],   description: "EV truck startup. Growing production, still losing money, high risk." },
	{ id: "cost",  ticker: "COST",  name: "Costco",        types: ["defensive","dividend"],   description: "Membership warehouse retailer. Loyal customer base, strong margins, reliable." },
	{ id: "shop",  ticker: "SHOP",  name: "Shopify",       types: ["growth"],                 description: "E-commerce infrastructure for SMBs. Strong revenue growth, inconsistent profits." },
	{ id: "nke",   ticker: "NKE",   name: "Nike",          types: ["familiar","dividend"],    description: "Global sportswear leader. Dividend payer with brand power but recent challenges." },
];

// ── Lesson category config ────────────────────────────────────────────────────

export const LESSON_CATEGORIES: { id: LessonCategory; emoji: string; color: string }[] = [
	{ id: "Stock Basics",   emoji: "📈", color: "blue"   },
	{ id: "Market Basics",  emoji: "🌍", color: "purple" },
	{ id: "Valuation",      emoji: "🔢", color: "cyan"   },
	{ id: "Earnings",       emoji: "📋", color: "amber"  },
	{ id: "Risk",           emoji: "⚠️", color: "red"    },
	{ id: "Dividends",      emoji: "💵", color: "green"  },
	{ id: "Sectors",        emoji: "🗂️", color: "pink"   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getLessonById(id: string): Lesson | undefined {
	return LESSONS.find((l) => l.id === id);
}

export function getLessonsByCategory(category: LessonCategory): Lesson[] {
	return LESSONS.filter((l) => l.category === category);
}

/** Pick a deterministic daily challenge from the pool using the date as seed */
export function getDailyChallenge(dateKey: string): DailyChallenge {
	let hash = 0;
	for (let i = 0; i < dateKey.length; i++) {
		hash = ((hash << 5) - hash) + dateKey.charCodeAt(i);
		hash |= 0;
	}
	const idx = Math.abs(hash) % DAILY_CHALLENGES.length;
	return DAILY_CHALLENGES[idx]!;
}

// ── Weekly Pack system ────────────────────────────────────────────────────────

export type ActivityType = "lesson" | "battle" | "earnings" | "risk" | "mood" | "wwyd";

export interface WeeklyActivity {
	id: string;
	type: ActivityType;
	title: string;
	subtitle: string;
	emoji: string;
	xp: number;
}

export interface WeeklyPack {
	weekKey: string;    // "2026-W22"
	tier: number;       // 1–5
	activities: WeeklyActivity[];
	totalXp: number;
	label: string;      // e.g. "Beginner Pack"
	color: string;
}

// Assign each lesson a tier based on its category
const LESSON_TIERS: Record<string, number> = {
	"what-is-a-stock": 1, "what-is-market-cap": 1, "what-is-a-ticker": 1,
	"why-rates-matter": 2, "what-is-a-bull-bear-market": 2, "how-market-hours-work": 1,
	"what-is-pe-ratio": 2, "what-is-revenue-growth": 2, "what-makes-stock-expensive": 3,
	"what-are-earnings": 2, "why-stocks-fall-after-good-earnings": 3, "how-to-read-earnings": 3,
	"what-is-risk": 2, "what-is-beta": 3,
	"what-is-a-dividend": 2, "why-dividend-stocks-drop-rates-rise": 3,
	"what-is-a-sector": 2, "tech-sector-deep-dive": 3,
};

// Assign each battle a tier
const BATTLE_TIERS: Record<string, number> = {
	"nvda-vs-amd": 3, "sbux-vs-cmg": 2, "coin-vs-hood": 3,
	"msft-vs-googl": 3, "tsla-vs-rivn": 2, "cost-vs-wmt": 2,
	"crm-vs-now": 4, "meta-vs-snap": 3,
};

// Tier XP multipliers
const TIER_XP: Record<number, { lesson: number; battle: number; lab: number; label: string; color: string }> = {
	1: { lesson: 20, battle: 5,  lab: 5,  label: "Beginner Pack",  color: "border-slate-500/30 bg-slate-500/[0.07]"   },
	2: { lesson: 28, battle: 6,  lab: 6,  label: "Learner Pack",   color: "border-blue-500/30 bg-blue-500/[0.07]"     },
	3: { lesson: 35, battle: 7,  lab: 7,  label: "Investor Pack",  color: "border-cyan-500/30 bg-cyan-500/[0.07]"     },
	4: { lesson: 45, battle: 8,  lab: 8,  label: "Analyst Pack",   color: "border-violet-500/30 bg-violet-500/[0.07]" },
	5: { lesson: 60, battle: 10, lab: 10, label: "Expert Pack",    color: "border-amber-500/30 bg-amber-500/[0.07]"   },
};

function xpTier(totalXp: number): number {
	if (totalXp >= 1000) return 5;
	if (totalXp >= 600) return 4;
	if (totalXp >= 300) return 3;
	if (totalXp >= 100) return 2;
	return 1;
}

function seededPick<T>(arr: T[], seed: number, count: number): T[] {
	const result: T[] = [];
	const copy = [...arr];
	let s = seed;
	while (result.length < count && copy.length > 0) {
		s = (s * 1664525 + 1013904223) & 0xffffffff;
		const idx = Math.abs(s) % copy.length;
		result.push(copy.splice(idx, 1)[0]!);
	}
	return result;
}

// How many of each activity type per tier
const TIER_COUNTS: Record<number, { lessons: number; battles: number; earnings: number; risk: number; mood: number; wwyd: number }> = {
	1: { lessons: 3, battles: 1, earnings: 1, risk: 2, mood: 1, wwyd: 0 },
	2: { lessons: 4, battles: 2, earnings: 1, risk: 2, mood: 2, wwyd: 1 },
	3: { lessons: 4, battles: 2, earnings: 2, risk: 3, mood: 2, wwyd: 1 },
	4: { lessons: 5, battles: 3, earnings: 2, risk: 3, mood: 3, wwyd: 2 },
	5: { lessons: 5, battles: 3, earnings: 3, risk: 4, mood: 3, wwyd: 2 },
};

/**
 * Returns the full weekly pack — this IS the content for the week.
 * Lesson Library, Battles, Labs etc. only show content from this pack.
 */
export function getWeeklyPack(totalXp: number, weekKey: string): WeeklyPack {
	let seed = 0;
	for (let i = 0; i < weekKey.length; i++) {
		seed = ((seed << 5) - seed) + weekKey.charCodeAt(i);
		seed |= 0;
	}

	const tier = xpTier(totalXp);
	const xpRates = TIER_XP[tier]!;
	const counts = TIER_COUNTS[tier]!;

	// Lessons — tier-appropriate only
	const eligibleLessons = LESSONS.filter(l => (LESSON_TIERS[l.id] ?? 1) <= tier);
	const pickedLessons = seededPick(eligibleLessons, seed, counts.lessons).map(l => ({
		id: l.id, type: "lesson" as ActivityType,
		title: l.title, subtitle: l.category, emoji: l.emoji, xp: xpRates.lesson,
	}));

	// Battles — tier-appropriate
	const eligibleBattles = STOCK_BATTLES.filter(b => (BATTLE_TIERS[b.id] ?? 2) <= tier);
	const pickedBattles = seededPick(eligibleBattles, seed + 1, counts.battles).map(b => ({
		id: b.id, type: "battle" as ActivityType,
		title: `${b.nameA} vs ${b.nameB}`, subtitle: b.category, emoji: "⚔️", xp: xpRates.battle,
	}));

	// Earnings scenarios
	const pickedEarnings = seededPick(EARNINGS_SCENARIOS, seed + 2, counts.earnings).map(s => ({
		id: s.id, type: "earnings" as ActivityType,
		title: `${s.company} Earnings`, subtitle: "Earnings Lab", emoji: "📋", xp: xpRates.lab,
	}));

	// Risk comparisons
	const pickedRisk = seededPick(RISK_SCENARIOS, seed + 3, counts.risk).map(s => ({
		id: s.id, type: "risk" as ActivityType,
		title: `${s.optionA.split(" ")[0]} vs ${s.optionB.split(" ")[0]}`, subtitle: "Risk Lab", emoji: "⚠️", xp: xpRates.lab - 5,
	}));

	// Mood simulations
	const pickedMood = seededPick(MOOD_SCENARIOS, seed + 4, counts.mood).map(s => ({
		id: s.id, type: "mood" as ActivityType,
		title: s.event.replace(/^[^\w]*/, "").slice(0, 35), subtitle: "Market Mood", emoji: "🌍", xp: xpRates.lab,
	}));

	// WWYD scenarios (unlocks at tier 2+)
	const pickedWwyd = counts.wwyd > 0
		? seededPick(WWYD_SCENARIOS, seed + 5, counts.wwyd).map(s => ({
			id: s.id, type: "wwyd" as ActivityType,
			title: s.scenario.slice(0, 40) + "…", subtitle: "What Would You Do?", emoji: "🎯", xp: xpRates.lab,
		}))
		: [];

	const activities = [...pickedLessons, ...pickedBattles, ...pickedEarnings, ...pickedRisk, ...pickedMood, ...pickedWwyd];
	const totalXpForPack = activities.reduce((sum, a) => sum + a.xp, 0);

	return {
		weekKey,
		tier,
		activities,
		totalXp: totalXpForPack,
		label: xpRates.label,
		color: xpRates.color,
	};
}

/** Get the current ISO week key, e.g. "2026-W22" */
export function getCurrentWeekKey(): string {
	const d = new Date();
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	return `${d.getUTCFullYear()}-W${week}`;
}
