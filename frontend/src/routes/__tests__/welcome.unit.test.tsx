/**
 * Landing page — cross-breakpoint unit suite.
 *
 * The landing page is one flowing page with three looks, from the Figma frames: phone (<600px), tablet
 * (600–1024px) and desktop (≥1025px), picked by the page's width in CSS px - so zooming in moves down the list.
 * Nothing that holds words is scaled (WCAG 1.4.4 / 1.4.10 / 1.4.12). These tests render the real LandingPage at
 * representative widths and lock in the layout routing, the interactive behavior, and the design-review
 * invariants (hands-off FAQ, sharp mockup, removed email pill, approved copy) so no future Figma pass can
 * silently regress them.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
let mockSearch: { join?: "1" } = {};
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: unknown) => opts,
	useNavigate: () => mockNavigate,
	useSearch: () => mockSearch,
}));
// The early-access modal saves through the API client, which needs Supabase settings at import; the landing tests don't.
vi.mock("@/lib/api", () => ({ joinWaitlist: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ appUser: null, loading: false }),
}));
vi.mock("@/context/AccountContext", () => ({
	useAccount: () => ({ account: null, accountLoading: false }),
}));

import { Route } from "../welcome";
// createFileRoute mock above returns (opts) => opts, so Route is the raw options object
 
const LandingPage = (Route as any).component as React.ComponentType;

/* The page sizes itself from the scroll container's clientWidth (jsdom
   defaults to 0, which would always select the phone layout). */
let viewport = 1440;
Object.defineProperty(HTMLElement.prototype, "clientWidth", {
	configurable: true,
	get() {
		return viewport;
	},
});
const scrollToSpy = vi.fn();
HTMLElement.prototype.scrollTo = scrollToSpy as unknown as typeof HTMLElement.prototype.scrollTo;

function renderAt(width: number) {
	viewport = width;
	(window as { innerWidth: number }).innerWidth = width;
	return render(<LandingPage />);
}

function page(): HTMLElement {
	const el = document.querySelector<HTMLElement>(".landing-page");
	expect(el).not.toBeNull();
	return el!;
}

