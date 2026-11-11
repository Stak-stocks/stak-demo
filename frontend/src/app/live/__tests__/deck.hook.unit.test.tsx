import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	auth: { user: null, loading: false },
	account: { account: null, accountLoading: false, initSandboxCash: vi.fn() },
	health: { healthy: false, settled: true },
	quotes: {},
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/context/AccountContext", () => ({ useAccount: () => mocks.account }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }));
vi.mock("../quotes", async (importOriginal) => ({
	...await importOriginal<typeof import("../quotes")>(),
	useApiHealthState: () => mocks.health,
	useQuotes: () => mocks.quotes,
}));

import { getLocalDateKey } from "@/lib/utils";
import { loadCatalog } from "../catalog";
import { buildDeckOrder, DECK_SIZE, DECK_THEMES, useDeck } from "../deck";
import { type DeckProgress, type GuestState, guestStore, localStore, seedGuest } from "../guest";
import { hasDemoQuote } from "../quotes";

beforeAll(() => loadCatalog());

beforeEach(() => {
	localStorage.clear();
	guestStore().reset();
	localStore("guest").reset();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

function expectedOrder(state: GuestState): string[] {
	const theme = DECK_THEMES[0]!;
	return buildDeckOrder(
		theme,
		new Set([...state.saves.map((save) => save.ticker), ...state.passed]),
		`${getLocalDateKey()}:${theme.key}:guest`,
		true,
	);
}

function untouchedDeck(order: string[], patch: Partial<DeckProgress> = {}): DeckProgress {
	return {
		date: getLocalDateKey(),
		theme: DECK_THEMES[0]!.key,
		order,
		index: 0,
		saved: [],
		passed: [],
		bought: [],
		...patch,
	};
}

/** Keep real persistence and notifications, but fail promptly if initialization starts publishing forever. */
function observeDeckWrites() {
	const store = guestStore();
	const update = store.update;
	let writes = 0;
	return vi.spyOn(store, "update").mockImplementation((patch) => {
		if (writes++ >= 4) throw new Error("Deck initialization did not settle after four store writes");
		update(patch);
	});
}

describe("useDeck guest persistence", () => {
	it("counts the card in front: counter is index + 1, a Save leaves it, a Pass moves it, Previous brings it back (N29a)", async () => {
		const { result } = renderHook(() => useDeck({ quotes: false }));
		const first = result.current.current!.symbol;
		expect([result.current.index, result.current.counter, result.current.total]).toEqual([0, 1, DECK_SIZE]);
		await act(async () => { await result.current.save(first, 122.1); });
		expect(result.current.counter).toBe(1); // "2/12" on a saved first card is the frame's own preview address (2:3089)
		await act(async () => { await result.current.pass(first); });
		expect([result.current.index, result.current.counter]).toEqual([1, 2]);
		act(() => result.current.go(0));
		expect(result.current.counter).toBe(1);
		// never past the last card: a finished deck reads 12 of 12
		act(() => result.current.go(DECK_SIZE));
		expect([result.current.index, result.current.counter, result.current.done]).toEqual([DECK_SIZE, DECK_SIZE, true]);
	});

	it("toggles save and unsave on the same card and keeps the unsaved state after remount", async () => {
		const { result, unmount } = renderHook(() => useDeck({ quotes: false }));
		const ticker = result.current.current!.symbol;
		const order = result.current.order;
		await act(async () => { await result.current.save(ticker, 122.1); });
		expect(result.current.current?.symbol).toBe(ticker);
		expect(result.current.current?.saved).toBe(true);
		expect(guestStore().read().deck?.saved).toContain(ticker);
		await act(async () => { await result.current.unsave(ticker); });
		expect(result.current.current?.saved).toBe(false);
		expect(result.current.index).toBe(0);
		expect(result.current.order).toEqual(order);
		expect(guestStore().read().saves.some((save) => save.ticker === ticker)).toBe(false);
		expect(guestStore().read().deck?.saved).not.toContain(ticker);
		await act(async () => { await result.current.save(ticker, 122.1); });
		expect(result.current.current?.symbol).toBe(ticker);
		expect(result.current.current?.saved).toBe(true);
		await act(async () => { await result.current.unsave(ticker); });
		unmount();
		const restored = renderHook(() => useDeck({ quotes: false }));
		expect(restored.result.current.current?.symbol).toBe(ticker);
		expect(restored.result.current.current?.saved).toBe(false);
		expect(restored.result.current.order).toEqual(order);
	});

	it("retains the saved card and decision when unsave persistence fails", async () => {
		const { result } = renderHook(() => useDeck({ quotes: false }));
		const ticker = result.current.current!.symbol;
		await act(async () => { await result.current.save(ticker, 122.1); });
		const store = guestStore();
		const update = store.update;
		vi.spyOn(store, "update").mockImplementation((patch) => {
			const next = typeof patch === "function" ? patch(store.read()) : patch;
			if ("saves" in next) throw new Error("offline");
			update(patch);
		});
		await act(async () => { await expect(result.current.unsave(ticker)).rejects.toThrow("offline"); });
		expect(result.current.current?.symbol).toBe(ticker);
		expect(result.current.current?.saved).toBe(true);
		expect(store.read().deck?.saved).toContain(ticker);
	});

	const cases = [
		{ name: "NVDA is already saved", saved: ["NVDA"], passed: [], first: "AAPL" },
		{ name: "NVDA is already passed", saved: [], passed: ["NVDA"], first: "AAPL" },
		{ name: "all three pinned companies are excluded", saved: ["NVDA", "GOOGL"], passed: ["AAPL"], first: null },
	] as const;

	for (const fixture of cases) {
		it.each(["fresh", "stored"] as const)(`settles a %s deck when ${fixture.name}`, (initial) => {
			const state = seedGuest();
			state.saves.push(...fixture.saved.map((ticker) => ({ ticker, savedAt: Date.now(), priceAtSave: null })));
			state.passed = [...fixture.passed];
			const order = expectedOrder(state);
			state.deck = initial === "stored" ? untouchedDeck(order) : null;
			guestStore().update(state);
			const writes = observeDeckWrites();

			const { result, rerender } = renderHook(() => useDeck({ quotes: false }));
			expect(result.current.ready).toBe(true);
			expect(result.current.order).toEqual(order);
			expect(result.current.order).toHaveLength(DECK_SIZE);
			expect(result.current.order.every(hasDemoQuote)).toBe(true);
			for (const ticker of [...fixture.saved, ...fixture.passed]) expect(result.current.order).not.toContain(ticker);
			if (fixture.first) expect(result.current.current?.symbol).toBe(fixture.first);
			expect(writes).toHaveBeenCalledTimes(initial === "fresh" ? 1 : 0);

			const persisted = guestStore().read().deck;
			const firstOrder = result.current.order;
			for (let count = 0; count < 3; count++) rerender();
			expect(result.current.order).toBe(firstOrder);
			expect(guestStore().read().deck).toBe(persisted);
			expect(writes).toHaveBeenCalledTimes(initial === "fresh" ? 1 : 0);
		});
	}

	it("migrates a legacy AAPL-first untouched deck once when NVDA is eligible", () => {
		const state = seedGuest();
		const order = expectedOrder(state);
		expect(order[0]).toBe("NVDA");
		state.deck = untouchedDeck(["AAPL", "NVDA", ...order.filter((ticker) => ticker !== "AAPL" && ticker !== "NVDA")]);
		guestStore().update(state);
		const writes = observeDeckWrites();

		const { result, rerender } = renderHook(() => useDeck({ quotes: false }));
		expect(result.current.current?.symbol).toBe("NVDA");
		expect(result.current.order).toEqual(order);
		expect(writes).toHaveBeenCalledOnce();
		const persisted = guestStore().read().deck;

		rerender();
		rerender();
		expect(guestStore().read().deck).toBe(persisted);
		expect(result.current.order).toBe(persisted?.order);
		expect(writes).toHaveBeenCalledOnce();
	});

	it.each([
		{ name: "the pointer has advanced", progress: { index: 2 } },
		{ name: "a company was saved", progress: { saved: ["AAPL"] } },
		{ name: "a company was passed", progress: { passed: ["AAPL"] } },
		{ name: "a company was bought", progress: { bought: ["AAPL"] } },
		{ name: "the deck was completed", progress: { completed: true } },
	])("preserves the existing order when $name", ({ progress }) => {
		const state = seedGuest();
		const order = expectedOrder(state);
		const legacyOrder = ["AAPL", "NVDA", ...order.filter((ticker) => ticker !== "AAPL" && ticker !== "NVDA")];
		state.deck = untouchedDeck(legacyOrder, progress);
		guestStore().update(state);
		const writes = observeDeckWrites();

		const { result, rerender } = renderHook(() => useDeck({ quotes: false }));
		expect(result.current.order).toEqual(legacyOrder);
		expect(result.current.index).toBe(progress.index ?? 0);
		expect(guestStore().read().deck).toBe(state.deck);
		rerender();
		rerender();
		expect(result.current.order).toBe(state.deck?.order);
		expect(guestStore().read().deck).toBe(state.deck);
		expect(writes).not.toHaveBeenCalled();
	});
});
