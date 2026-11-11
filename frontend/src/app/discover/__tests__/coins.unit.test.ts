import { beforeAll, describe, expect, it } from "vitest";
import { allTickers, companyName, loadCatalog } from "@/app/live/catalog";
import { COIN_FILES, coinGlassIndex, coinInitial, companyCoin } from "../assets";

// the files under public/ (Vite lists them when it transforms this test; nothing is imported)
const PUBLIC_FILES = new Set(Object.keys(import.meta.glob(["/public/coins/**/*.webp", "/public/figma/discover/*.png"])).map((p) => p.replace(/^\/public/, "")));
const onDisk = (url: string) => PUBLIC_FILES.has(decodeURIComponent(url.split("?")[0] ?? ""));
const HASHED = /\?v=[0-9a-f]{8}$/;

describe("companyCoin: Figma's five", () => {
	it("draw Figma's own coin images, at Figma's rotation, whatever the ticker's case", () => {
		expect(companyCoin("NVDA")).toEqual({ kind: "figma", src: "/figma/discover/6-nvidia-1_2-3060.png", rotate: 0 });
		expect(companyCoin(" aapl ")).toEqual({ kind: "figma", src: "/figma/discover/7-apple-1_2-5740.png", rotate: 0 });
		expect(companyCoin("GOOGL")).toEqual({ kind: "figma", src: "/figma/discover/3-google-1_2-5732.png", rotate: 49.532 });
		expect(companyCoin("goog")).toEqual(companyCoin("GOOGL"));
		expect(companyCoin("AMZN")).toEqual({ kind: "figma", src: "/figma/discover/5-amazon-1_2-5725.png", rotate: 0 });
		expect(companyCoin("SHOP")).toEqual({ kind: "figma", src: "/figma/discover/4-shopify-1_2-5735.png", rotate: 0 });
	});
	it("ignore the company name (Figma's art wins)", () => {
		expect(companyCoin("NVDA", "Anything")).toEqual(companyCoin("NVDA"));
	});
});

describe("companyCoin: every other company", () => {
	it("gets one of the glass files and its prepared mark when it has one", () => {
		const coin = companyCoin("TSLA", "Tesla");
		expect(coin?.kind).toBe("mark");
		if (coin?.kind !== "mark") return;
		expect(COIN_FILES.glass).toContain(coin.glass);
		expect(coin.mark).toMatch(/^\/coins\/marks\/TSLA\.webp/);
		expect(coin.mark).toMatch(HASHED);
	});
	it("falls back to the lettermark of its name's initial", () => {
		const mark = (t: string, n: string) => {
			const c = companyCoin(t, n);
			return c?.kind === "mark" ? c.mark?.split("?")[0] : undefined;
		};
		// companies without a prepared mark: no clean official vector was reachable (ROST, 2026-11-01), or the
		// official logo is too thin for the coin (EL's, 1.06 px at deck size, 2026-11-06)
		expect(mark("EL", "Estée Lauder")).toBe("/coins/letters/E.webp");
		expect(mark("JNJ", "Johnson & Johnson")).toBe("/coins/letters/J.webp");
		expect(mark("BRK.B", "Berkshire Hathaway B")).toBe("/coins/letters/B.webp");
		expect(mark("ROST", "Ross Stores")).toBe("/coins/letters/R.webp");
		expect(mark("MS", "Morgan Stanley")).toBe("/coins/letters/M.webp");
		// marks taken back in the 2026-11-01 review: SPY's only reachable vector is State Street's symbol (STT's coin,
		// the sponsor's logo, not the fund's SPDR mark); UNH's stacked small-caps wordmark smears at deck size
		expect(mark("SPY", "SPY ETF")).toBe("/coins/letters/S.webp");
		expect(mark("UNH", "UnitedHealth")).toBe("/coins/letters/U.webp");
	});
	it("takes the prepared mark over the lettermark once a company has one (the 2026-11-01 logo step and its 2026-11-06 retry)", () => {
		const mark = (t: string, n: string) => {
			const c = companyCoin(t, n);
			return c?.kind === "mark" ? c.mark?.split("?")[0] : undefined;
		};
		expect(mark("PG", "Procter & Gamble")).toBe("/coins/marks/PG.webp");
		expect(mark("WMT", "Walmart")).toBe("/coins/marks/WMT.webp");
		expect(mark("LRLCY", "L'Oréal")).toBe("/coins/marks/LRLCY.webp");
		expect(mark("ELF", "e.l.f. Beauty")).toBe("/coins/marks/ELF.webp");
		expect(mark("CAKE", "The Cheesecake Factory")).toBe("/coins/marks/CAKE.webp");
		expect(mark("O", "Realty Income")).toBe("/coins/marks/O.webp");
		// the 2026-11-06 retry: official files the 2026-11-01 step could not download (they showed T and B before)
		expect(mark("TJX", "TJX Companies")).toBe("/coins/marks/TJX.webp");
		expect(mark("EAT", "Brinker International (Chili's)")).toBe("/coins/marks/EAT.webp");
		// and NEM (it showed N): Newmont's symbol, the N with the triangle, from the Commons file the retry could
		// not download at first
		expect(mark("NEM", "Newmont Corporation")).toBe("/coins/marks/NEM.webp");
	});
	it("uses the ticker's own first character for a company it does not know", () => {
		const c = companyCoin("zzzz");
		expect(c?.kind === "mark" && c.mark?.split("?")[0]).toBe("/coins/letters/Z.webp");
	});
	it("has no coin for an empty ticker", () => {
		expect(companyCoin("")).toBeNull();
		expect(companyCoin("   ")).toBeNull();
	});
});

