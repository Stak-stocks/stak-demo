/**
 * The store through its hook (fix round of 2026-11-09): an order of nothing is refused before anything is written
 * (N27a; ST-01, ST-05, ST-13), the showcase's first sale credits the frame's dollars (N27b; ST-02, ST-08), the sale
 * record, the lots and the inbox rows they give (N27c, N29d; NUM-04, ST-06), the taste's lessons (N27d, N29h; ST-07),
 * the one unsave rule (N27e; ST-09) and the persona's account month (N23s).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	auth: { user: null as null | { uid: string; metadata: { creationTime?: string } }, loading: false },
	account: {
		account: null as null | Record<string, unknown>,
		accountLoading: false,
		initSandboxCash: vi.fn(),
		addToSandbox: vi.fn(),
		sellFromSandbox: vi.fn(),
	},
	health: { healthy: false, settled: true },
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/context/AccountContext", () => ({ useAccount: () => mocks.account }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }));
vi.mock("../quotes", async (importOriginal) => ({
	...(await importOriginal<typeof import("../quotes")>()),
	useApiHealthState: () => mocks.health,
	useApiHealth: () => mocks.health.healthy,
}));

import { loadCatalog } from "../catalog";
import { monthYear, round4 } from "../format";
import { guestStore, localStore, seedGuest } from "../guest";
import { personaOffBook } from "../ledger";
import { inboxFor } from "../notifications";
import { OrderRefused, refusalOf } from "../orders";
import { usePortfolio } from "../portfolio";
import { usePricesOnScreen } from "../prices";
import { useShowcase } from "../showcase";
import { useLive } from "../store";

beforeAll(() => loadCatalog());

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
	localStorage.clear();
	guestStore().reset();
	localStore("guest").reset();
	localStore("u1").reset();
	localStorage.clear();
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	mocks.account.addToSandbox.mockReset();
	mocks.account.sellFromSandbox.mockReset();
});

afterEach(() => {
	cleanup();
	client.clear();
	mocks.health.healthy = false;
	mocks.auth.user = null;
	mocks.account.account = null;
});

const useAll = () => ({ live: useLive(), pf: usePortfolio(), showcase: useShowcase(), prices: usePricesOnScreen() });
const stored = () => localStorage.getItem("stak.guest.v2");
/** The reason an action was refused for (null: it was not refused). */
async function refusal(run: () => Promise<unknown>) {
	try {
		await run();
		return null;
	} catch (error) {
		expect(error).toBeInstanceOf(OrderRefused);
		expect((error as Error).message).toBe(refusalOf(error));
		return refusalOf(error);
	}
}

