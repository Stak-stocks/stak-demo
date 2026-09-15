package com.stak.demo.ui.news

import com.stak.demo.R

/**
 * News article data source - the article page is a TEMPLATE (user,
 * 2026-08-25: tapping the Dow brief must open the DOW story, not the
 * Apple one). The STAK BACKEND serves each story's own article -
 * headline, subtitle, body, media, related stock - and the app renders
 * it into the authored page (1:1495).
 *
 * The Apple article is the section's PLACEHOLDER (user, 2026-08-25):
 * ONE template renders every story - gist, pull quote, explainer,
 * source, tags and read-next come from the served article, and the
 * stock card / key stats appear whenever the story has a ticker. The
 * authored Apple copy ships as data, so that page stays frame-exact.
 *
 * EVERY story surface opens its article (user, 2026-08-25: the tiles
 * and the For You / Markets rows did nothing on tap): the listing rows
 * AND tiles render from these articles - [forYou], [markets] and
 * [MARKET_TILE] are the demo stand-ins for the backend's section
 * feeds, and [readNext] serves the article page's READ NEXT rows.
 * Everything served passes the strict stock-news gate ([isStockNews]).
 */
object NewsArticleFeed {
	const val APPLE = "apple-foldable"

	/**
	 * The Top Stories "Markets" tile's story. The tile LABELS are
	 * authored slots (1:1228: "Markets" = the day's top stock story,
	 * "Your stocks" = the top story from the user's holdings); the tile
	 * COPY was placeholder (user, 2026-08-25: "the design by the ui is
	 * just placeholder") - the served story renders into the slot.
	 */
	const val MARKET_TILE = "amzn-cloud-beat"

	/** Every ticker today's stories relate to - the Home "Why this matters" read (product audit, 2026-09-05). */
	fun relatedTickers(): Set<String> = ARTICLES.flatMap { it.relatedTickers }.toSet()

	/**
	 * The "Your stocks" tile's story: the authored Apple story when the
	 * user holds a stock it relates to (the demo does), else the first
	 * story about a held stock; null when nothing held is in the news
	 * (product audit, 2026-09-05: a one-stock account was shown Apple).
	 */
	fun yourStocksTile(): Article? {
		val held = com.stak.demo.ui.MyStakHoldings.tickers
		val apple = article(APPLE)
		if (apple.relatedTickers.any { it in held }) return apple
		return ARTICLES.firstOrNull { it.id != MARKET_TILE && it.relatedTickers.any { t -> t in held } }
	}

	/** The served demo payload's off-topic story - see the gate below. */
	private const val OFF_TOPIC = "wimbledon-final"

	data class Article(
		val id: String,
		val category: String,
		val headline: String,
		val subtitle: String,
		val ticker: String?,
		val paragraphs: List<String>,
		val media: NewsMedia,
		val shareText: String,
		val gist: List<String>,
		val pullQuote: String?,
		val explainer: String?,
		val tags: List<String>,
		/** Byline source name ("Bloomberg") - the avatar shows its initial. */
		val source: String,
		/** Relative age for list rows ("2d" -> "Reuters · 2d"). */
		val age: String,
		/** Byline suffix after the source ("· Jul 2 · 3 min read"). */
		val sourceMeta: String,
		/** List-row thumbnail; null = the story has no row presentation. */
		val thumbRes: Int? = null,
		/**
		 * The stocks the story relates to - gates the "In your STAK" chip
		 * on listing rows (user, 2026-08-23). [ticker] is the PRIMARY one:
		 * it keys the article's stock card / key stats ([stockFacts]) and
		 * is the stock a save adds to My STAK.
		 */
		val relatedTickers: List<String> = emptyList(),
	)

	private fun demo(id: String, category: String, headline: String, subtitle: String, paragraphs: List<String>, gist: List<String>, pullQuote: String, explainer: String, tags: List<String>, source: String, age: String, sourceMeta: String, thumbRes: Int? = null, relatedTickers: List<String> = emptyList(), media: NewsMedia = NewsMedia.Image(posterRes = null, url = null)) = Article(
		id = id,
		category = category,
		headline = headline,
		subtitle = subtitle,
		// EVERY story renders the full Apple page (user, 2026-08-25:
		// "use the apple features... replace the placeholder"): the
		// primary related stock keys the stock card / key stats.
		ticker = relatedTickers.firstOrNull(),
		paragraphs = paragraphs,
		// PER-STORY media (user, 2026-08-25: the Tesla story must show
		// Tesla, not Apple) - each story passes its own oEmbed-verified
		// official video; the empty-Image default is the no-media slot.
		media = media,
		shareText = "$headline - read it on STAK: https://stak.app/news/$id",
		gist = gist,
		pullQuote = pullQuote,
		explainer = explainer,
		tags = tags,
		source = source,
		age = age,
		sourceMeta = sourceMeta,
		thumbRes = thumbRes,
		relatedTickers = relatedTickers,
	)

