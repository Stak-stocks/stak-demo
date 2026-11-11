import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { allTickers, loadCatalog } from "@/app/live/catalog";
import { refusalLine } from "@/app/live/orders";
import { benchmarksFor } from "../live";
import { PracticeBuySheet } from "../PracticeBuySheet";
import { hideHint, StatGrid } from "../StatGrid";
import { AVG_KEEP, avgLeft } from "../StockDetail";

beforeAll(() => {
	loadCatalog();
	// jsdom has no <dialog> methods: the Sheet opens its dialog as a modal
	if (!HTMLDialogElement.prototype.showModal) {
		HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
			this.setAttribute("open", "");
		};
		HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
			this.removeAttribute("open");
		};
	}
});
afterEach(() => cleanup());

const STATS = [
	{ label: "P/E ratio", value: "52.8", note: "Rich", good: false, outlined: false },
	{ label: "Revenue growth", value: "62%", note: "Explosive", good: true, outlined: true },
	{ label: "Profit margin", value: "48.9%", note: "Strong", good: false, outlined: false },
];
const FOOTER = "Tap a stat for sector and peer benchmarks";
const BENCH = "Benchmarks: P/E sector 22.0x · peers 36.8x.";

describe("the stat tiles are one disclosure and say so (I-06, N27s)", () => {
	const setup = () => {
		const { container } = render(<StatGrid stats={STATS} footer={FOOTER} benchmarks={BENCH} inner="#181f30" />);
		const tiles = [...container.querySelectorAll("button")];
		const panel = () => container.querySelector(`#${CSS.escape(tiles[0]!.getAttribute("aria-controls")!)}`) as HTMLElement;
		const hint = () => container.querySelector(`#${CSS.escape(tiles[0]!.getAttribute("aria-describedby")!)}`)!.textContent;
		const expanded = () => tiles.map((t) => t.getAttribute("aria-expanded"));
		return { container, tiles, panel, hint, expanded };
	};

	it("is a named group of three buttons on one panel, closed at rest with the frame's footer", () => {
		const { container, tiles, panel, hint, expanded } = setup();
		expect(tiles).toHaveLength(3);
		expect(container.querySelector("[role=group]")?.getAttribute("aria-label")).toMatch(/^Stats: each one shows the sector and peer benchmarks$/);
		expect(new Set(tiles.map((t) => t.getAttribute("aria-controls"))).size).toBe(1);
		expect(expanded()).toEqual(["false", "false", "false"]);
		expect(panel().hidden).toBe(true);
		expect(hint()).toBe(FOOTER);
	});

	it("keeps the benchmarks open when another stat is pressed; only the stat pressed last hides them", () => {
		const { tiles, panel, hint, expanded } = setup();
		act(() => tiles[0]!.click());
		expect(panel().hidden).toBe(false);
		expect(panel().textContent).toBe(BENCH);
		expect(expanded()).toEqual(["true", "true", "true"]);
		expect(hint()).toBe(hideHint("P/E ratio"));
		// the hunt's slip: the second tile closed what the footer had promised
		act(() => tiles[1]!.click());
		expect(panel().hidden).toBe(false);
		expect(hint()).toBe("Tap Revenue growth again to hide the benchmarks");
		act(() => tiles[2]!.click());
		expect(panel().hidden).toBe(false);
		act(() => tiles[2]!.click());
		expect(panel().hidden).toBe(true);
		expect(expanded()).toEqual(["false", "false", "false"]);
		expect(hint()).toBe(FOOTER);
	});

	it("draws plain tiles, and no footer promising benchmarks, where there is no benchmark line to open (review r2b low 6)", () => {
		const { container } = render(<StatGrid stats={STATS} footer={FOOTER} inner="#181f30" />);
		expect(container.querySelectorAll("button")).toHaveLength(0);
		expect(container.querySelector("[role=group]")).toBeNull();
		// "Tap a stat for sector and peer benchmarks" over tiles that open nothing was a promise the card could not keep
		expect(container.textContent).not.toContain(FOOTER);
		expect(container.querySelectorAll("p")).toHaveLength(0);
		// the three tiles are all there is
		expect(container.textContent).toBe("P/E ratio52.8RichRevenue growth62%ExplosiveProfit margin48.9%Strong");
	});

	it("has no benchmark line, and so no footer, for the one company nobody can be compared with on any measure (SPCE)", async () => {
		await loadCatalog();
		expect(allTickers()).toContain("SPCE");
		expect(benchmarksFor("SPCE")).toBeUndefined();
		// every other catalog company has a line: the footer stays the frames' for them
		expect(allTickers().filter((T) => benchmarksFor(T) === undefined)).toEqual(["SPCE"]);
	});
});

