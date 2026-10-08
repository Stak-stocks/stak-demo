import { useState, type ReactNode } from "react";
import { PRIVACY_URL, TERMS_URL } from "@stak/shared";
import { ApiError, confirmEligibility } from "@/lib/api";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";
import { AuthBackLink, AuthCta, AuthHeader, AuthInput, AuthScreen, ErrorText } from "@/components/auth/AuthKit";

/** "MMDDYYYY" typed as digits -> "MM/DD/YYYY" as shown. */
function formatDob(digits: string): string {
	const d = digits.slice(0, 8);
	return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** The typed date as "YYYY-MM-DD", or null until it's a whole, real date from 1900 to today (the server checks again). */
function isoDob(digits: string, now = new Date()): string | null {
	if (digits.length !== 8) return null;
	const [mm, dd, yyyy] = [Number(digits.slice(0, 2)), Number(digits.slice(2, 4)), Number(digits.slice(4))];
	const date = new Date(Date.UTC(yyyy, mm - 1, dd));
	if (yyyy < 1900 || date.getUTCFullYear() !== yyyy || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return null;
	if (date.getTime() > now.getTime()) return null;
	return `${digits.slice(4)}-${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
}

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
 * "Before we get started" (as the apps): date of birth, U.S. residence, and the Terms / Privacy, before anything else -
 * shown over the whole app while the account hasn't confirmed. The age is worked out by the server, which keeps only
 * that it was confirmed. The wording doesn't name the cutoff until someone's under it. [onConfirmed] runs once the
 * server has accepted; [onRefused] once it has refused (and deleted the account); [onSignOut] leaves without answering.
 */
export function EligibilityGate({ onConfirmed, onRefused, onSignOut }: { onConfirmed: () => void; onRefused: () => void; onSignOut: () => void }) {
	const [digits, setDigits] = useState("");
	const [inUS, setInUS] = useState(false);
	const [accepted, setAccepted] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const dob = isoDob(digits);
	const dobError = digits.length === 8 && !dob ? "Enter a valid date" : null;
	const ready = !!dob && inUS && accepted && !busy;

	const submit = async () => {
		if (!dob || !ready) return;
		setBusy(true);
		setError(null);
		let confirmed = false;
		try {
			await confirmEligibility({ dob, inUS: true, acceptTerms: true });
			confirmed = true;
		} catch (e) {
			if (e instanceof ApiError && e.status === 403) { onRefused(); return; }
			setError(e instanceof ApiError && e.status === 400 ? "Check your date of birth and both boxes." : "Something went wrong. Try again.");
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
				<AuthCta label={busy ? "Checking…" : "Continue"} onClick={() => { void submit(); }} disabled={!ready} />
			</>}
		>
			<AuthHeader title="Before we get started" subtitle="A couple of quick details first." />
			<div style={{ display: "flex", flexDirection: "column", gap: cu(6) }}>
				<span aria-hidden="true" style={{ font: f(500, 12, 16), color: DISC.muted }}>Date of birth</span>
				<AuthInput
					value={formatDob(digits)}
					onChange={(v) => { setDigits(v.replace(/\D/g, "").slice(0, 8)); setError(null); }}
					placeholder="MM/DD/YYYY"
					label="Date of birth"
					inputMode="numeric"
					autoComplete="off"
					maxLength={10}
					error={dobError}
					onEnter={() => { void submit(); }}
				/>
			</div>
			<CheckRow checked={inUS} onToggle={() => setInUS((v) => !v)}>I confirm that I currently live in the United States.</CheckRow>
			<CheckRow checked={accepted} onToggle={() => setAccepted((v) => !v)}>
				I agree to the {link(TERMS_URL, "Terms of Service")} and {link(PRIVACY_URL, "Privacy Policy")}.
			</CheckRow>
		</AuthScreen>
	);
}

/** After a refusal: the account is gone and this browser signed out. OK returns to the start (as the apps). */
export function EligibilityRefused({ onDone }: { onDone: () => void }) {
	return (
		<AuthScreen nav={<span />} bottom={<AuthCta label="OK" onClick={onDone} />}>
			<AuthHeader title="We can’t open STAK for you yet" subtitle="STAK is currently available only to users 18 and older." />
		</AuthScreen>
	);
}
