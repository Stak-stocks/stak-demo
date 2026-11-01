import { describe, expect, it } from "vitest";
import { DEFAULT_DECK_LABEL, cardArtUrl, deckLabelFor, formatPrice, nextDeckNote, sessionWord } from "../discoverTheme";

describe("discoverTheme", () => {
	it("names a card's art file from its ticker", () => {
		expect(cardArtUrl("NVDA")).toBe("/discover-art/nvda.webp");
		expect(cardArtUrl("BRK.B")).toBe("/discover-art/brk_b.webp");
	});

	it("falls back to the default deck label when no category is known", () => {
		expect(deckLabelFor(["ZZZZ", "YYYY"])).toBe(DEFAULT_DECK_LABEL);
		expect(deckLabelFor([])).toBe(DEFAULT_DECK_LABEL);
	});

	it("labels a deck by its leading categories", () => {
		expect(deckLabelFor(["NVDA", "AMD", "AVGO"]).startsWith("TODAY · ")).toBe(true);
	});

	it("says when the next deck lands", () => {
		expect(nextDeckNote(new Date(2026, 8, 24, 7, 0))).toBe("A new deck lands at 9am.");
		expect(nextDeckNote(new Date(2026, 8, 24, 15, 0))).toBe("A new deck lands tomorrow at 9am.");
	});

	it("shows the price, or a dash while it's unknown", () => {
		expect(formatPrice(1234.5)).toBe("$1,234.50");
		expect(formatPrice(null)).toBe("—");
	});

	it("calls a move 'today' only while the market is open or has opened", () => {
		expect(sessionWord(new Date("2026-09-23T15:00:00Z"))).toBe("today"); // Wed 11:00 ET
		expect(sessionWord(new Date("2026-09-21T12:00:00Z"))).toBe("on Friday"); // Mon 08:00 ET, before the open
		expect(sessionWord(new Date("2026-09-26T15:00:00Z"))).toBe("on Friday"); // Saturday
	});
});