describe("an order of nothing is refused, before anything is written (N27a)", () => {
	it("refuses a buy for every reason and changes nothing: the cent of COST that bought 0.0000 shares (ST-01)", async () => {
		const { result } = renderHook(useAll, { wrapper });
		const before = JSON.stringify(guestStore().read());
		const buy = (ticker: string, dollars: number, price: number) => refusal(() => result.current.live.actions.buy(ticker, dollars, price));
		await act(async () => {
			expect(await buy("COST", 0.01, 918.2)).toBe("too-small");
			expect(await buy("ABBV", 0.004, 171.2)).toBe("too-small"); // ST-13: rounded to $0.00, it ended in "Prices are refreshing"
			expect(await buy("NVDA", 0.99, 122.1)).toBe("too-small");
			expect(await buy("NVDA", 0, 122.1)).toBe("too-small");
			expect(await buy("NVDA", Number.NaN, 122.1)).toBe("too-small");
			expect(await buy("NVDA", 8800.01, 122.1)).toBe("insufficient");
			expect(await buy("EAT", 25, 0)).toBe("no-price");
			expect(await buy("EAT", 25, Number.NaN)).toBe("no-price");
		});
		expect(JSON.stringify(guestStore().read())).toBe(before);
		expect(stored()).toBeNull(); // nothing was ever written
		expect(result.current.showcase).toBe(true); // a refusal is not an action
		expect(result.current.pf.cash).toBe(8800);
		expect(result.current.live.positions.some((p) => p.ticker === "COST")).toBe(false);
		// the smallest order goes through: a dollar, and everything the persona has
		await act(async () => {
			expect(await buy("COST", 1, 918.2)).toBeNull();
			expect(await buy("PLTR", 8799, 28.4)).toBeNull();
			expect(await buy("NVDA", 1, 122.1)).toBe("insufficient"); // nothing left: checked against the ledger as it is NOW
		});
		expect(result.current.pf.cash).toBe(0);
		expect(result.current.pf.value).toBe(10240);
	});

	it("refuses a sale for every reason and files no row under SOLD (ST-05)", async () => {
		const { result } = renderHook(useAll, { wrapper });
		const before = JSON.stringify(guestStore().read());
		const sell = (ticker: string, shares: number, price: number) => refusal(() => result.current.live.actions.sell(ticker, shares, price));
		await act(async () => {
			expect(await sell("COST", 1, 918.2)).toBe("nothing-held");
			expect(await sell("NVDA", 0.00001, 122.1)).toBe("too-small"); // the 0.001% sale that filed "0.0000 shares"
			expect(await sell("NVDA", 0, 122.1)).toBe("too-small");
			expect(await sell("NVDA", -1, 122.1)).toBe("too-small");
			expect(await sell("NVDA", 1, 0)).toBe("no-price");
		});
		expect(JSON.stringify(guestStore().read())).toBe(before);
		expect(stored()).toBeNull();
		expect(result.current.live.sold).toHaveLength(2);
		expect(result.current.showcase).toBe(true);
	});

	it("still closes a dust holding, whatever is asked", async () => {
		// a holding too small to show, as the ledger could be left with before the minimum (a cent of COST)
		guestStore().update((s) => ({ touched: true, positions: [...s.positions, { ticker: "COST", shares: 0.00001089, priceAtAdd: 918.2, addedAt: 5 }], cash: 8799.99 }));
		const { result } = renderHook(useAll, { wrapper });
		let sale: Awaited<ReturnType<typeof result.current.live.actions.sell>> | undefined;
		await act(async () => {
			sale = await result.current.live.actions.sell("COST", round4(0.00001089), 918.2); // the sheet's All asks for "0.0000"
		});
		expect(sale).toMatchObject({ shares: 0.00001089, proceeds: 0.01, stake: 0.01, pnl: 0, closed: true });
		expect(result.current.live.positions.some((p) => p.ticker === "COST")).toBe(false);
		expect(result.current.pf.cash).toBe(8800);
	});

	it("forgets a stored pick that holds nothing, so the company can be bought and sold again (F8)", async () => {
		// what $0.01 of COST left under the four-decimal build: a position of no shares, the cent spent, COST saved
		const seed = seedGuest();
		const left = { ...seed, touched: true, cash: 8799.99, positions: [...seed.positions, { ticker: "COST", shares: 0, priceAtAdd: 918.2, addedAt: 5 }], saves: [...seed.saves] };
		const { result } = renderHook(useAll, { wrapper });
		// another document wrote it (the store re-reads, migrates and sanitizes the stored text)
		act(() => {
			localStorage.setItem("stak.guest.v2", JSON.stringify(left));
			window.dispatchEvent(new StorageEvent("storage", { key: "stak.guest.v2" }));
		});
		expect(result.current.live.positions.map((p) => p.ticker)).toEqual(["NVDA", "TSLA", "AMD", "AAPL", "JPM", "MSFT"]);
		expect(result.current.pf.cash).toBe(8799.99);
		expect(result.current.pf.value).toBe(10239.99); // the cent was spent then; nothing moves now
		// the company is an ordinary one again: a buy fills, and the pick closes
		await act(async () => {
			await result.current.live.actions.buy("COST", 25, 918.2);
		});
		const cost = result.current.pf.positions.find((p) => p.ticker === "COST")!;
		expect(cost).toMatchObject({ shares: 0.02722718, value: 25, stake: 25 });
		let sale: Awaited<ReturnType<typeof result.current.live.actions.sell>> | undefined;
		await act(async () => {
			sale = await result.current.live.actions.sell("COST", round4(cost.shares), 918.2);
		});
		expect(sale).toMatchObject({ proceeds: 25, stake: 25, pnl: 0, closed: true });
		expect(result.current.live.positions.some((p) => p.ticker === "COST")).toBe(false);
		expect(result.current.pf.cash).toBe(8799.99);
	});

	it("refuses an account's order of nothing the same way, against its own cash and 3-decimal quantities", async () => {
		mocks.auth.user = { uid: "u1", metadata: {} };
		mocks.account.account = { sandboxCash: 50, sandboxPortfolio: { NVDA: { shares: 0.5, priceAtAdd: 100, addedAt: 1 } }, stakBrandIds: [], totalXp: 0 };
		const { result } = renderHook(() => useLive(), { wrapper });
		expect(result.current.signedIn).toBe(true);
		const buy = (dollars: number, price: number) => refusal(() => result.current.actions.buy("NVDA", dollars, price));
		const sell = (ticker: string, shares: number, price: number) => refusal(() => result.current.actions.sell(ticker, shares, price));
		await act(async () => {
			expect(await buy(0.5, 122.1)).toBe("too-small");
			expect(await buy(1, 5000)).toBe("too-small"); // a dollar of a $5,000 share is 0.000 shares at three decimals
			expect(await buy(60, 122.1)).toBe("insufficient");
			expect(await buy(25, 0)).toBe("no-price");
			expect(await sell("COST", 1, 918.2)).toBe("nothing-held");
			expect(await sell("NVDA", 0, 122.1)).toBe("too-small");
			// a part the account's three-decimal document would not drop (it keeps roundShares(0.4996) = 0.5): the guest's
			// check lets it through, the store's account sale refuses it (N41b; it credited $0.05 and kept the holding)
			expect(await sell("NVDA", 0.0004, 122.1)).toBe("too-small");
			expect(await sell("NVDA", 0.2, 0)).toBe("no-price");
		});
		expect(mocks.account.addToSandbox).not.toHaveBeenCalled();
		expect(mocks.account.sellFromSandbox).not.toHaveBeenCalled();
		expect(localStore("u1").read().sold).toEqual([]);
	});
});

