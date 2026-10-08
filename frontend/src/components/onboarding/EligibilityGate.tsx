import { useState, type ReactNode } from "react";
import { PRIVACY_URL, TERMS_URL } from "@stak/shared";
import { ApiError, confirmEligibility } from "@/lib/api";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";
import { AuthBackLink, AuthCta, AuthHeader, AuthScreen, ErrorText } from "@/components/auth/AuthKit";

function CheckRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: ReactNode }) {
	return (
		<label className="flex cursor-pointer items-start" style={{ gap: cu(10) }}>
			<input type="checkbox" checked={checked} onChange={onToggle} className="sr-only peer" />
			<span
				aria-hidden="true"
				className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#69B3CA]"
				style={{ flexShrink: 0, width: cu(20), height: cu(20), borderRadius: cu(5), marginTop: cu(1), display: "grid", placeItems: "center",
					background: checked ? DISC.teal : "transparent", boxShadow: checked ? undefined : `inset 0 0 0 ${cu(1.5)} ${DISC.muted}` }}
			>
				{checked && <svg viewBox="0 0 12 12" style={{ width: cu(12), height: cu(12) }}><path d="M2 6.5 5 9l5-6" fill="none" stroke="#0A1020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
			</span>
			<span style={{ font: f(400, 13, 19), color: DISC.body }}>{children}</span>
		</label>
	);
}

const link = (href: string, label: string) => (
	<a href={href} target="_blank" rel="noopener noreferrer" className={`underline ${PRESS}`} style={{ ...focusRing, color: DISC.teal }}>{label}</a>
);

/**
 * "Before we get started" (as the apps): three boxes - 18 or older, living in the United States, and the Terms /
 * Privacy - shown over the whole app while the account hasn't confirmed them (Terms §2). No date of birth.
 * [onConfirmed] runs once the server has recorded them; [onSignOut] leaves without answering.
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
		} catch (e) {
			setError(e instanceof ApiError && e.status === 400 ? "Tick all three boxes to continue." : "Something went wrong. Try again.");
		} finally {
			setBusy(false);
		}
		if (confirmed) onConfirmed();
	};

	return (
		<AuthScreen
			nav={<AuthBackLink label="Sign out" onClick={onSignOut} />}
			bottom={<>
				{error && <div style={{ padding: `0 ${cu(24)}` }}><ErrorText>{error}</ErrorText></div>}
				<AuthCta label={busy ? "Saving…" : "Continue"} onClick={() => { void submit(); }} disabled={!ready} />
			</>}
		>
			<AuthHeader title="Before we get started" subtitle="STAK’s beta is open to adults in the United States." />
			<CheckRow checked={adult} onToggle={() => setAdult((v) => !v)}>I confirm that I am 18 years of age or older.</CheckRow>
			<CheckRow checked={inUS} onToggle={() => setInUS((v) => !v)}>I confirm that I currently reside in the United States.</CheckRow>
			<CheckRow checked={accepted} onToggle={() => setAccepted((v) => !v)}>
				I agree to the {link(TERMS_URL, "Terms of Service")} and {link(PRIVACY_URL, "Privacy Policy")}.
			</CheckRow>
		</AuthScreen>
	);
}
