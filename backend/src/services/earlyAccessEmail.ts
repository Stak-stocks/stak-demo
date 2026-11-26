import { createHmac, timingSafeEqual } from "node:crypto";
import { renderBetaSelected, renderEarlyAccessConfirmation, type RenderedEmail } from "@stak/emails";

/**
 * STAK's waitlist emails - the early-access confirmation and the beta selection email: who they link to, what they look
 * like, and sending them through Resend.
 *
 * Settings (Cloud Run env):
 *   EARLY_ACCESS_RESEND_KEY - Resend API key (sending access; its own key, not the Supabase one) (secret). Without it nothing is sent and sign-ups still succeed.
 *   EARLY_ACCESS_FROM       - sender, default "Favour from STAK <favour@thestak.org>" (a real Zoho inbox, so replies land)
 *   TALLY_FORM_URL          - the beta profile form, e.g. https://tally.so/r/abc123
 *   BETA_TESTFLIGHT_URL     - the TestFlight public link the beta selection email installs from (not a secret).
 *                             Without it no selection email is sent.
 *   WAITLIST_TOKEN_SECRET   - signs unsubscribe links (secret)
 *   PUBLIC_API_URL          - where this backend is reachable, for the unsubscribe link
 */

/** An email address, as the waitlist, the Tally webhook and the beta invite accept it. */
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

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

/**
 * maybeSent: Resend may have accepted it anyway - a timeout, a network error, a 5xx, a 409 (the idempotency key was
 * already used) or a 200 without an id. Without it the email certainly wasn't sent (not set up, didn't render, a 4xx).
 */
export type SendResult = { sent: true; id: string } | { sent: false; error: string; maybeSent?: boolean };

/** Sends the early-access confirmation to one address through Resend. Never throws: the caller records what happened. */
export function sendEarlyAccessEmail(email: string): Promise<SendResult> {
	return sendStakEmail(email, "early_access_confirmation", (unsubscribe) =>
		renderEarlyAccessConfirmation({ betaProfileUrl: betaProfileUrl(email), unsubscribeUrl: unsubscribe }));
}

/**
 * The beta selection email: install STAK through TestFlight (BETA_TESTFLIGHT_URL). Never throws. `firstName` is the
 * application's name, first word only; without one the email says "Hi there,".
 */
export function sendBetaSelectedEmail(email: string, firstName: string | null): Promise<SendResult> {
	const testflightUrl = process.env.BETA_TESTFLIGHT_URL?.trim();
	if (!testflightUrl) return Promise.resolve({ sent: false, error: "BETA_TESTFLIGHT_URL not set" });
	// Resend keeps the key a day: a retry after an accepted send we failed to record (or a reclaimed send) isn't sent again.
	return sendStakEmail(email, "beta_selected", (unsubscribe) =>
		renderBetaSelected({ firstName, testflightUrl, unsubscribeUrl: unsubscribe }), `beta_selected/${email}`);
}

/**
 * The beta selection email exactly as `firstName` would get it (subject and HTML), for the sheet to show before sending.
 * The Unsubscribe link is a stand-in (each real email's is signed for its address). Null when BETA_TESTFLIGHT_URL isn't set.
 */
export function previewBetaSelectedEmail(firstName: string | null): Promise<RenderedEmail | null> {
	const testflightUrl = process.env.BETA_TESTFLIGHT_URL?.trim();
	if (!testflightUrl) return Promise.resolve(null);
	return renderBetaSelected({ firstName, testflightUrl, unsubscribeUrl: `${API()}/api/waitlist/unsubscribe?token=preview` });
}

/**
 * Renders one of STAK's emails for an address and sends it through Resend, with one-click unsubscribe. Never throws.
 * `idempotencyKey`: Resend sends at most one email per key in 24 hours.
 */
async function sendStakEmail(
	email: string,
	category: "early_access_confirmation" | "beta_selected",
	render: (unsubscribeUrl: string | null) => Promise<RenderedEmail>,
	idempotencyKey?: string,
): Promise<SendResult> {
	const key = process.env.EARLY_ACCESS_RESEND_KEY?.trim();
	if (!key) return { sent: false, error: "EARLY_ACCESS_RESEND_KEY not set" };
	const unsubscribe = unsubscribeUrl(email);
	let rendered: RenderedEmail;
	try {
		rendered = await render(unsubscribe);
	} catch (e) {
		return { sent: false, error: `Email render failed: ${(e as Error).message}`.slice(0, 300) };
	}
	const { subject, html, text } = rendered;
	try {
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
			body: JSON.stringify({
				from: process.env.EARLY_ACCESS_FROM?.trim() || "Favour from STAK <favour@thestak.org>",
				to: [email],
				subject,
				html,
				text,
				// One-click unsubscribe (RFC 8058) - what Gmail and Yahoo expect from list mail.
				...(unsubscribe ? { headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
				tags: [{ name: "category", value: category }],
			}),
			signal: AbortSignal.timeout(10_000),
		});
		const body = await res.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
		if (!res.ok || !body.id) {
			const maybeSent = res.ok || res.status >= 500 || res.status === 409;
			return { sent: false, error: `Resend ${res.status}: ${body.message ?? body.name ?? "no id"}`.slice(0, 300), maybeSent };
		}
		return { sent: true, id: body.id };
	} catch (e) {
		return { sent: false, error: `Resend request failed: ${(e as Error).message}`.slice(0, 300), maybeSent: true };
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
	const asEmail = (v: unknown) => (typeof v === "string" && EMAIL_RE.test(v.trim()) ? v.trim().toLowerCase() : null);
	const hidden = fields.find((f) => f.type === "HIDDEN_FIELDS" && (f.label ?? "").trim().toLowerCase() === "email");
	if (hidden && asEmail(hidden.value)) return asEmail(hidden.value);
	for (const f of fields) {
		if (f.type === "INPUT_EMAIL" && asEmail(f.value)) return asEmail(f.value);
	}
	return null;
}

const TITLES = new Set(["mr", "mrs", "ms", "miss", "mx", "dr", "prof", "sir"]);

/**
 * A greeting name from a beta application's name: its first word (after a title like "Dr."), letters, marks and
 * ' - . only, at most 40. Null when none, or when what's there isn't a name (an email, digits, punctuation).
 */
export function firstNameOf(name: unknown): string | null {
	if (typeof name !== "string" || name.includes("@")) return null;
	const words = name.trim().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{M}'.-]/gu, "")).filter((w) => /\p{L}/u.test(w));
	const first = (words.length > 1 && TITLES.has(words[0].replace(/\.$/, "").toLowerCase()) ? words[1] : words[0])?.slice(0, 40);
	return first ? first.charAt(0).toUpperCase() + first.slice(1) : null;
}