describe("the showcase's first sale and the sale record (N27b, N29d)", () => {
	it("credits the $124.00 the sheet promised and files one gain everywhere: +$24.00 (ST-02)", async () => {
		const { result } = renderHook(useAll, { wrapper });
		expect(result.current.showcase).toBe(true);
		const nvda = result.current.pf.positions.find((p) => p.ticker === "NVDA")!;
		expect(nvda).toMatchObject({ value: 124, stake: 100, gain: 24 });
		let sale: Awaited<ReturnType<typeof result.current.live.actions.sell>> | undefined;
		await act(async () => {
			sale = await result.current.live.actions.sell("NVDA", round4(nvda.shares), nvda.price);
		});
		expect(sale).toMatchObject({ ticker: "NVDA", proceeds: 124, stake: 100, pnl: 24, closed: true, price: 122.1 });
		expect(result.current.pf.cash).toBe(8924); // $8,923.96 on the four-decimal seed
		expect(result.current.live.sold[0]).toEqual(sale);
		expect(result.current.pf.value).toBe(10240);
		// no other listed gain moved by a cent (ST-08)
		expect(result.current.pf.positions.map((p) => [p.ticker, p.gain])).toEqual([["TSLA", 18], ["AMD", 11], ["AAPL", 6], ["JPM", 2], ["MSFT", -3]]);
	});

	it("keeps every listed gain through a first action that touches none of them (ST-08)", async () => {
		const { result } = renderHook(useAll, { wrapper });
		const gains = () => result.current.pf.positions.slice(0, 6).map((p) => [p.ticker, p.value, p.stake, p.gain]);
		const before = gains();
		await act(async () => {
			await result.current.live.actions.pass("MU");
		});
		expect(result.current.showcase).toBe(false);
		expect(gains()).toEqual(before);
		expect(before).toEqual([["NVDA", 124, 100, 24], ["TSLA", 118, 100, 18], ["AMD", 111, 100, 11], ["AAPL", 106, 100, 6], ["JPM", 102, 100, 2], ["MSFT", 97, 100, -3]]);
		expect(result.current.pf.value).toBe(10240);
		expect(result.current.pf.allTime).toBe(240);
	});
});

