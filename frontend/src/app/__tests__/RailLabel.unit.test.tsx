import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RAIL_LABEL_REST_MS, type RailLabelTexts, useRailLabels } from "../RailLabel";

// jsdom has no PointerEvent; React reads pointerType from the native event
class TestPointerEvent extends MouseEvent {
	pointerType: string;
	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerType = init.pointerType ?? "mouse";
	}
}

beforeAll(() => {
	if (!("PointerEvent" in window)) Object.defineProperty(window, "PointerEvent", { value: TestPointerEvent, configurable: true });
});
beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

/** A two-control rail with its label layer, as the Sidebar wires it. */
function Rail({ texts }: { texts: RailLabelTexts }) {
	const rail = useRef<HTMLDivElement>(null);
	const labels = useRailLabels(rail, texts);
	return (
		<>
			<div ref={rail}>
				<button type="button" aria-label="Home" {...labels.props("home")} />
				<button type="button" aria-label="News" {...labels.props("news")} />
			</div>
			<p data-testid="page">page</p>
			{labels.layer}
		</>
	);
}

const CLOSED: RailLabelTexts = { home: "Home", news: "News" };
const OPEN: RailLabelTexts = { home: null, news: null };

const label = () => document.querySelector<HTMLElement>("[data-rail-label]");
const labels = () => [...document.querySelectorAll<HTMLElement>("[data-rail-label]")].map((l) => l.textContent);
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
/** a key press (the keyboard is the last input: keyboard focus may show a label) / a pointer press (it may not) */
const pressKey = (key = "Tab") => fireEvent.keyDown(document, { key });
const press = (el: Element, pointerType = "mouse") => fireEvent.pointerDown(el, { pointerType });
/** the pointer arriving from outside / moving over / going from one element to another, as the browser reports it */
const arrive = (el: Element, pointerType = "mouse") => fireEvent.pointerOver(el, { pointerType });
const move = (el: Element, pointerType = "mouse") => fireEvent.pointerMove(el, { pointerType });
const cross = (from: Element, to: Element, pointerType = "mouse") => fireEvent.pointerOut(from, { relatedTarget: to, pointerType });
/** what :focus-visible would say: true for a keyboard focus, false for a click's */
function modality(el: HTMLElement, keyboard: boolean) {
	const matches = Element.prototype.matches;
	el.matches = function (this: Element, sel: string) {
		return sel === ":focus-visible" ? keyboard : matches.call(this, sel);
	} as typeof el.matches;
}