	private val ARTICLES = listOf(
		Article(
			id = APPLE,
			// Authored toast reads "Tech & Ai" (1:1521); the initialism is fixed -
			// exact-design audit 2026-09-04.
			category = "Tech & AI",
			headline = "Apple climbs 5% on foldable iPhone push",
			subtitle = "A bigger foldable order and the widest iPhone lineup in years sent Apple toward a record, and to within touching distance of Nvidia’s crown.",
			ticker = "AAPL",
			// The AUTHORED body/gist/quote/explainer as data - the single
			// rendering path reproduces the authored page bit-exact.
			paragraphs = listOf(
				"Apple had one of its best days in months on Thursday, climbing almost 5 percent after word got out that the company is planning its widest iPhone lineup in years. Nikkei Asia reported that Apple has asked suppliers to prepare at least five new models, and to lift output of its first foldable to around 10 million units, well above the seven to eight million it had penciled in.",
				"That last number is the tell. Companies do not quietly double down on a product they expect to flop, and the foldable, which the rumor mill has taken to calling the iPhone Ultra, is now expected to land between late 2026 and the first half of 2027. Traders read the order size as confidence and bought accordingly. Apple gained about 182 billion dollars in market value on the day, nearly enough on its own to paper over a sell-off tearing through chip stocks.",
				"The rally leaves Apple roughly 4 percent shy of retaking the title of most valuable company in the world from Nvidia, a crown the two have passed back and forth all year. It also lets the stock shake off a rough June, when a rare mid-cycle price increase on Macs and iPads, blamed on climbing memory costs, sent shares lower and rattled investors who had grown used to Apple holding the line.",
				"The real verdict comes on July 30, when Apple reports fiscal third-quarter results. Wall Street is penciling in revenue of around 108 billion dollars, but the number everyone will hunt for is any early read on how the new lineup, and its price tags, are actually selling.",
			),
			media = NewsMedia.demo(),
			shareText = "Apple climbs 5% on foldable iPhone push - read it on STAK: https://stak.app/news/apple-foldable-iphone-push",
			gist = listOf(
				"Apple rose about 5% on plans for its widest iPhone lineup yet.",
				"It raised foldable orders to 10 million units, a show of confidence.",
				"The stock sits about 4% from passing Nvidia as the most valuable company.",
			),
			pullQuote = "Companies do not quietly double down on a product they expect to flop.",
			explainer = "A foldable phone opens out into a small tablet. For Apple it means a pricier device to sell, and a way to win back buyers who drifted to Samsung, which has offered foldables for years.",
			tags = listOf("Apple", "Tech"),
			// The AUTHORED byline (1:1495) and the For You row (1:1228).
			source = "Bloomberg",
			age = "2d",
			sourceMeta = com.stak.demo.ui.StakClock.byline("2d", "3 min read"),
			thumbRes = R.drawable.news_thumb_aapl,
			relatedTickers = listOf("AAPL"),
		),
		demo(
			"dow-record-chips-slide", "Markets",
			"Dow closes at a record as chips slide",
			"Wall Street split into the long weekend: a record Dow, a bruised Nasdaq, and a jobs report soft enough to keep rate-cut hopes alive.",
			listOf(
				"The Dow notched an all-time closing high on Thursday even as a rout in memory chip names dragged the Nasdaq lower, an unusual split that left traders debating which index was telling the truth about the economy.",
				"A softer-than-expected jobs report did the heavy lifting. Slower hiring eased pressure on the Federal Reserve, and rate-sensitive corners of the market - banks, industrials, housing - rallied while high-multiple chip stocks gave back part of a torrid run.",
				"The question for next week is whether the rotation holds. Earnings from two mega-cap tech names and a fresh inflation print will decide whether the record was a changing of the guard or just a long-weekend head fake.",
			),
			listOf(
				"The Dow closed at a record while the Nasdaq fell.",
				"A soft jobs report eased pressure on the Fed.",
				"Rotation out of chips lifted banks and industrials.",
			),
			"Two indexes, two very different stories about the same economy.",
			"The Dow tracks 30 large, established companies, so it can rise even when tech-heavy indexes fall. A split like this usually means money is rotating, not leaving.",
			listOf("Markets", "Stocks"),
			"Reuters", "1d", com.stak.demo.ui.StakClock.byline("1d", "3 min read"),
			// STRICT stock news (user, 2026-08-25): an index story counts
			// only through the stocks it is about - the chip names.
			null, listOf("NVDA", "MU"),
			// NYSE-facade b-roll (Pexels, real-time 30fps, verified).
			media = NewsMedia.Video(url = "https://video.twimg.com/amplify_video/1407070844472508418/vid/640x360/IrLoEoh_QEHqT5Zc.mp4?tag=14", posterUrl = "https://pbs.twimg.com/media/E4brjWsXoAAF3gP.jpg", sourceLink = "https://x.com/CNBCClosingBell/status/1407070932716474374"),
		),
		// STRICT stock news (user, 2026-08-25): the old fed-holds-rates
		// demo article was macro, not stock news - replaced with the
		// Alphabet story its brief now carries.
		demo(
			"googl-ad-quarter", "Tech & AI",
			"Alphabet jumps after a blowout ad quarter",
			"An advertising beat on every line quieted the market's biggest question about the company.",
			listOf(
				"Alphabet jumped after reporting an advertising quarter that beat every major estimate, with search revenue accelerating for the third straight period.",
				"The beat quiets the market's biggest worry about the company: that AI chatbots would eat into search. Instead, AI-powered ad tools are lifting prices, and YouTube grew faster than expected.",
				"The move carried the rest of the ad-supported internet with it, and it hands the megacap earnings week an early win.",
			),
			listOf(
				"Ad revenue beat every major estimate.",
				"Search accelerated for a third straight quarter.",
				"AI ad tools are lifting prices.",
			),
			"The beat quiets the market's biggest worry about the company.",
			"Alphabet is Google's parent company. Most of its profit comes from ads on search and YouTube, so ad growth is the number that moves the stock.",
			listOf("Alphabet", "Tech"),
			"Reuters", "1d", com.stak.demo.ui.StakClock.byline("1d", "3 min read"),
			null, listOf("GOOGL"),
			// Google-search-screen b-roll (Pexels, real-time 30fps, verified).
			media = NewsMedia.Video(url = "https://pdl-iphone-cnbc-com.akamaized.net/7000419539/ece420f0-8608-11f1-a1f3-a9f987e334ee/1784750819-47326244087-hd_L.mp4", posterUrl = "https://image.cnbcfm.com/api/v1/image/108338938-cbot_googl_earnings_1.jpg?v=1784767875&w=1280&h=720", sourceLink = "https://www.cnbc.com/video/2026/07/22/alphabet-beats-on-q2-revenue-posts-82-percent-year-over-year-jump-in-google-cloud-revenue.html"),
		),
		demo(
			"oil-opec-supply", "Markets",
			"Oil slips after positive Iran talks",
			"Crude fell for a third session as diplomacy and a possible OPEC+ supply boost weighed on prices.",
			listOf(
				"Oil extended its slide after reports that OPEC+ may lift output next quarter landed alongside signs of progress in talks with Iran, a combination that points the same direction: more barrels.",
				"Energy shares lagged the broader market while the losers of expensive fuel - airlines, shippers, delivery names - caught a bid. The move also shaves a little off headline inflation math if it sticks.",
				"Analysts caution that both stories can still reverse: supply decisions are not final and talks have collapsed before. But for now the path of least resistance for crude is lower.",
			),
			listOf(
				"Crude fell for a third straight session.",
				"OPEC+ may lift output next quarter.",
				"Airlines and shippers rallied on cheaper fuel.",
			),
			"Both stories point the same direction: more barrels.",
			"Oil prices move on expected supply and demand. More supply - real or promised - usually means lower prices at the pump and lower costs for fuel-hungry industries.",
			listOf("Energy", "Markets"),
			// Also the third Markets row (1:1228) - "Reuters · 3d", XOM chip.
			// NOTE: the frame's oil-row image is an authored PLACEHOLDER
			// (806-byte near-black texture, unlike the real sibling photos);
			// the user chose to keep it until the backend serves story
			// images (2026-08-25). Not a loading bug.
			"Reuters", "3d", com.stak.demo.ui.StakClock.byline("3d", "2 min read"),
			// The oil thumb asset was a flat-grey placeholder (2026-09-02) -
			// null lets the row serve the story's real newscast poster.
			null, listOf("XOM"),
			// Real-time pumpjack drone b-roll (Pexels, verified direct
			// stream) - the first pick was a TIME-LAPSE and read as
			// racing playback (user, 2026-08-26).
			media = NewsMedia.Video(url = "https://video.twimg.com/amplify_video/1699284608536248320/vid/avc1/640x360/Eeh_WcbfPbwwZC8h.mp4?tag=16", posterUrl = "https://pbs.twimg.com/amplify_video_thumb/1699284608536248320/img/FYIKCy2RrRRIaOEG.jpg", sourceLink = "https://x.com/BloombergTV/status/1699393999142879621"),
		),
		demo(
			"tech-earnings-week", "Tech & AI",
			"Tech earnings week: what to watch",
			"Five of the largest names report in four days - AI spending guidance is the number that moves everything.",
			listOf(
				"Five of the market’s largest companies report over four days, and one line item towers over the rest: how much they plan to spend on AI infrastructure, and what they say it is earning them.",
				"Cloud growth rates, buyback pace against record cash piles, and any hint of softness in advertising round out the checklist. Options markets are pricing bigger-than-usual single-day moves across the group.",
				"The stakes reach past tech. These names carry enough index weight that their guidance will set the tone for the whole tape into the next Fed meeting.",
			),
			listOf(
				"Five mega-caps report within four days.",
				"AI spending guidance is the headline number.",
				"Options price bigger-than-usual single-day moves.",
			),
			"Their guidance will set the tone for the whole tape.",
			"Earnings season is when companies report results and give guidance. For the largest names, that guidance moves entire indexes, not just their own stock.",
			listOf("Tech", "Earnings"),
			"Bloomberg", "1d", com.stak.demo.ui.StakClock.byline("1d", "3 min read"),
			// STRICT stock news: the earnings week is about these stocks.
			null, listOf("MSFT", "GOOGL"),
			// Stock-trend-screen b-roll (Mixkit, verified direct stream).
			media = NewsMedia.Video(url = "https://edgecast-cf-prod.yahoo.net/cp-video-transcode/production/8b8ced7f-142e-3da6-bd6e-ab5a48f76d4a/2023-01-27/22-05-53/48a26972-13c3-5ccb-97c2-17ba2fc67a29/stream_1280x720x856_v2.mp4", posterUrl = "https://s.yimg.com/lo/mysterio/api/878652fcfbe020be39989399af3b1293ddf55bbe1341d7cdb22598ac2a08f141/lightyear_networkapi/resizefill_w1200%3Bquality_80%3Bformat_webp/https%3A%2F%2Fs.yimg.com%2Fos%2Fcreatr-uploaded-images%2F2023-01%2Fc2867610-9e8e-11ed-baff-01c8cc812dc5", sourceLink = "https://finance.yahoo.com/video/tech-earnings-fed-decision-economic-220553748.html"),
		),
		// STRICT stock news (user, 2026-08-25): the old fed-minutes tile
		// story was macro, not stock news - the Markets tile now serves
		// the day's top stock story.
		demo(
			MARKET_TILE, "Tech & AI",
			"Amazon climbs on cloud margin beat",
			"A cloud profit surprise eased the market's doubt about how much of the AI buildout turns into earnings.",
			listOf(
				"Amazon rose sharply after its cloud unit posted margins well above what Wall Street had penciled in, easing a quarter of doubt about how much of the AI buildout the company can turn into profit.",
				"AWS is the company's profit engine, and the beat matters more than the headline number: every point of cloud margin flows almost straight to operating income. Analysts spent the morning raising targets.",
				"The move also steadies the wider AI trade. Amazon is one of the largest buyers of AI chips, and a profitable buildout supports the spending plans the whole supply chain is priced on.",
			),
			listOf(
				"Cloud margins came in well above estimates.",
				"AWS is the company's profit engine.",
				"Analysts raised targets through the morning.",
			),
			"Every point of cloud margin flows almost straight to operating income.",
			"Cloud margin measures what a cloud business keeps after its costs. For big tech, small margin changes move billions in profit.",
			listOf("Amazon", "Tech"),
			"Reuters", "2h", com.stak.demo.ui.StakClock.byline("2h", "3 min read"),
			null, listOf("AMZN"),
			// Server-racks b-roll (Pexels, verified direct stream).
			media = NewsMedia.Video(url = "https://pdl-iphone-cnbc-com.akamaized.net/7000402916/0a2a7740-0215-11f1-8ce3-3d87008d7586/1770242470-43852144172-hd_L.mp4", posterUrl = "https://image.cnbcfm.com/api/v1/image/108261644-17702424741770242470-43852144172-1080pnbcnews.jpg?v=1770242473", sourceLink = "https://www.cnbc.com/video/2026/02/04/aws-in-focus-for-amazon-earnings.html"),
		),
		demo(
			"nvda-lags-rally", "Tech & AI",
			"Nvidia lags the chip rally it kicked off",
			"The stock that started the AI trade is sitting out its latest leg, and the reasons say a lot about where the rally goes next.",
			listOf(
				"Nvidia spent two years as the engine of the AI trade. This week it became a passenger, edging higher while the memory and networking names around it ripped double digits.",
				"Nothing is wrong with the business; forecasts keep climbing. What changed is the market's appetite: with Nvidia priced for perfection, money hunting the next leg of the trade is rotating into suppliers that still look cheap by comparison.",
				"Bulls call it healthy broadening, bears call it fatigue. The distinction matters, because a rally carried by the whole supply chain lasts longer than one carried by a single stock.",
			),
			listOf(
				"Nvidia trailed while smaller chip names surged.",
				"Money is rotating into cheaper AI suppliers.",
				"Analysts split on broadening versus fatigue.",
			),
			"This week it became a passenger.",
			"When a leader stock pauses, gains often spread to smaller related companies. Investors call this rotation, and it can signal a rally maturing rather than ending.",
			listOf("Nvidia", "Tech"),
			"Reuters", "2d", com.stak.demo.ui.StakClock.byline("2d", "3 min read"),
			R.drawable.news_thumb_nvda, listOf("NVDA"),
			// NVIDIA RTX graphics-card b-roll (Pexels, real-time 30fps, verified).
			media = NewsMedia.Video(url = "https://pdl-iphone-cnbc-com.akamaized.net/7000396229/a2927310-c652-11f0-afc8-d79487fce04e/1763671856-42633094871-hd_L.mp4", posterUrl = "https://image.cnbcfm.com/api/v1/image/108229488-17636718631763671856-42633094871-1080pnbcnews.jpg?v=1763671862&w=1280&h=720", sourceLink = "https://www.cnbc.com/video/2025/11/20/dan-ives-nvidia-put-up-a-masterpiece-quarter-and-threw-ai-bubble-out-the-window.html"),
		),
		demo(
			"tsla-drops-deliveries", "Tech & AI",
			"Tesla drops 7% even after beating deliveries",
			"A delivery beat was not enough - the margin behind each car is now the number that moves the stock.",
			listOf(
				"Tesla delivered more cars last quarter than Wall Street expected and its stock fell 7 percent anyway, the kind of reaction that tells you the market has changed the question it is asking.",
				"The beat was built on price cuts and incentives, and every discount comes straight out of margin. Analysts now put automotive gross margin, not deliveries, at the center of the story, and that number will not arrive until the full earnings report.",
				"The selloff also reflects positioning: the stock had run hard into the delivery print, so a beat with caveats was read as a reason to take profits rather than add.",
			),
			listOf(
				"Deliveries beat estimates, the stock fell 7% anyway.",
				"Price cuts mean the beat cost margin.",
				"Full margins arrive with the earnings report.",
			),
			"The market has changed the question it is asking.",
			"Deliveries count how many cars were handed to customers; margin is what each sale earns after costs. A company can sell more cars and still make less money.",
			listOf("Tesla", "Tech"),
			"CNBC", "2d", com.stak.demo.ui.StakClock.byline("2d", "3 min read"),
			R.drawable.news_thumb_tsla, listOf("TSLA"),
			// Tesla Model X b-roll (Pexels, real-time 30fps, verified).
			media = NewsMedia.Video(url = "https://video.twimg.com/amplify_video/1477968621418823684/vid/640x360/RK2UN9LzxttCiyIs.mp4?tag=14", posterUrl = "https://pbs.twimg.com/media/FILMuTvXMAAk1hK.jpg", sourceLink = "https://x.com/SquawkCNBC/status/1477968728969072641"),
		),
		// STRICT stock news (user, 2026-08-25): the old jobs-report demo
		// row was macro, not stock news - replaced with a stock story.
		// The authored row image is reused as the served-thumb stand-in.
		demo(
			"amd-yearly-high", "Tech & AI",
			"AMD rides the AI rotation to a yearly high",
			"The clearest winner of the week's rotation out of the AI trade's most crowded names.",
			listOf(
				"AMD closed at its highest level in a year, the clearest winner of the week's rotation out of the AI trade's most crowded names and into its challengers.",
				"The company's new accelerators are landing with cloud buyers hunting a second supplier, and every headline about tight supply at the market leader reads as demand flowing to AMD.",
				"The catch is execution: the stock now prices meaningful share gains, and the next earnings report has to show them.",
			),
			listOf(
				"AMD closed at a one-year high.",
				"Cloud buyers want a second AI chip supplier.",
				"The stock now prices real share gains.",
			),
			"The clearest winner of the week's rotation.",
			"When one company dominates a hot market, buyers often fund a second supplier to keep prices honest. Investors call it the challenger trade.",
			listOf("AMD", "Chips"),
			"Reuters", "2d", com.stak.demo.ui.StakClock.byline("2d", "2 min read"),
			R.drawable.news_thumb_jobs, listOf("AMD"),
			// Motherboard-chips b-roll (Mixkit, verified direct stream).
			media = NewsMedia.Video(url = "https://pdl-iphone-cnbc-com.akamaized.net/7000412105/899c3ab0-494e-11f1-8d98-6dd8be25c276/1778073695-45746068381-hd_L.mp4", posterUrl = "https://image.cnbcfm.com/api/v1/image/108302924-1778073838912-1778073695-45746068381-hd.jpg?v=1778073840&w=1280&h=720", sourceLink = "https://www.cnbc.com/video/2026/05/06/amd-ceo-lisa-su-agents-are-driving-tremendous-demand-in-the-ai-cycle.html"),
		),
		demo(
			"memory-chips-soar", "Tech & AI",
			"Memory chips soar as the AI trade rotates",
			"The unglamorous end of the chip business is suddenly the hottest trade in the AI boom.",
			listOf(
				"Memory chipmakers were the best performers in the market this week, extending a run that has quietly turned the sector's cheapest names into the AI trade's new leadership.",
				"The driver is high-bandwidth memory, the specialized chips that feed data to AI accelerators. Supply is sold out through next year, prices are rising, and every new data center order tightens the market further.",
				"The risk is the memory cycle itself, a business famous for violent swings from shortage to glut. For now, though, the shortage side of the cycle is doing the heavy lifting.",
			),
			listOf(
				"Memory names led the market this week.",
				"High-bandwidth memory is sold out through next year.",
				"The cycle's boom-bust history is the main risk.",
			),
			"The sector's cheapest names are the AI trade's new leadership.",
			"Memory chips store the data AI systems work on. Demand from AI data centers has turned a boom-and-bust commodity business into a growth story, at least for now.",
			listOf("Chips", "Tech"),
			"Bloomberg", "2d", com.stak.demo.ui.StakClock.byline("2d", "3 min read"),
			R.drawable.news_thumb_chips, listOf("MU"),
			// Chip-fab engineer b-roll (Mixkit, verified direct stream).
			media = NewsMedia.Video(url = "https://voa-video-ns.akamaized.net/pangeavideo/2024/04/0/01/01000000-0aff-0242-4978-08dc5a5cdef2_480p.mp4?cb=eddaa30b3", posterUrl = "https://gdb.voanews.com/89efc172-826e-45dd-ad20-df3a903817f7_w1080_h608.jpg", sourceLink = "https://www.voanews.com/a/7566533.html"),
		),
		// OFF-TOPIC by design: a general-pool story with no market topic
		// and no related stock. It is SERVED (it sits in the For You
		// payload) but [isStockNews] drops it, so it never renders -
		// the on-device proof of the filter (user, 2026-08-25).
		demo(
			OFF_TOPIC, "Sports",
			"Alcaraz outlasts Sinner in five-set Wimbledon final",
			"A four-and-a-half-hour final delivered the rivalry the sport has waited a decade for.",
			listOf(
				"Carlos Alcaraz won his third straight Wimbledon title on Sunday, coming from two sets to one down to beat Jannik Sinner in a final that stretched past four and a half hours.",
				"The pair have now split the last six major titles between them, and the head-to-head is even again.",
			),
			listOf(
				"Alcaraz won a third straight Wimbledon title.",
				"The final ran past four and a half hours.",
			),
			"The rivalry the sport has waited a decade for.",
			"Wimbledon is tennis's oldest major tournament, played on grass in London each July.",
			listOf("Sports", "Tennis"),
			"AP", "5h", com.stak.demo.ui.StakClock.byline("5h", "2 min read"),
			media = NewsMedia.Video(url = "https://archive.org/download/BBCNEWS_20250713_200000_BBC_News/BBCNEWS_20250713_200000_BBC_News.mp4?t=706/838&ignore=x.mp4", posterUrl = "https://archive.org/download/BBCNEWS_20250713_200000_BBC_News/BBCNEWS_20250713_200000_BBC_News.thumbs/BBCNEWS_20250713_200000_BBC_News_000777.jpg", sourceLink = "https://archive.org/details/BBCNEWS_20250713_200000_BBC_News"),
		),
	)

