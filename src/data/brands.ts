export interface VibeMetric {
	name: string;
	emoji: string;
	value: number;
	color: string;
}

export interface FinancialMetric {
	label: string;
	value: string;
	explanation: string;
	culturalTranslation: string;
}

export interface NewsArticle {
	headline: string;
	source: string;
	timestamp: string;
	sentiment: "Bullish" | "Bearish" | "Neutral";
	url: string;
}

export interface BrandProfile {
	id: string;
	ticker: string;
	name: string;
	bio: string;
	heroImage: string;
	personalityDescription: string;
	vibes: VibeMetric[];
	culturalContext: {
		title: string;
		sections: {
			heading: string;
			content: string;
		}[];
	};
	financials: {
		peRatio: FinancialMetric;
		marketCap: FinancialMetric;
		revenueGrowth: FinancialMetric;
		profitMargin: FinancialMetric;
		beta: FinancialMetric;
		dividendYield: FinancialMetric;
	};
	news: NewsArticle[];
}

export const brands: BrandProfile[] = [
	{
		id: "tsla",
		ticker: "TSLA",
		name: "Tesla",
		bio: "electric dreams & memes that break the simulation",
		heroImage:
			"https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&h=500&fit=crop",
		personalityDescription: "The chaos energy of your group chat's tech bro",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 92, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 88, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 95, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Tesla Lives Rent-Free in Everyone's Head",
			sections: [
				{
					heading: "Main Character Energy",
					content:
						"Tesla isn’t just a car company — it’s the one that somehow ends up in every conversation. Between headline-grabbing tweets from its CEO and cars that look nothing like anything else on the road, Tesla stays relevant by being impossible to ignore.",
				},
				{
					heading: "The Vibe",
					content:
						"Future tech meets saving the planet meets flex culture. Tesla made electric cars feel exciting instead of boring, and convinced people that driving green could also look cool. Also yes, the cars have fart mode. That’s real.",
				},
				{
					heading: "Why It Matters",
					content:
						"Tesla forced every major car company to take electric vehicles seriously. Before Tesla, EVs were niche and forgettable. After Tesla, they became the future. Love it or hate it, Tesla changed what people expect from cars.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "68",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "expensive but popular—people are betting on the future",
			},
			marketCap: {
				label: "Market Cap",
				value: "$800 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "bigger than most traditional car companies combined",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "19%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "growing fast, not slowing down",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "15%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "solid profits, not just hype",
			},
			beta: {
				label: "Beta",
				value: "2.3",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "rollercoaster energy—it moves a lot",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "no payouts, all growth mode",
			},
		},
		news: [
			{
				headline: "Tesla Cybertruck deliveries ramp up as production hits new milestone",
				source: "Bloomberg",
				timestamp: "3 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Elon Musk's latest tweet sparks debate about Tesla's autopilot safety",
				source: "TechCrunch",
				timestamp: "1 day ago",
				sentiment: "Neutral",
				url: "#",
			},
			{
				headline: "Analysts mixed on Tesla stock as competition intensifies in EV market",
				source: "CNBC",
				timestamp: "2 days ago",
				sentiment: "Bearish",
				url: "#",
			},
		],
	},
	{
		id: "aapl",
		ticker: "AAPL",
		name: "Apple",
		bio: "the aesthetic everyone copies but won't admit",
		heroImage:
			"https://images.unsplash.com/photo-1611472173362-3f53dbd65d80?w=800&h=500&fit=crop",
		personalityDescription: "Clean girl aesthetic meets generational wealth",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 98, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 85, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Apple is the Original It Girl",
			sections: [
				{
					heading: "Cultural Reset",
					content:
						"Apple created the blueprint for making tech feel like a lifestyle. They turned unboxing into ASMR content and convinced everyone that being in a blue bubble group chat means you matter.",
				},
				{
					heading: "The Ecosystem Trap",
					content:
						"Once you're in, you're IN. AirPods, iPhone, MacBook, Apple Watch—it's giving capsule wardrobe but make it tech. They made vendor lock-in feel like an aesthetic choice.",
				},
				{
					heading: "Why It Matters",
					content:
						"Apple doesn't just sell products—they sell identity. That glowing logo is a status symbol, and they've made minimalism feel expensive. Their product launches are basically fashion week for nerds.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "32",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "premium pricing for premium brand",
			},
			marketCap: {
				label: "Market Cap",
				value: "$3.5 trillion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "literally the most valuable company on Earth",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "8%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "steady money printer",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "26%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "insane margins—they know what they're worth",
			},
			beta: {
				label: "Beta",
				value: "1.2",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "stable but still moves",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0.5%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "small but consistent payouts",
			},
		},
		news: [
			{
				headline: "Apple Vision Pro sales softer than expected, analysts say",
				source: "The Verge",
				timestamp: "5 hours ago",
				sentiment: "Bearish",
				url: "#",
			},
			{
				headline: "iPhone 16 pre-orders break records in India and China",
				source: "Reuters",
				timestamp: "1 day ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Apple's AI features rolling out slower than competitors",
				source: "WSJ",
				timestamp: "3 days ago",
				sentiment: "Neutral",
				url: "#",
			},
		],
	},
	{
		id: "nvda",
		ticker: "NVDA",
		name: "NVIDIA",
		bio: "powering your AI girlfriend and gaming setup",
		heroImage:
			"https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&h=500&fit=crop",
		personalityDescription: "The plug everyone needs but nobody talks about",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 90, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why NVIDIA is the Secret Main Character",
			sections: [
				{
					heading: "The AI Gold Rush",
					content:
						"While everyone talks about flashy AI apps and chatbots, NVIDIA focuses on the less glamorous part: the hardware that makes all of it possible. Their chips are what power most modern AI systems behind the scenes. If AI is the gold rush, NVIDIA sells the tools everyone needs to dig.",
				},
				{
					heading: "Runs Everything, Brags About Nothing",
					content:
						"High-performance, hard-to-replace, quietly dominant. NVIDIA built a reputation in gaming first, then became essential for AI, data centers, and advanced computing. They’re not loud on social media — their relevance comes from being needed everywhere.'",
				},
				{
					heading: "Why It Matters",
					content:
						"NVIDIA went from “that graphics card company” to a backbone of modern computing. Their technology shows up in gaming PCs, AI research, cloud services, and more. When new tech trends take off, NVIDIA usually benefits because their chips are already at the center of it all.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "75",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "sky-high valuation driven by AI hype",
			},
			marketCap: {
				label: "Market Cap",
				value: "$2.9 trillion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "AI gold rush made them a giant",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "122%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "absolutely exploding",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "55%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "printing money from AI chips",
			},
			beta: {
				label: "Beta",
				value: "1.7",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "volatile but riding the AI wave",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0.03%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "barely anything—all about growth",
			},
		},
		news: [
			{
				headline: "NVIDIA unveils next-gen AI chips, stock surges",
				source: "Bloomberg",
				timestamp: "2 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Competition heats up as AMD announces rival GPU",
				source: "TechCrunch",
				timestamp: "1 day ago",
				sentiment: "Bearish",
				url: "#",
			},
			{
				headline: "Data centers buying NVIDIA chips faster than they can make them",
				source: "CNBC",
				timestamp: "2 days ago",
				sentiment: "Bullish",
				url: "#",
			},
		],
	},
	{
		id: "rblx",
		ticker: "RBLX",
		name: "Roblox",
		bio: "where gen alpha gets their drip & trades virtual economies",
		heroImage:
			"https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&h=500&fit=crop",
		personalityDescription: "Minecraft's chaotic younger sibling",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 65, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 88, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Roblox is Gen Alpha's Entire Personality",
			sections: [
				{
					heading: "The Metaverse Before It Was Cringe",
					content:
						"Roblox has been doing the metaverse since before Zuck tried to make it happen. Kids are living entire lives in there—making games, running businesses, attending concerts. It's giving Second Life but make it blocky.",
				},
				{
					heading: "Economic Simulation",
					content:
						"Children are learning about market dynamics through Robux. They're trading limited items like NFTs before they even know what blockchain is. Some kids are making more money than their parents. Wild.",
				},
				{
					heading: "Why It Matters",
					content:
						"Roblox is where Gen Alpha socializes, creates, and learns capitalism. It's not just a game—it's their hangout spot, creative outlet, and first job all in one. The cultural influence is insane.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "N/A",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "not profitable yet, all about user growth",
			},
			marketCap: {
				label: "Market Cap",
				value: "$25 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "bigger than traditional game studios",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "22%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "growing with Gen Alpha",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "-18%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "losing money but building empire",
			},
			beta: {
				label: "Beta",
				value: "1.4",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "moves with tech sentiment",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "no profits = no dividends",
			},
		},
		news: [
			{
				headline: "Roblox introduces new safety features for younger users",
				source: "The Verge",
				timestamp: "4 hours ago",
				sentiment: "Neutral",
				url: "#",
			},
			{
				headline: "Q3 user numbers beat expectations as Gen Alpha engagement grows",
				source: "Reuters",
				timestamp: "2 days ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Concerns raised about monetization of child-created content",
				source: "WSJ",
				timestamp: "1 week ago",
				sentiment: "Bearish",
				url: "#",
			},
		],
	},
	{
		id: "meta",
		ticker: "META",
		name: "Meta",
		bio: "your mom's on facebook, you're on insta, nobody's in the metaverse",
		heroImage:
			"https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=800&h=500&fit=crop",
		personalityDescription: "That friend who peaked in high school but still shows up",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 95, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Meta Can't Escape the Group Chat",
			sections: [
				{
					heading: "Instagram's Grip",
					content:
						"We all complain about it, yet we’re still posting stories and scrolling Reels late at night. Instagram became the place where moments feel real only if they’re shared. It’s exhausting, addictive, and somehow essential all at once.",
				},
				{
					heading: "The Metaverse Flop",
					content:
						"Meta spent billions trying to push virtual worlds most people weren’t asking for, while users just wanted Instagram to stop changing the algorithm. The rebrand signaled a big future vision — even if the timing felt off.",
				},
				{
					heading: "Why It Matters",
					content:
						"Meta controls how billions of people communicate every day. Instagram, WhatsApp, and Facebook aren’t just apps — they’re infrastructure for social life. Even when people say they’re “over it,” they still show up. That kind of attention is hard to replace.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "28",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "reasonable for a tech giant",
			},
			marketCap: {
				label: "Market Cap",
				value: "$1.3 trillion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "still massive despite metaverse losses",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "23%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "ads still printing money",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "35%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "Instagram basically runs itself",
			},
			beta: {
				label: "Beta",
				value: "1.3",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "moves more than market average",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0.4%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "just started paying dividends recently",
			},
		},
		news: [
			{
				headline: "Instagram Threads reaches 200M users, challenging Twitter/X",
				source: "TechCrunch",
				timestamp: "6 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Meta's Reality Labs loses $4B this quarter on metaverse bet",
				source: "CNBC",
				timestamp: "1 day ago",
				sentiment: "Bearish",
				url: "#",
			},
			{
				headline: "Facebook ad revenue beats estimates despite TikTok competition",
				source: "Bloomberg",
				timestamp: "3 days ago",
				sentiment: "Bullish",
				url: "#",
			},
		],
	},
	{
		id: "nke",
		ticker: "NKE",
		name: "Nike",
		bio: "just do it (spend $200 on shoes you'll wear twice)",
		heroImage:
			"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=500&fit=crop",
		personalityDescription: "Athleisure royalty that convinced us hoodies are formal",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 94, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 60, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 82, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Nike Runs the Culture",
			sections: [
				{
					heading: "Sneaker Supremacy",
					content:
						"Nike turned shoes into assets. Jordans resell like crypto, and the SNKRS app has caused more heartbreak than most dating apps. They made waiting in digital queues feel like a lifestyle.",
				},
				{
					heading: "Athleisure Domination",
					content:
						"Nike convinced everyone that gym clothes work everywhere. Hoodies at brunch? Normal. Tech fleece to class or work? Accepted. They made performance wear aspirational, not just practical.",
				},
				{
					heading: "Why It Matters",
					content:
						"Nike doesn’t just sell gear — they shape culture. From headline-making ads to collabs that break the internet, they stay relevant across generations. The swoosh isn’t just a logo, it’s a signal.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "25",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "solid for a retail brand",
			},
			marketCap: {
				label: "Market Cap",
				value: "$150 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "bigger than most fashion empires",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "10%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "steady growth, not explosive",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "12%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "decent margins for retail",
			},
			beta: {
				label: "Beta",
				value: "1.1",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "relatively stable",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "1.5%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "consistent payouts to investors",
			},
		},
		news: [
			{
				headline: "Nike's direct-to-consumer strategy shows strong results",
				source: "Reuters",
				timestamp: "8 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Competition from On Running and Hoka eating market share",
				source: "WSJ",
				timestamp: "2 days ago",
				sentiment: "Bearish",
				url: "#",
			},
			{
				headline: "New Jordan collaboration sells out in minutes",
				source: "Hypebeast",
				timestamp: "1 week ago",
				sentiment: "Neutral",
				url: "#",
			},
		],
	},
	{
		id: "sbux",
		ticker: "SBUX",
		name: "Starbucks",
		bio: "your $8 oat milk latte has entered the chat",
		heroImage:
			"https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&h=500&fit=crop",
		personalityDescription: "Basic culture elevated to an aesthetic",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 70, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Starbucks is the Original Third Place",
			sections: [
				{
					heading: "Main Character Moment",
					content:
						"Walking around with that green siren cup is part of the aesthetic. Starbucks turned overpriced coffee into a personality trait and made “I can’t function without caffeine” feel like a lifestyle choice, not a problem.",
				},
				{
					heading: "The Secret Menu Industrial Complex",
					content:
						"Starbucks didn’t just sell coffee — it created a culture of customization. People order drinks by screenshots, TikTok baristas invent off-menu combos daily, and the Pink Drink became a social media icon all on its own.",
				},
				{
					heading: "Why It Matters",
					content:
						"Starbucks normalized spending $7 on coffee and made cafés acceptable places to work, hang out, or exist for hours. They didn’t just change what people drink but also shaped modern coffee culture. Also yes, pumpkin spice season still runs the calendar.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "22",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "reasonable for consumer brand",
			},
			marketCap: {
				label: "Market Cap",
				value: "$110 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "coffee empire status",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "11%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "still expanding globally",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "14%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "solid margins on overpriced coffee",
			},
			beta: {
				label: "Beta",
				value: "0.9",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "more stable than most",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "2.3%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "decent income for investors",
			},
		},
		news: [
			{
				headline: "Starbucks union negotiations reach tentative agreement",
				source: "CNBC",
				timestamp: "3 hours ago",
				sentiment: "Neutral",
				url: "#",
			},
			{
				headline: "Same-store sales miss estimates as traffic slows",
				source: "Bloomberg",
				timestamp: "1 day ago",
				sentiment: "Bearish",
				url: "#",
			},
			{
				headline: "New CEO announces major menu overhaul",
				source: "The Verge",
				timestamp: "4 days ago",
				sentiment: "Bullish",
				url: "#",
			},
		],
	},
	{
		id: "spot",
		ticker: "SPOT",
		name: "Spotify",
		bio: "your wrapped reveal is your whole personality for a week",
		heroImage:
			"https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=800&h=500&fit=crop",
		personalityDescription: "The algorithm that knows you better than you know yourself",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 80, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Spotify Soundtracks Your Life",
			sections: [
				{
					heading: "Wrapped Supremacy",
					content:
						"Spotify Wrapped is the annual personality test nobody asked for but everyone shares. It's astrology for music taste. People plan their listening habits all year just to have good stats. The screenshots flood every timeline.",
				},
				{
					heading: "Playlist Culture",
					content:
						"Making playlists is the new mixtape. 'Pov: you're the main character' playlists have their own aesthetic. Collaborative playlists for group chats. Discover Weekly knows your vibe better than your best friend.",
				},
				{
					heading: "Why It Matters",
					content:
						"Spotify democratized music access and made discovery algorithmic. They turned listening habits into social currency. The green app icon means you're never without a soundtrack. Music taste is identity, and Spotify is the curator.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "N/A",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "barely profitable, focused on growth",
			},
			marketCap: {
				label: "Market Cap",
				value: "$75 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "dominates music streaming",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "16%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "subscribers still growing",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "1%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "tiny margins, licensing costs eat profits",
			},
			beta: {
				label: "Beta",
				value: "1.5",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "volatile stock",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "no profits to share",
			},
		},
		news: [
			{
				headline: "Spotify Premium price increase announced for 2024",
				source: "TechCrunch",
				timestamp: "5 hours ago",
				sentiment: "Neutral",
				url: "#",
			},
			{
				headline: "User growth accelerates in emerging markets",
				source: "Reuters",
				timestamp: "2 days ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Artists renew criticism of low streaming payouts",
				source: "Billboard",
				timestamp: "1 week ago",
				sentiment: "Bearish",
				url: "#",
			},
		],
	},
	{
		id: "amzn",
		ticker: "AMZN",
		name: "Amazon",
		bio: "2-day shipping has ruined your patience forever",
		heroImage:
			"https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=800&h=500&fit=crop",
		personalityDescription: "The everything store that knows what you want before you do",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 90, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 70, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Amazon is Inescapable",
			sections: [
				{
					heading: "Instant Gratification HQ",
					content:
						"Amazon trained an entire generation to expect everything immediately. Same-day delivery feels normal now, and waiting a week for shipping feels outdated. They made convenience so seamless that going to physical stores can feel inefficient by comparison.",
				},
				{
					heading: "The Everything Empire",
					content:
						"Amazon started with books and now shows up everywhere — your TV, your smart home, your groceries, and the apps you use daily. The smile logo gives “I know what you need before you do” energy, and honestly… that’s not wrong.",
				},
				{
					heading: "Why It Matters",
					content:
						"Amazon fundamentally changed how we shop and what we expect from retail. Prime membership is like a lifestyle subscription. They made online shopping so seamless that physical stores are fighting for relevance. Plus, Amazon’s cloud services power a huge part of the internet, which means the company benefits even when you’re not shopping.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "33",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "expensive but AWS justifies it",
			},
			marketCap: {
				label: "Market Cap",
				value: "$2.6 trillion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "everything store is massive",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "13%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "still growing despite size",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "9%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "retail is tough, AWS saves them",
			},
			beta: {
				label: "Beta",
				value: "1.4",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "moves with tech sector",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "Bezos doesn't do dividends",
			},
		},
		news: [
			{
				headline: "Amazon Web Services growth slows as cloud spending moderates",
				source: "CNBC",
				timestamp: "4 hours ago",
				sentiment: "Bearish",
				url: "#",
			},
			{
				headline: "Prime Day breaks sales records across all categories",
				source: "Bloomberg",
				timestamp: "1 day ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "FTC antitrust case against Amazon moves forward",
				source: "WSJ",
				timestamp: "5 days ago",
				sentiment: "Neutral",
				url: "#",
			},
		],
	},
	{
		id: "nflx",
		ticker: "NFLX",
		name: "Netflix",
		bio: "binge culture architect & password sharing police",
		heroImage:
			"https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&h=500&fit=crop",
		personalityDescription: "The friend who suggests watching something then falls asleep",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 75, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 78, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Netflix Owns Your Screen Time",
			sections: [
				{
					heading: "Binge Culture Headquarters",
					content:
						"Netflix invented the “just one more episode” lie. Dropping full seasons at once wrecked sleep schedules worldwide. Auto-play is psychological warfare, and they made binge-watching a normal personality trait.",
				},
				{
					heading: "Meme Factory",
					content:
						"Every Netflix hit turns into a moment or a meme. Squid Game costumes, Wednesday’s dance, Stranger Things nostalgia—Netflix shows dominate timelines even when they vanish after one season.",
				},
				{
					heading: "Why It Matters",
					content:
						"Netflix killed cable TV and changed how we consume media. They made streaming mainstream. Yeah, they're cracking down on password sharing now (RIP the golden era), but they created the template every other platform copied. The 'ta-dum' sound is iconic.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "42",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "pricey for streaming",
			},
			marketCap: {
				label: "Market Cap",
				value: "$265 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "streaming OG still on top",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "15%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "password crackdown working",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "20%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "strong margins for content business",
			},
			beta: {
				label: "Beta",
				value: "1.4",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "moves more than market",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "reinvesting in content",
			},
		},
		news: [
			{
				headline: "Netflix subscriber growth beats estimates after password crackdown",
				source: "Reuters",
				timestamp: "6 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "New ad tier gaining traction with price-conscious users",
				source: "The Verge",
				timestamp: "2 days ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Content spending to remain elevated despite profit goals",
				source: "Bloomberg",
				timestamp: "1 week ago",
				sentiment: "Neutral",
				url: "#",
			},
		],
	},
	{
		id: "coin",
		ticker: "COIN",
		name: "Coinbase",
		bio: "where your friend lost $5k on dog-themed coins",
		heroImage:
			"https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&h=500&fit=crop",
		personalityDescription: "Crypto's corporate cousin trying to seem legitimate",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 85, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Coinbase Rides the Chaos",
			sections: [
				{
					heading: "Crypto’s Front Door",
					content:
						"Coinbase is where normies enter the crypto wilderness. They made buying Bitcoin as easy as ordering food delivery. Before you know it, you're watching charts at 3am and using terms like 'HODL' unironically.",
				},
				{
					heading: "Volatility Theater",
					content:
						"One day crypto is the future of money, the next day it's crashing 40%. Coinbase sits in the middle of this chaos, taking fees while everyone panic-sells.",
				},
				{
					heading: "Why It Matters",
					content:
						"Love it or hate it, Coinbase legitimized crypto for mainstream audiences. They put crypto in Super Bowl ads. They made blockchain semi-respectable in the eyes of regulators. They're the bridge between 'normal finance' and 'decentralized chaos. Even people who don’t use crypto know the name — and that alone says a lot.'",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "35",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "depends entirely on crypto prices",
			},
			marketCap: {
				label: "Market Cap",
				value: "$55 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "biggest US crypto exchange",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "-8%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "down with crypto winter",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "12%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "fees keep them profitable",
			},
			beta: {
				label: "Beta",
				value: "2.8",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "extremely volatile, tied to Bitcoin",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "too volatile for dividends",
			},
		},
		news: [
			{
				headline: "Bitcoin rally lifts Coinbase trading volumes 40%",
				source: "Bloomberg",
				timestamp: "2 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "SEC lawsuit against Coinbase faces setback in court",
				source: "CNBC",
				timestamp: "1 day ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Crypto winter thaws as institutional interest returns",
				source: "WSJ",
				timestamp: "3 days ago",
				sentiment: "Neutral",
				url: "#",
			},
		],
	},
	{
		id: "msft",
		ticker: "MSFT",
		name: "Microsoft",
		bio: "office suite overlord & cloud computing empire",
		heroImage:
			"https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=800&h=500&fit=crop",
		personalityDescription: "The adult in the room that owns everything",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 96, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 40, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Microsoft Runs Everything",
			sections: [
				{
					heading: "Work-Life Monopoly",
					content:
						"Word, Excel, PowerPoint—your entire work and school life lives inside Microsoft. Group projects in Teams, spreadsheets in Excel, emails in Outlook. You don’t choose Microsoft. It chooses you. Once a company starts using it, leaving is painful.",
				},
				{
					heading: "Cloud Empire",
					content:
						"They own 'The Cloud' (Azure). It’s the invisible supercomputer that runs everything from your school's website to Fortnite servers. Microsoft bundles cloud services with Office and security tools, so businesses get everything in one place. That’s how they lock in customers for years",
				},
				{
					heading: "Why It Matters",
					content:
						"They used to be the boring 'Dad' of tech. Then they bought Xbox, LinkedIn, and half of OpenAI (ChatGPT). Now they own your work, your gaming, and your AI homework helper. The glow-up is real.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "35",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "premium but justified by cloud growth",
			},
			marketCap: {
				label: "Market Cap",
				value: "$3.1 trillion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "2nd most valuable company on Earth",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "13%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "steady cloud-driven growth",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "36%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "software margins are insane",
			},
			beta: {
				label: "Beta",
				value: "0.9",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "surprisingly stable for tech",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0.8%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "consistent dividend payer",
			},
		},
		news: [
			{
				headline: "Microsoft's AI Copilot subscriptions exceed expectations",
				source: "Bloomberg",
				timestamp: "3 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Azure cloud revenue grows 29% year-over-year",
				source: "CNBC",
				timestamp: "1 day ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "EU regulators investigate Teams bundling practices",
				source: "WSJ",
				timestamp: "4 days ago",
				sentiment: "Bearish",
				url: "#",
			},
		],
	},
	{
		id: "googl",
		ticker: "GOOGL",
		name: "Google",
		bio: "the search bar that knows your secrets",
		heroImage:
			"https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=800&h=500&fit=crop",
		personalityDescription: "Big Brother but make it colorful",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 97, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 65, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 88, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Google Knows Everything",
			sections: [
				{
					heading: "The Search Default",
					content:
						"“Just Google it” became a phrase for a reason. Google handles billions of searches every day and sits at the starting point of almost every question online. If you’re looking for something, chances are Google is where you begin.",
				},
				{
					heading: "The Everything Effect",
					content:
						"Search is just the surface. Gmail, YouTube, Maps, Android, and Chrome quietly shape how people move, communicate, and consume information. Google isn’t one app — it’s a layer that sits underneath daily digital life.",
				},
				{
					heading: "Why It Matters",
					content:
						"Google isn’t just a tech company, it’s infrastructure. Ads power much of the free internet, YouTube doubles as a massive search engine, and Android runs a huge share of smartphones worldwide. Even when you’re not thinking about Google, you’re probably using it.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "26",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "reasonable for a cash machine",
			},
			marketCap: {
				label: "Market Cap",
				value: "$1.8 trillion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "ad revenue empire",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "11%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "steady growth from ads",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "27%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "printing money from searches",
			},
			beta: {
				label: "Beta",
				value: "1.1",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "relatively stable",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "no dividends, all growth",
			},
		},
		news: [
			{
				headline: "Google's Gemini AI challenges ChatGPT dominance",
				source: "TechCrunch",
				timestamp: "4 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "YouTube ad revenue beats analyst expectations",
				source: "Bloomberg",
				timestamp: "2 days ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "DOJ antitrust case could force Google breakup",
				source: "WSJ",
				timestamp: "1 week ago",
				sentiment: "Bearish",
				url: "#",
			},
		],
	},
	{
		id: "dis",
		ticker: "DIS",
		name: "Disney",
		bio: "owns your childhood & half of Hollywood",
		heroImage:
			"https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=800&h=500&fit=crop",
		personalityDescription: "The mouse that ate entertainment",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 93, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 82, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Disney Owns Everything",
			sections: [
				{
					heading: "IP Empire",
					content:
						"Marvel, Star Wars, Pixar, ESPN, ABC, Hulu, National Geographic—Disney didn't just buy franchises, they bought entire childhoods. They perfected the art of nostalgic capitalism.",
				},
				{
					heading: "Streaming Wars",
					content:
						"Disney+ launched and immediately became a Netflix competitor. The Mandalorian alone justified subscriptions. They're leveraging 100 years of content to dominate streaming.",
				},
				{
					heading: "Why It Matters",
					content:
						"Disney creates cultural moments that span generations. From theme parks to blockbusters to streaming, they're the ultimate content empire. The mouse always wins.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "42",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "premium for content library",
			},
			marketCap: {
				label: "Market Cap",
				value: "$180 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "entertainment giant",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "7%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "steady but slowing",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "8%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "margins squeezed by streaming",
			},
			beta: {
				label: "Beta",
				value: "1.2",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "moves with consumer spending",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0.6%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "small but consistent",
			},
		},
		news: [
			{
				headline: "Disney+ subscriber growth rebounds after password crackdown",
				source: "Bloomberg",
				timestamp: "5 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Pixar's latest film breaks streaming records",
				source: "Variety",
				timestamp: "2 days ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Theme park attendance shows signs of weakness",
				source: "CNBC",
				timestamp: "1 week ago",
				sentiment: "Bearish",
				url: "#",
			},
		],
	},
	{
		id: "uber",
		ticker: "UBER",
		name: "Uber",
		bio: "your ride & your eats",
		heroImage:
			"https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=500&fit=crop",
		personalityDescription: "Gig economy poster child",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 83, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 70, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 77, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Uber Changed Transportation",
			sections: [
				{
					heading: "Gig Economy Pioneer",
					content:
						"Uber turned getting around into a tap instead of a decision. No calling cabs, no guessing arrival times — a car just shows up. That shift alone changed how people think about movement in cities.",
				},
				{
					heading: "Convenience as a Lifestyle",
					content:
						"Rides in 5 minutes, tacos in 30. They made patience optional and walking obsolete. Basically your designated driver and personal chef in one app.",
				},
				{
					heading: "Why It Matters",
					content:
						"They proved tech could rewrite how cities function. Love them or hate surge pricing, they reset expectations for convenience. Now, waiting feels outdated.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "45",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "finally profitable after years",
			},
			marketCap: {
				label: "Market Cap",
				value: "$140 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "gig economy leader",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "16%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "strong post-pandemic recovery",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "3%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "thin margins, high volume",
			},
			beta: {
				label: "Beta",
				value: "1.6",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "volatile with economy",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "no profits to share yet",
			},
		},
		news: [
			{
				headline: "Uber Eats market share gains on DoorDash",
				source: "Reuters",
				timestamp: "6 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Autonomous vehicle partnerships expand in key cities",
				source: "TechCrunch",
				timestamp: "3 days ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Driver protests continue over pay structure",
				source: "WSJ",
				timestamp: "5 days ago",
				sentiment: "Neutral",
				url: "#",
			},
		],
	},
	{
		id: "shop",
		ticker: "SHOP",
		name: "Shopify",
		bio: "Etsy shops that look professional",
		heroImage:
			"https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=500&fit=crop",
		personalityDescription: "E-commerce for everyone",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 76, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 73, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Shopify Powers the Internet",
			sections: [
				{
					heading: "E-Commerce Democracy",
					content:
						"Shopify made online stores accessible to everyone. No coding required, just ideas and hustle. From side hustles to billion-dollar brands, they power millions of businesses.",
				},
				{
					heading: "Anti-Amazon",
					content:
						"While Amazon owns the marketplace, Shopify gives merchants independence. You keep your brand, your customer data, your identity. They're the indie alternative to tech giants.",
				},
				{
					heading: "Why It Matters",
					content:
						"Shopify democratized commerce. They proved you don't need to be on Amazon to succeed online. Instagram brands, DTC companies, dropshippers—all built on Shopify.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "72",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "high growth premium",
			},
			marketCap: {
				label: "Market Cap",
				value: "$95 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "e-commerce infrastructure play",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "25%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "strong merchant growth",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "13%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "improving margins",
			},
			beta: {
				label: "Beta",
				value: "1.9",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "volatile growth stock",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "reinvesting for growth",
			},
		},
		news: [
			{
				headline: "Shopify merchant base grows 18% year-over-year",
				source: "Bloomberg",
				timestamp: "4 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "New AI features automate store management",
				source: "TechCrunch",
				timestamp: "2 days ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Competition intensifies from Square and BigCommerce",
				source: "CNBC",
				timestamp: "1 week ago",
				sentiment: "Neutral",
				url: "#",
			},
		],
	},
	{
		id: "amd",
		ticker: "AMD",
		name: "AMD",
		bio: "NVIDIA's scrappy competitor",
		heroImage:
			"https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=500&fit=crop",
		personalityDescription: "Team Red rising",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 40, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 85, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why AMD is the Underdog Hero",
			sections: [
				{
					heading: "The Comeback",
					content:
						"For years, AMD was seen as the cheaper alternative. Then everything changed. Their chips got faster, more efficient, and suddenly competitive across laptops, gaming PCs, and data centers. What used to be a backup option became a real choice.",
				},
				{
					heading: "Console Power",
					content:
						"If you’ve played a PS5 or Xbox Series X, you’ve used AMD tech. They power the consoles behind some of the biggest games in the world. That alone put AMD in millions of living rooms without most people ever realizing it.",
				},
				{
					heading: "Why It Matters",
					content:
						"AMD pulled off one of the rarest moves in tech: a real comeback. They went from being written off to powering consoles and competing with industry leaders. That kind of turnaround shows execution, momentum, and staying power — the kind that forces the whole market to pay attention.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "48",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "growth premium",
			},
			marketCap: {
				label: "Market Cap",
				value: "$240 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "major semiconductor player",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "18%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "data center momentum",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "22%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "solid chip margins",
			},
			beta: {
				label: "Beta",
				value: "1.8",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "volatile semiconductor stock",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "no dividends yet",
			},
		},
		news: [
			{
				headline: "AMD announces next-gen AI accelerators to rival NVIDIA",
				source: "Bloomberg",
				timestamp: "3 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Data center CPU market share reaches record high",
				source: "Reuters",
				timestamp: "2 days ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Gaming GPU sales face headwinds from NVIDIA dominance",
				source: "TechCrunch",
				timestamp: "1 week ago",
				sentiment: "Bearish",
				url: "#",
			},
		],
	},
	{
		id: "spy",
		ticker: "SPY",
		name: "SPY ETF",
		bio: "S&P 500 index, the ultimate set & forget",
		heroImage:
			"https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop",
		personalityDescription: "Passive investing icon",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why SPY is the People's Index",
			sections: [
				{
					heading: "Set It and Forget It",
					content:
						"SPY tracks the S&P 500—America's 500 biggest companies in one fund. Warren Buffett's advice for most people? Buy SPY and chill. It's boring, reliable, and historically returns 10% annually.",
				},
				{
					heading: "Bogleheads Unite",
					content:
						"Named after John Bogle, these investors preach low-cost index funds. SPY is the most liquid ETF on Earth. Trillions of dollars, millions of investors, one simple bet: America keeps winning.",
				},
				{
					heading: "Why It Matters",
					content:
						"SPY democratized investing. You don't need to pick stocks or time the market. Just buy America's growth and hold. It's the ultimate 'don't overthink it' investment.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "24",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "reflects S&P 500 average",
			},
			marketCap: {
				label: "Market Cap",
				value: "$500 billion AUM",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "most traded ETF globally",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "N/A",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "tracks index, not a company",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "N/A",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "ETF structure, no margins",
			},
			beta: {
				label: "Beta",
				value: "1.0",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "is the market by definition",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "1.3%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "modest quarterly payouts",
			},
		},
		news: [
			{
				headline: "SPY hits all-time high as market rally continues",
				source: "Bloomberg",
				timestamp: "6 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Record inflows into S&P 500 index funds",
				source: "WSJ",
				timestamp: "2 days ago",
				sentiment: "Neutral",
				url: "#",
			},
			{
				headline: "Fee war among brokers benefits passive investors",
				source: "CNBC",
				timestamp: "1 week ago",
				sentiment: "Bullish",
				url: "#",
			},
		],
	},
	{
		id: "qqq",
		ticker: "QQQ",
		name: "QQQ ETF",
		bio: "Nasdaq-100, pure tech energy",
		heroImage:
			"https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop",
		personalityDescription: "Tech index supremacy",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 20, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 70, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why QQQ is the Tech Bet",
			sections: [
				{
					heading: "Pure Tech Exposure",
					content:
						"QQQ tracks the Nasdaq-100—the biggest 100 non-financial companies on Nasdaq. It's basically Apple, Microsoft, Amazon, NVIDIA, and friends in one fund. Maximum tech concentration.",
				},
				{
					heading: "High Risk, High Reward",
					content:
						"When tech booms, QQQ moons. When tech crashes, QQQ bleeds. It's volatile, aggressive, and perfect for believers in innovation over stability. SPY's cooler younger sibling.",
				},
				{
					heading: "Why It Matters",
					content:
						"QQQ lets you bet on American tech dominance without picking individual winners. It's the 'I believe in the future' index. Also, it's tax-efficient and liquid as hell.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "32",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "tech premium pricing",
			},
			marketCap: {
				label: "Market Cap",
				value: "$300 billion AUM",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "most popular tech ETF",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "N/A",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "tracks Nasdaq, not a company",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "N/A",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "ETF structure",
			},
			beta: {
				label: "Beta",
				value: "1.2",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "more volatile than SPY",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0.6%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "small payouts, growth focused",
			},
		},
		news: [
			{
				headline: "QQQ outperforms SPY for fifth straight quarter",
				source: "Bloomberg",
				timestamp: "4 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Tech sector rotation drives record QQQ inflows",
				source: "CNBC",
				timestamp: "2 days ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Analysts warn of tech concentration risk in Nasdaq",
				source: "WSJ",
				timestamp: "1 week ago",
				sentiment: "Neutral",
				url: "#",
			},
		],
	},
	{
		id: "pypl",
		ticker: "PYPL",
		name: "PayPal",
		bio: "splitting the bill made easy",
		heroImage:
			"https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=500&fit=crop",
		personalityDescription: "Digital payments OG",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 79, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why PayPal Still Matters",
			sections: [
				{
					heading: "OG Digital Wallet",
					content:
						"Before Venmo, Cash App, or Apple Pay, there was PayPal. They pioneered online payments and made eBay possible. That blue button still shows up everywhere — from Etsy shops to Shopify checkouts.",
				},
				{
					heading: "Venmo's Parent Company",
					content:
						"PayPal owns Venmo, the app that turned splitting bills into a public activity. Your friends can see you paid for “pizza and regrets” at 2am. They made peer-to-peer payments a cultural norm.",
				},
				{
					heading: "Why It Matters",
					content:
						"PayPal democratized online commerce. They solved the 'how do I pay strangers on the internet' problem before anyone else. Now they process billions in transactions and connect millions of merchants.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "18",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "beaten down valuation",
			},
			marketCap: {
				label: "Market Cap",
				value: "$85 billion",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "fintech heavyweight",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "9%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "steady but slowing",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "16%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "solid payment margins",
			},
			beta: {
				label: "Beta",
				value: "1.4",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "volatile fintech stock",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "no dividends yet",
			},
		},
		news: [
			{
				headline: "PayPal launches stablecoin for crypto payments",
				source: "TechCrunch",
				timestamp: "5 hours ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Venmo user growth accelerates among Gen Z",
				source: "Bloomberg",
				timestamp: "1 day ago",
				sentiment: "Bullish",
				url: "#",
			},
			{
				headline: "Competition from Apple Pay and Google Wallet intensifies",
				source: "CNBC",
				timestamp: "4 days ago",
				sentiment: "Bearish",
				url: "#",
			},
		],
	},
	{
		id: "intc",
		ticker: "INTC",
		name: "Intel",
		bio: "inside every PC & quantum research lab",
		heroImage:
			"https://images.unsplash.com/photo-1555680206-5f368f6df0d7?w=800&h=500&fit=crop",
		personalityDescription: "The OG chip maker fighting back",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 60, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Intel Still Matters",
			sections: [
				{
					heading: "The OG Chip King",
					content:
						"Intel was the computer chip brand for decades. That “Intel Inside” sticker meant your laptop was legit. If you used a PC, Intel was probably running it.",
				},
				{
					heading: "Fighting for Relevance",
					content:
						"Intel lost ground to faster rivals like AMD and overseas chip makers. Now they’re spending billions to rebuild factories, redesign chips, and win back control instead of outsourcing everything.",
				},
				{
					heading: "Why It Matters",
					content:
						"America needs chips, and Intel is the home-team bet. This is a high-stakes comeback story. Either they return to dominance — or become a case study in how fast tech leaves giants behind.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "35", explanation: "Price-to-Earnings ratio", culturalTranslation: "turnaround premium" },
			marketCap: { label: "Market Cap", value: "$180 billion", explanation: "Total company value", culturalTranslation: "chip giant status" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "Year-over-year growth", culturalTranslation: "slow but steady" },
			profitMargin: { label: "Profit Margin", value: "8%", explanation: "Profit percentage", culturalTranslation: "struggling margins" },
			beta: { label: "Beta", value: "1.5", explanation: "Volatility measure", culturalTranslation: "volatile turnaround story" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "Annual dividend payout", culturalTranslation: "some passive income" },
		},
		news: [
			{ headline: "Intel announces new quantum chip breakthrough", source: "Bloomberg", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Foundry business struggles continue", source: "Reuters", timestamp: "1 day ago", sentiment: "Bearish", url: "#" },
			{ headline: "Government subsidies boost US manufacturing plans", source: "WSJ", timestamp: "3 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "ionq",
		ticker: "IONQ",
		name: "IonQ",
		bio: "pure-play quantum computing moonshot",
		heroImage:
			"https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=500&fit=crop",
		personalityDescription: "Quantum computing's startup darling",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 55, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 82, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why IonQ is the Quantum Bet",
			sections: [
				{
					heading: "Pure Quantum Play",
					content:
						"IonQ is betting everything on trapped-ion quantum computers. While others dabble, IonQ is all-in. High risk, potentially revolutionary reward.",
				},
				{
					heading: "Future or Fantasy?",
					content:
						"Quantum computing promises insane speed and problem-solving power… someday. The catch? Nobody knows when “someday” is. IonQ represents belief — that the quantum era arrives sooner, not later.",
				},
				{
					heading: "Why It Matters",
					content:
						"If quantum computing takes off, early players like IonQ could be massive. If not, it's an expensive science experiment. That's the gamble.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio", culturalTranslation: "no profits yet, pure growth" },
			marketCap: { label: "Market Cap", value: "$2 billion", explanation: "Total company value", culturalTranslation: "small but hyped" },
			revenueGrowth: { label: "Revenue Growth", value: "85%", explanation: "Year-over-year growth", culturalTranslation: "growing from tiny base" },
			profitMargin: { label: "Profit Margin", value: "-300%", explanation: "Profit percentage", culturalTranslation: "burning cash on R&D" },
			beta: { label: "Beta", value: "2.5", explanation: "Volatility measure", culturalTranslation: "extremely volatile" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "Annual dividend payout", culturalTranslation: "lol no" },
		},
		news: [
			{ headline: "IonQ quantum computer hits new accuracy milestone", source: "TechCrunch", timestamp: "5 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Analyst questions commercial viability timeline", source: "Bloomberg", timestamp: "2 days ago", sentiment: "Bearish", url: "#" },
			{ headline: "New partnership with major cloud provider announced", source: "CNBC", timestamp: "1 week ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "tsm",
		ticker: "TSM",
		name: "TSMC",
		bio: "makes the chips that power your entire life",
		heroImage:
			"https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=500&fit=crop",
		personalityDescription: "The invisible giant running everything",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 70, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why TSMC Runs the World",
			sections: [
				{
					heading: "The Chip Maker's Chip Maker",
					content:
						"Apple, NVIDIA, AMD—they all design chips. TSMC actually makes them. Without TSMC, your iPhone doesn't exist. Your gaming PC doesn't exist. Nothing works.",
				},
				{
					heading: "Geopolitical Chess Piece",
					content:
						"Taiwan makes most of the world's advanced chips. This makes TSMC the most strategically important company on Earth. Literally everyone needs them to not fail.",
				},
				{
					heading: "Why It Matters",
					content:
						"TSMC is why Taiwan is critical to global tech. They're not flashy, but they're essential. The ultimate 'if you know, you know' company.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28", explanation: "Price-to-Earnings ratio", culturalTranslation: "premium for dominance" },
			marketCap: { label: "Market Cap", value: "$650 billion", explanation: "Total company value", culturalTranslation: "chip manufacturing king" },
			revenueGrowth: { label: "Revenue Growth", value: "20%", explanation: "Year-over-year growth", culturalTranslation: "strong AI chip demand" },
			profitMargin: { label: "Profit Margin", value: "38%", explanation: "Profit percentage", culturalTranslation: "insane margins" },
			beta: { label: "Beta", value: "1.3", explanation: "Volatility measure", culturalTranslation: "moves with tech" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "Annual dividend payout", culturalTranslation: "modest payouts" },
		},
		news: [
			{ headline: "TSMC Arizona fab ramps up production", source: "Reuters", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "3nm chip demand exceeds supply", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Geopolitical tensions weigh on stock", source: "WSJ", timestamp: "4 days ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "qcom",
		ticker: "QCOM",
		name: "Qualcomm",
		bio: "every smartphone runs on our chips",
		heroImage:
			"https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=500&fit=crop",
		personalityDescription: "Mobile chip monopoly energy",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Qualcomm Powers Your Phone",
			sections: [
				{
					heading: "Snapdragon Supremacy",
					content:
						"Snapdragon processors are in basically every Android phone. Apple makes their own chips, everyone else uses Qualcomm. That's power.",
				},
				{
					heading: "5G Royalty Checks",
					content:
						"Qualcomm doesn't just sell chips—they own patents on wireless tech. Every phone maker pays them licensing fees. Passive income on steroids.",
				},
				{
					heading: "Why It Matters",
					content:
						"Qualcomm enabled the smartphone era and now profits from 5G. They're the invisible infrastructure making mobile possible.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22", explanation: "Price-to-Earnings ratio", culturalTranslation: "reasonable valuation" },
			marketCap: { label: "Market Cap", value: "$200 billion", explanation: "Total company value", culturalTranslation: "mobile chip giant" },
			revenueGrowth: { label: "Revenue Growth", value: "12%", explanation: "Year-over-year growth", culturalTranslation: "steady growth" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "Profit percentage", culturalTranslation: "strong margins" },
			beta: { label: "Beta", value: "1.3", explanation: "Volatility measure", culturalTranslation: "tech volatility" },
			dividendYield: { label: "Dividend Yield", value: "2.1%", explanation: "Annual dividend payout", culturalTranslation: "decent income" },
		},
		news: [
			{ headline: "New Snapdragon chip beats Apple in benchmarks", source: "TechCrunch", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Auto chip division shows strong growth", source: "Reuters", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Smartphone market slowdown concerns persist", source: "Bloomberg", timestamp: "5 days ago", sentiment: "Bearish", url: "#" },
		],
	},
	{
		id: "avgo",
		ticker: "AVGO",
		name: "Broadcom",
		bio: "infrastructure chips nobody sees but everyone needs",
		heroImage:
			"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=500&fit=crop",
		personalityDescription: "The boring company making bank",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 60, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Broadcom Runs Infrastructure",
			sections: [
				{
					heading: "Boring But Critical",
					content:
						"Broadcom makes chips for networking, broadband, storage—all the unsexy stuff that makes the internet work. Not flashy, just essential.",
				},
				{
					heading: "M&A Machine",
					content:
						"Broadcom grows by buying other companies. They're like private equity but as a chip company. Buy, optimize, print money.",
				},
				{
					heading: "Why It Matters",
					content:
						"Every data center, every network, every cloud—Broadcom chips are there. They're infrastructure incarnate.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "32", explanation: "Price-to-Earnings ratio", culturalTranslation: "premium for stability" },
			marketCap: { label: "Market Cap", value: "$650 billion", explanation: "Total company value", culturalTranslation: "infrastructure giant" },
			revenueGrowth: { label: "Revenue Growth", value: "15%", explanation: "Year-over-year growth", culturalTranslation: "M&A fueled growth" },
			profitMargin: { label: "Profit Margin", value: "35%", explanation: "Profit percentage", culturalTranslation: "excellent margins" },
			beta: { label: "Beta", value: "1.1", explanation: "Volatility measure", culturalTranslation: "relatively stable" },
			dividendYield: { label: "Dividend Yield", value: "1.9%", explanation: "Annual dividend payout", culturalTranslation: "consistent payouts" },
		},
		news: [
			{ headline: "VMware acquisition integration ahead of schedule", source: "Bloomberg", timestamp: "6 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "AI networking chips see record demand", source: "Reuters", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Antitrust concerns emerge in Europe", source: "WSJ", timestamp: "1 week ago", sentiment: "Bearish", url: "#" },
		],
	},
	{
		id: "mu",
		ticker: "MU",
		name: "Micron",
		bio: "memory chips in everything",
		heroImage: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&h=500&fit=crop",
		personalityDescription: "Memory essential",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Micron Powers Memory",
			sections: [
				{ heading: "Essential Chips", content: "Micron makes memory chips — the part of tech nobody thinks about but everything needs. Phones, laptops, data centers, gaming consoles — if it turns on, it probably uses Micron memory." },
				{ heading: "Boom & Bust Energy", content: "Memory is cyclical. When demand is hot, Micron prints. When supply floods the market, prices crash. It’s high highs, low lows — not boring, not stable, but always relevant." },
				{ heading: "Why It Matters", content: "Every device needs memory, and Micron is one of the top players globally. As AI, cloud, and data usage grow, memory demand grows with it. You can’t build the future without storage. They are the gas station for the AI revolution." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "12", explanation: "Price-to-Earnings ratio", culturalTranslation: "cyclical valuation" },
			marketCap: { label: "Market Cap", value: "$110B", explanation: "Total company value", culturalTranslation: "memory giant" },
			revenueGrowth: { label: "Revenue Growth", value: "18%", explanation: "Year-over-year growth", culturalTranslation: "AI boom" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "Profit percentage", culturalTranslation: "solid margins" },
			beta: { label: "Beta", value: "1.7", explanation: "Volatility measure", culturalTranslation: "cyclical swings" },
			dividendYield: { label: "Dividend Yield", value: "0.5%", explanation: "Annual dividend payout", culturalTranslation: "modest" },
		},
		news: [
			{ headline: "Micron wins NVIDIA AI chip orders", source: "Bloomberg", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Memory prices stabilizing", source: "Reuters", timestamp: "1 day ago", sentiment: "Neutral", url: "#" },
			{ headline: "AI demand drives growth", source: "CNBC", timestamp: "3 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "asml",
		ticker: "ASML",
		name: "ASML",
		bio: "only company making chip-making machines",
		heroImage: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=500&fit=crop",
		personalityDescription: "Dutch chip equipment monopoly",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 40, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why ASML is Irreplaceable",
			sections: [
				{ heading: "The Monopoly", content: "ASML makes EUV lithography machines—literally the only company on Earth that can. No ASML = no advanced chips. TSMC, Intel, Samsung all depend on them." },
				{ heading: "Why It Matters", content: "ASML is the ultimate semiconductor chokepoint. Geopolitically critical and technologically irreplaceable." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "45", explanation: "Price-to-Earnings ratio", culturalTranslation: "monopoly premium" },
			marketCap: { label: "Market Cap", value: "$350B", explanation: "Total company value", culturalTranslation: "essential" },
			revenueGrowth: { label: "Revenue Growth", value: "30%", explanation: "Year-over-year growth", culturalTranslation: "AI chip boom" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "Profit percentage", culturalTranslation: "strong" },
			beta: { label: "Beta", value: "1.4", explanation: "Volatility measure", culturalTranslation: "semi volatility" },
			dividendYield: { label: "Dividend Yield", value: "0.8%", explanation: "Annual dividend payout", culturalTranslation: "modest" },
		},
		news: [
			{ headline: "ASML backlog hits record $40B", source: "Bloomberg", timestamp: "1 hour ago", sentiment: "Bullish", url: "#" },
			{ headline: "China export restrictions tighten", source: "Reuters", timestamp: "2 days ago", sentiment: "Neutral", url: "#" },
			{ headline: "New High-NA EUV systems ship", source: "TechCrunch", timestamp: "5 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "nee",
		ticker: "NEE",
		name: "NextEra Energy",
		bio: "making climate change solutions actually profitable",
		heroImage: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=500&fit=crop",
		personalityDescription: "The utility company your eco-conscious friend won't shut up about",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why NextEra Makes Green Energy Boring (In a Good Way)",
			sections: [
				{ heading: "The Renewable Landlord", content: "NextEra owns more wind and solar farms than anyone in North America. While everyone argues about climate policy, they're quietly building the infrastructure that actually matters. Wind turbines? They've got thousands. Solar panels? Miles of them." },
				{ heading: "Utility Bills Meet Sustainability Goals", content: "They proved you can make money off renewables without being a Tesla-level hype machine. Regular people pay their electric bills, NextEra invests in clean energy, shareholders get dividends. It's boring finance meets saving the planet." },
				{ heading: "Why It Matters", content: "Climate change solutions need to scale, and scaling needs reliable companies making actual money. NextEra is what happens when utilities evolve instead of fighting the future." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for being the clean energy utility that actually works" },
			marketCap: { label: "Market Cap", value: "$145B", explanation: "The total value of all the company's shares combined", culturalTranslation: "bigger than most traditional power companies" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth as renewables expand" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid profits for a utility" },
			beta: { label: "Beta", value: "0.8", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "boring stable—utilities don't do rollercoasters" },
			dividendYield: { label: "Dividend Yield", value: "2.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "consistent payouts while saving the planet" },
		},
		news: [
			{ headline: "NextEra adds 2GW solar capacity", source: "Bloomberg", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Wind farm expansion continues", source: "Reuters", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Renewable targets raised", source: "CNBC", timestamp: "1 week ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "enph",
		ticker: "ENPH",
		name: "Enphase",
		bio: "the tiny box that makes rooftop solar actually work",
		heroImage: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&h=500&fit=crop",
		personalityDescription: "Profiting from your neighbor's solar flex",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 62, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 70, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Enphase Benefits From Every Rooftop Solar Panel",
			sections: [
				{ heading: "The Invisible Essential", content: "See those solar panels on suburban roofs? Each one needs an Enphase microinverter to convert sunlight into usable power. They're literally in millions of homes, hiding under solar panels, quietly converting DC to AC while homeowners post about their Tesla Powerwalls." },
				{ heading: "Solar's Infrastructure Play", content: "Everyone wants solar panels. Nobody thinks about the tech that makes them work. That's Enphase—the backend to the green energy aesthetic. When solar installers show up, Enphase is in the truck." },
				{ heading: "Why It Matters", content: "Residential solar is growing, and Enphase owns the critical component layer. They're not flashy, but they're everywhere rooftop solar exists." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "45", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "priced for solar boom growth" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "niche but dominant in their lane" },
			revenueGrowth: { label: "Revenue Growth", value: "28%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "riding the residential solar wave" },
			profitMargin: { label: "Profit Margin", value: "24%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins for specialized hardware" },
			beta: { label: "Beta", value: "1.8", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moves with solar sentiment—pretty volatile" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting in growth, no payouts" },
		},
		news: [
			{ headline: "Enphase battery storage sales surge", source: "TechCrunch", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "California solar policy changes", source: "Reuters", timestamp: "1 day ago", sentiment: "Neutral", url: "#" },
			{ headline: "New microinverter tech announced", source: "Bloomberg", timestamp: "5 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "fslr",
		ticker: "FSLR",
		name: "First Solar",
		bio: "building solar farms big enough to see from space",
		heroImage: "https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&h=500&fit=crop",
		personalityDescription: "Industrial-scale clean energy, hold the Instagram aesthetic",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 60, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why First Solar Goes Big Instead of Personal",
			sections: [
				{ heading: "The Opposite of Rooftop Solar", content: "First Solar doesn't do cute residential installs. They build massive solar farms that power entire cities—think football fields covered in panels, not your neighbor's roof. When utilities need renewable energy at scale, First Solar shows up with acres of panels." },
				{ heading: "Made in America", content: "While other solar companies source from China, First Solar manufactures in the US. They're riding both the green energy wave AND the reshoring trend. Government loves them for it." },
				{ heading: "Why It Matters", content: "Climate goals need infrastructure, not just vibes. First Solar builds the unglamorous, massive solar installations that actually move the needle on renewable energy adoption." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for a manufacturer with government tailwinds" },
			marketCap: { label: "Market Cap", value: "$32B", explanation: "The total value of all the company's shares combined", culturalTranslation: "biggest pure-play US solar manufacturer" },
			revenueGrowth: { label: "Revenue Growth", value: "22%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "utilities going green means big orders" },
			profitMargin: { label: "Profit Margin", value: "16%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid for manufacturing" },
			beta: { label: "Beta", value: "1.4", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moves with green energy sentiment" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting in expansion, no payouts" },
		},
		news: [
			{ headline: "First Solar secures 5GW contracts", source: "Bloomberg", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "US manufacturing expansion continues", source: "WSJ", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Panel efficiency improvements", source: "Reuters", timestamp: "1 week ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "plug",
		ticker: "PLUG",
		name: "Plug Power",
		bio: "betting the farm on hydrogen when nobody asked",
		heroImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=500&fit=crop",
		personalityDescription: "That friend who's convinced their niche thing will be huge",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 55, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 70, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 80, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Plug is the Ultimate Moonshot",
			sections: [
				{ heading: "Hydrogen or Bust Energy", content: "Plug Power is ALL IN on hydrogen fuel cells. Like betting your entire savings on a horse that hasn't finished a race yet. They're building hydrogen plants, powering forklifts, and dreaming of a hydrogen economy while burning cash like it's going out of style. Either visionary or delusional—time will tell." },
				{ heading: "The Volatility Theater", content: "This stock swings harder than your mood after checking crypto prices. One day hydrogen is the future, next day it's vaporware. Plug represents the 'maybe this time' energy of speculative clean tech. Wall Street day traders love the chaos." },
				{ heading: "Why It Matters", content: "If hydrogen actually becomes the fuel of the future, Plug will look genius. If not, well, they tried. Represents the high-risk bet on alternative energy that isn't solar, wind, or batteries. They're the hipster energy play—mainstream before it's cool, or never cool at all." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "not making profits, just vibes and dreams" },
			marketCap: { label: "Market Cap", value: "$4B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small but punches above its weight in volatility" },
			revenueGrowth: { label: "Revenue Growth", value: "42%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing fast from basically nothing" },
			profitMargin: { label: "Profit Margin", value: "-35%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "losing money on every sale but making it up in volume (jk they're not)" },
			beta: { label: "Beta", value: "2.8", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "rollercoaster doesn't even begin to describe it" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "lol no, they need every penny for hydrogen dreams" },
		},
		news: [
			{ headline: "Plug hydrogen plant expansion", source: "TechCrunch", timestamp: "5 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Profitability concerns persist", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bearish", url: "#" },
			{ headline: "Fuel cell truck partnership", source: "Reuters", timestamp: "4 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "xom",
		ticker: "XOM",
		name: "Exxon Mobil",
		bio: "dinosaur juice empire with 'we care now' PR",
		heroImage: "https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=500&fit=crop",
		personalityDescription: "Your rich uncle who dgaf about your opinions",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 90, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Exxon is the Villain That Pays Dividends",
			sections: [
				{ heading: "Old Money Oil Energy", content: "Exxon is THAT oil company—the one activists love to hate and investors love to collect checks from. They've been pumping oil since before your grandparents were born, and they'll probably be doing it after Gen Z retires. Climate pledges? Sure, but they're still drilling in the Permian Basin like there's no tomorrow. The duality of man." },
				{ heading: "The Greenwashing Industrial Complex", content: "They run commercials about carbon capture and renewable investments while making record profits from fossil fuels. It's giving 'I'm working on myself' energy while doing absolutely nothing different. But hey, those quarterly dividends hit different when gas prices spike." },
				{ heading: "Why It Matters", content: "Love it or hate it, the world still runs on oil. Your Uber uses it, your Amazon packages arrive via it, your plane tickets depend on it. Exxon is the uncomfortable reality check that we're not as green as our Instagram bios suggest. Plus, dividend aristocrat status means they've been paying shareholders for decades." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap because everyone pretends to hate oil" },
			marketCap: { label: "Market Cap", value: "$420B", explanation: "The total value of all the company's shares combined", culturalTranslation: "oil empire bigger than most countries' GDPs" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "up when gas prices up, down when they're not" },
			profitMargin: { label: "Profit Margin", value: "12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins when oil cooperates" },
			beta: { label: "Beta", value: "1.0", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moves with oil prices and geopolitical chaos" },
			dividendYield: { label: "Dividend Yield", value: "3.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "guilt-free passive income if you ignore the carbon footprint" },
		},
		news: [
			{ headline: "Exxon posts record profits", source: "Bloomberg", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Climate activists protest", source: "Reuters", timestamp: "1 day ago", sentiment: "Neutral", url: "#" },
			{ headline: "Permian production increases", source: "WSJ", timestamp: "4 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "cvx",
		ticker: "CVX",
		name: "Chevron",
		bio: "pumping oil with one hand, planting trees with the other",
		heroImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=500&fit=crop",
		personalityDescription: "Exxon's slightly more self-aware cousin",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 73, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 75, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Chevron Plays Both Sides",
			sections: [
				{ heading: "The 'Progressive' Oil Company", content: "Chevron is Big Oil trying to read the room. They pump billions of barrels while simultaneously investing in hydrogen and carbon capture like 'see, we get it!' It's the energy equivalent of driving a Hummer but bringing reusable bags to Whole Foods. Points for trying, but let's be real about where the money comes from." },
				{ heading: "Hedging Every Bet", content: "While Exxon goes full oil baron mode, Chevron hedges with renewable investments. LNG exports, geothermal projects, biofuels—they're diversifying like a nervous investor before a crash. Smart or desperate? Probably both. They want to stay relevant when Gen Alpha is running things." },
				{ heading: "Why It Matters", content: "Chevron represents the awkward middle ground of energy transition. They know oil won't last forever but they're milking it while they can. High dividend yields keep boomers happy, renewable PR keeps ESG funds from divesting completely. It's capitalism with a conscience (or at least a PR team)." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "11", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap valuation for fossil fuel guilt" },
			marketCap: { label: "Market Cap", value: "$280B", explanation: "The total value of all the company's shares combined", culturalTranslation: "smaller than Exxon but still massive" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady oil money flowing in" },
			profitMargin: { label: "Profit Margin", value: "10%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid profits when crude cooperates" },
			beta: { label: "Beta", value: "0.9", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "surprisingly stable for drama-prone energy sector" },
			dividendYield: { label: "Dividend Yield", value: "3.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "even better passive income than Exxon" },
		},
		news: [
			{ headline: "Chevron renewable investment announced", source: "Bloomberg", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "LNG export expansion approved", source: "Reuters", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "California refinery maintenance", source: "WSJ", timestamp: "3 days ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "v",
		ticker: "V",
		name: "Visa",
		bio: "the invisible toll booth on literally every purchase",
		heroImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop",
		personalityDescription: "That friend who gets a cut of everything without doing the work",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 92, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Visa Collects Rent on the Cashless Economy",
			sections: [
				{ heading: "The Ultimate Middleman", content: "Visa doesn't lend you money or issue cards—they just run the pipes. Every time you tap, swipe, or click 'buy now,' Visa takes a tiny cut. Multiply that by billions of transactions daily and you've got the most profitable toll booth in human history. They're the landlord of money movement." },
				{ heading: "Network Effects on Steroids", content: "Merchants accept Visa because everyone has Visa cards. People get Visa cards because every merchant accepts them. It's a beautiful monopoly disguised as convenience. Try buying anything without touching Visa's network—good luck. They've made themselves essential to capitalism itself." },
				{ heading: "Why It Matters", content: "Cash is dying and Visa profits from its funeral. Every tap-to-pay, every online checkout, every international transaction—Visa gets paid. They turned the decline of physical money into a money printing machine. The less cash people use, the richer Visa gets. Elegant capitalism." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "32", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium price for owning the payment rails" },
			marketCap: { label: "Market Cap", value: "$520B", explanation: "The total value of all the company's shares combined", culturalTranslation: "bigger than most banks without the risk" },
			revenueGrowth: { label: "Revenue Growth", value: "11%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "grows with every new card swipe" },
			profitMargin: { label: "Profit Margin", value: "52%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "literally printing money—52 cents on every dollar" },
			beta: { label: "Beta", value: "1.0", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "stable as the toll booth it is" },
			dividendYield: { label: "Dividend Yield", value: "0.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest payouts, they reinvest the rest" },
		},
		news: [
			{ headline: "Visa cross-border volumes surge", source: "Bloomberg", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Crypto partnerships expand", source: "Reuters", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Tap-to-pay adoption accelerates", source: "CNBC", timestamp: "4 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "ma",
		ticker: "MA",
		name: "Mastercard",
		bio: "Visa's slightly cooler twin with better marketing",
		heroImage: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=500&fit=crop",
		personalityDescription: "Forever second place but owns it",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 90, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Mastercard is the Premium Alternative",
			sections: [
				{ heading: "The Avis of Payments", content: "Mastercard is #2 to Visa but they try harder. Remember those 'Priceless' commercials? Iconic. They run the same toll booth business model but with slightly better branding. Smaller network but premium vibes. It's like choosing Pepsi over Coke—functionally the same but you feel different about it." },
				{ heading: "Innovation Through Competition", content: "Being second means Mastercard has to innovate to survive. They were early on crypto cards, AI fraud detection, and biometric payments. When Visa does something boring, Mastercard does it with flair. Competition breeds excellence, and Mastercard is the proof." },
				{ heading: "Why It Matters", content: "Duopoly is better than monopoly—barely. Mastercard keeps Visa honest and vice versa. Both profit from cashless society, but Mastercard plays the underdog card while making billions. They're everywhere Visa is, just with red circles instead of blue. Network effects remain undefeated." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "35", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "slightly pricier than Visa, marketing costs money" },
			marketCap: { label: "Market Cap", value: "$390B", explanation: "The total value of all the company's shares combined", culturalTranslation: "smaller but still absolutely massive" },
			revenueGrowth: { label: "Revenue Growth", value: "13%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing faster than Visa, scrappy energy pays off" },
			profitMargin: { label: "Profit Margin", value: "46%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "almost as profitable as Visa, still incredible" },
			beta: { label: "Beta", value: "1.1", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "slightly more volatile than Visa but basically the same" },
			dividendYield: { label: "Dividend Yield", value: "0.6%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield, focused on growth instead" },
		},
		news: [
			{ headline: "Mastercard AI fraud detection upgrade", source: "TechCrunch", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "European transaction volumes strong", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Contactless payment milestone reached", source: "Reuters", timestamp: "3 days ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "sq",
		ticker: "SQ",
		name: "Block",
		bio: "when Jack Dorsey left Twitter to focus on Bitcoin",
		heroImage: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&h=500&fit=crop",
		personalityDescription: "The friend who rebranded after their breakup",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 65, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 82, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Block is Having an Identity Crisis",
			sections: [
				{ heading: "The Everything Fintech App", content: "Block (formerly Square) wants to be your payment processor, your bank, your Bitcoin wallet, and your economic philosophy all at once. Square reader for coffee shops, Cash App for splitting brunch, Bitcoin for when Jack Dorsey tweets about decentralization at 3am. They're doing too much but somehow it works." },
				{ heading: "Cash App Supremacy", content: "Cash App is basically Gen Z's bank account. Send money with a cashtag, buy Bitcoin with birthday money, get your paycheck two days early. It's Venmo's cooler, more chaotic sibling. The app that normalized posting your payment handle in your bio. Also, somehow they make money on this?" },
				{ heading: "Why It Matters", content: "Block represents fintech's maximalist approach—why pick one business model when you can do five? They democratized card readers for small businesses, made P2P payments a cultural staple, and bet big on Bitcoin before it was trendy again. Jack Dorsey's vision or beautiful chaos? Both." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "not profitable yet, still figuring it out" },
			marketCap: { label: "Market Cap", value: "$45B", explanation: "The total value of all the company's shares combined", culturalTranslation: "smaller than payment giants but punches up" },
			revenueGrowth: { label: "Revenue Growth", value: "24%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing fast from Cash App and crypto" },
			profitMargin: { label: "Profit Margin", value: "-2%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "barely losing money, almost profitable vibes" },
			beta: { label: "Beta", value: "2.3", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "swings wildly with Bitcoin and fintech sentiment" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "lol Jack's too busy tweeting about Web3" },
		},
		news: [
			{ headline: "Cash App Bitcoin revenue surges", source: "Bloomberg", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Square merchant adoption grows", source: "TechCrunch", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Profitability timeline questioned", source: "WSJ", timestamp: "1 week ago", sentiment: "Bearish", url: "#" },
		],
	},
	{
		id: "hood",
		ticker: "HOOD",
		name: "Robinhood",
		bio: "turned your timeline into a stock ticker during GameStop",
		heroImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop",
		personalityDescription: "r/wallstreetbets in app form",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 95, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 88, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Robinhood Made Investing a Meme",
			sections: [
				{ heading: "The Gamification Controversy", content: "Robinhood made trading free and added confetti when you buy stocks. They turned investing into a mobile game with real consequences. Millions of people YOLOing into meme stocks, buying fractional shares with lunch money, panic-selling at 3am. The app that made 'stonks only go up' a lifestyle. Revolutionary or reckless? Yes." },
				{ heading: "GameStop Changed Everything", content: "Remember when Reddit broke Wall Street and Robinhood had to halt buying GME? That was their villain origin story. Congressional hearings, lawsuits, memes for days. They went from fintech darling to public enemy #1 in 48 hours. The chaos was legendary. Also they IPO'd right after like nothing happened." },
				{ heading: "Why It Matters", content: "Robinhood democratized trading but also democratized losing money. They brought millions of Gen Z into the market, made commission-free the standard, and proved retail investors could move markets. Whether that's good or bad depends on your portfolio. Either way, investing will never be the same." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "finally profitable after years of chaos" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "smaller than expected after the hype cycle" },
			revenueGrowth: { label: "Revenue Growth", value: "35%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "crypto trading keeping them alive" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "payment for order flow prints money apparently" },
			beta: { label: "Beta", value: "2.5", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "as volatile as the meme stocks it enables" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "imagine Robinhood paying dividends lmao" },
		},
		news: [
			{ headline: "Robinhood crypto trading surges", source: "CNBC", timestamp: "5 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "New retirement account features launch", source: "Bloomberg", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Regulatory scrutiny continues", source: "WSJ", timestamp: "5 days ago", sentiment: "Bearish", url: "#" },
		],
	},
	{
		id: "sofi",
		ticker: "SOFI",
		name: "SoFi",
		bio: "bought a football stadium before figuring out profits",
		heroImage: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=500&fit=crop",
		personalityDescription: "The app that wants to replace your entire bank",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why SoFi Wants to Do Everything Finance",
			sections: [
				{ heading: "The Everything Finance App", content: "SoFi started refinancing student loans for broke millennials and decided to become your bank, your broker, your crypto wallet, and your credit card all at once. Checking accounts, investing, personal loans, even crypto—they're trying to be a one-stop financial shop. The audacity to name a stadium after yourself before turning a profit? Iconic." },
				{ heading: "Banking Charter Flex", content: "SoFi fought for years to get a banking charter and finally got it. That unlocked lending at scale without middlemen. Now they can offer higher savings rates and actually make money on deposits. It's the fintech dream: act like a bank, look like a tech company, hope investors care more about growth than profits." },
				{ heading: "Why It Matters", content: "SoFi represents the millennial/Gen Z rejection of traditional banking. No branches, no fees (mostly), everything in an app. They're betting young people want financial services bundled together instead of spread across 5 different institutions. Also that stadium naming deal was either genius marketing or peak hubris—we'll find out." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "not profitable yet, stadium's expensive" },
			marketCap: { label: "Market Cap", value: "$8B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-tier fintech with big dreams" },
			revenueGrowth: { label: "Revenue Growth", value: "38%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing fast from adding more products" },
			profitMargin: { label: "Profit Margin", value: "-8%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "still burning cash to acquire users" },
			beta: { label: "Beta", value: "2.2", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile fintech rollercoaster" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "lol no, they need every penny" },
		},
		news: [
			{ headline: "SoFi member growth beats estimates", source: "Bloomberg", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Banking charter boosts lending", source: "Reuters", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Student loan pause impact discussed", source: "CNBC", timestamp: "4 days ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "afrm",
		ticker: "AFRM",
		name: "Affirm",
		bio: "financing your impulse purchases guilt-free since 2012",
		heroImage: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=500&fit=crop",
		personalityDescription: "That friend who splits everything into payments",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 60, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Affirm Made Debt Feel Trendy",
			sections: [
				{ heading: "Buy Now, Stress Later", content: "Affirm pioneered the 'Pay in 4' vibes that are now everywhere. See those shoes you can't afford? Just split it into installments! It's not a credit card, it's a ~payment plan~. They made financing feel responsible by being transparent about fees (or lack thereof). Genius marketing: repackaging debt as financial wellness." },
				{ heading: "Checkout Ubiquity", content: "Affirm is at every online checkout now. Amazon, Shopify, Target—they're embedded in e-commerce like cookies in Safari. Gen Z would rather do 4 payments of $50 than drop $200 at once, even if they have the money. It's a vibe thing. Monthly budget > lump sum trauma." },
				{ heading: "Why It Matters", content: "Affirm changed how young people think about credit. Traditional credit cards feel sketchy, but installment plans feel smart. They partnered with everyone from Peloton to Apple, normalizing financing for literally everything. The future of consumer debt is interest-free split payments and pastel app design." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "no profits yet, just growth and partnerships" },
			marketCap: { label: "Market Cap", value: "$12B", explanation: "The total value of all the company's shares combined", culturalTranslation: "biggest BNPL player that isn't PayPal" },
			revenueGrowth: { label: "Revenue Growth", value: "48%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "exploding as everyone finances everything" },
			profitMargin: { label: "Profit Margin", value: "-15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "losing money to gain market share—classic startup move" },
			beta: { label: "Beta", value: "2.7", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "more volatile than your budgeting discipline" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "they can barely pay themselves rn" },
		},
		news: [
			{ headline: "Affirm Amazon partnership expands", source: "TechCrunch", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "BNPL regulation concerns grow", source: "WSJ", timestamp: "1 day ago", sentiment: "Bearish", url: "#" },
			{ headline: "Delinquency rates remain low", source: "Bloomberg", timestamp: "3 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "txn",
		ticker: "TXN",
		name: "Texas Instruments",
		bio: "the TI-84 brand that also makes chips for everything",
		heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=500&fit=crop",
		personalityDescription: "Your high school calculator maker is a chip powerhouse",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why TI is Boring Rich",
			sections: [
				{ heading: "Calculator Nostalgia Meets Chip Empire", content: "Everyone knows Texas Instruments from that mandatory $120 graphing calculator that did way less than your phone. Plot twist: they make billions from analog chips in cars, factories, and household electronics. While NVIDIA gets the AI hype, TI quietly sells the unsexy chips that actually run daily life. Boring? Yes. Profitable? Absolutely." },
				{ heading: "Analog Over Artificial", content: "TI dominates analog semiconductors—the chips that convert real-world signals (temperature, sound, motion) into digital data. Not flashy, but essential. Every EV, industrial robot, and smart thermostat needs analog chips. It's infrastructure, not innovation, and the margins are chef's kiss." },
				{ heading: "Why It Matters", content: "Texas Instruments is proof you don't need hype to print money. They're the anti-NVIDIA: steady growth, huge dividends, zero drama. While tech bros obsess over AI chips, TI sells to boring industries that actually pay their bills. It's giving dividend aristocrat energy with calculator street cred." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair price for reliable boring profits" },
			marketCap: { label: "Market Cap", value: "$165B", explanation: "The total value of all the company's shares combined", culturalTranslation: "bigger than you'd expect from calculator nostalgia" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow and steady wins the dividend race" },
			profitMargin: { label: "Profit Margin", value: "42%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "insane margins for selling invisible components" },
			beta: { label: "Beta", value: "1.0", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "stable as your old TI-84" },
			dividendYield: { label: "Dividend Yield", value: "3.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid passive income for patient investors" },
		},
		news: [
			{ headline: "TI automotive chip demand strong", source: "Bloomberg", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "New fab construction progresses", source: "Reuters", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Industrial market softness noted", source: "CNBC", timestamp: "1 week ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "nxpi",
		ticker: "NXPI",
		name: "NXP Semiconductors",
		bio: "chips in your car's brain you didn't know existed",
		heroImage: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&h=500&fit=crop",
		personalityDescription: "The specialist nobody talks about but everyone needs",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 40, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why NXP Runs Every Car's Tech",
			sections: [
				{ heading: "Automotive Semiconductor King", content: "NXP makes the chips in your car's infotainment, keyless entry, radar systems, and battery management. You've never heard of them but they're in literally every modern vehicle. Tesla, BMW, Ford—they all buy from NXP. It's the ultimate 'if you know, you know' play. Cars becoming computers means NXP gets paid every single time." },
				{ heading: "The EV Goldmine", content: "Electric vehicles need way more chips than gas cars. Battery controllers, motor drivers, charging systems—NXP sells the whole package. As the world goes electric, NXP scales with it. They're not sexy like Tesla but they're essential infrastructure. Every EV mandate = more NXP revenue. Simple math." },
				{ heading: "Why It Matters", content: "Cars used to be mechanical. Now they're rolling datacenters with wheels. NXP positioned early in automotive chips and now owns the space. As autonomous driving scales, they profit even more. It's the boring way to bet on automotive tech without the Elon drama." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for automotive specialist" },
			marketCap: { label: "Market Cap", value: "$58B", explanation: "The total value of all the company's shares combined", culturalTranslation: "niche but massive in automotive chips" },
			revenueGrowth: { label: "Revenue Growth", value: "12%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing with EV adoption" },
			profitMargin: { label: "Profit Margin", value: "25%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from specialized chips" },
			beta: { label: "Beta", value: "1.5", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moves with auto industry cycles" },
			dividendYield: { label: "Dividend Yield", value: "2.1%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "decent yield for a chip company" },
		},
		news: [
			{ headline: "NXP EV chip orders accelerate", source: "Reuters", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Automotive revenue beats estimates", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "China market concerns persist", source: "WSJ", timestamp: "4 days ago", sentiment: "Bearish", url: "#" },
		],
	},
	{
		id: "mrvl",
		ticker: "MRVL",
		name: "Marvell",
		bio: "the unglamorous chips making cloud infrastructure actually work",
		heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=500&fit=crop",
		personalityDescription: "NVIDIA's less famous but equally important cousin",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 70, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Marvell is Cloud Infrastructure's Secret Weapon",
			sections: [
				{ heading: "The Plumbing Nobody Sees", content: "While NVIDIA gets all the AI glory, Marvell makes the chips that handle networking, storage, and data movement in cloud data centers. Not sexy, but essential. Every time you stream Netflix or upload to iCloud, Marvell chips are moving that data around. They're the infrastructure layer nobody thinks about but everyone depends on." },
				{ heading: "Custom Silicon for Big Tech", content: "Marvell designs custom chips for cloud giants like Google, Amazon, and Microsoft. Want your own specialized processors? Marvell will make them. It's like bespoke tailoring but for semiconductors. As hyperscalers build custom hardware to optimize costs, Marvell profits from that shift. Smart positioning." },
				{ heading: "Why It Matters", content: "Cloud computing needs more than just GPUs. You need chips to move data between servers, manage storage, and handle networking at ridiculous scale. Marvell owns these niches. As AI explodes and data centers multiply, Marvell rides that wave without the NVIDIA valuation premium. Underrated infrastructure play." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "38", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "priced for cloud infrastructure growth" },
			marketCap: { label: "Market Cap", value: "$55B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-sized but critical infrastructure play" },
			revenueGrowth: { label: "Revenue Growth", value: "22%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing fast from data center boom" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins for specialized chips" },
			beta: { label: "Beta", value: "1.6", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile semiconductor growth stock" },
			dividendYield: { label: "Dividend Yield", value: "0.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "basically nothing, reinvesting for growth" },
		},
		news: [
			{ headline: "Marvell AI accelerator chips gain traction", source: "TechCrunch", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Data center revenue surges", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Custom chip business expands", source: "Reuters", timestamp: "5 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "wmt",
		ticker: "WMT",
		name: "Walmart",
		bio: "where America bulk-buys everything at 2am",
		heroImage: "https://images.unsplash.com/photo-1601598851547-4302969d0614?w=800&h=500&fit=crop",
		personalityDescription: "The omnipresent retail empire you can't escape",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 40, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 60, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Walmart is Unstoppable",
			sections: [
				{ heading: "The Everything Store IRL", content: "Walmart is what happens when capitalism achieves full coverage. 4,700 US stores means you're never more than 10 miles from one. They sell groceries, guns, electronics, and prescription meds under the same fluorescent lights. It's America's living room, supply closet, and pharmacy combined. Love it or hate it, you've definitely been there this month." },
				{ heading: "Supply Chain Wizardry", content: "Walmart's logistics are so good it's scary. They move products from factories in China to shelves in Nebraska faster and cheaper than anyone. Their data systems track every sale in real-time across thousands of stores. It's Big Brother meets retail efficiency. Amazon who? Walmart's been doing this since before the internet existed." },
				{ heading: "Why It Matters", content: "Walmart is the largest private employer in America. They set the floor for wages, influence food prices, and basically control rural retail. Their business model—rock-bottom prices through massive scale—changed how America shops. Plus they're finally taking e-commerce seriously with Walmart+. The giant is adapting." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium valuation for retail domination" },
			marketCap: { label: "Market Cap", value: "$480B", explanation: "The total value of all the company's shares combined", culturalTranslation: "bigger than most countries' entire economies" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth but absurd scale makes it massive" },
			profitMargin: { label: "Profit Margin", value: "3%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "razor-thin margins, makes it up in volume" },
			beta: { label: "Beta", value: "0.6", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "boring stable—people always need groceries" },
			dividendYield: { label: "Dividend Yield", value: "1.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "steady dividend from steady business" },
		},
		news: [
			{ headline: "Walmart+ membership growth accelerates", source: "Bloomberg", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "E-commerce sales beat estimates", source: "CNBC", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Store remodels continue nationwide", source: "Reuters", timestamp: "5 days ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "tgt",
		ticker: "TGT",
		name: "Target",
		bio: "went in for milk, left with $200 of things you didn't need",
		heroImage: "https://images.unsplash.com/photo-1596003906949-67221c37965c?w=800&h=500&fit=crop",
		personalityDescription: "Walmart's Instagram-worthy cousin",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Target is a Lifestyle Brand Disguised as Retail",
			sections: [
				{ heading: "The $200 Cart Phenomenon", content: "Nobody goes to Target for what they came for. You need paper towels and somehow leave with candles, throw pillows, and a new outfit. It's the Target Run™—a cultural ritual where impulse purchases feel justified because everything is 'on sale' and aesthetically pleasing. The red bullseye is a portal to financial irresponsibility." },
				{ heading: "Affordable Bougie Energy", content: "Target mastered the art of making cheap feel chic. Designer collabs with Lilly Pulitzer and Target-exclusive brands create the illusion of luxury at Walmart prices. Clean aisles, decent lighting, Starbucks inside—it's retail therapy that doesn't completely destroy your credit score. Suburban moms and Gen Z alike worship here." },
				{ heading: "Why It Matters", content: "Target proved retail could have a personality. They're not the cheapest (that's Walmart) or the fanciest (that's Nordstrom), but they nailed the sweet spot of aspirational affordability. Their private label brands compete with name brands, and people actually prefer them. That's brand power." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for suburban retail dominance" },
			marketCap: { label: "Market Cap", value: "$68B", explanation: "The total value of all the company's shares combined", culturalTranslation: "smaller than Walmart but still huge" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth, mature business" },
			profitMargin: { label: "Profit Margin", value: "4%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin retail margins but consistent" },
			beta: { label: "Beta", value: "0.9", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "stable consumer staples play" },
			dividendYield: { label: "Dividend Yield", value: "3.1%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend for patient investors" },
		},
		news: [
			{ headline: "Target same-store sales beat expectations", source: "WSJ", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "New private label brands launched", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Inventory management improving", source: "Reuters", timestamp: "3 days ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "cost",
		ticker: "COST",
		name: "Costco",
		bio: "pay $60 to buy 48 rolls of toilet paper you don't need",
		heroImage: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=500&fit=crop",
		personalityDescription: "The cult that charges membership fees",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 78, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Costco is a Religion",
			sections: [
				{ heading: "The Membership Flex", content: "Costco charges you $60/year for the privilege of shopping there and somehow makes you feel grateful. It's genius: they make profit from memberships, sell everything at cost, and customers feel like they're in an exclusive club. The $1.50 hot dog combo hasn't changed price since 1985—legend says they'll never raise it or face riots." },
				{ heading: "Bulk Buying as Identity", content: "Going to Costco is an event. Free samples on weekends, giant carts, buying mayonnaise by the gallon. You came for batteries and left with a kayak. People legitimately love this place—90% membership renewal rates don't lie. It's giving community center meets warehouse meets treasure hunt energy." },
				{ heading: "Why It Matters", content: "Costco's business model is different: low markup, high volume, treat employees well, profit from memberships. It's ethical capitalism that actually works. Warren Buffett's favorite retailer. They proved you don't need to exploit workers to make money. Plus that rotisserie chicken for $4.99? Loss leader perfection." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "42", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium valuation for cult-level loyalty" },
			marketCap: { label: "Market Cap", value: "$340B", explanation: "The total value of all the company's shares combined", culturalTranslation: "warehouse club empire" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from memberships and bulk sales" },
			profitMargin: { label: "Profit Margin", value: "3%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "low margins on products, high margins on memberships" },
			beta: { label: "Beta", value: "0.7", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive stock—recessions mean more bulk buying" },
			dividendYield: { label: "Dividend Yield", value: "0.6%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small regular dividend plus occasional special dividends" },
		},
		news: [
			{ headline: "Costco membership renewal rate hits record", source: "Bloomberg", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "International expansion continues", source: "WSJ", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "E-commerce growth strong", source: "CNBC", timestamp: "1 week ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "hd",
		ticker: "HD",
		name: "Home Depot",
		bio: "where dads disappear for 3 hours buying one screw",
		heroImage: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=500&fit=crop",
		personalityDescription: "The orange apron temple of home ownership",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Home Depot is Essential Infrastructure",
			sections: [
				{ heading: "DIY Culture Enabler", content: "Home Depot turned home improvement from 'call a professional' to 'YouTube it and hope for the best.' They sell the dream that you can renovate your kitchen yourself (you probably can't). Pandemic turned everyone into amateur contractors and Home Depot stock went brrrr. Weekend warriors and actual pros shop here—democracy in lumber form." },
				{ heading: "The Housing Market Indicator", content: "Home Depot's stock basically tracks housing. New homes = new projects = new sales. Renovations, landscaping, emergency repairs—they capture all of it. Every housing boom means more orange aprons ringing up power tools. It's the ultimate play on American homeownership culture without the risk of actually owning real estate." },
				{ heading: "Why It Matters", content: "Home Depot represents the 'American Dream' of homeownership at commercial scale. They made home improvement accessible to regular people, not just contractors. Their business model—massive selection, competitive prices, expert staff—changed retail. Plus they pay solid dividends, making them a boomer portfolio staple with actual fundamentals." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "24", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for home improvement leader" },
			marketCap: { label: "Market Cap", value: "$380B", explanation: "The total value of all the company's shares combined", culturalTranslation: "bigger than most construction companies combined" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "grows when housing is hot" },
			profitMargin: { label: "Profit Margin", value: "11%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins for retail, better than groceries" },
			beta: { label: "Beta", value: "1.0", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moves with market and housing trends" },
			dividendYield: { label: "Dividend Yield", value: "2.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reliable dividend for income investors" },
		},
		news: [
			{ headline: "Home Depot pro customer sales surge", source: "CNBC", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "DIY trends remain elevated", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Supply chain improvements noted", source: "WSJ", timestamp: "4 days ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "low",
		ticker: "LOW",
		name: "Lowe's",
		bio: "Home Depot's friendlier blue apron twin",
		heroImage: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&h=500&fit=crop",
		personalityDescription: "The slightly less chaotic hardware warehouse",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 60, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Lowe's is Home Depot's Polite Sibling",
			sections: [
				{
					heading: "The Pepsi to Home Depot's Coke",
					content:
						"Lowe's does everything Home Depot does but with slightly better vibes. Blue aprons instead of orange, cleaner aisles, more focus on actual DIYers vs hardcore contractors. They're giving 'we actually want to help you' energy while Home Depot speedruns your checkout. Same lumber, different aesthetic.",
				},
				{
					heading: "Suburban Mom Approved",
					content:
						"While Home Depot attracts contractors at 6am, Lowe's caters to weekend warriors who watched one YouTube tutorial and think they can tile a bathroom. Better lighting, more approachable staff, appliance showrooms that don't feel like warehouses. It's hardware shopping for people who shower before going to the store.",
				},
				{
					heading: "Why It Matters",
					content:
						"Lowe's proves the home improvement market is big enough for two giants. Competition keeps prices competitive and service decent. They're especially strong in the South and suburbs where DIY culture thrives. Not as iconic as Home Depot, but profitable enough to keep renovating America one poorly installed shelf at a time.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "20", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair price for second place" },
			marketCap: { label: "Market Cap", value: "$155B", explanation: "The total value of all the company's shares combined", culturalTranslation: "smaller than Home Depot but still massive" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from DIY trends" },
			profitMargin: { label: "Profit Margin", value: "9%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid retail margins" },
			beta: { label: "Beta", value: "1.1", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moves with housing market" },
			dividendYield: { label: "Dividend Yield", value: "2.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reliable income for shareholders" },
		},
		news: [
			{ headline: "Lowe's omnichannel strategy shows results", source: "Reuters", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Store renovations complete", source: "Bloomberg", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Market share gains in DIY", source: "WSJ", timestamp: "1 week ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "mcd",
		ticker: "MCD",
		name: "McDonald's",
		bio: "always broken ice cream machine, never broken profits",
		heroImage: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=500&fit=crop",
		personalityDescription: "American cultural export disguised as burgers",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 95, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why the Golden Arches are Literally Everywhere",
			sections: [
				{ heading: "Globalization in Fast Food Form", content: "McDonald's is in 100+ countries serving billions annually. Those golden arches are more recognizable than most government logos. They didn't just sell burgers—they exported American culture, standardized menus, and 3am drunk food runs to the entire planet. You can get a Big Mac in Tokyo, Paris, or rural Montana. That's power." },
				{ heading: "The Ice Cream Machine Conspiracy", content: "The McFlurry machine is always broken. Always. It's become a meme, a cultural phenomenon, a rite of passage. Some say it's poor maintenance, others say it's a scam. Either way, McDonald's keeps printing money while disappointing late-night ice cream cravings. The audacity." },
				{ heading: "Why It Matters", content: "McDonald's isn't just fast food—it's a real estate empire disguised as a restaurant chain. They own the land under most franchises and collect rent. Franchise model means low risk, high margins. Recession-proof because cheap food always sells. Dividend aristocrat paying shareholders for decades. The golden arches print money in any economy." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "25", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for global fast food dominance" },
			marketCap: { label: "Market Cap", value: "$215B", explanation: "The total value of all the company's shares combined", culturalTranslation: "bigger than most restaurant chains combined" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from international expansion and delivery" },
			profitMargin: { label: "Profit Margin", value: "32%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "franchise model = insane margins" },
			beta: { label: "Beta", value: "0.7", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive—people eat cheap in recessions" },
			dividendYield: { label: "Dividend Yield", value: "2.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reliable dividend aristocrat status" },
		},
		news: [
			{ headline: "McDonald's digital sales hit $20B globally", source: "Bloomberg", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Value menu revamp drives traffic", source: "CNBC", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "International expansion continues", source: "WSJ", timestamp: "5 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "ko",
		ticker: "KO",
		name: "Coca-Cola",
		bio: "selling sugar water & nostalgia since before your grandparents",
		heroImage: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&h=500&fit=crop",
		personalityDescription: "Warren Buffett's favorite dividend machine",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 98, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why That Red Logo Owns the Planet",
			sections: [
				{ heading: "Brand Recognition on Steroids", content: "Coca-Cola's logo is more recognizable than most country flags. That red and white script, that exact flavor—it's pure bottled nostalgia. They're not selling soda, they're selling happiness, childhood memories, and Americana. The marketing is so good people literally feel emotions about carbonated sugar water. Legendary." },
				{ heading: "The Distribution Empire", content: "Coke is available in over 200 countries. You can buy it in remote villages and luxury hotels alike. Their distribution network is so good the US military studied it. They don't make the bottles—they franchise it. Low capital, high margin, infinite scale. It's capitalism's greatest hits." },
				{ heading: "Why It Matters", content: "Coca-Cola represents peak brand power. Warren Buffett's been holding it since forever for a reason—consistent dividends, recession-proof demand, and zero competition for that exact taste. Health trends? They own Vitamin Water. Sustainability concerns? They're working on it (slowly). The polar bears in Christmas ads do heavy lifting. Timeless business model." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for legendary brand power" },
			marketCap: { label: "Market Cap", value: "$285B", explanation: "The total value of all the company's shares combined", culturalTranslation: "bigger than most beverage industries combined" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow steady growth from global expansion" },
			profitMargin: { label: "Profit Margin", value: "24%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "incredible margins for selling flavored water" },
			beta: { label: "Beta", value: "0.6", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "ultra defensive—people drink Coke in recessions" },
			dividendYield: { label: "Dividend Yield", value: "3.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "dividend king, pays shareholders forever" },
		},
		news: [
			{ headline: "Coca-Cola zero sugar drives growth", source: "Reuters", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Emerging markets sales strong", source: "Bloomberg", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Sustainability initiatives expand", source: "CNBC", timestamp: "1 week ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "pep",
		ticker: "PEP",
		name: "PepsiCo",
		bio: "snacks & drinks empire",
		heroImage: "https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=800&h=500&fit=crop",
		personalityDescription: "Coke's snack-focused rival",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 92, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 70, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Pepsi is More Than Soda",
			sections: [
				{ heading: "Snack Dominance", content: "Pepsi isn't just soda—they own Frito-Lay, Gatorade, Quaker. Doritos and Mountain Dew in one company. Snacks are more profitable than beverages." },
				{ heading: "Why It Matters", content: "Pepsi diversified beyond cola wars. They're less dependent on soda trends. Snacks and sports drinks hedge the portfolio." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "24", explanation: "Price-to-Earnings ratio", culturalTranslation: "diversified premium" },
			marketCap: { label: "Market Cap", value: "$225B", explanation: "Total company value", culturalTranslation: "snack & beverage giant" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "Year-over-year growth", culturalTranslation: "snacks driving growth" },
			profitMargin: { label: "Profit Margin", value: "11%", explanation: "Profit percentage", culturalTranslation: "solid margins" },
			beta: { label: "Beta", value: "0.6", explanation: "Volatility measure", culturalTranslation: "defensive consumer" },
			dividendYield: { label: "Dividend Yield", value: "2.7%", explanation: "Annual dividend payout", culturalTranslation: "reliable dividend" },
		},
		news: [
			{ headline: "PepsiCo Frito-Lay revenue beats estimates", source: "Bloomberg", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Gatorade market share gains", source: "CNBC", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "International snacks expansion", source: "WSJ", timestamp: "4 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "pg",
		ticker: "PG",
		name: "Procter & Gamble",
		bio: "Tide, Pampers, Gillette—they own your entire routine",
		heroImage: "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=800&h=500&fit=crop",
		personalityDescription: "Boring brands that print money forever",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 90, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 20, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why P&G is in Every Room of Your House",
			sections: [
				{ heading: "The Brand Portfolio Infinity Gauntlet", content: "P&G owns 65+ brands you use daily: Tide laundry detergent, Pampers diapers, Gillette razors, Crest toothpaste, Febreze, Dawn dish soap, Downy, Head & Shoulders—they're EVERYWHERE. You can't go 24 hours without touching a P&G product. That's brand domination on a civilizational scale. Boring? Yes. Profitable? Absolutely." },
				{ heading: "Recession-Proof Essential Goods", content: "People always need toothpaste, diapers, and laundry detergent. Economic crash? Still gotta brush teeth. P&G sells necessities, not luxuries. Their business model is selling cheap essentials at massive scale with brand loyalty so strong people don't even consider alternatives. It's the ultimate defensive stock—zero drama, consistent cash flow." },
				{ heading: "Why It Matters", content: "P&G is a dividend aristocrat that's paid shareholders for 60+ straight years. They own consumer staples so essential that switching brands feels weird. It's giving old money stability with zero volatility. Warren Buffett energy. The stock your grandparents bought and forgot about, now worth 10x." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "27", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for owning everyone's bathroom" },
			marketCap: { label: "Market Cap", value: "$400B", explanation: "The total value of all the company's shares combined", culturalTranslation: "bigger than most countries' consumer goods industries" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow steady growth, mature business" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "brand loyalty = pricing power = margins" },
			beta: { label: "Beta", value: "0.4", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "ultra defensive—boring is beautiful" },
			dividendYield: { label: "Dividend Yield", value: "2.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "dividend king—65+ years straight payouts" },
		},
		news: [
			{ headline: "P&G premium products drive margins", source: "WSJ", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Emerging market growth accelerates", source: "Bloomberg", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Sustainability targets raised", source: "Reuters", timestamp: "1 week ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "jnj",
		ticker: "JNJ",
		name: "Johnson & Johnson",
		bio: "Band-Aids in your cabinet, lawsuits in the news",
		heroImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop",
		personalityDescription: "Healthcare empire with a complicated past",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 93, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 60, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why J&J is Healthcare's Complicated Giant",
			sections: [
				{ heading: "The Everything Healthcare Company", content: "J&J does it all: Band-Aids and baby shampoo (consumer), cancer drugs and biologics (pharma), surgical tools and hip implants (medical devices). Three massive businesses under one roof. They're in your medicine cabinet, operating rooms, and pharmacy. Diversification on steroids. Aging populations = more J&J products needed. Simple math." },
				{ heading: "Dividend King Energy", content: "J&J has raised dividends for 60+ consecutive years. They're a dividend aristocrat—the ultimate safe haven stock. Recessions happen, J&J still pays. People always need healthcare. It's the definition of defensive investing. Your boomer relatives probably own shares and collect checks quarterly like clockwork." },
				{ heading: "Why It Matters (Despite the Drama)", content: "J&J is healthcare royalty but not without controversy—talc lawsuits, opioid settlements, regulatory issues. Still, they print money because people need medicine and medical devices regardless of legal drama. They're spinning off consumer health to focus on high-margin pharma. Strategic, if messy. Healthcare spending only goes up." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "20", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair premium for diversified healthcare" },
			marketCap: { label: "Market Cap", value: "$385B", explanation: "The total value of all the company's shares combined", culturalTranslation: "one of the biggest healthcare companies period" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from aging populations" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "pharma margins carrying the business" },
			beta: { label: "Beta", value: "0.6", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive healthcare stock, low volatility" },
			dividendYield: { label: "Dividend Yield", value: "3.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "dividend king—61+ years of increases" },
		},
		news: [
			{ headline: "J&J pharma pipeline shows promise", source: "Bloomberg", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Talc lawsuit settlement negotiations", source: "WSJ", timestamp: "1 day ago", sentiment: "Neutral", url: "#" },
			{ headline: "Medical devices revenue strong", source: "CNBC", timestamp: "3 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "lmt",
		ticker: "LMT",
		name: "Lockheed Martin",
		bio: "billion-dollar fighter jets your tax dollars bought",
		heroImage: "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800&h=500&fit=crop",
		personalityDescription: "The military-industrial complex's final boss",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 70, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 60, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Lockheed Martin Gets All the Government Money",
			sections: [
				{
					heading: "The Classified Everything Company",
					content:
						"Lockheed makes F-35 fighter jets that cost more than some countries' GDP, missile defense systems, satellites, and stuff so classified even they can't talk about it. They're the Pentagon's favorite contractor. When the government needs to blow things up precisely or spy from space, Lockheed gets the call and the blank check.",
				},
				{
					heading: "Geopolitical Drama = Job Security",
					content:
						"Every global conflict means more defense spending. Every threat assessment means new contracts. Lockheed doesn't need marketing—they have lobbyists and geopolitics. It's controversial but profitable. They're literally too important to national security to fail. The ultimate recession-proof business model: war never goes out of style.",
				},
				{
					heading: "Why It Matters",
					content:
						"Lockheed represents America's defense spending in corporate form. Love it or hate it, they build the tech that keeps air superiority and military dominance intact. F-35 program alone is a multi-decade trillion-dollar commitment. They're basically guaranteed revenue from taxpayers for generations. Ethical questions? Many. Profits? Consistent.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for guaranteed government contracts" },
			marketCap: { label: "Market Cap", value: "$125B", explanation: "The total value of all the company's shares combined", culturalTranslation: "defense contractor empire" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady from multi-year defense budgets" },
			profitMargin: { label: "Profit Margin", value: "11%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "government contract margins, predictable but capped" },
			beta: { label: "Beta", value: "0.7", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive stock—ironically stable" },
			dividendYield: { label: "Dividend Yield", value: "2.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "consistent payouts from defense budgets" },
		},
		news: [
			{ headline: "Lockheed F-35 orders increase", source: "Bloomberg", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Hypersonic missile contract awarded", source: "WSJ", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "International sales expand", source: "Reuters", timestamp: "4 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "ba",
		ticker: "BA",
		name: "Boeing",
		bio: "aerospace legacy trying to rebuild trust one inspection at a time",
		heroImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=500&fit=crop",
		personalityDescription: "The comeback kid with serious baggage",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 90, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Boeing Can't Escape Its Past",
			sections: [
				{
					heading: "Fall From Grace",
					content:
						"Boeing used to be the gold standard of aerospace. Then the 737 MAX crashes happened, doors fell off mid-flight, whistleblowers started talking, and suddenly everyone's checking which plane they're boarding. They went from 'if it's not Boeing I'm not going' to 'please God let it not be Boeing.' The vibes are off and the internet won't let them forget.",
				},
				{
					heading: "Too Big to Fail, Too Broken to Thrive",
					content:
						"Here's the thing: Boeing and Airbus are basically a duopoly. Airlines literally have no other choice for large commercial jets. So despite the drama, the quality control issues, the Congressional hearings—Boeing still gets orders. It's the aerospace equivalent of staying in a toxic relationship because the alternatives are worse. They're working on fixing things, but trust is hard to rebuild.",
				},
				{
					heading: "Why It Matters",
					content:
						"Boeing represents American aerospace and defense manufacturing. Beyond commercial planes, they make military aircraft, satellites, and space systems. The turnaround story is ongoing—will new leadership and quality improvements restore their reputation, or will problems keep surfacing? High risk, high reward for investors willing to bet on redemption.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "no profits yet, pure turnaround speculation" },
			marketCap: { label: "Market Cap", value: "$110B", explanation: "The total value of all the company's shares combined", culturalTranslation: "still massive despite everything" },
			revenueGrowth: { label: "Revenue Growth", value: "15%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "recovering as deliveries ramp back up" },
			profitMargin: { label: "Profit Margin", value: "-5%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "still losing money fixing problems" },
			beta: { label: "Beta", value: "1.5", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile as headlines keep coming" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "suspended dividends during the crisis" },
		},
		news: [
			{ headline: "Boeing 737 MAX deliveries accelerate", source: "CNBC", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Quality control improvements ongoing", source: "WSJ", timestamp: "1 day ago", sentiment: "Neutral", url: "#" },
			{ headline: "Defense contracts provide stability", source: "Bloomberg", timestamp: "5 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "unh",
		ticker: "UNH",
		name: "UnitedHealth",
		bio: "controls your insurance AND your doctor's paycheck",
		heroImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop",
		personalityDescription: "The healthcare monopoly everyone loves to hate",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 75, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 50, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why UnitedHealth Owns American Healthcare",
			sections: [
				{
					heading: "The Everything Healthcare Company",
					content:
						"UnitedHealth does insurance through UnitedHealthcare AND owns Optum which provides care, manages pharmacy benefits, and processes claims. They're the insurer, the provider, the middleman, and the pharmacy benefits manager all at once. It's vertical integration on steroids—they control both sides of every transaction. When your doctor and your insurance company are owned by the same entity, that's power.",
				},
				{
					heading: "Too Big to Understand",
					content:
						"UnitedHealth is so massive and complicated that most people don't realize how much of healthcare they control. Prescription coverage? OptumRx. Doctor networks? Optum Care. Data analytics? Optum Insight. They're in 50 million Americans' medical lives whether they know it or not. It's giving monopoly vibes but with regulatory approval.",
				},
				{
					heading: "Why It Matters",
					content:
						"UnitedHealth represents healthcare consolidation at its peak. They're profitable because they control costs by owning the entire chain. Controversial? Absolutely. Effective at making money? Undeniable. Aging boomers, chronic disease management, Medicare Advantage growth—all tailwinds for their business model. The stock is boring, stable, and prints money from America's healthcare dysfunction.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for healthcare dominance" },
			marketCap: { label: "Market Cap", value: "$520B", explanation: "The total value of all the company's shares combined", culturalTranslation: "bigger than most pharmaceutical companies" },
			revenueGrowth: { label: "Revenue Growth", value: "14%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing as they acquire more of healthcare" },
			profitMargin: { label: "Profit Margin", value: "6%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin margins but absurd scale makes billions" },
			beta: { label: "Beta", value: "0.7", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive—people always need healthcare" },
			dividendYield: { label: "Dividend Yield", value: "1.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "growing dividend as profits compound" },
		},
		news: [
			{ headline: "UnitedHealth Optum growth accelerates", source: "Bloomberg", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Medicare Advantage enrollment strong", source: "WSJ", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Regulatory scrutiny continues", source: "CNBC", timestamp: "1 week ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "crm",
		ticker: "CRM",
		name: "Salesforce",
		bio: "the CRM software every sales team complains about using",
		heroImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop",
		personalityDescription: "Marc Benioff's cloud empire built on subscriptions",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Salesforce Runs Every Sales Floor",
			sections: [
				{
					heading: "The CRM That Took Over",
					content:
						"Salesforce pioneered cloud CRM before 'the cloud' was even a thing people understood. Now every company uses it to track leads, manage pipelines, and torture sales reps with data entry. They bought Slack, Tableau, MuleSoft—Marc Benioff's strategy is basically 'acquire everything enterprise needs and bundle it.' It's ecosystem lock-in disguised as productivity software.",
				},
				{
					heading: "Subscription Addiction",
					content:
						"Salesforce invented the SaaS subscription model that every tech company now copies. Pay monthly forever, get locked into their platform, buy more modules as you scale. It's brilliant and infuriating. Companies spend millions on Salesforce implementations, hire consultants to configure it, then can't leave because migration would cost even more. That's moat-building 101.",
				},
				{
					heading: "Why It Matters",
					content:
						"Salesforce represents enterprise software's shift to cloud subscriptions. They proved you could charge companies monthly fees forever and call it innovation. Now they're adding AI features with Einstein and Agentforce, staying relevant as generative AI transforms software. Marc Benioff is also Twitter's main character sometimes, which adds entertainment value.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "45", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive but justified by SaaS revenue" },
			marketCap: { label: "Market Cap", value: "$275B", explanation: "The total value of all the company's shares combined", culturalTranslation: "CRM empire worth a quarter trillion" },
			revenueGrowth: { label: "Revenue Growth", value: "11%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from subscriptions compounding" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "SaaS margins improving as they optimize" },
			beta: { label: "Beta", value: "1.2", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for enterprise software" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting in AI and acquisitions" },
		},
		news: [
			{ headline: "Salesforce AI features drive adoption", source: "TechCrunch", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Enterprise deals accelerate", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Profitability focus shows results", source: "WSJ", timestamp: "4 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "adbe",
		ticker: "ADBE",
		name: "Adobe",
		bio: "$60/month to remove backgrounds and sign PDFs",
		heroImage: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&h=500&fit=crop",
		personalityDescription: "Creative software landlord you can't escape",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 90, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 80, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Adobe Owns Every Creative Professional",
			sections: [
				{
					heading: "The Inescapable Creative Suite",
					content:
						"Photoshop, Illustrator, Premiere Pro, After Effects, InDesign—Adobe owns every tool creatives need to do their jobs. They're not just software, they're industry standards. Try getting a design job without knowing Photoshop. Try editing video without Premiere. You can't. Adobe knows this, which is why they can charge whatever they want and people will pay.",
				},
				{
					heading: "Subscription Stockholm Syndrome",
					content:
						"Adobe killed perpetual licenses and forced everyone onto Creative Cloud subscriptions. Now you pay $60/month forever or your files are hostage. Stopped paying? Can't open your own work. It's brilliant and evil. They turned software from a purchase into a relationship you can't leave. Pirates still exist, but professionals are stuck paying the Adobe tax for life.",
				},
				{
					heading: "Why It Matters",
					content:
						"Adobe represents creative software as infrastructure. They own PDF format (literally invented it), dominate design tools, and now they're adding AI with Firefly. Every YouTube video, Instagram ad, movie poster—Adobe touched it. They're the invisible backbone of visual content. Plus they tried to buy Figma for $20B and got blocked, which was peak monopoly energy.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "42", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for owning creative professionals' souls" },
			marketCap: { label: "Market Cap", value: "$240B", explanation: "The total value of all the company's shares combined", culturalTranslation: "subscription empire built on necessity" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady from compounding subscriptions" },
			profitMargin: { label: "Profit Margin", value: "35%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "insane software margins from lock-in" },
			beta: { label: "Beta", value: "1.1", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "stable—creatives always need tools" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting in AI and features" },
		},
		news: [
			{ headline: "Adobe AI Firefly adoption surges", source: "TechCrunch", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Creative Cloud subscriptions grow", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Figma acquisition blocked", source: "WSJ", timestamp: "3 months ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "now",
		ticker: "NOW",
		name: "ServiceNow",
		bio: "the IT ticketing system running every enterprise help desk",
		heroImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop",
		personalityDescription: "Boring enterprise automation that prints money",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 78, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why ServiceNow Runs Every Corporate Help Desk",
			sections: [
				{
					heading: "IT Tickets as a Service",
					content:
						"ServiceNow makes the software that handles every 'my laptop won't connect to WiFi' ticket at big companies. IT service management, workflow automation, incident tracking—it's all ServiceNow. Boring? Absolutely. Essential? 100%. Every Fortune 500 company uses it because manual ticket systems are hell. They automated corporate bureaucracy and charged subscription fees for it.",
				},
				{
					heading: "Platform Expansion Energy",
					content:
						"ServiceNow started with IT tickets and realized they could automate ALL enterprise workflows. HR onboarding? ServiceNow. Customer service? ServiceNow. Security operations? Also ServiceNow. They're expanding into every department, turning 'enterprise workflow' into a platform play. It's giving 'we do everything' energy but actually making it work.",
				},
				{
					heading: "Why It Matters",
					content:
						"ServiceNow represents enterprise SaaS at scale. They're not sexy like AI startups, but they're sticky. Once a company is locked in, migration is painful and expensive. Plus they're adding AI features for automated ticket resolution. As companies digitize operations, ServiceNow profits from that transformation. Boring businesses make the best stocks.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "85", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive but high growth justifies it" },
			marketCap: { label: "Market Cap", value: "$175B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive for enterprise workflow software" },
			revenueGrowth: { label: "Revenue Growth", value: "24%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "rapid expansion across enterprises" },
			profitMargin: { label: "Profit Margin", value: "25%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent SaaS margins from subscriptions" },
			beta: { label: "Beta", value: "1.3", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "growth stock with some volatility" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting in platform expansion" },
		},
		news: [
			{ headline: "ServiceNow AI capabilities expand", source: "Bloomberg", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Enterprise deals accelerate", source: "TechCrunch", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Platform expansion continues", source: "WSJ", timestamp: "1 week ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "intu",
		ticker: "INTU",
		name: "Intuit",
		bio: "profiting from tax season panic & small business chaos",
		heroImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=500&fit=crop",
		personalityDescription: "The company that lobbies to keep taxes complicated",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 60, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Intuit Owns Tax Season and Small Business Finance",
			sections: [
				{
					heading: "TurboTax's Annual Shakedown",
					content:
						"Every April, millions of Americans panic-download TurboTax to file taxes they could do for free if the IRS made it easier. Intuit spends millions lobbying to keep tax filing complicated so you need their software. It's giving 'create the problem, sell the solution' energy. The Free File program? They tried to hide it. The $100 upgrade fees? Pure profit. Tax season is their Super Bowl.",
				},
				{
					heading: "QuickBooks Lock-In for Small Business",
					content:
						"QuickBooks owns small business accounting. Once your finances are in QuickBooks, migration is a nightmare. Years of invoices, expense tracking, payroll—all locked in Intuit's ecosystem. They bought Credit Karma and Mailchimp to expand their small business empire. Now they know your taxes, your credit score, AND your email marketing. It's comprehensive surveillance disguised as helpful software.",
				},
				{
					heading: "Why It Matters",
					content:
						"Intuit represents profitable regulatory capture. They profit from American tax code complexity and lobby to keep it that way. Controversial? Yes. Effective? Extremely. Small businesses are stuck with QuickBooks, consumers need TurboTax, and Intuit collects subscription fees from both. It's the ultimate moat: government-backed necessity.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "65", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive for profiting off tax complexity" },
			marketCap: { label: "Market Cap", value: "$165B", explanation: "The total value of all the company's shares combined", culturalTranslation: "built an empire on tax season stress" },
			revenueGrowth: { label: "Revenue Growth", value: "13%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing as subscriptions compound" },
			profitMargin: { label: "Profit Margin", value: "24%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from software lock-in" },
			beta: { label: "Beta", value: "1.0", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "stable—taxes never go away" },
			dividendYield: { label: "Dividend Yield", value: "0.6%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small but growing payouts" },
		},
		news: [
			{ headline: "Intuit AI tax features launch", source: "TechCrunch", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "QuickBooks online growth strong", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Credit Karma integration deepens", source: "WSJ", timestamp: "5 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "amat",
		ticker: "AMAT",
		name: "Applied Materials",
		bio: "builds the machines that build the chips that run everything",
		heroImage: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=500&fit=crop",
		personalityDescription: "The toolmaker nobody knows but everyone needs",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 40, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 70, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Applied Materials Makes Chip Manufacturing Possible",
			sections: [
				{
					heading: "The Machines Behind the Machines",
					content:
						"Applied Materials makes the equipment that TSMC, Intel, and Samsung use to fabricate chips. We're talking multi-million dollar machines that deposit atomic layers, etch nanometer patterns, and inspect wafers for defects. They don't make chips—they make the tools that make chips possible. It's picks and shovels for the semiconductor gold rush.",
				},
				{
					heading: "Cyclical But Essential",
					content:
						"When chip demand is hot, fabs order tons of equipment. When demand cools, orders dry up fast. Applied Materials rides the semiconductor cycle hard. But here's the thing: every new chip generation needs new equipment. As chips get smaller and more complex, Applied Materials gets paid to develop the next-gen tools. It's cyclical volatility with long-term growth underneath.",
				},
				{
					heading: "Why It Matters",
					content:
						"Applied Materials is infrastructure for the semiconductor industry. AI chips, automotive chips, smartphone chips—all need Applied Materials equipment to be manufactured. They're less flashy than NVIDIA but just as critical. As the world demands more chips, Applied Materials profits from building the capacity to make them. The ultimate backend play on tech growth.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for cyclical equipment business" },
			marketCap: { label: "Market Cap", value: "$135B", explanation: "The total value of all the company's shares combined", culturalTranslation: "largest semiconductor equipment maker" },
			revenueGrowth: { label: "Revenue Growth", value: "18%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from AI chip manufacturing boom" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from specialized equipment" },
			beta: { label: "Beta", value: "1.5", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile with semiconductor cycles" },
			dividendYield: { label: "Dividend Yield", value: "0.9%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest but consistent payouts" },
		},
		news: [
			{ headline: "Applied Materials AI chip orders surge", source: "Bloomberg", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "China business stabilizes", source: "Reuters", timestamp: "1 day ago", sentiment: "Neutral", url: "#" },
			{ headline: "Advanced packaging tech announced", source: "TechCrunch", timestamp: "4 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "abnb",
		ticker: "ABNB",
		name: "Airbnb",
		bio: "ruined housing markets but gave you unique vacation vibes",
		heroImage: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=500&fit=crop",
		personalityDescription: "The sharing economy app gentrifying your neighborhood",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 70, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 82, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Airbnb Changed Travel Forever (For Better and Worse)",
			sections: [
				{
					heading: "Disrupted Hotels and Housing",
					content:
						"Airbnb convinced everyone their spare room could be a hotel and suddenly tourists were everywhere locals used to live. They disrupted travel by offering unique stays—treehouses, houseboats, entire villas—instead of generic hotel rooms. Problem? Professional landlords bought up apartments to Airbnb full-time, pricing out actual residents. Barcelona, Lisbon, NYC—all have love-hate relationships with Airbnb now.",
				},
				{
					heading: "Platform Economics Perfected",
					content:
						"Airbnb owns zero real estate but takes 15% of every booking. Hosts provide the inventory, guests provide the demand, Airbnb just connects them and collects fees. It's the ultimate platform play—massive scale with minimal overhead. Network effects mean both hosts and guests stay locked in. The cleaner the place, the higher the rating, the more money for everyone (except neighbors dealing with noise).",
				},
				{
					heading: "Why It Matters",
					content:
						"Airbnb represents the sharing economy at peak power and peak controversy. They changed how people travel, created new income streams for hosts, and also contributed to housing affordability crises worldwide. Regulatory battles continue in major cities. But post-pandemic travel boom means bookings are surging and Airbnb is printing money. The ultimate double-edged sword stock.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "38", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for travel platform dominance" },
			marketCap: { label: "Market Cap", value: "$85B", explanation: "The total value of all the company's shares combined", culturalTranslation: "bigger than most traditional hotel chains" },
			revenueGrowth: { label: "Revenue Growth", value: "18%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "surging from post-pandemic travel boom" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent platform margins—they own no property" },
			beta: { label: "Beta", value: "1.6", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile with travel demand cycles" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting in growth and fighting regulations" },
		},
		news: [
			{ headline: "Airbnb bookings hit record highs", source: "Bloomberg", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "International growth accelerates", source: "CNBC", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Regulatory battles continue in Europe", source: "WSJ", timestamp: "1 week ago", sentiment: "Bearish", url: "#" },
		],
	},
	{
		id: "lyft",
		ticker: "LYFT",
		name: "Lyft",
		bio: "Uber's friendlier pink competitor that finally makes money",
		heroImage: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=500&fit=crop",
		personalityDescription: "The scrappy underdog that survived",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 60, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Lyft is Still Here Despite Everything",
			sections: [
				{
					heading: "The Nice Rideshare",
					content:
						"Lyft tried to be the friendly alternative to Uber's aggressive chaos energy. Pink mustaches on cars, community vibes, driver-first messaging. They stayed US-only while Uber went global. Smaller scale, better vibes, same gig economy questions. The brand positioning was 'we're not the evil one' which worked until everyone realized rideshare itself is complicated.",
				},
				{
					heading: "Survival Through Focus",
					content:
						"Lyft got destroyed during the pandemic, almost ran out of money, and had to cut costs aggressively. No bikes, no scooters, no international expansion—just US rideshare and bike share in a few cities. They focused, improved operations, and somehow found profitability. It's the ultimate scrappy comeback story. Being smaller than Uber turned from weakness to strategic advantage.",
				},
				{
					heading: "Why It Matters",
					content:
						"Lyft proves you can be #2 in a market and still make it work. Competition keeps both companies from getting too comfortable with pricing. They're leaner than Uber, more focused, and finally profitable. Not flashy, but functional. The stock is cheap because everyone assumed they'd die—but they didn't. Underdog energy with actual financials now.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "32", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "newly profitable so valuation is resetting" },
			marketCap: { label: "Market Cap", value: "$7B", explanation: "The total value of all the company's shares combined", culturalTranslation: "tiny compared to Uber but alive" },
			revenueGrowth: { label: "Revenue Growth", value: "14%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from market recovery" },
			profitMargin: { label: "Profit Margin", value: "2%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "barely profitable but trending up" },
			beta: { label: "Beta", value: "1.8", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile small-cap rideshare play" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividends, just survival mode success" },
		},
		news: [
			{ headline: "Lyft profitability continues", source: "Bloomberg", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Driver retention improves", source: "TechCrunch", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Market share stable vs Uber", source: "WSJ", timestamp: "5 days ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "ddog",
		ticker: "DDOG",
		name: "Datadog",
		bio: "watching your servers crash in beautiful real-time dashboards",
		heroImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop",
		personalityDescription: "The DevOps tool every engineer complains about paying for",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 40, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Datadog Sees Everything Going Wrong",
			sections: [
				{
					heading: "Cloud Observability for Everyone",
					content:
						"Datadog monitors your cloud infrastructure, applications, logs, and basically everything digital that could break at 3am. Every engineer has a Datadog dashboard open showing real-time metrics, hoping nothing turns red. When stuff crashes, Datadog tells you exactly why and where. It's essential infrastructure for modern DevOps teams who live in constant fear of downtime.",
				},
				{
					heading: "Land and Expand Energy",
					content:
						"Datadog starts with basic monitoring, then upsells you on APM, logs, security, synthetic monitoring, and more modules. Before you know it, your bill is $50k/month because you can't function without it. They're masters of consumption pricing—the more data you ingest, the more you pay. It's SaaS lock-in through necessity, not choice.",
				},
				{
					heading: "Why It Matters",
					content:
						"As everything moves to cloud, observability becomes mission-critical. You can't fix what you can't see, and Datadog makes everything visible. Competitors exist but Datadog's integrations and usability won. They're the standard for cloud monitoring, which means consistent growth as more companies go digital. Boring backend infrastructure that every tech company needs.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "95", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive but high-growth SaaS justifies it" },
			marketCap: { label: "Market Cap", value: "$45B", explanation: "The total value of all the company's shares combined", culturalTranslation: "monitoring leader worth billions" },
			revenueGrowth: { label: "Revenue Growth", value: "27%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "rapid adoption as cloud grows" },
			profitMargin: { label: "Profit Margin", value: "12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins as scale kicks in" },
			beta: { label: "Beta", value: "1.4", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "growth stock volatility" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting in product development" },
		},
		news: [
			{ headline: "Datadog AI monitoring features launch", source: "TechCrunch", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Customer expansion rates strong", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Security product gaining traction", source: "WSJ", timestamp: "4 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "snow",
		ticker: "SNOW",
		name: "Snowflake",
		bio: "where enterprises dump all their data and pay by the query",
		heroImage: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&h=500&fit=crop",
		personalityDescription: "The cloud data warehouse that had the most hyped IPO ever",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 80, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Snowflake is the Data Cloud Everyone Uses",
			sections: [
				{
					heading: "Cloud-Native Data Warehouse",
					content:
						"Snowflake built a data warehouse from scratch for the cloud era. No servers to manage, infinite scale, pay only for what you use. Enterprises dump petabytes of data into Snowflake and run analytics on it. It's the modern alternative to legacy data warehouses that cost millions to maintain. Simple pitch: store all your data here, query it fast, don't worry about infrastructure.",
				},
				{
					heading: "Consumption Pricing Genius",
					content:
						"Snowflake charges based on how much compute and storage you use. Run a huge query? Pay more. Store more data? Pay more. It aligns perfectly with cloud economics but can get expensive fast. Companies love it because it scales with their needs. Snowflake loves it because high-growth customers automatically spend more. Perfect alignment until the bill arrives.",
				},
				{
					heading: "Why It Matters",
					content:
						"Snowflake went public at a $70B valuation with Warren Buffett as an investor—legendary IPO hype. They proved cloud-native databases could dominate. Every data team knows Snowflake. As AI and analytics grow, so does demand for data storage and processing. Not profitable yet but growing fast. Classic high-growth cloud play betting on the future.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "not profitable yet, all about revenue growth" },
			marketCap: { label: "Market Cap", value: "$55B", explanation: "The total value of all the company's shares combined", culturalTranslation: "still valued like a future giant" },
			revenueGrowth: { label: "Revenue Growth", value: "38%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "explosive growth from enterprise adoption" },
			profitMargin: { label: "Profit Margin", value: "-8%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "losing money to capture market share" },
			beta: { label: "Beta", value: "1.7", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile high-growth cloud stock" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting everything in growth" },
		},
		news: [
			{ headline: "Snowflake AI features drive adoption", source: "Bloomberg", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Product revenue beats estimates", source: "CNBC", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Enterprise customer growth strong", source: "WSJ", timestamp: "3 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "mdb",
		ticker: "MDB",
		name: "MongoDB",
		bio: "the database every startup uses then regrets at scale",
		heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=500&fit=crop",
		personalityDescription: "NoSQL that convinced everyone schemas are optional",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 78, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why MongoDB Won the NoSQL Wars",
			sections: [
				{
					heading: "Document Database Revolution",
					content:
						"MongoDB pioneered NoSQL document databases that store JSON-like data instead of rigid SQL tables. Developers loved it—no schemas, flexible data models, easy to get started. Every startup picked Mongo because it was fast to prototype with. Then they hit scale and realized managing unstructured data is hard. Too late—they're locked in. Classic developer trap disguised as innovation.",
				},
				{
					heading: "Atlas Cloud Play",
					content:
						"MongoDB Atlas is their managed cloud database service. Instead of running Mongo yourself (painful), you pay MongoDB to host it. Way easier, way more expensive, way more profitable for MongoDB. They transitioned from open-source database to cloud SaaS successfully. Now they make money from consumption pricing like everyone else. Brilliant business model pivot.",
				},
				{
					heading: "Why It Matters",
					content:
						"MongoDB represents the NoSQL movement that challenged traditional SQL databases. Modern apps need flexibility that relational databases struggle with. Mongo became the default choice for document storage. Not profitable yet but growing fast as more apps move to cloud. Every AI application needs a vector database now—MongoDB's adding that too. Staying relevant.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "not profitable yet, burning cash for growth" },
			marketCap: { label: "Market Cap", value: "$22B", explanation: "The total value of all the company's shares combined", culturalTranslation: "leading NoSQL database provider" },
			revenueGrowth: { label: "Revenue Growth", value: "31%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong growth from Atlas cloud adoption" },
			profitMargin: { label: "Profit Margin", value: "-12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "investing heavily in platform expansion" },
			beta: { label: "Beta", value: "1.6", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile growth stock" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting everything" },
		},
		news: [
			{ headline: "MongoDB Atlas cloud revenue surges", source: "TechCrunch", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "AI application use cases grow", source: "Bloomberg", timestamp: "2 days ago", sentiment: "Bullish", url: "#" },
			{ headline: "Enterprise adoption accelerates", source: "WSJ", timestamp: "1 week ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "panw",
		ticker: "PANW",
		name: "Palo Alto Networks",
		bio: "protecting enterprises from hackers & breaches since 2005",
		heroImage: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=500&fit=crop",
		personalityDescription: "The cybersecurity empire profiting from fear",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Palo Alto Owns Enterprise Security",
			sections: [
				{
					heading: "Platform Consolidation Play",
					content:
						"Palo Alto started with next-gen firewalls and expanded into everything security: cloud security, endpoint protection, network defense, threat intelligence. They're trying to be the one-stop shop for cybersecurity. Instead of buying 10 different security tools, enterprises buy Palo Alto's platform. Consolidation sounds good in theory—until you're locked into one vendor for your entire security stack.",
				},
				{
					heading: "Fear is a Business Model",
					content:
						"Cyber threats get worse every year—ransomware, state-sponsored attacks, data breaches. Palo Alto profits from that reality. Companies can't NOT invest in security, so budgets keep growing. Palo Alto's pitch is basically 'hackers are coming, you need us.' It's recession-proof because getting hacked is worse than budget cuts. Fear-driven sales at scale.",
				},
				{
					heading: "Why It Matters",
					content:
						"Palo Alto represents the cybersecurity industry's evolution from point products to platforms. They're competing with CrowdStrike, Fortinet, and others but holding strong. As everything moves to cloud, security becomes even more critical. Palo Alto's platform approach positions them well—assuming customers don't get vendor lock-in fatigue. Boring security business printing money from necessity.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "48", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for cybersecurity necessity" },
			marketCap: { label: "Market Cap", value: "$120B", explanation: "The total value of all the company's shares combined", culturalTranslation: "one of the biggest security companies" },
			revenueGrowth: { label: "Revenue Growth", value: "20%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong from platform adoption" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving as platform scales" },
			beta: { label: "Beta", value: "1.2", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for security" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting in platform expansion" },
		},
		news: [
			{ headline: "Palo Alto AI security features launch", source: "Bloomberg", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Cloud security revenue accelerates", source: "TechCrunch", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Enterprise deals expand", source: "WSJ", timestamp: "4 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "crwd",
		ticker: "CRWD",
		name: "CrowdStrike",
		bio: "cloud security that stops hackers & their IPO was legendary",
		heroImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=500&fit=crop",
		personalityDescription: "Next-gen endpoint security crushing legacy antivirus",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 82, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why CrowdStrike Killed Traditional Antivirus",
			sections: [
				{
					heading: "Cloud-Native Security",
					content:
						"CrowdStrike built endpoint security from scratch for the cloud era. No hardware boxes, no signature updates, no on-prem servers. Their Falcon platform runs in the cloud, protects every device, and uses AI to detect threats in real-time. It's modern security vs legacy antivirus from the 90s. Enterprises love it because it actually works—CrowdStrike famously stopped major hacks including Sony breach attribution.",
				},
				{
					heading: "Land and Expand Mastery",
					content:
						"CrowdStrike starts with endpoint detection and response, then upsells threat intelligence, identity protection, cloud workload security, and more modules. Customers start at $100k/year and scale to millions as they add features. Classic SaaS land-and-expand strategy executed perfectly. High customer retention because switching security vendors mid-operation is terrifying.",
				},
				{
					heading: "Why It Matters",
					content:
						"CrowdStrike represents cybersecurity's future—cloud-native, AI-powered, subscription-based. They're growing 35%+ annually in a market that's not slowing down. Cybersecurity is recession-proof because breaches are catastrophic. Their IPO was one of the best performing in years. High valuation but justified by growth and market position. The new standard for endpoint security.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "92", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive but high-growth security justifies it" },
			marketCap: { label: "Market Cap", value: "$85B", explanation: "The total value of all the company's shares combined", culturalTranslation: "next-gen security leader" },
			revenueGrowth: { label: "Revenue Growth", value: "36%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "explosive growth from enterprise adoption" },
			profitMargin: { label: "Profit Margin", value: "16%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong SaaS margins improving" },
			beta: { label: "Beta", value: "1.3", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "growth stock volatility" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting in product expansion" },
		},
		news: [
			{ headline: "CrowdStrike stops major ransomware attack", source: "CNBC", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "AI threat detection improves", source: "TechCrunch", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Customer retention hits record", source: "Bloomberg", timestamp: "5 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "zm",
		ticker: "ZM",
		name: "Zoom",
		bio: "gave us Zoom fatigue then fought to stay relevant",
		heroImage: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=800&h=500&fit=crop",
		personalityDescription: "Pandemic hero struggling with post-COVID reality",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 70, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Zoom Became a Verb Then Had to Evolve",
			sections: [
				{
					heading: "Pandemic Cultural Phenomenon",
					content:
						"Zoom went from niche video tool to global verb overnight. 'Zoom calls,' 'Zoom fatigue,' 'Zoom happy hours'—it defined pandemic life. Grandparents learned it, schools ran on it, weddings happened via it. The stock went parabolic as everyone worked from home. But here's the problem: you can't sustain pandemic-level growth when the pandemic ends. Reality check hit hard.",
				},
				{
					heading: "Fighting Microsoft and Google",
					content:
						"Post-pandemic, Zoom faces brutal competition. Microsoft Teams is bundled with Office (basically free), Google Meet is integrated everywhere, and everyone already has these tools. Zoom's advantage was simplicity and reliability, but Microsoft caught up. Now Zoom is adding AI features, contact center products, and anything to diversify beyond video meetings. Survival mode activated.",
				},
				{
					heading: "Why It Matters",
					content:
						"Zoom represents the pandemic winners facing post-pandemic reality. Growth slowed massively, but hybrid work means video meetings aren't going away. They're profitable with strong margins, just not growing like 2020 anymore. The question is whether they can expand beyond meetings or become a commodity feature. Still relevant, but the hype is over.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "35", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheaper than pandemic peak but still premium" },
			marketCap: { label: "Market Cap", value: "$22B", explanation: "The total value of all the company's shares combined", culturalTranslation: "down from $150B peak, reality set in" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growth basically stopped post-pandemic" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "still great software margins at least" },
			beta: { label: "Beta", value: "1.1", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility now" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinvesting to find new growth" },
		},
		news: [
			{ headline: "Zoom AI features drive enterprise adoption", source: "Bloomberg", timestamp: "3 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Contact center product gains traction", source: "TechCrunch", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Hybrid work trends support demand", source: "WSJ", timestamp: "1 week ago", sentiment: "Neutral", url: "#" },
		],
	},
	{
		id: "pltr",
		ticker: "PLTR",
		name: "Palantir",
		bio: "CIA-backed data analytics with cult stock following",
		heroImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop",
		personalityDescription: "Secretive government contractor turned AI hype machine",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 85, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 90, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Palantir is the Most Controversial Tech Stock",
			sections: [
				{
					heading: "Government Spy Software",
					content:
						"Palantir builds data analytics platforms for CIA, FBI, military, and intelligence agencies. They analyze massive datasets to find patterns, track threats, and support operations. Rumored to have helped find Osama bin Laden. They work with ICE, which makes them controversial among progressive tech workers. The company is secretive about what they actually do—which makes them either fascinating or terrifying depending on your politics.",
				},
				{
					heading: "Cult Stock Status",
					content:
						"Palantir has the most devoted retail investor base in tech. R/Palantir on Reddit worships CEO Alex Karp like a guru. The stock is insanely volatile—meme stock energy meets defense contractor. They're expanding from government to commercial clients, adding AI features to their platforms. Valuation is sky-high relative to revenue, but believers think they're undervalued. It's a religion, not a stock.",
				},
				{
					heading: "Why It Matters",
					content:
						"Palantir represents big data analytics for high-stakes scenarios—war, intelligence, enterprise operations. They're positioning as the AI platform for complex decision-making. Profitable now after years of losses. Government contracts provide stability, commercial growth is the upside. Controversial? Yes. Growing? Also yes. Love it or hate it, Palantir is building the software governments and enterprises use to understand chaos.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "95", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "absurdly expensive but retail doesn't care" },
			marketCap: { label: "Market Cap", value: "$75B", explanation: "The total value of all the company's shares combined", culturalTranslation: "valued like they own the future of AI" },
			revenueGrowth: { label: "Revenue Growth", value: "27%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "accelerating from commercial AI adoption" },
			profitMargin: { label: "Profit Margin", value: "20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent software margins finally" },
			beta: { label: "Beta", value: "2.2", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "extremely volatile meme stock energy" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "believers don't need dividends" },
		},
		news: [
			{ headline: "Palantir AI platform adoption surges", source: "Bloomberg", timestamp: "2 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Commercial revenue beats government", source: "CNBC", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Defense contracts expand", source: "WSJ", timestamp: "4 days ago", sentiment: "Bullish", url: "#" },
		],
	},
	{
		id: "hon",
		ticker: "HON",
		name: "Honeywell",
		bio: "your thermostat maker also builds quantum computers somehow",
		heroImage: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=500&fit=crop",
		personalityDescription: "Industrial conglomerate betting on quantum while making jet parts",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 40, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Honeywell Does Literally Everything",
			sections: [
				{
					heading: "From Thermostats to Quantum Computers",
					content:
						"Honeywell makes the thermostat in your house, cockpit systems in commercial jets, industrial automation equipment, AND trapped-ion quantum computers. It's the ultimate conglomerate—boring industrial products that print cash plus moonshot quantum bets. They're diversified to the point of confusion. Ask someone what Honeywell does and you'll get five different answers, all correct.",
				},
				{
					heading: "Aerospace and Industrial Backbone",
					content:
						"Honeywell's core business is aerospace components and industrial automation. Turbines for jets, building management systems, safety equipment, process controls. Boring stuff that keeps planes flying and factories running. It's recession-resistant because planes need parts and factories need automation. Steady cash flow funds their quantum computing experiments and other innovation plays.",
				},
				{
					heading: "Why It Matters",
					content:
						"Honeywell represents old-school American industrial capitalism adapting to the future. They're not flashy like pure tech plays, but they're profitable, pay dividends, and invest in emerging tech like quantum. Dividend aristocrat status means they've increased dividends for decades. Boring business model with innovation sprinkled in. The ultimate boomer stock that's actually trying to stay relevant.",
				},
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for diversified industrial" },
			marketCap: { label: "Market Cap", value: "$145B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive industrial conglomerate" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady industrial growth, not exciting" },
			profitMargin: { label: "Profit Margin", value: "16%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid industrial margins" },
			beta: { label: "Beta", value: "1.1", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "stable for industrials" },
			dividendYield: { label: "Dividend Yield", value: "2.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "dividend aristocrat, reliable income" },
		},
		news: [
			{ headline: "Honeywell quantum computer hits milestone", source: "TechCrunch", timestamp: "4 hours ago", sentiment: "Bullish", url: "#" },
			{ headline: "Aerospace revenue beats estimates", source: "Bloomberg", timestamp: "1 day ago", sentiment: "Bullish", url: "#" },
			{ headline: "Industrial automation demand strong", source: "WSJ", timestamp: "3 days ago", sentiment: "Bullish", url: "#" },
		],
	},
];
