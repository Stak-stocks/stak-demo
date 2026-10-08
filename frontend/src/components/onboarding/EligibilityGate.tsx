import { useState, type ReactNode } from "react";
import { PRIVACY_URL, TERMS_URL } from "@stak/shared";
import { ApiError, confirmEligibility } from "@/lib/api";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";
import { AuthCta, AuthHeader, AuthInput, AuthScreen, ErrorText } from "@/components/auth/AuthKit";

/** This browser was refused (under 18): it doesn't get to try another date, for as long as the server blocks the email. */
const BLOCKED_KEY = "stak.eligibility.blockedUntil";
const BLOCK_MS = 30 * 24 * 60 * 60 * 1000;

function blockedHere(): boolean {
	try { return Number(localStorage.getItem(BLOCKED_KEY) ?? 0) > Date.now(); } catch { return false; }
}

/** "MMDDYYYY" typed as digits -> "MM/DD/YYYY" as shown. */
function formatDob(digits: string): string {
	const d = digits.slice(0, 8);
	return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** The typed date as "YYYY-MM-DD", or null until it's a whole, real date (the server checks it again). */
function isoDob(digits: string): string | null {
	if (digits.length !== 8) return null;
	const [mm, dd, yyyy] = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)];
	const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
	if (date.getUTCFullYear() !== Number(yyyy) || date.getUTCMonth() !== Number(mm) - 1 || date.getUTCDate() !== Number(dd)) return null;
	return `${yyyy}-${mm}-${dd}`;
}

function CheckRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: ReactNode }) {
	return (
		<label className={`flex cursor-pointer items-start ${PRESS}`} style={{ gap: cu(10) }}>
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
	<a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="underline focus-visible:outline focus-visible:outline-2" style={{ ...focusRing, color: DISC.teal }}>{label}</a>
);

/**
 * "Before we get started" (as the apps): date of birth, U.S. residence, and the Terms / Privacy, before anything else -
 * shown over the whole app while the account hasn't confirmed. The age is worked out by the server, which keeps only
 * that it was confirmed. The wording doesn't name the cutoff until someone's under it. Under 18 the server deletes
 * the account; this browser then can't try again with another date.
 */
export function EligibilityGate({ onConfirmed, onRefused }: { onConfirmed: () => Promise<void>; onRefused: () => Promise<void> }) {
	const [digits, setDigits] = useState("");
	const [inUS, setInUS] = useState(false);
	const [accepted, setAccepted] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [refused, setRefused] = useState(blockedHere);

	const dob = isoDob(digits);
	const dobError = digits.length === 8 && !dob ? "Enter a real date" : null;

	if (refused) {
		return (
			<AuthScreen nav={<span />} bottom={<AuthCta label="OK" onClick={() => { void onRefused(); }} />}>
				<AuthHeader title="We can’t open STAK for you yet" subtitle="STAK is currently available only to users 18 and older." />
			</AuthScreen>
		);
	}

	const submit = async () => {
		if (!dob || !inUS || !accepted || busy) return;
		setBusy(true);
		setError(null);
		try {
			await confirmEligibility({ dob, inUS: true, acceptTerms: true });
			await onConfirmed();
		} catch (e) {
			if (e instanceof ApiError && e.status === 403) {
				try { localStorage.setItem(BLOCKED_KEY, String(Date.now() + BLOCK_MS)); } catch { /* no storage */ }
				setRefused(true);
			} else {
				setError(e instanceof ApiError && e.status === 400 ? "Check your date of birth and both boxes." : "Something went wrong. Try again.");
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthScreen
			nav={<span />}
			bottom={<>
				{error && <div style={{ padding: `0 ${cu(24)}` }}><ErrorText>{error}</ErrorText></div>}
				<AuthCta label={busy ? "Checking…" : "Continue"} onClick={() => { void submit(); }} disabled={!dob || !inUS || !accepted || busy} />
			</>}
		>
			<AuthHeader title="Before we get started" subtitle="A couple of quick details first." />
			<div style={{ display: "flex", flexDirection: "column", gap: cu(6) }}>
				<span style={{ font: f(500, 12, 16), color: DISC.muted }}>Date of birth</span>
				<AuthInput
					value={formatDob(digits)}
					onChange={(v) => setDigits(v.replace(/\D/g, "").slice(0, 8))}
					placeholder="MM/DD/YYYY"
					inputMode="numeric"
					autoComplete="bday"
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