describe("the rail's labels", () => {
	it("show a control's name once the pointer has rested on it 150 ms, not before", () => {
		render(<Rail texts={CLOSED} />);
		const home = screen.getByLabelText("Home");
		expect(RAIL_LABEL_REST_MS).toBe(150);
		arrive(home);
		advance(149);
		expect(label()).toBeNull();
		advance(1);
		expect(label()?.textContent).toBe("Home");
		expect(label()?.dataset.railLabel).toBe("home");
		// visual only: the control keeps its own accessible name
		expect(label()?.getAttribute("aria-hidden")).toBe("true");
	});

	it("show nothing for a pointer passing over the rail", () => {
		render(<Rail texts={CLOSED} />);
		const home = screen.getByLabelText("Home");
		const news = screen.getByLabelText("News");
		arrive(home);
		advance(60);
		cross(home, news);
		advance(60);
		cross(news, screen.getByTestId("page"));
		advance(1000);
		expect(label()).toBeNull();
	});

	it("wait for the pointer to rest: every move restarts the wait", () => {
		render(<Rail texts={CLOSED} />);
		const home = screen.getByLabelText("Home");
		arrive(home);
		advance(100);
		move(home);
		advance(100);
		expect(label()).toBeNull();
		advance(50);
		expect(label()?.textContent).toBe("Home");
	});

	it("stay while the pointer is on the control or the label, and go when it leaves both", () => {
		render(<Rail texts={CLOSED} />);
		const home = screen.getByLabelText("Home");
		const page = screen.getByTestId("page");
		arrive(home);
		advance(150);
		const shown = label() as HTMLElement;
		// onto the bridge (part of the label) and the label: it stays
		cross(home, shown.querySelector("[data-rail-label-bridge]") as Element);
		expect(label()).not.toBeNull();
		// back onto its control: still the same label
		cross(shown, home);
		advance(500);
		expect(label()?.textContent).toBe("Home");
		cross(home, shown);
		cross(shown, page);
		expect(label()).toBeNull();
	});

	it("never show for touch", () => {
		render(<Rail texts={CLOSED} />);
		const home = screen.getByLabelText("Home");
		arrive(home, "touch");
		move(home, "touch");
		advance(1000);
		expect(label()).toBeNull();
	});

	it("show at once on keyboard focus, go on blur, and stay away for a click's focus", () => {
		render(<Rail texts={CLOSED} />);
		const home = screen.getByLabelText("Home");
		const news = screen.getByLabelText("News");
		modality(home, true);
		modality(news, false);
		pressKey();
		act(() => home.focus());
		expect(label()?.textContent).toBe("Home");
		act(() => home.blur());
		expect(label()).toBeNull();
		act(() => news.focus());
		expect(label()).toBeNull();
	});

	it("show nothing for a focus that follows a pointer press, even one the browser calls :focus-visible", () => {
		// a phone's tap opening the menu: iOS Safari does not focus the tapped button, and showModal() then focuses Hide
		render(<Rail texts={CLOSED} />);
		const home = screen.getByLabelText("Home");
		const news = screen.getByLabelText("News");
		modality(home, true);
		modality(news, true);
		press(home, "touch");
		act(() => home.focus());
		expect(label()).toBeNull();
		act(() => home.blur());
		press(home, "mouse");
		act(() => home.focus());
		expect(label()).toBeNull();
		act(() => home.blur());
		// a shortcut is not keyboard navigation
		fireEvent.keyDown(document, { key: "l", ctrlKey: true });
		act(() => news.focus());
		expect(label()).toBeNull();
		act(() => news.blur());
		// the next key press makes it keyboard again
		pressKey();
		act(() => news.focus());
		expect(label()?.textContent).toBe("News");
	});

	it("go on Escape and stay dismissed until the pointer or the focus comes back", () => {
		render(<Rail texts={CLOSED} />);
		const home = screen.getByLabelText("Home");
		const news = screen.getByLabelText("News");
		const page = screen.getByTestId("page");
		arrive(home);
		advance(150);
		expect(label()).not.toBeNull();
		fireEvent.keyDown(document, { key: "Escape" });
		expect(label()).toBeNull();
		move(home);
		advance(1000);
		expect(label()).toBeNull();
		cross(home, page);
		arrive(home);
		advance(150);
		expect(label()?.textContent).toBe("Home");
		cross(home, page);
		// the keyboard's label: dismissed while focus stays, the next control's shows
		modality(home, true);
		modality(news, true);
		pressKey();
		act(() => home.focus());
		expect(label()?.textContent).toBe("Home");
		fireEvent.keyDown(document, { key: "Escape" });
		expect(label()).toBeNull();
		expect(document.activeElement).toBe(home);
		act(() => news.focus());
		expect(label()?.textContent).toBe("News");
	});

	it("let keyboard focus win over a resting pointer: one label, the focused control's", () => {
		render(<Rail texts={CLOSED} />);
		const home = screen.getByLabelText("Home");
		const news = screen.getByLabelText("News");
		const page = screen.getByTestId("page");
		modality(home, true);
		modality(news, true);
		// the pointer rests on News, then Tab focuses Home: Home's label takes over
		arrive(news);
		advance(150);
		expect(labels()).toEqual(["News"]);
		pressKey();
		act(() => home.focus());
		expect(labels()).toEqual(["Home"]);
		// shown for focus alone, it lets the pointer through to the page (only the pointer's label is hoverable)
		expect(label()?.className).toContain("pointer-events-none");
		// a pointer coming to rest on another control while Home keeps focus: still Home's
		cross(news, page);
		arrive(news);
		advance(500);
		expect(labels()).toEqual(["Home"]);
		// focus leaving the rail: the pointer still resting on News brings News's back
		act(() => home.blur());
		expect(labels()).toEqual(["News"]);
		expect(label()?.className).not.toContain("pointer-events-none");
		// focus and pointer on the same control: one label, the pointer's while it rests there (it may cross onto it) ...
		act(() => news.focus());
		expect(labels()).toEqual(["News"]);
		const shown = label() as HTMLElement;
		cross(news, shown);
		expect(labels()).toEqual(["News"]);
		// ... and the keyboard's once the pointer has left both
		cross(shown, page);
		expect(labels()).toEqual(["News"]);
		expect(label()?.className).toContain("pointer-events-none");
		// Escape dismisses it, focus and pointer alike
		arrive(home);
		advance(150);
		expect(labels()).toEqual(["News"]);
		pressKey("Escape");
		expect(labels()).toEqual([]);
	});

	it("hand keyboard focus from control to control without the resting pointer's label in between", () => {
		function Three() {
			const rail = useRef<HTMLDivElement>(null);
			const labels = useRailLabels(rail, { home: "Home", news: "News", discover: "Discover" });
			return (
				<>
					<div ref={rail}>
						<button type="button" aria-label="Home" {...labels.props("home")} />
						<button type="button" aria-label="News" {...labels.props("news")} />
						<button type="button" aria-label="Discover" {...labels.props("discover")} />
					</div>
					<p data-testid="page">page</p>
					{labels.layer}
				</>
			);
		}
		render(<Three />);
		const home = screen.getByLabelText("Home");
		const news = screen.getByLabelText("News");
		const discover = screen.getByLabelText("Discover");
		modality(home, true);
		modality(news, true);
		arrive(discover);
		advance(150);
		pressKey();
		act(() => home.focus());
		expect(labels()).toEqual(["Home"]);
		// Tab's blur, on its own: focus is going to News, so Discover's label is not rendered in between
		act(() => {
			fireEvent.blur(home, { relatedTarget: news });
		});
		expect(labels()).not.toContain("Discover");
		act(() => news.focus());
		expect(labels()).toEqual(["News"]);
		advance(1);
		expect(labels()).toEqual(["News"]);
		// a blur toward the rail that no focus follows still settles: the resting pointer's label returns
		act(() => {
			fireEvent.blur(news, { relatedTarget: home });
		});
		advance(1);
		expect(labels()).toEqual(["Discover"]);
	});

	it("go when the rail opens (no text), and come back only when the pointer moves over the closed rail again", () => {
		const { rerender } = render(<Rail texts={CLOSED} />);
		const home = screen.getByLabelText("Home");
		arrive(home);
		advance(150);
		expect(label()).not.toBeNull();
		rerender(<Rail texts={OPEN} />);
		expect(label()).toBeNull();
		rerender(<Rail texts={CLOSED} />);
		advance(1000);
		expect(label()).toBeNull();
		// the rail closed around a resting pointer: its next move starts a new rest
		move(home);
		advance(150);
		expect(label()?.textContent).toBe("Home");
	});

	it("sit 8 px right of the rail's edge, centred on the control, and stay inside a narrow window without covering it", () => {
		// the open rail's Hide: rail 0-216, the control 161-189 x 33-61, a label 116 x 31 (jsdom lays nothing out: the boxes
		// are given here, the label's own box follows the left / top the placement writes)
		const box = (left: number, top: number, width: number, height: number) =>
			({ left, top, width, height, x: left, y: top, right: left + width, bottom: top + height, toJSON: () => ({}) }) as DOMRect;
		const measure = HTMLElement.prototype.getBoundingClientRect;
		const width = window.innerWidth;
		// the rail's right edge and the control's left: the open rail at rest, unless a step below moves them
		let railRight = 216;
		let controlLeft = 161;
		HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
			if (this.dataset.railLabel !== undefined) return box(Number.parseFloat(this.style.left) || 0, Number.parseFloat(this.style.top) || 0, 116, 31);
			if (this.dataset.testRail !== undefined) return box(0, 0, railRight, 800);
			if (this.getAttribute("aria-label") === "Home") return box(controlLeft, 33, 28, 28);
			return measure.call(this);
		};
		function Hide({ texts }: { texts: RailLabelTexts }) {
			const rail = useRef<HTMLDivElement>(null);
			const labels = useRailLabels(rail, texts);
			return (
				<>
					<div ref={rail} data-test-rail="">
						<button type="button" aria-label="Home" {...labels.props("home")} />
					</div>
					{labels.layer}
				</>
			);
		}
		try {
			const { unmount } = render(<Hide texts={CLOSED} />);
			const home = screen.getByLabelText("Home");
			modality(home, true);
			pressKey();
			act(() => home.focus());
			const shown = label() as HTMLElement;
			expect(shown.style.left).toBe("224px");
			// centred: 47 - 15.5, on the nearest whole pixel
			expect(shown.style.top).toBe("32px");
			// the bridge spans the gap from the control's right edge (189) to the label, over the control's height
			const bridge = shown.querySelector<HTMLElement>("[data-rail-label-bridge]") as HTMLElement;
			expect([bridge.style.left, bridge.style.width, bridge.style.top, bridge.style.height]).toEqual(["-36px", "35px", "0px", "28px"]);
			unmount();
			// the rail opening (Enter on Show focuses Hide at once): its edge at 120 while Hide (155-183) is still clipped by it;
			// the label rides the rail's edge, not 8 right of a control the rail does not show yet (191)
			railRight = 120;
			controlLeft = 155;
			const opening = render(<Hide texts={CLOSED} />);
			const home1 = screen.getByLabelText("Home");
			modality(home1, true);
			act(() => home1.focus());
			expect(label()?.style.left).toBe("128px");
			opening.unmount();
			railRight = 216;
			controlLeft = 161;
			// a 320 window: 216 + 8 + 116 would run 20 px past it; the label slides back to 8 right of the control
			Object.defineProperty(window, "innerWidth", { value: 320, configurable: true });
			render(<Hide texts={CLOSED} />);
			const home2 = screen.getByLabelText("Home");
			modality(home2, true);
			act(() => home2.focus());
			expect(label()?.style.left).toBe("197px");
		} finally {
			HTMLElement.prototype.getBoundingClientRect = measure;
			Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
		}
	});

	it("show keyboard focus that landed while the control had no label once the rail shows it again", () => {
		// the compact menu closing returns focus to Show before the rail renders as closed
		const { rerender } = render(<Rail texts={OPEN} />);
		const home = screen.getByLabelText("Home");
		modality(home, true);
		pressKey("Escape");
		act(() => home.focus());
		expect(label()).toBeNull();
		rerender(<Rail texts={CLOSED} />);
		expect(label()?.textContent).toBe("Home");
	});
});

