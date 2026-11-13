import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({ pgQuery: pgQueryMock }));

async function buildApp({ reportSecret }: { reportSecret?: string } = {}) {
	vi.resetModules();
	process.env.ADMIN_SECRET = "s3cret";
	if (reportSecret) process.env.BETA_REPORT_SECRET = reportSecret;
	else delete process.env.BETA_REPORT_SECRET;
	process.env.ANALYTICS_EXCLUDED_EMAILS = "";
	const { analyticsRouter } = await import("../analytics.js");
	const app = express();
	app.use(express.json());
	app.use("/", analyticsRouter);
	return app;
}

const row = (over: Record<string, unknown> = {}) => ({
	email: "ada@example.com", display_name: "Ada", created_at: "2026-11-01T15:00:00.000Z", onboarding_completed: true, platform: "ios",
	swipes: 14, companies_swiped: 10, right_swipes: 3, staks: 3, saved_now: 3, quick_looks: 0, company_opens: 2, saved_company_opens: 1,
	news_opens: 0, news_tab_views: 1, simulate_tab_views: 0, sim_trades: 0, simulate_used: false, active_days: 4,
	last_active: "2026-11-08", day3: true, day7: null,
	...over,
});

describe("POST /beta (admin secret or report secret)", () => {
	beforeEach(() => {
		pgQueryMock.mockReset();
	});

	it("needs the admin secret or the report secret", async () => {
		const app = await buildApp();
		const res = await request(app).post("/beta").send({});
		expect(res.status).toBe(403);
		const wrong = await request(app).post("/beta").set("x-admin-secret", "s3crex").send({});
		expect(wrong.status).toBe(403);
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("takes the report secret for named testers, and it opens nothing else", async () => {
		pgQueryMock.mockResolvedValue({ rows: [row()] });
		const app = await buildApp({ reportSecret: "r3port" });
		const ok = await request(app).post("/beta").set("x-report-secret", "r3port").send({ emails: ["ada@example.com"] });
		expect(ok.status).toBe(200);
		expect((await request(app).post("/beta").set("x-report-secret", "r3porx").send({ emails: ["ada@example.com"] })).status).toBe(403);
		// The STAK AI report is admin-only.
		expect((await request(app).get("/stak-ai").set("x-report-secret", "r3port")).status).toBe(403);
	});

	it("never gives the report secret every account", async () => {
		const app = await buildApp({ reportSecret: "r3port" });
		for (const body of [{}, { emails: [] }, { emails: ["  "] }]) {
			expect((await request(app).post("/beta").set("x-report-secret", "r3port").send(body)).status).toBe(400);
		}
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("refuses an empty report secret when none is set", async () => {
		const app = await buildApp();
		expect((await request(app).post("/beta").set("x-report-secret", "").send({ emails: ["ada@example.com"] })).status).toBe(403);
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("refuses too many emails rather than dropping some", async () => {
		const app = await buildApp();
		const emails = Array.from({ length: 2001 }, (_, i) => `t${i}@example.com`);
		expect((await request(app).post("/beta").set("x-admin-secret", "s3cret").send({ emails })).status).toBe(400);
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("marks who is activated and lists asked-for emails with no account", async () => {
		pgQueryMock.mockResolvedValue({
			rows: [row(), row({ email: "bo@example.com", staks: 2 }), row({ email: "cy@example.com", onboarding_completed: false })],
		});
		const app = await buildApp();
		const res = await request(app)
			.post("/beta")
			.set("x-admin-secret", "s3cret")
			.send({ emails: ["Ada@example.com", "bo@example.com", "cy@example.com", "dee@example.com"] });
		expect(res.status).toBe(200);
		expect(res.headers["cache-control"]).toBe("no-store");
		expect(res.body.people).toBe(3);
		expect(res.body.activated).toBe(1);
		expect(res.body.rows.map((r: { activated: boolean }) => r.activated)).toEqual([true, false, false]);
		expect(res.body.missing).toEqual(["dee@example.com"]);
		// Emails are matched lower-cased, and named accounts aren't filtered out as team accounts.
		expect(pgQueryMock.mock.calls[0][1][0]).toEqual(["ada@example.com", "bo@example.com", "cy@example.com", "dee@example.com"]);
		expect(pgQueryMock.mock.calls[0][1][2]).toEqual([]);
	});

	it("counts different companies swiped, not repeat swipes, toward activation", async () => {
		pgQueryMock.mockResolvedValue({ rows: [row({ swipes: 30, companies_swiped: 9 })] });
		const app = await buildApp();
		const res = await request(app).post("/beta").set("x-admin-secret", "s3cret").send({});
		expect(res.body.rows[0].activated).toBe(false);
	});

	it("activates on a Quick Look as well as a saved company opened", async () => {
		pgQueryMock.mockResolvedValue({ rows: [row({ quick_looks: 1, saved_company_opens: 0 }), row({ quick_looks: 0, saved_company_opens: 0 })] });
		const app = await buildApp();
		const res = await request(app).post("/beta").set("x-admin-secret", "s3cret").send({});
		expect(res.body.rows.map((r: { activated: boolean }) => r.activated)).toEqual([true, false]);
	});

	it("serves CSV for the master sheet, blank where a day hasn't come", async () => {
		pgQueryMock.mockResolvedValue({ rows: [row({ email: 'Ann, "Jr"@example.com' })] });
		const app = await buildApp();
		const res = await request(app).post("/beta").set("x-admin-secret", "s3cret").send({ format: "csv" });
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toMatch(/text\/csv/);
		const [header, line] = res.text.split("\n");
		expect(header.split(",")[0]).toBe("email");
		expect(header.split(",")).toContain("activated");
		expect(line.startsWith('"Ann, ""Jr""@example.com",Ada,ios,')).toBe(true);
		// day7 is null: the last cell is empty.
		expect(line.endsWith(",true,")).toBe(true);
	});

	it("keeps a formula-like email from running in a spreadsheet, and numbers as they are", async () => {
		const app = await buildApp();
		const { csvCell } = await import("../analytics.js");
		expect(csvCell("=1+1@x.com")).toBe("'=1+1@x.com");
		expect(csvCell("+tag@x.com")).toBe("'+tag@x.com");
		expect(csvCell(-3)).toBe("-3");
		expect(csvCell(null)).toBe("");
		void app;
	});
});

describe("platformOf", () => {
	it("tells the apps and the web apart by User-Agent", async () => {
		vi.resetModules();
		vi.doMock("../../lib/postgres.js", () => ({ pgQuery: vi.fn(), pgPool: {}, ensureUserRow: vi.fn() }));
		const { platformOf } = await import("../me.js");
		expect(platformOf("STAK/12 CFNetwork/1568.100.1 Darwin/24.0.0")).toBe("ios");
		expect(platformOf("okhttp/4.12.0")).toBe("android");
		expect(platformOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15")).toBe("web");
		expect(platformOf("Mozilla/5.0 (Linux; Android 15) Chrome/130.0")).toBe("web");
		expect(platformOf(undefined)).toBe("web");
	});
});
