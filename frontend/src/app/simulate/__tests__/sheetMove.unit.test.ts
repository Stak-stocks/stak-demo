import { describe, expect, it } from "vitest";
import { sheetMove } from "../PickDetail";

/**
 * A tab's history, small enough to read: its entries (the page's path, the sheet on show, the entry's pushed mark, which
 * the pages keep as the `simSheet` history state) and where the tab stands. `show` is what the pick page's and the
 * Portfolio's setSearch do with the move sheetMove decides: a step back, or a navigation that replaces the entry or
 * adds one after it.
 */
type Entry = { path: string; modal?: string; pushed: boolean };
type Tab = { entries: Entry[]; index: number };

const OUTSIDE = "https://example.com/";
const PICK = "/simulate/picks/TSLA";
const PORTFOLIO = "/simulate/portfolio";

function show(tab: Tab, next: string | undefined): Tab {
	const current = tab.entries[tab.index]!;
	const move = sheetMove(current.modal, next, current.pushed);
	if (move.kind === "back") return { ...tab, index: tab.index - 1 };
	const entry: Entry = { path: current.path, modal: next, pushed: move.pushed };
	return move.replace
		? { entries: tab.entries.map((e, i) => (i === tab.index ? entry : e)), index: tab.index }
		: { entries: [...tab.entries.slice(0, tab.index + 1), entry], index: tab.index + 1 };
}
const walk = (tab: Tab, ...sheets: (string | undefined)[]) => sheets.reduce(show, tab);
const here = (tab: Tab) => {
	const entry = tab.entries[tab.index];
	return entry ? (entry.modal ? `${entry.path}?modal=${entry.modal}` : entry.path) : "outside the tab's history";
};
/** A tab that arrived on `path` showing `modal` by its address (a pasted link): the entry was never pushed. */
const landed = (path: string, modal: string | undefined, before: string[] = [OUTSIDE]): Tab => ({
	entries: [...before.map((p) => ({ path: p, pushed: false })), { path, modal, pushed: false }],
	index: before.length,
});

const SHEETS = ["sell-confirm", "sell-failed", "sell-success"] as const;

describe("a sheet state's place in the history (PickDetail.tsx / Portfolio.tsx setSearch)", () => {
	it("opens a sheet as its own entry, marked pushed", () => {
		expect(sheetMove(undefined, "sell-confirm", false)).toEqual({ kind: "navigate", replace: false, pushed: true });
	});

	it("swaps a sheet state inside its entry and keeps the entry's mark", () => {
		for (const shown of SHEETS) {
			for (const next of SHEETS) {
				expect(sheetMove(shown, next, true), `${shown} -> ${next}, pushed`).toEqual({ kind: "navigate", replace: true, pushed: true });
				expect(sheetMove(shown, next, false), `${shown} -> ${next}, by its address`).toEqual({ kind: "navigate", replace: true, pushed: false });
			}
		}
	});

	it("closes a pushed sheet with a step back, any other in its entry's place", () => {
		for (const shown of SHEETS) {
			expect(sheetMove(shown, undefined, true), shown).toEqual({ kind: "back" });
			expect(sheetMove(shown, undefined, false), shown).toEqual({ kind: "navigate", replace: true, pushed: false });
		}
	});

	it("never steps back from an entry that was not pushed, whatever is shown or asked for", () => {
		for (const shown of [undefined, ...SHEETS]) {
			for (const next of [undefined, ...SHEETS]) expect(sheetMove(shown, next, false).kind, `${shown} -> ${next}`).toBe("navigate");
		}
	});
});

describe("a sheet reached by its address (a pasted link, a reload) closes in place", () => {
	it("after a failed sale: Not now leaves the pick page on show, not the site before it", () => {
		const tab = walk(landed(PICK, "sell-confirm"), "sell-failed", undefined);
		expect(here(tab)).toBe(PICK);
		expect(tab.index).toBe(1);
		expect(tab.entries.map((e) => e.path)).toEqual([OUTSIDE, PICK]);
	});

	it("after Try again: the Sell sheet's Back leaves the pick page on show", () => {
		const retried = walk(landed(PICK, "sell-confirm"), "sell-failed", "sell-confirm");
		expect(here(retried)).toBe(`${PICK}?modal=sell-confirm`);
		expect(retried.entries[retried.index]!.pushed).toBe(false);
		const closed = show(retried, undefined);
		expect(here(closed)).toBe(PICK);
		expect(closed.index).toBe(1);
	});

	it("from the receipt of a partial sale: closing it leaves the pick page on show", () => {
		const tab = walk(landed(PICK, "sell-confirm"), "sell-success", undefined);
		expect(here(tab)).toBe(PICK);
		expect(tab.index).toBe(1);
	});

	it("as the tab's only entry: nothing steps back out of the tab's history (about:blank)", () => {
		for (const path of [[undefined], ["sell-failed", undefined], ["sell-failed", "sell-confirm", undefined], ["sell-failed", "sell-confirm", "sell-failed", undefined]]) {
			const tab = walk(landed(PICK, "sell-confirm", []), ...path);
			expect(here(tab), path.join(" -> ")).toBe(PICK);
			expect(tab.index).toBe(0);
			expect(tab.entries).toHaveLength(1);
		}
	});

	it("on the Portfolio too, whose Sell sheet is only ever reached by its address", () => {
		const failed = walk(landed(PORTFOLIO, "sell-confirm"), "sell-failed");
		expect(failed.entries[failed.index]!.pushed).toBe(false);
		expect(here(show(failed, undefined))).toBe(PORTFOLIO);
		expect(here(walk(failed, "sell-confirm", undefined))).toBe(PORTFOLIO);
		expect(walk(failed, "sell-confirm", undefined).index).toBe(1);
	});
});

describe("a sheet opened from its page closes with a step back to it", () => {
	const opened = show(landed(PICK, undefined), "sell-confirm");

	it("is its own entry over the page", () => {
		expect(opened.entries.map((e) => (e.modal ? `${e.path}?modal=${e.modal}` : e.path))).toEqual([OUTSIDE, PICK, `${PICK}?modal=sell-confirm`]);
		expect(opened.index).toBe(2);
		expect(opened.entries[2]!.pushed).toBe(true);
	});

	it("from the Sell sheet, the failed-order sheet, Try again and the receipt alike, in that one entry", () => {
		for (const path of [[undefined], ["sell-failed", undefined], ["sell-failed", "sell-confirm", undefined], ["sell-success", undefined]]) {
			const tab = walk(opened, ...path);
			expect(here(tab), path.join(" -> ")).toBe(PICK);
			expect(tab.index).toBe(1);
			// the sheet's entry is still the one after the page (the browser's Forward), never a second one
			expect(tab.entries).toHaveLength(3);
		}
	});
});
