import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, ShieldCheck } from "lucide-react";
import { DISC } from "@/components/discover/discoverTheme";
import { REPORT_SUBJECT, SUPPORT_EMAIL, SUPPORT_REPLY_TIME, SUPPORT_SECURITY_NOTE, SUPPORT_SUBJECT, SUPPORT_TOPICS, supportEmailBody } from "@stak/shared";

export const Route = createFileRoute("/support")({
	component: SupportPage,
});

const enc = encodeURIComponent;
// Not signed in and maybe not even on a phone: the device line is left for them to fill in.
const DEVICE_PROMPT = "your phone and STAK version (Profile \u2192 Help & support \u2192 Version)";
const EMAIL_HREF = `mailto:${SUPPORT_EMAIL}?subject=${enc(SUPPORT_SUBJECT)}`;
const REPORT_HREF = `mailto:${SUPPORT_EMAIL}?subject=${enc(REPORT_SUBJECT)}&body=${enc(supportEmailBody("report", DEVICE_PROMPT))}`;
const LINK = "rounded focus-visible:outline focus-visible:outline-2";
const BUTTON = "inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-5 text-[14px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto";
const CARD = { background: "#171D2C", border: "1px solid rgba(255,255,255,0.06)" };

/**
 * The public help & support page (the App Store's Support URL): how to reach us, a safety note, and the common
 * questions by topic. Open to anyone while the web is locked, like Terms and Privacy (LEGAL_PATHS). Every answer has
 * its own link (/support#delete-account), which opens it. The content is shared/src/supportFaq.ts.
 */
function SupportPage() {
	// The answer a link points at, opened and brought into view.
	const [linked] = useState(() => {
		if (typeof window === "undefined") return "";
		try { return decodeURIComponent(window.location.hash.slice(1)); } catch { return ""; }
	});
	useEffect(() => {
		if (!linked) return;
		// After the root's own scroll to the top for a new page, which runs after this.
		const t = setTimeout(() => document.getElementById(linked)?.scrollIntoView({ block: "center" }), 0);
		return () => clearTimeout(t);
	}, [linked]);

	return (
		<div className="min-h-full" style={{ background: "#0A1020" }}>
			<main className="mx-auto max-w-[70ch] px-4 pb-16 pt-6 sm:px-6">
				{/* Not "Back": from the apps' More help this opens in a browser, where the app isn't behind it. */}
				<Link to="/" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md text-[13px] font-medium focus-visible:outline focus-visible:outline-2" style={{ color: DISC.teal, outlineColor: DISC.teal }}>
					<ArrowLeft className="h-[15px] w-[15px]" aria-hidden="true" /> STAK home
				</Link>
				<h1 className="font-heading mt-6 text-[30px] font-semibold leading-[38px] text-white sm:text-[36px] sm:leading-[44px]">Help &amp; support</h1>

				<section aria-labelledby="contact" className="mt-6 rounded-[16px] p-5" style={CARD}>
					<h2 id="contact" className="font-heading text-[19px] font-semibold leading-[26px] text-white">Need a hand?</h2>
					<p className="mt-2 text-base leading-[1.6]" style={{ color: DISC.body }}>
						Email us at <a href={EMAIL_HREF} className={`font-medium text-white underline underline-offset-2 ${LINK}`} style={{ userSelect: "all", outlineColor: DISC.teal }}>{SUPPORT_EMAIL}</a>. {SUPPORT_REPLY_TIME}
					</p>
					<div className="mt-4 flex flex-wrap gap-3">
						<a href={EMAIL_HREF} className={BUTTON} style={{ background: DISC.teal, color: "#0A1020", outlineColor: DISC.teal }}>
							Email support
						</a>
						<a href={REPORT_HREF} className={BUTTON} style={{ border: `1px solid ${DISC.teal}`, color: DISC.teal, outlineColor: DISC.teal }}>
							Report a problem
						</a>
					</div>
				</section>

				<p className="mt-4 flex items-start gap-2.5 rounded-[12px] p-4 text-[14px] leading-[21px]" style={{ background: "rgba(105,179,202,0.08)", border: "1px solid rgba(105,179,202,0.25)", color: DISC.body }}>
					<ShieldCheck className="mt-[2px] h-[17px] w-[17px] shrink-0" style={{ color: DISC.teal }} aria-hidden="true" />
					<span>{SUPPORT_SECURITY_NOTE}</span>
				</p>

				<h2 className="font-heading mt-10 text-[21px] font-semibold leading-[28px] text-white">Common questions</h2>
				{SUPPORT_TOPICS.map((topic) => (
					<section key={topic.id} aria-labelledby={`topic-${topic.id}`} className="mt-6">
						<h3 id={`topic-${topic.id}`} className="text-[15.5px] font-semibold" style={{ color: DISC.teal }}>{topic.title}</h3>
						<div className="mt-3 overflow-hidden rounded-[14px]" style={CARD}>
							{topic.questions.map((item, i) => (
								<details
									key={item.id}
									id={item.id}
									open={item.id === linked}
									className="group scroll-mt-6"
									style={i > 0 ? { borderTop: "1px solid rgba(255,255,255,0.06)" } : undefined}
								>
									<summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-3 px-4 py-3 text-[15px] font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden" style={{ outlineColor: DISC.teal }}>
										<span className="flex-1">{item.q}</span>
										<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" style={{ color: DISC.muted }} aria-hidden="true" />
									</summary>
									<p className="px-4 pb-4 text-[15px] leading-[1.6]" style={{ color: DISC.body }}>{item.a}</p>
								</details>
							))}
						</div>
					</section>
				))}

				<footer className="mt-12 flex flex-wrap items-center gap-x-2 text-[13px]" style={{ color: DISC.muted }}>
					<Link to="/terms" className={`inline-flex min-h-[44px] items-center underline-offset-2 hover:underline ${LINK}`} style={{ outlineColor: DISC.teal }}>Terms of Service</Link>
					<span aria-hidden="true">·</span>
					<Link to="/privacy" className={`inline-flex min-h-[44px] items-center underline-offset-2 hover:underline ${LINK}`} style={{ outlineColor: DISC.teal }}>Privacy Policy</Link>
					<span aria-hidden="true">·</span>
					<span>© {new Date().getFullYear()} STAK</span>
				</footer>
			</main>
		</div>
	);
}
