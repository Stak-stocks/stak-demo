import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Firestore mocks ──────────────────────────────────────────────────────────

const addMock = vi.fn();
const docMock = vi.fn(() => ({}));
const collectionMock = vi.fn((name: string) => {
	if (name === "users") return { doc: docMock };
	if (name === "swipes") return { add: addMock };
	throw new Error(`Unexpected collection ${name}`);
});

// Transaction mock backing services/swipeLimitService.ts's checkAndIncrementSwipeLimit
const txGetMock = vi.fn();
const txSetMock = vi.fn();
const runTransactionMock = vi.fn(async (updateFn: (tx: { get: typeof txGetMock; set: typeof txSetMock }) => Promise<unknown>) =>
	updateFn({ get: txGetMock, set: txSetMock }),
);

vi.mock("../../firebaseAdmin.js", () => ({
	adminDb: { collection: collectionMock, runTransaction: runTransactionMock },
}));

vi.mock("../../authMiddleware.js", () => ({
	authMiddleware: (req: any, _res: any, next: any) => {
		req.user = { uid: "u1", email: "u1@test.com" };
		next();
	},
}));

const recordActivityMock = vi.fn();
vi.mock("../../services/streakService.js", () => ({
	recordActivity: recordActivityMock,
}));

const updateUserTasteProfileMock = vi.fn();
vi.mock("../../services/tasteProfileService.js", () => ({
	updateUserTasteProfile: updateUserTasteProfileMock,
}));

async function buildApp() {
	vi.resetModules();
	const { swipeRouter } = await import("../swipe.js");
	const app = express();
	app.use(express.json());
	app.use("/", swipeRouter);
	return app;
}

function withDailyState(date: string, count: number, bonusSwipes = 0) {
	txGetMock.mockResolvedValueOnce({ data: () => ({ dailySwipeState: { date, count }, bonusSwipes }) });
}

describe("swipeRouter POST /", () => {
	// Fixed system time so "today" is deterministic regardless of when the test actually
	// runs -- the route now resolves its own fallback "today" via getEasternDateKey, not
	// raw new Date(), so a test relying on the real current moment could itself drift
	// across the ET/UTC boundary near midnight UTC (early evening US time).
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-24T18:00:00.000Z")); // 2pm ET
		vi.clearAllMocks();
		recordActivityMock.mockResolvedValue(null);
		updateUserTasteProfileMock.mockResolvedValue(undefined);
		addMock.mockResolvedValue({ id: "swipe1" });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const today = "2026-06-24";

	it("accepts and records a swipe when under the limit", async () => {
		withDailyState(today, 3);
		const app = await buildApp();

		const res = await request(app)
			.post("/")
			.send({ brandId: "aapl", direction: "right", ticker: "AAPL", todayKey: today });

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ success: true, dailySwipeCount: 4, dailySwipeLimit: 20 });
		expect(addMock).toHaveBeenCalledTimes(1);
		expect(recordActivityMock).toHaveBeenCalledWith("u1", "swipe", today);
		expect(updateUserTasteProfileMock).toHaveBeenCalledWith("u1", "AAPL", "right_swipe");
	});

	it("rejects without recording anything once the limit is reached", async () => {
		withDailyState(today, 20);
		const app = await buildApp();

		const res = await request(app)
			.post("/")
			.send({ brandId: "aapl", direction: "right", ticker: "AAPL", todayKey: today });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ success: false, limitReached: true, dailySwipeCount: 20, dailySwipeLimit: 20 });
		expect(addMock).not.toHaveBeenCalled();
		expect(recordActivityMock).not.toHaveBeenCalled();
		expect(updateUserTasteProfileMock).not.toHaveBeenCalled();
	});

	it("ignores bonus swipes when computing the effective limit (temporarily disabled)", async () => {
		withDailyState(today, 19, 5); // bonus would have mattered if applied; base limit alone still accepts
		const app = await buildApp();

		const res = await request(app)
			.post("/")
			.send({ brandId: "aapl", direction: "right", todayKey: today });

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ success: true, dailySwipeCount: 20, dailySwipeLimit: 20 });
	});

	it("rejects at the flat base limit even with bonus swipes accumulated", async () => {
		withDailyState(today, 20, 5);
		const app = await buildApp();

		const res = await request(app)
			.post("/")
			.send({ brandId: "aapl", direction: "right", todayKey: today });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ success: false, limitReached: true, dailySwipeCount: 20, dailySwipeLimit: 20 });
	});

	it("trusts the client's todayKey even once server UTC has already rolled to tomorrow", async () => {
		// 00:30 UTC the morning after `today` -- already "tomorrow" in UTC, but still
		// ~8:30pm ET on `today` itself. The client's todayKey (the user's own local day)
		// is still "today" and should be honored -- this is exactly the scenario that
		// would have wrongly started a fresh count (and a broken streak) if the server's
		// own fallback/validation still ran on raw UTC.
		vi.setSystemTime(new Date("2026-06-25T00:30:00.000Z"));
		withDailyState(today, 20);
		const app = await buildApp();

		const res = await request(app)
			.post("/")
			.send({ brandId: "aapl", direction: "right", todayKey: today });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ success: false, limitReached: true, dailySwipeCount: 20, dailySwipeLimit: 20 });
	});

	it("clamps a wildly out-of-range todayKey to the server's own date instead of trusting it", async () => {
		// Stored count is for the SERVER's real today, not the bogus future date the
		// client claims — if the client's date were trusted blindly, this would read
		// as a fresh day (count 0) and always accept, regardless of being at the limit.
		withDailyState(today, 20);
		const app = await buildApp();

		const res = await request(app)
			.post("/")
			.send({ brandId: "aapl", direction: "right", todayKey: "2099-01-01" });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ success: false, limitReached: true, dailySwipeCount: 20, dailySwipeLimit: 20 });
	});

	it("starts a fresh count when the stored date doesn't match today", async () => {
		txGetMock.mockResolvedValueOnce({ data: () => ({ dailySwipeState: { date: "2020-01-01", count: 99 } }) });
		const app = await buildApp();

		const res = await request(app)
			.post("/")
			.send({ brandId: "aapl", direction: "right", todayKey: today });

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ success: true, dailySwipeCount: 1, dailySwipeLimit: 20 });
	});

	it("returns 400 when brandId or direction is missing", async () => {
		const app = await buildApp();
		const res = await request(app).post("/").send({ direction: "right" });
		expect(res.status).toBe(400);
	});

	it("returns 400 for an invalid direction", async () => {
		const app = await buildApp();
		const res = await request(app).post("/").send({ brandId: "aapl", direction: "up" });
		expect(res.status).toBe(400);
	});
});
