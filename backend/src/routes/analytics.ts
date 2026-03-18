import { Router, Request, Response } from "express";
import { adminDb, adminAuth } from "../firebaseAdmin.js";

export const analyticsRouter = Router();

function checkAdminSecret(req: Request, res: Response): boolean {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
		res.status(403).json({ error: "Forbidden" });
		return false;
	}
	return true;
}

// Resolve excluded emails to UIDs once and cache in memory
// Promise lock prevents duplicate lookups on concurrent requests
let excludedUidsPromise: Promise<Set<string>> | null = null;
function getExcludedUids(): Promise<Set<string>> {
	if (excludedUidsPromise) return excludedUidsPromise;
	excludedUidsPromise = (async () => {
		const emails = (process.env.ANALYTICS_EXCLUDED_EMAILS ?? "")
			.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
		const uids = new Set<string>();
		await Promise.all(emails.map(async (email) => {
			try {
				const user = await adminAuth.getUserByEmail(email);
				uids.add(user.uid);
			} catch {
				// email not found in Firebase Auth — skip
			}
		}));
		return uids;
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

		const todayStart = new Date(now);
		todayStart.setHours(0, 0, 0, 0);

		const weekStart = new Date(now);
		weekStart.setDate(weekStart.getDate() - 7);
		weekStart.setHours(0, 0, 0, 0);

		const monthStart = new Date(now);
		monthStart.setDate(monthStart.getDate() - 30);
		monthStart.setHours(0, 0, 0, 0);

		const todayDate = now.toISOString().split("T")[0];
		const weekStartDate = weekStart.toISOString().split("T")[0];
		const monthStartDate = monthStart.toISOString().split("T")[0];

		// Fetch all data in parallel
		const [monthSwipeSnap, allSwipeSnap, monthSessionSnap, allSessionSnap] = await Promise.all([
			adminDb.collection("swipes").where("timestamp", ">=", monthStart.toISOString()).get(),
			adminDb.collection("swipes").get(),
			adminDb.collection("sessions").where("date", ">=", monthStartDate).get(),
			adminDb.collection("sessions").get(),
		]);

		const monthSwipes = monthSwipeSnap.docs.map((d) => d.data() as SwipeDoc).filter((s) => !excluded.has(s.uid));
		const allSwipes = allSwipeSnap.docs.map((d) => d.data() as SwipeDoc).filter((s) => !excluded.has(s.uid));
		const monthSessions = monthSessionSnap.docs.map((d) => d.data() as SessionDoc).filter((s) => !excluded.has(s.uid));
		const allSessions = allSessionSnap.docs.map((d) => d.data() as SessionDoc).filter((s) => !excluded.has(s.uid));

		// Slice periods from already-fetched data
		const todaySwipes = monthSwipes.filter((s) => s.timestamp >= todayStart.toISOString());
		const weekSwipes = monthSwipes.filter((s) => s.timestamp >= weekStart.toISOString());
		const todaySessions = monthSessions.filter((s) => s.date === todayDate);
		const weekSessions = monthSessions.filter((s) => s.date >= weekStartDate);

		// ── DAU / WAU / MAU ──
		const dau = new Set(todaySessions.map((s) => s.uid)).size;
		const wau = new Set(weekSessions.map((s) => s.uid)).size;
		const mau = new Set(monthSessions.map((s) => s.uid)).size;

		// ── All-time base ──
		const firstTimestamp = allSwipes.length > 0
			? allSwipes.reduce((min, s) => s.timestamp < min ? s.timestamp : min, allSwipes[0].timestamp)
			: null;
		const daysSinceFirst = firstTimestamp
			? Math.max(1, Math.ceil((now.getTime() - new Date(firstTimestamp).getTime()) / (1000 * 60 * 60 * 24)))
			: 1;
		const allTimeStats = computeSwipeStats(allSwipes, daysSinceFirst);

		// ── Login frequency: avg active days/week per user ──
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

		// ── Avg daily swipes per user ──
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

		// ── Avg time on card ──
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

		const [swipeSnap, sessionSnap] = await Promise.all([
			adminDb.collection("swipes")
				.where("timestamp", ">=", fromDate.toISOString())
				.where("timestamp", "<=", toDate.toISOString())
				.get(),
			adminDb.collection("sessions")
				.where("date", ">=", from)
				.where("date", "<=", to)
				.get(),
		]);

		const swipes = swipeSnap.docs.map((d) => d.data() as SwipeDoc).filter((s) => !excluded.has(s.uid));
		const sessions = sessionSnap.docs.map((d) => d.data() as SessionDoc).filter((s) => !excluded.has(s.uid));

		const total = swipes.length;
		const right = swipes.filter((s) => s.direction === "right").length;
		const left = swipes.filter((s) => s.direction === "left").length;
		const uniqueUsers = new Set(swipes.map((s) => s.uid)).size;
		const activeUsers = new Set(sessions.map((s) => s.uid)).size;
		const dailyAverage = Math.round((total / days) * 10) / 10;

		// Avg daily swipes per user
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

		// Avg login days per week per user in range
		const loginsByUser: Record<string, Set<string>> = {};
		for (const s of sessions) {
			if (!loginsByUser[s.uid]) loginsByUser[s.uid] = new Set();
			loginsByUser[s.uid].add(s.date);
		}
		const activeUserList = Object.values(loginsByUser);
		const avgLoginDaysPerWeek = activeUserList.length > 0
			? Math.round((activeUserList.reduce((sum, d) => sum + (d.size / (days / 7)), 0) / activeUserList.length) * 10) / 10
			: 0;

		// Avg time on card
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

// POST /api/admin/analytics/backfill-sessions
// One-time: populates sessions collection from historical swipe data
analyticsRouter.post("/backfill-sessions", async (req: Request, res: Response) => {
	if (!checkAdminSecret(req, res)) return;

	try {
		const [snapshot, excluded] = await Promise.all([
			adminDb.collection("swipes").get(),
			getExcludedUids(),
		]);
		const swipes = snapshot.docs.map((d) => d.data() as SwipeDoc);

		// Collect unique uid+date pairs, skipping internal team members
		const seen = new Set<string>();
		for (const s of swipes) {
			if (!s.uid || !s.timestamp || excluded.has(s.uid)) continue;
			const date = s.timestamp.split("T")[0];
			seen.add(`${s.uid}_${date}`);
		}

		// Write in batches of 500 (Firestore limit)
		const entries = Array.from(seen);
		let written = 0;
		for (let i = 0; i < entries.length; i += 500) {
			const batch = adminDb.batch();
			for (const key of entries.slice(i, i + 500)) {
				const [uid, date] = key.split("_");
				batch.set(adminDb.collection("sessions").doc(key), { uid, date });
			}
			await batch.commit();
			written += Math.min(500, entries.length - i);
		}

		res.json({ success: true, sessionsWritten: written });
	} catch (error) {
		console.error("Error backfilling sessions:", error);
		res.status(500).json({ error: "Backfill failed" });
	}
});
