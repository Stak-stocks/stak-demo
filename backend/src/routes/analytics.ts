import { Router, Request, Response } from "express";
import { getEasternDateKey } from "@stak/shared";
import { pgQuery } from "../lib/postgres.js";

export const analyticsRouter = Router();

function checkAdminSecret(req: Request, res: Response): boolean {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return false;
	}
	return true;
}

// Resolve excluded emails to UIDs once and cache in memory.
// Reads directly from the users Postgres table — no Firebase Auth dependency.
let excludedUidsPromise: Promise<Set<string>> | null = null;
function getExcludedUids(): Promise<Set<string>> {
	if (excludedUidsPromise) return excludedUidsPromise;
	excludedUidsPromise = (async () => {
		const emails = (process.env.ANALYTICS_EXCLUDED_EMAILS ?? "")
			.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
		if (emails.length === 0) return new Set<string>();
		const result = await pgQuery<{ uid: string }>(
			`select uid from users where lower(email) = any($1::text[])`,
			[emails],
		);
		return new Set(result.rows.map((r) => r.uid));
	})();
	return excludedUidsPromise;
}

interface SwipeDoc {
	uid: string;
	direction: string;
	brandId: string;
	timestamp: string;
	timeOnCardMs?: number;
}

interface SessionDoc {
	uid: string;
	date: string;
}

interface EventDoc {
	uid: string;
	type: string;
	brandId?: string;
	ticker?: string;
	params?: Record<string, unknown>;
	timestamp: string;
}

function toIsoString(value: string | Date): string {
	return value instanceof Date ? value.toISOString() : value;
}

async function pgFetchSwipes(sinceIso?: string): Promise<SwipeDoc[]> {
	const result = sinceIso
		? await pgQuery<SwipeDoc>(
			`select uid, direction, brand_id as "brandId", occurred_at as "timestamp", time_on_card_ms as "timeOnCardMs"
			from swipes where occurred_at >= $1`,
			[sinceIso],
		)
		: await pgQuery<SwipeDoc>(
			`select uid, direction, brand_id as "brandId", occurred_at as "timestamp", time_on_card_ms as "timeOnCardMs"
			from swipes`,
		);
	return result.rows.map((r) => ({ ...r, timestamp: toIsoString(r.timestamp) }));
}

async function pgFetchSessions(sinceDate?: string): Promise<SessionDoc[]> {
	const result = sinceDate
		? await pgQuery<SessionDoc>(`select uid, date from sessions where date >= $1`, [sinceDate])
		: await pgQuery<SessionDoc>(`select uid, date from sessions`);
	return result.rows;
}

async function pgFetchSwipesRange(fromIso: string, toIso: string): Promise<SwipeDoc[]> {
	const result = await pgQuery<SwipeDoc>(
		`select uid, direction, brand_id as "brandId", occurred_at as "timestamp", time_on_card_ms as "timeOnCardMs"
		from swipes where occurred_at >= $1 and occurred_at <= $2`,
		[fromIso, toIso],
	);
	return result.rows.map((r) => ({ ...r, timestamp: toIsoString(r.timestamp) }));
}

async function pgFetchSessionsRange(fromDate: string, toDate: string): Promise<SessionDoc[]> {
	const result = await pgQuery<SessionDoc>(
		`select uid, date from sessions where date >= $1 and date <= $2`,
		[fromDate, toDate],
	);
	return result.rows;
}

async function pgFetchEvents(sinceIso: string): Promise<EventDoc[]> {
	const result = await pgQuery<EventDoc>(
		`select uid, type, brand_id as "brandId", ticker, params, occurred_at as "timestamp"
		from events where occurred_at >= $1`,
		[sinceIso],
	);
	return result.rows.map((r) => ({ ...r, timestamp: toIsoString(r.timestamp) }));
}

function computeSwipeStats(swipes: SwipeDoc[], periodDays: number) {
	const total = swipes.length;
	const right = swipes.filter((s) => s.direction === "right").length;
	const left = swipes.filter((s) => s.direction === "left").length;
	const uniqueUsers = new Set(swipes.map((s) => s.uid)).size;
	const dailyAverage = periodDays > 0
		? Math.round((total / periodDays) * 10) / 10
		: total;
	return { total, right, left, uniqueUsers, dailyAverage };
}

