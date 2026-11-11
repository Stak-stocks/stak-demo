/**
 * A signed-in account through the store's hook (review of 2026-11-09, follow-ups F9 and F10). Sign-in is not reachable
 * from a test (and the API is down), so the account document, its context and firebase/firestore are mocked the way
 * Firestore behaves: every write replaces the document the next render reads.
 *
 * - THE TASTE PATH (F10): learnTaste and the account branch of unsave. Save writes the lesson once, a second Save
 *   writes nothing, Unsave writes the original scores back and clears the company's saved mark in today's deck.
 * - THE ACCOUNT'S LOTS (F9): every order placed here is kept as a lot beside the account's sold log, so its inbox rows
 *   are built like a guest's: a top-up raises its own row, a part sale rewrites none, and nothing but the taste is
 *   written to the account's document by this layer.
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type Entry = { shares: number; priceAtAdd: number | null; addedAt: number };
type AccountDoc = {
	sandboxCash: number;
	sandboxPortfolio: Record<string, Entry>;
	stakBrandIds: string[];
	passedBrands: { id: string; at: number; count: number }[];
	totalXp: number;
	tagScores: Record<string, number>;
};

const mocks = vi.hoisted(() => {
	const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;
	const ctx = {
		account: null as null | AccountDoc,
		accountLoading: false,
		initSandboxCash: vi.fn(async () => {}),
		updateLastBriefDate: vi.fn(async () => {}),
		// src/context/AccountContext.tsx saveToStak / updateStak / updatePassedBrands: the document's own lists
		saveToStak: vi.fn(async (id: string) => {
			const a = ctx.account!;
			if (!a.stakBrandIds.includes(id)) ctx.account = { ...a, stakBrandIds: [...a.stakBrandIds, id] };
		}),
		updateStak: vi.fn(async (ids: string[]) => {
			ctx.account = { ...ctx.account!, stakBrandIds: ids };
		}),
		updatePassedBrands: vi.fn(async (passed: AccountDoc["passedBrands"]) => {
			ctx.account = { ...ctx.account!, passedBrands: passed };
		}),
		// addToSandbox (AccountContext.tsx:404-436): three-decimal shares, a two-decimal average cost, the first buy's day kept
		addToSandbox: vi.fn(async (ticker: string, price: number, shares: number) => {
			const a = ctx.account!;
			const cost = round(price * shares, 2);
			if (a.sandboxCash < cost) return;
			const had = a.sandboxPortfolio[ticker];
			const total = round((had?.shares ?? 0) + shares, 3);
			const entry: Entry = { addedAt: had?.addedAt ?? Date.now(), shares: total, priceAtAdd: had?.priceAtAdd != null ? round((had.priceAtAdd * had.shares + price * shares) / total, 2) : price };
			ctx.account = { ...a, sandboxPortfolio: { ...a.sandboxPortfolio, [ticker]: entry }, sandboxCash: round(a.sandboxCash - cost, 2) };
		}),
		// sellFromSandbox (AccountContext.tsx:438-460): the position goes when its three-decimal remainder is nothing
		sellFromSandbox: vi.fn(async (ticker: string, value: number, _price: number, qty: number) => {
			const a = ctx.account!;
			const left = round(a.sandboxPortfolio[ticker]!.shares - qty, 3);
			const portfolio = { ...a.sandboxPortfolio };
			if (left <= 0) delete portfolio[ticker];
			else portfolio[ticker] = { ...portfolio[ticker]!, shares: left };
			ctx.account = { ...a, sandboxPortfolio: portfolio, sandboxCash: round(a.sandboxCash + value, 2) };
		}),
	};
	return {
		auth: { user: { uid: "u1", metadata: {} } as null | { uid: string; metadata: { creationTime?: string } }, loading: false },
		account: ctx,
		// firebase/firestore updateDoc: the patch lands on the document
		updateDoc: vi.fn(async (_ref: unknown, patch: Record<string, unknown>) => {
			ctx.account = { ...ctx.account!, ...patch } as AccountDoc;
		}),
	};
});

vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/context/AccountContext", () => ({ useAccount: () => mocks.account }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }));
vi.mock("firebase/firestore", async (importOriginal) => ({
	...(await importOriginal<typeof import("firebase/firestore")>()),
	doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
	getDoc: async () => ({ data: () => mocks.account.account }),
	updateDoc: mocks.updateDoc,
}));

import { actionPoints, brandIdOfTicker, loadCatalog } from "../catalog";
import { round2 } from "../format";
import { type DeckProgress, localKey, localStore } from "../guest";
import { inboxFor } from "../notifications";
import { portfolioValueHistory } from "../portfolioHistory";
import { refusalOf } from "../orders";
import { teach, useLive } from "../store";

beforeAll(() => loadCatalog());

const START = { semiconductor: 4, ai: 3, enterprise_software: 2 };
const account = (patch: Partial<AccountDoc> = {}): AccountDoc => ({ sandboxCash: 1000, sandboxPortfolio: {}, stakBrandIds: [], passedBrands: [], totalXp: 0, tagScores: { ...START }, ...patch });

beforeEach(() => {
	localStorage.clear();
	localStore("u1").reset();
	localStorage.clear();
	mocks.auth.user = { uid: "u1", metadata: {} };
	mocks.account.account = account();
	for (const fn of [mocks.updateDoc, mocks.account.saveToStak, mocks.account.updateStak, mocks.account.updatePassedBrands, mocks.account.addToSandbox, mocks.account.sellFromSandbox]) fn.mockClear();
});

afterEach(() => cleanup());

/** The hook, and `run`: one action, then the render the account document's next snapshot brings. */
function mount() {
	const view = renderHook(() => useLive());
	const run = async (action: (live: ReturnType<typeof useLive>) => unknown) => {
		await act(async () => {
			await action(view.result.current);
		});
		view.rerender();
	};
	return { view, run, live: () => view.result.current };
}
/** The score maps this layer wrote to the account's document, in order. */
const tasteWrites = () => mocks.updateDoc.mock.calls.map(([ref, patch]) => [(ref as { path: string }).path, patch]);

