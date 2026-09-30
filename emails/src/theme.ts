/** STAK's email palette: the app's navy and Android teal, in email-safe hex. */
export const C = {
	page: "#0A1020",
	card: "#10182B",
	card2: "#171D2C",
	border: "#243049",
	teal: "#69B3CA",
	white: "#FFFFFF",
	text: "#C8D2E0",
	muted: "#819ABB",
} as const;

/** System fonts: web fonts don't load in most mail apps, and these fall back cleanly everywhere. */
export const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const INSTAGRAM_URL = "https://www.instagram.com/just_stak";

/**
 * Where the email images live: the website serves frontend/public/email at /email (built by
 * `node emails/scripts/build-images.mjs`). EMAIL_ASSET_BASE points the preview at a local dev server.
 */
export const ASSET_BASE = (typeof process !== "undefined" && process.env.EMAIL_ASSET_BASE) || "https://thestak.org/email";