// GET /api/admin/analytics
analyticsRouter.get("/", async (req: Request, res: Response) => {
	if (!checkAdminSecret(req, res)) return;

	try {
		const [excluded, now] = [await getExcludedUids(), new Date()];

		const todayDate = getEasternDateKey(now);
		const todayStart = new Date(todayDate + "T00:00:00Z");

		const weekStartRaw = new Date(now);
		weekStartRaw.setDate(weekStartRaw.getDate() - 7);
		const weekStartDate = getEasternDateKey(weekStartRaw);
		const weekStart = new Date(weekStartDate + "T00:00:00Z");

		const monthStartRaw = new Date(now);
		monthStartRaw.setDate(monthStartRaw.getDate() - 30);
		const monthStartDate = getEasternDateKey(monthStartRaw);
		const monthStart = new Date(monthStartDate + "T00:00:00Z");

		let [monthSwipes, allSwipes, monthSessions, allSessions] = await Promise.all([
			pgFetchSwipes(monthStart.toISOString()),
			pgFetchSwipes(),
			pgFetchSessions(monthStartDate),
			pgFetchSessions(),
		]);
		monthSwipes = monthSwipes.filter((s) => !excluded.has(s.uid));
		allSwipes = allSwipes.filter((s) => !excluded.has(s.uid));
		monthSessions = monthSessions.filter((s) => !excluded.has(s.uid));
		allSessions = allSessions.filter((s) => !excluded.has(s.uid));

		const todaySwipes = monthSwipes.filter((s) => s.timestamp >= todayStart.toISOString());
		const weekSwipes = monthSwipes.filter((s) => s.timestamp >= weekStart.toISOString());
		const todaySessions = monthSessions.filter((s) => s.date === todayDate);
		const weekSessions = monthSessions.filter((s) => s.date >= weekStartDate);

		const dau = new Set(todaySessions.map((s) => s.uid)).size;
		const wau = new Set(weekSessions.map((s) => s.uid)).size;
		const mau = new Set(monthSessions.map((s) => s.uid)).size;

		const firstTimestamp = allSwipes.length > 0
			? allSwipes.reduce((min, s) => s.timestamp < min ? s.timestamp : min, allSwipes[0].timestamp)
			: null;
		const daysSinceFirst = firstTimestamp
			? Math.max(1, Math.ceil((now.getTime() - new Date(firstTimestamp).getTime()) / (1000 * 60 * 60 * 24)))
			: 1;
		const allTimeStats = computeSwipeStats(allSwipes, daysSinceFirst);

		const weekLoginsByUser: Record<string, Set<string>> = {};
		for (const s of weekSessions) {
			if (!weekLoginsByUser[s.uid]) weekLoginsByUser[s.uid] = new Set();
			weekLoginsByUser[s.uid].add(s.date);
		}
		const weekActiveUsers = Object.values(weekLoginsByUser);
		const avgLoginDaysPerWeek = weekActiveUsers.length > 0
			? Math.round((weekActiveUsers.reduce((sum, days) => sum + days.size, 0) / weekActiveUsers.length) * 10) / 10
			: 0;

		const allLoginsByUser: Record<string, Set<string>> = {};
		for (const s of allSessions) {
			if (!allLoginsByUser[s.uid]) allLoginsByUser[s.uid] = new Set();
			allLoginsByUser[s.uid].add(s.date);
		}
		const allActiveUsers = Object.values(allLoginsByUser);
		const avgLoginDaysPerWeekAllTime = allActiveUsers.length > 0
			? Math.round((allActiveUsers.reduce((sum, days) => sum + (days.size / (daysSinceFirst / 7)), 0) / allActiveUsers.length) * 10) / 10
			: 0;

		const swipesByUserDate: Record<string, number> = {};
		for (const s of allSwipes) {
			const date = s.timestamp.split("T")[0];
			const key = `${s.uid}_${date}`;
			swipesByUserDate[key] = (swipesByUserDate[key] || 0) + 1;
		}
		const dailyCounts = Object.values(swipesByUserDate);
		const avgDailySwipesPerUser = dailyCounts.length > 0
			? Math.round((dailyCounts.reduce((sum, c) => sum + c, 0) / dailyCounts.length) * 10) / 10
			: 0;

		const swipesWithTime = allSwipes.filter((s) => (s.timeOnCardMs ?? 0) > 0);
		const avgTimeOnCardMs = swipesWithTime.length > 0
			? Math.round(swipesWithTime.reduce((sum, s) => sum + (s.timeOnCardMs ?? 0), 0) / swipesWithTime.length)
			: 0;
		const avgTimeOnCardSec = Math.round(avgTimeOnCardMs / 100) / 10;

		res.json({
			activeUsers: { dau, wau, mau },
			swipes: {
				today: computeSwipeStats(todaySwipes, 1),
				week: computeSwipeStats(weekSwipes, 7),
				month: computeSwipeStats(monthSwipes, 30),
				allTime: {
					...allTimeStats,
					weeklyAverage: Math.round((allTimeStats.total / (daysSinceFirst / 7)) * 10) / 10,
					monthlyAverage: Math.round((allTimeStats.total / (daysSinceFirst / 30)) * 10) / 10,
					daysSinceFirst,
				},
			},
			engagement: {
				avgLoginDaysPerWeek,
				avgLoginDaysPerWeekAllTime,
				avgDailySwipesPerUser,
				avgTimeOnCardSec,
				avgTimeOnCardMs,
			},
		});
	} catch (error) {
		console.error("Error fetching analytics:", error);
		res.status(500).json({ error: "Failed to fetch analytics" });
	}
});

