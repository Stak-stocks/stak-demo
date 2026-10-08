import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrandSummary } from "@stak/shared";

const recordSwipe = vi.fn();

vi.mock("@/lib/api", () => ({
	recordSwipe: (...args: unknown[]) => recordSwipe(...args),
	getStockData: vi.fn().mockResolvedValue({ quote: { price: 123.45, changePercent: 2.4 }, metrics: {} }),
	getBrandTip: vi.fn().mockResolvedValue({ tip: "Chip stocks swing hard. Small stakes, long views." }),
}));

import { DiscoverDeck } from "../DiscoverDeck";

const brand = (id: string, ticker: string, name: string): BrandSummary => ({
	id, ticker, name, bio: `${name} makes things`, heroImage: "", interestCategories: ["tech"],
} as unknown as BrandSummary);

const BRANDS = [brand("nvidia", "NVDA", "NVIDIA"), brand("apple", "AAPL", "Apple"), brand("tesla", "TSLA", "Tesla")];

function setup(overrides: Partial<React.ComponentProps<typeof DiscoverDeck>> = {}) {
	const undoSave = vi.fn();
	const undoPass = vi.fn();
	const props = {
		brands: BRANDS,
		paletteOf: () => 0,
		limit: 10,
		swipeCount: 0,
		stakSize: 0,
		initialSaved: 0,
		initialPassed: 0,
		onSave: vi.fn(() => undoSave),
		onPass: vi.fn(() => undoPass),
		onLearnMore: vi.fn(),
		onReview: vi.fn(),
		bumpOptimistic: vi.fn(),
		reportSwipeResult: vi.fn(),
		...overrides,
	};
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const utils = render(
		<QueryClientProvider client={client}>
			<DiscoverDeck {...props} />
		</QueryClientProvider>,
	);
	return { ...utils, props, undoSave, undoPass };
}

/** The undo toast's sentence is split so only the name truncates; match its whole text. */
const toastMatch = (text: string) => (_: string, el: Element | null) =>
	!!el?.hasAttribute("data-toast-text") && (el.textContent ?? "").replace(/\s+/g, " ").trim() === text;
const toastText = (text: string) => screen.getByText(toastMatch(text));
const queryToastText = (text: string) => screen.queryByText(toastMatch(text));