describe("an account's taste (F10: learnTaste, the account branch of unsave)", () => {
	const deck = (saved: string[]): DeckProgress => ({ date: "2026-11-09", theme: "ai-chips", order: ["NFLX", "MU", "AMD"], index: 1, saved, passed: [], bought: [] });

	it("writes a Save's lesson once, nothing on a second Save, and the original scores back on Unsave, which clears deck.saved", async () => {
		const { run, live } = mount();
		expect(live().signedIn).toBe(true);
		expect(live().tagScores).toEqual(START);
		const id = brandIdOfTicker("NFLX");
		const lesson = teach({ tagScores: START, taught: {} }, "NFLX", actionPoints("save")).tagScores;
		expect(lesson).not.toEqual(START);

		await run((l) => l.actions.setDeck(deck(["NFLX", "MU"])));
		await run((l) => l.actions.save("NFLX", 684.2));
		expect(mocks.account.saveToStak).toHaveBeenCalledWith(id, 684.2);
		// the lesson went to the user document the phones read, once, and this browser remembers what the company taught
		expect(tasteWrites()).toEqual([["users/u1", { tagScores: lesson }]]);
		expect(live().tagScores).toEqual(lesson);
		expect(localStore("u1").read().taught).toEqual({ NFLX: actionPoints("save") });

		// a second Save: the company is saved already, nothing is taught and nothing written
		await run((l) => l.actions.save("NFLX", 684.2));
		expect(tasteWrites()).toHaveLength(1);
		expect(live().tagScores).toEqual(lesson);

		// Unsave: the original scores go back to the document, and today's deck forgets the saved mark (N27e)
		await run((l) => l.actions.unsave("NFLX"));
		expect(mocks.account.updateStak).toHaveBeenCalledWith([]);
		expect(tasteWrites()).toEqual([
			["users/u1", { tagScores: lesson }],
			["users/u1", { tagScores: START }],
		]);
		expect(live().tagScores).toEqual(START);
		expect(localStore("u1").read().taught).toEqual({});
		expect(localStore("u1").read().deck).toMatchObject({ saved: ["MU"], index: 1, order: ["NFLX", "MU", "AMD"] });
		expect(live().deck?.saved).toEqual(["MU"]);

		// a second Unsave has nothing to take back
		await run((l) => l.actions.unsave("NFLX"));
		expect(tasteWrites()).toHaveLength(2);
		// three more toggles leave the taste where it was
		for (let i = 0; i < 3; i++) {
			await run((l) => l.actions.save("NFLX", 684.2));
			await run((l) => l.actions.unsave("NFLX"));
		}
		expect(live().tagScores).toEqual(START);
		expect(mocks.updateDoc.mock.calls.at(-1)![1]).toEqual({ tagScores: START });
	});

	it("teaches once when Save is pressed twice before the document answers", async () => {
		const { view, live } = mount();
		// both calls run on the same render: the second still believes the company is not saved
		await act(async () => {
			const { save } = view.result.current.actions;
			await save("NFLX", 684.2);
			await save("NFLX", 684.2);
		});
		view.rerender();
		expect(mocks.account.saveToStak).toHaveBeenCalledTimes(2);
		expect(tasteWrites()).toHaveLength(1); // the lesson is a state, not an event (N27d)
		expect(live().tagScores).toEqual(teach({ tagScores: START, taught: {} }, "NFLX", actionPoints("save")).tagScores);
	});

	it("teaches a pass once, and never over a save's lesson", async () => {
		const { run, live } = mount();
		await run((l) => l.actions.pass("MU"));
		const passed = teach({ tagScores: START, taught: {} }, "MU", actionPoints("pass")).tagScores;
		expect(tasteWrites()).toEqual([["users/u1", { tagScores: passed }]]);
		await run((l) => l.actions.pass("MU")); // today's deck replayed (N29h)
		expect(tasteWrites()).toHaveLength(1);
		expect(live().passed).toEqual(["MU"]);
		// a saved company that is passed keeps teaching its save
		await run((l) => l.actions.save("NFLX", 684.2));
		const saved = live().tagScores;
		await run((l) => l.actions.pass("NFLX"));
		expect(live().tagScores).toEqual(saved);
		expect(tasteWrites()).toHaveLength(2);
	});
});