// GET /api/admin/analytics/range?from=YYYY-MM-DD&to=YYYY-MM-DD
analyticsRouter.get("/range", async (req: Request, res: Response) => {
	if (!checkAdminSecret(req, res)) return;

	const { from, to } = req.query as { from?: string; to?: string };
	if (!from || !to) {
		res.status(400).json({ error: "from and to query params are required (YYYY-MM-DD)" });
		return;
	}

	const fromDate = new Date(`${from}T00:00:00.000Z`);
	const toDate = new Date(`${to}T23:59:59.999Z`);

	if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
		res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
		return;
	}

	if (fromDate > toDate) {
		res.status(400).json({ error: "from must be before to" });
		return;
	}

	try {
		const excluded = await getExcludedUids();
		const days = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));

		let [swipes, sessions] = await Promise.all([
			pgFetchSwipesRange(fromDate.toISOString(), toDate.toISOString()),
			pgFetchSessionsRange(from, to),
		]);
		swipes = swipes.filter((s) => !excluded.has(s.uid));
		sessions = sessions.filter((s) => !excluded.has(s.uid));

		const total = swipes.length;
		const right = swipes.filter((s) => s.direction === "right").length;
		const left = swipes.filter((s) => s.direction === "left").length;
		const uniqueUsers = new Set(swipes.map((s) => s.uid)).size;
		const activeUsers = new Set(sessions.map((s) => s.uid)).size;
		const dailyAverage = Math.round((total / days) * 10) / 10;

		const swipesByUserDate: Record<string, number> = {};
		for (const s of swipes) {
			const date = s.timestamp.split("T")[0];
			const key = `${s.uid}_${date}`;
			swipesByUserDate[key] = (swipesByUserDate[key] || 0) + 1;
		}
		const dailyCounts = Object.values(swipesByUserDate);
		const avgDailySwipesPerUser = dailyCounts.length > 0
			? Math.round((dailyCounts.reduce((sum, c) => sum + c, 0) / dailyCounts.length) * 10) / 10
			: 0;

		const loginsByUser: Record<string, Set<string>> = {};
		for (const s of sessions) {
			if (!loginsByUser[s.uid]) loginsByUser[s.uid] = new Set();
			loginsByUser[s.uid].add(s.date);
		}
		const activeUserList = Object.values(loginsByUser);
		const avgLoginDaysPerWeek = activeUserList.length > 0
			? Math.round((activeUserList.reduce((sum, d) => sum + (d.size / (days / 7)), 0) / activeUserList.length) * 10) / 10
			: 0;

		const swipesWithTime = swipes.filter((s) => (s.timeOnCardMs ?? 0) > 0);
		const avgTimeOnCardMs = swipesWithTime.length > 0
			? Math.round(swipesWithTime.reduce((sum, s) => sum + (s.timeOnCardMs ?? 0), 0) / swipesWithTime.length)
			: 0;

		res.json({
			from,
			to,
			days,
			swipes: { total, right, left, uniqueUsers, dailyAverage },
			activeUsers,
			engagement: {
				avgDailySwipesPerUser,
				avgLoginDaysPerWeek,
				avgTimeOnCardSec: Math.round(avgTimeOnCardMs / 100) / 10,
			},
		});
	} catch (error) {
		console.error("Error fetching range analytics:", error);
		res.status(500).json({ error: "Failed to fetch range analytics" });
	}
});

// GET /api/admin/analytics/events — feature usage from the events table
analyticsRouter.get("/events", async (req: Request, res: Response) => {
	if (!checkAdminSecret(req, res)) return;

	try {
		const excluded = await getExcludedUids();
		const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

		const events = (await pgFetchEvents(since)).filter((e) => !excluded.has(e.uid));

		const countByType: Record<string, number> = {};
		for (const e of events) {
			countByType[e.type] = (countByType[e.type] ?? 0) + 1;
		}

		const tabCounts: Record<string, number> = {};
		for (const e of events.filter((e) => e.type === "tab_view")) {
			const tab = (e.params?.tab as string) ?? "unknown";
			tabCounts[tab] = (tabCounts[tab] ?? 0) + 1;
		}

		const brandCounts: Record<string, { brandId: string; ticker?: string; taps: number; learnMore: number }> = {};
		for (const e of events.filter((e) => e.brandId && (e.type === "brand_tap" || e.type === "learn_more"))) {
			const id = e.brandId!;
			if (!brandCounts[id]) brandCounts[id] = { brandId: id, ticker: e.ticker, taps: 0, learnMore: 0 };
			if (e.type === "brand_tap") brandCounts[id].taps++;
			if (e.type === "learn_more") brandCounts[id].learnMore++;
		}
		const topBrands = Object.values(brandCounts)
			.map((b) => ({ ...b, total: b.taps + b.learnMore }))
			.sort((a, b) => b.total - a.total)
			.slice(0, 20);

		res.json({ periodDays: 30, countByType, tabCounts, topBrands });
	} catch (error) {
		console.error("Error fetching event analytics:", error);
		res.status(500).json({ error: "Failed to fetch event analytics" });
	}
});