	/** The served article for a story - the backend resolves this in production. */
	fun article(id: String): Article = ARTICLES.firstOrNull { it.id == id } ?: ARTICLES.first()

	/** The story's primary ticker, or null for an unknown id (never the fallback story's). */
	fun tickerOf(id: String): String? = ARTICLES.firstOrNull { it.id == id }?.ticker

	/**
	 * The feed's canonical story order - the article page's SWIPE order
	 * (user, 2026-08-31: "swipe to get the previous/next news - social
	 * media vibes"). Every story in the feed, in the order the feed
	 * defines it, through the same strict stock-news gate as every other
	 * surface: the off-topic story never renders, so it is not a page.
	 */
	val PAGE_ORDER: List<String> = ARTICLES.filter { isStockNews(it) }.map { it.id }

	/**
	 * Brief page index -> its article id (demo mapping). Served briefs
	 * pass the same strict stock-news gate as the listing rows.
	 */
	val BRIEF_ARTICLES = listOf("dow-record-chips-slide", "googl-ad-quarter", "oil-opec-supply", "tech-earnings-week")

	/**
	 * STRICT stock-news gate (user, 2026-08-25: "strict stock market
	 * news!!!" - macro stories like Fed minutes are out; the designer's
	 * tile copy was placeholder). The backend serves from a general news
	 * pool, so every News surface filters what it renders: a story
	 * passes ONLY when it names at least one stock it is about. The
	 * off-topic sports story in the served demo payload proves the gate -
	 * no surface ever renders it.
	 */
	fun isStockNews(article: Article): Boolean =
		article.relatedTickers.isNotEmpty() || article.ticker != null