describe("the inbox after real trades (NUM-04, ST-06)", () => {
	const settings = { priceAlerts: false, priceThreshold: 2, dailyDeck: false, marketNews: false };
	it("keeps each row as it happened: buy, top-up of an old pick, part sale, close, buy again", async () => {
		const { result } = renderHook(useAll, { wrapper });
		const inbox = () => inboxFor(result.current.live, { moves: [], settings, now: Date.now() + 1000, firstName: "Hamza", showcase: result.current.showcase }).map((n) => `${n.title} · ${n.body}`);
		const crwd = () => result.current.pf.positions.find((p) => p.ticker === "CRWD")!;
		await act(async () => {
			await result.current.live.actions.buy("CRWD", 25, 362.1);
		});
		expect(result.current.live.positions.find((p) => p.ticker === "CRWD")!.lots).toHaveLength(1); // every buy is a lot
		const order = "Practice order filled · 0.0690 CRWD at $362.10 · paper";
		expect(inbox()).toEqual([order]);
		// a top-up of the May 8 pick raises its own row (the frame's own third row is such an order)
		await act(async () => {
			await result.current.live.actions.buy("NVDA", 25, 122.1);
		});
		const topUp = "Practice order filled · 0.2048 NVDA at $122.10 · paper";
		expect(inbox().sort()).toEqual([order, topUp].sort());
		await act(async () => {
			await result.current.live.actions.sell("CRWD", round4(crwd().shares * 0.25), 362.1);
		});
		const part = inbox().find((r) => r.startsWith("Sold part of CRWD"))!;
		expect(part).toBeTruthy();
		expect(inbox()).toContain(order); // still the order's own 0.0690, not the 0.0517 left
		await act(async () => {
			await result.current.live.actions.sell("CRWD", round4(crwd().shares), 362.1);
		});
		const closed = inbox().find((r) => r.startsWith("Position closed"))!;
		expect(closed).toBeTruthy();
		expect(inbox()).toContain(order);
		expect(inbox()).toContain(part); // a part sale never turns into "Position closed"
		await act(async () => {
			await result.current.live.actions.buy("CRWD", 10, 362.1);
		});
		expect(inbox()).toContain("Practice order filled · 0.0276 CRWD at $362.10 · paper");
		expect(inbox()).toContain(order);
		expect(inbox()).toContain(part);
		expect(inbox()).toContain(closed); // the sale that closed the position still says so
		expect(inbox()).toContain(topUp);
		expect(inbox()).toHaveLength(5);
		// every sale recorded the buys it sold (F1): the part sale too, and it doubled no order row
		const [closing, partSale] = result.current.live.sold.filter((s) => s.ticker === "CRWD");
		expect(partSale).toMatchObject({ closed: false, lots: [{ price: 362.1, bought: 0.06904170 }] });
		expect(closing).toMatchObject({ closed: true, lots: [{ price: 362.1, bought: 0.06904170 }] });
		expect(round4(partSale!.lots![0]!.shares + closing!.lots![0]!.shares)).toBe(round4(0.06904170));
		// the cash came back to the cent through all of it: -25 -25 +25 -10
		expect(result.current.pf.cash).toBe(8765);
		expect(result.current.pf.value).toBe(10240);
	});
});

