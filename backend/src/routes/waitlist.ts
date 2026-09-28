import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pgQuery } from "../lib/postgres.js";

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

/**
 * POST /api/waitlist { email, source? } - joins the early-access list. Joining twice is not an error: the same
 * "you're on the list" answer comes back (with `already: true`), so the form never reveals who has signed up.
 */
waitlistRouter.post("/", joinLimiter, async (req, res) => {
	const raw = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
	if (!raw || raw.length > 254 || !EMAIL_RE.test(raw)) {
		res.status(400).json({ error: "That doesn't look like an email address." });
		return;
	}
	const source = typeof req.body?.source === "string" && SOURCES.has(req.body.source) ? req.body.source : "landing";
	try {
		const result = await pgQuery(
			`insert into waitlist (email, source) values ($1, $2) on conflict (email) do nothing`,
			[raw, source],
		);
		res.json({ ok: true, already: result.rowCount === 0 });
	} catch (e) {
		console.error("[waitlist] join error:", e);
		res.status(500).json({ error: "Couldn't add you just now. Try again." });
	}
});