	/** The For You stories the backend served, in row order (1:1228). */
	private val FOR_YOU = listOf("nvda-lags-rally", APPLE, "tsla-drops-deliveries", OFF_TOPIC)

	/** The Markets stories the backend served, in row order (1:1228). */
	private val MARKETS = listOf("amd-yearly-high", "memory-chips-soar", "oil-opec-supply")

	/** The For You rows - strict stock news only. */
	/**
	 * For You = stories about stocks the user HOLDS in My STAK (user,
	 * 2026-09-01: "should show news that the user holds stock on");
	 * Markets = general market news. The curated order comes first so the
	 * default holdings render the authored sample rows (1:1228); saving a
	 * new stock moves its story from Markets into For You instantly.
	 */
	fun forYou(): List<Article> {
		val held = com.stak.demo.ui.MyStakHoldings.tickers
		val curated = FOR_YOU.mapNotNull { id -> ARTICLES.firstOrNull { it.id == id } }
		val rest = ARTICLES.filter { a -> curated.none { it.id == a.id } }
		return (curated + rest)
			.filter { isStockNews(it) && it.category != "Markets" && it.relatedTickers.any { t -> t in held } }
	}

	/** The Markets rows - strict stock news only. */
	fun markets(): List<Article> {
		val chosen = forYou().map { it.id }.toSet()
		val pool = ARTICLES.filter { isStockNews(it) && it.id !in chosen }
		return pool.filter { it.category == "Markets" } + pool.filter { it.category != "Markets" }
	}

