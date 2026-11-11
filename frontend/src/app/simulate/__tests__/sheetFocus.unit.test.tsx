import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Stock } from "../data";
import { takesFirstFocus } from "../ui";

describe("which chip takes a ticket's first focus (ui.tsx takesFirstFocus)", () => {
	const amounts = [10, 25, 50, 100] as const;
	const focused = (pressed: number | null) => amounts.filter((a) => takesFirstFocus(amounts, pressed, a));

	it("is the pressed chip, and only that one", () => {
		expect(focused(25)).toEqual([25]);
		expect(focused(100)).toEqual([100]);
		expect(focused(10)).toEqual([10]);
	});

	it("is the first chip when none is pressed (the Custom field shows a typed figure)", () => {
		expect(focused(null)).toEqual([10]);
	});

	it("is the first chip when the pressed value is not one of the row's chips", () => {
		expect(focused(37)).toEqual([10]);
	});

	it("reads portions the same way (All first on the Portfolio's sheet)", () => {
		const portions = [1, 0.5] as const;
		expect(portions.filter((p) => takesFirstFocus(portions, 1, p))).toEqual([1]);
		expect(portions.filter((p) => takesFirstFocus(portions, 0.5, p))).toEqual([0.5]);
		expect(portions.filter((p) => takesFirstFocus(portions, null, p))).toEqual([1]);
	});
});

/**
 * The tickets themselves, opened at each size: the shared Sheet focuses the control marked `data-autofocus` as it
 * opens, so the marked chip is where a keyboard or screen-reader user starts. jsdom has no modal dialog (the Sheet
 * falls back to the `open` attribute on its own) and no media queries: the size regime is the one the stubbed
 * matchMedia reports to FitCanvas (read when its module loads, so the sheets are loaded afresh for each size, once,
 * before that size's tests: the first load of the module graph can take seconds when the whole suite runs).
 */
type Size = "desktop" | "tablet" | "phone";
const SIZES: Size[] = ["desktop", "tablet", "phone"];
const NVDA: Stock = { name: "NVIDIA Corp.", nameConfirm: "NVIDIA Corp", price: 122.1, pct: "▲ 2.4%", up: true, initial: "N" };

async function sheetsAt(size: Size) {
	vi.resetModules();
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: query === "(width < 1024px)" ? size !== "desktop" : query === "(width < 640px)" ? size === "phone" : false,
		media: query,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	}));
	const [rtl, sheets] = await Promise.all([import("@testing-library/react"), import("../sheets")]);
	return { render: rtl.render, cleanup: rtl.cleanup, ...sheets };
}

/** The one control the open sheet marked for its first focus, which the Sheet then focused. */
function firstFocus(): { label: string; pressed: boolean } {
	const marked = document.querySelectorAll<HTMLElement>("dialog [data-autofocus]");
	expect(marked, "one control takes the first focus").toHaveLength(1);
	expect(document.activeElement).toBe(marked[0]);
	return { label: marked[0]!.textContent ?? "", pressed: marked[0]!.getAttribute("aria-pressed") === "true" };
}
const customField = () => document.querySelector<HTMLInputElement>("dialog input[type=number]");
const nothing = () => undefined;

beforeAll(() => {
	// the Sheet closes its dialog as it unmounts
	if (typeof HTMLDialogElement.prototype.close !== "function") {
		HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
			this.removeAttribute("open");
		};
	}
});

describe.each(SIZES)("a ticket opens on its pressed chip at every size: %s", (size) => {
	let at: Awaited<ReturnType<typeof sheetsAt>>;
	beforeAll(async () => {
		at = await sheetsAt(size);
	}, 120_000);
	afterEach(() => at.cleanup());
	afterAll(() => vi.unstubAllGlobals());

	it("the buy ticket on the frame's $25", () => {
		const { render, AddConfirmSheet } = at;
		render(<AddConfirmSheet symbol="NVDA" stock={NVDA} cash={8800} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(firstFocus()).toEqual({ label: "$25", pressed: true });
		// the size under test is the one the sheet sees: below 1024 its chip row leaves the Tab sequence (useCompactSheet)
		expect(document.querySelector("dialog [role=group]")?.getAttribute("tabindex")).toBe(size === "desktop" ? null : "-1");
	});

	it("the buy ticket on the amount Try again restores", () => {
		const { render, AddConfirmSheet } = at;
		render(<AddConfirmSheet symbol="NVDA" stock={NVDA} cash={8800} initialAmount={100} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(firstFocus()).toEqual({ label: "$100", pressed: true });
	});

	it("the buy ticket on its first chip when Try again restores a typed amount: the Custom field shows it, unfocused", () => {
		const { render, AddConfirmSheet } = at;
		render(<AddConfirmSheet symbol="NVDA" stock={NVDA} cash={8800} initialAmount={37} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(firstFocus()).toEqual({ label: "$10", pressed: false });
		expect(customField()?.value).toBe("37");
		expect(document.querySelectorAll("dialog button[aria-pressed=true]")).toHaveLength(0);
	});

	it("the pick page's sell sheet on the frame's 50%, or the portion Try again restores", () => {
		const { render, SellConfirmSheet } = at;
		const first = render(<SellConfirmSheet symbol="NVDA" stock={NVDA} shares={1.0152} value={124} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(firstFocus()).toEqual({ label: "50%", pressed: true });
		first.unmount();
		const all = render(<SellConfirmSheet symbol="NVDA" stock={NVDA} shares={1.0152} value={124} initialPortion={1} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(firstFocus()).toEqual({ label: "All", pressed: true });
		all.unmount();
		render(<SellConfirmSheet symbol="NVDA" stock={NVDA} shares={1.0152} value={124} initialPortion={0.3} motion={false} onConfirm={nothing} onClose={nothing} />);
		expect(firstFocus()).toEqual({ label: "25%", pressed: false });
		expect(customField()?.value).toBe("30");
	});

	it("the Portfolio's sell sheet on the frame's All, or the portion Try again restores", () => {
		const { render, PortfolioSellSheet } = at;
		const first = render(<PortfolioSellSheet symbol="NVDA" stock={NVDA} shares={1.0152} stake={100} value={124} onConfirm={nothing} onClose={nothing} />);
		expect(firstFocus()).toEqual({ label: "All", pressed: true });
		first.unmount();
		const half = render(<PortfolioSellSheet symbol="NVDA" stock={NVDA} shares={1.0152} stake={100} value={124} initialPortion={0.5} onConfirm={nothing} onClose={nothing} />);
		expect(firstFocus()).toEqual({ label: "Half", pressed: true });
		half.unmount();
		render(<PortfolioSellSheet symbol="NVDA" stock={NVDA} shares={1.0152} stake={100} value={124} initialPortion={0.3} onConfirm={nothing} onClose={nothing} />);
		expect(firstFocus()).toEqual({ label: "All", pressed: false });
		expect(customField()?.value).toBe("30");
	});
});