describe("an account's lots, kept in this browser (F9)", () => {
	const settings = { priceAlerts: false, priceThreshold: 2, dailyDeck: false, marketNews: false };
	const DAY = 86_400_000;
	/** the trade rows of the account's inbox, as "id | title · body" */
	const tradeRows = (live: ReturnType<typeof useLive>) =>
		inboxFor(live, { moves: [], settings, now: Date.now() + 1000, firstName: "Ada", showcase: false })
			.filter((n) => n.id.startsWith("order-") || n.id.startsWith("sold-"))
			.map((n) => `${n.title} · ${n.body}`)
			.sort();
	const kept = () => localStore("u1").read().lots;

	it("gives every order its own inbox row: a top-up raises one, a part sale and a close rewrite none", async () => {
		const phoneDay = Date.now() - 3 * DAY; // NVDA was bought on a phone three days ago: this browser knows no lot of it
		mocks.account.account = account({ sandboxPortfolio: { NVDA: { shares: 0.5, priceAtAdd: 100, addedAt: phoneDay } }, stakBrandIds: [brandIdOfTicker("NVDA")] });
		const { run, live } = mount();
		expect(live().positions).toEqual([{ ticker: "NVDA", shares: 0.5, priceAtAdd: 100, addedAt: phoneDay }]);
		expect(tradeRows(live())).toEqual([]);

		// a first buy placed here: the order is a lot
		await run((l) => l.actions.buy("CRWD", 25, 362.1));
		expect(mocks.account.addToSandbox).toHaveBeenLastCalledWith("CRWD", 362.1, 0.069); // the account's order, as before
		const crwdLot = kept().CRWD![0]!;
		expect(kept().CRWD).toEqual([{ shares: 0.069, price: 362.1, at: crwdLot.at, bought: 0.069 }]);
		expect(live().positions.find((p) => p.ticker === "CRWD")!.lots).toEqual(kept().CRWD);
		const order = "Practice order filled · 0.0690 CRWD at $362.10 · paper";
		expect(tradeRows(live())).toEqual([order]);

		// a top-up of the holding the phone opened: what it was until now is ONE lot, the top-up its own, with its own row
		await run((l) => l.actions.buy("NVDA", 24.42, 122.1));
		expect(mocks.account.addToSandbox).toHaveBeenLastCalledWith("NVDA", 122.1, 0.2);
		expect(kept().NVDA).toEqual([
			{ shares: 0.5, price: 100, at: phoneDay },
			{ shares: 0.2, price: 122.1, at: kept().NVDA![1]!.at, bought: 0.2 },
		]);
		expect(live().positions.find((p) => p.ticker === "NVDA")).toMatchObject({ shares: 0.7, priceAtAdd: 106.31, addedAt: phoneDay, lots: kept().NVDA });
		const topUp = "Practice order filled · 0.2000 NVDA at $122.10 · paper";
		expect(tradeRows(live())).toEqual([order, topUp].sort());

		// half of CRWD asked: the account sells what its document drops (N41b), 0.069 less the 0.035 it keeps = 0.034, for
		// what the position's worth drops by ($24.98 - $12.67); the order's row keeps the order's own 0.0690; the sale
		// records the buy it sold from. RE-DERIVED: until N41b it sold 0.0345 for $12.49 and booked +$0.18 at the price paid
		await run((l) => l.actions.sell("CRWD", 0.0345, 362.1));
		expect(mocks.account.sellFromSandbox).toHaveBeenLastCalledWith("CRWD", 12.31, 362.1, 0.034);
		// the lots kept here hold what the document keeps, its three decimals: 0.035 (N38c; round8's 0.0345 until then)
		expect(mocks.account.account!.sandboxPortfolio.CRWD!.shares).toBe(0.035);
		expect(kept().CRWD).toEqual([{ shares: 0.035, price: 362.1, at: crwdLot.at, bought: 0.069 }]);
		const part = localStore("u1").read().sold[0]!;
		expect(part).toMatchObject({ ticker: "CRWD", shares: 0.034, proceeds: 12.31, stake: 12.31, pnl: 0, closed: false, price: 362.1, lots: [{ shares: 0.034, price: 362.1, at: crwdLot.at, bought: 0.069 }] });
		const partRow = "Sold part of CRWD · 0.0340 CRWD returned $12.31 to your cash · paper";
		expect(tradeRows(live())).toEqual([order, topUp, partRow].sort());

		// the rest sold: the lots end with the position, the closing sale keeps the buy, and no row above changed
		const rest = live().positions.find((p) => p.ticker === "CRWD")!.shares;
		expect(rest).toBe(0.035); // the account's own three decimals
		await run((l) => l.actions.sell("CRWD", rest, 362.1));
		expect(kept().CRWD).toBeUndefined();
		expect(live().positions.some((p) => p.ticker === "CRWD")).toBe(false);
		expect(localStore("u1").read().sold[0]).toMatchObject({ ticker: "CRWD", shares: 0.035, closed: true, lots: [{ shares: 0.035, price: 362.1, at: crwdLot.at, bought: 0.069 }] });
		const closeRow = "Position closed · 0.0350 CRWD returned $12.67 to your cash · paper";
		expect(tradeRows(live())).toEqual([order, topUp, partRow, closeRow].sort());

		// bought again: a new lot, a new row
		await run((l) => l.actions.buy("CRWD", 10, 362.1));
		expect(kept().CRWD).toHaveLength(1);
		expect(tradeRows(live())).toEqual([order, topUp, partRow, closeRow, "Practice order filled · 0.0280 CRWD at $362.10 · paper"].sort());

		// NOTHING ELSE in what an account order does: this layer wrote only the taste of the new save (CRWD) to the document
		for (const [path, patch] of tasteWrites()) {
			expect(path).toBe("users/u1");
			expect(Object.keys(patch as object)).toEqual(["tagScores"]);
		}
		expect(mocks.account.addToSandbox).toHaveBeenCalledTimes(3);
		expect(mocks.account.sellFromSandbox).toHaveBeenCalledTimes(2);
		expect(JSON.parse(localStorage.getItem(localKey("u1"))!).lots).toEqual(kept()); // they survive a reload
	});

	it("records a sale that leaves what the document drops (under 0.0005 shares) as the close it is (follow-up SW5)", async () => {
		const { run, live } = mount();
		await run((l) => l.actions.buy("CRWD", 25, 362.1));
		const at = kept().CRWD![0]!.at;
		const order = "Practice order filled · 0.0690 CRWD at $362.10 · paper";
		expect(mocks.account.account!.sandboxCash).toBe(975.02);

		// 0.0687 of the 0.069 held: 0.0003 would be left, which the document's three decimals drop with the position, so
		// the account sells what the document drops, the whole 0.069 (N41b: it sold 0.0687 for $24.88 and the document
		// dropped the 0.0003 unpaid)
		await run((l) => l.actions.sell("CRWD", 0.0687, 362.1));
		expect(mocks.account.sellFromSandbox).toHaveBeenLastCalledWith("CRWD", 24.98, 362.1, 0.069);
		expect(mocks.account.account!.sandboxPortfolio.CRWD).toBeUndefined();
		expect(live().positions.some((p) => p.ticker === "CRWD")).toBe(false);
		// the record says what happened: a CLOSE, the whole position's cost its stake, so its gain is what the cash made: at
		// the price paid, nothing (it read -$0.10)
		const close = localStore("u1").read().sold[0]!;
		expect(close).toMatchObject({ ticker: "CRWD", shares: 0.069, proceeds: 24.98, stake: 24.98, pnl: 0, closed: true, lots: [{ shares: 0.069, price: 362.1, at, bought: 0.069 }] });
		expect(round2(mocks.account.account!.sandboxCash - 1000)).toBe(close.pnl); // $1,000 -> $1,000.00, nothing held
		// the lots kept here end with the position, and the inbox reads a close: the order's own row is still there (from
		// the closing sale's buys). Recorded `closed: false`, the row read "Sold part of CRWD" and the order's row was lost
		expect(kept().CRWD).toBeUndefined();
		expect(tradeRows(live())).toEqual([order, "Position closed · 0.0690 CRWD returned $24.98 to your cash · paper"].sort());
		// and the value history (portfolioHistory.ts soldParts scales the sold buys to the record's stake): before the buy
		// the account held exactly the $1,000 it had, and today the $1,000.00 it has
		const week = portfolioValueHistory({ cash: live().cash, positions: [], sold: live().sold, offBook: null }, "1W", {}, Date.now() + 1000);
		expect([week.points[0]!.value, week.points.at(-1)!.value]).toEqual([1000, 1000]);

		// a sale that would leave 0.0006 is a part sale: the document keeps 0.001, and so does the record (closed: false;
		// N38c), and the account sells the rest, 0.204, for what the position's worth drops by, $25.03 - $0.12 (N41b); the
		// record's stake is that same drop at the cost a share, so at the price paid it books $0.00 (it sold 0.2044 for
		// $24.96 and booked +$0.05)
		await run((l) => l.actions.buy("NVDA", 25, 122.1));
		expect(mocks.account.addToSandbox).toHaveBeenLastCalledWith("NVDA", 122.1, 0.205);
		const cashBefore = mocks.account.account!.sandboxCash;
		await run((l) => l.actions.sell("NVDA", 0.2044, 122.1));
		expect(mocks.account.sellFromSandbox).toHaveBeenLastCalledWith("NVDA", 24.91, 122.1, 0.204);
		expect(mocks.account.account!.sandboxPortfolio.NVDA!.shares).toBe(0.001);
		const nvdaSale = localStore("u1").read().sold[0]!;
		expect(nvdaSale).toMatchObject({ ticker: "NVDA", shares: 0.204, proceeds: 24.91, stake: 24.91, pnl: 0, closed: false });
		// the cash, the record and the document agree
		expect(round2(mocks.account.account!.sandboxCash - cashBefore)).toBe(nvdaSale.proceeds);
		expect(live().positions.find((p) => p.ticker === "NVDA")!.shares).toBe(0.001);
		// the lots kept here hold what the document holds
		expect(kept().NVDA!.reduce((s, l) => s + l.shares, 0)).toBe(0.001);
		const nvdaRows = [order, "Position closed · 0.0690 CRWD returned $24.98 to your cash · paper", "Practice order filled · 0.2050 NVDA at $122.10 · paper", "Sold part of NVDA · 0.2040 NVDA returned $24.91 to your cash · paper"].sort();
		expect(tradeRows(live())).toEqual(nvdaRows);

		// A SALE THE DOCUMENT WOULD NOT SHRINK IS REFUSED (N41b; round 6's review, low 3): 0.0004 or a quarter of the 0.001
		// left keeps roundShares(0.0006) = 0.001, the whole holding. Until N41b it was accepted, credited $0.05 (or $0.03)
		// and left the holding as it was, again and again. Now nothing is written: no document change, no cash, no row
		const docBefore = mocks.account.account!;
		const calls = mocks.account.sellFromSandbox.mock.calls.length;
		for (const asked of [0.0004, 0.00025, 0.0005]) await act(async () => expect(live().actions.sell("NVDA", asked, 122.1)).rejects.toThrow("too-small"));
		expect(mocks.account.sellFromSandbox).toHaveBeenCalledTimes(calls);
		expect(mocks.account.account).toBe(docBefore);
		expect(localStore("u1").read().sold[0]).toEqual(nvdaSale);
		expect(tradeRows(live())).toEqual(nvdaRows);
		// the whole of it still closes the position, at what it is worth
		await run((l) => l.actions.sell("NVDA", 0.001, 122.1));
		expect(mocks.account.sellFromSandbox).toHaveBeenLastCalledWith("NVDA", 0.12, 122.1, 0.001);
		expect(mocks.account.account!.sandboxPortfolio.NVDA).toBeUndefined();
		expect(localStore("u1").read().sold[0]).toMatchObject({ ticker: "NVDA", shares: 0.001, proceeds: 0.12, pnl: 0, closed: true });
	});

	it("refuses an account's part sale worth less than a cent, as a guest's is refused, and writes nothing (N44c)", async () => {
		// round 7's review (low 2): 0.0015 of 0.021 AMC at $4.85 passed the guest's check (0.0015 shares for $0.01), then the
		// account sold its document's drop, 0.001, for $0.00 and kept 0.02 (the row read "0.0010 AMC returned $0.00")
		mocks.account.account = account({ sandboxPortfolio: { AMC: { shares: 0.021, priceAtAdd: 4.85, addedAt: Date.now() - DAY } }, stakBrandIds: [brandIdOfTicker("AMC")] });
		const { run, live } = mount();
		expect(live().positions.find((p) => p.ticker === "AMC")!.shares).toBe(0.021);
		const docBefore = mocks.account.account!;
		let refusal: unknown = null;
		await act(async () => {
			await live()
				.actions.sell("AMC", 0.0015, 4.85)
				.catch((e: unknown) => {
					refusal = e;
				});
		});
		// refused as the store refuses every order of nothing: OrderRefused("too-small"), before anything is written
		expect(refusalOf(refusal)).toBe("too-small");
		expect(mocks.account.sellFromSandbox).not.toHaveBeenCalled();
		expect(mocks.account.account).toBe(docBefore);
		expect(localStore("u1").read().sold).toEqual([]);
		expect(tradeRows(live())).toEqual([]);
		// a part worth a cent or more is booked: half of it sells the document's drop, 0.01, for $0.05 and keeps 0.011
		await run((l) => l.actions.sell("AMC", 0.0105, 4.85));
		expect(mocks.account.sellFromSandbox).toHaveBeenLastCalledWith("AMC", 0.05, 4.85, 0.01);
		expect(mocks.account.account!.sandboxPortfolio.AMC!.shares).toBe(0.011);
		expect(localStore("u1").read().sold[0]).toMatchObject({ ticker: "AMC", shares: 0.01, proceeds: 0.05, pnl: 0, closed: false });
		// and the whole of what is left still closes the position, whatever it is worth (closing is always allowed)
		await run((l) => l.actions.sell("AMC", 0.011, 4.85));
		expect(mocks.account.sellFromSandbox).toHaveBeenLastCalledWith("AMC", 0.05, 4.85, 0.011);
		expect(mocks.account.account!.sandboxPortfolio.AMC).toBeUndefined();
	});

	it("reads lots that belong to an earlier position as none, and replaces them at the next order", async () => {
		const today = Date.now();
		// the lots of a position this browser opened last week; since then a phone closed it and bought again today
		localStore("u1").update({ lots: { NVDA: [{ shares: 0.3, price: 110, at: today - 7 * DAY, bought: 0.3 }] } });
		mocks.account.account = account({ sandboxPortfolio: { NVDA: { shares: 0.1, priceAtAdd: 120, addedAt: today - 3_600_000 } }, stakBrandIds: [brandIdOfTicker("NVDA")] });
		const { run, live } = mount();
		expect(live().positions[0]!.lots).toBeUndefined();
		await run((l) => l.actions.buy("NVDA", 24.42, 122.1));
		expect(kept().NVDA!.map((l) => [l.shares, l.price])).toEqual([
			[0.1, 120],
			[0.2, 122.1],
		]);
		expect(live().positions[0]!.lots).toEqual(kept().NVDA);
	});

	it("a refused order keeps no lot", async () => {
		const { view } = mount();
		await act(async () => {
			await expect(view.result.current.actions.buy("NVDA", 5000, 122.1)).rejects.toThrow("insufficient");
			await expect(view.result.current.actions.buy("NVDA", 0.5, 122.1)).rejects.toThrow("too-small");
		});
		expect(kept()).toEqual({});
		expect(mocks.account.addToSandbox).not.toHaveBeenCalled();
	});
});
