import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
const sendMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({ pgQuery: pgQueryMock }));
vi.mock("../../services/earlyAccessEmail.js", async (importActual) => ({
	...(await importActual<typeof import("../../services/earlyAccessEmail.js")>()),
	sendBetaSelectedEmail: sendMock,
}));

async function buildApp({ testflight = "https://testflight.apple.com/join/ABC" }: { testflight?: string | null } = {}) {
	vi.resetModules();
	process.env.ADMIN_SECRET = "s3cret";
	process.env.BETA_REPORT_SECRET = "r3port";
	process.env.ANALYTICS_EXCLUDED_EMAILS = "";
	if (testflight) process.env.BETA_TESTFLIGHT_URL = testflight;
	else delete process.env.BETA_TESTFLIGHT_URL;
	const { analyticsRouter } = await import("../analytics.js");
	const app = express();
	app.use(express.json());
	app.use("/", analyticsRouter);
	return app;
}

const invite = (app: express.Express, testers: unknown) =>
	request(app).post("/beta/invite").set("x-report-secret", "r3port").send({ testers });

/** The database's answers in order: today's count first, then per tester the claim (a row when it was claimed), then what that path asks. */
function sentToday(n: number) {
	pgQueryMock.mockResolvedValueOnce({ rows: [{ n }] });
}
function claim(email: string | null) {
	pgQueryMock.mockResolvedValueOnce({ rows: email ? [{ email }] : [] });
}

describe("POST /beta/invite (the beta selection email)", () => {
	beforeEach(() => {
		pgQueryMock.mockReset();
		sendMock.mockReset();
		vi.useRealTimers();
	});

	it("needs a key, and sends nothing before the TestFlight link is set", async () => {
		const app = await buildApp({ testflight: null });
		expect((await request(app).post("/beta/invite").send({ testers: [{ email: "a@example.com" }] })).status).toBe(403);
		expect((await invite(app, [{ email: "a@example.com" }])).status).toBe(409);
		expect(pgQueryMock).not.toHaveBeenCalled();
		expect(sendMock).not.toHaveBeenCalled();
	});

	it("sends once to a tester on the waitlist, greeting them by first name", async () => {
		sentToday(0);
		claim("ada@example.com");
		pgQueryMock.mockResolvedValueOnce({ rows: [] }); // the message id saved
		sendMock.mockResolvedValue({ sent: true, id: "re_1" });
		const app = await buildApp();
		const res = await invite(app, [{ email: " Ada@Example.com ", name: "ada lovelace" }]);
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ sent: 1, results: [{ email: "ada@example.com", status: "sent" }] });
		expect(sendMock).toHaveBeenCalledWith("ada@example.com", "Ada");
		// Claimed only while unsent (or a stale claim) and subscribed, so no one is emailed twice.
		expect(pgQueryMock.mock.calls[1][0]).toMatch(/unsubscribed_at is null and beta_invite_message_id is null/);
		expect(pgQueryMock.mock.calls[1][0]).toMatch(/beta_invite_sent_at < now\(\) - interval '10 minutes'/);
	});

	it("never emails an address that isn't on the waitlist, has unsubscribed, or already got it", async () => {
		sentToday(0);
		claim(null); pgQueryMock.mockResolvedValueOnce({ rows: [] });
		claim(null); pgQueryMock.mockResolvedValueOnce({ rows: [{ unsubscribed_at: "2026-11-01" }] });
		claim(null); pgQueryMock.mockResolvedValueOnce({ rows: [{ unsubscribed_at: null }] });
		const app = await buildApp();
		const res = await invite(app, [{ email: "x@example.com" }, { email: "u@example.com" }, { email: "d@example.com" }]);
		expect(res.body.results.map((r: { status: string }) => r.status)).toEqual(["not_on_waitlist", "unsubscribed", "already_sent"]);
		expect(sendMock).not.toHaveBeenCalled();
	});

	it("releases a failed send so the next try sends it", async () => {
		sentToday(0);
		claim("bo@example.com");
		pgQueryMock.mockResolvedValueOnce({ rows: [] }); // released
		sendMock.mockResolvedValue({ sent: false, error: "Resend 500: down" });
		const app = await buildApp();
		const res = await invite(app, [{ email: "bo@example.com" }]);
		expect(res.body.results).toEqual([{ email: "bo@example.com", status: "failed", error: "Resend 500: down" }]);
		expect(pgQueryMock.mock.calls[2][0]).toMatch(/beta_invite_sent_at = null/);
	});

	it("keeps a sent email counted as sent when recording its id fails - never a second email", async () => {
		sentToday(0);
		claim("cy@example.com");
		pgQueryMock.mockRejectedValueOnce(new Error("pooler blip")); // saving the id
		sendMock.mockResolvedValue({ sent: true, id: "re_2" });
		const app = await buildApp();
		const res = await invite(app, [{ email: "cy@example.com" }]);
		expect(res.body.results).toEqual([{ email: "cy@example.com", status: "sent" }]);
		expect(pgQueryMock).toHaveBeenCalledTimes(3); // no release
	});

	it("sends nothing past the day's cap", async () => {
		sentToday(300);
		const app = await buildApp();
		const res = await invite(app, [{ email: "dee@example.com" }]);
		expect(res.body.results).toEqual([{ email: "dee@example.com", status: "not_attempted", error: "Over today's limit of 300" }]);
		expect(sendMock).not.toHaveBeenCalled();
	});

	it("hands back whoever it had no time for", async () => {
		sentToday(0);
		claim("e1@example.com");
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		let now = 1_000_000;
		vi.spyOn(Date, "now").mockImplementation(() => now);
		sendMock.mockImplementation(async () => { now += 36_000; return { sent: true, id: "re_3" }; });
		const app = await buildApp();
		const res = await invite(app, [{ email: "e1@example.com" }, { email: "e2@example.com" }]);
		expect(res.body.results.map((r: { status: string }) => r.status)).toEqual(["sent", "not_attempted"]);
		vi.restoreAllMocks();
	});

	it("refuses an empty list or too many at once", async () => {
		const app = await buildApp();
		expect((await invite(app, [])).status).toBe(400);
		expect((await invite(app, [{ email: "not-an-email" }])).status).toBe(400);
		expect((await invite(app, Array.from({ length: 41 }, (_, i) => ({ email: `t${i}@example.com` })))).status).toBe(400);
		expect(pgQueryMock).not.toHaveBeenCalled();
	});
});

describe("firstNameOf", () => {
	it("takes the first word, tidied, or nothing", async () => {
		const { firstNameOf } = await vi.importActual<typeof import("../../services/earlyAccessEmail.js")>("../../services/earlyAccessEmail.js");
		expect(firstNameOf("  ada lovelace ")).toBe("Ada");
		expect(firstNameOf("Zoë")).toBe("Zoë");
		expect(firstNameOf("O'Brien-Smith Jr")).toBe("O'Brien-Smith");
		expect(firstNameOf("Dr. Ada Lovelace")).toBe("Ada");
		expect(firstNameOf("अनिल कुमार")).toBe("अनिल");
		expect(firstNameOf("<b>x</b>")).toBe("Bxb");
		expect(firstNameOf("ada@example.com")).toBeNull();
		expect(firstNameOf("-")).toBeNull();
		expect(firstNameOf("")).toBeNull();
		expect(firstNameOf(null)).toBeNull();
		expect(firstNameOf("1234")).toBeNull();
	});
});
