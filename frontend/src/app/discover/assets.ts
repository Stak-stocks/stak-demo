/**
 * Figma assets for section 04 · Discover. Every file is Figma's own export of the layer it is named after
 * (public/figma/discover/<layer name>__<node id>.<ext>), downloaded with download_assets on the layer's parent and
 * saved as given (2026-10-19: 2:2959 the deck column, 2:2951 the ring, 2:3206 the Saved chip, 2:3425 the completion
 * ring, 2:3234 the toast).
 *
 * Byte identity: Figma serialises an SVG two ways. download_assets (and get_design_context's asset URLs taken the same
 * night) write a path's `stroke` before `stroke-width` and the ring's circle from (26.4,48); the serialiser behind the
 * stock group's copy of the chevron 2:3570 (public/figma/stock/frame__2-3570.svg) writes `stroke` after
 * `stroke-linejoin` and the circle from (48,26.4). The path data, colours, widths, caps and gradient stops are the
 * same, so the drawings are identical; a byte comparison must be made against the same export path as the saved file.
 * A gradient's id (paint0_linear_0_N) and a filter's (filter0_f_0_N) are counters Figma assigns per export, so no two
 * exports of the beam or the box vector share bytes; everything else in them does.
 */
const figma = "/figma/discover";

export const D = {
	ring: `${figma}/frame__2-2952.svg`, // "Ring" 2:2951 > "Frame" 2:2952: the 52.8 ring, #2A3346 track and the 1/12 arc
	ringDone: `${figma}/frame__2-3426.svg`, // "Completion ring" 2:3425 > "Frame" 2:3426: the 79.2 full ring (12/12)
	/**
	 * 22px chevron-left (Back, Nav · Previous; rotated for Next): Figma's export of the deck's own arrow layer, "Frame"
	 * 2:3079 inside "Nav · Previous" 2:3078, the same drawing as 2:3082 (Next), the receipt's Back 2:3454 and the stock
	 * page's 2:3570 (download_assets 2026-10-18, confirmed byte for byte against download_assets on 2026-10-19).
	 */
	chevron: `${figma}/frame__2-3079.svg`,
	bookmark: `${figma}/icon-bookmark__2-3063.svg`, // Save pill glyph "icon/bookmark" 2:3063 (12.733 at 1x, #AEAEAE outline)
	bookmarkSaved: `${figma}/icon-bookmark__2-3208.svg`, // Saved pill glyph 2:3208 (the #D9D9D9 filled bookmark)
	toastBookmark: `${figma}/icon-bookmark__2-3235.svg`, // 17px white glyph in the "Saved to My STAK" toast 2:3234 > 2:3235
	/**
	 * The card illustration's layers (2:3044 "Frame 1618869052"): the open box and the light beam.
	 * The box ("Group 1000002777" 2:3045) as Figma renders it: Figma's exportAsync({ format PNG, scale 2, contentsOnly })
	 * of the layer, 545 x 258 px = 272.5 x 129 (7742 bytes, FNV-1a 7ea67164 on 2026-10-19, byte for byte this file),
	 * cut where the clipping frame 2:3043 cuts it (the layer's render bounds, 272.152 x 128.6 from (-26.514, 78.595) in
	 * the art frame) on a transparent ground, so the same file serves the three cards' three fills. Figma draws the
	 * box's abutting faces without seams; a browser rasterising the vector (group-1000002777__2-3045.svg, saved beside
	 * it) leaves a hairline of the card showing along every shared edge, so the cards use Figma's raster.
	 * group-1000002777_2-3045@2x-export.png is download_assets' 2x export of the same layer: the same drawing with the
	 * front card's #142844 frame fill and the clip's half-covered last row baked in. It fits that one card only (the
	 * side frames are #253a59 / #2f486e) and would cut the clipped row twice, so nothing draws it.
	 */
	deckBoxRaster: `${figma}/group-1000002777_2-3045@2x.png`,
	deckBeam: `${figma}/vector-7__2-3058.svg`, // "Vector 7" 2:3058, 142.687 x 153.394 at (37.146, -5.306): Figma's SVG export
} as const;