describe("taste through the store (N27d, N29h)", () => {
	it("is where it was after three Save / Unsave toggles, and after a save, an unsave and a buy that is sold again", async () => {
		const { result } = renderHook(useAll, { wrapper });
		const start = seedGuest().tagScores;
		for (let i = 0; i < 3; i++) {
			await act(async () => {
				await result.current.live.actions.save("NFLX", 684.2);
			});
			expect(result.current.live.tagScores).not.toEqual(start);
			await act(async () => {
				await result.current.live.actions.unsave("NFLX");
			});
			expect(result.current.live.tagScores).toEqual(start);
		}
		expect(result.current.live.saves).toHaveLength(19);
		// a buy saves the company (it teaches once, like any save); unsaving it takes that back too
		await act(async () => {
			await result.current.live.actions.buy("NFLX", 25, 684.2);
		});
		const taught = result.current.live.tagScores;
		expect(taught).not.toEqual(start);
		await act(async () => {
			await result.current.live.actions.save("NFLX", 684.2); // already saved: nothing more
		});
		expect(result.current.live.tagScores).toEqual(taught);
		await act(async () => {
			await result.current.live.actions.unsave("NFLX");
		});
		expect(result.current.live.tagScores).toEqual(start);
		// unsaving one of the persona's seeded saves takes nothing back: it never taught
		await act(async () => {
			await result.current.live.actions.unsave("MSFT");
		});
		expect(result.current.live.tagScores).toEqual(start);
	});

	it("teaches a pass once: today's deck replayed changes nothing (N29h)", async () => {
		const { result } = renderHook(useAll, { wrapper });
		await act(async () => {
			await result.current.live.actions.pass("MU");
			await result.current.live.actions.pass("ARM");
		});
		const once = result.current.live.tagScores;
		expect(once).not.toEqual(seedGuest().tagScores);
		await act(async () => {
			await result.current.live.actions.pass("MU");
			await result.current.live.actions.pass("ARM");
		});
		expect(result.current.live.tagScores).toEqual(once);
		expect(result.current.live.passed).toEqual(["MU", "ARM"]);
	});
});

describe("one unsave rule (N27e; ST-09)", () => {
	it("clears the company's saved mark in today's deck, whoever unsaves it", async () => {
		const { result } = renderHook(useAll, { wrapper });
		await act(async () => {
			await result.current.live.actions.save("MU", 118.75);
			result.current.live.actions.setDeck({ date: "2026-11-09", theme: "ai-chips", order: ["NVDA", "MU", "AMD"], index: 1, saved: ["NVDA", "MU"], passed: [], bought: [] });
		});
		// the article's Unsave calls the live action directly
		await act(async () => {
			await result.current.live.actions.unsave("MU");
		});
		expect(result.current.live.deck).toMatchObject({ saved: ["NVDA"], index: 1, order: ["NVDA", "MU", "AMD"] });
		expect(result.current.live.savedTickers.has("MU")).toBe(false);
		// a company the deck does not carry leaves the deck object alone
		const deck = result.current.live.deck;
		await act(async () => {
			await result.current.live.actions.unsave("COST");
		});
		expect(result.current.live.deck).toBe(deck);
	});
});

describe("the persona's account month and the sentence about prices", () => {
	it("keeps the frame's July 2026 in the untouched showcase and reads April 2026 from the first action on (N23s)", async () => {
		const { result } = renderHook(useAll, { wrapper });
		expect(monthYear(result.current.live.createdAt!)).toBe("July 2026"); // Profile 2:2476, verbatim
		expect(result.current.prices).toMatchObject({ case: "signedOut", live: false, showcase: true, real: true, lead: "Prices are real." });
		await act(async () => {
			await result.current.live.actions.pass("MU");
		});
		expect(monthYear(result.current.live.createdAt!)).toBe("April 2026"); // before its first trade (SHOP, April 28)
		expect(result.current.prices).toMatchObject({ case: "signedOut", live: false, showcase: false, real: false, lead: "These are demo prices." });
		expect(result.current.live.offBook).toEqual(personaOffBook());
	});
});
