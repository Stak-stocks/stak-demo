/** Browser events the tests fire at `window` (not a test file: vitest collects only *.test.*). */

/** A `pageshow` event as the browser fires it when a document comes back from the back/forward cache (`persisted`). */
export function pageshowEvent(persisted: boolean): Event {
	const e = typeof PageTransitionEvent === "function" ? new PageTransitionEvent("pageshow", { persisted }) : new Event("pageshow");
	if ((e as PageTransitionEvent).persisted !== persisted) Object.defineProperty(e, "persisted", { value: persisted });
	return e;
}
