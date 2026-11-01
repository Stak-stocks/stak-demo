import { useState, type ReactNode } from "react";
import { PRIVACY_URL, TERMS_URL } from "@stak/shared";
import { confirmEligibility } from "@/lib/api";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";
import { AuthBackLink, AuthCta, AuthHeader, AuthInset, AuthScreen, ErrorText } from "@/components/auth/AuthKit";

/** The app's glass STAK mark (the splash art, small). */
const GLASS_MARK = "/app/stak_glass_mark.webp";

/** One attestation: a box and its statement; every row after the first has a hairline above it, inset past the box. */
function CheckRow({ first = false, checked, onToggle, children }: { first?: boolean; checked: boolean; onToggle: () => void; children: ReactNode }) {
	return (
		<li style={{ listStyle: "none" }}>
			{!first && <div aria-hidden="true" style={{ height: 1, marginLeft: cu(50), background: "var(--divider)" }} />}
			<label className="flex cursor-pointer items-start" style={{ gap: cu(12), minHeight: cu(54), padding: `${cu(15)} ${cu(16)}` }}>
				<input type="checkbox" checked={checked} onChange={onToggle} className="sr-only peer" />
				<span
					aria-hidden="true"
					className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#69B3CA]"
					style={{ flexShrink: 0, width: cu(22), height: cu(22), borderRadius: cu(6), marginTop: cu(1), display: "grid", placeItems: "center",
						background: checked ? DISC.teal : "transparent", boxShadow: checked ? undefined : `inset 0 0 0 ${cu(1.5)} ${DISC.muted}` }}
				>
					{checked && <svg viewBox="0 0 12 12" style={{ width: cu(13), height: cu(13) }}><path d="M2 6.5 5 9l5-6" fill="none" stroke="#0A1020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
				</span>
				<span style={{ font: f(400, 14, 20), color: "#fff" }}>{children}</span>
			</label>
		</li>
	);
}

/** A document, opened in a new tab so this screen (and the answers on it) stays where it is. */
const docLink = (href: string, label: string) => (
	<a href={href} target="_blank" rel="noopener noreferrer" className={`underline ${PRESS}`} style={{ ...focusRing, font: f(500, 13, 18), color: DISC.teal, display: "inline-flex", alignItems: "center", minHeight: cu(32) }}>
		{label}<span className="sr-only"> (opens in a new tab)</span>
	</a>
);

/**
 * "Before we get started" (as Android / iOS): the STAK mark and heading, then three separate attestations to tick - 18
 * or older, living in the United States, and agreeing to the Terms of Service and Privacy Policy (both linked
 * underneath) - centred in the space, and "Continue" once all three are ticked (Terms §2). Shown over the whole app
 * while the account hasn't confirmed. No date of birth. [onConfirmed] runs once the server has recorded it;
 * [onSignOut] leaves without answering.
 */
export function EligibilityGate({ onConfirmed, onSignOut }: { onConfirmed: () => void; onSignOut: () => void }) {
	const [adult, setAdult] = useState(false);
	const [inUS, setInUS] = useState(false);
	const [accepted, setAccepted] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const ready = adult && inUS && accepted && !busy;

	const submit = async () => {
		if (!ready) return;
		setBusy(true);
		setError(null);
		let confirmed = false;
		try {
			await confirmEligibility({ ageConfirmed: true, inUS: true, acceptTerms: true });
			confirmed = true;
		} catch {
			setError("Something went wrong. Try again.");
		} finally {
			setBusy(false);
		}
		if (confirmed) onConfirmed();
	};

	return (
		<AuthScreen
			watermark={false}
			centered
			nav={<AuthBackLink label="Sign out" onClick={onSignOut} />}
			bottom={<>
				{error && <AuthInset><ErrorText>{error}</ErrorText></AuthInset>}
				<AuthCta label={busy ? "Saving…" : "Continue"} onClick={() => { void submit(); }} disabled={!ready} />
			</>}
		>
			{/* The other auth pages' heading (their sizes on desktop too), centred under the mark. */}
			<div className="flex flex-col items-center text-center" style={{ gap: cu(18) }}>
				<img src={GLASS_MARK} alt="" width={104} height={104} style={{ width: cu(104), height: cu(104) }} />
				<AuthHeader title="Before we get started" subtitle="STAK’s beta is open to adults in the United States. Please confirm the following to continue." />
			</div>
			{/* role="list": Safari drops a list's role once its bullets are styled away. */}
			<ul role="list" aria-label="Confirm to continue" style={{ margin: `${cu(10)} 0 0`, padding: 0, borderRadius: cu(16), background: "var(--surface-1)", boxShadow: `inset 0 0 0 1px ${DISC.cardBorder}` }}>
				<CheckRow first checked={adult} onToggle={() => { setAdult((v) => !v); setError(null); }}>I confirm that I am 18 years of age or older.</CheckRow>
				<CheckRow checked={inUS} onToggle={() => { setInUS((v) => !v); setError(null); }}>I confirm that I currently reside in the United States.</CheckRow>
				<CheckRow checked={accepted} onToggle={() => { setAccepted((v) => !v); setError(null); }}>I agree to the Terms of Service and Privacy Policy.</CheckRow>
			</ul>
			{/* The documents on their own line (a link inside a box's label would only tick the box). */}
			<div className="flex justify-center" style={{ gap: cu(20) }}>
				{docLink(TERMS_URL, "Terms of Service")}
				{docLink(PRIVACY_URL, "Privacy Policy")}
			</div>
		</AuthScreen>
	);
}
