import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pgQuery } from "../lib/postgres.js";
import { emailFromTallySubmission, emailFromUnsubscribeToken, sendEarlyAccessEmail, verifyTallySignature } from "../services/earlyAccessEmail.js";

export const waitlistRouter = Router();

/** A public form that writes to the database: far tighter than the API's general limit. */
const joinLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Too many tries. Give it a minute and try again." },
});

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const SOURCES = new Set(["landing"]);

type JoinRow = { inserted: boolean; confirmation_sent_at: string | null; unsubscribed_at: string | null };

/**
 * POST /api/waitlist { email, source? } - joins the early-access list and sends the confirmation email with the
 * person's beta profile link. The email goes out once: to a new address, or again only if the first send failed.
 * A repeat sign-up (or an unsubscribed address) gets no second email. `already` tells the page it was a repeat.
 */
waitlistRouter.post("/", joinLimiter, async (req, res) => {
	const raw = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
	if (!raw || raw.length > 254 || !EMAIL_RE.test(raw)) {
		res.status(400).json({ error: "That doesn't look like an email address." });
		return;
	}
	const source = typeof req.body?.source === "string" && SOURCES.has(req.body.source) ? req.body.source : "landing";
	try {
		// One statement for new and returning addresses: the no-op update makes a conflict return the existing row,
		// and xmax = 0 is Postgres's tell that the row was just inserted.
		const result = await pgQuery<JoinRow>(
			`insert into waitlist (email, source) values ($1, $2)
			 on conflict (email) do update set email = excluded.email
			 returning (xmax = 0) as inserted, confirmation_sent_at, unsubscribed_at`,
			[raw, source],
		);
		const row = result.rows[0];
		const already = row ? !row.inserted : false;
		let emailed = false;
		if (row && !row.confirmation_sent_at && !row.unsubscribed_at) {
			// Awaited, not fire-and-forget: Cloud Run may pause the CPU once the response is sent.
			const sent = await sendEarlyAccessEmail(raw);
			if (sent.sent) {
				emailed = true;
				await pgQuery(`update waitlist set confirmation_sent_at = now(), confirmation_message_id = $2, confirmation_error = null where email = $1`, [raw, sent.id]);
			} else {
				console.warn("[waitlist] confirmation not sent:", sent.error);
				await pgQuery(`update waitlist set confirmation_error = $2 where email = $1`, [raw, sent.error]);
			}
		}
		// `emailed`: a confirmation went out just now - the page only says "check your inbox" when it's true.
		res.json({ ok: true, already, emailed });
	} catch (e) {
		console.error("[waitlist] join error:", e);
		res.status(500).json({ error: "Couldn't add you just now. Try again." });
	}
});

const page = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0A1020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#C8D2E0;text-align:center;padding:24px;box-sizing:border-box;">
<div style="max-width:420px;"><p style="margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:6px;color:#fff;">STAK</p><h1 style="margin:0 0 10px;font-size:22px;color:#fff;">${title}</h1><p style="margin:0;font-size:15px;line-height:22px;">${body}</p>
<p style="margin:22px 0 0;"><a href="https://thestak.org" style="color:#69B3CA;">Back to STAK</a></p></div></body></html>`;

async function unsubscribe(token: unknown): Promise<"ok" | "invalid"> {
	const email = typeof token === "string" ? emailFromUnsubscribeToken(token) : null;
	if (!email) return "invalid";
	await pgQuery(`update waitlist set unsubscribed_at = coalesce(unsubscribed_at, now()) where email = $1`, [email]);
	return "ok";
}

/** GET /api/waitlist/unsubscribe?token= - the email's Unsubscribe link: opts the signed address out, and says so. */
waitlistRouter.get("/unsubscribe", async (req, res) => {
	try {
		const result = await unsubscribe(req.query.token);
		res.status(result === "ok" ? 200 : 400).type("html").send(result === "ok"
			? page("You’re unsubscribed", "You won’t get any more early-access emails from STAK. You’re still on the list, so you won’t miss your invite.")
			: page("That link didn’t work", "This unsubscribe link is invalid or incomplete. Reply to any STAK email and we’ll take you off the list."));
	} catch (e) {
		console.error("[waitlist] unsubscribe error:", e);
		res.status(500).type("html").send(page("Something went wrong", "We couldn’t update your preferences just now. Try the link again in a minute."));
	}
});

/** POST /api/waitlist/unsubscribe?token= - one-click unsubscribe (RFC 8058), sent by the mail app itself. */
waitlistRouter.post("/unsubscribe", async (req, res) => {
	try {
		const result = await unsubscribe(req.query.token);
		res.status(result === "ok" ? 200 : 400).json({ ok: result === "ok" });
	} catch (e) {
		console.error("[waitlist] one-click unsubscribe error:", e);
		res.status(500).json({ ok: false });
	}
});

type TallyPayload = { eventType?: string; data?: { submissionId?: string; responseId?: string; fields?: Parameters<typeof emailFromTallySubmission>[0] } };

/**
 * POST /api/waitlist/tally-webhook - Tally calls this when someone submits the beta profile. The signature must check
 * out; the submission is matched to its waitlist entry by the email our link pre-filled, and marked complete (the
 * first completion is kept). A submission with no matching entry is added, so no profile is lost.
 */
waitlistRouter.post("/tally-webhook", async (req, res) => {
	if (!verifyTallySignature(req.body, req.header("tally-signature"))) {
		res.status(401).json({ error: "Invalid signature" });
		return;
	}
	const payload = req.body as TallyPayload;
	if (payload.eventType !== "FORM_RESPONSE") { res.json({ ok: true, ignored: true }); return; }
	const email = emailFromTallySubmission(payload.data?.fields);
	if (!email) {
		console.warn("[waitlist] Tally submission without an email:", payload.data?.submissionId);
		res.json({ ok: true, matched: false });
		return;
	}
	try {
		const submissionId = payload.data?.submissionId ?? payload.data?.responseId ?? null;
		const result = await pgQuery<{ inserted: boolean }>(
			`insert into waitlist (email, source, beta_profile_completed_at, tally_submission_id) values ($1, 'tally', now(), $2)
			 on conflict (email) do update set
			   beta_profile_completed_at = coalesce(waitlist.beta_profile_completed_at, now()),
			   tally_submission_id = coalesce(waitlist.tally_submission_id, excluded.tally_submission_id)
			 returning (xmax = 0) as inserted`,
			[email, submissionId],
		);
		res.json({ ok: true, matched: !result.rows[0]?.inserted });
	} catch (e) {
		console.error("[waitlist] Tally webhook error:", e);
		// A 5xx makes Tally retry later, which is what we want if the database blipped.
		res.status(500).json({ error: "Couldn't record the submission" });
	}
});
