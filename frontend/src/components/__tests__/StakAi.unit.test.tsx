import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A scripted STAK AI backend: each question takes the next scripted outcome.
const api = vi.hoisted(() => {
	class ApiError extends Error {
		constructor(message: string, readonly status: number, readonly body?: unknown) { super(message); }
	}
	return {
		ApiError,
		sendStakAiMessage: vi.fn(),
		getStakAiUsage: vi.fn(),
		getStakAiMessages: vi.fn(),
		sendStakAiFeedback: vi.fn(),
	};
});
vi.mock("@/lib/api", () => api);
vi.mock("@/hooks/useBrandsList", () => ({ useBrandsList: () => ({ data: [{ ticker: "NVDA", name: "NVIDIA" }] }) }));

import { resetStakAiLauncher, stakAiLauncher, useStakAiChat, nextQuestionText } from "@/components/stakAi/useStakAiChat";
import { StakAiThread, parseMarkdown } from "@/components/stakAi/StakAiThread";
import { ago } from "@/components/stakAi/useStakAiHistory";
import { articleContext, briefContext } from "@/components/stakAi/open";

const reply = (over: Record<string, unknown> = {}) => ({
	response: "Here's why.", conversationId: "conv-1", messageId: 10, answerKind: "answer", followUps: ["What next?"], sources: [],
	usage: { limit: 5, used: 1, remaining: 4, resetsAt: null }, ...over,
});
const limitError = () => new api.ApiError("limit", 429, { code: "limit_reached", usage: { limit: 5, used: 5, remaining: 0, resetsAt: "2099-01-01T10:00:00Z" } });

