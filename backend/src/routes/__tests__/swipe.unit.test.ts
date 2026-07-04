import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
const ensureUserRowMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	ensureUserRow: ensureUserRowMock,
}));

const checkAndIncrementSwipeLimitMock = vi.fn();
vi.mock("../../services/swipeLimitService.js", () => ({
	checkAndIncrementSwipeLimit: checkAndIncrementSwipeLimitMock,
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

describe("swipeRouter POST /", () => {
	const today = "2026-06-24";

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-24T18:00:00.000Z")); // 2pm ET
		vi.clearAllMocks();
		recordActivityMock.mockResolvedValue(null);
		updateUserTasteProfileMock.mockResolvedValue(undefined);
		ensureUserRowMock.mockResolvedValue(undefined);
		pgQueryMock.mockResolvedValue({ rows: [] });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("accepts and records a swipe when under the limit", async () => {
		checkAndIncrementSwipeLimitMock.mockResolvedValueOnce({ accepted: true, count: 4, limit: 20 });
		const app = await buildApp();

		const res = await request(app)
			.post("/")
			.send({ brandId: "aapl", direction: "right", ticker: "AAPL", todayKey: today });

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ success: true, dailySwipeCount: 4, dailySwipeLimit: 20 });
		expect(pgQueryMock).toHaveBeenCalledWith(
			expect.stringContaining("insert into swipes"),
			expect.any(Array),
		);
		expect(recordActivityMock).toHaveBeenCalledWith("u1", "swipe", today);
		expect(updateUserTasteProfileMock).toHaveBeenCalledWith("u1", "AAPL", "right_swipe");
	});

	it("rejects without recording anything once the limit is reached", async () => {
		checkAndIncrementSwipeLimitMock.mockResolvedValueOnce({ accepted: false, count: 20, limit: 20 });
		const app = await buildApp();

		const res = await request(app)
			.post("/")
			.send({ brandId: "aapl", direction: "right", ticker: "AAPL", todayKey: today });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ success: false, limitReached: true, dailySwipeCount: 20, dailySwipeLimit: 20 });
		expect(pgQueryMock).not.toHaveBeenCalledWith(
			expect.stringContaining("insert into swipes"),
			expect.any(Array),
		);
		expect(recordActivityMock).not.toHaveBeenCalled();
		expect(updateUserTasteProfileMock).not.toHaveBeenCalled();
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
