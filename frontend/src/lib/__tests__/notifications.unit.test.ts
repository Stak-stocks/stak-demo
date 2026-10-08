import { describe, expect, it } from "vitest";
import { buildNotifications, unreadIds } from "@/lib/notifications";

const base = {
	held: [] as Array<{ ticker: string; name?: string; changePercent: number | null }>,
	closeRef: "today" as const,
	marketDay: "2026-09-26",
	deckCardsLeft: 0,
	deckDay: "2026-09-26",
	now: Date.parse("2026-09-26T12:00:00Z"),
};

describe("buildNotifications", () => {
	it("lists moves at/above 3% biggest first, with Android's id and copy", () => {
		const items = buildNotifications({
			...base,
			held: [
				{ ticker: "AAPL", name: "Apple", changePercent: 3.4 },
				{ ticker: "TSLA", name: "Tesla", changePercent: -7.06 },
				{ ticker: "MSFT", name: "Microsoft", changePercent: 1.2 },
			],
		});
		expect(items.map((i) => i.id)).toEqual(["move:2026-09-26:TSLA:down", "move:2026-09-26:AAPL:up"]);
		expect(items[0]!.title).toBe("TSLA is down 7.1% today");
		expect(items[0]!.body).toBe("Tesla, one of your saved stocks, moved 3% or more.");
	});

	it("words the session like Android after the close", () => {
		const [item] = buildNotifications({ ...base, closeRef: "Friday", held: [{ ticker: "NVDA", changePercent: 4 }] });
		expect(item!.title).toBe("NVDA is up 4.0% at Friday's close");
		expect(item!.time).toBe("Friday's close");
	});

	it("shows the deck with singular/plural cards, and only when cards remain", () => {
		expect(buildNotifications({ ...base, held: [{ ticker: "A", changePercent: 0 }], deckCardsLeft: 1 })[0]!.body).toBe("1 card left today, tuned to your taste.");
		expect(buildNotifications({ ...base, held: [{ ticker: "A", changePercent: 0 }], deckCardsLeft: 10 })[0]!.body).toBe("10 cards left today, tuned to your taste.");
		expect(buildNotifications({ ...base, held: [{ ticker: "A", changePercent: 0 }], deckCardsLeft: 0 })).toEqual([]);
	});

	it("prompts the first save only when nothing is saved", () => {
		expect(buildNotifications(base).map((i) => i.id)).toEqual(["first-save"]);
	});

	it("welcomes for 7 days after creation, then stops", () => {
		const fresh = buildNotifications({ ...base, held: [{ ticker: "A", changePercent: 0 }], createdAt: "2026-09-26T09:00:00Z", firstName: "Sam" });
		expect(fresh[0]).toMatchObject({ id: "welcome", title: "Welcome to STAK, Sam", time: "3h ago" });
		const old = buildNotifications({ ...base, held: [{ ticker: "A", changePercent: 0 }], createdAt: "2026-09-10T09:00:00Z" });
		expect(old).toEqual([]);
	});

	it("ignores stocks with no quote yet", () => {
		expect(buildNotifications({ ...base, held: [{ ticker: "A", changePercent: null }] })).toEqual([]);
	});
});

describe("unreadIds", () => {
	it("returns items whose id isn't in the read set", () => {
		const items = buildNotifications(base);
		expect(unreadIds(items, new Set())).toEqual(["first-save"]);
		expect(unreadIds(items, new Set(["first-save"]))).toEqual([]);
	});
});
