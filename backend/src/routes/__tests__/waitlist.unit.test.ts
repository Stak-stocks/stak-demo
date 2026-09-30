import { createHmac } from "node:crypto";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();
vi.mock("../../lib/postgres.js", () => ({ pgQuery: pgQueryMock }));

const sendMock = vi.fn();
vi.mock("../../services/earlyAccessEmail.js", async (importActual) => ({
	...(await importActual<typeof import("../../services/earlyAccessEmail.js")>()),
	sendEarlyAccessEmail: sendMock,
}));

async function buildApp() {
	vi.resetModules();
	const { waitlistRouter } = await import("../waitlist.js");
	const app = express();
	app.use(express.json());
	app.use("/", waitlistRouter);
	return app;
}

/** The join insert's answer, then an ok for any follow-up update. */
function joinReturns(row: { inserted: boolean; confirmation_sent_at?: string | null; unsubscribed_at?: string | null }) {
	pgQueryMock.mockResolvedValueOnce({ rows: [{ confirmation_sent_at: null, unsubscribed_at: null, ...row }], rowCount: 1 });
	pgQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
}

describe("POST /api/waitlist", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pgQueryMock.mockReset();
		sendMock.mockResolvedValue({ sent: true, id: "re_123" });
	});

	it("a new address is stored trimmed and lower-cased, gets the email, and the send is recorded", async () => {
		joinReturns({ inserted: true });
		const app = await buildApp();
		const res = await request(app).post("/").send({ email: "  Ada@Example.COM " });
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, already: false, emailed: true });
		expect(pgQueryMock.mock.calls[0]![1]).toEqual(["ada@example.com", "landing"]);
		expect(sendMock).toHaveBeenCalledWith("ada@example.com");
		expect(pgQueryMock.mock.calls[1]![0]).toMatch(/confirmation_sent_at = now\(\)/);
		expect(pgQueryMock.mock.calls[1]![1]).toEqual(["ada@example.com", "re_123"]);
	});

	it("a repeat sign-up whose email already went out is not sent again", async () => {
		joinReturns({ inserted: false, confirmation_sent_at: "2026-09-28T00:00:00Z" });
		const app = await buildApp();
		const res = await request(app).post("/").send({ email: "ada@example.com" });
		expect(res.body).toEqual({ ok: true, already: true, emailed: false });
		expect(sendMock).not.toHaveBeenCalled();
	});

	it("a repeat sign-up whose first send failed is retried", async () => {
		joinReturns({ inserted: false, confirmation_sent_at: null });
		const app = await buildApp();
		await request(app).post("/").send({ email: "ada@example.com" });
		expect(sendMock).toHaveBeenCalledTimes(1);
	});

	it("an unsubscribed address is never emailed", async () => {
		joinReturns({ inserted: false, unsubscribed_at: "2026-09-28T00:00:00Z" });
		const app = await buildApp();
		await request(app).post("/").send({ email: "ada@example.com" });
		expect(sendMock).not.toHaveBeenCalled();
	});

	it("a failed send still signs them up, and records why", async () => {
		joinReturns({ inserted: true });
		sendMock.mockResolvedValue({ sent: false, error: "Resend 403: domain not verified" });
		const app = await buildApp();
		const res = await request(app).post("/").send({ email: "ada@example.com" });
		expect(res.status).toBe(200);
		expect(res.body.emailed).toBe(false);
		expect(pgQueryMock.mock.calls[1]![0]).toMatch(/confirmation_error = \$2/);
		expect(pgQueryMock.mock.calls[1]![1]).toEqual(["ada@example.com", "Resend 403: domain not verified"]);
	});

	it("rejects something that isn't an email, without touching the database", async () => {
		const app = await buildApp();
		for (const email of ["", "not-an-email", "a@b", 42]) {
			expect((await request(app).post("/").send({ email })).status).toBe(400);
		}
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("limits how often one visitor can submit", async () => {
		pgQueryMock.mockResolvedValue({ rows: [{ inserted: true, confirmation_sent_at: "x", unsubscribed_at: null }], rowCount: 1 });
		const app = await buildApp();
		const codes: number[] = [];
		for (let i = 0; i < 7; i++) codes.push((await request(app).post("/").send({ email: `user${i}@example.com` })).status);
		expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
		expect(codes.slice(5)).toEqual([429, 429]);
	});
});

