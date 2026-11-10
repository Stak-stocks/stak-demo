import { Router, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { getEasternDateKey } from "@stak/shared";
import { pgQuery } from "../lib/postgres.js";

export const analyticsRouter = Router();

/** The header against the secret in constant time, so the time a wrong guess takes says nothing about how close it was. */
function secretMatches(given: unknown, expected: string): boolean {
	if (typeof given !== "string") return false;
	const a = Buffer.from(given), b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

function checkAdminSecret(req: Request, res: Response): boolean {
	const secret = req.headers["x-admin-secret"];
	if (!process.env.ADMIN_SECRET || !secretMatches(secret, process.env.ADMIN_SECRET)) {
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

/** One beta tester's row: STAK's side of the master sheet (TestFlight's side comes from App Store Connect). */
interface BetaRow {
	email: string | null;
	display_name: string | null;
	created_at: string;
	onboarding_completed: boolean;
	platform: string | null;
	swipes: number;
	companies_swiped: number;
	right_swipes: number;
	staks: number;
	saved_now: number;
	quick_looks: number;
	company_opens: number;
	saved_company_opens: number;
	news_opens: number;
	news_tab_views: number;
	simulate_tab_views: number;
	sim_trades: number;
	simulate_used: boolean;
	active_days: number;
	last_active: string | null;
	day3: boolean | null;
	day7: boolean | null;
}

/**
 * Activated (the beta's definition): an account that finished onboarding, swiped at least 10 companies (different
 * ones - the deck shows a passed company again), STAKed at least 3, and opened at least one Quick Look or saved company.
 */
export function isActivated(r: Pick<BetaRow, "onboarding_completed" | "companies_swiped" | "staks" | "quick_looks" | "saved_company_opens">): boolean {
	return r.onboarding_completed && r.companies_swiped >= 10 && r.staks >= 3 && (r.quick_looks >= 1 || r.saved_company_opens >= 1);
}

const BETA_COLUMNS: (keyof BetaRow | "activated")[] = [
	"email", "display_name", "platform", "created_at", "onboarding_completed", "activated", "swipes", "companies_swiped",
	"right_swipes", "staks", "saved_now", "quick_looks", "company_opens", "saved_company_opens", "news_opens", "news_tab_views",
	"simulate_tab_views", "sim_trades", "simulate_used", "active_days", "last_active", "day3", "day7",
];

/**
 * A CSV cell: quoted when it holds a comma, quote or line break. Text starting like a formula (= + - @, tab, return -
 * "+tag@x.com" is a valid email) gets a leading apostrophe, so Sheets and Excel show it rather than run it.
 */
export function csvCell(v: unknown): string {
	let s = v == null ? "" : String(v);
	if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
	return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// POST /api/admin/analytics/beta { emails: ["a@x.com", ...], since: "2026-11-01", format: "csv" } — one row per beta tester for
// the master sheet: account created, onboarding, swipes, STAKs (companies ever saved, from a swipe or any Save button),
// Quick Looks, company opens, News, Simulate, last active, whether they came back on Day 3 / Day 7 (active on the
// signup day + 3 / + 7 in Eastern time, blank until that day is over), and activated (isActivated). A day counts as
// active when the app recorded a visit (GET /api/me), a swipe, a save, a trade or an event: the visit alone misses an
// app resumed from the background. display_name helps pair an account whose email isn't the tester's (Apple's private
// relay). `emails` limits it to those accounts - team accounts included when named (with no visits: those aren't
// recorded for them); without it, every account since `since` minus the excluded ones. News article opens and News /
// Simulate tab views count from the app builds that log them (2026-11-10; the web logs neither); platform from the
// 2026-11-10 backend. A POST, so the
// testers' emails travel in the body rather than the URL, which request logs keep.
analyticsRouter.post("/beta", async (req: Request, res: Response) => {
	if (!checkAdminSecret(req, res)) return;
	res.set("Cache-Control", "no-store");
	const body = (req.body ?? {}) as { emails?: unknown; since?: unknown; format?: unknown };
	const emails = Array.isArray(body.emails)
		? body.emails.filter((e): e is string => typeof e === "string").map((e) => e.trim().toLowerCase()).filter(Boolean).slice(0, 2000)
		: [];
	const since = typeof body.since === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.since) ? body.since : null;
	try {
		const excluded = emails.length ? [] : [...(await getExcludedUids())];
		const result = await pgQuery<BetaRow>(
			`with u as (
			   select uid, email, display_name, created_at, onboarding_completed,
			     (created_at at time zone 'America/New_York')::date as signup_day
			   from users
			   where (cardinality($1::text[]) = 0 or lower(email) = any($1::text[]))
			     and ($2::date is null or created_at >= ($2::date::timestamp at time zone 'America/New_York'))
			     and not (uid = any($3::text[]))
			 ),
			 today as (select (now() at time zone 'America/New_York')::date as d)
			 select u.email, u.display_name, u.created_at, u.onboarding_completed,
			   (select platform from sessions x where x.uid = u.uid and platform is not null order by date desc limit 1) as platform,
			   (select count(*) from swipes s where s.uid = u.uid)::int as swipes,
			   (select count(distinct s.brand_id) from swipes s where s.uid = u.uid)::int as companies_swiped,
			   (select count(*) from swipes s where s.uid = u.uid and s.direction = 'right')::int as right_swipes,
			   (select count(*) from (
			     select s.brand_id from swipes s where s.uid = u.uid and s.direction = 'right'
			     union select l.brand_id from stak_save_log l where l.uid = u.uid and l.action = 'save'
			   ) k)::int as staks,
			   (select count(*) from stak_brands b where b.uid = u.uid)::int as saved_now,
			   (select count(*) from events e where e.uid = u.uid and e.type = 'learn_more')::int as quick_looks,
			   (select count(*) from events e where e.uid = u.uid and e.type = 'stock_detail_open')::int as company_opens,
			   (select count(*) from events e where e.uid = u.uid and e.type = 'stock_detail_open' and (e.params->>'saved' = 'true' or e.params->>'source' = 'mystak'))::int as saved_company_opens,
			   (select count(*) from events e where e.uid = u.uid and e.type = 'news_article_open')::int as news_opens,
			   (select count(*) from events e where e.uid = u.uid and e.type = 'tab_view' and e.params->>'tab' = 'news' and e.params->>'brand_id' is null)::int as news_tab_views,
			   (select count(*) from events e where e.uid = u.uid and e.type = 'tab_view' and e.params->>'tab' = 'simulate')::int as simulate_tab_views,
			   (select count(*) from sandbox_trades t where t.uid = u.uid)::int as sim_trades,
			   (exists (select 1 from sandbox_portfolio p where p.uid = u.uid)
			     or exists (select 1 from sandbox_trades t where t.uid = u.uid)
			     or exists (select 1 from events e where e.uid = u.uid and e.type = 'tab_view' and e.params->>'tab' = 'simulate')) as simulate_used,
			   coalesce(cardinality(a.days), 0) as active_days,
			   (select max(d) from unnest(a.days) d) as last_active,
			   case when (select d from today) <= u.signup_day + 3 then null
			     else coalesce(to_char(u.signup_day + 3, 'YYYY-MM-DD') = any(a.days), false) end as day3,
			   case when (select d from today) <= u.signup_day + 7 then null
			     else coalesce(to_char(u.signup_day + 7, 'YYYY-MM-DD') = any(a.days), false) end as day7
			 from u
			 left join lateral (
			   select array_agg(distinct d) as days from (
			     select x.date as d from sessions x where x.uid = u.uid
			     union select to_char(s.occurred_at at time zone 'America/New_York', 'YYYY-MM-DD') from swipes s where s.uid = u.uid
			     union select to_char(e.occurred_at at time zone 'America/New_York', 'YYYY-MM-DD') from events e where e.uid = u.uid
			     union select to_char(l.occurred_at at time zone 'America/New_York', 'YYYY-MM-DD') from stak_save_log l where l.uid = u.uid
			     union select to_char(t.executed_at at time zone 'America/New_York', 'YYYY-MM-DD') from sandbox_trades t where t.uid = u.uid
			   ) t
			 ) a on true
			 order by u.created_at`,
			[emails, since, excluded],
		);
		const rows = result.rows.map((r) => ({ ...r, created_at: toIsoString(r.created_at), activated: isActivated(r) }));
		if (body.format === "csv") {
			res.set("Content-Disposition", 'attachment; filename="stak-beta.csv"');
			const lines = [BETA_COLUMNS.join(","), ...rows.map((r) => BETA_COLUMNS.map((c) => csvCell(r[c])).join(","))];
			res.type("text/csv").send(lines.join("\n"));
			return;
		}
		res.json({
			people: rows.length,
			activated: rows.filter((r) => r.activated).length,
			// Emails asked for that have no STAK account (yet, or under a different email - e.g. Apple's private relay).
			missing: emails.filter((e) => !rows.some((r) => r.email?.toLowerCase() === e)),
			rows,
		});
	} catch (e) {
		console.error("[analytics] beta error:", e);
		res.status(500).json({ error: "Failed to load the beta report" });
	}
});

// GET /api/admin/analytics/stak-ai?days=30 — how STAK AI is used: questions (and by whom), where they're asked from,
// how they were asked, how they went (answered / declined / asked back), speed, opens by entry point, and thumbs.
// Built from the `stak_ai_ask` / `stak_ai_open` events and the messages' feedback; excluded accounts left out.
analyticsRouter.get("/stak-ai", async (req: Request, res: Response) => {
	if (!checkAdminSecret(req, res)) return;
	const days = Math.floor(Math.min(Math.max(Number(req.query.days) || 30, 1), 365));
	try {
		const excluded = [...(await getExcludedUids())];
		const since = `now() - make_interval(days => $1::int)`;
		const [asks, byDay, opens, thumbs] = await Promise.all([
			// One pass over the window's asks; the breakdowns are grouped from it.
			pgQuery<{ questions: number; people: number; by_context: Record<string, number> | null; by_via: Record<string, number> | null; by_kind: Record<string, number> | null; streamed: number; median_ms: number | null }>(
				`with asks as (
				   select uid, params from events where type = 'stak_ai_ask' and occurred_at >= ${since} and not (uid = any($2))
				 )
				 select (select count(*)::int from asks) as questions,
				   (select count(distinct uid)::int from asks) as people,
				   (select jsonb_object_agg(k, n) from (select coalesce(params->>'context', 'none') k, count(*)::int n from asks group by 1) a) as by_context,
				   (select jsonb_object_agg(k, n) from (select coalesce(params->>'via', 'typed') k, count(*)::int n from asks group by 1) a) as by_via,
				   (select jsonb_object_agg(k, n) from (select coalesce(params->>'kind', 'answer') k, count(*)::int n from asks group by 1) a) as by_kind,
				   (select count(*)::int from asks where (params->>'streamed')::boolean) as streamed,
				   (select percentile_cont(0.5) within group (order by (params->>'ms')::numeric) from asks) as median_ms`,
				[days, excluded],
			),
			pgQuery<{ day: string; questions: number; people: number }>(
				`select to_char(occurred_at at time zone 'America/New_York', 'YYYY-MM-DD') as day, count(*)::int as questions, count(distinct uid)::int as people
				 from events where type = 'stak_ai_ask' and occurred_at >= ${since} and not (uid = any($2)) group by 1 order by 1`,
				[days, excluded],
			),
			pgQuery<{ entry: string; platform: string; opens: number; people: number }>(
				`select coalesce(params->>'entry', 'unknown') as entry, coalesce(params->>'platform', 'unknown') as platform, count(*)::int as opens, count(distinct uid)::int as people
				 from events where type = 'stak_ai_open' and occurred_at >= ${since} and not (uid = any($2)) group by 1, 2 order by opens desc`,
				[days, excluded],
			),
			pgQuery<{ up: number; down: number; answers: number }>(
				`select count(*) filter (where feedback = 1)::int as up, count(*) filter (where feedback = -1)::int as down, count(*)::int as answers
				 from stak_ai_messages where role = 'assistant' and created_at >= ${since} and not (uid = any($2))`,
				[days, excluded],
			),
		]);
		const a = asks.rows[0];
		res.json({
			days,
			questions: a?.questions ?? 0,
			people: a?.people ?? 0,
			byContext: a?.by_context ?? {},
			byVia: a?.by_via ?? {},
			byKind: a?.by_kind ?? {},
			streamedShare: a && a.questions ? a.streamed / a.questions : 0,
			medianMs: a?.median_ms != null ? Math.round(Number(a.median_ms)) : null,
			byDay: byDay.rows,
			opens: opens.rows,
			thumbs: thumbs.rows[0] ?? { up: 0, down: 0, answers: 0 },
		});
	} catch (e) {
		console.error("[analytics] stak-ai error:", e);
		res.status(500).json({ error: "Failed to load STAK AI analytics" });
	}
});
