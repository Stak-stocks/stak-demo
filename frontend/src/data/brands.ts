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
	url: string;
	image: string;
	datetime: number;
	summary: string;
	explanation: string;
	whyItMatters: string;
	sentiment: "bullish" | "bearish" | "neutral";
	type: "macro" | "sector" | "company";
}

export interface TrendCard {
	type: "macro" | "sector" | "company" | "stak";
	label: string;

	// NEW FORMAT fields (Gemini v3 — synthesis-based)
	topic?: string;
	why?: string;
	impact?: string;
	synthesis?: string;
	takeaway?: string;

	// V2 FORMAT fields (Gemini v2 — may appear in cached data)
	intro?: string;
	forces?: string[];
	stockReflects?: string;

	// LEGACY fields (static fallback data in trends.ts)
	dominance?: string;
	headline?: string;
	explanation?: string;
	pressure?: "Positive Pressure" | "Negative Pressure" | "Volatile / Mixed Pressure";
	pressureEmoji?: string;
}

export interface BrandProfile {
	id: string;
	ticker: string;
	name: string;
	domain?: string;
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
	logo?: string;
	trends?: TrendCard[];
	interestCategories?: string[];
}

const BRAND_DOMAINS: Record<string, string> = {
	tsla: "tesla.com", aapl: "apple.com", nvda: "nvidia.com", rblx: "roblox.com",
	meta: "meta.com", nke: "nike.com", sbux: "starbucks.com", spot: "spotify.com",
	amzn: "amazon.com", nflx: "netflix.com", coin: "coinbase.com", msft: "microsoft.com",
	googl: "google.com", dis: "disney.com", uber: "uber.com", shop: "shopify.com",
	amd: "amd.com", spy: "ssga.com", qqq: "invesco.com", pypl: "paypal.com",
	intc: "intel.com", ionq: "ionq.com", tsm: "tsmc.com", qcom: "qualcomm.com",
	avgo: "broadcom.com", mu: "micron.com", asml: "asml.com", nee: "nexteraenergy.com",
	enph: "enphase.com", fslr: "firstsolar.com", plug: "plugpower.com", xom: "exxonmobil.com",
	cvx: "chevron.com", v: "visa.com", ma: "mastercard.com", sq: "squareup.com",
	hood: "robinhood.com", sofi: "sofi.com", afrm: "affirm.com", txn: "ti.com",
	nxpi: "nxp.com", mrvl: "marvell.com", wmt: "walmart.com", tgt: "target.com",
	cost: "costco.com", hd: "homedepot.com", low: "lowes.com", mcd: "mcdonalds.com",
	ko: "coca-cola.com", pep: "pepsico.com", pg: "pg.com", jnj: "jnj.com",
	lmt: "lockheedmartin.com", ba: "boeing.com", unh: "unitedhealthgroup.com",
	crm: "salesforce.com", adbe: "adobe.com", now: "servicenow.com", intu: "intuit.com",
	amat: "appliedmaterials.com", abnb: "airbnb.com", lyft: "lyft.com", ddog: "datadoghq.com",
	snow: "snowflake.com", mdb: "mongodb.com", panw: "paloaltonetworks.com",
	crwd: "crowdstrike.com", zm: "zoom.us", pltr: "palantir.com", hon: "honeywell.com",
	or: "loreal.com", el: "esteelauder.com", elf: "elfcosmetics.com", ulta: "ulta.com",
	coty: "coty.com",
	// Finance
	jpm: "jpmorganchase.com", gs: "goldmansachs.com", ms: "morganstanley.com",
	c: "citi.com", bac: "bankofamerica.com", wfc: "wellsfargo.com",
	blk: "blackrock.com", axp: "americanexpress.com", cof: "capitalone.com",
	schw: "schwab.com", bx: "blackstone.com", kkr: "kkr.com",
	apo: "apollo.com", aig: "aig.com", met: "metlife.com",
	pru: "prudential.com", afl: "aflac.com", all: "allstate.com",
	cb: "chubb.com", trv: "travelers.com", hig: "thehartford.com",
	fis: "fisglobal.com", fisv: "fiserv.com", gpn: "globalpayments.com",
	adp: "adp.com", ndaq: "nasdaq.com", ice: "theice.com",
	cme: "cmegroup.com", spgi: "spglobal.com", mco: "moodys.com",
	msci: "msci.com", trow: "troweprice.com", ivz: "invesco.com",
	ben: "franklintempleton.com", syf: "synchrony.com", ally: "ally.com",
	amp: "ameriprise.com", aon: "aon.com", mmc: "mmc.com",
	ajg: "ajg.com", pnc: "pnc.com", usb: "usbank.com",
	tfc: "truist.com", efx: "equifax.com", payx: "paychex.com",
	ntrs: "northerntrust.com", stt: "statestreet.com", bk: "bnymellon.com",
	rjf: "raymondjames.com", cboe: "cboe.com", ssnc: "ssctech.com",
	fds: "factset.com", brkb: "berkshirehathaway.com", omf: "onemainfinancial.com",
	evr: "evercore.com", pfg: "principal.com", lnc: "lfg.com",
	key: "key.com", rf: "regions.com", cfg: "citizensbank.com",
	// Tech
	orcl: "oracle.com", ibm: "ibm.com", hpq: "hp.com", dell: "dell.com",
	acn: "accenture.com", sap: "sap.com", hubs: "hubspot.com", team: "atlassian.com",
	net: "cloudflare.com", okta: "okta.com", ftnt: "fortinet.com", zs: "zscaler.com",
	s: "sentinelone.com", twlo: "twilio.com", path: "uipath.com", bill: "bill.com",
	snap: "snap.com", pins: "pinterest.com", rddt: "reddit.com",
	match: "matchgroup.com", dash: "doordash.com", pton: "onepeloton.com",
	nu: "nu.com.br", meli: "mercadolibre.com", se: "sea.com", dkng: "draftkings.com",
	arm: "arm.com", on: "onsemi.com", adi: "analog.com", mpwr: "monolithicpower.com",
	swks: "skyworksinc.com", smci: "supermicro.com", baba: "alibaba.com",
	bidu: "baidu.com", jd: "jd.com", wex: "wexinc.com", u: "unity.com",
	tost: "toasttab.com", ncno: "ncino.com", upst: "upstart.com",
	mchp: "microchip.com", lrcx: "lamresearch.com",
	// Healthcare
	pfe: "pfizer.com", mrna: "modernatx.com", bmy: "bms.com",
	lly: "lilly.com", abbv: "abbvie.com", mrk: "merck.com",
	gild: "gilead.com", amgn: "amgen.com", regn: "regeneron.com",
	vrtx: "vrtx.com", biib: "biogen.com", isrg: "intuitive.com",
	mdt: "medtronic.com", syk: "stryker.com", bsx: "bostonscientific.com",
	cvs: "cvshealth.com", ci: "cigna.com", hum: "humana.com",
	hims: "forhims.com", holx: "hologic.com", rmd: "resmed.com", nvo: "novonordisk.com",
	// Consumer
	cmg: "chipotle.com", yum: "yum.com", dpz: "dominos.com",
	f: "ford.com", gm: "gm.com", rivn: "rivian.com",
	lulu: "lululemon.com", tpr: "tapestry.com", tjx: "tjx.com",
	rost: "rossstores.com", orly: "oreillyauto.com", azo: "autozone.com",
	tsco: "tractorsupply.com", dltr: "dollartree.com", dg: "dollargeneral.com",
	burl: "burlington.com", mar: "marriott.com", hlt: "hilton.com",
	rcl: "royalcaribbean.com", etsy: "etsy.com",
	// Energy
	eog: "eogresources.com", oxy: "oxy.com", hal: "halliburton.com",
	slb: "slb.com", psx: "phillips66.com", vlo: "valero.com",
	kmi: "kindermorgan.com", dvn: "devonenergy.com", hes: "hess.com", bkr: "bakerhughes.com",
	// Industrial / Aerospace / Transport
	cat: "caterpillar.com", de: "deere.com", etn: "eaton.com",
	emr: "emerson.com", itw: "itw.com", ir: "irco.com",
	rtx: "rtx.com", noc: "northropgrumman.com", lhx: "l3harris.com",
	ge: "geaerospace.com", mmm: "3m.com",
	unp: "up.com", csx: "csx.com", ups: "ups.com",
	fdx: "fedex.com", dal: "delta.com", ual: "united.com",
	luv: "southwest.com", aal: "aa.com",
	// Telecom
	t: "att.com", vz: "verizon.com", tmus: "t-mobile.com",
	// Utilities
	duk: "duke-energy.com", so: "southerncompany.com", d: "dominionenergy.com",
	aep: "aep.com", exc: "exeloncorp.com",
	// REITs
	o: "realtyincome.com", amt: "americantower.com", eqix: "equinix.com",
	spg: "simon.com", pld: "prologis.com", dlr: "digitalrealty.com",
	// Media / Gaming
	wbd: "wbd.com", mgm: "mgmresorts.com", czr: "caesars.com",
	ea: "ea.com", ttwo: "take2games.com", ttd: "thetradedesk.com", roku: "roku.com",
	// Crypto
	mstr: "strategy.com", mara: "marathon.io", riot: "riotplatforms.com", clsk: "cleanspark.com",
	// Consumer Staples
	mdlz: "mondelezinternational.com", hsy: "thehersheycompany.com", gis: "generalmills.com",
	kr: "kroger.com", stz: "cbrands.com", cl: "colgate.com",
	kmb: "kimberly-clark.com", mnst: "monsterbevcorp.com",
	// Materials
	nem: "newmont.com", fcx: "fcx.com", alb: "albemarle.com",
	apd: "airproducts.com", lin: "linde.com",
	// Enterprise Software
	wday: "workday.com", veev: "veeva.com", docu: "docusign.com",
	cdns: "cadence.com", snps: "synopsys.com",
};

export function getBrandLogoUrl(brand: BrandProfile): string {
	const slug = TV_LOGO_SLUGS[brand.id];
	if (slug) return `https://s3-symbol-logo.tradingview.com/${slug}--600.png`;
	// Use Finnhub-provided logo for dynamic (Firestore) stocks
	if (brand.logo) return brand.logo;
	const domain = brand.domain || BRAND_DOMAINS[brand.id] || `${brand.name.toLowerCase().replace(/\s+/g, "")}.com`;
	return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

// TradingView logo slugs for high-quality company hero images
const TV_LOGO_SLUGS: Record<string, string> = {
	tsla: "tesla", aapl: "apple", nvda: "nvidia", rblx: "roblox", meta: "meta-platforms",
	nke: "nike", sbux: "starbucks", spot: "spotify-technology", amzn: "amazon", nflx: "netflix",
	coin: "coinbase", msft: "microsoft", googl: "alphabet", dis: "walt-disney",
	uber: "uber", shop: "shopify", amd: "advanced-micro-devices",
	spy: "state-street", qqq: "invesco", pypl: "paypal",
	intc: "intel", ionq: "ionq", tsm: "taiwan-semiconductor", qcom: "qualcomm",
	avgo: "broadcom", mu: "micron-technology", asml: "asml",
	nee: "nextera-energy", enph: "enphase-energy", fslr: "first-solar",
	plug: "plug-power", xom: "exxon", cvx: "chevron", v: "visa", ma: "mastercard",
	sq: "block", hood: "robinhood", sofi: "sofi", afrm: "affirm",
	txn: "texas-instruments", nxpi: "nxp-semiconductors", mrvl: "marvell-tech",
	wmt: "walmart", tgt: "target", cost: "costco-wholesale", hd: "home-depot", low: "lowe-s",
	mcd: "mcdonalds", ko: "coca-cola", pep: "pepsico", pg: "procter-and-gamble",
	jnj: "johnson-and-johnson", lmt: "lockheed-martin", ba: "boeing",
	unh: "unitedhealth", crm: "salesforce", adbe: "adobe", now: "servicenow",
	intu: "intuit", amat: "applied-materials", abnb: "airbnb", lyft: "lyft",
	ddog: "datadog", snow: "snowflake", mdb: "mongodb", panw: "palo-alto-networks",
	crwd: "crowdstrike", zm: "zoom-video-communications", pltr: "palantir",
	hon: "honeywell", or: "l-oreal", el: "estee-lauder", elf: "e-l-f-beauty",
	ulta: "ulta-beauty", coty: "coty",
	// Finance
	jpm: "jpmorgan-chase", gs: "goldman-sachs", ms: "morgan-stanley",
	c: "citigroup", bac: "bank-of-america", wfc: "wells-fargo",
	blk: "blackrock", axp: "american-express", cof: "capital-one-financial",
	schw: "charles-schwab", bx: "blackstone", kkr: "kkr",
	aig: "american-international-group", met: "metlife", pru: "prudential-financial",
	afl: "aflac", all: "allstate", cb: "chubb", trv: "travelers-companies",
	adp: "automatic-data-processing", ndaq: "nasdaq", ice: "intercontinental-exchange",
	cme: "cme-group", spgi: "sp-global", mco: "moodys",
	msci: "msci", trow: "t-rowe-price", ivz: "invesco",
	pnc: "pnc-financial-services-group", usb: "us-bancorp",
	bk: "bank-of-new-york-mellon", efx: "equifax", payx: "paychex",
	brkb: "berkshire-hathaway", stt: "state-street",
	// Tech
	orcl: "oracle", ibm: "ibm", dell: "dell-technologies",
	acn: "accenture", sap: "sap", team: "atlassian",
	net: "cloudflare", okta: "okta", ftnt: "fortinet", zs: "zscaler",
	s: "sentinelone", twlo: "twilio", snap: "snap", pins: "pinterest",
	rddt: "reddit", dash: "doordash", meli: "mercadolibre",
	arm: "arm-holdings", adi: "analog-devices",
	baba: "alibaba", bidu: "baidu", jd: "jd-com",
	lrcx: "lam-research", mchp: "microchip-technology",
	dkng: "draftkings", pton: "peloton-interactive",
	// Healthcare
	pfe: "pfizer", mrna: "moderna", bmy: "bristol-myers-squibb",
	lly: "eli-lilly", abbv: "abbvie", mrk: "merck",
	gild: "gilead-sciences", amgn: "amgen", regn: "regeneron-pharmaceuticals",
	vrtx: "vertex-pharmaceuticals", biib: "biogen", isrg: "intuitive-surgical",
	mdt: "medtronic", syk: "stryker", bsx: "boston-scientific",
	cvs: "cvs-health", ci: "cigna", hum: "humana", nvo: "novo-nordisk",
	// Consumer
	cmg: "chipotle-mexican-grill", yum: "yum-brands", dpz: "dominos-pizza",
	f: "ford-motor", gm: "general-motors", rivn: "rivian",
	lulu: "lululemon", tjx: "tjx-companies", rost: "ross-stores",
	orly: "oreilly-automotive", azo: "autozone", tsco: "tractor-supply",
	dltr: "dollar-tree", dg: "dollar-general", burl: "burlington-stores",
	mar: "marriott-international", hlt: "hilton-worldwide",
	rcl: "royal-caribbean", etsy: "etsy",
	// Energy
	eog: "eog-resources", oxy: "occidental-petroleum",
	hal: "halliburton", slb: "schlumberger", psx: "phillips-66",
	vlo: "valero-energy", kmi: "kinder-morgan", dvn: "devon-energy",
	// Industrial / Transport
	cat: "caterpillar", de: "deere", etn: "eaton",
	emr: "emerson-electric", itw: "illinois-tool-works",
	rtx: "rtx", noc: "northrop-grumman", lhx: "l3harris-technologies",
	ge: "ge-aerospace", mmm: "3m",
	unp: "union-pacific", csx: "csx", ups: "united-parcel-service",
	fdx: "fedex", dal: "delta-air-lines", ual: "united-airlines",
	luv: "southwest-airlines", aal: "american-airlines",
	// Telecom
	t: "at-and-t", vz: "verizon-communications", tmus: "t-mobile",
	// Utilities
	duk: "duke-energy", so: "southern-company", d: "dominion-energy",
	aep: "american-electric-power", exc: "exelon",
	// REITs
	o: "realty-income", amt: "american-tower", eqix: "equinix",
	spg: "simon-property-group", pld: "prologis", dlr: "digital-realty-trust",
	// Media / Gaming
	wbd: "warner-bros-discovery", mgm: "mgm-resorts-international",
	ea: "electronic-arts", ttwo: "take-two-interactive", ttd: "trade-desk", roku: "roku",
	// Crypto
	mstr: "microstrategy", mara: "mara-holdings", riot: "riot-platforms",
	// Consumer Staples
	mdlz: "mondelez-international", hsy: "hershey", gis: "general-mills",
	kr: "kroger", stz: "constellation-brands", cl: "colgate-palmolive",
	kmb: "kimberly-clark", mnst: "monster-beverage",
	// Materials
	nem: "newmont", fcx: "freeport-mcmoran", alb: "albemarle",
	apd: "air-products-and-chemicals", lin: "linde",
	// Enterprise Software
	wday: "workday", veev: "veeva-systems", docu: "docusign",
	cdns: "cadence-design-systems", snps: "synopsys",
};

export function getBrandHeroUrl(id: string): string {
	const slug = TV_LOGO_SLUGS[id];
	if (slug) return `https://s3-symbol-logo.tradingview.com/${slug}--600.png`;
	const domain = BRAND_DOMAINS[id];
	if (domain) return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
	return "";
}

export const brands: BrandProfile[] = [
	{
		id: "tsla",
		ticker: "TSLA",
		name: "Tesla",
		bio: "electric dreams & memes that break the simulation",
		heroImage: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&h=600&fit=crop",
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
				value: "391.3",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "expensive but popular—people are betting on the future",
			},
			marketCap: {
				label: "Market Cap",
				value: "1.38T",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "bigger than most traditional car companies combined",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "-3.1%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "slowing down as competition intensifies",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "3.4%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "thinning margins as they fight for market share",
			},
			beta: {
				label: "Beta",
				value: "1.87",
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
	},
	{
		id: "aapl",
		ticker: "AAPL",
		name: "Apple",
		bio: "the aesthetic everyone copies but won't admit",
		heroImage: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop",
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
				value: "32.8",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "premium pricing for premium brand",
			},
			marketCap: {
				label: "Market Cap",
				value: "$3.81T",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "one of the few companies in history to cross the $4 trillion mark",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "15.7%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "steady money printer",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "29.3%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "insane margins—they know what they're worth",
			},
			beta: {
				label: "Beta",
				value: "1.09",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "stable energy; moves with the market, not against it",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0.4%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "small but consistent payouts",
			},
		},
	},
	{
		id: "nvda",
		ticker: "NVDA",
		name: "NVIDIA",
		bio: "powering your AI girlfriend and gaming setup",
		heroImage: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=600&fit=crop",
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
						"High-performance, hard-to-replace, quietly dominant. NVIDIA built a reputation in gaming first, then became essential for AI, data centers, and advanced computing. They’re not loud on social media — their relevance comes from being needed everywhere.",
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
				value: "49.6",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "surprisingly reasonable for a company that doubled in value this last year",
			},
			marketCap: {
				label: "Market Cap",
				value: "$4.65T",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "The world's #1. The most valuable company in human history.",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "62.5%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "absolutely exploding",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "55.7%",
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
	},
	{
		id: "rblx",
		ticker: "RBLX",
		name: "Roblox",
		bio: "where gen alpha gets their drip & trades virtual economies",
		heroImage: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&h=600&fit=crop",
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
				value: "-46.13",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "still losing money on paper, but the street is buying the hype",
			},
			marketCap: {
				label: "Market Cap",
				value: "$46.2B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "doubled in size as Gen Alpha engagement hits record highs",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "48%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "absolutely explosive top-line growth",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "-21.7%",
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
	},
	{
		id: "meta",
		ticker: "META",
		name: "Meta",
		bio: "your mom's on facebook, you're on insta, nobody's in the metaverse",
		heroImage: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=800&h=600&fit=crop",
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
				value: "31",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "fairly priced for a tech giant that figured out how to print money with AI",
			},
			marketCap: {
				label: "Market Cap",
				value: "$1.79T",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "still massive despite metaverse losses",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "24%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "main character growth fueled by an ad revenue blowout",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "41%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "insane efficiency; your scrolling is basically pure profit for them",
			},
			beta: {
				label: "Beta",
				value: "1.3",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "relatively stable for tech, but moves with the market",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0.3%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "just started paying dividends recently",
			},
		},
	},
	{
		id: "nke",
		ticker: "NKE",
		name: "Nike",
		bio: "just do it (spend $200 on shoes you'll wear twice)",
		heroImage: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop",
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
				value: "36.24",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "trading at a premium as the market waits for the comeback story",
			},
			marketCap: {
				label: "Market Cap",
				value: "$98.5B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "slid below $100B as competition from On and Hoka gets real",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "1%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "stalled energy; currently trying to find the next innovation",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "5.4%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "margins are taking a hit from massive markdowns and discounts",
			},
			beta: {
				label: "Beta",
				value: "1.1",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "relatively stable",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "2.3%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "consistent payouts to investors",
			},
		},
	},
	{
		id: "sbux",
		ticker: "SBUX",
		name: "Starbucks",
		bio: "your $8 oat milk latte has entered the chat",
		heroImage: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop",
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
				value: "$104.4B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "coffee empire status",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "10.4%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "steady growth fueled by international expansion, especially in China",
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
				culturalTranslation: "boring but stable; coffee is a recession-resistant habit",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "2.57%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "paying you back for all those lattes you bought",
			},
		},
	},
	{
		id: "spot",
		ticker: "SPOT",
		name: "Spotify",
		bio: "your wrapped reveal is your whole personality for a week",
		heroImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop",
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
				value: "99.2",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "investors are paying for the future audio monopoly, not today's profits",
			},
			marketCap: {
				label: "Market Cap",
				value: "$103.9B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "dominates music streaming",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "14.5%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "accelerating growth thanks to podcasting and price hikes",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "3.5%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "thin margins but expanding as they try to get everyone to use premium",
			},
			beta: {
				label: "Beta",
				value: "1.5",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "high-energy stock; it moves with user sentiment and pricing news",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "no profits to share",
			},
		},
	},
	{
		id: "amzn",
		ticker: "AMZN",
		name: "Amazon",
		bio: "2-day shipping has ruined your patience forever",
		heroImage: "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=800&h=600&fit=crop",
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
				value: "33.9",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "expensive but AWS justifies it",
			},
			marketCap: {
				label: "Market Cap",
				value: "$2.6T",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "the biggest 'everything store' in the world",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "11.5%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "steady compounding growth; when you're this big, double digits is a flex",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "10.2%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "retail is a grind, but their Ad and Cloud margins are carrying the team",
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
	},
	{
		id: "nflx",
		ticker: "NFLX",
		name: "Netflix",
		bio: "binge culture architect & password sharing police",
		heroImage: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop",
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
						"Netflix killed cable TV and changed how we consume media. They made streaming mainstream and they are acquiring Warner Bros. Discovery. Now they own the iconic ta-dum sound AND Harry Potter, HBO, and Batman. It's a total content monopoly.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "33.04",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "A high-stakes valuation as the market bets on Netflix successfully pivoting from a pure tech platform into a diversified media empire.",
			},
			marketCap: {
				label: "Market Cap",
				value: "$352.5B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "slumped recently as the market digests the massive debt from the WBD deal",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "17%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "high growth fueled by the ad-tier pivot",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "29.5%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "industry-leading margins; they've mastered the binge economy",
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
	},
	{
		id: "coin",
		ticker: "COIN",
		name: "Coinbase",
		bio: "where your friend lost $5k on dog-themed coins",
		heroImage: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=600&fit=crop",
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
						"Love it or hate it, Coinbase legitimized crypto for mainstream audiences. They put crypto in Super Bowl ads. They made blockchain semi-respectable in the eyes of regulators. They're the bridge between 'normal finance' and 'decentralized chaos. Even people who don’t use crypto know the name — and that alone says a lot.",
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
				value: "$55B",
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
	},
	{
		id: "msft",
		ticker: "MSFT",
		name: "Microsoft",
		bio: "office suite overlord & cloud computing empire",
		heroImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop",
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
				value: "$3.1T",
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
	},
	{
		id: "googl",
		ticker: "GOOGL",
		name: "Google",
		bio: "the search bar that knows your secrets",
		heroImage: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=800&h=600&fit=crop",
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
				value: "$1.8T",
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
	},
	{
		id: "dis",
		ticker: "DIS",
		name: "Disney",
		bio: "owns your childhood & half of Hollywood",
		heroImage: "https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=800&h=600&fit=crop",
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
				value: "$180B",
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
	},
	{
		id: "uber",
		ticker: "UBER",
		name: "Uber",
		bio: "your ride & your eats",
		heroImage: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=600&fit=crop",
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
				value: "$140B",
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
	},
	{
		id: "shop",
		ticker: "SHOP",
		name: "Shopify",
		bio: "Etsy shops that look professional",
		heroImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
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
				value: "$95B",
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
	},
	{
		id: "amd",
		ticker: "AMD",
		name: "AMD",
		bio: "NVIDIA's scrappy competitor",
		heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop",
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
				value: "$240B",
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
	},
	{
		id: "spy",
		ticker: "SPY",
		name: "SPY ETF",
		bio: "S&P 500 index, the ultimate set & forget",
		heroImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
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
				value: "$500B AUM",
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
	},
	{
		id: "qqq",
		ticker: "QQQ",
		name: "QQQ ETF",
		bio: "Nasdaq-100, pure tech energy",
		heroImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
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
				value: "$300B AUM",
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
	},
	{
		id: "pypl",
		ticker: "PYPL",
		name: "PayPal",
		bio: "splitting the bill made easy",
		heroImage: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=800&h=600&fit=crop",
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
				value: "$85B",
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
	},
{
		id: "intc",
		ticker: "INTC",
		name: "Intel",
		bio: "the empire strikes back (or dies trying)",
		heroImage: "https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=800&h=600&fit=crop",
		personalityDescription: "The tech boomer that finally got a gym membership",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 90, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 85, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Intel Is “Too Big to Die?”",
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
					heading: "America's Chip Savior",
					content:
						"The US government basically decided Intel cannot fail. Billions in CHIPS Act subsidies are the only reason the factory lights are still on. It’s not just a stock; it’s a geopolitical chess piece.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "77.4",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "priced for a miracle; you're paying for 2027 earnings in 2026",
			},
			marketCap: {
				label: "Market Cap",
				value: "$232.0B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "clawed its way back from the dead, but still a fraction of NVIDIA",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "-4.0%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "still shrinking as legacy PC sales drag down the foundry gains",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "-1.2%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "losing money to build factories; the burn rate is terrifying",
			},
			beta: {
				label: "Beta",
				value: "1.65",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "extremely volatile; it moves on every rumor about yields",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "dividend is dead; cash is for buying lithography machines",
			},
		},
	},
	{
		id: "ionq",
		ticker: "IONQ",
		name: "IonQ",
		bio: "pure-play quantum computing moonshot",
		heroImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=600&fit=crop",
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
			marketCap: { label: "Market Cap", value: "$2B", explanation: "Total company value", culturalTranslation: "small but hyped" },
			revenueGrowth: { label: "Revenue Growth", value: "85%", explanation: "Year-over-year growth", culturalTranslation: "growing from tiny base" },
			profitMargin: { label: "Profit Margin", value: "-300%", explanation: "Profit percentage", culturalTranslation: "burning cash on R&D" },
			beta: { label: "Beta", value: "2.5", explanation: "Volatility measure", culturalTranslation: "extremely volatile" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "Annual dividend payout", culturalTranslation: "lol no" },
		},
	},
	{
		id: "tsm",
		ticker: "TSM",
		name: "TSMC",
		bio: "makes the chips that power your entire life",
		heroImage: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop",
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
			marketCap: { label: "Market Cap", value: "$650B", explanation: "Total company value", culturalTranslation: "chip manufacturing king" },
			revenueGrowth: { label: "Revenue Growth", value: "20%", explanation: "Year-over-year growth", culturalTranslation: "strong AI chip demand" },
			profitMargin: { label: "Profit Margin", value: "38%", explanation: "Profit percentage", culturalTranslation: "insane margins" },
			beta: { label: "Beta", value: "1.3", explanation: "Volatility measure", culturalTranslation: "moves with tech" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "Annual dividend payout", culturalTranslation: "modest payouts" },
		},
	},
	{
		id: "qcom",
		ticker: "QCOM",
		name: "Qualcomm",
		bio: "every smartphone runs on our chips",
		heroImage: "https://images.unsplash.com/photo-1597733336794-12d05021d510?w=800&h=600&fit=crop",
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
			marketCap: { label: "Market Cap", value: "$200B", explanation: "Total company value", culturalTranslation: "mobile chip giant" },
			revenueGrowth: { label: "Revenue Growth", value: "12%", explanation: "Year-over-year growth", culturalTranslation: "steady growth" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "Profit percentage", culturalTranslation: "strong margins" },
			beta: { label: "Beta", value: "1.3", explanation: "Volatility measure", culturalTranslation: "tech volatility" },
			dividendYield: { label: "Dividend Yield", value: "2.1%", explanation: "Annual dividend payout", culturalTranslation: "decent income" },
		},
	},
	{
		id: "avgo",
		ticker: "AVGO",
		name: "Broadcom",
		bio: "infrastructure chips nobody sees but everyone needs",
		heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
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
			marketCap: { label: "Market Cap", value: "$650B", explanation: "Total company value", culturalTranslation: "infrastructure giant" },
			revenueGrowth: { label: "Revenue Growth", value: "15%", explanation: "Year-over-year growth", culturalTranslation: "M&A fueled growth" },
			profitMargin: { label: "Profit Margin", value: "35%", explanation: "Profit percentage", culturalTranslation: "excellent margins" },
			beta: { label: "Beta", value: "1.1", explanation: "Volatility measure", culturalTranslation: "relatively stable" },
			dividendYield: { label: "Dividend Yield", value: "1.9%", explanation: "Annual dividend payout", culturalTranslation: "consistent payouts" },
		},
	},
	{
		id: "mu",
		ticker: "MU",
		name: "Micron",
		bio: "memory chips in everything",
		heroImage: "https://images.unsplash.com/photo-1597852074816-d933c7d2b988?w=800&h=600&fit=crop",
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
	},
	{
		id: "asml",
		ticker: "ASML",
		name: "ASML",
		bio: "only company making chip-making machines",
		heroImage: "https://images.unsplash.com/photo-1580584126903-c17d41830450?w=800&h=600&fit=crop",
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
	},
	{
		id: "nee",
		ticker: "NEE",
		name: "NextEra Energy",
		bio: "making climate change solutions actually profitable",
		heroImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop",
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
	},
	{
		id: "enph",
		ticker: "ENPH",
		name: "Enphase",
		bio: "the tiny box that makes rooftop solar actually work",
		heroImage: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop",
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
	},
	{
		id: "fslr",
		ticker: "FSLR",
		name: "First Solar",
		bio: "building solar farms big enough to see from space",
		heroImage: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&h=600&fit=crop",
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
	},
	{
		id: "plug",
		ticker: "PLUG",
		name: "Plug Power",
		bio: "betting the farm on hydrogen when nobody asked",
		heroImage: "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=800&h=600&fit=crop",
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
	},
	{
		id: "xom",
		ticker: "XOM",
		name: "Exxon Mobil",
		bio: "dinosaur juice empire with 'we care now' PR",
		heroImage: "https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=600&fit=crop",
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
	},
	{
		id: "cvx",
		ticker: "CVX",
		name: "Chevron",
		bio: "pumping oil with one hand, planting trees with the other",
		heroImage: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=600&fit=crop",
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
	},
	{
		id: "v",
		ticker: "V",
		name: "Visa",
		bio: "the invisible toll booth on literally every purchase",
		heroImage: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&h=600&fit=crop",
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
	},
	{
		id: "ma",
		ticker: "MA",
		name: "Mastercard",
		bio: "Visa's slightly cooler twin with better marketing",
		heroImage: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop",
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
	},
	{
		id: "sq",
		ticker: "SQ",
		name: "Block",
		bio: "when Jack Dorsey left Twitter to focus on Bitcoin",
		heroImage: "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=800&h=600&fit=crop",
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
	},
	{
		id: "hood",
		ticker: "HOOD",
		name: "Robinhood",
		bio: "the casino that grew up and became your bank",
		heroImage: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop",
		personalityDescription: "turned your timeline into a stock ticker during GameStop",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 92, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 88, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Robinhood is the 'Super App' We Actually Use",
			sections: [
				{
					heading: "From Meme Stocks to Gold Cards",
					content:
						"Robinhood made trading free and added confetti when you buy stocks. They turned investing into a mobile game with real consequences. Millions of people YOLOing into meme stocks, buying fractional shares with lunch money, panic-selling at 3am. The app that made 'stonks only go up' a lifestyle. Revolutionary or reckless? Yes.",
				},
				{
					heading: "The Crypto Engine",
					content:
						"Despite the 'serious' rebrand, they are still the main on-ramp for crypto. When Bitcoin rips, Robinhood prints money. When Bitcoin crashes, Robinhood bleeds. It’s a leveraged bet on the entire crypto ecosystem.",
				},
				{
					heading: "Why It Matters",
					content:
						"They proved that 'commission-free' was just the start. By bundling trading, high-yield cash, and credit into one app, they are slowly killing traditional banks for anyone under 40. They aren't just a broker anymore; they are the financial operating system for the internet.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "41.30",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "surprisingly mature; paying 41x for triple-digit profit growth is actually a steal",
			},
			marketCap: {
				label: "Market Cap",
				value: "$89.5B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "slid back under $100B after the crypto crash, but still a fintech titan",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "74.6%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "hyper-growth mode; Gold subscriptions and crypto volume are compounding",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "43.7%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "printing cash; they've mastered the art of high-margin operational efficiency",
			},
			beta: {
				label: "Beta",
				value: "1.85",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "extreme volatility; it moves twice as hard as the market",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "no dividends; they are hoarding cash to fight the legacy banks",
			},
		},
	},
	{
		id: "sofi",
		ticker: "SOFI",
		name: "SoFi",
		bio: "bought a football stadium before figuring out profits",
		heroImage: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=600&fit=crop",
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
	},
	{
		id: "afrm",
		ticker: "AFRM",
		name: "Affirm",
		bio: "financing your impulse purchases guilt-free since 2012",
		heroImage: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&h=600&fit=crop",
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
	},
	{
		id: "txn",
		ticker: "TXN",
		name: "Texas Instruments",
		bio: "the TI-84 brand that also makes chips for everything",
		heroImage: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop",
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
	},
	{
		id: "nxpi",
		ticker: "NXPI",
		name: "NXP Semiconductors",
		bio: "chips in your car's brain you didn't know existed",
		heroImage: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&h=600&fit=crop",
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
	},
	{
		id: "mrvl",
		ticker: "MRVL",
		name: "Marvell",
		bio: "the unglamorous chips making cloud infrastructure actually work",
		heroImage: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=600&fit=crop",
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
	},
	{
		id: "wmt",
		ticker: "WMT",
		name: "Walmart",
		bio: "where America bulk-buys everything at 2am",
		heroImage: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&h=600&fit=crop",
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
	},
	{
		id: "tgt",
		ticker: "TGT",
		name: "Target",
		bio: "went in for milk, left with $200 of things you didn't need",
		heroImage: "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=800&h=600&fit=crop",
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
	},
	{
		id: "cost",
		ticker: "COST",
		name: "Costco",
		bio: "pay $60 to buy 48 rolls of toilet paper you don't need",
		heroImage: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=600&fit=crop",
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
	},
	{
		id: "hd",
		ticker: "HD",
		name: "Home Depot",
		bio: "where dads disappear for 3 hours buying one screw",
		heroImage: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&h=600&fit=crop",
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
	},
	{
		id: "low",
		ticker: "LOW",
		name: "Lowe's",
		bio: "Home Depot's friendlier blue apron twin",
		heroImage: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
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
	},
	{
		id: "mcd",
		ticker: "MCD",
		name: "McDonald's",
		bio: "always broken ice cream machine, never broken profits",
		heroImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop",
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
	},
	{
		id: "ko",
		ticker: "KO",
		name: "Coca-Cola",
		bio: "selling sugar water & nostalgia since before your grandparents",
		heroImage: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&h=600&fit=crop",
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
	},
	{
		id: "pep",
		ticker: "PEP",
		name: "PepsiCo",
		bio: "snacks & drinks empire",
		heroImage: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800&h=600&fit=crop",
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
	},
	{
		id: "pg",
		ticker: "PG",
		name: "Procter & Gamble",
		bio: "Tide, Pampers, Gillette—they own your entire routine",
		heroImage: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800&h=600&fit=crop",
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
	},
	{
		id: "jnj",
		ticker: "JNJ",
		name: "Johnson & Johnson",
		bio: "Band-Aids in your cabinet, lawsuits in the news",
		heroImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=600&fit=crop",
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
	},
	{
		id: "lmt",
		ticker: "LMT",
		name: "Lockheed Martin",
		bio: "billion-dollar fighter jets your tax dollars bought",
		heroImage: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&h=600&fit=crop",
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
	},
	{
		id: "ba",
		ticker: "BA",
		name: "Boeing",
		bio: "aerospace legacy trying to rebuild trust one inspection at a time",
		heroImage: "https://images.unsplash.com/photo-1750030951507-de461317da40?w=800&h=600&fit=crop",
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
	},
	{
		id: "unh",
		ticker: "UNH",
		name: "UnitedHealth",
		bio: "controls your insurance AND your doctor's paycheck",
		heroImage: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=600&fit=crop",
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
	},
	{
		id: "crm",
		ticker: "CRM",
		name: "Salesforce",
		bio: "the CRM software every sales team complains about using",
		heroImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
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
	},
	{
		id: "adbe",
		ticker: "ADBE",
		name: "Adobe",
		bio: "$60/month to remove backgrounds and sign PDFs",
		heroImage: "https://images.unsplash.com/photo-1561998338-13ad7883b20f?w=800&h=600&fit=crop",
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
	},
	{
		id: "now",
		ticker: "NOW",
		name: "ServiceNow",
		bio: "the IT ticketing system running every enterprise help desk",
		heroImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop",
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
	},
	{
		id: "intu",
		ticker: "INTU",
		name: "Intuit",
		bio: "profiting from tax season panic & small business chaos",
		heroImage: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&h=600&fit=crop",
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
	},
	{
		id: "amat",
		ticker: "AMAT",
		name: "Applied Materials",
		bio: "builds the machines that build the chips that run everything",
		heroImage: "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=800&h=600&fit=crop",
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
	},
	{
		id: "abnb",
		ticker: "ABNB",
		name: "Airbnb",
		bio: "ruined housing markets but gave you unique vacation vibes",
		heroImage: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop",
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
	},
	{
		id: "lyft",
		ticker: "LYFT",
		name: "Lyft",
		bio: "Uber's friendlier pink competitor that finally makes money",
		heroImage: "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=600&fit=crop",
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
	},
	{
		id: "ddog",
		ticker: "DDOG",
		name: "Datadog",
		bio: "watching your servers crash in beautiful real-time dashboards",
		heroImage: "https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=800&h=600&fit=crop",
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
	},
	{
		id: "snow",
		ticker: "SNOW",
		name: "Snowflake",
		bio: "where enterprises dump all their data and pay by the query",
		heroImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop",
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
	},
	{
		id: "mdb",
		ticker: "MDB",
		name: "MongoDB",
		bio: "the database every startup uses then regrets at scale",
		heroImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop",
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
	},
	{
		id: "panw",
		ticker: "PANW",
		name: "Palo Alto Networks",
		bio: "protecting enterprises from hackers & breaches since 2005",
		heroImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop",
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
	},
	{
		id: "crwd",
		ticker: "CRWD",
		name: "CrowdStrike",
		bio: "cloud security that stops hackers & their IPO was legendary",
		heroImage: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=800&h=600&fit=crop",
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
	},
	{
		id: "zm",
		ticker: "ZM",
		name: "Zoom",
		bio: "gave us Zoom fatigue then fought to stay relevant",
		heroImage: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=800&h=600&fit=crop",
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
	},
	{
		id: "pltr",
		ticker: "PLTR",
		name: "Palantir",
		bio: "CIA-backed data analytics with cult stock following",
		heroImage: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=600&fit=crop",
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
	},
	{
		id: "hon",
		ticker: "HON",
		name: "Honeywell",
		bio: "your thermostat maker also builds quantum computers somehow",
		heroImage: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop",
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
	},
	{
		id: "or",
		ticker: "OR.PA",
		name: "L'Oréal",
		bio: "owns everything in your bathroom from CeraVe to YSL",
		heroImage: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop",
		personalityDescription: "The final boss of the beauty industry",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 98, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 70, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why L'Oréal is the Beauty Monopoly",
			sections: [
				{
					heading: "The Portfolio Powerhouse",
					content:
						"L'Oréal isn't just a brand; it's a holding company for every aesthetic you know. They own the drugstore (CeraVe, Maybelline), the salon (Redken, Kérastase), and the luxury counter (Lancôme, YSL, Armani). They basically collect beauty brands like Pokémon.",
				},
				{
					heading: "Science > Hype",
					content:
						"While other brands chase TikTok trends, L'Oréal drops billions on R&D to invent molecules that actually work. They play the long game, convincing dermatologists and influencers alike that they own the science of skin.",
				},
				{
					heading: "Why It Matters",
					content:
						"In a recession, you still buy shampoo and concealer. L'Oréal's massive diversification makes it the 'safe haven' of the sector. It’s the beauty stock you buy and delete the app for 10 years.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "33.44",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "premium pricing for the undisputed king of the sector",
			},
			marketCap: {
				label: "Market Cap",
				value: "$223.5B", // converted from €207B
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "a European giant that dwarfs every competitor",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "2.6%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "slow and steady; it's hard to double when you're already everywhere",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "19.0%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "elite efficiency driven by massive scale advantages",
			},
			beta: {
				label: "Beta",
				value: "0.83",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "low volatility; the defensive play for turbulent markets",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "1.83%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "consistent payouts funded by selling billions of mascaras",
			},
		},
	},
	{
		id: "el",
		ticker: "EL",
		name: "Estée Lauder",
		bio: "old money aesthetics trying to fix a new money problem",
		heroImage: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&h=600&fit=crop",
		personalityDescription: "The rich grandmother currently restructuring her trust fund",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 92, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 85, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 40, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Estée Lauder is in its 'Reputation' Era",
			sections: [
				{
					heading: "The Prestige Trap",
					content:
						"Estée Lauder (La Mer, MAC, Clinique) bet everything on 'Prestige Beauty' and travel retail in China. When that market slowed down, the stock crashed hard. Now they are in full turnaround mode, cutting costs and trying to make Clinique cool for Gen Z again.",
				},
				{
					heading: "The Profit Recovery Plan",
					content:
						"Management is executing a massive 'Profit Recovery Plan' to fix broken margins. It involves layoffs, supply chain fixes, and a desperate pivot to TikTok virality. It's a high-stakes corporate makeover.",
				},
				{
					heading: "Why It Matters",
					content:
						"EL is the ultimate 'fallen angel' trade. If they fix the business, the stock could double. If they don't, they might get broken up or acquired. Investors are watching the turnaround like a reality TV finale.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "-44.60",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "currently losing money on paper due to massive restructuring charges",
			},
			marketCap: {
				label: "Market Cap",
				value: "$41.5B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "down significantly from its peak, reflecting the recent crisis",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "5.3%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "finally showing signs of life after a brutal 2025",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "-1.8%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "burning cash to fix the foundation; profitability is the goal for 2027",
			},
			beta: {
				label: "Beta",
				value: "1.50",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "highly volatile as the market reacts to every piece of turnaround news",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "1.21%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "they kept the dividend to stop investors from revolting",
			},
		},
	},
	{
		id: "elf",
		ticker: "ELF",
		name: "e.l.f. Beauty",
		bio: "dupe culture turned into a billion-dollar empire",
		heroImage: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=600&fit=crop",
		personalityDescription: "The chaotic Gen Z genius who hacked capitalism",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 98, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why e.l.f. Owns Your FYP",
			sections: [
				{
					heading: "The Art of the Dupe",
					content:
						"e.l.f. (Eyes Lips Face) mastered the art of 'duping' luxury products legally. $40 primer? e.l.f. has it for $10. They move faster than anyone, launching products weeks after a trend starts on TikTok. They turned 'cheap' into 'smart.'",
				},
				{
					heading: "Marketing Genius",
					content:
						"From Super Bowl ads with Jennifer Coolidge to Roblox integrations, e.l.f. is everywhere Gen Z exists. They don't just buy ads; they create cultural moments. They've delivered 27 consecutive quarters of growth, which is unheard of in beauty.",
				},
				{
					heading: "Why It Matters",
					content:
						"e.l.f. proved that mass-market beauty doesn't have to be boring. They are eating market share from heritage brands by being faster, cheaper, and louder. It's a high-growth stock with a valuation to match.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "60.24",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "priced for perfection; investors expect the winning streak to last forever",
			},
			marketCap: {
				label: "Market Cap",
				value: "$5.1B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "small but punching way above its weight class",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "18.0%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "double-digit growth that makes legacy brands jealous",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "10.0%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "healthy margins despite low price points—that's the volume game",
			},
			beta: {
				label: "Beta",
				value: "1.70",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "volatile growth stock energy; big moves in both directions",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "all profits go back into marketing and product launches",
			},
		},
	},
	{
		id: "ulta",
		ticker: "ULTA",
		name: "Ulta Beauty",
		bio: "the target of beauty where you accidentally spend $200",
		heroImage: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600&fit=crop",
		personalityDescription: "The retail queen hitting all-time highs",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 20, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Ulta is the Beauty Playground",
			sections: [
				{
					heading: "High-Low Mix",
					content:
						"Ulta is the only place where you can buy $80 Chanel perfume and $5 essence mascara in the same basket. They cracked the code of mixing prestige and mass beauty, making it the default destination for everyone.",
				},
				{
					heading: "The Unleashed Turnaround",
					content:
						"After a shaky 2024, Ulta launched its 'Unleashed' strategy, and it's working. The stock hit all-time highs in Jan 2026. Their loyalty program (Ultamate Rewards) is basically a secondary currency for makeup lovers.",
				},
				{
					heading: "Why It Matters",
					content:
						"Ulta controls the physical retail experience in the US. While Sephora focuses on malls, Ulta is in every strip center in suburbia. They own the convenience factor and the loyalty data.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "24.81",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "fairly valued for a retailer executing a perfect turnaround",
			},
			marketCap: {
				label: "Market Cap",
				value: "$28.7B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "dominant domestic retailer hitting new valuation records",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "6.0%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "solid steady growth driven by new store openings",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "11.5%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "strong retail margins thanks to that massive loyalty program",
			},
			beta: {
				label: "Beta",
				value: "1.00",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "perfectly synced with the market; stability at its finest",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "buybacks over dividends; they prefer reducing share count",
			},
		},
	},
	{
		id: "coty",
		ticker: "COTY",
		name: "Coty",
		bio: "the chaotic perfume house trying to get its act together",
		heroImage: "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&h=600&fit=crop",
		personalityDescription: "The fragrance empire with a messy balance sheet",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 80, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 60, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Coty Smells Like Risk and Reward",
			sections: [
				{
					heading: "The Fragrance Factory",
					content:
						"If you own a designer perfume (Gucci, Burberry, Hugo Boss), Coty probably made it. They dominate the fragrance market and are betting big on 'Prestige' scents as people splurge on looking (and smelling) rich.",
				},
				{
					heading: "Kylie & Kim Connection",
					content:
						"Coty owns a chunk of Kylie Cosmetics and KKW Beauty. It was a massive bet on the Kardashian/Jenner influence. It brought hype, but also volatility. They are constantly trying to balance high-fashion licenses with celebrity trends.",
				},
				{
					heading: "Why It Matters",
					content:
						"Coty is the leverage play. High debt, low stock price, but massive potential if they execute. They are trying to premium-ize everything to fix their margins. It's a risky bet on the 'Lipstick Effect'—that people keep buying perfume even when broke.",
				},
			],
		},
		financials: {
			peRatio: {
				label: "P/E Ratio",
				value: "-7.08",
				explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit",
				culturalTranslation: "negative earnings currently, but forward estimates look cheaper",
			},
			marketCap: {
				label: "Market Cap",
				value: "$2.77B",
				explanation: "The total value of all the company's shares combined",
				culturalTranslation: "small cap territory; a fraction of its competitors",
			},
			revenueGrowth: {
				label: "Revenue Growth",
				value: "10.0%",
				explanation: "How much more money the company is making compared to last year",
				culturalTranslation: "decent top-line growth driven by prestige fragrance demand",
			},
			profitMargin: {
				label: "Profit Margin",
				value: "1.2%",
				explanation: "What percentage of each sale becomes actual profit",
				culturalTranslation: "razor thin; debt interest payments eat up most of the cash",
			},
			beta: {
				label: "Beta",
				value: "1.12",
				explanation: "How much the stock price swings compared to the overall market",
				culturalTranslation: "choppy trading; moves with consumer spending trends",
			},
			dividendYield: {
				label: "Dividend Yield",
				value: "0%",
				explanation: "The percentage of the stock price paid out as dividends each year",
				culturalTranslation: "no chance of dividends until the debt pile is gone",
			},
		},
	},
	{
		id: "jpm",
		ticker: "JPM",
		name: "JPMorgan Chase",
		bio: "the wall street empire that owns the block and charges rent",
		heroImage: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop",
		personalityDescription: "The well-dressed guy at the party who actually owns the venue",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 42, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why JPMorgan Runs the Financial Universe",
			sections: [
				{ heading: "The Big Dog", content: "JPMorgan is the largest US bank by assets. They absorbed Bear Stearns, Washington Mutual, and First Republic — basically the cleanup crew of every banking crisis." },
				{ heading: "What They Do", content: "Investment banking, retail banking, credit cards, wealth management, and trading desks. If money is changing hands somewhere, JPMorgan has a cut of it." },
				{ heading: "Why It Matters", content: "When Jamie Dimon publishes his annual letter, every investor reads it. JPMorgan shapes how the financial world understands itself." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "13.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable price for total market dominance" },
			marketCap: { label: "Market Cap", value: "$580B", explanation: "The total value of all the company's shares combined", culturalTranslation: "the biggest US bank by a country mile" },
			revenueGrowth: { label: "Revenue Growth", value: "22%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "high rates have been printing money for them" },
			profitMargin: { label: "Profit Margin", value: "31%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "banking is insanely profitable at scale" },
			beta: { label: "Beta", value: "1.15", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moves with the market but not wildly" },
			dividendYield: { label: "Dividend Yield", value: "2.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "pays you to hold — classic wealth building" },
		},
	},
	{
		id: "gs",
		ticker: "GS",
		name: "Goldman Sachs",
		bio: "the white-shoe bank that makes money in any market condition",
		heroImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
		personalityDescription: "The finance villain everyone secretly wants to work for",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Goldman Sachs Is the Ivy League of Banking",
			sections: [
				{ heading: "The Prestige Play", content: "Goldman Sachs is the most prestigious name in investment banking. Their analysts are recruited from the top schools and work punishing hours in exchange for life-changing compensation." },
				{ heading: "The Tentacles", content: "They're in M&A advisory, trading, consumer banking (Marcus), wealth management, and asset management. Goldman has reinvented itself multiple times and survived every time." },
				{ heading: "Why It Matters", content: "Goldman's alumni run the world — literally. Former Goldman partners have led the Fed, the Treasury, the ECB, and countless major corporations." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "12.1", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "good value for the prestige name" },
			marketCap: { label: "Market Cap", value: "$145B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive but not as large as JPMorgan" },
			revenueGrowth: { label: "Revenue Growth", value: "16%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "profits swing hard with markets" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "when business is good, it's really good" },
			beta: { label: "Beta", value: "1.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "more volatile than most financials" },
			dividendYield: { label: "Dividend Yield", value: "2.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reliable income for long-term holders" },
		},
	},
	{
		id: "ms",
		ticker: "MS",
		name: "Morgan Stanley",
		bio: "the slightly calmer Goldman that got into wealth management early",
		heroImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
		personalityDescription: "The finance bro who peaked at 30 and has been coasting since",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Morgan Stanley Chose Wealth Over Chaos",
			sections: [
				{ heading: "The Pivot", content: "Morgan Stanley was a pure investment bank — risky, cyclical, volatile. Then they acquired E*TRADE and Smith Barney, transforming into a wealth management powerhouse with steady, recurring revenue." },
				{ heading: "Fee Machine", content: "Their wealth management business manages over $4 trillion in client assets. Fees flow in whether markets are up or down, which is exactly the stability investors love." },
				{ heading: "Why It Matters", content: "Morgan Stanley proved a Wall Street bank could reinvent itself into something more stable and predictable. Their model is now what other banks are trying to copy." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "16.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "priced for steady compounding" },
			marketCap: { label: "Market Cap", value: "$155B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large but not JPMorgan large" },
			revenueGrowth: { label: "Revenue Growth", value: "12%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "shifting to stable wealth fees" },
			profitMargin: { label: "Profit Margin", value: "24%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from recurring fees" },
			beta: { label: "Beta", value: "1.35", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "less volatile than pure investment banks" },
			dividendYield: { label: "Dividend Yield", value: "3.1%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend for a financial stock" },
		},
	},
	{
		id: "c",
		ticker: "C",
		name: "Citigroup",
		bio: "the global bank that had a near-death experience and survived",
		heroImage: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop",
		personalityDescription: "The comeback kid that's been restructuring since 2008",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 48, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Citi Is the World's Most Ambitious Turnaround",
			sections: [
				{ heading: "The Almost-Collapse", content: "Citi nearly failed in 2008 and required a government bailout. They've spent the 15 years since selling off pieces and trying to refocus the business." },
				{ heading: "The Global Play", content: "Citi operates in more countries than any other US bank. Their Treasury and Trade Solutions business moves trillions of dollars for multinational corporations every day." },
				{ heading: "Why It Matters", content: "Citi's turnaround, led by CEO Jane Fraser, is one of the most watched transformation stories in banking. If it works, the stock is deeply undervalued. If not, it's a cautionary tale." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "9.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap if the turnaround actually works" },
			marketCap: { label: "Market Cap", value: "$120B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significantly undervalued vs peers" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "still figuring out the growth story" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "margins improving but still below rivals" },
			beta: { label: "Beta", value: "1.58", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "carries more risk than other big banks" },
			dividendYield: { label: "Dividend Yield", value: "3.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield for a big bank" },
		},
	},
	{
		id: "bac",
		ticker: "BAC",
		name: "Bank of America",
		bio: "your parents' bank that's quietly become Warren Buffett's favorite",
		heroImage: "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800&h=600&fit=crop",
		personalityDescription: "The reliable dad friend who always has good financial advice",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Bank of America Became Buffett's Favorite Bank",
			sections: [
				{ heading: "The Consumer Giant", content: "Bank of America serves nearly half of all US households. They're everywhere — branches, ATMs, credit cards, mortgages. The scale is almost impossible to replicate." },
				{ heading: "The Buffett Stamp", content: "Warren Buffett has been Bank of America's biggest fan for over a decade, owning billions of shares. When the Oracle of Omaha won't stop buying your stock, people take notice." },
				{ heading: "Why It Matters", content: "BofA benefits enormously from rising interest rates — their massive deposit base essentially earns more free money from the Fed when rates are high." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "11.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "bargain if rates stay elevated" },
			marketCap: { label: "Market Cap", value: "$310B", explanation: "The total value of all the company's shares combined", culturalTranslation: "second-largest US bank by most measures" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "rate sensitivity makes this volatile" },
			profitMargin: { label: "Profit Margin", value: "27%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "very profitable in high-rate environment" },
			beta: { label: "Beta", value: "1.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "rate-sensitive but not crazy volatile" },
			dividendYield: { label: "Dividend Yield", value: "2.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "healthy payout for income seekers" },
		},
	},
	{
		id: "wfc",
		ticker: "WFC",
		name: "Wells Fargo",
		bio: "the bank that had a fake accounts scandal and is still in timeout",
		heroImage: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800&h=600&fit=crop",
		personalityDescription: "The guy who got caught cheating and is trying to prove themselves",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 72, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Wells Fargo Is Still in the Penalty Box",
			sections: [
				{ heading: "The Scandal", content: "Between 2011 and 2016, Wells Fargo employees opened millions of fake accounts without customer consent to hit sales targets. The resulting scandal cost billions in fines and shattered trust." },
				{ heading: "The Asset Cap", content: "The Federal Reserve placed an asset cap on Wells Fargo in 2018, limiting how big they can grow until they fix their problems. It's the regulatory version of being grounded." },
				{ heading: "Why It Matters", content: "Wells Fargo's story is a cautionary tale about toxic sales culture. But it's also a turnaround story — the bank still has massive deposits and branches, and the cap will eventually be lifted." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "12.3", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap stock for a reason — but maybe worth the risk" },
			marketCap: { label: "Market Cap", value: "$220B", explanation: "The total value of all the company's shares combined", culturalTranslation: "huge bank trading at a discount to peers" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growth limited by the regulatory cap" },
			profitMargin: { label: "Profit Margin", value: "23%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "still generating enormous profits despite everything" },
			beta: { label: "Beta", value: "1.30", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "bounded by the asset cap drama" },
			dividendYield: { label: "Dividend Yield", value: "2.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield while you wait for the turnaround" },
		},
	},
	{
		id: "blk",
		ticker: "BLK",
		name: "BlackRock",
		bio: "they own a piece of literally everything in your retirement account",
		heroImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop",
		personalityDescription: "The landlord of the entire financial system",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 92, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why BlackRock Quietly Owns a Piece of Everything",
			sections: [
				{ heading: "The Scale", content: "BlackRock manages over $10 trillion in assets — more than the GDP of every country except the US and China. Their iShares ETFs are in almost every retirement account and pension fund." },
				{ heading: "The Influence", content: "Because they own pieces of every major public company through index funds, BlackRock has outsized voting power on corporate decisions. They've become the de facto regulator of ESG investing." },
				{ heading: "Why It Matters", content: "When BlackRock changes its stance on climate or governance, companies actually change their behavior. That's the kind of institutional influence that transcends normal investing." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "21.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the world's biggest asset manager" },
			marketCap: { label: "Market Cap", value: "$120B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive and still growing with every retirement contribution" },
			revenueGrowth: { label: "Revenue Growth", value: "14%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "AUM fees grow as markets rise" },
			profitMargin: { label: "Profit Margin", value: "32%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "incredible margins on passive investing" },
			beta: { label: "Beta", value: "1.25", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "relatively stable for a financial firm" },
			dividendYield: { label: "Dividend Yield", value: "2.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "respectable yield from a quality compounder" },
		},
	},
	{
		id: "axp",
		ticker: "AXP",
		name: "American Express",
		bio: "the status card that charges you a fee just to feel rich",
		heroImage: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop",
		personalityDescription: "The velvet rope that costs $695 a year to stand behind",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 70, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why American Express Sells Status as a Product",
			sections: [
				{ heading: "The Premium Model", content: "AmEx operates differently from Visa and Mastercard — they're actually the lender, not just the network. They target high-income spenders and charge annual fees that Visa would never dare." },
				{ heading: "The Centurion Effect", content: "The Black Card is so exclusive AmEx doesn't even publicly advertise how to get one. That mystery is a feature, not a bug — it keeps the aspirational energy alive at every income level." },
				{ heading: "Why It Matters", content: "AmEx's customers spend more and default less than average credit card users. In a downturn, their premium positioning is actually a strength — wealthy cardholders keep spending." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "19.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium valuation for premium brand" },
			marketCap: { label: "Market Cap", value: "$175B", explanation: "The total value of all the company's shares combined", culturalTranslation: "one of Buffett's core long-term holdings" },
			revenueGrowth: { label: "Revenue Growth", value: "11%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent growth from high-spending cardholders" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from fees and interest" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "relatively stable in most market conditions" },
			dividendYield: { label: "Dividend Yield", value: "1.1%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — they prefer buybacks" },
		},
	},
	{
		id: "cof",
		ticker: "COF",
		name: "Capital One",
		bio: "what's in your wallet? apparently their entire marketing budget",
		heroImage: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&h=600&fit=crop",
		personalityDescription: "The scrappy challenger bank that actually listened to what customers wanted",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 42, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 60, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Capital One Disrupted Banking With Data",
			sections: [
				{ heading: "The Data-First Bank", content: "Capital One was built from day one around data analytics. They were using machine learning before that was even a term — to price credit cards, predict defaults, and find customers everyone else missed." },
				{ heading: "The Culture Hack", content: "Their 'What's in your wallet?' campaign ran for decades and became one of the most recognized taglines in financial services. Marketing that good doesn't happen by accident." },
				{ heading: "Why It Matters", content: "Capital One proved a financial company could be built on technology first. Their acquisition of Discover Financial is creating a payments powerhouse to challenge Visa and Mastercard." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "11.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonably priced for a data-driven bank" },
			marketCap: { label: "Market Cap", value: "$75B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-tier bank going for major-league ambitions" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing through the Discover acquisition" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins in credit card business" },
			beta: { label: "Beta", value: "1.62", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "more volatile than the biggest banks" },
			dividendYield: { label: "Dividend Yield", value: "1.7%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield but steady buybacks" },
		},
	},
	{
		id: "schw",
		ticker: "SCHW",
		name: "Charles Schwab",
		bio: "the brokerage that made investing feel less scary for normal people",
		heroImage: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop",
		personalityDescription: "The friendly uncle who explains your 401k without making you feel dumb",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Schwab Democratized Investing",
			sections: [
				{ heading: "The Commission Killer", content: "In 2019 Schwab cut trading commissions to zero. Every other brokerage had to follow. It was a power move that hurt their short-term revenue and crushed competitors — all at once." },
				{ heading: "The TD Ameritrade Merger", content: "Schwab's acquisition of TD Ameritrade created a brokerage giant with over 35 million accounts. Scale in this business translates directly into margin power." },
				{ heading: "Why It Matters", content: "Schwab sits at the center of the retail investing boom. Every new investor opening a Robinhood account is eventually likely to end up at Schwab as they get more serious." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "somewhat pricey given recent rate headwinds" },
			marketCap: { label: "Market Cap", value: "$120B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive but cheap compared to a few years ago" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "recovering from the rate shock of 2023" },
			profitMargin: { label: "Profit Margin", value: "35%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "incredibly profitable when rates cooperate" },
			beta: { label: "Beta", value: "1.35", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moved hard with the banking crisis fears of 2023" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small but growing dividend" },
		},
	},
	{
		id: "bx",
		ticker: "BX",
		name: "Blackstone",
		bio: "private equity's biggest empire — they own your apartment building",
		heroImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
		personalityDescription: "The hedge fund that bought your neighborhood and tripled rents",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 90, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 58, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Blackstone Is Private Equity's Main Character",
			sections: [
				{ heading: "The AUM Machine", content: "Blackstone manages over $1 trillion in alternative assets — private equity, real estate, credit, hedge funds. They built the fee-earning machine that every other alt manager is trying to replicate." },
				{ heading: "The Real Estate Play", content: "Blackstone is one of the largest landlords in the world. When they say they're investing in real estate, they mean they're buying thousands of apartment buildings across entire cities." },
				{ heading: "Why It Matters", content: "Blackstone's model — raise money from institutions, buy assets, charge fees, return capital — has been so successful that it's completely reshaped how capital gets allocated globally." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "24.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium but justified by the fee model" },
			marketCap: { label: "Market Cap", value: "$175B", explanation: "The total value of all the company's shares combined", culturalTranslation: "elite firm at an elite price" },
			revenueGrowth: { label: "Revenue Growth", value: "15%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing rapidly as institutions pile into alternatives" },
			profitMargin: { label: "Profit Margin", value: "38%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "extraordinary margins on fee income" },
			beta: { label: "Beta", value: "1.55", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "swings with private market sentiment" },
			dividendYield: { label: "Dividend Yield", value: "2.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "distributions vary with realizations" },
		},
	},
	{
		id: "kkr",
		ticker: "KKR",
		name: "KKR",
		bio: "the leveraged buyout firm that invented the private equity playbook",
		heroImage: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop",
		personalityDescription: "The guy who buys struggling companies, fixes them up, and flips them",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 52, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why KKR Literally Invented Modern Private Equity",
			sections: [
				{ heading: "The Original Raiders", content: "KKR's 1989 leveraged buyout of RJR Nabisco was the deal that defined an era — immortalized in the book and movie 'Barbarians at the Gate.' They invented what private equity looks like today." },
				{ heading: "The Transformation", content: "KKR has evolved from a buyout shop into a full-service alternative asset manager with credit, infrastructure, real estate, and insurance alongside their classic PE business." },
				{ heading: "Why It Matters", content: "KKR's co-founders Henry Kravis and George Roberts shaped global capitalism more than almost any investor alive. Their legacy is the entire private equity industry." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fairly valued for the private equity leader" },
			marketCap: { label: "Market Cap", value: "$95B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large but room to grow" },
			revenueGrowth: { label: "Revenue Growth", value: "18%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "diversifying revenue streams nicely" },
			profitMargin: { label: "Profit Margin", value: "35%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "very high margins when deals flow" },
			beta: { label: "Beta", value: "1.62", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile with deal market sentiment" },
			dividendYield: { label: "Dividend Yield", value: "0.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "minimal yield — they reinvest aggressively" },
		},
	},
	{
		id: "apo",
		ticker: "APO",
		name: "Apollo Global",
		bio: "the credit and private equity powerhouse that moves faster than anyone",
		heroImage: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=600&fit=crop",
		personalityDescription: "The aggressive dealmaker who never met a situation too complicated",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 50, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Apollo Does Alternative Investing Differently",
			sections: [
				{ heading: "The Credit Machine", content: "Apollo is more focused on credit than traditional buyout PE. They lend to companies others won't touch, at rates others won't accept. It's riskier but incredibly profitable." },
				{ heading: "The Athene Deal", content: "Apollo's merger with Athene, an insurance company, gave them a permanent capital vehicle worth hundreds of billions. It's a genius structure that funds deals without constantly raising new money." },
				{ heading: "Why It Matters", content: "Apollo's approach to alternative investing — particularly hybrid credit — has become a model for the industry. Their co-founder Marc Rowan is one of the most innovative minds in finance." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "16.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonably priced for an innovative alt manager" },
			marketCap: { label: "Market Cap", value: "$90B", explanation: "The total value of all the company's shares combined", culturalTranslation: "growing fast and still has room" },
			revenueGrowth: { label: "Revenue Growth", value: "20%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "credit and alternatives are booming categories" },
			profitMargin: { label: "Profit Margin", value: "32%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins across the platform" },
			beta: { label: "Beta", value: "1.70", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile with credit market conditions" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "growing distribution as business matures" },
		},
	},
	{
		id: "aig",
		ticker: "AIG",
		name: "AIG",
		bio: "the insurance giant that almost took down the global economy in 2008",
		heroImage: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop",
		personalityDescription: "The reformed bad boy who swears they've changed (and actually kind of have)",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 80, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why AIG's Name Still Makes Central Bankers Nervous",
			sections: [
				{ heading: "The 2008 Collapse", content: "AIG sold credit default swaps on mortgage-backed securities without having the capital to back them up. When housing crashed, the US government had to bail them out with $182 billion — the largest corporate bailout in history." },
				{ heading: "The Reinvention", content: "Post-crisis AIG has divested dozens of businesses, simplified the company, and refocused on core property and casualty insurance. The stock is a fraction of its pre-crisis price." },
				{ heading: "Why It Matters", content: "AIG is a reminder of what happens when financial innovation outruns risk management. The company has rebuilt but the scar tissue is permanent." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap but carries significant legacy baggage" },
			marketCap: { label: "Market Cap", value: "$48B", explanation: "The total value of all the company's shares combined", culturalTranslation: "once worth 10x more — now a shadow of former self" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow, steady rebuilding of the business" },
			profitMargin: { label: "Profit Margin", value: "12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "margins recovering but below historical levels" },
			beta: { label: "Beta", value: "1.38", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "still seen as a risk-on financial name" },
			dividendYield: { label: "Dividend Yield", value: "2.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "decent yield for the recovery story" },
		},
	},
	{
		id: "met",
		ticker: "MET",
		name: "MetLife",
		bio: "life insurance with a Snoopy mascot and a trillion in assets",
		heroImage: "https://images.unsplash.com/photo-1591035897819-f4bdf739f446?w=800&h=600&fit=crop",
		personalityDescription: "The boring but reliable friend you'd want handling your parents' estate",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 40, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why MetLife Is Boring in the Best Possible Way",
			sections: [
				{ heading: "The Stability Play", content: "MetLife has been selling life insurance since 1868. They're the definition of boring — and in insurance, boring usually means profitable. Their balance sheet spans over $700 billion in assets." },
				{ heading: "The Spinoff", content: "MetLife spun off its US retail life insurance business as Brighthouse Financial in 2017, refocusing on group benefits and global insurance. The Snoopy branding went with the retail business." },
				{ heading: "Why It Matters", content: "Insurance companies like MetLife are essentially enormous investment funds. They collect premiums, invest them conservatively, and pay claims. When done right, it compounds for decades." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "9.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "value priced for a boring but dependable business" },
			marketCap: { label: "Market Cap", value: "$47B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large insurer at a fair price" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth but predictable" },
			profitMargin: { label: "Profit Margin", value: "9%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from disciplined underwriting" },
			beta: { label: "Beta", value: "0.98", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "less volatile than average — insurance is defensive" },
			dividendYield: { label: "Dividend Yield", value: "3.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield for income seekers" },
		},
	},
	{
		id: "pru",
		ticker: "PRU",
		name: "Prudential",
		bio: "life insurance and retirement solutions for the long game crowd",
		heroImage: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&h=600&fit=crop",
		personalityDescription: "The financial planner who shows up at family dinners uninvited but is actually useful",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 38, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Prudential Wins With the Long Game",
			sections: [
				{ heading: "The Retirement Machine", content: "Prudential manages over $1.5 trillion in assets, mostly for people trying to fund retirements. As baby boomers age and Gen X approaches retirement, the market only gets bigger." },
				{ heading: "The Global Reach", content: "Unlike most US insurers, Prudential has significant operations in Japan, Brazil, and other emerging markets. International exposure adds complexity but also upside." },
				{ heading: "Why It Matters", content: "The US retirement savings gap is enormous. Prudential sits in the perfect position to help close it — and charge fees on every dollar that flows through their system." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap relative to the retirement opportunity ahead" },
			marketCap: { label: "Market Cap", value: "$40B", explanation: "The total value of all the company's shares combined", culturalTranslation: "well-capitalized and growing steadily" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "international growth supplementing US business" },
			profitMargin: { label: "Profit Margin", value: "10%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins for a complex insurance conglomerate" },
			beta: { label: "Beta", value: "1.12", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for a financial stock" },
			dividendYield: { label: "Dividend Yield", value: "4.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield makes it attractive for income investors" },
		},
	},
	{
		id: "afl",
		ticker: "AFL",
		name: "Aflac",
		bio: "the duck with a 40-year winning streak in supplemental insurance",
		heroImage: "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&h=600&fit=crop",
		personalityDescription: "The mascot that accidentally became a financial stability icon",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 60, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why the Aflac Duck Made Insurance Interesting",
			sections: [
				{ heading: "The Duck Campaign", content: "Aflac's advertising duck is one of the most recognized brand characters in corporate America. It turned a boring supplemental insurance product into something people actually remember." },
				{ heading: "The Japan Dependency", content: "About 70% of Aflac's revenue comes from Japan, where supplemental insurance is deeply embedded in the culture. The yen's weakness vs the dollar is a constant currency headwind." },
				{ heading: "Why It Matters", content: "Aflac has raised its dividend for 40+ consecutive years, making it a Dividend Aristocrat. In insurance terms, that kind of consistency is nearly unheard of." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for a dividend aristocrat" },
			marketCap: { label: "Market Cap", value: "$50B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-sized insurer with outsized brand recognition" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow but steady compounder" },
			profitMargin: { label: "Profit Margin", value: "14%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from the supplemental model" },
			beta: { label: "Beta", value: "0.85", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive — doesn't move much with markets" },
			dividendYield: { label: "Dividend Yield", value: "2.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield with decades of consecutive increases" },
		},
	},
	{
		id: "all",
		ticker: "ALL",
		name: "Allstate",
		bio: "you're in good hands unless you actually need to file a claim",
		heroImage: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&h=600&fit=crop",
		personalityDescription: "The landlord of risk — everyone needs them but nobody loves paying",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 52, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Allstate Keeps the Lights On No Matter What",
			sections: [
				{ heading: "The Home and Auto Giant", content: "Allstate is one of the largest personal lines insurers in the US. They insure homes, cars, and lives for tens of millions of Americans — and rates have been rising sharply." },
				{ heading: "The Rate Reset", content: "After catastrophic losses from natural disasters and inflation driving up claims costs, Allstate aggressively raised premiums. It hurt short-term growth but improved profitability dramatically." },
				{ heading: "Why It Matters", content: "Climate change is reshaping insurance geography. Allstate and peers have pulled out of California and Florida — showing that some risks are becoming uninsurable." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "13.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "insurance is repricing and that's good for Allstate" },
			marketCap: { label: "Market Cap", value: "$52B", explanation: "The total value of all the company's shares combined", culturalTranslation: "major insurer benefiting from hard market conditions" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong growth as premium rates rise" },
			profitMargin: { label: "Profit Margin", value: "8%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "margins improving as catastrophe losses normalize" },
			beta: { label: "Beta", value: "0.68", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very defensive stock — low correlation to market" },
			dividendYield: { label: "Dividend Yield", value: "2.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "steady but not high yield" },
		},
	},
	{
		id: "cb",
		ticker: "CB",
		name: "Chubb",
		bio: "high-net-worth insurance for people who actually have things to protect",
		heroImage: "https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=800&h=600&fit=crop",
		personalityDescription: "The tailor-made insurance for people whose car costs more than your house",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Chubb Is Insurance's Premium Brand",
			sections: [
				{ heading: "The High-Net-Worth Niche", content: "Chubb focuses on insuring wealthy individuals and commercial clients with complex needs. Their customers have yachts, art collections, vacation homes — and they pay premiums accordingly." },
				{ heading: "The Warren Buffett Co-Sign", content: "Warren Buffett quietly accumulated a huge position in Chubb in 2024, confirming what many already suspected — it's one of the best-run insurance companies in the world." },
				{ heading: "Why It Matters", content: "Chubb's underwriting discipline is legendary. They walk away from bad risks rather than chase premium volume. That discipline is rare in insurance and valuable." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium valuation for premium underwriting" },
			marketCap: { label: "Market Cap", value: "$115B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large well-run insurer at a fair price" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent growth from disciplined underwriting" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "one of the best underwriting margins in the industry" },
			beta: { label: "Beta", value: "0.68", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low volatility — insurance is defensive" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield — they prefer buybacks and compounding" },
		},
	},
	{
		id: "trv",
		ticker: "TRV",
		name: "Travelers",
		bio: "property and casualty insurance with a century of boring profitability",
		heroImage: "https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=800&h=600&fit=crop",
		personalityDescription: "The actuarial nerd who calculates your risk before you've even parked",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 20, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 40, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Travelers Is the Definition of Insurance Done Right",
			sections: [
				{ heading: "The P&C Giant", content: "Travelers is one of the largest property and casualty insurers in the US, part of the Dow Jones Industrial Average. They've been profitable for over 100 years by simply underwriting risks well." },
				{ heading: "The Pricing Power", content: "Insurance is one of the few industries where you can raise prices almost every year and customers have no real choice but to pay. Travelers uses that pricing power with discipline." },
				{ heading: "Why It Matters", content: "Travelers' inclusion in the Dow is a statement about how important insurance is to the US economy. It's the unsexy business that keeps everything else running." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "11.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair price for a century-old compounder" },
			marketCap: { label: "Market Cap", value: "$52B", explanation: "The total value of all the company's shares combined", culturalTranslation: "solid mid-size insurer at reasonable value" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "hard insurance market boosting revenue" },
			profitMargin: { label: "Profit Margin", value: "12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong underwriting margins" },
			beta: { label: "Beta", value: "0.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive stock with low market correlation" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "steady dividend grower for decades" },
		},
	},
	{
		id: "hig",
		ticker: "HIG",
		name: "Hartford Financial",
		bio: "old school insurance that's been protecting stuff since 1810",
		heroImage: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
		personalityDescription: "The history teacher of financial services — been around longer than the country",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 38, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Hartford Is the Oldest Story in Insurance",
			sections: [
				{ heading: "The Colonial Heritage", content: "The Hartford was founded in 1810, making it one of the oldest continuously operating insurance companies in America. They've survived wars, depressions, and disasters for over 200 years." },
				{ heading: "The Focus", content: "After years of diversification, Hartford has refocused on commercial lines, personal lines, and group benefits. The simplification has improved returns significantly." },
				{ heading: "Why It Matters", content: "Hartford's longevity is itself a proof of concept for the insurance model. Two centuries of paying claims while remaining profitable is the ultimate track record." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "value priced for a boring quality compounder" },
			marketCap: { label: "Market Cap", value: "$30B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size insurer with long track record" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady mid-single-digit grower" },
			profitMargin: { label: "Profit Margin", value: "11%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins from disciplined underwriting" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive — insurance stocks rarely spike" },
			dividendYield: { label: "Dividend Yield", value: "2.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest but growing dividend" },
		},
	},
	{
		id: "fis",
		ticker: "FIS",
		name: "FIS",
		bio: "payment technology plumbing that runs half of global banking",
		heroImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
		personalityDescription: "The invisible infrastructure everyone depends on and nobody thinks about",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why FIS Processes Money Without Anyone Noticing",
			sections: [
				{ heading: "The Hidden Giant", content: "FIS processes trillions of dollars in transactions every year for thousands of banks and financial institutions. They're infrastructure — not glamorous, but essential." },
				{ heading: "The Worldpay Problem", content: "FIS's $43 billion acquisition of Worldpay in 2019 turned into one of the decade's worst M&A decisions. They eventually sold it back at a massive loss, destroying shareholder value." },
				{ heading: "Why It Matters", content: "Despite the Worldpay debacle, FIS's core banking technology business is deeply embedded with financial institutions. Switching costs are enormous — these contracts last decades." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap after the Worldpay mess — maybe too cheap" },
			marketCap: { label: "Market Cap", value: "$40B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive write-down dragged market cap down hard" },
			revenueGrowth: { label: "Revenue Growth", value: "-3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "shrinking as they divest non-core businesses" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "core banking software margins are solid" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "less volatile after selling the riskier businesses" },
			dividendYield: { label: "Dividend Yield", value: "2.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "decent yield while the turnaround plays out" },
		},
	},
	{
		id: "fisv",
		ticker: "FISV",
		name: "Fiserv",
		bio: "the fintech backbone powering 10,000 banks you've never heard of",
		heroImage: "https://images.unsplash.com/photo-1556742212-5b321f3c261b?w=800&h=600&fit=crop",
		personalityDescription: "The guy who built the pipes that all the water flows through",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Fiserv Is Financial Services' Quiet Compounder",
			sections: [
				{ heading: "The Clover Network", content: "Beyond banking software, Fiserv owns Clover — the point-of-sale system you've seen at every small business. It's a payments business embedded inside a banking software company." },
				{ heading: "The First Data Merger", content: "Fiserv's 2019 merger with First Data created a payments and banking technology powerhouse. The integration took years but the combined entity has strong pricing power." },
				{ heading: "Why It Matters", content: "Fiserv is the kind of company that's easy to underestimate — until you realize they process more payments than most people can imagine and their clients never leave." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "priced for steady compounding, not fireworks" },
			marketCap: { label: "Market Cap", value: "$90B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large market cap for an unsexy business" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent mid-to-high single digit grower" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from recurring software fees" },
			beta: { label: "Beta", value: "0.95", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "relatively low volatility given the scale" },
			dividendYield: { label: "Dividend Yield", value: "0.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "minimal yield — focused on buybacks" },
		},
	},
	{
		id: "gpn",
		ticker: "GPN",
		name: "Global Payments",
		bio: "swipe to pay, powered by people you've never heard of",
		heroImage: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=800&h=600&fit=crop",
		personalityDescription: "The silent partner in every credit card transaction you've ever made",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Global Payments Processes Everything Quietly",
			sections: [
				{ heading: "The Merchant Acquirer", content: "Global Payments helps businesses accept card payments — in stores, online, everywhere. They operate in over 100 countries, processing billions of transactions annually." },
				{ heading: "The Software Push", content: "Like many payment processors, Global Payments is trying to become a software company. Software is stickier and more profitable than pure transaction processing." },
				{ heading: "Why It Matters", content: "Digital payments are replacing cash globally. Even in markets where cash is king today, the trend is clear. Global Payments is positioned to benefit from that secular shift." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap if the software transition pays off" },
			marketCap: { label: "Market Cap", value: "$26B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant discount to historical valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slower growth than hoped" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins improving with software mix" },
			beta: { label: "Beta", value: "1.15", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility typical of fintech" },
			dividendYield: { label: "Dividend Yield", value: "1.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield as they invest for growth" },
		},
	},
	{
		id: "adp",
		ticker: "ADP",
		name: "ADP",
		bio: "the company that runs payroll for literally everyone on Earth",
		heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
		personalityDescription: "The most important unsexy company in business — the backbone of every paycheck",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why ADP Is the Most Important Boring Company",
			sections: [
				{ heading: "The Payroll Giant", content: "ADP processes payroll for over 1 million businesses and 40 million workers. Every two weeks, billions of dollars flow through their systems to paychecks across America." },
				{ heading: "The Float Game", content: "ADP holds billions of dollars between collecting from employers and paying employees. The interest earned on that float alone is a massive business at today's rates." },
				{ heading: "Why It Matters", content: "Payroll is non-discretionary spending. Companies can cut marketing, freeze hiring, but they always run payroll. ADP's revenue is about as recession-resistant as it gets." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the stability and recession resistance" },
			marketCap: { label: "Market Cap", value: "$105B", explanation: "The total value of all the company's shares combined", culturalTranslation: "trades at a premium because it deserves one" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow but consistent — they never miss" },
			profitMargin: { label: "Profit Margin", value: "20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "extraordinarily reliable margins" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "one of the most defensive large-caps out there" },
			dividendYield: { label: "Dividend Yield", value: "2.1%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "quality dividend grower for decades" },
		},
	},
	{
		id: "ndaq",
		ticker: "NDAQ",
		name: "Nasdaq",
		bio: "the stock exchange that lists all the tech companies you're obsessed with",
		heroImage: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop",
		personalityDescription: "The exclusive club where Amazon, Google, and Apple hang out",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Nasdaq Is More Than Just a Stock Exchange",
			sections: [
				{ heading: "The Tech Exchange", content: "Nasdaq is synonymous with tech stocks. When Apple, Microsoft, Amazon, and Google all chose to list there, they established it as the home of innovation and growth investing." },
				{ heading: "The Data Business", content: "Nasdaq's most profitable business is actually financial technology and data — selling market data, analytics, and trading technology to institutions. Exchanges are data businesses that happen to run markets." },
				{ heading: "Why It Matters", content: "Nasdaq's brand is the global symbol for technology investing. When international companies want to signal they're tech-forward, they list on the Nasdaq — even if they're not American." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the data and tech moat" },
			marketCap: { label: "Market Cap", value: "$38B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant underperformer vs its own listed stocks" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from data subscriptions" },
			profitMargin: { label: "Profit Margin", value: "38%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from software and data fees" },
			beta: { label: "Beta", value: "1.05", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive-ish — data revenue is recurring" },
			dividendYield: { label: "Dividend Yield", value: "1.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield from a quality compounder" },
		},
	},
	{
		id: "ice",
		ticker: "ICE",
		name: "Intercontinental Exchange",
		bio: "the exchange operator that owns the NYSE and a lot more",
		heroImage: "https://images.unsplash.com/photo-1608222351212-18fe0d7045e1?w=800&h=600&fit=crop",
		personalityDescription: "The parent company of the place where fortunes are made and lost",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why ICE Owns the World's Most Famous Exchange",
			sections: [
				{ heading: "The NYSE Acquisition", content: "When ICE bought the New York Stock Exchange in 2013 for $8.2 billion, it was a bold move. The NYSE was iconic but struggling. ICE transformed it into a profitable data and listing business." },
				{ heading: "The Fixed Income Push", content: "ICE has been aggressively building out fixed income data and analytics, competing with Bloomberg and Refinitiv. Fixed income is a bigger market than equities and dramatically under-served by technology." },
				{ heading: "Why It Matters", content: "ICE understands that exchanges are data businesses. Every transaction generates data worth more than the transaction fee itself. That insight has driven their acquisition strategy." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonably priced for a data-driven exchange monopoly" },
			marketCap: { label: "Market Cap", value: "$75B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large company with strong competitive moats" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent mid-to-high single digit grower" },
			profitMargin: { label: "Profit Margin", value: "35%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "outstanding margins from monopoly-like data businesses" },
			beta: { label: "Beta", value: "1.08", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for a financial infrastructure company" },
			dividendYield: { label: "Dividend Yield", value: "1.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small but growing dividend" },
		},
	},
	{
		id: "cme",
		ticker: "CME",
		name: "CME Group",
		bio: "where traders bet on the future of everything from corn to bitcoin",
		heroImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
		personalityDescription: "The casino for serious investors where the stakes are measured in trillions",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 40, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why CME Group Profits From Every Market Condition",
			sections: [
				{ heading: "The Volatility Machine", content: "CME makes money when markets are volatile — every trade of futures and options on stocks, bonds, commodities, and currencies pays them a fee. More fear equals more revenue." },
				{ heading: "The Rate Business", content: "Interest rate futures are CME's biggest product. When the Fed moves rates, traders scramble to hedge and speculate — and every trade goes through CME." },
				{ heading: "Why It Matters", content: "CME is literally a tollbooth on the highway of global risk management. As long as there's uncertainty in financial markets — which is always — CME collects." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "23.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for an exceptional business model" },
			marketCap: { label: "Market Cap", value: "$80B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive but arguably undervalued given the moat" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady grower with cyclical volatility boosts" },
			profitMargin: { label: "Profit Margin", value: "55%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "one of the best operating margins of any company" },
			beta: { label: "Beta", value: "0.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "extremely defensive — volatility helps them" },
			dividendYield: { label: "Dividend Yield", value: "2.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "pays a special dividend on top of regular one" },
		},
	},
	{
		id: "spgi",
		ticker: "SPGI",
		name: "S&P Global",
		bio: "the company that gives everything from bonds to companies a letter grade",
		heroImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
		personalityDescription: "The professor who decides if you graduate from the financial system",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why S&P Global's Ratings Move Trillions",
			sections: [
				{ heading: "The Rating Oligopoly", content: "S&P Global, Moody's, and Fitch control the bond rating market. Their opinions on creditworthiness determine whether companies and governments can borrow at all — and at what rate." },
				{ heading: "The Data Expansion", content: "S&P Global merged with IHS Markit in 2022, creating a data and analytics powerhouse that goes well beyond ratings into commodities, financial data, and indices." },
				{ heading: "Why It Matters", content: "The S&P 500 index — which S&P Global owns and licenses — is the benchmark for trillions in passive investment funds. Every dollar flowing into an index fund pays S&P Global a fee." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "36.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium justified by the index and rating moats" },
			marketCap: { label: "Market Cap", value: "$155B", explanation: "The total value of all the company's shares combined", culturalTranslation: "enormous market cap that's still growing" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent revenue from subscriptions and ratings" },
			profitMargin: { label: "Profit Margin", value: "40%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from data and indices" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for a data company" },
			dividendYield: { label: "Dividend Yield", value: "0.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — focused on growth and buybacks" },
		},
	},
	{
		id: "mco",
		ticker: "MCO",
		name: "Moody's",
		bio: "bond ratings and financial intelligence since before your grandparents were born",
		heroImage: "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&h=600&fit=crop",
		personalityDescription: "The credit professor whose opinion determines if a company can borrow money",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Moody's Has Unmatched Power Over Capital Markets",
			sections: [
				{ heading: "The Rating Duopoly", content: "Along with S&P, Moody's controls 80% of the bond rating market. Their AAA rating can save a company billions in borrowing costs. A downgrade can trigger a financial crisis." },
				{ heading: "The Analytics Business", content: "Moody's Analytics provides risk data and software to financial institutions globally. It's a growing, high-margin business that supplements the cyclical ratings revenue." },
				{ heading: "Why It Matters", content: "Buffett called Moody's moat 'extraordinary' and has owned it for decades. When the world's best investor holds a position for 20+ years, the business model is real." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "34.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive but earns the premium with consistent compounding" },
			marketCap: { label: "Market Cap", value: "$80B", explanation: "The total value of all the company's shares combined", culturalTranslation: "not cheap — but great businesses rarely are" },
			revenueGrowth: { label: "Revenue Growth", value: "11%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady grower in good and bad markets" },
			profitMargin: { label: "Profit Margin", value: "45%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from the rating monopoly" },
			beta: { label: "Beta", value: "1.35", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — moves with credit market conditions" },
			dividendYield: { label: "Dividend Yield", value: "0.9%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "tiny yield — they compound through reinvestment" },
		},
	},
	{
		id: "msci",
		ticker: "MSCI",
		name: "MSCI",
		bio: "the index company powering trillions in global investment decisions",
		heroImage: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop",
		personalityDescription: "The unsung hero deciding which countries and companies make it into ETFs",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why MSCI Controls How the World Invests Internationally",
			sections: [
				{ heading: "The Index Standard", content: "MSCI's indices — Emerging Markets, EAFE, All Country World — are the benchmark for international investing. When a country gets added to an MSCI index, billions of dollars automatically flow in." },
				{ heading: "The ESG Wave", content: "MSCI is one of the leading providers of ESG ratings and data. As institutional investors integrate sustainability into portfolios, MSCI's analytics become mandatory." },
				{ heading: "Why It Matters", content: "Getting included in an MSCI index can transform a company or country's access to global capital. That kind of influence over capital allocation is rare and valuable." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "44.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive but justified by the recurring revenue moat" },
			marketCap: { label: "Market Cap", value: "$45B", explanation: "The total value of all the company's shares combined", culturalTranslation: "premium pricing for premium business quality" },
			revenueGrowth: { label: "Revenue Growth", value: "14%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent double-digit grower" },
			profitMargin: { label: "Profit Margin", value: "52%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "extraordinary margins from data subscriptions" },
			beta: { label: "Beta", value: "1.15", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for a high-quality compounder" },
			dividendYield: { label: "Dividend Yield", value: "1.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — the compounding IS the return" },
		},
	},
	{
		id: "trow",
		ticker: "TROW",
		name: "T. Rowe Price",
		bio: "active fund management that's somehow still beating the passive crowd",
		heroImage: "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=800&h=600&fit=crop",
		personalityDescription: "The fund manager who argues passive investing is a crutch and has receipts",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why T. Rowe Price Survived the Index Fund Revolution",
			sections: [
				{ heading: "The Active Management Survivor", content: "As trillions shifted to passive index funds, T. Rowe Price focused on what active management does best: finding overlooked growth companies before everyone else does." },
				{ heading: "The Retirement Ecosystem", content: "T. Rowe is deeply embedded in 401k plans across corporate America. Their target-date funds manage hundreds of billions. Once you're in their ecosystem, you rarely leave." },
				{ heading: "Why It Matters", content: "T. Rowe Price is proof that active management isn't dead — it just has to be actually good. Their long-term investment returns have justified the higher fees better than most." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "11.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap if active management stays relevant" },
			marketCap: { label: "Market Cap", value: "$22B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant discount to peers — the market is skeptical" },
			revenueGrowth: { label: "Revenue Growth", value: "-5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "AUM under pressure from passive shift" },
			profitMargin: { label: "Profit Margin", value: "30%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins even as AUM shrinks" },
			beta: { label: "Beta", value: "1.38", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "more volatile than the market — beta to sentiment" },
			dividendYield: { label: "Dividend Yield", value: "4.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "very high yield — one of the best in financials" },
		},
	},
	{
		id: "ivz",
		ticker: "IVZ",
		name: "Invesco",
		bio: "ETFs and alternative strategies for investors who want something more",
		heroImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
		personalityDescription: "The fund manager that thought of everything except winning the ETF war against Vanguard",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 42, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Invesco Keeps Finding Ways to Reinvent",
			sections: [
				{ heading: "The QQQ Owner", content: "Invesco owns QQQ — the most-traded ETF in the world tracking the Nasdaq-100. They don't make much per trade, but the scale is extraordinary." },
				{ heading: "The Alternatives Push", content: "Invesco has been building out alternative investment strategies to supplement their passive products. In a world where everyone offers cheap index funds, differentiation matters." },
				{ heading: "Why It Matters", content: "QQQ alone makes Invesco relevant for decades. As tech-focused investing continues, every basis point of that ETF fee adds up to enormous revenue." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "9.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap but the business model faces headwinds" },
			marketCap: { label: "Market Cap", value: "$8B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small market cap relative to AUM — possibly undervalued" },
			revenueGrowth: { label: "Revenue Growth", value: "2%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "AUM growth slowing with market shifts" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "reasonable margins considering scale" },
			beta: { label: "Beta", value: "1.52", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — carries more risk than it looks" },
			dividendYield: { label: "Dividend Yield", value: "5.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "very high yield signals some caution is warranted" },
		},
	},
	{
		id: "ben",
		ticker: "BEN",
		name: "Franklin Templeton",
		bio: "global asset management since your grandparents started saving",
		heroImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop",
		personalityDescription: "The old-school money manager trying to stay relevant in the ETF era",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 62, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 35, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Franklin Templeton Is the Old Guard Adapting",
			sections: [
				{ heading: "The Global Reach", content: "Franklin Templeton manages assets in 150+ countries. Their Templeton brand is synonymous with international value investing — a style that's been deeply out of favor." },
				{ heading: "The Legg Mason Deal", content: "The 2020 acquisition of Legg Mason added $800 billion in AUM and brought in brands like Western Asset and ClearBridge. Scale is the only defense against the passive fee war." },
				{ heading: "Why It Matters", content: "Franklin Templeton's bet is that active management still has a place — especially in international markets where indexing is harder to do well." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "9.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "deeply discounted — the market fears disruption" },
			marketCap: { label: "Market Cap", value: "$12B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small cap for a $1.5T AUM manager" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "modest growth weighed down by outflows" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins for a traditional asset manager" },
			beta: { label: "Beta", value: "1.28", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "more volatile than its defensive appearance" },
			dividendYield: { label: "Dividend Yield", value: "4.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield signals income priority over growth" },
		},
	},
	{
		id: "syf",
		ticker: "SYF",
		name: "Synchrony Financial",
		bio: "the store credit card nobody asked for but everyone somehow has",
		heroImage: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop",
		personalityDescription: "The sneaky checkout upsell that's now a $20 billion company",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Synchrony Is Your Store Card's Hidden Boss",
			sections: [
				{ heading: "The Private Label Empire", content: "Synchrony issues store-branded credit cards for Amazon, Lowe's, PayPal, and hundreds of other retailers. You've used a Synchrony card — you just didn't know it was them." },
				{ heading: "The High-Yield Focus", content: "Synchrony targets consumers that big banks ignore — subprime and near-prime borrowers who carry balances. Higher risk means higher interest rates and higher returns when defaults stay manageable." },
				{ heading: "Why It Matters", content: "Every 'apply for our card and save 20%' moment in retail is likely Synchrony behind the scenes. That's enormous scale in a market the big banks left behind." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "8.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — but credit quality is always a question" },
			marketCap: { label: "Market Cap", value: "$17B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-tier financ at a discounted multiple" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing as retail partnerships expand" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "high margins when credit losses stay controlled" },
			beta: { label: "Beta", value: "1.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "more volatile than average financials" },
			dividendYield: { label: "Dividend Yield", value: "2.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "decent yield for a credit-focused lender" },
		},
	},
	{
		id: "ally",
		ticker: "ALLY",
		name: "Ally Financial",
		bio: "the online bank that made your parents' bank look like it was from the 1980s",
		heroImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&h=600&fit=crop",
		personalityDescription: "The digital-first disruptor that did to banking what Amazon did to retail",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 42, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Ally Made Everyone Realize How Bad Banks Were",
			sections: [
				{ heading: "The High-Yield Account", content: "Ally was offering high-yield savings accounts years before every other bank panicked and started raising rates. They proved customers would move their money for even 1-2% more." },
				{ heading: "The Auto Lending Focus", content: "Beyond banking, Ally is the largest auto lender in the US. The car loan market is enormous — and when car prices and rates rise, things get complicated." },
				{ heading: "Why It Matters", content: "Ally proved that a bank with no physical branches could win on product and rates alone. They changed what customers expect from every bank, including the old ones." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap in part because auto lending is risky" },
			marketCap: { label: "Market Cap", value: "$12B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small relative to the impact they've had" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing through auto and mortgage cycles" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong when credit quality holds" },
			beta: { label: "Beta", value: "1.68", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moves hard with auto market and rate cycles" },
			dividendYield: { label: "Dividend Yield", value: "3.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield if you believe in the model" },
		},
	},
	{
		id: "amp",
		ticker: "AMP",
		name: "Ameriprise Financial",
		bio: "financial planning for the suburbs and the American dream crowd",
		heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
		personalityDescription: "The financial advisor who sells whole life insurance and calls it investing",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 42, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Ameriprise Quietly Prints Money From Middle America",
			sections: [
				{ heading: "The Wealth Management Reach", content: "Ameriprise has over 10,000 financial advisors serving millions of middle-market Americans. It's not as glamorous as Goldman, but the breadth of reach is staggering." },
				{ heading: "The Columbia Threadneedle", content: "Ameriprise's asset management arm manages hundreds of billions globally, including the Columbia Threadneedle brand. The international asset management business provides a counterweight to US-centric advisory." },
				{ heading: "Why It Matters", content: "Most Americans don't bank at Goldman Sachs. They work with advisors from firms like Ameriprise. That mass-market positioning is defensible and deeply underappreciated by investors." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "19.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable value for a quality wealth manager" },
			marketCap: { label: "Market Cap", value: "$44B", explanation: "The total value of all the company's shares combined", culturalTranslation: "somewhat undervalued vs pure-play wealth peers" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady grower regardless of market conditions" },
			profitMargin: { label: "Profit Margin", value: "25%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from fee-based advice" },
			beta: { label: "Beta", value: "1.38", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for a financial" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "growing dividend with strong buyback history" },
		},
	},
	{
		id: "aon",
		ticker: "AON",
		name: "Aon",
		bio: "insurance brokerage and HR consulting for the world's biggest companies",
		heroImage: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop",
		personalityDescription: "The person at every Fortune 500 who handles the insurance paperwork — but globally",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Aon Is the World's Risk Manager",
			sections: [
				{ heading: "The Broker Giant", content: "Aon is the world's largest insurance broker, connecting companies with insurers for everything from property damage to cyber risk. They don't take the risk — they just match buyers and sellers." },
				{ heading: "The HR Services", content: "Beyond insurance, Aon is a massive HR consulting firm, helping companies design compensation, benefits, and workforce strategies. The breadth of services creates deep client relationships." },
				{ heading: "Why It Matters", content: "Aon's knowledge of risk across industries gives them a data advantage that's nearly impossible to replicate. They see claims data, pricing data, and risk trends across thousands of clients." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "27.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for a quality, non-cyclical business" },
			marketCap: { label: "Market Cap", value: "$68B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large well-run consultancy at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent mid-single digit grower" },
			profitMargin: { label: "Profit Margin", value: "26%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "good margins from high-value advisory" },
			beta: { label: "Beta", value: "1.08", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive stock that doesn't move much" },
			dividendYield: { label: "Dividend Yield", value: "0.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "minimal yield — focused on buybacks" },
		},
	},
	{
		id: "mmc",
		ticker: "MMC",
		name: "Marsh McLennan",
		bio: "the world's biggest insurance broker with a sideline in everything risky",
		heroImage: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop",
		personalityDescription: "The risk consultant you never knew you needed until the disaster hit",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Marsh McLennan Manages Global Risk",
			sections: [
				{ heading: "The Marsh Brand", content: "Marsh is the world's largest insurance brokerage. Oliver Wyman and Mercer are also under the McMcLennan umbrella — consulting and HR services adding revenue diversity." },
				{ heading: "The Cyber Opportunity", content: "Cyber insurance is the fastest-growing segment in insurance. Marsh has become the dominant broker for corporate cyber coverage — perfectly positioned as ransomware becomes a boardroom issue." },
				{ heading: "Why It Matters", content: "Marsh McLennan benefits from risk becoming more complex and expensive. Climate change, cyber attacks, supply chain fragility — each new threat is more business for them." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "priced for steady quality compounding" },
			marketCap: { label: "Market Cap", value: "$105B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large company benefiting from the risk megatrend" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from cyber and complexity" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid consulting and brokerage margins" },
			beta: { label: "Beta", value: "1.02", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very defensive — doesn't correlate much with markets" },
			dividendYield: { label: "Dividend Yield", value: "1.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield from a quality business" },
		},
	},
	{
		id: "ajg",
		ticker: "AJG",
		name: "Arthur J. Gallagher",
		bio: "the insurance broker that's been quietly acquiring competitors for decades",
		heroImage: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop",
		personalityDescription: "The ambitious regional player that woke up one day and was global",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 20, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why AJG Wins Through Relentless Acquisition",
			sections: [
				{ heading: "The Rollup Machine", content: "Gallagher has made hundreds of acquisitions of smaller insurance brokers over its history. The strategy is simple: buy local expertise, integrate it, and scale it globally." },
				{ heading: "The Specialty Focus", content: "Gallagher focuses on middle-market businesses and specialty insurance lines where relationships and expertise matter more than price. That's hard to disrupt with technology." },
				{ heading: "Why It Matters", content: "The independent insurance broker market is fragmented. Gallagher's systematic acquisition strategy is gradually consolidating it — and creating a network effect in the process." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "38.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for consistent acquisition-driven growth" },
			marketCap: { label: "Market Cap", value: "$55B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large cap growing rapidly through M&A" },
			revenueGrowth: { label: "Revenue Growth", value: "14%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "double-digit grower through acquisitions" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "margins thin but improving with scale" },
			beta: { label: "Beta", value: "1.02", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "steady compounder with low volatility" },
			dividendYield: { label: "Dividend Yield", value: "1.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — they reinvest for acquisitions" },
		},
	},
	{
		id: "pnc",
		ticker: "PNC",
		name: "PNC Financial",
		bio: "the mid-Atlantic bank that's quietly been growing for decades",
		heroImage: "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800&h=600&fit=crop",
		personalityDescription: "The underrated regional champion that everyone overlooks at first",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why PNC Punches Above Its Regional Bank Weight",
			sections: [
				{ heading: "The Geographic Strength", content: "PNC has a dominant presence in the Mid-Atlantic and Midwest — markets less glamorous than New York but extraordinarily stable. Their regional roots give them loyal commercial banking relationships." },
				{ heading: "The BBVA Deal", content: "PNC's 2021 acquisition of BBVA's US operations added significant scale in the Sun Belt and West, transforming them from a regional to a near-national bank." },
				{ heading: "Why It Matters", content: "PNC has been one of the best-managed large regional banks for decades. Their credit discipline through multiple cycles has been exceptional compared to peers." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "13.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for a well-managed regional" },
			marketCap: { label: "Market Cap", value: "$75B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significantly smaller than the mega banks but quality" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady grower through cycles" },
			profitMargin: { label: "Profit Margin", value: "26%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from disciplined credit" },
			beta: { label: "Beta", value: "1.22", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — rate sensitive but well managed" },
			dividendYield: { label: "Dividend Yield", value: "3.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield for income-focused investors" },
		},
	},
	{
		id: "usb",
		ticker: "USB",
		name: "U.S. Bancorp",
		bio: "midwest banking done right for over 160 years",
		heroImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop",
		personalityDescription: "The reliable bank that never made the news because it never needed to",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 20, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 42, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why US Bancorp Is the Most Consistent Regional Bank",
			sections: [
				{ heading: "The Midwest Foundation", content: "US Bancorp has deep roots in the Upper Midwest, with a conservative lending culture that's kept them out of trouble through every crisis since the Great Depression." },
				{ heading: "The Fee Income Machine", content: "Unlike most banks that rely heavily on interest income, US Bancorp has built substantial fee income from payment services, trust, and consumer banking products." },
				{ heading: "Why It Matters", content: "Buffett held US Bancorp for years precisely because of their consistency. It's the kind of bank that may never be exciting but never breaks — exactly what long-term investors want." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "13.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for an exceptionally run regional" },
			marketCap: { label: "Market Cap", value: "$70B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size but highly valued relative to peers" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow and steady wins the race" },
			profitMargin: { label: "Profit Margin", value: "24%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "one of the highest ROEs among regional banks" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low volatility for a financial stock" },
			dividendYield: { label: "Dividend Yield", value: "4.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "generous yield for disciplined income investors" },
		},
	},
	{
		id: "tfc",
		ticker: "TFC",
		name: "Truist Financial",
		bio: "the new bank that tried to merge two banks into one and is still figuring it out",
		heroImage: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800&h=600&fit=crop",
		personalityDescription: "The post-merger identity crisis that has $500 billion in assets",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 42, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Truist Is Navigating a Tricky Merger",
			sections: [
				{ heading: "The BB&T and SunTrust Deal", content: "The 2019 merger of BB&T and SunTrust created Truist — the sixth-largest US bank. But merging two large banks is incredibly hard: different cultures, systems, and customer bases." },
				{ heading: "The Southeast Focus", content: "Truist is concentrated in the Southeast — one of the fastest-growing regions in America. Charlotte, Atlanta, Miami — the Sunbelt is where the economic action is." },
				{ heading: "Why It Matters", content: "If Truist successfully integrates and captures the Sunbelt growth opportunity, the stock is deeply undervalued. If the merger stumbles, the discount is deserved." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — reflects merger integration uncertainty" },
			marketCap: { label: "Market Cap", value: "$60B", explanation: "The total value of all the company's shares combined", culturalTranslation: "trading at a discount to similarly-sized banks" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slower growth during the integration phase" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "margins below potential — integration costs drag" },
			beta: { label: "Beta", value: "1.32", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate bank volatility plus merger risk" },
			dividendYield: { label: "Dividend Yield", value: "5.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield compensates for the integration uncertainty" },
		},
	},
	{
		id: "efx",
		ticker: "EFX",
		name: "Equifax",
		bio: "credit scores and the 2017 data breach — both equally famous",
		heroImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
		personalityDescription: "The credit bureau you pray never accidentally ruins your score",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 75, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Equifax Survived Its Worst Nightmare",
			sections: [
				{ heading: "The Breach", content: "In 2017 Equifax was hacked, exposing the personal data of 147 million Americans — Social Security numbers, addresses, financial records. It was one of the most damaging data breaches in history." },
				{ heading: "The Recovery", content: "Equifax paid $575 million in settlements, spent billions on security upgrades, and somehow kept its essential position in the credit ecosystem. Banks and lenders literally can't function without them." },
				{ heading: "Why It Matters", content: "Credit bureaus are oligopolies protected by regulatory moats. Even after a catastrophic breach, Equifax maintained its market position because the infrastructure is too embedded to replace." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "30.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium justified by the moat despite the breach" },
			marketCap: { label: "Market Cap", value: "$25B", explanation: "The total value of all the company's shares combined", culturalTranslation: "market cap recovered fully from the breach scandal" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "returning to growth after the remediation costs" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "margins improving as compliance spend normalizes" },
			beta: { label: "Beta", value: "1.38", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for a data company" },
			dividendYield: { label: "Dividend Yield", value: "0.6%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "tiny yield — reinvesting for growth" },
		},
	},
	{
		id: "payx",
		ticker: "PAYX",
		name: "Paychex",
		bio: "payroll and HR for 750,000 small businesses that have no HR department",
		heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
		personalityDescription: "The small business owner's most trusted partner they never meet in person",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 50, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Paychex Wins Where ADP Doesn't Focus",
			sections: [
				{ heading: "The Small Business Niche", content: "While ADP targets larger enterprises, Paychex focuses on small and medium-sized businesses. They serve 750,000+ clients and process payroll for millions of employees." },
				{ heading: "The Recurring Model", content: "Payroll is processed every two weeks, generating predictable recurring revenue. Add HR services, benefits administration, and retirement plan management, and the revenue per client compounds." },
				{ heading: "Why It Matters", content: "Small businesses are the backbone of American employment. Paychex is essential infrastructure for that backbone — sticky, recession-resistant, and quietly compounding for decades." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for exceptional business quality" },
			marketCap: { label: "Market Cap", value: "$47B", explanation: "The total value of all the company's shares combined", culturalTranslation: "steady compounder at a fair multiple" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent grower regardless of economic conditions" },
			profitMargin: { label: "Profit Margin", value: "37%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "one of the best operating margins in services" },
			beta: { label: "Beta", value: "0.90", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low volatility — truly defensive" },
			dividendYield: { label: "Dividend Yield", value: "2.9%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend from a quality business" },
		},
	},
	{
		id: "ntrs",
		ticker: "NTRS",
		name: "Northern Trust",
		bio: "wealth management and custody services for the ultra-ultra rich",
		heroImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
		personalityDescription: "The discreet money manager for people whose family has a family office",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 35, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Northern Trust Serves the Top 0.01%",
			sections: [
				{ heading: "The Custody Business", content: "Northern Trust is one of the largest asset custodians in the world, holding trillions of dollars of institutional assets — pension funds, sovereign wealth funds, foundations." },
				{ heading: "The Wealth Focus", content: "Their wealth management business targets ultra-high-net-worth individuals with multi-generational planning needs. These are clients who measure wealth in the hundreds of millions." },
				{ heading: "Why It Matters", content: "Custody and ultra-wealth management are sticky, relationship-based businesses. Clients don't switch custodians — the switching costs are enormous and the relationships are generational." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonably priced for the institutional custody quality" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "smaller than custody peers but high quality" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady mid-single digit grower" },
			profitMargin: { label: "Profit Margin", value: "20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from fee-based services" },
			beta: { label: "Beta", value: "1.08", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low volatility — institutional client base is stable" },
			dividendYield: { label: "Dividend Yield", value: "3.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "decent yield for an institutional quality bank" },
		},
	},
	{
		id: "stt",
		ticker: "STT",
		name: "State Street",
		bio: "the index fund pioneer that built the world's most important ETF",
		heroImage: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop",
		personalityDescription: "The quiet revolutionary who invented SPY and changed investing forever",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why State Street Created the Most Important Financial Product",
			sections: [
				{ heading: "The SPY Origin", content: "State Street launched the SPDR S&P 500 ETF (SPY) in 1993 — the first US ETF. It's now the most traded financial product in the world. That single invention earns them fees on trillions." },
				{ heading: "The Custody Giant", content: "Beyond SPY, State Street is a top-3 asset custodian globally, holding institutional assets for the world's largest investors. Custody is unsexy but enormously valuable." },
				{ heading: "Why It Matters", content: "The ETF revolution that transformed investing started with State Street and SPY. They're not the biggest beneficiary of that revolution, but they started it." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonably priced for the SPY legacy and custody scale" },
			marketCap: { label: "Market Cap", value: "$27B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size but with enormous institutional reach" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow and steady in a competitive market" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from custody fees" },
			beta: { label: "Beta", value: "1.38", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility given institutional nature" },
			dividendYield: { label: "Dividend Yield", value: "3.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield for institutional quality" },
		},
	},
	{
		id: "bk",
		ticker: "BK",
		name: "BNY Mellon",
		bio: "the world's oldest bank is also the world's largest custodian",
		heroImage: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
		personalityDescription: "The 240-year-old institution that still holds your pension fund",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 20, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 42, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why BNY Mellon's Age Is Its Moat",
			sections: [
				{ heading: "The Hamilton Connection", content: "Alexander Hamilton co-founded BNY Mellon in 1784 — yes, the Hamilton from the musical. It's the oldest continuously operating US bank. History as competitive moat." },
				{ heading: "The Custody Scale", content: "BNY Mellon is the world's largest custodian bank, holding over $40 trillion in assets. They're the bank for banks — moving, settling, and safeguarding the world's financial infrastructure." },
				{ heading: "Why It Matters", content: "In the digital age, custody and settlement infrastructure may seem boring. But the rails that move trillions daily are irreplaceable — and BNY Mellon owns a huge piece of them." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "12.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "modest valuation for a critical infrastructure player" },
			marketCap: { label: "Market Cap", value: "$47B", explanation: "The total value of all the company's shares combined", culturalTranslation: "fairly valued relative to custody peers" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "stable growth from institutional asset growth" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "consistent margins from custody operations" },
			beta: { label: "Beta", value: "1.12", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low volatility — very defensive" },
			dividendYield: { label: "Dividend Yield", value: "3.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield for institutional infrastructure" },
		},
	},
	{
		id: "rjf",
		ticker: "RJF",
		name: "Raymond James",
		bio: "independent financial advice with a Southern roots and serious scale",
		heroImage: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop",
		personalityDescription: "The financial advisor your parents trust more than their own children",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Raymond James Chose Independence Over Prestige",
			sections: [
				{ heading: "The Advisor Network", content: "Raymond James has built a massive network of independent financial advisors who operate under their brand. Advisors love the independence; Raymond James loves the recurring revenue." },
				{ heading: "The Florida Base", content: "Headquartered in St. Petersburg, FL, Raymond James has always had a different culture than Wall Street — more relationship-focused, less cutthroat. That resonates with a certain type of advisor and client." },
				{ heading: "Why It Matters", content: "As Wall Street megabanks consolidate, independent advisory is growing. Raymond James is perfectly positioned as advisors flee corporate cultures for more autonomy." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "16.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for a quality advisory firm" },
			marketCap: { label: "Market Cap", value: "$24B", explanation: "The total value of all the company's shares combined", culturalTranslation: "trading at a discount to peers" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent double-digit grower" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from fee-based advisory" },
			beta: { label: "Beta", value: "1.15", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for a financials name" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield — prefer buybacks" },
		},
	},
	{
		id: "cboe",
		ticker: "CBOE",
		name: "Cboe Global Markets",
		bio: "options trading's original home — where volatility lives",
		heroImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
		personalityDescription: "The place where traders bet on uncertainty and pay for the privilege",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Cboe Profits From Everyone Else's Anxiety",
			sections: [
				{ heading: "The VIX", content: "Cboe created the VIX — the 'fear index' that measures market volatility. When markets crash and fear spikes, Cboe's options volume explodes. They literally profit from panic." },
				{ heading: "The Options Monopoly", content: "Cboe handles a dominant share of US equity options trading. Options volume has exploded as retail investors discovered calls and puts post-pandemic." },
				{ heading: "Why It Matters", content: "Options are no longer just for professional traders. The GameStop frenzy showed that retail investors have embraced derivatives — and every single options trade goes through an exchange, often Cboe." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for an options market monopoly" },
			marketCap: { label: "Market Cap", value: "$22B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size but with outsized earnings power" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing as options trading becomes mainstream" },
			profitMargin: { label: "Profit Margin", value: "40%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from exchange monopoly" },
			beta: { label: "Beta", value: "0.55", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low volatility despite being a volatility business" },
			dividendYield: { label: "Dividend Yield", value: "1.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield from a quality compounder" },
		},
	},
	{
		id: "ssnc",
		ticker: "SSNC",
		name: "SS&C Technologies",
		bio: "financial software that runs hedge funds and nobody outside finance knows",
		heroImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
		personalityDescription: "The software company powering billion-dollar funds while staying completely invisible",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 40, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why SS&C Runs Back-Office Finance",
			sections: [
				{ heading: "The Fund Administration", content: "SS&C is the largest fund administrator in the world — they handle accounting, compliance, and operations for thousands of hedge funds and asset managers. The clients never leave." },
				{ heading: "The Acquisition Machine", content: "Like other financial software companies, SS&C has grown primarily through acquisitions. They've bought DST Systems, Algorithmics, and dozens of others to build scale." },
				{ heading: "Why It Matters", content: "Hedge fund back-office operations are critically important and incredibly complex. Switching administrators is so painful that clients stay for decades. That stickiness is the moat." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "20.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the quality and stickiness of revenue" },
			marketCap: { label: "Market Cap", value: "$15B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size company with significant niche dominance" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady grower through acquisition" },
			profitMargin: { label: "Profit Margin", value: "25%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from recurring software fees" },
			beta: { label: "Beta", value: "1.05", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low volatility — subscription revenue is predictable" },
			dividendYield: { label: "Dividend Yield", value: "1.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield as they prioritize acquisitions" },
		},
	},
	{
		id: "fds",
		ticker: "FDS",
		name: "FactSet Research",
		bio: "financial data that every serious analyst has open on two monitors",
		heroImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
		personalityDescription: "The spreadsheet everyone on Wall Street secretly can't work without",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why FactSet Is Analysts' Secret Weapon",
			sections: [
				{ heading: "The Workstation Standard", content: "FactSet workstations are standard equipment at investment banks, hedge funds, and asset managers worldwide. Once analysts learn FactSet, they request it at every job." },
				{ heading: "The Switching Cost", content: "FactSet's moat is the muscle memory of thousands of analysts who learned financial modeling and research on their platform. Switching to Bloomberg or Refinitiv means retraining everyone." },
				{ heading: "Why It Matters", content: "Data is the new oil in finance, and FactSet is one of the most important wells. Their combination of financial data, analytics, and portfolio tools is genuinely difficult to replicate." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "33.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the switching-cost moat" },
			marketCap: { label: "Market Cap", value: "$16B", explanation: "The total value of all the company's shares combined", culturalTranslation: "modest size for an essential financial tool" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent mid-to-high single digit grower" },
			profitMargin: { label: "Profit Margin", value: "32%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from subscription revenue" },
			beta: { label: "Beta", value: "0.98", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low volatility — truly defensive recurring revenue" },
			dividendYield: { label: "Dividend Yield", value: "0.9%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — reinvesting for data expansion" },
		},
	},
	{
		id: "brkb",
		ticker: "BRKB",
		name: "Berkshire Hathaway B",
		bio: "Warren Buffett's everything company — the ultimate holding company",
		heroImage: "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=800&h=600&fit=crop",
		personalityDescription: "The one investment that says 'I trust the Oracle more than I trust myself'",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 95, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 40, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Berkshire Hathaway Is the Ultimate American Business",
			sections: [
				{ heading: "The Empire", content: "Berkshire owns GEICO, BNSF Railway, Berkshire Hathaway Energy, See's Candies, Dairy Queen, and equity stakes in Apple, Bank of America, Coca-Cola, and dozens more. It's a conglomerate of conglomerates." },
				{ heading: "The Succession", content: "Warren Buffett, now in his 90s, has designated Greg Abel as his successor. The transition from the world's most famous investor to a capable but unknown CEO is the biggest risk and opportunity in the stock." },
				{ heading: "Why It Matters", content: "Buffett's shareholder letters are annual masterclasses in business and investing. Berkshire isn't just a stock — it's a 60-year demonstration of how to build wealth with patience and discipline." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for the world's most respected holding company" },
			marketCap: { label: "Market Cap", value: "$900B", explanation: "The total value of all the company's shares combined", culturalTranslation: "one of the largest companies on earth" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent compounder across economic cycles" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "diverse income streams from insurance, rail, and energy" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "lower beta than most — true Buffett defensive" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — he reinvests everything" },
		},
	},
	{
		id: "omf",
		ticker: "OMF",
		name: "OneMain Financial",
		bio: "personal loans for people the big banks won't even look at",
		heroImage: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&h=600&fit=crop",
		personalityDescription: "The second-chance lender doing well by doing good — kind of",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 48, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 42, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why OneMain Serves America's Credit Invisible",
			sections: [
				{ heading: "The Sub-Prime Niche", content: "OneMain lends to consumers with credit scores too low for traditional banks. They charge higher rates — sometimes much higher — but they also serve a population with few alternatives." },
				{ heading: "The Branch Network", content: "Unlike most fintech lenders, OneMain still operates physical branches in lower-income communities. That personal relationship reduces defaults and builds loyalty in ways pure digital can't." },
				{ heading: "Why It Matters", content: "Tens of millions of Americans have limited or damaged credit. OneMain is both a profit machine and one of the few places these consumers can access emergency credit." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "8.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "very cheap but reflects the credit risk" },
			marketCap: { label: "Market Cap", value: "$4.5B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small company with outsized dividend" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth — credit is tight" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "high margins when defaults stay manageable" },
			beta: { label: "Beta", value: "1.92", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — very sensitive to recession fears" },
			dividendYield: { label: "Dividend Yield", value: "10.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "extraordinary yield signals the risk" },
		},
	},
	{
		id: "evr",
		ticker: "EVR",
		name: "Evercore",
		bio: "elite M&A advisory for the megadeals you read about in the news",
		heroImage: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop",
		personalityDescription: "The boutique investment banker who charges a percentage of billion-dollar deals",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Evercore Advises the World's Biggest Deals",
			sections: [
				{ heading: "The Independent Advantage", content: "Evercore is an independent investment bank — no trading, no lending, just advisory. That independence means no conflicts of interest when they advise on a $50 billion merger." },
				{ heading: "The Talent Model", content: "Top M&A bankers are recruited by their deal track record and relationships. Evercore attracts elite talent by offering economics that big banks can't match for star performers." },
				{ heading: "Why It Matters", content: "When a Fortune 500 CEO needs advice on the most important deal of their career, they often call Evercore. That trust is the business model — and it compounds with every successful deal." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for a high-quality boutique bank" },
			marketCap: { label: "Market Cap", value: "$8B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small but growing with M&A activity" },
			revenueGrowth: { label: "Revenue Growth", value: "12%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "lumpy — follows deal cycles" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "high margins when volumes are strong" },
			beta: { label: "Beta", value: "1.55", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile with M&A market conditions" },
			dividendYield: { label: "Dividend Yield", value: "2.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest but growing dividend" },
		},
	},
	{
		id: "pfg",
		ticker: "PFG",
		name: "Principal Financial",
		bio: "retirement plans and insurance for the workforce nobody talks about",
		heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
		personalityDescription: "The 401k provider for the millions of workers whose HR is a one-person team",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 20, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 38, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Principal Quietly Powers Retirement Savings",
			sections: [
				{ heading: "The Small Business 401k", content: "Principal specializes in retirement plans for small and medium-sized businesses — a market that larger providers often ignore. That niche focus creates strong customer relationships." },
				{ heading: "The Insurance Layer", content: "Principal also sells life, disability, and specialty insurance to the business market. The combination of retirement and insurance creates a sticky, full-service relationship." },
				{ heading: "Why It Matters", content: "Most Americans retire with whatever their 401k accumulated. Principal is one of the custodians of that financial future for millions of workers across hundreds of thousands of small businesses." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "9.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap for a quality retirement services provider" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "fairly small relative to AUM it manages" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow but consistent grower" },
			profitMargin: { label: "Profit Margin", value: "14%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins from fee-based services" },
			beta: { label: "Beta", value: "1.25", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for a diversified financial" },
			dividendYield: { label: "Dividend Yield", value: "3.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield for income seekers" },
		},
	},
	{
		id: "lnc",
		ticker: "LNC",
		name: "Lincoln National",
		bio: "life insurance and annuities for people planning their financial exit strategy",
		heroImage: "https://images.unsplash.com/photo-1591035897819-f4bdf739f446?w=800&h=600&fit=crop",
		personalityDescription: "The insurance company that handles the paperwork of dying with dignity",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 62, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 35, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Lincoln National Is the Annuity Specialist",
			sections: [
				{ heading: "The Annuity Business", content: "Lincoln National is one of America's largest sellers of variable and fixed annuities. Annuities are essentially longevity insurance — guaranteed income in retirement." },
				{ heading: "The Challenges", content: "The low-interest-rate environment of the 2010s crushed Lincoln's economics since annuities need to earn returns on the premiums they hold. Rising rates have been a recovery catalyst." },
				{ heading: "Why It Matters", content: "As boomers retire, the demand for guaranteed retirement income is enormous. Lincoln National is positioned to serve that need — if they can manage their liability book properly." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "8.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap but life insurance is complex to value" },
			marketCap: { label: "Market Cap", value: "$5.5B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small relative to the liability book they manage" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "recovering with higher interest rates" },
			profitMargin: { label: "Profit Margin", value: "12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "margins have been pressured but improving" },
			beta: { label: "Beta", value: "1.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high volatility — sensitive to rates and equity markets" },
			dividendYield: { label: "Dividend Yield", value: "6.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield compensates for the volatility and complexity" },
		},
	},
	{
		id: "key",
		ticker: "KEY",
		name: "KeyCorp",
		bio: "the midwest bank that kept its head down and made money for decades",
		heroImage: "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800&h=600&fit=crop",
		personalityDescription: "The reliable regional bank that shows up every time, no drama",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 40, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why KeyCorp Is the Steady Midwest Banking Story",
			sections: [
				{ heading: "The Regional Focus", content: "KeyCorp operates primarily in the Midwest and Northeast, focusing on commercial banking, investment banking for the middle market, and consumer banking." },
				{ heading: "The Simplicity Premium", content: "KeyCorp doesn't have a dramatic story. They lend to good businesses, manage risk conservatively, and return capital to shareholders. It's unglamorous and it works." },
				{ heading: "Why It Matters", content: "In a world of banking drama, KeyCorp's consistent regional banking story is reassuring. They've survived every economic cycle without a single headline-grabbing crisis." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "11.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap for a quality regional bank" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "fairly valued for the size and quality" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady mid-single digit grower" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from disciplined lending" },
			beta: { label: "Beta", value: "1.38", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — rate and credit cycle sensitive" },
			dividendYield: { label: "Dividend Yield", value: "4.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield makes it attractive for income" },
		},
	},
	{
		id: "rf",
		ticker: "RF",
		name: "Regions Financial",
		bio: "southern banking with a smile and a conservative credit culture",
		heroImage: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800&h=600&fit=crop",
		personalityDescription: "The bank that moves at the speed of sweet tea but never goes bust",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 38, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Regions Financial Wins in the Sun Belt",
			sections: [
				{ heading: "The Southern Presence", content: "Regions is headquartered in Birmingham, Alabama and has deep roots in the Southeast and Midwest. The Sun Belt growth story — people and businesses moving south — benefits them directly." },
				{ heading: "The Conservative Culture", content: "Regions' credit culture is famously cautious. They turn away loans that other banks would book. That conservatism costs them in boom times and saves them in busts." },
				{ heading: "Why It Matters", content: "The Southeast is one of the fastest-growing economic regions in America. Regions' scale and relationships in that market give them durable advantages that coastal banks can't replicate." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "value priced for the Sun Belt growth opportunity" },
			marketCap: { label: "Market Cap", value: "$20B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size regional at a discount to big banks" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady grower in a growing region" },
			profitMargin: { label: "Profit Margin", value: "24%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from conservative underwriting" },
			beta: { label: "Beta", value: "1.32", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility — Sun Belt exposure is a positive" },
			dividendYield: { label: "Dividend Yield", value: "4.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield for income investors" },
		},
	},
	{
		id: "cfg",
		ticker: "CFG",
		name: "Citizens Financial",
		bio: "the New England bank that went public and never looked back",
		heroImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop",
		personalityDescription: "The regional bank that quietly built a digital strategy while everyone slept",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 42, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Citizens Financial Is the New England Challenger",
			sections: [
				{ heading: "The IPO Story", content: "Citizens Financial was majority-owned by Royal Bank of Canada until its IPO in 2014. Going independent allowed them to invest in technology and product expansion more aggressively." },
				{ heading: "The Digital Push", content: "Citizens has invested heavily in digital banking and expanded into markets beyond New England. Their Citizens Pay buy-now-pay-later product shows ambition beyond traditional banking." },
				{ heading: "Why It Matters", content: "Regional banks that successfully add digital capabilities to their branch relationships can grow their customer base far beyond their geographic footprint. Citizens is attempting exactly that." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10.8", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap for a regional with digital ambitions" },
			marketCap: { label: "Market Cap", value: "$17B", explanation: "The total value of all the company's shares combined", culturalTranslation: "smaller than aspirations suggest" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing through geographic and product expansion" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins recovering from rate pressures" },
			beta: { label: "Beta", value: "1.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — typical regional bank volatility" },
			dividendYield: { label: "Dividend Yield", value: "4.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield while the story develops" },
		},
	},
	{
		id: "orcl",
		ticker: "ORCL",
		name: "Oracle",
		bio: "the enterprise software company that refuses to die and keeps printing money",
		heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
		personalityDescription: "The boomer tech company that suddenly became an AI infrastructure play",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Oracle Refused to Be Left Behind",
			sections: [
				{ heading: "The Database Empire", content: "Oracle's database software runs the back-end of thousands of the world's largest companies. Banks, hospitals, governments — they all depend on Oracle databases that have been running for 20+ years." },
				{ heading: "The Cloud Pivot", content: "Larry Ellison pivoted Oracle hard into cloud infrastructure, investing billions to build data centers. Their AI-focused cloud growth has surprised everyone who wrote them off as legacy." },
				{ heading: "Why It Matters", content: "Oracle's cloud partnership with Microsoft and their role in AI training infrastructure has given them unexpected relevance in the AI era. The old dog learned new tricks." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "21.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the database moat plus cloud surprise" },
			marketCap: { label: "Market Cap", value: "$350B", explanation: "The total value of all the company's shares combined", culturalTranslation: "much larger than most people realize" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "accelerating with AI infrastructure demand" },
			profitMargin: { label: "Profit Margin", value: "26%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from high-margin software licenses" },
			beta: { label: "Beta", value: "1.05", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "less volatile than pure tech — some defensive qualities" },
			dividendYield: { label: "Dividend Yield", value: "1.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield — reinvesting for cloud buildout" },
		},
	},
	{
		id: "ibm",
		ticker: "IBM",
		name: "IBM",
		bio: "the tech grandfather that invented the PC, lost the PC, and found AI",
		heroImage: "https://images.unsplash.com/photo-1504704911898-68304a7d2807?w=800&h=600&fit=crop",
		personalityDescription: "The comeback story wearing a navy blazer and talking about Watson",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why IBM Is the Ultimate Tech Survivor",
			sections: [
				{ heading: "The Legacy", content: "IBM invented the modern PC, dominated enterprise computing for decades, and then gradually lost relevance to Microsoft, Oracle, and cloud players. They've been reinventing ever since." },
				{ heading: "The Hybrid Cloud Bet", content: "IBM's $34 billion acquisition of Red Hat in 2019 gave them the hybrid cloud story they needed. Red Hat's open-source middleware is how enterprises connect their old systems to new clouds." },
				{ heading: "Why It Matters", content: "IBM isn't trying to be Amazon or Google. They're targeting the massive, complex IT problems of large enterprises — and getting paid consulting fees for every transformation project." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "20.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for the hybrid cloud transformation" },
			marketCap: { label: "Market Cap", value: "$195B", explanation: "The total value of all the company's shares combined", culturalTranslation: "surprisingly large given the narrative" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slowly returning to growth post-Red Hat" },
			profitMargin: { label: "Profit Margin", value: "12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins from software and consulting" },
			beta: { label: "Beta", value: "0.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "below-market beta — defensive tech name" },
			dividendYield: { label: "Dividend Yield", value: "2.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend that's been growing for decades" },
		},
	},
	{
		id: "hpq",
		ticker: "HPQ",
		name: "HP Inc",
		bio: "the PC and printer company that split from Hewlett-Packard and survived",
		heroImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop",
		personalityDescription: "The tech dinosaur that realized printers are a subscription business",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 62, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why HP Inc Makes More Money on Ink Than Hardware",
			sections: [
				{ heading: "The Printer Trap", content: "HP's printer business is one of the greatest subscription models in history — sell the printer cheap, make it up on ink cartridges forever. It's the original razor-and-blade model." },
				{ heading: "The PC Business", content: "HP is one of the world's top PC manufacturers — a market that's competitive, commoditized, and surprisingly resilient. Every student, small business, and corporate office still needs them." },
				{ heading: "Why It Matters", content: "HP's split from HPE (enterprise) in 2015 created a focused consumer tech company. The business isn't glamorous but it generates substantial free cash flow that funds buybacks." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "8.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap but margins are thin in commoditized PC market" },
			marketCap: { label: "Market Cap", value: "$32B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size tech that's been consistently undervalued" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow-growing mature business" },
			profitMargin: { label: "Profit Margin", value: "7%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins bolstered by printer ink economics" },
			beta: { label: "Beta", value: "0.95", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — consumer spending cycle sensitivity" },
			dividendYield: { label: "Dividend Yield", value: "3.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield from disciplined capital return" },
		},
	},
	{
		id: "dell",
		ticker: "DELL",
		name: "Dell Technologies",
		bio: "the PC company that went private, came back, and became an AI server giant",
		heroImage: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&h=600&fit=crop",
		personalityDescription: "The company that went from your dorm room laptop to the AI data center",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Dell Is the Quiet Winner of the AI Hardware Race",
			sections: [
				{ heading: "The Server Business", content: "Dell's infrastructure segment — servers, storage, networking — is booming as companies build out AI data centers. Every NVIDIA GPU needs a Dell server to run in." },
				{ heading: "The PC Legacy", content: "Dell remains one of the world's largest PC manufacturers. It's a low-margin business, but it funds the higher-margin infrastructure division that's actually exciting investors." },
				{ heading: "Why It Matters", content: "Dell went private in 2013, did a messy merger with EMC, relisted in 2018, and somehow ended up in the perfect position for the AI infrastructure boom. Sometimes the story ends well." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "17.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonably priced for the AI infrastructure exposure" },
			marketCap: { label: "Market Cap", value: "$55B", explanation: "The total value of all the company's shares combined", culturalTranslation: "undervalued relative to AI hardware peers" },
			revenueGrowth: { label: "Revenue Growth", value: "11%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong growth from AI server demand" },
			profitMargin: { label: "Profit Margin", value: "5%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin margins in PC weigh down the better infrastructure margins" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — follows enterprise IT spending cycles" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small but growing dividend" },
		},
	},
	{
		id: "acn",
		ticker: "ACN",
		name: "Accenture",
		bio: "the consulting firm that builds the tech everyone else takes credit for",
		heroImage: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop",
		personalityDescription: "The ambitious college grad who does all the work while the partner takes the call",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Accenture Is the World's Largest Tech Implementation Firm",
			sections: [
				{ heading: "The Scale", content: "Accenture employs 700,000+ consultants across 120 countries. When a Fortune 500 company wants to implement SAP, move to the cloud, or transform its supply chain, they call Accenture." },
				{ heading: "The AI Pivot", content: "Accenture has invested billions in AI and data capabilities, positioning themselves as the go-to partner for enterprise AI transformation. Every company needs help with AI — and Accenture wants to be the helper." },
				{ heading: "Why It Matters", content: "Consulting firms live on relationships and trust built over decades. Accenture has the scale, the reputation, and now the AI capabilities to be essential for the next technology wave." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium justified by quality and recurring engagements" },
			marketCap: { label: "Market Cap", value: "$195B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive firm commanding a premium" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady grower driven by digital transformation demand" },
			profitMargin: { label: "Profit Margin", value: "12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from high-value services" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "less volatile than pure tech — services are recurring" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield from a quality compounder" },
		},
	},
	{
		id: "sap",
		ticker: "SAP",
		name: "SAP",
		bio: "enterprise software that mid-size companies cannot escape no matter how hard they try",
		heroImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop",
		personalityDescription: "The German software company that's basically a government for corporate operations",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why SAP Controls Enterprise Processes",
			sections: [
				{ heading: "The ERP Chokehold", content: "SAP's enterprise resource planning software runs the core operations of over 400,000 companies. When a business builds its processes around SAP, the switching cost is measured in years and billions." },
				{ heading: "The Cloud Transition", content: "SAP has been moving customers from on-premise licenses to cloud subscriptions for years. The transition is painful short-term but creates more predictable long-term revenue." },
				{ heading: "Why It Matters", content: "SAP is deeply embedded in global supply chains, manufacturing, finance, and HR. When SAP has an outage, factories stop running. That kind of criticality is the ultimate moat." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "27.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the enterprise moat" },
			marketCap: { label: "Market Cap", value: "$225B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive European tech company often ignored by US investors" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "transitioning to cloud is boosting recurring revenue" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from high-switching-cost software" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low volatility — enterprise software is very defensive" },
			dividendYield: { label: "Dividend Yield", value: "1.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield from a mature software compounder" },
		},
	},
	{
		id: "hubs",
		ticker: "HUBS",
		name: "HubSpot",
		bio: "the CRM that made marketing actually fun for startups and small businesses",
		heroImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
		personalityDescription: "The cool marketing tool that became the go-to platform for every scrappy startup",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why HubSpot Won the Hearts of Marketers",
			sections: [
				{ heading: "The Inbound Movement", content: "HubSpot literally invented the term 'inbound marketing' — the idea that companies should attract customers with useful content rather than interrupt them with ads. The methodology built the software." },
				{ heading: "The SMB Sweet Spot", content: "HubSpot focuses on small and medium-sized businesses — companies too small for Salesforce but too sophisticated for spreadsheets. Their freemium model creates a pipeline of customers who graduate to paid plans." },
				{ heading: "Why It Matters", content: "Every startup learns marketing on HubSpot. That creates a generation of marketers who request HubSpot at every company they join — a viral enterprise adoption flywheel." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "growth stock priced for future profitability" },
			marketCap: { label: "Market Cap", value: "$22B", explanation: "The total value of all the company's shares combined", culturalTranslation: "growth multiple reflects high expectations" },
			revenueGrowth: { label: "Revenue Growth", value: "20%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong revenue growth from SMB adoption" },
			profitMargin: { label: "Profit Margin", value: "-3%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "negative margins as they invest in growth" },
			beta: { label: "Beta", value: "1.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile growth tech — moves with rate expectations" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — reinvesting aggressively for growth" },
		},
	},
	{
		id: "team",
		ticker: "TEAM",
		name: "Atlassian",
		bio: "the company behind Jira that developers love to complain about but can't quit",
		heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
		personalityDescription: "The project management tool that's simultaneously hated and indispensable",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Atlassian Won Developer Workflows",
			sections: [
				{ heading: "The Jira Stranglehold", content: "Jira is the standard project management tool for software development teams. It's notorious for being complex and sometimes frustrating — and also completely ubiquitous. Every dev team uses it." },
				{ heading: "The Slack Comparison", content: "Atlassian's Confluence, Trello, and Bitbucket create an ecosystem around Jira. Like Slack before it was acquired, Atlassian's tools become the operating system for how tech teams work." },
				{ heading: "Why It Matters", content: "Switching away from Jira means retraining every developer, migrating years of project history, and rebuilding integrations. Companies don't do it. That's the moat." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the developer workflow lock-in" },
			marketCap: { label: "Market Cap", value: "$55B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant market cap for an Australian tech company" },
			revenueGrowth: { label: "Revenue Growth", value: "23%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong growth from cloud migration of existing customers" },
			profitMargin: { label: "Profit Margin", value: "-2%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "investing heavily — not yet profitable at scale" },
			beta: { label: "Beta", value: "1.28", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderately volatile growth tech" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — all growth mode" },
		},
	},
	{
		id: "net",
		ticker: "NET",
		name: "Cloudflare",
		bio: "the internet's security and performance layer protecting everything",
		heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
		personalityDescription: "The invisible shield that keeps the internet working when it shouldn't",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 78, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Cloudflare Became the Internet's Security Blanket",
			sections: [
				{ heading: "The Global Network", content: "Cloudflare operates one of the world's largest networks, with data centers in 250+ cities. They sit between the internet and websites, speeding up and securing traffic." },
				{ heading: "The Zero-Trust Future", content: "Cloudflare is positioning itself as the network security layer for the zero-trust era — where companies no longer have a traditional perimeter and need security everywhere." },
				{ heading: "Why It Matters", content: "As cyber attacks multiply and the network perimeter dissolves, Cloudflare's position as the universal security and performance layer becomes more critical. They're infrastructure for the modern internet." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "growth premium for critical internet infrastructure" },
			marketCap: { label: "Market Cap", value: "$47B", explanation: "The total value of all the company's shares combined", culturalTranslation: "high valuation reflects long-term potential" },
			revenueGrowth: { label: "Revenue Growth", value: "29%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "rapid growth as security demand accelerates" },
			profitMargin: { label: "Profit Margin", value: "-8%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "investing for scale — profitability building" },
			beta: { label: "Beta", value: "1.62", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile growth tech with strong fundamentals" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — compounding through reinvestment" },
		},
	},
	{
		id: "okta",
		ticker: "OKTA",
		name: "Okta",
		bio: "the login screen every company uses to manage who gets in",
		heroImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop",
		personalityDescription: "The gatekeeper of every work password you've reset three times this year",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 42, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Okta Is the Front Door to Enterprise Security",
			sections: [
				{ heading: "The Identity Layer", content: "Okta manages the identity and access management for thousands of companies. When you log into your work apps with Single Sign-On, that's often Okta behind the scenes." },
				{ heading: "The Auth0 Acquisition", content: "Okta acquired Auth0 in 2021 for $6.5 billion to expand from enterprise identity into developer identity. The integration has been challenging but the combined platform is powerful." },
				{ heading: "Why It Matters", content: "Zero-trust security starts with identity — knowing who every user is before granting access. Okta is the foundational layer of modern enterprise security architecture." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "discounted from peak — growth slowing but still solid" },
			marketCap: { label: "Market Cap", value: "$17B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant discount from all-time highs" },
			revenueGrowth: { label: "Revenue Growth", value: "17%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "revenue growth decelerating from rapid pace" },
			profitMargin: { label: "Profit Margin", value: "-12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "high investments keeping margins negative" },
			beta: { label: "Beta", value: "1.35", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderately volatile — growth concerns weigh" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — investing for the platform" },
		},
	},
	{
		id: "ftnt",
		ticker: "FTNT",
		name: "Fortinet",
		bio: "cybersecurity hardware and software at a scale most competitors can't match",
		heroImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop",
		personalityDescription: "The Swiss Army knife of cybersecurity that somehow does everything",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Fortinet's Integrated Approach Wins Enterprise Security",
			sections: [
				{ heading: "The Security Fabric", content: "Fortinet's 'Security Fabric' integrates firewall, VPN, endpoint, cloud, and more into one platform. Their custom ASIC chips make the hardware faster and cheaper than software-only competitors." },
				{ heading: "The Hardware Advantage", content: "Making your own chips is unusual in cybersecurity. Fortinet's investment in proprietary hardware creates performance advantages and manufacturing-scale advantages that pure software companies can't replicate." },
				{ heading: "Why It Matters", content: "Enterprise security is fragmenting into too many point solutions. Fortinet's integrated platform is the consolidation play — one vendor, one management console, one bill." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "36.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the integrated security leader" },
			marketCap: { label: "Market Cap", value: "$60B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large cybersecurity company at fair valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "11%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "solid growth from platform consolidation trend" },
			profitMargin: { label: "Profit Margin", value: "25%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins for a hardware+software business" },
			beta: { label: "Beta", value: "1.32", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate tech volatility" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — growth company" },
		},
	},
	{
		id: "zs",
		ticker: "ZS",
		name: "Zscaler",
		bio: "cloud security for the remote-work era — protecting everyone who left the office",
		heroImage: "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&h=600&fit=crop",
		personalityDescription: "The security company that made corporate firewalls obsolete",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Zscaler Is Cloud Security's Clear Leader",
			sections: [
				{ heading: "The Perimeter Problem", content: "Traditional security put a firewall around the corporate office. When everyone went remote, that perimeter disappeared. Zscaler built security for a world where the network is the internet itself." },
				{ heading: "The Zero Trust Architecture", content: "Zscaler's 'zero trust' model assumes nothing inside the network is safe. Every user and device must prove who they are before accessing anything. It's the only security model that makes sense for remote work." },
				{ heading: "Why It Matters", content: "Zscaler operates one of the world's largest security clouds, inspecting billions of transactions daily. That scale gives them threat intelligence no smaller competitor can match." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "growth premium for a clear market leader" },
			marketCap: { label: "Market Cap", value: "$32B", explanation: "The total value of all the company's shares combined", culturalTranslation: "high multiple reflects the remote work security opportunity" },
			revenueGrowth: { label: "Revenue Growth", value: "21%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong revenue growth from cloud security adoption" },
			profitMargin: { label: "Profit Margin", value: "-18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "investing aggressively — negative margins but improving" },
			beta: { label: "Beta", value: "1.52", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile growth name — moves with macro sentiment" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — growth phase" },
		},
	},
	{
		id: "s",
		ticker: "S",
		name: "SentinelOne",
		bio: "AI-powered endpoint security competing head-to-head with CrowdStrike",
		heroImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop",
		personalityDescription: "The underdog AI security company that refuses to yield to the market leader",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why SentinelOne's AI Approach Stands Out",
			sections: [
				{ heading: "The Endpoint AI", content: "SentinelOne uses AI to detect and respond to threats at the endpoint level — the laptops and servers of every employee. Their autonomous response can stop attacks without human intervention." },
				{ heading: "The Crowdstrike Competition", content: "SentinelOne competes directly with CrowdStrike — and sometimes wins, especially in deals where customers want an alternative to the dominant player. Competition is healthy for innovation." },
				{ heading: "Why It Matters", content: "Endpoint security is the first line of defense against ransomware and breaches. As attacks become more sophisticated, AI-powered defense is table stakes — not optional." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "deeply discounted growth name" },
			marketCap: { label: "Market Cap", value: "$17B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant discount to CrowdStrike peer" },
			revenueGrowth: { label: "Revenue Growth", value: "28%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "rapid growth but profitability is still years away" },
			profitMargin: { label: "Profit Margin", value: "-30%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "high investment in R&D and sales" },
			beta: { label: "Beta", value: "1.45", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — moves hard with growth tech sentiment" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — burning cash for growth" },
		},
	},
	{
		id: "twlo",
		ticker: "TWLO",
		name: "Twilio",
		bio: "the API that puts the text messages and calls inside every app you use",
		heroImage: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop",
		personalityDescription: "The invisible communications layer that makes every app feel smart",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Twilio Powers App Communication",
			sections: [
				{ heading: "The Developer Platform", content: "Twilio's APIs let developers add SMS, voice, video, and email to any application with a few lines of code. Uber's driver texts, Airbnb's booking confirmations, bank fraud alerts — all Twilio." },
				{ heading: "The Segment Acquisition", content: "Twilio acquired Segment in 2020 for $3.2 billion to add customer data capabilities. The idea: know who every user is, then communicate with them perfectly. Execution has been difficult." },
				{ heading: "Why It Matters", content: "Every startup building a product that needs to communicate with users builds on Twilio. That developer-first adoption creates enterprise deals years later." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap from peak — execution concerns weigh" },
			marketCap: { label: "Market Cap", value: "$10B", explanation: "The total value of all the company's shares combined", culturalTranslation: "down significantly from highs on growth slowdown" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slowing from hypergrowth to normal growth" },
			profitMargin: { label: "Profit Margin", value: "-22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "negative margins as they optimize the cost structure" },
			beta: { label: "Beta", value: "1.48", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — macro sensitivity is high" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — restructuring for profitability" },
		},
	},
	{
		id: "path",
		ticker: "PATH",
		name: "UiPath",
		bio: "the software robot company that automates the boring parts of every business",
		heroImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop",
		personalityDescription: "The digital employee that does the repetitive tasks humans hate",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why UiPath Is Automation's Market Leader",
			sections: [
				{ heading: "The RPA Market", content: "Robotic Process Automation (RPA) software creates bots that handle repetitive computer tasks — data entry, form filling, report generation. UiPath leads this market alongside Automation Anywhere." },
				{ heading: "The AI Layer", content: "UiPath is adding AI capabilities to their automation platform — letting robots understand documents, make decisions, and handle more complex workflows. It's automation graduating from rules to intelligence." },
				{ heading: "Why It Matters", content: "Every large company has thousands of employees doing repetitive computer work that could be automated. UiPath's market is enormous and barely scratched." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap from peak as the RPA market matured faster than expected" },
			marketCap: { label: "Market Cap", value: "$10B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant discount to original IPO price" },
			revenueGrowth: { label: "Revenue Growth", value: "13%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slowing growth in competitive market" },
			profitMargin: { label: "Profit Margin", value: "-15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "negative margins — investing for scale" },
			beta: { label: "Beta", value: "1.38", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile growth tech name" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "bill",
		ticker: "BILL",
		name: "Bill.com",
		bio: "accounts payable software that makes paper checks feel embarrassing",
		heroImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
		personalityDescription: "The startup that convinced CFOs to stop mailing paper checks in 2023",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Bill.com Is Digitizing Business Payments",
			sections: [
				{ heading: "The B2B Payments Gap", content: "Consumer payments went digital years ago. Business-to-business payments — still 40% paper checks in the US — are years behind. Bill.com is digitizing that massive opportunity." },
				{ heading: "The Network Effect", content: "Bill.com connects 6+ million businesses in their payment network. Once suppliers get paid through Bill.com, they invite their customers — a classic two-sided network growing organically." },
				{ heading: "Why It Matters", content: "B2B payments are enormous in volume and embarrassingly manual. Every paper check is an opportunity for Bill.com. The market is measured in trillions." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "discounted from peak — growth slowing but market huge" },
			marketCap: { label: "Market Cap", value: "$9B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant discount from all-time highs" },
			revenueGrowth: { label: "Revenue Growth", value: "14%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "decelerating growth after rapid pandemic-era gains" },
			profitMargin: { label: "Profit Margin", value: "-10%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "negative margins — investing in the network" },
			beta: { label: "Beta", value: "1.55", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile growth name" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "snap",
		ticker: "SNAP",
		name: "Snap",
		bio: "the camera app that Gen Z prefers even though Instagram keeps copying everything",
		heroImage: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=600&fit=crop",
		personalityDescription: "The innovator that invents features and watches Meta steal them",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 75, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 82, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Snap Keeps Surviving Despite Meta's Copying",
			sections: [
				{ heading: "The Original Stories", content: "Snap invented Stories — the disappearing photo format. Instagram copied it and it became Instagram's most-used feature. Snap lost the format war but kept their core audience." },
				{ heading: "The AR Differentiation", content: "Snap has quietly built the world's most sophisticated augmented reality platform. Brands use Snap Lenses to let customers try on products virtually. That AR capability is genuinely hard to replicate." },
				{ heading: "Why It Matters", content: "Snap's audience is fiercely loyal among Gen Z — a demographic that advertisers desperately want. Despite its challenges, Snap is the daily communication medium for millions of young people." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — but profitability has been elusive" },
			marketCap: { label: "Market Cap", value: "$17B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significantly below peak valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "16%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from core Gen Z user base" },
			profitMargin: { label: "Profit Margin", value: "-18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "investing to reduce losses — margins improving slowly" },
			beta: { label: "Beta", value: "1.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high volatility — sentiment-driven stock" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "pins",
		ticker: "PINS",
		name: "Pinterest",
		bio: "the mood board that quietly became a shopping engine",
		heroImage: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&h=600&fit=crop",
		personalityDescription: "The platform for planning dream weddings and actually finding things to buy",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Pinterest Is the Social Commerce Sleeper",
			sections: [
				{ heading: "The Shopping Intent", content: "Pinterest users come with purchase intent — they're planning, discovering, and deciding what to buy. That's far more valuable to advertisers than someone scrolling TikTok passively." },
				{ heading: "The Shoppable Pins", content: "Pinterest has made it increasingly easy to buy directly from pins without leaving the app. Partnerships with Shopify and others make Pinterest a checkout-enabled discovery platform." },
				{ heading: "Why It Matters", content: "Pinterest occupies a unique space between search and social — users actively looking for inspiration rather than passively consuming content. That intent makes their ad inventory valuable." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap relative to the monetization opportunity" },
			marketCap: { label: "Market Cap", value: "$20B", explanation: "The total value of all the company's shares combined", culturalTranslation: "modest market cap for a unique social property" },
			revenueGrowth: { label: "Revenue Growth", value: "18%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "accelerating as shopping features improve" },
			profitMargin: { label: "Profit Margin", value: "14%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "turning profitable on improved monetization" },
			beta: { label: "Beta", value: "1.22", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — less volatile than pure social media" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — growth phase" },
		},
	},
	{
		id: "rddt",
		ticker: "RDDT",
		name: "Reddit",
		bio: "the front page of the internet that finally IPO'd after 19 years",
		heroImage: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=600&fit=crop",
		personalityDescription: "The internet's most chaotic, authentic, and valuable community platform",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 85, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 88, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Reddit Is the Web's Most Trusted Information Source",
			sections: [
				{ heading: "The Community Flywheel", content: "Reddit hosts millions of niche communities — subreddits — where people share expertise, debate ideas, and help strangers. It's the internet's collective brain, organized by topic." },
				{ heading: "The Data Goldmine", content: "Reddit's human-generated conversations are incredibly valuable for AI training. Google pays Reddit hundreds of millions per year just to use their data. It's a new revenue stream nobody expected." },
				{ heading: "Why It Matters", content: "When you search something and add 'reddit' to find a real human answer instead of SEO content, that's a testament to Reddit's unique value. The community trust is the moat." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "high growth multiple — IPO was well-received then volatile" },
			marketCap: { label: "Market Cap", value: "$14B", explanation: "The total value of all the company's shares combined", culturalTranslation: "decent market cap for a beloved but recently public company" },
			revenueGrowth: { label: "Revenue Growth", value: "47%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong revenue growth from data licensing and ads" },
			profitMargin: { label: "Profit Margin", value: "-25%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "losses as they invest post-IPO" },
			beta: { label: "Beta", value: "2.08", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very volatile — recent IPO with momentum trading" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "match",
		ticker: "MATCH",
		name: "Match Group",
		bio: "owns Tinder, Hinge, and basically the entire swipe-based dating economy",
		heroImage: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&h=600&fit=crop",
		personalityDescription: "The company that owns every app you've downloaded to find love (and didn't)",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 68, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Match Group Owns the Love App Economy",
			sections: [
				{ heading: "The Portfolio", content: "Match Group owns Tinder, Hinge, Match.com, OkCupid, and dozens of other dating apps. They essentially control the market for digital matchmaking across different demographics." },
				{ heading: "The Hinge Growth Story", content: "Tinder's core user base is aging up, but Hinge — targeting relationship-seekers rather than hookups — is growing fast. The Hinge 'designed to be deleted' brand is genuinely differentiated." },
				{ heading: "Why It Matters", content: "Online dating is one of the few consumer internet businesses where users pay. Tinder Gold subscriptions, Hinge+ features — people will pay to find love. That monetization is powerful." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — meaningful multiple compression from competition" },
			marketCap: { label: "Market Cap", value: "$9B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant discount from peak valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "2%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "flat growth as competition from Bumble, apps intensifies" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins in a paid subscription model" },
			beta: { label: "Beta", value: "1.32", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderately volatile with sentiment shifts" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "dash",
		ticker: "DASH",
		name: "DoorDash",
		bio: "food delivery that turned into a logistics empire one burrito at a time",
		heroImage: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&h=600&fit=crop",
		personalityDescription: "The company that convinced Americans they're too important to pick up their own food",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 70, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why DoorDash Won the Delivery Wars",
			sections: [
				{ heading: "The Last-Mile Network", content: "DoorDash built the densest delivery network in the US by focusing on suburban markets that competitors ignored. That suburban dominance gave them an unassailable lead." },
				{ heading: "The Beyond Food Push", content: "DoorDash is expanding into grocery delivery, alcohol, convenience, and even non-food items. The infrastructure built for food delivery is flexible enough to deliver anything." },
				{ heading: "Why It Matters", content: "DoorDash doesn't just deliver food — they represent the expectation that anything can be delivered in under an hour. That expectation, once set, doesn't go away." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "not yet profitable but dominant in growing market" },
			marketCap: { label: "Market Cap", value: "$25B", explanation: "The total value of all the company's shares combined", culturalTranslation: "decent market cap for the market share leader" },
			revenueGrowth: { label: "Revenue Growth", value: "23%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent strong growth" },
			profitMargin: { label: "Profit Margin", value: "-4%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "approaching break-even on improved unit economics" },
			beta: { label: "Beta", value: "1.45", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile growth name" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "pton",
		ticker: "PTON",
		name: "Peloton",
		bio: "the pandemic fitness darling that became a cautionary tale almost overnight",
		heroImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
		personalityDescription: "The treadmill that was worth more than Ford during COVID and then wasn't",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 55, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 95, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Peloton's Rise and Fall Is a Business School Case Study",
			sections: [
				{ heading: "The COVID Rocket", content: "During lockdowns, Peloton's connected fitness bikes were impossible to get. Revenue tripled, the stock went parabolic, and the CEO talked about disrupting fitness forever." },
				{ heading: "The Return to Reality", content: "When gyms reopened, demand collapsed. Peloton had over-expanded manufacturing, hired too many people, and found itself with warehouses of bikes no one wanted. The stock fell 90% from peak." },
				{ heading: "Why It Matters", content: "Peloton is a perfect example of COVID distortion — a real business that got wildly over-valued as the pandemic made every trend look permanent. The core product is still good, the brand survived." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "speculative — turnaround story with real risk" },
			marketCap: { label: "Market Cap", value: "$3.5B", explanation: "The total value of all the company's shares combined", culturalTranslation: "down massively from peak — deep value or value trap" },
			revenueGrowth: { label: "Revenue Growth", value: "-15%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "shrinking revenue as gym reopening took customers back" },
			profitMargin: { label: "Profit Margin", value: "-35%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "deeply negative margins, restructuring ongoing" },
			beta: { label: "Beta", value: "1.85", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high volatility — turnaround risk premium" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "nu",
		ticker: "NU",
		name: "Nu Holdings",
		bio: "the Brazilian fintech that's giving 90 million people their first bank account",
		heroImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
		personalityDescription: "The fintech challenger making traditional Brazilian banks look like dinosaurs",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Nu Is the Fastest-Growing Fintech on Earth",
			sections: [
				{ heading: "The Brazil Opportunity", content: "Brazil had a highly concentrated banking system with historically high fees — the perfect environment for a challenger. Nu entered offering a free credit card with a better app and took off." },
				{ heading: "The Scale", content: "Nu has grown to 90+ million customers across Brazil, Mexico, and Colombia, making it the largest digital bank in Latin America and one of the largest in the world by customer count." },
				{ heading: "Why It Matters", content: "Nu is proving that you can serve the financially underserved profitably. Their NPS scores are off the charts — customers who had terrible bank experiences are genuinely grateful for Nu." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "32.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the highest-growth fintech in the world" },
			marketCap: { label: "Market Cap", value: "$62B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive market cap for a market full of opportunity" },
			revenueGrowth: { label: "Revenue Growth", value: "22%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "explosive growth with profitability improving" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "positive and improving margins" },
			beta: { label: "Beta", value: "1.45", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — emerging market exposure adds risk" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — reinvesting every penny" },
		},
	},
	{
		id: "meli",
		ticker: "MELI",
		name: "MercadoLibre",
		bio: "Latin America's Amazon, PayPal, and Shopify all in one app",
		heroImage: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=600&fit=crop",
		personalityDescription: "The everything company that gets underestimated because it's in Spanish",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why MercadoLibre Dominates Latin America's Digital Economy",
			sections: [
				{ heading: "The Amazon of Latin America", content: "MercadoLibre built the dominant e-commerce marketplace across Latin America. But unlike Amazon, they also built Mercado Pago — the region's leading digital payments platform." },
				{ heading: "The Fintech Integration", content: "Mercado Pago processes hundreds of billions in payments annually. They offer credit, insurance, and investment products. It's the financial system Latin America never quite had." },
				{ heading: "Why It Matters", content: "Latin America's e-commerce and fintech markets are years behind the US, and both are growing rapidly. MercadoLibre is the infrastructure those markets run on." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "68.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the dominant Latin America tech platform" },
			marketCap: { label: "Market Cap", value: "$85B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive opportunity still barely scratched" },
			revenueGrowth: { label: "Revenue Growth", value: "35%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "one of the fastest-growing large tech companies" },
			profitMargin: { label: "Profit Margin", value: "12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins improving as scale grows" },
			beta: { label: "Beta", value: "1.62", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — emerging markets premium" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — reinvesting for the opportunity" },
		},
	},
	{
		id: "se",
		ticker: "SE",
		name: "Sea Limited",
		bio: "Southeast Asia's gaming, e-commerce, and fintech giant all rolled into one",
		heroImage: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=600&fit=crop",
		personalityDescription: "The Southeast Asian tech conglomerate doing everything at once",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Sea Limited Is Southeast Asia's Tech Titan",
			sections: [
				{ heading: "The Garena Foundation", content: "Sea started with Garena, a gaming platform that dominates in Southeast Asia. The cash flow from gaming funded e-commerce (Shopee) and digital financial services (SeaMoney)." },
				{ heading: "The Shopee Battle", content: "Shopee became the leading e-commerce platform across Southeast Asia and some parts of Latin America. The expansion was aggressive and expensive — creating massive losses that the market hated." },
				{ heading: "Why It Matters", content: "Southeast Asia has 700 million people rapidly coming online for the first time. Sea's infrastructure across gaming, shopping, and payments positions them to capture that wave." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "discounted from peak as growth priorities shifted" },
			marketCap: { label: "Market Cap", value: "$38B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant discount from highs as margins became priority" },
			revenueGrowth: { label: "Revenue Growth", value: "14%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "returning to growth after cost discipline" },
			profitMargin: { label: "Profit Margin", value: "-5%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins from focusing on core markets" },
			beta: { label: "Beta", value: "1.55", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — emerging market sensitivity" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "dkng",
		ticker: "DKNG",
		name: "DraftKings",
		bio: "sports betting that turned gambling into a mainstream consumer app",
		heroImage: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop",
		personalityDescription: "The sportsbook that convinced your dad gambling is now just 'a hobby'",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 65, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 80, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why DraftKings Made Sports Betting Normal",
			sections: [
				{ heading: "The Legalization Wave", content: "After the Supreme Court struck down the federal sports betting ban in 2018, states rushed to legalize and tax sports betting. DraftKings was perfectly positioned with its daily fantasy infrastructure." },
				{ heading: "The App Economy", content: "DraftKings' app is genuinely excellent — live odds, same-game parlays, loyalty programs, and a social element that makes betting feel like a game. That UX excellence drives user retention." },
				{ heading: "Why It Matters", content: "Sports betting is now legal in most US states and becoming a mainstream part of how Americans watch sports. DraftKings is the leading brand in that cultural shift." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "not yet profitable but market share is real" },
			marketCap: { label: "Market Cap", value: "$20B", explanation: "The total value of all the company's shares combined", culturalTranslation: "reasonable for a market leader in a growing industry" },
			revenueGrowth: { label: "Revenue Growth", value: "28%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong growth as legalization expands" },
			profitMargin: { label: "Profit Margin", value: "-14%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "high marketing spend keeps margins negative" },
			beta: { label: "Beta", value: "1.85", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — sentiment moves fast on sports betting stocks" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "arm",
		ticker: "ARM",
		name: "ARM Holdings",
		bio: "the chip architecture inside literally every smartphone on earth",
		heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop",
		personalityDescription: "The British company that quietly makes a dollar every time a chip is made",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 80, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why ARM's Architecture Powers Everything You Hold",
			sections: [
				{ heading: "The IP Model", content: "ARM doesn't make chips — they design the instruction set that other companies license to build chips. Apple, Qualcomm, Samsung, and hundreds of others all pay ARM for the right to use their architecture." },
				{ heading: "The Mobile Dominance", content: "Over 95% of smartphones use ARM architecture. When Apple designed the A-series and M-series chips that revolutionized performance and efficiency, they built them on ARM." },
				{ heading: "Why It Matters", content: "As computing shifts from PCs (Intel architecture) to mobile, IoT, and custom AI chips, ARM's prevalence only increases. The royalty model scales with every device sold." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the essential chip IP" },
			marketCap: { label: "Market Cap", value: "$130B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive valuation — priced for growth" },
			revenueGrowth: { label: "Revenue Growth", value: "20%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "solid growth from royalties on every chip shipped" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from the IP licensing model" },
			beta: { label: "Beta", value: "1.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — moves hard with semiconductor sentiment" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "tiny yield for their size" },
		},
	},
	{
		id: "on",
		ticker: "ON",
		name: "ON Semiconductor",
		bio: "power management chips for the EV and industrial revolution",
		heroImage: "https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=800&h=600&fit=crop",
		personalityDescription: "The semiconductor company that pivoted to green energy at the perfect time",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why ON Semi Is the EV Chip Winner",
			sections: [
				{ heading: "The SiC Bet", content: "ON Semiconductor has made a massive bet on silicon carbide (SiC) chips — the key technology for efficient power management in electric vehicles. SiC is to EVs what NVIDIA's GPU is to AI." },
				{ heading: "The Industrial Play", content: "Beyond EVs, ON makes chips for industrial automation, 5G infrastructure, and renewable energy inverters. The industrial electrification theme is long-lived and large." },
				{ heading: "Why It Matters", content: "Every EV needs power management chips to convert and control electricity efficiently. ON's SiC wafers are designed specifically for that application — a focused bet that's paying off." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "16.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the EV semiconductor transition" },
			marketCap: { label: "Market Cap", value: "$17B", explanation: "The total value of all the company's shares combined", culturalTranslation: "fairly priced for a specialized semiconductor" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "cyclical — EV demand drives revenue" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from SiC specialization" },
			beta: { label: "Beta", value: "1.45", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile with semiconductor and EV cycles" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — investing in capacity" },
		},
	},
	{
		id: "adi",
		ticker: "ADI",
		name: "Analog Devices",
		bio: "the analog chips connecting the real world to digital systems",
		heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop",
		personalityDescription: "The niche chip company that's essential to everything from MRIs to factory robots",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 20, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Analog Devices Is the Bridge Between Physical and Digital",
			sections: [
				{ heading: "The Analog Advantage", content: "Digital chips process 1s and 0s. Analog chips process the real world — temperature, pressure, sound, radio waves. Everything physical that connects to digital systems needs Analog Devices." },
				{ heading: "The Industrial IoT", content: "As factories, healthcare equipment, and infrastructure get smarter, they all need sensors and signal processing. Analog Devices makes the chips that listen to the physical world." },
				{ heading: "Why It Matters", content: "You can't replace analog signal processing with software. The real world is analog — and Analog Devices is one of the few companies that truly masters that domain." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for a high-quality specialty chip company" },
			marketCap: { label: "Market Cap", value: "$85B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large semiconductor company at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "cyclical recovery underway" },
			profitMargin: { label: "Profit Margin", value: "35%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from specialty chip advantage" },
			beta: { label: "Beta", value: "1.15", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — semiconductor cycle volatility" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "decent yield for a semiconductor company" },
		},
	},
	{
		id: "mpwr",
		ticker: "MPWR",
		name: "Monolithic Power Systems",
		bio: "power management chips with growth rates that embarrass larger competitors",
		heroImage: "https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=800&h=600&fit=crop",
		personalityDescription: "The small chip company growing like it's a software startup",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Monolithic Power Keeps Beating Expectations",
			sections: [
				{ heading: "The Power Management Niche", content: "Monolithic Power designs power management ICs — chips that efficiently deliver the right voltage to every component in a device. It's foundational to extending battery life and reducing heat." },
				{ heading: "The AI Data Center Win", content: "AI data centers need enormous amounts of power managed precisely. Monolithic Power's chips are increasingly designed into the power delivery systems for AI servers and GPUs." },
				{ heading: "Why It Matters", content: "As AI infrastructure scales up, power efficiency becomes more critical — and more valuable. Monolithic Power's position in AI power management is a significant growth driver." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "50.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive but growth justifies a premium" },
			marketCap: { label: "Market Cap", value: "$25B", explanation: "The total value of all the company's shares combined", culturalTranslation: "impressive market cap for a focused chip company" },
			revenueGrowth: { label: "Revenue Growth", value: "22%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong double-digit growth from AI data center demand" },
			profitMargin: { label: "Profit Margin", value: "32%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins for a chip company" },
			beta: { label: "Beta", value: "1.52", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — semiconductor sentiment driven" },
			dividendYield: { label: "Dividend Yield", value: "0.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small but growing dividend" },
		},
	},
	{
		id: "swks",
		ticker: "SWKS",
		name: "Skyworks Solutions",
		bio: "the 5G and WiFi chips nobody thinks about but every phone contains",
		heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop",
		personalityDescription: "The unsexy chip company that powers every wireless connection you make",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Skyworks Is Inside Every Wireless Device",
			sections: [
				{ heading: "The RF Front-End", content: "Skyworks makes the radio frequency chips that enable wireless connectivity in smartphones, tablets, and IoT devices. Their chips are in virtually every major phone — Apple, Samsung, and more." },
				{ heading: "The 5G Cycle", content: "Every 5G phone needs more RF chips than the 4G phone it replaced. As 5G adoption accelerates globally, Skyworks benefits from higher content per device." },
				{ heading: "Why It Matters", content: "Wireless connectivity is foundational to the modern world. Every new connected device — smart home, wearable, industrial sensor — needs Skyworks' chips." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap relative to peers — Apple concentration concern" },
			marketCap: { label: "Market Cap", value: "$14B", explanation: "The total value of all the company's shares combined", culturalTranslation: "fairly priced for a quality RF chip maker" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "recovering from smartphone down-cycle" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from fab-lite chip model" },
			beta: { label: "Beta", value: "1.25", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — moves with smartphone cycle" },
			dividendYield: { label: "Dividend Yield", value: "2.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield for a semiconductor company" },
		},
	},
	{
		id: "smci",
		ticker: "SMCI",
		name: "Super Micro Computer",
		bio: "AI server infrastructure that rode the NVIDIA wave to the moon",
		heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
		personalityDescription: "The server company that became an AI darling and then an accounting nightmare",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 62, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 88, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 85, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Super Micro Is AI's Controversial Infrastructure Play",
			sections: [
				{ heading: "The AI Server Surge", content: "When AI demand exploded, Super Micro's modular server designs were perfectly positioned. Their close partnership with NVIDIA and speed of design iteration won huge AI data center contracts." },
				{ heading: "The Accounting Issues", content: "In 2024, Super Micro faced accounting investigation and delayed financial filings — spooking investors who had driven the stock up 10x. The revelations of past issues added to the drama." },
				{ heading: "Why It Matters", content: "Super Micro's technical capabilities in AI server design are real — the controversy is about governance, not product quality. The market has to decide if the discount is justified." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap from peak — governance discount is significant" },
			marketCap: { label: "Market Cap", value: "$35B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant decline from all-time highs" },
			revenueGrowth: { label: "Revenue Growth", value: "55%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "explosive growth from AI infrastructure" },
			profitMargin: { label: "Profit Margin", value: "7%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin margins but improving" },
			beta: { label: "Beta", value: "1.92", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "extremely volatile — accounting issues add risk" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "baba",
		ticker: "BABA",
		name: "Alibaba",
		bio: "China's answer to Amazon, Google, and eBay all in one regulated package",
		heroImage: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=600&fit=crop",
		personalityDescription: "The Chinese tech giant that built the world's most complex digital economy",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 82, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Alibaba's Story Is Complicated by China",
			sections: [
				{ heading: "The Commerce Empire", content: "Alibaba runs Taobao and Tmall — China's dominant e-commerce platforms. They also built Alipay (now Ant Group), Alibaba Cloud, and a logistics network that rivals anything in the world." },
				{ heading: "The Regulatory Crackdown", content: "In 2020 the Chinese government began targeting Alibaba after Jack Ma criticized regulators. Ant Group's IPO was blocked, Ma disappeared, and the stock fell 70%. The regulatory risk is permanent." },
				{ heading: "Why It Matters", content: "Alibaba's underlying businesses are enormous and growing. The discount versus US peers reflects China's political risk — a risk that will never fully go away." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "9.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap but China risk discount is real" },
			marketCap: { label: "Market Cap", value: "$200B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive company trading at massive discount to Western peers" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth in core commerce" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins despite regulatory overhang" },
			beta: { label: "Beta", value: "0.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — China geopolitical risk adds volatility" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small dividend — unusual for this type of growth company" },
		},
	},
	{
		id: "bidu",
		ticker: "BIDU",
		name: "Baidu",
		bio: "China's Google that got disrupted by social media and is betting on autonomous cars",
		heroImage: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop",
		personalityDescription: "The search giant that's reinventing itself as an AI company with Chinese characteristics",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 65, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Baidu Is China's Most Interesting Reinvention",
			sections: [
				{ heading: "The Search Legacy", content: "Baidu dominated Chinese search for two decades. But as younger users shifted to WeChat, TikTok, and Douyin, Baidu's search traffic growth stalled." },
				{ heading: "The AI Pivot", content: "Baidu has invested billions in AI and autonomous driving through Apollo. Their ERNIE language model competes with ChatGPT in China. The AI pivot is ambitious and potentially transformative." },
				{ heading: "Why It Matters", content: "China is running its own AI race — separate from the US. Baidu is China's best chance at a homegrown large language model business, with government support and a huge domestic market." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "12.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "deeply discounted for China tech risk" },
			marketCap: { label: "Market Cap", value: "$32B", explanation: "The total value of all the company's shares combined", culturalTranslation: "trading at a fraction of Google's multiple" },
			revenueGrowth: { label: "Revenue Growth", value: "1%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "flat growth as search market matures" },
			profitMargin: { label: "Profit Margin", value: "14%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins from the dominant search position" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — China market conditions drive sentiment" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "jd",
		ticker: "JD",
		name: "JD.com",
		bio: "China's Amazon — actually delivers the products it sells from its own warehouses",
		heroImage: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop",
		personalityDescription: "The Chinese e-commerce company that actually owns its supply chain",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 50, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why JD.com Won by Owning the Logistics",
			sections: [
				{ heading: "The First-Party Model", content: "Unlike Alibaba's marketplace model, JD.com owns its own inventory and operates its own delivery network. That means genuine quality control and next-day delivery across China." },
				{ heading: "The Competition", content: "JD.com is squeezed between Alibaba's marketplace scale above and Pinduoduo's ultra-low-price model below. The middle positioning has been challenging in a tough Chinese consumer environment." },
				{ heading: "Why It Matters", content: "JD's logistics network is a genuine asset — 300,000+ delivery personnel and one of China's most sophisticated supply chain operations. That infrastructure has value beyond e-commerce." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — China risk and margin pressure discount" },
			marketCap: { label: "Market Cap", value: "$38B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant discount to history" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "flat to slow growth in tough China environment" },
			profitMargin: { label: "Profit Margin", value: "2%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin margins from logistics intensity" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — China macro sensitivity" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "wex",
		ticker: "WEX",
		name: "WEX",
		bio: "fleet payment cards and healthcare benefits for the businesses nobody thinks about",
		heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
		personalityDescription: "The payment company that solved problems most people didn't know existed",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 20, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why WEX Found Profit in Overlooked Payments",
			sections: [
				{ heading: "The Fleet Card", content: "WEX's fleet cards let trucking companies and delivery fleets control fuel purchases with detailed data and spending limits. It's a niche that happens to process hundreds of billions in volume." },
				{ heading: "The Healthcare Payments", content: "WEX also manages health savings accounts and benefits payments for employers. Healthcare payments are complex, regulated, and desperately in need of modernization." },
				{ heading: "Why It Matters", content: "WEX identified two overlooked payment verticals — fleet and healthcare — and built dominant market positions in both. Boring niches with high switching costs and recurring revenue." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for a niche payment company" },
			marketCap: { label: "Market Cap", value: "$8B", explanation: "The total value of all the company's shares combined", culturalTranslation: "modest size despite significant market position" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from fleet and healthcare expansion" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from specialized payment services" },
			beta: { label: "Beta", value: "1.05", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low volatility — niche market position is defensive" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "u",
		ticker: "U",
		name: "Unity Software",
		bio: "the game engine powering half the games on your phone",
		heroImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop",
		personalityDescription: "The game engine that makes it possible for a 3-person studio to build a hit",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Unity Powers the Creator Economy of Gaming",
			sections: [
				{ heading: "The Game Engine", content: "Unity's game engine is used by over 70% of mobile games globally. It's the tool independent developers use to build games without massive studios — democratizing game creation." },
				{ heading: "The Ad Business", content: "Unity monetizes through advertising in games — serving ads to billions of mobile gamers. The ad business became controversial when pricing models changed and developers revolted." },
				{ heading: "Why It Matters", content: "As gaming expands into AR, VR, and the metaverse, Unity's engine becomes the substrate of interactive experiences. They're trying to position as the operating system for real-time 3D." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "beaten down from peak — controversial pricing changes hurt" },
			marketCap: { label: "Market Cap", value: "$3.5B", explanation: "The total value of all the company's shares combined", culturalTranslation: "down massively from peak valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growth stalled by developer backlash to pricing" },
			profitMargin: { label: "Profit Margin", value: "-75%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "deeply negative margins with difficult path to profitability" },
			beta: { label: "Beta", value: "1.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very volatile — sentiment-driven growth name" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "tost",
		ticker: "TOST",
		name: "Toast",
		bio: "the restaurant point-of-sale that became the operating system of hospitality",
		heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop",
		personalityDescription: "The tablet on every restaurant counter that replaced the cash register",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Toast Is the Restaurant Industry's Software Stack",
			sections: [
				{ heading: "The POS Replacement", content: "Toast replaces old-school point-of-sale systems in restaurants with a modern, cloud-based platform that handles orders, payments, inventory, and employee management in one system." },
				{ heading: "The Distribution", content: "Toast sold its hardware and software door-to-door to restaurants — one of the most hands-on sales strategies in tech. The high-touch model created deep relationships with a fragmented market." },
				{ heading: "Why It Matters", content: "Toast processes over $100 billion in annual restaurant transactions and serves hundreds of thousands of restaurants. They're the de facto operating system for the restaurant industry." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "high multiple for a SaaS restaurant platform" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "market cap reflects the large TAM" },
			revenueGrowth: { label: "Revenue Growth", value: "28%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "rapid growth from restaurant market penetration" },
			profitMargin: { label: "Profit Margin", value: "-5%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "approaching breakeven" },
			beta: { label: "Beta", value: "1.38", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for a growth SaaS" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "ncno",
		ticker: "NCNO",
		name: "nCino",
		bio: "the cloud banking platform that's modernizing loan origination",
		heroImage: "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800&h=600&fit=crop",
		personalityDescription: "The fintech helping banks feel less like they were built in 1987",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 50, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why nCino Is the Bank's SaaS Revolution",
			sections: [
				{ heading: "The Bank Operating System", content: "nCino provides cloud-based banking software for loan origination, account opening, and compliance. Banks run on ancient legacy systems — nCino is the modern alternative." },
				{ heading: "The Financial Services Niche", content: "Banking software is uniquely sticky — banks can't risk downtime on core systems, and migrating is measured in years. Once nCino is embedded, the customer stays." },
				{ heading: "Why It Matters", content: "Every bank eventually needs to modernize its core systems. nCino is positioned to capture the wave of bank digital transformation that's been overdue for decades." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "discounted growth stock in a durable niche" },
			marketCap: { label: "Market Cap", value: "$3.5B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small but growing in a large opportunity" },
			revenueGrowth: { label: "Revenue Growth", value: "15%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from bank modernization demand" },
			profitMargin: { label: "Profit Margin", value: "-20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "negative margins — investing in the bank market" },
			beta: { label: "Beta", value: "1.22", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate volatility for a fintech SaaS" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "upst",
		ticker: "UPST",
		name: "Upstart",
		bio: "the AI lending company that wanted to replace credit scores with algorithms",
		heroImage: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
		personalityDescription: "The fintech that was either revolutionizing credit or proving AI hype was real",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 58, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 72, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Upstart's AI Lending Story Is Complicated",
			sections: [
				{ heading: "The AI Credit Model", content: "Upstart uses AI and thousands of data points to assess creditworthiness rather than relying solely on FICO scores. Their model theoretically approves more creditworthy borrowers that FICO misses." },
				{ heading: "The Interest Rate Problem", content: "Upstart's business model depends on lending demand — which collapsed when interest rates rose sharply in 2022. Revenue fell 80% from peak as the AI lending thesis met basic economics." },
				{ heading: "Why It Matters", content: "Upstart exposed a real problem: traditional credit scoring is imperfect. Whether their AI solution is better than FICO is still being tested across multiple economic cycles." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "speculative — recovery depends on rate environment" },
			marketCap: { label: "Market Cap", value: "$3B", explanation: "The total value of all the company's shares combined", culturalTranslation: "down 90%+ from all-time highs" },
			revenueGrowth: { label: "Revenue Growth", value: "13%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "recovering as rates fall and volumes return" },
			profitMargin: { label: "Profit Margin", value: "-30%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "losses improving but not yet profitable" },
			beta: { label: "Beta", value: "1.92", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "extremely volatile — binary outcomes risk" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "mchp",
		ticker: "MCHP",
		name: "Microchip Technology",
		bio: "the microcontroller company inside every embedded system ever made",
		heroImage: "https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=800&h=600&fit=crop",
		personalityDescription: "The chip company making the brains for everything from your garage door to a spaceship",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 50, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Microchip Technology Is Everywhere You Don't Notice",
			sections: [
				{ heading: "The Microcontroller Market", content: "Microchip makes microcontrollers — small chips with a processor, memory, and I/O in one package. They're in automotive, industrial equipment, appliances, healthcare devices, and consumer electronics." },
				{ heading: "The Portfolio Depth", content: "Microchip has one of the deepest chip portfolios in the industry — thousands of SKUs at different price points and capabilities. That breadth means they have a product for virtually every embedded design." },
				{ heading: "Why It Matters", content: "The world runs on embedded systems. Every machine, vehicle, and appliance that does something 'smart' has a microcontroller. Microchip's ubiquity is its greatest asset." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the embedded systems leader" },
			marketCap: { label: "Market Cap", value: "$35B", explanation: "The total value of all the company's shares combined", culturalTranslation: "significant market cap for an unsexy chip company" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady compounder with cyclical variability" },
			profitMargin: { label: "Profit Margin", value: "30%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from high-volume commodity chips" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — inventory cycles can be brutal" },
			dividendYield: { label: "Dividend Yield", value: "2.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "decent yield for a semiconductor company" },
		},
	},
	{
		id: "lrcx",
		ticker: "LRCX",
		name: "Lam Research",
		bio: "the equipment that etches the circuits onto your processor chip",
		heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop",
		personalityDescription: "The machine that makes the machines that make the chips — essential but unknown",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Lam Research Is Semiconductor Equipment's Leader",
			sections: [
				{ heading: "The Etch Process", content: "Lam Research builds equipment for depositing and etching thin films on semiconductor wafers — critical steps in chip manufacturing. Every advanced chip fab runs on Lam equipment." },
				{ heading: "The ASML Partnership", content: "Alongside ASML (lithography) and Applied Materials (deposition), Lam completes the trio of essential semiconductor equipment makers. Without all three, you can't make advanced chips." },
				{ heading: "Why It Matters", content: "US export restrictions on semiconductor equipment to China specifically targeted companies like Lam Research — because their equipment is literally irreplaceable in chip manufacturing." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "21.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for a critical chip equipment monopoly" },
			marketCap: { label: "Market Cap", value: "$100B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large market cap reflecting the irreplaceable position" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "cyclical but long-term growth with chip complexity" },
			profitMargin: { label: "Profit Margin", value: "32%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from specialty equipment" },
			beta: { label: "Beta", value: "1.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — semiconductor cycle swings" },
			dividendYield: { label: "Dividend Yield", value: "1.1%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "growing dividend from a quality compounder" },
		},
	},
	{
		id: "pfe",
		ticker: "PFE",
		name: "Pfizer",
		bio: "the big pharma that saved the world with a vaccine and then lost it all",
		heroImage: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&h=600&fit=crop",
		personalityDescription: "The blockbuster drug company having its biggest identity crisis",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 75, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Pfizer's COVID Windfall Became a Hangover",
			sections: [
				{ heading: "The Vaccine Billions", content: "Pfizer's COVID-19 vaccine and Paxlovid antiviral generated over $100 billion in revenue in 2021-2022. It was the biggest pharmaceutical windfall in history." },
				{ heading: "The Post-COVID Cliff", content: "When COVID revenue normalized, Pfizer fell off a revenue cliff — and had used some of the windfall to overpay for acquisitions like Seagen. The stock suffered dramatically." },
				{ heading: "Why It Matters", content: "Pfizer has one of the deepest drug pipelines in pharma. Their mRNA expertise built for COVID vaccines has applications far beyond — cancer vaccines, flu, RSV. The technology is real." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "11.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "deep value if pipeline delivers" },
			marketCap: { label: "Market Cap", value: "$160B", explanation: "The total value of all the company's shares combined", culturalTranslation: "one of the world's largest pharma companies at a deep discount" },
			revenueGrowth: { label: "Revenue Growth", value: "-18%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "revenue recovering from COVID cliff" },
			profitMargin: { label: "Profit Margin", value: "10%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins despite patent pressures" },
			beta: { label: "Beta", value: "0.62", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — pharma is defensive" },
			dividendYield: { label: "Dividend Yield", value: "6.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "very high yield — income investor's attention getter" },
		},
	},
	{
		id: "mrna",
		ticker: "MRNA",
		name: "Moderna",
		bio: "the mRNA vaccine company that proved the technology worked on the world's biggest stage",
		heroImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=600&fit=crop",
		personalityDescription: "The biotech upstart that went from startup to savior in 18 months",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 68, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 78, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Moderna's Bet on mRNA Paid Off Enormously",
			sections: [
				{ heading: "The mRNA Platform", content: "Moderna built their entire company on mRNA technology — a platform that uses genetic instructions to teach cells to make proteins. COVID proved it could work at global scale in record time." },
				{ heading: "The Billion-Dollar Question", content: "Post-COVID, Moderna's revenue has fallen dramatically. The key question: can they turn mRNA into a platform for other diseases — flu, RSV, cancer, HIV — before the cash runs out?" },
				{ heading: "Why It Matters", content: "If Moderna's pipeline delivers beyond COVID, the company is worth multiples of its current value. If mRNA remains a single-product story, the decline continues. It's a genuine binary bet." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "speculative — pipeline or bust" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "down massively from peak — the market is skeptical" },
			revenueGrowth: { label: "Revenue Growth", value: "-28%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "revenue collapsing as COVID demand normalizes" },
			profitMargin: { label: "Profit Margin", value: "-45%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "deeply negative margins post-COVID" },
			beta: { label: "Beta", value: "1.65", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — sentiment swings violently on trial results" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "bmy",
		ticker: "BMY",
		name: "Bristol-Myers Squibb",
		bio: "cancer and immunology drugs from one of pharma's most experienced developers",
		heroImage: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&h=600&fit=crop",
		personalityDescription: "The big pharma company quietly winning the cancer drug wars",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Bristol-Myers Has One of the Best Cancer Drug Portfolios",
			sections: [
				{ heading: "The Opdivo Story", content: "BMS's Opdivo was one of the first and most successful PD-1 cancer immunotherapies — drugs that help the immune system fight cancer. It generates billions annually and opened an entirely new treatment paradigm." },
				{ heading: "The Patent Cliff", content: "Like all pharma companies, BMS faces patent expirations on key drugs. Their acquisition of Celgene, Turning Point, and Mirati has been aimed at filling the pipeline hole." },
				{ heading: "Why It Matters", content: "Immuno-oncology is the most important advance in cancer treatment in a generation. BMS helped create that field and has the expertise and portfolio to continue leading it." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — patent cliff fears are priced in" },
			marketCap: { label: "Market Cap", value: "$130B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large pharma at a significant discount to peers" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "flat to declining as pipeline ramps up" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from high-value specialty drugs" },
			beta: { label: "Beta", value: "0.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — pharma is defensive" },
			dividendYield: { label: "Dividend Yield", value: "4.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "very high yield for income investors" },
		},
	},
	{
		id: "lly",
		ticker: "LLY",
		name: "Eli Lilly",
		bio: "the GLP-1 weight loss and diabetes drug company breaking every pharmaceutical record",
		heroImage: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=600&fit=crop",
		personalityDescription: "The pharma company that accidentally started the weight loss revolution",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 92, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 88, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Eli Lilly Is the Most Valuable Drug Company in History",
			sections: [
				{ heading: "The GLP-1 Explosion", content: "Eli Lilly's Mounjaro and Zepbound (tirzepatide) are the most effective weight loss drugs ever developed — and the most commercially successful drug launch in pharmaceutical history." },
				{ heading: "The Diabetes Foundation", content: "Lilly has been a diabetes drug leader for decades. GLP-1 drugs started as diabetes medications and became obesity blockbusters. That trajectory was part skill, part serendipity." },
				{ heading: "Why It Matters", content: "Obesity affects 40%+ of US adults. Effective drugs that reduce heart disease, diabetes, and other complications represent potentially the largest drug market ever created. Lilly is at the center." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "52.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive but possibly the best growth story in pharma" },
			marketCap: { label: "Market Cap", value: "$750B", explanation: "The total value of all the company's shares combined", culturalTranslation: "one of the most valuable companies in the world" },
			revenueGrowth: { label: "Revenue Growth", value: "28%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "explosive growth from GLP-1 dominance" },
			profitMargin: { label: "Profit Margin", value: "23%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong and improving margins" },
			beta: { label: "Beta", value: "0.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — healthcare is defensive" },
			dividendYield: { label: "Dividend Yield", value: "0.6%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — they invest in manufacturing capacity" },
		},
	},
	{
		id: "abbv",
		ticker: "ABBV",
		name: "AbbVie",
		bio: "the Humira-dependent pharma that successfully launched its second act",
		heroImage: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&h=600&fit=crop",
		personalityDescription: "The drug company that pulled off the greatest post-blockbuster transition in pharma",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why AbbVie's Transition Is a Pharma Success Story",
			sections: [
				{ heading: "The Humira Empire", content: "Humira was the world's best-selling drug for over a decade — an autoimmune medication generating $20+ billion annually. When biosimilar competition hit, everyone expected collapse." },
				{ heading: "The New Portfolio", content: "AbbVie's new immunology drugs Skyrizi and Rinvoq, plus the Botox-maker Allergan acquisition, successfully replaced the Humira revenue. The transition was executed better than most thought possible." },
				{ heading: "Why It Matters", content: "AbbVie's post-Humira success story is studied in every business school. They replaced a $20B drug without missing a beat — a rare achievement in pharmaceutical industry history." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "16.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for quality pharma with strong new drugs" },
			marketCap: { label: "Market Cap", value: "$310B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large pharma at a fair multiple" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "stable growth from new drugs offsetting Humira decline" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from specialty drug dominance" },
			beta: { label: "Beta", value: "0.62", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — pharma is very defensive" },
			dividendYield: { label: "Dividend Yield", value: "3.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid and growing dividend from a quality compounder" },
		},
	},
	{
		id: "mrk",
		ticker: "MRK",
		name: "Merck",
		bio: "cancer drugs, vaccines, and the Keytruda machine that never stops growing",
		heroImage: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&h=600&fit=crop",
		personalityDescription: "The pharma company whose cancer drug has saved more lives than any other",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Merck's Keytruda Is the Most Important Cancer Drug",
			sections: [
				{ heading: "The Keytruda Dominance", content: "Keytruda is the world's best-selling cancer drug, generating $25+ billion annually. It's used across dozens of cancer types and is becoming the backbone of cancer treatment globally." },
				{ heading: "The Pipeline Depth", content: "Merck has one of the strongest drug pipelines in pharma, including next-gen cancer drugs, HPV vaccines, and HIV treatments. Their R&D investment is paying off consistently." },
				{ heading: "Why It Matters", content: "Merck's Keytruda program has fundamentally changed cancer treatment. The combination immunotherapy approach — Keytruda plus chemotherapy — is now standard of care in multiple cancer types." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "16.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable value for the Keytruda franchise" },
			marketCap: { label: "Market Cap", value: "$265B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large pharma at a reasonable multiple" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth driven by Keytruda expansion" },
			profitMargin: { label: "Profit Margin", value: "25%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from high-value oncology drugs" },
			beta: { label: "Beta", value: "0.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — healthcare is defensive" },
			dividendYield: { label: "Dividend Yield", value: "2.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend from a quality pharma company" },
		},
	},
	{
		id: "gild",
		ticker: "GILD",
		name: "Gilead Sciences",
		bio: "HIV drugs that work so well they made AIDS survivable for millions of people",
		heroImage: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=600&fit=crop",
		personalityDescription: "The biotech that essentially cured HIV for the people who can afford it",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Gilead Changed HIV From a Death Sentence",
			sections: [
				{ heading: "The HIV Revolution", content: "Gilead's antiviral drugs transformed HIV from a fatal disease to a manageable chronic condition. Their single-pill regimens have saved millions of lives and redefined what 'treatment' means." },
				{ heading: "The Oncology Expansion", content: "After dominating HIV and hepatitis C, Gilead acquired Kite Pharma and Immunomedics to expand into cancer. CAR-T therapy and targeted oncology are their next frontier." },
				{ heading: "Why It Matters", content: "Gilead's HIV portfolio generates incredibly stable, recurring revenue — people take their HIV medication every day for life. That predictability funds their oncology expansion." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for the HIV monopoly and oncology potential" },
			marketCap: { label: "Market Cap", value: "$112B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large biotech at a reasonable price" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "stable HIV revenue plus oncology growth" },
			profitMargin: { label: "Profit Margin", value: "32%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from viral disease dominance" },
			beta: { label: "Beta", value: "0.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — essential medications are defensive" },
			dividendYield: { label: "Dividend Yield", value: "3.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "decent dividend from a quality biotech" },
		},
	},
	{
		id: "amgn",
		ticker: "AMGN",
		name: "Amgen",
		bio: "the biotech pioneer that invented biologic drugs and created an entire industry",
		heroImage: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=600&fit=crop",
		personalityDescription: "The OG biotech that's been making complex drugs since before pharma was cool",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Amgen Built the Biologics Template",
			sections: [
				{ heading: "The Biotech Founding Father", content: "Amgen was founded in 1980 and created the first successful biologic drug — Epogen, for anemia. They invented the manufacturing infrastructure for every complex biologic drug that followed." },
				{ heading: "The Obesity Entry", content: "Amgen has entered the GLP-1 weight loss market with their own drug candidate. If it works, the company that invented biologics gets to participate in the biggest drug market ever created." },
				{ heading: "Why It Matters", content: "Amgen's portfolio spans cancer, bone disease, cardiovascular, and inflammation. The breadth and the manufacturing expertise create a resilient business that doesn't depend on any single drug." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for quality biologics leader" },
			marketCap: { label: "Market Cap", value: "$175B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large biotech at fair valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "2%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "stable to growing from new drugs" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from high-value biologic drugs" },
			beta: { label: "Beta", value: "0.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — essential medicines are defensive" },
			dividendYield: { label: "Dividend Yield", value: "3.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend from a quality company" },
		},
	},
	{
		id: "regn",
		ticker: "REGN",
		name: "Regeneron",
		bio: "the drug company that changed how we treat allergies and cancer",
		heroImage: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=600&fit=crop",
		personalityDescription: "The science-first biotech where the scientists actually run the company",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Regeneron's Science Approach Wins",
			sections: [
				{ heading: "The Dupixent Machine", content: "Dupixent (dupilumab) is the best-selling asthma and eczema drug in the world — a first-in-class treatment for inflammatory diseases. It generates $15+ billion annually and growing." },
				{ heading: "The Discovery Engine", content: "Regeneron has built one of the best drug discovery platforms in the industry — their genetically modified mice and VelociSuite technology generate new drug targets faster than competitors." },
				{ heading: "Why It Matters", content: "Regeneron's founders, including George Yancopoulos, are still running the science. That continuity of scientific leadership is extremely rare and extraordinarily valuable for a drug company." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the science-first culture" },
			marketCap: { label: "Market Cap", value: "$85B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive biotech with room to grow" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong growth from Dupixent expansion" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from high-value specialty drugs" },
			beta: { label: "Beta", value: "0.38", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low volatility — healthcare is defensive" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — reinvesting for pipeline development" },
		},
	},
	{
		id: "vrtx",
		ticker: "VRTX",
		name: "Vertex Pharmaceuticals",
		bio: "the company that turned cystic fibrosis from a fatal disease into manageable",
		heroImage: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&h=600&fit=crop",
		personalityDescription: "The biotech that actually cured a genetic disease using small molecule drugs",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Vertex Transformed Cystic Fibrosis",
			sections: [
				{ heading: "The Trikafta Breakthrough", content: "Vertex's Trikafta (and earlier CF drugs) transformed cystic fibrosis from a fatal childhood disease into a manageable condition. It's one of the most impactful drug approvals in pharmaceutical history." },
				{ heading: "The CF Monopoly", content: "Vertex has a near-monopoly on CF treatment. With 90%+ of CF patients eligible for their drugs and annual treatment costs over $300,000, it's one of the most profitable drug franchises in history." },
				{ heading: "Why It Matters", content: "Vertex's success shows the promise of precision medicine — identifying the genetic root cause of a disease and developing a drug that fixes it. The model is replicable in other genetic diseases." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium but the CF monopoly is extraordinarily valuable" },
			marketCap: { label: "Market Cap", value: "$110B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large biotech commanding a significant premium" },
			revenueGrowth: { label: "Revenue Growth", value: "11%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth as CF treatment penetrates globally" },
			profitMargin: { label: "Profit Margin", value: "35%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "outstanding margins from the CF monopoly" },
			beta: { label: "Beta", value: "0.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — essential medicines are defensive" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — investing in new disease areas" },
		},
	},
	{
		id: "biib",
		ticker: "BIIB",
		name: "Biogen",
		bio: "the Alzheimer's drug company that bet the company on controversial science",
		heroImage: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=600&fit=crop",
		personalityDescription: "The biotech that launched an Alzheimer's drug the FDA barely approved",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 60, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 85, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Biogen's Alzheimer's Gamble Is Still Playing Out",
			sections: [
				{ heading: "The Aduhelm Controversy", content: "Biogen's Aduhelm was approved by the FDA in 2021 for Alzheimer's despite trial ambiguity. The approval process was controversial, insurance coverage was limited, and sales were terrible." },
				{ heading: "The Leqembi Vindication", content: "Their follow-up drug Leqembi (lecanemab) showed clearer efficacy data in slowing Alzheimer's progression. It's the first drug that actually modifies the disease course — a historic milestone." },
				{ heading: "Why It Matters", content: "Alzheimer's affects millions and has had zero effective treatments for decades. Even a drug that slows progression modestly is worth billions and changes lives. Biogen is at the frontier." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — Alzheimer's drug sales have disappointed so far" },
			marketCap: { label: "Market Cap", value: "$27B", explanation: "The total value of all the company's shares combined", culturalTranslation: "down significantly from peak" },
			revenueGrowth: { label: "Revenue Growth", value: "-8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "revenue declining as MS portfolio ages" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins from legacy MS drugs" },
			beta: { label: "Beta", value: "0.58", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — healthcare is defensive" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "isrg",
		ticker: "ISRG",
		name: "Intuitive Surgical",
		bio: "the da Vinci robot that changed surgery and made it a tech business",
		heroImage: "https://images.unsplash.com/photo-1530026405186-ed1f139313f2?w=800&h=600&fit=crop",
		personalityDescription: "The company that turned surgery into a software-defined recurring revenue model",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 30, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Intuitive Surgical Is Surgery's NVIDIA",
			sections: [
				{ heading: "The da Vinci Robot", content: "Intuitive Surgical's da Vinci surgical system is in 7,500+ hospitals worldwide. Surgeons use joysticks and screens to perform minimally invasive procedures that were previously impossible." },
				{ heading: "The Razor-and-Blade Model", content: "The da Vinci robot is expensive. But the real money is in the disposable instruments used in every single surgery — replacements that only work with Intuitive's system. Every procedure is recurring revenue." },
				{ heading: "Why It Matters", content: "Robotic surgery improves patient outcomes, reduces recovery time, and commands premium reimbursement. As more procedures become robotic, Intuitive's installed base and consumables grow." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "70.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive but the surgical robotics monopoly deserves a premium" },
			marketCap: { label: "Market Cap", value: "$175B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large market cap for a hardware+recurring revenue hybrid" },
			revenueGrowth: { label: "Revenue Growth", value: "16%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent double-digit grower" },
			profitMargin: { label: "Profit Margin", value: "30%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from the consumables model" },
			beta: { label: "Beta", value: "0.98", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — healthcare technology is relatively defensive" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — reinvesting for next-gen systems" },
		},
	},
	{
		id: "mdt",
		ticker: "MDT",
		name: "Medtronic",
		bio: "the medical device giant that's in every hospital on earth",
		heroImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
		personalityDescription: "The company making the pacemakers, spinal implants, and surgical tools inside millions of patients",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Medtronic Is Healthcare's Irreplaceable Supplier",
			sections: [
				{ heading: "The Device Breadth", content: "Medtronic makes cardiac devices, spinal implants, diabetes management systems, surgical robotics, and hundreds of other products. Their breadth makes them nearly impossible to avoid in healthcare." },
				{ heading: "The Innovation Challenge", content: "As a giant, Medtronic struggles to innovate as fast as smaller, focused companies. They've faced competition in robotics from Intuitive and in diabetes from Dexcom and Abbott." },
				{ heading: "Why It Matters", content: "When a cardiologist needs a stent, when a spine surgeon needs an implant, Medtronic is often the only or best option. That medical necessity creates durable demand." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "17.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value but growth has disappointed" },
			marketCap: { label: "Market Cap", value: "$100B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large medical device company at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth as they battle in multiple markets" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from high-value device expertise" },
			beta: { label: "Beta", value: "0.75", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — medical devices are defensive" },
			dividendYield: { label: "Dividend Yield", value: "3.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend from a quality med-device company" },
		},
	},
	{
		id: "syk",
		ticker: "SYK",
		name: "Stryker",
		bio: "hip replacements, knee implants, and the robots that put them in",
		heroImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=600&fit=crop",
		personalityDescription: "The medical device company making the joints that help boomers stay active",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Stryker Is the Orthopedic Device Leader",
			sections: [
				{ heading: "The Orthopedic Market", content: "Stryker dominates hip and knee replacement implants — a massive market as the baby boomer generation ages. Every aging knee is an opportunity." },
				{ heading: "The Mako Robot", content: "Stryker's Mako robotic surgical system competes directly with Intuitive in the orthopedic niche. Robot-assisted joint replacement has better outcomes and drives hospitals to buy the platform." },
				{ heading: "Why It Matters", content: "Hip and knee replacement is elective surgery that grew explosively as COVID backlogs cleared. Stryker's positioning across both the implant and robotic categories is powerful." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "38.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium but justified by consistent quality compounding" },
			marketCap: { label: "Market Cap", value: "$130B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large med-device at a premium multiple" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady double-digit grower" },
			profitMargin: { label: "Profit Margin", value: "20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from implant and equipment mix" },
			beta: { label: "Beta", value: "0.92", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — medical devices are defensive" },
			dividendYield: { label: "Dividend Yield", value: "1.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — they prefer buybacks and acquisitions" },
		},
	},
	{
		id: "bsx",
		ticker: "BSX",
		name: "Boston Scientific",
		bio: "the cardiovascular and urology device innovator",
		heroImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
		personalityDescription: "The medical device company that saves hearts and fixes plumbing problems people don't talk about",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Boston Scientific Is Devices Beyond the OR",
			sections: [
				{ heading: "The Cardiovascular Focus", content: "Boston Scientific makes stents, pacemakers, electrophysiology catheters, and dozens of other cardiovascular devices. Heart disease is the world's leading killer — this market doesn't shrink." },
				{ heading: "The EP Opportunity", content: "Atrial fibrillation treatment — cardiac ablation — is one of the fastest-growing procedure categories. Boston Scientific's mapping and ablation tools are designed for that growth." },
				{ heading: "Why It Matters", content: "Boston Scientific operates in markets with aging demographics, growing disease prevalence, and limited competition. The combination creates durable, long-term growth." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "38.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for consistent double-digit growth" },
			marketCap: { label: "Market Cap", value: "$110B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large med-device at premium valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "14%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "strong growth from EP and cardiovascular procedures" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from high-value procedure devices" },
			beta: { label: "Beta", value: "1.02", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — med-device is defensive but some tech risk" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — reinvesting for acquisitions and R&D" },
		},
	},
	{
		id: "cvs",
		ticker: "CVS",
		name: "CVS Health",
		bio: "the drugstore that became a healthcare company and is still figuring it out",
		heroImage: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&h=600&fit=crop",
		personalityDescription: "The corner pharmacy that wants to be your doctor, pharmacist, and insurance company",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 62, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why CVS Is Reinventing Itself as Integrated Healthcare",
			sections: [
				{ heading: "The Aetna Acquisition", content: "CVS acquired Aetna in 2018 for $69 billion, creating a vertically integrated health company. The idea: control the pharmacy, the clinic, and the insurance, then optimize outcomes." },
				{ heading: "The HealthHubs", content: "CVS is converting thousands of stores into health care destinations — MinuteClinics, primary care, mental health, and more. The retail pharmacy as community health center is the vision." },
				{ heading: "Why It Matters", content: "Americans are dramatically underserved by primary care. CVS's scale and accessibility could fill that gap — if they can make the economics work and the integration succeed." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "10.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — integration complexity and cost drag valuation" },
			marketCap: { label: "Market Cap", value: "$80B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large company at a discount to simpler healthcare names" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slowing as they digest massive acquisitions" },
			profitMargin: { label: "Profit Margin", value: "3%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin margins due to pharmacy economics and integration costs" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — defensive healthcare" },
			dividendYield: { label: "Dividend Yield", value: "3.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield from a large healthcare compounder" },
		},
	},
	{
		id: "ci",
		ticker: "CI",
		name: "Cigna",
		bio: "the healthcare company that connects insurance, pharmacy, and care delivery",
		heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
		personalityDescription: "The health insurer trying to own every step between you and your doctor",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Cigna Operates at the Center of American Healthcare",
			sections: [
				{ heading: "The Express Scripts", content: "Cigna acquired Express Scripts, the largest pharmacy benefit manager, in 2018. That gives them control of drug purchasing, formulary decisions, and pharmacy utilization for millions." },
				{ heading: "The Evernorth Segment", content: "Evernorth is Cigna's health services segment — pharmacy benefits, behavioral health, and care delivery. It's designed to serve employers as a comprehensive health partner beyond just insurance." },
				{ heading: "Why It Matters", content: "Pharmacy costs are the fastest-growing part of healthcare. Cigna's control of pharmacy benefit management puts them in a powerful position to manage — and profit from — that trend." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable value for integrated health services" },
			marketCap: { label: "Market Cap", value: "$82B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large but not the most visible name in health insurance" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from employer health benefit adoption" },
			profitMargin: { label: "Profit Margin", value: "5%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin but stable margins from insurance and PBM" },
			beta: { label: "Beta", value: "0.48", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — defensive healthcare company" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield — focused on buybacks" },
		},
	},
	{
		id: "hum",
		ticker: "HUM",
		name: "Humana",
		bio: "the Medicare Advantage giant riding the baby boomer retirement wave",
		heroImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=600&fit=crop",
		personalityDescription: "The health insurer whose business model is literally betting on American life expectancy",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Humana Is Medicare's Dominant Player",
			sections: [
				{ heading: "The Medicare Advantage Bet", content: "Humana is the #2 Medicare Advantage insurer — managing healthcare for seniors who choose private plans over traditional Medicare. As boomers retire, this market grows automatically." },
				{ heading: "The Care Delivery Push", content: "Humana has invested heavily in primary care clinics for seniors — CenterWell. Vertical integration of insurance and care delivery improves outcomes and margins simultaneously." },
				{ heading: "Why It Matters", content: "Medicare Advantage is the fastest-growing part of US healthcare. By 2030, the majority of Medicare enrollees will be in MA plans. Humana's scale and senior focus is a generational tailwind." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value on near-term medical cost pressure" },
			marketCap: { label: "Market Cap", value: "$38B", explanation: "The total value of all the company's shares combined", culturalTranslation: "somewhat compressed from regulatory uncertainty" },
			revenueGrowth: { label: "Revenue Growth", value: "2%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slowing growth as medical costs spike" },
			profitMargin: { label: "Profit Margin", value: "3%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "under pressure from unexpected utilization spikes" },
			beta: { label: "Beta", value: "0.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — defensive healthcare" },
			dividendYield: { label: "Dividend Yield", value: "1.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — they reinvest in care delivery" },
		},
	},
	{
		id: "hims",
		ticker: "HIMS",
		name: "Hims & Hers Health",
		bio: "telehealth for the things people are embarrassed to talk to their doctor about",
		heroImage: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&h=600&fit=crop",
		personalityDescription: "The DTC health brand that made it okay to treat ED and hair loss online",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 62, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 78, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Hims Is Turning Stigmatized Health Into a Brand",
			sections: [
				{ heading: "The Taboo Business", content: "Hims sells treatments for erectile dysfunction, hair loss, mental health, weight management, and skincare — conditions people historically avoided discussing with doctors or pharmacists." },
				{ heading: "The DTC Model", content: "By going direct-to-consumer through telehealth, Hims removes the embarrassment barrier. You don't need to walk into a pharmacy to buy ED medication when Hims ships it to your door." },
				{ heading: "Why It Matters", content: "Hims proved that destigmatizing health conditions and making treatment accessible creates enormous demand. Their GLP-1 weight loss medication push is their biggest bet yet." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "high growth premium for a unique DTC health model" },
			marketCap: { label: "Market Cap", value: "$5B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small but growing fast" },
			revenueGrowth: { label: "Revenue Growth", value: "50%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "explosive growth from GLP-1 and expanded categories" },
			profitMargin: { label: "Profit Margin", value: "-10%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "approaching profitability" },
			beta: { label: "Beta", value: "1.85", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "volatile — growth company with regulatory risk" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend" },
		},
	},
	{
		id: "holx",
		ticker: "HOLX",
		name: "Hologic",
		bio: "the women's health diagnostics company that found COVID testing",
		heroImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=600&fit=crop",
		personalityDescription: "The med-device company that built the best COVID test and never gets enough credit",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Hologic Owns Women's Health Diagnostics",
			sections: [
				{ heading: "The Cervical Cancer Story", content: "Hologic's Pap test technology screens millions of women annually for cervical cancer. Their ThinPrep platform dominates gynecological cytology globally." },
				{ heading: "The Molecular Diagnostics", content: "Hologic's molecular testing platform (Panther system) became critical during COVID for high-volume testing. That infrastructure now serves STI, respiratory, and other diagnostics." },
				{ heading: "Why It Matters", content: "Women's health is dramatically underinvested in research and commercial focus. Hologic's dedication to this niche has created a defensible market position with strong recurring revenue from tests." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the women's health diagnostics focus" },
			marketCap: { label: "Market Cap", value: "$15B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size med-tech at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "flat growth post-COVID testing windfall" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from high-value diagnostics" },
			beta: { label: "Beta", value: "0.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — diagnostic testing is defensive" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — returning capital via buybacks" },
		},
	},
	{
		id: "rmd",
		ticker: "RMD",
		name: "ResMed",
		bio: "the sleep apnea device company that dominates a chronic, massive market",
		heroImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=600&fit=crop",
		personalityDescription: "The company making the machines that keep millions of people breathing at night",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why ResMed Has a Near-Monopoly on Sleep Apnea",
			sections: [
				{ heading: "The CPAP Dominance", content: "ResMed and Philips control the CPAP device market for sleep apnea. When Philips had to recall millions of devices in 2021 due to foam degradation, ResMed captured the entire market." },
				{ heading: "The Connected Health", content: "ResMed devices are internet-connected, sending sleep data to doctors automatically. That software-enabled monitoring creates a subscription-like revenue stream alongside the hardware." },
				{ heading: "Why It Matters", content: "Sleep apnea affects hundreds of millions of people globally and is massively underdiagnosed. As awareness and diagnosis grow, ResMed's addressable market expands automatically." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "29.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the sleep apnea monopoly" },
			marketCap: { label: "Market Cap", value: "$28B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size but dominant in a massive niche" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady grower from continued market penetration" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from both devices and software" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — medical devices are very defensive" },
			dividendYield: { label: "Dividend Yield", value: "1.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield from a quality compounder" },
		},
	},
	{
		id: "nvo",
		ticker: "NVO",
		name: "Novo Nordisk",
		bio: "the Danish company that invented GLP-1 and is now the most valuable in Europe",
		heroImage: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=600&fit=crop",
		personalityDescription: "The insulin maker that accidentally triggered a global weight loss revolution",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 90, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 52, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 85, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Novo Nordisk Created the Most Important Drug Category",
			sections: [
				{ heading: "The GLP-1 Origin", content: "Novo Nordisk invented GLP-1 therapy in diabetes management and has decades of experience with the drug class that became the obesity revolution. They built Ozempic and Wegovy." },
				{ heading: "The European Giant", content: "Novo Nordisk became the most valuable company in Europe — larger than the entire Danish GDP. The GLP-1 obesity market made a Danish pharma company into a global force." },
				{ heading: "Why It Matters", content: "Novo Nordisk and Eli Lilly are competing for dominance in what may be the largest drug market in history. The obesity epidemic affects billions of people — and effective drugs are finally available." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "35.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for co-leadership of the GLP-1 revolution" },
			marketCap: { label: "Market Cap", value: "$400B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive market cap from the GLP-1 boom" },
			revenueGrowth: { label: "Revenue Growth", value: "25%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "explosive growth from obesity drug demand" },
			profitMargin: { label: "Profit Margin", value: "38%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "outstanding margins from high-value GLP-1 drugs" },
			beta: { label: "Beta", value: "0.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — healthcare is defensive" },
			dividendYield: { label: "Dividend Yield", value: "1.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield from a quality pharma grower" },
		},
	},
	{
		id: "cmg",
		ticker: "CMG",
		name: "Chipotle Mexican Grill",
		bio: "the burrito empire that made fast casual feel premium",
		heroImage: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&h=600&fit=crop",
		personalityDescription: "The overachiever who turned lunch into a lifestyle brand worth $80 billion",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 78, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Chipotle Reinvented Fast Food",
			sections: [
				{ heading: "The Fast Casual Revolution", content: "Chipotle proved you could charge $12 for a burrito if you made it fast, fresh, and transparent. They created the fast casual category and made every other quick-serve restaurant look cheap by comparison." },
				{ heading: "The Digital Goldmine", content: "Chipotle's digital ordering drives over 35% of sales. Their app-based loyalty program has 40 million members and drives repeat visits more effectively than any TV campaign." },
				{ heading: "Why It Matters", content: "Chipotle has launched Chipotlanes (drive-thrus optimized for digital orders) and is expanding internationally, barely scratching the surface of global fast casual demand." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "50.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the best fast casual story in the market" },
			marketCap: { label: "Market Cap", value: "$80B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive market cap for a restaurant — justified by the margins" },
			revenueGrowth: { label: "Revenue Growth", value: "15%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent double-digit growth across regions" },
			profitMargin: { label: "Profit Margin", value: "13%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins for fast food — rivals can't touch it" },
			beta: { label: "Beta", value: "1.12", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — consumers cut spending in recessions" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — they prefer opening new restaurants" },
		},
	},
	{
		id: "yum",
		ticker: "YUM",
		name: "Yum! Brands",
		bio: "KFC, Pizza Hut, and Taco Bell — three empires under one ticker",
		heroImage: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&h=600&fit=crop",
		personalityDescription: "The franchise overlord who collects royalties from chicken, pizza, and tacos worldwide",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Yum! Brands Is the QSR Franchise Kingpin",
			sections: [
				{ heading: "The Three Brands", content: "KFC dominates global chicken with 27,000 locations. Pizza Hut ruled delivery before DoorDash existed. Taco Bell has cult Gen Z loyalty that defies explanation but delivers results." },
				{ heading: "The Asset-Light Model", content: "Yum! doesn't own most restaurants — franchisees do. That means Yum! collects royalties with minimal capital. Pure franchise fee income at scale is the highest-margin model in food service." },
				{ heading: "Why It Matters", content: "Over 80% of Yum!'s units are outside the US, making them globally diversified. As middle classes grow internationally, QSR brands follow — and Yum! is already there." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the quality of the franchise model" },
			marketCap: { label: "Market Cap", value: "$35B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large for a restaurant company — justified by global reach" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow but steady compounder with international upside" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "high franchise margins — royalty income is beautiful" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive — people eat fast food regardless of the economy" },
			dividendYield: { label: "Dividend Yield", value: "1.9%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the worldwide franchise machine" },
		},
	},
	{
		id: "dpz",
		ticker: "DPZ",
		name: "Domino's Pizza",
		bio: "the pizza delivery company that became a technology company that also delivers pizza",
		heroImage: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop",
		personalityDescription: "The logistics nerd who turned pepperoni into a supply chain masterpiece",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Domino's Is Actually a Technology Company",
			sections: [
				{ heading: "The Tech Bet", content: "Domino's invested in digital ordering and delivery technology before it was fashionable. Their 2008 recipe overhaul and simultaneous digital push was the most important corporate pivot in fast food history." },
				{ heading: "The Fortressing Strategy", content: "Domino's intentionally opens stores near existing stores to reduce delivery times. It cannibalizes some revenue temporarily but builds market share and customer loyalty permanently." },
				{ heading: "Why It Matters", content: "Domino's has outperformed the S&P 500 over 10 years — for a pizza company. That's because they understood delivery logistics is a technology problem, not a restaurant problem." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the technology-driven pizza model" },
			marketCap: { label: "Market Cap", value: "$14B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size but high-quality compounder" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent growth from digital and international" },
			profitMargin: { label: "Profit Margin", value: "13%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "above-average margins for restaurants" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — people order pizza in recessions too" },
			dividendYield: { label: "Dividend Yield", value: "1.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest but growing dividend" },
		},
	},
	{
		id: "f",
		ticker: "F",
		name: "Ford Motor",
		bio: "the American truck empire that's trying to become an EV company at the same time",
		heroImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&h=600&fit=crop",
		personalityDescription: "The grizzled factory worker who is learning to code at 50 and refusing to give up",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Ford Is the Most Interesting American Car Story",
			sections: [
				{ heading: "The F-Series Fortress", content: "The Ford F-150 has been America's best-selling vehicle for 47 consecutive years. It prints cash. And Ford is betting that the F-150 Lightning will do the same for EVs." },
				{ heading: "The EV Struggle", content: "Ford's EV division has been losing billions per vehicle sold. The race is to reach scale and profitability before the losses overwhelm the combustion engine profits funding the transition." },
				{ heading: "Why It Matters", content: "Ford represents the existential challenge of legacy automakers: transform a century-old combustion-engine business into an EV company without destroying the cash flows that fund the pivot." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "8.2", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — but cheap for a reason given the EV division losses" },
			marketCap: { label: "Market Cap", value: "$52B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive market cap for a traditional automaker" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth navigating the EV transition" },
			profitMargin: { label: "Profit Margin", value: "3%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin margins squeezed by EV losses and supply chains" },
			beta: { label: "Beta", value: "1.32", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "cyclical — auto is economically sensitive" },
			dividendYield: { label: "Dividend Yield", value: "5.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield — they pay generously to keep income investors patient" },
		},
	},
	{
		id: "gm",
		ticker: "GM",
		name: "General Motors",
		bio: "America's other great car company that also invented Mary Barra",
		heroImage: "https://images.unsplash.com/photo-1493238792000-8113da705763?w=800&h=600&fit=crop",
		personalityDescription: "The corporate titan who survived bankruptcy, came back, and is still fighting for relevance",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 48, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why GM Is Fighting for Its Electric Future",
			sections: [
				{ heading: "The Bankruptcy Comeback", content: "GM went bankrupt in 2009 and was bailed out by the government. They restructured, shed brands, and came back leaner. Under CEO Mary Barra they've transformed the culture toward technology." },
				{ heading: "The Ultium Platform", content: "GM's Ultium electric vehicle platform underpins their EV strategy across the Hummer EV, Silverado EV, and Blazer EV. It's their unified bet to compete with Tesla at scale." },
				{ heading: "Why It Matters", content: "GM's Cruise autonomous vehicle division had a high-profile failure, but GM rebuilt and is still pursuing self-driving. Their ambitions in EVs and autonomy remain enormous if execution catches up." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "6.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "extremely cheap — market is skeptical of the EV transformation story" },
			marketCap: { label: "Market Cap", value: "$48B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive market cap trading at a deep discount to earnings" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "recovering from Cruise setback and EV ramp costs" },
			profitMargin: { label: "Profit Margin", value: "5%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin margins from legacy manufacturing overhead" },
			beta: { label: "Beta", value: "1.25", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "cyclical — more volatile than consumer staples" },
			dividendYield: { label: "Dividend Yield", value: "0.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "minimal yield while conserving cash for the EV investment wave" },
		},
	},
	{
		id: "rivn",
		ticker: "RIVN",
		name: "Rivian",
		bio: "the Amazon-backed EV truck startup still racing against its own burn rate",
		heroImage: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=600&fit=crop",
		personalityDescription: "The ambitious startup that has to outrun its cash consumption before running out of runway",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 72, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 78, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Rivian Is EVs' Most Dramatic Story",
			sections: [
				{ heading: "The Amazon Lifeline", content: "Amazon invested over $1 billion in Rivian and ordered 100,000 electric delivery vans. That guaranteed order is the anchor contract that has kept Rivian viable through years of losses." },
				{ heading: "The R1 Trucks", content: "Rivian's R1T pickup and R1S SUV are genuinely excellent vehicles — praised by critics, loved by owners, designed for adventure. The product quality is not the problem." },
				{ heading: "Why It Matters", content: "Rivian needs to scale production fast enough to reach profitability before cash runs out. The race between cash burn rate and breakeven timeline is the most-watched drama in the EV space." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "deeply speculative — no profits, burning billions per quarter" },
			marketCap: { label: "Market Cap", value: "$15B", explanation: "The total value of all the company's shares combined", culturalTranslation: "collapsed from its $150B IPO peak — now a fraction" },
			revenueGrowth: { label: "Revenue Growth", value: "-5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "improving production but profitability is years away" },
			profitMargin: { label: "Profit Margin", value: "-25%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "deeply negative — every truck sold loses money currently" },
			beta: { label: "Beta", value: "2.05", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very high beta — startup-level volatility" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — needs every dollar to survive" },
		},
	},
	{
		id: "lulu",
		ticker: "LULU",
		name: "Lululemon",
		bio: "the yoga pants company that makes people feel spiritual about their leggings",
		heroImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop",
		personalityDescription: "The athleisure cult leader who sold enlightenment through high-waisted tights",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Lululemon Built a Lifestyle Brand Around Exercise",
			sections: [
				{ heading: "The Community Strategy", content: "Lululemon didn't just sell clothes — they held free yoga classes in stores and built communities around wellness. Ambassadors taught classes and lived the lifestyle authentically." },
				{ heading: "The Premium Lock-In", content: "Lululemon charges $100+ for leggings and people pay it. The brand's ability to maintain pricing in a market full of cheaper alternatives is their greatest and most durable competitive moat." },
				{ heading: "Why It Matters", content: "Lululemon expanded into men's apparel, footwear, and international markets. Their acquisition of Mirror was a flop but their core brand and community strategy continues to expand globally." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "growth premium for the leading athleisure brand" },
			marketCap: { label: "Market Cap", value: "$38B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size — still enormous room to grow internationally" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "decelerating slightly after the explosive post-COVID run" },
			profitMargin: { label: "Profit Margin", value: "23%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins for apparel — brand power at work" },
			beta: { label: "Beta", value: "1.32", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderately volatile growth stock" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — investing in global expansion" },
		},
	},
	{
		id: "tjx",
		ticker: "TJX",
		name: "TJX Companies",
		bio: "TJ Maxx, Marshalls, HomeGoods — the treasure hunt that other retailers can't beat",
		heroImage: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=600&fit=crop",
		personalityDescription: "The discount shopping queen who turns inventory liquidation into a dopamine hit",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why TJX Thrives When Other Retailers Struggle",
			sections: [
				{ heading: "The Treasure Hunt Model", content: "TJX buys excess inventory from brands and sells it at 20-60% off retail prices. Customers return constantly because selection changes weekly — you never know what you'll find, which is addictive." },
				{ heading: "The Recession Proof", content: "When the economy tightens, TJX's value proposition strengthens. Shoppers who bought full-price shift to off-price. Their business model literally benefits from broader retail industry distress." },
				{ heading: "Why It Matters", content: "TJX expanded internationally and their HomeGoods and HomeSense concepts are growing rapidly. Off-price retail works across categories and geographies — and TJX is the master of it." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "24.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the leading off-price retailer in the world" },
			marketCap: { label: "Market Cap", value: "$110B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive — one of the most valuable retailers globally" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent low-to-mid single digit comps grower" },
			profitMargin: { label: "Profit Margin", value: "11%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the off-price structural advantage" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive — performs well in good and bad economies" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest but reliable dividend" },
		},
	},
	{
		id: "rost",
		ticker: "ROST",
		name: "Ross Stores",
		bio: "the no-frills off-price retailer that beats full-price every economic cycle",
		heroImage: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
		personalityDescription: "The discount shopper who has a system and sticks to it",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Ross Stores Wins the Off-Price Game",
			sections: [
				{ heading: "The No-Frills Approach", content: "Ross strips out non-essentials — fancy displays, elaborate fitting rooms, excess staff. The focus is price and selection. Customers who know what they want come in and find it." },
				{ heading: "The Geographic Moat", content: "Ross is concentrated in the Sun Belt where value-conscious shoppers are concentrated. Their expansion into new markets has been methodical and consistently profitable year after year." },
				{ heading: "Why It Matters", content: "Ross has beaten full-price retail for decades. When brands have excess inventory — which they always do — Ross benefits. The model is built on other retailers' planning mistakes." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "21.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for a leading off-price retailer" },
			marketCap: { label: "Market Cap", value: "$48B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large and still growing through methodical new store openings" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent grower across economic cycles" },
			profitMargin: { label: "Profit Margin", value: "12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the structural off-price advantage" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive — discount retail is recession resistant" },
			dividendYield: { label: "Dividend Yield", value: "1.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest but growing dividend" },
		},
	},
	{
		id: "orly",
		ticker: "ORLY",
		name: "O'Reilly Automotive",
		bio: "auto parts for the people who still fix their own cars — and the pros who do it for them",
		heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
		personalityDescription: "The gearhead at the counter who knows exactly what your car needs and has it in stock",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why O'Reilly Is the Auto Parts Compounder",
			sections: [
				{ heading: "The DIY Boom", content: "O'Reilly serves both professional mechanics and do-it-yourself consumers. As cars become more expensive to repair at dealerships, DIY grows and professionals stay busy repairing more complex vehicles." },
				{ heading: "The Inventory Depth", content: "O'Reilly stocks over 150,000 SKUs — far more than competitors. That depth means customers find rare parts immediately without waiting, which builds loyalty for complex repairs." },
				{ heading: "Why It Matters", content: "O'Reilly has compounded earnings for decades by opening stores, expanding inventory, and taking share from smaller competitors. It's one of retail's most consistent long-term compounders." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for exceptional execution over many decades" },
			marketCap: { label: "Market Cap", value: "$60B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large and still finding room to grow into new markets" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent high-single-digit grower" },
			profitMargin: { label: "Profit Margin", value: "21%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "outstanding margins for a parts retailer" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — people fix their cars in any economy" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — they prefer aggressive buybacks" },
		},
	},
	{
		id: "azo",
		ticker: "AZO",
		name: "AutoZone",
		bio: "the auto parts compounder that basically only does buybacks and wins",
		heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
		personalityDescription: "The CFO's dream — reliable growth, high cash generation, buy back every share in sight",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why AutoZone's Buyback Strategy Is Legendary",
			sections: [
				{ heading: "The Buyback Machine", content: "AutoZone has reduced its share count by over 85% since 1998 through aggressive buybacks. It's one of the most consistent buyback programs in corporate history — per share earnings grow regardless." },
				{ heading: "The Inventory Model", content: "AutoZone operates with lean staffing and excellent inventory systems. A part ordered in the morning arrives that afternoon. Reliability in parts availability is the product." },
				{ heading: "Why It Matters", content: "AutoZone's share count shrinks every year, meaning earnings per share grow even when total earnings are stable. This capital return discipline has made it a multi-decade wealth compounder." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "20.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "looks expensive but buybacks make EPS growth exceptional" },
			marketCap: { label: "Market Cap", value: "$52B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive market cap in a reliably boring business" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent mid-to-high single digit revenue grower" },
			profitMargin: { label: "Profit Margin", value: "20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from the parts retail model" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — cars always need fixing regardless of economy" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — every dollar goes to buybacks instead" },
		},
	},
	{
		id: "tsco",
		ticker: "TSCO",
		name: "Tractor Supply",
		bio: "rural America's version of Home Depot but with chicken coops and feed bags",
		heroImage: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop",
		personalityDescription: "The country store that discovered suburban people want to cosplay as farmers",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Tractor Supply Found America's Hidden Market",
			sections: [
				{ heading: "The Lifestyle Retailer", content: "Tractor Supply sells tools and farm supplies but also sells an aspirational rural lifestyle to suburban people with quarter-acre lots. Backyard chickens, raised beds, and rural aesthetics are the real product." },
				{ heading: "The Pet Business", content: "Pet food and supplies are a growing segment. Tractor Supply's intersection of rural lifestyle and pet ownership is a defensible niche few competitors understand or serve as well." },
				{ heading: "Why It Matters", content: "Tractor Supply operates in rural communities often underserved by big-box retailers. Their community destination positioning — not just a store — drives repeat visits and loyalty." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "25.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair value for the rural lifestyle retail leader" },
			marketCap: { label: "Market Cap", value: "$24B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size with consistent growth from new store openings" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady mid-single-digit comps grower" },
			profitMargin: { label: "Profit Margin", value: "10%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins for specialty retail" },
			beta: { label: "Beta", value: "0.75", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — rural customers are remarkably consistent" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reliable dividend growing every year" },
		},
	},
	{
		id: "dltr",
		ticker: "DLTR",
		name: "Dollar Tree",
		bio: "the dollar store that raised its prices and is still figuring out who it is",
		heroImage: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
		personalityDescription: "The value retailer navigating the fine line between cheap and sustainable",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 62, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 48, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Dollar Tree Is America's Inflation Canary",
			sections: [
				{ heading: "The $1.25 Trauma", content: "Dollar Tree raised its price point to $1.25 in 2021 after decades at a dollar. Customers noticed. The shift was economically necessary — inflation made the $1 model mathematically impossible." },
				{ heading: "The Family Dollar Problem", content: "Dollar Tree acquired Family Dollar in 2015 for $8.5 billion in what became one of retail's most troubled acquisitions. They're now working to fix, close, or spin off Family Dollar." },
				{ heading: "Why It Matters", content: "Dollar stores serve America's most price-sensitive consumers. When the economy struggles, traffic to value retailers increases. The structural need is permanent even as the model evolves." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "24.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap but the Family Dollar mess justifies the discount" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive store count but compressed by integration struggles" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slowing growth as they rationalize the portfolio" },
			profitMargin: { label: "Profit Margin", value: "5%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "margins compressed by the Family Dollar drag" },
			beta: { label: "Beta", value: "0.75", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "defensive — discount retail holds up in economic downturns" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest dividend from the value retail machine" },
		},
	},
	{
		id: "dg",
		ticker: "DG",
		name: "Dollar General",
		bio: "the small-town retailer that serves communities Walmart won't",
		heroImage: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=600&fit=crop",
		personalityDescription: "The dollar store that figured out rural America better than any big-box chain",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Dollar General Serves the Underserved",
			sections: [
				{ heading: "The Rural Stronghold", content: "Dollar General operates in communities under 20,000 people — often the only general merchandise store for miles. That captive market creates pricing power in communities big chains won't enter." },
				{ heading: "The Health Expansion", content: "Dollar General has been adding health products, fresh food sections, and even healthcare clinics to select stores — trying to become the anchor of rural community health access." },
				{ heading: "Why It Matters", content: "With over 19,000 stores, Dollar General is more widespread than Starbucks. That ubiquity in underserved communities is both their competitive moat and their social responsibility challenge." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "17.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap for the rural retail scale they've built" },
			marketCap: { label: "Market Cap", value: "$32B", explanation: "The total value of all the company's shares combined", culturalTranslation: "one of America's most widespread retailers — massive reach" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slowing growth as the store base matures toward saturation" },
			profitMargin: { label: "Profit Margin", value: "7%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins from the essential-goods value model" },
			beta: { label: "Beta", value: "0.58", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — essential retail in any economy" },
			dividendYield: { label: "Dividend Yield", value: "1.9%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest and growing dividend" },
		},
	},
	{
		id: "burl",
		ticker: "BURL",
		name: "Burlington Coat Factory",
		bio: "the off-price coat store that sells a lot more than coats now",
		heroImage: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&h=600&fit=crop",
		personalityDescription: "The discount brand that rebranded its identity but kept its discount DNA",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Burlington Is Off-Price Retail's Underdog",
			sections: [
				{ heading: "The Identity Evolution", content: "Burlington Coat Factory hasn't just sold coats in decades. They're a full off-price retailer competing with TJX and Ross with a distinct personality that's neither." },
				{ heading: "The Smaller Store Strategy", content: "Burlington has been opening smaller stores in more locations — strip malls, urban centers, secondary markets. Smaller stores have lower costs, faster inventory turns, and broader geographic reach." },
				{ heading: "Why It Matters", content: "Off-price retail continues to take share from full-price department stores. Burlington's positioning between TJX and Ross creates a value proposition for deal-seeking shoppers who want variety." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the off-price growth story" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size — growing into its full potential" },
			revenueGrowth: { label: "Revenue Growth", value: "11%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "accelerating comps growth post-operational restructuring" },
			profitMargin: { label: "Profit Margin", value: "8%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins as the smaller store model matures" },
			beta: { label: "Beta", value: "1.12", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — off-price retail is more cyclical than deep discount" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — investing in store expansion" },
		},
	},
	{
		id: "mar",
		ticker: "MAR",
		name: "Marriott International",
		bio: "the hotel empire where the loyalty points are the actual product",
		heroImage: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=600&fit=crop",
		personalityDescription: "The hospitality giant where 180 million members sleep wherever it tells them to",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Marriott Sells Loyalty More Than Rooms",
			sections: [
				{ heading: "The Bonvoy Machine", content: "Marriott Bonvoy has 180 million members. Points are a currency. Credit card partnerships generate enormous fee revenue. The loyalty program is arguably worth more than the hotel network itself." },
				{ heading: "The Asset-Light Model", content: "Marriott doesn't own most hotels — they franchise and manage for fees. That means income without capital intensity. Every new hotel opening generates management fees in perpetuity." },
				{ heading: "Why It Matters", content: "Travel has recovered explosively post-COVID and Marriott's new hotel pipeline is near record levels. Every hotel opening expands their fee income without requiring Marriott to own anything." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "25.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the asset-light loyalty and management fee model" },
			marketCap: { label: "Market Cap", value: "$70B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large and growing with global travel demand recovery" },
			revenueGrowth: { label: "Revenue Growth", value: "12%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent double-digit growth from travel and new openings" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from the franchise and management fee model" },
			beta: { label: "Beta", value: "1.28", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "cyclical — travel is economically sensitive but resilient" },
			dividendYield: { label: "Dividend Yield", value: "1.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — they prefer share buybacks and growth" },
		},
	},
	{
		id: "hlt",
		ticker: "HLT",
		name: "Hilton Worldwide",
		bio: "the hotel brand that outlasted its famous family and built something bigger",
		heroImage: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop",
		personalityDescription: "The legacy hospitality powerhouse that reinvented itself as a modern loyalty machine",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 60, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Hilton Honors Keeps Travelers Coming Back",
			sections: [
				{ heading: "The Brand Portfolio", content: "Hilton operates across 18 brands — from the ultra-luxury Waldorf Astoria to the budget-friendly Spark. Coverage across price points means they capture travelers at every spending level." },
				{ heading: "The Honors Loyalty", content: "Hilton Honors has 150 million members who choose Hilton specifically to earn and redeem points. The loyalty program generates billions in credit card partnership revenue every year." },
				{ heading: "Why It Matters", content: "Conrad Hilton built the first Hilton hotel in 1919. Today the brand operates 7,500+ properties in 125+ countries. The franchise-heavy model lets them grow without owning the real estate." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "26.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the asset-light hotel franchise model" },
			marketCap: { label: "Market Cap", value: "$52B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large and growing internationally" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent growth as global travel remains robust" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from the franchise-heavy structure" },
			beta: { label: "Beta", value: "1.22", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "cyclical — travel demand is economically sensitive" },
			dividendYield: { label: "Dividend Yield", value: "0.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "minimal yield — they prefer growth and buybacks" },
		},
	},
	{
		id: "rcl",
		ticker: "RCL",
		name: "Royal Caribbean",
		bio: "the company that builds floating cities and keeps making them bigger",
		heroImage: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&h=600&fit=crop",
		personalityDescription: "The cruise line that decided if you're going to build a ship, build the largest thing ever floated",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 42, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Royal Caribbean Builds the World's Largest Ships",
			sections: [
				{ heading: "The Icon Strategy", content: "Royal Caribbean's Icon of the Seas is the world's largest cruise ship. It's a marketing strategy as much as an engineering feat — the superlatives drive media coverage money can't buy." },
				{ heading: "The Private Island Play", content: "Royal Caribbean developed Perfect Day at CocoCay — a private destination where cruise passengers spend the day generating captive revenue in a setting they control completely." },
				{ heading: "Why It Matters", content: "Cruise demand has hit record highs post-COVID and the average age of new cruisers is dropping. Social media is introducing younger consumers to cruises, expanding the addressable market." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the cruise recovery and ongoing growth story" },
			marketCap: { label: "Market Cap", value: "$42B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large — one of the world's largest travel companies" },
			revenueGrowth: { label: "Revenue Growth", value: "18%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "explosive post-COVID demand with multi-year pricing power" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "returning to strong profitability from COVID devastation" },
			beta: { label: "Beta", value: "2.12", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — travel stocks swing hard with sentiment" },
			dividendYield: { label: "Dividend Yield", value: "1.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinstated dividend as recovery solidifies" },
		},
	},
	{
		id: "etsy",
		ticker: "ETSY",
		name: "Etsy",
		bio: "the craft marketplace that makes people feel good about shopping small",
		heroImage: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800&h=600&fit=crop",
		personalityDescription: "The handmade economy's most charismatic marketplace for things mass production can't make",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 42, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Etsy Built an Anti-Amazon",
			sections: [
				{ heading: "The Handmade Promise", content: "Etsy is built on the promise of handmade, vintage, or craft items. That positioning differentiates it from Amazon's commodity marketplace and creates a premium buyers willingly pay." },
				{ heading: "The Pandemic Explosion", content: "Etsy's sales exploded during COVID as people sought handmade masks, home décor, and personal gifts. The platform grew from a niche cultural phenomenon to mainstream retail destination." },
				{ heading: "Why It Matters", content: "Etsy is working to retain post-COVID buyers while expanding into new categories. Their Depop acquisition targets secondhand fashion — extending the unique and personal marketplace concept." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the unique marketplace positioning" },
			marketCap: { label: "Market Cap", value: "$10B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size — compressed from its post-COVID high" },
			revenueGrowth: { label: "Revenue Growth", value: "2%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slowing after the exceptional pandemic-driven boost" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins for a marketplace business model" },
			beta: { label: "Beta", value: "1.52", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "growth stock volatility — sensitive to e-commerce sentiment" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — growth phase" },
		},
	},
	{
		id: "eog",
		ticker: "EOG",
		name: "EOG Resources",
		bio: "the oil company that applied Silicon Valley precision to Texas oilfields",
		heroImage: "https://images.unsplash.com/photo-1527856263669-12c3a0af2aa6?w=800&h=600&fit=crop",
		personalityDescription: "The engineer-driven driller that runs oil rigs the way a tech company runs servers",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why EOG Outperforms Other Oil Producers",
			sections: [
				{ heading: "The Technology Edge", content: "EOG was one of the first oil companies to apply data analytics systematically to drilling decisions. Their well economics consistently outperform industry peers as a result of that precision." },
				{ heading: "The Premium Inventory", content: "EOG holds decades of high-return drilling inventory and is selective about what they drill. Most wells are economic even at $40 oil — capital discipline is their defining competitive advantage." },
				{ heading: "Why It Matters", content: "EOG has transitioned from a pure growth story to a cash return machine — paying regular and special dividends when oil prices are high. Discipline and data made them the best oil company." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "12.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable at mid-cycle oil prices" },
			marketCap: { label: "Market Cap", value: "$68B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large independent with clean balance sheet" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "heavily oil-price dependent revenue" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from low-cost efficient production" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moves with oil price — commodity beta exposure" },
			dividendYield: { label: "Dividend Yield", value: "2.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "pays regular plus generous special dividends in good years" },
		},
	},
	{
		id: "oxy",
		ticker: "OXY",
		name: "Occidental Petroleum",
		bio: "the oil company Warren Buffett keeps buying shares of — which tells you everything",
		heroImage: "https://images.unsplash.com/photo-1495568023648-3339cf77a32f?w=800&h=600&fit=crop",
		personalityDescription: "The oil stock that even a legendary value investor can love",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 42, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Buffett Can't Stop Buying Occidental",
			sections: [
				{ heading: "The Permian Position", content: "Occidental's Permian Basin acreage is among the most productive in the world. Enhanced oil recovery techniques extract more from each well than most operators achieve." },
				{ heading: "The Buffett Bet", content: "Warren Buffett has accumulated over 25% of Occidental's shares. When the greatest investor of all time keeps buying, the market eventually notices and prices it accordingly." },
				{ heading: "Why It Matters", content: "Occidental also runs OxyChem, a chemicals division that generates consistent cash even when oil prices are weak. The diversification is an underappreciated buffer in down cycles." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "15.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair for the Buffett-endorsed oil major" },
			marketCap: { label: "Market Cap", value: "$48B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large independent with diverse energy exposure" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "oil-price dependent revenue" },
			profitMargin: { label: "Profit Margin", value: "20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from diversified operations" },
			beta: { label: "Beta", value: "1.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "oil beta — meaningful commodity price exposure" },
			dividendYield: { label: "Dividend Yield", value: "2.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "growing dividend supported by strong cash generation" },
		},
	},
	{
		id: "hal",
		ticker: "HAL",
		name: "Halliburton",
		bio: "the oilfield services company that drills for whoever is paying",
		heroImage: "https://images.unsplash.com/photo-1527856263669-12c3a0af2aa6?w=800&h=600&fit=crop",
		personalityDescription: "The contractor who brings the specialized tools when you need to punch holes in the Earth",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 42, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Halliburton Serves Every Oil Company",
			sections: [
				{ heading: "The Services Model", content: "Halliburton doesn't own oil wells — they sell drilling, completion, and production services to companies that do. Fracking technology, cementing, wireline — they're the equipment and expertise layer." },
				{ heading: "The North America Strength", content: "Halliburton dominates North American oilfield services, particularly hydraulic fracturing. The US shale revolution was built substantially on Halliburton's fracking technology and service scale." },
				{ heading: "Why It Matters", content: "When oil companies drill more, Halliburton wins. When they cut spending, Halliburton feels it immediately. They're a high-beta play on oil drilling activity, not just commodity prices." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonably priced for the cyclical oilfield services leader" },
			marketCap: { label: "Market Cap", value: "$32B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large services company with global reach" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "revenue cycles directly with drilling activity" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins in a competitive service market" },
			beta: { label: "Beta", value: "1.65", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — amplified exposure to both market and oil activity" },
			dividendYield: { label: "Dividend Yield", value: "2.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield for an energy services company" },
		},
	},
	{
		id: "slb",
		ticker: "SLB",
		name: "SLB",
		bio: "the world's largest oilfield services company operating across 120 countries",
		heroImage: "https://images.unsplash.com/photo-1611438836592-bde9c79741af?w=800&h=600&fit=crop",
		personalityDescription: "The global oil contractor who answers to every national oil company on Earth",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why SLB Dominates Global Oilfield Services",
			sections: [
				{ heading: "The Global Scale", content: "SLB (formerly Schlumberger) operates in more countries than most national governments have embassies. From seismic surveys to production optimization, they cover the entire value chain globally." },
				{ heading: "The Digital Oilfield", content: "SLB has been investing heavily in digital transformation — software and analytics for oil production optimization. Their Delfi digital platform is transitioning them toward a technology services company." },
				{ heading: "Why It Matters", content: "International oil investment is growing, particularly in the Middle East and offshore. SLB's unmatched global presence positions them for investment cycles outside North America." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "17.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the global oilfield services leader" },
			marketCap: { label: "Market Cap", value: "$48B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large global company at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from international activity recovery" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from technically complex high-value services" },
			beta: { label: "Beta", value: "1.55", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — energy services cycle with oil investment" },
			dividendYield: { label: "Dividend Yield", value: "2.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "decent yield from the global services scale" },
		},
	},
	{
		id: "psx",
		ticker: "PSX",
		name: "Phillips 66",
		bio: "the oil refiner and midstream company that turns crude into cash flow",
		heroImage: "https://images.unsplash.com/photo-1584824486509-112e4181d12e?w=800&h=600&fit=crop",
		personalityDescription: "The industrial factory that refines something unusable into something everyone needs",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Phillips 66 Makes Money Across Oil Cycles",
			sections: [
				{ heading: "The Refining Margin", content: "Refiners make money from the spread between crude oil cost and refined product prices — not from oil going up or down. Phillips 66 is a play on refining margins, not commodity direction." },
				{ heading: "The Midstream Business", content: "Phillips 66 has significant pipeline and storage assets generating stable fee-based income regardless of commodity prices. The diversification makes cash flows more predictable." },
				{ heading: "Why It Matters", content: "Refining is capital-intensive with high barriers to entry. No new US refineries have been built in decades. That structural scarcity makes existing capacity extremely valuable in tight supply environments." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "9.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — refining economics are complex and misunderstood by most" },
			marketCap: { label: "Market Cap", value: "$52B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large refiner and midstream at a fair price" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "depends on crack spreads more than oil price" },
			profitMargin: { label: "Profit Margin", value: "5%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "variable margins tied directly to refining economics" },
			beta: { label: "Beta", value: "0.98", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — refining is less volatile than pure E&P" },
			dividendYield: { label: "Dividend Yield", value: "3.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the combined refining and midstream mix" },
		},
	},
	{
		id: "vlo",
		ticker: "VLO",
		name: "Valero Energy",
		bio: "the largest US independent refiner that prints money when gasoline margins are wide",
		heroImage: "https://images.unsplash.com/photo-1584824486509-112e4181d12e?w=800&h=600&fit=crop",
		personalityDescription: "The industrial machine that transforms crude oil into the gasoline in your tank every week",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Valero Is the Refining Machine",
			sections: [
				{ heading: "The Scale Advantage", content: "Valero is the largest independent petroleum refiner in the US, with 15 refineries across North America. Their scale gives purchasing power and operational flexibility that smaller rivals can't match." },
				{ heading: "The Renewable Fuels Push", content: "Valero owns 12 ethanol plants and is growing its renewable diesel capacity aggressively. The diversification into clean fuels is both a regulatory hedge and a growing profit center." },
				{ heading: "Why It Matters", content: "Refining margins are highly volatile — wide crack spreads mean extraordinary profits, narrow spreads mean pain. Valero's scale helps them survive troughs and capitalize hard on peaks." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "8.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — refining is cyclical and markets price it accordingly" },
			marketCap: { label: "Market Cap", value: "$42B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large refiner at a discount to its earnings power" },
			revenueGrowth: { label: "Revenue Growth", value: "2%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "variable — crack spread environment determines everything" },
			profitMargin: { label: "Profit Margin", value: "6%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins when refining conditions cooperate" },
			beta: { label: "Beta", value: "0.82", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — refining is somewhat defensive vs E&P" },
			dividendYield: { label: "Dividend Yield", value: "3.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield from the cyclical refiner" },
		},
	},
	{
		id: "kmi",
		ticker: "KMI",
		name: "Kinder Morgan",
		bio: "the natural gas pipeline empire that charges a toll on every molecule",
		heroImage: "https://images.unsplash.com/photo-1611438836592-bde9c79741af?w=800&h=600&fit=crop",
		personalityDescription: "The infrastructure king who gets paid whether gas prices are up or down",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Kinder Morgan Owns the Gas Highway",
			sections: [
				{ heading: "The Pipeline Network", content: "Kinder Morgan operates over 80,000 miles of pipelines and massive natural gas storage facilities. Every molecule of gas shipped through their system pays a fee regardless of the price." },
				{ heading: "The Dividend Rebuild", content: "Kinder Morgan cut its dividend 75% in 2016 when debt became unsustainable. They spent years rebuilding the payout and the balance sheet — a cautionary tale about leverage with a comeback ending." },
				{ heading: "Why It Matters", content: "Natural gas demand is growing for power generation, LNG exports, and industrial use. Kinder Morgan's pipeline network is critical infrastructure the energy transition will still need for decades." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for midstream stability and pipeline cash flows" },
			marketCap: { label: "Market Cap", value: "$22B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large midstream company at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady fee-based growth from volumes not prices" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from the toll-road pipeline model" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — fee-based revenue insulates from commodity prices" },
			dividendYield: { label: "Dividend Yield", value: "6.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield from the rebuilt and growing dividend" },
		},
	},
	{
		id: "dvn",
		ticker: "DVN",
		name: "Devon Energy",
		bio: "the Oklahoma oil company that invented the dividend model investors love",
		heroImage: "https://images.unsplash.com/photo-1495568023648-3339cf77a32f?w=800&h=600&fit=crop",
		personalityDescription: "The shareholder-friendly driller who pioneered the payout structure everyone copied",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Devon Energy's Dividend Model Changed Oil Investing",
			sections: [
				{ heading: "The Variable Dividend", content: "Devon pioneered the fixed-plus-variable dividend: a reliable base plus variable payments tied to actual cash flows. In strong oil markets, shareholders receive extraordinary payouts automatically." },
				{ heading: "The Delaware Basin", content: "Devon's core acreage is in the Delaware Basin — one of the most prolific parts of the Permian. High-quality rock combined with capital discipline creates exceptional returns on every well drilled." },
				{ heading: "Why It Matters", content: "Devon's dividend model has been adopted across the energy industry. It aligns payouts with commodity cycles instead of locking in unsustainable commitments that create debt in downturns." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "8.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — E&P stocks always trade at a discount to their cash generation" },
			marketCap: { label: "Market Cap", value: "$12B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size E&P with high-quality acreage and clean balance sheet" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "oil price sensitive revenue" },
			profitMargin: { label: "Profit Margin", value: "35%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from low-cost Permian Basin production" },
			beta: { label: "Beta", value: "1.48", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — oil price amplifies everything" },
			dividendYield: { label: "Dividend Yield", value: "6.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "very high yield from the fixed-plus-variable dividend structure" },
		},
	},
	{
		id: "hes",
		ticker: "HES",
		name: "Hess Corporation",
		bio: "the oil company Chevron is acquiring because of its Guyana assets",
		heroImage: "https://images.unsplash.com/photo-1527856263669-12c3a0af2aa6?w=800&h=600&fit=crop",
		personalityDescription: "The independent E&P that struck gold offshore Guyana and became a takeover target",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Hess Found One of the World's Best Oilfields",
			sections: [
				{ heading: "The Guyana Discovery", content: "Hess's stake in the Stabroek block offshore Guyana is one of the largest oil discoveries of the last 20 years. The resource is low-cost, high-quality, and will produce for decades." },
				{ heading: "The Chevron Deal", content: "Chevron agreed to acquire Hess for $53 billion specifically to get the Guyana assets. It validated the extraordinary value of what Hess discovered and built there." },
				{ heading: "Why It Matters", content: "Guyana is transforming from a poor South American nation into a major oil exporter, and Hess owns a significant piece of the concession that's driving that transformation." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "acquisition premium bakes in the Guyana value" },
			marketCap: { label: "Market Cap", value: "$40B", explanation: "The total value of all the company's shares combined", culturalTranslation: "valued near the Chevron acquisition price" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from Guyana ramp-up" },
			profitMargin: { label: "Profit Margin", value: "30%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from world-class offshore assets" },
			beta: { label: "Beta", value: "1.28", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "oil beta — commodity price sensitivity" },
			dividendYield: { label: "Dividend Yield", value: "1.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — Chevron acquisition pending resolution" },
		},
	},
	{
		id: "bkr",
		ticker: "BKR",
		name: "Baker Hughes",
		bio: "the oilfield technology and industrial energy company",
		heroImage: "https://images.unsplash.com/photo-1611438836592-bde9c79741af?w=800&h=600&fit=crop",
		personalityDescription: "The tech-forward contractor bridging old-school oil and clean energy services",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Baker Hughes Is Reinventing Oilfield Services",
			sections: [
				{ heading: "The Industrial Technology", content: "Baker Hughes is more than oil services — they make turbines, compressors, and industrial equipment for energy and industrial applications. The technology business has better margins than pure services." },
				{ heading: "The Energy Transition", content: "Baker Hughes has positioned itself as an energy technology company — serving LNG, hydrogen, carbon capture, and geothermal alongside traditional oil and gas. The diversification reduces long-term cyclicality." },
				{ heading: "Why It Matters", content: "As LNG exports grow globally, Baker Hughes's LNG equipment and technology becomes a strategic asset. Their positioning across traditional and new energy is uncommon in the services industry." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the diversified energy technology positioning" },
			marketCap: { label: "Market Cap", value: "$32B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large services company at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "7%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from LNG and international activity" },
			profitMargin: { label: "Profit Margin", value: "12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins from the technology-weighted mix" },
			beta: { label: "Beta", value: "1.32", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — less volatile than pure oilfield services" },
			dividendYield: { label: "Dividend Yield", value: "2.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the diversified energy machine" },
		},
	},
	{
		id: "cat",
		ticker: "CAT",
		name: "Caterpillar",
		bio: "the yellow machine company that builds everything that builds everything else",
		heroImage: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop",
		personalityDescription: "The construction equipment titan who supplies the tools for every major infrastructure project",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Caterpillar Powers Global Infrastructure",
			sections: [
				{ heading: "The Yellow Fleet", content: "Caterpillar's yellow machines are everywhere infrastructure is built — mining, construction, oil and gas, agriculture. The brand is synonymous with industrial strength globally." },
				{ heading: "The Services Business", content: "Beyond selling equipment, Caterpillar generates billions from parts, services, and financing. The aftermarket business has excellent margins and continues generating revenue long after each equipment sale." },
				{ heading: "Why It Matters", content: "Infrastructure spending is a global mega-theme — the US Infrastructure Act, China's belt and road, Middle East construction booms. Caterpillar is the equipment supplier to all of it." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "16.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium but justified for the global infrastructure equipment leader" },
			marketCap: { label: "Market Cap", value: "$175B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive and still growing" },
			revenueGrowth: { label: "Revenue Growth", value: "11%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "cyclical but consistently growing through cycles" },
			profitMargin: { label: "Profit Margin", value: "17%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from the high-value equipment and services mix" },
			beta: { label: "Beta", value: "1.12", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — industrial but not wildly volatile" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend grower for decades" },
		},
	},
	{
		id: "de",
		ticker: "DE",
		name: "Deere & Company",
		bio: "the green tractor company that put GPS and AI in farm equipment first",
		heroImage: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop",
		personalityDescription: "The agriculture technology company disguised as a tractor manufacturer",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Deere Is Actually an Agricultural Technology Company",
			sections: [
				{ heading: "The Precision Ag", content: "Deere was putting GPS technology in tractors decades before precision agriculture was a mainstream concept. Their See & Spray technology uses computer vision to selectively apply herbicides." },
				{ heading: "The Technology Lock-In", content: "Deere's technology platform — John Deere Operations Center — creates switching costs that go far beyond the equipment itself. Farmers manage entire operations through Deere software." },
				{ heading: "Why It Matters", content: "Feeding 8 billion people requires extreme agricultural efficiency. Deere's technology makes farming dramatically more productive, embedding themselves in the economics of global food production." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium justified by the agricultural technology moat" },
			marketCap: { label: "Market Cap", value: "$105B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive market cap for what most people think is just a tractor company" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "cyclical but protected by technology lock-in" },
			profitMargin: { label: "Profit Margin", value: "20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from the technology and equipment mix" },
			beta: { label: "Beta", value: "1.05", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — ag is cyclical but less so with tech services" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "steady dividend from the agricultural equipment giant" },
		},
	},
	{
		id: "etn",
		ticker: "ETN",
		name: "Eaton Corporation",
		bio: "the power management company that owns the EV infrastructure wave",
		heroImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop",
		personalityDescription: "The industrial conglomerate positioned perfectly at the intersection of electrification and energy",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Eaton Benefits From the Electric Transition",
			sections: [
				{ heading: "The Power Management", content: "Eaton makes electrical components — circuit breakers, switchgear, transformers — that power everything from buildings to data centers. As electrification expands, everything Eaton makes gets more critical." },
				{ heading: "The Data Center Tailwind", content: "AI and cloud computing require enormous amounts of power. Every new data center requires Eaton's power management equipment. The AI boom is directly Eaton's boom." },
				{ heading: "Why It Matters", content: "Eaton is positioned at the intersection of multiple mega-trends: EV infrastructure, renewable energy integration, data center expansion, and industrial electrification. All roads run through power management." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "24.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the electrification mega-trend exposure" },
			marketCap: { label: "Market Cap", value: "$70B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large and growing faster than the industrial sector" },
			revenueGrowth: { label: "Revenue Growth", value: "15%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "accelerating growth from data centers and electrification demand" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins improving with the technology product mix" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — industrials carry some economic cyclicality" },
			dividendYield: { label: "Dividend Yield", value: "1.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest but growing dividend" },
		},
	},
	{
		id: "emr",
		ticker: "EMR",
		name: "Emerson Electric",
		bio: "65+ consecutive years of dividend increases in industrial automation",
		heroImage: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop",
		personalityDescription: "The automation company that has paid and raised its dividend for longer than most companies have existed",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Emerson Earns the Title of Dividend Aristocrat",
			sections: [
				{ heading: "The Automation Business", content: "Emerson makes measurement instruments, control valves, and software for industrial automation. Their products run refineries, chemical plants, and power facilities globally." },
				{ heading: "The Software Pivot", content: "Emerson has been divesting older businesses and acquiring software companies, positioning itself as an industrial automation software company rather than just an equipment manufacturer." },
				{ heading: "Why It Matters", content: "Industrial automation is growing as manufacturers face labor shortages and pressure to improve efficiency. Emerson's software-plus-hardware approach creates switching costs in mission-critical applications." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the automation leader with impeccable dividend history" },
			marketCap: { label: "Market Cap", value: "$58B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large industrial at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "accelerating from software acquisitions and automation demand" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the industrial automation mix" },
			beta: { label: "Beta", value: "1.08", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — industrial cyclicality with automation stability" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "one of the longest consecutive dividend growth records in history" },
		},
	},
	{
		id: "itw",
		ticker: "ITW",
		name: "Illinois Tool Works",
		bio: "the diversified industrial that proves decentralization and margin focus actually work",
		heroImage: "https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=800&h=600&fit=crop",
		personalityDescription: "The industrial conglomerate that figured out the right way to run a diversified manufacturing business",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why ITW's 80/20 Business Principle Creates Exceptional Returns",
			sections: [
				{ heading: "The 80/20 Focus", content: "ITW's management philosophy focuses each business unit on the 20% of products and customers that generate 80% of profits — and ruthlessly eliminates the rest. The discipline drives margin expansion." },
				{ heading: "The Decentralized Model", content: "ITW operates 85+ business units almost independently. Each unit focuses on its specific niche and accountability is clear. The model creates an organization that's hard to replicate at scale." },
				{ heading: "Why It Matters", content: "ITW has grown margins for a decade through portfolio simplification and operational focus. Their approach to industrial manufacturing has become a Harvard Business School case study in execution." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "23.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for exceptional margin expansion and returns" },
			marketCap: { label: "Market Cap", value: "$68B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive for an industrial conglomerate — justified by profitability" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow but steady grower with excellent earnings quality" },
			profitMargin: { label: "Profit Margin", value: "26%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "outstanding margins for manufacturing — the 80/20 principle at work" },
			beta: { label: "Beta", value: "1.08", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate industrial cyclicality" },
			dividendYield: { label: "Dividend Yield", value: "2.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend from a decades-long grower" },
		},
	},
	{
		id: "ir",
		ticker: "IR",
		name: "Ingersoll Rand",
		bio: "industrial tools and compression equipment at the intersection of efficiency and sustainability",
		heroImage: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop",
		personalityDescription: "The industrial tool company that shows up in every factory that cares about operating costs",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Ingersoll Rand Serves Sustainable Industrial Efficiency",
			sections: [
				{ heading: "The Compression Business", content: "Ingersoll Rand makes air compressors, power tools, and HVAC equipment used in every type of industrial facility. Compressed air alone is used in manufacturing processes that touch virtually every product." },
				{ heading: "The Sustainability Angle", content: "Compressed air and HVAC are significant energy consumers. Ingersoll Rand's efficiency-focused products reduce energy consumption, aligning with corporate sustainability goals that are only growing." },
				{ heading: "Why It Matters", content: "Industrial efficiency is a permanent trend — energy costs never stop mattering. Ingersoll Rand's positioning as the sustainability-focused industrial tool supplier is differentiated." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "30.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the sustainability-focused industrial positioning" },
			marketCap: { label: "Market Cap", value: "$32B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size industrial at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "12%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from sustainability and industrial efficiency demand" },
			profitMargin: { label: "Profit Margin", value: "16%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from specialty compressed air and tools" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — industrial cyclicality with sustainability tailwind" },
			dividendYield: { label: "Dividend Yield", value: "0.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "minimal yield — growth-focused capital allocation" },
		},
	},
	{
		id: "rtx",
		ticker: "RTX",
		name: "RTX Corporation",
		bio: "the Raytheon-Pratt & Whitney defense giant that powers military jets and missiles",
		heroImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop",
		personalityDescription: "The aerospace and defense conglomerate that makes the engines and the weapons they protect",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why RTX Is Defense's Most Integrated Company",
			sections: [
				{ heading: "The Dual Business", content: "RTX combines Pratt & Whitney (jet engines for commercial and military aircraft) with Raytheon (missiles, radar, and defense electronics). The combination gives extraordinary exposure across aerospace." },
				{ heading: "The Aftermarket", content: "Pratt & Whitney's commercial jet engines generate decades of maintenance revenue after the initial sale. Every engine sale is the beginning of a 30+ year service relationship." },
				{ heading: "Why It Matters", content: "RTX's GTF engine is powering the next generation of narrow-body commercial aircraft. The defense side benefits from every geopolitical crisis that increases defense spending globally." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "34.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for defense and commercial aerospace combination" },
			marketCap: { label: "Market Cap", value: "$160B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive defense company at a premium valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from both defense budget increases and commercial aerospace recovery" },
			profitMargin: { label: "Profit Margin", value: "8%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "recovering margins as GTF engine issues get resolved" },
			beta: { label: "Beta", value: "1.08", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — defense is counter-cyclical to economic stress" },
			dividendYield: { label: "Dividend Yield", value: "2.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend from the aerospace and defense giant" },
		},
	},
	{
		id: "noc",
		ticker: "NOC",
		name: "Northrop Grumman",
		bio: "the stealth bomber and space company that makes things the government classifies immediately",
		heroImage: "https://images.unsplash.com/photo-1603483080818-04ae1bb5a79e?w=800&h=600&fit=crop",
		personalityDescription: "The defense contractor who builds the weapons that the enemy is never supposed to see",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Northrop Grumman Makes the Most Classified Products",
			sections: [
				{ heading: "The B-21 Raider", content: "Northrop is building the B-21 Raider — America's next-generation stealth bomber to replace the B-2. The contract is enormous and the product is so advanced details remain classified." },
				{ heading: "The Space Business", content: "Northrop has significant space systems and missile defense businesses. As space becomes militarized and missile threats increase, their portfolio becomes more strategically critical." },
				{ heading: "Why It Matters", content: "Northrop's products are irreplaceable — there is no commercial equivalent for a stealth bomber or nuclear missile warning system. That makes their revenue extraordinarily stable and government-backed." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for a defense compounder with classified revenue streams" },
			marketCap: { label: "Market Cap", value: "$68B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large defense company at a modest valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent mid-single-digit grower from defense budget growth" },
			profitMargin: { label: "Profit Margin", value: "11%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from high-value classified programs" },
			beta: { label: "Beta", value: "0.52", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — defense is counter-cyclical to market stress" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend from the defense cash machine" },
		},
	},
	{
		id: "lhx",
		ticker: "LHX",
		name: "L3Harris Technologies",
		bio: "the defense electronics company that built itself through mergers",
		heroImage: "https://images.unsplash.com/photo-1603483080818-04ae1bb5a79e?w=800&h=600&fit=crop",
		personalityDescription: "The defense electronics integrator who connects sensors, data links, and communications for the military",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 25, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why L3Harris Is the Defense Electronics Specialist",
			sections: [
				{ heading: "The Tactical Communications", content: "L3Harris makes radio and communications systems used by virtually every branch of the US military and allied forces globally. Their tactical communications are standard equipment in modern warfare." },
				{ heading: "The ISR Business", content: "Intelligence, surveillance, and reconnaissance systems are L3Harris's fastest-growing segment. As warfare becomes more sensor-driven, their ISR technology becomes more strategically critical." },
				{ heading: "Why It Matters", content: "L3Harris was formed by the merger of L3 Technologies and Harris Corporation in 2019. The combined company has scale in electronic warfare, communications, and space systems." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "15.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the defense electronics specialist" },
			marketCap: { label: "Market Cap", value: "$42B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large defense company at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady grower from defense budget and electronics demand" },
			profitMargin: { label: "Profit Margin", value: "11%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the defense electronics focus" },
			beta: { label: "Beta", value: "0.55", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — defense revenue is stable and backlogged" },
			dividendYield: { label: "Dividend Yield", value: "2.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "decent dividend from a defense compounder" },
		},
	},
	{
		id: "ge",
		ticker: "GE",
		name: "GE Aerospace",
		bio: "the aviation engine company that rose from GE's famous breakup",
		heroImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop",
		personalityDescription: "The iconic conglomerate that finally focused on just one thing — and won",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why GE Aerospace Is Better Than GE Ever Was",
			sections: [
				{ heading: "The LEAP Engine", content: "GE Aerospace's LEAP engine, co-developed with Safran through CFM International, powers the Boeing 737 MAX and Airbus A320neo. Every short-haul flight on these aircraft generates engine maintenance fees." },
				{ heading: "The Pure Play", content: "GE shed its power, renewable energy, and healthcare divisions to become purely aerospace. The focused company has dramatically better margins and a clearer investment thesis." },
				{ heading: "Why It Matters", content: "Commercial aviation is recovering and growing globally. GE Aerospace has massive aftermarket revenue from engines already in service — a recurring fee stream that grows with every new engine delivered." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "38.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the high-quality aviation engine franchise" },
			marketCap: { label: "Market Cap", value: "$185B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive — reflects the premium multiple on aerospace" },
			revenueGrowth: { label: "Revenue Growth", value: "20%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing as commercial aviation expands globally" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins improving with the pure-play focus" },
			beta: { label: "Beta", value: "1.22", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — aviation has economic sensitivity but good backlog protection" },
			dividendYield: { label: "Dividend Yield", value: "0.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — focused on growth and buybacks" },
		},
	},
	{
		id: "mmm",
		ticker: "MMM",
		name: "3M",
		bio: "the Post-it Note company sitting on 60,000 products and a massive legal problem",
		heroImage: "https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=800&h=600&fit=crop",
		personalityDescription: "The industrial conglomerate that invented everything in your office but got into a lawsuit about earplugs",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 62, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 68, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 42, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why 3M's Reputation Exceeded Its Recent Execution",
			sections: [
				{ heading: "The Innovation Legacy", content: "3M holds over 100,000 patents and has invented countless products — Post-it Notes, Scotch tape, N95 masks, Scotchgard. Innovation culture embedded in DNA for over 100 years." },
				{ heading: "The Legal Overhang", content: "3M faces massive liabilities from PFAS chemicals and defective combat earplugs. The legal settlements have run into the billions and created significant uncertainty around the company." },
				{ heading: "Why It Matters", content: "3M spun off its healthcare business as Solventum and is restructuring aggressively. Whether the remaining industrial company can recapture the innovation premium is the central question." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "15.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — legal liabilities and restructuring create real uncertainty" },
			marketCap: { label: "Market Cap", value: "$52B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large but compressed by the legal overhangs" },
			revenueGrowth: { label: "Revenue Growth", value: "1%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "stagnant growth during restructuring" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins as they simplify and settle liabilities" },
			beta: { label: "Beta", value: "0.92", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — industrial with significant legal/regulatory risk" },
			dividendYield: { label: "Dividend Yield", value: "5.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield — partly a signal of the cheap valuation" },
		},
	},
	{
		id: "unp",
		ticker: "UNP",
		name: "Union Pacific",
		bio: "the railroad that owns the western half of America's freight network",
		heroImage: "https://images.unsplash.com/photo-1474487548417-781cb6d646b3?w=800&h=600&fit=crop",
		personalityDescription: "The invisible backbone of Western US commerce that moves everything you don't see moving",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Union Pacific Is a Toll Road Across the West",
			sections: [
				{ heading: "The Western Network", content: "Union Pacific's rail network spans 32,000 miles across 23 western US states. It's infrastructure that can't be replicated — building a new transcontinental railroad isn't an option." },
				{ heading: "The Precision Railroading", content: "Union Pacific has adopted precision scheduled railroading — running fewer, longer trains on precise schedules rather than full trains when convenient. The efficiency gains dramatically improved margins." },
				{ heading: "Why It Matters", content: "Railroads move 40% of US freight and emit 75% less carbon per ton-mile than trucks. As environmental standards tighten, rail becomes more economically and ecologically competitive." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "20.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the irreplaceable western rail network" },
			marketCap: { label: "Market Cap", value: "$145B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive — railroads have monopolistic pricing power" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady mid-single-digit grower" },
			profitMargin: { label: "Profit Margin", value: "32%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from the precision railroading model" },
			beta: { label: "Beta", value: "1.05", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — industrials carry economic cyclicality" },
			dividendYield: { label: "Dividend Yield", value: "2.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid dividend from the railroad compounder" },
		},
	},
	{
		id: "csx",
		ticker: "CSX",
		name: "CSX Corporation",
		bio: "the eastern railroad that moves coal, chemicals, and consumer goods quietly",
		heroImage: "https://images.unsplash.com/photo-1474487548417-781cb6d646b3?w=800&h=600&fit=crop",
		personalityDescription: "The eastern freight backbone that nobody thinks about until the economy actually needs to move",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 50, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why CSX Controls Eastern US Freight",
			sections: [
				{ heading: "The Eastern Network", content: "CSX operates 20,000 miles of rail in the eastern United States, serving major industrial markets, ports, and population centers. The eastern network is as irreplaceable as Union Pacific's western one." },
				{ heading: "The Intermodal Growth", content: "CSX's intermodal business — moving shipping containers between rail and truck — has been growing as retailers and manufacturers optimize supply chains. Longer distances favor rail economics." },
				{ heading: "Why It Matters", content: "CSX's precision railroading transformation improved on-time performance and margins simultaneously. The railroad has become a benchmark for operational efficiency in a capital-intensive industry." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the eastern railroad market position" },
			marketCap: { label: "Market Cap", value: "$68B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large infrastructure company at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady grower from intermodal and industrial freight" },
			profitMargin: { label: "Profit Margin", value: "32%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from precision railroading" },
			beta: { label: "Beta", value: "1.12", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — freight reflects economic activity" },
			dividendYield: { label: "Dividend Yield", value: "1.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the eastern rail franchise" },
		},
	},
	{
		id: "ups",
		ticker: "UPS",
		name: "UPS",
		bio: "the brown trucks that define American package delivery for everyone except Amazon",
		heroImage: "https://images.unsplash.com/photo-1566933293069-b55c7f326dd4?w=800&h=600&fit=crop",
		personalityDescription: "The logistics giant that built the most efficient delivery network before the e-commerce explosion",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 42, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why UPS Is Navigating Its Most Important Transition",
			sections: [
				{ heading: "The Amazon Dependency", content: "UPS grew enormously on the back of Amazon package volume — then Amazon began building its own logistics. UPS has been replacing that volume with higher-margin business-to-business and healthcare shipments." },
				{ heading: "The Healthcare Logistics", content: "UPS has been aggressively targeting pharmaceutical, medical device, and clinical trial logistics — specialized shipments that pay more and are less price-sensitive than consumer packages." },
				{ heading: "Why It Matters", content: "The pivot from Amazon volume to premium healthcare and B2B shipments is UPS's defining strategic challenge. The margin expansion story depends on whether they can replace commodity volume with premium volume." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — compression from the Amazon transition and margin pressure" },
			marketCap: { label: "Market Cap", value: "$85B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive logistics company at a post-COVID discount" },
			revenueGrowth: { label: "Revenue Growth", value: "2%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth during the strategic transition" },
			profitMargin: { label: "Profit Margin", value: "10%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins from the mix shift to healthcare" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — logistics is somewhat defensive" },
			dividendYield: { label: "Dividend Yield", value: "4.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield from the global delivery machine" },
		},
	},
	{
		id: "fdx",
		ticker: "FDX",
		name: "FedEx",
		bio: "the overnight express company that invented the hub-and-spoke delivery model",
		heroImage: "https://images.unsplash.com/photo-1566933293069-b55c7f326dd4?w=800&h=600&fit=crop",
		personalityDescription: "The urgency specialists who built an empire on the promise that it will absolutely positively be there overnight",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why FedEx Invented Modern Logistics",
			sections: [
				{ heading: "The Hub and Spoke", content: "Fred Smith invented the hub-and-spoke model for package delivery when he wrote about it in a college paper (legend says he got a C). FedEx implemented it and transformed global logistics." },
				{ heading: "The DRIVE Transformation", content: "FedEx has been executing DRIVE — a multi-year cost reduction and network optimization program. They're merging Express and Ground operations to eliminate billions in duplicate cost." },
				{ heading: "Why It Matters", content: "FedEx is restructuring aggressively while UPS competes and Amazon threatens. The DRIVE program's success will determine whether FedEx emerges leaner or continues to lag peers." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "15.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap for a company with iconic brand and transformation upside" },
			marketCap: { label: "Market Cap", value: "$58B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive logistics company compressed by restructuring uncertainty" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slowing during network restructuring" },
			profitMargin: { label: "Profit Margin", value: "8%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins from DRIVE cost removal" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — logistics is economically sensitive" },
			dividendYield: { label: "Dividend Yield", value: "2.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield while they restructure" },
		},
	},
	{
		id: "dal",
		ticker: "DAL",
		name: "Delta Air Lines",
		bio: "the airline that turned flying from something to endure into something to choose",
		heroImage: "https://images.unsplash.com/photo-1583418855524-5cc3a8ad3ab4?w=800&h=600&fit=crop",
		personalityDescription: "The premium airline that decided economy class could actually be decent",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Delta Is America's Best-Run Airline",
			sections: [
				{ heading: "The Premium Pivot", content: "Delta has invested heavily in premium cabin experiences — Comfort+, first class retrofits, lounge upgrades. The strategy has attracted high-spending business travelers who make the economics work." },
				{ heading: "The Amex Partnership", content: "Delta's co-branded American Express card generates billions annually in royalty fees — revenue that flows whether or not passengers are flying. It's an airline revenue stream that doesn't depend on the weather." },
				{ heading: "Why It Matters", content: "Airlines are brutal businesses but Delta has consistently outperformed peers. Their loyalty to operational excellence and premium positioning has made them the carrier corporate travelers actually prefer." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "8.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — markets always underprice quality airlines" },
			marketCap: { label: "Market Cap", value: "$28B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size premium carrier compressed by cyclical concerns" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from both leisure and business travel recovery" },
			profitMargin: { label: "Profit Margin", value: "8%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "better margins than most airlines — premium mix helps" },
			beta: { label: "Beta", value: "1.48", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — airlines are economically and fuel-sensitive" },
			dividendYield: { label: "Dividend Yield", value: "1.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinstated dividend as profitability recovers" },
		},
	},
	{
		id: "ual",
		ticker: "UAL",
		name: "United Airlines",
		bio: "the global carrier connecting American cities to the entire world",
		heroImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop",
		personalityDescription: "The international hub airline connecting Middle America to everywhere else",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 45, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why United's International Network Is Its Moat",
			sections: [
				{ heading: "The Global Network", content: "United's international route network — especially across the Pacific and to Latin America — is difficult to replicate. Routes take years of government approval and slot acquisition to build." },
				{ heading: "The Polaris Business Class", content: "United's Polaris international business class has been recognized as among the best in North American aviation. Premium international seats are the highest-margin product in commercial aviation." },
				{ heading: "Why It Matters", content: "United has been aggressive about fleet modernization and route expansion. Their connection between small US cities and international destinations through hubs is strategically important for travelers who lack options." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "7.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — airline stocks consistently trade below intrinsic value" },
			marketCap: { label: "Market Cap", value: "$20B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large carrier compressed by airline sector skepticism" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from international travel recovery" },
			profitMargin: { label: "Profit Margin", value: "7%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins from premium mix and operational efficiency" },
			beta: { label: "Beta", value: "1.62", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — fuel prices and economy hit hard" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — conserving cash post-COVID" },
		},
	},
	{
		id: "luv",
		ticker: "LUV",
		name: "Southwest Airlines",
		bio: "the no-frills airline that made the open-seating boarding ritual a cultural phenomenon",
		heroImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop",
		personalityDescription: "The egalitarian air carrier where everyone scrambles for a window seat and somehow loves it",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 52, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Southwest Built the Last Great Airline Brand",
			sections: [
				{ heading: "The Low-Cost Model", content: "Southwest built decades of profitability on the low-cost model: one aircraft type, no seat assignments, no bag fees, and friendly culture. The simplicity is a feature, not a limitation." },
				{ heading: "The Revenue Management Gap", content: "Southwest fell behind competitors in revenue management — the sophisticated pricing that optimizes every seat on every flight. Closing that gap and implementing assigned seating is the current transformation." },
				{ heading: "Why It Matters", content: "Southwest's culture has been its competitive advantage and its resistance to change simultaneously. The leadership transition and strategy shift toward assigned seating is the most significant change in their history." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap given the brand value and transformation potential" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large airline at a discount from operational struggles" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing slowly as transformation takes hold" },
			profitMargin: { label: "Profit Margin", value: "4%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "compressed margins during the change management period" },
			beta: { label: "Beta", value: "1.15", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — fuel and economy sensitive" },
			dividendYield: { label: "Dividend Yield", value: "2.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "reinstated dividend as profitability recovers" },
		},
	},
	{
		id: "aal",
		ticker: "AAL",
		name: "American Airlines",
		bio: "the world's largest airline by fleet that's still paying off bankruptcy debts",
		heroImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop",
		personalityDescription: "The legacy carrier that merged with US Airways and is still carrying the financial weight of it",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 52, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 58, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why American Airlines Is the Airline Stock Nobody Can Quite Love",
			sections: [
				{ heading: "The Debt Mountain", content: "American emerged from bankruptcy in 2013 and immediately merged with US Airways. The resulting debt load has been a financial anchor — limiting investment and maintaining stress through every downturn." },
				{ heading: "The Loyalty Asset", content: "AAdvantage is one of the most used airline loyalty programs. The credit card partnership with Citi and Barclays generates billions — an asset that's potentially worth more than the airline itself." },
				{ heading: "Why It Matters", content: "American serves more routes and passengers than any other airline globally. Their network reach is extraordinary. But network size without financial strength is a liability in tough markets." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "very cheap — but the debt and cyclical risk justify the discount" },
			marketCap: { label: "Market Cap", value: "$10B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large airline compressed by debt concerns" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing revenue but struggling to show sustained profitability" },
			profitMargin: { label: "Profit Margin", value: "2%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin margins — debt service eats much of operating profit" },
			beta: { label: "Beta", value: "1.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very high beta — debt amplifies any revenue shock" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — every dollar goes toward debt reduction" },
		},
	},
	{
		id: "t",
		ticker: "T",
		name: "AT&T",
		bio: "the old telephone company that is trying to be just a phone company again",
		heroImage: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop",
		personalityDescription: "The telecom giant that finally figured out doing one thing well beats doing many things poorly",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why AT&T Is Simplifying Back to Its Core",
			sections: [
				{ heading: "The DirecTV Disaster", content: "AT&T acquired DirecTV for $49 billion in 2015 and Time Warner for $85 billion in 2018. Both were disasters. They eventually spun off WarnerMedia and sold DirecTV at a massive loss." },
				{ heading: "The Back to Basics", content: "Post-spinoff AT&T is focused on wireless and fiber internet — the core telecom business they know and execute well. The simpler business has better margins and a clearer story." },
				{ heading: "Why It Matters", content: "AT&T has a real fiber internet expansion underway that could compete with cable broadband in millions of homes. If fiber builds out profitably, the undervalued stock has meaningful upside." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "8.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — the simplification thesis takes time to reward investors" },
			marketCap: { label: "Market Cap", value: "$140B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive company trading at a deep discount to assets" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow grower rebuilding after the acquisition mistakes" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins as the simpler telecom business matures" },
			beta: { label: "Beta", value: "0.62", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — telecom is defensive" },
			dividendYield: { label: "Dividend Yield", value: "5.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield compensates for the slow growth story" },
		},
	},
	{
		id: "vz",
		ticker: "VZ",
		name: "Verizon",
		bio: "the wireless carrier that built the most reliable network and charges for it",
		heroImage: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop",
		personalityDescription: "The quiet reliability king who beats competitors on network quality and loses on brand personality",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Verizon's Network Quality Is the Real Product",
			sections: [
				{ heading: "The Network Investment", content: "Verizon has spent more on network capital than any carrier, building a 5G and fiber infrastructure reputation for reliability. Network quality is measurable and Verizon leads on most measures." },
				{ heading: "The Business Market", content: "Verizon's enterprise and government business — selling network services to corporations and agencies — is less exciting than consumer wireless but carries better margins and stickier contracts." },
				{ heading: "Why It Matters", content: "Verizon's high debt load from spectrum acquisitions is the main investor concern. But as 5G monetization grows and fiber internet adds revenue, the debt becomes more manageable." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "9.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — networks are valuable and the yield is extraordinary" },
			marketCap: { label: "Market Cap", value: "$160B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive telecom at a clear discount to replacement cost" },
			revenueGrowth: { label: "Revenue Growth", value: "1%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growing as they digest spectrum debt" },
			profitMargin: { label: "Profit Margin", value: "23%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the large wireless and business mix" },
			beta: { label: "Beta", value: "0.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — people pay their phone bills regardless" },
			dividendYield: { label: "Dividend Yield", value: "6.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "very high yield — the core reason to own Verizon" },
		},
	},
	{
		id: "tmus",
		ticker: "TMUS",
		name: "T-Mobile",
		bio: "the wireless carrier that merged with Sprint and became America's growth story",
		heroImage: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop",
		personalityDescription: "The challenger carrier who turned purple and beat everyone at their own game",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why T-Mobile Won the Carrier Wars",
			sections: [
				{ heading: "The Un-carrier Strategy", content: "T-Mobile under John Legere disrupted the wireless industry by eliminating contracts, hidden fees, and data throttling — one customer-friendly move at a time. The strategy became the industry standard." },
				{ heading: "The Sprint Integration", content: "T-Mobile's acquisition of Sprint doubled their spectrum holdings and customer base. The integration created the only carrier with the 5G spectrum depth to build a true next-generation network." },
				{ heading: "Why It Matters", content: "T-Mobile has been taking subscribers from both AT&T and Verizon for years. Their growth in home internet using 5G is the most disruptive thing happening in broadband — disrupting cable from an unexpected angle." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "20.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the wireless growth and disruption story" },
			marketCap: { label: "Market Cap", value: "$235B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive — reflects the premium investors pay for telecom growth" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "only major carrier actually growing subscribers" },
			profitMargin: { label: "Profit Margin", value: "16%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins as Sprint integration costs fade" },
			beta: { label: "Beta", value: "0.68", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — wireless is defensive and recurring" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small but growing dividend as free cash flow expands" },
		},
	},
	{
		id: "duk",
		ticker: "DUK",
		name: "Duke Energy",
		bio: "the Carolinas' power company that's been keeping the lights on since 1904",
		heroImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop",
		personalityDescription: "The electric utility that charges the same amount whether the economy is good or terrible",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 38, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Duke Energy Is Boring in the Most Profitable Way",
			sections: [
				{ heading: "The Regulated Model", content: "Duke Energy operates as a regulated monopoly in the Carolinas and Midwest. Regulators set rates that allow Duke to earn a guaranteed return on invested capital. Predictable by design." },
				{ heading: "The Clean Energy Transition", content: "Duke has committed to significant clean energy investment — retiring coal plants and building solar and wind. The transition requires enormous capital that regulators allow them to earn a return on." },
				{ heading: "Why It Matters", content: "Electric utilities like Duke are inflation-linked bond substitutes — steady, regulated income. Rising interest rates hurt them, but the long-term infrastructure investment opportunity is enormous." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for a regulated utility" },
			marketCap: { label: "Market Cap", value: "$72B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large regulated utility at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady regulated growth from rate base expansion" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid regulated margins — guaranteed return on equity" },
			beta: { label: "Beta", value: "0.38", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — utilities don't move with the market" },
			dividendYield: { label: "Dividend Yield", value: "4.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield from the regulated rate base" },
		},
	},
	{
		id: "so",
		ticker: "SO",
		name: "Southern Company",
		bio: "the southeastern power utility serving Georgia, Alabama, and the nuclear future",
		heroImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop",
		personalityDescription: "The nuclear power believer who built the first new US reactors in 30 years",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 38, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Southern Company Bet on Nuclear",
			sections: [
				{ heading: "The Vogtle Project", content: "Southern Company built Plant Vogtle — the first new nuclear reactors completed in the US in over 30 years. It was massively over budget and behind schedule, but the clean baseload power is now generating." },
				{ heading: "The Regulated Monopoly", content: "Like all utilities, Southern operates as a regulated monopoly. Rate increases require regulatory approval but are generally approved because the utility must earn a return to attract capital." },
				{ heading: "Why It Matters", content: "Nuclear power is experiencing a renaissance as AI data centers demand reliable 24/7 clean energy. Southern's nuclear expertise is suddenly very strategically valuable." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for a nuclear-invested southeastern utility" },
			marketCap: { label: "Market Cap", value: "$78B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large regulated utility at a fair price" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady regulated growth" },
			profitMargin: { label: "Profit Margin", value: "16%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid regulated margins" },
			beta: { label: "Beta", value: "0.45", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — utilities move very little with markets" },
			dividendYield: { label: "Dividend Yield", value: "4.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield from the regulated utility model" },
		},
	},
	{
		id: "d",
		ticker: "D",
		name: "Dominion Energy",
		bio: "the mid-Atlantic utility reorienting around regulated electric and gas delivery",
		heroImage: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=800&h=600&fit=crop",
		personalityDescription: "The utility simplifying itself after a complicated decade of asset sales and acquisitions",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 60, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 38, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Dominion Simplified and What It Cost",
			sections: [
				{ heading: "The Asset Sales", content: "Dominion sold its gas transmission network to Berkshire Hathaway Energy and exited multiple non-core businesses. The simplification was right strategically but at significant cost to shareholders." },
				{ heading: "The Core Utility", content: "What remains is a more focused regulated electric and gas utility serving Virginia and the Carolinas. Clean energy investment in solar and offshore wind are driving rate base growth." },
				{ heading: "Why It Matters", content: "Dominion's offshore wind projects off the Virginia coast are among the largest in the US. Clean energy mandates will require massive regulated investment — and regulated investment earns guaranteed returns." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "20.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — the simplification created a lower-risk regulated utility" },
			marketCap: { label: "Market Cap", value: "$38B", explanation: "The total value of all the company's shares combined", culturalTranslation: "medium-size utility compressed after asset sales" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow regulated grower recovering from portfolio changes" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid regulated margins" },
			beta: { label: "Beta", value: "0.45", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — utilities are the ultimate defensive sector" },
			dividendYield: { label: "Dividend Yield", value: "5.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield reflects the cheap valuation of the simplified utility" },
		},
	},
	{
		id: "aep",
		ticker: "AEP",
		name: "American Electric Power",
		bio: "the Midwest and Southwest power utility that owns a tenth of US high-voltage transmission",
		heroImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop",
		personalityDescription: "The transmission network owner who moves electrons across a million miles of wire",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 40, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why AEP's Transmission Network Is Its Hidden Asset",
			sections: [
				{ heading: "The Transmission Scale", content: "AEP owns more high-voltage transmission lines than any other US utility — essential infrastructure for moving renewable energy from where it's generated to where it's consumed." },
				{ heading: "The Renewable Build-Out", content: "AEP has one of the largest renewable energy development pipelines in the US utility sector, building wind and solar to retire aging coal plants while growing the rate base profitably." },
				{ heading: "Why It Matters", content: "Renewable energy generation is often far from population centers. AEP's transmission network is how clean energy gets where it needs to go — making them critical infrastructure for the energy transition." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "18.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "fair for the regulated transmission and clean energy story" },
			marketCap: { label: "Market Cap", value: "$44B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large utility with hidden transmission value" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady regulated grower" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid regulated margins" },
			beta: { label: "Beta", value: "0.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — utilities move little with the economy" },
			dividendYield: { label: "Dividend Yield", value: "4.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield from the regulated transmission and generation mix" },
		},
	},
	{
		id: "exc",
		ticker: "EXC",
		name: "Exelon",
		bio: "the largest US regulated electric utility with the biggest nuclear fleet",
		heroImage: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=800&h=600&fit=crop",
		personalityDescription: "The nuclear-heavy utility that serves Chicago, Philadelphia, Baltimore, and DC",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 42, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Exelon Is the Nuclear Utility",
			sections: [
				{ heading: "The Nuclear Fleet", content: "Exelon owns more nuclear generation capacity than any other US utility. Nuclear provides clean, reliable baseload power that's increasingly valuable as data centers demand 24/7 clean electricity." },
				{ heading: "The Regulated Distribution", content: "After spinning off Constellation Energy (generation), Exelon kept the regulated distribution businesses — delivering electricity to customers through regulated local monopolies in major cities." },
				{ heading: "Why It Matters", content: "Exelon's regulated utilities serve dense, high-income urban areas — Philadelphia, Chicago, Baltimore, DC. Urban density creates efficient distribution economics and limited competition." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "20.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the regulated distribution utility" },
			marketCap: { label: "Market Cap", value: "$38B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large regulated utility at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady regulated growth" },
			profitMargin: { label: "Profit Margin", value: "14%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid regulated margins from dense urban distribution" },
			beta: { label: "Beta", value: "0.42", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — regulated utilities are the most defensive sector" },
			dividendYield: { label: "Dividend Yield", value: "3.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the regulated distribution business" },
		},
	},
	{
		id: "o",
		ticker: "O",
		name: "Realty Income",
		bio: "the monthly dividend company that has paid and raised dividends for 600+ consecutive months",
		heroImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop",
		personalityDescription: "The landlord who pays you every single month without fail for decades",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 12, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Realty Income Is the Dividend Investor's Dream",
			sections: [
				{ heading: "The Monthly Dividend", content: "Realty Income is the original 'Monthly Dividend Company' — a brand name based on their practice of paying dividends 12 times per year rather than quarterly. 600+ consecutive monthly dividends." },
				{ heading: "The Net Lease Model", content: "Realty Income buys properties and leases them back to single tenants under long-term net leases. Tenants pay rent, insurance, taxes, and maintenance — Realty Income just collects rent." },
				{ heading: "Why It Matters", content: "Realty Income's tenants include Walgreens, Dollar General, FedEx, and Walmart — businesses with essential goods and services that remain operational in any economic environment." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "42.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the dividend reliability and net lease quality" },
			marketCap: { label: "Market Cap", value: "$48B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large REIT at a premium that income investors consistently pay" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent low-to-mid single digit growth" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from net lease with minimal management" },
			beta: { label: "Beta", value: "0.82", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — real estate income is highly predictable" },
			dividendYield: { label: "Dividend Yield", value: "5.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "high yield with the most reliable dividend record in REITs" },
		},
	},
	{
		id: "amt",
		ticker: "AMT",
		name: "American Tower",
		bio: "the cell tower REIT that landlords every carrier's antenna",
		heroImage: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800&h=600&fit=crop",
		personalityDescription: "The tower landlord who collects rent from every bar of signal on your phone",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why American Tower Is Essential Communications Infrastructure",
			sections: [
				{ heading: "The Tower Economics", content: "American Tower leases space on 220,000+ cell towers globally. As wireless data consumption grows, carriers upgrade their equipment on existing towers — generating rent increases with minimal incremental cost." },
				{ heading: "The International Scale", content: "About 50% of American Tower's revenue comes from outside the US — particularly in India, Africa, and Latin America where wireless adoption is growing fastest. Global 5G deployment is their growth engine." },
				{ heading: "Why It Matters", content: "Every tower can hold equipment from multiple carriers. Adding a new tenant to an existing tower is almost pure margin — the tower exists, the rent is incremental profit. This is why tower REITs have extraordinary margins." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "40.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the essential communications infrastructure model" },
			marketCap: { label: "Market Cap", value: "$85B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large REIT at a reasonable multiple given growth" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from 5G upgrades and new tenant additions" },
			profitMargin: { label: "Profit Margin", value: "38%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from the multi-tenant tower model" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — essential infrastructure is resilient" },
			dividendYield: { label: "Dividend Yield", value: "3.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield that grows with tenant additions" },
		},
	},
	{
		id: "eqix",
		ticker: "EQIX",
		name: "Equinix",
		bio: "the data center REIT that houses the servers running the internet itself",
		heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
		personalityDescription: "The data center landlord that sits at the center of the digital economy",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 90, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Equinix Is Where the Internet Lives",
			sections: [
				{ heading: "The Interconnection Moat", content: "Equinix data centers aren't just server storage — they're the places where different networks, cloud providers, and enterprises physically connect to each other. The interconnection value is irreplaceable." },
				{ heading: "The Platform Model", content: "Equinix operates 260+ data centers in 70+ metros globally. Every cloud provider, network, and enterprise that co-locates there adds value to every other tenant — network effects in physical infrastructure." },
				{ heading: "Why It Matters", content: "Every major cloud provider, financial institution, content provider, and enterprise network has equipment in Equinix. Moving is almost impossible — switching costs are existential for tenants." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "90.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive but the data center moat justifies premium valuation" },
			marketCap: { label: "Market Cap", value: "$78B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large REIT at a premium — network effects command it" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from digital economy expansion" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from high-value digital infrastructure" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — data centers are essential infrastructure" },
			dividendYield: { label: "Dividend Yield", value: "2.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield — they invest aggressively in new data centers" },
		},
	},
	{
		id: "spg",
		ticker: "SPG",
		name: "Simon Property Group",
		bio: "the mall REIT that was supposed to die and keeps not dying",
		heroImage: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=600&fit=crop",
		personalityDescription: "The retail real estate empire that keeps reinventing the mall against all predictions",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Simon Property Group Is Mall REIT's Survivor",
			sections: [
				{ heading: "The Premium Malls", content: "Simon doesn't own dying B-malls — they own the most productive shopping centers in America. Their properties average over $700 in sales per square foot, making them viable for retailers and restaurants." },
				{ heading: "The Diversification", content: "Simon has been investing in luxury brands (Tommy Hilfiger, Brooks Brothers), online retailers, and entertainment concepts. Their malls are becoming experience and dining destinations." },
				{ heading: "Why It Matters", content: "The mall death narrative killed every mall REIT's valuation. But Simon's premium properties have proven resilient — their tenants, locations, and reinvention capacity distinguish them from the malls that closed." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "14.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap given the quality of the premium mall portfolio" },
			marketCap: { label: "Market Cap", value: "$52B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large REIT at a discount from the 'malls are dead' narrative" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from premium location pricing power" },
			profitMargin: { label: "Profit Margin", value: "48%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional REIT margins from property management" },
			beta: { label: "Beta", value: "1.28", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — retail real estate has economic sensitivity" },
			dividendYield: { label: "Dividend Yield", value: "5.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "very high yield reflecting the value and the narrative discount" },
		},
	},
	{
		id: "pld",
		ticker: "PLD",
		name: "Prologis",
		bio: "the logistics warehouse REIT that owns every Amazon fulfillment center's landlord",
		heroImage: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop",
		personalityDescription: "The industrial real estate empire that owns the buildings making e-commerce possible",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Prologis Is the E-Commerce Real Estate Winner",
			sections: [
				{ heading: "The Last-Mile Advantage", content: "Prologis owns over 1.2 billion square feet of logistics real estate in 19 countries. Their properties near population centers enable the fast delivery windows that consumers now expect as standard." },
				{ heading: "The Amazon Relationship", content: "Amazon is Prologis's largest tenant. The growth of e-commerce means growing demand for distribution space near consumers — and Prologis has the best located portfolio to serve that demand." },
				{ heading: "Why It Matters", content: "E-commerce requires 3x more warehouse space than traditional retail to serve the same amount of revenue. As online shopping grows, the structural demand for Prologis's facilities only increases." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "38.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the logistics real estate leader" },
			marketCap: { label: "Market Cap", value: "$100B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive REIT reflecting the e-commerce tailwind" },
			revenueGrowth: { label: "Revenue Growth", value: "9%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent growth from e-commerce and reshoring demand" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from premium logistics locations" },
			beta: { label: "Beta", value: "1.08", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — real estate has some economic sensitivity" },
			dividendYield: { label: "Dividend Yield", value: "3.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the logistics real estate franchise" },
		},
	},
	{
		id: "dlr",
		ticker: "DLR",
		name: "Digital Realty",
		bio: "the data center REIT that scales with every new AI workload deployed",
		heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
		personalityDescription: "The data center landlord racing to keep up with every enterprise's digital appetite",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Digital Realty Grows With the Digital Economy",
			sections: [
				{ heading: "The Hyperscale Business", content: "Digital Realty builds massive campus-style data centers for hyperscale cloud providers — Amazon, Microsoft, Google, Meta. These single-tenant facilities have enormous scale economics." },
				{ heading: "The Global Footprint", content: "Digital Realty operates data centers across North America, Europe, Africa, and Asia. Their global presence lets them serve multinational enterprises with consistent standards globally." },
				{ heading: "Why It Matters", content: "AI compute requirements are driving unprecedented data center construction. Digital Realty's hyperscale campuses are being signed under long-term leases before construction is complete — demand is extraordinary." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "75.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the hyperscale data center demand tailwind" },
			marketCap: { label: "Market Cap", value: "$55B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large REIT benefiting from AI infrastructure investment wave" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "accelerating growth from hyperscale and AI demand" },
			profitMargin: { label: "Profit Margin", value: "20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from long-term data center leases" },
			beta: { label: "Beta", value: "0.92", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate beta — data center demand is strong but rising rates affect REITs" },
			dividendYield: { label: "Dividend Yield", value: "3.0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the digital infrastructure platform" },
		},
	},
	{
		id: "wbd",
		ticker: "WBD",
		name: "Warner Bros. Discovery",
		bio: "DC, CNN, HBO, and the most complicated media merger in Hollywood history",
		heroImage: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=600&fit=crop",
		personalityDescription: "The media giant trying to be both streaming and linear TV while paying off an enormous debt",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 52, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 75, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Warner Bros. Discovery Is TV's Most Dramatic Story",
			sections: [
				{ heading: "The Discovery-WarnerMedia Merger", content: "AT&T bought WarnerMedia for $85 billion then spun it off to merge with Discovery. The resulting entity has DC comics, HBO, CNN, Warner Bros., HGTV, TLC — and $40 billion in debt." },
				{ heading: "The Max Streaming", content: "HBO Max rebranded to Max and has genuine quality programming. HBO's prestige reputation is real. But competing with Netflix while servicing massive debt while linear TV declines simultaneously is extremely difficult." },
				{ heading: "Why It Matters", content: "Warner Bros. Discovery owns some of the most valuable media intellectual property in the world — Batman, Superman, Harry Potter, Looney Tunes, Friends, Game of Thrones. The question is execution." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "deeply cheap — but debt and execution risk explain the discount" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large media company at a significant discount to asset value" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "stagnant growth during the transformation period" },
			profitMargin: { label: "Profit Margin", value: "-5%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "negative margins from debt service and restructuring charges" },
			beta: { label: "Beta", value: "1.55", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — media is somewhat cyclical with ad spend" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — every dollar goes to debt reduction" },
		},
	},
	{
		id: "mgm",
		ticker: "MGM",
		name: "MGM Resorts International",
		bio: "Las Vegas hotels, Bellagio, and the BetMGM sports betting app",
		heroImage: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=600&fit=crop",
		personalityDescription: "The Vegas icon navigating the collision of brick-and-mortar casinos and digital betting",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 48, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why MGM Is the Vegas Brand Going Digital",
			sections: [
				{ heading: "The Vegas Portfolio", content: "MGM owns some of the most iconic Las Vegas properties — Bellagio, MGM Grand, Mandalay Bay, Vdara, ARIA. Their real estate on the Strip is irreplaceable and increasingly valuable." },
				{ heading: "The BetMGM Bet", content: "BetMGM is one of the top sports betting apps in the US. The combination of brand recognition from MGM's casino operation and the fast-growing sports betting market is their digital strategy." },
				{ heading: "Why It Matters", content: "MGM sold most of their Las Vegas real estate to VICI Properties for cash and leases it back — monetizing the assets while keeping the operations. The asset-light hotel management model is their future." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "24.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the Vegas brand with digital upside" },
			marketCap: { label: "Market Cap", value: "$12B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size gaming at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "12%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from international and sports betting" },
			profitMargin: { label: "Profit Margin", value: "8%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins from the asset-light transformation" },
			beta: { label: "Beta", value: "2.05", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — gaming is economically sensitive and leisure-driven" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — investing in BetMGM and international" },
		},
	},
	{
		id: "czr",
		ticker: "CZR",
		name: "Caesars Entertainment",
		bio: "the largest US casino company with the biggest loyalty rewards program",
		heroImage: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=600&fit=crop",
		personalityDescription: "The Vegas-to-sports-betting machine that owns rewards points for 65 million members",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 58, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Caesars Loyalty Is Their Digital Weapon",
			sections: [
				{ heading: "The Caesars Rewards Network", content: "Caesars Rewards has 65 million members across Harrah's, Caesars, Planet Hollywood, Paris, Horseshoe, and more. That loyalty network creates cross-marketing synergies no digital startup can replicate." },
				{ heading: "The Caesars Sportsbook", content: "The Eldorado-Caesars merger came with massive debt but also with a digital sports betting platform. Caesars has spent aggressively on marketing their sportsbook — sometimes controversially." },
				{ heading: "Why It Matters", content: "Caesars carries enormous debt from the Eldorado merger. The question is whether their gaming properties, loyalty network, and sports betting operation generate enough cash to service it comfortably." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — debt and execution risk create the discount" },
			marketCap: { label: "Market Cap", value: "$12B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large gaming company compressed by leverage concerns" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth during the debt paydown period" },
			profitMargin: { label: "Profit Margin", value: "5%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin margins from interest expense burden" },
			beta: { label: "Beta", value: "2.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very high beta — gaming is leisure and economically sensitive" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — focused on deleveraging" },
		},
	},
	{
		id: "ea",
		ticker: "EA",
		name: "Electronic Arts",
		bio: "FIFA, Madden, Battlefield — the game publisher that controls the stadium",
		heroImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop",
		personalityDescription: "The sports and shooter game publisher that owns the licenses to games everyone plays",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 38, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why EA's Sports Licenses Are Their Moat",
			sections: [
				{ heading: "The Sports Licenses", content: "EA has exclusive licensing deals with the NFL (Madden), FIFA partners globally (FC), PGA Tour, and more. These exclusive licenses mean competitors literally can't make the same games." },
				{ heading: "The Live Service Model", content: "EA has transitioned from selling boxed games to live service — ongoing updates, microtransactions, and season passes that generate revenue long after the initial purchase." },
				{ heading: "Why It Matters", content: "EA lost the FIFA license but replaced it with EA Sports FC — maintaining the gameplay and most of the value while retaining more economics. The transition from FIFA to FC was smoother than most expected." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "20.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the sports game license machine" },
			marketCap: { label: "Market Cap", value: "$38B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large game publisher at a fair price" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth as live services mature" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent margins from the live service transition" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — gaming is relatively defensive entertainment spending" },
			dividendYield: { label: "Dividend Yield", value: "0.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — they prefer buybacks" },
		},
	},
	{
		id: "ttwo",
		ticker: "TTWO",
		name: "Take-Two Interactive",
		bio: "Grand Theft Auto, NBA 2K, and the most anticipated sequel in gaming history",
		heroImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop",
		personalityDescription: "The video game publisher sitting on one of the most valuable sequels ever made",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 52, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 82, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Take-Two Has the Most Anticipated Game in History",
			sections: [
				{ heading: "The GTA Franchise", content: "Grand Theft Auto 5 was released in 2013 and has sold 195+ million copies across three console generations. GTA VI is expected to be the most anticipated and possibly highest-selling game ever made." },
				{ heading: "The 2K Sports", content: "NBA 2K is the dominant basketball simulation game with no serious competition. Combined with WWE 2K and other sports titles, Take-Two has deep genre presence across key sports categories." },
				{ heading: "Why It Matters", content: "GTA VI's launch will be one of the biggest entertainment events ever — not just gaming. The franchise's cultural impact and microtransaction revenue from GTA Online demonstrate what's possible." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive relative to current earnings but GTA VI changes everything" },
			marketCap: { label: "Market Cap", value: "$22B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size gaming at premium pre-release valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "2%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth ahead of GTA VI — then potential explosion" },
			profitMargin: { label: "Profit Margin", value: "-8%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "losses from game development investment" },
			beta: { label: "Beta", value: "1.68", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — gaming is defensive but development is lumpy" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — investing in the GTA VI release" },
		},
	},
	{
		id: "ttd",
		ticker: "TTD",
		name: "The Trade Desk",
		bio: "the independent ad-buying platform that makes digital advertising actually work",
		heroImage: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=600&fit=crop",
		personalityDescription: "The programmatic advertising infrastructure that media agencies can't live without",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 75, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why The Trade Desk Is Advertising's Neutral Platform",
			sections: [
				{ heading: "The Independence", content: "Unlike Google and Amazon who compete with advertisers while running their ad platforms, The Trade Desk only runs the buy side. Their independence is their moat — advertisers trust them precisely because they don't compete." },
				{ heading: "The CTV Revolution", content: "Connected TV advertising — streaming platforms, smart TVs — is the fastest-growing segment. The Trade Desk is the largest independent CTV platform, sitting at the center of the streaming ad market." },
				{ heading: "Why It Matters", content: "As advertising dollars move from linear TV and print to digital and streaming, The Trade Desk's platform processes more of that spending. They benefit from every dollar that shifts to digital." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "58.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the programmatic advertising leader" },
			marketCap: { label: "Market Cap", value: "$52B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large and still growing significantly" },
			revenueGrowth: { label: "Revenue Growth", value: "22%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent high-teens to 20%+ revenue growth" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from the software platform" },
			beta: { label: "Beta", value: "1.55", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "growth stock volatility — premium multiple sensitive" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — growth phase" },
		},
	},
	{
		id: "roku",
		ticker: "ROKU",
		name: "Roku",
		bio: "the streaming remote that turned into an advertising platform",
		heroImage: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop",
		personalityDescription: "The humble TV device that became the gatekeeper of the streaming revolution",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Roku Is Streaming's Ad-Supported Alternative",
			sections: [
				{ heading: "The OS Play", content: "Roku's operating system runs millions of smart TVs and streaming devices. As the default interface for streaming, they control the discovery experience — which streaming service viewers find and choose." },
				{ heading: "The Roku Channel", content: "Roku's own free streaming channel, supported by ads, gives them a direct media business alongside the platform. They get a cut of every ad dollar from every streaming service on the Roku platform." },
				{ heading: "Why It Matters", content: "Most premium streaming services are losing subscribers as prices rise. Roku benefits from the shift to cheaper ad-supported tiers — more ad inventory flowing through their platform means more revenue." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "expensive on earnings but growing rapidly on revenue" },
			marketCap: { label: "Market Cap", value: "$18B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size platform at a premium multiple" },
			revenueGrowth: { label: "Revenue Growth", value: "15%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "accelerating from streaming platform growth and ad market recovery" },
			profitMargin: { label: "Profit Margin", value: "-3%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "near breakeven with improving unit economics" },
			beta: { label: "Beta", value: "2.05", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very high beta — streaming sentiment drives the stock" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — growth phase" },
		},
	},
	{
		id: "mstr",
		ticker: "MSTR",
		name: "Strategy (MicroStrategy)",
		bio: "the enterprise software company that became the world's largest corporate Bitcoin holder",
		heroImage: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&h=600&fit=crop",
		personalityDescription: "The corporate Bitcoin accumulator who went all-in on digital gold and hasn't looked back",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 90, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 95, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why MicroStrategy Became Bitcoin's Corporate Pioneer",
			sections: [
				{ heading: "The Bitcoin Treasury", content: "CEO Michael Saylor adopted Bitcoin as MicroStrategy's primary treasury reserve asset in 2020. They've continued buying aggressively, owning over 250,000 BTC — more than any other public company by far." },
				{ heading: "The Leverage Play", content: "MicroStrategy finances Bitcoin purchases with convertible bonds, creating leveraged exposure to Bitcoin through a publicly traded vehicle accessible to investors who can't directly hold crypto." },
				{ heading: "Why It Matters", content: "MicroStrategy's stock has become a leveraged proxy for Bitcoin — rising more than Bitcoin in bull markets and falling more in bear markets. It's the highest-volatility Bitcoin play available on traditional exchanges." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "extremely speculative — pure Bitcoin leverage play" },
			marketCap: { label: "Market Cap", value: "$75B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive implied Bitcoin premium over NAV" },
			revenueGrowth: { label: "Revenue Growth", value: "N/A", explanation: "How much more money the company is making compared to last year", culturalTranslation: "revenue is the original software business — irrelevant now" },
			profitMargin: { label: "Profit Margin", value: "N/A", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "Bitcoin prices determine everything" },
			beta: { label: "Beta", value: "3.52", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "enormous beta — highest volatility of any major company" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — buying Bitcoin with any available capital" },
		},
	},
	{
		id: "mara",
		ticker: "MARA",
		name: "MARA Holdings",
		bio: "the Bitcoin mining company that digs digital gold with electricity and chips",
		heroImage: "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&h=600&fit=crop",
		personalityDescription: "The industrial-scale Bitcoin miner burning electricity to secure the blockchain",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 65, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 78, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 85, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Bitcoin Mining Is America's Strangest Power Business",
			sections: [
				{ heading: "The Mining Business", content: "MARA mines Bitcoin by running massive facilities filled with specialized chips solving computational puzzles. The reward is newly minted Bitcoin — a function of their hash rate and global competition." },
				{ heading: "The Hash Rate Race", content: "Bitcoin mining is a perpetual arms race — as miners add computing power, difficulty increases, requiring more chips and electricity. Scale and low-cost power are the only sustainable advantages." },
				{ heading: "Why It Matters", content: "Bitcoin halving events cut mining rewards in half roughly every 4 years. Miners must continuously expand capacity and reduce costs just to maintain profitability through each halving cycle." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "deeply speculative — pure Bitcoin mining exposure" },
			marketCap: { label: "Market Cap", value: "$6B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size miner at a premium to Bitcoin production value" },
			revenueGrowth: { label: "Revenue Growth", value: "N/A", explanation: "How much more money the company is making compared to last year", culturalTranslation: "Bitcoin price and hash rate determine all" },
			profitMargin: { label: "Profit Margin", value: "-15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "variable margins based entirely on Bitcoin price vs costs" },
			beta: { label: "Beta", value: "3.22", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "extreme beta — mining is leveraged to Bitcoin prices" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — reinvesting in mining capacity" },
		},
	},
	{
		id: "riot",
		ticker: "RIOT",
		name: "Riot Platforms",
		bio: "the Bitcoin miner competing with MARA in the Texas power grid",
		heroImage: "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&h=600&fit=crop",
		personalityDescription: "The Texas-based Bitcoin miner running gigawatts of computation in the heat",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 60, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 75, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 82, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Riot Platforms Is Bitcoin Mining's Second Major Player",
			sections: [
				{ heading: "The Texas Play", content: "Riot operates massive Bitcoin mining facilities in Texas, taking advantage of cheap electricity from the deregulated Texas grid. Their large scale and fixed power costs give operational leverage." },
				{ heading: "The Power Strategy", content: "Riot has negotiated power purchase agreements and demand response programs that actually pay them to curtail mining during peak grid demand — creating an electricity revenue stream alongside Bitcoin mining." },
				{ heading: "Why It Matters", content: "Riot's ability to earn money from power management during non-mining periods is a unique hedge. When Bitcoin prices are low, they can still generate electricity revenue — reducing the risk of pure mining operations." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "speculative — Bitcoin mining leverage" },
			marketCap: { label: "Market Cap", value: "$4B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small miner at premium to underlying assets" },
			revenueGrowth: { label: "Revenue Growth", value: "N/A", explanation: "How much more money the company is making compared to last year", culturalTranslation: "Bitcoin price determines revenue entirely" },
			profitMargin: { label: "Profit Margin", value: "-12%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "variable margins from Bitcoin price vs power costs" },
			beta: { label: "Beta", value: "3.05", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "extreme beta — mining amplifies Bitcoin moves" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — reinvesting in hash rate" },
		},
	},
	{
		id: "clsk",
		ticker: "CLSK",
		name: "CleanSpark",
		bio: "the clean energy Bitcoin miner focused on sustainable proof-of-work",
		heroImage: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop",
		personalityDescription: "The ESG Bitcoin miner trying to make proof-of-work guilt-free",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 58, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 70, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 80, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why CleanSpark Is Mining's Environmental Answer",
			sections: [
				{ heading: "The Clean Energy Claim", content: "CleanSpark sources a high percentage of its electricity from renewable or low-carbon sources. They position themselves as the sustainable mining option for ESG-conscious institutional investors." },
				{ heading: "The Expansion Race", content: "CleanSpark has been aggressively expanding its hash rate through new facility openings. In the post-halving environment, scale is survival — and CleanSpark has been growing faster than most peers." },
				{ heading: "Why It Matters", content: "Institutional investors increasingly constrained by ESG mandates have limited options for Bitcoin exposure. CleanSpark's clean energy positioning aims to capture that demand." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "speculative — small cap mining leverage to Bitcoin" },
			marketCap: { label: "Market Cap", value: "$2.5B", explanation: "The total value of all the company's shares combined", culturalTranslation: "small miner at growth premium" },
			revenueGrowth: { label: "Revenue Growth", value: "N/A", explanation: "How much more money the company is making compared to last year", culturalTranslation: "Bitcoin price driven revenue" },
			profitMargin: { label: "Profit Margin", value: "-18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "negative — building toward scale profitability" },
			beta: { label: "Beta", value: "2.95", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very high beta — small cap Bitcoin miner" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — all capital to growth" },
		},
	},
	{
		id: "mdlz",
		ticker: "MDLZ",
		name: "Mondelez International",
		bio: "Oreo, Cadbury, Toblerone — the snack company the whole world eats",
		heroImage: "https://images.unsplash.com/photo-1606312619070-d48b0c7a92d3?w=800&h=600&fit=crop",
		personalityDescription: "The global snack empire running on chocolate and nostalgia",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Mondelez Owns the World's Snack Habits",
			sections: [
				{ heading: "The Brand Portfolio", content: "Oreo, Cadbury, Toblerone, Ritz, Triscuit, Wheat Thins, Sour Patch Kids, Halls — Mondelez owns brands that are cultural institutions across generations and geographies." },
				{ heading: "The Emerging Market Growth", content: "Mondelez generates a significant portion of revenue in emerging markets where the middle class is growing and Western snack brands carry aspirational appeal. Chocolate and cookies are universal." },
				{ heading: "Why It Matters", content: "Snack brands with genuine consumer loyalty are among the most durable businesses in the world. People don't stop eating Oreos in recessions — they might eat more of them as an affordable indulgence." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the global snack brand portfolio" },
			marketCap: { label: "Market Cap", value: "$92B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive consumer staples company at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady low-to-mid single digit grower" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the brand power" },
			beta: { label: "Beta", value: "0.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — snack staples are recession-proof" },
			dividendYield: { label: "Dividend Yield", value: "2.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the global snack machine" },
		},
	},
	{
		id: "hsy",
		ticker: "HSY",
		name: "Hershey Company",
		bio: "America's favorite chocolate bar since 1900 and counting",
		heroImage: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&h=600&fit=crop",
		personalityDescription: "The hometown chocolate brand that makes the candy your dentist hates",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 72, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Hershey Has Sold Chocolate for 125 Years",
			sections: [
				{ heading: "The American Chocolate Standard", content: "Hershey's Kisses, Reese's, Kit Kat (US), Jolly Rancher — the brands that define American candy. Hershey dominates US chocolate in a way that global giants like Nestle don't match domestically." },
				{ heading: "The Cocoa Challenge", content: "Cocoa prices hit record highs in 2024 due to West African weather disruptions. Hershey raised prices significantly, hurting volume. The input cost cycle will eventually normalize." },
				{ heading: "Why It Matters", content: "Hershey's 125+ year brand heritage creates consumer loyalty that survives price increases. People switched from Hershey's temporarily due to prices but most come back — brand loyalty has limits but Hershey keeps finding them." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — cocoa price pressure has compressed the valuation" },
			marketCap: { label: "Market Cap", value: "$38B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large consumer brand at a discount from input cost concerns" },
			revenueGrowth: { label: "Revenue Growth", value: "2%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slowing from the cocoa cost headwind" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins despite cocoa price pressure" },
			beta: { label: "Beta", value: "0.62", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — candy is a consumer staple" },
			dividendYield: { label: "Dividend Yield", value: "3.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield for a consumer staples brand" },
		},
	},
	{
		id: "gis",
		ticker: "GIS",
		name: "General Mills",
		bio: "Cheerios, Häagen-Dazs, Betty Crocker, Nature Valley — the breakfast empire",
		heroImage: "https://images.unsplash.com/photo-1484980859524-a41f13a8c48a?w=800&h=600&fit=crop",
		personalityDescription: "The pantry staple company whose brands have been in every American kitchen for generations",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why General Mills Owns American Breakfast",
			sections: [
				{ heading: "The Cereal Heritage", content: "General Mills invented many of America's most iconic breakfast cereals — Cheerios, Lucky Charms, Cinnamon Toast Crunch, Wheaties. These brands span 70+ years and multiple generations." },
				{ heading: "The Pet Food Growth", content: "General Mills entered pet food through the Blue Buffalo acquisition. Pet food is the fastest-growing food category and Blue Buffalo's premium positioning aligns with premiumization trends." },
				{ heading: "Why It Matters", content: "General Mills is navigating the shift away from processed food — not ideal for their legacy brands — while growing premium and pet food. The transition's success determines long-term growth." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "16.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap for a diversified consumer staples portfolio" },
			marketCap: { label: "Market Cap", value: "$35B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large consumer staples at a modest valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "2%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow growth as some legacy categories face headwinds" },
			profitMargin: { label: "Profit Margin", value: "14%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the branded food model" },
			beta: { label: "Beta", value: "0.52", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — people eat cereal in any economy" },
			dividendYield: { label: "Dividend Yield", value: "3.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield from the pantry staples machine" },
		},
	},
	{
		id: "kr",
		ticker: "KR",
		name: "Kroger",
		bio: "America's largest grocery chain that rejected a Albertsons merger",
		heroImage: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
		personalityDescription: "The hometown grocery store feeding America since 1883",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 48, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Kroger Is Grocers' Most Reliable Compounder",
			sections: [
				{ heading: "The Fuel Rewards", content: "Kroger's fuel rewards program — earning discounts at Kroger gas stations by buying groceries — is one of retail's most effective loyalty mechanisms. Customers optimize grocery spending for fuel discounts." },
				{ heading: "The Private Label", content: "Kroger's private label brands (Simple Truth, Kroger) generate higher margins than national brands and have been winning share as consumers seek value. Private label is the grocery moat." },
				{ heading: "Why It Matters", content: "Kroger's attempted merger with Albertsons was blocked by the FTC. They remain the largest traditional grocery chain, facing competition from Walmart, Amazon Fresh, and Aldi — a challenging competitive position." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "16.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap for the grocery leader — but thin margins are permanent" },
			marketCap: { label: "Market Cap", value: "$38B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large grocer at a modest valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow and steady — grocery is mature" },
			profitMargin: { label: "Profit Margin", value: "2%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "thin margins are unavoidable in grocery" },
			beta: { label: "Beta", value: "0.58", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — food is essential" },
			dividendYield: { label: "Dividend Yield", value: "2.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the grocery cash machine" },
		},
	},
	{
		id: "stz",
		ticker: "STZ",
		name: "Constellation Brands",
		bio: "Corona, Modelo, Robert Mondavi — the beer and wine empire behind America's favorite imports",
		heroImage: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=600&fit=crop",
		personalityDescription: "The alcoholic beverages company that turned Mexican beer into America's #1 brand",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 80, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Constellation Brands Owns America's Top Beer",
			sections: [
				{ heading: "The Modelo Supremacy", content: "Constellation Brands holds the exclusive US rights to Modelo, Corona, and Pacifico beers. Modelo Especial became the #1 selling beer in the US in 2023 — a seismic moment in American beer history." },
				{ heading: "The Wine Pivot", content: "Constellation has been divesting mainstream wine brands and investing in premium wines. The wine business is smaller than beer but the premiumization strategy improves the margin profile." },
				{ heading: "Why It Matters", content: "Mexican beer brands have outperformed domestic American beer dramatically as consumer preferences shift toward flavorful imports. Constellation owns the exclusive rights to that trend in the US permanently." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the Mexican beer monopoly in the US" },
			marketCap: { label: "Market Cap", value: "$45B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large beverage company at a fair price" },
			revenueGrowth: { label: "Revenue Growth", value: "5%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from the Modelo and Corona brands" },
			profitMargin: { label: "Profit Margin", value: "25%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "strong margins from the high-priced import position" },
			beta: { label: "Beta", value: "0.82", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — beer and wine are consumer staples" },
			dividendYield: { label: "Dividend Yield", value: "1.6%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield from the beverage brand portfolio" },
		},
	},
	{
		id: "cl",
		ticker: "CL",
		name: "Colgate-Palmolive",
		bio: "toothpaste, dish soap, and personal care for 5 billion people globally",
		heroImage: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&h=600&fit=crop",
		personalityDescription: "The hygiene essential that's been in bathrooms and kitchens worldwide since 1873",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 12, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 45, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Colgate Brushes Teeth on Every Continent",
			sections: [
				{ heading: "The Toothpaste Dominance", content: "Colgate owns the world's leading toothpaste brand — particularly strong in emerging markets where Colgate is the first premium oral care brand for rising middle classes." },
				{ heading: "The Emerging Market Exposure", content: "More than half of Colgate's sales come from emerging markets. As income rises globally, people trade up to branded personal care products — and Colgate is often the first brand they choose." },
				{ heading: "Why It Matters", content: "Oral care is recession-proof. People don't stop brushing their teeth in downturns. Colgate's defensive characteristics make it a haven in volatile markets." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "30.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the global oral care leader" },
			marketCap: { label: "Market Cap", value: "$65B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large consumer staples at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "6%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady low-to-mid single digit grower" },
			profitMargin: { label: "Profit Margin", value: "20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the essential personal care brands" },
			beta: { label: "Beta", value: "0.58", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — toothpaste is recession-proof" },
			dividendYield: { label: "Dividend Yield", value: "2.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the global hygiene brand machine" },
		},
	},
	{
		id: "kmb",
		ticker: "KMB",
		name: "Kimberly-Clark",
		bio: "Kleenex, Huggies, Cottonelle — the tissue and personal care giant",
		heroImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=600&fit=crop",
		personalityDescription: "The bathroom staple company whose products you never think about and always need",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 12, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 42, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Kimberly-Clark Is the Most Essential Boring Company",
			sections: [
				{ heading: "The Tissue Dominance", content: "Kleenex invented the facial tissue. Huggies is one of the world's top diaper brands. Cottonelle and Scott are bathroom staple brands. Kimberly-Clark has the most essential personal care brands." },
				{ heading: "The Pricing Power", content: "Commodity costs (pulp, paper) create input volatility, but Kimberly-Clark's brand power allows them to pass through price increases. Kleenex buyers are remarkably loyal to the brand." },
				{ heading: "Why It Matters", content: "Kimberly-Clark's products are truly essential — diapers, tissues, paper towels, hygiene products. Demand is non-discretionary across economic cycles." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "22.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the essential personal care staples" },
			marketCap: { label: "Market Cap", value: "$45B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large consumer staples at a fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "3%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "slow but steady compounder" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the branded tissue and care model" },
			beta: { label: "Beta", value: "0.58", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "very low beta — the most defensive consumer names" },
			dividendYield: { label: "Dividend Yield", value: "3.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "above-average yield from the staples machine" },
		},
	},
	{
		id: "mnst",
		ticker: "MNST",
		name: "Monster Beverage",
		bio: "the energy drink company that made Red Bull sweat with fluorescent cans",
		heroImage: "https://images.unsplash.com/photo-1565211600-35f90af2c2cc?w=800&h=600&fit=crop",
		personalityDescription: "The energy drink creator who found the exact marketing aesthetic for teenage boys worldwide",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 32, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Monster Has the Best Distribution Deal in Beverages",
			sections: [
				{ heading: "The Coca-Cola Deal", content: "Monster handed over their distribution to Coca-Cola's global distribution network in exchange for equity investment. That network reaches billions of consumers — a moat no startup can replicate." },
				{ heading: "The Brand Portfolio", content: "Monster Energy, Reign, NOS, Full Throttle — Monster has built a portfolio of energy brands that serve different segments of the market from mainstream to fitness-focused." },
				{ heading: "Why It Matters", content: "Energy drinks are the fastest-growing beverage category globally. Monster's Coca-Cola distribution partnership gives them unprecedented access to markets where they previously had limited reach." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "30.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the energy drink growth and distribution moat" },
			marketCap: { label: "Market Cap", value: "$48B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large at a premium but the distribution deal justifies it" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent double-digit grower" },
			profitMargin: { label: "Profit Margin", value: "25%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "outstanding margins for a beverage company" },
			beta: { label: "Beta", value: "0.78", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — discretionary but also a daily habit for many" },
			dividendYield: { label: "Dividend Yield", value: "0.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield — they prefer buybacks" },
		},
	},
	{
		id: "nem",
		ticker: "NEM",
		name: "Newmont Corporation",
		bio: "the world's largest gold miner that benefits every time investors get scared",
		heroImage: "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=800&h=600&fit=crop",
		personalityDescription: "The gold mine owner who thrives when everyone else is panicking",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 28, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 55, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Newmont Is Gold's Most Reliable Miner",
			sections: [
				{ heading: "The Gold Hedge", content: "Newmont owns mines across North America, South America, Africa, and Australia — diversified gold production that's the benchmark for institutional gold exposure." },
				{ heading: "The Newcrest Acquisition", content: "Newmont acquired Newcrest Mining in 2023, creating the world's largest gold miner by production. The scale gives them cost advantages and geographic diversification no other miner can match." },
				{ heading: "Why It Matters", content: "Gold performs best when real interest rates are negative, inflation is high, or geopolitical stress is elevated. Newmont is the most direct equity exposure to gold price movements." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "45.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the world's largest gold miner" },
			marketCap: { label: "Market Cap", value: "$42B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large and still consolidating the gold mining industry" },
			revenueGrowth: { label: "Revenue Growth", value: "10%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from the Newcrest acquisition" },
			profitMargin: { label: "Profit Margin", value: "15%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "decent mining margins at current gold prices" },
			beta: { label: "Beta", value: "0.58", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — gold is counter-cyclical to equities" },
			dividendYield: { label: "Dividend Yield", value: "2.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the gold mining machine" },
		},
	},
	{
		id: "fcx",
		ticker: "FCX",
		name: "Freeport-McMoRan",
		bio: "the copper miner powering the electric vehicle and clean energy revolution",
		heroImage: "https://images.unsplash.com/photo-1565177898782-e32a5b0cbbf8?w=800&h=600&fit=crop",
		personalityDescription: "The copper empire who discovered their commodity was the backbone of decarbonization",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 78, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 35, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Freeport's Copper Is the Green Energy Metal",
			sections: [
				{ heading: "The Copper Demand", content: "Electric vehicles use 4x more copper than internal combustion vehicles. Every wind turbine, solar panel, and EV charger requires copper wiring. Freeport owns the world's largest copper mines." },
				{ heading: "The Grasberg Mine", content: "Freeport's Grasberg mine in Indonesia is one of the world's largest gold and copper deposits. It's an irreplaceable asset that produces cash at any reasonable copper price." },
				{ heading: "Why It Matters", content: "Copper supply growth is constrained while demand for the energy transition is accelerating. Freeport's positioning at the intersection of the supply constraint and the demand surge is extraordinary." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "24.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the green energy copper super-cycle exposure" },
			marketCap: { label: "Market Cap", value: "$55B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large miner at fair value given the copper demand outlook" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "growing from both volume and price tailwinds" },
			profitMargin: { label: "Profit Margin", value: "18%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid mining margins at current copper prices" },
			beta: { label: "Beta", value: "1.55", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — commodity prices drive the stock" },
			dividendYield: { label: "Dividend Yield", value: "1.8%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield from the copper mining machine" },
		},
	},
	{
		id: "alb",
		ticker: "ALB",
		name: "Albemarle Corporation",
		bio: "the lithium miner that everyone discovered when EVs took off",
		heroImage: "https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=800&h=600&fit=crop",
		personalityDescription: "The battery ingredient supplier who went from obscure chemical company to EV critical infrastructure",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 68, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 55, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 72, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Albemarle Mines EV Batteries' Core Ingredient",
			sections: [
				{ heading: "The Lithium Position", content: "Albemarle is the world's largest lithium producer, mining from brine operations in Chile and hard rock deposits in Australia. Lithium is in every rechargeable battery powering EVs and electronics." },
				{ heading: "The Price Cycle", content: "Lithium prices went from under $10,000 per ton to over $80,000 per ton during the EV boom — then crashed back below $15,000 as supply flooded the market. Albemarle's earnings followed every swing." },
				{ heading: "Why It Matters", content: "Long-term EV adoption is not in question — the timeline is. Albemarle's costs are low enough to be profitable across most price scenarios. When the cycle turns, they'll benefit enormously." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "N/A", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "cheap — the lithium price cycle has crushed the stock" },
			marketCap: { label: "Market Cap", value: "$12B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size miner compressed by lithium oversupply" },
			revenueGrowth: { label: "Revenue Growth", value: "-20%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "contracting revenue from the lithium price collapse" },
			profitMargin: { label: "Profit Margin", value: "10%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "margins under pressure from commodity price decline" },
			beta: { label: "Beta", value: "1.72", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "high beta — lithium prices drive everything" },
			dividendYield: { label: "Dividend Yield", value: "1.5%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "modest yield while waiting for the lithium price recovery" },
		},
	},
	{
		id: "apd",
		ticker: "APD",
		name: "Air Products and Chemicals",
		bio: "the industrial gas company quietly powering factories, hospitals, and now hydrogen",
		heroImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=600&fit=crop",
		personalityDescription: "The industrial gas landlord who owns the pipelines oxygen and hydrogen flow through",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 75, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Air Products Is Quietly Essential",
			sections: [
				{ heading: "The Industrial Gases", content: "Air Products makes industrial gases — oxygen, nitrogen, hydrogen, argon — used in manufacturing, healthcare, electronics, and energy. Customers literally can't operate without continuous gas supply." },
				{ heading: "The Hydrogen Bet", content: "Air Products is making the largest investment in hydrogen infrastructure of any company in the world. Their vision is to be the global leader in clean hydrogen for transportation and industry." },
				{ heading: "Why It Matters", content: "Hydrogen could be the clean fuel for heavy transport, steel production, and chemical manufacturing. Air Products is betting billions that the hydrogen economy materializes — and they're positioning early." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "24.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable for the industrial gas and hydrogen infrastructure investment" },
			marketCap: { label: "Market Cap", value: "$42B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large industrial gas at fair value" },
			revenueGrowth: { label: "Revenue Growth", value: "4%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "steady growth from industrial gases plus hydrogen optionality" },
			profitMargin: { label: "Profit Margin", value: "20%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the essential industrial gas model" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — industrial but contract-driven stability" },
			dividendYield: { label: "Dividend Yield", value: "3.2%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "solid yield from the industrial gas compounder" },
		},
	},
	{
		id: "lin",
		ticker: "LIN",
		name: "Linde",
		bio: "the world's largest industrial gas company that makes everything else possible",
		heroImage: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop",
		personalityDescription: "The essential ingredient company whose products touch virtually every industrial process",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 12, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 52, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Linde Is Industry's Silent Essential",
			sections: [
				{ heading: "The Scale", content: "Linde is the world's largest producer of industrial gases by revenue — oxygen, nitrogen, hydrogen, argon, and specialty gases for every industrial application globally." },
				{ heading: "The Long-Term Contracts", content: "Industrial gas customers typically sign 15-20 year supply agreements with on-site gas plants built by Linde specifically for their facility. The switching cost is the plant itself — customers never leave." },
				{ heading: "Why It Matters", content: "Linde's business model is the ultimate annuity — long-term contracts, dedicated plants, captive customers. The hydrogen transition adds a new growth vector to an already exceptional business." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "32.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the exceptional business quality and contract structure" },
			marketCap: { label: "Market Cap", value: "$195B", explanation: "The total value of all the company's shares combined", culturalTranslation: "massive — one of the most valuable industrial companies in the world" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent mid-to-high single digit grower" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "outstanding margins from long-term captive contracts" },
			beta: { label: "Beta", value: "0.88", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — industrial gas is essential and contracted" },
			dividendYield: { label: "Dividend Yield", value: "1.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "small yield from a premium quality compounder" },
		},
	},
	{
		id: "wday",
		ticker: "WDAY",
		name: "Workday",
		bio: "the cloud HR and finance software that Fortune 500 companies run their people operations on",
		heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
		personalityDescription: "The HR software provider that every large company's HR department depends on",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 82, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 22, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 68, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Workday Is HR Software's Dominant Platform",
			sections: [
				{ heading: "The Enterprise Lock-In", content: "Workday runs HR, payroll, and financial management for thousands of large enterprises globally. Once a company deploys Workday, replacing it is a multi-year, nine-figure undertaking. Nobody leaves." },
				{ heading: "The AI Layer", content: "Workday has been embedding AI features across their platform — intelligent hiring, automated expense management, skills-based talent matching. The AI wrapper increases the value proposition of the existing platform." },
				{ heading: "Why It Matters", content: "Human capital management software is critical infrastructure for any large organization. Workday's cloud-native architecture means they host the data — giving them insights and leverage no on-premise system could provide." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "45.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the enterprise HR software moat" },
			marketCap: { label: "Market Cap", value: "$68B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large and growing consistently" },
			revenueGrowth: { label: "Revenue Growth", value: "17%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent mid-to-high teen revenue grower" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "improving margins as the business matures" },
			beta: { label: "Beta", value: "1.32", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — enterprise software is sticky but not immune" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — growing through product expansion and M&A" },
		},
	},
	{
		id: "veev",
		ticker: "VEEV",
		name: "Veeva Systems",
		bio: "the life sciences software platform that drugmakers can't operate without",
		heroImage: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&h=600&fit=crop",
		personalityDescription: "The pharma industry's operating system — every clinical trial and drug submission flows through Veeva",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 85, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 18, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Veeva Is Pharma's Captive Software",
			sections: [
				{ heading: "The Life Sciences Niche", content: "Veeva exclusively serves pharmaceutical, biotech, and medical device companies. That industry focus means their software is purpose-built and deeply integrated into regulatory-compliant workflows." },
				{ heading: "The Commercial Cloud", content: "Veeva's commercial cloud manages how drug companies promote and sell to physicians — CRM, content management, regulatory submissions. These processes are highly regulated and Veeva is purpose-built for compliance." },
				{ heading: "Why It Matters", content: "Switching a pharmaceutical company from Veeva would require revalidating thousands of regulated workflows. The regulatory compliance embedding creates switching costs that are effectively permanent." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "42.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the life sciences software moat" },
			marketCap: { label: "Market Cap", value: "$35B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size but premium valuation for the niche dominance" },
			revenueGrowth: { label: "Revenue Growth", value: "15%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent double-digit grower" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "excellent margins from the specialized SaaS model" },
			beta: { label: "Beta", value: "0.98", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "low beta — pharma software is non-discretionary spending" },
			dividendYield: { label: "Dividend Yield", value: "0.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "minimal yield — growth-focused capital allocation" },
		},
	},
	{
		id: "docu",
		ticker: "DOCU",
		name: "DocuSign",
		bio: "the digital signature company that made wet ink signatures feel medieval",
		heroImage: "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&h=600&fit=crop",
		personalityDescription: "The e-signature platform that turned paper contracts into API calls",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 70, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 42, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why DocuSign Owns the Digital Signature Category",
			sections: [
				{ heading: "The Category Creation", content: "DocuSign didn't just sell e-signature software — they created the category. 'Docusign it' became a verb in business communication, which is the ultimate brand achievement." },
				{ heading: "The Intelligent Agreement", content: "DocuSign is expanding beyond signatures into contract lifecycle management — drafting, negotiation, storage, and analysis. The vision is owning the entire agreement workflow, not just the signature moment." },
				{ heading: "Why It Matters", content: "DocuSign grew explosively during COVID as businesses adopted remote work. Post-COVID normalization has been painful but the underlying category is sticky — businesses don't return to paper processes." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "28.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "reasonable after post-COVID normalization selloff" },
			marketCap: { label: "Market Cap", value: "$15B", explanation: "The total value of all the company's shares combined", culturalTranslation: "mid-size at a post-growth-peak valuation" },
			revenueGrowth: { label: "Revenue Growth", value: "8%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "decelerating but still growing" },
			profitMargin: { label: "Profit Margin", value: "22%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "solid margins from the SaaS model" },
			beta: { label: "Beta", value: "1.18", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "growth stock volatility — premium contracts" },
			dividendYield: { label: "Dividend Yield", value: "0%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "no dividend — investing in the intelligent agreement platform" },
		},
	},
	{
		id: "cdns",
		ticker: "CDNS",
		name: "Cadence Design Systems",
		bio: "the software that designs every semiconductor chip in existence",
		heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop",
		personalityDescription: "The invisible tool that every chip designer uses before a single transistor is manufactured",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 65, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Cadence Designs Every Chip Before It's Built",
			sections: [
				{ heading: "The EDA Duopoly", content: "Cadence and Synopsys effectively duopolize Electronic Design Automation software. Every chip designed at TSMC, Samsung, Intel, Nvidia, Apple, and AMD is designed using Cadence or Synopsys tools." },
				{ heading: "The AI Hardware Boom", content: "Every new AI chip — from Nvidia's GPUs to Apple's M chips to custom silicon at Google and Amazon — requires Cadence's EDA software. The AI hardware explosion directly drives Cadence's growth." },
				{ heading: "Why It Matters", content: "There is no path around Cadence's software for chip designers. The complexity of modern semiconductors requires their tools — no internal solution can replicate what decades of investment created." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "60.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the semiconductor design software monopoly" },
			marketCap: { label: "Market Cap", value: "$78B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large with room to grow as chip complexity increases" },
			revenueGrowth: { label: "Revenue Growth", value: "14%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "accelerating from the AI chip design boom" },
			profitMargin: { label: "Profit Margin", value: "32%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from the design automation monopoly" },
			beta: { label: "Beta", value: "1.28", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — chip cycles create some volatility" },
			dividendYield: { label: "Dividend Yield", value: "0.3%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "minimal yield — they prefer buybacks and R&D" },
		},
	},
	{
		id: "snps",
		ticker: "SNPS",
		name: "Synopsys",
		bio: "Cadence's partner in chip design domination and the other half of EDA",
		heroImage: "https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=800&h=600&fit=crop",
		personalityDescription: "The silicon brain trust that designs chips no human could design manually",
		vibes: [
			{ name: "Clout", emoji: "🏰", value: 88, color: "#00d9ff" },
			{ name: "Drama Level", emoji: "🎭", value: 15, color: "#ff006e" },
			{ name: "Internet Hype", emoji: "🔥", value: 62, color: "#ff9500" },
		],
		culturalContext: {
			title: "Why Synopsys Is Inseparable From Modern Chips",
			sections: [
				{ heading: "The EDA Partner", content: "Synopsys pairs with Cadence to form the duopoly of semiconductor design tools. Their specialties are slightly different but their market position is equally dominant and equally irreplaceable." },
				{ heading: "The Security Intelligence", content: "Synopsys has expanded into software security — testing code for vulnerabilities using the same meticulous analysis techniques applied to hardware design. The security business is growing fast." },
				{ heading: "Why It Matters", content: "Synopsys is in the process of acquiring Ansys — simulation software used across engineering disciplines. The combined company would be a dominant platform for digital simulation across industries." },
			],
		},
		financials: {
			peRatio: { label: "P/E Ratio", value: "50.5", explanation: "Price-to-Earnings ratio shows how much investors pay for each dollar of profit", culturalTranslation: "premium for the chip design software monopoly position" },
			marketCap: { label: "Market Cap", value: "$70B", explanation: "The total value of all the company's shares combined", culturalTranslation: "large and growing through EDA and security expansion" },
			revenueGrowth: { label: "Revenue Growth", value: "15%", explanation: "How much more money the company is making compared to last year", culturalTranslation: "consistent double-digit grower" },
			profitMargin: { label: "Profit Margin", value: "28%", explanation: "What percentage of each sale becomes actual profit", culturalTranslation: "exceptional margins from the design automation business" },
			beta: { label: "Beta", value: "1.25", explanation: "How much the stock price swings compared to the overall market", culturalTranslation: "moderate — chip industry exposure with software stability" },
			dividendYield: { label: "Dividend Yield", value: "0.4%", explanation: "The percentage of the stock price paid out as dividends each year", culturalTranslation: "minimal yield — investing aggressively in growth" },
		},
	},
// END AUTO-GENERATED
];
