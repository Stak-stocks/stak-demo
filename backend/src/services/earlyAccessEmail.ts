import { createHmac, timingSafeEqual } from "node:crypto";
import { renderEarlyAccessConfirmation, type RenderedEmail } from "@stak/emails";

/**
 * The early-access confirmation email: who it links to, what it looks like, and sending it through Resend.
 *
 * Settings (Cloud Run env):
 *   EARLY_ACCESS_RESEND_KEY - Resend API key (sending access; its own key, not the Supabase one) (secret). Without it nothing is sent and sign-ups still succeed.
 *   EARLY_ACCESS_FROM       - sender, default "Favour from STAK <favour@thestak.org>" (a real Zoho inbox, so replies land)
 *   TALLY_FORM_URL          - the beta profile form, e.g. https://tally.so/r/abc123
 *   WAITLIST_TOKEN_SECRET   - signs unsubscribe links (secret)
 *   PUBLIC_API_URL          - where this backend is reachable, for the unsubscribe link
 */

const API = () => (process.env.PUBLIC_API_URL ?? "https://stak-backend-889057229494.us-central1.run.app").replace(/\/+$/, "");
const INSTAGRAM_URL = "https://www.instagram.com/just_stak";

/** The Tally beta profile link for one person: their email and where they came from, as the form's hidden fields. */
export function betaProfileUrl(email: string): string | null {
	const form = process.env.TALLY_FORM_URL?.trim();
	if (!form) return null;
	const url = new URL(form);
	url.searchParams.set("email", email);
	url.searchParams.set("source", "early_access_email");
	return url.toString();
}

// ── Unsubscribe tokens: the email, signed, so a link can't be edited to opt someone else out ──────────────────────

function tokenSecret(): string | null {
	return process.env.WAITLIST_TOKEN_SECRET?.trim() || null;
}

export function unsubscribeToken(email: string): string | null {
	const secret = tokenSecret();
	if (!secret) return null;
	const body = Buffer.from(email, "utf8").toString("base64url");
	const sig = createHmac("sha256", secret).update(body).digest("base64url");
	return `${body}.${sig}`;
}

/** The email a token was issued for, or null if it's malformed or wasn't signed with our secret. */
export function emailFromUnsubscribeToken(token: string): string | null {
	const secret = tokenSecret();
	const [body, sig] = token.split(".");
	if (!secret || !body || !sig) return null;
	const expected = createHmac("sha256", secret).update(body).digest();
	let given: Buffer;
	try { given = Buffer.from(sig, "base64url"); } catch { return null; }
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
	return Buffer.from(body, "base64url").toString("utf8");
}

export function unsubscribeUrl(email: string): string | null {
	const token = unsubscribeToken(email);
	return token ? `${API()}/api/waitlist/unsubscribe?token=${encodeURIComponent(token)}` : null;
}

// ── The email itself: the React Email template in @stak/emails (preview it with `npm run email:dev`) ─────────────

export { EARLY_ACCESS_SUBJECT } from "@stak/emails";

export type SendResult = { sent: true; id: string } | { sent: false; error: string };

/** Sends the confirmation to one address through Resend. Never throws: the caller records what happened. */
export async function sendEarlyAccessEmail(email: string): Promise<SendResult> {
	const key = process.env.EARLY_ACCESS_RESEND_KEY?.trim();
	if (!key) return { sent: false, error: "EARLY_ACCESS_RESEND_KEY not set" };
	const unsubscribe = unsubscribeUrl(email);
	let rendered: RenderedEmail;
	try {
		rendered = await renderEarlyAccessConfirmation({ betaProfileUrl: betaProfileUrl(email), unsubscribeUrl: unsubscribe });
	} catch (e) {
		return { sent: false, error: `Email render failed: ${(e as Error).message}`.slice(0, 300) };
	}
	const { subject, html, text } = rendered;
	try {
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
			body: JSON.stringify({
				from: process.env.EARLY_ACCESS_FROM?.trim() || "Favour from STAK <favour@thestak.org>",
				to: [email],
				subject,
				html,
				text,
				// One-click unsubscribe (RFC 8058) - what Gmail and Yahoo expect from list mail.
				...(unsubscribe ? { headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
				tags: [{ name: "category", value: "early_access_confirmation" }],
			}),
			signal: AbortSignal.timeout(10_000),
		});
		const body = await res.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
		if (!res.ok || !body.id) return { sent: false, error: `Resend ${res.status}: ${body.message ?? body.name ?? "no id"}`.slice(0, 300) };
		return { sent: true, id: body.id };
	} catch (e) {
		return { sent: false, error: `Resend request failed: ${(e as Error).message}`.slice(0, 300) };
	}
}

// ── Tally ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Tally signs each webhook: base64 HMAC-SHA256 of the JSON body with the form's signing secret. */
export function verifyTallySignature(payload: unknown, signature: string | undefined): boolean {
	const secret = process.env.TALLY_SIGNING_SECRET?.trim();
	if (!secret || !signature) return false;
	const expected = createHmac("sha256", secret).update(JSON.stringify(payload)).digest();
	let given: Buffer;
	try { given = Buffer.from(signature, "base64"); } catch { return false; }
	return given.length === expected.length && timingSafeEqual(given, expected);
}

type TallyField = { key?: string; label?: string | null; type?: string; value?: unknown };

/** The submitter's email: the hidden "email" field our link pre-fills, else any email-type answer. */
export function emailFromTallySubmission(fields: TallyField[] | undefined): string | null {
	if (!Array.isArray(fields)) return null;
	const asEmail = (v: unknown) => (typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.trim()) ? v.trim().toLowerCase() : null);
	const hidden = fields.find((f) => f.type === "HIDDEN_FIELDS" && (f.label ?? "").trim().toLowerCase() === "email");
	if (hidden && asEmail(hidden.value)) return asEmail(hidden.value);
	for (const f of fields) {
		if (f.type === "INPUT_EMAIL" && asEmail(f.value)) return asEmail(f.value);
	}
	return null;
}