	/** The article page's READ NEXT rows - two other row-presented stories. */
	fun readNext(excluding: String): List<Article> =
		ARTICLES.filter { isStockNews(it) && it.thumbRes != null && it.id != excluding }.take(2)

	/**
	 * The story's stock module - name, quote and key stats for the
	 * article page's stock card (authored AAPL values = the frame;
	 * the rest are DEMO stand-ins until the backend serves quotes).
	 * `up` picks the change color (green/red, the app's authored pair).
	 */
	data class StockFacts(
		val name: String,
		/** Sheet-row name ("Apple" on 101:1169). */
		val shortName: String,
		val price: String,
		val change: String,
		val up: Boolean,
		val marketCap: String,
		val peRatio: String,
		val dayRange: String,
		val volume: String,
		val week52: String,
		val divYield: String,
	)

	private val STOCK_FACTS = mapOf(
		// The AUTHORED card (1:1495) - keep these values frame-exact.
		"AAPL" to StockFacts("Apple Inc.", "Apple", "$308.63", "+4.84% today", true, "$4.58T", "34.2", "$301.20–$309.80", "82.4M", "$201.50–$317.40", "0.42%"),
		"NVDA" to StockFacts("NVIDIA Corp.", "NVIDIA", "$178.42", "+1.12% today", true, "$4.35T", "51.8", "$175.90–$180.10", "195.7M", "$98.60–$184.30", "0.03%"),
		"TSLA" to StockFacts("Tesla, Inc.", "Tesla", "$291.30", "-6.95% today", false, "$928.5B", "68.4", "$288.10–$312.60", "142.3M", "$182.00–$488.50", "—"),
		"AMD" to StockFacts("Advanced Micro Devices", "AMD", "$186.75", "+4.10% today", true, "$302.4B", "45.6", "$178.90–$187.40", "88.1M", "$76.50–$189.20", "—"),
		"GOOGL" to StockFacts("Alphabet Inc.", "Alphabet", "$203.55", "+3.65% today", true, "$2.47T", "24.8", "$196.40–$204.90", "41.2M", "$142.70–$207.05", "0.39%"),
		"AMZN" to StockFacts("Amazon.com, Inc.", "Amazon", "$242.18", "+2.87% today", true, "$2.57T", "38.9", "$236.50–$243.70", "55.6M", "$151.60–$246.30", "—"),
		"MSFT" to StockFacts("Microsoft Corp.", "Microsoft", "$512.40", "+1.45% today", true, "$3.81T", "37.5", "$505.80–$514.20", "22.8M", "$385.60–$518.30", "0.66%"),
		"XOM" to StockFacts("Exxon Mobil Corp.", "Exxon Mobil", "$109.84", "-1.84% today", false, "$472.6B", "13.9", "$108.90–$112.30", "18.4M", "$101.40–$126.30", "3.41%"),
		"MU" to StockFacts("Micron Technology", "Micron", "$128.66", "+6.21% today", true, "$142.8B", "21.3", "$120.70–$129.40", "33.9M", "$61.50–$131.20", "0.36%"),
		// Codex parity audit (2026-09-04): the My STAK collection tickers
		// (Collections.kt) and the Simulate picks - shared demo data, so
		// stockFacts() serves each one instead of falling back to AAPL.
		// Mirrors ios/StakDemo/News/NewsArticleFeed.swift.
		"JPM" to StockFacts("JPMorgan Chase & Co.", "JPMorgan", "$245.60", "+0.62% today", true, "$690.4B", "13.1", "$243.10–$246.80", "8.9M", "$179.20–$251.40", "2.05%"),
		"V" to StockFacts("Visa Inc.", "Visa", "$352.10", "+0.31% today", true, "$705.8B", "32.4", "$349.60–$353.40", "6.1M", "$252.70–$366.20", "0.67%"),
		"GS" to StockFacts("Goldman Sachs Group", "Goldman Sachs", "$612.40", "-0.48% today", false, "$189.3B", "15.2", "$609.80–$618.90", "1.7M", "$439.40–$630.10", "1.96%"),
		"ENPH" to StockFacts("Enphase Energy", "Enphase", "$78.40", "+1.92% today", true, "$10.3B", "38.6", "$76.10–$79.20", "4.4M", "$54.30–$132.60", "—"),
		"NEE" to StockFacts("NextEra Energy", "NextEra", "$84.20", "+0.41% today", true, "$173.2B", "22.7", "$83.40–$84.90", "9.2M", "$61.80–$86.10", "2.69%"),
		"FSLR" to StockFacts("First Solar, Inc.", "First Solar", "$228.90", "-1.12% today", false, "$24.5B", "17.8", "$226.30–$233.10", "2.3M", "$116.60–$262.40", "—"),
		"PLD" to StockFacts("Prologis, Inc.", "Prologis", "$118.30", "+0.24% today", true, "$109.6B", "27.9", "$117.20–$118.90", "3.0M", "$85.40–$127.30", "3.41%"),
		"O" to StockFacts("Realty Income Corp.", "Realty Income", "$59.10", "-0.27% today", false, "$53.2B", "54.3", "$58.70–$59.60", "4.8M", "$50.70–$64.90", "5.46%"),
		"LLY" to StockFacts("Eli Lilly and Co.", "Eli Lilly", "$792.50", "+1.38% today", true, "$751.6B", "63.4", "$781.90–$795.20", "2.9M", "$677.10–$972.50", "0.76%"),
		"UNH" to StockFacts("UnitedHealth Group", "UnitedHealth", "$318.70", "-0.81% today", false, "$289.1B", "13.7", "$316.20–$323.40", "7.4M", "$248.90–$630.70", "2.78%"),
		"JNJ" to StockFacts("Johnson & Johnson", "J&J", "$162.40", "+0.49% today", true, "$391.0B", "16.9", "$161.10–$163.20", "6.6M", "$140.70–$169.90", "3.20%"),
		"PFE" to StockFacts("Pfizer Inc.", "Pfizer", "$25.30", "-0.20% today", false, "$143.7B", "13.2", "$25.10–$25.60", "38.5M", "$20.90–$30.20", "6.80%"),
		"COST" to StockFacts("Costco Wholesale Corp.", "Costco", "$947.20", "+0.73% today", true, "$420.4B", "52.1", "$939.80–$951.60", "1.6M", "$793.40–$1,078.20", "0.55%"),
		"NKE" to StockFacts("Nike, Inc.", "Nike", "$72.80", "-1.28% today", false, "$107.5B", "33.6", "$72.10–$74.30", "9.8M", "$52.30–$90.60", "2.20%"),
		"PLTR" to StockFacts("Palantir Technologies", "Palantir", "$28.40", "+1.10% today", true, "$64.2B", "—", "$27.90–$28.70", "51.3M", "$15.70–$45.20", "—"),
	)

	/** The served stock module for a ticker - the backend resolves this in production. */
	/** True when the feed carries facts for the ticker (the Other collection reads them). */
	fun hasStockFacts(ticker: String): Boolean = ticker in STOCK_FACTS

	fun stockFacts(ticker: String): StockFacts {
		val facts = STOCK_FACTS[ticker] ?: STOCK_FACTS.getValue("AAPL")
		// Product audit (2026-09-05): the demo stand-ins quoted NVDA at $178.42
		// while the deck and My STAK say $122.10. Every stock the catalogue
		// carries takes ITS quote here; the authored Apple card (1:1495) stays
		// frame-exact.
		if (ticker == "AAPL") return facts
		val live = com.stak.demo.ui.mystak.COLLECTIONS.flatMap { it.stocks }.firstOrNull { it.ticker == ticker } ?: return facts
		val pct = live.change.filter { it.isDigit() || it == '.' }
		return facts.copy(price = live.price, change = (if (live.up) "+" else "-") + pct + "% today", up = live.up)
	}
}
