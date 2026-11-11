import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	auth: { user: null, loading: false },
	account: { account: null, accountLoading: false, initSandboxCash: vi.fn() },
	health: { healthy: false, settled: true },
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/context/AccountContext", () => ({ useAccount: () => mocks.account }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }));
vi.mock("@/app/live/quotes", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/app/live/quotes")>()),
	useApiHealthState: () => mocks.health,
	useApiHealth: () => mocks.health.healthy,
}));
// a story card is a router Link: an anchor to the article it opens is all these tests need
vi.mock("@tanstack/react-router", () => ({
	Link: ({ to, params, children, viewTransition: _vt, ...rest }: { to: string; params?: { id: string }; children: ReactNode; viewTransition?: boolean }) => (
		<a href={params ? to.replace("$id", params.id) : to} {...rest}>
			{children}
		</a>
	),
}));

import { brandByTicker, loadCatalog } from "@/app/live/catalog";
import { guestStore, localStore } from "@/app/live/guest";
import { articleById } from "@/app/news/articles";
import { useStockDetail } from "../live";
import { NO_PRICE_MOVE } from "../signal";
import { EXPLAINER_NOTE, explainerKicker, StockDetail } from "../StockDetail";

beforeAll(async () => {
	await loadCatalog();
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

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
beforeEach(() => {
	localStorage.clear();
	guestStore().reset();
	localStore("guest").reset();
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
	cleanup();
	client.clear();
});

const noop = () => {};
function Page({ symbol }: { symbol: string }) {
	const { data } = useStockDetail(symbol);
	return <StockDetail stock={data} saved={false} open={false} tone="base" from="discover" onBack={noop} onToggleSaved={noop} onToggleOpen={noop} onPracticeBuy={noop} />;
}
const row = (symbol: string) => screen.getByRole("region", { name: `${symbol} headlines` });
const explainerButton = (symbol: string) => row(symbol).querySelector<HTMLButtonElement>("button[aria-haspopup=dialog]")!;
const dialog = () => document.querySelector("dialog[open]") as HTMLDialogElement | null;

describe("the News signal on a real page (N39c)", () => {
	it("draws every company's row: its stories as links to existing articles, its explainer as a button, four cards", () => {
		for (const symbol of ["PLTR", "KO", "EAT", "SPY", "BRK.B", "MU"]) {
			const { unmount } = render(<Page symbol={symbol} />, { wrapper });
			const links = [...row(symbol).querySelectorAll<HTMLAnchorElement>("a[href]")];
			expect(links, symbol).toHaveLength(3);
			for (const a of links) {
				const id = a.getAttribute("href")!.replace("/news/", "");
				expect(articleById(id), `${symbol} -> ${id}`).toBeDefined();
			}
			expect(row(symbol).children).toHaveLength(4);
			const button = explainerButton(symbol);
			expect(button.getAttribute("type")).toBe("button");
			expect(button.textContent).toContain("STAK · Explainer");
			expect(button.textContent).toContain(brandByTicker(symbol)!.culturalContext.title);
			// a button holds phrasing content only
			expect(button.querySelector("div, p")).toBeNull();
			// the cards are the stops: the row adds none of its own
			expect(row(symbol).hasAttribute("tabindex")).toBe(false);
			expect(document.body.textContent).not.toContain("No fresh headlines today.");
			unmount();
		}
	});

	it("says there is no price where the company has none, and keeps the rest of the card", () => {
		render(<Page symbol="EAT" />, { wrapper });
		const card = row("EAT").parentElement!;
		expect(card.textContent).toContain(NO_PRICE_MOVE);
		expect(card.textContent).toContain("One of the strongest growth rates in casual dining.");
		expect(card.textContent).toMatch(/Next earnings land [A-Z][a-z]{2} \d{1,2}\./);
	});
});

describe("the explainer sheet (N39c)", () => {
	const open = (symbol: string) => {
		render(<Page symbol={symbol} />, { wrapper });
		const button = explainerButton(symbol);
		button.focus();
		fireEvent.click(button);
		return button;
	};

	it("opens the catalog's own text in a dialog a screen reader names by its title", () => {
		open("PLTR");
		const d = dialog()!;
		expect(d).not.toBeNull();
		const context = brandByTicker("PLTR")!.culturalContext;
		const title = document.getElementById(d.getAttribute("aria-labelledby")!)!;
		expect(title.textContent).toBe(context.title);
		expect(title.tagName).toBe("H2");
		expect(d.textContent).toContain(explainerKicker("PLTR"));
		for (const s of context.sections) {
			expect(d.textContent).toContain(s.heading);
			expect(d.textContent).toContain(s.content);
		}
		expect(d.textContent).toContain(EXPLAINER_NOTE);
		// the focus starts on the title, so a long explainer opens at its top
		expect(document.activeElement).toBe(title);
		expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
	});

	it("closes with Escape (the dialog's cancel) and gives the focus back to its card", () => {
		const button = open("KO");
		expect(dialog()).not.toBeNull();
		act(() => {
			dialog()!.dispatchEvent(new Event("cancel", { cancelable: true }));
		});
		expect(dialog()).toBeNull();
		expect(document.activeElement).toBe(button);
	});

	it("closes with a press outside the panel (on the scrim) and with Close, the focus back on its card each time", () => {
		const button = open("SPY");
		act(() => {
			fireEvent.click(dialog()!);
		});
		expect(dialog()).toBeNull();
		expect(document.activeElement).toBe(button);
		button.focus();
		fireEvent.click(button);
		expect(dialog()).not.toBeNull();
		// a press inside the panel keeps it open
		fireEvent.click(dialog()!.querySelector("h3")!);
		expect(dialog()).not.toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(dialog()).toBeNull();
		expect(document.activeElement).toBe(button);
	});
});