beforeEach(() => {
	vi.clearAllMocks();
	resetStakAiLauncher();
	api.getStakAiUsage.mockResolvedValue({ limit: 5, used: 0, remaining: 5, resetsAt: null });
	api.sendStakAiFeedback.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

async function ask(result: ReturnType<typeof renderHook<ReturnType<typeof useStakAiChat>, unknown>>["result"], q: string) {
	await act(async () => { result.current.send(q); });
	await waitFor(() => expect(result.current.sending).toBe(false));
}

describe("useStakAiChat", () => {
	it("an answer arrives and the count updates", async () => {
		api.sendStakAiMessage.mockResolvedValueOnce(reply());
		const { result } = renderHook(() => useStakAiChat());
		await ask(result, "What is beta?");
		expect(result.current.messages.map((m) => m.fromUser)).toEqual([true, false]);
		expect(result.current.usage?.remaining).toBe(4);
	});

	it("the page context goes with the first question only", async () => {
		stakAiLauncher.context = { type: "stock", ticker: "NVDA" };
		api.sendStakAiMessage.mockResolvedValue(reply());
		const { result } = renderHook(() => useStakAiChat({ fromLauncher: true }));
		await ask(result, "Why is it down?");
		await ask(result, "Is that normal?");
		expect(api.sendStakAiMessage.mock.calls[0]![2]).toEqual({ type: "stock", ticker: "NVDA" });
		expect(api.sendStakAiMessage.mock.calls[1]![2]).toBeUndefined();
		expect(api.sendStakAiMessage.mock.calls[1]![1]).toBe("conv-1");
	});

	it("a question from the launcher is asked on open", async () => {
		stakAiLauncher.question = "Why is NVDA moving today?";
		api.sendStakAiMessage.mockResolvedValueOnce(reply());
		const { result } = renderHook(() => useStakAiChat({ fromLauncher: true }));
		await waitFor(() => expect(result.current.messages).toHaveLength(2));
		expect(stakAiLauncher.question).toBeNull();
	});

	it("out of questions hands the question back and says when", async () => {
		api.sendStakAiMessage.mockRejectedValueOnce(limitError());
		const { result } = renderHook(() => useStakAiChat());
		await ask(result, "One more?");
		expect(result.current.messages).toEqual([]);
		expect(result.current.returnedDraft).toBe("One more?");
		expect(result.current.notice).toEqual({ type: "limit", resetsAt: "2099-01-01T10:00:00Z" });
		expect(result.current.canAsk).toBe(false);
	});

	it("a failed question is retried in place, not duplicated", async () => {
		api.sendStakAiMessage.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(reply());
		const { result } = renderHook(() => useStakAiChat());
		await ask(result, "What is beta?");
		expect(result.current.messages[0]!.failed).toBe(true);
		expect(result.current.notice).toEqual({ type: "failed", offline: true });
		await act(async () => { result.current.retry(); });
		await waitFor(() => expect(result.current.messages).toHaveLength(2));
		expect(result.current.messages[0]!.failed).toBeFalsy();
		expect(result.current.notice).toBeNull();
	});

	it("asking in a deleted chat carries on in a fresh one", async () => {
		stakAiLauncher.conversationId = "gone";
		api.getStakAiMessages.mockResolvedValueOnce({ title: "Old", context: null, messages: [] });
		api.sendStakAiMessage
			.mockRejectedValueOnce(new api.ApiError("nf", 404, { code: "not_found" }))
			.mockResolvedValueOnce(reply({ conversationId: "fresh" }));
		const { result } = renderHook(() => useStakAiChat({ fromLauncher: true }));
		await waitFor(() => expect(result.current.loading).toBe(false));
		await ask(result, "And now?");
		expect(api.sendStakAiMessage.mock.calls[0]![1]).toBe("gone");
		expect(api.sendStakAiMessage.mock.calls[1]![1]).toBeUndefined();
		expect(result.current.currentConversationId()).toBe("fresh");
	});

	it("a reopened chat keeps its declines, and nothing sends while it loads", async () => {
		let release: (v: unknown) => void = () => {};
		api.getStakAiMessages.mockReturnValueOnce(new Promise((r) => { release = r; }));
		stakAiLauncher.conversationId = "old";
		const { result } = renderHook(() => useStakAiChat({ fromLauncher: true }));
		expect(result.current.loading).toBe(true);
		act(() => result.current.send("Too early"));
		expect(api.sendStakAiMessage).not.toHaveBeenCalled();
		await act(async () => release({ title: "Old", context: null, messages: [{ id: 1, role: "user", content: "Buy?", kind: "answer", feedback: null, created_at: "" }, { id: 2, role: "assistant", content: "I can't advise that.", kind: "declined", feedback: null, created_at: "" }] }));
		expect(result.current.messages.at(-1)!.kind).toBe("declined");
		expect(result.current.messages[0]!.id).toBeNull();
	});

	it("a new chat stops a past one loading", async () => {
		let release: (v: unknown) => void = () => {};
		api.getStakAiMessages.mockReturnValueOnce(new Promise((r) => { release = r; }));
		stakAiLauncher.conversationId = "old";
		const { result } = renderHook(() => useStakAiChat({ fromLauncher: true }));
		act(() => result.current.newChat());
		await act(async () => release({ title: "Old", context: null, messages: [{ id: 1, role: "user", content: "late", kind: "answer", feedback: null, created_at: "" }] }));
		expect(result.current.messages).toEqual([]);
		expect(result.current.loading).toBe(false);
	});

	it("thumbs toggle, and a save that fails is put back", async () => {
		api.sendStakAiMessage.mockResolvedValueOnce(reply());
		const { result } = renderHook(() => useStakAiChat());
		await ask(result, "What is beta?");
		act(() => result.current.rate(result.current.messages.at(-1)!, 1));
		expect(result.current.messages.at(-1)!.feedback).toBe(1);
		act(() => result.current.rate(result.current.messages.at(-1)!, 1));
		expect(result.current.messages.at(-1)!.feedback).toBeNull();
		api.sendStakAiFeedback.mockRejectedValueOnce(new Error("offline"));
		await act(async () => { result.current.rate(result.current.messages.at(-1)!, -1); });
		await waitFor(() => expect(result.current.messages.at(-1)!.feedback).toBeNull());
	});
});

describe("StakAiThread", () => {
	function Harness() {
		const chat = useStakAiChat({ context: { type: "stock", ticker: "NVDA" } });
		return <StakAiThread chat={chat} variant="desktop" />;
	}

	it("starts with questions for the page and asks one when tapped", async () => {
		api.sendStakAiMessage.mockResolvedValueOnce(reply({ response: "Chips **fell** today.\n- Export curbs\n- Weak guidance" }));
		render(<Harness />);
		expect(screen.getByText("How does NVIDIA make money?")).toBeInTheDocument();
		expect(screen.getByText("Educational, not financial advice.")).toBeInTheDocument();
		await act(async () => { fireEvent.click(screen.getByText("Why is NVDA moving today?")); });
		await waitFor(() => expect(screen.getByText("Export curbs")).toBeInTheDocument());
		expect(screen.getByText("fell").tagName).toBe("STRONG");
		expect(screen.getByRole("button", { name: "Helpful" })).toHaveAttribute("aria-pressed", "false");
		expect(screen.getByRole("button", { name: "What next?" })).toBeInTheDocument();
		expect(screen.getByRole("log")).toBeInTheDocument();
	});

	it("Enter sends; the count shows what's left", async () => {
		api.sendStakAiMessage.mockResolvedValueOnce(reply());
		render(<Harness />);
		await waitFor(() => expect(screen.getByText("5 of 5 questions left")).toBeInTheDocument());
		const box = screen.getByRole("textbox", { name: "Ask STAK AI" });
		fireEvent.change(box, { target: { value: "What is beta?" } });
		await act(async () => { fireEvent.keyDown(box, { key: "Enter" }); });
		await waitFor(() => expect(screen.getByText("4 of 5 questions left")).toBeInTheDocument());
		expect(api.sendStakAiMessage.mock.calls[0]![0]).toBe("What is beta?");
	});
});

describe("helpers", () => {
	it("a list after an intro line keeps its bullets", () => {
		expect(parseMarkdown("Here's why:\n- Chips fell\n- Rates rose\n\nThat's the gist.")).toEqual([
			{ type: "p", text: "Here's why:" },
			{ type: "ul", items: ["Chips fell", "Rates rose"] },
			{ type: "p", text: "That's the gist." },
		]);
	});

	it("ago reads like a feed", () => {
		const now = Date.parse("2026-10-01T12:00:00Z");
		expect(ago("2026-10-01T11:59:40Z", now)).toBe("Just now");
		expect(ago("2026-10-01T09:00:00Z", now)).toBe("3h ago");
		expect(ago("garbage", now)).toBe("");
	});

	it("nextQuestionText names a time or falls back", () => {
		expect(nextQuestionText(null)).toBe("Check back in a few hours.");
		expect(nextQuestionText(new Date(Date.now() + 60_000).toISOString())).toMatch(/^Your next one is/);
	});

	it("article and brief contexts carry what the page shows", () => {
		expect(articleContext({ headline: "Apple raises orders", summary: "", explanation: "Suppliers told to prepare.", source: "Bloomberg", url: "https://x.test/a", ticker: "aapl" } as never))
			.toMatchObject({ type: "article", summary: "Suppliers told to prepare.", tickers: ["AAPL"] });
		expect(briefContext({ dayLabel: "Friday", plainEnglish: "Stocks rose.", personalizedImpact: " ", whatHappened: [{ title: "Fed", body: "Held rates." }] } as never))
			.toEqual({ type: "brief", title: "Friday", points: ["Stocks rose.", "Fed: Held rates."] });
	});
});