/** Puts a section `top` px down the page, as the browser would lay it out. */
function placeSection(key: string, top: number) {
	const el = document.getElementById(`landing-${key}`)!;
	el.getBoundingClientRect = () => ({ top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
}

const FAQ_QUESTIONS = [
	"What is STAK",
	"How does STAK know what stocks to show me?",
	'What is "STAKing" a stock?',
	"Do I need investing experience to use STAK?",
];
const FAQ_ANSWER_1 = /STAK is a platform built to help people understand/;
const FAQ_ANSWER_2 = /learning about your interests, goals, and risk profile/;

const PHONE = 390;
const TABLET = 810;
const DESKTOP = 1440;
const ALL = [
	["phone", PHONE],
	["tablet", TABLET],
	["desktop", DESKTOP],
] as const;

beforeEach(() => {
	mockNavigate.mockClear();
	scrollToSpy.mockClear();
	mockSearch = {};
});
afterEach(cleanup);

/* ─── breakpoint → layout routing ───────────────────────────────────── */
describe("breakpoint routing", () => {
	it.each([
		[320, "phone"],
		[390, "phone"],
		[599, "phone"],
		[600, "tablet"],
		[810, "tablet"],
		[1024, "tablet"],
		[1025, "desktop"],
		[1920, "desktop"],
	] as const)("%ipx shows the %s layout", (width, layout) => {
		renderAt(width);
		expect(page()).toHaveAttribute("data-layout", layout);
	});

	it.each(ALL)("%s: the header matches the layout - links on desktop, a menu button below", (name, width) => {
		renderAt(width);
		if (name === "desktop") {
			expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible();
			expect(screen.queryByLabelText("Menu")).toBeNull();
		} else {
			expect(screen.getByLabelText("Menu")).toBeInTheDocument();
		}
	});

	it("re-routes the layout when the window resizes (or zooms) across a breakpoint", () => {
		renderAt(1440);
		expect(page()).toHaveAttribute("data-layout", "desktop");
		viewport = 390;
		fireEvent(window, new Event("resize"));
		expect(page()).toHaveAttribute("data-layout", "phone");
	});

	it.each(ALL)("%s: no words are scaled - the page flows at its real size", (_name, width) => {
		renderAt(width);
		for (const el of document.querySelectorAll<HTMLElement>(".landing-scroll *")) {
			// The photo mosaic is a picture, drawn to the page width; the closed menu shrinks a touch as it fades out.
			if (el.closest("[data-decor], #landing-menu")) continue;
			expect(el.style.transform).not.toMatch(/scale\((?!1\))/);
		}
	});

	it.each(ALL)("%s: real headings - one h1, then an h2 per section", (_name, width) => {
		renderAt(width);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		for (const name of [/The Market Isn't Hard/, /Three Swipes to/, /Everything You Need/, /Real People/, /answer/, /Our community/]) {
			expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
		}
	});
});

/* ─── hero: box art asset per view, signup CTA ──────────────────────── */
describe("hero", () => {
	it("each view renders its own flattened Figma box composition", () => {
		renderAt(PHONE);
		expect(document.querySelector('img[src*="hero-box-frame124-m390-2x"]')).not.toBeNull();
		expect(document.querySelector('img[src*="hero-box-frame124-t810-2x"]')).toBeNull();
		cleanup();
		renderAt(TABLET);
		expect(document.querySelector('img[src*="hero-box-frame124-t810-2x"]')).not.toBeNull();
		expect(document.querySelector('img[src*="hero-box-frame124-m390-2x"]')).toBeNull();
		cleanup();
		renderAt(DESKTOP);
		expect(document.querySelector('img[src*="hero-box-frame124-t810-2x"]')).not.toBeNull();
		expect(document.querySelector('img[src*="hero-box-frame124-m390-2x"]')).toBeNull();
	});

	it("?join=1 opens the early-access form, and closing it drops the parameter", () => {
		mockSearch = { join: "1" };
		renderAt(DESKTOP);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(mockNavigate).toHaveBeenCalledWith({ to: "/welcome", search: {}, replace: true });
	});

	it.each(ALL)("%s: pre-launch, no section sends people to sign up or scroll with a button", (_name, width) => {
		renderAt(width);
		for (const label of ["Get started", "Explore STAK", "Join our Community"]) {
			expect(screen.queryByText(label)).toBeNull();
		}
	});
});

/* ─── header: pinned, and its CTA is early access ───────────────────── */
describe("header", () => {
	it.each(ALL)("%s: the header stays on screen (sticky), outside the page's sections", (_name, width) => {
		renderAt(width);
		const logo = screen.getAllByAltText("STAK")[0];
		expect(page().contains(logo)).toBe(false);
		const header = document.querySelector("header");
		expect(header?.style.position).toBe("sticky");
		expect(header?.contains(logo)).toBe(true);
	});

	it("desktop: 'Get early access' in the header opens the early-access form", () => {
		renderAt(DESKTOP);
		// The hero pill says the same thing; this is the one in the header.
		const cta = screen.getAllByRole("button", { name: "Get early access" }).find((el) => el.closest("[style*='sticky']"));
		fireEvent.click(cta!);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it.each([
		["phone", PHONE],
		["tablet", TABLET],
	] as const)("%s: the menu's 'Get early access' closes the menu and opens the form", (_name, width) => {
		renderAt(width);
		const burger = screen.getByLabelText("Menu");
		fireEvent.click(burger);
		const cta = screen.getAllByRole("button", { name: "Get early access" }).find((b) => b.closest("[style*='sticky']"));
		fireEvent.click(cta!);
		expect(burger).toHaveAttribute("aria-expanded", "false");
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it.each([
		["phone", PHONE],
		["tablet", TABLET],
	] as const)("%s: tapping outside the open menu, or Escape, closes it", (_name, width) => {
		renderAt(width);
		const burger = screen.getByLabelText("Menu");
		fireEvent.click(burger);
		fireEvent.pointerDown(page());
		expect(burger).toHaveAttribute("aria-expanded", "false");
		fireEvent.click(burger);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(burger).toHaveAttribute("aria-expanded", "false");
	});
});

/* ─── FAQ: identical hands-off behavior on every view ───────────────── */
describe("FAQ (hands-off section)", () => {
	it.each(ALL)("%s: exactly the 4 hand-tuned questions, all closed initially", (_name, width) => {
		renderAt(width);
		for (const q of FAQ_QUESTIONS) {
			expect(screen.getByText(q)).toBeInTheDocument();
		}
		expect(screen.queryByText(FAQ_ANSWER_1)).toBeNull();
		expect(screen.queryByText(FAQ_ANSWER_2)).toBeNull();
	});

	it.each(ALL)("%s: each question is a heading whose button names and controls its answer", (_name, width) => {
		renderAt(width);
		const q = screen.getByRole("button", { name: FAQ_QUESTIONS[0] });
		expect(q.closest("h3")).not.toBeNull();
		fireEvent.click(q);
		expect(screen.getByRole("region", { name: FAQ_QUESTIONS[0] })).toHaveAttribute("id", q.getAttribute("aria-controls"));
	});

	it.each(ALL)("%s: accordion opens, switches (single-open), and closes", (_name, width) => {
		renderAt(width);
		fireEvent.click(screen.getByText(FAQ_QUESTIONS[0]));
		expect(screen.getByText(FAQ_ANSWER_1)).toBeInTheDocument();

		fireEvent.click(screen.getByText(FAQ_QUESTIONS[1]));
		expect(screen.getByText(FAQ_ANSWER_2)).toBeInTheDocument();
		expect(screen.queryByText(FAQ_ANSWER_1)).toBeNull();

		fireEvent.click(screen.getByText(FAQ_QUESTIONS[1]));
		expect(screen.queryByText(FAQ_ANSWER_2)).toBeNull();
	});

	it.each(ALL)("%s: 'Email Us' is a plain mailto: link, with the address shown under it", (_name, width) => {
		renderAt(width);
		const link = screen.getByRole("link", { name: "Email Us" });
		expect(link).toHaveAttribute("href", "mailto:support@thestak.org?subject=Question%20about%20STAK");
		expect(link).not.toHaveAttribute("target");
		expect(screen.queryByRole("button", { name: "Email Us" })).toBeNull();
		expect(screen.getByText("support@thestak.org")).toBeInTheDocument();
	});
});

/* ─── footer: pre-launch links ───────────────────────────────────────── */
describe("footer links before launch", () => {
	it.each(ALL)("%s: Instagram links out; the other socials are plain text", (_name, width) => {
		renderAt(width);
		expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://www.instagram.com/just_stak");
		for (const name of ["Facebook", "X", "Tiktok", "Discord"]) {
			expect(screen.queryByRole("link", { name })).toBeNull();
		}
	});

	it.each(ALL)("%s: the store badges open the early-access form", (_name, width) => {
		renderAt(width);
		fireEvent.click(screen.getByRole("button", { name: "Get it on Google Play" }));
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		fireEvent.click(screen.getByRole("button", { name: "Download on the App Store" }));
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});
});

/* ─── navigation: hamburger menu (phone/tablet) and desktop nav ─────── */
describe("navigation", () => {
	it.each([
		["phone", PHONE],
		["tablet", TABLET],
	] as const)("%s: hamburger opens the menu and FAQ scrolls to the FAQ section", (_name, width) => {
		renderAt(width);
		placeSection("faq", 4883);
		const burger = screen.getByLabelText("Menu");
		expect(burger).toHaveAttribute("aria-expanded", "false");
		fireEvent.click(burger);
		expect(burger).toHaveAttribute("aria-expanded", "true");
		for (const label of ["Features", "How It Works"]) {
			expect(screen.getAllByText(label).length).toBeGreaterThan(0);
		}
		const faqItems = screen.getAllByText("FAQ");
		fireEvent.click(faqItems[0]); // menu entry renders above footer link
		const padTop = width === PHONE ? 70 : 110;
		expect(scrollToSpy).toHaveBeenCalledWith({ top: 4883 + padTop - 16, behavior: "smooth" });
		expect(burger).toHaveAttribute("aria-expanded", "false");
	});

	it("desktop: nav 'FAQ' scrolls to where the FAQ section is, and takes keyboard focus to its heading", () => {
		renderAt(DESKTOP);
		placeSection("faq", 5529);
		fireEvent.click(screen.getAllByText("FAQ")[0]);
		expect(scrollToSpy).toHaveBeenCalledWith({ top: 5529 + 70 - 16, behavior: "smooth" });
		expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: /answer/ }));
	});

	it("phone: footer 'Features' scrolls to the Features section", () => {
		renderAt(PHONE);
		placeSection("features", 3050);
		const links = screen.getAllByRole("button", { name: "Features" });
		fireEvent.click(links[links.length - 1]); // the footer's; the menu's comes first
		expect(scrollToSpy).toHaveBeenCalledWith({ top: 3050 + 70 - 16, behavior: "smooth" });
	});

	it("with reduced motion, nav links jump instead of gliding", () => {
		const matchMedia = window.matchMedia;
		window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
		try {
			renderAt(DESKTOP);
			placeSection("faq", 5529);
			fireEvent.click(screen.getAllByText("FAQ")[0]);
			expect(scrollToSpy).toHaveBeenCalledWith({ top: 5529 + 70 - 16, behavior: "auto" });
		} finally {
			window.matchMedia = matchMedia;
		}
	});

	it("phone: the menu's 'Get early access' leaves focus on the menu button for the form to hand back", () => {
		renderAt(PHONE);
		const burger = screen.getByLabelText("Menu");
		fireEvent.click(burger);
		const cta = screen.getAllByRole("button", { name: "Get early access" }).find((b) => b.closest("#landing-menu"));
		fireEvent.click(cta!);
		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(document.activeElement).toBe(burger);
	});

	it("phone: Tabbing out of the open menu closes it", () => {
		renderAt(PHONE);
		const burger = screen.getByLabelText("Menu");
		fireEvent.click(burger);
		fireEvent.blur(burger, { relatedTarget: screen.getAllByRole("button", { name: FAQ_QUESTIONS[0] })[0] });
		expect(burger).toHaveAttribute("aria-expanded", "false");
	});

	it.each(ALL)("%s: the partner logos stand still on one row - all six shown once, nothing to pause", (_name, width) => {
		renderAt(width);
		for (const name of ["Block Wallet", "Amplitude", "Better Stack", "Brex", "Deel", "Spotify"]) {
			expect(screen.getAllByAltText(name)).toHaveLength(1);
		}
		expect(screen.queryByRole("button", { name: /partner logos/ })).toBeNull();
		for (const style of document.querySelectorAll("style")) expect(style.textContent).not.toMatch(/@keyframes/);
	});

	it("phone: Escape closes the menu and puts focus back on its button", () => {
		renderAt(PHONE);
		const burger = screen.getByLabelText("Menu");
		fireEvent.click(burger);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(document.activeElement).toBe(burger);
	});

	it("desktop: nav 'Home' scrolls back to the top", () => {
		renderAt(DESKTOP);
		fireEvent.click(screen.getAllByText("Home")[0]);
		expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
	});
});

/* ─── community email pill: removed on ALL views (regression lock) ──── */
describe("community-section email pill removal", () => {
	it.each(ALL)("%s: only the footer newsletter input remains, no 'Join us'", (_name, width) => {
		renderAt(width);
		expect(screen.getAllByPlaceholderText("Your email address")).toHaveLength(1);
		expect(screen.queryByText("Join us")).toBeNull();
	});
});

/* ─── footer: approved copy + working subscribe ─────────────────────── */
describe("footer", () => {
	it.each(ALL)("%s: FAQ link (not Blog), fixed copyright and newsletter label", (_name, width) => {
		renderAt(width);
		expect(screen.queryByText("Blog")).toBeNull();
		expect(screen.getAllByText("FAQ").length).toBeGreaterThan(0);
		expect(screen.getByText("© 2026 All rights reserved")).toBeInTheDocument();
		expect(screen.getByText("Subscribe to our newsletter")).toBeInTheDocument();
	});

	it.each(ALL)("%s: subscribing sends the typed email to the newsletter mailto", (_name, width) => {
		const loc = { href: "" };
		Object.defineProperty(window, "location", { configurable: true, value: loc });
		renderAt(width);
		fireEvent.change(screen.getByPlaceholderText("Your email address"), { target: { value: "a@b.co" } });
		fireEvent.click(screen.getByText("Subscribe"));
		expect(loc.href).toContain("mailto:favour@thestak.org");
		expect(loc.href).toContain(encodeURIComponent("a@b.co"));
	});

	it.each(ALL)("%s: subscribing with an empty email does nothing", (_name, width) => {
		const loc = { href: "" };
		Object.defineProperty(window, "location", { configurable: true, value: loc });
		renderAt(width);
		fireEvent.click(screen.getByText("Subscribe"));
		expect(loc.href).toBe("");
	});
});

/* ─── design-review invariants ──────────────────────────────────────── */
describe("design invariants", () => {
	it.each(ALL)("%s: the problem phone mockup renders SHARP (no blur filter)", (_name, width) => {
		renderAt(width);
		const img = document.querySelector('img[src*="problem-phone"]') as HTMLImageElement;
		expect(img).not.toBeNull();
		expect(img.style.filter || "").not.toContain("blur");
	});

	it.each(ALL)("%s: Early Momentum keeps the approved polished heading", (_name, width) => {
		renderAt(width);
		expect(screen.getByText("Real People.")).toBeInTheDocument();
		expect(screen.getByText("Real Momentum.")).toBeInTheDocument();
	});

	it.each(ALL)("%s: chat bubbles carry the one shared set of lines", (_name, width) => {
		renderAt(width);
		for (const line of ["Just STAKed Amazon!", "What's the Buzz About?", "My portfolio is growing!", "This app is different!"]) {
			expect(screen.getByText(line)).toBeInTheDocument();
		}
		expect(screen.queryByText("Lets fvking STAK i!")).toBeNull();
	});

	it("every layout labels its sections the same way; hero subhead keeps the grammar fix", () => {
		for (const width of [PHONE, TABLET, DESKTOP]) {
			renderAt(width);
			expect(screen.getByText("The Problem")).toBeInTheDocument();
			expect(screen.getAllByText("How It Works").length).toBeGreaterThan(0);
			cleanup();
		}
		renderAt(TABLET);
		expect(screen.getByText(/smart insights, and zero pressure\. Before you buy anything/)).toBeInTheDocument();
	});
});
