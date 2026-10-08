/**
 * Landing page — cross-breakpoint unit suite.
 *
 * The landing page renders one of three fixed-size canvases scaled to the
 * viewport: phone (390, <600px), tablet (810, 600–1024px), desktop (1400,
 * ≥1025px). These tests render the real LandingPage at representative widths
 * and lock in the layout routing, the interactive behavior, and the
 * design-review invariants (hands-off FAQ, sharp mockup, removed email pill,
 * approved copy) so no future Figma pass can silently regress them.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: unknown) => opts,
	useNavigate: () => mockNavigate,
	useSearch: () => ({}),
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

function canvas(): HTMLElement {
	const el = document.querySelector(".landing-canvas");
	expect(el).not.toBeNull();
	return el as HTMLElement;
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
});
afterEach(cleanup);

/* ─── breakpoint → canvas routing and scaling ───────────────────────── */
describe("breakpoint routing", () => {
	it("renders the 390 phone canvas below 600px", () => {
		renderAt(390);
		expect(canvas().style.width).toBe("390px");
		expect(canvas().style.transform).toBe("scale(1)");
	});

	it("scales the phone canvas up at 599px and switches to tablet at 600px", () => {
		renderAt(599);
		expect(canvas().style.width).toBe("390px");
		expect(canvas().style.transform).toBe(`scale(${599 / 390})`);
		cleanup();
		renderAt(600);
		expect(canvas().style.width).toBe("810px");
		expect(canvas().style.transform).toBe(`scale(${600 / 810})`);
	});

	it("renders the 810 tablet canvas at 810px and through 1024px (iPad)", () => {
		renderAt(810);
		expect(canvas().style.width).toBe("810px");
		expect(canvas().style.transform).toBe("scale(1)");
		cleanup();
		renderAt(1024);
		expect(canvas().style.width).toBe("810px");
		expect(canvas().style.transform).toBe(`scale(${1024 / 810})`);
	});

	it("renders the 1400 desktop canvas from 1025px, scaling up uncapped on wide screens", () => {
		renderAt(1025);
		expect(canvas().style.width).toBe("1400px");
		cleanup();
		renderAt(1920);
		expect(canvas().style.width).toBe("1400px");
		expect(canvas().style.transform).toBe(`scale(${1920 / 1400})`);
	});

	it("re-routes the layout when the window resizes across a breakpoint", () => {
		renderAt(1440);
		expect(canvas().style.width).toBe("1400px");
		viewport = 390;
		fireEvent(window, new Event("resize"));
		expect(canvas().style.width).toBe("390px");
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
	it.each(ALL)("%s: the header lives outside the scrolling canvas, in a sticky layer", (_name, width) => {
		renderAt(width);
		const logo = screen.getAllByAltText("STAK")[0];
		expect(canvas().contains(logo)).toBe(false);
		const sticky = [...document.querySelectorAll<HTMLElement>("div")].find((d) => d.style.position === "sticky");
		expect(sticky?.contains(logo)).toBe(true);
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
		fireEvent.pointerDown(canvas());
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

	it.each(ALL)("%s: 'Email Us' opens the contact mailto", (_name, width) => {
		const loc = { href: "" };
		Object.defineProperty(window, "location", { configurable: true, value: loc });
		renderAt(width);
		fireEvent.click(screen.getByText("Email Us"));
		expect(loc.href).toBe("mailto:support@thestak.org");
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
		["phone", PHONE, 5640], // PHONE_SEC.faq at scale 1
		["tablet", TABLET, 4883], // TABLET_SEC.faq at scale 1
	] as const)("%s: hamburger opens the menu and FAQ scrolls the right layout anchor", (_name, width, expectedTop) => {
		renderAt(width);
		const burger = screen.getByLabelText("Menu");
		expect(burger).toHaveAttribute("aria-expanded", "false");
		fireEvent.click(burger);
		expect(burger).toHaveAttribute("aria-expanded", "true");
		for (const label of ["Features", "How It Works"]) {
			expect(screen.getAllByText(label).length).toBeGreaterThan(0);
		}
		const faqItems = screen.getAllByText("FAQ");
		fireEvent.click(faqItems[0]); // menu entry renders above footer link
		expect(scrollToSpy).toHaveBeenCalledWith({ top: expectedTop, behavior: "smooth" });
	});

	it("desktop: nav 'FAQ' scrolls to the desktop anchor scaled to the viewport", () => {
		renderAt(DESKTOP);
		const faqButtons = screen.getAllByText("FAQ");
		fireEvent.click(faqButtons[0]);
		expect(scrollToSpy).toHaveBeenCalledWith({ top: 5529 * (1440 / 1400), behavior: "smooth" });
	});

	it("phone: footer 'Features' scrolls to the phone Features anchor", () => {
		renderAt(PHONE);
		const links = screen.getAllByRole("button", { name: "Features" });
		fireEvent.click(links[links.length - 1]); // the footer's; the menu's comes first
		expect(scrollToSpy).toHaveBeenCalledWith({ top: 3050, behavior: "smooth" });
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