/**
 * The glass company coins Figma draws (500 x 500 source images, FILL into a square layer). The deck frames use three
 * of them (2:3060 "6 nvidia 1", 2:3020 "Image" = 7 apple 1, 2:2981 "Image" = 3 google 1; download_assets on 2:2959
 * returned the three raw images byte for byte these files on 2026-10-19); the onboarding hero (2:5712, 1:180 on the
 * phone page) holds the same set plus Amazon, Shopify and Twitch. `rotate` is the layer's Figma rotation (degrees,
 * counter-clockwise): Figma sets the Google coin at 49.532 in the deck (2:2979) and 50 in the hero. Twitch ("1 twitch
 * 1") has no listed ticker. These five draw exactly Figma's image.
 */
export type FigmaCoin = { kind: "figma"; src: string; rotate: number };
const FIGMA_COINS: Readonly<Record<string, FigmaCoin>> = {
	NVDA: { kind: "figma", src: `${figma}/6-nvidia-1_2-3060.png`, rotate: 0 },
	AAPL: { kind: "figma", src: `${figma}/7-apple-1_2-5740.png`, rotate: 0 },
	GOOGL: { kind: "figma", src: `${figma}/3-google-1_2-5732.png`, rotate: 49.532 },
	GOOG: { kind: "figma", src: `${figma}/3-google-1_2-5732.png`, rotate: 49.532 },
	AMZN: { kind: "figma", src: `${figma}/5-amazon-1_2-5725.png`, rotate: 0 },
	SHOP: { kind: "figma", src: `${figma}/4-shopify-1_2-5735.png`, rotate: 0 },
};

/**
 * Every other company gets the same coin in Figma's style (the user's request of 2026-10-30: "when there more
 * companies it should be like how is it on figma"): Figma's own glass with the logo taken off (`glass`, a 500 x 500
 * image on the NVIDIA coin's outline) and the company's mark raised on it in frosted glass (`mark`, a 500 x 500 overlay
 * drawn over the glass in the same square). Figma's five coins each have a slightly different outline, so the glass
 * comes upright or turned 2.5 degrees either way and a company always takes the same one (by its ticker). The files are
 * prepared by frontend/scripts/coins/build_coins.py: a vetted single-colour mark where the company has one
 * (COIN_MARKS), otherwise the lettermark of the company name's initial (COIN_LETTERS), so a company added to the catalog
 * later shows a coin with no code change. The tables below are that script's output.
 */
export type MarkCoin = { kind: "mark"; glass: string; mark: string | null };
export type Coin = FigmaCoin | MarkCoin;