// The label as one small state machine (the final review of 2026-11-06): one owner at a time, keyboard focus or the resting
// pointer, focus winning (the ruling of 20:00); every entry and exit leaves it hidden or showing the CURRENT owner's label.

const NAME: Record<string, string> = { home: "Home", news: "News", discover: "Discover" };
const THREE: RailLabelTexts = { home: "Home", news: "News", discover: "Discover" };
const THREE_OPEN: RailLabelTexts = { home: null, news: null, discover: null };

/**
 * Three controls beside a page with its own link (the page's STAK link: where Tab goes after the rail). `page` re-keys
 * News: a page change that re-creates that control.
 */
function PageRail({ texts = THREE, page = 0 }: { texts?: RailLabelTexts; page?: number }) {
	const rail = useRef<HTMLDivElement>(null);
	const labels = useRailLabels(rail, texts);
	return (
		<>
			<div ref={rail}>
				<button type="button" aria-label="Home" {...labels.props("home")} />
				<button key={`news-${page}`} type="button" aria-label="News" {...labels.props("news")} />
				<button type="button" aria-label="Discover" {...labels.props("discover")} />
			</div>
			<main data-testid="page">
				<a href="#top">STAK</a>
			</main>
			{labels.layer}
		</>
	);
}

/** the pointer going from one element to another as the browser reports it: out of the one, over the other, a move on it */
const goes = (from: Element, to: Element) => {
	fireEvent.pointerOut(from, { relatedTarget: to, pointerType: "mouse" });
	fireEvent.pointerOver(to, { relatedTarget: from, pointerType: "mouse" });
	fireEvent.pointerMove(to, { pointerType: "mouse" });
};
/** the pointer turning up over an element with nothing reported before it (the label it was on went, a control moved) */
const turnsUp = (on: Element, pointerType = "mouse") => {
	fireEvent.pointerOver(on, { pointerType });
	fireEvent.pointerMove(on, { pointerType });
};
/** the label lets the pointer onto it (it is the pointer's own), or through to the page (shown for keyboard focus alone) */
const hoverable = () => !!label() && !label()?.className.includes("pointer-events-none");

