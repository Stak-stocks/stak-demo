import { Router } from "express";
import { renewAppleClientSecret } from "../services/appleClientSecret.js";

export const appleSecretRouter = Router();

// POST /api/internal/apple-secret/renew - a fresh Sign in with Apple client secret for the website, set on Supabase.
// Called monthly by Cloud Scheduler (stak-apple-secret-renew); protected by WARM_SECRET like the other scheduled jobs.
appleSecretRouter.post("/renew", async (req, res) => {
	const secret = req.headers["x-warm-secret"];
	if (!secret || secret !== process.env.WARM_SECRET) {
		res.status(401).json({ error: "unauthorized" }); return;
	}
	try {
		const { expiresAt } = await renewAppleClientSecret();
		console.log(`[apple-secret] renewed; expires ${expiresAt.toISOString().slice(0, 10)}`);
		res.json({ ok: true, expiresAt: expiresAt.toISOString() });
	} catch (err) {
		// A non-2xx marks the Cloud Scheduler run failed (the job retries it up to 3 times).
		console.error("[apple-secret] renewal failed:", (err as Error).message);
		res.status(500).json({ error: "renewal failed" });
	}
});
