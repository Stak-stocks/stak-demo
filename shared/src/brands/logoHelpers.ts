import type { BrandIdentity } from "./types";

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
	or: "loreal.com", lrlcy: "loreal.com", el: "esteelauder.com", elf: "elfcosmetics.com", ulta: "ulta.com",
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
	key: "keybank.com", rf: "regions.com", cfg: "citizensbank.com",
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
	mstr: "strategy.com", mara: "mara.com", riot: "riotplatforms.com", clsk: "cleanspark.com",
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
	// New additions
	ebay: "ebay.com", duol: "duolingo.com", app: "applovin.com",
	cvna: "carvana.com", bmbl: "bumble.com", bros: "dutchbros.com",
	wing: "wingstop.com", shak: "shakeshack.com", cart: "instacart.com",
	tm: "global.toyota", sony: "sony.com", bynd: "beyondmeat.com",
	wrby: "warbyparker.com", gme: "gamestop.com", amc: "amctheatres.com",
	nio: "nio.com", chwy: "chewy.com", para: "paramount.com",
	lcid: "lucidmotors.com", lyv: "livenationentertainment.com",
	cake: "thecheesecakefactory.com", txrh: "texasroadhouse.com", denn: "dennys.com",
	jack: "jackinthebox.com", pzza: "papajohns.com", blmn: "bloominbrands.com", eat: "brinker.com",
	rklb: "rocketlabusa.com", asts: "ast-science.com", celh: "celsius.com", wynn: "wynnresorts.com",
	acmr: "acmrcsh.com", lunr: "intuitivemachines.com", joby: "jobyaviation.com", achr: "archer.com",
	gsat: "globalstar.com", lvs: "lasvegassands.com", penn: "pennentertainment.com",
	mlco: "melco-resorts.com", sam: "bostonbeer.com", fizz: "nationalbeveragecorp.com",
	kdp: "keurigdrpepper.com", soun: "soundhound.com",
};

function getBrandDomain(brand: BrandIdentity): string {
	return brand.domain || BRAND_DOMAINS[brand.id] || `${brand.name.toLowerCase().replace(/\s+/g, "")}.com`;
}

export function getBrandLogoUrl(brand: BrandIdentity): string {
	// Brandfetch CDN: consistent, high-quality logos by domain — no API key needed
	return `https://cdn.brandfetch.io/${getBrandDomain(brand)}/w/400/h/400`;
}

/** First fallback (used in onError) */
export function getBrandFallbackLogoUrl(brand: BrandIdentity): string {
	// Finnhub-provided logo for dynamic stocks
	if (brand.logo) return brand.logo;
	// TradingView slug when available
	const slug = TV_LOGO_SLUGS[brand.id];
	if (slug) return `https://s3-symbol-logo.tradingview.com/${slug}--600.png`;
	// EODHD as last resort
	return `https://eodhd.com/img/logos/US/${brand.ticker.toUpperCase()}.png`;
}

/** Final fallback (used in second onError): Google favicon */
export function getBrandUltimateFallbackUrl(brand: BrandIdentity): string {
	return `https://www.google.com/s2/favicons?domain=${getBrandDomain(brand)}&sz=128`;
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
	hon: "honeywell", or: "l-oreal", lrlcy: "l-oreal", el: "estee-lauder", elf: "e-l-f-beauty",
	ulta: "ulta-beauty", coty: "coty",
	// Finance
	jpm: "jpmorgan-chase", gs: "goldman-sachs", ms: "morgan-stanley",
	c: "citigroup", bac: "bank-of-america", wfc: "wells-fargo",
	blk: "blackrock", axp: "american-express", cof: "capital-one",
	schw: "charles-schwab", bx: "blackstone", kkr: "kkr",
	aig: "american-international-group", met: "metlife", pru: "prudential-financial",
	afl: "aflac", all: "allstate", cb: "chubb", trv: "travelers-companies",
	adp: "automatic-data-processing", ndaq: "nasdaq", ice: "intercontinental-exchange",
	cme: "cme", spgi: "sp-global", mco: "moodys",
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
	sony: "sony-group",
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
	// New additions
	ebay: "ebay", duol: "duolingo", app: "applovin",
	cvna: "carvana", bmbl: "bumble", bros: "dutch-bros",
	wing: "wingstop", shak: "shake-shack", cart: "maplebear",
	tm: "toyota-motor", bynd: "beyond-meat",
	wrby: "warby-parker", gme: "gamestop", amc: "amc-entertainment-holdings",
	nio: "nio", chwy: "chewy", para: "paramount-global",
	lcid: "lucid-group", lyv: "live-nation-entertainment",
	cake: "cheesecake-factory", txrh: "texas-roadhouse", denn: "dennys",
	jack: "jack-in-the-box", pzza: "papa-johns-international", blmn: "bloomin-brands", eat: "brinker-international",
	rklb: "rocket-lab", asts: "ast-spacemobile", celh: "celsius-holdings", wynn: "wynn-resorts",
	acmr: "acm-research", lunr: "intuitive-machines", joby: "joby-aviation", achr: "archer-aviation",
	gsat: "globalstar", lvs: "las-vegas-sands", penn: "penn-national-gaming",
	mlco: "melco", sam: "boston-beer", fizz: "national-beverage",
	kdp: "keurig-dr-pepper", soun: "soundhound-ai",
	// Financial services (missing)
	ajg: "arthur-j-gallagher", ally: "ally-financial", amp: "ameriprise-financial",
	aon: "aon", apo: "apollo-global-management", ben: "franklin-resources",
	cboe: "cboe-global-markets", cfg: "citizens-financial-group", evr: "evercore",
	fds: "factset-research-systems", fis: "fidelity-national-information-services", fisv: "fiserv",
	gpn: "global-payments", hig: "hartford-financial-services-group", key: "keycorp",
	lnc: "lincoln-national", mmc: "marsh-and-mclennan", ncno: "ncino",
	ntrs: "northern-trust", omf: "onemain-holdings", pfg: "principal-financial-group",
	rf: "regions-financial", rjf: "raymond-james-financial", syf: "synchrony-financial",
	tfc: "truist-financial", upst: "upstart-holdings", wex: "wex",
	// Tech / Software (missing)
	bill: "bill-holdings", hpq: "hp", hubs: "hubspot", match: "match-group-inc",
	mpwr: "monolithic-power-systems", on: "on-semiconductor", path: "uipath",
	smci: "super-micro-computer", ssnc: "ss-and-c-technologies", swks: "skyworks-solutions",
	tost: "toast", u: "unity-software",
	// Healthcare (missing)
	hims: "hims-and-hers-health", holx: "hologic", rmd: "resmed",
	// Energy / Industrial (missing)
	bkr: "baker-hughes", hes: "hess", ir: "ingersoll-rand",
	// Other (missing)
	clsk: "cleanspark", czr: "caesars-entertainment", nu: "nu-holdings", se: "sea",
};

export function getBrandHeroUrl(id: string): string {
	const slug = TV_LOGO_SLUGS[id];
	if (slug) return `https://s3-symbol-logo.tradingview.com/${slug}--600.png`;
	const domain = BRAND_DOMAINS[id];
	if (domain) return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
	return "";
}