describe("unsubscribe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pgQueryMock.mockReset();
		pgQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
		process.env.WAITLIST_TOKEN_SECRET = "test-secret";
	});

	it("a signed link opts that address out", async () => {
		const { unsubscribeToken } = await import("../../services/earlyAccessEmail.js");
		const app = await buildApp();
		const res = await request(app).get("/unsubscribe").query({ token: unsubscribeToken("ada@example.com") });
		expect(res.status).toBe(200);
		expect(res.text).toMatch(/unsubscribed/i);
		expect(pgQueryMock).toHaveBeenCalledWith(expect.stringMatching(/unsubscribed_at/), ["ada@example.com"]);
	});

	it("an edited link (someone else's email, old signature) is refused", async () => {
		const { unsubscribeToken } = await import("../../services/earlyAccessEmail.js");
		const [, sig] = unsubscribeToken("ada@example.com")!.split(".");
		const forged = `${Buffer.from("victim@example.com").toString("base64url")}.${sig}`;
		const app = await buildApp();
		const res = await request(app).get("/unsubscribe").query({ token: forged });
		expect(res.status).toBe(400);
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("the mail app's one-click POST works too", async () => {
		const { unsubscribeToken } = await import("../../services/earlyAccessEmail.js");
		const app = await buildApp();
		const res = await request(app).post("/unsubscribe").query({ token: unsubscribeToken("ada@example.com") }).send("List-Unsubscribe=One-Click");
		expect(res.body).toEqual({ ok: true });
	});
});

describe("POST /api/waitlist/tally-webhook", () => {
	const payload = {
		eventId: "evt_1",
		eventType: "FORM_RESPONSE",
		data: {
			submissionId: "sub_9",
			fields: [
				{ key: "q1", label: "What do you invest in?", type: "INPUT_TEXT", value: "ETFs" },
				{ key: "h1", label: "email", type: "HIDDEN_FIELDS", value: "Ada@Example.com" },
				{ key: "h2", label: "source", type: "HIDDEN_FIELDS", value: "early_access_email" },
			],
		},
	};
	const sign = (body: unknown) => createHmac("sha256", "tally-secret").update(JSON.stringify(body)).digest("base64");

	beforeEach(() => {
		vi.clearAllMocks();
		pgQueryMock.mockReset();
		process.env.TALLY_SIGNING_SECRET = "tally-secret";
	});

	it("a signed submission marks the matching entry's beta profile complete", async () => {
		pgQueryMock.mockResolvedValue({ rows: [{ inserted: false }], rowCount: 1 });
		const app = await buildApp();
		const res = await request(app).post("/tally-webhook").set("tally-signature", sign(payload)).send(payload);
		expect(res.body).toEqual({ ok: true, matched: true });
		expect(pgQueryMock.mock.calls[0]![0]).toMatch(/beta_profile_completed_at = coalesce\(waitlist.beta_profile_completed_at, now\(\)\)/);
		expect(pgQueryMock.mock.calls[0]![1]).toEqual(["ada@example.com", "sub_9"]);
	});

	it("rejects a bad or missing signature without touching the database", async () => {
		const app = await buildApp();
		expect((await request(app).post("/tally-webhook").set("tally-signature", "bogus").send(payload)).status).toBe(401);
		expect((await request(app).post("/tally-webhook").send(payload)).status).toBe(401);
		expect(pgQueryMock).not.toHaveBeenCalled();
	});

	it("a submission with no email is acknowledged and skipped", async () => {
		const noEmail = { ...payload, data: { submissionId: "sub_x", fields: [{ key: "q1", label: "Q", type: "INPUT_TEXT", value: "hi" }] } };
		const app = await buildApp();
		const res = await request(app).post("/tally-webhook").set("tally-signature", sign(noEmail)).send(noEmail);
		expect(res.body).toEqual({ ok: true, matched: false });
		expect(pgQueryMock).not.toHaveBeenCalled();
	});
});

describe("the email", () => {
	it("links the button to the person's Tally profile with their email and the source", async () => {
		process.env.TALLY_FORM_URL = "https://tally.so/r/abc123";
		process.env.WAITLIST_TOKEN_SECRET = "test-secret";
		const { betaProfileUrl, unsubscribeUrl } = await import("../../services/earlyAccessEmail.js");
		const { renderEarlyAccessConfirmation } = await import("@stak/emails");
		const url = betaProfileUrl("ada+stak@example.com")!;
		expect(url).toBe("https://tally.so/r/abc123?email=ada%2Bstak%40example.com&source=early_access_email");
		const { subject, html, text } = await renderEarlyAccessConfirmation({ betaProfileUrl: url, unsubscribeUrl: unsubscribeUrl("ada+stak@example.com") });
		expect(subject).toBe("You’re on the STAK early-access list");
		expect(html).toContain("Complete your Beta Profile");
		expect(html).toContain(url.replace(/&/g, "&amp;"));
		expect(html).toContain("/api/waitlist/unsubscribe?token=");
		expect(text).toContain("Complete your Beta Profile");
	});

	it("without a Tally form set, the email simply has no button", async () => {
		delete process.env.TALLY_FORM_URL;
		const { betaProfileUrl } = await import("../../services/earlyAccessEmail.js");
		const { renderEarlyAccessConfirmation } = await import("@stak/emails");
		expect(betaProfileUrl("ada@example.com")).toBeNull();
		expect((await renderEarlyAccessConfirmation({ betaProfileUrl: null, unsubscribeUrl: null })).html).not.toContain("Complete your Beta Profile");
	});
});