// <coin-marks> generated by frontend/scripts/coins/build_coins.py: do not edit by hand, run the script
/** The empty glass: upright, and turned +2.5 / -2.5 degrees (public/coins/coin*.webp). */
const COIN_GLASS: readonly string[] = ["/coins/coin.webp?v=ce2d5dd6", "/coins/coin-b.webp?v=911f61e9", "/coins/coin-c.webp?v=cb52041a"];
/** Tickers with a prepared mark (public/coins/marks/<TICKER>.webp) and its content hash. */
const COIN_MARKS: Readonly<Record<string, string>> = {
	AAL: "f95b9a6b", ABBV: "0ea06446", ABNB: "4480a8f6", ACHR: "f08f041a", ACMR: "9da301a8", ACN: "77cc91e5",
	ADBE: "f1f8a93b", ADI: "0c4fdd1e", ADP: "efaf7fc2", AEP: "0a4b243a", AFRM: "defe4f64", AIG: "e8108cf3",
	AJG: "2d453671", ALB: "0d5c55fa", ALL: "b20345c0", ALLY: "75bec4d4", AMAT: "297559a2", AMC: "5aac1e25",
	AMD: "821b016c", AMGN: "37a1bf99", AMP: "f82719a1", AMT: "f6805dde", AON: "6a84defd", APD: "ea27f16b",
	APO: "e2391212", APP: "bac21756", ARM: "f7672b03", ASML: "eea994c5", ASTS: "6ea7aa0a", AVGO: "a362fa94",
	AXP: "e576326b", AZO: "77d7a996", BA: "14f68f1e", BABA: "46fbe9b7", BAC: "913b5eaf", BIDU: "a73295e3",
	BIIB: "bd069d50", BILL: "1ccf3c88", BK: "02c2f894", BKR: "14340dcb", BLK: "fc6d8644", BLMN: "bd6f62f2",
	BMBL: "d4f85cc1", BMY: "858fc16c", BROS: "25b203f2", BSX: "045cecac", BURL: "f87b25c0", BX: "13d97dbc",
	BYND: "2eb8e2ae", C: "bd1eafca", CAKE: "ec653f1d", CART: "1464e8e1", CAT: "545958b0", CB: "a1ec7ce3",
	CBOE: "92d3c2c7", CDNS: "2052e189", CELH: "9c35358a", CFG: "f1a21e54", CHWY: "f7e9d6f3", CI: "96d06167",
	CL: "37452fa0", CLSK: "93444084", CME: "39697114", CMG: "666defaa", COF: "e31e223e", COIN: "d8db02b0",
	COST: "3efd3f85", COTY: "72680f35", CRM: "a18f956b", CRWD: "7f216b59", CSX: "3e9ea6b4", CVNA: "09de3ab0",
	CVS: "73e20df2", CVX: "ddf8c918", CZR: "813d8433", D: "a84dac5c", DAL: "02e15a3f", DASH: "051ae2c4",
	DDOG: "e3dffac1", DE: "501616e9", DELL: "168d6407", DENN: "dec7e9de", DG: "fe806b77", DIS: "a4898455",
	DKNG: "9eba47e8", DLR: "1600192e", DLTR: "0c41b8eb", DOCU: "18a4314f", DPZ: "7147ca6d", DUK: "a1298a66",
	DUOL: "03834caf", DVN: "8303c9d0", EA: "95b0ef46", EAT: "2b784c0b", EBAY: "3b136493", EFX: "264327aa",
	ELF: "f37441d2", EMR: "584570dd", ENPH: "287be4a6", EOG: "f5fd9b5c", EQIX: "ac851b19", ETN: "a907f8ac",
	ETSY: "c975e91a", EXC: "f89a1a87", F: "7a2db158", FCX: "58af27c2", FDS: "100eccdf", FDX: "0818dd50",
	FIS: "8b3d97f9", FISV: "ffd673f1", FSLR: "f4065849", FTNT: "98447a03", GE: "4d8107c5", GILD: "2d702d19",
	GIS: "9b8f5854", GM: "65e0c4f7", GME: "29f5643c", GPN: "5bcb75d9", GS: "5ccad6ce", GSAT: "7590a7bc", HD: "552287c7",
	HES: "b5f97a7b", HIG: "3f8c6d9b", HIMS: "3f2cb501", HLT: "a38b8468", HOLX: "0472eb94", HON: "e714e8b8",
	HOOD: "dba5b94e", HPQ: "02c5264f", HSY: "6c37a75a", HUBS: "f3b23743", HUM: "1d093dda", IBM: "509a5c84",
	ICE: "3cda7dc3", INTC: "6cb729b4", INTU: "428533ff", IONQ: "013997f9", IR: "3051d4f4", ISRG: "7addf65c",
	ITW: "fe73467c", IVZ: "17c281ce", JACK: "56ea9c51", JOBY: "2370df27", JPM: "9921762a", KDP: "6645a7f6",
	KEY: "8f6f03b2", KKR: "abd1520d", KMB: "80f339d2", KMI: "780a2b4e", KO: "b5af7b55", KR: "e1d5f76b", LHX: "2d38af68",
	LLY: "d6abec61", LMT: "5f40b9e0", LOW: "0aebd8ca", LRCX: "4dfa6e5f", LRLCY: "f9e6199e", LULU: "d9e77d62",
	LUNR: "8b18775b", LUV: "9a8988f0", LYFT: "fd754075", LYV: "fc71c24e", MA: "50ed9062", MAR: "d713c787",
	MARA: "bef723b4", MCD: "a6fa47be", MCHP: "901da904", MCO: "780d84ea", MDB: "f9705477", MDLZ: "6537381d",
	MDT: "ad98f91e", MELI: "43bcbaa3", MET: "47bb0fef", META: "aed004df", MGM: "e805ef2d", MLCO: "ba030fdd",
	MMC: "6a607289", MMM: "2890d617", MNST: "60881e32", MPWR: "58f46d83", MRK: "b4fa141f", MRNA: "219fc247",
	MRVL: "ceeef600", MSCI: "681d5cc0", MSFT: "a54ff327", MSTR: "fa473d4e", MTCH: "2e912f91", MU: "b5330aa2",
	NCNO: "670be9d7", NDAQ: "da0b4b10", NEE: "5140b235", NEM: "3afe1070", NET: "c30dc778", NFLX: "cffccbef",
	NIO: "a5b19626", NKE: "e8dc23a9", NOC: "5efbc870", NOW: "cd976303", NTRS: "f78278b2", NU: "9491b79f",
	NVO: "06168039", NXPI: "110e39bc", O: "7e091312", OKTA: "78c9caa1", OMF: "1ce40d10", ON: "0396c3c5",
	ORCL: "ce8dcd34", OXY: "d3040fdc", PANW: "85c6c8cf", PATH: "4cb7ad18", PAYX: "232efd86", PENN: "f6f94919",
	PEP: "b84e27c9", PFE: "51e437e3", PFG: "9c923e8b", PG: "044baea5", PINS: "22530ba4", PLD: "2820e68e",
	PLTR: "80607593", PLUG: "e37ff839", PNC: "2be43ba0", PRU: "2cc9fc78", PSX: "6663cb10", PTON: "bf59643c",
	PYPL: "4d222121", PZZA: "3a0d149c", QCOM: "f5dfd4c5", QQQ: "a0885f8b", RBLX: "a7cb14ad", RCL: "fd206ab1",
	RDDT: "5b5f38e1", REGN: "4769c2c7", RF: "2eee272b", RIVN: "91f182cb", RKLB: "645b1868", RMD: "1643406e",
	ROKU: "9f5c53ec", RTX: "e255e7f1", S: "d1db529d", SAP: "5d1b48be", SBUX: "10fa6c79", SCHW: "76594a74",
	SE: "da813cc6", SHAK: "19713522", SLB: "cfb3b5c1", SMCI: "70a7cf88", SNAP: "085bcc6a", SNOW: "95c442fb",
	SNPS: "d3430f05", SO: "bce74c2a", SOFI: "4838f4f8", SONY: "11b82276", SPCE: "f7a1aa0d", SPG: "058857c1",
	SPGI: "7f68720e", SPOT: "85d73b83", SQ: "ea2b59a0", SSNC: "1f938e46", STT: "e298b301", STZ: "a50a8f33",
	SWKS: "f1ba5e97", SYF: "5bb1be4b", SYK: "a0dc7d8e", T: "63591d8d", TEAM: "d2b607f6", TFC: "5ab03441",
	TGT: "711ae727", TJX: "cc84af1f", TM: "36758048", TMUS: "38803300", TOST: "684fa71b", TROW: "cfe8fd94",
	TRV: "614f04d6", TSCO: "2e5d0c68", TSLA: "593bccd2", TSM: "46c231f4", TTD: "a7f39e07", TTWO: "0be66529",
	TWLO: "91e31e1e", TXN: "00795565", U: "84a74d01", UAL: "e0ef3717", UBER: "865b039e", ULTA: "5880fa8f",
	UNP: "efd22ade", UPS: "de3160a3", UPST: "d0ded2ff", USB: "8ce563e3", V: "75a21cfa", VEEV: "32b2fb83",
	VLO: "5017c499", VRTX: "9ad2d11b", VZ: "e743527a", WBD: "cd1592db", WDAY: "44221bf6", WEX: "bc45cdcb",
	WFC: "ba171c48", WMT: "d4bdae99", WYNN: "7302d125", XOM: "2f7262d8", YUM: "3a0c54ad", ZM: "2c33af03",
	ZS: "a0d7a4bc",
};
/** Lettermarks (public/coins/letters/<char>.webp) for every company without a prepared mark. */
const COIN_LETTERS: Readonly<Record<string, string>> = {
	A: "ad03a052", B: "816c8649", C: "47ef30b5", D: "f01771e0", E: "2b779ad8", F: "735b530e", G: "5dd3d9bb",
	H: "6d4a26aa", I: "a11b4f5d", J: "da77cdad", K: "7c67ef25", L: "de8ca348", M: "82f64ce8", N: "b1ddd15f",
	O: "851b2501", P: "e170b6bb", Q: "19a7a4c9", R: "f4dd9f3d", S: "a90f968d", T: "0af34d54", U: "12de2c70",
	V: "d8332981", W: "d2aefe4f", X: "2725c8fb", Y: "b0865949", Z: "56405990", "0": "379b439f", "1": "566d0d20",
	"2": "60709d96", "3": "febcfa3e", "4": "37d923e9", "5": "3d5d7c77", "6": "79cd66f3", "7": "e8361bda",
	"8": "3e06cf60", "9": "92022edd",
};
// </coin-marks>