describe("coinGlassIndex", () => {
	it("picks the same glass for a ticker every time, as build_coins.py glass_index() does", () => {
		// reference values from build_coins.glass_index (FNV-1a of the ticker, modulo the three glass files)
		const python: Record<string, number> = { TSLA: 1, PG: 0, META: 1, KO: 2, ADBE: 0, ORCL: 2, TSM: 2, MU: 0, NOW: 0, INTC: 2, AVGO: 2, CRM: 0, ZZZZ: 0 };
		for (const [t, i] of Object.entries(python)) expect(coinGlassIndex(t), t).toBe(i);
		for (const [t, i] of Object.entries(python)) {
			const c = companyCoin(t, companyName(t));
			if (c?.kind === "mark") expect(c.glass, t).toBe(COIN_FILES.glass[i]);
		}
	});
	it("draws every prepared mark on the glass its ticker takes (build_coins.py makes each mark's shadow for that glass)", () => {
		for (const t of Object.keys(COIN_FILES.marks)) {
			const c = companyCoin(t, companyName(t));
			expect(c?.kind, t).toBe("mark");
			if (c?.kind === "mark") expect(c.glass, t).toBe(COIN_FILES.glass[coinGlassIndex(t)]);
		}
	});
});

describe("coinInitial", () => {
	it("takes the first letter or digit, accents dropped, upper case", () => {
		expect(coinInitial("Estée Lauder", "EL")).toBe("E");
		expect(coinInitial("Énergie", "X")).toBe("E");
		expect(coinInitial("3M", "MMM")).toBe("3");
		expect(coinInitial("e.l.f. Beauty", "ELF")).toBe("E");
		expect(coinInitial("& Co", "AMP")).toBe("C");
	});
	it("skips a leading 'The'", () => {
		expect(coinInitial("The Cheesecake Factory", "CAKE")).toBe("C");
		expect(coinInitial("the Home Depot", "HD")).toBe("H");
		expect(coinInitial("The Trade Desk", "TTD")).toBe("T");
		expect(coinInitial("Theravance Biopharma", "TBPH")).toBe("T");
		expect(coinInitial("The", "THE")).toBe("T");
	});
	it("falls back to the ticker, then to nothing", () => {
		expect(coinInitial("", "brk.b")).toBe("B");
		expect(coinInitial("—", "")).toBe("");
	});
});

describe("the generated coin files", () => {
	it("exist for the three glass files, every prepared mark and every letter and digit", () => {
		expect(COIN_FILES.glass).toHaveLength(3);
		for (const g of COIN_FILES.glass) {
			expect(g).toMatch(HASHED);
			expect(onDisk(g), g).toBe(true);
		}
		expect(Object.keys(COIN_FILES.marks).length).toBeGreaterThan(0);
		for (const t of Object.keys(COIN_FILES.marks)) expect(onDisk(`/coins/marks/${encodeURIComponent(t)}.webp`), t).toBe(true);
		for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
			expect(COIN_FILES.letters[c], c).toMatch(/^[0-9a-f]{8}$/);
			expect(onDisk(`/coins/letters/${c}.webp`), c).toBe(true);
		}
	});
});

describe("every catalog company", () => {
	beforeAll(async () => {
		await loadCatalog();
	});
	it("resolves to a coin whose files exist, on every glass file", () => {
		const tickers = allTickers();
		expect(tickers.length).toBeGreaterThan(300);
		const glasses = new Set<string>();
		for (const t of tickers) {
			const coin = companyCoin(t, companyName(t));
			expect(coin, t).not.toBeNull();
			if (!coin) continue;
			if (coin.kind === "figma") expect(onDisk(coin.src), t).toBe(true);
			else {
				expect(onDisk(coin.glass), t).toBe(true);
				glasses.add(coin.glass);
				expect(coin.mark, t).toBeTruthy();
				expect(onDisk(coin.mark ?? ""), t).toBe(true);
			}
		}
		expect(glasses.size).toBe(COIN_FILES.glass.length);
	});
});
