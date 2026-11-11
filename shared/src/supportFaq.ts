/**
 * The help & support content: the public /support page on the web and the web app's Help & support screen read this.
 * The iPhone and Android Help & support screens show three of the answers (real-money, prices, data-private - with
 * demo-account versions) written out in SettingsViews.swift and SettingsScreens.kt, and link to the page for the
 * rest: a change to one of those three here goes there by hand. The same goes for the email address, the subjects
 * and the report template.
 */

export const SUPPORT_EMAIL = "support@thestak.org";
export const SUPPORT_REPLY_TIME = "We reply within 2 business days.";
export const SUPPORT_URL = "https://thestak.org/support";
export const SUPPORT_SUBJECT = "STAK support";
export const REPORT_SUBJECT = "STAK problem report";

/** Labels the device line at the foot of a support email, so it isn't a mystery string - and says it can go. */
export const DEVICE_LABEL = "Device info (you can delete this):";

/** A support email's body: the report's two prompts or room to write, then the device line, so a reply needn't ask. */
export function supportEmailBody(kind: "support" | "report", device: string): string {
	const foot = `${DEVICE_LABEL} ${device}`;
	return kind === "report" ? `What happened:\n\nWhere in the app:\n\n${foot}` : `\n\n\n${foot}`;
}

export interface SupportQuestion {
	/** The answer's link: thestak.org/support#<id>. */
	id: string;
	q: string;
	a: string;
}

export interface SupportTopic {
	id: string;
	title: string;
	questions: SupportQuestion[];
}

export const SUPPORT_TOPICS: readonly SupportTopic[] = [
	{
		id: "getting-started",
		title: "Getting started",
		questions: [
			{ id: "what-is-stak", q: "What is STAK?", a: "STAK helps you learn investing through companies you already know. Swipe through companies, save the ones you like, read what's moving them, and practice with pretend money." },
			{ id: "who-can-use", q: "Who can use STAK?", a: "People 18 or older who live in the United States." },
			{ id: "advice", q: "Is STAK investment advice?", a: "No. STAK is for learning. It isn't a brokerage, it doesn't handle real money, and nothing in it is a recommendation to buy or sell." },
		],
	},
	{
		id: "account",
		title: "Your account",
		questions: [
			{ id: "forgot-password", q: "I forgot my password", a: "On Sign in, tap “Forgot password?”. We'll email you a code to set a new one. No code after a few minutes? Check your spam folder, then ask for a new one." },
			{ id: "cant-sign-in", q: "I can't sign in", a: "Make sure you're signing in the same way you signed up: email, Google or Apple. Still stuck? Email support@thestak.org from the address on your account and tell us how you signed up. If you used Apple's “Hide My Email”, write from the Apple account you signed up with." },
			{ id: "sign-in-methods", q: "Signing in with Apple, Google or email", a: "Google and email work on iPhone, Android and the web. Sign in with Apple works on iPhone and the web, not on Android: if you signed up with Apple and want to use Android, first add Google or a password in Profile → Sign-in on your iPhone. You can add or remove ways to sign in there any time." },
			{ id: "delete-account", q: "How do I delete my account?", a: "Go to Profile → App settings → Delete account. This can't be undone: your account and its data are deleted, apart from anything we must keep by law (see the Privacy Policy). Removing the app doesn't delete your account. Can't sign in? Email support@thestak.org from your account's address and we'll delete it for you." },
		],
	},
	{
		id: "simulate",
		title: "Simulate & prices",
		questions: [
			{ id: "real-money", q: "Is this real money?", a: "No. In Simulate you practice with pretend money, starting with what you’d really invest. Nothing is bought or sold for real." },
			{ id: "prices", q: "Where do the prices come from?", a: "Real prices from the US stock market. They update on their own while the market is open (9:30am to 4pm ET, weekdays). When it's closed, you see the last closing price." },
		],
	},
	{
		id: "privacy",
		title: "Privacy & safety",
		questions: [
			{ id: "data-private", q: "Is my data private?", a: "Your saved stocks, taste answers and paper portfolio are stored with your STAK account, so they follow you to a new device. STAK doesn’t sell your personal information." },
			{ id: "data-copy", q: "Can I get a copy of my data?", a: "Yes. Email support@thestak.org from the address on your account and say what you'd like: a copy, a correction or deletion. The Privacy Policy explains your choices." },
			{ id: "notifications", q: "How do I turn notifications on or off?", a: "Go to Profile → Notifications to choose which alerts you get. You can also turn them off in your phone's settings." },
		],
	},
];

/** "STAK will never ask...": shown on the support page, where people go when something feels off. */
export const SUPPORT_SECURITY_NOTE = "STAK will never ask for your password or a sign-in code by email, text or phone.";

/** A question by its id, for the screens that show a few of them. */
export function supportQuestion(id: string): SupportQuestion | undefined {
	for (const t of SUPPORT_TOPICS) {
		const found = t.questions.find((x) => x.id === id);
		if (found) return found;
	}
	return undefined;
}