function pageRail() {
	const view = render(<PageRail />);
	const [home, news, discover] = ["Home", "News", "Discover"].map((n) => screen.getByLabelText(n));
	for (const c of [home, news, discover]) modality(c, true);
	return { ...view, home, news, discover, page: screen.getByTestId("page"), link: screen.getByText("STAK") };
}

describe("the rail's label, one owner at a time", () => {
	it("finding 1: keyboard focus taking over while the pointer is on the label ends that hover; focus leaving the rail brings nothing back", () => {
		// the final review's flow f3 (1440x1024 /home?nav=closed), steps d-*
		const { home, news, discover, page, link } = pageRail();
		// 1. the mouse rests on News; its label shows; the mouse moves onto the label
		turnsUp(news);
		advance(400);
		const newsLabel = label() as HTMLElement;
		expect(newsLabel.textContent).toBe("News");
		goes(news, newsLabel);
		advance(300);
		expect(labels()).toEqual(["News"]);
		// 2. Tab: the rail's first control (Show) takes keyboard focus; its label replaces News's (focus wins)
		pressKey();
		act(() => home.focus());
		expect(labels()).toEqual(["Home"]);
		expect(newsLabel.isConnected).toBe(false);
		// 3. the mouse moves to (1000, 600): the label it was on is gone, it is over the page
		turnsUp(page);
		advance(300);
		// 4. more Tabs take focus through the rail and out of it, to the page's STAK link
		pressKey();
		act(() => news.focus());
		expect(labels()).toEqual(["News"]);
		pressKey();
		act(() => discover.focus());
		expect(labels()).toEqual(["Discover"]);
		pressKey();
		act(() => link.focus());
		// 5. nothing comes back: not at once, not a second later, not after another move
		expect(labels()).toEqual([]);
		advance(1000);
		expect(labels()).toEqual([]);
		move(page);
		advance(400);
		expect(labels()).toEqual([]);
		// News still names itself on the pointer's next rest there
		goes(page, news);
		advance(150);
		expect(labels()).toEqual(["News"]);
	});

	it("finding 1, the pointer standing still where the label was: nothing comes back once focus leaves the rail", () => {
		const { home, news, link } = pageRail();
		turnsUp(news);
		advance(400);
		goes(news, label() as HTMLElement);
		pressKey();
		act(() => home.focus());
		expect(labels()).toEqual(["Home"]);
		// no pointer event at all after the label went from under it
		pressKey();
		act(() => link.focus());
		expect(labels()).toEqual([]);
		advance(1000);
		expect(labels()).toEqual([]);
	});

	it("finding 1, variants: focus leaving by a click on the page (f3b), the tablet rail's sequence (f14), the pointer on the control itself", () => {
		const { home, news, discover, page, link } = pageRail();
		// (f3b 1) the pointer on Discover's label, Tab, then a click on a blank spot of the page
		turnsUp(discover);
		advance(400);
		goes(discover, label() as HTMLElement);
		pressKey();
		act(() => home.focus());
		expect(labels()).toEqual(["Home"]);
		turnsUp(page);
		press(page);
		act(() => home.blur());
		expect(labels()).toEqual([]);
		move(page);
		advance(600);
		expect(labels()).toEqual([]);
		// (f14) the pointer on News's label, Tab, the pointer moves away, Tabs out of the rail
		goes(page, news);
		advance(400);
		goes(news, label() as HTMLElement);
		pressKey();
		act(() => home.focus());
		turnsUp(page);
		for (const next of [news, discover, link]) {
			pressKey();
			act(() => next.focus());
		}
		advance(1500);
		move(page);
		expect(labels()).toEqual([]);
		// (f3b 2) the pointer resting on the control itself, Tab, the pointer leaves for the page, focus leaves the rail
		goes(page, discover);
		advance(400);
		pressKey();
		act(() => home.focus());
		expect(labels()).toEqual(["Home"]);
		goes(discover, page);
		advance(300);
		pressKey();
		act(() => link.focus());
		expect(labels()).toEqual([]);
		// while the pointer still rests on its control when focus leaves, that control's label is the owner's again
		goes(page, discover);
		advance(400);
		pressKey();
		act(() => home.focus());
		expect(labels()).toEqual(["Home"]);
		pressKey();
		act(() => link.focus());
		expect(labels()).toEqual(["Discover"]);
		expect(hoverable()).toBe(true);
	});

	it("finding 2: Escape with the pointer on the label ends that hover, so the pointer's first return to the control shows it again", () => {
		// the final review's flow f3, steps c-*
		const { discover, page } = pageRail();
		turnsUp(discover);
		advance(400);
		goes(discover, label() as HTMLElement);
		advance(300);
		pressKey("Escape");
		expect(labels()).toEqual([]);
		// the pointer goes off over the page, comes back and rests on the control: the label shows the first time
		turnsUp(page);
		advance(300);
		goes(page, discover);
		advance(600);
		expect(labels()).toEqual(["Discover"]);
		// Escape with the pointer on the control itself holds while it stays there, and ends when it leaves and comes back
		pressKey("Escape");
		expect(labels()).toEqual([]);
		move(discover);
		advance(600);
		expect(labels()).toEqual([]);
		goes(discover, page);
		goes(page, discover);
		advance(150);
		expect(labels()).toEqual(["Discover"]);
	});

	it("keep the label while the pointer crosses the strip onto the label and back, every pointerover the browser sends included; off the strip it goes", () => {
		const { home, page } = pageRail();
		turnsUp(home);
		advance(150);
		const shown = label() as HTMLElement;
		const strip = shown.querySelector("[data-rail-label-bridge]") as HTMLElement;
		goes(home, strip);
		expect(labels()).toEqual(["Home"]);
		goes(strip, shown);
		expect(labels()).toEqual(["Home"]);
		goes(shown, strip);
		goes(strip, home);
		advance(500);
		expect(labels()).toEqual(["Home"]);
		goes(home, strip);
		goes(strip, page);
		expect(labels()).toEqual([]);
	});

	it("end the pointer's hover when the pointer turns up anywhere but its control or its label, whatever went unreported before", () => {
		const { home, news, page, link } = pageRail();
		turnsUp(news);
		advance(150);
		expect(labels()).toEqual(["News"]);
		// the control moved from under a pointer standing still: only its arrival over the page is reported
		turnsUp(page);
		expect(labels()).toEqual([]);
		pressKey();
		act(() => home.focus());
		expect(labels()).toEqual(["Home"]);
		act(() => link.focus());
		expect(labels()).toEqual([]);
		// a finger on the page leaves a resting mouse alone
		goes(page, news);
		advance(150);
		expect(labels()).toEqual(["News"]);
		turnsUp(page, "touch");
		expect(labels()).toEqual(["News"]);
	});

	it("keep the pointer's label while keyboard focus lands on its own control; focus taking another control from under the pointer ends the hover", () => {
		const { news, discover, link } = pageRail();
		turnsUp(news);
		advance(150);
		goes(news, label() as HTMLElement);
		pressKey();
		act(() => news.focus());
		expect(labels()).toEqual(["News"]);
		expect(hoverable()).toBe(true);
		pressKey();
		act(() => discover.focus());
		expect(labels()).toEqual(["Discover"]);
		expect(hoverable()).toBe(false);
		pressKey();
		act(() => link.focus());
		expect(labels()).toEqual([]);
	});

	it("end the hover when the rail opens with the pointer on the label; closed again, a label only once the pointer arrives anew", () => {
		const { home, news, page, rerender } = pageRail();
		turnsUp(home);
		advance(150);
		goes(home, label() as HTMLElement);
		rerender(<PageRail texts={THREE_OPEN} />);
		expect(labels()).toEqual([]);
		rerender(<PageRail texts={THREE} />);
		advance(1000);
		expect(labels()).toEqual([]);
		turnsUp(page);
		goes(page, home);
		advance(150);
		expect(labels()).toEqual(["Home"]);
		// keyboard focus kept while the rail opens and closes: its label goes with its text and comes back with it
		pressKey();
		act(() => news.focus());
		expect(labels()).toEqual(["News"]);
		rerender(<PageRail texts={THREE_OPEN} />);
		expect(labels()).toEqual([]);
		rerender(<PageRail texts={THREE} />);
		expect(labels()).toEqual(["News"]);
	});

	it("keep the current owner's label through a page change, and drop a label whose control the new page re-created", () => {
		const { home, news, page, rerender } = pageRail();
		// the pointer resting on Home clicks it: the page changes under the pointer still resting there; its label stays
		turnsUp(home);
		advance(150);
		press(home);
		act(() => home.focus());
		rerender(<PageRail page={1} />);
		expect(labels()).toEqual(["Home"]);
		// keyboard focus on News, then the pointer clicks Home: a click's focus shows no label of its own, the pointer's shows
		goes(home, page);
		const news1 = screen.getByLabelText("News");
		modality(news1, true);
		pressKey();
		act(() => news1.focus());
		expect(labels()).toEqual(["News"]);
		goes(page, home);
		advance(150);
		press(home);
		act(() => home.focus());
		expect(labels()).toEqual(["Home"]);
		rerender(<PageRail page={2} />);
		expect(labels()).toEqual(["Home"]);
		// keyboard focus on News when the next page re-creates it: the label goes (nothing has focus) and stays gone
		goes(home, page);
		const news2 = screen.getByLabelText("News");
		modality(news2, true);
		pressKey();
		act(() => news2.focus());
		expect(labels()).toEqual(["News"]);
		rerender(<PageRail page={3} />);
		expect(labels()).toEqual([]);
		advance(1000);
		expect(labels()).toEqual([]);
		// the pointer resting on News when the page re-creates it: its hover ends; a move over the new News is a new rest
		const news3 = screen.getByLabelText("News");
		goes(page, news3);
		advance(150);
		expect(labels()).toEqual(["News"]);
		rerender(<PageRail page={4} />);
		expect(labels()).toEqual([]);
		const news4 = screen.getByLabelText("News");
		move(news4);
		advance(150);
		expect(labels()).toEqual(["News"]);
		expect(news.isConnected).toBe(false);
	});

	it("finding 3: keep the label inside a window shorter than the rail (it scrolls inside itself), beside its control, never over it", () => {
		// jsdom lays nothing out: the boxes are given (the closed rail 0-72, its account row 16-56 at the given height, the
		// label 66 x 31), the label's own box follows the left / top the placement writes
		const box = (left: number, top: number, width: number, height: number) =>
			({ left, top, width, height, x: left, y: top, right: left + width, bottom: top + height, toJSON: () => ({}) }) as DOMRect;
		const measure = HTMLElement.prototype.getBoundingClientRect;
		const height = window.innerHeight;
		let row = box(16, 373, 40, 48);
		HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
			if (this.dataset.railLabel !== undefined) return box(Number.parseFloat(this.style.left) || 0, Number.parseFloat(this.style.top) || 0, 66, 31);
			if (this.dataset.testRail !== undefined) return box(0, 0, 72, 448);
			if (this.getAttribute("aria-label") === "Hamza, Profile") return row;
			return measure.call(this);
		};
		function Account() {
			const rail = useRef<HTMLDivElement>(null);
			const labels = useRailLabels(rail, { account: "Hamza" });
			return (
				<>
					<div ref={rail} data-test-rail="">
						<button type="button" aria-label="Hamza, Profile" {...labels.props("account")} />
					</div>
					{labels.layer}
				</>
			);
		}
		const focused = () => {
			const view = render(<Account />);
			const control = screen.getByLabelText("Hamza, Profile");
			modality(control, true);
			pressKey();
			act(() => control.focus());
			const shown = label() as HTMLElement;
			const at = [shown.style.left, shown.style.top];
			view.unmount();
			return at;
		};
		try {
			// 844 x 390 (the tablet rail): the row at 373-421, two thirds below the window; hovered on its visible strip
			Object.defineProperty(window, "innerHeight", { value: 390, configurable: true });
			const hovered = render(<Account />);
			turnsUp(screen.getByLabelText("Hamza, Profile"));
			advance(150);
			const shown = label() as HTMLElement;
			// 8 right of the rail (so right of the row's 56: never over it), its bottom on the window's: 390 - 31
			expect([shown.style.left, shown.style.top]).toEqual(["80px", "359px"]);
			// the strip still spans the gap from the row to the label over the row's height
			const strip = shown.querySelector<HTMLElement>("[data-rail-label-bridge]") as HTMLElement;
			expect([strip.style.left, strip.style.width, strip.style.top, strip.style.height]).toEqual(["-25px", "24px", "13px", "48px"]);
			hovered.unmount();
			// keyboard focus scrolled the row into view (342-390): centred on it, as everywhere else (350.5 on the nearest pixel)
			row = box(16, 342, 40, 48);
			expect(focused()).toEqual(["80px", "351px"]);
			// a control partly above the window's top: down to the top edge
			row = box(16, -20, 40, 40);
			expect(focused()).toEqual(["80px", "0px"]);
			// a control wholly out of the window takes its label with it (no label left at the edge naming nothing there)
			row = box(16, 400, 40, 48);
			expect(focused()).toEqual(["80px", "409px"]);
			// 1440 x 400 (the desktop rail's 448 inside a 400 window): the row at 373-421
			Object.defineProperty(window, "innerHeight", { value: 400, configurable: true });
			row = box(16, 373, 40, 48);
			expect(focused()).toEqual(["80px", "369px"]);
		} finally {
			HTMLElement.prototype.getBoundingClientRect = measure;
			Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
		}
	});

	it("over thousands of random pointer, keyboard, Escape, rail and page steps: always hidden or the current owner's label, and the owner's when due", () => {
		// A seeded random walk against a model of what the person is doing: where the pointer is (the page, a control, a
		// control's label), what has keyboard focus, the rail's state. After every step the label shown must be exactly what
		// the model says: the focused control's (focus wins, unless Escape dismissed it), else the label the pointer is on, or
		// the control the pointer has rested on (arrived while the rail was closed, not dismissed since), else none. When a
		// label goes from under the pointer, the pointer is over the page; half the time the browser reports that at once.
		const IDS = ["home", "news", "discover"];
		const RUNS = 160;
		const STEPS = 40;
		let viaKeyboard = false;
		const matches = Element.prototype.matches;
		Element.prototype.matches = function (this: Element, sel: string) {
			return sel === ":focus-visible" ? viaKeyboard : matches.call(this, sel);
		} as typeof Element.prototype.matches;
		const mulberry32 = (seed: number) => () => {
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		type Loc = { at: "page" } | { at: "control" | "label"; id: string };
		try {
			for (let run = 1; run <= RUNS; run++) {
				const rnd = mulberry32(run);
				const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)] as T;
				let open = false;
				let pageN = 0;
				const view = render(<PageRail />);
				const rerender = () => view.rerender(<PageRail texts={open ? THREE_OPEN : THREE} page={pageN} />);
				const control = (id: string) => screen.getByLabelText(NAME[id] as string);
				const page = screen.getByTestId("page");
				const link = screen.getByText("STAK");
				// the model
				let loc: Loc = { at: "page" };
				let fresh = false; // the pointer's arrival on its control was seen (rail closed; no opening or new control since)
				let clock = 0; // ms the pointer has rested on its control
				let pDismissed = false;
				let focus: { id: string | null; keyboard: boolean } = { id: null, keyboard: false };
				let fDismissed = false;
				const texts = () => (open ? THREE_OPEN : THREE);
				const at = (l: Loc): Element => (l.at === "page" ? page : l.at === "control" ? control(l.id) : (label() as Element));
				const log: string[] = [];
				const arriveAt = (id: string) => {
					const from = loc;
					goes(at(from), control(id));
					loc = { at: "control", id };
					// back from its own label: the same hover
					if (from.at === "label" && from.id === id) return;
					fresh = !open;
					clock = 0;
					pDismissed = false;
				};
				const toPage = () => {
					goes(at(loc), page);
					loc = { at: "page" };
				};
				const wait = (ms: number) => {
					advance(ms);
					if (loc.at === "control") clock += ms;
				};
				/** a move on the control the pointer is on: an arrival after the rail changed under it, else it restarts the rest */
				const wiggle = (id: string) => {
					move(control(id));
					if (!fresh && !open) {
						fresh = true;
						clock = 0;
						pDismissed = false;
					} else if (fresh && clock < RAIL_LABEL_REST_MS && !pDismissed) clock = 0;
				};
				const tab = (to: HTMLElement, id: string) => {
					viaKeyboard = true;
					pressKey();
					act(() => to.focus());
					focus = { id, keyboard: true };
					fDismissed = false;
				};
				const expected = (): string[] => {
					const t = texts();
					if (focus.keyboard && focus.id && focus.id !== "link" && t[focus.id] && !fDismissed) return [focus.id];
					if (loc.at === "label") return [loc.id];
					if (loc.at === "control" && t[loc.id] && fresh && !pDismissed && clock >= RAIL_LABEL_REST_MS) return [loc.id];
					return [];
				};
				for (let i = 0; i < STEPS; i++) {
					const r = rnd();
					const id = pick(IDS);
					if (r < 0.22) {
						log.push(`pointer to ${id}`);
						if (loc.at === "control" && loc.id === id) wiggle(id);
						else arriveAt(id);
					} else if (r < 0.34) {
						const shown = label();
						if (loc.at === "control" && shown && hoverable() && shown.dataset.railLabel === loc.id) {
							const strip = rnd() < 0.5;
							log.push(strip ? "pointer onto the strip" : "pointer onto the label");
							goes(control(loc.id), strip ? (shown.querySelector("[data-rail-label-bridge]") as Element) : shown);
							loc = { at: "label", id: loc.id };
						} else {
							log.push("pause");
							wait(50);
						}
					} else if (r < 0.42) {
						log.push("pointer to the page");
						toPage();
					} else if (r < 0.56) {
						log.push("rest");
						wait(200);
					} else if (r < 0.61) {
						log.push("wiggle");
						if (loc.at === "control") wiggle(loc.id);
						else move(at(loc));
						wait(20);
					} else if (r < 0.73) {
						const to = pick(IDS.filter((x) => x !== focus.id));
						log.push(`Tab to ${to}`);
						tab(control(to), to);
					} else if (r < 0.77) {
						if (focus.id === "link") continue;
						log.push("Tab out to the page's link");
						tab(link, "link");
					} else if (r < 0.81) {
						log.push(`click ${id}`);
						if (!(loc.at === "control" && loc.id === id)) arriveAt(id);
						viaKeyboard = false;
						press(control(id));
						if (focus.id !== id) {
							act(() => control(id).focus());
							focus = { id, keyboard: false };
							fDismissed = false;
						}
					} else if (r < 0.84) {
						log.push("click the page");
						toPage();
						viaKeyboard = false;
						press(page);
						act(() => (document.activeElement as HTMLElement | null)?.blur?.());
						focus = { id: null, keyboard: false };
					} else if (r < 0.92) {
						log.push("Escape");
						pressKey("Escape");
						if (loc.at === "control") pDismissed = true;
						fDismissed = true;
					} else if (r < 0.96) {
						open = !open;
						log.push(open ? "the rail opens" : "the rail closes");
						rerender();
						fresh = false;
					} else {
						pageN++;
						log.push("page change (News re-created)");
						rerender();
						if (loc.at === "control" && loc.id === "news") fresh = false;
						if (focus.id === "news") focus = { id: null, keyboard: false };
					}
					// a label gone from under the pointer: the pointer is over the page (reported at once half the time)
					if (loc.at === "label") {
						const shown = label();
						if (!shown || shown.dataset.railLabel !== loc.id || !hoverable()) {
							loc = { at: "page" };
							if (rnd() < 0.5) turnsUp(page);
						}
					}
					const got = [...document.querySelectorAll<HTMLElement>("[data-rail-label]")].map((l) => l.dataset.railLabel);
					const want = expected();
					if (JSON.stringify(got) !== JSON.stringify(want))
						throw new Error(
							`run ${run}, step ${i + 1}: shown ${JSON.stringify(got)}, owner ${JSON.stringify(want)}\n` +
								`model: ${JSON.stringify({ loc, fresh, clock, pDismissed, focus, fDismissed, open })}\nsteps: ${log.join(" | ")}`,
						);
				}
				view.unmount();
			}
		} finally {
			Element.prototype.matches = matches;
		}
	}, 60000);
});