/** The generated files, for checks: the glass files, the prepared marks and the lettermarks (with their hashes). */
export const COIN_FILES = { glass: COIN_GLASS, marks: COIN_MARKS, letters: COIN_LETTERS } as const;

/**
 * The lettermark a company falls back to: its name's first letter or digit (accents dropped, a leading "The" skipped:
 * The Trade Desk is a T, The Cheesecake Factory a C), else its ticker's.
 */
export function coinInitial(name: string, ticker: string): string {
	const pick = (s: string) =>
		s
			.normalize("NFD")
			.toUpperCase()
			.match(/[A-Z0-9]/)?.[0];
	return pick(name.replace(/^\s*the\s+(?=\S)/i, "")) ?? pick(ticker) ?? "";
}

/** Which glass file a ticker draws on: FNV-1a of the ticker (build_coins.py glass_index() computes the same). */
export function coinGlassIndex(ticker: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < ticker.length; i++) h = Math.imul(h ^ ticker.charCodeAt(i), 0x01000193) >>> 0;
	return h % COIN_GLASS.length;
}

const versioned = (path: string, hash: string | undefined) => (hash ? `${path}?v=${hash}` : path);

/**
 * The coin of a company: Figma's image for the five it draws, otherwise its glass with the company's prepared mark,
 * otherwise its glass with its lettermark (`name`: the company name the lettermark is taken from; the ticker's first
 * character when the name is unknown). Null only for an empty ticker.
 */
export function companyCoin(ticker: string, name = ""): Coin | null {
	const T = ticker.trim().toUpperCase();
	if (!T) return null;
	const figmaCoin = FIGMA_COINS[T];
	if (figmaCoin) return figmaCoin;
	const glass = COIN_GLASS[coinGlassIndex(T)] ?? COIN_GLASS[0] ?? "";
	if (Object.hasOwn(COIN_MARKS, T)) return { kind: "mark", glass, mark: versioned(`/coins/marks/${encodeURIComponent(T)}.webp`, COIN_MARKS[T]) };
	const initial = coinInitial(name, T);
	return { kind: "mark", glass, mark: initial ? versioned(`/coins/letters/${initial}.webp`, COIN_LETTERS[initial]) : null };
}