describe("the Practice buy ticket runs the one order rule (N27n, N30.3a; ST-01, ST-12b)", () => {
	const open = (over: Partial<Parameters<typeof PracticeBuySheet>[0]> = {}) => {
		const onConfirm = vi.fn();
		const view = render(<PracticeBuySheet ticker="COST" name="Costco" initial="C" price={918.2} changeShort="▲ 0.4%" cash={8800} offsetY={0} onClose={() => {}} onConfirm={onConfirm} {...over} />);
		const confirm = () => [...document.querySelectorAll("button")].find((b) => /Confirm practice buy/.test(b.textContent ?? ""))!;
		const type = (value: string) => {
			act(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Custom")?.click());
			fireEvent.change(document.querySelector("input")!, { target: { value } });
		};
		const caption = () => document.querySelector("[role=status]")?.textContent ?? null;
		return { ...view, onConfirm, confirm, type, caption };
	};

	it("opens on $25 with Confirm available and the shares line", () => {
		const t = open();
		expect(t.confirm().disabled).toBe(false);
		expect(t.caption()).toBeNull();
		expect(document.body.textContent).toContain("You get");
		expect(document.body.textContent).toContain("0.0272");
	});

	it("refuses an order of nothing, with the reason in the caption: $0.01 of COST is no order", () => {
		const t = open();
		t.type("0.01");
		expect(t.confirm().disabled).toBe(true);
		expect(t.caption()).toBe("The smallest practice buy is $1.00");
		expect(t.caption()).toBe(refusalLine("too-small", { ticker: "COST", side: "buy", price: 918.2 }));
		act(() => t.confirm().click());
		expect(t.onConfirm).not.toHaveBeenCalled();
		t.type("0.99");
		expect(t.confirm().disabled).toBe(true);
		// a dollar is an order
		t.type("1");
		expect(t.confirm().disabled).toBe(false);
		expect(t.caption()).toBeNull();
		// an empty field is no order either
		t.type("");
		expect(t.confirm().disabled).toBe(true);
		expect(t.caption()).toBe("The smallest practice buy is $1.00");
	});

	it("says how much cash is left when the amount is more than it, for a pressed chip too", () => {
		const t = open({ cash: 15 });
		expect(t.confirm().disabled).toBe(true);
		expect(t.caption()).toBe("Only $15.00 of paper cash left");
		act(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "$10")!.click());
		expect(t.confirm().disabled).toBe(false);
		expect(t.caption()).toBeNull();
	});

	it("cannot buy a company without a price, and says so", () => {
		const t = open({ ticker: "BABA", name: "Alibaba", price: 0 });
		expect(t.confirm().disabled).toBe(true);
		expect(t.caption()).toBe("BABA has no price right now, so it cannot be bought");
		expect(document.body.textContent).toContain("— today");
		expect(document.body.textContent).not.toContain("You get");
	});

	it("stays up and prints the store's reason when the store refuses a confirmed order", async () => {
		const onConfirm = vi.fn().mockResolvedValue("insufficient");
		const t = open({ onConfirm, cash: 8800 });
		await act(async () => {
			t.confirm().click();
		});
		expect(onConfirm).toHaveBeenCalledWith(25, 0.0272);
		expect(t.caption()).toBe("Only $8,800.00 of paper cash left");
		expect(t.confirm().disabled).toBe(true);
		// another amount is a new order
		act(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "$10")!.click());
		expect(t.caption()).toBeNull();
		expect(t.confirm().disabled).toBe(false);
	});
});

describe("'Avg' stands under the end of the bar it names (CH-03, N30.8e)", () => {
	it("is placed at the average's share of the track, kept clear of Low and High", () => {
		expect(avgLeft(0.668)).toBe(`clamp(${AVG_KEEP}px, 66.8000%, calc(100% - ${AVG_KEEP}px))`);
		expect(avgLeft(0)).toContain("0.0000%");
		expect(avgLeft(1.4)).toContain("100.0000%");
		expect(AVG_KEEP).toBeGreaterThanOrEqual(41 + 8 + 21);
	});
});
