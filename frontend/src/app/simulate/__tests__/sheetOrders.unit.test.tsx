/**
 * The tickets and the store's rule for an order (fix round of 2026-11-09; coordinator rulings N23e, N27i, N27j, N28d,
 * N29f, N30.3a; the hunt's NUM-01, ST-05, ST-12a, ST-13, ST-18): a ticket runs the store's own check on what is on show,
 * keeps Confirm disabled while it fails and says why; the sell sheets preview the sale by the ledger's own arithmetic;
 * the choice is reported for the page to keep in the address; the day's move is coloured by the figure as printed.
 * The sheets are rendered as they are in the app (jsdom; the stubbed matchMedia is a desktop window).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { money, paperSale, paperShares, shares4 } from "@/app/live";
import type { Stock } from "../data";

const NVDA: Stock = { name: "NVIDIA Corp", nameConfirm: "NVIDIA Corp.", price: 122.1, pct: "▲ 2.4%", up: true, initial: "N" };
const nothing = () => undefined;

type Loaded = typeof import("../sheets") & { render: (typeof import("@testing-library/react"))["render"]; cleanup: () => void; fireEvent: (typeof import("@testing-library/react"))["fireEvent"] };
let at: Loaded;

beforeAll(async () => {
	if (typeof HTMLDialogElement.prototype.close !== "function") {
		HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
			this.removeAttribute("open");
		};
	}
	vi.resetModules();
	vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
	const [rtl, sheets] = await Promise.all([import("@testing-library/react"), import("../sheets")]);
	at = { ...sheets, render: rtl.render, cleanup: rtl.cleanup, fireEvent: rtl.fireEvent };
}, 120_000);
afterEach(() => at.cleanup());
afterAll(() => vi.unstubAllGlobals());

const button = (name: string) => Array.from(document.querySelectorAll<HTMLButtonElement>("dialog button")).find((b) => (b.textContent ?? "").trim() === name)!;
const disabled = (b: HTMLButtonElement) => b.disabled || b.getAttribute("aria-disabled") === "true";
const alerts = () => Array.from(document.querySelectorAll("dialog [role=alert]"), (el) => el.textContent ?? "");
const field = () => document.querySelector<HTMLInputElement>("dialog input[type=number]")!;
const text = () => document.querySelector("dialog")?.textContent ?? "";
const type = (value: string) => at.fireEvent.change(field(), { target: { value } });

describe("the buy ticket says why an order cannot be placed (N27i; ST-12a, ST-13)", () => {
	it("a pressed chip the cash cannot cover gets the reason too, in the stock ticket's words", () => {
		const onConfirm = vi.fn();
		at.render(<at.AddConfirmSheet symbol="CRWD" stock={{ ...NVDA, price: 361.4 }} cash={15} motion={false} onConfirm={onConfirm} onClose={nothing} />);
		expect(alerts()).toEqual(["Only $15.00 of paper cash left"]);
		expect(disabled(button("Confirm practice buy"))).toBe(true);
		// the reason stands alone: no "You get 0.0000 shares" under it (follow-up S3; this test expected "0.0000" before)
		expect(text()).not.toContain("You get");
		expect(text()).not.toContain("0.0000");
		at.fireEvent.click(button("Confirm practice buy"));
		expect(onConfirm).not.toHaveBeenCalled();
		// a chip that fits is an order again
		at.fireEvent.click(button("$10"));
		expect(alerts()).toEqual([]);
		expect(disabled(button("Confirm practice buy"))).toBe(false);
		expect(text()).toContain(`You get${shares4(paperShares(10, 361.4))}shares of CRWD`);
	});

	it("an amount under the $1.00 minimum is refused on the ticket, not after Confirm", () => {
		const onConfirm = vi.fn();
		at.render(<at.AddConfirmSheet symbol="NVDA" stock={NVDA} cash={8800} motion={false} onConfirm={onConfirm} onClose={nothing} />);
		at.fireEvent.click(button("Custom"));
		// an empty field has asked for nothing yet: Confirm waits, without a complaint
		expect(alerts()).toEqual([]);
		expect(disabled(button("Confirm practice buy"))).toBe(true);
		expect(text()).toContain("You get0.0000shares of NVDA");
		type("0.004");
		expect(alerts()).toEqual(["The smallest practice buy is $1.00"]);
		expect(disabled(button("Confirm practice buy"))).toBe(true);
		expect(field().getAttribute("aria-invalid")).toBe("true");
		type("0.99");
		expect(alerts()).toEqual(["The smallest practice buy is $1.00"]);
		type("1");
		expect(alerts()).toEqual([]);
		expect(disabled(button("Confirm practice buy"))).toBe(false);
		type("9000");
		expect(alerts()).toEqual(["Only $8,800.00 of paper cash left"]);
	});

	// follow-up S3 (the ledger's review of 2026-11-09): /simulate?modal=add-confirm&symbol=COST, Custom, 0.01 printed "The
	// smallest practice buy is $1.00" and under it "You get 0.0000 shares of COST"
	it("draws no shares line while it says why the order cannot be placed, as the stock page's ticket does", () => {
		const COST: Stock = { name: "Costco", nameConfirm: "Costco", price: 918.2, pct: "▼ 0.4%", up: false, initial: "C" };
		at.render(<at.AddConfirmSheet symbol="COST" stock={COST} cash={8800} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(text()).toContain(`You get${shares4(paperShares(25, 918.2))}shares of COST`);
		at.fireEvent.click(button("Custom"));
		type("0.01");
		expect(alerts()).toEqual(["The smallest practice buy is $1.00"]);
		expect(text()).not.toContain("You get");
		expect(text()).not.toContain("shares of COST");
		type("9000");
		expect(alerts()).toEqual(["Only $8,800.00 of paper cash left"]);
		expect(text()).not.toContain("You get");
		// an amount the ticket takes prints its shares again
		type("100");
		expect(alerts()).toEqual([]);
		expect(text()).toContain(`You get${shares4(paperShares(100, 918.2))}shares of COST`);
		// and so does the chip the field gives way to
		at.fireEvent.click(button("$50"));
		expect(text()).toContain(`You get${shares4(paperShares(50, 918.2))}shares of COST`);
	});

	it("draws no shares line under a reason in the alternate ticket either (2:1079 Buy PLTR?)", () => {
		const PLTR: Stock = { name: "Palantir Technologies", nameConfirm: "Palantir Technologies", price: 28.4, pct: "▲ 1.1%", up: true, initial: "P" };
		at.render(<at.AddConfirmSheet symbol="PLTR" stock={PLTR} alt cash={15} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(alerts()).toEqual(["Only $15.00 of paper cash left"]);
		expect(text()).not.toContain("You get");
		at.fireEvent.click(button("$10"));
		expect(text()).toContain(`You get${shares4(paperShares(10, 28.4))}shares of PLTR`);
	});

	it("a company without a price cannot be bought and says so", () => {
		at.render(<at.AddConfirmSheet symbol="SNAP" stock={{ ...NVDA, price: 0 }} cash={8800} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(alerts()).toEqual(["SNAP has no price right now, so it cannot be bought"]);
		expect(disabled(button("Confirm practice buy"))).toBe(true);
	});

	it("says the store's own refusal the same way, until the amount changes", () => {
		const view = at.render(<at.AddConfirmSheet symbol="NVDA" stock={NVDA} cash={8800} refusal="insufficient" motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(alerts()).toEqual(["Only $8,800.00 of paper cash left"]);
		expect(text()).not.toContain("You get");
		view.rerender(<at.AddConfirmSheet symbol="NVDA" stock={NVDA} cash={8800} refusal={null} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(alerts()).toEqual([]);
		expect(text()).toContain(`You get${shares4(paperShares(25, 122.1))}shares of NVDA`);
	});
});

describe("the amount and the portion are reported for the address (N27j / N29f; ST-18)", () => {
	it("reports the pressed chip and the typed amount of the buy ticket", () => {
		const onAmount = vi.fn();
		at.render(<at.AddConfirmSheet symbol="NVDA" stock={NVDA} cash={8800} motion={false} onAmount={onAmount} onConfirm={nothing} onClose={nothing} />);
		at.fireEvent.click(button("$50"));
		expect(onAmount).toHaveBeenLastCalledWith(50);
		at.fireEvent.click(button("Custom"));
		type("37");
		expect(onAmount).toHaveBeenLastCalledWith(37);
		// an emptied field stands for the chip it replaced
		type("");
		expect(onAmount).toHaveBeenLastCalledWith(50);
	});

	it("opens the buy ticket on the amount the address kept", () => {
		at.render(<at.AddConfirmSheet symbol="NVDA" stock={NVDA} cash={8800} initialAmount={50} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(button("$50").getAttribute("aria-pressed")).toBe("true");
		expect(button("$25").getAttribute("aria-pressed")).toBe("false");
		expect(text()).toContain(shares4(paperShares(50, 122.1)));
	});

	it("reports the pressed portion and the typed share of the sell sheets", () => {
		const onPortion = vi.fn();
		const pick = at.render(<at.SellConfirmSheet symbol="NVDA" stock={NVDA} shares={1.0152} value={124} motion={false} onPortion={onPortion} onConfirm={nothing} onClose={nothing} />);
		at.fireEvent.click(button("75%"));
		expect(onPortion).toHaveBeenLastCalledWith(0.75);
		at.fireEvent.click(button("Custom"));
		type("33");
		expect(onPortion).toHaveBeenLastCalledWith(0.33);
		pick.unmount();
		at.render(<at.PortfolioSellSheet symbol="NVDA" stock={NVDA} shares={1.0152} stake={100} value={124} onPortion={onPortion} onConfirm={nothing} onClose={nothing} />);
		at.fireEvent.click(button("Half"));
		expect(onPortion).toHaveBeenLastCalledWith(0.5);
	});

	// review r2 low 6: typing 0.001 into the sell sheet's Custom field wrote "?portion=0.00001" for a sale the sheet
	// refuses (a reload then showed a field holding "0"), and 99.999 wrote the float 0.9999899999999999
	it("writes a typed amount to the address only while the ticket would take it, else the chip the field replaced", () => {
		const onAmount = vi.fn();
		at.render(<at.AddConfirmSheet symbol="NVDA" stock={NVDA} cash={8800} motion={false} onAmount={onAmount} onConfirm={nothing} onClose={nothing} />);
		at.fireEvent.click(button("$50"));
		at.fireEvent.click(button("Custom"));
		type("0.5");
		expect(alerts()).toEqual(["The smallest practice buy is $1.00"]);
		expect(onAmount).toHaveBeenLastCalledWith(50);
		type("37.5");
		expect(onAmount).toHaveBeenLastCalledWith(37.5);
		type("9000");
		expect(alerts()).toEqual(["Only $8,800.00 of paper cash left"]);
		expect(onAmount).toHaveBeenLastCalledWith(50);
		type("12.3456789");
		expect(onAmount).toHaveBeenLastCalledWith(12.345679);
		for (const call of onAmount.mock.calls) expect([0.5, 9000]).not.toContain(call[0]);
	});

	it("writes a typed share to the address only while the sheet would take it, to six decimals", () => {
		// the persona's TSLA: 0.4749 shares at $248.50
		const TSLA: Stock = { name: "Tesla", nameConfirm: "Tesla", price: 248.5, pct: "▼ 7.0%", up: false, initial: "T" };
		const exact = { shares: 0.4749, price: 248.5 };
		const onPortion = vi.fn();
		const pick = at.render(<at.SellConfirmSheet symbol="TSLA" stock={TSLA} shares={0.4749} value={118.01} exact={exact} motion={false} onPortion={onPortion} onConfirm={nothing} onClose={nothing} />);
		at.fireEvent.click(button("Custom"));
		type("0.001");
		expect(alerts()).toEqual(["That sale rounds to nothing"]);
		expect(onPortion).toHaveBeenLastCalledWith(0.5);
		type("99.999");
		expect(alerts()).toEqual([]);
		expect(onPortion).toHaveBeenLastCalledWith(0.99999);
		type("150");
		expect(onPortion).toHaveBeenLastCalledWith(0.5);
		type("12.5");
		expect(onPortion).toHaveBeenLastCalledWith(0.125);
		type("");
		expect(onPortion).toHaveBeenLastCalledWith(0.5);
		for (const call of onPortion.mock.calls) expect(String(call[0]).length).toBeLessThanOrEqual(8);
		pick.unmount();
		// the Portfolio's sheet: the same rule, its own default chip (All)
		onPortion.mockClear();
		at.render(<at.PortfolioSellSheet symbol="TSLA" stock={TSLA} shares={0.4749} stake={100} value={118.01} exact={exact} onPortion={onPortion} onConfirm={nothing} onClose={nothing} />);
		at.fireEvent.click(button("Custom"));
		type("0.001");
		expect(onPortion).toHaveBeenLastCalledWith(1);
		type("99.999");
		expect(onPortion).toHaveBeenLastCalledWith(0.99999);
		type("33.33");
		expect(onPortion).toHaveBeenLastCalledWith(0.3333);
	});

	it("opens the sell sheet on the portion the address kept", () => {
		at.render(<at.SellConfirmSheet symbol="NVDA" stock={NVDA} shares={1.0152} value={124} initialPortion={0.75} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(button("75%").getAttribute("aria-pressed")).toBe("true");
		expect(button("50%").getAttribute("aria-pressed")).toBe("false");
	});
});

describe("the sell sheets preview the sale the ledger books (N23e / N28e; NUM-01, ST-04, ST-05)", () => {
	// the persona's TSLA as the hunt met it: 0.4749 shares at $248.50, worth $118.01
	const TSLA: Stock = { name: "Tesla", nameConfirm: "Tesla", price: 248.5, pct: "▼ 7.0%", up: false, initial: "T" };
	const held = 0.4749;
	const worth = 118.01;

	it("prints the ledger's proceeds and shares for the portion, not the value times the portion", () => {
		const onConfirm = vi.fn();
		at.render(<at.SellConfirmSheet symbol="TSLA" stock={TSLA} shares={held} value={worth} exact={{ shares: held, price: 248.5 }} motion={false} onConfirm={onConfirm} onClose={nothing} />);
		for (const [label, frac] of [["25%", 0.25], ["50%", 0.5], ["75%", 0.75], ["All", 1]] as const) {
			at.fireEvent.click(button(label));
			const booked = paperSale(held, held * frac, 248.5);
			expect(text()).toContain(`You get back${money(booked.proceeds)}for ${shares4(booked.shares)} shares`);
		}
		// half: the ledger returns $59.00 (the $118.01 less the $59.01 left), where the value times the portion is $59.005
		at.fireEvent.click(button("50%"));
		expect(text()).toContain("You get back$59.00for");
		at.fireEvent.click(button("Confirm practice sell"));
		expect(onConfirm).toHaveBeenCalledWith(0.5);
	});

	it("keeps the frame's own sum where the frame's figures are on show (no ledger figures)", () => {
		at.render(<at.SellConfirmSheet symbol="NVDA" stock={NVDA} shares={1.0152} value={124} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(text()).toContain("You get back$62.00for 0.5076 shares");
		expect(alerts()).toEqual([]);
	});

	it("refuses a sale that rounds to nothing, and says so", () => {
		const onConfirm = vi.fn();
		at.render(<at.SellConfirmSheet symbol="NVDA" stock={NVDA} shares={1.0152} value={123.96} exact={{ shares: 1.0152, price: 122.1 }} motion={false} onConfirm={onConfirm} onClose={nothing} />);
		at.fireEvent.click(button("Custom"));
		expect(alerts()).toEqual([]);
		type("0.001");
		expect(alerts()).toEqual(["That sale rounds to nothing"]);
		expect(disabled(button("Confirm practice sell"))).toBe(true);
		// the reason stands alone: no "You get back $0.00 for 0.0000 shares" under it (N36.3c; this test expected that line
		// before, as the buy ticket's test expected "You get 0.0000 shares" before follow-up S3)
		expect(text()).not.toContain("You get back");
		expect(text()).not.toContain("0.0000 shares");
		at.fireEvent.click(button("Confirm practice sell"));
		expect(onConfirm).not.toHaveBeenCalled();
		// more than is held keeps its own line, alone
		type("150");
		expect(alerts()).toEqual(["That is more than you hold. Up to 100% fits."]);
		expect(text()).not.toContain("You get back");
		// an emptied field has asked for nothing yet: no reason, and the line of a sale of nothing, as on the buy ticket
		type("");
		expect(alerts()).toEqual([]);
		expect(text()).toContain("You get back$0.00for 0.0000 shares");
		type("40");
		expect(alerts()).toEqual([]);
		expect(disabled(button("Confirm practice sell"))).toBe(false);
		expect(text()).toContain(`You get back${money(paperSale(1.0152, 1.0152 * 0.4, 122.1).proceeds)}for`);
	});

	it("the Portfolio's sheet draws no 'Returning' line while it says why either (N36.3c)", () => {
		const onConfirm = vi.fn();
		at.render(<at.PortfolioSellSheet symbol="NVDA" stock={NVDA} shares={1.0152} stake={100} value={123.96} exact={{ shares: 1.0152, price: 122.1 }} onConfirm={onConfirm} onClose={nothing} />);
		expect(text()).toContain(`Returning${money(paperSale(1.0152, 1.0152, 122.1).proceeds)}to your cash`);
		at.fireEvent.click(button("Custom"));
		type("0.001");
		expect(alerts()).toEqual(["That sale rounds to nothing"]);
		expect(text()).not.toContain("Returning");
		expect(disabled(button("Sell"))).toBe(true);
		type("150");
		expect(alerts()).toEqual(["That is more than you hold. Up to 100% fits."]);
		expect(text()).not.toContain("Returning");
		type("50");
		expect(alerts()).toEqual([]);
		expect(text()).toContain(`Returning${money(paperSale(1.0152, 0.5076, 122.1).proceeds)}to your cash`);
	});

	it("the store's own refusal of a sale the sheet let through hides the line too, on both sheets", () => {
		at.render(<at.SellConfirmSheet symbol="NVDA" stock={NVDA} shares={1.0152} value={123.96} exact={{ shares: 1.0152, price: 122.1 }} refusal="nothing-held" motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(alerts()).toHaveLength(1);
		expect(text()).not.toContain("You get back");
		at.cleanup();
		at.render(<at.PortfolioSellSheet symbol="NVDA" stock={NVDA} shares={1.0152} stake={100} value={123.96} exact={{ shares: 1.0152, price: 122.1 }} refusal="nothing-held" onConfirm={nothing} onClose={nothing} />);
		expect(alerts()).toHaveLength(1);
		expect(text()).not.toContain("Returning");
	});

	it("previews the Portfolio's sheet the same way, with the stake in cents when it is not whole", () => {
		at.render(<at.PortfolioSellSheet symbol="TSLA" stock={TSLA} shares={held} stake={100.01} value={worth} exact={{ shares: held, price: 248.5 }} onConfirm={nothing} onClose={nothing} />);
		expect(text()).toContain("You hold 0.4749 shares from your $100.01 stake.");
		expect(text()).toContain(`Returning${money(worth)}to your cash`);
		at.fireEvent.click(button("Half"));
		expect(text()).toContain("Returning$59.00to your cash");
	});
});

describe("the day's move is coloured by the figure as printed (N28d)", () => {
	const moveClass = (pct: string) => {
		at.render(<at.BuyFailedSheet stock={{ ...NVDA, pct }} onRetry={nothing} onClose={nothing} />);
		const el = Array.from(document.querySelectorAll("dialog p")).find((p) => p.textContent === pct)!;
		const cls = el.className;
		at.cleanup();
		return cls;
	};

	it("green for a rise, the sheets' red for a fall, the label grey for a move that prints as zero", () => {
		expect(moveClass("▲ 2.4%")).toContain("text-[#2fd08a]");
		expect(moveClass("▼ 0.4%")).toContain("text-[#e5484d]");
		expect(moveClass("0.0%")).toContain("text-[#819abb]");
		// a caller that still prints an arrow beside a zero is drawn flat as well
		expect(moveClass("▲ 0.0%")).toContain("text-[#819abb]");
	});
});