describe("DiscoverDeck", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		recordSwipe.mockReset();
		recordSwipe.mockResolvedValue({ success: true, dailySwipeCount: 1, dailySwipeLimit: 10 });
	});
	afterEach(() => vi.useRealTimers());

	it("shows the front card's ticker line and the count/limit ring", () => {
		setup();
		expect(screen.getByText("NVDA · NVIDIA")).toBeInTheDocument();
		expect(screen.getByText("1/10")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Pass on NVIDIA/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Add NVIDIA to your STAK/ })).toBeInTheDocument();
	});

	it("STAK saves at once, offers Undo, and tells the server only after the 3s window", () => {
		const { props } = setup();
		fireEvent.click(screen.getByRole("button", { name: /Add NVIDIA to your STAK/ }));

		expect(props.onSave).toHaveBeenCalledWith(BRANDS[0]);
		expect(toastText("NVIDIA added to your STAK")).toBeInTheDocument();
		expect(recordSwipe).not.toHaveBeenCalled();

		// Not while the Undo could still be on screen (it leaves at 3s; the send waits a beat longer).
		act(() => { vi.advanceTimersByTime(3000); });
		expect(recordSwipe).not.toHaveBeenCalled();
		act(() => { vi.advanceTimersByTime(400); });
		expect(recordSwipe).toHaveBeenCalledWith("nvidia", "right", expect.objectContaining({ ticker: "NVDA" }), { keepalive: false });
		expect(props.bumpOptimistic).toHaveBeenCalledTimes(1);
	});

	it("Undo reverts the pass and the server never hears about it", async () => {
		const { props, undoPass } = setup();
		fireEvent.click(screen.getByRole("button", { name: /Pass on NVIDIA/ }));
		expect(toastText("Passed on NVIDIA")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Undo" }));
		expect(undoPass).toHaveBeenCalledTimes(1);
		await act(async () => {});
		expect(queryToastText("Passed on NVIDIA")).not.toBeInTheDocument();

		act(() => { vi.advanceTimersByTime(5000); });
		expect(recordSwipe).not.toHaveBeenCalled();
		expect(props.bumpOptimistic).not.toHaveBeenCalled();
	});

	it("a full STAK snaps the card back with a notice and records nothing", () => {
		const { props } = setup({ onSave: vi.fn(() => "full" as const) });
		fireEvent.click(screen.getByRole("button", { name: /Add NVIDIA to your STAK/ }));

		expect(screen.getByText("Your STAK is full — remove a stock to save another")).toBeInTheDocument();
		expect(queryToastText("NVIDIA added to your STAK")).not.toBeInTheDocument();
		act(() => { vi.advanceTimersByTime(5000); });
		expect(recordSwipe).not.toHaveBeenCalled();
		expect(props.onPass).not.toHaveBeenCalled();
	});

	it("only deals as many cards as the daily limit has left", () => {
		setup({ limit: 10, swipeCount: 10 });
		expect(screen.getByText("Deck complete")).toBeInTheDocument();
		expect(screen.getByText("Ten cards, ten signals. Your taste graph got smarter.")).toBeInTheDocument();
	});

	it("undoing the swipe that used the last card brings the card back", async () => {
		const { undoPass } = setup({ limit: 1 });
		fireEvent.click(screen.getByRole("button", { name: /Pass on NVIDIA/ }));
		expect(screen.getByText("Deck complete")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Undo" }));
		await act(async () => {});
		expect(undoPass).toHaveBeenCalledTimes(1);
		expect(screen.queryByText("Deck complete")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Pass on NVIDIA/ })).toBeInTheDocument();
	});

	it("a double tap before the deck updates decides the card only once", () => {
		const { props } = setup();
		const pass = screen.getByRole("button", { name: /Pass on NVIDIA/ });
		fireEvent.click(pass);
		fireEvent.click(pass);
		expect(props.onPass).toHaveBeenCalledTimes(1);
		act(() => { vi.advanceTimersByTime(5000); });
		expect(recordSwipe).toHaveBeenCalledTimes(1);
	});

	it("a card brought back by Undo can be decided again", async () => {
		const { props } = setup();
		fireEvent.click(screen.getByRole("button", { name: /Pass on NVIDIA/ }));
		fireEvent.click(screen.getByRole("button", { name: "Undo" }));
		await act(async () => {});
		fireEvent.click(screen.getByRole("button", { name: /Add NVIDIA to your STAK/ }));
		expect(props.onSave).toHaveBeenCalledTimes(1);
		expect(toastText("NVIDIA added to your STAK")).toBeInTheDocument();
	});

	it("a toast on its way out can't be tapped (its decision is past undoing)", () => {
		const { undoPass } = setup();
		fireEvent.click(screen.getByRole("button", { name: /Pass on NVIDIA/ }));
		act(() => { vi.advanceTimersByTime(3000); });
		const undo = screen.queryByRole("button", { name: "Undo" });
		if (undo) {
			expect(undo).toBeDisabled();
			fireEvent.click(undo);
		}
		expect(undoPass).not.toHaveBeenCalled();
	});

	it("records how long the card was on screen, not the undo window", () => {
		setup();
		vi.setSystemTime(Date.now() + 2000);
		fireEvent.click(screen.getByRole("button", { name: /Pass on NVIDIA/ }));
		act(() => { vi.advanceTimersByTime(3400); });
		const meta = recordSwipe.mock.calls[0][2] as { timeOnCardMs: number };
		expect(meta.timeOnCardMs).toBeLessThan(2500);
	});

	it("the receipt sends you to My STAK", () => {
		const { props } = setup({ brands: [], swipeCount: 3 });
		fireEvent.click(screen.getByRole("button", { name: "Review saves in My STAK" }));
		expect(props.onReview).toHaveBeenCalled();
		expect(screen.getByText("Three cards, three signals. Your taste graph got smarter.")).toBeInTheDocument();
	});

	it("says so when there was nothing to show", () => {
		setup({ brands: [], swipeCount: 0 });
		expect(screen.getByText("No new stocks to show today.")).toBeInTheDocument();
	});

	it("sends a decision still inside the undo window when Discover unmounts", () => {
		const { unmount } = setup();
		fireEvent.click(screen.getByRole("button", { name: /Pass on NVIDIA/ }));
		unmount();
		expect(recordSwipe).toHaveBeenCalledWith("nvidia", "left", expect.anything(), { keepalive: true });
	});
});
