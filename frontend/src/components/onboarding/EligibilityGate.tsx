import { useState } from "react";
import { PRIVACY_URL, TERMS_URL } from "@stak/shared";
import { confirmEligibility } from "@/lib/api";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";
import { AuthBackLink, AuthCta, AuthHeader, AuthInset, AuthScreen, ErrorText } from "@/components/auth/AuthKit";

/** The documents open in a new tab, so this screen (and the answer it's waiting for) stays where it is. */
const link = (href: string, label: string) => (
	<a href={href} target="_blank" rel="noopener noreferrer" className={`underline ${PRESS}`} style={{ ...focusRing, color: DISC.teal }}>
		{label}<span className="sr-only"> (opens in a new tab)</span>
	</a>
);

/**
 * "Before we get started" (as the apps): one sentence and one button, as most apps do it - "Agree and continue"
 * confirms 18 or older, living in the United States, and agreement to the Terms / Privacy (Terms §2), which the
 * sentence links to. Shown over the whole app while the account hasn't confirmed. No date of birth.
 * [onConfirmed] runs once the server has recorded it; [onSignOut] leaves without answering.
 */
export function EligibilityGate({ onConfirmed, onSignOut }: { onConfirmed: () => void; onSignOut: () => void }) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async () => {
		if (busy) return;
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
			nav={<AuthBackLink label="Sign out" onClick={onSignOut} />}
			bottom={<>
				{/* Right above the button it describes, so what selecting it means is in view when it's selected. */}
				<AuthInset>
					<p style={{ font: f(400, 13, 19), color: DISC.body, margin: 0 }}>
						By selecting Agree and continue, I confirm that I am 18 years of age or older, that I currently reside in the
						United States, and that I agree to the {link(TERMS_URL, "Terms of Service")} and {link(PRIVACY_URL, "Privacy Policy")}.
					</p>
				</AuthInset>
				{error && <AuthInset><ErrorText>{error}</ErrorText></AuthInset>}
				<AuthCta label={busy ? "Saving…" : "Agree and continue"} onClick={() => { void submit(); }} disabled={busy} />
			</>}
		>
			<AuthHeader title="Before we get started" subtitle="STAK’s beta is open to adults in the United States." />
		</AuthScreen>
	);
}
